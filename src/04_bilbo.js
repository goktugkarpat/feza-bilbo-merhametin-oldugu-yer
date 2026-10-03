/* Bilbo — sculpted Labrador, articulated skeleton, shared portrait and distance-driven gait. */
const BILBO = (() => {
  'use strict';
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const smooth = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.83 });
  const wetMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36 });
  const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.16, emissive: 0x772d1c, emissiveIntensity: .65 });
  const shineMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const detail = new THREE.SphereGeometry(1, 18, 12);
  const COAT = 0x343032, EAR = 0x242227, MUZZLE = 0x554044;

  // Continuous sculpted surfaces. Sections: z, horizontal radius, vertical radius, centre y.
  function loft(sections, rows = 40, sides = 32) {
    const pos = [], uv = [], idx = [];
    const sample = (t, k) => {
      const u = t * (sections.length - 1), i = Math.min(sections.length - 2, Math.floor(u)), f = u - i;
      const a = sections[Math.max(0, i - 1)][k], b = sections[i][k], c = sections[i + 1][k], d = sections[Math.min(sections.length - 1, i + 2)][k];
      return 0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    };
    for (let i = 0; i <= rows; i++) {
      const t = i / rows, z = sample(t, 0), rx = Math.max(0.001, sample(t, 1)), ry = Math.max(0.001, sample(t, 2)), cy = sample(t, 3);
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        pos.push(Math.cos(a) * rx, cy + Math.sin(a) * ry, z); uv.push(j / sides, t);
        if (i < rows && j < sides) { const n = i * (sides + 1) + j; idx.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const trunkGeo = loft([[-.95,.001,.001,.71],[-.80,.26,.30,.73],[-.56,.35,.38,.76],
    [-.15,.36,.36,.78],[.18,.43,.46,.85],[.43,.42,.46,.88],[.66,.29,.37,.90],[.76,.001,.001,.91]]);
  // Heavy brow, broad predatory muzzle and a pronounced jaw separate the beast from an ordinary pet.
  const headGeo = loft([[-.32,.001,.001,.035],[-.25,.29,.27,.05],[-.09,.36,.30,.055],
    [.12,.34,.275,.035],[.30,.285,.22,-.01],[.46,.285,.175,-.035],[.65,.255,.15,-.050],[.76,.20,.13,-.055],[.80,.001,.001,-.05]],46,40);
  { const p = headGeo.attributes.position; for (let i=0;i<p.count;i++) if(p.getY(i)>.20) p.setY(i,.20+(p.getY(i)-.20)*.55); headGeo.computeVertexNormals(); }
  function earGeo(side) {
    // A closed, rounded fold attached inside the skull; broad near the cheek, tucked-in at the tip.
    const g = loft([[0,.001,.001,0],[.035,.073,.038,.012],[.12,.11,.041,.035],
      [.22,.092,.032,.075],[.31,.042,.021,.08],[.35,.001,.001,.07]],30,20);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = p.getZ(i), u = clamp01(t / .35);
      p.setXYZ(i, p.getX(i) + side * (.045 * Math.sin(u * Math.PI) - .014 * u), -t, p.getY(i));
    }
    g.computeVertexNormals(); return g;
  }
  const earL = earGeo(-1), earR = earGeo(1);
  const foreGeo = loft([[-.07,.065,.08,0],[.04,.127,.15,0],[.17,.118,.125,0],[.30,.099,.103,0],[.44,.085,.087,.015],[.60,.078,.08,.035],[.67,.068,.064,.04]],32,24);
  const hindGeo = loft([[-.09,.065,.09,0],[.02,.18,.21,0],[.15,.17,.185,0],[.29,.12,.13,-.035],[.43,.089,.095,-.02],[.59,.075,.08,.03],[.67,.068,.064,.04]],32,24);
  const tailGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .03, -.22), new THREE.Vector3(0, .14, -.47), new THREE.Vector3(0, .20, -.73)
  ]), 24, .08, 12, false);
  { const p = tailGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = Math.floor(i / 13) / 24, k = 1 - .86 * t;
      const c = tailGeo.parameters.path.getPointAt(t);
      p.setXYZ(i, p.getX(i) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
    tailGeo.computeVertexNormals(); }

  function create() {
    const root = new THREE.Group(); root.name = 'Bilbo';
    const bones = [], parts = [], owned = [];
    function joint(parent, name, x = 0, y = 0, z = 0) {
      const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.push(b); return b;
    }
    function part(bone, geo, color, pos = [0, 0, 0], scale = [1, 1, 1], mat = furMat, rot = [0, 0, 0]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
      if(![sphere,detail,trunkGeo,headGeo,earL,earR,foreGeo,hindGeo,tailGeo].includes(geo)&&!owned.includes(geo))owned.push(geo);
      const p = { bone, geo, color: new THREE.Color(color), m, mat }; parts.push(p); return p;
    }
    const ell = (b, col, p, s, mat = furMat, rot) => part(b, sphere, col, p, s, mat, rot);
    const small = (b, col, p, s, mat = wetMat) => part(b, detail, col, p, s, mat);
    function curve(b, pts, radius, color, mat = wetMat) {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 20, radius, 6, false);
      owned.push(g); part(b, g, color, undefined, undefined, mat);
    }
    const body = joint(root, 'body'); part(body, trunkGeo, COAT);
    const neck = joint(body, 'neck', 0, .94, .40);
    ell(neck, COAT, [0,.035,.075], [.35,.37,.34], furMat, [-.32,0,0]);
    const head = joint(neck, 'head', 0, .18, .13);
    part(head, headGeo, COAT).muzzle = true;
    small(head,0x211d22,[0,-.035,.776],[.177,.086,.060]);
    ell(head,0x100c12,[0,-.183,.713],[.251,.065,.113],wetMat);
    for(const side of [-1,1])part(head,new THREE.ConeGeometry(.037,.23,10),0xd2c3a0,[side*.184,-.205,.767],[1,1,1],wetMat,[Math.PI,0,side*.14]);
    curve(head,[[0,-.11,.781],[0,-.16,.74],[0,-.185,.69]],.008,0x211921);
    for (const side of [-1, 1]) {
      small(head,0x171317,[side*.082,-.025,.822],[.039,.026,.017]);
      curve(head,[[0,-.185,.69],[side*.17,-.184,.59],[side*.27,-.17,.40]],.008,0x22191f);
      ell(head,0x14151a,[side*.242,.14,.288],[.091,.060,.050]);
      const eye=joint(head,'eye'+side,side*.242,.15,.325);
      small(eye,0xb34b29,[0,0,0],[.071,.043,.021],eyeMat);
      small(eye,0x1a0e10,[0,.002,.019],[.014,.033,.011],eyeMat);
      small(eye,0xff8751,[-.010,.008,.032],[.021,.006,.006],shineMat);
      ell(head,0x24252b,[side*.233,.195,.289],[.113,.044,.075],furMat,[0,0,side*.27]);
    }
    const eyes = bones.filter(b => b.name.startsWith('eye'));
    const ears = [-1, 1].map(side => {
      const b=joint(head,'ear'+side,side*.303,.24,-.025);part(b,side<0?earL:earR,EAR);return {b,side};
    });
    const jaw = joint(head, 'jaw', 0, -.12, .26);
    ell(jaw,0x170f16,[0,-.060,.27],[.251,.045,.29],wetMat);
    ell(jaw,MUZZLE,[0,-.110,.255],[.265,.083,.29]);
    const tongue = joint(jaw, 'tongue', 0, -.062, .30);
    small(tongue, 0xc8757b, [0, 0, 0], [.064, .022, .075]);
    const legs = [];
    for (const front of [true, false]) for (const side of [-1, 1]) {
      const b=joint(body,(front?'fore':'hind')+side,side*.30,.75,front?.37:-.56);
      const shin = joint(b, 'shin', 0, -.30, front ? 0 : -.035);
      const limb=part(b,front?foreGeo:hindGeo,COAT,[0,0,0],[front?1.30:1.14,1,front?1.28:1.10],furMat,[Math.PI/2,0,0]);
      limb.skin = z => { let w = clamp01((z-.20)/.20); w = w*w*(3-2*w); return { bone: shin, w }; };
      const foot = joint(shin, 'paw', 0, -.34, .035);
      ell(foot,COAT,[0,-.018,.08],[front?.175:.153,.10,front?.24:.213]);
      for(const x of [-.09,0,.09])part(foot,new THREE.ConeGeometry(.021,.11,8),0xb1a488,[x,-.005,.292],[1,1,1],wetMat,[Math.PI/2,0,0]);
      for (const x of [-.045, .045]) curve(foot, [[x, .025, .228], [x, .047, .17], [x, .055, .11]], .0035, 0x493023, furMat);
      legs.push({ b, shin, foot, front, side });
    }
    const tail = joint(body, 'tail', 0, .83, -.79); part(tail, tailGeo, COAT);
    // Chitin armour and a raised spinal mane give Bilbo a monster silhouette from the game camera.
    ell(body,0x26272a,[0,1.12,.16],[.38,.14,.57],furMat,[-.15,0,0]);
    for(const side of [-1,1]){
      ell(body,0x494443,[side*.39,.94,.31],[.115,.29,.30],furMat,[0,0,-side*.18]);
      curve(body,[[side*.43,1.14,.51],[side*.45,.85,.48],[side*.43,.78,.11]],.018,0x8e8170,wetMat);
      for(let j=0;j<3;j++)part(body,new THREE.ConeGeometry(.057,.25-j*.025,8),0x968a78,[side*(.32+j*.055),1.17-j*.045,.35-j*.10],[1,1,1],wetMat,[.22,0,-side*.52]);
      curve(body,[[side*.40,1.06,-.28],[side*.42,.84,-.21],[side*.41,.92,-.08]],.016,0xc34b37,shineMat);
      curve(body,[[side*.42,.95,-.22],[side*.40,.87,-.38]],.008,0xd96945,shineMat);
    }
    for(let j=0;j<7;j++){
      const z=-.67+j*.155,h=.13+.11*Math.sin(j/6*Math.PI);
      part(body,new THREE.ConeGeometry(.055,h,8),0x66605a,[0,1.12+(j>3?.12:0),z],[1,1,1],wetMat,[-.34,0,0]);
      ell(body,0x29292d,[0,1.065+(j>3?.12:0),z],[.10,.06,.105],furMat);
    }
    part(neck,new THREE.TorusGeometry(.34,.036,8,28),0x716c60,[0,.01,.03],[1,1,1],wetMat,[Math.PI/2,0,0]);
    for(const side of [-1,1]){
      // Brow ridges and cheek fins leave the broad canine nose exposed.
      ell(head,0x333337,[side*.215,.21,.12],[.16,.06,.26],wetMat,[0,0,side*.17]);
      part(head,new THREE.ConeGeometry(.058,.24,10),0x8a7a68,[side*.30,.24,-.05],[1,1,1],wetMat,[-.35,0,-side*.40]);
      curve(head,[[side*.14,.20,.40],[side*.23,.10,.43],[side*.19,.025,.57]],.012,0xc44537,shineMat);
      for(let j=0;j<4;j++){
        const z=.68-j*.083,x=side*(.245+j*.013),h=j===1?.17:.13-j*.013;
        part(head,new THREE.ConeGeometry(.022,h,8),0xd1c2a3,[x,-.158,z],[1,1,1],wetMat,[Math.PI,0,side*.1]);
        part(jaw,new THREE.ConeGeometry(.021,h*.85,8),0xbcb094,[x,-.006,z-.255],[1,1,1],wetMat,[0,0,-side*.08]);
      }
      ell(jaw,0x594a46,[side*.19,-.12,.36],[.10,.10,.17],furMat);
    }
    for(const {b,front} of legs){ell(b,0x4c4844,[0,-.14,.008],[front?.15:.13,.18,.14],wetMat);part(b,new THREE.ConeGeometry(.040,.16,8),0x998d78,[0,-.03,-.11],[1,1,1],wetMat,[-.75,0,0]);}
    ell(body,0x48423e,[0,.78,.63],[.31,.28,.065],furMat,[-.20,0,0]);
    curve(body,[[-.08,.89,.694],[0,.83,.713],[.08,.89,.694]],.014,0xb23d34,shineMat);
    root.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones), meshes = [];
    // All fur shares one skinned surface; the whole dog uses only four material draws.
    for (const mat of new Set(parts.map(p => p.mat))) {
      const list = parts.filter(p => p.mat === mat), positions = [], normals = [], colors = [], uvs = [], skinI = [], skinW = [], indices = [];
      const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
      const muzzleColor = new THREE.Color(MUZZLE), painted = new THREE.Color();
      let base = 0;
      for (const p of list) {
        const m = p.bone.matrixWorld.clone().multiply(p.m), a = p.geo.attributes, bi = bones.indexOf(p.bone);
        nm.getNormalMatrix(m);
        for (let i = 0; i < a.position.count; i++) {
          v.fromBufferAttribute(a.position, i).applyMatrix4(m); positions.push(v.x, v.y, v.z);
          n.fromBufferAttribute(a.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
          const shade = mat === furMat ? .91 + .09 * clamp01(n.y * .5 + .5) : 1;
          painted.copy(p.color);
          if (p.muzzle) painted.lerp(muzzleColor, clamp01((a.position.getZ(i)-.20)/.32) * clamp01((.20-a.position.getY(i))/.20));
          colors.push(painted.r * shade, painted.g * shade, painted.b * shade);
          uvs.push(a.uv ? a.uv.getX(i) : 0, a.uv ? a.uv.getY(i) : 0);
          const skin = p.skin ? p.skin(a.position.getZ(i)) : null;
          skinI.push(bi, skin ? bones.indexOf(skin.bone) : 0, 0, 0); skinW.push(skin ? 1-skin.w : 1, skin ? skin.w : 0, 0, 0);
        }
        const index = p.geo.index;
        for (let i = 0; i < (index ? index.count : a.position.count); i++) indices.push(base + (index ? index.getX(i) : i));
        base += a.position.count;
      }
      const g = new THREE.BufferGeometry();
      for (const [key, data, size] of [['position', positions, 3], ['normal', normals, 3], ['color', colors, 3], ['uv', uvs, 2], ['skinWeight', skinW, 4]]) g.setAttribute(key, new THREE.Float32BufferAttribute(data, size));
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinI, 4)); g.setIndex(indices); g.computeBoundingSphere();
      const mesh = new THREE.SkinnedMesh(g, mat); mesh.name = 'Bilbo surface'; mesh.castShadow = mat !== shineMat; mesh.receiveShadow = false;
      mesh.frustumCulled = false; root.add(mesh); mesh.bind(skel); meshes.push(mesh);
    }
    owned.forEach(g => g.dispose());
    let t = 0, stride = 0, run = 0, rest = 0, sit = 0, brace = 0, broken = 0, roar = 0, barkPrev = 0, blinkAt = 2.8, blink = 0;
    function update(dt, state = {}) {
      dt = Math.min(Math.max(dt || 0, 0), .1); t += dt;
      const speed = Math.max(0, state.speed || 0), moving = speed > .10;
      run = smooth(run, clamp01(speed / 5.2), 10, dt);
      stride += speed * dt * 3.8;
      rest = moving || state.bark > 0 ? 0 : rest + dt;
      broken=smooth(broken,state.armorBreak?1:0,state.armorBreak?7:3,dt);
      brace=smooth(brace,clamp01(state.guard||0)*(1-broken),16,dt);
      if((state.bark||0)>1.15&&barkPrev<.95)roar=1.30;
      barkPrev=state.bark||0;roar=Math.max(0,roar-dt);
      const rt=1-roar/1.30,threat=roar>0?clamp01(rt/.07)*(1-clamp01((rt-.76)/.24))*(1-broken):0;
      sit = smooth(sit, state.sit&&!state.armorBreak ? 1 : 0, 4, dt);
      const age = 1.30 - (state.bark || 0);
      const bark = state.bark > 0 ? Math.exp(-Math.pow((age - .13) / .11, 2)) + Math.exp(-Math.pow((age - .85) / .12, 2)) : 0;
      const a=clamp01(state.attack||0),strike=a>0?Math.exp(-Math.pow(((1-a)-.20)/.15,2)):0;
      const bite=Math.max(strike,state.bark>0&&state.bark<.78?Math.exp(-Math.pow((state.bark-.43)/.15,2)):0)*(1-broken);
      const fast=clamp01((speed-3.2)/3.0)*(1-brace)*(1-broken),gait=run*(1-.72*brace)*(1-.85*broken);
      body.position.z=.22*bite-.065*brace+.11*threat;
      body.position.y = -.028 + gait * (.018+.019*fast) * Math.cos(stride * 2) + .004 * Math.sin(t * 2.2) - sit * .13-.095*brace-.16*broken;
      body.rotation.set(.045-.09 * sit + .02 * gait * Math.cos(stride)+.07*fast-.045*brace+.04*broken-.10*bite-.06*threat, 0, .014 * gait * Math.sin(stride)+.010*threat*Math.sin(t*38));
      for (const { b, shin, foot, front, side } of legs) {
        const phase = stride + (front ? 0 : Math.PI*(1-.35*fast)) + (side > 0 ? Math.PI*(1-fast) : 0), s = Math.sin(phase);
        b.position.y = .75 + (front ? .08 * sit : 0);
        b.position.x=side*(front?.33:.29)+side*(.035*brace+.022*threat);
        b.position.z=(front?.37:-.56)+(front?.06*threat:0);
        b.rotation.x = .48 * gait * s + (front ? -.10 : 1.03) * sit+(front?-.20:.17)*brace+(front?-.12:.27)*broken-(front?.27:-.20)*bite;
        shin.rotation.x = .60 * gait * Math.max(0, -Math.cos(phase)) - (front ? 0 : 1.35) * sit+(front?.35:.17)*brace+.25*broken;
        foot.rotation.x = -b.rotation.x * .30 - shin.rotation.x * .55;
      }
      neck.position.z=.40+.10*threat;
      neck.rotation.x = .085-.035*run+.025*bark-.13*bite-.04*brace+.26*broken-.16*threat;
      head.rotation.x = .025 + .028 * (1 - run) * Math.sin(t * 1.4) - .11 * bark+.14*strike-.06*brace+.22*broken+.04*fast+.12*threat;
      head.rotation.y = state.portrait ? -.035 : .045 * (1 - run) * Math.sin(t * .63);
      head.rotation.z = state.portrait ? -.015 : .02 * (1 - run) * Math.sin(t * .7);
      ears.forEach(({ b, side }) => { b.rotation.z = smooth(b.rotation.z, side * (.04 + .10 * gait * Math.sin(stride - .6) + .10 * bark+.16*bite+.17*broken), 12, dt); });
      tail.rotation.y = (.035 + .10 * run) * Math.sin(t * 5.4);
      tail.rotation.x = -.10 + .07 * Math.sin(t * 2.7) - sit * .18;
      jaw.rotation.x = .14+.04*(1-run)+.48*bark*(1-broken)*(roar>0?1:.32)+.35*bite+.045*broken+.52*threat;
      tongue.scale.setScalar(.035);
      blinkAt -= dt;
      if (blinkAt <= 0) { blink = .18; blinkAt = 2.7 + Math.random() * 2.4; }
      blink = Math.max(0, blink - dt);
      const lid = state.portrait ? 1 : 1 - .92 * Math.sin(Math.PI * clamp01(blink / .18));
      eyes.forEach(b => { b.scale.y = lid*.60;b.rotation.z= b.name.endsWith("1")&&!b.name.endsWith("-1") ? .20 : -.20; });
    }
    update(0);
    function dispose() { meshes.forEach(m => m.geometry.dispose()); skel.dispose(); }
    return { root, update, dispose, bones, meshes };
  }

  let portraitUrl = null;
  function portrait() {
    if (portraitUrl) return portraitUrl;
    if (typeof renderer === 'undefined') return null;
    const N = 192, sc = new THREE.Scene(), m = create(); m.update(0, { portrait: true }); sc.add(m.root);
    sc.add(new THREE.HemisphereLight(0xfff3dd, 0x5f4b3d, 1.5));
    const key = new THREE.DirectionalLight(0xffe5c4, 3.1); key.position.set(-3, 4, 5); sc.add(key);
    const fill = new THREE.DirectionalLight(0xc5defb, 1.5); fill.position.set(3, 2, -1); sc.add(fill);
    const cam = new THREE.OrthographicCamera(-.54, .54, .54, -.54, .1, 10);
    cam.position.set(.10, 1.28, 4); cam.lookAt(0, 1.15, .55); cam.updateMatrixWorld();
    const rt = new THREE.WebGLRenderTarget(N, N, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const oldRT = renderer.getRenderTarget(), oldC = renderer.getClearColor(new THREE.Color()), oldA = renderer.getClearAlpha();
    try {
      renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(sc, cam);
      const pixels = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(rt, 0, 0, N, N, pixels);
      const c = document.createElement('canvas'); c.width = c.height = N;
      const ctx = c.getContext('2d'), out = ctx.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const a = ((N - 1 - y) * N + x) * 4, b = (y * N + x) * 4, alpha = pixels[a + 3], k = alpha > 0 ? 255 / alpha : 0;
        for (let j = 0; j < 3; j++) out.data[b + j] = Math.min(255, pixels[a + j] * k);
        out.data[b + 3] = alpha;
      }
      ctx.putImageData(out, 0, 0); portraitUrl = c.toDataURL('image/png'); return portraitUrl;
    } finally { renderer.setRenderTarget(oldRT); renderer.setClearColor(oldC, oldA); rt.dispose(); m.dispose(); }
  }
  return { create, portrait };
})();
