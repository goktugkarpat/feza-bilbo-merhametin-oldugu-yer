/* ── Çekirdek: yardımcılar, çizici, kamera, ışıklar, parlama (bloom), model yardımcıları ──
   Bu dosya her şeyden önce yüklenir. Diğer dosyalar buradaki genel adları kullanır (bkz. src/SPEC.md). */
'use strict';

// ── Temel yardımcılar ──
const Q = new URLSearchParams(location.search);
const SILENT = Q.has('sessiz'), ICON = Q.has('ikon'), DEBUG = Q.has('debug'), BASIC = Q.has('basit');
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const smooth01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dampAngle = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
const dist2 = (ax, az, bx, bz) => (ax - bx) * (ax - bx) + (az - bz) * (az - bz);
const $ = id => document.getElementById(id);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Seeded randomness for level generation (RNG.seed(n) first). Math.random-based frand/fpick are for effects.
const RNG = {
  _r: Math.random,
  seed(s) { this._r = mulberry32(s >>> 0); },
  r() { return this._r(); },
  range(a, b) { return a + this._r() * (b - a); },
  int(a, b) { return a + Math.floor(this._r() * (b - a + 1)); },
  pick(arr) { return arr[Math.floor(this._r() * arr.length)]; },
  chance(p) { return this._r() < p; },
};
const frand = (a = 0, b = 1) => a + Math.random() * (b - a);
const fpick = arr => arr[Math.floor(Math.random() * arr.length)];

const TIME = { t: 0, dt: 0, u: { value: 0 } };   // TIME.u: shared shader uniform (seconds), updated by the main loop
const UP = new THREE.Vector3(0, 1, 0), ZERO3 = new THREE.Vector3();

// ── Çizici ──
// With post-processing the scene renders into rtMain (own depth + stencil), so the canvas itself needs neither.
let canvas = $('c');
const makeRenderer = post => new THREE.WebGLRenderer({ canvas, antialias: !post, depth: !post, stencil: !post, powerPreference: 'high-performance', alpha: false });
let renderer = makeRenderer(!BASIC);
const HDR_OK = !!(renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
if (!BASIC && !HDR_OK) {
  // Rare device without float render targets: bloom and PMREM can't work, so use the plain path.
  // Context attributes are fixed at creation → fresh canvas + context (with depth, stencil and antialias).
  renderer.dispose(); renderer.forceContextLoss();
  const c = canvas.cloneNode(false); canvas.replaceWith(c); canvas = c;
  renderer = makeRenderer(false);
}
const PLAIN = BASIC || !HDR_OK;   // no post-processing: tone-mapped straight to the screen
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = PLAIN ? THREE.NeutralToneMapping : THREE.NoToneMapping;   // with post-processing the final pass tone-maps
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
// msaa = samples of the HDR scene target: 4× on desktop and tablets, 2× on other touch devices (?msaa=N overrides).
// tablet: iPad (also in its "Mac" desktop mode), Android, phones — not PCs (a Windows touch laptop stays a PC); ?tablet / ?pc force it.
// Tablets run at 60 FPS (UI frame()) with MSAA 4× and resolution 1.25× (parent's choice). A ProMotion iPad could not hold a steady 120
// even at 1.0×, and 90 FPS can't be shown evenly on a 120 Hz screen; 60 is even. PC/Mac: resolution 1.5×, 120 FPS as before.
// Desktop resolution adapts before MSAA; a low-load rAF measurement supplies the display/browser target (at most 120).
const QUALITY = (() => {
  const tablet = Q.has('tablet') || (!Q.has('pc') && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (/Mac/i.test(navigator.platform) && navigator.maxTouchPoints > 1)));
  return {
    tablet,
    dpr: tablet ? Math.min(window.devicePixelRatio || 1, Q.has('hd') ? 2 : 1.25) : Q.has('hd') ? 2 : 1.5, minDpr: 1,
    msaa: Q.has('msaa') ? clamp(parseInt(Q.get('msaa'), 10) || 0, 0, 8) : (Q.has('hd') || tablet || !(navigator.maxTouchPoints > 1) ? 4 : 2),
  };
})();
const QUALITY_TOP = Object.freeze({ dpr: QUALITY.dpr, msaa: QUALITY.msaa });
// Tablets: a point light that doesn't reach a pixel skips its lighting maths (Feza's light and the 2 pooled torches exist in every zone,
// mostly at intensity 0 or out of range) — the same picture for less GPU work (and battery). Patched before the first shader is built:
// three.js caches programs by their parameters, not by the chunk text. A three.js update that changes the chunk just leaves it as it is.
if (QUALITY.tablet) {
  const s = THREE.ShaderChunk.lights_fragment_begin, a = s.indexOf('#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )');
  const call = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const c = a < 0 ? -1 : s.indexOf(call, a), end = s.indexOf('#pragma unroll_loop_end', a);
  if (c > a && c < end) THREE.ShaderChunk.lights_fragment_begin = s.slice(0, c) + 'if ( directLight.visible ) ' + s.slice(c);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101018);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 150);
// Diablo-like camera: looks from +z (south) toward -z (north), tilted down.
const CAM = { dist: 12.5, pitch: 0.86, yaw: 0, zoom: 1, target: new THREE.Vector3() };
if (Q.has('kam')) { const [d, p] = Q.get('kam').split(',').map(Number); if (d) CAM.dist = d; if (p) CAM.pitch = p; }   // tuning: ?kam=dist,pitch

