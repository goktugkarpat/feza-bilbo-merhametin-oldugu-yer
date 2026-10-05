/* ── Audio: synthesized sound effects (WebAudio), generative music, narrator voice + subtitle hook ──
   Nothing is created until AUD.unlock() (first user gesture). ?sessiz → no AudioContext ever, but narrator
   lines still drive AUD.onSubtitle with (recorded or estimated) durations. Only global: AUD. */
const AUD = (() => {
  'use strict';
  const QUIET = typeof SILENT !== 'undefined' ? SILENT : /[?&]sessiz(&|=|$)/.test(location.search);
  const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const semi = s => Math.pow(2, s / 12);
  const wallNow = () => performance.now() / 1000;

  // soundOn = sound effects only. The narrator has its own flag (voiceOn), never exposed in the kid-facing UI:
  // it is the only guidance a non-reader gets, so an accidental 'Ses' tap must not silence it.
  const A = { musicOn: true, soundOn: true, voiceOn: true, onSubtitle: null, LINES: {}, theme: null, current: null };
  let ctx = null, M = null, unlocked = false, want = null, lx = 0, lz = 0, dimmed = false;

  // ───────────────────────── mixer ─────────────────────────
  const MUSIC_VOL = 0.28, SFX_VOL = 0.8, VOICE_VOL = 1.0, DUCK = 0.3, DIM = 0.35;
  const musicLevel = () => (A.musicOn ? MUSIC_VOL * (dimmed ? DIM : 1) : 0);
  function gainNode(c, v) { const g = c.createGain(); g.gain.value = v; return g; }
  function wave(c, amps) {
    const n = amps.length + 1, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 0; i < amps.length; i++) im[i + 1] = amps[i];
    return c.createPeriodicWave(re, im);
  }
  // Soft room: decorrelated stereo noise, exponential decay, getting darker over time, a few early reflections.
  function makeIR(c, secs = 1.9) {
    const sr = c.sampleRate, n = Math.floor(sr * secs), b = c.createBuffer(2, n, sr), pre = Math.floor(sr * 0.012);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch); let lp = 0;
      for (let i = pre; i < n; i++) {
        const x = (i - pre) / (n - pre);
        lp += (Math.random() * 2 - 1 - lp) * (0.75 - 0.62 * x);
        d[i] = lp * Math.exp(-x * 6.5);
      }
      const taps = ch ? [0.019, 0.034, 0.047] : [0.023, 0.029, 0.041];
      taps.forEach((tt, k) => { const i = Math.floor(sr * tt); if (i < n) d[i] += (0.5 - k * 0.12) * (k & 1 ? -1 : 1); });
    }
    return b;
  }
  function makeMix(c, full, raw) {
    const m = { c };
    m.out = gainNode(c, 0.95); m.out.connect(c.destination);
    const lim = c.createDynamicsCompressor();   // brick-wall-ish safety limiter
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.09;
    lim.connect(m.out);
    const comp = c.createDynamicsCompressor();  // glue: many sounds at once stay smooth
    comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.25;
    comp.connect(lim);
    const hp = c.createBiquadFilter();   // nothing below ~45 Hz: inaudible on tablet speakers, only eats headroom
    hp.type = 'highpass'; hp.frequency.value = 45; hp.Q.value = 0.7; hp.connect(raw ? m.out : comp);
    m.master = gainNode(c, 0.85); m.master.connect(hp);
    m.verb = c.createConvolver(); m.verb.buffer = makeIR(c);
    const vret = gainNode(c, 0.8); m.verb.connect(vret); vret.connect(m.master);
    m.sfx = gainNode(c, full || A.soundOn ? SFX_VOL : 0); m.sfx.connect(m.master);
    const ss = gainNode(c, 0.16); m.sfx.connect(ss); ss.connect(m.verb);
    m.duck = gainNode(c, 1); m.duck.connect(m.master);
    const ms = gainNode(c, 0.34); m.duck.connect(ms); ms.connect(m.verb);
    m.music = gainNode(c, full ? MUSIC_VOL : musicLevel()); m.music.connect(m.duck);
    m.voice = gainNode(c, full || A.voiceOn ? VOICE_VOL : 0); m.voice.connect(m.master);
    const vs = gainNode(c, 0.05); m.voice.connect(vs); vs.connect(m.verb);
    const nb = c.createBuffer(1, Math.floor(c.sampleRate * 3), c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    m.noise = nb;
    m.waves = {
      sq: wave(c, [1, 0, 0.33, 0, 0.17, 0, 0.09, 0, 0.045, 0, 0.02]),
      saw: wave(c, [1, 0.5, 0.3, 0.2, 0.13, 0.09, 0.06, 0.04, 0.025, 0.015]),
      brass: wave(c, [1, 0.8, 0.55, 0.38, 0.25, 0.16, 0.1, 0.06, 0.035, 0.02]),
      flute: wave(c, [1, 0.16, 0.05, 0.015]),
      rec: wave(c, [1, 0.1, 0.18, 0.035, 0.05, 0.012, 0.012]),   // recorder: pure, a touch of odd "woodiness"
    };
    return m;
  }

  // ───────────────────────── synthesis primitives (all take a mix so they also render offline) ─────────────────────────
  function curve(prm, t, pts, step) {
    prm.setValueAtTime(pts[0][1], t + pts[0][0]);
    for (let i = 1; i < pts.length; i++) {
      const tt = t + pts[i][0], v = Math.max(1e-4, pts[i][1]);
      if (step) prm.setValueAtTime(v, tt); else prm.exponentialRampToValueAtTime(v, tt);
    }
  }
  // Percussive (exp decay to -60 dB at t+dur) or held (hold=1: attack, sustain, linear release) envelope.
  function env(prm, t, a, vol, dur, hold, rel) {
    a = Math.min(a, dur * 0.5);
    prm.setValueAtTime(0, t);
    prm.linearRampToValueAtTime(vol, t + a);
    if (hold) { const r = Math.min(rel || 0.08, dur - a); prm.setValueAtTime(vol, t + dur - r); prm.linearRampToValueAtTime(0, t + dur); }
    else prm.exponentialRampToValueAtTime(Math.max(1e-6, vol * 1e-3), t + dur);
  }
  // Oscillator voice. o: {f1, glide, fs:[[dt,f]..], step, type, wave, det, a, hold, rel, vib:[hz,cents,delay], lp|hp|bp: f or [[dt,f]..], q}
  function T(m, out, t, f, dur, vol, o) {
    o = o || {};
    const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), end = t + dur + 0.03;   // gain starts at 0: no first-sample click
    if (o.wave) os.setPeriodicWave(m.waves[o.wave]); else os.type = o.type || 'sine';
    if (o.fs) curve(os.frequency, t, o.fs, o.step);
    else { os.frequency.setValueAtTime(f, t); if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || dur)); }
    if (o.det) os.detune.setValueAtTime(o.det, t);
    if (o.vib && dur > (o.vib[2] || 0.08)) {
      const l = c.createOscillator(), lg = gainNode(c, 0);
      l.frequency.value = o.vib[0];
      lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] || 0.08));
      l.connect(lg); lg.connect(os.detune); l.start(t); l.stop(end);
    }
    let n = os;
    const ff = o.lp || o.hp || o.bp;
    if (ff) {
      const bq = c.createBiquadFilter();
      bq.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass'; bq.Q.value = o.q ?? 0.7;
      if (Array.isArray(ff)) curve(bq.frequency, t, ff); else bq.frequency.setValueAtTime(ff, t);
      os.connect(bq); n = bq;
    }
    env(g.gain, t, o.a ?? 0.004, vol, dur, o.hold, o.rel);
    n.connect(g); g.connect(out);
    os.start(t); os.stop(end);
  }
  // Filtered noise. o: {type='bandpass', f, f1, fs, q, a, hold, rel, am:[hz, depth]}
  function N(m, out, t, dur, vol, o) {
    o = o || {};
    const c = m.c, s = c.createBufferSource(), bq = c.createBiquadFilter(), g = gainNode(c, 0);
    s.buffer = m.noise;
    bq.type = o.type || 'bandpass'; bq.Q.value = o.q ?? 1;
    if (o.fs) curve(bq.frequency, t, o.fs);
    else { bq.frequency.setValueAtTime(o.f || 1000, t); if (o.f1) bq.frequency.exponentialRampToValueAtTime(o.f1, t + dur); }
    env(g.gain, t, o.a ?? 0.003, vol, dur, o.hold, o.rel);
    s.connect(bq); bq.connect(g);
    if (o.am) {
      const a = gainNode(c, 1 - o.am[1] * 0.5), l = c.createOscillator(), lg = gainNode(c, o.am[1] * 0.5);
      l.frequency.value = o.am[0]; l.connect(lg); lg.connect(a.gain); g.connect(a); a.connect(out);
      l.start(t); l.stop(t + dur + 0.03);
    } else g.connect(out);
    s.start(t, rnd(0, Math.max(0, m.noise.duration - dur - 0.1)), dur + 0.03);
  }
  // FM bell: ratio 3.5 = glassy twinkle, 4 = music box / celesta.
  function B(m, out, t, f, dur, vol, ratio = 3.5, idx = 1.2) {
    const c = m.c, car = c.createOscillator(), mod = c.createOscillator(), mg = gainNode(c, 0), g = gainNode(c, 0), end = t + dur + 0.03;
    car.frequency.setValueAtTime(f, t); mod.frequency.setValueAtTime(Math.min(f * ratio, 18000), t);
    mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.5);
    mod.connect(mg); mg.connect(car.frequency);
    env(g.gain, t, 0.002, vol, dur);
    car.connect(g); g.connect(out);
    car.start(t); mod.start(t); car.stop(end); mod.stop(end);
  }
  const arp = (m, o, t, fs, gap, dur, vol, p, ratio = 4, idx = 0.8) => fs.forEach((f, i) => B(m, o, t + i * gap, f * p, dur, vol, ratio, idx));
  const sparkle = (m, o, t, n, f0, f1, span, vol) => { for (let i = 0; i < n; i++) B(m, o, t + span * i / n, f0 * Math.pow(f1 / f0, i / (n - 1)) * rnd(0.98, 1.02), 0.35, vol * rnd(0.7, 1), 3.5, 0.9); };
  // Lightsaber voice: two slightly detuned buzzy saws + a quiet octave square, a "projector" flutter (AM) for the grit,
  // through a resonant lowpass (kept ≤ ~3.5 kHz so it stays soft). fs / lp are [[dt, value]..] curves: a swing is the
  // doppler "vvzzum" = pitch and brightness up, then down. o: {a, rel, hold (0 = percussive), q, flutter (Hz), buzz (0..0.5)}
  // A gentle high-pass thins the fundamental: tablet speakers cannot play it anyway, it would only eat headroom.
  function saber(m, out, t, dur, vol, fs, lp, o) {
    o = o || {};
    const c = m.c, g = gainNode(c, 0), bq = c.createBiquadFilter(), hp = c.createBiquadFilter(), end = t + dur + 0.03, bz = o.buzz ?? 0.28;
    bq.type = 'lowpass'; bq.Q.value = o.q ?? 3; curve(bq.frequency, t, lp);
    hp.type = 'highpass'; hp.Q.value = 0.6; hp.frequency.value = o.hp || 130; bq.connect(hp);
    const am = gainNode(c, 1 - bz), l = c.createOscillator(), lg = gainNode(c, bz);
    l.frequency.value = o.flutter || 36; l.connect(lg); lg.connect(am.gain);
    for (const [mul, det, w, v] of [[1, 0, 'saw', 1], [1, 11, 'saw', 0.75], [2, -5, 'sq', 0.22]]) {
      const os = c.createOscillator(), og = gainNode(c, v);
      os.setPeriodicWave(m.waves[w]); os.detune.value = det;
      curve(os.frequency, t, fs.map(([a, f]) => [a, f * mul]));
      os.connect(og); og.connect(bq); os.start(t); os.stop(end);
    }
    hp.connect(am); am.connect(g);
    if (o.hold === 0) env(g.gain, t, o.a ?? 0.003, vol, dur);
    else env(g.gain, t, o.a ?? 0.05, vol, dur, 1, o.rel ?? 0.12);
    g.connect(out); l.start(t); l.stop(end);
  }
  // A few tiny random crackles (the electric "zzkt" of a lightsaber touching something), bandpassed so they never get shrill.
  const crackle = (m, o, t, n, span, vol, p) => { for (let i = 0; i < n; i++) N(m, o, t + rnd(0, span), 0.016, vol * rnd(0.6, 1), { f: rnd(1500, 3200) * p, q: 2.5, a: 0.001 }); };

  // A real dog remains the leading voice; chest and dry throat supply threatening mass.
  // Routine barks decay before the next 1.6 s bite. The rare protective bark alone gets a long growl.
  function dogVoice(m,o,t,p,guard) {
    if (!m.bilboBark) return 0;
    if (m.bilboVoice) { try { m.bilboVoice.stop(t); } catch(e) {} }
    const s=m.c.createBufferSource(), lp=m.c.createBiquadFilter();
    s.buffer=m.bilboBark;m.bilboVoice=s;const rate=p*(guard?.79:.86);
    s.playbackRate.value=rate;lp.type='lowpass';lp.frequency.value=guard?3600:4400;lp.Q.value=.6;
    s.connect(lp);lp.connect(o);s.start(t);s.onended=()=>{s.disconnect();lp.disconnect()};
    const d=guard?1.02:.43,k=guard?1.45:1;
    T(m,o,t,112*p,d,.047*k,{wave:'saw',lp:430,f1:guard?73*p:89*p,hold:1,a:.035,rel:guard?.42:.16,vib:[21,16,.025]});
    T(m,o,t+.025,174*p,d*.8,.025*k,{wave:'sq',lp:650,f1:111*p,hold:1,a:.03,rel:.22});
    N(m,o,t,d*.86,.045*k,{f:390,f1:170,q:1.5,a:.03,hold:1,rel:guard?.35:.14,am:[27,.72]});
    N(m,o,t+.015,.14,.042,{f:1250,f1:460,q:.8,a:.006,am:[43,.55]});
    B(m,o,t+.018,370*p,.19,.013,2.76,.35);
    if(guard){
      T(m,o,t+.03,78*p,1.1,.052,{type:'triangle',f1:58*p,hold:1,a:.035,rel:.48});
      N(m,o,t+.12,.76,.052,{f:610,f1:230,q:1.15,a:.12,hold:1,rel:.35,am:[13,.75]});
      N(m,o,t,.09,.073,{f:1050,f1:410,q:.85,a:.004});
    }
    return Math.max(guard?1.2:.5,m.bilboBark.duration/rate);
  }

  // ───────────────────────── sound effects (return length in seconds) ─────────────────────────
  // All soft and cartoony: sine bonks, filtered-noise whooshes, little bell arpeggios. p = pitch multiplier.
  const SFX = {
    // ── lightsaber (every weapon is an ışın kılıcı): "vvzzum" swings, crackly zap + soft thump on hit, ignite / retract.
    // Only short one-shots: there is deliberately no constant hum while walking around.
    swing(m, o, t, p) {
      saber(m, o, t, 0.3, 0.22, [[0, 100 * p], [0.12, 165 * p], [0.3, 105 * p]], [[0, 560], [0.12, 2700], [0.3, 700]], { a: 0.06, rel: 0.15 });
      N(m, o, t, 0.28, 0.2, { fs: [[0, 480 * p], [0.12, 1900 * p], [0.28, 650 * p]], q: 1.2, a: 0.08 }); return 0.33;
    },
    swingBig(m, o, t, p) {   // combo finisher: a longer, deeper "vvvZZUUMM" and a little twinkle
      saber(m, o, t, 0.46, 0.24, [[0, 84 * p], [0.19, 180 * p], [0.46, 90 * p]], [[0, 480], [0.19, 3200], [0.46, 600]], { a: 0.09, rel: 0.22 });
      N(m, o, t, 0.44, 0.24, { fs: [[0, 350 * p], [0.19, 2000 * p], [0.44, 520 * p]], q: 1.1, a: 0.12 });
      B(m, o, t + 0.2, 1760 * p, 0.35, 0.03); B(m, o, t + 0.26, 2349 * p, 0.35, 0.026); return 0.55;
    },
    hit(m, o, t, p) {   // crackly "zzkt" + soft thump
      T(m, o, t, 290 * p, 0.13, 0.45, { f1: 95 * p, a: 0.002 });   // "thup" high enough for tablet speakers
      T(m, o, t, 580 * p, 0.05, 0.06, { f1: 200 * p, type: 'triangle', a: 0.001 });
      saber(m, o, t, 0.12, 0.2, [[0, 215 * p], [0.12, 125 * p]], [[0, 3000], [0.12, 800]], { hold: 0, flutter: 62, buzz: 0.45 });
      N(m, o, t, 0.09, 0.1, { f: 2300 * p, q: 1.2, am: [70, 0.9], a: 0.001 });
      crackle(m, o, t, 4, 0.07, 0.18, p); return 0.18;
    },
    hitSoft(m, o, t, p) { T(m, o, t, 600 * p, 0.08, 0.3, { f1: 260 * p, a: 0.002 }); N(m, o, t, 0.03, 0.09, { type: 'lowpass', f: 2500, a: 0.001 }); return 0.1; },
    bilboBark(m, o, t, p) { return dogVoice(m,o,t,p,false); },
    bilboGuard(m, o, t, p) { return dogVoice(m,o,t,p,true); },
    crit(m, o, t, p) {   // bigger zap, rounder thump, then a happy twinkle
      T(m, o, t, 250 * p, 0.24, 0.55, { f1: 70 * p, a: 0.002 });
      T(m, o, t, 500 * p, 0.07, 0.07, { f1: 160 * p, type: 'triangle', a: 0.001 });
      saber(m, o, t, 0.22, 0.24, [[0, 240 * p], [0.05, 300 * p], [0.22, 110 * p]], [[0, 3400], [0.22, 750]], { hold: 0, flutter: 55, buzz: 0.5 });
      N(m, o, t, 0.18, 0.13, { f: 2200 * p, q: 1, am: [55, 0.9], a: 0.001 });
      crackle(m, o, t, 7, 0.14, 0.2, p);
      arp(m, o, t + 0.04, [1568, 2093, 2637], 0.05, 0.5, 0.1, p, 3.5, 1); return 0.7;
    },
    saberOn(m, o, t, p) {   // ignition: tiny snap-hiss, the hum rises into place ("tssh-vMMMM"), a sparkle for the flash, then fades
      N(m, o, t, 0.09, 0.22, { type: 'highpass', f: 2600, q: 0.7, a: 0.002 });
      saber(m, o, t, 0.8, 0.24, [[0, 44 * p], [0.26, 120 * p], [0.4, 104 * p], [0.8, 100 * p]], [[0, 300], [0.26, 2900], [0.45, 1400], [0.8, 650]], { a: 0.03, rel: 0.45 });
      T(m, o, t, 320 * p, 0.28, 0.035, { f1: 1250 * p, a: 0.02 });
      B(m, o, t + 0.24, 1760 * p, 0.5, 0.045); B(m, o, t + 0.3, 2637 * p, 0.5, 0.035); return 0.85;
    },
    saberOff(m, o, t, p) {   // retract: the hum sinks and closes ("vmmmp")
      saber(m, o, t, 0.46, 0.22, [[0, 104 * p], [0.08, 112 * p], [0.46, 38 * p]], [[0, 1900], [0.46, 240]], { a: 0.01, rel: 0.2 });
      N(m, o, t, 0.3, 0.07, { fs: [[0, 2400], [0.3, 420]], q: 1, a: 0.01 }); return 0.5;
    },
    pop(m, o, t, p) {   // enemy turned happy: bubbly bloop + happy little arpeggio
      T(m, o, t, 340 * p, 0.1, 0.42, { f1: 1250 * p, glide: 0.06, a: 0.002 });
      [1047, 1319, 1568, 2093].forEach((f, i) => B(m, o, t + 0.06 + i * 0.055, f * p, 0.42, 0.11 - i * 0.012, 4, 0.7));
      N(m, o, t + 0.05, 0.25, 0.035, { type: 'highpass', f: 6500, a: 0.02 }); return 0.65;
    },
    coin(m, o, t, p) {
      T(m, o, t, 988 * p, 0.075, 0.11, { wave: 'sq', lp: 5000, a: 0.001, hold: 1, rel: 0.012 });
      T(m, o, t + 0.07, 1319 * p, 0.4, 0.11, { wave: 'sq', lp: 5000, a: 0.001 });
      T(m, o, t + 0.07, 2638 * p, 0.2, 0.025, { a: 0.001 }); return 0.5;
    },
    heart(m, o, t, p) {
      T(m, o, t, 520 * p, 0.2, 0.3, { f1: 1040 * p, a: 0.01 });
      B(m, o, t + 0.08, 1319 * p, 0.5, 0.09, 4, 0.7); B(m, o, t + 0.16, 1760 * p, 0.5, 0.075, 4, 0.7); return 0.7;
    },
    potion(m, o, t, p) {
      for (let i = 0; i < 3; i++) T(m, o, t + i * 0.1, 280 * p * semi(i * 2), 0.08, 0.28, { f1: 500 * p * semi(i * 2), a: 0.005 });
      arp(m, o, t + 0.32, [1319, 1568, 2093, 2637], 0.05, 0.4, 0.065, p);
      N(m, o, t + 0.3, 0.45, 0.03, { type: 'highpass', f: 5500, a: 0.1 }); return 0.9;
    },
    levelup(m, o, t, p) {
      [523, 659, 784, 1047].forEach((f, i) => { T(m, o, t + i * 0.085, f * p, 0.25, 0.08, { wave: 'sq', lp: 3500 }); B(m, o, t + i * 0.085, f * p, 0.6, 0.07, 4, 0.7); });
      [1047, 1319, 1568].forEach((f, i) => T(m, o, t + 0.36, f * p, 1.0, 0.04, { wave: 'saw', lp: 2600, hold: 1, a: 0.04, rel: 0.55, vib: [5.5, 10, 0.25], det: (i - 1) * 6 }));
      B(m, o, t + 0.36, 2093 * p, 1.2, 0.07, 4, 0.8);
      sparkle(m, o, t + 0.42, 10, 2000 * p, 4200 * p, 0.5, 0.03);
      N(m, o, t + 0.36, 0.9, 0.022, { type: 'highpass', f: 7000, a: 0.25 }); return 1.5;
    },
    unlock(m, o, t, p) {
      arp(m, o, t, [784, 880, 1047, 1175, 1319, 1568, 1760, 2093], 0.05, 0.45, 0.065, p);
      [523, 784, 1319].forEach(f => T(m, o, t + 0.42, f * p, 1.0, 0.06, { hold: 1, a: 0.12, rel: 0.6, vib: [5, 8, 0.3] }));
      N(m, o, t + 0.4, 0.8, 0.022, { type: 'highpass', f: 6000, a: 0.2 }); return 1.5;
    },
    star(m, o, t, p) {
      T(m, o, t, 1760 * p, 0.15, 0.14, { f1: 900 * p, a: 0.003 });
      B(m, o, t, 2637 * p, 0.3, 0.07); N(m, o, t, 0.12, 0.035, { type: 'highpass', f: 5500, a: 0.01 }); return 0.35;
    },
    spin(m, o, t, p) {
      N(m, o, t, 0.9, 0.45, { fs: [[0, 350 * p], [0.2, 1500 * p], [0.4, 700 * p], [0.6, 1600 * p], [0.88, 500 * p]], q: 2.2, a: 0.12, hold: 1, rel: 0.35 });
      T(m, o, t, 180 * p, 0.9, 0.045, { type: 'triangle', fs: [[0, 180 * p], [0.45, 420 * p], [0.88, 220 * p]], hold: 1, a: 0.15, rel: 0.3 }); return 0.95;
    },
    ice(m, o, t, p) {
      for (let i = 0; i < 5; i++) B(m, o, t + rnd(0, 0.16), pick([2093, 2349, 2637, 3136, 3520]) * p, 0.6, 0.06, 2.76, 1);
      N(m, o, t, 0.4, 0.11, { type: 'highpass', f: 4200, a: 0.005 });
      T(m, o, t, 2600 * p, 0.18, 0.035, { f1: 3400 * p }); return 0.8;
    },
    shield(m, o, t, p) {
      T(m, o, t, 300 * p, 0.45, 0.13, { f1: 900 * p, a: 0.02 });
      [523, 784, 1319].forEach(f => T(m, o, t + 0.05, f * p, 1.0, 0.055, { hold: 1, a: 0.1, rel: 0.6, vib: [5, 10, 0.2] }));
      B(m, o, t + 0.1, 2093 * p, 0.8, 0.055, 4, 0.8); N(m, o, t, 0.7, 0.02, { type: 'highpass', f: 6000, a: 0.15 }); return 1.1;
    },
    zap(m, o, t, p) {   // cute "bzzt-ting", jagged pitch through a lowpass so it never gets harsh
      T(m, o, t, 700, 0.22, 0.08, { wave: 'saw', step: 1, lp: 2600, a: 0.002, fs: [[0, 700], [0.02, 1100], [0.04, 520], [0.06, 1300], [0.09, 600], [0.12, 1000], [0.16, 480], [0.19, 900]].map(([a, f]) => [a, f * p]) });
      N(m, o, t, 0.2, 0.11, { f: 3200, q: 1.2, am: [45, 0.8] });
      B(m, o, t + 0.12, 1760 * p, 0.35, 0.065); return 0.5;
    },
    meteorFall(m, o, t, p) {
      T(m, o, t, 1600 * p, 0.6, 0.13, { f1: 340 * p, a: 0.05, vib: [9, 25, 0.05] });
      N(m, o, t, 0.6, 0.09, { f: 2200 * p, f1: 600 * p, a: 0.08, q: 1.5 }); return 0.65;
    },
    boom(m, o, t, p) {   // round "pomf", no rumble tail
      T(m, o, t, 220 * p, 0.5, 0.55, { f1: 55 * p, a: 0.003 });
      N(m, o, t, 0.6, 0.4, { type: 'lowpass', fs: [[0, 2000], [0.5, 160]], q: 0.6 });
      N(m, o, t, 0.3, 0.22, { f: 450 * p, q: 0.8, a: 0.004 });
      T(m, o, t, 180 * p, 0.3, 0.16, { f1: 70 * p, type: 'triangle' });
      B(m, o, t + 0.06, 1319 * p, 0.5, 0.035); B(m, o, t + 0.12, 1760 * p, 0.5, 0.03); return 0.7;
    },
    hurt(m, o, t, p) {   // cartoony "boing-oof"
      T(m, o, t, 520 * p, 0.18, 0.24, { f1: 250 * p, type: 'triangle', a: 0.003, vib: [18, 40, 0.02] });
      T(m, o, t, 300 * p, 0.22, 0.24, { f1: 190 * p }); N(m, o, t, 0.05, 0.1, { type: 'lowpass', f: 1400 }); return 0.25;
    },
    chest(m, o, t, p) {
      T(m, o, t, 190 * p, 0.09, 0.28, { f1: 120 * p }); N(m, o, t, 0.05, 0.16, { f: 900, q: 1.5 });
      [784, 1047, 1319, 1568].forEach((f, i) => { B(m, o, t + 0.12 + i * 0.075, f * p, 0.55, 0.09, 4, 0.8); T(m, o, t + 0.12 + i * 0.075, f * p, 0.15, 0.035, { wave: 'sq', lp: 3000 }); });
      [1047, 1319, 1568].forEach(f => T(m, o, t + 0.45, f * p, 0.8, 0.035, { hold: 1, a: 0.05, rel: 0.5 }));
      N(m, o, t + 0.4, 0.7, 0.025, { type: 'highpass', f: 6000, a: 0.1 }); return 1.3;
    },
    portal(m, o, t, p) {
      N(m, o, t, 1.3, 0.26, { fs: [[0, 300], [0.9, 2600], [1.3, 1400]], q: 3, a: 0.3, hold: 1, rel: 0.4 });
      [220, 330, 440].forEach((f, i) => T(m, o, t, f * p, 1.3, 0.032, { wave: 'saw', lp: 900, hold: 1, a: 0.3, rel: 0.6, vib: [4, 14, 0.2], det: (i - 1) * 7 }));
      for (let i = 0; i < 5; i++) B(m, o, t + 0.2 + i * 0.18, pick([1319, 1568, 1760, 2093, 2637]) * p, 0.5, 0.035); return 1.4;
    },
    break(m, o, t, p) {   // clay pot / crate: a few woody clicks
      for (let i = 0; i < 5; i++) N(m, o, t + rnd(0, 0.12), 0.04, rnd(0.14, 0.28), { f: rnd(1200, 3400) * p, q: 2.5, a: 0.001 });
      T(m, o, t, 320 * p, 0.07, 0.24, { f1: 150 * p, a: 0.002 }); N(m, o, t, 0.1, 0.11, { type: 'lowpass', f: 1200 }); return 0.3;
    },
    drop(m, o, t, p) { T(m, o, t, 950 * p, 0.06, 0.11, { f1: 620 * p }); T(m, o, t, 260 * p, 0.09, 0.2, { f1: 150 * p }); N(m, o, t, 0.05, 0.09, { type: 'lowpass', f: 900 }); return 0.15; },
    dropRare(m, o, t, p) {
      SFX.drop(m, o, t, p); B(m, o, t + 0.06, 1319 * p, 0.5, 0.085, 4, 0.8); B(m, o, t + 0.14, 1976 * p, 0.6, 0.085, 4, 0.8);
      N(m, o, t + 0.1, 0.4, 0.02, { type: 'highpass', f: 6000, a: 0.08 }); return 0.8;
    },
    dropLegend(m, o, t, p) {
      SFX.drop(m, o, t, p);
      arp(m, o, t + 0.06, [784, 988, 1175, 1319, 1568, 1976, 2349, 2637], 0.055, 0.5, 0.065, p);
      [523, 659, 784].forEach((f, i) => T(m, o, t + 0.1, f * p, 1.6, 0.03, { wave: 'saw', lp: 1500, hold: 1, a: 0.25, rel: 0.7, vib: [5, 12, 0.3], det: (i - 1) * 5 }));
      T(m, o, t + 0.1, 1047 * p, 1.6, 0.03, { wave: 'flute', hold: 1, a: 0.3, rel: 0.7, vib: [5, 10, 0.3] });
      N(m, o, t + 0.1, 1.2, 0.028, { type: 'highpass', f: 6500, a: 0.3 }); return 1.8;
    },
    click(m, o, t, p) { T(m, o, t, 1150 * p, 0.045, 0.2, { f1: 880 * p, a: 0.002 }); T(m, o, t, 2300 * p, 0.02, 0.03, { type: 'triangle' }); return 0.06; },
    checkpoint(m, o, t, p) {
      arp(m, o, t, [659, 831, 988, 1319], 0.1, 0.9, 0.08, p);
      [659, 988, 1319].forEach(f => T(m, o, t + 0.35, f * p, 1.1, 0.04, { hold: 1, a: 0.2, rel: 0.7 }));
      N(m, o, t + 0.3, 1.0, 0.02, { type: 'highpass', f: 6000, a: 0.3 }); return 1.5;
    },
    roar(m, o, t, p) {   // a pretend, playful "rawr!" whose pitch goes UP (like a question), then a little "hee-hee-hee" giggle
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.62, end = t + d + 0.05;
      os.setPeriodicWave(m.waves.brass);
      curve(os.frequency, t, [[0, 175 * p], [0.1, 225 * p], [0.34, 262 * p], [0.54, 335 * p], [0.62, 310 * p]]);
      const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 9; lg.gain.value = 40; l.connect(lg); lg.connect(os.detune);   // rolled "rrr" wobble
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g);
      [[[0, 620], [0.2, 880], [0.62, 600]], [[0, 1150], [0.25, 1400], [0.62, 1000]]].forEach((fs, k) => {   // "a-w" vowel
        const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = k ? 5 : 3.5; curve(bq.frequency, t, fs.map(([a, f]) => [a, f * p]));
        const bg = gainNode(c, k ? 0.55 : 1); os.connect(bq); bq.connect(bg); bg.connect(lp);
      });
      env(g.gain, t, 0.035, 0.6, d, 1, 0.14); g.connect(o);
      os.start(t); l.start(t); os.stop(end); l.stop(end);
      N(m, o, t, 0.5, 0.035, { f: 900 * p, a: 0.06, hold: 1, rel: 0.2 });
      for (let i = 0; i < 3; i++) {   // giggle: breathy "h" + a bright little "ee" that dips
        const tt = t + 0.7 + i * 0.12, f = (880 - i * 70) * p;
        N(m, o, tt, 0.035, 0.07, { type: 'highpass', f: 3000, a: 0.004 });
        T(m, o, tt + 0.012, f, 0.09, 0.22, { f1: f * 0.86, type: 'triangle', a: 0.006, vib: [22, 30, 0.01] });
      }
      return 1.1;
    },
    bite(m, o, t, p) {   // "nom nom"
      for (let i = 0; i < 2; i++) { T(m, o, t + i * 0.1, 320 * p, 0.07, 0.3, { f1: 120 * p, a: 0.002 }); N(m, o, t + i * 0.1, 0.03, 0.2, { f: 1600, q: 1.5, a: 0.001 }); }
      return 0.22;
    },
    spit(m, o, t, p) { N(m, o, t, 0.06, 0.2, { f: 1300 * p, q: 1, a: 0.002 }); T(m, o, t + 0.02, 480 * p, 0.08, 0.17, { f1: 900 * p, a: 0.005 }); return 0.12; },
    fireball(m, o, t, p) {   // magic "fwoosh" full of glitter and bubbles (flame-sprite puffs, the dragon's bubble breath, the pet dragon)
      N(m, o, t, 0.5, 0.32, { type: 'lowpass', fs: [[0, 400 * p], [0.15, 2000 * p], [0.5, 600 * p]], q: 1, a: 0.06 });
      N(m, o, t + 0.05, 0.4, 0.028, { type: 'highpass', f: 6000, a: 0.12 });
      T(m, o, t, 300 * p, 0.3, 0.05, { f1: 700 * p, a: 0.05 });
      for (let i = 0; i < 3; i++) { const f = rnd(500, 900) * p; T(m, o, t + 0.06 + rnd(0, 0.3), f, 0.06, 0.07, { f1: f * 1.8, a: 0.004 }); }
      sparkle(m, o, t + 0.08, 6, 1800 * p, 3200 * p, 0.35, 0.03); return 0.6;
    },
    slam(m, o, t, p) {
      T(m, o, t, 170 * p, 0.45, 0.6, { f1: 45 * p, a: 0.002 });
      N(m, o, t, 0.45, 0.45, { type: 'lowpass', fs: [[0, 1100], [0.4, 120]], q: 0.5 });
      N(m, o, t, 0.25, 0.2, { f: 380 * p, q: 0.9, a: 0.003 });
      T(m, o, t, 120 * p, 0.25, 0.18, { f1: 60 * p, type: 'triangle' }); N(m, o, t + 0.05, 0.5, 0.09, { f: 400, q: 0.8, a: 0.05 }); return 0.6;
    },
    whoosh(m, o, t, p) { N(m, o, t, 0.38, 0.45, { fs: [[0, 300 * p], [0.18, 1600 * p], [0.38, 500 * p]], q: 1.4, a: 0.1 }); return 0.42; },
    bat(m, o, t, p) {
      N(m, o, t, 0.28, 0.13, { f: 900 * p, q: 1.3, a: 0.02, am: [24, 0.9] });
      T(m, o, t, 2500 * p, 0.05, 0.07, { f1: 3200 * p }); T(m, o, t + 0.11, 2700 * p, 0.05, 0.06, { f1: 3400 * p }); return 0.32;
    },
    splash(m, o, t, p) {
      N(m, o, t, 0.32, 0.28, { fs: [[0, 1400 * p], [0.3, 450 * p]], q: 0.9, a: 0.005 });
      for (let i = 0; i < 4; i++) { const f = rnd(500, 1000) * p; T(m, o, t + rnd(0.04, 0.26), f, 0.05, 0.09, { f1: f * 1.7 }); }
      return 0.38;
    },
    cheer(m, o, t, p) {   // "yippee": two happy whistles, a few claps, sparkles
      T(m, o, t, 700 * p, 0.16, 0.11, { f1: 1050 * p, a: 0.01, vib: [11, 25, 0.04] });
      T(m, o, t + 0.17, 900 * p, 0.22, 0.11, { f1: 1400 * p, a: 0.01, vib: [11, 25, 0.04] });
      for (let i = 0; i < 6; i++) N(m, o, t + rnd(0, 0.45), 0.025, rnd(0.07, 0.14), { f: rnd(1300, 2300), q: 1.2, a: 0.001 });
      arp(m, o, t + 0.2, [1568, 2093, 2637], 0.07, 0.4, 0.05, p, 3.5, 0.9); return 0.7;
    },
    step(m, o, t, p) { N(m, o, t, 0.05, 0.12, { f: 850 * p, q: 0.9, a: 0.003 }); T(m, o, t, 230 * p, 0.04, 0.07, { f1: 140 * p, a: 0.002 }); return 0.07; },
    dig(m, o, t, p) {   // mole digging underground: three soft "shff" scoops, a low tock and a few pebbles
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.09 + rnd(0, 0.02);
        N(m, o, tt, 0.07, rnd(0.2, 0.28), { fs: [[0, 650 * p], [0.07, 1400 * p]], q: 1.4, a: 0.006 });
        N(m, o, tt + 0.02, 0.05, 0.08, { type: 'lowpass', f: 480, a: 0.002 });
      }
      T(m, o, t, 150 * p, 0.08, 0.14, { f1: 90 * p, a: 0.003 });
      for (let i = 0; i < 4; i++) N(m, o, t + 0.05 + rnd(0, 0.2), 0.015, rnd(0.05, 0.09), { f: rnd(1500, 2600) * p, q: 2.5, a: 0.001 });
      return 0.33;
    },
    emerge(m, o, t, p) {   // mole pops out of the ground: dirt puff + a springy "fwoop!"
      N(m, o, t, 0.14, 0.25, { fs: [[0, 500 * p], [0.14, 1300 * p]], q: 1.2, a: 0.004 });
      T(m, o, t + 0.02, 240 * p, 0.16, 0.3, { f1: 720 * p, glide: 0.12, a: 0.006, vib: [16, 30, 0.04] });
      for (let i = 0; i < 4; i++) N(m, o, t + 0.04 + rnd(0, 0.18), 0.015, rnd(0.05, 0.09), { f: rnd(1400, 2400) * p, q: 2.5, a: 0.001 });
      return 0.3;
    },
    bubble(m, o, t, p) {   // snail blows a soap bubble: soft breath, "blub-blub-bloop" rising, an iridescent glint
      N(m, o, t, 0.2, 0.045, { f: 1100 * p, q: 0.8, a: 0.05 });
      [[0.03, 420, 900], [0.11, 560, 1250], [0.2, 700, 1650]].forEach(([dt, f0, f1], i) => T(m, o, t + dt, f0 * p, 0.09, 0.22 - i * 0.04, { f1: f1 * p, glide: 0.06, a: 0.004 }));
      B(m, o, t + 0.25, 2349 * p, 0.35, 0.03, 3.5, 0.6); return 0.45;
    },
    bubblePop(m, o, t, p) {   // a bubble bursts: tiny "plip" + sparkle
      T(m, o, t, 900 * p, 0.04, 0.2, { f1: 1800 * p, a: 0.001 });
      N(m, o, t, 0.03, 0.08, { type: 'highpass', f: 3000, a: 0.001 });
      B(m, o, t + 0.02, 2637 * p, 0.3, 0.04, 3.5, 0.7); B(m, o, t + 0.07, 3136 * p, 0.3, 0.03, 3.5, 0.7); return 0.35;
    },
    // ── Round 3: the volcano and the zone bosses. Warm, round and bubbly; nothing hissy or scary.
    lava(m, o, t, p) {   // lava pool bubbling: two or three thick, soft "blup"s rising from below, a tiny crust plop after each
      const n = Math.random() < 0.5 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const tt = t + i * rnd(0.1, 0.15), f = rnd(165, 215) * p * (1 + i * 0.1);
        T(m, o, tt, f, 0.14, 0.3 - i * 0.06, { f1: f * 2.3, glide: 0.1, a: 0.01 });
        T(m, o, tt, f * 2, 0.08, 0.05, { f1: f * 4.2, glide: 0.07, type: 'triangle', a: 0.008 });
        N(m, o, tt + 0.09, 0.045, 0.06, { type: 'lowpass', f: 750, a: 0.003 });
      }
      return 0.5;
    },
    erupt(m, o, t, p) {   // volcano puff: a round soft "whoomp", warm air rushing up, then a gentle fizzy sizzle with little pops
      T(m, o, t, 210 * p, 0.45, 0.5, { f1: 62 * p, a: 0.012 });
      T(m, o, t, 330 * p, 0.25, 0.12, { f1: 125 * p, type: 'triangle', a: 0.008 });
      N(m, o, t, 0.55, 0.3, { type: 'lowpass', fs: [[0, 280 * p], [0.12, 1500 * p], [0.55, 330 * p]], q: 0.7, a: 0.02 });
      N(m, o, t + 0.12, 0.85, 0.04, { f: 4600, q: 0.9, a: 0.15, am: [21, 0.7] });   // soft fizz, bandpassed well below "hiss"
      crackle(m, o, t + 0.16, 9, 0.65, 0.07, p * 0.8);
      for (let i = 0; i < 4; i++) { const f = rnd(650, 1150) * p; T(m, o, t + 0.22 + rnd(0, 0.55), f, 0.045, 0.06, { f1: f * 1.6, a: 0.002 }); }
      return 1.05;
    },
    drill(m, o, t, p) {   // Usta Köstebek's hard-hat drill: a friendly toy "brrrrrr" that revs up, dirt and pebbles spraying
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.72, end = t + d + 0.03;
      const am = gainNode(c, 0.55), l = c.createOscillator(), lg = gainNode(c, 0.45);
      os.setPeriodicWave(m.waves.sq);
      curve(os.frequency, t, [[0, 118 * p], [0.16, 188 * p], [0.56, 206 * p], [0.72, 150 * p]]);
      curve(l.frequency, t, [[0, 16], [0.2, 32], [0.72, 24]]);   // the rate of the "rrr"
      l.connect(lg); lg.connect(am.gain);
      lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 1.4;
      os.connect(lp); lp.connect(am); am.connect(g);
      env(g.gain, t, 0.05, 0.3, d, 1, 0.16); g.connect(o);
      os.start(t); os.stop(end); l.start(t); l.stop(end);
      N(m, o, t + 0.05, 0.62, 0.11, { f: 850 * p, q: 1, a: 0.06, hold: 1, rel: 0.2, am: [28, 0.8] });
      for (let i = 0; i < 6; i++) N(m, o, t + 0.1 + rnd(0, 0.55), 0.015, rnd(0.05, 0.1), { f: rnd(1400, 2600) * p, q: 2.5, a: 0.001 });
      return 0.78;
    },
    roll(m, o, t, p) {   // turtle tucks into its shell ("fwip") and rolls: a bumpy "rrrolll" with soft shell "tok"s
      T(m, o, t, 300 * p, 0.1, 0.18, { f1: 720 * p, glide: 0.07, a: 0.004 });
      N(m, o, t + 0.06, 0.95, 0.32, { fs: [[0, 320 * p], [0.35, 720 * p], [0.95, 360 * p]], q: 1.3, a: 0.1, hold: 1, rel: 0.32, am: [12, 0.8] });   // bandpass: no boomy sub-bass
      T(m, o, t + 0.06, 135 * p, 0.95, 0.1, { type: 'triangle', fs: [[0, 130 * p], [0.35, 205 * p], [0.95, 140 * p]], hold: 1, a: 0.1, rel: 0.3, vib: [12, 45, 0.02] });
      for (let i = 0; i < 7; i++) { const tt = t + 0.12 + i * 0.12 + rnd(0, 0.02); T(m, o, tt, rnd(400, 540) * p, 0.045, 0.08 * (1 - i * 0.08), { f1: 210 * p, a: 0.001 }); }
      return 1.05;
    },
    bounce(m, o, t, p) {   // big jelly hop: a squishy squeeze, then a springy "boi-oi-oing"
      N(m, o, t, 0.08, 0.13, { type: 'lowpass', f: 900, a: 0.01 });
      T(m, o, t + 0.03, 150 * p, 0.5, 0.42, { f1: 430 * p, glide: 0.15, a: 0.006, vib: [13, 60, 0.08] });
      T(m, o, t + 0.03, 300 * p, 0.34, 0.08, { f1: 860 * p, glide: 0.15, type: 'triangle', a: 0.006, vib: [13, 60, 0.08] });
      return 0.56;
    },
    chirp(m, o, t, p) {   // fire chick "cip-cip!": quick little up-and-down peeps
      const n = Math.random() < 0.35 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const tt = t + i * 0.1, f = 2000 * p * (i === n - 1 ? 1.1 : 1);
        T(m, o, tt, f, 0.075, 0.16, { fs: [[0, f * 0.8], [0.028, f * 1.12], [0.075, f * 0.92]], a: 0.004 });
        T(m, o, tt, f * 2, 0.05, 0.025, { fs: [[0, f * 1.6], [0.028, f * 2.24], [0.05, f * 1.9]], a: 0.004 });
      }
      return 0.1 * n + 0.06;
    },
    splat(m, o, t, p) {   // jelly blob lands: a wet squishy "splotch" and a wobbly low jiggle
      N(m, o, t, 0.16, 0.32, { fs: [[0, 1600 * p], [0.16, 380 * p]], q: 1.4, a: 0.002 });
      T(m, o, t, 260 * p, 0.22, 0.3, { f1: 110 * p, a: 0.002, vib: [18, 55, 0.03] });
      for (let i = 0; i < 3; i++) { const f = rnd(600, 1100) * p; T(m, o, t + rnd(0.04, 0.2), f, 0.04, 0.07, { f1: f * 1.5, a: 0.002 }); }
      return 0.32;
    },
    rumble(m, o, t, p) {   // gentle ground rumble (a boss about to pop up, the volcano grumbling): soft rolling murmur + pebbles
      N(m, o, t, 1.3, 0.42, { fs: [[0, 240 * p], [0.5, 460 * p], [1.3, 220 * p]], q: 0.9, a: 0.35, hold: 1, rel: 0.6, am: [7, 0.6] });   // bandpass: soft, not boomy
      T(m, o, t, 150 * p, 1.3, 0.06, { hold: 1, a: 0.4, rel: 0.6, vib: [5, 30, 0.1] });
      T(m, o, t, 98 * p, 1.3, 0.05, { type: 'triangle', hold: 1, a: 0.4, rel: 0.6, vib: [6, 30, 0.1] });
      for (let i = 0; i < 5; i++) N(m, o, t + 0.25 + rnd(0, 0.9), 0.015, rnd(0.03, 0.06), { f: rnd(1300, 2400) * p, q: 2.5, a: 0.001 });
      return 1.35;
    },
    // ── Round 4: Kefir Vadisi. Creamy, fizzy and bubbly; round and friendly, never hissy or gross.
    fizz(m, o, t, p) {   // kefir fizz: a soft sparkly shimmer of tiny bubbles rising and popping (bandpassed well below "hiss")
      N(m, o, t, 0.8, 0.1, { f: 3300 * p, q: 1.2, a: 0.05, am: [17, 0.8] });
      N(m, o, t, 0.5, 0.14, { fs: [[0, 800 * p], [0.5, 1800 * p]], q: 2.4, a: 0.03, am: [11, 0.6] });   // soft bubbly body, rising
      for (let i = 0; i < 12; i++) {   // little bubbles popping at the surface, quick upward "plip"s getting sparser
        const tt = t + 0.72 * Math.pow(i / 12, 1.35) + rnd(0, 0.03), f = rnd(1200, 2500) * p;
        T(m, o, tt, f, 0.035, rnd(0.07, 0.12) * (1 - i / 16), { f1: f * 1.9, a: 0.004 });
      }
      B(m, o, t + 0.14, 2637 * p, 0.35, 0.04, 3.5, 0.6); B(m, o, t + 0.38, 3136 * p, 0.35, 0.03, 3.5, 0.6);
      return 0.85;
    },
    cork(m, o, t, p) {   // friendly bottle pop: a round hollow "pok!", the cap spins away ("fwiii"), a little fizz and a happy "ting"
      N(m, o, t, 0.014, 0.28, { f: 1700 * p, q: 0.9, a: 0.0005 });   // the snap
      T(m, o, t, 420 * p, 0.1, 0.5, { fs: [[0, 420 * p], [0.012, 880 * p], [0.1, 540 * p]], a: 0.001 });   // cheek-pop body
      N(m, o, t + 0.004, 0.09, 0.16, { f: 760 * p, q: 9, a: 0.002 });   // hollow bottle-neck resonance
      T(m, o, t + 0.07, 900 * p, 0.2, 0.05, { f1: 1700 * p, a: 0.012, vib: [28, 60, 0.02] });   // the cap flying off
      for (let i = 0; i < 6; i++) { const f = rnd(1400, 2700) * p; T(m, o, t + 0.13 + rnd(0, 0.35), f, 0.03, 0.05, { f1: f * 1.8, a: 0.001 }); }
      B(m, o, t + 0.1, 2093 * p, 0.45, 0.05, 4, 0.8); B(m, o, t + 0.17, 2637 * p, 0.4, 0.035, 4, 0.8);
      return 0.6;
    },
    slurp(m, o, t, p) {   // Feza drinks a glass of kefir: a cute bubbly "sluuurp", two soft "gulp"s, a happy "ahh" sparkle
      N(m, o, t, 0.42, 0.32, { fs: [[0, 500 * p], [0.3, 1450 * p], [0.42, 1100 * p]], q: 3, a: 0.05, am: [26, 0.85] });
      T(m, o, t, 300 * p, 0.42, 0.06, { fs: [[0, 300 * p], [0.3, 600 * p], [0.42, 500 * p]], type: 'triangle', a: 0.04, vib: [26, 50, 0.02] });
      for (let i = 0; i < 2; i++) {
        const tt = t + 0.5 + i * 0.2;
        T(m, o, tt, 380 * p, 0.09, 0.15, { f1: 180 * p, a: 0.006 });
        N(m, o, tt, 0.04, 0.07, { type: 'lowpass', f: 700, a: 0.002 });
      }
      N(m, o, t + 0.92, 0.32, 0.05, { f: 1100 * p, q: 1.2, a: 0.05 });   // satisfied little breath
      T(m, o, t + 0.92, 620 * p, 0.28, 0.07, { f1: 880 * p, a: 0.03, vib: [9, 20, 0.05] });
      arp(m, o, t + 0.98, [1319, 1568, 2093], 0.06, 0.45, 0.05, p);
      return 1.45;
    },
    squish(m, o, t, p) {   // soft creamy squish (a yogurt hop, poking a pudding, stepping in cream): squeezy "sqlch" + tiny wobble
      N(m, o, t, 0.14, 0.26, { fs: [[0, 700 * p], [0.05, 1500 * p], [0.14, 600 * p]], q: 2.2, a: 0.006 });
      T(m, o, t, 200 * p, 0.16, 0.24, { fs: [[0, 200 * p], [0.05, 340 * p], [0.16, 150 * p]], a: 0.004, vib: [20, 45, 0.02] });
      N(m, o, t, 0.06, 0.1, { type: 'lowpass', f: 800, a: 0.003 });
      return 0.2;
    },
    moo(m, o, t, p) {   // a soft, cute cow far across the valley: a round "mmuuuu" (lifts, then settles) and a fainter echo
      const c = m.c, one = (t0, v, open, d) => {
        const os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), fm = c.createBiquadFilter(), end = t0 + d + 0.05;
        os.setPeriodicWave(m.waves.brass);
        curve(os.frequency, t0, [[0, 176 * p], [0.2 * d, 214 * p], [0.62 * d, 204 * p], [d, 158 * p]]);
        const l = c.createOscillator(), lg = gainNode(c, 0);   // gentle vibrato arriving late
        l.frequency.value = 5; lg.gain.setValueAtTime(0, t0); lg.gain.linearRampToValueAtTime(16, t0 + d * 0.5); l.connect(lg); lg.connect(os.detune);
        lp.type = 'lowpass'; lp.Q.value = 1.1; curve(lp.frequency, t0, [[0, 300], [0.22 * d, open], [0.75 * d, open * 0.8], [d, 330]]);   // "m" → "uu" → closes
        fm.type = 'peaking'; fm.frequency.value = 400 * p; fm.Q.value = 2; fm.gain.value = 7;   // round "u" formant
        os.connect(lp); lp.connect(fm); fm.connect(g);
        env(g.gain, t0, 0.14, v, d, 1, d * 0.32); g.connect(o);
        os.start(t0); l.start(t0); os.stop(end); l.stop(end);
      };
      one(t, 0.1, 950, 0.95);
      one(t + 0.55, 0.022, 620, 0.8);   // echo from the far hills: quieter and duller
      return 1.45;
    },
    // ── Round 5: Surlu Şehir, the castle town. Wooden, jingly and brassy-toy; round and friendly, never martial or clangy.
    neigh(m, o, t, p) {   // a cute pony whinny: a bright wobbly "hiii-hi-hi-hi" tumbling down, then a soft lip-flutter "brrr"
      const c = m.c, os = c.createOscillator(), g = gainNode(c, 0), lp = c.createBiquadFilter(), d = 0.74, end = t + d + 0.05;
      os.setPeriodicWave(m.waves.brass);
      curve(os.frequency, t, [[0, 480 * p], [0.06, 860 * p], [0.18, 800 * p], [0.42, 640 * p], [0.66, 480 * p], [0.74, 430 * p]]);
      const l = c.createOscillator(), lg = gainNode(c, 0), ag = gainNode(c, 0), am = gainNode(c, 0.62);   // one wobble for pitch and loudness
      curve(l.frequency, t, [[0, 10], [d, 14]]);
      lg.gain.setValueAtTime(20, t); lg.gain.linearRampToValueAtTime(150, t + 0.45);   // the "hi-hi-hi" widens as it tumbles
      ag.gain.setValueAtTime(0.06, t); ag.gain.linearRampToValueAtTime(0.38, t + 0.4);
      l.connect(lg); lg.connect(os.detune); l.connect(ag); ag.connect(am.gain);
      lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.8;
      const fm = c.createBiquadFilter(); fm.type = 'peaking'; fm.frequency.value = 1500 * p; fm.Q.value = 1.4; fm.gain.value = 6;   // nasal "ii"
      os.connect(fm); fm.connect(lp); lp.connect(am); am.connect(g);
      env(g.gain, t, 0.03, 0.34, d, 1, 0.2); g.connect(o);
      os.start(t); l.start(t); os.stop(end); l.stop(end);
      N(m, o, t, 0.3, 0.03, { f: 1800 * p, q: 1, a: 0.04 });   // a little breath in the voice
      N(m, o, t + 0.76, 0.24, 0.2, { type: 'lowpass', f: 650, a: 0.02, am: [23, 0.9] });   // "brrr": the lips flutter
      T(m, o, t + 0.76, 150 * p, 0.24, 0.1, { type: 'triangle', a: 0.02, vib: [23, 60, 0.01] });
      return 1.05;
    },
    gallop(m, o, t, p) {   // one hoof beat on the cobbles, "clip-clop": two hollow coconut "tok"s (the 2nd lower) + a soft thud.
      for (let i = 0; i < 2; i++) {   // GAME calls it once per stride (~0.25–0.35 s apart); SVAR keeps a run of them lively
        const tt = t + i * 0.085 + (i ? rnd(-0.008, 0.008) : 0), q = p * (i ? 0.82 : 1) * rnd(0.97, 1.03);
        T(m, o, tt, 920 * q, 0.05, 0.26, { f1: 700 * q, a: 0.0008 });   // hollow shell body
        N(m, o, tt, 0.035, 0.18, { f: 1500 * q, q: 5, a: 0.0006 });   // the woody "k"
        T(m, o, tt, 210 * q, 0.07, 0.16, { f1: 120 * q, a: 0.001 });   // the hoof landing (soft, high enough for tablet speakers)
      }
      return 0.18;
    },
    drum(m, o, t, p) {   // the tellal's big davul: a round, soft felt-mallet "DÜM" that settles in pitch, then the thin stick's "tek-tek"
      T(m, o, t, 150 * p, 0.6, 0.55, { fs: [[0, 150 * p], [0.06, 100 * p], [0.6, 88 * p]], a: 0.003 });   // the big head
      T(m, o, t, 230 * p, 0.3, 0.26, { fs: [[0, 240 * p], [0.05, 200 * p]], a: 0.003 });   // body partial the tablet speakers can play
      T(m, o, t, 330 * p, 0.12, 0.07, { f1: 280 * p, type: 'triangle', a: 0.002 });
      N(m, o, t, 0.08, 0.22, { type: 'lowpass', f: 900, a: 0.002 });   // felt on skin
      N(m, o, t, 0.45, 0.08, { f: 190 * p, q: 1.6, a: 0.01 });   // the shell's soft hum
      for (let i = 0; i < 2; i++) {
        const tt = t + 0.3 + i * 0.13;
        T(m, o, tt, 760 * p, 0.05, 0.08, { f1: 640 * p, a: 0.0008 }); N(m, o, tt, 0.04, 0.12 - i * 0.03, { f: 2600, q: 1.4, a: 0.0008 });
      }
      return 0.65;
    },
    broom(m, o, t, p) {   // a straw broom sweeping: two quick bristly "shff-shff" strokes, scratchy but soft (bandpassed, never hissy)
      [[0, 0.16, 0.26], [0.17, 0.24, 0.3]].forEach(([dt, d, v], i) => {
        N(m, o, t + dt, d, v, { fs: [[0, 700 * p], [d * 0.45, 1900 * p], [d, 1000 * p]], q: 1.2, a: d * 0.4, am: [47 + i * 9, 0.7] });   // bristles
        N(m, o, t + dt, d * 0.8, v * 0.35, { type: 'lowpass', f: 700, a: d * 0.35 });   // the body of the stroke
        for (let k = 0; k < 3; k++) N(m, o, t + dt + rnd(0.02, d * 0.8), 0.012, rnd(0.05, 0.09), { f: rnd(1400, 2600) * p, q: 3, a: 0.001 });   // straw ticks
      });
      return 0.45;
    },
    horn(m, o, t, p) {   // the knight's tiny toy trumpet: a cheeky, nasal "ta-ta-ta-taaa!" (a toy, never a bugle call) + a twinkle
      [[0, 523, 0.075], [0.1, 523, 0.075], [0.2, 659, 0.09], [0.31, 784, 0.42]].forEach(([dt, f, d], i) => {
        const ff = f * p, last = i === 3;
        T(m, o, t + dt, ff, d, 0.15, { wave: 'brass', fs: [[0, ff * 0.97], [0.02, ff]], hold: 1, a: 0.012, rel: last ? 0.14 : 0.025,
          lp: [[0, ff * 1.5], [0.03, ff * 4], [d, ff * 2.6]], q: 1.4, vib: last ? [6.5, 22, 0.12] : null });
        T(m, o, t + dt, ff, d, 0.035, { wave: 'sq', det: 9, hold: 1, a: 0.012, rel: last ? 0.14 : 0.025, lp: ff * 3 });   // kazoo buzz
        N(m, o, t + dt, 0.03, 0.035, { f: 1400, q: 1, a: 0.002 });   // tongue "t"
      });
      B(m, o, t + 0.36, 2093 * p, 0.4, 0.03, 4, 0.8); B(m, o, t + 0.43, 2637 * p, 0.4, 0.024, 4, 0.8);
      return 0.85;
    },
    bell(m, o, t, p) {   // a friendly town bell: one warm "dinnng", a round hum under a gently beating ring (major-third tuning: happy, not solemn)
      const f = 587 * p;
      for (const [r, d, v, det] of [[0.5, 1.7, 0.1, 0], [1, 1.3, 0.13, 0], [1.25, 0.9, 0.045, 0], [1.5, 0.75, 0.05, 0], [2, 1.1, 0.08, 0], [2, 1.1, 0.045, 3], [3.01, 0.45, 0.03, 0]])
        T(m, o, t, f * r, d, v, { det, a: 0.002 });
      B(m, o, t, f * 2, 0.4, 0.07, 3.5, 1.4);   // the clapper's strike
      N(m, o, t, 0.025, 0.06, { type: 'lowpass', f: 2200, a: 0.001 });
      return 1.75;
    },
    clank(m, o, t, p) {   // soft armour "tink-clank": two little plate clinks (short, mellow inharmonic rings) over a padded thunk
      [[0, 1, 0.16], [0.07, 0.8, 0.13]].forEach(([dt, q, v]) => {
        const f = 1250 * p * q * rnd(0.98, 1.02);
        T(m, o, t + dt, f, 0.16, v, { a: 0.0008 });
        T(m, o, t + dt, f * 2.41, 0.09, v * 0.45, { a: 0.0008 });
        T(m, o, t + dt, f * 3.93, 0.05, v * 0.18, { a: 0.0008 });
        N(m, o, t + dt, 0.02, v * 0.5, { f: 3000 * q, q: 2, a: 0.0005 });
      });
      T(m, o, t, 240 * p, 0.08, 0.2, { f1: 140 * p, a: 0.002 });
      return 0.26;
    },
    // ── Round 6: boss bonus moments. Silly and soft: toy taps, squeaks, crunches and breaths, never a real smack.
    bonk(m, o, t, p) {   // a toy mallet tapping a head (the mole peeking out): a hollow wooden "tok!", a mini springy "boing", a twinkle
      N(m, o, t, 0.03, 0.18, { f: 1300 * p, q: 4, a: 0.0006 });   // the woody "k"
      T(m, o, t, 760 * p, 0.07, 0.34, { f1: 520 * p, a: 0.0008 });   // hollow toy body
      T(m, o, t, 230 * p, 0.06, 0.12, { f1: 140 * p, a: 0.001 });   // soft padded thud
      T(m, o, t + 0.05, 260 * p, 0.32, 0.24, { fs: [[0, 260 * p], [0.05, 520 * p], [0.32, 430 * p]], a: 0.004, vib: [14, 70, 0.05] });   // "boing"
      T(m, o, t + 0.05, 520 * p, 0.22, 0.04, { fs: [[0, 520 * p], [0.05, 1040 * p], [0.22, 860 * p]], type: 'triangle', a: 0.004, vib: [14, 70, 0.05] });
      B(m, o, t + 0.12, 1760 * p, 0.3, 0.03, 4, 0.8);
      return 0.42;
    },
    hiccup(m, o, t, p) {   // a cartoon "hık!": a quick rising squeak that ends in a round little pop and a bubble plip
      N(m, o, t, 0.04, 0.07, { f: 1200 * p, q: 1, a: 0.003 });   // the breathy "h"
      T(m, o, t, 520 * p, 0.1, 0.22, { fs: [[0, 520 * p], [0.07, 1250 * p], [0.1, 1100 * p]], type: 'triangle', a: 0.003 });   // squeak up
      N(m, o, t + 0.085, 0.012, 0.16, { f: 1500 * p, q: 1, a: 0.0005 });   // the snap of the pop
      T(m, o, t + 0.085, 380 * p, 0.09, 0.3, { fs: [[0, 380 * p], [0.012, 820 * p], [0.09, 500 * p]], a: 0.001 });   // round cheek pop
      for (let i = 0; i < 2; i++) { const f = rnd(1100, 1700) * p; T(m, o, t + 0.16 + i * 0.06, f, 0.035, 0.05, { f1: f * 1.8, a: 0.003 }); }
      return 0.3;
    },
    munch(m, o, t, p) {   // the knight's horse eating the carrot: two crunchy bites ("kırt-kırt"), each with a soft jaw "nom"
      for (let i = 0; i < 2; i++) {   // GAME calls it every 0.5 s while the horse chews
        const tt = t + i * 0.19, q = p * (i ? 0.9 : 1);
        T(m, o, tt, 300 * q, 0.08, 0.24, { f1: 130 * q, a: 0.002 });   // jaw "nom"
        N(m, o, tt, 0.08, 0.09, { type: 'lowpass', f: 900, a: 0.002 });   // mouthful
        for (let k = 0; k < 5; k++) N(m, o, tt + rnd(0, 0.07), 0.018, rnd(0.12, 0.2), { f: rnd(900, 2200) * q, q: 2.2, a: 0.0008 });   // crunch
      }
      return 0.36;
    },
    sigh(m, o, t, p) {   // the dragon's soft sigh before it blows hearts: a gentle falling breath "haaah" over a little "hmmm" hum
      N(m, o, t, 0.95, 0.2, { fs: [[0, 1500 * p], [0.3, 1100 * p], [0.95, 500 * p]], q: 1.1, a: 0.18, hold: 1, rel: 0.5 });   // breath
      T(m, o, t + 0.1, 330 * p, 0.9, 0.08, { fs: [[0, 330 * p], [0.25, 350 * p], [0.9, 235 * p]], type: 'triangle', lp: 1200, hold: 1, a: 0.15, rel: 0.45, vib: [5, 18, 0.2] });   // hum
      T(m, o, t + 0.1, 165 * p, 0.9, 0.05, { fs: [[0, 165 * p], [0.25, 175 * p], [0.9, 118 * p]], hold: 1, a: 0.15, rel: 0.45 });
      return 1.05;
    },
    // extras
    nope(m, o, t, p) { T(m, o, t, 330 * p, 0.1, 0.14, { type: 'triangle', hold: 1, rel: 0.03 }); T(m, o, t + 0.12, 262 * p, 0.14, 0.14, { type: 'triangle', hold: 1, rel: 0.05 }); return 0.3; },
    open(m, o, t, p) { T(m, o, t, 620 * p, 0.09, 0.13, { f1: 930 * p }); B(m, o, t + 0.05, 1397 * p, 0.3, 0.05, 4, 0.7); return 0.35; },
    close(m, o, t, p) { T(m, o, t, 930 * p, 0.09, 0.13, { f1: 620 * p }); return 0.12; },
    cast(m, o, t, p) { N(m, o, t, 0.25, 0.14, { f: 800 * p, f1: 3000 * p, q: 1.2, a: 0.05 }); arp(m, o, t + 0.05, [1568, 2093], 0.05, 0.35, 0.06, p); return 0.4; },
  };
  // Loudness trim, calibrated offline (test/audio.html view=cal): voice ≈ -15, rewards -20…-23, combat -25…-28, steps -33
  // (speaker-weighted short-term loudness, dB). Keeps the order voice > effects > music.
  // Cold iron, shattered seals and low breath replace the former reward jingles.
  const darkReward = (m, o, t, p) => {
    [392, 370, 294].forEach((f, i) => B(m, o, t + i * 0.09, f * p, 0.7, 0.065, 2.76, 0.65));
    N(m, o, t, 0.6, 0.04, { f: 700, q: 0.8, a: 0.07 });
    return 0.95;
  };
  for (const name of ['pop', 'coin', 'heart', 'potion', 'levelup', 'unlock', 'star', 'charm', 'win', 'victory', 'happy', 'cheer', 'chest', 'dropRare', 'dropLegend', 'checkpoint', 'bubblePop']) {
    if (SFX[name]) SFX[name] = darkReward;
  }
  SFX.hiccup = (m, o, t, p) => { N(m, o, t, 0.45, 0.12, { f: 420 * p, q: 1.5, a: 0.025 }); T(m, o, t, 145 * p, 0.3, 0.1, { f1: 90 * p }); return 0.5; };
  SFX.munch = (m, o, t, p) => { for(let i=0;i<3;i++) N(m,o,t+i*0.14,0.12,0.07,{f:600*p,q:1.5,a:0.012}); return 0.5; };
  SFX.roar = (m, o, t, p) => {
    T(m, o, t, 165*p, 1.15, 0.13, {wave:'saw',f1:72*p,lp:650,hold:1,a:0.22,rel:0.45,vib:[23,30,0.3]});
    N(m,o,t,1.15,0.13,{f:460*p,q:1.2,a:0.2,hold:1,rel:0.35,am:[17,0.6]}); return 1.2;
  };
  SFX.hurt = (m,o,t,p) => {T(m,o,t,210*p,0.2,0.16,{wave:'saw',f1:95*p,lp:750,a:0.01});N(m,o,t,0.16,0.1,{f:850,q:1,a:0.01});return 0.25;};
  SFX.bubble = (m,o,t,p) => {N(m,o,t,0.6,0.09,{f:480*p,q:1.8,a:0.12,am:[9,0.65]});return 0.65;};
  SFX.fireball = (m,o,t,p) => {N(m,o,t,0.55,0.18,{f:750*p,f1:210*p,q:0.8,a:0.08});T(m,o,t,185*p,0.4,0.06,{f1:95*p,lp:700});return 0.6;};
  // Short, distinct signatures. Every layer has a release; nothing leaves a continuous hum behind.
  const iron = (m,o,t,p,v=0.1,d=0.36) => {
    T(m,o,t,285*p,d,v,{type:'triangle',f1:185*p,a:0.004});
    B(m,o,t+0.012,690*p,d,v*0.32,2.76,0.6);
    N(m,o,t,0.1,v*0.65,{f:1700,q:1.1,a:0.003});
  };
  SFX.coin = (m,o,t,p) => { B(m,o,t,740*p,0.23,0.052,2.76,0.4);B(m,o,t+0.06,698*p,0.24,0.025,2.76,0.35);return 0.33; };
  SFX.pop = (m,o,t,p) => {
    T(m,o,t,210*p,0.28,0.09,{wave:'saw',f1:72*p,lp:640,a:0.012});
    N(m,o,t,0.36,0.09,{f:700,f1:190,q:0.8,a:0.018});return 0.4;
  };
  SFX.heart = (m,o,t,p) => {
    [0,0.18].forEach((dt,i)=>T(m,o,t+dt,(160-i*20)*p,0.2,0.07-i*0.02,{type:'triangle',f1:95*p,a:0.018}));
    T(m,o,t+0.12,294*p,0.55,0.018,{hold:1,a:0.12,rel:0.24});return 0.75;
  };
  SFX.potion = (m,o,t,p) => {
    N(m,o,t,0.38,0.055,{f:450,f1:230,q:1.8,a:0.055});
    [0,0.16,0.31].forEach((dt,i)=>T(m,o,t+dt,(220-i*28)*p,0.18,0.032,{f1:(135-i*10)*p,a:0.018}));return 0.55;
  };
  SFX.chest = (m,o,t,p) => {iron(m,o,t,p,0.065,0.4);N(m,o,t+0.13,0.56,0.035,{f:600,f1:310,q:1.4,a:0.16});return 0.75;};
  SFX.dropRare = (m,o,t,p) => {iron(m,o,t,p,0.035);[294,277].forEach((f,i)=>B(m,o,t+0.13+i*0.15,f*p,0.68,0.032,2.76,0.6));return 1.0;};
  SFX.dropLegend = (m,o,t,p) => {
    [196,233,277].forEach((f,i)=>T(m,o,t+i*0.06,f*p,1.1,0.021,{type:'triangle',hold:1,a:0.18,rel:0.55}));
    B(m,o,t+0.2,554*p,1.0,0.029,2.76,0.7);return 1.35;
  };
  SFX.levelup = (m,o,t,p) => { [196,233,294].forEach((f,i)=>B(m,o,t+i*0.13,f*p,0.85,0.036,2.76,0.7));N(m,o,t,0.9,0.02,{f:540,a:0.3,hold:1,rel:0.35});return 1.2; };
  SFX.unlock = (m,o,t,p) => {iron(m,o,t,p,0.05);[196,185].forEach((f,i)=>T(m,o,t+0.15+i*0.15,f*p,0.85,0.022,{type:'triangle',hold:1,a:0.15,rel:0.4}));return 1.2;};
  SFX.checkpoint = (m,o,t,p) => {B(m,o,t,196*p,1.3,0.025,2.76,0.6);T(m,o,t+0.12,294*p,1.1,0.018,{hold:1,a:0.25,rel:0.5});return 1.35;};
  SFX.hit = (m,o,t,p) => {iron(m,o,t,p,0.18,0.19);T(m,o,t,135*p,0.18,0.15,{f1:82*p,a:0.003});return 0.26;};
  SFX.hitSoft = (m,o,t,p) => {iron(m,o,t,p,0.07,0.15);return 0.2;};
  SFX.crit = (m,o,t,p) => {iron(m,o,t,p,0.2,0.3);T(m,o,t+0.015,180*p,0.28,0.2,{f1:65*p,a:0.004});N(m,o,t+0.05,0.2,0.09,{f:550,f1:210,q:1.3,a:0.025});return 0.4;};
  SFX.swingBig = (m,o,t,p) => {saber(m,o,t,0.42,0.2,[[0,80*p],[0.17,150*p],[0.42,65*p]],[[0,450],[0.17,2200],[0.42,380]],{a:0.055,rel:0.19});N(m,o,t,0.4,0.15,{f:900,f1:220,q:1,a:0.08});return 0.48;};
  SFX.star = (m,o,t,p) => {T(m,o,t,650*p,0.24,0.07,{wave:'saw',f1:210*p,lp:1600,a:0.024});N(m,o,t,0.21,0.04,{f:1100,f1:350,q:1.1,a:0.022});return 0.3;};
  SFX.cast = (m,o,t,p) => {N(m,o,t,0.3,0.065,{f:500,f1:1300,q:1.3,a:0.06});T(m,o,t+0.08,185*p,0.28,0.04,{wave:'saw',f1:277*p,lp:850,a:0.04});return 0.4;};
  SFX.ice = (m,o,t,p) => {[740,698,554].forEach((f,i)=>B(m,o,t+i*0.075,f*p,0.48,0.035,2.76,0.9));N(m,o,t,0.45,0.045,{f:2200,f1:750,q:1.2,a:0.04});return 0.65;};
  SFX.shield = (m,o,t,p) => {iron(m,o,t,p,0.05);[196,294].forEach(f=>T(m,o,t+0.08,f*p,0.85,0.028,{type:'triangle',hold:1,a:0.13,rel:0.4}));return 1.0;};
  SFX.zap = (m,o,t,p) => {T(m,o,t,440*p,0.18,0.035,{wave:'saw',f1:110*p,lp:1800,a:0.009});N(m,o,t,0.18,0.028,{f:1400,f1:390,q:1.2,am:[32,0.5],a:0.009});return 0.25;};
  SFX.bilboCharge = (m,o,t,p) => {N(m,o,t,.42,.10,{f:470,f1:210,q:1.3,a:.045,am:[29,.72]});T(m,o,t,128*p,.38,.065,{wave:'saw',lp:580,f1:74*p,a:.028,vib:[23,17,.03]});N(m,o,t+.04,.12,.025,{f:1300,f1:490,q:1,a:.02});return .48;};
  SFX.bilboImpact = (m,o,t,p) => {iron(m,o,t,p,0.12,0.25);T(m,o,t,180*p,0.34,0.18,{f1:70*p,a:0.005});N(m,o,t+0.04,0.21,0.05,{f:390,q:0.8,a:0.03});return 0.43;};
  SFX.guardBreak = (m,o,t,p) => {[0,0.065,0.14].forEach((dt,i)=>iron(m,o,t+dt,p*semi(-i*2),0.052-i*0.012,0.3));N(m,o,t+0.08,0.42,0.04,{f:1000,f1:220,q:0.8,a:0.05});return 0.6;};
  SFX.bonk = (m,o,t,p) => {iron(m,o,t,p,0.1,0.22);T(m,o,t,155*p,0.16,0.08,{f1:95*p,a:0.006});return 0.28;};
  SFX.sigh = (m,o,t,p) => {N(m,o,t,0.85,0.065,{f:340*p,f1:700*p,q:1.4,a:0.24,hold:1,rel:0.28,am:[5,0.25]});T(m,o,t,150*p,0.8,0.021,{wave:'flute',hold:1,a:0.2,rel:0.3});return 0.9;};
  SFX.moo = (m,o,t,p) => {T(m,o,t,145*p,1.25,0.075,{wave:'saw',lp:550,hold:1,a:0.3,rel:0.5,vib:[4,28,0.2]});N(m,o,t,1.2,0.032,{f:320,q:1.2,a:0.35,hold:1,rel:0.4});return 1.3;};
  SFX.chirp = (m,o,t,p) => {N(m,o,t,0.19,0.027,{f:1500*p,f1:850*p,q:2.8,a:0.018,am:[32,0.5]});T(m,o,t,520*p,0.18,0.012,{wave:'saw',lp:1600,f1:330*p,a:0.025});return 0.24;};
  SFX.portal = (m,o,t,p) => { [146,155].forEach((f,i)=>T(m,o,t+i*0.04,f*p,0.85,0.021,{wave:'flute',hold:1,a:0.2,rel:0.4}));N(m,o,t,0.7,0.025,{f:480,f1:850,q:1.4,a:0.18,hold:1,rel:0.28});return 1.0;};
  SFX.cork = (m,o,t,p) => {iron(m,o,t,p,0.04,0.16);N(m,o,t+0.06,0.15,0.032,{f:740,f1:380,q:1.7,a:0.02});return 0.25;};
  SFX.slurp = (m,o,t,p) => {N(m,o,t,0.36,0.021,{f:380,f1:190,q:2.2,a:0.065,am:[8,0.35]});return 0.4;};
  SFX.fizz = (m,o,t,p) => {N(m,o,t,0.3,0.026,{f:1250,f1:540,q:0.7,a:0.08});return 0.35;};
  SFX.bite = (m,o,t,p) => {N(m,o,t,0.11,0.07,{f:1000,f1:350,q:1.4,a:0.009});T(m,o,t,170*p,0.12,0.095,{f1:85*p,a:0.006});return 0.18;};
  SFX.open = (m,o,t,p) => {iron(m,o,t,p,0.022,0.18);N(m,o,t,0.17,0.016,{f:500,a:0.03});return 0.24;};
  SFX.close = (m,o,t,p) => {iron(m,o,t,p,0.025,0.13);return 0.18;};
  SFX.horn = (m,o,t,p) => {
    [[0,233,0.23],[0.28,220,0.23],[0.58,185,0.62]].forEach(([dt,f,d])=>{
      T(m,o,t+dt,f*p,d,0.055,{wave:'brass',lp:Math.min(1600,f*5),hold:1,a:0.045,rel:0.12,vib:[4,6,0.2]});
    });return 1.3;
  };
  SFX.bell = (m,o,t,p) => {
    const f=392*p;
    [[0.5,1.65,0.065],[1,1.3,0.073],[1.2,0.95,0.025],[2.76,0.7,0.023]].forEach(([r,d,v])=>T(m,o,t,f*r,d,v,{a:0.008}));
    N(m,o,t,0.035,0.035,{f:1600,q:0.7,a:0.004});return 1.72;
  };
  SFX.neigh = (m,o,t,p) => {
    T(m,o,t,250*p,0.85,0.16,{wave:'brass',fs:[[0,250*p],[0.13,410*p],[0.58,280*p],[0.85,160*p]],lp:1250,hold:1,a:0.07,rel:0.24,vib:[10,36,0.12]});
    N(m,o,t+0.08,0.8,0.07,{f:680,f1:340,q:1.5,a:0.14,hold:1,rel:0.25,am:[15,0.6]});return 0.95;
  };
  SFX.bounce = (m,o,t,p) => {T(m,o,t,185*p,0.25,0.19,{f1:82*p,a:0.005});N(m,o,t,0.26,0.1,{f:600,f1:200,q:0.9,a:0.01});iron(m,o,t+0.03,p,0.045,0.2);return 0.33;};
  SFX.splat = (m,o,t,p) => {N(m,o,t,0.25,0.13,{f:1000,f1:280,q:1.6,a:0.012});T(m,o,t,190*p,0.2,0.08,{f1:78*p,a:0.008});return 0.3;};
  SFX.squish = (m,o,t,p) => {N(m,o,t,0.17,0.1,{f:550,f1:240,q:1.8,a:0.015,am:[17,0.3]});T(m,o,t,145*p,0.16,0.065,{f1:75*p,a:0.013});return 0.22;};
  SFX.emerge = (m,o,t,p) => {N(m,o,t,0.45,0.1,{f:390,f1:800,q:0.9,a:0.075});iron(m,o,t+0.16,p,0.065,0.22);return 0.5;};
  SFX.rotRoar = (m,o,t,p) => {
    T(m,o,t,175*p,0.95,0.095,{wave:'saw',f1:87*p,lp:660,hold:1,a:0.13,rel:0.32,vib:[11,24,0.18]});
    N(m,o,t,0.85,0.08,{f:560,f1:240,q:1.6,a:0.15,hold:1,rel:0.28,am:[8,0.55]});return 1.05;
  };
  SFX.plagueRoar = (m,o,t,p) => {
    N(m,o,t,1.15,0.085,{f:410,f1:280,q:2.1,a:0.18,hold:1,rel:0.38,am:[6,0.65]});
    [147,156].forEach((f,i)=>T(m,o,t+i*0.09,f*p,0.98,0.047-i*0.014,{wave:'flute',f1:(98+i*6)*p,hold:1,a:0.17,rel:0.35}));return 1.22;
  };
  SFX.graveRoar = (m,o,t,p) => {
    N(m,o,t,0.96,0.085,{f:790,f1:340,q:1.8,a:0.15,hold:1,rel:0.32,am:[13,0.3]});
    B(m,o,t+0.16,196*p,0.83,0.055,2.76,0.65);
    T(m,o,t,128*p,0.9,0.055,{wave:'saw',lp:450,hold:1,a:0.17,rel:0.35});return 1.05;
  };
  SFX.ashRoar = (m,o,t,p) => {
    N(m,o,t,1.25,0.09,{f:280,f1:540,q:0.8,a:0.24,hold:1,rel:0.43,am:[4,0.5]});
    T(m,o,t,116*p,1.18,0.082,{wave:'saw',lp:550,f1:75*p,hold:1,a:0.21,rel:0.4});
    iron(m,o,t+0.27,p*0.8,0.028,0.38);return 1.35;
  };
  SFX.nightRoar = (m,o,t,p) => {
    [98,147].forEach((f,i)=>T(m,o,t+i*0.08,f*p,1.35,0.07-i*0.022,{wave:'saw',lp:670,hold:1,a:0.24,rel:0.44,vib:[7,16,0.3]}));
    N(m,o,t+0.07,1.25,0.09,{f:420,f1:180,q:0.9,a:0.23,hold:1,rel:0.43,am:[11,0.4]});return 1.5;
  };
  // Nine execution rites: different rhythm, register and material, rather than one shared spell chime.
  SFX.executionStrike=(m,o,t,p)=>{
    iron(m,o,t,p,.12,.19);T(m,o,t,185*p,.26,.15,{f1:67*p,a:.004});
    N(m,o,t+.018,.11,.085,{f:1700,f1:580,q:.8,a:.005});B(m,o,t+.07,286*p,.4,.028,1.47,1.1);return .52;
  };
  SFX.executionCircle=(m,o,t,p)=>{
    saber(m,o,t,.68,.13,[[0,82*p],[.22,165*p],[.68,62*p]],[[0,350],[.22,1500],[.68,300]],{a:.025,rel:.22,flutter:23,buzz:.37});
    [0,.19,.39].forEach((dt,i)=>{iron(m,o,t+dt,p*semi(-i),.045,.2);N(m,o,t+dt,.13,.037,{f:1300,f1:420,q:.9,a:.01})});return .78;
  };
  SFX.ashRain=(m,o,t,p)=>{
    N(m,o,t,.9,.07,{f:1400,f1:230,q:.8,a:.17,hold:1,rel:.38,am:[11,.35]});
    [196,185,146].forEach((f,i)=>B(m,o,t+i*.17,f*p,.62,.035,1.41,.9));T(m,o,t+.35,125*p,.43,.06,{f1:62*p,a:.05});return 1.05;
  };
  SFX.soulSpears=(m,o,t,p)=>{
    [0,.065,.14].forEach((dt,i)=>{T(m,o,t+dt,(460+i*80)*p,.25,.038,{wave:'saw',f1:(180+i*35)*p,lp:1700,a:.018});N(m,o,t+dt,.085,.04,{f:1900,f1:630,q:1.1,a:.012})});
    B(m,o,t+.05,330*p,.36,.028,2.43,.8);N(m,o,t+.11,.37,.024,{fs:[[0,180],[.15,710],[.37,210]],q:1.5,a:.08,hold:1,rel:.16,am:[7,.45]});return .56;
  };
  SFX.graveFrost=(m,o,t,p)=>{
    N(m,o,t,.78,.065,{f:2200,f1:460,q:.75,a:.15,hold:1,rel:.32,am:[9,.4]});
    [553,523,392].forEach((f,i)=>B(m,o,t+.05+i*.15,f*p,.65,.027,2.71,1.25));T(m,o,t+.11,98*p,.65,.035,{wave:'saw',lp:280,hold:1,a:.13,rel:.25});return 1.05;
  };
  SFX.tormentField=(m,o,t,p)=>{
    [0,.16,.38].forEach((dt,i)=>{N(m,o,t+dt,.23,.042,{f:670-i*90,f1:180,q:1.6,a:.02,am:[17+i*3,.6]});iron(m,o,t+dt,p*semi(-i*3),.027,.25)});
    T(m,o,t,147*p,.84,.042,{wave:'sq',lp:420,f1:83*p,hold:1,a:.16,rel:.3});N(m,o,t+.23,.6,.023,{fs:[[0,180],[.32,660],[.6,230]],q:1.7,a:.15,hold:1,rel:.22,am:[6,.55]});return 1.0;
  };
  SFX.reaperCrescent=(m,o,t,p)=>{
    saber(m,o,t,.39,.11,[[0,160*p],[.1,245*p],[.39,80*p]],[[0,450],[.1,2100],[.39,370]],{a:.018,rel:.16,flutter:41,buzz:.43});
    iron(m,o,t+.09,p*.8,.07,.27);N(m,o,t+.06,.24,.04,{f:1700,f1:260,q:1,a:.018});return .5;
  };
  SFX.chainBind=(m,o,t,p)=>{
    [0,.07,.13,.24].forEach((dt,i)=>B(m,o,t+dt,(410-i*43)*p,.32,.034-i*.003,2.76,1.7));
    N(m,o,t+.04,.36,.04,{f:1000,f1:260,q:1.25,a:.025,am:[31,.6]});T(m,o,t+.21,123*p,.45,.05,{f1:72*p,a:.012});return .78;
  };
  SFX.mercilessSeal=(m,o,t,p)=>{
    T(m,o,t,105*p,.61,.105,{f1:51*p,a:.013});iron(m,o,t,p*.75,.065,.45);
    B(m,o,t+.14,196*p,.72,.038,1.41,1.45);B(m,o,t+.3,185*p,.59,.033,2.43,1.0);
    N(m,o,t+.07,.76,.038,{f:620,f1:190,q:1.2,a:.15,hold:1,rel:.35,am:[7,.7]});N(m,o,t+.35,.62,.022,{fs:[[0,220],[.3,710],[.62,180]],q:1.6,a:.16,hold:1,rel:.25,am:[5,.55]});return 1.1;
  };
  SFX.clink = SFX.clank; // armor movement uses both names in existing gameplay hooks
  const SVOL = {
    swing: 0.42, swingBig: 0.58, hit: 0.82, hitSoft: 1.2, crit: 0.7, pop: 1.43, coin: 1.16, heart: 1.25, potion: 2.24,
    levelup: 2.12, unlock: 2.11, star: 1.89, spin: 1.5, ice: 1.64, shield: 1.44, zap: 3.8, meteorFall: 1.22, boom: 0.63,
    hurt: 1.24, chest: 2.54, portal: 2.12, break: 2.09, drop: 1.81, dropRare: 2.07, dropLegend: 2.74, click: 2.55, checkpoint: 2.67,
    roar: 0.68, bite: 1.53, spit: 1.95, fireball: 2.39, slam: 0.67, whoosh: 2.05, bat: 5.22, splash: 2.17, cheer: 2.61,
    step: 4.2, nope: 1.13, open: 2.12, close: 1.98, cast: 2.34,
    saberOn: 0.92, saberOff: 0.56, dig: 2.87, emerge: 1.13, bubble: 1.33, bubblePop: 1.83,
    lava: 0.68, erupt: 0.58, drill: 0.5, roll: 1.43, bounce: 0.61, chirp: 2.14, splat: 0.91, rumble: 1.36,
    fizz: 2.55, cork: 1.04, slurp: 3.1, squish: 1.19, moo: 0.64,
    neigh: 0.49, gallop: 1.09, drum: 0.7, broom: 2.75, horn: 0.99, bell: 0.77, clank: 1.04, clink: 1.04,
    bonk: 1.08, hiccup: 1.44, munch: 1.8, sigh: 1.27, bilboBark: 0.9, bilboGuard: 0.87, executionStrike: .85, executionCircle: .83, ashRain: .85, soulSpears: .88, graveFrost: .9, tormentField: .92, reaperCrescent: .85, chainBind: .87, mercilessSeal: .88, bilboCharge: 0.9, bilboImpact: 0.8, guardBreak: 1.0,
    rotRoar: 0.8, plagueRoar: 0.9, graveRoar: 0.85, ashRoar: 0.8, nightRoar: 0.85,
  };
  // Random pitch spread (semitones, default 0.45), min retrigger gap (s) and "droppable when busy".
  const SVAR = { levelup: 0.05, unlock: 0.05, checkpoint: 0.05, chest: 0.1, dropLegend: 0.05, dropRare: 0.15, portal: 0.1, click: 0.15, coin: 0.05, pop: 0.08,
    saberOn: 0.1, saberOff: 0.1, drill: 0.2, rumble: 0.25, erupt: 0.3, cork: 0.6, slurp: 0.2, moo: 1.2,
    neigh: 0.3, gallop: 0.3, drum: 0.2, horn: 0.05, bell: 0.1, hiccup: 0.3, sigh: 0.2 };   // horn / bell: a tune and a tuned bell stay in tune
  const SGAP = { step: 0.07, hit: 0.035, hitSoft: 0.035, coin: 0.035, pop: 0.05, swing: 0.06, bat: 0.12, spit: 0.05, drop: 0.05, zap: 0.04, boom: 0.05, heart: 0.05,
    saberOn: 0.2, saberOff: 0.2, dig: 0.14, emerge: 0.08, bubble: 0.08, bubblePop: 0.04,
    lava: 0.3, erupt: 0.18, drill: 0.35, roll: 0.3, bounce: 0.1, chirp: 0.14, splat: 0.06, rumble: 0.7,
    fizz: 0.12, cork: 0.12, slurp: 0.5, squish: 0.06, moo: 7,   // moo: a rare ambient, never twice within 7 s however often it is asked for
    neigh: 0.7, gallop: 0.12, drum: 0.2, broom: 0.12, horn: 0.6, bell: 0.5, clank: 0.07, clink: 0.12,
    bonk: 0.08, hiccup: 0.2, munch: 0.3, sigh: 0.8, bilboBark: 1.5, bilboGuard: 2.2, executionStrike: .5, executionCircle: .7, ashRain: .8, soulSpears: .5, graveFrost: .7, tormentField: .8, reaperCrescent: .4, chainBind: .6, mercilessSeal: .8, bilboCharge: 0.8, bilboImpact: 0.3, guardBreak: 0.8,
    rotRoar: 0.9, plagueRoar: 0.9, graveRoar: 0.9, ashRoar: 0.9, nightRoar: 1.1 };   // munch: one per chew (GAME calls it every 0.5 s)   // gallop: one per hoof beat, strides ≥ 0.15 s apart all play
  const LOW = { step: 1, hitSoft: 1, swing: 1, bat: 1, spit: 1, drop: 1, click: 1, whoosh: 1, dig: 1, bubblePop: 1, lava: 1, chirp: 1, splat: 1,
    fizz: 1, squish: 1, moo: 1, broom: 1, clank: 1, munch: 1 };
  const STREAK = [0, -1, -3, -5, -6, -8, -10, -12];   // consecutive pickups descend through a tense minor palette

  function playRecipe(m, name, o, t) {
    const c = m.c, g = gainNode(c, o.g);
    let head = g;
    if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = o.pan; g.connect(pn); head = pn; }
    head.connect(m.sfx);
    const len = SFX[name](m, g, t, o.p) || 1;
    return { len, g, head };
  }

  // Distance attenuation (full within 4 m, ~0.6 at 10 m, ~0.16 at 20 m) and gentle stereo pan by screen x.
  function spatial(x, z) {
    if (x === undefined || z === undefined) return [1, 0];
    const dx = x - lx, dz = z - lz, d = Math.sqrt(dx * dx + dz * dz), e = Math.max(0, d - 4) / 7;
    return [1 / (1 + e * e), cl(dx / 14, -0.7, 0.7)];
  }
  let active = 0, stepAlt = 0, effectEpoch = 0;
  const lastT = {}, streak = { coin: [0, -9], pop: [0, -9] }, warned = {};
  function sfx(name, o) {
    if (!unlocked || !M || !A.soundOn || document.hidden || pageAway) return false;
    if ((name === 'bilboBark' || name === 'bilboGuard') && !M.bilboBark) return false;
    if (!SFX[name]) { if (!warned[name]) { warned[name] = 1; console.warn('AUD.sfx: unknown sound', name); } return false; }
    if (typeof o === 'number') o = { vol: o };
    o = o || {};
    const now = ctx.currentTime;
    if (now - (lastT[name] ?? -9) < (SGAP[name] ?? 0.025)) return false;
    if (active > 34 || (active > 22 && LOW[name])) return false;
    const sp = spatial(o.x, o.z), g = (o.vol ?? 1) * (SVOL[name] ?? 1) * sp[0], pan = sp[1];
    if (g < 0.02) return false;
    lastT[name] = now;
    let p = (o.pitch || 1) * semi(rnd(-1, 1) * (SVAR[name] ?? 0.45));
    if (name === 'step') p *= (stepAlt ^= 1) ? 1.04 : 0.96;
    const s = streak[name];
    if (s) { s[0] = now - s[1] < 0.5 ? Math.min(s[0] + 1, STREAK.length - 1) : 0; s[1] = now; p *= semi(STREAK[s[0]]); }
    try {
      const r = playRecipe(M, name, { g, p, pan }, now + 0.008);
      active++; const epoch = effectEpoch;
      setTimeout(() => { if (epoch === effectEpoch) active = Math.max(0, active - 1); try { r.head.disconnect(); } catch (e) { /* already gone */ } }, (r.len + 0.4) * 1000);
    } catch (e) { console.warn('AUD.sfx', name, e); return false; }
    return true;
  }

  // ───────────────────────── music: instruments ─────────────────────────
  const INST = {
    // Two-voice textures, deliberately cheaper than dense sampled orchestration.
    bowed(m,out,t,f,d,v) {
      d=Math.max(d,0.22);
      for(const det of [-5,5]) T(m,out,t,f,d,v*0.5,{wave:'saw',det,lp:Math.min(1800,f*3.5),q:0.55,hold:1,a:Math.min(0.17,d*0.3),rel:Math.min(0.25,d*0.3),vib:[4.4,7,0.2]});
    },
    choir(m,out,t,f,d,v) {
      d=Math.max(d,0.4);
      T(m,out,t,f,d,v*0.7,{wave:'flute',lp:1100,hold:1,a:Math.min(0.23,d*0.3),rel:Math.min(0.35,d*0.3),vib:[3.6,5,0.25]});
      T(m,out,t,f*2,d,v*0.12,{type:'sine',det:-7,hold:1,a:Math.min(0.28,d*0.3),rel:Math.min(0.35,d*0.3)});
    },
    toll(m,out,t,f,d,v) {B(m,out,t,f,Math.min(2.4,Math.max(0.8,d)),v,2.76,0.45);},
    pad(m, out, t, f, d, v) { for (const det of [-9, 9]) T(m, out, t, f, d, v * 0.5, { wave: 'saw', det, hold: 1, a: Math.min(0.6, d * 0.3), rel: Math.min(0.9, d * 0.4) }); },
    bass(m, out, t, f, d, v) { T(m, out, t, f, d, v, { type: 'triangle', hold: 1, a: 0.012, rel: 0.08 }); T(m, out, t, f, d, v * 0.6, { hold: 1, a: 0.012, rel: 0.08 }); },
    pbass(m, out, t, f, d, v) { d = Math.max(d, 0.3); T(m, out, t, f, d, v, { wave: 'saw', lp: [[0, f * 7], [0.12, f * 2.2]], q: 2, a: 0.004 }); T(m, out, t, f, d, v * 0.7, { a: 0.004 }); },
    marimba(m, out, t, f, d, v) { d = cl(d * 2, 0.35, 0.8); T(m, out, t, f, d, v, { a: 0.002 }); T(m, out, t, f * 4, d * 0.16, v * 0.22, { a: 0.001 }); },
    kalimba(m, out, t, f, d, v) { T(m, out, t, f, 0.9, v, { a: 0.002 }); T(m, out, t, f * 5.4, 0.07, v * 0.18, { a: 0.001 }); },
    celesta(m, out, t, f, d, v) { B(m, out, t, f, 1.1, v, 4, 0.85); T(m, out, t, f * 2, 0.3, v * 0.12, { a: 0.001 }); },
    glock(m, out, t, f, d, v) { T(m, out, t, f, 1.2, v, { a: 0.001 }); T(m, out, t, f * 2.76, 0.35, v * 0.3, { a: 0.001 }); T(m, out, t, f * 5.4, 0.12, v * 0.1, { a: 0.001 }); },
    ocarina(m, out, t, f, d, v) { T(m, out, t, f, Math.max(d, 0.12), v, { wave: 'flute', hold: 1, a: 0.035, rel: 0.08, vib: [5.2, 14, 0.18] }); N(m, out, t, 0.08, v * 0.06, { f: f * 2, q: 6, a: 0.01 }); },
    brass(m, out, t, f, d, v) { d = Math.max(d, 0.12); T(m, out, t, f, d, v, { wave: 'brass', hold: 1, a: 0.025, rel: 0.09, lp: [[0, f * 1.5], [0.05, f * 5], [0.25, f * 3]], q: 1, vib: [5.5, 9, 0.22] }); },
    chip(m, out, t, f, d, v) { T(m, out, t, f, Math.max(d, 0.08), v, { wave: 'sq', lp: 3500, hold: 1, a: 0.005, rel: 0.04, vib: [6, 8, 0.15] }); },
    pluck(m, out, t, f, d, v) { T(m, out, t, f, cl(d * 2, 0.25, 0.6), v, { wave: 'saw', lp: [[0, f * 8], [0.1, f * 2]], a: 0.002 }); },
    // steel pan: round sine body (starts a hair sharp), strong octave, a little twelfth and a bright stick "ping" that mellows fast
    steel(m, out, t, f, d, v) {
      const dd = cl(d * 2.2, 0.45, 1.0);
      T(m, out, t, f, dd, v, { fs: [[0, f * 1.012], [0.03, f]], a: 0.003 });
      T(m, out, t, f * 2, dd * 0.6, v * 0.5, { det: 3, a: 0.002 });
      T(m, out, t, f * 3, dd * 0.28, v * 0.2, { det: -5, a: 0.001 });
      T(m, out, t, f * 4.02, 0.06, v * 0.1, { a: 0.001 });
    },
    // ── Round 4: Kefir Vadisi's little village band ──
    // accordion: two reeds tuned a hair apart (the "musette" shimmer, ~3 Hz beating), soft bellows attack, gently rounded top
    accordion(m, out, t, f, d, v) {
      d = Math.max(d, 0.05);   // short enough for the quick folk-turn notes
      const lp = Math.min(f * 5, 4000);
      T(m, out, t, f, d, v * 0.55, { wave: 'saw', det: -7, lp, q: 0.6, hold: 1, a: 0.03, rel: 0.07 });
      T(m, out, t, f, d, v * 0.45, { wave: 'sq', det: 8, lp, q: 0.6, hold: 1, a: 0.035, rel: 0.07 });
    },
    // ukulele: soft nylon pluck (the brightness closes quickly), a hair of pitch settle at the start
    uke(m, out, t, f, d, v) { T(m, out, t, f, 0.5, v, { wave: 'saw', fs: [[0, f * 1.006], [0.02, f]], lp: [[0, f * 6], [0.05, f * 2.2], [0.5, f * 1.2]], q: 0.8, a: 0.002 }); },
    // xylophone: hard mallet on a wooden bar: bright body, its tuned 3rd-harmonic overtone and a tiny woody tick, short
    xylo(m, out, t, f, d, v) {
      T(m, out, t, f, 0.34, v, { a: 0.001 });
      T(m, out, t, f * 3, 0.13, v * 0.28, { a: 0.001 });
      T(m, out, t, Math.min(f * 6.3, 16000), 0.025, v * 0.1, { a: 0.0005 });
    },
    // bağlama (saz): bright metallic pluck with its octave string; long notes turn into the saz's quick tremolo picking
    saz(m, out, t, f, d, v) {
      const one = (tt, vv) => {
        T(m, out, tt, f, 0.38, vv, { wave: 'saw', det: 4, lp: [[0, f * 9], [0.05, f * 3], [0.38, f * 1.6]], q: 1.5, a: 0.001 });
        T(m, out, tt, f * 2, 0.22, vv * 0.3, { wave: 'saw', det: -6, lp: [[0, f * 10], [0.05, f * 4]], q: 1, a: 0.001 });
      };
      if (d < 0.32) { one(t, v); return; }
      const step = 0.078, n = Math.min(8, Math.floor(d / step));
      for (let i = 0; i < n; i++) one(t + i * step, v * (i ? 0.5 - i * 0.025 : 1));
    },
    // ── Round 5: Surlu Şehir's market-day players ──
    // recorder: a pure, breathy pipe with a soft "tu" chiff at the start of each note and only a hint of late vibrato
    recorder(m, out, t, f, d, v) {
      d = Math.max(d, 0.06);
      T(m, out, t, f, d, v, { wave: 'rec', fs: [[0, f * 0.985], [0.022, f]], hold: 1, a: 0.016, rel: 0.05, vib: [5.5, 7, 0.28] });
      N(m, out, t, 0.035, v * 0.18, { f: Math.min(f * 3, 7000), q: 3, a: 0.003 });   // chiff
      if (d > 0.3) N(m, out, t, d, v * 0.02, { f: f * 2, q: 7, hold: 1, a: 0.06, rel: 0.05 });   // breath under a long note
    },
    // lute (ud): warm gut strings in a pair a hair apart (the 2nd plucked a moment later), round and woody, darker than the saz;
    // long notes get the quick tremolo picking (the light Anatolian touch)
    lute(m, out, t, f, d, v) {
      const one = (tt, vv) => {
        T(m, out, tt, f, 0.6, vv * 0.62, { wave: 'saw', det: -3, lp: [[0, f * 6], [0.035, f * 2.4], [0.6, f * 1.2]], q: 0.7, a: 0.0015 });
        T(m, out, tt + 0.006, f, 0.5, vv * 0.4, { wave: 'sq', det: 5, lp: [[0, f * 4], [0.05, f * 1.6]], q: 0.7, a: 0.002 });
      };
      if (d < 0.34) { one(t, v); return; }
      const step = 0.076, n = Math.min(8, Math.floor(d / step));
      for (let i = 0; i < n; i++) one(t + i * step, v * (i ? 0.52 - i * 0.025 : 1));
    },
  };
  const DRUM = {
    kick(m, o, t, v) { T(m, o, t, 150, 0.22, v, { fs: [[0, 150], [0.09, 50]], a: 0.002 }); N(m, o, t, 0.012, v * 0.2, { type: 'lowpass', f: 1800 }); },
    snare(m, o, t, v) { N(m, o, t, 0.13, v, { f: 1900, q: 0.8, a: 0.001 }); T(m, o, t, 200, 0.07, v * 0.5, { f1: 160, type: 'triangle' }); },
    rim(m, o, t, v) { T(m, o, t, 820, 0.035, v, { a: 0.001 }); N(m, o, t, 0.025, v * 0.5, { f: 2400, q: 2, a: 0.001 }); },
    clap(m, o, t, v) { for (let i = 0; i < 3; i++) N(m, o, t + i * 0.011, 0.02, v * 0.7, { f: 1300, q: 1.1, a: 0.001 }); N(m, o, t + 0.03, 0.12, v * 0.55, { f: 1300, q: 1.1, a: 0.002 }); },
    hat(m, o, t, v) { N(m, o, t, 0.035, v, { type: 'highpass', f: 7500, q: 0.7, a: 0.001 }); },
    shaker(m, o, t, v) { N(m, o, t, 0.07, v, { f: 5500, q: 1.2, a: 0.012 }); },
    wood(m, o, t, v) { T(m, o, t, 1000, 0.06, v, { a: 0.001 }); T(m, o, t, 2300, 0.03, v * 0.3, { a: 0.001 }); },
    tamb(m, o, t, v) { N(m, o, t, 0.06, v, { type: 'highpass', f: 6500, a: 0.002 }); N(m, o, t, 0.12, v * 0.5, { f: 9000, q: 4, a: 0.002 }); },
    crash(m, o, t, v) { N(m, o, t, 1.4, v, { type: 'highpass', f: 5000, q: 0.5, a: 0.005 }); },
    swell(m, o, t, v, d = 1) { N(m, o, t, d, v, { type: 'highpass', f: 4000, q: 0.5, a: d * 0.9, hold: 1, rel: 0.05 }); },
    timp(m, o, t, v, f = 98) { T(m, o, t, f * 1.4, 0.6, v, { f1: f, glide: 0.05, a: 0.003 }); N(m, o, t, 0.1, v * 0.3, { type: 'lowpass', f: 300 }); },
    conga(m, o, t, v, f = 196) { T(m, o, t, f * 1.35, 0.26, v, { f1: f, glide: 0.03, a: 0.002 }); N(m, o, t, 0.02, v * 0.3, { f: 1800, q: 1.2, a: 0.001 }); },
    bongo(m, o, t, v, f = 392) { T(m, o, t, f * 1.3, 0.13, v, { f1: f, glide: 0.02, a: 0.001 }); N(m, o, t, 0.012, v * 0.3, { f: 3000, q: 1.5, a: 0.001 }); },
    // darbuka: "düm" = round centre stroke (with a higher body partial so tablet speakers still hear it), "tek" = crisp rim, "ka" = soft rim
    dum(m, o, t, v) { T(m, o, t, 150, 0.3, v, { fs: [[0, 150], [0.05, 104]], a: 0.002 }); T(m, o, t, 245, 0.11, v * 0.35, { f1: 195, a: 0.002 }); N(m, o, t, 0.02, v * 0.15, { type: 'lowpass', f: 1500 }); },
    tek(m, o, t, v) { T(m, o, t, 720, 0.06, v * 0.5, { f1: 640, a: 0.0008 }); N(m, o, t, 0.05, v, { f: 3200, q: 1.4, a: 0.0008 }); },
    ka(m, o, t, v) { N(m, o, t, 0.035, v, { f: 2600, q: 1.6, a: 0.001 }); T(m, o, t, 680, 0.04, v * 0.3, { a: 0.001 }); },
  };

  // ───────────────────────── music: themes ─────────────────────────
  const MAJ = [0, 2, 4, 5, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10], AEO = [0, 2, 3, 5, 7, 8, 10];
  const IV = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], s4: [0, 5, 7], s2: [0, 2, 7], a9: [0, 4, 7, 14], m9: [0, 3, 7, 14], D7: [0, 4, 7, 10] };
  const C = (r, q) => ({ r, iv: IV[q] });
  // 16-bar forms "a b c d | a b c e | bridge | a b c e" so the melody's A phrase fits both halves.
  const form = (a, b, c, d, e, br) => [a, b, c, d, a, b, c, e].concat(br, [a, b, c, e]);
  // Sparse minor / Phrygian score. The existing scheduler, mixer and limiter are unchanged.
  const PHR = [0, 1, 3, 5, 7, 8, 10];
  const darkTheme = (key, bpm, instrument, texture, pulse, volume = 0.8) => ({
    bpm, key, scale: PHR, vol: volume, swing: 0, fadeIn: 2.4,
    prog: form(C(36 + key, 'm'), C(37 + key, 'M'), C(36 + key, 's4'), C(44 + key, 'M'), C(43 + key, 'm'),
      [C(36 + key, 'm9'), C(37 + key, 'M'), C(43 + key, 's4'), C(36 + key, 'm')]),
    pad: { vol: 0.028, lo: 48 + key, n: 3, cut: 750 },
    bass: { inst: 'bass', pat: [pulse], vol: 0.055, oct: 12 },
    arp: { inst: texture, step: 8, pat: ['0...2..1', '0..1...2'], lo: 55 + key, vol: 0.017, echo: 1 },
    lead: { inst: instrument, alt: texture, lo: 60 + key, hi: 73 + key, vol: 0.027, cells: 'slow', plan: [1, 0, 1, 0], echo: 1 },
    kit: { timp: ['x.......o.......', 0.052], shaker: ['........o.......', 0.008] }, drumsIn: 4,
    extra(p, t, bar) {
      // A quiet held minor second returns every fourth bar: the curse's uneasy breath.
      if (bar % 4 === 2) {
        const f = mtof(48 + key);
        T(p.M, p.out, t + p.beat, f, p.beat * 2, 0.012, { type: 'triangle', hold: 1, a: 0.4, rel: 0.5 });
        T(p.M, p.out, t + p.beat, f * semi(1), p.beat * 2, 0.007, { type: 'sine', hold: 1, a: 0.5, rel: 0.5 });
        N(p.M, p.out, t, 1.4, 0.005, { f: 480, q: 0.7, a: 0.6, hold: 1, rel: 0.5 });
      }
    },
  });
  const THEMES = {
    title: darkTheme(2, 58, 'lute', 'celesta', 'r.......', 0.72),
    orman: darkTheme(0, 68, 'ocarina', 'lute', 'r...5...', 0.8),
    kefir: darkTheme(5, 62, 'accordion', 'pluck', 'r.....r.', 0.78),
    magara: darkTheme(2, 56, 'celesta', 'kalimba', 'r.......', 0.75),
    yanardag: darkTheme(7, 86, 'brass', 'pluck', 'r..r.5..', 0.84),
    sehir: darkTheme(9, 72, 'recorder', 'lute', 'r...r.5.', 0.81),
    kale: darkTheme(2, 80, 'brass', 'celesta', 'r.r.5...', 0.86),
    boss: darkTheme(9, 106, 'brass', 'pluck', 'r.r.r.5.', 0.88),
    zafer: darkTheme(2, 60, 'lute', 'ocarina', 'r.......', 0.74),
  };
  // Each place keeps its own pulse and negative space. No extra scheduler or continuous ambient sources.
  const profiles = {
    title: { inst:'choir', alt:'lute', key:2, cut:620, arp:'toll', pat:['0.......','....1...'], kit:null, leadPlan:[1,0,2,0], breath:300 },
    orman: { inst:'bowed', alt:'ocarina', key:0, cut:760, arp:'lute', pat:['0...2...','...1...0'], kit:{wood:['x.........o.....',0.014],shaker:['......o.......o.',0.007]}, leadPlan:[1,0,2,1], breath:650 },
    kefir: { inst:'choir', alt:'bowed', key:5, cut:580, arp:'pluck', pat:['0..1....','0.....2.'], kit:{timp:['x......o........',0.038],rim:['.............o..',0.009]}, leadPlan:[1,0,2,0], breath:390 },
    magara: { inst:'toll', alt:'choir', key:2, cut:620, arp:'celesta', pat:['0.......','.....1..'], kit:{wood:['............o...',0.012]}, leadPlan:[1,0,0,2], breath:900 },
    yanardag: { inst:'bowed', alt:'brass', key:7, cut:950, arp:'pluck', pat:['0..20...','0...1.2.'], kit:{timp:['x.....o.x.......',0.055],rim:['....o.......o...',0.013]}, leadPlan:[1,1,2,0], breath:250 },
    sehir: { inst:'recorder', alt:'choir', key:9, cut:670, arp:'lute', pat:['0...1...','...2...1'], kit:{dum:['x........o......',0.04],wood:['......o.......o.',0.012]}, leadPlan:[1,0,2,0], breath:500 },
    kale: { inst:'choir', alt:'bowed', key:2, cut:850, arp:'toll', pat:['0.....2.','0...1...'], kit:{timp:['x.......x...o...',0.058],rim:['......o.......o.',0.012]}, leadPlan:[1,0,2,1], breath:320 },
    boss: { inst:'bowed', alt:'brass', key:9, cut:1100, arp:'pluck', pat:['0.2.1.2.','0..21.2.'], kit:{timp:['x...o...x.....o.',0.065],rim:['....o.......o...',0.018]}, leadPlan:[1,1,2,1], breath:220 },
    zafer: { inst:'bowed', alt:'choir', key:2, cut:650, arp:'lute', pat:['0.......','....2...'], kit:null, leadPlan:[1,0,2,0], breath:430 },
  };
  const journeys = {
    title: [[38,'m9'],[39,'M'],[38,'s2'],[45,'s4']],
    orman: [[36,'m'],[41,'m'],[37,'M'],[43,'m']],
    kefir: [[41,'m9'],[42,'M'],[48,'s4'],[41,'s2']],
    magara: [[38,'m9'],[39,'M'],[38,'s2'],[45,'m']],
    yanardag: [[43,'m'],[44,'M'],[50,'m'],[48,'m']],
    sehir: [[45,'m'],[46,'M'],[48,'M'],[40,'m']],
    kale: [[38,'m'],[39,'M'],[38,'m9'],[45,'m']],
    boss: [[45,'m'],[46,'M'],[45,'s2'],[52,'m']],
    zafer: [[38,'m'],[43,'m'],[41,'M'],[38,'s4']],
  };
  for(const name of Object.keys(profiles)) {
    const th=THEMES[name], pf=profiles[name];
    const chords=journeys[name].map(([root,quality])=>C(root,quality));
    th.prog=form(chords[0],chords[1],chords[2],chords[3],C(36+pf.key,'m'),[chords[2],chords[1],chords[3],chords[0]]);
    th.pad.cut=pf.cut; th.lead.inst=pf.inst; th.lead.alt=pf.alt; th.lead.plan=pf.leadPlan;
    th.lead.vol=name==='boss'?0.032:0.026; th.lead.echo=name==='magara'?1:0;
    th.arp.inst=pf.arp; th.arp.pat=pf.pat; th.arp.vol=pf.arp==='toll'?0.014:0.017; th.arp.echo=name==='magara'?1:0;
    th.kit=pf.kit; th.drumsIn=name==='boss'?0:2;
    const baseExtra=th.extra;
    th.extra=(p,t,bar,ch)=>{
      // The place answers only once per eight bars. Quiet layers stay below the narrator and combat cues.
      if(bar%8===4) {
        N(p.M,p.out,t+p.beat,1.8,0.006,{f:pf.breath,q:1.1,a:0.6,hold:1,rel:0.7,am:[2.1,0.2]});
        if(name==='magara'||name==='sehir'||name==='kale') p.note('toll',t+p.beat*2,48+pf.key,1.6,0.012);
      }
      if(bar%4===2) baseExtra(p,t,bar,ch);
      if(name==='boss'&&bar%4===3) {
        [0,1,3].forEach((interval,i)=>p.note('bowed',t+p.beat*(2+i*0.45),57+pf.key-interval,p.beat*0.48,0.021));
      }
    };
  }
  // The two opening chapters reuse the dark journey music.
  THEMES.tuvalet = Object.assign({}, THEMES.orman, { bpm: 88 });
  THEMES.ay = Object.assign({}, THEMES.title, { bpm: 82 });
  // Chord tones ascending from lo.
  function voice(ch, lo, n) {
    const pcs = ch.iv.map(i => (ch.r + i) % 12), out = [];
    for (let mm = lo; out.length < n && mm < lo + 40; mm++) if (pcs.includes(mm % 12)) out.push(mm);
    return out;
  }

  // ── generative melody: 4-bar phrases in an A A' B A' form, regenerated every so often ──
  const CELLS = {
    slow: [[[0, 4], [4, 4]], [[0, 2], [2, 2], [4, 4]], [[0, 6], [6, 2]], [[0, 3], [3, 1], [4, 4]], [[2, 2], [4, 4]], [[0, 4], [4, 2], [6, 2]]],
    mid: [[[0, 2], [2, 2], [4, 2], [6, 2]], [[0, 1], [1, 1], [2, 2], [4, 2], [6, 2]], [[0, 3], [3, 1], [4, 2], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 4]],
      [[0, 2], [2, 2], [4, 4]], [[1, 1], [2, 2], [4, 1], [5, 1], [6, 2]], [[0, 4], [4, 1], [5, 1], [6, 2]]],
  };
  CELLS.busy = CELLS.mid.concat([[[0, 1], [1, 1], [2, 1], [3, 1], [4, 2], [6, 2]], [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2]], [[0, 2], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1]]]);
  const ENDS = [[[0, 2], [2, 2], [4, 4]], [[0, 4], [4, 4]], [[0, 2], [2, 6]], [[0, 1], [1, 1], [2, 6]]];
  const ENDS_SLOW = [[[0, 4], [4, 4]], [[0, 8]], [[0, 2], [2, 6]]];
  function scaleNotes(th) {
    const out = [];
    for (let mm = th.lead.lo - 12; mm <= th.lead.hi + 12; mm++) if (th.scale.includes(((mm - th.key) % 12 + 12) % 12)) out.push(mm);
    return out;
  }
  // Nearest scale index whose pitch class is in pcs, searching in the melody's direction first.
  function toPc(sc, i, pcs, dir = 1) {
    for (let k = 0; k < 8; k++) for (const s of k ? [dir, -dir] : [1]) { const j = i + k * s; if (j >= 0 && j < sc.length && pcs.includes(sc[j] % 12)) return j; }
    return cl(i, 0, sc.length - 1);
  }
  function genBars(th, bar0, b0, b1, startM, end) {
    const L = th.lead, sc = th._sc || (th._sc = scaleNotes(th)), cells = CELLS[L.cells || 'mid'], out = [], mid = (L.lo + L.hi) / 2, span = L.hi - L.lo;
    let i = 0, dir = Math.random() < 0.5 ? 1 : -1, p1 = -1, p2 = -1;
    for (let k = 1; k < sc.length; k++) if (Math.abs(sc[k] - startM) < Math.abs(sc[i] - startM)) i = k;
    for (let b = b0; b < b1; b++) {
      const ch = th.prog[(bar0 + b) % th.prog.length], pcs = ch.iv.map(x => (ch.r + x) % 12);
      const last = b === 3, cell = last ? pick(L.cells === 'slow' ? ENDS_SLOW : ENDS) : pick(cells);
      for (let k = 0; k < cell.length; k++) {
        const s = cell[k][0], d = cell[k][1], off = sc[i] - mid;
        if (Math.abs(off) > span * 0.3 && Math.random() < 0.75) dir = off > 0 ? -1 : 1;   // gravity toward the middle
        if (last && k === cell.length - 1) i = toPc(sc, i, end === 'a' ? (pcs.includes(th.key) ? [th.key] : [pcs[0]]) : [pcs[1], pcs[2]], dir);
        else if (s % 4 === 0) i = toPc(sc, i + dir * (Math.random() < 0.3 ? 2 : 1), pcs, dir);   // chord tone on strong beats
        else { i += dir * (Math.random() < 0.8 ? 1 : 2); if (Math.random() < 0.25) dir = -dir; }
        i = cl(i, 0, sc.length - 1);
        while (sc[i] > L.hi && i > 0) { i--; dir = -1; }
        while (sc[i] < L.lo && i < sc.length - 1) { i++; dir = 1; }
        if (i === p1 && i === p2) { i = cl(i + dir, 0, sc.length - 1); if (sc[i] > L.hi || sc[i] < L.lo) i = cl(i - 2 * dir, 0, sc.length - 1); }   // no 3 repeats
        p2 = p1; p1 = i;
        out.push({ s: b * 8 + s, d, m: sc[i] });
      }
    }
    return out;
  }

  // ── theme player: schedules one whole bar at a time, a little ahead of the audio clock ──
  class Player {
    constructor(m, name, t0) {
      const th = THEMES[name], c = m.c;
      this.m = m; this.M = m; this.th = th; this.name = name; this.beat = 60 / th.bpm; this.bar = 0; this.stopAt = Infinity;
      this.out = gainNode(c, 0); this.out.connect(m.music);
      this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.Q.value = 0.5;
      this.padF.frequency.value = th.pad ? th.pad.cut : 1000; this.padF.connect(this.out);
      this.lfo = c.createOscillator(); this.lfo.frequency.value = 0.06;
      const lg = gainNode(c, (th.pad ? th.pad.cut : 1000) * 0.3); this.lfo.connect(lg); lg.connect(this.padF.frequency); this.lfo.start(t0);
      this.ph = -1; this.A = this.A2 = this.cur = null; this.inst = null;
      this.t = t0 + (th.intro ? th.intro(this, t0) : 0);
    }
    note(inst, t, midi, dur, vol) { INST[inst](this.m, inst === 'pad' ? this.padF : this.out, t, mtof(midi), dur, vol); }
    drum(name, t, v, x) { DRUM[name](this.m, this.out, t, v, x); }
    // Own ramp bookkeeping instead of reading AudioParam.value mid-automation (not reliable on every Safari).
    fade(to, t, dur) {
      const g = this.out.gain, f = this.f, from = f ? f[0] + (f[1] - f[0]) * cl((t - f[2]) / Math.max(1e-3, f[3] - f[2]), 0, 1) : 0;
      g.cancelScheduledValues(t); g.setValueAtTime(from, t); g.linearRampToValueAtTime(to, t + dur);
      this.f = [from, to, t, t + dur];
    }
    stop(t, dur) { this.fade(0, t, dur); this.stopAt = t + dur; try { this.lfo.stop(t + dur + 3); } catch (e) { /* ignore */ } }
    pump(until) {
      const c = this.m.c;
      // fell behind (e.g. main thread stalled): skip ahead instead of piling notes into the past
      if (c.currentTime > 0 && this.t < c.currentTime - 0.05 && this.t < this.stopAt) {
        const bars = Math.ceil((Math.min(c.currentTime - 0.05, this.stopAt) - this.t) / (this.beat * 4));
        this.t += bars * this.beat * 4; this.bar += bars;
      }
      while (this.t < until && this.t < this.stopAt) { this.arrange(this.t, this.bar); this.t += this.beat * 4; this.bar++; }
    }
    leadBar(bar) {
      const th = this.th, L = th.lead, ph = Math.floor(bar / 4), part = ph % 4, mid = (L.lo + L.hi) >> 1, start = ph * 4;
      if (ph !== this.ph) {
        this.ph = ph;
        if (!this.A || (part === 0 && Math.random() < 0.6)) { this.A = genBars(th, start - part * 4, 0, 4, mid, 'q'); this.A2 = null; }
        if (part === 1 || part === 3) {
          if (!this.A2) { const keep = this.A.filter(n => n.s < 24); this.A2 = keep.concat(genBars(th, start - (part - 1) * 4, 3, 4, keep.length ? keep[keep.length - 1].m : mid, 'a')); }
          this.cur = this.A2;
        } else this.cur = part === 2 ? genBars(th, start, 0, 4, this.A[this.A.length - 1].m, 'a') : this.A;
        this.inst = L.plan[part] === 2 ? L.alt : L.plan[part] ? L.inst : null;
        this.dbl = L.dbl && L.plan[part] === 1 ? L.dbl : null;
      }
      const rel = bar % 4;
      return this.inst ? this.cur.filter(n => (n.s >> 3) === rel) : null;
    }
    arrange(t, bar) {
      const th = this.th, b = this.beat, e8 = b / 2, ch = th.prog[bar % th.prog.length];
      const T8 = i => t + i * e8 + (i & 1 ? th.swing * e8 : 0);
      const T16 = i => t + i * b / 4 + ((i & 3) === 2 ? th.swing * e8 : 0);
      if (th.pad) for (const mm of voice(ch, th.pad.lo, th.pad.n)) this.note('pad', t, mm, b * 4 + 0.35, th.pad.vol);
      if (th.bass) {
        const pat = th.bass.pat[bar % th.bass.pat.length];
        for (let i = 0; i < 8; i++) {
          const cc = pat[i]; if (cc === '.') continue;
          let j = i + 1; while (j < 8 && pat[j] === '.') j++;
          const mm = ch.r + (th.bass.oct || 0) + (cc === '5' ? 7 : cc === 'f' ? -5 : cc === 'o' ? 12 : cc === '3' ? ch.iv[1] : 0);
          this.note(th.bass.inst, T8(i), mm, (j - i) * e8 * 0.92, th.bass.vol);
        }
      }
      if (th.stab) { const v = voice(ch, th.stab.lo, th.stab.n); for (const i of th.stab.pos) for (const mm of v) this.note(th.stab.inst, T8(i), mm, e8, th.stab.vol); }
      if (th.arp) {
        const a = th.arp, pat = a.pat[bar % a.pat.length], v = voice(ch, a.lo, 4), n = a.step === 16 ? 16 : 8;
        for (let i = 0; i < n; i++) {
          const cc = pat[i]; if (cc === '.' || cc === undefined) continue;
          const tt = n === 16 ? T16(i) : T8(i), mm = v[+cc % v.length];
          this.note(a.inst, tt, mm, e8, a.vol);
          if (a.echo) this.note(a.inst, tt + b * 0.75, mm, e8, a.vol * 0.3);
        }
      }
      const mel = th.lead && this.leadBar(bar);
      if (mel) for (const n of mel) {
        const tt = T8(n.s & 7), d = n.d * e8 * 0.9, sc = th._sc;
        if (th.lead.orn && n.d >= 2 && sc && Math.random() < th.lead.orn) {   // folk turn on a longer note: note, upper neighbour, note
          const up = sc[Math.min(sc.length - 1, sc.indexOf(n.m) + 1)], g = Math.min(0.055, d * 0.2);
          this.note(this.inst, tt, n.m, g, th.lead.vol); this.note(this.inst, tt + g, up, g, th.lead.vol * 0.85);
          this.note(this.inst, tt + 2 * g, n.m, d - 2 * g, th.lead.vol);
        } else this.note(this.inst, tt, n.m, d, th.lead.vol);
        if (this.dbl) this.note(this.dbl.inst, tt, n.m + this.dbl.oct, d, this.dbl.vol);
        if (th.lead.echo) this.note(this.inst, tt + b * 0.75, n.m, d, th.lead.vol * 0.28);
      }
      if (th.kit && bar >= (th.drumsIn || 0)) {
        for (const k in th.kit) {
          const [pat, v] = th.kit[k];
          for (let i = 0; i < 16; i++) { const cc = pat[i]; if (cc === 'x' || cc === 'o') this.drum(k, T16(i), cc === 'x' ? v : v * 0.55); }
        }
        if (th.crash && bar % 16 === 0 && bar > 0) this.drum('crash', t, th.crash);
      }
      if (th.fill && bar % 8 === 7) th.fill(this, t, bar, ch);
      if (th.extra) th.extra(this, t, bar, ch);
    }
  }

  let players = [], curP = null, pumpTimer = null;
  function pumpAll() {
    if (!ctx || document.hidden || pageAway) return;
    const now = ctx.currentTime;
    players = players.filter(p => {
      if (now > p.stopAt + 0.3) { try { p.out.disconnect(); } catch (e) { /* ignore */ } return false; }
      try { p.pump(now + 0.4); } catch (e) { console.warn('AUD music', e); }
      return true;
    });
    if (!players.length) { clearInterval(pumpTimer); pumpTimer = null; }
  }
  function startMusic(name) {
    if (!ctx || (curP && curP.name === name)) return;
    const now = ctx.currentTime;
    if (curP) curP.stop(now, 1.5);
    curP = null;
    if (name) {
      const p = new Player(M, name, now + 0.1), th = THEMES[name];
      p.fade(th.vol, now + 0.02, th.fadeIn || 1.4);
      players.push(p); curP = p;
      if (!pumpTimer) pumpTimer = setInterval(pumpAll, 50);
      pumpAll();
    }
  }

  // ───────────────────────── narrator ─────────────────────────
  const GAP = 0.3, vbufs = {}, vpend = {}, VQ = [];
  let vcur = null, vgap = null, ducked = false;
  const mp3 = key => (typeof window !== 'undefined' && window.VOICE_MP3 && window.VOICE_MP3[key]) || null;
  // Recorded length if known (sesler.js also writes VOICE_DUR), otherwise ~14 characters per second.
  function lineDur(key) {
    const d = window.VOICE_DUR && window.VOICE_DUR[key];
    if (d) return d;
    if (vbufs[key]) return vbufs[key].duration;
    const s = A.LINES[key] || '';
    return Math.max(0.9, 0.3 + s.length * 0.071);
  }
  function b64buf(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function decodeWith(c, s) {
    return new Promise(res => {
      let done = false; const fin = b => { if (!done) { done = true; res(b || null); } };
      try { const pr = c.decodeAudioData(b64buf(s), fin, () => fin(null)); if (pr && pr.catch) pr.catch(() => fin(null)); } catch (e) { fin(null); }
    });
  }
  function getBuf(key) {
    if (vbufs[key]) return Promise.resolve(vbufs[key]);
    if (vpend[key]) return vpend[key];
    const s = mp3(key);
    if (!s || !ctx) return Promise.resolve(null);
    return (vpend[key] = decodeWith(ctx, s).then(b => { delete vpend[key]; if (b) vbufs[key] = b; return b; }));
  }
  function sub(text) { try { if (typeof A.onSubtitle === 'function') A.onSubtitle(text); } catch (e) { console.error(e); } }
  function duck(on) {
    if (!M || ducked === on) return;
    ducked = on;
    const g = M.duck.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t); g.setTargetAtTime(on ? DUCK : 1, t, on ? 0.06 : 0.35);
  }
  function show(it) { A.current = it.key; if (it.sub) { it.shown = true; sub(it.text); } }   // current first: onSubtitle may read it
  function startLine(it) {
    vcur = it; clearTimeout(vgap); vgap = null;
    it.end = wallNow() + it.dur;
    const subOnly = () => { if (vcur !== it) return; show(it); it.end = wallNow() + it.dur; it.timer = setTimeout(() => endLine(it), it.dur * 1000); };
    if (ctx && unlocked && A.voiceOn && !document.hidden && !pageAway && mp3(it.key)) {
      getBuf(it.key).then(buf => {
        if (vcur !== it) return;
        if (!buf || document.hidden || pageAway) return subOnly();
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(M.voice); src.onended = () => endLine(it);
        src.start(ctx.currentTime + 0.02);
        it.src = src; it.dur = buf.duration; it.end = wallNow() + buf.duration;
        duck(true); show(it);
        it.timer = setTimeout(() => endLine(it), (buf.duration + 0.8) * 1000);   // in case onended never fires (suspended)
      });
    } else subOnly();
  }
  function endLine(it) {
    if (vcur !== it) return;
    clearTimeout(it.timer);
    if (it.shown) sub(null);
    vcur = null; A.current = null;
    const now = wallNow();
    for (let i = VQ.length - 1; i >= 0; i--) if (now + GAP - VQ[i].t > VQ[i].wait) VQ.splice(i, 1);   // stale
    if (VQ.length) vgap = setTimeout(nextLine, GAP * 1000);
    else duck(false);
  }
  function nextLine() {
    vgap = null;
    const now = wallNow();
    while (VQ.length) { const it = VQ.shift(); if (now - it.t <= it.wait) { startLine(it); return; } }
    duck(false);
  }
  function stopCur() {
    const it = vcur; if (!it) return;
    clearTimeout(it.timer);
    if (it.src) { it.src.onended = null; try { it.src.stop(); } catch (e) { /* ignore */ } }
    if (it.shown) sub(null);
    vcur = null; A.current = null;
  }
  function say(key, o) {
    o = o || {};
    const text = A.LINES[key];
    if (!text) { if (!warned['L' + key]) { warned['L' + key] = 1; console.warn('AUD.say: unknown line', key); } return 0; }
    const prio = o.prio ?? 1;
    const it = { key, text, prio, sub: o.sub !== false, dur: lineDur(key), t: wallNow(), wait: o.wait ?? 8 + 6 * prio };
    const busy = vcur || VQ.length || vgap;
    if (!busy) { startLine(it); return it.dur; }
    if (o.interrupt) { stopCur(); clearTimeout(vgap); vgap = null; startLine(it); return it.dur; }
    if (prio <= 0) return 0;
    if ((vcur && vcur.key === key) || VQ.some(q => q.key === key)) return 0;
    let i = VQ.findIndex(q => q.prio < prio); if (i < 0) i = VQ.length;
    VQ.splice(i, 0, it);
    while (VQ.length > 4) if (VQ.pop() === it) return 0;
    let w = vcur ? Math.max(0, vcur.end - wallNow()) : 0;
    for (let j = 0; j < i; j++) w += GAP + VQ[j].dur;
    return w + GAP + it.dur;
  }
  function prefetch() {
    const mix = M;
    if (mix && window.BILBO_BARK_MP3) decodeWith(ctx, window.BILBO_BARK_MP3).then(b => {
      if (b && mix === M) mix.bilboBark = b;
      else if (!b) console.warn('Bilbo havlama kaydı çözülemedi');
    });
    const keys = ['basla', 'devam', 'giris1', 'giris2', 'hos_geldin', 'baykus'];
    let k = 0;
    const go = () => { if (k < keys.length) getBuf(keys[k++]).then(() => setTimeout(go, 40)); };
    setTimeout(go, 200);
  }

  // ───────────────────────── public API ─────────────────────────
  // everRan: the context has played at least once. Only such a context can come back with a stale clock/line to reset —
  // the very first resume (iOS: on the release of the first touch) must keep the line that touch just started ('kahraman_sec').
  let listenersOn = false, waking = null, needsWake = false, pageAway = false, everRan = false;
  function resetMusic() {
    for (const p of players) { try { p.lfo.stop(); } catch (e) { /* already stopped */ } try { p.out.disconnect(); } catch (e) { /* already gone */ } }
    players = []; curP = null; clearInterval(pumpTimer); pumpTimer = null;
  }
  function awake(c) {
    if (c !== ctx || c.state !== 'running' || document.hidden || pageAway) return;
    waking = null; everRan = true;
    if (needsWake) {
      needsWake = false;
      // Timers and the audio clock may have advanced differently while the screen was locked. Start the current
      // theme at today's clock, and drop an old spoken line rather than leave its ducking gain stuck forever.
      A.stopVoice(); resetMusic();
      Object.keys(lastT).forEach(k => delete lastT[k]); active = 0; effectEpoch++;
      for (const k of Object.keys(streak)) { streak[k][0] = 0; streak[k][1] = -9; }
      ramp(M.sfx.gain, A.soundOn ? SFX_VOL : 0, 0.05);
      ramp(M.voice.gain, A.voiceOn ? VOICE_VOL : 0, 0.05);
      ramp(M.music.gain, musicLevel(), 0.05);
    }
    if (want && A.musicOn) startMusic(want);
  }
  function suspendAudio() {
    if (!ctx || ctx.state === 'closed') return;
    needsWake = true; waking = null;
    const c = ctx;
    try {
      const p = c.suspend();
      // A quick hide/show can finish suspend after resume. Reconcile that race once the promise settles.
      if (p && p.then) p.then(() => { if (c === ctx && !document.hidden && !pageAway) A.unlock(); }, () => {});
    } catch (e) { /* interrupted by the operating system */ }
  }
  A.unlock = function () {
    if (QUIET || document.hidden || pageAway) return false;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* not supported */ }
    if (ctx && ctx.state === 'closed') {
      A.stopVoice(); resetMusic(); ctx = M = null; unlocked = false; waking = null; needsWake = true;
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new AC(); } catch (e2) { return false; } }
      M = makeMix(ctx);
      const c = ctx;
      c.onstatechange = () => {
        if (c !== ctx) return;
        if (c.state === 'running') awake(c);
        else if (everRan) needsWake = true;   // the next real gesture retries even if an earlier resume is still pending
      };
    }
    if (!unlocked) {
      try { const s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination); s.start(0); } catch (e) { /* ignore */ }
      unlocked = true;
      prefetch();
    }
    if (!listenersOn) {
      listenersOn = true;
      // Safari can require the *release* gesture after a screen lock. Keep these listeners after first unlock:
      // the UI's initial unlock listeners are intentionally removed as soon as sound first works.
      for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) addEventListener(ev, () => A.unlock(), true);
      document.addEventListener('visibilitychange', () => { if (document.hidden) suspendAudio(); else A.unlock(); });
      addEventListener('pagehide', () => { pageAway = true; suspendAudio(); });
      addEventListener('pageshow', () => { pageAway = false; A.unlock(); });
      addEventListener('focus', () => A.unlock());
    }
    if (ctx.state === 'running') awake(ctx);
    else {
      if (everRan) needsWake = true;
      const c = ctx;
      // Do not gate retries on a pending promise: iOS may leave resume() unresolved until a later touchend.
      try {
        const p = waking = c.resume();
        if (p && p.then) p.then(() => { if (c === ctx) awake(c); }, () => { if (waking === p) waking = null; });
      } catch (e) { waking = null; }
    }
    return true;
  };
  A.sfx = sfx;
  A.setListener = (x, z) => { lx = x; lz = z; };
  A.music = function (name) {
    if (name && !THEMES[name]) { console.warn('AUD.music: unknown theme', name); return; }
    want = name || null; A.theme = want;
    if (ctx && unlocked && A.musicOn) startMusic(want);
  };
  function ramp(g, v, tc) { const t = ctx.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(v, t, tc); }
  A.setMusic = function (on) {
    A.musicOn = !!on;
    if (on && unlocked) A.unlock();
    if (!ctx) return;
    if (A.musicOn) { ramp(M.music.gain, musicLevel(), 0.05); startMusic(want); }   // the bus may have been built at 0 (saved "off")
    else { if (curP) curP.stop(ctx.currentTime, 0.6); curP = null; }
  };
  // Sound effects only; the narrator keeps talking (see voiceOn).
  A.setSound = function (on) {
    A.soundOn = !!on;
    if (on && unlocked) A.unlock();
    if (M) ramp(M.sfx.gain, A.soundOn ? SFX_VOL : 0, 0.05);
  };
  // Narrator voice (parent/debug only; subtitles keep running when off).
  A.setVoice = function (on) {
    A.voiceOn = !!on;
    if (on && unlocked) A.unlock();
    if (M) ramp(M.voice.gain, A.voiceOn ? VOICE_VOL : 0, 0.05);
  };
  // Pause / wardrobe: music dips to ~35% and comes back on resume. Only a flag while silent or before unlock.
  A.dim = function (on) {
    dimmed = !!on;
    if (!on && unlocked) A.unlock();
    if (M && A.musicOn) ramp(M.music.gain, musicLevel(), 0.25);
  };
  A.say = say;
  A.speaking = () => !!vcur || VQ.length > 0;
  A.stopVoice = function () { VQ.length = 0; clearTimeout(vgap); vgap = null; stopCur(); duck(false); };
  A.estimate = key => (A.LINES[key] ? lineDur(key) : 0);
  A.ready = () => !!(ctx && unlocked && ctx.state === 'running');

  // Test hooks: render into an OfflineAudioContext (never audible) to prove graphs build and measure levels.
  A._test = {
    sfxNames: Object.keys(SFX), themes: Object.keys(THEMES), svol: SVOL, THEMES,
    render(fn, secs = 2, sr = 44100, raw = false) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const c = new OC(2, Math.ceil(secs * sr), sr), m = makeMix(c, true, raw);
      fn(m, c);
      return c.startRendering();
    },
    sfx(name, secs = 2.2, o = {}) { return this.render(m => {if(o.bark)m.bilboBark=o.bark;playRecipe(m, name, { g: o.vol ?? (SVOL[name] ?? 1), p: o.pitch || 1, pan: o.pan || 0 }, 0.02);}, secs, 44100, o.raw); },
    prim: { T, N, B },
    music(name, secs = 12) {
      return this.render(m => { const p = new Player(m, name, 0.05); p.fade(THEMES[name].vol, 0, 0.05); p.pump(secs); }, secs);
    },
    stress(secs = 3, theme = 'boss') {
      return this.render(m => {
        const p = new Player(m, theme, 0.05); p.fade(THEMES[theme].vol, 0, 0.05); p.pump(secs);
        for (let r = 0; r < 3; r++) for (const n of Object.keys(SFX)) playRecipe(m, n, { g: SVOL[n] ?? 1, p: semi(rnd(-0.5, 0.5)), pan: rnd(-0.6, 0.6) }, 0.1 + r * 0.05 + rnd(0, 0.02));
      }, secs);
    },
    scene(secs, events, bark, theme = 'boss', raw = false) {
      return this.render(m => {
        if(bark)m.bilboBark=bark;
        const p=new Player(m,theme,.05);p.fade(THEMES[theme].vol,0,.05);p.pump(secs);
        for(const e of events.slice().sort((a,b)=>a.at-b.at)) playRecipe(m,e.name,{g:e.vol??(SVOL[e.name]??1),p:e.pitch??1,pan:e.pan??0},Math.max(.02,e.at));
      },secs,44100,raw);
    },
    decode(key) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, s = mp3(key);
      return s ? decodeWith(new OC(1, 44100, 44100), s) : Promise.resolve(null);
    },
    score(name, bars = 32) {   // generated lead line per bar (for reading, not playing)
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, p = new Player(makeMix(new OC(1, 128, 44100), true), name, 0), out = [];
      for (let b = 0; b < bars; b++) { const n = p.leadBar(b); out.push({ bar: b, ch: p.th.prog[b % p.th.prog.length], inst: p.inst, notes: n || [] }); }
      return out;
    },
    // Drive the real-time paths (unlock state, scheduler, crossfades, voice buffers, ducking) with an inaudible
    // OfflineAudioContext: attach(c) before c.startRendering(), call pump() at each c.suspend() step, detach() after.
    attach(c) { this._saved = [ctx, M, unlocked]; ctx = c; M = makeMix(c, true); unlocked = true; Object.keys(vbufs).forEach(k => delete vbufs[k]); return M; },
    detach() { players.forEach(p => { try { p.out.disconnect(); } catch (e) { /* ignore */ } }); players = []; curP = null; clearInterval(pumpTimer); pumpTimer = null; A.stopVoice(); [ctx, M, unlocked] = this._saved; },
    pump: () => pumpAll(),
    spatial: (x, z) => spatial(x, z),
    lineDur, state: () => ({ ctx: !!ctx, unlocked, dimmed, queue: VQ.map(q => q.key), cur: vcur && vcur.key, players: players.length }),
  };
  return A;
})();

