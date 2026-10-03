/* Position history, smooth arrival and one-way separation: Bilbo never pushes Feza. */
const BILBO_FOLLOW = (() => {
  const radius = .34, spacing = 1.75, personal = 1.02;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const blend = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
  function create(env) {
    const pos = { x: 0, z: 0 };
    let trail = [], last = null, vx = 0, vz = 0, face = 0, speed = 0, walking = false, plan = [], planAt = 0, time = 0;
    const free = (x, z) => env.free(x, z, radius);
    function clear(a, b) {
      const n = Math.max(1, Math.ceil(dist(a, b) / .2));
      for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false;
      return true;
    }
    function reset(hero, x, z, angle = 0) {
      pos.x = x; pos.z = z; face = angle; speed = vx = vz = 0; walking = false; plan = []; planAt = 0;
      trail = [{ x, z }, { x: hero.x, z: hero.z }]; last = { x: hero.x, z: hero.z };
    }
    function goal(hero) {
      // Attacking or turning the head does not move the goal. Only actual footsteps do.
      if (!last || dist(hero, last) > .18) {
        trail.push({ x: hero.x, z: hero.z }); last = { x: hero.x, z: hero.z };
        if (trail.length > 160) trail.shift();
      }
      let prev = hero, left = spacing, g = trail[0] || hero;
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i], d = dist(prev, p);
        if (d >= left) { const k = left / d; g = { x: prev.x + (p.x - prev.x) * k, z: prev.z + (p.z - prev.z) * k }; break; }
        left -= d; prev = p;
      }
      // A U-turn may put an old footprint inside Feza. Pick a fixed, safe side instead.
      if (dist(g, hero) < personal + .18 || !free(g.x, g.z)) {
        const a = Math.atan2(pos.x - hero.x, pos.z - hero.z);
        for (const turn of [0, -.6, .6, -1.2, 1.2, Math.PI]) {
          const p = { x: hero.x + Math.sin(a + turn) * spacing, z: hero.z + Math.cos(a + turn) * spacing };
          if (free(p.x, p.z) && clear(hero, p)) { g = p; break; }
        }
      }
      return g;
    }
    function step(dt, hero) {
      dt = Math.min(.05, Math.max(0, dt)); time += dt;
      const g = goal(hero);
      // Only a teleport/zone warp warrants snapping, never ordinary walking or a nearby wall.
      if (dist(pos, hero) > 18 && free(g.x, g.z)) { reset(hero, g.x, g.z, face); return { pos, face, speed: 0 }; }
      let target = g;
      if (!clear(pos, g)) {
        if (time >= planAt) { plan = env.route ? env.route(pos.x, pos.z, g.x, g.z) || [] : []; planAt = time + .8; }
        while (plan.length && dist(pos, plan[0]) < .23) plan.shift();
        if (plan.length) target = plan[0];
      } else plan = [];
      const d = dist(pos, target);
      if (walking ? d < .13 : d > .36) walking = !walking;
      let dx = target.x - pos.x, dz = target.z - pos.z;
      let desired = walking ? Math.min(7.0, d * 3.0) : 0;
      let ux = d > .001 ? dx / d : 0, uz = d > .001 ? dz / d : 0;
      const hx = pos.x - hero.x, hz = pos.z - hero.z, hd = Math.hypot(hx, hz);
      // Steer around the child before reaching his body; use the same side throughout a pass.
      if (hd < 1.65 && hd > .001 && ux * hx + uz * hz < 0) {
        const into = (ux * hx + uz * hz) / (hd * hd);
        ux -= hx * into; uz -= hz * into;
        if (Math.hypot(ux, uz) < .1) { ux = -hz / hd; uz = hx / hd; }
        const l = Math.hypot(ux, uz); ux /= l; uz /= l;
      }
      vx = blend(vx, ux * desired, 9, dt); vz = blend(vz, uz * desired, 9, dt);
      if (!walking && Math.hypot(vx, vz) < .025) vx = vz = 0;
      const before = { x: pos.x, z: pos.z };
      let mx = vx * dt, mz = vz * dt;
      const len = Math.hypot(mx, mz);
      if (len > d && d > .01) { mx *= d / len; mz *= d / len; }
      env.move(pos, mx, mz, radius);
      // Project only Bilbo outward. Feza's input/position is never modified.
      const sep = dist(pos, hero);
      if (sep < personal) {
        let ax = pos.x - hero.x, az = pos.z - hero.z;
        if (sep < .001) { ax = Math.cos(face); az = -Math.sin(face); }
        const n = Math.hypot(ax, az), x = hero.x + ax / n * personal, z = hero.z + az / n * personal;
        if (free(x, z) && clear(pos, { x, z })) { pos.x = x; pos.z = z; }
      }
      const travelled = dist(before, pos), actual = dt > 0 ? travelled / dt : 0;
      speed = blend(speed, Math.min(8, actual), 9, dt);
      if (travelled > .002 && actual > .10) {
        const targetFace = Math.atan2(pos.x - before.x, pos.z - before.z);
        const delta = Math.atan2(Math.sin(targetFace - face), Math.cos(targetFace - face));
        face += delta * (1 - Math.exp(-8 * dt));
      }
      if (actual < .08 && desired > .5) { vx = vz = 0; }
      return { pos, face, speed };
    }
    return { pos, reset, step };
  }
  return { create };
})();
