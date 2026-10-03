/* ── Feza: kahraman modeli + canlı animasyon, ekipman modelleri (ışın kılıcı / şapka / pelerin), eşya tanımları, küçük resimler ──
   FEZA.create() → H · FEZA.portrait(H) → dataURL · ITEMS (bkz. src/SPEC.md "FEZA + ITEMS").
   Warriors carry lightsabers; wizards carry wooden wands: ITEMS.bladeColor(item), H.ignite(), H.bladeOn; the blade retracts while
   he sleeps and re-ignites when he wakes. Extra: H.retract(), ITEMS.nameOf(item) (current name, for old saves).
   Body = one skeleton + three SkinnedMeshes (skin, clothes, shoes) with rigid + blended weights, so knees, elbows, waist and
   neck bend smoothly; hair sits on the head bone. Eyes, lashes, brows, mouth and blush are drawn by the skin shader from a
   per-vertex (yaw, pitch) head coordinate: crisp at any zoom, animated by uniforms, no extra draw call.
   Extras beyond the SPEC: FEZA.warm() / ITEMS.prebake(n) (shader warm-up + thumbnail/portrait pre-rendering, also driven
   automatically from the first hero's update), FEZA.portrait(H, hatItem?), ITEMS.thumb(item, lazy?). */
'use strict';