AUD.LINES = /*SESLER*/{
  "giris1": "Merhamet bu topraklardan çekildiğinde iblisler masumları yok etti. Feza kendi lanetini silah yapan bir iblis avcısı. Demir dişli Bilbo yanında. Bu savaşta temiz eller yok.",
  "kahraman_sec": "İblis Avcısı, Ruh Biçen ya da Lanet Şövalyesi. Karanlığı hangi silahla avlayacaksın?",
  "seviye_buyu": "Mührün derinleşti. Asan artık karanlığı daha sert yarıyor.",
  "giris_hibrit": "Lanet Şövalyesi. Bir elinde yemin kılıcı, diğerinde kül asası. Karanlığa kendi karanlığınla saldır. Demir dişli Bilbo savaşı üzerine çeksin.",
  "seviye_hibrit": "Kılıcın ve asan, lanetten bir parça emdi.",
  "hibrit1": "Celladın Hilali hazır. Kılıcından kopan keskin gölge, önündeki düşmanları yaracak.",
  "hibrit2": "Pranga açıldı. Dönen kılıç mühürleri yaklaşan yaratıkları parçalasın.",
  "hibrit3": "Merhametsiz Mühür hazır. Kılıç ve asayı birleştir, lanet dalgasını serbest bırak.",
  "giris_buyu": "Ruh Biçen, kendi lanetini kül asana akıt. Uzaktan saldır, parmağını sürükleyerek ilerle. Bilbo ön safta düşmanlarını parçalayacak.",
  "degnek": "Unutulmuş bir kül asası. Eski sahibinin yemini hâlâ üzerinde.",
  "buyu1": "Ruh Mızrakları hazır. Mor mühre dokun, üç karanlık mızrak gönder.",
  "buyu2": "Mezar Ayazı açıldı. Mavi mühür düşmanları dondurur, buzdan zırh seni korur.",
  "buyu3": "Azap Tarlası hazır. Son mühre dokun, tutsak ruhlar çevrendeki düşmanları kuşatsın.",
  "giris2": "İblisleri yemin kılıcınla indir. Parmağını sürükleyerek ilerle. Bilbo, demir dişleri ve ağır zırhıyla düşmanın önünü kesecek.",
  "yolculuk": "Yas Ormanı, Çürüme Vadisi, Fısıltı Madenleri, Kül Ocağı ve Veba Şehri. Merhametsiz Kaleye ulaşmak için hepsinden geçmelisin.",
  "baykus": "Ben bu ormanın son tanığıyım. Patikayı izle. Gölgelere güvenme. Kan iksirini, gerçekten ihtiyacın olana kadar sakla.",
  "orman": "Yas Ormanı. Ağaçlar burada ölülerin adını fısıldar. Köklerin arasında bir şey uyanıyor.",
  "kefir": "Çürüme Vadisi. Toprak hastalığı geri kusuyor. Veba Rahibi kaleye giden yolu zehirlemiş.",
  "ilk_yogurt": "Çürümüş bedenler çamurdan doğruluyor.",
  "ilk_kaymak": "Solgun sürüngenler yaklaşıyor. İzlerine basma.",
  "ilk_kopuk": "Zehir keseleri havada. Çemberin dışında kal.",
  "magara": "Fısıltı Madenleri. Duvarın içinden kendi sesini duyarsan cevap verme. Mezar Kazıcısı aşağıda bekliyor.",
  "ilk_kostebek": "Mezar bekçileri toprağı yarıyor. Çıktıkları yere dikkat et.",
  "ilk_salyangoz": "Kemik taşıyıcılar zehir püskürtüyor. Geri çekil.",
  "yanardag": "Kül Ocağı. Toprağın damarları burada açık. Yoldan ayrılanı köz yutar.",
  "ilk_kaplumbaga": "Köz taşıyıcılar geliyor. Kabukları hâlâ yanıyor.",
  "ilk_ateskusu": "Kül kuzgunları tepende. Düşen kıvılcımlardan uzak dur.",
  "sehir": "Veba Şehri. Kapılar içeriden mühürlenmiş. Sokaklarda dolaşanlar artık insan değil.",
  "ilk_nobetci": "Yeminini unutmuş muhafızlar yolu kapatıyor.",
  "ilk_simitci": "Kemik fırlatıcılar saldırıyor. Menzillerinden çık.",
  "ilk_supurgeci": "Kül toplayıcılar mezar tozunu savuruyor.",
  "ilk_tellal": "Ölüm tellalının davulu. Vuruşu duyunca çemberden çık.",
  "kale": "Merhametsiz Kale. Gece Yutan son mührün ardında. Burada karanlık nefes alıyor.",
  "yetenek_yildiz": "Son Hüküm açıldı. İlk mühre dokun, uzak düşmana keskin bir ruh parçası gönder.",
  "yetenek_kasirga": "İnfaz Çemberi açıldı. Dönerken çevrendeki düşmanları biç.",
  "yetenek_meteor": "Kül Yağmuru açıldı. Son mühre dokun, gökten yanan parçalar indir.",
  "seviye1": "Bir yemin daha güçlendi.",
  "seviye2": "Karanlığa biraz daha dayanabilirsin.",
  "seviye3": "Kılıcın artık daha derin kesiyor.",
  "kilic": "Yeni bir yemin kılıcı. Demiri hâlâ sıcak.",
  "sapka": "Bir savaş miğferi. Önceki sahibinden geriye yalnızca bu kaldı.",
  "pelerin": "Kül örtüsü. Soğuğu ve fısıltıları üzerinde taşıyor.",
  "efsane": "Eski bir kutsal emanet. Lanet bile onu tüketememiş.",
  "sandik": "Mühürlü bir sandık. İçindeki emaneti al ve ilerle.",
  "can_az": "Kan kaybediyorsun. Kan iksirini kullan.",
  "iksir_yok": "İksir kalmadı. Yaşam parçalarını topla.",
  "yoruldu": "Karanlık seni yere serdi. Yemin taşı, seni yeniden çağırıyor.",
  "nese_tasi": "Yemin taşı uyandı. Düşersen yolculuğun buradan sürer.",
  "kapi": "Lanet kapısı açıldı. Diğer tarafta seni bekliyorlar.",
  "kocaman": "Bir karanlık efendisi yaklaşıyor. Hazırlan.",
  "kraljole_giris": "Çürük Taç. Yere çökmeden önce sıçrayışından uzaklaş.",
  "kraljole_tac": "Taç bedeninden ayrıldı. Onu ele geçir, efendisini savunmasız bırak.",
  "kraljole_saskin": "Taç mührü kırıldı. Şimdi saldır.",
  "kraljole_bitti": "Çürük Taç dağıldı. Çürüme Vadisine giden kapı açıldı.",
  "kefirdev_giris": "Veba Rahibi. İçindeki hastalık taşmadan önce geri çekil.",
  "kefirdev_balon": "Dev bir zehir kesesi geliyor. Vur ve parçala.",
  "kefirdev_hik": "Zehir kesesi parçalandı. Rahibin ayini kesildi. Şimdi saldır.",
  "kefirdev_bitti": "Veba Rahibi sustu. Vadideki çürüme geri çekiliyor.",
  "kefir_ikram": "Rahibin elinden bir yaşam özü düştü. Yol uzun, onu al.",
  "kefirdev_yol": "Rahibin son sözü kaleydi. Oraya ulaşmanın yolu Fısıltı Madenlerinin altından geçiyor.",
  "usta_giris": "Mezar Kazıcısı. Topraktan çıktığı anda saldır.",
  "usta_saklambac": "Kazıcı toprağın altına çekildi. İşaretli mezara git. Başını çıkarınca vur.",
  "usta_yakaladin": "Kazıcının mührü çatladı. Bir darbe daha.",
  "usta_bitti": "Mezar Kazıcısı gömüldü. Kül Ocağına giden geçit açıldı.",
  "kaplumbaga_giris": "Kül Muhafızı. Yerdeki yanan çemberlerin dışında kal.",
  "kaplumbaga_tas": "Mezar taşları yükseldi. Muhafız yuvarlanınca taşın arkasına çekil.",
  "kaplumbaga_devrildi": "Muhafız taşa çarptı. Zırhının altı açık. Şimdi saldır.",
  "kaplumbaga_bitti": "Kül Muhafızının ateşi söndü. Veba Şehrinin kapısı açıldı.",
  "sovalye_giris": "Yeminbozan. Lanetli bineği atılmadan önce saldırı yolundan çık.",
  "sovalye_sancak": "Lanet sancaklarını yık. Son sancak düşünce zırhı açılacak.",
  "sovalye_havuc": "Bir lanet yemi düştü. Onu al ve yaklaşan bineğin önüne bırak.",
  "sovalye_atdoydu": "Binek lanet yemine kapıldı. Yeminbozan savunmasız. Şimdi saldır.",
  "sovalye_bitti": "Yeminbozanın son sözü de sustu. Merhametsiz Kaleye giden yol açık.",
  "ejderha_giris": "Gece Yutan. Merhameti yutup bu toprakları lanetledi. Şimdi karanlığın kaynağıyla yüzleş.",
  "ejderha_yarim": "Gece Yutanın zırhı çatlıyor. Geri çekilme.",
  "ejderha_yumurta": "Lanet yumurtaları bıraktı. Yaklaşırsan içlerinden gölge yavruları çıkar.",
  "ejderha_kalp": "Tutsak ruhlar dağıldı. Hepsini topla, laneti ona geri çevir.",
  "ejderha_sevgi": "Ruh mührü tamamlandı. Gece Yutan kendi karanlığıyla vuruldu.",
  "ejderha_bitti": "Gece Yutan çöktü. Ama kale hâlâ nefes alıyor. Son mührü kır.",
  "kristal": "Lanetin çekirdeği. Ona dokun ve karanlığın son bağını kopar.",
  "son": "Lanet kırıldı. Feza avladığı iblislerin karanlığını yanında taşıdı. Bilbonun dişlerinde savaşın izi kaldı. Kurtardıkları onları kahraman diye anmadı. Ama bir sonraki geceyi gördüler.",
  "tekrar": "Kale seni yeniden çağırıyor. Bu kez fısıltılar adını biliyor.",
  "hos_geldin": "Yemin taşı seni hatırladı. Karanlık yolculuk kaldığı yerden sürüyor.",
  "canta": "Taşıdığın emanetleri kontrol et. Bu yolda zırhına güveneceksin.",
  "ovgu1": "Bir gölge daha dağıldı.",
  "ovgu2": "Bu savaş bitene kadar yemin ayakta.",
  "ovgu3": "Kılıcın durmadı.",
  "ovgu4": "Karanlık geri çekiliyor.",
  "ovgu5": "Nefesini koru.",
  "ovgu6": "Yol henüz bitmedi.",
  "basla": "Yola Çık düğmesine dokun. Merhametsiz Kale bekliyor.",
  "devam": "Devam et düğmesine dokun. Yemin henüz tamamlanmadı.",
  "tuccar_merhaba": "Kül Tüccarı. Topladığın lanet sikkeleri karşılığında sana birkaç emanet verecek.",
  "tuccar_iksir": "Kan iksiri çantanda. Gücün tükenirken kullan.",
  "tuccar_bulut": "Mezar Örtüsü bu geçitte seni biraz daha koruyacak.",
  "tuccar_parilti": "Silahına kara mühür kazındı. Artık daha sert vuracak.",
  "tuvalet": "Paslı Hamam. Taşların altında bir lanet kaynıyor. Demir dişli Bilbo yanında; mühürleri parçala ve kapıyı aç.",
  "ay": "Kül Ayı. Sessiz kraterlerden yaratıklar yükseliyor. Gölgeden gelen darbeleri izle; burada merhamet yok.",
  "kopukusta_giris": "Köpük Celladı yolu tutuyor. Lanetli köpüklerini aş, yere bıraktığı mühürleri topla ve savunmasını kır.",
  "kopukusta_bitti": "Köpük Celladı kül oldu. Kül roketi hazır. Bilbo ile Kül Ayı geçidine ilerle.",
  "roket_yolculuk": "Demir dişli Bilbo yanında. Kül roketi Paslı Hamam’dan ayrılıyor; Kül Ayı’na yükseliyoruz.",
  "aytavsan_giris": "Ay Yırtıcısı kraterden çıkıyor. Üç yıldız mührünü ele geçir; gücü kırıldığında saldır.",
  "aytavsan_bitti": "Ay Yırtıcısı çöktü. Yıldız mekiği seni Yas Ormanı’na taşıyacak.",
  "mekik_yolculuk": "Yıldız mekiği Kül Ayı’ndan ayrılıyor. Aşağıda Yas Ormanı var. Av burada devam edecek.",
  "sabun_oyun": "Üç lanet mührünü topla. Köpük Celladı’nın savunması kırılacak.",
  "ay_oyun": "Üç yıldız mührünü ele geçir. Ay Yırtıcısı’nın savunmasını parçala.",
  "hayal_oyun_bitti": "Mühürler toplandı. Yaratığın gücü kırıldı. Şimdi saldır.",
  "ilk_kakacik": "Çamur Hortlağı. Yavaş görünür; yaklaşınca sert vurur.",
  "ilk_cisdamlasi": "Zehir Damlası uzaktan saldırır. Atışından yana kaç.",
  "ilk_sabunkopugu": "Lanet Köpüğü havada süzülüyor. Dağılmadan önce silahını göster.",
  "ilk_ayponpon": "Ay Avcısı üstüne sıçrar. Kırmızı işareti görünce yana çekil.",
  "ilk_yildizcik": "Sönmüş Yıldız uzağından vurur. Açısını boz ve saldır.",
  "ilk_kratercik": "Krater Pusucusu toprağın içinden yükselir. Çıkacağı noktadan uzaklaş.",
  "bilbo_kemik": "Bilbo’ya kemik at. Demir dişleri yakındaki yaratıklara karanlık lokmalar savuracak."
}/*SESLER-SON*/;