// ── Işıklar ──
// Every lit pixel pays for every point light (even at intensity 0), so there are only 3: Feza's light + 2 pooled torches
// (LEVEL gives them to the nearest light sources). The count never changes, so shaders never recompile.
const ENV_OK = HDR_OK;                 // PMREM needs half-float render targets
const HEMI_K = ENV_OK ? 1 : 1.2;       // without the env map, a little more sky light
const LIGHTS = {};
LIGHTS.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a3a2a, 0.9 * HEMI_K);
LIGHTS.sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
LIGHTS.sun.castShadow = true;
LIGHTS.sun.shadow.mapSize.set(2048, 2048);
{ const sc = LIGHTS.sun.shadow.camera; sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90; }
LIGHTS.sun.shadow.bias = -0.0004;
LIGHTS.sun.shadow.normalBias = 0.04;
LIGHTS.sunOffset = new THREE.Vector3(-12, 26, 14);
LIGHTS.feza = new THREE.PointLight(0xffd9a0, 0, 12, 1.5);   // Feza's own light radius (dark levels)
LIGHTS.torches = [];
for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(0xff9a40, 0, 9, 1.6); LIGHTS.torches.push(l); scene.add(l); }
scene.add(LIGHTS.hemi, LIGHTS.sun, LIGHTS.sun.target, LIGHTS.feza);
// Short light bursts (FX.lightFlash): set LIGHTS.flash.{x,y,z,color,intensity,distance,decay}. For the scene render it borrows
// a free pooled light (or the dimmest torch) instead of owning an extra PointLight.
LIGHTS.flash = { x: 0, y: 1.6, z: 0, color: new THREE.Color(1, 1, 1), intensity: 0, distance: 10, decay: 1.6 };
const _fb = { l: null, p: new THREE.Vector3(), c: new THREE.Color(), i: 0, d: 0, k: 0 };
function flashBorrow() {
  const f = LIGHTS.flash;
  if (!(f.intensity > 0.01)) return false;
  let l = LIGHTS.feza.intensity <= 0 ? LIGHTS.feza : null;   // in dark levels Feza's light stays his
  if (!l) for (const t of LIGHTS.torches) if (!l || t.intensity < l.intensity) l = t;
  if (!l) return false;
  _fb.l = l; _fb.p.copy(l.position); _fb.c.copy(l.color); _fb.i = l.intensity; _fb.d = l.distance; _fb.k = l.decay;
  l.position.set(f.x, f.y, f.z); l.color.copy(f.color); l.intensity = f.intensity; l.distance = f.distance; l.decay = f.decay;
  return true;
}
function flashReturn() {
  const l = _fb.l; _fb.l = null;
  l.position.copy(_fb.p); l.color.copy(_fb.c); l.intensity = _fb.i; l.distance = _fb.d; l.decay = _fb.k;
}

// Sun shadow box: just big enough for the ground the camera sees (+ margin) — sharper shadows, less shadow-pass work.
const SHADOW = { half: 24, min: 8, max: 24, margin: 1.5 };
const _cr = new THREE.Vector3();
// Farthest ground point the camera sees, measured from (x, z). Rotation-invariant, so the title orbit doesn't resize the box.
function viewRadius(x, z) {
  const ty = Math.tan(camera.fov * Math.PI / 360), tx = ty * camera.aspect, p = camera.position;
  if (p.y <= 0) return Infinity;
  let r = 0;
  for (let i = 0; i < 4; i++) {
    _cr.set(i & 1 ? tx : -tx, i & 2 ? ty : -ty, -1).applyQuaternion(camera.quaternion);
    if (_cr.y > -0.08) return Infinity;   // corner ray at or above the horizon
    const t = -p.y / _cr.y;
    r = Math.max(r, Math.hypot(p.x + _cr.x * t - x, p.z + _cr.z * t - z));
  }
  return r;
}

const _lm = new THREE.Matrix4(), _li = new THREE.Matrix4(), _lp = new THREE.Vector3();
// Keep the sun shadow centred on (x, z), snapped to shadow-map texels so shadow edges don't shimmer while walking.
function lightsFollow(x, z) {
  const sun = LIGHTS.sun, off = LIGHTS.sunOffset, sc = sun.shadow.camera;
  // whole metres with hysteresis: the size (and texel grid) only changes when the camera zoom really changes
  const need = clamp(Math.ceil(viewRadius(x, z) + SHADOW.margin), SHADOW.min, SHADOW.max);
  if (need > SHADOW.half || need < SHADOW.half - 1) {
    SHADOW.half = need; sc.left = sc.bottom = -need; sc.right = sc.top = need; sc.updateProjectionMatrix();
  }
  _lm.lookAt(off, ZERO3, UP); _li.copy(_lm).invert();
  _lp.set(x, 0, z).applyMatrix4(_li);
  const texel = (sc.right - sc.left) / sun.shadow.mapSize.x;
  _lp.x = Math.round(_lp.x / texel) * texel; _lp.y = Math.round(_lp.y / texel) * texel;
  _lp.applyMatrix4(_lm);
  sun.target.position.copy(_lp); sun.position.copy(_lp).add(off);
}

