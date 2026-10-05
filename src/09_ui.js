/* ── Arayüz (UI): HUD, menüler, dokunmatik/klavye girişi, mini harita, kamera, ana döngü ve boot() ──
   Bütün DOM burada JS ile kurulur (stiller: src/ui.css). Genel adlar: UI, boot. Sözleşme: src/SPEC.md → "UI". */
const UI = (() => {
  'use strict';

  const PREF_KEY = 'fezaBilboMerhamet.ayar.v1';
  const SLOTS = ['weapon', 'hat', 'cape'];
  const SLOT_AD = { weapon: 'İnfaz Kılıçları', hat: 'Miğferler', cape: 'Kefenler' };
  const SLOT_EMO = { weapon: '⚔', hat: '♜', cape: '⛓' };
  const BLADE_DEF = '#ba795e';   // forged copper fallback
  const BASE_EMO = { migfer: '♜', sihirbaz: '☠', kovboy: '♜', korsan: '☠', tac: '♜',
    sovalyemigfer: '♜', sovalyesihir: '⛓' };
  const RAR = ['#f4f4f4', '#5aa8ff', '#ffd23f', '#ff8a1c'];
  const RAR_AD = ['Sıradan', 'Sihirli', 'Nadir', 'Efsane'];
  // Skill buttons around the attack button: [radius, angle°] (0° = left of it, 90° = above). Up to 3 sit on the inner arc
  // (the game has 3 skills); more would spill onto an outer arc.
  const ARC = [[142, 45], [142, 0], [142, 90], [238, 45], [238, 14], [238, 76]];
  const MAP_VIEW = 22, MAP_REVEAL = 11;   // minimap: metres from centre to rim; fog reveal radius
  const SAVE_KEY = 'fezaBilboMerhamet.save.v1';   // same key as GAME's (only manual saves: Mola › Kaydet)

  // ── Modules (resolved at boot; any may be missing in tests). typeof on a module that threw at load → TDZ error. ──
  const M = {};
  function resolve() {
    const get = f => { try { return f(); } catch (e) { return null; } };
    M.GAME = get(() => (typeof GAME !== 'undefined' ? GAME : null));
    M.AUD = get(() => (typeof AUD !== 'undefined' ? AUD : null));
    M.FX = get(() => (typeof FX !== 'undefined' ? FX : null));
    M.TEX = get(() => (typeof TEX !== 'undefined' ? TEX : null));
    M.LEVEL = get(() => (typeof LEVEL !== 'undefined' ? LEVEL : null));
    M.ITEMS = get(() => (typeof ITEMS !== 'undefined' ? ITEMS : null));
    M.FEZA = get(() => (typeof FEZA !== 'undefined' ? FEZA : null));
    M.ZONES = get(() => (typeof ZONES !== 'undefined' ? ZONES : null));
    M.SKILLS = get(() => (typeof SKILLS !== 'undefined' ? SKILLS : null));
    M.EMODEL = get(() => (typeof EMODEL !== 'undefined' ? EMODEL : null));
    M.EDEF = get(() => (typeof EDEF !== 'undefined' ? EDEF : null));
  }
  const zoneCount = () => (M.ZONES && M.ZONES.length) || 8;
  const warned = {};
  function warn(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[UI] ' + k, e); } }
  function safe(k, f) { try { return f(); } catch (e) { warn(k, e); return undefined; } }
  function aud(fn, a, b) { const A = M.AUD; if (A && typeof A[fn] === 'function') return safe('AUD.' + fn, () => A[fn](a, b)); return undefined; }
  const sfx = (n, o) => { if (!SILENT) aud('sfx', n, o); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ol = (t, cls = '') => `<span class="u-ol ${cls}"><b aria-hidden="true">${esc(t)}</b><i>${esc(t)}</i></span>`;
  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function shade(hex, k) {   // k < 0 darker (toward deep purple), k > 0 lighter
    const c = new THREE.Color(hex), t = k < 0 ? new THREE.Color('#1a0840') : new THREE.Color('#ffffff');
    return '#' + c.lerp(t, Math.abs(k)).getHexString();
  }

  // ── SVG icons ──
  const SVG = {
    play: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M7 4.2v15.6a1.2 1.2 0 0 0 1.8 1l12.4-7.8a1.2 1.2 0 0 0 0-2L8.8 3.2A1.2 1.2 0 0 0 7 4.2z"/></svg>',
    cont: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M2.5 5.2v13.6a1 1 0 0 0 1.6.8L12 13.7v5.1a1 1 0 0 0 1.6.8l8.6-6.8a1 1 0 0 0 0-1.6l-8.6-6.8a1 1 0 0 0-1.6.8v5.1L4.1 4.4a1 1 0 0 0-1.6.8z"/></svg>',
    pause: '<svg class="u-svg" viewBox="0 0 24 24"><rect x="5" y="4" width="5" height="16" rx="2"/><rect x="14" y="4" width="5" height="16" rx="2"/></svg>',
    note: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M9.5 17.8a3.3 3.3 0 1 1-2.2-3.1V5.6c0-.6.4-1.1 1-1.2l10-2.2c.8-.2 1.5.4 1.5 1.2v11.8a3.3 3.3 0 1 1-2.2-3.1V7.2l-8.1 1.8z"/></svg>',
    sound: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M3 9.2c0-.6.5-1.1 1.1-1.1h3.3l4.8-4.2c.7-.6 1.8-.1 1.8.8v14.6c0 .9-1.1 1.4-1.8.8l-4.8-4.2H4.1c-.6 0-1.1-.5-1.1-1.1z"/><path d="M16.3 8.4a5 5 0 0 1 0 7.2M18.8 5.8a8.6 8.6 0 0 1 0 12.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>',
    again: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M12 4.5a7.5 7.5 0 1 1-7.1 5.1" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/><path d="M12 1l4.5 3.6L12 8.2z"/></svg>',
    save: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M4.2 2.5h12.3l5 5v12.8a1.2 1.2 0 0 1-1.2 1.2H4.2A1.2 1.2 0 0 1 3 20.3V3.7a1.2 1.2 0 0 1 1.2-1.2z"/><rect x="7" y="4.2" width="8.6" height="5" rx="0.9" fill="#2266d0"/><rect x="6.4" y="12.6" width="11.2" height="7" rx="1.1" fill="#2266d0"/></svg>',
    check: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="4.2" stroke-linecap="round"/></svg>',
    check: '<svg class="u-svg" viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // Lightsaber (attack button): chrome hilt + glowing blade. The blade colour is the CSS variable --blade (set from
    // ITEMS.bladeColor of the equipped saber); .u-blade can be scaled to 0 (retracted while Feza sleeps) and re-ignited.
    sword: `<svg viewBox="0 0 100 100"><defs><linearGradient id="ironBlade"><stop stop-color="#555966"/><stop offset=".5" stop-color="#dbd8c4"/><stop offset="1" stop-color="#727783"/></linearGradient></defs><g transform="rotate(35 50 50)"><g class="u-blade"><path d="M47 63 Q20 37 40 5 L48 23 L64 7 Q72 42 54 63Z" fill="url(#ironBlade)" stroke="#262936" stroke-width="3"/><path d="M46 55 Q47 39 46 26" fill="none" stroke="#a84646" stroke-width="3"/></g><path d="M31 63H68L63 70H37Z" fill="#9d8065" stroke="#2d2630" stroke-width="3"/><path d="M46 70H54V91H46Z" fill="#3e3037"/><path d="M47 76H53M47 81H53M47 86H53" stroke="#8f6c58" stroke-width="2"/><path d="M44 91L50 97L56 91Z" fill="#ae775c"/></g></svg>`,
    // tiny saber for labels / thumbnail fallbacks (no filter: cheap to repeat)
    saber: '<svg class="u-emsvg" viewBox="0 0 100 100"><g transform="rotate(40 50 50)"><path d="M45 64 L40 18 L56 5 L61 19 L55 64Z" fill="#c2c7bf" stroke="#343840" stroke-width="4"/><path d="M49 58L50 22" stroke="#8f333b" stroke-width="3"/><path d="M31 65L69 65L65 71L35 71Z" fill="#92826a"/><path d="M46 70H54V91H46Z" fill="#493e3e"/><circle cx="50" cy="91" r="5" fill="#a7765c"/></g></svg>',
    potion: `<svg viewBox="0 0 100 100"><defs>
      <linearGradient id="uiPoL" x2=".8" y2="1"><stop stop-color="#aa3b3a"/><stop offset=".55" stop-color="#742628"/><stop offset="1" stop-color="#321719"/></linearGradient>
      <clipPath id="uiPoC"><path d="M35 35H65L78 51L73 86L62 94H38L27 86L22 51Z"/></clipPath></defs>
      <path d="M39 8H61L58 23H42Z" fill="#625149" stroke="#292626" stroke-width="3"/>
      <path d="M40 23H60V34L78 51L73 86L62 94H38L27 86L22 51L40 34Z" fill="#938b7e" fill-opacity=".4" stroke="#c5baa4" stroke-width="3.5"/>
      <g clip-path="url(#uiPoC)"><path d="M18 55L39 59L60 53L82 56V100H18Z" fill="url(#uiPoL)"/><path d="M24 56L39 59L60 53L77 56" fill="none" stroke="#c17b67" stroke-width="2"/></g>
      <path d="M36 30H64V36H36Z" fill="#876b50" stroke="#332f2c" stroke-width="2"/>
      <path d="M50 59L43 73L50 81L57 73Z" fill="#d0c5ad" stroke="#3c2527" stroke-width="2"/>
      <path d="M32 47L29 62L33 82" fill="none" stroke="#c9c2ac" stroke-opacity=".5" stroke-width="3"/></svg>`,
    // Friendly purple dragon head (stand-in until the portrait of the real boss model is rendered, see bossPortrait).
    // Flat fills only (no gradient ids): several copies can be on the page at once. The pastel disc behind it is CSS (.u-dimg).
    dragon: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g stroke="#3a1d66" stroke-width="2.6" stroke-linejoin="round">' +
      '<path d="M34 31C29 22 28 14 31 8C36 14 41 21 44 28Z" fill="#f6dfae"/><path d="M66 31C71 22 72 14 69 8C64 14 59 21 56 28Z" fill="#f6dfae"/>' +
      '<path d="M22 46C12 43 7 35 8 27C16 30 23 35 28 41Z" fill="#f47cc6"/><path d="M78 46C88 43 93 35 92 27C84 30 77 35 72 41Z" fill="#f47cc6"/>' +
      '<path d="M44 25C45 17 55 17 56 25Z" fill="#f47cc6"/>' +
      '<ellipse cx="50" cy="50" rx="31" ry="27.5" fill="#8d5ad9"/><ellipse cx="50" cy="68" rx="22" ry="14.5" fill="#c7a6f4"/></g>' +
      '<ellipse cx="39" cy="34" rx="12" ry="5.5" fill="#fff" opacity=".3" transform="rotate(-18 39 34)"/>' +
      '<ellipse cx="43.5" cy="63" rx="2.3" ry="1.5" fill="#3a1a5a"/><ellipse cx="56.5" cy="63" rx="2.3" ry="1.5" fill="#3a1a5a"/>' +
      '<path d="M39 69.5Q50 82 61 69.5Q50 73 39 69.5Z" fill="#5c1733" stroke="#3a1250" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M45 75.2Q50 79 55 75.2Q50 73.6 45 75.2Z" fill="#ff7aa0"/>' +
      '<rect x="46.2" y="70.6" width="3.4" height="3.2" rx="1" fill="#fffaf0"/><rect x="50.4" y="70.6" width="3.4" height="3.2" rx="1" fill="#fffaf0"/>' +
      '<g stroke="#3a1d66" stroke-width="2"><ellipse cx="37.5" cy="47" rx="8.4" ry="9.8" fill="#fff"/><ellipse cx="62.5" cy="47" rx="8.4" ry="9.8" fill="#fff"/></g>' +
      '<circle cx="38.5" cy="49" r="5.8" fill="#b8661e"/><circle cx="61.5" cy="49" r="5.8" fill="#b8661e"/>' +
      '<circle cx="38.5" cy="49.6" r="3.1" fill="#2a1030"/><circle cx="61.5" cy="49.6" r="3.1" fill="#2a1030"/>' +
      '<circle cx="36.2" cy="45.7" r="2.3" fill="#fff"/><circle cx="59.2" cy="45.7" r="2.3" fill="#fff"/>' +
      '<ellipse cx="25.5" cy="60" rx="5.8" ry="3.3" fill="#ff6fb0" opacity=".55"/><ellipse cx="74.5" cy="60" rx="5.8" ry="3.3" fill="#ff6fb0" opacity=".55"/></svg>',
    // Stand-ins for the other bosses (same flat style, same use as SVG.dragon): Çürük Taç — a big jelly with a golden crown
    kraljole: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g stroke="#0c4a6a" stroke-width="2.6" stroke-linejoin="round">' +
      '<path d="M16 60C10 72 9 84 12 92H30Z" fill="#8a4ad8"/><path d="M84 60C90 72 91 84 88 92H70Z" fill="#8a4ad8"/>' +
      '<path d="M14 82C12 56 28 35 50 35C72 35 88 56 86 82C86 88 80 90 74 88C66 92 34 92 26 88C20 90 14 88 14 82Z" fill="#3fd0de"/>' +
      '<path d="M31 39L32 18L42 28L50 12L58 28L68 18L69 39Z" fill="#ffd23f"/><rect x="29" y="35" width="42" height="8.5" rx="3" fill="#ffb81c"/>' +
      '<circle cx="32" cy="17.5" r="2.6" fill="#fff3a0" stroke-width="1.8"/><circle cx="50" cy="11.5" r="2.8" fill="#fff3a0" stroke-width="1.8"/><circle cx="68" cy="17.5" r="2.6" fill="#fff3a0" stroke-width="1.8"/></g>' +
      '<circle cx="50" cy="39.2" r="2.9" fill="#ff5f9e"/><circle cx="38.5" cy="39.4" r="2.1" fill="#7be23a"/><circle cx="61.5" cy="39.4" r="2.1" fill="#7be23a"/>' +
      '<ellipse cx="50" cy="78" rx="25" ry="9" fill="#b8f6f0" opacity=".6"/>' +
      '<ellipse cx="28" cy="57" rx="4.6" ry="9" fill="#fff" opacity=".55" transform="rotate(22 28 57)"/><circle cx="32" cy="47" r="2.2" fill="#fff" opacity=".65"/>' +
      '<g stroke="#0c4a6a" stroke-width="2"><ellipse cx="39" cy="60" rx="7.6" ry="8.8" fill="#fff"/><ellipse cx="61" cy="60" rx="7.6" ry="8.8" fill="#fff"/></g>' +
      '<circle cx="40" cy="62" r="5" fill="#1a2a4a"/><circle cx="60" cy="62" r="5" fill="#1a2a4a"/>' +
      '<circle cx="38" cy="59.2" r="2.1" fill="#fff"/><circle cx="58" cy="59.2" r="2.1" fill="#fff"/>' +
      '<path d="M41 72Q50 83.5 59 72Q50 75 41 72Z" fill="#6a1a3a" stroke="#0c4a6a" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M45.6 77.2Q50 80.4 54.4 77.2Q50 75.6 45.6 77.2Z" fill="#ff7aa0"/>' +
      '<ellipse cx="27" cy="70" rx="5.6" ry="3.2" fill="#ff6fb0" opacity=".6"/><ellipse cx="73" cy="70" rx="5.6" ry="3.2" fill="#ff6fb0" opacity=".6"/></svg>',
    // Mezar Kazıcısı — mole with a yellow hard hat and a headlamp
    kostebekusta: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g stroke="#4a2a18" stroke-width="2.6" stroke-linejoin="round">' +
      '<ellipse cx="50" cy="62" rx="31" ry="27" fill="#9a6b50"/><ellipse cx="50" cy="74" rx="17.5" ry="11.5" fill="#f0cfb2"/>' +
      '<path d="M43 24L50 4.5L57 24Z" fill="#d6deec"/>' +
      '<path d="M20 48C20 31 33 21 50 21C67 21 80 31 80 48Z" fill="#f5b82a"/>' +
      '<rect x="12" y="44" width="76" height="8.5" rx="4.2" fill="#d98a14"/></g>' +
      '<path d="M45.2 18.5L54.2 15.6M46.8 13.2L52.6 11.2" stroke="#8a96b0" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="50" cy="35" r="10" fill="#fff6a0" opacity=".45"/>' +
      '<circle cx="50" cy="35" r="6.4" fill="#fff6c8" stroke="#4a2a18" stroke-width="2.2"/><circle cx="50" cy="35" r="2.9" fill="#fff"/>' +
      '<circle cx="31" cy="44.6" r="3" fill="#7fe0ff" stroke="#4a2a18" stroke-width="1.6"/><circle cx="69" cy="44.6" r="3" fill="#7fe0ff" stroke="#4a2a18" stroke-width="1.6"/>' +
      '<ellipse cx="34" cy="31" rx="6" ry="3.2" fill="#fff" opacity=".5" transform="rotate(-35 34 31)"/>' +
      '<path d="M32 71H21M32 75.5L22.5 78.5M68 71H79M68 75.5L77.5 78.5" stroke="#fbe8d4" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>' +
      '<ellipse cx="39" cy="61" rx="4.4" ry="5.2" fill="#2a1a20"/><ellipse cx="61" cy="61" rx="4.4" ry="5.2" fill="#2a1a20"/>' +
      '<circle cx="37.6" cy="59.2" r="1.8" fill="#fff"/><circle cx="59.6" cy="59.2" r="1.8" fill="#fff"/>' +
      '<path d="M42 75Q50 85.5 58 75Q50 78 42 75Z" fill="#6a1a3a" stroke="#4a2a18" stroke-width="2" stroke-linejoin="round"/>' +
      '<rect x="46.4" y="76" width="3.4" height="3.6" rx="1" fill="#fffaf0"/><rect x="50.2" y="76" width="3.4" height="3.6" rx="1" fill="#fffaf0"/>' +
      '<ellipse cx="50" cy="68.5" rx="7.6" ry="5.4" fill="#ff7a9c" stroke="#4a2a18" stroke-width="2"/><ellipse cx="47.8" cy="67" rx="2.4" ry="1.4" fill="#fff" opacity=".75"/>' +
      '<ellipse cx="28" cy="67" rx="5" ry="3" fill="#ff6f90" opacity=".5"/><ellipse cx="72" cy="67" rx="5" ry="3" fill="#ff6f90" opacity=".5"/></svg>',
    // Kül Muhafızı — turtle whose shell is a little volcano (a cute steam puff on top)
    lavkaplumbaga: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g fill="#fff" stroke="#8a6a7a" stroke-width="1.6"><circle cx="57" cy="11" r="4.2"/><circle cx="62.5" cy="7.8" r="3"/><circle cx="52" cy="8.6" r="2.6"/></g>' +
      '<g stroke="#3a2c28" stroke-width="2.6" stroke-linejoin="round">' +
      '<path d="M10 55C10 37 28 27 50 27C72 27 90 37 90 55Z" fill="#ffae2e"/><path d="M38 33L44 13H56L62 33Z" fill="#7a6660"/>' +
      '<ellipse cx="50" cy="13.5" rx="7" ry="3" fill="#ffd04a"/><rect x="8" y="51" width="84" height="8" rx="4" fill="#4a3a34"/></g>' +
      '<path d="M46 14.5C45.5 19 48 21 47 26C49.5 24 51 19 51.5 14.5Z" fill="#ffc23a"/><path d="M53 14.5C53 17 55 18 54.5 21C56 19 56.5 16.5 56 14.5Z" fill="#ffe07a"/>' +
      '<g fill="#6a5852"><path d="M17 50L20 42L28 40L31 46L27 50Z"/><path d="M83 50L80 42L72 40L69 46L73 50Z"/><path d="M33 49L36 42H44L46 49Z"/><path d="M67 49L64 42H56L54 49Z"/>' +
      '<path d="M26 37L32 33H37L35 38L29 39Z"/><path d="M74 37L68 33H63L65 38L71 39Z"/></g>' +
      '<g stroke="#1f6a50" stroke-width="2.4" stroke-linejoin="round"><ellipse cx="19" cy="84" rx="8.5" ry="5.5" fill="#62d4a6"/><ellipse cx="81" cy="84" rx="8.5" ry="5.5" fill="#62d4a6"/>' +
      '<ellipse cx="50" cy="69" rx="25" ry="21" fill="#6fdcae"/></g>' +
      '<ellipse cx="50" cy="80" rx="15" ry="7" fill="#c4f5dc"/><circle cx="35" cy="57" r="2.6" fill="#3fae84"/><circle cx="65" cy="56.5" r="2" fill="#3fae84"/><circle cx="50" cy="52.5" r="1.8" fill="#3fae84"/>' +
      '<g stroke="#1f6a50" stroke-width="2"><ellipse cx="40" cy="65" rx="7" ry="8.2" fill="#fff"/><ellipse cx="60" cy="65" rx="7" ry="8.2" fill="#fff"/></g>' +
      '<circle cx="41" cy="67" r="4.7" fill="#3a2410"/><circle cx="59" cy="67" r="4.7" fill="#3a2410"/>' +
      '<circle cx="39.2" cy="64.3" r="2" fill="#fff"/><circle cx="57.2" cy="64.3" r="2" fill="#fff"/>' +
      '<path d="M41.5 77Q50 87 58.5 77Q50 80 41.5 77Z" fill="#7a2030" stroke="#1f6a50" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M46 81.6Q50 84.6 54 81.6Q50 80.2 46 81.6Z" fill="#ff7aa0"/>' +
      '<ellipse cx="29" cy="74" rx="5.4" ry="3.1" fill="#ff6fb0" opacity=".55"/><ellipse cx="71" cy="74" rx="5.4" ry="3.1" fill="#ff6fb0" opacity=".55"/></svg>',
    // Veba Rahibi — a friendly glass kefir bottle: creamy kefir inside with fizzy bubbles, foam in the neck, its bottle
    // cap worn like a little crown (tilted), a label with a smiling face, tiny arms (one waving)
    kefirdev: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 100">' +
      '<g stroke="#2a4a7a" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M19.5 60C11 57 5.5 50 6 41.5C11.5 41 16.5 46 22 53Z" fill="#a8d8f4"/><path d="M80.5 64C88 65 92 69 92.5 75.5C88 77 83.5 74.5 79.5 71Z" fill="#a8d8f4"/>' +
      '<path d="M41 13H59V22.5C59 28.5 81 31.5 83 43.5V97C83 101 80 103 76 103H24C20 103 17 101 17 97V43.5C19 31.5 41 28.5 41 22.5Z" fill="#bfe3ff"/></g>' +
      '<path d="M44.4 18.5H55.6V24C55.6 31 77.4 34 79.4 45V99H20.6V45C22.6 34 44.4 31 44.4 24Z" fill="#fffdf6"/>' +
      '<g fill="#fff" stroke="#a9d2f0" stroke-width="1.3"><circle cx="46.4" cy="19" r="3.2"/><circle cx="50.6" cy="17.2" r="3.7"/><circle cx="54.2" cy="19.3" r="2.8"/></g>' +
      '<path d="M22.5 44C27 35 40 32.5 41.8 25" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".95"/>' +
      '<g transform="rotate(-9 50 10)" stroke-linejoin="round">' +
      '<path d="M35 13L36.2 2.5L41.8 8L46 0.5L50 7L54 0.5L58.2 8L63.8 2.5L65 13Z" fill="#ffd23f" stroke="#7a4205" stroke-width="2.2"/>' +
      '<rect x="33.5" y="10.5" width="33" height="7.5" rx="3.4" fill="#ff6aa4" stroke="#8a2a56" stroke-width="2.2"/>' +
      '<g fill="#fff8ee" stroke="#7a4205" stroke-width="1"><circle cx="36.2" cy="2.5" r="1.7"/><circle cx="46" cy="0.5" r="1.7"/><circle cx="54" cy="0.5" r="1.7"/><circle cx="63.8" cy="2.5" r="1.7"/></g>' +
      '<path d="M50 16.6C46.6 14.4 46.6 11.6 48.3 11.6C49.2 11.6 50 12.4 50 13.1C50 12.4 50.8 11.6 51.7 11.6C53.4 11.6 53.4 14.4 50 16.6Z" fill="#fff"/></g>' +
      '<g fill="#fff" stroke="#9cc8ea" stroke-width="1.2"><circle cx="30" cy="41" r="2.3"/><circle cx="69" cy="40" r="1.9"/><circle cx="61" cy="36.5" r="1.3"/><circle cx="38" cy="36" r="1.2"/><circle cx="27" cy="95" r="1.6"/><circle cx="73" cy="95.5" r="1.4"/></g>' +
      '<rect x="22" y="46" width="56" height="44" rx="11" fill="#7cc8f6" stroke="#2a4a7a" stroke-width="2.3"/>' +
      '<ellipse cx="50" cy="69" rx="21.5" ry="19" fill="#fff8ec"/>' +
      '<g fill="#ff6aa0"><path d="M25.6 58.4C23.4 57 23.4 55.2 24.5 55.2C25.1 55.2 25.6 55.7 25.6 56.2C25.6 55.7 26.1 55.2 26.7 55.2C27.8 55.2 27.8 57 25.6 58.4Z"/>' +
      '<path d="M74.4 58.4C72.2 57 72.2 55.2 73.3 55.2C73.9 55.2 74.4 55.7 74.4 56.2C74.4 55.7 74.9 55.2 75.5 55.2C76.6 55.2 76.6 57 74.4 58.4Z"/></g>' +
      '<g fill="#fff"><circle cx="25.5" cy="83" r="1.2"/><circle cx="74.5" cy="83" r="1.2"/></g>' +
      '<g stroke="#2a4a7a" stroke-width="2.1"><ellipse cx="39.5" cy="65" rx="7.6" ry="8.8" fill="#fff"/><ellipse cx="60.5" cy="65" rx="7.6" ry="8.8" fill="#fff"/></g>' +
      '<circle cx="40.4" cy="67" r="5.1" fill="#1f2d4a"/><circle cx="59.6" cy="67" r="5.1" fill="#1f2d4a"/>' +
      '<circle cx="38.4" cy="64" r="2.1" fill="#fff"/><circle cx="57.6" cy="64" r="2.1" fill="#fff"/>' +
      '<path d="M42 76.5Q50 86 58 76.5Q50 79.5 42 76.5Z" fill="#6a1a3a" stroke="#2a4a7a" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M46 81Q50 83.8 54 81Q50 79.6 46 81Z" fill="#ff7aa0"/>' +
      '<ellipse cx="29" cy="75" rx="4.8" ry="2.9" fill="#ff6fa0" opacity=".6"/><ellipse cx="71" cy="75" rx="4.8" ry="2.9" fill="#ff6fa0" opacity=".6"/></svg>',
    // Yeminbozan — the knight (visor up, curly moustache, rainbow plume) riding behind his big chunky horse's smiling face
    // (braided forelock with a bow, a silver chanfron with a golden star, lashes), a blue/yellow checkered caparison below
    sovalye: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<g stroke="#26306a" stroke-width="2.4" stroke-linejoin="round">' +
      '<path d="M13 100C12 87 20 78 33 75H67C80 78 88 87 87 100Z" fill="#3d64d8"/>' +
      '<path d="M17 68C16 55 26 47 38 46H62C74 47 84 55 83 68C83 72 17 72 17 68Z" fill="#dfe6f2"/><path d="M40 46H60L58 62H42Z" fill="#3d64d8"/></g>' +
      '<path d="M20.5 60C23 53 29 50 37 49.5M79.5 60C77 53 71 50 63 49.5" fill="none" stroke="#ffc933" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g fill="#ffd23f"><path d="M25 86l5-5 5 5-5 5z"/><path d="M65 86l5-5 5 5-5 5z"/><path d="M27 95l4-4 4 4-4 4z"/><path d="M65 95l4-4 4 4-4 4z"/></g>' +
      '<g stroke="#26306a" stroke-width="1.7" stroke-linejoin="round">' +
      '<path d="M49 14C44 11 43 7 45 3C49 5 51 9 52 13Z" fill="#b07aff"/><path d="M50.5 13C49.5 9 51 5 54 2C57 5 56 10 53 13Z" fill="#5ab4ff"/>' +
      '<path d="M52 13C54 8 57 4.5 62 3C62.5 8 59.5 11.5 54 14Z" fill="#6fdc6a"/><path d="M53 14C57 9.5 63.5 7 70.5 8C68 12 63 14.5 55 15Z" fill="#ffd93f"/>' +
      '<path d="M54 15C60 12 68.5 11.5 75.5 14.5C71 18.5 64 18.5 55 17Z" fill="#ffa53a"/><path d="M55 17C62 16 70.5 18.5 76.5 22.5C71 25.5 63 23.5 55 19.5Z" fill="#ff5f7a"/></g>' +
      '<g stroke="#26306a" stroke-width="2.4" stroke-linejoin="round">' +
      '<path d="M31 36C30 20 39 11 50 11C61 11 70 20 69 36C69 44 61 48.5 50 48.5C39 48.5 31 44 31 36Z" fill="#dfe6f2"/>' +
      '<path d="M36.5 25H63.5C65.5 30 65.5 39 61 43.5C57 47 43 47 39 43.5C34.5 39 34.5 30 36.5 25Z" fill="#ffdcbc" stroke-width="2"/>' +
      '<path d="M35 20Q50 14 65 20L64.5 26Q50 21.5 35.5 26Z" fill="#b9c4dc" stroke-width="2"/></g>' +
      '<path d="M42 19.6v2.4M46 18.6v2.4M50 18.2v2.4M54 18.6v2.4M58 19.6v2.4" stroke="#26306a" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M32 40.5Q50 52 68 40.5" fill="none" stroke="#ffc933" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="40" cy="17.5" rx="5" ry="2.4" fill="#fff" opacity=".7" transform="rotate(-32 40 17.5)"/>' +
      '<path d="M40 29.4Q43.6 27 47.2 29.2M52.8 29.2Q56.4 27 60 29.4" fill="none" stroke="#7a4222" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="44" cy="33.4" r="2.9" fill="#2a1a30"/><circle cx="56" cy="33.4" r="2.9" fill="#2a1a30"/>' +
      '<circle cx="43" cy="32.3" r="1.1" fill="#fff"/><circle cx="55" cy="32.3" r="1.1" fill="#fff"/>' +
      '<ellipse cx="39.5" cy="38.6" rx="3.2" ry="1.9" fill="#ff7a9a" opacity=".65"/><ellipse cx="60.5" cy="38.6" rx="3.2" ry="1.9" fill="#ff7a9a" opacity=".65"/>' +
      '<path d="M45.6 41.4Q50 47.2 54.4 41.4Q50 43.2 45.6 41.4Z" fill="#6a1a3a" stroke="#6a1a3a" stroke-width="1" stroke-linejoin="round"/>' +
      '<path d="M50 38C47.6 35.8 43.8 36 42.2 38.4C41.2 40 42.4 41.6 43.8 40.6C45.4 39.4 47.6 39.3 50 39.8C52.4 39.3 54.6 39.4 56.2 40.6C57.6 41.6 58.8 40 57.8 38.4C56.2 36 52.4 35.8 50 38Z" fill="#8a4a22"/>' +
      '<g stroke="#5a2e14" stroke-width="2.4" stroke-linejoin="round">' +
      '<path d="M36.5 61L30.5 45L43.5 54.5Z" fill="#e8a060"/><path d="M63.5 61L69.5 45L56.5 54.5Z" fill="#e8a060"/>' +
      '<path d="M50 52C61 52 67 58 67 66C67 72 63.5 76 62.5 81C61.5 91 57 98 50 98C43 98 38.5 91 37.5 81C36.5 76 33 72 33 66C33 58 39 52 50 52Z" fill="#e8a060"/>' +
      '<ellipse cx="50" cy="88.5" rx="12.5" ry="9" fill="#fbe0c4"/>' +
      '<path d="M45.5 57H54.5L53.5 76H46.5Z" fill="#dfe6f2" stroke="#26306a" stroke-width="1.8"/>' +
      '<path d="M41.5 56.5C42.5 51 57.5 51 58.5 56.5C55.5 58.5 53 55.5 50 59.5C47 55.5 44.5 58.5 41.5 56.5Z" fill="#7a4424"/></g>' +
      '<path d="M35.6 57.4L32.6 49.6L39.6 54.6Z" fill="#f7b8a8"/><path d="M64.4 57.4L67.4 49.6L60.4 54.6Z" fill="#f7b8a8"/>' +
      '<path d="M50 61.8L51.4 64.9H54.6L52 66.8L53 70L50 68.1L47 70L48 66.8L45.4 64.9H48.6Z" fill="#ffd23f" stroke="#8a5a08" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M50 53.6C47.4 51.4 47.2 49.4 48.7 49.3C49.5 49.3 50 49.9 50 50.5C50 49.9 50.5 49.3 51.3 49.3C52.8 49.4 52.6 51.4 50 53.6Z" fill="#ff6aa4" stroke="#8a2a56" stroke-width="1"/>' +
      '<g stroke="#5a2e14" stroke-width="2"><ellipse cx="39.5" cy="67" rx="5.2" ry="6.3" fill="#fff"/><ellipse cx="60.5" cy="67" rx="5.2" ry="6.3" fill="#fff"/></g>' +
      '<circle cx="40.2" cy="68.2" r="3.7" fill="#3a2410"/><circle cx="59.8" cy="68.2" r="3.7" fill="#3a2410"/>' +
      '<circle cx="38.8" cy="66.3" r="1.5" fill="#fff"/><circle cx="58.4" cy="66.3" r="1.5" fill="#fff"/>' +
      '<path d="M34.9 63L32 61.4M36 61.2L34.3 58.6M65.1 63L68 61.4M64 61.2L65.7 58.6" stroke="#5a2e14" stroke-width="1.6" stroke-linecap="round"/>' +
      '<ellipse cx="45" cy="85.6" rx="2" ry="1.4" fill="#8a4a30"/><ellipse cx="55" cy="85.6" rx="2" ry="1.4" fill="#8a4a30"/>' +
      '<path d="M43.5 90.2Q50 97.4 56.5 90.2Q50 92.6 43.5 90.2Z" fill="#6a1a3a" stroke="#5a2e14" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M46.8 93.8Q50 95.8 53.2 93.8Q50 92.8 46.8 93.8Z" fill="#ff7aa0"/>' +
      '<ellipse cx="36" cy="77.5" rx="3.6" ry="2.2" fill="#ff6f90" opacity=".55"/><ellipse cx="64" cy="77.5" rx="3.6" ry="2.2" fill="#ff6f90" opacity=".55"/></svg>',
    // any other boss: a smiling golden star
    bstar: '<svg class="u-dimg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path d="M50 12L60.5 37.5L88 39L67 56.5L74 84L50 69L26 84L33 56.5L12 39L39.5 37.5Z" fill="#ffd23f" stroke="#7a4205" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="43" cy="51" r="3.6" fill="#3a1a10"/><circle cx="57" cy="51" r="3.6" fill="#3a1a10"/><circle cx="42" cy="49.6" r="1.3" fill="#fff"/><circle cx="56" cy="49.6" r="1.3" fill="#fff"/>' +
      '<path d="M44 59Q50 65 56 59" fill="none" stroke="#7a4205" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="36.5" cy="58" rx="4" ry="2.4" fill="#ff8a6a" opacity=".6"/><ellipse cx="63.5" cy="58" rx="4" ry="2.4" fill="#ff8a6a" opacity=".6"/></svg>',
  };
  SLOT_EMO.weapon = SVG.saber;   // wardrobe row label + thumbnail fallback: a little lightsaber (there is no emoji for it)

  // ── State ──
  const S = {
    booted: false, ready: false, mode: 'boot', choiceFrom: 'title', menu: null, paused: false, busy: false, hud: false,
    t: 0, frame: 0, primary: null, primaryT: 0, atkHeld: false, atkNext: 0, needRender: true, portraitDirty: true, portraitAt: 0,
    boss: false, bossFrac: 1, bossTrail: 1, dpr: 1, playPitch: 0.96, guardUntil: 0, lastGoldBump: 0,
    prefs: { music: true, sound: true }, portraitUrl: null, lastFrame: 0, hold: false, hintT: -1, hintOn: false, cheered: 0,   // hold: tests keep messages on screen
    hintX: 0, hintZ: 0, askT: 0, cine: null, bossTop: 90, titleT: 0, titleIdle: 0, titleSaid: 0,
    subTop: -1, subBot: -1, logoBot: -1,   // layout top/bottom (px) of the subtitle box while a line shows, else -1 (the camera keeps it off Feza)
    hintGoal: null, hintD0: 0, pwatch: null,   // finger hint toward a goal (the awake portal) · watching whether Feza heads there
  };
  const D = {};                                       // DOM refs
  const last = { xp: -1, lvl: -1, gold: -1, pot: -1, potEv: 99, low: null, empty: null, hint: null };
  let goldShown = 0, readyRes = null;
  const newItems = new Set();   // picked up into the bag but not seen yet
  const readyP = new Promise(r => { readyRes = r; });

  // ── Preferences (music / sound toggles) ──
  // Only music is restored; sound effects always start on.
  function loadPrefs() {
    try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (p) S.prefs.music = p.music !== false; } catch (e) { /* private mode */ }
    S.prefs.sound = true;
    aud('setMusic', S.prefs.music); aud('setSound', S.prefs.sound);
  }
  function setPref(k, on) {
    S.prefs[k] = !!on;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs)); } catch (e) { /* private mode */ }
    if (k === 'music') aud('setMusic', on); else aud('setSound', on);
    syncToggles();
  }
  function syncToggles() {
    document.querySelectorAll('#ui [data-tog]').forEach(b => {
      const k = b.dataset.tog, on = S.prefs[k];
      b.classList.toggle('off', !on);
      const lab = b.querySelector('.u-lab');
      if (lab) lab.textContent = (k === 'music' ? 'Müzik' : 'Efektler') + (on ? ' Açık' : ' Kapalı');   // effects only: the narrator stays on
    });
  }

  // ── Press helper: pointerdown fires instantly; one press per pointer; menus can rate-limit ──
  function onPress(b, fn, o = {}) {
    let downId = null, lastT = 0;
    b.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      if (downId !== null && downId === e.pointerId) return;
      const t = performance.now();
      if (o.menu && (t < S.guardUntil || t - lastT < 350)) return;
      downId = e.pointerId; lastT = t;
      b.classList.add('down');
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (o.menu) sfx('click', { vol: 0.6 });
      try { fn(e); } catch (err) { console.error('[UI] button', err); }
    });
    const up = e => { if (e.pointerId !== downId) return; downId = null; b.classList.remove('down'); if (o.up) o.up(e); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  }
  // Press-and-hold: fn fires only after the finger stayed down for `sec` seconds. Progress is written to the CSS variable --hp
  // (0..1, drives a filling ring/bar) by holdTick() in the main loop, so it also runs while a menu pauses the game.
  // A press inside a menu's tap guard (S.guardUntil) is not ignored: the fill starts right away, but the `sec` seconds only
  // count once the guard is over (the fill is stretched over the rest of the guard + sec), so a finger that lands early
  // still sees it working and simply holds a little longer.
  const HOLDS = [];
  function onHold(b, sec, fn, o = {}) {
    const h = { b, sec, fn, id: null, t0: 0, dur: sec };
    b.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      if (h.id !== null) return;
      if (o.can && !o.can()) return;
      const guard = o.menu ? clamp((S.guardUntil - performance.now()) / 1000, 0, 2) : 0;
      h.id = e.pointerId; h.t0 = S.t; h.dur = sec + guard;
      b.classList.add('down', 'holding'); b.style.setProperty('--hp', '0');
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (HOLDS.indexOf(h) < 0) HOLDS.push(h);
      sfx('click', { vol: 0.35, pitch: 0.8 });
    });
    const up = e => {
      if (e.pointerId !== h.id) return;
      const early = S.t - h.t0 < h.dur;
      endHold(h);
      if (early && o.early) o.early();
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return h;
  }
  function endHold(h) {
    h.id = null; h.b.classList.remove('down', 'holding'); h.b.style.setProperty('--hp', '0');
    const i = HOLDS.indexOf(h); if (i >= 0) HOLDS.splice(i, 1);
  }

  // HUD corner buttons (⏸, 🎒, portrait) sit where a steering finger lands when Feza walks toward a corner. They act on
  // release, and only after a still press of the right length: o.hold s (0 = plain tap) up to o.max s. A press that drags
  // more than DRAG_PX or lingers past o.max is steering: it is handed over to the canvas, so Feza simply walks there.
  const CORNERS = [], DRAG_PX = 25;
  function onCorner(b, fn, o) {
    const h = { b, fn, o, id: null, t0: 0, x0: 0, y0: 0, x: 0, y: 0 };
    b.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      if (h.id !== null) return;
      if (performance.now() < S.guardUntil) return;
      if (!canMenu()) { steerFrom(e.pointerId, e.clientX, e.clientY); return; }
      h.id = e.pointerId; h.t0 = S.t; h.x0 = h.x = e.clientX; h.y0 = h.y = e.clientY;
      b.classList.add('down');
      if (o.hold) { b.classList.add('holding'); b.style.setProperty('--hp', '0'); sfx('click', { vol: 0.35, pitch: 0.8 }); }
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (CORNERS.indexOf(h) < 0) CORNERS.push(h);
    });
    b.addEventListener('pointermove', e => {
      if (e.pointerId === S.primary && h.id === null) { steerMove(e); return; }   // capture stayed here after the hand-over
      if (e.pointerId !== h.id) return;
      h.x = e.clientX; h.y = e.clientY;
      if (Math.hypot(h.x - h.x0, h.y - h.y0) > DRAG_PX) cornerToSteer(h);
    });
    const up = e => {
      if (e.pointerId !== h.id) return;
      const held = S.t - h.t0, still = Math.hypot(e.clientX - h.x0, e.clientY - h.y0) <= DRAG_PX;
      endCorner(h);
      if (e.type !== 'pointerup' || !still) return;   // cancelled by the browser, or the finger slid away
      if (held < (o.hold || 0)) { if (o.early) o.early(); return; }
      if (held > o.max || !canMenu()) return;
      sfx('click', { vol: 0.6 });
      try { fn(); } catch (err) { console.error('[UI] corner', err); }
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', e => e.preventDefault());
    return h;
  }
  function endCorner(h) {
    h.id = null; h.b.classList.remove('down', 'holding', 'armed'); h.b.style.setProperty('--hp', '0');
    const i = CORNERS.indexOf(h); if (i >= 0) CORNERS.splice(i, 1);
  }
  function cornerToSteer(h) {
    const id = h.id;
    endCorner(h);   // first, so the lostpointercapture that follows is ignored
    try { h.b.releasePointerCapture(id); } catch (err) { /* ignore */ }
    steerFrom(id, h.x, h.y);
  }
  function cornerTick() {
    for (let i = CORNERS.length - 1; i >= 0; i--) {
      const h = CORNERS[i];
      if (!canMenu()) { endCorner(h); continue; }
      const held = S.t - h.t0;
      if (held > h.o.max) { cornerToSteer(h); continue; }
      if (h.o.hold) {
        const p = clamp(held / h.o.hold, 0, 1);
        h.b.style.setProperty('--hp', p.toFixed(3));
        h.b.classList.toggle('armed', p >= 1);   // full ring: lift now to open
      }
    }
  }
  function holdTick() {
    for (let i = HOLDS.length - 1; i >= 0; i--) {
      const h = HOLDS[i], p = clamp((S.t - h.t0) / (h.dur || h.sec), 0, 1);
      h.b.style.setProperty('--hp', p.toFixed(3));
      if (p >= 1) { endHold(h); try { h.fn(); } catch (err) { console.error('[UI] hold', err); } }
    }
    // Close the restart question if a kid wanders away.
    if (S.menu === 'pause' && D.pausePanel.classList.contains('asking') && !HOLDS.length &&
      S.t - S.askT > 6) closeAsk();
  }

  // Tap (for scrollable bag rows): fires on pointerup if the finger didn't travel; a browser pan sends pointercancel.
  function onTap(b, fn) {
    let sx = 0, sy = 0, id = null;
    b.addEventListener('pointerdown', e => { if (e.button > 0) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; b.classList.add('down'); e.stopPropagation(); });
    b.addEventListener('pointerup', e => {
      if (e.pointerId !== id) return; id = null; b.classList.remove('down');
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < 14 && performance.now() > S.guardUntil) { sfx('click', { vol: 0.6 }); fn(e); }
    });
    const cancel = () => { id = null; b.classList.remove('down'); };
    b.addEventListener('pointercancel', cancel); b.addEventListener('pointerleave', cancel);
  }

  // ───────────────────────── DOM ─────────────────────────
  function build() {
    const root = D.root = el('div', '', document.body); root.id = 'ui';
    if (!(navigator.maxTouchPoints > 0)) root.classList.add('kbd');   // a computer: keyboard keys on the skill buttons from the start
    if (ICON) { root.classList.add('ikon'); document.body.classList.add('u-ikon'); }
    const hud = D.hud = el('div', '', root); hud.id = 'uiHud';

    // top-left: portrait + level star + xp + gold
    const tl = D.tl = el('div', 'u-tl', hud);
    const portraits = el('div', 'u-portraits', tl);
    D.face = el('div', 'u-face', portraits);
    D.faceIn = el('div', 'u-fimg', D.face, '<span class="u-femo">🧒</span>');
    D.lvl = el('div', 'u-lvl', D.face, '<span>1</span>');
    el('span', 'u-hold', D.face);   // hold the portrait 0.5 s → wardrobe
    D.bilboFace = el('div', 'u-bilbo-face', portraits);
    D.bilboFace.setAttribute('role', 'img'); D.bilboFace.setAttribute('aria-label', 'Bilbo'); D.bilboFace.title = 'Bilbo';
    D.petBar=el('div','u-petarmor',D.bilboFace);D.petBar.title='Bilbo zırhı';D.petFill=el('i','',D.petBar);
    const st = el('div', 'u-stats', tl);
    D.xp = el('div', 'u-xp', st);
    D.xpFill = el('div', 'u-xpfill', D.xp);
    el('div', 'u-xpstar', D.xp, '◆');
    D.gold = el('div', 'u-gold', st, '<span class="u-coin"></span><span class="u-gn">' + ol('0', 'u-gold-t') + '</span>');
    D.goldB = D.gold.querySelector('.u-gn b'); D.goldI = D.gold.querySelector('.u-gn i');
    D.difficultyTag = el('div', 'u-difficulty-tag', st, 'Normal');

    // top-right: 🎒 and ⏸ in one row hugging the top edge, left of the minimap (music lives on the title screen)
    const tr = D.tr = el('div', 'u-tr', hud);
    const sb = D.sbtns = el('div', 'u-sbtns', tr);
    D.bagBtn = el('button', 'u-rbtn', sb, '<span class="u-emo">⛓</span><span class="u-dot"></span>');
    D.pauseBtn = el('button', 'u-rbtn', sb, SVG.pause + '<span class="u-hold"></span>');   // 0.5 s hold
    D.dreamBtn = el('button', 'u-rbtn u-dream-open u-hide', sb, '<span class="u-emo">🗺️</span><span class="u-dream-label">Harita</span>');
    D.dreamBtn.setAttribute('aria-label', 'Geçit haritasını aç');
    const mini = D.mini = el('div', 'u-mini', tr);
    D.map = el('canvas', '', mini);

    // boss bar
    D.boss = el('div', 'u-boss', hud);
    D.bossName = el('div', 'u-bossname', D.boss, ol('Gece Yutan'));
    const brow = el('div', 'u-bossrow', D.boss);
    D.bossIco = el('div', 'u-bossico', brow, bossHTML('ejderha'));   // the boss's friendly portrait (never a fierce 🐲 emoji); set in showBoss
    const bbar = el('div', 'u-bossbar', brow);
    D.bossTrail = el('div', 'u-bosstrail', bbar);
    D.bossFill = el('div', 'u-bossfill', bbar);
    D.bossFizz = el('div', 'u-bossfizz', D.bossFill, '<i></i>');   // Kefir Devi: fizzy bubbles rising in its bar; the knight: lance stripes (ui.css; hidden for the others)
    D.bossPips = el('div', 'u-bpips', D.boss);   // Round 6 bonus: gold stars / pink hearts right of the name (bonusPips)

    // toast, banner, item card, subtitles
    D.toast = el('div', 'u-toast', hud);
    D.banner = el('div', 'u-banner', hud);
    D.card = el('div', 'u-card', hud);
    D.hint = el('div', 'u-hint', hud, '<span class="u-hring"></span><span class="u-hring b"></span><span class="u-hand">⌖</span>');

    // bottom-left: health orb + potion
    const bl = D.bl = el('div', 'u-bl', hud);
    D.orb = el('div', 'u-orb', bl);
    el('div', 'u-orbglow', D.orb);
    D.orbCv = el('canvas', '', D.orb);
    // count as a "×3" tag on the bottom rim; the keyboard key (Q) sits top-right like the skills' 1 2 3, so they never mix up
    D.pot = el('button', 'u-potion', bl, SVG.potion + '<span class="u-badge u-potn">×3</span><span class="u-key">Q</span>');
    D.potN = D.pot.querySelector('.u-potn');

    // bottom-right: attack + one button per skill on the arc around it
    const pad = D.pad = el('div', 'u-pad', hud);
    D.atk = el('button', 'u-atk', pad, SVG.sword);
    D.atkBlade = D.atk.querySelector('.u-blade');
    D.atk.style.setProperty('--x', 0); D.atk.style.setProperty('--y', 0);
    D.sk = [];
    D.boneBtn = el('button', 'u-skill u-bone', pad, '<span class="u-ico">🦴</span><span class="u-cd"></span><span class="u-cdn"></span><span class="u-key">K</span><span class="u-bone-label">Bilbo</span>');
    D.boneBtn.style.setProperty('--x', 0); D.boneBtn.style.setProperty('--y', -265);
    D.boneBtn.setAttribute('aria-label', 'Bilbo’ya kemik at');
    const nSk = clamp((M.SKILLS && M.SKILLS.length) || 3, 1, ARC.length);
    for (let i = 0; i < nSk; i++) {
      const b = el('button', 'u-skill u-hide', pad, `<span class="u-ico"></span><span class="u-cd"></span><span class="u-cdn"></span><span class="u-key">${i + 1}</span>`);
      const [r, a] = ARC[i], rad = a * Math.PI / 180;
      b.style.setProperty('--x', (-Math.cos(rad) * r).toFixed(1)); b.style.setProperty('--y', (-Math.sin(rad) * r).toFixed(1));
      D.sk.push({ b, ico: b.firstChild, cd: b.children[1], cdn: b.children[2], shown: false, p: -1, n: -1 });
    }

    buildTitle(root); buildChoice(root); buildPause(root); buildBag(root); buildWin(root); buildMerchant(root); buildDreamMap(root); buildDreamTravel(root);
    // subtitles live above every screen (the victory line plays over the victory panel)
    D.sub = el('div', 'u-sub', root, '<div class="u-subico">◆</div><div class="u-subtxt"></div>');
    D.subIco = D.sub.firstChild; D.subTxt = D.sub.lastChild;
    D.fade = el('div', '', document.body, '<div class="u-fstar">⌖</div>');
    D.fade.id = 'uiFade';
    wireButtons();
  }

  function buildTitle(root) {
    const t = D.title = el('div', 'u-screen u-title', root);
    el('div', 'u-tshade', t);
    const logo = D.logo = el('div', 'u-logo', t);
    logo.setAttribute('role', 'img'); logo.setAttribute('aria-label', 'Feza ve Bilbo: Merhametin Öldüğü Yer');
    const word = el('div', 'u-word', logo);
    for (const ch of 'FEZA') el('span', 'u-let', word, `<b>${ch}</b><i>${ch}</i>`);
    el('span', 'u-sidekick', word, `<span class="u-sidekick-ve">${ol('ve')}</span>${ol('Bilbo')}`);
    el('div', 'u-ribbon', logo, ol('Merhametin Öldüğü Yer'));
    el('div', 'u-dark-tagline', logo, 'Kazanılamaz dediler. Savaşmayı bırakmadılar.');
    el('div', 'u-adult-note', t, 'YETİŞKİNLER İÇİN KARANLIK BİR MASAL · 18+');
    [[-8, 12, 0], [104, 6, 0.7], [96, 64, 1.4], [-4, 70, 1.9], [50, -8, 1.1]].forEach(([x, y, d]) => {
      const s = el('span', 'u-spark', logo, '✦'); s.style.left = x + '%'; s.style.top = y + '%'; s.style.animationDelay = d + 's';
    });
    const bt = D.tbtns = el('div', 'u-tbtns', t);
    D.playBtn = el('button', 'u-btn g', bt, SVG.play + '<span>Yola Çık</span>');   // always: a new game (a saved game is never touched)
    D.contBtn = el('button', 'u-btn b', bt, SVG.cont + '<span>Devam Et</span>');   // only with a save (Mola › Kaydet)
    D.titleMap = el('button', 'u-btn p u-hide', bt, '<span>🗺️ Geçit Haritası</span>');
    const tg = el('div', 'u-ttog', t);
    D.tMus = el('button', 'u-rbtn', tg, SVG.note + '<span class="u-slash"></span>'); D.tMus.dataset.tog = 'music';   // sound effects: pause menu only
  }
  // All portraits share Feza's face; the silhouette and equipment make the choice readable without words.
  function heroArt(id) {
    const mage=id==='wizard',hybrid=id==='hybrid',col=mage?'#735165':hybrid?'#566958':'#79504c';
    return `<svg class="u-heroart" viewBox="0 0 220 220" aria-hidden="true">
    <ellipse cx="110" cy="203" rx="68" ry="10" fill="#0a0b10" opacity=".6"/>
    <path d="M80 113L53 192L76 182L82 200L108 187L139 201L149 180L167 191L139 112Z" fill="${col}" stroke="#20232c" stroke-width="5"/>
    <path d="M87 125L79 179L109 191L142 176L131 125Z" fill="#393e48" stroke="#171c24" stroke-width="5"/>
    <path d="M78 125L62 147L82 154M142 126L160 146L139 155" fill="#74736d" stroke="#2c303a" stroke-width="4"/>
    <path d="M87 179L82 202H102L104 181M122 180L123 203H146L138 179" fill="#424650" stroke="#252733" stroke-width="4"/>
    <path d="M75 139L58 167M144 140L159 167" stroke="#434852" stroke-width="16"/>
    <circle cx="110" cy="86" r="38" fill="#b5afa2" stroke="#4b464a" stroke-width="3"/>
    <path d="M72 87Q61 37 106 43Q160 35 147 87L132 65L111 76L98 60L81 87Z" fill="#222630"/>
    <path d="M82 60Q54 42 65 15Q70 35 94 44M131 47Q154 36 153 14Q173 40 142 64" fill="#746f69" stroke="#282933" stroke-width="4"/>
    <path d="M71 82Q110 72 149 82L146 99Q110 90 74 99Z" fill="#141821" stroke="#45414a" stroke-width="3"/>
    <path d="M83 88L103 86M120 86L140 88" stroke="#b64e43" stroke-width="3"/>
    <path d="M102 112L120 110M130 104L136 114" stroke="#734b47" stroke-width="3"/>
    <path d="M111 134L101 147L112 160L124 147ZM111 132V166M96 147H128" fill="none" stroke="#ad574b" stroke-width="3"/>
    ${mage?'<path d="M159 166L184 102" stroke="#37323d" stroke-width="8"/><path d="M172 98L187 69L198 96L187 120Z" fill="#998a98" stroke="#483442" stroke-width="4"/><path d="M187 78V106" stroke="#b36370" stroke-width="3"/>':'<path d="M57 168Q31 148 49 110L61 122L72 108Q86 143 65 166Z" fill="#a4a8a3" stroke="#363943" stroke-width="4"/><path d="M157 168Q187 147 174 110L161 124L149 112Q137 146 151 166Z" fill="#a4a8a3" stroke="#363943" stroke-width="4"/>'}
    ${hybrid?'<circle cx="157" cy="123" r="27" fill="none" stroke="#a0644a" stroke-width="3"/><path d="M138 104L176 142M176 104L138 142" stroke="#b17958" stroke-width="2"/>':''}
    </svg>`;
  }
  function buildChoice(root) {
    const s = D.choice = el('div', 'u-screen u-dim u-choice', root);
    s.setAttribute('role', 'dialog'); s.setAttribute('aria-modal', 'true'); s.setAttribute('aria-labelledby', 'heroTitle');
    const p = el('div', 'u-panel', s);
    const title = el('div', 'u-ptitle', p, ol('Avcı Yolunu Seç', 'u-gold-t')); title.id = 'heroTitle';
    el('div', 'u-choicehint', p, 'Bu savaşı nasıl sürdüreceksin?');
    const row = el('div', 'u-herorow', p);
    const names = ['İblis Avcısı', 'Ruh Biçen', 'Lanet Şövalyesi'];
    const hints = ['Hükmünü ver.<br> Geri çekilme.', 'Ruhları parçala.<br> Uzakta da güvende değiller.', 'Çelik ve lanet.<br> Hiçbir kaçış yok.'];
    D.heroes = ['warrior', 'wizard', 'hybrid'].map((id, i) => {
      const b = el('button', 'u-herocard ' + id, row, heroArt(id) +
        `<strong>${names[i]}</strong><span class="u-herodesc">${hints[i]}</span><span class="u-herogo">${SVG.play} Seç ve Yola Çık</span>`);
      b.dataset.heroClass = id;
      onPress(b, () => startGame(false, id), { menu: true });
      return b;
    });
    D.choiceBack = el('button', 'u-btn p u-choiceback', p, SVG.close + '<span>Geri</span>');
    onPress(D.choiceBack, () => closeChoice(), { menu: true });
  }
  function openChoice(from) {
    S.choiceFrom = from; S.atkHeld = false;
    if (S.clearKeys) S.clearKeys();
    aud('stopVoice'); setPaused(true); setMode('choose'); showScreen(D.choice, true);
    aud('say', 'kahraman_sec', { prio: 3 });
    D.heroes[0].focus({ preventScroll: true });
  }
  function closeChoice() {
    if (S.mode !== 'choose' || S.busy) return;
    aud('stopVoice');
    showScreen(D.choice, false);
    if (S.choiceFrom === 'pause') {
      setMode('play'); S.menu = 'pause'; D.pausePanel.classList.remove('asking'); closeDifficulty(); showScreen(D.pause, true);
    } else { setPaused(false); showTitle(); D.playBtn.focus({ preventScroll: true }); }
  }
  function buildPause(root) {
    const s = D.pause = el('div', 'u-screen u-dim', root);
    const p = D.pausePanel = el('div', 'u-panel u-pause-panel', s);
    D.pauseTitle = el('div', 'u-ptitle', p, ol('Mola', 'u-gold-t'));
    const m = el('div', 'u-main', p);
    D.resume = el('button', 'u-btn g wide', m, SVG.play + '<span>Devam Et</span>');
    D.difficultyBtn = el('button', 'u-btn p wide', m, '<span>Zorluk: Normal</span>');
    D.saveBtn = el('button', 'u-btn b wide', m, SVG.save + '<span>Kaydet</span>');
    D.pauseMap = el('button', 'u-btn p wide u-hide', m, '<span>🗺️ Geçit Haritası</span>');
    D.restart = el('button', 'u-btn o wide', m, SVG.again + '<span>Baştan Başla</span>');
    const dif = el('div', 'u-difficulty', p);
    el('div', 'u-difficulty-hint', dif, 'Seçimin hemen uygulanır.<br> İlerlemen ve eşyaların korunur.');
    const choices = el('div', 'u-difficulty-choices', dif);
    D.difficultyChoices = ['normal', 'hard'].map((id, i) => {
      const b = el('button', 'u-difficulty-choice', choices,
        `<strong>${i ? 'Zor' : 'Normal'}</strong><span>${i ? 'Daha güçlü ve saldırgan düşmanlar.<br>Daha sert boss yetenekleri.' : 'Dengeli bir macera.<br>Daha rahat dövüşler.'}</span><small></small>`);
      b.dataset.difficulty = id;
      b.setAttribute('aria-pressed', 'false');
      onPress(b, () => {
        const g = M.GAME;
        if (g && g.setDifficulty && g.setDifficulty(id)) syncDifficulty();
        else nope(b);
      }, { menu: true });
      return b;
    });
    el('div', 'u-difficulty-note', dif, 'İki zorlukta da Mola → Kaydet ile kaydedebilirsin.');
    D.difficultyBack = el('button', 'u-btn p wide', dif, SVG.close + '<span>Geri</span>');
    // Restart question: the small red "Evet" only fires after a 2 s press-and-hold.
    const ask = el('div', 'u-ask', p);
    D.askText = el('div', 'u-asktxt', ask, 'Yeniden en baştan<br>başlansın mı?');
    const yb = el('div', 'u-yesbox', ask);
    D.yes = el('button', 'u-btn r u-small', yb, '<span class="u-hfill"></span>' + SVG.again + '<span>Evet</span>');
    el('div', 'u-yeshint', yb, 'Basılı tut');
    D.no = el('button', 'u-btn g wide', ask, SVG.close + '<span>Hayır</span>');
  }
  function syncDifficulty() {
    const hard = M.GAME && M.GAME.difficulty === 'hard', name = hard ? 'Zor' : 'Normal';
    if (D.difficultyTag) {
      D.difficultyTag.textContent = name;
      D.difficultyTag.classList.toggle('hard', !!hard);
    }
    if (D.difficultyBtn) D.difficultyBtn.textContent = 'Zorluk: ' + name;
    if (D.difficultyChoices) D.difficultyChoices.forEach(b => {
      const selected = b.dataset.difficulty === (hard ? 'hard' : 'normal');
      b.setAttribute('aria-pressed', String(selected));
      b.querySelector('small').textContent = selected ? '✓ Seçili' : 'Seç';
    });
  }
  function openDifficulty() {
    closeAsk(); syncDifficulty();
    D.pausePanel.classList.add('choosing-difficulty');
    D.pauseTitle.innerHTML = ol('Zorluk', 'u-gold-t');
  }
  function closeDifficulty() {
    D.pausePanel.classList.remove('choosing-difficulty');
    D.pauseTitle.innerHTML = ol('Mola', 'u-gold-t');
    syncDifficulty();
  }
  function buildMerchant(root) {
    const s = D.shop = el('div', 'u-screen u-dim', root);
    const p = el('div', 'u-panel u-shop-panel', s);
    const head = el('div', 'u-shop-head', p);
    el('div', 'u-shop-seal', head, '☾');
    const name = el('div', '', head);
    el('div', 'u-shop-kicker', name, 'HER EMANETİN BİR BEDELİ VAR');
    el('div', 'u-ptitle', name, ol('Kül Tüccarı', 'u-gold-t'));
    el('div', 'u-shop-greeting', name, '“Sikkelerin varsa, savaşın henüz bitmedi.”');
    D.shopGold = el('div', 'u-shop-gold', p);
    D.shopOffers = el('div', 'u-shop-offers', p);
    D.shopStatus = el('div', 'u-shop-status', p, 'Kılıç ve değnek güçlendirmeleri ortak 2 kullanım hakkına sahiptir.');
    D.shopStatus.setAttribute('role', 'status'); D.shopStatus.setAttribute('aria-live', 'polite');
    const foot = el('div', 'u-shop-foot', p);
    el('div', 'u-shop-note', foot, 'Alışverişte oyun durur. İlerlemeni Mola → Kaydet ile saklayabilirsin.');
    const back = el('button', 'u-btn g', foot, SVG.play + '<span>Yola Devam</span>');
    onPress(back, () => closeMenu(), { menu: true });
    s.addEventListener('pointerdown', e => { if (e.target === s) closeMenu(); });
    D.shopPrompt = el('button', 'u-merchant-prompt u-hide', D.hud, '⚒ Kül Tüccarı · Alışveriş <small>E</small>');
    onPress(D.shopPrompt, () => { if (M.GAME) M.GAME.visitMerchant(); }, { menu: true });
    D.wardTag = el('div', 'u-ward-tag u-hide', D.tl, '⛓ Mezar Örtüsü · %8');
  }
  function renderMerchant() {
    const g = M.GAME, info = g && g.merchantInfo(); if (!info) return;
    D.shopGold.innerHTML = '<span class="u-coin"></span> ' + info.gold + ' altın <small>· Bu bölümün tezgâhı</small>';
    D.shopOffers.innerHTML = '';
    for (const o of info.offers) {
      const card = el('div', 'u-shop-card' + (!o.left ? ' sold' : ''), D.shopOffers);
      el('div', 'u-shop-icon', card, o.id === 'potion' ? SVG.potion : o.id === 'ward' ? skillGlyph('isikbagi') : skillGlyph('gokkusagimuhru'));
      const text = el('div', 'u-shop-copy', card);
      el('strong', '', text, esc(o.name));
      el('span', '', text, esc(o.text));
      el('small', '', text, (o.id === 'weapon' || o.id === 'offhand' ? 'Ortak hak: ' : 'Kalan: ') + o.left);
      const b = el('button', 'u-shop-buy', card, `<b>${o.price} <span class="u-coin"></span></b><span>${esc(o.reason || 'Satın Al')}</span>`);
      b.disabled = !o.enabled; b.dataset.offer = o.id;
      b.setAttribute('aria-label', `${o.name}, ${o.price} altın, ${o.reason || 'satın al'}`);
      const buy = () => {
        if (b.disabled || performance.now() < S.guardUntil) return;
        if (g.buyMerchant(o.id)) {
          S.guardUntil = performance.now() + 450;
          renderMerchant(); D.shopStatus.textContent = '◆ ' + o.name + ' alındı.';
          portraitSoon(0); bump(D.shopGold, 1.06);
        } else { renderMerchant(); D.shopStatus.textContent = 'Bu alışveriş şu an yapılamıyor.'; }
      };
      onPress(b, buy, { menu: true });
      b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buy(); } });
    }
  }
  function openMerchant() {
    if (!canMenu() || !M.GAME.merchantNear()) return;
    S.menu = 'merchant'; setPaused(true); renderMerchant();
    D.shopStatus.textContent = 'Her silah en fazla 2 kez güçlenir. Her tezgâhta ortak 2 güçlendirme hakkı vardır.';
    showScreen(D.shop, true);
  }

  function buildBag(root) {
    const s = D.bagS = el('div', 'u-screen u-dim', root);
    const p = D.bagP = el('div', 'u-panel u-bag', s);
    D.bagClose = el('button', 'u-rbtn u-close', p, SVG.close);
    const l = el('div', 'u-bagl', p);
    D.bagFace = el('div', 'u-bagface', l, '<span class="u-femo">🧒</span>');
    const meta = el('div', 'u-bagmeta', l);
    el('div', 'u-bagname', meta, ol('Feza', 'u-gold-t'));
    D.bagChips = el('div', 'u-chips', meta);
    const r = el('div', 'u-bagr', p);
    el('div', 'u-bagtitle', r, ol('Cephanelik', 'u-gold-t'));
    D.slots = {};
    for (const sl of SLOTS) {
      const box = el('div', 'u-slot', r);
      const hd = el('div', 'u-slothd', box, `<span>${SLOT_EMO[sl]} ${SLOT_AD[sl]}</span><small></small>`);
      D.slots[sl] = { label: hd.firstChild, hdName: hd.querySelector('small'), tiles: el('div', 'u-tiles', box) };
    }
  }
  function buildWin(root) {
    const s = D.win = el('div', 'u-screen u-dim u-win', root);
    D.conf = el('div', 'u-conf', s);
    const wrap = el('div', 'u-wwrap', s);
    el('div', 'u-rays', wrap);
    const p = el('div', 'u-panel', wrap);
    el('div', 'u-wcry', p, `<svg viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 5L103 30L113 67L87 103L60 115L29 101L7 65L19 29Z" fill="#201b25" stroke="#8d6b67" stroke-width="3"/>
      <path d="M29 16L38 36L91 89L83 100L72 91L22 38L16 25ZM94 16L82 35L28 88L37 99L49 90L98 36L104 24Z" fill="#b0a49b" stroke="#302631" stroke-width="3"/>
      <path d="M29 23L85 88M95 23L36 87" stroke="#ded2bf" stroke-width="2"/>
      <path d="M21 72L47 98M73 98L101 70" stroke="#80534f" stroke-width="7"/>
      <path d="M60 37L75 50L70 74L60 85L48 74L45 50Z" fill="#5e293b" stroke="#b28577" stroke-width="2"/>
      <path d="M60 46V72M52 57L60 66L68 57M55 75L60 80L65 75" fill="none" stroke="#c6a096" stroke-width="2"/>
      <path d="M13 57L28 60M91 59L107 56M58 8L58 26M59 95L61 109" stroke="#70404f" stroke-width="3"/>
    </svg>`);
    el('div', 'u-ptitle', p, ol('Savaş Bitti. Bedeli Kaldı.', 'u-gold-t'));
    el('div', 'u-wsub', p, 'Masumların sesi sustu. Senin iraden susmadı.');
    D.winBoss = el('div', 'u-wboss', p);   // every zone's boss, cheered up (portraits)
    D.winChips = el('div', 'u-chips', p);
    D.again = el('button', 'u-btn g wide', p, SVG.play + '<span>Tekrar Yola Çık</span>');
    D.winMap = el('button', 'u-btn b wide u-hide', p, '<span>🗺️ İstediğin Yere Git</span>');
    D.winMapHint = el('div', 'u-dream-unlock u-hide', p, 'Geçit haritan açıldı! Bir adaya dokun, yeniden keşfet.');
  }

  // The dream atlas is made from local SVG artwork: it also works offline and from file://.
  const DREAM_PLACES = [
    ['tuvalet', 'Paslı Hamam', 'Pas ve zehirle kapanan geçit', '#67ded6', 14, 29],
    ['ay', 'Kül Ayı', 'Sönmüş yıldızların altında av', '#c9b7f6', 38, 25],
    ['orman', 'Yas Ormanı', 'Kuru dalların arasında kayıp ruhlar', '#82ce82', 62, 29],
    ['kefir', 'Çürüme Vadisi', 'Zehir akıntıları ve gömülmüş mezarlar', '#f3d49b', 86, 25],
    ['magara', 'Fısıltı Madenleri', 'Çökmüş galerilerde yankılanan fısıltılar', '#9fb6ec', 86, 69],
    ['yanardag', 'Kül Ocağı', 'Kırık örs ve köz nöbetçileri', '#f6a888', 62, 73],
    ['sehir', 'Veba Şehri', 'Karantina sokakları ve boş kafesler', '#dfa5c5', 38, 69],
    ['kale', 'Merhametsiz Kale', 'Tutsak tahtın son gölgesi', '#e3b4ed', 14, 73]
  ];
  function dreamArt(id, color) {
    const n=DREAM_PLACES.findIndex(p=>p[0]===id),col=['#879386','#8e7e9d','#70816e','#8e9070','#7a8095','#a77765','#8b7183','#827386'][n]||'#827386';
    const scene=id==='ay'?'<circle cx="85" cy="76" r="41" fill="#514956"/><circle cx="72" cy="61" r="11" fill="#343139"/><circle cx="102" cy="91" r="15" fill="#343139"/>':id==='orman'?'<path d="M43 119V49M43 69L22 50M43 85L65 63M132 119V40M132 66L112 49M132 83L150 65" stroke="#4a5049" stroke-width="9" fill="none"/>':id==='yanardag'?'<path d="M20 126L66 50H106L155 126Z" fill="#4b3f3e"/><path d="M65 50L84 77L106 50M84 77L74 110L100 127" stroke="#b16c51" stroke-width="7" fill="none"/>':'<path d="M25 122V64H48V43H70V70H108V42H132V62H155V122Z" fill="#41414a" stroke="#71696b" stroke-width="3"/><path d="M69 123V93Q90 62 111 93V123" fill="#24242c"/>';
    return '<svg viewBox="0 0 180 150" aria-hidden="true"><ellipse cx="90" cy="124" rx="77" ry="18" fill="#25252d" stroke="'+col+'" stroke-width="2"/>'+scene+'<path d="M76 91Q73 69 90 67Q108 69 104 91L98 99V108H82V99Z" fill="#b0a28d"/><path d="M79 83L86 84M94 84L101 83M87 92L90 88L93 92M86 100V107M94 100V107" stroke="#343039" stroke-width="3" fill="none"/></svg>';
  }
  function accessiblePress(b, fn, menu = true) {
    onPress(b, fn, { menu });
    b.addEventListener('keydown', e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); fn(); } });
  }
  function mapUnlocked() { return !!(M.GAME && M.GAME.mapUnlocked && safe('mapUnlocked', () => M.GAME.mapUnlocked())); }
  function syncDreamUnlock() {
    const unlocked = mapUnlocked();
    [D.dreamBtn, D.titleMap, D.pauseMap, D.winMap, D.winMapHint].forEach(b => { if (b) b.classList.toggle('u-hide', !unlocked); });
  }
  function buildDreamMap(root) {
    D.dreamScreen = el('div', 'u-screen u-dream-screen', root);
    D.dreamScreen.setAttribute('role', 'dialog'); D.dreamScreen.setAttribute('aria-modal', 'true'); D.dreamScreen.setAttribute('aria-labelledby', 'dreamTitle');
    const panel = el('div', 'u-dream-panel', D.dreamScreen);
    el('span', 'u-dream-kicker', panel, 'FEZA VE BİLBO’NUN');
    const heading = el('h2', 'u-dream-title', panel, 'Geçit Haritası'); heading.id = 'dreamTitle';
    el('p', 'u-dream-hint', panel, 'Bir bölge seç. Açılan geçitler seni bekliyor.');
    const board = D.dreamBoard = el('div', 'u-dream-board', panel);
    const sky = el('div', 'u-dream-starfield', board);
    sky.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 32; i++) {
      const star = el('i', 'u-dream-star' + (i % 5 === 0 ? ' bright' : ''), sky, i % 5 === 0 ? '✦' : '');
      star.style.left = ((i * 47 + 7) % 97 + 1) + '%'; star.style.top = ((i * 31 + 11) % 93 + 2) + '%';
      star.style.setProperty('--star-delay', (-i * .37) + 's'); star.style.setProperty('--star-time', (3.4 + i % 6 * .55) + 's');
    }
    el('div', 'u-dream-ornaments', board, '<svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#d7d5ff" stroke-width="1" opacity=".32"><path d="M45 74L82 40L114 64L151 43M701 52L734 31L758 53L797 28M433 498L464 474L488 513L518 488M30 383L51 354L73 379L94 350"/></g><g fill="#efe3bc" opacity=".55"><circle cx="45" cy="74" r="2.5"/><circle cx="82" cy="40" r="3"/><circle cx="114" cy="64" r="2"/><circle cx="151" cy="43" r="2.5"/><circle cx="701" cy="52" r="2"/><circle cx="734" cy="31" r="3"/><circle cx="758" cy="53" r="2"/><circle cx="797" cy="28" r="2.5"/><circle cx="433" cy="498" r="2"/><circle cx="464" cy="474" r="2.5"/><circle cx="488" cy="513" r="2"/><circle cx="518" cy="488" r="3"/></g><g fill="none" stroke="#b9e9df" stroke-width="1.2" opacity=".25"><path d="M90 296q24-12 48 0t48 0M732 294q24-12 48 0t48 0M358 374q20-10 40 0t40 0M180 472q20-10 40 0t40 0"/><path d="M90 308q24-12 48 0t48 0M732 306q24-12 48 0t48 0"/></g><g fill="#dcc6e8" opacity=".35"><path d="M578 287q-17-10-23 4q19 4 23-4q15-11 21 2q-18 8-21-2"/><path d="M205 47q-15-8-19 4q16 3 19-4q14-9 18 3q-16 5-18-3"/></g></svg>');
    el('div', 'u-dream-compass', board, '<span>✦</span><small>GEÇİT</small>');
    el('div', 'u-dream-route', board, '<svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true"><path d="M140 162Q250 58 380 140T620 162Q750 40 860 140Q985 263 860 386Q745 494 620 409T380 386Q256 506 140 409" fill="none" stroke="#d1bbef" stroke-width="13" stroke-opacity=".13"/><path d="M140 162Q250 58 380 140T620 162Q750 40 860 140Q985 263 860 386Q745 494 620 409T380 386Q256 506 140 409" fill="none" stroke="#ffebb0" stroke-width="3" stroke-dasharray="5 13" stroke-linecap="round"/></svg>');
    D.dreamPlaces = DREAM_PLACES.map(([id, name, detail, color, x, y], i) => {
      const b = el('button', 'u-dream-island', board, dreamArt(id, color) + `<span class="u-island-sparkles" aria-hidden="true"><i>✧</i><i>✦</i><i>✧</i></span><span class="u-island-name">${esc(name)}</span><span class="u-island-number">${i + 1}</span><span class="u-island-current">Buradasın</span>`);
      b.style.setProperty('--spark-delay', (-i * .7) + 's');
      b.style.setProperty('--ix', x + '%'); b.style.setProperty('--iy', y + '%'); b.style.setProperty('--island-color', color);
      b.dataset.zone = id; b.setAttribute('aria-label', name + ': ' + detail); b.title = detail;
      accessiblePress(b, () => travelTo(i));
      return b;
    });
    D.dreamClose = el('button', 'u-dream-close', panel, SVG.close + '<span>Geri Dön</span>');
    accessiblePress(D.dreamClose, closeDreamMap);
    D.dreamScreen.addEventListener('keydown', e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDreamMap(); }
      if (e.code === 'Tab') {
        const choices = [...D.dreamPlaces, D.dreamClose], at = choices.indexOf(document.activeElement);
        e.preventDefault(); e.stopPropagation(); choices[(at + (e.shiftKey ? choices.length - 1 : 1)) % choices.length].focus();
      }
    });
  }
  function openDreamMap() {
    if (!mapUnlocked() || S.busy || S.menu === 'dream') return;
    if (S.mode === 'play' && !S.menu && !gameAllowsMenu()) return;
    S.dreamReturn = { menu: S.menu, paused: S.paused, focus: document.activeElement };
    if (S.menu) showScreen(S.menu === 'bag' ? D.bagS : S.menu === 'merchant' ? D.shop : D.pause, false);
    S.menu = 'dream'; setPaused(true);
    const current = M.GAME && M.GAME.P && M.GAME.P.zone;
    D.dreamPlaces.forEach((b, i) => { b.classList.toggle('current', S.mode === 'play' && i === current); });
    showScreen(D.dreamScreen, true); D.dreamClose.focus({ preventScroll: true });
  }
  function closeDreamMap() {
    if (S.menu !== 'dream') return;
    showScreen(D.dreamScreen, false);
    const back = S.dreamReturn || {}; S.menu = back.menu || null; setPaused(!!back.paused);
    if (S.menu) showScreen(S.menu === 'bag' ? D.bagS : S.menu === 'merchant' ? D.shop : D.pause, true);
    if (back.focus && back.focus.focus) back.focus.focus({ preventScroll: true });
    S.dreamReturn = null;
  }
  async function travelTo(index) {
    const g = M.GAME;
    if (!g || !g.travelTo || !mapUnlocked() || S.busy) return;
    S.busy = true;
    try {
      await fade(1, 0.4, 'load');
      aud('stopVoice'); ensureTex(index);
      clearBanners(); clearCards(); hideBoss(); S.cine = null;
      const ok = await g.travelTo(index);
      if (ok === false) { fade(0, 0.4, null); return; }
      showScreen(D.dreamScreen, false); showScreen(D.win, false); showScreen(D.pause, false); showScreen(D.shop, false); showScreen(D.bagS, false);
      S.menu = null; S.dreamReturn = null; setPaused(false); setMode('play');
      D.conf.innerHTML = '';
      refreshAllSkills(); portraitSoon(0); renderNow(); await frames(2); fade(0, 0.6, null);
    } catch (e) { warn('dream travel', e); fade(0, 0.4, null); }
    finally { S.busy = false; }
  }
  function throwBone() {
    const g = M.GAME; if (!g || !playing() || !g.bone) return;
    if (safe('bone', () => g.bone())) bump(D.boneBtn, 1.15, true); else nope(D.boneBtn, true);
  }
  function buildDreamTravel(root) {
    D.dreamTravel = el('div', 'u-screen u-dream-travel', root);
    D.dreamTravel.setAttribute('role', 'img');
    D.travelArt = el('div', 'u-dream-travel-art', D.dreamTravel);
  }
  function journeyArt(forest) {
    return `<svg viewBox="0 0 760 310" aria-hidden="true"><defs><linearGradient id="journeySky" x2="1" y2="1"><stop stop-color="${forest ? '#315768' : '#32677b'}"/><stop offset="1" stop-color="#453466"/></linearGradient><linearGradient id="rocketBody" x2="1" y2="0"><stop stop-color="#f5edd6"/><stop offset=".5" stop-color="#fffceb"/><stop offset="1" stop-color="#b4dcd6"/></linearGradient></defs>
    <g class="u-journey-distant-stars" fill="#eae4ff">${Array.from({ length: 35 }, (_, i) => `<circle cx="${(i * 113 + 27) % 750}" cy="${(i * 47 + 14) % 287}" r="${i % 4 === 0 ? 1.5 : .75}" opacity="${.25 + i % 5 * .12}"/>`).join('')}</g>
    <g fill="#ffedb0"><path d="M122 44l3 9 10 2-8 6 2 10-7-6-9 5 3-10-7-6 10-1Z"/><path d="M483 74l3 9 10 2-8 6 2 10-7-6-9 5 3-10-7-6 10-1Z"/><circle cx="571" cy="39" r="3"/><circle cx="203" cy="60" r="2"/><circle cx="68" cy="170" r="3"/><circle cx="520" cy="183" r="3"/><circle cx="707" cy="133" r="2"/></g>
    ${forest ? '<g transform="translate(607 127)"><circle r="64" fill="#8bcb9c"/><path d="M-38 37l15-63 18 63M-9 30l20-75 22 75M20 39l14-58 18 58" fill="#438d70"/><path d="M-53 45q52-24 107 0" fill="none" stroke="#e3d69a" stroke-width="5"/></g>' : '<g transform="translate(614 108)"><circle r="62" fill="#efebd3"/><ellipse cx="-23" cy="-20" rx="12" ry="9" fill="#c7c4b4"/><ellipse cx="21" cy="21" rx="19" ry="12" fill="#cfccba"/><circle cx="-16" cy="33" r="8" fill="#cfccba"/></g>'}
    <path class="u-journey-path" d="M257 225Q434 314 601 171" fill="none" stroke="#fff1b6" stroke-width="3" stroke-dasharray="5 10" opacity=".7"/>
    <g class="u-journey-ground"><ellipse cx="165" cy="272" rx="90" ry="15" fill="${forest ? '#d8cff1' : '#94ded9'}"/><path d="M74 272h181l-24 23H95Z" fill="#7c83a5"/><g fill="#d5fff6" stroke="#90cccb"><circle cx="79" cy="232" r="14"/><circle cx="250" cy="239" r="18"/><circle cx="61" cy="269" r="10"/></g></g>
    <g class="u-journey-rocket" transform="translate(285 157) rotate(24)">
      <path class="u-rocket-flame" d="M-24 78Q-25 116 0 139Q25 113 23 78" fill="#ffe6a0"/><path class="u-rocket-flame" d="M-13 83Q-12 112 0 119Q12 108 13 83" fill="#9de6ef"/>
      <path d="M-38 16Q-67 37-70 77L-29 58M38 16Q67 37 70 77L29 58" fill="${forest ? '#82c4a7' : '#e2a2bb'}" stroke="#f8e5ab" stroke-width="3"/>
      <path d="M0-99Q-51-65-43 20L-31 81H31L43 20Q51-65 0-99Z" fill="url(#rocketBody)" stroke="#efd9a0" stroke-width="4"/>
      <path d="M0-99Q-23-83-35-56H35Q24-84 0-99Z" fill="${forest ? '#6fb99f' : '#d790ab'}"/><path d="M-34 64H34L30 83H-30Z" fill="#d1ac72"/>
      <circle cy="-6" r="36" fill="#508baf" stroke="#d5b476" stroke-width="7"/><circle cy="-6" r="30" fill="#91dfe2"/>
      <g class="u-journey-passengers"><g transform="translate(-11 -8)"><circle cy="-6" r="13" fill="#ffd2ac"/><path d="M-13-6q-3-20 12-19q17-2 14 17l-9-7-9 5" fill="#83553b"/><circle cx="-5" cy="-5" r="1.7" fill="#473347"/><circle cx="5" cy="-5" r="1.7" fill="#473347"/><path d="M-4 2q4 4 8 0" stroke="#a96965" fill="none" stroke-width="1.5"/><path d="M-12 16q11-17 23 0" fill="#ffd879"/></g>
      <g transform="translate(15 7)"><ellipse rx="13" ry="14" fill="#deb07c"/><ellipse cx="-11" cy="0" rx="5" ry="12" fill="#926341"/><ellipse cx="11" cy="0" rx="5" ry="12" fill="#926341"/><circle cx="-4" cy="-2" r="1.7" fill="#44313e"/><circle cx="4" cy="-2" r="1.7" fill="#44313e"/><ellipse cy="4" rx="3" ry="2" fill="#44313e"/></g></g>
      <path d="M-9 44l9-10 9 10-9 9Z" fill="#c0b0ef"/><circle cx="-31" cy="36" r="3" fill="#f9d88b"/><circle cx="31" cy="36" r="3" fill="#f9d88b"/>
      ${forest ? '<path d="M-61 64q10-31 30-24q-8 20-30 24M61 64Q51 33 31 40Q39 60 61 64" fill="#a0d7a8" stroke="#69a88e" stroke-width="2"/>' : ''}
    </g>
    <g class="u-boarding-feza" transform="translate(160 214)"><path d="M-8 19l-5 25M9 19l6 25" stroke="#4f8eb1" stroke-width="12" stroke-linecap="round"/><path d="M-20 45h13M10 45h14" stroke="#f09380" stroke-width="7" stroke-linecap="round"/><path d="M-15-4Q0-13 14-4l3 28h-34Z" fill="#ffdc81" stroke="#bc9b67" stroke-width="2"/><path d="M-13 3l-10 12M12 2l16-12" stroke="#f8cba6" stroke-width="8" stroke-linecap="round"/><circle cy="-22" r="17" fill="#ffd3ac"/><path d="M-17-21q-4-24 16-24q21-1 18 23L7-32-5-27-10-33Z" fill="#83553b"/><circle cx="-5" cy="-22" r="2" fill="#473347"/><circle cx="6" cy="-22" r="2" fill="#473347"/><path d="M-5-13q6 6 12-1" stroke="#a96965" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M-8 6h16l-2 11H-6Z" fill="#f5b96e"/></g>
    <g class="u-boarding-bilbo" transform="translate(207 246)"><ellipse cx="0" cy="1" rx="21" ry="15" fill="#bf8d57"/><path d="M-12 9l-2 13M12 9l3 13" stroke="#c18b51" stroke-width="7" stroke-linecap="round"/><path d="M-20 1q-18-9-13-19" fill="none" stroke="#c18b51" stroke-width="7" stroke-linecap="round"/><ellipse cx="11" cy="-13" rx="16" ry="17" fill="#e0b27c"/><ellipse cx="-1" cy="-10" rx="6" ry="15" fill="#91643f" transform="rotate(14 -1 -10)"/><ellipse cx="24" cy="-10" rx="6" ry="14" fill="#91643f"/><ellipse cx="12" cy="-4" rx="10" ry="7" fill="#f5dcac"/><circle cx="6" cy="-16" r="2" fill="#44313e"/><circle cx="17" cy="-16" r="2" fill="#44313e"/><ellipse cx="12" cy="-7" rx="3" ry="2" fill="#44313e"/><path d="M0 1q12 5 22-2" fill="none" stroke="#60bfc2" stroke-width="4"/></g>
    </svg>`;
  }
  function showDreamTravel(d) {
    if (!d || typeof d.proceed !== 'function') return;
    if (S.dreamJourney) finishDreamTravel();
    if (S.menu) closeMenu();
    aud('stopVoice');
    const trip = S.dreamJourney = { proceed: d.proceed, forest: d.to === 'orman', flying: false, done: false, timers: [] };
    D.dreamTravel.setAttribute('aria-label', trip.forest ? 'Feza ve Bilbo yıldız yapraklı mekiğe binip ormana uçuyor.' : 'Feza ve Bilbo kül roketine binip Ay’a uçuyor.');
    D.dreamTravel.classList.toggle('forest', trip.forest);
    D.travelArt.innerHTML = journeyArt(trip.forest); D.travelArt.classList.remove('flying');
    S.menu = 'dream-travel'; setPaused(true); D.root.classList.add('journey-on'); showScreen(D.dreamTravel, true);
    trip.timers.push(setTimeout(() => launchDreamTravel(trip), 900));
  }
  function launchDreamTravel(expected) {
    const trip = S.dreamJourney; if (!trip || trip.done || trip.flying || (expected && expected !== trip)) return;
    trip.flying = true; D.travelArt.classList.add('flying');
    // The outgoing encounter can queue one last line on its transition frame.
    aud('stopVoice');
    aud('say', trip.forest ? 'mekik_yolculuk' : 'roket_yolculuk', { prio: 3, interrupt: true });
    trip.timers.push(setTimeout(() => finishDreamTravel(trip), 6100));
  }
  function finishDreamTravel(expected) {
    const trip = S.dreamJourney; if (!trip || trip.done || (expected && expected !== trip)) return;
    trip.done = true; trip.timers.forEach(clearTimeout); S.dreamJourney = null;
    aud('stopVoice');
    showScreen(D.dreamTravel, false); D.root.classList.remove('journey-on'); S.menu = null; setPaused(false); trip.proceed();
  }

  function wireButtons() {
    [D.dreamBtn, D.titleMap, D.pauseMap, D.winMap].forEach(b => accessiblePress(b, openDreamMap));
    accessiblePress(D.boneBtn, throwBone, false);
    onPress(D.playBtn, () => startGame(false), { menu: true });
    onPress(D.contBtn, () => startGame(true), { menu: true });
    onPress(D.tMus, () => setPref('music', !S.prefs.music), { menu: true });
    // ⏸: hold still 0.5 s, then lift (random taps near the top edge must not stop the game; a short tap only wiggles it).
    // 🎒: a quick tap. Longer or dragging presses on either are a steering finger and walk Feza instead (onCorner).
    onCorner(D.pauseBtn, () => openPause(), { hold: 0.5, max: 2.5, early: () => wiggle(D.pauseBtn) });
    onCorner(D.bagBtn, () => openBag(), { hold: 0, max: 0.8 });
    onPress(D.resume, () => closeMenu(), { menu: true });
    onPress(D.saveBtn, () => saveNow(), { menu: true });
    onPress(D.difficultyBtn, () => openDifficulty(), { menu: true });
    onPress(D.difficultyBack, () => closeDifficulty(), { menu: true });
    onPress(D.restart, () => askRestart(), { menu: true });
    onPress(D.no, () => closeAsk(), { menu: true });
    onHold(D.yes, 2, () => restartAll(), { menu: true });
    onPress(D.bagClose, () => closeMenu(), { menu: true });
    D.bagS.addEventListener('pointerdown', e => { if (e.target === D.bagS) closeMenu(); });
    D.pause.addEventListener('pointerdown', e => {
      S.askT = S.t;   // any touch keeps the restart question open a little longer
      if (e.target === D.pause && !D.pausePanel.classList.contains('asking')) closeMenu();
    }, true);
    onPress(D.again, () => playAgain(), { menu: true });
    // hold your own portrait 0.5 s, then lift → wardrobe (the item card no longer opens it: it slides over the play area)
    onCorner(D.face, () => openBag(), { hold: 0.5, max: 2.5 });
    // HUD action buttons (no rate limit: kids mash)
    onPress(D.atk, () => { attack(); S.atkHeld = true; S.atkNext = S.t + 0.34; }, { up: () => { S.atkHeld = false; } });
    onPress(D.pot, () => {
      const g = M.GAME; if (!g || !playing()) return;
      const ok = safe('potion', () => g.input.potion());
      if (ok) bump(D.pot, 1.18); else nope(D.pot);
    });
    D.sk.forEach((s, i) => onPress(s.b, () => {
      const g = M.GAME; if (!g || !playing()) return;
      const ok = safe('cast', () => g.input.cast(i));
      if (ok) { s.b.classList.remove('new'); bump(s.b, 1.15, true); } else nope(s.b, true);
    }));
  }
  function askRestart() {
    D.askText.innerHTML = 'Yeniden en baştan<br>başlansın mı?<small>Karakter seçimine dönülür.<br>Yeni oyun Normal zorlukta başlar.</small>';
    D.pausePanel.classList.add('asking'); S.askT = S.t; S.guardUntil = performance.now() + 800;
  }
  function closeAsk() {
    if (!D.pausePanel.classList.contains('asking')) return;
    D.pausePanel.classList.remove('asking'); S.guardUntil = performance.now() + 300;
    for (const h of HOLDS.slice()) if (h.b === D.yes) endHold(h);
  }
  const canMenu = () => S.mode === 'play' && !S.menu && !S.busy && gameAllowsMenu();
  function gameAllowsMenu() { const g = M.GAME; return !g || g.state === 'play' || g.state === 'dead'; }
  const playing = () => S.mode === 'play' && !S.menu;
  function attack() { const g = M.GAME; if (g && playing()) safe('attack', () => g.input.attack()); }

  // Small WAAPI juice (composited, no reflow)
  function bump(e, k = 1.2, centred) {
    const b = centred ? 'translate(-50%,-50%) ' : '';
    if (e.animate) e.animate([{ transform: b + 'scale(1)' }, { transform: b + `scale(${k})` }, { transform: b + 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  }
  function wiggle(e, centred) {
    const b = centred ? 'translate(-50%,-50%) ' : '';
    if (e.animate) e.animate([0, -7, 7, -5, 4, 0].map(x => ({ transform: b + `translateX(${x}px)` })), { duration: 300, easing: 'ease-out' });
  }
  function nope(e, centred) { wiggle(e, centred); sfx('nope', { vol: 0.5 }); }   // pressed, but it can't be used right now

  // ───────────────────────── Input ─────────────────────────
  function bindInput() {
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      steerFrom(e.pointerId, e.clientX, e.clientY);
    });
    const up = e => { if (e.pointerId === S.primary) releasePrimary(); };
    cv.addEventListener('pointermove', steerMove);
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    cv.addEventListener('lostpointercapture', up);
    cv.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());

    // Audio unlock: first pointerdown creates the context; pointerup/touchend/keydown (real activation on iOS) resume it.
    const unlock = () => {
      if (SILENT || !M.AUD) return;
      const A = M.AUD;
      if (A.ready && A.ready()) { for (const ev of UNLOCK_EVS) removeEventListener(ev, unlock, true); return; }
      safe('unlock', () => A.unlock());
    };
    const UNLOCK_EVS = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    if (!SILENT) for (const ev of UNLOCK_EVS) addEventListener(ev, unlock, true);

    // Keyboard fallback
    const K = { left: false, right: false, up: false, down: false };
    const DIRS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
    let kx = 0, kz = 0;
    const sendKeys = () => {
      const x = (K.right ? 1 : 0) - (K.left ? 1 : 0), z = (K.down ? 1 : 0) - (K.up ? 1 : 0);
      if (x === kx && z === kz) return;
      kx = x; kz = z;
      if (M.GAME) safe('input.key', () => M.GAME.input.key(playing() ? x : 0, playing() ? z : 0));
    };
    S.clearKeys = () => {
      K.left = K.right = K.up = K.down = false; kx = kz = 0;
      if (M.GAME) safe('input.key', () => M.GAME.input.key(0, 0));
    };
    addEventListener('keydown', e => {
      const c = e.code;
      if (!D.root.classList.contains('kbd')) D.root.classList.add('kbd');   // a keyboard is in use: show 1 2 3 on the skills, Q on the potion
      if (e.key === '.' || c === 'NumpadDecimal') { if (!e.repeat) toggleFps(); e.preventDefault(); return; }   // by character: '.' sits elsewhere on a Turkish keyboard
      if (S.menu === 'dream') return;
      if (S.menu === 'dream-travel') { e.preventDefault(); return; }
      if (!e.repeat && c === 'KeyM' && mapUnlocked()) { e.preventDefault(); openDreamMap(); return; }
      if (S.mode === 'choose') {
        if (c === 'Escape') { e.preventDefault(); closeChoice(); }
        else if (c === 'ArrowLeft' || c === 'ArrowRight') {
          e.preventDefault(); const at = D.heroes.indexOf(document.activeElement), n = D.heroes.length;
          D.heroes[(Math.max(0, at) + (c === 'ArrowLeft' ? n - 1 : 1)) % n].focus();
        }
        else if (c === 'Tab') {
          const choices = [...D.heroes, D.choiceBack], at = choices.indexOf(document.activeElement);
          e.preventDefault(); choices[(at + (e.shiftKey ? choices.length - 1 : 1)) % choices.length].focus();
        } else if (!e.repeat && (c === 'Enter' || c === 'Space')) {
          e.preventDefault(); if (document.activeElement === D.choiceBack) closeChoice();
          else startGame(false, document.activeElement.dataset.heroClass || 'warrior');
        }
        return;
      }
      if (DIRS[c]) { K[DIRS[c]] = true; sendKeys(); e.preventDefault(); return; }
      if (e.repeat) { if (c === 'Space') e.preventDefault(); return; }
      if (c === 'Escape') {
        if (S.menu === 'pause' && D.pausePanel.classList.contains('choosing-difficulty')) closeDifficulty();
        else if (S.menu === 'pause' && D.pausePanel.classList.contains('asking')) closeAsk();
        else if (S.menu) closeMenu(); else if (S.mode === 'play') openPause();
        return;
      }
      if (S.mode === 'title' && (c === 'Enter' || c === 'Space')) { e.preventDefault(); startGame(false); return; }
      if (!playing()) return;
      if (c === 'Space') { e.preventDefault(); attack(); bump(D.atk, 1.1, true); }
      else if (c === 'KeyK') { e.preventDefault(); throwBone(); }
      else if (/^Digit[1-6]$/.test(c)) { const i = +c.slice(5) - 1, s = D.sk[i]; if (s && s.shown) { const ok = safe('cast', () => M.GAME.input.cast(i)); if (ok) { s.b.classList.remove('new'); bump(s.b, 1.15, true); } } }
      else if (c === 'KeyE') { if (M.GAME.visitMerchant) M.GAME.visitMerchant(); }
      else if (c === 'KeyQ') { if (safe('potion', () => M.GAME.input.potion())) bump(D.pot, 1.18); }
      else if (c === 'KeyB' || c === 'KeyI') openBag();
    });
    addEventListener('keyup', e => { const d = DIRS[e.code]; if (d) { K[d] = false; sendKeys(); } });
    addEventListener('blur', () => { K.left = K.right = K.up = K.down = false; sendKeys(); releasePrimary(); S.atkHeld = false; });
    document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'play' && !S.menu) openPause(); });
    const touched = () => { S.titleIdle = 0; };   // title voice prompt waits for a quiet moment
    addEventListener('pointerdown', touched, true); addEventListener('keydown', touched, true);
  }
  // Start steering with this finger (canvas press, or a HUD corner press handed over by onCorner).
  function steerFrom(id, x, y) {
    if (S.primary !== null) {   // another finger is steering; take over only if its events went silent (lost pointerup)
      if (performance.now() - S.primaryT < 1000) return false;
      releasePrimary();
    }
    if (!playing()) return false;
    S.primary = id; S.primaryT = performance.now();
    try { renderer.domElement.setPointerCapture(id); } catch (err) { /* ignore */ }
    const g = M.GAME; if (g) safe('input.down', () => g.input.down(x, y));
    return true;
  }
  function steerMove(e) {
    if (e.pointerId !== S.primary || !M.GAME) return;
    S.primaryT = performance.now();
    safe('input.move', () => M.GAME.input.move(e.clientX, e.clientY));
  }
  function releasePrimary() {
    if (S.primary === null) return;
    S.primary = null;
    if (M.GAME) safe('input.up', () => M.GAME.input.up());
  }

  // ───────────────────────── Layout ─────────────────────────
  function onResize() {
    const w = innerWidth, h = innerHeight;
    const k = clamp(Math.min(w, h) / 800, 0.6, 1.12);
    document.documentElement.style.setProperty('--k', k.toFixed(3)); S.uk = k;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    D.root.classList.toggle('submid', w > h && w - (300 + 290) * k - 40 < 470);   // narrow landscape: subtitles sit right of the orb
    orbResize(); mapResize();
    measureBossBar(); subPlace();
    if (BN.on) pipsPlace();
    S.needRender = true;
  }
  // Lowest screen y the boss bar covers (layout box, ignores its drop-in transform): the boss camera keeps the dragon below it.
  function measureBossBar() { S.bossTop = D.boss.offsetTop + D.boss.offsetHeight + 10; }
  // Layout box of a HUD element in screen px (ignores transforms such as the HUD's slide-in; #ui is fixed at 0,0).
  function layBox(e, out) {
    let x = 0, y = 0, n = e;
    while (n && n !== D.root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    out.l = x; out.t = y; out.r = x + e.offsetWidth; out.b = y + e.offsetHeight;
    return out;
  }

  // ───────────────────────── Health orb (canvas) ─────────────────────────
  const ORB = { px: 0, back: null, front: null, grad: null, shown: 1, target: 1, t: 0, hurt: 0, heal: 0, acc: 1 };
  function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function orbResize() {
    const css = D.orb.clientWidth || 190, px = Math.max(64, Math.round(css * S.dpr));
    if (px === ORB.px) return;
    ORB.px = px; ORB.acc = 1; D.orbCv.width = D.orbCv.height = px;
    const cx = px / 2, R = px * 0.37;
    // back: empty dark glass
    ORB.back = cnv(px); let c = ORB.back.getContext('2d');
    let g = c.createRadialGradient(cx, cx * 0.92, R * 0.05, cx, cx, R);
    g.addColorStop(0, '#4d1024'); g.addColorStop(0.7, '#260612'); g.addColorStop(1, '#10020a');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.fill();
    // liquid shading
    ORB.grad = D.orbCv.getContext('2d').createRadialGradient(cx - R * 0.34, cx - R * 0.12, R * 0.08, cx, cx + R * 0.1, R * 1.08);
    ORB.grad.addColorStop(0, '#bf6b58'); ORB.grad.addColorStop(0.32, '#a12e2f'); ORB.grad.addColorStop(0.72, '#701f27'); ORB.grad.addColorStop(1, '#361019');
    // front: inner shadow, glass highlights, ornate gold rim with studs and a heart plaque
    ORB.front = cnv(px); c = ORB.front.getContext('2d');
    g = c.createRadialGradient(cx, cx, R * 0.62, cx, cx, R);
    g.addColorStop(0, 'rgba(30,0,12,0)'); g.addColorStop(1, 'rgba(30,0,12,0.6)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.clip();
    c.translate(cx - R * 0.3, cx - R * 0.46); c.rotate(-0.55);
    g = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,0.62)'); g.addColorStop(0.6, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.scale(1, 0.55); c.beginPath(); c.arc(0, 0, R * 0.5, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(cx - R * 0.5, cx - R * 0.42, R * 0.06, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,190,205,0.35)'; c.lineWidth = R * 0.05; c.lineCap = 'round';
    c.beginPath(); c.arc(cx, cx, R * 0.86, 0.2, 1.25); c.stroke();
    // rim
    const rr = R * 1.1, rw = R * 0.2;
    let rg;
    if (c.createConicGradient) {
      rg = c.createConicGradient(-Math.PI / 2, cx, cx);
      [['#c7b59c', 0], ['#987856', 0.1], ['#544539', 0.2], ['#ad8d69', 0.32], ['#d0c1a8', 0.42], ['#846147', 0.55], ['#493d35', 0.66], ['#a68b6b', 0.78], ['#c7b59c', 0.9], ['#c7b59c', 1]].forEach(([col, o]) => rg.addColorStop(o, col));
    } else {
      rg = c.createLinearGradient(0, 0, px, px); rg.addColorStop(0, '#c7b59c'); rg.addColorStop(0.5, '#987856'); rg.addColorStop(1, '#544539');
    }
    c.lineWidth = rw; c.strokeStyle = rg; c.beginPath(); c.arc(cx, cx, rr, 0, TAU); c.stroke();
    c.lineWidth = Math.max(1.5, px * 0.012); c.strokeStyle = 'rgba(70,30,4,0.95)';
    c.beginPath(); c.arc(cx, cx, rr + rw / 2, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cx, rr - rw / 2, 0, TAU); c.stroke();
    c.lineWidth = rw * 0.18; c.strokeStyle = 'rgba(255,252,225,0.75)';
    c.beginPath(); c.arc(cx, cx, rr + rw * 0.2, Math.PI * 1.05, Math.PI * 1.55); c.stroke();
    c.lineWidth = rw * 0.12; c.strokeStyle = 'rgba(90,45,5,0.45)';
    c.beginPath(); c.arc(cx, cx, rr - rw * 0.15, Math.PI * 0.05, Math.PI * 0.55); c.stroke();
    const stud = (x, y, r, col) => {
      const sg = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.35, col); sg.addColorStop(1, shade(col, -0.55));
      c.fillStyle = sg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.lineWidth = Math.max(1, r * 0.22); c.strokeStyle = 'rgba(70,30,4,0.9)'; c.stroke();
    };
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 4;
      if (i === 4) continue;
      stud(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, rw * (i % 2 ? 0.34 : 0.42), i % 2 ? '#978773' : '#705b50');
    }
    // heart plaque at the bottom
    const hy = cx + rr, hr = R * 0.23;
    stud(cx, hy, hr, '#a58a67');
    c.save(); c.translate(cx, hy + hr * 0.08); c.scale(hr / 12, hr / 12);
    c.beginPath();c.moveTo(0,-9);c.lineTo(6,-1);c.lineTo(0,9);c.lineTo(-6,-1);c.closePath();
    const hg = c.createLinearGradient(0, -7, 0, 7); hg.addColorStop(0, '#be7059'); hg.addColorStop(1, '#712127');
    c.fillStyle = hg; c.fill(); c.lineWidth = 1.6; c.strokeStyle = '#5a0010'; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(-3.4, -3.6, 1.6, 0, TAU); c.fill();
    c.restore();
  }
  // Liquid surface path (hoisted: no per-frame closures)
  function orbWave(c, cx, R, lvl, amp, t, ph, k1, s1, k2, s2) {
    c.beginPath(); c.moveTo(cx - R, cx + R + 2);
    for (let i = 0; i <= 24; i++) {
      const x = cx - R + (2 * R * i) / 24, u = (x - cx) / R;
      c.lineTo(x, lvl + amp * Math.sin(u * k1 + t * s1 + ph) + amp * 0.45 * Math.sin(u * k2 - t * s2 + ph * 1.7));
    }
    c.lineTo(cx + R, cx + R + 2); c.closePath();
  }
  function orbDraw(dt) {
    if (!ORB.px) return;
    ORB.t += dt; ORB.acc += dt;
    const falling = ORB.target < ORB.shown;
    ORB.shown = damp(ORB.shown, ORB.target, falling ? 7 : 3.2, dt);
    ORB.hurt = Math.max(0, ORB.hurt - dt * 2.8); ORB.heal = Math.max(0, ORB.heal - dt * 1.6);
    // calm orb (only the waves move): redraw at ~30 Hz; while it fills/drains or flashes, every frame
    const busy = ORB.hurt > 0 || ORB.heal > 0 || Math.abs(ORB.shown - ORB.target) > 0.002;
    if (!busy && ORB.acc < 1 / 31) return;
    ORB.acc = 0;
    const c = D.orbCv.getContext('2d'), px = ORB.px, cx = px / 2, R = px * 0.37, f = clamp(ORB.shown, 0, 1), t = ORB.t;
    c.clearRect(0, 0, px, px);
    c.drawImage(ORB.back, 0, 0);
    if (f > 0.002) {
      c.save(); c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.clip();
      const lvl = cx + R - 2 * R * f, amp = R * 0.055 * Math.min(1, f * 6, (1 - f) * 10 + 0.15);
      orbWave(c, cx, R, lvl, amp, t, 1.9, 4.2, 1.7, 7.5, 2.3); c.fillStyle = '#82041a'; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
      orbWave(c, cx, R, lvl, amp, t, 0, 3.4, 2.4, 6.1, 3.1); c.fillStyle = ORB.grad; c.fill();
      // surface sheen
      c.beginPath();
      for (let i = 0; i <= 24; i++) {
        const x = cx - R + (2 * R * i) / 24, u = (x - cx) / R;
        const y = lvl + amp * Math.sin(u * 3.4 + t * 2.4) + amp * 0.45 * Math.sin(u * 6.1 - t * 3.1);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.lineWidth = Math.max(1.5, R * 0.035); c.strokeStyle = '#ffbec8'; c.globalAlpha = 0.75; c.stroke();
      // bubbles
      c.fillStyle = '#ffd7de'; c.globalAlpha = 0.45;
      for (let i = 0; i < 6; i++) {
        const ph = (t * (0.18 + i * 0.037) + i * 0.29) % 1, bx = cx + Math.sin(i * 2.3 + t * 1.3) * R * 0.5, by = cx + R - ph * 2 * R * 0.95;
        if (by > lvl + amp * 1.5) { c.beginPath(); c.arc(bx, by, R * (0.025 + (i % 3) * 0.012), 0, TAU); c.fill(); }
      }
      if (ORB.heal > 0) { c.fillStyle = '#fff0c8'; c.globalAlpha = 0.35 * ORB.heal; c.fillRect(0, 0, px, px); }
      c.globalAlpha = 1;
      c.restore();
    }
    if (ORB.hurt > 0) { c.fillStyle = '#ffffff'; c.globalAlpha = 0.5 * ORB.hurt * ORB.hurt; c.beginPath(); c.arc(cx, cx, R, 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.drawImage(ORB.front, 0, 0);
  }
  function orbHurt() {
    ORB.hurt = 1;
    if (D.orb.animate) D.orb.animate([
      { transform: 'translate(0,0) rotate(0)' }, { transform: 'translate(-7px,3px) rotate(-4deg)' }, { transform: 'translate(6px,-2px) rotate(3deg)' },
      { transform: 'translate(-4px,1px) rotate(-2deg)' }, { transform: 'translate(2px,0) rotate(1deg)' }, { transform: 'translate(0,0) rotate(0)' },
    ], { duration: 380, easing: 'ease-out' });
  }

  // ───────────────────────── Minimap ─────────────────────────
  const MM = { L: null, W: 0, H: 0, S: 4, base: null, mask: null, rev: null, seen: null, lx: -1e9, lz: -1e9, dirty: false, px: 0, bg: null, front: null, spr: {}, theme: '' };
  // Minimap backdrop (the unexplored / non-walkable part) per zone theme. Çürüme Vadisi: a blueberry-milk pool with little
  // milk bubbles (its floors — creamy yogurt, biscuit path, cheese plazas — read bright on it); Veba Şehri: the town's
  // gardens, soft green with little grass tufts and a few tiny flowers — never water, so LEVEL's blue river and canals and its
  // sandstone city walls read as water and walls next to the honey cobblestone streets; elsewhere the night-blue dots.
  const MAP_BG = {
    _: { c0: '#45403c', c1: '#181b20', dot: 'rgba(172,162,141,0.12)', r: 0.006 },
    forest: { c0: '#3f4839', c1: '#171e1a', dot: 'rgba(162,167,132,0.12)', r: 0.006 },
    dairy: { c0: '#4a5038', c1: '#1d251e', dot: 'rgba(162,162,108,0.16)', r: 0.008 },
    cave: { c0: '#3d4148', c1: '#191b24', dot: 'rgba(167,169,167,0.12)', r: 0.006 },
    volcano: { c0: '#504039', c1: '#261d20', dot: 'rgba(183,122,89,0.17)', r: 0.006 },
    town: { c0: '#49473d', c1: '#232622', dot: 'rgba(179,165,135,0.14)', r: 0.006 },
    castle: { c0: '#45414a', c1: '#211e29', dot: 'rgba(176,157,163,0.12)', r: 0.006 },
  };
  function mapBg() {
    const px = MM.px, cx = px / 2, B = MAP_BG[MM.theme] || MAP_BG._;
    MM.bg = MM.bg && MM.bg.width === px ? MM.bg : cnv(px);
    const c = MM.bg.getContext('2d');
    const g = c.createRadialGradient(cx, cx * 0.8, px * 0.05, cx, cx, cx);
    g.addColorStop(0, B.c0); g.addColorStop(1, B.c1);
    c.clearRect(0, 0, px, px); c.fillStyle = g; c.fillRect(0, 0, px, px);
    if (B.tuft) {   // little grass tufts (three blades) in staggered rows, and a few tiny five-petal flowers
      const w = px * 0.012;
      c.strokeStyle = B.tuft; c.lineWidth = Math.max(1, px * 0.007); c.lineCap = 'round';
      c.beginPath();
      for (let y = px * 0.06, row = 0; y < px; y += px * 0.08, row++) for (let x = px * (row % 2 ? 0.09 : 0.04); x < px; x += px * 0.1) {
        c.moveTo(x - w, y - w * 1.3); c.lineTo(x - w * 0.3, y); c.moveTo(x, y - w * 1.7); c.lineTo(x, y); c.moveTo(x + w, y - w * 1.3); c.lineTo(x + w * 0.3, y);
      }
      c.stroke();
      const r = px * 0.009;
      for (let i = 0; i < 14; i++) {
        const x = px * (0.08 + ((i * 37) % 84) / 100), y = px * (0.1 + ((i * 53) % 80) / 100);
        c.fillStyle = B.flower[i % B.flower.length];
        for (let k = 0; k < 5; k++) { const a = k * TAU / 5 + i; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.72, 0, TAU); c.fill(); }
        c.fillStyle = 'rgba(255,214,90,0.7)'; c.beginPath(); c.arc(x, y, r * 0.5, 0, TAU); c.fill();
      }
      return;
    }
    c.fillStyle = B.dot;
    let n = 0;
    for (let y = px * 0.04; y < px; y += px * 0.07) for (let x = px * 0.04; x < px; x += px * 0.07) {
      n++;
      const r = px * B.r * (B.ring ? 0.6 + ((n * 7) % 5) * 0.2 : 1), ox = B.ring ? ((n * 13) % 7 - 3) * px * 0.006 : 0;   // milk bubbles: uneven sizes
      c.beginPath(); c.arc(x + ox, y, r, 0, TAU); c.fill();
    }
    if (B.ring) {   // a few bigger bubble rings with a tiny highlight
      c.lineWidth = Math.max(1, px * 0.006); c.strokeStyle = B.ring;
      for (let i = 0; i < 9; i++) {
        const x = px * (0.12 + ((i * 37) % 80) / 100), y = px * (0.1 + ((i * 53) % 82) / 100), r = px * (0.022 + (i % 3) * 0.008);
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        c.fillStyle = B.ring; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, TAU); c.fill();
      }
    }
  }
  function mapResize() {
    const css = D.map.clientWidth || 166, px = Math.max(48, Math.round(css * S.dpr));
    if (px === MM.px) return;
    MM.px = px; D.map.width = D.map.height = px;
    const cx = px / 2;
    mapBg();
    MM.front = cnv(px); let c = MM.front.getContext('2d');
    let g = c.createRadialGradient(cx, cx, cx * 0.68, cx, cx, cx);
    g.addColorStop(0, 'rgba(8,4,26,0)'); g.addColorStop(1, 'rgba(8,4,26,0.7)');
    c.fillStyle = g; c.fillRect(0, 0, px, px);
    c.save(); c.translate(cx * 0.62, cx * 0.42); c.rotate(-0.6); c.scale(1, 0.45);
    g = c.createRadialGradient(0, 0, 0, 0, 0, cx * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, cx * 0.55, 0, TAU); c.fill(); c.restore();
    makeSprites();
  }
  function sprite(css, draw) {
    const d = S.dpr, c = cnv(Math.ceil(css * d)), x = c.getContext('2d');
    x.scale(d, d); draw(x, css); c.css = css; return c;
  }
  function emojiSprite(ch, css, ring) {
    return sprite(css, (x, s) => {
      if (ring) { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, ring); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }
      x.font = `${Math.round(s * 0.66)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, s / 2, s / 2 + s * 0.04);
    });
  }
  function makeSprites() {
    const P = MM.spr;
    P.portal = sprite(28, (x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#c6a6ff'); g.addColorStop(0.62, '#7a4dff'); g.addColorStop(1, 'rgba(90,40,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
      x.strokeStyle = '#f1e6ff'; x.lineWidth = 2; x.beginPath(); x.arc(s / 2, s / 2, s * 0.26, 0.3, 5.2); x.stroke();
    });
    // the sleeping portal (its boss is still grumpy): a dim, still ring — it lights up (P.portal + halo) once the boss is happy
    P.portalOff = sprite(24, (x, s) => {
      const c = s / 2;
      x.fillStyle = 'rgba(34,24,66,0.72)'; x.beginPath(); x.arc(c, c, s * 0.34, 0, TAU); x.fill();
      x.lineWidth = 2.2; x.strokeStyle = 'rgba(190,178,226,0.8)'; x.beginPath(); x.arc(c, c, s * 0.34, 0, TAU); x.stroke();
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(190,178,226,0.45)'; x.beginPath(); x.arc(c, c, s * 0.18, 0.5, 4.9); x.stroke();
    });
    P.chest = sprite(18, (x, s) => {
      x.fillStyle = '#3a1a08'; x.beginPath(); x.roundRect ? x.roundRect(1.5, 3.5, s - 3, s - 6, 3) : x.rect(1.5, 3.5, s - 3, s - 6); x.fill();
      x.fillStyle = '#c9803a'; x.fillRect(3, 5, s - 6, s - 9.5);
      x.fillStyle = '#ffd23f'; x.fillRect(3, 8.2, s - 6, 2); x.fillRect(s / 2 - 1.5, 5, 3, s - 9.5);
    });
    const diamond = (col, glow) => sprite(20, (x, s) => {
      if (glow) { const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,150,220,0.9)'); g.addColorStop(1, 'rgba(255,150,220,0)'); x.fillStyle = g; x.fillRect(0, 0, s, s); }
      x.beginPath(); x.moveTo(s / 2, 2.5); x.lineTo(s - 5, s / 2); x.lineTo(s / 2, s - 2.5); x.lineTo(5, s / 2); x.closePath();
      x.fillStyle = col; x.fill(); x.lineWidth = 1.6; x.strokeStyle = '#3a0a3a'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.moveTo(s / 2, 4.5); x.lineTo(s / 2 + 2.5, s / 2 - 1); x.lineTo(s / 2, s / 2 - 1); x.closePath(); x.fill();
    });
    P.cp = diamond('#998675', false); P.cpOn = diamond('#ccac7c', true);
    P.npc = emojiSprite('☠', 22, 'rgba(255,230,160,0.7)');
    P.merchant = emojiSprite('⚒', 23, 'rgba(186,160,119,0.9)');
    for (const k in P) if (k.indexOf('b:') === 0) delete P[k];   // boss badges: rebuilt for the new size on first use (bossSpr)
    P.crystal = emojiSprite('◆', 26, 'rgba(255,150,220,0.9)');
  }
  function mapReset(L) {
    MM.L = L; MM.base = null; MM.lx = MM.lz = -1e9;
    const th = (L && L.Z && L.Z.theme) || '';
    if (th !== MM.theme) { MM.theme = th; if (MM.px) mapBg(); }
    if (!L || !L.grid || !L.W || !L.H) return;
    const W = MM.W = L.W, H = MM.H = L.H, s = MM.S = clamp(Math.floor(480 / Math.max(W, H)), 2, 5);
    let src = L.mapCanvas && L.mapCanvas.width ? L.mapCanvas : null;
    if (src && blankCanvas(src)) src = null;
    if (!src) src = gridCanvas(L);
    const base = MM.base = cnv(W * s, H * s), c = base.getContext('2d');
    c.imageSmoothingEnabled = true;
    c.shadowColor = 'rgba(4,2,16,0.95)'; c.shadowBlur = s * 2.2;
    c.drawImage(src, 0, 0, W * s, H * s);
    c.shadowBlur = 0; c.drawImage(src, 0, 0, W * s, H * s);
    c.globalCompositeOperation = 'source-atop';   // soft top light so floors read as raised plates
    const g = c.createLinearGradient(0, 0, 0, H * s); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.08)');
    c.fillStyle = g; c.fillRect(0, 0, W * s, H * s);
    c.globalCompositeOperation = 'source-over';
    MM.mask = cnv(W, H); MM.rev = cnv(W * s, H * s); MM.seen = new Uint8Array(W * H);
    MM.dirty = true;
  }
  function blankCanvas(cv) {
    try {
      const t = cnv(cv.width, cv.height), x = t.getContext('2d', { willReadFrequently: true });
      x.drawImage(cv, 0, 0);
      const d = x.getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 3; i < d.length; i += 16) if (d[i] > 8) return false;
      return true;
    } catch (e) { return false; }
  }
  function gridCanvas(L) {   // fallback base when LEVEL gave no (or an empty) mapCanvas
    const c = cnv(L.W, L.H), x = c.getContext('2d'), img = x.createImageData(L.W, L.H), d = img.data;
    const theme = (L.Z && L.Z.theme) || 'forest';
    const col = new THREE.Color(theme === 'cave' ? '#768189' : theme === 'castle' ? '#8a7c8a' : theme === 'volcano' ? '#ac805f' : theme === 'dairy' ? '#899366' : theme === 'town' ? '#a28e6f' : '#718264');
    const r = Math.round(Math.pow(col.r, 1 / 2.2) * 255), gg = Math.round(Math.pow(col.g, 1 / 2.2) * 255), b = Math.round(Math.pow(col.b, 1 / 2.2) * 255);
    for (let i = 0; i < L.W * L.H; i++) {
      if (!L.grid[i]) continue;
      const n = ((i * 2654435761) >>> 24) / 255 * 14 - 7;
      d[i * 4] = clamp(r + n, 0, 255); d[i * 4 + 1] = clamp(gg + n, 0, 255); d[i * 4 + 2] = clamp(b + n, 0, 255); d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (L.path && L.path.length > 1) {   // soft path line so the way forward reads on the map
      x.strokeStyle = theme === 'dairy' ? 'rgba(214,150,70,0.6)' : theme === 'town' ? 'rgba(255,248,226,0.7)' : 'rgba(255,238,190,0.45)'; x.lineWidth = 2; x.lineCap = x.lineJoin = 'round';   // (dairy: the biscuit-crumb trail; town: the lighter main street)
      x.beginPath(); L.path.forEach((p, i) => (i ? x.lineTo(p.x, p.z) : x.moveTo(p.x, p.z))); x.stroke();
    }
    return c;
  }
  function mapReveal(x, z) {
    if (!MM.base || dist2(x, z, MM.lx, MM.lz) < 0.6) return;
    MM.lx = x; MM.lz = z;
    const c = MM.mask.getContext('2d'), R = MAP_REVEAL;
    const g = c.createRadialGradient(x, z, 0, x, z, R);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, z, R, 0, TAU); c.fill();
    const r = Math.ceil(R * 0.85), i0 = Math.max(0, Math.floor(x) - r), i1 = Math.min(MM.W - 1, Math.floor(x) + r);
    const j0 = Math.max(0, Math.floor(z) - r), j1 = Math.min(MM.H - 1, Math.floor(z) + r), rr = R * R * 0.72;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (dist2(i + 0.5, j + 0.5, x, z) < rr) MM.seen[j * MM.W + i] = 1;
    MM.dirty = true;
  }
  const seen = (x, z) => { if (!MM.seen) return true; const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < MM.W && j < MM.H && MM.seen[j * MM.W + i] === 1; };
  function mapCompose() {
    const c = MM.rev.getContext('2d'), w = MM.rev.width, h = MM.rev.height;
    c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, w, h);
    c.drawImage(MM.base, 0, 0);
    c.globalCompositeOperation = 'destination-in'; c.imageSmoothingEnabled = true;
    c.drawImage(MM.mask, 0, 0, w, h);
    c.globalCompositeOperation = 'source-over';
    MM.dirty = false;
  }
  // minimap view transform for the current frame (hoisted helpers: no per-frame closures)
  const MV = { c: null, cx: 0, sc: 1, px: 0, pz: 0, d: 1, goal: null, bonus: false };
  const msx = x => MV.cx + (x - MV.px) * MV.sc, msy = z => MV.cx + (z - MV.pz) * MV.sc;
  const mInView = (x, z, m) => dist2(x, z, MV.px, MV.pz) < (MAP_VIEW + m) * (MAP_VIEW + m);
  function mIcon(spr, x, z, k) { const w = spr.css * MV.d * k; MV.c.drawImage(spr, msx(x) - w / 2, msy(z) - w / 2, w, w); }
  function mapDraw() {
    const g = M.GAME; if (!g || !MM.px) return;
    const P = g.P, L = g.L;
    if (L !== MM.L) mapReset(L);
    const px = P.pos.x, pz = P.pos.z;
    mapReveal(px, pz);
    if (MM.dirty && MM.base) mapCompose();
    const c = D.map.getContext('2d'), N = MM.px, cx = N / 2, sc = cx / MAP_VIEW, d = S.dpr, t = S.t;
    MV.c = c; MV.cx = cx; MV.sc = sc; MV.px = px; MV.pz = pz; MV.d = d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, N, N);
    c.save(); c.beginPath(); c.arc(cx, cx, cx, 0, TAU); c.clip();
    c.drawImage(MM.bg, 0, 0);
    if (MM.base) { c.imageSmoothingEnabled = true; c.drawImage(MM.rev, msx(0), msy(0), MM.W * sc, MM.H * sc); }
    if (L) {
      if (L.chestObjs) for (const o of L.chestObjs) if (!o.opened && mInView(o.x, o.z, 2) && seen(o.x, o.z)) mIcon(MM.spr.chest, o.x, o.z, 1);
      if (L.cpObjs) for (const o of L.cpObjs) if (mInView(o.x, o.z, 2) && (o.active || seen(o.x, o.z))) mIcon(o.active ? MM.spr.cpOn : MM.spr.cp, o.x, o.z, o.active ? 1 + 0.08 * Math.sin(t * 4) : 1);
      if (L.merchant && mInView(L.merchant.x, L.merchant.z, 2) && seen(L.merchant.x, L.merchant.z)) mIcon(MM.spr.merchant, L.merchant.x, L.merchant.z, 1);
      if (L.npcObj && mInView(L.npcObj.x, L.npcObj.z, 2) && seen(L.npcObj.x, L.npcObj.z)) mIcon(MM.spr.npc, L.npcObj.x, L.npcObj.z, 1);
    }
    // loot items (rarity coloured stars)
    if (g.loot) for (const o of g.loot) {
      if (o.kind !== 'item' || !o.item || !mInView(o.x, o.z, 0)) continue;
      c.fillStyle = RAR[o.item.rarity || 0]; c.strokeStyle = '#1a0a30'; c.lineWidth = 1.2 * d;
      starPath(c, msx(o.x), msy(o.z), 4.6 * d, 2 * d); c.fill(); c.stroke();
    }
    // enemies: red dots (elites bigger with a gold ring)
    if (g.enemies && g.enemies.length) {
      c.fillStyle = '#ff3b55'; c.strokeStyle = 'rgba(40,0,10,0.9)'; c.lineWidth = 1.3 * d;
      c.beginPath();
      for (const e of g.enemies) {
        if (e.boss || !e.m || !e.m.root || !e.m.root.visible || e.dead || !mInView(e.x, e.z, 0)) continue;
        const r = (e.elite ? 4.4 : 3) * d, x = msx(e.x), y = msy(e.z);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
      c.fill(); c.stroke();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 1.6 * d; c.beginPath();
      for (const e of g.enemies) if (e.elite && !e.boss && e.m && e.m.root && e.m.root.visible && mInView(e.x, e.z, 0)) { const x = msx(e.x), y = msy(e.z); c.moveTo(x + 6 * d, y); c.arc(x, y, 6 * d, 0, TAU); }
      c.stroke();
    }
    // goal: boss → (once it is happy) the glowing portal, or the castle's crystal — on the map when near; when far, a big
    // pulsing arrow inside the rim plus the goal icon. The portal sleeps (dim, no arrow) while its boss is still grumpy.
    let goal = null, gspr = null;
    const po = L && L.portalObj, poOn = !!po && po.active !== false;
    if (po && !poOn && mInView(po.x, po.z, 2) && seen(po.x, po.z)) mIcon(MM.spr.portalOff, po.x, po.z, 1);
    if (poOn) { goal = po; gspr = MM.spr.portal; MV.goal = 'portal'; }
    else if (g.boss && !g.boss.dead) { goal = g.boss; gspr = bossSpr(g.boss.type); MV.goal = 'boss'; }
    else if (L && L.crystalSpot && g.boss && g.boss.dead && g.state === 'play') { goal = L.crystalSpot; gspr = MM.spr.crystal; MV.goal = 'crystal'; }
    else MV.goal = null;
    if (goal) {
      const dx = goal.x - px, dz = goal.z - pz, dd = Math.hypot(dx, dz), lim = MAP_VIEW - 2.2;
      if (dd < lim) {
        if (goal === po) {   // awake portal: a soft pulsing glow ring behind it
          const k = (t * 1.2) % 1, gx = msx(po.x), gy = msy(po.z);
          c.globalAlpha = 0.8 * (1 - k); c.lineWidth = 2.4 * d; c.strokeStyle = '#d8c2ff';
          c.beginPath(); c.arc(gx, gy, (9 + 12 * k) * d, 0, TAU); c.stroke(); c.globalAlpha = 1;
        }
        mIcon(gspr, goal.x, goal.z, 1 + 0.1 * Math.sin(t * 5));
      } else {
        const a = Math.atan2(dz, dx), rr = cx - 17 * d, x = cx + Math.cos(a) * rr, y = cx + Math.sin(a) * rr, k = 1 + 0.14 * Math.sin(t * 6);
        c.save(); c.translate(x, y); c.rotate(a); c.scale(k, k);
        c.beginPath(); c.moveTo(12 * d, 0); c.lineTo(-10 * d, -11 * d); c.lineTo(-4 * d, 0); c.lineTo(-10 * d, 11 * d); c.closePath();
        c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 2.2 * d; c.strokeStyle = '#4a2200'; c.lineJoin = 'round'; c.stroke();
        c.restore();
        const ws = Math.max(26, gspr.css * 0.95) * d, ir = rr - 26 * d;
        c.drawImage(gspr, cx + Math.cos(a) * ir - ws / 2, cx + Math.sin(a) * ir - ws / 2, ws, ws);
      }
    }
    // player arrow
    const fx = Math.sin(P.face), fz = Math.cos(P.face);
    c.save(); c.translate(cx, cx);
    c.fillStyle = '#8ce6ff'; c.globalAlpha = 0.25 + 0.12 * Math.sin(t * 4); c.beginPath(); c.arc(0, 0, 11 * d, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.rotate(Math.atan2(fz, fx));
    c.beginPath(); c.moveTo(9 * d, 0); c.lineTo(-6 * d, -6.5 * d); c.lineTo(-3 * d, 0); c.lineTo(-6 * d, 6.5 * d); c.closePath();
    c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 2 * d; c.strokeStyle = '#1a3a6a'; c.lineJoin = 'round'; c.stroke();
    c.restore();
    c.restore();
    c.drawImage(MM.front, 0, 0);
    // Round 6 bonus: where Feza should go (GAME.bonusSpot: the fallen crown, the glowing hole, the carrot, a heart…) — a gold
    // dot with a soft pulsing ring, drawn over the rim shading and the boss badge so it pops; off the map, a gold dot on the
    // rim toward it
    const bs = bonusSpotNow(g);
    MV.bonus = !!bs;
    if (bs) {
      const dx = bs.x - px, dz = bs.z - pz, dd = Math.hypot(dx, dz), lim = MAP_VIEW - 3;
      let x = msx(bs.x), y = msy(bs.z), r = 5 * d;
      if (dd > lim) { const a = Math.atan2(dz, dx), rr = cx - 14 * d; x = cx + Math.cos(a) * rr; y = cx + Math.sin(a) * rr; r = 4.6 * d; }
      const k = (t * 1.6) % 1;
      c.save(); c.beginPath(); c.arc(cx, cx, cx - 2 * d, 0, TAU); c.clip();
      c.globalAlpha = 0.85 * (1 - k); c.lineWidth = 2.2 * d; c.strokeStyle = '#ffe37a';
      c.beginPath(); c.arc(x, y, r + (3 + 9 * k) * d, 0, TAU); c.stroke(); c.globalAlpha = 1;
      c.beginPath(); c.arc(x, y, r * (1 + 0.12 * Math.sin(t * 6)), 0, TAU);
      c.fillStyle = '#ffd23f'; c.fill(); c.lineWidth = 1.6 * d; c.strokeStyle = '#5a2a00'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.32, r * 0.3, 0, TAU); c.fill();
      c.restore();
    }
  }
  function starPath(c, x, y, R, r) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }

  // ───────────────────────── HUD refresh ─────────────────────────
  function hudTick(dt) {
    const g = M.GAME; if (!g || !S.hud || S.menu) return;   // menus dim the HUD: don't redraw under the blur
    const P = g.P;
    if(D.petFill&&P.pet){D.petFill.style.transform='scaleX('+Math.max(0,P.pet.hp/P.pet.maxHp)+')';D.bilboFace.classList.toggle('u-petbroken',P.pet.hp<=0||!!P.pet.retreat);D.petBar.title=P.pet.retreat?'Bilbo zırhını toparlıyor':'Bilbo zırhı';D.bilboFace.setAttribute('aria-label',D.petBar.title+' · '+Math.ceil(P.pet.hp)+' / '+P.pet.maxHp);}
    const hpf = clamp(P.hp / Math.max(1, P.maxHp), 0, 1);
    if (hpf - ORB.target > 0.25 && !P.dead) ORB.heal = 1;   // a big heal (the Kefir Devi's kefir, a level-up): the orb glows warm as it fills
    ORB.target = hpf;
    orbDraw(dt);
    const low = ORB.target < 0.3 && !P.dead;
    if (low !== last.low) { last.low = low; D.orb.classList.toggle('low', low); }
    const xf = clamp(P.xp / Math.max(1, P.xpNext), 0, 1);
    if (P.lvl !== last.lvl) {
      if (last.lvl > 0 && P.lvl > last.lvl) {   // level up: bar empties instantly, then refills (never slides backwards)
        D.xpFill.style.transition = 'none'; D.xpFill.style.transform = 'scaleX(0)'; void D.xpFill.offsetWidth; D.xpFill.style.transition = '';
        last.xp = 0;
      }
      last.lvl = P.lvl; D.lvl.firstChild.textContent = P.lvl;
    }
    if (Math.abs(xf - last.xp) > 0.002) { last.xp = xf; D.xpFill.style.transform = `scaleX(${xf.toFixed(4)})`; }
    // gold counts up smoothly
    if (P.gold < goldShown) goldShown = P.gold;
    goldShown = P.gold - goldShown < 1 ? P.gold : damp(goldShown, P.gold, 9, dt);
    const gi = Math.floor(goldShown);
    if (gi !== last.gold) { last.gold = gi; D.goldB.textContent = D.goldI.textContent = gi; }
    if (P.potions !== last.pot) { last.pot = P.potions; D.potN.textContent = '×' + P.potions; }
    const empty = P.potions <= 0;
    if (empty !== last.empty) { last.empty = empty; D.pot.classList.toggle('empty', empty); }
    const hint = low && !empty;
    if (hint !== last.hint) { last.hint = hint; D.pot.classList.toggle('hint', hint); }
    // skills
    const boneCd = Math.max(0, Number(g.boneCooldown) || 0), boneMax = Math.max(1, Number(g.boneCooldownMax) || 1);
    D.boneBtn.classList.toggle('cool', boneCd > 0);
    D.boneBtn.querySelector('.u-cd').style.setProperty('--p', clamp(boneCd / boneMax, 0, 1).toFixed(3));
    D.boneBtn.querySelector('.u-cdn').textContent = boneCd > 0.05 ? Math.ceil(boneCd) : '';
    const list = g.skills || [];
    for (let i = 0; i < D.sk.length; i++) {
      const s = list[i], v = D.sk[i];
      if (!s || !s.unlocked) { if (v.shown) { v.shown = false; v.b.classList.add('u-hide'); } continue; }
      if (!v.shown) showSkill(i, false);
      const p = s.cd > 0 ? clamp(s.cd / Math.max(0.01, s.cdMax || 1), 0, 1) : 0;
      if (Math.abs(p - v.p) > 0.004 || (p === 0 && v.p !== 0)) {
        if (p === 0 && v.p > 0) { bump(v.b, 1.14, true); }
        v.p = p; v.cd.style.setProperty('--p', p.toFixed(3)); v.b.classList.toggle('cool', p > 0);
      }
      const n = s.cd > 0.05 && (s.cdMax || 0) >= 3 ? Math.ceil(s.cd) : 0;
      if (n !== v.n) { v.n = n; v.cdn.textContent = n ? n : ''; }
    }
    if (S.frame % 3 === 0) bladeTick(P);
    if (S.frame % 2 === 0) mapDraw();
    if (S.pwatch) portalWatchTick(dt, P);
    if (S.hintT >= 0) hintTick(dt, P);
    // boss bar trail
    if (S.boss) {
      S.bossTrail = S.bossTrail < S.bossFrac ? S.bossFrac : damp(S.bossTrail, S.bossFrac, 2.2, dt);
      D.bossTrail.style.transform = `scaleX(${S.bossTrail.toFixed(4)})`;
    }
  }
  // Attack button lightsaber: glows in the equipped saber's colour (the rainbow saber cycles), retracts while Feza
  // sleeps and re-ignites (blade grows out of the hilt) when he wakes up or picks a different saber.
  function bladeTick(P) {
    const wizard = P.heroClass === 'wizard', hybrid = P.heroClass === 'hybrid';
    if (last.heroClass !== P.heroClass) {
      last.heroClass = P.heroClass; D.atk.innerHTML = wizard ? skillGlyph('isikoklari') : hybrid ? SVG.sword + '<span class="u-offhandico">'+skillGlyph('isikbagi')+'</span>' : SVG.sword;
      D.atkBlade = D.atk.querySelector('.u-blade');
      D.atk.setAttribute('aria-label', wizard ? 'Büyü at' : hybrid ? 'Yakında kılıçla vur, uzakta büyü at' : 'Kılıçla vur');
    }
    const w = P.equip && P.equip.weapon, I = M.ITEMS;
    let col = null;
    if (w && I && typeof I.bladeColor === 'function') col = safe('ITEMS.bladeColor', () => I.bladeColor(w));
    if (typeof col !== 'string' || !col) col = BLADE_DEF;
    if (col !== last.blade) { last.blade = col; D.atk.style.setProperty('--blade', col); }
    const uid = w ? (w.uid != null ? w.uid : w) : null, off = !!P.dead;
    if (off !== last.bladeOff) { last.bladeOff = off; D.atk.classList.toggle('off', off); if (!off && last.bladeUid !== undefined) igniteIcon(); }
    if (uid !== last.bladeUid) { const first = last.bladeUid === undefined; last.bladeUid = uid; if (!first && !off) igniteIcon(); }
  }
  function igniteIcon() {
    const b = D.atkBlade;
    if (b && b.animate) safe('igniteIcon', () => b.animate([{ transform: 'scaleY(0.02)' }, { transform: 'scaleY(1.06)', offset: 0.75 }, { transform: 'scaleY(1)' }],
      { duration: 320, easing: 'cubic-bezier(.25,.9,.35,1)' }));
  }
  function skillGlyph(id) {
    const marks={
      yildiz:'<path d="M30 71L37 34L47 16L50 40L70 29L60 55L81 64L53 67L46 85Z"/>',
      kasirga:'<path d="M26 38Q42 13 67 27L81 20L77 40L58 36L66 30Q44 23 32 43M74 62Q58 87 33 73L19 80L23 60L42 64L34 70Q56 77 68 57"/>',
      meteor:'<path d="M16 77L25 52L49 39L57 61L38 84ZM36 39L70 14M47 47L83 17M60 56L88 29"/>',
      isikoklari:'<path d="M24 82L37 38L44 19L48 45L31 86M46 83L58 33L66 13L69 40L53 87M66 87L78 49L85 31L88 55L74 91"/>',
      buzcicegi:'<path d="M50 12V88M17 31L83 69M17 69L83 31M41 22L50 30L59 22M24 40L34 40L31 50M24 60L34 60L31 50M41 78L50 70L59 78M76 40L66 40L69 50M76 60L66 60L69 50"/>',
      yildizbahcesi:'<path d="M12 81H89M20 81L27 44L36 81M39 81L50 19L62 81M64 81L75 41L84 81M32 57L43 63M59 56L70 62"/>',
      hilaldalgasi:'<path d="M69 14Q19 28 23 59Q28 89 77 81Q48 66 54 41Q58 26 69 14Z"/>',
      isikbagi:'<rect x="14" y="24" width="28" height="50" rx="14"/><rect x="58" y="24" width="28" height="50" rx="14"/><path d="M33 50H67M28 28V16M73 72V87"/>',
      gokkusagimuhru:'<path d="M50 11L83 30L83 69L50 89L17 69L17 30ZM50 23V77M27 38L73 64M27 64L73 38"/>'
    };
    return `<svg class="u-sigil" viewBox="0 0 100 100"><g fill="none" stroke="#ddd0b4" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter">${marks[id]||marks.yildiz}</g><circle cx="50" cy="50" r="3" fill="#ac5147"/></svg>`;
  }
  function showSkill(i, announce) {
    const g = M.GAME, s = g && g.skills && g.skills[i], v = D.sk[i];
    if (!s || !v) return;
    const def = s.def || {};
    v.ico.innerHTML = skillGlyph(def.id);
    v.b.setAttribute('aria-label', def.ad || def.name || ('Yetenek ' + (i + 1)));
    v.b.style.setProperty('--c', def.color || '#ffd23f');
    v.b.style.setProperty('--cd', shade(def.color || '#ffd23f', -0.45));
    v.b.classList.remove('u-hide');
    v.shown = true; v.p = -1; v.n = -1;
    if (announce) { v.b.classList.remove('pop'); void v.b.offsetWidth; v.b.classList.add('pop', 'new'); }
  }
  function refreshAllSkills() {
    const g = M.GAME;
    D.sk.forEach((v, i) => {
      const s = g && g.skills && g.skills[i];
      v.b.classList.remove('new', 'pop');
      if (s && s.unlocked) showSkill(i, false); else { v.shown = false; v.b.classList.add('u-hide'); }
    });
  }

  // ── First-run hint: a finger taps the ground on the main route ~4.5 m ahead of Feza, until he has really walked ──
  const _hv = new THREE.Vector3(), _hs = { x: 0, y: 0, vis: false }, _hf = { x: 0, y: 0, vis: false }, _hp = { x: 0, z: 0 };
  function pathAhead(path, x, z, ahead, out) {   // point `ahead` metres further along the polyline than its closest point to (x,z)
    let best = 1e18, bi = 0, bt = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1e-6;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), d = dist2(a.x + dx * t, a.z + dz * t, x, z);
      if (d < best) { best = d; bi = i; bt = t; }
    }
    let rem = ahead;
    for (let i = bi, t = bt; i < path.length - 1; i++, t = 0) {
      const a = path[i], b = path[i + 1], seg = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6, left = seg * (1 - t);
      if (rem <= left) { const u = t + rem / seg; out.x = a.x + (b.x - a.x) * u; out.z = a.z + (b.z - a.z) * u; return out; }
      rem -= left;
    }
    const e = path[path.length - 1]; out.x = e.x; out.z = e.z; return out;
  }
  // Is a screen point clear of the HUD (corners + controls, with a margin)?
  const HR = { rects: [], frame: -99 };
  function hintFree(x, y) {
    const W = innerWidth, H = innerHeight, m = 110;
    if (x < 60 || x > W - 60 || y < 60 || y > H - 60) return false;
    if (S.frame - HR.frame > 30) {   // HUD rects, refreshed twice a second
      HR.frame = S.frame; HR.rects.length = 0;
      for (const e of [D.tl, D.tr, D.bl, D.atk].concat(D.sk.filter(v => v.shown).map(v => v.b))) HR.rects.push(e.getBoundingClientRect());
    }
    for (const r of HR.rects) if (r.width && x > r.left - m && x < r.right + m && y > r.top - m && y < r.bottom + m) return false;
    return true;
  }
  function hintTick(dt, P) {
    const g = M.GAME, gl = S.hintGoal;
    S.hintT += dt;
    if (gl) {   // toward a goal (the awake portal): done once Feza is ~3 m closer or there, or after 30 s
      const d = Math.hypot(gl.x - P.pos.x, gl.z - P.pos.z);
      if (S.hintT >= 30 || d < 3 || d < S.hintD0 - 3) { stopHint(); return; }
    // first run: done once Feza has walked ~3 m (a real drag / tap-to-walk), or after 45 s
    } else if (S.hintT >= 45 || dist2(P.pos.x, P.pos.z, S.hintX, S.hintZ) > 9) { stopHint(); return; }
    const show = S.hintT > (gl ? 0.2 : 1.2) && !S.menu && !P.dead && S.primary === null && !!(g && g.state === 'play');
    if (show !== S.hintOn) { S.hintOn = show; D.hint.classList.toggle('on', show); }
    if (!show) return;
    const L = g.L;
    let onGoal = false;
    if (gl) {   // straight toward it (the portal stands at the open arena's edge); through a wall → along the route instead
      const dx = gl.x - P.pos.x, dz = gl.z - P.pos.z, d = Math.hypot(dx, dz) || 1, a = Math.min(4.5, Math.max(1.5, d - 1.2));
      _hp.x = P.pos.x + dx / d * a; _hp.z = P.pos.z + dz / d * a;
      const LV = M.LEVEL;
      onGoal = !L || !LV || !LV.los || !!safe('LEVEL.los', () => LV.los(L, P.pos.x, P.pos.z, _hp.x, _hp.z));
    }
    if (!onGoal) {
      if (L && L.path && L.path.length > 1) pathAhead(L.path, P.pos.x, P.pos.z, 4.5, _hp);
      else { _hp.x = P.pos.x + 0.9; _hp.z = P.pos.z - 3.4; }
    }
    toScreen(_hv.set(_hp.x, 0, _hp.z), _hs);
    if (!hintFree(_hs.x, _hs.y)) {   // slide it back toward Feza until it's clear of the HUD
      toScreen(_hv.set(P.pos.x, 0, P.pos.z), _hf);
      let lo = 0, hi = 1;
      for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (hintFree(_hf.x + (_hs.x - _hf.x) * mid, _hf.y + (_hs.y - _hf.y) * mid)) lo = mid; else hi = mid; }
      const k = Math.max(lo, 0.45);
      _hs.x = _hf.x + (_hs.x - _hf.x) * k; _hs.y = _hf.y + (_hs.y - _hf.y) * k;
    }
    D.hint.style.transform = `translate(${_hs.x.toFixed(1)}px, ${_hs.y.toFixed(1)}px)`;
  }
  // startHint(): the first-run finger (once per session); startHint({x, z}): the finger toward that goal (e.g. the portal)
  function startHint(goal) {
    const g = M.GAME; if (!g || !g.P) return;
    if (goal) {
      if (S.hintT >= 0 && !S.hintGoal) S.hintDone = true;   // (a first-run finger still up: this one takes its place)
      S.hintGoal = { x: goal.x, z: goal.z }; S.hintD0 = Math.hypot(goal.x - g.P.pos.x, goal.z - g.P.pos.z);
    } else { if (S.hintDone) return; S.hintGoal = null; }
    S.hintT = 0; S.hintX = g.P.pos.x; S.hintZ = g.P.pos.z;
  }
  function stopHint() {
    if (S.hintT < 0) return;
    if (!S.hintGoal) S.hintDone = true;
    S.hintT = -1; S.hintGoal = null; S.hintOn = false; D.hint.classList.remove('on');
  }
  // After a mid-boss story beat: if Feza has not headed for the awake portal within ~6 s, the finger shows the way.
  function armPortalWatch() {
    const g = M.GAME, po = g && g.L && g.L.portalObj;
    S.pwatch = po && po.active && g.P ? { t: 0, d0: Math.hypot(po.x - g.P.pos.x, po.z - g.P.pos.z) } : null;
  }
  function portalWatchTick(dt, P) {
    const w = S.pwatch, g = M.GAME, po = g && g.L && g.L.portalObj;
    if (!po || !po.active) { S.pwatch = null; return; }
    if (g.state !== 'play' || P.dead || S.cine) return;
    const d = Math.hypot(po.x - P.pos.x, po.z - P.pos.z);
    if (d < 4 || d < w.d0 - 2.5) { S.pwatch = null; return; }   // on his way
    if ((w.t += dt) >= 6) { S.pwatch = null; startHint(po); }
  }

  // ── Portrait ──
  function refreshPortrait() {
    const g = M.GAME, F = M.FEZA;
    if (D.bilboFace && !D.bilboFace.querySelector('img') && typeof BILBO !== 'undefined') {
      const bilboUrl = safe('BILBO.portrait', () => BILBO.portrait());
      if (bilboUrl) D.bilboFace.insertAdjacentHTML('afterbegin', `<img src="${bilboUrl}" alt="">`);
    }
    let url = null;
    if (F && F.portrait && g && g.H) url = safe('FEZA.portrait', () => F.portrait(g.H));
    if (url === S.portraitUrl) return;
    S.portraitUrl = url || null;
    const html = url ? `<img src="${url}" alt="">` : '<span class="u-femo">🧒</span>';
    D.faceIn.innerHTML = html; D.bagFace.innerHTML = html;
  }
  const portraitSoon = (delay = 0.25) => { S.portraitDirty = true; S.portraitAt = S.t + delay; };

  // ── Friendly boss portraits (boss bar, minimap goal, boss subtitles, victory row) ──
  // Every boss type gets its happy face rendered once from its real model (EMODEL.build(type) + setMood('happy')) into a small
  // offscreen render target, cached as a dataURL (transparent; the pastel disc behind it is CSS .u-dimg.b-<type>). It is done
  // at the zone load of that boss's zone (behind the loading screen / fade). The offscreen scene copies the main scene's light
  // counts and fog type, so the boss's shader programs are reused (no compile hitch later). Until it exists — or without
  // WebGL / EMODEL, or while EMODEL does not know that boss yet — a cute inline SVG stands in. Never a fierce 🐲/🐉 emoji.
  const BOSS_UI = {
    kopukusta: { ad: 'Köpük Celladı', svg: SVG.bstar, lines: ['kopukusta'], disc: ['#5a655c','#39433d','#24272b'], halo: 'rgba(150,162,144,.45)' },
    aytavsan: { ad: 'Ay Yırtıcısı', svg: SVG.bstar, lines: ['aytavsan'], disc: ['#665a72','#40384c','#26222d'], halo: 'rgba(161,138,173,.45)' },   // ad: name fallback · lines: voice key prefixes · disc/halo: badge colours (CSS .b-<type> matches disc)
    kraljole: { ad: 'Çürük Taç', svg: SVG.kraljole, lines: ['kraljole_'], disc: ['#fbf6ff', '#e6d8ff', '#b99cf2'], halo: 'rgba(80,220,235,0.85)' },
    kefirdev: { ad: 'Veba Rahibi', svg: SVG.kefirdev, lines: ['kefirdev_'], disc: ['#eaf7ff', '#b4e0fc', '#5494dc'], halo: 'rgba(130,205,255,0.9)' },
    kostebekusta: { ad: 'Mezar Kazıcısı', svg: SVG.kostebekusta, lines: ['usta_'], disc: ['#fffaf0', '#ffe3b0', '#f5b86a'], halo: 'rgba(255,190,80,0.85)' },
    lavkaplumbaga: { ad: 'Kül Muhafızı', svg: SVG.lavkaplumbaga, lines: ['kaplumbaga_'], disc: ['#fff8f0', '#ffd6b0', '#ff9f6a'], halo: 'rgba(255,130,60,0.85)' },
    sovalye: { ad: 'Yeminbozan', svg: SVG.sovalye, lines: ['sovalye_'], disc: ['#fffbea', '#ffe39a', '#3d64d8'], halo: 'rgba(90,130,255,0.9)' },   // royal blue + gold
    ejderha: { ad: 'Gece Yutan', svg: SVG.dragon, lines: ['ejderha_', 'ejder'], disc: ['#fff6fc', '#ffc9ec', '#f59ad6'], halo: 'rgba(255,90,140,0.85)' },
  };
  const BOSS_ORDER = ['kopukusta','aytavsan','kraljole', 'kefirdev', 'kostebekusta', 'lavkaplumbaga', 'sovalye', 'ejderha'];   // when ZONES has no boss fields yet
  const BOSS_SEALS = {
    kopukusta: 'M4 6L12 3L20 6L17 16L12 21L7 16Z', aytavsan: 'M15 3A9 9 0 1 0 21 16A8 8 0 0 1 15 3Z',
    kraljole:'M4 14L3 5L8 9L12 3L16 9L21 5L20 14ZM5 18H19M8 21H16',
    kefirdev:'M6 5L12 3L19 6L18 13L12 19L10 13L4 11ZM10 8H14M12 18V22',
    kostebekusta:'M5 4L8 9L4 19M12 3L12 12L8 22M19 4L16 9L20 19M7 12H17',
    lavkaplumbaga:'M3 17L7 8L10 12L12 3L16 11L18 8L22 17ZM6 21H19',
    sovalye:'M5 3L8 7L12 5L16 7L19 3L17 15L12 21L7 15ZM8 10H16M12 12V17',
    ejderha:'M3 3L7 8L3 12L9 14L12 21L15 14L21 12L17 8L21 3L14 7L12 5L10 7ZM8 11L10 12M14 12L16 11'
  };
  const BOSS_DISCS = {
    kopukusta:['#5a655c','#39433d','#24272b'], aytavsan:['#665a72','#40384c','#26222d'],
    kraljole:['#665148','#403336','#1d2029'], kefirdev:['#66664c','#424735','#20262a'],
    kostebekusta:['#6c5d4e','#443c38','#24252b'], lavkaplumbaga:['#815a45','#53372f','#292329'],
    sovalye:['#626266','#3c4047','#20252d'], ejderha:['#67444a','#3a2932','#1e212b']
  };
  for (const t of BOSS_ORDER) {
    BOSS_UI[t].disc = BOSS_DISCS[t];
    BOSS_UI[t].halo = 'rgba(171,133,98,0.45)';
    BOSS_UI[t].svg = '<svg class="u-dimg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#292933"/><path d="'+BOSS_SEALS[t]+'" fill="none" stroke="#c0ad93" stroke-width="1.5" stroke-linejoin="miter"/><path d="M9 15L12 17L15 15" fill="none" stroke="#b26150" stroke-width="1"/></svg>';
  }
  const bossUi = t => BOSS_UI[t] || { ad: 'Lanetli Yaratık', svg: SVG.bstar, lines: [], disc: BOSS_UI.ejderha.disc, halo: BOSS_UI.ejderha.halo };
  const BP = {};   // type → { url, cv, tried, img }
  const bpRec = t => BP[t] || (BP[t] = { url: null, cv: null, tried: false, img: null });
  const DRG = bpRec('ejderha');
  const BP_ST = { move: 0, windup: -1, attack: -1, hurt: 0, frozen: false, dying: -1, t: 0, phase: 'idle', phaseT: 0, burrow: 0,
    breath: -1, stomp: -1, roar: -1, fireball: -1 };
  // Dragon framing (model metres: head centre ≈ (0, 3.56, 0.74), horns up to y 4.6): almost frontal, a little from above; the
  // wings are folded away (wings: false) so only the head, horns and hearts fill the badge. Light levels. Tests: UI._DC.
  const DRG_CAM = { cx: 0, cy: 3.78, cz: 1.1, rad: 1.5, dx: 0.16, dy: 0.3, fov: 24, hemi: 1.0, key: 2.4, rim: 3.5, wings: false };
  // The other bosses: a close-up spot in model metres (cam: centre + radius, like DRG_CAM — the mole's head with its drill
  // hat, the turtle's face with the little volcano behind it), or they frame themselves from their drawn silhouette (a
  // first small render finds it, see bossPortrait): the band of its height to fill (y0..y1 from the feet up) and how much
  // of the badge it fills. dx/dy: view direction (right, up; toward the face). A model's own m.portrait = {cx, cy, cz, rad}
  // wins over both. Tests: UI._BF.
  const BOSS_FIT = {
    kopukusta: { over: true, dx: .12, dy: .16, cam: { cx: 0, cy: 1.85, cz: .35, rad: .85 } },
    aytavsan: { over: true, dx: .12, dy: .16, cam: { cx: 0, cy: 1.85, cz: .35, rad: .85 } },
    kraljole: { y0: 0, y1: 1, dx: 0.12, dy: 0.24, fill: 0.9 },
    // the bottle seen from the front (from above its white shoulders hide the neck): the whole crown cork on top (05 moved the
    // label face up: cork top ≈ y 2.76), the smiling label face and a bit of the glass shoulders, so it reads as a bottle
    kefirdev: { over: true, dx: 0.1, dy: -0.05, cam: { cx: 0, cy: 1.9, cz: 0.75, rad: 1.25 } },
    kostebekusta: { dx: 0.12, dy: 0.14, cam: { cx: 0, cy: 2.0, cz: 0.45, rad: 1.12 } },
    lavkaplumbaga: { dx: 0.12, dy: 0.2, cam: { cx: 0, cy: 1.26, cz: 1.62, rad: 1.0 } },   // the face fills the badge (reads at 58 px), lava-crack shell around
    // the knight on his horse, framed from its silhouette (the model's own m.portrait wins): the upper part seen from the front,
    // a little from the right and above — his rainbow plume, the face under the raised visor and the horse's smiling head
    sovalye: { y0: 0.45, y1: 1, dx: 0.2, dy: 0.16, fill: 0.95 },
    _: { y0: 0, y1: 1, dx: 0.15, dy: 0.25, fill: 0.9 },
  };
  function bossSvg(t) { return bossUi(t).svg.replace('class="u-dimg"', `class="u-dimg b-${t}"`); }
  function bossHTML(t) { t = t || 'ejderha'; const R = BP[t]; return R && R.url ? `<img class="u-dimg b-${t}" src="${R.url}" alt="">` : bossSvg(t); }
  // Boss of zone i: ZONES[i].boss (Round 3), else the level's bossType, else the old castle-only dragon.
  function zoneBossOf(i) { const Z = M.ZONES && M.ZONES[i]; return Z ? Z.boss || null : null; }
  function zoneBoss(i) {
    const Z = M.ZONES && M.ZONES[i], L = M.GAME && M.GAME.L;
    if (Z && Z.boss) return Z.boss;
    if (L && L.bossType) return L.bossType;
    return L && L.boss ? 'ejderha' : null;
  }
  function bpRender(sc, cam, N, samples) {
    const rt = new THREE.WebGLRenderTarget(N, N, { samples, colorSpace: THREE.SRGBColorSpace, depthBuffer: true });
    try {
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
      renderer.render(sc, cam);
      const buf = new Uint8Array(N * N * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, N, N, buf);
      return buf;
    } finally { renderer.setRenderTarget(null); rt.dispose(); }   // the caller restores its own target afterwards
  }
  function bossPortrait(type) {
    type = type || 'ejderha';
    const R = bpRec(type);
    if (R.tried) return R.url;
    R.tried = true;
    const E = M.EMODEL;
    if (ICON || !E || typeof E.build !== 'function' || typeof renderer === 'undefined' || !renderer || !renderer.readRenderTargetPixels) return null;
    const N = 256, sc = new THREE.Scene(), lights = [];
    const prevRT = renderer.getRenderTarget(), prevCol = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    let m = null;
    try {
      m = E.build(type, {});
      if (!m || !m.root) throw new Error('no model');
      if (m.type && m.type !== type) throw new Error('no model for ' + type + ' yet (got ' + m.type + ')');   // keep the SVG, not a stand-in jelly
      const drg = type === 'ejderha';
      if (m.setMood) m.setMood('grumpy');
      if (m.s) { m.s.t = 0; m.s.ph = 0; if (drg) m.s.flap = 0; }   // calm idle pose, head straight
      if (m.anim) m.anim(0, BP_ST);
      if (drg && !DRG_CAM.wings && m.B) for (const w of [m.B.wingL, m.B.wingR]) if (w && w.scale) w.scale.setScalar(1e-4);   // head portrait: fold the wings away
      m.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
      sc.add(m.root); m.root.updateMatrixWorld(true);
      // camera: the dragon's head close-up (DRG_CAM), a model's own hint, or a generous first framing that is tightened below
      const F = DRG_CAM, fit = BOSS_FIT[type] || BOSS_FIT._, hint = (fit.over && fit.cam) || m.portrait || fit.cam;   // (over: the UI's close-up wins)
      const cam = new THREE.PerspectiveCamera(drg ? F.fov : 24, 1, 0.1, 60);
      let c, rad, dir, auto = false;
      if (drg) { c = new THREE.Vector3(F.cx, F.cy, F.cz); rad = F.rad; dir = new THREE.Vector3(F.dx, F.dy, 1); }
      else if (hint && hint.rad > 0) {
        c = new THREE.Vector3(hint.cx || 0, hint.cy || 0, hint.cz || 0); rad = hint.rad;
        dir = new THREE.Vector3(hint.dx !== undefined ? hint.dx : fit.dx, hint.dy !== undefined ? hint.dy : fit.dy, 1);
      } else {
        const box = new THREE.Box3().setFromObject(m.root);
        if (box.isEmpty()) throw new Error('empty model bounds');
        const sph = box.getBoundingSphere(new THREE.Sphere());
        c = sph.center; rad = Math.max(0.3, sph.radius * 1.15); auto = true;
        dir = new THREE.Vector3(fit.dx, fit.dy, 1);
      }
      dir.normalize();
      const dist = rad / Math.sin(cam.fov * Math.PI / 360);
      cam.position.copy(c).addScaledVector(dir, dist); cam.near = dist * 0.3; cam.far = dist * 3; cam.updateProjectionMatrix();
      cam.lookAt(c); cam.updateMatrixWorld();
      const rel = (x, y, z, k) => new THREE.Vector3(x, y, z).applyQuaternion(cam.quaternion).multiplyScalar(k).add(c);
      // lights: the main scene's counts (spare slots at intensity 0); warm key from the upper left, pink rim from behind
      let np = 0, nd = 0, nds = 0, nh = 0, ns = 0;
      scene.traverseVisible(o => { if (!o.isLight) return; if (o.isPointLight) np++; else if (o.isDirectionalLight) { nd++; if (o.castShadow) nds++; } else if (o.isHemisphereLight) nh++; else if (o.isSpotLight) ns++; });
      const add = l => { sc.add(l); lights.push(l); return l; };
      const hemi = add(new THREE.HemisphereLight(0xe0d6c8, 0x655b53, F.hemi)); hemi.visible = nh > 0;
      const sb = Math.max(3, rad * 1.6);
      for (let i = 0; i < Math.max(1, nd); i++) {
        const k = add(new THREE.DirectionalLight(0xfff2e4, i === 0 ? F.key : 0));
        k.position.copy(rel(-1.4, 2.6, 1.2, Math.max(2, rad * 2))); k.target.position.copy(c); sc.add(k.target); k.target.updateMatrixWorld();
        if (i < nds) { k.castShadow = true; k.shadow.mapSize.set(256, 256); const s = k.shadow.camera; s.left = s.bottom = -sb; s.right = s.top = sb; s.near = 0.1; s.far = sb * 8; s.updateProjectionMatrix(); }
      }
      for (let i = 0; i < Math.max(1, np); i++) { const l = add(new THREE.PointLight(0xb88c67, i === 0 ? F.rim : 0, 12 * Math.max(1, rad / 1.5), 1.5)); l.position.copy(rel(1.3, 0.9, -1.5, rad * 2.2)); }
      for (let i = 0; i < ns; i++) add(new THREE.SpotLight(0xffffff, 0));
      sc.fog = scene.fog ? (scene.fog.isFogExp2 ? new THREE.FogExp2(0, 0) : new THREE.Fog(0, 1e4, 2e4)) : null;
      sc.environment = scene.environment || null;
      if (auto) {   // small first render: where is the silhouette? Then look only at that square (same perspective, exact crop)
        const n1 = 128, a = bpRender(sc, cam, n1, 0);
        let x0 = n1, x1 = -1, y0 = n1, y1 = -1;
        for (let r = 0; r < n1; r++) for (let x = 0; x < n1; x++) {
          if (a[(r * n1 + x) * 4 + 3] < 24) continue;
          const y = n1 - 1 - r;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        if (x1 < 0) throw new Error('empty first render');
        const h = y1 + 1 - y0, top = y0 + h * (1 - (fit.y1 ?? 1)), bot = y0 + h * (1 - (fit.y0 ?? 0));
        const w = Math.max(x1 + 1 - x0, bot - top) / (fit.fill || 0.9), mx = (x0 + x1 + 1) / 2, my = (top + bot) / 2;
        cam.setViewOffset(n1, n1, mx - w / 2, my - w / 2, w, w);
      }
      const buf = bpRender(sc, cam, N, 4);
      renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCol, prevA);
      // flip + un-premultiply into a canvas, then add a soft drop shadow
      const raw = cnv(N), rc = raw.getContext('2d'), img = rc.createImageData(N, N), o = img.data;
      let cover = 0;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const s = ((N - 1 - y) * N + x) * 4, d = (y * N + x) * 4, a = buf[s + 3], k = a > 0 && a < 255 ? 255 / a : 1;
        o[d] = Math.min(255, buf[s] * k); o[d + 1] = Math.min(255, buf[s + 1] * k); o[d + 2] = Math.min(255, buf[s + 2] * k); o[d + 3] = a;
        cover += a;
      }
      if (cover < N * N * 255 * 0.08) throw new Error('empty portrait');   // nothing drawn (lost context…): keep the SVG
      rc.putImageData(img, 0, 0);
      const out = cnv(N), g = out.getContext('2d');
      g.shadowColor = 'rgba(60,10,90,0.4)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
      g.drawImage(raw, 0, 0);
      R.cv = out; R.url = out.toDataURL('image/png');
    } catch (e) { warn('bossPortrait ' + type, e); R.url = null; R.cv = null; }
    finally {
      try { renderer.setRenderTarget(prevRT); renderer.setClearColor(prevCol, prevA); } catch (e) { /* ignore */ }
      if (m) { try { sc.remove(m.root); if (m.dispose) m.dispose(); } catch (e) { /* ignore */ } }
      for (const l of lights) { try { if (l.dispose) l.dispose(); } catch (e) { /* ignore */ } }
    }
    if (R.url) bossApply(type);
    return R.url;
  }
  const dragonPortrait = () => bossPortrait('ejderha');
  function bossApply(t) {   // swap the SVG stand-in for the portrait wherever this boss is on screen
    if (D.bossIco && D.boss.dataset.b === t) D.bossIco.innerHTML = bossHTML(t);
    if (MM.spr['b:' + t]) MM.spr['b:' + t] = bossSprite(t);
    if (D.subIco && D.subIco.dataset.b === t) D.subIco.innerHTML = bossHTML(t) + subBadge(D.subIco.dataset.badge);
    if (D.winBoss) D.winBoss.querySelectorAll('.u-wb[data-b="' + t + '"]').forEach(e => { e.innerHTML = bossHTML(t); });
  }
  // Voice line → boss (its portrait sits next to the subtitle): EDEF[type].lines {giris, bitti, yarim}, else the key prefixes.
  function lineBoss(key) {
    if (!key) return null;
    const ED = M.EDEF;
    if (ED) for (const t in ED) { const l = ED[t] && ED[t].lines; if (l && typeof l === 'object') for (const k in l) if (l[k] === key) return t; }
    for (const t in BOSS_UI) for (const p of BOSS_UI[t].lines) if (key.indexOf(p) === 0) return t;
    return null;
  }
  // Minimap goal icon: the portrait (or the SVG stand-in once it has loaded) on the boss's pastel disc with a coloured halo.
  function bossSpr(t) { t = t || 'ejderha'; return MM.spr['b:' + t] || (MM.spr['b:' + t] = bossSprite(t)); }
  function bossSprite(t) {
    const R = bpRec(t), U = bossUi(t);
    let src = R.cv;
    if (!src) {
      if (!R.img && typeof Image !== 'undefined') {
        const im = R.img = new Image();
        im.onload = () => { if (!R.cv && MM.spr['b:' + t]) MM.spr['b:' + t] = bossSprite(t); };
        im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(U.svg);
      }
      if (R.img && R.img.complete && R.img.naturalWidth) src = R.img;
    }
    return sprite(30, (x, s) => {
      const c = s / 2, r = s * 0.4;
      let g = x.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, U.halo); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
      g = x.createRadialGradient(c, c - r * 0.25, 0, c, c, r);
      g.addColorStop(0, U.disc[0]); g.addColorStop(0.55, U.disc[1]); g.addColorStop(1, U.disc[2]);
      x.save(); x.beginPath(); x.arc(c, c, r, 0, TAU); x.fillStyle = g; x.fill(); x.clip();
      x.imageSmoothingQuality = 'high';
      if (src) x.drawImage(src, c - r, c - r, 2 * r, 2 * r);
      x.restore();
      x.lineWidth = 1.6; x.strokeStyle = '#ffd23f'; x.beginPath(); x.arc(c, c, r, 0, TAU); x.stroke();
    });
  }

  // ───────────────────────── Banners, toasts, cards, subtitles ─────────────────────────
  const BQ = [];
  let bTimer = 0, bBusy = false;
  // milk drips under the Çürüme Vadisi zone ribbon (stretched to the ribbon's width; drawn like the ribbon's cream)
  const ZONE_DRIP = '<svg class="u-zdrip" viewBox="0 0 400 34" preserveAspectRatio="none"><path d="M0 0H400V4C392 4 390 8 384 8C376 8 377 4 366 4' +
    'C356 4 354 13 352 22C350 30 340 30 339 22C338 12 336 6 326 5C312 4 306 10 296 9C286 8 284 4 272 4C262 4 262 9 258 16C255 22 247 22 246 15' +
    'C245 8 242 5 232 5C216 5 212 11 196 11C182 11 180 4 168 4C158 4 156 10 154 20C152 32 140 32 139 21C138 10 134 5 122 5C108 5 104 10 92 10' +
    'C82 10 80 4 70 4C60 4 58 8 56 14C54 20 46 20 45 14C44 8 40 4 30 4C20 4 18 8 10 8C4 8 4 4 0 4Z"/></svg>';
  // Veba Şehri: the ribbon is a piece of the sandstone city wall — battlements on top (stretched to its width, like the drips)
  // and festive bunting flags hanging from its lower edge
  const ZONE_WALL = '<svg class="u-zwall" viewBox="0 0 400 20" preserveAspectRatio="none"><path d="M0 20V16' +
    Array.from({ length: 10 }, (_, i) => `H${i * 40 + 8}V0H${i * 40 + 32}V16`).join('') + 'H400V20Z"/></svg>';   // (10 merlons on a ledge)
  const ZONE_FLAGS = '<div class="u-zflags">' + '<i></i>'.repeat(11) + '</div>';
  function banner(o) {
    for (let i = BQ.length - 1; i >= 0; i--) if (BQ[i].kind === o.kind && (o.kind === 'level' || o.kind === 'zone')) BQ.splice(i, 1);   // newest wins
    if (BQ.length > 4) BQ.shift();
    BQ.push(o);
    if (!bBusy) nextBanner();
  }
  function nextBanner() {
    const o = BQ.shift();
    if (!o) { bBusy = false; return; }
    bBusy = true;
    const b = D.banner;
    b.className = 'u-banner ' + (o.kind || '') + (o.theme ? ' t-' + o.theme : '');
    let h = '';
    if (o.rays) h += '<div class="u-rays"></div>';
    if (o.kind === 'zone') {
      const dairy = o.theme === 'dairy', town = o.theme === 'town';
      const mk = dairy ? '<span class="u-zmk">☣</span>' : town ? '<span class="u-zmk">♜</span>' : '◆';
      if (o.small) h += `<div class="u-zsm">${mk} ${esc(o.small)} ${mk}</div>`;
      const rib = `<div class="u-zrib">${town ? ZONE_WALL : ''}<div class="u-btitle">${ol(o.title, 'u-gold-t')}</div>${town ? ZONE_FLAGS : ''}</div>`;
      // Çürüme Vadisi: a creamy ribbon with milk dripping from its lower edge (Veba Şehri: a piece of the city wall, see above)
      h += dairy ? `<div class="u-zwrap">${rib}${ZONE_DRIP}</div>` : rib;
      if (o.pips && o.pips.n > 1) {   // where we are on the journey: one gem per zone (done · here · still ahead)
        let p = '';
        for (let i = 0; i < o.pips.n; i++) p += `<i class="${i < o.pips.i ? 'd' : i === o.pips.i ? 'c' : ''}"></i>`;
        h += `<div class="u-zpips">${p}</div>`;
      }
    } else {
      if (o.icon) h += `<div class="u-bico${o.med ? ' med' : ''}"${o.color ? ` style="--c:${o.color};--cd:${shade(o.color, -0.5)}"` : ''}>${o.icon}</div>`;
      if (o.title) h += `<div class="u-btitle">${ol(o.title, 'u-gold-t')}</div>`;
      if (o.sub) h += `<div class="u-bsub">${ol(o.sub)}</div>`;
    }
    b.innerHTML = h;
    b.style.removeProperty('--zs');
    if (o.kind === 'zone') {   // a long name ("Köstebek ve Salyangoz Mağarası") on a narrow portrait screen: the ribbon shrinks to fit
      const rib = b.querySelector('.u-zrib'), w = rib ? rib.offsetWidth : 0, max = (innerWidth || 1024) * 0.94;
      if (w > max) b.style.setProperty('--zs', Math.max(0.4, max / w).toFixed(3));
    }
    void b.offsetWidth;
    b.classList.add('on');
    clearTimeout(bTimer);
    const dur = (o.dur || 2.4) * (BQ.length ? 0.7 : 1);
    if (S.hold) return;
    bTimer = setTimeout(() => {
      b.classList.remove('on'); b.classList.add('out');
      bTimer = setTimeout(() => { b.classList.remove('out'); nextBanner(); }, 430);
    }, dur * 1000);
  }
  function clearBanners() { BQ.length = 0; clearTimeout(bTimer); bBusy = false; D.banner.className = 'u-banner'; }

  let tTimer = 0;
  function toast(text, info) {
    const t = D.toast;
    t.textContent = text; t.classList.toggle('info', !!info);
    t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    clearTimeout(tTimer); if (!S.hold) tTimer = setTimeout(() => t.classList.remove('on'), 2600);
  }

  const CQ = [];
  let cTimer = 0, cBusy = false;
  const RELIC_LORE = {
    tahta:'Kırıldı. Yeniden dövüldü. Vazgeçmedi.', demir:'Kenarında affedilmiş tek bir iz yok.', kristal:'Toprağın sakladığı fısıltılar keskinleşti.',
    ates:'Köz söner. İçindeki hınç sönmez.', yildiz:'Işığı yutan bir yarıkla dövüldü.', gokkusagi:'Hüküm verildi. Geri dönüş yok.',
    findik:'Bir canavarın kemiği, sahibine karşı.', mese:'Bu kök artık hiçbir şey yeşertmez.', ay:'Doğmayan ayın soğuk parçası.', kor:'Küllerin unuttuğu son ateş.',
    yildizdegnek:'Bakışını uçurumdan geri alamadı.', gokdegnek:'Karanlık, içindeki boşluğu dolduramadı.',
    lavkilic:'Örsün üzerindeki kül hâlâ sıcak.', lavdegnek:'Fırının hükmü, avcının elinde.', ejderkilic:'Geceyi yutan çeneden söküldü.', ejderdegnek:'Karanlığın kendi dilinde yazılmış bir emir.',
    migfer:'Alnındaki yemin hiçbir mezarda silinmez.', sihirbaz:'Yüzünü saklar. Niyetini saklamaz.', kovboy:'Beklediği mezarların hepsi boş.', korsan:'Yağmacının son bakışı demire kazındı.',
    tac:'Ağırlığı altından gelmiyor.', joletac:'Taht çöktü. Laneti kaldı.', kostebekfener:'Yeraltının görmemesi gereken yüz.',
    kirmizi:'Yemin bir kere edilir. Bedeli hep ödenir.', mavi:'Geceden kesilmiş, sessizlikle dikilmiş.', yesil:'Dikenlerin arasında geriye kalan tek örtü.', mor:'Rüzgâr yokken de kıpırdar.', kefirkopuk:'Veba, dikişlerinden sökülemedi.',
    buzkilic:'Soğuğu kıştan gelmiyor.', guniskilic:'Son ışığın küllerinden dövüldü.', dalga:'Suyun altında kalan çığlıkları taşır.',
    mercan:'Deniz geri vermedi. Avcı söküp aldı.', bulut:'Söylenmemiş lanetlerin dumanı.', cicek:'Her dikeni bir borcu hatırlatır.',
    bulutbere:'Baş eğilirse kül dökülür.', yaprakbaslik:'Orman yüzünü artık tanımıyor.', deniz:'İsmi silinenlerin son örtüsü.', gunes:'Işık söndü; izleri kumaşta kaldı.',
    pamukseker:'Ağzı çelikten. Açlığı bitmez.', kalp:'Masumların suskunluğu çeliğe dönüştü.', uzay:'Ucu, dünyanın bittiği yere uzanır.', kuyruklu:'Son göğün parçaları ağzında bilenmiş.',
    lolipop:'Kaçan ruhların izine takılır.', kedipati:'Canavarın pençesi artık avcıya bağlı.', gezegen:'İçinde hiç doğmamış bir dünya var.',
    kedikulak:'Boynuzları sahibinin merhametini saklamaz.', dondurma:'Her çıkıntısı yeraltından bir hatıra.', yunikorn:'Kırılmayan boynuz, bozulmuş bir yeminin izi.', astronot:'Ardındaki yüzü boşluk bile göremedi.',
    sekerpelerin:'Yırtıklarından yalnız kül geçer.', panda:'İlikleri topraktan geri alındı.', galaksi:'Bir yıldız daha düşmeyecek.',
    jolesihir:'Çürük tahtın emirleri tersine çevrildi.', kefirsihir:'Lanet, eski sahibine geri dönüyor.', magarasihir:'Kazdığı mezar, sonunda kendisinindi.',
    joleikiz:'Tahtını kesen kılıç artık avcıda.', kefirikiz:'Vebanın boğazına kendi kancası.', magaraikiz:'Toprağı yaran pençe yön değiştirdi.', lavikiz:'Kül Muhafızı son kez diz çöktü.', ejderikiz:'Gece, bu yemini yutamadı.',
    sovalyemigfer:'İhanetin izi demirden silinmedi.', sovalyesihir:'Bozulmuş yeminin gölgesinden dikildi.', sovalyeikiz:'Bir daha aynı yemini bozamaz.'
  };
  function relicLore(it) {
    const id = typeof it.base === 'object' && it.base ? it.base.id : it.base;
    if (id === 'gokkusagi' && it.slot === 'cape') return 'Son hükmün ardından kalan sessizlik.';
    return RELIC_LORE[id] || 'Karanlıktan sökülen bir emanet.';
  }
  function itemCard(item, equipped) {
    if (!item) return;
    if (CQ.length > 2) CQ.shift();
    CQ.push({ item, equipped });
    if (!cBusy) nextCard();
  }
  function itemThumb(item) {
    const I = M.ITEMS;
    const url = I && I.thumb ? safe('ITEMS.thumb', () => I.thumb(item)) : null;
    if (url) return `<img src="${url}" alt="">`;
    const base = typeof item.base === 'object' && item.base ? item.base.id : item.base;
    return `<span class="u-temo">${BASE_EMO[base] || SLOT_EMO[item.slot] || '🎁'}</span>`;
  }
  function stars(item) {
    const I = M.ITEMS;
    let n = I && I.stars ? safe('ITEMS.stars', () => I.stars(item)) : 0;
    if (!n) { const p = item.power || 0; n = p >= 34 ? 5 : p >= 24 ? 4 : p >= 16 ? 3 : p >= 10 ? 2 : 1; }   // same power-only rule as ITEMS.stars
    n = clamp(n | 0, 1, 5);
    return '◆'.repeat(n) + `<span class="e">${'◆'.repeat(5 - n)}</span>`;
  }
  const rarCol = r => { const I = M.ITEMS; return (I && I.RARITY && I.RARITY[r] && I.RARITY[r].color) || RAR[r] || '#fff'; };
  const rarAd = r => { const I = M.ITEMS; return (I && I.RARITY && I.RARITY[r] && I.RARITY[r].ad) || RAR_AD[r] || ''; };
  function nextCard() {
    const o = CQ.shift();
    if (!o) { cBusy = false; return; }
    cBusy = true;
    const it = o.item, r = clamp(it.rarity || 0, 0, 3), col = rarCol(r), c = D.card;
    c.style.setProperty('--rc', col); c.style.setProperty('--rl', shade(col, 0.55)); c.style.setProperty('--rd', shade(col, -0.55));
    c.classList.toggle('leg', r >= 3);
    const name = (it.ad || (typeof it.base === 'string' ? it.base : 'Hazine')).replace(/ ✦$/, '\u00a0✦');   // (a long name wraps before its ✦, never leaves it alone)
    const slotWord = it.slot === 'weapon' ? (M.ITEMS && M.ITEMS.isWand(it) ? 'LANET ASASI' : 'İNFAZ SİLAHI') : it.slot === 'hat' ? 'MİĞFER' : 'KEFEN';
    c.innerHTML = `<div class="u-cthumb">${itemThumb(it)}</div><div class="u-ctext">
      <div class="u-cnew">YENİ ${slotWord} · ${esc(rarAd(r).toLocaleUpperCase('tr'))}</div>
      <div class="u-cname${name.length > 17 ? ' long' : ''}">${ol(name)}</div>
      <div class="u-stars">${stars(it)}</div>
      <div class="u-clore">${esc(relicLore(it))}</div>
      <div class="u-cstat${o.equipped ? ' eq' : ''}">${o.equipped ? '✓ Kuşanıldı' : '⛓ Çantada'} · Güç ${Math.round(it.power || 0)}</div></div>`;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
    clearTimeout(cTimer);
    if (S.hold) return;
    cTimer = setTimeout(() => { c.classList.remove('on'); cTimer = setTimeout(nextCard, 480); }, (CQ.length ? 2.0 : 3.2) * 1000);
  }
  function clearCards() { CQ.length = 0; clearTimeout(cTimer); cBusy = false; D.card.classList.remove('on'); }

  let subHide = 0;
  function lineKey(text) {   // AUD calls onSubtitle before it sets AUD.current, so look the key up by text
    const A = M.AUD, L = A && A.LINES;
    if (L) for (const k in L) if (L[k] === text) return k;
    return A && A.current;
  }
  const SUB_EMO = { baykus: '☠', ilk_salyangoz: '☣', ilk_kostebek: '⛏', ilk_kaplumbaga: '⛓', ilk_ateskusu: '♜',
    // Çürüme Vadisi (Round 4): the valley, its creatures, and the glass of kefir the happy Kefir Devi gives Feza
    kefir: '☣', ilk_yogurt: '☣', ilk_kaymak: '☠', ilk_kopuk: '☣', ilk_peynir: '⛓', kefir_ikram: '☣', yolculuk: '◆',
    // Veba Şehri (Round 5): the walled town and its grumpy townsfolk (the knight's lines show his portrait)
    sehir: '♜', ilk_nobetci: '⛓', ilk_simitci: '☠', ilk_supurgeci: '⚒', ilk_tellal: '⛓' };
  // Round 6 bonus lines: the boss's own portrait (lineBoss, by key prefix) with a small badge of the bonus thing in its corner
  const SUB_BADGE = { kraljole_tac: '♜', kraljole_saskin: '♜', kefirdev_balon: '☣', kefirdev_hik: '☣', usta_saklambac: '⛏', usta_yakaladin: '◆',
    kaplumbaga_tas: '◆', kaplumbaga_devrildi: '◆', sovalye_havuc: '⛓', sovalye_atdoydu: '⛓', ejderha_kalp: '◆', ejderha_sevgi: '◆' };
  const subBadge = b => (b ? '<span class="u-sbadge">' + b + '</span>' : '');
  const SUB_MILK = { kefir: 1, ilk_yogurt: 1, ilk_kaymak: 1, ilk_kopuk: 1, ilk_peynir: 1, kefir_ikram: 1 };   // their icon sits on a milky-blue disc (ui.css .u-subico.milk)
  const SUB_TOWN = { sehir: 1, ilk_nobetci: 1, ilk_simitci: 1, ilk_supurgeci: 1, ilk_tellal: 1 };   // … on a sky-blue disc with a gold ring (.u-subico.town)
  // Title screen: the spoken "Oyna düğmesine bas…" line sits just above the Oyna / Devam Et buttons, never on them. Measured
  // from the buttons' layout box (offsetTop ignores their entry/breathing transforms); other screens use the CSS positions.
  function subPlace() {
    if (!D.sub) return;
    let b = '';
    if (S.mode === 'title' && D.tbtns && D.title.classList.contains('on')) {
      const top = D.tbtns.offsetTop, k = clamp(Math.min(innerWidth, innerHeight) / 800, 0.6, 1.12);
      if (top > 0) b = Math.round(Math.max(0, innerHeight - top) + 16 * k) + 'px';
    }
    if (D.sub.style.bottom !== b) D.sub.style.bottom = b;
    subMeasure();
  }
  // Where the subtitle box starts (layout top, ignores its slide-up transform) while it shows: the story/boss camera keeps
  // Feza (and the boss) above it, the title camera lifts Feza above it.
  function subMeasure() {
    const on = D.sub.classList.contains('on');
    S.subTop = on ? D.sub.offsetTop : -1; S.subBot = on ? D.sub.offsetTop + D.sub.offsetHeight : -1;
    S.logoBot = on && S.mode === 'title' && D.logo ? layBox(D.logo, _lb).b : -1;   // (the title lift keeps Feza's head under it)
  }
  function subtitle(text) {
    clearTimeout(subHide);
    if (text) {
      // a boss's lines: that boss's friendly portrait (cached at its zone load); a line with its own icon keeps it (the
      // glass of kefir while Feza drinks, even if EDEF lists that line with the Kefir Devi)
      const key = lineKey(text), emo = SUB_EMO[key], bt = emo ? null : lineBoss(key);
      const badge = bt && SUB_BADGE[key] || '';
      if (bt) D.subIco.innerHTML = bossHTML(bt) + subBadge(badge);
      else D.subIco.textContent = emo || '◆';
      D.subIco.dataset.badge = badge;
      D.subIco.classList.toggle('drg', !!bt); D.subIco.classList.toggle('milk', !bt && !!SUB_MILK[key]); D.subIco.classList.toggle('town', !bt && !!SUB_TOWN[key]);
      D.subIco.dataset.b = bt || '';
      subPlace();
      D.subTxt.textContent = text;
      D.sub.classList.add('on');
      subMeasure();   // (after the text: one or two lines)
    } else subHide = setTimeout(() => { D.sub.classList.remove('on'); S.subTop = S.subBot = -1; }, 380);   // queued lines follow ~0.3 s later: no flicker
  }

  // ───────────────────────── Fade ─────────────────────────
  let fadeTok = 0;
  function fade(to, dur = 0.5, cls = '') {
    const f = D.fade, tok = ++fadeTok;
    if (cls !== null) f.className = cls;
    f.style.pointerEvents = to > 0.5 ? 'auto' : 'none';
    f.style.transition = `opacity ${dur}s ease`;
    void f.offsetWidth;   // commit the start value so the transition runs
    if (tok === fadeTok) f.style.opacity = to;
    return new Promise(res => setTimeout(res, dur * 1000 + 40));
  }
  function fadeSnap(to, cls) {
    const f = D.fade; fadeTok++;
    if (cls !== undefined) f.className = cls;
    f.style.transition = 'none'; f.style.opacity = to; void f.offsetWidth;
  }
  const frames = n => new Promise(res => { const f = () => (n-- <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });

  // Generate a zone's lazy textures while the screen is black (avoids a hitch when the level first renders)
  // (by theme name: zone indices shifted when the volcano became zone 2)
  function ensureTex(i) {
    const T = M.TEX; if (!T || !T.ensure || typeof i !== 'number' || i < 0) return;
    const Z = M.ZONES && M.ZONES[i | 0];
    safe('TEX.ensure', () => T.ensure(Z && Z.theme ? Z.theme : i | 0));
  }
  // Zone a "Devam Et" will load (GAME's saveZone does the same): the save's zone id (zid, sv 4) when ZONES knows it, else
  // the index — saves from before the volcano (no sv or sv < 3) at zone ≥ 2 first move one zone on (Round 3), then saves
  // from before Çürüme Vadisi (sv < 4) at zone ≥ 1 move one more (Round 4). That index is in the Round 4 order (SAVE_Z4),
  // mapped by id onto today's ZONES (Round 5: Veba Şehri is index 4, so an old castle save stays the castle, index 5).
  const SAVE_Z4 = ['orman', 'kefir', 'magara', 'yanardag', 'kale'];
  const SAVE_Z5 = ['orman', 'kefir', 'magara', 'yanardag', 'sehir', 'kale'];
  function savedZone() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s || typeof s.zone !== 'number') return -1;
      const Zs = M.ZONES && M.ZONES.findIndex ? M.ZONES : null;
      if (typeof s.zid === 'string' && Zs) {
        const k = Zs.findIndex(Z => Z && Z.id === s.zid);
        if (k >= 0) return k;
      }
      let z = s.zone | 0;
      const sv = typeof s.sv === 'number' ? s.sv : 0, n = zoneCount();
      if (sv < 3 && z >= 2) z++;
      if (sv < 4 && z >= 1) z++;
      const oldOrder = sv < 5 ? SAVE_Z4 : sv < 6 ? SAVE_Z5 : null;
      const k = Zs && oldOrder && oldOrder[z] ? Zs.findIndex(Z => Z && Z.id === oldOrder[z]) : -1;
      return k >= 0 ? k : clamp(z, 0, n - 1);
    } catch (e) { return -1; }
  }

  // ───────────────────────── Screens / modes ─────────────────────────
  // A closing screen fades for 0.3 s: `.closing` (ui.css) and `inert` keep its buttons from catching taps meanwhile, so a
  // quick tap right after "Devam Et" reaches the game. The fade timer is per screen (a stale one must not cut a later fade).
  function showScreen(s, on) {
    if (on) { clearTimeout(s._closeT); s.classList.remove('closing'); s.classList.add('on'); s.inert = false; S.guardUntil = performance.now() + 320; }
    else if (s.classList.contains('on')) {
      clearTimeout(s._closeT); s.classList.remove('on'); s.classList.add('closing'); s.inert = true;
      s._closeT = setTimeout(() => { s.classList.remove('closing'); s.inert = false; }, 300);
    }
  }
  function setHud(on) {
    S.hud = on; D.root.classList.toggle('hud-on', on);
    syncDreamUnlock();
    syncDifficulty();
    if (on) { last.xp = last.lvl = last.gold = last.pot = -1; last.potEv = M.GAME ? M.GAME.P.potions : 99; ORB.acc = 1; }
  }
  function setMode(m) {
    S.mode = m;
    if (m !== 'play') releasePrimary();
    setHud(m === 'play');
    showScreen(D.title, m === 'title');
    subPlace();
  }
  function setPaused(on) {
    S.paused = on;
    D.root.classList.toggle('menu-on', on);   // subtitles slide under the menu dim
    if (M.GAME) M.GAME.paused = on;
    if (on) { releasePrimary(); S.atkHeld = false; }
    // gentle music dip while paused (needs AUD.dim; otherwise music just keeps playing)
    const A = M.AUD;
    if (A && typeof A.dim === 'function') safe('AUD.dim', () => A.dim(on));
    S.needRender = true;
  }
  // Menus only open during real play (not in the victory window, portal transition or title)
  function openPause() {
    if (!canMenu()) return;
    syncDreamUnlock();
    S.menu = 'pause'; D.pausePanel.classList.remove('asking');
    closeDifficulty();
    setPaused(true); showScreen(D.pause, true);
  }
  function openBag() {
    if (!canMenu()) return;
    S.menu = 'bag'; renderBag(); D.bagBtn.classList.remove('has-new');
    setPaused(true); showScreen(D.bagS, true);
  }
  function closeMenu() {
    if (!S.menu) return;
    if (S.menu === 'dream-travel') { finishDreamTravel(); return; }
    if (S.menu === 'dream') { closeDreamMap(); return; }
    if (S.menu === 'merchant') aud('stopVoice');
    if (S.menu === 'bag') newItems.clear();
    else { closeAsk(); closeDifficulty(); }
    showScreen(S.menu === 'bag' ? D.bagS : S.menu === 'merchant' ? D.shop : D.pause, false);
    S.menu = null; setPaused(false);
  }
  // Parent's wish: every launch is a new game ("Oyna"); "Devam Et" appears next to it only when the parent saved with
  // Mola › Kaydet. Starting a new game never touches that save (nothing is saved by itself).
  function showTitle() {
    syncDreamUnlock();
    const g = M.GAME;
    const has = !!(g && g.hasSave && safe('hasSave', () => g.hasSave()));
    D.contBtn.classList.toggle('u-hide', !has); D.playBtn.classList.remove('u-hide');
    // With a save (parent's wish): a big green "Devam Et" first and an orange "Baştan Başla" beside it (a new game from the
    // forest; the save itself stays until the next Kaydet). Without a save: just "Oyna".
    D.playBtn.innerHTML = has ? SVG.again + '<span>Baştan Başla</span>' : SVG.play + '<span>Yola Çık</span>';
    D.playBtn.classList.toggle('g', !has); D.playBtn.classList.toggle('o', has);
    D.contBtn.classList.toggle('g', has); D.contBtn.classList.toggle('b', !has);
    D.contBtn.style.order = has ? '-1' : '';
    D.playBtn.classList.toggle('main', !has); D.contBtn.classList.toggle('main', has);
    S.titleIdle = 0; S.titleSaid = 0;
    setMode('title');
    aud('music', 'title');
  }
  // Spoken title prompt for a child who can't read: after a quiet moment, then every 25 s while idle (at most 3 times).
  function titleVoiceTick(dt) {
    if (S.mode !== 'title' || S.menu || S.busy || S.titleSaid >= 3) return;
    const A = M.AUD; if (!A) return;
    if (!SILENT && !(A.ready && A.ready())) return;   // before the first touch iOS can't play it yet
    S.titleIdle += dt;
    if (S.titleIdle < (S.titleSaid ? 25 : 1.5) || (A.speaking && A.speaking())) return;
    S.titleIdle = 0; S.titleSaid++;
    const cont = !D.contBtn.classList.contains('u-hide');
    aud('say', cont ? 'devam' : 'basla', { prio: 1 });   // "Devam Et düğmesine bas…" with a save, else "Oyna düğmesine bas…"
  }
  async function startGame(cont, heroClass) {
    const g = M.GAME;
    if (S.busy || !g || (S.mode !== 'title' && S.mode !== 'choose')) return;
    if (!cont && !heroClass) { openChoice('title'); return; }
    S.busy = true;
    clearBanners(); clearCards(); hideBoss(); S.cine = null;
    const A = M.AUD;
    if (S.mode === 'choose' || (A && (A.current === 'basla' || A.current === 'devam'))) aud('stopVoice');   // the title prompt must not delay the intro
    try {
      if (cont) {
        showScreen(D.title, false);
        await fade(1, 0.45, 'load');
        ensureTex(savedZone());
        safe('continueGame', () => g.continueGame());
        setMode('play'); refreshAllSkills(); portraitSoon(0);
        renderNow(); await frames(2);
        fade(0, 0.6, null);
      } else {
        showScreen(D.choice, false); setPaused(false);
        newGameWithIntro(g, { heroClass: heroClass === 'hybrid' ? 'hybrid' : heroClass === 'wizard' ? 'wizard' : 'warrior', plus: false });
        setMode('play'); refreshAllSkills(); portraitSoon(0);
        // Baştan Başla while Feza napped: the nap's dim layer takes the touches — lift it, or he could not walk at all
        if (D.fade.style.pointerEvents === 'auto' || parseFloat(D.fade.style.opacity) > 0) fade(0, 0.35, null);
        startHint();   // The recorded story and the dream begin without another confirmation screen.
      }
    } finally { S.busy = false; }
  }
  // GAME.newGame() says giris1/giris2 itself; only say them here if it didn't (keeps the lines from doubling).
  function newGameWithIntro(g, o) {
    const A = M.AUD;
    let said = false;
    const orig = A && A.say;
    if (orig) A.say = function (k) { if (k === 'giris1' || k === 'giris_buyu' || k === 'giris_hibrit' || k === 'tekrar') said = true; return orig.apply(this, arguments); };
    S.cheered = 0;
    try { safe('newGame', () => g.newGame(o)); } finally { if (orig) A.say = orig; }
    if (!said && A && (!o || !o.plus)) { aud('say', o && o.heroClass === 'hybrid' ? 'giris_hibrit' : o && o.heroClass === 'wizard' ? 'giris_buyu' : 'giris1', { prio: 3 }); if (!o || (!o.heroClass || o.heroClass === 'warrior')) aud('say', 'giris2', { prio: 3 }); }
  }
  function restartAll() {
    if (!M.GAME || S.busy) return;
    showScreen(D.pause, false); S.menu = null;
    openChoice('pause');
  }
  // Mola › Kaydet: the only way progress is kept. The button itself says "Kaydedildi!" for a moment (the menu stays open).
  function saveNow() {
    const g = M.GAME, b = D.saveBtn;
    if (!g || !g.save || S.saveT) return;
    const ok = !!safe('save', () => g.save());
    b.classList.toggle('g', ok); b.classList.toggle('r', !ok); b.classList.remove('b');
    b.innerHTML = ok ? SVG.check + '<span>Kaydedildi!</span>' : SVG.close + '<span>Kaydedilemedi</span>';
    if (ok) { sfx('checkpoint', { vol: 0.7 }); bump(b, 1.08); } else nope(b);
    S.saveT = setTimeout(() => {
      S.saveT = 0; b.classList.remove('g', 'r'); b.classList.add('b'); b.innerHTML = SVG.save + '<span>Kaydet</span>';
    }, 1800);
  }
  function showVictory() {
    syncDreamUnlock();
    const g = M.GAME, P = g ? g.P : null;
    if (S.menu) closeMenu();   // never over an open bag/pause (it would also leave GAME.paused set for the next run)
    setMode('end');
    const chips = [];
    if (P) {
      chips.push(`<span class="u-chip">◆ Seviye ${P.lvl}</span>`, `<span class="u-chip"><span class="u-coin"></span> ${P.gold}</span>`);
      if (S.cheered) chips.push(`<span class="u-chip">☠ ${S.cheered} yaratık yok edildi</span>`);
    }
    D.winChips.innerHTML = chips.join('');
    // every zone's boss, happy now: portraits cached this session, else their SVG stand-ins — the missing ones (a game
    // continued from a save) are rendered one by one once the panel is up (S.bpq in step), behind the blur, and swapped in
    const bosses = [];
    for (let i = 0; i < zoneCount(); i++) { const t = M.ZONES ? zoneBossOf(i) : BOSS_ORDER[i]; if (t && bosses.indexOf(t) < 0) bosses.push(t); }
    D.winBoss.innerHTML = bosses.map((t, i) => `<span class="u-wb" data-b="${esc(t)}" style="animation-delay:${(-i * 0.35).toFixed(2)}s">${bossHTML(t)}</span>`).join('');
    D.winBoss.classList.toggle('u-hide', bosses.length < 2);
    S.bpq = bosses.length > 1 ? bosses.filter(t => !bpRec(t).tried) : []; S.bpqT = S.t + 0.8;
    confetti();
    showScreen(D.win, true);
  }
  function confetti() {
    const cols = ['#3a3537', '#726568', '#a85541', '#968b79'];
    let h = '';
    for (let i = 0; i < 32; i++) {
      const dur = frand(3.2, 6.5), del = -frand(0, dur);
      h += `<i class="${i % 4 === 0 ? 'c' : ''}" style="left:${frand(0, 100).toFixed(1)}%;background:${fpick(cols)};animation-duration:${dur.toFixed(2)}s;animation-delay:${del.toFixed(2)}s;--dx:${frand(-80, 80).toFixed(0)}px;--rot:${frand(360, 1080).toFixed(0)}deg"></i>`;
    }
    D.conf.innerHTML = h;
  }
  async function playAgain() {
    const g = M.GAME;
    if (!g || S.busy) return;
    S.busy = true;
    try {
      if (S.menu) closeMenu();
      showScreen(D.win, false);
      await fade(1, 0.5, 'load');
      D.conf.innerHTML = '';
      clearBanners(); clearCards(); hideBoss(); S.cine = null;
      // lines from the old run must not play into the new one — except the ending line itself, if a quick tap came before
      // it was over ("…Sen gerçek bir kahramansın!"): it finishes and 'tekrar' simply follows it
      // (GAME stops everything else just before it says 'son')
      const A = M.AUD;
      if (!(A && A.current === 'son')) aud('stopVoice');
      newGameWithIntro(g);   // state 'end' → GAME makes it a new game+
      setMode('play'); refreshAllSkills(); portraitSoon(0);
      renderNow(); await frames(2);
      fade(0, 0.7, null);
    } finally { S.busy = false; }
  }

  // ── Bag / wardrobe ──
  function renderBag() {
    const g = M.GAME; if (!g) return;
    const P = g.P;
    if(D.petFill&&P.pet){D.petFill.style.transform='scaleX('+Math.max(0,P.pet.hp/P.pet.maxHp)+')';D.bilboFace.classList.toggle('u-petbroken',P.pet.hp<=0||!!P.pet.retreat);D.petBar.title=P.pet.retreat?'Bilbo zırhını toparlıyor':'Bilbo zırhı';D.bilboFace.setAttribute('aria-label',D.petBar.title+' · '+Math.ceil(P.pet.hp)+' / '+P.pet.maxHp);}
    const chips = [`<span class="u-chip">◆ ${Math.round(P.maxHp)}</span>`];
    if (P.heroClass === 'hybrid') {
      chips.push(`<span class="u-chip">${SVG.saber} ${Math.round(P.meleeDmg)}</span>`, `<span class="u-chip">⛓ ${Math.round(P.magicDmg)}</span>`);
    } else chips.push(`<span class="u-chip">${P.heroClass === 'wizard' ? '⛓' : SVG.saber} ${Math.round(P.dmg)}</span>`);
    if (P.armor > 0) chips.push(`<span class="u-chip">🛡️ %${Math.round(P.armor)}</span>`);
    D.bagChips.innerHTML = chips.join('');
    for (const sl of SLOTS) {
      const box = D.slots[sl], cur = P.equip[sl];
      if (sl === 'weapon') box.label.innerHTML = P.heroClass === 'wizard' ? '⛓ Lanet Asaları' : P.heroClass === 'hybrid' ? `${SVG.saber} Kılıçlar ve Lanet Asaları` : `${SVG.saber} İnfaz Kılıçları`;
      const worn = sl === 'weapon' && P.heroClass === 'hybrid' ? [cur, P.equip.offhand].filter(Boolean) : [cur].filter(Boolean);
      box.hdName.innerHTML = worn.length ? '· ' + worn.map(it => esc(it.ad || '')).join(' + ') : '';
      box.tiles.innerHTML = '';
      const items = (P.bag || []).filter(it => it && it.slot === sl).sort((a, b) => (b.power || 0) - (a.power || 0) || (b.rarity || 0) - (a.rarity || 0));
      if (sl !== 'weapon') {
        const t = el('button', 'u-tile none' + (!cur ? ' on' : ''), box.tiles, `<span class="u-temo">—</span><span class="u-stars" style="color:#fff;text-shadow:none">Çıkar</span><span class="u-chk">✓</span>`);
        onTap(t, () => { if (P.equip[sl] && g.unequip) { safe('unequip', () => g.unequip(sl)); afterEquip(); } });
      }
      for (const it of items) {
        const r = clamp(it.rarity || 0, 0, 3), col = rarCol(r), slot = g.equipSlot ? g.equipSlot(it) : sl, equipped = P.equip[slot];
        const t = el('button', 'u-tile' + (it === equipped ? ' on' : '') + (newItems.has(it) ? ' fresh' : ''), box.tiles,
          `${itemThumb(it)}<span class="u-stars">${stars(it)}</span><span class="u-itemname">${esc(it.ad || 'Emanet')}</span>${it.polish ? '<span class="u-polish" aria-hidden="true">◆' + it.polish + '</span>' : ''}<span class="u-chk">✓</span><span class="u-new">YENİ</span>`);
        const diff = (it.power || 0) - (equipped ? equipped.power || 0 : 0);
        t.setAttribute('aria-label', `${it.ad || 'Eşya'}${it.polish ? ', ' + it.polish + ' kez güçlendirildi' : ''}${it === equipped ? ', kuşanıldı' : ', güç farkı ' + (diff > 0 ? '+' : '') + diff}`);
        t.title = t.getAttribute('aria-label') + '. ' + relicLore(it);
        t.style.setProperty('--rc', col); t.style.setProperty('--rl', shade(col, 0.5)); t.style.setProperty('--rd', shade(col, -0.6));
        onTap(t, () => {
          if (P.equip[slot] === it) { wiggle(t); return; }
          safe('equip', () => g.equip(it)); afterEquip(); sfx('star', { vol: 0.5, pitch: 1.2 });
        });
      }
    }
  }
  function afterEquip() {
    const keep = SLOTS.map(sl => D.slots[sl].tiles.scrollLeft);
    renderBag();
    SLOTS.forEach((sl, i) => { D.slots[sl].tiles.scrollLeft = keep[i]; });
    portraitSoon(0);
    if (D.bagFace.animate) D.bagFace.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08) rotate(-3deg)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  }

  // ───────────────────────── Boss bar ─────────────────────────
  function showBoss(d) {
    const g = M.GAME, t = (d && d.type) || (g && g.boss && g.boss.type) || 'ejderha';
    if (!bpRec(t).tried) bossPortrait(t);   // normally done at its zone load (behind the loading fade)
    S.boss = true; S.bossFrac = S.bossTrail = d && d.maxHp ? clamp(d.hp / d.maxHp, 0, 1) : 1;
    const ED = M.EDEF, ad = (d && d.name) || (ED && ED[t] && ED[t].ad) || bossUi(t).ad;
    D.boss.dataset.b = t;   // per-boss bar colours (ui.css .u-boss[data-b])
    D.bossName.innerHTML = ol(ad);
    D.bossIco.innerHTML = bossHTML(t);
    measureBossBar();
    if (BN.on) pipsPlace();
    bossFill(S.bossFrac); D.bossTrail.style.transform = `scaleX(${S.bossFrac})`;
    D.boss.classList.add('on');
  }
  // The fill shrinks with scaleX; its pattern layer is scaled back (1/frac), so the kefir bubbles stay round and the knight's
  // lance stripes keep their slant at any health.
  const BAR_FX = { kefirdev: 1, sovalye: 1 };
  function bossFill(f) {
    D.bossFill.style.transform = `scaleX(${f.toFixed(4)})`;
    if (BAR_FX[D.boss.dataset.b]) D.bossFizz.style.transform = `scaleX(${(1 / Math.max(0.02, f)).toFixed(4)})`;
  }
  function hideBoss() { S.boss = false; D.boss.classList.remove('on'); pipsOff(); }
  // ── Round 6 bonus pips (GAME 'bonus' {on, kind, type, have, need}) ──
  // Right of the boss's name (same line: the bar's height, so the boss camera's top edge, stays put): one little gold star per
  // thing to do (bonk the peeking mole 3×, pop the bubble, bring the crown…) — the dragon's friendship hearts are pink hearts —
  // filling with a pop as Feza does them. All done: a happy wiggle, then they fade; the bonus ending unfinished (ignored,
  // timed out, the boss napped) just fades them. Costs nothing while no bonus runs (no DOM work, no idle animation).
  const PIP_SVG = {
    star: '<svg viewBox="0 0 24 24"><path d="M12 2L21 12L12 22L3 12ZM12 7L8 12L12 17L16 12Z" fill-rule="evenodd"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 2L20 12L12 22L4 12Z"/><path d="M12 7L10 12L13 15" fill="none" stroke="#39292c" stroke-width="2"/></svg>',
  };
  const PIP_KIND = { kalp: 'star' };
  const BN = { on: false, kind: '', need: 0, have: 0, done: false, won: '', ev: 0 };   // won: the kind just finished (its repeats stay hidden)
  let pipHide = 0;
  // Just right of the name, as tall as its line. The name is centred over the bar: when a long name and its pips would run
  // past the bar's end (toward the 🎒⏸ buttons), the name slides left just enough (never past the bar's start); if even
  // that is not enough, the pips shrink a little (--ps).
  function pipsPlace() {
    const E = D.bossPips, N = D.bossName; if (!E || !N) return;
    E.style.top = N.offsetTop + 'px'; E.style.height = N.offsetHeight + 'px';
    const bw = D.boss.clientWidth, nw = N.offsetWidth, gap = 6 * (S.uk || 1), n = E.children.length;
    const pw = n ? n * E.children[0].offsetWidth + (n - 1) * 3 * (S.uk || 1) : 0;
    const room = Math.max(0, (bw - nw) / 2), sh = clamp(nw / 2 + gap + pw - bw / 2, 0, room);
    const ps = pw > 0 ? clamp((bw / 2 - nw / 2 - gap + sh) / pw, 0.35, 1) : 1;
    E.style.setProperty('--nw', nw + 'px'); E.style.setProperty('--sh', Math.round(sh) + 'px'); E.style.setProperty('--ps', ps.toFixed(3));
    N.style.transform = sh > 0.5 ? `translateX(${-Math.round(sh)}px)` : '';
  }
  function pipsOff(fadeMs) {
    clearTimeout(pipHide); BN.on = false; BN.done = false;
    const E = D.bossPips; if (!E) return;
    if (D.bossName && D.bossName.style.transform) D.bossName.style.transform = '';   // (the name slides back to the centre)
    if (fadeMs > 0) pipHide = setTimeout(() => E.classList.remove('on', 'done'), fadeMs);
    else E.classList.remove('on', 'done');
  }
  function bonusPips(d) {
    const E = D.bossPips; if (!E) return;
    BN.ev++;
    const need = clamp(Math.round(Number(d.need) || 0), 0, 6), have = clamp(Math.round(Number(d.have) || 0), 0, need), kind = String(d.kind || '');
    if (!d.on || !need) {   // over: a finished bonus keeps its happy stars a moment longer
      const won = BN.done || (BN.on && BN.need > 0 && need > 0 && have >= need);
      BN.won = '';
      if (won && !BN.done && need === BN.need) pipsFill(have, true);
      if (won) { E.classList.add('done'); if (!BN.done) { BN.done = true; clearTimeout(pipHide); pipHide = setTimeout(() => pipsOff(), 1800); } BN.on = false; }
      else pipsOff();
      return;
    }
    if (have >= need && BN.won === kind && !BN.on) return;   // (still "all done" after its stars faded, e.g. during the stun: stay away)
    if (have < need) BN.won = '';
    const shape = PIP_KIND[kind] || 'star', fresh = !BN.on || BN.need !== need || BN.kind !== kind || E.children.length !== need;
    if (!fresh && have === BN.have) return;   // (nothing new: no DOM work)
    clearTimeout(pipHide);
    if (fresh) {
      let h = ''; for (let i = 0; i < need; i++) h += '<i class="u-bpip">' + PIP_SVG[shape] + '</i>';
      E.innerHTML = h; E.dataset.k = shape; E.classList.remove('done');
      BN.done = false; BN.have = 0;
      BN.on = true; BN.kind = kind; BN.need = need;
      pipsPlace();
      E.classList.add('on');
    }
    pipsFill(have, !fresh);
    if (have >= need && !BN.done) { BN.done = true; BN.won = kind; E.classList.add('done'); pipHide = setTimeout(() => pipsOff(), 2200); }
  }
  function pipsFill(have, pop) {
    const E = D.bossPips;
    for (let i = 0; i < E.children.length; i++) {
      const p = E.children[i], f = i < have;
      if (f === p.classList.contains('f')) continue;
      p.classList.toggle('f', f);
      if (f && pop && p.animate) p.animate([{ transform: 'scale(0.3) rotate(-40deg)' }, { transform: 'scale(1.55) rotate(12deg)', offset: 0.55 }, { transform: 'scale(1) rotate(0deg)' }], { duration: 520, easing: 'ease-out' });
    }
    BN.have = have;
  }

  // ───────────────────────── GAME events ─────────────────────────
  function wireEvents() {
    const g = M.GAME;
    if (!g || !g.on) return;
    const on = (e, f) => g.on(e, d => { try { f(d || {}); } catch (err) { console.error('[UI] event ' + e, err); } });
    on('dreamTravel', showDreamTravel);
    on('zone', d => {
      perfReset(3);   // zone construction and its first shaders are not sustained gameplay load
      syncDifficulty();
      mapReset(g.L);
      refreshAllSkills();
      portraitSoon(0.1);
      hideBoss(); S.cine = null; S.pwatch = null;
      if (S.hintGoal) stopHint();
      const Z = M.ZONES && M.ZONES[d.index], bt = zoneBoss(d.index);
      // this zone's boss portrait: once per session, while the loading screen / fade still covers the screen
      if (bt && !ICON) bossPortrait(bt);
      if (d.title || ICON) return;
      if (S.mode === 'title') setMode('play');
      const ng = g.P && g.P.ng ? ` · Macera ${g.P.ng + 1}` : '';
      const zi = clamp(d.index | 0, 0, 98), nZ = Math.max(zoneCount(), zi + 1);
      banner({ kind: 'zone', title: d.name || (Z && Z.ad) || 'Yeni Yer', small: `${zi + 1}. Bölge${ng}`, pips: { n: nZ, i: zi }, dur: 3.2, theme: (Z && Z.theme) || '' });
    });
    on('portal', async () => {
      while (S.busy) await new Promise(r => setTimeout(r, 100));   // never drop it: GAME waits in 'transition' for us
      S.busy = true;
      try {
        const zone = M.ZONES && M.ZONES[g.P.zone | 0], nextZone = M.ZONES && M.ZONES[(g.P.zone | 0) + 1];
        if (zone && nextZone && (zone.id === 'tuvalet' || zone.id === 'ay')) {
          stopHint(); clearBanners(); clearCards(); hideBoss();
          await new Promise(proceed => showDreamTravel({ from: zone.id, to: nextZone.id, proceed }));
        }
        await fade(1, 0.8, 'load');
        clearBanners(); clearCards(); hideBoss(); S.cine = null; stopHint();
        ensureTex((g.P.zone | 0) + 1);
        aud('stopVoice');   // the old zone's boss 'bitti' / 'kapi' lines must not talk about a door in the new zone
        safe('loadZone', () => g.loadZone((g.P.zone | 0) + 1));
        renderNow(); await frames(2);
        fade(0, 0.7, null);
      } finally { S.busy = false; }
    });
    on('levelup', d => {
      banner({ kind: 'level', icon: '◆', title: `Seviye ${d.lvl}!`, sub: 'Karanlık seni güçlendiriyor.', rays: true, dur: 2.2 });
      bump(D.lvl, 1.35); portraitSoon(0.2);
    });
    on('skill', d => {
      const s = g.skills && g.skills[d.index], def = (s && s.def) || {};
      showSkill(d.index, true);
      banner({ kind: 'skill', icon: skillGlyph(def.id), med: true, color: def.color, title: 'Yeni İnfaz!', sub: def.ad || '', rays: true, dur: 2.8 });
    });
    on('item', d => {
      itemCard(d.item, d.equipped);
      if (d.equipped) portraitSoon(0.2);
      else if (d.item) { newItems.add(d.item); D.bagBtn.classList.add('has-new'); }
      if (S.menu === 'bag') renderBag();
    });
    on('equip', () => { portraitSoon(0.15); });
    on('bilboBark', () => { if (D.bilboFace) bump(D.bilboFace, 1.08); });
    on('gold', () => {
      if (S.t - S.lastGoldBump > 0.12) { S.lastGoldBump = S.t; bump(D.gold.firstChild, 1.3); }
    });
    on('hurt', () => orbHurt());
    on('potion', d => {
      if (d.count < last.potEv) ORB.heal = 1;   // drank (a pickup raises the count)
      last.potEv = d.count; bump(D.potN, 1.4);
    });
    on('dead', () => {
      fade(0.72, 1.4, 'sleep');
    });
    on('respawn', d => {
      fadeSnap(0.92, 'flash');
      fade(0, 0.9, null);
    });
    on('boss', d => { if (d.on) showBoss(d); else hideBoss(); });
    on('bonus', d => bonusPips(d));   // Round 6: the boss's bonus (07 bonusStep) — pips on the boss bar
    on('bossHp', d => {
      S.bossFrac = clamp(d.frac, 0, 1);
      bossFill(S.bossFrac);
      if (D.boss.animate) D.boss.animate([{ filter: 'brightness(1.6)' }, { filter: 'brightness(1)' }], { duration: 200 });
    });
    on('victory', () => { hideBoss(); if (S.menu) closeMenu(); setTimeout(() => { if (g.state === 'end' && S.mode === 'play') showVictory(); }, 2600); });
    on('happy', d => {
      S.cheered++;
      if (d.boss) {   // camera story beat: the boss cheers up → the castle's crystal rises / the zone's portal wakes up
        const L = g.L, Z = M.ZONES && g.P && M.ZONES[g.P.zone | 0];
        S.cine = { t: 0, bx: d.x, bz: d.z, fin: !!(L && L.crystalSpot) || !!(Z && Z.final) || d.type === 'ejderha' };
      }
    });
    // The Kefir Devi's glass of kefir (GAME 'gift' {stage: 'drink' | 'drunk', x, z, dur}): the story camera moves in close on
    // Feza while he drinks it, stays for his cheer, then goes back to the happy giant and its portal (updateCamera, cineTick).
    on('gift', d => {
      const c = S.cine; if (!c || c.fin !== false) return;
      if (d.stage === 'drink') { c.drink = 1; c.dT = 0; c.dDur = clamp(Number(d.dur) || 1.6, 0.5, 4); }
      else if (d.stage === 'drunk') { c.drink = 2; c.dT = 0; }
    });
    on('toast', d => toast(d.text || ''));
    on('checkpoint', () => toast('⌖ Yemin taşı uyandı.', true));
    on('difficulty', () => syncDifficulty());
    on('merchant', () => openMerchant());
  }

  // ───────────────────────── Camera ─────────────────────────
  const CAMV = { zoom: 1, pitch: 0.96, yaw: 0, ty: 0.8, ox: 0, oz: 0 };   // ox/oz: look-at offset from Feza (boss fight, story beats)
  // Title: a slightly raised view over the plaza (the owl and a house frame Feza). A low angle sees the whole forest (≈2× the
  // triangles of a play frame), so the title also uses a short far plane. Tests may tweak via UI._TC.
  const TITLE_CAM = { zoom: 0.42, pitch: 0.4, yaw: null, swing: 0.22, ty: 1.15, far: 50 };   // yaw null = auto (titleYaw)
  // Look past Feza toward the houses (north) with the owl on one side: turn the view half-way toward the owl.
  const TY = { L: null, yaw: 0 };
  function titleYaw() {
    const g = M.GAME, L = g && g.L, P = g && g.P;
    if (TITLE_CAM.yaw !== null && TITLE_CAM.yaw !== undefined) return TITLE_CAM.yaw;
    if (!L || !P) return 0;
    if (TY.L !== L) {
      TY.L = L; TY.yaw = 0;
      const n = L.npcObj || L.npc;
      if (n) { const a = Math.atan2(n.x - P.pos.x, P.pos.z - n.z); TY.yaw = clamp(-a * 0.5, -0.8, 0.8); }   // a: owl's angle from north
    }
    return TY.yaw;
  }
  const CAM_FAR = camera.far;
  // Boss silhouette sample points in its own frame (x right, y up, z toward its face), metres. The dragon's come from its
  // model's bounds (horns, head, wing tops, wing tips, front feet, tail); the rounder bosses use a box from height and radius.
  const BOSS_PTS = [-0.6, 4.8, 0, 0.6, 4.8, 0, 0, 4.6, 0.8, -2.6, 3.6, -2.1, 2.6, 3.6, -2.1, -3.5, 2.6, -1.8, 3.5, 2.6, -1.8,
    0, 0, 2.3, -2.0, 0, 1.2, 2.0, 0, 1.2, 0, 0.5, -3.8];
  const FIT_F = [0.42, 0.48, 0.54, 0.6, 0.66, 0.36, 0.3];   // look-at fractions toward the focus, in order of preference
  // … and, only while a subtitle narrows the box (portrait: it crosses the middle), aiming closer to Feza (or a little past
  // him, away from the focus) may be needed to lift everything above it
  const FIT_FX = FIT_F.concat([0.22, 0.12, 0, -0.12, -0.25]);
  const FIT = { pts: new Float32Array(120), n: 0, ox: 0, oz: 0, zoom: 1, res: 0, f: 0, views: 0 };   // res/f: last rule + look-at fraction, views: fitsView calls (tests)
  const CAMK = { k: 1 };   // cameraFollow's distance factor for this aspect (portrait pulls back), read off the real camera
  const _fc = new THREE.PerspectiveCamera(), _fv = new THREE.Vector3();
  function fitAdd(x, y, z) { if (FIT.n >= 40) return; const i = FIT.n++ * 3; FIT.pts[i] = x; FIT.pts[i + 1] = y; FIT.pts[i + 2] = z; }
  // Bosses that are not a round blob: their silhouette as fractions of their size (x, z × r; y × height). Yeminbozan on
  // his long horse: plume top, his shoulders and shield, the horse's ears, nose, rump and hooves. lance: his lance tip (the
  // model's marker('lance'), lowered forward in a charge) joins the fit when it is within that many metres. run: while he
  // gallops (st.phase 'charge', or faster than RUN_V) the camera keeps up this much quicker and also frames where he will be
  // in `lead` s (so the damped view is there in time, e.g. when he thunders past Feza toward the camera); zoom: extra zoom-out
  // room (his lanes start at the arena rim); zoomN: more of it on a narrow (portrait) screen while he is off to Feza's side
  // (sideK) — an upright screen shows far less across than a landscape one, and a sideways lane runs rim to rim (~20 m);
  // up and down the screen it needs none (more room there would only let a stricter framing win at a far smaller Feza).
  // The portrait screen is ~1.44× taller while its view pulls back only 1.2×, so even at that cap Feza stays about as tall
  // on screen as the landscape cap keeps him (~48 px to his head); the fit still picks the smallest zoom that shows
  // everything. cheer: his goodbye keeps full size until that st.dying (05: waves, prances and hops, then twirls away),
  // hop: its extra height meanwhile. tilt: how much flatter than the play view the boss view looks (rad; the other round
  // bosses 0.05): his lanes run rim to rim up the screen, and a flatter view shortens the arena's depth on screen while
  // Feza stands taller — so waiting at the far rim (12+ m up the screen, a subtitle at the bottom) he and Feza fit at a
  // zoom that keeps Feza ≥ 45 px to his head (0.74 rad, the story camera's pitch when he cheers).
  const BOSS_SHAPE = {
    sovalye: { pts: [0, 1.04, -0.08, -0.55, 0.74, 0, 0.55, 0.74, 0, 0, 0.72, 0.9, 0, 0.52, 1.12, 0, 0.45, -1.08,
      -0.32, 0, 0.82, 0.32, 0, 0.82, -0.32, 0, -0.86, 0.32, 0, -0.86], lance: 4.6, run: 5, lead: 0.3, zoom: 0.14, zoomN: 0.7, cheer: 0.7, hop: 1.16, tilt: 0.12 },
  };
  const narrowK = () => clamp((1.1 - camera.aspect) / 0.4, 0, 1);   // 0 on a landscape screen … 1 from aspect 0.7 (an iPad held upright)
  const sideK = (dx, d) => (d > 1 ? clamp(2 * Math.abs(dx) / d - 1, 0, 1) : 0);   // 1 straight to Feza's side … 0 from 60° up/down the screen
  const RUN_V = 5;   // m/s
  const BPC = { key: '', pts: null };
  function bossPts(b) {
    if (!b.type || b.type === 'ejderha') return BOSS_PTS;
    const h = b.height > 0.5 ? b.height : 2.8, r = Math.max(0.7, b.r || 1.2), key = b.type + h.toFixed(2) + r.toFixed(2);
    if (BPC.key !== key) {
      BPC.key = key;
      const F = BOSS_SHAPE[b.type];
      BPC.pts = F ? F.pts.map((v, i) => v * (i % 3 === 1 ? h : r))
        : [0, h * 1.08, 0, -r * 1.1, h * 0.62, 0, r * 1.1, h * 0.62, 0, 0, h * 0.62, r * 1.1, -r * 1.1, 0, 0, r * 1.1, 0, 0, 0, 0, r * 1.25, 0, 0, -r * 1.2];
    }
    return BPC.pts;
  }
  const bigBoss = b => !b.type || b.type === 'ejderha' || b.height > 3.6;   // the tall dragon: a more frontal, wider view
  const _lv = new THREE.Vector3();
  // add the boss's sample points (scaled by its dying shrink `sc`; ys: extra height; sx/sz: moved by that much — see fitLead)
  function fitBoss(b, sc, ys = 1, sx = 0, sz = 0) {
    const cs = Math.cos(b.face || 0), sn = Math.sin(b.face || 0), PTS = bossPts(b), F = BOSS_SHAPE[b.type], x = b.x + sx, z = b.z + sz;
    for (let i = 0; i < PTS.length; i += 3) {
      const lx = PTS[i] * sc, ly = PTS[i + 1] * sc * ys, lz = PTS[i + 2] * sc;
      fitAdd(x + lx * cs + lz * sn, ly, z - lx * sn + lz * cs);
    }
    const m = b.m, tip = F && F.lance && m && typeof m.marker === 'function' ? safe('marker', () => m.marker('lance', _lv)) : null;
    if (tip && Number.isFinite(tip.x) && Math.hypot(tip.x - b.x, tip.z - b.z) < F.lance) fitAdd(x + (tip.x - b.x) * sc, clamp(tip.y, 0, 6) * sc, z + (tip.z - b.z) * sc);
  }
  // Boss velocity (m/s, smoothed; a jump — a reset, a new zone — starts it over) for a boss with BOSS_SHAPE.run: returns the
  // quicker camera rate while it gallops, else 0
  const BV = { b: null, x: 0, z: 0, vx: 0, vz: 0, L: null, rm: null };
  function bossRun(b, dt) {
    const F = BOSS_SHAPE[b.type];
    if (!F || !F.run) return 0;
    const mx = b.x - BV.x, mz = b.z - BV.z;
    if (BV.b !== b || Math.hypot(mx, mz) > 25 * Math.max(dt, 1 / 60)) { BV.b = b; BV.vx = BV.vz = 0; }
    else if (dt > 0) { BV.vx = damp(BV.vx, mx / dt, 12, dt); BV.vz = damp(BV.vz, mz / dt, 12, dt); }
    BV.x = b.x; BV.z = b.z;
    return (b.st && b.st.phase === 'charge') || Math.hypot(BV.vx, BV.vz) > RUN_V ? F.run : 0;
  }
  // galloping: the whole boss again where it will be in BOSS_SHAPE.lead s, but never past the arena rim (it stops there)
  function fitLead(b, L) {
    const t = BOSS_SHAPE[b.type].lead || 0, r = b.r || 1.2;
    if (!t) return;
    let x = b.x + BV.vx * t, z = b.z + BV.vz * t;
    if (BV.L !== L) { BV.L = L; BV.rm = (L && L.rooms && L.rooms.find(q => q && q.kind === 'boss')) || null; }
    const rm = BV.rm;
    if (rm && rm.hw && rm.hh) { x = clamp(x, rm.x - rm.hw + r, rm.x + rm.hw - r); z = clamp(z, rm.z - rm.hh + r, rm.z + rm.hh - r); }
    else if (rm && rm.r) {
      const dx = x - rm.x, dz = z - rm.z, d = Math.hypot(dx, dz), q = Math.max(0.5, rm.r - r * 0.5);
      if (d > q) { x = rm.x + dx / d * q; z = rm.z + dz / d * q; }
    }
    fitBoss(b, 1, 1, x - b.x, z - b.z);
  }
  function fitBossAll(b, run, L) { fitBoss(b, 1); if (run) fitLead(b, L); }
  // Round 6 bonus: while GAME.bonusSpot() names a spot for Feza to go to (the fallen crown, the glowing hole, the carrot…),
  // the boss camera also keeps that spot (its marker ring and star, up to ~1.7 m) on screen — only when that costs at most BONUS_CAM.zoom
  // more zoom-out than the plain boss framing chose and no stricter HUD / subtitle rule has to give way; else the plain boss
  // framing stays (the gold ring and the minimap dot show the way). It first tries the plain framing's aim (a spot already in
  // view changes nothing), then an aim leaning toward the spot. The spot glides (a new hole, the crown's arc); once the camera
  // lets go of a spot it waits BONUS_CAM.dwell s before taking one in again, and a spot that does not fit is tried again
  // only every BONUS_CAM.retry s — so it never jumps back and forth and the extra solve costs little.
  const BONUS_CAM = { zoom: 1.12, dwell: 1.0, retry: 0.25, glide: 5, h: 1.7, r: 0.8, lean: 0.5 };   // r: most of FX.marker's ring, left and right
  const BZ = { has: false, x: 0, z: 0, used: false, next: -9, frame: -9, n: 0, ok: 0, zN: 0, fitp: { ctx: '', sub: -2, rule: 0, t0: -9 } };
  function bonusSpotNow(g) {
    if (!g || typeof g.bonusSpot !== 'function') return null;
    const p = safe('bonusSpot', () => g.bonusSpot());
    return p && Number.isFinite(p.x) && Number.isFinite(p.z) ? p : null;
  }
  function fitpSwap(o) {   // the bonus solve keeps its own rule memory (FITP): the plain boss framing's dwell stays untouched
    let v = FITP.ctx; FITP.ctx = o.ctx; o.ctx = v;
    v = FITP.sub; FITP.sub = o.sub; o.sub = v;
    v = FITP.rule; FITP.rule = o.rule; o.rule = v;
    v = FITP.t0; FITP.t0 = o.t0; o.t0 = v;
  }
  function bonusTry(g, b, run, px, pz, fx, fz, ty, pitch, zN, resN) {
    const r = BONUS_CAM.r;
    fitBossAll(b, run, g.L); fitAdd(BZ.x - r, 0.1, BZ.z); fitAdd(BZ.x + r, 0.1, BZ.z); fitAdd(BZ.x, BONUS_CAM.h, BZ.z);
    fitpSwap(BZ.fitp);
    const res = fitSolve('bonus', px, pz, fx, fz, ty, pitch, zN, zN * BONUS_CAM.zoom, 2);
    fitpSwap(BZ.fitp);
    return res > 0 && res <= resN;
  }
  function bonusFit(g, b, run, px, pz, ty, pitch, dt) {
    const p = bonusSpotNow(g), gap = S.frame - BZ.frame > 3;   // (gap: the boss camera was off — a new fight starts fresh)
    BZ.frame = S.frame;
    if (!p) { if (BZ.used) BZ.next = S.t + BONUS_CAM.dwell; BZ.has = BZ.used = false; return; }
    if (!BZ.has || gap || Math.hypot(p.x - BZ.x, p.z - BZ.z) > 30) { BZ.x = p.x; BZ.z = p.z; BZ.has = true; }
    else { BZ.x = damp(BZ.x, p.x, BONUS_CAM.glide, dt); BZ.z = damp(BZ.z, p.z, BONUS_CAM.glide, dt); }
    const zN = FIT.zoom, oxN = FIT.ox, ozN = FIT.oz, resN = FIT.res, fN = FIT.f;
    BZ.zN = zN;
    if (resN <= 0 || (!BZ.used && S.t < BZ.next)) { BZ.used = false; return; }
    BZ.n++;
    const L = BONUS_CAM.lean;
    if (bonusTry(g, b, run, px, pz, b.x, b.z, ty, pitch, zN, resN) ||
      bonusTry(g, b, run, px, pz, b.x + (BZ.x - b.x) * L, b.z + (BZ.z - b.z) * L, ty, pitch, zN, resN)) { BZ.used = true; BZ.ok++; return; }
    FIT.zoom = zN; FIT.ox = oxN; FIT.oz = ozN; FIT.res = resN; FIT.f = fN;
    BZ.next = S.t + (BZ.used ? BONUS_CAM.dwell : BONUS_CAM.retry);
    BZ.used = false;
  }
  // The safe screen box for the fit (NDC, y up): below the boss bar (else the top 10 %), above the bottom controls, inside the
  // sides; under the stricter rules the points must also stay clear of the HUD corners (portrait + XP block, 🎒⏸ row, minimap,
  // health orb + potion, attack + skill buttons: their real layout boxes) and above the subtitle box while a line shows
  // (landscape: the bottom strip; portrait: across the middle).
  const FL = { corners: true, sub: 0, fr: null, south: false, ax: 0, az: 0, af: 0, yTop: 0.8, yBot: -0.78, yBotS: -0.78, yBand: 2, xLim: 0.88, nR: 0, R: new Float32Array(40), frame: -99, W: 0, H: 0 };
  const _lb = { l: 0, t: 0, r: 0, b: 0 };
  function fitRect(l, t, r, b, W, H) {   // screen px box (+ margin) → NDC [x0, x1, y0, y1]
    if (FL.nR >= 10) return;
    const o = FL.nR++ * 4;
    FL.R[o] = 2 * (l - 8) / W - 1; FL.R[o + 1] = 2 * (r + 8) / W - 1; FL.R[o + 2] = 1 - 2 * (b + 12) / H; FL.R[o + 3] = 1 - 2 * (t - 12) / H;
  }
  function fitLimits() {
    const W = innerWidth || 1, H = innerHeight || 1, top = S.boss ? S.bossTop : 0.1 * H;
    FL.yTop = 1 - 2 * Math.min(top, 0.4 * H) / H; FL.yBot = -0.78; FL.xLim = 0.88;   // Feza's feet stay above the controls
    const sub = S.hud && S.subTop > 0;
    FL.yBotS = sub ? clamp(1 - 2 * (S.subTop - 10) / H, FL.yBot, FL.yTop - 0.6) : FL.yBot;
    FL.yBand = sub ? 1 - 2 * (S.subBot + 10) / H : 2;   // the box's bottom edge: Feza may stand below it (portrait), never in it
    if (S.frame - FL.frame > 30 || FL.W !== W || FL.H !== H) {   // corner boxes, refreshed twice a second
      FL.frame = S.frame; FL.W = W; FL.H = H; FL.nR = 0;
      if (S.hud) {
        for (const e of [D.tl, D.sbtns, D.mini, D.bl]) {
          if (!e) continue;
          layBox(e, _lb); if (_lb.r - _lb.l < 4) continue;
          fitRect(_lb.l, e === D.bl ? _lb.t : -1e4, _lb.r, e === D.bl ? 1e4 : _lb.b + (e === D.tl ? 6 : 0), W, H);   // (tl: + the level star)
        }
        for (const e of [D.atk].concat(D.sk.map(v => v.b))) {   // round buttons centred on their layout point (translate −50 %)
          if (!e || !e.offsetWidth) continue;
          layBox(e, _lb); const r = e.offsetWidth / 2;
          fitRect(_lb.l - r, _lb.t - r, _lb.l + r, _lb.t + r, W, H);
        }
      }
    }
  }
  // Does every fit point project inside the safe screen box with the camera looking at (tx,ty,tz)? FL.corners: every point
  // keeps clear of the HUD corners; FL.sub: 2 every point stays above the subtitle, 1 only Feza's (the last two points), 0 none
  // — but under every rule the subtitle box never covers Feza (his feet…head span stays above or below it).
  function fitsView(tx, ty, tz, zoom, pitch) {
    FIT.views++;
    const d = CAM.dist * CAMK.k * zoom;   // same placement as cameraFollow (its aspect pull-back factor is measured, see CAMK)
    _fc.position.set(tx, ty + Math.sin(pitch) * d, tz + Math.cos(pitch) * d);
    _fc.lookAt(tx, ty, tz); _fc.updateMatrixWorld();
    const n = FIT.n, xl = FL.xLim, sm = FL.sub, nR = FL.corners ? FL.nR * 4 : 0, R = FL.R;
    let feet = 0;
    for (let i = 0; i < n; i++) {
      _fv.set(FIT.pts[i * 3], FIT.pts[i * 3 + 1], FIT.pts[i * 3 + 2]).project(_fc);
      const x = _fv.x, y = _fv.y;
      if (x < -xl || x > xl || y > FL.yTop) return false;
      if (i === n - 2) feet = y;   // Feza's feet, then his head (added last by fitSolve)
      else if (i === n - 1 && feet < FL.yBotS && y > FL.yBand) return false;
      if (y < (sm === 2 || (sm === 1 && i >= n - 2) ? FL.yBotS : FL.yBot)) return false;
      for (let o = 0; o < nR; o += 4) if (x > R[o] && x < R[o + 1] && y > R[o + 2] && y < R[o + 3]) return false;
    }
    return true;
  }
  // Where to aim: part of the way from Feza toward the focus (the first fraction in FL.fr order whose view fits), or — only
  // while a subtitle narrows the box (FL.south) — a little south of Feza, which lifts him and everything up the screen.
  // Sets FL.ax/az (look-at offset from Feza) and FL.af (the fraction; −1 for a south step); false when nothing fits.
  const FIT_SOUTH = [0.6, 1.2, 1.8, 2.4];   // metres
  function fitAim(px, pz, fx, fz, ty, zoom, pitch) {
    const fr = FL.fr;
    for (let j = 0; j < fr.length; j++) {
      const f = fr[j], ax = (fx - px) * f, az = (fz - pz) * f;
      if (fitsView(px + ax, ty, pz + az, zoom, pitch)) { FL.ax = ax; FL.az = az; FL.af = f; return true; }
    }
    if (FL.south) for (let j = 0; j < FIT_SOUTH.length; j++) {
      if (fitsView(px, ty, pz + FIT_SOUTH[j], zoom, pitch)) { FL.ax = 0; FL.az = FIT_SOUTH[j]; FL.af = -1; return true; }
    }
    return false;
  }
  // Pick the smallest zoom in [z0,z1] (and an aim) that keeps Feza and all fit points in the safe box, trying the strictest
  // rule first (FIT_RULES: [corners, subtitle, fractions, south steps]): everything clear of the HUD corners and above the
  // subtitle; then only Feza above it; then clear of the corners only; last the plain box (the older rule). Returns the rule's
  // number (1…), or 0 when nothing fits even at z1: then Feza alone stays in view at z1, leaning toward the focus as far as
  // that allows (noLean: returns -1 and leaves FIT alone; noLean true also skips the rules that ignore the HUD corners, 2 tries
  // every rule). Result in FIT.ox/oz/zoom.
  const FIT_RULES = [
    [[true, 0, FIT_F, false], [false, 0, FIT_F, false]],   // no subtitle on screen
    [[true, 2, FIT_F, false], [true, 2, FIT_FX, true], [true, 1, FIT_F, false], [true, 1, FIT_FX, true], [true, 0, FIT_F, false], [false, 0, FIT_F, false]],
  ];
  const NO_FR = [];
  // A rule, once picked, is tried first for FIT_DWELL s while the shot (ctx) and the subtitle stay the same, so a hopping boss
  // doesn't flip the camera between framings (e.g. Feza above ↔ below a portrait subtitle) every few frames.
  const FITP = { ctx: '', sub: -2, rule: 0, t0: -9 }, FIT_DWELL = 1.5;
  const FK = { ax: 0, az: 0, af: 0 };   // the best aim found so far in this solve
  function keepAim() { FK.ax = FL.ax; FK.az = FL.az; FK.af = FL.af; }
  function fitSolve(ctx, px, pz, fx, fz, ty, pitch, z0, z1, noLean, frs) {   // frs: own look-at fractions for every rule
    if (_fc.aspect !== camera.aspect || _fc.fov !== camera.fov) {
      _fc.fov = camera.fov; _fc.aspect = camera.aspect; _fc.near = camera.near; _fc.far = CAM_FAR; _fc.updateProjectionMatrix();
    }
    fitAdd(px, 0, pz); fitAdd(px, 1.7, pz);
    fitLimits();
    let res = -1, zoom = z1;
    FK.ax = FK.az = FK.af = 0;
    const rules = FIT_RULES[FL.yBotS > FL.yBot + 0.005 ? 1 : 0];
    const st = FITP.ctx === ctx && FITP.sub === S.subTop && FITP.rule > 0 && FITP.rule <= rules.length && S.t - FITP.t0 < FIT_DWELL ? FITP.rule - 1 : -1;
    let fresh = true;
    for (let k = -1; k < rules.length; k++) {
      const q = k < 0 ? st : k;
      if (q < 0 || (k >= 0 && q === st)) continue;
      const m = q + 1, u = rules[q]; FL.corners = u[0]; FL.sub = u[1]; FL.fr = frs || u[2]; FL.south = u[3];
      if (noLean === true && !u[0]) continue;   // (story beat: a portal half behind the HUD is no view — it flies over instead)
      fresh = k >= 0;
      if (fitAim(px, pz, fx, fz, ty, z0, pitch)) { keepAim(); zoom = z0; res = m; break; }
      if (!fitAim(px, pz, fx, fz, ty, z1, pitch)) continue;
      keepAim();
      let lo = z0, hi = z1;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (fitAim(px, pz, fx, fz, ty, mid, pitch)) { hi = mid; keepAim(); } else lo = mid;
      }
      zoom = hi; res = m; break;
    }
    if (res < 0) {
      if (noLean) { FIT.n = 0; FITP.rule = 0; return -1; }
      // too far apart even zoomed out (a far portal): Feza stays in view (above the subtitle if possible), leaning toward the focus
      const n = FIT.n; FIT.pts.copyWithin(0, (n - 2) * 3, n * 3); FIT.n = 2;   // his two points (added last)
      res = 0; FL.corners = false; FL.fr = NO_FR;
      let hit = false;
      for (let sm = 1; sm >= 0 && !hit; sm--) {
        FL.sub = sm;
        for (let ff = FIT_F[0]; ff > 0.01; ff -= 0.06) if (fitsView(px + (fx - px) * ff, ty, pz + (fz - pz) * ff, z1, pitch)) { FK.ax = (fx - px) * ff; FK.az = (fz - pz) * ff; FK.af = ff; hit = true; break; }
        FL.south = true;   // (the subtitle covers him wherever he leans: step the aim south to lift him above it)
        if (!hit && fitAim(px, pz, fx, fz, ty, z1, pitch)) { keepAim(); hit = true; }
      }
    }
    FIT.ox = FK.ax; FIT.oz = FK.az; FIT.zoom = zoom; FIT.n = 0; FIT.res = res; FIT.f = FK.af;
    if (fresh || res !== FITP.rule || FITP.ctx !== ctx) FITP.t0 = S.t;
    FITP.ctx = ctx; FITP.sub = S.subTop; FITP.rule = res;
    return res;
  }
  // the stone arch (06: pillars at ±1.58, arch top + keystone ≈ 4.3 m, front step to z + 1.6); a bigger gate around it (Surlu
  // Şehir's castle gate) may tell its half width and height in po.fit {hw, h}
  const portalH = po => (po.fit && po.fit.h > 4.25 ? Math.min(po.fit.h, 8) : 4.25);
  function fitPortal(po) {
    const f = po.fit, hw = f && f.hw > 1.9 ? Math.min(f.hw, 5) : 1.9, h = portalH(po);
    fitAdd(po.x, 0, po.z + 1.4); fitAdd(po.x, h, po.z);
    fitAdd(po.x - hw, 0.2, po.z); fitAdd(po.x + hw, 0.2, po.z); fitAdd(po.x - hw * 0.92, h * 0.78, po.z); fitAdd(po.x + hw * 0.92, h * 0.78, po.z);
  }
  // Mid-boss story beat (S.cine, fin false): 0–4.6 s the cheering boss, then the portal that woke up — with Feza when both fit,
  // else (a far portal) a short flight to the portal (until CINE.back) and back to Feza (CINE.panEnd). Final boss: CINE.fin.
  const CINE = { boss: 4.6, end: 7.5, back: 8.0, panEnd: 9.0, fin: 9.5, wait: 22 };
  const cineEnd = c => (c.fin === false ? (c.pan ? CINE.panEnd : CINE.end) : CINE.fin);
  // A boss with a longer goodbye (the Kefir Devi first hands Feza a glass of kefir, he drinks it, then its portal wakes up):
  // the camera stays on Feza and the boss until the portal is awake (at most CINE.wait s), then shows the portal as usual.
  // The Kefir Devi's gift: close on Feza while he drinks (CINE_DRINK.hold s more for his cheer after the last sip), then back.
  const CINE_DRINK = { hold: 1.4, late: 0.6 };
  const DRINK_F = [0.13, 0.09, 0.05, 0.02, 0];   // look-at fractions of 8 m toward the giant (≤ 1 m)
  function cineTick(dt) {
    const c = S.cine, g = M.GAME, L = g && g.L, po = c.fin === false && L ? L.portalObj : null;
    c.t += dt;
    if (c.drink) {
      c.dT += dt;
      if (c.drink === 1 && c.dT > c.dDur + CINE_DRINK.late) { c.drink = 2; c.dT = 0; }   // (no 'drunk' came: go on anyway)
      else if (c.drink === 2 && c.dT > CINE_DRINK.hold) c.drink = 0;
    }
    if (po && po.active === false && c.t > CINE.boss - 0.05 && (c.wait || 0) < CINE.wait) {
      c.wait = (c.wait || 0) + dt; c.t = CINE.boss - 0.05;
      const b = g.boss;   // (it may walk over to Feza with the glass: follow it while it is still there)
      if (b && !b.gone && b.m && b.m.root && b.m.root.visible && Number.isFinite(b.x)) { c.bx = b.x; c.bz = b.z; }
    }
    if (c.t > cineEnd(c) && !c.drink) { const mid = c.fin === false; S.cine = null; if (mid) armPortalWatch(); }
  }
  const PAN_F = [0, 0.12, 0.24, 0.36, 0.48];
  function fitCheerBoss(c, b, dy) {   // the cheering boss, shrinking in its goodbye (dy 0..1), or where it stood
    const F = b && BOSS_SHAPE[b.type];
    if (b && dy < 1 && F && F.cheer) fitBoss(b, dy < F.cheer ? 1 : Math.max(0.3, 1 - (dy - F.cheer) / (1 - F.cheer)), dy < F.cheer ? F.hop || 1 : 1);
    else if (b && dy < 1) fitBoss(b, Math.max(0.3, 1 - dy));
    else { fitAdd(c.bx, 0, c.bz); fitAdd(c.bx, c.wait ? clamp((b && b.height) || 2.2, 2.2, 3.4) : 2.2, c.bz); }   // (waiting: the whole boss)
  }
  // Title: while the spoken prompt shows, Feza steps up the screen so its box never covers his legs (his head stays under the logo).
  const _tv = new THREE.Vector3(), _ta = { x: 0, y: 0, vis: false }, _tb = { x: 0, y: 0, vis: false };
  let titleLiftM = 0;
  function titleLift(px, pz) {
    if (!(S.subTop > 0)) return (titleLiftM = 0);
    toScreen(_tv.set(px, 0, pz), _ta); toScreen(_tv.set(px, 1.45, pz), _tb);
    const ppm = (_ta.y - _tb.y) / 1.45;   // screen px per metre at Feza (lowering the look-at moves him up by this much)
    if (!(ppm > 20)) return titleLiftM;
    const cur = Math.max(0, TITLE_CAM.ty - CAMV.ty);   // lift already applied (CAMV.ty is damped toward the target)
    let want = (_ta.y + cur * ppm - (S.subTop - 12)) / ppm;
    if (S.logoBot > 0) want = Math.min(want, cur + (_tb.y - 0.04 * ppm - (S.logoBot + 4)) / ppm);
    return (titleLiftM = clamp(want, 0, 0.9));
  }
  function updateCamera(dt, snap) {
    const g = M.GAME, P = g && g.P;
    const px = P ? P.pos.x : 0, pz = P ? P.pos.z : 0;
    let zoom = 1, pitch = S.playPitch, yaw = 0, ty = 0.8, k = 2.4, ox = 0, oz = 0;
    const title = !ICON && (S.mode === 'title' || S.mode === 'boot');
    if (ICON) { zoom = 0.21; pitch = 0.16; yaw = 0.42; ty = 1.02; k = 50; }   // arms up: frame the raised, lit saber too
    else if (title) { zoom = TITLE_CAM.zoom * (camera.aspect < 0.9 ? 1.25 : 1); pitch = TITLE_CAM.pitch; yaw = titleYaw() + Math.sin(S.t * 0.11) * TITLE_CAM.swing; ty = TITLE_CAM.ty - (S.mode === 'title' ? titleLift(px, pz) : 0); k = 1.6; }
    else if (S.mode === 'end') { zoom = 0.62; pitch = 0.78; yaw = Math.sin(S.t * 0.16) * 0.35; ty = 1.0; k = 1.2; }
    else if (P && P.dead) { zoom = 0.82; }
    else if (S.boss && g.boss && !g.boss.dead) {   // keep the whole boss on screen, not just Feza
      const run = bossRun(g.boss, dt), F = BOSS_SHAPE[g.boss.type];
      fitBossAll(g.boss, run, g.L);   // (the knight's gallop: also where he is heading, and a quicker camera below)
      const big = bigBoss(g.boss), bd = Math.hypot(g.boss.x - px, g.boss.z - pz);
      // a little more frontal (the tall dragon needs less zoom-out); zoom cap keeps Feza ≥ ~70 px tall, only when he is far
      // from the boss (it walks closer) a bit more is allowed
      if (big) { ty = 1.6; pitch = S.playPitch - 0.08; fitSolve('boss', px, pz, g.boss.x, g.boss.z, ty, pitch, 1.05, 1.62 + clamp((bd - 10) * 0.05, 0, 0.16)); }
      else { ty = clamp((g.boss.height || 2.8) * 0.42, 0.9, 1.5); pitch = S.playPitch - (F && F.tilt > 0 ? F.tilt : 0.05); fitSolve('boss', px, pz, g.boss.x, g.boss.z, ty, pitch, 1.0, 1.42 + ((F && F.zoom) || 0) + ((F && F.zoomN) || 0) * narrowK() * sideK(g.boss.x - px, bd) + clamp((bd - 10) * 0.05, 0, 0.16)); }
      bonusFit(g, g.boss, run, px, pz, ty, pitch, dt);   // a bonus (the fallen crown, a glowing hole…): its spot too, when that fits
      zoom = FIT.zoom; ox = FIT.ox; oz = FIT.oz; k = Math.max(1.5, run);
    } else if (S.cine && P) {   // boss defeated: look at the cheering boss, then at the rising crystal (castle) or the portal
      const c = S.cine, L = g.L, po = c.fin === false && L ? L.portalObj || L.exit : null;
      pitch = 0.74; ty = 1.3; k = 1.3;
      let fit = true;
      const b = g.boss, gf = b && b.gift, gl = gf && gf.stage === 1 && gf.glass ? gf.glass.position : null;
      if (c.drink) {
        // the Kefir Devi's gift: close on Feza while he drinks his glass of kefir (a lower view sees the glass from the side),
        // a little wider for his cheer after the last sip, then a gentle move back to the giant and its portal
        // (the aim leans up to ~1 m toward the giant when that still fits: Feza a little lower, its smile in the background)
        pitch = 0.54; ty = 0.9; k = 2.4;
        const bd = Math.hypot(c.bx - px, c.bz - pz), s = bd > 0.5 ? 8 / bd : 0;
        fitSolve('drink', px, pz, px + (c.bx - px) * s, pz + (c.bz - pz) * s, ty, pitch, c.drink === 2 ? 0.56 : 0.42, c.drink === 2 ? 0.95 : 0.8, false, DRINK_F);
      } else if (gl && c.t < CINE.boss) {   // …and before that, the glass floating over to him from the giant's hand: follow it in
        fitAdd(gl.x, gl.y - 0.35, gl.z); fitAdd(gl.x, gl.y + 0.45, gl.z);
        pitch = 0.68; ty = 1.1; k = 2.2;
        fitSolve('glass', px, pz, gl.x, gl.z, ty, pitch, 0.62, 1.7);
      } else if (c.t < CINE.boss) {
        // the boss while it is still there: its happy goodbye shrinks it (GAME's st.dying 0..1; −1 while it still stands
        // there, e.g. the Kefir Devi handing Feza its glass of kefir), else the usual 3.2 s
        const dy = b && b.st && typeof b.st.dying === 'number' ? Math.max(0, b.st.dying) : c.t / 3.2;
        // A portal that wakes up while the boss still waves (1.5 s in) joins the shot, so the kid sees the gate light up
        // while its line plays — when boss, gate and Feza all fit (decided once as it wakes; else the gate gets its own
        // shot after CINE.boss, as before)
        const pa = po && L.portalObj && L.portalObj.active !== false ? L.portalObj : null;
        let done = false;
        if (pa && c.poFit !== false) {
          fitCheerBoss(c, b, dy); fitAdd(pa.x, 0.2, pa.z + 0.9); fitAdd(pa.x, 2.6, pa.z); fitAdd(pa.x - 1.5, 1.2, pa.z); fitAdd(pa.x + 1.5, 1.2, pa.z);
          done = fitSolve('cheerP', px, pz, (c.bx + pa.x) / 2, (c.bz + pa.z) / 2, ty, pitch, 1.15, 1.8, true) >= 0;
          if (c.poFit === undefined) c.poFit = done;
        }
        if (!done) { fitCheerBoss(c, b, dy); fitSolve('cheer', px, pz, c.bx, c.bz, ty, pitch, 1.15, 1.7); }
      } else if (po) {   // mid-boss: the portal that just woke up
        pitch = 0.72;
        const tall = portalH(po) - 4.25;   // a taller gate (po.fit: the castle gate) : aim higher, may zoom out a little more
        ty += tall * 0.25;
        if (!c.pan) {   // Feza and the portal together (a far one may zoom out a little more)…
          fitPortal(po);
          const far = Math.hypot(po.x - px, po.z - pz) > 12;
          c.pan = fitSolve('portal', px, pz, po.x, po.z, ty, pitch, 1.1, (far ? 1.75 : 1.6) + tall * 0.08, true) < 0;
        }
        if (c.pan && c.t < CINE.back) {   // …or they don't fit: fly over to the portal, frame it whole, then back to Feza
          fitPortal(po); fitSolve('pan', po.x, po.z, po.x, po.z + 5, ty, pitch, 1.0, 1.35 + tall * 0.1, false, PAN_F);   // (aim a little south of it if a subtitle needs the room)
          FIT.ox += po.x - px; FIT.oz += po.z - pz; k = 1.5;
        } else if (c.pan) { fit = false; k = 1.6; }   // (flying back: the plain follow view)
      } else {
        const cs = (L && L.crystalSpot) || { x: c.bx, z: c.bz - 5 };
        pitch = 0.7; fitAdd(cs.x, 0, cs.z); fitAdd(cs.x, 3.4, cs.z); fitAdd(cs.x - 1.2, 1.5, cs.z); fitAdd(cs.x + 1.2, 1.5, cs.z);
        fitSolve('crystal', px, pz, cs.x, cs.z, ty, pitch, 1.15, 1.7);
      }
      if (fit) { zoom = FIT.zoom; ox = FIT.ox; oz = FIT.oz; }
      else { pitch = S.playPitch; ty = 0.8; }
    }
    if (snap) k = 1e3;
    CAMV.zoom = damp(CAMV.zoom, zoom, k, dt); CAMV.pitch = damp(CAMV.pitch, pitch, k, dt);
    CAMV.yaw = damp(CAMV.yaw, yaw, k, dt); CAMV.ty = damp(CAMV.ty, ty, k, dt);
    CAMV.ox = damp(CAMV.ox, ox, k, dt); CAMV.oz = damp(CAMV.oz, oz, k, dt);
    CAM.zoom = CAMV.zoom; CAM.pitch = CAMV.pitch; CAM.yaw = CAMV.yaw;
    const far = title ? TITLE_CAM.far : CAM_FAR;   // title: cull the distant forest chunks
    if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
    cameraFollow(px + CAMV.ox, CAMV.ty, pz + CAMV.oz, dt, snap);
    const sh = M.FX && M.FX.shakeOffset;
    if (!sh || sh.lengthSq() < 1e-8) {
      const t = CAM.target, cp = camera.position, base = CAM.dist * CAM.zoom;
      if (base > 0) CAMK.k = Math.hypot(cp.x - t.x, cp.y - t.y, cp.z - t.z) / base;
    }
  }
  // ?ikon: Feza close-up in a heroic outfit, cheer pose frozen at the top of the hop (arms + sword up), facing the camera.
  const IKON_ST = { move: 0, attack: -1, swingDir: 1, cast: -1, spin: false, hurt: 0, dead: false, cheer: true, idleT: 0 };
  let ikonT = 0, ikonDressed = false;
  const ikonPeak = hs => {   // clock time left until the next hop peak (|sin 7.5t| = 1)
    const k = Math.ceil((hs.t * 7.5 - Math.PI / 2) / Math.PI - 1e-6);   // tolerance: parked exactly on a peak stays there
    return Math.max(0, (Math.PI / 2 + k * Math.PI) / 7.5 - hs.t);
  };
  function ikonTick(dt) {
    const g = M.GAME, H = g && g.H; if (!H) return;
    g.P.face = CAMV.yaw - 0.28;
    H.root.position.copy(g.P.pos); H.root.rotation.y = g.P.face;
    const hs = H._S, clock = !!hs && typeof hs.t === 'number';
    if (!ikonDressed) {
      ikonDressed = true;
      const I = M.ITEMS;
      if (I && I.make && H.setEquip) safe('ikon.equip', () => H.setEquip({ weapon: I.make('weapon', 'gokkusagi', 3, 8), hat: null, cape: I.make('cape', 'kirmizi', 2, 8) }));
      if (typeof H.ignite === 'function' && !H.bladeOn) safe('ikon.ignite', () => H.ignite());   // lit lightsaber in the icon
      // The cheer face squeezes the eyes shut (^ ^); the icon keeps his big warm brown eyes open with the cheer grin + blush
      // (the hero's per-frame face hook, called after the pose is built).
      if (hs && !hs.fixed) hs.fixed = (P, face) => { face.happy = 0; };
      // The finished look from the very first frame (a screenshot may come early): let the rainbow blade grow out of the
      // hilt (0.3 s), put the clock on a hop peak, then update(0, st) settles every blend (cheer pose + face).
      safe('H.update', () => {
        for (let i = 0; i < 4; i++) H.update(0.1, IKON_ST);
        for (let i = 0; i < 6 && clock; i++) { const d = ikonPeak(hs); if (d < 1e-5) break; H.update(Math.min(d, 0.1), IKON_ST); }
        H.update(0, IKON_ST);
      });
      ikonT = 2;
      return;
    }
    ikonT += dt;
    let d = dt;
    if (ikonT > 1.5 && clock) d = ikonPeak(hs);   // stay parked on the hop peak
    safe('H.update', () => H.update(d, IKON_ST));
  }

  // ───────────────────────── Main loop ─────────────────────────
  function renderNow() { safe('renderNow', () => { updateCamera(0.016, true); camera.updateMatrixWorld(); renderFrame(); }); }
  // PC/Mac: at most 120 FPS. Tablets and phones: 60 FPS (QUALITY.tablet) — on a 120 Hz iPad every 2nd display refresh, evenly spaced.
  const frameRate = QUALITY.tablet ? 60 : 120;
  // FPS meter for the parent: the "." key toggles it (no button; ?fps on the address starts it on, handy on an iPad).
  // Counts the frames really drawn, the average frame time, the automatic quality level and the longest frame of the window.
  const FPSM = { el: null, n: 0, t0: 0, worst: 0 };
  function toggleFps(on = !FPSM.el) {
    if (!on) { if (FPSM.el) FPSM.el.remove(); FPSM.el = null; return; }
    if (FPSM.el) return;
    FPSM.el = document.createElement('div'); FPSM.el.className = 'u-fps'; FPSM.el.textContent = 'FPS ölçülüyor…';
    document.body.appendChild(FPSM.el); FPSM.t0 = 0; FPSM.n = 0; FPSM.worst = 0;
  }
  function fpsTick(ts, raw) {
    const m = FPSM; if (!m.el) return;
    if (S.paused || S.menu) { m.el.textContent = 'FPS · mola'; m.t0 = 0; return; }   // nothing is drawn while a menu is open
    if (!m.t0) { m.t0 = ts; m.n = 0; m.worst = 0; return; }
    m.n++; if (raw > m.worst) m.worst = raw;
    const span = ts - m.t0;
    if (span < 500) return;
    const q = typeof QUALITY !== 'undefined' ? QUALITY : null;
    m.el.textContent = Math.round(m.n * 1000 / span) + ' FPS · hedef ' + Math.round(PERF.target) + '\n' + (span / m.n).toFixed(1) + ' ms'   // short lines also fit a phone
      + (m.worst > 0.034 ? ' · en uzun ' + Math.round(m.worst * 1000) + ' ms' : '')
      + (q ? '\nçözünürlük ' + (+q.dpr.toFixed(2)) + '× · MSAA ' + q.msaa + '×' : '');
    m.t0 = ts; m.n = 0; m.worst = 0;
  }
  function frame(ts) {
    requestAnimationFrame(frame);
    perfRaf(ts, S.paused && !S.needRender && !S.busy);   // sample BEFORE our FPS cap; idle menus reveal browser cadence
    const interval = 1000 / frameRate;
    S.frameAcc = (S.frameAcc || 0) + (S.lastRaf ? ts - S.lastRaf : interval); S.lastRaf = ts;
    if (S.frameAcc < interval - 2) return;
    // Keep timing debt/fractions, but discard whole missed frames after a loading stall.
    S.frameAcc -= interval;
    if (S.frameAcc >= interval) S.frameAcc %= interval;
    const raw = S.lastFrame ? (ts - S.lastFrame) / 1000 : 1 / frameRate;
    S.lastFrame = ts;
    step(clamp(raw, 0, 0.05), raw, true);
    fpsTick(ts, raw);
  }
  // One frame; every module call is isolated so a failing module never stops the loop (no per-frame closures).
  function step(dt, raw, render) {
    S.frame++; S.t += dt;
    // Explicit inactive frames clear the sampling window: menus, loading and title time cannot count as smooth play.
    try { perfTick(raw, S.mode === 'play' && !S.paused && !S.busy && M.GAME && M.GAME.state === 'play'); } catch (e) { warn('perfTick', e); }
    const g = M.GAME, P = g && g.P;
    if (!S.paused) {
      TIME.dt = dt; TIME.t += dt; TIME.u.value = TIME.t;
      if (g) {
        try { if (ICON) ikonTick(dt); else if (g.state === 'title') g.titleUpdate(dt); else g.update(dt); } catch (e) { warn('GAME.update', e); }
        const L = g.L;
        if (L && M.LEVEL && M.LEVEL.update) { try { M.LEVEL.update(dt, L, P.pos.x, P.pos.z); } catch (e) { warn('LEVEL.update', e); } }
      }
      if (M.FX && M.FX.update) { try { M.FX.update(dt); } catch (e) { warn('FX.update', e); } }
      try { updateCamera(dt); } catch (e) { warn('camera', e); }
      if (P) {
        try { lightsFollow(P.pos.x, P.pos.z); } catch (e) { warn('lightsFollow', e); }
        if (!SILENT && M.AUD && M.AUD.setListener) { try { M.AUD.setListener(P.pos.x, P.pos.z); } catch (e) { warn('AUD.setListener', e); } }
      }
      if (S.atkHeld && S.t >= S.atkNext) { attack(); S.atkNext = S.t + 0.27; }
      if (S.cine) cineTick(dt);
    }
    if (HOLDS.length || S.menu === 'pause') holdTick();
    if (CORNERS.length) cornerTick();
    if (S.mode === 'title') titleVoiceTick(dt);
    if (S.bpq && S.bpq.length && S.t >= S.bpqT) { if (S.mode === 'end') { bossPortrait(S.bpq.shift()); S.bpqT = S.t + 0.35; } else S.bpq.length = 0; }
    if (S.portraitDirty && S.t >= S.portraitAt) { S.portraitDirty = false; refreshPortrait(); }
    if (M.GAME && D.shopPrompt) {
      D.shopPrompt.classList.toggle('u-hide', S.mode !== 'play' || !!S.menu || M.GAME.state !== 'play' || !M.GAME.merchantNear());
      D.wardTag.classList.toggle('u-hide', !M.GAME.merchantWard());
    }
    try { hudTick(dt); } catch (e) { warn('hud', e); }
    if (render && (!S.paused || S.needRender)) { S.needRender = false; try { renderFrame(); } catch (e) { warn('renderFrame', e); } }
  }

  // ───────────────────────── Boot ─────────────────────────
  function boot() {
    if (S.booted) return readyP;
    S.booted = true;
    resolve();
    S.playPitch = CAM.pitch;
    build();
    onResize();
    RESIZE_HOOKS.push(onResize);
    loadPrefs(); syncToggles();
    if (Q.has('fps')) toggleFps(true);
    if (M.AUD) M.AUD.onSubtitle = subtitle;
    bindInput();
    // Measure browser cadence while only the loading spinner is visible, before 3D work can slow rAF down.
    perfMeasure(() => setTimeout(heavyInit, 0));
    // offline play: register sw.js on every http(s) build (it serves src/*.js network-first, so dev files are never stale)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
      if (document.readyState === 'complete') reg(); else addEventListener('load', reg);
    }
    return readyP;
  }
  function heavyInit() {
    const t0 = performance.now(), T = [];
    const lap = k => { if (DEBUG) T.push(k + ' ' + Math.round(performance.now() - t0)); };
    if (M.TEX && M.TEX.init) safe('TEX.init', () => M.TEX.init());
    lap('tex');
    if (M.FX && M.FX.init) safe('FX.init', () => M.FX.init());
    lap('fx');
    const g = M.GAME;
    if (g) {
      safe('GAME.init', () => g.init());
      lap('game');
      wireEvents();
      safe('loadZone(title)', () => g.loadZone(0, { title: true }));
      lap('zone');
    }
    portraitSoon(0);
    const ld = document.getElementById('loading');
    if (ld) { ld.style.transition = 'opacity 0.6s'; ld.style.opacity = '0'; setTimeout(() => ld.remove(), 700); }
    if (ICON) { S.mode = 'ikon'; if (g && g.P) g.P.face = 0; }
    else showTitle();
    renderNow();
    lap('first frame');
    S.ready = true;
    if (DEBUG) console.log('[UI] boot ms: ' + T.join(', '));
    requestAnimationFrame(frame);
    readyRes();
  }

  return {
    boot, ready: readyP, fade, banner, toast, itemCard, openBag, openPause, closeMenu, showVictory, showTitle, startGame,
    refreshPortrait, subtitle, setPref, openDreamMap, closeDreamMap, travelTo, showDreamTravel,
    get mode() { return S.mode; }, get menu() { return S.menu; }, get paused() { return S.paused; },
    _S: S, _D: D, _TC: TITLE_CAM, _DC: DRG_CAM, _BF: BOSS_FIT, _BS: BOSS_SHAPE, _FIT: FIT, _FL: FL,
    _dragon() { DRG.tried = false; DRG.url = DRG.cv = null; return dragonPortrait(); },   // tests: render the dragon portrait again
    _boss(t) { const R = bpRec(t); R.tried = false; R.url = R.cv = null; return bossPortrait(t); },   // tests: (re)render a boss portrait
    _bossHTML: t => bossHTML(t), _bossSvg: t => bossSvg(t), _savedZone: () => savedZone(), _goal: () => MV.goal, _mapTheme: () => MM.theme, _CINE: CINE,
    _BC: BONUS_CAM, _bonus: () => ({ used: BZ.used, has: BZ.has, x: BZ.x, z: BZ.z, zN: BZ.zN, n: BZ.n, ok: BZ.ok, map: MV.bonus, pips: BN.on, done: BN.done, have: BN.have, need: BN.need }),
    _step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) step(dt, dt, i === n - 1); },   // tests: deterministic frames
  };
})();

function boot() { return UI.boot(); }
if (!window.UI_MANUAL) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}