const { FEZA, ITEMS } = (function () {
  // ── Helpers ──
  const sq = x => x * x;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIO = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const wrapPI = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const keep = o => { o.userData.keep = true; return o; };   // shared: disposeTree() leaves it alone
  const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const V2 = (x, y = x) => new THREE.Vector2(x, y);
  const canvasEl = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function tex(n) {
    if (typeof TEX === 'undefined') return null;
    if (!TEX.ready && !TEX[n] && TEX.init) { try { TEX.init(); } catch (e) { return null; } }
    return TEX[n] && TEX[n].map ? TEX[n] : null;
  }
  // Every Feza/equipment material writes stencil 1 where it is visible; the x-ray pass only draws where it is not.
  function stencil(m) {
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc;
    m.stencilZPass = THREE.ReplaceStencilOp; m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp;
    return m;
  }
  const RARITY = [{ ad: 'Sıradan', color: '#f4f4f4' }, { ad: 'Sihirli', color: '#5aa8ff' }, { ad: 'Nadir', color: '#ffd23f' }, { ad: 'Efsane', color: '#ff8a1c' }];
  const rarCol = r => (RARITY[r] || RARITY[0]).color;
  const baseId = it => (it && it.base && it.base.id) ? it.base.id : (it ? it.base : null);
  const itemKey = it => it.slot + ':' + baseId(it) + ':' + (it.rarity | 0);

  // ── Geometry builders ──
  // Grid surface fn(u, v, out) for u, v in [0,1]; normals by central differences, oriented away from `ctr`.
  function paramGeo(fn, nu, nv, ctr, wrapU) {
    const n1 = nu + 1, nV = n1 * (nv + 1);
    const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), uv = new Float32Array(nV * 2);
    const p = v3(), a = v3(), b = v3(), c = v3(), d = v3(), n = v3(), e = 1e-3;
    for (let j = 0, k = 0; j <= nv; j++) for (let i = 0; i <= nu; i++, k++) {
      const u = i / nu, v = j / nv;
      fn(u, v, p);
      fn(wrapU ? u + e : Math.min(1, u + e), v, a); fn(wrapU ? u - e : Math.max(0, u - e), v, b); a.sub(b);
      fn(u, Math.min(1, v + e), c); fn(u, Math.max(0, v - e), d); c.sub(d);
      n.crossVectors(a, c);
      if (n.lengthSq() < 1e-14) n.copy(p).sub(ctr);
      n.normalize();
      if (n.dot(d.copy(p).sub(ctr)) < 0) n.negate();
      pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
      nor[k * 3] = n.x; nor[k * 3 + 1] = n.y; nor[k * 3 + 2] = n.z;
      uv[k * 2] = u; uv[k * 2 + 1] = v;
    }
    const idx = [];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const q = j * n1 + i; idx.push(q, q + 1, q + n1 + 1, q, q + n1 + 1, q + n1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    fixWinding(g);
    return g;
  }
  // Make triangle winding agree with the vertex normals (front faces outward).
  function fixWinding(g) {
    const I = g.index.array, P = g.attributes.position, N = g.attributes.normal, a = v3(), b = v3(), c = v3(), n = v3();
    let s = 0;
    for (let t = 0; t < I.length; t += 3 * Math.max(1, (I.length / 3 / 60) | 0)) {
      a.fromBufferAttribute(P, I[t]); b.fromBufferAttribute(P, I[t + 1]).sub(a); c.fromBufferAttribute(P, I[t + 2]).sub(a);
      n.crossVectors(b, c); if (n.lengthSq() < 1e-16) continue;
      a.fromBufferAttribute(N, I[t]); s += n.dot(a) > 0 ? 1 : -1;
    }
    if (s < 0) for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
  }
  // Lathe (profile bottom → top as [r, y]) with the seam at the back, elliptic (sx, sz), UVs in texture tiles if `tile`.
  function lathe(prof, seg, cx, cz, sx, sz, tile) {
    const pts = prof.map(p => V2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, seg, Math.PI, TAU);
    g.applyMatrix4(new THREE.Matrix4().makeScale(sx, 1, sz));
    g.translate(cx, 0, cz);
    if (tile) {
      const uv = g.attributes.uv, n = pts.length, L = [0];
      let rMax = 0;
      for (let j = 0; j < n; j++) { rMax = Math.max(rMax, pts[j].x); if (j) L[j] = L[j - 1] + pts[j].distanceTo(pts[j - 1]); }
      const C = TAU * rMax * (sx + sz) / 2;
      for (let i = 0; i <= seg; i++) for (let j = 0; j < n; j++) uv.setXY(i * n + j, i / seg * C / tile, L[j] / tile);
    }
    return g;
  }
  // Sweep an elliptic cross-section along points P[i] with up vectors U[i]. wf/tf(t) half width/thickness,
  // flat squashes the underside, colf(t, color), flexf(t). Returns indexed geometry with color + aFlex.
  function sweep(P, U, wf, tf, M, flat, colf, flexf) {
    const N = P.length - 1, nv = (N + 1) * (M + 1);
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), fl = new Float32Array(nv);
    const T = v3(), Nn = v3(), B = v3(), q = v3(), c = new THREE.Color();
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      T.subVectors(P[Math.min(N, i + 1)], P[Math.max(0, i - 1)]).normalize();
      Nn.copy(U[i]).addScaledVector(T, -U[i].dot(T)).normalize();
      B.crossVectors(T, Nn).normalize();
      const w = wf(t), th = tf(t), f = flexf ? flexf(t) : 0;
      colf(t, c);
      for (let k = 0; k <= M; k++) {
        const a = k / M * TAU, ca = Math.cos(a), sa = Math.sin(a), o = i * (M + 1) + k;
        q.copy(P[i]).addScaledVector(B, ca * w).addScaledVector(Nn, sa < 0 ? sa * th * flat : sa * th);
        pos[o * 3] = q.x; pos[o * 3 + 1] = q.y; pos[o * 3 + 2] = q.z;
        uv[o * 2] = k / M; uv[o * 2 + 1] = t;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        fl[o] = f;
      }
    }
    const idx = [];
    for (let i = 0; i < N; i++) for (let k = 0; k < M; k++) { const a = i * (M + 1) + k, b = a + M + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    // outward check: the top of the ring (k = M/4) must face +up
    const k4 = Math.round(M / 4), mid = Math.floor(N / 2) * (M + 1), nA = g.attributes.normal;
    T.subVectors(P[Math.min(N, Math.floor(N / 2) + 1)], P[Math.max(0, Math.floor(N / 2) - 1)]).normalize();
    Nn.copy(U[Math.floor(N / 2)]).addScaledVector(T, -U[Math.floor(N / 2)].dot(T)).normalize();
    if (q.fromBufferAttribute(nA, mid + k4).dot(Nn) < 0) {
      const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
      g.computeVertexNormals();
    }
    return g;
  }
  // Catmull-Rom through 3D points, returns N+1 samples.
  const curvePts = (pts, N) => new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(N);
  // Concatenate geometries that share the same attribute set.
  function concat(geos) {
    const names = Object.keys(geos[0].attributes);
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const out = new THREE.BufferGeometry(), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    for (const n of names) {
      const s = geos[0].attributes[n].itemSize, arr = new Float32Array(nv * s);
      let vo = 0;
      for (const g of geos) { const a = g.attributes[n]; for (let i = 0; i < a.count * s; i++) arr[vo * s + i] = a.array[i]; vo += g.attributes.position.count; }
      out.setAttribute(n, new THREE.BufferAttribute(arr, s));
    }
    let vo = 0, io = 0;
    for (const g of geos) {
      const c = g.attributes.position.count;
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; }
      else { for (let i = 0; i < c; i++) idx[io + i] = vo + i; io += c; }
      vo += c;
    }
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  // Kit-like merge with skin weights. part: {geo, bone} or {geo, w(x,y,z) → [bone0, bone1, weight1]}, color hex|fn, face?
  function mergeSkinned(parts, withFace) {
    let nv = 0, ni = 0;
    for (const p of parts) { nv += p.geo.attributes.position.count; ni += p.geo.index ? p.geo.index.count : p.geo.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), face = withFace ? new Float32Array(nv * 2).fill(-10) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    const cc = new THREE.Color();
    for (const p of parts) {
      const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, F = g.attributes.aFace, C = g.attributes.color;
      const cfn = typeof p.color === 'function' ? p.color : null, cfix = cfn ? null : new THREE.Color(p.color ?? 0xffffff);
      for (let i = 0; i < P.count; i++) {
        const o = vo + i, x = P.getX(i), y = P.getY(i), z = P.getZ(i);
        pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
        nor[o * 3] = N.getX(i); nor[o * 3 + 1] = N.getY(i); nor[o * 3 + 2] = N.getZ(i);
        if (U) { uv[o * 2] = U.getX(i); uv[o * 2 + 1] = U.getY(i); }
        const c = cfn ? cfn(x, y, z) : C ? cc.setRGB(C.getX(i), C.getY(i), C.getZ(i)).multiply(cfix) : cfix;
        col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b;
        if (p.w) { const w = p.w(x, y, z); si[o * 4] = w[0]; si[o * 4 + 1] = w[1]; sw[o * 4] = 1 - w[2]; sw[o * 4 + 1] = w[2]; }
        else { si[o * 4] = p.bone; sw[o * 4] = 1; }
        if (face && F) { face[o * 2] = F.getX(i); face[o * 2 + 1] = F.getY(i); }
      }
      if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo; io += I.length; }
      else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    if (face) out.setAttribute('aFace', new THREE.BufferAttribute(face, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return keep(out);
  }
  const kitGeo = f => { const k = new Kit(); f(k); return k.build(); };

  // ── Head shape (head-bone space; bone sits at the neck base, world y = HB in bind pose) ──
  const HB = 0.84, HC = v3(0, 0.24, 0.012);
  function headSurf(th, ph, o) {
    const cp = Math.cos(ph), dx = Math.sin(th) * cp, dy = Math.sin(ph), dz = Math.cos(th) * cp;
    let x = dx * 0.272, y = dy * lerp(0.198, 0.262, sstep(-0.35, 0.35, dy)), z = dz * lerp(0.27, 0.258, sstep(-0.35, 0.35, dz));
    const jaw = sstep(0.3, 1.25, -ph);                                                     // narrower jaw, short soft chin
    x *= 1 - 0.22 * jaw; z *= 1 - 0.16 * jaw;
    const at = Math.abs(th), front = sstep(-0.1, 0.4, dz);
    let b = 0.022 * Math.exp(-sq((at - 0.5) / 0.33) - sq((ph + 0.35) / 0.27)) * front;      // round cheeks
    b += 0.013 * Math.exp(-sq(th / 0.08) - sq((ph + 0.262) / 0.065));                      // button nose
    b += 0.006 * Math.exp(-sq(th / 0.3) - sq((ph + 0.92) / 0.2));                          // chin
    o.set(HC.x + x + dx * b, HC.y + y + dy * b, HC.z + z + dz * b);
    return o;
  }
  const _ha = v3(), _hb = v3(), _hc = v3(), _hd = v3();
  function headNormal(th, ph, o) {
    const e = 1e-3;
    headSurf(th + e, ph, _ha); headSurf(th - e, ph, _hb); _ha.sub(_hb);
    headSurf(th, Math.min(ph + e, 1.5707), _hc); headSurf(th, Math.max(ph - e, -1.5707), _hd); _hc.sub(_hd);
    o.crossVectors(_ha, _hc);
    if (o.lengthSq() < 1e-12) { headSurf(th, ph, o); o.sub(HC); }
    return o.normalize();
  }
  // Non-uniform head grid: dense over the face, sparse at the back and top (under the hair) → a third of the triangles.
  const headTh = u => { const s = 2 * u - 1; return Math.PI * s * (0.38 + 0.62 * s * s); };
  const PH_CDF = (() => {
    const N = 256, d = ph => 1 + 1.4 * Math.exp(-sq((ph + 0.3) / 0.6)), c = [0];
    for (let i = 1; i <= N; i++) c.push(c[i - 1] + d(-Math.PI / 2 + (i - 0.5) / N * Math.PI));
    return c.map(x => x / c[N]);
  })();
  function headPh(v) {
    v = clamp(v, 0, 1);
    let lo = 0, hi = PH_CDF.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PH_CDF[m] <= v) lo = m; else hi = m; }
    const f = (v - PH_CDF[lo]) / Math.max(1e-9, PH_CDF[hi] - PH_CDF[lo]);
    return -Math.PI / 2 + (lo + f) / (PH_CDF.length - 1) * Math.PI;
  }
  function headGeo() {
    const NU = 64, NV = 40, ctr = v3(0, HB + HC.y, HC.z);
    const g = paramGeo((u, v, o) => { headSurf(headTh(u), headPh(v), o); o.y += HB; }, NU, NV, ctr, true);
    const f = new Float32Array((NU + 1) * (NV + 1) * 2);
    for (let j = 0, k = 0; j <= NV; j++) for (let i = 0; i <= NU; i++, k++) { f[k * 2] = headTh(i / NU); f[k * 2 + 1] = headPh(j / NV); }
    g.setAttribute('aFace', new THREE.BufferAttribute(f, 2));
    return g;
  }
  // Ears (half covered by the side hair, like in the photo): a thin plate with a rolled rim, tilted back a little.
  const EAR = { th: 1.6, ph: -0.19 };
  function earGeo(s) {
    const th = s * EAR.th, p = headSurf(th, EAR.ph, v3()), n = headNormal(th, EAR.ph, v3());
    const X = n.clone(), Y = v3(0, 1, 0).addScaledVector(X, -X.y).normalize().applyAxisAngle(X, -0.22 * s), Z = v3().crossVectors(X, Y);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    const c = p.clone().addScaledVector(n, 0.004); c.y += HB;
    const o = c.clone().addScaledVector(X, 0.008), inner = new THREE.Color(0xe9a390), outer = new THREE.Color(0xf6cdb8), tmp = new THREE.Color(), w = v3();
    const col = (x, y, z) => { w.set(x, y, z).sub(o); return tmp.copy(inner).lerp(outer, sstep(0.008, 0.022, Math.hypot(w.dot(Y), w.dot(Z) * 1.3))); };
    return kitGeo(k => {
      k.add(G.sphere(12, 8), col, [c.x, c.y, c.z], q, [0.009, 0.034, 0.024]);
      k.push([o.x, o.y, o.z], q).add(G.torus(TAU, 0.34, 18), 0xf6cdb8, [0, 0.002, 0], [0, Math.PI / 2, 0], [0.018, 0.026, 0.02]).pop();
    });
  }

  // ── Hair: a shell over the scalp plus ~75 short, tousled locks (a boy's shaggy cut: nape at the top of the neck,
  // ears half covered, fringe swept diagonally so one corner of the forehead shows) and a few cowlicks ──
  const HAIR_D = new THREE.Color(0x111319), HAIR_L = new THREE.Color(0x24252b), HAIR_H = new THREE.Color(0x454149);
  function hairline(th) {
    const a = Math.abs(th), saw = th * 2.3 + 0.35 - Math.floor(th * 2.3 + 0.35);
    const front = 0.46 + 0.06 * th + 0.06 * Math.pow(saw, 1.7);                              // the locks make the fringe edge
    let h = lerp(front, -0.3, sstep(0.6, 1.25, a));                                          // temples → sideburns
    h = lerp(h, -0.28, sstep(1.75, 2.2, a));                                                 // behind the ears
    h = lerp(h, -0.34, sstep(2.4, 2.9, a));                                                  // nape (the idle head tilt lowers it)
    h = lerp(h, -0.04, sstep(1.28, 1.46, a) * (1 - sstep(1.76, 1.96, a)));                   // around the ear
    return h + 0.03 * Math.sin(th * 11 + 0.7) * sstep(0.5, 1.2, a);
  }
  function hairThick(th, ph) {
    const a = Math.abs(th);
    return 0.016 + 0.034 * sstep(-0.1, 1.1, ph) + 0.006 * sstep(1.9, 2.8, a) * sstep(-0.6, 0.3, ph);
  }
  const capLift = (th, ph) => { const hl = hairline(th); return hairThick(th, ph) * sstep(hl - 0.1, hl + 0.06, ph); };
  const dirOf = (th, ph) => v3(Math.sin(th) * Math.cos(ph), Math.sin(ph), Math.cos(th) * Math.cos(ph));
  function hairCapGeo() {
    const NU = 128, NV = 16, n = v3(), ctr = HC.clone();
    const g = paramGeo((u, v, o) => {
      const th = -Math.PI + u * TAU, hl = hairline(th), s = Math.pow(v, 0.85), ph = lerp(hl, Math.PI / 2 - 1e-3, s);
      headSurf(th, ph, o); headNormal(th, ph, n);
      o.addScaledVector(n, hairThick(th, ph) * (0.18 + 0.82 * sstep(0, 0.16, v)));
    }, NU, NV, ctr, true);
    const cnt = g.attributes.position.count, col = new Float32Array(cnt * 3), fl = new Float32Array(cnt), uv = g.attributes.uv, c = new THREE.Color();
    for (let i = 0; i < cnt; i++) {
      const u = uv.getX(i), v = uv.getY(i), th = -Math.PI + u * TAU;
      const streak = 0.5 + 0.5 * Math.sin(th * 23 + Math.sin(th * 7) * 2) * Math.sin(th * 9 + 1);
      c.copy(HAIR_D).lerp(HAIR_L, 0.3 + 0.25 * streak * sstep(0.1, 0.8, v)).multiplyScalar(0.8 + 0.2 * sstep(0, 0.3, v));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      uv.setXY(i, u * 10, v * 2.2);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aFlex', new THREE.BufferAttribute(fl, 1));
    return g;
  }
  function hairLocks() {
    const R = mulberry32(20190612), r = (a, b) => a + R() * (b - a), L = [];
    const add = (pts, w, t, tone, flex, tuft) => L.push({ pts, w, t, tone, flex, tuft: !!tuft });
    const P = (th, ph, lift) => [dirOf(th, ph), lift];
    const lock4 = (th0, ph0, th1, ph1, lifts, w, t, tone, flex, bulge = 0) => add([P(th0, ph0, lifts[0]), P(lerp(th0, th1, 0.4) + bulge, lerp(ph0, ph1, 0.42), lifts[1]),
      P(lerp(th0, th1, 0.78), lerp(ph0, ph1, 0.8), lifts[2]), P(th1, ph1, lifts[3])], w, t, tone, flex);
    // fringe: swept diagonally to Feza's right (th < 0) — short on his left so that corner of the forehead shows,
    // down to the right brow; some tips flick up
    for (let i = 0; i < 12; i++) {
      const f = i / 11, th0 = 0.8 - i * 0.125 + r(-0.03, 0.03), ph0 = 0.8 + r(-0.04, 0.05);
      const th1 = th0 - 0.3 - r(0, 0.14), ph1 = lerp(0.37, 0.15, f) + r(-0.03, 0.03) - Math.max(0, -th1 - 0.5) * 0.2;
      lock4(th0, ph0, th1, ph1, [0, 0.017, 0.013, 0.011 + 0.012 * R()], r(0.05, 0.064), r(0.018, 0.022), r(0.05, 0.75), 0.8, 0.02);
    }
    for (let i = 0; i < 5; i++) {   // shorter top layer so the fringe root is not a flat line
      const th0 = 0.62 - i * 0.3 + r(-0.05, 0.05), ph0 = 1.0 + r(0, 0.08);
      lock4(th0, ph0, th0 - 0.3 - r(0, 0.1), 0.5 + r(0, 0.08), [0, 0.018, 0.017, 0.014], r(0.055, 0.07), 0.02, r(0.4, 1), 0.7, 0.03);
    }
    lock4(0.1, 0.74, 0.36, 0.44, [0, 0.015, 0.017, 0.022], 0.044, 0.017, 0.85, 0.8);          // one rebel the other way
    // sides: shaggy, ear-lobe length in front of and behind the ear, short over it; tips flick outward
    for (const s of [1, -1]) {
      for (let i = 0; i < 3; i++) {   // temples / sideburns
        const th0 = s * (0.8 + i * 0.16 + r(-0.03, 0.03)), ph0 = 0.5 + r(-0.03, 0.06);
        lock4(th0, ph0, th0 + s * (0.14 + r(0, 0.08)), -0.13 - r(0, 0.06), [0, 0.019, 0.026, 0.048], r(0.056, 0.068), 0.022, r(0.1, 0.9), 1, s * 0.04);
      }
      for (let i = 0; i < 3; i++) {   // over the ear: covers its top half
        const th0 = s * (1.36 + i * 0.17 + r(-0.03, 0.03)), ph0 = 0.56 + r(-0.03, 0.06);
        lock4(th0, ph0, th0 + s * r(0.04, 0.14), -0.03 - r(0, 0.05), [0, 0.022, 0.032, 0.052], r(0.06, 0.072), 0.023, r(0, 1), 1);
      }
      for (let i = 0; i < 3; i++) {   // behind the ear
        const th0 = s * (1.95 + i * 0.2 + r(-0.04, 0.04)), ph0 = 0.62 + r(-0.03, 0.08);
        lock4(th0, ph0, th0 + s * r(0.04, 0.16), -0.16 - r(0, 0.08), [0, 0.022, 0.03, 0.05], r(0.064, 0.076), 0.024, r(0, 1), 1);
      }
      for (let i = 0; i < 4; i++) {   // short upper-side layer (volume seen from above)
        const th0 = s * (0.8 + i * 0.42 + r(-0.05, 0.05)), ph0 = 1.02 + r(0, 0.1);
        lock4(th0, ph0, th0 + s * r(0.04, 0.16), 0.26 + r(-0.08, 0.08), [0, 0.021, 0.026, 0.028], r(0.068, 0.082), 0.024, r(0.3, 1), 0.8);
      }
    }
    // nape: uneven tips at the top of the neck, flicking out
    for (let i = 0; i < 9; i++) {
      const th0 = Math.PI + (i - 4) * 0.22 + r(-0.04, 0.04), ph0 = 0.72 + r(0, 0.1), th1 = th0 + r(-0.16, 0.16), ph1 = -0.06 - r(0, 0.18) + (i & 1) * 0.06;
      lock4(th0, ph0, th1, ph1, [0, 0.022, 0.032, 0.045 + r(0, 0.035)], r(0.068, 0.082), 0.025, r(0, 0.9), 1);
    }
    // shorter layer over the back of the head, so the back reads layered and tousled, not as one straight curtain
    for (let i = 0; i < 7; i++) {
      const th0 = Math.PI + (i - 3) * 0.3 + r(-0.06, 0.06), ph0 = 0.95 + r(0, 0.1);
      lock4(th0, ph0, th0 + r(-0.2, 0.2), 0.3 + r(-0.08, 0.1), [0, 0.024, 0.028, 0.034 + r(0, 0.012)], r(0.07, 0.085), 0.024, r(0.3, 1), 0.8);
    }
    // crown: short tousled clumps swirling out of a whorl a little behind the top (very visible from the game camera)
    const Cw = dirOf(Math.PI * 0.92, 1.18), e1 = v3().crossVectors(Cw, v3(1, 0, 0)).normalize(), e2 = v3().crossVectors(Cw, e1);
    const at = (a, d) => Cw.clone().multiplyScalar(Math.cos(d)).addScaledVector(e1, Math.cos(a) * Math.sin(d)).addScaledVector(e2, Math.sin(a) * Math.sin(d)).normalize();
    const clump = (a, tw, d0, d1, l0, l1, l2, l3, w, t, tone, flex) => add([[at(a, d0), l0], [at(a + tw * 0.4, lerp(d0, d1, 0.4)), l1], [at(a + tw * 0.8, lerp(d0, d1, 0.78)), l2], [at(a + tw, d1), l3]], w, t, tone, flex);
    for (let i = 0; i < 8; i++) clump(i / 8 * TAU + r(-0.2, 0.2), 0.35 + r(-0.1, 0.15), 0.03, r(0.3, 0.4), 0.004, 0.02, 0.022, 0.02 + r(0, 0.012), r(0.068, 0.082), r(0.018, 0.022), r(0.3, 1), 0.5);
    for (let i = 0; i < 12; i++) { const d0 = r(0.26, 0.34); clump(i / 12 * TAU + r(-0.15, 0.15), r(-0.45, 0.45), d0, d0 + r(0.32, 0.44), 0.006, 0.022, 0.02, 0.017 + r(0, 0.016), r(0.07, 0.086), r(0.018, 0.023), r(0.2, 1), 0.6); }
    // cowlicks (collapsed under hats)
    const cw = [[0.5, 0.11, 0.06], [-0.3, 0.13, 0.08], [0.15, 0.08, 0.05], [1.4, 0.07, 0.035]];
    for (const [a, h, len] of cw) {
      const b = dirOf(Math.PI * 0.9 + a * 0.25, 1.22), m = dirOf(Math.PI * 0.9 + a * 0.4, 1.05 + len), e = dirOf(Math.PI * 0.95 + a * 0.6, 0.9 + len);
      add([[b, 0.01], [m, h * 0.6], [e, h]], 0.028, 0.012, 0.7, 1.4, true);
    }
    return L;
  }
  function lockGeo(L) {
    const N = 8, dirs = curvePts(L.pts.map(p => p[0]), N), n1 = L.pts.length - 1;
    const liftAt = t => { const f = t * n1, i = Math.min(n1 - 1, Math.floor(f)), u = f - i, a = L.pts[i][1], b = L.pts[i + 1][1]; return a + (b - a) * u * u * (3 - 2 * u); };
    const P = [], U = [], n = v3();
    for (let i = 0; i <= N; i++) {
      const d = dirs[i].normalize(), th = Math.atan2(d.x, d.z), ph = Math.asin(clamp(d.y, -1, 1));
      const p = headSurf(th, ph, v3()); headNormal(th, ph, n);
      p.addScaledVector(n, capLift(th, ph) + liftAt(i / N) + L.t * 0.35);
      P.push(p); U.push(n.clone());
    }
    const base = HAIR_D.clone().lerp(HAIR_L, L.tone);
    // aFlex < 0 marks cowlick vertices (the hair shader collapses them under a hat)
    return sweep(P, U, t => L.w * (0.7 + 0.3 * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2)) * Math.pow(1 - t, 0.9),
      t => L.t * (1 - 0.75 * t), 6, 0.5,
      (t, c) => { c.copy(base).multiplyScalar(0.86 + 0.26 * t); if (L.tone > 0.75 && t > 0.3) c.lerp(HAIR_H, 0.3); },
      t => L.tuft ? -(Math.pow(t, 1.5) * L.flex + 0.01) : Math.pow(t, 1.5) * L.flex);
  }
  // Low-poly outer hull of head + hair (for the x-ray silhouette proxy), head-bone space shifted to bind pose (y + HB).
  function headHullGeo() {
    const n = v3();
    return paramGeo((u, v, o) => {
      const th = -Math.PI + u * TAU, ph = -Math.PI / 2 + v * Math.PI, hl = hairline(th);
      headSurf(th, ph, o); headNormal(th, ph, n);
      o.addScaledVector(n, capLift(th, ph) + 0.028 * sstep(hl - 0.05, hl + 0.12, ph)); o.y += HB;
    }, 20, 14, v3(0, HB + HC.y, HC.z), true);
  }

  // ── Strand normal map for the hair (generated once, 128²) ──
  let STRAND = null;
  function strandTex() {
    if (STRAND) return STRAND;
    const S = 128, D = new Uint8Array(S * S * 4), H = new Float32Array(S * S), R = mulberry32(77);
    const ph = [], fr = [2, 5, 9, 14, 23, 31, 47], am = [0.3, 0.25, 0.22, 0.18, 0.12, 0.1, 0.06];
    for (let i = 0; i < fr.length; i++) ph.push(R() * TAU);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let h = 0; const u = x / S, v = y / S;
      for (let i = 0; i < fr.length; i++) h += am[i] * Math.sin(TAU * fr[i] * u + ph[i] + 0.6 * Math.sin(TAU * v + i));
      H[y * S + x] = h;
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = H[y * S + (x + 1) % S] - H[y * S + (x + S - 1) % S], dy = H[((y + 1) % S) * S + x] - H[((y + S - 1) % S) * S + x];
      const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), o = (y * S + x) * 4;
      D[o] = (nx / l * 0.5 + 0.5) * 255; D[o + 1] = (ny / l * 0.5 + 0.5) * 255; D[o + 2] = (1 / l * 0.5 + 0.5) * 255; D[o + 3] = 255;
    }
    const t = new THREE.DataTexture(D, S, S, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = ANISO; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    return (STRAND = keep(t));
  }

  // ── Body geometry (built once, shared by every Feza) ──
  // Bones: 0 root, 1 hips, 2 chest, 3 head, 4 armL, 5 foreL, 6 armR, 7 foreR, 8 thighL, 9 shinL, 10 thighR, 11 shinR.
  // Feza faces +z, so his right side is −x (sword arm = armR).
  const SKIN = 0xbab6b0, TILE = 0.4;
  const BONES = [['root', -1, 0, 0, 0], ['hips', 0, 0, 0.47, 0], ['chest', 1, 0, 0.13, 0], ['head', 2, 0, 0.24, 0],
    ['armL', 2, 0.175, 0.16, -0.005], ['foreL', 4, 0, -0.155, 0], ['armR', 2, -0.175, 0.16, -0.005], ['foreR', 6, 0, -0.155, 0],
    ['thighL', 1, 0.088, -0.03, 0], ['shinL', 8, 0, -0.195, 0], ['thighR', 1, -0.088, -0.03, 0], ['shinR', 10, 0, -0.195, 0]];
  // Lathe profiles [r, y] (bind pose, metres). SHIRT_P / SHORTS_P are also used to keep the cape off the back.
  const NECK_P = [[0, 0.76], [0.06, 0.765], [0.058, 0.84], [0.06, 0.92], [0, 0.95]];
  const ARM_P = [[0, 0.455], [0.03, 0.458], [0.041, 0.47], [0.043, 0.5], [0.046, 0.56], [0.047, 0.605], [0.05, 0.65], [0.053, 0.7], [0.054, 0.74], [0.05, 0.775], [0.035, 0.79], [0, 0.795]];
  const LEG_P = [[0, 0.06], [0.03, 0.063], [0.043, 0.08], [0.046, 0.11], [0.057, 0.17], [0.059, 0.2], [0.056, 0.245], [0.06, 0.29], [0.068, 0.35], [0.072, 0.4], [0.07, 0.45], [0.05, 0.48], [0, 0.49]];
  const SLEEVE_P = [[0.055, 0.628], [0.066, 0.632], [0.069, 0.66], [0.068, 0.71], [0.062, 0.755], [0.048, 0.785], [0.026, 0.8], [0, 0.803]];
  const PANTLEG_P = [[0.078, 0.325], [0.09, 0.33], [0.095, 0.35], [0.095, 0.39], [0.091, 0.43], [0.07, 0.45], [0, 0.46]];
  const SHIRT_P = [[0, 0.44], [0.13, 0.438], [0.172, 0.445], [0.18, 0.46], [0.185, 0.5], [0.184, 0.55], [0.178, 0.61], [0.17, 0.67], [0.163, 0.72],
    [0.152, 0.76], [0.13, 0.79], [0.1, 0.81], [0.07, 0.822], [0.056, 0.826], [0, 0.827]];
  const SHORTS_P = [[0, 0.375], [0.1, 0.378], [0.155, 0.398], [0.178, 0.43], [0.187, 0.47], [0.186, 0.5], [0.18, 0.52], [0, 0.525]];
  let BODY = null;
  function buildBody() {
    if (BODY) return BODY;
    const t0 = performance.now();
    const skin = [], cloth = [], shoe = [];
    const pink = (x, y, z) => new THREE.Color(1, 0.95 - 0.06 * Math.exp(-sq((y - 0.245) / 0.03)) * (z > 0 ? 1 : 0.3), 0.94 - 0.08 * Math.exp(-sq((y - 0.245) / 0.03)) * (z > 0 ? 1 : 0.3));
    skin.push({ geo: headGeo(), bone: 3 });
    for (const s of [1, -1]) skin.push({ geo: earGeo(s), bone: 3 });
    skin.push({ geo: lathe(NECK_P, 16, 0, 0.004, 1, 0.92), w: (x, y) => [2, 3, sstep(0.8, 0.87, y)] });
    for (const s of [1, -1]) {
      const up = s > 0 ? 4 : 6, fo = up + 1, th = s > 0 ? 8 : 10, sh = th + 1, ax = 0.175 * s;
      skin.push({ geo: lathe(ARM_P, 14, ax, -0.005, 1, 0.95), w: (x, y) => [up, fo, sstep(0.64, 0.57, y)] });
      skin.push({ geo: kitGeo(k => {
        k.add(G.sphere(14), 0xffffff, [ax, 0.42, 0.002], 0, [0.046, 0.052, 0.048]);
        k.add(G.sphere(10), 0xffffff, [ax - 0.034 * s, 0.432, 0.026], [0, 0, 0.5 * s], [0.017, 0.026, 0.018]);
      }), bone: fo, color: 0xfff0ea });
      skin.push({ geo: lathe(LEG_P, 14, 0.088 * s, 0, 1, 1), w: (x, y) => [th, sh, sstep(0.28, 0.21, y)], color: pink });
      cloth.push({geo:lathe(LEG_P,14,.088*s,0,1.08,1.08),w:(x,y)=>[th,sh,sstep(.28,.21,y)],color:0x343633});
      cloth.push({geo:lathe(ARM_P,14,ax,-.005,1.075,1.07),w:(x,y)=>[up,fo,sstep(.64,.57,y)],color:0x373936});
      cloth.push({ geo: lathe(SLEEVE_P, 18, ax * 0.97, -0.005, 1, 0.95, TILE), w: (x, y) => [2, up, sstep(0.8, 0.72, y)], color: 0x4b515b });
      cloth.push({ geo: kitGeo(k => k.add(G.torus(TAU, 0.14, 20), 0xffffff, [ax, 0.633, -0.005], [Math.PI / 2, 0, 0], [0.064, 0.061, 0.064])), bone: up, color: 0x7e8790 });
      cloth.push({ geo: lathe(PANTLEG_P, 18, 0.09 * s, 0, 1, 0.95, TILE), w: (x, y) => [1, th, sstep(0.43, 0.37, y)], color: 0x252c38 });
      shoe.push({ geo: shoeGeo(s), bone: sh });
    }
    cloth.push({ geo: lathe(SHIRT_P, 32, 0, 0, 1, 0.8, TILE), w: (x, y) => [1, 2, sstep(0.5, 0.6, y)], color: 0x4b515b });
    cloth.push({ geo: kitGeo(k => k.add(G.torus(TAU, 0.2, 24), 0xffffff, [0, 0.821, 0.002], [Math.PI / 2, 0, 0], [0.064, 0.052, 0.064])), bone: 2, color: 0x737a83 });
    cloth.push({ geo: kitGeo(k => k.add(G.torus(TAU, 0.05, 32), 0xffffff, [0, 0.443, 0], [Math.PI / 2, 0, 0], [0.178, 0.143, 0.178])), bone: 1, color: 0x765b48 });
    cloth.push({ geo: lathe(SHORTS_P, 28, 0, 0, 1, 0.82, TILE), bone: 1, color: 0x252c38 });
    // Armour plates share the original cloth draw and original bones.
    for (const side of [-1, 1]) {
      cloth.push({geo: kitGeo(k => { k.add(G.sphere(16), 0x89929c, [side*.19,.766,-.002],0,[.092,.055,.093]); k.add(G.cone(8),0x6c747e,[side*.225,.83,-.005],[0,0,-side*.35],[.025,.105,.025]); }),bone: side>0?4:6});
      cloth.push({geo: kitGeo(k => {k.add(G.rbox(2),0x686867,[side*.088,.20,.015],0,[.103,.24,.106]);k.add(G.rbox(2),0xaba590,[side*.088,.215,.071],0,[.023,.20,.009]);}),bone:side>0?9:11});
      cloth.push({geo: kitGeo(k => k.add(G.rbox(2),0x626b77,[side*.175,.54,.026],0,[.058,.115,.042])),bone:side>0?5:7});
      cloth.push({geo:kitGeo(k=>k.add(G.sphere(14),0x5c5c59,[side*.175,.42,.002],0,[.048,.055,.05])),bone:side>0?5:7});
    }
    cloth.push({geo:kitGeo(k=>{ k.add(G.rbox(2),0x687381,[0,.65,.138],0,[.23,.25,.045]); k.add(G.rbox(2),0x922e35,[0,.65,.165],0,[.035,.19,.015]); k.add(G.rbox(2),0x922e35,[0,.69,.167],0,[.115,.025,.015]); }),bone:2});
    // A permanent hunter identity survives every equipment change and also appears in portraits.
    cloth.push({geo:kitGeo(k=>{
      k.add(geoC('hunterBlindfold',()=>new THREE.CylinderGeometry(.290,.283,.096,40,1,true,-1.15,2.3)),0x101319,[0,1.062,.012]);
      for(let j=0;j<8;j++){const a=-.5+j*.125,b=a+.125;k.seg([Math.sin(a)*.294,1.062,.012+Math.cos(a)*.294],[Math.sin(b)*.294,1.062,.012+Math.cos(b)*.294],.004,0xa33c38,.004,6);}
      for(const side of [-1,1]){
        k.add(G.sphere(14),0x24242a,[side*.242,1.183,-.004],0,[.065,.09,.067]);
        k.seg([side*.24,1.20,-.012],[side*.32,1.34,-.040],.044,0x3d3c3d,.028,10);
        k.seg([side*.32,1.34,-.04],[side*.27,1.45,-.090],.028,0x77736c,.009,10);
        k.add(G.cone(10),0xa39b87,[side*.265,1.476,-.101],[.30,0,side*.20],[.013,.072,.013]);
        k.seg([side*.18,1.03,.214],[side*.14,.96,.22],.008,0x9c353b,.006,6);
      }
    }),bone:3});
    cloth.push({geo:kitGeo(k=>{
      // The second crescent is a visual wrist blade; damage stays with the existing combat contract.
      const P=[[.175,.425,.08],[.28,.46,.09],[.335,.54,.09],[.31,.63,.075]];
      for(let j=0;j<3;j++)k.seg(P[j],P[j+1],.036-j*.008,0x93968d,.025-j*.008,8);
      k.add(G.cone(8),0xb5b09d,[.292,.665,.068],[0,0,.38],[.017,.105,.014]);
      k.add(G.rbox(2),0x292b30,[.175,.43,.073],0,[.065,.06,.028]);
    }),bone:5});
    cloth.push({geo:kitGeo(k=>{for(const side of [-1,1]){
      k.seg([side*.04,.735,.170],[side*.09,.675,.173],.008,0xc44b42,.008,6);
      k.seg([side*.09,.675,.173],[side*.025,.59,.171],.008,0xc44b42,.006,6);
      k.add(G.cone(8),0x6e6b65,[side*.212,.80,.02],[0,0,-side*.45],[.022,.14,.021]);
    }}),bone:2});
    // hair: shell + locks + cowlicks in ONE mesh (cowlicks are collapsed in the shader under a hat)
    const hair = [hairCapGeo()];
    for (const L of hairLocks()) hair.push(lockGeo(L));
    BODY = { skin: mergeSkinned(skin, true), cloth: mergeSkinned(cloth), shoe: mergeSkinned(shoe), hair: keep(concat(hair)), xray: xrayBodyGeo() };
    BODY.ms = Math.round(performance.now() - t0);
    return BODY;
  }
  // Low-poly skinned stand-in (~2k triangles) that draws the x-ray silhouette for the whole body + hair in one call.
  function xrayBodyGeo() {
    const P = [];
    P.push({ geo: headHullGeo(), bone: 3 });
    P.push({ geo: lathe(NECK_P, 8, 0, 0.004, 1, 0.92), w: (x, y) => [2, 3, sstep(0.8, 0.87, y)] });
    for (const s of [1, -1]) {
      const up = s > 0 ? 4 : 6, fo = up + 1, th = s > 0 ? 8 : 10, sh = th + 1, ax = 0.175 * s;
      P.push({ geo: lathe(ARM_P, 8, ax, -0.005, 1, 0.95), w: (x, y) => [up, fo, sstep(0.64, 0.57, y)] });
      P.push({ geo: kitGeo(k => k.add(G.sphere(8), 0xffffff, [ax, 0.42, 0.002], 0, [0.05, 0.056, 0.052])), bone: fo });
      P.push({ geo: lathe(LEG_P, 8, 0.088 * s, 0, 1, 1), w: (x, y) => [th, sh, sstep(0.28, 0.21, y)] });
      P.push({ geo: lathe(SLEEVE_P, 10, ax * 0.97, -0.005, 1, 0.95), w: (x, y) => [2, up, sstep(0.8, 0.72, y)] });
      P.push({ geo: lathe(PANTLEG_P, 10, 0.09 * s, 0, 1, 0.95), w: (x, y) => [1, th, sstep(0.43, 0.37, y)] });
    }
    P.push({ geo: lathe(SHIRT_P, 16, 0, 0, 1, 0.8), w: (x, y) => [1, 2, sstep(0.5, 0.6, y)] });
    P.push({ geo: lathe(SHORTS_P, 14, 0, 0, 1, 0.82), bone: 1 });
    return mergeSkinned(P);
  }
  function shoeGeo(s) {
    const x0 = 0.088 * s, W = 0x484a4d, B = 0x262930, NV = 0x15191e, RD = 0x79674f;
    return kitGeo(k => {
      k.add(G.rbox(2), W, [x0, 0.018, 0.028], 0, [0.1, 0.036, 0.21]);
      k.add(G.rbox(2), B, [x0, 0.053, 0.027], 0, [0.099, 0.064, 0.188]);
      k.add(G.rbox(2), W, [x0, 0.060, 0.093], [-0.18,0,0], [0.096, 0.061, 0.086]);
      k.add(G.cyl(1, 1, 10), B, [x0, 0.113, -0.025], 0, [0.046, 0.106, 0.042]);
      k.add(G.rbox(1), RD, [x0, 0.08, -0.071], [0.25, 0, 0], [0.026, 0.045, 0.014]);
      k.add(G.torus(TAU, 0.26, 12), NV, [x0, 0.094, -0.006], [Math.PI / 2, 0, 0], 0.045);
      k.add(G.rbox(2), W, [x0, 0.127, 0.015], [-0.09,0,0], [0.079, 0.093, 0.028]);
      for (let i = 0; i < 2; i++) k.add(G.rbox(1), RD, [x0, 0.126 - i * 0.036, 0.033 + i * 0.018], [-0.18, 0, 0], [0.074, 0.009, 0.008]);
      k.add(G.rbox(1), W, [x0 + 0.048 * s, 0.05, 0.018], [0.25, 0, 0], [0.006, 0.016, 0.075]);
    });
  }

  // ── The face, drawn inside the skin shader ──
  const FACE_GLSL = `
    uniform vec4 fzEye; uniform vec3 fzEyeW; uniform vec4 fzMouth; uniform vec3 fzBrow;
    varying vec2 vFace;
    #define SRGB(r, g, b) pow(vec3(r, g, b), vec3(2.2))
    float fzSq(float x) { return x * x; }
    float fzSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
    float fzLine(float d, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, d); }
    void fzFace(inout vec3 col, inout float gloss, inout vec3 emis, vec2 q, float aa) {
      // cheeks + nose tip
      float bl = 0.0;
      col = mix(col, SRGB(0.99, 0.55, 0.53), bl);
      col = mix(col, SRGB(0.97, 0.66, 0.6), 0.22 * exp(-fzSq(q.x / 0.04) - fzSq((q.y + 0.252) / 0.035)));
      // eyes (e: eye-local, +x = outer corner)
      float side = q.x < 0.0 ? -1.0 : 1.0;
      vec2 ec = vec2(0.252 * side, -0.11), er = vec2(0.138, 0.158);
      vec2 e = vec2((q.x - ec.x) * side, q.y - ec.y) / er;
      float aE = aa / er.y;
      float xx = clamp(e.x, -1.0, 1.0), cx = sqrt(max(0.0, 1.0 - xx * xx));
      float top = pow(cx, 0.75) * 0.84, bot = -cx * 0.92;
      // going to happy ^ / wince >: both lids squeeze shut onto that curve (the lid line becomes the ^), so an in-between
      // frame is a smiling squint, never a see-through pale ghost eye
      float hx = clamp(e.x, -0.95, 0.95), hy = -0.08 + 0.62 * (1.0 - hx * hx);
      float sq = clamp(1.0 - fzEyeW.x, 0.0, 1.0), tgt = mix(0.04, hy, fzEyeW.y / max(fzEyeW.y + fzEyeW.z, 1e-3));
      float lid = mix(mix(top, tgt + 0.03, sq), bot * 0.9 + 0.06, fzEye.x);
      lid = min(lid, top - fzEye.w * 0.6 * cx);
      float rr = length(vec2(e.x, e.y > 0.0 ? e.y / max(0.05, top / max(cx, 0.05)) : e.y / 0.92));
      float lidL = mix(-1.6, tgt - 0.03, sq);
      float vis = (1.0 - smoothstep(1.0 - aE, 1.0 + aE, rr)) * (1.0 - smoothstep(-aE, aE, e.y - lid)) * smoothstep(-aE, aE, e.y - lidL);
      vec2 ic = ec + vec2(fzEye.y * 0.03, fzEye.z * 0.024 + 0.002);
      vec2 di = q - ic; float ir = 0.12, dr = length(di) / ir, aI = aa / ir;
      vec3 iris = mix(SRGB(0.36, 0.2, 0.1), SRGB(0.72, 0.46, 0.22), smoothstep(0.2, -0.95, di.y / ir));
      iris *= 0.86 + 0.14 * sin(atan(di.y, di.x) * 15.0 + dr * 5.0);
      iris = mix(iris, SRGB(0.16, 0.08, 0.04), smoothstep(0.68, 0.98, dr));
      iris = mix(iris, SRGB(0.06, 0.03, 0.02), 1.0 - smoothstep(0.43 - aI, 0.43 + aI, dr));
      vec3 scl = SRGB(0.97, 0.965, 0.99) * (1.0 - 0.1 * smoothstep(0.6, 1.0, rr));
      vec3 eye = mix(scl, iris, 1.0 - smoothstep(1.0 - aI, 1.0 + aI, dr));
      eye *= 1.0 - 0.45 * smoothstep(lid - 0.62, lid, e.y);
      float c1 = 1.0 - smoothstep(0.27 - aI, 0.27 + aI, length(di / ir - vec2(-0.33, 0.36)));
      float c2 = 1.0 - smoothstep(0.13 - aI, 0.13 + aI, length(di / ir - vec2(0.38, -0.36)));
      float cl = max(c1, c2 * 0.9);
      eye = mix(eye, vec3(1.0), cl);
      // thin, even upper lid line (no outer flick: a boy, not mascara)
      float lw = (0.12 + 0.08 * fzEye.x) * mix(0.8, 1.0, smoothstep(-1.0, 0.3, e.x));
      float ly = e.y - lid;
      float lash = smoothstep(-0.05 - aE, -0.05 + aE, ly) * (1.0 - smoothstep(lw - aE, lw + aE, ly)) * (1.0 - smoothstep(0.88, 1.02, abs(e.x)));
      // closed variants: happy ^ and wince >
      float happy = fzLine(abs(e.y - hy) / sqrt(1.0 + fzSq(1.24 * hx)), 0.17, aE) * (1.0 - smoothstep(0.9, 1.02, abs(e.x)));
      float wd = min(fzSeg(e, vec2(0.95, 0.5), vec2(-0.5, 0.02)), fzSeg(e, vec2(-0.5, 0.02), vec2(0.95, -0.42)));
      float wince = fzLine(wd, 0.16, aE);
      vec3 lashC = SRGB(0.17, 0.09, 0.06);
      float lower = fzLine(abs(e.y - max(bot, lidL) - 0.05), 0.045, aE) * smoothstep(0.95, 0.4, abs(e.x - 0.1)) * (1.0 - max(fzEye.x, sq));
      float ow = smoothstep(0.05, 0.35, fzEyeW.x), cw = smoothstep(0.45, 0.9, sq);   // open eye fades only once nearly shut
      col = mix(col, col * SRGB(0.8, 0.62, 0.58), lower * 0.7 * ow);
      col = mix(col, eye, vis * ow);
      col = mix(col, lashC, lash * ow);
      col = mix(col, lashC, happy * fzEyeW.y * cw);
      col = mix(col, lashC, wince * fzEyeW.z * cw);
      gloss = max(gloss, vis * ow);
      emis += vec3(0.55) * cl * vis * ow;
      // brows
      float bx = e.x;
      float by = ec.y + er.y + 0.06 + fzBrow.x * 0.035 + 0.02 * (1.0 - bx * bx) - fzBrow.y * 0.03 * bx;
      float bw = 0.017 * (1.15 - 0.2 * (bx + 1.0));
      float brow = fzLine(abs(q.y - by), bw, aa) * (1.0 - smoothstep(0.85, 1.0, abs(bx - 0.05)));
      col = mix(col, SRGB(0.24, 0.13, 0.07), brow * 0.92);
      // mouth
      vec2 m = q - vec2(0.012, -0.44);
      vec3 mline = SRGB(0.5, 0.22, 0.19), minner = SRGB(0.45, 0.1, 0.13), medge = SRGB(0.4, 0.12, 0.12);
      // cheeky closed-lip smirk: thick lip line with the corner on Feza's left pushed up into a cheek bulge + dimple
      float sx = clamp(m.x, -0.074, 0.088), sk = max(0.0, sx - 0.02);
      float sy = -0.002 - 0.25 * sx * sx;
      float sd = abs(m.y - sy) / sqrt(1.0 + fzSq(2.8 * sx + 0.12 + 13.0 * sk));
      float sw = 0.0125 * (0.72 + 0.6 * smoothstep(-0.08, 0.07, m.x));
      float inX = smoothstep(-0.088, -0.068, m.x) * (1.0 - smoothstep(0.084, 0.1, m.x));
      float smirk = fzLine(sd, sw, aa) * inX;
      float lipLo = exp(-fzSq((m.x + 0.004) / 0.052) - fzSq((m.y - sy + 0.021) / 0.014));                // fuller lower lip
      float lipUp = exp(-fzSq((m.x - 0.004) / 0.05) - fzSq((m.y - sy - 0.011) / 0.008));
      float bulge = 0.0;
      float dimple = 0.0;
      float scar = fzLine(fzSeg(q, vec2(-0.22,-0.18),vec2(-0.16,-0.34)),0.005,aa);
      col = mix(col, SRGB(0.40,0.20,0.18),scar*.7);
      float tuck = exp(-fzSq((m.x + 0.079) / 0.009) - fzSq((m.y - sy + 0.002) / 0.009));                  // other corner
      col *= 1.0 + 0.09 * bulge * fzMouth.x;
      col = mix(col, SRGB(0.9, 0.5, 0.46), (0.62 * lipLo + 0.35 * lipUp) * inX * fzMouth.x);
      col = mix(col, col * SRGB(1.0, 1.08, 1.08), 0.35 * exp(-fzSq((m.x + 0.01) / 0.025) - fzSq((m.y - sy + 0.024) / 0.006)) * fzMouth.x);
      col = mix(col, col * SRGB(0.8, 0.6, 0.56), (0.75 * dimple + 0.5 * tuck) * fzMouth.x);
      col = mix(col, mline, smirk * fzMouth.x);
      // open grin and "o" grow open as they blend in (solid colour at every weight, no pale see-through mouth)
      float gk = mix(0.3, 1.0, fzMouth.y), ga = smoothstep(0.0, 0.3, fzMouth.y);
      float gx = m.x / (0.105 * mix(0.8, 1.0, fzMouth.y)), gt = 0.016 + 1.2 * m.x * m.x, gb = gt - 0.1 * gk * sqrt(max(0.0, 1.0 - gx * gx));
      float gin = min(min(gt - m.y, m.y - gb), (1.0 - abs(gx)) * 0.03);
      float gI = smoothstep(-aa, aa, gin), gE = smoothstep(-aa, aa, gin + 0.006) - gI;
      vec3 gc = mix(minner, SRGB(0.95, 0.46, 0.52), 1.0 - smoothstep(0.045 * gk - aa, 0.045 * gk + aa, length(m - vec2(0.0, gt - 0.09 * gk))));
      float gty = gt - 0.017 * mix(0.6, 1.0, fzMouth.y);                                        // teeth
      gc = mix(gc, vec3(0.98), smoothstep(gty - aa, gty + aa, m.y));
      col = mix(col, medge, gE * ga); col = mix(col, gc, gI * ga);
      float ok = mix(0.4, 1.0, fzMouth.z), oa = smoothstep(0.0, 0.3, fzMouth.z);
      vec2 om = (m - vec2(0.0, -0.014)) / (vec2(0.033, 0.04) * ok);                              // "o"
      float od = (length(om) - 1.0) * 0.033 * ok, oI = 1.0 - smoothstep(-aa, aa, od), oE = (1.0 - smoothstep(-aa, aa, od - 0.006)) - oI;
      col = mix(col, medge, oE * oa); col = mix(col, mix(minner, SRGB(0.9, 0.42, 0.48), smoothstep(-0.2, -0.9, om.y)), oI * oa);
      float kx = clamp(m.x, -0.034, 0.034), ky = 2.4 * kx * kx - 0.004;                          // small relaxed line
      float small = fzLine(abs(m.y - ky) / sqrt(1.0 + fzSq(4.8 * kx)), 0.0058, aa) * (1.0 - smoothstep(0.032, 0.042, abs(m.x)));
      col = mix(col, mline, small * fzMouth.w);
      gloss = max(gloss, (gI * ga + oI * oa) * 0.6);
    }`;
  // Soft highlight knee just below the bloom threshold: skin, clothes and hair never glow, magic items still do.
  const KNEE = 'outgoingLight = mix(outgoingLight, 1.0 + (outgoingLight - 1.0) / (1.0 + (outgoingLight - 1.0) * 5.0), step(1.0, outgoingLight));';
  const knee = m => patchMat(m, { fOut: KNEE, key: 'knee' });
  function makeSkinMat() {
    const m = stencil(vcMat({ color: SKIN, roughness: 0.55, envMapIntensity: 0.75 }));
    const U = { fzEye: { value: new THREE.Vector4(0, 0, 0, 0) }, fzEyeW: { value: v3(1, 0, 0) }, fzMouth: { value: new THREE.Vector4(1, 0, 0, 0) }, fzBrow: { value: v3() } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aFace; varying vec2 vFace;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFace = aFace;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FACE_GLSL)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float fzGloss = 0.0; vec3 fzEmis = vec3(0.0);
          vec2 fzQ = vec2(vFace.x * cos(vFace.y), vFace.y); float fzAA = max(length(fwidth(fzQ)) * 0.7, 1e-4);
          if (vFace.x > -9.0 && abs(vFace.x) < 1.2) fzFace(diffuseColor.rgb, fzGloss, fzEmis, fzQ, fzAA);`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, fzGloss);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += fzEmis;')
        .replace('#include <opaque_fragment>', `float fzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += diffuseColor.rgb * vec3(0.6, 0.2, 0.12) * fzF * fzF * 0.38 + vec3(1.0, 0.74, 0.56) * pow(fzF, 3.0) * 0.12 * (1.0 - fzGloss);
          // fake subsurface: warm wrap light past the terminator (the lower face no longer goes dark / grey-tan under an
          // overhead light) + a little warm bounce under the chin
          vec3 fzWrap = vec3(0.0); float fzNL;
          #if NUM_POINT_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
            getPointLightInfo( pointLights[ i ], geometryPosition, directLight );
            fzNL = dot( geometryNormal, directLight.direction );
            fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) );
          }
          #pragma unroll_loop_end
          #endif
          #if NUM_DIR_LIGHTS > 0
          #pragma unroll_loop_start
          for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
            getDirectionalLightInfo( directionalLights[ i ], directLight );
            fzNL = dot( geometryNormal, directLight.direction );
            fzWrap += directLight.color * ( 0.5 * fzNL + 0.5 - saturate( fzNL ) );
          }
          #pragma unroll_loop_end
          #endif
          float fzLow = (vFace.x > -9.0 && abs(vFace.x) < 1.6) ? smoothstep(-0.12, -0.6, vFace.y) : 0.0;
          outgoingLight += (BRDF_Lambert(diffuseColor.rgb) * fzWrap * vec3(0.62, 0.36, 0.28) + reflectedLight.indirectDiffuse * vec3(0.25, 0.1, 0.04) * fzLow) * (1.0 - fzGloss);
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'fezaSkin3';
    m.userData.fz = U;
    return m;
  }
  // Hair vertex motion: spring offset + spin puff (aFlex), cowlicks collapse (aFlex < 0) and, under a hat, every vertex
  // outside the hat's inner ellipsoid (fzHatM: head space → unit sphere) and above its band is pulled inside it.
  const HAIR_V = `
    float fzFl = aFlex < 0.0 ? -aFlex - 0.01 : aFlex;
    transformed += (fzHOff + normalize(transformed - vec3(0.0, 0.24, 0.012)) * fzHExp) * fzFl;
    if (aFlex < 0.0 && fzHat.w < 0.5) transformed = vec3(0.0, 0.24, 0.012);
    if (fzHat.x > 0.5) {
      vec3 fzQ = (fzHatM * vec4(transformed, 1.0)).xyz;
      float fzL = length(fzQ), fzK = smoothstep(fzHat.y - fzHat.z, fzHat.y, fzQ.y);
      if (fzL > 0.93 && fzK > 0.0) transformed = (fzHatI * vec4(fzQ * mix(1.0, 0.93 / fzL, fzK), 1.0)).xyz;
    }`;
  const HAIR_VD = 'attribute float aFlex; uniform vec3 fzHOff; uniform float fzHExp; uniform vec4 fzHat; uniform mat4 fzHatM, fzHatI;';
  function makeHairMat() {
    const m = stencil(vcMat({ roughness: 0.5, normalMap: strandTex(), normalScale: V2(0.6, 0.6), envMapIntensity: 0.55 }));
    const U = { fzHOff: { value: v3() }, fzHExp: { value: 0 }, fzHat: { value: new THREE.Vector4(0, 0, 0.3, 1) }, fzHatM: { value: new THREE.Matrix4() }, fzHatI: { value: new THREE.Matrix4() } };
    const vpatch = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + HAIR_VD).replace('#include <begin_vertex>', '#include <begin_vertex>\n' + HAIR_V);
    };
    m.onBeforeCompile = sh => {
      vpatch(sh);
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `float fzF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
          outgoingLight += vec3(1.0, 0.8, 0.6) * pow(fzF, 3.0) * 0.12;
          ${KNEE}
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'fezaHair2';
    // shadow caster with the same vertex motion (hidden cowlicks cast no shadow)
    const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    d.onBeforeCompile = vpatch; d.customProgramCacheKey = () => 'fezaHairD';
    m.userData.fz = U; m.userData.depth = d;
    return m;
  }
  let SHARED = null;
  function sharedMats() {
    if (SHARED) return SHARED;
    const t = tex('metal');
    SHARED = {
      cloth: keep(stencil(rimify(knee(vcMat({ roughness: 0.72, metalness: .35, envMapIntensity: 0.55, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.8, 0.8) })), 0xfff2e6, 0.07))),
      shoe: keep(stencil(rimify(knee(vcMat({ roughness: 0.5, envMapIntensity: 0.7 })), 0xffffff, 0.08))),
    };
    return SHARED;
  }

  // ── Item materials (shared, cached) ──
  const MC = {};
  function mat(key, make) { return MC[key] || (MC[key] = keep(stencil(make()))); }
  function metalMat(key, color, rough, r) {
    return mat(key + '|' + (r >= 2 ? r : 0), () => {
      const t = tex('metal'), m = stdMat({ color, metalness: 1, roughness: rough, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.6, 0.6), envMapIntensity: 0.8 });
      return r >= 2 ? rimify(m, rarCol(r), r === 3 ? 0.75 : 0.5, 2.2) : rimify(m, 0xffffff, 0.12);
    });
  }
  const steelM = r => metalMat('steel', 0xd0d6e0, 0.5, r), goldM = r => metalMat('gold', 0xffc84a, 0.28, r);
  const vcM = (key, o, rim) => mat(key, () => rimify(vcMat(o), rim ?? 0xffffff, 0.14));
  // Emissive from vertex colours (glowing blades, gems).
  function glowVC(key, k, o = {}) {
    return mat(key, () => {
      const m = vcMat(Object.assign({ roughness: 0.25 }, o));
      patchMat(m, { uniforms: { fzGlowK: { value: k } }, fDecl: 'uniform float fzGlowK;', fOut: 'outgoingLight += vColor * fzGlowK;', key: 'glowvc' });
      return m;
    });
  }
  function feltMat(key, color, r) {
    return mat(key + '|' + (r >= 2 ? r : 0), () => {
      const t = tex('fabric') ? TEX.rep('fabric', 3, 3) : null;
      const m = knee(stdMat({ color, roughness: 0.88, normalMap: t ? t.normalMap : null, normalScale: V2(0.7, 0.7), envMapIntensity: 0.7 }));
      return r >= 2 ? rimify(m, rarCol(r), r === 3 ? 0.7 : 0.45, 2.2) : rimify(m, 0xffffff, 0.08);
    });
  }

  function starShape(R, r, n = 5) {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i & 1 ? r : R; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    return s;
  }
  function starGeo(R, depth = 0.012) {
    const g = new THREE.ExtrudeGeometry(starShape(R, R * 0.48), { depth, bevelEnabled: true, bevelThickness: depth * 0.5, bevelSize: R * 0.12, bevelSegments: 2 });
    g.translate(0, 0, -depth / 2); g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  }
  function heartShape(w) {   // point down at −w/2, cleft at 0.3 w
    const s = new THREE.Shape();
    s.moveTo(0, -0.5 * w);
    s.bezierCurveTo(0.14 * w, -0.32 * w, 0.52 * w, -0.08 * w, 0.5 * w, 0.18 * w);
    s.bezierCurveTo(0.48 * w, 0.46 * w, 0.16 * w, 0.56 * w, 0, 0.3 * w);
    s.bezierCurveTo(-0.16 * w, 0.56 * w, -0.48 * w, 0.46 * w, -0.5 * w, 0.18 * w);
    s.bezierCurveTo(-0.52 * w, -0.08 * w, -0.14 * w, -0.32 * w, 0, -0.5 * w);
    return s;
  }
  function flatGeo(shape, depth, bevel) {   // extruded, centred on z, with a zero uv (Kit-mergeable)
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 14 });
    g.translate(0, 0, -depth / 2); g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  }
  const GEO = {};   // cached item geometries
  const geoC = (k, f) => GEO[k] || (GEO[k] = keep(f()));

  // ── Lightsabers (Feza's request: every weapon is an "ışın kılıcı"; the base ids stay, so old saves keep working) ──
  // Grip centre at the slot origin, blade along +y (the slash poses were made for that). Hilt ≈ 0.26 m: pommel at −0.105,
  // ribbed grip, collar, control box with a glowing button, emitter shroud up to HILT_TOP. The blade comes out of the emitter:
  // a white-hot opaque core (unlit HDR with a coloured rim) inside an additive glow shell with a soft fresnel edge and a faint
  // wide halo, all flickering gently with TIME.u. The rainbow blade's hue drifts with time (same formula as ITEMS.bladeColor).
  // The blade group (obj.fzBlade) is scaled along y by the hero for the ignite / retract animation; templates stay ignited.
  const HILT_TOP = 0.155;
  const SABER = {
    tahta: { col: '#94e6ff', L: 0.55, metal: 0xdfe3ea, grip: 0x3d4a5c, shroud: 'plain', core: 1.4, shell: 1.5, halo: 0.42, btn: '#6fe0ff' },
    demir: { col: '#2f7bff', L: 0.75, metal: 0xe8ebf0, grip: 0x1b1d22, shroud: 'classic', core: 1.7, shell: 2.3, halo: 0.6, btn: '#ff4a4a' },
    kristal: { col: '#22ee4c', L: 0.75, metal: 0xd6dbe2, grip: 0x21302a, shroud: 'round', core: 1.6, shell: 1.9, halo: 0.5, btn: '#5dff7a' },
    ates: { col: '#ff2a22', L: 0.75, metal: 0x4b4f5a, grip: 0x141518, shroud: 'classic', core: 1.7, shell: 2.3, halo: 0.6, btn: '#ff6a3a' },
    yildiz: { col: '#9b45ff', L: 0.75, metal: 0xe4e0ea, grip: 0x251d31, shroud: 'crown', core: 1.7, shell: 2.3, halo: 0.6, btn: '#d49bff' },
    gokkusagi: { col: '#ff5fd0', L: 0.78, metal: 0xf6f2ff, grip: 0x6f5fa6, shroud: 'crown', rainbow: true, core: 1.7, shell: 2.1, halo: 0.55, btn: '#ffffff' },
  };
  SABER.lavkilic = { col: '#ff762b', L: 0.78, metal: 0x302d38, grip: 0x201f2b, shroud: 'round', core: 1.7, shell: 2.1, halo: 0.55, btn: '#ffbc49' };
  SABER.ejderkilic = { col: '#c77aff', L: 0.82, metal: 0xe7bd59, grip: 0x3d2355, shroud: 'crown', core: 1.7, shell: 2.1, halo: 0.55, btn: '#e4beff' };
  // (Round 5) the Huysuz Şövalye's tournament sword: red / white jousting-lance spiral grip, golden crossguard (guard)
  SABER.sovalyeikiz = { ...SABER.demir, col: '#ffc81e', haloCol: '#ffb62a', L: 0.8, metal: 0xeef1f6, grip: 0xfff4e6, shroud: 'round', btn: '#ff5b6b', guard: true };   // rich warm gold (more saturated than guniskilic / lavikiz), amber halo
  const GUARD_Y = 0.085;
  for (const [id, col, shroud, metal, motif] of [
    ['buzkilic', '#7defff', 'round', 0xb1d9ed, 'ice'], ['guniskilic', '#ffd651', 'crown', 0xe4b95c, 'sun'],
    ['dalga', '#41e8cb', 'classic', 0x84d6c8, 'wave'], ['joleikiz', '#b0ff76', 'round', 0xdab750, 'jelly'],
    ['lavikiz', '#ffac4e', 'crown', 0x4b435b, 'lava'],
  ]) SABER[id] = { ...SABER.demir, col, shroud, metal, L: 0.78, motif };
  // (Round 6) boss rewards told apart at a glance: the knight's sword is a red / white-gold jousting lance (3 turns),
  // the turtle's lava blade runs sun-yellow → lava-red (+ the lava shell grip), the Güneş blade keeps its sun (bigger).
  Object.assign(SABER.sovalyeikiz, { fx: 'stripe', col: '#fff0b8', col2: '#ff2438', halo2: '#ff4556', haloCol: '#ffd27a', sn: 6, sk: 2, trail: '#ff5b6b' });
  Object.assign(SABER.lavikiz, { fx: 'grad', col: '#ffd23f', col2: '#ff4a1c', haloCol: '#ff6a2a', trail: '#ff8a2a', bossGrip: true });
  // (Round 6) new ordinary lightsabers (fx: blade shader variant; motif: hilt ornament; col2: ramp tip colour)
  Object.assign(SABER, {
    pamukseker: { ...SABER.demir, fx: 'grad', col: '#ff8fd0', col2: '#8fd8ff', coreCol: '#ffe9f6', coreCol2: '#e6f7ff', L: 0.76, metal: 0xfbe6f1, grip: 0xffc6e2, shroud: 'round', btn: '#8fd8ff', motif: 'cotton' },
    kalp: { ...SABER.demir, col: '#ff4fa0', haloCol: '#ffb3d9', L: 0.76, metal: 0xf4e7c8, grip: 0xfff4ea, shroud: 'plain', btn: '#ffd1e6', motif: 'heart', btnPos: [0, 0.119, 0.03] },
    uzay: { ...SABER.demir, fx: 'stars', col: '#3b5bff', col2: '#b46bff', L: 0.78, metal: 0xf1f3f8, grip: 0x2b3352, shroud: 'nose', nose: '#ff4a4a', btn: '#7ff3ff', motif: 'rocket', porthole: true },
    kuyruklu: { ...SABER.demir, fx: 'stars', col: '#ffc53a', col2: '#ffeaa0', haloCol: '#c9a8ff', L: 0.8, metal: 0xece4ff, grip: 0x3a2c5c, shroud: 'crown', btn: '#fff6c8', motif: 'star', btnPos: [0, 0.1, 0.029], trail: '#ffe38a' },
  });
  const WAND = {
    findik: { wood: '#855137', col: '#a1cfff', L: 0.48, band: '#c9a16b' },
    mese: { wood: '#533c2c', col: '#79dbbd', L: 0.53, band: '#b8ca9b' },
    ay: { wood: '#6d506d', col: '#bfa7ff', L: 0.56, band: '#dfe6fa' },
    kor: { wood: '#472b2b', col: '#ff9a54', L: 0.56, band: '#d79657' },
    yildizdegnek: { wood: '#443c67', col: '#efbcff', L: 0.59, band: '#ffe4a1' },
    gokdegnek: { wood: '#ddd1ba', col: '#ff93dc', L: 0.61, band: '#e2bc65' },
    lavdegnek: { wood: '#322c36', col: '#ff762b', L: 0.6, band: '#ffad46', boss: 'lava' },
    ejderdegnek: { wood: '#472645', col: '#c77aff', L: 0.64, band: '#e7bd59', boss: 'dragon' },
  };
  Object.assign(WAND, {
    mercan: { wood: '#935149', col: '#ffb6b3', L: 0.63, band: '#ffd6ad', motif: 'coral' },
    bulut: { wood: '#b8a17c', col: '#aeefff', L: 0.65, band: '#eefaff', motif: 'cloud' },
    cicek: { wood: '#53643c', col: '#ff9dd5', L: 0.64, band: '#dbce77', motif: 'flower' },
    jolesihir: { wood: '#594676', col: '#c29aff', L: 0.67, band: '#b5ff82', motif: 'jelly' },
    kefirikiz: { wood: '#438677', col: '#c4fff1', L: 0.69, band: '#fff2bb', motif: 'cloud' },
    magaraikiz: { wood: '#584474', col: '#8bdcff', L: 0.7, band: '#e2b569', motif: 'ice' },
    ejderikiz: { wood: '#315665', col: '#62ffda', L: 0.73, band: '#f4cf71', boss: 'dragon', motif: 'dragon' },
  });
  // (Round 6) new ordinary wands. tipP / tipS: the tip light's position / size (default: an egg on the stick's end)
  Object.assign(WAND, {
    lolipop: { wood: '#fff7fb', col: '#ff6fb5', L: 0.5, band: '#ff8fc8', stripe: '#ff5aa6', motif: 'lollipop', tipP: [0, 0.53, 0.026], tipS: [0.021, 0.021, 0.012], tipI: 2.0 },
    kedipati: { wood: '#f1dfc1', col: '#ffc2de', L: 0.55, band: '#ffb0d2', motif: 'paw', tipP: [0, 0.543, 0.03], tipS: [0.025, 0.021, 0.011], tipI: 1.9 },
    gezegen: { wood: '#1f2a5c', col: '#ffa24a', L: 0.6, band: '#f2c45a', motif: 'planet', tipP: [0, 0.605, 0], tipS: [0.036, 0.036, 0.036], tipI: 1.7 },
  });
  const saberDef = id => SABER[id] || SABER.demir;
  // rainbow blade: hue = fract(t * RB_SPEED + y * RB_GRAD) (y along the blade in metres), HSV saturation RB_SAT
  const RB_SPEED = 0.11, RB_GRAD = 0.3, RB_SAT = 0.8, RB_Y = 0.35;
  const fract = x => x - Math.floor(x);
  function hsvHex(h, s, v) {
    const f = k => { const p = Math.abs(fract(h + k) * 6 - 3); return v * (1 + (clamp(p - 1, 0, 1) - 1) * s); };
    const hx = x => Math.round(clamp(x, 0, 1) * 255).toString(16).padStart(2, '0');
    return '#' + hx(f(0)) + hx(f(2 / 3)) + hx(f(1 / 3));
  }
  const nowT = () => (typeof TIME !== 'undefined' && TIME.u ? TIME.u.value : performance.now() / 1000);
  // ITEMS.bladeColor(item | baseId) → '#rrggbb' (the rainbow blade: its colour right now, at mid-blade)
  function bladeColor(item) {
    const id = typeof item === 'string' ? item : item ? baseId(item) : 'tahta', d = WAND[id] || saberDef(id);
    return darkHue(id);
  }
  // (Round 6) blade variants (glow shell + halo only, one program each): SB_GRAD colour ramp hilt → tip (uCol → uCol2),
  // SB_STRIPE barber-pole ribbons in uCol2 (uSN stripes along the blade, uSK ribbons around it), SB_STARS twinkling star dots
  // drifting up the blade (the stars program ramps uCol → uCol2 too). The angle around the blade is taken per fragment from the
  // interpolated local position (no seam streak). The core ramps uCol → uCol2 with plain uniforms (uCol2 = uCol: no ramp).
  const SABER_VS = `varying vec3 vN; varying vec3 vV; varying float vY;
    #if defined(SB_STRIPE) || defined(SB_STARS)
    varying vec2 vXZ;
    #endif
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal); vV = -mv.xyz; vY = position.y;
      #if defined(SB_STRIPE) || defined(SB_STARS)
      vXZ = position.xz;
      #endif
      gl_Position = projectionMatrix * mv;
    }`;
  // SB_U: shared by every blade. Thumbnails render without tone mapping, so they dim the blades (k) to keep the hues
  // (HDR blue clipped per channel turns cyan, purple turns pink) and spread the rainbow over the whole blade (grad).
  const SB_U = { k: { value: 1 }, grad: { value: RB_GRAD }, ramp: { value: 1 } };   // ramp: colour ramp stretch (thumbnails: the lower 60 % shows it all)
  const SABER_FS = `uniform vec3 uCol, uCol2; uniform float uI, uRb, uT, uPow, uOcc, uK, uGrad, uGL, uRamp;
    #if defined(SB_STRIPE) || defined(SB_STARS)
    uniform float uSN, uSK, uSt;
    varying vec2 vXZ;
    #endif
    varying vec3 vN; varying vec3 vV; varying float vY;
    vec3 sbCol() {
    #if defined(SB_GRAD) || defined(SB_STARS) || defined(SABER_CORE)
      if (uRb < 0.5) return mix(uCol, uCol2, smoothstep(0.0, 1.0, clamp(vY * uGL * uRamp, 0.0, 1.0)));
    #else
      if (uRb < 0.5) return uCol;
    #endif
      vec3 p = abs(fract(fract(uT * ${RB_SPEED.toFixed(4)} + vY * uGrad) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
      return pow(mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), ${RB_SAT.toFixed(4)}), vec3(2.2));
    }
    float sbFlick() { float t = mod(uT, 600.0); return 1.0 + 0.045 * sin(t * 47.0) + 0.03 * sin(t * 113.0 + vY * 9.0) + 0.02 * sin(t * 7.3); }
    float sbNV() { return abs(dot(normalize(vN), normalize(vV))); }
    #ifdef SB_STARS
    float sbHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    #endif
    void main() {
    #ifdef SABER_CORE
      vec3 k = sbCol();
      vec3 c = mix(k * 1.5, mix(k, vec3(1.0), 0.8), smoothstep(0.12, 0.72, sbNV())) * uI * uK * sbFlick();
      gl_FragColor = vec4(c, 1.0);
    #else
      float a = pow(sbNV(), uPow) * sbFlick();
      vec3 col = sbCol();
      #if defined(SB_STRIPE) || defined(SB_STARS)
      float ang = atan(vXZ.x, vXZ.y) * ${(1 / TAU).toFixed(6)} + 0.5;
      #endif
      #ifdef SB_STRIPE
      float s = abs(fract(vY * uSN + ang * uSK) - 0.5), w = clamp(fwidth(vY * uSN + ang * uSK), 0.02, 0.2);
      col = mix(col, uCol2, clamp((s - 0.25) / w + 0.5, 0.0, 1.0) * uSt);
      #endif
      #ifdef SB_STARS
      vec2 q = vec2(vY * uSN - uT * 0.35, ang * uSK), cell = floor(q), f = fract(q) - 0.5;
      float h = sbHash(cell), tw = 0.55 + 0.45 * sin(uT * (2.0 + 3.0 * h) + h * 40.0);
      vec2 o = (vec2(sbHash(cell + 17.0), sbHash(cell + 31.0)) - 0.5) * 0.4;
      float st = step(0.45, h) * smoothstep(0.3, 0.06, length(f - o)) * tw;
      col += vec3(1.0, 0.97, 0.9) * st * uSt * 2.2;
      a = max(a, st * uSt * 0.8);
      #endif
      gl_FragColor = vec4(col * uI * uK * a, min(1.0, a * uOcc));
    #endif
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  // part: 'core' (opaque) | 'shell' | 'halo'. Glow parts are premultiplied "light over" blending: they add their light and
  // cover a little of what is behind (uOcc), so the colour still reads on the bright forest grass, and in dark caves it is
  // plain additive glow. The alpha channel accumulates the same way, so thumbnails keep a soft transparent glow.
  function saberMat(id, part, r) {
    const d = saberDef(id);
    return mat('sb:' + part + ':' + id + '|' + r, () => {
      const glow = part !== 'core', boost = 1 + 0.06 * r, fx = glow ? d.fx || '' : '';   // fx: 'grad' | 'stripe' | 'stars'
      // uCol2: the ramp's tip colour (grad / stars; the core ramps along) or the stripe colour (shell + halo only)
      const c1 = part === 'halo' && d.haloCol ? d.haloCol : part === 'core' && d.coreCol ? d.coreCol : d.col;
      const c2 = part === 'core' ? (d.coreCol ? d.coreCol2 || c1 : d.fx === 'grad' || d.fx === 'stars' ? d.col2 || c1 : c1)
        : part === 'halo' && (d.haloCol || d.halo2) ? d.halo2 || c1 : d.col2 || c1;
      const m = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: new THREE.Color(c1) }, uCol2: { value: new THREE.Color(c2) }, uGL: { value: 1 / d.L }, uRamp: SB_U.ramp,
          uI: { value: d[part] * boost }, uRb: { value: d.rainbow ? 1 : 0 }, uT: TIME.u,
          uPow: { value: part === 'halo' ? 2.4 : 1.25 }, uOcc: { value: part === 'halo' ? 0.22 : 0.6 }, uK: SB_U.k, uGrad: SB_U.grad,
          uSN: { value: fx === 'stars' ? 40 : (d.sn || 6) / d.L }, uSK: { value: fx === 'stars' ? 8 : d.sk || 2 }, uSt: { value: part === 'halo' ? (fx === 'stars' ? 0.25 : 0.45) : 1 } },
        vertexShader: SABER_VS, fragmentShader: SABER_FS, defines: glow ? (fx ? { ['SB_' + fx.toUpperCase()]: 1 } : {}) : { SABER_CORE: 1 },
      });
      if (glow) Object.assign(m, { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
      m.customProgramCacheKey = () => 'saber' + (glow ? 'G' + fx : 'C');
      return m;
    });
  }
  // Capsule-ish lathe profile (bottom pole → tip): radius r, rounded bottom cap of height capB (0 = open), top cap capT.
  function capsuleGeo(r, y0, y1, capB, capT, seg) {
    const P = [], n = 6;
    if (capB > 0) for (let i = 0; i < n; i++) { const a = i / n * Math.PI / 2; P.push(V2(Math.max(1e-4, r * Math.sin(a)), y0 + capB * (1 - Math.cos(a)))); }
    else P.push(V2(r, y0));
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; P.push(V2(Math.max(1e-4, r * Math.cos(a)), y1 - capT + capT * Math.sin(a))); }
    const g = new THREE.LatheGeometry(P, seg);
    g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  }
  const bladeParts = L => ({
    core: geoC('sbCore:' + L, () => capsuleGeo(0.0105, 0, L, 0, 0.012, 10)),
    shell: geoC('sbShell:' + L, () => capsuleGeo(0.027, -0.004, L + 0.014, 0.012, 0.03, 14)),
    halo: geoC('sbHalo:' + L, () => capsuleGeo(0.064, -0.03, L + 0.05, 0.05, 0.075, 14)),
  });
  // y0 → y1 cylinder with bottom radius r0 and top radius r1
  const kcyl = (k, y0, y1, r0, r1, col, seg = 24) => k.add(G.cyl(r1 / r0, 1, seg), col, [0, (y0 + y1) / 2, 0], 0, [r0, y1 - y0, r0]);
  function hiltGeo(id) {
    const d = saberDef(id), M = d.metal, D = 0x15171b, DK = mixCol(d.metal, '#101216', 0.55);
    return kitGeo(k => {
      // pommel
      k.add(G.sphere(20), M, [0, -0.093, 0], 0, [0.0195, 0.013, 0.0195]);
      kcyl(k, -0.094, -0.079, 0.0205, 0.0205, M);
      kcyl(k, -0.079, -0.075, 0.0185, 0.0185, M);
      if (d.guard) {   // the knight's: the long spiral grip ends in a collar, a short neck through the crossguard
        kcyl(k, 0.062, 0.07, 0.0196, 0.0196, M);
        kcyl(k, 0.07, 0.121, 0.0166, 0.0176, M);
        kcyl(k, 0.108, 0.111, 0.018, 0.018, DK);
      } else {   // collar, upper body with the control box, upper collar
        kcyl(k, 0.049, 0.053, 0.0185, 0.0185, M);
        kcyl(k, 0.053, 0.066, 0.0198, 0.0198, M);
        kcyl(k, 0.066, 0.113, 0.0172, 0.0172, M);
        for (const y of [0.074, 0.105]) kcyl(k, y - 0.0015, y + 0.0015, 0.0178, 0.0178, DK);
        if (!d.porthole) k.add(G.rbox(2), D, [0, 0.089, 0.0158], 0, [0.016, 0.028, 0.009]);
      }
      kcyl(k, 0.113, 0.121, 0.0196, 0.0196, M);
      // emitter shroud (the blade starts inside it) + dark emitter disc
      if (d.shroud === 'crown') {
        kcyl(k, 0.121, 0.147, 0.0182, 0.0222, M, 28);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(G.cone(10), M, [Math.sin(a) * 0.0195, 0.153, Math.cos(a) * 0.0195], [Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18], [0.0048, 0.017, 0.0048]); }
        kcyl(k, 0.145, 0.149, 0.0185, 0.0185, D);
      } else if (d.shroud === 'round') {
        k.add(G.sphere(24), M, [0, 0.134, 0], 0, [0.0232, 0.019, 0.0232]);
        kcyl(k, 0.14, 0.155, 0.0198, 0.0186, M);
        kcyl(k, 0.1515, 0.1555, 0.0158, 0.0158, D);
      } else if (d.shroud === 'nose') {   // (Round 6) the rocket's red nose cone, the blade shoots out of its tip
        kcyl(k, 0.121, 0.129, 0.0206, 0.0206, M, 28);   // (the red cone itself is part of the rocket ornament: painted, not metal)
        kcyl(k, 0.1575, 0.1605, 0.0098, 0.0098, D);
      } else if (d.shroud === 'plain') {
        kcyl(k, 0.121, 0.155, 0.0205, 0.0205, M);
        kcyl(k, 0.134, 0.139, 0.0212, 0.0212, DK);
        kcyl(k, 0.1515, 0.1555, 0.0172, 0.0172, D);
      } else {   // classic: flared shroud with three little vents
        kcyl(k, 0.121, 0.155, 0.0183, 0.0236, M, 28);
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; k.add(G.rbox(2), D, [Math.sin(a) * 0.0205, 0.136, Math.cos(a) * 0.0205], [0, a, 0], [0.007, 0.016, 0.004]); }
        kcyl(k, 0.1515, 0.1555, 0.0196, 0.0196, D);
      }
    });
  }
  function gripGeo(id) {
    const c = saberDef(id).grip, ridge = mixCol(c, '#000000', 0.25);
    if (saberDef(id).guard) return kitGeo(k => {   // white lance grip wound with two red ribbons (barber-pole spiral)
      const rad = y => lerp(0.0164, 0.0178, (y + 0.075) / 0.137);
      kcyl(k, -0.075, 0.062, rad(-0.075), rad(0.062), c, 28);
      for (const a0 of [0, Math.PI]) {
        const P = [], U = [];
        for (let i = 0; i <= 48; i++) { const y = -0.073 + i / 48 * 0.133, a = a0 + i / 48 * 2.3 * TAU, rr = rad(y) + 0.0004; P.push(v3(Math.sin(a) * rr, y, Math.cos(a) * rr)); U.push(v3(Math.sin(a), 0, Math.cos(a))); }
        k.add(sweep(P, U, () => 0.0085, () => 0.0016, 6, 0.2, () => {}, null), '#e8323c');
      }
    });
    return kitGeo(k => {
      kcyl(k, -0.075, 0.049, 0.0162, 0.0162, c, 20);
      for (let i = 0; i < 6; i++) { const y = -0.064 + i * 0.0205; kcyl(k, y - 0.0048, y + 0.0048, 0.0186, 0.0186, ridge, 20); }
    });
  }
  function accentGeo(r, guard) {   // gold rings (rarity ≥ 2), a gold pommel cap for legendaries; the knight's crossguard
    return kitGeo(k => {
      if (r >= 2) for (const [y, rad] of [[-0.079, 0.0206], [guard ? 0.066 : 0.059, 0.0201], [0.117, 0.0198], [0.1545, 0.0232]]) k.add(G.torus(TAU, 0.16, 32), 0xffffff, [0, y, 0], [Math.PI / 2, 0, 0], [rad, rad, rad]);
      if (r >= 3 || guard) k.add(G.sphere(16), 0xffffff, [0, -0.104, 0], 0, [0.011, 0.006, 0.011]);
      if (!guard) return;
      // quillons curling up toward the blade with ball tips, and a sun medallion in the middle (its gem = the button)
      const Y = GUARD_Y;
      for (const s of [-1, 1]) {
        k.seg([0, Y, 0], [s * 0.055, Y + 0.004, 0], 0.0115, 0xffffff, 0.0085, 12);
        k.seg([s * 0.055, Y + 0.004, 0], [s * 0.08, Y + 0.02, 0], 0.0085, 0xffffff, 0.007, 12);
        k.add(G.sphere(14), 0xffffff, [s * 0.083, Y + 0.024, 0], 0, 0.0118);
      }
      k.add(G.cyl(1, 1, 28), 0xffffff, [0, Y, 0], [Math.PI / 2, 0, 0], [0.027, 0.03, 0.027]);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.add(G.cone(8), 0xffffff, [Math.sin(a) * 0.033, Y + Math.cos(a) * 0.033, 0], [0, 0, -a], [0.0072, 0.014, 0.004]); }
    });
  }
  // Small wooden wands share the hand socket with sabers, but never grow a luminous blade.
  function bossGrip(id) {
    const lava = id === 'lavkilic' || id === 'lavdegnek' || id === 'lavikiz';
    return geoC('bossGrip:' + (lava ? 'lava' : 'dragon'), () => kitGeo(k => {
      if (lava) {
        k.add(G.sphere(12), '#302d38', [0, 0.1, 0], 0, [0.068, 0.074, 0.045]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; k.seg([0, 0.1, 0.046], [Math.sin(a) * 0.06, 0.1 + Math.cos(a) * 0.065, 0.022], 0.004, '#ff9e36', 0.003, 6); }
      } else {
        for (const side of [-1, 1]) {
          k.seg([0, 0.07, 0], [side * 0.105, 0.17, 0], 0.012, '#e7bd59', 0.007, 8);
          for (let i = 0; i < 3; i++) k.seg([side * 0.025, 0.08, 0], [side * (0.05 + i * 0.028), 0.17 - i * 0.026, 0], 0.019, '#9358b6', 0.004, 8);
        }
        k.add(G.sphere(12), '#d3a1ff', [0, 0.08, 0.03], 0, [0.017, 0.026, 0.012]);
      }
    }));
  }
  // Decorations are merged into one mesh, keeping even the dual-wielding hero inexpensive.
  function weaponOrnament(motif, band, col, y) {
    return geoC('ornament:' + motif + ':' + band + ':' + col + ':' + y, () => kitGeo(k => {
      if (motif === 'cloud' || motif === 'jelly') {
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(G.sphere(12), i & 1 ? band : col, [Math.sin(a) * 0.045, y + Math.cos(a) * 0.042, 0], 0, [0.035, 0.039, 0.027]); }
      } else if (motif === 'ice') {
        for (const side of [-1, 1]) k.add(G.cone(5), col, [side * 0.044, y, 0], [0, 0, side * -0.32], [0.024, 0.13, 0.024]);
      } else if (motif === 'sun' || motif === 'flower') {   // (Round 6) the Güneş blade's sun is bigger (rays at 0.075)
        const sun = motif === 'sun', R = sun ? 0.075 : 0.06, S = sun ? 1.2 : 1;
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; k.add(G.sphere(10), col, [Math.sin(a) * R, y + Math.cos(a) * R, 0], [0, 0, -a], [0.021 * S, 0.035 * S, 0.013 * S]); }
        k.add(G.sphere(12), band, [0, y, 0.015], 0, [0.033 * S, 0.033 * S, 0.015 * S]);
      } else if (motif === 'cotton') {   // (Round 6) a fluffy cotton-candy cloud round the emitter: pink, sky and white puffs
        const R = mulberry32(31), C = ['#ff9ad4', '#ffc4e6', '#9fdcff', '#ffffff', '#ff86c8'];
        for (let i = 0; i < 30; i++) {
          const a = i * 2.39996 + R() * 0.3, h = i / 29, rr = 0.027 + 0.014 * Math.sin(h * Math.PI) + R() * 0.004, s = 0.011 + R() * 0.007;
          k.add(G.sphere(10), C[i % 5], [Math.sin(a) * rr, 0.094 + h * 0.056, Math.cos(a) * rr], 0, [s, s * 0.85, s]);
        }
      } else if (motif === 'heart') {   // (Round 6) a heart crossguard (the blade comes out of its cleft), a pale inner heart on each face
        k.add(geoC('heart:0.1', () => flatGeo(heartShape(0.1), 0.03, 0.006)), col, [0, 0.122, 0]);
        for (const z of [1, -1]) k.add(geoC('heart:0.056', () => flatGeo(heartShape(0.056), 0.006, 0.003)), '#ffd6ea', [0, 0.122, z * 0.0205], [0, z < 0 ? Math.PI : 0, 0]);
        for (const sd of [-1, 1]) k.add(G.sphere(10), '#fff1c4', [sd * 0.055, 0.14, 0], 0, 0.0075);
      } else if (motif === 'rocket') {   // (Round 6) rocket: three red fins at the pommel, a ring round the porthole window
        const fin = new THREE.Shape();
        fin.moveTo(0, 0.05); fin.quadraticCurveTo(0.012, 0.012, 0.034, -0.012); fin.lineTo(0.036, -0.036); fin.quadraticCurveTo(0.018, -0.03, 0, -0.022); fin.closePath();
        const fg = geoC('rocketFin', () => flatGeo(fin, 0.004, 0.0018));
        for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + Math.PI / 6; k.add(fg, '#ff4a4a', [Math.sin(a) * 0.016, -0.07, Math.cos(a) * 0.016], [0, a - Math.PI / 2, 0]); }
        k.add(G.torus(TAU, 0.22, 24), band, [0, 0.089, 0.0172], 0, 0.0118);
        k.add(lathe([[0.0212, 0], [0.021, 0.008], [0.0194, 0.016], [0.0162, 0.023], [0.0124, 0.029], [0.0106, 0.0315]], 28, 0, 0, 1, 1), '#ff4a4a', [0, 0.1285, 0]);
        k.add(G.torus(TAU, 0.2, 28), '#ffffff', [0, 0.1295, 0], [Math.PI / 2, 0, 0], 0.0212);
        k.add(G.sphere(10), '#ffd23f', [0, -0.112, 0], 0, [0.012, 0.008, 0.012]);   // a little flame glow under the pommel
      } else if (motif === 'star') {   // (Round 6) comet: a big golden star on the guard with a swooping three-strand tail
        k.add(geoC('cometStar', () => flatGeo(starShape(0.05, 0.023), 0.026, 0.006)), '#ffd64a', [0, 0.1, 0]);
        const T = [['#c9a8ff', 0.0068, 0], ['#ffb3e0', 0.0056, 0.35], ['#fff1a8', 0.005, -0.35]];
        for (const [c, r0, o] of T) {
          const P = [];
          for (let i = 0; i <= 8; i++) { const t = i / 8; P.push([-0.02 - t * 0.085, 0.092 - t * 0.02 + Math.sin(t * Math.PI) * (0.012 + o * 0.03) - t * t * 0.03 + o * t * 0.02, -0.004 - t * 0.01]); }
          for (let i = 0; i < 8; i++) { const t = i / 8; k.seg(P[i], P[i + 1], r0 * (1 - t * 0.8), c, r0 * (1 - (t + 0.125) * 0.8), 8); k.add(G.sphere(8), c, P[i + 1], 0, r0 * (1 - (t + 0.125) * 0.8)); }
        }
      } else if (motif === 'lollipop') {   // (Round 6) a round lollipop behind the tip light: white disc, pink + sky swirl on both faces
        const cy = y + 0.075;
        k.add(G.cyl(1, 1, 36), '#fff6fb', [0, cy, 0], [Math.PI / 2, 0, 0], [0.074, 0.02, 0.074]);
        k.add(G.torus(TAU, 0.1, 40), '#ff8fc8', [0, cy, 0], 0, 0.074);
        for (const zs of [1, -1]) for (const [c, a0] of [['#ff4f9e', 0], ['#7fd0ff', Math.PI]]) {
          let prev = null;
          for (let i = 0; i <= 40; i++) {
            const th = a0 + i / 40 * 2.6 * TAU, rr = 0.006 + i / 40 * 0.058, p = [Math.sin(th) * rr * zs, cy + Math.cos(th) * rr, zs * 0.0102];
            if (prev) k.seg(prev, p, 0.0068, c, 0.0068, 6);
            k.add(G.sphere(6), c, p, 0, [0.0068, 0.0068, 0.0045]); prev = p;
          }
        }
      } else if (motif === 'paw') {   // (Round 6) a cat's paw: a soft cream mitten, four pink toe beans round the glowing pad
        const cy = y + 0.05;
        k.add(G.sphere(20), '#fff4e2', [0, cy, 0], 0, [0.062, 0.06, 0.03]);
        for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.66, p = [Math.sin(a) * 0.043, cy + 0.006 + Math.cos(a) * 0.041]; k.add(G.sphere(14), col, [p[0], p[1], 0.024 - Math.abs(i - 1.5) * 0.003], [0, 0, -a], [0.0125, 0.0145, 0.008]); }
        for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.66; k.add(G.sphere(14), col, [Math.sin(a) * 0.043, cy + 0.006 + Math.cos(a) * 0.041, -0.024 + Math.abs(i - 1.5) * 0.003], [0, 0, -a], [0.0125, 0.0145, 0.008]); }
        k.add(G.sphere(16), col, [0, cy - 0.012, -0.022], 0, [0.024, 0.02, 0.009]);
      } else if (motif === 'planet') {   // (Round 6) a tilted glowing ring and a tiny moon round the planet tip; gold star studs on the stick
        const cy = y + 0.05;
        k.push([0, cy, 0], [1.18, 0, 0.42]);
        k.add(G.torus(TAU, 0.07, 48), '#6fe8ff', [0, 0, 0], 0, 0.074);
        k.add(G.torus(TAU, 0.05, 48), '#c4f6ff', [0, 0, 0], 0, 0.086);
        k.pop();
        k.add(G.sphere(12), '#f4f0ff', [0.066, cy + 0.052, 0.018], 0, 0.0145);
        for (const [yy, a] of [[0.16, 0.3], [0.27, -0.9], [0.38, 1.9]]) { const rr = lerp(0.029, 0.013, (yy - 0.055) / (y + 0.045 - 0.055)) + 0.003; k.add(geoC('wandStud', () => starGeo(0.013, 0.004)), band, [Math.sin(a) * rr, yy, Math.cos(a) * rr], [0, a, 0]); }
      } else {
        for (const side of [-1, 1]) {
          k.seg([0, y - 0.11, 0], [side * 0.057, y - 0.01, 0], 0.012, band, 0.009, 8);
          k.seg([side * 0.057, y - 0.01, 0], [side * 0.035, y + 0.047, 0], 0.009, band, 0.004, 8);
          if (motif === 'coral' || motif === 'dragon') k.seg([side * 0.05, y - 0.02, 0], [side * 0.09, y + 0.025, 0], 0.01, col, 0.005, 8);
        }
      }
    }));
  }

  const darkKey = id => Object.keys(CURSED_NAMES).indexOf(id) + 1;
  const darkHue = id => ['#b54745','#638f9d','#9070a9','#a59568','#69876b'][darkKey(id)%5];
  // Each family is built from simple solid forms, using the existing cached material programs.
  function cursedWeapon(id,r) {
    const wand=!!WAND[id], q=darkKey(id), L=wand?WAND[id].L:saberDef(id).L, g=new THREE.Group();
    const geo=geoC('curseGrip:'+id+':'+r,()=>kitGeo(k=>{
      kcyl(k,-.09,.13,.027,.026,0x302a29,12);
      for(let i=0;i<4;i++)kcyl(k,-.08+i*.04,-.075+i*.04,.029,.029,0x857562,12);
      k.add(G.sphere(10),0x736d62,[0,-.102,0],0,[.04,.026,.033]);
      if(r>=1)for(const side of [-1,1])k.add(G.rbox(2),0x998c70,[side*.033,-.030,0],[0,0,side*.12],[.016,.075,.022]);
      if(r>=2)for(const side of [-1,1])k.add(G.cone(8),0xa59878,[side*.087,.155,-.012],[0,0,-side*.55],[.023,.105,.022]);
      if(r===3){k.add(G.sphere(14),0xb5a587,[0,-.123,0],0,[.038,.043,.028]);for(const side of [-1,1])k.add(G.sphere(8),0x28242c,[side*.014,-.119,.026],0,[.009,.013,.004]);}
      if(!wand) { k.add(G.rbox(2),0x69717c,[0,.11,0],0,[.23+(q%3)*.025,.028,.042]); for(const side of [-1,1])k.add(G.cone(8),0x8c8273,[side*.115,.15,0],[0,0,-side*.45],[.024,.1,.024]); }
      else {kcyl(k,.13,L-.06,.024,.015,0x48413b,12);
        const kind=q%5;
        if(kind===0){k.add(G.sphere(16),0xb0a48c,[0,L-.015,0],0,[.075,.085,.052]);for(const side of [-1,1])k.add(G.sphere(10),0x17151b,[side*.027,L-.005,.047],0,[.018,.023,.013]);}
        if(kind===1)for(let j=-1;j<=1;j++)k.add(G.cone(8),0xaaa08d,[j*.058,L,0],[0,0,j*-.4],[.018,.19,.018]);
        if(kind===2){k.add(G.torus(Math.PI*1.4,.16,24),0x929692,[0,L-.012,0],[0,0,-.6],[.11,.13,.07]);k.add(G.cone(8),0xa7a293,[.089,L+.063,0],[0,0,-1.2],[.017,.08,.017]);}
        if(kind===3){k.add(G.octa(),0xa09b90,[0,L-.025,0],0,[.07,.12,.06]);for(const side of [-1,1])k.add(G.rbox(2),0x535c65,[side*.071,L-.02,0],[0,0,-side*.3],[.015,.18,.03]);}
        if(kind===4)for(let j=0;j<4;j++){const a=j/4*TAU;k.add(G.cone(8),0xaca58e,[Math.sin(a)*.067,L-.025,Math.cos(a)*.067],[Math.cos(a)*.42,0,-Math.sin(a)*.42],[.018,.15,.018]);}
        const claws=1+Math.floor(q/5)%3;
        for(let j=0;j<claws;j++){const sd=j%2?1:-1,yy=L-.11-j*.045;k.seg([sd*.018,yy,0],[sd*(.075+j*.016),yy+.07,0],.012,0x8a8170,.006,8);}
        if(['ay','gokdegnek','mercan','ejderdegnek','kefirikiz'].includes(id)){k.add(G.torus(Math.PI*1.45,.10,24),0xa69d85,[.048,L+.018,-.01],[0,0,-.40],[.10,.15,.05]);}
        if(['mese','bulut','cicek','lavdegnek'].includes(id)){for(let j=0;j<3;j++)k.seg([0,L-.19-j*.047,0],[(-1)**j*.062,L-.12-j*.047,-.006],.010,0x8a938c,.004,8);}
        if(['kor','yildizdegnek','gezegen','magaraikiz'].includes(id)){k.add(G.rbox(2),0x989384,[0,L-.10,0],[0,0,.60],[.17,.028,.032]);for(const sd of [-1,1])k.add(G.cone(8),0xa29c89,[sd*.074,L-.061,0],[0,0,-sd*.25],[.012,.10,.014]);}
      }
    }));
    g.add(new THREE.Mesh(geo,vcM('curseIron',{roughness:.5,metalness:.55})));
    const tip=new THREE.Object3D();
    if(wand){const orb=new THREE.Mesh(G.octa(),mat('curseOrb:'+id,()=>glowMat(darkHue(id),1.5+r*.15)));orb.position.y=L;orb.scale.set(.045,.075+(q%3)*.015,.04);g.add(orb);tip.position.y=L;g.add(tip);}
    else {const blade=new THREE.Group();blade.name='fzBlade';blade.position.y=.13;
      const bg=geoC('curseBlade:'+id+':'+r,()=>kitGeo(k=>{
        const kind=id==='tahta'?1:q%5,w=.05+(q%7)*.008;
        k.add(G.rbox(2),0xa2a6a8,[0,L*.34,0],0,[w,L*.68,.016]);
        if(kind===0)k.add(G.cone(8),0xc1bbaa,[0,L*.79,0],0,[w*.7,L*.22,.018]);
        if(kind===1){k.add(G.rbox(2),0x969f9f,[w*.68,L*.61,0],[0,0,-.45],[w*.8,L*.24,.018]);k.add(G.cone(8),0xb3b3a5,[w*1.7,L*.62,0],[0,0,-1.4],[w*.7,L*.22,.018]);}
        if(kind===2)for(const side of [-1,1])k.add(G.cone(8),0xbcb5a2,[side*w*.46,L*.78,0],[0,0,-side*.16],[w*.32,L*.27,.016]);
        if(kind===3){k.add(G.cone(8),0xc1bbaa,[0,L*.78,0],0,[w*.75,L*.2,.018]);for(let j=0;j<4;j++)k.add(G.cone(8),0x9d9d93,[w*.6,L*(.20+j*.135),0],[0,0,-1.35],[.021,.075+(q%3)*.012,.013]);}
        if(kind===4){k.add(G.rbox(2),0x9a9c94,[0,L*.70,0],0,[w*1.4,L*.19,.022]);k.add(G.cone(8),0xc2bbaa,[0,L*.88,0],0,[w*.7,L*.2,.018]);}
        if(['yildiz','pamukseker','guneskilic'].includes(id)){
          // A broad crescent axe edge on one side and a narrow execution hook on the other.
          k.add(G.torus(Math.PI*.80,.23,24),0xa9afa9,[w*.17,L*.64,0],[0,0,-.37],[w*2.3,L*.23,.022]);
          k.add(G.cone(8),0xb8b4a8,[-w*.95,L*.51,0],[0,0,1.25],[.031,L*.24,.018]);
        }
        if(['kristal','buzkilic','uzay'].includes(id))for(const sd of [-1,1])k.add(G.octa(),0xb5b3aa,[sd*w*.55,L*.67,0],[0,0,-sd*.11],[w*.42,L*(id==='uzay'?.29:.22),.016]);
        if(['ates','lavkilic','lavikiz'].includes(id))for(let j=0;j<3;j++)k.add(G.cone(8),0xaba797,[-w*.66,L*(.29+j*.16),0],[0,0,1.0],[.02,L*.14,.016]);
        if(['demir','joleikiz','kuyruklu'].includes(id)){k.add(G.rbox(2),0x8b9498,[-w*.7,L*.39,0],[0,0,.35],[.023,L*.48,.021]);k.add(G.cone(8),0xbbb5a2,[w*.79,L*.81,0],[0,0,-.55],[.025,L*.22,.019]);}
        if(['dalga','gokkusagi','sovalyeikiz'].includes(id)){
          const P=[v3(-w*.8,L*.18,0),v3(-w*1.35,L*.40,0),v3(-w*.5,L*.61,0),v3(-w*1.10,L*.84,0)],U=P.map(()=>v3(0,0,1));
          k.add(sweep(P,U,t=>.016*(1-t*.5),t=>w*.38*(1-t*.5),8,0,(t,c)=>c.set(0xa2a8a0),null),0xa2a8a0);
        }
        if(id==='tahta'||id==='kalp'||id==='ejderkilic'||id==='sovalyeikiz'){
          // A real swept crescent silhouette, rather than a straight rectangle with a different colour.
          const P=[v3(0,L*.10,0),v3(w*.3,L*.32,0),v3(w*1.9,L*.60,0),v3(w*1.1,L*.83,0),v3(-w*.65,L*.97,0)],U=P.map(()=>v3(0,0,1));
          k.add(sweep(P,U,t=>.018*(1-t*.85),t=>w*.60*(1-t*.78),8,0,(t,c)=>c.set(0xb8b4a6),null),0xb8b4a6);
        }
        if(r>=2)for(let j=0;j<2+r;j++)k.add(G.rbox(1),0xb5a06b,[-w*.20,L*(.12+j*.11),.012],[0,0,.55],[w*.35,.008,.004]);
        const n=2+q%4;for(let j=0;j<n;j++)k.add(G.rbox(1),0x4a4950,[(j%2?1:-1)*w*.25,L*(.17+j*.105),.009],[0,0,(j%2?1:-1)*.6],[w*.3,.008,.005]);
      }));
      blade.add(new THREE.Mesh(bg,vcM('curseBladeMat',{roughness:.38,metalness:.7})));
      const rune=new THREE.Mesh(G.box(),mat('curseRune:'+id,()=>glowMat(darkHue(id),.65+r*.18)));rune.position.set(0,L*.34,.013);rune.scale.set(.007,L*.5,.004);blade.add(rune);tip.position.y=L*.88;blade.add(tip);g.add(blade);g.fzBlade=blade;
    }
    g.fzTip=tip;return g;
  }
  const HUNTER_HELMS={migfer:'iron',sihirbaz:'hood',kovboy:'brim',korsan:'beak',tac:'crown',joletac:'broken',kostebekfener:'cage',bulutbere:'skull',yaprakbaslik:'thorn',kedikulak:'horn',dondurma:'spine',yunikorn:'crest',astronot:'void',magarasihir:'shard',sovalyemigfer:'antler'};
  function cursedHat(id,r){
    const q=darkKey(id),g=new THREE.Group(),kind=HUNTER_HELMS[id]||'iron';
    const geo=geoC('curseHelm:'+id+':'+r,()=>kitGeo(k=>{
      const C=kind==='skull'?0x9e9681:kind==='hood'||kind==='thorn'?0x35323b:0x55595d;
      if(!['crown','broken','shard'].includes(kind)){
        k.add(G.sphere(28),C,[0,.065,-.025],0,[.286,.285,.292]);
        k.add(G.rbox(2),0x181b24,[0,.002,.271],[-.08,0,0],[.36,.10,.035]);
        for(const side of [-1,1])k.add(G.rbox(2),C,[side*.20,-.070,.15],[0,side*.25,side*.16],[.071,.17,.095]);
      }
      if(kind==='iron'){k.add(G.rbox(2),0x8f9188,[0,-.052,.296],0,[.032,.18,.025]);for(const side of [-1,1])k.add(G.torus(Math.PI,.14,20),0x767469,[side*.19,.04,.20],[0,side*.3,0],[.09,.12,.033]);}
      if(kind==='hood'||kind==='beak'){k.add(G.cone(20),C,[0,.25,-.07],[.14,0,0],[.25,.38,.24]);if(kind==='beak')k.add(G.cone(12),0xa19783,[0,-.078,.33],[Math.PI*.70,0,0],[.06,.21,.06]);else for(const side of [-1,1])k.seg([side*.23,.06,.17],[side*.15,-.15,.25],.025,0x82765f,.016,8);}
      if(kind==='brim'){k.add(G.cyl(1,1,40),0x393839,[0,.16,-.02],0,[.38,.026,.32]);k.add(G.cyl(.75,1,28),0x575149,[0,.24,-.04],0,[.24,.17,.22]);}
      if(['crown','broken','shard'].includes(kind)){
        k.add(G.torus(TAU,.10,36),0x8b785c,[0,.19,0],[Math.PI/2,0,0],[.29,.29,.23]);
        const n=kind==='shard'?5:7;for(let j=0;j<n;j++){const a=j/n*TAU,h=kind==='broken'?.12+(j%3)*.09:kind==='shard'?.24+(j%2)*.09:.19;
          k.add(kind==='shard'?G.octa():G.cone(8),kind==='shard'?0x9486a2:0x9b8666,[Math.sin(a)*.27,.22+h*.35,Math.cos(a)*.22],[Math.cos(a)*.2,0,-Math.sin(a)*.2],[.038,h,.032]);}
      }
      if(kind==='cage'){k.add(G.rbox(2),0x6d6659,[0,.19,.265],0,[.16,.14,.07]);for(let j=-1;j<=1;j++)k.add(G.rbox(1),0x25272c,[j*.040,.19,.305],0,[.012,.11,.022]);k.add(G.octa(),0xba7042,[0,.19,.29],0,[.052,.055,.025]);}
      if(kind==='skull'){for(const side of [-1,1]){k.add(G.sphere(14),0x23232a,[side*.093,-.014,.289],0,[.061,.067,.025]);k.add(G.rbox(2),0xc3bca1,[side*.12,-.11,.27],[0,0,-side*.2],[.048,.11,.044]);}for(let j=-1;j<=1;j++)k.add(G.rbox(1),0xb0a68c,[j*.04,-.16,.26],0,[.026,.055,.03]);}
      if(kind==='thorn'||kind==='antler'){for(const side of [-1,1]){k.seg([side*.21,.23,0],[side*.33,.44,-.08],.038,0x8c8069,.016,10);for(let j=0;j<3;j++)k.seg([side*(.23+j*.035),.29+j*.065,-.02-j*.02],[side*(.35+j*.035),.33+j*.085,-.04],.018,0xaaa087,.005,8);}}
      if(kind==='horn'){for(const side of [-1,1]){k.seg([side*.23,.24,0],[side*.35,.36,-.10],.055,0x9e947f,.033,10);k.seg([side*.35,.36,-.10],[side*.32,.53,-.19],.033,0xb9aa8d,.008,10);}}
      if(kind==='spine')for(let j=-1;j<=1;j++)k.add(G.cone(10),0xa79e87,[j*.09,.38,-.035],[0,0,-j*.15],[.037,.19+(j===0?.13:0),.034]);
      if(kind==='crest'){k.add(G.cone(12),0xb0a58b,[0,.36,.19],[.4,0,0],[.04,.36,.038]);for(let j=0;j<4;j++)k.add(G.rbox(2),0x736c64,[0,.33-j*.03,.05-j*.10],[.35,0,0],[.031,.13,.12]);}
      if(kind==='void'){k.add(G.sphere(24),0x242832,[0,.02,.05],0,[.275,.247,.269]);k.add(G.rbox(1),0x9c9380,[0,-.005,.31],0,[.28,.018,.014]);for(const side of [-1,1])k.add(G.cyl(1,1,20),0x716c66,[side*.283,0,0],[0,0,Math.PI/2],[.063,.027,.063]);}
      if(r>=1)for(const side of [-1,1])k.add(G.sphere(10),0xaaa087,[side*.21,.035,.218],0,[.011,.015,.01]);
      if(r>=2)k.add(G.octa(),0x9f4f47,[0,.25,.24],0,[.032,.046,.022]);
      if(r===3)for(const side of [-1,1])k.add(G.cone(8),0xa18b63,[side*.13,.305,-.08],[0,0,-side*.25],[.018,.14,.017]);
    }));g.add(new THREE.Mesh(geo,vcM('curseHelmMat',{roughness:.48,metalness:.65})));return g;
  }

  function buildWand(id, r) {
    return cursedWeapon(id,r);
    const d = WAND[id], g = new THREE.Group();
    const wood = geoC('wand:' + id, () => kitGeo(k => {
      kcyl(k, -0.085, 0.055, 0.038, 0.032, d.wood, 12);
      kcyl(k, 0.055, d.L, 0.029, 0.013, d.wood, 12);
      k.add(G.sphere(12), d.wood, [0, -0.081, 0], 0, [0.038, 0.022, 0.038]);
      for (let i = 0; i < 4; i++) kcyl(k, -0.065 + i * 0.027, -0.06 + i * 0.027, 0.039, 0.039, d.band, 12);
      if (d.stripe) for (const a0 of [0, Math.PI]) {   // (Round 6) candy stick: two ribbons wound round the stick
        const P = [], U = [], rad = y => lerp(0.029, 0.013, (y - 0.055) / (d.L - 0.055)) + 0.0006;
        for (let i = 0; i <= 64; i++) { const y = 0.058 + i / 64 * (d.L - 0.066), a = a0 + i / 64 * 4.5 * TAU, rr = rad(y); P.push(v3(Math.sin(a) * rr, y, Math.cos(a) * rr)); U.push(v3(Math.sin(a), 0, Math.cos(a))); }
        k.add(sweep(P, U, t => lerp(0.011, 0.006, t), () => 0.0014, 6, 0.2, () => {}, null), d.stripe);
      } else for (let i = 0; i < 3; i++) k.seg([0.012, 0.1 + i * 0.1, 0.008], [-0.009, 0.14 + i * 0.1, 0.01], 0.003, d.band, 0.002, 6);
    }));
    g.add(new THREE.Mesh(wood, vcM('wandWood', { roughness: 0.65, metalness: 0.05 })));
    if (d.boss) g.add(new THREE.Mesh(bossGrip(id), glowVC('bossGrip', 0.25, { roughness: 0.38, metalness: 0.45 })));
    const light = new THREE.Mesh(G.sphere(d.tipS ? 20 : 12), mat('wandTip:' + id, () => glowMat(d.col, d.tipI || 1.8))), tp = d.tipP || [0, d.L, 0];
    light.position.set(...tp); light.userData.noShadow = true; g.add(light);
    if (d.tipS) light.scale.set(d.tipS[0] + r * 0.002, d.tipS[1] + r * 0.002, d.tipS[2]); else light.scale.set(0.031 + r * 0.002, 0.063, 0.031 + r * 0.002);
    g.add(new THREE.Mesh(weaponOrnament(d.motif || 'vine', d.band, d.col, d.L - 0.045), glowVC('wandInlay', 0.3, { roughness: 0.45, metalness: 0.2 })));
    const tip = new THREE.Object3D(); tip.position.set(...tp); g.add(tip); g.fzTip = tip;
    return g;
  }
  // (Round 6) ornament finishes for the new hilts (same shader program as saberInlay): [key, glow, roughness, metalness]
  const INLAY = { cotton: ['saberFluff', 0.3, 0.85, 0], heart: ['saberGem', 0.4, 0.22, 0.12], rocket: ['saberRocket', 0.16, 0.38, 0.25], star: ['saberStar', 0.45, 0.3, 0.4] };
  function buildSword(id, r) {
    return cursedWeapon(id,r);   // (name kept: "sword" = the weapon slot's model)
    if (WAND[id]) return buildWand(id, r);
    const d = saberDef(id), L = d.L, g = new THREE.Group(), inl = INLAY[d.motif];
    if (d.motif) g.add(new THREE.Mesh(weaponOrnament(d.motif, '#' + d.metal.toString(16).padStart(6, '0'), d.col, 0.1),
      inl ? glowVC(inl[0], inl[1], { roughness: inl[2], metalness: inl[3] }) : glowVC('saberInlay', 0.2, { roughness: 0.35, metalness: 0.6 })));
    if (id === 'lavkilic' || id === 'ejderkilic' || d.bossGrip) g.add(new THREE.Mesh(bossGrip(id), glowVC('bossGrip', 0.25, { roughness: 0.38, metalness: 0.45 })));
    g.add(new THREE.Mesh(geoC('sbHilt:' + id, () => hiltGeo(id)), mat('sbMetal|' + (r >= 2 ? r : 0), () => {
      const t = tex('metal'), m = vcMat({ metalness: 1, roughness: 0.26, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.35, 0.35), envMapIntensity: 1.0 });
      return r >= 2 ? rimify(m, rarCol(r), r === 3 ? 0.55 : 0.4, 2.4) : rimify(m, 0xffffff, 0.14);
    })));
    g.add(new THREE.Mesh(geoC('sbGrip:' + id, () => gripGeo(id)), vcM('sbGrip', { roughness: 0.62, metalness: 0.1 })));
    const rk = r >= 3 ? 3 : r >= 2 ? 2 : 0;
    if (rk || d.guard) g.add(new THREE.Mesh(geoC('sbGold:' + (d.guard ? 'guard' : '') + rk, () => accentGeo(r, d.guard)), goldM(r)));
    const btn = new THREE.Mesh(G.sphere(12), mat('sbBtn:' + d.btn, () => glowMat(d.btn, 2.6)));
    btn.scale.setScalar(0.0052); btn.position.set(0, 0.096, 0.0214); btn.userData.noShadow = true; g.add(btn);
    if (d.guard) { btn.scale.set(0.0105, 0.0105, 0.005); btn.position.set(0, GUARD_Y, 0.0152); }
    if (d.porthole) { btn.scale.set(0.0102, 0.0102, 0.0042); btn.position.set(0, 0.089, 0.0166); }   // the rocket's round window
    if (d.btnPos) { btn.scale.set(0.0085, 0.0085, 0.004); btn.position.set(...d.btnPos); }
    // blade (ignited): core + glow shell + halo; the tip marker rides at the end of the blade
    const blade = new THREE.Group(), P = bladeParts(L);
    blade.name = 'fzBlade'; blade.position.y = HILT_TOP - 0.004;
    const part = (geo, p) => { const m = new THREE.Mesh(geo, saberMat(id, p, r)); m.userData.noShadow = true; m.userData.noXray = true; blade.add(m); return m; };
    part(P.core, 'core'); const shell = part(P.shell, 'shell'), halo = part(P.halo, 'halo');
    g.add(blade);
    const tip = new THREE.Object3D(); tip.position.y = L; blade.add(tip);
    g.fzTip = tip; g.fzBlade = blade; g.fzShell = shell; g.fzHalo = halo;
    return g;
  }

  // ── Hats (origin = head centre; the hair reaches ~0.31 m above it) ──
  function plume(pts, w, colA, colB, n, spread, seed) {
    const R = mulberry32(seed), geos = [];
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * spread, P = curvePts(pts.map((p, j) => v3(p[0] + o * (0.3 + j * 0.5), p[1] + (R() - 0.5) * 0.02 * j, p[2] + Math.abs(o) * j * 0.2)), 14);
      const U = P.map(() => v3(0, 1, 0.2).normalize());
      geos.push(sweep(P, U, t => w * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)) * (1 - 0.3 * t), t => w * 0.25 * (1 - t), 8, 0.6,
        (t, c) => c.copy(mixCol(colA, colB, sstep(0.55, 1, t))), null));
    }
    return concat(geos);
  }
  function brimRing(r0, r1, seg, fold) {   // flat ring (with thickness) bent by fold(angle, radialFrac) → [dy, dr]
    const prof = [[r0, -0.006], [r1 - 0.008, -0.01], [r1, -0.002], [r1 - 0.004, 0.006], [r0, 0.008]];
    const pts = []; for (const p of prof) pts.push(V2(p[0], p[1]));
    const g = new THREE.LatheGeometry(pts, seg, Math.PI, TAU), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), r = Math.hypot(x, z), a = Math.atan2(x, z), f = clamp((r - r0) / (r1 - r0), 0, 1), d = fold(a, f);
      const k = (r + d[1]) / (r || 1);
      P.setXYZ(i, x * k, y + d[0], z * k);
    }
    g.computeVertexNormals();
    return g;
  }
  const knightSteelM = r => mat('knightSteel|' + (r >= 2 ? r : 0), () => {
    const t = tex('metal'), m = vcMat({ metalness: 1, roughness: 0.34, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.3, 0.3), envMapIntensity: 0.95, side: THREE.DoubleSide });
    return r >= 2 ? rimify(m, rarCol(r), r === 3 ? 0.6 : 0.42, 2.3) : rimify(m, 0xffffff, 0.14);
  });
  function buildHat(id, r) {
    return cursedHat(id,r);
    const g = new THREE.Group(), h = new THREE.Group(); g.add(h);
    const add = (geo, m, pos, rot) => { const o = new THREE.Mesh(geo, m); if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); h.add(o); return o; };
    if (id === 'bulutbere' || id === 'yaprakbaslik' || id === 'magarasihir') {
      h.position.set(0, 0.19, 0);
      const cloud = id === 'bulutbere', crystal = id === 'magarasihir', col = cloud ? '#c1e9ff' : crystal ? '#7764c7' : '#67aa68';
      add(geoC('newHat:' + id, () => kitGeo(k => {
        k.add(G.sphere(20), col, [0, 0.02, -0.01], 0, [0.29, 0.12, 0.29]);
        k.add(G.torus(TAU, 0.1, 40), crystal ? '#e5c46c' : '#fff2c4', [0, -0.015, 0], [Math.PI / 2, 0, 0], 0.28);
        if (cloud) for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; k.add(G.sphere(12), '#eefbff', [Math.sin(a) * 0.23, 0.07, Math.cos(a) * 0.23], 0, [0.1, 0.08, 0.09]); }
        else if (crystal) for (let i = -2; i <= 2; i++) k.add(G.cone(5), '#a0edff', [i * 0.088, 0.1 + (2 - Math.abs(i)) * 0.04, 0.21], [0, 0, -i * 0.2], [0.045, 0.19, 0.045]);
        else for (const side of [-1, 1]) for (let i = 0; i < 3; i++) k.add(G.sphere(12), i & 1 ? '#a5db6c' : '#3b8854', [side * (0.15 + i * 0.03), 0.09 + i * 0.05, 0.02], [0, 0, side * -0.6], [0.05, 0.14, 0.024]);
      })), glowVC('newHat', 0.13, { roughness: 0.65 }));
    } else if (id === 'joletac') {
      h.position.set(0, 0.24, 0); h.rotation.z = -0.08;
      add(geoC('jellyCrown', () => kitGeo(k => {
        k.add(G.torus(TAU, 0.18, 40), '#73d84e', [0, 0.015, 0], [Math.PI / 2, 0, 0], 0.225);
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; k.add(G.sphere(16), '#8aef67', [Math.sin(a) * 0.2, 0.095, Math.cos(a) * 0.2], 0, [0.057, 0.115, 0.057]); }
      })), glowVC('jellyCrown', 0.24, { roughness: 0.12, metalness: 0.12 }));
      add(geoC('jellyGem', () => starGeo(0.058, 0.018)), goldM(r), [0, 0.08, 0.239]);
    } else if (id === 'kostebekfener') {
      h.position.set(0, 0.1, -0.02);
      add(geoC('minerDome', () => { const o = new THREE.SphereGeometry(1, 32, 16, 0, TAU, 0, Math.PI * 0.53); o.scale(0.33, 0.28, 0.34); return o; }), metalMat('minerCopper', 0xc47e45, 0.5, r));
      add(geoC('minerRim', () => kitGeo(k => {
        k.add(G.torus(TAU, 0.09, 40), '#5a4031', [0, -0.025, 0], [Math.PI / 2, 0, 0], [0.345, 0.355, 0.3]);
        k.add(G.cyl(1, 1, 20), '#564739', [0, 0.12, 0.315], [Math.PI / 2, 0, 0], [0.077, 0.065, 0.077]);
        for (const side of [-1, 1]) k.add(G.sphere(12), '#9cc5df', [side * 0.19, 0.2, 0.1], 0, [0.035, 0.07, 0.035]);
      })), vcM('minerParts', { roughness: 0.4, metalness: 0.5 }));
      const lamp = add(G.sphere(20), mat('minerLamp', () => glowMat('#fff3ac', 1.6)), [0, 0.12, 0.354]); lamp.scale.set(0.059, 0.059, 0.017);
    } else if (id === 'migfer') {
      h.position.set(0, 0.075, -0.03); h.rotation.x = -0.3;
      add(geoC('helm', () => { const s = new THREE.SphereGeometry(1, 44, 22, 0, TAU, 0, Math.PI * 0.56); s.scale(0.335, 0.31, 0.345); return s; }), steelM(r));
      add(geoC('helmGold', () => kitGeo(k => {
        k.add(G.torus(TAU, 0.07, 56), 0xffffff, [0, -0.058, 0], [Math.PI / 2, 0, 0], [0.332, 0.342, 0.3]);
        k.add(G.torus(Math.PI, 0.09, 32), 0xffffff, [0, 0, 0], [0, Math.PI / 2, 0], [0.33, 0.325, 0.33]);
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; k.add(G.sphere(8), 0xffffff, [Math.sin(a) * 0.335, -0.035, Math.cos(a) * 0.345], 0, 0.012); }
        for (const s of [-1, 1]) k.add(G.sphere(20), 0xffffff, [s * 0.305, -0.12, 0.05], [0.22, 0, s * 0.15], [0.03, 0.1, 0.075]);
      })), goldM(0));
      add(geoC('helmPlume', () => plume([[0, 0.3, -0.02], [0, 0.42, -0.1], [0, 0.44, -0.26], [0, 0.34, -0.4]], 0.045, '#ff4a4a', '#ffd0d0', 5, 0.03, 11)),
        vcM('plume', { roughness: 0.75 }));
    } else if (id === 'sovalyemigfer') {   // (Round 5) the Huysuz Şövalye's helmet: visor up, so Feza's face shows
      h.position.set(0, 0.07, -0.03); h.rotation.x = -0.26;
      const SV = '#dce3ee', GD = '#ffc94a', DK = '#39405a', lift = 0.98;
      add(geoC('knightHelm', () => kitGeo(k => {
        // dome: open over the face, reaching down over the ears and the nape like a real knight's helmet; a gold rolled rim
        const HR = [0.345, 0.335, 0.355], edge = a => Math.PI * (0.57 + 0.13 * sstep(0.95, 1.5, a) - 0.06 * sstep(2.1, 2.9, a));
        const hp = (ph, t, d, o) => o.set(Math.sin(ph) * Math.sin(t) * (HR[0] + d), Math.cos(t) * (HR[1] + d), Math.cos(ph) * Math.sin(t) * (HR[2] + d));
        const tube = (pts, w, c) => k.add(sweep(pts, pts.map(p => p.clone().normalize()), () => w, () => w, 6, 1, () => {}, null), c);
        k.add(paramGeo((u, v, o) => { const ph = u * TAU - Math.PI; return hp(ph, v * edge(Math.abs(ph)), 0, o); }, 56, 20, v3(0, 0, 0), true), SV);
        const rimP = []; for (let i = 0; i <= 72; i++) { const ph = i / 72 * TAU - Math.PI; rimP.push(hp(ph, edge(Math.abs(ph)) - 0.012, 0.004, v3())); }
        tube(rimP, 0.019, GD);
        for (let i = 0; i < 16; i++) { const ph = (i + 0.5) / 16 * TAU - Math.PI; if (Math.abs(ph) > 0.6) { const p = hp(ph, edge(Math.abs(ph)) - 0.075, 0.004, v3()); k.add(G.sphere(6), GD, [p.x, p.y, p.z], 0, 0.011); } }
        const combP = []; for (let i = 0; i <= 24; i++) combP.push(hp(Math.PI, lerp(0.62 * Math.PI, 0.1, i / 24), 0.003, v3()));
        tube(combP, 0.021, GD);                                                                                     // comb: back → visor
        for (const s of [-1, 1]) {   // visor hinges on the temples
          k.add(G.cyl(1, 1, 20), GD, [s * 0.36, 0.0, 0.0], [0, 0, Math.PI / 2], [0.032, 0.022, 0.032]);
          k.add(G.sphere(12), SV, [s * 0.373, 0.0, 0.0], 0, [0.01, 0.017, 0.017]);
        }
        // the raised visor: a lens-shaped plate from hinge to hinge (upper + lower part, a dark eye slit between, rolled
        // edges) just outside the dome, turned up about the hinge axis (x) so it rests on the forehead
        const VS = [0.366, 0.355, 0.376], th = (U, v) => Math.PI * lerp(0.5 - 0.04 * (1 - U * U), 0.5 + 0.25 * Math.pow(1 - U * U, 0.55), v);
        const vp = (U, v, d, o) => { const ph = U * Math.PI / 2, t = th(U, v); return o.set(Math.sin(ph) * Math.sin(t) * (VS[0] + d), Math.cos(t) * (VS[1] + d), Math.cos(ph) * Math.sin(t) * (VS[2] + d)); };
        const plate = (v0, v1, d, c) => k.add(paramGeo((u, v, o) => vp(u * 2 - 1, lerp(v0, v1, v), d, o), 40, 4, v3(0, 0, 0), false), c);
        const rim = (v, d, w, c) => { const P = []; for (let i = 0; i <= 28; i++) P.push(vp(i / 14 - 1, v, d, v3())); tube(P, w, c); };
        k.push([0, 0, 0], [-lift, 0, 0]);
        plate(0, 0.4, 0, SV); plate(0.56, 1, 0, SV); plate(0.36, 0.6, -0.006, DK);
        rim(1, 0.002, 0.0105, GD); rim(0, 0.001, 0.007, SV); rim(0.4, 0.001, 0.005, SV); rim(0.56, 0.001, 0.005, SV);
        { const p = vp(0, 0.78, 0.004, v3()); k.add(G.sphere(16), GD, [p.x, p.y, p.z], [-0.62, 0, 0], [0.026, 0.026, 0.012]); }   // a gold stud under the slit
        k.pop();
        k.add(G.cyl(0.8, 1, 20), GD, [0, 0.335, -0.075], [-0.25, 0, 0], [0.036, 0.06, 0.036]);                  // plume holder
      })), knightSteelM(r));
      // tall rainbow plume: six fluffy, round-tipped feathers rising out of the holder, fanning out and curling back
      add(geoC('knightPlume', () => {
        const RB = ['#ff4f6a', '#ff9a3c', '#ffd84a', '#5fd86a', '#48b6ff', '#9a6bff'], geos = [];
        RB.forEach((c, i) => {
          const f = (i - 2.5) / 2.5, dz = -(i & 1) * 0.016, lo = 0.08 * f * f, a = mixCol(c, '#ffffff', 0.02), b = mixCol(c, '#ffffff', 0.32);
          const P = curvePts([v3(f * 0.01, 0.36, -0.08 + dz), v3(f * 0.06, 0.57, -0.07 + dz), v3(f * 0.14, 0.77 - lo, -0.1 + dz), v3(f * 0.2, 0.86 - lo * 1.4, -0.2 + dz), v3(f * 0.23, 0.82 - lo * 1.6, -0.32 + dz)], 28);
          const U = P.map(() => v3(f * 0.3, 0.3, 1).normalize());
          geos.push(sweep(P, U, t => 0.062 * (0.5 + 0.5 * sstep(0, 0.45, t)) * Math.sqrt(Math.max(0, 1 - sq(Math.max(0, t - 0.72) / 0.28))) * (1 + 0.07 * Math.sin(t * 26 + i)), t => 0.016 * (1 - 0.6 * t), 6, 0.6,
            (t, cc) => cc.copy(a).lerp(b, sstep(0.45, 1, t)), null));
        });
        return concat(geos);
      }), glowVC('knightPlume', 0.1, { roughness: 0.7 }));
    } else if (id === 'sihirbaz') {
      h.position.set(0, 0.19, 0); h.rotation.set(-0.16, 0, 0.1);
      const felt = feltMat('wiz', 0x3b5fe0, r);
      const P = curvePts([v3(0, 0.01, 0), v3(0, 0.22, -0.01), v3(0, 0.4, -0.05), v3(0.02, 0.52, -0.15), v3(0.04, 0.54, -0.26)], 24);
      const rad = t => 0.215 * (1 - t * 0.93);
      add(geoC('wizBrim', () => brimRing(0.2, 0.44, 64, (a, f) => [-0.035 * f * f + 0.012 * Math.sin(a * 5) * f, 0])), felt);
      add(geoC('wizCone', () => {
        const geo = sweep(P, P.map(() => v3(0, 0, 1)), rad, rad, 28, 1, (t, c) => c.setRGB(1, 1, 1), null);
        geo.deleteAttribute('aFlex'); geo.deleteAttribute('color');
        return geo;
      }), felt);
      add(geoC('wizBand', () => kitGeo(k => k.add(G.torus(TAU, 0.11, 48), 0xffffff, [0, 0.035, 0], [Math.PI / 2, 0, 0], [0.212, 0.212, 0.2]))), goldM(r));
      add(geoC('wizStars', () => {
        const k = new Kit(), sg = starGeo(1, 0.4), q = new THREE.Quaternion();
        for (const [t, a, s] of [[0.2, 0.5, 0.034], [0.34, -0.7, 0.03], [0.5, 0.15, 0.024], [0.13, -0.25, 0.022]]) {
          const i = Math.round(t * 24), n = v3(Math.sin(a), 0.25, Math.cos(a)).normalize(), rr = rad(i / 24) + 0.004;
          k.add(sg, 0xffffff, [P[i].x + Math.sin(a) * rr, P[i].y, P[i].z + Math.cos(a) * rr], q.clone().setFromUnitVectors(v3(0, 0, 1), n), s);
        }
        for (const [a, rr, s] of [[0.9, 0.33, 0.03], [-0.5, 0.36, 0.026], [2.6, 0.32, 0.028]]) k.add(sg, 0xffffff, [Math.sin(a) * rr, 0.004, Math.cos(a) * rr], [-Math.PI / 2, 0, a], s);
        // crescent moon
        const moon = new THREE.Shape(); moon.absarc(0, 0, 1, 0.5, TAU - 0.5, false); moon.absarc(0.45, 0, 0.8, TAU - 0.9, 0.9, true);
        const mg = new THREE.ExtrudeGeometry(moon, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 2 });
        mg.deleteAttribute('uv'); mg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(mg.attributes.position.count * 2), 2));
        const i = 7, a = 1.9, rr = rad(i / 24) + 0.004;
        k.add(mg, 0xffffff, [P[i].x + Math.sin(a) * rr, P[i].y, P[i].z + Math.cos(a) * rr], q.clone().setFromUnitVectors(v3(0, 0, 1), v3(Math.sin(a), 0.2, Math.cos(a)).normalize()), 0.04);
        return k.build();
      }), mat('wizStar|' + r, () => stdMat({ color: 0xffe070, emissive: 0xffc830, emissiveIntensity: 0.55 + 0.35 * r, roughness: 0.3 })));
    } else if (id === 'kovboy') {
      h.position.set(0, 0.2, -0.01); h.rotation.x = -0.18;
      const felt = feltMat('cow', 0xb0743d, r);
      add(geoC('cowCrown', () => {
        const geo = lathe([[0.205, 0], [0.206, 0.05], [0.198, 0.15], [0.182, 0.205], [0.13, 0.228], [0, 0.222]], 40, 0, 0, 1, 1.08);
        const P = geo.attributes.position;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i), top = sstep(0.12, 0.228, y);
          P.setY(i, y - 0.03 * Math.exp(-sq(x / 0.075)) * top * sstep(-0.25, 0.0, z));
          if (z > 0.1) P.setX(i, x * (1 - 0.12 * top));
        }
        geo.computeVertexNormals();
        return geo;
      }), felt);
      add(geoC('cowBrim', () => brimRing(0.195, 0.43, 72, (a, f) => { const sx = Math.abs(Math.sin(a)); return [0.15 * Math.pow(sx, 2.2) * f * f - 0.03 * sq(Math.cos(a)) * f, -0.07 * sx * sx * f * f]; })), felt);
      add(geoC('cowBand', () => kitGeo(k => k.add(G.cyl(1, 1, 40, true), 0x4a2a1a, [0, 0.03, 0], 0, [0.208, 0.036, 0.224]))), vcM('band', { roughness: 0.7, side: THREE.DoubleSide }));
      add(geoC('sheriff', () => starGeo(0.032, 0.008)), goldM(r), [0, 0.03, 0.226]);
    } else if (id === 'korsan') {
      h.position.set(0, 0.2, -0.01); h.rotation.x = -0.12;
      const felt = feltMat('pir', 0x2a2638, r);
      const corner = a => { let m = 0; for (const c of [0, TAU / 3, -TAU / 3]) m = Math.max(m, Math.exp(-sq(wrapPI(a - c) / 0.42))); return m; };
      const fold = (a, f) => { const up = (1 - corner(a)) * sstep(0.1, 1, f); return [0.17 * up * f + 0.01 * f, -0.13 * up * f]; };
      add(geoC('pirCrown', () => lathe([[0.205, 0], [0.2, 0.08], [0.16, 0.14], [0, 0.155]], 36, 0, 0, 1, 1.05)), felt);
      add(geoC('pirBrim', () => brimRing(0.195, 0.43, 90, fold)), felt);
      add(geoC('pirTrim', () => {
        const P = [], U = [];
        for (let i = 0; i <= 96; i++) { const a = -Math.PI + i / 96 * TAU, d = fold(a, 1), rr = 0.43 + d[1]; P.push(v3(Math.sin(a) * rr, d[0] + 0.004, Math.cos(a) * rr)); U.push(v3(0, 1, 0)); }
        const geo = sweep(P, U, () => 0.009, () => 0.009, 8, 1, (t, c) => c.setRGB(1, 1, 1), null); geo.deleteAttribute('aFlex'); geo.deleteAttribute('color');
        return geo;
      }), goldM(r));
      add(geoC('pirCoin', () => kitGeo(k => k.add(G.cyl(1, 1, 24), 0xffffff, [0, 0, 0], [Math.PI / 2, 0, 0], [0.036, 0.008, 0.036]))), goldM(r), [0, 0.075, 0.212], [-0.1, 0, 0]);
      add(geoC('pirStar', () => starGeo(0.026, 0.006)), mat('pirStarW', () => stdMat({ color: 0xfff6e0, roughness: 0.4 })), [0, 0.075, 0.222], [-0.1, 0, 0]);
      add(geoC('pirFeather', () => plume([[0.13, 0.12, 0.03], [0.22, 0.24, -0.05], [0.26, 0.3, -0.19], [0.22, 0.26, -0.35]], 0.05, '#ff5a6a', '#ffffff', 2, 0.03, 5)),
        vcM('plume', { roughness: 0.75 }));
    } else if (id === 'kedikulak') {   // (Round 6) pink knit beanie pulled down to the forehead, two cat ears, a small pompom
      h.position.set(0, 0.085, -0.02); h.rotation.x = -0.2;
      const DR = [0.33, 0.3, 0.34], EAR = sd => [[sd * 0.175, 0.27, 0.03], [0.05, 0, sd * -0.45]];
      add(geoC('kittyDome', () => {
        const g = new THREE.SphereGeometry(1, 64, 24, 0, TAU, 0, Math.PI * 0.55), P = g.attributes.position;
        for (let i = 0; i < P.count; i++) {   // soft knitted ribs running up the dome
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = 1 + 0.016 * Math.pow(Math.abs(Math.cos(Math.atan2(x, z) * 16)), 0.6) * sstep(1, 0.3, y);
          P.setXYZ(i, x * DR[0] * k, y * DR[1], z * DR[2] * k);
        }
        g.computeVertexNormals();
        return kitGeo(k => {
          k.add(g, 0xffffff);
          for (const sd of [-1, 1]) { const [p, rt] = EAR(sd); k.add(G.cone(20), 0xffffff, p, rt, [0.1, 0.19, 0.054]); }
        });
      }), feltMat('kitty', 0xff93c4, r));
      add(geoC('kittyCuff', () => {
        const g = new THREE.TorusGeometry(1, 0.062, 10, 128), P = g.attributes.position, c = v3(), q = v3();
        for (let i = 0; i < P.count; i++) {   // ribbed cuff
          q.fromBufferAttribute(P, i); const a = Math.atan2(q.y, q.x); c.set(Math.cos(a), Math.sin(a), 0);
          q.sub(c).multiplyScalar(1 + 0.2 * Math.pow(Math.abs(Math.cos(a * 36)), 0.5)).add(c); P.setXYZ(i, q.x, q.y, q.z);
        }
        g.computeVertexNormals();
        return kitGeo(k => k.add(g, 0xffffff, [0, -0.03, 0], [Math.PI / 2, 0, 0], [0.334, 0.344, 0.55]));
      }), feltMat('kittyCuff', 0xffc3de, r));
      add(geoC('kittyBits', () => kitGeo(k => {
        for (const sd of [-1, 1]) { const [p, rt] = EAR(sd); k.push(p, rt); k.add(G.cone(20), '#ffe3f0', [0, -0.012, 0.036], [0.1, 0, 0], [0.058, 0.125, 0.012]); k.pop(); }   // inner ears
        const R = mulberry32(5);
        for (let i = 0; i < 12; i++) { const a = i * 2.4, b = R() * 1.3, s = 0.02 + R() * 0.009; k.add(G.sphere(10), i & 1 ? '#fff4fa' : '#ffd6ea', [Math.sin(a) * Math.sin(b) * 0.026, 0.3 + Math.cos(b) * 0.024, Math.cos(a) * Math.sin(b) * 0.026 - 0.06], 0, s); }
      })), glowVC('kittyBits', 0.12, { roughness: 0.8 }));
    } else if (id === 'dondurma') {   // (Round 6) triple scoop: strawberry, vanilla, mint, a cherry and sprinkles on a waffle-cone band
      h.position.set(0, 0.215, -0.012); h.rotation.set(-0.12, 0, 0.07);
      add(geoC('waffle', () => kitGeo(k => {
        k.add(lathe([[0.196, -0.012], [0.206, -0.014], [0.226, 0.058], [0.222, 0.066], [0.2, 0.066], [0.186, -0.004]], 56, 0, 0, 1, 1), '#e4a95e');
        for (let i = 0; i < 18; i++) for (const sd of [-1, 1]) {   // criss-cross waffle ridges
          const a0 = i / 18 * TAU, a1 = a0 + sd * 0.42, r0 = 0.208, r1 = 0.229;
          k.seg([Math.sin(a0) * r0, -0.006, Math.cos(a0) * r0], [Math.sin(a1) * r1, 0.058, Math.cos(a1) * r1], 0.0042, '#b8733a', 0.0042, 5);
        }
        k.add(G.torus(TAU, 0.07, 56), '#c98a4a', [0, 0.064, 0], [Math.PI / 2, 0, 0], 0.216);
      })), vcM('waffle', { roughness: 0.78 }));
      add(geoC('scoops', () => kitGeo(k => {
        const S = [['#ff9fc2', [0, 0.1, 0], [0.24, 0.12, 0.24]], ['#ffe8b6', [-0.012, 0.2, -0.008], [0.17, 0.1, 0.17]], ['#9fe6c4', [0.012, 0.283, 0], [0.12, 0.078, 0.12]]];
        S.forEach(([c, p, sc], j) => {
          k.add(G.sphere(40), c, p, 0, sc);
          const n = [9, 7, 6][j];   // drippy scalloped rim
          for (let i = 0; i < n; i++) { const a = (i + j * 0.37) / n * TAU; k.add(G.sphere(14), c, [p[0] + Math.sin(a) * sc[0] * 0.93, p[1] - sc[1] * 0.42 - (i % 3 === 0 ? 0.012 : 0), p[2] + Math.cos(a) * sc[2] * 0.93], 0, [sc[0] * 0.2, sc[1] * (i % 3 === 0 ? 0.52 : 0.36), sc[0] * 0.2]); }
        });
        k.add(G.sphere(24), '#ff2f4a', [0.02, 0.385, 0.012], 0, 0.036);   // cherry + stem
        k.seg([0.024, 0.415, 0.012], [0.05, 0.47, -0.012], 0.0045, '#5b8a2a', 0.0035, 6);
        const R = mulberry32(77), SP = ['#ff5a7a', '#ffd23f', '#5ac8ff', '#7be07a', '#b27bff', '#ffffff'];
        for (let i = 0; i < 46; i++) {   // sprinkles on the upper half of each scoop
          const j = i % 3, [, p, sc] = S[j], th = R() * 1.15, ph = R() * TAU;
          const x = Math.sin(th) * Math.sin(ph), y = Math.cos(th), z = Math.sin(th) * Math.cos(ph);
          k.add(G.capsule(1, 6), SP[i % 6], [p[0] + x * sc[0] * 1.0, p[1] + y * sc[1] * 1.0, p[2] + z * sc[2] * 1.0], [R() * 3, R() * 3, R() * 3], [0.0048, 0.006, 0.0048]);
        }
      })), glowVC('scoops', 0.04, { roughness: 0.42 }));
    } else if (id === 'yunikorn') {   // (Round 6) unicorn headband: pearly spiral horn, two little ears, flowers, a rainbow mane tuft
      h.position.set(0, 0.02, -0.02); h.rotation.x = -0.06;
      const BR = [0.35, 0.345];
      add(geoC('uniBand', () => kitGeo(k => {
        k.add(G.torus(Math.PI, 0.075, 56), '#d6b6ff', [0, 0, 0], 0, [BR[0], BR[1], 0.36]);
        for (let i = 0; i < 9; i++) { const a = 0.35 + i / 8 * (Math.PI - 0.7); k.add(G.sphere(8), '#fff8ff', [Math.cos(a) * BR[0], Math.sin(a) * BR[1], 0.024], 0, 0.0085); }   // pearls
        for (const sd of [-1, 1]) {
          const a = Math.PI / 2 - sd * 0.62, x = Math.cos(a) * BR[0], y = Math.sin(a) * BR[1];
          k.add(G.cone(16), '#fffafc', [x, y + 0.04, -0.012], [0.12, 0, sd * -0.45], [0.048, 0.105, 0.03]);
          k.add(G.cone(16), '#ffc2dc', [x - sd * 0.002, y + 0.034, 0.012], [0.12, 0, sd * -0.45], [0.028, 0.072, 0.01]);
          const fa = Math.PI / 2 - sd * 1.02, fx = Math.cos(fa) * BR[0], fy = Math.sin(fa) * BR[1], fc = sd < 0 ? '#ff9fcf' : '#ffe07a';   // a flower by each ear
          for (let i = 0; i < 5; i++) { const b = i / 5 * TAU; k.add(G.sphere(10), fc, [fx + Math.sin(b) * 0.022, fy + Math.cos(b) * 0.022, 0.03], 0, [0.016, 0.016, 0.009]); }
          k.add(G.sphere(10), sd < 0 ? '#ffe07a' : '#ff9fcf', [fx, fy, 0.036], 0, [0.011, 0.011, 0.007]);
        }
      })), vcM('uniBand', { roughness: 0.5 }));
      add(geoC('uniHorn', () => {
        const prof = []; for (let i = 0; i <= 28; i++) { const t = i / 28; prof.push(V2(Math.max(0.002, 0.054 * Math.pow(1 - t, 0.85)), t * 0.27)); }
        const g = new THREE.LatheGeometry(prof, 32), P = g.attributes.position, C = new Float32Array(P.count * 3), c = new THREE.Color(), A = new THREE.Color('#fffaf0'), Bc = new THREE.Color('#ffc4e4'), T = new THREE.Color('#ffe6a0');
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i), t = y / 0.27, a = Math.atan2(x, z), w = 0.5 + 0.5 * Math.sin(2 * a - t * TAU * 3.2), k = 1 + 0.2 * w * (1 - t * 0.5);
          P.setXYZ(i, x * k, y, z * k);
          c.copy(A).lerp(Bc, (1 - w) * 0.85).lerp(T, sstep(0.55, 1, t) * 0.7); c.toArray(C, i * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(C, 3));
        g.computeVertexNormals();
        g.rotateX(0.28); g.translate(0, BR[1] + 0.005, 0.03);
        return g;
      }), glowVC('uniHorn', 0.22, { roughness: 0.18, metalness: 0.15 }));
      add(geoC('uniMane', () => {
        const RB = ['#ff8fb0', '#ffb36b', '#ffe07a', '#8ee89a', '#7cc8ff', '#b99bff'], geos = [];
        RB.forEach((c, i) => {
          const f = (i - 2.5) / 2.5, a = mixCol(c, '#ffffff', 0.05), b = mixCol(c, '#ffffff', 0.4);
          const P = curvePts([v3(f * 0.03, BR[1] + 0.005, -0.012), v3(f * 0.075, BR[1] + 0.085, -0.045), v3(f * 0.12, BR[1] + 0.095, -0.13), v3(f * 0.145, BR[1] + 0.03, -0.2), v3(f * 0.13, BR[1] - 0.02, -0.19)], 26);
          const U = P.map(() => v3(f * 0.3, 1, 0.15).normalize());
          geos.push(sweep(P, U, t => 0.034 * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, 0.25 + t))) * (1 - 0.45 * t * t), t => 0.014 * (1 - 0.5 * t), 6, 0.6,
            (t, cc) => cc.copy(a).lerp(b, sstep(0.3, 1, t)), null));
        });
        return concat(geos);
      }), glowVC('knightPlume', 0.1, { roughness: 0.7 }));
    } else if (id === 'astronot') {   // (Round 6) astronaut helmet: white, gold visor raised on top (face shows), antenna with a star
      h.position.set(0, 0.07, -0.03); h.rotation.x = -0.26;
      const HR = [0.345, 0.335, 0.355], edge = a => Math.PI * (0.57 + 0.13 * sstep(0.95, 1.5, a) - 0.06 * sstep(2.1, 2.9, a));
      const hp = (ph, t, d, o) => o.set(Math.sin(ph) * Math.sin(t) * (HR[0] + d), Math.cos(t) * (HR[1] + d), Math.cos(ph) * Math.sin(t) * (HR[2] + d));
      add(geoC('astroShell', () => kitGeo(k => {
        const tube = (pts, w, c) => k.add(sweep(pts, pts.map(p => p.clone().normalize()), () => w, () => w, 8, 1, () => {}, null), c);
        k.add(paramGeo((u, v, o) => { const ph = u * TAU - Math.PI; return hp(ph, v * edge(Math.abs(ph)), 0.006, o); }, 56, 20, v3(0, 0, 0), true), '#f6f8fc');
        const rimP = []; for (let i = 0; i <= 72; i++) { const ph = i / 72 * TAU - Math.PI; rimP.push(hp(ph, edge(Math.abs(ph)) - 0.01, 0.01, v3())); }
        tube(rimP, 0.024, '#9db7e6');
        const combP = []; for (let i = 0; i <= 24; i++) combP.push(hp(Math.PI, lerp(0.6 * Math.PI, 0.16, i / 24), 0.008, v3()));
        tube(combP, 0.017, '#ff6b6b');                                                                         // a red racing stripe
        for (const sd of [-1, 1]) {   // round ear pods (the visor hinges)
          k.add(G.cyl(1, 1, 24), '#b9cdf0', [sd * 0.362, 0.0, 0.0], [0, 0, Math.PI / 2], [0.052, 0.036, 0.052]);
          k.add(G.cyl(1, 1, 24), '#6f95db', [sd * 0.382, 0.0, 0.0], [0, 0, Math.PI / 2], [0.036, 0.012, 0.036]);
        }
        k.seg([0.2, 0.275, -0.12], [0.255, 0.47, -0.16], 0.0055, '#c8d2e4', 0.004, 8);                          // antenna
        k.add(G.sphere(10), '#c8d2e4', [0.2, 0.275, -0.12], 0, 0.016);
      })), mat('astroShell|' + (r >= 2 ? r : 0), () => {
        const t = tex('metal'), m = vcMat({ metalness: 0.05, roughness: 0.3, map: t ? t.map : null, normalMap: t ? t.normalMap : null, normalScale: V2(0.12, 0.12), envMapIntensity: 0.9, side: THREE.DoubleSide });
        return r >= 2 ? rimify(m, rarCol(r), r === 3 ? 0.6 : 0.42, 2.3) : rimify(m, 0xffffff, 0.16);
      }));
      add(geoC('astroVisor', () => kitGeo(k => {   // the raised gold visor (knight's visor shape, one smooth lens)
        const VS = [0.372, 0.36, 0.382], th = (U, v) => Math.PI * lerp(0.5 - 0.04 * (1 - U * U), 0.5 + 0.25 * Math.pow(1 - U * U, 0.55), v);
        const vp = (U, v, d, o) => { const ph = U * Math.PI / 2, t = th(U, v); return o.set(Math.sin(ph) * Math.sin(t) * (VS[0] + d), Math.cos(t) * (VS[1] + d), Math.cos(ph) * Math.sin(t) * (VS[2] + d)); };
        const tube = (pts, w, c) => k.add(sweep(pts, pts.map(p => p.clone().normalize()), () => w, () => w, 6, 1, () => {}, null), c);
        const UW = 0.8, VL = 0.62;   // a smaller lens than the knight's: the white shell shows all round it
        k.push([0, 0, 0], [-0.9, 0, 0]);
        k.add(paramGeo((u, v, o) => vp((u * 2 - 1) * UW, v * VL, 0, o), 40, 6, v3(0, 0, 0), false), '#ffc24a');
        for (const v of [0, VL]) { const P = []; for (let i = 0; i <= 28; i++) P.push(vp((i / 14 - 1) * UW, v, 0.002, v3())); tube(P, 0.009, '#e7eefa'); }
        for (const sd of [-1, 1]) { const P = []; for (let i = 0; i <= 8; i++) P.push(vp(sd * UW, i / 8 * VL, 0.002, v3())); tube(P, 0.009, '#e7eefa'); }
        k.pop();
      })), knightSteelM(r));
      add(geoC('astroStar', () => starGeo(0.036, 0.012)), mat('astroStar', () => glowMat('#ffe36a', 1.7)), [0.258, 0.49, -0.162], [-0.26, 0, 0]);
    } else {   // tac: golden crown with gems, perched on the hair
      h.position.set(0.015, 0.27, -0.03); h.rotation.set(-0.12, 0, 0.14);
      add(geoC('tacBand', () => kitGeo(k => {
        k.add(G.cyl(1, 1.04, 44, true), 0xffffff, [0, 0.035, 0], 0, [0.19, 0.07, 0.19]);
        k.add(G.torus(TAU, 0.06, 48), 0xffffff, [0, 0.0, 0], [Math.PI / 2, 0, 0], 0.197);
        k.add(G.torus(TAU, 0.05, 48), 0xffffff, [0, 0.07, 0], [Math.PI / 2, 0, 0], 0.19);
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU;
          k.add(G.cone(4), 0xffffff, [Math.sin(a) * 0.19, 0.115, Math.cos(a) * 0.19], [0, a + Math.PI / 4, 0], [0.05, 0.09, 0.05]);
          k.add(G.sphere(10), 0xffffff, [Math.sin(a) * 0.19, 0.168, Math.cos(a) * 0.19], 0, 0.016);
        }
      })), mat('tacGold|' + r, () => { const t = tex('metal'); return rimify(stdMat({ color: 0xffcc40, metalness: 1, roughness: 0.25, side: THREE.DoubleSide, map: t ? t.map : null, emissive: 0x402000, emissiveIntensity: 0.3 }), '#ffb030', 0.6 + 0.1 * r, 2); }));
      add(geoC('tacGems', () => kitGeo(k => {
        const cols = ['#ff3a5a', '#3aa0ff', '#3ee07a', '#c45cff', '#ffe23a'];
        for (let i = 0; i < 5; i++) { const a = (i + 0.5) / 5 * TAU; k.add(G.sphere(12), cols[i], [Math.sin(a) * 0.196, 0.036, Math.cos(a) * 0.196], [0, a, 0], [0.022, 0.022, 0.012]); }
      })), glowVC('gems', 0.9, { roughness: 0.08, metalness: 0.1 }));
    }
    // inner volume (ellipsoid centre, radii, band height, fade — hat-local metres): hair above the band is kept inside it
    const IN = { kostebekfener: [[0, 0, 0], [0.33, 0.28, 0.34], -0.025, 0.08], migfer: [[0, 0, 0], [0.335, 0.31, 0.345], -0.035, 0.09], sihirbaz: [[0, -0.01, 0], [0.2, 0.24, 0.2], 0, 0.06],
      sovalyemigfer: [[0, 0, 0], [0.345, 0.335, 0.355], -0.2, 0.08], astronot: [[0, 0, 0], [0.345, 0.335, 0.355], -0.2, 0.08], kedikulak: [[0, 0, 0], [0.33, 0.3, 0.34], -0.04, 0.07],
      kovboy: [[0, 0, 0], [0.195, 0.21, 0.21], 0, 0.06], korsan: [[0, 0, 0], [0.195, 0.15, 0.205], 0, 0.06] }[id];
    if (IN) g.fzHatIn = { h, c: IN[0], r: IN[1], y0: IN[2], fade: IN[3] };
    return g;
  }

  // ── Capes: hanging cloth sheet bent in the vertex shader (flows back when running, ripples, flares in the spin) ──
  const CAPE_DEF = {
    kefirkopuk: { base: '#fff9dd', dark: '#9edfd2', trim: '#40baaa', edge: 'wave' },
    kirmizi: { base: '#dc3b3b', dark: '#961d2a', trim: '#ffcf4a', edge: 'straight' },
    mavi: { base: '#3266dc', dark: '#1a348c', trim: '#e2ebff', edge: 'wave' },
    yesil: { base: '#46b24d', dark: '#23772f', trim: '#b5e86a', edge: 'leaf' },
    mor: { base: '#8a47d6', dark: '#4a1f8e', trim: '#ffcf4a', edge: 'points' },
    gokkusagi: { base: '#ffffff', dark: '#ffffff', trim: '#ffffff', edge: 'straight' },
  };
  Object.assign(CAPE_DEF, {
    deniz: { base: '#43babc', dark: '#216292', trim: '#d1fff3', edge: 'wave', motif: 'wave' },
    gunes: { base: '#ffa348', dark: '#a74243', trim: '#ffe7a0', edge: 'points', motif: 'sun' },
    kefirsihir: { base: '#8b7bc9', dark: '#544790', trim: '#fff0bb', edge: 'wave', motif: 'foam' },
    sovalyesihir: { base: '#3068ea', dark: '#1b2f96', trim: '#ffd24a', edge: 'scallop', check: '#fff4d2' },   // (Round 5) the knight's arms
    // (Round 6) new ordinary capes (their own painters below)
    sekerpelerin: { base: '#ff9fd0', dark: '#b08bff', trim: '#9ff0cf', edge: 'scallop' },
    panda: { base: '#eceef3', dark: '#c4cad6', trim: '#74c663', edge: 'leaf' },
    galaksi: { base: '#4b2a92', dark: '#0f1a4e', trim: '#ffcf4a', edge: 'points' },
  });
  const CAPE_TEX = {};
  function capeTex(id) {
    if(CAPE_TEX[id])return CAPE_TEX[id];
    const S=256,cv=canvasEl(S,S),ev=canvasEl(S,S),c=cv.getContext('2d'),e=ev.getContext('2d'),q=darkKey(id);
    e.fillStyle='#000';e.fillRect(0,0,S,S);
    c.beginPath();c.moveTo(0,0);c.lineTo(S,0);for(let x=S;x>=0;x-=4){const u=x/S,kind=q%5;let cut=kind===0?44*(1-Math.abs(u-.5)*2):kind===1?35*Math.abs(Math.sin(u*Math.PI*3)):kind===2?48*Math.max(0,1-Math.abs(u-.28)*9):kind===3?38*(Math.abs(u-.5)*2):46*Math.max(0,1-Math.abs(u-.66)*8);c.lineTo(x,243-cut-((x*13+q)%13));}c.closePath();c.save();c.clip();
    c.fillStyle=['#462d35','#243640','#36303f','#3b3b2c','#28382f'][q%5];c.fillRect(0,0,S,S);
    for(let x=0;x<S;x+=12){c.strokeStyle='rgba(0,0,0,.18)';c.beginPath();c.moveTo(x,0);c.lineTo(x+9,S);c.stroke();}
    c.strokeStyle='#a7977d';c.lineWidth=5;c.strokeRect(8,8,240,230);
    c.strokeStyle=darkHue(id);c.lineWidth=10;c.beginPath();c.moveTo(128,58);c.lineTo(128,181);c.moveTo(90,105);c.lineTo(166,105);c.stroke();
    c.lineWidth=4;c.beginPath();c.moveTo(87,67);c.lineTo(169,173);c.moveTo(169,67);c.lineTo(87,173);c.stroke();
    const kind=q%5;c.fillStyle='#beb19b';c.strokeStyle='#b6a78d';c.lineWidth=4;
    if(kind===0){c.beginPath();c.ellipse(128,91,24,29,0,0,TAU);c.fill();c.fillStyle='#171b21';for(const x of [117,139]){c.beginPath();c.ellipse(x,91,6,8,0,0,TAU);c.fill();}c.fillRect(120,112,16,12);}
    if(kind===1){c.beginPath();c.arc(128,105,40,0,TAU);c.stroke();for(let j=0;j<5;j++){const a=j/5*TAU;c.beginPath();c.moveTo(128+Math.sin(a)*22,105+Math.cos(a)*22);c.lineTo(128+Math.sin(a)*49,105+Math.cos(a)*49);c.stroke();}}
    if(kind===2){c.beginPath();c.moveTo(93,80);c.lineTo(128,141);c.lineTo(163,80);c.stroke();for(let j=0;j<4;j++){c.beginPath();c.moveTo(105+j*15,66);c.lineTo(114+j*10,112);c.stroke();}}
    if(kind===3){c.beginPath();c.moveTo(128,67);c.lineTo(165,104);c.lineTo(128,142);c.lineTo(91,104);c.closePath();c.stroke();c.beginPath();c.ellipse(128,104,12,20,0,0,TAU);c.fill();}
    if(kind===4){c.beginPath();c.arc(118,100,35,.6,5.5);c.stroke();for(const x of [109,128,147]){c.beginPath();c.moveTo(x,129);c.lineTo(x-8,165);c.stroke();}}
    for(let j=0;j<1+q%4;j++){c.fillStyle=darkHue(id);c.fillRect(100+j*18,191,6,19);}
    c.restore();
    const mk=canvas=>{const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=ANISO;return keep(t);};return(CAPE_TEX[id]={map:mk(cv),emissiveMap:mk(ev)});
  }
  const CAPE_LEN = 0.6;
  // Half-depth of the torso (shirt / shorts lathes, z-scaled) at bind height y and lateral offset x.
  function profR(P, y) {
    let r = 0;
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1];
      if ((y - a[1]) * (y - b[1]) <= 0 && a[1] !== b[1]) r = Math.max(r, lerp(a[0], b[0], (y - a[1]) / (b[1] - a[1])));
    }
    return r;
  }
  const backDepth = (x, y) => Math.max(0.8 * Math.sqrt(Math.max(0, sq(profR(SHIRT_P, y)) - x * x)), 0.82 * Math.sqrt(Math.max(0, sq(profR(SHORTS_P, y)) - x * x)));
  const CAPE_Y0 = 0.805, CAPE_Z0 = -0.01;   // cape slot in bind pose (chest bone 0.6 + 0.205, z −0.01)
  function capeGeo(id,rarity) {
    const NX = 16, NY = 18, pos = [], uv = [], idx = [];
    const q=darkKey(id),width=.90+(q%7)*.025,length=.89+(q%5)*.025+rarity*.012;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const u = i / NX, v = j / NY, a = (u - 0.5) * lerp(2.7, 1.5, Math.pow(v, 0.6)), R = lerp(0.158, 0.3, Math.pow(v, 0.7)), D = lerp(0.115, 0.06, v);
      const fold = 0.014 * Math.sin(u * Math.PI * 6) * sstep(0.1, 1, v);
      const x = Math.sin(a) * R*width, y = -v * CAPE_LEN*length;
      let z = -Math.cos(a) * D - 0.012 - v * 0.03 - fold;
      // stay clear of the back (shoulder blades, bottom of the shirt): clearance grows toward the hem, soft min
      const zb = -backDepth(x, CAPE_Y0 + y) - CAPE_Z0 - (0.022 + 0.03 * v), k = 0.02, hh = Math.max(k - Math.abs(z - zb), 0) / k;
      z = Math.min(z, zb) - hh * hh * k * 0.25;
      pos.push(x, y, z);
      uv.push(u, 1 - v);
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i; idx.push(a, a + NX + 1, a + 1, a + 1, a + NX + 1, a + NX + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    g.computeVertexNormals();
    const n = v3().fromBufferAttribute(g.attributes.normal, Math.floor(NY / 2) * (NX + 1) + NX / 2);
    if (n.z > 0) { const I = g.index.array; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } g.computeVertexNormals(); }
    return keep(g);
  }
  const CAPE_V = `
    float fzV = clamp(-transformed.y / ${CAPE_LEN.toFixed(3)}, 0.0, 1.2);
    float fzA = cpFlow * 0.95 * pow(fzV, 0.9) + 0.2 * fzV;
    float fzW = (sin(cpTime * (4.0 + 5.0 * cpFlow) - fzV * 5.5 + transformed.x * 7.0) - 1.0) * (0.3 + cpFlow) * 0.0225 * fzV;   // ripples only backward
    float fzY = transformed.y, fzZ = transformed.z, fzC = cos(fzA), fzS = sin(fzA);
    transformed.y = fzY * fzC - fzZ * fzS;
    transformed.z = fzY * fzS + fzZ * fzC + fzW;
    transformed.x += (cpSide * 0.14 + sin(cpTime * 6.0 - fzV * 4.0) * 0.012 * cpFlow) * fzV;`;
  const CAPE_N = `
    vec3 fzN = objectNormal; fzN = vec3(fzN.x, fzN.y * fzC - fzN.z * fzS, fzN.y * fzS + fzN.z * fzC);
    vNormal = normalize(normalMatrix * fzN);`;
  function capeUniforms() { return { cpFlow: { value: 0 }, cpSide: { value: 0 }, cpTime: TIME.u }; }
  function capePatch(m, U, withNormal, key) {
    return patchMat(m, { uniforms: U, vDecl: 'uniform float cpFlow, cpSide, cpTime;', vBegin: CAPE_V + (withNormal ? CAPE_N : ''), key: 'cape' + key });
  }
  function buildCape(id, r, own) {
    const g = new THREE.Group(), T = capeTex(id), U = capeUniforms();
    if (own) U.cpTime = { value: 0 };
    const t = tex('fabric') ? TEX.rep('fabric', 4, 4) : null;
    const m = stencil(stdMat({ map: T.map, emissiveMap: T.emissiveMap, emissive: 0xffffff, emissiveIntensity: id === 'kirmizi' ? (r >= 2 ? 0.6 : 0) : 0.7 + 0.35 * r,
      normalMap: t ? t.normalMap : null, normalScale: V2(0.6, 0.6), roughness: 0.8, side: THREE.DoubleSide, alphaTest: 0.5,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
    capePatch(m, U, true, 'm');
    patchMat(m, { fDecl: '', fOut: 'outgoingLight *= gl_FrontFacing ? 1.0 : 0.62;', key: 'capeIn' });
    if (r >= 2) rimify(m, rarCol(r), r === 3 ? 0.55 : 0.35, 2.4); else rimify(m, 0xffffff, 0.1);
    const mesh = new THREE.Mesh(capeGeo(id,r), m);
    const dm = capePatch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.map, alphaTest: 0.5 }), U, false, 'd');
    mesh.customDepthMaterial = dm; mesh.name = 'fzCape';
    mesh.fzXrayPatch = mm => capePatch(mm, U, true, 'x');
    if (!own) { keep(m); keep(dm); }
    g.add(mesh);
    const clasp = new THREE.Mesh(geoC('clasp', () => kitGeo(k => {
      k.add(G.sphere(16), 0xffffff, [0, -0.004, 0.108], 0, [0.024, 0.024, 0.014]);
      for (const s of [-1, 1]) k.seg([s * 0.152, 0.002, -0.03], [s * 0.03, 0.0, 0.1], 0.006, 0xffffff, 0.006, 8);
    })), goldM(r));
    clasp.userData.noShadow = true; clasp.userData.noXray = true; g.add(clasp);
    g.fzCapeU = U; g.fzDepth = dm;
    return g;
  }

  // ── Item templates (for ground display, thumbnails) ──
  const TPL = {};
  function buildItem(slot, id, r, own) {
    const o = slot === 'weapon' ? buildSword(id, r) : slot === 'hat' ? buildHat(id, r) : buildCape(id, r, own);
    o.traverse(m => {
      if (!m.isMesh) return;
      // only parts big enough to make a visible shadow cast one (gems, small stars, the cape clasp don't)
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const rad = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z);
      m.castShadow = rad > 0.07 && !m.userData.noShadow; m.receiveShadow = false;
    });
    o.userData.slot = slot; o.userData.id = id; o.userData.rarity = r;
    return o;
  }
  const tplKey = (slot, id, r) => slot + ':' + id + ':' + r;
  const template = (slot, id, r) => { const k = tplKey(slot, id, r); return TPL[k] || (TPL[k] = buildItem(slot, id, r, false)); };

  // ── X-ray silhouette (stencil technique) ──
  // Opaque objects are sorted by material before depth, so Feza draws after the level (renderOrder) — otherwise he would
  // mark the stencil before the walls in front of him have written their depth. The body + hair use ONE low-poly skinned
  // stand-in; each equipment piece gets ONE merged twin (the cape cloth its own, it bends in the vertex shader).
  const HERO_ORDER = 5;
  let XRAY = null;
  function xrayMat(patch) {
    const m = new THREE.MeshLambertMaterial({ color: 0x8fd0ff, transparent: true, depthWrite: false, depthFunc: THREE.GreaterDepth,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.NotEqualStencilFunc;
    m.stencilZPass = THREE.ReplaceStencilOp; m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp;
    if (patch) patch(m);
    // Two-tone so it reads on ANY occluder: a deep royal-blue fill (lighter towards the top) stands out on bright / turquoise
    // things (Kral Jöle, lava, leaves), a cream rim that gently breathes stands out on dark ones (cave, basalt, castle walls).
    patchMat(m, { uniforms: { fzXT: TIME.u }, fDecl: 'uniform float fzXT;', fOut: `float fzX = 1.0 - abs(dot(normal, normalize(vViewPosition)));
      float fzRim = smoothstep(0.3, 0.8, fzX * fzX * (3.0 - 2.0 * fzX));
      vec3 fzFill = mix(vec3(0.02, 0.05, 0.42), vec3(0.08, 0.2, 0.95), clamp(normal.y * 0.55 + 0.5, 0.0, 1.0));
      outgoingLight = mix(fzFill, vec3(1.0, 0.94, 0.78) * (0.95 + 0.2 * sin(fzXT * 4.5)), fzRim);
      diffuseColor.a = mix(0.72, 0.97, fzRim);`, key: 'xray' });
    return keep(m);
  }
  const xrayBase = () => XRAY || (XRAY = xrayMat(null));
  function xrayTwin(geo, mat, parent) {
    const t = new THREE.Mesh(geo, mat);
    t.renderOrder = 20; t.frustumCulled = false; t.castShadow = false; t.userData.xrayTwin = true;
    parent.add(t); return t;
  }
  // All meshes of an item (minus the cape cloth and flagged parts) merged into one position+normal geometry in item space.
  const XGEO = {};
  function mergedXrayGeo(obj, key) {
    if (XGEO[key]) return XGEO[key];
    const parts = [];
    obj.traverse(o => { if (o.isMesh && !o.userData.xrayTwin && !o.userData.noXray && o.name !== 'fzCape') parts.push(o); });
    let nv = 0, ni = 0;
    for (const o of parts) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = v3();
    let vo = 0, io = 0;
    for (const o of parts) {
      o.updateMatrix(); m4.copy(o.matrix);
      for (let p = o.parent; p && p !== obj; p = p.parent) { p.updateMatrix(); m4.premultiply(p.matrix); }
      nm.getNormalMatrix(m4);
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        const k = (vo + i) * 3;
        v.fromBufferAttribute(P, i).applyMatrix4(m4); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z; }
      }
      if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo; io += I.count; }
      else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
    return (XGEO[key] = keep(out));
  }
  // capePatch: the cape's own vertex bend (clones of templates lose it, so it can be passed in)
  function addXrayItem(obj, key, capePatch, capeHolder) {
    if (obj.userData.xrayDone) return;
    obj.userData.xrayDone = true;
    let cape = null;
    obj.traverse(o => { if (o.isMesh && o.name === 'fzCape') cape = o; });
    if (cape) {
      const patch = capePatch || cape.fzXrayPatch, holder = capeHolder || cape;
      if (patch) xrayTwin(cape.geometry, holder.fzXrayM || (holder.fzXrayM = xrayMat(patch)), cape);
    }
    const g = mergedXrayGeo(obj, key);
    if (g.attributes.position.count) xrayTwin(g, xrayBase(), obj);
  }

  // ── Offscreen renderer for thumbnails and portraits ──
  // The mini scene mirrors the main scene's light counts (and fog type) so the same shader programs are reused — no compile
  // hitch when the bag opens. Output goes into an sRGB render target, i.e. it is encoded like the screen.
  const OFF = { rt: null, scene: null, cam: null, buf: null, cv: null, tc: null, pc: null, sig: '', busy: false };
  function offSetup() {
    if (!OFF.rt) {
      OFF.rt = new THREE.WebGLRenderTarget(256, 256, { samples: 4, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
      OFF.scene = new THREE.Scene(); OFF.cam = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
      OFF.buf = new Uint8Array(256 * 256 * 4); OFF.cv = canvasEl(256, 256);
      OFF.lights = new THREE.Group(); OFF.scene.add(OFF.lights);
    }
    let p = 0, d = 0, ds = 0, h = 0, s = 0;
    scene.traverseVisible(o => { if (!o.isLight) return; if (o.isPointLight) p++; else if (o.isDirectionalLight) { d++; if (o.castShadow) ds++; } else if (o.isHemisphereLight) h++; else if (o.isSpotLight) s++; });
    const sig = [p, d, ds, h, s].join(',');
    if (sig !== OFF.sig) {
      OFF.sig = sig;
      for (const l of OFF.lights.children.slice()) { OFF.lights.remove(l); if (l.dispose) l.dispose(); }
      const add = l => { OFF.lights.add(l); return l; };
      const hemi = add(new THREE.HemisphereLight(0xeaf4ff, 0x8a6a55, h ? 1.1 : 0)); hemi.visible = h > 0;
      // Shadowed lights stay shadowed (same shader programs as the game), but their shadow map is drawn only ONCE, now, while
      // the mini scene is still empty, so it stays blank. Hero and item meshes don't receive shadows anyway (same pictures),
      // but a shadow pass per card/portrait used to compile depth shaders mid-game (three.js picks the shared depth shader
      // by draw order; cape cards lost their custom one in clone()) and cost an extra pass.
      let shadowed = 0;
      for (let i = 0; i < d; i++) {
        const k = add(new THREE.DirectionalLight(0xfff2de, i === 0 ? 2.6 : 0)); k.position.set(-1.6, 3, 2.6); k.target.position.set(0, 0, 0); OFF.lights.add(k.target);
        if (i < ds) { k.castShadow = true; k.shadow.mapSize.set(16, 16); k.shadow.autoUpdate = false; k.shadow.needsUpdate = true; shadowed++; }
      }
      for (let i = 0; i < p; i++) { const l = add(new THREE.PointLight(0xbfe2ff, i === 0 ? 3.5 : 0, 8, 1.5)); l.position.set(1.8, 1.5, -1.6); }
      for (let i = 0; i < s; i++) add(new THREE.SpotLight(0xffffff, 0));
      if (!d) { const k = add(new THREE.DirectionalLight(0xfff2de, 2.6)); k.position.set(-1.6, 3, 2.6); }
      if (!p) { const l = add(new THREE.PointLight(0xbfe2ff, 3.5, 8, 1.5)); l.position.set(1.8, 1.5, -1.6); }
      if (shadowed) {
        const prevRT = renderer.getRenderTarget();
        renderer.setRenderTarget(OFF.rt);
        const sm = renderer.shadowMap, au = sm.autoUpdate; sm.autoUpdate = true;
        try { renderer.render(OFF.scene, OFF.cam); } finally { sm.autoUpdate = au; renderer.setRenderTarget(prevRT); }
      }
    }
    OFF.scene.fog = scene.fog ? (scene.fog.isFogExp2 ? new THREE.FogExp2(0, 0) : new THREE.Fog(0, 1e4, 2e4)) : null;
    OFF.scene.environment = scene.environment; OFF.scene.environmentIntensity = 1;
  }
  if (typeof CTX_HOOKS !== 'undefined') CTX_HOOKS.push(() => { OFF.sig = ''; rbLost(); });   // WebGL context restored: rebuild the lights + blank shadow map
  // Render obj (already placed in OFF.scene) framed on the sphere (c, rad) viewed from dir into OFF.rt (no read-back yet).
  function offDraw(c, rad, dir, fov) {
    const cam = OFF.cam; cam.fov = fov || 28; cam.updateProjectionMatrix();
    const dist = rad / Math.sin(cam.fov * Math.PI / 360);
    cam.position.copy(c).addScaledVector(dir.clone().normalize(), dist); cam.near = dist * 0.3; cam.far = dist * 3; cam.updateProjectionMatrix(); cam.lookAt(c);
    // keep the key light relative to the camera
    for (const l of OFF.lights.children) if (l.isDirectionalLight && l.intensity > 0) { l.position.copy(c).add(v3(-1.4, 2.6, 1.2).applyQuaternion(cam.quaternion)); l.target.position.copy(c); l.target.updateMatrixWorld(); }
      else if (l.isPointLight && l.intensity > 0) l.position.copy(c).add(v3(1.3, 0.9, -1.5).applyQuaternion(cam.quaternion).multiplyScalar(rad * 2.2));
    const prevRT = renderer.getRenderTarget(), prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha(), prevBg = OFF.scene.background;
    renderer.setRenderTarget(OFF.rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
    OFF.busy = true;
    try { renderer.render(OFF.scene, cam); } finally { OFF.busy = false; renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCol, prevA); OFF.scene.background = prevBg; }
  }
  // OFF.rt pixels (bottom-up rows, premultiplied alpha) → OFF.cv (256², top-down, straight alpha)
  function offDecode(B) {
    const g = OFF.cv.getContext('2d'), id = g.createImageData(256, 256), D = id.data;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const s = ((255 - y) * 256 + x) * 4, d = (y * 256 + x) * 4, a = B[s + 3];
      const k = a > 0 && a < 255 ? 255 / a : 1;
      D[d] = Math.min(255, B[s] * k); D[d + 1] = Math.min(255, B[s + 1] * k); D[d + 2] = Math.min(255, B[s + 2] * k); D[d + 3] = a;
    }
    g.putImageData(id, 0, 0);
    return OFF.cv;
  }
  // Synchronous read-back (waits for the GPU to finish everything so far): direct ITEMS.thumb / FEZA.portrait calls, prebake.
  function offRead() { renderer.readRenderTargetPixels(OFF.rt, 0, 0, 256, 256, OFF.buf); return offDecode(OFF.buf); }
  // A picture = { draw() → renders it into OFF.rt, finish(canvas) → composes + caches its dataURL }. picNow does both now.
  function picNow(pic, what) {
    if (!pic || renderer.getContext().isContextLost()) return null;   // (a lost context would give a blank picture)
    try { pic.draw(); return pic.finish(offRead()); } catch (e) { console.warn(what, e); return null; }
  }

  // ── Asynchronous read-back for the background pictures (see BAKE below) ──
  // A synchronous readRenderTargetPixels waits until the GPU has finished the whole frame so far (on the iPad: often most of a
  // frame), and the bake used to do that every other frame in the first seconds of play. Instead the pixels are copied into a
  // pixel-pack buffer with a fence behind them; the fence is looked at once per drawn frame (no waiting) and the picture is
  // finished (decode + compose + PNG) in a later frame, when the copy is long done. One picture in flight at a time. Same
  // GL calls as three's renderer.readRenderTargetPixelsAsync, but polled from the game loop instead of 250 timer calls per
  // second, and given up after ~1.5 s (then that picture is made the old synchronous way; after 2 misses always).
  const RB = { pic: null, job: null, pbo: null, sync: null, at: 0, fails: 0, off: false };
  function rbStart(pic, job) {
    const gl = renderer.getContext(), P = renderer.properties.get(OFF.rt), fb = P && P.__webglFramebuffer;
    if (RB.off || RB.pic || !fb || !renderer.capabilities.isWebGL2 || typeof gl.fenceSync !== 'function' || gl.isContextLost()) return false;
    const pbo = gl.createBuffer(); if (!pbo) return false;
    renderer.state.bindFramebuffer(gl.FRAMEBUFFER, fb);
    try {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, OFF.buf.byteLength, gl.STREAM_READ);
      gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    } finally {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      renderer.setRenderTarget(renderer.getRenderTarget(), renderer.getActiveCubeFace(), renderer.getActiveMipmapLevel());   // three's framebuffer again
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) { gl.deleteBuffer(pbo); return false; }
    gl.flush();
    Object.assign(RB, { pic, job, pbo, sync, at: BAKE.drawn });
    return true;
  }
  // Stop waiting for the picture in flight; its job goes back to the front of the queue. miss: the read-back did not come
  // back, so that picture is made synchronously next time (and after 2 misses in a row the bake stays synchronous).
  function rbDrop(miss) {
    const j = RB.job, gl = renderer.getContext();
    if (!gl.isContextLost()) { if (RB.sync) gl.deleteSync(RB.sync); if (RB.pbo) gl.deleteBuffer(RB.pbo); }
    RB.pic = RB.job = RB.sync = RB.pbo = null;
    if (miss && ++RB.fails >= 2) RB.off = true;
    if (j) { if (miss) j.sync = true; if (!BAKE.keys.has(j.k)) { BAKE.keys.add(j.k); BAKE.q.unshift(j); } }
  }
  function rbLost() { RB.sync = RB.pbo = null; rbDrop(false); }   // context restored: the old GL objects are gone with the old context
  // → 0 still on its way, 1 ready to finish, -1 given up (job re-queued)
  function rbPoll() {
    const gl = renderer.getContext();
    if (gl.isContextLost()) { rbDrop(false); return -1; }
    const s = gl.clientWaitSync(RB.sync, 0, 0);
    if (s === gl.ALREADY_SIGNALED || s === gl.CONDITION_SATISFIED) return 1;
    if (s === gl.WAIT_FAILED || BAKE.drawn - RB.at > 90) { rbDrop(true); return -1; }
    return 0;
  }
  function rbFinish() {
    const gl = renderer.getContext(), pic = RB.pic;
    try {
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, RB.pbo);
      try { gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, OFF.buf); } finally { gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); }
      const B = OFF.buf; let ink = false;
      for (let i = 3; i < B.length; i += 4) if (B[i]) { ink = true; break; }
      if (!ink) {   // an empty picture came back (a driver quirk?): never cache a blank card — synchronous from now on
        console.warn('FEZA bake: empty asynchronous read-back, using synchronous ones'); RB.off = true; rbDrop(true); return;
      }
      RB.job = null; rbDrop(false); RB.fails = 0;
      pic.finish(offDecode(B));
    } catch (e) { console.warn('FEZA bake read', e); if (RB.pic) rbDrop(true); }
  }

  // ── Pose channels ──
  const CHN = ['bX', 'bY', 'bZ', 'bRX', 'bRY', 'bRZ', 'hRX', 'hRY', 'hRZ', 'cRX', 'cRY', 'cRZ', 'kRX', 'kRY', 'kRZ',
    'aLX', 'aLY', 'aLZ', 'fL', 'fLZ', 'aRX', 'aRY', 'aRZ', 'fR', 'fRZ', 'wX', 'wY', 'wZ', 'tLX', 'tLZ', 'sL', 'tRX', 'tRZ', 'sR'];
  const C = {}; CHN.forEach((n, i) => { C[n] = i; });
  const NCH = CHN.length;
  const LEGS = [C.tLX, C.tLZ, C.sL, C.tRX, C.tRZ, C.sR];
  const BASE = new Float32Array(NCH);
  Object.entries({ cRX: 0.02, kRX: -0.3, kRZ: 0.07, aLX: 0.06, aLZ: 0.17, fL: -0.3, aRX: -0.15, aRY: 0.25, aRZ: -0.2, fR: -0.95,
    wX: 2.8, wY: 0, wZ: 0.3, tLZ: 0.035, sL: 0.03, tRZ: -0.035, sR: 0.03 }).forEach(([k, v]) => { BASE[C[k]] = v; });
  const K = o => { const a = {}; for (const k in o) a[C[k]] = o[k]; return a; };
  // Horizontal slash keyframes: B = wind-up, C = end of the strike, D = follow-through. dir 1 sweeps right → left.
  const SLASH = {
    1: {
      B: K({ cRY: -0.7, hRY: -0.25, bRX: -0.05, bY: -0.035, aRX: -1.15, aRY: -1.9, aRZ: 0, fR: -0.15, fRZ: 0.35, wX: 2.78, wY: 0, wZ: 0.2, aLX: -0.6, aLY: 0.55, aLZ: 0.3, fL: -1.0, kRY: 0.35, kRX: -0.2, tLX: -0.35, sL: 0.3, tRX: 0.25, sR: 0.35 }),
      C: K({ cRY: 0.62, hRY: 0.25, bRX: 0.14, bZ: 0.07, bY: -0.02, aRX: -1.22, aRY: 0.8, aRZ: 0, fR: -0.05, fRZ: -0.1, wX: 2.82, wY: 0, wZ: -0.15, aLX: 0.55, aLY: -0.3, aLZ: 0.35, fL: -0.6, kRY: -0.3, kRX: -0.18, tLX: -0.42, sL: 0.25, tRX: 0.32, sR: 0.3 }),
      D: K({ cRY: 0.74, hRY: 0.3, bRX: 0.1, bZ: 0.06, bY: -0.02, aRX: -1.18, aRY: 1.05, aRZ: 0, fR: -0.2, fRZ: -0.35, wX: 2.78, wY: 0, wZ: -0.3, aLX: 0.45, aLY: -0.3, aLZ: 0.3, fL: -0.6, kRY: -0.35, kRX: -0.18, tLX: -0.42, sL: 0.25, tRX: 0.32, sR: 0.3 }),
    },
    '-1': {
      B: K({ cRY: 0.65, hRY: 0.22, bRX: -0.04, bY: -0.035, aRX: -1.15, aRY: 0.7, aRZ: 0, fR: -0.15, fRZ: 1.1, wX: 2.78, wY: 0, wZ: 0.35, aLX: 0.35, aLY: -0.3, aLZ: 0.35, fL: -0.7, kRY: -0.3, kRX: -0.2, tLX: -0.3, sL: 0.3, tRX: 0.25, sR: 0.3 }),
      C: K({ cRY: -0.55, hRY: -0.22, bRX: 0.14, bZ: 0.07, bY: -0.02, aRX: -1.22, aRY: -1.55, aRZ: 0, fR: -0.05, fRZ: 0.1, wX: 2.82, wY: 0, wZ: 0.15, aLX: -0.4, aLY: 0.4, aLZ: 0.3, fL: -0.9, kRY: 0.28, kRX: -0.18, tLX: -0.4, sL: 0.25, tRX: 0.32, sR: 0.3 }),
      D: K({ cRY: -0.66, hRY: -0.26, bRX: 0.1, bZ: 0.06, bY: -0.02, aRX: -1.18, aRY: -1.85, aRZ: 0, fR: -0.2, fRZ: 0.3, wX: 2.78, wY: 0, wZ: 0.3, aLX: -0.35, aLY: 0.4, aLZ: 0.3, fL: -0.9, kRY: 0.32, kRX: -0.18, tLX: -0.4, sL: 0.25, tRX: 0.32, sR: 0.3 }),
    },
  };
  const CAST = {   // gather → both hands thrust forward, the sword pointed at the target like a magic wand
    G: K({ aLX: 0.45, aRX: 0.35, aLY: 0, aRY: 0, aLZ: 0.45, aRZ: -0.45, fL: -1.4, fR: -1.5, fLZ: 0, fRZ: 0, bY: -0.045, bRX: -0.1, kRX: -0.2, cRX: -0.06, wX: 2.2, wZ: 0 }),
    T: K({ aLX: -1.5, aLY: -0.5, aLZ: 0.05, aRX: -1.55, aRY: 0.12, aRZ: -0.05, fL: -0.2, fR: -0.06, fLZ: 0, fRZ: 0, bRX: 0.15, bZ: 0.05, bY: 0, kRX: -0.22, cRX: 0.06, wX: 3.05, wZ: 0, tLX: -0.3, sL: 0.2, tRX: 0.2, sR: 0.1 }),
  };
  const SPIN = K({ aLX: -1.5, aLY: 1.5, aLZ: 0, fL: -0.15, aRX: -1.5, aRY: -1.5, aRZ: 0, fR: -0.06, wX: 3.05, wY: 0, wZ: 0, bRX: -0.04, tLZ: 0.2, tRZ: -0.2, sL: 0.25, sR: 0.25, tLX: -0.1, tRX: -0.1, kRX: -0.1, cRY: 0, hRY: 0, cRX: 0 });
  const CHEER = K({ aLX: -0.8, aLZ: 0.26, aLY: 0.6, fL: -1.35, aRX: -1.62, aRZ: -0.14, aRY: 0.1, fR: -0.38, wX: 1.0, wY: 0, wZ: 0, kRX: -0.12, cRX: -0.06, kRZ: 0.0 });
  const SLEEP = { bRZ: Math.PI / 2, bRX: -0.35, bY: 0.2, bX: 0.62, bZ: 0,
    P: K({ cRX: 0.12, cRY: 0, kRX: 0.2, kRY: 0.3, kRZ: 0.22, aLX: -1.9, aLY: 0.1, aLZ: 0.1, fL: -1.9, aRX: -1.35, aRY: 0.1, aRZ: 0.25, fR: -0.35, wX: 2.9, wY: 0, wZ: -0.7,
      tLX: -1.15, tLZ: 0.05, sL: 1.5, tRX: -0.75, tRZ: -0.02, sR: 1.2, hRX: 0.1 }) };
  const FIDGETS = ['look', 'bounce', 'sword', 'wave', 'stretch', 'scratch'];
  const LEGSET = new Uint8Array(NCH); for (const i of LEGS) LEGSET[i] = 1;
  function lerpInto(P, Q, w, legW) {
    const lw = legW === undefined ? w : legW;
    if (w <= 0 && lw <= 0) return;
    for (let i = 0; i < NCH; i++) P[i] += (Q[i] - P[i]) * (LEGSET[i] ? lw : w);
  }
  function keysBetween(out, base, A, B, t) { for (let i = 0; i < NCH; i++) { const a = A[i] ?? base[i], b = B[i] ?? base[i]; out[i] = a + (b - a) * t; } }

  // ── Hero ──
  function create() {
    const body = buildBody(), sh = sharedMats();
    const root = new THREE.Group(); root.name = 'feza';
    const bones = BONES.map(b => { const o = new THREE.Bone(); o.name = b[0]; o.position.set(b[2], b[3], b[4]); o.rotation.order = 'YXZ'; return o; });
    BONES.forEach((b, i) => { if (b[1] >= 0) bones[b[1]].add(bones[i]); });
    root.add(bones[0]); root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    const skinMat = makeSkinMat(), hairMat = makeHairMat();
    const sk = (geo, m) => { const o = new THREE.SkinnedMesh(geo, m); root.add(o); o.bind(skel); o.frustumCulled = false; o.castShadow = true; return o; };
    const skinMesh = sk(body.skin, skinMat); sk(body.cloth, sh.cloth); sk(body.shoe, sh.shoe);
    const B = { root: bones[0], hips: bones[1], chest: bones[2], head: bones[3], armL: bones[4], foreL: bones[5], armR: bones[6], foreR: bones[7], thighL: bones[8], shinL: bones[9], thighR: bones[10], shinR: bones[11] };
    const hairG = new THREE.Group(); B.head.add(hairG);
    const hair = new THREE.Mesh(body.hair, hairMat);
    hair.castShadow = true; hair.frustumCulled = false; hair.customDepthMaterial = hairMat.userData.depth; hairG.add(hair);
    const hatSlot = new THREE.Group(); hatSlot.position.copy(HC); hairG.add(hatSlot);
    const wSlot = new THREE.Group(); wSlot.position.set(0, -0.18, 0.012); wSlot.rotation.order = 'ZXY'; B.foreR.add(wSlot);
    const offSlot = new THREE.Group(); offSlot.position.set(0, -0.18, 0.012); offSlot.rotation.order = 'ZXY'; B.foreL.add(offSlot);
    const capeSlot = new THREE.Group(); capeSlot.position.set(0, 0.205, -0.01); B.chest.add(capeSlot);
    const handR = new THREE.Object3D(); handR.position.set(0, -0.18, 0.01); B.foreR.add(handR);
    const tip0 = new THREE.Object3D(); tip0.position.set(0, 0.35, 0); wSlot.add(tip0);
    const headC = new THREE.Object3D(); headC.position.copy(HC); B.head.add(headC);

    const P = new Float32Array(NCH), Q = new Float32Array(NCH);
    const S = {
      t: 0, ph: 0, wRun: 0, atkK: -1, atkDir: 1, atkW: 0, castK: -1, castW: 0, wSpin: 0, spinA: 0, wCheer: 0, wDead: 0, hurt: 0,
      blinkT: 1.5, blink: 0, blinkDur: 0, sacT: 0, sacX: 0, sacY: 0, lookX: 0, lookY: 0,
      fidW: 0, fidI: -1, fidU: 0, zzzT: 0, prevYaw: null, yawRate: 0,
      eyeW: v3(1, 0, 0), mouth: new THREE.Vector4(1, 0, 0, 0), brow: v3(), squint: 0,
      hOff: v3(), hVel: v3(), hPrev: null, hPrevV: v3(), flow: 0, side: 0,
      eq: { weapon: null, offhand: null, hat: null, cape: null }, cache: {}, xray: false, capeU: null, fixed: null,
      bl: { e: 1, tgt: 1, t: 9, fx: false, sleep: false, dead: false },   // lightsaber blade: extension 0..1 → target
    };
    const U = skinMat.userData.fz, HU = hairMat.userData.fz;
    const _v = v3(), _w = v3(), _a = v3(), _q = new THREE.Quaternion(), MW = [1, 0, 0, 0];
    const face = { blink: 0, happy: 0, grin: 0, o: 0, small: 0, wince: 0, squint: 0, look: 0, lookX: 0, lookY: 0, browR: 0, browT: 0, blush: 0 };
    let snap = false, udt = 0;
    const dmp = (a, b, k) => snap ? b : damp(a, b, k, udt);

    function applyPose(p) {
      B.root.position.set(p[C.bX], p[C.bY], p[C.bZ]); B.root.rotation.set(p[C.bRX], p[C.bRY], p[C.bRZ]);
      B.hips.rotation.set(p[C.hRX], p[C.hRY], p[C.hRZ]);
      B.chest.rotation.set(p[C.cRX], p[C.cRY], p[C.cRZ]);
      B.head.rotation.set(p[C.kRX], p[C.kRY], p[C.kRZ]);
      B.armL.rotation.set(p[C.aLX], p[C.aLY], p[C.aLZ]); B.foreL.rotation.set(p[C.fL], 0, p[C.fLZ]);
      B.armR.rotation.set(p[C.aRX], p[C.aRY], p[C.aRZ]); B.foreR.rotation.set(p[C.fR], 0, p[C.fRZ]);
      wSlot.rotation.set(p[C.wX], p[C.wY], p[C.wZ]);
      offSlot.rotation.set(p[C.wX], -p[C.wY], -p[C.wZ]);
      B.thighL.rotation.set(p[C.tLX], 0, p[C.tLZ]); B.shinL.rotation.set(p[C.sL], 0, 0);
      B.thighR.rotation.set(p[C.tRX], 0, p[C.tRZ]); B.shinR.rotation.set(p[C.sR], 0, 0);
    }
    function idlePose(p, t) {
      p.set(BASE);
      const br = Math.sin(t * 2.3), sw = Math.sin(t * 0.9);
      p[C.cRX] += 0.025 * br; p[C.aLZ] += 0.02 * br; p[C.aRZ] -= 0.02 * br; p[C.bY] += 0.004 * br; p[C.kRX] -= 0.015 * br;
      p[C.hRZ] = 0.03 * sw; p[C.bX] = 0.008 * sw; p[C.kRZ] += 0.025 * Math.sin(t * 0.9 + 1); p[C.cRZ] = -0.02 * sw;
      p[C.tLZ] += 0.02 * sw; p[C.tRZ] += 0.02 * sw;
    }
    function runPose(p, ph, m) {
      p.set(BASE);
      const s = Math.sin(ph), c = Math.cos(ph);
      p[C.bY] = m * (0.05 * Math.abs(s) - 0.012); p[C.bRX] = 0.2 * m; p[C.hRY] = 0.16 * s * m; p[C.cRY] = -0.24 * s * m; p[C.hRZ] = 0.04 * c * m;
      p[C.kRX] = -0.3 - 0.1 * m; p[C.kRY] = 0.08 * s * m; p[C.kRZ] = 0.02;
      p[C.tLX] = -0.85 * s * m; p[C.tRX] = 0.85 * s * m;
      p[C.sL] = m * (0.2 + 1.35 * Math.pow(Math.max(0, c), 0.8)); p[C.sR] = m * (0.2 + 1.35 * Math.pow(Math.max(0, -c), 0.8));
      p[C.aLX] = 0.06 + 0.8 * s * m; p[C.aLZ] = 0.17 + 0.1 * m; p[C.fL] = -0.3 - 1.0 * m;
      p[C.aRX] = -0.15 - 0.5 * s * m; p[C.fR] = -0.95 - 0.35 * m; p[C.aRZ] = -0.2 - 0.08 * m;
      p[C.bRZ] = -0.03 * c * m;
    }
    function fidget(p, name, u, env, face) {
      const E = env, ss2 = Math.sin(u * TAU);
      if (name === 'look') { p[C.kRY] += 0.55 * ss2 * E; p[C.kRX] += 0.05 * E; face.lookX = ss2 * 1.2 * E; face.look = E; }
      else if (name === 'bounce') { const h = Math.abs(Math.sin(u * Math.PI * 6)); p[C.bY] += 0.035 * h * E; p[C.sL] += 0.25 * (1 - h) * E; p[C.sR] += 0.25 * (1 - h) * E; p[C.aLZ] += 0.25 * h * E; p[C.aRZ] -= 0.15 * h * E; face.happy = E; }   // full ^ (a held partial blend reads as grey, half-shut eyes)
      else if (name === 'sword') { p[C.aRX] += (-1.05 - p[C.aRX]) * E; p[C.aRY] += (0.35 - p[C.aRY]) * E; p[C.fR] += (-1.45 - p[C.fR]) * E; p[C.wX] += (0.3 + 0.25 * Math.sin(u * 14) - p[C.wX]) * E; p[C.wY] += 0.6 * Math.sin(u * 9) * E; p[C.kRX] += 0.2 * E; p[C.kRY] -= 0.2 * E; face.lookX = -0.6 * E; face.lookY = -0.6 * E; face.look = E; face.grin = 0.6 * E; }
      else if (name === 'wave') { p[C.aLX] += (-2.45 - p[C.aLX]) * E; p[C.aLZ] += (0.55 - p[C.aLZ]) * E; p[C.fL] += (-0.55 + 0.45 * Math.sin(u * Math.PI * 10) - p[C.fL]) * E; p[C.kRZ] += 0.1 * E; face.happy = E; face.grin = E; }
      else if (name === 'stretch') { const k = sstep(0, 0.35, u) * (1 - sstep(0.75, 1, u)); p[C.aLX] += (-2.8 - p[C.aLX]) * k; p[C.aRX] += (-2.7 - p[C.aRX]) * k; p[C.aLZ] += 0.3 * k; p[C.aRZ] -= 0.3 * k; p[C.fL] += (-0.2 - p[C.fL]) * k; p[C.fR] += (-0.3 - p[C.fR]) * k; p[C.kRX] -= 0.25 * k; p[C.bY] += 0.02 * k; p[C.cRX] -= 0.1 * k; face.blink = 0.85 * k; face.o = k; }
      else if (name === 'scratch') { p[C.aLX] += (-2.3 - p[C.aLX]) * E; p[C.aLY] += (0.5 - p[C.aLY]) * E; p[C.aLZ] += (0.35 - p[C.aLZ]) * E; p[C.fL] += (-2.1 + 0.18 * Math.sin(u * 60) - p[C.fL]) * E; p[C.kRZ] -= 0.14 * E; p[C.kRX] += 0.04 * E; face.squint = 0.4 * E; face.lookY = 0.7 * E; face.lookX = -0.4 * E; face.look = E; }
    }

    function update(dt, st) {
      st = st || {};
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      snap = dt < 1e-6; udt = dt;   // update(0, st) = settled pose for st (all blends jump to their targets)
      const t = (S.t += dt);
      const move = clamp(st.move || 0, 0, 1), dead = !!st.dead, spin = !!st.spin && !dead, cheer = !!st.cheer && !dead;
      const idleT = st.idleT || 0;
      S.wRun = dmp(S.wRun, dead ? 0 : move, 12);
      S.ph += dt * (6 + 10 * move) * (S.wRun > 0.02 ? 1 : 0);
      S.wDead = dmp(S.wDead, dead ? 1 : 0, dead ? 4.5 : 7);
      S.wSpin = dmp(S.wSpin, spin ? 1 : 0, 12);
      S.wCheer = dmp(S.wCheer, cheer ? 1 : 0, 9);
      S.hurt = Math.max(clamp(st.hurt || 0, 0, 1), S.hurt - dt * 4);
      // spin angle: keeps turning until the revolution is complete
      if (spin) S.spinA += dt * 19;
      else if (S.spinA > 0) { const nx = Math.ceil(S.spinA / TAU - 1e-4) * TAU; S.spinA = Math.min(nx, S.spinA + dt * 17); if (S.spinA >= nx - 1e-4) S.spinA = 0; }
      if (S.spinA > TAU * 50) S.spinA -= TAU * 40;

      // ── body pose ──
      idlePose(P, t);
      if (S.wRun > 0.001) { runPose(Q, S.ph, Math.max(S.wRun, 0.35)); lerpInto(P, Q, Math.min(1, S.wRun * 2.5)); }
      for (const k in face) face[k] = 0;
      // idle fidgets
      let fidTarget = 0;
      if (idleT > 2.5 && S.wRun < 0.05 && !dead && !spin && !cheer) {
        const ft = idleT - 2.5, per = 4.4, act = 2.6, i = Math.floor(ft / per), u = (ft - i * per) / act;
        if (u < 1) { S.fidI = i % FIDGETS.length; S.fidU = u; fidTarget = 1; }
      }
      S.fidW = dmp(S.fidW, fidTarget, fidTarget ? 6 : 10);
      if (S.fidW > 0.01 && S.fidI >= 0) { const u = S.fidU; fidget(P, FIDGETS[S.fidI], u, S.fidW * sstep(0, 0.18, u) * (1 - sstep(0.82, 1, u)), face); }
      // attack (horizontal slash, alternating direction)
      if (st.attack >= 0 && !dead) { S.atkK = st.attack; S.atkDir = st.swingDir < 0 ? -1 : 1; S.atkW = 1; }
      else S.atkW = dmp(S.atkW, 0, 14);
      if (S.atkW > 0.01 && S.atkK >= 0) {
        const k = S.atkK, A = SLASH[S.atkDir > 0 ? 1 : '-1'];
        if (k < 0.16) keysBetween(Q, P, {}, A.B, easeOut(k / 0.16));
        else if (k < 0.46) { keysBetween(Q, P, A.B, A.C, easeIO((k - 0.16) / 0.3)); }
        else if (k < 0.62) { keysBetween(Q, P, A.C, A.D, easeOut((k - 0.46) / 0.16)); }
        else keysBetween(Q, P, A.D, A.D, 0);
        const w = S.atkW * (1 - sstep(0.62, 1, k));
        lerpInto(P, Q, w, w * (1 - 0.7 * S.wRun));
        if (k > 0.1 && k < 0.7) { face.grin = Math.max(face.grin, w); face.browT = -0.8 * w; face.squint = 0.25 * w; }
      }
      // cast (both hands forward)
      if (st.cast >= 0 && !dead) { S.castK = st.cast; S.castW = 1; } else S.castW = dmp(S.castW, 0, 12);
      if (S.castW > 0.01 && S.castK >= 0) {
        const k = S.castK;
        if (k < 0.28) { keysBetween(Q, P, {}, CAST.G, easeOut(k / 0.28)); }
        else if (k < 0.48) keysBetween(Q, P, CAST.G, CAST.T, easeOut((k - 0.28) / 0.2));
        else keysBetween(Q, P, CAST.T, CAST.T, 0);
        const w = S.castW * (1 - sstep(0.72, 1, k));
        lerpInto(P, Q, w, w * (1 - 0.7 * S.wRun));
        face.o = Math.max(face.o, w * sstep(0.2, 0.4, k)); face.browR = 0.7 * w;
      }
      // whirlwind
      if (S.wSpin > 0.01) {
        Q.set(P); for (const k in SPIN) Q[k] = SPIN[k];
        Q[C.bY] = -0.02 + 0.015 * Math.sin(t * 22);
        lerpInto(P, Q, S.wSpin);
        face.happy = Math.max(face.happy, S.wSpin); face.grin = Math.max(face.grin, S.wSpin); face.blush = S.wSpin * 0.5;
      }
      P[C.bRY] += S.spinA;
      // Victory oath: feet planted, wrist blade to the chest, main blade held aloft.
      if (S.wCheer > 0.01) {
        const j = Math.abs(Math.sin(t * 7.5));
        Q.set(P); for (const k in CHEER) Q[k] = CHEER[k];
        Q[C.bY] = 0.006 * Math.sin(t*2); Q[C.sL] = 0.06; Q[C.sR] = 0.08; Q[C.tLX] = -0.025; Q[C.tRX] = -0.03;
        Q[C.bRX] = 0; Q[C.bZ] = 0;
        lerpInto(P, Q, S.wCheer, S.wCheer);
        face.happy = Math.max(face.happy, S.wCheer); face.grin = Math.max(face.grin, S.wCheer); face.browR = 0.6 * S.wCheer; face.blush = Math.max(face.blush, 0.7 * S.wCheer);
      }
      // hurt recoil (additive)
      const h = S.hurt * (1 - S.wDead);
      if (h > 0.001) {
        P[C.bRX] -= 0.3 * h; P[C.bZ] -= 0.05 * h; P[C.bY] -= 0.02 * h; P[C.kRX] -= 0.12 * h; P[C.cRX] -= 0.12 * h;
        P[C.aLX] -= 0.7 * h; P[C.aLZ] += 0.5 * h; P[C.aRX] -= 0.35 * h; P[C.aRZ] -= 0.35 * h; P[C.fL] -= 0.4 * h;
        P[C.kRZ] += 0.06 * Math.sin(t * 50) * h;
        if (S.hurt > 0.25) { face.wince = 1; face.o = Math.max(face.o, 1); face.browT = 1; face.blush = 0.6; }
      }
      // asleep: curled up on his side, lying left-right on screen (head west) with the face turned to the camera
      if (S.wDead > 0.001) {
        const ry = root.rotation.y, br = Math.sin(t * 1.6), c = Math.cos(ry), s = Math.sin(ry);
        Q.set(BASE);
        Q[C.bRY] = wrapPI(-ry); Q[C.bRZ] = SLEEP.bRZ; Q[C.bRX] = SLEEP.bRX; Q[C.bY] = SLEEP.bY;
        Q[C.bX] = SLEEP.bX * c - SLEEP.bZ * s; Q[C.bZ] = SLEEP.bX * s + SLEEP.bZ * c;
        for (const k in SLEEP.P) Q[k] = SLEEP.P[k];
        Q[C.cRX] += 0.035 * br;
        const w = sstep(0, 1, S.wDead);
        P[C.bRY] = wrapPI(P[C.bRY]);
        lerpInto(P, Q, w);
        face.blink = Math.max(face.blink, w); face.small = w; face.blush = Math.max(face.blush, 0.4 * w);
        S.zzzT -= dt;
        if (dead && S.wDead > 0.85 && S.zzzT <= 0) {
          S.zzzT = 1.3;
          if (typeof FX !== 'undefined' && FX.burst) { headC.getWorldPosition(_v); try { FX.burst('zzz', _v.x, _v.y + 0.25, _v.z, {}); } catch (e) { /* optional */ } }
        }
      }
      // The spellblade casts with his left hand; the sword stays ready at his right side.
      if (S.eq.offhand && S.castW > 0.01 && !dead) {
        const w = S.castW * (1 - sstep(0.72, 1, S.castK));
        P[C.aLX] = lerp(P[C.aLX], -1.55, w); P[C.aLY] = lerp(P[C.aLY], -0.12, w); P[C.fL] = lerp(P[C.fL], -0.08, w);
        P[C.aRX] = lerp(P[C.aRX], -0.15, w); P[C.aRY] = lerp(P[C.aRY], 0, w); P[C.fR] = lerp(P[C.fR], -0.35, w);
      }
      if (S.fixed) S.fixed(P, face);
      applyPose(P);

      // ── face ──
      S.blinkT -= dt;
      if (S.blinkT <= 0) { S.blinkDur = 0.17; S.blinkT = Math.random() < 0.18 ? 0.25 : 1.8 + Math.random() * 3.2; }
      let bl = 0;
      if (S.blinkDur > 0) { S.blinkDur -= dt; const u = 1 - S.blinkDur / 0.17; bl = u < 0.35 ? u / 0.35 : u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5; }
      face.happy = 0; face.grin = 0; face.blush = 0; face.squint = Math.max(face.squint, .28); face.browT = .65; face.browR = -.12;
      const blink = Math.max(bl * (1 - face.happy) * (1 - face.wince), face.blink);
      const wOpen = clamp(1 - face.happy - face.wince, 0, 1);
      const k = snap ? 1 : 1 - Math.exp(-22 * dt);
      S.eyeW.x += (wOpen - S.eyeW.x) * k; S.eyeW.y += (clamp(face.happy * (1 - face.wince), 0, 1) - S.eyeW.y) * k; S.eyeW.z += (face.wince - S.eyeW.z) * k;
      const grin = clamp(face.grin, 0, 1), o = clamp(face.o * (1 - grin), 0, 1), small = clamp(face.small * (1 - grin - o), 0, 1);
      MW[0] = clamp(1 - grin - o - small, 0, 1); MW[1] = grin; MW[2] = o; MW[3] = small;
      S.mouth.x += (MW[0] - S.mouth.x) * k; S.mouth.y += (MW[1] - S.mouth.y) * k; S.mouth.z += (MW[2] - S.mouth.z) * k; S.mouth.w += (MW[3] - S.mouth.w) * k;
      S.brow.x += (face.browR - S.brow.x) * k; S.brow.y += (face.browT - S.brow.y) * k; S.brow.z += (face.blush - S.brow.z) * k;
      S.squint += (face.squint - S.squint) * k;
      // gaze: at the camera when idle (feels like he looks at the player), forward while busy, little saccades
      S.sacT -= dt;
      if (S.sacT <= 0) { S.sacT = 0.7 + Math.random() * 2.2; S.sacX = (Math.random() - 0.5) * 0.5; S.sacY = (Math.random() - 0.5) * 0.3; }
      let lx = 0, ly = 0.1;
      if (typeof camera !== 'undefined') {
        _v.copy(camera.position); headC.worldToLocal(_v);
        if (_v.z > 0.05) { lx = clamp(Math.atan2(_v.x, _v.z) / 0.55, -1, 1); ly = clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)) / 0.7, -1, 1); }
      }
      const busy = clamp(S.wRun * 1.5 + S.atkW + S.castW + S.wSpin, 0, 1);
      lx = lerp(lx * 0.85, 0, busy) + S.sacX * (1 - busy); ly = lerp(ly * 0.85, 0.1, busy) + S.sacY * (1 - busy);
      if (face.look) { lx = lerp(lx, face.lookX, face.look); ly = lerp(ly, face.lookY, face.look); }
      S.lookX = dmp(S.lookX, clamp(lx, -1, 1), 18); S.lookY = dmp(S.lookY, clamp(ly, -1, 1), 18);
      U.fzEye.value.set(blink, S.lookX, S.lookY, S.squint);
      U.fzEyeW.value.copy(S.eyeW); U.fzMouth.value.copy(S.mouth); U.fzBrow.value.copy(S.brow);

      // ── lightsaber: retracts while asleep, re-ignites on waking up ──
      const sb = S.bl;
      sb.dead = dead;
      if (dead && !sb.sleep) { retract(); sb.sleep = true; }
      else if (!dead && sb.sleep) { sb.sleep = false; ignite(); }
      sb.t += dt;
      sb.e = sb.tgt ? Math.min(1, sb.e + dt / 0.3) : Math.max(0, sb.e - dt / 0.22);
      applyBlade();

      root.updateMatrixWorld(true);

      // ── hair spring: tips lag behind head motion, blow back when running, fly out in the spin ──
      headC.getWorldPosition(_v);
      if (!S.hPrev || dt <= 0) { S.hPrev = (S.hPrev || v3()).copy(_v); S.hPrevV.set(0, 0, 0); }
      else {
        _w.copy(_v).sub(S.hPrev).divideScalar(dt);                 // head velocity
        const acc = _a.copy(_w).sub(S.hPrevV).divideScalar(dt); S.hPrevV.copy(_w); S.hPrev.copy(_v);
        if (acc.lengthSq() > 900) acc.setLength(30);
        B.head.getWorldQuaternion(_q).invert(); acc.applyQuaternion(_q);
        const tx = 0, ty = 0.006 * S.wRun, tz = -0.02 * S.wRun - 0.01 * S.wSpin;
        S.hVel.x += (-(S.hOff.x - tx) * 160 - S.hVel.x * 9 - acc.x * 0.3) * dt;
        S.hVel.y += (-(S.hOff.y - ty) * 160 - S.hVel.y * 9 - acc.y * 0.3) * dt;
        S.hVel.z += (-(S.hOff.z - tz) * 160 - S.hVel.z * 9 - acc.z * 0.3) * dt;
        S.hOff.addScaledVector(S.hVel, dt);
        if (S.hOff.length() > 0.035) S.hOff.setLength(0.035);
      }
      HU.fzHOff.value.copy(S.hOff); HU.fzHExp.value = 0.028 * S.wSpin;

      // ── cape ──
      if (S.prevYaw === null) S.prevYaw = root.rotation.y;
      const yr = dt > 0 ? angDiff(S.prevYaw, root.rotation.y) / dt : 0; S.prevYaw = root.rotation.y;
      S.yawRate = damp(S.yawRate, clamp(yr, -12, 12), 6, dt);
      const jump = S.wCheer * Math.abs(Math.sin(t * 7.5));
      S.flow = dmp(S.flow, Math.max(S.wRun * 1.05, S.wSpin * 1.35, S.atkW * 0.3, jump * 0.7, S.hurt * 0.4, S.castW * 0.25), 4.5);
      S.side = dmp(S.side, clamp(-S.yawRate * 0.06, -0.7, 0.7) - 0.5 * S.wSpin, 5);
      if (S.capeU) { S.capeU.cpFlow.value = S.flow; S.capeU.cpSide.value = S.side; S.capeU.cpTime.value = t; }

      handR.getWorldPosition(H.hand);
      (S.eq.offhand && S.eq.offhand.tip ? S.eq.offhand.tip : S.eq.weapon && S.eq.weapon.tip ? S.eq.weapon.tip : tip0).getWorldPosition(H.wandTip);
      (S.eq.weapon && S.eq.weapon.tip ? S.eq.weapon.tip : tip0).getWorldPosition(H.tip);
      if (sb.fx && dt > 0) {   // ignition flash: a few sparkles in the blade's colour at the emitter
        sb.fx = false;
        const w = S.eq.weapon;
        if (w && w.obj.fzBlade && typeof FX !== 'undefined' && FX.burst) {
          w.obj.fzBlade.getWorldPosition(_v);
          try { FX.burst('sparkle', _v.x, _v.y, _v.z, { color: bladeColor(w.item), count: 7 }); } catch (e) { /* optional */ }
        }
      }

      // shader warm-up / thumbnail + portrait pre-rendering (first hero only, real frames only)
      if (BAKE.host === H && !snap && !(typeof ICON !== 'undefined' && ICON)) {
        try { bakeTick(H, st); } catch (e) { if (!BAKE.warned) { BAKE.warned = true; console.warn('FEZA bake', e); } }
      }
    }

    // Lightsaber ignition: the blade grows out of the hilt in 0.3 s (the halo swells for a moment = small flash).
    function ignite() {
      const bl = S.bl;
      if (bl.dead) { bl.sleep = true; H.bladeOn = false; return; }   // asleep: it ignites when he wakes up
      if (bl.tgt === 1 && bl.t < 0.12 && bl.e < 0.6) return;         // already igniting (setEquip and GAME both asked)
      bl.e = 0; bl.tgt = 1; bl.t = 0; bl.fx = true; H.bladeOn = !!S.eq.weapon;
      applyBlade();
    }
    function retract() { const bl = S.bl; bl.tgt = 0; bl.t = 0; bl.fx = false; H.bladeOn = false; }
    function applyBlade() {
      const w = S.eq.weapon, o = w && w.obj, b = o && o.fzBlade;
      if (!b) return;
      const bl = S.bl, x = bl.tgt ? easeOut(bl.e) : sstep(0, 1, bl.e), fl = bl.tgt ? Math.max(0, 1 - bl.t / 0.4) : 0;
      b.visible = x > 0.004; b.scale.set(1, Math.max(0.004, x), 1);
      if (o.fzHalo) { const k = 1 + 1.2 * fl * fl; o.fzHalo.scale.set(k, 1, k); }
      if (o.fzShell) { const k = 1 + 0.4 * fl * fl; o.fzShell.scale.set(k, 1, k); }
    }
    function equipObj(slot, item) {
      const key = itemKey(item);
      let e = S.cache[key];
      if (!e) {
        const obj = buildItem(slot === 'offhand' ? 'weapon' : slot, baseId(item), item.rarity | 0, true);
        obj.traverse(o => { if (o.isMesh) { o.renderOrder = HERO_ORDER; o.frustumCulled = false; } });
        e = S.cache[key] = { key, xkey: slot + ':' + baseId(item), item: plainItem(slot === 'offhand' ? 'weapon' : slot, baseId(item), item.rarity | 0), obj, tip: obj.fzTip || null, capeU: obj.fzCapeU || null };
      }
      return e;
    }
    // Hair under a hat: pull it inside the hat's inner volume; cowlicks only bare-headed.
    const _hm = new THREE.Matrix4();
    function hatUniforms(e) {
      const inn = e && e.obj.fzHatIn, hv = HU.fzHat.value;
      hv.w = e ? 0 : 1;
      if (!inn) { hv.x = 0; return; }
      e.obj.updateMatrix(); inn.h.updateMatrix();
      const m = HU.fzHatI.value.makeTranslation(HC.x, HC.y, HC.z).multiply(e.obj.matrix).multiply(inn.h.matrix)
        .multiply(_hm.compose(v3(...inn.c), new THREE.Quaternion(), v3(...inn.r)));
      HU.fzHatM.value.copy(m).invert();
      hv.set(1, (inn.y0 - inn.c[1]) / inn.r[1], inn.fade / inn.r[1], 0);
    }
    function wearHat(e) {   // visual only (portraits of other hats)
      for (const c of hatSlot.children.slice()) hatSlot.remove(c);
      if (e) hatSlot.add(e.obj);
      hatUniforms(e);
    }
    function swap(slot, item, parent) {
      const key = item ? itemKey(item) : null, cur = S.eq[slot];
      if (cur && cur.key === key) return;
      if (cur) parent.remove(cur.obj);
      S.eq[slot] = null;
      if (!key) return;
      const e = equipObj(slot, item);
      parent.add(e.obj); S.eq[slot] = e;
      if (S.xray) addXrayItem(e.obj, e.xkey);
      setTwins(e.obj, S.xray);
      if (slot === 'weapon') { ignite(); applyBlade(); }   // a new lightsaber in hand ignites (asleep: blade stays in)
    }
    function setTwins(obj, on) { obj.traverse(o => { if (o.userData.xrayTwin) o.visible = on; }); }

    const H = {
      root, tip: v3(), wandTip: v3(), hand: v3(), bones: B, skeleton: skel, slots: { weapon: wSlot, offhand: offSlot, hat: hatSlot, cape: capeSlot },
      update,
      bladeOn: true,       // lightsaber on (or igniting); false while retracted / asleep
      ignite,              // H.ignite(): blade grows out of the hilt (0 → full in 0.3 s) with a small flash
      retract,             // extra: H.retract() puts the blade away (update() re-ignites it only after sleeping)
      setEquip(eq) {
        eq = eq || {};
        swap('weapon', eq.weapon || null, wSlot);
        swap('offhand', eq.offhand || null, offSlot);
        if (!S.eq.weapon) H.bladeOn = false;
        swap('hat', eq.hat || null, hatSlot);
        swap('cape', eq.cape || null, capeSlot);
        hatUniforms(S.eq.hat);
        S.capeU = S.eq.cape ? S.eq.cape.capeU : null;
      },
      setXray(on) {
        S.xray = !!on;
        if (S.xray) for (const k of ['weapon', 'offhand', 'hat', 'cape']) { const e = S.eq[k]; if (e) addXrayItem(e.obj, e.xkey); }
        setTwins(root, S.xray);
      },
      _S: S, _U: U, _mats: { skin: skinMat, hair: hairMat },
      _hatEntry: item => equipObj('hat', item),
      _hat(e) { const prev = S.eq.hat; wearHat(e); return () => wearHat(prev); },
      // portrait helpers: neutral pose + face looking at (lx, ly); returns a restore function
      _neutral(lx, ly) {
        const saved = { bones: bones.map(b => [b.position.clone(), b.rotation.clone()]), w: wSlot.rotation.clone(), ow: offSlot.rotation.clone(), eye: U.fzEye.value.clone(), ew: U.fzEyeW.value.clone(),
          mo: U.fzMouth.value.clone(), br: U.fzBrow.value.clone(), ho: HU.fzHOff.value.clone(), he: HU.fzHExp.value, flow: S.capeU ? S.capeU.cpFlow.value : 0 };
        const p = new Float32Array(NCH); idlePose(p, 0); p[C.kRX] = -0.12; p[C.kRZ] = 0.1; applyPose(p);
        U.fzEye.value.set(0, lx, ly, .28); U.fzEyeW.value.set(1, 0, 0); U.fzMouth.value.set(1, 0, 0, 0); U.fzBrow.value.set(-.12, .65, 0);
        HU.fzHOff.value.set(0, 0, 0); HU.fzHExp.value = 0; if (S.capeU) S.capeU.cpFlow.value = 0;
        return () => {
          bones.forEach((b, i) => { b.position.copy(saved.bones[i][0]); b.rotation.copy(saved.bones[i][1]); }); wSlot.rotation.copy(saved.w); offSlot.rotation.copy(saved.ow);
          U.fzEye.value.copy(saved.eye); U.fzEyeW.value.copy(saved.ew); U.fzMouth.value.copy(saved.mo); U.fzBrow.value.copy(saved.br);
          HU.fzHOff.value.copy(saved.ho); HU.fzHExp.value = saved.he; if (S.capeU) S.capeU.cpFlow.value = saved.flow;
        };
      },
    };
    shadows(root, true, false);
    root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = HERO_ORDER; } });
    // x-ray: one low-poly skinned stand-in for body + hair (shown by setXray)
    const proxy = new THREE.SkinnedMesh(body.xray, xrayBase()); root.add(proxy); proxy.bind(skel, skinMesh.bindMatrix);
    proxy.frustumCulled = false; proxy.castShadow = false; proxy.renderOrder = 20; proxy.userData.xrayTwin = true; proxy.visible = false;
    if (!BAKE.host) {
      BAKE.host = H;
      skinMesh.onBeforeRender = () => { if (!OFF.busy) BAKE.drawn++; };
      queuePortraits(null, false);
    }
    update(0, {});
    return H;
  }

  // ── Portrait: face close-up with the current hat (256², ash-and-bronze seal) ──
  // Cached per hat (the cape and sword are hidden: they don't show in a face close-up). hatItem (optional) renders
  // another hat instead of the worn one (pre-rendering); null = bare-headed.
  const PORTRAITS = {};
  function portrait(H, hatItem) {
    if (!H || !H.root) return null;
    const pic = portraitPic(H, hatItem);
    return pic && pic.url ? pic.url : picNow(pic, 'FEZA.portrait');
  }
  // → { url } when it is cached, else a picture (draw / finish, see picNow) of that hat on Feza
  function portraitPic(H, hatItem) {
    const S = H._S, e = hatItem === undefined || !H._hat ? S.eq.hat : (hatItem ? H._hatEntry(hatItem) : null);
    const hk = e ? e.key : '-';
    if (PORTRAITS[hk]) return { url: PORTRAITS[hk] };
    return {
      draw() {
        offSetup();
        const root = H.root, parent = root.parent, pos = root.position.clone(), rot = root.rotation.clone(), sc = root.scale.clone();
        const unHat = e !== S.eq.hat ? H._hat(e) : null;
        const restore = H._neutral(0.35, 0.15);
        const hidden = [];
        root.traverse(o => { if (o.userData.xrayTwin && o.visible) { o.visible = false; hidden.push(o); } });
        const ws = H.slots.weapon, wv = ws.visible, cs = H.slots.cape, cvis = cs.visible; const os = H.slots.offhand, ov = os.visible; ws.visible = false; os.visible = false; cs.visible = false;
        try {
          OFF.scene.add(root); root.position.set(0, 0, 0); root.rotation.set(0, -0.32, 0); root.scale.set(1, 1, 1); root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(H.slots.hat), top = clamp(box.isEmpty() ? 0 : box.max.y, 1.42, 1.62), ex = (top - 1.42) * 0.5;
          offDraw(v3(0.0, 1.13 + ex, 0.03), 0.39 + ex, v3(-0.4, 0.1, 1), 24);
        } finally {   // always put Feza back where he was
          OFF.scene.remove(root);
          if (parent) parent.add(root);
          root.position.copy(pos); root.rotation.copy(rot); root.scale.copy(sc);
          ws.visible = wv; os.visible = ov; cs.visible = cvis; for (const o of hidden) o.visible = true;
          restore(); if (unHat) unHat(); root.updateMatrixWorld(true);
        }
      },
      finish(cv) {
        if (PORTRAITS[hk]) return PORTRAITS[hk];
        const out = OFF.pc || (OFF.pc = canvasEl(256, 256)), g = out.getContext('2d');   // one reused canvas (no canvas garbage on iPad)
        g.clearRect(0, 0, 256, 256); g.save();
        const gr = g.createRadialGradient(128, 96, 20, 128, 128, 128);
        gr.addColorStop(0, '#72614f'); gr.addColorStop(0.55, '#373332'); gr.addColorStop(1, '#171a20');
        g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.clip();
        g.globalAlpha = 0.22; g.strokeStyle = '#aa8460'; g.lineWidth = 2;
        g.beginPath(); g.arc(128, 128, 118, 0, TAU); g.stroke();
        for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(128 + Math.cos(a) * 111, 128 + Math.sin(a) * 111); g.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); g.stroke(); }
        g.restore(); g.globalAlpha = 1;
        g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
        g.drawImage(cv, 0, 0);
        g.restore();
        return (PORTRAITS[hk] = out.toDataURL('image/png'));
      },
    };
  }

  // ── Warm-up + pre-rendering, so picking up / wearing a new item never freezes the game ──
  // 1) Shaders: every equipment template (all bases × rarities, incl. x-ray twins and cape shadow materials) rides along
  //    with Feza for one rendered frame as a tiny hidden copy — a few new shaders per frame, during the title screen.
  // 2) Thumbnails / portraits of what Feza owns (worn + bag: the bag/wardrobe and the hat portraits show only those) and of
  //    every item that appears on the ground (it jumps the queue, so its card and portrait are ready before Feza reaches it).
  //    One step per calm drawn frame (not mid-swing, no creature chasing him; ground cards also in a fight): draw one picture
  //    and start its asynchronous read-back (RB above), a frame or more later finish it. Anything else is made on demand
  //    (a direct ITEMS.thumb / FEZA.portrait call draws it right away).
  //    (Until Round 4 all 64 base × rarity cards were baked with synchronous read-backs every other frame for ~2 s, right when
  //    play began: GAME.update spikes of 3–15 ms, also after Devam Et into Kefir Vadisi.)
  // Driven from the first hero's update(); nothing happens at load time or on frames that are not drawn.
  const BAKE = { host: null, started: false, warmQ: [], cur: null, seen: false, sigs: new Set(), q: [], keys: new Set(), pend: [], drawn: 0, last: -9, scan: 0,
    bag: undefined, bagN: 0, wait: 0, warned: false };
  function queueJob(k, job, front) {
    if (job.kind === 'thumb' ? THUMBS[k.slice(2)] : PORTRAITS[k.slice(2)]) return;
    job.k = k;
    if (BAKE.keys.has(k)) {
      if (!front) return;
      const i = BAKE.q.findIndex(j => j.k === k); if (i >= 0) { BAKE.q.splice(i, 1); BAKE.q.unshift(job); }
      return;
    }
    BAKE.keys.add(k); if (front) BAKE.q.unshift(job); else BAKE.q.push(job);
  }
  const plainItem = (slot, id, r) => ({ slot, base: id, rarity: r });
  function bagNow() {   // defensive: GAME may not exist (test pages)
    try { const b = typeof GAME !== 'undefined' && GAME && GAME.P && GAME.P.bag; return Array.isArray(b) ? b : null; } catch (e) { return null; }
  }
  // urgent (front) jobs are cards/portraits of an item lying on the ground: they may run mid-swing (asynchronous only)
  function queueThumb(it, front) {
    const slot = BASES[it.slot] ? it.slot : 'weapon', id = baseId(it), r = clamp(it.rarity | 0, 0, 3);
    queueJob('t:' + tplKey(slot, id, r), { kind: 'thumb', item: plainItem(slot, id, r), urgent: !!front }, front);
  }
  // the worn hat (or bare head) + every hat in the bag
  function queuePortraits(hat, bag = true) {
    const add = it => queueJob('p:' + (it ? itemKey(it) : '-'), { kind: 'portrait', hat: it ? plainItem('hat', baseId(it), it.rarity | 0) : null });
    add(hat);
    const b = bag && bagNow();
    if (b) for (const it of b) if (it && it.slot === 'hat') add(it);
  }
  // what he wears + everything in his bag (cards first, then the hat portraits)
  function queueOwned(H) {
    const b = bagNow();
    BAKE.scan = BAKE.drawn; BAKE.bag = b; BAKE.bagN = b ? b.length : 0;
    for (const sl of ['weapon', 'offhand', 'hat', 'cape']) { const e = H._S.eq[sl]; if (e && e.item) queueThumb(e.item); }
    if (b) for (const it of b) if (it && it.slot) queueThumb(it);
    const e = H._S.eq.hat; queuePortraits(e ? e.item : null);
  }
  // Items handed out by ITEMS.model: once one is really lying in the scene (not a warm-up copy that was already removed),
  // its card picture — and a hat's portrait — jump the queue.
  function checkPending() {
    for (let i = BAKE.pend.length - 1; i >= 0; i--) {
      const p = BAKE.pend[i];
      let top = p.o; while (top.parent) top = top.parent;
      if (top === scene) {
        queueThumb(plainItem(p.slot, p.id, p.r), true);
        if (p.slot === 'hat') queueJob('p:' + tplKey(p.slot, p.id, p.r), { kind: 'portrait', hat: plainItem(p.slot, p.id, p.r), urgent: true }, true);
        BAKE.pend.splice(i, 1);
      } else if (++p.n > 3) BAKE.pend.splice(i, 1);
    }
  }
  const matSig = m => m.type + '|' + (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + '|' + !!m.map + !!m.normalMap + !!m.emissiveMap +
    '|' + m.vertexColors + m.flatShading + m.side + (m.alphaTest > 0) + m.transparent;
  function warm() {
    if (BAKE.started) return;
    BAKE.started = true;
    const list = [];
    for (const slot of ['weapon', 'hat', 'cape']) for (const b of BASES[slot]) for (let r = 0; r < 4; r++) list.push({ slot, id: b.id, r, o: (b.legendary ? 20 : b.minLvl) * 4 + r });
    list.sort((x, y) => x.o - y.o);
    BAKE.warmQ = list;
  }
  function warmStep(H) {
    if (BAKE.cur) {
      if (!BAKE.seen && ++BAKE.wait < 40) return;   // not drawn yet (give up after a while: shaders then compile on first use)
      if (BAKE.cur.parent) BAKE.cur.parent.remove(BAKE.cur);
      BAKE.cur = null;
    }
    const grp = new THREE.Group(), t0 = performance.now();
    let fresh = 0, n = 0;
    while (BAKE.warmQ.length && fresh < 4 && n < 3 && performance.now() - t0 < 8) {
      const j = BAKE.warmQ.shift(), tpl = template(j.slot, j.id, j.r), xk = j.slot + ':' + j.id;
      let nf = 0, capeT = null;
      tpl.traverse(o => {
        if (!o.isMesh) return;
        if (o.name === 'fzCape') capeT = o;
        for (const m of [o.material, o.customDepthMaterial]) if (m) { const sg = matSig(m); if (!BAKE.sigs.has(sg)) { BAKE.sigs.add(sg); nf++; } }
      });
      if (!nf && XGEO[xk]) continue;   // nothing new to compile
      const c = tpl.clone();
      if (capeT) c.traverse(o => { if (o.name === 'fzCape') o.customDepthMaterial = capeT.customDepthMaterial; });
      addXrayItem(c, xk, capeT && capeT.fzXrayPatch, capeT);
      grp.add(c); fresh += nf; n++;
    }
    if (!n) return;
    let first = null;
    grp.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (!o.userData.xrayTwin) o.castShadow = true; if (!first) first = o; } });
    grp.scale.setScalar(1e-4); grp.position.set(0, 0.1, 0);   // inside the chest: never visible
    BAKE.seen = false; BAKE.wait = 0; first.onBeforeRender = () => { BAKE.seen = true; };
    H.bones.chest.add(grp); BAKE.cur = grp;
  }
  // The next queued picture that is still missing: drawn now and read back asynchronously, or made synchronously
  // (async false = prebake, or the job already missed its asynchronous read-back once).
  function bakeJob(H, async) {
    while (BAKE.q.length) {
      const j = BAKE.q.shift();
      BAKE.keys.delete(j.k);
      const pic = j.kind === 'thumb' ? thumbPic(j.item) : H ? portraitPic(H, j.hat) : null;
      if (!pic || pic.url) continue;   // made meanwhile
      if (!async || j.sync || RB.off || RB.pic) { picNow(pic, 'FEZA bake'); return; }
      try {
        pic.draw();
        let ok = false;
        try { ok = rbStart(pic, j); } catch (e) { RB.off = true; console.warn('FEZA bake async', e); }
        if (!ok) pic.finish(offRead());
      } catch (e) { console.warn('FEZA bake', e); }
      return;
    }
  }
  function bakeTick(H, st) {
    if (!BAKE.drawn) return;   // wait for the first real frame (no work in synchronous pre-rolls)
    if (!BAKE.started) warm();
    if (BAKE.pend.length) checkPending();
    if (BAKE.warmQ.length || BAKE.cur) { warmStep(H); return; }
    if (BAKE.drawn === BAKE.last || renderer.getContext().isContextLost()) return;   // one step per drawn frame
    // calm: not in the middle of a swing and no creature after him (a card for the ground may go on anyway: asynchronous only)
    const calm = () => !(st.attack >= 0 || st.cast >= 0 || st.spin || st.hurt > 0.05) && !chased();
    if (RB.pic) {   // a picture on its way back from the GPU
      if (rbPoll() === 1 && (RB.job.urgent || calm())) { BAKE.last = BAKE.drawn; rbFinish(); }
      return;
    }
    const b = bagNow();
    if (b !== BAKE.bag || (b && b.length !== BAKE.bagN) || BAKE.drawn - BAKE.scan > 120) queueOwned(H);
    const j = BAKE.q[0];
    if (!j || !((j.urgent && !j.sync && !RB.off) || calm())) return;
    BAKE.last = BAKE.drawn;
    bakeJob(H, true);
  }
  function chased() {   // defensive: GAME may not exist (test pages)
    try {
      const E = typeof GAME !== 'undefined' && GAME && GAME.enemies;
      if (Array.isArray(E)) for (const e of E) if (e && e.aggro && !e.dead) return true;
    } catch (e) { /* optional */ }
    return false;
  }
  // Explicit hooks: FEZA.warm() starts the warm-up early; ITEMS.prebake(n) makes up to n queued pictures right now
  // (e.g. when the bag opens) and returns how many are still waiting.
  function prebake(n = 1) {
    if (RB.pic && n > 0) rbDrop(false);   // the picture in flight: redo it now
    for (let i = 0; i < n && BAKE.q.length; i++) bakeJob(BAKE.host, false);
    return BAKE.q.length;
  }

  // ── ITEMS ──
  const BASES = {
    // Existing saber ids stay unchanged for old saves; wands are wizard-only and boss gifts never enter the random pool.
    weapon: [{ id: 'tahta', ad: 'Eğitim Işın Kılıcı', minLvl: 0 }, { id: 'demir', ad: 'Mavi Işın Kılıcı', minLvl: 1 }, { id: 'kristal', ad: 'Yeşil Işın Kılıcı', minLvl: 3 },
      { id: 'ates', ad: 'Kırmızı Işın Kılıcı', minLvl: 5 }, { id: 'yildiz', ad: 'Mor Işın Kılıcı', minLvl: 7 }, { id: 'gokkusagi', ad: 'Gökkuşağı Işın Kılıcı', minLvl: 0, legendary: true },
      { id: 'findik', ad: 'Fındık Değneği', minLvl: 0, heroClass: 'wizard' }, { id: 'mese', ad: 'Meşe Değneği', minLvl: 1, heroClass: 'wizard' },
      { id: 'ay', ad: 'Ay Işığı Değneği', minLvl: 3, heroClass: 'wizard' }, { id: 'kor', ad: 'Kor Değneği', minLvl: 5, heroClass: 'wizard' },
      { id: 'yildizdegnek', ad: 'Yıldız Değneği', minLvl: 7, heroClass: 'wizard' }, { id: 'gokdegnek', ad: 'Gökkuşağı Değneği', minLvl: 0, heroClass: 'wizard', legendary: true },
      { id: 'lavkilic', ad: 'Lav Kabuğu Işın Kılıcı', minLvl: 0, boss: true }, { id: 'lavdegnek', ad: 'Lav Kabuğu Değneği', minLvl: 0, boss: true, heroClass: 'wizard' },
      { id: 'ejderkilic', ad: 'Ejderha Kanadı Işın Kılıcı', minLvl: 0, boss: true }, { id: 'ejderdegnek', ad: 'Ejderha Kanadı Değneği', minLvl: 0, boss: true, heroClass: 'wizard' }],
    hat: [{ id: 'migfer', ad: 'Şövalye Miğferi', minLvl: 0 }, { id: 'sihirbaz', ad: 'Sihirbaz Şapkası', minLvl: 2 }, { id: 'kovboy', ad: 'Kovboy Şapkası', minLvl: 3 },
      { id: 'korsan', ad: 'Korsan Şapkası', minLvl: 4 }, { id: 'tac', ad: 'Altın Taç', minLvl: 0, legendary: true },
      { id: 'joletac', ad: 'Jöle Kralının Tacı', minLvl: 0, boss: true }, { id: 'kostebekfener', ad: 'Köstebek Ustanın Feneri', minLvl: 0, boss: true }],
    cape: [{ id: 'kirmizi', ad: 'Kırmızı Pelerin', minLvl: 0 }, { id: 'mavi', ad: 'Yıldızlı Pelerin', minLvl: 2 }, { id: 'yesil', ad: 'Yaprak Pelerin', minLvl: 3 },
      { id: 'mor', ad: 'Sihirli Pelerin', minLvl: 5 }, { id: 'gokkusagi', ad: 'Gökkuşağı Pelerini', minLvl: 0, legendary: true },
      { id: 'kefirkopuk', ad: 'Kefir Köpüğü Pelerini', minLvl: 0, boss: true }],
  };
  for (const [id, ad, minLvl] of [['buzkilic', 'Buz Kristali Işın Kılıcı', 2], ['guniskilic', 'Güneş Işın Kılıcı', 4], ['dalga', 'Dalga Işın Kılıcı', 6]]) BASES.weapon.push({ id, ad, minLvl });
  for (const [id, ad, minLvl] of [['mercan', 'Mercan Değneği', 2], ['bulut', 'Bulut Değneği', 4], ['cicek', 'Çiçek Değneği', 6]]) BASES.weapon.push({ id, ad, minLvl, heroClass: 'wizard' });
  BASES.hat.push({ id: 'bulutbere', ad: 'Bulut Beresi', minLvl: 1 }, { id: 'yaprakbaslik', ad: 'Orman Gezgini Başlığı', minLvl: 4 });
  BASES.cape.push({ id: 'deniz', ad: 'Deniz Dalgası Pelerini', minLvl: 1 }, { id: 'gunes', ad: 'Güneş Pelerini', minLvl: 4 });
  // (Round 6) 14 new ordinary looks (zone item levels: orman 1 · kefir 2 · mağara 4 · yanardağ 6 · şehir 7 · kale 8)
  for (const [id, ad, minLvl] of [['pamukseker', 'Pamuk Şeker Işın Kılıcı', 1], ['kalp', 'Kalpli Işın Kılıcı', 2], ['uzay', 'Uzay Roketi Işın Kılıcı', 5], ['kuyruklu', 'Kuyruklu Yıldız Işın Kılıcı', 8]]) BASES.weapon.push({ id, ad, minLvl });
  for (const [id, ad, minLvl] of [['lolipop', 'Lolipop Değneği', 1], ['kedipati', 'Kedi Patisi Değneği', 3], ['gezegen', 'Gezegen Değneği', 7]]) BASES.weapon.push({ id, ad, minLvl, heroClass: 'wizard' });
  for (const [id, ad, minLvl] of [['kedikulak', 'Kedi Kulaklı Bere', 1], ['dondurma', 'Dondurma Şapkası', 2], ['yunikorn', 'Yunikorn Tacı', 4], ['astronot', 'Astronot Kaskı', 6]]) BASES.hat.push({ id, ad, minLvl });
  for (const [id, ad, minLvl] of [['sekerpelerin', 'Şeker Pelerini', 2], ['panda', 'Panda Pelerini', 3], ['galaksi', 'Galaksi Pelerini', 7]]) BASES.cape.push({ id, ad, minLvl });
  for (const slot of Object.keys(BASES)) for (const b of BASES[slot]) if (b.boss) b.classLock = b.heroClass || 'warrior';
  for (const [slot, id, ad, classLock] of [
    ['weapon', 'jolesihir', 'Jöle Kralının Köpük Değneği', 'wizard'], ['cape', 'kefirsihir', 'Kefir Devinin Sihirli Pelerini', 'wizard'],
    ['hat', 'magarasihir', 'Köstebek Ustanın Kristal Tacı', 'wizard'],
    ['weapon', 'joleikiz', 'Jöle Kralının Neşe Kılıcı', 'hybrid'], ['weapon', 'kefirikiz', 'Kefir Devinin Köpük Dalı', 'hybrid'],
    ['weapon', 'magaraikiz', 'Köstebek Ustanın Kristal Dalı', 'hybrid'], ['weapon', 'lavikiz', 'Lav Kaplumbağasının Güneş Kılıcı', 'hybrid'],
    ['weapon', 'ejderikiz', 'Ejderhanın Dostluk Değneği', 'hybrid'],
    // (Round 5) the Huysuz Şövalye's treasures
    ['hat', 'sovalyemigfer', 'Şövalyenin Tüylü Miğferi', 'warrior'], ['cape', 'sovalyesihir', 'Şövalyenin Arma Pelerini', 'wizard'],
    ['weapon', 'sovalyeikiz', 'Şövalyenin Turnuva Kılıcı', 'hybrid'],
  ]) BASES[slot].push({ id, ad, minLvl: 0, boss: true, classLock, ...(WAND[id] ? { heroClass: 'wizard' } : {}) });
  const CURSED_NAMES = {"tahta":"Son İrade","demir":"Merhametsiz Hüküm","kristal":"Mezar Kristali","ates":"Kanlı Kor Kılıcı","yildiz":"Boşluk Kılıcı","gokkusagi":"Son Hüküm","findik":"Kemik Asa","mese":"Kuru Kök Asası","ay":"Ölü Ay Asası","kor":"Kül Asası","yildizdegnek":"Uçurum Asası","gokdegnek":"Hiçlik Asası","lavkilic":"Kül Muhafızının Kılıcı","lavdegnek":"Kül Muhafızının Asası","ejderkilic":"Gece Yutanın Dişi","ejderdegnek":"Gece Yutanın Asası","migfer":"Yemin Miğferi","sihirbaz":"Cellat Başlığı","kovboy":"Mezar Bekçisi Miğferi","korsan":"Korsan Celladın Maskesi","tac":"Lanet Tacı","joletac":"Çürük Taç","kostebekfener":"Mezar Kazıcısının Maskesi","kirmizi":"Kan Yemini Pelerini","mavi":"Gece Kefeni","yesil":"Çürük Orman Kefeni","mor":"Uçurum Pelerini","kefirkopuk":"Veba Rahibinin Kefeni","buzkilic":"Ölü Buz Kılıcı","guniskilic":"Sönmüş Güneş","dalga":"Boğulanların Kılıcı","mercan":"Boğulmuş Kemik Asası","bulut":"Duman Asası","cicek":"Diken Asası","bulutbere":"Kül Miğferi","yaprakbaslik":"Diken Bekçisinin Maskesi","deniz":"Boğulmuşların Kefeni","gunes":"Sönmüş Güneş Kefeni","pamukseker":"Et Yiyen Kılıç","kalp":"Masumların İntikamı","uzay":"Uçurum Mızrağı","kuyruklu":"Kıyamet Kılıcı","lolipop":"Ruh Kancası","kedipati":"Pençe Asası","gezegen":"Kara Küre Asası","kedikulak":"Boynuzlu Cellat Miğferi","dondurma":"Kemik Diken Miğferi","yunikorn":"Tek Boynuzlu Lanet Miğferi","astronot":"Boşluk Maskesi","sekerpelerin":"Yırtık Cellat Kefeni","panda":"Kemik Kefeni","galaksi":"Yıldızsız Gece","jolesihir":"Çürük Tacın Asası","kefirsihir":"Veba Rahibinin Pelerini","magarasihir":"Mezar Kazıcısının Tacı","joleikiz":"Çürük Tacın Hükmü","kefirikiz":"Veba Rahibinin Kancası","magaraikiz":"Mezar Kazıcısının Pençesi","lavikiz":"Kül Muhafızının Hükmü","ejderikiz":"Gece Yutanın Yemini","sovalyemigfer":"Yeminbozanın Miğferi","sovalyesihir":"Yeminbozanın Kefeni","sovalyeikiz":"Yeminbozanın Kılıcı"};
  for (const slot of Object.keys(BASES)) for (const b of BASES[slot]) b.ad = slot === 'cape' && b.id === 'gokkusagi' ? 'Son Hükmün Kefeni' : CURSED_NAMES[b.id];
  const MULT = [1, 1.35, 1.75, 2.3];
  let UID = (Date.now() % 1e9) * 10;
  function make(slot, id, rarity = 0, ilvl = 1) {
    if (!BASES[slot]) slot = 'weapon';
    const b = BASES[slot].find(q => q.id === id) || BASES[slot][0];
    rarity = clamp(rarity | 0, 0, 3); ilvl = Math.max(1, ilvl | 0);
    return { uid: ++UID, slot, base: b.id, rarity, ilvl, power: Math.round((ilvl * 2 + 4) * MULT[rarity]), ad: b.ad + (rarity >= 2 ? ' ✦' : '') };
  }
  // ITEMS.nameOf(item) → today's display name (old saves still carry e.g. 'Demir Kılıç ✦' in item.ad)
  function nameOf(it) {
    if (!it) return '';
    const L = BASES[it.slot], b = L && L.find(q => q.id === baseId(it));
    return b ? b.ad + ((it.rarity | 0) >= 2 ? ' ✦' : '') : (it.ad || '');
  }
  function allowed(item, heroClass = 'warrior') {
    if (!item) return false;
    const list = BASES[item.slot], base = list && list.find(q => q.id === baseId(item));
    return !!base && (!base.classLock || base.classLock === heroClass) && (item.slot !== 'weapon' || heroClass === 'hybrid' || (base.heroClass || 'warrior') === (heroClass === 'wizard' ? 'wizard' : 'warrior'));
  }
  function bossReward(type, heroClass = 'warrior', ilvl = 1) {
    const wizard = heroClass === 'wizard', gift = heroClass === 'hybrid' ? {
      kraljole: ['weapon', 'joleikiz'], kefirdev: ['weapon', 'kefirikiz'], kostebekusta: ['weapon', 'magaraikiz'],
      lavkaplumbaga: ['weapon', 'lavikiz'], sovalye: ['weapon', 'sovalyeikiz'], ejderha: ['weapon', 'ejderikiz'],
    }[type] : {
      kraljole: wizard ? ['weapon', 'jolesihir'] : ['hat', 'joletac'], kefirdev: ['cape', wizard ? 'kefirsihir' : 'kefirkopuk'], kostebekusta: ['hat', wizard ? 'magarasihir' : 'kostebekfener'],
      lavkaplumbaga: ['weapon', wizard ? 'lavdegnek' : 'lavkilic'], sovalye: wizard ? ['cape', 'sovalyesihir'] : ['hat', 'sovalyemigfer'],
      ejderha: ['weapon', wizard ? 'ejderdegnek' : 'ejderkilic'],
    }[type];
    return gift ? make(gift[0], gift[1], 3, ilvl) : null;
  }
  function roll(ilvl = 1, bias = 0, rnd = Math.random, heroClass = 'warrior') {
    ilvl = Math.max(1, ilvl | 0);
    const s = rnd(), slot = s < 0.4 ? 'weapon' : s < 0.7 ? 'hat' : 'cape', b = clamp(bias || 0, 0, 2);
    const w = [60, 28, 10, 2].map((v, i) => v * Math.pow(1 + b, i));
    let x = rnd() * (w[0] + w[1] + w[2] + w[3]), r = 0;
    while (r < 3 && x >= w[r]) { x -= w[r]; r++; }
    const list = BASES[slot].filter(q => !q.boss && allowed({ slot, base: q.id }, heroClass)), leg = list.filter(q => q.legendary), pool = list.filter(q => !q.legendary && q.minLvl <= ilvl);
    let base;
    if (r === 3 && leg.length && rnd() < 0.65) base = leg[Math.floor(rnd() * leg.length)];
    else {   // newer bases are a bit more likely, so progress shows new shiny things
      let tot = 0; for (const q of pool) tot += 1 + q.minLvl * 0.8;
      let y = rnd() * tot; base = pool[pool.length - 1];
      for (const q of pool) { y -= 1 + q.minLvl * 0.8; if (y <= 0) { base = q; break; } }
    }
    return make(slot, base.id, r, ilvl);
  }
  function model(item) {
    if (!item) return new THREE.Group();
    const slot = BASES[item.slot] ? item.slot : 'weapon', id = baseId(item), r = clamp(item.rarity | 0, 0, 3);
    const tpl = template(slot, id, r);
    const o = tpl.clone();
    if (tpl.fzDepth) o.traverse(m => { if (m.name === 'fzCape') m.customDepthMaterial = tpl.fzDepth; });
    if (BAKE.host && BAKE.pend.length < 32) BAKE.pend.push({ o, slot, id, r, n: 0 });   // see checkPending()
    return o;
  }
  // ITEMS.thumb(item) → dataURL (rendered now if needed). ITEMS.thumb(item, true) → cached dataURL or null (then queued).
  const THUMBS = {};
  function thumb(item, lazy) {
    if (!item) return null;
    const pic = thumbPic(item);
    if (pic.url) return pic.url;
    if (lazy) { queueThumb(item, true); return null; }
    return picNow(pic, 'ITEMS.thumb');
  }
  // → { url } when it is cached, else a picture (draw / finish, see picNow) of that base + rarity
  function thumbPic(item) {
    const slot = BASES[item.slot] ? item.slot : 'weapon', id = baseId(item), r = clamp(item.rarity | 0, 0, 3), k = tplKey(slot, id, r);
    if (THUMBS[k]) return { url: THUMBS[k] };
    return {
      draw() {
        offSetup();
        const o = template(slot, id, r).clone(), wrap = new THREE.Group(); wrap.add(o); OFF.scene.add(wrap);
        let dir = v3(0.25, 0.35, 1), fov = 28;
        const b = slot === 'weapon' ? o.getObjectByName('fzBlade') : null;
        if (slot === 'weapon') { o.rotation.set(0, 0.35, -Math.PI / 4); if (b) b.scale.set(1.5, 0.6, 1.5); }   // bolder blade on a small card
        else if (slot === 'hat') { o.rotation.set(0.12, 0.55, 0); dir = v3(0.1, 0.55, 1); }
        else { o.rotation.set(0, Math.PI + 0.35, 0); dir = v3(0, 0.15, 1); }
        // (Round 6) a lightsaber card frames the hilt + the lower 60 % of the blade (bigger hilts: the looks tell apart), the blade
        // runs on out of the corner; its colour ramp is squeezed into that visible part
        wrap.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(wrap), c = v3(), sz = v3(); box.getCenter(c); box.getSize(sz);
        if (b) { b.scale.y = 1; wrap.updateMatrixWorld(true); }
        const wk = SB_U.k.value, wg = SB_U.grad.value, wr = SB_U.ramp.value;
        if (slot === 'weapon') { SB_U.k.value = 0.45; SB_U.grad.value = 1.15; SB_U.ramp.value = 1 / 0.6; }
        try { offDraw(c, Math.max(sz.x, sz.y, sz.z) * (slot === 'weapon' ? 0.46 : 0.56), dir, fov); }
        finally { SB_U.k.value = wk; SB_U.grad.value = wg; SB_U.ramp.value = wr; OFF.scene.remove(wrap); }
      },
      finish(cv) {
        if (THUMBS[k]) return THUMBS[k];
        const out = OFF.tc || (OFF.tc = canvasEl(128, 128)), g = out.getContext('2d');   // one reused canvas (no canvas garbage on iPad)
        g.clearRect(0, 0, 128, 128); g.save();
        g.imageSmoothingQuality = 'high';
        if (r >= 1) { g.shadowColor = rarCol(r); g.shadowBlur = r >= 2 ? 14 : 9; g.drawImage(cv, 4, 4, 120, 120); }
        g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
        g.drawImage(cv, 4, 4, 120, 120);
        g.restore();
        if (slot === 'weapon' && !WAND[id]) {   // the blade fades out into the top-right corner (instead of a hard cut)
          g.save(); g.globalCompositeOperation = 'destination-out';
          const fd = g.createLinearGradient(96, 32, 124, 4); fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)');
          g.fillStyle = fd; g.fillRect(64, 0, 64, 64); g.restore();
        }
        if (CREST_OF[id]) crest(g, CREST_OF[id], 110, 110, 15);
        return (THUMBS[k] = out.toDataURL('image/png'));
      },
    };
  }
  // (Round 6) boss treasures carry their boss's round crest in the card's corner (30 px on the 128 px card):
  // Kral Jöle crown · Kefir Devi bottle · Usta Köstebek drill hat · Lav Kaplumbağası hex shell · Şövalye horseshoe · Ejderha wing-heart
  const CREST_OF = {}, CREST_COL = { kraljole: '#6f5e49', kefirdev: '#526348', kostebekusta: '#6b5547', lavkaplumbaga: '#a24a2d', sovalye: '#555d69', ejderha: '#674958' };
  for (const [type, ids] of Object.entries({ kraljole: 'joletac jolesihir joleikiz', kefirdev: 'kefirkopuk kefirsihir kefirikiz', kostebekusta: 'kostebekfener magarasihir magaraikiz',
    lavkaplumbaga: 'lavkilic lavdegnek lavikiz', sovalye: 'sovalyemigfer sovalyesihir sovalyeikiz', ejderha: 'ejderkilic ejderdegnek ejderikiz' })) for (const id of ids.split(' ')) CREST_OF[id] = type;
  function crest(g, type, x, y, R) {
    g.save(); g.translate(x, y);
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 3; g.shadowOffsetY = 1;
    g.fillStyle = '#9b8669'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.shadowColor = 'transparent';
    const bg = g.createRadialGradient(-R * 0.3, -R * 0.4, 1, 0, 0, R); bg.addColorStop(0, mixCol(CREST_COL[type], '#ffffff', 0.12).getStyle()); bg.addColorStop(1, CREST_COL[type]);
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R - 2.2, 0, TAU); g.fill();
    const k = R / 15; g.scale(k, k); g.lineJoin = 'round'; g.lineCap = 'round';
    const W = '#dbceb3';
    g.fillStyle = W; g.strokeStyle = W;
    if (type === 'kraljole') {   // crown
      g.beginPath(); g.moveTo(-8, 5); g.lineTo(-8.5, -4); g.lineTo(-4, 0); g.lineTo(0, -7); g.lineTo(4, 0); g.lineTo(8.5, -4); g.lineTo(8, 5); g.closePath(); g.fill();
      g.fillStyle = CREST_COL[type]; for (const xx of [-4, 0, 4]) { g.beginPath(); g.arc(xx, 2.5, 1.3, 0, TAU); g.fill(); }
    } else if (type === 'kefirdev') {   // plague mask and beak
      g.beginPath(); g.moveTo(0,-10); g.lineTo(8,-5); g.lineTo(7,3); g.lineTo(0,10); g.lineTo(-7,3); g.lineTo(-8,-5); g.closePath(); g.fill();
      g.fillStyle=CREST_COL[type]; for(const sd of [-1,1]){g.beginPath();g.ellipse(sd*3.7,-2,2.3,1.5,sd*.3,0,TAU);g.fill();}g.beginPath();g.moveTo(-2.5,1);g.lineTo(0,8);g.lineTo(2.5,1);g.closePath();g.fill();
    } else if (type === 'kostebekusta') {   // miner's hat with a drill on top
      g.beginPath(); g.moveTo(-9, 6); g.quadraticCurveTo(-9, -3, 0, -3.5); g.quadraticCurveTo(9, -3, 9, 6); g.closePath(); g.fill();
      g.fillRect(-10.5, 5, 21, 2.6);
      g.beginPath(); g.moveTo(-2.4, -3.5); g.lineTo(0, -10.5); g.lineTo(2.4, -3.5); g.closePath(); g.fill();
      g.strokeStyle = CREST_COL[type]; g.lineWidth = 1; g.beginPath(); g.moveTo(-1.7, -5.5); g.lineTo(1.4, -6.6); g.moveTo(-1, -7.8); g.lineTo(0.9, -8.5); g.stroke();
      g.fillStyle = '#ad7651'; g.beginPath(); g.arc(0, 1.5, 2.4, 0, TAU); g.fill();
    } else if (type === 'lavkaplumbaga') {   // hexagon shell
      const hex = (cx, cy, r) => { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); };
      g.beginPath(); g.ellipse(0, 0.5, 10, 8, 0, 0, TAU); g.fill();
      g.fillStyle = CREST_COL[type]; hex(0, 0.5, 3.6); g.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; hex(Math.cos(a) * 6.2, 0.5 + Math.sin(a) * 5, 1.9); g.fill(); }
    } else if (type === 'sovalye') {   // horseshoe
      g.lineWidth = 4.2; g.beginPath(); g.arc(0, -1, 6.5, Math.PI * 0.82, Math.PI * 2.18, false); g.stroke();
      g.fillStyle = CREST_COL[type]; for (const a of [0.95, 1.3, 1.7, 2.05]) { g.beginPath(); g.arc(Math.cos(a * Math.PI) * 6.5, -1 + Math.sin(a * Math.PI) * 6.5, 0.9, 0, TAU); g.fill(); }
    } else {   // horned dragon skull and torn wings
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 3, -1); g.quadraticCurveTo(sd * 9, -9, sd * 11, -4); g.quadraticCurveTo(sd * 8, -4, sd * 9, 0); g.quadraticCurveTo(sd * 6, -1, sd * 5, 2); g.closePath(); g.fill(); }
      g.beginPath();g.moveTo(-5,-5);g.lineTo(-7,-10);g.lineTo(-1,-6);g.lineTo(1,-6);g.lineTo(7,-10);g.lineTo(5,-5);g.lineTo(5,1);g.lineTo(2,7);g.lineTo(-2,7);g.lineTo(-5,1);g.closePath();g.fill();
      g.fillStyle=CREST_COL[type];for(const sd of [-1,1]){g.beginPath();g.ellipse(sd*2.5,-1,1.7,1,sd*.3,0,TAU);g.fill();}g.fillRect(-1,3,2,3);
    }
    g.restore();
  }
  const ITEMS = {
    RARITY, BASES,
    make, roll, model, thumb, prebake, nameOf, allowed, bossReward,
    adaptLegacy(item, heroClass) {
      if (!item || heroClass !== 'wizard') return item;
      const type = { joletac: 'kraljole', kefirkopuk: 'kefirdev', kostebekfener: 'kostebekusta' }[baseId(item)];
      if (!type) return item;
      const gift = bossReward(type, heroClass, item.ilvl);
      return { ...item, slot: gift.slot, base: gift.base, ad: nameOf({ ...gift, rarity: item.rarity }) };
    },
    isWand: item => !!item && item.slot === 'weapon' && !!WAND[baseId(item)],
    bladeColor,   // ITEMS.bladeColor(item | baseId) → '#rrggbb' (rainbow blade: its current colour)
    starter: (heroClass = 'warrior') => ({ weapon: make('weapon', heroClass === 'wizard' ? 'findik' : 'tahta', 0, 1), ...(heroClass === 'hybrid' ? { offhand: make('weapon', 'findik', 0, 1) } : {}), hat: null, cape: null }),
    // Stars show only how strong a piece is (its power), never its rarity (that is the colour/glow): a stronger item
    // never shows fewer stars (parent: a stronger castle drop with fewer stars than a shiny forest one confused Feza).
    stars: it => { const p = it ? it.power || 0 : 0; return p >= 34 ? 5 : p >= 24 ? 4 : p >= 16 ? 3 : p >= 10 ? 2 : 1; },
  };
  const FEZA = { create, portrait, warm, bodyStats: () => BODY && { ms: BODY.ms, skinVerts: BODY.skin.attributes.position.count, clothVerts: BODY.cloth.attributes.position.count,
    hairVerts: BODY.hair.attributes.position.count, bake: { warm: BAKE.warmQ.length + (BAKE.cur ? 1 : 0), queue: BAKE.q.length + (RB.pic ? 1 : 0), reading: RB.pic ? 1 : 0, async: !RB.off, thumbs: Object.keys(THUMBS).length, portraits: Object.keys(PORTRAITS).length, portraitKeys: Object.keys(PORTRAITS) } } };
  return { FEZA, ITEMS };
})();