// Theme lighting in one call (LEVEL.build uses it). All fields optional.
function setLighting(o) {
  if (o.hemiSky !== undefined) LIGHTS.hemi.color.set(o.hemiSky);
  if (o.hemiGround !== undefined) LIGHTS.hemi.groundColor.set(o.hemiGround);
  if (o.hemi !== undefined) LIGHTS.hemi.intensity = o.hemi * HEMI_K;
  if (o.sunColor !== undefined) LIGHTS.sun.color.set(o.sunColor);
  if (o.sun !== undefined) LIGHTS.sun.intensity = o.sun;
  if (o.sunOffset) LIGHTS.sunOffset.set(...o.sunOffset);
  if (o.fezaLight !== undefined) LIGHTS.feza.intensity = o.fezaLight;
  if (o.fezaLightColor !== undefined) LIGHTS.feza.color.set(o.fezaLightColor);
  if (o.fog) { scene.fog = new THREE.Fog(o.fog[0], o.fog[1], o.fog[2]); scene.background = new THREE.Color(o.fog[0]); }
  if (o.background !== undefined) scene.background = new THREE.Color(o.background);
  if (o.env) setEnvironment(o.env[0], o.env[1], o.env[2], o.env[3] ?? 1);
  if (o.bloom !== undefined) POST.strength = o.bloom;
  if (o.exposure !== undefined) POST.exposure = o.exposure;
}

