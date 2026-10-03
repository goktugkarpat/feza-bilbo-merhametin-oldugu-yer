/* ── Bölgeler ve seviye: seviye üretimi, görseller, çarpışma, yol bulma ──
   ZONES: altı bölgenin tanımı (sıra = kayıttaki bölge numarası). Her bölgenin sonunda büyük bir bölüm sonu canavarı arenası var.
   Bölge 1 = Çürüme Vadisi (Feza'nın isteği): süt ve kefir nehirleri, yoğurt tepeleri, peynirler, bisküvi köprüler.
   Bölge 4 = Veba Şehri (Feza'nın isteği): ejderhanın kalesinin önündeki surlu şehir; nehir ve kanallar, taş köprüler,
   renkli ahşap çatılı evler, pazar tezgâhları, surlar ve kuleler, en sonda İnfaz Meydanı ve Yemin Kapısı.
   LEVEL.generate() saf veri üretir, LEVEL.build() sahneyi kurar (bkz. src/SPEC.md). */
const ZONES = [
  { id: 'orman', ad: 'Yas Ormanı', theme: 'forest', line: 'orman', music: 'orman', size: 100, rooms: 8, side: 3,
    enemies: { jole: 4, mantar: 2, yarasa: 2, goblin: 3 }, elites: ['jole', 'goblin'], hpMult: 1, dmgMult: 1, xpMult: 1, gold: 1, ilvl: 1, boss: 'kraljole' },
  { id: 'kefir', ad: 'Çürüme Vadisi', theme: 'dairy', line: 'kefir', music: 'kefir', size: 100, rooms: 8, side: 3,
    enemies: { yogurt: 4, kaymak: 3, kopuk: 3, peynir: 1, jole: 2 }, variants: { jole: ['muhallebi'] }, elites: ['yogurt', 'kaymak'],
    hpMult: 1.4, dmgMult: 1.2, xpMult: 1.35, gold: 1.5, ilvl: 2, boss: 'kefirdev' },
  { id: 'magara', ad: 'Fısıltı Madenleri', theme: 'cave', line: 'magara', music: 'magara', size: 100, rooms: 9, side: 3,
    enemies: { kostebek: 4, salyangoz: 3, yarasa: 2, golem: 1 }, elites: ['kostebek', 'salyangoz'], hpMult: 1.8, dmgMult: 1.4, xpMult: 1.7, gold: 2, ilvl: 4, boss: 'kostebekusta' },
  { id: 'yanardag', ad: 'Kül Ocağı', theme: 'volcano', line: 'yanardag', music: 'yanardag', size: 100, rooms: 8, side: 3,
    enemies: { jole: 3, kaplumbaga: 4, ateskusu: 3, atescik: 2, golem: 1 }, variants: { jole: ['lava'], golem: ['magma'] }, elites: ['kaplumbaga', 'ateskusu'],
    hpMult: 2.3, dmgMult: 1.65, xpMult: 2.1, gold: 2.5, ilvl: 6, boss: 'lavkaplumbaga' },
  { id: 'sehir', ad: 'Veba Şehri', theme: 'town', line: 'sehir', music: 'sehir', size: 100, rooms: 8, side: 3,
    enemies: { nobetci: 4, simitci: 3, supurgeci: 3, tellal: 1 }, elites: ['nobetci', 'simitci'],
    hpMult: 2.55, dmgMult: 1.8, xpMult: 2.3, gold: 2.8, ilvl: 7, boss: 'sovalye' },
  { id: 'kale', ad: 'Merhametsiz Kale', theme: 'castle', line: 'kale', music: 'kale', size: 104, rooms: 8, side: 2,
    enemies: { asker: 4, atescik: 3, hayalet: 2, golem: 1 }, elites: ['asker', 'atescik'], hpMult: 3.0, dmgMult: 2.0, xpMult: 2.7, gold: 3.2, ilvl: 8, boss: 'ejderha', final: true },
];

const LEVEL = (function () {
  'use strict';
  const BIG = ['golem', 'peynir', 'tellal'];   // at most one of these per pack (the golem; Çürüme Vadisi's big cheese wedge; Veba Şehri's town crier)
  const MARGIN = { x: 16, n: 18, s: 15 };  // empty border (trees / rock / wall mass) around the playable area
  const ARENA_R = 11.5;                    // boss arena radius (forest / dairy / cave / volcano / town; the castle keeps its 26×22 m hall)
  // Gameplay camera pitch, captured once at load (core has applied its default and any ?kam override by now). All occlusion
  // math uses it, never the live CAM.pitch the UI animates (title 0.32, victory 0.78), so a seed always builds the same level.
  const LV_PITCH = CAM.pitch || 0.86, LV_PK = 1 / Math.tan(LV_PITCH);   // floor distance hidden behind 1 m of height
  const LV_HQ = !(navigator.maxTouchPoints > 1) || Q.has('hd');          // desktop: extra floor anti-tiling sample

  // ── Small helpers ──
  const hyp = (x, z) => Math.sqrt(x * x + z * z);
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
    return hyp(px - ax - dx * t, pz - az - dz * t);
  }
  function segSegDist(a, b, c, d) {
    const cr = (o, p, q) => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x);
    const d1 = cr(c, d, a), d2 = cr(c, d, b), d3 = cr(a, b, c), d4 = cr(a, b, d);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
    return Math.min(segDist(a.x, a.z, c.x, c.z, d.x, d.z), segDist(b.x, b.z, c.x, c.z, d.x, d.z),
      segDist(c.x, c.z, a.x, a.z, b.x, b.z), segDist(d.x, d.z, a.x, a.z, b.x, b.z));
  }
  function hash2(i, j, s) {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // Smooth 2D value noise in [-1, 1] (seeded)
  function vnoise(x, z, s) {
    const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  function wpick(w, rnd) {   // weighted pick from {key: weight}
    let tot = 0; for (const k in w) tot += w[k];
    let r = rnd() * tot;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return Object.keys(w)[0];
  }
  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // Blob room radius at angle th (organic outline from a few harmonics)
  function blobR(rm, th) {
    let k = 1;
    for (const h of rm.hs) k += h[1] * Math.sin(h[0] * th + h[2]);
    return rm.r * k;
  }
  function inRoom(rm, x, z, pad = 0) {
    const dx = x - rm.x, dz = z - rm.z;
    if (rm.hw) return Math.abs(dx) < rm.hw - pad && Math.abs(dz) < rm.hh - pad;
    return hyp(dx, dz) < blobR(rm, Math.atan2(dz, dx)) - pad;
  }
  const roomExt = rm => (rm.hw ? Math.max(rm.hw, rm.hh) : rm.r * 1.3);

  // ── Layout: blobs (forest / cave / volcano). The last room is the round boss arena (radius 11.5 m, gently wobbly outline). ──
  function harmonics(amp) {
    return [[2, RNG.range(0.5, 1) * amp, RNG.range(0, TAU)], [3, RNG.range(0.4, 0.8) * amp, RNG.range(0, TAU)], [5, RNG.range(0.2, 0.5) * amp, RNG.range(0, TAU)]];
  }
  function layoutBlobs(Z, zi) {
    const N = Z.rooms, rooms = [], links = [];
    const r0 = zi === 0 ? 9 : 7.2;
    rooms.push({ x: 0, z: 0, r: r0, kind: 'start', hs: harmonics(zi === 0 ? 0.05 : 0.1) });
    const segOf = l => [rooms[l.a], rooms[l.b]];
    // A candidate room + its corridor must keep clear of everything else
    function clear(c, from) {
      for (let j = 0; j < rooms.length; j++) {
        const o = rooms[j];
        if (j === from) continue;
        if (hyp(c.x - o.x, c.z - o.z) < c.r + o.r + 5) return false;
        if (segDist(o.x, o.z, rooms[from].x, rooms[from].z, c.x, c.z) < o.r + 4.5) return false;
      }
      for (const l of links) {
        const [p, q] = segOf(l);
        if (segDist(c.x, c.z, p.x, p.z, q.x, q.z) < c.r + 4) return false;
        if (l.a !== from && l.b !== from && segSegDist(rooms[from], c, p, q) < 5) return false;
      }
      return true;
    }
    let side = RNG.chance(0.5) ? 1 : -1;
    for (let k = 1; k < N; k++) {
      const A = rooms[k - 1], last = k === N - 1;
      const r = last ? ARENA_R : RNG.range(6.4, 8.4);
      const kind = last ? 'boss' : 'main';
      let best = null;
      for (let t = 0; t < 80 && !best; t++) {
        const sd = t < 40 ? side : -side;
        const a = sd * RNG.range(0.62, 1.2), d = A.r + r + RNG.range(3.8, 6.2) + (Z.theme === 'town' && k === 3 && t < 60 ? 3.4 : 0);   // (Veba Şehri: room for the river to run between rooms 2 and 3)
        const c = { x: A.x + Math.sin(a) * d, z: A.z - Math.cos(a) * d, r, kind, hs: harmonics(last ? 0.045 : 0.11) };
        if (Math.abs(c.x) > 22) continue;
        if (clear(c, k - 1)) best = c;
      }
      if (!best) best = { x: A.x, z: A.z - (A.r + r + 6), r, kind, hs: harmonics(last ? 0.045 : 0.1) };
      rooms.push(best);
      links.push({ a: k - 1, b: k, w: RNG.range(1.75, 2.05), bend: RNG.range(-2.6, 2.6), main: true });
      side = -side; if (RNG.chance(0.15)) side = -side;
    }
    // side rooms hang off the middle of the chain, pointing away from their neighbours
    const cand = [];
    for (let k = 1; k < N - 1; k++) cand.push(k);
    shuffle(cand, RNG._r);
    cand.sort((a, b) => (a % 2) - (b % 2));
    let made = 0;
    for (const k of cand) {
      if (made >= Z.side) break;
      if (rooms.some(o => o.kind === 'side' && Math.abs(o.host - k) < 2) && cand.length > Z.side * 2 - 1) continue;
      const A = rooms[k], nb = (rooms[k - 1].x + rooms[k + 1].x) / 2 - A.x;
      const away = Math.abs(nb) > 1.5 ? -Math.sign(nb) : (RNG.chance(0.5) ? 1 : -1);
      const r = RNG.range(4.3, 5.3);
      let best = null;
      for (let t = 0; t < 50 && !best; t++) {
        const sd = t < 30 ? away : -away;
        const a = sd * RNG.range(1.0, 2.1), d = A.r + r + RNG.range(3.5, 6);
        const c = { x: A.x + Math.sin(a) * d, z: A.z - Math.cos(a) * d, r, kind: 'side', host: k, hs: harmonics(0.1) };
        if (Math.abs(c.x) > 36) continue;
        if (clear(c, k)) best = c;
      }
      if (!best) continue;
      rooms.push(best); made++;
      links.push({ a: k, b: rooms.length - 1, w: 1.8, bend: RNG.range(-1.2, 1.2), main: false });
    }
    return { rooms, links };
  }

  // ── Layout: castle (axis-aligned halls, L-shaped corridors) ──
  function layoutCastle(Z) {
    const N = Z.rooms, rooms = [{ x: 0, z: 0, hw: 6, hh: 5, kind: 'start', entry: 9 }], links = [];
    const rectsHit = (x0, z0, x1, z1, skip) => {
      for (let j = 0; j < rooms.length; j++) {
        if (skip.includes(j)) continue;
        const o = rooms[j];
        if (x1 > o.x - o.hw - 2 && x0 < o.x + o.hw + 2 && z1 > o.z - o.hh - 2 && z0 < o.z + o.hh + 2) return true;
      }
      for (const l of links) {
        if (skip.includes(l.a) || skip.includes(l.b)) continue;
        for (const s of l.segs) {
          const sx0 = Math.min(s[0], s[2]) - 2, sx1 = Math.max(s[0], s[2]) + 2, sz0 = Math.min(s[1], s[3]) - 2, sz1 = Math.max(s[1], s[3]) + 2;
          if (x1 > sx0 - 2 && x0 < sx1 + 2 && z1 > sz0 - 2 && z0 < sz1 + 2) return true;
        }
      }
      return false;
    };
    let side = RNG.chance(0.5) ? 1 : -1;
    for (let k = 1; k < N; k++) {
      const A = rooms[k - 1], last = k === N - 1;
      const hw = last ? 13 : RNG.int(6, 9), hh = last ? 11 : RNG.int(5, 7);
      let type = RNG.r() < (last ? 0.55 : 0.3) ? 'S' : (RNG.chance(0.5) ? 'L1' : 'L2');
      if (type === 'L2' && A.entry === side) type = 'L1';
      let B, segs, pts, exit = 0, entry = 0;
      if (type === 'S') {
        const off = Math.max(0, Math.min(A.hw, hw) - 3);
        const bx = A.x + RNG.int(-off, off), bz = A.z - A.hh - hh - RNG.int(3, 6);
        const cx = Math.round((Math.max(A.x - A.hw, bx - hw) + Math.min(A.x + A.hw, bx + hw)) / 2);
        B = { x: bx, z: bz, hw, hh }; segs = [[cx, A.z, cx, bz]];
        pts = [[A.x, A.z], [cx, A.z], [cx, bz], [bx, bz]];
      } else if (type === 'L1') {
        const bx = A.x + side * (hw + 4 + RNG.int(0, 4)), bz = A.z - A.hh - hh - RNG.int(2, 4);
        B = { x: bx, z: bz, hw, hh }; segs = [[A.x, A.z, A.x, bz], [A.x, bz, bx, bz]];
        pts = [[A.x, A.z], [A.x, bz], [bx, bz]]; entry = -side;
      } else {
        const bx = A.x + side * (A.hw + RNG.int(3, 6)), bz = A.z - A.hh - hh - RNG.int(3, 5);
        B = { x: bx, z: bz, hw, hh }; segs = [[A.x, A.z, bx, A.z], [bx, A.z, bx, bz]];
        pts = [[A.x, A.z], [bx, A.z], [bx, bz]]; exit = side;
      }
      B.kind = last ? 'boss' : 'main'; B.entry = entry; B.r = Math.min(B.hw, B.hh);
      A.exit = exit;
      rooms.push(B);
      links.push({ a: k - 1, b: k, segs, pts, w: 2, main: true });
      side = -side; if (RNG.chance(0.2)) side = -side;
    }
    let made = 0;
    const cand = [];
    for (let k = 1; k < N - 1; k++) cand.push(k);
    shuffle(cand, RNG._r);
    for (const k of cand) {
      if (made >= Z.side) break;
      const A = rooms[k];
      const sides = [1, -1].filter(s => s !== A.entry && s !== A.exit);
      shuffle(sides, RNG._r);
      for (const s of sides) {
        const hw = RNG.int(4, 5), hh = RNG.int(4, 5);
        const bx = A.x + s * (A.hw + hw + RNG.int(4, 6)), bz = A.z + RNG.int(-1, 1);
        const cz = A.z;
        const x0 = Math.min(A.x + s * A.hw, bx) , x1 = Math.max(A.x + s * A.hw, bx);
        if (rectsHit(bx - hw, bz - hh, bx + hw, bz + hh, [k])) continue;
        if (rectsHit(x0, cz - 2, x1, cz + 2, [k])) continue;
        rooms.push({ x: bx, z: bz, hw, hh, r: Math.min(hw, hh), kind: 'side', host: k });
        links.push({ a: k, b: rooms.length - 1, segs: [[A.x, cz, bx, cz]], pts: [[A.x, cz], [bx, bz]], w: 2, main: false });
        made++;
        break;
      }
    }
    return { rooms, links };
  }

  // ── Grid helpers ──
  function chamfer(W, H, src, want) {   // distance (in cells) from each cell to the nearest cell with src === want
    const D = new Float32Array(W * H), INF = 1e6, S2 = Math.SQRT2;
    for (let i = 0; i < W * H; i++) D[i] = src[i] === want ? 0 : INF;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; let d = D[k];
      if (d === 0) continue;
      if (i > 0) d = Math.min(d, D[k - 1] + 1);
      if (j > 0) { d = Math.min(d, D[k - W] + 1); if (i > 0) d = Math.min(d, D[k - W - 1] + S2); if (i < W - 1) d = Math.min(d, D[k - W + 1] + S2); }
      D[k] = d;
    }
    for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) {
      const k = j * W + i; let d = D[k];
      if (d === 0) continue;
      if (i < W - 1) d = Math.min(d, D[k + 1] + 1);
      if (j < H - 1) { d = Math.min(d, D[k + W] + 1); if (i < W - 1) d = Math.min(d, D[k + W + 1] + S2); if (i > 0) d = Math.min(d, D[k + W - 1] + S2); }
      D[k] = d;
    }
    return D;
  }
  function floodFrom(W, H, grid, si, sj) {   // 4-connected reachability over floor cells
    const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
    let h = 0, t = 0;
    const s = sj * W + si;
    if (!grid[s]) return seen;
    seen[s] = 1; q[t++] = s;
    while (h < t) {
      const c = q[h++], i = c % W;
      if (i > 0 && grid[c - 1] && !seen[c - 1]) { seen[c - 1] = 1; q[t++] = c - 1; }
      if (i < W - 1 && grid[c + 1] && !seen[c + 1]) { seen[c + 1] = 1; q[t++] = c + 1; }
      if (c >= W && grid[c - W] && !seen[c - W]) { seen[c - W] = 1; q[t++] = c - W; }
      if (c < W * (H - 1) && grid[c + W] && !seen[c + W]) { seen[c + W] = 1; q[t++] = c + W; }
    }
    return seen;
  }
  // Summed-area table of floor cells: count floor in any rectangle in O(1)
  function makeSAT(W, H, grid) {
    const S = new Int32Array((W + 1) * (H + 1)), W1 = W + 1;
    for (let j = 0; j < H; j++) {
      let row = 0;
      for (let i = 0; i < W; i++) { row += grid[j * W + i]; S[(j + 1) * W1 + i + 1] = S[j * W1 + i + 1] + row; }
    }
    return S;
  }
  function satCount(L, x0, z0, x1, z1) {   // floor cells overlapping [x0,x1)×[z0,z1) (metres)
    const W = L.W, H = L.H, W1 = W + 1, S = L._sat;
    const i0 = clamp(Math.floor(x0), 0, W), i1 = clamp(Math.ceil(x1), 0, W), j0 = clamp(Math.floor(z0), 0, H), j1 = clamp(Math.ceil(z1), 0, H);
    if (i1 <= i0 || j1 <= j0) return 0;
    return S[j1 * W1 + i1] - S[j0 * W1 + i1] - S[j1 * W1 + i0] + S[j0 * W1 + i0];
  }

  // ── LEVEL.generate ──
  function generate(zi, seed) {
    zi = clamp(zi | 0, 0, ZONES.length - 1);
    seed = (seed >>> 0) || 1;
    RNG.seed(seed);
    const Z = ZONES[zi], theme = Z.theme, castle = theme === 'castle', nseed = RNG.int(1, 1e9);
    const lay = castle ? layoutCastle(Z) : layoutBlobs(Z, zi);
    const rooms = lay.rooms, links = lay.links;

    // bounds → shift everything into positive grid space
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const r of rooms) { const e = roomExt(r) + 1.5; x0 = Math.min(x0, r.x - e); x1 = Math.max(x1, r.x + e); z0 = Math.min(z0, r.z - e); z1 = Math.max(z1, r.z + e); }
    const ox = Math.ceil(MARGIN.x - x0), oz = Math.ceil(MARGIN.n - z0);
    const W = Math.ceil(x1 - x0 + 2 * MARGIN.x), H = Math.ceil(z1 - z0 + MARGIN.n + MARGIN.s);
    for (const r of rooms) { r.x += ox; r.z += oz; }
    for (const l of links) {
      if (l.segs) for (const s of l.segs) { s[0] += ox; s[1] += oz; s[2] += ox; s[3] += oz; }
      if (l.pts) for (const p of l.pts) { p[0] += ox; p[1] += oz; }
    }
    const grid = new Uint8Array(W * H), idx = (i, j) => j * W + i;
    const inb = (i, j) => i >= 1 && j >= 1 && i < W - 1 && j < H - 1;

    // carve rooms
    for (const rm of rooms) {
      if (castle) {
        for (let j = rm.z - rm.hh; j < rm.z + rm.hh; j++) for (let i = rm.x - rm.hw; i < rm.x + rm.hw; i++) if (inb(i, j)) grid[idx(i, j)] = 1;
        continue;
      }
      const e = Math.ceil(rm.r * 1.35 + 2), na = rm.kind === 'start' && zi === 0 ? 0.35 : rm.kind === 'boss' ? 0.4 : theme === 'cave' ? 1.0 : theme === 'volcano' || theme === 'dairy' ? 0.8 : theme === 'town' ? 0.4 : 0.7;   // (town: smoother plaza edges, the house rows follow them)
      for (let j = Math.floor(rm.z - e); j <= rm.z + e; j++) for (let i = Math.floor(rm.x - e); i <= rm.x + e; i++) {
        if (!inb(i, j)) continue;
        const x = i + 0.5, z = j + 0.5, dx = x - rm.x, dz = z - rm.z;
        const rr = blobR(rm, Math.atan2(dz, dx)) + na * vnoise(x / 3.2, z / 3.2, nseed);
        if (hyp(dx, dz) < rr) grid[idx(i, j)] = 1;
      }
    }
    // carve corridors (blobs: bent quadratic curves; castle: axis-aligned bands)
    const stamp = (x, z, r, v = 1) => {
      for (let j = Math.floor(z - r); j <= z + r; j++) for (let i = Math.floor(x - r); i <= x + r; i++)
        if (inb(i, j) && hyp(i + 0.5 - x, j + 0.5 - z) < r) grid[idx(i, j)] = v;
    };
    for (const l of links) {
      if (castle) {
        for (const s of l.segs) {
          const xa = Math.min(s[0], s[2]), xb = Math.max(s[0], s[2]), za = Math.min(s[1], s[3]), zb = Math.max(s[1], s[3]);
          for (let j = za - l.w; j < zb + l.w; j++) for (let i = xa - l.w; i < xb + l.w; i++) if (inb(i, j)) grid[idx(i, j)] = 1;
        }
        continue;
      }
      const A = rooms[l.a], B = rooms[l.b], dx = B.x - A.x, dz = B.z - A.z, len = hyp(dx, dz);
      const cx = (A.x + B.x) / 2 - dz / len * l.bend, cz = (A.z + B.z) / 2 + dx / len * l.bend;
      const n = Math.ceil(len / 0.35), pts = [];
      for (let s = 0; s <= n; s++) {
        const t = s / n, u = 1 - t;
        const x = u * u * A.x + 2 * u * t * cx + t * t * B.x, z = u * u * A.z + 2 * u * t * cz + t * t * B.z;
        pts.push([x, z]);
        stamp(x, z, l.w + 0.45 * Math.max(0, vnoise(s * 0.35 / 2.5, l.a * 7.1, nseed + 11)));   // noise only widens
      }
      l.curve = pts;
    }
    if (!castle) {
      // smooth jaggies (majority rule), then re-open corridor cores so nothing gets cut off
      const tmp = new Uint8Array(W * H);
      for (let it = 0; it < 2; it++) {
        tmp.set(grid);
        for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
          const k = idx(i, j);
          let n = 0;
          for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (a || b) n += tmp[k + b * W + a];
          if (n >= 5) grid[k] = 1; else if (n <= 3) grid[k] = 0;
        }
      }
      for (const l of links) for (let s = 0; s < l.curve.length; s++) {   // full core width (3.5–4 m); diagonal runs lose ~0.7 m to the cell
        const c = l.curve, a = c[Math.max(0, s - 1)], b = c[Math.min(c.length - 1, s + 1)];   // staircase, so they get a little extra
        stamp(c[s][0], c[s][1], l.w + 0.4 * Math.abs(Math.sin(2 * Math.atan2(b[1] - a[1], b[0] - a[0]))));
      }
      // fill tiny wall islands inside the play area
      const seenW = new Uint8Array(W * H), q = new Int32Array(W * H);
      for (let k0 = 0; k0 < W * H; k0++) {
        if (grid[k0] || seenW[k0]) continue;
        let h = 0, t = 0, edge = false; q[t++] = k0; seenW[k0] = 1;
        while (h < t) {
          const c = q[h++], i = c % W, j = (c / W) | 0;
          if (i <= 1 || j <= 1 || i >= W - 2 || j >= H - 2) edge = true;
          for (const n of [c - 1, c + 1, c - W, c + W]) if (n >= 0 && n < W * H && !grid[n] && !seenW[n]) { seenW[n] = 1; q[t++] = n; }
          if (t > 40) edge = true;
        }
        if (!edge && t <= 6) for (let a = 0; a < t; a++) grid[q[a]] = 1;
      }
    }
    // path polyline (start → exit/boss) along the main corridors
    const path = [];
    const pushP = (x, z) => { const p = path[path.length - 1]; if (!p || hyp(p.x - x, p.z - z) > 0.2) path.push({ x, z }); };
    for (const l of links) {
      if (!l.main) continue;
      if (castle) for (const p of l.pts) pushP(p[0], p[1]);
      else for (let s = 0; s < l.curve.length; s += 4) pushP(l.curve[s][0], l.curve[s][1]);
    }
    const lastRoom = rooms[Z.rooms - 1];
    pushP(lastRoom.x, lastRoom.z);

    // castle pillars (grid cells, so pathing walks around them)
    const pillars = [];
    if (castle) {
      const nearPath = (x, z, d) => { for (let s = 1; s < path.length; s++) if (segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z) < d) return true; return false; };
      for (const rm of rooms) {
        const pts = [];
        if (rm.kind === 'boss') {
          for (let j = rm.z - rm.hh + 3; j <= rm.z + rm.hh - 4; j += 4) { pts.push([rm.x - rm.hw + 3, j]); pts.push([rm.x + rm.hw - 4, j]); }
        } else if (rm.hw >= 7 && rm.hh >= 5) {
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push([sx < 0 ? rm.x - rm.hw + 2 : rm.x + rm.hw - 3, sz < 0 ? rm.z - rm.hh + 2 : rm.z + rm.hh - 3]);
        }
        for (const [i, j] of pts) {
          if (nearPath(i + 0.5, j + 0.5, 2.6)) continue;
          let ok = true;   // keep corridor mouths clear
          for (let b = -2; b <= 2 && ok; b++) for (let a = -2; a <= 2; a++) {
            const ii = i + a, jj = j + b;
            if (!inRoom(rm, ii + 0.5, jj + 0.5) && grid[idx(ii, jj)]) { ok = false; break; }
          }
          if (ok) { grid[idx(i, j)] = 0; pillars.push({ x: i + 0.5, z: j + 0.5, i, j }); }
        }
      }
    }
    // keep only what is reachable from the start (and drop pillars that would cut anything off)
    const st = rooms[0], si = Math.floor(st.x), sj = Math.floor(st.z);
    let seen = floodFrom(W, H, grid, si, sj);
    for (const rm of rooms) {
      if (!seen[idx(Math.floor(rm.x), Math.floor(rm.z))]) {
        for (const p of pillars) grid[idx(p.i, p.j)] = 1;   // should never happen; reopen pillars
        pillars.length = 0;
        seen = floodFrom(W, H, grid, si, sj);
        break;
      }
    }
    for (let k = 0; k < W * H; k++) if (grid[k] && !seen[k]) grid[k] = 0;

    const dWall = chamfer(W, H, grid, 0);
    const L = {
      zone: zi, Z, W, H, grid, rooms, seed, theme, links, pillars, path, dWall,
      start: null, exit: null, boss: null, npc: null, spawns: [], chests: [], breakables: [], checkpoints: [], torches: [],
      solids: [], village: null,
    };
    L._sat = makeSAT(W, H, grid);
    place(L);
    placeMerchant(L);
    fixReach(L, unBreak, dropUnreachable);   // a breakable cluster must never seal a corridor mouth; ones Feza can't get to go
    return L;
  }

  // Distance to the nearest corridor polyline (main + side links, sampled every ~0.7 m)
  function linkDist(L, x, z) {
    let P = L._linkPts;
    if (!P) {
      P = L._linkPts = [];
      for (const l of L.links) {
        if (l.curve) for (let k = 0; k < l.curve.length; k += 2) P.push(l.curve[k][0], l.curve[k][1]);
        if (l.segs) for (const sg of l.segs) { const n = Math.max(1, Math.ceil(hyp(sg[2] - sg[0], sg[3] - sg[1]) / 0.7)); for (let k = 0; k <= n; k++) P.push(lerp(sg[0], sg[2], k / n), lerp(sg[1], sg[3], k / n)); }
      }
    }
    let d2 = 1e18;
    for (let k = 0; k < P.length; k += 2) { const dx = P[k] - x, dz = P[k + 1] - z, q = dx * dx + dz * dz; if (q < d2) d2 = q; }
    return Math.sqrt(d2);
  }

  // ── Placement of gameplay things ──
  function place(L) {
    const { Z, rooms, W, H, grid, dWall, path } = L, castle = L.theme === 'castle', zi = L.zone;
    const N = Z.rooms, main = rooms.slice(0, N), last = main[N - 1];
    const taken = [];   // {x,z,r}
    const free = (x, z, r) => { for (const t of taken) if (hyp(t.x - x, t.z - z) < t.r + r) return false; return true; };
    const dW = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? 0 : dWall[j * W + i]; };
    const pathD = (x, z) => { let d = 1e9; for (let s = 1; s < path.length; s++) d = Math.min(d, segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z)); return d; };
    // corridor points outside rooms (narrow passages + their mouths must stay clear of solids)
    const mouths = [];
    for (const l of L.links) {
      const pts = l.curve || [];
      if (l.segs) for (const sg of l.segs) { const n = Math.ceil(hyp(sg[2] - sg[0], sg[3] - sg[1])); for (let k = 0; k <= n; k++) pts.push([lerp(sg[0], sg[2], k / (n || 1)), lerp(sg[1], sg[3], k / (n || 1))]); }
      for (const q of pts) if (!inRoom(rooms[l.a], q[0], q[1], -1.2) && !inRoom(rooms[l.b], q[0], q[1], -1.2)) mouths.push(q);
    }
    const mouthD = (x, z) => { let d = 1e9; for (const q of mouths) d = Math.min(d, hyp(q[0] - x, q[1] - z)); return d; };
    const linkD = (x, z) => linkDist(L, x, z);   // any corridor (main or side), full length incl. the parts inside rooms
    const clearOfPath = (x, z, dp, dm) => pathD(x, z) >= dp && mouthD(x, z) >= dm;
    function spot(rm, minW, r, tries = 60, maxW = 99, extra) {
      for (let t = 0; t < tries; t++) {
        let x, z;
        if (rm.hw) { x = rm.x + RNG.range(-rm.hw + 1, rm.hw - 1); z = rm.z + RNG.range(-rm.hh + 1, rm.hh - 1); }
        else { const a = RNG.range(0, TAU), d = Math.sqrt(RNG.r()) * rm.r; x = rm.x + Math.cos(a) * d; z = rm.z + Math.sin(a) * d; }
        const w = dW(x, z);
        if (w < minW || w > maxW || !inRoom(rm, x, z, 0.5) || !free(x, z, r)) continue;
        if (extra && !extra(x, z)) continue;
        return { x, z };
      }
      return null;
    }
    const addSolid = (x, z, r, tag) => { const s = { x, z, r, alive: true, tag }; L.solids.push(s); return s; };
    // a solid either leaves a gap wide enough for anyone to pass, or hugs the wall (no gap to get stuck in)
    const gapOK = (x, z, r, g = 1.05) => gridFree(L, x, z, r + g) || !gridFree(L, x, z, r + 0.3);
    // slide a point toward the nearest wall until a circle of radius r just touches it (props standing against walls)
    const toWall = (x, z, r) => {
      let best = 9, bx = 0, bz = 0;
      for (let k = 0; k < 16; k++) {
        const a = k * TAU / 16, dx = Math.cos(a), dz = Math.sin(a);
        for (let d = 0.1; d < Math.min(best, 3); d += 0.1) if (!isFloor(L, x + dx * d, z + dz * d)) { best = d; bx = dx; bz = dz; break; }
      }
      if (best > 2.9) return null;
      let m = best - r - 0.18;
      while (m > 0 && !gridFree(L, x + bx * m, z + bz * m, r + 0.04)) m -= 0.05;
      return m > 0 ? { x: x + bx * m, z: z + bz * m } : null;
    };

    // start
    const S = rooms[0];
    L.start = zi === 0 ? { x: S.x - 0.3, z: S.z + 1.6 } : { x: S.x, z: S.z + (castle ? 1.5 : 1) };
    taken.push({ x: L.start.x, z: L.start.z, r: 2.5 });
    // zone 0: houses first — they turn part of the plaza rim into wall, which changes the distance field used below
    if (zi === 0) {
      villageHouses(L, S, clearOfPath);
      for (const h of L.village.houses) taken.push({ x: h.x, z: h.z, r: Math.max(h.w, h.d) * 0.5 + 0.9 });
    }

    // boss (centre of the arena; the castle's dragon a little north of the hall's centre) · the castle's neşe kristali ·
    // every other zone's exit portal at the arena's north edge (GAME wakes it up when the boss is cheered up)
    L.bossType = Z.boss || null;
    if (Z.boss) {
      L.boss = castle ? { x: last.x, z: last.z - 1 } : { x: last.x, z: last.z };
      taken.push({ x: L.boss.x, z: L.boss.z, r: 5 });
    }
    if (Z.final) {
      L.crystalSpot = { x: last.x, z: last.z - (last.hh || last.r) + 4.5 };
      taken.push({ x: L.crystalSpot.x, z: L.crystalSpot.z, r: 3 });
    } else {
      let pz = last.z - (last.hh || last.r) * (Z.boss ? 0.95 : 0.5);
      while (pz < last.z - (Z.boss ? 3 : 0) && dW(last.x, pz) < (L.theme === 'town' ? 1.8 : 3.2)) pz += 0.5;   // (Veba Şehri: the gate stands in the city wall at the rim)
      L.exit = { x: last.x, z: pz };
      taken.push({ x: L.exit.x, z: L.exit.z, r: 3 });
      addSolid(L.exit.x - 1.55, L.exit.z - 0.1, 0.5, 'portal'); addSolid(L.exit.x + 1.55, L.exit.z - 0.1, 0.5, 'portal');
      if (L.theme === 'town') {   // Yemin Kapısı: its two round towers; the floor ends at the portal (no walking in behind it, where the
        // towers and the bridge over the arch would hide Feza: every cell north of the portal between the towers' outer sides, and
        // behind the towers themselves, is no floor; the portal's own cell stays)
        const ex = L.exit;
        for (const sd of [-1, 1]) addSolid(ex.x + sd * 2.85, ex.z - 0.25, 0.95, 'gate');
        let cut = 0;
        for (let j = Math.max(1, Math.floor(ex.z - 9)); j < Math.min(H - 1, Math.ceil(ex.z)); j++) for (let i = Math.max(1, Math.floor(ex.x - 5.5)); i <= Math.min(W - 2, Math.ceil(ex.x + 5.5)); i++) {
          const k = j * W + i, dx = Math.abs(i + 0.5 - ex.x), z = j + 0.5;
          if (grid[k] && (dx < 3.9 ? z < ex.z - 0.5 : dx < 4.9 && z < ex.z - 1.3)) { grid[k] = 0; cut++; }
        }
        if (cut) {
          const sn = floodFrom(W, H, grid, Math.floor(L.start.x), Math.floor(L.start.z));
          for (let k = 0; k < W * H; k++) if (grid[k] && !sn[k]) grid[k] = 0;
          L.dWall.set(chamfer(W, H, grid, 0));
          L._sat = makeSAT(W, H, grid);
          L._gateCut = cut;
        }
      }
    }
    {   // the main route ends at the portal / dragon, not at the last room's centre
      const g = L.exit || L.boss, e = path[path.length - 1];
      if (g && (!e || hyp(e.x - g.x, e.z - g.z) > 0.2)) path.push({ x: g.x, z: g.z });
    }

    // village edge (zone 0): owl on a stump, well, lamps, houses north of the plaza
    if (zi === 0) buildVillageData(L, S, taken, addSolid, dW, clearOfPath);

    // checkpoints: one on the way — at the way INTO its room, so Feza lights it before he meets that room's pack (which waits on the
    // far side, see packIn) — and one right before the boss arena (in the room before it, on the arena side; the castle too)
    const cpRooms = castle ? [Math.round((N - 1) * 0.45), N - 2] : [...new Set([Math.round((N - 1) * 0.4), N - 2])].filter(k => k > 0 && k < N - 1);
    const rsP = [];   // the route resampled every ≤ 0.8 m with its direction (the castle's path only has its corners)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], l = hyp(b.x - a.x, b.z - a.z) || 1, n = Math.max(1, Math.ceil(l / 0.8));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) rsP.push({ x: lerp(a.x, b.x, k / n), z: lerp(a.z, b.z, k / n), dx: (b.x - a.x) / l, dz: (b.z - a.z) / l });
    }
    // …and clear of the corners a walker cuts (chords 4 and 8 m long across the route's bends, e.g. the castle's right-angle turns)
    const cutOK = (x, z) => {
      for (let i = 0; i + 5 < rsP.length; i++) {
        if (segDist(x, z, rsP[i].x, rsP[i].z, rsP[i + 5].x, rsP[i + 5].z) < 1.4) return false;
        if (i + 10 < rsP.length && segDist(x, z, rsP[i].x, rsP[i].z, rsP[i + 10].x, rsP[i + 10].z) < 1.4) return false;
      }
      return true;
    };
    for (const k of cpRooms) {
      const rm = main[k], pre = k === N - 2 && last.kind === 'boss';
      let p = null;
      // beside the main path (walking by lights it up) but never on it
      const onP = rsP.filter(q => inRoom(rm, q.x, q.z, 1));
      if (pre) onP.reverse();   // nearest the way out to the arena first (else nearest the way in)
      for (let t = 0; t < 48 && !p && onP.length; t++) {
        const q = onP[Math.min(onP.length - 1, t >> 2)], sd = t & 1 ? 1 : -1, o = RNG.range(1.5, 1.8);
        const x = q.x - q.dz * o * sd, z = q.z + q.dx * o * sd;
        if (dW(x, z) >= 2.2 && free(x, z, 2) && clearOfPath(x, z, 1.4, 3) && gapOK(x, z, 0.7) && cutOK(x, z)) p = { x, z };
      }
      if (!p) p = spot(rm, 2.4, 2, 60, 99, (x, z) => clearOfPath(x, z, 1.4, 3) && gapOK(x, z, 0.7) && cutOK(x, z));
      if (!p) p = spot(rm, 2.4, 2, 60, 99, (x, z) => clearOfPath(x, z, 1.4, 3) && gapOK(x, z, 0.7));
      if (!p) continue;
      L.checkpoints.push(p); taken.push({ x: p.x, z: p.z, r: 3.2 });
      addSolid(p.x, p.z, 0.7, 'cp');
    }

    // chests: one per side room (the last one big) + one in a middle main room
    const sides = rooms.filter(r => r.kind === 'side');
    sides.forEach((rm, n) => {
      const host = rooms[rm.host], dx = rm.x - host.x, dz = rm.z - host.z, l = hyp(dx, dz) || 1;
      let p = null;
      for (let t = 0; t < 20 && !p; t++) {
        const k = 0.25 + RNG.range(0, 0.15), x = rm.x + dx / l * (rm.hw ? rm.hw : rm.r) * k, z = rm.z + dz / l * (rm.hh ? rm.hh : rm.r) * k - 0.4;
        if (dW(x, z) >= 1.8 && free(x, z, 1.5) && clearOfPath(x, z, 2.2, 3) && gapOK(x, z, 0.8)) p = { x, z };
      }
      if (!p) p = spot(rm, 1.8, 1.5, 80, 99, (x, z) => clearOfPath(x, z, 2.2, 3) && gapOK(x, z, 0.8));
      for (let t = 0; t < 40 && !p; t++) {   // last resort: against the room's wall
        const q = spot(rm, 1, 0.5, 10);
        const w = q && toWall(q.x, q.z, 0.85);
        if (w && inRoom(rm, w.x, w.z) && free(w.x, w.z, 1.5) && clearOfPath(w.x, w.z, 2.2, 3)) p = w;
      }
      if (!p) return;
      L.chests.push({ x: p.x, z: p.z, big: n === sides.length - 1 });
      taken.push({ x: p.x, z: p.z, r: 2 });
    });
    {   // middle main room: right beside the route (walking it opens the chest, GAME auto-opens at 2.4 m) but never on it
      const sideP = [];   // side corridors, incl. their part inside the room: the chest must not plug one
      for (const l of L.links) if (!l.main) {
        if (l.curve) for (const q of l.curve) sideP.push(q[0], q[1]);
        if (l.segs) for (const sg of l.segs) { const n = Math.max(1, Math.ceil(hyp(sg[2] - sg[0], sg[3] - sg[1]) / 0.7)); for (let k = 0; k <= n; k++) sideP.push(lerp(sg[0], sg[2], k / n), lerp(sg[1], sg[3], k / n)); }
      }
      const ptsD = (P, x, z) => { let d = 1e9; for (let k = 0; k < P.length; k += 2) d = Math.min(d, hyp(P[k] - x, P[k + 1] - z)); return d; };
      const rs = [];   // path resampled every ≤0.4 m
      for (let s = 1; s < path.length; s++) {
        const a = path[s - 1], b = path[s], n = Math.max(1, Math.ceil(hyp(b.x - a.x, b.z - a.z) / 0.4));
        for (let k = s === 1 ? 0 : 1; k <= n; k++) rs.push(lerp(a.x, b.x, k / n), lerp(a.z, b.z, k / n));
      }
      const nr = rs.length >> 1, off = RNG.range(-0.2, 0.2);
      // A kid steering at a point a few metres ahead cuts the corners. Model that walk through the room: pure pursuit of the
      // route point `ahead` m past his progress (progress = the nearest route point, or — a kid looking further — the
      // furthest one within 3.5 m). Mildest first; the chest must sit beside these trails, not only beside the path.
      const trailsIn = rm => {
        const ext = roomExt(rm), near = ext + 10;
        let i0 = 0;
        while (i0 < nr - 1 && hyp(rs[2 * i0] - rm.x, rs[2 * i0 + 1] - rm.z) > near) i0++;
        return [[2.5, 0], [4.5, 0], [2.5, 3.5], [6, 3.5]].map(([ahead, look]) => {
          const tr = [], la = Math.round(ahead / 0.4), win = la + (look ? 16 : 6);
          let x = rs[2 * i0], z = rs[2 * i0 + 1], i = i0, inside = false;
          for (let step = 0; step < 600 && i < nr - 1; step++) {
            let bj = i, bd = 1e9;   // progress never goes backwards
            for (let j = i; j < Math.min(nr, i + win); j++) {
              const dj = hyp(rs[2 * j] - x, rs[2 * j + 1] - z);
              if (look ? dj < look : dj < bd) { bd = dj; bj = j; }
            }
            i = bj;
            const t = Math.min(nr - 1, i + la), dx = rs[2 * t] - x, dz = rs[2 * t + 1] - z, l = hyp(dx, dz);
            if (l < 0.05) break;
            x += dx / l * 0.25; z += dz / l * 0.25;
            const dr = hyp(x - rm.x, z - rm.z);
            if (dr < ext + 3) { tr.push(x, z); inside = true; } else if (inside && dr > near) break;
          }
          return tr;
        });
      };
      // best spot 1.3–1.9 m from the path and 1.1–2.0 m from the first `use` trails (off the kid's line, within reach)
      const beside = (rm, trails, use) => {
        const ext = roomExt(rm);
        let p = null, best = 1e9;
        for (let gz = rm.z - ext; gz <= rm.z + ext; gz += 0.4) for (let gx = rm.x - ext; gx <= rm.x + ext; gx += 0.4) {
          const x = gx + off, z = gz + off;
          if (!inRoom(rm, x, z, 0.5) || dW(x, z) < 1.2 || !free(x, z, 2) || !gridFree(L, x, z, 0.75)) continue;
          const d = pathD(x, z);
          if (d < 1.3 || d > 1.9) continue;
          let sc = Math.abs(d - 1.45) * 2, ok = true;
          for (let k = 0; k < use && ok; k++) { const dt = ptsD(trails[k], x, z); if (dt < 1.1 || dt > 2.0) ok = false; else sc += Math.abs(dt - 1.5); }
          if (!ok || mouthD(x, z) < 3 || ptsD(sideP, x, z) < 2.4 || !gapOK(x, z, 0.62)) continue;
          sc += hyp(x - rm.x, z - rm.z) * 0.12 - (z - rm.z) * 0.06;   // near the room's middle, slightly toward the camera (+z)
          if (sc < best) { best = sc; p = { x, z }; }
        }
        return p;
      };
      const k0 = clamp(Math.round((N - 1) * 0.55), 1, N - 2), rm = main[k0], trails = {};
      let p = null;
      for (const use of [4, 3, 2, 0]) {   // all trails (this room, else a neighbour); then fewer trails; then the path alone
        for (const k of use === 4 ? [k0, k0 + 1, k0 - 1] : [k0]) {
          if (k < 1 || k > N - 2) continue;
          p = beside(main[k], trails[k] || (trails[k] = trailsIn(main[k])), use);
          if (p) break;
        }
        if (p) break;
      }
      if (!p) p = spot(rm, 1.6, 2, 80, 2.6, (x, z) => clearOfPath(x, z, 2.6, 3) && gapOK(x, z, 0.62));
      for (let t = 0; t < 40 && !p; t++) {
        const q = spot(rm, 1, 0.5, 10);
        const w = q && toWall(q.x, q.z, 0.7);
        if (w && inRoom(rm, w.x, w.z) && free(w.x, w.z, 2) && clearOfPath(w.x, w.z, 2.6, 3)) p = w;
      }
      if (p) { L.chests.push({ x: p.x, z: p.z, big: false }); taken.push({ x: p.x, z: p.z, r: 2 }); }
    }
    for (const c of L.chests) addSolid(c.x, c.z, c.big ? 0.8 : 0.62, 'chest');
    if (L.theme === 'town') townData(L, { main, taken, free, addSolid, dW, clearOfPath, gapOK, linkD });   // (before the packs: they keep clear of it)

    // enemy packs — none within reach of a checkpoint's wake-up spot (cp.z + 1.6, where GAME puts Feza after a nap): creatures notice
    // him at ~9 m, so a pack there would be on him the moment he wakes up. 12 m (the pack's centre 13.5 m, room for its members),
    // else 10 m, else anywhere (a tiny room)
    const types = Z.enemies;
    let pack = 0;
    const wake = L.checkpoints.map(c => ({ x: c.x, z: c.z + 1.6 }));
    const cpD = (x, z) => { let d = 1e9; for (const w of wake) d = Math.min(d, hyp(w.x - x, w.z - z)); return d; };
    const spill = [];   // members that found no spot away from a checkpoint
    const eliteRooms = [];
    {   // not in the room right before the arena (its checkpoint): one room earlier; the castle's small halls can't keep a pack 12 m
        // off their checkpoint, so its first elite also waits a room before the middle checkpoint
      let a = clamp(Math.round((N - 1) * 0.45), 2, N - 2);
      const b = Z.boss ? N - 3 : N - 1;
      if (castle && cpRooms.includes(a) && a - 1 >= 2) a--;
      eliteRooms.push(a); if (b !== a) eliteRooms.push(b);
    }
    const packIn = (ri, n, elite) => {
      const rm = rooms[ri];
      const far = (x, z) => hyp(x - L.start.x, z - L.start.z) > 12;
      let c = null, memCp = 0;
      for (const [cc, cm] of [[13.5, 12], [11, 10]]) {
        const ok = (x, z) => far(x, z) && cpD(x, z) >= cc;
        c = spot(rm, 2.6, 1.2, 60, 99, ok) || spot(rm, 1.6, 0.8, 80, 99, ok);
        if (c) { memCp = cm; break; }
      }
      if (!c) {   // a small room with a checkpoint: the valid spot farthest from it; packmates that can't keep 9.6 m join other packs
        let bd = -1;
        for (let t = 0; t < 40; t++) { const q = spot(rm, 1.6, 0.8, 4, 99, far), d = q ? cpD(q.x, q.z) : -1; if (d > bd) { bd = d; c = q; } }
        if (c) memCp = 9.6;
      }
      if (!c) {   // small room next to the start: take the valid spot farthest from it
        let bd = -1;
        for (let t = 0; t < 40; t++) { const q = spot(rm, 1.2, 0.7, 4); if (q && hyp(q.x - L.start.x, q.z - L.start.z) > bd) { bd = hyp(q.x - L.start.x, q.z - L.start.z); c = q; } }
      }
      if (!c) return;
      pack++;
      const nearCp = memCp > 0 && cpD(c.x, c.z) < memCp + 6;   // a pack kept off a checkpoint: its members get a little more room
      let bigs = 0;
      const list = [];
      for (let m = 0; m < n; m++) {
        let t = wpick(types, RNG._r);
        if (BIG.includes(t) && (bigs > 0 || n > 4)) { const w = Object.assign({}, types); for (const b of BIG) delete w[b]; t = wpick(w, RNG._r); }
        if (BIG.includes(t)) bigs++;
        list.push(t);
      }
      if (elite) list[0] = Z.elites[eliteRooms.indexOf(ri) % Z.elites.length];
      let eliteDone = false;
      list.forEach((t, m) => {
        const big = BIG.includes(t) || (elite && m === 0);
        let p = m === 0 && hyp(c.x - L.start.x, c.z - L.start.z) > 12 ? { x: c.x, z: c.z } : null;
        for (let tr = 0; tr < (nearCp ? 80 : 40) && !p; tr++) {
          const wide = tr >= 40, a = RNG.range(0, TAU), d = RNG.range(1.3, wide ? 4.4 : 3.2);
          const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
          if (dW(x, z) >= (big ? 2.2 : 1.5) && inRoom(rm, x, z, 0.8) && free(x, z, big ? 1.4 : 0.7) && hyp(x - L.start.x, z - L.start.z) > 12 && cpD(x, z) >= (wide ? Math.min(memCp, 9.6) : memCp)) p = { x, z };
        }
        if (!p) { if (nearCp && !big && m > 0) spill.push(t); return; }   // no room away from the checkpoint: it joins another pack
        const el = !!elite && !eliteDone && (m === 0 || t === list[0] || m === list.length - 1);
        if (el) eliteDone = true;
        const sp = { type: el ? list[0] : t, x: p.x, z: p.z, elite: el, pack, room: ri }, vs = Z.variants && Z.variants[sp.type];
        if (vs && vs.length) sp.variant = RNG.pick(vs);   // e.g. the volcano's lava jellies (GAME passes it to EMODEL.build)
        L.spawns.push(sp);
        taken.push({ x: p.x, z: p.z, r: big ? 1.5 : 0.8 });
      });
    };
    for (let k = 1; k < N; k++) {
      if (main[k].kind === 'boss') continue;
      const n = k === 1 ? 3 : main[k].kind === 'exit' ? RNG.int(4, 6) : RNG.int(3, 6);
      packIn(k, n, eliteRooms.includes(k));
    }
    rooms.forEach((rm, ri) => { if (rm.kind === 'side' && RNG.chance(0.6)) packIn(ri, RNG.int(2, 3), false); });
    if (spill.length) {   // …so the level keeps its creatures: they join the packs of main rooms far from any checkpoint (smallest first, ≤ 7)
      const groups = {};
      for (const sp of L.spawns) if (sp.room >= 2 && sp.room < N - 1) (groups[sp.pack] || (groups[sp.pack] = [])).push(sp);
      const hosts = Object.values(groups).filter(g => g.every(q => cpD(q.x, q.z) >= 12));
      for (const t of spill) {
        hosts.sort((a, b) => a.length - b.length);
        for (const g of hosts) {
          if (g.length >= 7) break;
          const cx = g.reduce((a, q) => a + q.x, 0) / g.length, cz = g.reduce((a, q) => a + q.z, 0) / g.length, rm = rooms[g[0].room];
          let p = null;
          for (let tr = 0; tr < 40 && !p; tr++) {
            const a = RNG.range(0, TAU), d = RNG.range(1.3, 3.8), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
            if (dW(x, z) >= 1.5 && inRoom(rm, x, z, 0.8) && free(x, z, 0.7) && hyp(x - L.start.x, z - L.start.z) > 12 && cpD(x, z) >= 12) p = { x, z };
          }
          if (!p) continue;
          const sp = { type: t, x: p.x, z: p.z, elite: false, pack: g[0].pack, room: g[0].room }, vs = Z.variants && Z.variants[t];
          if (vs && vs.length) sp.variant = RNG.pick(vs);
          L.spawns.push(sp); g.push(sp);
          taken.push({ x: p.x, z: p.z, r: 0.8 });
          break;
        }
      }
    }
    if (!ensureBig(L, types, taken, N, dW, (x, z) => hyp(x - L.start.x, z - L.start.z) > 12 && cpD(x, z) >= 10)) ensureBig(L, types, taken, N, dW, (x, z) => hyp(x - L.start.x, z - L.start.z) > 12);

    // breakables: small clusters against the walls
    const kindsBy = { forest: ['barrel', 'crate', 'vase'], dairy: ['barrel', 'vase', 'barrel', 'crate'], cave: ['crate', 'barrel', 'vase'], volcano: ['vase', 'crate', 'barrel'], castle: ['vase', 'vase', 'barrel', 'crate'], town: ['barrel', 'crate', 'vase', 'barrel'] }[L.theme] || ['barrel', 'crate', 'vase'];   // dairy: barrel = copper milk can, vase = milk jug
    rooms.forEach((rm, ri) => {
      if (rm.kind === 'boss') return;
      const nCl = rm.kind === 'start' ? (zi === 0 ? 1 : 0) : rm.kind === 'side' ? 1 : RNG.int(1, 2);
      for (let c = 0; c < nCl; c++) {
        const ctr = spot(rm, 1.2, 1.4, 80, 1.8, (x, z) => clearOfPath(x, z, 2.4, 3.4) && linkD(x, z) >= 2.4);
        if (!ctr) continue;
        const kind0 = RNG.pick(kindsBy), n = RNG.int(2, 4);
        let placed = 0;
        for (let t = 0; t < 40 && placed < n; t++) {
          const a = RNG.range(0, TAU), d = placed === 0 ? 0 : RNG.range(0.75, 1.5);
          const q = toWall(ctr.x + Math.cos(a) * d, ctr.z + Math.sin(a) * d, placed < 2 || RNG.chance(0.6) ? 0.45 : 1.35);
          if (!q) continue;
          const x = q.x, z = q.z, kind = RNG.chance(0.7) ? kind0 : RNG.pick(kindsBy), br = kind === 'crate' ? 0.6 : 0.42;
          if (!free(x, z, br) || !clearOfPath(x, z, 2.2, 3.2) || linkD(x, z) < 2.2 || !gapOK(x, z, 0.45, 0.95)) continue;
          L.breakables.push({ x, z, kind });
          taken.push({ x, z, r: br });
          placed++;
        }
      }
    });
    for (const b of L.breakables) b.solid = addSolid(b.x, b.z, b.kind === 'crate' ? 0.45 : 0.4, 'break');

    // torches on north walls (cave / castle; the volcano's light comes from its lava)
    if (L.theme === 'cave' || castle) {
      const nearT = (x, z, d) => L.torches.some(t => hyp(t.x - x, t.z - z) < d);
      if (castle) {
        const rowTorches = (xa, xb, jw) => {   // jw = wall row, floor at jw+1
          for (let x = xa + 2.5; x < xb - 1.5; x += 5) {
            const i = Math.floor(x);
            let ok = true;
            for (let a = -1; a <= 1; a++) if (grid[jw * W + i + a] || !grid[(jw + 1) * W + i + a]) ok = false;
            if (L.crystalSpot && Math.abs(i + 0.5 - L.crystalSpot.x) < 2 && Math.abs(jw + 1 - L.crystalSpot.z) < 6) ok = false;   // rose window
            if (ok && !nearT(i + 0.5, jw + 1, 3.5)) L.torches.push({ x: i + 0.5, y: 1.95, z: jw + 1.08 });
          }
        };
        for (const rm of rooms) rowTorches(rm.x - rm.hw, rm.x + rm.hw, rm.z - rm.hh - 1);
        for (const l of L.links) for (const s of l.segs) if (s[1] === s[3]) rowTorches(Math.min(s[0], s[2]), Math.max(s[0], s[2]), s[1] - l.w - 1);
        if (L.crystalSpot) for (const sx of [-4.2, 4.2]) L.torches.push({ x: L.crystalSpot.x + sx, y: 1.25, z: L.crystalSpot.z + 0.6, brazier: true });
      } else {
        const cells = [];
        for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (grid[j * W + i] && !grid[(j - 1) * W + i] && grid[j * W + i - 1] && grid[j * W + i + 1]) cells.push([i, j]);
        shuffle(cells, RNG._r);
        for (const [i, j] of cells) {
          const x = i + 0.5, z = j + 0.35;
          if (nearT(x, z, 9) || !free(x, z, 0.6)) continue;
          L.torches.push({ x, y: 1.55, z });
          taken.push({ x, z, r: 0.6 });
        }
      }
    }
    for (const t of L.torches) if (L.theme === 'cave' || t.brazier) addSolid(t.x, t.z, t.brazier ? 0.55 : 0.28, 'torch');
    for (const s of L.solids) s.r = +s.r.toFixed(2);
  }

  // Veba Şehri (pure data): the fountain in a square in the first views (the start plaza, north of Feza, or the next one), a well or
  // two against square rims, the market square's stall spots along its northern rim and sides (the stalls face the square: their
  // awnings hide no floor behind them, not even one cell). Solids: the fountain's basin, the wells, each stall as two circles side
  // by side. → L.town = { fountain: {x, z, r, room} | null, wells: [{x, z, room, ry}], market: room index | -1, stalls: [{x, z, yaw, v}] }
  function townData(L, T) {
    const { main, taken, free, addSolid, dW, clearOfPath, gapOK, linkD } = T, N = main.length;
    const TD = L.town = { fountain: null, wells: [], market: -1, stalls: [] };
    for (const k of [0, 1, 2]) {
      const rm = main[k];
      if (!rm || rm.kind === 'boss') continue;
      let best = null;
      for (let t = 0; t < 500; t++) {
        const a = RNG.range(0, TAU), d = Math.sqrt(RNG.r()) * rm.r * 0.85, x = rm.x + Math.cos(a) * d, z = rm.z + Math.sin(a) * d;
        if (dW(x, z) < 2.8 || !inRoom(rm, x, z, 1.6) || !free(x, z, 2.3) || !clearOfPath(x, z, 3.1, 3.6) || !gapOK(x, z, 1.35) || linkD(x, z) < 3.2) continue;
        if (k === 0 && z > L.start.z - 2) continue;   // in the start plaza: north of Feza (in the first view, never between him and the camera)
        const sc = hiddenBehind(L, x, z, 0.45, 2.3) * 1.5 + Math.abs(hyp(x - rm.x, z - rm.z) - rm.r * 0.4) * 0.3 + RNG.r() * 0.5;
        if (!best || sc < best.sc) best = { x, z, sc };
      }
      if (!best) continue;
      TD.fountain = { x: best.x, z: best.z, r: 1.35, room: k };
      taken.push({ x: best.x, z: best.z, r: 2.2 }); addSolid(best.x, best.z, 1.35, 'fountain');
      break;
    }
    // the market square: the roomiest main room between the start and the checkpoint before the arena (the next roomiest gets the rest,
    // up to 4 stalls in all)
    const mks = [];
    for (let k = 2; k <= N - 3; k++) if (main[k].kind === 'main' && (!TD.fountain || TD.fountain.room !== k)) mks.push(k);
    mks.sort((p, q) => main[q].r - main[p].r);
    for (const mk of mks.slice(0, 2)) {
      if (TD.stalls.length >= 4) break;
      const rm = main[mk], n0 = TD.stalls.length;
      for (let a = -Math.PI / 2 - 2.1 + RNG.r() * 0.3; a <= -Math.PI / 2 + 2.1 && TD.stalls.length < (n0 ? 4 : 3); a += 0.08) {   // along the northern rim and the sides
        const dx = Math.cos(a), dz = Math.sin(a);
        let r = rm.r * 0.4;
        while (r < rm.r + 4 && isFloor(L, rm.x + dx * r, rm.z + dz * r)) r += 0.1;
        if (r >= rm.r + 4) continue;
        const x = rm.x + dx * (r - 0.95), z = rm.z + dz * (r - 0.95), yaw = Math.atan2(-dx, -dz), tx = Math.cos(yaw), tz = -Math.sin(yaw);   // (tx, tz): along its width
        const ok = q => gapOK(q.x, q.z, 0.55) && dW(q.x, q.z) >= 0.6;
        const c1 = { x: x + tx * 0.62, z: z + tz * 0.62 }, c2 = { x: x - tx * 0.62, z: z - tz * 0.62 };   // (the solids reach its awning's ends: Feza never stands under their sides)
        if (!ok(c1) || !ok(c2) || !free(x, z, 1.35) || !clearOfPath(x, z, 2.4, 3.2) || linkD(x, z) < 2.6 || TD.stalls.some(q => hyp(q.x - x, q.z - z) < 2.7)) continue;
        {   // no floor behind its awning (2.3 × 1.4 m, up to 2.45 m) where Feza could stand (≥ 0.45 m past its back): camera rule
          const hx = Math.abs(tx) * 1.15 + Math.abs(tz) * 0.7, hz = Math.abs(tz) * 1.15 + Math.abs(tx) * 0.7;
          if (satCount(L, x - hx - 0.25, z - hz - (2.45 - 0.2) * LV_PK, x + hx + 0.25, z - hz - 0.45) > 0) continue;
        }
        TD.stalls.push({ x, z, yaw, v: TD.stalls.length });
        taken.push({ x, z, r: 1.3 });
        addSolid(c1.x, c1.z, 0.55, 'stall'); addSolid(c2.x, c2.z, 0.55, 'stall');
      }
      if (TD.market < 0 && TD.stalls.length > n0) TD.market = mk;
    }
    const mk = TD.market;
    // (İnfaz Meydanı's tournament banners: GAME places its own, west, north and east of the knight)
    // wells: against a square's rim where the little roof hides no floor, one or two rooms apart
    for (let k = 1; k < N - 1 && TD.wells.length < 2; k++) {
      const rm = main[k];
      if (rm.kind !== 'main' || k === mk || (TD.fountain && TD.fountain.room === k) || TD.wells.some(w => Math.abs(w.room - k) < 2)) continue;
      for (let t = 0; t < 200; t++) {
        const a = RNG.range(0, TAU), d = Math.sqrt(RNG.r()) * rm.r, x = rm.x + Math.cos(a) * d, z = rm.z + Math.sin(a) * d;
        if (dW(x, z) < 1.4 || dW(x, z) > 2.4 || !inRoom(rm, x, z, 0.5) || !free(x, z, 1.8) || !clearOfPath(x, z, 2.6, 3.2) || !gapOK(x, z, 0.95) || linkD(x, z) < 2.8 || hiddenBehind(L, x, z, 1.0, 2.4) > 0) continue;
        TD.wells.push({ x, z, room: k, ry: RNG.range(-0.3, 0.3) });
        taken.push({ x, z, r: 1.8 }); addSolid(x, z, 0.95, 'well');
        break;
      }
    }
  }

  // Every level whose roster lists a big one (the Kaya Devi) gets at least one — the weighted pick alone left about 1 cave in 6
  // and 1 castle in 3 without. No RNG draws (levels that already have one stay exactly as they were). An ordinary member of an
  // elite-free pack in a room past the first becomes the big one where it has room to move (packIn's rules — ≥ 2.2 m from walls,
  // clear of the others by 1.4 m — plus a wall-free 1.1 m circle), else it steps to the first roomy spot around its pack.
  // Small packs (≤ 4, like packIn) first; in a pack of 5–6 the big one takes the place of two (its nearest packmate goes).
  // Main rooms near 60 % of the route are tried first, side rooms last.
  function ensureBig(L, types, taken, N, dW, farOK) {
    const big = BIG.find(b => types[b]);
    if (!big || L.spawns.some(s => BIG.includes(s.type))) return false;
    const packs = {};
    for (const s of L.spawns) (packs[s.pack] || (packs[s.pack] = [])).push(s);
    const want = Math.round((N - 1) * 0.6), rank = s => (s.room >= N ? 100 : 0) + Math.abs(s.room - want) + packs[s.pack].length * 0.01;
    const cand = L.spawns.filter(s => !s.elite && s.room >= 2 && L.rooms[s.room] && L.rooms[s.room].kind !== 'boss' && !packs[s.pack].some(o => o.elite))
      .sort((a, b) => rank(a) - rank(b) || L.spawns.indexOf(a) - L.spawns.indexOf(b));
    const own = s => (s && taken.find(t => t.x === s.x && t.z === s.z)) || null;
    const mateOf = s => packs[s.pack].length <= 4 ? null : packs[s.pack].filter(o => o !== s).sort((a, b) => hyp(a.x - s.x, a.z - s.z) - hyp(b.x - s.x, b.z - s.z))[0] || null;
    const roomy = (s, t, tm, x, z) => dW(x, z) >= 2.2 && gridFree(L, x, z, 1.1) && inRoom(L.rooms[s.room], x, z, 0.8) && farOK(x, z) &&
      taken.every(q => q === t || q === tm || hyp(q.x - x, q.z - z) >= q.r + 1.4);
    const vs = L.Z.variants && L.Z.variants[big];
    const make = (s, t, m, tm, x, z) => {
      s.type = big; s.x = x; s.z = z;
      if (vs && vs.length) s.variant = vs[L.spawns.indexOf(s) % vs.length]; else delete s.variant;
      if (t) { t.x = x; t.z = z; t.r = 1.5; } else taken.push({ x, z, r: 1.5 });
      if (m) { L.spawns.splice(L.spawns.indexOf(m), 1); if (tm) taken.splice(taken.indexOf(tm), 1); }
      return true;
    };
    for (const small of [true, false]) {
      const list = cand.filter(s => (packs[s.pack].length <= 4) === small);
      for (const s of list) { const t = own(s), m = mateOf(s), tm = own(m); if (roomy(s, t, tm, s.x, s.z)) return make(s, t, m, tm, s.x, s.z); }
      for (const s of list) {
        const t = own(s), m = mateOf(s), tm = own(m), P = packs[s.pack];
        const cx = P.reduce((a, q) => a + q.x, 0) / P.length, cz = P.reduce((a, q) => a + q.z, 0) / P.length;
        for (let d = 1.3; d <= 4.3; d += 0.5) for (let k = 0; k < 16; k++) {
          const x = cx + Math.cos(k / 16 * TAU) * d, z = cz + Math.sin(k / 16 * TAU) * d;
          if (roomy(s, t, tm, x, z)) return make(s, t, m, tm, x, z);
        }
      }
    }
    return false;
  }

  // Zone 0: 2–3 cute houses along the north rim of the start plaza, close enough to be seen from the start. They stand partly
  // on the room's floor, so the floor under them — and the strip behind them they would hide from the camera — becomes wall.
  const PKC = LV_PK;   // = 1 / tan(gameplay pitch): floor distance hidden behind 1 m of height
  function houseCells(L, S, hx, hz, w, d, yaw, top) {
    const W = L.W, H = L.H, cs = Math.cos(yaw), sn = Math.sin(yaw), out = [];
    const ex = w / 2 + 0.85, zb = d / 2 + 0.5, zf = d / 2 + 0.12, R = Math.hypot(ex, zb);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9;
    for (const [lx, lz] of [[-ex, -zb], [ex, -zb], [-ex, zf], [ex, zf]]) {
      const x = hx + lx * cs + lz * sn, z = hz - lx * sn + lz * cs;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z);
    }
    const zh = z0 - (top - 0.5) * PKC;   // hidden-by-the-roof strip north of the house
    let nFloor = 0;
    for (let j = Math.floor(zh); j <= Math.ceil(hz + R); j++) for (let i = Math.floor(hx - R); i <= Math.ceil(hx + R); i++) {
      if (i < 1 || j < 1 || i >= W - 1 || j >= H - 1) continue;
      const x = i + 0.5, z = j + 0.5, dx = x - hx, dz = z - hz, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      const foot = Math.abs(lx) < ex && lz > -zb && lz < zf;
      const hid = x > x0 + 0.2 && x < x1 - 0.2 && z > zh && z < hz;
      if (!foot && !hid) continue;
      const c = j * W + i;
      if (!L.grid[c]) continue;
      if (!inRoom(S, x, z, -1.2)) return null;   // never eat into another room or corridor
      out.push(c); nFloor++;
    }
    return nFloor > 90 ? null : out;
  }
  function villageHouses(L, S, clearOfPath) {
    const V = L.village = { houses: [], well: null, lamps: [], fences: [], beds: [], sign: null, stump: null };
    const W = L.W, H = L.H, grid = L.grid;
    let exitA = 0;   // where the path leaves the plaza (angle from north, + = east)
    for (const p of L.path) if (hyp(p.x - S.x, p.z - S.z) > S.r * 0.9) { exitA = Math.atan2(p.x - S.x, S.z - p.z); break; }
    const cand = [];
    for (let a = -1.4; a <= 1.4; a += 0.05) {
      const da = Math.abs(angDiff(a, exitA));
      if (da < 0.75) continue;
      cand.push({ a, k: Math.abs(a) * 0.35 + RNG.r() * 0.45 - Math.min(da, 1.6) * 0.2 });
    }
    cand.sort((p, q) => p.k - q.k);
    const rooms = L.rooms.slice(0, L.Z.rooms);
    // pass 0: front row on the plaza rim · pass 1: a little further out · pass 2: second row peeking between them
    for (let pass = 0; pass < 3 && V.houses.length < 3; pass++) for (const { a } of cand) {
      if (V.houses.length >= 3) break;
      const small = V.houses.length === 2 || pass === 2, w = small ? RNG.range(3.8, 4.3) : RNG.range(4.4, 5.2), d = small ? RNG.range(3.3, 3.7) : RNG.range(3.7, 4.2);
      const wh = RNG.range(2.5, 2.9), front = pass === 2 ? S.r + RNG.range(1.5, 3) : S.r * (pass ? 0.7 : RNG.range(0.5, 0.6)), rr = front + d / 2;
      const hx = S.x + Math.sin(a) * rr, hz = S.z - Math.cos(a) * rr, yaw = Math.atan2(L.start.x - hx, L.start.z - hz);
      if (hz > L.start.z - 3 || hyp(hx - L.start.x, hz - L.start.z) < d / 2 + 3.6) continue;
      if (V.houses.some(h => hyp(h.x - hx, h.z - hz) < (h.w + w) * 0.5 + (pass === 2 ? 0.7 : 1.1))) continue;
      const span = Math.min(w, d), top = 0.3 + wh + 1.55 + span * 0.08 + 0.95;   // roof ridge + chimney
      const cells = houseCells(L, S, hx, hz, w, d, yaw, top);
      if (!cells) continue;
      let ok = true;
      for (const c of cells) {
        const x = c % W + 0.5, z = ((c / W) | 0) + 0.5;
        if (!clearOfPath(x, z, 2.4, 3.2) || hyp(x - L.start.x, z - L.start.z) < 3.4) { ok = false; break; }
      }
      if (!ok) continue;
      const keepG = grid.slice();
      for (const c of cells) grid[c] = 0;
      const seen = floodFrom(W, H, grid, Math.floor(L.start.x), Math.floor(L.start.z));
      if (rooms.some(r => !seen[Math.floor(r.z) * W + Math.floor(r.x)])) { grid.set(keepG); continue; }
      for (let k = 0; k < W * H; k++) if (grid[k] && !seen[k]) grid[k] = 0;
      V.houses.push({ x: hx, z: hz, w, d, yaw, h: wh, gable: RNG.chance(0.5), roof: RNG.int(0, 2), seed: RNG.int(1, 1e6), door: RNG.range(-0.12, 0.12) * w });
    }
    L.dWall.set(chamfer(W, H, grid, 0));
    L._sat = makeSAT(W, H, grid);
  }
  // Zone 0: the rest of the village edge around the start plaza (pure data, rendered in build)
  function buildVillageData(L, S, taken, addSolid, dW, clearOfPath) {
    const V = L.village;
    // flower beds in front of the houses (beside the door, in front of a window)
    for (const h of V.houses) {
      const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), ox = (h.door > 0 ? -1 : 1) * (h.w / 2 - 0.95), oz = h.d * 0.5 + 0.62;
      const bx = h.x + fx * oz + fz * ox, bz = h.z + fz * oz - fx * ox;
      V.beds.push({ x: bx, z: bz, yaw: h.yaw });
      taken.push({ x: bx, z: bz, r: 1.1 });
      for (const sd of [-1, 1]) addSolid(bx + fz * 0.45 * sd, bz - fx * 0.45 * sd, 0.46, 'bed');
    }
    // owl on a stump beside the plaza, a few steps from the start (east or west, whichever is free)
    let npc = null;
    const free = (x, z, r) => taken.every(q => hyp(q.x - x, q.z - z) >= q.r + r);
    for (let t = 0; t < 60 && !npc; t++) {   // east / west / north of the start only: the 1.5 m owl never stands on the camera side
      const sd = t & 1 ? -1 : 1, a = sd * RNG.range(0.75, 1.35), d = RNG.range(4.2, 5.6);
      const x = L.start.x + Math.sin(a) * d, z = L.start.z - Math.cos(a) * d;
      if (dW(x, z) >= 1.5 && dW(x, z) <= 4.5 && clearOfPath(x, z, 1.8, 2.5) && free(x, z, 1)) npc = { x, z };
    }
    if (!npc) npc = { x: S.x + 3, z: S.z - 1 };
    L.npc = npc; V.stump = npc;
    taken.push({ x: npc.x, z: npc.z, r: 2 });
    addSolid(npc.x, npc.z, 0.62, 'stump');
    // well in the northern half of the plaza, where its 2.4 m roof hides the least walkable floor behind it (it must never
    // cover Feza); if every spot would still hide some floor, it is built without the roof
    {
      let best = null;
      const ph = RNG.r() * 0.5;
      for (let wz = S.z - S.r; wz <= S.z + S.r; wz += 0.5) for (let wx = S.x - S.r; wx <= S.x + S.r; wx += 0.5) {   // every spot on a 0.5 m lattice
        const dx = wx - S.x, dz = wz - S.z;
        if (hyp(dx, dz) > S.r || dW(wx, wz) < 1.5 || hyp(wx - L.start.x, wz - L.start.z) < 3.2 || !free(wx, wz, 1.3) || !clearOfPath(wx, wz, 2.5, 3)) continue;
        const hid = hiddenBehind(L, wx, wz, 1.0, 2.5), k = hid + (dz > 0 ? 0.6 : 0) + hash2(wx * 2, wz * 2, L.seed) * 0.8 + ph;
        if (!best || k < best.k) best = { x: wx, z: wz, k, hid };
      }
      if (best) V.well = { x: best.x, z: best.z, low: best.hid > 1 };
    }
    if (V.well) { taken.push({ x: V.well.x, z: V.well.z, r: 1.8 }); addSolid(V.well.x, V.well.z, 1.0, 'well'); }
    // lamp posts near the plaza rim (east / south-west)
    for (const a0 of [1.25, -2.2, 2.35]) {
      for (let t = 0; t < 20; t++) {
        const a = a0 + RNG.range(-0.25, 0.25), d = S.r * (0.7 + t * 0.02);
        const x0 = S.x + Math.sin(a) * d, z0 = S.z - Math.cos(a) * d;
        if (dW(x0, z0) >= 1.1 && dW(x0, z0) <= 2.2 && clearOfPath(x0, z0, 1.8, 2.5) && taken.every(q => hyp(q.x - x0, q.z - z0) > q.r + 0.8)) {
          V.lamps.push({ x: x0, z: z0 }); taken.push({ x: x0, z: z0, r: 0.8 }); addSolid(x0, z0, 0.24, 'lamp'); break;
        }
      }
      if (V.lamps.length >= 2) break;
    }
    // fences along the southern rim of the plaza
    for (let a = 1.9; a < TAU - 1.9; a += 0.21) {
      let rr = S.r * 0.7;
      const dx = Math.sin(a), dz = -Math.cos(a);
      while (rr < S.r + 6 && L.grid[Math.floor(S.z + dz * rr) * L.W + Math.floor(S.x + dx * rr)]) rr += 0.25;
      rr += 0.55;
      V.fences.push({ x: S.x + dx * rr, z: S.z + dz * rr });
    }
    // sign post where the path leaves the plaza
    const p = L.path;
    for (let s = 1; s < p.length; s++) if (hyp(p[s].x - S.x, p[s].z - S.z) > S.r - 2.2) {
      const dx = p[s].x - p[s - 1].x, dz = p[s].z - p[s - 1].z, l = hyp(dx, dz) || 1;
      for (const sd of [1, -1]) {   // just off the floor edge beside the path, so it never blocks anyone
        let o = 1.5;
        while (o < 6 && L.grid[Math.floor(p[s].z + dx / l * o * sd) * L.W + Math.floor(p[s].x - dz / l * o * sd)]) o += 0.25;
        const sx = p[s].x - dz / l * (o + 0.45) * sd, sz = p[s].z + dx / l * (o + 0.45) * sd;
        if (o < 6 && sz < S.z + 2) { V.sign = { x: sx, z: sz, dir: Math.atan2(dx, dz) }; break; }
      }
      break;
    }
  }

  // ── Collision + pathing ──
  function isFloor(L, x, z) {
    const i = Math.floor(x), j = Math.floor(z);
    return i >= 0 && j >= 0 && i < L.W && j < L.H && L.grid[j * L.W + i] === 1;
  }
  function gridFree(L, x, z, r) {
    const W = L.W, H = L.H, g = L.grid, r2 = r * r;
    const i0 = Math.floor(x - r), i1 = Math.floor(x + r), j0 = Math.floor(z - r), j1 = Math.floor(z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i >= 0 && j >= 0 && i < W && j < H && g[j * W + i] === 1) continue;
      const cx = x < i ? i : x > i + 1 ? i + 1 : x, cz = z < j ? j : z > j + 1 ? j + 1 : z;
      if ((cx - x) * (cx - x) + (cz - z) * (cz - z) < r2) return false;
    }
    return true;
  }
  const SH_CS = 4;
  function solidHash(L) {
    const sol = L.solids || [];
    let h = L._sh;
    if (h && h.n === sol.length) return h;
    const nx = Math.ceil(L.W / SH_CS) + 1, nz = Math.ceil(L.H / SH_CS) + 1, cells = new Array(nx * nz);
    for (let k = 0; k < cells.length; k++) cells[k] = [];
    let maxR = 0;
    for (const s of sol) {
      maxR = Math.max(maxR, s.r);
      const ci = clamp(Math.floor(s.x / SH_CS), 0, nx - 1), cj = clamp(Math.floor(s.z / SH_CS), 0, nz - 1);
      cells[cj * nx + ci].push(s);
    }
    h = L._sh = { n: sol.length, nx, nz, cells, maxR };
    return h;
  }
  function solidFree(L, x, z, r) {
    if (!L.solids || !L.solids.length) return true;
    const h = solidHash(L), reach = r + h.maxR;
    const i0 = clamp(Math.floor((x - reach) / SH_CS), 0, h.nx - 1), i1 = clamp(Math.floor((x + reach) / SH_CS), 0, h.nx - 1);
    const j0 = clamp(Math.floor((z - reach) / SH_CS), 0, h.nz - 1), j1 = clamp(Math.floor((z + reach) / SH_CS), 0, h.nz - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const c = h.cells[j * h.nx + i];
      for (let k = 0; k < c.length; k++) {
        const s = c[k];
        if (!s.alive) continue;
        const rr = s.r + r, dx = s.x - x, dz = s.z - z;
        if (dx * dx + dz * dz < rr * rr) return false;
      }
    }
    return true;
  }
  function circleFree(L, x, z, r) { return !!L && gridFree(L, x, z, r) && solidFree(L, x, z, r); }
  // Deepest overlap of a circle with walls / solids → push-out normal, and whether it is round (a solid, which is walked
  // around at full speed) or a wall (face or corner: the step only slides along it; head-on the side-step takes over).
  const _ct = { nx: 0, nz: 0, round: false };
  function contact(L, x, z, r) {
    const W = L.W, H = L.H, g = L.grid, fl = (i, j) => i >= 0 && j >= 0 && i < W && j < H && g[j * W + i] === 1;
    let deep = 0, nx = 0, nz = 0, round = false;
    const i0 = Math.floor(x - r), i1 = Math.floor(x + r), j0 = Math.floor(z - r), j1 = Math.floor(z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (fl(i, j)) continue;
      const cx = x < i ? i : x > i + 1 ? i + 1 : x, cz = z < j ? j : z > j + 1 ? j + 1 : z;
      const ddx = x - cx, ddz = z - cz, d = Math.sqrt(ddx * ddx + ddz * ddz), pen = r - d;
      if (pen <= deep) continue;
      deep = pen; round = false;
      if (d > 1e-6) { nx = ddx / d; nz = ddz / d; } else { nx = x - i - 0.5; nz = z - j - 0.5; const l = hyp(nx, nz) || 1; nx /= l; nz /= l; }
    }
    if (L.solids && L.solids.length) {
      const h = solidHash(L), reach = r + h.maxR;
      const a0 = clamp(Math.floor((x - reach) / SH_CS), 0, h.nx - 1), a1 = clamp(Math.floor((x + reach) / SH_CS), 0, h.nx - 1);
      const b0 = clamp(Math.floor((z - reach) / SH_CS), 0, h.nz - 1), b1 = clamp(Math.floor((z + reach) / SH_CS), 0, h.nz - 1);
      for (let b = b0; b <= b1; b++) for (let a = a0; a <= a1; a++) for (const s of h.cells[b * h.nx + a]) {
        if (!s.alive) continue;
        const ddx = x - s.x, ddz = z - s.z, d = Math.sqrt(ddx * ddx + ddz * ddz), pen = s.r + r - d;
        if (pen <= deep) continue;
        deep = pen; round = true;
        if (d > 1e-6) { nx = ddx / d; nz = ddz / d; } else { nx = 0; nz = 1; }
      }
    }
    if (deep <= 0) return null;
    _ct.nx = nx; _ct.nz = nz; _ct.round = round;
    return _ct;
  }
  // Collision response. Full step if free; otherwise the free candidate with the most progress: the step slid along the
  // contact (round things are walked around at full speed, flat walls slide by the projected step), axis slides, rotated
  // tries. Head-on with no progress possible → side-step toward the nearest opening within ~1 m, so pillars, barrels, stumps
  // and wall corners never snag, while pushing straight into a long wall does not drift. If already overlapping something,
  // any move onto floor is allowed (so nothing stays stuck).
  const DEFL = [0.55, -0.55, 1.1, -1.1, 1.45, -1.45].map(a => [Math.cos(a), Math.sin(a), Math.abs(a) > 1.3 ? 1 : 0.85]);
  function move(L, p, dx, dz, r) {
    if (!L || !p || (!dx && !dz)) return p;
    r = r || 0.4;
    if (!circleFree(L, p.x, p.z, r)) {
      if (isFloor(L, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
      return p;
    }
    if (circleFree(L, p.x + dx, p.z + dz, r)) { p.x += dx; p.z += dz; return p; }
    const len = Math.sqrt(dx * dx + dz * dz), ux = dx / len, uz = dz / len;
    let bx = 0, bz = 0, bp = 0.12 * len;   // a candidate must make at least 12% of the step's progress (no crawling)
    const tryC = (ex, ez) => { const pr = ex * ux + ez * uz; if (pr > bp && circleFree(L, p.x + ex, p.z + ez, r)) { bp = pr; bx = ex; bz = ez; } };
    const c = contact(L, p.x + dx, p.z + dz, r);
    let tx = 0, tz = 0;
    if (c) {
      const dn = dx * c.nx + dz * c.nz, round = c.round;
      let sx = dx - c.nx * dn, sz = dz - c.nz * dn;
      const sl = Math.sqrt(sx * sx + sz * sz);
      tx = -c.nz; tz = c.nx;
      if (round && sl > 1e-6) { sx *= len / sl; sz *= len / sl; }
      tryC(sx, sz);
    }
    tryC(dx, 0); tryC(0, dz);
    if (!bx && !bz) for (const [cs, sn, k] of DEFL) tryC((dx * cs - dz * sn) * k, (dx * sn + dz * cs) * k);
    if (bx || bz) { p.x += bx; p.z += bz; return p; }
    if (!c) return p;
    const fw = Math.max(len, 0.15);
    let side = 0, bestK = 9;
    for (const sd of [1, -1]) {
      for (let k = 0.15; k <= 1.06 && k < bestK; k += 0.15) {
        const qx = p.x + tx * sd * k, qz = p.z + tz * sd * k;
        if (!circleFree(L, qx, qz, r)) break;
        if (circleFree(L, qx + ux * fw, qz + uz * fw, r)) { bestK = k; side = sd; break; }
      }
    }
    if (side) {
      const m = Math.min(len, bestK), ex = tx * side * m, ez = tz * side * m;
      if (circleFree(L, p.x + ex, p.z + ez, r)) { p.x += ex; p.z += ez; }
    }
    return p;
  }
  // Grid line of sight (exact cell traversal; solids don't block)
  function los(L, x0, z0, x1, z1) {
    if (!L) return true;
    let i = Math.floor(x0), j = Math.floor(z0);
    const ie = Math.floor(x1), je = Math.floor(z1), dx = x1 - x0, dz = z1 - z0;
    const si = dx > 0 ? 1 : -1, sj = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? i + 1 - x0 : x0 - i) * tdx : Infinity, tmz = dz !== 0 ? (dz > 0 ? j + 1 - z0 : z0 - j) * tdz : Infinity;
    const W = L.W, H = L.H, g = L.grid;
    const ok = (a, b) => a >= 0 && b >= 0 && a < W && b < H && g[b * W + a] === 1;
    if (!ok(i, j)) return false;
    for (let n = Math.abs(ie - i) + Math.abs(je - j); n > 0; n--) {
      if (tmx < tmz) { tmx += tdx; i += si; } else { tmz += tdz; j += sj; }
      if (!ok(i, j)) return false;
    }
    return true;
  }
  // Flow field toward the hero: Dial's algorithm, costs 2 (straight) / 3 (diagonal), capped at ~45 cells.
  const FLOW_MAX = 90;
  let flowB = null;
  function flowTo(L, x, z) {
    if (!L) return;
    const W = L.W, H = L.H, g = L.grid;
    const cell = Math.floor(z) * W + Math.floor(x), now = performance.now();
    if (L._flow && L._flowCell === cell && now - L._flowAt < 180) return;   // same cell, just rebuilt
    L._flowCell = cell; L._flowAt = now;
    const D = L._flow || (L._flow = new Int16Array(W * H));
    D.fill(-1);
    let si = Math.floor(x), sj = Math.floor(z);
    if (!isFloor(L, x, z)) {   // hero pushed onto a wall edge: start from the nearest floor cell
      let best = null, bd = 9;
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (isFloor(L, si + a + 0.5, sj + b + 0.5) && a * a + b * b < bd) { bd = a * a + b * b; best = [si + a, sj + b]; }
      if (!best) return;
      si = best[0]; sj = best[1];
    }
    // cells covered by solids (barrels, chests…) cost extra so chasers walk around them
    const blk = L._blk || (L._blk = new Uint8Array(W * H));
    blk.fill(0);
    if (L.solids) for (const s of L.solids) {
      if (!s.alive) continue;
      const rr = Math.max(0.6, s.r + 0.55);
      for (let j = Math.floor(s.z - rr); j <= s.z + rr; j++) for (let i = Math.floor(s.x - rr); i <= s.x + rr; i++)
        if (i >= 0 && j >= 0 && i < W && j < H && hyp(i + 0.5 - s.x, j + 0.5 - s.z) < rr) blk[j * W + i] = 1;
    }
    if (!flowB) { flowB = []; for (let k = 0; k <= FLOW_MAX + 9; k++) flowB.push([]); }
    for (const b of flowB) b.length = 0;
    const s0 = sj * W + si;
    D[s0] = 0; flowB[0].push(s0);
    for (let c = 0; c <= FLOW_MAX; c++) {
      const B = flowB[c];
      for (let q = 0; q < B.length; q++) {
        const k = B[q];
        if (D[k] !== c) continue;
        const i = k % W, j = (k / W) | 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
          if (!a && !b) continue;
          const ii = i + a, jj = j + b;
          if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
          const n = jj * W + ii;
          if (!g[n]) continue;
          if (a && b && (!g[j * W + ii] || !g[jj * W + i])) continue;
          const nc = c + (a && b ? 3 : 2) + (blk[n] ? 8 : 0);
          if (nc > FLOW_MAX + 6) continue;
          if (D[n] < 0 || D[n] > nc) { D[n] = nc; flowB[nc].push(n); }
        }
      }
    }
  }
  function flowDir(L, x, z) {
    const D = L && L._flow;
    if (!D) return null;
    const W = L.W, H = L.H, g = L.grid, i = Math.floor(x), j = Math.floor(z);
    if (i < 0 || j < 0 || i >= W || j >= H) return null;
    const c = D[j * W + i];
    if (c <= 0) return null;
    let gx = 0, gz = 0, best = c, bx = 0, bz = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      if (!a && !b) continue;
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const n = jj * W + ii, dn = D[n];
      if (dn < 0 || dn >= c || !g[n]) continue;
      if (a && b && (!g[j * W + ii] || !g[jj * W + i])) continue;
      const diag = a && b, w = (c - dn) / (diag ? 3 : 2), l = diag ? Math.SQRT2 : 1;
      gx += a / l * w; gz += b / l * w;
      if (dn < best) { best = dn; bx = a; bz = b; }
    }
    // blend the smooth gradient with a pull toward the best neighbour's centre (keeps agents off wall corners)
    const tx = i + bx + 0.5 - x, tz = j + bz + 0.5 - z, tl = hyp(tx, tz) || 1;
    const gl = hyp(gx, gz);
    if (gl < 1e-6 && !bx && !bz) return null;
    let ox = (gl > 1e-6 ? gx / gl : 0) + tx / tl * 0.6, oz = (gl > 1e-6 ? gz / gl : 0) + tz / tl * 0.6;
    const ol = hyp(ox, oz) || 1;
    return { x: ox / ol, z: oz / ol };
  }
  // a solid either leaves a gap wide enough for anyone to pass, or hugs the wall (no gap to get stuck in)
  const gapOKL = (L, x, z, r, g = 1.05) => gridFree(L, x, z, r + g) || !gridFree(L, x, z, r + 0.3);

  // Safety net: hero-radius reachability (0.42 m, 0.25 m grid, walls + solids) flooded from the start. If a room centre,
  // chest, checkpoint, the portal, the owl or the crystal cannot be reached, the removable solids (s.vis: decor props added at
  // build time, or breakables) on the border between the reached area and the cut-off pocket are taken out.
  const RF = 0.25, HERO_R = 0.42;
  function fixReach(L, removeFn, after) {
    const W = L.W, FW = Math.ceil(W / RF), FH = Math.ceil(L.H / RF), N = FW * FH;
    const st = new Uint8Array(N), q = new Int32Array(N);   // st: 0 unknown · 1 free · 2 blocked · +4 reached · +8 pocket
    const free = c => {
      if (!st[c]) { const x = (c % FW + 0.5) * RF, z = ((c / FW | 0) + 0.5) * RF; st[c] = L.grid[Math.floor(z) * W + Math.floor(x)] && circleFree(L, x, z, HERO_R) ? 1 : 2; }
      return (st[c] & 3) === 1;
    };
    const flood = (c0, bit, skip) => {
      let h = 0, t = 0; q[t++] = c0; st[c0] |= bit;
      while (h < t) {
        const c = q[h++], a = c % FW;
        for (const n of [a > 0 ? c - 1 : -1, a < FW - 1 ? c + 1 : -1, c >= FW ? c - FW : -1, c < N - FW ? c + FW : -1])
          if (n >= 0 && !(st[n] & (bit | skip)) && free(n)) { st[n] |= bit; q[t++] = n; }
      }
    };
    const near = (x, z, d, bit, want) => {   // a cell with (state & bit) within d of (x,z)
      for (let b = Math.max(0, Math.floor((z - d) / RF)); b <= Math.min(FH - 1, Math.floor((z + d) / RF)); b++)
        for (let a = Math.max(0, Math.floor((x - d) / RF)); a <= Math.min(FW - 1, Math.floor((x + d) / RF)); a++) {
          const c = b * FW + a;
          if (hyp((a + 0.5) * RF - x, (b + 0.5) * RF - z) >= d) continue;
          if (want ? want(c) : (st[c] & bit)) return c;
        }
      return -1;
    };
    const targets = L.rooms.map(r => [r.x, r.z, 3]);
    for (const c of L.chests) targets.push([c.x, c.z, c.big ? 1.7 : 1.35]);
    for (const c of L.checkpoints) targets.push([c.x, c.z, 1.85]);
    if (L.exit) targets.push([L.exit.x, L.exit.z, 1.3]);
    if (L.crystalSpot) targets.push([L.crystalSpot.x, L.crystalSpot.z, 1.9]);
    if (L.npc) targets.push([L.npc.x, L.npc.z, 3.5]);
    if (L.merchant) targets.push([L.merchant.x, L.merchant.z, 3.1]);
    let removed = 0;
    for (let it = 0; it < 4; it++) {
      st.fill(0);
      const s0 = Math.floor(L.start.z / RF) * FW + Math.floor(L.start.x / RF);
      if (!free(s0)) return removed;
      flood(s0, 4, 0);
      const bad = targets.find(t => near(t[0], t[1], t[2], 4) < 0);
      if (!bad) { if (after) after((x, z, d) => near(x, z, d, 4) >= 0, L); return removed; }
      const p0 = near(bad[0], bad[1], bad[2] + 1, 0, c => free(c) && !(st[c] & 4));
      if (p0 < 0) return removed;
      flood(p0, 8, 4);
      const cut = L.solids.filter(s => s.alive && (s.vis || s.tag === 'break') && near(s.x, s.z, s.r + HERO_R + 0.45, 8) >= 0 && near(s.x, s.z, s.r + HERO_R + 0.45, 4) >= 0);
      if (!cut.length) return removed;
      for (const s of cut) { L.solids.splice(L.solids.indexOf(s), 1); removeFn(L, s); removed++; }
      L._sh = null;
    }
    return removed;
  }
  function dropUnreachable(reached, L) {
    for (const b of L.breakables.slice()) if (!reached(b.x, b.z, 1.5)) { const i = L.solids.indexOf(b.solid); if (i >= 0) L.solids.splice(i, 1); unBreak(L, b.solid); L._sh = null; }
  }
  function unBreak(L, s) { const i = L.breakables.findIndex(b => b.solid === s); if (i >= 0) L.breakables.splice(i, 1); }
  function unProp(L, s) { if (s.vis && s.vis.length) { for (const r of s.vis) { const i = r.arr.indexOf(r.item); if (i >= 0) r.arr.splice(i, 1); } } else unBreak(L, s); }
  function randomFloorNear(L, x, z, rmin = 1, rmax = 3) {
    if (!L) return null;
    for (let k = 0; k < 48; k++) {
      const a = Math.random() * TAU, d = rmin + Math.random() * Math.max(0, rmax - rmin);
      const px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
      if (circleFree(L, px, pz, 0.45) && (k > 32 || los(L, x, z, px, pz))) return { x: px, z: pz };
    }
    return null;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  //  Visuals. Shared GPU resources (R) are created once and kept across levels (userData.keep).
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  const CHUNK = 16;
  const R = { ready: false, geo: {}, mat: {}, tex: {} };
  const keep = o => { o.userData.keep = true; return o; };
  const texOK = () => typeof TEX !== 'undefined' && !!TEX && !!TEX.grass && !!TEX.grass.map;
  let FLAT = null;
  const SURF_ALT = { townStone: 'cobble', townPath: 'cobble', plaza: 'cobble', rampart: 'brick' };   // Veba Şehri's surfaces, while a TEX without them is loaded
  function surf(name) {   // {map, normalMap} or neutral fallbacks when TEX is absent
    if (texOK() && TEX[name]) return TEX[name];
    if (texOK() && SURF_ALT[name] && TEX[SURF_ALT[name]]) return TEX[SURF_ALT[name]];
    if (!FLAT) {
      const w = new THREE.DataTexture(new Uint8Array([205, 205, 205, 255]), 1, 1); w.needsUpdate = true; w.colorSpace = THREE.SRGBColorSpace;
      const n = new THREE.DataTexture(new Uint8Array([128, 128, 255, 128]), 1, 1); n.needsUpdate = true;
      w.wrapS = w.wrapT = n.wrapS = n.wrapT = THREE.RepeatWrapping;
      FLAT = { map: w, normalMap: n };
    }
    return FLAT;
  }
  const tM = name => (texOK() && TEX.M && (TEX.M[name] || (!TEX[name] && TEX.M[SURF_ALT[name]]))) || 2;
  const lin = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e3 = new THREE.Euler(), _m = new THREE.Matrix4();
  const mat4 = (x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) =>
    new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromEuler(_e3.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));

  // ── GLSL shared by the level materials ──
  const GLSL_TRI = `
    vec3 lvW3(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z + 1e-5); }
    vec4 lvTri(sampler2D t, vec3 p, vec3 w, vec3 dx, vec3 dy) {
      vec4 c = vec4(0.0); float s = 0.0;
      if (w.x > 0.03) { c += w.x * textureGrad(t, p.zy, dx.zy, dy.zy); s += w.x; }
      if (w.y > 0.03) { c += w.y * textureGrad(t, p.xz, dx.xz, dy.xz); s += w.y; }
      if (w.z > 0.03) { c += w.z * textureGrad(t, p.xy, dx.xy, dy.xy); s += w.z; }
      return c / max(s, 1e-4);
    }
    vec3 lvTriN(sampler2D t, vec3 p, vec3 n, vec3 w, vec3 dx, vec3 dy, float k) {
      vec3 r = n * 1e-3;
      if (w.x > 0.03) { vec3 a = textureGrad(t, p.zy, dx.zy, dy.zy).xyz * 2.0 - 1.0; a.xy *= k; a = vec3(a.xy + n.zy, abs(a.z) * n.x); r += w.x * a.zyx; }
      if (w.y > 0.03) { vec3 b = textureGrad(t, p.xz, dx.xz, dy.xz).xyz * 2.0 - 1.0; b.xy *= k; b = vec3(b.xy + n.xz, abs(b.z) * n.y); r += w.y * b.xzy; }
      if (w.z > 0.03) { vec3 c = textureGrad(t, p.xy, dx.xy, dy.xy).xyz * 2.0 - 1.0; c.xy *= k; c = vec3(c.xy + n.xy, abs(c.z) * n.z); r += w.z * c; }
      return normalize(r);
    }`;
  const VS_WORLD = `
    vec4 lvWp = vec4(position, 1.0); vec3 lvNo = objectNormal;
    #ifdef USE_INSTANCING
      lvWp = instanceMatrix * lvWp; lvNo = mat3(instanceMatrix) * lvNo;
    #endif
    lvWp = modelMatrix * lvWp; vLvW = lvWp.xyz; vLvN = normalize(mat3(modelMatrix) * lvNo);`;
  const VS_WORLD_P = `
    vec4 lvWp = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      lvWp = instanceMatrix * lvWp;
    #endif
    lvWp = modelMatrix * lvWp; vLvW = lvWp.xyz;`;
  const GLSL_NOISE = `
    float lvH21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float lvVN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(lvH21(i), lvH21(i + vec2(1.0, 0.0)), f.x), mix(lvH21(i + vec2(0.0, 1.0)), lvH21(i + vec2(1.0, 1.0)), f.x), f.y); }`;

  // Inject GLSL into a built-in material (like core patchMat, plus colour/normal/AO chunk replacement).
  function lvShade(mat, o) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (o.uniforms) Object.assign(sh.uniforms, o.uniforms);
      let v = sh.vertexShader, f = sh.fragmentShader;
      if (o.vDecl) v = v.replace('#include <common>', '#include <common>\n' + o.vDecl);
      if (o.vColor) v = v.replace('#include <color_vertex>', o.vColor);
      if (o.vBegin) v = v.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + o.vBegin);
      if (o.fDecl) f = f.replace('#include <common>', '#include <common>\n' + o.fDecl);
      if (o.fMap !== undefined) f = f.replace('#include <map_fragment>', o.fMap);
      if (o.fNormal !== undefined) f = f.replace('#include <normal_fragment_maps>', o.fNormal);
      if (o.fAO !== undefined) f = f.replace('#include <aomap_fragment>', o.fAO);
      if (o.fOut) f = f.replace('#include <opaque_fragment>', o.fOut + '\n#include <opaque_fragment>');
      sh.vertexShader = v; sh.fragmentShader = f;
      if (prev) prev.call(mat, sh, r);
    };
    mat.userData.pkey = 'lv-' + o.key;
    mat.customProgramCacheKey = () => mat.userData.pkey;
    return mat;
  }

  // ── Geometry helpers ──
  function weldNormals(g) {   // smooth normals across seams/duplicated vertices (by position)
    const P = g.attributes.position, n = P.count, ids = new Int32Array(n), map = new Map();
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      const k = Math.round(P.getX(i) * 1e4) + '_' + Math.round(P.getY(i) * 1e4) + '_' + Math.round(P.getZ(i) * 1e4);
      let id = map.get(k); if (id === undefined) { id = cnt++; map.set(k, id); } ids[i] = id;
    }
    const acc = new Float32Array(cnt * 3), I = g.index ? g.index.array : null, tn = I ? I.length : n;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < tn; t += 3) {
      const i0 = I ? I[t] : t, i1 = I ? I[t + 1] : t + 1, i2 = I ? I[t + 2] : t + 2;
      a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1).sub(a); c.fromBufferAttribute(P, i2).sub(a);
      b.cross(c);
      for (const i of [i0, i1, i2]) { const o = ids[i] * 3; acc[o] += b.x; acc[o + 1] += b.y; acc[o + 2] += b.z; }
    }
    const N = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const o = ids[i] * 3, l = Math.hypot(acc[o], acc[o + 1], acc[o + 2]) || 1;
      N[i * 3] = acc[o] / l; N[i * 3 + 1] = acc[o + 1] / l; N[i * 3 + 2] = acc[o + 2] / l;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    return g;
  }
  function markUV(g, u) {   // uv.x > 5 marks parts for the shaders (leaves 10, plain colour 20, sway 30…)
    const n = g.attributes.position.count, uv = new Float32Array(n * 2).fill(u);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return g;
  }
  function marked(geo, u) {
    const key = 'mk' + geo.uuid + '_' + u;
    return R.geo[key] || (R.geo[key] = keep(markUV(geo.clone(), u)));
  }
  // Lumpy sphere (foliage blobs, boulders): sum of a few directional sines, smooth normals
  function lumpy(detail, amp, seed, o = {}) {
    const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position, rnd = mulberry32(seed), dirs = [], crg = [];
    for (let k = 0; k < 6; k++) dirs.push([new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), 1.6 + rnd() * 2.6, rnd() * TAU]);
    for (let k = 0; k < 4; k++) crg.push([new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), 2.5 + rnd() * 3, rnd() * TAU]);
    const v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      let d = 0; for (const [dir, f, ph] of dirs) d += Math.sin(v.dot(dir) * f + ph);
      if (o.crag) for (const [dir, f, ph] of crg) d += o.crag * (Math.abs(Math.sin(v.dot(dir) * f + ph)) - 0.6);
      v.multiplyScalar(1 + amp * d / 3);
      if (o.flat !== undefined && v.y < o.flat) v.y = o.flat + (v.y - o.flat) * 0.2;
      P.setXYZ(i, v.x, v.y, v.z);
    }
    weldNormals(g);
    markUV(g, o.uv ?? 0);
    return keep(g);
  }
  // Tiered, droopy cone for fir trees / stalagmites
  function lumpyCone(seed, seg = 16, droop = 0.12, uvm = 10) {
    const g = new THREE.ConeGeometry(1, 1, seg, 4, false), P = g.attributes.position, rnd = mulberry32(seed), ph = rnd() * TAU;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
      if (r < 1e-4) continue;
      const k = 1 + 0.13 * Math.sin(a * 7 + ph) * (0.5 - y) + 0.06 * Math.sin(a * 13 + ph * 2);
      P.setXYZ(i, x * k, y - (y < -0.45 ? droop * (0.6 + 0.4 * Math.sin(a * 7 + ph)) : 0), z * k);
    }
    weldNormals(g);
    markUV(g, uvm);
    return keep(g);
  }
  function boxUV(sx, sy, sz, m) {   // box whose UVs are in metres/m (textures keep their real size)
    const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv;
    const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m); }
    return g;
  }
  // Fast merge of prototype geometries with per-item matrix + tint (static decor chunks, village)
  function mergeList(list) {
    let nv = 0, ni = 0;
    for (const it of list) { const P = it.geo.attributes.position; nv += P.count; ni += it.geo.index ? it.geo.index.count : P.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), nm = new THREE.Matrix3();
    let vo = 0, io = 0;
    for (const it of list) {
      const g = it.geo, P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color ? g.attributes.color.array : null, U = g.attributes.uv ? g.attributes.uv.array : null;
      const e = it.m.elements, n = g.attributes.position.count, tr = it.c ? it.c.r : 1, tg = it.c ? it.c.g : 1, tb = it.c ? it.c.b : 1;
      nm.getNormalMatrix(it.m); const q = nm.elements;
      for (let i = 0; i < n; i++) {
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2], o = (vo + i) * 3;
        pos[o] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        const a = N[i * 3], b = N[i * 3 + 1], c = N[i * 3 + 2];
        let nx = q[0] * a + q[3] * b + q[6] * c, ny = q[1] * a + q[4] * b + q[7] * c, nz = q[2] * a + q[5] * b + q[8] * c;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
        col[o] = (C ? C[i * 3] : 1) * tr; col[o + 1] = (C ? C[i * 3 + 1] : 1) * tg; col[o + 2] = (C ? C[i * 3 + 2] : 1) * tb;
        if (U) { uv[(vo + i) * 2] = U[i * 2]; uv[(vo + i) * 2 + 1] = it.uy !== undefined ? it.uy : U[i * 2 + 1]; }
      }
      if (g.index) { const I = g.index.array; for (let k = 0; k < I.length; k++) idx[io + k] = I[k] + vo; io += I.length; }
      else { for (let k = 0; k < n; k++) idx[io + k] = vo + k; io += n; }
      vo += n;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }

  // ── Materials ──
  function makeFoliageMat() {   // bark (uv<5) + leaves (uv 10, instance-tinted) + plain colour (uv 20); wind sway
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
    const bark = surf('bark'), leaf = surf('leaves');
    lvShade(m, {
      key: 'foliage',
      uniforms: { uTime: TIME.u, tBark: { value: bark.map }, tBarkN: { value: bark.normalMap }, tLeaf: { value: leaf.map }, tLeafN: { value: leaf.normalMap },
        uSc: { value: new THREE.Vector2(1 / tM('bark'), 1.25 / tM('leaves')) }, uTrans: { value: new THREE.Color(0.5, 0.58, 0.3) } },
      vDecl: 'uniform float uTime; varying vec3 vLvW; varying vec3 vLvN; varying float vLvK;',
      vColor: `vColor = vec3(1.0);
        #ifdef USE_COLOR
          vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
          if (uv.x > 5.0 && uv.x < 15.0) vColor *= instanceColor.xyz;
        #endif`,
      vBegin: VS_WORLD + `
        vLvK = uv.x > 15.0 ? 2.0 : uv.x > 5.0 ? 1.0 : 0.0;
        vec3 lvIp = vec3(0.0);
        #ifdef USE_INSTANCING
          lvIp = instanceMatrix[3].xyz;
        #endif
        float lvPh = lvIp.x * 0.37 + lvIp.z * 0.23;
        float lvHt = max(0.0, position.y - 0.4);
        float lvSw = lvHt * lvHt * 0.0075;
        transformed.x += (sin(uTime * 1.2 + lvPh) + 0.45 * sin(uTime * 2.3 + lvPh * 1.7)) * lvSw;
        transformed.z += cos(uTime * 1.0 + lvPh * 1.3) * lvSw * 0.6;
        if (vLvK > 0.5 && vLvK < 1.5) transformed += objectNormal * sin(uTime * 3.5 + dot(position, vec3(5.0, 7.0, 3.0))) * 0.02;`,
      fDecl: GLSL_TRI + 'uniform sampler2D tBark, tBarkN, tLeaf, tLeafN; uniform vec2 uSc; uniform vec3 uTrans; varying vec3 vLvW; varying vec3 vLvN; varying float vLvK;',
      fMap: `vec3 lvN0 = normalize(vLvN); vec3 lvWt = lvW3(lvN0);
        vec3 lvP = vLvW * (vLvK < 0.5 ? uSc.x : uSc.y); vec3 lvDx = dFdx(lvP), lvDy = dFdy(lvP);
        if (vLvK < 0.5) diffuseColor *= lvTri(tBark, lvP, lvWt, lvDx, lvDy);
        else if (vLvK < 1.5) diffuseColor *= lvTri(tLeaf, lvP, lvWt, lvDx, lvDy);`,
      fNormal: `if (vLvK < 1.5) {
          vec3 lvTn = vLvK < 0.5 ? lvTriN(tBarkN, lvP, lvN0, lvWt, lvDx, lvDy, 1.0) : lvTriN(tLeafN, lvP, lvN0, lvWt, lvDx, lvDy, 1.1);
          normal = normalize((viewMatrix * vec4(lvTn, 0.0)).xyz);
        }`,
      fOut: `if (vLvK > 0.5 && vLvK < 1.5) outgoingLight += diffuseColor.rgb * uTrans * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.0);`,
    });
    return keep(m);
  }
  // Triplanar textured stone (boulders, bricks, pillars, arches) with optional moss on top and darker bases
  function makeTriMat(texName, o = {}) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.85, metalness: 0 });
    const t = surf(texName), moss = surf('moss');
    const U = { tT: { value: t.map }, tTn: { value: t.normalMap }, tMoss: { value: moss.map }, uS: { value: 1 / (o.m || tM(texName)) },
      uMoss: { value: new THREE.Vector4(1, 1, 1, 0) }, uAO: { value: new THREE.Vector2(o.aoH ?? 0.9, o.ao ?? 0.5) }, uNK: { value: o.nk ?? 1 },
      uRim: { value: new THREE.Vector4(1, 1, 1, 0) } };
    m.userData.u = U;
    lvShade(m, {
      key: 'tri-' + (o.key || texName),
      uniforms: U,
      vDecl: 'varying vec3 vLvW; varying vec3 vLvN;',
      vBegin: VS_WORLD,
      fDecl: GLSL_TRI + 'uniform sampler2D tT, tTn, tMoss; uniform float uS, uNK; uniform vec4 uMoss, uRim; uniform vec2 uAO; varying vec3 vLvW; varying vec3 vLvN;',
      fMap: `vec3 lvN0 = normalize(vLvN); vec3 lvWt = lvW3(lvN0); vec3 lvP = vLvW * uS; vec3 lvDx = dFdx(lvP), lvDy = dFdy(lvP);
        vec4 lvT = lvTri(tT, lvP, lvWt, lvDx, lvDy); diffuseColor *= lvT;
        vec2 lvMp = vLvW.xz * 0.5; vec2 lvMdx = dFdx(lvMp), lvMdy = dFdy(lvMp);`,
      fNormal: `vec3 lvTn = lvTriN(tTn, lvP, lvN0, lvWt, lvDx, lvDy, uNK);
        float lvMs = uMoss.w * smoothstep(0.5, 0.85, lvTn.y + (lvT.g - 0.5) * 0.7);
        if (lvMs > 0.002) { vec3 mc = textureGrad(tMoss, lvMp, lvMdx, lvMdy).rgb * uMoss.rgb; diffuseColor.rgb = mix(diffuseColor.rgb, mc, lvMs); roughnessFactor = mix(roughnessFactor, 0.95, lvMs); }
        diffuseColor.rgb *= mix(uAO.y, 1.0, smoothstep(0.0, uAO.x, vLvW.y));
        normal = normalize((viewMatrix * vec4(lvTn, 0.0)).xyz);`,
      fOut: 'outgoingLight += uRim.rgb * uRim.a * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);',
    });
    return keep(m);
  }
  // Wood (TEX.wood via uv) + plain metal parts (uv.x > 5): chests, barrels, crates, fences, houses' timber
  function makePropMat() {
    const w = surf('wood');
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: w.map, normalMap: w.normalMap, roughness: 0.7, metalness: 0 });
    lvShade(m, {
      key: 'prop',
      vDecl: 'varying float vLvMt;',
      vBegin: 'vLvMt = step(5.0, uv.x);',
      fDecl: 'varying float vLvMt;',
      fMap: `vec4 sampledDiffuseColor = texture2D(map, vMapUv);
        if (vLvMt > 0.5) sampledDiffuseColor = vec4(1.0);
        diffuseColor *= sampledDiffuseColor;`,
      fNormal: `if (vLvMt < 0.5) {
          vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale; normal = normalize(tbn * mapN);
        } else { metalnessFactor = 0.85; roughnessFactor = 0.32; }`,
    });
    return keep(m);
  }
  function makeDecorMat(shiny) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shiny ? 0.38 : 0.66, metalness: shiny ? 0.15 : 0 });
    lvShade(m, {
      key: shiny ? 'decorS' : 'decor',
      uniforms: { uTime: TIME.u },
      vDecl: 'uniform float uTime;',
      vBegin: `if (uv.x > 45.0) { float lvB = uv.y;   // bobbing on the milk (Çürüme Vadisi's cereal rings): each item has its phase in uv.y
        transformed.y += sin(uTime * 1.5 + lvB) * 0.025; transformed.xz += vec2(sin(uTime * 0.55 + lvB * 1.7), cos(uTime * 0.47 + lvB * 2.3)) * 0.06; }
        else if (uv.x > 35.0) { float lvF = uv.y, lvP = position.x * 1.7 + position.z * 1.3;   // flags fluttering (Veba Şehri's bunting and pennants): uv.y = how far from the string / pole
        transformed.x += sin(uTime * 3.4 + lvP + lvF * 2.0) * 0.06 * lvF; transformed.z += cos(uTime * 2.9 + lvP * 0.8 + lvF * 2.5) * 0.08 * lvF; transformed.y += sin(uTime * 4.1 + lvP) * 0.03 * lvF; }
        else if (uv.x > 25.0) { float lvS = max(0.0, position.y) * 0.09;
        transformed.x += sin(uTime * 2.1 + position.x * 0.9 + position.z * 0.7) * lvS; transformed.z += cos(uTime * 1.7 + position.x * 0.6) * lvS * 0.6; }`,
    });
    rimify(m, 0xffffff, shiny ? 0.16 : 0.1, 2.6);
    return keep(m);
  }
  function makeGlowMat(k = 2.2) {   // unlit HDR vertex colours with a slow shimmer
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(k, k, k) });
    lvShade(m, {
      key: 'glow',
      uniforms: { uTime: TIME.u },
      vDecl: 'varying vec3 vLvW;', vBegin: VS_WORLD_P,
      fDecl: 'uniform float uTime; varying vec3 vLvW;',
      fOut: 'outgoingLight *= 0.78 + 0.22 * sin(uTime * 1.6 + vLvW.x * 0.9 + vLvW.z * 0.7 + vLvW.y * 2.0);',
    });
    return keep(m);
  }
  function ensureRes() {
    if (R.ready && R.texOK === texOK()) return;
    R.ready = true; R.texOK = texOK();
    R.heroU = R.heroU || { value: new THREE.Vector3(0, 0, -999) };
    R.ptOn = R.ptOn || { value: new Float32Array(16).fill(1) };
    R.ptScale = R.ptScale || { value: 400 };
    R.portalOn = R.portalOn || { value: 1 };
    R.cpPool = [];
    const M = R.mat;
    M.foliage = makeFoliageMat();
    M.rock = makeTriMat('rock', { aoH: 1.2, ao: 0.45, nk: 1.7, m: 2.2 });
    M.brick = makeTriMat('brick', { aoH: 1.4, ao: 0.42, key: 'brick' });
    M.stone = makeTriMat('rock', { aoH: 0.6, ao: 0.6, key: 'stone', m: 1.6 });
    M.soil = makeTriMat('caveSand', { aoH: 0.3, ao: 0.5, key: 'rock', m: 1.2, rough: 0.95 });   // molehills: the cave path's sand (same shader as the rocks)
    M.prop = makePropMat();
    M.decor = makeDecorMat(false);
    M.shiny = makeDecorMat(true);
    M.glow = makeGlowMat(2.2);
    M.gold = keep(stdMat({ color: 0xffc94a, metalness: 0.95, roughness: 0.28 }));
    M.plaster = keep(stdMat({ map: surf('plaster').map, normalMap: surf('plaster').normalMap, roughness: 0.9, vertexColors: true }));
    M.roof = keep(stdMat({ map: surf('roof').map, normalMap: surf('roof').normalMap, roughness: 0.6, vertexColors: true }));
    M.window = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.35, 0.6), vertexColors: true }));
    M.pillar = makePillarMat();
    M.roofC = M.brick;   // castle battlement roof: same bricks, own merge key (no shadow casting)
    M.coin = keep(stdMat({ color: 0xffffff, vertexColors: true, metalness: 0.8, roughness: 0.4 }));
    M.food = makeDecorMat(true); M.food.roughness = 0.55; M.food.metalness = 0;   // Çürüme Vadisi's cheese, biscuits, berries (casts shadows)
    M.gloss = M.shiny;   // the same glossy decor material under its own merge key: tiny walk-over things (no shadows, not drawn far away)
    M.copper = keep(rimify(stdMat({ color: 0xffffff, vertexColors: true, metalness: 0.92, roughness: 0.24 }), 0xffe8d0, 0.22, 2.4));   // polished copper güğüms
    // glossy strained yogurt (hills, bowls): a soft normal and a big tile, so the hills read as smooth glossy mousse (nk 0.6 / 3.6 m printed the
    // spatula lips as wrinkles), with a creamy sheen on the rim (only Çürüme Vadisi uses it)
    M.yog = makeTriMat('yogurt', { key: 'rock', rough: 0.24, m: 6, aoH: 0.35, ao: 0.8, nk: 0.25 });
    M.yog.userData.u.uRim.value.set(1, 0.98, 0.96, 0.3);
    // Veba Şehri: sandstone rampart blocks (city walls, towers, quays, plinths; triplanar, the rocks' program), roof tiles tinted per house
    M.ramp = makeTriMat('rampart', { key: 'rock', aoH: 0.9, ao: 0.8, rough: 0.9, nk: 1.1 });
    M.roofN = keep(stdMat({ map: neutralRoof(), normalMap: surf('roof').normalMap, roughness: 0.62, vertexColors: true }));
    M.rockN = M.rock; M.roofNC = M.roofN;   // (the same materials under their own merge keys: far decor that casts no shadow, like roofC)
  }

  // ── Floor: one plane, splat of 3 textures by a baked mask (R path, G wall AO, B plaza/rug, A outside) ──
  const MPX = 4;   // mask pixels per metre
  function boxBlur(src, W, H, r) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H), k = 1 / (2 * r + 1);
    for (let y = 0; y < H; y++) {
      const o = y * W; let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[o + clamp(x, 0, W - 1)];
      for (let x = 0; x < W; x++) { tmp[o + x] = acc * k; acc += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)]; }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) { out[y * W + x] = acc * k; acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; }
    }
    return out;
  }
  const LIQ_TEX = [null, 'lava', 'milk'];   // FLOOR[theme].lava → the liquid's TEX surface
  const FLOOR = {
    forest: { a: 'grass', b: 'dirt', c: 'cobble', tA: 0xdce6c8, tB: 0xf2e6da, tC: 0xf6ecdc, rough: [0.92, 0.96, 0.82], crispB: 0, crispC: 0, ao: 0.62, border: 0, out: 0x1e3a18, outAmt: 0.45, anti: 1, macro: 0xffe890 },
    cave: { a: 'caveFloor', b: 'caveSand', c: 'moss', lumC: 1.05, cScale: 1.6, tA: 0xe2dfd6, tB: 0xe2d8c8, tC: 0x89866f, rough: [0.55, 0.95, 0.9], crispB: 0, crispC: 0, ao: 0.75, border: 0, out: 0x04050a, outAmt: 0.92, anti: 1, macro: 0xd8d3c5, speck: [0xb59871, 2.6] },
    castle: { a: 'castleFloor', b: 'carpet', c: 'carpet', lumC: 1.5, tA: 0xcac4ba, tB: 0xc5b9bb, tC: 0xa3929d, tA2: 0xc5b395, tC2: 0x825561, rough: [0.3, 0.95, 0.95], crispB: 1, crispC: 1, ao: 0.62, border: 1, out: 0x302822, outAmt: 1, anti: 0, macro: 0xffffff },
    // basalt slabs, an ash path, paved bridges / checkpoint discs; the lava itself is drawn by the same floor shader (uLava)
    volcano: { a: 'basalt', b: 'ash', c: 'cobble', lumC: 1.1, tA: 0xf2f0f2, tB: 0xfff6ee, tC: 0xb8a498, rough: [0.8, 0.96, 0.82], crispB: 0, crispC: 0, ao: 0.62, border: 0, out: 0x5a3a2c, outAmt: 0.58, anti: 0, macro: 0xfff0e4, lava: 1 },   // out: warm mid-brown (bright volcano, no black holes)
    // Çürüme Vadisi: strained-yogurt ground, a biscuit-crumb trail, cheese-slab plazas; milk / kefir drawn by the same shader (lava: 2)
    // (tA × tAk: a clean, bright yogurt white — a butter tint on the already creamy texture read as tan wet sand, darker than the milk
    // (tAk 1.1 with the near-white TEX 'yogurt'; it was 1.2 for the older, creamier one);
    // tC × tCk: a cool lift so the cheese stays butter-yellow under the warm sun instead of orange; ao: the soft band inside the walkable edge)
    dairy: { a: 'yogurt', b: 'biscuit', c: 'cheese', tA: 0xddd7b3, tAk: 1.1, tB: 0xe7ddc4, tC: 0xd2d2b8, tCk: 1.18, rough: [0.46, 0.9, 0.56], crispB: 0, crispC: 0, ao: 0.38, border: 0, out: 0x6e7354, outAmt: 0.42, anti: 1, macro: 0xfff0ea, lava: 2 },
    // Veba Şehri: honey cobbled streets (the main street in big pale flagstones, TEX 'townPath' tinted tA2, where tGlow.a is 0: see
    // buildGlowTex and the shader's uLava.x = -1 branch), soft green gardens on the
    // ground beside them (B: the streets end at a crisp sandstone kerb line — the trim), patterned pavers in the squares with a light
    // stone curb; out = a slightly deeper green for the meadow beyond the city walls (the canals are no floor: the floor mesh stops at
    // the quays and the water lies 0.8 m lower, see townFloorGeo). (anti 0: the cobbles run in rows, a turned sample would cross them)
    town: { a: 'townStone', b: 'grass', c: 'plaza', street: 'townPath', tA: 0xf2e4d2, tA2: 0xfff6ec, tB: 0xe2f2c0, tBk: 1.06, tC: 0xfffaf4, rough: [0.8, 0.94, 0.66], crispB: 1, crispC: 1, ao: 0.28, border: 0,
      out: 0x77745b, outAmt: 0.3, anti: 0, macro: 0xffe6c8, trim: 0xf2dcbc, trimM: 0 },
  };
  // ── Volcano ground: which non-walkable ground is lava (at the floor mask's 4 px/m) ──
  // Lava fills most of the ground next to the floor — always on the camera side, where it is flat and hides nothing — and the rest
  // is basalt ground with rocks (more of it far away and behind the rooms). The shore keeps 0.26–0.94 m outside the walkable cells,
  // so Feza never looks like he stands in it. The boss arena is ringed by a lava moat with basalt cliffs behind it (north). Where a
  // corridor runs with lava on both sides it becomes a paved stone bridge (L._volc.bridges; deck in the floor mask, parapets in build).
  function volcanoField(L) {
    const P = MPX, W = L.W, H = L.H, MW = W * P, MH = H * P, n = MW * MH, grid = L.grid, seed = (L.seed & 0xffff) + 31;
    const fl = new Uint8Array(n);
    for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * W, o = py * MW; for (let px = 0; px < MW; px++) fl[o + px] = grid[row + ((px / P) | 0)]; }
    const D = chamfer(MW, MH, fl, 1);   // mask pixels to the nearest floor pixel
    const up = new Float32Array(W * H), dn = new Float32Array(W * H);   // metres to floor straight north (camera side) / south (behind a room)
    for (let i = 0; i < W; i++) {
      let lf = -99; for (let j = 0; j < H; j++) { if (grid[j * W + i]) lf = j; up[j * W + i] = j - lf; }
      lf = 1e9; for (let j = H - 1; j >= 0; j--) { if (grid[j * W + i]) lf = j; dn[j * W + i] = lf - j; }
    }
    const ar = L.rooms.find(r => r.kind === 'boss' && !r.hw);
    let dA = null;
    if (ar) { const src = new Uint8Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) src[j * W + i] = grid[j * W + i] && inRoom(ar, i + 0.5, j + 0.5, -1.5) ? 1 : 0; dA = chamfer(W, H, src, 1); }
    // The per-cell fields are sampled bilinearly (and up/dn through a gentle noise warp), then the rock factor is blurred ~0.75 m, so
    // the lava / basalt borders curve naturally instead of following the 1 m cell lines (straight strips, right-angled pockets).
    const Uc = new Float32Array(W * H), Dc = new Float32Array(W * H), Ac = dA ? new Float32Array(W * H) : null;
    for (let c = 0; c < W * H; c++) {   // camera side reaches round a floor edge sideways too, fading with the sideways distance
      const i = c % W;
      let u = Math.min(20, up[c]);
      for (let di = 1; di <= 4; di++) { if (i - di >= 0) u = Math.min(u, up[c - di] + 1.6 * di); if (i + di < W) u = Math.min(u, up[c + di] + 1.6 * di); }
      Uc[c] = u;
      Dc[c] = Math.min(20, dn[c]);
      if (Ac) Ac[c] = Math.min(30, dA[c]);
    }
    const bil = (F, x, z) => {
      const fx = clamp(x - 0.5, 0, W - 1.001), fz = clamp(z - 0.5, 0, H - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * W + i;
      return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + W] * (1 - tx) + F[k + W + 1] * tx) * tz;
    };
    const rkF = new Float32Array(n), nfF = new Float32Array(n);
    for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
      const k = py * MW + px;
      if (fl[k]) continue;
      const x = (px + 0.5) / P, z = (py + 0.5) / P, d = D[k] / P;
      let rk = vnoise(x / 7.5, z / 7.5, seed + 1) * 0.75 + vnoise(x / 2.6, z / 2.6, seed + 2) * 0.22 + Math.max(0, d - 4) * 0.13 - 0.04;
      const wa = 1.1 * smooth01((d - 0.4) / 1.6), wx = x + vnoise(x / 2.3, z / 2.3, seed + 5) * wa, wz = z + vnoise(x / 2.3, z / 2.3, seed + 6) * wa;   // no warp at the shore (floor cells read as u = dn = 0)
      const u = bil(Uc, wx, wz), cam = 1 - smooth01((u - 6.25) / 1.5);
      rk -= 0.5 * Math.max(0, 1 - u / 9) * cam;                                          // camera side: lava
      rk += 0.3 * (1 - cam) * (1 - smooth01((bil(Dc, wx, wz) - 5.75) / 1.5));            // behind a room: rocky shore, cliffs
      if (Ac) {   // moat · cliffs north of the arena
        const a = bil(Ac, x, z), cl = (1 - smooth01((a - 9.5) / 1.0)) * smooth01((ar.z - 3 - z) / 2 + 0.5), moat = 1 - smooth01((a - 4.7) / 1.0);
        rk += Math.max(0, 0.6 - rk) * cl;
        rk = rk * (1 - moat) - moat;
      }
      rkF[k] = rk; nfF[k] = 1;
    }
    const rkB = boxBlur(rkF, MW, MH, 3), nfB = boxBlur(nfF, MW, MH, 3);   // normalised: walkable floor pixels don't pull the average
    const raw = new Float32Array(n);
    for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
      const k = py * MW + px;
      if (fl[k]) continue;
      const x = (px + 0.5) / P, z = (py + 0.5) / P, d = D[k] / P;
      const off = 0.6 + 0.22 * vnoise(x / 2.6, z / 2.6, seed) + 0.12 * vnoise(x / 1.1, z / 1.1, seed + 7);   // a wavy shore, 0.26–0.94 m off the walkable cells
      const rock = smooth01((rkB[k] / Math.max(1e-3, nfB[k]) - 0.14) / 0.16 + 0.5);
      raw[k] = smooth01((d - off) / 0.22 + 0.5) * (1 - rock);
    }
    const lava = boxBlur(raw, MW, MH, 1);
    for (let k = 0; k < n; k++) if (fl[k]) lava[k] = 0;   // never on walkable floor, even blurred
    const V = L._volc = { lava, MW, MH, P, dA, arena: ar || null, bridges: [] };
    liquidBridges(L, V);
    return V;
  }
  // Bridges: corridor stretches (outside both rooms) with the liquid (lava / milk, V.lava at 4 px/m) close on both sides
  // (far: liquid anywhere from 1.1 m to that far past the edge counts — Veba Şehri's water keeps a wider shore off a narrow street)
  function liquidBridges(L, V, far = 1.1) {
    const { lava, MW, MH, P } = V;
    const lavaAt = (x, z) => lava[clamp(Math.floor(z * P), 0, MH - 1) * MW + clamp(Math.floor(x * P), 0, MW - 1)];
    const wetOut = (x, z, nx, nz, e) => { for (let d = e + 1.1; d <= e + far + 1e-6; d += 0.3) if (lavaAt(x + nx * d, z + nz * d) > 0.5) return true; return false; };
    const edge = (x, z, nx, nz) => { for (let d = 0; d < 4.5; d += 0.1) if (!isFloor(L, x + nx * d, z + nz * d)) return d; return 9; };
    for (const l of L.links) {
      const c = l.curve;
      if (!c) continue;
      const A = L.rooms[l.a], B = L.rooms[l.b];
      let run = null, gap = 0;
      const flush = () => { if (run && run.pts.length >= 4) V.bridges.push(run); run = null; gap = 0; };
      for (let s = 0; s < c.length; s += 2) {
        const x = c[s][0], z = c[s][1], a = c[Math.max(0, s - 2)], b = c[Math.min(c.length - 1, s + 2)];
        const dx = b[0] - a[0], dz = b[1] - a[1], ll = hyp(dx, dz) || 1, nx = -dz / ll, nz = dx / ll;
        let ok = !inRoom(A, x, z, -0.8) && !inRoom(B, x, z, -0.8) && isFloor(L, x, z), e1 = 0, e2 = 0;
        if (ok) {
          e1 = edge(x, z, nx, nz); e2 = edge(x, z, -nx, -nz);
          ok = e1 < 4 && e2 < 4 && wetOut(x, z, nx, nz, e1) && wetOut(x, z, -nx, -nz, e2);
        }
        if (ok) { if (!run) run = { pts: [], main: !!l.main }; if (gap) run.pts.push(...run.hold); run.hold = []; gap = 0; run.pts.push({ x, z, nx, nz, e1, e2 }); }
        else if (run && gap < 2 && isFloor(L, x, z)) { gap++; run.hold.push({ x, z, nx, nz, e1: Math.min(edge(x, z, nx, nz), 4), e2: Math.min(edge(x, z, -nx, -nz), 4) }); }   // bridge a short break
        else flush();
      }
      flush();
    }
    for (const b of V.bridges) for (let it = 0; it < 2; it++) {   // smooth the edge distances (cell staircase) so the parapets run in a line
      const e1 = b.pts.map(q => q.e1), e2 = b.pts.map(q => q.e2), n = b.pts.length;
      for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), c = Math.min(n - 1, i + 1); b.pts[i].e1 = (e1[a] + e1[i] * 2 + e1[c]) / 4; b.pts[i].e2 = (e2[a] + e2[i] * 2 + e2[c]) / 4; }
    }
    return V;
  }
  // The liquid field of a level (volcano lava or Çürüme Vadisi milk), or null
  const liqOf = L => (L && (L._volc || L._dairy || L._town)) || null;

  // ── Çürüme Vadisi ground: which non-walkable ground is milk / kefir (4 px/m, V.lava like the volcano's lava) and how it flows ──
  // Milk rivers meander through the valley (bands along the zero line of a warped noise) and kefir ponds fill its hollows. Like the
  // lava, the liquid fills most of the ground next to the floor on the camera side (flat, hides nothing), with a wavy shore 0.3–0.9 m
  // off the walkable cells; behind the rooms (north) the glossy yogurt hills take over. The boss arena ("Çürüme Kuyusu") is ringed by a
  // kefir moat with yogurt cliffs to the north, and its middle holds the spring: a shallow bubbling kefir pool on the cheese plaza
  // (walkable: the kefir giant stands in it). V.flow (RGBA, 2 px/m): rg = direction, b = speed, a = what flows (0 strawberry milk,
  // 0.5 milk, 1 kefir — continuous, so the linear filter blends neighbours without a false third colour).
  function dairyField(L) {
    const P = MPX, W = L.W, H = L.H, MW = W * P, MH = H * P, n = MW * MH, grid = L.grid, seed = (L.seed & 0xffff) + 53;
    const fl = new Uint8Array(n);
    for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * W, o = py * MW; for (let px = 0; px < MW; px++) fl[o + px] = grid[row + ((px / P) | 0)]; }
    const D = chamfer(MW, MH, fl, 1);   // mask pixels to the nearest floor pixel
    const up = new Float32Array(W * H), dn = new Float32Array(W * H);   // metres to floor straight north (camera side) / south (behind a room)
    for (let i = 0; i < W; i++) {
      let lf = -99; for (let j = 0; j < H; j++) { if (grid[j * W + i]) lf = j; up[j * W + i] = j - lf; }
      lf = 1e9; for (let j = H - 1; j >= 0; j--) { if (grid[j * W + i]) lf = j; dn[j * W + i] = lf - j; }
    }
    const ar = L.rooms.find(r => r.kind === 'boss' && !r.hw);
    let dA = null;
    if (ar) { const src = new Uint8Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) src[j * W + i] = grid[j * W + i] && inRoom(ar, i + 0.5, j + 0.5, -1.5) ? 1 : 0; dA = chamfer(W, H, src, 1); }
    const Uc = new Float32Array(W * H), Dc = new Float32Array(W * H), Ac = dA ? new Float32Array(W * H) : null;
    for (let c = 0; c < W * H; c++) {
      const i = c % W;
      let u = Math.min(20, up[c]);
      for (let di = 1; di <= 4; di++) { if (i - di >= 0) u = Math.min(u, up[c - di] + 1.6 * di); if (i + di < W) u = Math.min(u, up[c + di] + 1.6 * di); }
      Uc[c] = u; Dc[c] = Math.min(20, dn[c]);
      if (Ac) Ac[c] = Math.min(30, dA[c]);
    }
    const bil = (F, x, z) => {
      const fx = clamp(x - 0.5, 0, W - 1.001), fz = clamp(z - 0.5, 0, H - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * W + i;
      return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + W] * (1 - tx) + F[k + W + 1] * tx) * tz;
    };
    // the rivers: along the zero line of a warped signed noise (smooth, so its gradient gives the current's direction too)
    const rivN = (x, z) => {
      const wx = x + vnoise(x / 11, z / 11, seed + 8) * 3.4, wz = z + vnoise(x / 11, z / 11, seed + 9) * 3.4;
      return vnoise(wx / 13, wz / 13, seed + 1) + 0.3 * vnoise(wx / 5.5, wz / 5.5, seed + 2);
    };
    const pondN0 = (x, z) => smooth01((vnoise(x / 9.5, z / 9.5, seed + 3) - 0.18) / 0.3);
    // both are smooth: evaluated once on a 0.5 m lattice and sampled bilinearly (the mask has 16 pixels per m², the lattice 4)
    const FP = 2, FW = W * FP, FH = H * FP, NL = (FW + 1) * (FH + 1), RN = new Float32Array(NL), PN = new Float32Array(NL);
    const N3 = new Float32Array(NL), NWX = new Float32Array(NL), NWZ = new Float32Array(NL), NSH = new Float32Array(NL);   // small noises too
    for (let b = 0; b <= FH; b++) for (let a = 0; a <= FW; a++) {
      const k = b * (FW + 1) + a, x = a / FP, z = b / FP;
      RN[k] = rivN(x, z); PN[k] = pondN0(x, z); N3[k] = vnoise(x / 3.1, z / 3.1, seed + 4);
      NWX[k] = vnoise(x / 2.3, z / 2.3, seed + 5); NWZ[k] = vnoise(x / 2.3, z / 2.3, seed + 6); NSH[k] = vnoise(x / 2.6, z / 2.6, seed);
    }
    const lat = (F, x, z) => {
      const fx = clamp(x * FP, 0, FW - 0.001), fz = clamp(z * FP, 0, FH - 0.001), a = fx | 0, b = fz | 0, tx = fx - a, tz = fz - b, k = b * (FW + 1) + a;
      return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + FW + 1] * (1 - tx) + F[k + FW + 2] * tx) * tz;
    };
    const rivL = (x, z) => lat(RN, x, z), pondN = (x, z) => lat(PN, x, z);
    const hkF = new Float32Array(n), nfF = new Float32Array(n);
    for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
      const k = py * MW + px;
      if (fl[k]) continue;
      const x = (px + 0.5) / P, z = (py + 0.5) / P, d = D[k] / P;
      const river = 1 - smooth01((Math.abs(rivL(x, z)) - 0.09) / 0.1), pond = pondN(x, z);
      let hk = 0.46 - 0.6 * Math.max(river, pond * 0.9) + clamp(d - 6, 0, 8) * 0.035 + lat(N3, x, z) * 0.12;   // hill factor
      const wa = 1.1 * smooth01((d - 0.4) / 1.6), wx = x + lat(NWX, x, z) * wa, wz = z + lat(NWZ, x, z) * wa;
      const u = bil(Uc, wx, wz), cam = 1 - smooth01((u - 6.25) / 1.5);
      hk -= 0.46 * Math.max(0, 1 - u / 9) * cam;                                          // camera side: milk
      hk += 0.3 * (1 - cam) * (1 - smooth01((bil(Dc, wx, wz) - 5.75) / 1.5));            // behind a room: yogurt hills
      if (Ac) {   // kefir moat · yogurt cliffs north of the arena
        const a = bil(Ac, x, z), cl = (1 - smooth01((a - 9.5) / 1.0)) * smooth01((ar.z - 3 - z) / 2 + 0.5), moat = 1 - smooth01((a - 4.7) / 1.0);
        hk += Math.max(0, 0.6 - hk) * cl;
        hk = hk * (1 - moat) - moat;
      }
      hk = Math.max(hk, 1 - Math.min(x, z, W - x, H - z) / 4);   // no milk at the map's border (the mask is clamped beyond it)
      hkF[k] = hk; nfF[k] = 1;
    }
    const hkB = boxBlur(hkF, MW, MH, 3), nfB = boxBlur(nfF, MW, MH, 3);
    // The shore follows a blurred floor coverage (not the distance to the 1 m cells), so it runs in soft curves instead of the
    // cells' staircase; its level wobbles a little (0.35–0.85 m off a straight floor edge)
    const flF = new Float32Array(n); for (let k = 0; k < n; k++) flF[k] = fl[k];
    let fb = boxBlur(flF, MW, MH, 4); fb = boxBlur(fb, MW, MH, 3);
    const raw = new Float32Array(n);
    for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
      const k = py * MW + px;
      if (fl[k]) continue;
      const x = (px + 0.5) / P, z = (py + 0.5) / P, d = D[k] / P;
      const lvl = 0.2 + 0.07 * lat(NSH, x, z) + 0.035 * vnoise(x / 1.1, z / 1.1, seed + 7);
      const hill = smooth01((hkB[k] / Math.max(1e-3, nfB[k]) - 0.14) / 0.16 + 0.5);
      raw[k] = smooth01((lvl - fb[k]) / 0.05 + 0.5) * smooth01((d - 0.28) / 0.1) * (1 - hill);
    }
    const liq = boxBlur(raw, MW, MH, 1);
    for (let k = 0; k < n; k++) if (fl[k]) liq[k] = 0;   // never on walkable floor, even blurred…
    const spring = ar ? { x: ar.x, z: ar.z, r: 2.05 } : null;
    if (spring) {   // …except the spring: a shallow round kefir pool in the middle of the arena
      const e = spring.r + 0.5;
      for (let py = Math.max(0, Math.floor((spring.z - e) * P)); py <= Math.min(MH - 1, Math.ceil((spring.z + e) * P)); py++)
        for (let px = Math.max(0, Math.floor((spring.x - e) * P)); px <= Math.min(MW - 1, Math.ceil((spring.x + e) * P)); px++) {
          const k = py * MW + px, dd = hyp((px + 0.5) / P - spring.x, (py + 0.5) / P - spring.z);
          liq[k] = Math.max(liq[k], clamp((spring.r - dd) / 0.22 + 0.5, 0, 1));
        }
    }
    const V = L._dairy = { lava: liq, MW, MH, P, dA, arena: ar || null, bridges: [], spring, floorD: D };
    liquidBridges(L, V);
    // under the biscuit bridges the milk comes right up to the walkable edge (the deck's ends overhang it; no bank of crumbs under the
    // rails), wherever there is milk a metre further out: the same smooth shore (the blurred floor coverage) at a level just off the
    // edge, easing back to the usual shore level within ~0.4 m past the bridge's ends (no notch, no cell staircase)
    const liqS = (x, z) => liq[clamp(Math.floor(z * P), 0, MH - 1) * MW + clamp(Math.floor(x * P), 0, MW - 1)];
    for (const b of V.bridges) {
      const Q = b.pts, cum = [0];
      for (let i = 1; i < Q.length; i++) cum.push(cum[i - 1] + hyp(Q[i].x - Q[i - 1].x, Q[i].z - Q[i - 1].z));
      const tot = cum[cum.length - 1], em = Math.max(...Q.map(q => Math.max(q.e1, q.e2))) + 1.6;
      const xs = Q.map(q => q.x), zs = Q.map(q => q.z);
      const x0 = Math.max(0, Math.floor((Math.min(...xs) - em) * P)), x1 = Math.min(MW - 1, Math.ceil((Math.max(...xs) + em) * P));
      const y0 = Math.max(0, Math.floor((Math.min(...zs) - em) * P)), y1 = Math.min(MH - 1, Math.ceil((Math.max(...zs) + em) * P));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const k = py * MW + px;
        if (fl[k]) continue;
        const x = (px + 0.5) / P, z = (py + 0.5) / P;
        let best = null;
        for (let i = 1; i < Q.length; i++) {   // the nearest segment: along the bridge (the end ones extended), sideways from it
          const a = Q[i - 1], c = Q[i], sx = c.x - a.x, sz = c.z - a.z, l2 = sx * sx + sz * sz || 1e-6, l = Math.sqrt(l2);
          let t = ((x - a.x) * sx + (z - a.z) * sz) / l2;
          if (t < 0 && i > 1) t = 0; if (t > 1 && i < Q.length - 1) t = 1;
          const lat = ((x - a.x) * sz - (z - a.z) * sx) / l, dd = Math.abs(lat) + Math.max(0, -t, t - 1) * l;
          if (best && dd >= best.dd) continue;
          const ea = (x - a.x) * a.nx + (z - a.z) * a.nz >= 0 ? a.e1 : a.e2, ec = (x - c.x) * c.nx + (z - c.z) * c.nz >= 0 ? c.e1 : c.e2;   // (e1 lies along +n)
          best = { dd, lat, along: cum[i - 1] + t * l, nx: sz / l, nz: -sx / l, e: lerp(ea, ec, clamp(t, 0, 1)) };
        }
        if (!best || Math.abs(best.lat) > best.e + 1.3) continue;
        const sd = best.lat >= 0 ? 1 : -1, taper = smooth01((Math.min(best.along, tot - best.along) + 0.45) / 0.4);
        if (taper <= 0 || liqS(x + best.nx * sd * 1.0, z + best.nz * sd * 1.0) < 0.5) continue;
        const lv = lerp(0.2 + 0.07 * lat(NSH, x, z), 0.47, taper);
        liq[k] = Math.max(liq[k], smooth01((lv - fb[k]) / 0.05 + 0.5) * smooth01((D[k] / P - 0.02) / 0.1));
      }
    }
    // the current: along the rivers (perpendicular to the noise gradient), round the moat, outward from the spring; kefir in the
    // ponds, the moat and the spring, milk in the rivers
    const F = new Uint8Array(FW * FH * 4);
    for (let py = 0; py < FH; py++) for (let px = 0; px < FW; px++) {
      const x = (px + 0.5) / FP, z = (py + 0.5) / FP, k0 = py * (FW + 1) + px, rn = (RN[k0] + RN[k0 + 1] + RN[k0 + FW + 1] + RN[k0 + FW + 2]) / 4;
      let gx = RN[k0 + 1] + RN[k0 + FW + 2] - RN[k0] - RN[k0 + FW + 1], gz = RN[k0 + FW + 1] + RN[k0 + FW + 2] - RN[k0] - RN[k0 + 1], gl = hyp(gx, gz) || 1;
      let fx = -gz / gl, fz = gx / gl;
      const rv = 1 - smooth01((Math.abs(rn) - 0.09) / 0.16);
      let sp = 0.3 + 0.7 * rv, kef = clamp(pondN(x, z) * (1 - rv * 0.8) + (vnoise(x / 17, z / 17, seed + 11) * 0.5 + 0.2) * (1 - rv), 0, 1);
      let stb = rv * smooth01((vnoise(x / 21, z / 21, seed + 13) - 0.05) / 0.3);   // some river stretches run with strawberry milk
      if (ar) {
        const dx = x - ar.x, dz = z - ar.z, r = hyp(dx, dz) || 1;
        const m = dA ? 1 - smooth01((bil(Ac, x, z) - 4.7) / 1.0) : 0;
        if (m > 0) { fx = lerp(fx, -dz / r, m); fz = lerp(fz, dx / r, m); sp = lerp(sp, 0.55, m); kef = lerp(kef, 1, m); stb *= 1 - m; }
        if (r < spring.r + 0.6) { fx = dx / r; fz = dz / r; sp = 0.4; kef = 1; stb = 0; }
        gl = hyp(fx, fz) || 1; fx /= gl; fz /= gl;
      }
      const o = (py * FW + px) * 4;
      F[o] = Math.round((fx * 0.5 + 0.5) * 255); F[o + 1] = Math.round((fz * 0.5 + 0.5) * 255); F[o + 2] = Math.round(clamp(sp, 0, 1) * 255); F[o + 3] = Math.round(clamp(0.5 + 0.5 * kef * (1 - stb) - 0.5 * stb, 0, 1) * 255);   // a: 0 strawberry · 0.5 milk · 1 kefir
    }
    V.flow = { data: F, W: FW, H: FH };
    return V;
  }
  function buildMask(L) {
    const P = MPX, MW = L.W * P, MH = L.H * P, n = MW * MH, seed = L.seed & 0xffff, LQ = liqOf(L), VL = LQ && LQ.lava;
    const wall = new Float32Array(n);
    for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * L.W, o = py * MW; for (let px = 0; px < MW; px++) wall[o + px] = L.grid[row + ((px / P) | 0)] ? 0 : VL ? 1 - VL[o + px] : 1; }   // volcano / dairy: the liquid is no wall (no AO, no dark ground)
    let g = boxBlur(wall, MW, MH, 3); g = boxBlur(g, MW, MH, 2);
    let a = boxBlur(g, MW, MH, 7); a = boxBlur(a, MW, MH, 7);
    if (L.theme === 'dairy') {   // the yogurt valley: G = a smooth floor coverage (0.5 = the walkable edge, in soft curves instead of the
      // cells' staircase); the shader outlines the walkable yogurt with it (a thin golden lip and a soft band inside), no dark AO
      const fc = new Float32Array(n);
      for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * L.W, o = py * MW; for (let px = 0; px < MW; px++) fc[o + px] = L.grid[row + ((px / P) | 0)]; }
      g = boxBlur(fc, MW, MH, 3); g = boxBlur(g, MW, MH, 2);
      // "outside" (the pink strawberry-yogurt ground): starts right at the floor's edge instead of metres out
      const wo = new Float32Array(n);
      for (let k = 0; k < n; k++) wo[k] = wall[k] * smooth01((LQ.floorD[k] / P - 0.1) / 0.5);
      a = boxBlur(wo, MW, MH, 3); a = boxBlur(a, MW, MH, 2);
      for (let k = 0; k < n; k++) a[k] = Math.min(1, a[k] * 1.6);
    }
    const Rm = new Float32Array(n), Bm = new Float32Array(n);
    const band = (pts, hw, ramp, dst, na) => {
      for (let s = 1; s < pts.length; s++) {
        const p0 = pts[s - 1], p1 = pts[s], e = hw + ramp + na;
        const x0 = Math.max(0, Math.floor((Math.min(p0.x, p1.x) - e) * P)), x1 = Math.min(MW - 1, Math.ceil((Math.max(p0.x, p1.x) + e) * P));
        const y0 = Math.max(0, Math.floor((Math.min(p0.z, p1.z) - e) * P)), y1 = Math.min(MH - 1, Math.ceil((Math.max(p0.z, p1.z) + e) * P));
        for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
          const x = (px + 0.5) / P, z = (py + 0.5) / P;
          const w = hw + (na ? vnoise(x / 1.6, z / 1.6, seed) * na : 0);
          const v = clamp(0.5 + (w - segDist(x, z, p0.x, p0.z, p1.x, p1.z)) / ramp, 0, 1), k = py * MW + px;
          if (v > dst[k]) dst[k] = v;
        }
      }
    };
    const disc = (cx, cz, r, ramp, dst, na) => band([{ x: cx, z: cz }, { x: cx + 0.01, z: cz }], r, ramp, dst, na);
    const curvePts = l => (l.curve || []).map(q => ({ x: q[0], z: q[1] }));
    if (L.theme === 'forest') {
      band(L.path, 1.2, 1.3, Rm, 0.4);
      for (const l of L.links) if (!l.main) band(curvePts(l), 0.75, 1.1, Rm, 0.3);
      if (L.village) {
        const S = L.rooms[0], cx = S.x - 0.3, cz = S.z + 0.7;
        disc(cx, cz, S.r * 0.5, 1.4, Bm, 1.1);
        for (const h of L.village.houses) {   // little cobbled walks from each front door to the plaza
          const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw), dx = h.door, oz = h.d / 2 + 0.3;
          const p0 = { x: h.x + fx * oz + fz * dx, z: h.z + fz * oz - fx * dx }, t = 0.55;
          band([p0, { x: lerp(p0.x, cx, t), z: lerp(p0.z, cz, t) }], 0.62, 0.9, Bm, 0.25);
        }
      }
      for (const c of L.checkpoints) disc(c.x, c.z, 2.1, 1.2, Bm, 0.5);
      if (L.exit) disc(L.exit.x, L.exit.z + 0.6, 2.6, 1.3, Bm, 0.5);
    } else if (L.theme === 'cave') {
      band(L.path, 1.35, 1.7, Rm, 0.55);
      for (const l of L.links) if (!l.main) band(curvePts(l), 0.9, 1.4, Rm, 0.4);
      for (let py = 0; py < MH; py += 1) for (let px = 0; px < MW; px += 1) {
        const x = px / P, z = py / P, k = py * MW + px;
        Bm[k] = clamp(0.5 + (vnoise(x / 4.5, z / 4.5, seed + 3) * 0.7 + vnoise(x / 1.7, z / 1.7, seed + 4) * 0.3 - 0.45) * 1.5 + g[k] * 1.1 - 0.2, 0, 1);
      }
    } else if (L.theme === 'castle') {
      const p = L.path.slice();
      if (L.crystalSpot) p.push({ x: L.crystalSpot.x, z: L.crystalSpot.z + 2.6 });
      band(p, 1.25, 0.8, Rm, 0);
      for (const c of L.checkpoints) disc(c.x, c.z, 2.0, 0.8, Bm, 0);
      for (const rm of L.rooms) if (rm.kind === 'side') {   // a rug in every treasure room
        const a = Math.max(0.01, rm.hw - rm.hh);
        band([{ x: rm.x - a, z: rm.z + 0.3 }, { x: rm.x + a, z: rm.z + 0.3 }], rm.hh - 1.9, 0.8, Bm, 0);
      }
      for (const rm of L.rooms) {   // a round medallion rug in the bigger halls (over the runner)
        if (rm.kind !== 'main' || rm.hw < 7 || rm.hh < 5 || L.checkpoints.some(c => inRoom(rm, c.x, c.z, -2))) continue;
        disc(rm.x, rm.z, Math.min(rm.hw, rm.hh) - 2.4, 0.8, Bm, 0);
      }
      if (L.crystalSpot) disc(L.crystalSpot.x, L.crystalSpot.z, 3.3, 0.8, Bm, 0);
      if (L.boss) disc(L.boss.x, L.boss.z + 3.2, 3.6, 0.8, Bm, 0);
    }
    if (L.theme === 'volcano') {
      band(L.path, 1.2, 1.5, Rm, 0.5);
      for (const l of L.links) if (!l.main) band(curvePts(l), 0.8, 1.2, Rm, 0.35);
      for (const c of L.checkpoints) disc(c.x, c.z, 2.1, 1.0, Bm, 0.45);
      if (L.exit) disc(L.exit.x, L.exit.z + 0.6, 2.6, 1.1, Bm, 0.45);
      for (const b of (L._volc && L._volc.bridges) || []) for (let i = 1; i < b.pts.length; i++) {   // paved bridge decks, wall to wall
        const p0 = b.pts[i - 1], p1 = b.pts[i];
        band([p0, p1], Math.max(p0.e1, p0.e2, p1.e1, p1.e2) + 0.25, 0.6, Bm, 0.12);
      }
      const ar = L._volc && L._volc.arena;
      if (ar) disc(ar.x, ar.z, 3.3, 0.9, Bm, 0.35);   // the arena island: a round paved dais in the middle where the boss waits
      if (ar && L.exit) band([{ x: ar.x, z: ar.z }, { x: L.exit.x, z: L.exit.z + 0.6 }], 1.35, 0.9, Bm, 0.3);   // …and a paved walk from it to the portal
    }
    if (L.theme === 'dairy') {   // biscuit-crumb trails, cheese-slab plazas (start, checkpoints, portal, the arena's round plaza)
      band(L.path, 1.2, 1.4, Rm, 0.5);
      for (const l of L.links) if (!l.main) band(curvePts(l), 0.8, 1.2, Rm, 0.35);
      for (const b of (LQ && LQ.bridges) || []) for (let i = 1; i < b.pts.length; i++) {   // the crumb trail runs wall to wall over the biscuit bridges
        const p0 = b.pts[i - 1], p1 = b.pts[i];
        band([p0, p1], Math.max(p0.e1, p0.e2, p1.e1, p1.e2) + 0.2, 0.6, Rm, 0.1);
      }
      disc(L.start.x, L.start.z - 0.4, 2.5, 1.2, Bm, 0.15);   // (little edge noise: the plazas end in a clean round rind)
      for (const c of L.checkpoints) disc(c.x, c.z, 2.1, 1.0, Bm, 0.12);
      if (L.exit) disc(L.exit.x, L.exit.z + 0.6, 2.6, 1.1, Bm, 0.12);
      const ar = LQ && LQ.arena;
      if (ar) disc(ar.x, ar.z, ar.r * 0.5, 1.0, Bm, 0.15);   // Çürüme Kuyusu: the round cheese plaza around the spring
      if (ar && L.exit) band([{ x: ar.x, z: ar.z }, { x: L.exit.x, z: L.exit.z + 0.6 }], 1.35, 0.9, Bm, 0.1);
    }
    if (L.theme === 'town') {
      // R = the gardens' grass beside the streets: a soft line over the cells' staircase (0.5 = the walkable edge, drawn crisp with a
      // kerb), a grassy bank up to the quays, paved on the bridges' decks; B = pavers in every square, on the stone
      // bridges and in İnfaz Meydanı; L._mainSt = the main street (paler cobbles, carried in tGlow.a); A = the meadow outside the walls
      const fc = new Float32Array(n), wt = new Float32Array(n), dk = new Float32Array(n), ms = L._mainSt = new Float32Array(n);
      for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * L.W, o = py * MW; for (let px = 0; px < MW; px++) { fc[o + px] = L.grid[row + ((px / P) | 0)]; wt[o + px] = VL && VL[o + px] > 0.5 ? 1 : 0; } }
      let cv = boxBlur(fc, MW, MH, 3); cv = boxBlur(cv, MW, MH, 2);
      const wn = boxBlur(wt, MW, MH, 2);
      for (const b of (LQ && LQ.bridges) || []) for (let i = 1; i < b.pts.length; i++) {
        const p0 = b.pts[i - 1], p1 = b.pts[i];
        band([p0, p1], Math.max(p0.e1, p0.e2, p1.e1, p1.e2) + 0.45, 0.4, dk, 0);
        if (b.stone) band([p0, p1], Math.max(p0.e1, p0.e2, p1.e1, p1.e2) + 0.4, 0.5, Bm, 0);   // stone bridges: flagstone decks, wall to wall
      }
      for (let k = 0; k < n; k++) Rm[k] = (1 - cv[k]) * (1 - smooth01(wn[k] * 2 - 1)) * (1 - dk[k]);   // (a grassy bank up to the quays: never a bare walkable-looking strip)
      band(L.path, 1.95, 0.4, ms, 0.15);   // (a wide main street with a clear edge: its own flagstones, see floorMat)
      for (const rm of L.rooms) if (rm.kind !== 'boss') disc(rm.x, rm.z, rm.r * (rm.kind === 'side' ? 0.5 : 0.6), 0.7, Bm, 0);   // (a clean round curb: no edge noise)
      for (const c of L.checkpoints) disc(c.x, c.z, 2.0, 0.7, Bm, 0);
      const ar = LQ && LQ.arena;
      if (ar) disc(ar.x, ar.z, ar.r * 0.8, 0.8, Bm, 0);   // İnfaz Meydanı
      if (L.exit) { disc(L.exit.x, L.exit.z + 0.6, 2.8, 0.7, Bm, 0); band([{ x: L.exit.x, z: L.exit.z }, { x: L.exit.x, z: L.exit.z - 13 }], 1.2, 0.6, Bm, 0); }   // (…and the road on through the gate to the castle's hill)
      const F = LQ && LQ.outF;
      if (F) for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
        const fx = clamp((px + 0.5) / P - 0.5, 0, L.W - 1.001), fz = clamp((py + 0.5) / P - 0.5, 0, L.H - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, c = j * L.W + i;
        a[py * MW + px] = (F[c] * (1 - tx) + F[c + 1] * tx) * (1 - tz) + (F[c + L.W] * (1 - tx) + F[c + L.W + 1] * tx) * tz;
      }
    }
    const D = new Uint8Array(n * 4);
    for (let k = 0; k < n; k++) { D[k * 4] = Rm[k] * 255; D[k * 4 + 1] = g[k] * 255; D[k * 4 + 2] = Bm[k] * 255; D[k * 4 + 3] = a[k] * 255; }
    const t = new THREE.DataTexture(D, MW, MH, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    L._mask = { data: D, W: MW, H: MH };
    return t;
  }
  function buildFloor(L, B) {
    const mask = buildMask(L);
    B.dispose.push(mask);
    const m = floorMat(L.theme);
    m.userData.u.tMask.value = mask; m.userData.u.uMaskInv.value.set(1 / L.W, 1 / L.H);
    let fg;
    if (L._town) fg = townFloorGeo(L);   // Veba Şehri: the streets end at the quays (the canals lie lower)
    else { fg = new THREE.PlaneGeometry(L.W + 28, L.H + 28); fg.rotateX(-Math.PI / 2); fg.translate(L.W / 2, 0, L.H / 2); }
    const floor = new THREE.Mesh(fg, m);
    floor.receiveShadow = true; floor.name = 'floor';
    B.g.add(floor);
  }
  // Baked glow pools: soft coloured discs accumulated into a small RGB texture (2 px/m) the floor adds as light
  const GPX = 2, GLOW_K = 3;
  let BLACK = null;
  function blackTex() {
    if (!BLACK) { BLACK = keep(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)); BLACK.needsUpdate = true; }
    return BLACK;
  }
  function glowAt(B, x, z, r, col, k, sx = 1, sz = 1) { B.glows.push({ x, z, r, c: col && col.isColor ? col : new THREE.Color(col), k, sx, sz }); }
  function buildGlowTex(L, B) {
    const m = R.mat['floor-' + L.theme];
    if (!m) return;
    const styled = L.rooms.filter(r => r.style === 0), V = liqOf(L);
    if (!B.glows.length && !styled.length && !V) { m.userData.u.tGlow.value = blackTex(); return; }
    const gp = V ? V.P : GPX, GW = L.W * gp, GH = L.H * gp, acc = new Float32Array(GW * GH * 3);   // volcano / dairy: 4 px/m (alpha carries the lava / milk)
    for (const g of B.glows) {
      const rx = g.r * g.sx, rz = g.r * g.sz;
      const x0 = Math.max(0, Math.floor((g.x - rx) * gp)), x1 = Math.min(GW - 1, Math.ceil((g.x + rx) * gp));
      const y0 = Math.max(0, Math.floor((g.z - rz) * gp)), y1 = Math.min(GH - 1, Math.ceil((g.z + rz) * gp));
      const cr = g.c.r * g.k, cg = g.c.g * g.k, cb = g.c.b * g.k;
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const dx = ((px + 0.5) / gp - g.x) / rx, dz = ((py + 0.5) / gp - g.z) / rz, d2 = dx * dx + dz * dz;
        if (d2 >= 1) continue;
        const f = (1 - d2) * (1 - d2), o = (py * GW + px) * 3;
        acc[o] += cr * f; acc[o + 1] += cg * f; acc[o + 2] += cb * f;
      }
    }
    if (V && V === L._volc) {   // the lava's warm light on the floor next to it: a soft orange band along every shore
      let bl = boxBlur(V.lava, GW, GH, 4); bl = boxBlur(bl, GW, GH, 3);
      const c = lin(0xff8a3c), k = 0.4;
      for (let i = 0, n = GW * GH; i < n; i++) { const f = bl[i] * k; acc[i * 3] += c.r * f; acc[i * 3 + 1] += c.g * f; acc[i * 3 + 2] += c.b * f; }
    }
    const D = new Uint8Array(GW * GH * 4), sc = 255 / GLOW_K;
    for (let i = 0, n = GW * GH; i < n; i++) {
      D[i * 4] = Math.min(255, acc[i * 3] * sc); D[i * 4 + 1] = Math.min(255, acc[i * 3 + 1] * sc); D[i * 4 + 2] = Math.min(255, acc[i * 3 + 2] * sc);
      D[i * 4 + 3] = V === L._town && L._mainSt ? 255 - Math.round(clamp(L._mainSt[i], 0, 1) * 255) : V ? 255 - Math.round(clamp(V.lava[i], 0, 1) * 255) : 255;   // (Veba Şehri: the main street)
    }
    for (const rm of styled) {   // alpha = room style (rectangular castle rooms, reaching a little under the walls)
      const x0 = Math.max(0, Math.floor((rm.x - rm.hw - 0.25) * gp)), x1 = Math.min(GW - 1, Math.ceil((rm.x + rm.hw + 0.25) * gp) - 1);
      const y0 = Math.max(0, Math.floor((rm.z - rm.hh - 0.25) * gp)), y1 = Math.min(GH - 1, Math.ceil((rm.z + rm.hh + 0.25) * gp) - 1);
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) D[(py * GW + px) * 4 + 3] = 0;
    }
    const t = new THREE.DataTexture(D, GW, GH, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
    B.dispose.push(t);
    m.userData.u.tGlow.value = t;
    if (m.userData.u.uRip) {   // Çürüme Vadisi: the spring + up to 3 waterfall splashes ripple the milk (the 3 nearest the hero: LEVEL.update)
      const rs = [], sp = V && V.spring;
      if (sp) rs.push([sp.x, sp.z, sp.r, 1]);
      B.rip = { fixed: rs.length, src: V && V === L._dairy ? (B.falls || []).map(f => [f.x + Math.sin(f.yaw) * 0.6, f.z + Math.cos(f.yaw) * 0.6, 2.4, 2]) : [], t: 0, u: m.userData.u.uRip };
      for (const q of B.rip.src) if (rs.length < 4) rs.push(q);
      m.userData.u.uRip.value.forEach((v, i) => (rs[i] ? v.set(rs[i][0], rs[i][1], rs[i][2], rs[i][3]) : v.set(0, 0, 0, 0)));
    }
    if (V && V.flow && m.userData.u.tFlow) {   // Çürüme Vadisi: the milk's current (rg direction, b speed, a kefir)
      const F = V.flow, ft = new THREE.DataTexture(F.data, F.W, F.H, THREE.RGBAFormat, THREE.UnsignedByteType);
      ft.minFilter = ft.magFilter = THREE.LinearFilter; ft.generateMipmaps = false; ft.wrapS = ft.wrapT = THREE.ClampToEdgeWrapping; ft.needsUpdate = true;
      B.dispose.push(ft);
      m.userData.u.tFlow.value = ft;
    }
  }
  function floorMat(theme) {   // one kept material per theme (shared program): zone changes never recompile it
    const key = 'floor-' + theme;
    if (R.mat[key]) return R.mat[key];
    const th = FLOOR[theme];
    const A = surf(th.a), Bt = surf(th.b), C = surf(th.c), noise = texOK() && TEX.noise ? TEX.noise : surf('grass').map;
    const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
    const oc = lin(th.out);
    const U = m.userData.u = {
        tMask: { value: null }, tNoise: { value: noise }, tA: { value: A.map }, tAn: { value: A.normalMap }, tB: { value: Bt.map }, tBn: { value: Bt.normalMap },
        tC: { value: C.map }, tCn: { value: C.normalMap },
        uSc: { value: new THREE.Vector4(1 / tM(th.a), 1 / (tM(th.b) * (th.bScale || 1)), 1 / (tM(th.c) * (th.cScale || 1)), th.anti && LV_HQ ? 1 : 0) }, uMaskInv: { value: new THREE.Vector2(1, 1) },
        uTintA: { value: lin(th.tA, th.tAk ?? 1) }, uTintB: { value: lin(th.tB, th.tBk ?? 1) }, uTintC: { value: lin(th.tC, th.tCk ?? 1) }, uRough: { value: new THREE.Vector3(...th.rough) },
        uTintA2: { value: lin(th.tA2 ?? th.tA, th.tAk ?? 1) }, uTintC2: { value: lin(th.tC2 ?? th.tC, th.tCk ?? 1) },
        uMode: { value: new THREE.Vector4(th.crispB, th.crispC, th.ao, th.border) }, uOut: { value: new THREE.Vector4(oc.r, oc.g, oc.b, th.outAmt) },
        uTrim: { value: lin(th.trim ?? 0x967653, 0.9) }, uTrimM: { value: th.trimM ?? 0.9 },   // (trim: the gold inlay / curb line and how metallic it is)
        uMacro: { value: lin(th.macro) }, uLumC: { value: th.lumC || 0 },
        tGlow: { value: blackTex() }, uTime: TIME.u, uSpeck: { value: th.speck ? lin(th.speck[0], th.speck[1]) : new THREE.Color(0, 0, 0) },
        // liquid: lava (volcano, x = 1): TEX.lava scrolled + wobbled · milk / kefir (dairy, x = 2): TEX.milk moved along tFlow (a flow
        // map), lit and glossy. tGlow.a = 1 - liquid there. x mode · y 1/tile · z shore rim · w emissive gain
        // (Veba Şehri, x = -1: no liquid; the main street's flagstones th.street sit in the liquid's two texture slots instead)
        tLava: { value: th.lava ? surf(LIQ_TEX[th.lava]).map : th.street ? surf(th.street).map : blackTex() },
        tLavaN: { value: th.lava === 2 ? surf('milk').normalMap : th.street ? surf(th.street).normalMap : blackTex() },
        tFlow: { value: blackTex() },
        uLava: { value: new THREE.Vector4(th.lava || (th.street ? -1 : 0), 1 / (th.lava ? tM(LIQ_TEX[th.lava]) : th.street ? tM(th.street) : 6), 0.55, 1) },
        uLavaT: { value: th.lava && !(texOK() && TEX[LIQ_TEX[th.lava]]) ? (th.lava === 2 ? lin(0xffffff, 1.2) : lin(0xff8a30)) : new THREE.Color(1, 1, 1) },
        // milk (cool, glossy bluish white) / kefir (warm ivory) / strawberry milk (pastel pink) tints, liquid roughness
        uLiqA: { value: lin(0x95ac83, 1.1) }, uLiqB: { value: lin(0xaaa76c, 1.08) }, uLiqC: { value: lin(0x945d55, 1.05) }, uLiqR: { value: th.lava === 2 ? 0.38 : 0.8 },
        uEdge: { value: lin(0x687050) },   // Çürüme Vadisi: poisoned moss along the walkable edge
        uRip: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) },   // dairy: ripple sources (x, z, radius, kind: 1 the arena's kefir spring, 2 a waterfall's splash)
    };
    lvShade(m, {
      key: 'floor',
      uniforms: U,
      vDecl: 'varying vec3 vLvW;',
      vBegin: 'vLvW = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      fDecl: `uniform sampler2D tMask, tNoise, tA, tAn, tB, tBn, tC, tCn, tGlow, tLava, tLavaN, tFlow; uniform vec4 uSc, uMode, uOut, uLava; uniform vec2 uMaskInv;
        uniform vec3 uTintA, uTintB, uTintC, uTintA2, uTintC2, uRough, uTrim, uMacro, uSpeck, uLavaT, uLiqA, uLiqB, uLiqC, uEdge; uniform vec4 uRip[4]; uniform float uLumC, uTime, uLiqR, uTrimM; varying vec3 vLvW;
        ${GLSL_NOISE}
        float lvHB(float h1, float h2, float t) {   // height-aware blend weight of layer 2
          t = clamp(t, 0.0, 1.0);
          float a = h1 + (1.0 - t) * 1.5, b = h2 + t * 1.5, m = max(a, b) - 0.22;
          float wa = max(a - m, 0.0), wb = max(b - m, 0.0);
          return wb / (wa + wb + 1e-4);
        }`,
      fMap: `vec2 lvXZ = vLvW.xz;
        vec4 lvM = texture2D(tMask, lvXZ * uMaskInv);
        vec4 lvGs = texture2D(tGlow, lvXZ * uMaskInv);   // rgb: baked light pools · a: room style (castle: 0 = sandstone + red rugs)
        vec4 lvN = texture2D(tNoise, lvXZ * 0.027);      // r: brightness · g: macro tint, rug-edge noise · b: anti-tiling, path-edge noise
        vec2 lvU = vec2(lvXZ.x, -lvXZ.y);
        vec2 uA = lvU * uSc.x, uB = lvU * uSc.y, uC = lvU * uSc.z;
        vec4 cA = vec4(0.8), nA = vec4(0.5, 0.5, 1.0, 0.5), cB = cA, nB = nA, cC = cA, nC = nA;
        vec3 nAu = vec3(0.0, 0.0, 1.0);
        if (uLava.x < 0.5 || lvGs.a > 0.004) {   // (pure lava / milk pixels never show the ground: skip its 8–10 texture reads; the
          // liquid covers every pixel of those quads fully, so the skipped derivatives can't show either)
          cA = texture2D(tA, uA); nA = texture2D(tAn, uA);
          nAu = nA.xyz * 2.0 - 1.0;
          if (uSc.w > 0.5) {   // a second rotated, rescaled sample hides the tiling
            vec2 uA2 = mat2(0.8, 0.6, -0.6, 0.8) * lvU * uSc.x * 0.61 + vec2(0.37, 0.71);
            vec4 cA2 = texture2D(tA, uA2), nA2 = texture2D(tAn, uA2);
            vec3 n2 = nA2.xyz * 2.0 - 1.0; n2.xy = vec2(0.8 * n2.x + 0.6 * n2.y, -0.6 * n2.x + 0.8 * n2.y);
            float k2 = smoothstep(0.32, 0.68, lvN.b);
            cA = mix(cA, cA2, k2); nAu = mix(nAu, n2, k2); nA.a = mix(nA.a, nA2.a, k2);
          }
          cB = texture2D(tB, uB); nB = texture2D(tBn, uB); cC = texture2D(tC, uC); nC = texture2D(tCn, uC);
          if (uLava.x < -0.5) {   // Veba Şehri: the main street (tGlow.a → 0) in big pale flagstones, a darker joint along its edges; the
            // courses run north–south, along most of the route (the texture's u turned onto the world's z; its normals turned with it)
            vec2 uP = vec2(-lvU.y, lvU.x) * uLava.y; vec4 cP = texture2D(tLava, uP), nP = texture2D(tLavaN, uP);
            float kR = 1.0 - lvGs.a, kP = smoothstep(0.3, 0.7, kR);
            vec3 nPu = nP.xyz * 2.0 - 1.0; nPu.xy = vec2(nPu.y, -nPu.x);
            cA = mix(cA, cP, kP); nAu = mix(nAu, nPu, kP); nA.a = mix(nA.a, nP.a, kP);
            cA.rgb *= 1.0 - 0.3 * smoothstep(0.12, 0.42, kR) * (1.0 - smoothstep(0.5, 0.8, kR));
          }
        }
        float fwB = fwidth(lvM.r) * 0.7 + 0.004, fwC = fwidth(lvM.b) * 0.7 + 0.004;
        float wB = uMode.x > 0.5 ? smoothstep(0.5 - fwB, 0.5 + fwB, lvM.r) : lvHB(nA.a, nB.a, lvM.r + (lvN.b - 0.5) * 0.3);
        float wC = uMode.y > 0.5 || uLava.x > 1.5 ? smoothstep(0.5 - fwC, 0.5 + fwC, lvM.b) : lvHB(mix(nA.a, nB.a, wB), nC.a, lvM.b + (lvN.g - 0.5) * 0.3);   // (Çürüme Vadisi: clean cheese-slab edges)
        vec3 lvCol = mix(cA.rgb * mix(uTintA2, uTintA, lvGs.a), cB.rgb * uTintB, wB);
        vec3 cCc = uLumC > 0.5 ? vec3(mix(0.42, dot(cC.rgb, vec3(0.5, 0.35, 0.15)) * 2.4, uLumC - 0.5)) : cC.rgb;   // rugs / cave moss: recoloured from the texture's luminance (uLumC-0.5 = contrast)
        lvCol = mix(lvCol, cCc * mix(uTintC2, uTintC, lvGs.a), wC);
        if (uLava.x > 1.5) {   // Çürüme Vadisi: the cheese plazas end in a bevelled golden rind band instead of clipped tiles
          float rb = wC * (1.0 - smoothstep(0.62, 0.66 + fwC, lvM.b)), bev = smoothstep(0.5, 0.66, lvM.b);
          lvCol = mix(lvCol, vec3(0.26, 0.29, 0.19) * (0.72 + 0.45 * bev) * (0.9 + 0.2 * cC.r), rb);
        }
        float lvTrim = 0.0;
        if (uMode.x > 0.5) lvTrim += (smoothstep(0.5 - fwB, 0.5 + fwB, lvM.r) - smoothstep(0.64 - fwB, 0.64 + fwB, lvM.r)) * (1.0 - smoothstep(0.5 - fwC, 0.5 + fwC, lvM.b));
        if (uMode.y > 0.5) lvTrim += smoothstep(0.5 - fwC, 0.5 + fwC, lvM.b) - smoothstep(0.64 - fwC, 0.64 + fwC, lvM.b);
        lvTrim = clamp(lvTrim, 0.0, 1.0);
        lvCol = mix(lvCol, uTrim * (0.75 + 0.5 * cA.r), lvTrim);
        lvCol *= mix(0.8, 1.12, lvN.r) * mix(vec3(1.0), uMacro, smoothstep(0.42, 0.78, lvN.g) * 0.6 * (1.0 - wB) * (1.0 - wC));
        float lvAOv = 1.0 - smoothstep(0.02, 0.55, lvM.g) * uMode.z;
        if (uLava.x > 1.5) {   // Çürüme Vadisi: G = smooth floor coverage (0.5 = the walkable edge): a soft warm band just inside it and a thin
          // golden lip on it, so the walkable yogurt reads at a glance against the milk and the hills (no dark AO anywhere else)
          float fwE = fwidth(lvM.g) * 0.8 + 0.003;
          float onF = smoothstep(0.5 - fwE, 0.5 + fwE, lvM.g);
          float band = onF * (1.0 - smoothstep(0.5, 0.8, lvM.g)), lipE = onF * (1.0 - smoothstep(0.545, 0.575 + fwE, lvM.g));
          lvAOv = 1.0 - band * uMode.z * 0.5;
          lvCol *= mix(vec3(1.0), vec3(0.62, 0.70, 0.55), band * 0.9);
          lvCol = mix(lvCol, uEdge * (0.85 + 0.3 * cA.r), lipE * 0.6);
        }
        lvCol *= mix(1.0, lvAOv, 0.85);
        if (uMode.w > 0.0) {   // castle: darker inlaid border along the walls with a thin gold line
          float fg = fwidth(lvM.g) * 0.7 + 0.003;
          float bd = smoothstep(0.1 - fg, 0.1 + fg, lvM.g);
          lvCol *= mix(1.0, 0.7, bd * uMode.w * (1.0 - wB));
          float ln = (bd - smoothstep(0.13 - fg, 0.13 + fg, lvM.g)) * (1.0 - wB);
          lvCol = mix(lvCol, uTrim, ln * 0.85); lvTrim = max(lvTrim, ln);
        }
        lvCol = mix(lvCol, uOut.rgb, smoothstep(0.25, 0.95, lvM.a) * uOut.a);
        float lvLv = 0.0, lvLqSh = 0.0; vec3 lvLvE = vec3(0.0), lvLqN = vec3(0.0, 0.0, 1.0);
        if (uLava.x > 1.5) {   // Çürüme Vadisi: flowing milk, kefir and strawberry milk (lit and glossy), fizzy bubbles popping, a foamy lip on the shore
          float lq = 1.0 - lvGs.a;
          if (lq > 0.002) {
            vec4 fw = texture2D(tFlow, lvXZ * uMaskInv);
            vec2 fd = (fw.rg * 2.0 - 1.0) * fw.b;                      // current: direction × speed (0..1)
            float kef = clamp(fw.a * 2.0 - 1.0, 0.0, 1.0), stb = clamp(1.0 - fw.a * 2.0, 0.0, 1.0);   // a: 0 strawberry milk · 0.5 milk · 1 kefir
            // flow map, two phases half a cycle apart (each restarts while the other is fully visible); the phase is offset by the
            // noise so the whole river never pulses at once
            float lt = uTime * 0.2 + lvN.r * 2.3;
            float p0 = fract(lt), p1 = fract(lt + 0.5), w0 = 1.0 - abs(1.0 - 2.0 * p0);
            vec2 lu = lvU * uLava.y, fu = vec2(fd.x, -fd.y) * 2.2 * uLava.y;   // tiles moved per cycle (lvU = (x, -z))
            vec2 u0 = lu - fu * p0, u1 = lu - fu * p1 + vec2(0.37, 0.21);
            vec4 m0 = texture2D(tLava, u0), m1 = texture2D(tLava, u1);
            vec4 n0 = texture2D(tLavaN, u0), n1 = texture2D(tLavaN, u1);
            vec3 q0 = n0.xyz * 2.0 - 1.0, q1 = n1.xyz * 2.0 - 1.0;
            vec3 mc = mix(m1.rgb, m0.rgb, w0) * uLavaT;
            vec3 mq = mix(q1, q0, w0); mq.xy *= 0.8; mq = normalize(mq);
            float mh = mix(n1.a, n0.a, w0);                                  // ripple / bubble height
            vec3 liq = mc * (uLiqA + (uLiqB - uLiqA) * kef + (uLiqC - uLiqA) * stb);
            liq *= mix(vec3(1.0), vec3(0.92, 0.96, 1.03), smoothstep(0.45, 1.0, lq) * (1.0 - kef * 0.6));   // a touch cooler out in the deep
            // fizzy bubbles: rise, grow and pop in place (more in the kefir), each leaving a tiny ring. In the arena's spring (uRip[0]
            // kind 1; only floor round it, so the switch never shows) they are ~3× bigger, so the pops read from the camera
            float inSp = uRip[0].w > 0.5 && uRip[0].w < 1.5 ? 1.0 - step(uRip[0].z + 0.3, length(lvXZ - uRip[0].xy)) : 0.0;
            vec2 bp = lvXZ * mix(3.0, 1.5, inSp), bi = floor(bp); float bh = lvH21(bi);
            vec2 bo = fract(bp) - 0.5 - (vec2(lvH21(bi + 3.7), lvH21(bi + 9.2)) - 0.5) * mix(0.5, 0.3, inSp);
            float life = fract(uTime * (0.22 + bh * 0.3) + bh * 13.0), bmax = mix(0.07 + 0.12 * fract(bh * 7.3), 0.13 + 0.13 * fract(bh * 7.3), inSp);
            float br = bmax * smoothstep(0.0, 0.75, life), bd = length(bo);
            float bon = step(bh, 0.08 + 0.46 * kef) * smoothstep(0.45, 0.8, lq);
            float film = (1.0 - smoothstep(br - 0.012, br, bd)) * (1.0 - step(0.9, life)) * bon;
            float brim = smoothstep(br - 0.035, br - 0.01, bd) * film;
            float pr = bmax * (1.0 + (life - 0.9) * mix(9.0, 4.0, inSp));
            float ring = smoothstep(0.018, 0.0, abs(bd - pr)) * step(0.9, life) * (1.0 - (life - 0.9) * 10.0) * bon;
            liq = mix(liq, liq * mix(vec3(0.95, 0.97, 1.02), vec3(0.86, 0.9, 0.98), inSp), film * 0.6);   // thin film: a little see-through, cooler
            liq += (vec3(0.12, 0.12, 0.12) * brim + vec3(0.08, 0.08, 0.08) * ring) * (1.0 + inSp);   // (the spring's big bubbles: a brighter rim)
            if (film > 0.01) mq = normalize(mix(mq, vec3(vec2(bo.x, -bo.y) / max(br, 0.02) * 0.9, 1.0), film));
            for (int ri = 0; ri < 4; ri++) {   // ripple sources: the spring (rings welling up from its middle, a creamy bulge) and the waterfalls' splashes
              vec4 rp = uRip[ri];
              if (rp.w < 0.5) continue;
              vec2 sd = lvXZ - rp.xy; float sr = length(sd), sk = 1.0 - smoothstep(rp.z * 0.55, rp.z * 1.05, sr);
              if (sk < 0.001) continue;
              float wv = sin(sr * (rp.w > 1.5 ? 7.0 : 9.0) - uTime * (rp.w > 1.5 ? 4.0 : 3.2)) * sk * (0.35 + 0.65 * smoothstep(0.0, 0.6, sr));
              vec2 sdir = sd / max(sr, 1e-3);
              mq = normalize(mq + vec3(sdir.x, -sdir.y, 0.0) * wv * 0.45);
              liq *= 1.0 + 0.05 * wv;
              liq = mix(liq, vec3(0.22, 0.31, 0.18) * uLavaT, (1.0 - smoothstep(0.0, rp.z * 0.35, sr)) * (rp.w > 1.5 ? 0.5 : 0.35));   // the creamy bulge / the foam where the milk falls in
            }
            // glossy streaks gliding with the current (the same flow-advected phases): the liquid reads as moving even in a still frame
            float sn = mix(texture2D(tNoise, u1 * 0.45).g, texture2D(tNoise, u0 * 0.45).g, w0);
            lvLqSh = smoothstep(0.55, 0.78, sn) * smoothstep(0.3, 0.75, lq);
            // the bank: the ground a little darker and wetter just before the liquid (it sits lower); a bright foamy lip where they meet
            lvCol *= 1.0 - 0.3 * smoothstep(0.0, 0.07, lq) * (1.0 - smoothstep(0.1, 0.3, lq));
            float lip = smoothstep(0.08, 0.15, lq) * (1.0 - smoothstep(0.22, 0.45, lq));
            lip *= smoothstep(0.15, 0.55, mh * 0.8 + lip * 0.5);   // broken up into foam by the ripples
            liq = mix(liq, vec3(0.22, 0.31, 0.18) * uLavaT, lip * 0.9);
            lvLv = smoothstep(0.07, 0.15, lq);
            lvLqN = mq;
            lvCol = mix(lvCol, liq, lvLv);
          }
        } else if (uLava.x > 0.5) {   // volcano: molten lava wherever the baked lava mask says so (never on walkable floor)
          lvLv = 1.0 - lvGs.a;
          if (lvLv > 0.002) {
            // TEX.lava (brightness = heat) in two drifting layers wobbled by the noise; brightness² → emission: the molten rivers
            // glow and bloom, the crust plates stay warm red. Lava is (almost) unlit.
            float lt = uTime;
            vec4 lz = texture2D(tNoise, lvXZ * 0.045 + vec2(lt * 0.006, lt * 0.004));
            vec2 lu = lvU * uLava.y + (lz.rg - 0.5) * 0.16 + vec2(0.0, lt * 0.035);
            vec3 l1 = texture2D(tLava, lu).rgb, l2 = texture2D(tLava, mat2(0.8, 0.6, -0.6, 0.8) * lu * 0.71 + vec2(0.31, 0.57) - vec2(lt * 0.018, 0.0)).rgb;
            vec3 lc = max(l1, l2 * 0.92) * uLavaT;
            float lh = dot(lc, vec3(0.45, 0.45, 0.1));
            float lsh = smoothstep(0.0, 0.22, lvLv) * (1.0 - smoothstep(0.3, 0.85, lvLv));                  // hot rim along the shore
            lvLvE = (lc * (0.62 + 1.7 * lh * lh) * (0.94 + 0.12 * sin(lt * 1.3 + lz.b * 6.0)) + vec3(1.0, 0.42, 0.08) * lsh * uLava.z) * uLava.w;
            lvCol = mix(lvCol, lc * 0.06, lvLv);
          }
        }
        diffuseColor.rgb = lvCol;
        float lvSp = 0.0;
        if (uSpeck.r + uSpeck.g + uSpeck.b > 0.0) {   // bioluminescent specks in the moss (cave)
          vec2 sp = lvXZ * 2.7, si = floor(sp); float h = lvH21(si);
          vec2 so = fract(sp) - 0.5 - (vec2(lvH21(si + 7.1), lvH21(si + 3.3)) - 0.5) * 0.55;
          lvSp = smoothstep(0.1, 0.02, length(so)) * step(0.55, h) * wC * (1.0 - smoothstep(0.25, 0.8, lvM.a)) * (0.55 + 0.45 * sin(uTime * 1.7 + h * 40.0));
        }`,
      fNormal: `vec3 lvNt = normalize(mix(mix(nAu, nB.xyz * 2.0 - 1.0, wB), nC.xyz * 2.0 - 1.0, wC));
        lvNt = normalize(mix(lvNt, lvLqN, lvLv));
        vec3 lvWn = normalize(vec3(lvNt.x, lvNt.z, -lvNt.y));
        normal = normalize((viewMatrix * vec4(lvWn, 0.0)).xyz);
        roughnessFactor = mix(mix(mix(mix(uRough.x, uRough.y, wB), uRough.z, wC), 0.3, lvTrim), uLiqR, lvLv);
        metalnessFactor = lvTrim * uTrimM;`,
      fAO: 'reflectedLight.indirectDiffuse *= lvAOv; reflectedLight.indirectSpecular *= lvAOv * lvAOv;',
      // baked coloured light pools (crystals, torches, lamps, stained glass) with a gentle shimmer
      fOut: `vec3 lvGl = lvGs.rgb * ${GLOW_K.toFixed(1)};
        outgoingLight += lvGl * (diffuseColor.rgb + 0.07) * (0.86 + 0.14 * sin(uTime * 1.9 + vLvW.x * 0.41 + vLvW.z * 0.53)) + uSpeck * lvSp + lvLvE * lvLv;
        if (uLava.x > 1.5) {
          outgoingLight += vec3(0.18, 0.28, 0.10) * lvLv * (0.05 + 0.3 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0)) + vec3(0.08, 0.12, 0.04) * lvLqSh * lvLv;
          outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.40, 0.50, 0.22) + vec3(0.025, 0.036, 0.009), lvLv);
        }`,
    });
    return (R.mat[key] = keep(m));
  }

  // Minimap: 1 px per cell, floor coloured (path / plaza tinted), walls transparent
  function buildMapCanvas(L) {
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas'); c.width = L.W; c.height = L.H;
    const g = c.getContext('2d'), id = g.createImageData(L.W, L.H), M = L._mask;
    const pal = { forest: [[112, 178, 86], [206, 164, 110], [196, 190, 176]], cave: [[98, 112, 150], [176, 160, 132], [90, 170, 160]], castle: [[168, 156, 196], [196, 52, 64], [140, 100, 200]],
      volcano: [[132, 112, 104], [214, 186, 156], [186, 160, 140]], dairy: [[238, 228, 212], [218, 168, 96], [246, 206, 92]],
      town: [[214, 184, 146], [246, 228, 196], [230, 150, 108]] }[L.theme] || [[150, 150, 150], [200, 180, 150], [180, 180, 180]];
    for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) {
      if (!L.grid[j * L.W + i]) continue;
      const k = ((j * MPX + 2) * M.W + i * MPX + 2) * 4, pr = M.data[k] / 255, pb = M.data[k + 2] / 255, ao = M.data[k + 1] / 255;
      const w1 = (L._mainSt ? L._mainSt[(j * MPX + 2) * M.W + i * MPX + 2] : pr) > 0.5 ? 1 : 0, w2 = pb > 0.5 && L.theme !== 'cave' ? 1 : 0;   // (Veba Şehri: R is the gardens)
      const o = (j * L.W + i) * 4, sh = L.theme === 'dairy' ? 1 : 1 - ao * 0.35;   // (dairy: G is the floor coverage, not AO)
      for (let c3 = 0; c3 < 3; c3++) id.data[o + c3] = (w2 ? pal[2][c3] : w1 ? pal[1][c3] : pal[0][c3]) * sh;
      id.data[o + 3] = 255;
    }
    const TW = L._town;
    if (TW) {   // Veba Şehri: the river and the canals (translucent blue, not a floor plate) and the city walls (a thin sandstone line)
      for (let j = 0; j < L.H; j++) for (let i = 0; i < L.W; i++) {
        const o = (j * L.W + i) * 4;
        if (L.grid[j * L.W + i]) continue;
        const w = TW.lava[(j * MPX + 2) * TW.MW + i * MPX + 2];
        if (w > 0.5) { id.data[o] = 92; id.data[o + 1] = 176; id.data[o + 2] = 232; id.data[o + 3] = 150; }
      }
      for (const q of (TW.wallPts || []).concat(TW.wallIn || [])) {   // (the ring and the old town wall's spurs)
        const i = Math.floor(q.x), j = Math.floor(q.z);
        if (i < 0 || j < 0 || i >= L.W || j >= L.H || L.grid[j * L.W + i]) continue;
        const o = (j * L.W + i) * 4; id.data[o] = 200; id.data[o + 1] = 164; id.data[o + 2] = 118; id.data[o + 3] = 170;
      }
    }
    g.putImageData(id, 0, 0);
    L.mapCanvas = c;
  }

  // ── Theme lighting ──
  const THEME = {
    forest: { moss: [0x383d46, 0.75], rim: [0x646e7c, 0.1], fog: [0x565e6a, 36, 84], hemiSky: 0x87909b, hemiGround: 0x484b50, hemi: 1.3585, sunColor: 0x89929c, sun: 2.6, sunOffset: [-12, 26, 14],
      env: [0x565e6a, 0x616a78, 0x2d3138, 1.0], bloom: 0.5, exposure: 1.18, fezaLight: 0, fezaLightColor: 0x795058, sat: 1.04 },
    cave: { moss: [0x3b4049, 0.35], rim: [0x575f6c, 0.14], fog: [0x17181c, 15, 42], hemiSky: 0xa2a4b5, hemiGround: 0x5b5362, hemi: .5712, sunColor: 0xa2a4b5, sun: 0.6, sunOffset: [-10, 26, 12],
      env: [0x2c2f36, 0x212228, 0x17181d, 0.45], bloom: 0.9, exposure: 1.38, fezaLight: 6, fezaLightColor: 0xbfb19a, sat: 1.12 },
    castle: { moss: [0x393e47, 0], rim: [0x5d6572, 0.08], fog: [0x251d22, 26, 64], hemiSky: 0xa0a3b2, hemiGround: 0x64535f, hemi: 1.0416, sunColor: 0x9b8882, sun: 1.6, sunOffset: [-11, 26, 13],
      env: [0x4d353c, 0x744d55, 0x241d21, 0.75], bloom: 0.72, exposure: 1.26, fezaLight: 1.1, fezaLightColor: 0xbcabb4, sat: 1.1 },
    // bright, warm and cheerful: a peach sky-fog, a strong warm sun, orange bounce light from the lava
    volcano: { moss: [0x505863, 0], rim: [0x6f4a52, 0.15], fog: [0x6a474e, 30, 78], hemiSky: 0x818b98, hemiGround: 0x514139, hemi: 1.2155, sunColor: 0x87919c, sun: 2.3, sunOffset: [-12, 26, 14],
      env: [0x5f6875, 0x714b53, 0x291f24, 0.85], bloom: 0.55, exposure: 1.18, fezaLight: 0.35, fezaLightColor: 0x744d55, sat: 1.06 },
    // a bright, creamy pastel morning: peach-pink haze, a warm soft sun, a pale sky and creamy bounce light (the ground is white:
    // the sun is softer than the forest's so nothing blows out)
    // (neutral creamy bounce light, a paler haze, less saturation and a lighter vignette: the pink/tan cast made the yogurt read as sand)
    dairy: { moss: [0x606a77, 0], rim: [0x646e7c, 0.1], fog: [0x606a77, 36, 92], hemiSky: 0x858e98, hemiGround: 0x858777, hemi: .7865, sunColor: 0x87919c, sun: 1.9, sunOffset: [-12, 26, 14],
      env: [0x5e6774, 0x646e7b, 0x5c6572, 0.55], bloom: 0.28, exposure: 1.18, fezaLight: 0, fezaLightColor: 0x795058, sat: 1.06, vig: 0.18 },
    // a warm, golden afternoon: a peach-lavender haze, a golden sun a little lower in the west (soft long shadows down the streets),
    // warm bounce light from the honey stones, a clear pale-blue sky in the canals' reflections
    town: { moss: [0x3e434c, 0.3], rim: [0x636d7a, 0.1], fog: [0x5c6572, 40, 100], hemiSky: 0x7f8994, hemiGround: 0x756251, hemi: 1.1154, sunColor: 0x808a96, sun: 2.35, sunOffset: [-15, 24, 12],
      env: [0x59626f, 0x606976, 0x533940, 0.8], bloom: 0.42, exposure: 1.18, fezaLight: 0, fezaLightColor: 0x795058, sat: 1.08, vig: 0.22 },
  };

  // ── Instancing (chunked ~16 m for frustum culling) and merged static decor per chunk ──
  const WHITE = new THREE.Color(1, 1, 1);
  const KIND = {};   // kind → { geo(), mat: key, shadow: true|false|'near', recv }
  function kgeo(k) { return R.geo['k_' + k] || (R.geo['k_' + k] = keep(KIND[k].geo())); }
  // inst / dec return a handle { arr, item } so a build-time prop can be taken out again (see fixReach)
  function inst(B, kind, m, col) {
    const x = m.elements[12], z = m.elements[14], arr = B.inst[kind] || (B.inst[kind] = []), item = { x, z, m, c: col || null };
    arr.push(item);
    return { arr, item };
  }
  function dec(B, matKey, geo, m, col) {
    if (matKey === 'food') matKey = 'shiny';   // cheese, biscuits and berries share the glossy decor chunks (fewer draw calls)
    const ck = B.ck || CHUNK, key = matKey + '|' + Math.floor(m.elements[12] / ck) + '|' + Math.floor(m.elements[14] / ck);
    const arr = B.dec[key] || (B.dec[key] = []), item = { geo, m, c: col || null };
    arr.push(item);
    return { arr, item };
  }
  // a collision circle whose visuals (inst / dec handles) can be removed again if it turns out to cut a route
  function propSolid(L, x, z, r, tag, vis) {
    const s = { x, z, r, alive: true, tag, vis: vis || [], built: true };
    L.solids.push(s);
    return s;
  }
  function finishInst(L, B) {
    const near = (x0, z0, sz) => satCount(L, x0 - 6, z0 - 6, x0 + sz + 6, z0 + sz + 6) > 0;
    for (const kind in B.inst) {
      const K = KIND[kind], list = B.inst[kind], chunks = new Map();
      const ck = B.ck || CHUNK;
      for (const it of list) { const key = Math.floor(it.x / ck) * 4096 + Math.floor(it.z / ck); let a = chunks.get(key); if (!a) chunks.set(key, a = []); a.push(it); }
      const geo = kgeo(kind), mat = R.mat[K.mat];
      for (const [key, a] of chunks) {
        const im = new THREE.InstancedMesh(geo, mat, a.length), anyCol = a.some(it => it.c);
        for (let i = 0; i < a.length; i++) { im.setMatrixAt(i, a[i].m); if (anyCol) im.setColorAt(i, a[i].c || WHITE); }
        const cx = Math.floor(key / 4096), cz = key - cx * 4096;
        const cast = K.shadow === true || (K.shadow === 'near' && near(cx * ck, cz * ck, ck));
        if (K.proxy) {   // cheap stand-ins cast the shadow instead of the detailed mesh
          im.castShadow = false;
          if (cast) for (const it of a) {
            const pk = Math.floor(it.x / 32) * 4096 + Math.floor(it.z / 32), P = B.prox[pk] || (B.prox[pk] = { c: [], t: [] }), c = K.proxy.c, t = K.proxy.t;
            P.c.push(new THREE.Matrix4().multiplyMatrices(it.m, _m.compose(_v.set(0, c[0], 0), _q.identity(), _s.set(c[1], c[2], c[1]))));
            if (t) P.t.push(new THREE.Matrix4().multiplyMatrices(it.m, _m.compose(_v.set(0, 0, 0), _q.identity(), _s.set(t[1], t[0], t[1]))));
          }
        } else im.castShadow = cast;
        im.receiveShadow = K.recv !== false;
        im.computeBoundingSphere();
        im.name = kind;
        B.g.add(im);
      }
    }
    const pm = R.mat.proxy || (R.mat.proxy = keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })));
    const pc = R.geo.proxC || (R.geo.proxC = keep(new THREE.IcosahedronGeometry(1, 0)));
    const pt = R.geo.proxT || (R.geo.proxT = keep(new THREE.CylinderGeometry(0.7, 1, 1, 5, 1, true).translate(0, 0.5, 0)));
    for (const k in B.prox) for (const [g, list] of [[pc, B.prox[k].c], [pt, B.prox[k].t]]) {
      if (!list.length) continue;
      const im = new THREE.InstancedMesh(g, pm, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = true; im.receiveShadow = false; im.computeBoundingSphere(); im.name = 'shadow-proxy';
      B.g.add(im);
    }
  }
  // (yog: the yogurt hills cast through cheap low-poly stand-ins, 'yogSh', instead of their detailed meshes)
  const DEC_CAST = { prop: 1, stone: 1, plaster: 1, roof: 1, brick: 1, rock: 1, shiny: 1, gold: 1, coin: 1, soil: 1, food: 1, copper: 1, yogSh: 1, ramp: 1, roofN: 1 };
  function finishDecor(L, B) {
    for (const key in B.dec) {
      const mk = key.split('|')[0], sh = mk === 'yogSh', mesh = new THREE.Mesh(mergeList(B.dec[key]), sh ? R.mat.proxy || (R.mat.proxy = keep(new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))) : R.mat[mk]);
      mesh.receiveShadow = mk !== 'glow' && mk !== 'window' && !sh;
      mesh.castShadow = !!DEC_CAST[mk];
      mesh.name = sh ? 'shadow-proxy' : 'decor-' + mk;
      B.g.add(mesh);
      if (mk === 'decor' || mk === 'gloss') { const bs = mesh.geometry.boundingSphere; B.far.push({ o: mesh, x: bs.center.x, z: bs.center.z, r: bs.radius }); }
    }
  }
  // Would a volume (radius cr, heights yb..yt) standing at (x,z) hide any floor from the gameplay camera?
  // Floor cells (count) that an object standing ON the floor (radius cr, height yt) hides north of its own footprint
  function hiddenBehind(L, x, z, cr, yt) {
    return satCount(L, x - cr * 0.7, z - cr - Math.max(0, yt - 0.5) * LV_PK, x + cr * 0.7, z - cr - 0.1);
  }
  function hides(L, x, z, cr, yb, yt, sh = 0.3) {
    const k = LV_PK, y0 = 0.5;
    const z0 = z - cr - Math.max(0, yt - y0) * k + sh, z1 = z + cr - Math.max(0, yb - y0) * k - sh;
    if (z1 <= z0) return false;
    return satCount(L, x - cr + sh, z0, x + cr - sh, z1) > 0;
  }

  // How far a prop stands on the camera side of the walkable floor: metres north from (x, z) to floor inside a cone that widens
  // northward (99: none within 8 m). southCap: the highest top (m) allowed there — `near` within 2 m, `mid` within 5 m, further
  // out the top must stay ≥ 3 m (on screen) south of the floor edge; props with no floor to their north are free.
  function southGap(L, x, z) {
    for (let j = Math.floor(z) - 1; j >= Math.max(0, Math.floor(z) - 8); j--) {
      const dz = Math.max(0, z - (j + 1));
      if (satCount(L, x - 0.9 - dz * 0.45, j, x + 0.9 + dz * 0.45, j + 1) > 0) return dz;
    }
    return 99;
  }
  const southCap = (g, near, mid) => g <= 2 ? near : g <= 5 ? mid : g < 99 ? Math.max(mid, (g - 3) / LV_PK) : 1e9;

  // ── Prototype geometries ──
  const leafBlob = i => R.geo['leaf' + i] || (R.geo['leaf' + i] = lumpy(2, 0.17, 101 + i * 17, { uv: 10 }));
  const leafBlob1 = i => R.geo['leaf1' + i] || (R.geo['leaf1' + i] = lumpy(1, 0.19, 151 + i * 19, { uv: 10 }));
  const leafBlobLo = i => R.geo['leafL' + i] || (R.geo['leafL' + i] = lumpy(1, 0.17, 131 + i * 13, { uv: 10, flat: -0.35 }));   // bushes: detail 1 (80 tris)
  const leafRamp = (y0, y1) => (x, y, z) => {
    const t = clamp((y - y0) / (y1 - y0), 0, 1), v = 0.42 + 0.72 * t, w = 0.06 * Math.sin(x * 3.1 + z * 2.3);
    return new THREE.Color(v * (1.02 + t * 0.06) + w, v + w, v * (0.9 - t * 0.08) + w);
  };
  const BARK = 0x33373f;
  function canopy(k, blobs, y0, y1, lo) {
    // Bare claw branches occupy the old canopy bounds, retaining the same visibility and shadow rules.
    blobs.forEach((c, i) => {
      const root = [c[0] * 0.35, Math.max(0.12, y0), c[2] * 0.35], end = [c[0] * 1.2 + Math.sin(i * 2.1) * c[3] * 0.65, c[1] + c[3] * 0.5, c[2] * 1.2];
      k.seg(root, end, lo ? 0.045 : 0.095, 0x353942, lo ? 0.012 : 0.02, 6);
      k.seg(end, [end[0] + Math.cos(i) * c[3] * 0.45, end[1] + c[3] * 0.35, end[2] + Math.sin(i) * 0.4], 0.025, 0x3e444d, 0.006, 5);
    });
  }
  function roots(k, r, n, col, y = 0.35) {
    for (let a = 0; a < n; a++) { const an = a * TAU / n + 0.4; k.seg([Math.cos(an) * r * 0.3, y, Math.sin(an) * r * 0.3], [Math.cos(an) * r * 1.7, -0.06, Math.sin(an) * r * 1.7], r * 0.36, col, r * 0.12, 6); }
  }
  const SPEC = {   // canopy radius / bottom / top at scale 1 (for the occlusion test)
    oak: { cr: 2.25, yb: 1.9, yt: 5.3 }, blossom: { cr: 2.5, yb: 1.9, yt: 4.3 }, pine: { cr: 1.75, yb: 0.5, yt: 5.1 },
    lolli: { cr: 1.55, yb: 1.7, yt: 4.8 }, bush: { cr: 0.95, yb: 0, yt: 1.05 },
  };
  KIND.oak = { mat: 'foliage', shadow: 'near', proxy: { c: [3.5, 1.9, 1.3], t: [2.4, 0.3] }, geo() {
    const k = new Kit();
    k.seg([0, -0.1, 0], [0.06, 2.4, 0.03], 0.34, BARK, 0.21, 12); roots(k, 0.34, 5, BARK);
    k.seg([0.05, 1.8, 0], [0.85, 2.75, 0.25], 0.13, BARK, 0.07, 8);
    k.seg([0.02, 2.0, 0], [-0.75, 2.9, -0.3], 0.12, BARK, 0.06, 8);
    canopy(k, [[0, 3.55, 0, 1.5], [1.0, 3.15, 0.35, 1.1], [-0.95, 3.2, -0.25, 1.12], [0.25, 3.1, 1.0, 1.0], [-0.3, 3.15, -0.95, 1.02], [0.15, 4.3, 0.1, 1.02]], 2.0, 5.2);
    return k.build();
  } };
  KIND.blossom = { mat: 'foliage', shadow: 'near', proxy: { c: [3.1, 2.1, 0.9], t: [2.0, 0.26] }, geo() {
    const k = new Kit(), bc = 0x494f5a;
    k.seg([0, -0.1, 0], [0.28, 1.25, 0.05], 0.3, bc, 0.22, 10); roots(k, 0.3, 4, bc);
    k.seg([0.28, 1.2, 0.05], [0.05, 2.0, -0.1], 0.22, bc, 0.16, 10);
    k.seg([0.05, 1.9, -0.1], [1.1, 2.7, 0.3], 0.12, bc, 0.06, 7); k.seg([0.05, 1.9, -0.1], [-1.05, 2.75, 0.1], 0.12, bc, 0.06, 7);
    k.seg([0.1, 2.0, 0], [0.2, 2.85, -0.95], 0.1, bc, 0.05, 7); k.seg([0.1, 2.0, 0], [-0.2, 2.8, 1.0], 0.1, bc, 0.05, 7);
    canopy(k, [[1.2, 3.0, 0.35, 1.0, 0.75], [-1.15, 3.05, 0.1, 1.02, 0.75], [0.25, 2.95, -1.1, 0.95, 0.75], [-0.2, 2.95, 1.1, 0.95, 0.75], [0, 3.45, 0, 1.2, 0.8], [0.8, 3.5, -0.6, 0.8, 0.8], [-0.7, 3.55, 0.6, 0.8, 0.8]], 2.3, 4.2);
    return k.build();
  } };
  KIND.pine = { mat:'foliage',shadow:'near',proxy:{c:[2.7,1.35,2.2],t:[1.3,0.2]},geo(){
    const k=new Kit(),wood=0xb19b7d;
    k.seg([0,-.1,0],[.08,4.45,.02],.23,wood,.055,10);roots(k,.24,4,wood,.25);
    for(let i=0;i<9;i++){const y=1.05+i*.36,a=i*2.4,span=1.18-i*.085,x=Math.cos(a)*span,z=Math.sin(a)*span;k.seg([.03,y,0],[x,y+.18,z],.065,wood,.016,6);k.seg([x,y+.18,z],[x*.94,y+.57,z*.9],.022,0xc3b08c,.006,5);}
    k.seg([.06,3.9,0],[-.3,4.84,.12],.047,wood,.013,6);return k.build();
  } };
  KIND.lolli = { mat: 'foliage', shadow: 'near', proxy: { c: [3.35, 1.35, 1.2], t: [2.3, 0.22] }, geo() {
    const k = new Kit();
    k.seg([0, -0.1, 0], [0, 2.3, 0], 0.23, BARK, 0.16, 10); roots(k, 0.23, 4, BARK, 0.3);
    canopy(k, [[0, 3.35, 0, 1.42], [0.8, 2.95, 0.3, 0.78], [-0.72, 3.05, -0.35, 0.76], [0.2, 4.1, 0.05, 0.85]], 2.1, 4.8);
    return k.build();
  } };
  KIND.bush = { mat: 'foliage', shadow: false, geo() {
    const k = new Kit();
    canopy(k, [[0, 0.46, 0, 0.68], [0.56, 0.34, 0.18, 0.52], [-0.52, 0.36, -0.08, 0.54], [0.0, 0.33, 0.56, 0.48]], -0.1, 1.05, true);
    return k.build();
  } };
  function bushDotsGeo() {
    if (R.geo.bushDots) return R.geo.bushDots;
    const k = new Kit();
    for(let i=0;i<7;i++) { const a=i*TAU/7; k.seg([0,0.25,0],[Math.cos(a)*0.65,0.7+(i%3)*0.1,Math.sin(a)*0.65],0.028,0x40454f,0.006,5); }
    return (R.geo.bushDots = keep(k.build()));
  }
  function addBush(B, m, col, flowers) {
    inst(B, 'bush', m, col);
    if (flowers) dec(B, 'decor', bushDotsGeo(), m, null);
  }
  KIND.stump = { mat: 'foliage', shadow: true, geo() {
    const k = new Kit();
    k.seg([0, -0.1, 0], [0, 0.55, 0], 0.46, BARK, 0.42, 14); roots(k, 0.42, 5, BARK, 0.3);
    k.add(marked(G.cyl(1, 1, 14), 20), 0x6e4951, [0, 0.555, 0], 0, [0.4, 0.02, 0.4]);
    k.add(marked(G.torus(TAU, 0.05, 20), 20), 0x543a40, [0, 0.568, 0], [Math.PI / 2, 0, 0], [0.26, 0.26, 0.26]);
    k.add(marked(G.torus(TAU, 0.08, 20), 20), 0x5d3f46, [0, 0.568, 0], [Math.PI / 2, 0, 0], [0.13, 0.13, 0.13]);
    return k.build();
  } };
  const rockGeo = i => R.geo['rock' + i] || (R.geo['rock' + i] = lumpy(2, 0.18 + i * 0.03, 501 + i * 31, { flat: -0.3, crag: 1.1 }));
  for (let i = 0; i < 3; i++) KIND['rock' + i] = { mat: 'rock', shadow: 'near', proxy: { c: [0.3, 0.95, 0.7] }, geo: () => { const k = new Kit(); k.add(rockGeo(i), 0xffffff); return k.build(); } };
  const rockSGeo = () => R.geo.rockS || (R.geo.rockS = lumpy(1, 0.2, 577, { flat: -0.3, crag: 1.0 }));   // small low rocks (80 tris): the cave's camera-side band
  KIND.rockS = { mat: 'rock', shadow: false, geo: () => { const k = new Kit(); k.add(rockSGeo(), 0xffffff); return k.build(); } };
  KIND.stal = { mat: 'rock', shadow: 'near', geo() {
    const k = new Kit(), c = i => R.geo['st' + i] || (R.geo['st' + i] = lumpyCone(700 + i, 10, 0.02, 0));
    k.add(c(0), 0xffffff, [0, 0.9, 0], 0, [0.42, 1.8, 0.42]); k.add(c(1), 0x606976, [0.35, 0.45, 0.12], [0, 1, 0.12], [0.22, 0.9, 0.22]);
    k.add(c(2), 0x626c7a, [-0.28, 0.32, -0.15], [0, 2, -0.1], [0.18, 0.64, 0.18]);
    return k.build();
  } };

  // Decor prototypes (vertex coloured, merged per chunk). uv 30 = sways in the wind.
  function petalDisc() {
    return R.geo.petal || (R.geo.petal = (() => {
      const g = new THREE.CircleGeometry(1, 10), P = g.attributes.position;   // 10 segments: tips + valleys of the 5 petals
      for (let i = 1; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), a = Math.atan2(y, x), k = 0.68 + 0.19 * Math.sin(a * 3.1) + 0.12 * Math.cos(a * 7.3);
        P.setXYZ(i, x * k, y * k, (x * x + y * y) * k * k * 0.28);
      }
      g.rotateX(-Math.PI / 2); g.computeVertexNormals(); markUV(g, 30);
      return keep(g);
    })());
  }
  const FLOWER_COL = [0x636c7a, 0x5c6572, 0x6b484f, 0x4c535d, 0x5a3d44, 0x64434a, 0x69464e];
  function flowerGeo(ci) {
    const key='fl'+ci;if(R.geo[key])return R.geo[key];const k=new Kit(),wood=0x917d60,bone=0xb5a382;
    if(ci%3===0){k.seg([-.11,.02,0],[.08,.27,.015],.02,wood,.012,5);k.seg([.02,.19,0],[.15,.29,-.03],.014,wood,.005,5);}
    else if(ci%3===1){k.seg([-.14,.028,-.04],[.13,.055,.035],.022,bone,.025,6);for(const x of [-.13,.13])k.add(G.octa(),bone,[x,.055,.02],0,[.035,.024,.04]);}
    else{for(let i=0;i<4;i++){const a=i*TAU/4;k.seg([0,0,0],[Math.cos(a)*.09,.22+(i%2)*.055,Math.sin(a)*.09],.012,0x897b5e,.004,5);}k.add(G.octa(),0x6c4937,[0,.23,0],0,[.04,.05,.04]);}
    return(R.geo[key]=keep(k.build()));
  }
  const bladeGeo = () => R.geo.blade || (R.geo.blade = keep(markUV(new THREE.ConeGeometry(1, 1, 3, 1, true), 30)));   // 3 tris
  function tuftGeo(v) {
    const key = 'tuft' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(900 + v), blade = bladeGeo();
    const base = new THREE.Color(0x4b4639), tip = new THREE.Color(v === 2 ? 0x817e58 : 0x79664c);
    const n = 7 + v * 2;
    for (let i = 0; i < n; i++) {
      const h = 0.22 + rnd() * 0.28, a = rnd() * TAU, r = rnd() * 0.12;
      k.add(blade, (x, y) => base.clone().lerp(tip, clamp(y / 0.45, 0, 1)), [Math.cos(a) * r, h / 2, Math.sin(a) * r], [Math.sin(a) * 0.35, a, Math.cos(a) * 0.35], [0.028, h, 0.028]);
    }
    return (R.geo[key] = keep(k.build()));
  }
  function mushroomGeo(v) {
    const key='mush'+v; if(R.geo[key]) return R.geo[key]; const k=new Kit();
    k.seg([0,0,0],[0.02,0.48,0],0.045,0x2d3138,0.018,6);
    k.seg([-0.13,0.31,0],[0.15,0.36,0],0.025,0x40454f,0.025,5);
    k.add(G.cone(5),0x3f444d,[0.02,0.52,0],0,[0.065,0.12,0.065]);
    return (R.geo[key]=keep(k.build()));
  }
  function fernGeo() {   // tall grass clump (softens the edge of the walkable area)
    if (R.geo.fern) return R.geo.fern;
    const k = new Kit(), rnd = mulberry32(31), blade = bladeGeo();
    const base = new THREE.Color(0x49473a), tip = new THREE.Color(0x81765b);
    for (let i = 0; i < 16; i++) {
      const h = 0.4 + rnd() * 0.4, a = rnd() * TAU, r = rnd() * 0.18, tl = 0.2 + rnd() * 0.45;
      k.add(blade, (x, y) => base.clone().lerp(tip, clamp(y / 0.7, 0, 1)), [Math.cos(a) * r, h / 2 - 0.02, Math.sin(a) * r], [Math.sin(a) * tl, a, Math.cos(a) * tl], [0.035, h, 0.035]);
    }
    return (R.geo.fern = keep(k.build()));
  }
  function pebbleGeo(v, cave) {   // cave: light blue-grey stones (brown ones read as lumps under the blue light)
    const key = (cave ? 'pebC' : 'peb') + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(1200 + v), rg = lumpy(1, 0.22, 1300 + v, { flat: -0.3 });
    const n = v === 0 ? 1 : 3 + v;
    for (let i = 0; i < n; i++) {
      const s = v === 0 ? 0.32 : 0.06 + rnd() * 0.07, c = cave ? new THREE.Color().setHSL(0.6 + rnd() * 0.05, 0.12, 0.48 + rnd() * 0.12, THREE.SRGBColorSpace)
        : new THREE.Color().setHSL(0.07 + rnd() * 0.06, 0.12, 0.36 + rnd() * 0.16, THREE.SRGBColorSpace);
      k.add(rg, (x, y) => (y > s * 0.35 && v === 0 ? c.clone().lerp(new THREE.Color(0x3d434c), 0.55) : c), [(rnd() - 0.5) * 0.5 * (n > 1), s * 0.25, (rnd() - 0.5) * 0.5 * (n > 1)], [rnd(), rnd() * 6, rnd()], [s * 1.2, s * 0.8, s]);
    }
    return (R.geo[key] = keep(k.build()));
  }

  // ── Forest ──
  const PAL = {
    green: [0x292c33, 0x282b31, 0x2b2e35, 0x272930, 0x2c2f36],
    autumn: [0x35272c, 0x31242a, 0x39292f, 0x2e2228],
    blossom: [0x3d2c32, 0x3b2b30, 0x402d33, 0x3a2a30],
    pine: [0x24262d, 0x26282f, 0x23252b],
    lolli: [0x2c3037, 0x2b2e35, 0x2e3138],
  };
  function treeLayer(L, B, opt) {
    const rnd = B.rnd, W = L.W, H = L.H, dF = L._dF, s1 = (L.seed & 0xffff) + 5, s2 = s1 + 9;
    const bCap = g => southCap(g, 0.85, 1.15);   // bushes: top ≤ 0.85 m within 2 m south of the floor, ≤ 1.15 m within 5 m
    const blocked = (x, z, r) => B.noTree.some(o => hyp(o.x - x, o.z - z) < o.r + r);
    const cell = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const place = (sp, x, z, s, colPal) => {
      inst(B, sp, mat4(x, 0, z, rnd() * TAU, s, s * (0.92 + rnd() * 0.16), s), lin(pick(colPal), 0.94 + rnd() * 0.12));
      if ((sp === 'blossom' || colPal === PAL.autumn) && dF[cell(x, z)] < 5 && rnd() < 0.5) opt.petals.push([x, z, s, colPal]);
    };
    // trees: dense near the play area, sparser and bigger further out
    for (let z0 = 0; z0 < H; z0 += 2.7) for (let x0 = 0; x0 < W; x0 += 2.7) {
      const x = x0 + rnd() * 2.5, z = z0 + rnd() * 2.5, c = cell(x, z);
      if (c < 0 || L.grid[c]) continue;
      const d = dF[c];
      if (d < 1.2) continue;
      const far = d > 6.5;
      if (far && rnd() < 0.55) continue;
      if (blocked(x, z, 1.6)) continue;
      const b = vnoise(x / 17, z / 17, s1), au = vnoise(x / 12, z / 12, s2) > 0.42;
      let sp = b > 0.33 ? (rnd() < 0.72 ? 'blossom' : 'lolli') : b < -0.38 ? (rnd() < 0.75 ? 'pine' : 'oak') : (rnd() < 0.55 ? 'oak' : rnd() < 0.65 ? 'lolli' : 'pine');
      let s = (0.85 + rnd() * 0.35) * (far ? 1.4 : 1);
      const tries = [[sp, s], [sp, s * 0.72], ['lolli', 0.66], ['lolli', 0.5]];
      const g = southGap(L, x, z), tCap = southCap(g, 0, 0);   // camera side: no trees within 5 m south of the floor, then graded
      let done = false;
      for (const [q, k] of tries) {
        const S = SPEC[q];
        if (S.yt * k > tCap || hides(L, x, z, S.cr * k, S.yb * k, S.yt * k)) continue;
        const pal = q === 'blossom' ? PAL.blossom : q === 'pine' ? PAL.pine : au ? PAL.autumn : q === 'lolli' ? PAL.lolli : PAL.green;
        place(q, x, z, k, pal); done = true; break;
      }
      if (!done && (d < 4 || g <= 5)) {
        const k = 0.8 + rnd() * 0.4, ky = Math.min(k, bCap(g) / 1.05);
        if (!hides(L, x, z, 0.95 * k, 0, 1.05 * ky, 0.85)) addBush(B, mat4(x, 0, z, rnd() * TAU, k, ky, k), lin(pick(PAL.green), 0.9 + rnd() * 0.15), rnd() < 0.3);
      }
    }
    // bushes hide the cell-shaped edge of the walkable area (the only thing allowed on the camera side)
    for (let z0 = 0; z0 < H; z0 += 1.2) for (let x0 = 0; x0 < W; x0 += 1.2) {
      const x = x0 + rnd() * 1.1, z = z0 + rnd() * 1.1, c = cell(x, z);
      if (c < 0 || L.grid[c]) continue;
      const d = dF[c];
      if (d < 0.5 || d > 2.5 || rnd() < (d > 1.8 ? 0.5 : 0.12)) continue;
      if (blocked(x, z, 0.8)) continue;
      let s = 0.85 + rnd() * 0.4;
      if (hides(L, x, z, 0.95 * s, 0, 1.05 * s, 0.85)) s *= 0.7;
      const sy = Math.min(s * (0.85 + rnd() * 0.3), bCap(southGap(L, x, z)) / 1.05);   // lower on the camera side (a soft hedge)
      addBush(B, mat4(x, 0, z, rnd() * TAU, s, sy, s), lin(pick(PAL.green), 0.88 + rnd() * 0.2), rnd() < 0.28);
    }
  }
  function buildForest(L, B) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid, dW = L.dWall, M = L._mask;
    L._dF = chamfer(W, H, grid, 1);
    const opt = { petals: [] }, arenaPlan = forestArenaPlan(L, B);   // the arena's giant toadstools keep the trees away first
    treeLayer(L, B, opt);
    const maskAt = (x, z, ch) => { const px = clamp(Math.floor(x * MPX), 0, M.W - 1), py = clamp(Math.floor(z * MPX), 0, M.H - 1); return M.data[(py * M.W + px) * 4 + ch] / 255; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    // stumps + mossy rocks just outside the walkable edge
    for (let n = 0; n < W * H / 260; n++) {
      const x = rnd() * W, z = rnd() * H, c = Math.floor(z) * W + Math.floor(x);
      if (grid[c] || L._dF[c] < 1 || L._dF[c] > 3.2 || B.noTree.some(o => hyp(o.x - x, o.z - z) < o.r + 1)) continue;
      if (rnd() < 0.35) inst(B, 'stump', mat4(x, 0, z, rnd() * TAU, 0.7 + rnd() * 0.5));
      else inst(B, 'rock' + (n % 3), mat4(x, 0, z, rnd() * TAU, 0.5 + rnd() * 0.6, 0.4 + rnd() * 0.4, 0.5 + rnd() * 0.6), lin(0x494f5a, 0.8 + rnd() * 0.25));
    }
    // ground cover inside and along the edge
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const c = j * W + i, fl = grid[c], d = fl ? dW[c] : -L._dF[c];
      if ((!fl && d < -1.6) || B.noDec[c]) continue;
      for (let t = 0; t < 2; t++) {
        const x = i + rnd(), z = j + rnd(), pv = maskAt(x, z, 0), pl = maskAt(x, z, 2);
        const open = (1 - smooth01((pv - 0.3) * 4)) * (1 - smooth01((pl - 0.3) * 4));
        const edge = fl ? clamp(1.8 - d * 0.45, 0.25, 1) : 1;
        if (rnd() < 0.3 * open * edge) dec(B, 'decor', tuftGeo(Math.floor(rnd() * 3)), mat4(x, 0, z, rnd() * TAU, (fl && d > 2 ? 0.9 : 1.3) + rnd() * 0.7), null);
        if (fl && open > 0.9 && rnd() < 0.035) dec(B, 'decor', flowerGeo(rnd() < 0.6 ? 0 : 1), mat4(x, 0, z, rnd() * TAU, 0.62 + rnd() * 0.25), null);   // lone daisies
        if (!fl && rnd() < 0.18) dec(B, 'decor', fernGeo(), mat4(x, 0, z, rnd() * TAU, 0.8 + rnd() * 0.6), lin(0xffffff, 0.85 + rnd() * 0.3));
        if (fl && d < 2.2 && rnd() < 0.012 * open) {
          const v = Math.floor(rnd() * 3);
          if (v === 0) inst(B, 'rock' + Math.floor(rnd() * 3), mat4(x, 0.05, z, rnd() * TAU, 0.28 + rnd() * 0.2, 0.2 + rnd() * 0.15, 0.28 + rnd() * 0.2), lin(0x494f5a, 0.8 + rnd() * 0.25));
          else dec(B, 'decor', pebbleGeo(v), mat4(x, 0, z, rnd() * TAU, 1), null);
        }
        if (fl && d < 2 && rnd() < 0.008 * open) {
          const v = Math.floor(rnd() * 2) * (rnd() < 0.8 ? 0 : 1), n = 1 + Math.floor(rnd() * 3);
          for (let m = 0; m < n; m++) dec(B, 'decor', mushroomGeo(v), mat4(x + (rnd() - 0.5) * 0.6, 0, z + (rnd() - 0.5) * 0.6, rnd() * TAU, 0.7 + rnd() * 0.7), null);
        }
      }
    }
    // flower patches (+ a little blossom drifting in the breeze over some of them; no insects: Feza's rule)
    const nPatch = Math.round(L.W * L.H / 70);
    for (let n = 0; n < nPatch; n++) {
      const x = 1 + rnd() * (W - 2), z = 1 + rnd() * (H - 2), c = Math.floor(z) * W + Math.floor(x);
      const d = grid[c] ? dW[c] : -L._dF[c];
      if (d < -1.4 || maskAt(x, z, 0) > 0.35 || maskAt(x, z, 2) > 0.35 || (grid[c] && d > 3.5 && rnd() < 0.45) || B.noDec[c]) continue;
      const ci = Math.floor(rnd() * FLOWER_COL.length), mix = rnd() < 0.35, cnt = 4 + Math.floor(rnd() * 7);
      for (let m = 0; m < cnt; m++) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.1, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, fi = mix ? Math.floor(rnd() * FLOWER_COL.length) : ci;
        if (B.noDec[Math.floor(pz) * W + Math.floor(px)]) continue;
        dec(B, 'decor', flowerGeo(fi), mat4(px, 0, pz, rnd() * TAU, 0.85 + rnd() * 0.5), null);
      }
      if (grid[c] && rnd() < 0.3) B.pts.norm.push({ x, y: 0.9, z, kind: 6, ph: rnd(), size: 0.34, prm: 0.7 + rnd() * 0.6, col: pick([0x58606d, 0x6f4a51, 0x555d6a, 0xffffff, 0x64434a]) });
    }
    forestArenaDecor(L, B, arenaPlan);
    // falling petals under blossom trees, soft light motes floating over the paths
    for (const [x, z, s, pal] of opt.petals) for (let m = 0; m < 3; m++)
      B.pts.norm.push({ x: x + (rnd() - 0.5) * 2.4 * s, y: 3.2 * s, z: z + (rnd() - 0.5) * 2.4 * s, kind: 5, ph: rnd(), size: pal === PAL.autumn ? 0.17 : 0.13, prm: 0.1 + rnd() * 0.06, col: pick(pal || PAL.blossom) });
    for (let n = 0; n < 70; n++) {
      const x = rnd() * W, z = rnd() * H;
      if (!grid[Math.floor(z) * W + Math.floor(x)]) continue;
      B.pts.add.push({ x, y: 0.6 + rnd() * 2.2, z, kind: 1, ph: rnd(), size: 0.09 + rnd() * 0.05, prm: 0.6 + rnd() * 0.8, col: lin(0x606977, 1.4) });
    }
  }

  // ── GPU-animated points: embers, motes, sparkles, portal swirl, glowing light motes, twinkles (additive) · petals, drifting blossoms, smoke (normal) ──
  const PT_VS = `uniform float uTime, uScale; uniform float uOn[16];
    attribute vec4 aData; attribute vec3 aCol; attribute float aGrp;
    varying vec3 vCol; varying float vA, vK, vF;
    void main() {
      float kind = aData.x, ph = aData.y, s = aData.z, prm = aData.w, t = uTime, a = 1.0;
      vec3 p = position; vF = 0.0;
      float on = uOn[int(aGrp + 0.5)];
      if (kind < 0.5) { float f = fract(t * prm + ph);
        p += vec3(sin(f * 6.0 + ph * 40.0) * 0.1, f * 1.1, cos(f * 5.0 + ph * 30.0) * 0.1); a = smoothstep(0.0, 0.12, f) * (1.0 - f); s *= 1.0 - f * 0.5;
      } else if (kind < 1.5) {
        p += vec3(sin(t * 0.21 * prm + ph * 6.3) * 1.3, sin(t * 0.4 * prm + ph * 3.1) * 0.35, cos(t * 0.17 * prm + ph * 4.7) * 1.3);
        a = 0.3 + 0.7 * (0.5 + 0.5 * sin(t * 1.3 + ph * 11.0));
      } else if (kind < 2.5) { float f = fract(t * prm + ph);
        p.y += f * 0.5; a = sin(f * 3.14159); s *= 0.5 + a * 0.7; vF = 1.0;
      } else if (kind < 3.5) { float f = fract(t * 0.3 + ph), an = ph * 6.2831 + t * 1.4;
        p += vec3(cos(an) * prm * (1.0 - f * 0.3), f * 3.0, sin(an) * 0.3); a = sin(f * 3.14159); vF = 1.0;
      } else if (kind < 4.5) {
        p += vec3(sin(t * 0.5 + ph * 6.3) * 1.4 + sin(t * 1.7 + ph * 9.0) * 0.25, sin(t * 0.9 + ph * 3.1) * 0.45, cos(t * 0.45 + ph * 4.7) * 1.4);
        a = smoothstep(0.2, 0.85, 0.5 + 0.5 * sin(t * 2.2 * prm + ph * 20.0));
      } else if (kind < 5.5) { float f = fract(t * prm + ph);
        p += vec3(sin(f * 9.0 + ph * 5.0) * 0.5 + f * 1.4, -position.y * f, cos(f * 7.0 + ph * 3.0) * 0.4);
        a = smoothstep(0.0, 0.08, f) * smoothstep(1.0, 0.85, f); vF = f * 25.0 + ph * 6.0;
      } else if (kind < 6.5) { float an = t * 0.45 * prm + ph * 6.28;   // blossom drifting in lazy loops on the breeze, slowly turning
        p += vec3(cos(an) * 1.3 + sin(an * 2.3) * 0.3, sin(t * 0.9 + ph * 9.0) * 0.2 + sin(an * 1.7) * 0.3, sin(an) * 0.9); vF = t * 0.8 * (prm - 0.4) * sign(ph - 0.5) + ph * 6.28;
      } else if (kind > 9.5) {   // fizzy kefir bubble: wobbles up ~1.2 m, grows a little, pops (normal blending)
        float f = fract(t * prm + ph);
        p += vec3(sin(f * 7.0 + ph * 30.0) * 0.07, f * 1.25, cos(f * 6.0 + ph * 20.0) * 0.07);
        a = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.86, 1.0, f)); s *= 0.55 + 0.65 * f; vF = f;
      } else if (kind > 8.5) {   // lava ember: drifts up ~3 m, glowing, fading
        float f = fract(t * prm + ph);
        p += vec3(sin(f * 5.0 + ph * 30.0) * 0.35 + f * 0.5, f * 3.2, cos(f * 4.0 + ph * 20.0) * 0.3);
        a = smoothstep(0.0, 0.08, f) * (1.0 - f) * (1.0 - f) * 1.4; s *= 1.0 - f * 0.55;
      } else if (kind > 7.5) {   // twinkle in place (sparkles on the snail-slime trails)
        a = pow(max(0.0, sin(t * 2.2 * prm + ph * 40.0)), 5.0); s *= 0.35 + 0.65 * a; vF = 1.0;
      } else { float f = fract(t * prm + ph);
        p += vec3(sin(f * 3.0 + ph * 9.0) * 0.3 + f * 0.7, f * 2.8, cos(f * 2.0 + ph * 7.0) * 0.2); s *= 0.5 + f * 1.8; a = smoothstep(0.0, 0.15, f) * (1.0 - f) * 0.5;
      }
      vCol = aCol; vA = a * on; vK = kind;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = on < 0.01 ? 0.0 : s * uScale / max(0.5, -mv.z);
    }`;
  const PT_FS = `varying vec3 vCol; varying float vA, vK, vF;
    void main() {
      vec2 c = gl_PointCoord - 0.5; c.y = -c.y;
      float d = length(c);
      if (vK > 5.5 && vK < 6.5) {   // torn ash and dry leaves; the original drift and particle budget stay intact
        float r=vF;vec2 q=mat2(cos(r),sin(r),-sin(r),cos(r))*c;
        float edge=abs(q.x)+abs(q.y)*0.48-0.18+0.025*sin(q.y*47.0);
        float shard=smoothstep(0.02,-0.015,edge);
        if(shard<0.05)discard;
        vec3 col=vCol*vec3(0.74,0.65,0.53)*(0.72+0.25*smoothstep(-0.12,0.1,q.x));
        gl_FragColor=vec4(col,shard*vA);
      } else if (vK > 9.5) {   // fizzy bubble: a thin bright rim, a faint film, a glint
        float rim = smoothstep(0.5, 0.43, d) * smoothstep(0.3, 0.41, d), film = smoothstep(0.5, 0.4, d) * 0.16;
        float gl = smoothstep(0.12, 0.03, length(c - vec2(-0.15, 0.16)));
        float al = max(max(rim * 0.85, film), gl);
        if (al * vA < 0.01) discard;
        gl_FragColor = vec4(mix(vCol, vec3(1.25), gl) * (0.85 + 0.25 * rim), al * vA);
      } else if (vK > 4.5 && vK < 5.5) {
        float r = vF; vec2 q = mat2(cos(r), sin(r), -sin(r), cos(r)) * c;
        float al = smoothstep(0.4, 0.28, length(q * vec2(1.0, 1.9)));
        if (al < 0.02) discard;
        gl_FragColor = vec4(vCol * (0.85 + 0.4 * (0.3 - q.y)), al * vA);
      } else if (vK > 6.5 && vK < 7.5) {
        float al = smoothstep(0.5, 0.05, d); al *= al;
        if (al * vA < 0.005) discard;
        gl_FragColor = vec4(vCol, al * vA);
      } else {
        float k = exp(-d * d * 24.0);
        if (vF > 0.5) k += max(0.0, 1.0 - abs(c.x) * 16.0 - abs(c.y) * 2.2) + max(0.0, 1.0 - abs(c.y) * 16.0 - abs(c.x) * 2.2);
        gl_FragColor = vec4(vCol * k * vA, 1.0);
      }
      #include <colorspace_fragment>
    }`;
  function finishPoints(L, B) {
    for (const mode of ['add', 'norm']) {
      const list = B.pts[mode];
      if (!list.length) continue;
      const n = list.length, pos = new Float32Array(n * 3), dat = new Float32Array(n * 4), col = new Float32Array(n * 3), grp = new Float32Array(n);
      list.forEach((p, i) => {
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        dat[i * 4] = p.kind; dat[i * 4 + 1] = p.ph; dat[i * 4 + 2] = p.size; dat[i * 4 + 3] = p.prm;
        const c = p.col && p.col.isColor ? p.col : lin(p.col ?? 0xffffff);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; grp[i] = p.grp || 0;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
      g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aGrp', new THREE.BufferAttribute(grp, 1));
      const mk = 'pts-' + mode, m = R.mat[mk] || (R.mat[mk] = keep(new THREE.ShaderMaterial({
        uniforms: { uTime: TIME.u, uScale: R.ptScale, uOn: R.ptOn }, vertexShader: PT_VS, fragmentShader: PT_FS,
        transparent: true, depthWrite: false, blending: mode === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending,
      })));
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false; pts.renderOrder = mode === 'add' ? 5 : 4; pts.name = 'pts-' + mode;
      B.g.add(pts);
    }
  }

  // ── Flames: one instanced billboard for every torch / brazier / candle ──
  const FLAME_VS = `uniform float uTime; varying vec2 vUv; varying float vPh;
    void main() {
      vUv = uv;
      vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float s = length(instanceMatrix[0].xyz);
      vPh = fract(c.x * 0.37 + c.z * 0.71) * 6.2831;
      vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
      vec3 wp = c.xyz + right * position.x * s + vec3(0.0, position.y * s, 0.0);
      gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    }`;
  const FLAME_FS = `uniform float uTime; varying vec2 vUv; varying float vPh;
    ${GLSL_NOISE}
    void main() {
      vec2 m = vec2((vUv.x - 0.5) * 0.8, vUv.y * 1.5 - 0.25);   // metres from the anchor (scale 1)
      float t = uTime + vPh;
      float n = lvVN(vec2(m.x * 7.0, m.y * 5.0 - t * 3.4)) * 0.6 + lvVN(vec2(m.x * 15.0 + 3.0, m.y * 10.0 - t * 5.5)) * 0.4;
      float y = m.y;
      float w = 0.13 * (1.0 - smoothstep(0.0, 0.58, y)) * smoothstep(-0.1, 0.03, y) + 0.003;
      float x = m.x + (n - 0.5) * 0.08 * smoothstep(0.0, 0.4, y) + sin(t * 2.3 + y * 8.0) * 0.015 * y;
      float d = abs(x) / w;
      float fl = smoothstep(1.0, 0.3, d + (n - 0.5) * 0.6 * smoothstep(0.03, 0.5, y)) * smoothstep(0.62, 0.3, y + n * 0.1);
      float core = smoothstep(0.6, 0.0, d) * smoothstep(0.3, 0.02, y) * smoothstep(-0.08, 0.02, y);
      vec3 col = mix(vec3(1.0, 0.22, 0.04), vec3(1.0, 0.6, 0.14), fl);
      col = mix(col, vec3(1.0, 0.93, 0.7), core);
      float glow = exp(-length((m - vec2(0.0, 0.14)) * vec2(1.0, 0.8)) * 7.0) * (0.32 + 0.05 * sin(t * 8.0));
      gl_FragColor = vec4(col * fl * 3.2 + vec3(1.0, 0.45, 0.12) * glow, 1.0);
      #include <colorspace_fragment>
    }`;
  function flameMat() {
    return R.mat.flame || (R.mat.flame = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: TIME.u }, vertexShader: FLAME_VS, fragmentShader: FLAME_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })));
  }
  function addFlame(B, x, y, z, s, light) {
    B.flames.push(mat4(x, y, z, 0, s));
    const n = Math.max(2, Math.round(4 * s));
    for (let i = 0; i < n; i++) B.pts.add.push({ x: x + (B.rnd() - 0.5) * 0.15 * s, y: y + 0.25 * s, z, kind: 0, ph: B.rnd(), size: 0.07 * Math.sqrt(s), prm: 0.45 + B.rnd() * 0.4, col: lin(0x624249, 2.6) });
    if (light) B.lights.push({ x, y: y + 0.4 * s, z: z + 0.25, col: new THREE.Color(0x624249), int: light, dist: 9.5, fl: 1, ph: B.rnd() * 10 });
  }
  function finishFlames(L, B) {
    if (!B.flames.length) return;
    const geo = R.geo.flameQuad || (R.geo.flameQuad = keep((() => { const g = new THREE.PlaneGeometry(0.8, 1.5); g.translate(0, 0.5, 0); return g; })()));
    const im = new THREE.InstancedMesh(geo, flameMat(), B.flames.length);
    B.flames.forEach((m, i) => im.setMatrixAt(i, m));
    im.computeBoundingSphere();
    im.boundingSphere.radius += 2;
    im.renderOrder = 6; im.name = 'flames';
    B.g.add(im);
  }

  // ── Canvas-drawn textures (banners, stained glass, rug emblem, rose window) ──
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    return keep(t);
  }
  function bannerTex(hue) {
 const key='banner'+hue;return R.tex[key]||(R.tex[key]=canvasTex(128,256,(g,w,h)=>{g.fillStyle=hue%2?'#48252a':'#343032';g.beginPath();g.moveTo(0,0);g.lineTo(w,0);g.lineTo(w,h-20);g.lineTo(95,h-48);g.lineTo(76,h);g.lineTo(58,h-37);g.lineTo(25,h-10);g.lineTo(0,h-40);g.closePath();g.fill();g.strokeStyle='#95765a';g.lineWidth=5;g.stroke();g.strokeStyle='#bb8c6a';g.lineWidth=9;g.beginPath();g.moveTo(64,55);g.lineTo(64,183);g.moveTo(35,105);g.lineTo(93,105);g.moveTo(41,153);g.lineTo(64,182);g.lineTo(87,153);g.stroke();g.strokeStyle='#1d191b';g.lineWidth=3;for(let i=0;i<7;i++){g.beginPath();g.moveTo(i*20,30+i*24);g.lineTo(i*20+15,46+i*24);g.stroke();}}));
  }
  // Veba Şehri's banners: the smiling golden sun of the town's crest on sky blue (2) or sunny red (3), a gold border, a scalloped hem
  function crestBanner(g, w, h, hue) {
    const base = hue === 2 ? ['#4a8ae0', '#2e64b8'] : ['#e8504a', '#b8302e'];
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 30);
    for (let i = 3; i >= 0; i--) g.arc(i * w / 4 + w / 8, h - 30, w / 8, 0, Math.PI, false);   // the scalloped hem
    g.closePath();
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, base[1]); gr.addColorStop(0.5, base[0]); gr.addColorStop(1, base[1]);
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    g.fillStyle = '#a37b53'; g.fillRect(0, 0, w, 16); g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    g.fillStyle = hue === 2 ? '#a37b53' : '#fff0a0';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * w / 4 + w / 8, h - 30, w / 8 - 6, 0, Math.PI, false); g.lineWidth = 5; g.strokeStyle = '#a37b53'; g.stroke(); }
    const cx = w / 2, cy = 118;
    g.fillStyle = '#ffc83a';
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.16) * 30, cy + Math.sin(a - 0.16) * 30); g.lineTo(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50); g.lineTo(cx + Math.cos(a + 0.16) * 30, cy + Math.sin(a + 0.16) * 30); g.fill(); }
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(cx, cy, 32, 0, TAU); g.fill();
    g.fillStyle = '#5a3a20'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 11, cy - 6, 4, 6, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#ff9a8a'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 19, cy + 6, 6, 4, 0, 0, TAU); g.fill(); }
    g.strokeStyle = '#8a4a2a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + 4, 12, 0.35, Math.PI - 0.35, false); g.stroke();
    g.restore();
  }
  const GLASS = [['#774538', '#81715c', '#a37b53', '#524841'], ['#687354', '#9b5c3e', '#716758', '#774538'], ['#a37b53', '#524841', '#687354', '#823b35']];
  const GLASS_LIGHT = [[0x65434b, 0x4e5561], [0x525a65, 0x604148], [0x6a474e, 0x583c43]];   // two main colours of each window (light pools)   // average colour of each window (for its light pool)
  function glassTex(v) {   // arched stained-glass window: colourful panes, dark lead lines, a star in the middle
    const key = 'glass' + v;
    return R.tex[key] || (R.tex[key] = canvasTex(128, 256, (g, w, h) => {
      const cols = GLASS[v], arch = () => { g.beginPath(); g.moveTo(8, h - 6); g.lineTo(8, 64); g.arc(64, 64, 56, Math.PI, 0); g.lineTo(120, h - 6); g.closePath(); };
      arch(); g.save(); g.clip();
      const rnd = mulberry32(900 + v);
      for (let y = 0; y < h; y += 34) for (let x = 0; x < w; x += 30) {
        g.fillStyle = cols[Math.floor(rnd() * 4)];
        g.beginPath(); g.moveTo(x + rnd() * 8, y + rnd() * 8); g.lineTo(x + 30 + rnd() * 8, y + rnd() * 8); g.lineTo(x + 30 + rnd() * 8, y + 34 + rnd() * 8); g.lineTo(x + rnd() * 8, y + 34 + rnd() * 8); g.closePath(); g.fill();
      }
      const gr = g.createRadialGradient(64, 60, 4, 64, 60, 60); gr.addColorStop(0, 'rgba(255,255,240,0.85)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b59d7a'; g.lineWidth=7; g.lineCap='square';
      g.beginPath();g.moveTo(64,37);g.lineTo(64,89);g.moveTo(45,54);g.lineTo(83,54);g.moveTo(47,77);g.lineTo(64,91);g.lineTo(81,77);g.stroke();
      // Missing panes and fractured lead keep the intact glow while telling the siege's history.
      g.fillStyle='#302a26';g.beginPath();g.moveTo(91,117);g.lineTo(112,103);g.lineTo(108,144);g.closePath();g.fill();
      g.strokeStyle='#302a26';g.lineWidth=2;g.beginPath();g.moveTo(17,164);g.lineTo(44,183);g.lineTo(32,212);g.moveTo(44,183);g.lineTo(71,197);g.stroke();
      g.strokeStyle = '#302a26'; g.lineWidth = 4; g.lineJoin = 'round';
      for (let y = 34; y < h; y += 34) { g.beginPath(); g.moveTo(0, y + 4); g.lineTo(w, y + 2); g.stroke(); }
      for (let x = 34; x < w; x += 30) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x + 2, h); g.stroke(); }
      g.beginPath(); g.arc(64, 64, 30, 0, TAU); g.stroke();
      g.restore();
      g.lineWidth = 9; g.strokeStyle = '#302a26'; arch(); g.stroke();
    }));
  }
  function emblemTex() {return R.tex.emblem||(R.tex.emblem=canvasTex(512,512,(g,w)=>{const c=w/2;g.strokeStyle='#967556';g.lineWidth=12;g.strokeRect(75,75,362,362);g.strokeStyle='#883e36';g.lineWidth=24;g.beginPath();g.moveTo(c,92);g.lineTo(c,410);g.moveTo(145,210);g.lineTo(367,210);g.moveTo(166,340);g.lineTo(c,419);g.lineTo(346,340);g.stroke();g.strokeStyle='#6f5749';g.lineWidth=5;for(let i=0;i<12;i++){g.beginPath();g.moveTo(86+i*29,75);g.lineTo(100+i*29,100);g.stroke();}}));
  }
  function roseTex() {
    return R.tex.rose || (R.tex.rose = canvasTex(256, 256, (g, w) => {
      const c = w / 2, cols = ['#774538', '#81715c', '#a37b53', '#524841', '#687354', '#9b5c3e'];
      g.fillStyle = '#20122e'; g.beginPath(); g.arc(c, c, 126, 0, TAU); g.fill();
      for (let ring = 0; ring < 3; ring++) {
        const n = [6, 12, 12][ring], r0 = [18, 50, 88][ring], r1 = [50, 88, 120][ring];
        for (let i = 0; i < n; i++) {
          const a0 = i / n * TAU + ring * 0.26, a1 = (i + 1) / n * TAU + ring * 0.26;
          g.beginPath(); g.arc(c, c, r1 - 3, a0 + 0.03, a1 - 0.03); g.arc(c, c, r0 + 3, a1 - 0.03, a0 + 0.03, true); g.closePath();
          g.fillStyle = cols[(i + ring * 2) % cols.length]; g.fill();
        }
      }
      g.fillStyle = '#ae9572'; g.beginPath(); g.arc(c, c, 16, 0, TAU); g.fill();
    }));
  }

  // ── Cave: boulder walls (low on the camera side), stalagmites, glowing crystals, light motes — and the moles' and snails' home ──
  const CRYSTAL_COL = [0x555d69, 0x604148, 0x68454d, 0x515864];
  function crystalGeo(v) {
    const key = 'cry' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(1500 + v), c = new THREE.Color(CRYSTAL_COL[v % 4]);
    const n = 4 + (v % 3);
    for (let i = 0; i < n; i++) {
      const h = (i ? 0.35 + rnd() * 0.5 : 0.95) * (1 + (v % 2) * 0.3), r = h * 0.16, a = rnd() * TAU, tl = i ? 0.3 + rnd() * 0.45 : 0.08;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(a) * tl, rnd() * TAU, Math.sin(a) * tl));
      const col = (x, y) => c.clone().multiplyScalar(0.35 + 0.9 * clamp(y / (h * 1.1), 0, 1));
      k.push([Math.cos(a) * 0.12 * (i > 0), 0, Math.sin(a) * 0.12 * (i > 0)], q);
      k.add(G.cyl(1, 1, 6), col, [0, h * 0.4, 0], 0, [r, h * 0.8, r]);
      k.add(G.cone(6), col, [0, h * 0.8 + h * 0.12, 0], 0, [r, h * 0.24, r]);
      k.pop();
    }
    return (R.geo[key] = keep(k.build()));
  }
  function glowCapGeo(v) { const key='gcap'+v;if(R.geo[key])return R.geo[key];const k=new Kit();for(let i=0;i<3;i++){const sc=[1,0.7,0.55][i];k.add(G.octa(),0x826659,[[0,0.18,-0.14][i],0.3*sc,[0,0.1,0.15][i]],0,[0.05*sc,0.13*sc,0.05*sc]);}return (R.geo[key]=keep(k.build()));
  }
  function glowStemGeo() {
    if (R.geo.gstem) return R.geo.gstem;
    const k = new Kit();
    for (let i = 0; i < 3; i++) { const s = [1, 0.7, 0.55][i], x = [0, 0.18, -0.14][i], z = [0, 0.1, 0.15][i]; k.add(G.cyl(0.8, 1, 8), 0x606976, [x, 0.13 * s, z], 0, [0.045 * s, 0.26 * s, 0.045 * s]); }
    return (R.geo.gstem = keep(k.build()));
  }
  // ── The moles' and snails' cave: molehills, roots with moss and glowing mushrooms, moss cushions, lamp mushrooms, slime trails ──
  // Everything here is soft, round and friendly. Only the lamp mushrooms standing inside a room block (like the crystals there).
  // L.caveDecor keeps the spots (tests / debugging).
  const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
  function segTf(p0, p1, r) {   // Kit transform of a cylinder from p0 to p1 (radius r); fixed taper ratios keep the cylinder cache small
    _sa.set(p0[0], p0[1], p0[2]); _sb.set(p1[0], p1[1], p1[2]);
    const len = _sa.distanceTo(_sb), q = new THREE.Quaternion().setFromUnitVectors(UP, _sb.clone().sub(_sa).normalize());
    return [[(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], q, [r, len, r]];
  }
  // A molehill: the moles' front door. A crumbly heap of the cave path's sand (triplanar), a dark hole on top ringed by clods, crumbs
  // on and around it. Returns { soil, extra }: extra (decor material) = v 1 a sprout with a pink bud · v 2 the mole's tiny shovel.
  // v 3 = a small double heap.
  function moleHillData(v) {
    const key = 'moleH' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), ke = new Kit(), rnd = mulberry32(2100 + v * 7), lo = new THREE.Color(0x422e34), hi = new THREE.Color(0x6d4951);
    const mound = i => R.geo['mound' + i] || (R.geo['mound' + i] = lumpy(2, 0.12, 2150 + i * 5, { flat: 0.02, crag: 0.35 }));
    const clod = R.geo.clod || (R.geo.clod = lumpy(0, 0.3, 2190, { flat: -0.35, crag: 0.8 }));   // 20 tris
    const soil = h => (x, y, z) => lo.clone().lerp(hi, clamp(y / h * 0.8 + 0.12 + Math.sin(x * 23 + z * 17) * 0.06, 0, 1));
    const addClod = (x, y, z, sz, t) => k.add(clod, lo.clone().lerp(hi, t), [x, y, z], [rnd() * 3, rnd() * 3, rnd() * 3], [sz * 1.25, sz * 0.85, sz]);
    const hills = v === 3 ? [[0.16, 0.06, 0.38, 0.3], [-0.3, -0.14, 0.28, 0.22]] : [[0, 0, 0.46, 0.4]];
    for (const [hx, hz, hr, hh] of hills) {
      const mg = mound(v % 2);
      if (!mg.boundingBox) mg.computeBoundingBox();
      k.add(mg, soil(hh), [hx, -0.02, hz], 0, [hr, hh, hr * 0.92]);
      const ty = mg.boundingBox.max.y * hh - 0.02;   // top of the heap
      k.add(G.sphere(14, 8), 0x171419, [hx, ty - 0.012, hz], 0, [hr * 0.22, 0.03, hr * 0.2]);   // the hole
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + rnd() * 0.4, d = hr * (0.25 + rnd() * 0.05); addClod(hx + Math.cos(a) * d, ty - 0.02, hz + Math.sin(a) * d * 0.9, 0.034 + rnd() * 0.02, 0.75 + rnd() * 0.25); }
      for (let i = 0; i < 5; i++) {   // crumbs on the slopes
        const a = rnd() * TAU, f = 0.42 + rnd() * 0.45, y = hh * Math.sqrt(1 - f * f) * 0.92 - 0.02;
        addClod(hx + Math.cos(a) * hr * f, y, hz + Math.sin(a) * hr * f * 0.92, 0.026 + rnd() * 0.024, 0.3 + rnd() * 0.6);
      }
    }
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + rnd() * 0.7, d = 0.55 + rnd() * 0.2, sz = 0.03 + rnd() * 0.035; addClod(Math.cos(a) * d, sz * 0.3, Math.sin(a) * d * 0.9, sz, 0.2 + rnd() * 0.6); }
    if (v === 1) {   // a little green sprout with a pink bud
      ke.add(G.cyl(0.7, 1, 6), 0x3b4048, [-0.2, 0.3, 0.12], [0.1, 0, 0.15], [0.016, 0.16, 0.016]);
      ke.add(G.sphere(10, 6), 0x474d58, [-0.29, 0.36, 0.12], [0, 0, 0.6], [0.08, 0.02, 0.04]);
      ke.add(G.sphere(10, 6), 0x4b525d, [-0.13, 0.35, 0.13], [0, 0.4, -0.5], [0.07, 0.018, 0.035]);
      ke.add(G.sphere(10, 8), 0x6b484f, [-0.215, 0.39, 0.12], 0, [0.035, 0.045, 0.035]);
    } else if (v === 2) {   // the mole's tiny shovel, stuck in the side of the heap
      ke.push([0.3, 0.1, 0.12], [0.15, 0.3, -0.5]);
      ke.add(G.cyl(1, 1, 8), 0x5d3f46, [0, 0.3, 0], 0, [0.02, 0.5, 0.02]);
      ke.add(G.cyl(1, 1, 8), 0x67454d, [0, 0.55, 0], [0, 0, Math.PI / 2], [0.02, 0.12, 0.02]);
      ke.add(G.rbox(1), 0x545c68, [0, 0.02, 0], 0, [0.12, 0.15, 0.022]);
      ke.pop();
    }
    return (R.geo[key] = { soil: keep(k.build()), extra: v === 1 || v === 2 ? keep(ke.build()) : null });
  }
  // A gnarly root coming out of the rock, arching over the floor edge and diving into the ground (local +z = into the room,
  // origin at the foot of the wall). root: plain vertex colours (decor material) with moss patches · caps: tiny glowing
  // mushrooms sitting on it (glow material)
  function rootArchData(v) {
    const key = 'rootA' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), kc = new Kit(), rnd = mulberry32(2300 + v * 13), dark = new THREE.Color(0x251d22), light = new THREE.Color(0x432f35);
    const moss = R.geo.mossLump || (R.geo.mossLump = lumpy(1, 0.2, 2350, { flat: -0.2 }));
    const curve = (p0, p1, p2, n, r0, r1, c0 = 0) => {   // wiggly quadratic bezier as a chain of tapered segments; returns the points
      const pts = [], ph = rnd() * 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t, w = Math.sin(t * 11 + ph) * 0.05 * Math.sin(t * Math.PI);
        pts.push([p0[0] * a + p1[0] * b + p2[0] * c + w, p0[1] * a + p1[1] * b + p2[1] * c + w * 0.5, p0[2] * a + p1[2] * b + p2[2] * c]);
      }
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, col = (x, y, z) => dark.clone().lerp(light, clamp(c0 + (1 - c0) * lerp(t0, t1, 0.5) + Math.sin(x * 31 + y * 17 + z * 23) * 0.08, 0, 1));
        k.add(G.cyl(0.8, 1, 8), col, ...segTf(pts[i], pts[i + 1], lerp(r0, r1, t0)));
        if (i) k.add(G.sphere(6, 4), col, pts[i], 0, lerp(r0, r1, t0) * 1.02);   // smooth knees between the segments
      }
      return pts;
    };
    const side = v === 1 ? -1 : 1, lean = (rnd() - 0.5) * 0.3;
    const main = curve([lean, 1.3, -0.7], [lean * 0.5, 0.95, 0.35], [side * 0.15, -0.1, 1.25], 9, 0.2, 0.075);
    const br = curve(main[4], [side * -0.55, 0.45, 0.7], [side * -0.85, -0.08, 0.85], 6, 0.08, 0.035, 0.45);
    if (v === 2) curve(main[3], [side * 0.6, 0.6, 0.3], [side * 0.9, -0.08, 0.45], 6, 0.075, 0.032, 0.35);
    const mossC = new THREE.Color(0x2a2d34), mossT = new THREE.Color(0x444b55), end = main[main.length - 1], be = br[br.length - 1];
    for (const [p, sz] of [[end, 0.24], [be, 0.17], [main[1], 0.2]]) {   // moss patches where the roots meet the ground / leave the rock
      k.add(moss, (x, y) => mossC.clone().lerp(mossT, clamp((y - p[1]) / 0.07, 0, 1)), [p[0], Math.max(0, p[1]) - 0.01, p[2]], [0, rnd() * 6, 0], [sz * 1.4, sz * 0.32, sz]);
    }
    const CAP = [0x555d68, 0x6f4a52, 0x69464e];
    for (let i = 0; i < 3; i++) {   // a little cluster of glowing mushrooms beside the root's end
      const a = rnd() * TAU, d = 0.18 + i * 0.08, sz = [0.1, 0.075, 0.06][i], px = end[0] + side * 0.28 + Math.cos(a) * d, pz = end[2] - 0.12 + Math.sin(a) * d * 0.6;
      const c = new THREE.Color(CAP[(v + i) % 3]), h = sz * 1.9;
      k.add(G.cyl(0.8, 1, 6), 0x636d7b, [px, h * 0.5, pz], 0, [sz * 0.24, h, sz * 0.24]);
      kc.add(G.hemi(10), (x, y) => c.clone().multiplyScalar(0.5 + 0.5 * clamp((y - h) / (sz * 0.6), 0, 1)), [px, h - 0.005, pz], 0, [sz, sz * 0.66, sz]);
    }
    return (R.geo[key] = { root: keep(k.build()), caps: keep(kc.build()) });
  }
  // A soft moss cushion hugging the base of a wall, with a few tiny flowers
  function mossCushionGeo(v) {
    const key = 'mossC' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(2400 + v * 11), moss = R.geo.mossLump || (R.geo.mossLump = lumpy(1, 0.2, 2350, { flat: -0.2 }));
    const base = new THREE.Color(0x292b32), top = new THREE.Color(v === 1 ? 0x464c56 : 0x40454f), FL = [0xaa9d82, 0x7a604b, 0x746e54, 0x5a584a];
    const nb = 2 + v;
    for (let i = 0; i < nb; i++) {
      const s = 0.22 + rnd() * 0.12, x = (rnd() - 0.5) * 0.55, z = (rnd() - 0.5) * 0.4;
      k.add(moss, (px, py) => base.clone().lerp(top, clamp(py / 0.08, 0, 1)), [x, -0.01, z], [0, rnd() * 6, 0], [s * 1.35, s * 0.36, s]);
      for (let f = 0; f < 3; f++) {
        const a = rnd() * TAU, r = s * 0.7 * rnd();
        k.add(petalDisc(), FL[Math.floor(rnd() * FL.length)], [x + Math.cos(a) * r, s * 0.34, z + Math.sin(a) * r], [0, rnd() * 6, 0], 0.05);
      }
    }
    return (R.geo[key] = keep(k.build()));
  }
  // A lighter moss cap for the crowns of the camera-side rocks: 1–2 flat moss lumps with a few tiny flowers
  function rockMossGeo(v) {
    const key = 'rMoss' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(2450 + v * 7), moss = R.geo.mossLump || (R.geo.mossLump = lumpy(1, 0.2, 2350, { flat: -0.2 }));
    const base = new THREE.Color(0x292b32), top = new THREE.Color(v === 1 ? 0x464c56 : 0x40454f), FL = [0xaa9d82, 0x7a604b, 0x746e54, 0x5a584a];
    for (let i = 0; i < 1 + (v % 2); i++) {
      const s = 0.3 + rnd() * 0.08, x = i ? (rnd() - 0.5) * 0.45 : 0, z = i ? (rnd() - 0.5) * 0.35 : 0;
      k.add(moss, (px, py) => base.clone().lerp(top, clamp(py / 0.08, 0, 1)), [x, -0.01, z], [0, rnd() * 6, 0], [s * 1.35, s * 0.36, s]);
      for (let f = 0; f < 2; f++) {
        const a = rnd() * TAU, r = s * 0.65 * rnd();
        k.add(petalDisc(), FL[Math.floor(rnd() * FL.length)], [x + Math.cos(a) * r, s * 0.34, z + Math.sin(a) * r], [0, rnd() * 6, 0], 0.05);
      }
    }
    return (R.geo[key] = keep(k.build()));
  }
  // Lamp mushrooms: one big + two small; stems (decor) and caps with spots (glow) come from the same layout
  const LAMP_COL = [0x6c484f, 0x565e6b, 0x69464e, 0x565f6b, 0x704a52];
  function lampData(v) {
 const key='lamp'+v;if(R.geo[key])return R.geo[key];const ks=new Kit(),kc=new Kit();
 for(let i=0;i<3;i++){const x=[0,0.3,-0.24][i],z=[0,0.12,0.18][i],h=[0.65,0.4,0.3][i];ks.add(G.box(),0x665c53,[x,h/2,z],0,[0.1,h,0.1]);ks.add(G.box(),0x9a8971,[x,h-0.05,z],0,[0.16,0.08,0.16]);kc.add(G.octa(),LAMP_COL[v%LAMP_COL.length],[x,h+0.075,z],0,[0.045,0.13,0.045]);}
 return (R.geo[key]={stems:keep(ks.build()),caps:keep(kc.build())});
  }

  // Sparkly snail-slime trails: soft iridescent ribbons on the floor (additive, one mesh per level)
  const SLIME_VS = `attribute vec4 aT; varying vec4 vT; varying float vFogD;
    void main() { vT = aT; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFogD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const SLIME_FS = `uniform float uTime, fogNear, fogFar; uniform vec3 fogColor; varying vec4 vT; varying float vFogD;
    ${GLSL_NOISE}
    void main() {
      float v = abs(vT.y), u = vT.x;
      float body = smoothstep(1.0, 0.55, v) * (0.65 + 0.35 * lvVN(vec2(u * 2.2, vT.y * 1.4 + vT.w * 20.0)));   // wet, a little blotchy
      float rim = smoothstep(0.35, 0.85, v) * smoothstep(1.0, 0.8, v);                                        // brighter wet edge
      float hue = vT.w * 6.2831 + u * 0.07 + uTime * 0.04;                                                   // one pastel hue per trail, drifting
      vec3 iri = 0.6 + 0.4 * cos(hue + vec3(0.0, 2.1, 4.2) + v * 1.6);                                     // a soft rainbow sheen across it
      vec3 base = mix(vec3(0.74, 0.78, 1.0), iri, 0.62);
      float sheen = pow(0.5 + 0.5 * sin(u * 2.1 - uTime * 1.2 + vT.w * 7.0), 4.0);                           // a highlight gliding along
      vec2 gp = vec2(u * 5.0, vT.y * 1.5 + 11.0), gi = floor(gp); float h = lvH21(gi + vec2(vT.w * 17.0, 3.0));
      vec2 gf = fract(gp) - 0.5 - (vec2(lvH21(gi + 5.3), lvH21(gi + 9.1)) - 0.5) * 0.4;
      float tw = pow(max(0.0, sin(uTime * 2.2 + h * 50.0)), 8.0);
      float gl = step(0.66, h) * smoothstep(0.17, 0.0, length(gf)) * tw * smoothstep(1.0, 0.5, v);
      vec3 col = base * (body * 0.075 + rim * 0.15 + body * sheen * 0.09) + vec3(1.0, 0.96, 1.0) * gl * 1.1;
      col *= vT.z * (1.0 - smoothstep(fogNear, fogFar, vFogD));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`;
  function slimeMat() {
    return R.mat.slime || (R.mat.slime = keep(new THREE.ShaderMaterial({
      uniforms: Object.assign({ uTime: TIME.u }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)), vertexShader: SLIME_VS, fragmentShader: SLIME_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    })));
  }
  function finishSlime(B) {
    const list = B.slime;
    if (!list.length) return;
    let nv = 0, ni = 0;
    for (const t of list) { nv += t.pts.length * 2; ni += (t.pts.length - 1) * 6; }
    const pos = new Float32Array(nv * 3), at = new Float32Array(nv * 4), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const t of list) {
      const P = t.pts, n = P.length, total = P[n - 1][2];
      for (let i = 0; i < n; i++) {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
        const u = P[i][2], w = t.w * (0.82 + 0.18 * Math.sin(u * 1.7 + t.seed * 9)) * (0.55 + 0.45 * smooth01(u / 0.6));
        const nx = -dz / l * w, nz = dx / l * w, fade = smooth01(u / 1.1) * smooth01((total - u) / 0.5) * (0.55 + 0.45 * (u / total));   // fresher toward the snail's end
        for (let sd = 0; sd < 2; sd++) {
          const o = vo + i * 2 + sd, sg = sd ? -1 : 1;
          pos[o * 3] = P[i][0] + nx * sg; pos[o * 3 + 1] = 0.012; pos[o * 3 + 2] = P[i][1] + nz * sg;
          at[o * 4] = u; at[o * 4 + 1] = sg; at[o * 4 + 2] = fade; at[o * 4 + 3] = t.seed;
        }
        if (i < n - 1) { const q = vo + i * 2; idx[io++] = q; idx[io++] = q + 2; idx[io++] = q + 1; idx[io++] = q + 1; idx[io++] = q + 2; idx[io++] = q + 3; }
      }
      vo += n * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(at, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
    B.dispose.push(g);
    const m = new THREE.Mesh(g, slimeMat());
    m.renderOrder = 2; m.name = 'slime';
    B.g.add(m);
  }

  function caveFriends(L, B, crystals, roomSpot) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid, dW = L.dWall, dF = L._dF;
    const pick = a => a[Math.floor(rnd() * a.length)];
    const cellOf = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    const dwAt = (x, z) => { const c = cellOf(x, z); return c < 0 || !grid[c] ? 0 : dW[c]; };
    const nearPath = (x, z, d) => { for (const p of L.path) if (Math.abs(p.x - x) < d && Math.abs(p.z - z) < d && hyp(p.x - x, p.z - z) < d) return true; return false; };
    const busy = (x, z, pad) => (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 3.4 + pad) || L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 2.4 + pad) ||
      L.chests.some(q => hyp(q.x - x, q.z - z) < 1.3 + pad) || L.torches.some(q => hyp(q.x - x, q.z - z) < 0.8 + pad) ||
      L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + pad) || (L.start && hyp(L.start.x - x, L.start.z - z) < 1.5 + pad) ||
      (L.boss && hyp(L.boss.x - x, L.boss.z - z) < 4 + pad);
    const cells = (test) => { const out = []; for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (test(j * W + i, i, j)) out.push([i, j]); return shuffle(out, rnd); };

    // molehills near the room edges: never on the main path, next to a spawn or in a doorway (a mole in the game shows a *moving* mound)
    const hills = [];
    for (const [i, j] of cells(c => grid[c] && dW[c] >= 1.2 && dW[c] <= 3.8 && !B.noDec[c])) {
      if (hills.length >= 26) break;
      const x = i + 0.2 + rnd() * 0.6, z = j + 0.2 + rnd() * 0.6;
      if (hills.some(h => hyp(h[0] - x, h[1] - z) < 3.2) || nearPath(x, z, 2.4) || linkDist(L, x, z) < 1.8 || busy(x, z, 0.8) ||
        L.spawns.some(q => hyp(q.x - x, q.z - z) < 2.2)) continue;
      hills.push([x, z]);
      const v = rnd() < 0.28 ? 1 : rnd() < 0.3 ? 2 : rnd() < 0.3 ? 3 : 0, D = moleHillData(v), m = mat4(x, 0, z, rnd() * TAU, 0.9 + rnd() * 0.3);
      dec(B, 'soil', D.soil, m, null);
      if (D.extra) dec(B, 'decor', D.extra, m, null);
    }
    // gnarly roots with moss and tiny glowing mushrooms, coming out of the rock at the foot of the walls (where the cobwebs used to
    // be), a few more in the northern corners
    const hang = [];
    const wallDir = (x, z) => { const gx = dwAt(x + 0.7, z) - dwAt(x - 0.7, z), gz = dwAt(x, z + 0.7) - dwAt(x, z - 0.7), l = hyp(gx, gz); return l > 0.01 ? [gx / l, gz / l] : null; };
    for (const [i, j] of cells(c => grid[c] && dW[c] <= 1.5)) {
      if (hang.length >= 18) break;
      const cx = i + 0.5, cz = j + 0.5, g = wallDir(cx, cz);
      if (!g) continue;
      if (g[1] < 0.75) continue;   // only north walls: the root comes down the rock face toward the camera
      const x = cx - g[0] * 0.5, z = cz - g[1] * 0.5, tx = x + g[0] * 1.1, tz = z + g[1] * 1.1;
      if (hang.some(h => hyp(h[0] - x, h[1] - z) < 5) || busy(tx, tz, 0.5) || busy(x, z, 0.3) || nearPath(tx, tz, 1.6) || linkDist(L, tx, tz) < 1.6 ||
        L.spawns.some(q => hyp(q.x - tx, q.z - tz) < 1.4)) continue;
      hang.push([x, z]);
      const v = Math.floor(rnd() * 3), s = 0.95 + rnd() * 0.3, ry = Math.atan2(g[0], g[1]) + (rnd() - 0.5) * 0.35, D = rootArchData(v);
      dec(B, 'decor', D.root, mat4(x, 0, z, ry, s), null);
      dec(B, 'glow', D.caps, mat4(x, 0, z, ry, s), lin(0xffffff, 0.62));
      glowAt(B, tx, tz, 1.2, 0x575f6b, 0.14);
    }
    // moss cushions along the wall bases
    let nMoss = 0;
    for (const [i, j] of cells(c => grid[c] && dW[c] <= 1.5 && !B.noDec[c])) {
      if (nMoss >= 60) break;
      const x = i + rnd(), z = j + rnd();
      if (rnd() < 0.6 || busy(x, z, 0.2) || nearPath(x, z, 1.4) || hang.some(h => hyp(h[0] - x, h[1] - z) < 1.2)) continue;
      dec(B, 'decor', mossCushionGeo(Math.floor(rnd() * 3)), mat4(x, 0, z, rnd() * TAU, 0.8 + rnd() * 0.5), null);
      nMoss++;
    }
    // lamp mushrooms in the rock band next to the floor (soft coloured light pools, spores floating up)
    const lamps = [];
    let nIn = 0;
    for (const [i, j] of cells(c => grid[c] ? dW[c] >= 0.7 && dW[c] <= 1.2 : dF[c] <= 0.9)) {
      if (lamps.length >= 13) break;
      const x = i + rnd(), z = j + rnd(), s = 1.05 + rnd() * 0.4, inside = grid[cellOf(x, z)] === 1, r = 0.42 * s;
      if (lamps.some(q => hyp(q[0] - x, q[1] - z) < 6.5) || crystals.some(q => hyp(q[0] - x, q[1] - z) < 3) || hang.some(q => hyp(q[0] - x, q[1] - z) < 2.5)) continue;
      if (inside ? (nIn >= 8 || nearPath(x, z, 2.8) || !roomSpot(x, z, r, 0.85 * s)) : (hides(L, x, z, 0.5 * s, 0, 0.85 * s, 0.05) || busy(x, z, 0.3))) continue;
      lamps.push([x, z]);
      const v = Math.floor(rnd() * LAMP_COL.length), ry = rnd() * TAU, D = lampData(v), col = new THREE.Color(LAMP_COL[v]);
      const vis = [dec(B, 'decor', D.stems, mat4(x, 0, z, ry, s), null), dec(B, 'glow', D.caps, mat4(x, 0, z, ry, s), lin(0xffffff, 0.66))];
      if (inside) { propSolid(L, x, z, r, 'lamp', vis); nIn++; }
      B.lights.push({ x, y: 0.95 * s, z: z + 0.2, col, int: 3.4, dist: 6.5, fl: 0, ph: rnd() * 10 });
      glowAt(B, x, z + 0.25, 2.4 * s, col, 0.5);
      for (let m = 0; m < 4; m++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.9, y: 0.7 + rnd() * 0.9, z: z + (rnd() - 0.5) * 0.9, kind: 1, ph: rnd(), size: 0.06, prm: 0.3 + rnd() * 0.3, col: col.clone().multiplyScalar(1.5) });
    }
    // snail-slime trails: wander over the floor of most rooms, turning away from walls, busy spots and each other
    const SL_COL = [0x764e56, 0x5b6470, 0x575f6b, 0x5e6775, 0xffffff];
    const trails = [], order = [0, 1].concat(shuffle(L.rooms.map((r, i) => i).filter(i => i > 1 && L.rooms[i].kind !== 'boss'), rnd));
    const want = clamp(Math.round(L.rooms.length * 0.9), 7, 13);
    const bad = (x, z) => dwAt(x, z) < 0.95 || busy(x, z, 0.1) || trails.some(t => t.near(x, z));
    for (const ri of order) {
      if (trails.length >= want) break;
      const rm = L.rooms[ri];
      if (!rm) continue;
      for (let tr = 0; tr < 24; tr++) {
        const a0 = rnd() * TAU, d0 = Math.sqrt(rnd()) * (rm.r || Math.min(rm.hw, rm.hh)) * 0.75;
        let x = rm.x + Math.cos(a0) * d0, z = rm.z + Math.sin(a0) * d0;
        if (dwAt(x, z) < 1.6 || bad(x, z)) continue;
        let h = rnd() * TAU, u = 0;
        const len = 4.5 + rnd() * 5, ph = rnd() * 10, pts = [[x, z, 0]];
        for (let st = 0; st < 120 && u < len; st++) {
          h += Math.sin(st * 0.21 + ph) * 0.1 + (rnd() - 0.5) * 0.14;
          let nx = x + Math.cos(h) * 0.22, nz = z + Math.sin(h) * 0.22;
          if (dwAt(nx, nz) < 1.3) {   // steer toward open floor (up the wall-distance gradient)
            const gx = dwAt(x + 0.6, z) - dwAt(x - 0.6, z), gz = dwAt(x, z + 0.6) - dwAt(x, z - 0.6);
            if (gx || gz) { const ga = Math.atan2(gz, gx); h += clamp(angDiff(h, ga), -0.45, 0.45); }
            nx = x + Math.cos(h) * 0.22; nz = z + Math.sin(h) * 0.22;
          }
          if (bad(nx, nz)) break;
          u += hyp(nx - x, nz - z); x = nx; z = nz; pts.push([x, z, u]);
        }
        if (u < 3.2) continue;
        for (let it = 0; it < 2; it++) for (let i = 1; i < pts.length - 1; i++) { pts[i][0] = (pts[i - 1][0] + pts[i][0] * 2 + pts[i + 1][0]) / 4; pts[i][1] = (pts[i - 1][1] + pts[i][1] * 2 + pts[i + 1][1]) / 4; }
        const seed = rnd();
        trails.push({ near: (qx, qz) => { for (let i = 0; i < pts.length; i += 3) if (hyp(pts[i][0] - qx, pts[i][1] - qz) < 1.5) return true; return false; } });
        B.slime.push({ pts, w: 0.16 + rnd() * 0.04, seed });
        for (let k = 1; k < pts.length - 1; k += 3) {   // twinkles on the trail + a faint sheen baked into the floor
          const p = pts[k];
          B.pts.add.push({ x: p[0] + (rnd() - 0.5) * 0.25, y: 0.05, z: p[1] + (rnd() - 0.5) * 0.25, kind: 8, ph: rnd(), size: 0.12 + rnd() * 0.1, prm: 0.5 + rnd() * 0.5, col: lin(pick(SL_COL), 1.6) });
          if (k % 6 === 1) glowAt(B, p[0], p[1], 0.75, pick([0x6f4a52, 0x57606c, 0x714b53]), 0.09);
        }
        break;
      }
    }
    L.caveDecor = { hills, roots: hang, lamps, moss: nMoss, trails: B.slime.map(t => t.pts[Math.floor(t.pts.length / 2)]) };   // for tests / debugging
  }
  function buildCave(L, B) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid, dW = L.dWall;
    const dF = L._dF = chamfer(W, H, grid, 1);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const rockTint = () => lin(pick([0x484f59, 0x494f5a, 0x474d57, 0x4d545f, 0x454b55]), 0.8 + rnd() * 0.35);
    // Boulders. On the camera side of the walkable floor they are graded by how far SOUTH of it they stand (southGap: a cone
    // looking north from the rock): ≤ 2 m → top ≤ 0.6 m, 2–5 m → top ≤ 1.0 m — smaller, rounder rocks packed closer, some with a
    // moss cushion or tiny glowing mushrooms on top; the ground there is near-black, so real holes get small filler rocks.
    // Further out the big boulders only rise as far as keeps their top ≥ 3 m (on screen) south of the floor edge. So the rock
    // band never fills the bottom of the screen when Feza walks along a south wall. Beside / behind the rooms (no floor to their
    // north): big boulders as before.
    const cellOf = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    const gapAt = (x, z) => southGap(L, x, z), capAt = g => southCap(g, 0.6, 1.0);   // highest allowed top (m)
    const RG = [rockGeo(0), rockGeo(1), rockGeo(2), rockSGeo()];   // 3 boulders + the low-poly small one (companions, fillers)
    const rTop = RG.map(g => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.max.y + 0.22; });   // top per unit sy (incl. the lift)
    const rApex = RG.map(g => { const P = g.attributes.position; let b = 0; for (let v = 1; v < P.count; v++) if (P.getY(v) > P.getY(b)) b = v; return new THREE.Vector3(P.getX(b), P.getY(b), P.getZ(b)); });
    const RS = L.caveRocks = { near: 0, mid: 0, far: 0, fill: 0, topNear: 0, topMid: 0, topFar: 0, moss: 0, caps: 0 };   // for tests / debugging
    const CW = W * 2, CH = H * 2, cov = new Uint8Array(CW * CH);   // 0.5 m cells already covered by a rock
    const cover = (x, z, r) => {
      for (let b = Math.max(0, Math.floor((z - r) * 2)); b <= Math.min(CH - 1, Math.floor((z + r) * 2)); b++)
        for (let a = Math.max(0, Math.floor((x - r) * 2)); a <= Math.min(CW - 1, Math.floor((x + r) * 2)); a++) if (hyp((a + 0.5) / 2 - x, (b + 0.5) / 2 - z) < r) cov[b * CW + a] = 1;
    };
    const _ap = new THREE.Vector3();
    // one rock: width s, depth sz, wanted height scale syW (≥ syMin), kept under capAt(g) incl. what its tilt adds → its apex (world)
    const addRock = (x, z, s, syW, syMin, sz, tilt, g, small) => {
      const k = small ? 3 : Math.floor(rnd() * 3), tm = tilt * 0.65 * Math.max(s, sz), sy = Math.max(syMin, Math.min(syW, (capAt(g) - tm) / rTop[k]));
      const m = mat4(x, 0.22 * sy, z, rnd() * TAU, s, sy, sz, (rnd() - 0.5) * tilt, (rnd() - 0.5) * tilt);
      inst(B, small ? 'rockS' : 'rock' + k, m, rockTint());
      cover(x, z, Math.min(s, sz) * 0.85);
      const band = g <= 2 ? 'Near' : g <= 5 ? 'Mid' : 'Far';
      RS[band.toLowerCase()]++; RS['top' + band] = Math.max(RS['top' + band], g < 99 ? +(rTop[k] * sy + tm).toFixed(2) : 0);
      return _ap.copy(rApex[k]).applyMatrix4(m);
    };
    const hug = (x, z, g, sz) => g < 1.1 * sz - 0.35 ? z - g - 0.35 + 1.1 * sz : z;   // overlap the floor to the north by ≤ 0.35 m (Feza's feet never sink into a rock)
    for (let z0 = 0; z0 < H; z0 += 1.85) for (let x0 = 0; x0 < W; x0 += 1.85) {
      const x = x0 + rnd() * 1.7, z = z0 + rnd() * 1.7, i = Math.floor(x), j = Math.floor(z);
      if (i < 0 || j < 0 || i >= W || j >= H || grid[j * W + i]) continue;
      const d = dF[j * W + i];
      if (d < 0.5 || d > 5 || (d > 3.2 && rnd() < 0.4)) continue;
      const g = gapAt(x, z);
      if (g <= 5) continue;   // the camera-side band is packed below
      const s = d < 2 ? 0.95 + rnd() * 0.75 : 1.4 + rnd() * 1.2, sz = s * (0.8 + rnd() * 0.4);
      let hy = 1.15 + rnd() * 0.8;
      for (const h of [hy, 0.75, 0.45, 0.3]) { hy = h; if (!hides(L, x, z, s, 0, 1.45 * s * h, 0.15)) break; }
      if (satCount(L, x - s * 0.9, z - s - 2, x + s * 0.9, z) > 0) hy = Math.min(hy, 0.8 / (1.45 * s));
      addRock(x, z, s, s * hy, 0.28 * s, sz, 0.25, g);
    }
    // the camera-side band: a jittered 1.3 m grid of low rocks, a smaller companion now and then
    for (let z0 = 0; z0 < H; z0 += 1.3) for (let x0 = 0; x0 < W; x0 += 1.3) {
      let x = x0 + rnd() * 1.2, z = z0 + rnd() * 1.2;
      const c = cellOf(x, z);
      if (c < 0 || grid[c]) continue;
      let g = gapAt(x, z);
      if (g > 5) continue;
      const near = g <= 2, n = near ? (rnd() < 0.45 ? 2 : 1) : (rnd() < 0.3 ? 2 : 1);
      for (let r = 0; r < n; r++) {
        const s = r ? 0.42 + rnd() * 0.3 : near ? 0.58 + rnd() * 0.42 : 0.8 + rnd() * 0.55, sz = s * (0.8 + rnd() * 0.45);
        if (r) { x += (rnd() - 0.5) * 1.5; z += (rnd() - 0.5) * 1.2; const c2 = cellOf(x, z); if (c2 < 0 || grid[c2]) continue; g = gapAt(x, z); }
        const z1 = hug(x, z, g, sz); g += z1 - z; z = z1;
        const ap = addRock(x, z, s, s * (0.5 + rnd() * 0.55), 0.2 * s, sz, 0.14, g, r > 0);
        if (r) continue;
        const roll = rnd();
        if (roll < 0.2) {   // a soft moss cushion (tiny flowers) on the rock's crown
          const ms = Math.min(s, sz) * (0.6 + rnd() * 0.25);
          dec(B, 'decor', rockMossGeo(Math.floor(rnd() * 3)), mat4(ap.x, ap.y - 0.05 * ms, ap.z, rnd() * TAU, ms, ms * 0.8, ms), null);
          RS.moss++;
        } else if (roll < 0.29) {   // a few tiny glowing mushrooms growing on top
          const v = Math.floor(rnd() * 3), gs = 0.55 + rnd() * 0.3, ry = rnd() * TAU;
          dec(B, 'glow', glowCapGeo(v), mat4(ap.x, ap.y - 0.03, ap.z, ry, gs), lin(0xffffff, 0.8));
          dec(B, 'decor', glowStemGeo(), mat4(ap.x, ap.y - 0.03, ap.z, ry, gs), null);
          B.pts.add.push({ x: ap.x, y: ap.y + 0.35, z: ap.z, kind: 2, ph: rnd(), size: 0.12, prm: 0.3 + rnd() * 0.3, col: lin([0x555d68, 0x4a515b, 0x545c68][v], 2) });
          RS.caps++;
        }
      }
    }
    // fill the holes of the band (0.5 m cells no rock covers, with most of their neighbours open too — thin cracks stay as dark
    // crevices) with small low rocks
    const open = (a, b) => a >= 0 && b >= 0 && a < CW && b < CH && !cov[b * CW + a];
    for (let b = 0; b < CH; b++) for (let a = 0; a < CW; a++) {
      if (cov[b * CW + a]) continue;
      let no = 0;
      for (let db = -1; db <= 1; db++) for (let da = -1; da <= 1; da++) no += open(a + da, b + db);
      if (no < 8) continue;
      let x = (a + 0.2 + rnd() * 0.6) / 2, z = (b + 0.2 + rnd() * 0.6) / 2;
      const c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 6) continue;
      let g = gapAt(x, z);
      if (g > 5) continue;
      const s = 0.5 + rnd() * 0.3, sz = s * (0.8 + rnd() * 0.4), z1 = hug(x, z, g, sz);
      g += z1 - z; z = z1;
      addRock(x, z, s, s * (0.55 + rnd() * 0.5), 0.2 * s, sz, 0.14, g, true);
      RS.fill++;
    }
    // stalagmites in the rock band
    for (let n = 0; n < W * H / 45; n++) {
      const x = rnd() * W, z = rnd() * H, i = Math.floor(x), j = Math.floor(z), c = j * W + i;
      if (grid[c] || dF[c] < 0.8 || dF[c] > 4.5) continue;
      const s = Math.min(0.6 + rnd() * 0.8, capAt(gapAt(x, z)) / 1.8);   // graded like the boulders on the camera side
      if (s < 0.3 || hides(L, x, z, 0.5 * s, 0, 1.8 * s, 0.1)) continue;
      inst(B, 'stal', mat4(x, 0, z, rnd() * TAU, s), rockTint());
    }
    // things standing on the floor inside a room: against a wall, never in a corridor (main or side), leaving a real gap or
    // none, and never hiding floor behind them from the camera (so only in front of north walls)
    const arenaRm = L.rooms.find(q => q.kind === 'boss' && !q.hw);   // the boss arena's floor stays clear (its rim gets its own decor)
    const roomSpot = (x, z, r, h) => !(arenaRm && inRoom(arenaRm, x, z, -1.5)) && linkDist(L, x, z) >= 2.5 && gapOKL(L, x, z, r) && hiddenBehind(L, x, z, r, h) === 0 &&
      !L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + r + 1.1) && !L.spawns.some(q => hyp(q.x - x, q.z - z) < 1.6) &&
      !L.chests.some(q => hyp(q.x - x, q.z - z) < 2.5) && !L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 3) && !(L.exit && hyp(L.exit.x - x, L.exit.z - z) < 4);
    // a few stalagmites inside the rooms, hugging the walls (they block like the rocks around them)
    let nIn = 0;
    for (let n = 0; n < W * H / 25 && nIn < 18; n++) {
      const x = rnd() * W, z = rnd() * H, c = Math.floor(z) * W + Math.floor(x);
      if (!grid[c] || dW[c] > 1.25 || dW[c] < 0.9) continue;
      const s = 0.45 + rnd() * 0.35, r = 0.38 * s + 0.12;
      if (L.path.some(p => hyp(p.x - x, p.z - z) < 2.8) || !roomSpot(x, z, r, 1.8 * s)) continue;
      propSolid(L, x, z, r, 'stal', [inst(B, 'stal', mat4(x, 0, z, rnd() * TAU, s), rockTint())]);
      nIn++;
    }
    // crystal clusters (glow + a few assigned point lights) and glowing mushrooms: mostly in the rock band next to the floor,
    // a few inside the rooms against a north wall (those block like the stalagmites)
    const crystals = [];
    let nCin = 0;
    for (let n = 0; n < W * H / 20 && crystals.length < 42; n++) {
      const x = rnd() * W, z = rnd() * H, i = Math.floor(x), j = Math.floor(z), c = j * W + i;
      const inside = grid[c] === 1;
      if (inside ? (dW[c] > 1.25 || nCin >= 8) : dF[c] > 1.6) continue;
      if (crystals.some(q => hyp(q[0] - x, q[1] - z) < 4.2)) continue;
      const v = Math.floor(rnd() * 8), s = inside ? 0.9 + rnd() * 0.8 : Math.min(0.9 + rnd() * 0.8, (capAt(gapAt(x, z)) + 0.3) / 1.3), r = 0.3 * s + 0.1;   // thin + glowing: a little taller than the rocks may be
      if (inside ? !roomSpot(x, z, r, 1.3 * s) : hides(L, x, z, 0.35 * s, 0, 1.3 * s, 0.05)) continue;
      crystals.push([x, z]);
      const vis = [dec(B, 'glow', crystalGeo(v), mat4(x, -0.05, z, rnd() * TAU, s), null),
        dec(B, 'rock', rockGeo(v % 3), mat4(x, 0, z, rnd() * TAU, 0.35 * s, 0.2 * s, 0.3 * s), lin(0x3d434c))];
      if (inside) { propSolid(L, x, z, r, 'cry', vis); nCin++; }
      const col = new THREE.Color(CRYSTAL_COL[v % 4]);
      B.lights.push({ x, y: 1.1, z, col, int: 5.5, dist: 7.5, fl: 0, ph: rnd() * 10 });
      glowAt(B, x, z, 2.8 + s * 1.1, col, 0.85);
      for (let m = 0; m < 3; m++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.8, y: 0.3 + rnd() * 0.8, z: z + (rnd() - 0.5) * 0.8, kind: 2, ph: rnd(), size: 0.16, prm: 0.3 + rnd() * 0.3, col: col.clone().multiplyScalar(2.2) });
    }
    for (let n = 0; n < W * H / 90; n++) {
      const x = rnd() * W, z = rnd() * H, i = Math.floor(x), j = Math.floor(z), c = j * W + i;
      const inside = grid[c] === 1;
      if (inside ? dW[c] > 1.8 : (dF[c] < 0.3 || dF[c] > 1.5)) continue;
      const v = Math.floor(rnd() * 3), s = 0.8 + rnd() * 0.8, ry = rnd() * TAU;
      dec(B, 'glow', glowCapGeo(v), mat4(x, 0, z, ry, s), lin(0xffffff, 0.8));
      glowAt(B, x, z, 1.3 * s, [0x555d68, 0x4a515b, 0x545c68][v], 0.3);
      dec(B, 'decor', glowStemGeo(), mat4(x, 0, z, ry, s), null);
    }
    // pebbles and small rocks along the walls
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const c = j * W + i;
      if (!grid[c] || dW[c] > 2.2 || rnd() > 0.05) continue;
      dec(B, 'decor', pebbleGeo(1 + Math.floor(rnd() * 2), true), mat4(i + rnd(), 0, j + rnd(), rnd() * TAU, 1), null);
    }
    // the boss arena: crystal clusters around its rim, the mine-cart corner
    caveArena(L, B, crystals, capAt, gapAt);
    // the moles' and snails' home: molehills, hanging roots with glowing buds, moss cushions, lamp mushrooms, slime trails
    caveFriends(L, B, crystals, roomSpot);
    // glowing light motes and floating dust
    for (let n = 0; n < 60; n++) {
      const x = rnd() * W, z = rnd() * H;
      if (!grid[Math.floor(z) * W + Math.floor(x)]) continue;
      B.pts.add.push({ x, y: 0.5 + rnd() * 1.8, z, kind: 4, ph: rnd(), size: 0.12, prm: 0.6 + rnd() * 0.6, col: lin(pick([0x555d69, 0x565e6b, 0x5a626f]), 2.4) });
    }
    for (let n = 0; n < 50; n++) {
      const x = rnd() * W, z = rnd() * H;
      if (!grid[Math.floor(z) * W + Math.floor(x)]) continue;
      B.pts.add.push({ x, y: 0.5 + rnd() * 2.2, z, kind: 1, ph: rnd(), size: 0.07, prm: 0.5 + rnd() * 0.5, col: lin(0x565e6b, 0.9) });
    }
  }
  // ── Boss arenas (forest / cave; the volcano's is in buildVolcano, the castle keeps its hall). L.arenaDecor: spots for tests ──
  // Walk from the arena's centre outward along angle a to the floor edge (null where a corridor leaves)
  function arenaEdge(L, ar, a, far = 5) {
    const dx = Math.cos(a), dz = Math.sin(a);
    let r = ar.r * 0.6;
    while (r < ar.r + far && isFloor(L, ar.x + dx * r, ar.z + dz * r)) r += 0.2;
    return r >= ar.r + far ? null : { r, dx, dz, x: ar.x + dx * r, z: ar.z + dz * r };
  }
  // Forest: Kral Jöle's flower-and-mushroom clearing — giant friendly toadstools around the rim (low ones on the camera side),
  // a fairy ring of little mushrooms and flowers where the king waits, glowing light motes, sparkles and drifting blossoms
  function bigMushGeo(v) {   // a big friendly toadstool (≈1.03 m tall at scale 1): cream stem, round cap with white spots, pale gills
    const key = 'bigMush' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(3100 + v * 13), capC = new THREE.Color([0x453137, 0x583c43, 0x50373d, 0x543a41][v % 4]), capT = capC.clone().lerp(new THREE.Color(0xffffff), 0.12);   // not too bright: the forest sun is strong
    k.add(G.cyl(0.8, 1, 14), (x, y) => new THREE.Color(0x616a78).multiplyScalar(0.82 + 0.18 * clamp(y / 0.6, 0, 1)), [0, 0.31, 0], 0, [0.19, 0.62, 0.19]);
    k.add(G.sphere(14, 10), 0x5f6875, [0, 0.07, 0], 0, [0.24, 0.12, 0.24]);
    k.add(G.cyl(1, 1, 22), 0x5d6672, [0, 0.605, 0], 0, [0.56, 0.03, 0.56]);
    k.add(G.hemi(22), (x, y) => capC.clone().lerp(capT, clamp((y - 0.6) / 0.42, 0, 1)), [0, 0.6, 0], 0, [0.6, 0.42, 0.6]);
    for (let i = 0; i < 10; i++) {
      const a = rnd() * TAU, e = 0.3 + rnd() * 1.0, px = Math.cos(a) * Math.cos(e) * 0.6, py = 0.6 + Math.sin(e) * 0.42, pz = Math.sin(a) * Math.cos(e) * 0.6;
      const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(px / 0.36, (py - 0.6) / 0.18, pz / 0.36).normalize());
      k.add(G.sphere(10, 6), 0xffffff, [px, py, pz], q, [0.07 + rnd() * 0.03, 0.02, 0.07 + rnd() * 0.03]);
    }
    return (R.geo[key] = keep(k.build()));
  }
  function forestArenaPlan(L, B) {
    const ar = L.rooms.find(r => r.kind === 'boss' && !r.hw);
    if (!ar) return null;
    const rnd = B.rnd, big = [];
    for (let a = rnd(); a < TAU + rnd() * 0.1; a += 0.26 + rnd() * 0.1) {
      const e = arenaEdge(L, ar, a);
      if (!e) continue;
      const o = 0.75 + rnd() * 1.0, x = e.x + e.dx * o, z = e.z + e.dz * o;
      if (isFloor(L, x, z) || linkDist(L, x, z) < 3 || big.some(m => hyp(m.x - x, m.z - z) < 1.1)) continue;
      let s = Math.min(1.1 + rnd() * 1.2, southCap(southGap(L, x, z), 0.7, 1.0) / 1.03);
      while (s >= 0.5 && hides(L, x, z, 0.6 * s, 0.4 * s, 1.03 * s, 0.25)) s *= 0.85;
      if (s < 0.5) continue;
      big.push({ x, z, s, v: Math.floor(rnd() * 4), ry: rnd() * TAU });
      B.noTree.push({ x, z, r: 0.75 * s + 0.5 });
    }
    return { ar, big };
  }
  function forestArenaDecor(L, B, plan) {
    const ar=L.rooms.find(r=>r.kind==='boss');if(!ar)return;
    const n=14;for(let i=0;i<n;i++){const a=i*TAU/n,x=ar.x+Math.cos(a)*(ar.r+0.7),z=ar.z+Math.sin(a)*(ar.r+0.7),sc=hides(L,x,z,0.5,0,1.6,0.05)?0.33:0.85;dec(B,'prop',dreadGeo(i%4===0?2:0),mat4(x,0,z,-a,sc),null);}
    L.arenaDecor={graves:n,ring:0};
  }
  // Cave: Usta Köstebek's crystal cavern — big glowing crystal clusters around the rim (small ones on the camera side), and a
  // mine-cart corner: rails coming out of the rock, a cart full of glowing crystals, a lantern post, a pickaxe
  function mineCartData() {
    if (R.geo.cart) return R.geo.cart;
    const w = new Kit(), m = new Kit(), iron = 0x30343b, wood = 0x5c6572;
    const box = R.geo.cartBox || (R.geo.cartBox = keep(boxUV(1, 1, 1, 0.5)));
    w.add(box, wood, [0, 0.5, 0], 0, [0.78, 0.44, 1.1]);                                 // the tub
    w.add(G.box(), 0x1f191e, [0, 0.715, 0], 0, [0.68, 0.02, 1.0]);
    for (const z of [-0.5, 0, 0.5]) m.add(MK(G.box()), iron, [0, 0.5, z], 0, [0.82, 0.46, 0.06]);   // iron bands
    m.add(MK(G.box()), iron, [0, 0.73, 0], 0, [0.84, 0.04, 1.14]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      m.add(MK(G.cyl(1, 1, 16)), 0x25272e, [sx * 0.36, 0.17, sz * 0.36], [0, 0, Math.PI / 2], [0.16, 0.07, 0.16]);
      m.add(MK(G.cyl(1, 1, 8)), 0x5c3e45, [sx * 0.4, 0.17, sz * 0.36], [0, 0, Math.PI / 2], [0.05, 0.02, 0.05]);
    }
    m.add(MK(G.cyl(1, 1, 8)), iron, [0, 0.17, 0.36], [0, 0, Math.PI / 2], [0.03, 0.72, 0.03]);
    m.add(MK(G.cyl(1, 1, 8)), iron, [0, 0.17, -0.36], [0, 0, Math.PI / 2], [0.03, 0.72, 0.03]);
    const g = new Kit();   // glowing crystals heaped in the tub
    for (let i = 0; i < 6; i++) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((i % 3 - 1) * 0.4, i * 1.1, (i % 2 - 0.5) * 0.5)); g.push([(i % 2 - 0.5) * 0.3, 0.62, (i % 3 - 1) * 0.32], q); g.add(G.cyl(1, 1, 6), new THREE.Color(CRYSTAL_COL[i % 4]).multiplyScalar(0.7), [0, 0.12, 0], 0, [0.07, 0.3, 0.07]); g.add(G.cone(6), CRYSTAL_COL[i % 4], [0, 0.32, 0], 0, [0.07, 0.1, 0.07]); g.pop(); }
    const r = new Kit();   // rails + sleepers (local +z: into the arena, from under the rock at z = -1)
    for (let z = -0.9; z <= 4.0; z += 0.55) r.add(box, 0x67454d, [0, 0.025, z], [0, (Math.sin(z * 7) * 0.06), 0], [1.05, 0.05, 0.2]);
    for (const sx of [-0.36, 0.36]) r.add(MK(G.box()), 0x414750, [sx, 0.07, 1.55], 0, [0.05, 0.06, 5.1]);
    r.add(box, 0x553a41, [0, 0.16, 4.1], 0, [0.95, 0.2, 0.16]); for (const sx of [-0.32, 0.32]) r.add(box, 0x4e363c, [sx, 0.1, 4.2], 0, [0.12, 0.2, 0.12]);   // buffer stop
    const p = new Kit();   // lantern post + pickaxe
    p.add(G.cyl(0.8, 1, 8), 0x5c3f46, [0, 0.75, 0], 0, [0.06, 1.5, 0.06]);
    p.add(G.box(), 0x5c3f46, [0.18, 1.45, 0], 0, [0.4, 0.06, 0.06]);
    p.add(MK(G.cyl(1, 1, 8)), iron, [0.34, 1.34, 0], 0, [0.09, 0.03, 0.09]); p.add(MK(G.cone(8)), iron, [0.34, 1.13, 0], [Math.PI, 0, 0], [0.1, 0.06, 0.1]);
    p.add(G.cyl(1, 1, 8), 0x5c3f46, [0.9, 0.45, 0.35], [0, 0, 0.45], [0.03, 0.9, 0.03]);   // pickaxe handle leaning on the cart
    p.add(MK(G.torus(Math.PI * 0.8, 0.12, 12)), 0x484e59, [0.72, 0.86, 0.35], [0, 0, 0.45 + Math.PI * 0.6], [0.28, 0.28, 0.28]);
    const lg = new Kit(); lg.add(G.box(), 0x5c6572, [0.34, 1.22, 0], 0, [0.12, 0.16, 0.12]);
    return (R.geo.cart = { wood: keep(w.build()), metal: keep(m.build()), glow: keep(g.build()), rails: keep(r.build()), post: keep(p.build()), lamp: keep(lg.build()) });
  }
  function caveArena(L, B, crystals, capAt, gapAt) {
    const ar = L.rooms.find(r => r.kind === 'boss' && !r.hw);
    if (!ar) return;
    const rnd = B.rnd, out = L.arenaDecor = { crystals: 0, cart: null };
    for (let a = rnd(); a < TAU; a += 0.4 + rnd() * 0.18) {
      const e = arenaEdge(L, ar, a);
      if (!e) continue;
      const o = 0.45 + rnd() * 1.1, x = e.x + e.dx * o, z = e.z + e.dz * o;
      if (isFloor(L, x, z) || linkDist(L, x, z) < 2.8 || crystals.some(q => hyp(q[0] - x, q[1] - z) < 2.0) || (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 2.6)) continue;
      const north = e.dz < -0.35;
      let s = north ? 1.3 + rnd() * 1.2 : Math.min(1.2 + rnd() * 0.4, (capAt(gapAt(x, z)) + 0.3) / 1.3);
      while (s >= 0.45 && hides(L, x, z, 0.35 * s, 0, 1.3 * s, 0.05)) s *= 0.85;
      if (s < 0.45) continue;
      crystals.push([x, z]);
      const v = Math.floor(rnd() * 8), col = new THREE.Color(CRYSTAL_COL[v % 4]);
      dec(B, 'glow', crystalGeo(v), mat4(x, -0.05, z, rnd() * TAU, s), null);
      dec(B, 'rock', rockGeo(v % 3), mat4(x, 0, z, rnd() * TAU, 0.4 * s, 0.22 * s, 0.34 * s), lin(0x3d434c));
      if (out.crystals % 2 === 0) B.lights.push({ x: x - e.dx * 0.6, y: 1.1, z: z - e.dz * 0.6, col, int: 5, dist: 8, fl: 0, ph: rnd() * 10 });
      glowAt(B, x - e.dx * 0.8, z - e.dz * 0.8, 2.6 + s, col, 0.75);
      for (let m = 0; m < 3; m++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.8, y: 0.3 + rnd() * 1.1, z: z + (rnd() - 0.5) * 0.8, kind: 2, ph: rnd(), size: 0.17, prm: 0.3 + rnd() * 0.3, col: col.clone().multiplyScalar(2.2) });
      out.crystals++;
    }
    // the mine-cart corner: north-west or north-east (the side whose cart hides the least floor), cart hugging the rock
    let best = null;
    for (let a = -Math.PI * 0.95; a <= Math.PI * 0.2; a += 0.12) {   // the northern half first (it hides nothing), then the sides
      const e = arenaEdge(L, ar, a);
      if (!e) continue;
      for (const o of [0.75, 0.65, 0.85]) {
        const cx = e.x - e.dx * o, cz = e.z - e.dz * o;
        if (!isFloor(L, cx, cz) || gridFree(L, cx, cz, 0.9) || !gridFree(L, cx, cz, 0.45)) continue;   // hugging the rock, no gap to get stuck in
        if ((L.exit && hyp(L.exit.x - cx, L.exit.z - cz) < 4.5) || linkDist(L, cx, cz) < 3 || L.torches.some(t => hyp(t.x - cx, t.z - cz) < 1.6) || L.solids.some(q => hyp(q.x - cx, q.z - cz) < q.r + 1.4)) continue;
        const k = hiddenBehind(L, cx, cz, 0.7, 1.0) + Math.abs(Math.abs(a + Math.PI / 2) - 0.8) * 0.6 + (a > -0.2 || a < -Math.PI + 0.2 ? 3 : 0);
        if (!best || k < best.k) best = { e, cx, cz, k };
        break;
      }
    }
    if (best) {
      const { e, cx, cz } = best, D = mineCartData(), yaw = Math.atan2(-e.dx, -e.dz);   // local +z points into the arena
      const at = (lx, lz) => [cx + Math.sin(yaw) * lz + Math.cos(yaw) * lx, cz + Math.cos(yaw) * lz - Math.sin(yaw) * lx];
      const [rx, rz] = at(0, -0.3), Mr = mat4(rx, 0, rz, yaw), Mc = mat4(cx, 0.02, cz, yaw);
      dec(B, 'prop', D.rails, Mr, null);
      const vis = [dec(B, 'prop', D.wood, Mc, null), dec(B, 'prop', D.metal, Mc, null), dec(B, 'glow', D.glow, Mc, lin(0xffffff, 0.75))];
      propSolid(L, cx, cz, 0.62, 'cart', vis);
      const [px, pz] = at(-0.95, -0.25), Mp = mat4(px, 0, pz, yaw);
      if (isFloor(L, px, pz) && !gridFree(L, px, pz, 0.5)) {
        const pv = [dec(B, 'prop', D.post, Mp, null), dec(B, 'window', D.lamp, Mp, null)];
        propSolid(L, px, pz, 0.14, 'lamp', pv);
        const [lx, lz] = at(-0.61, -0.25);
        B.lights.push({ x: lx, y: 1.25, z: lz + 0.2, col: new THREE.Color(0x6f4a51), int: 3, dist: 6.5, fl: 0.25, ph: rnd() * 9 });
        glowAt(B, lx, lz + 0.3, 2.2, 0x6f4a51, 0.35);
      }
      B.lights.push({ x: cx, y: 1.0, z: cz, col: new THREE.Color(0x565e6b), int: 3.2, dist: 6, fl: 0, ph: 0 });
      glowAt(B, cx, cz, 2.2, 0x565e6b, 0.4);
      for (let n = 0; n < 4; n++) { const [gx, gz] = at((rnd() - 0.5) * 1.6, 0.9 + rnd() * 1.4); if (isFloor(L, gx, gz)) dec(B, 'glow', crystalGeo(Math.floor(rnd() * 8)), mat4(gx, -0.03, gz, rnd() * TAU, 0.3 + rnd() * 0.15), null); }
      out.cart = { x: cx, z: cz };
    }
  }
  // ── Volcano: lava (drawn by the floor shader), basalt boulders + columns, glossy obsidian and glowing fire gems, steam vents with
  //    cute puffs, fire flowers, rising embers, warm lava light, paved bridges, and the boss arena's lava moat with cliffs and little
  //    lavafalls. Bright and cheerful: warm sun, peach fog, nothing dark or spiky. ──
  KIND.basaltC = { mat: 'rock', shadow: 'near', geo() {   // a cluster of hexagonal basalt columns (≈1 m tall at scale 1), flat tops
    const k = new Kit(), rnd = mulberry32(3300);
    for (const [x, z, h, r] of [[0, 0, 1.0, 0.34], [0.52, 0.12, 0.8, 0.3], [-0.46, 0.2, 0.72, 0.3], [0.1, -0.5, 0.64, 0.28], [0.2, 0.55, 0.88, 0.29], [-0.32, -0.42, 0.55, 0.26], [-0.64, -0.16, 0.46, 0.24]]) {
      const ry = rnd() * 1.05;
      k.add(G.cyl(1, 1, 6), 0xffffff, [x, h / 2 - 0.06, z], [0, ry, 0], [r, h + 0.12, r]);
      k.add(G.cyl(0.8, 1, 6), 0x606a77, [x, h + 0.025, z], [0, ry, 0], [r, 0.05, r]);   // chamfered top
    }
    return k.build();
  } };
  function gemGeo(v, warm) {   // chunky crystal clusters with blunt tops: glossy obsidian (decor 'shiny') or glowing fire gems ('glow')
    const key = (warm ? 'fgem' : 'obs') + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32((warm ? 3500 : 3400) + v * 7);
    const lo = new THREE.Color(warm ? [0x573b42, 0x553a41, 0x614148, 0x5f4047][v % 4] : 0x1f191e), hi = new THREE.Color(warm ? [0x59616e, 0x724c54, 0x5f6875, 0x754e56][v % 4] : 0x543940);
    const n = 3 + (v % 3);
    for (let i = 0; i < n; i++) {
      const h = (i ? 0.34 + rnd() * 0.36 : 0.82) * (1 + (v % 2) * 0.2), r = h * (warm ? 0.22 : 0.3), a = rnd() * TAU, tl = i ? 0.25 + rnd() * 0.35 : 0.06;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(a) * tl, rnd() * TAU, Math.sin(a) * tl));
      const facet = (x, z) => (Math.sin(x * 41.3 + z * 29.7) > 0 ? 1 : 0.7);   // alternate light / dark edges: reads as facets, even unlit
      const col = (x, y, z) => (warm ? lo.clone().lerp(hi, clamp(y / (h * 1.05), 0, 1)).multiplyScalar((0.4 + 0.75 * clamp(y / h, 0, 1)) * facet(x, z)) : lo.clone().lerp(hi, clamp(y / (h * 1.15), 0, 1) * 0.75 + Math.sin(x * 37 + y * 23) * 0.05));
      k.push([Math.cos(a) * 0.13 * (i > 0), 0, Math.sin(a) * 0.13 * (i > 0)], q);
      k.add(G.cyl(1, 1, 6), col, [0, h * 0.4, 0], 0, [r, h * 0.8, r]);
      k.add(G.cyl(0.42, 1, 6), col, [0, h * 0.88, 0], 0, [r, h * 0.16, r]);   // a blunt, rounded-looking top (no spikes)
      k.pop();
    }
    return (R.geo[key] = keep(k.build()));
  }
  function ventData() {   // a little basalt cone with a crater (rock material) and its glowing heart (glow)
    if (R.geo.vent) return R.geo.vent;
    const pts = [[0.001, 0.13], [0.12, 0.14], [0.17, 0.3], [0.24, 0.33], [0.42, 0.22], [0.62, 0.07], [0.72, 0]].map(p => new THREE.Vector2(p[0], p[1]));
    const k = new Kit(), g = new Kit(), rnd = mulberry32(3600);
    k.add(new THREE.LatheGeometry(pts, 14), (x, y) => new THREE.Color(0.62 + y * 0.9, 0.56 + y * 0.8, 0.54 + y * 0.75));
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + rnd(), d = 0.62 + rnd() * 0.2; k.add(rockSGeo(), 0x58616d, [Math.cos(a) * d, 0.02, Math.sin(a) * d], [rnd(), rnd() * 6, rnd()], [0.12 + rnd() * 0.07, 0.08, 0.1 + rnd() * 0.06]); }
    g.add(G.cyl(1, 1, 14), 0x624249, [0, 0.14, 0], 0, [0.14, 0.02, 0.14]);
    g.add(G.torus(TAU, 0.3, 14), 0x573b42, [0, 0.29, 0], [Math.PI / 2, 0, 0], [0.19, 0.19, 0.19]);
    return (R.geo.vent = { rock: keep(k.build()), glow: keep(g.build()) });
  }
  function fireFlowerData(v) { const key='ffl'+v;if(R.geo[key])return R.geo[key];const k=new Kit(),g=new Kit();k.seg([0,0,0],[0,0.28,0],0.035,0x524840,0.015,5);k.seg([-0.1,0.2,0],[0.1,0.2,0],0.025,0x998571,0.025,5);g.add(G.octa(),0x9d4833,[0,0.34,0],0,[0.055,0.12,0.045]);return (R.geo[key]={decor:keep(k.build()),glow:keep(g.build())});
  }
  // Little lavafalls pouring from the arena cliffs into the moat: curved ribbons, one mesh for all of them
  const LAVAFALL_VS = `attribute vec2 aF; varying vec2 vF; varying float vFogD;
    void main() { vF = aF; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFogD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const LAVAFALL_FS = `uniform float uTime, fogNear, fogFar; uniform vec3 fogColor; uniform sampler2D tNoise, tLava; varying vec2 vF; varying float vFogD;
    void main() {
      float x = vF.x, v = vF.y;   // x: 0..1 across · v: metres down from the lip (+ a phase)
      float e = smoothstep(0.0, 0.2, x) * smoothstep(1.0, 0.8, x);
      float s2 = texture2D(tNoise, vec2(x * 1.7 + 0.6, v * 0.3 - uTime * 0.7)).g;
      if (e * (0.85 + 0.5 * s2) < 0.3) discard;   // a wobbly edge
      vec3 lc = texture2D(tLava, vec2(x * 0.55 + v * 0.01, v * 0.028 - uTime * 0.1)).rgb;   // the lake's lava, stretched into falling streaks
      float h = dot(lc, vec3(0.45, 0.45, 0.1));
      vec3 col = lc * (0.7 + 1.6 * h * h) * (0.8 + 0.35 * s2) * mix(0.55, 1.0, e);
      col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogD));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`;
  function lavafallMat() {
    return R.mat.lavafall || (R.mat.lavafall = keep(new THREE.ShaderMaterial({
      uniforms: Object.assign({ uTime: TIME.u, tNoise: { value: texOK() && TEX.noise ? TEX.noise : blackTex() }, tLava: { value: surf('lava').map } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
      vertexShader: LAVAFALL_VS, fragmentShader: LAVAFALL_FS, side: THREE.DoubleSide, fog: true,
    })));
  }
  function finishLavafalls(B) {
    const list = B.falls;
    if (!list || !list.length) return;
    const NR = 12, NC = 5, pos = [], fa = [], idx = [];
    for (const f of list) {   // f: base (x, z), facing yaw (toward +z locally), height h, width w
      const cs = Math.cos(f.yaw), sn = Math.sin(f.yaw), v0 = pos.length / 3;
      for (let r = 0; r <= NR; r++) {
        const t = r / NR, y = f.h * (1 - Math.pow(t, 1.25)), back = -1.25 * Math.pow(1 - t, 2) - 0.05, w = f.wt ? lerp(f.wt, f.w * 1.08, Math.pow(t, 0.7)) : f.w * (0.78 + 0.3 * t);   // (wt: poured from a jug's mouth)
        for (let c = 0; c <= NC; c++) {
          const u = c / NC, lx = (u - 0.5) * w + Math.sin(t * 7 + f.ph + u * 3) * 0.03, lz = back + Math.sin(u * Math.PI) * 0.08;
          pos.push(f.x + lx * cs + lz * sn, y, f.z - lx * sn + lz * cs);
          fa.push(u, t * f.h * 1.25 + f.ph);
        }
      }
      for (let r = 0; r < NR; r++) for (let c = 0; c < NC; c++) { const a = v0 + r * (NC + 1) + c, b = a + NC + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.Float32BufferAttribute(fa, 2));
    g.setIndex(idx); g.computeBoundingSphere();
    B.dispose.push(g);
    const m = new THREE.Mesh(g, B.fallMat === 'milk' ? milkfallMat() : lavafallMat()); m.name = B.fallMat === 'milk' ? 'milkfalls' : 'lavafalls'; m.renderOrder = 1;
    B.g.add(m);
  }
  function buildVolcano(L, B) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid, dW = L.dWall, V = L._volc || volcanoField(L), M = L._mask;
    const dF = L._dF = chamfer(W, H, grid, 1);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const lavaAt = (x, z) => V.lava[clamp(Math.floor(z * V.P), 0, V.MH - 1) * V.MW + clamp(Math.floor(x * V.P), 0, V.MW - 1)];
    const cellOf = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    const maskAt = (x, z, ch) => { const px = clamp(Math.floor(x * MPX), 0, M.W - 1), py = clamp(Math.floor(z * MPX), 0, M.H - 1); return M.data[(py * M.W + px) * 4 + ch] / 255; };
    const gapAt = (x, z) => southGap(L, x, z), capAt = g => southCap(g, 0.6, 1.0);
    const ar = V.arena, inArena = (x, z, pad = 0) => !!ar && inRoom(ar, x, z, pad);
    const tint = () => lin(pick([0x3a3f48, 0x373c45, 0x3d424b, 0x363a42, 0x3f444e]), 0.8 + rnd() * 0.28);
    const tintC = () => lin(pick([0x333740, 0x31343c, 0x363a43]), 0.85 + rnd() * 0.25);   // basalt columns: darker
    const busy = (x, z, pad) => (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 3.4 + pad) || L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 2.4 + pad) ||
      L.chests.some(q => hyp(q.x - x, q.z - z) < 1.3 + pad) || L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + pad) || (L.start && hyp(L.start.x - x, L.start.z - z) < 1.5 + pad) ||
      (L.boss && hyp(L.boss.x - x, L.boss.z - z) < 4 + pad);
    const RS = L.volcDecor = { rocks: 0, cols: 0, islands: 0, gems: 0, vents: 0, flowers: 0, lights: 0, embers: 0, falls: 0, bridges: V.bridges.length };   // tests / debugging
    const RG = [rockGeo(0), rockGeo(1), rockGeo(2), rockSGeo()], rTop = RG.map(g => { if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.max.y + 0.22; });
    const nearLava = (x, z, r) => { let m = lavaAt(x, z); for (let k = 0; k < 8; k++) m = Math.max(m, lavaAt(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r)); return m; };
    const nearLavaMin = (x, z, r) => { let m = lavaAt(x, z); for (let k = 0; k < 8; k++) m = Math.min(m, lavaAt(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r)); return m; };
    const rock = (x, z, s, sy, sz, tilt, small) => {
      const k = small ? 3 : Math.floor(rnd() * 3);
      inst(B, small ? 'rockS' : 'rock' + k, mat4(x, 0.22 * sy, z, rnd() * TAU, s, sy, sz, (rnd() - 0.5) * tilt, (rnd() - 0.5) * tilt), tint());
      RS.rocks++;
      return rTop[k] * sy;
    };
    // basalt ground: boulders, columns (tall only where they hide no floor), a low band on the camera side; small islets in the lava
    for (let z0 = 0; z0 < H; z0 += 1.9) for (let x0 = 0; x0 < W; x0 += 1.9) {
      const x = x0 + rnd() * 1.75, z = z0 + rnd() * 1.75, c = cellOf(x, z);
      if (c < 0 || grid[c]) continue;
      const d = dF[c], lv = lavaAt(x, z), g = gapAt(x, z);
      if (d < 0.6 || d > 12.5 || (V.dA && V.dA[c] < 5.4 && lv <= 0.35)) continue;
      if (lv > 0.35) {   // an islet now and then (low, round)
        if (d > 1.8 && rnd() < 0.045 && !inArena(x, z, -4.2)) { const s = 0.45 + rnd() * 0.45; rock(x, z, s, Math.min(s * 0.5, capAt(g) * 0.8 / rTop[3]), s * (0.8 + rnd() * 0.4), 0.1, true); RS.islands++; }
        continue;
      }
      if (d > 5.5 && rnd() < (d > 8.5 ? 0.5 : 0.3)) continue;
      if (nearLava(x, z, 0.9) > 0.5) continue;   // the lava shores stay open (bridges, moat)
      if (g <= 5) {   // camera side: low and round
        const s = 0.6 + rnd() * 0.45, sz = s * (0.8 + rnd() * 0.4);
        if (nearLava(x, z, s + 0.3) > 0.5) continue;
        rock(x, z, s, Math.max(0.2 * s, Math.min(s * (0.5 + rnd() * 0.5), capAt(g) / rTop[0])), sz, 0.14);
        continue;
      }
      if (d > 1.1 && d < 6.5 && rnd() < 0.4) {   // basalt columns
        const s = 0.8 + rnd() * 0.6;
        let hy = 0;
        if (nearLava(x, z, 0.8 * s + 0.3) > 0.5) continue;
        for (const h of [3.2, 2.4, 1.7, 1.1, 0.7]) if (!hides(L, x, z, 0.8 * s, 0, h, 0.2)) { hy = h; break; }
        if (hy && hy <= southCap(g, 0.6, 1.0) + 1e-6) { inst(B, 'basaltC', mat4(x, 0, z, rnd() * TAU, s, hy * (0.85 + rnd() * 0.2), s), tintC()); RS.cols++; continue; }
      }
      const s = d < 2 ? 0.95 + rnd() * 0.7 : d > 7 ? 1.9 + rnd() * 1.3 : 1.4 + rnd() * 1.1, sz = s * (0.8 + rnd() * 0.4);
      if (nearLava(x, z, Math.max(s, sz) + 0.3) > 0.5) continue;
      let hy = 1.1 + rnd() * 0.7;
      for (const h of [hy, 0.75, 0.45, 0.3]) { hy = h; if (!hides(L, x, z, s, 0, 1.45 * s * h, 0.15)) break; }
      rock(x, z, s, s * hy, sz, 0.25);
    }
    // fill the basalt ground near the floor with small stones (the lava needs none)
    for (let z0 = 0; z0 < H; z0 += 1.3) for (let x0 = 0; x0 < W; x0 += 1.3) {
      const x = x0 + rnd() * 1.2, z = z0 + rnd() * 1.2, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 4 || dF[c] < 0.7 || lavaAt(x, z) > 0.2 || (V.dA && V.dA[c] < 5.4) || rnd() < 0.55 || nearLava(x, z, 0.7) > 0.5) continue;
      const s = 0.4 + rnd() * 0.3;
      rock(x, z, s, Math.min(s * (0.5 + rnd() * 0.4), capAt(gapAt(x, z)) / rTop[3]), s * (0.8 + rnd() * 0.4), 0.14, true);
    }
    // obsidian clusters and glowing fire gems on the basalt ground next to the floor (fire gems light their surroundings)
    const gems = [];
    for (let n = 0; n < W * H / 10 && gems.length < 34; n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 4 || dF[c] < 0.5 || lavaAt(x, z) > 0.3) continue;
      if (gems.some(q => hyp(q[0] - x, q[1] - z) < 4.2)) continue;
      const warm = rnd() < 0.42, s = Math.min(0.85 + rnd() * 0.75, (capAt(gapAt(x, z)) + 0.25) / 1.05);
      if (s < 0.4 || hides(L, x, z, 0.35 * s, 0, 1.0 * s, 0.05)) continue;
      gems.push([x, z]);
      const v = Math.floor(rnd() * 6), m = mat4(x, -0.04, z, rnd() * TAU, s);
      dec(B, warm ? 'glow' : 'shiny', gemGeo(v, warm), m, warm ? lin(0xffffff, 0.55) : null);
      dec(B, 'rock', rockGeo(v % 3), mat4(x, 0, z, rnd() * TAU, 0.34 * s, 0.18 * s, 0.3 * s), lin(0x3c414a));
      if (!warm && rnd() < 0.4) dec(B, 'glow', gemGeo(v + 1, true), mat4(x + 0.35 * s, -0.04, z + 0.2 * s, rnd() * TAU, s * 0.45), lin(0xffffff, 0.55));
      if (warm) {
        const col = new THREE.Color([0x624249, 0x604148, 0x6b484f, 0x64434b][v % 4]);
        B.lights.push({ x, y: 0.9, z: z + 0.2, col, int: 3.2, dist: 6, fl: 0, ph: rnd() * 10 });
        glowAt(B, x, z + 0.2, 2.2 + s, col, 0.5);
        for (let m2 = 0; m2 < 3; m2++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.7, y: 0.3 + rnd() * 0.7, z: z + (rnd() - 0.5) * 0.7, kind: 2, ph: rnd(), size: 0.15, prm: 0.3 + rnd() * 0.3, col: col.clone().multiplyScalar(2) });
      }
      RS.gems++;
    }
    // glowing fire-gem islets in the lava near the shores (low: the camera side has lots of lava)
    for (let n = 0, made = 0; n < W * H / 8 && made < 12; n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 4.5 || dF[c] < 1.8 || lavaAt(x, z) < 0.85 || nearLavaMin(x, z, 1.0) < 0.6 || inArena(x, z, -5)) continue;
      if (gems.some(q => hyp(q[0] - x, q[1] - z) < 5) || linkDist(L, x, z) < 3) continue;
      const s = Math.min(0.6 + rnd() * 0.3, (capAt(gapAt(x, z)) + 0.2) / 0.95);
      if (s < 0.45 || hides(L, x, z, 0.45 * s, 0, 0.9 * s, 0.05)) continue;
      gems.push([x, z]); made++;
      rock(x, z, s, s * 0.45, s * 0.9, 0.08, true);
      const v = rnd() < 0.5 ? 0 : 2, col = new THREE.Color(v ? 0x6b484f : 0x624249);
      dec(B, 'glow', gemGeo(v, true), mat4(x, 0.08, z, rnd() * TAU, s), lin(0xffffff, 0.6));
      glowAt(B, x, z, 1.8, col, 0.3);
      RS.gems++;
    }
    // steam vents on the basalt ground beside the floor: soft round puffs rising
    const vents = [];
    for (let n = 0; n < W * H / 8 && vents.length < 14; n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 3.5 || dF[c] < 0.8 || lavaAt(x, z) > 0.15) continue;
      if (vents.some(q => hyp(q[0] - x, q[1] - z) < 7) || gems.some(q => hyp(q[0] - x, q[1] - z) < 1.6)) continue;
      const s = Math.min(0.9 + rnd() * 0.5, capAt(gapAt(x, z)) / 0.35);
      if (s < 0.5 || hides(L, x, z, 0.6 * s, 0, 0.35 * s, 0.1)) continue;
      vents.push([x, z]);
      const D = ventData(), m = mat4(x, 0, z, rnd() * TAU, s);
      dec(B, 'rock', D.rock, m, tint()); dec(B, 'glow', D.glow, m, lin(0xffffff, 0.9));
      glowAt(B, x, z, 1.6 * s, 0x5d3f46, 0.35);
      for (let p = 0; p < 6; p++) B.pts.norm.push({ x: x + (rnd() - 0.5) * 0.1, y: 0.32 * s, z: z + (rnd() - 0.5) * 0.1, kind: 7, ph: p / 6 + rnd() * 0.05, size: 0.62, prm: 0.2 + rnd() * 0.04, col: lin(0x656f7d, 1.0) });
      for (let p = 0; p < 2; p++) B.pts.add.push({ x, y: 0.3 * s, z, kind: 9, ph: rnd(), size: 0.09, prm: 0.3 + rnd() * 0.2, col: lin(0x624249, 2.6) });
      RS.vents++;
    }
    // inside the rooms, against a wall (never in a corridor, never hiding floor, leaving a real gap or none): glowing fire-gem
    // clusters and little steam vents; they block like the cave's crystals
    const roomSpot = (x, z, r, h) => !inArena(x, z, -1.5) && linkDist(L, x, z) >= 2.5 && gapOKL(L, x, z, r) && hiddenBehind(L, x, z, r, h) === 0 &&
      !L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + r + 1.1) && !L.spawns.some(q => hyp(q.x - x, q.z - z) < 1.6) &&
      !L.chests.some(q => hyp(q.x - x, q.z - z) < 2.5) && !L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 3) && !(L.exit && hyp(L.exit.x - x, L.exit.z - z) < 4) &&
      !L.path.some(p => hyp(p.x - x, p.z - z) < 2.8);
    for (let n = 0, nIn = 0, nV = 0; n < W * H / 12 && (nIn < 9 || nV < 5); n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || !grid[c] || dW[c] > 1.3 || dW[c] < 0.85) continue;
      const vent = nV < 5 && rnd() < 0.35;
      if (vent ? vents.some(q => hyp(q[0] - x, q[1] - z) < 6) : (nIn >= 9 || gems.some(q => hyp(q[0] - x, q[1] - z) < 4.5))) continue;
      const s = vent ? 0.75 + rnd() * 0.3 : 0.8 + rnd() * 0.6, r = vent ? 0.55 * s : 0.3 * s + 0.1;
      if (!roomSpot(x, z, r, vent ? 0.4 * s : 1.0 * s)) continue;
      if (vent) {
        vents.push([x, z]); nV++;
        const D = ventData(), m = mat4(x, 0, z, rnd() * TAU, s);
        propSolid(L, x, z, r, 'vent', [dec(B, 'rock', D.rock, m, tint()), dec(B, 'glow', D.glow, m, lin(0xffffff, 0.9))]);
        glowAt(B, x, z, 1.6 * s, 0x5d3f46, 0.35);
        for (let p = 0; p < 6; p++) B.pts.norm.push({ x, y: 0.32 * s, z, kind: 7, ph: p / 6 + rnd() * 0.05, size: 0.6, prm: 0.2 + rnd() * 0.04, col: lin(0x656f7d, 1.0) });
        RS.vents++;
      } else {
        gems.push([x, z]); nIn++;
        const v = Math.floor(rnd() * 4), col = new THREE.Color([0x624249, 0x604148, 0x6b484f, 0x64434b][v]), m = mat4(x, -0.04, z, rnd() * TAU, s);
        propSolid(L, x, z, r, 'gem', [dec(B, 'glow', gemGeo(v, true), m, lin(0xffffff, 0.55)), dec(B, 'rock', rockGeo(v % 3), mat4(x, 0, z, rnd() * TAU, 0.34 * s, 0.18 * s, 0.3 * s), lin(0x3c414a))]);
        B.lights.push({ x, y: 0.9, z: z + 0.25, col, int: 3.2, dist: 6, fl: 0, ph: rnd() * 10 });
        glowAt(B, x, z + 0.3, 2.3 + s, col, 0.5);
        for (let m2 = 0; m2 < 3; m2++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.7, y: 0.3 + rnd() * 0.7, z: z + (rnd() - 0.5) * 0.7, kind: 2, ph: rnd(), size: 0.15, prm: 0.3 + rnd() * 0.3, col: col.clone().multiplyScalar(2) });
        RS.gems++;
      }
    }
    // fire flowers: small patches along the floor's edges (off the path) and on the basalt ground next to it
    const nPatch = Math.round(W * H / 90);
    for (let n = 0; n < nPatch; n++) {
      const x = 1 + rnd() * (W - 2), z = 1 + rnd() * (H - 2), c = cellOf(x, z);
      if (c < 0) continue;
      const onF = grid[c] === 1;
      if (onF ? (dW[c] > 2.6 || maskAt(x, z, 0) > 0.3 || maskAt(x, z, 2) > 0.3 || busy(x, z, 0.6) || inArena(x, z, 1.5)) : (dF[c] > 1.6 || lavaAt(x, z) > 0.2 || B.noDec[c])) continue;
      const cnt = 3 + Math.floor(rnd() * 4), v0 = Math.floor(rnd() * 3);
      for (let m = 0; m < cnt; m++) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.8, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r, cc = cellOf(px, pz);
        if (cc < 0 || B.noDec[cc] || lavaAt(px, pz) > 0.1) continue;
        const D = fireFlowerData(rnd() < 0.7 ? v0 : Math.floor(rnd() * 3)), mm = mat4(px, 0, pz, rnd() * TAU, 1.1 + rnd() * 0.5);
        dec(B, 'decor', D.decor, mm, null); dec(B, 'glow', D.glow, mm, lin(0xffffff, 0.55));
        RS.flowers++;
      }
    }
    // dark pebbles along the walls
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const c = j * W + i;
      if (!grid[c] || dW[c] > 2 || rnd() > 0.035) continue;
      dec(B, 'decor', pebbleGeo(1 + Math.floor(rnd() * 2)), mat4(i + rnd(), 0, j + rnd(), rnd() * TAU, 1), lin(0x474d58));
    }
    // warm light from the lava along the shores (the 4 pooled torch lights pick the nearest), embers rising, bubbles glinting
    const lit = [];
    for (const [i, j] of shuffle((() => { const o = []; for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) if (grid[j * W + i] && dW[j * W + i] <= 1.6) o.push([i, j]); return o; })(), rnd)) {
      const x = i + 0.5, z = j + 0.5;
      if (lit.some(q => hyp(q[0] - x, q[1] - z) < 6.5)) continue;
      let best = null;
      for (let a = 0; a < 8 && !best; a++) { const dx = Math.cos(a * TAU / 8), dz = Math.sin(a * TAU / 8); if (lavaAt(x + dx * 1.8, z + dz * 1.8) > 0.6) best = [x + dx * 1.8, z + dz * 1.8]; }
      if (!best) continue;
      lit.push([x, z]);
      B.lights.push({ x: best[0], y: 0.55, z: best[1], col: new THREE.Color(0x583c43), int: 3.4, dist: 7.5, fl: 0.14, ph: rnd() * 10 });
      RS.lights++;
    }
    for (let n = 0, tries = 0; n < 190 && tries < 6000; tries++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] > 6 || lavaAt(x, z) < 0.7) continue;
      B.pts.add.push({ x, y: 0.05, z, kind: 9, ph: rnd(), size: 0.07 + rnd() * 0.06, prm: 0.14 + rnd() * 0.16, col: lin(pick([0x624249, 0x6d4950, 0x583c43]), 2.6) });
      if (n % 3 === 0) B.pts.add.push({ x: x + rnd() - 0.5, y: 0.04, z: z + rnd() - 0.5, kind: 2, ph: rnd(), size: 0.14, prm: 0.25 + rnd() * 0.25, col: lin(0x6f4a51, 1.8) });
      n++; RS.embers++;
    }
    // paved bridges: low parapet stones along both edges, little lamp posts at the ends
    for (const b of V.bridges) {
      for (const sd of [1, -1]) {
        const P = b.pts;
        for (let i = 0; i < P.length; i++) {
          const q = P[i], e = sd > 0 ? q.e1 : q.e2, nx = q.nx * sd, nz = q.nz * sd, x = q.x + nx * (e + 0.24), z = q.z + nz * (e + 0.24), ry = Math.atan2(q.nx, q.nz);
          const end = i === 0 || i === P.length - 1;
          if (end) {
            dec(B, 'stone', G.rbox(), mat4(x, 0.3, z, ry, 0.42, 0.6, 0.42), lin(0x575f6c));
            dec(B, 'glow', G.sphere(12, 8), mat4(x, 0.72, z, 0, 0.13), lin(0x68454d, 1.1));
            glowAt(B, x, z, 1.4, 0x64434a, 0.3);
          } else dec(B, 'stone', G.rbox(), mat4(x, 0.13, z, ry, 0.62, 0.28, 0.38), lin(pick([0x545c67, 0x505863, 0x575f6c])));
        }
      }
      for (const q of b.pts) { const c = cellOf(q.x, q.z); if (c >= 0) B.noDec[c] = 1; }
    }
    // the boss arena: an island in a lava moat, basalt cliffs to the north with little lavafalls, glowing islets in the moat
    if (ar) {
      B.falls = [];
      const offs = [-0.95, -0.4, 0.4, 0.95];
      offs.splice(Math.floor(rnd() * 4), 1);
      for (const o of offs) {
        const a = -Math.PI / 2 + o, dx = Math.cos(a), dz = Math.sin(a);
        let r = ar.r * 0.8;
        while (r < ar.r + 12 && (V.dA ? V.dA[cellOf(ar.x + dx * r, ar.z + dz * r)] < 4.7 : r < ar.r + 4.7)) r += 0.25;
        const x = ar.x + dx * r, z = ar.z + dz * r;
        if (lavaAt(x - dx * 0.6, z - dz * 0.6) < 0.5) continue;
        let h = 2.6 + rnd() * 0.8;
        while (h > 1.4 && hides(L, x, z, 0.7, 0, h + 0.5, 0.1)) h -= 0.3;
        if (h <= 1.4) continue;
        const yaw = Math.atan2(-dx, -dz);   // local +z faces the arena
        B.falls.push({ x, z, yaw, h, w: 1.5 + rnd() * 0.5, ph: rnd() * 5 });
        // the cliff behind it: a big basalt column cluster + boulders at its sides
        const bx = x + dx * 2.0, bz = z + dz * 2.0;
        inst(B, 'basaltC', mat4(bx, 0, bz, rnd() * TAU, 1.35, h + 0.5, 1.35), tintC());
        for (const sd of [-1, 1]) { const px = bx - dz * sd * 1.6 - dx * 0.3, pz = bz + dx * sd * 1.6 - dz * 0.3; if (!hides(L, px, pz, 1.1, 0, (h + 0.2) * 0.9, 0.15)) inst(B, 'basaltC', mat4(px, 0, pz, rnd() * TAU, 1.1, (h + 0.2) * (0.7 + rnd() * 0.25), 1.1), tintC()); }
        // the splash: a bubbling glowing mound, steam and embers, a warm light
        dec(B, 'glow', R.geo.splash || (R.geo.splash = lumpy(1, 0.25, 3700, { flat: 0 })), mat4(x + dx * 0.05, -0.1, z + dz * 0.05, rnd() * TAU, 0.6, 0.26, 0.5), lin(0x573b42, 0.5));
        for (let p = 0; p < 5; p++) B.pts.norm.push({ x: x + (rnd() - 0.5) * 0.6, y: 0.2, z: z + (rnd() - 0.5) * 0.4, kind: 7, ph: p / 5 + rnd() * 0.05, size: 0.75, prm: 0.22, col: lin(0x636d7b, 1.0) });
        for (let p = 0; p < 7; p++) B.pts.add.push({ x: x + (rnd() - 0.5) * 0.8, y: 0.1, z: z + (rnd() - 0.5) * 0.5, kind: 9, ph: rnd(), size: 0.1, prm: 0.35 + rnd() * 0.3, col: lin(0x68454d, 2.8) });
        B.lights.push({ x: x - dx * 0.6, y: 1.2, z: z - dz * 0.6, col: new THREE.Color(0x5d3f46), int: 5, dist: 9, fl: 0.2, ph: rnd() * 10 });
        glowAt(B, x - dx * 1.2, z - dz * 1.2, 3.2, 0x5d3f46, 0.45);
        RS.falls++;
      }
      // on the island: a ring of fire-flower clumps around the fight (decor only), little glowing gem clusters along its lava shore
      RS.ring = 0;
      for (let a = rnd() * 0.4; a < TAU; a += 0.27 + rnd() * 0.14) {
        const r = ar.r * 0.74 + (rnd() - 0.5) * 0.9, x = ar.x + Math.cos(a) * r, z = ar.z + Math.sin(a) * r, c = cellOf(x, z);
        if (c < 0 || !grid[c] || dW[c] < 1.6 || linkDist(L, x, z) < 2.6 || busy(x, z, 0.6) || maskAt(x, z, 0) > 0.3 || maskAt(x, z, 2) > 0.3) continue;
        const n = 4 + Math.floor(rnd() * 3), v0 = Math.floor(rnd() * 3);
        for (let m = 0; m < n; m++) {
          const px = x + (rnd() - 0.5) * 1.1, pz = z + (rnd() - 0.5) * 1.1;
          const D = fireFlowerData(rnd() < 0.75 ? v0 : Math.floor(rnd() * 3)), mm = mat4(px, 0, pz, rnd() * TAU, 1.3 + rnd() * 0.55);
          dec(B, 'decor', D.decor, mm, null); dec(B, 'glow', D.glow, mm, lin(0xffffff, 0.55));
          RS.flowers++;
        }
        RS.ring++;
      }
      for (let a = rnd() * 0.5; a < TAU; a += 0.42 + rnd() * 0.3) {
        let r = ar.r * 0.8;
        const dx = Math.cos(a), dz = Math.sin(a);
        while (r < ar.r + 4 && isFloor(L, ar.x + dx * r, ar.z + dz * r)) r += 0.2;
        const x = ar.x + dx * (r + 0.2), z = ar.z + dz * (r + 0.2);   // just past the walkable edge, on the moat's shore (Feza can't walk into it)
        if (isFloor(L, x, z) || r >= ar.r + 4 || nearLava(x, z, 1.3) < 0.5 || linkDist(L, x, z) < 3 || busy(x, z, 0.4) || gems.some(q => hyp(q[0] - x, q[1] - z) < 2.2)) continue;
        const s = Math.min(0.55 + rnd() * 0.3, (capAt(gapAt(x, z)) + 0.2) / 1.05);
        if (s < 0.35) continue;
        gems.push([x, z]);
        const v = Math.floor(rnd() * 4), col = new THREE.Color([0x624249, 0x604148, 0x6b484f, 0x64434b][v]);
        dec(B, 'glow', gemGeo(v, true), mat4(x, -0.03, z, rnd() * TAU, s), lin(0xffffff, 0.55));   // (no rock base: fewer draw calls)
        glowAt(B, x, z, 1.5, col, 0.35);
        RS.gems++; RS.ring++;
      }
      // glowing islets in the moat (low; the camera side too)
      for (let k = 0, made = 0; k < 40 && made < 5; k++) {
        const a = rnd() * TAU, dx = Math.cos(a), dz = Math.sin(a);
        let r = ar.r * 0.8;
        while (r < ar.r + 10 && isFloor(L, ar.x + dx * r, ar.z + dz * r)) r += 0.25;
        r += 1.9 + rnd() * 1.2;
        const x = ar.x + dx * r, z = ar.z + dz * r;
        if (lavaAt(x, z) < 0.8 || linkDist(L, x, z) < 3.5 || gems.some(q => hyp(q[0] - x, q[1] - z) < 3.5)) continue;
        const s = 0.6 + rnd() * 0.3;
        if (hides(L, x, z, 0.5 * s, 0, 0.75 * s, 0.05)) continue;
        gems.push([x, z]); made++;
        rock(x, z, s, s * 0.45, s * 0.9, 0.08, true);
        dec(B, 'glow', gemGeo(rnd() < 0.5 ? 0 : 2, true), mat4(x, 0.08, z, rnd() * TAU, 1.0 * s), lin(0xffffff, 0.6));
        glowAt(B, x, z, 2.0, 0x68454d, 0.3);
      }
    }
    // soft warm motes in the air
    for (let n = 0; n < 50; n++) {
      const x = rnd() * W, z = rnd() * H;
      if (!grid[Math.floor(z) * W + Math.floor(x)]) continue;
      B.pts.add.push({ x, y: 0.6 + rnd() * 2.2, z, kind: 1, ph: rnd(), size: 0.07, prm: 0.5 + rnd() * 0.5, col: lin(0x774f57, 1.1) });
    }
  }
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  //  Çürüme Vadisi (theme 'dairy', Feza's own zone). Milk and kefir rivers (floor shader), glossy yogurt hills in fruit pastels,
  //  giant cheese wheels and wedges, butter, stacked yogurt pots, copper milk jugs (güğüm), butter churns (yayık), milk and kefir
  //  bottles, honey pots, giant berries, yogurt bowls, cereal rings bobbing in the milk, white fences with little bells, biscuit
  //  bridges, milk waterfalls, the "Çürüme Vadisi" sign, and the boss arena Çürüme Kuyusu. No insects anywhere near the dairy.
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  const POT_COL = [0x6c4850, 0x505863, 0x525a65, 0x575f6b, 0x6d4850, 0x704a52];   // yogurt-pot labels / foil lids
  const SWIRL_TINT = [0xffffff, 0x67717f, 0x606a77, 0x616b78, 0x626c79];
  const HILL_TINT = [0x67717f, 0x67717f, 0x656f7d, 0x7f545c, 0x626b79, 0x606977, 0x616a78, 0x5f6976, 0x606976, 0x636c7a];   // plain, strawberry, blueberry, vanilla, apricot, mint, sky (no khaki greens)
  const CEREAL_COL = [0x6a474e, 0x714b53, 0x4b525d, 0x64434a, 0x65444b, 0x505763];
  const v2s = pts => pts.map(p => new THREE.Vector2(p[0], p[1]));
  const smoothProfile = (pts, n) => new THREE.SplineCurve(v2s(pts)).getPoints(n);
  const profR = (prof, y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const a = prof[i - 1], b = prof[i]; return a[0] + (b[0] - a[0]) * (y - a[1]) / Math.max(1e-6, b[1] - a[1]); } return prof[prof.length - 1][0]; };
  function kits(...names) { const o = {}; for (const n of names) o[n] = new Kit(); return o; }
  function buildKits(o) { const D = {}; for (const k in o) if (o[k].parts.length) D[k] = keep(o[k].build()); return D; }
  function putD(B, D, m, tint) { const vis = []; for (const k in D) vis.push(dec(B, k, D[k], m, tint || null)); return vis; }
  // Add a built (colour-baked) geometry to a Kit, keeping its vertex colours (mergeParts calls the colour function once per vertex, in order)
  function subAdd(k, geo, pos, rot, scl) {
    const C = geo.attributes.color, n = C.count, cs = new Array(n);
    for (let i = 0; i < n; i++) cs[i] = new THREE.Color(C.getX(i), C.getY(i), C.getZ(i));
    let i = 0;
    return k.add(geo, () => cs[(i++) % n], pos, rot, scl);
  }

  // Yogurt hills (radius 1 at scale 1): 0 a soft round mound · 1 a taller blob (both gently lumpy, the base sagging out a little) ·
  // 2 a soft-serve swirl (a fat tube coiling up round a core to a curled tip) · 3 a small low-poly mound (fillers along the edges)
  const DOLLOP_PROF = [
    [[0.001, 0], [0.95, 0], [1.02, 0.06], [1.0, 0.18], [0.9, 0.4], [0.72, 0.6], [0.48, 0.76], [0.24, 0.855], [0.1, 0.884], [0.001, 0.89]],   // (flat-tangent tops)
    [[0.001, 0], [0.96, 0], [1.03, 0.07], [0.98, 0.2], [0.86, 0.42], [0.66, 0.64], [0.4, 0.82], [0.18, 0.912], [0.07, 0.936], [0.001, 0.94]],
    null,
    [[0.001, 0], [0.95, 0], [1.0, 0.1], [0.85, 0.4], [0.5, 0.7], [0.001, 0.78]],
  ];
  const DOLLOP_TOP = [0.91, 0.96, 1.05, 0.8];
  function dollopWarp(v) {   // the gentle lumps of a mound
    const rnd = mulberry32(4700 + v * 7), ph = rnd() * TAU, ph2 = rnd() * TAU;
    return (x, y, z) => {   // (the height wobble fades out toward the axis: the lathe's apex vertices stay together — no pinched, dark tip)
      const a = Math.atan2(z, x), k = 1 + 0.04 * Math.sin(3 * a + ph) + 0.025 * Math.sin(5 * a + ph2 + y * 3), rr = Math.min(1, Math.hypot(x, z) / 0.45);
      return [x * k, y * (1 + 0.03 * Math.sin(2 * a + ph) * rr * rr), z * k];
    };
  }
  function dollopGeo(v) {
    const key = 'dollop' + v;
    if (R.geo[key]) return R.geo[key];
    let g;
    if (v === 2) {
      const pts = [], turns = 2.7, TS = 64, RS2 = 8;
      for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * turns * TAU, r = 0.7 * (1 - t) + 0.03 * (1 - t); pts.push(new THREE.Vector3(Math.cos(a) * r, 0.18 + t * 0.8, Math.sin(a) * r)); }
      // (no curled tip: the coil closes on the axis, where hill() sets a cherry — soft-serve, never a pointy coil)
      const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.TubeGeometry(curve, TS, 1, RS2, false), P = tube.attributes.position, c = new THREE.Vector3();
      for (let i = 0; i <= TS; i++) {
        const t = i / TS, rr = 0.3 * (1 - t * 0.6) * (1 - smooth01((t - 0.9) / 0.1) * 0.9);
        curve.getPointAt(t, c);
        for (let j = 0; j <= RS2; j++) { const k = i * (RS2 + 1) + j; P.setXYZ(k, c.x + (P.getX(k) - c.x) * rr, c.y + (P.getY(k) - c.y) * rr, c.z + (P.getZ(k) - c.z) * rr); }
      }
      tube.computeVertexNormals();
      const core = new THREE.LatheGeometry(smoothProfile([[0.001, 0], [0.8, 0], [0.84, 0.1], [0.7, 0.32], [0.4, 0.56], [0.001, 0.66]], 6), 14);
      const k = new Kit(); k.add(tube, 0xffffff); k.add(core, 0xffffff);
      g = k.build();
    } else {
      const warp = dollopWarp(v);
      g = new THREE.LatheGeometry(smoothProfile(DOLLOP_PROF[v], v === 3 ? 6 : 11), v === 3 ? 12 : 18);
      const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const q = warp(P.getX(i), P.getY(i), P.getZ(i)); P.setXYZ(i, q[0], q[1], q[2]); }
      weldNormals(g);
    }
    markUV(g, 0);
    return (R.geo[key] = keep(g));
  }
  for (let v = 0; v < 4; v++) KIND['yog' + v] = { mat: 'yog', shadow: v === 3 ? false : 'near', proxy: v === 3 ? null : { c: [0.42, 0.85, 0.5] }, recv: true,
    geo: () => { const k = new Kit(); k.add(dollopGeo(v), 0xffffff); return k.build(); } };

  // Swiss cheese: 0 a wheel · 1 a wheel with a wedge cut out (the wedge lies beside it) · 2 a big wedge · 3 two small wheels stacked.
  // Extruded sectors with bevelled edges; the rind (outer wall) is deeper gold; round "eyes" on the top and the cut faces.
  function cheeseData(v) {
    const key = 'cheese' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('food'), k = K.food, rnd = mulberry32(4100 + v * 13);
    const body = new THREE.Color(0x6e4951), rind = new THREE.Color(0x5f4047), deep = new THREE.Color(0x493339), lipC = new THREE.Color(0x69464e);
    const _a = new THREE.Vector3(), _n = new THREE.Vector3(), zf = new THREE.Vector3(0, 0, 1);
    const holeG = R.geo.hole || (R.geo.hole = keep(new THREE.CircleGeometry(1, 12)));
    const hole = (c, n, r) => {   // an "eye": dark golden in the middle, lighter toward its lip (reads as a crater from above)
      const q = new THREE.Quaternion().setFromUnitVectors(zf, n), cx = c.x + n.x * 0.004, cy = c.y + n.y * 0.004, cz = c.z + n.z * 0.004;
      k.add(holeG, (x, y, z) => deep.clone().lerp(lipC, Math.pow(clamp(Math.hypot(x - cx, y - cy, z - cz) / r, 0, 1), 1.6)), [cx, cy, cz], q, r);
    };
    const piece = (a0, a1, rad, h, M) => {
      const full = a1 - a0 >= TAU - 1e-3, sh = new THREE.Shape(), bt = 0.035, bs = 0.03;
      if (full) sh.absarc(0, 0, rad, 0, TAU, false);
      else {
        sh.moveTo(0, 0);
        for (const f of [0.35, 0.7, 0.96]) sh.lineTo(Math.cos(a0) * rad * f, Math.sin(a0) * rad * f);
        sh.absarc(0, 0, rad, a0, a1, false);
        for (const f of [0.96, 0.7, 0.35]) sh.lineTo(Math.cos(a1) * rad * f, Math.sin(a1) * rad * f);
        sh.lineTo(0, 0);
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 2, curveSegments: Math.max(4, Math.round((a1 - a0) / TAU * 32)) });
      g.rotateX(-Math.PI / 2); g.translate(0, bt, 0); g.applyMatrix4(M);   // shape angle a → world direction (cos a, 0, -sin a)
      const Mi = M.clone().invert(), p = new THREE.Vector3();
      k.add(g, (x, y, z) => { p.set(x, y, z).applyMatrix4(Mi); const r = Math.hypot(p.x, p.z); return r > rad + 0.012 ? rind : body.clone().lerp(rind, smooth01((r - rad * 0.86) / (rad * 0.14)) * 0.3); });
      const pts = [], nTop = Math.round((a1 - a0) / TAU * 10 * rad) + 2;
      for (let t = 0; t < 80 && pts.length < nTop; t++) {   // eyes on the top
        const a = a0 + (a1 - a0) * (0.06 + 0.88 * rnd()), rr = (0.035 + Math.pow(rnd(), 2) * 0.1) * Math.max(0.7, rad), rho = (0.12 + 0.82 * Math.sqrt(rnd())) * (rad - rr - 0.05);
        const x = Math.cos(a) * rho, z = -Math.sin(a) * rho;
        if (!full && (Math.sin(a - a0) * rho < rr + 0.04 || Math.sin(a1 - a) * rho < rr + 0.04)) continue;   // clear of the cut edges
        if (pts.some(q => Math.hypot(q[0] - x, q[1] - z) < q[2] + rr + 0.03)) continue;
        pts.push([x, z, rr]);
        hole(_a.set(x, h, z).applyMatrix4(M), _n.set(0, 1, 0).transformDirection(M), rr);
      }
      if (!full) for (const [ang, sg] of [[a0, 1], [a1, -1]]) {   // …and on the two cut faces
        const nx = sg * Math.sin(ang), nz = sg * Math.cos(ang), fp = [];
        for (let t = 0; t < 40 && fp.length < 3; t++) {
          const rr = 0.03 + rnd() * 0.065, rho = 0.14 + rnd() * (rad - 0.28), y = rr + 0.05 + rnd() * Math.max(0, h - 2 * rr - 0.1);
          if (y > h - rr - 0.04 || fp.some(q => Math.hypot(q[0] - rho, q[1] - y) < q[2] + rr + 0.03)) continue;
          fp.push([rho, y, rr]);
          hole(_a.set(Math.cos(ang) * rho + nx * bs, y, -Math.sin(ang) * rho + nz * bs).applyMatrix4(M), _n.set(nx, 0, nz).transformDirection(M), rr);
        }
      }
    };
    const I = new THREE.Matrix4(), cm = (x, y, z, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    if (v === 0) piece(0, TAU, 0.95, 0.52, I);
    else if (v === 1) { piece(0.8, TAU, 0.95, 0.52, I); piece(0, 0.8, 0.88, 0.5, cm(Math.cos(0.4) * 0.55 + 0.25, 0, -Math.sin(0.4) * 0.55 + 0.1, -0.35)); }
    else if (v === 2) piece(-0.45, 0.45, 1.15, 0.62, cm(-0.62, 0, 0, 0));
    else if (v === 3) { piece(0, TAU, 0.62, 0.36, I); piece(0, TAU, 0.5, 0.32, cm(0.06, 0.36, -0.04, 0.5)); }
    else { piece(0, TAU, 0.8, 0.34, I); piece(0, TAU, 0.56, 0.33, cm(0, 0.34, 0, 0.6)); }   // 4: the checkpoint's pedestal (top at 0.67)
    return (R.geo[key] = buildKits(K));
  }
  // A butter block on a little wooden board, a butter curl on top, a knife stuck in
  function butterData() {
    if (R.geo.butter) return R.geo.butter;
    const K = kits('shiny', 'prop', 'coin');
    K.prop.add(R.geo.bBoard || (R.geo.bBoard = keep(boxUV(1.1, 0.08, 0.72, 0.6))), 0x5c6572, [0, 0.04, 0]);
    K.shiny.add(G.rbox(), (x, y) => new THREE.Color(0x59616e).lerp(new THREE.Color(0x616a77), clamp((y - 0.12) / 0.34, 0, 1)), [0, 0.28, 0], 0, [0.78, 0.4, 0.5]);
    K.shiny.add(G.torus(Math.PI * 1.4, 0.4, 14), 0x5f6876, [-0.12, 0.49, 0.04], [Math.PI / 2, 0, 0.4], [0.09, 0.09, 0.12]);
    K.coin.push([0.16, 0.47, 0.06], [0, 0.5, -0.5]);
    K.coin.add(G.box(), 0x616b78, [0, 0.08, 0], 0, [0.07, 0.24, 0.012]);
    K.coin.add(G.cyl(1, 1, 8), 0x4e5561, [0, 0.28, 0], 0, [0.03, 0.18, 0.03]);
    K.coin.pop();
    return (R.geo.butter = buildKits(K));
  }
  // Yogurt pots (0 one · 1 three in a pyramid · 2 two stacked · 3 six in a pyramid): a tapered cup wrapped in a pastel label with
  // a fruit printed on a white window (front and back), a shiny metallic foil lid with a printed centre and a pull tab. The top
  // pot is open: its foil is peeled back low over the rim (the yogurt creatures' look), creamy yogurt inside, a spoon stuck in it
  // and a strawberry on top — food, never a white bowl with a lid standing up behind it.
  const POT_FRUIT = [0x443036, 0x2e3239, 0x434953, 0x6a474f, 0x463137, 0x5c3f46];   // the fruit printed on each label colour
  // pot body: radius 1 at the top (0.84 at the foot), height 1; extra rings where the label and its stripe start / end (crisp bands)
  const potBodyGeo = () => R.geo.potBody || (R.geo.potBody = keep(new THREE.LatheGeometry(v2s([[0.001, 0], [0.8, 0], [0.835, 0.012], [0.842, 0.04],
    [0.853, 0.12], [0.854, 0.126], [0.888, 0.34], [0.93, 0.6], [0.95, 0.72], [0.951, 0.726], [0.958, 0.77], [0.959, 0.776], [0.97, 0.84], [0.971, 0.846], [0.99, 0.97], [1.0, 1.0]]), 16)));
  function potData(v) {
    const key = 'pots' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('shiny', 'yog', 'coin'), rnd = mulberry32(4200 + v * 17), R0 = 0.3, H0 = 0.46, white = new THREE.Color(0x656f7d), zf = new THREE.Vector3(0, 0, 1);
    const disc = R.geo.hole || (R.geo.hole = keep(new THREE.CircleGeometry(1, 12)));
    const pot = (x, y, z, open) => {
      const li = Math.floor(rnd() * POT_COL.length), lab = new THREE.Color(POT_COL[li]), st = lab.clone().lerp(white, 0.75), lidIn = lab.clone().lerp(new THREE.Color(0xffffff), 0.05);
      const lid = lab.clone().lerp(new THREE.Color(0x636d7b), 0.62), fr = new THREE.Color(POT_FRUIT[li]);   // silvery pastel foil, the print in the label's colour
      // the label: 0.126–0.846 of the height, a pale stripe near its top
      K.shiny.add(potBodyGeo(), (px, py) => { const t = (py - y) / H0; return t > 0.123 && t < 0.843 ? (t > 0.723 && t < 0.773 ? st : lab) : white; }, [x, y, z], 0, [R0, H0, R0]);
      K.shiny.add(G.torus(TAU, 0.09, 16), 0xffffff, [x, y + H0, z], [Math.PI / 2, 0, 0], R0 * 1.02);   // a thin rolled rim
      const a0 = rnd() * TAU;
      for (const a of [a0, a0 + Math.PI]) {   // the printed fruit on a white window, front and back
        const t = 0.44, rr = R0 * (0.888 + (t - 0.34) / 0.26 * 0.042) + 0.004, n = new THREE.Vector3(Math.cos(a), -0.1, Math.sin(a)).normalize(), q = new THREE.Quaternion().setFromUnitVectors(zf, n);
        const cx = x + Math.cos(a) * rr, cy = y + t * H0, cz = z + Math.sin(a) * rr, o = (d) => [cx + n.x * d, cy + n.y * d, cz + n.z * d];
        K.shiny.add(disc, white, o(0), q, [0.105, 0.09, 1]);
        K.shiny.add(disc, fr, o(0.003), q, [0.052, li === 0 ? 0.062 : 0.052, 1]);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);   // a little leaf above the fruit
        K.shiny.add(disc, 0x3a3f47, [cx + n.x * 0.005 + up.x * 0.058, cy + n.y * 0.005 + up.y * 0.058, cz + n.z * 0.005 + up.z * 0.058], q, [0.03, 0.016, 1]);
      }
      if (open) {
        const h = rnd() * TAU, ch = Math.cos(h), sh = Math.sin(h);
        K.yog.add(G.sphere(14, 7), 0x66707f, [x, y + H0 - 0.02, z], 0, [R0 * 0.94, 0.07, R0 * 0.94]);
        // the foil, peeled back from one side: hinged on the rim, lying low outward at ~35°, its pull tab turned up
        K.coin.push([x + ch * R0 * 0.86, y + H0 + 0.03, z + sh * R0 * 0.86], [0, -h, 0]).push(null, [0, 0, 0.42]);
        K.coin.add(G.cyl(1, 1, 16), (px, py, pz) => (hyp(px - (x + ch * (R0 * 0.86 + R0 * 0.62 * 0.91)), pz - (z + sh * (R0 * 0.86 + R0 * 0.62 * 0.91))) < R0 * 0.3 ? lidIn : lid), [R0 * 0.62, 0, 0], 0, [R0 * 0.62, 0.01, R0 * 0.7]);
        K.coin.add(G.box(), lid, [R0 * 1.28, 0.025, 0], [0, 0, 0.55], [0.09, 0.01, 0.08]);
        K.coin.pop().pop();
        // a spoon stuck in the yogurt, leaning out on the far side, and a strawberry sitting on the cream
        const sa = h + Math.PI + 0.6, sx = x + Math.cos(sa) * R0 * 0.35, sz = z + Math.sin(sa) * R0 * 0.35;
        K.coin.push([sx, y + H0 + 0.02, sz], new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(Math.cos(sa) * 0.45, 1, Math.sin(sa) * 0.45).normalize()));
        K.coin.add(G.box(), 0x616b78, [0, 0.13, 0], 0, [0.034, 0.3, 0.012]);
        K.coin.add(G.sphere(10, 6), 0x616b78, [0, 0.29, 0], 0, [0.028, 0.03, 0.014]);
        K.coin.pop();
        const bx = x - Math.cos(sa) * R0 * 0.25, bz = z - Math.sin(sa) * R0 * 0.25, by = y + H0 + 0.07;
        K.shiny.add(G.sphere(12, 8), (px, py) => new THREE.Color(0x39292f).lerp(new THREE.Color(0x4a333a), clamp((py - by + 0.05) / 0.1, 0, 1)), [bx, by, bz], [0.3, 0, 0.2], [0.075, 0.09, 0.075]);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; K.shiny.add(G.octa(), 0x3a3f47, [bx + Math.cos(a) * 0.035, by + 0.085, bz + Math.sin(a) * 0.035], [0, -a, -0.3], [0.045, 0.01, 0.02]); }
      } else {
        // the foil sealed over the rim, printed like the label: a coloured ring, a white circle and the fruit in the middle
        K.coin.add(G.cyl(1, 1, 16), lid, [x, y + H0 + 0.03, z], 0, [R0 * 1.1, 0.014, R0 * 1.1]);
        const up = [-Math.PI / 2, 0, 0], ty = y + H0 + 0.038;
        K.shiny.add(disc, lidIn, [x, ty, z], up, R0 * 0.78);
        K.shiny.add(disc, white, [x, ty + 0.002, z], up, R0 * 0.56);
        K.shiny.add(disc, fr, [x, ty + 0.004, z], up, [R0 * 0.3, R0 * (li === 0 ? 0.36 : 0.3), 1]);
        K.shiny.add(disc, 0x3a3f47, [x, ty + 0.005, z - R0 * 0.34], up, [R0 * 0.16, R0 * 0.08, 1]);
        const ta = rnd() * TAU;
        K.coin.add(G.box(), lid, [x + Math.cos(ta) * R0 * 1.16, y + H0 + 0.028, z + Math.sin(ta) * R0 * 1.16], [0, -ta, -0.35], [0.12, 0.012, 0.1]);   // the pull tab
      }
    };
    const up = H0 + 0.03;
    if (v === 0) pot(0, 0, 0, rnd() < 0.5);
    else if (v === 1) { pot(-0.31, 0, 0); pot(0.31, 0, 0.02); pot(0, up, 0.01, true); }
    else if (v === 2) { pot(0, 0, 0); pot(0.02, up, 0, true); }
    else { for (let i = 0; i < 3; i++) pot((i - 1) * 0.62, 0, 0); for (let i = 0; i < 2; i++) pot((i - 0.5) * 0.62, up, 0.02); pot(0, 2 * up, 0.03, true); }
    return (R.geo[key] = buildKits(K));
  }
  // Güğüm: a Turkish copper milk jug (round belly, narrow neck, flared mouth, domed lid, a handle from the neck to the shoulder)
  const GUGUM_PROF = [[0.001, 0], [0.2, 0], [0.24, 0.02], [0.23, 0.05], [0.33, 0.15], [0.4, 0.3], [0.41, 0.42], [0.36, 0.56], [0.24, 0.67], [0.15, 0.75], [0.13, 0.83], [0.15, 0.92], [0.2, 0.985]];
  const gugumCol = () => { const cu = new THREE.Color(0x5b3e45), cu2 = new THREE.Color(0x6f4a52), br = new THREE.Color(0x744d55);   // polished copper, brass bands
    return (x, y) => (Math.abs(y - 0.15) < 0.024 || Math.abs(y - 0.57) < 0.024 || Math.abs(y - 0.92) < 0.018 ? br : cu.clone().lerp(cu2, smooth01((y - 0.22) / 0.14) * (1 - smooth01((y - 0.46) / 0.14)) * 0.65)); };
  function gugumData() {
    if (R.geo.gugum) return R.geo.gugum;
    const K = kits('copper'), k = K.copper, cu = new THREE.Color(0x5b3e45), br = new THREE.Color(0x744d55);
    k.add(new THREE.LatheGeometry(smoothProfile([...GUGUM_PROF, [0.001, 0.99]], 24), 20), gugumCol());
    k.add(G.hemi(16), cu, [0, 0.98, 0], 0, [0.19, 0.08, 0.19]);
    k.add(G.sphere(10, 8), br, [0, 1.07, 0], 0, 0.035);
    k.add(G.torus(Math.PI, 0.12, 14), cu, [0.15, 0.66, 0], [0, 0, -Math.PI / 2], [0.27, 0.27, 0.27]);
    return (R.geo.gugum = buildKits(K));
  }
  // A giant güğüm pouring a waterfall: no lid, the mouth open (a copper inner lip) and brim-full of milk (the milk in the glossy
  // non-metal chunk: on the copper it would read as chrome). Local like gugumData: base at 0, mouth centre (0, 0.975, 0), radius 0.2
  function gugumPourData() {
    if (R.geo.gugumP) return R.geo.gugumP;
    const K = kits('copper', 'shiny'), cu = new THREE.Color(0x5b3e45);
    K.copper.add(new THREE.LatheGeometry(smoothProfile([...GUGUM_PROF, [0.17, 0.965], [0.001, 0.93]], 26), 20), gugumCol());
    K.copper.add(G.torus(Math.PI, 0.12, 14), cu, [0.15, 0.66, 0], [0, 0, -Math.PI / 2], [0.27, 0.27, 0.27]);
    K.shiny.add(G.sphere(14, 6), (x, y, z) => new THREE.Color(0x66707f).lerp(new THREE.Color(0x636d7a), smooth01(Math.hypot(x, z) / 0.18)), [0, 0.962, 0], 0, [0.178, 0.018, 0.178]);
    return (R.geo.gugumP = buildKits(K));
  }
  // Yayık: a tall wooden butter churn with iron hoops, a lid and the dasher's stick with its cross handle
  function yayikData() {
    if (R.geo.yayik) return R.geo.yayik;
    const K = kits('prop'), k = K.prop, iron = 0x343941;
    const lg = new THREE.LatheGeometry(v2s([[0.001, 0], [0.27, 0], [0.3, 0.06], [0.32, 0.5], [0.29, 0.94], [0.27, 1.0], [0.001, 1.0]]), 16), uv = lg.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), w = uv.getY(i); uv.setXY(i, w * 1.1, u * 2.4); }
    k.add(lg, 0x5c6572);
    const hoop = R.geo.hoop || (R.geo.hoop = keep(markUV(new THREE.TorusGeometry(1, 0.06, 5, 16), 10)));
    for (const [y, r] of [[0.1, 0.305], [0.5, 0.325], [0.88, 0.3]]) k.add(hoop, iron, [0, y, 0], [Math.PI / 2, 0, 0], [r, r, r]);
    k.add(G.cyl(1, 1, 16), 0x555d69, [0, 1.02, 0], 0, [0.29, 0.05, 0.29]);
    k.add(G.cyl(1, 1, 8), 0x6b474f, [0, 1.33, 0], 0, [0.035, 0.62, 0.035]);
    k.add(G.cyl(1, 1, 8), 0x6b474f, [0, 1.62, 0], [0, 0, Math.PI / 2], [0.03, 0.34, 0.03]);
    for (const sx of [-0.17, 0.17]) k.add(G.sphere(8, 6), 0x6b474f, [sx, 1.62, 0], 0, 0.042);
    return (R.geo.yayik = buildKits(K));
  }
  // Milk and kefir bottles: milk white or kefir cream inside, clear glass neck, a label, a shiny foil cap
  const BOTTLE = [[0x66707e, 0x444a54, 0x545b67], [0x66707e, 0x52383f, 0x704b53], [0x636c7a, 0x454b55, 0x565e6a], [0x636c7a, 0x66444c, 0x7a5159]];   // [fill, cap, label]
  const bottleBody = () => R.geo.bottle || (R.geo.bottle = keep(new THREE.LatheGeometry(smoothProfile([[0.001, 0], [0.15, 0], [0.17, 0.02], [0.175, 0.3], [0.17, 0.5], [0.15, 0.6], [0.1, 0.7], [0.08, 0.78], [0.085, 0.84], [0.001, 0.845]], 16), 16)));
  // A giant kefir bottle pouring a waterfall: uncapped, its mouth brim-full of kefir (base at 0, mouth centre (0, 0.845, 0), radius 0.085)
  function bottlePourData(v) {
    const key = 'bottleP' + v;
    if (R.geo[key]) return R.geo[key];
    const b = BOTTLE[v % 4], F = new THREE.Color(b[0]), Gl = new THREE.Color(0x5d6673), Lb = new THREE.Color(b[2]), Wt = new THREE.Color(0xffffff), Mk = new THREE.Color(0x66707f);
    const K = kits('shiny');
    K.shiny.add(bottleBody(), (px, py, pz) => (py > 0.835 && Math.hypot(px, pz) < 0.07 ? Mk : py > 0.66 ? Gl : py > 0.16 && py < 0.42 ? (py > 0.26 && py < 0.31 ? Wt : Lb) : F));
    K.shiny.add(G.torus(TAU, 0.2, 16), b[1], [0, 0.835, 0], [Math.PI / 2, 0, 0], [0.09, 0.09, 0.06]);   // a coloured lip ring where the cap was
    return (R.geo[key] = buildKits(K));
  }
  function bottleParts(K, x, y, z, v, s = 1, rot = null) {
    const b = BOTTLE[v % 4], F = new THREE.Color(b[0]), Gl = new THREE.Color(0x5d6673), Lb = new THREE.Color(b[2]), Wt = new THREE.Color(0xffffff);
    const body = bottleBody();
    if (rot) {   // lying / tilted: the fill line follows the bottle, so build it upright and place it
      const T = kits('shiny', 'coin'); bottleParts(T, 0, 0, 0, v, 1); const D = buildKits(T);
      subAdd(K.shiny, D.shiny, [x, y, z], rot, s); subAdd(K.coin, D.coin, [x, y, z], rot, s);
      return;
    }
    K.shiny.add(body, (px, py) => { const t = (py - y) / s; return t > 0.66 ? Gl : t > 0.16 && t < 0.42 ? (t > 0.26 && t < 0.31 ? Wt : Lb) : F; }, [x, y, z], 0, s);
    K.coin.add(G.cyl(1, 1, 14), b[1], [x, y + 0.855 * s, z], 0, [0.092 * s, 0.035 * s, 0.092 * s]);
  }
  function bottleData(v) {   // 0 two milk + one kefir · 1 a wooden crate of six · 2 one big kefir bottle and one lying beside it
    const key = 'bottles' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('shiny', 'coin', 'prop'), rnd = mulberry32(4300 + v);
    if (v === 0) { bottleParts(K, -0.22, 0, 0, 0, 1.25); bottleParts(K, 0.2, 0, 0.1, 1, 1.15); bottleParts(K, 0.02, 0, -0.26, 2 + Math.floor(rnd() * 2), 1.3); }
    else if (v === 1) {
      const wood = 0x5b6370, bx = R.geo.cBox || (R.geo.cBox = keep(boxUV(1, 1, 1, 0.5)));
      K.prop.add(bx, wood, [0, 0.04, 0], 0, [1.1, 0.08, 0.76]);
      for (const sz of [-1, 1]) K.prop.add(bx, wood, [0, 0.2, sz * 0.36], 0, [1.1, 0.32, 0.05]);
      for (const sx of [-1, 1]) K.prop.add(bx, wood, [sx * 0.53, 0.2, 0], 0, [0.05, 0.32, 0.76]);
      K.prop.add(bx, 0x6e4951, [0, 0.4, 0], 0, [1.08, 0.04, 0.05]);   // the handle bar
      for (let i = 0; i < 6; i++) bottleParts(K, ((i % 3) - 1) * 0.33, 0.08, (i < 3 ? -0.17 : 0.17), i % 4, 1.0);
    } else {
      bottleParts(K, 0, 0, 0, 2 + Math.floor(rnd() * 2), 1.7);
      bottleParts(K, 0.42, 0.17, 0.3, Math.floor(rnd() * 2), 1.1, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, -Math.PI / 2)));
    }
    return (R.geo[key] = buildKits(K));
  }
  // A glazed honey pot brimming over, drips running down its shoulder, a wooden dipper leaning in
  function honeyData() {
    if (R.geo.honey) return R.geo.honey;
    const K = kits('shiny', 'prop'), s = K.shiny, pot = new THREE.Color(0x583c43), pot2 = new THREE.Color(0x6e4951), hon = new THREE.Color(0x5f4047), hon2 = new THREE.Color(0x714b53);
    const prof = [[0.001, 0], [0.24, 0], [0.33, 0.08], [0.39, 0.25], [0.37, 0.42], [0.29, 0.52], [0.27, 0.56], [0.3, 0.6], [0.28, 0.63], [0.24, 0.6], [0.001, 0.58]];
    s.add(new THREE.LatheGeometry(v2s(prof), 20), (x, y) => (y > 0.25 && y < 0.31 ? pot2 : pot));
    s.add(G.sphere(18, 10), (x, y) => hon.clone().lerp(hon2, clamp((y - 0.6) / 0.08, 0, 1)), [0, 0.6, 0], 0, [0.29, 0.075, 0.29]);
    const rnd = mulberry32(4400);
    for (let i = 0; i < 6; i++) {   // drips down the shoulder, each ending in a round drop
      const a = i / 6 * TAU + rnd() * 0.5, L = 0.1 + rnd() * 0.2, ca = Math.cos(a), sa = Math.sin(a);
      for (let t = 0; t <= 4; t++) { const y = 0.61 - L * t / 4, r = profR(prof.slice(0, 8), Math.max(0.25, y)) + 0.012; s.add(G.sphere(8, 6), hon, [ca * r, y, sa * r], 0, [0.032, 0.05, 0.032]); }
      const y = 0.61 - L, r = profR(prof.slice(0, 8), Math.max(0.25, y)) + 0.025;
      s.add(G.sphere(10, 8), hon2, [ca * r, y - 0.02, sa * r], 0, 0.045);
    }
    K.prop.seg([0.06, 0.55, 0.02], [0.3, 1.02, 0.12], 0.028, 0x6a474f, 0.024, 8);   // the dipper
    K.prop.add(G.sphere(8, 6), 0x6a474f, [0.3, 1.03, 0.12], 0, 0.04);
    return (R.geo.honey = buildKits(K));
  }
  // A giant strawberry, standing on its tip (glossy red, golden seeds in staggered rows, a green leafy crown) — local, ≈0.95 m tall
  const SB_PROF = [[0.001, 0], [0.1, 0.05], [0.25, 0.2], [0.37, 0.43], [0.41, 0.62], [0.37, 0.79], [0.23, 0.9], [0.001, 0.93]];
  function strawberryData() {
    if (R.geo.sberry) return R.geo.sberry;
    const K = kits('shiny', 'food'), red = new THREE.Color(0x443036), deep = new THREE.Color(0x39292f), pale = new THREE.Color(0x5d3f46);
    K.shiny.add(new THREE.LatheGeometry(smoothProfile(SB_PROF, 14), 18), (x, y) => deep.clone().lerp(red, clamp(y / 0.4, 0, 1)).lerp(pale, clamp((y - 0.78) / 0.14, 0, 1) * 0.7));
    for (let row = 0; row < 7; row++) {
      const y = 0.1 + row * 0.105, r = profR(SB_PROF, y), n = Math.max(3, Math.round(r * 22));
      for (let i = 0; i < n; i++) { const a = (i + (row % 2) * 0.5) / n * TAU; K.shiny.add(G.octa(), 0x5f6875, [Math.cos(a) * r * 0.985, y, Math.sin(a) * r * 0.985], [0, -a, 0], [0.013, 0.024, 0.013]); }
    }
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; K.food.add(G.octa(), 0x3a3f47, [Math.cos(a) * 0.17, 0.9, Math.sin(a) * 0.17], [0, -a, -0.35], [0.2, 0.026, 0.075]); }
    K.food.add(G.cyl(0.6, 1, 6), 0x383d46, [0, 0.99, 0], 0, [0.025, 0.14, 0.025]);
    return (R.geo.sberry = buildKits(K));
  }
  // Blueberries (0 one big berry · 1 a cluster of three): dusty blue with a little five-pointed crown
  function blueberryData(v) {
    const key = 'bberry' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('food'), b1 = new THREE.Color(0x2e3239), b2 = new THREE.Color(0x454b55), dk = new THREE.Color(0x23252b);
    const berry = (x, y, z, r) => {
      K.food.add(G.sphere(16, 12), (px, py) => b1.clone().lerp(b2, clamp((py - y) / r * 0.5 + 0.35, 0, 1) * 0.6), [x, y, z], 0, [r, r * 0.9, r]);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; K.food.add(G.cone(4), dk, [x + Math.cos(a) * r * 0.15, y + r * 0.86, z + Math.sin(a) * r * 0.15], [0, -a, -1.2], [r * 0.07, r * 0.2, r * 0.07]); }
    };
    if (v === 0) berry(0, 0.33, 0, 0.36);
    else { berry(-0.2, 0.25, 0.05, 0.27); berry(0.22, 0.22, 0.1, 0.24); berry(0.02, 0.2, -0.22, 0.22); }
    return (R.geo[key] = buildKits(K));
  }
  // A glazed bowl of yogurt with strawberry halves, blueberries, a mint leaf and a honey swirl on top, a spoon in it
  function bowlData(v) {
    const key = 'bowl' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('shiny', 'yog', 'coin', 'food'), glaze = new THREE.Color([0x545c68, 0x744d55, 0x606976, 0x5a626f][v % 4]), Wt = new THREE.Color(0xffffff), rnd = mulberry32(4500 + v);
    const prof = [[0.001, 0], [0.22, 0], [0.26, 0.03], [0.42, 0.14], [0.56, 0.3], [0.62, 0.42], [0.6, 0.445], [0.56, 0.43], [0.52, 0.32], [0.4, 0.2], [0.001, 0.15]];
    K.shiny.add(new THREE.LatheGeometry(v2s(prof), 24), (x, y) => (y > 0.4 ? Wt : glaze));
    K.yog.add(G.sphere(20, 8), 0x67717f, [0, 0.37, 0], 0, [0.545, 0.055, 0.545]);
    const red = new THREE.Color(0x473138), inner = new THREE.Color(0x784f58);
    for (let i = 0; i < 3; i++) {   // strawberry halves, cut face up
      const a = i / 3 * TAU + 0.3, x = Math.cos(a) * 0.27, z = Math.sin(a) * 0.27, cx = x, cz = z;
      K.shiny.add(G.hemi(12), red, [x, 0.44, z], [Math.PI, 0, 0], [0.11, 0.06, 0.13]);
      K.shiny.add(R.geo.hole || (R.geo.hole = keep(new THREE.CircleGeometry(1, 12))), (px, py, pz) => inner.clone().lerp(red, Math.pow(clamp(Math.hypot((px - cx) / 0.11, (pz - cz) / 0.13), 0, 1), 3)), [x, 0.442, z], [-Math.PI / 2, 0, 0], [0.11, 0.13, 1]);
    }
    for (let i = 0; i < 5; i++) { const a = rnd() * TAU, r = 0.1 + rnd() * 0.3; K.food.add(G.sphere(10, 8), 0x2e3239, [Math.cos(a) * r, 0.44, Math.sin(a) * r], 0, [0.055, 0.05, 0.055]); }
    K.food.add(G.octa(), 0x3e434c, [-0.05, 0.445, -0.02], [0, 0.6, 0], [0.12, 0.02, 0.05]); K.food.add(G.octa(), 0x434953, [0.04, 0.45, -0.07], [0, -0.5, 0], [0.1, 0.02, 0.045]);
    for (const [r, y] of [[0.19, 0.428], [0.1, 0.432]]) K.shiny.add(G.torus(TAU, 0.08, 20), 0x624249, [0.02, y, 0.03], [Math.PI / 2, 0, 0], [r, r, r * 0.7]);
    K.coin.push([0.34, 0.46, 0.18], [0.35, 0.3, -0.75]);
    K.coin.add(G.box(), 0x616a77, [0, 0.24, 0], 0, [0.05, 0.48, 0.014]);
    K.coin.add(G.sphere(12, 8), 0x616a77, [0, -0.02, 0], 0, [0.075, 0.1, 0.025]);
    K.coin.pop();
    return (R.geo[key] = buildKits(K));
  }
  // Things bobbing in the milk (decor, uv 50 = bob; each item's phase goes into uv.y): cereal rings, blueberries, strawberry slices
  const floatGeo = v => R.geo['float' + v] || (R.geo['float' + v] = [
    () => marked(G.torus(TAU, 0.42, 16), 50), () => marked(G.sphere(12, 8), 50), () => marked(G.cyl(1, 1, 14), 50)][v]());
  // White fence posts and rails (wood), little golden bells with a red bow
  function bellData() {
    if (R.geo.bell) return R.geo.bell;
    const K = kits('coin', 'decor');
    K.coin.add(new THREE.LatheGeometry(v2s([[0.001, 0.12], [0.03, 0.118], [0.045, 0.09], [0.058, 0.03], [0.075, 0.0], [0.07, -0.01], [0.001, 0.01]]), 14), 0x69464e);
    K.coin.add(G.sphere(8, 6), 0x583c43, [0, -0.02, 0], 0, 0.022);
    K.decor.add(G.octa(), 0x4d353c, [-0.035, 0.14, 0], [0, 0, 0.5], [0.04, 0.025, 0.015]); K.decor.add(G.octa(), 0x4d353c, [0.035, 0.14, 0], [0, 0, -0.5], [0.04, 0.025, 0.015]);
    K.decor.add(G.sphere(6, 4), 0x453037, [0, 0.14, 0], 0, 0.018);
    return (R.geo.bell = buildKits(K));
  }
  // Biscuit bridges: Petit-Beurre planks (golden, toasted rim, rows of dots), wafer-roll rails, sandwich-cookie posts (a cherry on the end ones)
  function biscuitData() {
    if (R.geo.biscuit) return R.geo.biscuit;
    const plank = new Kit(), gold = new THREE.Color(0x6f4a52), toast = new THREE.Color(0x553a41), dot = new THREE.Color(0x4d353c);
    plank.add(G.rbox(1), (x, y, z) => gold.clone().lerp(toast, smooth01((Math.max(Math.abs(x) / 0.23, Math.abs(z) / 0.5) - 0.74) / 0.26)), [0, 0, 0], 0, [0.46, 0.035, 1.0]);
    const dotG = R.geo.dot6 || (R.geo.dot6 = keep(new THREE.CircleGeometry(1, 6)));
    for (let i = 0; i < 6; i++) for (const sx of [-0.1, 0.1]) plank.add(dotG, dot, [sx, 0.0185, (i - 2.5) * 0.15], [-Math.PI / 2, 0, 0], 0.018);
    const wafer = new Kit(), wl = new THREE.Color(0x5b6470), wd = new THREE.Color(0x3d2c32);
    wafer.add(G.cyl(1, 1, 12), (x, y, z) => (((Math.atan2(y, x) / TAU + z * 2.5) % 1 + 1) % 1 < 0.5 ? wl : wd), [0, 0, 0], [Math.PI / 2, 0, 0], [0.055, 1, 0.055]);
    const post = new Kit(), ck = 0x31252a, cr = 0x646e7c;
    for (let i = 0; i < 3; i++) { post.add(G.cyl(1, 1, 18), ck, [0, 0.06 + i * 0.17, 0], 0, [0.17, 0.09, 0.17]); if (i < 2) post.add(G.cyl(1, 1, 18), cr, [0, 0.145 + i * 0.17, 0], 0, [0.15, 0.08, 0.15]); }
    const cherry = new Kit();
    cherry.add(G.sphere(14, 10), 0x3d2c31, [0, 0.52, 0], 0, 0.1);
    cherry.add(G.cyl(0.5, 1, 5), 0x343840, [0.03, 0.66, 0], [0, 0, -0.3], [0.012, 0.18, 0.012]);
    return (R.geo.biscuit = { plank: keep(plank.build()), wafer: keep(wafer.build()), post: keep(post.build()), cherry: keep(cherry.build()) });
  }
  // The "Çürüme Vadisi" / "Çürüme Kuyusu" sign board: cream wood with a cow-spotted frame, the name in round letters, a milk bottle
  function signTex(text) {
    const key = 'sign' + text;
    return R.tex[key] || (R.tex[key] = canvasTex(512, 256, (g, w, h) => {
      const rr = (x, y, ww, hh, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.closePath(); };
      g.fillStyle = '#f6efe2'; rr(0, 0, w, h, 38); g.fill();
      g.save(); rr(0, 0, w, h, 38); g.clip();
      const rnd = mulberry32(text.length * 97 + 5);
      g.fillStyle = '#2e2a2c';
      for (let i = 0; i < 26; i++) {   // cow spots around the frame
        const side = i % 4, t = rnd(), x = side < 2 ? t * w : side === 2 ? rnd() * 34 : w - rnd() * 34, y = side === 0 ? rnd() * 30 : side === 1 ? h - rnd() * 30 : t * h;
        g.beginPath(); g.ellipse(x, y, 14 + rnd() * 22, 10 + rnd() * 14, rnd() * 3, 0, TAU); g.fill();
      }
      g.restore();
      g.fillStyle = '#fffaf0'; rr(30, 30, w - 60, h - 60, 26); g.fill();
      g.lineWidth = 5; g.strokeStyle = '#f2a0b8'; rr(30, 30, w - 60, h - 60, 26); g.stroke();
      // a little kefir bottle on the left
      g.fillStyle = '#e4f0f6'; rr(64, 78, 44, 104, 14); g.fill(); g.fillRect(76, 58, 20, 26);
      g.fillStyle = '#fff4dc'; rr(64, 108, 44, 74, 14); g.fill();
      g.fillStyle = '#7ac48c'; g.fillRect(73, 50, 26, 12);
      g.fillStyle = '#f7a8c0'; g.fillRect(64, 128, 44, 22);
      g.fillStyle = '#3a2418'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const words = text.split(' ');
      g.font = 'bold 68px "Trebuchet MS", "Avenir Next", system-ui, sans-serif';
      g.fillText(words[0], w / 2 + 38, h / 2 - 34);
      g.font = 'bold 60px "Trebuchet MS", "Avenir Next", system-ui, sans-serif';
      g.fillText(words.slice(1).join(' '), w / 2 + 38, h / 2 + 36);
      g.fillStyle = '#f28aa8';
      for (const [x, y] of [[430, 60], [455, 200], [140, 205]]) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
    }));
  }
  // Posts, back plank, cow spots, bells (decor chunks) now; the painted board itself after fixReach (finishSigns), if its solid stayed
  function makeSign(L, B, x, z, text, yaw = 0, solid = true) {
    const M = mat4(x, 0, z, yaw), put = (mk2, geo, m, col) => dec(B, mk2, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
    const vis = [];
    vis.push(put('prop', G.box(), mat4(0, 1.3, -0.01, 0, 1.74, 0.92, 0.07, -0.08), lin(0x5c6572)));   // the back plank
    for (const sx of [-0.72, 0.72]) {
      vis.push(put('prop', G.cyl(1, 1, 10), mat4(sx, 0.9, -0.06, 0, 0.065, 1.8, 0.065), lin(0x656e7c)));
      for (let i = 0; i < 3; i++) vis.push(put('decor', G.sphere(8, 6), mat4(sx + (i - 1) * 0.02, 0.35 + i * 0.3, -0.0, i * 1.7, 0.05, 0.07, 0.02), lin(0x202227)));   // cow spots on the posts
      vis.push(put('coin', G.sphere(10, 8), mat4(sx, 1.82, -0.06, 0, 0.07), lin(0x69464e)));
    }
    const bl = bellData();
    for (const k in bl) vis.push(put(k, bl[k], mat4(0.62, 0.72, 0.05, 0), null));
    const so = solid ? propSolid(L, x - Math.sin(yaw) * 0.05, z - Math.cos(yaw) * 0.05, 0.78, 'sign', vis) : null;
    B.signs.push({ x, z, text, yaw, so });
    return so;
  }
  function finishSigns(L, B) {
    for (const sg of B.signs || []) {
      if (sg.so && !L.solids.includes(sg.so)) continue;   // taken out by fixReach (its posts went with it)
      const mk = 'sign-' + sg.text, bm = R.mat[mk] || (R.mat[mk] = keep(new THREE.MeshStandardMaterial({ map: sg.town ? townSignTex(sg.text) : signTex(sg.text), roughness: 0.72, metalness: 0 })));   // (Veba Şehri: its own board)
      const board = new THREE.Mesh(R.geo.signBoard || (R.geo.signBoard = keep(new THREE.PlaneGeometry(1.62, 0.81))), bm);
      board.position.set(sg.x + Math.sin(sg.yaw) * 0.03, sg.by || 1.3, sg.z + Math.cos(sg.yaw) * 0.03); board.rotation.set(-0.08, sg.yaw, 0, 'YXZ');
      board.receiveShadow = true; board.name = 'sign';
      B.g.add(board);
    }
  }
  // A cow-patterned mailbox on a post, its little red flag up
  function mailboxData() {
    if (R.geo.mailbox) return R.geo.mailbox;
    const K = kits('decor', 'prop'), d = K.decor;
    K.prop.add(G.box(), 0x5c6572, [0, 0.45, 0], 0, [0.1, 0.9, 0.1]);
    d.add(G.rbox(), 0x656f7d, [0, 1.0, 0], 0, [0.36, 0.3, 0.56]);
    d.add(halfCyl(), 0x656f7d, [0, 1.14, 0], [Math.PI / 2, 0, Math.PI / 2], [0.18, 0.56, 0.18]);
    const rnd = mulberry32(4601);
    for (let i = 0; i < 7; i++) { const sd = i % 2 ? 1 : -1, y = 0.92 + rnd() * 0.25, z = (rnd() - 0.5) * 0.44; d.add(G.sphere(8, 6), 0x202227, [sd * 0.181, y, z], 0, [0.006, 0.05 + rnd() * 0.04, 0.06 + rnd() * 0.05]); }
    d.add(G.box(), 0x4d353c, [0.2, 1.12, -0.1], 0, [0.02, 0.2, 0.03]); d.add(G.box(), 0x4d353c, [0.2, 1.2, -0.02], 0, [0.02, 0.08, 0.14]);
    d.add(G.sphere(8, 6), 0x734d55, [0, 1.02, 0.285], 0, [0.05, 0.05, 0.01]);   // the door knob
    return (R.geo.mailbox = buildKits(K));
  }
  // A cute smiling cow grazing on the meadow (the valley's milk comes from somewhere): white with black patches, a pink muzzle, big
  // shiny eyes, little horns, a golden bell on a red collar. Local: facing +z, ≈1.3 m long, 1.35 m to the horn tips. v 1: head a bit lower.
  // split: the head (with its collar and bell) and the tail as separate geometries round their pivots (the neck, the tail root) for the
  // few animated cows → { body: {shiny}, head, tail, neck: [x, y, z], tailAt: [x, y, z] }
  function cowData(v, split) {
    const key = 'cow' + v + (split ? 's' : '');
    if (R.geo[key]) return R.geo[key];
    const K = kits('shiny', 'coin'), k = K.shiny, W0 = new THREE.Color(0x656f7d), BK = new THREE.Color(0x222429), PK = new THREE.Color(0x734c54), HOOF = 0x3e2c32;
    const spots = [[0.3, 0.86, 0.12, 0.2], [-0.36, 0.72, -0.24, 0.24], [0.08, 0.98, -0.42, 0.2], [-0.24, 0.6, 0.34, 0.16], [0.4, 0.58, -0.3, 0.15]];
    const patch = (x, y, z) => spots.some(q => Math.hypot(x - q[0], (y - q[1]) * 1.2, z - q[2]) < q[3]) ? BK : W0;
    k.add(G.sphere(22, 16), patch, [0, 0.74, 0], 0, [0.42, 0.37, 0.62]);   // the body
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      k.add(G.cyl(0.9, 1, 10), (x, y) => (y < 0.09 ? new THREE.Color(HOOF) : W0), [sx * 0.21, 0.24, sz * 0.36], 0, [0.085, 0.48, 0.085]);
    }
    k.add(G.sphere(12, 8), PK, [0, 0.42, -0.16], 0, [0.13, 0.08, 0.15]);   // udder
    const hy = v ? 0.92 : 1.04, hz = v ? 0.66 : 0.6, rx = v ? 0.35 : 0.1;
    const NK = split ? [0, hy - 0.16, hz - 0.3] : [0, 0, 0], TL = split ? [0, 0.95, -0.58] : [0, 0, 0];   // pivots: the neck (inside the body's front), the tail root
    const kh = split ? new Kit() : k, kb = split ? kh : K.coin, kt = split ? new Kit() : k;
    kh.push([-NK[0], hy - NK[1], hz - NK[2]], [rx, 0, 0]);
    kh.add(G.sphere(20, 14), (x, y, z) => (Math.hypot(x + NK[0] - 0.12, y + NK[1] - hy - 0.1, z + NK[2] - hz) < 0.1 ? BK : W0), [0, 0, 0], 0, [0.27, 0.25, 0.27]);   // head (one patch round an eye)
    kh.add(G.sphere(18, 12), PK, [0, -0.08, 0.2], 0, [0.22, 0.14, 0.15]);   // muzzle
    for (const sx of [-1, 1]) {
      kh.add(G.sphere(8, 6), 0x463137, [sx * 0.07, -0.05, 0.345], 0, [0.025, 0.035, 0.012]);   // nostrils
      kh.add(G.sphere(14, 10), 0xffffff, [sx * 0.105, 0.08, 0.215], 0, [0.075, 0.085, 0.05]);   // big eyes
      kh.add(G.sphere(12, 8), 0x201a1f, [sx * 0.1, 0.075, 0.255], 0, [0.05, 0.06, 0.03]);
      kh.add(G.sphere(8, 6), 0xffffff, [sx * 0.1 + 0.018, 0.1, 0.28], 0, 0.015);   // glints
      kh.add(G.sphere(8, 6), 0x6c4850, [sx * 0.19, -0.02, 0.18], 0, [0.05, 0.03, 0.02]);   // blush
      kh.add(G.sphere(10, 8), (x, y, z) => (Math.abs(x + NK[0]) > 0.33 ? PK : W0), [sx * 0.29, 0.08, -0.02], [0, 0, sx * 0.5], [0.11, 0.05, 0.07]);   // ears
      kh.add(G.cone(8), 0x606977, [sx * 0.13, 0.25, -0.02], [0, 0, -sx * 0.5], [0.035, 0.12, 0.035]);   // little horns
    }
    kh.add(G.torus(Math.PI * 0.7, 0.18, 12), 0x2d2227, [0, -0.1, 0.345], [0, 0, Math.PI * 1.15], [0.07, 0.05, 0.05]);   // a smile
    kh.add(G.torus(TAU, 0.14, 16), 0x4d353c, [0, -0.2, -0.04], [1.3, 0, 0], [0.2, 0.2, 0.2]);   // collar
    kh.pop();
    kb.push([-NK[0], hy - (v ? 0.36 : 0.37) - NK[1], hz + (v ? 0.1 : 0.05) - NK[2]], [rx, 0, 0]);   // the bell (animated cows: on the glossy head mesh)
    kb.add(new THREE.LatheGeometry(v2s([[0.001, 0.12], [0.03, 0.118], [0.045, 0.09], [0.058, 0.03], [0.075, 0.0], [0.07, -0.01], [0.001, 0.01]]), 12), 0x69464e, [0, 0, 0], 0, 1.1);
    kb.pop();
    kt.seg([-TL[0], 0.95 - TL[1], -0.58 - TL[2]], [0.06 - TL[0], 0.5 - TL[1], -0.72 - TL[2]], 0.022, W0, 0.018, 6);   // tail
    kt.add(G.sphere(8, 6), BK, [0.065 - TL[0], 0.46 - TL[1], -0.73 - TL[2]], 0, [0.05, 0.08, 0.05]);
    if (split) return (R.geo[key] = { body: buildKits({ shiny: k }), head: keep(kh.build()), tail: keep(kt.build()), neck: NK, tailAt: TL });
    return (R.geo[key] = buildKits(K));
  }
  // A few cows come alive (the paddock cow and at most one near the route): head and tail as two small meshes on a group (+2 draw calls
  // each). The head nods, dips to graze every 4–7 s, the tail swishes; when Feza comes within 3.5 m she turns her head to him once, a
  // little cheer of hearts pops over her and (rarely, ≥ 20 s apart) she moos
  let mooAt = -99;
  function liveCow(B, x, z, yaw, s, v) {
    const D = cowData(v, true), vis = putD(B, D.body, mat4(x, 0, z, yaw, s));
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.set(0, yaw, 0, 'YXZ'); g.scale.setScalar(s); g.name = 'cow';
    const head = new THREE.Mesh(D.head, R.mat.shiny), tail = new THREE.Mesh(D.tail, R.mat.shiny);
    head.position.set(...D.neck); tail.position.set(...D.tailAt); head.rotation.order = 'YXZ';
    head.castShadow = tail.castShadow = true; head.receiveShadow = true;
    g.add(head, tail); B.g.add(g);
    const c = { x, z, yaw, s, head, tail, ph: Math.random() * TAU, dipT: 2 + Math.random() * 4, dip: 0, look: 0, lookT: 0, near: false, cheered: 0, vis };
    (B.cows || (B.cows = [])).push(c);
    if (B.cows.length === 1) B.anim.push((dt, hx, hz) => {
      const t = TIME.t;
      for (const q of B.cows) {
        const dx = hx - q.x, dz = hz - q.z, d = Math.hypot(dx, dz);
        if (d < 3.5 && !q.near) {   // Feza came over: look at him (once per visit), a little cheer, now and then a moo
          q.near = true; q.lookT = 3.2; q.cheered++;
          if (typeof FX !== 'undefined' && FX.burst) FX.burst('cheer', q.x, 1.6 * q.s, q.z, { scale: 0.35 });
          if (typeof AUD !== 'undefined' && AUD.sfx && !AUD.current && t - mooAt > 20) { mooAt = t; AUD.sfx('moo', { x: q.x, z: q.z, vol: 0.9 }); }   // (never over the narrator)
        } else if (d > 6) q.near = false;
        if (d > 30) continue;   // (far away: no animation work)
        q.lookT = Math.max(0, q.lookT - dt);
        let want = 0;
        if (q.lookT > 0) { let a = Math.atan2(dx, dz) - q.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); want = clamp(a, -0.75, 0.75); }
        q.look += (want - q.look) * Math.min(1, dt * 4);
        if ((q.dipT -= dt) <= 0 && q.lookT <= 0) { q.dipT = 4 + Math.random() * 3; q.dip = 2.2; }   // bend down to graze now and then
        const gz = q.dip > 0 ? Math.sin(Math.PI * Math.min(1, (2.2 - q.dip) / 2.2)) : 0; q.dip = Math.max(0, q.dip - dt);
        q.head.rotation.x = 0.07 * Math.sin(1.3 * t + q.ph) + 0.6 * gz * (q.lookT > 0 ? 0 : 1);
        q.head.rotation.y = q.look;
        q.tail.rotation.z = 0.35 * Math.sin(3 * t + q.ph);
      }
    });
    return vis;
  }
  // Milk waterfalls: glossy creamy ribbons pouring into the milk (same ribbon mesh as the lavafalls): warm bright white, broad soft
  // streaks sliding down, rounder in the middle, a glossy highlight running down the centre
  const MILKFALL_FS = `uniform float uTime, fogNear, fogFar; uniform vec3 fogColor; uniform sampler2D tNoise; varying vec2 vF; varying float vFogD;
    void main() {
      float x = vF.x, v = vF.y;   // x: 0..1 across · v: metres down from the lip (+ a phase)
      float e = smoothstep(0.0, 0.16, x) * smoothstep(1.0, 0.84, x);
      float s1 = texture2D(tNoise, vec2(x * 1.1 + 0.3, v * 0.12 - uTime * 0.55)).g, s2 = texture2D(tNoise, vec2(x * 2.3 + 0.7, v * 0.2 - uTime * 0.95)).b;
      if (e * (0.85 + 0.4 * s1) < 0.3) discard;   // a soft wobbly edge
      vec3 col = vec3(1.0, 0.985, 0.955) * (0.84 + 0.12 * s2 + 0.08 * sin(x * 3.14159));   // broad soft streaks, a rounded pour
      float hi = smoothstep(0.15, 0.0, abs(x - 0.42 - 0.05 * sin(v * 2.1 - uTime * 3.0))) * (0.55 + 0.45 * s1);
      col += vec3(0.15, 0.16, 0.17) * hi;   // the glossy highlight running down
      col *= mix(0.86, 1.0, e);
      col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogD));
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`;
  function milkfallMat() {
    return R.mat.milkfall || (R.mat.milkfall = keep(new THREE.ShaderMaterial({
      uniforms: Object.assign({ uTime: TIME.u, tNoise: { value: texOK() && TEX.noise ? TEX.noise : blackTex() } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
      vertexShader: LAVAFALL_VS, fragmentShader: MILKFALL_FS, side: THREE.DoubleSide, fog: true,
    })));
  }
  // Giant props that stand on the ground (outside or inside the rooms): footprint radius / top at scale 1, weight
  const DPROP = [
    { id: 'cheese0', r: 1.0, h: 0.56, w: 3, d: () => cheeseData(0) }, { id: 'cheese1', r: 1.6, h: 0.56, w: 2, out: 1, d: () => cheeseData(1) },
    { id: 'cheese2', r: 0.95, h: 0.66, w: 2.5, d: () => cheeseData(2) }, { id: 'cheese3', r: 0.66, h: 0.72, w: 2, d: () => cheeseData(3) },
    { id: 'butter', r: 0.6, h: 0.62, w: 1.2, d: butterData }, { id: 'pots0', r: 0.36, h: 0.72, w: 1, d: () => potData(0) },
    { id: 'pots1', r: 0.66, h: 1.2, w: 2, d: () => potData(1) }, { id: 'pots2', r: 0.36, h: 1.2, w: 1.2, d: () => potData(2) },
    { id: 'pots3', r: 0.98, h: 1.7, w: 1.2, d: () => potData(3) }, { id: 'gugum', r: 0.44, h: 1.1, w: 2.2, d: gugumData },
    { id: 'yayik', r: 0.36, h: 1.72, w: 1.3, d: yayikData }, { id: 'bottles0', r: 0.45, h: 1.12, w: 1.6, d: () => bottleData(0) },
    { id: 'bottles1', r: 0.66, h: 0.9, w: 1.2, d: () => bottleData(1) }, { id: 'bottles2', r: 0.7, h: 1.45, w: 1.2, d: () => bottleData(2) },
    { id: 'honey', r: 0.42, h: 1.05, w: 1.8, d: honeyData }, { id: 'sberry', r: 0.45, h: 1.02, w: 2.2, d: strawberryData },
    { id: 'bberry0', r: 0.38, h: 0.66, w: 1.2, d: () => blueberryData(0) }, { id: 'bberry1', r: 0.5, h: 0.5, w: 1.5, d: () => blueberryData(1) },
    { id: 'bowl', r: 0.64, h: 0.62, w: 1.8, d: v => bowlData(v || 0) },
  ];
  const DPROP_W = DPROP.map(p => p.w);

  function dreadGeo(v=0) {
    const key='dread'+v;if(R.geo[key])return R.geo[key];const k=new Kit();
    const stone=0x948776,iron=0x4b4140,bone=0xb9aa8b;
    if(v===0){
      k.add(G.box(),stone,[-0.06,0.49,0],[0,0,-0.1],[0.5,0.9,0.16]);
      k.add(G.octa(),0xaaa08b,[-0.11,0.95,0],0,[0.28,0.14,0.09]);
      k.add(G.box(),0x635b50,[0,0.06,0.38],0,[0.64,0.11,0.97]);
      k.add(G.box(),iron,[-0.05,0.53,0.091],0,[0.043,0.32,0.02]);k.add(G.box(),iron,[-0.05,0.58,0.095],0,[0.22,0.043,0.02]);
      for(let i=0;i<3;i++)k.add(G.box(),0x66594c,[-0.07,0.33-i*0.055,0.1],0,[0.2-i*0.018,0.017,0.02]);
      // An empty wreath and a single snapped candle tell a human story without extra animation.
      k.add(G.torus(TAU,0.12,8),0x746c4e,[0,0.14,0.54],[-Math.PI/2,0,0],0.18);
      k.add(G.cyl(0.8,1,6),0xb6a38a,[0.24,0.1,0.05],0,[0.035,0.17,0.035]);
    }else if(v===1){
      k.seg([-0.65,0.08,0],[0.65,0.08,0],0.06,bone,0.04,6);
      for(let i=0;i<5;i++){const x=(i-2)*0.23;for(const side of [-1,1]){k.seg([x,0.08,0],[x,0.35,side*0.27],0.042,bone,0.03,5);k.seg([x,0.35,side*0.27],[x,0.13,side*0.52],0.03,bone,0.012,5);}}
      k.add(G.octa(),0xa79578,[-0.78,0.13,0],0,[0.2,0.14,0.15]);
      for(const z of [-0.075,0.075])k.add(G.box(),0x3b3230,[-0.89,0.18,z],0,[0.05,0.035,0.043]);
    }else if(v===2){
      k.add(G.box(),iron,[-0.4,0.85,0],[0,0,-0.025],[0.12,1.7,0.12]);k.add(G.box(),iron,[0.03,1.7,0],[0,0,0.03],[0.98,0.1,0.12]);
      k.seg([-0.4,1.25,0],[-0.05,1.65,0],0.036,0x796b58,0.026,5);
      for(let i=0;i<5;i++)k.add(G.torus(TAU,0.16,8),0x8d7860,[0.34,1.58-i*0.12,0],[0,i%2?Math.PI/2:0,0],0.07);
      k.add(G.torus(TAU,0.08,12),0x847564,[0.35,0.85,0],0,[0.13,0.18,0.13]);
    }else{
      k.add(G.cone(4),stone,[0,0.7,0],[0,0,0.08],[0.4,1.4,0.4]);k.add(G.box(),0x954438,[0,0.46,0.29],0,[0.08,0.4,0.035]);
      k.add(G.box(),iron,[0,0.43,0],0,[0.84,0.1,0.16]);k.add(G.octa(),0x7c6c5c,[0.34,0.08,0.2],0,[0.19,0.06,0.16]);
    }return(R.geo[key]=keep(k.build()));
  }
  // Static, merged landmarks use the existing prop materials and visibility budget.
  // Each region tells a different part of the massacre through abandoned human objects.
  function storyGeo(theme,v=0) {
    const key='story-'+theme+'-'+v;if(R.geo[key])return R.geo[key];const k=new Kit();
    const wood=0xc4ac85,iron=0xad9d85,stone=0xc1b397,bone=0xdbccac,blood=0xac604d;
    const plank=(x,y,z,sx,sy,sz,tilt=0)=>k.add(G.box(),wood,[x,y,z],[0,0,tilt],[sx,sy,sz]);
    const chain=(x,y,z,n)=>{for(let i=0;i<n;i++)k.add(G.torus(TAU,0.16,8),iron,[x,y-i*0.13,z],[0,i%2?Math.PI/2:0,0],0.075);};
    if(theme==='forest'){
      for(const sd of [-1,1]){k.seg([sd*0.63,0,-0.18],[sd*0.57,1.62,-0.1],0.075,wood,0.03,6);k.seg([sd*0.57,1.62,-0.1],[sd*0.83,1.89,-0.12],0.03,wood,0.008,5);}
      plank(0,1.53,-0.1,1.32,0.1,0.13,-0.025);
      for(let i=0;i<3;i++){const x=(i-1)*0.32;chain(x,1.43,-0.08,2);k.add(G.box(),v?0xa27658:0xbcb097,[x,0.97,-0.08],[0,0,i*.06-.05],[0.2,0.53,0.03]);k.add(G.box(),blood,[x,1.02,-0.06],0,[0.026,0.25,0.011]);}
      k.add(G.cyl(0.8,1,8),stone,[0,0.11,0.24],0,[0.48,0.22,0.42]);k.add(G.cyl(1,1,8),0x423a31,[0,0.23,0.24],0,[0.37,0.02,0.31]);
      for(let i=0;i<3;i++)k.add(G.cyl(0.9,1,6),bone,[-0.2+i*.2,0.37,0.27],0,[0.045,0.28-i*.055,0.045]);
    }else if(theme==='dairy'){
      k.add(G.box(),0x7b7965,[0,0.12,0],0,[1.75,0.24,1.18]);
      for(let i=0;i<3;i++)k.add(G.box(),stone,[(i-1)*0.46,0.37+i*.02,0],[0,0,(i-1)*.045],[0.43,0.5,0.97]);
      k.add(G.box(),0x736d56,[0,0.73,-0.08],[0,0,.08],[1.55,0.16,1.18]);
      k.add(G.box(),blood,[0,0.78,0.54],[0,0,.08],[0.055,0.32,0.018]);
      k.add(G.cyl(1,1,10),iron,[0.84,0.61,0],[0,0,Math.PI/2],[0.15,0.46,0.15]);
      k.add(G.cyl(1,1,10),0x2e3e29,[1.08,0.61,0],[0,0,Math.PI/2],[0.12,0.025,0.12]);
      for(let i=0;i<3;i++)k.add(G.box(),0x64704b,[1.1,0.49-i*.12,0],0,[0.023,0.08,0.023]);
      k.add(G.box(),0x423d31,[-0.25,0.85,0],[0,0,.15],[0.19,0.06,0.22]);
    }else if(theme==='cave'){
      for(const x of [-0.65,0.65])plank(x,0.77,-0.2,0.13,1.54,0.16,x*.06);
      plank(0,1.55,-0.2,1.56,0.17,0.2,-.045);k.seg([-.65,1.15,-.2],[-.26,1.53,-.2],.046,wood,.046,5);
      chain(.26,1.38,-.14,4);k.add(G.hemi(10),iron,[.26,.76,-.14],[Math.PI,0,0],[.18,.12,.18]);
      for(const x of [-.47,.47])k.add(G.box(),iron,[x,.035,.38],0,[.05,.07,1.2]);
      for(let i=0;i<4;i++)plank(0,.055,.05+i*.25,1.2,.05,.08);
      k.seg([-.55,.08,.28],[-.13,.86,.19],.025,wood,.025,6);k.seg([-.36,.64,.2],[.12,.88,.17],.03,iron,.024,6);
      k.add(G.octa(),bone,[.5,.12,.53],0,[.15,.1,.11]);
    }else if(theme==='volcano'){
      k.add(G.cyl(.8,1,8),0x77705f,[0,.23,0],0,[.5,.46,.45]);
      k.add(G.box(),iron,[0,.58,0],0,[.73,.28,.5]);k.add(G.box(),0x94816b,[0,.78,0],0,[1.0,.12,.5]);
      k.add(G.cone(4),iron,[.61,.75,0],[0,0,-Math.PI/2],[.22,.46,.24]);
      k.add(G.box(),blood,[-.14,.65,.258],[0,0,-.11],[.035,.27,.016]);
      k.seg([-.5,.12,.46],[.05,.23,.39],.026,wood,.026,6);k.add(G.box(),iron,[-.58,.12,.46],[0,0,-.17],[.27,.18,.16]);
      k.add(G.torus(TAU,.11,10),0xa3815d,[.6,.05,.56],[-Math.PI/2,0,0],[.22,.22,.22]);
      for(let i=0;i<3;i++)k.add(G.cone(5),0x3c322b,[-.64+i*.16,.1,-.39],[0,i,0],[.16,.16,.14]);
    }else if(theme==='town'){
      for(const x of [-.57,.57])plank(x,.73,-.22,.1,1.46,.12);
      plank(0,1.4,-.22,1.24,.1,.14,.03);plank(0,.57,-.21,1.26,.09,.09,-.07);
      for(let i=0;i<6;i++)k.add(G.box(),iron,[(i-2.5)*.18,.94,-.19],0,[.024,.85,.03]);
      k.add(G.box(),0x746555,[.05,1.05,-.12],[0,0,.07],[.49,.36,.045]);
      for(const a of [-.6,.6])k.add(G.box(),blood,[.05,1.05,-.088],[0,0,a],[.33,.044,.014]);
      k.add(G.box(),0x8d7c63,[0,.23,.25],0,[.71,.4,.46]);
      k.add(G.box(),0x4b3e35,[0,.34,.488],0,[.68,.035,.018]);k.add(G.octa(),bone,[.43,.09,.52],0,[.13,.08,.1]);
      chain(-.42,.75,-.12,4);
    }else{
      k.add(G.box(),stone,[0,.16,0],0,[1.25,.32,.98]);k.add(G.box(),iron,[0,.42,.12],0,[.87,.2,.64]);
      k.add(G.box(),0x6b5949,[-.1,1.06,-.24],[0,0,-.07],[.71,1.26,.17]);
      k.add(G.cone(4),0x9c7d5e,[-.14,1.82,-.24],0,[.44,.24,.12]);
      for(const x of [-.47,.47]){k.add(G.box(),iron,[x,.56,.15],0,[.1,.52,.1]);k.add(G.box(),stone,[x,.82,.11],0,[.15,.09,.7]);}
      k.add(G.box(),blood,[-.12,1.07,-.14],0,[.045,.47,.015]);k.add(G.box(),blood,[-.12,1.2,-.138],0,[.25,.045,.015]);
      k.add(G.octa(),bone,[.64,.12,.37],0,[.17,.1,.13]);chain(-.43,.76,.25,4);
    }return(R.geo[key]=keep(k.build()));
  }
  function dreadRoomDecor(L,B) {
    const rnd=B.rnd;L.darkDecor={graves:0,ribs:0,chains:0,stories:0,storySpots:[]};
    for(const [ri,rm] of L.rooms.entries()){
      for(let i=0;i<5;i++){
        const a=(i+.3)*TAU/5,r=rm.r||Math.min(rm.hw||6,rm.hh||6),x=rm.x+Math.cos(a)*(r+1.1),z=rm.z+Math.sin(a)*(r+1.1);
        if(x<1||z<1||x>=L.W-1||z>=L.H-1||L.grid[Math.floor(z)*L.W+Math.floor(x)])continue;
        const v=i%3,sc=hides(L,x,z,.55,0,1.7,.05)?.33:.75+rnd()*.3;
        dec(B,'prop',dreadGeo(v),mat4(x,0,z,a+.3,sc),null);L.darkDecor[['graves','ribs','chains'][v]]++;
      }
      // One scene per room, set away from the route and all interactive objects. The existing reachability repair owns its collider.
      let best=null;
      for(let n=0;n<28;n++){
        const a=-Math.PI*.84+rnd()*Math.PI*.68,r=(rm.r||Math.min(rm.hw||6,rm.hh||6))*.78;
        const x=rm.x+Math.cos(a)*r,z=rm.z+Math.sin(a)*r;
        if(!isFloor(L,x,z)||!circleFree(L,x,z,.9)||linkDist(L,x,z)<2.7||hyp(x-L.start.x,z-L.start.z)<4.5)continue;
        if(L.checkpoints.some(p=>hyp(p.x-x,p.z-z)<3)||L.chests.some(p=>hyp(p.x-x,p.z-z)<2.4)||(L.exit&&hyp(L.exit.x-x,L.exit.z-z)<4)||(L.boss&&hyp(L.boss.x-x,L.boss.z-z)<5))continue;
        if(L.darkDecor.storySpots.some(p=>hyp(p.x-x,p.z-z)<5))continue;
        const sc=hides(L,x,z,.85,0,1.35,.1)?.62:.82;
        best={x,z,sc};break;
      }
      if(best){const {x,z,sc}=best,vis=[dec(B,'prop',storyGeo(L.theme,ri%2),mat4(x,0,z,Math.PI*.025*(ri%3-1),sc),null)];propSolid(L,x,z,.48,'lost-history',vis);L.darkDecor.stories++;L.darkDecor.storySpots.push({x,z,theme:L.theme});}
    }
  }

  function buildDairy(L, B) {
    const rnd=B.rnd,W=L.W,H=L.H,V=L._dairy||dairyField(L),dF=L._dF=chamfer(W,H,L.grid,1);
    L.dairyDecor={hills:0,props:0,bridges:V.bridges.length,falls:0,arena:1,spots:[]};
    // All dairy scenery is replaced. The original walkable cells, river flow and bridge route are retained.
    for(let z=1;z<H-1;z++)for(let x=1;x<W-1;x++) {
      const c=z*W+x;if(L.grid[c]||dF[c]>5)continue;
      const liquid=V.lava[Math.floor((z+0.5)*V.P)*V.MW+Math.floor((x+0.5)*V.P)]||0;
      if(liquid>0.6) { if(rnd()<0.06)dec(B,'decor',tuftGeo(2),mat4(x+0.5,0.02,z+0.5,rnd()*TAU,1.3),null);continue; }
      if(rnd()<0.19) {
        const scale=hides(L,x,z,0.5,0,1.4,0.05)?0.35:0.75+rnd()*0.6;
        dec(B,'prop',dreadGeo(rnd()<0.7?0:1),mat4(x+0.5,0,z+0.5,rnd()*TAU,scale),null);L.dairyDecor.props++;
      } else if(rnd()<0.3) inst(B,'rock'+((x+z)%3),mat4(x+0.5,-0.03,z+0.5,rnd()*TAU,0.7,0.28+rnd()*0.6,0.7),lin(0x353941));
      if(dF[c]>2&&rnd()<0.028&&!hides(L,x,z,0.8,0,4,0.1))inst(B,'oak',mat4(x+0.5,0,z+0.5,rnd()*TAU,0.65),lin(0x383d45));
    }
    for(const bridge of V.bridges)for(let i=0;i<bridge.pts.length;i+=3) {
      const p=bridge.pts[i];dec(B,'decor',dreadGeo(1),mat4(p.x,-0.03,p.z,0,0.28),null);
    }
    const ar=V.arena;if(ar)for(let i=0;i<12;i++){const a=i*TAU/12,x=ar.x+Math.cos(a)*(ar.r+0.8),z=ar.z+Math.sin(a)*(ar.r+0.8),sc=hides(L,x,z,0.5,0,1.4,0.05)?0.35:0.9;dec(B,'prop',dreadGeo(i%3===0?3:0),mat4(x,0,z,-a,sc),null);}
    dreadRoomDecor(L,B);
  }
  // Little red berries dotted over a strawberry bush (merged into the shiny decor chunks)
  function berryDotsGeo() {
    if (R.geo.berryDots) return R.geo.berryDots;
    const k = new Kit(), rnd = mulberry32(4801);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * TAU, e = 0.25 + rnd() * 0.9, r = 0.62;
      const p = [Math.cos(a) * Math.cos(e) * r * 1.15, 0.4 + Math.sin(e) * r * 0.8, Math.sin(a) * Math.cos(e) * r * 1.15];
      k.add(G.sphere(6, 4), i % 5 ? 0x443036 : 0x636c7a, p, 0, i % 5 ? [0.055, 0.07, 0.055] : [0.05, 0.03, 0.05]);   // berries and a few white blossoms
      if (i % 5) k.add(G.octa(), 0x3a3f47, [p[0], p[1] + 0.06, p[2]], 0, [0.04, 0.015, 0.04]);
    }
    return (R.geo.berryDots = keep(k.build()));
  }
  // Low-poly stand-ins that cast the yogurt hills' shadows (8 segments; the detailed hills don't cast)
  function dollopLo(v) {
    const key = 'dollopLo' + v;
    if (R.geo[key]) return R.geo[key];
    const prof = v === 2 ? [[0.001, 0], [0.84, 0], [0.8, 0.22], [0.56, 0.6], [0.24, 0.98], [0.001, 1.1]] : DOLLOP_PROF[v].filter((q, i) => i % 2 === 0 || i === DOLLOP_PROF[v].length - 1);
    const g = new THREE.LatheGeometry(v2s(prof), 8);
    if (v !== 2) g.scale(0.92, 0.96, 0.92);   // a little inside the lumpy hill, so it never shades the hill's own lit side
    return (R.geo[key] = keep(g));
  }
  // A piped cream rosette (star nozzle): twisted ridges rising to a soft round top — cake piping, never a pointed coil. Radius 1,
  // 0.7 high at scale 1; white vertex colour (tinted per rosette)
  function rosetteGeo() {
    if (R.geo.rosette) return R.geo.rosette;
    const g = new THREE.LatheGeometry(smoothProfile([[0.001, 0], [0.84, 0], [1.0, 0.1], [0.96, 0.26], [0.8, 0.42], [0.58, 0.55], [0.36, 0.64], [0.14, 0.69], [0.001, 0.7]], 6), 16), P = g.attributes.position;   // (192 triangles)
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z);
      if (r < 1e-3) continue;
      const k = 1 + 0.14 * Math.cos((Math.atan2(z, x) + y * 2.4) * 8) * smooth01(r / 0.4);   // 8 ridges twisting up like piped cream
      P.setXYZ(i, x * k, y, z * k);
    }
    weldNormals(g); markUV(g, 0);
    return (R.geo.rosette = keep(g));
  }
  // Walk-over floor treats (all < 0.15 m): a strawberry half lying cut face up, a granola cluster, a honey drizzle line
  function sbHalfGeo() {
    if (R.geo.sbHalf) return R.geo.sbHalf;
    const k = new Kit(), red = new THREE.Color(0x473138), inner = new THREE.Color(0x7b5159);
    k.add(G.hemi(10), red, [0, 0.045, 0], [Math.PI, 0, 0], [0.8, 0.9, 1.0]);
    k.add(R.geo.hole || (R.geo.hole = keep(new THREE.CircleGeometry(1, 12))), (px, py, pz) => inner.clone().lerp(red, Math.pow(clamp(Math.hypot(px / 0.8, pz), 0, 1), 3)), [0, 0.047, 0], [-Math.PI / 2, 0, 0], [0.8, 1.0, 1]);
    for (const [x, z] of [[0, 0.5], [0.25, 0.1], [-0.25, 0.1], [0, -0.35]]) k.add(G.octa(), 0x606976, [x, 0.049, z], 0, [0.06, 0.01, 0.08]);   // seeds on the cut face
    k.add(G.octa(), 0x3a3f47, [0, 0.05, 0.95], [0, 0.3, 0], [0.34, 0.03, 0.12]);   // a bit of leaf
    return (R.geo.sbHalf = keep(k.build()));
  }
  function granolaGeo(v) {
    const key = 'granola' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), rnd = mulberry32(4900 + v), C = [0x5c3e45, 0x533940, 0x69464e, 0x4c353b];
    for (let i = 0; i < 6; i++) { const a = rnd() * TAU, r = rnd() * 0.07; k.add(G.dodeca(), C[i % 4], [Math.cos(a) * r, 0.02 + rnd() * 0.02, Math.sin(a) * r], [rnd() * 3, rnd() * 3, 0], 0.025 + rnd() * 0.018); }
    for (let i = 0; i < 3; i++) { const a = rnd() * TAU, r = 0.05 + rnd() * 0.08; k.add(G.octa(), 0x5d6673, [Math.cos(a) * r, 0.012, Math.sin(a) * r], [0, rnd() * 3, 0.15], [0.035, 0.008, 0.024]); }   // oat flakes
    return (R.geo[key] = keep(k.build()));
  }
  // A glossy jam dollop dropped on the yogurt (strawberry, raspberry, blueberry or apricot by tint): three overlapping soft lobes and a
  // paler glossy highlight arc (a dollop, never a spiral or a puddle). ≈0.45 m across, 0.05 m high at scale 1
  const jamDollopGeo = () => R.geo.jamDollop || (R.geo.jamDollop = keep((() => {
    const k = new Kit(), lobe = G.sphere(12, 6);
    k.add(lobe, 0x5f6876, [0, 0, 0], [0, 0.3, 0], [0.2, 0.042, 0.16]);
    k.add(lobe, 0x5d6673, [0.075, 0.004, 0.05], [0, -0.5, 0], [0.13, 0.036, 0.11]);
    k.add(lobe, 0x5d6673, [-0.07, 0.002, 0.055], [0, 0.9, 0], [0.12, 0.034, 0.1]);
    k.add(lobe, 0x636c7a, [0.01, 0.018, -0.01], 0, [0.1, 0.032, 0.085]);   // the soft crown in the middle
    k.add(G.torus(Math.PI * 1.1, 0.25, 12), new THREE.Color(1.5, 1.5, 1.5), [0.01, 0.047, -0.01], [-Math.PI / 2, 0, 0.5], [0.05, 0.05, 0.02]);   // paler glossy highlight
    return k.build();
  })()));
  // A banana slice lying flat (radius 1, 0.2 thick at scale 1; placed at ≈0.09 m): pale cream-yellow, a deeper rim, six little seeds
  const bananaGeo = () => R.geo.banana || (R.geo.banana = keep((() => {
    const k = new Kit(), pale = new THREE.Color(0x626b79), rim = new THREE.Color(0x58606c);
    k.add(G.cyl(1, 1, 16), (x, y, z) => pale.clone().lerp(rim, smooth01((Math.hypot(x, z) - 0.72) / 0.28)), [0, 0.1, 0], 0, [1, 0.2, 1]);
    const dot = R.geo.dot6 || (R.geo.dot6 = keep(new THREE.CircleGeometry(1, 6)));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.add(dot, 0x36282d, [Math.cos(a) * 0.32, 0.202, Math.sin(a) * 0.32], [-Math.PI / 2, 0, 0], [0.09, 0.13, 1]); }
    k.add(dot, 0x656f7c, [0, 0.203, 0], [-Math.PI / 2, 0, 0], 0.14);
    return k.build();
  })()));
  // Little pastel rainbows (the waterfalls' spray, the spring after the boss): flat half-ring bands standing up, facing the gameplay camera
  // (+z) and leaning back a little toward it, merged into one geometry. RGBA vertex colours: red outside → violet inside, soft inner and
  // outer edges and feet fading into the spray. arcs: [{x, y, z, r (outer radius), bw (band width), lean (rad about x)}]
  const RAINBOW = [[1, 0.5, 0.58], [1, 0.7, 0.42], [1, 0.92, 0.45], [0.55, 0.9, 0.58], [0.5, 0.76, 1], [0.76, 0.58, 1]];
  function rainbowGeo(arcs) {
    const TS = 28, PS = 10, pos = [], col = [], idx = [], v = new THREE.Vector3(), e = new THREE.Euler();
    for (const a of arcs) {
      const v0 = pos.length / 3, m = new THREE.Matrix4().compose(new THREE.Vector3(a.x, a.y, a.z), new THREE.Quaternion().setFromEuler(e.set(a.lean || 0, 0, 0)), new THREE.Vector3(1, 1, 1));
      for (let j = 0; j <= PS; j++) {
        const u = j / PS, rr = a.r - a.bw * u, t = u * 5, i0 = Math.min(4, Math.floor(t)), f = t - i0, c0 = RAINBOW[i0], c1 = RAINBOW[i0 + 1];
        for (let i = 0; i <= TS; i++) {
          const th = i / TS * Math.PI;
          v.set(Math.cos(th) * rr, Math.sin(th) * rr, 0).applyMatrix4(m);
          pos.push(v.x, v.y, v.z);
          const al = Math.sin(Math.PI * u) * smooth01(Math.min(th, Math.PI - th) / 0.55);
          col.push(lerp(c0[0], c1[0], f), lerp(c0[1], c1[1], f), lerp(c0[2], c1[2], f), al);
        }
      }
      for (let j = 0; j < PS; j++) for (let i = 0; i < TS; i++) { const p = v0 + j * (TS + 1) + i, q = p + TS + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx); g.computeBoundingSphere();
    return g;
  }
  // A kefir-bottle crown cap (stepping stone round the spring): a flat top with a white printed ring, a crimped skirt. Radius 1, height 1
  function bottleCapGeo() {
    if (R.geo.bCap) return R.geo.bCap;
    const g = new THREE.LatheGeometry(v2s([[1.07, 0], [1.0, 0.2], [0.95, 0.85], [0.84, 1], [0.52, 1], [0.5, 1], [0.001, 1]]), 21), P = g.attributes.position;   // (bottom → top: normals outward)
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z); if (r > 0.9) { const k = 1 + 0.07 * Math.cos(Math.atan2(z, x) * 21) * (1 - y); P.setX(i, x * k); P.setZ(i, z * k); } }
    weldNormals(g);
    const k = new Kit(); k.add(g, (x, y, z) => { const r = Math.hypot(x, z); return r > 0.42 && r < 0.6 && y > 0.95 ? new THREE.Color(0xffffff) : new THREE.Color(0x606976); });
    return (R.geo.bCap = keep(k.build()));
  }
  // Çürüme Kuyusu: a round cheese-slab plaza (floor mask) around the bubbling kefir spring (floor shader, walkable) with a golden rind
  // lip; a kefir moat all round with giant cheese, yogurt pots, bottles, berries and cereal rings in it (low on the camera side);
  // yogurt cliffs to the north with milk waterfalls pouring into the moat; the "Çürüme Kuyusu" sign beside the portal
  function dairyArena(L, B, V, T) {
    const { rnd, liqAt, nearLiq, cellOf, gapAt, capAt, taken, hill, RS, pick } = T, ar = V.arena, sp = V.spring, grid = L.grid;
    // the spring: a low raised golden rind rim with a scalloped foam collar, a glossy dome of kefir welling up and bobbing in the middle
    // with a little fountain (a pulsing jet with a foam crown; FX fizz, foam puffs and milk plops while Feza is near), bottle-cap
    // stepping stones round it on the cheese plaza, fizz rising, a warm light pool (all walkable, ≤ 0.3 m but the jet on its dome).
    // After the Kefir Devi cheered up (the portal is open) the fountain plays fully and a pastel rainbow stands over it
    if (sp) {
      dec(B, 'food', G.torus(TAU, 0.1, 48), mat4(sp.x, 0.03, sp.z, 0, sp.r + 0.08, sp.r + 0.08, 0.62, Math.PI / 2), lin(0x64434a));   // a golden rind rim (walkable)
      for (let i = 0, n = 26, a0 = rnd() * TAU; i < n; i++) {   // the foam collar hugging the rim's inner side (merged: no extra draw call)
        const a = a0 + (i + (rnd() - 0.5) * 0.4) / n * TAU, rr = 0.12 + rnd() * 0.08, d = sp.r - 0.1 + (rnd() - 0.5) * 0.06;
        dec(B, 'gloss', G.hemi(10), mat4(sp.x + Math.cos(a) * d, 0.005, sp.z + Math.sin(a) * d, rnd() * TAU, rr * 1.15, rr * 0.55, rr), lin(pick([0xffffff, 0x656f7d, 0x656f7d]), 1.04));
      }
      glowAt(B, sp.x, sp.z, sp.r + 3.2, 0x774f57, 0.15);   // a soft warm light pool on the plaza round the spring (baked)
      B.lights.push({ x: sp.x, y: 1.7, z: sp.z + 0.4, col: new THREE.Color(0x7a5059), int: 1.1, dist: 6.5, fl: 0, ph: 0 });   // …and a warm glow on whoever stands there
      const capG = bottleCapGeo(), CAPC = [0x505763, 0x714b53, 0x515964, 0x734c54, 0x64434b, 0x6f4a51];
      for (let i = 0, n = 8, a0 = rnd() * TAU; i < n; i++) {
        const a = a0 + i / n * TAU, x = sp.x + Math.cos(a) * (sp.r + 0.62), z = sp.z + Math.sin(a) * (sp.r + 0.62);
        if (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 2) continue;
        dec(B, 'gloss', capG, mat4(x, 0, z, rnd() * TAU, 0.3, 0.07, 0.3), lin(CAPC[i % CAPC.length]));
      }
      const domeG = R.geo.kefDome || (R.geo.kefDome = keep((() => { const k = new Kit(); k.add(new THREE.LatheGeometry(smoothProfile([[0.001, 0], [1.0, 0], [0.9, 0.3], [0.62, 0.7], [0.3, 0.93], [0.001, 1.0]], 8), 24), (x, y) => new THREE.Color(0x5f6875).lerp(new THREE.Color(0x66707f), Math.min(1, y * 1.3))); return k.build(); })()));   // ivory kefir, creamier at its foot
      const dome = new THREE.Mesh(domeG, R.mat.shiny); dome.position.set(sp.x, -0.02, sp.z); dome.scale.set(0.95, 0.3, 0.95); dome.receiveShadow = true; dome.name = 'kefir-dome';
      const jetG = R.geo.kefJet || (R.geo.kefJet = keep((() => { const k = new Kit(); k.add(new THREE.LatheGeometry(smoothProfile([[0.001, 0], [1.0, 0], [0.72, 0.12], [0.52, 0.4], [0.46, 0.8], [0.34, 0.96], [0.001, 1.0]], 10), 16), (x, y) => new THREE.Color(0x646e7c).lerp(new THREE.Color(0xffffff), Math.min(1, y * 1.6)).multiplyScalar(1.15)); return k.build(); })()));   // a creamy white column, flared foot, round top
      const jet = new THREE.Mesh(jetG, R.mat.shiny); jet.position.set(sp.x, 0.2, sp.z); jet.scale.set(0.2, 0.3, 0.2); jet.name = 'kefir-jet';   // the little fountain on top
      const crownG = R.geo.kefCrown || (R.geo.kefCrown = keep((() => {   // a foam crown riding the jet's top: three puffs round a middle one
        const k = new Kit();
        k.add(G.sphere(12, 8), new THREE.Color(1.15, 1.15, 1.15), [0, 0.04, 0], 0, [0.13, 0.11, 0.13]);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; k.add(G.sphere(10, 8), new THREE.Color(1.12, 1.1, 1.08), [Math.cos(a) * 0.12, -0.01 + 0.015 * i, Math.sin(a) * 0.12], 0, [0.1, 0.085, 0.1]); }
        return k.build();
      })()));
      const crown = new THREE.Mesh(crownG, R.mat.shiny); crown.position.set(sp.x, 0.5, sp.z); crown.name = 'kefir-crown'; crown.visible = false;
      B.g.add(dome); B.g.add(jet); B.g.add(crown);
      // the reward: a pastel rainbow over the spring, faded in once the portal is open (its own material: it fades on its own)
      const rbM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: true, side: THREE.DoubleSide });
      const rbG = rainbowGeo([{ x: sp.x, y: -0.1, z: sp.z - 0.35, r: sp.r + 0.45, bw: 0.62, lean: -0.32 }]);
      const rb = new THREE.Mesh(rbG, rbM); rb.name = 'spring-rainbow'; rb.visible = false; rb.renderOrder = 2;
      B.g.add(rb); B.dispose.push(rbG, rbM);
      const done = () => !!(L.portalObj && L.portalObj.active);   // (GAME opens the portal once the Kefir Devi cheered up)
      let jt = 0.5, ft = 3, pt = 1, full = 0;
      B.anim.push((dt, hx, hz) => {
        const t = TIME.t, b = Math.sin(t * 2.4);
        full = Math.min(1, Math.max(0, full + (done() ? dt * 0.6 : -dt * 2)));   // (before: the giant stands in the spring, the jet stays low)
        dome.scale.set(0.95 + 0.04 * Math.sin(t * 2.4 + 1.2), 0.34 + 0.06 * b, 0.95 + 0.04 * Math.sin(t * 2.4 + 2.3));
        const j = Math.abs(Math.sin(t * 3.1)) * 0.8 + 0.2 * Math.abs(Math.sin(t * 7.3)), j2 = 0.5 + 0.5 * Math.sin(t * 2.2) * Math.sin(t * 0.9 + 1.3);
        const jy = lerp(0.2 + 0.05 * b, 0.25 + 0.04 * b, full), sy = lerp(0.14 + 0.3 * j, 0.3 + 0.6 * j2 + 0.06 * j, full), sw = lerp(0.2 - 0.04 * j, 0.26 - 0.05 * j2, full);
        jet.position.y = jy; jet.scale.set(sw, sy, sw);
        crown.visible = full > 0.02;
        if (crown.visible) { const k = 0.4 + 0.6 * full; crown.position.y = jy + sy * 0.96; crown.scale.set(k * (1 + 0.1 * j), k * (1 - 0.08 * j), k * (1 + 0.1 * j)); crown.rotation.y = t * 0.8; }
        rb.visible = full > 0.01; rbM.opacity = 0.85 * smooth01(full) * (0.92 + 0.08 * Math.sin(t * 0.7));
        if (hyp(hx - sp.x, hz - sp.z) > 16 || typeof FX === 'undefined' || !FX.burst) return;
        if ((jt -= dt) <= 0) { jt = 0.6 + Math.random() * 0.4; FX.burst('fizz', sp.x + (Math.random() - 0.5) * 0.3, 0.22, sp.z + (Math.random() - 0.5) * 0.3, { count: 8 }); }
        if ((ft -= dt) <= 0) { ft = 3.5 + Math.random() * 2.5; FX.burst('foam', sp.x, 0.26, sp.z, { count: 3, scale: 0.6 }); }
        if ((pt -= dt) <= 0) {   // milk plops landing in the pool round the fountain
          pt = 0.7 + Math.random() * 0.4;
          const a = Math.random() * TAU, r = 0.55 + Math.random() * (sp.r - 0.95);
          FX.burst('milk', sp.x + Math.cos(a) * r, 0.03, sp.z + Math.sin(a) * r, { scale: 0.5, count: 5 });
        }
      });
      for (let n = 0; n < 46; n++) {
        const a = rnd() * TAU, r = Math.sqrt(rnd()) * sp.r * 0.9;
        B.pts.norm.push({ x: sp.x + Math.cos(a) * r, y: 0.03, z: sp.z + Math.sin(a) * r, kind: 10, ph: rnd(), size: 0.16 + rnd() * 0.14, prm: 0.3 + rnd() * 0.25, col: lin(pick([0xffffff, 0x646d7b, 0x656f7d]), 1.1) });
      }
      for (let n = 0; n < 10; n++) { const a = rnd() * TAU, r = rnd() * sp.r; B.pts.add.push({ x: sp.x + Math.cos(a) * r, y: 0.08, z: sp.z + Math.sin(a) * r, kind: 8, ph: rnd(), size: 0.16, prm: 0.4 + rnd() * 0.4, col: lin(0x616a78, 1.6) }); }
    }
    // a ring of piped cream rosettes with berries on the yogurt floor round the plaza, like the rim of a cake (tiny: walked over)
    RS.rosettes = 0;
    {
      const M = L._mask, R0 = ar.r * 0.5 + 1.25;
      const maskAt = (x, z, ch) => { const px = clamp(Math.floor(x * MPX), 0, M.W - 1), py = clamp(Math.floor(z * MPX), 0, M.H - 1); return M.data[(py * M.W + px) * 4 + ch] / 255; };
      for (let a = rnd() * 0.2, i = 0; a < TAU; a += 0.23, i++) {
        const x = ar.x + Math.cos(a) * R0, z = ar.z + Math.sin(a) * R0;
        if (!isFloor(L, x, z) || maskAt(x, z, 0) > 0.35 || (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 2.8) || linkDist(L, x, z) < 1.6) continue;
        if (i % 2 === 0) {   // a piped cream rosette (bright white / strawberry pink / lavender, glossy) with a berry on top
          dec(B, 'gloss', rosetteGeo(), mat4(x, -0.01, z, rnd() * TAU, 0.3, 0.28, 0.3), lin(pick([0xffffff, 0xffffff, 0x795058, 0x616b78])));
          dec(B, 'gloss', G.sphere(8, 6), mat4(x, 0.2 + 0.04, z, 0, 0.05, 0.045, 0.05), lin(pick([0x2e3239, 0x3e2c32, 0x443036])));
          RS.rosettes++;
        }
        else if (rnd() < 0.6) putD(B, blueberryData(0), mat4(x, -0.03, z, rnd() * TAU, 0.4));
        else putD(B, strawberryData(), mat4(x, 0.02, z, rnd() * TAU, 0.36, 0.36, 0.36, 0.5, 0.25));
      }
      // a few rainbow sprinkles scattered on the yogurt round the ring (no white; a light scatter, never a confetti carpet)
      const SPR = [0x5e3f47, 0x6e4951, 0x515863, 0x4d545f, 0x64434a, 0x624249];
      for (let n = 0; n < 80; n++) {
        const a = rnd() * TAU, r = R0 + (rnd() - 0.35) * 2.6, x = ar.x + Math.cos(a) * r, z = ar.z + Math.sin(a) * r;
        if (!isFloor(L, x, z) || maskAt(x, z, 0) > 0.4 || maskAt(x, z, 2) > 0.5) continue;
        dec(B, 'decor', G.octa(), mat4(x, 0.018, z, rnd() * TAU, 0.032, 0.022, 0.085), lin(pick(SPR)));   // (8 triangles each)
      }
    }
    // giant things in the moat (half sunk in the kefir), graded by how far south they stand
    const ring = [];
    const MOAT = ['cheese2', 'cheese2', 'pots1', 'bottles2', 'sberry', 'sberry', 'bberry1', 'bberry0', 'honey', 'gugum'].map(id => DPROP.find(p => p.id === id));
    for (let a = rnd() * 0.3; a < TAU; a += 0.36 + rnd() * 0.16) {
      const e = arenaEdge(L, ar, a, 6);
      if (!e) continue;
      const o = 1.3 + rnd() * 1.6, x = e.x + e.dx * o, z = e.z + e.dz * o, c = cellOf(x, z);
      if (c < 0 || grid[c] || liqAt(x, z) < 0.6 || linkDist(L, x, z) < 3.2 || ring.some(q => hyp(q[0] - x, q[1] - z) < 2.1) || (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 3.2)) continue;
      const P = MOAT[Math.floor(rnd() * MOAT.length)], cap = capAt(gapAt(x, z)) + 0.2 * 1;
      let s = 1.0 + rnd() * 0.45, sink = 0.12 + rnd() * 0.1;
      if ((P.h * s - sink) > cap) s = (cap + sink) / P.h;
      if (s < 0.55 || L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 3)) continue;
      ring.push([x, z]);
      putD(B, P.d(Math.floor(rnd() * 4)), mat4(x, -sink, z, rnd() * TAU, s));
      for (let m = 0; m < 3; m++) { const b = rnd() * TAU, r = P.r * s + 0.2 + rnd() * 0.3; B.pts.norm.push({ x: x + Math.cos(b) * r, y: 0.02, z: z + Math.sin(b) * r, kind: 10, ph: rnd(), size: 0.1 + rnd() * 0.06, prm: 0.25 + rnd() * 0.2, col: lin(0xffffff, 1.05) }); }
      RS.arena++;
    }
    // cereal rings bobbing round the moat
    for (let n = 0, tries = 0; n < 26 && tries < 600; tries++) {
      const a = rnd() * TAU, e = arenaEdge(L, ar, a, 6);
      if (!e) continue;
      const o = 0.9 + rnd() * 3.2, x = e.x + e.dx * o, z = e.z + e.dz * o;
      if (isFloor(L, x, z) || liqAt(x, z) < 0.9 || ring.some(q => hyp(q[0] - x, q[1] - z) < 1.3)) continue;
      const h = dec(B, 'decor', floatGeo(0), mat4(x, 0.025, z, rnd() * TAU, 0.24, 0.24, 0.24, Math.PI / 2 + (rnd() - 0.5) * 0.3), lin(pick(CEREAL_COL)));
      h.item.uy = rnd() * 60; n++; RS.floats++;
    }
    // yogurt cliffs north of the moat with little milk waterfalls
    B.falls = B.falls || [];
    const offs = [-0.95, -0.4, 0.4, 0.95];
    offs.splice(Math.floor(rnd() * 4), 1);
    for (const o of offs) {
      const a = -Math.PI / 2 + o, dx = Math.cos(a), dz = Math.sin(a);
      let r = ar.r * 0.8;
      while (r < ar.r + 12 && (V.dA ? V.dA[cellOf(ar.x + dx * r, ar.z + dz * r)] < 4.7 : r < ar.r + 4.7)) r += 0.25;
      const x = ar.x + dx * r, z = ar.z + dz * r;
      if (liqAt(x - dx * 0.6, z - dz * 0.6) < 0.5 || (L.exit && hyp(L.exit.x - x, L.exit.z - z) < 2.5)) continue;
      let h = 2.4 + rnd() * 0.7;
      while (h > 1.3 && hides(L, x, z, 0.7, 0, h + 0.5, 0.1)) h -= 0.3;
      if (h <= 1.3) continue;
      const yaw = Math.atan2(-dx, -dz), w = 1.3 + rnd() * 0.5, F = { x, z, yaw, h, w, ph: rnd() * 5 };
      B.falls.push(F);
      const mw = T.placeFallCliff(x, z, dx, dz, h, w);   // the cliff behind it, the jug or bottle pouring, the foam cushion and fizz at its foot
      if (mw) F.wt = mw * 1.15;
      RS.falls++;
    }
    // "Çürüme Kuyusu": a sign on the arena floor beside the portal, against the north rim (hides nothing)
    if (L.exit) for (const sd of rnd() < 0.5 ? [1, -1] : [-1, 1]) {
      let done = false;
      for (const off of [3.4, 3.9, 4.4, 3.0]) {
        const x0 = L.exit.x + sd * off;
        let z = L.exit.z + 1.2;
        while (z > L.exit.z - 4 && isFloor(L, x0, z - 1.2)) z -= 0.25;
        if (!isFloor(L, x0, z) || !gapOKL(L, x0, z, 0.8) || hiddenBehind(L, x0, z, 0.9, 2.1) > 0 || L.solids.some(q => hyp(q.x - x0, q.z - z) < q.r + 1) || linkDist(L, x0, z) < 2.4) continue;
        makeSign(L, B, x0, z, 'Çürüme Kuyusu', -sd * 0.18, true);
        done = true; break;
      }
      if (done) break;
    }
    // …the round rim usually has floor behind every spot (a sign there would hide it): then the sign stands just outside the floor,
    // on the bank of the moat north of the plaza (a decoration, no solid), facing the arena; in the kefir only if there is no bank
    if (L.exit && !B.signs.some(q => q.text === 'Çürüme Kuyusu')) {
      let best = null;
      for (const off of [3.2, 3.8, 4.5, 5.2, 6.0, 2.8]) for (const sd of [1, -1]) {
        const x0 = L.exit.x + sd * off;
        let z = L.exit.z + 1.5;
        while (z > L.exit.z - 6 && isFloor(L, x0, z)) z -= 0.2;
        if (isFloor(L, x0, z)) continue;
        z -= 0.45;
        if (isFloor(L, x0, z) || isFloor(L, x0 - 0.6, z) || isFloor(L, x0 + 0.6, z) || hiddenBehind(L, x0, z, 0.9, 2.1) > 0 || L.solids.some(q => hyp(q.x - x0, q.z - z) < q.r + 0.6) || hyp(L.exit.x - x0, L.exit.z - z) < 2.6) continue;
        const k = liqAt(x0, z) * 3 + off * 0.2;
        if (!best || k < best.k) best = { x: x0, z, sd, k };
      }
      if (best) makeSign(L, B, best.x, best.z, 'Çürüme Kuyusu', -best.sd * 0.18, false);
    }
  }
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  //  Veba Şehri (theme 'town', Feza's 6th chapter): the walled town below the dragon's castle on a golden afternoon. Cobbled streets,
  //  paved squares, a river and canals of clear blue water 0.8 m below the streets (their own mesh: the floor mesh stops at the stone
  //  quays), arched stone and wooden bridges; rows of colourful half-timbered houses facing the streets (shops with signs, shutters,
  //  flower boxes, chimneys), market stalls with striped awnings, a fountain, wells, carts, hay, benches, potted trees, lantern posts,
  //  bunting and crest banners (a smiling golden sun); the city walls with crenellations and round towers (tall to the north and the
  //  sides, none on the camera side), the dragon's castle far to the north and the boss arena İnfaz Meydanı with its Yemin Kapısı.
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  const WD = 0.8;   // the canals' water lies this far below the streets
  // Iso-lines of a lattice field (F[b·(FW+1)+a] at (o + a·s, o + b·s)) at level lv: oriented polylines of {x, z} with the side where
  // F < lv on their left, i.e. along (-dz, dx); a closed loop repeats its first point at the end
  const MS_SEG = { 1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]], 9: [[0, 2]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]] };
  function isoLines(F, FW, FH, s, lv, o = 0) {
    const W1 = FW + 1, starts = new Map(), segs = [];
    const val = (a, b) => F[b * W1 + a];
    const pt = (e) => { const [a, b, v] = e, f0 = val(a, b), f1 = v ? val(a, b + 1) : val(a + 1, b), t = clamp((lv - f0) / ((f1 - f0) || 1e-9), 0, 1); return v ? { x: o + a * s, z: o + (b + t) * s } : { x: o + (a + t) * s, z: o + b * s }; };
    for (let b = 0; b < FH; b++) for (let a = 0; a < FW; a++) {
      const v0 = val(a, b), v1 = val(a + 1, b), v2 = val(a + 1, b + 1), v3 = val(a, b + 1);
      const c = (v0 < lv ? 1 : 0) | (v1 < lv ? 2 : 0) | (v2 < lv ? 4 : 0) | (v3 < lv ? 8 : 0);
      if (c === 0 || c === 15) continue;
      const E = [[a, b, 0], [a + 1, b, 1], [a, b + 1, 0], [a, b, 1]], id = e => ((e[1] * W1 + e[0]) << 1) | e[2];   // edges: top, right, bottom, left
      const mid = (v0 + v1 + v2 + v3) / 4 < lv;
      const pairs = c === 5 ? (mid ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]]) : c === 10 ? (mid ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]]) : MS_SEG[c];
      for (const [e0, e1] of pairs) {
        let p = pt(E[e0]), q = pt(E[e1]), i0 = id(E[e0]), i1 = id(E[e1]);
        const dx = q.x - p.x, dz = q.z - p.z, l = hyp(dx, dz) || 1e-6;
        const u = clamp(((p.x + q.x) / 2 - o) / s - a, 0, 1), w = clamp(((p.z + q.z) / 2 - o) / s - b, 0, 1);   // F must fall to the left of its middle
        const gu = (v1 - v0) * (1 - w) + (v2 - v3) * w, gw = (v3 - v0) * (1 - u) + (v2 - v1) * u;   // (the bilinear gradient: a test point beside a
        if (gu * -dz + gw * dx > 0) { const t = p; p = q; q = t; const ti = i0; i0 = i1; i1 = ti; }   //  curved corner could fall on the wrong side)
        starts.set(i0, segs.length); segs.push({ p, q, i0, i1 });
      }
    }
    const inc = new Set(); for (const g of segs) inc.add(g.i1);
    const used = new Uint8Array(segs.length), out = [];
    const walk = k => { const pl = [segs[k].p]; while (k >= 0 && !used[k]) { used[k] = 1; pl.push(segs[k].q); const nk = starts.get(segs[k].i1); k = nk === undefined ? -1 : nk; } return pl; };
    for (let k = 0; k < segs.length; k++) if (!used[k] && !inc.has(segs[k].i0)) out.push(walk(k));   // open lines first (they end at the border)
    for (let k = 0; k < segs.length; k++) if (!used[k]) out.push(walk(k));
    return out;
  }
  // Chaikin corner cutting (ends kept; a closed loop stays closed) and resampling at a fixed spacing
  function chaikin(pts, it, closed) {
    let P = pts;
    for (let k = 0; k < it; k++) {
      const Q = closed ? [] : [P[0]], n = P.length - 1;
      for (let i = 0; i < n; i++) { const a = P[i], b = P[i + 1]; Q.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 }); }
      if (closed) Q.push(Q[0]); else Q.push(P[n]);
      P = Q;
    }
    return P;
  }
  function resample(pts, step) {
    const out = [{ x: pts[0].x, z: pts[0].z }];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = hyp(b.x - a.x, b.z - a.z);
      let t = step - carry;
      while (t <= l) { out.push({ x: a.x + (b.x - a.x) * t / l, z: a.z + (b.z - a.z) * t / l }); t += step; }
      carry = l - (t - step);
    }
    const e = pts[pts.length - 1], q = out[out.length - 1];
    if (hyp(e.x - q.x, e.z - q.z) > step * 0.3) out.push({ x: e.x, z: e.z });
    return out;
  }

  // ── Veba Şehri ground: the river and the canals (V.lava, 4 px/m, like the volcano's lava), bridges, the city walls' line ──
  // The river: one smooth band from the west edge to the east edge that crosses the main route once, at a corridor early on the
  // route running north-south (an arched stone bridge there), and keeps clear of every other floor (a cheapest path round the rooms,
  // shy of the floor's edge and of the arena). The canals: on the camera side of the floor (flat water hides nothing), 3.4–4.7 m wide,
  // a garden instead now and then, never round the arena (tents, stands). Shore: the smooth line of the dairy's milk (0.28 m+ off the
  // walkable cells); under a bridge the water comes straight to its deck edges (the quay walls there are the bridge's sides).
  // V.wflow (2 px/m): rg the current's direction, b its speed, a the water's depth factor (0 at the quays → 1 at 2.4 m from them).
  // V.outF (per cell): the meadow beyond the city walls (the walls run along its edge at 7–9 m from the floor), V.wallPts the wall line.
  function townField(L) {
    const P = MPX, W = L.W, H = L.H, MW = W * P, MH = H * P, n = MW * MH, grid = L.grid, seed = (L.seed & 0xffff) + 71, rnd = mulberry32(L.seed + 7101);
    const fl = new Uint8Array(n);
    for (let py = 0; py < MH; py++) { const row = ((py / P) | 0) * W, o = py * MW; for (let px = 0; px < MW; px++) fl[o + px] = grid[row + ((px / P) | 0)]; }
    const D = chamfer(MW, MH, fl, 1), dF = chamfer(W, H, grid, 1);   // mask pixels / cells to the nearest floor
    const up = new Float32Array(W * H), Uc = new Float32Array(W * H);   // metres to the floor straight north (this ground is on its camera side)
    for (let i = 0; i < W; i++) { let lf = -99; for (let j = 0; j < H; j++) { if (grid[j * W + i]) lf = j; up[j * W + i] = j - lf; } }
    for (let c = 0; c < W * H; c++) {   // (reaching round a floor edge sideways a little)
      const i = c % W;
      let u = Math.min(20, up[c]);
      for (let di = 1; di <= 2; di++) { if (i - di >= 0) u = Math.min(u, up[c - di] + 2.4 * di); if (i + di < W) u = Math.min(u, up[c + di] + 2.4 * di); }
      Uc[c] = u;
    }
    const ar = L.rooms.find(r => r.kind === 'boss' && !r.hw);
    let dA = null;
    if (ar) { const src = new Uint8Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) src[j * W + i] = grid[j * W + i] && inRoom(ar, i + 0.5, j + 0.5, -1.5) ? 1 : 0; dA = chamfer(W, H, src, 1); }
    const bil = (F, x, z) => {
      const fx = clamp(x - 0.5, 0, W - 1.001), fz = clamp(z - 0.5, 0, H - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * W + i;
      return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + W] * (1 - tx) + F[k + W + 1] * tx) * tz;
    };
    // smooth noises on a 0.5 m lattice (sampled bilinearly: the mask has 16 pixels per m²)
    const FP = 2, LW = W * FP, LH = H * FP, NL = (LW + 1) * (LH + 1), NWX = new Float32Array(NL), NWZ = new Float32Array(NL), NCW = new Float32Array(NL), NGD = new Float32Array(NL), NSH = new Float32Array(NL);
    for (let b = 0; b <= LH; b++) for (let a = 0; a <= LW; a++) {
      const k = b * (LW + 1) + a, x = a / FP, z = b / FP;
      NWX[k] = vnoise(x / 2.4, z / 2.4, seed + 5); NWZ[k] = vnoise(x / 2.4, z / 2.4, seed + 6); NCW[k] = vnoise(x / 13, z / 13, seed + 2);
      NGD[k] = vnoise(x / 10, z / 10, seed + 3); NSH[k] = vnoise(x / 2.6, z / 2.6, seed);
    }
    const lat = (F, x, z) => {
      const fx = clamp(x * FP, 0, LW - 0.001), fz = clamp(z * FP, 0, LH - 0.001), a = fx | 0, b = fz | 0, tx = fx - a, tz = fz - b, k = b * (LW + 1) + a;
      return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + LW + 1] * (1 - tx) + F[k + LW + 2] * tx) * tz;
    };
    // the river band
    const river = townRiver(L, dF, dA, rnd, seed), rv = new Float32Array(n);
    if (river) for (let i = 1; i < river.pts.length; i++) {
      const p0 = river.pts[i - 1], p1 = river.pts[i], hw = (p0.hw + p1.hw) / 2, e = hw + 0.5;
      const x0 = Math.max(0, Math.floor((Math.min(p0.x, p1.x) - e) * P)), x1 = Math.min(MW - 1, Math.ceil((Math.max(p0.x, p1.x) + e) * P));
      const y0 = Math.max(0, Math.floor((Math.min(p0.z, p1.z) - e) * P)), y1 = Math.min(MH - 1, Math.ceil((Math.max(p0.z, p1.z) + e) * P));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const k = py * MW + px, v = clamp(0.5 + (hw - segDist((px + 0.5) / P, (py + 0.5) / P, p0.x, p0.z, p1.x, p1.z)) / 0.3, 0, 1);
        if (v > rv[k]) rv[k] = v;
      }
    }
    // the shore follows the blurred floor coverage (soft curves, not the cells' staircase), as the dairy's milk does
    const flF = new Float32Array(n); for (let k = 0; k < n; k++) flF[k] = fl[k];
    let fb = boxBlur(flF, MW, MH, 4); fb = boxBlur(fb, MW, MH, 3);
    const raw = new Float32Array(n);
    for (let py = 0; py < MH; py++) for (let px = 0; px < MW; px++) {
      const k = py * MW + px;
      if (fl[k]) continue;
      const x = (px + 0.5) / P, z = (py + 0.5) / P, d = D[k] / P;
      const wa = 0.8 * smooth01((d - 0.4) / 1.6), u = bil(Uc, x + lat(NWX, x, z) * wa, z + lat(NWZ, x, z) * wa);
      let canal = 1 - smooth01((u - (3.4 + 1.3 * (lat(NCW, x, z) * 0.5 + 0.5))) / 0.8 + 0.5);   // camera side: 3.4–4.7 m of canal
      canal *= 1 - smooth01((lat(NGD, x, z) + 0.05) / 0.2);   // (a garden instead about half the time)
      if (dA) canal *= smooth01((bil(dA, x, z) - 6) / 1.5);   // round the arena: its tents and stands
      const w = Math.max(canal, rv[k]) * smooth01((Math.min(x, z, W - x, H - z) - 2) / 1.5);
      if (w <= 0) continue;
      const lvl = 0.2 + 0.06 * lat(NSH, x, z) + 0.03 * vnoise(x / 1.1, z / 1.1, seed + 7);
      raw[k] = w * smooth01((lvl - fb[k]) / 0.05 + 0.5) * smooth01((d - 0.2) / 0.12);   // (the blurred cover gives the smooth line; ≥ 0.2 m off the cells)
    }
    const liq = boxBlur(boxBlur(raw, MW, MH, 2), MW, MH, 1);   // (a soft round-off: beside a narrow street the shore would follow its cells' staircase)
    for (let k = 0; k < n; k++) if (fl[k] || D[k] < 0.6) liq[k] = 0;   // never on (or within 0.15 m of) walkable floor, even blurred
    {   // no thin slivers or tiny pools (squeezed between two streets they read as trenches): a patch of water stays only if some of it
        // lies ≥ 1.1 m from its shore (≥ 2.2 m across) and it covers ≥ 8 m² (the river always does)
      const wm = new Uint8Array(n); for (let k = 0; k < n; k++) wm[k] = liq[k] > 0.5 ? 1 : 0;
      const dq0 = chamfer(MW, MH, wm, 0), seen = new Uint8Array(n), q = new Int32Array(n);
      for (let k0 = 0; k0 < n; k0++) {
        if (!wm[k0] || seen[k0]) continue;
        let h = 0, t = 0, big = 0; q[t++] = k0; seen[k0] = 1;
        while (h < t) {
          const c = q[h++], i = c % MW;
          big = Math.max(big, dq0[c]);
          for (const m of [i > 0 ? c - 1 : -1, i < MW - 1 ? c + 1 : -1, c >= MW ? c - MW : -1, c < n - MW ? c + MW : -1]) if (m >= 0 && wm[m] && !seen[m]) { seen[m] = 1; q[t++] = m; }
        }
        if (big >= 1.1 * P && t >= 8 * P * P) continue;
        for (let a = 0; a < t; a++) { const c = q[a], i = c % MW, j = (c / MW) | 0; for (let b = -2; b <= 2; b++) for (let d = -2; d <= 2; d++) { const ii = i + d, jj = j + b; if (ii >= 0 && jj >= 0 && ii < MW && jj < MH) liq[jj * MW + ii] = 0; } }
      }
    }
    const V = L._town = { lava: liq, MW, MH, P, dA, arena: ar || null, bridges: [], river, fb };
    liquidBridges(L, V, 2.4);
    if (river && !V.bridges.some(b => b.pts.some(q => hyp(q.x - river.cross.x, q.z - river.cross.z) < 1.6))) {   // the river's crossing is always a bridge
      const l = L.links.find(k => k.curve && k.curve.some(q => hyp(q[0] - river.cross.x, q[1] - river.cross.z) < 0.4)), rp = river.pts;
      const rD = (x, z) => { let d = 1e9, hw = 2.2; for (let i = 1; i < rp.length; i++) { const e = segDist(x, z, rp[i - 1].x, rp[i - 1].z, rp[i].x, rp[i].z); if (e < d) { d = e; hw = rp[i].hw; } } return d - hw; };
      const edge = (x, z, nx, nz) => { for (let d = 0; d < 4.5; d += 0.1) if (!isFloor(L, x + nx * d, z + nz * d)) return d; return 4; };
      const run = { pts: [], main: !!(l && l.main) };
      if (l) for (let s = 0; s < l.curve.length; s += 2) {
        const c = l.curve, x = c[s][0], z = c[s][1], a = c[Math.max(0, s - 2)], b = c[Math.min(c.length - 1, s + 2)];
        if (rD(x, z) > 2.2 || !isFloor(L, x, z)) continue;   // (the whole stretch the river's banks touch)
        const dx = b[0] - a[0], dz = b[1] - a[1], ll = hyp(dx, dz) || 1, nx = -dz / ll, nz = dx / ll;
        run.pts.push({ x, z, nx, nz, e1: edge(x, z, nx, nz), e2: edge(x, z, -nx, -nz) });
      }
      if (run.pts.length >= 3) {
        for (let it = 0; it < 2; it++) { const e1 = run.pts.map(q => q.e1), e2 = run.pts.map(q => q.e2), n = e1.length; for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), c = Math.min(n - 1, i + 1); run.pts[i].e1 = (e1[a] + e1[i] * 2 + e1[c]) / 4; run.pts[i].e2 = (e2[a] + e2[i] * 2 + e2[c]) / 4; } }
        V.bridges.push(run);
      }
    }
    // under a bridge the water comes straight to the deck's edges (0.26 m past the walkable cells; its ends ease into the usual shore):
    // each side of the deck is one smooth line (the widest edge distance along the run: past every cell of the staircase), dry inside
    const liqS = (x, z) => liq[clamp(Math.floor(z * P), 0, MH - 1) * MW + clamp(Math.floor(x * P), 0, MW - 1)];
    for (const b of V.bridges) {
      const Q = b.pts, cum = [0];
      b.e1c = Math.max(...Q.map(q => q.e1)) + 0.05; b.e2c = Math.max(...Q.map(q => q.e2)) + 0.05;
      for (let i = 1; i < Q.length; i++) cum.push(cum[i - 1] + hyp(Q[i].x - Q[i - 1].x, Q[i].z - Q[i - 1].z));
      const tot = b.len = cum[cum.length - 1], em = Math.max(...Q.map(q => Math.max(q.e1, q.e2))) + 1.8;
      b.stone = !!river && Q.some(q => river.pts.some(r => hyp(r.x - q.x, r.z - q.z) < r.hw + 1.2)) || rnd() < 0.45;   // (the river's bridge is always stone)
      b.river = !!river && Q.some(q => hyp(q.x - river.cross.x, q.z - river.cross.z) < 3);
      const xs = Q.map(q => q.x), zs = Q.map(q => q.z);
      const x0 = Math.max(0, Math.floor((Math.min(...xs) - em) * P)), x1 = Math.min(MW - 1, Math.ceil((Math.max(...xs) + em) * P));
      const y0 = Math.max(0, Math.floor((Math.min(...zs) - em) * P)), y1 = Math.min(MH - 1, Math.ceil((Math.max(...zs) + em) * P));
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const k = py * MW + px;
        if (fl[k]) continue;
        const x = (px + 0.5) / P, z = (py + 0.5) / P;
        let best = null;
        for (let i = 1; i < Q.length; i++) {
          const a = Q[i - 1], c = Q[i], sx = c.x - a.x, sz = c.z - a.z, l2 = sx * sx + sz * sz || 1e-6, l = Math.sqrt(l2);
          let t = ((x - a.x) * sx + (z - a.z) * sz) / l2;
          if (t < 0 && i > 1) t = 0; if (t > 1 && i < Q.length - 1) t = 1;
          const la = ((x - a.x) * sz - (z - a.z) * sx) / l, dd = Math.abs(la) + Math.max(0, -t, t - 1) * l;
          if (best && dd >= best.dd) continue;
          best = { dd, la, along: cum[i - 1] + t * l, nx: sz / l, nz: -sx / l, e: (x - a.x) * a.nx + (z - a.z) * a.nz >= 0 ? b.e1c : b.e2c };
        }
        if (!best || Math.abs(best.la) > best.e + 1.6) continue;
        const sd = best.la >= 0 ? 1 : -1, taper = smooth01((Math.min(best.along, tot - best.along) + 0.3) / 0.5), wl = smooth01((Math.abs(best.la) - best.e - 0.26) / 0.06 + 0.5);
        if (best.along > 0.1 && best.along < tot - 0.1) liq[k] = Math.min(liq[k], wl);   // (the deck's margin beyond the cells stays dry)
        if (taper <= 0 || liqS(x + best.nx * sd * 1.1, z + best.nz * sd * 1.1) < 0.5) continue;
        liq[k] = Math.max(liq[k], wl * taper);
      }
    }
    // the water's depth factor (distance from the quays) and the current: along the river (west → east), along the canals elsewhere
    const wet = new Uint8Array(n); for (let k = 0; k < n; k++) wet[k] = liq[k] > 0.5 ? 1 : 0;
    const dq = chamfer(MW, MH, wet, 0);   // mask pixels to the nearest land
    const QW = W * 2, QH = H * 2, Fd = new Uint8Array(QW * QH * 4), rp = river ? river.pts : [];
    const dqAt = (px, py) => dq[clamp(py, 0, MH - 1) * MW + clamp(px, 0, MW - 1)];
    for (let qy = 0; qy < QH; qy++) for (let qx = 0; qx < QW; qx++) {
      const o = (qy * QW + qx) * 4, px = qx * 2 + 1, py = qy * 2 + 1, k = py * MW + px;
      if (liq[k] < 0.05) { Fd[o] = Fd[o + 1] = 128; continue; }
      const gx = dqAt(px + 2, py) - dqAt(px - 2, py), gz = dqAt(px, py + 2) - dqAt(px, py - 2), gl = hyp(gx, gz);
      let fx = gl > 1e-3 ? -gz / gl : 1, fz = gl > 1e-3 ? gx / gl : 0;
      if (fx < 0) { fx = -fx; fz = -fz; }
      const r = rv[k];
      if (r > 0.1 && rp.length > 1) {
        const x = (px + 0.5) / P, z = (py + 0.5) / P;
        let bi = 1, bd = 1e9;
        for (let i = 1; i < rp.length; i++) { const d = segDist(x, z, rp[i - 1].x, rp[i - 1].z, rp[i].x, rp[i].z); if (d < bd) { bd = d; bi = i; } }
        const tx = rp[bi].x - rp[bi - 1].x, tz = rp[bi].z - rp[bi - 1].z, tl = hyp(tx, tz) || 1;
        fx = lerp(fx, tx / tl, r); fz = lerp(fz, tz / tl, r);
        const fl2 = hyp(fx, fz) || 1; fx /= fl2; fz /= fl2;
      }
      Fd[o] = Math.round((fx * 0.5 + 0.5) * 255); Fd[o + 1] = Math.round((fz * 0.5 + 0.5) * 255);
      Fd[o + 2] = Math.round(lerp(0.3, 0.85, r) * 255); Fd[o + 3] = Math.round(clamp(dq[k] / P / 2.4, 0, 1) * 255);
    }
    V.wflow = { data: Fd, W: QW, H: QH };
    // the city walls: along the edge of the ground 7–9 m or more from the floor that reaches the map's border (the meadow outside);
    // north of the arena they close in on its rim (1.3 m off it: İnfaz Meydanı lies against the wall, the castle gate in it)
    const out = new Uint8Array(W * H), q = [];
    const arN = c => (ar ? smooth01((ar.z - ar.r * 0.2 - ((c / W) | 0) - 0.5) / 3.5) * (1 - smooth01((dA[c] - 6) / 3)) : 0);
    const far = c => dF[c] >= lerp(7.2 + 1.8 * (vnoise((c % W) / 19, ((c / W) | 0) / 19, seed + 9) * 0.5 + 0.5), 1.3, arN(c));
    for (let c = 0; c < W * H; c++) { const i = c % W, j = (c / W) | 0; if ((i === 0 || j === 0 || i === W - 1 || j === H - 1) && far(c)) { out[c] = 1; q.push(c); } }
    while (q.length) {
      const c = q.pop(), i = c % W;
      for (const m of [i > 0 ? c - 1 : -1, i < W - 1 ? c + 1 : -1, c >= W ? c - W : -1, c < W * (H - 1) ? c + W : -1]) if (m >= 0 && !out[m] && far(m)) { out[m] = 1; q.push(m); }
    }
    const of = new Float32Array(W * H); for (let c = 0; c < W * H; c++) of[c] = out[c];
    const outF = V.outF = boxBlur(boxBlur(of, W, H, 1), W, H, 1);
    const LF = new Float32Array((W + 1) * (H + 1));   // lattice at the cell centres
    for (let b = 0; b <= H; b++) for (let a = 0; a <= W; a++) LF[b * (W + 1) + a] = outF[Math.min(H - 1, b) * W + Math.min(W - 1, a)];
    const loops = isoLines(LF, W, H, 1, 0.5, 0.5).filter(l => l.length > 20).sort((p1, p2) => p2.length - p1.length);
    if (loops.length) { const lp = loops[0], cl = hyp(lp[0].x - lp[lp.length - 1].x, lp[0].z - lp[lp.length - 1].z) < 0.01; V.wallPts = resample(chaikin(lp, 2, cl), 1); V.wallClosed = cl; }
    return V;
  }
  // The river's course (see townField): a cheapest path (8-neighbour Dijkstra over the cells) from the crossing to either side of
  // the map, then smoothed. → { pts: [{x, z, hw}] west → east, cross: {x, z} } or null (no corridor to cross)
  function townRiver(L, dF, dA, rnd, seed) {
    const W = L.W, H = L.H, grid = L.grid, N = L.Z.rooms;
    let pick = null;
    for (const l of L.links) {
      if (!l.main || !l.curve || l.b > N - 2) continue;
      const A = L.rooms[l.a], Bb = L.rooms[l.b], c = l.curve, out = [];
      for (let i = 0; i < c.length; i++) if (!inRoom(A, c[i][0], c[i][1], -0.6) && !inRoom(Bb, c[i][0], c[i][1], -0.6)) out.push(i);
      if (out.length < 7) continue;   // (≥ 2.5 m of corridor between the rooms)
      const i = out[out.length >> 1], a = c[Math.max(0, i - 4)], b = c[Math.min(c.length - 1, i + 4)], dx = b[0] - a[0], dz = b[1] - a[1], len = hyp(dx, dz) || 1;
      if (Math.abs(dz) / len < 0.42) continue;   // it runs north(-east / -west)-south: the river crosses it east-west
      const sc = Math.abs(l.a - (N - 1) * 0.3) - out.length * 0.22 + rnd() * 1.2;   // (early on the route, a long crossing)
      if (!pick || sc < pick.sc) pick = { x: c[i][0], z: c[i][1], sc };
    }
    if (!pick) return null;
    const cost = new Float32Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const c = j * W + i;
      if (grid[c]) { cost[c] = hyp(i + 0.5 - pick.x, j + 0.5 - pick.z) < 2.8 ? 1 : 0; continue; }   // (0 = blocked: it crosses no floor but the bridge's)
      cost[c] = 1 + Math.max(0, 3 - dF[c]) + (dA && dA[c] < 9 ? 25 : 0);
    }
    const dist = new Float64Array(W * H).fill(1e9), prev = new Int32Array(W * H).fill(-1), heap = [];   // (64-bit: a float32 dist re-queued nodes endlessly)
    const push = (d, c) => { heap.push([d, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], e = heap.pop(); if (heap.length) { heap[0] = e; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    const c0 = Math.floor(pick.z) * W + Math.floor(pick.x);
    dist[c0] = 0; push(0, c0);
    while (heap.length) {
      const [d, c] = pop();
      if (d > dist[c]) continue;
      const i = c % W, j = (c / W) | 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
        if (!a && !b) continue;
        const ii = i + a, jj = j + b;
        if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
        const m = jj * W + ii;
        if (!cost[m] || (a && b && (!cost[j * W + ii] || !cost[jj * W + i]))) continue;
        const nd = d + cost[m] * (a && b ? Math.SQRT2 : 1);
        if (nd < dist[m]) { dist[m] = nd; prev[m] = c; push(nd, m); }
      }
    }
    const side = i => { let bc = -1; for (let j = 1; j < H - 1; j++) { const c = j * W + i; if (dist[c] < 1e9 && (bc < 0 || dist[c] < dist[bc])) bc = c; } return bc; };
    const trace = c => { const o = []; while (c >= 0) { o.push({ x: c % W + 0.5, z: ((c / W) | 0) + 0.5 }); c = prev[c]; } return o; };   // (edge → crossing)
    const cw = side(0), ce = side(W - 1);
    if (cw < 0 || ce < 0) return null;
    const pw = trace(cw), pe = trace(ce).reverse();
    const raw = pw.concat(pe.slice(1));
    raw.unshift({ x: raw[0].x - 3, z: raw[0].z }); raw.push({ x: raw[raw.length - 1].x + 3, z: raw[raw.length - 1].z });   // (on past the map's edges)
    const pts = resample(chaikin(raw, 3, false), 0.6);
    let s = 0;
    pts.forEach((p, i) => { if (i) s += hyp(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.hw = 2.2 + 0.5 * vnoise(s / 12, 1.7, seed + 21); });
    return { pts, cross: { x: pick.x, z: pick.z } };
  }
  // The water level field on the 0.5 m lattice (the floor mesh and the quays are cut along its 0.5 line)
  function townLattice(L) {
    const V = L._town;
    if (V.lat) return V.lat;
    const FW = L.W * 2, FH = L.H * 2, W1 = FW + 1, F = new Float32Array(W1 * (FH + 1)), P = V.P;
    for (let b = 0; b <= FH; b++) for (let a = 0; a <= FW; a++) {   // bilinear, like the GPU samples the mask (pixel centres at (i + 0.5) / 4)
      const fx = clamp(a * 0.5 * P - 0.5, 0, V.MW - 1.001), fz = clamp(b * 0.5 * P - 0.5, 0, V.MH - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * V.MW + i;
      F[b * W1 + a] = (V.lava[k] * (1 - tx) + V.lava[k + 1] * tx) * (1 - tz) + (V.lava[k + V.MW] * (1 - tx) + V.lava[k + V.MW + 1] * tx) * tz;
    }
    return (V.lat = { F, FW, FH, s: 0.5 });
  }
  // The town's floor: the ground where the water is < 0.5 (marching squares on the 0.5 m lattice; whole dry cells merged into row
  // runs), plus a 14 m border round the map like the other themes' plane
  function townFloorGeo(L) {
    const { F, FW, FH, s } = townLattice(L), W1 = FW + 1, pos = [];
    const tri = (a, b, c) => { const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z); if (ny < 0) { const t = b; b = c; c = t; } pos.push(a.x, 0, a.z, b.x, 0, b.z, c.x, 0, c.z); };
    const quad = (x0, z0, x1, z1) => { tri({ x: x0, z: z0 }, { x: x0, z: z1 }, { x: x1, z: z0 }); tri({ x: x1, z: z0 }, { x: x0, z: z1 }, { x: x1, z: z1 }); };
    for (let b = 0; b < FH; b++) {
      let run = -1;
      for (let a = 0; a <= FW; a++) {
        let full = false, c = 0, v = null;
        if (a < FW) { v = [F[b * W1 + a], F[b * W1 + a + 1], F[(b + 1) * W1 + a + 1], F[(b + 1) * W1 + a]]; c = (v[0] < 0.5 ? 1 : 0) | (v[1] < 0.5 ? 2 : 0) | (v[2] < 0.5 ? 4 : 0) | (v[3] < 0.5 ? 8 : 0); full = c === 15; }
        if (full) { if (run < 0) run = a; continue; }
        if (run >= 0) { quad(run * s, b * s, a * s, (b + 1) * s); run = -1; }
        if (!c) continue;
        // a mixed cell: its dry part (corners below 0.5 + the crossings, going round; saddles split unless the middle is dry)
        const C = [{ x: a * s, z: b * s }, { x: (a + 1) * s, z: b * s }, { x: (a + 1) * s, z: (b + 1) * s }, { x: a * s, z: (b + 1) * s }];
        const X = k => { const k2 = (k + 1) & 3, t = clamp((0.5 - v[k]) / ((v[k2] - v[k]) || 1e-9), 0, 1); return { x: lerp(C[k].x, C[k2].x, t), z: lerp(C[k].z, C[k2].z, t) }; };
        const mid = (v[0] + v[1] + v[2] + v[3]) / 4 < 0.5;
        const polys = [];
        if ((c === 5 || c === 10) && !mid) { const k0 = c === 5 ? 0 : 1; for (const k of [k0, k0 + 2]) polys.push([C[k], X(k), X((k + 3) & 3)]); }
        else { const pl = []; for (let k = 0; k < 4; k++) { if (v[k] < 0.5) pl.push(C[k]); if ((v[k] < 0.5) !== (v[(k + 1) & 3] < 0.5)) pl.push(X(k)); } polys.push(pl); }
        for (const pl of polys) for (let k = 1; k + 1 < pl.length; k++) tri(pl[0], pl[k], pl[k + 1]);
      }
    }
    const Wm = L.W, Hm = L.H, e = 14;
    quad(-e, -e, 0, Hm + e); quad(Wm, -e, Wm + e, Hm + e); quad(0, -e, Wm, 0); quad(0, Hm, Wm, Hm + e);
    const g = new THREE.BufferGeometry(), nor = new Float32Array(pos.length);
    for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  // Clear blue water (lit PBR, very smooth): shallow turquoise over a pebbly bed at the quays, clear blue in mid-stream, a flowing
  // two-phase ripple normal from TEX.noise (along V.wflow's current), a caustic light net in the shallows, a soft foam line at the
  // walls, a sky sheen at grazing angles and little sun glints twinkling on the ripples (they bloom). uFix: a still basin (the fountain).
  function waterMat(fix) {
    const key = fix ? 'waterF' : 'water';
    if (R.mat[key]) return R.mat[key];
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0 });
    const U = m.userData.u = { uTime: TIME.u, tNoise: { value: texOK() && TEX.noise ? TEX.noise : blackTex() }, tFlow: { value: blackTex() }, uMaskInv: { value: new THREE.Vector2(1, 1) },
      uDeep: { value: lin(0x414536) }, uShal: { value: lin(0x79705b) }, uBed: { value: lin(0x8b785b) }, uFix: { value: fix ? 1 : 0 } };
    lvShade(m, {
      key: 'water',
      uniforms: U,
      vDecl: 'varying vec3 vLvW;',
      vBegin: 'vLvW = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      fDecl: `uniform sampler2D tNoise, tFlow; uniform vec2 uMaskInv; uniform vec3 uDeep, uShal, uBed; uniform float uTime, uFix; varying vec3 vLvW;
        ${GLSL_NOISE}`,
      fMap: `vec2 lvXZ = vLvW.xz;
        vec4 lvFw = texture2D(tFlow, lvXZ * uMaskInv);
        float lvDep = mix(lvFw.a, 0.5, uFix);                              // 0 at the quay walls → 1 in mid-stream
        vec2 lvFd = (lvFw.rg * 2.0 - 1.0) * lvFw.b * (1.0 - uFix);         // the current: direction × speed
        float lvT = uTime * 0.14 + (texture2D(tNoise, lvXZ * 0.021).r - 0.5) * 0.8;
        float lvP0 = fract(lvT), lvP1 = fract(lvT + 0.5), lvW0 = 1.0 - abs(1.0 - 2.0 * lvP0);
        vec2 lvU = lvXZ * 0.2, lvF = lvFd * 1.25;
        vec2 lvA0 = lvU - lvF * lvP0, lvA1 = lvU - lvF * lvP1 + vec2(0.43, 0.27);
        vec4 lvN = mix(texture2D(tNoise, lvA1), texture2D(tNoise, lvA0), lvW0);
        vec4 lvM = mix(texture2D(tNoise, lvA1 * 2.7 + vec2(0.71, 0.13)), texture2D(tNoise, lvA0 * 2.7 + vec2(0.17, 0.61)), lvW0);
        vec2 lvS = (lvN.gb - 0.5) * 0.8 + (lvM.gr - 0.5) * 0.9;           // ripple slopes (x, z)
        lvS += 0.07 * vec2(sin(lvXZ.x * 3.3 + lvXZ.y * 1.2 - uTime * 2.1 + lvN.r * 5.0), sin(lvXZ.y * 2.9 - lvXZ.x * 0.8 - uTime * 1.8 + lvM.b * 5.0));
        vec3 lvCol = mix(uShal, uDeep, smoothstep(0.08, 0.9, lvDep));
        float lvPb = texture2D(tNoise, lvXZ * 0.45 + lvS * 0.05).b;        // the pebbly bed, wobbling under the ripples
        float lvSh = 1.0 - smoothstep(0.0, 0.42, lvDep);
        lvCol = mix(lvCol, uBed * (0.62 + 0.55 * lvPb), lvSh * 0.4);
        float lvCa = texture2D(tNoise, lvXZ * 0.16 + lvS * 0.04 + vec2(uTime * 0.013, -uTime * 0.009)).a;   // a caustic net over the shallows
        float lvCb = texture2D(tNoise, lvXZ * 0.23 - lvS * 0.03 + vec2(-uTime * 0.011, uTime * 0.015)).a;
        float lvCn = (1.0 - smoothstep(0.0, 0.035, abs(lvCa - 0.5))) + (1.0 - smoothstep(0.0, 0.03, abs(lvCb - 0.5)));
        lvCol += vec3(0.22, 0.26, 0.2) * lvCn * (0.35 + 0.65 * lvSh) * (1.0 - uFix * 0.5);
        float lvFo = (1.0 - smoothstep(0.02, 0.1, lvDep)) * (1.0 - uFix) * smoothstep(0.35, 0.7, lvN.r + lvM.g * 0.5);   // a broken foam line at the walls
        lvCol = mix(lvCol, vec3(0.92, 0.97, 1.0), lvFo * 0.6);
        diffuseColor.rgb = lvCol;`,
      fNormal: `vec3 lvWn = normalize(vec3(-lvS.x * 0.5, 1.0, -lvS.y * 0.5));
        normal = normalize((viewMatrix * vec4(lvWn, 0.0)).xyz);`,
      fOut: `float lvFr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);
        outgoingLight += vec3(0.5, 0.66, 0.84) * lvFr * 0.45;           // the pale sky at grazing angles
        vec2 lvGp = lvXZ * 4.2 + lvS * 1.6, lvGi = floor(lvGp); float lvGh = lvH21(lvGi);
        vec2 lvGo = fract(lvGp) - 0.5 - (vec2(lvH21(lvGi + 3.1), lvH21(lvGi + 7.7)) - 0.5) * 0.6;
        float lvTw = pow(max(0.0, sin(uTime * (1.3 + lvGh * 2.2) + lvGh * 40.0)), 14.0);
        float lvGl = step(0.74, lvGh) * smoothstep(0.09, 0.0, length(lvGo * vec2(1.0, 1.6))) * lvTw * smoothstep(0.08, 0.4, lvDep);
        outgoingLight += vec3(1.7, 1.6, 1.35) * lvGl;                    // sun glints twinkling on the ripples`,
    });
    return (R.mat[key] = keep(m));
  }
  // Stone quays along every shore: a rounded coping stone on the edge of the street (a little over the water) and the wall face
  // going down into the water, a wet darker band at the water line (on the bridges these walls are their sides). One geometry per
  // ~12 m piece of shore, merged into the decor chunks ('ramp': the sandstone rampart blocks, triplanar)
  const QUAY = [[-0.17, 0.0, 1], [-0.12, 0.105, 1], [0.1, 0.105, 1], [0.155, 0.03, 0.97], [0.11, -0.05, 0.86], [0.1, -0.4, 0.8], [0.1, -WD + 0.12, 0.74], [0.1, -WD + 0.02, 0.5], [0.1, -WD - 0.35, 0.32]];   // (offset out, y, brightness)
  function townQuays(L, B) {
    const { F, FW, FH, s } = townLattice(L), lines = isoLines(F, FW, FH, s, 0.5), V = L._town, RS = L.townDecor;
    const kerb = new THREE.Color(0x616a78), face = new THREE.Color(0x58606c), wetC = new THREE.Color(0x464c57);
    const bridgeAt = (x, z) => { for (const b of V.bridges) for (const q of b.pts) if (hyp(q.x - x, q.z - z) < Math.max(q.e1, q.e2) + 0.9) return b; return null; };
    let segsN = 0;
    for (const line of lines) {
      // simplify (the lattice gives ~0.5 m steps on smooth curves): drop points that stay within 3 cm of the chord
      let pl = [line[0]];
      for (let i = 1; i < line.length - 1; i++) {
        const a = pl[pl.length - 1], c = line[i + 1], p = line[i];
        if (hyp(p.x - a.x, p.z - a.z) > 0.8 || segDist(p.x, p.z, a.x, a.z, c.x, c.z) > 0.03) pl.push(p);
      }
      pl.push(line[line.length - 1]);
      if (pl.length < 2) continue;
      const closed = hyp(pl[0].x - pl[pl.length - 1].x, pl[0].z - pl[pl.length - 1].z) < 1e-3;
      if (pl.length > 3) pl = chaikin(pl, 1, closed);   // (a softer line: the lattice's corners; the coping still covers the floor's cut)
      const nrm = pl.map((p, i) => {   // toward the water: right of the line (the land lies to its left)
        const a = pl[i > 0 ? i - 1 : closed ? pl.length - 2 : 0], c = pl[i < pl.length - 1 ? i + 1 : closed ? 1 : i];
        const dx = c.x - a.x, dz = c.z - a.z, l = hyp(dx, dz) || 1;
        return { x: dz / l, z: -dx / l };
      });
      for (let i0 = 0, i1 = 0; i0 < pl.length - 1; i0 = i1) {   // pieces of ≤ 6 m (a chunk's bounds stay tight: better culling)
        for (let run = 0; i1 < pl.length - 1 && (i1 === i0 || run < 6); i1++) run += hyp(pl[i1 + 1].x - pl[i1].x, pl[i1 + 1].z - pl[i1].z);
        const ox = pl[i0].x, oz = pl[i0].z, np = QUAY.length, pos = [], nor = [], col = [], idx = [];
        for (let i = i0; i <= i1; i++) {
          const p = pl[i], nn = nrm[i], br = bridgeAt(p.x, p.z);
          for (let k = 0; k < np; k++) {
            const [o, y, bri] = QUAY[k], a = QUAY[Math.max(0, k - 1)], c = QUAY[Math.min(np - 1, k + 1)];
            let pnx = c[1] - a[1], pny = -(c[0] - a[0]); const pln = hyp(pnx, pny) || 1; pnx /= pln; pny /= pln;   // the profile's normal (out, up)
            if (pny < 0 && k < 3) { pnx = -pnx; pny = -pny; }
            pos.push(p.x - ox + nn.x * o, y, p.z - oz + nn.z * o);
            nor.push(nn.x * pnx, pny, nn.z * pnx);
            const cc = (k < 4 ? kerb : face).clone().multiplyScalar(bri);
            if (k >= 6) cc.lerp(wetC.clone().multiplyScalar(bri), 0.55);   // the wet band at the water line
            if (br && k >= 4) cc.multiplyScalar(0.92);
            col.push(cc.r, cc.g, cc.b);
          }
          if (i > i0) { const b0 = (i - i0 - 1) * np, b1 = b0 + np; for (let k = 0; k < np - 1; k++) idx.push(b0 + k, b1 + k, b0 + k + 1, b1 + k, b1 + k + 1, b0 + k + 1); segsN++; }   // (facing the water / up)
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        B.tmpGeo.push(g);
        dec(B, 'ramp', g, mat4(ox, 0, oz), null);
      }
    }
    RS.quaySegs = segsN;
  }
  // Roof tiles in any colour: a grey copy of TEX.roof (same pattern and relief) the town's roofs tint per house (kept)
  function neutralRoof() {
    if (R.tex.roofN) return R.tex.roofN;
    const src = surf('roof').map, im = src && src.image, d = im && im.data;
    if (!d || !d.length || !im.width) return src;
    const n = im.width * im.height, out = new Uint8Array(n * 4);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += d[i * 4] * 0.3 + d[i * 4 + 1] * 0.55 + d[i * 4 + 2] * 0.15;
    const k = 212 / Math.max(1, sum / n);
    for (let i = 0; i < n; i++) { const v = Math.min(255, (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.55 + d[i * 4 + 2] * 0.15) * k); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(out, im.width, im.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = ANISO; t.needsUpdate = true;
    return (R.tex.roofN = keep(t));
  }
  // ── Veba Şehri: the houses ──
  const TPL = [0x636d7a, 0x7d525b, 0x5f6875, 0x5d6673, 0x5e6774, 0x5d6673, 0x5f6875, 0x656f7d];   // plaster: cream, pink, butter, mint, sky, peach, lavender, white
  const TRF = [0x553a41, 0x4c353b, 0x604148, 0x52383f, 0x40454f, 0x40454f, 0x553a41, 0x543a41];   // roof tiles: mostly warm, some blue, teal, plum
  const TAC = [0x3d424b, 0x3c414a, 0x4c353b, 0x62424a, 0x50373e, 0x414750, 0x604148];              // doors, shutters, awnings, sign rims
  const TSTONE = 0x5e6774, TGLASS = 0x525a66, TFRAME = 0x656e7c, TTIMBER = 0x39292f;
  // Heaped blossoms and leaves for a window box (local: the box's top centre, 0.7 m wide)
  function flowerBoxGeo(v) { const key='tFlBox'+v;if(R.geo[key])return R.geo[key];const k=new Kit();for(let i=0;i<4;i++)k.add(flowerGeo((i+v)%7),0xffffff,[(i-1.5)*0.18,0,0],0,1.2);return (R.geo[key]=keep(k.build()));
  }
  // Shop-sign pictures (local: centred, ≈0.35 m, facing +z): 0 a simit (the bakery) · 1 a davul drum · 2 an apple · 3 a flower ·
  // 4 a loaf · 5 a boot
  function shopIconGeo(v) {
    const key='tIcon'+v;if(R.geo[key])return R.geo[key];const k=new Kit(),iron=0x65584b,bone=0xaf9977,blood=0x964b3c;
    if(v%3===0){k.add(G.octa(),bone,[0,0,0],0,[.18,.22,.06]);for(const x of [-.06,.06])k.add(G.box(),0x352a24,[x,.04,.062],0,[.048,.023,.014]);k.add(G.box(),blood,[0,-.09,.063],0,[.026,.07,.014]);}
    else if(v%3===1){k.add(G.torus(TAU,.16,10),iron,[0,0,0],0,[.19,.23,.19]);k.add(G.box(),blood,[0,0,.035],0,[.05,.32,.02]);for(const x of [-.08,.08])k.add(G.box(),iron,[x,-.2,0],0,[.03,.16,.03]);}
    else{k.seg([-.13,-.18,0],[.13,.18,0],.024,bone,.024,6);k.seg([.13,-.18,.01],[-.13,.18,.01],.024,bone,.024,6);k.add(G.box(),iron,[0,.23,0],0,[.32,.07,.05]);}
    return(R.geo[key]=keep(k.build()));
  }
  // A house's measures (see townHouse): wall top, ridge, roof rise / half span, the top storey's middle and size
  function houseDims(h) {
    const j = h.st > 1 ? 0.16 : 0, top = 0.34 + 2.25 + (h.st > 1 ? 0.14 + 2.0 : 0), W2 = h.w + 2 * j, D2 = h.d + j, zc = (j - h.d) / 2;
    const alongX = !h.gable, span = alongX ? D2 : W2, hs = span / 2 + 0.34, rh = clamp(span * 0.54, 1.5, 2.9);
    return { j, top, W2, D2, zc, alongX, span, hs, rh, yr: top + (span / 2) * (rh / hs) };
  }
  // Roof height over a local point of the house (for the camera test)
  const houseHt = (D, lx, lz) => Math.max(D.top, D.yr - (D.alongX ? Math.abs(lz - D.zc) : Math.abs(lx)) / D.hs * D.rh);
  // Where the chimney stands (local), k: 0 on the back slope (its side from the seed) · 1 the back, the other side · 2 / 3 the same on
  // the front slope; its cap's top is at D.yr + 0.66 (townHouses picks the first k whose chimney hides no floor, h.chim; -1 none)
  const chimAt = (D, h, k) => { const sd = (h.seed % 2 ? 1 : -1) * (k & 1 ? -1 : 1), bk = k < 2 ? -1 : 1;
    return D.alongX ? { cx: sd * D.W2 * 0.27, cz: D.zc + bk * D.hs * 0.38 } : { cx: sd * D.hs * 0.42, cz: D.zc + bk * D.D2 * 0.22 }; };
  // A half-timbered town house (local frame: the front's centre on the ground, the front facing +z, the body behind it to z = -d):
  // a sandstone plinth, a plastered ground storey, often an upper storey jettied out over the street, a steep tiled roof (eaves or
  // a gable to the street) with a round ridge, a chimney (some smoke), an arched door with a step, windows with white frames, open
  // painted shutters and flower boxes, now and then a shop (sign, striped awning, a warm window) or a wall lantern.
  // h: {x, z, yaw, w, d, st, gable, door, pl, rf, ac, shop, lamp, smoke, seed}; merged into the decor chunks
  function townHouse(B, h) {
    const M = mat4(h.x, 0, h.z, h.yaw), rnd = mulberry32(h.seed), D = houseDims(h);
    const P = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
    const w = h.w, d = h.d, j = D.j, base = 0.34, h1 = 2.25, top = D.top;
    const pl = lin(TPL[h.pl]), ac = lin(TAC[h.ac]), rf = lin(TRF[h.rf]), stone = lin(TSTONE), timber = lin(TTIMBER), glass = lin(TGLASS), frame = lin(TFRAME);
    P('ramp', G.box(), mat4(0, base / 2, -d / 2, 0, w + 0.16, base, d + 0.16), stone);
    P('plaster', G.box(), mat4(0, base + h1 / 2, -d / 2, 0, w, h1, d), pl);
    if (h.st > 1) {
      P('prop', G.box(), mat4(0, base + h1 + 0.07, D.zc, 0, D.W2 + 0.06, 0.14, D.D2 + 0.06), timber);   // the beam under the jetty
      P('plaster', G.box(), mat4(0, base + h1 + 0.14 + 1.0, D.zc, 0, D.W2, 2.0, D.D2), pl.clone().multiplyScalar(0.985));
    }
    // the roof: two tiled slabs, a round ridge, the plastered gables with a beam across
    const len = (D.alongX ? D.W2 : D.D2) + 0.5, th = Math.atan2(D.rh, D.hs), sl = Math.hypot(D.hs, D.rh), yc = D.yr - D.rh / 2 + 0.07;
    const slab = boxUV(len, 0.15, sl, 2); B.tmpGeo.push(slab);
    for (const sd of [-1, 1]) {
      if (D.alongX) P('roofN', slab, mat4(0, yc, D.zc + sd * D.hs / 2, 0, 1, 1, 1, sd * th, 0), rf);
      else P('roofN', slab, mat4(sd * D.hs / 2, yc, D.zc, Math.PI / 2, 1, 1, 1, sd * th, 0), rf);
    }
    const rdg = rf.clone().multiplyScalar(0.8);
    P('roofN', G.cyl(1, 1, 8), D.alongX ? mat4(0, D.yr + 0.08, D.zc, 0, 0.13, len + 0.06, 0.13, 0, Math.PI / 2) : mat4(0, D.yr + 0.08, D.zc, 0, 0.13, len + 0.06, 0.13, Math.PI / 2), rdg);
    const gg = gableGeo(D.span, D.yr - top); B.tmpGeo.push(gg);
    for (const sd of [-1, 1]) {
      if (D.alongX) { P('plaster', gg, mat4(sd * D.W2 / 2, top, D.zc, sd * Math.PI / 2), pl); P('prop', G.box(), mat4(sd * (D.W2 / 2 + 0.03), top + 0.05, D.zc, 0, 0.08, 0.1, D.D2 + 0.1), timber); }
      else { P('plaster', gg, mat4(0, top, D.zc + sd * D.D2 / 2, sd > 0 ? 0 : Math.PI), pl); P('prop', G.box(), mat4(0, top + 0.05, D.zc + sd * (D.D2 / 2 + 0.03), 0, D.W2 + 0.1, 0.1, 0.08), timber); }
    }
    if (!D.alongX) {   // a round window high in the street gable, a little timber cross
      const gy = top + (D.yr - top) * 0.4, gz = j + 0.03;
      P('shiny', G.cyl(1, 1, 16), mat4(0, gy, gz, 0, 0.3, 0.05, 0.3, Math.PI / 2), frame);
      P(h.seed % 3 ? 'shiny' : 'window', G.cyl(1, 1, 16), mat4(0, gy, gz + 0.02, 0, 0.23, 0.05, 0.23, Math.PI / 2), h.seed % 3 ? glass : lin(0x626b79));
      for (const r of [0, Math.PI / 2]) P('shiny', G.box(), mat4(0, gy, gz + 0.05, 0, 0.46, 0.03, 0.03, 0, r), frame);
    }
    // chimney (on the back slope, else where it hides nothing: see chimAt), smoke now and then
    if ((h.chim ?? 0) >= 0) {
      const { cx, cz } = chimAt(D, h, h.chim ?? 0), ch = D.yr + 0.55 - top;
      P('ramp', G.box(), mat4(cx, top + ch / 2, cz, 0, 0.5, ch, 0.5), lin(0x59616d));
      P('ramp', G.box(), mat4(cx, top + ch + 0.05, cz, 0, 0.64, 0.12, 0.64), lin(0x535a66));
      if (h.smoke) { const p = new THREE.Vector3(cx, top + ch + 0.15, cz).applyMatrix4(M); for (let n = 0; n < 5; n++) B.pts.norm.push({ x: p.x, y: p.y, z: p.z, kind: 7, ph: n / 5 + rnd() * 0.05, size: 0.5, prm: 0.15, col: lin(0x646e7b, 0.95) }); }
    }
    // a window: white frame and cross, glass (or a warm lit pane), open painted shutters, often a flower box
    const win = (px, py, pz, ry, s, lit, box) => {
      const Wm = new THREE.Matrix4().multiplyMatrices(M, mat4(px, py, pz, ry)), Q = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(Wm, m), col);
      Q(lit ? 'window' : 'shiny', G.box(), mat4(0, 0, 0.015, 0, 0.56 * s, 0.7 * s, 0.03), lit ? lin(0x626c7a) : glass);
      for (const [ox, oy, sx, sy] of [[0, 0.38, 0.7, 0.07], [0, -0.38, 0.74, 0.08], [0.31, 0, 0.07, 0.76], [-0.31, 0, 0.07, 0.76], [0, 0.05, 0.56, 0.035], [0, 0, 0.035, 0.7]])
        Q('shiny', G.box(), mat4(ox * s, oy * s, 0.045, 0, sx * s, sy * s, 0.04), frame);
      for (const sd of [-1, 1]) {
        Q('shiny', G.box(), mat4(sd * 0.49 * s, 0, 0.08, -sd * 0.25, 0.27 * s, 0.72 * s, 0.03), ac);
        Q('decor', G.box(), mat4(sd * 0.49 * s, 0.14 * s, 0.1, -sd * 0.25, 0.16 * s, 0.03, 0.01), ac.clone().multiplyScalar(0.7));   // a shutter slat line
      }
      if (box) { Q('prop', G.box(), mat4(0, -0.47 * s, 0.12, 0, 0.74 * s, 0.14, 0.22), lin(0x573b42)); Q('decor', flowerBoxGeo((h.seed + Math.round(px * 7)) & 3), mat4(0, -0.4 * s, 0.12, 0, s), null); }
    };
    // windows over the front, the sides and the upper storey
    const up = h.st > 1, yU = base + h1 + 0.14 + 1.05, yG = base + 1.3;
    const slots = (x0, x1, avoid) => {   // window centres across [x0, x1] (≥ 1.45 m apart), not over [avoid ± 0.95]
      const o = [], n = Math.max(1, Math.floor((x1 - x0) / 1.45));
      for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / n; if (avoid === null || Math.abs(x - avoid) > 1.12) o.push(x); }
      return o;
    };
    const shopX = h.shop >= 0 ? (h.door > 0 ? -1 : 1) * Math.min(w / 2 - 0.9, 1.05) : null;
    for (const x of slots(-w / 2 + 0.1, w / 2 - 0.1, h.door)) if (shopX === null || Math.abs(x - shopX) > 0.9) win(x, yG, 0, 0, 0.95, (h.seed >> 2) % 5 === 0, rnd() < 0.6);
    if (up) for (const x of slots(-D.W2 / 2 + 0.1, D.W2 / 2 - 0.1, null)) win(x, yU, j, 0, 0.92, (h.seed >> 3) % 6 === 0, rnd() < 0.75);
    for (const sd of [-1, 1]) {   // the sides (the one facing the camera shows)
      if (d >= 3.2) win(sd * w / 2, yG, -d * 0.5, sd * Math.PI / 2, 0.85, false, rnd() < 0.4);
      if (up && D.D2 >= 3.2) win(sd * D.W2 / 2, yU, D.zc, sd * Math.PI / 2, 0.85, false, rnd() < 0.5);
    }
    // the door: a stone frame with an arched top, the painted leaf with boards, a golden knob, a step
    const dx = h.door;
    P('ramp', G.box(), mat4(dx, base + 0.6, 0.02, 0, 1.16, 1.2, 0.05), stone);
    P('ramp', halfCyl(), mat4(dx, base + 1.2, 0.02, Math.PI / 2, 0.58, 0.05, 0.58, 0, Math.PI / 2), stone);
    P('shiny', G.box(), mat4(dx, base + 0.6, 0.05, 0, 0.9, 1.2, 0.05), ac);
    P('shiny', halfCyl(), mat4(dx, base + 1.2, 0.05, Math.PI / 2, 0.45, 0.05, 0.45, 0, Math.PI / 2), ac);
    for (const ox of [-0.22, 0, 0.22]) P('decor', G.box(), mat4(dx + ox, base + 0.72, 0.078, 0, 0.018, 1.36 - Math.abs(ox) * 0.9, 0.01), ac.clone().multiplyScalar(0.72));
    P('shiny', G.sphere(8, 6), mat4(dx + 0.3, base + 0.66, 0.09, 0, 0.045), lin(0x6f4951));
    P('ramp', G.rbox(), mat4(dx, 0.07, 0.2, 0, 1.2, 0.14, 0.42), stone);
    // a shop: a big warm window with a striped awning over it, the sign board above the door (and hanging from a bracket when the
    // house faces east or west: then the camera sees it from the side). A front the camera looks at gets a bigger board standing
    // out in front of the eave on two iron struts (flat on the wall the eave hid it from the gameplay camera; h.fb, see townHouses).
    if (shopX !== null) {
      const sx = shopX;
      P('window', G.box(), mat4(sx, base + 0.9, 0.02, 0, 1.12, 0.9, 0.03), lin(0x626c7a));
      for (const [ox, oy, a, b] of [[0, 0.47, 1.26, 0.08], [0, -0.47, 1.3, 0.1], [0.6, 0, 0.08, 1.0], [-0.6, 0, 0.08, 1.0], [0, 0, 0.04, 0.9]]) P('shiny', G.box(), mat4(sx + ox, base + 0.9 + oy, 0.05, 0, a, b, 0.05), frame);
      const n = 6, aw = 1.5, ay = base + 1.55;
      for (let i = 0; i < n; i++) P('decor', G.box(), mat4(sx + (i + 0.5 - n / 2) * aw / n, ay, 0.34, 0, aw / n + 0.005, 0.03, 0.7, 0.55), i % 2 ? lin(0x656f7d) : ac);   // stripes
      for (let i = 0; i < n; i++) P('decor', halfCyl(), mat4(sx + (i + 0.5 - n / 2) * aw / n, ay - 0.2, 0.64, Math.PI / 2, aw / n / 2, 0.02, aw / n / 2, 0, -Math.PI / 2), i % 2 ? lin(0x656f7d) : ac);   // scalloped hem
      const fb = Math.abs(Math.sin(h.yaw)) <= 0.6 && h.fb !== false, bk = fb ? 1.3 : 1, by = base + (fb ? 2.16 : 2.0), bz = fb ? 0.55 : 0.05;
      P('prop', G.box(), mat4(dx, by, bz, 0, 0.72 * bk, 0.4 * bk, 0.05), lin(0x636c7a));
      for (const [ox, oy, a, b] of [[0, 0.21, 0.78, 0.05], [0, -0.21, 0.78, 0.05], [0.38, 0, 0.05, 0.46], [-0.38, 0, 0.05, 0.46]]) P('shiny', G.box(), mat4(dx + ox * bk, by + oy * bk, bz + 0.02, 0, a * bk, b * bk, 0.04), ac);
      P('shiny', shopIconGeo(h.shop), mat4(dx, by, bz + 0.02, 0, 0.8 * bk), null);
      if (fb) for (const sd of [-1, 1]) {   // (from the wall below the eave up to its bottom corners: they pass under the eave's edge)
        const x = dx + sd * 0.36 * bk, y0 = base + 1.6, y1 = by - 0.2 * bk, z1 = bz - 0.02, ln = Math.hypot(y1 - y0, z1 - 0.05);
        P('prop', MK(G.box()), mat4(x, (y0 + y1) / 2, (0.05 + z1) / 2, 0, 0.03, 0.03, ln, -Math.atan2(y1 - y0, z1 - 0.05)), lin(0x24262c));
      }
      if (Math.abs(Math.sin(h.yaw)) > 0.6 && h.hang !== false) {   // the hanging sign (not where it would hide the street: h.hang, see townHouses)
        const hx = dx + (h.door > 0 ? 1 : -1) * 0.2, hy = base + h1 + 0.02;
        P('prop', MK(G.box()), mat4(hx, hy + 0.25, 0.45, 0, 0.04, 0.04, 0.9), lin(0x24262c));
        P('prop', MK(G.box()), mat4(hx, hy + 0.1, 0.12, 0, 0.03, 0.3, 0.03, 0.8), lin(0x24262c));
        P('prop', G.box(), mat4(hx, hy - 0.08, 0.55, Math.PI / 2, 0.6, 0.46, 0.05), lin(0x636c7a));
        for (const sd of [-1, 1]) P('shiny', shopIconGeo(h.shop), mat4(hx + sd * 0.03, hy - 0.08, 0.55, sd * Math.PI / 2, 0.85), null);
      }
    }
    // a wall lantern beside the door (it lights the street: one of the 4 pooled lights near Feza)
    if (h.lamp) {
      const lx = dx + (dx > 0 || h.shop >= 0 ? -1 : 1) * 0.78, ly = base + 1.72;
      P('prop', MK(G.box()), mat4(lx, ly + 0.12, 0.14, 0, 0.04, 0.04, 0.26), lin(0x23252b));
      P('window', G.box(), mat4(lx, ly - 0.08, 0.27, 0, 0.17, 0.24, 0.17), lin(0xffffff));
      P('prop', MK(G.cone(4)), mat4(lx, ly + 0.1, 0.27, Math.PI / 4, 0.17, 0.14, 0.17), lin(0x23252b));
      const p = new THREE.Vector3(lx, ly, 0.6).applyMatrix4(M), g = new THREE.Vector3(lx, 0, 1.3).applyMatrix4(M);
      B.lights.push({ x: p.x, y: p.y, z: p.z, col: new THREE.Color(0x704b53), int: 2.2, dist: 6, fl: 0.25, ph: rnd() * 9 });
      glowAt(B, g.x, g.z, 2.0, 0x6f4a51, 0.18);
    }
  }
  // Rows of houses facing the streets and squares: along the floor's edge (a line just off the floor cells, on the 0.5 m lattice)
  // one after another, each front set back just enough to clear the cells' staircase, never on floor, water, outside the city walls
  // or over anything taken; as tall as the camera rule allows (2 storeys, else 1, else none: the camera side keeps its canals and
  // gardens). Then a back row between them and the walls (each facing the nearest floor; mostly roofs from the camera).
  function townHouses(L, B, T) {
    const { rnd, dF, cellOf, liqAt, outAt, occAt, occRect, RS, reserve } = T, W = L.W, H = L.H, grid = L.grid;
    const path = L.path, pathD = (x, z) => { let d = 1e9; for (let s = 1; s < path.length; s++) d = Math.min(d, segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z)); return d; };
    const wl = (yaw, lx, lz, fx, fz) => ({ x: fx + Math.cos(yaw) * lx + Math.sin(yaw) * lz, z: fz - Math.sin(yaw) * lx + Math.cos(yaw) * lz });
    // does a house (front centre f, yaw, width w, depth d incl. the jetty) fit: no floor, water, outside, nothing taken under it
    const fits = (fx, fz, yaw, w, d, jet) => {
      for (let lz = jet; lz >= -d - 0.1; lz -= 0.25) for (let lx = -w / 2 - 0.1; lx <= w / 2 + 0.1 + 1e-6; lx += (w + 0.2) / Math.ceil((w + 0.2) / 0.25)) {
        const p = wl(yaw, lx, lz, fx, fz), c = cellOf(p.x, p.z);
        if (c < 0 || grid[c] || liqAt(p.x, p.z) > 0.12 || outAt(p.x, p.z) > 0.35 || occAt(p.x, p.z) || reserve(p.x, p.z)) return false;
      }
      return true;
    };
    const frontClear = (fx, fz, yaw, w) => {
      for (const lz of [0.22, 0.05, -0.2]) for (let lx = -w / 2 - 0.1; lx <= w / 2 + 0.1 + 1e-6; lx += (w + 0.2) / Math.ceil((w + 0.2) / 0.25)) {
        const p = wl(yaw, lx, lz, fx, fz), c = cellOf(p.x, p.z);
        if (c < 0 || grid[c]) return false;
      }
      return true;
    };
    // would its roof hide walkable floor from the gameplay camera? (each spot of the roof, its own height; at the back out to its
    // overhang: a back row house's high gable end over a street behind it)
    const hidesH = (fx, fz, yaw, h, D) => {
      const z0 = D.j, z1 = -h.d - (D.alongX ? 0.34 : 0.25);
      for (let lz = z0; lz >= z1 - 1e-6; lz -= (z0 - z1) / Math.ceil((z0 - z1) / 0.5)) for (let lx = -D.W2 / 2; lx <= D.W2 / 2 + 1e-6; lx += D.W2 / Math.ceil(D.W2 / 0.5)) {
        const p = wl(yaw, lx, lz, fx, fz), hh = houseHt(D, lx, lz) + 0.1;
        if (satCount(L, p.x - 0.25, p.z - (hh - 0.5) * LV_PK + 0.3, p.x + 0.25, p.z - 0.2) > 0) return true;
      }
      return false;
    };
    // …and its chimney (0.64 m cap, top at D.yr + 0.66, higher than the ridge): the first spot of chimAt that hides nothing, else none
    const chimK = (fx, fz, yaw, h, D) => {
      for (let k = 0; k < 4; k++) {
        const c = chimAt(D, h, k), p = wl(yaw, c.cx, c.cz, fx, fz);
        if (!satCount(L, p.x - 0.32, p.z - (D.yr + 0.76 - 0.5) * LV_PK + 0.3, p.x + 0.32, p.z - 0.2)) return k;
      }
      return -1;
    };
    let lastPl = -1, lastRf = -1;
    const colours = h => {
      do h.pl = Math.floor(rnd() * TPL.length); while (h.pl === lastPl);
      do h.rf = Math.floor(rnd() * TRF.length); while (h.rf === lastRf);
      h.ac = Math.floor(rnd() * TAC.length); lastPl = h.pl; lastRf = h.rf;
    };
    // try a house of width w, depth up to dMax at the front centre f: 2 storeys, else 1; → the house or null. Never one facing north
    // (it would stand on the camera side of its street: that side keeps its canals and gardens)
    const tryHouse = (fx, fz, yaw, w, dMax, front) => {
      if (Math.cos(yaw) < -0.45) return null;
      let d = dMax;
      while (d >= 2.9 && !fits(fx, fz, yaw, w, d, 0.2)) d -= 0.5;
      if (d < 2.9) return null;
      const h = { x: fx, z: fz, yaw, w, d, st: 2, gable: rnd() < 0.42, seed: 1 + Math.floor(rnd() * 1e6) };
      for (const st of rnd() < 0.8 ? [2, 1] : [1]) {
        h.st = st;
        let D = houseDims(h);
        if (hidesH(fx, fz, yaw, h, D) && h.gable) { h.gable = false; D = houseDims(h); }   // (eaves to the street: a lower roof over the front)
        if (!hidesH(fx, fz, yaw, h, D)) {
          h.chim = chimK(fx, fz, yaw, h, D);
          colours(h);
          h.door = clamp((rnd() - 0.5) * (w - 2.2), -w / 2 + 1.0, w / 2 - 1.0);
          h.front = front; h.pd = pathD(fx, fz); h.shop = -1; h.lamp = false;
          h.smoke = rnd() < 0.3;
          occRect(fx, fz, yaw, w + 0.2, h.d + 0.1, 0.2 + D.j);
          T.houses.push(h);
          return h;
        }
      }
      return null;
    };
    // the front rows: along every edge loop (the land lies to the left of each)
    const FW = W * 2, FH = H * 2, W1 = FW + 1, cov = new Float32Array(W1 * (FH + 1));
    const gc = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : grid[j * W + i]);
    for (let b = 0; b <= FH; b++) for (let a = 0; a <= FW; a++) {
      const x = a * 0.5 - 0.5, z = b * 0.5 - 0.5, i = Math.floor(x), j = Math.floor(z), tx = x - i, tz = z - j;
      cov[b * W1 + a] = (gc(i, j) * (1 - tx) + gc(i + 1, j) * tx) * (1 - tz) + (gc(i, j + 1) * (1 - tx) + gc(i + 1, j + 1) * tx) * tz;
    }
    const loops = T.edgeLoops = isoLines(cov, FW, FH, 0.5, 0.45, 0).map(l => resample(l, 0.25)).filter(l => l.length > 24);   // (0.45: no lattice value sits on the level)
    for (const pts of loops) {
      const n = pts.length, at = s => { const f = clamp(s / 0.25, 0, n - 1.001), i = Math.floor(f), t = f - i; return { x: lerp(pts[i].x, pts[i + 1].x, t), z: lerp(pts[i].z, pts[i + 1].z, t), i }; };
      const tot = (n - 1) * 0.25;
      let s = rnd() * 1.2;
      while (s < tot - 3) {
        let h = null, used = 0;
        for (const wk of [1, 0.72]) {   // (a narrower house where the wide one doesn't fit)
          const w = (3.3 + rnd() * 1.9) * wk, A = at(s), Bq = at(s + w), tx = Bq.x - A.x, tz = Bq.z - A.z, cl = hyp(tx, tz);
          if (w < 2.8 || cl < w * 0.86) continue;   // (a tight corner)
          const ux = tx / cl, uz = tz / cl, nx = -uz, nz = ux;   // along the front · into the land
          let bulge = -9;
          for (let i = A.i; i <= Bq.i + 1 && i < n; i++) bulge = Math.max(bulge, (pts[i].x - A.x) * nx + (pts[i].z - A.z) * nz);
          if (bulge > 1.3) continue;
          const yaw = Math.atan2(-nx, -nz), mx = (A.x + Bq.x) / 2, mz = (A.z + Bq.z) / 2;
          // the least setback whose front strip clears every floor cell (the cells' staircase runs off the smooth edge line)
          let o = Math.max(0, bulge) + 0.25, okF = false;
          for (; o < Math.max(0, bulge) + 1.5 && !okF; o += 0.15) okF = frontClear(mx + nx * o, mz + nz * o, yaw, cl);
          if (!okF) continue;
          h = tryHouse(mx + nx * (o - 0.15), mz + nz * (o - 0.15), yaw, cl, 4.2 + rnd() * 2.2, true);
          if (h) { used = w; break; }
        }
        if (h) { RS.houses++; s += used + 0.22 + (rnd() < 0.25 ? 0.6 + rnd() * 0.8 : rnd() * 0.15); } else s += 0.5;
      }
    }
    // the back row: roofs between the front houses and the city walls, each facing the nearest floor
    for (let t = 0, made = 0, want = Math.round(RS.houses * 1.1); t < 6000 && made < want; t++) {
      const x = 1 + rnd() * (W - 2), z = 1 + rnd() * (H - 2), c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] < 3.2 || dF[c] > 12 || outAt(x, z) > 0.2 || occAt(x, z)) continue;
      const gx = dF[c + 1] - dF[c - 1], gz = dF[c + W] - dF[c - W], gl = hyp(gx, gz);
      if (gl < 0.3) continue;
      const yaw = Math.atan2(-gx / gl, -gz / gl) + (rnd() - 0.5) * 0.3, w = 3.6 + rnd() * 1.6;
      if (tryHouse(x + Math.sin(yaw) * 2.4, z + Math.cos(yaw) * 2.4, yaw, w, 4 + rnd() * 1.6, false)) { made++; RS.back++; }
    }
    // the shops: the two front houses nearest the route become the simit bakery and the drum shop, a few more near it sell fruit,
    // flowers, bread or shoes; wall lanterns on some fronts along the route; then everything is built
    const fr = T.houses.filter(h => h.front && h.w >= 3.5).sort((a, b) => a.pd - b.pd);
    fr.forEach((h, i) => { if (i < 2) h.shop = i; else if (h.pd < 9 && rnd() < 0.3) h.shop = 2 + Math.floor(rnd() * 4); if (h.shop >= 0) { RS.shops++; h.door = (h.door >= 0 ? 1 : -1) * (h.w / 2 - 0.95); } });   // (a shop's door to one side, its window to the other)
    // (a wall lantern or a shop's hanging sign sticks out over the street: not where it would hide Feza on the street behind it)
    const outHides = (h, lx, lz, top) => { const p = wl(h.yaw, lx, lz, h.x, h.z); return satCount(L, p.x - 0.5, p.z - 0.3 - (top - 0.5) * LV_PK, p.x + 0.5, p.z - 0.3) > 0; };
    for (const h of T.houses) {
      h.lamp = h.front && h.pd < 8.5 && rnd() < 0.42 && !outHides(h, h.door + (h.door > 0 || h.shop >= 0 ? -1 : 1) * 0.78, 0.27, 2.36); if (h.lamp) RS.lamps++;
      if (h.shop >= 0) { h.hang = !outHides(h, h.door + (h.door > 0 ? 1 : -1) * 0.2, 0.55, 2.95); h.fb = !outHides(h, h.door, 0.55, 2.84); }
      townHouse(B, h); if (h.shop >= 0 && h.shop < 2) RS['shop' + h.shop] = { x: +(h.x + Math.sin(h.yaw) * 3).toFixed(1), z: +(h.z + Math.cos(h.yaw) * 3).toFixed(1) }; }
  }
  // Bridges: stone (the river's always) — humped sandstone parapets with a pale coping along both deck edges (lower on the camera
  // side), square end posts with a stone ball, lanterns on the river bridge — or wooden: plank decking laid over the street, railings
  // on posts, piles standing in the water. Every post and rail stands on the deck's dry margin, never on walkable cells.
  function townBridges(L, B, T) {
    const { rnd, V, liqAt, occDisc, RS } = T;
    for (const b of V.bridges) {
      const P = b.pts, n = P.length, cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + hyp(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z));
      const tot = cum[n - 1] || 1;
      for (const sd of [1, -1]) {
        const e = (sd > 0 ? b.e1c : b.e2c) || 1.8, side = [];
        for (let i = 0; i < n; i++) { const q = P[i], nx = q.nx * sd, nz = q.nz * sd; side.push({ x: q.x + nx * (e + 0.2), z: q.z + nz * (e + 0.2), nx, nz, t: cum[i] / tot }); }
        // (extend the ends a little so the parapet meets the quays)
        for (const [k, k2] of [[0, 1], [n - 1, n - 2]]) { const a = side[k], c = side[k2], dx = a.x - c.x, dz = a.z - c.z, l = hyp(dx, dz) || 1; side[k] = Object.assign({}, a, { x: a.x + dx / l * 0.35, z: a.z + dz / l * 0.35 }); }
        const south = side.some(q => q.nz > 0.4);   // this parapet lies between the camera and the deck (anywhere along a curved bridge)
        for (const q of side) occDisc(q.x, q.z, 0.5);
        if (b.stone) {
          const hp = t => (south ? 0.4 + 0.12 * Math.sin(Math.PI * t) : 0.56 + 0.34 * Math.sin(Math.PI * t));
          for (let i = 1; i < n; i++) {
            const a = side[i - 1], c = side[i], l = hyp(c.x - a.x, c.z - a.z), ya = Math.atan2(c.x - a.x, c.z - a.z), h = hp((a.t + c.t) / 2), mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2;
            dec(B, 'ramp', G.box(), mat4(mx, h / 2, mz, ya, 0.34, h, l + 0.06), lin(pick3(rnd, 0x5c6571, 0x58606d, 0x5e6875)));
            dec(B, 'ramp', G.rbox(), mat4(mx, h + 0.05, mz, ya, 0.44, 0.12, l + 0.1), lin(0x636d7a));   // the coping
          }
          for (const k of [0, n - 1]) {   // end posts: a square pillar, a cap, a stone ball (a lantern on the river's bridge); a low one
            // with just its cap where floor lies right behind it (camera rule)
            const q = side[k], low = satCount(L, q.x - 0.45, q.z - 0.3 - (hp(q.t) + 0.36) * LV_PK, q.x + 0.45, q.z - 0.3) > 0, h = hp(q.t) + (low ? 0.08 : 0.36);
            dec(B, 'ramp', G.box(), mat4(q.x, h / 2, q.z, Math.atan2(q.nx, q.nz), 0.56, h, 0.56), lin(0x5b6370));
            dec(B, 'ramp', G.rbox(), mat4(q.x, h + 0.06, q.z, Math.atan2(q.nx, q.nz), 0.68, 0.14, 0.68), lin(0x636d7a));
            if (low) continue;
            if (b.river && !satCount(L, q.x - 0.5, q.z - 0.3 - (h + 1.0 - 0.5) * LV_PK, q.x + 0.5, q.z - 0.3)) {   // (where the lantern hides no floor behind it)
              dec(B, 'prop', MK(G.cyl(1, 1, 8)), mat4(q.x, h + 0.35, q.z, 0, 0.04, 0.5, 0.04), lin(0x23252b));
              dec(B, 'window', G.box(), mat4(q.x, h + 0.72, q.z, 0.4, 0.24, 0.3, 0.24), lin(0xffffff));
              dec(B, 'prop', MK(G.cone(4)), mat4(q.x, h + 0.93, q.z, Math.PI / 4 + 0.4, 0.2, 0.15, 0.2), lin(0x23252b));
              B.lights.push({ x: q.x, y: h + 0.75, z: q.z, col: new THREE.Color(0x704b53), int: 2.6, dist: 7, fl: 0.2, ph: rnd() * 9 });
              glowAt(B, q.x - q.nx * 0.8, q.z - q.nz * 0.8, 2.4, 0x6f4a51, 0.22);
            } else dec(B, 'ramp', G.sphere(12, 8), mat4(q.x, h + 0.3, q.z, 0, 0.2), lin(0x646d7b));
          }
        } else {
          const hp = south ? 0.55 : 0.85;
          let last = null;
          for (let i = 0; i < n; i++) {   // posts ~1.1 m apart, two rails, a pile in the water under every other post
            if (i % 2 && i !== n - 1) continue;
            const q = side[i], end = i === 0 || i === n - 1;
            dec(B, 'prop', G.box(), mat4(q.x, (hp + (end ? 0.2 : 0.06)) / 2, q.z, Math.atan2(q.nx, q.nz), 0.13, hp + (end ? 0.2 : 0.06), 0.13), lin(0x5d3f46));
            if (end) dec(B, 'prop', G.cone(4), mat4(q.x, hp + 0.3, q.z, Math.PI / 4, 0.1, 0.14, 0.1), lin(0x553a41));
            const px = q.x + q.nx * 0.12, pz = q.z + q.nz * 0.12;
            if (liqAt(px, pz) > 0.5 || liqAt(px + q.nx * 0.3, pz + q.nz * 0.3) > 0.5) dec(B, 'prop', G.cyl(1, 1, 8), mat4(px, -0.45, pz, rnd(), 0.1, 1.0, 0.1), lin(0x493339));
            if (last) { const l = hyp(q.x - last.x, q.z - last.z), ya = Math.atan2(q.x - last.x, q.z - last.z); for (const y of [hp * 0.45, hp - 0.04]) dec(B, 'prop', G.box(), mat4((q.x + last.x) / 2, y, (q.z + last.z) / 2, ya, 0.06, 0.09, l), lin(0x64434b)); }
            last = q;
          }
        }
      }
      if (!b.stone) for (let s = 0.17; s < tot; s += 0.36) {   // plank decking across the deck, a little proud of the cobbles
        let i = 1; while (i < n - 1 && cum[i] < s) i++;
        const a = P[i - 1], c = P[i], t = clamp((s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), 0, 1), x = lerp(a.x, c.x, t), z = lerp(a.z, c.z, t);
        const cx = x + a.nx * (b.e1c - b.e2c) / 2, cz = z + a.nz * (b.e1c - b.e2c) / 2, w = b.e1c + b.e2c + 0.5;
        dec(B, 'prop', G.box(), mat4(cx, 0.012, cz, Math.atan2(a.nx, a.nz), 0.32, 0.024, w), lin(pick3(rnd, 0x58616d, 0x704a52, 0x5c6572)));
      }
      for (const q of P) { const c = T.cellOf(q.x, q.z); if (c >= 0) B.noDec[c] = 1; }
      RS.bridgeSt = (RS.bridgeSt || 0) + (b.stone ? 1 : 0);
    }
  }
  const pick3 = (rnd, a, b, c) => { const r = rnd(); return r < 0.34 ? a : r < 0.67 ? b : c; };
  // ── City walls ──
  KIND.tTop = { mat: 'ramp', shadow: 'near', geo() {   // the walkway cap with a merlon (every other metre: tCap alone; merged into the ramp chunks)
    const k = new Kit(); k.add(G.box(), 0x646d7b, [0, 0.06, 0], 0, [1.42, 0.12, 1.02]); k.add(G.rbox(), 0x626c79, [0, 0.4, 0], 0, [1.3, 0.58, 0.58]); return k.build(); } };
  KIND.tCap = { mat: 'ramp', shadow: 'near', geo() { const k = new Kit(); k.add(G.box(), 0x646d7b, [0, 0.06, 0], 0, [1.42, 0.12, 1.02]); return k.build(); } };
  // A round wall tower (radius r, body height h): plinth, body, a string course, a corbelled crenellated top, a conical tiled roof with
  // a golden ball and a fluttering pennant; two arrow slits and a crest banner toward the town (yaw: the town's side)
  function townTower(B, x, z, r, h, yaw, roofCol, banner, pennCol) {
    const put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(mat4(x, 0, z, yaw), m), col);
    put('ramp', G.cyl(1, 1.06, 18), mat4(0, 0.3, 0, 0, r + 0.14, 0.6, r + 0.14), lin(0x58616d));
    put('ramp', G.cyl(1, 1, 18), mat4(0, h / 2, 0, 0, r, h, r), lin(0x5e6774));
    put('ramp', G.cyl(1, 1, 18), mat4(0, h * 0.55, 0, 0, r + 0.05, 0.16, r + 0.05), lin(0x565f6b));
    put('ramp', G.cyl(1, 0.92, 18), mat4(0, h + 0.2, 0, 0, r + 0.26, 0.4, r + 0.26), lin(0x626c7a));
    const nm = Math.max(8, Math.round(r * 5.5));
    for (let i = 0; i < nm; i++) { const a = (i + 0.5) / nm * TAU; put('ramp', G.box(), mat4(Math.sin(a) * (r + 0.16), h + 0.64, Math.cos(a) * (r + 0.16), a, TAU * (r + 0.16) / nm * 0.55, 0.5, 0.26), lin(0x626c79)); }
    put('roofN', G.cone(18), mat4(0, h + 0.4 + r * 0.95, 0, 0, r + 0.4, r * 1.9, r + 0.4), lin(roofCol));
    put('shiny', G.sphere(10, 8), mat4(0, h + 0.4 + r * 1.9 + 0.1, 0, 0, 0.13), lin(0x6f4951));
    put('prop', MK(G.cyl(1, 1, 6)), mat4(0, h + 0.4 + r * 1.9 + 0.55, 0, 0, 0.03, 0.9, 0.03), lin(0x3e2c32));
    put('decor', flagGeo(1), mat4(0, h + 0.4 + r * 1.9 + 0.95, 0, -yaw + 0.6, 0.9), lin(pennCol));
    for (const [a, y] of [[-0.5, h * 0.35], [0.45, h * 0.72]]) put('decor', G.box(), mat4(Math.sin(a) * (r + 0.01), y, Math.cos(a) * (r + 0.01), a, 0.12, 0.5, 0.05), lin(0x36282d));
    if (banner) { const bx = x + Math.sin(yaw) * (r + 0.06), bz = z + Math.cos(yaw) * (r + 0.06); B.banners.push({ x: bx, z: bz, y: h * 0.62 + 0.6, yaw, hue: 2 + (banner & 1), s: 1.1 }); }
  }
  // Pennant flags (local: the pole top at 0, the flag toward +x in the XY plane; uv 40.. = fluttering in the decor shader, uv.y = how
  // far from the pole): 0 a triangle for bunting · 1 a long swallow-tailed pennant
  function flagGeo(v) {
    const key = 'tFlag' + v;
    if (R.geo[key]) return R.geo[key];
    const g = new THREE.BufferGeometry(), P = v ? [0, 0, 0, 0, -0.34, 0, 0.78, -0.17, 0, 0, 0, 0, 0.78, -0.17, 0, 1, -0.02, 0, 0, -0.34, 0, 1, -0.32, 0, 0.78, -0.17, 0] : [0, 0, 0, 0.19, -0.3, 0, 0.38, 0, 0];
    const pos = [], uv = [];
    for (let i = 0; i < P.length; i += 3) { pos.push(P[i], P[i + 1], P[i + 2]); uv.push(40, v ? P[i] : -P[i + 1] / 0.3); }
    const n = pos.length / 3;
    for (let i = 0; i < n; i++) { pos.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); uv.push(uv[i * 2], uv[i * 2 + 1]); }   // (the back face)
    const idx = []; for (let i = 0; i < n; i += 3) { idx.push(i, i + 1, i + 2, n + i, n + i + 2, n + i + 1); }
    const nor = []; for (let i = 0; i < n; i++) nor.push(0, 0, 1); for (let i = 0; i < n; i++) nor.push(0, 0, -1);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(pos.length).fill(1), 3));
    g.setIndex(idx);
    return (R.geo[key] = keep(g));
  }
  // The city walls along V.wallPts (inward = the left of its direction): tall sandstone ramparts with merlons to the north and the
  // sides, a low parapet on the camera (south) side, a water gate (open, two towers) where the river runs through, round towers
  // every ~15 m where they hide no floor; the castle gate (Yemin Kapısı) and its towers at the arena's north rim
  function townWalls(L, B, T) {
    const { rnd, V, liqAt, occDisc, RS } = T, Pw = V.wallPts;
    if (!Pw || Pw.length < 10) return;
    const ex = L.exit, n = Pw.length, seg = [];
    for (let i = 1; i < n; i++) {
      const a = Pw[i - 1], c = Pw[i], l = hyp(c.x - a.x, c.z - a.z);
      if (l < 0.05) continue;
      const ux = (c.x - a.x) / l, uz = (c.z - a.z) / l, mx = (a.x + c.x) / 2, mz = (a.z + c.z) / 2, inx = -uz, inz = ux;
      const wet = liqAt(mx, mz) > 0.25 || liqAt(mx + inx * 0.7, mz + inz * 0.7) > 0.25 || liqAt(mx - inx * 0.7, mz - inz * 0.7) > 0.25;
      const gate = !!ex && L.theme === 'town' && Math.abs(mx - ex.x) < 2.85 && mz > ex.z - 4.5 && mz < ex.z + 1;   // (behind Yemin Kapısı's arch: its own opening)
      let h = 0;
      if (!wet && !gate) {
        if (inz < -0.55) h = 1.05;   // the south wall: a low parapet (camera side)
        else for (const hh of [4.6, 3.0, 1.6]) if (!hides(L, mx, mz, 0.75, 0, hh + 0.8, 0.2)) { h = hh; break; }
      }
      seg.push({ x: mx, z: mz, l, ya: Math.atan2(ux, uz), h, inx, inz, wet: wet || gate, water: wet, gate });
    }
    // heights: an opening (erode, then grow back within each segment's own limit, ±2 m), so the wall steps down in whole stretches
    // and never shows single tall teeth; a tower stands where a tall stretch meets a lower one, if it hides nothing
    const m = seg.length, h0 = seg.map(q => q.h), er = h0.slice();
    for (let i = 0; i < m; i++) for (let d = -2; d <= 2; d++) { const j = (i + d + m) % m; if (!seg[j].wet && !seg[i].wet) er[i] = Math.min(er[i], h0[j]); }
    for (let i = 0; i < m; i++) { if (seg[i].wet) continue; let v = 0; for (let d = -2; d <= 2; d++) { const j = (i + d + m) % m; if (!seg[j].wet) v = Math.max(v, er[j]); } seg[i].h = Math.min(h0[i], v); }
    let k = 0, sinceT = 6 + rnd() * 6;
    const towers = T.towers = [], seen = V.wallSeen = [];   // (seen: the built pieces, for tests: where a wall or a tower stands, y on its body)
    const tower = (q, r, gap = 9) => {
      if (towers.some(t => hyp(t.x - q.x, t.z - q.z) < gap) || (ex && L.theme === 'town' && hyp(ex.x - q.x, ex.z - q.z) < 5.5)) return false;   // (not against the gate's own towers)
      let th = 0;
      for (const hh of [7.2, 6.0, 5.0]) if (!hides(L, q.x, q.z, r + 0.2, 0, hh + r * 2.4, 0.2)) { th = hh; break; }
      if (!th) return false;
      towers.push({ x: q.x, z: q.z, r });
      townTower(B, q.x, q.z, r, th, Math.atan2(q.inx, q.inz), pick3(rnd, 0x40454f, 0x553a41, 0x40454f), towers.length % 2 ? 1 : 2, pick3(rnd, 0x6f4a52, 0x5c3f46, 0x49505b));
      occDisc(q.x, q.z, r + 0.5); RS.towers++; seen.push({ x: q.x, y: 1.5, z: q.z }, { x: q.x, y: 3, z: q.z });
      return true;
    };
    const wallPiece = q => {   // one straight piece of rampart (q: {x, z, l, ya, h}) with its walkway cap, a merlon every other metre
      occDisc(q.x, q.z, 0.9);
      const tint = lin(0xffffff, 0.94 + rnd() * 0.1);
      dec(B, 'ramp', G.box(), mat4(q.x, q.h / 2, q.z, q.ya, 1.3, q.h, q.l + 0.06), tint);
      dec(B, 'ramp', kgeo(k++ % 2 ? 'tCap' : 'tTop'), mat4(q.x, q.h, q.z, q.ya), q.h < 1.2 ? lin(0x656f7d) : null);
      RS.walls++; seen.push({ x: q.x, y: Math.min(1.5, q.h * 0.75), z: q.z });
    };
    for (const q of seg) if (q.h) wallPiece(q);   // (a stretch left out, the gate's opening: nothing there keeps the ground)
    // towers: every ~15 m along the tall stretches, on both banks of the water gate
    for (let i = 0; i < seg.length; i++) {
      const q = seg[i], nx = seg[(i + 1) % seg.length];
      sinceT -= q.l;
      if (q.h >= 3 && ((!q.wet && nx.water) || (i > 0 && seg[i - 1].water && !q.wet))) { if (tower(q, 1.35)) sinceT = 13; continue; }
      if (q.h >= 3 && Math.abs(nx.h - q.h) >= 1.3 && !nx.wet && tower(q, 1.35, 6)) { sinceT = 12; continue; }   // (where it steps down)
      if (q.h >= 3 && sinceT <= 0 && tower(q, 1.5)) sinceT = 13 + rnd() * 5;
    }
    // Yemin Kapısı: two slim round towers flanking the portal's arch (their solids are placed in generate), a crenellated bridge
    // over the arch with the town's sun crest, short walls back to the rampart
    if (ex && L.theme === 'town') {
      const put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(mat4(ex.x, 0, ex.z), m), col);
      for (const sd of [-1, 1]) {
        townTower(B, ex.x + sd * 2.85, ex.z - 0.25, 0.95, 5.6, 0, 0x4c353b, sd > 0 ? 1 : 2, 0x6f4a52);
        towers.push({ x: ex.x + sd * 2.85, z: ex.z - 0.25, r: 0.95 }); seen.push({ x: ex.x + sd * 2.85, y: 1.5, z: ex.z - 0.25 }, { x: ex.x + sd * 2.85, y: 3, z: ex.z - 0.25 });
        let wz = -0.4;
        while (wz > -6 && !T.occAt(ex.x + sd * 2.85, ex.z + wz - 0.9)) wz -= 0.25;
        const len = -wz + 0.2;
        put('ramp', G.box(), mat4(sd * 2.85, 2.1, -0.25 - len / 2, 0, 1.2, 4.2, len), lin(0x5c6571));
      }
      put('ramp', G.box(), mat4(0, 4.55, -0.25, 0, 4.6, 1.1, 1.1), lin(0x5e6774));
      put('ramp', G.box(), mat4(0, 5.16, -0.25, 0, 4.8, 0.12, 1.3), lin(0x646d7b));
      for (let i = 0; i < 5; i++) put('ramp', G.rbox(), mat4((i - 2) * 0.9, 5.5, -0.25, 0, 0.5, 0.55, 1.1), lin(0x626c79));
      put('shiny', crestGeo(), mat4(0, 4.5, 0.32, 0, 0.9), null);
      occDisc(ex.x, ex.z - 1.5, 2.2);
      for (let j = Math.floor(ex.z - 14); j < ex.z; j++) for (let i = Math.floor(ex.x - 1.8); i <= ex.x + 1.8; i++) { const c = T.cellOf(i + 0.5, j + 0.5); if (c >= 0) B.noDec[c] = 1; }   // (no tufts on the road through it)
    }
    if (L.theme === 'town') townInnerWalls(L, B, T, seg, wallPiece);
  }
  // The old town wall (iç sur): the ring runs 7–9 m beyond the houses, and the gameplay camera over Feza sees only ≈ 7.5 m north and
  // 6–9 m to each side (landscape), so along most of the main route no rampart would be on screen. Spurs come in from the ring's
  // tall stretches toward the streets, each ending in a round tower by the kerb (else a short stretch of wall on its own): greedily
  // the tower that brings a wall into view at the most route spots (every 3 m) still without one, ≥ 9 m from every other inner tower
  // (6 m from the ring's); at most 6, and only until ≈ 44 % of the spots see a wall by this (cautious) estimate — each tower takes a
  // house's place by the kerb. Every piece stands dry, off the floor and off what is kept clear (the arena's rim, the bridges' ends,
  // the gate and its road), and hides no floor (camera rule: a tower's body is 3.4–5.6 m, a slim turret's 2.6–3.2 m, where the ground
  // behind it allows). V.wallIn: their 1 m points (the minimap); RS.inner: counts for tests
  function townInnerWalls(L, B, T, seg, wallPiece) {
    const { rnd, V, dF, cellOf, nearLiq, outAt, occAt, occDisc, reserve, bridgeD, RS } = T, towers = T.towers, seen = V.wallSeen, W = L.W, ex = L.exit;
    const path = L.path, spots = [], IN = RS.inner = { towers: 0, small: 0, walls: 0, spots: 0, seen: 0 };
    V.wallIn = [];
    { let acc = 0; for (let i = 1; i < path.length; i++) { const a = path[i - 1], c = path[i], l = hyp(c.x - a.x, c.z - a.z); for (let s = 0; s < l; s += 0.5) { acc += 0.5; if (acc >= 3) { acc = 0; spots.push({ x: a.x + (c.x - a.x) * s / l, z: a.z + (c.z - a.z) * s / l, ok: false }); } } } }
    if (spots.length < 4) return;
    // on screen from the gameplay camera over Feza at spot s (landscape ≈ 1.4:1, a 6 % margin)?
    const cd = CAM.dist || 12.5, tf = Math.tan((camera.fov || 40) * Math.PI / 360) * 0.94, sp = Math.sin(LV_PITCH), cp = Math.cos(LV_PITCH);
    const inView = (s, x, y, z) => { const vy = y - 0.9 - sp * cd, vz = z - s.z - cp * cd, dep = -vy * sp - vz * cp; return dep > 1 && Math.abs(vy * cp - vz * sp) < dep * tf && Math.abs(x - s.x) < dep * tf * 1.4; };
    const mark = (x, y, z) => { for (const s of spots) if (!s.ok && inView(s, x, y, z)) s.ok = true; };
    for (const w of seen) mark(w.x, w.y, w.z);
    const gain = q => { let n = 0; for (const i of q.cov) if (!spots[i].ok) n++; return n; };
    const noFl = (x, z, r) => !satCount(L, x - r, z - r, x + r, z + r);
    const pieceOK = (x, z, endOK) => noFl(x, z, 0.8) && nearLiq(x, z, 0.8) < 0.08 && outAt(x, z) < 0.6 && !reserve(x, z) && (endOK || !occAt(x, z)) && !towers.some(t => hyp(t.x - x, t.z - z) < t.r + 0.9);
    const pieceH = (x, z) => { for (const hh of [3.0, 2.4, 1.6]) if (!hides(L, x, z, 0.85, 0, hh + 0.8, 0.2)) return hh; return 0; };
    // a round tower (r 1.2, body 3.4–5.6 m), else a slim turret (r 0.85, body 2.6–3.2 m) where one may stand here → {r, th} or null
    const SIZES = [[1.2, [5.6, 4.8, 4.0, 3.4]], [0.85, [3.2, 2.6]]];
    const towerAt = (x, z) => {
      if (x < 3 || z < 3 || x > W - 3 || z > L.H - 3 || outAt(x, z) > 0.25 || occAt(x, z) || reserve(x, z) || (ex && hyp(ex.x - x, ex.z - z) < 8) || hyp(L.start.x - x, L.start.z - z) < 5 || bridgeD(x, z) < 3.5) return null;
      if (towers.some(t => hyp(t.x - x, t.z - z) < (t.inner ? 9 : 6))) return null;
      for (const [r, hs] of SIZES) {
        if (!noFl(x, z, r + 0.35) || noFl(x, z, r + 3.2) || nearLiq(x, z, r + 0.5) > 0.08) continue;   // (by a street, dry)
        let bad = false;
        for (let a = 0; a < 8 && !bad; a++) { const qx = x + Math.cos(a * 0.785) * (r + 0.3), qz = z + Math.sin(a * 0.785) * (r + 0.3); if (occAt(qx, qz) || reserve(qx, qz)) bad = true; }
        if (bad) continue;
        for (const th of hs) if (!hides(L, x, z, r + 0.2, 0, th + r * 2.4, 0.2)) return { r, th };
      }
      return null;
    };
    // a straight run of wall pieces (≈ 1 m) from (x0, z0) along (ux, uz) for len metres, all one height (≤ hMax) → the pieces or null
    const run = (x0, z0, ux, uz, len, toRing, hMax) => {
      const n = Math.max(1, Math.round(len)), l = len / n, out = [];
      let h = hMax;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * l, x = x0 + ux * t, z = z0 + uz * t, endOK = toRing && t > len - 1.6;
        if (!pieceOK(x, z, endOK) || !pieceOK(x - uz * 0.55, z + ux * 0.55, endOK) || !pieceOK(x + uz * 0.55, z - ux * 0.55, endOK)) return null;
        h = Math.min(h, pieceH(x, z));
        if (h < 1.6) return null;
        out.push({ x, z, l, ya: Math.atan2(ux, uz) });
      }
      for (const q of out) q.h = h;
      return out;
    };
    const cand = [];
    for (let z = 3; z < L.H - 3; z += 0.5) for (let x = 3; x < W - 3; x += 0.5) {
      const c = cellOf(x, z);
      if (c < 0 || dF[c] < 1.2 || dF[c] > 5) continue;
      const t = towerAt(x, z);
      if (!t) continue;
      const cov = []; spots.forEach((s, i) => { if (!s.ok && (inView(s, x, 1.5, z) || inView(s, x, 2.6, z))) cov.push(i); });   // (the spots it would show a tower at)
      if (cov.length >= 2) cand.push({ x, z, r: t.r, th: t.th, cov });
    }
    IN.cand = cand.length;
    for (let guard = 0; guard < 60 && IN.towers < 6 && spots.filter(s => s.ok).length < spots.length * 0.44; guard++) {   // (enough: every house kept counts too)
      let best = null;
      for (const q of cand) {
        if (q.dead) continue;
        if (towers.some(t => hyp(t.x - q.x, t.z - q.z) < (t.inner ? 9 : 6))) { q.dead = true; continue; }
        const g = gain(q);
        if (g < 2) continue;
        const sc = g + q.r * 0.8 + q.th * 0.1 + rnd() * 0.3;
        if (!best || sc > best.sc) best = { q, sc };
      }
      if (!best) break;
      const q = best.q; q.dead = true;
      const t = towerAt(q.x, q.z);   // (a spur built since may have taken its ground)
      if (!t) continue;
      const { r, th } = t, c = cellOf(q.x, q.z), gx = dF[c + 1] - dF[c - 1], gz = dF[c + W] - dF[c - W], gl = hyp(gx, gz) || 1, ox = gx / gl, oz = gz / gl;   // (ox, oz): away from the floor
      // the spur: straight out to the nearest tall stretch of the ring within 8 m (roughly away from the floor), else a short stub
      let pcs = null;
      const ring = seg.filter(s => s.h >= 1.6 && !s.wet && hyp(s.x - q.x, s.z - q.z) < 8 && ((s.x - q.x) * ox + (s.z - q.z) * oz) / (hyp(s.x - q.x, s.z - q.z) || 1) > 0.35)
        .sort((a, b) => hyp(a.x - q.x, a.z - q.z) - hyp(b.x - q.x, b.z - q.z));
      for (const s of ring.slice(0, 8)) {
        const d = hyp(s.x - q.x, s.z - q.z), ux = (s.x - q.x) / d, uz = (s.z - q.z) / d;
        if ((pcs = run(q.x + ux * r * 0.6, q.z + uz * r * 0.6, ux, uz, d - r * 0.6 - 0.3, true, th - 0.6))) break;
      }
      if (!pcs) for (const len of [4.5, 3]) if ((pcs = run(q.x + ox * r * 0.6, q.z + oz * r * 0.6, ox, oz, len, false, th - 0.6))) break;
      townTower(B, q.x, q.z, r, th, Math.atan2(-ox, -oz), pick3(rnd, 0x40454f, 0x553a41, 0x40454f), IN.towers % 2 ? 1 : 2, pick3(rnd, 0x6f4a52, 0x5c3f46, 0x49505b));   // (its crest banner toward the street)
      towers.push({ x: q.x, z: q.z, r, inner: true }); occDisc(q.x, q.z, r + 0.4); IN.towers++; if (r < 1) IN.small++;
      seen.push({ x: q.x, y: 1.5, z: q.z }, { x: q.x, y: 2.6, z: q.z }); mark(q.x, 1.5, q.z); mark(q.x, 2.6, q.z); V.wallIn.push({ x: q.x, z: q.z });
      if (pcs) for (const p of pcs) { wallPiece(p); mark(p.x, Math.min(1.5, p.h * 0.75), p.z); V.wallIn.push({ x: p.x, z: p.z }); IN.walls++; }
    }
    IN.spots = spots.length; IN.seen = spots.filter(s => s.ok).length;
  }
  // The town's crest: a smiling golden sun on a round sky-blue shield with a gold rim (local: facing +z, radius ≈0.55)
  function crestGeo() {if(R.geo.tCrest)return R.geo.tCrest;const k=new Kit();k.add(G.octa(),0x574d45,[0,0,0],0,[0.48,0.58,0.08]);k.add(G.box(),0xa77a57,[0,0,0.08],0,[0.07,0.65,0.025]);k.add(G.box(),0x953e34,[0,0.12,0.1],0,[0.42,0.06,0.025]);return (R.geo.tCrest=keep(k.build()));
  }
  // ── Veba Şehri: the squares (fountain, wells, market stalls) and the street furniture ──
  // Falling water (the fountain's curtains and jet): streaks sliding down a see-through sheet (uv.y 0 at the lip → 1 at the foot)
  const FALLW_VS = `varying vec2 vU; varying float vFogD; void main() { vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vFogD = -mv.z; gl_Position = projectionMatrix * mv; }`;
  const FALLW_FS = `uniform float uTime, fogNear, fogFar; uniform vec3 fogColor; uniform sampler2D tNoise; varying vec2 vU; varying float vFogD;
    void main() {
      float s = texture2D(tNoise, vec2(vU.x * 3.0, vU.y * 0.7 - uTime * 1.2)).g, s2 = texture2D(tNoise, vec2(vU.x * 8.0 + 0.3, vU.y * 1.4 - uTime * 2.0)).b;
      float a = (0.3 + 0.55 * smoothstep(0.35, 0.75, s)) * smoothstep(0.0, 0.1, vU.y) * (1.0 - 0.5 * smoothstep(0.75, 1.0, vU.y));
      vec3 col = mix(vec3(0.19, 0.25, 0.13), vec3(0.49, 0.46, 0.25), smoothstep(0.45, 0.85, s2)) * 1.2;
      col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFogD));
      gl_FragColor = vec4(col, a);
      #include <colorspace_fragment>
    }`;
  function fallWMat() {
    return R.mat.fallW || (R.mat.fallW = keep(new THREE.ShaderMaterial({
      uniforms: Object.assign({ uTime: TIME.u, tNoise: { value: texOK() && TEX.noise ? TEX.noise : blackTex() } }, THREE.UniformsUtils.clone(THREE.UniformsLib.fog)),
      vertexShader: FALLW_VS, fragmentShader: FALLW_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
    })));
  }
  // The fountain: a round glossy cream-stone basin with a moulded rim, clear water in it, a column with a scalloped bowl, the town's golden
  // smiling sun on top; a water curtain falls from the bowl, a little jet plays over the sun; sparkles, now and then a glittery splash
  function townFountain(L, B, T, f) {
    const { rnd } = T, M = mat4(f.x, 0, f.z, rnd() * TAU), put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
    const R0 = f.r;
    put('shiny', R.geo.tBasin || (R.geo.tBasin = keep(new THREE.LatheGeometry(v2s([[R0 - 0.2, 0.18], [R0 - 0.2, 0.52], [R0 - 0.14, 0.6], [R0 + 0.02, 0.62], [R0 + 0.08, 0.54], [R0, 0.46], [R0 + 0.02, 0.1], [R0 + 0.12, 0.0]]), 28))), new THREE.Matrix4(), lin(0x5f6875));
    put('shiny', G.cyl(1, 1, 24), mat4(0, 0.1, 0, 0, R0 - 0.15, 0.2, R0 - 0.15), lin(0x545c68));
    put('shiny', G.cyl(0.85, 1, 12), mat4(0, 0.8, 0, 0, 0.22, 0.8, 0.22), lin(0x606a77));
    put('shiny', R.geo.tBowl || (R.geo.tBowl = keep(new THREE.LatheGeometry(v2s([[0.2, 1.0], [0.5, 1.1], [0.66, 1.22], [0.7, 1.3], [0.62, 1.3], [0.2, 1.22]]), 20))), new THREE.Matrix4(), lin(0x616a78));
    put('shiny', G.cyl(0.8, 1, 10), mat4(0, 1.5, 0, 0, 0.12, 0.45, 0.12), lin(0x606a77));
    // The square remembers a sealed plague well: an iron oath spike, never a smiling mascot.
    const face = mat4(f.x, 1.95, f.z, 0, 1);
    dec(B, 'decor', crestGeo(), face, lin(0xffffff));
    dec(B, 'decor', G.cone(4), new THREE.Matrix4().multiplyMatrices(face, mat4(0, 0.53, 0, 0, 0.11, 0.38, 0.11)), lin(0x6e6252));
    for (const sx of [-1, 1]) dec(B, 'decor', G.torus(TAU, .13, 8), new THREE.Matrix4().multiplyMatrices(face, mat4(sx*.34, -.14, 0, 0, .14, .14, .1)), lin(0x514b43));
    // water: the basin's and the bowl's surfaces (the still-water shader), the falling curtain and the jet
    const wg = new Kit(); wg.add(G.cyl(1, 1, 28), 0xffffff, [0, 0.47, 0], 0, [R0 - 0.19, 0.02, R0 - 0.19]); wg.add(G.cyl(1, 1, 20), 0xffffff, [0, 1.26, 0], 0, [0.62, 0.02, 0.62]);
    const wgeo = wg.build(); B.dispose.push(wgeo);
    const wm = waterMat(true), wmesh = new THREE.Mesh(wgeo, wm); wmesh.position.set(f.x, 0, f.z); wmesh.receiveShadow = true; wmesh.name = 'fountain-water';
    B.g.add(wmesh);
    const cg = R.geo.tCurtain || (R.geo.tCurtain = keep(new THREE.LatheGeometry(v2s([[0.71, 1.29], [0.76, 1.2], [0.8, 0.95], [0.84, 0.7], [0.88, 0.47]]), 28)));
    const jg = R.geo.tJet || (R.geo.tJet = keep(new THREE.LatheGeometry(v2s([[0.02, 2.55], [0.09, 2.5], [0.12, 2.35], [0.08, 2.16]]), 12)));
    for (const g of [cg, jg]) { const m = new THREE.Mesh(g, fallWMat()); m.position.set(f.x, 0, f.z); m.renderOrder = 2; m.name = 'fountain-fall'; B.g.add(m); }
    for (let n = 0; n < 16; n++) { const a = rnd() * TAU, r = 0.8 + rnd() * 0.25; B.pts.add.push({ x: f.x + Math.cos(a) * r, y: 0.5 + rnd() * 0.7, z: f.z + Math.sin(a) * r, kind: 2, ph: rnd(), size: 0.14, prm: 0.4 + rnd() * 0.4, col: lin(0x606976, 1.8) }); }
    for (let n = 0; n < 6; n++) { const a = rnd() * TAU, r = rnd() * (R0 - 0.4); B.pts.add.push({ x: f.x + Math.cos(a) * r, y: 0.5, z: f.z + Math.sin(a) * r, kind: 8, ph: rnd(), size: 0.18, prm: 0.5 + rnd() * 0.5, col: lin(0xffffff, 1.6) }); }
    glowAt(B, f.x, f.z + 0.5, R0 + 1.6, 0x5d6673, 0.12);
    let ft = 1;
    B.anim.push((dt, hx, hz) => {
      if ((ft -= dt) > 0 || hyp(hx - f.x, hz - f.z) > 12 || typeof FX === 'undefined' || !FX.burst) return;
      ft = 1.4 + Math.random() * 1.2;
      const a = Math.random() * TAU;
      FX.burst('sparkle', f.x + Math.cos(a) * 0.85, 0.55, f.z + Math.sin(a) * 0.85, { count: 5, color: '#8f9671' });
    });
    T.RS.fountain = 1;
  }
  // A well: a round stone wall with water in it, two posts, a tiled little roof, the winch and its bucket (local: roof ridge along x)
  function townWell(L, B, T, w) {
    const M = mat4(w.x, 0, w.z, w.ry), put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
    put('ramp', wellRingGeo(), new THREE.Matrix4(), lin(0x5d6673));
    put('shiny', G.cyl(1, 1, 22), mat4(0, 0.42, 0, 0, 0.63, 0.02, 0.63), lin(0x383d45, 0.7));
    for (const sd of [-1, 1]) put('prop', G.box(), mat4(sd * 0.8, 1.2, 0, 0, 0.12, 2.1, 0.12), lin(0x5c3f46));
    put('prop', G.cyl(1, 1, 10), mat4(0, 1.75, 0, 0, 0.05, 1.72, 0.05, 0, Math.PI / 2), lin(0x4e363c));
    const rs = boxUV(1.95, 0.08, 0.7, 2); B.tmpGeo.push(rs);
    for (const sd of [-1, 1]) put('roofN', rs, mat4(0, 2.42, sd * 0.28, 0, 1, 1, 1, sd * 0.75, 0), lin(pick3(T.rnd, 0x553a41, 0x40454f, 0x40454f)));
    put('decor', G.cyl(1, 1, 5), mat4(0.1, 1.42, 0, 0, 0.012, 0.64, 0.012), lin(0x3c2b31));
    put('prop', kgeo('barrel'), mat4(0.1, 0.98, 0, 0, 0.36, 0.36, 0.36), lin(0xffffff));
    for (let n = 0; n < 4; n++) { const a = n / 4 * TAU + 0.4; put('decor', flowerGeo((n * 3 + 1) % FLOWER_COL.length), mat4(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05, a, 0.9), null); }
  }
  // Market stall (local: facing +z, 2.1 m wide): a wooden counter with a striped cloth, four posts, a striped sloping awning with a
  // scalloped hem, the goods: 0 fruit crates · 1 simit and bread · 2 flower buckets · 3 toy drums and tambourines
  function stallData(v) {
    const key='tStall'+v;if(R.geo[key])return R.geo[key];const K=kits('prop','decor','shiny','gloss');
    K.prop.add(G.box(),0x33373f,[0,0.75,0],0,[1.9,0.08,0.8]);
    for(const x of [-0.85,0.85])for(const z of [-0.32,0.32])K.prop.add(G.box(),0x26282f,[x,0.37,z],0,[0.08,0.74,0.08]);
    for(let i=0;i<7;i++)K.prop.add(G.box(),0x2c2f36,[(i-3)*0.25,1.22,0.3],0,[0.025,0.9,0.03]);
    K.prop.add(G.box(),0x2c2f36,[0,1.67,0.3],0,[1.7,0.04,0.08]);
    K.decor.add(dreadGeo(1),0xffffff,[0,0.81,0],0,0.52);
    return (R.geo[key]=buildKits(K));
  }
  // Street furniture (local: facing +z): a lantern post (the lantern: a pooled light) · a bench · hay bales · a handcart · a tree in a
  // big terracotta pot · a flower bed · barrels and crates
  function lampPostData() {
    if (R.geo.tLamp) return R.geo.tLamp;
    const K = kits('prop', 'window', 'shiny'), iron = 0x23252b;
    K.prop.add(MK(G.cyl(1, 1.3, 10)), iron, [0, 0.15, 0], 0, [0.15, 0.3, 0.15]);
    K.prop.add(MK(G.cyl(0.75, 1, 10)), iron, [0, 1.35, 0], 0, [0.055, 2.4, 0.055]);
    K.prop.add(MK(G.box()), iron, [0, 2.52, 0], 0, [0.3, 0.05, 0.3]);
    K.window.add(G.box(), 0xffffff, [0, 2.74, 0], 0, [0.22, 0.36, 0.22]);
    for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) K.prop.add(MK(G.box()), iron, [ox * 0.12, 2.74, oz * 0.12], 0, [0.03, 0.4, 0.03]);
    K.prop.add(MK(G.cone(4)), iron, [0, 3.0, 0], [0, Math.PI / 4, 0], [0.2, 0.16, 0.2]);
    K.shiny.add(G.sphere(8, 6), 0x6f4951, [0, 3.12, 0], 0, 0.05);
    return (R.geo.tLamp = buildKits(K));
  }
  function benchData() {
    if(R.geo.tBench)return R.geo.tBench;const K=kits('prop','shiny');
    for(const z of [-0.16,0,0.16])K.shiny.add(G.box(),0x8b735b,[0,0.45,z],0,[1.4,0.065,0.12]);
    K.shiny.add(G.box(),0x79604c,[-0.17,0.82,-0.2],[0,0,-0.07],[1.02,0.16,0.055]);
    K.shiny.add(G.box(),0x80654f,[0.41,0.77,-0.18],[0,0,-0.38],[0.34,0.14,0.055]);
    for(const x of [-0.6,0.6]){K.prop.add(G.box(),0x4b4240,[x,0.22,0.1],0,[0.07,0.44,0.07]);K.prop.add(G.box(),0x4b4240,[x,0.45,-0.18],0,[0.07,0.9,0.07]);}
    K.shiny.add(G.box(),0x8d7e6b,[0.4,0.52,0.03],[0,0.2,0],[0.24,0.065,0.18]);
    return(R.geo.tBench=buildKits(K));
  }
  function hayData(v=0) { const key='darkhayData'+v;if(R.geo[key])return R.geo[key]; const K=kits('prop','decor');K.prop.add(dreadGeo(v%2),0xffffff);return (R.geo[key]=buildKits(K)); }
  function cartData(v) {
    const key='tCart'+v;if(R.geo[key])return R.geo[key];const K=kits('prop','gloss','decor'),wood=0x7c6551;
    K.prop.add(G.box(),wood,[0,0.61,0],0,[0.95,0.08,1.4]);
    for(const sx of [-1,1]){
      K.prop.add(G.box(),0x655345,[sx*0.48,0.82,0],[0,0,sx*0.08],[0.065,0.42,1.43]);
      K.prop.add(G.cyl(1,1,10),0x483d36,[sx*0.61,0.42,0.1],[0,0,Math.PI/2],[0.41,0.07,0.41]);
      for(let i=0;i<4;i++)K.prop.add(G.box(),wood,[sx*0.66,0.42,0.1],[i*Math.PI/4,0,0],[0.045,0.76,0.06]);
      K.prop.add(G.box(),wood,[sx*0.3,0.55,1.3],0,[0.06,0.06,1.2]);
    }
    K.decor.add(G.capsule(0.55,10),0x8d8070,[0,0.83,-0.12],[Math.PI/2,0,0],[0.25,0.44,0.24]);
    K.decor.add(G.sphere(10,8),0xb0a089,[0,0.8,0.46],0,[0.16,0.15,0.16]);
    for(const z of [-0.32,0.24])K.prop.add(G.box(),0x4f4038,[0,0.9,z],0,[0.57,0.022,0.045]);
    if(v===1)K.decor.add(dreadGeo(1),0xffffff,[0.1,0.73,0],0,0.36);
    return(R.geo[key]=buildKits(K));
  }
  function potTreeData(v=0) { const key='darkpotTreeData'+v;if(R.geo[key])return R.geo[key]; const K=kits('prop','decor');K.prop.add(dreadGeo(v%2),0xffffff);return (R.geo[key]=buildKits(K)); }
  function barrelsData(v) {   // a few (not breakable) barrels and crates stacked by a house
    const key = 'tBarrels' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('prop'), bg = kgeo('barrel'), cg = kgeo('crate');
    if (v === 0) { K.prop.add(bg, 0xffffff, [-0.36, 0, 0], 0, 1); K.prop.add(bg, 0x616b78, [0.36, 0, 0.08], [0, 0.8, 0], 1); K.prop.add(bg, 0xffffff, [0, 0.78, 0.04], [0, 0.3, 0], 0.92); }
    else { K.prop.add(cg, 0xffffff, [0, 0, 0], [0, 0.1, 0], 1); K.prop.add(cg, 0x636d7a, [0.72, 0, 0.1], [0, -0.2, 0], 0.86); K.prop.add(cg, 0xffffff, [0.1, 0.78, 0.05], [0, 0.4, 0], 0.8); }
    return (R.geo[key] = buildKits(K));
  }
  // Heights (top) and footprints (radius) of the furniture pieces, for the camera test
  const TFURN = { lamp: { r: 0.25, h: 3.15 }, bench: { r: 0.72, h: 0.95 }, hay: { r: 0.95, h: 1.35 }, cart: { r: 0.95, h: 1.15 }, tree: { r: 0.62, h: 2.6 }, barrels: { r: 0.75, h: 1.5 }, bed: { r: 0.8, h: 0.4 } };
  function putFurn(B, id, x, z, yaw, v, s = 1) {
    const m = mat4(x, 0, z, yaw, s);
    if (id === 'lamp') {
      putD(B, lampPostData(), m);
      B.lights.push({ x, y: 2.7 * s, z, col: new THREE.Color(0x704b53), int: 2.6, dist: 7, fl: 0.2, ph: x * 3.1 });
      glowAt(B, x, z + 0.2, 2.8, 0x6f4a51, 0.24);
      return;
    }
    if (id === 'bench') putD(B, benchData(), m);
    else if (id === 'hay') putD(B, hayData(), m);
    else if (id === 'cart') putD(B, cartData(v % 3), m);
    else if (id === 'tree') putD(B, potTreeData(v % 3), m);
    else if (id === 'barrels') putD(B, barrelsData(v % 2), m);
    else if (id === 'bed') {   // a low round flower bed with a stone kerb
      dec(B, 'ramp', G.torus(TAU, 0.18, 20), mat4(x, 0.08, z, 0, 0.72 * s, 0.72 * s, 0.9, Math.PI / 2), lin(0x5c6571));
      dec(B, 'decor', G.cyl(1, 1, 16), mat4(x, 0.09, z, 0, 0.66 * s, 0.14, 0.66 * s), lin(0x36282d));
      const rnd = mulberry32(Math.round(x * 97 + z * 13));
      for (let i = 0; i < 9; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 0.55 * s; dec(B, 'decor', flowerGeo(Math.floor(rnd() * FLOWER_COL.length)), mat4(x + Math.cos(a) * r, 0.14, z + Math.sin(a) * r, rnd() * TAU, 1.0 + rnd() * 0.3), null); }
    }
  }
  // "Veba Şehri" board: cream with a blue frame and a golden line, the smiling sun of the crest, the name in round letters, bunting
  function townSignTex(text) {
    const key='tsign'+text;return R.tex[key]||(R.tex[key]=canvasTex(512,256,(g,w,h)=>{
      g.fillStyle='#3b3029';g.fillRect(0,0,w,h);g.fillStyle='#89745c';g.fillRect(14,14,w-28,h-28);
      g.strokeStyle='#625141';g.lineWidth=3;for(let i=0;i<9;i++){g.beginPath();g.moveTo(12,24+i*28);g.lineTo(w-12,20+i*28);g.stroke();}
      g.strokeStyle='#aa9070';g.lineWidth=5;g.strokeRect(23,23,w-46,h-46);
      g.strokeStyle='#5f2925';g.lineWidth=11;g.beginPath();g.moveTo(76,62);g.lineTo(76,198);g.moveTo(39,108);g.lineTo(113,108);g.moveTo(44,164);g.lineTo(76,201);g.lineTo(108,164);g.stroke();
      g.fillStyle='#27221e';g.textAlign='center';g.textBaseline='middle';const words=text.split(' ');g.font='bold 53px Georgia,serif';g.fillText(words[0],w/2+50,h/2-22,315);g.font='bold 49px Georgia,serif';g.fillText(words.slice(1).join(' '),w/2+50,h/2+38,315);
      g.fillStyle='#413329';for(const x of [32,w-32])for(const y of [32,h-32]){g.beginPath();g.arc(x,y,5,0,TAU);g.fill();}
      g.strokeStyle='#44352b';g.lineWidth=2;for(const x of [130,360,420]){g.beginPath();g.moveTo(x,17);g.lineTo(x-15,55);g.lineTo(x+7,65);g.stroke();}
    }));
  }
  // The town's sign: a low welcome board (kid height: the board 0.34–1.15 m, the roof's ridge ≈ 1.55 m, so what it could hide behind
  // it lies inside its own solid) on two posts, the painted board (added after fixReach, see finishSigns), a little tiled roof with a
  // golden knob, flowers at its foot
  function townSign(L, B, x, z, text, yaw, solid) {
    const M = mat4(x, 0, z, yaw), put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col), vis = [];
    for (const sx of [-0.78, 0.78]) vis.push(put('prop', G.box(), mat4(sx, 0.67, -0.03, 0, 0.12, 1.34, 0.12), lin(0x5d3f46)));
    vis.push(put('prop', G.box(), mat4(0, 0.74, -0.05, 0, 1.76, 0.9, 0.05), lin(0x724b53)));
    const rs = boxUV(2.0, 0.08, 0.5, 2); B.tmpGeo.push(rs);
    for (const sd of [-1, 1]) vis.push(put('roofN', rs, mat4(0, 1.36, sd * 0.2, 0, 1, 1, 1, sd * 0.62, 0), lin(0x553a41)));
    vis.push(put('shiny', G.sphere(8, 6), mat4(0, 1.54, 0, 0, 0.09), lin(0x6f4951)));
    for (let i = 0; i < 7; i++) vis.push(put('decor', flowerGeo((i * 2 + 1) % FLOWER_COL.length), mat4((i - 3) * 0.26, 0, 0.12 + (i % 2) * 0.1, i, 0.9), null));   // flowers at its foot
    const so = solid ? propSolid(L, x - Math.sin(yaw) * 0.05, z - Math.cos(yaw) * 0.05, 0.9, 'sign', vis) : null;
    B.signs.push({ x, z, text, yaw, so, town: true, by: 0.74 });
    return so;
  }
  // The arrival, in the first view (like Çürüme Vadisi's): the low "Veba Şehri" sign 2.2–5.3 m north of the start and at most 5.5 m to
  // a side (the whole board on screen) — on the start square, where its roof hides only floor its own solid keeps Feza off; else just
  // off the square's floor by the kerb, else against its north rim, both where it hides no floor at all
  function townArrival(L, B, T) {
    const { rnd, occAt, occDisc, nearLiq, RS } = T, sx0 = L.start.x, sz0 = L.start.z, S = L.rooms[0], grid = L.grid;
    const busy = (x, z, pad) => L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 2.4 + pad) || L.chests.some(q => hyp(q.x - x, q.z - z) < 1.3 + pad) ||
      L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + pad) || hyp(sx0 - x, sz0 - z) < 1.5 + pad;
    const hidesS = (x, z) => satCount(L, x - 1.3, z - 0.4 - 1.6 * LV_PK, x + 1.3, z - 0.9) > 0;   // (roof ridge 1.6 m, ±1 m wide + Feza's half-width)
    const ok = (x, z, lk = 2.2, strict = true) => { const c = T.cellOf(x, z); return c >= 0 && grid[c] && L.dWall[c] >= 0.75 && !(strict && hidesS(x, z)) && linkDist(L, x, z) >= lk &&
      !L.path.some(p => hyp(p.x - x, p.z - z) < 2.0) && !busy(x, z, 1.4) && gapOKL(L, x, z, 0.85) && !occAt(x, z); };
    const offOK = (x, z) => { const c = T.cellOf(x, z); if (c < 0 || grid[c] || hidesS(x, z) || nearLiq(x, z, 1.0) > 0.05 || busy(x, z, 0.6)) return false;   // (just off the floor: no solid)
      for (let k = 0; k < 8; k++) { const qx = x + Math.cos(k * 0.785) * 1.05, qz = z + Math.sin(k * 0.785) * 0.55; if (occAt(qx, qz) || T.reserve(qx, qz)) return false; }
      return !occAt(x, z) && !satCount(L, x - 0.95, z - 0.25, x + 0.95, z + 0.25) && satCount(L, x - 0.9, z + 0.25, x + 0.9, z + 1.1) > 0; };   // (off the cells, the kerb right in front)
    const score = (x, z) => Math.abs(z - (sz0 - 4.0)) + Math.abs(Math.abs(x - sx0) - 2.3) * 0.35 + rnd() * 0.2;
    let best = null, onF = true;
    for (let t = 0; t < 1400; t++) {
      const x = sx0 - 5.5 + rnd() * 11, z = sz0 - 5.3 + rnd() * 3.1;
      if (!ok(x, z, 1.8, false)) continue;
      const k = score(x, z);
      if (!best || k < best.k) best = { x, z, k };
    }
    if (!best) for (let t = 0; t < 1400; t++) {
      const x = sx0 - 5.5 + rnd() * 11, z = sz0 - 5.3 + rnd() * 3.1;
      if (!offOK(x, z)) continue;
      const k = score(x, z);
      if (!best || k < best.k) { best = { x, z, k }; onF = false; }
    }
    if (!best) for (let t = 0; t < 500; t++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, dd = S.r * (0.45 + rnd() * 0.75), x = S.x + Math.cos(a) * dd, z = S.z + Math.sin(a) * dd;
      if (z > sz0 - 2.2 || !ok(x, z)) continue;
      const k = hyp(x - sx0, z - sz0) * 0.25 + rnd() * 0.3;
      if (!best || k < best.k) best = { x, z, k };
    }
    if (best) { townSign(L, B, best.x, best.z, 'Veba Şehri', 0, onF); RS.sign = { x: +best.x.toFixed(1), z: +best.z.toFixed(1), on: onF }; occDisc(best.x, best.z, 1.2); }
  }
  // The squares: the fountain, the wells, the market stalls (their spots come from generate, see townData); lantern posts, benches,
  // hay, carts, potted trees, flower beds and barrels on the garden side of the kerb all along the streets (low on the camera side,
  // never hiding floor); in the rooms, against a wall, a few potted trees and benches (blocking, fixReach can take them out)
  function townSquares(L, B, T) {
    const { rnd, V, dF, cellOf, liqAt, nearLiq, gapAt, capAt, occAt, occDisc, RS } = T, TD = L.town || { wells: [], stalls: [] }, grid = L.grid, W = L.W, H = L.H;
    if (TD.fountain) { townFountain(L, B, T, TD.fountain); occDisc(TD.fountain.x, TD.fountain.z, 1.6); }
    for (const w of TD.wells) { townWell(L, B, T, w); occDisc(w.x, w.z, 1.2); }
    TD.stalls.forEach((st, i) => {   // bunting from stall to stall along the market's rim
      const q = TD.stalls[i + 1];
      if (!q || hyp(q.x - st.x, q.z - st.z) > 9) return;
      const f = (o, s2) => ({ x: o.x + Math.sin(o.yaw) * 0.4 + Math.cos(o.yaw) * 0.96 * s2, z: o.z + Math.cos(o.yaw) * 0.4 - Math.sin(o.yaw) * 0.96 * s2 });
      const a = f(st, 1), b = f(q, -1);
      bunting(B, a.x, 2.05, a.z, b.x, 2.05, b.z, i * 3);
    });
    for (const st of TD.stalls) {
      putD(B, stallData(st.v % 4), mat4(st.x, 0, st.z, st.yaw));
      occDisc(st.x, st.z, 1.4); RS.stalls = (RS.stalls || 0) + 1;
      const sx = Math.cos(st.yaw), sz = -Math.sin(st.yaw);   // a crate or basket at its side
      if (rnd() < 0.7) { const x = st.x + sx * 1.35, z = st.z + sz * 1.35, c = cellOf(x, z); if (c >= 0 && !grid[c] && !occAt(x, z)) putD(B, barrelsData(1), mat4(x, 0, z, st.yaw + 0.3, 0.75)); }   // (off the floor only: no solid needed)
    }
    // along the kerb, on the garden side: walk the edge loops, a piece every few metres where there is room
    const path = L.path, pathD = (x, z) => { let d = 1e9; for (let s = 1; s < path.length; s++) d = Math.min(d, segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z)); return d; };
    const houseNear = (x, z, r) => T.houses.some(h => hyp(h.x - x, h.z - z) < r);
    // the way out of every front door (from its step 1.3 m out, 1.16 m wide): no lantern post or furniture on it
    const doors = T.houses.map(h => { const cs = Math.cos(h.yaw), sn = Math.sin(h.yaw), at = lz => ({ x: h.x + cs * h.door + sn * lz, z: h.z - sn * h.door + cs * lz }); return [at(0.2), at(1.5)]; });
    const atDoor = (x, z, r) => doors.some(([p, q]) => segDist(x, z, p.x, p.z, q.x, q.z) < 0.58 + r);
    let sinceLamp = 3, sinceF = 2;
    for (const pts of T.edgeLoops || []) for (let i = 0; i < pts.length - 2; i += 2) {
      const a = pts[i], c = pts[i + 2], dx = c.x - a.x, dz = c.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l, nz = dx / l;   // (outward: the garden)
      sinceLamp -= 0.5; sinceF -= 0.5;
      const pd = pathD(a.x, a.z);
      if (sinceLamp <= 0 && pd < 7) {   // lantern posts along the route
        const x = a.x + nx * 0.5, z = a.z + nz * 0.5, cc = cellOf(x, z);
        if (cc >= 0 && !grid[cc] && !occAt(x, z) && nearLiq(x, z, 0.4) < 0.1 && !atDoor(x, z, 0.7) && !hides(L, x, z, 0.2, 0, 3.1, 0.12) && 3.1 <= capAt(gapAt(x, z)) + 2.2) {
          putFurn(B, 'lamp', x, z, 0, 0); occDisc(x, z, 0.4); RS.lampPosts = (RS.lampPosts || 0) + 1; sinceLamp = 8 + rnd() * 3; sinceF = Math.max(sinceF, 1.2); T.lamps.push({ x, z });
          continue;
        }
      }
      if (sinceF > 0) continue;
      const roll = rnd(), id = roll < 0.24 ? 'bench' : roll < 0.38 ? 'hay' : roll < 0.5 ? 'cart' : roll < 0.7 ? 'tree' : roll < 0.84 ? 'bed' : 'barrels', F = TFURN[id];
      const o = F.r + 0.35 + rnd() * 0.3, x = a.x + nx * o, z = a.z + nz * o, cc = cellOf(x, z);
      if (cc < 0 || grid[cc] || dF[cc] < F.r * 0.6 || nearLiq(x, z, F.r + 0.2) > 0.1 || T.outAt(x, z) > 0.3 || T.reserve(x, z)) { sinceF = 0.5; continue; }
      let hit = false;
      for (let k = 0; k < 8 && !hit; k++) { const qx = x + Math.cos(k * 0.785) * F.r * 0.9, qz = z + Math.sin(k * 0.785) * F.r * 0.9, qc = cellOf(qx, qz); if (qc < 0 || grid[qc] || occAt(qx, qz)) hit = true; }
      if (hit || occAt(x, z) || atDoor(x, z, F.r + 0.15) || F.h > capAt(gapAt(x, z)) + (id === 'tree' ? 0 : 0.35) || hides(L, x, z, F.r * 0.8, 0, F.h, 0.12)) { sinceF = 0.5; continue; }
      if ((id === 'barrels' || id === 'cart') && !houseNear(x, z, 5)) { sinceF = 0.5; continue; }   // (barrels and carts stand by the houses)
      putFurn(B, id, x, z, Math.atan2(-nx, -nz) + (id === 'bench' ? 0 : (rnd() - 0.5) * 1.2), Math.floor(rnd() * 3));
      occDisc(x, z, F.r + 0.15); RS.furn = (RS.furn || 0) + 1;
      sinceF = 3 + rnd() * 4.5;
    }
    // in the rooms, against a wall (never in a corridor, never hiding floor, a real gap or none): potted trees and benches, blocking
    const roomSpot = (x, z, r, h) => !T.inArena(x, z, -1.5) && linkDist(L, x, z) >= 2.5 && gapOKL(L, x, z, r) && hiddenBehind(L, x, z, r, h) === 0 &&
      !L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + r + 1.1) && !L.spawns.some(q => hyp(q.x - x, q.z - z) < 1.6) &&
      !L.chests.some(q => hyp(q.x - x, q.z - z) < 2.5) && !L.checkpoints.some(q => hyp(q.x - x, q.z - z) < 3) && !(L.exit && hyp(L.exit.x - x, L.exit.z - z) < 4) &&
      !L.path.some(p => hyp(p.x - x, p.z - z) < 2.8) && hyp(x - L.start.x, z - L.start.z) > 2.5 && !occAt(x, z) && !atDoor(x, z, r + 0.2);
    for (let n = 0, made = 0; n < W * H / 4 && made < 14; n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || !grid[c] || L.dWall[c] > 1.4 || L.dWall[c] < 0.8) continue;
      const tree = rnd() < 0.6, r = tree ? 0.6 : 0.5, h = tree ? 2.6 : 0.95;
      if (!roomSpot(x, z, r, h)) continue;
      let wx = 0, wz = 0;   // face away from the nearest wall
      for (let k = 0; k < 8; k++) { const ax = Math.cos(k * 0.785), az = Math.sin(k * 0.785); if (!isFloor(L, x + ax * 1.6, z + az * 1.6)) { wx -= ax; wz -= az; } }
      const yaw = Math.atan2(wx, wz), v = Math.floor(rnd() * 3), m = mat4(x, 0, z, yaw);
      propSolid(L, x, z, r, 'town', putD(B, tree ? potTreeData(v) : benchData(), m));
      occDisc(x, z, r + 0.2); made++; RS.inRoom = made;
    }
  }
  // ── Veba Şehri: walk-over decor on the squares (flat or tiny: it blocks nothing and hides nothing; never in İnfaz Meydanı, where
  // the knight charges) ──
  // A round mosaic inlay set into the pavers (local: flat on the ground, radius 1.25): 0 the town's smiling sun · 1 a compass star ·
  // 2 a big flower. Layers 2 mm apart (no z-fighting), all 'decor' (merged)
  const MUP = [-Math.PI / 2, 0, 0];
  function starShape(n, r1, r2) {
    const key = 'tStar' + n + '_' + r2;
    if (R.geo[key]) return R.geo[key];
    const sh = new THREE.Shape();
    for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    return (R.geo[key] = keep(new THREE.ShapeGeometry(sh)));
  }
  function mosaicGeo(v) { const key='tMosaic'+(v%3);if(R.geo[key])return R.geo[key];const k=new Kit();k.add(starShape(4,1.12,0.72),0x57504a,[0,0.012,0],MUP);k.add(G.box(),0x843f39,[0,0.025,0],0,[0.1,0.012,1.4]);k.add(G.box(),0x843f39,[0,0.027,-0.2],0,[0.72,0.012,0.1]);return (R.geo[key]=keep(k.build()));
  }
  // Chalk hopscotch (local: flat, from z = 0 to -3.4, the "sky" arch at the far end) with a chalk sun beside it, pastel chalk lines
  function hopscotchGeo() {
    if(R.geo.tHop)return R.geo.tHop;const k=new Kit();
    // Scratched quarantine count: the memory of children's chalk remains, but the cheerful sun is gone.
    for(let group=0;group<3;group++){for(let i=0;i<4;i++)k.add(G.box(),0x9c927e,[(i-1.5)*.14,.016,-group*.61],0,[.027,.01,.38]);k.add(G.box(),0x917e65,[0,.018,-group*.61],[0,.78,0],[.63,.01,.025]);}
    k.add(G.box(),0x894b3d,[0,.019,-2.3],0,[.06,.012,.55]);k.add(G.box(),0x894b3d,[0,.02,-2.43],0,[.35,.012,.055]);return(R.geo.tHop=keep(k.build()));
  }
  // A plump little pigeon pecking about (local: facing +z; uv 50: it bobs and shuffles like the ducks): 0 grey · 1 white · 2 lavender
  function pigeonGeo(v) {
    const key='tPigeon'+v;if(R.geo[key])return R.geo[key];const k=new Kit(),feather=0x504740;
    k.add(G.sphere(10,8),feather,[0,.16,0],[-.15,0,0],[.17,.15,.27]);
    k.add(G.octa(),0x312a26,[0,.17,-.29],[-.3,0,0],[.09,.04,.15]);
    k.add(G.sphere(10,8),0x3b332e,[0,.32,.15],0,[.12,.13,.12]);
    k.add(G.cone(5),0x8f7a5c,[0,.29,.31],[Math.PI/2,0,0],[.04,.15,.035]);
    for(const sd of [-1,1]){k.add(G.octa(),0x403832,[sd*.14,.17,-.04],[0,0,sd*.18],[.04,.1,.2]);k.add(G.sphere(6,4),0xae9a72,[sd*.086,.34,.23],0,.012);k.seg([sd*.06,.03,.03],[sd*.06,.1,.01],.009,0x78614a,.009,4);}
    return(R.geo[key]=keep(k.build()));
  }
  // Per square (not İnfaz Meydanı): the inlay in the middle of its paver disc, a few petal scatters by its rim; pigeons pecking in
  // two squares, chalk hopscotch in one (each where it touches no solid, on floor, clear of the checkpoints, chests and the start)
  function townPlazas(L, B, T) {
    const { rnd, RS } = T, path = L.path, TD = L.town || {};
    const pathD = (x, z) => { let d = 1e9; for (let s = 1; s < path.length; s++) d = Math.min(d, segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z)); return d; };
    const clear = (x, z, r) => !L.solids.some(q => q.alive !== false && hyp(q.x - x, q.z - z) < q.r + r) && !L.checkpoints.some(q => hyp(q.x - x, q.z - z) < r + 1.9) &&
      !L.chests.some(q => hyp(q.x - x, q.z - z) < r + 1.1) && hyp(L.start.x - x, L.start.z - z) > r + 0.5 && !(L.exit && hyp(L.exit.x - x, L.exit.z - z) < r + 3);
    let nMo = 0, nPet = 0, nPig = 0, hop = 0;
    const rooms = L.rooms.filter(rm => rm.kind !== 'boss' && rm.r);
    rooms.forEach((rm, i) => {
      const dr = rm.r * (rm.kind === 'side' ? 0.5 : 0.6), R0 = Math.min(1.35, dr - 0.8);
      if (R0 >= 0.85 && gridFree(L, rm.x, rm.z, R0 + 0.1) && clear(rm.x, rm.z, R0 + 0.15)) { dec(B, 'decor', mosaicGeo(i), mat4(rm.x, 0, rm.z, (rnd() - 0.5) * 0.3, R0 / 1.25), null); nMo++; }
      for (let c = 0, made = 0; c < 10 && made < 2; c++) {   // petals blown onto the pavers
        const a = rnd() * TAU, d = dr * (0.75 + rnd() * 0.2), x = rm.x + Math.cos(a) * d, z = rm.z + Math.sin(a) * d;
        if (!gridFree(L, x, z, 0.7) || !clear(x, z, 0.5)) continue;
        const col = [0x69464e, 0x656e7c, 0x744d55][made % 3];
        for (let p = 0, np = 14 + Math.floor(rnd() * 8); p < np; p++) { const pa = rnd() * TAU, pr = Math.sqrt(rnd()) * 0.7; dec(B, 'decor', G.octa(), mat4(x + Math.cos(pa) * pr, 0.012, z + Math.sin(pa) * pr, rnd() * TAU, 0.085, 0.004, 0.055), lin(p % 4 ? col : 0x59616e)); }
        made++; nPet++;
      }
    });
    // pigeons: a little flock of 3–4 in the market square and one more square, off the route
    const flocks = rooms.filter(rm => rm.kind === 'main').sort((a, b) => (L.rooms.indexOf(b) === TD.market) - (L.rooms.indexOf(a) === TD.market) || b.r - a.r).slice(0, 2);
    for (const rm of flocks) for (let t = 0; t < 30; t++) {
      const a = rnd() * TAU, d = rm.r * (0.3 + rnd() * 0.45), x = rm.x + Math.cos(a) * d, z = rm.z + Math.sin(a) * d;
      if (!gridFree(L, x, z, 1.0) || !clear(x, z, 0.9) || pathD(x, z) < 1.8) continue;
      for (let p = 0, np = 3 + Math.floor(rnd() * 2); p < np; p++) { const pa = p * 2.1 + rnd(), pr = p ? 0.35 + rnd() * 0.3 : 0; dec(B, 'decor', pigeonGeo(p + nPig), mat4(x + Math.cos(pa) * pr, 0, z + Math.sin(pa) * pr, rnd() * TAU, 1.1), null).item.uy = rnd() * 60; }
      nPig++;
      break;
    }
    // chalk hopscotch in a quiet square (not the market or the fountain's), its "sky" end to the north
    for (const rm of rooms.filter(r => r.kind === 'main' && L.rooms.indexOf(r) !== TD.market && !(TD.fountain && L.rooms[TD.fountain.room] === r)).sort((a, b) => b.r - a.r)) {
      for (let t = 0; t < 40 && !hop; t++) {
        const a = rnd() * TAU, d = rm.r * (0.2 + rnd() * 0.5), x = rm.x + Math.cos(a) * d, z = rm.z + Math.sin(a) * d + 1.7;
        let ok = pathD(x, z - 1.7) >= 1.6;
        for (let s = 0; s <= 4 && ok; s++) { const qz = z - s * 0.85, qx = x + 0.45; if (!gridFree(L, qx, qz, 0.75) || !clear(qx, qz, 0.7)) ok = false; }
        if (!ok) continue;
        dec(B, 'decor', hopscotchGeo(), mat4(x, 0, z, 0), null); hop = 1;
      }
      if (hop) break;
    }
    Object.assign(RS, { mosaics: nMo, petals: nPet, pigeons: nPig, hopscotch: hop });
  }
  // ── Veba Şehri: İnfaz Meydanı, the dragon's castle, gardens, bunting, the water's ducks and lily pads ──
  // A round striped tournament tent (local: the door toward +z): a striped wall, a striped cone, a scalloped valance, a pole with a
  // pennant. v: the colours (blue / yellow · red / white · green / white · purple / yellow)
  function tentData(v) {
    const key = 'tTent' + v;
    if (R.geo[key]) return R.geo[key];
    const K = kits('decor', 'prop', 'shiny'), c = [[0x3d424b, 0x714b53], [0x4a343a, 0x656f7d], [0x3c414a, 0x656f7d], [0x50373e, 0x714b53]][v % 4], ns = 12;
    for (let i = 0; i < ns; i++) {
      const col = i % 2 ? c[1] : c[0], t0 = i / ns * TAU, tl = TAU / ns;
      K.decor.add(R.geo['tTW' + i] || (R.geo['tTW' + i] = keep(new THREE.CylinderGeometry(1, 1.04, 1, 3, 1, true, t0, tl))), col, [0, 0.85, 0], 0, [1, 1.7, 1]);
      K.decor.add(R.geo['tTR' + i] || (R.geo['tTR' + i] = keep(new THREE.CylinderGeometry(0.04, 1.16, 1, 3, 1, true, t0, tl))), col, [0, 1.7 + 0.95, 0], 0, [1, 1.9, 1]);
      K.decor.add(G.sphere(8, 6), i % 2 ? c[0] : c[1], [Math.sin(t0 + tl / 2) * 1.12, 1.66, Math.cos(t0 + tl / 2) * 1.12], [0, t0 + tl / 2, 0], [0.3, 0.2, 0.04]);   // the scalloped valance
    }
    K.decor.add(G.box(), 0x302429, [0, 0.72, 1.02], 0, [0.62, 1.4, 0.04]);   // the dark door flap opening
    K.prop.add(G.cyl(1, 1, 6), 0x5d3f46, [0, 3.95, 0], 0, [0.035, 0.7, 0.035]);
    K.shiny.add(G.sphere(8, 6), 0x6f4951, [0, 4.32, 0], 0, 0.07);
    return (R.geo[key] = buildKits(K));
  }
  // A string of bunting between two points (a gentle sag), triangle flags in the town's colours fluttering (decor, merged)
  const BUNT = [0x4d353c, 0x6e4951, 0x3d424b, 0x3c414a, 0x6a474f, 0x5f4047];
  function bunting(B, ax, ay, az, bx, by, bz, ph = 0) {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz), sag = 0.35 + 0.05 * l, ya = Math.atan2(-dz, dx), n = Math.max(2, Math.round(l / 0.9));
    const at = t => [lerp(ax, bx, t), lerp(ay, by, t) - sag * 4 * t * (1 - t), lerp(az, bz, t)];
    for (let i = 0; i < n; i++) {   // the string: short straight pieces
      const p = at(i / n), q = at((i + 1) / n), m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], sl = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      dec(B, 'decor', G.cyl(1, 1, 4), mat4(m[0], m[1], m[2], ya, 0.012, sl, 0.012, 0, Math.PI / 2 + Math.atan2(q[1] - p[1], Math.hypot(q[0] - p[0], q[2] - p[2]))), lin(0x636c7a));
    }
    for (let s = 0.3, k = Math.floor(ph); s < l - 0.3; s += 0.46, k++) {
      const t = s / l, p = at(t), t2 = (s + 0.38) / l, q = at(Math.min(1, t2)), tilt = Math.atan2(q[1] - p[1], 0.38);
      dec(B, 'decor', flagGeo(0), mat4(p[0], p[1], p[2], ya, 0.8, 0.8, 1, 0, tilt), lin(BUNT[k % BUNT.length]));
    }
  }
  // İnfaz Meydanı: striped tents round the rim (never hiding floor), tall pennant poles with bunting between them, low wooden
  // stands with striped hangings on the camera side, a rack of soft jousting lances, an archery target, hay and barrels
  function townArena(L, B, T) {
    const { rnd, V, cellOf, occAt, occDisc, gapAt, capAt, RS } = T, ar = V.arena;
    if (!ar) return;
    const edge = a => arenaEdge(L, ar, a, 6);
    const ex = L.exit;
    // tents: east / west and the northern corners
    const tents = [];
    for (const a0 of [0.15, Math.PI - 0.15, -0.75, -Math.PI + 0.75, 0.75, Math.PI - 0.75]) {
      if (tents.length >= 4) break;
      for (const da of [0, 0.18, -0.18, 0.35, -0.35]) {
        const e = edge(a0 + da);
        if (!e) continue;
        const s = 0.95 + rnd() * 0.2, x = e.x + e.dx * (1.5 * s + 0.6), z = e.z + e.dz * (1.5 * s + 0.6), c = cellOf(x, z);
        if (c < 0 || L.grid[c] || occAt(x, z) || (ex && hyp(ex.x - x, ex.z - z) < 5.5) || T.nearLiq(x, z, 1.8 * s) > 0.1 || hides(L, x, z, 1.4 * s, 0, 4.1 * s, 0.25) || tents.some(t => hyp(t.x - x, t.z - z) < 4.5)) continue;
        putD(B, tentData(tents.length), mat4(x, 0, z, Math.atan2(-e.dx, -e.dz), s));
        dec(B, 'decor', flagGeo(1), mat4(x, 4.3 * s, z, rnd() * TAU, 0.8), lin(BUNT[(tents.length * 2 + 1) % BUNT.length]));
        occDisc(x, z, 1.5 * s + 0.3); tents.push({ x, z, e }); RS.tents = tents.length;
        break;
      }
    }
    // pennant poles round the north, east and west rim (≈ every 0.36 rad; the stands keep the south), bunting from pole to pole
    const poles = [], nearGate = (x, z) => !!ex && (hyp(ex.x - x, ex.z - z) < 3.5 || [-1, 1].some(sd => hyp(ex.x + sd * 2.85 - x, ex.z - 0.25 - z) < 1.9));
    for (let a = -Math.PI / 2 + 0.3 + rnd() * 0.12; a < TAU - Math.PI / 2 - 0.3; a += 0.36) {
      if (Math.abs(angDiff(a, Math.PI / 2)) < 1.05) { poles.push(null); continue; }   // (the stands' side)
      let e = null, x = 0, z = 0, h = 0;   // (just off the rim, else a little closer to it or a step to a side: the ring wall and the tents stand close by)
      for (const [da, o] of [[0, 0.55], [0.09, 0.55], [-0.09, 0.55], [0, 0.32], [0.09, 0.32], [-0.09, 0.32]]) {
        const q = edge(a + da);
        if (!q) continue;
        const qx = q.x + q.dx * o, qz = q.z + q.dz * o, c = cellOf(qx, qz);
        if (c < 0 || L.grid[c] || occAt(qx, qz) || T.nearLiq(qx, qz, 0.3) > 0.1 || nearGate(qx, qz)) continue;
        let qh = q.dz > 0.6 ? 2.4 : 4.6;
        while (qh > 1.8 && hides(L, qx, qz, 0.1, 0, qh + 0.3, 0.08)) qh -= 0.6;
        if (qh > 1.8) { e = q; x = qx; z = qz; h = qh; break; }
      }
      if (!e) { poles.push(null); continue; }
      const south = e.dz > 0.6;
      dec(B, 'prop', G.cyl(0.8, 1, 8), mat4(x, h / 2, z, 0, 0.07, h, 0.07), lin(0x636c7a));
      for (let y = 0.4; y < h - 0.3; y += 0.5) dec(B, 'decor', G.torus(TAU, 0.2, 10), mat4(x, y, z, 0, 0.075, 0.075, 0.075, Math.PI / 2), lin(0x4d353c));   // red stripes wound round it
      dec(B, 'shiny', G.sphere(8, 6), mat4(x, h + 0.06, z, 0, 0.1), lin(0x6f4951));
      {   // the pennant blows toward the arena, else away from it or along the rim: wherever it hides no floor (camera rule)
        const fs = south ? 0.7 : 1.05, y0 = Math.atan2(e.dz, -e.dx) + (rnd() - 0.5) * 0.6;
        for (const dy of [0, Math.PI, Math.PI / 2, -Math.PI / 2]) {
          const fx = x + Math.cos(y0 + dy) * 0.5 * fs, fz = z - Math.sin(y0 + dy) * 0.5 * fs;   // (the flag's middle: local +x turned by the yaw)
          if (hides(L, fx, fz, 0.55 * fs, h - 0.45, h + 0.1, 0.05)) continue;
          dec(B, 'decor', flagGeo(1), mat4(x, h - 0.05, z, y0 + dy, fs), lin(BUNT[poles.length % BUNT.length]));
          break;
        }
      }
      occDisc(x, z, 0.3);
      poles.push({ x, z, h });
    }
    for (let i = 1; i < poles.length; i++) { const p = poles[i - 1], q = poles[i]; if (p && q && hyp(p.x - q.x, p.z - q.z) < 8) bunting(B, p.x, p.h - 0.35, p.z, q.x, q.h - 0.35, q.z, i * 2); }
    RS.poles = poles.filter(Boolean).length;
    // the stands on the camera side: two long low wooden benches following the rim (planks on posts), a striped cloth hung along
    // the front one, little round cushions, a small flag now and then on the back one
    let nStand = 0;
    const rows = [[1.05, 0.3], [1.85, 0.56]], sa = [];
    for (let a = Math.PI / 2 - 0.85; a <= Math.PI / 2 + 0.95; a += 0.1) { const e = edge(a); sa.push(e ? { a, r: e.r } : null); }
    const sr = sa.map((q, i) => { if (!q) return null; let t = 0, w = 0; for (let d = -2; d <= 2; d++) { const o = sa[i + d]; if (o) { t += o.r; w++; } } return t / w; });   // (the rim's radius, smoothed)
    const sp = (i, o) => ({ x: ar.x + Math.cos(sa[i].a) * (sr[i] + o), z: ar.z + Math.sin(sa[i].a) * (sr[i] + o) });
    for (let i = 0; i + 1 < sa.length; i++) {
      if (!sa[i] || !sa[i + 1]) continue;
      const e = { dx: Math.cos(sa[i].a + 0.05), dz: Math.sin(sa[i].a + 0.05) };
      let ok = true;
      const seg = rows.map(([o, y]) => {
        const A = sp(i, o), Bq = sp(i + 1, o), ax = A.x, az = A.z, bx = Bq.x, bz = Bq.z, x = (ax + bx) / 2, z = (az + bz) / 2, c = cellOf(x, z);
        if (c < 0 || L.grid[c] || occAt(x, z) || T.nearLiq(x, z, 0.4) > 0.1 || y + 0.1 > capAt(gapAt(x, z)) + 0.05) ok = false;
        return { x, z, y, l: hyp(bx - ax, bz - az) + 0.04, ya: Math.atan2(bx - ax, bz - az) };
      });
      if (!ok) continue;
      for (const q of seg) {
        dec(B, 'prop', G.box(), mat4(q.x, q.y - 0.03, q.z, q.ya, 0.62, 0.07, q.l), lin(0x704b53));
        dec(B, 'prop', G.box(), mat4(q.x, (q.y - 0.06) / 2, q.z, q.ya, 0.5, q.y - 0.06, 0.1), lin(0x553a41));
        if (nStand % 2) dec(B, 'gloss', G.sphere(10, 6), mat4(q.x, q.y + 0.04, q.z, 0, 0.2, 0.06, 0.2), lin(BUNT[(nStand + Math.round(q.y * 10)) % BUNT.length]));
      }
      const f = seg[0], q2 = seg[1];
      dec(B, 'decor', G.box(), mat4(f.x - e.dx * 0.32, 0.15, f.z - e.dz * 0.32, f.ya, 0.02, 0.26, f.l), lin(nStand % 2 ? 0x656f7d : 0x4d353c));   // the striped hangings: in front…
      dec(B, 'decor', G.box(), mat4(q2.x + e.dx * 0.32, q2.y * 0.5, q2.z + e.dz * 0.32, q2.ya, 0.02, q2.y - 0.02, q2.l), lin(nStand % 2 ? 0x3d424b : 0x6e4951));   // …and on the back (the camera's side)
      if (nStand % 3 === 1) { const px = q2.x + e.dx * 0.34, pz = q2.z + e.dz * 0.34; dec(B, 'prop', G.cyl(1, 1, 6), mat4(px, 0.95, pz, 0, 0.025, 0.9, 0.025), lin(0x636c7a)); dec(B, 'decor', flagGeo(1), mat4(px, 1.38, pz, f.ya - Math.PI / 2 + (rnd() - 0.5) * 0.6, 0.55), lin(BUNT[(nStand / 3 | 0) % BUNT.length])); }
      for (const q of seg) occDisc(q.x, q.z, 0.65);
      nStand++;
    }
    RS.stands = nStand;
    // beside a tent: a rack of soft jousting lances (striped poles, round padded tips), an archery target, hay and a barrel
    const t0 = tents[0], t1 = tents[1];
    if (t0) {
      const bx = t0.x - t0.e.dz * 2.1, bz = t0.z + t0.e.dx * 2.1, c = cellOf(bx, bz);
      if (c >= 0 && !L.grid[c] && !occAt(bx, bz) && !hides(L, bx, bz, 0.8, 0, 2.3, 0.15)) {
        const M = mat4(bx, 0, bz, Math.atan2(-t0.e.dx, -t0.e.dz)), put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
        for (const sx of [-0.7, 0.7]) put('prop', G.box(), mat4(sx, 0.55, 0, 0, 0.08, 1.1, 0.08), lin(0x553a41));
        put('prop', G.box(), mat4(0, 1.05, 0, 0, 1.6, 0.08, 0.1), lin(0x553a41));
        for (let i = 0; i < 4; i++) {
          const x = (i - 1.5) * 0.36;
          put('decor', G.cyl(1, 1, 8), mat4(x, 1.1, -0.18, 0, 0.04, 2.2, 0.04, -0.2), lin(i % 2 ? 0x3d424b : 0x4d353c));
          put('gloss', G.sphere(12, 8), mat4(x, 2.2, -0.4, 0, 0.13), lin(0x656f7d));
        }
        occDisc(bx, bz, 1.0);
      }
    }
    if (t1) {
      const bx = t1.x + t1.e.dz * 2.2, bz = t1.z - t1.e.dx * 2.2, c = cellOf(bx, bz);
      if (c >= 0 && !L.grid[c] && !occAt(bx, bz) && !hides(L, bx, bz, 0.6, 0, 1.8, 0.15)) {
        const M = mat4(bx, 0, bz, Math.atan2(-t1.e.dx, -t1.e.dz)), put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(M, m), col);
        for (const sx of [-0.35, 0.35]) put('prop', G.box(), mat4(sx, 0.7, -0.12, 0, 0.07, 1.4, 0.07, -0.18), lin(0x553a41));
        for (const [r, col] of [[0.58, 0x656f7d], [0.46, 0x4d353c], [0.34, 0x656f7d], [0.22, 0x4d353c], [0.1, 0x6e4951]]) put('decor', G.cyl(1, 1, 24), mat4(0, 1.2, 0.02 + (0.6 - r) * 0.02, 0, r, 0.05, r, Math.PI / 2 - 0.18), lin(col));
        put('decor', G.cyl(1, 1, 24), mat4(0, 1.2, -0.02, 0, 0.62, 0.08, 0.62, Math.PI / 2 - 0.18), lin(0x6c4850));   // straw back
        occDisc(bx, bz, 0.8);
      }
    }
    for (const t of tents) {   // hay and a barrel at a tent's side
      const x = t.x + t.e.dz * 2.0, z = t.z - t.e.dx * 2.0, c = cellOf(x, z);
      if (c >= 0 && !L.grid[c] && !occAt(x, z) && !hides(L, x, z, 0.9, 0, 1.4, 0.15)) { putFurn(B, rnd() < 0.5 ? 'hay' : 'barrels', x, z, rnd() * TAU, 0, 0.85); occDisc(x, z, 1.0); }
    }
    glowAt(B, ar.x, ar.z, ar.r * 0.8, 0x616b78, 0.06);
    // the town's crest painted big in the middle of the ground (flat: the knight rides over it)
    const em = R.mat.tEmblem || (R.mat.tEmblem = keep(new THREE.MeshStandardMaterial({ map: arenaEmblemTex(), transparent: true, depthWrite: false, roughness: 0.6, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    const e = new THREE.Mesh(R.geo.tEmblem || (R.geo.tEmblem = keep(new THREE.PlaneGeometry(7.2, 7.2).rotateX(-Math.PI / 2))), em);
    e.position.set(ar.x, 0.012, ar.z); e.receiveShadow = true; e.renderOrder = 1; e.name = 'arena-emblem';
    B.g.add(e);
  }
  // İnfaz Meydanı's cracked blood oath, painted over the former civic mosaic
  function arenaEmblemTex() {
    return R.tex.tEmblem || (R.tex.tEmblem = canvasTex(512,512,(g,w)=>{
      const c=w/2,rnd=mulberry32(7094);
      // The former civic emblem has become a worn execution seal. Dimensions and material stay identical.
      for(let k=0;k<16;k++){
        g.fillStyle=k%2?'rgba(132,92,65,0.88)':'rgba(168,157,135,0.86)';
        g.beginPath();g.arc(c,c,244,k/16*TAU,(k+1)/16*TAU);g.arc(c,c,170,(k+1)/16*TAU,k/16*TAU,true);g.closePath();g.fill();
      }
      g.strokeStyle='rgba(190,176,145,0.87)';g.lineWidth=8;for(const r of [246,168]){g.beginPath();g.arc(c,c,r,0,TAU);g.stroke();}
      g.fillStyle='rgba(74,67,58,0.58)';g.beginPath();g.arc(c,c,164,0,TAU);g.fill();
      g.strokeStyle='rgba(119,55,43,0.94)';g.lineWidth=24;g.lineCap='square';g.lineJoin='miter';
      g.beginPath();g.moveTo(c,122);g.lineTo(c,382);g.moveTo(157,211);g.lineTo(354,211);g.moveTo(181,318);g.lineTo(c,388);g.lineTo(333,318);g.stroke();
      // Broken oath notches around the rim, interrupted by irregular cracks and worn paint.
      g.strokeStyle='rgba(76,64,51,0.85)';g.lineWidth=5;
      for(let k=0;k<16;k++){const a=(k+.5)/16*TAU;g.beginPath();g.moveTo(c+Math.cos(a)*197,c+Math.sin(a)*197);g.lineTo(c+Math.cos(a)*230,c+Math.sin(a)*230);g.stroke();}
      g.strokeStyle='rgba(36,30,26,0.86)';g.lineWidth=3;
      for(let k=0;k<7;k++){const a=rnd()*TAU,r=176+rnd()*62;g.beginPath();g.moveTo(c+Math.cos(a)*r,c+Math.sin(a)*r);for(let j=0;j<4;j++){const rr=r-j*(13+rnd()*8),aa=a+(rnd()-.5)*.2;g.lineTo(c+Math.cos(aa)*rr,c+Math.sin(aa)*rr);}g.stroke();}
      for(let k=0;k<90;k++){const a=rnd()*TAU,r=30+rnd()*210;g.fillStyle=k%3?'rgba(54,45,37,0.16)':'rgba(185,169,139,0.2)';g.fillRect(c+Math.cos(a)*r,c+Math.sin(a)*r,2+rnd()*7,1+rnd()*3);}
    }));
  }
  // The dragon's castle far to the north, beyond the city wall and the gate: a rocky hill with the castle on it — lavender brick
  // towers with purple cones and golden tips, pennants, a keep with a big roof, warm windows (decor only; the fog tints it)
  function townCastle(L, B, T) {
    const { rnd, V } = T, ar = V.arena;
    if (!ar) return;
    const cx = ar.x + (rnd() - 0.5) * 6, cz = ar.z - ar.r - 20, hy = 4.2;
    for (let i = 0; i < 7; i++) {   // the hill: big rounded rocks
      const a = i / 7 * TAU + rnd() * 0.4, r = i ? 5 + rnd() * 3 : 0, s = 6 + rnd() * 3;
      dec(B, 'rockN', rockGeo(i % 3), mat4(cx + Math.cos(a) * r, hy * 0.35, cz + Math.sin(a) * r * 0.8, rnd() * TAU, s, hy * (0.9 + rnd() * 0.3), s * 0.85), lin(pick3(rnd, 0x535b66, 0x4f5762, 0x565e6a)));
    }
    dec(B, 'rockN', rockGeo(1), mat4(cx, hy * 0.5, cz, 0.4, 9, hy * 1.1, 7.5), lin(0x515965));
    const put = (mk, geo, m, col) => dec(B, mk, geo, new THREE.Matrix4().multiplyMatrices(mat4(cx, hy + 0.2, cz), m), col);
    const tower = (x, z, r, h, roof) => {
      put('roofC', G.cyl(1, 1, 16), mat4(x, h / 2, z, 0, r, h, r), lin(0x5e6774));
      put('roofC', G.cyl(1, 0.9, 16), mat4(x, h + 0.2, z, 0, r + 0.25, 0.4, r + 0.25), lin(0x636c7a));
      put('roofNC', G.cone(16), mat4(x, h + 0.4 + r * 1.3, z, 0, r + 0.35, r * 2.6, r + 0.35), lin(roof));
      put('shiny', G.sphere(8, 6), mat4(x, h + 0.4 + r * 2.6 + 0.12, z, 0, 0.18), lin(0x6f4951));
      put('decor', flagGeo(1), mat4(x, h + 0.4 + r * 2.6 + 0.9, z, 0.5, 1.6), lin(0x68454d));
      put('prop', MK(G.cyl(1, 1, 6)), mat4(x, h + 0.4 + r * 2.6 + 0.5, z, 0, 0.04, 1.0, 0.04), lin(0x412e34));
      for (let k = 0; k < 2; k++) put('window', G.box(), mat4(x + Math.sin(0.3 + k * 0.5) * (r + 0.01), h * (0.45 + k * 0.25), z + Math.cos(0.3 + k * 0.5) * (r + 0.01), 0.3 + k * 0.5, 0.35, 0.6, 0.05), lin(0xffffff));
    };
    // the curtain wall ring with merlons, four corner towers, the keep with two slender towers, the gatehouse facing the town
    const cw = [[-6, -3], [6, -3], [6, 3.5], [-6, 3.5], [-6, -3]];
    for (let i = 1; i < cw.length; i++) {
      const [x0, z0] = cw[i - 1], [x1, z1] = cw[i], l = Math.hypot(x1 - x0, z1 - z0), ya = Math.atan2(x1 - x0, z1 - z0);
      put('roofC', G.box(), mat4((x0 + x1) / 2, 1.7, (z0 + z1) / 2, ya, 1.0, 3.4, l), lin(0x5b6471));
      for (let s = 0.5; s < l; s += 1.0) put('roofC', G.box(), mat4(lerp(x0, x1, s / l), 3.65, lerp(z0, z1, s / l), ya, 1.0, 0.5, 0.5), lin(0x616b78));
    }
    for (const [x, z] of [[-6, -3], [6, -3], [6, 3.5], [-6, 3.5]]) tower(x, z, 1.5, 6 + rnd() * 1.5, pick3(rnd, 0x4e363d, 0x543940, 0x3f444d));
    put('roofC', G.box(), mat4(0, 4.2, -0.3, 0, 6.2, 8.4, 4.4), lin(0x5f6976));
    const rs = boxUV(6.8, 0.2, 3.6, 2); B.tmpGeo.push(rs);
    for (const sd of [-1, 1]) put('roofNC', rs, mat4(0, 9.35, -0.3 + sd * 1.25, 0, 1, 1, 1, sd * 0.78, 0), lin(0x52383f));
    for (let k = 0; k < 6; k++) put('window', G.box(), mat4(-2.2 + (k % 3) * 2.2, 3 + (k / 3 | 0) * 2.6, 1.93, 0, 0.55, 0.9, 0.05), lin(0xffffff));
    tower(-2.4, -1.4, 1.05, 11.5, 0x543940); tower(2.6, -1.0, 1.1, 13.5, 0x4e363d);
    put('roofC', G.box(), mat4(0, 2.2, 3.9, 0, 3.0, 4.4, 1.6), lin(0x5e6774));
    put('decor', halfCyl(), mat4(0, 1.6, 4.72, Math.PI / 2, 0.8, 0.05, 0.8, 0, Math.PI / 2), lin(0x3a2a30));
    put('decor', G.box(), mat4(0, 0.8, 4.72, 0, 1.6, 1.6, 0.05), lin(0x3a2a30));
    put('shiny', crestGeo(), mat4(0, 3.5, 4.73, 0, 1.1), null);
    T.RS.castle = 1;
  }
  // Gardens on the grass: trees (round lollipop and blossom trees, now and then an oak; none on the camera side, never hiding floor),
  // low hedges and flowering bushes along the kerb, flower patches and grass tufts; the meadow outside the walls with a few trees
  function townGreen(L, B, T) {
    const { rnd, dF, cellOf, liqAt, nearLiq, outAt, gapAt, occAt, occDisc, RS } = T, W = L.W, H = L.H, grid = L.grid;
    const pal = { lolli: PAL.lolli, blossom: PAL.blossom, oak: PAL.green };
    let nTree = 0;
    for (let z0 = 0; z0 < H; z0 += 2.6) for (let x0 = 0; x0 < W; x0 += 2.6) {
      const x = x0 + rnd() * 2.4, z = z0 + rnd() * 2.4, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] < 1.6 || nearLiq(x, z, 1.6) > 0.05 || T.reserve(x, z)) continue;
      const out = outAt(x, z) > 0.5;
      if (out ? rnd() < 0.72 : rnd() < 0.25) continue;
      let blocked = false;
      for (let k = 0; k < 6 && !blocked; k++) if (occAt(x + Math.cos(k * 1.05) * 1.3, z + Math.sin(k * 1.05) * 1.3)) blocked = true;
      if (blocked || occAt(x, z)) continue;
      const g = gapAt(x, z), tCap = southCap(g, 0, 0);
      const sp = rnd() < 0.45 ? 'lolli' : rnd() < 0.6 ? 'blossom' : 'oak';
      for (const k of [0.8 + rnd() * 0.3, 0.62, 0.5, 0.42]) {
        const S = SPEC[sp], kk = out ? k * 1.25 : k;
        if (S.yt * kk > tCap || hides(L, x, z, S.cr * kk, S.yb * kk, S.yt * kk)) continue;
        inst(B, dF[c] > 4.5 ? sp + 'F' : sp, mat4(x, 0, z, rnd() * TAU, kk, kk * (0.92 + rnd() * 0.16), kk), lin(pick3(rnd, ...pal[sp].slice(0, 3)), 0.95 + rnd() * 0.1));   // (far from the streets: no shadow)
        occDisc(x, z, 1.2 * kk); nTree++;
        break;
      }
    }
    RS.trees = nTree;
    // along the kerb on the garden side: low hedges and flowering bushes, flower patches (not where the lanterns and benches stand)
    let nB = 0, nF = 0;
    for (const pts of T.edgeLoops || []) for (let i = 0; i < pts.length - 2; i += 3) {
      const a = pts[i], c = pts[i + 2], dx = c.x - a.x, dz = c.z - a.z, l = hyp(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      const o = 0.75 + rnd() * 0.5, x = a.x + nx * o, z = a.z + nz * o, cc = cellOf(x, z), roll = rnd();
      if (cc < 0 || grid[cc] || nearLiq(x, z, roll < 0.34 ? 0.8 : 0.35) > 0.05 || occAt(x, z) || B.noDec[cc]) continue;   // (flowers grow right down to the quays)
      const g = gapAt(x, z);
      if (roll < 0.34) {
        const k = 0.6 + rnd() * 0.25, ky = Math.min(k, southCap(g, 0.55, 0.95) / 1.05);
        if (ky < 0.35 || hides(L, x, z, 0.95 * k, 0, 1.05 * ky, 0.6) || [0, 1.57, 3.14, 4.71].some(a2 => occAt(x + Math.cos(a2) * 0.6 * k, z + Math.sin(a2) * 0.6 * k))) continue;
        addBush(B, mat4(x, 0, z, rnd() * TAU, k, ky, k), lin(pick3(rnd, ...PAL.green.slice(0, 3)), 0.92 + rnd() * 0.12), rnd() < 0.55);
        occDisc(x, z, 0.6 * k); nB++;
      } else if (roll < 0.62) {
        const ci = Math.floor(rnd() * FLOWER_COL.length);
        for (let m = 0, cnt = 4 + Math.floor(rnd() * 5); m < cnt; m++) { const px = x + (rnd() - 0.5) * 1.2, pz = z + (rnd() - 0.5) * 1.2, pc = cellOf(px, pz); if (pc >= 0 && !grid[pc] && T.nearLiq(px, pz, 0.25) < 0.02 && !occAt(px, pz)) dec(B, 'decor', flowerGeo(rnd() < 0.7 ? ci : Math.floor(rnd() * FLOWER_COL.length)), mat4(px, 0, pz, rnd() * TAU, 0.9 + rnd() * 0.4), null); }
        nF++;
      }
    }
    // grass tufts and lone daisies scattered over the gardens and the meadow
    for (let n = 0; n < W * H / 9; n++) {
      const x = rnd() * W, z = rnd() * H, c = cellOf(x, z);
      if (c < 0 || grid[c] || dF[c] < 0.6 || liqAt(x, z) > 0.02 || nearLiq(x, z, 0.5) > 0.05 || occAt(x, z) || B.noDec[c]) continue;
      if (rnd() < 0.8) dec(B, 'decor', tuftGeo(Math.floor(rnd() * 3)), mat4(x, 0, z, rnd() * TAU, 0.9 + rnd() * 0.5), null);
      else dec(B, 'decor', flowerGeo(rnd() < 0.6 ? 0 : 1), mat4(x, 0, z, rnd() * TAU, 0.7 + rnd() * 0.3), null);
    }
    RS.bushes = nB; RS.flowerBeds = nF;
  }
  for (const k of ['lolli', 'blossom', 'oak']) KIND[k + 'F'] = Object.assign({}, KIND[k], { shadow: false, proxy: null });   // the same trees, shadowless (the meadow, the back gardens)
  // A little duck (local: facing +z; the decor shader bobs it, uv 50): 0 a white mother duck · 1 a yellow duckling
  function duckGeo(v) {
 const key='tDuck'+v;if(R.geo[key])return R.geo[key];const k=new Kit();
 k.add(G.box(),0x786653,[0,0.035,0],[0,v*0.3,0],[0.29,0.07,0.62]);
 k.add(G.box(),0x504339,[0.09,0.035,0.06],[0,0.2,0],[0.08,0.06,0.45]);
 if(!v){k.add(G.octa(),0xa99477,[0,0.1,0.09],[0,0,0.05],[0.12,0.13,0.045]);for(const x of [-0.048,0.048])k.add(G.box(),0x42352c,[x,0.15,0.12],0,[0.035,0.019,0.01]);}
 return(R.geo[key]=keep(markUV(k.build(),50)));
  }
  function lilyGeo(v) {
 const key='tLily'+v;if(R.geo[key])return R.geo[key];const k=new Kit();
 k.add(G.octa(),0x655c48,[0,0,0],[0,0.4,0],[0.32,0.018,0.25]);
 k.add(G.octa(),0x7b7054,[0.11,0.002,0.06],[0,1.3,0],[0.21,0.012,0.14]);
 if(v)k.add(G.box(),0x9e8a6a,[0,0.035,0],0,[0.08,0.035,0.12]);
 return(R.geo[key]=keep(markUV(k.build(),50)));
  }
  // On the water: duck families paddling (a mother with 2–3 ducklings in a row), lily pads in the calmer shallows, sun glints
  function townWaterLife(L, B, T) {
    const { rnd, V, liqAt, RS } = T, W = L.W, H = L.H, wet = (x, z, r) => { if (liqAt(x, z) < 0.9) return false; for (let k = 0; k < 8; k++) if (liqAt(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r) < 0.8) return false; return true; };
    const y = -WD + 0.01, spots = [];
    for (let t = 0, fam = 0; t < 4000 && fam < 4; t++) {
      const x = rnd() * W, z = rnd() * H;
      if (!wet(x, z, 0.9) || spots.some(q => hyp(q.x - x, q.z - z) < 12)) continue;
      const yaw = rnd() * TAU, fx = Math.sin(yaw), fz = Math.cos(yaw), n = 2 + Math.floor(rnd() * 2);
      let ok = true;
      for (let i = 1; i <= n && ok; i++) if (!wet(x - fx * i * 0.55, z - fz * i * 0.55, 0.3)) ok = false;
      if (!ok) continue;
      spots.push({ x, z }); fam++;
      const ph = rnd() * 60;
      dec(B, 'gloss', duckGeo(0), mat4(x, y, z, yaw, 1.3), null).item.uy = ph;
      for (let i = 1; i <= n; i++) dec(B, 'gloss', duckGeo(1), mat4(x - fx * i * 0.55 + (rnd() - 0.5) * 0.1, y, z - fz * i * 0.55, yaw + (rnd() - 0.5) * 0.4, 0.75), null).item.uy = ph + i * 0.9;
      RS.ducks = fam;
    }
    for (let t = 0, n = 0; t < 5000 && n < 40; t++) {
      const x = rnd() * W, z = rnd() * H, lq = liqAt(x, z);
      if (lq < 0.9 || !wet(x, z, 0.35) || wet(x, z, 1.6) || spots.some(q => hyp(q.x - x, q.z - z) < 1.2)) continue;   // (the shallows by the quays)
      const cl = 1 + Math.floor(rnd() * 3);
      for (let m = 0; m < cl; m++) { const px = x + (rnd() - 0.5) * 0.9, pz = z + (rnd() - 0.5) * 0.9; if (liqAt(px, pz) > 0.9) { dec(B, 'decor', lilyGeo(rnd() < 0.3 ? 1 : 0), mat4(px, y, pz, rnd() * TAU, 0.8 + rnd() * 0.5), null).item.uy = rnd() * 60; n++; } }
      RS.lilies = n;
    }
    for (let t = 0, n = 0; t < 3000 && n < 70; t++) {   // sun glints dancing on the water
      const x = rnd() * W, z = rnd() * H;
      if (liqAt(x, z) < 0.9) continue;
      B.pts.add.push({ x, y: y + 0.03, z, kind: 8, ph: rnd(), size: 0.2 + rnd() * 0.1, prm: 0.4 + rnd() * 0.5, col: lin(0x646e7c, 1.5) });
      n++;
    }
  }
  // Bunting across the streets and squares: between the fronts of two houses facing each other over the floor (4.5–11 m apart), a
  // few between lantern posts; crest banners on some fronts round the squares
  function townBunting(L, B, T) {
    const { rnd, RS } = T, hs = T.houses.filter(h => h.st > 1), used = new Set(), path = L.path;
    const anchor = h => { const D = houseDims(h), y = D.top - 0.3, f = D.j + 0.08; return { x: h.x + Math.sin(h.yaw) * f, y, z: h.z + Math.cos(h.yaw) * f }; };
    const pathD = (x, z) => { let d = 1e9; for (let s = 1; s < path.length; s++) d = Math.min(d, segDist(x, z, path[s - 1].x, path[s - 1].z, path[s].x, path[s].z)); return d; };
    const byTower = (a, b) => (T.towers || []).some(t => segDist(t.x, t.z, a.x, a.z, b.x, b.z) < t.r + 0.45);   // (no string through a tower)
    const cand = [];
    for (let i = 0; i < hs.length; i++) for (let k = i + 1; k < hs.length; k++) {
      const a = anchor(hs[i]), b = anchor(hs[k]), d = hyp(a.x - b.x, a.z - b.z);
      if (d < 4.5 || d > 14) continue;
      const fa = [Math.sin(hs[i].yaw), Math.cos(hs[i].yaw)], fb = [Math.sin(hs[k].yaw), Math.cos(hs[k].yaw)], ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
      if (fa[0] * ux + fa[1] * uz < 0.35 || -(fb[0] * ux + fb[1] * uz) < 0.35) continue;   // (each front looks across at the other)
      let over = 0; for (let s = 0.15; s < 0.9; s += 0.15) if (isFloor(L, lerp(a.x, b.x, s), lerp(a.z, b.z, s))) over++;
      if (over < 3 || byTower(a, b)) continue;
      cand.push({ i, k, a, b, sc: pathD((a.x + b.x) / 2, (a.z + b.z) / 2) + rnd() * 3 });
    }
    T.lamps.forEach((lp, li) => {   // …and from a lantern post to a front or another post across the street
      const a = { x: lp.x, y: 2.5, z: lp.z };
      for (let k = 0; k < hs.length + T.lamps.length; k++) {
        const o = k < hs.length ? anchor(hs[k]) : T.lamps[k - hs.length], b = k < hs.length ? o : { x: o.x, y: 2.5, z: o.z }, d = hyp(a.x - b.x, a.z - b.z);
        if (o === lp || d < 3.5 || d > 9) continue;
        let over = 0; for (let s = 0.15; s < 0.9; s += 0.15) if (isFloor(L, lerp(a.x, b.x, s), lerp(a.z, b.z, s))) over++;
        if (over < 4 || byTower(a, b)) continue;
        cand.push({ i: 'L' + li, k: k < hs.length ? k : 'L' + (k - hs.length), a, b, sc: pathD((a.x + b.x) / 2, (a.z + b.z) / 2) + 1 + rnd() * 3 });
      }
    });
    cand.sort((p, q) => p.sc - q.sc);
    let n = 0;
    for (const c of cand) {
      if (n >= 22) break;
      if ((used.has(c.i) && used.has(c.k)) || cand.slice(0, cand.indexOf(c)).some(q => q.done && hyp((q.a.x + q.b.x) / 2 - (c.a.x + c.b.x) / 2, (q.a.z + q.b.z) / 2 - (c.a.z + c.b.z) / 2) < 3)) continue;
      bunting(B, c.a.x, c.a.y, c.a.z, c.b.x, c.b.y, c.b.z, n * 3); c.done = true; used.add(c.i); used.add(c.k); n++;
    }
    RS.bunting = n;
    // crest banners on some fronts near the route (hung from the upper storey)
    let nb = 0;
    for (const h of hs) {
      const D = houseDims(h), f = D.j + 0.07;
      if (nb >= 10 || used.has(hs.indexOf(h)) || pathD(h.x, h.z) > 6 || Math.floor((D.W2 - 0.2) / 1.45) !== 2 || rnd() < 0.4) continue;   // (between the two upper windows)
      B.banners.push({ x: h.x + Math.sin(h.yaw) * f, z: h.z + Math.cos(h.yaw) * f, y: D.top - 0.15, yaw: h.yaw, hue: 2 + (nb & 1), s: 0.72 });
      nb++;
    }
    RS.banners = nb;
  }
  // ── LEVEL.build for Veba Şehri ──
  function buildTown(L, B) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid, V = L._town || townField(L);
    const dF = L._dF = chamfer(W, H, grid, 1);
    const pick = a => a[Math.floor(rnd() * a.length)];
    const cellOf = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i < 0 || j < 0 || i >= W || j >= H ? -1 : j * W + i; };
    const liqAt = (x, z) => V.lava[clamp(Math.floor(z * V.P), 0, V.MH - 1) * V.MW + clamp(Math.floor(x * V.P), 0, V.MW - 1)];
    const nearLiq = (x, z, r) => { let m = liqAt(x, z); for (let k = 0; k < 8; k++) m = Math.max(m, liqAt(x + Math.cos(k * 0.785) * r, z + Math.sin(k * 0.785) * r)); return m; };
    const outAt = (x, z) => { const F = V.outF, fx = clamp(x - 0.5, 0, W - 1.001), fz = clamp(z - 0.5, 0, H - 1.001), i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j, k = j * W + i; return (F[k] * (1 - tx) + F[k + 1] * tx) * (1 - tz) + (F[k + W] * (1 - tx) + F[k + W + 1] * tx) * tz; };
    const gapAt = (x, z) => southGap(L, x, z), capAt = g => southCap(g, 0.62, 1.0);
    const ar = V.arena, inArena = (x, z, pad = 0) => !!ar && inRoom(ar, x, z, pad);
    const bridgeD = (x, z) => { let d = 1e9; for (const b of V.bridges) for (const q of b.pts) d = Math.min(d, hyp(q.x - x, q.z - z)); return d; };
    // 0.25 m cells taken by the houses, walls, towers, tents… (nothing big may overlap another)
    const OW = W * 4, OH = H * 4, occ = new Uint8Array(OW * OH);
    const occAt = (x, z) => { const i = Math.floor(x * 4), j = Math.floor(z * 4); return i < 0 || j < 0 || i >= OW || j >= OH ? 1 : occ[j * OW + i]; };
    const occDisc = (x, z, r) => { for (let j = Math.floor((z - r) * 4); j <= (z + r) * 4; j++) for (let i = Math.floor((x - r) * 4); i <= (x + r) * 4; i++) if (i >= 0 && j >= 0 && i < OW && j < OH && hyp((i + 0.5) / 4 - x, (j + 0.5) / 4 - z) < r) occ[j * OW + i] = 1; };
    const occRect = (fx, fz, yaw, w, d, f = 0) => {   // a rectangle w wide from f in front of (fx, fz) to d behind it (local −z), turned by yaw
      const cs = Math.cos(yaw), sn = Math.sin(yaw), R0 = Math.hypot(w / 2, Math.max(d, f)) + 0.3;
      for (let j = Math.floor((fz - R0) * 4); j <= (fz + R0) * 4; j++) for (let i = Math.floor((fx - R0) * 4); i <= (fx + R0) * 4; i++) {
        if (i < 0 || j < 0 || i >= OW || j >= OH) continue;
        const dx = (i + 0.5) / 4 - fx, dz = (j + 0.5) / 4 - fz, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        if (Math.abs(lx) < w / 2 && lz < f && lz > -d) occ[j * OW + i] = 1;
      }
    };
    // kept clear for later: the arena's rim (tents, stands, pennants), the bridges' ends, the gate and the road on through it (see buildMask)
    const reserve = (x, z) => (ar && V.dA && V.dA[cellOf(x, z)] < 6.5) || bridgeD(x, z) < 2.4 || (L.exit && (hyp(L.exit.x - x, L.exit.z - z) < 6 || (Math.abs(x - L.exit.x) < 2.6 && z < L.exit.z && z > L.exit.z - 14.5)));
    B.ck = 24;   // (bigger chunks: the town's decor is light but spread over many materials — fewer, fuller draw calls)
    const RS = L.townDecor = { houses: 0, back: 0, shops: 0, lamps: 0, towers: 0, walls: 0, bridges: V.bridges.length, river: !!V.river, quaySegs: 0, spots: [] };   // for tests / debugging
    const T = { rnd, V, dF, pick, cellOf, liqAt, nearLiq, outAt, gapAt, capAt, ar, inArena, bridgeD, occ, occAt, occDisc, occRect, reserve, RS, houses: [], lamps: [] };
    // the water: one plane 0.8 m below the streets (only seen where the floor mesh leaves the canals open), the stone quays
    const ft = new THREE.DataTexture(V.wflow.data, V.wflow.W, V.wflow.H, THREE.RGBAFormat, THREE.UnsignedByteType);
    ft.minFilter = ft.magFilter = THREE.LinearFilter; ft.generateMipmaps = false; ft.wrapS = ft.wrapT = THREE.ClampToEdgeWrapping; ft.needsUpdate = true;
    B.dispose.push(ft);
    const wm = waterMat(false);
    wm.userData.u.tFlow.value = ft; wm.userData.u.uMaskInv.value.set(1 / W, 1 / H);
    const wg = new THREE.PlaneGeometry(W + 28, H + 28); wg.rotateX(-Math.PI / 2); wg.translate(W / 2, -WD, H / 2);
    const water = new THREE.Mesh(wg, wm); water.receiveShadow = true; water.renderOrder = 1; water.name = 'water';   // (after the floor and the houses: hidden fragments are skipped)
    B.g.add(water);
    townQuays(L, B);
    townBridges(L, B, T);
    townWalls(L, B, T);
    townArena(L, B, T);
    townHouses(L, B, T);
    townArrival(L, B, T);
    townSquares(L, B, T);
    townPlazas(L, B, T);
    townBunting(L, B, T);
    townGreen(L, B, T);
    townWaterLife(L, B, T);
    townCastle(L, B, T);
  }
  // ── Castle: brick wall blocks (tall N/E/W, low caps on the camera side), pillars, banners, rose window ──
  KIND.wallT = { mat: 'brick', shadow: 'near', geo() { const k = new Kit(); k.add(G.box(), 0xa78a74, [0, 1.3, 0], 0, [1, 2.6, 1]); k.add(G.box(), 0xffffff, [0, 2.68, 0], 0, [1.04, 0.16, 1.04]); return k.build(); } };
  KIND.wallTM = { mat: 'brick', shadow: 'near', geo() { const k = new Kit(); k.add(G.box(), 0xa78a74, [0, 1.3, 0], 0, [1, 2.6, 1]); k.add(G.box(), 0xffffff, [0, 2.68, 0], 0, [1.04, 0.16, 1.04]); k.add(G.box(), 0xaa8c76, [0, 3.0, 0], 0, [0.52, 0.5, 0.52]); return k.build(); } };
  KIND.wallL = { mat: 'brick', shadow: 'near', geo() { const k = new Kit(); k.add(G.box(), 0xa78a74, [0, 0.26, 0], 0, [1, 0.52, 1]); k.add(G.box(), 0xffffff, [0, 0.58, 0], 0, [1.05, 0.12, 1.05]); return k.build(); } };
  KIND.pillar = { mat: 'pillar', shadow: true, geo() {
    const k = new Kit(), c = 0xa48771, g = 0xa78a74;
    k.add(G.box(), c, [0, 0.13, 0], 0, [0.96, 0.26, 0.96]);
    k.add(G.cyl(1, 1, 20), c, [0, 0.33, 0], 0, [0.44, 0.14, 0.44]);
    k.add(G.torus(TAU, 0.3, 20), c, [0, 0.42, 0], [Math.PI / 2, 0, 0], [0.37, 0.37, 0.37]);
    k.add(G.cyl(1, 1, 20), c, [0, 1.62, 0], 0, [0.31, 2.4, 0.31]);
    k.add(G.torus(TAU, 0.25, 20), g, [0, 2.82, 0], [Math.PI / 2, 0, 0], [0.34, 0.34, 0.34]);
    k.add(G.cyl(1.5, 1, 20), c, [0, 2.98, 0], 0, [0.31, 0.26, 0.31]);
    k.add(G.box(), c, [0, 3.2, 0], 0, [0.98, 0.2, 0.98]);
    return k.build();
  } };
  function makePillarMat() {   // triplanar stone that dithers away when it stands between the camera and the hero
    const m = makeTriMat('rock', { aoH: 0.8, ao: 0.55, key: 'pillar', m: 2.2 });
    const U = m.userData.u;
    U.uHero = R.heroU;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      sh.uniforms.uHero = R.heroU;
      sh.vertexShader = sh.vertexShader.replace('varying vec3 vLvW;', 'varying vec3 vLvW; varying vec2 vLvC;')
        .replace('lvWp = modelMatrix * lvWp;', `lvWp = modelMatrix * lvWp;
          #ifdef USE_INSTANCING
            vLvC = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
          #else
            vLvC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
          #endif
          `);
      sh.fragmentShader = sh.fragmentShader.replace('varying vec3 vLvW;', 'varying vec3 vLvW; varying vec2 vLvC; uniform vec3 uHero;')
        .replace('vec3 lvN0 = normalize(vLvN);', `{ float dz = vLvC.y - uHero.z, dx = abs(vLvC.x - uHero.x);
            float fd = smoothstep(0.1, 0.8, dz) * smoothstep(4.2, 3.0, dz) * smoothstep(1.7, 1.0, dx) * smoothstep(0.35, 1.0, vLvW.y);
            if (fd > 0.0 && fd * 0.85 > fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard; }
          vec3 lvN0 = normalize(vLvN);`);
    };
    m.userData.pkey = 'lv-pillar';
    return m;
  }
  function makeBannerMat(hue) {
    const m = new THREE.MeshStandardMaterial({ map: bannerTex(hue), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
    if (texOK()) { m.normalMap = surf('fabric').normalMap; m.normalScale = new THREE.Vector2(0.6, 0.6); }
    lvShade(m, {
      key: 'banner', uniforms: { uTime: TIME.u }, vDecl: 'uniform float uTime;',
      vBegin: `{ vec3 lvIp = vec3(0.0);
        #ifdef USE_INSTANCING
          lvIp = instanceMatrix[3].xyz;
        #endif
        float k = 1.0 - uv.y; transformed.z += (sin(uTime * 1.6 + lvIp.x * 0.8 + uv.y * 3.0) * 0.05 + 0.03) * k * k; }`,
    });
    return keep(m);
  }
  // The dragon's treasure: loose coins (a darker rim around a bright raised face) and coin stacks on a low heap, a crown,
  // a few gems — all plain PBR, nothing emissive, so single coins read instead of a glowing blob
  function coinProto() {
    return R.geo.coinP || (R.geo.coinP = keep(mergeParts([{ geo: G.cyl(1, 1, 10), color: WHITE, m: new THREE.Matrix4() },
      { geo: R.geo.coinFace || (R.geo.coinFace = keep(new THREE.CircleGeometry(0.7, 10).rotateX(-Math.PI / 2))), color: WHITE, m: new THREE.Matrix4().makeTranslation(0, 0.53, 0) }])));
  }
  const COIN_FACE = [0x917765, 0x957b68, 0x876f5e].map(c => new THREE.Color(c)), COIN_RIM = new THREE.Color(0x655347);
  function addCoin(k, x, y, z, rot, r, h, fi) {   // rim / face coloured by distance from the coin's own centre
    const face = COIN_FACE[fi % 3], lim = r * 0.8;
    k.add(coinProto(), (px, py, pz) => (hyp(px - x, pz - z) + Math.abs(py - y) * 0.2 > lim ? COIN_RIM : face), [x, y, z], rot, [r, h, r]);
  }
  function hoardGeo(v) {
    const key = 'hoard' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), g = new Kit(), rnd = mulberry32(1700 + v), mound = lumpy(1, 0.1, 1800 + v, { flat: -0.05 });
    const hgt = r => Math.max(0.03, 0.4 * (1 - (r / 1.3) ** 2));
    k.add(mound, 0x493c34, [0, -0.2, 0], 0, [1.28, 0.6, 1.08]);   // the heap under the coins (darker, so single coins read)
    for (let i = 0; i < 64; i++) {   // loose coins, tilted with the slope of the heap
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.28, h = hgt(r), tl = 0.2 + r * 0.3;
      addCoin(k, Math.cos(a) * r, h + 0.01, Math.sin(a) * r * 0.85, [Math.sin(a) * tl + (rnd() - 0.5) * 0.5, rnd() * 3, -Math.cos(a) * tl + (rnd() - 0.5) * 0.5], 0.085, 0.018, i);
    }
    for (let st = 0; st < 6; st++) {   // coin stacks around the heap
      const a = st * 1.05 + rnd() * 0.5, r = 0.7 + rnd() * 0.55, n = 4 + Math.floor(rnd() * 6), x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85, y0 = hgt(r) * 0.55;
      for (let c = 0; c < n; c++) addCoin(k, x + (rnd() - 0.5) * 0.02, y0 + c * 0.032 + 0.016, z + (rnd() - 0.5) * 0.02, [0, rnd() * 3, 0], 0.09, 0.03, st + c);
    }
    k.add(G.torus(TAU, 0.12, 16), 0x88705e, [0.1, 0.44, 0.1], [Math.PI / 2 - 0.3, 0, 0.2], [0.14, 0.14, 0.14]);   // a little crown on top
    for (let i = 0; i < 5; i++) k.add(G.cone(4), 0x88705e, [0.1 + Math.cos(i * 1.26) * 0.14, 0.51, 0.1 + Math.sin(i * 1.26) * 0.12], [-0.3, 0, 0.2], [0.03, 0.08, 0.03]);
    const gems = [0x816a5a, 0x8c7462, 0x8a7160, 0x776253, 0x675548];
    for (let i = 0; i < 7; i++) { const a = rnd() * TAU, r = Math.sqrt(rnd()) * 1.1; g.add(G.octa(), gems[i % 5], [Math.cos(a) * r, hgt(r) + 0.05, Math.sin(a) * r * 0.85], [rnd(), rnd(), rnd()], [0.07, 0.1, 0.07]); }
    return (R.geo[key] = { coins: keep(k.build()), gems: keep(g.build()) });
  }
  // Castle furniture
  function candelabraGeo() {   // gold stand (metal) + three wax candles; the flames are billboards added separately
    if (R.geo.candel) return R.geo.candel;
    const m = new Kit(), w = new Kit(), gd = 0x88705e;
    m.add(MK(G.cyl(0.55, 1, 12)), gd, [0, 0.07, 0], 0, [0.26, 0.14, 0.26]);
    m.add(MK(G.cyl(1, 1, 10)), gd, [0, 0.74, 0], 0, [0.035, 1.3, 0.035]);
    m.add(MK(G.sphere(10, 8)), gd, [0, 0.52, 0], 0, [0.075, 0.08, 0.075]);
    m.add(MK(G.torus(Math.PI, 0.09, 14)), gd, [0, 1.36, 0], [0, 0, Math.PI], [0.3, 0.3, 0.3]);
    for (const x of [-0.3, 0, 0.3]) {
      const y = x ? 1.37 : 1.43;
      m.add(MK(G.cyl(1.3, 0.8, 10)), gd, [x, y, 0], 0, [0.06, 0.05, 0.06]);
      w.add(G.cyl(1, 1, 8), 0xa98b75, [x, y + 0.12, 0], 0, [0.028, 0.2, 0.028]);
    }
    return (R.geo.candel = { metal: keep(m.build()), wax: keep(w.build()) });
  }
  function plantGeo(v) {const key='plant'+v;if(R.geo[key])return R.geo[key];const k=new Kit(),l=new Kit();k.add(G.cyl(0.8,1,8),0x463932,[0,0.25,0],0,[0.25,0.5,0.25]);for(let i=0;i<6;i++){const a=i*TAU/6;l.seg([0,0.4,0],[Math.cos(a)*0.27,0.8+(i%3)*0.08,Math.sin(a)*0.27],0.025,0x57483d,0.006,5);}return (R.geo[key]={pot:keep(k.build()),leaves:keep(l.build())});
  }
  function shieldGeo(v) {   // round wall shield facing +z: coloured face, gold rim and boss, a bright stripe
    const key = 'shield' + v;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), c = [[0x5a4a3f, 0xa38671], [0x59493e, 0x977c69], [0x604f43, 0xa68973], [0x5e4d42, 0x977c69]][v % 4];
    k.add(G.cyl(1, 1, 20), c[0], [0, 0, 0.03], [Math.PI / 2, 0, 0], [0.34, 0.05, 0.34]);
    k.add(G.box(), c[1], [0, 0, 0.056], [0, 0, v % 2 ? 0.785 : 0], [0.6, 0.1, 0.012]);
    if (v % 2) k.add(G.box(), c[1], [0, 0, 0.056], [0, 0, -0.785], [0.6, 0.1, 0.012]);
    k.add(G.torus(TAU, 0.09, 20), 0x8d7462, [0, 0, 0.056], 0, [0.335, 0.335, 0.335]);
    k.add(G.sphere(10, 8), 0x977c69, [0, 0, 0.07], 0, [0.085, 0.085, 0.05]);
    return (R.geo[key] = keep(k.build()));
  }
  function knightGeo() {if(R.geo.knight)return R.geo.knight;const k=new Kit();k.add(dreadGeo(3),0xffffff,[0,0,0],0,0.65);k.add(G.cone(8),0x433730,[0,0.98,0],0,[0.24,0.68,0.2]);k.add(G.octa(),0x604f44,[0,1.37,0],0,[0.15,0.22,0.12]);k.add(G.box(),0x221c19,[0,1.4,0.115],0,[0.15,0.025,0.015]);k.seg([-0.3,0.2,0],[-0.3,1.9,0],0.028,0x4d3f36,0.025,6);return (R.geo.knight=keep(k.build()));
  }
  // Castle rooms alternate between the theme's lavender stone + purple rugs (style 1) and warm sandstone + red rugs (style 0):
  // treasure rooms, the boss hall (so the purple dragon stands out) and every other hall. Read by the floor shader.
  const roomStyle = (rm, ri) => (rm.kind === 'side' || rm.kind === 'boss' || (rm.kind === 'main' && ri % 2 === 1) ? 0 : 1);
  function buildCastle(L, B) {
    const rnd = B.rnd, W = L.W, H = L.H, grid = L.grid;
    const dF = L._dF = chamfer(W, H, grid, 1);
    const isPillar = new Set(L.pillars.map(p => p.j * W + p.i));
    // wall mass: tall brick blocks around the halls, low caps wherever a block would hide floor from the camera, and every other
    // non-floor cell of the level under a flat battlement roof (merged row runs), so no dark floor shows between the rooms
    const roofT = lin(0x7f6959);
    for (let j = 0; j < H; j++) {
      let run = -1;
      for (let i = 0; i <= W; i++) {
        let roof = false;
        if (i < W) {
          const c = j * W + i;
          if (!grid[c] && !isPillar.has(c)) {
            const d = dF[c], x = i + 0.5, z = j + 0.5;
            if (hides(L, x, z, 0.45, 0, 2.8, 0.05)) inst(B, 'wallL', mat4(x, 0, z));
            else if (d <= 2.3) inst(B, d > 1.5 && (i + j) % 2 === 0 ? 'wallTM' : 'wallT', mat4(x, 0, z));
            else roof = true;
          }
        }
        if (run >= 0 && (!roof || i % CHUNK === 0)) { dec(B, 'roofC', G.box(), mat4((run + i) / 2, 1.36, j + 0.5, 0, i - run, 2.72, 1), roofT); run = -1; }
        if (roof && run < 0) run = i;
      }
    }
    for (const p of L.pillars) inst(B, 'pillar', mat4(p.x, 0, p.z, 0));
    // north walls: a stained-glass window in the middle of each hall, bookshelves in the side rooms, banners between the torches
    const wallOK = (i, jw, half) => { for (let a = -half; a <= half; a++) if (grid[jw * W + i + a] || !grid[(jw + 1) * W + i + a]) return false; return true; };
    const used = [];
    const nearUsed = (x, z, d) => used.some(u => hyp(u[0] - x, u[1] - z) < d) || L.torches.some(t => hyp(t.x - x, t.z - z) < d);
    const last = L.rooms[L.Z.rooms - 1];
    if (L.crystalSpot) for (const ox of [-1.2, 0, 1.2]) used.push([L.crystalSpot.x + ox, last.z - last.hh]);   // rose window
    L.rooms.forEach((rm, ri) => {
      rm.style = roomStyle(rm, ri);
      if (rm.kind === 'boss') return;
      const jw = rm.z - rm.hh - 1, z = jw + 1;
      if (rm.kind === 'side') {
        const i = Math.floor(rm.x);
        if (!wallOK(i, jw, 1) || nearUsed(i + 0.5, z, 1.3) || L.chests.some(c => hyp(c.x - i - 0.5, c.z - z) < 2) || L.breakables.some(b => hyp(b.x - i - 0.5, b.z - z) < 1.5)) return;
        const sh = { x: i + 0.5, z: z + 0.27 };
        B.shelves.push(sh);
        used.push([i + 0.5, z]);
        for (const sd of [-0.45, 0.45]) propSolid(L, i + 0.5 + sd, z + 0.3, 0.42, 'shelf', [{ arr: B.shelves, item: sh }]);
        return;
      }
      let best = null;
      for (let x = rm.x - rm.hw + 2; x <= rm.x + rm.hw - 2; x++) {
        const i = Math.floor(x);
        if (!wallOK(i, jw, 1) || nearUsed(i + 0.5, z, 1.4)) continue;
        if (!best || Math.abs(i + 0.5 - rm.x) < Math.abs(best - rm.x)) best = i + 0.5;
      }
      if (best === null) return;
      const v = ri % 3;
      B.windows.push({ x: best, z, v });
      used.push([best, z]);
      for (const [n, sd] of [[0, -1], [1, 1]]) glowAt(B, best + sd * 0.3, z + 2.2, 2.3, GLASS_LIGHT[v][n], 0.7, 0.6, 1.3);
    });
    for (const rm of L.rooms) {
      const jw = rm.z - rm.hh - 1;
      for (let x = rm.x - rm.hw + 5; x < rm.x + rm.hw - 2; x += 5) {
        const i = Math.floor(x);
        if (!wallOK(i, jw, 1) || nearUsed(i + 0.5, jw + 1, 1.5)) continue;
        B.banners.push({ x: i + 0.5, z: jw + 1.07, hue: (i + jw) % 2, big: rm.kind === 'boss' });
      }
    }
    // toy-knight statues in the northern corners of the halls
    for (const rm of L.rooms) {
      if (rm.kind === 'boss' || rm.kind === 'start' || rm.hw < 6) continue;
      for (const sx of [-1, 1]) {
        const x = rm.x + sx * (rm.hw - 1.0), z = rm.z - rm.hh + 1.0, i = sx < 0 ? rm.x - rm.hw : rm.x + rm.hw - 1, j = rm.z - rm.hh;   // (i, j): corner floor cell
        if (!grid[j * W + i] || grid[(j - 1) * W + i] || grid[j * W + i + sx] || L.dWall[j * W + i] > 1.5) continue;
        if (L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + 1.3) || L.spawns.some(q => hyp(q.x - x, q.z - z) < 1.6) || L.torches.some(q => hyp(q.x - x, q.z - z) < 1.2)) continue;
        propSolid(L, x, z, 0.42, 'statue', [dec(B, 'shiny', knightGeo(), mat4(x, 0, z, sx > 0 ? -0.5 : 0.5), null)]);
      }
    }
    // furniture: candelabras (warm light pools) and potted plants against the north walls, shields on the side walls
    const warm = 0x836c5b;
    const busy = (x, z, rr) => L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + rr) || L.spawns.some(q => hyp(q.x - x, q.z - z) < 1.6) ||
      L.torches.some(t => hyp(t.x - x, t.z - z) < 0.9) || B.banners.some(b => Math.abs(b.x - x) < 0.8 && Math.abs(b.z - z) < 1.2) ||
      used.some(u => hyp(u[0] - x, u[1] - z) < 1.3) || L.chests.some(c => hyp(c.x - x, c.z - z) < 1.8) || L.checkpoints.some(c => hyp(c.x - x, c.z - z) < 2.2) ||
      L.breakables.some(b => hyp(b.x - x, b.z - z) < 1.1) || linkDist(L, x, z) < 2.2;
    L.rooms.forEach((rm, ri) => {
      if (rm.kind === 'boss') return;
      const jw = rm.z - rm.hh - 1, zz = jw + 1 + 0.42, slots = [];
      for (let i = rm.x - rm.hw; i < rm.x + rm.hw; i++) if (wallOK(i, jw, 0) && !busy(i + 0.5, zz, 0.9)) slots.push(i + 0.5);
      slots.sort((a, b) => Math.abs(Math.abs(a - rm.x) - rm.hw * 0.5) - Math.abs(Math.abs(b - rm.x) - rm.hw * 0.5));
      const want = rm.kind === 'side' ? 1 : rm.hw >= 8 ? 3 : 2, put = [];
      for (const x of slots) {
        if (put.length >= want) break;
        if (put.some(q => Math.abs(q - x) < 2.4)) continue;
        put.push(x);
        const candle = rm.kind !== 'side' && put.length % 2 === 1;
        if (candle) {
          const g = candelabraGeo(), m = mat4(x, 0, zz, 0);
          propSolid(L, x, zz, 0.3, 'deco', [dec(B, 'prop', g.metal, m, null), dec(B, 'decor', g.wax, m, null)]);
          for (const ox of [-0.3, 0, 0.3]) addFlame(B, x + ox, (ox ? 1.37 : 1.43) + 0.23, zz, 0.3, 0);
          B.lights.push({ x, y: 1.75, z: zz + 0.35, col: new THREE.Color(warm), int: 2.4, dist: 5.5, fl: 0.25, ph: rnd() * 9 });
          glowAt(B, x, zz + 0.5, 2.6, warm, 0.42);
        } else {
          const g = plantGeo(Math.floor(rnd() * 3)), m = mat4(x, 0, zz, rnd() * TAU);
          propSolid(L, x, zz, 0.34, 'deco', [dec(B, 'shiny', g.pot, m, null), dec(B, 'foliage', g.leaves, m, null)]);
        }
      }
      if (rm.hh < 4) return;
      for (const sx of [-1, 1]) {   // shields on the east / west walls (the camera sees those faces at an angle)
        const iw = sx < 0 ? rm.x - rm.hw - 1 : rm.x + rm.hw, face = sx < 0 ? iw + 1 : iw;
        for (let z = rm.z - rm.hh + 2.5; z <= rm.z + rm.hh - 1.5; z += 3.3) {
          const j = Math.floor(z);
          let ok = true;
          for (let b = -1; b <= 1 && ok; b++) if (grid[(j + b) * W + iw] || !grid[(j + b) * W + iw - sx]) ok = false;
          if (!ok) continue;
          dec(B, 'shiny', shieldGeo((ri + j) % 4), mat4(face - sx * 0.03, 1.6, j + 0.5, -sx * Math.PI / 2), null);
        }
      }
    });
    // boss hall: a gold star emblem on the round rug where the dragon waits
    if (L.boss) {
      const m = R.mat.emblem || (R.mat.emblem = keep(new THREE.MeshStandardMaterial({ map: emblemTex(), transparent: true, depthWrite: false, roughness: 0.35, metalness: 0.6,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
      const e = new THREE.Mesh(R.geo.emblem || (R.geo.emblem = keep(new THREE.PlaneGeometry(6.2, 6.2).rotateX(-Math.PI / 2))), m);
      e.position.set(L.boss.x, 0.012, L.boss.z + 3.2); e.receiveShadow = true; e.renderOrder = 1; e.name = 'emblem';
      B.g.add(e);
    }
    // boss hall: rose window on the north wall face + a flat inlaid dais (Feza stands on it at the end, so no height)
    if (L.crystalSpot) {
      const cs = L.crystalSpot, jw = last.z - last.hh;
      const rose = new THREE.Mesh(R.geo.rose2 || (R.geo.rose2 = keep(new THREE.CircleGeometry(1.0, 40))),
        R.mat.rose || (R.mat.rose = keep(new THREE.MeshBasicMaterial({ map: roseTex(), color: new THREE.Color(1.7, 1.6, 1.8) }))));
      rose.position.set(cs.x, 1.55, jw + 0.02); rose.name = 'rose'; B.g.add(rose);
      const ring = new THREE.Mesh(R.geo.roseRing2 || (R.geo.roseRing2 = keep(new THREE.TorusGeometry(1.03, 0.075, 8, 48))), R.mat.gold); ring.position.copy(rose.position); ring.position.z += 0.02; B.g.add(ring);
      dec(B, 'stone', G.box(), mat4(cs.x, 0.4, jw + 0.1, 0, 1.9, 0.12, 0.2), lin(0xa98b75));   // sill
      glowAt(B, cs.x, jw + 1.8, 2.2, 0x8c7361, 0.4, 1, 1.2);
      const th = [0.02, 0.035, 0.05], rr = [3.0, 2.3, 1.6];
      for (let k = 0; k < 3; k++) dec(B, 'stone', G.cyl(1, 1, 40), mat4(cs.x, th[k] / 2, cs.z, 0, rr[k], th[k], rr[k]), lin(k === 2 ? 0xaa8c76 : k ? 0x9e826e : 0x927866));
      for (let k = 0; k < 2; k++) dec(B, 'gold', G.torus(TAU, 0.012, 64), mat4(cs.x, th[k + 1] + 0.004, cs.z, 0, rr[k + 1] + 0.01, rr[k + 1] + 0.01, rr[k + 1] + 0.01, Math.PI / 2), null);
      dec(B, 'glow', G.torus(TAU, 0.02, 64), mat4(cs.x, 0.058, cs.z, 0, 1.2, 1.2, 1.2, Math.PI / 2), lin(0x876f5e, 1.2));
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4, x = cs.x + Math.cos(a) * 2.35, z = cs.z + Math.sin(a) * 2.35;
        propSolid(L, x, z, 0.25, 'post', [dec(B, 'stone', G.cyl(0.8, 1, 8), mat4(x, 0.45, z, 0, 0.18, 0.9, 0.18), lin(0xa1846f)),
          dec(B, 'glow', crystalGeo(2), mat4(x, 0.88, z, a, 0.45), null)]);
      }
      B.pts.add.push(...Array.from({ length: 16 }, () => ({ x: cs.x + (rnd() - 0.5) * 3, y: 0.4 + rnd(), z: cs.z + (rnd() - 0.5) * 3, kind: 2, ph: rnd(), size: 0.2, prm: 0.25 + rnd() * 0.2, col: lin(0x8c7361, 2.2) })));
      B.lights.push({ x: cs.x, y: 1.4, z: cs.z, col: new THREE.Color(0x876f5e), int: 4, dist: 8, fl: 0, ph: 0 });
      glowAt(B, cs.x, cs.z + 0.5, 5, 0x876f5e, 0.45);
    }
    // the dragon's hoard in the boss hall corners, clear of the pillars
    const bossRm = L.rooms.find(r => r.kind === 'boss');
    let nChest = 0;
    if (bossRm) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], hi) => {
      let x = 0, z = 0, ok = false;
      for (const d of [1.6, 1.9, 2.2, 2.5, 2.9]) {
        x = bossRm.x + sx * (bossRm.hw - d); z = bossRm.z + sz * (bossRm.hh - d);
        ok = !!L.grid[Math.floor(z) * W + Math.floor(x)] && !L.pillars.some(p => hyp(p.x - x, p.z - z) < 2.4) && !L.solids.some(q => hyp(q.x - x, q.z - z) < q.r + 1.8) &&
          !L.spawns.some(q => hyp(q.x - x, q.z - z) < 2) && !(L.crystalSpot && hyp(L.crystalSpot.x - x, L.crystalSpot.z - z) < 5);
        if (ok) break;
      }
      if (!ok) return;
      const hg = hoardGeo(hi), sc = 0.88 + rnd() * 0.12, m = mat4(x, 0, z, rnd() * TAU, sc);
      const vis = [dec(B, 'coin', hg.coins, m, null), dec(B, 'shiny', hg.gems, m, null)];
      if (nChest++ < 2) {   // a small open treasure chest spilling coins, on the side facing the hall
        const cg = chestGeo(false), cm = mat4(x - sx * 0.9, 0, z - sz * 0.55, sz < 0 ? -sx * 0.6 : Math.PI + sx * 0.6, 0.7);
        const lm = new THREE.Matrix4().multiplyMatrices(cm, mat4(0, 0.54, -0.31, 0, 1, 1, 1, -1.9));
        vis.push(dec(B, 'prop', cg.body, cm, null), dec(B, 'prop', cg.lid, lm, null));
        const ck = new Kit();
        for (let n = 0; n < 7; n++) addCoin(ck, (n % 4 - 1.5) * 0.18, 0.565 + (n > 3 ? 0.03 : 0), ((n / 4 | 0) - 0.5) * 0.2, [0.2 * (n % 3), n, 0.1], 0.085, 0.02, n);
        vis.push(dec(B, 'coin', R.geo.chestCoins || (R.geo.chestCoins = keep(ck.build())), cm, null));
      }
      propSolid(L, x, z, 1.2, 'hoard', vis);
      glowAt(B, x, z, 2.6, 0x886f5e, 0.22);
      for (let n = 0; n < 5; n++) B.pts.add.push({ x: x + (rnd() - 0.5) * 2.2, y: 0.25 + rnd() * 0.5, z: z + (rnd() - 0.5) * 1.8, kind: 2, ph: rnd(), size: 0.16, prm: 0.3 + rnd() * 0.3, col: lin(0x957b68, 1.8) });
    });
    // gold dust motes
    for (let n = 0; n < 60; n++) {
      const x = rnd() * W, z = rnd() * H;
      if (!grid[Math.floor(z) * W + Math.floor(x)]) continue;
      B.pts.add.push({ x, y: 0.6 + rnd() * 2.4, z, kind: 1, ph: rnd(), size: 0.07, prm: 0.5 + rnd() * 0.5, col: lin(0x9b7f6c, 1.1) });
    }
  }
  function finishBanners(B) {
    if (!B.banners.length) return;
    const geo = R.geo.banner || (R.geo.banner = keep((() => { const g = new THREE.PlaneGeometry(0.9, 2.0, 1, 8); g.translate(0, -1.0, 0); return g; })()));
    for (const hue of [0, 1, 2, 3]) {   // (2, 3: Veba Şehri's sun crest on sky blue / on sunny red; b.y, b.s, b.yaw: hung anywhere)
      const list = B.banners.filter(b => b.hue === hue);
      if (!list.length) continue;
      const mk = 'banner' + hue, m = R.mat[mk] || (R.mat[mk] = makeBannerMat(hue));
      const im = new THREE.InstancedMesh(geo, m, list.length);
      const yOf = b => b.y ?? (b.big ? 3.0 : 2.5), sOf = b => b.s ?? (b.big ? 1.35 : 1);
      list.forEach((b, i) => im.setMatrixAt(i, mat4(b.x, yOf(b), b.z, b.yaw || 0, sOf(b))));
      im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.name = 'banners';
      B.g.add(im);
      for (const b of list) { const ya = b.yaw || 0; dec(B, 'prop', marked(G.cyl(1, 1, 8), 10), mat4(b.x + Math.sin(ya) * 0.03, yOf(b) + 0.03, b.z + Math.cos(ya) * 0.03, ya, 0.035, sOf(b) * 1.05, 0.035, 0, Math.PI / 2), lin(0x88705e)); }
    }
  }

  function bookshelfGeo() {   // wood frame (prop material) + colourful books (decor material)
    if (R.geo.shelf) return R.geo.shelf;
    const f = new Kit(), b = new Kit(), rnd = mulberry32(4242), wd = 0x856e5d, Wd = 1.7, Hh = 2.15, D = 0.46;
    f.add(G.box(), wd, [0, Hh / 2, -D / 2 + 0.03], 0, [Wd, Hh, 0.06]);
    for (const sx of [-1, 1]) f.add(G.box(), wd, [sx * (Wd / 2 - 0.04), Hh / 2, 0], 0, [0.08, Hh, D]);
    for (let n = 0; n < 5; n++) f.add(G.box(), wd, [0, 0.06 + n * 0.5, 0], 0, [Wd, 0.06, D]);
    f.add(G.box(), 0x725e4f, [0, Hh + 0.05, 0.02], 0, [Wd + 0.12, 0.1, D + 0.08]);
    const cols = [0x5f4e43, 0x695649, 0x6a574a, 0x886f5e, 0x735e50, 0x836c5b, 0x745f51, 0xa48772];
    for (let n = 0; n < 4; n++) {
      let x = -Wd / 2 + 0.1;
      while (x < Wd / 2 - 0.14) {
        const bw = 0.05 + rnd() * 0.05, bh = 0.26 + rnd() * 0.15, y0 = 0.09 + n * 0.5;
        if (rnd() < 0.08) { x += 0.12; continue; }
        const tilt = rnd() < 0.1 ? 0.25 : 0;
        b.add(G.box(), cols[Math.floor(rnd() * cols.length)], [x + bw / 2 + tilt * 0.1, y0 + bh / 2, 0.02], [0, 0, -tilt], [bw, bh, D - 0.12 - rnd() * 0.06]);
        if (rnd() < 0.5) b.add(G.box(), 0x977c69, [x + bw / 2 + tilt * 0.1, y0 + bh * 0.72, 0.02 + (D - 0.12) / 2 - 0.02], [0, 0, -tilt], [bw + 0.004, 0.02, 0.01]);
        x += bw + 0.008;
      }
    }
    return (R.geo.shelf = { frame: keep(f.build()), books: keep(b.build()) });
  }
  function finishWindows(B) {
    for (const s of B.shelves) {
      const g = bookshelfGeo(), m = mat4(s.x, 0, s.z, 0);
      dec(B, 'prop', g.frame, m, null); dec(B, 'decor', g.books, m, null);
    }
    if (!B.windows.length) return;
    const geo = R.geo.glass || (R.geo.glass = keep(new THREE.PlaneGeometry(1.1, 2.2)));
    for (let v = 0; v < 3; v++) {
      const list = B.windows.filter(w => w.v === v);
      if (!list.length) continue;
      const mk = 'glass' + v, m = R.mat[mk] || (R.mat[mk] = keep(new THREE.MeshBasicMaterial({ map: glassTex(v), color: new THREE.Color(1.45, 1.4, 1.5), alphaTest: 0.5 })));
      const im = new THREE.InstancedMesh(geo, m, list.length);
      list.forEach((w, i) => im.setMatrixAt(i, mat4(w.x, 1.45, w.z + 0.015, 0)));
      im.computeBoundingSphere(); im.name = 'windows'; B.g.add(im);
      for (const w of list) {   // stone frame + sill
        for (const sx of [-1, 1]) dec(B, 'stone', G.box(), mat4(w.x + sx * 0.6, 1.18, w.z + 0.05, 0, 0.14, 1.66, 0.12), lin(0xa58873));
        dec(B, 'stone', G.torus(Math.PI, 0.13, 16), mat4(w.x, 2.0, w.z + 0.05, 0, 0.56, 0.56, 0.56), lin(0xa58873));
        dec(B, 'stone', G.box(), mat4(w.x, 0.32, w.z + 0.09, 0, 1.45, 0.12, 0.22), lin(0xa98b75));
        for (let n = 0; n < 6; n++) B.pts.add.push({ x: w.x + (B.rnd() - 0.5) * 1.4, y: 0.6 + B.rnd() * 1.6, z: w.z + 0.5 + B.rnd() * 2.2, kind: 1, ph: B.rnd(), size: 0.07, prm: 0.3 + B.rnd() * 0.3, col: lin(GLASS_LIGHT[w.v][n & 1], 1.3) });
      }
    }
  }

  // ── Interactive props: chests, breakables, checkpoint crystals, portal, torches, owl ──
  const halfCyl = () => R.geo.halfCyl || (R.geo.halfCyl = keep(new THREE.CylinderGeometry(1, 1, 1, 18, 1, false, 0, Math.PI)));
  const MK = g => marked(g, 10);   // plain metal part of a prop
  const GOLD = 0xffc94a;
  function chestGeo(big) {
    const key = 'chest' + (big ? 'B' : 'S');
    if (R.geo[key]) return R.geo[key];
    const wood = big ? 0xa99af0 : 0xffffff, dark = 0x3a2616, Wd = 0.9, D = 0.62, Hh = 0.5;
    const b = new Kit();
    b.add(G.box(), wood, [0, Hh / 2 + 0.04, 0], 0, [Wd, Hh, D]);
    b.add(G.box(), 0x2a1a0e, [0, Hh + 0.035, 0], 0, [Wd - 0.08, 0.02, D - 0.08]);
    for (const x of big ? [-0.3, 0, 0.3] : [-0.28, 0.28]) b.add(MK(G.box()), GOLD, [x, Hh / 2 + 0.04, 0], 0, [0.075, Hh + 0.02, D + 0.03]);
    b.add(MK(G.box()), GOLD, [0, 0.06, 0], 0, [Wd + 0.03, 0.06, D + 0.03]);
    b.add(MK(G.box()), GOLD, [0, Hh * 0.78, D / 2 + 0.02], 0, [0.17, 0.2, 0.035]);
    b.add(MK(G.box()), dark, [0, Hh * 0.74, D / 2 + 0.04], 0, [0.035, 0.07, 0.01]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(MK(G.sphere(8, 6)), GOLD, [sx * Wd / 2, 0.05, sz * D / 2], 0, 0.05);
    const l = new Kit(), dh = 0.24;
    l.add(halfCyl(), wood, [0, 0, D / 2], [0, 0, Math.PI / 2], [dh, Wd, D / 2]);
    l.add(G.box(), 0x4a3220, [0, 0.012, D / 2], 0, [Wd - 0.02, 0.024, D - 0.02]);
    for (const x of big ? [-0.3, 0, 0.3] : [-0.28, 0.28]) l.add(MK(halfCyl()), GOLD, [x, 0, D / 2], [0, 0, Math.PI / 2], [dh + 0.018, 0.08, D / 2 + 0.018]);
    l.add(MK(G.box()), GOLD, [0, 0.03, D + 0.012], 0, [0.12, 0.1, 0.03]);
    if (big) l.add(MK(G.octa()), 0xff7ad8, [0, dh + 0.02, D / 2], 0, [0.07, 0.09, 0.07]);
    return (R.geo[key] = { body: keep(b.build()), lid: keep(l.build()) });
  }
  function makeChests(L, B) {
    const innerMat = R.mat.chestGlow || (R.mat.chestGlow = keep(glowMat(0xffc84a, 2.4, { transparent: true, opacity: 0.9, depthWrite: false })));
    L.chestObjs = L.chests.map((c, n) => {
      const g = new THREE.Group(), s = c.big ? 1.3 : 1, geo = chestGeo(c.big);
      g.position.set(c.x, 0, c.z); g.scale.setScalar(s);
      const body = new THREE.Mesh(geo.body, R.mat.prop), pivot = new THREE.Group(), lid = new THREE.Mesh(geo.lid, R.mat.prop);
      pivot.position.set(0, 0.54, -0.31); pivot.add(lid);
      const glow = new THREE.Mesh(R.geo.glowPlane || (R.geo.glowPlane = keep(new THREE.PlaneGeometry(0.8, 0.52).rotateX(-Math.PI / 2))), innerMat);
      glow.position.y = 0.535; glow.visible = false;
      g.add(body, pivot, glow); shadows(g, true, true); glow.castShadow = false;
      B.g.add(g);
      const grp = B.grpN < 15 ? ++B.grpN : 0;
      for (let k = 0; k < (c.big ? 8 : 5); k++) B.pts.add.push({ x: c.x + (B.rnd() - 0.5) * 1.1 * s, y: 0.3 + B.rnd() * 0.8, z: c.z + (B.rnd() - 0.5) * 0.9 * s, kind: 2, ph: B.rnd(), size: 0.2, prm: 0.35 + B.rnd() * 0.3, col: lin(0xffe07a, 2.4), grp });
      const o = { x: c.x, z: c.z, big: c.big, opened: false, t: -1, grp, obj: g,
        open() {
          if (this.t >= 0) return;
          this.opened = true; this.t = 0; glow.visible = true;
          if (grp && B.ptOn) B.ptOn.value[grp] = 0;
          if (typeof FX !== 'undefined' && FX.burst) { FX.burst('sparkle', c.x, 0.9, c.z, { count: 16, color: '#ffe27a' }); FX.burst('coin', c.x, 0.8, c.z, { count: 8 }); }
          B.lights.push({ x: c.x, y: 1.2, z: c.z + 0.3, col: new THREE.Color(0xffc84a), int: 6, dist: 7, fl: 0, ph: 0, life: 1.6 });
        } };
      B.anim.push(dt => {
        if (o.t < 0) return;
        o.t += dt;
        const k = Math.min(1, o.t / 0.5), back = 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
        pivot.rotation.x = -1.95 * back;
        glow.scale.setScalar(Math.min(1, o.t * 2.5));
        innerMat.opacity = 0.9;
      });
      return o;
    });
  }
  // Breakables: one InstancedMesh per kind; breaking hides the instance and frees its solid
  KIND.vase = { mat: 'shiny', shadow: true, geo() {
    const pts = [[0, 0], [0.15, 0], [0.17, 0.03], [0.22, 0.12], [0.29, 0.27], [0.3, 0.37], [0.26, 0.5], [0.15, 0.6], [0.12, 0.66], [0.16, 0.72], [0.15, 0.75], [0.1, 0.74]].map(p => new THREE.Vector2(p[0], p[1]));
    const lg = new THREE.LatheGeometry(pts, 20), k = new Kit();
    k.add(lg, (x, y) => { const b = y > 0.3 && y < 0.42 ? 1.25 : (Math.abs(y - 0.28) < 0.015 || Math.abs(y - 0.44) < 0.015) ? 0.55 : y > 0.6 ? 0.85 : 0.95; return new THREE.Color(b, b, b); });
    for (const s of [-1, 1]) k.add(G.torus(Math.PI, 0.22, 10), 0xdddddd, [s * 0.2, 0.6, 0], [0, 0, s > 0 ? -1.2 : Math.PI + 1.2], [0.1, 0.1, 0.1]);
    return k.build();
  } };
  KIND.barrel = { mat: 'prop', shadow: true, geo() {
    const pts = [[0.001, 0], [0.29, 0], [0.32, 0.08], [0.35, 0.38], [0.32, 0.68], [0.29, 0.76], [0.001, 0.76]].map(p => new THREE.Vector2(p[0], p[1]));
    const lg = new THREE.LatheGeometry(pts, 14), uv = lg.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * 0.9, u * 2.2); }
    const k = new Kit();
    k.add(lg, 0xf2e2d0);
    const hoop = R.geo.hoop || (R.geo.hoop = keep(markUV(new THREE.TorusGeometry(1, 0.06, 5, 16), 10)));
    for (const y of [0.13, 0.63]) k.add(hoop, 0x5a5560, [0, y, 0], [Math.PI / 2, 0, 0], [0.345, 0.345, 0.345]);
    k.add(hoop, 0x5a5560, [0, 0.38, 0], [Math.PI / 2, 0, 0], [0.36, 0.36, 0.36]);
    return k.build();
  } };
  KIND.crate = { mat: 'prop', shadow: true, geo() {
    const k = new Kit(), s = 0.78, e = 0.075, dk = 0xb8906a;
    k.add(G.box(), 0xffe8cc, [0, s / 2, 0], 0, [s - 0.02, s - 0.02, s - 0.02]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      k.add(G.box(), dk, [a * (s / 2 - e / 2), s / 2, b * (s / 2 - e / 2)], 0, [e, s, e]);
      k.add(G.box(), dk, [0, s / 2 + a * (s / 2 - e / 2), b * (s / 2 - e / 2)], 0, [s, e, e]);
      k.add(G.box(), dk, [a * (s / 2 - e / 2), s / 2 + b * (s / 2 - e / 2), 0], 0, [e, e, s]);
    }
    for (const z of [-1, 1]) k.add(G.box(), dk, [0, s / 2, z * (s / 2 + 0.005)], [0, 0, 0.785], [e * 0.9, s * 1.25, e * 0.4]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [0, 1]) k.add(MK(G.box()), 0x6a6470, [a * s / 2, c * s, b * s / 2], 0, [0.1, 0.1, 0.1]);
    return k.build();
  } };
  // Çürüme Vadisi's crates: pale birch frame, slats painted pastel mint or pink with gaps, a white milk-bottle stencil on each side,
  // no dark wood, no iron corners
  function dCrateGeo(paint) {
    const k = new Kit(), s = 0.78, e = 0.07, birch = 0xfbeeda, wt = 0xffffff;
    k.add(G.box(), 0xf2e4cc, [0, s / 2, 0], 0, [s - 0.06, s - 0.08, s - 0.06]);   // the inside (seen through the gaps)
    for (const a of [-1, 1]) for (const b of [-1, 1]) k.add(G.box(), birch, [a * (s / 2 - e / 2), s / 2, b * (s / 2 - e / 2)], 0, [e, s, e]);   // corner posts
    for (let i = 0; i < 3; i++) {   // painted slats with gaps, all four sides
      const y = 0.13 + i * 0.26;
      for (const b of [-1, 1]) { k.add(G.box(), paint, [0, y, b * (s / 2 - 0.012)], 0, [s - 0.1, 0.19, 0.03]); k.add(G.box(), paint, [b * (s / 2 - 0.012), y, 0], 0, [0.03, 0.19, s - 0.1]); }
    }
    k.add(G.box(), birch, [0, s - 0.01, 0], 0, [s, 0.03, s]);   // the lid boards
    for (const f of [0, 1, 2, 3]) {   // a white milk-bottle stencil on each side
      const a = f * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a), o = s / 2 + 0.004;
      k.add(G.box(), wt, [nx * o, 0.36, nz * o], [0, a, 0], [0.14, 0.26, 0.005]);
      k.add(G.box(), wt, [nx * o, 0.54, nz * o], [0, a, 0], [0.07, 0.1, 0.005]);
      k.add(G.box(), paint, [nx * (o + 0.002), 0.4, nz * (o + 0.002)], [0, a, 0], [0.1, 0.05, 0.005]);   // its label
    }
    return k.build();
  }
  KIND.dCrateM = { mat: 'food', shadow: true, geo: () => dCrateGeo(0xb8ecd0) };   // (painted: plain glossy colours, no brown wood texture)
  KIND.dCrateP = { mat: 'food', shadow: true, geo: () => dCrateGeo(0xffc8d8) };
  // Çürüme Vadisi's barrels are little copper milk jugs (güğüm): they break with a milk splash
  KIND.bCan = { mat: 'copper', shadow: true, geo() {   // (polished copper with brass bands and a bright rim light: never a clay pot)
    const pts = [[0.001, 0], [0.19, 0], [0.22, 0.03], [0.3, 0.14], [0.33, 0.28], [0.3, 0.42], [0.2, 0.52], [0.13, 0.58], [0.12, 0.64], [0.15, 0.71], [0.14, 0.73], [0.001, 0.72]];
    const k = new Kit(), cu = new THREE.Color(0xe88a52), cu2 = new THREE.Color(0xffb88a), br = new THREE.Color(0xffd870);
    k.add(new THREE.LatheGeometry(smoothProfile(pts, 16), 16), (x, y) => (Math.abs(y - 0.14) < 0.022 || Math.abs(y - 0.44) < 0.022 || Math.abs(y - 0.66) < 0.014 ? br : cu.clone().lerp(cu2, smooth01((y - 0.16) / 0.1) * (1 - smooth01((y - 0.34) / 0.1)) * 0.6)));
    k.add(G.hemi(12), cu, [0, 0.72, 0], 0, [0.14, 0.06, 0.14]); k.add(G.sphere(8, 6), br, [0, 0.79, 0], 0, 0.028);
    k.add(G.torus(Math.PI, 0.12, 12), cu, [0.1, 0.48, 0], [0, 0, -Math.PI / 2], [0.19, 0.19, 0.19]);
    return k.build();
  } };
  const VASE_COL = {forest:[0x9a7860,0x8a715d,0x958b76],dairy:[0x857753,0x7f8067,0x99896e],cave:[0x85838a,0x9c8b75,0x7b7f75],volcano:[0x9b604c,0x867768,0xa37e58],castle:[0x826858,0x9e7c5b,0x815c51],town:[0xa07c62,0x8e8773,0x856954]};   // (town: terracotta and glazed pots)
  function makeBreakables(L, B) {
    const byKind = {}, dairy = L.theme === 'dairy';
    const vkOf = b => b.kind;   // Çürüme Vadisi's own looks
    L.breakables.forEach((b, i) => (byKind[vkOf(b, i)] || (byKind[vkOf(b, i)] = [])).push(i));
    const objs = new Array(L.breakables.length);
    for (const vk in byKind) {
      const ids = byKind[vk], kind = L.breakables[ids[0]].kind, K = KIND[vk];
      const im = new THREE.InstancedMesh(kgeo(vk), R.mat[K.mat], ids.length);
      const pal = VASE_COL[L.theme] || VASE_COL.forest;
      ids.forEach((bi, n) => {
        const b = L.breakables[bi], ry = B.rnd() * TAU, sc = kind === 'vase' ? 0.95 + B.rnd() * 0.3 : 0.95 + B.rnd() * 0.12;
        const m = mat4(b.x, 0, b.z, ry, sc);
        im.setMatrixAt(n, m);
        const vc = kind === 'vase' ? pal[Math.floor(B.rnd() * pal.length)] : 0;
        im.setColorAt(n, kind === 'vase' ? lin(vc) : lin(0xffffff, 0.92 + B.rnd() * 0.12));
        const debris = kind === 'vase' ? '#' + vc.toString(16).padStart(6, '0') : vk === 'bCan' ? '#e8a070' : vk === 'dCrateM' ? '#b8ecd0' : vk === 'dCrateP' ? '#ffc8d8' : kind === 'barrel' ? '#b07a48' : '#c8965a';
        const milk = false;   // jugs and cans were full of milk
        objs[bi] = { x: b.x, z: b.z, r: b.solid ? b.solid.r : 0.42, kind, broken: false,
          break() {
            if (this.brokenDone) return;
            this.brokenDone = true; this.broken = true;
            if (b.solid) b.solid.alive = false;
            im.setMatrixAt(n, _m.makeScale(0, 0, 0)); im.instanceMatrix.needsUpdate = true;
            if (typeof FX !== 'undefined' && FX.burst) { FX.burst('debris', b.x, 0.45, b.z, { color: debris, count: 12 }); FX.burst(milk ? 'milk' : 'dust', b.x, milk ? 0.35 : 0.2, b.z, {}); }
          } };
      });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'break-' + (vk === 'dCrateM' || vk === 'dCrateP' ? 'crate' : kind);
      B.g.add(im);
    }
    L.breakObjs = objs.filter(Boolean);
  }
  // "Neşe Taşı" checkpoint: floating pink crystal over a carved pedestal; glows up when activated
  function pedestalGeo() {
    if (R.geo.pedestal) return R.geo.pedestal;
    const k = new Kit();
    k.add(G.cyl(1, 1, 8), 0xe8e0f0, [0, 0.12, 0], [0, Math.PI / 8, 0], [0.78, 0.24, 0.78]);
    k.add(G.cyl(0.85, 1, 8), 0xf4eefa, [0, 0.39, 0], [0, Math.PI / 8, 0], [0.6, 0.3, 0.6]);
    k.add(G.cyl(1, 0.9, 8), 0xffffff, [0, 0.6, 0], [0, Math.PI / 8, 0], [0.5, 0.12, 0.5]);
    return (R.geo.pedestal = keep(k.build()));
  }
  function crystalMesh(mat) {
    const g=R.geo.cpCrystal||(R.geo.cpCrystal=keep((()=>{const k=new Kit();k.add(G.octa(),0xffffff,[0,0,0],0,[0.08,0.43,0.075]);k.add(G.octa(),0xffffff,[0,0.09,0],[0,0,Math.PI/2],[0.045,0.22,0.045]);k.add(G.octa(),0xffffff,[0,-0.22,0],0,[0.11,0.12,0.07]);return k.build();})()));return new THREE.Mesh(g,mat);
  }
  function makeCheckpoints(L, B) {
    L.cpObjs = L.checkpoints.map(c => {
      const g = new THREE.Group(); g.position.set(c.x, 0, c.z); B.g.add(g);
      const ped = L.theme === 'dairy' ? new THREE.Mesh(dreadGeo(3), R.mat.prop) : new THREE.Mesh(pedestalGeo(), L.theme === 'town' ? R.mat.ramp : R.mat.stone);   // Çürüme Vadisi: two stacked cheese wheels; Veba Şehri: sandstone
      ped.castShadow = ped.receiveShadow = true; g.add(ped);
      const pi = L.cpObjsN = (L.cpObjsN || 0) + 1, pool = R.cpPool[pi] || (R.cpPool[pi] = {
        cm: keep(new THREE.MeshStandardMaterial({ color: 0xad9983, emissive: 0xa95646, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.05, flatShading: true })),
        rm: keep(new THREE.MeshBasicMaterial({ color: lin(0xb48f7a, 0.6) })) });
      const cm = pool.cm, rm = pool.rm;
      cm.emissiveIntensity = 0.35; rm.color.copy(lin(0xb48f7a, 0.6));
      const ring = new THREE.Mesh(R.geo.cpRing || (R.geo.cpRing = keep(new THREE.TorusGeometry(0.61, 0.025, 6, 4))), rm);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.45; g.add(ring);
      const rune = new THREE.Mesh(R.geo.cpRune || (R.geo.cpRune = keep(new THREE.TorusGeometry(0.36, 0.014, 4, 4))), rm);   // thin rune ring on the top
      rune.rotation.x = Math.PI / 2; rune.position.y = 0.667; g.add(rune);
      const cr = crystalMesh(cm); cr.position.y = 1.25; cr.castShadow = true; g.add(cr);
      const orb = new THREE.Group(); orb.position.y = 1.2; orb.visible = false; g.add(orb);
      for (let k = 0; k < 3; k++) { const s = crystalMesh(cm); s.scale.setScalar(0.3); s.position.set(Math.cos(k * TAU / 3) * 0.55, 0, Math.sin(k * TAU / 3) * 0.55); orb.add(s); }
      const grp = B.grpN < 15 ? ++B.grpN : 0;
      for (let k = 0; k < 10; k++) B.pts.add.push({ x: c.x + (B.rnd() - 0.5) * 1.2, y: 0.6 + B.rnd() * 1.2, z: c.z + (B.rnd() - 0.5) * 1.2, kind: 2, ph: B.rnd(), size: 0.22, prm: 0.3 + B.rnd() * 0.3, col: lin(0xb08d78, 2.4), grp });
      if (grp && B.ptOn) B.ptOn.value[grp] = 0.25;
      const light = { x: c.x, y: 2.3, z: c.z + 0.2, col: new THREE.Color(0xb48f7a), int: 1.2, dist: 7, fl: 0, ph: 0 };   // high + soft: the stone stays stone
      glowAt(B, c.x, c.z, 2.3, 0xb48f7a, 0.28);
      B.lights.push(light);
      const o = { x: c.x, z: c.z, active: false, k: 0, obj: g,
        activate() {
          if (this.k > 0) return;
          this.active = true; this.k = 0.001; orb.visible = true;
          if (typeof FX !== 'undefined' && FX.burst) { FX.burst('magic', c.x, 1.3, c.z, { count: 24, color: '#a98572' }); FX.burst('sparkle', c.x, 1.4, c.z, { count: 14, color: '#c9ab87' }); }
          B.lights.push({ x: c.x, y: 2.4, z: c.z + 0.3, col: new THREE.Color(0xc9ab87), int: 7, dist: 9, fl: 0, ph: 0, life: 1.3 });   // a light burst that fades
        } };
      B.anim.push((dt) => {
        const t = TIME.t;
        if (o.k > 0 && o.k < 1) o.k = Math.min(1, o.k + dt * 1.5);
        const a = o.active ? o.k : 0;
        cr.position.y = 1.25 + Math.sin(t * 1.8) * 0.08; cr.rotation.y += dt * (0.6 + a * 1.4);
        orb.rotation.y -= dt * 1.2; orb.position.y = cr.position.y - 0.05;
        cm.emissiveIntensity = 0.35 + a * (1.3 + 0.3 * Math.sin(t * 3));   // ≤ 2: only the crystal and the rune rings glow
        rm.color.setHex(0xb48f7a).multiplyScalar(0.6 + a * 1.2);
        light.int = 1.2 + a * 2.3;
        if (grp && B.ptOn) B.ptOn.value[grp] = 0.25 + a * 0.75;
      });
      return o;
    });
  }
  // Magic portal: stone arch + swirling disk + ground glow + rising sparkles
  const PORTAL_FS = `uniform float uTime, uOn; varying vec2 vP;
    ${GLSL_NOISE}
    void main() {
      vec2 c = vP - vec2(0.0, 1.8);
      float r = length(c * vec2(1.0, 0.78)), a = atan(c.y, c.x);
      float edge = vP.y < 2.3 ? min(1.25 - abs(vP.x), vP.y) : 1.25 - length(vec2(vP.x, vP.y - 2.3));
      float t = uTime;
      float sw = 0.5 + 0.5 * sin(a * 3.0 - r * 7.0 + t * 2.4), sw2 = 0.5 + 0.5 * sin(a * 5.0 + r * 11.0 - t * 3.1);
      float n = lvVN(vec2(a * 2.0 + t * 0.7, r * 4.0 - t * 1.3));
      vec3 deep = vec3(0.08, 0.03, 0.25), mid = vec3(0.5, 0.2, 1.15), hot = vec3(1.7, 0.7, 2.3), cyan = vec3(0.45, 1.5, 2.2);
      vec3 col = mix(deep, mid, smoothstep(0.05, 1.3, r) * (0.45 + 0.55 * sw) * (0.7 + 0.6 * n));
      col += hot * pow(sw * sw2, 3.0) * smoothstep(0.15, 1.0, r);
      col = mix(col, cyan, smoothstep(0.32, 0.0, edge) * 0.85);
      vec2 gp = vP * 8.0 + vec2(0.0, -t * 0.6); float h = lvH21(floor(gp));
      col += vec3(2.2, 2.0, 2.6) * step(0.92, h) * smoothstep(0.3, 0.0, length(fract(gp) - 0.5)) * (0.5 + 0.5 * sin(t * 3.0 + h * 40.0));
      col *= mix(0.3, 1.0, uOn);
      gl_FragColor = vec4(col, smoothstep(0.0, 0.05, edge) * mix(0.35, 0.96, uOn));
      #include <colorspace_fragment>
    }`;
  function makePortal(L, B) {
    if (!L.exit) return;
    const ex = L.exit, g = new THREE.Group(); g.position.set(ex.x, 0, ex.z); B.g.add(g);
    const rnd = mulberry32(L.seed + 77), k = new Kit(), tint = L.theme === 'cave' ? [0x9aa2c4, 0x8f98bc] : L.theme === 'volcano' ? [0x9a8a86, 0x8c7e7c] : L.theme === 'dairy' ? [0xfff2e2, 0xf8e6d2] : L.theme === 'town' ? [0xf4dcb8, 0xe8ceaa] : [0xd4ccbc, 0xc4bcae];
    const st = () => lin(tint[Math.floor(rnd() * 2)], 0.9 + rnd() * 0.2);
    for (const sx of [-1, 1]) {
      let y = 0;
      for (let n = 0; n < 3; n++) { const h = 0.72 + rnd() * 0.12; k.add(G.rbox(), st(), [sx * 1.58 + (rnd() - 0.5) * 0.06, y + h / 2, 0], [0, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.06], [0.66 - n * 0.03, h, 0.72]); y += h + 0.02; }
    }
    const nv = 9;
    for (let n = 0; n < nv; n++) {
      const a = n / (nv - 1) * Math.PI, key = n === (nv - 1) / 2;
      k.add(G.rbox(), key ? lin(tint[0], 1.1) : st(), [Math.cos(a) * 1.6, 2.3 + Math.sin(a) * 1.6, 0], [0, 0, a - Math.PI / 2], key ? [0.46, 0.8, 0.8] : [0.5, 0.66, 0.72]);
    }
    k.add(G.rbox(), st(), [0, 0.07, 0.45], 0, [3.9, 0.14, 1.3]);
    k.add(G.rbox(), st(), [0, 0.05, 1.25], 0, [3.2, 0.1, 0.7]);
    const arch = new THREE.Mesh(k.build(), L.theme === 'dairy' ? R.mat.food : L.theme === 'town' ? R.mat.ramp : R.mat.rock); arch.castShadow = arch.receiveShadow = true; g.add(arch);   // dairy: a white-chocolate arch; town: the gate's sandstone
    B.dispose.push(arch.geometry);
    const rune = new Kit();
    rune.add(G.torus(TAU, 0.12, 20), 0x9af0ff, [0, 3.9, 0.41], 0, [0.16, 0.16, 0.16]);
    rune.add(G.octa(), 0xffffff, [0, 3.9, 0.42], 0, [0.07, 0.1, 0.03]);
    for (const sx of [-1, 1]) rune.add(G.octa(), 0xc8a0ff, [sx * 1.58, 1.9, 0.37], 0, [0.09, 0.14, 0.03]);
    const rm = new THREE.Mesh(rune.build(), R.mat.glow); g.add(rm); B.dispose.push(rm.geometry);
    const sh = new THREE.Shape();
    sh.moveTo(-1.25, 0); sh.lineTo(1.25, 0); sh.lineTo(1.25, 2.3); sh.absarc(0, 2.3, 1.25, 0, Math.PI, false); sh.lineTo(-1.25, 0);
    const dg = R.geo.portalDisk || (R.geo.portalDisk = keep(new THREE.ShapeGeometry(sh, 28)));
    const uOn = R.portalOn;
    const dm = R.mat.portalDisk || (R.mat.portalDisk = keep(new THREE.ShaderMaterial({
      uniforms: { uTime: TIME.u, uOn }, vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: PORTAL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })));
    const disk = new THREE.Mesh(dg, dm); disk.position.z = 0.02; disk.renderOrder = 3; g.add(disk);
    const gg = R.geo.portalGlow || (R.geo.portalGlow = keep(new THREE.PlaneGeometry(4.6, 4.6).rotateX(-Math.PI / 2)));
    const gm = R.mat.portalGlow || (R.mat.portalGlow = keep(new THREE.ShaderMaterial({ uniforms: { uTime: TIME.u, uOn }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime, uOn; varying vec2 vU; void main(){ vec2 c = (vU - 0.5) * 2.0; float d = length(c * vec2(1.0, 1.4));
        float k = smoothstep(1.0, 0.0, d) * (0.55 + 0.1 * sin(uTime * 2.0 + d * 6.0)); gl_FragColor = vec4(vec3(0.55, 0.3, 1.2) * k * k * uOn, 1.0);
        #include <colorspace_fragment>
      }` })));
    const glow = new THREE.Mesh(gg, gm); glow.position.set(0, 0.03, 0.7); glow.renderOrder = 2; g.add(glow);
    const grp = B.grpN < 15 ? ++B.grpN : 0;
    for (let n = 0; n < 34; n++) B.pts.add.push({ x: ex.x, y: 0.1, z: ex.z + 0.1, kind: 3, ph: n / 34 + rnd() * 0.02, size: 0.16 + rnd() * 0.08, prm: 0.6 + rnd() * 0.7, col: lin(n % 3 ? 0xb89aff : 0x8af0ff, 2.6), grp });
    const light = { x: ex.x, y: 1.8, z: ex.z + 0.8, col: new THREE.Color(0xa070ff), int: 6, dist: 9, fl: 0, ph: 0 };
    B.lights.push(light);
    L.portalObj = { x: ex.x, z: ex.z, active: true, obj: g,
      setActive(v) { this.active = !!v; uOn.value = v ? 1 : 0; light.int = v ? 6 : 0; if (grp && B.ptOn) B.ptOn.value[grp] = v ? 1 : 0; } };
    if (L.theme === 'town') L.portalObj.fit = { hw: 3.8, h: 6 };   // Yemin Kapısı round it (towers at ±2.85 m, r 0.95; the bridge's merlons ≈ 5.8 m): UI's portal camera frames it all
    if (L.boss) L.portalObj.setActive(false);   // asleep until the boss is cheered up (GAME calls setActive(true))
  }
  // Torch holders (flames are added to the shared flame billboard)
  function torchGeo(kind) {
    const key = 'torch' + kind;
    if (R.geo[key]) return R.geo[key];
    const k = new Kit(), iron = 0x4a4550, wood = 0xc49a6a;
    if (kind === 'wall') {
      k.add(MK(G.box()), iron, [0, -0.05, 0.02], 0, [0.16, 0.3, 0.04]);
      k.seg([0, -0.14, 0.04], [0, -0.02, 0.26], 0.025, iron, 0.025, 6);
      k.add(G.cyl(0.8, 1, 8), wood, [0, 0.02, 0.28], 0, [0.04, 0.34, 0.04]);
      k.add(MK(G.cyl(1.3, 0.8, 10)), iron, [0, 0.19, 0.28], 0, [0.075, 0.08, 0.075]);
    } else if (kind === 'stand') {
      k.add(G.cyl(0.7, 1, 8), wood, [0, 0.72, 0], 0, [0.055, 1.44, 0.055]);
      for (const y of [0.35, 1.2]) k.add(MK(G.torus(TAU, 0.3, 12)), iron, [0, y, 0], [Math.PI / 2, 0, 0], [0.06, 0.06, 0.06]);
      k.add(MK(G.cyl(1.4, 0.8, 10)), iron, [0, 1.47, 0], 0, [0.09, 0.1, 0.09]);
      for (let n = 0; n < 4; n++) { const a = n * TAU / 4 + 0.4; k.add(G.sphere(8, 6), 0x7a7e90, [Math.cos(a) * 0.14, 0.05, Math.sin(a) * 0.14], 0, [0.09, 0.07, 0.08]); }
    } else {
      for (let n = 0; n < 3; n++) { const a = n * TAU / 3; k.seg([Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38], [Math.cos(a) * 0.12, 0.85, Math.sin(a) * 0.12], 0.04, iron, 0.035, 6); }
      const pts = [[0.001, 0], [0.18, 0], [0.42, 0.18], [0.5, 0.3], [0.46, 0.31], [0.001, 0.2]].map(p => new THREE.Vector2(p[0], p[1]));
      k.add(MK(new THREE.LatheGeometry(pts, 16)), 0x6a5a48, [0, 0.8, 0]);
      k.add(MK(G.torus(TAU, 0.08, 20)), GOLD, [0, 1.1, 0], [Math.PI / 2, 0, 0], [0.48, 0.48, 0.48]);
    }
    return (R.geo[key] = keep(k.build()));
  }
  function makeTorches(L, B) {
    for (const t of L.torches) {
      const warm = 0xff9a48;
      if (t.brazier) { dec(B, 'prop', torchGeo('brazier'), mat4(t.x, 0, t.z), null); addFlame(B, t.x, 1.08, t.z, 1.9, 7); glowAt(B, t.x, t.z, 4.4, warm, 0.62); continue; }
      if (L.theme === 'castle') { dec(B, 'prop', torchGeo('wall'), mat4(t.x, t.y - 0.25, t.z - 0.05), null); addFlame(B, t.x, t.y + 0.02, t.z + 0.23, 1, 5.5); glowAt(B, t.x, t.z + 0.9, 3.4, warm, 0.5, 1.15, 1); }
      else { dec(B, 'prop', torchGeo('stand'), mat4(t.x, 0, t.z), null); addFlame(B, t.x, 1.55, t.z, 1, 9); glowAt(B, t.x, t.z + 0.3, 3.8, warm, 0.55); }
    }
  }
  // Placeholder owl (used only when EMODEL.owl is not there yet)
  function placeholderOwl() {
    const k=new Kit();
    k.add(G.cone(8),0x302e32,[0,0.72,0],0,[0.38,1.44,0.3]);
    k.add(G.sphere(12,8),0x3a3439,[0,1.28,0],0,[0.28,0.33,0.25]);
    k.add(G.box(),0x928776,[0,1.3,0.228],[-.23,0,0],[0.27,0.4,0.042]);
    k.add(G.cone(4),0x4f4540,[0,1.6,0.07],[0,0,0],[0.36,0.2,0.31]);
    for(const x of [-0.075,0.075])k.add(G.box(),0x1b191d,[x,1.34,0.242],[0,0,x<0?-0.13:0.13],[0.055,0.018,0.012]);
    k.add(G.box(),0x353139,[0,1.19,0.245],0,[0.022,0.07,0.015]);
    for(const sd of [-1,1])k.seg([sd*0.23,0.95,0],[sd*0.35,0.51,0.14],0.085,0x383238,0.038,6);
    k.add(G.box(),0x655846,[0.33,0.35,0.19],[0,0,0.12],[0.045,0.7,0.045]);
    const mesh=new THREE.Mesh(R.geo.owl||(R.geo.owl=keep(k.build())),R.mat.owl||(R.mat.owl=keep(rimify(vcMat({roughness:0.7}),0xa99e88,0.25))));mesh.castShadow=true;
    const root=new THREE.Group();root.add(mesh);let t=0;return {root,placeholder:true,anim(dt,talking){t+=dt;mesh.rotation.z=Math.sin(t*0.7)*0.016;mesh.position.y=talking?Math.sin(t*5)*0.008:0;}};
  }
  function makeNpc(L, B) {
    if (!L.npc) return;
    const n = L.npc;
    let model = null;
    // The village survivor wears a burial hood and a narrow wooden death mask.
    if (!model || !model.root) model = placeholderOwl();
    // EMODEL.owl may already include its own stump: if the model is tall, stand it on the ground instead
    const bb = new THREE.Box3().setFromObject(model.root), tall = bb.max.y - bb.min.y > 1.1;
    if (!tall) inst(B, 'stump', mat4(n.x, 0, n.z, 0.6, 1.05));
    model.root.position.set(n.x, tall ? 0 : 0.58, n.z);
    model.root.rotation.y = model.root.rotation.y || 0;
    B.g.add(model.root);
    L.npcObj = { x: n.x, z: n.z, model };
  }
  // Reserve the travelling stall before decorative props are placed; keep its approach reachable on every seed.
  function placeMerchant(L) {
    if (!['kefir', 'yanardag', 'kale'].includes(L.Z.id)) return;
    const st = L.start;
    let spot = null;
    for (const r of [4.2, 5, 5.8, 3.5]) {
      for (const a of [-2.7, -0.44, -2.25, -0.9, -1.57, 0, Math.PI]) {
        const x = st.x + Math.cos(a) * r, z = st.z + Math.sin(a) * r;
        if (circleFree(L, x, z, 2.0) && !L.checkpoints.some(c => hyp(c.x - x, c.z - z) < 3.4) &&
          !L.chests.some(c => hyp(c.x - x, c.z - z) < 3.0)) { spot = { x, z }; break; }
      }
      if (spot) break;
    }
    if (!spot) {   // the start room has floor even when its decoration slots are crowded
      const rm = L.rooms[0], hh = rm.hh || rm.r, hw = rm.hw || rm.r;
      for (let z = rm.z - hh + 2; z < rm.z + hh - 2 && !spot; z += 0.6)
        for (let x = rm.x - hw + 2; x < rm.x + hw - 2; x += 0.6)
          if (hyp(x - st.x, z - st.z) >= 3 && circleFree(L, x, z, 1.9)) { spot = { x, z }; break; }
    }
    if (!spot) return;
    L.merchant = spot;
    L.solids.push({ x: spot.x, z: spot.z, r: 1.65, kind: 'merchant' }); L._sh = null;
    L.spawns = L.spawns.filter(e => e.type === L.Z.boss || hyp(e.x - spot.x, e.z - spot.z) > 9);
    if (!L.checkpoints.some(c => hyp(c.x - st.x, c.z - st.z) < 7)) {
      const a = Math.atan2(st.z - spot.z, st.x - spot.x);
      for (const da of [-0.8, 0.8, -1.2, 1.2, 0]) {
        const x = spot.x + Math.cos(a + da) * 3.6, z = spot.z + Math.sin(a + da) * 3.6;
        if (hyp(x - st.x, z - st.z) > 1.2 && circleFree(L, x, z, 1.05)) {
          L.checkpoints.push({ x, z }); L.solids.push({ x, z, r: 0.7, kind: 'cp' }); L._sh = null; break;
        }
      }
    }
  }
  function makeMerchant(L, B) {
    if (!L.merchant || typeof EMODEL === 'undefined' || typeof EMODEL.merchant !== 'function') return;
    const m = L.merchant, model = EMODEL.merchant();
    model.root.position.set(m.x, 0, m.z); B.g.add(model.root); m.model = model;
    B.anim.push(dt => model.anim(dt));
    const halo = new THREE.Mesh(new THREE.RingGeometry(3.31, 3.36, 64), new THREE.MeshBasicMaterial({ color: '#a78f6d', transparent: true, opacity: 0.28, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(m.x, 0.065, m.z); B.g.add(halo);
    const c = document.createElement('canvas'); c.width = 640; c.height = 150;
    const x = c.getContext('2d'); x.textAlign = 'center'; x.lineJoin = 'round';
    x.font = 'bold 49px Georgia'; x.lineWidth = 10; x.strokeStyle = '#29221d'; x.strokeText('Kül Tüccarı', 320, 61);
    x.fillStyle = '#d2b994'; x.fillText('Kül Tüccarı', 320, 61);
    x.font = 'bold 27px Georgia'; x.lineWidth = 6; x.strokeText('GEZGİN TÜCCAR', 320, 105); x.fillStyle = '#aa8061'; x.fillText('GEZGİN TÜCCAR', 320, 105);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    label.position.set(m.x, 3.2, m.z); label.scale.set(3.7, 0.87, 1); B.g.add(label); B.dispose.push(tex);
  }

  function buildProps(L, B) {
    makeChests(L, B); makeBreakables(L, B); makeCheckpoints(L, B); makePortal(L, B); makeTorches(L, B); makeNpc(L, B); makeMerchant(L, B);
  }

  // ── Zone 0 village edge: cute timber houses (north of the plaza), well, lamps, fences, flower beds, sign ──
  const PLASTER = [0xffffff, 0xffe9e2, 0xfff3d6, 0xeafff0];
  const DOORS = [0x9a6038, 0x5a88d0, 0x4aa87a, 0xd05a5a];
  const ROOFT = [0xffffff, 0xffd8c0, 0xe8d0ff];
  function gableGeo(w, h) {   // triangle in the XY plane facing +z (and its back face), UVs inside the plaster frame
    const g = new THREE.BufferGeometry(), x = w / 2;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-x, 0, 0, x, 0, 0, 0, h, 0, x, 0, 0, -x, 0, 0, 0, h, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0.02, 0.04, 0.98, 0.04, 0.5, 0.9, 0.98, 0.04, 0.02, 0.04, 0.5, 0.9], 2));
    return g;
  }
  function wellRingGeo() {
    if (R.geo.wellRing) return R.geo.wellRing;
    const pts = [[0.92, 0], [0.92, 0.76], [0.88, 0.84], [0.66, 0.84], [0.62, 0.78], [0.62, 0.3]].map(p => new THREE.Vector2(p[0], p[1]));
    return (R.geo.wellRing = keep(new THREE.LatheGeometry(pts, 22)));
  }
  function buildVillage(L, B) {
    const V = L.village, rnd = mulberry32(L.seed + 555), tmp = B.tmpGeo;
    const put = (M, mk, geo, m, col) => dec(B, mk, geo, M ? new THREE.Matrix4().multiplyMatrices(M, m) : m, col);
    for (const h of V.houses) {
      const M = mat4(h.x, 0, h.z, h.yaw), w = h.w, d = h.d, wh = h.h, base = 0.3, top = base + wh;
      const pl = lin(PLASTER[h.seed % 4]), door = lin(DOORS[(h.seed >> 3) % 4]), rt = lin(ROOFT[h.roof % 3]);
      put(M, 'stone', G.rbox(), mat4(0, base / 2, 0, 0, w + 0.3, base, d + 0.3), lin(0xd6cec2));
      put(M, 'plaster', G.box(), mat4(0, base + wh / 2, 0, 0, w, wh, d), pl);
      // roof (ridge along x, or along z = gable toward the plaza)
      const along = h.gable ? 'z' : 'x', span = along === 'x' ? d : w, len = along === 'x' ? w : d, oh = 0.4, hs = span / 2 + oh, rh = 1.55 + span * 0.08;
      const yr = top + (span / 2) * (rh / hs), th = Math.atan2(rh, hs), sl = Math.hypot(hs, rh);
      const slab = boxUV(len + 0.7, 0.16, sl, 2); tmp.push(slab);
      for (const sd of [-1, 1]) {
        const c = hs / 2, yc = yr - rh / 2 + 0.06;
        if (along === 'x') put(M, 'roof', slab, mat4(0, yc, sd * c, 0, 1, 1, 1, sd * th, 0), rt);
        else put(M, 'roof', slab, mat4(sd * c, yc, 0, Math.PI / 2, 1, 1, 1, sd * th, 0), rt);
      }
      put(M, 'prop', G.box(), along === 'x' ? mat4(0, yr + 0.06, 0, 0, len + 0.75, 0.14, 0.2) : mat4(0, yr + 0.06, 0, 0, 0.2, 0.14, len + 0.75), lin(0x8a5a3a));
      const gg = gableGeo(span, yr - top); tmp.push(gg);
      for (const sd of [-1, 1]) {
        if (along === 'x') put(M, 'plaster', gg, mat4(sd * w / 2, top, 0, sd * Math.PI / 2), pl);
        else put(M, 'plaster', gg, mat4(0, top, sd * d / 2, sd > 0 ? 0 : Math.PI), pl);
      }
      // chimney + smoke
      const cx = along === 'x' ? w * 0.28 : -w * 0.22, cz = along === 'x' ? -hs * 0.4 : d * 0.22;
      put(M, 'stone', G.rbox(), mat4(cx, yr - 0.1, cz, 0, 0.55, 1.5, 0.55), lin(0xcfc3b4));
      put(M, 'stone', G.rbox(), mat4(cx, yr + 0.7, cz, 0, 0.68, 0.14, 0.68), lin(0xbfb2a4));
      const cw = new THREE.Vector3(cx, yr + 0.8, cz).applyMatrix4(M);
      for (let n = 0; n < 6; n++) B.pts.norm.push({ x: cw.x, y: cw.y, z: cw.z, kind: 7, ph: n / 6 + rnd() * 0.05, size: 0.55, prm: 0.16, col: lin(0x827969, 0.95) });
      // front: door with round top, step, lantern
      const fz = d / 2, dx = h.door;
      put(M, 'prop', G.box(), mat4(dx, base + 0.78, fz + 0.03, 0, 0.9, 1.56, 0.08), door);
      // A barred door and scratched family tally: the house once belonged to someone.
      put(M,'prop',G.box(),mat4(dx,base+1.1,fz+.081,0,.68,.075,.035,0,.22),lin(0x72604d));
      for(let mark=0;mark<4;mark++)put(M,'decor',G.box(),mat4(dx+.31+(mark-1.5)*.045,base+.98,fz+.084,0,.017,.16,.013,0,-.11),lin(0xb8a78b));
      put(M,'decor',G.box(),mat4(dx+.31,base+.98,fz+.09,0,.23,.018,.013,0,-.6),lin(0xaa977b));
      put(M,'decor',G.box(),mat4(-w*.25,base+.54,fz+.016,0,.34,.07,.013,0,.17),lin(0x6a322b));
      put(M,'decor',G.box(),mat4(-w*.25,base+.54,fz+.023,0,.04,.24,.014,0,-.13),lin(0x6a322b));
      put(M, 'prop', halfCyl(), mat4(dx, base + 1.56, fz + 0.03, Math.PI / 2, 0.45, 0.08, 0.45, 0, Math.PI / 2), door);
      put(M, 'stone', G.box(), mat4(dx, base + 0.95, fz + 0.02, 0, 1.12, 1.9, 0.06), lin(0xcabfae));
      put(M, 'stone', G.rbox(), mat4(dx, 0.1, fz + 0.45, 0, 1.3, 0.2, 0.6), lin(0xd6cec2));
      put(M, 'prop', MK(G.sphere(8, 6)), mat4(dx + 0.3, base + 0.8, fz + 0.09, 0, 0.05), lin(GOLD));
      put(M, 'window', G.sphere(10, 8), mat4(dx + 0.7, base + 1.75, fz + 0.14, 0, 0.1, 0.13, 0.1), lin(0xffffff));
      put(M, 'prop', MK(G.cone(6)), mat4(dx + 0.7, base + 1.93, fz + 0.14, 0, 0.12, 0.1, 0.12), lin(0x3a3438));
      // windows (front + sides) with frames, shutters and flower boxes
      const win = (px, py, pz, ry, big) => {
        const Wm = new THREE.Matrix4().multiplyMatrices(M, mat4(px, py, pz, ry)), s = big ? 1 : 0.85;
        put(Wm, 'window', G.box(), mat4(0, 0, 0.02, 0, 0.62 * s, 0.66 * s, 0.03), lin(0xbbb5a5));
        put(Wm,'prop',G.box(),mat4(-0.08*s,0.04*s,0.068,0,0.07*s,0.74*s,0.035,0,0.45),lin(0x3c3533));
        put(Wm,'prop',G.box(),mat4(0,-0.05*s,0.074,0,0.72*s,0.065*s,0.04,0,-0.12),lin(0x65554a));
        for (const [ox, oy, sx, sy] of [[0, 0.35, 0.74, 0.07], [0, -0.35, 0.8, 0.08], [0.34, 0, 0.07, 0.72], [-0.34, 0, 0.07, 0.72], [0, 0, 0.62, 0.04], [0, 0, 0.04, 0.66]])
          put(Wm, 'prop', G.box(), mat4(ox * s, oy * s, 0.05, 0, sx * s, sy * s, 0.05), lin(0x8a5a3a));
        const sc = lin(DOORS[(h.seed >> 5) % 4], 1.05);
        for (const sd of [-1, 1]) put(Wm, 'prop', G.box(), mat4(sd * 0.5 * s, 0, 0.06, sd * 0.35, 0.3 * s, 0.7 * s, 0.035), sc);
        put(Wm, 'prop', G.box(), mat4(0, -0.47 * s, 0.13, 0, 0.78 * s, 0.14, 0.2), lin(0xb07a4a));
        for (let f = 0; f < 5; f++) put(Wm, 'decor', flowerGeo(Math.floor(rnd() * FLOWER_COL.length)), mat4((f - 2) * 0.15 * s, -0.47 * s + 0.02, 0.13, rnd() * TAU, 0.55), null);
      };
      const wx = w / 2 - 0.85;
      if (dx < w * 0.1) win(wx, base + 1.5, fz, 0, true); if (dx > -w * 0.1) win(-wx, base + 1.5, fz, 0, true);
      win(w / 2, base + 1.5, 0, Math.PI / 2, false); win(-w / 2, base + 1.5, 0, -Math.PI / 2, false);
      if (along === 'z') put(M, 'window', G.cyl(1, 1, 16), mat4(0, top + (yr - top) * 0.42, fz + 0.03, 0, 0.26, 0.04, 0.26, Math.PI / 2), lin(0xffffff));
      // a couple of bushes hugging the house corners
      for (const sd of [-1, 1]) {
        const p = new THREE.Vector3(sd * (w / 2 + 0.35), 0, fz - 0.2).applyMatrix4(M);
        addBush(B, mat4(p.x, 0, p.z, rnd() * TAU, 0.7 + rnd() * 0.25), lin(PAL.green[Math.floor(rnd() * 5)]), rnd() < 0.5);
      }
      const lw = new THREE.Vector3(dx + 0.7, base + 1.75, fz + 0.4).applyMatrix4(M);
      B.lights.push({ x: lw.x, y: lw.y, z: lw.z, col: new THREE.Color(0xffc070), int: 2.2, dist: 5.5, fl: 0.3, ph: rnd() * 9 });
      glowAt(B, lw.x, lw.z, 2.2, 0xffc070, 0.22);
    }
    // well
    if (V.well) {
      const M = mat4(V.well.x, 0, V.well.z, (rnd() - 0.5) * 0.5);   // roof ridge east-west: its shadow on the view stays short
      put(M, 'stone', wellRingGeo(), new THREE.Matrix4(), lin(0xd8d0c4));
      put(M, 'shiny', G.cyl(1, 1, 22), mat4(0, 0.42, 0, 0, 0.63, 0.02, 0.63), lin(0x4e5940, 0.55));
      if (V.well.low) put(M, 'prop', kgeo('barrel'), mat4(0.62, 0.84, 0.3, 0.4, 0.36, 0.36, 0.36), lin(0xffffff));   // roofless: bucket on the rim
      else {
        for (const sd of [-1, 1]) put(M, 'prop', G.box(), mat4(sd * 0.8, 1.2, 0, 0, 0.12, 2.1, 0.12), lin(0xc49a6a));
        put(M, 'prop', G.cyl(1, 1, 10), mat4(0, 1.75, 0, 0, 0.05, 1.72, 0.05, 0, Math.PI / 2), lin(0xa87a4a));
        const rs = boxUV(1.95, 0.08, 0.7, 2); tmp.push(rs);
        for (const sd of [-1, 1]) put(M, 'roof', rs, mat4(0, 2.42, sd * 0.28, 0, 1, 1, 1, sd * 0.75, 0), lin(0xffffff));
        put(M, 'decor', G.cyl(1, 1, 5), mat4(0.1, 1.42, 0, 0, 0.012, 0.64, 0.012), lin(0x6a5a40));
        put(M, 'prop', kgeo('barrel'), mat4(0.1, 0.98, 0, 0, 0.36, 0.36, 0.36), lin(0xffffff));
      }
    }
    // lamp posts
    for (const p of V.lamps) {
      const M = mat4(p.x, 0, p.z, 0), iron = lin(0x2c3a36);
      put(M, 'prop', MK(G.cyl(1, 1.3, 10)), mat4(0, 0.15, 0, 0, 0.16, 0.3, 0.16), iron);
      put(M, 'prop', MK(G.cyl(0.8, 1, 10)), mat4(0, 1.2, 0, 0, 0.06, 2.2, 0.06), iron);
      put(M, 'window', G.box(), mat4(0, 2.52, 0, 0, 0.24, 0.3, 0.24), lin(0xffffff));
      for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) put(M, 'prop', MK(G.box()), mat4(ox * 0.13, 2.52, oz * 0.13, 0, 0.035, 0.34, 0.035), iron);
      put(M, 'prop', MK(G.cone(4)), mat4(0, 2.8, 0, Math.PI / 4, 0.26, 0.22, 0.26), iron);
      put(M, 'prop', MK(G.box()), mat4(0, 2.34, 0, 0, 0.3, 0.05, 0.3), iron);
      B.lights.push({ x: p.x, y: 2.5, z: p.z, col: new THREE.Color(0xffc878), int: 3, dist: 7, fl: 0.2, ph: rnd() * 9 });
      glowAt(B, p.x, p.z, 3.2, 0xffc070, 0.3);
      for (let n = 0; n < 3; n++) B.pts.add.push({ x: p.x, y: 2.55, z: p.z, kind: 1, ph: rnd(), size: 0.05, prm: 0.3, col: lin(0xffe0a0, 1.5) });
    }
    // fences along the southern rim of the plaza (low: never hides the hero)
    const F = V.fences;
    for (let i = 0; i < F.length; i++) {
      const p = F[i];
      put(null, 'prop', G.box(), mat4(p.x, 0.36, p.z, rnd() * 0.2, 0.11, 0.72, 0.11), lin(0xe6ceb0));
      put(null, 'prop', G.cone(4), mat4(p.x, 0.78, p.z, Math.PI / 4, 0.09, 0.12, 0.09), lin(0xe6ceb0));
      const q = F[i + 1];
      if (q && hyp(q.x - p.x, q.z - p.z) < 2.3) {
        const l = hyp(q.x - p.x, q.z - p.z), a = Math.atan2(q.x - p.x, q.z - p.z);
        for (const y of [0.3, 0.58]) put(null, 'prop', G.box(), mat4((p.x + q.x) / 2, y, (p.z + q.z) / 2, a, 0.05, 0.09, l), lin(0xd8bc98));
      }
    }
    // flower beds in front of the houses
    for (const b of V.beds) {
      const M = mat4(b.x, 0, b.z, b.yaw);
      for (const [ox, oz, sx, sz] of [[0, 0.42, 1.7, 0.1], [0, -0.42, 1.7, 0.1], [0.8, 0, 0.1, 0.8], [-0.8, 0, 0.1, 0.8]]) put(M, 'prop', G.box(), mat4(ox, 0.12, oz, 0, sx, 0.24, sz), lin(0xd0a878));
      put(M, 'decor', G.box(), mat4(0, 0.1, 0, 0, 1.55, 0.18, 0.75), lin(0x5a3a26));
      for (let f = 0; f < 11; f++) put(M, 'decor', flowerGeo(Math.floor(rnd() * FLOWER_COL.length)), mat4((rnd() - 0.5) * 1.4, 0.18, (rnd() - 0.5) * 0.6, rnd() * TAU, 0.9 + rnd() * 0.4), null);
    }
    // benches and hay bales just outside the plaza rim, facing it
    const S = L.rooms[0];
    for (const a0 of [-1.75, 1.65, -2.5, 2.45]) {
      let rr = S.r * 0.6;
      const dx = Math.sin(a0), dz = -Math.cos(a0);
      while (rr < S.r + 5 && L.grid[Math.floor(S.z + dz * rr) * L.W + Math.floor(S.x + dx * rr)]) rr += 0.25;
      const x = S.x + dx * (rr + 0.55), z = S.z + dz * (rr + 0.55);
      if (B.noTree.some(o => hyp(o.x - x, o.z - z) < o.r + 0.6) || L.solids.some(o => hyp(o.x - x, o.z - z) < o.r + 1)) continue;
      const M = mat4(x, 0, z, Math.atan2(-dx, -dz));
      if (Math.abs(a0) < 2) {
        put(M, 'prop', G.box(), mat4(0, 0.45, 0, 0, 1.4, 0.07, 0.42), lin(0xe8c8a0));
        put(M, 'prop', G.box(), mat4(0, 0.78, -0.2, 0, 1.4, 0.3, 0.06, -0.15), lin(0xe8c8a0));
        for (const sx of [-0.6, 0.6]) { put(M, 'prop', G.box(), mat4(sx, 0.22, 0.12, 0, 0.08, 0.44, 0.08), lin(0x8a5a3a)); put(M, 'prop', G.box(), mat4(sx, 0.45, -0.18, 0, 0.08, 0.9, 0.08), lin(0x8a5a3a)); }
      } else {
        for (const [ox, oz, oy] of [[-0.45, 0, 0.36], [0.45, 0.1, 0.36], [0, 0.05, 0.98]]) {
          put(M, 'decor', G.cyl(1, 1, 16), mat4(ox, oy, oz, 0, 0.36, 0.95, 0.36, 0, Math.PI / 2), lin(0xe8c860));
          for (const b of [-0.25, 0.25]) put(M, 'decor', G.torus(TAU, 0.06, 16), mat4(ox + b, oy, oz, Math.PI / 2, 0.37, 0.37, 0.37), lin(0xb08a3a));
        }
      }
      B.noTree.push({ x, z, r: 1.2 });
    }
    // sign post pointing toward the forest path
    if (V.sign) {
      const s = V.sign, M = mat4(s.x, 0, s.z, s.dir - Math.PI / 2);
      put(M, 'prop', G.box(), mat4(0, 0.75, 0, 0, 0.12, 1.5, 0.12), lin(0xc49a6a));
      put(M, 'prop', G.box(), mat4(0.12, 1.3, 0, 0, 0.9, 0.3, 0.06), lin(0xf0d8a8));
      put(M, 'prop', G.cone(3), mat4(0.66, 1.3, 0, 0, 0.2, 0.36, 0.06, 0, -Math.PI / 2), lin(0xf0d8a8));
      put(M, 'decor', G.box(), mat4(0.18, 1.3, 0.035, 0, 0.62, 0.06, 0.01), lin(0x6a4a2a));
    }
  }

  // ── LEVEL.build ──
  function build(L) {
    if (!L) return L;
    if (L.group) dispose(L);
    const t0 = performance.now();
    if (texOK() && TEX.ensure) { try { TEX.ensure(L.theme); } catch (e) { console.warn('LEVEL: TEX.ensure', e); } }   // no-op when the UI already did it under the fade
    ensureRes();
    const g = L.group = new THREE.Group(); g.name = 'level'; scene.add(g);
    if (L.solids.some(s => s.built)) { L.solids = L.solids.filter(s => !s.built); L._sh = null; }   // rebuilding the same L
    const th = THEME[L.theme] || THEME.forest;
    setLighting(th); POST.saturation = th.sat; POST.vignette = th.vig ?? 0.26;   // (Çürüme Vadisi: a lighter vignette, the others keep 0.32)
    const ru = R.mat.rock.userData.u, mc = lin(th.moss[0]);
    ru.uMoss.value.set(mc.r, mc.g, mc.b, th.moss[1]);
    const rc = lin(th.rim[0]); ru.uRim.value.set(rc.r, rc.g, rc.b, th.rim[1]);
    R.mat.stone.userData.u.uMoss.value.set(mc.r, mc.g, mc.b, th.moss[1] * 0.6);
    for (const l of LIGHTS.torches) l.intensity = 0;
    R.ptOn.value.fill(1); R.portalOn.value = 1;
    const B = L._b = { L, g, rnd: mulberry32((L.seed ^ 0x9e3779b9) >>> 0), inst: {}, dec: {}, lights: [], pts: { add: [], norm: [] }, flames: [], slime: [], banners: [], windows: [], shelves: [], falls: [], signs: [],
      ck: CHUNK,   // 16 m everywhere (Çürüme Vadisi too): its chunks are triangle-heavy, and smaller ones cull far better (it has the fewest draw calls anyway)
      anim: [], dispose: [], tmpGeo: [], glows: [], far: [], noTree: [], noDec: new Uint8Array(L.W * L.H), prox: {}, grpN: 0, ptOn: R.ptOn, ptScale: R.ptScale, slots: LIGHTS.torches.map(() => ({ c: null, k: 0 })) };
    const V = L.village;
    if (V) {
      for (const h of V.houses) B.noTree.push({ x: h.x, z: h.z, r: Math.max(h.w, h.d) * 0.5 + 1.3 });
      for (const b of V.beds) B.noTree.push({ x: b.x, z: b.z, r: 1.1 });
      for (const f of V.fences) B.noTree.push({ x: f.x, z: f.z, r: 0.55 });
      if (V.sign) B.noTree.push({ x: V.sign.x, z: V.sign.z, r: 0.9 });
      for (const h of V.houses) {   // no grass tufts / flowers poking through the houses
        const cs = Math.cos(h.yaw), sn = Math.sin(h.yaw), R = Math.hypot(h.w, h.d) / 2 + 1;
        for (let j = Math.floor(h.z - R); j <= h.z + R; j++) for (let i = Math.floor(h.x - R); i <= h.x + R; i++) {
          if (i < 0 || j < 0 || i >= L.W || j >= L.H) continue;
          const dx = i + 0.5 - h.x, dz = j + 0.5 - h.z;
          if (Math.abs(dx * cs - dz * sn) < h.w / 2 + 0.5 && Math.abs(dx * sn + dz * cs) < h.d / 2 + 0.5) B.noDec[j * L.W + i] = 1;
        }
      }
      for (const b of V.beds) B.noDec[Math.floor(b.z) * L.W + Math.floor(b.x)] = 1;
      if (V.well) B.noDec[Math.floor(V.well.z) * L.W + Math.floor(V.well.x)] = 1;
    }
    if (L.merchant) {
      const m = L.merchant; B.noTree.push({ x: m.x, z: m.z, r: 4 });
      for (let z = Math.max(0, Math.floor(m.z - 4)); z < Math.min(L.H, m.z + 4); z++)
        for (let x = Math.max(0, Math.floor(m.x - 4)); x < Math.min(L.W, m.x + 4); x++) if (hyp(x + 0.5 - m.x, z + 0.5 - m.z) < 4) B.noDec[z * L.W + x] = 1;
    }
    if (L.exit) B.noTree.push({ x: L.exit.x, z: L.exit.z - 0.5, r: 2.4 });
    const bt = L.buildT = {}, lap = (k, t) => { const n2 = performance.now(); bt[k] = Math.round(n2 - t); return n2; };   // build phases (ms), for tests
    let tp = performance.now();
    L._volc = L.theme === 'volcano' ? volcanoField(L) : null;   // lava / milk + bridges first: the floor mask needs them
    L._dairy = L.theme === 'dairy' ? dairyField(L) : null;
    L._town = L.theme === 'town' ? townField(L) : null;   // (Veba Şehri: the river, canals, bridges and the city walls' line)
    tp = lap('field', tp);
    buildFloor(L, B);
    tp = lap('floor', tp);
    if (L.theme === 'forest') buildForest(L, B); else if (L.theme === 'dairy') buildDairy(L, B); else if (L.theme === 'cave') buildCave(L, B); else if (L.theme === 'volcano') buildVolcano(L, B); else if (L.theme === 'town') buildTown(L, B); else buildCastle(L, B);
    if (V) buildVillage(L, B);
    if(L.theme!=='dairy') dreadRoomDecor(L,B);
    tp = lap('theme', tp);
    L.fixedProps = fixReach(L, unProp, dropUnreachable);   // build-time rocks / props must not cut off a room, chest or checkpoint
    tp = lap('reach', tp);
    finishSigns(L, B);
    buildProps(L, B);
    finishBanners(B); finishSlime(B); finishWindows(B); finishLavafalls(B);
    finishInst(L, B); finishDecor(L, B); finishPoints(L, B); finishFlames(L, B); buildGlowTex(L, B);
    lap('finish', tp);
    for (const t of B.tmpGeo) t.dispose();
    B.tmpGeo.length = 0;
    buildMapCanvas(L);
    L.buildMs = Math.round(performance.now() - t0);
    return L;
  }

  // ── LEVEL.update: props animation + the 4 pooled torch lights follow the hero ──
  const DECOR_FAR = 28;
  function update(dt, L, fx, fz) {
    const B = L && L._b;
    if (!B) return;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    if (fx === undefined || fz === undefined) { fx = CAM.target.x; fz = CAM.target.z; }
    R.heroU.value.set(fx, 0, fz);
    B.ptScale.value = innerHeight * renderer.getPixelRatio() / (2 * Math.tan(camera.fov * Math.PI / 360));
    for (let i = 0; i < B.anim.length; i++) B.anim[i](dt, fx, fz);
    const rp = B.rip;
    if (rp && rp.src.length > 4 - rp.fixed && (rp.t -= dt) <= 0) {   // more splashes than ripple slots: the nearest ones ripple
      rp.t = 0.5;
      const o = rp.src.slice().sort((a, b) => hyp(a[0] - fx, a[1] - fz) - hyp(b[0] - fx, b[1] - fz));
      for (let i = rp.fixed; i < 4; i++) { const q = o[i - rp.fixed]; if (q) rp.u.value[i].set(q[0], q[1], q[2], q[3]); }
    }
    for (let i = 0; i < B.far.length; i++) {   // small ground decor (flowers, tufts, pebbles) far from the view centre: not drawn
      const f = B.far[i], dx = f.x - fx, dz = f.z - fz, d = DECOR_FAR + f.r;
      f.o.visible = dx * dx + dz * dz < d * d;
    }
    assignLights(B, fx, fz, dt);
  }
  const LT_BEST = [];   // reused every frame (no garbage): the nearest candidate lights, best first
  function assignLights(B, fx, fz, dt) {
    const Ls = B.lights, slots = B.slots, ns = slots.length, best = LT_BEST;
    best.length = 0;
    for (let i = Ls.length - 1; i >= 0; i--) {
      const c = Ls[i];
      if (c.life !== undefined) { c.life -= dt; if (c.life <= 0) { Ls.splice(i, 1); continue; } }
      if (c.int <= 0.01) continue;
      const d = (c.x - fx) * (c.x - fx) + (c.z - fz) * (c.z - fz);
      if (d > 17 * 17) continue;
      c._d = d / (0.6 + c.int * 0.1);
      let k = best.length < ns ? best.length : ns - 1;   // insertion into a list capped at ns entries
      if (k === ns - 1 && best.length === ns && best[k]._d <= c._d) continue;
      if (best.length < ns) best.push(c);
      while (k > 0 && best[k - 1]._d > c._d) { best[k] = best[k - 1]; k--; }
      best[k] = c;
    }
    for (let i = 0; i < ns; i++) {
      const s = slots[i];
      if (!s.c) continue;
      let keepIt = false;
      for (let b = 0; b < best.length; b++) if (best[b] === s.c) { keepIt = true; break; }
      if (!keepIt) { s.k -= dt * 3; if (s.k <= 0) { s.k = 0; s.c = null; } }
    }
    for (let b = 0; b < best.length; b++) {
      const c = best[b];
      let s = null;
      for (let i = 0; i < ns; i++) if (slots[i].c === c) { s = slots[i]; break; }
      if (!s) { for (let i = 0; i < ns; i++) if (!slots[i].c) { s = slots[i]; break; } if (!s) continue; s.c = c; s.k = 0; }
      s.k = Math.min(1, s.k + dt * 3);
    }
    const t = TIME.t;
    for (let i = 0; i < ns; i++) {
      const s = slots[i], l = LIGHTS.torches[i];
      if (!s.c) { l.intensity = 0; continue; }
      const c = s.c, f = c.fl ? 1 - c.fl * (0.12 + 0.1 * Math.sin(t * 9.3 + c.ph) + 0.06 * Math.sin(t * 23.1 + c.ph * 2)) : 1;
      l.position.set(c.x, c.y, c.z); l.color.copy(c.col); l.distance = c.dist; l.decay = 1.6;
      l.intensity = c.int * s.k * f * (c.life !== undefined ? Math.min(1, c.life) : 1);
    }
  }

  function dispose(L) {
    if (!L) return;
    const B = L._b;
    if (L.group) {
      if (L.npcObj && L.npcObj.model && L.npcObj.model.root && !L.npcObj.model.placeholder) {   // EMODEL owns the owl's resources
        L.group.remove(L.npcObj.model.root);
        if (typeof L.npcObj.model.dispose === 'function') { try { L.npcObj.model.dispose(); } catch (e) { /* ignore */ } }
      }
      L.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
      disposeTree(L.group);
    }
    if (B) for (const d of B.dispose) { try { d.dispose(); } catch (e) { /* already gone */ } }
    for (const l of LIGHTS.torches) l.intensity = 0;
    L.group = null; L._b = null; L._flow = null; L._blk = null;
  }

  return {
    generate, build, update, dispose, isFloor, circleFree, move, los, flowTo, flowDir, randomFloorNear,
    satCount: (L, x0, z0, x1, z1) => satCount(L, x0, z0, x1, z1),
  };
})();