// ── Ortam yansıması (environment map) ──
// A soft gradient sky + two bright "softbox" panels, pre-filtered with PMREM: gives metals, jelly and eyes real highlights.
const pmrem = ENV_OK ? new THREE.PMREMGenerator(renderer) : null;
let envRT = null, envArgs = null;
// The little env scene is built once and kept. (It used to be rebuilt and disposed on every call, so each zone load
// re-linked its shader programs: ~30–100 ms more black screen per portal on an iPad.) A call now only changes 3 colours.
const ENV_SCENE = pmrem && (() => {
  const s = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { a: { value: new THREE.Color() }, b: { value: new THREE.Color() }, c: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 a, b, c; varying vec3 vP; void main(){ float y = vP.y; vec3 col = y > 0.0 ? mix(b, a, pow(y, 0.6)) : mix(b, c, pow(-y, 0.5)); gl_FragColor = vec4(col, 1.0); }',
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  // Panels: BackSide and turned away from the centre, so the centre still sees them. That makes their shader the same as
  // the MeshBasicMaterial box PMREMGenerator makes (and disposes) inside every fromScene, which then reuses this kept
  // program instead of linking its own again. (If a three.js update breaks the match, it only costs that one link.)
  const pg = new THREE.PlaneGeometry(1, 1);
  const panel = (color, sx, sy, x, y, z) => {
    const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
    m.scale.set(sx, sy, 1); m.position.set(x, y, z); m.lookAt(x * 2, y * 2, z * 2); s.add(m);
  };
  panel(new THREE.Color(5, 4.7, 4.2), 26, 18, -22, 32, 18);    // key softbox
  panel(new THREE.Color(1.6, 1.8, 2.4), 30, 10, 18, 14, -30);  // cool back light
  return { s, u: mat.uniforms };
})();
function setEnvironment(sky, horizon, ground, intensity = 1) {
  const same = envRT && envArgs && envArgs[0] === sky && envArgs[1] === horizon && envArgs[2] === ground;
  envArgs = [sky, horizon, ground, intensity];   // re-rendered after a WebGL context loss
  if (!pmrem) { scene.environment = null; return; }
  if (!same) {   // same colours as the current map (e.g. the zone is loaded again): keep it, no GPU work
    const u = ENV_SCENE.u;
    u.a.value.set(sky); u.b.value.set(horizon); u.c.value.set(ground);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(ENV_SCENE.s, 0.02);
  }
  scene.environment = envRT.texture;
  scene.environmentIntensity = intensity;
}
setEnvironment(0x8fc4ff, 0xf3e6d0, 0x5a4a3a, 1);

// ── Son işlem: HDR sahne → parlama (bloom) → renk tonu → ekran ──
const POST = { on: !PLAIN, strength: 0.6, threshold: 1.25, exposure: 1.0, saturation: 1.08, vignette: 0.32, tint: new THREE.Color(1, 0.1, 0.15), tintAmt: 0 };
const FS_GEO = new THREE.BufferGeometry();
FS_GEO.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
const FS_CAM = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const FS_VS = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function fsScene(mat) { const s = new THREE.Scene(); const m = new THREE.Mesh(FS_GEO, mat); m.frustumCulled = false; s.add(m); return s; }
const matDown = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() }, thr: { value: 1 }, first: { value: 0 } },
  vertexShader: FS_VS, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D src; uniform vec2 texel; uniform float thr, first; varying vec2 vUv;
    vec3 pre(vec3 c) { if (first < 0.5) return c; float b = max(c.r, max(c.g, c.b)); return min(c, vec3(24.0)) * smoothstep(thr, thr + 0.6, b); }
    void main() {
      vec3 s = pre(texture2D(src, vUv + texel * vec2(-1.0, -1.0)).rgb) + pre(texture2D(src, vUv + texel * vec2(1.0, -1.0)).rgb)
             + pre(texture2D(src, vUv + texel * vec2(-1.0, 1.0)).rgb) + pre(texture2D(src, vUv + texel * vec2(1.0, 1.0)).rgb);
      gl_FragColor = vec4(s * 0.25, 1.0);
    }`,
});
const matUp = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, texel: { value: new THREE.Vector2() } },
  vertexShader: FS_VS, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
  fragmentShader: `uniform sampler2D src; uniform vec2 texel; varying vec2 vUv;
    void main() {
      vec2 o = texel; vec3 s = texture2D(src, vUv).rgb * 4.0;
      s += (texture2D(src, vUv + vec2(o.x, 0.0)).rgb + texture2D(src, vUv - vec2(o.x, 0.0)).rgb + texture2D(src, vUv + vec2(0.0, o.y)).rgb + texture2D(src, vUv - vec2(0.0, o.y)).rgb) * 2.0;
      s += texture2D(src, vUv + o).rgb + texture2D(src, vUv - o).rgb + texture2D(src, vUv + vec2(o.x, -o.y)).rgb + texture2D(src, vUv + vec2(-o.x, o.y)).rgb;
      gl_FragColor = vec4(s / 16.0, 1.0);
    }`,
});
const matComp = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null }, tBloom: { value: null }, strength: { value: 0.55 }, expo: { value: 1 }, sat: { value: 1.08 },
    vig: { value: 0.32 }, tint: { value: new THREE.Color() }, tintAmt: { value: 0 },
  },
  vertexShader: FS_VS, depthTest: false, depthWrite: false,
  fragmentShader: `uniform sampler2D tScene, tBloom; uniform float strength, expo, sat, vig, tintAmt; uniform vec3 tint; varying vec2 vUv;
    vec3 neutral(vec3 color) {   // Khronos PBR Neutral: keeps a kids' game colourful
      const float startCompression = 0.76; const float desaturation = 0.15;
      float x = min(color.r, min(color.g, color.b));
      float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
      color -= offset;
      float peak = max(color.r, max(color.g, color.b));
      if (peak < startCompression) return color;
      float d = 1.0 - startCompression;
      float newPeak = 1.0 - d * d / (peak + d - startCompression);
      color *= newPeak / peak;
      float g = 1.0 - 1.0 / (desaturation * (peak - newPeak) + 1.0);
      return mix(color, vec3(newPeak), g);
    }
    vec3 toSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main() {
      vec3 c = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
      c *= expo;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = max(mix(vec3(l), c, sat), 0.0);
      c = neutral(c);
      float r = length((vUv - 0.5) * vec2(1.0, 0.8));
      c *= mix(1.0 - vig, 1.0, smoothstep(0.8, 0.28, r));
      c = mix(c, tint, tintAmt * smoothstep(0.2, 0.75, r));
      gl_FragColor = vec4(toSRGB(c), 1.0);
    }`,
});
const sceneDown = fsScene(matDown), sceneUp = fsScene(matUp), sceneComp = fsScene(matComp);
let rtMain = null;
const MIPS = [], MIPN = 5;
const RESIZE_HOOKS = [];

function resizeRenderer() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(QUALITY.dpr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (POST.on) {
    const pw = Math.max(2, Math.floor(w * QUALITY.dpr)), ph = Math.max(2, Math.floor(h * QUALITY.dpr));
    const type = HDR_OK ? THREE.HalfFloatType : THREE.UnsignedByteType;
    if (rtMain && rtMain.samples !== QUALITY.msaa) { rtMain.dispose(); rtMain = null; }
    // stencil: Feza's x-ray pass. Nothing reads depth/stencil afterwards → no resolve blit, the MSAA depth is just discarded.
    if (!rtMain) rtMain = new THREE.WebGLRenderTarget(pw, ph, { type, samples: QUALITY.msaa, depthBuffer: true, stencilBuffer: true, resolveDepthBuffer: false, resolveStencilBuffer: false });
    else rtMain.setSize(pw, ph);
    let mw = pw >> 1, mh = ph >> 1;
    for (let i = 0; i < MIPN; i++) {
      if (!MIPS[i]) { MIPS[i] = new THREE.WebGLRenderTarget(mw, mh, { type, depthBuffer: false }); MIPS[i].texture.generateMipmaps = false; }
      else MIPS[i].setSize(mw, mh);
      mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1);
    }
  }
  for (const f of RESIZE_HOOKS) f(w, h);
}
addEventListener('resize', () => setTimeout(resizeRenderer, 60));
resizeRenderer();

// Shader warm-ups (renderer.compile, and compileAsync which calls it) must build the program variants the frame really uses:
// with post-processing the scene renders into rtMain (linear output, no tone mapping), so bind it while compiling.
{
  const compile = renderer.compile.bind(renderer);
  renderer.compile = (...a) => {
    const rt = renderer.getRenderTarget();
    if (rt || !POST.on || !rtMain) return compile(...a);
    renderer.setRenderTarget(rtMain);
    try { return compile(...a); } finally { renderer.setRenderTarget(rt); }
  };
}
// Warm up obj's shaders for the main scene (lights, fog, env as in `scene`). async → Promise (compileAsync).
function precompile(obj, async = false) {
  return async && renderer.compileAsync ? renderer.compileAsync(obj, camera, scene) : renderer.compile(obj, camera, scene);
}

// WebGL context lost (iPad: memory pressure, long time in the background): three.js restores textures and programs,
// but GPU-rendered content is gone — re-render the environment map and rebuild the targets. CTX_HOOKS: other modules' redo.
const CTX_HOOKS = [];
canvas.addEventListener('webglcontextrestored', () => {
  envRT = null;   // its GL objects died with the old context (dispose() would delete foreign handles)
  if (envArgs) setEnvironment(...envArgs);
  resizeRenderer();   // (RESIZE_HOOKS → the UI redraws even while paused)
  perfReset(2);
  for (const f of CTX_HOOKS) { try { f(); } catch (e) { console.warn('CTX_HOOKS', e); } }
});

function renderFrame() {
  const lent = flashBorrow();
  if (!POST.on) { renderer.setRenderTarget(null); renderer.render(scene, camera); if (lent) flashReturn(); return; }
  renderer.setRenderTarget(rtMain);
  renderer.render(scene, camera);
  if (lent) flashReturn();
  let src = rtMain.texture, sw = rtMain.width, sh = rtMain.height;
  const du = matDown.uniforms;
  du.thr.value = POST.threshold;
  for (let i = 0; i < MIPN; i++) {
    du.src.value = src; du.texel.value.set(1 / sw, 1 / sh); du.first.value = i === 0 ? 1 : 0;
    renderer.setRenderTarget(MIPS[i]); renderer.render(sceneDown, FS_CAM);
    src = MIPS[i].texture; sw = MIPS[i].width; sh = MIPS[i].height;
  }
  renderer.autoClear = false;
  for (let i = MIPN - 1; i > 0; i--) {
    matUp.uniforms.src.value = MIPS[i].texture; matUp.uniforms.texel.value.set(1 / MIPS[i].width, 1 / MIPS[i].height);
    renderer.setRenderTarget(MIPS[i - 1]); renderer.render(sceneUp, FS_CAM);
  }
  renderer.autoClear = true;
  const cu = matComp.uniforms;
  cu.tScene.value = rtMain.texture; cu.tBloom.value = MIPS[0].texture; cu.strength.value = POST.strength;
  cu.expo.value = POST.exposure; cu.sat.value = POST.saturation; cu.vig.value = POST.vignette;
  cu.tint.value.copy(POST.tint); cu.tintAmt.value = POST.tintAmt;
  renderer.setRenderTarget(null);
  renderer.render(sceneComp, FS_CAM);
}

// Gameplay quality watchdog. Measure browser cadence with NO 3D drawing before boot, and again in static menus.
// Loaded gameplay may prove a faster cadence, but never lowers the known target: GPU-limited 60 on a 120 Hz display
// is not evidence of a 60 Hz cap. Desktop tries resolution first; the existing tablet quality policy stays separate.
const PERF = { acc: 0, n: 0, fps: 60, target: 60, cadence: 0, measured: false,   // conservative until measured (hidden boot / timer fallback)
  level: 0, ladder: [], probe: null, raised: null, rollback: null, capFps: 0, good: 0, bad: 0,
  upWait: QUALITY.tablet ? 10 : 17.5, upJust: false, retry: 0, noGainWait: 60, grace: 0, was: false };
const PERF_RAF = { last: null, idle: null, warm: 4, samples: [], span: 0 };
function perfRaf(ts, idle = false) {
  if (QUALITY.tablet) return;
  const r = PERF_RAF;
  if (document.hidden) { r.last = null; r.samples.length = 0; r.span = 0; r.warm = 4; return; }
  const dt = r.last === null ? 0 : ts - r.last; r.last = ts;
  if (idle !== r.idle) { r.idle = idle; r.samples.length = 0; r.span = 0; r.warm = 4; }
  if (!(dt >= 1 && dt <= 100)) { r.samples.length = 0; r.span = 0; return; }
  if (r.warm > 0) { r.warm--; return; }   // drain a preceding render / ignore the first callback's timestamp
  r.samples.push(dt); r.span += dt;
  if (r.span < 400 || r.samples.length < 8) return;
  const sorted = r.samples.slice().sort((a, b) => a - b), ms = sorted[Math.floor((sorted.length - 1) * 0.2)];
  let rate = 1000 / ms;
  // Timers jitter a little; preserve unusual rates too, only snap close to the common ones.
  for (const hz of [24, 25, 30, 40, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240]) if (Math.abs(rate - hz) < hz * 0.025) { rate = hz; break; }
  const target = Math.min(120, Math.max(10, Math.round(rate)));
  if (idle || target > PERF.target * 1.05) {
    PERF.cadence = rate; PERF.measured = true;
    if (Math.abs(target - PERF.target) >= 2) { PERF.target = target; perfReset(1); }
  }
  r.samples.length = 0; r.span = 0;
}
function perfMeasure(done) {
  if (QUALITY.tablet || document.hidden) { done(); return; }
  let raf = 0, timer = 0, first = null, ended = false;
  const finish = () => {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf); clearTimeout(timer); document.removeEventListener('visibilitychange', hidden);
    done();
  };
  const hidden = () => { if (document.hidden) finish(); };
  const tick = ts => {
    if (document.hidden) { finish(); return; }
    if (first === null) first = ts;
    perfRaf(ts, true);
    if (ts - first >= 600) finish(); else raf = requestAnimationFrame(tick);
  };
  PERF_RAF.last = null; PERF_RAF.idle = null;
  document.addEventListener('visibilitychange', hidden);
  timer = setTimeout(finish, 1000);   // hidden/throttled rAF must never hold the loading screen
  raf = requestAnimationFrame(tick);
}
function perfLadder() {
  const L = [], d0 = QUALITY_TOP.dpr, m0 = QUALITY_TOP.msaa;
  const push = (dpr, msaa) => L.push({ dpr, msaa });
  push(d0, m0);
  if (QUALITY.tablet) {
    if (m0 > 2) push(d0, 2);
    if (m0 > 0) push(d0, 0);
    for (let d = d0; d > QUALITY.minDpr + 1e-3;) { d = Math.max(QUALITY.minDpr, d - 0.25); push(d, 0); }
  } else {
    let d = d0;
    while (d > QUALITY.minDpr + 1e-3) { d = Math.max(QUALITY.minDpr, d - 0.25); push(d, m0); }
    if (m0 > 2) push(d, 2);
    if (m0 > 0) push(d, 0);
  }
  return L;
}
function perfSet(i) {
  if (!PERF.ladder.length) PERF.ladder = perfLadder();
  const q = PERF.ladder[i];
  if (!q) return;
  PERF.level = i; QUALITY.dpr = q.dpr; QUALITY.msaa = q.msaa;
  resizeRenderer();
  if (DEBUG) console.log('quality ' + i + ': dpr ' + q.dpr + ' msaa ' + q.msaa + ' (' + PERF.fps.toFixed(1) + '/' + PERF.target + ' fps)');
}
function perfWindow(grace = 0) { PERF.acc = 0; PERF.n = 0; PERF.grace = Math.max(PERF.grace, grace); }
function perfReset(grace = 1) {
  // Interrupted comparisons are not evidence. Undo the unproven step on the next gameplay frame, not in the menu.
  if (PERF.probe) PERF.rollback = PERF.probe.best !== undefined ? PERF.probe.best : PERF.probe.from;
  if (PERF.raised) PERF.rollback = PERF.raised.from;
  PERF.probe = PERF.raised = null; PERF.good = PERF.bad = 0; PERF.retry = 0; PERF.noGainWait = 60; PERF.was = false;
  perfWindow(grace);
}
function perfActive() {
  if (document.hidden) return false;
  if (typeof UI !== 'undefined' && UI && (UI.mode !== 'play' || UI.menu || UI.paused)) return false;
  if (typeof GAME !== 'undefined' && GAME && GAME.state && GAME.state !== 'play') return false;
  return true;
}
function perfTick(rawDt, active) {
  if (active === undefined) active = perfActive();
  if (!active || !(rawDt > 0)) { if (PERF.was) perfReset(1); return; }
  if (!PERF.was || rawDt > 0.25) {
    if (rawDt > 0.25) perfReset(1);
    PERF.was = true;
    if (PERF.rollback !== null) { perfSet(PERF.rollback); PERF.rollback = null; }
    perfWindow(1); return;   // an explicit zone/context grace of 2–3 s is kept by perfWindow
  }
  if (PERF.grace > 0) { PERF.grace = Math.max(0, PERF.grace - rawDt); return; }
  PERF.retry = Math.max(0, PERF.retry - rawDt);
  PERF.acc += rawDt; PERF.n++;
  if (PERF.acc < 2.5) return;
  const win = PERF.acc, fps = PERF.fps = PERF.n / PERF.acc;
  PERF.acc = 0; PERF.n = 0;
  if (!PERF.ladder.length) PERF.ladder = perfLadder();
  if (QUALITY.tablet) { perfTablet(fps, win); return; }
  const low = PERF.target * 0.9, high = PERF.target * 0.95, last = PERF.ladder.length - 1;
  if (PERF.raised) {
    const from = PERF.raised.from; PERF.raised = null;
    if (fps < low) {
      PERF.upWait = Math.min(60, PERF.upWait * 2); PERF.good = PERF.bad = 0;
      perfSet(from); perfWindow(0.75); return;
    }
    PERF.upWait = 17.5;
  }
  if (PERF.probe) {
    const pr = PERF.probe;
    if (fps > pr.fps * 1.05) { pr.best = PERF.level; pr.fps = fps; PERF.noGainWait = 60; }
    if (fps < low && PERF.level < last) { perfSet(PERF.level + 1); perfWindow(0.75); return; }
    PERF.probe = null; PERF.bad = 0;
    if (fps < low) {
      // CPU/browser-limited or only a partial gain: keep the sharpest level that really helped. Never relabel it 60 Hz.
      if (PERF.level !== pr.best) perfSet(pr.best);
      const noGain = pr.best === pr.from;
      PERF.retry = noGain ? PERF.noGainWait : 30;
      PERF.noGainWait = noGain ? Math.min(240, PERF.noGainWait * 2) : 60;
      PERF.good = 0; perfWindow(0.75); return;
    }
    PERF.noGainWait = 60;
  }
  if (fps < low) {
    PERF.good = 0; PERF.bad += win;
    if (PERF.bad >= 5 && PERF.retry <= 0 && PERF.level < last) {
      PERF.probe = { from: PERF.level, best: PERF.level, fps }; PERF.bad = 0;
      perfSet(PERF.level + 1); perfWindow(0.75);
    }
    return;
  }
  PERF.bad = 0;
  if (fps < high) { PERF.good = 0; return; }
  PERF.retry = 0; PERF.noGainWait = 60;
  PERF.good += win;
  if (PERF.level > 0 && PERF.good >= PERF.upWait) {
    PERF.raised = { from: PERF.level }; PERF.good = 0;
    perfSet(PERF.level - 1); perfWindow(0.75);
  }
}
// The tablet/phone path retains its existing MSAA-first ladder, 60 FPS thresholds and cap protection.
function perfTablet(fps, win) {
  if (PERF.probe) {
    const pr = PERF.probe; PERF.probe = null;
    if (fps < 50 && fps < pr.fps * 1.12) { PERF.capFps = pr.fps; perfSet(pr.from); perfWindow(1); return; }
  }
  if (PERF.capFps && fps > PERF.capFps * 1.1) PERF.capFps = 0;
  if (fps < 42) {
    PERF.good = 0;
    if (PERF.upJust) PERF.upWait = Math.min(PERF.upWait * 2, 160);
    PERF.upJust = false;
    if (PERF.capFps && fps > PERF.capFps * 0.9) return;
    if (PERF.level < PERF.ladder.length - 1) { PERF.probe = { from: PERF.level, fps }; perfSet(PERF.level + 1); perfWindow(0.5); }
    return;
  }
  PERF.upJust = false;
  if (fps < 57) { PERF.good = 0; return; }
  PERF.capFps = 0; PERF.good += win;
  if (PERF.level > 0 && PERF.good >= PERF.upWait) { PERF.good = 0; PERF.upJust = true; perfSet(PERF.level - 1); perfWindow(0.5); }
}

// ── Kamera ──
function cameraFollow(x, y, z, dt, snap) {
  const a = camera.aspect, k = a >= 1.25 ? 1 : Math.min(1.2, 1 + (1.25 - a) * 0.4);   // narrow/portrait: pull back a little (≤ 1.2)
  const d = CAM.dist * k * CAM.zoom, t = CAM.target;
  if (snap) t.set(x, y, z);
  else { t.x = damp(t.x, x, 7, dt); t.y = damp(t.y, y, 7, dt); t.z = damp(t.z, z, 7, dt); }
  const sh = (typeof FX !== 'undefined' && FX.shakeOffset) ? FX.shakeOffset : ZERO3;
  const hd = Math.cos(CAM.pitch) * d;
  camera.position.set(t.x + Math.sin(CAM.yaw) * hd + sh.x, t.y + Math.sin(CAM.pitch) * d + sh.y, t.z + Math.cos(CAM.yaw) * hd + sh.z);
  camera.lookAt(t.x + sh.x * 0.5, t.y, t.z + sh.z * 0.5);
}

// ── Ekran ↔ dünya ──
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _sv = new THREE.Vector3();
function groundFromScreen(sx, sy, y = 0) {
  _ndc.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  const o = _ray.ray.origin, d = _ray.ray.direction;
  if (Math.abs(d.y) < 1e-5) return null;
  const t = (y - o.y) / d.y;
  if (t < 0) return null;
  return new THREE.Vector3(o.x + d.x * t, y, o.z + d.z * t);
}
function toScreen(v, out = {}) {
  _sv.copy(v).project(camera);
  out.x = (_sv.x + 1) * 0.5 * innerWidth; out.y = (1 - _sv.y) * 0.5 * innerHeight;
  out.vis = _sv.z > -1 && _sv.z < 1;
  return out;
}

// ── Geometri önbelleği (hepsi birim boyutlu; Kit ile ölçeklenir) ──
const GC = {};
function gcache(key, make) { let g = GC[key]; if (!g) { g = GC[key] = make(); g.userData.cached = true; } return g; }
const G = {
  sphere: (w = 20, h) => gcache(`s${w}_${h}`, () => new THREE.SphereGeometry(1, w, h ?? Math.max(6, Math.round(w * 0.7)))),
  hemi: (w = 20) => gcache(`hs${w}`, () => new THREE.SphereGeometry(1, w, Math.max(4, w >> 1), 0, TAU, 0, Math.PI / 2)),
  cyl: (rt = 1, rb = 1, seg = 16, open = false) => gcache(`c${rt}_${rb}_${seg}_${open}`, () => new THREE.CylinderGeometry(rt, rb, 1, seg, 1, open)),
  cone: (seg = 12) => gcache(`k${seg}`, () => new THREE.ConeGeometry(1, 1, seg)),
  box: () => gcache('b', () => new THREE.BoxGeometry(1, 1, 1)),
  rbox: (seg = 2) => gcache(`rb${seg}`, () => roundedBox(seg)),
  torus: (arc = TAU, tube = 0.25, seg = 16) => gcache(`t${arc.toFixed(3)}_${tube}_${seg}`, () => new THREE.TorusGeometry(1, tube, 8, seg, arc)),
  capsule: (len = 1, seg = 12) => gcache(`cp${len}_${seg}`, () => new THREE.CapsuleGeometry(1, len, 4, seg)),
  ico: (detail = 1) => gcache(`i${detail}`, () => new THREE.IcosahedronGeometry(1, detail)),
  dodeca: () => gcache('d', () => new THREE.DodecahedronGeometry(1, 0)),
  octa: () => gcache('o', () => new THREE.OctahedronGeometry(1, 0)),
};
// Unit cube with softly bevelled edges (sphere-projected corners) – nicer highlights than a hard box.
function roundedBox(seg) {
  const g = new THREE.BoxGeometry(1, 1, 1, seg * 2 + 1, seg * 2 + 1, seg * 2 + 1);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), c = new THREE.Vector3(), r = 0.12;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(clamp(v.x, -0.5 + r, 0.5 - r), clamp(v.y, -0.5 + r, 0.5 - r), clamp(v.z, -0.5 + r, 0.5 - r));
    const d = v.clone().sub(c);
    if (d.lengthSq() > 1e-8) { d.normalize(); v.copy(c).addScaledVector(d, r); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, d.x, d.y, d.z); }
  }
  return g;
}

// ── Kit: renkli ilkel parçaları tek bir geometride birleştirir (az çizim çağrısı) ──
// k.add(geo, color, pos, rot, scale): color = hex | THREE.Color | (x,y,z)=>THREE.Color (per-vertex, x/y/z = final position)
// rot = [x,y,z] Euler | THREE.Quaternion; scale = number | [x,y,z]. k.push()/k.pop() nest transforms.
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s3 = new THREE.Vector3(), _p3 = new THREE.Vector3();
function tmat(pos, rot, scl) {
  const m = new THREE.Matrix4();
  _p3.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
  if (rot && rot.isQuaternion) _q.copy(rot); else if (rot) _q.setFromEuler(_e.set(rot[0] || 0, rot[1] || 0, rot[2] || 0)); else _q.identity();
  if (scl === undefined || scl === null) _s3.set(1, 1, 1); else if (typeof scl === 'number') _s3.set(scl, scl, scl); else _s3.set(scl[0], scl[1], scl[2]);
  return m.compose(_p3, _q, _s3);
}
class Kit {
  constructor() { this.parts = []; this.stack = [new THREE.Matrix4()]; }
  top() { return this.stack[this.stack.length - 1]; }
  push(pos, rot, scl) { this.stack.push(this.top().clone().multiply(tmat(pos, rot, scl))); return this; }
  pop() { if (this.stack.length > 1) this.stack.pop(); return this; }
  add(geo, color, pos, rot, scl) {
    const c = typeof color === 'function' ? color : (color && color.isColor ? color.clone() : new THREE.Color(color ?? 0xffffff));
    this.parts.push({ geo, color: c, m: this.top().clone().multiply(tmat(pos, rot, scl)) });
    return this;
  }
  // Cylinder segment from p0 to p1 (arrays [x,y,z]) with radius r (r1 = end radius), e.g. limbs/legs.
  seg(p0, p1, r, color, r1 = r, sides = 10) {
    const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1), d = b.clone().sub(a), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d.normalize());
    const mid = a.clone().add(b).multiplyScalar(0.5);
    return this.add(G.cyl(r1 / r, 1, sides), color, [mid.x, mid.y, mid.z], q, [r, len, r]);
  }
  build() { return mergeParts(this.parts); }
}
function mergeParts(parts) {
  let nv = 0, ni = 0;
  for (const p of parts) { const P = p.geo.attributes.position; nv += P.count; ni += p.geo.index ? p.geo.index.count : P.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const p of parts) {
    const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    nm.getNormalMatrix(p.m);
    const fn = typeof p.color === 'function' ? p.color : null;
    for (let i = 0; i < P.count; i++) {
      const o = (vo + i) * 3;
      v.fromBufferAttribute(P, i).applyMatrix4(p.m);
      pos[o] = v.x; pos[o + 1] = v.y; pos[o + 2] = v.z;
      const c = fn ? fn(v.x, v.y, v.z) : p.color;
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[o] = v.x; nor[o + 1] = v.y; nor[o + 2] = v.z; }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
    }
    if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo; io += I.count; }
    else { for (let i = 0; i < P.count; i++) idx[io + i] = vo + i; io += P.count; }
    vo += P.count;
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
const col3 = hex => new THREE.Color(hex);
const mixCol = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

// Place an object on a sphere of radius R (e.g. eyes on a head): local (x, y) on the face, returns [pos, quaternion].
function onSphere(x, y, R, inset = 0) {
  const z = Math.sqrt(Math.max(1e-4, R * R - x * x - y * y)) - inset;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.asin(clamp(y / R, -1, 1)), Math.atan2(x, z), 0, 'YXZ'));
  return [[x, y, z], q];
}

// ── Malzemeler ──
function stdMat(o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0 }, o)); }
function vcMat(o = {}) { return stdMat(Object.assign({ vertexColors: true }, o)); }
// Unlit HDR colour (> 1 blooms): glowing blades, crystals, flames, eyes.
function glowMat(color, intensity = 2.5, o = {}) { return new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color).multiplyScalar(intensity) }, o)); }
// Inject GLSL into a built-in material. o: {uniforms, vDecl, vBegin, fDecl, fMap, fNormal:[search, replace], fOut, key}
function patchMat(mat, o) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (o.uniforms) Object.assign(sh.uniforms, o.uniforms);
    if (o.vDecl) sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + o.vDecl);
    if (o.vBegin) sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + o.vBegin);
    if (o.fDecl) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + o.fDecl);
    if (o.fMap) sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', o.fMap);
    if (o.fNormal) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace(o.fNormal[0], o.fNormal[1]));
    if (o.fOut) sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', o.fOut + '\n#include <opaque_fragment>');
    prev.call(mat, sh, r);
  };
  const k = (mat.userData.pkey || '') + '|' + (o.key || 'p');
  mat.userData.pkey = k;
  mat.customProgramCacheKey = () => k;
  return mat;
}
// Soft coloured edge light – makes characters pop off the ground (stylised, "premium" look).
function rimify(mat, color = 0xffffff, strength = 0.22, power = 2.8) {
  return patchMat(mat, {
    uniforms: { rimColor: { value: new THREE.Color(color).multiplyScalar(strength) }, rimPow: { value: power } },
    fDecl: 'uniform vec3 rimColor; uniform float rimPow;',
    fOut: 'outgoingLight += rimColor * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), rimPow);',
    key: 'rim',
  });
}
// Free GPU memory of an object tree (cached geometries and materials flagged userData.keep are kept).
function disposeTree(obj) {
  obj.traverse(o => {
    if (o.geometry && !o.geometry.userData.cached && !o.geometry.userData.keep) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) if (!m.userData.keep) m.dispose();
  });
  if (obj.parent) obj.parent.remove(obj);
}
// Mark an object and its meshes as shadow casters/receivers.
function shadows(obj, cast = true, receive = false) { obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); return obj; }
