/* ── Düşmanlar: istatistikler (EDEF) + modeller ve animasyonlar (EMODEL) ──
   Her karakter tek bir iskeletli örgüdür (SkinnedMesh): parçalar Kit ile tek geometride birleşir, hareketli parçalar
   kemiklere bağlıdır → düşman başına 1 çizim çağrısı. Geometriler tür+varyant+elit başına önbellekte (huysuz/mutlu yüz
   için iki geometri), bütün örnekler paylaşır; her örneğin kendi malzemesi var (vuruş parlaması, buz rengi).
   Feza'nın isteği: hepsi sevimli ve gülümseyen. 'grumpy' yüz = haylaz-oyuncu (kocaman gözler, kalkık kaş, yamuk sırıtış,
   dil ucu), 'happy' yüz = çok mutlu (^ ^ gözler, kocaman gülüş, pembe yanak, kalpler). Örümcek yok; mağarada köstebek
   (toprağa dalar: st.burrow) ve salyangoz (baloncuk üfler, canı yanınca kabuğuna saklanır) var.
   3. tur (Feza'nın isteği): yanardağda minik lav kaplumbağası (kabuğunda tüten minik yanardağ, kabuğuna girip yuvarlanır),
   ateş kuşu (alev tepeli tombul civciv), lav jölesi ve magma kaya devi; her bölümün sonunda bir boss: Kral Jöle, Usta Köstebek,
   Koca Lav Kaplumbağası (hepsi st.phase + st.phaseT ile oynar; mutlu olunca el sallayıp parıltıyla kaybolur).
   4. tur (Feza'nın isteği): Kefir Vadisi — ekşi yoğurt (kapağı şapka gibi), kesik kaymak (bal şapkalı rulo), kefir köpüğü
   (uçan baloncuk kümesi), peynir dilimi (kırmızı mum çizmeli), muhallebi jölesi ve boss Köpüklü Kefir Devi (cam şişe, içinde
   kefir ve yükselen kabarcıklar, taç gibi gazoz kapağı; yenilince Feza'ya pipetli bir bardak kefir uzatır). Buradaki huysuz
   yüz = komik ekşi yüz (bir göz kısık, dil dışarıda); mutlu olunca krema bembeyaz olur.
   5. tur (Feza'nın isteği): Surlu Şehir — buradaki huysuzlar insan (ejderha onları kandırmış): nöbetçi (ponponlu tahta mızrak,
   güneşli kalkan), simitçi (başında simit tablası; simiti zıplatıp yakalar, fırlatır), süpürgeci (saman süpürgeyle kayarak
   süpürür), tellal (kocaman davul: tokmaklar havaya, sonra DÜM!). Huysuz yüz = "hıh!" diye surat asma (yana bakan gözler,
   şişkin yanaklar, büzük dudak, kalkık kaşlar); mutlu yüz yine ^ ^. Şövalyenin turnuva sancağı: EMODEL.sancak() (devrilir,
   yerde güneşi gülümser). Boss Huysuz Şövalye: kocaman, sevimli bir atın üstünde minik ve çok huysuz bir şövalye (gökkuşağı
   sorguçlu miğfer, kıvrık bıyık, ponpon toplu mızrak, dama desenli at örtüsü, kirpikli kocaman at gözleri). Dörtnala koşar,
   şahlanır, mızrağını savurur, at nalı fırlatır, borusunu çalar; yenilince miğferini çıkarıp sallar.
   6. tur: bossların bonus oyunları için yeni hâller (Kral Jöle tacını kaybedip utanır, Kefir Devi köpük balonu üfler ve hıçkırır,
   Usta Köstebek delikten başını çıkarır, Lav Kaplumbağası taşa çarpıp yan yatar, Şövalyenin atı havuç yer, Ejderha kalp üfler),
   yüz ifadeleri (s.eyeK / s.browY / s.mouthO …), Feza'yı görmeden önceki küçük oyalanmalar, ilk kükremede şaşkın bir zıplama ve
   yeni sahne eşyaları: EMODEL.jellyCrown (taç), havuc, serinTas (serin taş), hole (köstebek deliği). */

// Base stats (zone 1 scale; GAME multiplies by zone and its DIFF table). hover = flying height of the model origin.
// Feza's request: no spiders any more (orumcek removed); the cave has moles (kostebek) and snails (salyangoz).
const EDEF = {
  jole:    { ad: 'Jöle', hp: 22, dmg: 5, speed: 2.6, r: 0.5, height: 0.78, xp: 10, gold: 3, kind: 'melee', atkRange: 0.9, atkCd: 1.6, windup: 0.6, fly: false, aggro: 8.5, variants: ['green', 'pink', 'blue', 'purple'] },
  mantar:  { ad: 'Huysuz Mantar', hp: 26, dmg: 6, speed: 1.8, r: 0.5, height: 1.02, xp: 12, gold: 3, kind: 'ranged', atkRange: 7, atkCd: 2.4, windup: 0.7, fly: false, aggro: 9, shot: { kind: 'spore', speed: 5.5, r: 0.32 } },
  yarasa:  { ad: 'Yarasa', hp: 12, dmg: 4, speed: 4.4, r: 0.45, height: 0.62, xp: 8, gold: 2, kind: 'melee', atkRange: 0.9, atkCd: 1.5, windup: 0.5, fly: true, hover: 0.9, aggro: 10 },
  goblin:  { ad: 'Haylaz Goblin', hp: 38, dmg: 8, speed: 2.9, r: 0.55, height: 1.22, xp: 16, gold: 5, kind: 'melee', atkRange: 1.1, atkCd: 1.8, windup: 0.65, fly: false, aggro: 9 },
  // kind 'burrow': when aggro and far it digs in (st.burrow 0→1), travels underground, pops up near Feza (1→0 = wind-up), bonks
  kostebek: { ad: 'Köstebek', hp: 30, dmg: 7, speed: 3.2, r: 0.5, height: 0.9, xp: 14, gold: 1, kind: 'burrow', atkRange: 1.4, atkCd: 1.6, windup: 0.6, fly: false, aggro: 9, burrowIn: 0.4, burrowOut: 0.35 },
  salyangoz: { ad: 'Salyangoz', hp: 40, dmg: 6, speed: 1.2, r: 0.6, height: 0.9, xp: 16, gold: 1, kind: 'ranged', atkRange: 6.5, range: 6.5, atkCd: 2.6, windup: 0.7, fly: false, aggro: 9, shot: { kind: 'bubble', speed: 4.5, r: 0.35 } },
  hayalet: { ad: 'Hayalet', hp: 30, dmg: 7, speed: 2.2, r: 0.5, height: 1.12, xp: 14, gold: 4, kind: 'ranged', atkRange: 6.5, atkCd: 2.6, windup: 0.75, fly: true, hover: 0.35, aggro: 9, shot: { kind: 'ghost', speed: 5, r: 0.32 } },
  golem:   { ad: 'Kaya Devi', hp: 140, dmg: 14, speed: 1.5, r: 1.1, height: 2.45, xp: 45, gold: 12, kind: 'slam', atkRange: 2.6, atkCd: 2.8, windup: 1.0, fly: false, aggro: 9, slamR: 2.2 },
  asker:   { ad: 'Teneke Asker', hp: 55, dmg: 10, speed: 2.6, r: 0.55, height: 1.6, xp: 22, gold: 6, kind: 'melee', atkRange: 1.2, atkCd: 1.9, windup: 0.7, fly: false, aggro: 9 },
  atescik: { ad: 'Ateşçik', hp: 32, dmg: 8, speed: 2.4, r: 0.5, height: 0.95, xp: 16, gold: 4, kind: 'ranged', atkRange: 7, atkCd: 2.5, windup: 0.7, fly: true, hover: 0.3, aggro: 9, shot: { kind: 'fire', speed: 5.5, r: 0.32 } },
  ejderha: { ad: 'Huysuz Ejderha', hp: 1600, dmg: 16, speed: 1.6, r: 2.2, height: 4.6, xp: 600, gold: 150, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, fly: false, aggro: 14, shot: { kind: 'dragonfire', speed: 5.5, r: 0.55 },
    final: true, lines: { giris: 'ejderha_giris', bitti: 'ejderha_bitti', yarim: 'ejderha_yarim' },
    // (the dragon animates bite / stomp / breath / fireball / roar from st.windup … st.fireball; Round 6's 'sigh' and 'charmed' from
    // st.phase + st.phaseT like the zone bosses — GAME sets st.breath etc. to −1 then)
    phases: ['idle', 'move', 'roar', 'bite', 'stomp', 'breath', 'fireball', 'sigh', 'charmed'], sighAt: 0.55 },
  // ── Round 3: volcano creatures (zone 2 'yanardag'; the volcano also uses jole variant 'lava' and golem variant 'magma') ──
  // kaplumbaga: melee — the wind-up tucks it into its shell, the attack is a forward roll along a lane (GAME moves it; st.attack =
  // share of the lane rolled, then 1 while it recovers: the model tumbles in whole turns and pops out only after it stops).
  kaplumbaga: { ad: 'Minik Lav Kaplumbağası', eliteAd: 'Kocaman Lav Kaplumbağası', hp: 46, dmg: 8, speed: 2.3, r: 0.55, height: 0.8, xp: 18, gold: 4, kind: 'melee', atkRange: 1.1, atkCd: 1.9, windup: 0.7, fly: false, aggro: 9 },
  ateskusu: { ad: 'Ateş Kuşu', eliteAd: 'Kocaman Ateş Kuşu', hp: 30, dmg: 7, speed: 2.8, r: 0.45, height: 0.78, xp: 16, gold: 4, kind: 'ranged', atkRange: 7, range: 7, atkCd: 2.5, windup: 0.7, fly: true, hover: 0.7, aggro: 9.5, shot: { kind: 'ember', speed: 5, r: 0.3 } },
  // ── Round 3: a boss at the end of every zone (kind 'boss'; GAME sizes their hp to Feza's damage). They animate from
  // st.phase + st.phaseT (0..1); the lists are the phases each model knows. summon/slamR/rollSpeed are suggestions for GAME. ──
  kraljole: { ad: 'Kral Jöle', hp: 700, dmg: 8, speed: 2.2, r: 1.45, height: 2.8, xp: 220, gold: 60, kind: 'boss', atkRange: 2.6, atkCd: 1.6, windup: 0.8, fly: false, aggro: 13,
    shot: { kind: 'jelly', speed: 4.5, r: 0.45 }, lines: { giris: 'kraljole_giris', bitti: 'kraljole_bitti' },
    phases: ['idle', 'move', 'hop', 'spit', 'summon', 'roar', 'shy', 'crownon', 'blush'], summon: { type: 'jole', n: 3, at: [0.66, 0.33] }, slamR: 3.2,
    crownOnAt: 0.35 },
  kostebekusta: { ad: 'Usta Köstebek', hp: 1000, dmg: 11, speed: 2.4, r: 1.25, height: 2.6, xp: 330, gold: 90, kind: 'boss', atkRange: 2.4, atkCd: 1.6, windup: 0.8, fly: false, aggro: 13,
    shot: { kind: 'rock', speed: 5, r: 0.45 }, lines: { giris: 'usta_giris', bitti: 'usta_bitti' },
    phases: ['idle', 'move', 'burrow', 'emerge', 'throw', 'drill', 'summon', 'roar', 'peek', 'bonk', 'dizzy'], summon: { type: 'kostebek', n: 3, at: [0.66, 0.33] }, slamR: 3.0, burrowIn: 0.8, burrowOut: 0.45,
    peek: { up: 0.2, duck: 0.85, sink: 1.55 }, bonkSink: 0.3 },
  lavkaplumbaga: { ad: 'Koca Lav Kaplumbağası', hp: 1300, dmg: 14, speed: 1.5, r: 1.65, height: 2.8, xp: 450, gold: 120, kind: 'boss', atkRange: 3, atkCd: 1.6, windup: 0.8, fly: false, aggro: 14,
    shot: { kind: 'lavaball', speed: 5, r: 0.5 }, lines: { giris: 'kaplumbaga_giris', bitti: 'kaplumbaga_bitti' },
    phases: ['idle', 'move', 'erupt', 'hide', 'roll', 'stomp', 'summon', 'roar', 'rollend', 'flip'], summon: { type: 'kaplumbaga', n: 2, at: [0.5] }, slamR: 4.2, rollSpeed: 7,
    flipAt: [0.12, 0.88] },
  // ── Round 4: Kefir Vadisi (zone 1 'kefir', theme 'dairy'; the valley also has jole variant 'muhallebi'). Their 'grumpy' face is the
  // funny sour 😜 face. All melee in spirit, with GAME's moves: yogurt kind 'hop' (hops at Feza and bumps: st.windup = crouch,
  // st.attack/st.air = the hop GAME carries, st.attack 1 = squashed recover), kaymak 'glide' (whooshes along a lane like the
  // rolling turtle: st.attack = share of the lane, then 1), peynir 'slam' (leans back, flops forward at st.attack 0: the ring).
  // line = voice key for the first time that type notices Feza; trail = a short creamy trail while it glides. ──
  yogurt: { ad: 'Ekşi Yoğurt', eliteAd: 'Kocaman Ekşi Yoğurt', hp: 24, dmg: 6, speed: 2.5, r: 0.5, height: 0.82, xp: 12, gold: 3, kind: 'hop', atkRange: 2.4, atkCd: 1.9, windup: 0.6, fly: false, aggro: 9, line: 'ilk_yogurt' },
  kaymak: { ad: 'Kesik Kaymak', eliteAd: 'Kocaman Kesik Kaymak', hp: 26, dmg: 6, speed: 3.5, r: 0.5, height: 0.68, xp: 13, gold: 3, kind: 'glide', atkRange: 2.4, atkCd: 2.0, windup: 0.65, fly: false, aggro: 9.5, trail: 'milk', line: 'ilk_kaymak' },
  kopuk: { ad: 'Kefir Köpüğü', eliteAd: 'Kocaman Kefir Köpüğü', hp: 20, dmg: 6, speed: 2.3, r: 0.45, height: 0.8, xp: 12, gold: 3, kind: 'ranged', atkRange: 6.5, range: 6.5, atkCd: 2.6, windup: 0.75, fly: true, hover: 0.7, aggro: 9.5, shot: { kind: 'fizz', speed: 3.8, r: 0.36 }, line: 'ilk_kopuk' },
  peynir: { ad: 'Peynir Dilimi', eliteAd: 'Kocaman Peynir Dilimi', hp: 80, dmg: 11, speed: 1.5, r: 0.75, height: 1.4, xp: 30, gold: 8, kind: 'slam', atkRange: 1.7, atkCd: 2.6, windup: 0.95, slamR: 1.9, fly: false, aggro: 9 },
  // Köpüklü Kefir Devi — model timing (phaseT): shake = wind-up (wobbles + fizzes) · geyser: cap pops at 0.1, sprays 0.14–0.84 (sprayAt),
  // cap back on ~0.9 · bubbles: puffs at fizzAt while turning left → right (the fan) · slam: crouch 0–0.2, airborne 0.2–0.8, lands at
  // 0.8 · summon: beat ≈ 0.5. Defeat: st.dying give.from … give.to it holds out a glass of kefir (m.giftPos(); handed over at ≈ 0.4),
  // then hops, waves and twirls away — dieDur (s) is the suggested length of that goodbye (st.give 0..1 may drive the hand-over instead).
  kefirdev: { ad: 'Köpüklü Kefir Devi', hp: 1000, dmg: 13, speed: 1.7, r: 1.45, height: 3.0, xp: 200, gold: 50, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, fly: false, aggro: 12,
    shot: { kind: 'fizz', speed: 4, r: 0.45 }, lines: { giris: 'kefirdev_giris', bitti: 'kefirdev_bitti' },
    phases: ['idle', 'move', 'shake', 'geyser', 'bubbles', 'slam', 'summon', 'roar', 'blow', 'hiccup'], summon: { type: 'kopuk', n: 3, at: [0.66, 0.33] }, slamR: 3.0,
    blowAt: [0.45, 0.5, 0.75], hiccupAt: [0.15, 0.45, 0.75],
    cone: { angle: 0.9, len: 6 }, fizzAt: [0.4, 0.5, 0.6, 0.7, 0.8], sprayAt: [0.14, 0.84], slamAt: 0.8, give: { from: 0.05, to: 0.45 }, dieDur: 6.5 },
  // ── Round 5: Surlu Şehir (zone 4 'sehir', theme 'town'). The huysuz are PEOPLE here (the dragon tricked them): the sulky "hıh!"
  // face while grumpy. nobetci melee (wind-up = draws the spear back level, attack = the poke-lunge), simitci ranged (the wind-up
  // takes a simit off his tray and swings it forward: it leaves his hand, the muzzle, at st.windup 1), supurgeci 'glide' like
  // kaymak (st.attack = the share of the lane, then 1 = recover; trail = GAME's puff while he whooshes), tellal 'slam' (mallets
  // up = wind-up, BOOM on the drum at st.attack 0 = GAME's ring). ──
  nobetci: { ad: 'Huysuz Nöbetçi', eliteAd: 'Kocaman Nöbetçi', hp: 58, dmg: 10, speed: 2.6, r: 0.55, height: 1.35, xp: 22, gold: 6, kind: 'melee', atkRange: 1.5, atkCd: 1.9, windup: 0.7, fly: false, aggro: 9, line: 'ilk_nobetci' },
  simitci: { ad: 'Huysuz Simitçi', eliteAd: 'Kocaman Simitçi', hp: 40, dmg: 8, speed: 2.0, r: 0.55, height: 1.3, xp: 18, gold: 5, kind: 'ranged', atkRange: 7, range: 7, atkCd: 2.5, windup: 0.7, fly: false, aggro: 9, shot: { kind: 'simit', speed: 5, r: 0.34 }, line: 'ilk_simitci' },
  supurgeci: { ad: 'Huysuz Süpürgeci', eliteAd: 'Kocaman Süpürgeci', hp: 34, dmg: 8, speed: 3.6, r: 0.5, height: 1.2, xp: 17, gold: 4, kind: 'glide', atkRange: 2.4, atkCd: 2.0, windup: 0.65, fly: false, aggro: 9.5, trail: 'dust', line: 'ilk_supurgeci' },
  tellal: { ad: 'Huysuz Tellal', eliteAd: 'Kocaman Tellal', hp: 130, dmg: 14, speed: 1.5, r: 0.85, height: 1.95, xp: 45, gold: 12, kind: 'slam', atkRange: 2.4, atkCd: 2.8, windup: 1.0, slamR: 2.2, fly: false, aggro: 9, line: 'ilk_tellal' },
  // Huysuz Şövalye — model timing (phaseT; GAME uses the same beats): charge: paws + lowers the lance 0–0.3 (chargeAt[0]), gallops
  // 0.3–0.9, skids to a stop 0.9–1 · rear: up on the hind legs 0–0.5, lands at rearAt 0.5 (the stomp ring slamR), settles ·
  // sweep: lance drawn back to his right 0–0.4, swept from his right across the front to his left 0.4–0.6 (sweepAt 0.5 = straight
  // ahead; cone = the lance's reach: angle (full, rad) and len beyond r) · toss: horseshoes leave his left hand at tossAt ·
  // summon: the little horn at hornAt (m.marker('horn') = its bell, for the notes) · roar: "hımf!" + the horse's neigh · dizzy
  // (the banners' surprise): loops on its own clock. m.muzzle() = the left (throwing) hand, m.marker('lance') = the lance's ball.
  // Defeat (dieDur s): takes off his helmet and waves it while the horse prances (st.dying 0–0.35), happy hops (0.35–0.7), twirl.
  sovalye: { ad: 'Huysuz Şövalye', hp: 1400, dmg: 15, speed: 2.0, r: 1.7, height: 3.4, xp: 500, gold: 130, kind: 'boss', atkRange: 3.2, atkCd: 1.6, windup: 0.8, fly: false, aggro: 14,
    shot: { kind: 'horseshoe', speed: 5, r: 0.45 }, lines: { giris: 'sovalye_giris', bitti: 'sovalye_bitti' },
    phases: ['idle', 'move', 'charge', 'rear', 'sweep', 'toss', 'summon', 'roar', 'dizzy', 'seek', 'munch'], summon: { type: 'nobetci', n: 2, at: [0.66, 0.33] }, slamR: 3.6, chargeSpeed: 9,
    chargeAt: [0.3, 0.9], rearAt: 0.5, sweepAt: 0.5, sweep: [0.4, 0.6], cone: { angle: 2.4, len: 1.6 }, tossAt: [0.35, 0.5, 0.65], hornAt: 0.5, dieDur: 3.2 },
};

const EMODEL = (function (G0) {
  'use strict';
  const PI = Math.PI;

  // ── Level of detail: builders ask for segment counts; they are scaled by LODK (set per character type while it is
  // built) so a character stays about 5-8k triangles (dragon about 20k). The shared core cache G0 keeps every variant. ──
  // (the little volcano creatures come in packs inside the sun's shadow box, skinned twice: a leaner LOD keeps the volcano's
  // shadow pass in line with the other zones; the town's people carry many small props, so theirs are lean too: 6.8-7.9k)
  const LOD = { ejderha: 0.72, baby: 0.7, owl: 1, kraljole: 0.85, kostebekusta: 0.8, lavkaplumbaga: 0.8, kaplumbaga: 0.45, ateskusu: 0.5,
    yogurt: 0.55, kaymak: 0.55, kopuk: 0.5, peynir: 0.65, kefirdev: 0.8,
    nobetci: 0.5, simitci: 0.55, supurgeci: 0.55, tellal: 0.5, sancak: 0.6, sovalye: 0.66 };
  let LODK = 1;
  const sN = (n, min) => Math.max(min, Math.round(n * LODK));
  const G = {
    sphere: (w = 20, h) => G0.sphere(sN(w, 6), sN(h ?? Math.max(6, Math.round(w * 0.7)), 4)),
    hemi: (w = 20) => G0.hemi(sN(w, 8)),
    cyl: (rt = 1, rb = 1, seg = 16, open = false) => G0.cyl(rt, rb, sN(seg, 5), open),
    cone: (seg = 12) => G0.cone(seg <= 4 ? seg : sN(seg, 6)),
    rbox: (seg = 2) => G0.rbox(LODK < 0.8 ? Math.max(1, seg - 1) : seg),
    torus: (arc = TAU, tube = 0.25, seg = 16) => {
      const rs = sN(8, 5), ts = sN(seg, 6);
      return gx(`T${arc.toFixed(3)}_${tube}_${rs}_${ts}`, () => new THREE.TorusGeometry(1, tube, rs, ts, arc));
    },
    box: G0.box, octa: G0.octa, ico: G0.ico, dodeca: G0.dodeca, capsule: G0.capsule,
  };

  // ── Surface patch: per-vertex flags aFx = (unlit 0..1, gloss 0..1 | 2 = metal, texture mask, wobble weight);
  // each may also be a function (x, y, z) of the model-space position (glowing lava veins, the cheese's waxed rind). ──
  const V_DECL = 'attribute vec4 aFx; varying vec4 vFx; uniform float uT; uniform vec4 uWob;';
  const V_BEGIN = `vFx = aFx;
    if (aFx.w > 0.0) {
      float wp = uT * uWob.z + uWob.w; vec3 wq = position * uWob.y;
      transformed += vec3(sin(wp + wq.y + wq.z * 0.7), 0.35 * sin(wp * 0.83 + wq.x * 1.3 + wq.y), cos(wp * 1.13 + wq.y * 0.9 + wq.x * 0.8)) * (uWob.x * aFx.w);
    }`;
  const F_DECL = 'varying vec4 vFx; uniform vec3 uSss; uniform vec4 uFl; uniform vec4 uLava;';
  // Hit flash (uFl = colour, amount): lift the albedo toward the flash colour and add a little warm light. It stays lit, so
  // form and texture remain readable and nothing blooms; very dark albedo (pupils, brows, lash lines) is masked out so the
  // face stays readable too.
  const F_FLASH = `float flM = uFl.a * smoothstep(0.008, 0.06, dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)));
    diffuseColor.rgb = mix(diffuseColor.rgb, uFl.rgb, flM * 0.3 * (1.0 - vFx.x));`;
  // uLava (rgb, amount): molten glow in the dark crevices of the texture (magma golem's cracks); 0 = off for everyone else.
  const F_MAP = `float lavaM = 0.0;
#ifdef USE_MAP
  vec4 eTex = texture2D(map, vMapUv);
  diffuseColor *= mix(vec4(1.0), eTex, vFx.z);
  lavaM = uLava.a * vFx.z * smoothstep(0.3, 0.12, dot(eTex.rgb, vec3(0.3, 0.59, 0.11)));
#endif`;
  const F_ROUGH = `{ float gl = min(vFx.y, 1.0), mt = step(1.5, vFx.y);
    roughnessFactor = mix(roughnessFactor, mix(0.1, 0.28, mt), gl); metalnessFactor = max(metalnessFactor, mt); }`;
  const F_NORM = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * vFx.z;');
  // (rimColor/rimPow come from core rimify, composed on every enemy material; the rim is damped while flashing)
  const F_OUT = `outgoingLight += uSss * diffuseColor.rgb * pow(saturate(dot(normal, normalize(vViewPosition))), 1.6);
    outgoingLight -= rimColor * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), rimPow) * (0.75 * uFl.a);
    outgoingLight = mix(outgoingLight, diffuseColor.rgb + totalEmissiveRadiance, vFx.x);
    outgoingLight += uLava.rgb * lavaM;
    outgoingLight += uFl.rgb * vec3(1.0, 0.9, 0.78) * (flM * 0.16);`;
  function surfPatch(mat, U) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + V_DECL)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + V_BEGIN);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + F_DECL)
        .replace('#include <map_fragment>', F_MAP)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + F_FLASH)
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + F_ROUGH)
        .replace('#include <normal_fragment_maps>', F_NORM)
        .replace('#include <opaque_fragment>', F_OUT + '\n#include <opaque_fragment>');
      prev.call(mat, sh, r);
    };
    const k = (mat.userData.pkey || '') + '|efx';
    mat.userData.pkey = k;
    mat.customProgramCacheKey = () => k;
    return mat;
  }
  // One material per character instance (flash/tint are per instance; the shader program is shared).
  function eMat(o = {}) {
    const p = { roughness: o.rough ?? 0.45, metalness: 0 };
    if (o.tex) {
      if (o.tex.map) p.map = o.tex.map;
      if (o.tex.normalMap) { p.normalMap = o.tex.normalMap; p.normalScale = new THREE.Vector2(o.ns ?? 1, o.ns ?? 1); }
    }
    const mat = vcMat(p);
    const U = {
      uT: TIME.u,
      uWob: { value: new THREE.Vector4(o.wob || 0, o.wobF || 3, o.wobS || 3, Math.random() * 20) },
      uSss: { value: new THREE.Color(o.sss ?? 0) },
      uFl: { value: new THREE.Vector4(1, 1, 1, 0) },
      uLava: { value: new THREE.Vector4(0, 0, 0, 0) },
    };
    surfPatch(mat, U);
    rimify(mat, o.rim ?? 0xffffff, o.rimK ?? 0.26, o.rimP ?? 2.6);
    mat.userData.U = U;
    return mat;
  }
  function texOf(name) {
    if (typeof TEX === 'undefined' || !TEX || !TEX[name]) return null;
    return TEX.rep ? (TEX.rep(name, 1, 1) || TEX[name]) : TEX[name];
  }

  // ── Colour + math helpers ──
  const col = h => new THREE.Color(h);
  const hdr = (h, k) => new THREE.Color(h).multiplyScalar(k);
  const mixc = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  function rich(h, ks = 1.22, kl = 0.9) {   // elites: deeper, more saturated colours
    const c = new THREE.Color(h), hsl = {}; c.getHSL(hsl);
    return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * ks), hsl.l * kl);
  }
  // Vertical gradient colour function for Kit (stops: [[t, colour], ...] over y0..y1).
  function vgrad(y0, y1, stops) {
    const cs = stops.map(s => [s[0], s[1] && s[1].isColor ? s[1] : new THREE.Color(s[1])]), out = new THREE.Color();
    return (x, y) => {
      const t = clamp((y - y0) / (y1 - y0), 0, 1);
      let i = 0; while (i < cs.length - 2 && t > cs[i + 1][0]) i++;
      const a = cs[i], b = cs[i + 1];
      return out.copy(a[1]).lerp(b[1], smooth01((t - a[0]) / Math.max(1e-5, b[0] - a[0])));
    };
  }
  const _Z = new THREE.Vector3(0, 0, 1), _Y = new THREE.Vector3(0, 1, 0);
  // Quaternion turning +z to the direction n (then spinning around it).
  function qz(nx, ny, nz, spin = 0) {
    const q = new THREE.Quaternion().setFromUnitVectors(_Z, new THREE.Vector3(nx, ny, nz).normalize());
    if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(_Z, spin));
    return q;
  }
  const qy = (dx, dy, dz) => new THREE.Quaternion().setFromUnitVectors(_Y, new THREE.Vector3(dx, dy, dz).normalize());
  // Basis quaternion: local +y along yDir, local +z as close as possible to zDir.
  function qb(yDir, zDir) {
    const y = new THREE.Vector3(...yDir).normalize(), z0 = new THREE.Vector3(...zDir);
    const x = new THREE.Vector3().crossVectors(y, z0).normalize(), z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }
  function hash3(x, y, z) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth01(x - xi), v = smooth01(y - yi), w = smooth01(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
      l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  const fbm3 = (x, y, z) => vnoise(x, y, z) * 0.6 + vnoise(x * 2.1 + 5, y * 2.1, z * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3 + 9, z * 4.3) * 0.12;

  // ── Own geometry cache (never disposed; shared by all instances) ──
  const GX = {};
  function gx(key, make) { let g = GX[key]; if (!g) { g = GX[key] = make(); g.userData.keep = true; } return g; }
  // Average normals of coincident vertices (removes lighting seams of displaced spheres / lathes).
  function seamNormals(g) {
    const p = g.attributes.position, n = g.attributes.normal, map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
      let a = map.get(k); if (!a) map.set(k, a = []); a.push(i);
    }
    for (const a of map.values()) {
      if (a.length < 2) continue;
      let x = 0, y = 0, z = 0;
      for (const i of a) { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }
      const l = Math.hypot(x, y, z) || 1;
      for (const i of a) n.setXYZ(i, x / l, y / l, z / l);
    }
    return g;
  }
  // Non-indexed geometry → normals smoothed only across edges flatter than `angle` (keeps crisp creases).
  function creased(g, angle = 0.6) {
    if (g.index) g = g.toNonIndexed();
    const p = g.attributes.position, cnt = p.count, nf = cnt / 3, fn = new Float32Array(nf * 3);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let f = 0; f < nf; f++) {
      a.fromBufferAttribute(p, f * 3); b.fromBufferAttribute(p, f * 3 + 1); c.fromBufferAttribute(p, f * 3 + 2);
      b.sub(a); c.sub(a); b.cross(c); const l = b.length() || 1;
      fn[f * 3] = b.x / l; fn[f * 3 + 1] = b.y / l; fn[f * 3 + 2] = b.z / l;
    }
    const map = new Map();
    for (let i = 0; i < cnt; i++) {
      const k = Math.round(p.getX(i) * 1e4) + ',' + Math.round(p.getY(i) * 1e4) + ',' + Math.round(p.getZ(i) * 1e4);
      let arr = map.get(k); if (!arr) map.set(k, arr = []); arr.push(i);
    }
    const nrm = new Float32Array(cnt * 3), ca = Math.cos(angle);
    for (const arr of map.values()) {
      for (const i of arr) {
        const fi = (i / 3) | 0; let x = 0, y = 0, z = 0;
        for (const j of arr) {
          const fj = (j / 3) | 0;
          if (fn[fi * 3] * fn[fj * 3] + fn[fi * 3 + 1] * fn[fj * 3 + 1] + fn[fi * 3 + 2] * fn[fj * 3 + 2] >= ca) { x += fn[fj * 3]; y += fn[fj * 3 + 1]; z += fn[fj * 3 + 2]; }
        }
        const l = Math.hypot(x, y, z) || 1;
        nrm[i * 3] = x / l; nrm[i * 3 + 1] = y / l; nrm[i * 3 + 2] = z / l;
      }
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    return g;
  }
  // Smooth lathe from a profile [[radius, y], ...] ordered bottom → top (outward normals).
  function lathe(key, pts, seg = 40, smooth = 5) {
    const sg = sN(seg, 10), sm = smooth ? Math.max(2, Math.round(smooth * LODK)) : 0;
    return gx('L' + key + '@' + sg + '_' + sm, () => {
      let v = pts.map(p => new THREE.Vector2(p[0], p[1]));
      if (sm) v = new THREE.SplineCurve(v).getPoints(v.length * sm);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      return seamNormals(new THREE.LatheGeometry(v, sg));
    });
  }
  // Point on a lathe surface at height y and azimuth a (0 = +z): [pos, normal] (profile pts as in lathe()).
  function onLathe(pts, y, a, out = 0) {
    const v = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(pts.length * 12);
    let i = 0; while (i < v.length - 2 && v[i + 1].y < y) i++;
    const p0 = v[i], p1 = v[i + 1], t = clamp((y - p0.y) / ((p1.y - p0.y) || 1e-6), 0, 1), rr = lerp(p0.x, p1.x, t);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, nl = Math.hypot(dx, dy) || 1, nr = dy / nl, ny = -dx / nl;
    const sx = Math.sin(a), cz = Math.cos(a);
    return [[sx * (rr + nr * out), y + ny * out, cz * (rr + nr * out)], [sx * nr, ny, cz * nr]];
  }
  function extrude(key, makeShape, depth, bevel, curveSeg = 10, angle = 0.62) {
    const cs = sN(curveSeg, 3), bs = LODK < 0.8 ? 2 : 3;
    return gx('X' + key + '@' + cs + '_' + bs, () => {
      const g = new THREE.ExtrudeGeometry(makeShape(), {
        depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: bs, curveSegments: cs,
      });
      g.translate(0, 0, -depth / 2);
      return creased(g, angle);
    });
  }
  // Chunky cut-stone boulder: sphere pushed by noise and flattened by a few random planes.
  function rockGeo(seed, fine) {
    const w = fine ? sN(34, 12) : sN(22, 10), h = fine ? sN(24, 8) : sN(15, 7);
    return gx('R' + seed + (fine ? 'f' : '') + '@' + w, () => {
      const g = new THREE.SphereGeometry(1, w, h);
      const rnd = mulberry32(seed * 977 + 13), planes = [];
      for (let i = 0; i < 8; i++) {
        const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u);
        planes.push([s * Math.cos(a), u, s * Math.sin(a), 0.74 + rnd() * 0.16]);
      }
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        v.multiplyScalar(0.93 + 0.2 * fbm3(v.x * 1.7 + seed * 3.1, v.y * 1.7 - seed, v.z * 1.7 + seed * 7.3));
        for (const pl of planes) { const e = v.x * pl[0] + v.y * pl[1] + v.z * pl[2] - pl[3]; if (e > 0) { v.x -= pl[0] * e * 0.88; v.y -= pl[1] * e * 0.88; v.z -= pl[2] * e * 0.88; } }
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }

  // ── Shapes ──
  function heartShape() {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.12, -0.36, -0.56, -0.08, -0.5, 0.2);
    s.bezierCurveTo(-0.44, 0.52, -0.06, 0.56, 0, 0.26);
    s.bezierCurveTo(0.06, 0.56, 0.44, 0.52, 0.5, 0.2);
    s.bezierCurveTo(0.56, -0.08, 0.12, -0.36, 0, -0.5);
    return s;
  }
  // Scalloped membrane wing through finger tips (x mirrored by side sx).
  function wingShape(sx, pts) {
    const s = new THREE.Shape(), P = pts.map(p => [p[0] * sx, p[1]]);
    s.moveTo(P[0][0], P[0][1]);
    s.quadraticCurveTo(P[1][0], P[1][1], P[2][0], P[2][1]);   // leading edge
    for (let i = 3; i < P.length; i += 2) s.quadraticCurveTo(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]);
    s.lineTo(P[0][0], P[0][1]);
    return s;
  }
  // [root, leadCtrl, tip, (ctrl, finger)...]: control points pulled inward make the scallops.
  const BAT_WING = [[0, 0.1], [0.24, 0.36], [0.64, 0.27], [0.58, 0.1], [0.52, -0.05], [0.45, 0.05], [0.37, -0.1], [0.28, -0.01], [0.19, -0.11], [0.1, -0.02], [0, -0.07]];
  const DRAGON_WING = [[0, 0.35], [1.1, 1.55], [2.9, 1.2], [2.55, 0.62], [3.05, 0.1], [2.45, -0.18], [2.35, -0.85], [1.75, -0.55], [1.2, -1.15], [0.7, -0.6], [0.05, -0.45]];

  // ── Rig: Kit + bones + per-part flags, merged into one skinned geometry per mood ──
  class Rig {
    constructor() {
      this.k = new Kit(); this.meta = []; this.bones = []; this.map = {};
      this.cur = 0; this.fxv = [0, 0, 0, 0]; this.mood = 0; this.uvk = null; this.markers = {};
      this.bone('root', -1, [0, 0, 0]);
    }
    bone(name, parent, pos) {
      const i = this.bones.length, p = typeof parent === 'string' ? this.map[parent] : parent;
      this.bones.push({ name, parent: i === 0 ? -1 : (p === undefined || p < 0 ? 0 : p), pos: pos.slice() });
      this.map[name] = i; this.cur = i;
      return this;
    }
    on(name) { const i = this.map[name]; if (i === undefined) throw new Error('bone ' + name); this.cur = i; return this; }
    fx(unlit = 0, gloss = 0, tex = 0, wob = 0) { this.fxv = [unlit, gloss, tex, wob]; return this; }
    uv(u, v) { this.uvk = u ? [u, v ?? u] : null; return this; }
    mark(name, pos) { this.markers[name] = { bone: this.bones[this.cur].name, pos: pos.slice() }; return this; }   // pos in model space
    add(geo, color, pos, rot, scl) { this.k.add(geo, color, pos, rot, scl); this._m(); return this; }
    seg(p0, p1, r, color, r1 = r, sides = 10) { this.k.seg(p0, p1, r, color, r1, sN(sides, 5)); this._m(); return this; }
    push(p, r, s) { this.k.push(p, r, s); return this; }
    pop() { this.k.pop(); return this; }
    _m() { this.meta.push({ b: this.cur, fx: this.fxv, mood: this.mood, uv: this.uvk }); }
    geo(mood) {
      const parts = [], metas = [];
      for (let i = 0; i < this.k.parts.length; i++) {
        const mm = this.meta[i];
        if (mm.mood === 0 || mm.mood === mood) { parts.push(this.k.parts[i]); metas.push(mm); }
      }
      const g = mergeParts(parts), n = g.attributes.position.count;
      const P = g.attributes.position.array, U = g.attributes.uv.array;
      const fx = new Float32Array(n * 4), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      let vo = 0;
      for (let i = 0; i < parts.length; i++) {
        const cnt = parts[i].geo.attributes.position.count, mm = metas[i], f = mm.fx, wf = typeof f[3] === 'function' ? f[3] : null;
        const uf = typeof f[0] === 'function' ? f[0] : null, gf = typeof f[1] === 'function' ? f[1] : null, tf = typeof f[2] === 'function' ? f[2] : null;
        for (let v = vo; v < vo + cnt; v++) {
          fx[v * 4] = uf ? uf(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) : f[0];
          fx[v * 4 + 1] = gf ? gf(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) : f[1];
          fx[v * 4 + 2] = tf ? tf(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) : f[2];
          fx[v * 4 + 3] = wf ? wf(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]) : f[3];
          si[v * 4] = mm.b; sw[v * 4] = 1;
          if (mm.uv) { U[v * 2] *= mm.uv[0]; U[v * 2 + 1] *= mm.uv[1]; }
        }
        vo += cnt;
      }
      const colors=g.attributes.color;
      for(let i=0;i<colors.count;i++){const R=colors.getX(i),G=colors.getY(i),B=colors.getZ(i),Y=R*.25+G*.55+B*.20;if(fx[i*4]<.25&&Math.max(R,G,B)-Math.min(R,G,B)>.12)colors.setXYZ(i,R*.25+Y*.45,G*.25+Y*.40,B*.25+Y*.46);}
      if(this.oldBeast)for(let i=0;i<colors.count;i++){if(fx[i*4]>.85)continue;const R=colors.getX(i),G=colors.getY(i),B=colors.getZ(i),Y=R*.25+G*.55+B*.20;if(Math.max(R,G,B)>.20)colors.setXYZ(i,(R*.36+Y*.64)*.31,(G*.36+Y*.64)*.30,(B*.36+Y*.64)*.34);}
      g.setAttribute('aFx', new THREE.BufferAttribute(fx, 4));
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      g.userData.keep = true;
      return g;
    }
    finish(extra) {
      const moods = new Set(this.meta.map(m => m.mood));
      const gG = this.geo(1), gH = moods.has(1) || moods.has(2) ? this.geo(2) : gG;
      const sphere = gG.boundingSphere.clone(); sphere.radius *= 1.3;
      const box = gG.boundingBox.clone();
      // (pout: the face is the lidded sulky "hıh!" face — m.anim then keeps its eyes open in the wind-up, see there;
      // ownHurt: the model flinches by itself when hit, m.anim leaves its root alone — the knight's placed hooves)
      return Object.assign({ g: [gG, gH], bones: this.bones, markers: this.markers, sphere, box, verts: gG.attributes.position.count, pout: !!this.pout, ownHurt: !!this.ownHurt }, extra);
    }
  }

  // ── Faces (Feza's request: every creature is cute and SMILING, nothing scary) ──
  // mood 1 'grumpy' = MISCHIEVOUS-PLAYFUL: big open eyes whose lower lids are pushed up by the cheeks (smiling eyes),
  //   arched playful brows (one raised), a lopsided closed-mouth grin with a little tongue poking out, soft blush.
  //   No slanted brows, no frown, no fangs, no menacing glow.
  // mood 2 'happy' = OVERJOYED: ^ ^ eyes, big open smile, blush, little hearts.
  const DARK = '#23122e';
  // Open googly eye in its local frame (z = out of the head). o: er, iris, look, lookY, white, skin (cheek-lid colour), glowEye.
  function eyeOpen(r, s, o, cheeky) {
    {const er=o.er;r.fx(0,.1).add(G.rbox(1),'#171820',[0,0,0],[0,0,s*.14],[er*1.75,er*.70,er*.50]);r.fx(.15,.1).add(G.rbox(1),'#a59172',[0,-er*.04,er*.30],[0,0,s*.14],[er*1.05,er*.16,er*.09]);r.fx(0,0);return;}
    const er = o.er, lx = -s * er * 0.12 * (o.look ?? 1), ly = -er * (o.lookY ?? 0.08);
    if (o.glowEye) {   // warm, friendly glowing eye (golem): soft glow ball, big round dark pupil, two catchlights
      r.fx(1, 0).add(G.sphere(20, 14), hdr(o.glowEye, 1.9), [0, 0, 0], null, [er, er * 1.04, er * 0.55]);
      r.fx(0, 1).add(G.sphere(14, 10), '#2a1606', [lx * 0.5, ly * 0.5, er * 0.44], null, [er * 0.52, er * 0.58, er * 0.2]);
      r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 2), [lx * 0.5 - er * 0.17, ly * 0.5 + er * 0.2, er * 0.58], null, er * 0.15);
      r.add(G.sphere(8, 6), hdr('#ffffff', 1.6), [lx * 0.5 + er * 0.15, ly * 0.5 - er * 0.17, er * 0.56], null, er * 0.075);
      r.fx(0, 0);
      return;
    }
    r.fx(0, 1).add(G.sphere(24, 16), o.white || '#fbfbff', [0, 0, 0], null, [er, er * 1.1, er * 0.62]);
    r.add(G.sphere(20, 14), o.iris || '#4a2c1a', [lx, ly, er * 0.4], null, [er * 0.66, er * 0.72, er * 0.3]);
    r.add(G.sphere(16, 12), '#120a18', [lx * 1.08, ly * 1.08, er * 0.5], null, [er * 0.42, er * 0.47, er * 0.23]);
    r.fx(1, 0).add(G.sphere(10, 8), hdr('#ffffff', 1.7), [lx - er * 0.2, ly + er * 0.25, er * 0.64], null, er * 0.19);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.4), [lx + er * 0.17, ly - er * 0.19, er * 0.6], null, er * 0.09);
    if (cheeky && o.skin) {   // cheek pushes the lower lid up → the eye's lower edge curves like a smile
      r.fx(o.skinFx ?? 0, 0).add(G.sphere(20, 12), o.skin, [0, -er * 1.04, er * 0.08], null, [er * 1.22, er * 0.58, er * 0.68]);
    }
    r.fx(0, 0);
  }
  function eyeClosed(r, o) {   // ^ happy closed eye
    const er = o.er, arc = PI * 0.8;
    r.fx(o.glowEye ? 1 : 0, 0.3).add(G.torus(arc, 0.34, 18), o.glowEye ? hdr(o.glowEye, 2.0) : (o.happyCol || DARK),
      [0, -er * 0.34, er * 0.1], [0, 0, (PI - arc) / 2], [er * 0.92, er * 0.88, er * 0.7]);
    r.fx(0, 0);
  }
  // Two rounded buck teeth (mole, dragon) hanging just below y = 0 in the mouth frame.
  function buckTeeth(r, mw, o) {
    const w = mw * (o.buckW ?? 0.17), h = mw * (o.buckH ?? 0.2);
    r.fx(0, 0.8);
    for (const s of [-1, 1]) r.add(G.rbox(2), o.toothCol || '#ffffff', [s * w * 0.56, -h * 0.45, mw * 0.06], null, [w, h, w * 0.55]);
    r.fx(0, 0);
  }
  // Mischievous grin: a lopsided ∪ line (one corner higher, with a dimple) and a little tongue poking out.
  function smirk(r, mw, o) {
    mw *= o.smirkK ?? 1.3;
    const arc = PI * 0.6, sk = o.smirk ?? 0.26, mc = o.mouthCol || DARK, cy = mw * 0.3, rx = mw * 0.5, ry = mw * 0.44;
    r.fx(0, 0.3).add(G.torus(arc, 0.4, 20), mc, [0, cy, 0], [0, 0, -PI / 2 - arc / 2 + sk], [rx, ry, mw * 0.4]);
    const ca = -PI / 2 + arc / 2 + sk;   // raised corner
    r.add(G.sphere(10, 8), mc, [Math.cos(ca) * rx * 1.02, cy + Math.sin(ca) * ry + mw * 0.03, 0], null, mw * 0.075);
    if (o.buck) { r.push([0, cy - ry + mw * 0.02, 0]); buckTeeth(r, mw, o); r.pop(); }
    if (!o.noTongue) {
      const tx = o.buck ? mw * 0.3 : -mw * 0.1;
      r.fx(0, 0.6).add(G.sphere(14, 10), o.tongue || '#ff6f9a', [tx, cy - ry - mw * 0.07 + (o.buck ? mw * 0.05 : 0), mw * 0.05], [0, 0, o.buck ? -0.3 : 0.25], [mw * 0.17, mw * 0.14, mw * 0.09]);
    }
    r.fx(0, 0);
  }
  // Overjoyed big open smile (tongue inside, soft top teeth or buck teeth).
  function smile(r, mw, o) {
    r.fx(0, 0.5).add(G.hemi(24), o.mouthIn || '#6a1f3c', [0, mw * 0.1, 0], [PI, 0, 0], [mw * 0.56, mw * 0.5, mw * 0.3]);
    r.add(G.sphere(14, 10), '#ff7fa4', [0, -mw * 0.22, mw * 0.1], null, [mw * 0.3, mw * 0.14, mw * 0.14]);
    if (o.buck) { r.push([0, mw * 0.1, mw * 0.08]); buckTeeth(r, mw * 0.8, o); r.pop(); }
    else if (!o.noTeeth) r.fx(0, 0.8).add(G.rbox(2), '#ffffff', [0, mw * 0.05, mw * 0.14], null, [mw * 0.7, mw * 0.11, mw * 0.14]);
    r.fx(0, 0);
  }
  function blush(r, er, o, k = 1) {
    // Rosy cheek patches belonged to the former children's creatures.
    r.fx(0, 0);
  }
  // ── Round 4: the dairy creatures' "ekşi" (sour) face = the funny 😜 face: one eye squeezed into a > squint, the other wide
  // open, a lopsided open grin with the tongue stuck out over the lip. Silly, never a frown, never gross. ──
  // Squeezed eye in the eye frame (z = out of the head; the surface is at about z = inset): a rounded > chevron pointing to
  // the nose (side s) and a tiny crinkle line at its outer corner (o.squintCheek: the cheek pushed up under it too).
  function squintEye(r, s, o, inset) {
    const er = o.er, t = er * (o.squintT ?? 0.17), z = inset + t * 0.35, c = o.squintCol || DARK;
    const tip = [-s * er * 0.46, er * 0.04, z + er * 0.04], a = [s * er * 0.6, er * 0.5, z - er * 0.04], b = [s * er * 0.6, -er * 0.36, z - er * 0.04];
    r.fx(0, 0.3).seg(a, tip, t, c, t, 8).seg(b, tip, t, c, t, 8);
    for (const p of [tip, a, b]) r.add(G.sphere(10, 8), c, p, null, t);
    r.seg([s * er * 1.0, er * 0.72, z - er * 0.14], [s * er * 1.22, er * 0.96, z - er * 0.24], t * 0.62, c, t * 0.5, 6);
    if (o.squintCheek && o.skin) r.fx(o.skinFx ?? 0, 0).add(G.sphere(18, 12), o.skin, [s * er * 0.1, -er * 0.95, z - er * 0.26], null, [er * 1.0, er * 0.34, er * 0.3]);
    r.fx(0, 0);
  }
  // Lopsided open grin (the corner on the squint side sq pulled up) with a round pink tongue stuck out over the lower lip.
  function sourMouth(r, mw, o, sq) {
    r.fx(0, 0.5).add(G.hemi(22), o.mouthIn || '#6a1f3c', [0, mw * 0.1, 0], [PI, 0, -0.2 * sq], [mw * 0.5, mw * 0.38, mw * 0.26]);
    r.fx(0, 0.8).add(G.rbox(2), '#ffffff', [-sq * mw * 0.04, mw * 0.06, mw * 0.16], [0, 0, -0.2 * sq], [mw * 0.5, mw * 0.08, mw * 0.1]);
    const tx = sq * mw * 0.1;
    r.fx(0, 0.7).add(G.sphere(16, 12), o.tongue || '#ff6f9a', [tx, -mw * 0.25, mw * 0.2], [0.55, 0, 0.18 * sq], [mw * 0.24, mw * 0.29, mw * 0.13]);
    r.fx(0, 0.4).add(G.sphere(8, 6), o.tongueD || '#e8487e', [tx + sq * mw * 0.01, -mw * 0.28, mw * 0.31], [0.55, 0, 0.18 * sq], [mw * 0.028, mw * 0.18, mw * 0.03]);
    r.fx(0, 0);
  }
  // ── Round 5: the townsfolk's sulky "hıh!" face (o.pout): big eyes glancing to the side under heavy LEVEL upper lids (sulky and
  // bored, never slanted), round puffed-out cheeks with a rosy blush, a small pursed pout pushed to one side. Never a frown. ──
  // Eye cap covering the top share `lid` of a unit eyeball (the upper lid; open at the bottom).
  function lidGeo(lid) {
    const w = sN(24, 12), h = sN(10, 5), th = Math.acos(clamp(1 - 2 * lid, -0.95, 0.95));
    return gx('lid' + lid.toFixed(2) + '@' + w, () => new THREE.SphereGeometry(1, w, h, 0, TAU, 0, th));
  }
  // Sulky eye in the eye frame (z = out of the head): the googly eye with its iris looking aside (o.glance −1 … 1, + = the model's
  // left), the skin-coloured lid over its top share o.lid (just down to the iris: the whole iris stays round) and a thin soft
  // dark-brown lash line along the lid's edge, which droops a little toward the outer corner (o.lidDroop: bored-pouty; lower at
  // the nose would be cross). From the gameplay camera above, a heavier lid and a thick near-black lash merged with the brows
  // into one heavy bar over half-covered eyes: a scowl.
  const LASH = '#5a2e1e';
  function sulkEye(r, s, o) {
    const er = o.er, g = o.glance ?? 0.7, lx = er * 0.3 * g + s * er * 0.04, ly = -er * 0.1, lid = o.lid ?? 0.24;
    r.fx(0, 1).add(G.sphere(24, 16), o.white || '#fbfbff', [0, 0, 0], null, [er, er * 1.1, er * 0.62]);
    r.add(G.sphere(20, 14), o.iris || '#4a2c1a', [lx, ly, er * 0.38 - Math.abs(lx) * 0.1], null, [er * 0.64, er * 0.7, er * 0.3]);
    r.add(G.sphere(16, 12), '#120a18', [lx * 1.08, ly * 1.08, er * 0.48 - Math.abs(lx) * 0.1], null, [er * 0.4, er * 0.45, er * 0.23]);
    r.fx(1, 0).add(G.sphere(10, 8), hdr('#ffffff', 1.7), [lx - er * 0.18, ly + er * 0.16, er * 0.62], null, er * 0.17);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.4), [lx + er * 0.16, ly - er * 0.2, er * 0.58], null, er * 0.08);
    const k = 1.08, c = 1 - 2 * lid, sn = Math.sqrt(1 - c * c);
    r.push([0, 0, 0], [0, 0, -s * (o.lidDroop ?? 0.12)]);
    r.fx(o.skinFx ?? 0, 0.2).add(lidGeo(lid), o.lidCol || o.skin, [0, 0, 0], null, [er * k, er * 1.1 * k, er * 0.62 * k * 1.06]);
    r.fx(0, 0.3).add(G.torus(PI, 0.1, 16), o.lashCol || LASH, [0, er * 1.1 * k * c, er * 0.03], [PI / 2, 0, 0], [er * k * sn * 1.03, er * 0.66 * k * sn * 1.06, er * 0.7]);
    r.pop().fx(0, 0);
  }
  // A round puffed-out cheek (frame on the head surface, z = out) with a rosy blush on its front.
  function puffCheek(r, er, o) {
    r.fx(o.skinFx ?? 0, 0.2).add(G.sphere(18, 12), o.cheekCol || o.skin, [0, 0, -er * 0.12], null, [er * 0.86, er * 0.72, er * 0.62]);
    r.push([0, er * 0.04, er * 0.48]); blush(r, er, o, 0.86); r.pop();
  }
  // Pursed "hıh!" lips pushed out and to one side (o.poutX, in mouth widths): two soft rosy lobes and a little dark crease.
  function poutMouth(r, mw, o) {
    const x = (o.poutX ?? -0.14) * mw, lc = col(o.lipCol || '#e8687e'), ll = mixc(lc, '#ffffff', 0.14);
    r.fx(0, 0.75).add(G.sphere(16, 12), lc, [x, mw * 0.1, mw * 0.08], [0, 0, 0.12], [mw * 0.36, mw * 0.19, mw * 0.22]);
    r.add(G.sphere(16, 12), ll, [x + mw * 0.015, -mw * 0.1, mw * 0.1], [0, 0, -0.06], [mw * 0.32, mw * 0.19, mw * 0.23]);
    r.fx(0, 0.3).add(G.sphere(10, 6), o.mouthCol || '#6a1f3c', [x, mw * 0.005, mw * 0.27], [0, 0, 0.04], [mw * 0.24, mw * 0.035, mw * 0.06]);
    r.fx(0, 0);
  }
  const heartGeo = () => extrude('heart', heartShape, 0.06, 0.035, 14);
  // Full face on a roughly spherical head (centre c, radius R): mischievous (mood 1) + overjoyed (mood 2) parts,
  // plus 'eyes' (blink / giggle squint), 'brow' and 'joy' (hearts) bones.
  // o: bone, tilt, ex, ey, er, iris, skin, browCol, browY, browW, browRaise, browSide, browTilt (+ = inner ends up; the pout
  //    face lifts them a little so the sulk never reads as a frown), browLift (pout: the brows sit this much (× er) higher, clear
  //    of the lids — seen from above, brows on the lid merge into one heavy scowling bar), mouthY, mouthW, mc/mR/mTilt (mouth
  //    sphere), mouthBone, smirk, noTongue, buck, noMouth (the builder adds its own, e.g. a beak), blushX/blushY, heartX/heartY/heartS…
  function face(r, c, R, o) {
    const er = o.er, ex = o.ex, ey = o.ey, tilt = o.tilt ?? 0.25, eu = new THREE.Euler(-tilt, 0, 0), C = new THREE.Vector3(...c);
    const inset = o.inset ?? er * 0.3;
    const pe = onSphere(ex, ey, R, inset)[0], ec = new THREE.Vector3(0, pe[1], pe[2]).applyEuler(eu).add(C);
    const pb = onSphere(0, ey + er * 1.3, R)[0], bc = new THREE.Vector3(pb[0], pb[1], pb[2]).applyEuler(eu).add(C);
    r.bone('eyes', o.bone, [0, ec.y, ec.z]);
    r.bone('brow', o.bone, [0, bc.y, bc.z]);
    r.bone('joy', o.bone, [c[0], c[1] + R * 0.7, c[2]]);
    const mc = o.mc || c, mR = o.mR || R, mt = o.mTilt ?? tilt;
    const mw = o.mouthW ?? er * 1.2, my = o.mouthY ?? (ey - er * 1.55);
    let mBone = o.mouthBone || o.bone;
    // (o.mouthPivot: the mouth rides on its own bone 'mouth' pivoting at its centre — the boss anims stretch it into an "O" or a
    // wide smile through s.mouthO / s.mouthW, see build())
    if (o.mouthPivot && !o.noMouth) {
      r.push(mc, [-mt, 0, 0]);
      const mp = new THREE.Vector3(...onSphere(0, my, mR, o.mInset ?? 0)[0]).applyMatrix4(r.k.top()).toArray();
      r.pop(); r.bone('mouth', mBone, mp); mBone = 'mouth';
    }
    // Bone names are an animation contract. Their former cheerful decoration is absent.
    if(o.pout){r.pout=true;for(const side of [-1,1])r.bone(side>0?'cheekL':'cheekR',o.bone,[c[0]+side*ex,c[1]+ey-er,c[2]+R*.8]);}
    r.mood=0;
    r.on('eyes').push(c,[-tilt,0,0]);
    for(const side of [-1,1]){
      const [p,q]=onSphere(side*ex,ey,R,inset);r.push(p,q);
      r.fx(0,.1).add(G.rbox(1),'#14151a',[0,0,0],[0,0,side*.24],[er*1.95,er*.76,er*.47]);
      r.fx(1,.2).add(G.rbox(1),hdr(o.glowEye||'#c34030',1.65),[0,-er*.02,er*.30],[0,0,side*.24],[er*1.35,er*.16,er*.08]);
      r.pop();
    }r.pop();
    r.on('brow').push(c,[-tilt,0,0]);
    for(const side of [-1,1]){const [p,q]=onSphere(side*ex,ey+er*.95,R,-er*.1);r.push(p,q).fx(0,.25).add(G.rbox(2),'#27232a',[0,0,er*.1],[0,0,side*.35],[er*1.75,er*.28,er*.3]).pop();}r.pop();
    if(!o.noMouth){r.on(mBone).push(mc,[-mt,0,0]);const [p,q]=onSphere(0,my,mR,o.mInset||0);r.push(p,q);
      r.fx(0,.1).add(G.rbox(1),'#150c13',[0,0,0],null,[mw*1.35,mw*.24,mw*.19]);
      for(const side of [-1,1])r.fx(0,.35).add(G.cone(8),'#b6ad97',[side*mw*.43,-mw*.07,mw*.15],[0,0,PI],[mw*.12,mw*.36,mw*.10]);
      r.pop().pop();
    }r.mood=0;r.fx(0,0);
  }
  const GOLD = '#ffc94a';
  // (gl: surface — 2 = polished metal (default); the dairy elites pass 1, a glossy painted gold that stays bright in the kefir
  // valley's soft, pale environment light, where metal mirrored it as a dull olive)
  function crown(r, p, s, gem = '#ff5fa8', gl = 2) {
    const gc = gl === 2 ? GOLD : '#ffc436';
    r.push(p, [-0.12, 0, 0], s).fx(0, gl);
    r.add(G.cyl(1, 0.9, 20), gc, [0, 0.1, 0], null, [0.2, 0.2, 0.2]);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU;
      r.add(G.cone(8), gc, [Math.sin(a) * 0.17, 0.27, Math.cos(a) * 0.17], null, [0.06, 0.18, 0.06]);
      r.add(G.sphere(8, 6), gc, [Math.sin(a) * 0.17, 0.37, Math.cos(a) * 0.17], null, 0.035);
    }
    r.fx(0.5, 1).add(G.octa(), hdr(gem, 1.4), [0, 0.1, 0.2], null, [0.06, 0.08, 0.04]);
    r.pop().fx(0, 0);
  }
  // Cone from base point along dir (length len, base radius rad).
  function cone(r, base, dir, len, rad, color, seg = 10) {
    const d = new THREE.Vector3(...dir).normalize();
    r.add(G.cone(seg), color, [base[0] + d.x * len / 2, base[1] + d.y * len / 2, base[2] + d.z * len / 2], qy(d.x, d.y, d.z), [rad, len, rad]);
  }
  // Soft plush spike: a shorter cone with a rounded ball tip (nothing sharp).
  function softSpike(r, base, dir, len, rad, color, seg = 12) {
    const d = new THREE.Vector3(...dir).normalize();
    cone(r, base, dir, len * 0.8, rad, color, seg);
    r.add(G.sphere(12, 8), color, [base[0] + d.x * len * 0.62, base[1] + d.y * len * 0.62, base[2] + d.z * len * 0.62], null, rad * 0.42);
  }
  // Point on an ellipsoid (centre c, radii a) at polar angle phi from +y and azimuth th (0 = +z): [pos, normal].
  function onEll(c, a, phi, th) {
    const sx = Math.sin(phi) * Math.sin(th), sy = Math.cos(phi), sz = Math.sin(phi) * Math.cos(th);
    return [[c[0] + a[0] * sx, c[1] + a[1] * sy, c[2] + a[2] * sz], [sx / a[0], sy / a[1], sz / a[2]]];
  }

  // ════════════════ Character builders (r = Rig, o = {variant, elite}) ════════════════
  const JOLE = {
    green: ['#45c963', '#b0eb98', '#168a50'], pink: ['#e85aa3', '#f7b3d8', '#b8266f'],
    blue: ['#3f94ec', '#a6d4f7', '#1f4fc4'], purple: ['#9466ec', '#d2bdf7', '#5a31bf'],
  };
  // (JOLE.lava: glowing magma jelly of the volcano — hot yellow core at the bottom, floating dark basalt flakes, ember bubbles)
  JOLE.lava = ['#ff8a1c', '#ffd84a', '#e8401a'];
  // (JOLE.muhallebi, Round 4 kefir valley: a wobbly milk pudding turned out of a fluted mould — glossy, milky ivory, 8 soft flutes
  // (smoothed where the face is), cinnamon dusted only on its top with a few pistachio crumbs and mint, a little caramel pool
  // around its foot; the dairy creatures' funny sour face)
  JOLE.muhallebi = ['#fff2da', '#fffcf2', '#f0d2a0'];
  const JOLE_GP = [[0, 0], [0.39, 0], [0.5, 0.035], [0.545, 0.12], [0.535, 0.24], [0.49, 0.34], [0.462, 0.45], [0.428, 0.55], [0.37, 0.65], [0.298, 0.72], [0.2, 0.79], [0.09, 0.835], [0, 0.86]];
  // the pudding's profile: a little foot rim, then the gumdrop the face is fitted to, a flatter top
  const MH_P = [[0, 0], [0.42, 0], [0.55, 0.014], [0.578, 0.05], [0.562, 0.086], [0.538, 0.11], [0.546, 0.17], [0.532, 0.26], [0.495, 0.35],
    [0.464, 0.45], [0.43, 0.55], [0.37, 0.65], [0.3, 0.72], [0.21, 0.785], [0.1, 0.83], [0, 0.846]];
  // flute strength at height y and azimuth a (0 at the base and the top; soft at the front, where the face sits)
  const mhFlute = (y, a) => smooth01((y - 0.1) / 0.08) * (1 - smooth01((y - 0.6) / 0.2)) * (1 - 0.78 * Math.exp(-((a / 0.62) ** 4)) * smooth01((y - 0.12) / 0.1));
  const mhGroove = a => Math.pow(Math.abs(Math.sin(4 * a)), 4);          // 1 in the middle of each of the 8 narrow grooves
  const mhRib = a => 0.35 - mhGroove(a);                                   // broad round ridges +, narrow grooves − (a ridge at each side)
  function mhFluteGeo() {
    const sg = sN(96, 64), sm = Math.max(2, Math.round(4 * LODK));
    return gx('mhFlute@' + sg + '_' + sm, () => {
      const v = new THREE.SplineCurve(MH_P.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(MH_P.length * sm);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      const g = new THREE.LatheGeometry(v, sg), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), k = 1 + 0.15 * mhRib(a) * mhFlute(y, a);
        p.setXYZ(i, x * k, y, z * k);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  function buildJole(r, o) {
    const lava = o.variant === 'lava', mh = o.variant === 'muhallebi';
    let [base, light, deep] = (JOLE[o.variant] || JOLE.green).map(col);
    if (o.elite) { base = rich(base, 1.3, 0.9); deep = rich(deep, 1.3, 0.8); light = rich(light, 1.2, 0.95); }
    const H = 0.86 * 0.9;
    r.bone('body', 'root', [0, 0, 0]);
    r.push([0, 0, 0], null, [1.08, 0.9, 1.08]);
    const wob = (x, y) => smooth01((y - 0.05) / 0.62);
    const GP = mh ? MH_P : JOLE_GP;
    const body = mh ? mhFluteGeo() : lathe('gumdrop', GP, 48);
    if (lava) {   // molten: partly self-lit, white-hot at the bottom, deep orange-red on top
      // self-lit amount per vertex: glowing hot at the bottom, a glossy lit skin on top (keeps it saturated, not pastel)
      r.fx((x, y) => 0.55 + 0.35 * smooth01((0.45 - y) / 0.4), 0, 0, wob).add(body, vgrad(0, 0.8, [[0, hdr('#ffbc24', 1.4)], [0.3, hdr('#ff9616', 1.12)], [0.65, hdr('#ff7a16', 0.98)], [1, hdr('#ff6a1a', 0.9)]]));
    } else if (mh) {   // glossy milky pudding: ivory, a little warmer in the flutes' grooves, a light cinnamon dusting only on its top
      const g = vgrad(0, 0.76, [[0, deep], [0.22, base], [1, light]]), cin = col('#b87444'), grooveC = col('#e8c088'), out = new THREE.Color();
      r.fx(0, 0.55, 0, wob).add(body, (x, y, z) => {
        const yp = y / 0.9, a = Math.atan2(x, z), gr = mhGroove(a) * mhFlute(yp, a);
        out.copy(g(x, yp, z)).lerp(grooveC, gr * 0.85);
        const n = fbm3(x * 16, yp * 16, z * 16);
        return out.lerp(cin, smooth01((yp - 0.72) / 0.07) * (0.14 + 0.5 * smooth01((n - 0.5) / 0.12)));
      });
    } else r.fx(0, 0, 0, wob).add(body, vgrad(0, 0.8, [[0, deep], [0.45, base], [1, mixc(base, light, 0.4)]]));
    // painted gloss highlights + tiny bubbles (they wobble with the surface)
    r.fx(1, 0, 0, wob);
    { const [p, n] = onLathe(GP, 0.6, -0.72, mh ? 0.026 : 0.004); r.add(G.sphere(14, 10), hdr(lava ? '#fff4d8' : '#ffffff', 1.3), p, qz(...n, 0.9), [0.13, 0.045, 0.015]); }
    { const [p, n] = onLathe(GP, 0.45, -0.98, mh ? 0.02 : 0.004); r.add(G.sphere(10, 8), hdr('#ffffff', 1.25), p, qz(...n), [0.03, 0.03, 0.01]); }
    if (lava) {
      r.fx(1, 0, 0, wob);   // ember bubbles glowing just under the skin
      for (const b of [[0.16, 1.1, 0.035], [0.26, 1.9, 0.028], [0.13, -2.4, 0.03], [0.34, 0.9, 0.022], [0.22, -1.5, 0.025], [0.52, 2.6, 0.022]]) {
        const [p, n] = onLathe(GP, b[0], b[1], -b[2] * 0.3);
        r.add(G.sphere(10, 8), hdr('#fff0a0', 1.9), p, qz(...n), [b[2], b[2], b[2] * 0.6]);
      }
      // a little flickering flame tuft on top (like a birthday candle)
      const fw = (x, y) => smooth01((y - 0.72) / 0.25);
      r.fx(1, 0, 0, fw);
      const fl = vgrad(0.7, 1.05, [[0, hdr('#fff4c0', 2.0)], [0.35, hdr('#ffc23a', 1.6)], [0.7, hdr('#ff7a1c', 1.35)], [1, hdr('#ff4a2a', 1.2)]]);
      r.add(lathe('flame', FLAME_P, 28, 3), fl, [0, 0.7, -0.03], [-0.25, 0, 0.12], [0.2, 0.4, 0.2]);
      r.add(lathe('flame', FLAME_P, 28, 3), fl, [0.08, 0.7, -0.05], [-0.3, 0, -0.55], [0.11, 0.22, 0.11]);
      r.add(lathe('flame', FLAME_P, 28, 3), fl, [-0.07, 0.7, -0.06], [-0.35, 0, 0.6], [0.09, 0.18, 0.09]);
    } else if (mh) {   // cinnamon flecks + pistachio crumbs sprinkled on the top only
      r.fx(0, 0.2, 0, wob);
      const CIN = ['#7a4222', '#8e5230', '#6a3818', '#9c6034'];
      for (let i = 0; i < 56; i++) {
        const y = 0.73 + 0.11 * hash3(i, 7, 1), a = hash3(i, 3, 9) * TAU, s2 = 0.006 + 0.008 * hash3(i, 5, 2);
        const [p, n] = onLathe(GP, y, a, 0.002); r.add(G.sphere(8, 6), CIN[i & 3], p, qz(...n, a), [s2 * 1.4, s2, s2 * 0.35]);
      }
      r.fx(0, 0.5, 0, wob);
      for (let i = 0; i < 6; i++) {
        const y = 0.7 + 0.12 * hash3(i, 11, 4), a = hash3(i, 13, 6) * TAU, s2 = 0.018 + 0.008 * hash3(i, 2, 8);
        const [p, n] = onLathe(GP, y, a, 0.004); r.add(G.rbox(1), i & 1 ? '#8fc85a' : '#b4d86a', p, qz(...n, a * 3), [s2 * 1.3, s2, s2 * 0.6]);
      }
      // a sprig of two mint leaves on top (a fresh green garnish)
      r.fx(0, 0.6, 0, wob);
      for (const sd of [-1, 1]) {
        r.add(G.sphere(14, 8), sd > 0 ? '#44c464' : '#36b058', [0.035 * sd, 0.862, -0.01], [0.2, sd * 0.5, -sd * 0.28], [0.045, 0.012, 0.085]);
        r.add(G.sphere(8, 4), '#8ee8a0', [0.035 * sd, 0.872, -0.01], [0.2, sd * 0.5, -sd * 0.28], [0.005, 0.004, 0.07]);
      }
      // a glossy caramel pool around its foot (a warm amber ring on the creamy ground), lobed like a real drip of sauce
      r.fx(0, 1, 0, 0);
      const car = vgrad(0.0, 0.02, [[0, '#dc8e32'], [1, '#f4b85a']]);
      r.add(G.cyl(1, 1, 48), car, [0, 0.006, 0], null, [0.635, 0.01, 0.635]);
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + 0.3, rr = 0.6 + 0.03 * hash3(i, 2, 5), s2 = 0.055 + 0.03 * hash3(i, 9, 1);
        r.add(G.sphere(28, 8), car, [Math.sin(a) * rr, 0.008, Math.cos(a) * rr], [0, a, 0], [s2 * 1.5, 0.011, s2]);
      }
      r.fx(1, 0).add(G.sphere(12, 6), hdr('#fff0c8', 1.2), [Math.sin(-0.75) * 0.615, 0.02, Math.cos(-0.75) * 0.615], [0, -0.75, 0], [0.06, 0.004, 0.012]);
    } else {
      r.fx(0, 1, 0, wob);
      for (const b of [[0.16, 1.1, 0.035], [0.26, 1.9, 0.028], [0.13, -2.4, 0.03], [0.34, 0.9, 0.022], [0.22, -1.5, 0.025]]) {
        const [p, n] = onLathe(GP, b[0], b[1], -b[2] * 0.3);
        r.add(G.sphere(10, 8), mixc(light, '#ffffff', 0.35), p, qz(...n), [b[2], b[2], b[2] * 0.6]);
      }
    }
    const iris = lava ? col('#4a1606') : mixc(deep, '#1a0f24', 0.55), brow = lava ? col('#3a0e04') : mixc(deep, '#150a1c', 0.72);
    r.fx(0, 0, 0, wob);
    if (mh) face(r, [0, 0.36, 0], 0.47, dairyFace({ bone: 'body', tilt: 0.42, ex: 0.16, ey: 0.04, er: 0.132, browY: 1.36, mouthY: -0.14, mouthW: 0.15, heartY: 0.75, skin: base }));
    else face(r, [0, 0.36, 0], 0.47, {
      bone: 'body', tilt: 0.42, ex: 0.16, ey: 0.04, er: 0.132, iris, browCol: brow, browY: 1.36, mouthY: -0.14, mouthW: 0.15, heartY: 0.75,
      skin: lava ? hdr('#ff7c16', 1.05) : mixc(base, light, 0.08), skinFx: lava ? 0.6 : 0, mouthCol: lava ? '#4a1004' : undefined, blushCol: lava ? '#ff4f86' : undefined,
    });
    if (o.elite) crown(r.on('body').fx(0, 0, 0, wob), [0, 0.8, -0.04], 0.72, undefined, mh ? 1 : 2);
    r.mark('muzzle', [0, 0.38, 0.5]);
    r.pop();
    if (lava) return { height: H, glowC: col('#ffe27a'), mat: { rough: 0.24, sss: col('#ff9040').multiplyScalar(0.1), rim: '#ffb870', rimK: 0.24, rimP: 2.4, wob: 0.014, wobF: 2.2, wobS: 4 } };
    if (mh) return { height: H, glowC: col('#ff9a5a'), mat: { rough: 0.2, sss: col('#fff2e0').multiplyScalar(0.08), rim: '#ffffff', rimK: 0.32, rimP: 2.2, wob: 0.018, wobF: 2.2, wobS: 5 } };
    return { height: H, glowC: col('#ff5a3a'), mat: { rough: 0.2, sss: mixc(base, '#ffffff', 0.2).multiplyScalar(0.06), rim: mixc(light, '#ffffff', 0.4), rimK: 0.24, rimP: 2.6, wob: 0.012, wobF: 2.2, wobS: 5 } };
  }
  function animJole(m, dt, st, s) {
    const b = m.B.body;
    let sy = 1, sxz = 1, y = 0, z = 0, x = 0, rx = 0;
    const br = Math.sin(s.t * 3.1 + s.ph);
    sy += 0.035 * br; sxz -= 0.02 * br;
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (2.0 + 0.7 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    if (u < 0.18) { const k = Math.sin(PI * u / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; }
    else if (u < 0.82) {
      const k = (u - 0.18) / 0.64; y += Math.sin(PI * k) * 0.28 * A;
      const st2 = Math.abs(Math.cos(PI * k)); sy += 0.16 * st2 * A; sxz -= 0.07 * st2 * A; rx += 0.1 * Math.sin(PI * k) * A;
    } else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.24 * k * A; sxz += 0.15 * k * A; if (!s.landed && A > 0.3) { s.landed = true; s.wobA = 0.045; } }
    if (u < 0.5) s.landed = false;
    if (st.windup >= 0) { const w = st.windup; sy *= 1 - 0.3 * w; sxz *= 1 + 0.2 * w; rx -= 0.2 * w; x += Math.sin(s.t * 70) * 0.018 * w; }
    if (st.attack >= 0) { const k = Math.sin(PI * st.attack); y += 0.32 * k; z += 0.38 * k; sy *= 1 + 0.2 * k; sxz *= 1 - 0.08 * k; rx += 0.32 * k; }
    b.position.set(x, y, z); b.scale.set(sxz, sy, sxz); b.rotation.x = rx;
    s.wobA = damp(s.wobA ?? 0.012, 0.012, 3.5, dt);
    if (st.hurt > 0.5) s.wobA = Math.max(s.wobA, 0.04 * st.hurt);
    m.U.uWob.value.x = s.wobA;
  }

  function buildMantar(r, o) {
    const E = o.elite;
    const capC = E ? '#d81a36' : '#e8383f', capL = E ? '#ec4a4a' : '#f0645a', capD = E ? '#8c0c28' : '#b5202f';
    const stem = '#fff4de', stemD = '#e9cc9c', gill = '#efd2a4', foot = '#d9ae76';
    r.bone('body', 'root', [0, 0.06, 0]);
    r.bone('cap', 'body', [0, 0.66, 0]);
    r.bone('footL', 'root', [0.13, 0.08, 0.02]); r.bone('footR', 'root', [-0.13, 0.08, 0.02]);
    r.bone('armL', 'body', [0.25, 0.36, 0]); r.bone('armR', 'body', [-0.25, 0.36, 0]);
    r.on('body').add(lathe('mStem', [[0, 0.05], [0.19, 0.05], [0.265, 0.1], [0.29, 0.22], [0.28, 0.38], [0.245, 0.52], [0.21, 0.63], [0.19, 0.72], [0, 0.73]], 36),
      vgrad(0.05, 0.72, [[0, stemD], [0.3, stem], [1, stem]]));
    // cap tilted back a little so the camera always sees the face on the stem
    r.on('cap').push([0, 0.66, -0.03], [-0.3, 0, 0]);
    const cg = lathe('mCap', [[0, -0.02], [0.28, -0.035], [0.46, -0.05], [0.53, -0.02], [0.545, 0.04], [0.52, 0.13], [0.45, 0.23], [0.33, 0.31], [0.17, 0.355], [0, 0.365]], 48);
    const cfun = (() => {
      const out = new THREE.Color(), cc = col(capC), cl = col(capL), cd = col(capD), cgl = col(gill), cgd = mixc(gill, '#a8753f', 0.45);
      return (x, y, z) => {
        const ly = y - 0.66;
        if (ly < 0.0 && Math.hypot(x, z) < 0.5) { const a = Math.atan2(z, x); return out.copy(cgl).lerp(cgd, 0.5 + 0.5 * Math.sin(a * 30)); }
        const t = clamp(ly / 0.36, 0, 1);
        return t < 0.35 ? out.copy(cd).lerp(cc, t / 0.35) : out.copy(cc).lerp(cl, (t - 0.35) / 0.65);
      };
    })();
    r.fx(0, 0.1).add(cg, cfun);
    // white dots on the cap (ellipsoid fit of the dome)
    const DOTS = [[0, 0, 0.1], [0.62, 0.3, 0.085], [0.62, 1.55, 0.08], [0.62, 2.8, 0.085], [0.62, 4.05, 0.08], [0.62, 5.3, 0.08],
      [1.12, 0.9, 0.07], [1.12, 2.2, 0.065], [1.12, 3.4, 0.07], [1.12, 4.6, 0.065], [1.12, 5.8, 0.06]];
    r.fx(0, 0.7);
    for (const d of DOTS) {
      const [p, n] = onEll([0, 0.0, 0], [0.53, 0.36, 0.53], d[0], d[1]);
      r.add(G.sphere(14, 8), '#ffffff', p, qz(...n), [d[2], d[2], d[2] * 0.3]);
    }
    if (E) crown(r, [0, 0.33, 0], 0.7);
    r.pop().fx(0, 0);
    r.mark('muzzle', [0, 1.1, 0.05]);   // model space (markers ignore the Kit stack)
    // little feet + nub arms
    r.on('footL').add(G.sphere(14, 10), foot, [0.13, 0.06, 0.07], null, [0.1, 0.065, 0.13]);
    r.on('footR').add(G.sphere(14, 10), foot, [-0.13, 0.06, 0.07], null, [0.1, 0.065, 0.13]);
    r.on('armL').add(G.sphere(12, 8), stem, [0.31, 0.3, 0.03], [0, 0, 0.5], [0.07, 0.11, 0.07]);
    r.on('armR').add(G.sphere(12, 8), stem, [-0.31, 0.3, 0.03], [0, 0, -0.5], [0.07, 0.11, 0.07]);
    face(r, [0, 0.33, 0], 0.285, { bone: 'body', tilt: 0.1, ex: 0.105, ey: 0.03, er: 0.088, iris: '#5a2a18', skin: stem, browCol: '#6a3a24', browY: 1.3, mouthY: -0.1, mouthW: 0.1, heartY: 0.1, heartX: 1.25 });
    return { height: 1.02, glowC: col('#ffb13a'), mat: { rough: 0.58, rimK: 0.2, sss: col('#ffe0c0').multiplyScalar(0.05) } };
  }
  function animMantar(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (7 + 3 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.5);
    const bob = Math.abs(Math.sin(ph)) * 0.05 * k;
    B.body.position.y += bob + Math.sin(s.t * 2.4 + s.ph) * 0.008;
    B.body.rotation.z = Math.sin(ph) * 0.12 * k;
    B.footL.position.y += Math.max(0, Math.sin(ph)) * 0.08 * k; B.footL.position.z += Math.cos(ph) * 0.07 * k;
    B.footR.position.y += Math.max(0, -Math.sin(ph)) * 0.08 * k; B.footR.position.z -= Math.cos(ph) * 0.07 * k;
    B.armL.rotation.z = 0.15 + Math.sin(ph) * 0.3 * k + Math.sin(s.t * 2) * 0.05; B.armR.rotation.z = -0.15 + Math.sin(ph) * 0.3 * k - Math.sin(s.t * 2) * 0.05;
    B.cap.rotation.z = Math.sin(s.t * 1.7 + s.ph) * 0.04 - Math.sin(ph) * 0.06 * k;
    if (st.windup >= 0) {
      const w = st.windup, sh = Math.sin(s.t * 55) * 0.05 * w;
      B.cap.scale.set(1 + 0.22 * w, 1 + 0.12 * w, 1 + 0.22 * w); B.cap.rotation.x = -0.25 * w; B.cap.rotation.z += sh;
      B.body.scale.set(1 + 0.08 * w, 1 - 0.12 * w, 1 + 0.08 * w); B.body.rotation.x = -0.15 * w;
      B.armL.rotation.z = 0.15 + 1.2 * w; B.armR.rotation.z = -0.15 - 1.2 * w;
    }
    if (st.attack >= 0) {
      const a = st.attack, k2 = Math.sin(PI * Math.min(1, a * 1.4));
      B.cap.scale.set(1 - 0.12 * k2, 1 - 0.2 * k2, 1 - 0.12 * k2); B.cap.rotation.x = 0.2 * k2;
      B.body.scale.y = 1 + 0.12 * k2; B.body.rotation.x = 0.12 * k2;
    }
  }

  function buildYarasa(r, o) {
    const E = o.elite;
    const fur = E ? '#6f3fd0' : '#8a62dc', furL = E ? '#a57cf5' : '#b99cf3', furD = E ? '#4a2596' : '#5f3fad', mem = E ? '#7a45d8' : '#9471e0', ear = '#ff9ccb';
    const cy = 0.32;
    r.bone('body', 'root', [0, cy, 0]);
    r.bone('wingL', 'body', [0.2, cy + 0.04, -0.03]); r.bone('wingR', 'body', [-0.2, cy + 0.04, -0.03]);
    r.bone('earL', 'body', [0.12, cy + 0.2, 0]); r.bone('earR', 'body', [-0.12, cy + 0.2, 0]);
    r.bone('feet', 'body', [0, cy - 0.24, 0]);
    const fcol = (() => { const out = new THREE.Color(), a = col(furD), b = col(fur), c = col(furL); return (x, y, z) => {
      out.copy(a).lerp(b, smooth01((y - (cy - 0.28)) / 0.3));
      const belly = smooth01((z - 0.08) / 0.2) * smooth01((cy + 0.12 - y) / 0.2);
      return out.lerp(c, belly * 0.8);
    }; })();
    r.on('body').add(G.sphere(32, 24), fcol, [0, cy, 0], null, [0.28, 0.27, 0.27]);
    for (const t of [[0, 0.27, 0.02, 0.06], [0.05, 0.25, -0.04, 0.05], [-0.05, 0.25, -0.04, 0.05]]) r.add(G.sphere(12, 8), fur, [t[0], cy + t[1], t[2]], null, t[3]);
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'earL' : 'earR');
      cone(r, [0.12 * s, cy + 0.17, 0], [0.42 * s, 1, -0.05], 0.3, 0.1, fur, 12);
      r.fx(0, 0.3); cone(r, [0.125 * s, cy + 0.18, 0.025], [0.42 * s, 1, -0.05], 0.22, 0.062, ear, 12); r.fx(0, 0);
    }
    // scalloped wings with lighter finger ribs
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'wingL' : 'wingR').push([0.2 * s, cy + 0.04, -0.03], [-0.45, 0.25 * s, 0], 1);
      r.fx(0, 0.35).add(extrude('batWing' + s, () => wingShape(s, BAT_WING), 0.014, 0.008), mem, [0, 0, 0]);
      r.fx(0, 0.2);
      for (const f of [[0.64, 0.27], [0.52, -0.05], [0.37, -0.1], [0.19, -0.11]]) r.seg([0.02 * s, 0.06, 0.016], [f[0] * s * 0.98, f[1] * 0.96, 0.016], 0.012, furL, 0.006, 6);
      r.add(G.sphere(8, 6), furD, [0.64 * s, 0.27, 0], null, 0.022);
      r.pop().fx(0, 0);
    }
    r.on('feet');
    for (const s of [-1, 1]) r.add(G.sphere(10, 8), furD, [0.07 * s, cy - 0.27, 0.02], null, [0.045, 0.035, 0.05]);
    face(r, [0, cy, 0], 0.27, { bone: 'body', tilt: 0.4, ex: 0.1, ey: 0.04, er: 0.09, iris: '#5a2a50', skin: mixc(fur, furL, 0.3), browCol: '#3a1c5a', browY: 1.32, mouthY: -0.085, mouthW: 0.085, heartY: 0.55, heartX: 1.1 });
    if (E) crown(r.on('body'), [0, cy + 0.25, -0.02], 0.5);
    r.mark('muzzle', [0, cy - 0.05, 0.3]);
    return { height: 0.62, glowC: col('#ff4a7a'), mat: { rough: 0.62, sss: col('#c9a8ff').multiplyScalar(0.05) } };
  }
  function animYarasa(m, dt, st, s) {
    const B = m.B;
    const fast = 1 + s.mv * 0.5 + (st.attack >= 0 ? 0.6 : 0);
    s.flap += dt * 11 * fast;
    let amp = 0.75, base = 0.1;
    B.body.position.y += Math.sin(s.flap) * 0.025;
    B.body.rotation.x = 0.18 * s.mv;
    if (st.windup >= 0) { const w = st.windup; B.body.rotation.x -= 0.45 * w; B.body.position.z -= 0.12 * w; base += 0.6 * w; amp *= 1 - 0.6 * w; B.body.position.x += Math.sin(s.t * 60) * 0.015 * w; }
    if (st.attack >= 0) { const k = Math.sin(PI * st.attack); B.body.position.z += 0.45 * k; B.body.rotation.x += 0.6 * k; base -= 0.5 * k; }
    const f = Math.sin(s.flap);
    B.wingL.rotation.z = base + f * amp; B.wingR.rotation.z = -(base + f * amp);
    B.wingL.rotation.y = -0.15 * f; B.wingR.rotation.y = 0.15 * f;
    B.earL.rotation.z = -0.1 * f + Math.sin(s.t * 3) * 0.05; B.earR.rotation.z = 0.1 * f - Math.sin(s.t * 3) * 0.05;
    B.feet.rotation.x = 0.3 * Math.sin(s.flap - 1) * 0.5;
  }

  function buildGoblin(r, o) {
    const E = o.elite;
    const skin = E ? '#5cb83c' : '#7cc95a', skinD = E ? '#3f8f2b' : '#5ea844', tunic = E ? '#7a3f9e' : '#8f5a34', tunicD = E ? '#51246e' : '#6a3f22';
    const belt = '#4a2e1a', shoe = '#6b3f22', wood = '#b07a44', woodD = '#7c4f28', ear = '#ffa3a3';
    r.bone('hips', 'root', [0, 0.38, 0]);
    r.bone('body', 'hips', [0, 0.42, 0]);
    r.bone('head', 'body', [0, 0.72, 0]);
    r.bone('earL', 'head', [0.26, 0.97, -0.02]); r.bone('earR', 'head', [-0.26, 0.97, -0.02]);
    r.bone('armL', 'body', [0.23, 0.63, 0]); r.bone('armR', 'body', [-0.23, 0.63, 0]);
    r.bone('legL', 'hips', [0.1, 0.36, 0]); r.bone('legR', 'hips', [-0.1, 0.36, 0]);
    r.bone('club', 'armR', [-0.31, 0.41, 0.11]);
    const fab = texOf('fabric');
    // legs + curly shoes
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'legL' : 'legR');
      r.seg([0.1 * s, 0.36, 0], [0.11 * s, 0.1, 0.02], 0.062, skinD, 0.056, 12);
      r.add(G.sphere(16, 10), shoe, [0.11 * s, 0.065, 0.05], null, [0.085, 0.065, 0.14]);
      r.add(G.sphere(10, 8), shoe, [0.11 * s, 0.09, 0.18], null, 0.04);
    }
    // tunic (fabric texture) + belt with buckle
    r.on('body').fx(0, 0, 1).uv(3, 1);
    r.add(lathe('gTunic', [[0, 0.27], [0.25, 0.27], [0.285, 0.33], [0.265, 0.48], [0.22, 0.62], [0.16, 0.7], [0, 0.72]], 32),
      vgrad(0.27, 0.72, [[0, tunicD], [0.35, tunic], [1, tunic]]));
    r.uv(null).fx(0, 0.3);
    r.add(G.torus(TAU, 0.3, 32), belt, [0, 0.43, 0], [PI / 2, 0, 0], [0.272, 0.272, 0.12]);
    r.fx(0, 2).add(G.rbox(2), GOLD, [0, 0.43, 0.27], null, [0.08, 0.07, 0.03]);
    r.fx(0, 0);
    // arms (club in the right hand, resting on the shoulder)
    r.on('armL').seg([0.23, 0.63, 0], [0.3, 0.42, 0.06], 0.05, skin, 0.045, 10).add(G.sphere(14, 10), skin, [0.31, 0.39, 0.07], null, 0.065);
    r.on('armR').seg([-0.23, 0.63, 0], [-0.3, 0.44, 0.1], 0.05, skin, 0.045, 10).add(G.sphere(14, 10), skin, [-0.31, 0.41, 0.11], null, 0.065);
    {
      const d = new THREE.Vector3(-0.12, 0.85, -0.5).normalize(), q = qy(d.x, d.y, d.z);
      const wcol = (() => { const out = new THREE.Color(), a = col(wood), b = col(woodD); return (x, y, z) => out.copy(a).lerp(b, 0.5 + 0.5 * Math.sin((x * 3 + y * 40 + z * 3))); })();
      r.on('club').fx(0, 0.1).add(lathe('club', [[0, -0.06], [0.036, -0.06], [0.04, 0.0], [0.042, 0.18], [0.07, 0.3], [0.11, 0.42], [0.125, 0.52], [0.112, 0.6], [0.07, 0.655], [0, 0.665]], 18), wcol, [-0.31, 0.41, 0.11], q);
      const kp = new THREE.Vector3(-0.31, 0.41, 0.11).addScaledVector(d, 0.48);
      r.add(G.sphere(8, 6), woodD, [kp.x + 0.1, kp.y, kp.z + 0.04], null, 0.035);
      r.fx(0, 2).add(G.sphere(6, 5), '#c9ccd6', [kp.x - 0.09, kp.y + 0.06, kp.z + 0.06], null, 0.022).fx(0, 0);
    }
    // head: big, egg-ish, pointy ears, bulb nose, hair tuft
    r.on('head').add(G.sphere(40, 28), vgrad(0.66, 1.24, [[0, skinD], [0.45, skin], [1, mixc(skin, '#ffffff', 0.12)]]), [0, 0.95, 0], null, [0.31, 0.29, 0.29]);
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'earL' : 'earR');
      r.add(G.cone(16), skin, [0.42 * s, 1.04, -0.04], [0, 0.25 * s, -s * (PI / 2 - 0.42)], [0.12, 0.42, 0.05]);
      r.fx(0, 0.2).add(G.cone(16), ear, [0.4 * s, 1.035, -0.02], [0, 0.25 * s, -s * (PI / 2 - 0.42)], [0.075, 0.3, 0.03]).fx(0, 0);
    }
    r.on('head').add(G.sphere(18, 12), mixc(skin, skinD, 0.35), [0, 0.9, 0.3], null, [0.075, 0.065, 0.07]);
    for (const t of [[0, 0.3, 0.1], [0.07, 0.24, 0.35], [-0.07, 0.26, -0.3]]) cone(r, [t[0], 0.95 + 0.27, t[0] * 0.2 - 0.02], [t[0] * 3, 1, -0.3], 0.14 + t[1] * 0.1, 0.035, skinD, 8);
    face(r, [0, 0.95, 0], 0.295, { bone: 'head', tilt: 0.34, ex: 0.12, ey: 0.07, er: 0.1, iris: '#7a4a1c', skin: mixc(skin, '#ffffff', 0.06), browCol: '#3a4a22', browY: 1.36, mouthY: -0.13, mouthW: 0.12, heartY: 0.7, heartX: 1.05 });
    if (E) crown(r.on('head'), [0, 1.2, -0.02], 0.75);
    r.on('armR').mark('muzzle', [-0.38, 0.8, -0.1]);
    return { height: 1.22, glowC: col('#ff5a3a'), tex: fab, mat: { rough: 0.55, ns: 0.8 } };
  }
  function animGoblin(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (6 + 5 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4);
    B.legL.rotation.x = Math.sin(ph) * 0.65 * k; B.legR.rotation.x = -Math.sin(ph) * 0.65 * k;
    B.hips.position.y += Math.abs(Math.cos(ph)) * 0.04 * k + Math.sin(s.t * 2.2 + s.ph) * 0.006;
    B.body.rotation.y = Math.sin(ph) * 0.1 * k; B.body.rotation.x = 0.08 * k;
    B.body.scale.y = 1 + Math.sin(s.t * 2.2 + s.ph) * 0.015;
    B.armL.rotation.x = -Math.sin(ph) * 0.5 * k; B.armR.rotation.x = Math.sin(ph) * 0.25 * k + Math.sin(s.t * 1.8) * 0.04;
    B.head.rotation.z = Math.sin(s.t * 1.3 + s.ph) * 0.05; B.head.rotation.x = -Math.cos(ph * 2) * 0.03 * k;
    const tw = Math.max(0, Math.sin(s.t * 0.9 + s.ph * 3) - 0.92) * 8;   // occasional ear twitch
    B.earL.rotation.z = Math.sin(ph * 2) * 0.1 * k + tw * 0.25 * Math.sin(s.t * 40); B.earR.rotation.z = -Math.sin(ph * 2) * 0.1 * k - tw * 0.2 * Math.sin(s.t * 40);
    if (st.windup >= 0) {
      const w = smooth01(st.windup * 1.3);
      B.armR.rotation.x = -2.8 * w; B.club.rotation.x = 2.4 * w; B.armR.rotation.z = -0.25 * w;
      B.body.rotation.x = -0.28 * w; B.head.rotation.x = -0.12 * w; B.hips.position.x += Math.sin(s.t * 50) * 0.01 * st.windup;
      B.armL.rotation.x = -0.6 * w; B.armL.rotation.z = 0.4 * w;
    }
    if (st.attack >= 0) {
      const a = st.attack, hit = smooth01(a / 0.26), back = smooth01((a - 0.36) / 0.64);
      B.armR.rotation.x = lerp(-2.8, -0.9, hit) * (1 - back); B.club.rotation.x = lerp(2.4, 3.0, hit) * (1 - back);
      B.armR.rotation.z = -0.25 * (1 - hit);
      B.body.rotation.x = 0.35 * Math.sin(PI * Math.min(1, a * 1.6)); B.head.rotation.x = 0.1 * hit * (1 - back);
    }
  }

  // ── Köstebek: chubby velvety miner mole with a yellow hard hat + headlamp and a tiny shovel. It burrows:
  // st.burrow 0 = up … 1 = fully underground (the body sinks, its own dirt mound appears and travels with it). ──
  function moundGeo() {
    const w = sN(30, 14), h = sN(16, 8);
    return gx('mound@' + w, () => {
      const g = new THREE.SphereGeometry(1, w, h, 0, TAU, 0, PI * 0.62), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        v.multiplyScalar(0.86 + 0.28 * fbm3(v.x * 2.6 + 3, v.y * 2.6, v.z * 2.6 - 5));
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  function buildKostebek(r, o) {
    const E = o.elite;
    const fur = E ? '#7c4a28' : '#8a5a38', furD = E ? '#4f2c16' : '#5a3720', furL = E ? '#b37a4a' : '#ad7e56', belly = E ? '#dcae80' : '#d0a67c';
    const pink = '#ea86a2', pinkD = '#d06284', nose = '#ff5a90', snout = '#d49c82', hat = '#ecb01a', hatD = '#c97a0a';
    const dirt = '#7a5234', dirtD = '#4e321f', dirtL = '#a47650', steel = '#c9d3e2', wood = '#c08a50', woodD = '#8a5a2c';
    r.bone('body', 'root', [0, 0.02, 0]);
    r.bone('head', 'body', [0, 0.46, 0.05]);
    r.bone('armL', 'body', [0.26, 0.4, 0.08]); r.bone('armR', 'body', [-0.26, 0.4, 0.08]);
    r.bone('footL', 'body', [0.13, 0.05, 0.12]); r.bone('footR', 'body', [-0.13, 0.05, 0.12]);
    r.bone('shovel', 'armR', [-0.33, 0.27, 0.24]);
    r.bone('mound', 'root', [0, 0, 0]);
    // chubby pear body: velvety fur with a light tummy patch
    const bcol = (() => { const out = new THREE.Color(), a = col(furD), b = col(fur), c = col(furL), bl = col(belly); return (x, y, z) => {
      out.copy(a).lerp(b, smooth01((y - 0.0) / 0.28)).lerp(c, smooth01((y - 0.5) / 0.3) * 0.45);
      const bel = smooth01((z - 0.16) / 0.1) * smooth01((0.46 - y) / 0.1) * smooth01((y - 0.07) / 0.1) * smooth01((0.24 - Math.abs(x)) / 0.08);
      return out.lerp(bl, bel * 0.92);
    }; })();
    r.on('body').add(G.sphere(36, 26), bcol, [0, 0.28, 0], null, [0.35, 0.29, 0.32]);
    r.add(G.sphere(10, 8), pink, [0, 0.12, -0.31], null, [0.05, 0.04, 0.06]);   // tiny tail
    // head (no neck: it melts into the body), pink-tan snout, big glossy pink nose
    r.on('head').add(G.sphere(34, 26), vgrad(0.36, 0.8, [[0, fur], [1, mixc(fur, furL, 0.65)]]), [0, 0.56, 0.06], null, [0.25, 0.235, 0.24]);
    r.add(G.sphere(22, 16), snout, [0, 0.49, 0.26], null, [0.125, 0.105, 0.12]);
    r.fx(0, 1).add(G.sphere(20, 14), nose, [0, 0.545, 0.355], null, [0.07, 0.058, 0.058]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.5), [-0.022, 0.572, 0.4], null, [0.018, 0.013, 0.01]);
    r.fx(0, 0.4);
    for (const s of [-1, 1]) r.add(G.sphere(8, 6), '#b83a64', [0.022 * s, 0.527, 0.408], null, [0.011, 0.008, 0.006]);
    r.fx(0, 0);
    // yellow miner's hard hat (tilted back so the eyes stay visible from the camera) with a glowing headlamp
    r.push([0, 0.74, 0.0], [-0.34, 0, 0]);
    r.fx(0, 0.35).add(G.hemi(28), vgrad(0.72, 0.9, [[0, hatD], [0.35, hat], [1, mixc(hat, '#fff0b0', 0.25)]]), [0, 0, 0], null, [0.2, 0.14, 0.21]);
    r.add(G.cyl(1, 1, 28), hatD, [0, 0.004, 0.025], null, [0.25, 0.022, 0.27]);
    r.add(G.torus(PI, 0.2, 20), mixc(hat, '#fff6c8', 0.3), [0, 0.0, 0], [0, PI / 2, 0], [0.205, 0.145, 0.07]);
    r.fx(0, 2).add(G.cyl(1, 1, 16), '#aab4c4', [0, 0.075, 0.2], [PI / 2 - 0.2, 0, 0], [0.05, 0.045, 0.05]);
    r.fx(1, 0).add(G.sphere(14, 10), hdr('#fff0a8', 1.7), [0, 0.08, 0.225], [-0.2, 0, 0], [0.034, 0.034, 0.012]);
    r.pop().fx(0, 0);
    // arms with big pink digging paws; little pink feet
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'armL' : 'armR').seg([0.26 * s, 0.4, 0.08], [0.32 * s, 0.29, 0.2], 0.075, fur, 0.065, 12);
      r.fx(0, 0.2).add(G.sphere(18, 12), pink, [0.33 * s, 0.27, 0.24], [0.3, 0, 0], [0.085, 0.05, 0.095]);
      for (let i = 0; i < 4; i++) r.add(G.sphere(8, 6), pinkD, [0.33 * s + (i - 1.5) * 0.034, 0.26, 0.325], null, [0.022, 0.02, 0.028]);
      r.fx(0, 0);
      r.on(s > 0 ? 'footL' : 'footR').fx(0, 0.2).add(G.sphere(16, 10), pink, [0.13 * s, 0.035, 0.17], null, [0.075, 0.04, 0.1]);
      for (let i = 0; i < 3; i++) r.add(G.sphere(8, 6), pinkD, [0.13 * s + (i - 1) * 0.034, 0.03, 0.26], null, 0.02);
      r.fx(0, 0);
    }
    // tiny shovel resting on the right shoulder (bonks with it)
    {
      const P0 = new THREE.Vector3(-0.33, 0.27, 0.24), d = new THREE.Vector3(-0.1, 0.82, -0.56).normalize(), q = qy(d.x, d.y, d.z);
      const a = P0.clone().addScaledVector(d, -0.1), b = P0.clone().addScaledVector(d, 0.42), bl = P0.clone().addScaledVector(d, 0.52);
      r.on('shovel').fx(0, 0.15).seg([a.x, a.y, a.z], [b.x, b.y, b.z], 0.018, wood, 0.018, 8);
      r.add(G.rbox(2), woodD, [a.x, a.y, a.z], q, [0.08, 0.03, 0.03]);
      r.fx(0, 2).add(G.rbox(2), steel, [bl.x, bl.y, bl.z], q, [0.13, 0.15, 0.024]);
      const tp = P0.clone().addScaledVector(d, 0.6);
      r.add(G.sphere(12, 8), steel, [tp.x, tp.y, tp.z], q, [0.065, 0.05, 0.012]).fx(0, 0);
    }
    face(r, [0, 0.56, 0.06], 0.24, {
      bone: 'head', tilt: 0.36, ex: 0.088, ey: 0.07, er: 0.06, iris: '#3a2210', skin: mixc(fur, furL, 0.4), browCol: '#3a2212', browY: 1.4, browT: 0.42,
      mc: [0, 0.49, 0.26], mR: 0.115, mTilt: 0.12, mouthY: -0.04, mouthW: 0.085, buck: true, buckW: 0.22, buckH: 0.3, noTongue: true,
      blushX: 0.75, blushY: 1.05, heartY: 0.95, heartX: 1.05,
    });
    if (E) crown(r.on('head'), [0, 0.9, -0.08], 0.5);
    r.on('head').mark('muzzle', [0, 0.54, 0.4]);
    // dirt mound with clods (only shown while burrowing; lives on its own bone so it stays on the ground)
    const mcol = (() => { const out = new THREE.Color(), a = col(dirtD), b = col(dirt), c = col(dirtL); return (x, y, z) => {
      const n = fbm3(x * 8, y * 8, z * 8);
      return out.copy(a).lerp(b, clamp(smooth01(y / 0.16) * 0.8 + 0.4 * n - 0.1, 0, 1)).lerp(c, smooth01((y - 0.12) / 0.12) * n * 0.8);
    }; })();
    r.on('mound').fx(0, 0).add(moundGeo(), mcol, [0, -0.08, 0], null, [0.56, 0.32, 0.56]);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + (i % 3) * 0.3, rr = 0.5 + (i % 2) * 0.1, sz = 0.05 + (i % 3) * 0.018;
      r.add(G.sphere(10, 8), i % 4 === 0 ? dirtL : dirt, [Math.sin(a) * rr, sz * 0.4, Math.cos(a) * rr], null, [sz, sz * 0.75, sz]);
    }
    for (const c of [[0.08, 0.2, 0.05, 0.05], [-0.1, 0.18, -0.06, 0.045], [0.02, 0.23, -0.1, 0.04]]) r.add(G.sphere(10, 8), dirtL, [c[0], c[1], c[2]], null, c[3]);
    r.fx(0, 0.4).add(G.dodeca(), '#9ea6b2', [0.3, 0.1, 0.22], [0.3, 0.5, 0], 0.035).add(G.dodeca(), '#b3aa9c', [-0.28, 0.12, -0.2], [0.8, 0.1, 0.4], 0.03).fx(0, 0);
    return { height: 0.9, glowC: col('#ff7a4a'), mat: { rough: 0.72, sss: col('#e8c0a0').multiplyScalar(0.03), rimK: 0.26, rimP: 2.4 } };
  }
  function animKostebek(m, dt, st, s) {
    // turning happy while half dug in → it pops back up to cheer (quickly, not with a jump)
    s.bd = st.dying >= 0 ? damp(s.bd ?? 0, 0, 14, dt) : clamp(st.burrow || 0, 0, 1);
    const B = m.B, bur = s.bd, up = 1 - bur;
    if (s.mv > 0.03) s.walk += dt * (7 + 5 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4) * up, br = Math.sin(s.t * 2.6 + s.ph);
    // waddle + breathing
    B.body.position.y += Math.abs(Math.sin(ph)) * 0.035 * k + br * 0.005;
    B.body.rotation.z = Math.sin(ph) * 0.1 * k;
    B.body.scale.set(1 + 0.018 * br, 1 - 0.012 * br, 1 + 0.018 * br);
    B.footL.position.y += Math.max(0, Math.sin(ph)) * 0.05 * k; B.footL.position.z += Math.cos(ph) * 0.05 * k;
    B.footR.position.y += Math.max(0, -Math.sin(ph)) * 0.05 * k; B.footR.position.z -= Math.cos(ph) * 0.05 * k;
    B.armL.rotation.x = -Math.sin(ph) * 0.45 * k + Math.sin(s.t * 1.9) * 0.04; B.armR.rotation.x = Math.sin(ph) * 0.18 * k;
    B.head.rotation.z = Math.sin(s.t * 1.4 + s.ph) * 0.05;
    const sniff = Math.max(0, Math.sin(s.t * 0.8 + s.ph * 2) - 0.85) * 6.6;   // now and then a happy little sniff
    B.head.rotation.x = Math.sin(s.t * 22) * 0.025 * sniff - 0.04 * sniff;
    if (st.windup >= 0) {   // shovel up high, lean back
      const w = smooth01(st.windup * 1.3);
      B.armR.rotation.x = -2.5 * w; B.shovel.rotation.x = 1.5 * w; B.armR.rotation.z = -0.2 * w;
      B.body.rotation.x = -0.25 * w; B.head.rotation.x = -0.12 * w; B.body.position.x += Math.sin(s.t * 50) * 0.008 * st.windup;
      B.armL.rotation.x = -0.7 * w; B.armL.rotation.z = 0.3 * w;
    }
    if (st.attack >= 0) {   // bonk!
      const a = st.attack, hit = smooth01(a / 0.24), back = smooth01((a - 0.36) / 0.64);
      B.armR.rotation.x = lerp(-2.5, -0.7, hit) * (1 - back); B.shovel.rotation.x = lerp(1.5, 2.1, hit) * (1 - back);
      B.armR.rotation.z = -0.2 * (1 - hit);
      B.body.rotation.x = 0.3 * Math.sin(PI * Math.min(1, a * 1.6)); B.body.position.y += 0.06 * Math.sin(PI * Math.min(1, a * 2));
    }
    // burrowing: dives nose first with a wiggle and sinks; the dirt mound grows, then bumps along while travelling
    if (bur > 0.001) {
      const sink = smooth01(bur);
      B.body.position.y -= sink * 1.04;
      B.body.rotation.x += 0.35 * sink;
      B.body.rotation.z += Math.sin(s.t * 34) * 0.1 * Math.sin(PI * bur);
      if (bur > 0.97) B.body.scale.setScalar(0.0001);
      const ms = smooth01(bur / 0.35), mv = s.mv;
      B.mound.scale.set(ms * (1 + 0.06 * Math.sin(s.t * 11) * mv), ms * (1 + 0.14 * Math.sin(s.t * 16) * mv), ms * (1 + 0.06 * Math.cos(s.t * 11) * mv));
      B.mound.position.y += Math.abs(Math.sin(s.t * 13)) * 0.035 * mv * ms;
      B.mound.rotation.y = Math.sin(s.t * 5 + s.ph) * 0.25;
      if (st.windup >= 0) {   // about to pop up: the mound trembles and swells
        const w = st.windup;
        B.mound.position.x += Math.sin(s.t * 57) * 0.035 * w; B.mound.position.z += Math.cos(s.t * 49) * 0.03 * w;
        B.mound.scale.multiplyScalar(1 + 0.12 * w + 0.05 * Math.sin(s.t * 30) * w);
      }
    } else B.mound.scale.setScalar(0.0001);
  }

  // ── Salyangoz: cute snail — glossy pastel spiral shell, soft body, eye stalks with big smiling eyes, rosy cheeks.
  // Ducks into its shell when hurt (st.hurt). ──
  // The shell is rolled a little to one side (like a real coiled shell) so the swirl also reads from the high gameplay camera.
  const SHELL_C = [0.02, 0.46, -0.14], SHELL_S = [0.28, 0.37, 0.39], SHELL_ROLL = 0.55;
  // Log-spiral coordinate on the shell's side (axis = x): frac() gives the position across a whorl (seam-free).
  function shellS(y, z) {
    const rho = Math.max(1e-3, Math.hypot(y, z)), a = Math.atan2(y, z) + 0.64;
    const phi = ((a % TAU) + TAU) % TAU;
    return { s: phi / TAU - Math.log(rho) / 0.82, rho };
  }
  function shellGeo() {
    const w = LODK < 0.8 ? 64 : 80, h = LODK < 0.8 ? 48 : 60;   // the swirl needs the resolution (vertex-coloured bands)
    return gx('snailShell@' + w, () => {
      const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const S = shellS(v.y, v.z), f = S.s - Math.floor(S.s), dd = Math.min(f, 1 - f);
        const side = smooth01((Math.abs(v.x) - 0.05) / 0.45) * smooth01((S.rho - 0.1) / 0.12);
        const groove = Math.exp(-(dd / 0.09) * (dd / 0.09)) * side;
        const bulge = 1 + 0.07 * Math.sin(PI * f) * side;   // each whorl a little rounded
        v.multiplyScalar(bulge * (1 - 0.1 * groove));
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  function buildSalyangoz(r, o) {
    const E = o.elite;
    let body = col('#f9c77c'), bodyD = col('#e09c55'), bodyL = col('#ffe2ae');
    let shA = col('#f77fb4'), shB = col('#a48cf2'), shL = col('#fff0c4'), shC = col('#ff6fa8');
    if (E) { body = rich(body, 1.2, 0.95); bodyD = rich(bodyD, 1.2, 0.9); shA = rich(shA, 1.25, 0.92); shB = rich(shB, 1.25, 0.9); shC = rich(shC, 1.2, 0.9); }
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('shell', 'body', [0, 0.2, -0.14]);
    r.bone('head', 'body', [0, 0.3, 0.3]);
    r.bone('stalkL', 'head', [0.07, 0.55, 0.3]); r.bone('stalkR', 'head', [-0.07, 0.55, 0.3]);
    const EYE = [[0.14, 0.81, 0.35], [-0.14, 0.81, 0.35]], er = 0.082;
    r.bone('eyeL', 'stalkL', EYE[0]); r.bone('eyeR', 'stalkR', EYE[1]);
    r.bone('joy', 'head', [0, 0.8, 0.3]);
    // soft slug foot (lighter frilly edge below), neck and round head
    const fcol = (() => { const out = new THREE.Color(); return (x, y, z) => out.copy(bodyD).lerp(body, smooth01((y - 0.02) / 0.14)).lerp(bodyL, smooth01((y - 0.3) / 0.25) * 0.5); })();
    r.on('body').fx(0, 0.55).add(G.sphere(32, 20), fcol, [0, 0.1, -0.04], null, [0.25, 0.12, 0.54]);
    r.add(G.sphere(20, 12), fcol, [0, 0.06, -0.48], null, [0.13, 0.07, 0.16]);
    r.on('head').seg([0, 0.12, 0.24], [0, 0.36, 0.31], 0.155, fcol, 0.14, 18);
    r.add(G.sphere(32, 24), fcol, [0, 0.42, 0.32], null, [0.19, 0.18, 0.18]);
    // eye stalks with balls at the tips (the eyes themselves are per mood)
    for (let i = 0; i < 2; i++) {
      const sx = i ? -1 : 1, e = EYE[i];
      r.on(i ? 'stalkR' : 'stalkL').seg([0.065 * sx, 0.54, 0.3], [e[0], e[1] - 0.03, e[2] - 0.01], 0.034, body, 0.026, 10);
      r.on(i ? 'eyeR' : 'eyeL').add(G.sphere(20, 14), body, e, null, er * 0.98);
    }
    // glossy pastel spiral shell: swirl bands + a cream line in each groove
    const shcol = (() => { const out = new THREE.Color(); return (x, y, z) => {
      const dx = x - SHELL_C[0], dy = y - SHELL_C[1], cr = Math.cos(SHELL_ROLL), sr = Math.sin(SHELL_ROLL);
      const lx = (dx * cr + dy * sr) / SHELL_S[0], ly = (-dx * sr + dy * cr) / SHELL_S[1], lz = (z - SHELL_C[2]) / SHELL_S[2];
      const S = shellS(ly, lz), f = S.s - Math.floor(S.s), dd = Math.min(f, 1 - f), side = smooth01((Math.abs(lx) - 0.05) / 0.45);
      if (S.rho < 0.13 && side > 0.5) return out.copy(shC);   // centre of the swirl
      const band = (Math.floor(S.s * 2) & 1) ? shB : shA, hf = S.s * 2 - Math.floor(S.s * 2);
      out.copy(band).lerp(shL, 0.22 * Math.sin(PI * hf));   // each band lighter in its middle (rounded look)
      return out.lerp(shL, smooth01((0.075 - dd) / 0.03) * (0.5 + 0.5 * side));
    }; })();
    r.on('shell').fx(0, 1).add(shellGeo(), shcol, SHELL_C, [0, 0, SHELL_ROLL], SHELL_S);
    // eyes: mischievous (open, brows) / overjoyed (^ ^)
    for (let i = 0; i < 2; i++) {
      const sx = i ? -1 : 1, e = EYE[i], bn = i ? 'eyeR' : 'eyeL';
      r.on(bn).push(e, [-0.5, sx * 0.12, 0]);
      r.mood = 1;
      r.push([0, 0, er * 0.36]); eyeOpen(r, sx, { er, iris: '#4a2a1a', look: 0.7, lookY: 0.02 }, false); r.pop();
      const up = sx > 0 ? er * 0.35 : 0, bA = PI * 0.56;
      r.fx(0, 0.25).add(G.torus(bA, 0.42, 14), '#5a3020', [0, er * 1.02 + up, er * 0.42], [0, 0, (PI - bA) / 2], [er * 0.7, er * (up ? 0.58 : 0.46), er * 0.42]);
      r.mood = 2;
      r.push([0, er * 0.1, er * 0.72]); eyeClosed(r, { er }); r.pop();
      r.mood = 0; r.fx(0, 0);
      r.pop();
    }
    // mouth + rosy cheeks on the head
    const HC = [0, 0.42, 0.32], HR = 0.18;
    r.on('head').push(HC, [-0.3, 0, 0]);
    for (const s of [-1, 1]) { const [p, q] = onSphere(s * 0.115, -0.035, HR, -0.004); r.push(p, q); blush(r, 0.085, { blushCol: '#ff7fa6' }); r.pop(); }
    r.mood = 1; { const [p, q] = onSphere(0, -0.06, HR, 0); r.push(p, q); smirk(r, 0.085, {}); r.pop(); }
    r.mood = 2; { const [p, q] = onSphere(0, -0.05, HR, 0); r.push(p, q); smile(r, 0.125, { noTeeth: true }); r.pop(); }
    r.mood = 0;
    r.pop();
    r.on('joy').push(HC, [-0.3, 0, 0]).fx(0.5, 0.6);
    r.mood = 2;
    for (const s of [-1, 1]) r.add(heartGeo(), '#ff4f93', [s * 0.3, 0.34 + (s > 0 ? 0.05 : 0), 0.05], [-0.25, 0, -s * 0.38], 0.075 * (s > 0 ? 0.8 : 1));
    r.mood = 0; r.pop().fx(0, 0);
    if (E) crown(r.on('shell'), [-0.1, 0.8, -0.14], 0.55);
    r.on('head').mark('muzzle', [0, 0.38, 0.52]);
    return { height: 0.9, glowC: col('#ff7ab0'), mat: { rough: 0.35, sss: col('#ffe2b8').multiplyScalar(0.06), rimK: 0.28 } };
  }
  function animSalyangoz(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (4 + 3 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.5), br = Math.sin(s.t * 2 + s.ph);
    // foot ripple, head bob, wiggly eye stalks
    B.body.scale.set(1, 1 - 0.03 * Math.sin(ph) * k + 0.01 * br, 1 + 0.06 * Math.sin(ph) * k);
    B.head.rotation.x = Math.sin(ph) * 0.06 * k + Math.sin(s.t * 1.6 + s.ph) * 0.04;
    B.head.rotation.z = Math.sin(s.t * 1.1 + s.ph) * 0.06;
    B.stalkL.rotation.z = -0.06 + Math.sin(s.t * 2.3 + s.ph) * 0.13; B.stalkR.rotation.z = 0.06 + Math.sin(s.t * 2.1 + s.ph + 1.7) * 0.13;
    B.stalkL.rotation.x = Math.sin(s.t * 1.7) * 0.08 - 0.1 * k; B.stalkR.rotation.x = Math.sin(s.t * 1.5 + 1) * 0.08 - 0.1 * k;
    B.shell.rotation.z = Math.sin(ph) * 0.035 * k; B.shell.position.y += Math.abs(Math.sin(ph)) * 0.012 * k;
    let bl = 1;
    if (s.mood !== 'happy') {
      s.bt -= dt;
      if (s.bt < 0) { const u = -s.bt / 0.14; if (u >= 1) s.bt = frand(1.6, 4.5); else bl = 1 - Math.sin(u * PI) * 0.9; }
    }
    if (st.windup >= 0) {   // takes a big breath: cheeks puff, leans back, eyes squeeze into a giggle
      const w = smooth01(st.windup);
      B.body.rotation.x = -0.14 * w; B.head.position.z -= 0.05 * w; B.head.rotation.x -= 0.25 * w;
      B.head.scale.set(1 + 0.2 * w, 1 + 0.06 * w, 1 + 0.12 * w);
      B.stalkL.rotation.x -= 0.35 * w; B.stalkR.rotation.x -= 0.35 * w;
      B.head.position.x += Math.sin(s.t * 50) * 0.008 * st.windup;
      if (s.mood !== 'happy') bl = Math.min(bl, 1 - 0.58 * smooth01(st.windup * 1.8));
    }
    if (st.attack >= 0) {   // pfff — blows the bubble
      const k2 = Math.sin(PI * st.attack);
      B.head.position.z += 0.07 * k2; B.head.rotation.x += 0.25 * k2; B.head.scale.set(1 - 0.08 * k2, 1, 1 + 0.08 * k2);
    }
    // ducks into its shell when hurt, then peeks out again
    s.duck = Math.max(damp(s.duck || 0, 0, 5, dt), st.hurt > 0.5 ? 1 : 0);
    const d = smooth01(s.duck);
    if (d > 0.001) {
      B.head.position.z -= 0.36 * d; B.head.position.y -= 0.12 * d; B.head.scale.multiplyScalar(1 - 0.55 * d);
      const ss = 1 - 0.85 * d; B.stalkL.scale.setScalar(ss); B.stalkR.scale.setScalar(ss);
      B.body.scale.z *= 1 - 0.3 * d; B.body.scale.y *= 1 - 0.15 * d;
    }
    B.eyeL.scale.y = bl; B.eyeR.scale.y = bl;
  }

  function ghostGeo() {
    const rows = sN(52, 24), segs = sN(54, 36);   // ≥ 6 segments per hem wave
    return gx('ghost@' + rows + '_' + segs, () => {
      const pts = [[0, 0.17], [0.2, 0.13], [0.36, 0.06], [0.47, 0.01], [0.52, 0.05], [0.5, 0.2], [0.47, 0.42], [0.45, 0.62], [0.42, 0.8], [0.34, 0.95], [0.21, 1.06], [0.08, 1.11], [0, 1.12]];
      const v = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(rows);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      const g = new THREE.LatheGeometry(v, segs), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {   // wavy hem
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), f = smooth01((0.28 - y) / 0.26);
        const w = Math.sin(a * 6);
        const rr = Math.hypot(x, z), k = 1 + 0.06 * w * f;
        p.setXYZ(i, x * k, y - 0.055 * (0.5 + 0.5 * w) * f * Math.min(1, rr / 0.3), z * k);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  function buildHayalet(r, o) {
    const E = o.elite;
    const top = E ? '#b69cf4' : '#d2c6f7', mid = E ? '#9272ee' : '#b4a2f0', hem = E ? '#cc88f0' : '#d4b0f4';
    r.bone('body', 'root', [0, 0.1, 0]);
    r.bone('armL', 'body', [0.4, 0.55, 0]); r.bone('armR', 'body', [-0.4, 0.55, 0]);
    const wob = (x, y) => smooth01((0.4 - y) / 0.38);
    r.on('body').fx(0.3, 0, 0, wob).add(ghostGeo(), vgrad(0, 1.12, [[0, hem], [0.35, mid], [1, top]]));
    r.fx(0.3, 0, 0, 0);
    cone(r, [0, 1.08, -0.02], [-0.3, 1, -0.4], 0.14, 0.07, top, 12);   // little curl on top
    r.on('armL').fx(0.3, 0).add(G.sphere(16, 12), mid, [0.46, 0.5, 0.05], [0, 0, 0.6], [0.09, 0.15, 0.09]);
    r.on('armR').fx(0.3, 0).add(G.sphere(16, 12), mid, [-0.46, 0.5, 0.05], [0, 0, -0.6], [0.09, 0.15, 0.09]);
    r.fx(0, 0);
    face(r, [0, 0.7, 0], 0.44, { bone: 'body', tilt: 0.34, ex: 0.15, ey: 0.05, er: 0.12, iris: '#3a2a78', skin: mixc(mid, top, 0.55), skinFx: 0.3, browCol: '#4a3a8c', browY: 1.36, mouthY: -0.13, mouthW: 0.12, blushCol: '#ff8fc8', heartY: 0.7 });
    if (E) crown(r.on('body'), [0, 1.08, -0.02], 0.62);
    r.mark('muzzle', [0, 0.58, 0.48]);
    return { height: 1.12, glowC: col('#ffffff'), mat: { rough: 0.35, sss: col(top).multiplyScalar(0.12), rim: '#f4eeff', rimK: 0.45, rimP: 2.0, wob: 0.035, wobF: 4, wobS: 3.2 } };
  }
  function animHayalet(m, dt, st, s) {
    const B = m.B;
    B.body.position.y += Math.sin(s.t * 2 + s.ph) * 0.04;
    B.body.rotation.z = Math.sin(s.t * 1.3 + s.ph) * 0.06;
    B.body.rotation.x = 0.16 * s.mv;
    B.armL.rotation.z = 0.2 + Math.sin(s.t * 2.6 + s.ph) * 0.25; B.armR.rotation.z = -0.2 - Math.sin(s.t * 2.6 + s.ph + 1) * 0.25;
    let wob = 0.035 + 0.02 * s.mv;
    if (st.windup >= 0) {
      const w = smooth01(st.windup);
      B.body.scale.set(1 + 0.14 * w, 1 + 0.1 * w, 1 + 0.14 * w); B.body.rotation.x -= 0.25 * w;
      B.armL.rotation.z = 0.2 + 2.1 * w; B.armR.rotation.z = -0.2 - 2.1 * w; wob += 0.03 * w;
    }
    if (st.attack >= 0) {
      const k = Math.sin(PI * st.attack);
      B.body.position.z += 0.3 * k; B.body.rotation.x += 0.3 * k; B.body.scale.z = 1 + 0.1 * k;
      B.armL.rotation.x = -1.2 * k; B.armR.rotation.x = -1.2 * k;
    }
    m.U.uWob.value.x = wob;
  }

  // Glowing lava veins of the magma golem (model space; also its per-vertex unlit amount, so they glow in the dark).
  function magmaVein(x, y, z) {
    const n = fbm3(x * 1.25 + 11, y * 1.25, z * 1.25 - 4), d = Math.abs(n - 0.5);
    return smooth01((0.05 - d) / 0.035) * (0.55 + 0.45 * smooth01((1.9 - y) / 1.6));
  }
  function buildGolem(r, o) {
    const E = o.elite, MAG = o.variant === 'magma';
    // magma: dark warm basalt, glowing orange cracks, ember crystals, light ash brows (readable on the dark stone)
    const rock = MAG ? '#6e5c56' : E ? '#b3a595' : '#a89c90', rockD = MAG ? '#33282a' : E ? '#7d6f62' : '#7b7169';
    const moss = MAG ? '#9a8c84' : E ? '#6cb238' : '#72ad3e', cry = MAG ? '#ff9a2a' : E ? '#ffd23f' : '#56eeff';
    const cK = MAG ? 0.85 : E ? 0.8 : 1;   // gold crystals bloom more than cyan ones
    const rt = texOf('rock'), hot = hdr('#ff8a24', 2.1);
    r.bone('hips', 'root', [0, 0.85, 0]);
    r.bone('torso', 'hips', [0, 1.1, 0]);
    r.bone('head', 'torso', [0, 1.95, 0.25]);
    r.bone('armL', 'torso', [0.82, 1.78, 0]); r.bone('armR', 'torso', [-0.82, 1.78, 0]);
    r.bone('foreL', 'armL', [1.0, 1.28, 0.06]); r.bone('foreR', 'armR', [-1.0, 1.28, 0.06]);
    r.bone('legL', 'hips', [0.36, 0.7, 0]); r.bone('legR', 'hips', [-0.36, 0.7, 0]);
    // rock colour with moss on the tops of the big boulders
    function rcol(cx, cy, cz, ry, mossy) {
      const out = new THREE.Color(), a = col(rock), b = col(rockD), mc = col(moss), md = mixc(moss, '#2f6a22', 0.5);
      return (x, y, z) => {
        const n = fbm3(x * 2.3, y * 2.3, z * 2.3);
        out.copy(b).lerp(a, 0.35 + 0.65 * smooth01((y - cy + ry * 0.9) / (ry * 1.6)) * (0.7 + 0.5 * n));
        if (mossy) { const t = (y - cy) / ry - 0.42 - 0.35 * (n - 0.5); if (t > 0) out.copy(md).lerp(mc, smooth01(t * 3) * (0.6 + 0.4 * n)); }
        return out;
      };
    }
    const R = (bone, seed, fine, p, s, rot, mossy) => {
      if (MAG) {   // no moss on hot rock; the cracks glow (vertex colour + unlit amount follow the same vein field)
        const rc = rcol(p[0], p[1], p[2], s[1], false);
        r.on(bone).fx(0, 0.15, 1).uv(fine ? 3 : 2, fine ? 1.5 : 1)
          .add(rockGeo(seed, fine), rc, p, rot || null, s);
        return;
      }
      r.on(bone).fx(0, 0, 1).uv(fine ? 3 : 2, fine ? 1.5 : 1)
        .add(rockGeo(seed, fine), rcol(p[0], p[1], p[2], s[1], mossy), p, rot || null, s);
    };
    R('hips', 3, false, [0, 0.88, -0.02], [0.52, 0.34, 0.44], [0.2, 0.5, 0.1]);
    R('torso', 1, true, [0, 1.52, -0.08], [0.86, 0.66, 0.66], [0.1, 0.3, 0.05], true);
    R('torso', 7, false, [0, 1.25, 0.28], [0.5, 0.36, 0.32], [0.4, 1, 0]);
    R('head', 5, true, [0, 2.06, 0.28], [0.44, 0.37, 0.4], [0.3, 0.2, 0.1], true);
    for (const s of [-1, 1]) {
      const A = s > 0 ? 'armL' : 'armR', F = s > 0 ? 'foreL' : 'foreR', Lg = s > 0 ? 'legL' : 'legR';
      R(A, 2 + (s > 0 ? 0 : 9), false, [0.84 * s, 1.8, -0.02], [0.4, 0.36, 0.38], [0.3 * s, 0.6, 0.2], true);
      R(A, 4 + (s > 0 ? 0 : 9), false, [0.98 * s, 1.42, 0.04], [0.27, 0.34, 0.27], [0.1, s, 0.2]);
      R(F, 6 + (s > 0 ? 0 : 9), true, [1.04 * s, 0.86, 0.14], [0.44, 0.42, 0.44], [0.5, 0.8 * s, 0.3]);
      R(Lg, 8 + (s > 0 ? 0 : 9), false, [0.37 * s, 0.34, 0.02], [0.33, 0.38, 0.36], [0.2, s, 0.1]);
      // glowing crystal cluster on the shoulder
      r.on(A).uv(null).fx(1, 0);
      for (const c of [[0.2, 0.42, -0.1, 0.33, 0.3], [0.04, 0.38, -0.2, 0.25, -0.2], [0.3, 0.3, 0.05, 0.2, 0.6]]) {
        const d = [c[0] * s, 1, c[2] + 0.2 * c[4]], q = qy(...d);
        r.add(G.octa(), (x, y, z) => { const t = clamp((y - 1.9) / 0.5, 0, 1); return _gc.copy(col(cry)).multiplyScalar((2.2 + 1.8 * t) * cK).lerp(_w3, t * 0.3 * cK); },
          [0.84 * s + c[0] * s, 1.8 + c[1], c[2]], q, [0.075, c[3], 0.075]);
      }
      r.fx(0, 0);
    }
    if (MAG) {   // molten core glowing in the gaps between the boulders (neck, shoulders, elbows, waist, hips)
      r.uv(null).fx(1, 0);
      const mc = hdr('#ff7a1c', 2.2);
      r.on('torso').add(G.sphere(16, 12), mc, [0, 1.12, 0.02], null, [0.42, 0.26, 0.36]).add(G.sphere(14, 10), mc, [0, 1.86, 0.18], null, 0.26);
      for (const sd of [-1, 1]) {
        r.on(sd > 0 ? 'armL' : 'armR').add(G.sphere(14, 10), mc, [0.74 * sd, 1.66, -0.02], null, 0.24);
        r.on(sd > 0 ? 'foreL' : 'foreR').add(G.sphere(14, 10), mc, [1.0 * sd, 1.18, 0.08], null, 0.17);
        r.on('hips').add(G.sphere(14, 10), mc, [0.36 * sd, 0.66, 0.0], null, 0.2);
      }
      r.fx(0, 0);
    }
    // crystals on the back + one on the head
    r.on('torso').uv(null).fx(1, 0);
    for (const c of [[0.25, 1.95, -0.55, 0.35, [0.3, 0.8, -0.8]], [-0.2, 1.85, -0.62, 0.28, [-0.4, 0.6, -0.9]], [0.05, 1.6, -0.72, 0.22, [0, 0.3, -1]]]) {
      r.add(G.octa(), hdr(cry, 2.6 * cK), [c[0], c[1], c[2]], qy(...c[4]), [0.08, c[3], 0.08]);
    }
    r.on('head').add(G.octa(), hdr(cry, 2.8 * cK), [0.12, 2.42, 0.18], qy(0.3, 1, -0.2), [0.06, 0.2, 0.06]);
    r.fx(0, 0);
    face(r, [0, 2.06, 0.28], 0.4, {   // gentle smiling rock giant: warm friendly eye glow, mossy arched brows, soft smile
      bone: 'head', tilt: 0.3, ex: 0.16, ey: 0.03, er: 0.11, glowEye: E ? '#ffe7a0' : '#ffcf6a', browCol: moss, browT: 0.5, browW: 1.2, browH: 1.25, browY: 1.5,
      mouthY: -0.17, mouthW: 0.17, mouthCol: MAG ? '#1c0e0a' : '#3a2a22', smirk: 0.12, noTongue: true, blushCol: MAG ? '#ff8a9a' : '#ff9aa8', heartY: 0.8, heartX: 1.1,
    });
    r.on('foreR').mark('muzzle', [-1.04, 0.86, 0.3]);
    if (MAG) return { height: 2.45, glowK: 0.6, glowC: col('#ff7a2a'), tex: rt, lava: { color: '#ff6a1a', k: 2.6 }, mat: { rough: 0.8, ns: 1.3, rim: '#ffc890', rimK: 0.3 }, eliteRim: { rimK: 0.24, rimP: 3.2 } };
    return { height: 2.45, glowK: 0.6, glowC: col(E ? '#ffb13a' : '#ff8a4a'), tex: rt, mat: { rough: 0.85, ns: 1.2, rim: '#dff6ff', rimK: 0.3 }, eliteRim: { rimK: 0.24, rimP: 3.2 } };   // bumpy rock catches a lot of rim
  }
  const _gc = new THREE.Color(), _w3 = new THREE.Color(3, 3, 3), _dk = new THREE.Color();
  function animGolem(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (3.2 + 2.2 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.5), br = Math.sin(s.t * 1.6 + s.ph);
    B.torso.scale.set(1 + 0.015 * br, 1 + 0.02 * br, 1 + 0.015 * br);
    B.hips.rotation.z = Math.sin(ph) * 0.07 * k; B.hips.position.y += Math.abs(Math.cos(ph)) * 0.06 * k;
    B.legL.rotation.x = Math.sin(ph) * 0.45 * k; B.legR.rotation.x = -Math.sin(ph) * 0.45 * k;
    B.legL.position.y += Math.max(0, Math.sin(ph)) * 0.1 * k; B.legR.position.y += Math.max(0, -Math.sin(ph)) * 0.1 * k;
    B.torso.rotation.x = 0.1 * k; B.torso.rotation.y = -Math.sin(ph) * 0.08 * k;
    B.armL.rotation.x = -Math.sin(ph) * 0.35 * k + 0.03 * br; B.armR.rotation.x = Math.sin(ph) * 0.35 * k + 0.03 * br;
    B.armL.rotation.z = 0.05 * br; B.armR.rotation.z = -0.05 * br;
    B.head.rotation.z = Math.sin(s.t * 0.8 + s.ph) * 0.05;
    if (st.windup >= 0) {
      const w = smooth01(st.windup * 1.2);
      B.armL.rotation.x = -2.75 * w; B.armR.rotation.x = -2.75 * w; B.armL.rotation.z = -0.25 * w; B.armR.rotation.z = 0.25 * w;
      B.foreL.rotation.x = -0.5 * w; B.foreR.rotation.x = -0.5 * w;
      B.torso.rotation.x = -0.3 * w; B.hips.position.y += 0.1 * w; B.head.rotation.x = -0.2 * w;
      B.hips.position.x += Math.sin(s.t * 45) * 0.02 * st.windup;
    }
    if (st.attack >= 0) {
      const a = st.attack, hit = smooth01(a / 0.22), back = smooth01((a - 0.45) / 0.55), v = hit * (1 - back);
      const armX = lerp(-2.75, 0.3, hit) * (1 - back);
      B.armL.rotation.x = armX; B.armR.rotation.x = armX; B.armL.rotation.z = -0.25 * (1 - hit); B.armR.rotation.z = 0.25 * (1 - hit);
      B.foreL.rotation.x = -0.5 * (1 - hit); B.foreR.rotation.x = -0.5 * (1 - hit);
      B.torso.rotation.x = lerp(-0.3, 0.5, hit) * (1 - back); B.head.rotation.x = 0.2 * v;
      const sq = a > 0.2 && a < 0.4 ? Math.sin(PI * (a - 0.2) / 0.2) : 0;
      B.hips.scale.set(1 + 0.08 * sq, 1 - 0.1 * sq, 1 + 0.08 * sq); B.hips.position.y -= 0.08 * sq;
    }
  }

  function buildAsker(r, o) {
    const E = o.elite;
    const red = E ? '#c8102e' : '#e23c40', redD = E ? '#8c0a22' : '#b52a33', navy = '#27397f', shako = '#1d2240', skin = '#ffd8bd', stache = '#6b3b1f';
    const white = '#ece5d6', boot = '#221e2a', metal = '#d6dde8';
    const fab = texOf('fabric');
    r.bone('hips', 'root', [0, 0.46, 0]);
    r.bone('body', 'hips', [0, 0.5, 0]);
    r.bone('head', 'body', [0, 0.9, 0]);
    r.bone('key', 'body', [0, 0.66, -0.24]);
    r.bone('armL', 'body', [0.25, 0.8, 0]); r.bone('armR', 'body', [-0.25, 0.8, 0]);
    r.bone('legL', 'hips', [0.1, 0.46, 0]); r.bone('legR', 'hips', [-0.1, 0.46, 0]);
    r.bone('sword', 'armR', [-0.3, 0.55, 0.1]);
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'legL' : 'legR').fx(0, 0, 1).uv(1, 2).seg([0.1 * s, 0.47, 0], [0.1 * s, 0.14, 0.0], 0.075, navy, 0.068, 14);
      r.uv(null).fx(0, 0.7).add(G.sphere(16, 10), boot, [0.1 * s, 0.08, 0.035], null, [0.085, 0.085, 0.13]).fx(0, 0);
      r.fx(0, 0, 0).seg([0.1 * s + 0.07 * s, 0.44, 0.01], [0.1 * s + 0.065 * s, 0.16, 0.01], 0.012, red, 0.012, 6);
    }
    // jacket (fabric), belt, cross straps, gold buttons + epaulettes
    r.on('body').fx(0, 0, 1).uv(3, 1).add(lathe('aJacket', [[0, 0.42], [0.2, 0.42], [0.235, 0.46], [0.24, 0.6], [0.235, 0.74], [0.21, 0.83], [0.12, 0.87], [0, 0.875]], 32),
      vgrad(0.42, 0.87, [[0, redD], [0.3, red], [1, red]]), [0, 0, 0], null, [1, 1, 0.9]);
    r.uv(null).fx(0, 0.4).add(G.torus(TAU, 0.28, 32), white, [0, 0.47, 0], [PI / 2, 0, 0], [0.238, 0.216, 0.1]);
    for (const s of [-1, 1]) {   // straps wrapped over the curved jacket front
      const N = 6;
      for (let i = 0; i < N; i++) {
        const t0 = i / N, t1 = (i + 1) / N, x0 = lerp(0.2 * s, -0.17 * s, t0), x1 = lerp(0.2 * s, -0.17 * s, t1), y0 = lerp(0.84, 0.5, t0), y1 = lerp(0.84, 0.5, t1);
        const z0 = 0.9 * Math.sqrt(Math.max(0, 0.245 * 0.245 - x0 * x0)) + 0.008, z1 = 0.9 * Math.sqrt(Math.max(0, 0.245 * 0.245 - x1 * x1)) + 0.008;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
        r.add(G.rbox(2), white, [mx, my, mz], qb([x1 - x0, y1 - y0, z1 - z0], [mx / 0.245, 0, mz / 0.22]), [0.045, len * 1.12, 0.016]);
      }
    }
    r.fx(0, 2);
    for (const y of [0.56, 0.64, 0.76]) r.add(G.sphere(10, 8), GOLD, [0, y, 0.215], null, [0.022, 0.022, 0.012]);
    r.add(G.rbox(2), GOLD, [0, 0.47, 0.205], null, [0.06, 0.05, 0.02]);
    for (const s of [-1, 1]) {
      r.add(G.sphere(16, 8), GOLD, [0.22 * s, 0.84, 0], null, [0.09, 0.03, 0.08]);
      for (let i = 0; i < 5; i++) r.add(G.cyl(1, 1, 6), GOLD, [0.22 * s + (0.075 * s), 0.8, -0.06 + i * 0.03], null, [0.008, 0.06, 0.008]);
    }
    r.add(G.torus(TAU, 0.3, 24), GOLD, [0, 0.86, 0], [PI / 2, 0, 0], [0.12, 0.11, 0.06]);
    r.fx(0, 0);
    // wind-up key
    r.on('key').fx(0, 2).seg([0, 0.66, -0.2], [0, 0.66, -0.3], 0.022, GOLD, 0.022, 10);
    for (const s of [-1, 1]) r.add(G.torus(TAU, 0.28, 24), GOLD, [0.085 * s, 0.66, -0.31], [0, PI / 2, 0], [0.075, 0.06, 0.075]);
    r.add(G.sphere(10, 8), GOLD, [0, 0.66, -0.31], null, 0.03).fx(0, 0);
    // arms: red sleeves, white gloves, toy sword in the right hand
    r.on('armL').fx(0, 0, 1).seg([0.25, 0.8, 0], [0.29, 0.56, 0.04], 0.055, red, 0.05, 12).fx(0, 0.2).add(G.sphere(14, 10), white, [0.3, 0.52, 0.05], null, 0.058);
    r.on('armR').fx(0, 0, 1).seg([-0.25, 0.8, 0], [-0.29, 0.58, 0.08], 0.055, red, 0.05, 12).fx(0, 0.2).add(G.sphere(14, 10), white, [-0.3, 0.55, 0.1], null, 0.058);
    r.on('sword').fx(0, 2).add(G.rbox(2), metal, [-0.3, 0.84, 0.13], [0.12, 0, 0], [0.045, 0.52, 0.014]);
    r.add(G.cone(4), metal, [-0.3, 1.13, 0.165], [0.12, PI / 4, 0], [0.032, 0.07, 0.01]);
    r.add(G.rbox(2), GOLD, [-0.3, 0.58, 0.1], [0.12, 0, 0], [0.16, 0.03, 0.04]);
    r.add(G.sphere(8, 6), GOLD, [-0.3, 0.5, 0.09], null, 0.03).fx(0, 0);
    // head + shako with plume
    r.on('head').add(G.sphere(36, 26), skin, [0, 1.04, 0], null, [0.27, 0.265, 0.26]);
    r.add(G.sphere(14, 10), '#ffc2a4', [0, 1.0, 0.26], null, [0.045, 0.04, 0.04]);
    for (const s of [-1, 1]) {
      r.add(G.sphere(16, 10), stache, [0.07 * s, 0.945, 0.24], [0, 0, s * 0.35], [0.085, 0.036, 0.042]);
      r.add(G.sphere(10, 8), stache, [0.145 * s, 0.965, 0.21], null, 0.03);
    }
    r.push([0, 1.04, 0], [-0.1, 0, 0]);
    for (const s of [-1, 1]) { const [p, q] = onSphere(s * 0.155, -0.07, 0.265, -0.004); r.push(p, q); blush(r, 0.09, { blushCol: '#ff8a9a' }); r.pop(); }
    r.pop();
    // shako: short and pushed back on the head (pivot at the crown) so the brim clears the eyes from the gameplay camera
    const SH = 0.34;
    r.push([0, 1.16, -0.05], [-0.32, 0, 0]);
    r.fx(0, 0.35).add(G.cyl(1.12, 1, 28), vgrad(1.13, 1.53, [[0, shako], [1, mixc(shako, '#4a5290', 0.3)]]), [0, SH / 2, 0], null, [0.215, SH, 0.215]);
    r.fx(0, 0.7).add(G.hemi(24), boot, [0, 0.012, 0.16], [-0.4, 0, 0], [0.18, 0.04, 0.1]);
    r.fx(0, 2).add(G.torus(TAU, 0.2, 28), GOLD, [0, SH - 0.005, 0], [PI / 2, 0, 0], [0.237, 0.237, 0.06]);
    r.add(G.torus(TAU, 0.2, 28), GOLD, [0, 0.02, 0], [PI / 2, 0, 0], [0.216, 0.216, 0.05]);
    r.add(extrude('star5', () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i & 1 ? 0.2 : 0.5; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } return s; }, 0.08, 0.04, 4, 0.3),
      GOLD, [0, SH * 0.52, 0.232], null, [0.14, 0.14, 0.2]);
    r.fx(0, 0.2).add(G.sphere(18, 12), white, [0, SH + 0.065, 0], null, [0.07, 0.095, 0.07]);
    r.add(G.sphere(16, 12), red, [0, SH + 0.165, -0.01], null, [0.055, 0.075, 0.055]).fx(0, 0);
    if (E) { r.fx(0, 2); for (const s of [-1, 1]) r.add(G.cone(8), GOLD, [0.21 * s, SH - 0.02, 0], [0, 0, -0.5 * s], [0.04, 0.12, 0.04]); r.fx(0, 0); }
    r.pop();
    face(r, [0, 1.04, 0], 0.265, { bone: 'head', tilt: 0.3, ex: 0.1, ey: 0.035, er: 0.088, iris: '#2e3f8f', skin, browCol: stache, browY: 1.3, mouthY: -0.155, mouthW: 0.085, smirk: 0.2, noBlush: true, heartY: 0.95, heartX: 1.15 });
    r.on('sword').mark('muzzle', [-0.3, 1.0, 0.16]);
    return { height: 1.6, glowC: col('#ff5a3a'), tex: fab, mat: { rough: 0.55, ns: 0.7 } };
  }
  function animAsker(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (6.5 + 4 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4), sq = Math.sign(Math.sin(ph)) * Math.pow(Math.abs(Math.sin(ph)), 0.6);
    B.legL.rotation.x = sq * 0.5 * k; B.legR.rotation.x = -sq * 0.5 * k;
    B.hips.position.y += Math.abs(Math.sin(ph)) * 0.05 * k + Math.sin(s.t * 2 + s.ph) * 0.005;
    B.hips.rotation.z = Math.sin(ph) * 0.05 * k;
    B.armL.rotation.x = -sq * 0.45 * k; B.armR.rotation.x = sq * 0.2 * k;
    B.head.rotation.z = Math.sin(s.t * 1.1 + s.ph) * 0.04;
    s.key += dt * (2 + 5 * s.mv + (st.windup >= 0 ? 14 * st.windup : 0));
    B.key.rotation.z = s.key;
    if (st.windup >= 0) {
      const w = smooth01(st.windup * 1.25);
      B.armR.rotation.x = -2.6 * w; B.sword.rotation.x = 1.9 * w; B.armR.rotation.z = -0.3 * w;
      B.body.rotation.x = -0.2 * w; B.head.rotation.x = -0.1 * w; B.hips.position.x += Math.sin(s.t * 50) * 0.008 * st.windup;
    }
    if (st.attack >= 0) {
      const a = st.attack, hit = smooth01(a / 0.25), back = smooth01((a - 0.35) / 0.65);
      B.armR.rotation.x = lerp(-2.6, -0.6, hit) * (1 - back); B.sword.rotation.x = lerp(1.9, 2.5, hit) * (1 - back); B.armR.rotation.z = -0.3 * (1 - hit);
      B.body.rotation.x = 0.28 * hit * (1 - back); B.body.rotation.y = -0.2 * hit * (1 - back);
    }
  }

  function buildAtescik(r, o) {
    const E = o.elite;
    const core = E ? '#ffffff' : '#fff7c4', mid = E ? '#ffd23f' : '#ffc23a', outer = E ? '#ff5a1a' : '#ff7a1c', tip = E ? '#e8202a' : '#ff3d2e';
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('top', 'body', [0, 0.5, 0]);
    r.bone('armL', 'body', [0.3, 0.35, 0]); r.bone('armR', 'body', [-0.3, 0.35, 0]);
    const fcol = (y0, y1) => vgrad(y0, y1, [[0, hdr(core, 1.9)], [0.3, hdr(mid, 1.5)], [0.62, hdr(outer, 1.3)], [1, hdr(tip, 1.15)]]);
    const wob = (x, y) => smooth01((y - 0.25) / 0.6);
    const flame = lathe('flame', [[0, 0.02], [0.17, 0.035], [0.29, 0.12], [0.35, 0.27], [0.34, 0.42], [0.27, 0.57], [0.17, 0.71], [0.08, 0.84], [0, 0.95]], 28, 3);
    r.on('body').fx(1, 0, 0, wob).add(flame, fcol(0.02, 0.95));
    r.on('top');
    r.add(flame, fcol(0.35, 0.95), [0.19, 0.4, -0.04], [0, 0, -0.5], [0.5, 0.6, 0.5]);
    r.add(flame, fcol(0.35, 0.95), [-0.2, 0.38, -0.02], [0, 0, 0.55], [0.45, 0.55, 0.45]);
    r.add(flame, fcol(0.45, 1.05), [0.02, 0.5, -0.14], [-0.4, 0, 0.1], [0.5, 0.55, 0.5]);
    r.on('armL').fx(1, 0, 0, 0.5).add(flame, fcol(0.2, 0.55), [0.36, 0.26, 0.04], [0, 0, -0.9], [0.28, 0.32, 0.28]);
    r.on('armR').fx(1, 0, 0, 0.5).add(flame, fcol(0.2, 0.55), [-0.36, 0.26, 0.04], [0, 0, 0.9], [0.28, 0.32, 0.28]);
    r.fx(0, 0);
    face(r, [0, 0.36, 0], 0.335, { bone: 'body', tilt: 0.34, ex: 0.12, ey: 0.035, er: 0.105, iris: '#5a2208', skin: hdr(mixc(mid, outer, 0.25), 1.45), skinFx: 1, browCol: '#7a2a0a', browY: 1.34, mouthY: -0.12, mouthW: 0.1, mouthCol: '#5a1404', blushCol: '#ff5a8a', heartY: 0.8 });
    if (E) crown(r.on('top').fx(0, 0), [0, 0.86, -0.04], 0.6);
    r.on('body').mark('muzzle', [0, 0.3, 0.38]);
    return { height: 0.95, glowC: col('#ffd23f'), mat: { rough: 0.5, sss: col('#fff2a0').multiplyScalar(0.3), rim: '#ffe6a0', rimK: 0.5, wob: 0.03, wobF: 6, wobS: 9 } };
  }
  function animAtescik(m, dt, st, s) {
    const B = m.B;
    const f1 = Math.sin(s.t * 13 + s.ph) * 0.5 + Math.sin(s.t * 21.7) * 0.3 + Math.sin(s.t * 7.3) * 0.2;
    B.body.scale.set(1 - 0.03 * f1, 1 + 0.06 * f1, 1 - 0.03 * f1);
    B.body.position.y += Math.sin(s.t * 2.2 + s.ph) * 0.03;
    B.body.rotation.x = 0.15 * s.mv;
    B.top.rotation.z = Math.sin(s.t * 3.1 + s.ph) * 0.12; B.top.rotation.x = -0.1 * s.mv + Math.sin(s.t * 2.3) * 0.06;
    B.armL.rotation.z = Math.sin(s.t * 4 + s.ph) * 0.2; B.armR.rotation.z = -Math.sin(s.t * 4 + s.ph + 1.3) * 0.2;
    let wob = 0.03 + 0.015 * s.mv;
    if (st.windup >= 0) {
      const w = smooth01(st.windup);
      B.body.scale.set(1 + 0.15 * w, 1 + 0.3 * w + 0.08 * f1, 1 + 0.15 * w); B.body.rotation.x -= 0.25 * w;
      B.armL.rotation.z = 1.4 * w; B.armR.rotation.z = -1.4 * w; wob += 0.03 * w;
    }
    if (st.attack >= 0) {
      const k = Math.sin(PI * st.attack);
      B.body.position.z += 0.25 * k; B.body.rotation.x += 0.35 * k; B.body.scale.y *= 1 - 0.15 * k;
    }
    m.U.uWob.value.x = wob;
  }

  // ── Boss: Huysuz Ejderha ──
  let SCALE_TEX = null;
  function scaleTex() {   // procedural overlapping-scale normal map (tileable, 8 × 8 scales)
    if (SCALE_TEX) return SCALE_TEX;
    const S = 128, N = 8, H = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * N, v = y / S * N; let h = 0;
      for (let dj = -1; dj <= 2; dj++) {
        const j = Math.floor(v) + dj, off = (j & 1) * 0.5;
        for (let di = -1; di <= 1; di++) {
          const i = Math.floor(u - off) + di, cx = i + 0.5 + off, cy = j + 0.15;
          const dx = u - cx, dy = (v - cy) * 1.1, d = Math.hypot(dx, dy);
          if (d < 0.66 && dy < 0.25) h = Math.max(h, 0.25 + 0.75 * Math.sqrt(1 - d / 0.66) * smooth01((0.25 - dy) / 0.5));
        }
      }
      H[y * S + x] = h;
    }
    const D = new Uint8Array(S * S * 4), k = 2.2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const hx = H[y * S + ((x + 1) % S)] - H[y * S + ((x + S - 1) % S)], hy = H[((y + 1) % S) * S + x] - H[((y + S - 1) % S) * S + x];
      let nx = -hx * k, ny = -hy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const o = (y * S + x) * 4; D[o] = (nx * 0.5 + 0.5) * 255; D[o + 1] = (ny * 0.5 + 0.5) * 255; D[o + 2] = (nz * 0.5 + 0.5) * 255; D[o + 3] = 255;
    }
    const t = new THREE.DataTexture(D, S, S, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.anisotropy = ANISO; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    return (SCALE_TEX = { normalMap: t });
  }
  function buildEjderha(r, o) {
    const body = '#7a46cc', bodyD = '#55309f', bodyL = '#9563e0', belly = '#e2cffa', plate = '#cdb2f5', horn = '#f2d9a4', claw = '#f5e4c2';
    const spike = '#f06bbd', mem = '#a67ce6', strut = '#5f36a8';
    r.bone('hips', 'root', [0, 1.0, 0]);
    r.bone('body', 'hips', [0, 1.5, 0]);
    r.bone('chest', 'body', [0, 2.2, 0.15]);
    r.bone('neck', 'chest', [0, 2.5, 0.32]);
    r.bone('head', 'neck', [0, 3.3, 0.8]);
    r.bone('jaw', 'head', [0, 3.2, 1.02]);
    r.bone('glow', 'head', [0, 3.12, 2.02]);
    r.bone('wingL', 'chest', [0.62, 2.72, -0.55]); r.bone('wingR', 'chest', [-0.62, 2.72, -0.55]);
    r.bone('armL', 'chest', [0.82, 2.12, 0.5]); r.bone('armR', 'chest', [-0.82, 2.12, 0.5]);
    r.bone('legL', 'hips', [0.68, 1.02, 0.05]); r.bone('legR', 'hips', [-0.68, 1.02, 0.05]);
    const TP = [[0, 0.85, -0.95], [0.06, 0.58, -1.62], [0.26, 0.42, -2.22], [0.58, 0.36, -2.72], [0.95, 0.36, -3.1], [1.25, 0.4, -3.38]];
    r.bone('t1', 'hips', TP[0]); r.bone('t2', 't1', TP[1]); r.bone('t3', 't2', TP[2]); r.bone('t4', 't3', TP[3]); r.bone('t5', 't4', TP[4]);
    const tx = 0.55;   // metres per scale tile / 8
    const SC = (rad) => [2 * PI * rad / (8 * tx * 0.5), PI * rad / (8 * tx * 0.5)];
    const bcol = vgrad(0.2, 2.9, [[0, bodyD], [0.45, body], [1, bodyL]]);
    // body + belly with plates
    r.on('body').fx(0, 0, 1).uv(...SC(1.25)).add(G.sphere(40, 30), bcol, [0, 1.62, -0.06], null, [1.24, 1.32, 1.16]);
    r.fx(0, 0.2, 0.2).uv(...SC(0.8)).add(G.sphere(36, 26), belly, [0, 1.5, 0.5], null, [0.88, 1.02, 0.68]);
    r.uv(null).fx(0, 0.45);
    for (let i = 0; i < 6; i++) {   // soft overlapping belly plates hugging the belly
      const y = 0.76 + i * 0.28, t = (y - 1.5) / 1.02, ww = Math.sqrt(Math.max(0.05, 1 - t * t)), zz = 0.5 + 0.68 * ww;
      const nrm = [0, t / 1.02, (zz - 0.5) / (0.68 * 0.68)];
      r.add(G.sphere(28, 12), mixc(plate, belly, (i & 1) * 0.5), [0, y, zz - 0.045], qz(...nrm), [0.88 * ww * 0.86, 0.15, 0.06]);
    }
    r.fx(0, 0);
    // back spikes
    r.fx(0, 0.6);
    for (let i = 0; i < 6; i++) {
      const phi = 0.45 + i * 0.36, [p, n] = onEll([0, 1.62, -0.06], [1.24, 1.32, 1.16], phi, PI);
      softSpike(r, [p[0], p[1] - n[1] * 0.08, p[2] - n[2] * 0.08], n, 0.52 - i * 0.04, 0.24 - i * 0.018, spike, 16);
      r.add(G.sphere(12, 8), spike, [p[0] + n[0] * 0.02, p[1] + n[1] * 0.02, p[2] + n[2] * 0.02], null, 0.2 - i * 0.015);
    }
    r.fx(0, 0);
    // legs with claws
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'legL' : 'legR').fx(0, 0, 1).uv(...SC(0.55));
      r.add(G.sphere(28, 20), bcol, [0.72 * s, 0.82, 0.04], null, [0.56, 0.62, 0.6]);
      r.uv(...SC(0.4)).add(G.sphere(24, 16), bodyD, [0.78 * s, 0.24, 0.36], null, [0.46, 0.26, 0.62]);
      r.uv(null).fx(0, 0.6);
      for (let c = -1; c <= 1; c++) r.add(G.sphere(14, 10), claw, [0.78 * s + c * 0.22, 0.14, 0.9 - Math.abs(c) * 0.08], null, [0.1, 0.08, 0.11]);   // round toes
      r.fx(0, 0);
    }
    // little arms with claws
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'armL' : 'armR').fx(0, 0, 1).uv(3, 2).seg([0.82 * s, 2.12, 0.5], [1.0 * s, 1.62, 0.98], 0.22, body, 0.17, 14);
      r.uv(...SC(0.2)).add(G.sphere(20, 14), bodyL, [1.02 * s, 1.56, 1.02], null, 0.21).uv(null).fx(0, 0.6);
      for (let c = -1; c <= 1; c++) r.add(G.sphere(12, 8), claw, [1.02 * s + c * 0.1, 1.44, 1.17], null, [0.062, 0.055, 0.07]);   // round fingers
      r.fx(0, 0);
    }
    // neck + head
    r.on('neck').fx(0, 0, 1).uv(...SC(0.55));
    r.add(G.sphere(28, 20), bcol, [0, 2.62, 0.36], null, [0.62, 0.6, 0.6]);
    r.add(G.sphere(28, 20), bcol, [0, 2.95, 0.56], null, [0.55, 0.55, 0.52]);
    r.uv(null).fx(0, 0.45);
    for (let i = 0; i < 3; i++) r.add(G.sphere(20, 10), plate, [0, 2.48 + i * 0.25, 0.9 + i * 0.16], [-0.5, 0, 0], [0.34 - i * 0.02, 0.1, 0.06]);
    r.fx(0, 0.6);
    for (let i = 0; i < 2; i++) softSpike(r, [0, 2.95 + i * 0.3, 0.02 + i * 0.25], [0, 0.4, -1], 0.3, 0.13, spike, 12);
    r.on('head').fx(0, 0, 1).uv(...SC(0.8)).add(G.sphere(40, 30), vgrad(2.9, 4.3, [[0, body], [1, bodyL]]), [0, 3.56, 0.74], null, [0.86, 0.76, 0.8]);
    r.uv(...SC(0.5)).add(G.sphere(32, 22), mixc(bodyL, body, 0.3), [0, 3.28, 1.36], null, [0.6, 0.42, 0.56]);
    for (const s of [-1, 1]) r.add(G.sphere(20, 14), bodyL, [0.5 * s, 3.26, 1.02], null, [0.3, 0.26, 0.3]);
    r.uv(null).fx(0, 0.5);
    for (const s of [-1, 1]) r.add(G.sphere(12, 8), '#3a1a5a', [0.17 * s, 3.5, 1.83], [-0.5, 0, 0], [0.06, 0.035, 0.03]);
    // horns, ear fins, head spikes
    r.fx(0, 0.35);
    for (const s of [-1, 1]) {
      const pts = [[0.4 * s, 4.0, 0.52], [0.52 * s, 4.34, 0.36], [0.6 * s, 4.58, 0.1]];
      r.seg(pts[0], pts[1], 0.15, horn, 0.11, 14).add(G.sphere(12, 8), horn, pts[1], null, 0.11).seg(pts[1], pts[2], 0.11, horn, 0.07, 14);
      softSpike(r, pts[2], [0.2 * s, 0.6, -1], 0.24, 0.075, horn, 12);
      r.fx(0, 0.5).add(G.cone(12), spike, [0.84 * s, 3.66, 0.52], [0.3, 0.4 * s, -s * 1.2], [0.14, 0.44, 0.06]).fx(0, 0.35);
    }
    r.fx(0, 0.6);
    for (let i = 0; i < 3; i++) softSpike(r, [0, 4.26 - i * 0.15, 0.62 - i * 0.34], [0, 1, -0.5 - i * 0.4], 0.28 - i * 0.04, 0.12, spike, 12);
    r.fx(0, 0);
    // jaw + mouth inside + charging glow
    r.on('jaw').fx(0, 0, 0.6).uv(...SC(0.4)).add(G.sphere(28, 18), mixc(bodyL, belly, 0.35), [0, 3.02, 1.34], null, [0.5, 0.2, 0.5]);
    r.uv(null).fx(0, 0.5).add(G.sphere(20, 12), '#5c1733', [0, 3.13, 1.36], null, [0.44, 0.1, 0.44]);
    r.add(G.sphere(16, 10), '#ff7aa0', [0, 3.18, 1.46], null, [0.24, 0.05, 0.26]);
    r.on('glow').fx(1, 0).add(G.sphere(20, 14), hdr('#ff86e0', 2.2), [0, 3.12, 2.02], null, 0.24);
    r.add(G.sphere(16, 10), hdr('#fff0fb', 2.6), [0, 3.12, 2.06], null, 0.12);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; r.add(G.octa(), hdr(i & 1 ? '#c9a0ff' : '#ffe27a', 2.2), [Math.sin(a) * 0.3, 3.12 + Math.cos(a) * 0.3, 2.02], [0, 0, a], 0.05); }   // glitter
    r.fx(0, 0);
    // wings
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'wingL' : 'wingR').push([0.62 * s, 2.72, -0.55], [-0.72, 0.42 * s, 0.12 * s]);
      r.fx(0, 0.4).add(extrude('dWing' + s, () => wingShape(s, DRAGON_WING), 0.05, 0.03, 12), mem, [0, 0, 0]);
      r.fx(0, 0, 1).uv(3, 1);
      const E = [1.35 * s, 0.85, 0.05];
      r.seg([0, 0.2, 0], [E[0], E[1], 0], 0.12, strut, 0.09, 10).add(G.sphere(12, 8), strut, [E[0], E[1], 0], null, 0.11);
      for (const t of [[2.9, 1.2], [3.05, 0.1], [2.35, -0.85], [1.2, -1.15]]) r.seg([E[0], E[1], 0], [t[0] * s, t[1], 0], 0.07, strut, 0.035, 8);
      r.uv(null).fx(0, 0.5).add(G.sphere(12, 8), claw, [2.94 * s, 1.25, 0.03], null, 0.075);
      r.pop().fx(0, 0);
    }
    // tail with spikes + spade tip
    const TR = [0.55, 0.44, 0.34, 0.26, 0.19, 0.14];
    for (let i = 0; i < 5; i++) {   // smoothly tapering tail: cone segments with a ball at every joint
      const a = TP[i], b = TP[i + 1];
      r.on('t' + (i + 1)).fx(0, 0, 1).uv(3, 2);
      r.seg(a, b, TR[i], bcol, TR[i + 1], 20);
      r.uv(...SC(TR[i])).add(G.sphere(24, 16), bcol, a, null, TR[i]);
      if (i === 4) r.add(G.sphere(16, 12), bcol, b, null, TR[5]);
      r.uv(null).fx(0, 0.6);
      softSpike(r, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (TR[i] + TR[i + 1]) * 0.4, (a[2] + b[2]) / 2], [0, 1, -0.35], 0.34 - i * 0.04, 0.15 - i * 0.018, spike, 12);
    }
    {
      const b = TP[5], a = TP[4], d = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
      r.on('t5').fx(0, 0.8).add(extrude('heart', heartShape, 0.06, 0.035, 14), spike, [b[0] + d.x * 0.2, b[1] + 0.02, b[2] + d.z * 0.2],
        qb([-d.x, 0, -d.z], [0, 1, 0]), [0.62, 0.62, 0.5]);
    }
    r.fx(0, 0);
    face(r, [0, 3.56, 0.74], 0.8, {   // goofy, smiling: big friendly eyes, playful brows, round buck teeth, tongue out
      bone: 'head', tilt: 0.22, ex: 0.33, ey: 0.12, er: 0.27, iris: '#b8661e', skin: mixc(body, bodyL, 0.55), browCol: '#3a1d66', browY: 1.36, browW: 1.05,
      mc: [0, 3.28, 1.36], mR: 0.52, mTilt: 0.0, mouthY: -0.09, mouthW: 0.44, mouthCol: '#3a1250', blushX: 0.45, blushY: 1.2, buck: true, toothCol: '#fffaf0',
      heartY: 0.72, heartX: 1.08, heartS: 0.3, mouthPivot: true,
    });
    r.on('head').mark('muzzle', [0, 3.2, 1.95]);
    return { height: 4.6, glowC: col('#ff5aa0'), tex: scaleTex(), mat: { rough: 0.45, ns: 0.45, rimK: 0.16, sss: col('#c9a0ff').multiplyScalar(0.04) } };
  }
  function animEjderha(m, dt, st, s) {
    const B = m.B, P = bph(st), pt = bpt(st), dying = st.dying >= 0;
    const br = Math.sin(s.t * 1.5 + s.ph);
    if (s.mv > 0.03) s.walk += dt * (3 + 2 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4);
    const calm = (P === 'idle') && !(st.move > 0.05) && !(st.roar >= 0) && !(st.windup >= 0) && !(st.attack >= 0), pre = preAggro(s, st, P, dt);
    B.body.scale.set(1 + 0.018 * br, 1 + 0.022 * br, 1 + 0.018 * br);
    // walk: the hips roll, the neck bobs against them, the tail swings the other way, the little arms swing
    B.hips.rotation.z = Math.sin(ph) * 0.08 * k; B.hips.rotation.y = Math.sin(ph) * 0.05 * k; B.hips.position.y += Math.abs(Math.cos(ph)) * 0.1 * k;
    B.legL.rotation.x = Math.sin(ph) * 0.4 * k; B.legR.rotation.x = -Math.sin(ph) * 0.4 * k;
    B.legL.position.y += Math.max(0, Math.sin(ph)) * 0.15 * k; B.legR.position.y += Math.max(0, -Math.sin(ph)) * 0.15 * k;
    // idle: looks about now and then
    s.lkT = (s.lkT ?? frand(1, 3)) - dt;
    if (s.lkT < 0) { s.lkT = frand(1.8, 4); s.lkTo = fpick([0, 0, -0.4, 0.35, 0.2, -0.25]); }
    s.lk = damp(s.lk || 0, calm && pre < 0.05 ? s.lkTo || 0 : 0, 2.5, dt);
    B.neck.rotation.y = Math.sin(s.t * 0.6 + s.ph) * 0.12 + s.lk * 0.6 - B.hips.rotation.y; B.neck.rotation.x = 0.03 * br - Math.abs(Math.cos(ph)) * 0.08 * k + 0.04 * k;
    B.head.rotation.z = Math.sin(s.t * 0.9) * 0.05 - B.hips.rotation.z * 0.8; B.head.rotation.x = -0.03 * br; B.head.rotation.y = s.lk * 0.4;
    B.armL.rotation.x = -0.1 * br + Math.sin(ph) * 0.35 * k; B.armR.rotation.x = -0.1 * br - Math.sin(ph) * 0.35 * k;
    s.flap += dt * (1.3 + 1.2 * k);
    let wAmp = 0.14, wBase = 0.05;
    const wag = (() => { if (!calm || pre > 0.05) return 0; const a = act(s, 'wagT', dt, 3, 6, 1.4, true); return a >= 0 ? Math.sin(PI * a) : 0; })();
    for (let i = 1; i <= 5; i++) {
      const t = B['t' + i]; t.rotation.y = Math.sin(s.t * 1.3 - i * 0.55 + s.ph) * (0.08 + i * 0.02) - Math.sin(ph - i * 0.4) * 0.06 * k + Math.sin(s.t * 9 - i * 0.7) * 0.12 * wag;
      t.rotation.x = Math.sin(s.t * 0.9 - i * 0.4) * 0.03;
    }
    { const ws = calm && pre < 0.05 ? act(s, 'wsT', dt, 6, 10, 1.6, true) : -1; if (ws >= 0) { const e = Math.sin(PI * ws); wBase += 0.75 * e; wAmp += 0.08 * e; B.chest.scale.setScalar(1 + 0.04 * e); B.neck.rotation.x -= 0.12 * e; s.eyeK = lerp(1, 0.6, e); } }   // a big wing stretch
    let jaw = 0, glow = 0;
    if (st.windup >= 0) {   // bite: pull back
      const w = smooth01(st.windup);
      B.neck.rotation.x = -0.35 * w; B.head.rotation.x = -0.25 * w; jaw = 0.45 * w; B.body.rotation.x = -0.08 * w;
    }
    if (st.attack >= 0) {   // bite: lunge + snap
      const a = st.attack, l = Math.sin(PI * Math.min(1, a * 1.5));
      B.neck.rotation.x = lerp(-0.35, 0.55, smooth01(a * 3)) * (1 - smooth01((a - 0.4) / 0.6)); B.head.rotation.x = 0.25 * l;
      jaw = a < 0.2 ? 0.45 : 0; B.body.rotation.x = 0.12 * l;
    }
    if (st.roar >= 0) {
      const a = st.roar, up = smooth01(a / 0.22) * (1 - smooth01((a - 0.82) / 0.18));   // playful "RAWR!" with a happy head wiggle
      B.neck.rotation.x = -0.45 * up; B.head.rotation.x = -0.3 * up; jaw = 0.6 * up;
      B.head.rotation.z += Math.sin(s.t * 9) * 0.14 * up; B.neck.rotation.y += Math.sin(s.t * 4.5) * 0.1 * up;
      B.body.rotation.x = -0.12 * up; wBase += 0.6 * up; wAmp += 0.3 * up; s.flap += dt * 6 * up;
      B.armL.rotation.x = -1.0 * up; B.armR.rotation.x = -1.0 * up; B.armL.rotation.z = 0.4 * up; B.armR.rotation.z = -0.4 * up;
    }
    if (st.fireball >= 0) {
      const a = st.fireball, ch = smooth01(a / 0.38) * (1 - smooth01((a - 0.8) / 0.2));
      B.neck.rotation.x = -0.25 * ch; B.head.rotation.x = -0.12 * ch; glow = a < 0.8 ? smooth01(a / 0.38) : 1 - smooth01((a - 0.8) / 0.15); jaw = 0.2 * ch;
      for (const sa of [0.4, 0.575, 0.75]) { const d = a - sa; if (d > 0 && d < 0.12) { const p = Math.sin(PI * d / 0.12); B.neck.rotation.x += 0.5 * p; B.head.rotation.x += 0.2 * p; jaw = 0.2 + 0.5 * p; } }
    }
    if (st.stomp >= 0) {   // (Round 6: a little squat first, the wings snap up as it lands)
      const a = st.stomp, up = smooth01((a - 0.1) / 0.4), hit = smooth01((a - 0.55) / 0.07), rec = smooth01((a - 0.7) / 0.3), squat = bump(a, 0.18);
      const lift = up * (1 - hit), snap = bump(a - 0.56, 0.22);
      B.hips.position.y += 0.45 * lift - 0.16 * squat; B.hips.rotation.x = -0.3 * lift + 0.06 * squat; B.legL.rotation.x = -0.7 * lift; B.legR.rotation.x = -0.35 * lift;
      B.armL.rotation.x = -1.1 * lift; B.armR.rotation.x = -1.1 * lift; wBase += 0.5 * lift + 0.9 * snap - 0.15 * squat; jaw = 0.4 * lift;
      const sq = hit * (1 - rec);
      B.hips.scale.set(1 + 0.08 * sq + 0.05 * squat, 1 - 0.1 * sq - 0.07 * squat, 1 + 0.08 * sq + 0.05 * squat); B.neck.rotation.x = 0.2 * sq - 0.25 * lift + 0.1 * squat;
      s.eyeK = 1 - 0.3 * squat;
    }
    if (st.breath >= 0) {
      const a = st.breath, inh = smooth01(a / 0.33) * (1 - smooth01((a - 0.33) / 0.05)), fire = smooth01((a - 0.33) / 0.06) * (1 - smooth01((a - 0.88) / 0.1));
      B.neck.rotation.x = -0.45 * inh + 0.3 * fire; B.head.rotation.x = -0.2 * inh + 0.18 * fire; B.chest.scale.setScalar(1 + 0.1 * inh);
      jaw = 0.2 * inh + 0.6 * fire; glow = Math.max(inh, fire);
      B.neck.rotation.y += Math.sin(s.t * 3) * 0.08 * fire;
    }
    // ── Round 6: 'sigh' (1.6 s: 0–0.4 the head droops, wings fold, big eyes · 0.4–0.6 breathes in, the chest swells ×1.1 · at 0.55 a
    // soft blow, jaw 0.3 — GAME lets the hearts out · 0.6–1 the head tilts) and 'charmed' (4 s: sits back, hands clasped at its
    // chest, head tilted and swaying, slow wing flutter, a fast tail wag, slow happy blinks). GAME sets st.breath etc. to −1. ──
    if (P === 'sigh') {
      const dr = smooth01(pt / 0.4) * (1 - smooth01((pt - 0.9) / 0.1)), inh = smooth01((pt - 0.4) / 0.15) * (1 - smooth01((pt - 0.55) / 0.08));
      const blow = bump(pt - 0.53, 0.2), tilt = smooth01((pt - 0.6) / 0.15) * (1 - smooth01((pt - 0.9) / 0.1));
      B.neck.rotation.x += 0.28 * dr - 0.18 * inh; B.head.rotation.x += 0.2 * dr - 0.1 * inh; B.head.rotation.z += 0.22 * tilt; B.neck.rotation.y *= 1 - dr;
      wBase -= 0.2 * dr; wAmp *= 1 - 0.7 * dr; B.chest.scale.setScalar(1 + 0.1 * inh + 0.05 * blow);
      jaw = Math.max(jaw, 0.3 * blow); s.eyeK = lerp(1, 1.2, dr); s.mouthO = Math.max(blow, 0.3 * inh); s.browY = 0.03 * dr;
      B.armL.rotation.x -= 0.3 * dr; B.armR.rotation.x -= 0.3 * dr;
    }
    if (P === 'charmed') {
      const kk = smooth01(pt / 0.08) * (1 - smooth01((pt - 0.93) / 0.07));
      B.hips.position.y -= 0.32 * kk; B.hips.rotation.x -= 0.22 * kk; B.legL.rotation.x -= 0.55 * kk; B.legR.rotation.x -= 0.55 * kk;
      B.body.rotation.x = (B.body.rotation.x || 0) + 0.1 * kk; B.neck.rotation.x += 0.12 * kk;
      B.armL.rotation.x = lerp(B.armL.rotation.x, -1.05, kk); B.armR.rotation.x = lerp(B.armR.rotation.x, -1.05, kk);
      B.armL.rotation.z = lerp(B.armL.rotation.z, -0.55, kk); B.armR.rotation.z = lerp(B.armR.rotation.z, 0.55, kk);
      B.head.rotation.z += (0.22 + 0.1 * Math.sin(s.t * 1.8)) * kk; B.neck.rotation.z = Math.sin(s.t * 1.8) * 0.08 * kk; B.neck.rotation.y *= 1 - kk;
      wBase += 0.25 * kk; wAmp = lerp(wAmp, 0.22, kk); s.flap += dt * 0.6 * kk;
      for (let i = 1; i <= 5; i++) B['t' + i].rotation.y += Math.sin(s.t * 11 - i * 0.6) * 0.16 * kk;
      const sb = 0.5 + 0.5 * Math.sin(s.t * 1.6); s.eyeK = lerp(1, 0.5 + 0.5 * (1 - Math.pow(sb, 6)) * 0.4, kk); s.mouthW = kk;
    }
    // before it notices Feza: sulking, curled up — lying low, chin on its arms, tail curled round, wings folded, sleepy eyes
    if (pre > 0.01) {
      B.hips.position.y -= 0.5 * pre; B.hips.rotation.x += 0.12 * pre; B.legL.rotation.x -= 0.6 * pre; B.legR.rotation.x -= 0.6 * pre;
      B.chest.rotation.x = 0.14 * pre; B.neck.rotation.x += 0.2 * pre; B.head.rotation.x -= 0.32 * pre; B.neck.rotation.y = lerp(B.neck.rotation.y, 0.25, pre); B.head.rotation.z += 0.12 * pre;
      B.armL.rotation.x = lerp(B.armL.rotation.x, -0.9, pre); B.armR.rotation.x = lerp(B.armR.rotation.x, -0.9, pre);
      for (let i = 1; i <= 5; i++) B['t' + i].rotation.y = lerp(B['t' + i].rotation.y, 0.5 + Math.sin(s.t * 0.7 - i) * 0.03, pre);
      wBase -= 0.12 * pre; wAmp *= 1 - 0.8 * pre; s.eyeK = lerp(s.eyeK, 0.55, pre);
    }
    // hit: the wings flinch in, the head recoils, eyes squeezed
    if (st.hurt > 0 && !dying) { const h = st.hurt * st.hurt; wBase -= 0.3 * h; B.head.rotation.x -= 0.25 * h; B.neck.rotation.x -= 0.15 * h; s.eyeK = Math.min(s.eyeK, 1 - 0.4 * h); }
    // the goodbye (the root's hops and twirl are in build): 0–0.3 surprised, then its arms open for a hug with fast happy flaps and
    // a wagging tail, happy bounces after 0.3
    if (dying) {
      const d = st.dying, open = smooth01((d - 0.08) / 0.15), sur = bump(d, 0.12);
      B.armL.rotation.x = -0.6 * open; B.armR.rotation.x = -0.6 * open; B.armL.rotation.z = 1.1 * open; B.armR.rotation.z = -1.1 * open;
      B.neck.rotation.x -= 0.2 * sur + 0.1 * open; B.head.rotation.x -= 0.1 * open; B.head.rotation.z += Math.sin(s.t * 7) * 0.1 * open;
      s.flap += dt * 7 * open; wBase += 0.55 * open; wAmp += 0.4 * open;
      for (let i = 1; i <= 5; i++) B['t' + i].rotation.y += Math.sin(s.t * 13 - i * 0.6) * 0.2 * open;
      jaw = Math.max(jaw, 0.25 * sur);
    }
    const f = Math.sin(s.flap * TAU * 0.5);
    B.wingL.rotation.z = wBase + f * wAmp; B.wingR.rotation.z = -(wBase + f * wAmp);
    B.wingL.rotation.y = -0.1 * f; B.wingR.rotation.y = 0.1 * f;
    B.jaw.rotation.x = jaw + (st.hurt > 0 ? 0.2 * st.hurt : 0);
    const gs = glow > 0.01 ? glow * (1 + 0.12 * Math.sin(s.t * 30)) : 0.0001;
    B.glow.scale.setScalar(gs);
  }

  // ════════════════ Round 3: volcano creatures (kaplumbaga, ateskusu) ════════════════
  // Soft six-sided turtle scute (a hexagonal dome cap; local +y = out of the shell, radius 1).
  function hexCap() {
    // (small characters, LODK < 0.7: a leaner dome without the hidden flat bottom — the flange sits inside the shell anyway)
    const lo = LODK < 0.7;
    return gx('hexCap' + (lo ? 'L' : ''), () => {
      const pts = (lo ? [[0.93, -0.12], [1, 0.02], [0.9, 0.22], [0.6, 0.4], [0.3, 0.48], [0, 0.49]] : [[0, -0.12], [0.93, -0.12], [1, 0.02], [0.93, 0.2], [0.66, 0.38], [0.32, 0.47], [0, 0.49]]).map(p => new THREE.Vector2(p[0], p[1]));
      return seamNormals(new THREE.LatheGeometry(new THREE.SplineCurve(pts).getPoints(lo ? 5 : 8), 6, 0));   // corners at ±z
    });
  }
  // Turtle carapace: a glowing lava cap (it only shows in the thin gaps → molten seams) covered by rows of basalt scutes,
  // a marginal rim and a warm tan plastron underneath. C centre, A radii; phis = scute rows (polar angle from the top);
  // counts per row; o: {scute, scuteD, seam, seamK, rim, plastron, plates (belly plates with dark seams: the little turtle
  // shows its belly while it tumbles), rot (row offsets)}. Returns {edgeY, rx, rz}.
  const SHELL_TH = PI * 0.56;
  function turtleShell(r, C, A, phis, counts, o) {
    const w = sN(44, 18), h = sN(22, 10);
    const cap = gx('shellCap@' + w, () => new THREE.SphereGeometry(1, w, h, 0, TAU, 0, SHELL_TH));
    r.fx(1, 0).add(cap, hdr(o.seam, o.seamK ?? 1.0), C, null, A);   // (≈ 1: glows without blooming over the plates)
    const sc = col(o.scute), sd = col(o.scuteD), out = new THREE.Color();
    const avgR = Math.sqrt((A[0] * A[0] + A[2] * A[2]) / 2);
    r.fx(0, 0.08);   // matte stone plates (glossy ones mirror the bright sky at the gameplay camera's grazing angle)
    phis.forEach((phi, i) => {
      const n = counts[i], lo = i > 0 ? (phi - phis[i - 1]) : (phis[1] - phi), hi = i < phis.length - 1 ? (phis[i + 1] - phi) : lo;
      const mer = Math.hypot(avgR * Math.cos(phi), A[1] * Math.sin(phi)) * (lo + hi) / 2;   // spacing along the meridian
      const tan = TAU * Math.sin(phi) * avgR / n;                                               // spacing around the row
      // honeycomb: corners along the meridian, rows offset by half a plate (width √3·R, row step 1.5·R); fill < 1 = seams
      const fill = o.fill ?? 0.97, sx = fill * tan / Math.sqrt(3), sz = fill * 1.12 * mer / 1.5, ss = Math.min(sx, sz);
      for (let j = 0; j < n; j++) {
        const th = (j + (i % 2) * 0.5 + (o.rot || 0)) / n * TAU;
        const [p, nn] = onEll(C, A, phi, th), nl = Math.hypot(...nn);
        const tg = [A[0] * Math.cos(phi) * Math.sin(th), -A[1] * Math.sin(phi), A[2] * Math.cos(phi) * Math.cos(th)];
        const P0 = new THREE.Vector3(...p), rr = Math.max(sx, sz);
        const cf = (x, y, z) => out.copy(sc).lerp(sd, smooth01(Math.hypot(x - P0.x, y - P0.y, z - P0.z) / rr) * 0.9);
        r.add(hexCap(), cf, [p[0] - nn[0] / nl * ss * 0.06, p[1] - nn[1] / nl * ss * 0.06, p[2] - nn[2] / nl * ss * 0.06], qb(nn, tg), [sx, ss * 0.42, sz]);
      }
    });
    const edgeY = C[1] + A[1] * Math.cos(SHELL_TH), rx = A[0] * Math.sin(SHELL_TH), rz = A[2] * Math.sin(SHELL_TH);
    r.fx(0, 0.12).add(G.torus(TAU, 0.16, 40), o.rim, [C[0], edgeY, C[2]], [PI / 2, 0, 0], [rx * 1.02, rz * 1.02, avgR * 0.5]);
    const PC = [C[0], edgeY - A[1] * 0.1, C[2]], PA = [rx * 0.94, A[1] * 0.26, rz * 0.94];
    if (!o.plates) {
      r.fx(0, 0.06).add(G.sphere(40, 16), vgrad(edgeY - A[1] * 0.3, edgeY, [[0, mixc(o.plastron, '#8a6034', 0.35)], [1, o.plastron]]), PC, null, PA);
    } else {
      // Belly (seen while the little turtle tumbles): a dark seam base covered by 2 × 3 rounded matte tan plates, so it reads
      // as a turtle's plastron (not a bright blank disc that blooms toward the camera).
      r.fx(0, 0).add(G.sphere(40, 16), mixc(o.plastron, '#2e1c10', 0.8), PC, null, PA);
      const pc = col(o.plastron), pd = mixc(o.plastron, '#7a5230', 0.5), out = new THREE.Color();
      for (const [uc, hu, vc, hv] of [[0.31, 0.28, -0.6, 0.27], [0.4, 0.37, 0, 0.3], [0.31, 0.28, 0.6, 0.27]]) for (const sd of [-1, 1]) {
        const u = uc * sd, w = Math.sqrt(Math.max(0.02, 1 - u * u - vc * vc)), p = [PC[0] + PA[0] * u, PC[1] - PA[1] * w, PC[2] + PA[2] * vc];
        const n = [-u / PA[0], w / PA[1], -vc / PA[2]], hw = PA[0] * hu, hl = PA[2] * hv, P0 = new THREE.Vector3(...p);
        const cf = (x, y, z) => out.copy(pc).lerp(pd, smooth01((Math.max(Math.abs(x - P0.x) / hw, Math.abs(z - P0.z) / hl) - 0.55) / 0.45));
        r.add(G.rbox(2), cf, p, qb(n, [0, 0, 1]), [hw * 2, PA[1] * 0.3, hl * 2]);   // (local +y = into the belly: a flat slab)
      }
    }
    r.fx(0, 0);
    return { edgeY, rx, rz };
  }
  // Little volcano on base point B: base radius br, height h; crater with a glowing lava pool, lava drips down the sides.
  // o: {key, rock, rockD, ash, crater, drips: n}. Returns the crater top [x, y, z].
  function volcano(r, B, br, h, o) {
    const cr = br * 0.42;
    const pts = [[0, 0], [br, 0], [br * 0.96, h * 0.1], [br * 0.8, h * 0.34], [br * 0.6, h * 0.62], [cr * 1.2, h * 0.9], [cr * 1.08, h], [cr * 0.9, h * 0.985], [cr * 0.72, h * 0.9], [0, h * 0.84]];
    const out = new THREE.Color(), a = col(o.rockD), b = col(o.rock), c = col(o.ash), cw = col(o.crater || '#9a3a1a');
    r.fx(0, 0.2).add(lathe('volc' + o.key, pts, 30, 4), (x, y, z) => {
      const t = (y - B[1]) / h, rr = Math.hypot(x - B[0], z - B[2]);
      if (rr < cr * 0.98 && t > 0.8) return out.copy(cw);
      const n = fbm3(x * 7 / h + 3, y * 7 / h, z * 7 / h);
      return out.copy(a).lerp(b, clamp(smooth01(t * 1.2) * (0.6 + 0.6 * n), 0, 1)).lerp(c, smooth01((t - 0.72) / 0.22) * 0.75);
    }, B);
    // lava pool (a flattened glowing dome in the crater)
    r.fx(1, 0).add(G.sphere(20, 10), hdr('#ffd04a', 2.1), [B[0], B[1] + h * 0.86, B[2]], null, [cr * 0.94, h * 0.07, cr * 0.94]);
    r.add(G.sphere(12, 8), hdr('#fff2b0', 2.4), [B[0] + cr * 0.2, B[1] + h * 0.9, B[2] + cr * 0.15], null, [cr * 0.3, h * 0.04, cr * 0.3]);
    // lava drips running down the cone from the rim
    const nd = o.drips ?? 3;
    for (let i = 0; i < nd; i++) {
      const az = (i / nd) * TAU + 0.5 + (i & 1) * 0.4, len = 0.55 + 0.25 * ((i * 7) % 3) / 2;
      for (let k = 0; k < 3; k++) {
        const tt = 0.93 - k * 0.2 * len, [p, n] = onLathe(pts, h * tt, az, h * 0.005);
        const nr = Math.hypot(n[0], n[2]), tg = [Math.sin(az) * (-n[1]), nr, Math.cos(az) * (-n[1])];
        const wd = br * (0.11 - k * 0.025);
        r.add(G.sphere(12, 8), hdr(k ? '#ff8a24' : '#ffc23a', k ? 1.7 : 2), [B[0] + p[0], B[1] + p[1], B[2] + p[2]], qb(tg, n), [wd, h * 0.12 * len, wd * 0.45]);
      }
    }
    r.fx(0, 0);
    return [B[0], B[1] + h, B[2]];
  }
  // Steam puffs over a crater: three soft balls on bones 'puff0..2' (animated by puffAnim; they rise, grow and fade out).
  // (happy: the colours of the puffs on the happy face — the big turtle's goodbye puffs are pink)
  function puffs(r, parent, top, size, happy) {
    for (let i = 0; i < 3; i++) {   // each puff = a tiny cloud of three soft balls
      r.bone('puff' + i, parent, top);
      const s0 = size * (1 - i * 0.1);
      for (const md of happy ? [1, 2] : [0]) {
        const c = md === 2 ? happy[i % happy.length] : i === 1 ? '#fff6ee' : '#f2e8e0';
        r.mood = md;
        r.fx(0.45, 0).add(G.sphere(14, 10), c, top, null, s0);
        r.add(G.sphere(12, 8), c, [top[0] + s0 * 0.85, top[1] - s0 * 0.25, top[2] + s0 * 0.1], null, s0 * 0.7);
        r.add(G.sphere(12, 8), c, [top[0] - s0 * 0.8, top[1] - s0 * 0.2, top[2] - s0 * 0.15], null, s0 * 0.62);
      }
      r.mood = 0;
    }
    r.fx(0, 0);
  }
  function puffAnim(m, s, dt, rate, rise, on = 1) {
    s.puffT = (s.puffT || 0) + dt * rate;
    for (let i = 0; i < 3; i++) {
      const b = m.B['puff' + i]; if (!b) continue;
      const u = (s.puffT + i / 3) % 1, k = Math.pow(Math.sin(PI * u), 0.8) * (0.55 + 0.9 * u) * on;
      b.position.y += u * rise; b.position.x += Math.sin(u * 5 + i * 2) * rise * 0.12; b.position.z -= u * rise * 0.15;
      b.scale.setScalar(Math.max(0.0001, k));
    }
  }

  // ── Minik Lav Kaplumbağası: chubby mint turtle; its shell is basalt plates with glowing seams and a tiny smoking volcano.
  // Attack: tucks into the shell (wind-up) and rolls forward (attack). ──
  const TURTLE = { skin: '#62d3a4', skinL: '#b8f5d8', skinD: '#2f9c7a', spot: '#3fb489', nail: '#fff1cf', plastron: '#c49454' };
  function buildKaplumbaga(r, o) {
    const E = o.elite;
    const skin = E ? '#3fc28e' : TURTLE.skin, skinL = TURTLE.skinL, skinD = E ? '#1f8a66' : TURTLE.skinD;
    const C = [0, 0.3, -0.03], A = [0.44, 0.3, 0.48];
    r.bone('body', 'root', [0, 0.3, 0]);
    r.bone('head', 'body', [0, 0.25, 0.3]);
    const LEG = [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]];
    for (const [n, sx, sz] of LEG) r.bone(n, 'body', [0.25 * sx, 0.2, 0.2 * sz]);
    r.bone('tail', 'body', [0, 0.2, -0.4]);
    const sk = vgrad(0.02, 0.5, [[0, skinD], [0.45, skin], [1, mixc(skin, skinL, 0.35)]]);
    // legs: stubby with round toe nubs
    for (const [n, sx, sz] of LEG) {
      r.on(n).fx(0, 0.3).seg([0.25 * sx, 0.22, 0.2 * sz], [0.3 * sx, 0.07, 0.24 * sz], 0.075, sk, 0.07, 12);
      r.add(G.sphere(16, 12), sk, [0.3 * sx, 0.055, 0.25 * sz + 0.02], null, [0.085, 0.06, 0.1]);
      r.fx(0, 0.5);
      for (let k = -1; k <= 1; k++) r.add(G.sphere(8, 6), TURTLE.nail, [0.3 * sx + k * 0.035, 0.035, 0.25 * sz + 0.1 * (sz > 0 ? 1 : 0.4)], null, [0.022, 0.018, 0.022]);
      r.fx(0, 0);
    }
    r.on('tail'); cone(r, [0, 0.2, -0.4], [0, -0.25, -1], 0.13, 0.05, skin, 10);
    // shell with glowing seams + tiny volcano on top
    r.on('body');
    turtleShell(r, C, A, [0.62, 0.96, 1.26, 1.52], [6, 8, 10, 12], {
      scute: E ? '#5e4238' : '#56463f', scuteD: E ? '#2e1c18' : '#2c221f', seam: '#ff7018', rim: E ? '#3a2620' : '#3a2e2a', plastron: TURTLE.plastron, plates: true,
    });
    const top = volcano(r, [0, 0.5, -0.03], 0.21, 0.3, { key: 'S', rock: '#5e4c46', rockD: '#33262a', ash: '#c4b6ac', drips: 3 });
    puffs(r, 'body', [top[0], top[1] + 0.03, top[2]], 0.05);
    // head + neck, little spots, face
    const HC = [0, 0.35, 0.5], HR = 0.17;
    r.on('head').fx(0, 0.3).seg([0, 0.24, 0.3], [0, 0.31, 0.45], 0.085, sk, 0.09, 12);
    r.add(G.sphere(32, 24), vgrad(0.2, 0.52, [[0, skin], [1, mixc(skin, skinL, 0.45)]]), HC, null, [HR * 1.05, HR, HR]);
    r.fx(0, 0.3);
    for (const sp of [[0.08, 0.14, 0.022], [-0.05, 0.155, 0.018], [0.13, 0.05, 0.015], [-0.12, 0.08, 0.017]]) {
      const [p, q] = onSphere(sp[0], sp[1], HR, -0.002); r.push(HC).add(G.sphere(10, 6), TURTLE.spot, p, q, [sp[2], sp[2], sp[2] * 0.3]).pop();
    }
    r.fx(0, 0);
    face(r, HC, HR, { bone: 'head', tilt: 0.3, ex: 0.072, ey: 0.035, er: 0.058, iris: '#3a2412', skin: mixc(skin, skinL, 0.3), browCol: '#1f5a44', browY: 1.38, mouthY: -0.085, mouthW: 0.06, heartY: 0.85, heartX: 1.25, blushX: 0.35 });
    if (E) crown(r.on('head'), [0, 0.5, 0.46], 0.42);
    r.on('head').mark('muzzle', [0, 0.32, 0.66]);
    return { height: 0.8, glowC: col('#ff9a3a'), mat: { rough: 0.8, sss: col('#c8ffe0').multiplyScalar(0.04), rim: '#fff0d0', rimK: 0.26 } };
  }
  // Roll (GAME's rollStep): st.attack = distance rolled / lane length while GAME carries it along the lane (st.move 1), then
  // st.attack = 1 for the dizzy recover. The shell tumbles about as fast as it really rolls (whole turns over the lane, so it
  // ends upright), stays tucked all the way and only pops out once it has stopped — a little dizzy. A roll cut short (bump)
  // rocks back upright first.
  const TK_ROLL_R = 0.42, TK_N = 72;   // rolling radius of the tucked shell (m, before the elite scale); lift table steps
  // How high the body must ride so the tumbling shell (rim, plates, belly and its little volcano) stays on the ground: the
  // lowest point of everything on the 'body' bone per tumble angle (from the shared geometry, once per type/elite).
  function tkTable(def) {
    const g = def.g[0], P = g.attributes.position, SI = g.attributes.skinIndex, bi = def.bones.findIndex(b => b.name === 'body');
    const by = def.bones[bi].pos[1], bz = def.bones[bi].pos[2], tab = new Float32Array(TK_N + 1).fill(1e9);
    const cs = [], sn = [];
    for (let k = 0; k < TK_N; k++) { cs.push(Math.cos(k / TK_N * TAU)); sn.push(Math.sin(k / TK_N * TAU)); }
    for (let i = 0; i < P.count; i++) {
      if (SI.getX(i) !== bi) continue;
      const y = P.getY(i) - by, z = P.getZ(i) - bz;
      for (let k = 0; k < TK_N; k++) { const v = y * cs[k] - z * sn[k]; if (v < tab[k]) tab[k] = v; }
    }
    tab[TK_N] = tab[0];
    return tab;
  }
  function tkLift(def, a) {
    const tab = def.rollTab || (def.rollTab = tkTable(def));
    const u = (((a / TAU) % 1) + 1) % 1 * TK_N, i = Math.floor(u);
    return tab[0] - lerp(tab[i], tab[i + 1], u - i);
  }
  function animKaplumbaga(m, dt, st, s) {
    const B = m.B, R = m.root.position;
    if (s.mv > 0.03) s.walk += dt * (7 + 4 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4), br = Math.sin(s.t * 2.2 + s.ph);
    const rolling = st.attack >= 0 && st.attack < 0.999, rec = st.attack >= 0.999 && st.dying < 0;
    if (st.windup >= 0) { s.rx0 = R.x; s.rz0 = R.z; }
    s.recT = rec ? (s.recT || 0) + dt : 0;
    // tumble angle (whole turns: the lane length is the distance so far / st.attack, since GAME moves the root)
    if (rolling && st.dying < 0) {
      if (!s.rollN) {
        const d = s.rx0 !== undefined ? Math.hypot(R.x - s.rx0, R.z - s.rz0) : 0, sc = m.mesh.scale.x || 1;
        s.rollN = d > 0.03 && st.attack > 0.004 ? clamp(Math.round(d / st.attack / (TAU * TK_ROLL_R * sc)), 1, 3) : 1;
      }
      s.rollA = TAU * s.rollN * st.attack;
    } else {
      s.rollN = 0;
      const up = Math.round((s.rollA || 0) / TAU) * TAU;
      s.rollA = damp(s.rollA || 0, up, 9, dt);
      if (Math.abs(s.rollA - up) < 0.003) s.rollA = 0;
    }
    const tilt = Math.abs(s.rollA - Math.round(s.rollA / TAU) * TAU);   // how far from upright
    let tuck = 0;
    if (st.windup >= 0) tuck = smooth01(st.windup * 1.7);
    if (rolling) tuck = 1;
    else if (rec) tuck = Math.max(1 - smooth01((s.recT - 0.1) / 0.3), smooth01(tilt / 0.5));
    s.duck = Math.max(damp(s.duck || 0, 0, 6, dt), st.hurt > 0.5 ? 0.6 : 0);
    tuck = st.dying >= 0 ? 0 : Math.max(tuck, s.duck);
    s.tk = (st.windup >= 0 || st.attack >= 0) ? tuck : damp(s.tk ?? 0, tuck, 12, dt);
    const T = s.tk, out = 1 - T;
    // waddle: diagonal leg pairs, shell sway, head bob; idle: looks around
    B.body.position.y += Math.abs(Math.sin(ph)) * 0.025 * k * out + br * 0.004 - 0.1 * T;
    B.body.rotation.z = Math.sin(ph) * 0.06 * k * out;
    const lg = Math.sin(ph) * 0.6 * k * out;
    B.legFL.rotation.x = lg; B.legBR.rotation.x = lg; B.legFR.rotation.x = -lg; B.legBL.rotation.x = -lg;
    B.head.rotation.x = Math.sin(ph * 2) * 0.05 * k + Math.sin(s.t * 1.3 + s.ph) * 0.05;
    B.head.rotation.y = Math.sin(s.t * 0.6 + s.ph) * 0.28 * (1 - k) * out;
    B.tail.rotation.y = Math.sin(s.t * 3 + s.ph) * 0.35;
    // tuck: head, legs and tail slide into the shell
    if (T > 0.001) {
      B.head.position.z -= 0.24 * T; B.head.position.y -= 0.03 * T; B.head.scale.setScalar(1 - 0.62 * T);
      for (const n of ['legFL', 'legFR', 'legBL', 'legBR']) { const b = B[n]; b.scale.setScalar(1 - 0.7 * T); b.position.y += 0.05 * T; b.position.x *= 1 - 0.3 * T; }
      B.tail.scale.setScalar(1 - 0.8 * T);
    }
    if (st.windup >= 0) {   // trembling in the shell, the little volcano puffs faster
      const w = st.windup;
      B.body.rotation.z += Math.sin(s.t * 60) * 0.05 * w; B.body.rotation.x = -0.12 * smooth01(w);
      B.body.scale.set(1 + 0.05 * w, 1 - 0.06 * w, 1 + 0.05 * w);
    }
    if (s.rollA) { B.body.rotation.x += s.rollA; B.body.position.y += tkLift(m.def, s.rollA); }
    if (rec && s.recT < 1) {   // popped out after the roll: a little dizzy head wobble
      const dz = out * (1 - smooth01((s.recT - 0.5) / 0.45));
      B.head.rotation.z += Math.sin(s.t * 9) * 0.26 * dz; B.head.rotation.y += Math.cos(s.t * 9) * 0.2 * dz;
      B.body.rotation.z += Math.sin(s.t * 9 + 1) * 0.05 * dz;
    }
    // the little volcano stops puffing while the shell tumbles (its puffs would roll with it)
    s.pk = damp(s.pk ?? 1, rolling ? 0 : 1, rolling ? 24 : 3, dt);
    puffAnim(m, s, dt, st.windup >= 0 ? 1.4 : 0.5, 0.3, s.pk);
  }

  // ── Ateş Kuşu: round fluffy fire chick with a glowing flame crest, flame tail, tiny fluttering wings, a little beak.
  // Flies (EDEF hover); ranged: flicks slow embers. ──
  const FLAME_P = [[0, 0.02], [0.17, 0.035], [0.29, 0.12], [0.35, 0.27], [0.34, 0.42], [0.27, 0.57], [0.17, 0.71], [0.08, 0.84], [0, 0.95]];
  function buildAteskusu(r, o) {
    const E = o.elite;
    // a golden-orange chick (reads apart from the glowing Ateşçik) with a red-orange flame crest and tail. The feathers stay
    // a deep gold (red channel ≤ ~#e8): lit by the volcano's strong warm light, brighter tones went over the bloom threshold
    // and the whole chick glowed out to a pale peach-pink.
    const feat = E ? '#d4600a' : '#dc6e0a', featL = E ? '#dc7a0c' : '#e4860e', featT = E ? '#e28e12' : '#e89a14', belly = E ? '#e4a650' : '#e8b458';
    const beak = '#ff7412', beakD = '#d8480e', cy = 0.36;
    r.bone('body', 'root', [0, cy, 0]);
    r.bone('crest', 'body', [0, cy + 0.24, 0.02]);
    r.bone('wingL', 'body', [0.26, cy + 0.02, -0.02]); r.bone('wingR', 'body', [-0.26, cy + 0.02, -0.02]);
    r.bone('tail', 'body', [0, cy - 0.06, -0.25]);
    r.bone('feet', 'body', [0, cy - 0.24, 0.04]);
    r.bone('beak', 'body', [0, cy - 0.03, 0.27]);
    const fcol = (() => { const out = new THREE.Color(), a = col(feat), b = col(featL), c = col(featT), bl = col(belly); return (x, y, z) => {
      out.copy(a).lerp(b, smooth01((y - (cy - 0.3)) / 0.36)).lerp(c, smooth01((y - (cy + 0.08)) / 0.2) * 0.65);
      const bel = smooth01((z - 0.08) / 0.16) * smooth01((cy + 0.02 - y) / 0.18);
      return out.lerp(bl, bel * 0.9);
    }; })();
    const flame = lathe('flame', FLAME_P, 24, 0);   // (unlit: the raw 9-point profile is enough for these small flames)
    // (flames: bright enough to glow, but capped so their bloom doesn't wash over the chick's face)
    const fl = (y0, y1, k = 0.58) => vgrad(y0, y1, [[0, hdr('#fff0b0', Math.min(1.4, 1.9 * k))], [0.3, hdr('#ffc23a', 1.55 * k)], [0.62, hdr('#ff7a1c', 1.3 * k)], [1, hdr('#ff3d2e', 1.15 * k)]]);
    // fluffy round body (a few soft fluff bumps on the chest and the head top)
    r.on('body').fx(0, 0).add(G.sphere(36, 28), fcol, [0, cy, 0], null, [0.3, 0.29, 0.29]);
    for (const t of [[0.07, cy - 0.12, 0.25, 0.06], [-0.07, cy - 0.13, 0.25, 0.055], [0, cy - 0.17, 0.235, 0.055]]) r.add(G.sphere(12, 8), belly, [t[0], t[1], t[2]], null, [t[3], t[3] * 0.8, t[3] * 0.5]);
    // flame crest (glows; wobbles in the shader)
    const wobF = (x, y) => smooth01((y - (cy + 0.2)) / 0.3);
    r.on('crest').fx(1, 0, 0, wobF);
    r.add(flame, fl(cy + 0.2, cy + 0.7), [0, cy + 0.19, 0.03], [-0.25, 0, 0], [0.3, 0.52, 0.3]);
    r.add(flame, fl(cy + 0.2, cy + 0.56), [0.09, cy + 0.19, -0.03], [-0.45, 0, -0.5], [0.22, 0.38, 0.22]);
    r.add(flame, fl(cy + 0.2, cy + 0.56), [-0.09, cy + 0.19, -0.03], [-0.45, 0, 0.5], [0.22, 0.38, 0.22]);
    r.add(flame, fl(cy + 0.18, cy + 0.5), [0, cy + 0.17, -0.11], [-0.95, 0, 0], [0.2, 0.36, 0.2]);
    // flame tail feathers
    r.on('tail').fx(1, 0, 0, 0.6);
    for (const t of [[0, -1.2, 0, 0.2, 0.34], [0.07, -1.35, -0.35, 0.15, 0.26], [-0.07, -1.35, 0.35, 0.15, 0.26]]) r.add(flame, fl(cy - 0.2, cy + 0.2), [t[0], cy - 0.06, -0.24], [t[1], 0, t[2]], [t[3], t[4], t[3]]);
    // tiny wings: rounded feathers with glowing flame tips
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'wingL' : 'wingR').fx(0, 0);
      r.add(G.sphere(20, 14), vgrad(cy - 0.16, cy + 0.1, [[0, '#e0701a'], [1, feat]]), [0.31 * sd, cy - 0.02, -0.03], [0.15, 0, sd * 0.35], [0.055, 0.15, 0.12]);
      r.fx(0, 0.03);   // rounded feather tips fanned at the wing's end (red-orange)
      for (const f of [[0.34, cy - 0.13, 0.04, 0.3], [0.345, cy - 0.14, -0.04, 0], [0.335, cy - 0.12, -0.11, -0.35]]) {
        r.add(G.sphere(12, 8), vgrad(cy - 0.22, cy - 0.05, [[0, '#dc4a16'], [1, '#e2701a']]), [f[0] * sd, f[1], f[2]], [f[3], 0, sd * 0.3], [0.035, 0.08, 0.045]);
      }
      r.fx(0, 0);
    }
    // little feet tucked under while flying
    r.on('feet').fx(0, 0.4);
    for (const sd of [-1, 1]) {
      r.add(G.sphere(10, 8), beak, [0.08 * sd, cy - 0.28, 0.06], null, [0.035, 0.03, 0.045]);
      for (let k = -1; k <= 1; k++) r.add(G.sphere(8, 6), beakD, [0.08 * sd + k * 0.025, cy - 0.3, 0.1], null, [0.014, 0.012, 0.03]);
    }
    r.fx(0, 0);
    face(r, [0, cy + 0.02, 0], 0.29, { bone: 'body', tilt: 0.36, ex: 0.122, ey: 0.07, er: 0.104, iris: '#5a2408', skin: mixc(featL, featT, 0.5), browCol: '#b8480e', browY: 1.32, noMouth: true, blushCol: '#ff5f86', blushX: 0.45, blushY: 0.95, heartY: 0.95, heartX: 1.18 });
    // beak: mischievous = closed, a little crooked (grin); overjoyed = wide open "cheep!" with a pink tongue
    const BK = [0, cy - 0.035, 0.275];
    r.on('beak');
    r.mood = 1; r.fx(0, 0.7);
    r.add(G.cone(14), beak, [BK[0], BK[1] + 0.005, BK[2] + 0.04], [PI / 2 + 0.2, 0, 0.14], [0.058, 0.1, 0.042]);
    r.add(G.cone(12), beakD, [BK[0], BK[1] - 0.03, BK[2] + 0.02], [PI / 2 + 0.55, 0, 0.14], [0.04, 0.06, 0.028]);
    r.mood = 2;
    r.add(G.cone(14), beak, [BK[0], BK[1] + 0.03, BK[2] + 0.035], [PI / 2 - 0.3, 0, 0], [0.058, 0.1, 0.042]);
    r.add(G.cone(12), beakD, [BK[0], BK[1] - 0.055, BK[2] + 0.025], [PI / 2 + 0.85, 0, 0], [0.045, 0.075, 0.03]);
    r.fx(0, 0.4).add(G.sphere(12, 8), '#7a1f30', [BK[0], BK[1] - 0.01, BK[2] + 0.01], null, [0.04, 0.035, 0.03]);
    r.add(G.sphere(10, 8), '#ff7fa4', [BK[0], BK[1] - 0.03, BK[2] + 0.03], null, [0.028, 0.014, 0.022]);
    r.mood = 0; r.fx(0, 0);
    if (E) crown(r.on('crest'), [0, cy + 0.26, 0.1], 0.38);
    r.on('beak').mark('muzzle', [0, cy - 0.04, 0.4]);
    // (matte, fluffy feathers: a glossier coat mirrored the environment's big softbox as a pale peach-pink sheen)
    return { height: 0.78, glowC: col('#ffd23f'), mat: { rough: 0.88, sss: col('#ffb060').multiplyScalar(0.02), rim: '#ffc070', rimK: 0.1, wob: 0.03, wobF: 6, wobS: 9 } };
  }
  function animAteskusu(m, dt, st, s) {
    const B = m.B;
    s.flap += dt * (17 + 6 * s.mv + (st.attack >= 0 ? 8 : 0));
    const f = Math.sin(s.flap), fl = Math.sin(s.t * 13 + s.ph) * 0.5 + Math.sin(s.t * 21.7) * 0.3 + Math.sin(s.t * 7.3) * 0.2;
    let wb = 0.35, wa = 0.6, wob = 0.03 + 0.012 * s.mv;
    B.body.position.y += Math.sin(s.flap * 0.5) * 0.015;
    B.body.rotation.x = 0.16 * s.mv;
    B.crest.scale.set(1 - 0.05 * fl, 1 + 0.1 * fl, 1 - 0.05 * fl);
    B.crest.rotation.x = -0.12 * s.mv + Math.sin(s.t * 2.3) * 0.06; B.crest.rotation.z = Math.sin(s.t * 3.1 + s.ph) * 0.08;
    B.tail.rotation.y = Math.sin(s.t * 4 + s.ph) * 0.22; B.tail.rotation.x = Math.sin(s.t * 3.1) * 0.1 - 0.15 * s.mv;
    B.feet.rotation.x = 0.35 * s.mv + Math.sin(s.t * 2.4) * 0.08;
    B.beak.rotation.x = Math.max(0, Math.sin(s.t * 1.7 + s.ph) - 0.93) * 3;   // an occasional little "cheep"
    if (st.windup >= 0) {   // puffs up, leans back, crest flares, wings back
      const w = smooth01(st.windup);
      B.body.scale.set(1 + 0.12 * w, 1 + 0.1 * w, 1 + 0.12 * w); B.body.rotation.x -= 0.32 * w;
      B.crest.scale.multiplyScalar(1 + 0.35 * w); wb += 0.7 * w; wa *= 1 - 0.5 * w; wob += 0.03 * w;
      B.body.position.x += Math.sin(s.t * 55) * 0.01 * st.windup;
    }
    if (st.attack >= 0) {   // flick! the head (and crest) snap forward
      const k2 = Math.sin(PI * st.attack);
      B.body.rotation.x += 0.5 * k2; B.body.position.z += 0.16 * k2; B.beak.rotation.x -= 0.25 * k2;
      B.crest.rotation.x += 0.4 * k2;
    }
    B.wingL.rotation.z = wb + f * wa; B.wingR.rotation.z = -(wb + f * wa);
    B.wingL.rotation.y = -0.2 * f; B.wingR.rotation.y = 0.2 * f;
    m.U.uWob.value.x = wob;
  }

  // ════════════════ Round 3: zone bosses (kraljole, kostebekusta, lavkaplumbaga) ════════════════
  // They animate from st.phase (string) + st.phaseT (0..1) (+ st.move, st.hurt, st.dying, st.burrow for the mole).
  // Unknown / missing phase = 'idle'; while st.dying ≥ 0 (overjoyed) the phase is ignored: they cheer and wave goodbye.
  const bph = st => (st.dying >= 0 ? 'dying' : (st.phase || 'idle'));
  const bpt = st => clamp(+st.phaseT || 0, 0, 1);
  const bump = (x, w) => (x > 0 && x < w ? Math.sin(PI * x / w) : 0);   // one soft pulse of width w
  function star5Geo() {   // (same shape + key as the toy soldier's shako star)
    return extrude('star5', () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i & 1 ? 0.2 : 0.5; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } return s; }, 0.08, 0.04, 4, 0.3);
  }

  // ── Kral Jöle: a big glossy turquoise royal jelly (~2.8 m with its crown): golden crown with gems and pearls, royal purple
  // cape with an ermine collar, tiny jelly arms, a heart sceptre. Hops, spits jelly blobs, summons little jellies. ──
  const KJ_S = [2.72, 2.34, 2.72], KJ_CAPE = [[1.64, 0.03], [1.63, 0.3], [1.53, 0.75], [1.35, 1.15], [1.14, 1.46], [1.06, 1.55]];
  function capeGeo(inner) {
    const sg = sN(40, 16);
    return gx('kjCape' + (inner ? 'i' : 'o') + '@' + sg, () => {
      let v = new THREE.SplineCurve(KJ_CAPE.map(p => new THREE.Vector2(p[0] * (inner ? 0.975 : 1), p[1]))).getPoints(30);
      if (inner) v = v.reverse();   // reversed profile → normals face the body (the lining)
      return new THREE.LatheGeometry(v, sg, PI - 1.3, 2.6);
    });
  }
  function buildKraljole(r, o) {
    const base = col('#27c6d6'), light = col('#b8f6f0'), deep = col('#0c7aa4');
    const TOP = 0.86 * KJ_S[1];
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('crown', 'body', [0, TOP - 0.06, -0.12]);
    r.bone('armL', 'body', [1.28, 0.95, 0.3]); r.bone('armR', 'body', [-1.28, 0.95, 0.3]);
    r.bone('scep', 'armR', [-1.74, 0.48, 0.45]);   // the sceptre stays upright while the arm moves (counter-rotated in anim)
    r.bone('gem', 'scep', [-1.86, 1.74, 0.56]);
    r.bone('cape', 'body', [0, 1.58, -0.9]);
    const wob = (x, y) => smooth01((y - 0.1) / 1.5);
    // jelly body (same gumdrop as the little jellies, royal size) + painted gloss + tiny bubbles
    r.on('body').push([0, 0, 0], null, KJ_S);
    r.fx(0, 0, 0, wob).add(lathe('gumdrop', JOLE_GP, 64), vgrad(0, 1.9, [[0, deep], [0.45, base], [1, mixc(base, light, 0.45)]]));
    r.fx(1, 0, 0, wob);
    { const [p, n] = onLathe(JOLE_GP, 0.66, -1.15, 0.003); r.add(G.sphere(16, 12), hdr('#ffffff', 1.3), p, qz(...n, 0.9), [0.1, 0.035, 0.012]); }
    { const [p, n] = onLathe(JOLE_GP, 0.55, -1.42, 0.003); r.add(G.sphere(10, 8), hdr('#ffffff', 1.25), p, qz(...n), [0.022, 0.022, 0.008]); }
    { const [p, n] = onLathe(JOLE_GP, 0.28, 0.95, 0.003); r.add(G.sphere(12, 8), hdr('#ffffff', 1.15), p, qz(...n, -0.4), [0.06, 0.02, 0.008]); }
    r.fx(0, 1, 0, wob);
    for (const b of [[0.16, 1.1, 0.03], [0.26, 1.9, 0.022], [0.13, -2.4, 0.026], [0.34, 0.75, 0.018], [0.22, -1.5, 0.02], [0.44, 2.4, 0.016], [0.12, 2.8, 0.02], [0.3, -2.9, 0.018]]) {
      const [p, n] = onLathe(JOLE_GP, b[0], b[1], -b[2] * 0.3);
      r.add(G.sphere(12, 8), mixc(light, '#ffffff', 0.35), p, qz(...n), [b[2], b[2], b[2] * 0.6]);
    }
    r.pop().fx(0, 0);
    // tiny jelly arms (the right one holds a golden sceptre with a pink heart)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1, 0, 0.5);
      r.add(G.sphere(24, 18), vgrad(0.4, 1.2, [[0, deep], [1, mixc(base, light, 0.25)]]), [1.5 * sd, 0.8, 0.36], [0, 0, 0.55 * sd], [0.25, 0.4, 0.25]);
      r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), [1.43 * sd, 0.98, 0.58], null, [0.05, 0.03, 0.015]);
    }
    r.on('scep').fx(0, 2).seg([-1.73, 0.3, 0.44], [-1.85, 1.6, 0.55], 0.045, GOLD, 0.04, 12);
    r.add(G.sphere(12, 8), GOLD, [-1.73, 0.28, 0.44], null, 0.075).add(G.sphere(12, 8), GOLD, [-1.85, 1.62, 0.55], null, 0.085);
    r.on('gem').fx(0.55, 1).add(heartGeo(), hdr('#ff5aa8', 1.35), [-1.86, 1.8, 0.57], [-0.1, 0, 0], 0.3);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 2), [-1.91, 1.86, 0.6], null, 0.025);
    r.fx(0, 0);
    // royal cape (velvet outside, golden lining), gold hem, ermine collar with little black tails and gold clasps
    r.on('cape').fx(0, 0.1, 1).uv(8, 3).add(capeGeo(false), vgrad(0, 1.6, [[0, '#4a1a8e'], [0.6, '#6a2cc0'], [1, '#7e3ad4']]));
    r.uv(null).fx(0, 0.6).add(capeGeo(true), vgrad(0, 1.6, [[0, '#e8a832'], [1, '#ffd66a']]));
    r.fx(0, 2).add(G.torus(2.62, 0.035, 48), GOLD, [0, 0.05, 0], [PI / 2, 0, -PI / 2 - 1.31], [1.64, 1.64, 1.4]);
    r.fx(0, 0).add(G.torus(2.9, 0.11, 48), '#fbf7ef', [0, 1.58, 0], [PI / 2, 0, -PI / 2 - 1.45], [1.03, 1.03, 1.0]);
    for (let i = 0; i < 7; i++) {
      const a = -PI / 2 - 1.3 + (i + 0.5) / 7 * 2.6, x = Math.cos(a) * 1.13, z = Math.sin(a) * 1.13;
      r.add(G.sphere(8, 6), '#2a1e28', [x, 1.6 + (i & 1) * 0.03, z], null, [0.03, 0.05, 0.03]);
    }
    r.fx(0, 2);
    for (const sd of [-1, 1]) { const a = -PI / 2 + sd * 1.45; r.add(G.sphere(14, 10), GOLD, [Math.cos(a) * 1.03, 1.58, Math.sin(a) * 1.03], null, 0.1); }
    r.fx(0, 0);
    // big golden crown (kjCrown; the same crown flies about as EMODEL.jellyCrown in the bonus game)
    r.on('crown').push([0, TOP - 0.1, -0.12], [-0.22, 0, 0]);
    kjCrown(r);
    r.pop().fx(0, 0);
    r.on('crown').mark('crown', [0, TOP + 0.22, -0.2]);
    // face (model space on the front of the jelly)
    face(r, [0, 0.86, 0], 1.3, {
      bone: 'body', tilt: 0.42, ex: 0.4, ey: 0.1, er: 0.31, iris: mixc(deep, '#081a2a', 0.6), skin: mixc(base, light, 0.1), browCol: mixc(deep, '#06121c', 0.72),
      browY: 1.36, mouthY: -0.34, mouthW: 0.36, heartY: 0.72, heartX: 1.05, heartS: 0.28, mouthPivot: true,
    });
    r.on('body').mark('muzzle', [0, 0.52, 1.42]);
    return { height: 2.8, glowC: col('#7ef0ff'), tex: texOf('fabric'), dieHop: 0.14,
      mat: { rough: 0.2, ns: 0.6, sss: mixc(base, '#ffffff', 0.2).multiplyScalar(0.06), rim: mixc(light, '#ffffff', 0.4), rimK: 0.24, rimP: 2.4, wob: 0.03, wobF: 1.0, wobS: 3.5 } };
  }
  // The king's big golden crown around the current frame (its base centre at the origin, +y up): band with gems, velvet cap,
  // six points with pearls, a heart on top (≈ 1.15 m wide, 0.9 m tall).
  function kjCrown(r) {
    r.fx(0,.55).add(G.torus(TAU,.13,28),'#887557',[0,.14,0],[PI/2,0,0],[.54,.54,.32]);
    r.add(G.torus(PI*1.52,.10,22),'#6f5c43',[0,.33,0],[PI/2,0,.18],[.53,.53,.27]);
    for(let j=0;j<7;j++){const a=j*TAU/7,sx=Math.sin(a),cz=Math.cos(a),h=.23+(j%3)*.085;r.add(G.rbox(1),'#a5977d',[sx*.50,.29+h*.25,cz*.50],[0,0,-sx*.09],[.082,h,.07]);cone(r,[sx*.50,.29+h*.75,cz*.50],[sx*.12,1,cz*.12],.09,.031,'#b9aa8c');}
    r.add(G.dodeca(),'#9b8c73',[0,.63,0],null,[.15,.18,.07]);for(const sd of [-1,1])r.add(G.rbox(1),'#221c23',[sd*.06,.67,.067],[0,0,sd*.22],[.066,.035,.016]);r.add(G.rbox(1),'#32232a',[0,.57,.069],null,[.076,.049,.010]);
    r.fx(.55,0).seg([-.04,.46,.075],[.012,.63,.081],.010,hdr('#96372c',1.5),.008,6);
    r.fx(0, 0);
  }
  // ── Round 6 helpers for the bosses' little acts ──
  const _ke = new THREE.Euler(), _kq6 = new THREE.Quaternion();
  // A little idle act: fires every a … b s while `on`, returns its progress 0..1 over len s, or −1 while none plays (paused
  // while not `on`; an act cut short by a phase just stops — they are all small). s[key] holds the countdown.
  function act(s, key, dt, a, b, len, on) {
    let c = s[key] ?? frand(a, b);
    if (c > 0) { s[key] = on ? c - dt : Math.max(c, 1); return -1; }
    c -= dt;
    if (-c >= len || !on) { s[key] = frand(a, b); return -1; }
    s[key] = c; return -c / len;
  }
  // The side a new hit came from (st.hurt jumps up): ±1, random (GAME does not say where the hit came from).
  function hurtSide(s, st) {
    const h = +st.hurt || 0;
    if (h > (s.hPrev || 0) + 0.2) s.hSide = Math.random() < 0.5 ? -1 : 1;
    s.hPrev = h;
    return s.hSide || 1;
  }
  // Pre-aggro loop weight: the boss has not noticed Feza yet (GAME: st.aggro === false), stands in its idle, not walking home.
  function preAggro(s, st, ph, dt) {
    s.preK = damp(s.preK || 0, st.aggro === false && ph === 'idle' && !(st.move > 0.05) && !(st.dying >= 0) ? 1 : 0, 3, dt);
    return s.preK;
  }
  function animKraljole(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st);
    const br = Math.sin(s.t * 2.2 + s.ph);
    let sy = 1 + 0.03 * br, sxz = 1 - 0.018 * br, y = 0, z = 0, rx = 0, rz = 0, ry = 0, armUp = 0, wave = 0, crownL = 0, gem = 0, air = 0, hopY = 0;
    let aL = 0, aR = 0, aLx = 0, aRx = 0, aLy = 0, aRy = 0, scZ = 0, capeF = 0, scT = 0, crY = 0, crSpin = 0, crRz = 0, crRx = 0, crS = 1, crOn = st.crownOff ? 0 : 1;
    const shy = ph === 'shy', calm = ph === 'idle' && !(st.move > 0.05), pre = preAggro(s, st, ph, dt);
    // travelling hops (phase 'move', or walking while idle; 'shy' = quick little tip-toe hops)
    s.hopK = damp(s.hopK || 0, ph === 'move' || ((ph === 'idle' || shy) && st.move > 0.05) ? (shy ? 0.4 : 1) : 0, 5, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (shy ? 2.7 : 1.3 + 0.4 * s.mv);
    {
      const u = s.hop % 1, A = s.hopK;
      if (u < 0.2) { const k = Math.sin(PI * u / 0.2); sy -= 0.16 * k * A; sxz += 0.1 * k * A; }
      else if (u < 0.82) { const k = (u - 0.2) / 0.62; y += Math.sin(PI * k) * 0.45 * A; const e = Math.abs(Math.cos(PI * k)); sy += 0.1 * e * A; sxz -= 0.05 * e * A; air = Math.sin(PI * k) * A * 0.4; crownL -= Math.cos(PI * k) * 0.5 * A; }
      else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.2 * k * A; sxz += 0.12 * k * A; if (!s.landed && A > 0.3) { s.landed = true; s.wobA = 0.06; s.crS = 0; s.crA = 0.6 * A; } }
      if (u < 0.5) s.landed = false;
    }
    switch (ph) {
      case 'hop': {   // big hop toward Feza: crouch 0–0.2 (eyes squeezed in focus, brows up, arms swung back), airborne 0.2–0.8 (a tall
        // stretch at take-off, peak ≈ 1.7 m), lands at 0.8 (slam ring): squash, wobble, the crown springs up twice, the cape flares
        if (t < 0.2) {
          const k = smooth01(t / 0.2); sy *= 1 - 0.3 * k; sxz *= 1 + 0.18 * k; armUp = 0.15 * k; aLx = aRx = 0.75 * k; rx = -0.1 * k;
          s.eyeK = 1 - 0.5 * k; s.browY = 0.03 * k; capeF = 0.25 * k;
        } else if (t < 0.8) {
          const u = (t - 0.2) / 0.6, e = Math.abs(Math.cos(PI * u));
          hopY = Math.sin(PI * u) * 1.7; sy *= 1 + 0.2 * e; sxz *= 1 - 0.09 * e; armUp = 0.5 + 0.5 * Math.sin(PI * u); air = Math.sin(PI * u);
          crownL = -Math.cos(PI * u); rx = 0.12 * Math.sin(PI * u); aLx = aRx = 0.75 * (1 - smooth01(u / 0.25));
        } else {
          const u = (t - 0.8) / 0.2, k = Math.sin(PI * Math.min(1, u * 1.3)) * (1 - 0.5 * u);
          sy *= 1 - 0.36 * k; sxz *= 1 + 0.22 * k; crownL = -0.6 * k;
          if (!s.slam) { s.slam = true; s.wobA = 0.08; s.crS = 0; s.crA = 1; }
        }
        if (t < 0.8) s.slam = false;
        break;
      }
      case 'spit': {   // puffs up (0–0.35), then spits three slow jelly blobs (pulses at 0.42 / 0.6 / 0.78): the cheeks bulge just
        // before each, the mouth pops into an "O"
        const k = smooth01(t / 0.35) * (1 - smooth01((t - 0.86) / 0.14));
        sxz *= 1 + 0.12 * k; sy *= 1 + 0.05 * k; rx = -0.14 * k;
        for (const c of [0.42, 0.6, 0.78]) {
          const p = bump(t - c, 0.12), cb = bump(t - c + 0.06, 0.07);
          rx += 0.3 * p; z += 0.16 * p; sy *= 1 - 0.1 * p - 0.03 * cb; sxz *= 1 + 0.06 * p + 0.07 * cb;
          s.mouthO = Math.max(s.mouthO, bump(t - c + 0.04, 0.13));
        }
        armUp = 0.25 * k;
        break;
      }
      case 'summon': {   // bounces three times with the heart sceptre held high (it glows)
        const k = smooth01(t / 0.18) * (1 - smooth01((t - 0.84) / 0.16));
        const b = Math.abs(Math.sin(t * PI * 3));
        y += b * 0.4 * k; sy *= 1 + 0.08 * (b - 0.5) * k; armUp = k; wave = Math.sin(t * PI * 8) * k; gem = k; crownL = Math.sin(t * PI * 6) * 0.4 * k;
        s.wobA = Math.max(s.wobA || 0, 0.04 * k);
        break;
      }
      case 'roar': {
        if (s.intro) {   // his entrance (after the double take, see build): three royal bounces, the heart sceptre raised high
          const u = clamp((t - 0.25) / 0.75, 0, 1), k = smooth01(u / 0.12) * (1 - smooth01((u - 0.86) / 0.14)), b = Math.abs(Math.sin(u * PI * 3));
          y += b * 0.42 * k; sy *= 1 + 0.1 * (b - 0.5) * k; sxz *= 1 - 0.04 * (b - 0.5) * k; rx = -0.08 * k;
          aR = 1.35 * k; aRx = -0.3 * k; aL = 0.35 * k + 0.25 * Math.sin(s.t * 9) * k; gem = k; crownL = Math.sin(u * PI * 6) * 0.45 * k;
          s.wobA = Math.max(s.wobA || 0, 0.05 * k);
          break;
        }
        // playful royal shout: stretches up tall, arms up, jiggles
        const k = smooth01(t / 0.2) * (1 - smooth01((t - 0.8) / 0.2));
        sy *= 1 + 0.15 * k; sxz *= 1 - 0.06 * k; armUp = k; wave = Math.sin(s.t * 14) * 0.5 * k; rz = Math.sin(s.t * 9) * 0.06 * k; rx = -0.12 * k;
        crownL = Math.abs(Math.sin(s.t * 12)) * 0.5 * k; s.wobA = Math.max(s.wobA || 0, 0.05 * k);
        break;
      }
      case 'shy': {   // no crown: "oops!" for 1.2 s (big eyes, an O mouth, a startled little jump, both hands fly up to his bare head),
        // then he pats his head, looks up where the crown went, shivers a little; GAME walks him (st.move = quick tip-toe hops)
        const o = 1 - smooth01((s.pT - 1.0) / 0.25), ent = smooth01(s.pT / 0.15);
        s.eyeK = lerp(1.1, 1.25, o); s.browY = lerp(0.02, 0.05, o); s.mouthO = o * ent;
        y += o * bump(s.pT, 0.35) * 0.25;
        armUp = 0.95 * ent; aLx = aRx = -0.2 * ent; aLy = -0.5 * ent; aRy = 0.5 * ent;
        const pat = (1 - o) * ent;
        aL += 0.22 * Math.max(0, Math.sin(s.t * 10)) * pat; aR += 0.22 * Math.max(0, Math.sin(s.t * 10 + PI)) * pat;
        rx -= 0.16 * ent; rz += Math.sin(s.t * 38) * 0.013 * ent; sxz *= 1 + 0.008 * Math.sin(s.t * 41) * ent;
        break;
      }
      case 'crownon': {   // 0.8 s: both arms up, the crown is back at 0.35 (pops in 1.2 → 1 with a little squash), a proud flourish
        const up = smooth01(t / 0.3) * (1 - smooth01((t - 0.45) / 0.3));
        armUp = up; crOn = t >= 0.35 ? 1 : 0;
        crS = 1 + 0.2 * (1 - smooth01((t - 0.35) / 0.3));
        const land = bump(t - 0.35, 0.2); sy *= 1 - 0.1 * land; sxz *= 1 + 0.06 * land; crownL -= 0.5 * land;
        const fl = smooth01((t - 0.5) / 0.15) * (1 - smooth01((t - 0.9) / 0.1));
        aR += 0.9 * fl; wave += Math.sin(s.t * 10) * 0.5 * fl; scT = smooth01((t - 0.5) / 0.4); sy *= 1 + 0.06 * fl; rx -= 0.1 * fl; gem = Math.max(gem, fl);
        s.eyeK = 1 - 0.3 * fl; s.mouthW = fl;
        break;
      }
      case 'blush': {   // 3.5 s: a surprised stretch (0–0.12), then both hands on his cheeks, rocking side to side (±0.12 at 1.6 Hz)
        // with giggly squeezed eyes and a wide smile; recovers 0.9–1
        const sur = bump(t, 0.16), k = smooth01((t - 0.08) / 0.08) * (1 - smooth01((t - 0.9) / 0.1));
        sy *= 1 + 0.15 * sur; sxz *= 1 - 0.06 * sur;
        s.eyeK = lerp(1 + 0.3 * sur, 0.35, k); s.mouthO = sur * (1 - k); s.mouthW = k; s.browY = 0.04 * sur + 0.02 * k;
        armUp = 0.55 * k; aLx = aRx = -0.3 * k; aLy = -1.0 * k; aRy = 1.0 * k;   // (his little arms swing forward, up to his cheeks)
        const rk = Math.sin(s.t * TAU * 1.6);
        rz += rk * 0.12 * k; y += Math.abs(rk) * 0.05 * k; ry += rk * 0.06 * k;
        s.wobA = Math.max(s.wobA || 0, 0.035 * k);
        break;
      }
      case 'dying': {   // overjoyed: tosses his crown up (≈ 0.8 m, spinning), catches it back on his head, then waves goodbye
        const d = st.dying, u = clamp((d - 0.05) / 0.3, 0, 1);
        armUp = 0.95; wave = Math.sin(s.t * 11) * (u > 0 && u < 1 ? 0.3 : 1); gem = 0.6;
        crY = Math.sin(PI * u) * 0.8; crSpin = smooth01(u) * TAU * 2; crownL -= 0.6 * bump(u - 0.85, 0.3);
        break;
      }
    }
    // idle: every 5–8 s a sceptre twirl, then he re-adjusts his crown
    const ia = act(s, 'twT', dt, 5, 8, 1.7, calm && pre < 0.05 && !st.crownOff);
    if (ia >= 0) {
      scT = smooth01(ia / 0.5); aR += 0.35 * bump(ia, 0.55);
      const ad = bump(ia - 0.55, 0.45); aL += 1.55 * ad; aLx -= 0.45 * ad; crRz += Math.sin((ia - 0.55) / 0.45 * PI * 3) * 0.09 * ad; crY += 0.05 * ad;
    }
    // before he notices Feza: polishing the heart on his sceptre (held up in front, the left hand rubbing it)
    if (pre > 0.01) {
      aR += 0.3 * pre; aRx -= 0.3 * pre; aRy += 0.75 * pre; scZ -= 0.5 * pre;
      aL += (0.6 + 0.12 * Math.sin(s.t * 9 + 1)) * pre; aLx -= 0.3 * pre; aLy -= (0.95 + 0.18 * Math.sin(s.t * 9)) * pre;
      if (Math.sin(s.t * 0.9 + s.ph) > 0.93) s.mouthO = Math.max(s.mouthO, pre);   // now and then a "hah!" on the gem
      rx += 0.07 * pre; ry -= 0.1 * pre; s.eyeK = lerp(s.eyeK, 0.7, pre); gem = Math.max(gem, (0.25 + 0.35 * Math.max(0, Math.sin(s.t * 2.3))) * pre);
    }
    // hit: the crown tilts over, his eyes squeeze
    if (st.hurt > 0 && ph !== 'dying') {
      const h = st.hurt * st.hurt, sd = hurtSide(s, st);
      crRz += sd * 0.32 * h; crRx -= 0.16 * h; crY += 0.06 * h; s.eyeK = Math.min(s.eyeK, 1 - 0.45 * h);
    }
    // the crown springs on each landing (two damped bounces, up to 0.15 m), the gem flashes, the cape flares
    if (s.crS !== undefined && s.crS < 0.7) {
      s.crS += dt;
      const A = s.crA ?? 1, k = Math.exp(-s.crS * 4) * Math.abs(Math.sin(s.crS * PI / 0.21));
      crY += 0.15 * k * A; crownL -= 0.2 * k * A; gem = Math.max(gem, 0.7 * A * Math.exp(-s.crS * 7));
      capeF = Math.max(capeF, A * Math.exp(-s.crS * 5) * Math.sin(Math.min(PI, s.crS * PI / 0.3)));
    }
    // The big hop's height is kept in s.airY: when the hop is cut short in the air (cheered up → 'dying', Feza napped → the
    // boss calms to 'idle'), the king falls down with gravity and lands with a squash instead of snapping to the ground.
    if (ph === 'hop') {
      if (dt > 0) s.airV = clamp(((s.airY || 0) - hopY) / dt, -8, 8);   // (+ = falling)
      s.airY = hopY;
    } else if (s.airY > 0) {
      s.airV = (s.airV || 0) + 16 * dt;
      s.airY = Math.max(0, s.airY - s.airV * dt);
      const k = Math.min(1, s.airY / 1.7);
      air = Math.max(air, k); armUp = Math.max(armUp, 0.5 + 0.5 * k); crownL -= 0.8 * k;
      if (s.airY <= 0) { s.airV = 0; s.landT = 1; s.wobA = Math.max(s.wobA || 0, 0.08); s.crS = 0; s.crA = 1; }
    }
    y += s.airY || 0;
    if (s.landT > 0) {   // (only after such a cut-short hop; the normal hop lands inside its own phase)
      const k = Math.sin(PI * (1 - s.landT));
      sy *= 1 - 0.3 * k; sxz *= 1 + 0.18 * k; crownL -= 0.6 * k;
      s.landT = Math.max(0, s.landT - dt / 0.32);
    }
    B.body.position.set(B.body.position.x, B.body.position.y + y, B.body.position.z + z);
    B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    if (!crOn) B.crown.scale.setScalar(0.0001);   // (st.crownOff: the crown is off his head — GAME's EMODEL.jellyCrown flies about)
    else B.crown.scale.set(crS / sxz, crS / sy, crS / sxz);   // the crown stays rigid on the squashy jelly
    B.crown.position.y += crownL * 0.12 + crY;
    B.crown.rotation.set(-0.05 * crownL + crRx, crSpin, Math.sin(s.t * 1.1 + s.ph) * 0.04 + crownL * 0.05 + crRz);
    const sw = Math.sin(s.t * 1.8 + s.ph) * 0.08;
    B.armL.rotation.z = 0.1 + sw + 1.9 * armUp + 0.35 * wave + aL; B.armR.rotation.z = -(0.1 + sw + 1.7 * armUp - 0.35 * wave + aR);
    B.armL.rotation.x = -0.3 * armUp + aLx; B.armR.rotation.x = -0.3 * armUp + aRx; B.armL.rotation.y = aLy; B.armR.rotation.y = aRy;
    B.scep.rotation.order = 'ZYX';   // (the twirl spins it about its own shaft, inside the upright counter-turn)
    B.scep.rotation.set(0.3 * armUp - 0.85 * aRx, scT * TAU - aRy, -B.armR.rotation.z * 0.92 + scZ);
    B.gem.scale.setScalar(1 + 0.45 * gem + 0.12 * gem * Math.sin(s.t * 20));
    B.cape.rotation.x = 0.35 * air + 0.03 * Math.sin(s.t * 1.5 + s.ph) + 0.3 * capeF; B.cape.scale.x = 1 + 0.12 * capeF;
    s.wobA = damp(s.wobA ?? 0.022, 0.022, 3, dt);
    if (st.hurt > 0.5) s.wobA = Math.max(s.wobA, 0.05 * st.hurt);
    m.U.uWob.value.x = s.wobA;
  }

  // ── Usta Köstebek: the master mole (~2.6 m): yellow hard hat with a spinning drill, goggles and a headlamp, blue overalls
  // with a star patch and a wrench, big pink paws. Burrows (st.burrow, travelling mound), pops up, throws dirt clods. ──
  const DRILL_TILT = -0.62, DRILL_AX = new THREE.Vector3(0, Math.cos(DRILL_TILT), Math.sin(DRILL_TILT));
  function drillGeo() {
    const rs = sN(22, 12);
    return gx('drill@' + rs, () => {
      const g = new THREE.ConeGeometry(1, 1, rs, 16, true); g.translate(0, 0.5, 0);
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {   // two spiral flutes
        v.fromBufferAttribute(p, i);
        const a = Math.atan2(v.x, v.z), k = 1 + 0.2 * Math.sin(2 * a + v.y * 15) * smooth01((1 - v.y) / 0.2);
        p.setXYZ(i, v.x * k, v.y, v.z * k);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  function sphPart(key, phi0, phiL, th0, thL) {
    const w = sN(40, 14), h = sN(24, 8);
    return gx('sp' + key + '@' + w, () => new THREE.SphereGeometry(1, w, h, phi0, phiL, th0, thL));
  }
  function buildKostebekusta(r, o) {
    const fur = '#8a5a38', furD = '#5a3720', furL = '#b3825a', pink = '#ee8aa6', pinkD = '#d06284', nose = '#ff5a90', snout = '#d8a088';
    const hat = '#f0b41c', hatD = '#c97a0a', denim = '#4274dc', denimD = '#2a50a8', steel = '#c9d3e2', brass = '#d8a84a';
    const dirt = '#7a5234', dirtD = '#4e321f', dirtL = '#a47650';
    const BC = [0, 0.84, 0], BA = [0.92, 0.8, 0.84], HC = [0, 1.62, 0.14];
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('head', 'body', [0, 1.3, 0.12]);
    r.bone('armL', 'body', [0.8, 1.22, 0.18]); r.bone('armR', 'body', [-0.8, 1.22, 0.18]);
    r.bone('clod', 'armR', [-1.05, 0.86, 0.88]);
    r.bone('footL', 'body', [0.38, 0.1, 0.3]); r.bone('footR', 'body', [-0.38, 0.1, 0.3]);
    const HP = [0, 2.04, -0.1], HS = 1.1, hatTop = [0, HP[1] + 0.34 * HS * Math.cos(DRILL_TILT), HP[2] + 0.34 * HS * Math.sin(DRILL_TILT)];
    r.bone('hat', 'head', HP);   // (the hard hat with its goggles and headlamp: knocked askew when dizzy)
    r.bone('drill', 'hat', hatTop);
    r.bone('mound', 'root', [0, 0, 0]);
    // chubby body with blue overalls (lower half, bib with a star patch pocket, straps, gold buttons, a wrench)
    r.on('body').add(G.sphere(40, 30), vgrad(0.05, 1.6, [[0, furD], [0.4, fur], [1, mixc(fur, furL, 0.5)]]), BC, null, BA);
    r.add(G.sphere(10, 8), pink, [0, 0.4, -0.84], null, [0.1, 0.08, 0.12]);   // tiny tail
    r.fx(0, 0.05, 1).uv(6, 3);
    const dn = vgrad(0.05, 1.3, [[0, denimD], [0.55, denim], [1, mixc(denim, '#7aa2f0', 0.3)]]);
    r.add(sphPart('lowH', 0, TAU, PI * 0.44, PI * 0.56), dn, BC, null, [BA[0] * 1.02, BA[1] * 1.02, BA[2] * 1.02]);
    r.add(sphPart('bib', PI / 2 - 0.5, 1.0, 0.3 * PI, 0.2 * PI + 0.02), dn, BC, null, [BA[0] * 1.03, BA[1] * 1.03, BA[2] * 1.03]);
    r.add(sphPart('pocket', PI / 2 - 0.2, 0.4, 0.36 * PI, 0.08 * PI), denimD, BC, null, [BA[0] * 1.045, BA[1] * 1.045, BA[2] * 1.045]);
    { const wy = BC[1] + BA[1] * Math.cos(PI * 0.47), wk = Math.sin(PI * 0.47) * 1.03;   // slim stitched waistband
      r.uv(null).fx(0, 0.3).add(G.torus(TAU, 0.035, 48), denimD, [0, wy, 0], [PI / 2, 0, 0], [BA[0] * wk, BA[2] * wk, 0.9]); }
    {
      const [p, n] = onEll(BC, [BA[0] * 1.06, BA[1] * 1.06, BA[2] * 1.06], 0.4 * PI, 0);
      r.fx(0, 0.5).add(star5Geo(), '#ffd23f', p, qz(...n), [0.26, 0.26, 0.3]);
    }
    r.fx(0, 0.2);
    for (const sd of [-1, 1]) {   // straps from the bib corners over the shoulders
      const pts = [[0.3 * PI, 0.46], [0.19 * PI, 0.6], [0.09 * PI, 1.0]].map(([ph, az]) => onEll(BC, [BA[0] * 1.03, BA[1] * 1.03, BA[2] * 1.03], ph, az * sd)[0]);
      r.seg(pts[0], pts[1], 0.055, denim, 0.055, 10).seg(pts[1], pts[2], 0.055, denim, 0.055, 10);
      r.fx(0, 2).add(G.sphere(14, 10), GOLD, pts[0], null, [0.07, 0.07, 0.04]).fx(0, 0.2);
    }
    r.fx(0, 2).seg([0.74, 0.84, 0.42], [0.82, 0.5, 0.5], 0.032, steel, 0.032, 8);   // a wrench hanging from the waistband
    r.add(G.torus(PI * 1.35, 0.3, 16), steel, [0.83, 0.45, 0.51], [0, 0.5, PI + 0.4], 0.075);
    r.fx(0, 0);
    // head: fur, pink-tan snout, big glossy nose
    r.on('head').add(G.sphere(40, 30), vgrad(1.1, 2.25, [[0, fur], [1, mixc(fur, furL, 0.6)]]), HC, null, [0.66, 0.61, 0.63]);
    r.add(G.sphere(28, 20), snout, [0, 1.45, 0.64], null, [0.3, 0.25, 0.29]);
    r.fx(0, 1).add(G.sphere(24, 16), nose, [0, 1.58, 0.9], null, [0.17, 0.14, 0.14]);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.5), [-0.05, 1.64, 1.0], null, [0.045, 0.032, 0.02]);
    r.fx(0, 0.4);
    for (const sd of [-1, 1]) r.add(G.sphere(8, 6), '#b83a64', [0.055 * sd, 1.55, 1.02], null, [0.026, 0.02, 0.014]);
    r.fx(0, 0);
    // hard hat (tilted back so the eyes stay visible) with goggles, headlamp and the drill on top
    r.on('hat').push(HP, [DRILL_TILT, 0, 0], HS);
    r.fx(0, 0.35).add(G.hemi(32), vgrad(HP[1] - 0.05, HP[1] + 0.42, [[0, hatD], [0.35, hat], [1, mixc(hat, '#fff0b0', 0.3)]]), [0, 0, 0], null, [0.5, 0.36, 0.52]);
    r.add(G.cyl(1, 1, 36), hatD, [0, 0.01, 0.05], null, [0.58, 0.05, 0.62]);
    r.add(G.torus(PI, 0.2, 24), mixc(hat, '#fff6c8', 0.3), [0, 0.0, 0], [0, PI / 2, 0], [0.51, 0.365, 0.16]);
    r.fx(0, 0.3).add(G.torus(TAU, 0.13, 40), '#5a3a28', [0, 0.07, 0], [PI / 2, 0, 0], [0.505, 0.525, 0.35]);
    const HAT_E = [0.5, 0.36, 0.52];
    for (const sd of [-1, 1]) {   // goggles strapped on the hat
      const [p, n] = onEll([0, 0, 0], HAT_E, 1.28, 0.42 * sd);
      r.push(p, qz(...n));
      r.fx(0, 2).add(G.torus(TAU, 0.28, 24), brass, [0, 0, 0.01], null, [0.1, 0.1, 0.1]);
      r.fx(0.25, 1).add(G.sphere(16, 10), '#8fdcff', [0, 0, 0.02], null, [0.085, 0.085, 0.03]);
      r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.6), [-0.03, 0.03, 0.045], null, [0.022, 0.016, 0.01]);
      r.pop();
    }
    {   // headlamp between the goggles, a little higher
      const [p, n] = onEll([0, 0, 0], HAT_E, 0.95, 0);
      r.push(p, qz(...n));
      r.fx(0, 2).add(G.cyl(1, 1, 18), '#aab4c4', [0, 0, 0.03], [PI / 2, 0, 0], [0.085, 0.08, 0.085]);
      r.fx(1, 0).add(G.sphere(16, 10), hdr('#fff0a8', 1.8), [0, 0, 0.075], null, [0.07, 0.07, 0.025]);
      r.pop();
    }
    r.on('drill').fx(0, 2).add(G.cyl(1, 1, 20), '#8a93a4', [0, 0.36, 0], null, [0.21, 0.08, 0.21]);
    r.add(G.torus(TAU, 0.3, 20), brass, [0, 0.33, 0], [PI / 2, 0, 0], [0.215, 0.215, 0.1]);
    r.add(drillGeo(), (x, y, z) => _gc.set(steel).lerp(_dk.set('#7e8a9e'), 0.5 + 0.5 * Math.sin(2 * Math.atan2(x, z - hatTop[2]) + (y - hatTop[1]) * 34)), [0, 0.39, 0], null, [0.2, 0.44, 0.2]);
    r.pop().fx(0, 0);
    // arms with big pink paws (rounded claws); a dirt clod in the right paw (only shown while throwing)
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').seg([0.8 * sd, 1.22, 0.18], [0.99 * sd, 0.87, 0.55], 0.2, fur, 0.17, 14);
      r.add(G.sphere(20, 14), fur, [0.8 * sd, 1.22, 0.18], null, 0.205).add(G.sphere(18, 12), fur, [0.99 * sd, 0.87, 0.55], null, 0.17);
      r.fx(0, 0.2).add(G.sphere(22, 14), pink, [1.02 * sd, 0.8, 0.62], [0.3, 0, 0], [0.23, 0.14, 0.25]);
      for (let i = 0; i < 4; i++) r.add(G.sphere(10, 8), pinkD, [1.02 * sd + (i - 1.5) * 0.09, 0.78, 0.84], null, [0.055, 0.05, 0.07]);
      r.fx(0, 0);
      r.on(sd > 0 ? 'footL' : 'footR').fx(0, 0.2).add(G.sphere(20, 12), pink, [0.4 * sd, 0.09, 0.42], null, [0.22, 0.1, 0.28]);
      for (let i = 0; i < 3; i++) r.add(G.sphere(8, 6), pinkD, [0.4 * sd + (i - 1) * 0.085, 0.07, 0.66], null, 0.05);
      r.fx(0, 0);
    }
    const mcol = (() => { const out = new THREE.Color(), a = col(dirtD), b = col(dirt), c = col(dirtL); return (x, y, z) => {
      const n = fbm3(x * 3.5, y * 3.5, z * 3.5);
      return out.copy(a).lerp(b, clamp(smooth01((y + 0.2) / 0.5) * 0.8 + 0.4 * n - 0.1, 0, 1)).lerp(c, smooth01((y - 0.2) / 0.3) * n * 0.8);
    }; })();
    r.on('clod').fx(0, 0.1).add(rockGeo(31), mcol, [-1.05, 0.86, 0.88], [0.4, 0.2, 0.1], [0.2, 0.17, 0.19]);
    r.add(G.sphere(8, 6), dirtL, [-0.98, 0.98, 0.92], null, 0.065);
    face(r, HC, 0.63, {
      bone: 'head', tilt: 0.46, ex: 0.23, ey: 0.16, er: 0.155, iris: '#3a2210', skin: mixc(fur, furL, 0.4), browCol: '#3a2212', browY: 1.4, browT: 0.42,
      mc: [0, 1.45, 0.64], mR: 0.28, mTilt: 0.12, mouthY: -0.1, mouthW: 0.2, buck: true, buckW: 0.22, buckH: 0.3, noTongue: true,
      blushX: 0.75, blushY: 1.05, heartY: 0.95, heartX: 1.05, mouthPivot: true,
    });
    // big dirt mound (only while burrowing)
    r.on('mound').fx(0, 0).add(moundGeo(), mcol, [0, -0.2, 0], null, [1.45, 0.8, 1.45]);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU + (i % 3) * 0.3, rr = 1.3 + (i % 2) * 0.25, sz = 0.12 + (i % 3) * 0.045;
      r.add(G.sphere(10, 8), i % 4 === 0 ? dirtL : dirt, [Math.sin(a) * rr, sz * 0.4, Math.cos(a) * rr], null, [sz, sz * 0.75, sz]);
    }
    for (const c of [[0.2, 0.5, 0.12, 0.12], [-0.25, 0.45, -0.15, 0.11], [0.05, 0.56, -0.25, 0.1]]) r.add(G.sphere(10, 8), dirtL, [c[0], c[1], c[2]], null, c[3]);
    r.fx(0, 0.4).add(G.dodeca(), '#9ea6b2', [0.75, 0.25, 0.55], [0.3, 0.5, 0], 0.09).add(G.dodeca(), '#b3aa9c', [-0.7, 0.3, -0.5], [0.8, 0.1, 0.4], 0.08).fx(0, 0);
    r.on('clod').mark('muzzle', [-1.05, 0.9, 0.92]);
    return { height: 2.6, glowC: col('#ffb04a'), tex: texOf('fabric'), dieHop: 0.12, portrait: { cx: 0, cy: 2.1, cz: 0.3, rad: 1.22, dy: 0.6 }, mat: { rough: 0.7, ns: 0.8, sss: col('#e8c0a0').multiplyScalar(0.03), rimK: 0.26, rimP: 2.4 } };
  }
  function animKostebekusta(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st);
    s.bd = st.dying >= 0 ? damp(s.bd ?? 0, 0, 10, dt) : clamp(st.burrow || 0, 0, 1);
    const bur = s.bd, up = 1 - bur, calm = ph === 'idle' && !(st.move > 0.05), pre = preAggro(s, st, ph, dt);
    if (s.mv > 0.03) s.walk += dt * (4.5 + 3.5 * s.mv);
    const wk = s.walk, k = Math.min(1, s.mv * 1.4) * up, br = Math.sin(s.t * 2.1 + s.ph);
    // waddle + breathing + now and then a happy sniff
    B.body.position.y += Math.abs(Math.sin(wk)) * 0.08 * k + br * 0.012;
    B.body.rotation.z = Math.sin(wk) * 0.08 * k;
    B.body.scale.set(1 + 0.015 * br, 1 - 0.01 * br, 1 + 0.015 * br);
    B.footL.position.y += Math.max(0, Math.sin(wk)) * 0.12 * k; B.footL.position.z += Math.cos(wk) * 0.12 * k;
    B.footR.position.y += Math.max(0, -Math.sin(wk)) * 0.12 * k; B.footR.position.z -= Math.cos(wk) * 0.12 * k;
    let aLx = -Math.sin(wk) * 0.4 * k + Math.sin(s.t * 1.7) * 0.04, aRx = Math.sin(wk) * 0.4 * k - Math.sin(s.t * 1.7 + 1) * 0.04, aLz = 0, aRz = 0;
    B.head.rotation.z = Math.sin(s.t * 1.2 + s.ph) * 0.05;
    const sniff = Math.max(0, Math.sin(s.t * 0.7 + s.ph * 2) - 0.86) * 7;
    B.head.rotation.x = Math.sin(s.t * 20) * 0.025 * sniff - 0.04 * sniff;
    let spin = 2.5, clod = 0, pk = -1, mnd = -1, hatZ = 0, hatX = 0, droop = 0;
    switch (ph) {
      case 'burrow': {   // a little "hup!" hop (0–0.15), then dives in nose first, paws paddling, drill whirring (the sinking follows st.burrow)
        const hop = bump(t, 0.15);
        B.body.position.y += 0.35 * hop; B.body.scale.y *= 1 + 0.08 * hop; aLx = aRx = -2.2 * hop;
        const dv = smooth01((t - 0.1) / 0.1);
        spin = 4 + 26 * dv; aLx = lerp(aLx, -1.3 + Math.sin(s.t * 18) * 0.5, dv); aRx = lerp(aRx, -1.3 - Math.sin(s.t * 18) * 0.5, dv);
        B.body.rotation.x += 0.35 * smooth01(t * 2) * dv;
        break;
      }
      case 'emerge': {   // pops out like a jack-in-the-box (springy stretch, paws up), then sits a bit dizzy (GAME: whack it!)
        const j = bump(t, 0.42), dz = smooth01((t - 0.3) / 0.15);
        spin = 20 * (1 - dz) + 4;
        B.body.position.y += 0.45 * j * up; B.body.scale.y *= 1 + 0.12 * j; B.body.scale.x *= 1 - 0.05 * j; B.body.scale.z *= 1 - 0.05 * j;
        aLx = -2.3 * j - 0.3 * dz; aRx = -2.3 * j - 0.3 * dz; aLz = 0.5 * j + 0.25 * dz; aRz = -0.5 * j - 0.25 * dz;
        B.head.rotation.z += Math.sin(s.t * 5.5) * 0.16 * dz; B.head.rotation.x += Math.cos(s.t * 5.5) * 0.08 * dz;
        B.body.rotation.z += Math.sin(s.t * 5.5 + 1) * 0.06 * dz;
        break;
      }
      case 'throw': {   // winds the right paw back over the head (clod in it), throws at 0.5 (a little squash), follows through
        const w = smooth01(t / 0.45), rel = smooth01((t - 0.48) / 0.12), back = smooth01((t - 0.7) / 0.3), sq = bump(t - 0.48, 0.16);
        aRx = lerp(-2.7 * w, 0.5, rel) * (1 - back); aRz = -0.25 * w * (1 - rel);
        aLx = -0.9 * w * (1 - back) + 0.3 * rel * (1 - back);
        B.body.rotation.y = (0.3 * w - 0.55 * rel) * (1 - back); B.body.rotation.x = (-0.12 * w + 0.22 * rel) * (1 - back);
        B.body.scale.y *= 1 - 0.1 * sq; B.body.scale.x *= 1 + 0.06 * sq; B.body.scale.z *= 1 + 0.06 * sq;
        B.head.rotation.x -= 0.1 * w * (1 - rel); s.eyeK = 1 - 0.3 * w * (1 - rel);
        clod = t < 0.52 ? 1 : 0;
        break;
      }
      case 'drill': {   // head down, the hat drill spins super fast, the whole mole buzzes
        const kk = smooth01(t / 0.2) * (1 - smooth01((t - 0.85) / 0.15));
        spin = 8 + 34 * kk; B.body.rotation.x += 0.26 * kk; B.head.rotation.x += 0.08 * kk;
        B.body.position.x += Math.sin(s.t * 70) * 0.025 * kk; B.body.position.z += Math.cos(s.t * 63) * 0.02 * kk;
        aLx = 0.5 * kk; aRx = 0.5 * kk; aLz = 0.6 * kk; aRz = -0.6 * kk; s.eyeK = 1 - 0.3 * kk;
        break;
      }
      case 'summon': {   // drums the ground with both paws three times, then paws up ("friends, come out!")
        const kk = 1 - smooth01((t - 0.86) / 0.14);
        let pound = 0;
        for (const c of [0.1, 0.34, 0.58]) { const u = (t - c) / 0.22; if (u > 0 && u < 1) pound = u < 0.6 ? -2.2 * smooth01(u / 0.6) : lerp(-2.2, 0.3, smooth01((u - 0.6) / 0.25)); }
        const fin = smooth01((t - 0.8) / 0.1);
        aLx = lerp(pound, -2.4, fin) * kk; aRx = aLx; aLz = 0.3 * fin * kk; aRz = -0.3 * fin * kk;
        B.body.rotation.x += (pound < -1 ? -0.1 : 0.12) * kk * (1 - fin); spin = 12;
        break;
      }
      case 'roar': {
        if (s.intro) {   // entrance (after the double take): a big jump with the drill whirring, paws up, a happy landing
          const u = clamp((t - 0.25) / 0.5, 0, 1), j = Math.sin(PI * u), land = bump(t - 0.75, 0.15), kk = smooth01((t - 0.2) / 0.1) * (1 - smooth01((t - 0.9) / 0.1));
          B.body.position.y += 0.55 * j; B.body.scale.y *= 1 + 0.1 * j - 0.14 * land; B.body.scale.x *= 1 + 0.07 * land; B.body.scale.z *= 1 + 0.07 * land;
          aLx = aRx = -2.4 * kk; aLz = (0.5 + Math.sin(s.t * 14) * 0.2) * kk; aRz = -(0.5 + Math.sin(s.t * 14) * 0.2) * kk;
          B.footL.position.y += 0.1 * j; B.footR.position.y += 0.1 * j; B.head.rotation.x -= 0.2 * kk;
          spin = 44 * kk + 2.5; s.mouthW = kk;
          break;
        }
        // happy shout: paws up, head back, drill spinning, a little jump
        const kk = smooth01(t / 0.2) * (1 - smooth01((t - 0.8) / 0.2));
        aLx = -2.3 * kk; aRx = -2.3 * kk; aLz = 0.45 * kk + Math.sin(s.t * 14) * 0.15 * kk; aRz = -0.45 * kk - Math.sin(s.t * 14) * 0.15 * kk;
        B.head.rotation.x -= 0.25 * kk; B.head.rotation.z += Math.sin(s.t * 9) * 0.1 * kk; B.body.position.y += Math.abs(Math.sin(t * PI * 2)) * 0.15 * kk;
        spin = 14;
        break;
      }
      case 'peek': {   // hide-and-seek (GAME: st.burrow 0.6): pops up in a hole — head, goggles, hat and paws on the rim show (sunk
        // ≈ 1.55 m) — overshooting 0–0.2, looks about cheekily 0.2–0.85 (±0.5, the headlamp swinging), paws tapping, ducks 0.85–1
        const P = EDEF.kostebekusta.peek || { up: 0.2, duck: 0.85, sink: 1.55 }, S = P.sink;
        pk = t < 0.12 ? lerp(3.1, S - 0.22, 1 - Math.pow(1 - t / 0.12, 2)) : t < P.up ? lerp(S - 0.22, S, smooth01((t - 0.12) / (P.up - 0.12))) : t < P.duck ? S : lerp(S, 3.1, smooth01((t - P.duck) / (1 - P.duck)));
        const on = smooth01(t / 0.1) * (1 - smooth01((t - P.duck) / 0.08)), lk = clamp((t - P.up) / (P.duck - P.up), 0, 1);
        B.head.rotation.y = 0.5 * Math.sin(lk * TAU) * on; B.head.rotation.z += 0.1 * Math.sin(lk * TAU * 2) * on; B.head.rotation.x -= 0.12 * on;
        aLx = aRx = -1.6 * on; aLz = 0.35 * on; aRz = -0.35 * on;
        aLx += Math.max(0, Math.sin(s.t * 13)) * 0.22 * on; aRx += Math.max(0, Math.sin(s.t * 13 + PI)) * 0.22 * on;
        s.eyeK = 1.12; s.browY = 0.025 * Math.max(0, Math.sin(lk * TAU * 2)); s.mouthW = on; spin = 6; mnd = 1;
        break;
      }
      case 'bonk': {   // 0.45 s: bonked! squashed down into the hole, the drill whirs backwards, eyes squeezed shut, cheeks puffed, sinks from 0.3
        const S = (EDEF.kostebekusta.peek || {}).sink || 1.55, at = EDEF.kostebekusta.bonkSink ?? 0.3, sq = Math.sin(PI * Math.min(1, t / 0.5));
        pk = t < at ? S + 0.12 * sq : lerp(S + 0.12 * sq, 3.1, smooth01((t - at) / (1 - at)));
        B.body.scale.y *= 1 - 0.18 * sq; B.body.scale.x *= 1 + 0.1 * sq; B.body.scale.z *= 1 + 0.1 * sq;
        B.head.scale.set(1 + 0.12 * sq, 1 - 0.06 * sq, 1 + 0.08 * sq);
        aLx = aRx = -1.6 + 0.8 * sq; aLz = 0.35 + 0.4 * sq; aRz = -0.35 - 0.4 * sq;
        s.eyeK = 0.2; s.mouthO = 0.5 * sq; spin = -24; mnd = 1;
        break;
      }
      case 'dizzy': {   // (loops) a dizzy sway, the drill droops and slows, goggles and hat askew, arms hanging limp, eyes rolling
        const kk = smooth01(s.pT / 0.3), a = s.t * 2.6;
        B.body.rotation.z += 0.12 * Math.sin(a) * kk; B.body.rotation.x += 0.06 * Math.cos(a * 1.3) * kk;
        B.head.rotation.z += 0.14 * Math.sin(a + 0.8) * kk; B.head.rotation.x += 0.08 * kk;
        aLx = (0.2 + 0.18 * Math.sin(a + 1)) * kk; aRx = (0.2 + 0.18 * Math.sin(a + 2.2)) * kk; aLz = -0.12 * kk; aRz = 0.12 * kk;
        hatZ = (0.28 + 0.06 * Math.sin(a * 0.7)) * kk; hatX = 0.12 * kk; droop = 0.55 * kk; spin = lerp(2.5, 0.8, kk);
        s.eyeWob = kk; s.eyeK = 1.05; s.mouthO = 0.35 * kk;
        break;
      }
      case 'dying': {   // overjoyed: both paws up waving goodbye, the drill spinning three times as fast
        aLx = -2.4; aLz = 0.5 + Math.sin(s.t * 11) * 0.35; aRx = -2.4; aRz = -0.5 - Math.sin(s.t * 11 + 1) * 0.35; spin = 30;
        break;
      }
    }
    // idle: every 5–8 s it rubs its paws together, then pushes its goggles straight; before it notices Feza: lazily paddling
    // the ground in front of it, the drill turning slowly
    const ia = act(s, 'igT', dt, 5, 8, 1.8, calm && pre < 0.05 && bur < 0.05);
    if (ia >= 0) {
      const rb = bump(ia, 0.5), ad = bump(ia - 0.45, 0.55);
      aLx -= 1.0 * rb; aRx -= 1.0 * rb; aLz -= (0.35 + 0.1 * Math.sin(s.t * 22)) * rb; aRz += (0.35 + 0.1 * Math.sin(s.t * 22 + 1)) * rb; s.eyeK = lerp(s.eyeK, 0.6, rb);
      aRx -= 1.9 * ad; aRz -= 0.1 * ad; B.head.rotation.z -= 0.08 * ad; hatZ += Math.sin((ia - 0.45) / 0.55 * PI * 3) * 0.08 * ad; hatX -= 0.05 * ad;
    }
    if (pre > 0.01) {
      aLx = lerp(aLx, -0.95 + Math.sin(s.t * 4.2) * 0.45, pre); aRx = lerp(aRx, -0.95 - Math.sin(s.t * 4.2) * 0.45, pre);
      B.body.rotation.x += 0.14 * pre; B.head.rotation.x += 0.08 * pre; spin = lerp(spin, 1.0, pre); s.eyeK = lerp(s.eyeK, 0.8, pre);
    }
    // hit: the head and the drill wobble, eyes squeezed
    let wob = 0;
    if (st.hurt > 0 && ph !== 'dying') {
      const h = st.hurt * st.hurt; wob = h;
      B.head.rotation.z += Math.sin(s.t * 32) * 0.18 * h; B.head.rotation.x -= 0.1 * h; s.eyeK = Math.min(s.eyeK, 1 - 0.4 * h);
    }
    B.armL.rotation.x = aLx; B.armR.rotation.x = aRx; B.armL.rotation.z = aLz; B.armR.rotation.z = aRz;
    B.hat.rotation.set(hatX, 0, hatZ);
    s.drill = (s.drill || 0) + dt * spin;
    B.drill.quaternion.setFromAxisAngle(DRILL_AX, s.drill);
    if (droop > 0 || wob > 0) {   // (the drill flops over to one side / wobbles on its hat)
      _kq6.setFromEuler(_ke.set(0.1 * droop + Math.sin(s.t * 30) * 0.12 * wob, 0, 0.5 * droop + Math.cos(s.t * 27) * 0.14 * wob));
      B.drill.quaternion.premultiply(_kq6);
    }
    B.clod.scale.setScalar(clod ? 1 : 0.0001);
    // (out of a peek / bonk straight into the open — the 'dizzy' after the third bonk: it pops up out of the hole in ~0.3 s)
    if (pk < 0 && s.pkL > 0 && bur < 0.3) {
      s.pkL = Math.max(0, damp(s.pkL, 0, 11, dt) - dt * 0.3);
      const j = Math.sin(PI * clamp(1 - s.pkL / 1.6, 0, 1));
      B.body.position.y -= s.pkL; B.body.scale.y *= 1 + 0.1 * j; B.armL.rotation.x = B.armR.rotation.x = -1.8 * j;
      B.mound.scale.set(0.95, 0.3 * Math.min(1, s.pkL * 2), 0.95);
    } else if (pk < 0) s.pkL = 0;
    if (pk >= 0) {   // peek / bonk: its own sink (only the top of it shows in the hole), a low dirt ring round it
      s.pkL = Math.min(pk, 1.6);
      B.body.position.y -= pk;
      if (pk > 3.0) B.body.scale.setScalar(0.0001);
      B.mound.scale.set(0.95, 0.3, 0.95); B.mound.position.y -= 0.02;
      B.mound.rotation.y = Math.sin(s.t * 4 + s.ph) * 0.2;
    } else if (bur > 0.001) {   // burrowing: sinks with a wiggle; the big dirt mound grows, then bumps along while travelling
      const sink = smooth01(bur);
      B.body.position.y -= sink * 3.0;
      B.body.rotation.x += 0.3 * sink;
      B.body.rotation.z += Math.sin(s.t * 30) * 0.08 * Math.sin(PI * bur);
      if (bur > 0.97) B.body.scale.setScalar(0.0001);
      const ms = smooth01(bur / 0.35), mv = Math.max(s.mv, ph === 'burrow' && bur > 0.97 ? 0.6 : 0);
      B.mound.scale.set(ms * (1 + 0.05 * Math.sin(s.t * 9) * mv), ms * (1 + 0.12 * Math.sin(s.t * 13) * mv), ms * (1 + 0.05 * Math.cos(s.t * 9) * mv));
      B.mound.position.y += Math.abs(Math.sin(s.t * 11)) * 0.06 * mv * ms;
      B.mound.rotation.y = Math.sin(s.t * 4 + s.ph) * 0.2;
      if (ph === 'emerge' || st.windup >= 0) {   // about to pop up: the mound trembles and swells
        const w = ph === 'emerge' ? 1 - t : st.windup;
        B.mound.position.x += Math.sin(s.t * 57) * 0.06 * w; B.mound.position.z += Math.cos(s.t * 49) * 0.05 * w;
        B.mound.scale.multiplyScalar(1 + 0.12 * w);
      }
    } else if (!(s.pkL > 0)) B.mound.scale.setScalar(0.0001);
  }

  // ── Koca Lav Kaplumbağası: big mint turtle (~2.8 m) whose shell is a little volcano (glowing crater, lava drips, steam
  // puffs, fire flowers between the plates). Erupts lava balls, hides and rolls (spins like a top), stomps. ──
  function buildLavkaplumbaga(r, o) {
    const skin = '#56cc9c', skinL = '#b4f2d4', skinD = '#2a8e6c';
    const C = [0, 0.98, -0.05], A = [1.5, 1.0, 1.66];
    r.bone('body', 'root', [0, 1.0, 0]);
    r.bone('head', 'body', [0, 0.95, 1.3]);
    const LEG = [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]];
    for (const [n, sx, sz] of LEG) r.bone(n, 'body', [0.98 * sx, 0.72, 0.95 * sz]);
    r.bone('tail', 'body', [0, 0.7, -1.55]);
    const sk = vgrad(0.05, 1.8, [[0, skinD], [0.4, skin], [1, mixc(skin, skinL, 0.35)]]);
    for (const [n, sx, sz] of LEG) {
      r.on(n).fx(0, 0.3).seg([0.98 * sx, 0.74, 0.95 * sz], [1.2 * sx, 0.24, 1.06 * sz], 0.31, sk, 0.27, 16);
      r.add(G.sphere(24, 16), sk, [1.22 * sx, 0.2, 1.08 * sz + 0.06], null, [0.33, 0.2, 0.38]);
      r.fx(0, 0.5);
      for (let k = -1; k <= 1; k++) r.add(G.sphere(10, 8), TURTLE.nail, [1.22 * sx + k * 0.13, 0.12, 1.08 * sz + (sz > 0 ? 0.4 : 0.2)], null, [0.075, 0.06, 0.075]);
      r.fx(0, 0);
    }
    r.on('tail'); cone(r, [0, 0.7, -1.55], [0, -0.3, -1], 0.45, 0.2, skin, 14);
    r.on('body');
    turtleShell(r, C, A, [0.66, 0.9, 1.13, 1.35, 1.56], [7, 10, 12, 14, 17], { scute: '#6a5850', scuteD: '#35292a', seam: '#ff6a18', rim: '#3a2e2a', plastron: TURTLE.plastron });
    const top = volcano(r, [0, 1.5, -0.05], 1.0, 1.25, { key: 'B', rock: '#72605a', rockD: '#3e302c', ash: '#c2b4aa', drips: 5 });
    // fire flowers growing between the plates (cheerful, glowing a little)
    for (const f of [[1.05, 0.4], [1.12, 2.5], [1.34, -1.2], [1.0, -2.6]]) {
      const [p, n] = onEll(C, [A[0] * 1.07, A[1] * 1.07, A[2] * 1.07], f[0], f[1]), q = qy(...n);
      r.push(p, q);
      r.fx(0.5, 0.3);
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; r.add(G.sphere(10, 6), hdr(i & 1 ? '#ff8a2a' : '#ffa23a', 1.25), [Math.sin(a) * 0.07, 0.02, Math.cos(a) * 0.07], [0, a, 0], [0.05, 0.02, 0.085]); }
      r.fx(1, 0).add(G.sphere(10, 8), hdr('#ffe27a', 1.8), [0, 0.035, 0], null, [0.04, 0.03, 0.04]);
      r.pop();
    }
    r.fx(0, 0);
    r.bone('lava', 'body', [0, top[1] - 0.14, top[2]]);
    r.fx(1, 0).add(G.sphere(20, 14), hdr('#ffe07a', 2.3), [0, top[1] - 0.14, top[2]], null, 0.2);
    r.fx(0, 0);
    puffs(r, 'body', [top[0], top[1] + 0.08, top[2]], 0.22, ['#ffb8dc', '#ffd0e8', '#ff9ccc']);
    // head on a chunky neck, spots, cute snout
    const HC = [0, 1.32, 1.85], HR = 0.56;
    r.bone('stars', 'head', [0, HC[1] + 0.72, HC[2] - 0.05]);
    r.on('head').fx(0, 0.3).seg([0, 0.95, 1.3], [0, 1.22, 1.72], 0.3, sk, 0.3, 16);
    r.add(G.sphere(40, 30), vgrad(0.85, 1.9, [[0, skin], [1, mixc(skin, skinL, 0.45)]]), HC, null, [HR * 1.04, HR * 0.97, HR]);
    r.add(G.sphere(28, 20), mixc(skin, skinL, 0.5), [0, 1.16, 2.2], null, [0.34, 0.24, 0.26]);
    r.fx(0, 0.2);
    for (const sp of [[0.2, 0.44, 0.06], [-0.16, 0.48, 0.05], [0.4, 0.2, 0.045], [-0.38, 0.26, 0.05], [0.04, 0.52, 0.035]]) {
      const [p, q] = onSphere(sp[0], sp[1], HR, -0.004); r.push(HC).add(G.sphere(10, 6), TURTLE.spot, p, q, [sp[2], sp[2], sp[2] * 0.3]).pop();
    }
    r.fx(0, 0);
    face(r, HC, HR, {
      bone: 'head', tilt: 0.34, ex: 0.225, ey: 0.13, er: 0.18, iris: '#2e1a0c', skin: mixc(skin, skinL, 0.3), browCol: '#1f5a44', browY: 1.38,
      mc: [0, 1.16, 2.2], mR: 0.25, mTilt: 0.1, mouthY: -0.05, mouthW: 0.2, heartY: 0.8, heartX: 1.15, blushX: 0.4, blushY: 1.0, mouthPivot: true,
    });
    // dizzy stars circling its head (shown after a roll and while it lies flipped on its side)
    r.on('stars').fx(0.75, 0.5);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; r.add(starFlat(), hdr('#ffe14a', 1.25), [Math.sin(a) * 0.52, HC[1] + 0.72 + (i & 1) * 0.06, HC[2] - 0.05 + Math.cos(a) * 0.52], new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2 + 0.45, a, 0, 'YXZ')), 0.22); }
    r.fx(0, 0);
    r.on('body').mark('muzzle', [top[0], top[1] + 0.1, top[2]]);
    return { height: 2.8, glowC: col('#ffb03a'), dieHop: 0.08, hide: ['stars'], mat: { rough: 0.8, sss: col('#c8ffe0').multiplyScalar(0.03), rim: '#fff0d0', rimK: 0.22 } };
  }
  function animLavkaplumbaga(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), calm = ph === 'idle' && !(st.move > 0.05), pre = preAggro(s, st, ph, dt);
    if (s.mv > 0.03) s.walk += dt * (3.2 + 2.5 * s.mv);
    const wk = s.walk, k = Math.min(1, s.mv * 1.4), br = Math.sin(s.t * 1.7 + s.ph);
    // hidden in the shell: 'hide' — a "hup!" hop 0–0.2, tucks in 0.2–0.8, a spin-up shimmy 0.8–1; 'roll' stays tucked; 'rollend'
    // pops out again over 0–0.2
    if (ph === 'hide') s.tk = Math.max(s.tk || 0, smooth01((t - 0.2) / 0.6));
    else if (ph === 'rollend') s.tk = Math.min(s.tk ?? 1, 1 - smooth01(t / 0.2));
    else s.tk = damp(s.tk || 0, ph === 'roll' ? 1 : 0, ph === 'roll' ? 14 : 6, dt);
    // flipped onto its side ('flip': 0–0.12 tumbles over with a 0.6 m hop, lies on its side, 0.88–1 hops back up); damped, so a
    // flip cut short rights itself within ~0.4 s
    let flipT = 0, fy = 0;
    if (ph === 'flip') {
      flipT = t < 0.12 ? smooth01(t / 0.12) : t < 0.88 ? 1 : 1 - smooth01((t - 0.88) / 0.1);
      fy = 0.6 * bump(t, 0.12) + 0.4 * bump(t - 0.88, 0.1);
      s.flip = flipT;
    } else s.flip = damp(s.flip || 0, 0, 9, dt);
    const T = s.tk, out = 1 - T, F = s.flip;
    let lava = 0, puffR = 0.45, flLx = 0, flRx = 0, lift = 0, stars = 0, legW = 0, lazy = 0;
    B.body.position.y += Math.abs(Math.sin(wk)) * 0.05 * k * out + br * 0.012 - 0.42 * T;
    B.body.rotation.z = Math.sin(wk) * 0.04 * k * out;
    B.body.scale.set(1 + 0.012 * br, 1 + 0.015 * br, 1 + 0.012 * br);
    const lg = Math.sin(wk) * 0.45 * k;
    B.head.rotation.x = Math.sin(wk * 2) * 0.04 * k + Math.sin(s.t * 1.1 + s.ph) * 0.04;
    B.head.rotation.y = Math.sin(s.t * 0.5 + s.ph) * 0.22 * (1 - k) * out;
    B.tail.rotation.y = Math.sin(s.t * 2.4 + s.ph) * 0.3;
    switch (ph) {
      case 'erupt': {   // crouches and trembles (0–0.3), then the volcano puffs out lava balls (pulses 0.36 … 0.78): it looks up at each
        const c0 = smooth01(t / 0.3) * (1 - smooth01((t - 0.88) / 0.12));
        B.body.position.y -= 0.12 * c0; B.body.rotation.z += Math.sin(s.t * 48) * 0.02 * c0 * (t < 0.34 ? 1 : 0.3);
        B.head.rotation.x -= 0.3 * c0; lava = 0.4 * c0; puffR = 1.6;
        // GAME lobs 3–5 balls evenly over 0.36 … 0.78: five soft puffs cover every count
        for (const c of [0.36, 0.465, 0.57, 0.675, 0.78]) { const p = bump(t - c + 0.02, 0.09); B.body.position.y += 0.1 * p; B.body.scale.y *= 1 + 0.06 * p; lava += 0.7 * p; B.head.rotation.x -= 0.18 * p; s.eyeK = Math.max(s.eyeK, 1 + 0.2 * p); }
        break;
      }
      case 'hide': {   // "hup!" (0–0.2), tucks in (0.2–0.8), shimmies and starts to spin (0.8–1)
        const hop = bump(t, 0.2), sh = smooth01((t - 0.8) / 0.08);
        B.body.position.y += 0.3 * hop; B.body.scale.y *= 1 + 0.06 * hop; s.eyeK = 1 + 0.2 * hop; s.mouthO = hop;
        B.body.rotation.z += Math.sin(s.t * 30) * 0.045 * sh; B.body.rotation.x += Math.cos(s.t * 27) * 0.025 * sh;
        s.spinV = Math.max(s.spinV || 0, 6 * sh);
        break;
      }
      case 'roll': {   // spins like a top along its lane, wobbling and bouncing
        s.spinV = damp(s.spinV || 0, 15, 4, dt);
        B.body.position.y += Math.abs(Math.sin(s.t * 9)) * 0.08;
        B.body.rotation.x = Math.sin(s.t * 5) * 0.07; B.body.rotation.z = Math.cos(s.t * 5) * 0.07;
        puffR = 1.2;
        break;
      }
      case 'rollend': {   // 1.3–1.8 s after a roll: pops out (0–0.2), then its head goes round and round, dizzy eyes, stars circling
        const kk = smooth01((t - 0.15) / 0.1) * (1 - smooth01((t - 0.9) / 0.1));
        B.head.rotation.y += 0.35 * Math.sin(s.t * 5.5) * kk; B.head.rotation.x += 0.18 * Math.cos(s.t * 5.5) * kk; B.head.rotation.z += 0.12 * Math.sin(s.t * 5.5 + 1) * kk;
        B.body.rotation.z += 0.04 * Math.sin(s.t * 3) * kk;
        stars = kk; s.eyeWob = kk; s.mouthO = 0.4 * kk; s.eyeK = 1.05;
        s.eyeK = lerp(s.eyeK, 1.2, bump(t, 0.25)); B.body.position.y += 0.12 * bump(t, 0.2);
        break;
      }
      case 'flip': {   // on its side: legs paddling in the air, head wiggling, big eyes, the volcano puffing sideways, a little rocking
        const kk = smooth01((t - 0.1) / 0.06) * (1 - smooth01((t - 0.86) / 0.04));
        legW = kk; puffR = 1.4; lava = 0.2 * kk;
        B.head.rotation.z += Math.sin(s.t * 7) * 0.25 * kk; B.head.rotation.y += Math.sin(s.t * 3.1) * 0.2 * kk; B.head.rotation.x -= 0.2 * kk;
        s.eyeK = lerp(1, 1.2, kk); s.mouthO = 0.6 * kk + 0.4 * bump(t, 0.14); stars = 0.8 * kk;
        B.tail.rotation.y += Math.sin(s.t * 12) * 0.4 * kk;
        break;
      }
      case 'stomp': {   // rears up on its back legs (0–0.55) and slams down (0.62) → ring
        const up = smooth01(t / 0.5), hit = smooth01((t - 0.55) / 0.07), rec = smooth01((t - 0.7) / 0.3);
        lift = up * (1 - hit);
        B.body.rotation.x = -0.32 * lift; B.body.position.y += 0.35 * lift; flLx = flRx = -0.9 * lift;
        const sq = hit * (1 - rec);
        B.body.scale.set(1 + 0.06 * sq, 1 - 0.08 * sq, 1 + 0.06 * sq); B.head.rotation.x += 0.15 * sq - 0.2 * lift; lava = 0.5 * sq;
        break;
      }
      case 'summon': {   // happy call: head up, front feet stamping in turn, the volcano puffs quickly
        const kk = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15));
        flLx = -0.7 * Math.max(0, Math.sin(t * PI * 6)) * kk; flRx = -0.7 * Math.max(0, -Math.sin(t * PI * 6)) * kk;
        B.head.rotation.x -= 0.3 * kk; B.head.rotation.z += Math.sin(s.t * 8) * 0.12 * kk; puffR = 2; lava = 0.3 * kk;
        break;
      }
      case 'roar': {   // "rawr!": neck stretched up, head wiggle, the crater flares
        const kk = smooth01(t / 0.2) * (1 - smooth01((t - 0.8) / 0.2));
        B.head.rotation.x -= 0.42 * kk; B.head.position.z += 0.15 * kk; B.head.position.y += 0.1 * kk; B.head.rotation.z += Math.sin(s.t * 9) * 0.14 * kk;
        flLx = flRx = -0.35 * kk; lava = 0.8 * kk; puffR = 2;
        break;
      }
      case 'dying': {   // overjoyed: head up, waves a front foot, the tail wags, one big pink puff after another
        B.head.rotation.x -= 0.3; flLx = -1.1 + Math.sin(s.t * 10) * 0.35; lava = 0.2; puffR = 1.3;
        B.tail.rotation.y = Math.sin(s.t * 14) * 0.5;
        break;
      }
    }
    // idle: a tail wag now and then, a slow happy blink; before it notices Feza it sunbathes: chin on the ground, eyes nearly
    // shut, legs sprawled, lazy slow puffs
    if (calm && pre < 0.05) {
      const w = act(s, 'wagT', dt, 3, 6, 1.2, true); if (w >= 0) B.tail.rotation.y += Math.sin(w * PI * 7) * 0.45 * Math.sin(PI * w);
      const b = act(s, 'sbT', dt, 4, 7, 1.3, true); if (b >= 0) s.eyeK = Math.min(s.eyeK, 1 - 0.9 * smooth01(Math.min(b, 1 - b) / 0.35));
    }
    if (pre > 0.01) {
      lazy = pre;
      B.head.rotation.x += 0.28 * pre; B.head.position.y -= 0.18 * pre; B.head.rotation.y *= 1 - pre; B.head.rotation.z += 0.12 * pre;
      B.body.position.y -= 0.12 * pre; B.body.scale.y *= 1 + 0.02 * Math.sin(s.t * 0.9) * pre;
      s.eyeK = Math.min(s.eyeK, lerp(1, 0.22, pre)); s.mouthW = 0.6 * pre; puffR = lerp(puffR, 0.18, pre);
      B.tail.rotation.y = lerp(B.tail.rotation.y, Math.sin(s.t * 0.8) * 0.15, pre);
    }
    // hit: the head flinches into the shell, eyes squeezed
    if (st.hurt > 0 && ph !== 'dying') { const h = st.hurt * st.hurt; B.head.position.z -= 0.35 * h; B.head.position.y -= 0.06 * h; B.head.scale.multiplyScalar(1 - 0.12 * h); s.eyeK = Math.min(s.eyeK, 1 - 0.5 * h); }
    if (ph !== 'roll' && ph !== 'hide') s.spinV = damp(s.spinV || 0, 0, 6, dt);
    s.spin = (s.spin || 0) + dt * (s.spinV || 0);
    if (ph !== 'roll' && ph !== 'hide' && s.spinV < 1.5) s.spin = dampAngle(s.spin, 0, 5, dt);
    B.body.rotation.y = s.spin;
    B.legFL.rotation.x = lg + flLx; B.legBR.rotation.x = lg; B.legFR.rotation.x = -lg + flRx; B.legBL.rotation.x = -lg + 0.3 * lift;
    B.legBR.rotation.x += 0.3 * lift;
    if (lazy > 0.01) for (const [n, sx, sz] of [['legFL', 1, 1], ['legFR', -1, 1], ['legBL', 1, -1], ['legBR', -1, -1]]) { B[n].rotation.z += sx * 0.45 * lazy; B[n].rotation.x -= sz * 0.3 * lazy; B[n].position.y -= 0.06 * lazy; }
    if (legW > 0.01) {   // paddling in the air (the top ones faster; the ones underneath barely move)
      const P = { legFL: [0, 1], legBL: [1.9, 1], legFR: [0.9, 0.35], legBR: [2.8, 0.35] };
      for (const n in P) { B[n].rotation.x += Math.sin(s.t * 13 + P[n][0]) * 0.6 * P[n][1] * legW; B[n].rotation.z += (n === 'legFL' || n === 'legBL' ? 0.35 : 0.1) * legW; }
    }
    if (T > 0.001) {   // head, legs and tail slide into the shell
      B.head.position.z -= 0.9 * T; B.head.position.y -= 0.1 * T; B.head.scale.multiplyScalar(1 - 0.65 * T);
      for (const n of ['legFL', 'legFR', 'legBL', 'legBR']) { const b = B[n]; b.scale.setScalar(1 - 0.72 * T); b.position.y += 0.15 * T; b.position.x *= 1 - 0.25 * T; b.position.z *= 1 - 0.2 * T; }
      B.tail.scale.setScalar(1 - 0.85 * T);
    }
    if (F > 0.001) {   // tipped onto its right side (≈ 1.3 rad): lifted so the shell's rim rests on the floor, the volcano sticks out sideways
      B.body.rotation.z += F * 1.3 + (ph === 'flip' ? Math.sin(s.t * 3.2) * 0.07 * F : 0);
      B.body.position.y += F * 0.5 + fy; B.body.position.x -= F * 0.12;
    } else if (fy) B.body.position.y += fy;
    B.stars.scale.setScalar(stars > 0.01 ? stars : 0.0001); B.stars.rotation.y = s.t * 4.5;
    const lp = Math.sin(s.t * 2 + s.ph);
    B.lava.position.y += -0.06 + 0.03 * lp + 0.28 * lava; B.lava.scale.setScalar(0.6 + 0.08 * lp + 0.7 * lava);
    puffAnim(m, s, dt, puffR * 0.5, 1.1, ph === 'roll' ? 0.4 : 1);
    if (ph === 'dying') for (let i = 0; i < 3; i++) m.B['puff' + i].scale.multiplyScalar(1.8);   // (big pink puffs)
  }

  // ════════════════ Round 4: Kefir Vadisi (dairy) — yogurt, kaymak, kopuk, peynir (+ jole 'muhallebi') and kefirdev ════════════════
  // Feza loves kefir and yogurt. 'grumpy' = the funny sour 😜 face (face() o.sour); the sour creams are a pale lime and turn fresh
  // white when they cheer up. Glossy cream, crisp faces tilted up for the gameplay camera, nothing gross or rotten-looking.
  const DAIRY = { cream: '#fffaf1', creamL: '#ffffff', creamD: '#efe0c6', sour: '#d4efa2', sourL: '#ecf9cc', sourD: '#a8cc68',
    honey: '#ffa01a', honeyL: '#ffc850', honeyD: '#d86a06', straw: '#ff4262', strawD: '#d82448', seed: '#fff0a0', leaf: '#4cc05a', leafD: '#2c9a44',
    wood: '#d09050', woodD: '#9a6030', iris: '#3a2446', tongue: '#ff6f9a' };
  const dairyFace = o => Object.assign({ sour: true, iris: DAIRY.iris, browCol: '#4a2a3a', mouthIn: '#7a2444', blushCol: '#ff8fb4' }, o);
  // Radius of a lathe profile (monotonic in y, bottom → top) at height y (spline-sampled once per key).
  const PRF = {};
  function profR(key, pts) {
    if (PRF[key]) return PRF[key];
    const v = new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(pts.length * 16);
    return (PRF[key] = y => {
      let i = 0; while (i < v.length - 2 && v[i + 1].y < y) i++;
      const a = v[i], b = v[i + 1], t = clamp((y - a.y) / ((b.y - a.y) || 1e-6), 0, 1);
      return Math.max(0, lerp(a.x, b.x, t));
    });
  }
  // Painted gloss highlight (unlit soft ellipse) lying on a surface point p with normal n.
  function gloss(r, p, n, sx, sy, k = 1.25, spin = 0) {
    r.fx(1, 0).add(G.sphere(12, 8), hdr('#ffffff', k), p, qz(n[0], n[1], n[2], spin), [sx, sy, Math.min(sx, sy) * 0.3]);
  }
  // A strawberry standing on p (its rounded tip down, the calyx up), s = scale (about s m tall): glossy red with golden seeds,
  // a star of green leaves and a little stem.
  const STRAW_P = [[0, 0], [0.12, 0.012], [0.3, 0.12], [0.42, 0.32], [0.46, 0.52], [0.42, 0.7], [0.3, 0.84], [0, 0.9]];
  function strawberry(r, p, s, tilt = 0) {
    r.push(p, [tilt, 0, 0.12], s);
    r.fx(0, 1).add(lathe('straw', STRAW_P, 20, 3), vgrad(0, 0.9, [[0, DAIRY.strawD], [0.45, DAIRY.straw], [1, '#ff6a7e']]));
    r.fx(0, 0.5);
    const pr = profR('straw', STRAW_P);
    for (let i = 0; i < 14; i++) { const y = 0.16 + (i % 5) * 0.13, a = i * 2.4, rr = pr(y) + 0.004; r.add(G.sphere(6, 4), DAIRY.seed, [Math.sin(a) * rr, y, Math.cos(a) * rr], [0, a, 0], [0.03, 0.045, 0.03]); }
    r.fx(0, 0.25);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; r.add(G.sphere(10, 6), i & 1 ? DAIRY.leafD : DAIRY.leaf, [Math.sin(a) * 0.17, 0.87, Math.cos(a) * 0.17], [0.25, a, 0], [0.08, 0.035, 0.22]); }
    r.seg([0, 0.86, 0], [0.03, 1.08, 0.02], 0.035, DAIRY.leafD, 0.028, 6);
    r.pop().fx(0, 0);
  }

  // ── Ekşi Yoğurt (~0.8 m): a pastel-blue yogurt cup (white polka dots, rolled rim, a heart logo) full of cream that bulges over
  // the rim and drips down the sides; its peeled foil lid is worn tilted like a cap, the pull tab as the visor. Sour = pale lime
  // cream; happy = fresh white cream with a strawberry on the cap. Melee hopper: hops, then bumps. ──
  const YOG_CUP = [[0, 0], [0.205, 0], [0.232, 0.008], [0.246, 0.03], [0.256, 0.1], [0.272, 0.24], [0.29, 0.35], [0.293, 0.372]];
  const YOG_C = [0, 0.455, 0], YOG_A = [0.33, 0.3, 0.33], YOG_RIM = 0.372;
  function buildYogurt(r, o) {
    const E = o.elite;
    let cup = col('#7cc4f4'), cupL = col('#c6e8ff'), cupD = col('#4b96d6');
    if (E) { cup = rich(cup, 1.3, 0.86); cupL = rich(cupL, 1.25, 0.92); cupD = rich(cupD, 1.3, 0.8); }
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('cream', 'body', [0, YOG_RIM, 0]);
    r.bone('lid', 'cream', [0, 0.74, -0.02]);
    // cup + rolled rim + white band, polka dots and a little heart logo in front
    r.on('body').fx(0, 0.6).add(lathe('yCup', YOG_CUP, 40), vgrad(0, YOG_RIM, [[0, cupD], [0.45, cup], [1, mixc(cup, cupL, 0.5)]]));
    r.add(G.cyl(1, 0.97, 40, true), '#fbfdff', [0, 0.315, 0], null, [0.29, 0.05, 0.29]);
    r.add(G.torus(TAU, 0.075, 40), cupL, [0, YOG_RIM, 0], [PI / 2, 0, 0], 0.293);
    r.fx(0, 0.5);
    for (let i = 0; i < 12; i++) {
      const y = i & 1 ? 0.2 : 0.09, a = i / 12 * TAU + (i & 1 ? 0.26 : 0);
      if (Math.abs(Math.sin(a / 2)) < 0.26 && y > 0.15) continue;   // leave room for the logo in front
      const [p, n] = onLathe(YOG_CUP, y, a, 0.002); r.add(G.sphere(12, 6), '#ffffff', p, qz(...n), [0.032, 0.032, 0.008]);
    }
    { const [p, n] = onLathe(YOG_CUP, 0.19, 0, 0.003); r.add(G.sphere(16, 8), '#ffffff', p, qz(...n), [0.085, 0.06, 0.01]);
      const [p2, n2] = onLathe(YOG_CUP, 0.19, 0, 0.01); r.fx(0, 0.6).add(heartGeo(), '#ff5a8c', p2, qz(...n2), [0.085, 0.085, 0.05]); }
    r.fx(0, 0);
    // cream (per mood: pale lime while sour, fresh white when happy) with a soft swirl ridge and drips over the rim
    const wob = (x, y) => smooth01((y - YOG_RIM) / 0.32);
    const drips = [[0.95, 0.3, 1], [2.3, 0.3, 0.8], [-2.0, 0.305, 0.9], [-0.95, 0.33, 0.55]];
    for (const md of [1, 2]) {
      const c0 = md === 1 ? DAIRY.sour : DAIRY.cream, cL = md === 1 ? DAIRY.sourL : DAIRY.creamL, cD = md === 1 ? DAIRY.sourD : DAIRY.creamD;
      r.mood = md;
      r.on('cream').fx(0, 0.75, 0, wob).add(G.sphere(40, 28), vgrad(0.2, 0.76, [[0, cD], [0.4, c0], [1, cL]]), YOG_C, null, YOG_A);
      // a soft cream curl peeking out from under the cap (like a cowlick)
      r.add(G.torus(PI * 1.3, 0.34, 16), mixc(c0, cL, 0.4), [-0.06, 0.745, 0.1], [0.3, 0.5, -0.6], [0.05, 0.05, 0.06]);
      r.fx(0, 0.75);
      for (const [a, y, k] of drips) {
        const [p, n] = onLathe(YOG_CUP, y, a, 0.012);
        r.add(G.sphere(12, 10), c0, p, qz(...n), [0.036 * k + 0.012, 0.07 * k, 0.026]);
        r.add(G.sphere(12, 10), c0, [p[0] + n[0] * 0.004, p[1] - 0.06 * k, p[2] + n[2] * 0.004], null, 0.03 * k + 0.008);
      }
    }
    r.mood = 0;
    // painted gloss on the cream (top left)
    { const [p, n] = onEll(YOG_C, YOG_A, 0.95, -1.2); gloss(r.on('cream'), p, n, 0.05, 0.022, 1.15, 0.8); }
    // the peeled foil lid worn tilted like a cap (pushed back on the head): silver foil with a crimped edge, a pink print with white
    // dots and a red heart; the pull tab sticks out in front like a visor
    r.on('lid').push([0.0, 0.738, -0.06], [-0.4, 0, 0.3]);
    r.fx(0, 2).add(G.cyl(1, 1, 32), '#dde5f0', [0, 0, 0], null, [0.215, 0.014, 0.215]);
    r.add(G.torus(TAU, 0.09, 32), '#c5cedf', [0, 0, 0], [PI / 2, 0, 0], 0.217);
    r.fx(0, 0.55).add(G.cyl(1, 1, 28), '#ff8cc0', [0, 0.0085, 0], null, [0.17, 0.005, 0.17]);
    r.add(G.cyl(1, 1, 24), '#ffffff', [0, 0.012, 0], null, [0.092, 0.004, 0.092]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; r.add(G.sphere(8, 6), '#ffffff', [Math.sin(a) * 0.132, 0.012, Math.cos(a) * 0.132], null, [0.017, 0.006, 0.017]); }
    r.add(heartGeo(), '#ff4a7a', [0, 0.016, 0.004], [-PI / 2, 0, 0], [0.1, 0.1, 0.03]);
    r.fx(0, 2).add(G.rbox(2), '#e3e9f4', [0, -0.002, 0.25], [0.22, 0, 0], [0.12, 0.012, 0.13]);
    r.add(G.sphere(12, 6), '#e3e9f4', [0, -0.016, 0.31], null, [0.06, 0.008, 0.03]);
    r.pop().fx(0, 0);
    if (E) crown(r.on('lid'), [-0.03, 0.77, -0.1], 0.46, undefined, 1);
    // happy: a strawberry on top of the cap (beside the crown for an elite)
    r.on('lid'); r.mood = 2;
    strawberry(r, E ? [0.11, 0.76, -0.02] : [0.02, 0.77, -0.05], 0.14, -0.2);
    r.mood = 0;
    face(r, YOG_C, 0.322, dairyFace({ bone: 'cream', tilt: 0.36, ex: 0.118, ey: 0.03, er: 0.09, skin: DAIRY.sour, mouthY: -0.1, mouthW: 0.1, heartY: 0.72, heartX: 1.12, blushY: 1.0 }));
    r.on('cream').mark('muzzle', [0, 0.45, 0.36]);
    return { height: 0.82, glowC: col('#ff7aa8'), mat: { rough: 0.3, sss: col('#fff2d8').multiplyScalar(0.05), rim: '#ffffff', rimK: 0.26, rimP: 2.6, wob: 0.008, wobF: 3, wobS: 5 } };
  }
  function animYogurt(m, dt, st, s) {
    const B = m.B, br = Math.sin(s.t * 3 + s.ph);
    let sy = 1 + 0.02 * br, sxz = 1 - 0.01 * br, y = 0, z = 0, x = 0, rx = 0, rz = 0, air = 0, land = 0;
    s.hopK = damp(s.hopK || 0, st.move > 0.05 ? 1 : 0, 6, dt);
    if (s.hopK > 0.02 || (s.hop % 1) > 0.03) s.hop += dt * (2.2 + 0.7 * s.mv);
    const u = s.hop % 1, A = s.hopK;
    if (u < 0.18) { const k = Math.sin(PI * u / 0.18); sy -= 0.14 * k * A; sxz += 0.07 * k * A; land = 0.6 * k * A; }
    else if (u < 0.82) {
      const k = (u - 0.18) / 0.64; y += Math.sin(PI * k) * 0.3 * A; air = Math.sin(PI * k) * A;
      const e = Math.abs(Math.cos(PI * k)); sy += 0.1 * e * A; sxz -= 0.04 * e * A; rx += 0.12 * Math.sin(PI * k) * A;
    } else { const k = Math.sin(PI * (u - 0.82) / 0.18); sy -= 0.16 * k * A; sxz += 0.09 * k * A; land = k * A; if (!s.landed && A > 0.3) { s.landed = true; s.wobA = 0.03; } }
    if (u < 0.5) s.landed = false;
    let lidUp = air * 0.5;
    if (st.windup >= 0) {   // crouches into its cup, leans back, trembles; the cap lifts like a peeking visor
      const w = smooth01(st.windup);
      sy *= 1 - 0.22 * w; sxz *= 1 + 0.12 * w; rx -= 0.28 * w; x += Math.sin(s.t * 62) * 0.016 * st.windup; lidUp += 0.6 * w; land = Math.max(land, 0.5 * w);
    }
    if (st.attack >= 0 && st.attack < 1) {   // bump! a forward hop into Feza, cream first (GAME carries its big hop: st.air > 0 → pose only)
      const k = Math.sin(PI * st.attack), g = st.air > 0 ? 0.12 : 1;
      y += 0.26 * k * g; z += 0.42 * k * g; rx += 0.5 * k; sy *= 1 + 0.12 * k; sxz *= 1 - 0.05 * k; lidUp += 0.5 * k; air = Math.max(air, k);
    } else if (st.attack >= 1) {   // squashed after the bump, cream wobbling, then back up
      sy *= 0.88; sxz *= 1.07; land = Math.max(land, 0.6); s.wobA = Math.max(s.wobA ?? 0, 0.02);
    }
    B.body.position.set(x, y, z); B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, 0, rz);
    // the cream squashes on landings and lags behind the cup a little
    const cs = land * 0.12;
    B.cream.scale.set(1 + cs * 0.8, 1 - cs, 1 + cs * 0.8);
    B.cream.rotation.x = -0.08 * air + Math.sin(s.t * 2.1 + s.ph) * 0.02;
    B.lid.rotation.x = -0.5 * lidUp; B.lid.position.y += 0.03 * lidUp; B.lid.rotation.z = Math.sin(s.t * 1.7 + s.ph) * 0.05;
    s.wobA = damp(s.wobA ?? 0.008, 0.008, 3.5, dt);
    if (st.hurt > 0.5) s.wobA = Math.max(s.wobA, 0.03 * st.hurt);
    m.U.uWob.value.x = s.wobA;
  }

  // ── Kesik Kaymak (~0.5 m tall, ~0.8 m wide = 1.6 : 1): a plump roll of clotted cream lying on its side (a "rulo kaymak") — the
  // rolled spiral on both end faces (the roll bends a little forward and its ends are cut a little slanted, so the high game camera
  // sees them; they spin like wheels while it glides), a glossy honey drizzle draped over its top like a beret and a tiny wooden
  // honey dipper stuck in it like a feather. It glides on a short creamy smear (no legs). Sour = warm butter-yellow with little curds ("kesik") — its own colour, so it
  // never reads as the lime sour yogurt; happy = smooth fresh ivory cream. ──
  const KAY_X = 0.4, KAY_R = 0.255, KAY_CY = 0.262, KAY_TAN = 0.2, KAY_BEND = 0.06;   // half length, radius, axis height, end slant, bend
  const KAY_E = 0.055, KAY_DOME = 0.014, KAY_K = KAY_TAN * KAY_R / KAY_X;
  const kayBR = t => KAY_R * (1 - 0.05 * (t / KAY_X) * (t / KAY_X));   // a slight barrel along the roll
  const KAY_CR = kayBR(KAY_X - KAY_E) - KAY_E;                         // flat radius of the end faces
  // the roll's axis: a gentle forward bend (z = KAY_BEND at the ends); kayAx(t) = [x, z, tangent x, tangent z]
  function kayAx(t) {
    const fp = 2 * KAY_BEND * t / (KAY_X * KAY_X), l = Math.hypot(1, fp);
    return [t, KAY_BEND * (t / KAY_X) * (t / KAY_X), 1 / l, fp / l];
  }
  // roll space (t along the roll, u up and w forward from its axis) → model space: the ends lean in toward the top, and past the
  // ends (the domed faces) it carries on along the axis' end tangent
  function kayXf(t, u, w) {
    const ts = t * (1 - KAY_K * u / KAY_R), tc = clamp(ts, -KAY_X, KAY_X), d = ts - tc, [cx, cz, tx, tz] = kayAx(tc);
    return [cx + tx * d - tz * w, KAY_CY + u, cz + tz * d + tx * w];
  }
  // model space → the roll-space t (projects onto the bent axis; for colour masks)
  function kayT(x, y, z) {
    let tc = x;
    for (let i = 0; i < 4; i++) { const [cx, cz, tx, tz] = kayAx(clamp(tc, -KAY_X, KAY_X)); tc = clamp(tc, -KAY_X, KAY_X) + (x - cx) * tx + (z - cz) * tz; }
    return tc / (1 - KAY_K * (y - KAY_CY) / KAY_R);
  }
  // point on the roll's skin at t and angle ph (from the top, + toward the front), lifted by out: [pos, normal]
  function kayOn(t, ph, out = 0) {
    const rr = kayBR(t) + out, u = Math.cos(ph), w = Math.sin(ph), [, , tx, tz] = kayAx(clamp(t, -KAY_X, KAY_X));
    return [kayXf(t, rr * u, rr * w), [-tz * w, u, tx * w]];
  }
  // the axes the end spirals spin around (their faces' normals; + = rolling forward)
  const KAY_TN = KAY_K * (KAY_X + KAY_DOME) / KAY_R, KAY_T1 = kayAx(KAY_X);
  const KAY_AXL = new THREE.Vector3(KAY_T1[2], KAY_TN, KAY_T1[3]).normalize(), KAY_AXR = new THREE.Vector3(KAY_T1[2], -KAY_TN, -KAY_T1[3]).normalize();
  const DIPPER_P = [[0, 0], [0.028, 0.004], [0.036, 0.014], [0.027, 0.022], [0.037, 0.031], [0.027, 0.04], [0.036, 0.049], [0.026, 0.058], [0.03, 0.066], [0.012, 0.074], [0.01, 0.08]];
  function kayRollGeo() {
    const sg = sN(48, 22);
    return gx('kayRoll@' + sg, () => {
      const pts = [], capN = 6, edgeN = 7, midN = 14, tc = KAY_X - KAY_E;
      // profile (radius, t) from the right end-face centre to the left one: domed face, rounded edge, barrel, and back
      for (let i = 0; i <= capN; i++) { const rr = KAY_CR * i / capN; pts.push([rr, -(KAY_X + KAY_DOME * (1 - (rr / KAY_CR) ** 2))]); }
      for (let i = 1; i <= edgeN; i++) { const a = i / edgeN * PI / 2; pts.push([KAY_CR + KAY_E * Math.sin(a), -tc - KAY_E * Math.cos(a)]); }
      for (let i = 1; i < midN; i++) { const t = lerp(-tc, tc, i / midN); pts.push([kayBR(t), t]); }
      for (let i = 0; i < edgeN; i++) { const a = i / edgeN * PI / 2; pts.push([KAY_CR + KAY_E * Math.cos(a), tc + KAY_E * Math.sin(a)]); }
      for (let i = capN; i >= 0; i--) { const rr = KAY_CR * i / capN; pts.push([rr, KAY_X + KAY_DOME * (1 - (rr / KAY_CR) ** 2)]); }
      const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), sg);
      g.rotateZ(-PI / 2);   // lathe axis y → the roll's axis x
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const q = kayXf(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, q[0], q[1], q[2]); }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  // the rolled spiral lying on an end face (side +1 = left / +x), in the face's own frame: a raised caramel line
  function kaySpiralGeo(side) {
    const n = sN(96, 44);
    return gx('kaySpiral' + side + '@' + n, () => {
      const pts = [];
      for (let i = 0; i <= 64; i++) {
        const s = i / 64, rho = 0.022 + (KAY_CR * 0.93 - 0.022) * s, a = s * 2.6 * TAU;
        pts.push(new THREE.Vector3(...kayXf(side * (KAY_X + KAY_DOME * (1 - (rho / KAY_CR) ** 2) + 0.004), rho * Math.cos(a), rho * Math.sin(a) * side)));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.0115, 5, false);
    });
  }
  // honey draped over the top like a beret: thick in the middle, thin at the edges, a few drips down the front (clear of the
  // brows) and the back. kayHoneyEdge(t) = [front edge, back edge] as angles from the top (+ = front)
  // and the end taper, or null off the honey.
  const KAY_HT = [-0.2, 0.3], KAY_HDRIP = { front: [[0.262, 0.3, 0.022]], back: [[-0.06, 0.5, 0.03], [0.12, 0.38, 0.028], [0.24, 0.26, 0.022]] };
  function kayHoneyEdge(t) {
    const s = (t - KAY_HT[0]) / (KAY_HT[1] - KAY_HT[0]);
    if (s < 0 || s > 1) return null;
    const e = Math.pow(Math.max(0, 1 - Math.abs(2 * s - 1) ** 6), 0.4), bump = (c, w) => Math.exp(-(((t - c) / w) ** 2)), mid = -0.25;
    let fr = 0.36 + 0.04 * Math.sin(t * 40), bk = -0.95 + 0.07 * Math.sin(t * 33 + 1);
    for (const [c, k, w] of KAY_HDRIP.front) fr += k * bump(c, w);
    for (const [c, k, w] of KAY_HDRIP.back) bk -= k * bump(c, w);
    return [mid + (fr - mid) * e, mid + (bk - mid) * e, e];
  }
  function kayHoneyGeo() {
    const nt = sN(34, 18), nv = sN(16, 9);
    return gx('kayHoney@' + nt + '_' + nv, () => {
      const g = new THREE.PlaneGeometry(1, 1, nt, nv), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const s = uv.getX(i), v = uv.getY(i), t = lerp(KAY_HT[0], KAY_HT[1], s), [fr, bk, e] = kayHoneyEdge(t);
        const ph = lerp(fr, bk, v);
        const th = 0.003 + 0.021 * e * Math.pow(Math.sin(PI * v), 0.5) * (0.85 + 0.15 * Math.sin(t * 50 + v * 7));
        const rr = kayBR(t) + th, q = kayXf(t, rr * Math.cos(ph), rr * Math.sin(ph));
        p.setXYZ(i, q[0], q[1], q[2]);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  function buildKaymak(r, o) {
    const E = o.elite;
    let skin = col('#fffaf0'), skinD = col('#f0dcb8'), skinL = col('#ffffff'), crust = col('#d99a48');
    let sour = col('#ffe89c'), sourD = col('#eab466'), sourL = col('#fff6d2');
    if (E) { skinD = rich(skinD, 1.3, 0.92); crust = rich(crust, 1.25, 0.88); sour = rich(sour, 1.3, 0.96); sourD = rich(sourD, 1.3, 0.9); }
    const top = KAY_CY + KAY_R;
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('hat', 'body', [0.05, top, -0.06]);
    r.bone('armL', 'body', kayOn(0.28, 2.2, -0.05)[0]); r.bone('armR', 'body', kayOn(-0.28, 2.2, -0.05)[0]);
    r.bone('spL', 'body', kayXf(KAY_X + KAY_DOME, 0, 0)); r.bone('spR', 'body', kayXf(-(KAY_X + KAY_DOME), 0, 0));
    r.bone('smear', 'root', [0, 0.005, -0.12]);
    const wob = (x, y) => 0.4 + 0.6 * smooth01(y / 0.45);
    const endK = (x, y, z) => smooth01((Math.abs(kayT(x, y, z)) - (KAY_X - 0.035)) / 0.03);   // 1 on the end faces (lighter cut cream)
    // the roll (per mood)
    for (const md of [1, 2]) {
      const c0 = md === 1 ? sour : skin, cD = md === 1 ? sourD : skinD, cL = md === 1 ? sourL : skinL, g = vgrad(0, top, [[0, cD], [0.35, c0], [0.8, mixc(c0, cL, 0.55)], [1, cL]]), out = new THREE.Color();
      r.mood = md;
      r.on('body').fx(0, 0.7, 0, wob).add(kayRollGeo(), (x, y, z) => out.copy(g(x, y, z)).lerp(cL, endK(x, y, z) * 0.6));
      if (md === 1) {   // "kesik": a few soft little curds on the skin (never lumpy-gross: tiny, round, glossy), away from the face
        r.fx(0, 0.8);
        for (const [t, ph, s] of [[0.3, 0.9, 0.028], [-0.31, 1.1, 0.026], [0.24, 1.9, 0.026], [-0.26, 2.0, 0.028], [0.33, 0.3, 0.022], [-0.33, -0.5, 0.024], [0.0, -1.9, 0.026], [-0.25, -1.3, 0.022]]) {
          const [p, n] = kayOn(t, ph, 0.003); r.add(G.sphere(10, 8), sourL, p, qz(...n), [s, s, s * 0.6]);
        }
      }
    }
    r.mood = 0;
    // the spirals on both end faces (caramel lines on the lighter cut cream; bones spL / spR spin them)
    for (const sd of [1, -1]) {
      r.on(sd > 0 ? 'spL' : 'spR').fx(0, 0.5, 0, 1).add(kaySpiralGeo(sd), crust);
      r.add(G.sphere(10, 8), crust, kayXf(sd * (KAY_X + KAY_DOME + 0.004), 0.012, 0.016 * sd), null, 0.02);
    }
    // painted gloss: a long highlight along the upper front of the roll (the classic "cylinder" shine), upper left
    r.on('body');
    { const [p, n] = kayOn(-0.25, 0.62, 0.004); gloss(r, p, n, 0.075, 0.018, 1.12, 0.06); }
    { const [p, n] = kayOn(0.27, 0.66, 0.004); gloss(r, p, n, 0.03, 0.01, 1.05); }
    // tiny cream nub arms at its front corners
    for (const sd of [-1, 1]) {
      const [p, n] = kayOn(0.32 * sd, 2.25, 0.0);
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.7).add(G.sphere(16, 12), skin, p, qz(n[0] + 0.5 * sd, n[1] - 0.3, n[2]), [0.052, 0.052, 0.078]);
    }
    // the creamy smear it glides on (scaled by speed in anim)
    r.on('smear').fx(0, 1).add(G.sphere(24, 8), mixc(skin, '#ffffff', 0.4), [0, 0.004, -0.12], null, [0.4, 0.012, 0.3]);
    // honey drizzle "hat": glossy amber draped over the top, drips with drops at their tips, a little pool, a wooden honey dipper
    r.on('body').fx(0.12, 1).add(kayHoneyGeo(), vgrad(top - 0.14, top + 0.02, [[0, DAIRY.honeyD], [0.55, DAIRY.honey], [1, DAIRY.honeyL]]));
    for (const [t, k, fr] of KAY_HDRIP.front.map(d => [d[0], 0.8, 1]).concat(KAY_HDRIP.back.map((d, i) => [d[0], [1, 0.9, 0.7][i], 0]))) {
      const ed = kayHoneyEdge(t), [p, n] = kayOn(t, fr ? ed[0] + 0.03 : ed[1] - 0.03, 0.012);
      r.fx(0.12, 1).add(G.sphere(12, 10), DAIRY.honey, p, qz(...n), [0.024 * k, 0.03 * k, 0.018 * k]);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#fff4d0', 1.2), [p[0] - 0.006, p[1] + n[1] * 0.02 + 0.004, p[2] + n[2] * 0.02], null, 0.006 * k);
    }
    r.fx(1, 0).add(G.sphere(10, 6), hdr('#fff6dc', 1.25), kayOn(-0.02, 0.05, 0.03)[0], [0, 0.3, 0], [0.06, 0.006, 0.016]);
    r.on('hat').fx(0.12, 1).add(G.sphere(16, 8), vgrad(top, top + 0.04, [[0, DAIRY.honey], [1, DAIRY.honeyL]]), [0.07, top + 0.012, -0.05], null, [0.08, 0.022, 0.07]);
    // the honey dipper: grooved head sunk in the pool, handle up and back like a feather
    {
      const q = qy(0.55, 0.8, -0.9), d = new THREE.Vector3(0.55, 0.8, -0.9).normalize(), b0 = [0.1, top - 0.004, -0.07];
      const wc = (() => { const out = new THREE.Color(), a = col(DAIRY.wood), b = col(DAIRY.woodD); return (x, y, z) => out.copy(a).lerp(b, 0.3 + 0.3 * Math.sin(y * 90 + x * 40)); })();
      r.fx(0, 0.2).add(lathe('dipper', DIPPER_P, 16, 3), wc, b0, q, 1);
      const h0 = [b0[0] + d.x * 0.08, b0[1] + d.y * 0.08, b0[2] + d.z * 0.08], h1 = [b0[0] + d.x * 0.22, b0[1] + d.y * 0.22, b0[2] + d.z * 0.22];
      r.seg(h0, h1, 0.011, DAIRY.wood, 0.012, 8).add(G.sphere(10, 8), DAIRY.woodD, h1, null, 0.018);
    }
    r.fx(0, 0);
    if (E) { const [p] = kayOn(-0.26, -0.12, -0.012); crown(r.on('body'), p, 0.46, undefined, 1); }   // beside the honey (gold on honey got lost)
    // face on the roll's front (the eyes' sphere just a little wider than the roll so they sit on its skin; the mouth hugs it)
    face(r, [0, KAY_CY, 0], 0.274, dairyFace({ bone: 'body', tilt: 0.26, ex: 0.1, ey: 0.018, er: 0.084, inset: 0.014, skin: sour, mc: [0, KAY_CY, 0], mR: 0.266,
      mouthY: -0.085, mouthW: 0.092, browY: 1.2, heartY: 0.85, heartX: 1.5, blushX: -0.3, blushY: 1.0 }));
    r.on('body').mark('muzzle', [0, KAY_CY, 0.3]);
    return { height: 0.68, glowC: col('#ffb03a'), mat: { rough: 0.32, sss: col('#fff0d0').multiplyScalar(0.05), rim: '#fffaf0', rimK: 0.24, wob: 0.006, wobF: 3.5, wobS: 4 } };
  }
  function animKaymak(m, dt, st, s) {
    const B = m.B, mv = s.mv, br = Math.sin(s.t * 2.6 + s.ph);
    // a smooth glide: soft stretch pulses, leaning into the slide, rocking a little from side to side
    s.walk += dt * (5 + 5 * mv);
    const pl = Math.sin(s.walk * 1.3), k = Math.min(1, mv * 1.4);
    let sy = 1 + 0.02 * br - 0.04 * pl * k, sz = 1 + 0.05 * pl * k, sx = 1 - 0.01 * br + 0.02 * pl * k, rx = 0.1 * k, rz = Math.sin(s.walk * 0.65) * 0.05 * k, y = Math.abs(Math.sin(s.walk * 0.65)) * 0.012 * k, z = 0;
    let arm = Math.sin(s.t * 2.2 + s.ph) * 0.12, hat = 0, spin = 0.6 + 9 * mv;
    if (st.windup >= 0) {   // rears back, squashes wide, arms up — the spirals spin up, gathering speed
      const w = smooth01(st.windup);
      rx -= 0.3 * w; sy *= 1 - 0.16 * w; sx *= 1 + 0.1 * w; sz *= 1 + 0.06 * w; z -= 0.06 * w; arm += 1.3 * w; hat = 0.5 * w; spin += 16 * w;
      B.body.position.x += Math.sin(s.t * 60) * 0.012 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // whoosh: one long creamy stretch while GAME carries it along the lane
      const a = st.attack, kk = smooth01(a / 0.12) * (1 - 0.5 * smooth01((a - 0.8) / 0.2));
      z += 0.06 * kk; sz *= 1 + 0.26 * kk; sy *= 1 - 0.12 * kk; rx += 0.3 * kk; arm -= 0.6 * kk; hat = -0.4 * kk; spin += 18 * kk;
      rz = Math.sin(s.t * 18) * 0.03 * kk;
    } else if (st.attack >= 1) {   // stopped: settles with a wobble
      sy *= 1 + 0.04 * Math.sin(s.t * 16); sz *= 1 - 0.04 * Math.sin(s.t * 16); arm += 0.4;
    }
    B.body.position.y += y; B.body.position.z += z;
    B.body.scale.set(sx, sy, sz); B.body.rotation.set(rx, 0, rz);
    B.hat.rotation.x = -0.12 * hat + Math.sin(s.t * 1.9 + s.ph) * 0.03; B.hat.rotation.z = -rz * 0.5;
    B.armL.rotation.z = 0.1 + arm; B.armR.rotation.z = -0.1 - arm;
    // the end spirals roll like wheels (slowly swirling while it stands)
    s.roll = ((s.roll || 0) + dt * spin) % TAU;
    B.spL.quaternion.setFromAxisAngle(KAY_AXL, s.roll); B.spR.quaternion.setFromAxisAngle(KAY_AXR, s.roll);
    // the smear grows behind it while it glides (and on the attack's long slide)
    s.smear = damp(s.smear ?? 0, Math.max(mv, st.attack >= 0 && st.attack < 1 ? 1 : 0), 3, dt);
    B.smear.scale.set(0.5 + 0.5 * s.smear, 1, 0.25 + 1.1 * s.smear); B.smear.position.z -= 0.18 * s.smear;
    m.U.uWob.value.x = st.hurt > 0.5 ? 0.02 * st.hurt : 0.006 + 0.004 * mv;
  }

  // ── Kefir Köpüğü (~0.8 m, flies): a floating cluster of glossy pearly foam bubbles with soap-bubble tints; the big front bubble
  // has the face, tiny fizz bubbles rise and pop around it. Ranged: puffs slow fizz bubbles (shot kind 'fizz'). ──
  const KOP_CY = 0.38, KOP_R = 0.28;
  const KOP_BUBS = [   // [x, y, z (relative to the centre), radius, bone, tint]
    [0.25, 0.1, -0.1, 0.15, 'bA', '#ffc6e2'], [-0.24, 0.13, -0.09, 0.14, 'bB', '#c2e2ff'], [0.04, 0.27, -0.14, 0.155, 'bC', '#c6f6de'],
    [-0.12, -0.16, -0.12, 0.12, 'bB', '#dccaff'], [0.19, -0.13, -0.06, 0.11, 'bA', '#c2e2ff'], [0.0, 0.07, -0.3, 0.17, 'bC', '#ffdcc4'],
    [0.31, 0.27, -0.04, 0.075, 'bA', '#c6f6de'], [-0.3, 0.02, 0.1, 0.075, 'bB', '#ffc6e2'], [-0.17, 0.33, 0.0, 0.07, 'bC', '#c2e2ff'], [0.13, 0.36, 0.06, 0.055, 'bA', '#dccaff']];
  function bubbleCol(cx, cy, cz, tint, base) {   // pearly: white core, a soft tint band toward the rim + a warmer lower edge
    const out = new THREE.Color(), w = col(base), t = col(tint), lo = mixc(tint, '#ffe8c8', 0.5);
    return (x, y, z) => {
      const dx = x - cx, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz) || 1;
      const band = 0.5 + 0.5 * Math.sin((dx * 1.3 + dy * 2.1 - dz * 0.7) / l * 2.6);
      return out.copy(w).lerp(t, 0.35 + 0.4 * band).lerp(lo, smooth01(-dy / l) * 0.25);
    };
  }
  function buildKopuk(r, o) {
    const E = o.elite, cy = KOP_CY, R = KOP_R, base = E ? '#fff4d6' : '#fbfdff';
    r.bone('body', 'root', [0, cy, 0]);
    for (const b of ['bA', 'bB', 'bC']) r.bone(b, 'body', [0, cy, -0.1]);
    for (let i = 0; i < 3; i++) r.bone('fz' + i, 'body', [0, cy, 0]);
    // main bubble (face) + the cluster
    r.on('body').fx(0, 1).add(G.sphere(36, 26), bubbleCol(0, cy, 0, E ? '#ffe7a8' : '#dff0ff', base), [0, cy, 0], null, R);
    gloss(r, ...onEll([0, cy, 0], [R, R, R], 0.62, -0.72), 0.075, 0.035, 1.3, 0.8);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.3), onEll([0, cy, 0], [R, R, R], 0.9, -1.05)[0], null, 0.018);
    for (const [bx, by, bz, br, bn, tint] of KOP_BUBS) {
      const c = [bx, cy + by, bz];
      r.on(bn).fx(0, 1).add(G.sphere(22, 16), bubbleCol(c[0], c[1], c[2], E ? '#ffe7a8' : tint, base), c, null, br);
      const [p, n] = onEll(c, [br, br, br], 0.66, -0.75); gloss(r, p, n, br * 0.28, br * 0.13, 1.25, 0.8);
    }
    // tiny fizz bubbles (they rise and pop in anim)
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + 0.4, p = [Math.sin(a) * 0.3, cy + 0.1, Math.cos(a) * 0.12 - 0.05];
      r.on('fz' + i).fx(0, 1).add(G.sphere(12, 8), '#eef8ff', p, null, 0.035);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.3), [p[0] - 0.012, p[1] + 0.014, p[2] + 0.02], null, 0.009);
    }
    r.fx(0, 0);
    if (E) crown(r.on('bC'), [0.04, cy + 0.4, -0.14], 0.5, undefined, 1);
    face(r, [0, cy, 0], R, dairyFace({ bone: 'body', tilt: 0.32, ex: 0.1, ey: 0.03, er: 0.084, skin: mixc(base, '#e6f2ff', 0.4), mouthY: -0.1, mouthW: 0.092, heartY: 0.95, heartX: 1.2, blushY: 1.0 }));
    r.on('body').mark('muzzle', [0, cy - 0.06, 0.32]);
    return { height: 0.8, glowC: col('#9fd8ff'), mat: { rough: 0.16, sss: col('#e8f4ff').multiplyScalar(0.06), rim: '#8fc8ff', rimK: 0.55, rimP: 1.9, wob: 0.006, wobF: 5, wobS: 4 } };
  }
  const FZ_OFF = [0, 0.37, 0.71];
  function animKopuk(m, dt, st, s) {
    const B = m.B;
    B.body.position.y += Math.sin(s.t * 2.2 + s.ph) * 0.035;
    B.body.rotation.z = Math.sin(s.t * 1.4 + s.ph) * 0.07; B.body.rotation.y = Math.sin(s.t * 0.9 + s.ph) * 0.12;
    B.body.rotation.x = 0.14 * s.mv;
    let puff = 0;
    const jig = n => Math.sin(s.t * (4.2 + n) + s.ph * (1 + n));
    B.bA.position.x += 0.012 * jig(0); B.bA.position.y += 0.01 * jig(1);
    B.bB.position.x -= 0.012 * jig(2); B.bB.position.y += 0.01 * jig(0.5);
    B.bC.position.y += 0.012 * jig(1.5); B.bC.position.z += 0.008 * jig(2.5);
    if (st.windup >= 0) {   // takes a big breath: the foam swells, the little bubbles spread out
      const w = smooth01(st.windup); puff = w;
      B.body.scale.setScalar(1 + 0.16 * w); B.body.rotation.x -= 0.28 * w;
      for (const b of [B.bA, B.bB, B.bC]) b.scale.setScalar(1 + 0.12 * w);
      B.body.position.x += Math.sin(s.t * 55) * 0.01 * st.windup;
    }
    if (st.attack >= 0) {   // pfff! puffs the fizz bubble forward
      const k = Math.sin(PI * st.attack);
      B.body.scale.set(1 + 0.1 * k, 1 - 0.1 * k, 1 - 0.14 * k); B.body.position.z += 0.16 * k; B.body.rotation.x += 0.3 * k;
    }
    // fizz: tiny bubbles rise from the foam, grow a bit and pop
    const sp = 0.7 + 1.2 * puff + 0.4 * s.mv;
    s.fz = (s.fz || 0) + dt * sp;
    for (let i = 0; i < 3; i++) {
      const b = B['fz' + i], u = (s.fz + FZ_OFF[i]) % 1;
      b.position.y += u * 0.42; b.position.x += Math.sin(u * 7 + i) * 0.03;
      let sc = u < 0.1 ? u / 0.1 : 1 + 0.4 * u;
      if (u > 0.9) sc *= u < 0.95 ? 1 + (u - 0.9) * 6 : (1 - u) / 0.05 * 1.3;   // swells, then pops
      b.scale.setScalar(Math.max(0.0001, sc));
    }
    m.U.uWob.value.x = 0.006 + 0.012 * puff + (st.hurt > 0.5 ? 0.02 * st.hurt : 0);
  }

  // ── Peynir Dilimi (~1.4 m): a plump Swiss-cheese wedge standing on its rind, the rounded point up, on little red-wax boots. The
  // triangle faces forward (sheared back a little, so the face looks up at the gameplay camera); round holes of many sizes (big
  // shaded dents + the swiss texture), an orange rind along the bottom, stubby arms. Slow, tanky melee: waddles, leans back
  // (wind-up) and belly-flops forward onto Feza. ──
  const PEY = { b: 0.3, d: 0.44, bev: 0.065, K: 0.24 };   // bottom y, depth (z), bevel, backward shear (z -= K·(y − b))
  const PEY_C = [[0.47, 0.42], [0.32, 0.91], [0.08, 1.36]];   // right side: quadratic curve bottom corner → near the apex (bulging out)
  function wedgeShape() {   // the triangle in (x, y)
    const s = new THREE.Shape(), [A, M, E] = PEY_C;
    s.moveTo(-0.38, PEY.b);
    s.lineTo(0.38, PEY.b);
    s.quadraticCurveTo(0.5, PEY.b, A[0], A[1]);
    s.quadraticCurveTo(M[0], M[1], E[0], E[1]);
    s.quadraticCurveTo(0, 1.46, -E[0], E[1]);
    s.quadraticCurveTo(-M[0], M[1], -A[0], A[1]);
    s.quadraticCurveTo(-0.5, PEY.b, -0.38, PEY.b);
    return s;
  }
  const peyShear = p => [p[0], p[1], p[2] - PEY.K * (p[1] - PEY.b)];
  const peyShearN = n => { const x = n[0], y = n[1] + PEY.K * n[2], z = n[2], l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  function peyWedgeGeo() {
    const g0 = extrude('cheeseWedge', wedgeShape, PEY.d, PEY.bev, 14, 0.7);
    return gx('cheeseWedgeS_' + g0.uuid, () => {
      const g = g0.clone(), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        const q = peyShear([p.getX(i), p.getY(i), p.getZ(i)]), m = peyShearN([n.getX(i), n.getY(i), n.getZ(i)]);
        p.setXYZ(i, q[0], q[1], q[2]); n.setXYZ(i, m[0], m[1], m[2]);
      }
      g.computeBoundingSphere(); g.computeBoundingBox();
      return g;
    });
  }
  // Point on the front face (x, y) / on a slanted side (side sd, fraction t up the side, depth z): [pos, normal], sheared.
  const PEY_FZ = PEY.d / 2 + PEY.bev;
  function peyFront(x, y, out = 0) { return [peyShear([x, y, PEY_FZ + out]), peyShearN([0, 0, 1])]; }
  function peySide(sd, t, z, out = 0) {
    const [A, M, E] = PEY_C, u = 1 - t;
    const x = u * u * A[0] + 2 * u * t * M[0] + t * t * E[0], y = u * u * A[1] + 2 * u * t * M[1] + t * t * E[1];
    const tx = 2 * u * (M[0] - A[0]) + 2 * t * (E[0] - M[0]), ty = 2 * u * (M[1] - A[1]) + 2 * t * (E[1] - M[1]), l = Math.hypot(tx, ty) || 1;
    const nx = ty / l, ny = -tx / l, k = PEY.bev + out;
    return [peyShear([sd * (x + nx * k), y + ny * k, z]), peyShearN([sd * nx, ny, 0])];
  }
  // Round dent (unit disc facing +z): normals lean toward the centre inside the hole and outward on its lit lip.
  function holeGeo() {
    const ss = sN(22, 12);
    return gx('cheeseHole@' + ss, () => {
      const RR = [0, 0.36, 0.6, 0.75, 0.86, 1], KK = [0, -0.42, -0.8, -1.0, 0.55, 0];
      const pos = [0, 0, 0], nor = [0, 0, 1], uv = [0.5, 0.5], idx = [];
      for (let i = 1; i < RR.length; i++) for (let j = 0; j < ss; j++) {
        const a = j / ss * TAU, c = Math.cos(a), sn = Math.sin(a), k = KK[i], l = Math.hypot(k, 1);
        pos.push(c * RR[i], sn * RR[i], 0); nor.push(c * k / l, sn * k / l, 1 / l); uv.push(0.5 + c * RR[i] * 0.5, 0.5 + sn * RR[i] * 0.5);
      }
      for (let j = 0; j < ss; j++) idx.push(0, 1 + j, 1 + (j + 1) % ss);
      for (let i = 1; i < RR.length - 1; i++) for (let j = 0; j < ss; j++) {
        const a = 1 + (i - 1) * ss + j, b = 1 + (i - 1) * ss + (j + 1) % ss, c2 = a + ss, d = b + ss;
        idx.push(a, c2, b, b, c2, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      return g;
    });
  }
  function holeCol(c, rad, body, deep) {   // darker golden inside, a pale cut lip, the body colour at the edge
    const out = new THREE.Color(), B = col(body), D = col(deep), Dk = mixc(deep, '#b8781c', 0.5), Lp = mixc(body, '#fff6c0', 0.55);
    return (x, y, z) => {
      const d = Math.hypot(x - c[0], y - c[1], z - c[2]) / rad;
      if (d < 0.75) return out.copy(Dk).lerp(D, smooth01(d / 0.75));
      if (d < 0.9) return out.copy(D).lerp(Lp, smooth01((d - 0.75) / 0.12));
      return out.copy(Lp).lerp(B, smooth01((d - 0.88) / 0.12));
    };
  }
  function buildPeynir(r, o) {
    const E = o.elite;
    if (typeof TEX !== 'undefined' && TEX && TEX.ensure) { try { TEX.ensure('swiss'); } catch (e) { /* lazy texture: made on first use */ } }
    const cheese = E ? '#ffcc3a' : '#ffd650', cheeseD = E ? '#f0a820' : '#f2b83a', rind = '#f0902e', wax = E ? '#e8304a' : '#ff4a5a', waxD = '#c8243a';
    r.bone('body', 'root', [0, PEY.b, 0]);
    r.bone('armL', 'body', peyShear([0.36, 0.8, 0])); r.bone('armR', 'body', peyShear([-0.36, 0.8, 0]));
    r.bone('legL', 'root', [0.22, PEY.b, 0]); r.bone('legR', 'root', [-0.22, PEY.b, 0]);
    // the wedge (swiss texture; the orange rind along the bottom is plain)
    const bodyCol = (() => { const out = new THREE.Color(), c = col('#ffffff'), rd = col(rind); return (x, y) => out.copy(c).lerp(rd, smooth01((PEY.b + 0.035 - y) / 0.04)); })();
    const texM = (x, y) => smooth01((y - PEY.b - 0.01) / 0.04);
    r.on('body').fx(0, 0.35, texM).uv(1.2).add(peyWedgeGeo(), bodyCol);
    r.uv(null);
    // big round holes: around the face on the front, on both slanted sides (they face up toward the camera) and on the back
    const HOLES = [];
    for (const [x, y, rr] of [[-0.31, 0.47, 0.065], [0.3, 0.45, 0.05], [0.02, 1.21, 0.055], [-0.1, 0.39, 0.028], [0.19, 0.37, 0.03], [-0.16, 1.07, 0.03]]) HOLES.push([...peyFront(x, y, 0.003), rr]);
    for (const sd of [-1, 1]) for (const [t, z, rr] of [[0.22, -0.08, 0.07], [0.5, 0.1, 0.06], [0.76, -0.1, 0.045], [0.4, -0.2, 0.035], [0.62, 0.16, 0.03]]) {
      HOLES.push([...peySide(sd, t, sd > 0 ? z : -z * 0.8, 0.003), rr * (sd > 0 ? 1 : 0.92)]);
    }
    for (const [x, y, rr] of [[-0.18, 0.6, 0.1], [0.22, 0.82, 0.07], [0.0, 1.1, 0.05]]) HOLES.push([peyShear([x, y, -PEY_FZ - 0.003]), peyShearN([0, 0, -1]), rr]);
    r.fx(0, 0.45, 0);
    for (const [p, n, rr] of HOLES) r.add(holeGeo(), holeCol(p, rr, '#ffe070', cheeseD), p, qz(...n), rr);
    // painted gloss (upper left of the front) and a thin darker rind line
    { const [p, n] = peyFront(-0.19, 1.0, 0.004); gloss(r, p, n, 0.028, 0.1, 1.1, -0.4); }
    r.fx(0, 0);
    // stubby arms with round hands, out of the slanted sides
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 0.45);
      const s0 = peyShear([0.36 * sd, 0.8, 0]), s1 = peyShear([0.58 * sd, 0.6, 0.1]), h = peyShear([0.61 * sd, 0.56, 0.13]);
      r.seg(s0, s1, 0.068, cheese, 0.064, 12);
      r.add(G.sphere(18, 12), cheese, h, null, [0.1, 0.095, 0.1]);
      r.add(G.sphere(10, 8), cheese, [h[0] - sd * 0.02, h[1] + 0.04, h[2] + 0.08], null, 0.045);
    }
    // little legs in red-wax boots
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0.35);
      r.seg([0.22 * sd, 0.32, 0], [0.22 * sd, 0.12, 0.03], 0.07, cheeseD, 0.065, 12);
      r.fx(0, 0.9).add(G.sphere(20, 14), vgrad(0, 0.16, [[0, waxD], [1, wax]]), [0.22 * sd, 0.075, 0.07], null, [0.12, 0.085, 0.16]);
      r.add(G.torus(TAU, 0.3, 20), wax, [0.22 * sd, 0.14, 0.02], [PI / 2, 0, 0], [0.078, 0.078, 0.06]);
    }
    r.fx(0, 0);
    if (E) crown(r.on('body'), peyShear([0, 1.44, 0]), 0.75, undefined, 1);
    // face on the front: a big sphere tangent to the (sheared) front face
    const [F, FN] = peyFront(0, 0.8), FR = 1.0, tilt = Math.atan2(FN[1], FN[2]);
    const FC = [0, F[1] - FN[1] * FR, F[2] - FN[2] * FR];
    face(r, FC, FR, dairyFace({ bone: 'body', tilt, ex: 0.155, ey: 0.03, er: 0.108, inset: 0.012, skin: '#ffe27a', mouthY: -0.15, mouthW: 0.125, heartY: 0.5, heartX: 0.5, heartS: 0.24, blushY: 1.0, blushX: 0.32 }));
    r.on('body').mark('muzzle', [F[0], F[1] + FN[1] * 0.12, F[2] + FN[2] * 0.12]);
    return { height: 1.4, glowC: col('#ffb03a'), tex: texOf('swiss'), glowK: 0.8,
      mat: { rough: 0.5, ns: 1.1, sss: col('#ffe080').multiplyScalar(0.05), rim: '#fff4c8', rimK: 0.22 } };
  }
  function animPeynir(m, dt, st, s) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * (4.2 + 3 * s.mv);
    const ph = s.walk, k = Math.min(1, s.mv * 1.4), br = Math.sin(s.t * 1.9 + s.ph);
    // waddle: the wedge rocks from boot to boot
    B.body.rotation.z = Math.sin(ph) * 0.08 * k + Math.sin(s.t * 1.1 + s.ph) * 0.015;
    B.body.position.y += Math.abs(Math.cos(ph)) * 0.035 * k + Math.abs(B.body.rotation.z) * 0.45;
    B.body.scale.set(1 - 0.008 * br, 1 + 0.012 * br, 1);
    B.legL.position.y += Math.max(0, Math.sin(ph)) * 0.07 * k; B.legL.position.z += Math.cos(ph) * 0.06 * k;
    B.legR.position.y += Math.max(0, -Math.sin(ph)) * 0.07 * k; B.legR.position.z -= Math.cos(ph) * 0.06 * k;
    let aL = 0.1 + Math.sin(ph) * 0.35 * k + Math.sin(s.t * 1.6 + s.ph) * 0.06, aR = 0.1 - Math.sin(ph) * 0.35 * k + Math.sin(s.t * 1.6 + s.ph + 1) * 0.06, ax = 0, tip = 0;
    if (st.windup >= 0) {   // leans way back on its heels, little arms up — here comes the belly flop
      const w = smooth01(st.windup);
      tip = -0.28 * w; aL = aR = 0.2 + 1.9 * w; ax = -0.4 * w; B.body.position.x += Math.sin(s.t * 48) * 0.012 * st.windup;
    }
    if (st.attack >= 0) {   // flops forward onto its front edge right away (GAME's slam ring fires as the attack starts), rocks back up
      const a = st.attack, hit = smooth01(a / 0.1), back = smooth01((a - 0.35) / 0.65), f = hit * (1 - back);
      tip = 0.5 * f - 0.28 * (1 - hit);
      B.body.scale.y *= 1 - 0.1 * f * (1 - smooth01((a - 0.1) / 0.25)); aL = aR = lerp(2.1, 0.5, hit) * (1 - back) + 0.1 * back; ax = -0.9 * f;
    }
    if (tip) {   // tip over the front (or back) bottom edge instead of the body's centre, so it never sinks into the floor
      const dz = tip > 0 ? PEY_FZ : -PEY_FZ, dy = -PEY.bev, c = Math.cos(tip), sn = Math.sin(tip);
      B.body.rotation.x = tip; B.body.position.y += dy - (dy * c - dz * sn); B.body.position.z += dz - (dy * sn + dz * c);
    }
    B.armL.rotation.z = aL; B.armR.rotation.z = -aR; B.armL.rotation.x = ax; B.armR.rotation.x = ax;
  }

  // ── Köpüklü Kefir Devi (~3 m): a big friendly glass kefir bottle. See-through bluish glass (its own mesh, def.extras) over creamy
  // kefir, bold painted glass streaks (the cartoon "this is glass" cue), bubbles rising inside and a few clinging to the glass, a
  // bluish meniscus ring at the fill line, fizzy foam filling the neck up to a glass lip ring, on which the golden crown cork sits
  // (worn tilted like a crown), a light sky-blue label round the front (the back and sides show the kefir through the glass)
  // with the face, little frosted-glass arms and feet. Phases (st.phase + st.phaseT): idle · move (waddle) · shake (wind-up:
  // wobbles and fizzes) · geyser (pops its cap 0.1, sprays foam 0.14–0.84, cap back on ~0.9) · bubbles (puffs up, 5 fizz
  // bubbles at 0.4 … 0.8 while turning left → right: the fan) · slam (crouch 0–0.2, airborne 0.2–0.8, lands at 0.8) · summon ·
  // roar (a happy "fizz!") · dying: overjoyed; st.dying 0.05–0.45 it hands Feza a glass of kefir with a straw (m.giftPos(),
  // or st.give 0..1 drives it), then happy hops, waves and twirls into sparkles. ──
  const KD_P = [[0, 0], [0.78, 0], [0.9, 0.025], [0.97, 0.09], [1.03, 0.28], [1.08, 0.58], [1.1, 0.9], [1.09, 1.18], [1.05, 1.42], [0.97, 1.62],
    [0.85, 1.8], [0.7, 1.95], [0.56, 2.08], [0.47, 2.2], [0.43, 2.32], [0.425, 2.44]];
  const KD_GLASS = KD_P.concat([[0.44, 2.49], [0.47, 2.53], [0.458, 2.575], [0.42, 2.59], [0.39, 2.56], [0.382, 2.5], [0.38, 2.36]]);
  const KD_FILL = 2.02, KD_LAB = [0.72, 1.8], KD_FACE = [0, 1.02, -0.03], KD_FY = 1.3;   // label band; face sphere centre; face height
  const KD_GIVE = { from: 0.05, to: 0.45 };
  const KD_GIFT = [-1.43, 1.16, 0.38];   // base of the gift glass, standing on the right mitten
  // the right arm swings from hanging (shoulder → hand) to reaching forward-out: holds the glass out in front of its side
  const KD_ARM_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(-0.42, -0.36, 0.28).normalize(), new THREE.Vector3(-0.3, -0.02, 0.76).normalize());
  const _kq = new THREE.Quaternion(), _kq0 = new THREE.Quaternion();
  const kdR = y => profR('kd', KD_P)(y);
  // rising bubbles: azimuth, phase, radius, speed, band. The high game camera sees the bottle's shoulders (the belly hides the part
  // below the label), so most rise there — out from behind the label up to the fill line, where they pop (band 1); three rise
  // below the label (band 0, seen in close-ups); three rise the whole height on the back (band 2), where there is no label and the
  // camera looks through the glass when the bottle turns away.
  const KD_BUB = [[0.3, 0.2, 0.1, 1, 1], [-0.45, 0.9, 0.085, 1.1, 1], [0.85, 0.55, 0.095, 0.9, 1], [-0.95, 0.4, 0.11, 1, 1], [0.05, 0.72, 0.08, 1.2, 1],
    [-0.2, 0.05, 0.1, 0.85, 1], [1.2, 0.3, 0.085, 1.05, 1], [-1.3, 0.66, 0.09, 0.95, 1], [0.58, 0.87, 0.075, 1.15, 1],
    [-0.6, 0.15, 0.07, 1.25, 0], [0.45, 0.6, 0.065, 1.1, 0], [1.1, 0.35, 0.06, 1, 0],
    [2.59, 0.3, 0.11, 1, 2], [-2.45, 0.8, 0.095, 0.9, 2], [3.05, 0.55, 0.085, 1.1, 2]];
  const KD_IN = 0.08;                   // kefir surface inset from the glass (bubbles sit half in the kefir, never through the glass)
  const kdBI = br => br * 1.12 + 0.005; // bubble centre inset from the glass (they grow to 1.1× on the way up)
  const KD_BY = [[0.14, 0.72], [1.64, KD_FILL - 0.035], [0.2, KD_FILL - 0.035]];   // per band: rise from … to
  const KD_BSP = [1, 1.6, 0.7], KD_BPW = [1.5, 1, 1.3];   // per band: speed factor, speed-up exponent (bubbles rise faster as they go)
  const KD_NECK = 2.455, KD_LIP = 0.455;   // the glass lip ring under the cork (height, radius)
  // centre of a bubble of inset bi at height y and azimuth a, just inside the glass (along its normal): out = [x, y, z]
  function kdBubAt(y, a, bi, out) {
    const f = profR('kd', KD_P), dr = (f(y + 0.01) - f(y - 0.01)) / 0.02, l = Math.hypot(1, dr), rr = f(y) - bi / l;
    out[0] = Math.sin(a) * rr; out[1] = y + bi * dr / l; out[2] = Math.cos(a) * rr;
    return out;
  }
  // A bold painted highlight streak running up the glass (width w, from y0 to y1, lifted by out; rounded ends). Its azimuth goes
  // from a0 (low) to a1 (on the shoulder, turning toward the front where the high camera sees it).
  function kdStreakGeo(key, a0, a1, w, y0, y1, out) {
    return gx('kdStreak' + key, () => {
      const n = 26, pos = [], nor = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, y = lerp(y0, y1, u), a = lerp(a0, a1, smooth01((y - 1.55) / 0.5)), tx = Math.cos(a), tz = -Math.sin(a);
        const [p, nn] = onLathe(KD_GLASS, y, a, out), hw = w * 0.5 * Math.pow(Math.sin(PI * u), 0.35) + 0.0015;
        pos.push(p[0] - tx * hw, p[1], p[2] - tz * hw, p[0] + tx * hw, p[1], p[2] + tz * hw);
        nor.push(...nn, ...nn);
        if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.setIndex(idx);
      return g;
    });
  }
  function corkGeo() {
    const seg = sN(84, 42);
    return gx('crownCork@' + seg, () => {
      const v = new THREE.SplineCurve([[1.12, 0], [1.06, 0.25], [1.02, 0.6], [1.0, 0.86], [0.95, 0.96], [0.8, 1.0], [0, 1.0]].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(30);
      const g = new THREE.LatheGeometry(v, seg), p = g.attributes.position, q = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {   // 21 crimped flutes flaring out toward the bottom edge
        q.fromBufferAttribute(p, i);
        const a = Math.atan2(q.x, q.z), w = smooth01((0.9 - q.y) / 0.55), c = Math.cos(a * 21), k = 1 + 0.08 * c * w;
        p.setXYZ(i, q.x * k, q.y - 0.05 * w * (0.5 + 0.5 * c), q.z * k);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  // The label only wraps the front 216° (KD_LAB_A, centred on +z), so from behind and from the sides the camera sees through the
  // glass to the creamy kefir and its rising bubbles: a glass bottle of kefir, not a blue pot.
  const KD_LAB_A = 1.2 * PI;
  // The label band: u from its right end across the front to its left end (0.5 = front, where the face is), v = height across the
  // band (for the painted label).
  function kdLabelGeo() {
    const sg = sN(44, 17);
    return gx('kdLabel@' + sg, () => {
      const [y0, y1] = KD_LAB, pts = [];
      for (let i = 0; i <= 20; i++) { const y = lerp(y0, y1, i / 20); pts.push(new THREE.Vector2(kdR(y) + 0.014, y)); }
      const g = seamNormals(new THREE.LatheGeometry(pts, sg, -KD_LAB_A / 2, KD_LAB_A)), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, (p.getY(i) - y0) / (y1 - y0));
      return g;
    });
  }
  // The painted label (canvas, made once): light sky blue with white paper edges and pinstripes all round, a creamy cloud behind
  // the face, a pink heart on each side with little white stars and dots. 614 × 192 px ≈ the band's 4.1 m × 1.08 m (same pixel
  // size per degree as the earlier all-round label, so the cloud and hearts keep their size).
  let KD_TEX;
  function kdLabelTex() {
    if (KD_TEX !== undefined) return KD_TEX;
    KD_TEX = null;
    if (typeof document === 'undefined') return null;
    const W = 614, H = 192, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); if (!g) return null;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#b4e2fc'); bg.addColorStop(1, '#94d2f8');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // paper edges: white borders + a thin pinstripe inside them, along the top and bottom and down both ends of the label
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 5); g.fillRect(0, H - 5, W, 5); g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 11, W, 2.5); g.fillRect(0, H - 13.5, W, 2.5);
    g.fillRect(12, 11, 2.5, H - 22); g.fillRect(W - 14.5, 11, 2.5, H - 22);
    const heart = (x, y, s, c) => {
      g.fillStyle = c; g.beginPath(); g.moveTo(x, y + s * 0.5);
      g.bezierCurveTo(x - s * 0.12, y + s * 0.36, x - s * 0.56, y + s * 0.08, x - s * 0.5, y - s * 0.2);
      g.bezierCurveTo(x - s * 0.44, y - s * 0.52, x - s * 0.06, y - s * 0.56, x, y - s * 0.26);
      g.bezierCurveTo(x + s * 0.06, y - s * 0.56, x + s * 0.44, y - s * 0.52, x + s * 0.5, y - s * 0.2);
      g.bezierCurveTo(x + s * 0.56, y + s * 0.08, x + s * 0.12, y + s * 0.36, x, y + s * 0.5); g.fill();
    };
    const star = (x, y, rr, c) => {
      g.fillStyle = c; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU - PI / 2, q = i & 1 ? rr * 0.45 : rr; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); }
      g.closePath(); g.fill();
    };
    // the cloud behind the face (a soft shadow first: it looks like a sticker)
    const CX = W / 2, CY = H * 0.47, PUFF = [[0, 0, 128, 64], [-104, 18, 56, 50], [104, 18, 56, 50], [-62, -40, 56, 46], [60, -42, 60, 48], [0, -50, 54, 42],
      [-50, 44, 52, 38], [50, 44, 52, 38], [-140, 32, 36, 32], [140, 32, 36, 32], [0, 52, 60, 34]];
    const cloud = (dx, dy, grow, c) => { g.fillStyle = c; for (const [x, y, rx, ry] of PUFF) { g.beginPath(); g.ellipse(CX + x * 1.18 + dx, CY + y + dy, rx * 1.12 + grow, ry + grow, 0, 0, TAU); g.fill(); } };
    cloud(0, 5, 2, 'rgba(40,100,170,0.24)'); cloud(0, 0, 3.5, '#ffffff'); cloud(0, 0, 0, '#fffbf2');
    // sides (≈ 88° left and right of the face): a pink heart each, stars and dots between it and the cloud and toward the label's end
    for (const sd of [-1, 1]) {
      const x = CX + sd * 250, o = sd;   // o: toward the label's end, -o: toward the cloud
      heart(x, H * 0.5, 58, '#ff6aa6'); heart(x - 6, H * 0.46, 15, 'rgba(255,255,255,0.55)');
      star(x - o * 64, H * 0.26, 10, '#ffffff'); star(x + o * 32, H * 0.2, 6, '#fff3a0'); star(x + o * 28, H * 0.8, 7, '#ffffff');
      for (const [dx, dy, rr, c] of [[-44, 0.84, 5, '#ffffff'], [-92, 0.14, 4, '#ffd2e6'], [-4, 0.9, 4, '#ffd2e6'], [-30, 0.12, 4, '#ffffff']]) {
        g.fillStyle = c; g.beginPath(); g.arc(x + o * dx, H * dy, rr, 0, TAU); g.fill();
      }
    }
    for (const [dx, y] of [[-123, 0.8], [123, 0.2]]) star(CX + dx, y * H, 7, '#ffffff');
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.ClampToEdgeWrapping; t.anisotropy = typeof ANISO !== 'undefined' ? ANISO : 4;
    t.userData.keep = true;
    return (KD_TEX = { map: t });
  }
  function buildKefirdev(r, o) {
    const glassC = '#d6effc', kef = '#fbf8ef', kefD = '#ece4d2', kefS = '#eef4cc', kefSD = '#d8e2a4', lab = '#a4daf9';
    r.bone('body', 'root', [0, 0, 0]);
    r.bone('foam', 'body', [0, 2.44, 0]);
    r.bone('cap', 'body', [0, 2.6, 0]);
    r.bone('plume', 'body', [0, 2.56, 0]);
    r.bone('armL', 'body', [1.0, 1.34, 0.08]); r.bone('armR', 'body', [-1.0, 1.34, 0.08]);
    r.bone('gift', 'armR', KD_GIFT);
    r.bone('footL', 'root', [0.48, 0.1, 0.58]); r.bone('footR', 'root', [-0.48, 0.1, 0.58]);
    const _bp = [0, 0, 0];
    for (let i = 0; i < KD_BUB.length; i++) r.bone('bub' + i, 'body', kdBubAt(KD_BUB[i][4] ? 1.9 : 0.4, KD_BUB[i][0], kdBI(KD_BUB[i][2]), _bp).slice());
    // the kefir inside (per mood: a pale lime while sour, creamy white when happy)
    const fill = KD_P.filter(p => p[1] < KD_FILL - 0.05).map(p => [Math.max(0, p[0] - KD_IN), p[1]]).concat([[kdR(KD_FILL) - KD_IN, KD_FILL], [kdR(KD_FILL) * 0.5, KD_FILL + 0.02], [0, KD_FILL + 0.025]]);
    for (const md of [1, 2]) {
      r.mood = md;
      r.on('body').fx(0, 0.6).add(lathe('kdFill', fill, 56), vgrad(0, KD_FILL, md === 1 ? [[0, kefSD], [0.3, kefS], [1, mixc(kefS, '#ffffff', 0.4)]] : [[0, kefD], [0.3, kef], [1, '#ffffff']]));
    }
    r.mood = 0;
    // a thin bluish meniscus ring where the kefir meets the glass, then fizzy white foam filling the shoulders and the whole neck
    // up to the cork (a lumpy column seen through the glass), so the cap always sits on something
    r.on('body').fx(0, 1).add(G.torus(TAU, 0.036, 56), '#c4e4fa', [0, KD_FILL + 0.004, 0], [PI / 2, 0, 0], kdR(KD_FILL) - KD_IN * 0.55);
    {
      const col_ = [[0, KD_FILL - 0.05]];
      for (let i = 0; i <= 8; i++) { const y = lerp(KD_FILL - 0.05, KD_NECK - 0.01, i / 8); col_.push([kdR(y) - 0.055, y]); }
      col_.push([(kdR(KD_NECK) - 0.055) * 0.8, KD_NECK + 0.02], [0, KD_NECK + 0.03]);
      r.fx(0, 0.4).add(lathe('kdNeckFoam', col_, 40, 2), vgrad(KD_FILL, KD_NECK, [[0, '#efece2'], [0.45, '#f8f6ef'], [1, '#ffffff']]));
      for (let i = 0; i < 11; i++) {   // foam lumps on the column (kept inside the glass)
        const y = lerp(KD_FILL + 0.03, KD_NECK - 0.04, (i * 0.618) % 1), a = -1.4 + (i * 1.13) % 2.8, rad = 0.05 + 0.035 * ((i * 0.37) % 1), rr = kdR(y) - 0.03 - rad;
        r.add(G.sphere(12, 9), i & 1 ? '#ffffff' : '#f7f5ee', [Math.sin(a) * rr, y, Math.cos(a) * rr], null, rad);
      }
    }
    // the glass lip ring right under the cork (the cork sits on it) with a little shine
    r.fx(0, 1).add(G.torus(TAU, 0.068, 48), '#bde2f8', [0, KD_NECK, 0], [PI / 2, 0, 0], KD_LIP);
    r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.25), [Math.sin(-0.6) * (KD_LIP + 0.024), KD_NECK + 0.016, Math.cos(-0.6) * (KD_LIP + 0.024)], null, [0.05, 0.012, 0.02]);
    // the foam head on top of the column (bone 'foam') — it rises and spills out of the mouth when the cap pops
    r.on('foam').fx(0, 0.5);
    r.add(G.sphere(24, 12), vgrad(KD_NECK - 0.04, KD_NECK + 0.08, [[0, '#f4f2ea'], [1, '#ffffff']]), [0, KD_NECK + 0.01, 0], null, [0.36, 0.07, 0.36]);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, rr = 0.06 + (i % 3) * 0.1, sz = 0.05 + (i % 4) * 0.012;
      r.add(G.sphere(14, 10), '#ffffff', [Math.sin(a) * rr, KD_NECK + 0.05 + (i % 2) * 0.025, Math.cos(a) * rr], null, sz);
    }
    // the geyser's foam gush (bone 'plume', hidden until the cap pops): foam puffs bursting up out of the mouth and arcing forward
    // (GAME's foam spray carries on from its tip along the cone)
    r.on('plume').fx(0, 0.5);
    for (const [x, y, z, rr] of [[0, 2.68, 0.04, 0.22], [0.03, 2.88, 0.2, 0.27], [-0.04, 3.02, 0.44, 0.3], [0.04, 3.06, 0.72, 0.29], [-0.03, 3.0, 0.98, 0.25], [0.02, 2.88, 1.2, 0.2],
      [0.2, 2.96, 0.36, 0.14], [-0.22, 3.08, 0.62, 0.14], [0.2, 3.1, 0.86, 0.12], [-0.12, 3.24, 0.5, 0.12]]) {
      r.add(G.sphere(16, 12), vgrad(y - rr, y + rr, [[0, '#eef0ea'], [1, '#ffffff']]), [x, y, z], null, rr);
    }
    for (const [x, y, z] of [[0.12, 3.22, 0.56], [-0.1, 3.2, 0.86], [0.06, 3.02, 0.22]]) r.fx(1, 0).add(G.sphere(8, 6), hdr('#ffffff', 1.25), [x, y, z], null, 0.035);
    r.fx(0, 0);
    // bubbles rising inside the glass (bones bub0…; animated up the bottle, faster while it fizzes): glossy, clear in the middle,
    // a sky-blue rim and a white sparkle, so they read on the creamy kefir
    const bubC = (c, br, a) => { const out = new THREE.Color(), lo = col('#f2faff'), hi = col('#86c2ee'), nx = Math.sin(a), nz = Math.cos(a);
      return (x, y, z) => { const d = ((x - c[0]) * nx + (z - c[2]) * nz) / br; return out.copy(lo).lerp(hi, Math.pow(clamp(1 - d, 0, 1), 1.4)); }; };
    for (let i = 0; i < KD_BUB.length; i++) {
      const [a, , br, , band] = KD_BUB[i], c = kdBubAt(band ? 1.9 : 0.4, a, kdBI(br), [0, 0, 0]), nx = Math.sin(a), nz = Math.cos(a);
      r.on('bub' + i).fx(0, 1).add(G.sphere(14, 10), bubC(c, br, a), c, null, br);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.3), [c[0] + nx * br * 0.8 - nz * br * 0.32, c[1] + br * 0.36, c[2] + nz * br * 0.8 + nx * br * 0.32], null, br * 0.26);
    }
    // a few tiny bubbles clinging to the inside of the glass (below the label and on the shoulders)
    r.on('body');
    for (let i = 0; i < 18; i++) {
      const lo = i < 6, y = lo ? 0.2 + 0.46 * ((i * 0.618) % 1) : 1.85 + 0.14 * ((i * 0.41) % 1), a = -1.45 + (i * 1.71) % 2.9, br = (lo ? 0.018 : 0.024) + 0.014 * ((i * 0.53) % 1);
      const c = kdBubAt(y, a, br + 0.008, [0, 0, 0]);
      r.fx(0, 1).add(G.sphere(8, 6), bubC(c, br, a), c, null, br);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [c[0] + Math.sin(a) * br * 0.8, c[1] + br * 0.35, c[2] + Math.cos(a) * br * 0.8], null, br * 0.3);
    }
    // … and a few more on the unlabelled back, all the way up
    for (let i = 0; i < 6; i++) {
      const y = 0.3 + 1.6 * ((i * 0.618 + 0.1) % 1), a = PI - 0.95 + (i * 0.71) % 1.9, br = 0.02 + 0.014 * ((i * 0.53) % 1);
      const c = kdBubAt(y, a, br + 0.008, [0, 0, 0]);
      r.fx(0, 1).add(G.sphere(8, 6), bubC(c, br, a), c, null, br);
      r.fx(1, 0).add(G.sphere(6, 4), hdr('#ffffff', 1.2), [c[0] + Math.sin(a) * br * 0.8, c[1] + br * 0.35, c[2] + Math.cos(a) * br * 0.8], null, br * 0.3);
    }
    // the painted label on the front 216° (kdLabelTex: light sky blue, a creamy cloud behind the face, hearts and stars), rolled
    // paper edges; without a canvas it falls back to plain sky blue
    const labTex = kdLabelTex();
    r.on('body').fx(0, 0.45, labTex ? 1 : 0).add(kdLabelGeo(), labTex ? '#ffffff' : lab);
    // rolled paper edges along the top and bottom: arcs over the same front span (rotated so the arc is centred on +z), with tiny
    // round caps on the open ends
    r.fx(0, 0.6);
    for (const y of KD_LAB) {
      const rr = kdR(y) + 0.016;
      r.add(G.torus(KD_LAB_A, 0.022, 40), '#ffffff', [0, y, 0], [PI / 2, 0, (PI - KD_LAB_A) / 2], rr);
      for (const sd of [-1, 1]) { const a = sd * KD_LAB_A / 2; r.add(G.sphere(8, 6), '#ffffff', [Math.sin(a) * rr, y, Math.cos(a) * rr], null, 0.022 * rr); }
    }
    r.fx(0, 0);
    // bold painted glass streaks (upper left, where the sun is): a broad one and a thin one running the height of the bottle (over
    // the label too, like shine on a glossy bottle), one on the neck and a faint reflex on the right edge — plus a small gloss dot
    r.on('body').fx(1, 0);
    r.add(kdStreakGeo('A', -0.96, -0.62, 0.11, 0.24, 2.15, 0.026), hdr('#ffffff', 1.18));
    r.add(kdStreakGeo('B', -1.16, -0.86, 0.042, 0.4, 2.08, 0.026), hdr('#ffffff', 1.12));
    r.add(kdStreakGeo('C', -0.62, -0.62, 0.05, 2.24, 2.42, 0.012), hdr('#ffffff', 1.15));
    r.add(kdStreakGeo('D', 1.2, 0.95, 0.032, 0.36, 2.0, 0.026), hdr('#f4fbff', 0.98));
    // the same shine on the unlabelled back (seen when the bottle turns away: still clearly a glass bottle)
    r.add(kdStreakGeo('E', 2.45, 2.75, 0.095, 0.3, 2.12, 0.026), hdr('#ffffff', 1.15));
    r.add(kdStreakGeo('F', 2.22, 2.52, 0.036, 0.46, 2.04, 0.026), hdr('#ffffff', 1.1));
    r.fx(0, 0);
    { const [p, n] = onLathe(KD_P, 2.06, -0.95, 0.01); gloss(r, p, n, 0.03, 0.05, 1.2); }
    // little frosted-glass arms with round mitten hands
    const frost = vgrad(0.8, 1.5, [[0, '#a8d8f4'], [1, glassC]]);
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'armL' : 'armR').fx(0, 1);
      r.seg([1.0 * sd, 1.34, 0.08], [1.34 * sd, 1.05, 0.3], 0.13, frost, 0.11, 14);
      r.add(G.sphere(22, 16), frost, [1.42 * sd, 0.98, 0.36], null, [0.19, 0.18, 0.19]);
      r.add(G.sphere(12, 8), frost, [1.34 * sd, 1.08, 0.5], null, 0.075);
      gloss(r, [1.36 * sd, 1.08, 0.46], [-0.3 * sd, 0.5, 0.8], 0.04, 0.025, 1.2);
    }
    for (const sd of [-1, 1]) {
      r.on(sd > 0 ? 'footL' : 'footR').fx(0, 1).add(G.sphere(22, 14), vgrad(0, 0.22, [[0, '#9ccff0'], [1, glassC]]), [0.5 * sd, 0.1, 0.74], null, [0.27, 0.14, 0.34]);
    }
    // the crown cork, worn tilted: gold crimped skirt, pearls on the flute tips, a pink top with a white heart
    r.on('cap').push([0, 2.52, 0], [-0.12, 0, 0.2]);
    r.fx(0, 2).add(corkGeo(), vgrad(-0.05, 0.3, [[0, '#d08a18'], [0.5, GOLD], [1, '#ffe08a']]), [0, 0, 0], null, [0.52, 0.24, 0.52]);
    r.fx(0, 0.7).add(G.cyl(1, 1, 36), '#ff6aa4', [0, 0.245, 0], null, [0.36, 0.012, 0.36]);
    r.fx(0, 2).add(G.torus(TAU, 0.08, 40), GOLD, [0, 0.25, 0], [PI / 2, 0, 0], 0.37);
    r.fx(0, 0.6).add(heartGeo(), '#ffffff', [0, 0.262, 0.02], [-PI / 2, 0, 0], [0.34, 0.34, 0.12]);
    r.fx(0, 1);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; r.add(G.sphere(12, 8), '#fff8ee', [Math.sin(a) * 0.62, -0.02, Math.cos(a) * 0.62], null, 0.05); }
    r.pop().fx(0, 0);
    // happy only: the glass of kefir it gives Feza (in the right hand; bone 'gift' is hidden until the hand-over). Same look and
    // size as GAME's glass that takes over at the hand-over (a tall glass of fizzy kefir, pink rim, a pink band with white dots,
    // a pink-and-white striped straw; built at 1 : 1.35 around its base on the mitten).
    r.mood = 2; r.on('gift');
    {
      const [gx0, gy0, gz0] = KD_GIFT;
      r.push(KD_GIFT, null, 1.35);
      r.fx(0, 0.4).add(G.cyl(0.97, 0.86, 20), vgrad(gy0, gy0 + 0.3, [[0, '#efe6d4'], [1, '#fffaf2']]), [0, 0.116, 0], null, [0.078, 0.2, 0.078]);
      r.add(G.sphere(16, 8), '#ffffff', [0, 0.216, 0], null, [0.078, 0.028, 0.078]);
      r.add(G.sphere(10, 8), '#ffffff', [0.03, 0.236, 0.02], null, 0.022).add(G.sphere(10, 8), '#ffffff', [-0.028, 0.234, -0.015], null, 0.018);
      r.fx(0, 1).add(G.cyl(1, 0.97, 20, true), '#e6f5ff', [0, 0.24, 0], null, [0.086, 0.045, 0.086]);
      r.add(G.cyl(0.9, 0.84, 20), '#d6effc', [0, 0.008, 0], null, [0.08, 0.016, 0.08]);
      r.fx(0, 0.5).add(G.torus(TAU, 0.16, 20), '#ff6f9a', [0, 0.262, 0], [PI / 2, 0, 0], 0.086);
      r.add(G.cyl(0.92, 0.9, 20, true), '#ff6f9a', [0, 0.1, 0], null, [0.088, 0.05, 0.088]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; r.add(G.sphere(8, 6), '#ffffff', [Math.sin(a) * 0.08, 0.1, Math.cos(a) * 0.08], null, 0.012); }
      for (let i = 0; i < 6; i++) r.add(G.cyl(1, 1, 8), i % 2 ? '#ffffff' : '#ff4f86', [0.03 - 0.004 * i, 0.12 + i * 0.045, 0.012], [0, 0, 0.09], [0.012, 0.045, 0.012]);
      gloss(r, [-0.05, 0.16, 0.066], [-0.6, 0, 0.8], 0.01, 0.07, 1.25);
      r.pop();
      r.mark('gift', [gx0, gy0 + 0.15 * 1.35, gz0]);
    }
    r.mood = 0; r.fx(0, 0);
    face(r, KD_FACE, 1.16, dairyFace({ bone: 'body', tilt: 0.3, ex: 0.36, ey: 0.1, er: 0.235, inset: 0.028, skin: '#fff6e6',
      mouthY: -0.27, mouthW: 0.27, browY: 1.32, heartX: 1.0, heartY: 0.5, heartS: 0.24, blushY: 0.92, blushX: 0.38, openK: 1.06, mouthPivot: true }));
    r.on('body').mark('muzzle', [0, 2.6, 0.12]);
    const glassGeo = lathe('kdGlass', KD_GLASS, 64, 4);
    return { height: 3.0, glowC: col('#bfe8ff'), tex: labTex || undefined, dieHop: 0.1, dieFrom: ((EDEF.kefirdev && EDEF.kefirdev.give) || KD_GIVE).to + 0.05, hide: ['gift', 'plume'], glowK: 0.6,
      portrait: { cx: 0, cy: 1.9, cz: 0.75, rad: 1.25 },
      extras: [{ geo: glassGeo, bone: 'body', kind: 'glass', color: '#e4f4ff', opacity: 0.2, edge: 0.86 }],
      mat: { rough: 0.3, sss: col('#f4f0e4').multiplyScalar(0.06), rim: '#e8f6ff', rimK: 0.28, rimP: 2.4 } };
  }
  // Hand-over progress 0..1 (glass pops into the hand, held out toward Feza, handed over at ~0.85), or -1 when not giving.
  function kdGive(st) {
    if (typeof st.give === 'number' && st.give >= 0) return st.give < 1 ? st.give : -1;
    if (!(st.dying >= 0)) return -1;
    const W = (EDEF.kefirdev && EDEF.kefirdev.give) || KD_GIVE, g = (st.dying - W.from) / Math.max(0.05, W.to - W.from);
    return g >= 0 && g < 1 ? g : -1;
  }
  function animKefirdev(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), br = Math.sin(s.t * 1.8 + s.ph);
    let sy = 1 + 0.018 * br, sxz = 1 - 0.01 * br, y = 0, z = 0, rx = 0, rz = 0, ry = 0, armUp = 0, wave = 0, fwd = 0, capY = 0, capSpin = 0, capTip = 0,
      foamY = 0, foamS = 1, fizz = 1, hopY = 0, air = 0, plume = 0, capX = 0, flex = 0;
    const calm = ph === 'idle' && !(st.move > 0.05), pre = preAggro(s, st, ph, dt);
    // waddle (phase 'move', or walking while idle): rocks from one side of its base to the other, little feet stepping
    s.wk = damp(s.wk || 0, ph === 'move' || (ph === 'idle' && st.move > 0.05) ? 1 : 0, 5, dt);
    if (s.wk > 0.01) s.walk += dt * 5.2 * s.wk;
    const wa = Math.sin(s.walk) * 0.09 * s.wk, wy = Math.abs(wa) * 0.85 + Math.abs(Math.cos(s.walk)) * 0.04 * s.wk;
    rz += wa; y += wy;
    B.footL.position.y += Math.max(0, Math.sin(s.walk)) * 0.14 * s.wk; B.footR.position.y += Math.max(0, -Math.sin(s.walk)) * 0.14 * s.wk;
    B.footL.position.z += Math.cos(s.walk) * 0.1 * s.wk; B.footR.position.z -= Math.cos(s.walk) * 0.1 * s.wk;
    wave += Math.sin(s.walk) * 0.25 * s.wk;
    switch (ph) {
      case 'shake': {   // wind-up: wobbles faster and faster, fizzing; the foam climbs the neck, the cap rattles
        const k = smooth01(t / 0.25) * (1 - smooth01((t - 0.92) / 0.08)), f = 18 + 16 * t;
        rz += Math.sin(s.t * f) * 0.09 * k; rx += Math.sin(s.t * f * 0.7 + 1) * 0.04 * k;
        sy *= 1 + 0.03 * Math.sin(s.t * f * 2) * k; foamY = 0.16 * k * t + 0.04 * k; fizz = 1 + 4 * k;
        capY = Math.abs(Math.sin(s.t * f * 1.3)) * 0.06 * k; capTip = Math.sin(s.t * f) * 0.12 * k; armUp = 0.35 * k; wave = Math.sin(s.t * f) * 0.4 * k;
        break;
      }
      case 'geyser': {   // POP! the cap flies up, the bottle leans in and sprays foam, then the cap drops back on
        const pop = smooth01(t / 0.1), lean = smooth01((t - 0.06) / 0.1) * (1 - smooth01((t - 0.84) / 0.12));
        const up = t < 0.86 ? pop : 1 - smooth01((t - 0.86) / 0.1), land = bump(t - 0.95, 0.05);
        capY = up * (1.2 + 0.15 * Math.sin(s.t * 3)) - 0.06 * land; capSpin = t * 9; capTip = 0.35 * up;
        rx += 0.3 * lean; z += 0.12 * lean; fwd = lean; foamY = 0.3 * lean + 0.06 * pop; foamS = 1 - 0.15 * lean; fizz = 1 + 5 * lean;
        plume = smooth01((t - 0.08) / 0.12) * (1 - smooth01((t - 0.8) / 0.1));
        rz += Math.sin(s.t * 36) * 0.02 * lean; sy *= 1 - 0.05 * bump(t, 0.1) + 0.03 * lean; armUp = 0.2 * lean; wave = -0.3 * lean;
        break;
      }
      case 'bubbles': {   // puffs up, then five fizz bubbles in a fan (turning left → right), the cap burps up a little each time
        const k = smooth01(t / 0.3) * (1 - smooth01((t - 0.88) / 0.12));
        sxz *= 1 + 0.07 * k; sy *= 1 + 0.03 * k; rx -= 0.08 * k; foamY = 0.1 * k; fizz = 1 + 2 * k;
        ry = lerp(-0.34, 0.34, smooth01((t - 0.36) / 0.48)) * k;
        for (const c of [0.4, 0.5, 0.6, 0.7, 0.8]) { const p = bump(t - c + 0.02, 0.08); capY += 0.14 * p; rx += 0.1 * p; sy *= 1 - 0.05 * p; foamY += 0.1 * p; }
        armUp = 0.2 * k;
        break;
      }
      case 'slam': {   // crouch, a big hop (peak ≈ 1.3 m), lands at 0.8 with a splash
        if (t < 0.2) { const k = smooth01(t / 0.2); sy *= 1 - 0.2 * k; sxz *= 1 + 0.1 * k; armUp = 0.4 * k; }
        else if (t < 0.8) {
          const u = (t - 0.2) / 0.6, e = Math.abs(Math.cos(PI * u));
          hopY = Math.sin(PI * u) * 1.3; sy *= 1 + 0.08 * e; sxz *= 1 - 0.04 * e; armUp = 0.4 + 0.6 * Math.sin(PI * u); air = Math.sin(PI * u);
          // the cap lags behind (it lifts off as the bottle comes down), the little arms flail
          capY = 0.06 * Math.sin(PI * u) + 0.2 * Math.max(0, -Math.cos(PI * u)); capTip = 0.18 * Math.sin(PI * u);
          wave = Math.sin(s.t * 22) * 0.7 * Math.sin(PI * u); foamY = 0.08 * Math.sin(PI * u);
        } else { const u = (t - 0.8) / 0.2, k = Math.sin(PI * Math.min(1, u * 1.3)) * (1 - 0.5 * u); sy *= 1 - 0.22 * k; sxz *= 1 + 0.12 * k; capY = -0.04 * k; foamY = 0.2 * k; fizz = 3; }
        break;
      }
      case 'summon': {   // bounces three times with the cap popping up and down: "come out, little foams!"
        const k = smooth01(t / 0.15) * (1 - smooth01((t - 0.85) / 0.15)), b = Math.abs(Math.sin(t * PI * 3));
        y += b * 0.3 * k; sy *= 1 + 0.06 * (b - 0.5) * k; armUp = k; wave = Math.sin(t * PI * 8) * k;
        capY = 0.3 * b * k; capSpin = t * 6 * k; foamY = 0.3 * k; foamS = 1 + 0.3 * k; fizz = 1 + 4 * k;
        break;
      }
      case 'roar': {
        if (s.intro) {   // entrance (after the double take): POP! the cap spins up 1.5 m and lands back on at 0.7, a foam plume, then a flex
          const cu = clamp((t - 0.27) / 0.43, 0, 1), fl = smooth01((t - 0.72) / 0.1) * (1 - smooth01((t - 0.93) / 0.07));
          capY = 1.5 * Math.sin(PI * cu) - 0.05 * bump(t - 0.7, 0.08); capSpin = smooth01(cu) * TAU * 2.5; capTip = 0.4 * Math.sin(PI * cu);
          plume = bump(t - 0.28, 0.28); foamY = 0.25 * bump(t - 0.26, 0.4); fizz = 1 + 4 * bump(t - 0.26, 0.5);
          sy *= 1 - 0.06 * bump(t - 0.26, 0.08) - 0.08 * bump(t - 0.7, 0.1) + 0.07 * fl; armUp = 0.4 * bump(t - 0.26, 0.4) + 0.8 * fl; flex = fl;
          s.eyeK = lerp(1, 0.75, fl); s.mouthW = fl;
          break;
        }
        // "fizz!": stretches up tall, arms up, the cap hops and spins, foam puffs out
        const k = smooth01(t / 0.2) * (1 - smooth01((t - 0.8) / 0.2));
        sy *= 1 + 0.1 * k; sxz *= 1 - 0.04 * k; armUp = k; wave = Math.sin(s.t * 14) * 0.5 * k; rz += Math.sin(s.t * 9) * 0.04 * k; rx -= 0.08 * k;
        capY = 0.25 * k + Math.abs(Math.sin(s.t * 12)) * 0.08 * k; capSpin = s.t * 4 * k; foamY = 0.3 * k; foamS = 1 + 0.35 * k; fizz = 1 + 3 * k;
        break;
      }
      case 'blow': {   // 2.4 s: breathes in (0–0.45, fatter by 12 %), the cap hovers up 0.3 m (0.45–0.5), blows a big foam bubble forward
        // out of its mouth (0.5–0.75: GAME grows the bubble at muzzle()), lets it go at 0.75 — the cap drops back on, a happy wobble
        const inh = smooth01(t / 0.45), blowK = smooth01((t - 0.48) / 0.04) * (1 - smooth01((t - 0.74) / 0.04)), rel = t > 0.75 ? 1 - smooth01((t - 0.75) / 0.25) : 0;
        const fat = inh * (1 - smooth01((t - 0.5) / 0.25));
        sxz *= 1 + 0.12 * fat; sy *= 1 + 0.03 * fat - 0.03 * blowK;
        const hov = smooth01((t - 0.45) / 0.05) * (1 - smooth01((t - 0.75) / 0.07));
        capY = 0.3 * hov + Math.sin(s.t * 20) * 0.015 * hov - 0.05 * bump(t - 0.82, 0.08); capTip = 0.3 * hov; capX = -0.05 * hov;
        rx += 0.2 * blowK; z += 0.06 * blowK; fwd = 0.6 * blowK; armUp = 0.35 * inh * (1 - blowK);
        foamY = 0.1 * inh + 0.1 * blowK; fizz = 1 + 1.5 * inh + 2.5 * blowK;
        rz += Math.sin(s.t * 17) * 0.07 * rel; sy *= 1 + 0.05 * Math.sin(s.t * 21) * rel;
        s.eyeK = lerp(lerp(1, 1.15, inh), 0.75, blowK); s.mouthO = Math.max(blowK, 0.6 * inh * (1 - blowK)); s.browY = 0.02 * inh;
        break;
      }
      case 'hiccup': {   // 3 s: three hiccups (0.15 / 0.45 / 0.75: hops up 0.18 m, the cap jumps 0.35 m, big eyes, an "O"), dizzy sway between
        const k = smooth01(t / 0.05) * (1 - smooth01((t - 0.95) / 0.05));
        let hk = 0; for (const c of EDEF.kefirdev.hiccupAt || [0.15, 0.45, 0.75]) hk = Math.max(hk, bump(t - c + 0.015, 0.07));
        y += 0.18 * hk; capY += 0.35 * hk; capSpin = 0.4 * hk; sy *= 1 + 0.08 * hk; sxz *= 1 - 0.03 * hk; fizz = 1 + 3 * hk;
        const sway = k * (1 - hk);
        rz += Math.sin(s.t * 3.3) * 0.07 * sway; rx += Math.sin(s.t * 2.1 + 1) * 0.04 * sway; wave = Math.sin(s.t * 3) * 0.3 * sway; armUp = 0.2 * sway + 0.6 * hk;
        s.eyeK = lerp(1, 1.25, hk); s.mouthO = hk; s.eyeWob = sway; s.browY = 0.03 * hk;
        capTip = Math.sin(s.t * 3.3) * 0.1 * sway;
        break;
      }
      case 'dying': armUp = 0.9; wave = Math.sin(s.t * 10); capY = 0.08 + 0.05 * Math.sin(s.t * 6); fizz = 2.5; break;   // overjoyed
    }
    // idle: a little hum now and then (content eyes, the mouth pulsing "mm-mm", swaying) — before it notices Feza it hums all the
    // time, tapping a foot
    const hum = Math.max(pre, (() => { const a = act(s, 'humT', dt, 6, 10, 2.6, calm && pre < 0.05); return a >= 0 ? Math.sin(PI * a) : 0; })());
    if (hum > 0.01) {
      rz += Math.sin(s.t * 3.8) * 0.045 * hum; ry += Math.sin(s.t * 1.9) * 0.06 * hum; y += Math.abs(Math.sin(s.t * 3.8)) * 0.02 * hum;
      s.eyeK = lerp(s.eyeK, 0.55, hum); s.mouthO = Math.max(s.mouthO, (0.35 + 0.25 * Math.sin(s.t * 7.6)) * hum); fizz *= 1 + 0.5 * hum;
      B.footL.position.y += Math.max(0, Math.sin(s.t * 7.6)) * 0.06 * pre;
    }
    // hit: the foam sloshes up, a burst of bubbles (× 3 for 0.3 s), the cap rattles, eyes squeezed
    if (st.hurt > 0 && ph !== 'dying') {
      const h = st.hurt * st.hurt;
      if (st.hurt > (s.hPrev || 0) + 0.2) s.hB = 0.3;
      s.hPrev = st.hurt;
      foamY += 0.08 * h; capY += Math.abs(Math.sin(s.t * 45)) * 0.05 * h; capTip += Math.sin(s.t * 40) * 0.1 * h; s.eyeK = Math.min(s.eyeK, 1 - 0.4 * h);
    } else s.hPrev = 0;
    if (s.hB > 0) { s.hB -= dt; fizz *= 3; }
    // hand-over of the kefir glass (dying start, or st.give)
    const g = kdGive(st);
    s.giving = g >= 0;
    let give = 0, gScale = 0.0001;
    if (g >= 0) {
      give = smooth01(g / 0.18) * (1 - smooth01((g - 0.86) / 0.14));
      gScale = g < 0.18 ? Math.max(0.0001, Math.sin(PI * 0.5 * g / 0.18) * (1 + 0.25 * Math.sin(PI * g / 0.18))) : g > 0.86 ? Math.max(0.0001, 1 - smooth01((g - 0.86) / 0.1)) : 1;
      armUp *= 1 - give; rx += 0.1 * give; wave *= 1 - 0.6 * give;
    }
    B.gift.scale.setScalar(gScale);
    // cut-short slam (cheered up / Feza napped in mid-air): fall down with gravity and land with a squash
    if (ph === 'slam') {
      if (dt > 0) s.airV = clamp(((s.airY || 0) - hopY) / dt, -8, 8);
      s.airY = hopY;
    } else if (s.airY > 0) {
      s.airV = (s.airV || 0) + 16 * dt;
      s.airY = Math.max(0, s.airY - s.airV * dt);
      air = Math.max(air, Math.min(1, s.airY / 1.3)); armUp = Math.max(armUp, 0.6);
      if (s.airY <= 0) { s.airV = 0; s.landT = 1; }
    }
    y += s.airY || 0;
    if (s.landT > 0) { const k = Math.sin(PI * (1 - s.landT)); sy *= 1 - 0.2 * k; sxz *= 1 + 0.1 * k; s.landT = Math.max(0, s.landT - dt / 0.3); }
    B.body.position.set(B.body.position.x, B.body.position.y + y, B.body.position.z + z);
    B.body.scale.set(sxz, sy, sxz); B.body.rotation.set(rx, ry, rz);
    const jy = Math.max(0, y - wy);   // hops and bounces lift the little feet too (the waddle steps them on its own)
    B.footL.position.y += jy; B.footR.position.y += jy; B.footL.position.z += z; B.footR.position.z += z;
    B.cap.scale.set(1 / sxz, 1 / sy, 1 / sxz);   // the metal cap stays rigid on the wobbly bottle
    B.cap.position.y += capY + Math.abs(Math.sin(s.t * 2.3 + s.ph)) * 0.012; B.cap.position.z += capX; B.cap.rotation.y = capSpin; B.cap.rotation.z = capTip * Math.sin(s.t * 2.5) + Math.sin(s.t * 1.2 + s.ph) * 0.03;
    B.cap.rotation.x = -0.15 * capTip;
    B.foam.position.y += foamY; B.foam.scale.set(foamS, 1 + (foamS - 1) * 1.6 + 0.04 * Math.sin(s.t * 5), foamS);
    s.flg = damp(s.flg ?? rz, rz, 5, dt); s.flx = damp(s.flx ?? rx, rx, 5, dt);   // the foam lags behind the bottle's sway
    B.foam.rotation.set((s.flx - rx) * 1.3, 0, (s.flg - rz) * 1.3);
    if (plume > 0.001) {   // the foam fountain grows out of the bottle's mouth and bubbles (wobbles, pulses)
      const w = Math.sin(s.t * 13), w2 = Math.sin(s.t * 9.3 + 1);
      B.plume.scale.set(plume * (1 + 0.08 * w), Math.max(0.0001, plume * (1 + 0.1 * w2)), plume * (1 + 0.08 * w2));
      B.plume.rotation.set(0.12 * plume + 0.05 * w2, 0, 0.06 * w);
    } else B.plume.scale.setScalar(0.0001);
    const sw = Math.sin(s.t * 1.6 + s.ph) * 0.08;
    B.armL.rotation.z = 0.08 + sw + 1.6 * armUp + 0.3 * wave; B.armR.rotation.z = -(0.08 + sw + 1.5 * armUp - 0.3 * wave);
    B.armL.rotation.x = -0.35 * armUp + 0.4 * fwd; B.armR.rotation.x = -0.35 * armUp + 0.4 * fwd;
    if (flex > 0) { B.armL.rotation.y = -0.9 * flex; B.armR.rotation.y = 0.9 * flex; }   // (flexing: arms up, bent forward)
    if (give > 0) {   // right arm reaches forward-out holding the glass up (kept upright), a little bow; the left hand waves
      _kq0.copy(B.armR.quaternion); _kq.copy(_kq0).slerp(KD_ARM_Q, give);
      B.armR.quaternion.copy(_kq); B.armR.scale.setScalar(1 + 0.12 * give);
      B.gift.quaternion.copy(_kq).invert(); B.gift.scale.multiplyScalar(1 / (1 + 0.12 * give));
      B.armL.rotation.z = lerp(B.armL.rotation.z, 1.9 + 0.35 * Math.sin(s.t * 11), give);
    }
    // bubbles rising along the glass (faster while it fizzes)
    s.fz = (s.fz || 0) + dt * 0.22 * fizz;
    // (each rises faster as it goes, like real bubbles, so they spend longer low in the bottle, below the label, and grow a little)
    const bp = s.bp || (s.bp = [0, 0, 0]);
    for (let i = 0; i < KD_BUB.length; i++) {
      const b = B['bub' + i], [a, off, br, sp, band] = KD_BUB[i], u = (s.fz * sp * KD_BSP[band] + off) % 1, yy = lerp(KD_BY[band][0], KD_BY[band][1], Math.pow(u, KD_BPW[band]));
      kdBubAt(yy, a + Math.sin(u * 9 + i) * 0.04, kdBI(br), bp);
      b.position.set(bp[0], bp[1], bp[2]);
      b.scale.setScalar((0.75 + 0.35 * u) * (u < 0.06 ? Math.max(0.0001, u / 0.06) : u > 0.94 ? Math.max(0.0001, (1 - u) / 0.06) : 1));
    }
  }

  // ════════════════ Round 5: Surlu Şehir (town) — nobetci, simitci, supurgeci, tellal + the tournament banner (sancak) ════════════════
  // Feza's request: the huysuz here are PEOPLE the dragon tricked into grumpiness. Chibi townsfolk (big heads, ~40 % of the
  // height), friendly skin tones, bright clothes, toy-soft "weapons" (a pompom spear, simits, a straw broom, a drum). 'grumpy' =
  // the sulky "hıh!" face (face() o.pout), 'happy' = the usual ^ ^ face. Shared rig: root → hips → body → head and two-bone arms
  // (armX → foreX, the mitten on foreX), hips → legL / legR; props ride on those bones. The helpers below (townHead, townArm,
  // townLeg, mitten, sunCrest, fluffGeo, stacheGeo, starFlat, townWalk, townCheer, upright = a held prop kept upright,
  // aimAt = a bone turned toward a world point) are meant for the knight as well.
  const TOWN = { blue: '#4aa8ff', blueD: '#2a74d8', yellow: '#ffd23f', yellowD: '#f2a614', red: '#ff4d5e', redL: '#ff9aa8',
    wood: '#c88c4c', woodD: '#8e5a2c', woodL: '#e4b474', gold: '#ffc94a', white: '#fffaf2', steel: '#dfe7f2', lip: '#e8687e' };
  // Soft yarn pompom (spear tip, mallet heads, the knight's plume …): a sphere tufted by noise.
  function fluffGeo(d = 28) {
    const w = sN(d, 10), h = sN(Math.round(d * 0.7), 7);
    return gx('fluff@' + w, () => {
      const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.86 + 0.26 * vnoise(v.x * 4.5 + 3, v.y * 4.5, v.z * 4.5 - 2)); p.setXYZ(i, v.x, v.y, v.z); }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  // Curly moustache, one side (sd +1 = the model's left): a tapered tube from under the nose out and up into a little curl, in
  // a frame lying on the face (z = out, 1 = half its width before scale).
  function stacheGeo(sd) {
    const n = sN(40, 18), rs = sN(8, 5);
    return gx('stache' + sd + '@' + n, () => {
      const pts = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        if (t < 0.6) { const u = t / 0.6; pts.push(new THREE.Vector3(sd * (0.04 + 0.66 * u), -0.1 * Math.sin(PI * u * 0.9), 0.05 * Math.sin(PI * u))); }
        else { const u = (t - 0.6) / 0.4, a = -PI / 2 + u * PI * 1.35, rr = 0.2 * (1 - 0.45 * u); pts.push(new THREE.Vector3(sd * (0.7 + rr * Math.cos(a)), 0.12 + rr * Math.sin(a) - 0.02, 0.02)); }
      }
      const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, n, 0.17, rs, false);
      const p = g.attributes.position, uv = g.attributes.uv, c = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        const u = uv.getX(i), k = 0.75 + 0.5 * Math.sin(PI * Math.min(1, u / 0.7)) - 0.55 * smooth01((u - 0.55) / 0.45);
        curve.getPointAt(Math.min(1, u), c);
        p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k * 0.85, c.z + (p.getZ(i) - c.z) * k * 0.7);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  // A small flat five-point star (hat and banner decorations; the soldier's bevelled star5Geo costs three times as much).
  function starFlat() {
    return extrude('star5f', () => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i & 1 ? 0.21 : 0.5; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); } return s; }, 0.08, 0, 4, 0.3);
  }
  // A simit (sesame ring): toasted golden-brown with sesame flecks on its top; lies flat (axis y), outer radius ≈ 1.36.
  function simitGeo(){return gx('executionRing@'+LODK,()=>{const k=new Kit();k.add(G.torus(TAU,.12,24),'#7c838a',[0,0,0],[PI/2,0,0]);for(let i=0;i<10;i++){const a=i/10*TAU;k.add(G.cone(6),'#a6a28f',[Math.sin(a)*1.12,0,Math.cos(a)*1.12],qy(Math.sin(a),0,Math.cos(a)),[.16,.42,.12]);}return k.build();});}
  function simitCol(cy, s) {   // (cy: the ring's centre height, s: its scale)
    const out = new THREE.Color(), a = col('#a8581c'), b = col('#d88a36'), c = col('#eaa452'), ses = col('#fbe2a8');
    return (x, y, z) => {
      const t = (y - cy) / (s * 0.36);
      out.copy(a).lerp(b, smooth01((t + 0.9) / 0.9)).lerp(c, smooth01(t / 0.8) * 0.6);
      if (t > -0.2 && hash3(Math.floor(x * 140), Math.floor(y * 140), Math.floor(z * 140)) > 0.62) out.lerp(ses, 0.75);
      return out;
    };
  }
  // A round mitten with a little thumb (sd: side; the thumb toward the front-inside).
  function mitten(r, p, rad, skin, sd = 1) {
    r.add(G.sphere(16, 12), skin, p, null, [rad, rad * 0.94, rad]);
    r.add(G.sphere(10, 8), skin, [p[0] - sd * rad * 0.62, p[1] + rad * 0.2, p[2] + rad * 0.55], null, rad * 0.44);
  }
  // Two-bone chibi arm (sd +1 = left): A = [shoulder, elbow, hand] model-space points; the sleeve (fabric) to the elbow on armX,
  // the forearm (o.fore: sleeve colour or bare skin) and the mitten on foreX. o: r (radius), fore, cuff, hand (mitten radius), tex.
  function townArm(r, sd, A, sleeve, skin, o = {}) {
    const n = sd > 0 ? 'L' : 'R', [sh, el, hd] = A, ar = o.r ?? 0.05, fc = o.fore || sleeve;
    r.bone('arm' + n, 'body', sh); r.bone('fore' + n, 'arm' + n, el);
    r.on('arm' + n).fx(0, 0, o.tex ?? 1).add(G.sphere(14, 10), sleeve, sh, null, ar * 1.2).seg(sh, el, ar * 1.1, sleeve, ar, 12);
    r.on('fore' + n).add(G.sphere(12, 10), fc, el, null, ar * 1.02).seg(el, hd, ar, fc, ar * 0.9, 12);
    if (o.cuff) {
      const d = new THREE.Vector3(...hd).sub(new THREE.Vector3(...el)), L = d.length(); d.normalize();
      const at = o.cuffAt ?? 0.7, cp = [el[0] + d.x * L * at, el[1] + d.y * L * at, el[2] + d.z * L * at];
      r.fx(0, 0.1, o.tex ?? 1).add(G.torus(TAU, 0.42, 16), o.cuff, cp, qz(d.x, d.y, d.z), ar * 1.05);
    }
    r.fx(0, 0.12, 0); mitten(r, hd, o.hand ?? ar * 1.25, skin, sd);
    r.fx(0, 0);
  }
  // Short chibi leg (sd +1 = left) on legX: hose/trousers from the hip down, a rounded shoe (o.toe: a curled-up toe).
  function townLeg(r, sd, hip, foot, legC, shoeC, o = {}) {
    const lr = o.r ?? 0.055, sl = o.shoe ?? [lr * 1.3, lr * 1.0, lr * 2.1];
    r.on(sd > 0 ? 'legL' : 'legR').fx(0, 0, o.tex ?? 1).uv(1, 2).seg(hip, foot, lr, legC, lr * 0.92, 12).uv(null);
    r.fx(0, o.gloss ?? 0.45, 0).add(G.sphere(16, 12), shoeC, [foot[0], sl[1], foot[2] + sl[2] * 0.35], null, sl);
    if (o.toe) {   // a little curled-up slipper toe
      r.add(G.torus(PI * 1.1, 0.34, 12), shoeC, [foot[0], sl[1] * 1.55, foot[2] + sl[2] * 1.15], [0, PI / 2, PI * 0.1], [sl[1] * 0.9, sl[1] * 0.9, sl[0] * 0.8]);
      r.add(G.sphere(8, 6), o.toe, [foot[0], sl[1] * 2.35, foot[2] + sl[2] * 1.0], null, sl[1] * 0.42);
    }
    r.fx(0, 0);
  }
  // Big round chibi head on the 'head' bone: skin sphere, small round ears, a button nose, then the face (pout by default).
  function townHead(r, c, R, o) {
    const skin = col(o.skin), tilt = o.tilt ?? 0.3;
    r.on('head').fx(0, 0.12).add(G.sphere(40, 30), vgrad(c[1] - R, c[1] + R, [[0, mixc(skin, '#b8603a', 0.22)], [0.4, skin], [1, mixc(skin, '#fff4ea', 0.12)]]), c, null, [R * 1.04, R, R * 0.98]);
    for (const s of [-1, 1]) {
      r.add(G.sphere(16, 12), skin, [c[0] + s * R * 0.98, c[1] - R * 0.1, c[2] - R * 0.06], [0, s * 0.35, 0], [R * 0.17, R * 0.24, R * 0.13]);
      r.add(G.sphere(12, 8), mixc(skin, '#ff7a7a', 0.3), [c[0] + s * R * 1.03, c[1] - R * 0.1, c[2] - R * 0.02], [0, s * 0.35, 0], [R * 0.09, R * 0.14, R * 0.06]);
    }
    r.push(c, [-tilt, 0, 0]);
    { const [p, q] = onSphere(0, (o.ey ?? 0) - o.er * (o.noseY ?? 0.95), R, R * 0.02); r.fx(0, 0.4).add(G.sphere(16, 12), mixc(skin, '#ff8a70', 0.2), p, q, [R * 0.12, R * 0.1, R * 0.11].map(v => v * (o.noseK ?? 1))); }
    r.pop().fx(0, 0);
    face(r, c, R, Object.assign({ bone: 'head', pout: true, tilt, skin: o.skin, lipCol: TOWN.lip, blushCol: '#ff7f9c' }, o));
  }
  // The town crest: a smiling golden sun (a disc, twelve soft rounded rays, dot eyes, a smile, rosy cheeks) facing local +z,
  // radius ≈ 1 before scale. o.happy: ^ ^ eyes; o.moods: dot eyes on the mood-1 geometry, ^ ^ on mood 2 (the banner: happy once
  // it lies on the ground). o.gl: gloss of the gold (1 = painted, 2 = polished metal); o.wob: wobble weight (a fluttering cloth).
  function sunCrest(r,p,q,s,o={}){
    r.push(p,q,s).fx(0,.6,0,o.wob||0);
    r.add(G.sphere(18,12),'#b7ad98',[0,.12,.02],null,[.46,.54,.13]);
    for(const side of [-1,1])r.add(G.sphere(12,8),'#19151c',[side*.19,.18,.135],null,[.13,.18,.035]);
    for(const x of [-.18,-.06,.06,.18])r.add(G.rbox(1),'#a89c85',[x,-.39,.035],null,[.075,.19,.08]);
    r.seg([-.64,-.62,0],[.64,.62,0],.07,'#978c7b',.07,8);r.seg([.64,-.62,0],[-.64,.62,0],.07,'#978c7b',.07,8);
    r.pop().fx(0,0);
  }
  // Shared walk / idle: legs swing, hips bob, arms swing, the head sways; while grumpy and idle, now and then the sulky "hıh!"
  // head toss (chin up, face turned away for a moment). k: rate, stride, bob, arm (swing amounts). Returns [phase, walk amount].
  function townWalk(m, dt, st, s, k = {}) {
    const B = m.B;
    if (s.mv > 0.03) s.walk += dt * ((k.rate ?? 7) + 4 * s.mv);
    const ph = s.walk, w = Math.min(1, s.mv * 1.4), br = Math.sin(s.t * 2.2 + s.ph), sw = Math.sin(ph), sd = k.stride ?? 0.6;
    B.legL.rotation.x = sw * sd * w; B.legR.rotation.x = -sw * sd * w;
    B.legL.position.y += Math.max(0, sw) * 0.02 * w; B.legR.position.y += Math.max(0, -sw) * 0.02 * w;
    B.hips.position.y += Math.abs(Math.cos(ph)) * (k.bob ?? 0.035) * w + br * 0.004;
    B.hips.rotation.z = sw * 0.04 * w;
    B.body.rotation.y = sw * 0.09 * w; B.body.rotation.x = 0.07 * w; B.body.scale.y = 1 + br * 0.012;
    const aw = k.arm ?? 0.5;
    B.armL.rotation.x = -sw * aw * w; B.armR.rotation.x = sw * aw * w;
    B.armL.rotation.z = 0.06 + br * 0.02; B.armR.rotation.z = -0.06 - br * 0.02;
    B.foreL.rotation.x = -0.15 - 0.2 * w; B.foreR.rotation.x = -0.15 - 0.2 * w;
    B.head.rotation.z = Math.sin(s.t * 1.2 + s.ph) * 0.04; B.head.rotation.y = -B.body.rotation.y * 0.7;
    B.head.rotation.x = -Math.cos(ph * 2) * 0.03 * w;
    let puff = 0;
    if (s.mood !== 'happy' && st.windup < 0 && st.attack < 0 && !(st.dying >= 0)) {
      s.hih = (s.hih ?? frand(1.5, 5)) - dt;
      if (s.hih < 0) {
        const u = -s.hih / 1.1;
        if (u >= 1) s.hih = frand(4, 8);
        else { const e = smooth01(u / 0.2) * (1 - smooth01((u - 0.7) / 0.3)); B.head.rotation.x -= 0.22 * e; B.head.rotation.y += (k.hihSide ?? 1) * 0.42 * e; B.head.rotation.z -= (k.hihSide ?? 1) * 0.06 * e; B.body.rotation.x -= 0.05 * e; puff = 0.14 * e; }
      }
    }
    // the wind-up is a "hıh!" too (the eyes stay open, m.anim): chin up (seen from above the face turns up to the camera, never a
    // glare from under the brows), cheeks puffed up, a little puffed-up wobble of the head at its peak
    if (s.mood !== 'happy' && st.windup >= 0) {
      const e = smooth01(st.windup * 1.6);
      B.head.rotation.x -= 0.16 * e; B.head.rotation.z += Math.sin(s.t * 17) * 0.025 * smooth01((st.windup - 0.4) / 0.3);
      puff = 0.2 * e;
    }
    if (B.cheekL) { B.cheekL.scale.set(1 + puff, 1 + puff * 0.85, 1 + puff); B.cheekR.scale.copy(B.cheekL.scale); }
    return [ph, w];
  }
  // Overjoyed goodbye (st.dying ≥ 0): both arms up waving (the generic happy hops, twirl and shrink do the rest). Returns true.
  function townCheer(m, st, s) {
    if (!(st.dying >= 0)) return false;
    const B = m.B, wv = Math.sin(s.t * 13);
    B.armL.rotation.set(-0.3, 0, 2.45 + 0.3 * wv); B.armR.rotation.set(-0.3, 0, -2.45 + 0.3 * wv);
    B.foreL.rotation.set(0, 0, 0.35 + 0.25 * wv); B.foreR.rotation.set(0, 0, -0.35 + 0.25 * wv);
    B.head.rotation.set(-0.14, 0, Math.sin(s.t * 7) * 0.08);
    B.legL.rotation.x = B.legR.rotation.x = 0;
    return true;
  }
  // A held prop kept upright in the body's frame whatever the arm does (b = the prop's bone, chain = arm → forearm).
  const _uq = new THREE.Quaternion();
  function upright(b, ...chain) { _uq.identity(); for (const c of chain) _uq.multiply(c.quaternion); b.quaternion.copy(_uq.invert()); return b; }
  // Turn bone b (rest direction d0 = [x, y, z] from its origin, model space) toward the world point tw, blended by k (world
  // matrices must be current, e.g. right after m.marker()): the crier's mallets land on the drum head whatever his body does.
  const _ap = new THREE.Vector3(), _ad = new THREE.Vector3(), _av = new THREE.Vector3(), _hw = new THREE.Vector3();   // (_hw: marker lookups)
  function aimAt(b, d0, tw, k) {
    b.getWorldPosition(_ap); b.parent.getWorldQuaternion(_uq);
    _ad.copy(tw).sub(_ap).applyQuaternion(_uq.invert()).normalize();
    b.quaternion.slerp(_uq.setFromUnitVectors(_av.fromArray(d0).normalize(), _ad), k);
  }

  // ── Huysuz Nöbetçi (~1.35 m): a chibi town guard in a padded mi-parti tunic (sky blue + sunny yellow halves; sleeves and hose
  // the other way round), a round kettle helmet pushed back with a red feather, a round wooden shield with the smiling-sun crest
  // on the left arm and a long wooden spear with a big soft red pompom. Melee: wind-up = draws the spear back level, weight on
  // the back foot, shield up; attack = a poke-lunge (the arm shoots forward, the spear stays level). ──
  const NOB_TUNIC = [[0, 0.26], [0.2, 0.26], [0.245, 0.29], [0.258, 0.37], [0.25, 0.49], [0.236, 0.59], [0.205, 0.67], [0.13, 0.725], [0, 0.735]];
  const KETTLE = [[0.235, -0.01], [0.3, -0.032], [0.35, -0.058], [0.366, -0.05], [0.358, -0.034], [0.31, -0.008], [0.27, 0.012], [0.262, 0.05], [0.25, 0.1], [0.22, 0.15], [0.16, 0.19], [0.08, 0.212], [0, 0.218]];
  const NOB_HAND = [-0.3, 0.4, 0.08];
  function buildNobetci(r, o) {
    const E = o.elite;
    let blue = col(TOWN.blue), blueD = col(TOWN.blueD), yel = col(TOWN.yellow), yelD = col(TOWN.yellowD);
    if (E) { blue = rich(blue, 1.25, 0.84); blueD = rich(blueD, 1.25, 0.84); yel = rich(yel, 1.2, 0.95); yelD = rich(yelD, 1.2, 0.9); }
    const skin = '#f7c9a2', hair = '#7a4422', boot = '#8a5230', HC = [0, 0.975, 0.01], HR = 0.262;
    r.bone('hips', 'root', [0, 0.36, 0]); r.bone('body', 'hips', [0, 0.42, 0]); r.bone('head', 'body', [0, 0.74, 0]);
    r.bone('legL', 'hips', [0.09, 0.36, 0]); r.bone('legR', 'hips', [-0.09, 0.36, 0]);
    townLeg(r, 1, [0.09, 0.36, 0], [0.095, 0.1, 0.01], yel, boot);
    townLeg(r, -1, [-0.09, 0.36, 0], [-0.095, 0.1, 0.01], blue, boot);
    // padded tunic: the left half blue, the right half yellow, soft quilting bands and a little darker seam down the middle
    const tc = (() => { const out = new THREE.Color(); return (x, y, z) => {
      const L = x > 0, q = Math.pow(Math.abs(Math.sin((y - 0.26) * PI / 0.078)), 6);
      out.copy(L ? blue : yel).lerp(L ? blueD : yelD, 0.28 * q + 0.35 * smooth01((0.34 - y) / 0.08));
      return out.lerp(L ? blueD : yelD, 0.5 * smooth01((0.012 - Math.abs(x)) / 0.012) * smooth01(z / 0.1));
    }; })();
    r.on('body').fx(0, 0, 1).uv(3, 1).add(lathe('nobTunic', NOB_TUNIC, 36), tc);
    r.uv(null).fx(0, 0.35).add(G.torus(TAU, 0.09, 32), '#7a4a26', [0, 0.42, 0], [PI / 2, 0, 0], [0.258, 0.258, 0.34]);
    r.fx(0, 2).add(G.rbox(2), GOLD, [0, 0.42, 0.272], null, [0.06, 0.05, 0.02]);
    r.fx(0, 0.2, 1).add(G.torus(TAU, 0.4, 24), TOWN.white, [0, 0.715, 0], [PI / 2, 0, 0], [0.13, 0.13, 0.09]);
    // arms: the left sleeve yellow, the right one blue (the other way round from the tunic)
    townArm(r, 1, [[0.22, 0.64, 0], [0.275, 0.5, 0.03], [0.29, 0.4, 0.08]], yel, skin, { cuff: yelD });
    townArm(r, -1, [[-0.22, 0.64, 0], [-0.275, 0.5, 0.03], NOB_HAND], blue, skin, { cuff: blueD });
    // the shield on the left forearm, turned out to the front-left so its crest faces the camera
    r.bone('shield', 'foreL', [0.29, 0.43, 0.08]);
    {
      const n = new THREE.Vector3(0.72, 0.16, 0.68).normalize(), C = [0.36, 0.45, 0.13], Rs = 0.2, q = qy(n.x, n.y, n.z), qf = qz(n.x, n.y, n.z);
      const u = new THREE.Vector3().crossVectors(_Y, n).normalize(), wa = col(TOWN.wood), wb = col(TOWN.woodL), out = new THREE.Color();
      r.on('shield').fx(0, 0.3).add(G.cyl(1, 1, 30), (x, y, z) => out.copy(wa).lerp(wb, (Math.floor(((x - C[0]) * u.x + (z - C[2]) * u.z) / 0.066 + 10) & 1) * 0.5), C, q, [Rs, 0.035, Rs]);
      r.fx(0, 2).add(G.torus(TAU, 0.14, 32), E ? GOLD : '#d9dfe8', C, qf, [Rs * 1.02, Rs * 1.02, 0.3]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyQuaternion(qf); r.add(G.sphere(8, 6), GOLD, [C[0] + v.x * Rs * 0.84 + n.x * 0.02, C[1] + v.y * Rs * 0.84 + n.y * 0.02, C[2] + v.z * Rs * 0.84 + n.z * 0.02], null, 0.013); }
      sunCrest(r, [C[0] + n.x * 0.02, C[1] + n.y * 0.02, C[2] + n.z * 0.02], qf, Rs * 0.62);
    }
    // the spear in the right hand: a wooden shaft with blue + yellow wraps, a golden ferrule and a big soft red pompom with ribbons
    r.bone('spear', 'foreR', NOB_HAND);
    {
      const [hx, hy, hz] = NOB_HAND, top = hy + 0.92, wc = (() => { const out = new THREE.Color(), a = col(TOWN.wood), b = col(TOWN.woodD); return (x, y, z) => out.copy(a).lerp(b, 0.25 + 0.25 * Math.sin(y * 70 + x * 30)); })();
      r.on('spear').fx(0, 0.25).seg([hx, hy - 0.3, hz], [hx, top, hz], 0.021, wc, 0.021, 10);
      r.add(G.sphere(8, 6), TOWN.woodD, [hx, hy - 0.3, hz], null, 0.024);
      for (const [y, c] of [[hy + 0.1, TOWN.yellow], [hy - 0.08, TOWN.blue], [top - 0.1, TOWN.yellow]]) r.add(G.cyl(1, 1, 12), c, [hx, y, hz], null, [0.026, 0.03, 0.026]);
      r.fx(0, 2).add(G.cyl(0.8, 1, 12), GOLD, [hx, top + 0.01, hz], null, [0.03, 0.05, 0.03]);
      r.fx(0, 0).add(fluffGeo(), vgrad(top, top + 0.22, [[0, '#b41a2c'], [0.6, '#d82a3e'], [1, '#e8485a']]), [hx, top + 0.11, hz], null, 0.105);
      for (const sd of [-1, 1]) r.fx(0, 0.4, 1).add(G.sphere(10, 6), sd > 0 ? TOWN.yellow : TOWN.blue, [hx + sd * 0.035, top - 0.07, hz + 0.02], [0.15, 0, sd * 0.35], [0.02, 0.08, 0.008]);
      r.fx(0, 0);
      r.mark('muzzle', [hx, top + 0.1, hz]);
    }
    // head: hair peeking out under the helmet (bangs + nape), the kettle helmet pushed back, a red feather on its left
    townHead(r, HC, HR, { skin, ex: 0.1, ey: 0.02, er: 0.088, iris: '#5a3420', browCol: hair, browY: 1.3, browSide: 1, browRaise: 0.2,
      mouthY: -0.125, mouthW: 0.1, glance: 0.75, poutX: 0.16, heartY: 0.95, heartX: 1.15 });
    r.on('head').fx(0, 0.2);
    for (const [a, y, s] of [[-0.6, 1.165, 0.06], [-0.2, 1.185, 0.062], [0.2, 1.185, 0.06], [0.6, 1.165, 0.058], [1.6, 1.04, 0.075], [-1.6, 1.04, 0.075], [2.4, 0.99, 0.085], [-2.4, 0.99, 0.085], [PI, 0.98, 0.095]]) {
      r.add(G.sphere(14, 10), hair, [Math.sin(a) * HR * 0.86, y, HC[2] + Math.cos(a) * HR * 0.82], [0, a, 0.3], [s * 1.1, s * 0.7, s * 0.8]);
    }
    const helm = E ? GOLD : TOWN.steel;
    r.push([0, 1.14, -0.05], [-0.44, 0, 0]);
    r.fx(0, 2).add(lathe('kettle', KETTLE, 30, 3), helm);
    r.add(G.torus(TAU, 0.2, 32), E ? '#ffe08a' : GOLD, [0, 0.03, 0], [PI / 2, 0, 0], [0.266, 0.266, 0.09]);
    r.add(G.sphere(12, 8), GOLD, [0, 0.225, 0], null, [0.035, 0.025, 0.035]);
    // feather: a soft red plume (a leaf shape in two pieces, curving up and back) with a white quill, out of a golden holder
    {
      const fl = lathe('flame', FLAME_P, 16, 2), f0 = [0.19, 0.12, -0.07], d0 = new THREE.Vector3(0.3, 1, -0.35).normalize(), d1 = new THREE.Vector3(0.2, 0.5, -1).normalize();
      const f1 = [f0[0] + d0.x * 0.2, f0[1] + d0.y * 0.2, f0[2] + d0.z * 0.2], fz = [0.5, 0.35, 1];
      r.fx(0, 0.1, 1).add(fl, vgrad(0.1, 0.34, [[0, '#d82438'], [1, TOWN.red]]), f0, qb([d0.x, d0.y, d0.z], fz), [0.13, 0.26, 0.035]);
      r.add(fl, vgrad(0.28, 0.44, [[0, TOWN.red], [1, TOWN.redL]]), [f1[0] - d1.x * 0.03, f1[1] - d1.y * 0.03, f1[2] - d1.z * 0.03], qb([d1.x, d1.y, d1.z], fz), [0.11, 0.22, 0.03]);
      r.fx(0, 0.3).seg(f0, f1, 0.008, '#fff4f0', 0.006, 5).seg(f1, [f1[0] + d1.x * 0.16, f1[1] + d1.y * 0.16, f1[2] + d1.z * 0.16], 0.006, '#fff4f0', 0.003, 5);
      r.fx(0, 2).add(G.cyl(1, 1, 10), GOLD, f0, qy(d0.x, d0.y, d0.z), [0.024, 0.06, 0.024]);
    }
    if (E) crown(r.fx(0, 0), [0, 0.21, 0.02], 0.62, '#4aa8ff');
    r.pop().fx(0, 0);
    return { height: 1.35, glowC: col('#ffb13a'), tex: texOf('fabric'), hide: [], mat: { rough: 0.55, ns: 0.8, sss: col('#ffd8c0').multiplyScalar(0.03) } };
  }
  function animNobetci(m, dt, st, s) {
    const B = m.B;
    if (townCheer(m, st, s)) { upright(B.spear, B.armR, B.foreR).rotateZ(-0.25 + Math.sin(s.t * 13) * 0.18); return; }   // waves the spear like a flag
    const [, w] = townWalk(m, dt, st, s, { rate: 6.5, stride: 0.55, arm: 0.3, hihSide: 1 });
    // rest: the spear upright at the side (a little forward and out), the shield arm bent in front
    let aR = -0.12 + B.armR.rotation.x * 0.4, fR = -0.2, sp = 0.2, lean = 0, lunge = 0, twist = 0, aL = -0.25 + B.armL.rotation.x * 0.5, fL = -0.55;
    B.armR.rotation.z = -0.1; B.spear.rotation.z = -0.05;
    if (st.windup >= 0) {   // draws the spear back level beside the hip, leans back onto the back foot, shield up in front
      const u = smooth01(st.windup * 1.35);
      aR = lerp(aR, 0.5, u); fR = lerp(fR, -0.95, u); lean = -0.16 * u; twist = -0.32 * u; aL = lerp(aL, -0.9, u); fL = lerp(fL, -0.5, u);
      B.hips.position.x += Math.sin(s.t * 50) * 0.008 * st.windup; B.hips.position.z -= 0.05 * u;
      B.legL.rotation.x = -0.3 * u; B.legR.rotation.x = 0.25 * u;
    }
    if (st.attack >= 0) {   // the poke: the arm shoots forward straight, the whole guard lunges after it, then settles back
      const a = st.attack, hit = smooth01(a / 0.2), back = smooth01((a - 0.5) / 0.5), f = hit * (1 - back);
      aR = lerp(lerp(0.5, -1.45, hit), -0.12, back); fR = lerp(lerp(-0.95, -0.1, hit), -0.2, back);
      lean = lerp(-0.16, 0.3, hit) * (1 - back); lunge = 0.16 * f; twist = lerp(-0.32, 0.22, hit) * (1 - back); aL = lerp(-0.9, -0.3, hit); fL = -0.5;
      B.legL.rotation.x = -0.5 * f; B.legR.rotation.x = 0.45 * f;
    }
    B.armR.rotation.x = aR; B.foreR.rotation.x = fR; B.armL.rotation.x = aL; B.foreL.rotation.x = fL; B.armL.rotation.z = 0.12;
    // the spear stays upright at rest and level while it is drawn back / poking (its world angle = arm + forearm + own)
    const lvl = st.windup >= 0 ? smooth01(st.windup * 1.6) : st.attack >= 0 ? 1 - smooth01((st.attack - 0.55) / 0.45) : 0;
    B.spear.rotation.x = lerp(sp - aR - fR, PI / 2 - aR - fR - lean, lvl);
    B.body.rotation.x += lean; B.body.rotation.y += twist; B.head.rotation.y -= twist * 0.8; B.head.rotation.x -= lean * 0.6;
    B.hips.position.z += lunge; B.hips.position.y -= 0.03 * Math.abs(lean) - 0.02 * w * 0;
  }

  // ── Huysuz Simitçi (~1.3 m with his tray): a round street vendor — a big wooden tray of simits on his head (on a little cloth
  // ring), white apron over a red shirt with rolled sleeves, a curly moustache, rosy cheeks, the left hand on his hip (sulky!).
  // Ranged: wind-up = the right hand goes up beside his head, a little bounce tosses the top simit off the tray and he catches
  // it (his arms are far too short to reach the tray), winds it back over the shoulder and swings it forward (the release
  // point, the muzzle, is his right hand at st.windup 1); attack = the follow-through while a new simit pops onto the tray. ──
  const SIM_BODY = [[0, 0.22], [0.2, 0.22], [0.27, 0.26], [0.312, 0.34], [0.325, 0.44], [0.31, 0.54], [0.265, 0.62], [0.18, 0.68], [0, 0.7]];
  const SIM_HAND = [-0.32, 0.36, 0.1], SIM_TRAY = [0, 1.155, -0.02];
  function buildSimitci(r, o) {
    const E = o.elite;
    let shirt = col('#f45a50'), shirtD = col('#c83a3a');
    if (E) { shirt = rich(shirt, 1.2, 0.86); shirtD = rich(shirtD, 1.2, 0.85); }
    const skin = '#e9ad84', stache = '#4a2a18', pants = '#3f56a8', shoe = '#5a3420', HC = [0, 0.905, 0.02], HR = 0.25;
    r.bone('hips', 'root', [0, 0.3, 0]); r.bone('body', 'hips', [0, 0.34, 0]); r.bone('head', 'body', [0, 0.69, 0]);
    r.bone('legL', 'hips', [0.11, 0.3, 0]); r.bone('legR', 'hips', [-0.11, 0.3, 0]);
    townLeg(r, 1, [0.11, 0.3, 0], [0.115, 0.09, 0.0], pants, shoe, { r: 0.065 });
    townLeg(r, -1, [-0.11, 0.3, 0], [-0.115, 0.09, 0.0], pants, shoe, { r: 0.065 });
    // round belly in a red shirt; the white apron over its front (bib, pocket with a stitched simit) tied at the back
    r.on('body').fx(0, 0, 1).uv(3, 1).add(lathe('simBody', SIM_BODY, 36), vgrad(0.22, 0.7, [[0, shirtD], [0.3, shirt], [1, shirt]]));
    const apron = gx('simApron@' + sN(28, 14), () => {
      const v = new THREE.SplineCurve([[0.29, 0.25], [0.328, 0.34], [0.34, 0.44], [0.324, 0.54], [0.28, 0.62]].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(16);
      return seamNormals(new THREE.LatheGeometry(v, sN(28, 14), -1.15, 2.3));
    });
    r.fx(0, 0, 1).uv(2, 1).add(apron, vgrad(0.25, 0.62, [[0, '#f2ece2'], [0.4, TOWN.white], [1, '#ffffff']]));
    r.uv(null);
    for (const sd of [-1, 1]) r.seg([sd * 0.2, 0.61, 0.21], [sd * 0.13, 0.69, 0.03], 0.018, TOWN.white, 0.018, 6);
    r.add(G.torus(TAU, 0.2, 32), TOWN.white, [0, 0.33, 0], [PI / 2, 0, 0], [0.305, 0.305, 0.08]);
    r.fx(0, 0.1).add(G.rbox(2), '#f0e8dc', [0.02, 0.4, 0.335], [-0.05, 0, 0], [0.15, 0.1, 0.02]);
    r.fx(0, 0.4).add(simitGeo(), simitCol(0.405, 0.03), [0.02, 0.405, 0.35], [PI / 2 - 0.05, 0, 0], 0.03);
    r.fx(0, 0.2, 1).add(G.torus(TAU, 0.35, 24), '#ffd23f', [0, 0.685, 0.01], [PI / 2 - 0.1, 0, 0], [0.12, 0.12, 0.1]);   // yellow neckerchief
    r.fx(0, 0);
    // arms: rolled-up sleeves (white cuffs), the left fist on the hip, the right one free to throw
    townArm(r, 1, [[0.25, 0.58, 0], [0.4, 0.46, -0.05], [0.34, 0.37, 0.06]], shirt, skin, { r: 0.055, fore: skin, cuff: TOWN.white, cuffAt: 0.02, hand: 0.066 });
    townArm(r, -1, [[-0.25, 0.58, 0], [-0.31, 0.46, 0.03], SIM_HAND], shirt, skin, { r: 0.055, fore: skin, cuff: TOWN.white, cuffAt: 0.02, hand: 0.066 });
    // the simit in the throwing hand (shown during the wind-up), the muzzle at the hand
    r.bone('simit', 'foreR', SIM_HAND);
    r.on('simit').fx(0, 0.4).add(simitGeo(), simitCol(SIM_HAND[1] + 0.06, 0.07), [SIM_HAND[0], SIM_HAND[1] + 0.06, SIM_HAND[2] + 0.03], [PI / 2, 0, 0.3], 0.07).fx(0, 0);
    r.mark('muzzle', SIM_HAND);
    // head: curly moustache, rosy cheeks, short dark hair round the back under the tray
    townHead(r, HC, HR, { skin, ex: 0.098, ey: 0.03, er: 0.086, iris: '#4a2a18', browCol: stache, browY: 1.34, browSide: -1, browRaise: 0.22, browT: 0.42,
      mouthY: -0.155, mouthW: 0.095, glance: -0.75, poutX: -0.1, noseK: 1.35, blushCol: '#ff6a86', heartY: 1.05, heartX: 1.2, cheekY: 1.1 });
    r.on('head');
    r.push(HC, [-0.3, 0, 0]);
    for (const sd of [-1, 1]) { const [p, q] = onSphere(sd * 0.012, -0.088, HR, -0.014); r.push(p, q).fx(0, 0.25).add(stacheGeo(sd), stache, [0, 0, 0], null, [0.125, 0.13, 0.12]).pop(); }
    r.pop();
    r.fx(0, 0.15);
    for (const [a, y, s] of [[1.5, 0.95, 0.075], [-1.5, 0.95, 0.075], [2.2, 0.96, 0.09], [-2.2, 0.96, 0.09], [PI, 0.95, 0.1], [2.7, 1.04, 0.09], [-2.7, 1.04, 0.09]]) {
      r.add(G.sphere(14, 10), stache, [Math.sin(a) * HR * 0.9, y, HC[2] + Math.cos(a) * HR * 0.86], [0, a, 0.3], [s * 1.1, s * 0.75, s * 0.8]);
    }
    // the tray on a little cloth ring, tilted a little toward the throwing hand: wood with a raised rim, simits stacked on it
    r.bone('tray', 'head', SIM_TRAY);
    r.on('tray').push(SIM_TRAY, [0.04, 0, 0.12]);
    r.fx(0, 0.1, 1).add(G.torus(TAU, 0.45, 24), (x, y, z) => ((Math.floor(Math.atan2(x, z) / TAU * 16 + 16) & 1) ? col('#ff6a6a') : col('#ffffff')), [0, -0.005, 0], [PI / 2, 0, 0], [0.09, 0.09, 0.08]);
    const wt = col('#b4743a'), wtD = col('#80501f'), out = new THREE.Color();
    r.fx(0, 0.25, 0).add(G.cyl(1, 1, 36), (x, y, z) => out.copy(wtD).lerp(wt, 0.55 + 0.45 * Math.sin(Math.hypot(x, z - SIM_TRAY[2]) * 120)), [0, 0.035, 0], null, [0.3, 0.024, 0.3]);
    r.fx(0, E ? 2 : 0.35).add(G.torus(TAU, 0.2, 40), E ? GOLD : '#9a6030', [0, 0.05, 0], [PI / 2, 0, 0], [0.3, 0.3, 0.12]);
    r.fx(0, 0.4);
    const SIMS = [[0, 0.17, 0], [1.25, 0.17, 0], [2.5, 0.17, 0], [3.75, 0.17, 0], [5.0, 0.17, 0], [0.6, 0.085, 1], [2.7, 0.085, 1], [4.8, 0.085, 1]];
    for (const [a, rr, layer] of SIMS) {
      const s2 = 0.072, y = 0.07 + layer * 0.045, x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      r.add(simitGeo(), simitCol(SIM_TRAY[1] + y, s2), [x, y, z], [0.08 * Math.cos(a * 3), a, 0.08 * Math.sin(a * 2)], s2);
    }
    // the top simit rides its own bone: it is the one he tosses and catches
    r.bone('simTop', 'tray', new THREE.Vector3(0, 0.16, 0).applyEuler(new THREE.Euler(0.04, 0, 0.12)).add(new THREE.Vector3(...SIM_TRAY)).toArray());
    r.add(simitGeo(), simitCol(SIM_TRAY[1] + 0.16, 0.07), [0, 0.16, 0], [0.12, 0.5, 0], 0.07);
    if (E) crown(r.on('tray').fx(0, 0), [0, 0.19, 0], 0.5, '#ff5a50');
    r.pop().fx(0, 0);
    return { height: 1.3, glowC: col('#ffb13a'), tex: texOf('fabric'), hide: ['simit'], mat: { rough: 0.55, ns: 0.8, sss: col('#ffd8c0').multiplyScalar(0.03) } };
  }
  function animSimitci(m, dt, st, s) {
    const B = m.B;
    B.simit.scale.setScalar(0.0001);
    if (townCheer(m, st, s)) { B.tray.rotation.z = Math.sin(s.t * 9) * 0.08; return; }
    const [, w] = townWalk(m, dt, st, s, { rate: 6, stride: 0.45, arm: 0.3, bob: 0.045, hihSide: -1 });
    const br = Math.sin(s.t * 2.2 + s.ph);
    B.body.scale.set(1 + 0.01 * br, 1 + 0.012 * br, 1 + 0.01 * br);
    // left fist on the hip (sulky), the tray balanced (it lags a little behind the head)
    B.armL.rotation.set(0, 0, 0); B.foreL.rotation.set(0, 0, 0);
    B.tray.rotation.z = -B.head.rotation.z * 0.6 + Math.sin(s.walk) * 0.03 * w; B.tray.rotation.x = Math.sin(s.walk * 2) * 0.02 * w;
    let top = 1;
    if (st.windup >= 0) {   // 0–0.22 hand up beside the head, palm up · 0.16–0.32 bounce: the top simit hops off · 0.45 caught ·
      // 0.47–0.75 wound back over the shoulder · 0.75–1 swung forward (it leaves the hand at 1)
      const u = st.windup, g = smooth01(u / 0.22), c = smooth01((u - 0.47) / 0.28), t = smooth01((u - 0.75) / 0.25), hop = bump(u - 0.14, 0.18);
      const catchK = bump(u - 0.44, 0.12);
      B.armR.rotation.set(lerp(lerp(lerp(B.armR.rotation.x, 0.1, g), -0.75, c), -1.75, t), 0, lerp(lerp(lerp(-0.06, -2.6, g), -2.2, c), -0.3, t));
      B.foreR.rotation.set(lerp(0.3 * catchK, 0, c), 0, lerp(lerp(lerp(0, -0.55, g), -1.25, c), 0, t));
      B.armR.position.y += 0.05 * g * (1 - t);   // (a little shrug: the palm as high as it goes, beside his head)
      B.body.rotation.y += -0.42 * c * (1 - t) + 0.3 * t; B.body.rotation.x += -0.1 * c * (1 - t) + 0.14 * t;
      B.head.rotation.y -= B.body.rotation.y * 0.7; B.head.rotation.x += 0.1 * c * (1 - t) - 0.14 * hop - 0.16 * t;
      B.hips.position.y += 0.04 * hop - 0.02 * catchK;
      B.tray.rotation.x -= 0.08 * hop; B.tray.rotation.z += 0.1 * hop;
      if (u >= 0.2 && u < 0.45) {   // the flight from the tray into the hand (this frame's pose: the hand in the tray's frame)
        const f = (u - 0.2) / 0.25;
        m.marker('muzzle', _hw); B.tray.worldToLocal(_hw);
        B.simTop.position.lerpVectors(B.simTop.userData.p0, _hw, smooth01(f)).y += Math.sin(PI * Math.min(1, f * 1.15)) * 0.22;
        B.simTop.rotation.set(f * TAU * 1.25, 0, f * 1.6);
      }
      if (u >= 0.45) { top = 0; B.simit.scale.setScalar(1 + 0.25 * catchK); }
      B.hips.position.x += Math.sin(s.t * 48) * 0.006 * c * (1 - t);
    }
    if (st.attack >= 0) {   // follow-through: the empty hand swings on down across the front, then back to the side
      const a = st.attack, d = smooth01(a / 0.3), back = smooth01((a - 0.4) / 0.6);
      B.armR.rotation.set(lerp(lerp(-1.75, -0.8, d), 0, back), 0, lerp(-0.3, 0.15, d) * (1 - back)); B.foreR.rotation.set(lerp(-0.1, -0.35, d) * (1 - back), 0, 0);
      B.body.rotation.y += lerp(0.3, 0.4, d) * (1 - back); B.body.rotation.x += 0.16 * (1 - back); B.head.rotation.y -= B.body.rotation.y * 0.7; B.head.rotation.x -= 0.18 * (1 - back);
      top = smooth01((a - 0.45) / 0.4);   // a new simit pops onto the tray
      top *= 1 + 0.3 * Math.sin(PI * top);
    }
    B.simTop.scale.setScalar(Math.max(0.0001, top));
  }

  // ── Huysuz Süpürgeci (~1.2 m): a quick street sweeper in green overalls (a yellow knee patch) over a sunny orange shirt, a blue
  // flat cap with a red patch, a big straw broom held in both hands (it rides the body: sweeping = twisting from the waist).
  // Glide (like kaymak): wind-up = crouches low, broom drawn back to the right; attack = whooshes along the lane, sweeping fast
  // (st.attack = the share of the lane), then st.attack 1 = straightens up and wipes his brow ("phew"). ──
  const SUP_BODY = [[0, 0.24], [0.17, 0.24], [0.2, 0.28], [0.205, 0.38], [0.2, 0.48], [0.19, 0.56], [0.16, 0.62], [0.1, 0.655], [0, 0.66]];
  const BROOM_P = [[0, 0], [0.045, 0.004], [0.06, 0.03], [0.075, 0.1], [0.1, 0.2], [0.13, 0.3], [0.155, 0.4], [0.17, 0.46], [0.1, 0.475], [0, 0.48]];
  // the straw bundle of the broom: a flared lathe whose end is cut ragged (twig ends of uneven length)
  function broomGeo() {
    const sg = sN(30, 16);
    return gx('broom@' + sg, () => {
      const v = new THREE.SplineCurve(BROOM_P.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(BROOM_P.length * 3);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      const g = new THREE.LatheGeometry(v, sg), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), k = smooth01((y - 0.36) / 0.1);
        p.setY(i, y + k * 0.07 * (hash3(Math.floor((a + PI) / TAU * sg + 0.5) % sg, 7, 1) - 0.35));
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
  }
  const SUP_TOP = [-0.22, 0.62, -0.04], SUP_BIND = [0.2, 0.29, 0.34];
  function buildSupurgeci(r, o) {
    const E = o.elite;
    let ov = col('#39c26c'), ovD = col('#23945a'), shirt = col('#ff9a3a');
    if (E) { ov = rich(ov, 1.2, 0.85); ovD = rich(ovD, 1.2, 0.85); shirt = rich(shirt, 1.15, 0.92); }
    const skin = '#b87a52', hair = '#2a1a14', shoe = '#6a3a22', cap = E ? '#2a58d8' : '#4a82ee', HC = [0, 0.885, 0.02], HR = 0.245;
    r.bone('hips', 'root', [0, 0.33, 0]); r.bone('body', 'hips', [0, 0.37, 0]); r.bone('head', 'body', [0, 0.66, 0]);
    r.bone('legL', 'hips', [0.085, 0.33, 0]); r.bone('legR', 'hips', [-0.085, 0.33, 0]);
    townLeg(r, 1, [0.085, 0.33, 0], [0.09, 0.09, 0.01], ov, shoe, { r: 0.056 });
    townLeg(r, -1, [-0.085, 0.33, 0], [-0.09, 0.09, 0.01], ov, shoe, { r: 0.056 });
    r.on('legL').fx(0, 0.1, 1).add(G.rbox(2), '#ffd23f', [0.09, 0.2, 0.05], [0, 0.2, 0.15], [0.06, 0.06, 0.02]).fx(0, 0);   // knee patch
    // orange shirt with green overalls: the trousers up to a waistband, the bib panel on the front, the straps over the
    // shoulders, two big buttons
    r.on('body').fx(0, 0, 1).uv(3, 1).add(lathe('supBody', SUP_BODY, 32), (() => { const out = new THREE.Color(); return (x, y) => y < 0.39 ? out.copy(ov).lerp(ovD, 0.25 * smooth01((0.32 - y) / 0.08)) : out.copy(shirt); })());
    const bib = gx('supBib@' + sN(12, 6), () => {
      const v = new THREE.SplineCurve([[0.213, 0.37], [0.213, 0.42], [0.208, 0.48], [0.2, 0.53], [0.191, 0.575]].map(p => new THREE.Vector2(p[0], p[1]))).getPoints(10);
      return seamNormals(new THREE.LatheGeometry(v, sN(12, 6), -0.62, 1.24));
    });
    r.uv(2, 1).add(bib, ov).uv(null);
    r.fx(0, 0.35).add(G.torus(TAU, 0.2, 28), ovD, [0, 0.39, 0], [PI / 2, 0, 0], [0.208, 0.208, 0.1]);   // waistband
    r.fx(0, 0.1, 1);
    for (const sd of [-1, 1]) r.seg([sd * 0.105, 0.565, 0.16], [sd * 0.12, 0.65, 0.0], 0.022, ovD, 0.022, 6).seg([sd * 0.12, 0.65, 0.0], [sd * 0.1, 0.42, -0.19], 0.022, ovD, 0.022, 6);
    r.fx(0, 2);
    for (const sd of [-1, 1]) r.add(G.sphere(10, 8), GOLD, [sd * 0.1, 0.545, 0.174], null, [0.022, 0.022, 0.012]);
    r.fx(0, 0.2, 1).add(G.torus(TAU, 0.35, 24), '#ffe07a', [0, 0.645, 0.01], [PI / 2 - 0.1, 0, 0], [0.1, 0.1, 0.09]).fx(0, 0);   // yellow collar
    // arms (orange sleeves to the wrists) reaching to the broom handle; the broom rides the body
    const d = new THREE.Vector3(...SUP_BIND).sub(new THREE.Vector3(...SUP_TOP)).normalize(), at = t => [SUP_TOP[0] + d.x * t, SUP_TOP[1] + d.y * t, SUP_TOP[2] + d.z * t];
    const hR = at(0.13), hL = at(0.43);
    townArm(r, -1, [[-0.17, 0.57, 0], [-0.25, 0.47, 0.06], hR], shirt, skin, { r: 0.046, cuff: '#e87a1a' });
    townArm(r, 1, [[0.17, 0.57, 0], [0.16, 0.44, 0.15], hL], shirt, skin, { r: 0.046, cuff: '#e87a1a' });
    r.bone('broom', 'body', at(0.3));
    {
      const wc = (() => { const out = new THREE.Color(), a = col(TOWN.woodL), b = col(TOWN.wood); return (x, y, z) => out.copy(a).lerp(b, 0.3 + 0.3 * Math.sin(y * 80 + x * 40)); })();
      const tip = at(-0.05);
      r.on('broom').fx(0, 0.25).seg(tip, SUP_BIND, 0.019, wc, 0.019, 10).add(G.sphere(8, 6), TOWN.woodD, tip, null, 0.024);
      // the straw head: a flared bundle (flattened into a fan), straw streaks, red twine bands
      const q = qb([d.x, d.y, d.z], [0, 1, 0]);   // (the fan spreads sideways, flat toward the sky)
      const sc = [1, 1, 0.5], straw = col(E ? '#ffd23f' : '#f2c454'), strawD = col('#c89430'), strawL = col('#ffe89a'), out = new THREE.Color(), B0 = new THREE.Vector3(...SUP_BIND);
      r.push(SUP_BIND, q, sc).fx(0, 0.1).add(broomGeo(), (x, y, z) => {
        const h = hash3(Math.floor(Math.atan2(x - B0.x, z - B0.z) * 5 + 20), Math.floor(Math.hypot(x - B0.x, y - B0.y, z - B0.z) * 12), 3), dd = Math.hypot(x - B0.x, y - B0.y, z - B0.z);
        return out.copy(strawD).lerp(straw, 0.25 + 0.75 * h).lerp(strawL, smooth01((dd - 0.3) / 0.14) * 0.45);
      });
      for (let i = 0; i < 7; i++) {   // a few loose twigs poking out of the fan
        const a = (i / 6 - 0.5) * 2.4, ln = 0.1 + 0.05 * hash3(i, 3, 3);
        r.add(G.cone(5), i & 1 ? strawD : straw, [Math.sin(a) * 0.15, 0.45 + ln * 0.4, Math.cos(a) * 0.15], [0, 0, 0], [0.012, ln, 0.012]);
      }
      r.fx(0, 0.2).add(G.torus(TAU, 0.2, 20), '#e83a3a', [0, 0.04, 0], [PI / 2, 0, 0], [0.066, 0.066, 0.2]);
      r.add(G.torus(TAU, 0.2, 20), '#e83a3a', [0, 0.1, 0], [PI / 2, 0, 0], [0.08, 0.08, 0.2]);
      r.pop().fx(0, 0);
    }
    // head: black curls under the cap, the flat cap (pushed back a little, askew) with a red patch and a short visor
    townHead(r, HC, HR, { skin, ex: 0.095, ey: 0.02, er: 0.084, iris: '#3a2214', browCol: hair, browY: 1.34, browSide: 1, browRaise: 0.24,
      mouthY: -0.13, mouthW: 0.092, glance: 0.8, poutX: 0.14, lipCol: '#d85a72', blushCol: '#ff6a7e', heartY: 1.05, heartX: 1.15 });
    r.on('head').fx(0, 0.15);   // black curls round the head under the cap
    for (let i = 0; i < 11; i++) {
      const a = 0.75 + i / 10 * (TAU - 1.5), y = 1.02 - 0.05 * Math.abs(Math.cos(a / 2)) + 0.02 * (i & 1), s2 = 0.05 + 0.012 * (i & 1);
      r.add(fluffGeo(14), hair, [Math.sin(a) * HR * 0.93, y, HC[2] + Math.cos(a) * HR * 0.9], null, [s2, s2 * 0.9, s2]);
    }
    // the flat cap, pushed back and worn askew: its visor sticks out to his left front
    r.push([0.02, 1.07, -0.02], [-0.28, 0.55, 0.1]);
    const capD = mixc(cap, '#1a2a70', 0.28);
    r.fx(0, 0.15, 1).add(G.sphere(28, 16), vgrad(0, 0.12, [[0, capD], [1, cap]]), [0, 0.025, 0.02], null, [0.265, 0.095, 0.29]);
    r.add(G.torus(TAU, 0.2, 28), capD, [0, 0.012, 0], [PI / 2, 0, 0], [0.25, 0.25, 0.15]);
    r.fx(0, 0.2, 1).add(G.sphere(20, 8), capD, [0, 0.0, 0.31], [0.4, 0, 0], [0.18, 0.026, 0.13]);   // visor
    {   // the patch: a yellow square stitched on with red, lying on the cap's top
      const [pp, pn] = onEll([0, 0.025, 0.02], [0.265, 0.095, 0.29], 0.55, -1.1), pq = qy(...pn);
      r.fx(0, 0.1, 1).add(G.rbox(2), '#ffd23f', pp, pq, [0.1, 0.014, 0.09]);
      r.fx(0, 0.3);
      for (const [dx, dz] of [[-0.042, -0.037], [0.042, -0.037], [-0.042, 0.037], [0.042, 0.037], [0, -0.04], [0, 0.04]]) r.add(G.sphere(6, 4), '#e8303a', new THREE.Vector3(dx, 0.009, dz).applyQuaternion(pq).add(new THREE.Vector3(...pp)).toArray(), null, 0.009);
    }
    r.add(G.sphere(10, 8), '#ffd23f', [0, 0.142, 0.01], null, [0.03, 0.018, 0.03]);
    if (E) crown(r.fx(0, 0), [0.07, 0.12, -0.04], 0.5, '#39c26c');
    r.pop().fx(0, 0);
    r.on('broom').mark('muzzle', SUP_BIND);
    return { height: 1.2, glowC: col('#ffb13a'), tex: texOf('fabric'), hide: [], mat: { rough: 0.55, ns: 0.8, sss: col('#ffd8c0').multiplyScalar(0.03) } };
  }
  function animSupurgeci(m, dt, st, s) {
    const B = m.B;
    if (townCheer(m, st, s)) return;
    const [ph, w] = townWalk(m, dt, st, s, { rate: 8, stride: 0.6, arm: 0, bob: 0.04, hihSide: 1 });
    // hands stay on the broom; walking he sweeps along (a slow twist from the waist every other step), standing now and then
    B.armL.rotation.set(0, 0, 0); B.armR.rotation.set(0, 0, 0); B.foreL.rotation.set(0, 0, 0); B.foreR.rotation.set(0, 0, 0);
    s.sw = (s.sw || 0) + dt * (1.5 + 3.5 * s.mv);
    let tw = Math.sin(s.sw) * (0.12 + 0.2 * w), lean = 0.08 * w, low = 0;
    if (st.windup >= 0) {   // crouch, lean in, broom drawn back to the right, a little tremble at the end
      const u = smooth01(st.windup * 1.4);
      tw = lerp(tw, -0.6, u); lean = lerp(lean, 0.24, u); low = 0.07 * u;
      B.legL.rotation.z = 0.22 * u; B.legR.rotation.z = -0.22 * u; B.legL.rotation.x = -0.2 * u; B.legR.rotation.x = 0.2 * u;
      B.hips.position.x += Math.sin(s.t * 55) * 0.008 * st.windup;
    }
    if (st.attack >= 0 && st.attack < 1) {   // the whoosh: low and leaning, sweeping fast from side to side, gliding on a skating stride
      const a = st.attack, k = smooth01(a / 0.1) * (1 - 0.5 * smooth01((a - 0.85) / 0.15));
      tw = lerp(-0.6, Math.sin(s.t * 20) * 0.55, smooth01(a / 0.08)); lean = 0.3 * k; low = 0.08 * k;
      B.legL.rotation.x = -0.45 * k; B.legR.rotation.x = 0.4 * k; B.legL.rotation.z = 0.08 * k; B.legR.rotation.z = -0.08 * k;
      B.hips.position.y += Math.abs(Math.sin(s.t * 20)) * 0.012 * k;
    } else if (st.attack >= 1) {   // phew: stands up, the broom still in one hand, the other wipes his brow
      s.rec = (s.rec || 0) + dt;
      const e = smooth01(s.rec / 0.2);
      tw *= 0.3; lean = -0.08 * e;
      B.armL.rotation.set(-2.2 * e, 0, 0.5 * e); B.foreL.rotation.set(-1.2 * e, 0, 0.9 * e);
      B.head.rotation.z += Math.sin(s.t * 6) * 0.08 * e;
    }
    if (!(st.attack >= 1)) s.rec = 0;
    // (the head stays up while he leans in: his face keeps looking ahead, visible under the cap from the camera above)
    B.body.rotation.y += tw; B.head.rotation.y -= tw * 0.75; B.body.rotation.x += lean; B.head.rotation.x -= lean * (lean > 0 ? 1.15 : 0.7);
    B.hips.position.y -= low; B.hips.rotation.x = 0;
    B.broom.rotation.z = Math.sin(s.sw * 2) * 0.04 * (st.attack >= 0 ? 0 : 1);
  }

  // ── Huysuz Tellal (~1.95 m, the pack's big one): the town crier with a big round belly, a tall purple pointy hat with a golden
  // bell on its floppy tip, a teal coat with a yellow sash, curled-toe slippers and a big decorated davul on his belly (its front
  // head tilted up with the smiling-sun crest), a padded mallet in each hand. Slam: wind-up = both mallets raised high, leaning
  // back (1 s); attack = BOOM at st.attack 0 (GAME's ring), the drum squashes, the bell jumps, then he settles. ──
  const TEL_BODY = [[0, 0.44], [0.33, 0.44], [0.43, 0.5], [0.49, 0.64], [0.505, 0.8], [0.485, 0.96], [0.42, 1.1], [0.28, 1.19], [0, 1.21]];
  const TEL_HAT = [[0.285, 0], [0.28, 0.04], [0.24, 0.1], [0.19, 0.17], [0.14, 0.23], [0.1, 0.27], [0, 0.29]];
  const TEL_DRUM = [0, 0.8, 0.6], TEL_N = new THREE.Vector3(0, 0.36, 0.93).normalize(), TEL_HANDL = [0.54, 0.66, 0.16], TEL_HANDR = [-0.54, 0.66, 0.16];
  const TEL_MAL = sd => [-sd * 0.04, 0.08, 0.42];   // a mallet from the hand to its head (see buildTellal)
  function buildTellal(r, o) {
    const E = o.elite;
    let coat = col('#22b0a4'), coatD = col('#15857e'), hat = col('#8a52dc'), drum = col('#ec4438');
    if (E) { coat = rich(coat, 1.2, 0.85); coatD = rich(coatD, 1.2, 0.85); hat = rich(hat, 1.2, 0.85); drum = rich(drum, 1.15, 0.9); }
    const skin = '#dea47c', beard = '#6a4430', HC = [0, 1.47, 0.03], HR = 0.3;
    r.bone('hips', 'root', [0, 0.5, 0]); r.bone('body', 'hips', [0, 0.56, 0]); r.bone('head', 'body', [0, 1.2, 0]);
    r.bone('legL', 'hips', [0.18, 0.5, 0]); r.bone('legR', 'hips', [-0.18, 0.5, 0]);
    for (const sd of [-1, 1]) {
      townLeg(r, sd, [0.18 * sd, 0.5, 0], [0.19 * sd, 0.12, 0.02], '#ffd23f', '#d8443a', { r: 0.1, shoe: [0.12, 0.085, 0.19], tex: 1 });
      r.fx(0, 0.1).add(fluffGeo(12), GOLD, [0.19 * sd, 0.13, 0.2], null, 0.04).fx(0, 0);   // a little golden pompom on each slipper
    }
    // coat over the big belly (gold buttons down the front, mostly behind the drum), a wide yellow sash
    r.on('body').fx(0, 0, 1).uv(4, 1).add(lathe('telBody', TEL_BODY, 34, 4), vgrad(0.44, 1.21, [[0, coatD], [0.3, coat], [1, mixc(coat, '#ffffff', 0.08)]]));
    r.uv(null).fx(0, 0.15, 1).add(G.torus(TAU, 0.1, 40), '#ffd23f', [0, 0.53, 0], [PI / 2, 0, 0], [0.45, 0.45, 0.45]);
    r.fx(0, 2);
    for (const y of [0.64, 0.74, 1.02, 1.1]) { const rr = profR('telBody', TEL_BODY)(y); r.add(G.sphere(10, 8), GOLD, [0, y, rr + 0.005], null, [0.03, 0.03, 0.015]); }
    r.fx(0, 0.2, 1).add(G.torus(TAU, 0.4, 28), '#ffd23f', [0, 1.19, 0.01], [PI / 2 - 0.1, 0, 0], [0.19, 0.19, 0.12]).fx(0, 0);
    // arms: teal sleeves with yellow cuffs; a padded mallet in each hand
    townArm(r, 1, [[0.42, 1.08, 0], [0.56, 0.87, 0.04], TEL_HANDL], coat, skin, { r: 0.085, cuff: '#ffd23f', hand: 0.1 });
    townArm(r, -1, [[-0.42, 1.08, 0], [-0.56, 0.87, 0.04], TEL_HANDR], coat, skin, { r: 0.085, cuff: '#ffd23f', hand: 0.1 });
    const wc = (() => { const out = new THREE.Color(), a = col(TOWN.woodL), b = col(TOWN.wood); return (x, y, z) => out.copy(a).lerp(b, 0.3 + 0.3 * Math.sin(y * 60 + z * 30)); })();
    for (const sd of [-1, 1]) {
      const H = sd > 0 ? TEL_HANDL : TEL_HANDR, n = sd > 0 ? 'malletL' : 'malletR', end = TEL_MAL(sd).map((d, i) => H[i] + d);
      r.bone(n, sd > 0 ? 'foreL' : 'foreR', H);
      r.on(n).fx(0, 0.25).seg([H[0] + sd * 0.01, H[1] - 0.03, H[2] - 0.07], end, 0.022, wc, 0.02, 10);
      r.fx(0, 0).add(fluffGeo(20), sd > 0 ? '#f4e2c4' : '#e2463c', end, null, sd > 0 ? 0.075 : 0.09);
      r.fx(0, 0);
      r.mark(n, end);
    }
    // the davul: a red shell with golden zigzags and a rope lacing between golden hoops, cream heads, the sun crest on the front
    r.bone('drum', 'body', TEL_DRUM);
    {
      const n = TEL_N, q = qy(n.x, n.y, n.z), qf = qz(n.x, n.y, n.z), D = new THREE.Vector3(...TEL_DRUM), Rd = 0.3, Ld = 0.36;
      const u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3().crossVectors(n, u), out = new THREE.Color(), gd = col(GOLD), dD = mixc(drum, '#8a1a2a', 0.35), tmp = new THREE.Vector3();
      const shell = (x, y, z) => {
        tmp.set(x, y, z).sub(D); const h = tmp.dot(n) / Ld, a = Math.atan2(tmp.dot(v), tmp.dot(u)), zz = Math.abs(h - 0.18 * Math.abs(((a / TAU * 12 % 1) + 1) % 1 - 0.5) * 2 + 0.09);
        return out.copy(drum).lerp(dD, smooth01(-h / 0.5) * 0.4).lerp(gd, zz < 0.05 ? 1 : 0);
      };
      r.on('drum').fx(0, 0.5).add(G.cyl(1, 1, 36, true), shell, TEL_DRUM, q, [Rd, Ld, Rd]);
      for (const sd of [-1, 1]) {
        const c = [D.x + n.x * Ld * 0.5 * sd, D.y + n.y * Ld * 0.5 * sd, D.z + n.z * Ld * 0.5 * sd];
        r.fx(0, 0.15).add(G.cyl(1, 1, 36), sd > 0 ? '#eed8b4' : '#e2c8a0', c, q, [Rd * 0.99, 0.012, Rd * 0.99]);
        r.fx(0, 2).add(G.torus(TAU, 0.1, 40), GOLD, c, qf, [Rd * 1.02, Rd * 1.02, 0.35]);
      }
      r.fx(0, 0.3);   // rope lacing: a zigzag from hoop to hoop
      for (let i = 0; i < 8; i++) {
        const a0 = i / 8 * TAU, a1 = (i + 0.5) / 8 * TAU, e0 = [], e1 = [];
        for (const [a, h, arr] of [[a0, 0.48, e0], [a1, -0.48, e1]]) { const p = D.clone().addScaledVector(n, h * Ld).addScaledVector(u, Math.cos(a) * Rd * 1.04).addScaledVector(v, Math.sin(a) * Rd * 1.04); arr.push(p.x, p.y, p.z); }
        r.seg(e0, e1, 0.008, '#fff4d8', 0.008, 5);
        const a2 = (i + 1) / 8 * TAU, p2 = D.clone().addScaledVector(n, 0.48 * Ld).addScaledVector(u, Math.cos(a2) * Rd * 1.04).addScaledVector(v, Math.sin(a2) * Rd * 1.04);
        r.seg(e1, [p2.x, p2.y, p2.z], 0.008, '#fff4d8', 0.008, 5);
      }
      const F = D.clone().addScaledVector(n, Ld * 0.5 + 0.012);
      sunCrest(r, [F.x, F.y, F.z], qf, 0.2);
      r.on('body').fx(0, 0.25, 1);   // the strap: a flat red band from the drum's upper-left hoop over the left shoulder, down the back
      const SP = [[0.2, 0.97, 0.47], [0.26, 1.09, 0.35], [0.3, 1.185, 0.1], [0.3, 1.18, -0.13], [0.26, 1.06, -0.37], [0.2, 0.9, -0.47]];
      for (let i = 0; i < SP.length - 1; i++) {
        const a = new THREE.Vector3(...SP[i]), b = new THREE.Vector3(...SP[i + 1]), d = b.clone().sub(a), mid = a.clone().add(b).multiplyScalar(0.5);
        r.add(G.rbox(2), '#e8483c', mid.toArray(), qb(d.toArray(), [mid.x, mid.y - 0.7, mid.z]), [0.075, d.length() + 0.03, 0.022]);
      }
      r.fx(0, 0);
    }
    // head: bushy sideburns + brows, rosy cheeks, a round nose
    townHead(r, HC, HR, { skin, ex: 0.115, ey: 0.03, er: 0.1, iris: '#3a2418', browCol: beard, browY: 1.32, browSide: 1, browRaise: 0.2, browT: 0.48, browW: 1.12,
      mouthY: -0.15, mouthW: 0.11, glance: 0.7, poutX: 0.12, noseK: 1.5, blushCol: '#ff6a86', heartY: 0.95, heartX: 1.15, cheekY: 1.15 });
    r.on('head').fx(0, 0.15);
    for (const sd of [-1, 1]) {
      r.add(fluffGeo(18), beard, [sd * 0.27, 1.4, 0.06], null, [0.07, 0.11, 0.08]);
      r.add(fluffGeo(14), beard, [sd * 0.24, 1.33, 0.12], null, [0.06, 0.07, 0.06]);
    }
    for (const [a, y, s] of [[2.2, 1.5, 0.1], [-2.2, 1.5, 0.1], [PI, 1.48, 0.12]]) r.add(fluffGeo(16), beard, [Math.sin(a) * HR * 0.9, y, HC[2] + Math.cos(a) * HR * 0.84], null, [s, s * 0.8, s]);
    // tall pointy hat (pushed back): a yellow roll brim, gold stars, the floppy tip with the bell on its own bones
    r.bone('hat', 'head', [0, 1.66, -0.02]); r.bone('hatTip', 'hat', [0, 1.92, -0.06]); r.bone('bell', 'hatTip', [0, 2.06, -0.2]);
    r.on('hat').push([0, 1.66, -0.02], [-0.22, 0, 0]);
    r.fx(0, 0.15, 1).add(lathe('telHat', TEL_HAT, 36, 3), vgrad(0, 0.3, [[0, mixc(hat, '#3a1a70', 0.2)], [1, hat]]), [0, 0, 0], null, [1, 1, 1]);
    r.add(G.torus(TAU, 0.3, 36), '#ffd23f', [0, 0.012, 0], [PI / 2, 0, 0], [0.29, 0.29, 0.16]);
    r.fx(0, 1);
    for (const [a, y] of [[0.3, 0.12], [-0.6, 0.18], [1.2, 0.08], [-1.5, 0.1]]) { const rr = profR('telHat', TEL_HAT)(y) + 0.004; r.add(starFlat(), GOLD, [Math.sin(a) * rr, y, Math.cos(a) * rr], [-0.3, a, 0], 0.075); }
    if (E) crown(r.fx(0, 0), [0, 0.05, 0.02], 0.9, '#22b0a4');
    r.pop();
    r.on('hatTip').fx(0, 0.15, 1).add(G.cone(16), hat, [0, 1.99, -0.12], [-0.9, 0, 0], [0.1, 0.24, 0.1]);
    r.add(G.sphere(12, 8), hat, [0, 1.935, -0.07], null, 0.1);
    r.on('bell').fx(0, 2).add(G.sphere(14, 10), GOLD, [0, 2.03, -0.22], null, [0.05, 0.055, 0.05]);
    r.add(G.torus(TAU, 0.25, 14), GOLD, [0, 1.995, -0.22], [PI / 2, 0, 0], [0.05, 0.05, 0.05]);
    r.fx(0, 0.4).add(G.sphere(8, 6), '#8a5a10', [0, 1.99, -0.2], null, 0.018).fx(0, 0);
    r.on('drum').mark('muzzle', [TEL_DRUM[0] + TEL_N.x * 0.2, TEL_DRUM[1] + TEL_N.y * 0.2, TEL_DRUM[2] + TEL_N.z * 0.2]);
    {   // where the mallet heads land on the BOOM: on the drum head, a little above its middle, left and right of the crest's nose
      const v = new THREE.Vector3(0, 1, 0).addScaledVector(TEL_N, -TEL_N.y).normalize();
      for (const sd of [-1, 1]) r.mark(sd > 0 ? 'hitL' : 'hitR', new THREE.Vector3(...TEL_DRUM).addScaledVector(TEL_N, 0.18 + 0.07).addScaledVector(v, 0.1).add(new THREE.Vector3(sd * 0.12, 0, 0)).toArray());
    }
    return { height: 1.95, glowC: col('#ffb13a'), glowK: 0.8, tex: texOf('fabric'), hide: [], mat: { rough: 0.55, ns: 0.8, sss: col('#ffd8c0').multiplyScalar(0.03) } };
  }
  function animTellal(m, dt, st, s) {
    const B = m.B;
    if (townCheer(m, st, s)) { B.hatTip.rotation.x = Math.sin(s.t * 9) * 0.3; B.bell.rotation.x = Math.sin(s.t * 12) * 0.5; return; }
    const [ph, w] = townWalk(m, dt, st, s, { rate: 4.5, stride: 0.4, arm: 0.25, bob: 0.05, hihSide: 1 });
    const br = Math.sin(s.t * 1.8 + s.ph);
    B.body.scale.set(1 + 0.012 * br, 1 + 0.015 * br, 1 + 0.012 * br);
    B.hips.rotation.z = Math.sin(ph) * 0.07 * w; B.body.rotation.z = -Math.sin(ph) * 0.03 * w;
    // mallets held up beside the drum; the floppy hat tip and its bell swing behind the head
    let aL = -0.55, aR = -0.55, fL = -0.35, fR = -0.35, zL = -0.12, zR = 0.12, lean = 0, hatK = 0, boom = 0, mal = 0, aim = 0;
    aL += B.armL.rotation.x * 0.3; aR += B.armR.rotation.x * 0.3;
    if (st.windup >= 0) {   // both mallets raised high over his head (heads up, clear of the hat), leaning back, belly out, trembling
      const u = smooth01(st.windup * 1.25);
      aL = lerp(aL, -2.6, u); aR = lerp(aR, -2.6, u); fL = lerp(fL, -0.3, u); fR = lerp(fR, -0.3, u); zL = lerp(zL, 0.12, u); zR = lerp(zR, -0.12, u);
      mal = 1.3 * u; lean = -0.2 * u; hatK = -0.35 * u;
      B.hips.position.x += Math.sin(s.t * 42) * 0.012 * smooth01((st.windup - 0.6) / 0.4);
      B.body.scale.z *= 1 + 0.05 * u;
    }
    if (st.attack >= 0) {   // BOOM right at the start: both mallets come down onto the drum head, the drum squashes, then he settles
      const a = st.attack, hit = smooth01(a / 0.07), back = smooth01((a - 0.35) / 0.65);
      boom = Math.exp(-a * 9) * Math.sin(Math.min(1, a / 0.07) * PI * 0.5 + a * 40);
      aL = aR = lerp(lerp(-2.6, -1.5, hit), -0.55, back); fL = fR = lerp(lerp(-0.3, 0, hit), -0.35, back);
      zL = lerp(lerp(0.12, -0.5, hit), -0.12, back); zR = -zL; mal = 1.3 * (1 - hit); aim = hit * (1 - back);
      lean = lerp(-0.2, 0.14, hit) * (1 - back); hatK = 0.5 * Math.exp(-a * 5) * Math.sin(a * 22);
      B.hips.position.y -= 0.06 * Math.exp(-a * 8) * hit;
    }
    B.armL.rotation.set(aL, 0, zL); B.armR.rotation.set(aR, 0, zR); B.foreL.rotation.set(fL, 0, 0); B.foreR.rotation.set(fR, 0, 0);
    B.malletL.rotation.x = B.malletR.rotation.x = mal;
    B.body.rotation.x += lean; B.head.rotation.x -= lean * 0.6;
    B.drum.scale.set(1 + 0.08 * boom, 1 - 0.08 * boom, 1 + 0.08 * boom);
    if (aim > 0.01) for (const sd of [1, -1]) aimAt(sd > 0 ? B.malletL : B.malletR, TEL_MAL(sd), m.marker(sd > 0 ? 'hitL' : 'hitR', _hw), aim);
    s.hatV = damp(s.hatV || 0, -B.head.rotation.x * 0.8 + Math.sin(ph) * 0.12 * w, 5, dt);
    B.hat.rotation.x = hatK * 0.3; B.hatTip.rotation.x = s.hatV + hatK + Math.sin(s.t * 1.7 + s.ph) * 0.06; B.hatTip.rotation.z = Math.sin(s.t * 1.3 + s.ph) * 0.08 + Math.sin(ph) * 0.1 * w;
    B.bell.rotation.x = Math.sin(s.t * 3.1 + s.ph) * 0.2 + hatK * 1.5; B.bell.rotation.z = Math.sin(s.t * 2.3) * 0.15;
  }

  // ── Sancak (the knight's arena surprise, EMODEL.sancak()): a cute tournament banner (~2.4 m) — a blue + cream candy-striped
  // pole on a little round stone foot, a golden ball on top with a red pennant, a golden crossbar and a royal-blue swallowtail
  // cloth with gold trim, two gold tassels and the smiling-sun crest on both sides. Everything rides the 'tip' bone (pivot =
  // the back edge of the foot): it tips over backwards, so lying down its front (the crest) faces the sky, and the sun smiles
  // ^ ^ (mood 2) once it lands. While it tips it also turns a quarter on its foot ('root' about the pole, st.side), so it
  // falls to the LEFT or RIGHT across the screen — tipped straight north it looked as tall as a standing one from the
  // gameplay camera. 'cloth' sways (+ a soft shader flutter), 'pennant' flaps, 'tw0..2' are the golden glints. ──
  const BAN = { w: 0.33, h: 0.92, notch: 0.22, top: 2.05, z: 0.055 };
  const SAN_FOOT = [[0, 0], [0.2, 0], [0.212, 0.018], [0.206, 0.06], [0.18, 0.085], [0.13, 0.11], [0.07, 0.125], [0, 0.13]];
  const banZ = (u, v) => 0.016 * Math.sin(u * PI * 1.4 + 0.5) * (0.4 + 0.6 * v);   // the cloth's soft ripple (u −1…1, v 0 top … 1)
  // The cloth hanging from its crossbar (top edge at y = 0, local +z = front): a rippled swallowtail, front and back sheets
  // (the back a hair behind, normals out), uv 0..1 over the width and height.
  function bannerGeo() {
    const nx = sN(10, 6), ny = sN(14, 8);
    return gx('banner@' + nx + '_' + ny, () => {
      const pos = [], uv = [], idx = [];
      for (const side of [1, -1]) {
        const o = pos.length / 3;
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
          const u = i / nx * 2 - 1, v = j / ny;
          pos.push(u * BAN.w, -v * (BAN.h - BAN.notch * (1 - Math.abs(u))), banZ(u, v) - (side < 0 ? 0.01 : 0)); uv.push(i / nx, 1 - v);
        }
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
          const a = o + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
          if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
  }
  // The ribbon wound round the banner pole (a flat band on a helix of radius 1 from y = 0 to 1, `turns` turns; scale it
  // [pole radius, length, pole radius] — the band keeps its width because it is built for the final proportions).
  function ribbonGeo(len, rad, turns) {
    const ts = sN(Math.round(turns * 14), 30), rs = sN(6, 4);
    return gx('ribbon' + len + '_' + turns + '@' + ts, () => {
      const pts = [];
      for (let i = 0; i <= turns * 16; i++) { const t = i / (turns * 16), a = t * turns * TAU; pts.push(new THREE.Vector3(Math.sin(a) * rad, t * len, Math.cos(a) * rad)); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), ts, rad * 0.5, rs, false), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {   // flatten the cord into a band lying on the pole
        const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z) || 1, k = (rad + (rr - rad) * 0.3) / rr;
        p.setXYZ(i, x * k / rad, p.getY(i) / len, z * k / rad);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  function buildSancak(r) {
    const blue = col('#292b33'), blueL = col('#4b4240'), blueD = col('#181a21'), cream = col('#4c433b'), out = new THREE.Color();
    const T = BAN.top, Z = BAN.z, CR = [0, T - 0.41, Z + banZ(0, 0.45) + 0.016];
    r.bone('tip', 'root', [0, 0, -0.2]);
    r.bone('cloth', 'tip', [0, T, Z]); r.bone('pennant', 'tip', [0.03, 2.16, 0]);
    for (let i = 0; i < 3; i++) r.bone('tw' + i, 'tip', CR);
    // foot: a little round sandstone plinth with a blue band and a golden collar round the pole; its underside (seen once it
    // has fallen) is painted blue with four golden studs
    const fg = vgrad(0, 0.13, [[0, '#332e2e'], [0.5, '#51483b'], [1, '#78664f']]);
    r.on('tip').fx(0, 0.15).add(lathe('sanFoot', SAN_FOOT, 24), (x, y, z) => y < 0.001 ? out.copy(blueD).lerp(blue, 0.3 * smooth01(Math.hypot(x, z) / 0.2)) : fg(x, y, z));
    r.fx(0, 0.35).add(G.torus(TAU, 0.3, 24), blueD, [0, 0.03, 0], [PI / 2, 0, 0], [0.2, 0.2, 0.14]);
    r.fx(0, 1);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; r.add(G.sphere(8, 6), '#ffc436', [Math.sin(a) * 0.12, 0.004, Math.cos(a) * 0.12], null, [0.026, 0.012, 0.026]); }
    r.fx(0, 1).add(G.cyl(0.85, 1, 14), '#ffc436', [0, 0.14, 0], null, [0.055, 0.05, 0.055]);
    // the pole: cream with a blue ribbon wound round it, a golden collar and ball on top
    r.fx(0, 0.4).add(G.cyl(1, 1, 12, true), cream, [0, 1.17, 0], null, [0.032, 2.06, 0.032]);
    r.fx(0, 0.5).add(ribbonGeo(2.06, 0.032, 7.5), blue, [0, 0.14, 0], null, [0.034, 2.06, 0.034]);
    r.fx(0, 1).add(G.cyl(1, 0.8, 14), '#ffc436', [0, 2.215, 0], null, [0.045, 0.04, 0.045]);
    r.add(G.sphere(18, 14), vgrad(2.24, 2.37, [[0, '#f0a820'], [1, '#ffe07a']]), [0, 2.3, 0], null, 0.068);
    // crossbar with ball ends, tied to the pole with a little golden ring
    r.add(G.torus(TAU, 0.3, 16), '#ffc436', [0, T + 0.012, 0], [PI / 2, 0, 0], [0.045, 0.045, 0.05]);
    r.seg([-BAN.w - 0.05, T + 0.012, Z - 0.012], [BAN.w + 0.05, T + 0.012, Z - 0.012], 0.016, '#ffc436', 0.016, 10);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), '#ffc436', [sd * (BAN.w + 0.07), T + 0.012, Z - 0.012], null, 0.028);
    // the red pennant on top, flapping round the pole
    r.on('pennant').fx(0, 0.2, 1, (x) => smooth01((x - 0.03) / 0.2)).add(extrude('pennant', () => {
      const sh = new THREE.Shape(); sh.moveTo(0, 0.065); sh.quadraticCurveTo(0.12, 0.05, 0.24, 0.035); sh.lineTo(0.17, 0); sh.lineTo(0.24, -0.035); sh.quadraticCurveTo(0.12, -0.05, 0, -0.065); sh.lineTo(0, 0.065); return sh;
    }, 0.01, 0.004, 6), vgrad(2.1, 2.22, [[0, '#e8303e'], [1, '#ff6070']]), [0.03, 2.16, 0]);
    // the cloth: royal blue (lighter at the top), gold trim round its edges, a gold tassel at both tips, the crest both sides
    const wob = (x, y) => 0.25 + 0.75 * smooth01((T - y) / BAN.h);
    r.on('cloth').push([0, T, Z]).fx(0, 0.12, 1, wob).uv(2.4, 3.2);
    r.add(bannerGeo(), (x, y) => out.copy(blueD).lerp(blue, smooth01((y - T + 0.95) / 0.45)).lerp(blueL, 0.35 * smooth01((y - T + 0.25) / 0.25)));
    r.uv(null).fx(0, 1, 0, wob);
    const bot = u => -(BAN.h - BAN.notch * (1 - Math.abs(u))), E = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0]];
    for (let i = 0; i < E.length - 1; i++) {
      const [u0, v0] = E[i], [u1, v1] = E[i + 1];
      r.seg([u0 * BAN.w, v0 ? bot(u0) : 0, banZ(u0, v0) - 0.005], [u1 * BAN.w, v1 ? bot(u1) : 0, banZ(u1, v1) - 0.005], 0.011, '#ffc436', 0.011, 8);
    }
    for (const sd of [-1, 1]) {
      r.add(G.sphere(10, 8), '#ffc436', [sd * BAN.w, -BAN.h, banZ(sd, 1) - 0.005], null, 0.016);
      r.fx(0, 0.2, 0, wob).add(fluffGeo(14), vgrad(T - BAN.h - 0.12, T - BAN.h, [[0, '#f2a614'], [1, '#ffd23f']]), [sd * BAN.w, -BAN.h - 0.055, banZ(sd, 1) - 0.005], null, [0.035, 0.05, 0.035]);
      r.fx(0,.3,0,wob).add(G.rbox(1),'#947e5b',[sd*.235,-.13,banZ(sd*.7,.14)+.006],[0,0,sd*.3],[.014,.13,.008]);
      r.add(G.rbox(1),'#947e5b',[sd*.235,-.13,banZ(sd*.7,.14)-.016],[0,PI,-sd*.3],[.014,.13,.008]);
    }
    r.pop();
    sunCrest(r, CR, null, 0.2, { gl: 1, moods: true, wob });
    sunCrest(r, [0, CR[1], Z + banZ(0, 0.45) - 0.026], qz(0, 0, -1), 0.2, { gl: 1, moods: true, wob });
    // golden glints (shown while it glows; they burst out of the crest when it lands)
    for (let i = 0; i < 3; i++) {
      r.on('tw' + i).fx(1, 0).add(G.octa(), hdr('#ffd66a', 2.4), CR, null, [0.026, 0.06, 0.026]);
      r.add(G.octa(), hdr('#ffd66a', 2.4), CR, [0, 0, PI / 2], [0.018, 0.04, 0.018]);
    }
    r.fx(0, 0);
    return { height: 2.4, tex: texOf('fabric'), hide: ['tw0', 'tw1', 'tw2'] };
  }

  // ── Huysuz Şövalye (the town's boss, ~3.4 m with his plume): a very grumpy chibi knight in shiny silver armour with gold trim
  // — a round helmet with its visor pushed up (the sulky "hıh!" face in the opening: bushy arched brows, a curly ginger
  // moustache), a tall rainbow plume, a royal-blue tabard with the smiling-sun crest, a red round shield hanging at his left
  // side, a red-and-white jousting lance with a big soft padded ball — on a big chunky friendly chestnut horse (big lashed
  // eyes, a flaxen mane plaited along the crest with red and blue bows, a blue/yellow checkered caparison, a silver chanfron
  // with a golden star, white socks and fluffy feathered hooves). Rig: root → horse (pivot = the hind hips: rearing, skids) →
  // four two-bone legs, hNeck → hHead → hJaw / hEars / hEyes (pupils on their own bones: looking about, cross-eyed when
  // dizzy), tail; horse → kHips (the saddle) → body → head (face bones) → helm (it comes off in the goodbye) → plume; two-bone
  // arms, the lance on the right hand (pointed in the saddle's frame, see holdDir), the horseshoe and the little horn on the
  // left. Phases and their beats: EDEF.sovalye. ──
  const SV_BODY = [[0, -1.12], [0.32, -1.08], [0.5, -0.99], [0.6, -0.86], [0.65, -0.68], [0.66, -0.36], [0.66, 0.1], [0.64, 0.42], [0.59, 0.64], [0.49, 0.8], [0.34, 0.91], [0.16, 0.97], [0, 0.98]];   // the barrel: [radius, z]
  const SV = { cy: 1.13, sx: 0.95, kz: -0.12 };   // barrel axis height, its width squash; the knight's seat (z)
  const SV_LEGS = [['FL', 1, 0.56], ['FR', -1, 0.56], ['BL', 1, -0.7], ['BR', -1, -0.7]];
  const SV_LEG = [0.48, 0.25], SV_FET = 0.17;   // hip → knee / hock, knee → fetlock; the fetlock's height over the sole (hips at 0.9)
  const SV_LEGD = [Math.atan2(0.01, 0.48), Math.atan2(0.01, 0.25)];   // (the bind pose's knee and fetlock sit 1 cm forward each: their lean)
  // the trot: stride speed at st.move 1 when GAME does not move him (test pages), the fastest stride, cadence (s.walk rad/s =
  // rate + rateV × ground speed), share of the stride a hoof is on the ground, the bounce down into each step (the knees give
  // in mid-stance), hoof lifts (front, hind)
  const SV_TROT = { v: 2.0, vMax: 3.4, rate: 7.0, rateV: 2.8, duty: 0.5, dip: 0.035, liftF: 0.15, liftB: 0.11 };
  const SV_N0 = [0, 1.38, 0.66], SV_N1 = [0, 1.92, 1.1];   // the horse's neck (base, top)
  const SV_HH = [0, 2.2, 1.3], SV_HHR = 0.37, SV_MUZ = [0, 1.97, 1.66], SV_MUZA = [0.27, 0.18, 0.31];   // horse cranium, muzzle
  const SV_KHC = [0, 2.68, -0.1], SV_KHR = 0.36, SV_KTILT = 0.3;   // the knight's head (centre, radius, face tilt)
  const SV_HANDR = [-0.4, 1.93, 0.18], SV_HANDL = [0.54, 1.95, -0.06];   // the lance hand, the left hand (resting on the shield's rim)
  const SV_LANCE = { butt: -0.42, grip: 0.1, vamp: 0.36, tip: 2.17, ball: 0.16 };   // along the lance, from the hand
  const SV_REST = { psi: -0.55, phi: 1.12 };   // the lance at rest: out to his right, raised 64° (clear of his face)
  // left-arm poses [x, y, z, forearm] (short chibi arms: the hand reaches about shoulder height): on the reins, holding the horn
  // to his lips (with the horn's length), loose while dizzy, raised high waving his helmet
  const SV_LREIN = [-1.0, -0.6, -0.5, -0.3], SV_LHORN = [-1.4, -0.9, -0.6, -1.2], SV_LDIZZY = [0.25, 0, 0.55, 0.35], SV_LWAVE = [0, -0.2, 1.7, 0.6];
  // Round 6: arms crossed in a huff (left arm [x, y, z, forearm]; the right one [x, y, z, forearm] crosses over it, lance tucked
  // out to his right), polishing his visor (the left hand up at the helmet's brim)
  const SV_LCROSS = [-0.1, -1.6, 0, -1.1], SV_RCROSS = [-0.05, 0.9, 0, -0.9], SV_LPOLISH = [-2.25, -0.1, -1.1, -0.9];   // (solved for the hand spots)
  const SV_CAP = { z0: -0.82, z1: 0.58, k: 1.05, hem: 0.46, S: 6, T: 14, dag: 0.075 };
  // The caparison's drape: s 0..1 along the body (back → front), l = the length across from the left hem (0 … L): up the left
  // side, over the barrel's top arc, down the right side; a hem of rounded tabs, one per square, flaring out a little.
  function capDrape() {
    const C = SV_CAP, R = SV_BODY[6][0] * C.k, ax = R * SV.sx, H = SV.cy - C.hem, A = PI * Math.sqrt((ax * ax + R * R) / 2), L = 2 * H + A, cw = L / C.T;
    const P = (s, l, out) => {
      if (l <= H || l >= L - H) {
        const sd = l <= H ? 1 : -1, h = l <= H ? l : L - l, tab = C.dag * Math.pow(Math.abs(Math.sin(PI * s * C.S)), 0.7) * Math.max(0, 1 - h / cw);
        out[0] = sd * ax * (1 + 0.1 * (1 - h / H)); out[1] = C.hem + h - tab;
      } else { const b = (l - H) / A * PI; out[0] = ax * Math.cos(b); out[1] = SV.cy + R * Math.sin(b); }
      out[2] = lerp(C.z0, C.z1, s);
      return out;
    };
    return { P, L };
  }
  // One geometry per colour (par 0 / 1: the squares stay crisp), normals from the smooth drape so both shade as one cloth. The
  // cloth runs straight along the body, so a square needs extra rows only across the top arc and extra columns only for a tab.
  function capGeo(par) {
    return gx('svCap' + par, () => {
      const { P, L } = capDrape(), C = SV_CAP, H = SV.cy - C.hem, e = 1e-3, pos = [], nor = [], uv = [], idx = [], a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
      for (let i = 0; i < C.S; i++) for (let j = 0; j < C.T; j++) {
        if (((i + j) & 1) !== par) continue;
        const o = pos.length / 3, hem = j === 0 || j === C.T - 1, NS = hem ? 3 : 1, NT = (j + 1) / C.T * L <= H || j / C.T * L >= L - H ? 1 : 2;
        for (let v = 0; v <= NT; v++) for (let u = 0; u <= NS; u++) {
          const s = (i + u / NS) / C.S, l = (j + v / NT) / C.T * L;
          P(s, l, a); pos.push(a[0], a[1], a[2]); uv.push(s * 2.7, l * 2);
          P(Math.min(1, s + e), l, b); P(Math.max(0, s - e), l, c); const sx = b[0] - c[0], sy = b[1] - c[1], sz = b[2] - c[2];
          P(s, Math.min(L, l + e), b); P(s, Math.max(0, l - e), c); const tx = b[0] - c[0], ty = b[1] - c[1], tz = b[2] - c[2];
          const nx = sy * tz - sz * ty, ny = sz * tx - sx * tz, nz = sx * ty - sy * tx;
          const k = (nx * a[0] + ny * Math.max(0, a[1] - SV.cy) < 0 ? -1 : 1) / (Math.hypot(nx, ny, nz) || 1);
          nor.push(nx * k, ny * k, nz * k);
        }
        for (let v = 0; v < NT; v++) for (let u = 0; u < NS; u++) { const q = o + v * (NS + 1) + u; idx.push(q, q + NS + 1, q + 1, q + 1, q + NS + 1, q + NS + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      return g;
    });
  }
  function barrelGeo() {
    const sg = sN(40, 16);
    return gx('svBarrel@' + sg, () => {
      const v = new THREE.SplineCurve(SV_BODY.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(SV_BODY.length * 2);
      v.forEach(q => { q.x = Math.max(0, q.x); });
      return seamNormals(new THREE.LatheGeometry(v, sg).rotateX(PI / 2));   // (the lathe's axis turned to +z: rump → chest)
    });
  }
  // The horse's big friendly eye in its eye frame (z = out of the head, +x = the model's left): white, a big warm brown iris and
  // pupil with two catchlights on the pupil bone `pup` (made here, pivoting at the eye's centre: it looks about, or crosses),
  // a dark lid line along the top and three long lashes curling out at the outer corner (sd: side); happy: ^ with its lashes.
  function horseEye(r, sd, er, pup) {
    r.mood = 1;
    r.on('hEyes').fx(0, 1).add(G.sphere(24, 16), '#fbfbff', [0, 0, 0], null, [er, er * 1.12, er * 0.62]);
    r.bone(pup, 'hEyes', new THREE.Vector3().applyMatrix4(r.k.top()).toArray());
    r.add(G.sphere(20, 14), '#7a4420', [0, -er * 0.04, er * 0.4], null, [er * 0.7, er * 0.78, er * 0.3]);
    r.add(G.sphere(16, 12), '#1a0c10', [0, -er * 0.05, er * 0.5], null, [er * 0.42, er * 0.5, er * 0.23]);
    r.fx(1, 0).add(G.sphere(10, 8), hdr('#ffffff', 1.7), [-sd * er * 0.22, er * 0.22, er * 0.64], null, er * 0.2);
    r.add(G.sphere(8, 6), hdr('#ffffff', 1.4), [sd * er * 0.18, -er * 0.24, er * 0.6], null, er * 0.09);
    r.on('hEyes').fx(0, 0.3).add(G.torus(PI, 0.13, 16), DARK, [0, 0, er * 0.04], null, [er * 1.03, er * 1.14, er * 0.86]);
    const lash = (m2) => { for (let i = 0; i < 3; i++) {
      const a = 0.45 + i * 0.36, bx = sd * er * Math.sin(a) * (m2 ? 0.95 : 1.02), by = m2 ? er * (-0.2 + 0.5 * Math.cos(a)) : er * 1.12 * Math.cos(a);
      cone(r, [bx, by, er * 0.22], [sd * Math.sin(a) * 1.3, Math.cos(a) + 0.35, 0.35], er * (0.62 - i * 0.08), er * 0.085, DARK, 5);
    } };
    lash(false);
    r.mood = 2; eyeClosed(r, { er: er * 1.05 }); lash(true);
    r.mood = 0; r.fx(0, 0);
  }
  // Point bone b's rest axis a0 along the direction d given in the frame of its ancestor f (e.g. the saddle), whatever the
  // bones in between do (the lance keeps the angle the animation asks for while the arm swings it).
  const _hq = new THREE.Quaternion(), _hv = new THREE.Vector3(), _lv = new THREE.Vector3(), SV_Y = new THREE.Vector3(0, 1, 0);
  function holdDir(b, a0, d, f) {
    f.getWorldQuaternion(_uq); b.parent.getWorldQuaternion(_hq);
    _hv.copy(d).applyQuaternion(_uq).applyQuaternion(_hq.invert()).normalize();
    b.quaternion.setFromUnitVectors(a0, _hv);
  }
  // Turn bone b so its local +y points along the world direction y and its +z as near as it can to the world direction z.
  const _hm = new THREE.Matrix4(), _hx = new THREE.Vector3(), _hy = new THREE.Vector3(), _hz = new THREE.Vector3();
  function holdBasis(b, y, z) {
    _hy.copy(y).normalize(); _hx.crossVectors(_hy, z).normalize(); _hz.crossVectors(_hx, _hy);
    b.parent.getWorldQuaternion(_hq);
    b.quaternion.setFromRotationMatrix(_hm.makeBasis(_hx, _hy, _hz)).premultiply(_hq.invert());
  }
  const svDir = (psi, phi, out) => out.set(Math.sin(psi) * Math.cos(phi), Math.sin(phi), Math.cos(psi) * Math.cos(phi));
  // Keyframes: the value at t between times T (ascending) and values V, eased key to key.
  function kf(t, T, V) {
    if (t <= T[0]) return V[0];
    for (let i = 1; i < T.length; i++) if (t < T[i]) return lerp(V[i - 1], V[i], smooth01((t - T[i - 1]) / (T[i] - T[i - 1])));
    return V[V.length - 1];
  }
  // Part of a unit sphere with its own grid (w around, h rows over its polar span; the shared sphPart grid is for big bodies).
  const svPart = (key, w, h, p0, pL, t0, tL) => { const ww = sN(w, 8), hh = sN(h, 3); return gx('svP' + key + '@' + ww + '_' + hh, () => new THREE.SphereGeometry(1, ww, hh, p0, pL, t0, tL)); };
  // The same part seen from the inside (winding and normals flipped): the helmet's felt lining, so the lifted helmet in his
  // waving hand reads as a bowl instead of a see-through wire of gold trims (one skinned mesh, one material: no DoubleSide).
  const svIn = (key, w, h, p0, pL, t0, tL) => { const ww = sN(w, 8), hh = sN(h, 3); return gx('svI' + key + '@' + ww + '_' + hh, () => {
    const g = new THREE.SphereGeometry(1, ww, hh, p0, pL, t0, tL), I = g.index.array, N = g.attributes.normal.array;
    for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; }
    for (let i = 0; i < N.length; i++) N[i] = -N[i];
    return g; }); };
  function buildSovalye(r) {
    r.ownHurt = true;   // (animSovalye: the knight jolts back in the saddle, the horse tosses its head — the hooves stay put)
    const coat = col('#d98a4c'), coatL = col('#f2b67e'), coatD = col('#a8602e'), muz = col('#f7d8bc'), muzD = col('#e8b89a'), sock = '#fff7ee';
    const mane = col('#fff0c8'), maneD = col('#edcf90'), steel = '#e4ebf6', steelD = '#aab6cc', blue = col('#2d5fe0'), blueL = col('#5a8cf4');
    const red = '#e8383e', strap = '#d63a3e', skin = '#f7c9a2', ginger = '#c0602a', gingerD = '#96401a', KZ = SV.kz;
    const K = (x, y, z) => [x, y, z + KZ];
    const N0 = new THREE.Vector3(...SV_N0), N1 = new THREE.Vector3(...SV_N1);
    // ── bones ──
    r.bone('horse', 'root', [0, 0.9, -0.7]);
    for (const [n, sd, z] of SV_LEGS) { r.bone('leg' + n, 'horse', [0.32 * sd, 0.9, z]); r.bone('shin' + n, 'leg' + n, [0.32 * sd, 0.42, z + 0.01]); r.bone('hoof' + n, 'shin' + n, [0.32 * sd, SV_FET, z + 0.02]); }
    r.bone('hNeck', 'horse', SV_N0); r.bone('hHead', 'hNeck', [0, 2.02, 1.16]); r.bone('hJaw', 'hHead', [0, 1.9, 1.4]);
    r.bone('hEarL', 'hHead', [0.17, 2.46, 1.2]); r.bone('hEarR', 'hHead', [-0.17, 2.46, 1.2]);
    r.bone('hEyes', 'hHead', [0, 2.23, 1.6]); r.bone('hTongue', 'hJaw', [0.11, 1.8, 1.8]);
    r.bone('tail0', 'horse', [0, 1.58, -1.06]); r.bone('tail1', 'tail0', [0, 1.2, -1.36]);
    r.bone('kHips', 'horse', K(0, 1.78, 0)); r.bone('body', 'kHips', K(0, 1.86, 0)); r.bone('head', 'body', K(0, 2.36, 0));
    r.bone('kLegL', 'kHips', K(0.14, 1.84, 0)); r.bone('kLegR', 'kHips', K(-0.14, 1.84, 0));
    r.bone('helm', 'head', SV_KHC); r.bone('stars', 'head', [0, 3.12, SV_KHC[2]]);
    r.bone('armL', 'body', K(0.28, 2.23, 0)); r.bone('foreL', 'armL', K(0.46, 2.06, -0.03));
    r.bone('armR', 'body', K(-0.28, 2.23, 0)); r.bone('foreR', 'armR', K(-0.42, 2.03, 0.06));
    r.bone('lance', 'foreR', SV_HANDR); r.bone('shoe', 'foreL', SV_HANDL); r.bone('hornH', 'foreL', SV_HANDL); r.bone('hornB', 'kHips', K(0.3, 1.84, -0.1));

    // ── the horse ──
    r.on('horse').fx(0, 0.15).add(barrelGeo(), vgrad(0.47, 1.79, [[0, coatD], [0.4, coat], [1, coatL]]), [0, SV.cy, 0], null, [SV.sx, 1, 1]);
    for (const [n, sd, z] of SV_LEGS) {   // chunky legs: coat to the knee, a white sock, a fluffy white feather over a little hoof
      const x = 0.32 * sd, hind = z < 0;
      r.on('leg' + n).fx(0, 0.15).seg([x, 1.0, z], [x, 0.42, z + 0.01], hind ? 0.22 : 0.19, coat, 0.155, 12).add(G.sphere(14, 10), coat, [x, 0.42, z + 0.01], null, 0.158);
      r.on('shin' + n).seg([x, 0.42, z + 0.01], [x, 0.17, z + 0.02], 0.145, vgrad(0.2, 0.42, [[0, sock], [0.5, sock], [1, coat]]), 0.14, 12);
      r.on('hoof' + n).fx(0, 0.05).add(fluffGeo(18), vgrad(0.05, 0.34, [[0, '#f2eae2'], [1, '#ffffff']]), [x, 0.18, z + 0.03], null, [0.23, 0.16, 0.24]);   // (the fetlock: the trot keeps the hoof flat)
      r.fx(0, 0.4).add(G.cyl(0.92, 1, 14), '#6a4c3c', [x, 0.045, z + 0.05], null, [0.17, 0.09, 0.18]);
      r.fx(0, 0);
    }
    // the checkered caparison (+ a golden tassel at each tab), the red saddle with golden edges
    r.on('horse').fx(0, 0.1, 1).add(capGeo(0), '#3d7cf0').add(capGeo(1), '#ffd23f');
    r.fx(0, 1);
    { const { P, L } = capDrape(), q = [0, 0, 0];
      for (let i = 0; i < SV_CAP.S; i++) for (const l of [0, L]) { P((i + 0.5) / SV_CAP.S, l, q); r.add(G.sphere(8, 6), GOLD, [q[0] * 1.01, q[1] - 0.02, q[2]], null, 0.034); } }
    r.fx(0, 0.35).add(G.sphere(20, 10), red, K(0, 1.775, 0), null, [0.3, 0.07, 0.36]);
    r.add(G.sphere(16, 10), red, K(0, 1.86, -0.33), [0.35, 0, 0], [0.25, 0.11, 0.07]).add(G.sphere(12, 8), red, K(0, 1.83, 0.33), null, [0.12, 0.08, 0.07]);
    r.fx(0, 2).add(G.torus(TAU, 0.16, 32), GOLD, K(0, 1.775, 0), [PI / 2, 0, 0], [0.3, 0.36, 0.25]).add(G.sphere(10, 8), GOLD, K(0, 1.9, 0.34), null, 0.04);
    // a red breast collar round the chest with golden studs and a golden star medallion
    { const a = PI * 1.02, cz = 0.34, rz = 0.66;
      r.fx(0, 0.3).add(G.torus(a, 0.06, 28), strap, [0, 1.02, cz], [PI / 2, 0, PI / 2 - a / 2], [0.645, rz, 0.6]);
      r.fx(0, 2);
      for (const sd of [-1, 1]) for (const f of [0.35, 0.65]) { const b = sd * f * a / 2; r.add(G.sphere(8, 6), GOLD, [Math.sin(b) * 0.66, 1.02, cz + Math.cos(b) * rz * 1.02], null, 0.024); }
      r.add(G.cyl(1, 1, 20), GOLD, [0, 1.02, cz + rz + 0.012], [PI / 2, 0, 0], [0.085, 0.025, 0.085]);
      r.fx(0, 1).add(starFlat(), '#fff2a8', [0, 1.02, cz + rz + 0.03], null, [0.1, 0.1, 0.25]);
      r.fx(0, 0); }
    // neck and head: a round forehead, a long soft pale muzzle with big nostrils, round cheeks
    r.on('hNeck').fx(0, 0.15).seg([0, 1.34, 0.64], SV_N1, 0.33, coat, 0.26, 16);
    r.add(G.sphere(20, 14), coat, [0, 1.4, 0.68], null, [0.32, 0.36, 0.34]);
    r.on('hHead').add(G.sphere(28, 20), vgrad(1.85, 2.57, [[0, coat], [1, coatL]]), SV_HH, null, [SV_HHR, SV_HHR * 0.97, SV_HHR * 1.04]);
    for (const sd of [-1, 1]) r.add(G.sphere(16, 10), coat, [sd * 0.22, 2.02, 1.38], null, [0.16, 0.15, 0.18]);
    r.add(G.sphere(16, 12), mixc(coat, coatL, 0.3), [0, 2.16, 1.62], [0.75, 0, 0], [0.2, 0.2, 0.26]);   // the nose bridge (forehead → muzzle)
    r.fx(0, 0.25).add(G.sphere(24, 16), vgrad(1.8, 2.15, [[0, muzD], [0.5, muz], [1, mixc(muz, coatL, 0.4)]]), SV_MUZ, null, SV_MUZA);
    r.fx(0, 0.4);
    for (const sd of [-1, 1]) { const [p, n] = onEll(SV_MUZ, SV_MUZA, 1.08, sd * 0.52); r.add(G.sphere(12, 8), '#b04a5a', p, qz(...n, sd * 0.6), [0.055, 0.03, 0.016]); }
    r.fx(0, 0.5).add(G.sphere(12, 8), '#9a3a4e', [0, 1.86, 1.62], null, [0.19, 0.07, 0.24]);   // the mouth inside (seen while it neighs)
    r.fx(0, 0.8); for (const sd of [-1, 1]) r.add(G.box(), '#ffffff', [sd * 0.045, 1.855, 1.81], null, [0.075, 0.07, 0.03]);
    r.on('hJaw').fx(0, 0.25).add(G.sphere(18, 12), muz, [0, 1.83, 1.62], null, [0.21, 0.08, 0.25]).add(G.sphere(12, 8), muzD, [0, 1.79, 1.7], null, [0.12, 0.06, 0.13]);
    r.on('hTongue').fx(0, 0.6).add(G.sphere(12, 8), '#ff6f9a', [0.11, 1.8, 1.82], [0.5, 0, -0.5], [0.065, 0.03, 0.085]);
    r.on('hHead');
    // friendly mouth: a gentle smile (grumpy mood too — the horse is never cross), a big open smile with buck teeth when happy
    { const [p, n] = onEll(SV_MUZ, SV_MUZA, 2.0, 0), q = qz(...n);
      r.mood = 1; r.fx(0, 0.3).add(G.torus(PI * 0.55, 0.22, 14), '#6a2a34', p, q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -PI / 2 - PI * 0.275))), [0.1, 0.065, 0.03]);
      r.mood = 2; r.push(p, q); smile(r, 0.17, { mouthIn: '#7a2440', buck: true, buckW: 0.2, buckH: 0.24 }); r.pop();
      r.mood = 0; }
    for (const sd of [-1, 1]) { r.push([sd * 0.27, 2.06, 1.5], qz(sd * 0.75, 0.1, 0.66)); blush(r, 0.12, { blushCol: '#ff8aa0' }); r.pop(); }
    r.mark('mouth', [0, 1.88, 1.95]);   // (the horse's mouth: where GAME's carrot goes in the bonus game)
    // ears (pink inside), the forelock plait with a red bow, the silver chanfron with its golden star
    for (const sd of [-1, 1]) {
      const q = qb([sd * 0.35, 1, 0.05], [sd * 0.2, 0, 1]);
      r.on(sd > 0 ? 'hEarL' : 'hEarR').fx(0, 0.15).add(lathe('flame', FLAME_P, 12, 0), coat, [sd * 0.17, 2.42, 1.19], q, [0.24, 0.32, 0.16]);
      r.add(lathe('flame', FLAME_P, 12, 0), '#ffc8c8', [sd * 0.176, 2.45, 1.222], q, [0.14, 0.24, 0.07]);
    }
    r.on('hHead').fx(0, 0.2);
    for (const [y, z, k] of [[2.56, 1.24, 1], [2.49, 1.38, 0.9], [2.42, 1.5, 0.75]]) r.add(G.sphere(12, 8), k < 0.9 ? maneD : mane, [0, y, z], [0.5 * (k - 0.9), 0, 0.4 * (k - 0.85)], [0.08 * k, 0.075 * k, 0.075 * k]);
    const bow = (p, q, c, s = 1) => {   // a ribbon bow (two loops, a knot, two tails) in frame q at p
      r.push(p, q, s).fx(0, 0.3, 1);
      for (const sd of [-1, 1]) { r.add(G.sphere(10, 8), c, [sd * 0.055, 0.012, 0], [0, 0, sd * 0.35], [0.055, 0.034, 0.022]); r.add(G.sphere(8, 6), c, [sd * 0.03, -0.045, 0], [0, 0, sd * 0.4], [0.014, 0.04, 0.012]); }
      r.add(G.sphere(8, 6), c, [0, 0, 0.008], null, 0.024).pop().fx(0, 0);
    };
    bow([0, 2.62, 1.2], qz(0, 0.5, 0.86), '#ff4d5e', 1.1);
    // (the chanfron: a narrow silver plate down the nose bridge, a golden star at its top between the eyes)
    const cq = qb([0, 0.74, -0.67], [0, 0.67, 0.74]), cn = [0, 0.67, 0.74];
    r.fx(0, 2).add(G.sphere(16, 10), steel, [0, 2.17, 1.83], cq, [0.07, 0.17, 0.028]);
    r.add(G.torus(TAU, 0.14, 26), GOLD, [0, 2.17, 1.835], qz(...cn), [0.072, 0.172, 0.16]);
    r.fx(0, 1).add(starFlat(), '#ffd23f', [0, 2.27, 1.775], qz(...cn), [0.13, 0.13, 0.28]);
    // bridle: a red noseband, cheek straps, golden bit rings
    r.fx(0, 0.3).add(G.torus(TAU, 0.1, 28), strap, [0, 1.99, 1.64], [0.1, 0, 0], [0.285, 0.2, 0.3]);
    for (const sd of [-1, 1]) {
      r.seg([sd * 0.27, 2.0, 1.58], [sd * 0.34, 2.36, 1.22], 0.022, strap, 0.022, 6);
      r.fx(0, 2).add(G.torus(TAU, 0.25, 12), GOLD, [sd * 0.265, 1.89, 1.68], [0, PI / 2, 0], 0.035).fx(0, 0.3);
    }
    // big friendly eyes with lashes (a little higher and further forward than a real horse's: the camera looks down on it)
    r.push(SV_HH, [-0.16, 0, 0]);
    for (const sd of [-1, 1]) { const [p, q] = onSphere(sd * 0.22, 0.04, SV_HHR, 0.035); r.push(p, q); horseEye(r, sd, 0.118, sd > 0 ? 'hPupL' : 'hPupR'); r.pop(); }
    r.pop();
    // the flaxen mane plaited along the crest, a bow at two of the plaits
    r.on('hNeck');
    { const d = N1.clone().sub(N0).normalize(), up = new THREE.Vector3(0, d.z, -d.y);
      for (let i = 0; i < 9; i++) {
        const u = lerp(0.18, 1.16, i / 8), c = N0.clone().lerp(N1, u).addScaledVector(up, lerp(0.33, 0.26, Math.min(1, u)) + 0.035), dd = d.clone().add(new THREE.Vector3(i & 1 ? 0.55 : -0.55, 0, 0)).normalize();
        r.fx(0, 0.25).add(G.sphere(12, 8), i & 1 ? maneD : mane, c.toArray(), qb(dd.toArray(), up.toArray()), [0.075, 0.105, 0.065]);
        if (i === 2 || i === 6) bow(c.clone().addScaledVector(up, 0.075).toArray(), qb(d.toArray(), up.toArray()).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2, 0, 0))), i === 2 ? '#4aa8ff' : '#ff4d5e', 0.95);
      }
      r.fx(0, 0); }
    // the tail: a red bow at the root, a long flaxen tail (a slim root and a big soft teardrop tuft, fluffy at its tip)
    r.on('tail0'); bow([0, 1.62, -1.1], qz(0, 0.3, -1), '#ff4d5e', 1.15);
    r.fx(0, 0.1).add(lathe('flame', FLAME_P, 12, 2), vgrad(1.2, 1.62, [[0, maneD], [1, mane]]), [0, 1.2, -1.34], qy(0, 0.8, 0.6), [0.34, 0.46, 0.3]);
    r.on('tail1').add(lathe('flame', FLAME_P, 12, 2), vgrad(0.6, 1.25, [[0, maneD], [0.5, mane], [1, mane]]), [0, 0.64, -1.4], qy(0, 1, 0.08), [0.52, 0.66, 0.44]);
    for (const [x, y, z, s2] of [[0.05, 0.7, -1.38, 0.09], [-0.06, 0.72, -1.43, 0.085], [0, 0.66, -1.42, 0.08]]) r.add(fluffGeo(12), mane, [x, y, z], null, s2);
    r.fx(0, 0);

    // ── the knight ──
    // legs sticking out over the round horse: cuisses, gold-rimmed knee cops, greaves, rounded sabatons
    for (const sd of [-1, 1]) {
      const kn = K(0.5 * sd, 1.72, 0.16), an = K(0.76 * sd, 1.33, 0.2);
      r.on(sd > 0 ? 'kLegL' : 'kLegR').fx(0, 2).seg(K(0.14 * sd, 1.84, 0), kn, 0.1, steel, 0.09, 12).add(G.sphere(14, 10), steel, kn, null, 0.1);
      r.add(G.torus(TAU, 0.14, 18), GOLD, [kn[0] + sd * 0.02, kn[1] + 0.01, kn[2] + 0.07], qz(sd * 0.35, 0.3, 0.9), 0.07);
      r.seg(kn, an, 0.085, steel, 0.075, 10).add(G.torus(TAU, 0.22, 14), GOLD, an, [0.1, 0, sd * 0.45], [0.08, 0.08, 0.06]);
      r.add(G.sphere(14, 10), vgrad(1.18, 1.34, [[0, steelD], [1, steel]]), [an[0] + sd * 0.01, 1.27, an[2] + 0.09], [0.1, 0, 0], [0.09, 0.075, 0.16]);
      r.fx(0, 0);
    }
    // torso: the breastplate, a royal-blue tabard (front and back) with the sun crest, a belt, the tabard skirt over the saddle
    const KT = [[0, 1.78], [0.25, 1.78], [0.285, 1.85], [0.305, 1.95], [0.31, 2.06], [0.295, 2.16], [0.255, 2.25], [0.17, 2.32], [0.09, 2.36], [0, 2.37]];
    r.on('body').push([0, 0, KZ]);
    r.fx(0, 2).add(lathe('svChest', KT, 26, 2), vgrad(1.8, 2.36, [[0, steelD], [0.5, steel], [1, steel]]));
    const tabP = KT.slice(1, 7).map(p => [p[0] + 0.016, p[1]]), tabC = vgrad(1.8, 2.25, [[0, mixc(blue, '#1a3a9a', 0.3)], [1, blueL]]);
    const arc = (key, pts, a0, aL) => gx('svArc' + key + '@' + sN(18, 8), () => seamNormals(new THREE.LatheGeometry(new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(pts.length * 2), sN(18, 8), a0, aL)));
    r.fx(0, 0.1, 1).add(arc('tabF', tabP, -0.95, 1.9), tabC).add(arc('tabB', tabP, PI - 0.85, 1.7), tabC);
    const skP = [[0.3, 1.66], [0.3, 1.72], [0.295, 1.8], [0.29, 1.87]];
    r.add(arc('skF', skP.map(p => [p[0] + (1.87 - p[1]) * 0.5, p[1]]), -0.75, 1.5), tabC).add(arc('skB', skP.map(p => [p[0] + (1.87 - p[1]) * 0.35, p[1]]), PI - 0.8, 1.6), tabC);
    r.fx(0, 2);
    for (const [a0, aL, rr, y] of [[-0.75, 1.5, 0.4, 1.665], [PI - 0.8, 1.6, 0.355, 1.665]]) r.add(G.torus(aL, 0.07, 18), GOLD, [0, y, 0], [PI / 2, 0, PI / 2 - a0 - aL], rr);
    r.fx(0, 0.35).add(G.torus(TAU, 0.12, 32), '#8a4a26', [0, 1.87, 0], [PI / 2, 0, 0], 0.3).fx(0, 2).add(G.rbox(2), GOLD, [0, 1.87, 0.31], null, [0.08, 0.06, 0.03]);
    sunCrest(r, [0, 2.05, 0.332], qz(0, 0.12, 1), 0.13, { gl: 2 });
    r.pop();
    // pauldrons and gorget (gold rims)
    r.fx(0, 2);
    for (const sd of [-1, 1]) { r.add(G.sphere(16, 10), steel, K(0.28 * sd, 2.24, 0), [0, 0, -sd * 0.3], [0.15, 0.12, 0.16]); r.add(G.torus(TAU, 0.12, 20), GOLD, K(0.3 * sd, 2.17, 0), [PI / 2, 0, -sd * 0.3], [0.15, 0.16, 0.2]); }
    r.add(G.cyl(0.9, 1, 16), steel, K(0, 2.35, 0), null, [0.14, 0.07, 0.14]).add(G.torus(TAU, 0.14, 20), GOLD, K(0, 2.32, 0), [PI / 2, 0, 0], 0.145);
    // short armoured arms with round mittens: the right one holds the lance, the left one rests on the shield
    for (const sd of [-1, 1]) {
      const n = sd > 0 ? 'L' : 'R', sh = K(0.28 * sd, 2.23, 0), el = sd > 0 ? K(0.46, 2.06, -0.03) : K(-0.42, 2.03, 0.06), hd = sd > 0 ? SV_HANDL : SV_HANDR;
      r.on('arm' + n).fx(0, 2).seg(sh, el, 0.08, steel, 0.075, 10);
      r.on('fore' + n).add(G.sphere(12, 8), steel, el, null, 0.088).seg(el, hd, 0.075, steel, 0.068, 10);
      const d = new THREE.Vector3(...hd).sub(new THREE.Vector3(...el)).normalize(), cf = [hd[0] - d.x * 0.07, hd[1] - d.y * 0.07, hd[2] - d.z * 0.07];
      r.add(G.cyl(1.25, 1, 12, true), steel, cf, qy(d.x, d.y, d.z), [0.075, 0.06, 0.075]).add(G.torus(TAU, 0.16, 14), GOLD, cf, qz(d.x, d.y, d.z), 0.08);
      mitten(r, hd, 0.09, steel, sd);
      r.fx(0, 0);
    }
    // the red shield with its golden rim and the smiling sun, hanging at his left side over his knee (turned out to the
    // front-left; his left hand rests on its rim and is free to throw)
    r.on('kHips');
    { const n = new THREE.Vector3(0.85, 0.15, 0.5).normalize(), C = K(0.64, 1.7, 0.1), Rs = 0.25;
      r.fx(0, 0.35).add(G.cyl(1, 1, 26), vgrad(1.45, 1.95, [[0, '#c8242e'], [1, '#ff5a5a']]), C, qy(n.x, n.y, n.z), [Rs, 0.035, Rs]);
      r.fx(0, 2).add(G.torus(TAU, 0.13, 32), GOLD, C, qz(n.x, n.y, n.z), [Rs * 1.02, Rs * 1.02, 0.3]);
      sunCrest(r, [C[0] + n.x * 0.022, C[1] + n.y * 0.022, C[2] + n.z * 0.022], qz(n.x, n.y, n.z), Rs * 0.64, { gl: 2 });
      r.fx(0, 0); }
    // the lance (built upright from the hand; holdDir points it): a leather grip, a silver vamplate, a white shaft with a red
    // spiral stripe, a big soft red padded ball with a white seam
    r.on('lance');
    { const [hx, hy, hz] = SV_HANDR, L = SV_LANCE, at = y => [hx, hy + y, hz];
      r.fx(0, 0.3).seg(at(L.butt), at(L.grip), 0.036, '#8a3a2a', 0.04, 10).add(G.sphere(8, 6), GOLD, at(L.butt), null, 0.05);
      r.fx(0, 2); cone(r, at(L.grip), [0, 1, 0], L.vamp - L.grip, 0.17, steel, 18);
      r.add(G.torus(TAU, 0.1, 24), GOLD, at(L.grip), [PI / 2, 0, 0], 0.17);
      r.fx(0, 0.35).seg(at(L.vamp - 0.05), at(L.tip - 0.12), 0.058, '#fff6ee', 0.03, 12);
      r.add(lanceStripeGeo(), '#ff4455', at(L.vamp - 0.02));
      r.fx(0, 2).add(G.cyl(1, 1.2, 12), GOLD, at(L.tip - L.ball - 0.02), null, [0.04, 0.05, 0.04]);
      r.fx(0, 0.12).add(G.sphere(20, 14), vgrad(hy + L.tip - L.ball, hy + L.tip + L.ball, [[0, '#b81e34'], [1, '#e8404e']]), at(L.tip), null, L.ball);
      r.fx(0, 0.3).add(G.torus(TAU, 0.08, 28), '#fff6ee', at(L.tip), [PI / 2, 0, 0], L.ball * 1.005);
      r.fx(0, 0);
      r.mark('lance', at(L.tip)); }
    // the horseshoe in the left hand (shown while he tosses), the little golden horn (at his belt, in his hand to blow it)
    r.on('shoe').fx(0, 2).add(G.torus(PI * 1.45, 0.27, 14), '#f2f7ff', [SV_HANDL[0] + 0.02, SV_HANDL[1] + 0.12, SV_HANDL[2] + 0.06], [0, 0.3, -PI / 2 + PI * 0.725 + PI], [0.135, 0.14, 0.1]);
    r.fx(1, 0).add(G.octa(), hdr('#ffffff', 2.2), [SV_HANDL[0] + 0.1, SV_HANDL[1] + 0.24, SV_HANDL[2] + 0.1], null, [0.02, 0.05, 0.02]);
    r.fx(0, 0).mark('muzzle', [SV_HANDL[0] + 0.02, SV_HANDL[1] + 0.06, SV_HANDL[2] + 0.06]);
    const hornAt = (b, p, dir, len = 0.26) => {   // mouthpiece at p, the bell at the far end along dir
      const d = new THREE.Vector3(...dir).normalize(), e = [p[0] + d.x * len, p[1] + d.y * len, p[2] + d.z * len];
      r.on(b).fx(0, 2).seg(p, e, 0.018, GOLD, 0.03, 8);
      cone(r, [p[0] + d.x * (len - 0.08), p[1] + d.y * (len - 0.08), p[2] + d.z * (len - 0.08)], dir, 0.12, 0.075, GOLD, 14);   // (the flared bell)
      r.add(G.torus(TAU, 0.14, 16), '#ffe08a', e, qz(d.x, d.y, d.z), 0.07);
      r.fx(0, 0.3).add(G.sphere(8, 6), red, [p[0] + d.x * len * 0.4, p[1] + d.y * len * 0.4, p[2] + d.z * len * 0.4], null, 0.028).fx(0, 0);
      return e;
    };
    hornAt('hornB', K(0.3, 1.86, -0.1), [0.05, -0.2, -1]);
    // in his hand: the mouthpiece up along +y from the grip (aimed at his lips while he blows it), the bell bent out along +z (it
    // ends up facing forward and out, where the camera sees its golden mouth)
    { const [hx, hy, hz] = SV_HANDL, e = [hx, hy - 0.05, hz + 0.16], d = new THREE.Vector3(0, -0.32, 1).normalize();
      r.on('hornH').fx(0, 2).seg([hx, hy + 0.33, hz], [hx, hy - 0.02, hz], 0.017, GOLD, 0.024, 8).add(G.sphere(8, 6), GOLD, [hx, hy + 0.34, hz], null, 0.024);
      r.seg([hx, hy - 0.02, hz], [hx, hy - 0.05, hz + 0.06], 0.026, GOLD, 0.03, 8);
      cone(r, e, [-d.x, -d.y, -d.z], 0.11, 0.095, GOLD, 16);
      r.add(G.torus(TAU, 0.14, 18), '#ffe08a', e, qz(d.x, d.y, d.z), 0.095);
      r.fx(0.4, 0.5).add(G.cyl(1, 1, 16), '#b86a10', [e[0] - d.x * 0.01, e[1] - d.y * 0.01, e[2] - d.z * 0.01], qy(d.x, d.y, d.z), [0.08, 0.01, 0.08]);
      r.fx(0, 0.3).add(G.sphere(8, 6), red, [hx, hy + 0.12, hz + 0.02], null, 0.028).fx(0, 0);
      r.mark('horn', e); }
    // head: skin, ears, a round rosy nose, the curly ginger moustache, ginger curls (seen when the helmet comes off)
    const HC = SV_KHC, HR = SV_KHR;
    r.on('head').fx(0, 0.12).add(G.sphere(30, 22), vgrad(HC[1] - HR, HC[1] + HR, [[0, mixc(skin, '#b8603a', 0.2)], [0.45, skin], [1, mixc(skin, '#fff4ea', 0.12)]]), HC, null, [HR * 1.03, HR, HR * 0.98]);
    for (const sd of [-1, 1]) r.add(G.sphere(12, 8), skin, [sd * HR * 0.98, HC[1] - 0.03, HC[2] - 0.02], [0, sd * 0.35, 0], [HR * 0.16, HR * 0.23, HR * 0.12]);
    r.fx(0, 0.15);
    r.push(HC, [-SV_KTILT, 0, 0]).add(svPart('hair', 24, 8, 0, TAU, 0, 0.5 * PI), vgrad(HC[1] - 0.2, HC[1] + HR, [[0, gingerD], [1, ginger]]), [0, 0, -0.012], [-0.85, 0, 0], HR * 1.04).pop();
    for (const [a, el, k] of [[0, 0.5, 1.15], [1.3, 0.62, 1.05], [-1.3, 0.62, 1.05], [2.4, 0.9, 1.1], [-2.4, 0.9, 1.1]]) {
      const cy = Math.cos(el), sy = Math.sin(el), p = [HC[0] + Math.sin(a) * sy * HR * 0.8, HC[1] + cy * HR * 0.8 + 0.02, HC[2] + Math.cos(a) * sy * HR * 0.8 - 0.02];
      r.add(fluffGeo(10), Math.abs(a) > 2 ? gingerD : ginger, p, null, HR * 0.19 * k);   // (all inside the helmet while it is on)
    }
    r.add(G.torus(PI * 1.3, 0.3, 12), ginger, [HC[0] + 0.02, HC[1] + HR * 1.02, HC[2] - 0.02], [PI / 2 - 0.3, 0, 0.4], 0.055);   // a cowlick on top
    r.push(HC, [-SV_KTILT, 0, 0]);
    { const [p, q] = onSphere(0, -0.01 - 0.1 * 0.95, HR, HR * 0.02); r.fx(0, 0.4).add(G.sphere(14, 10), mixc(skin, '#ff8a70', 0.25), p, q, [HR * 0.14, HR * 0.12, HR * 0.13]); }
    for (const sd of [-1, 1]) { const [p, q] = onSphere(sd * 0.012, -0.125, HR, -0.012); r.push(p, q).fx(0, 0.25).add(stacheGeo(sd), ginger, [0, 0, 0], null, [0.18, 0.21, 0.19]).pop(); }
    r.mark('kMouth', new THREE.Vector3(...onSphere(0, -0.19, HR, -0.03)[0]).applyMatrix4(r.k.top()).toArray());   // (his own lips: the horn)
    r.pop().fx(0, 0);
    face(r, HC, HR, { bone: 'head', pout: true, tilt: SV_KTILT, skin, ex: 0.13, ey: -0.01, er: 0.1, iris: '#3a64b4', lipCol: TOWN.lip, blushCol: '#ff7f9c',
      browCol: '#8e3a14', browY: 1.2, browT: 0.72, browW: 1.4, browH: 1.45, browSide: 1, browRaise: 0.26, mouthY: -0.19, mouthW: 0.11, glance: 0.75, poutX: 0.14,
      cheekY: 1.25, heartX: 1.25, heartY: 0.95, heartS: 0.3, lid: 0.28, lidDroop: 0.08, browLift: 0.05 });   // (heavier lids + low bushy brows: "very grumpy"-cute, read fine from the boss camera)
    // the helmet (bone 'helm'): a round shell open at the face, gold trim round the opening and the rim, the visor pushed up
    // on top (a little golden knob to lift it), a gold holder for the plume
    const Rh = HR * 1.1, t0 = 0.26 * PI, t1 = 0.7 * PI, al = 1.0, hq = new THREE.Quaternion();   // (t0: the brim, above his bushy brows)
    r.on('helm').push(HC, [-SV_KTILT * 0.8, 0, 0]);
    const hc = vgrad(HC[1] - Rh, HC[1] + Rh, [[0, steelD], [0.55, steel], [1, '#ffffff']]);
    const felt = mixc(blue, '#1c2c78', 0.35);   // (the padded royal-blue lining inside the shell)
    r.fx(0, 0.1).add(svIn('helmTop', 24, 6, 0, TAU, 0, t0), felt, [0, 0, 0], null, Rh * 0.96).add(svIn('helmBack', 20, 7, PI / 2 + al, TAU - 2 * al, t0, t1 - t0), felt, [0, 0, 0], null, Rh * 0.96);
    r.fx(0, 2).add(svPart('helmTop', 30, 7, 0, TAU, 0, t0), hc, [0, 0, 0], null, Rh).add(svPart('helmBack', 26, 9, PI / 2 + al, TAU - 2 * al, t0, t1 - t0), hc, [0, 0, 0], null, Rh);
    r.add(G.torus(2 * al, 0.06, 20), GOLD, [0, Rh * Math.cos(t0), 0], [PI / 2, 0, PI / 2 - al], Rh * Math.sin(t0) * 1.01);
    r.add(G.torus(TAU - 2 * al, 0.05, 32), GOLD, [0, Rh * Math.cos(t1), 0], [PI / 2, 0, PI / 2 + al], Rh * Math.sin(t1) * 1.01);
    for (const sd of [-1, 1]) {
      const ph = sd * al;
      hq.copy(qb([0, 1, 0], [-Math.cos(ph), 0, Math.sin(ph)])).multiply(new THREE.Quaternion().setFromAxisAngle(_Z, PI / 2 - t1));
      r.add(G.torus(t1 - t0, 0.06, 14), GOLD, [0, 0, 0], hq, Rh * 1.01);
      r.add(G.sphere(8, 6), GOLD, [Math.sin(ph) * Math.sin(t0 + 0.12) * Rh * 1.07, Math.cos(t0 + 0.12) * Rh * 1.07, Math.cos(ph) * Math.sin(t0 + 0.12) * Rh * 1.07], null, 0.03);
    }
    r.add(svPart('visor', 18, 5, PI / 2 - al - 0.12, 2 * al + 0.24, 0.06 * PI, 0.18 * PI), steel, [0, 0, 0], null, Rh * 1.07);
    r.add(G.torus(2 * al + 0.24, 0.05, 20), GOLD, [0, Rh * 1.07 * Math.cos(0.24 * PI), 0], [PI / 2, 0, PI / 2 - al - 0.12], Rh * 1.07 * Math.sin(0.24 * PI));
    r.add(G.sphere(10, 8), GOLD, [0, Rh * 1.1 * Math.cos(0.22 * PI), Rh * 1.1 * Math.sin(0.22 * PI)], null, [0.04, 0.03, 0.03]);
    const hp0 = new THREE.Vector3(0, Rh * Math.cos(0.12 * PI), -Rh * Math.sin(0.12 * PI));
    r.add(G.cyl(0.8, 1, 12), GOLD, hp0.toArray(), [-0.12 * PI, 0, 0], [0.045, 0.1, 0.045]);
    const b0 = hp0.clone().add(new THREE.Vector3(0, 0.04, -0.01));
    r.bone('plume', 'helm', b0.clone().applyMatrix4(r.k.top()).toArray());
    // the tall rainbow plume: six feathers fanned out left to right (red on his right … purple on his left), their tips curling back
    r.on('plume');
    { const PC = ['#ff4d5e', '#ff9a3a', '#ffd23f', '#4cd070', '#4aa8ff', '#a070f0'];
      for (let i = 0; i < 6; i++) {
        const g = (i - 2.5) / 2.5 * 0.78, ln = 0.36 + 0.14 * (1 - Math.abs(i - 2.5) / 2.5), d = new THREE.Vector3(Math.sin(g) * 0.9, Math.cos(g), -0.28).normalize();
        const d2 = d.clone().add(new THREE.Vector3(0, -0.2, -0.85)).normalize(), c = col(PC[i]), cL = mixc(c, '#ffffff', 0.3);
        const m1 = b0.clone().addScaledVector(d, ln * 0.5), m2 = b0.clone().addScaledVector(d, ln * 0.93).addScaledVector(d2, 0.06);
        r.fx(0, 0.25, 0).add(G.sphere(12, 8), c, m1.toArray(), qb(d.toArray(), [0, 0, 1]), [0.075, ln * 0.52, 0.03]);
        r.add(G.sphere(10, 6), cL, m2.toArray(), qb(d2.toArray(), [0, 1, 0.3]), [0.055, 0.1, 0.024]);
      }
      r.fx(0, 0); }
    r.pop();
    // dizzy stars circling the helmet (shown only while dizzy)
    r.on('stars').fx(0.75, 0.5);   // (lying nearly flat, tipped out a little: the camera above always sees them)
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; r.add(starFlat(), hdr('#ffe14a', 1.25), [Math.sin(a) * 0.5, 3.1 + (i & 1) * 0.06, SV_KHC[2] + Math.cos(a) * 0.5], new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2 + 0.45, a, 0, 'YXZ')), 0.21); }
    r.fx(0, 0);
    return { height: 3.4, glowC: col('#ffc46a'), glowK: 0.5, tex: texOf('fabric'), dieHop: 0, hide: ['shoe', 'hornH', 'stars', 'hTongue'],
      portrait: { cx: 0, cy: 2.54, cz: 0.5, rad: 1.03 },   // (the badge: his helmet and plume, the horse's face below)
      mat: { rough: 0.5, ns: 0.8, sss: col('#ffd8c0').multiplyScalar(0.025), rimK: 0.26, rimP: 2.5 } };
  }
  // The lance's red spiral stripe: a flat band on a helix round the tapered shaft (from the hand's frame: y 0 = the vamplate).
  function lanceStripeGeo() {
    const ts = sN(90, 40), rs = sN(6, 4);
    return gx('svStripe@' + ts, () => {
      const L = SV_LANCE, len = L.tip - 0.14 - L.vamp, turns = 5.5, R = y => lerp(0.058, 0.03, y / (len + 0.06)) + 0.001, pts = [];
      for (let i = 0; i <= 88; i++) { const t = i / 88, a = t * turns * TAU, y = t * len; pts.push(new THREE.Vector3(Math.sin(a) * R(y), y, Math.cos(a) * R(y))); }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), ts, 0.022, rs, false), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {   // flatten the cord into a band lying on the shaft
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rr = Math.hypot(x, z) || 1, R0 = R(y), k = (R0 + (rr - R0) * 0.25) / rr;
        p.setXYZ(i, x * k, y, z * k);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  // Two-bone leg IK in the horse's side plane: [leg, shin] x-rotations (out) that put leg z0's fetlock on the point tz, ty of the
  // model's frame, with the horse bone lifted by hy and pitched by hp about the hind hips. The front knee bends forward (the
  // hoof tucks back), the hind hock backward (the hoof swings forward), as the other poses fold them. A leg leaning out by
  // its splay reaches that much less far in the side plane (k).
  function svLegIK(z0, tz, ty, hy, hp, out, k = 1) {   // (k: the legs' share in the side plane — cos of their splay)
    const L1 = SV_LEG[0] * k, L2 = SV_LEG[1] * k, dz0 = z0 + 0.7, hipY = 0.9 + hy - dz0 * Math.sin(hp), hipZ = -0.7 + dz0 * Math.cos(hp);
    const dz = tz - hipZ, dy = ty - hipY, d = clamp(Math.hypot(dz, dy), 0.1, L1 + L2 - 1e-4), a = Math.atan2(dz, -dy);
    const g = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), bend = PI - Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const front = z0 > 0, [d1, d2] = SV_LEGD;
    out[0] = d1 - (front ? a + g : a - g) - hp; out[1] = d2 - d1 + (front ? bend : -bend);
    return out;
  }
  const _ik = [0, 0];
  function animSovalye(m, dt, st, s) {
    const B = m.B, ph = bph(st), t = bpt(st), br = Math.sin(s.t * 1.8 + s.ph);
    const LG = s.lg || (s.lg = { FL: [0, 0, 0], FR: [0, 0, 0], BL: [0, 0, 0], BR: [0, 0, 0] });
    for (const n in LG) LG[n][0] = LG[n][1] = LG[n][2] = 0;   // per leg: swing (− = the hoof forward), knee/hock fold, splay
    // the horse: lift, pitch (− = nose up, about the hind hips), roll, yaw, landing squash; neck bend (+ = head down), head nod /
    // turn / tilt, jaw, ears (+ = pricked forward), tail lift + swish, pupils look / cross, tongue, blink
    let hy = 0, hp = 0, hr = 0, hw = 0, sq = 0, nk = 0, hx = 0, hyw = 0, hz = 0, jaw = 0, ear = 0, tl = 0, tsw = 0, look = 0, lookY = 0, cross = 0, tongue = 0, eyeK = 1;
    // the knight: hips lift / lean (+ = forward) / roll, torso twist (+ = to his left) / side lean / puff, head nod / turn / tilt,
    // the lance in the saddle's frame (psi yaw + = to his left, phi pitch + = up), arms (x swing − = forward, z out), plume lag
    let ky = 0, kp = 0, tw = 0, ks = 0, puff = 0, nd = 0, tn = 0, tt = 0, psi = SV_REST.psi, phi = SV_REST.phi;
    let rX = -0.05 + br * 0.02, rY = 0, rZ = 0, rF = 0, lX = br * 0.02, lY = 0, lZ = 0, lF = 0, shoe = 0, horn = 0, hornP = 0, stars = 0, helm = 0, plX = 0, plZ = 0;
    const poseL = (P, k) => { lX = lerp(lX, P[0], k); lY = lerp(lY, P[1], k); lZ = lerp(lZ, P[2], k); lF = lerp(lF, P[3], k); };   // (left arm → a pose, by k)
    const poseR = (P, k) => { rX = lerp(rX, P[0], k); rY = lerp(rY, P[1], k); rZ = lerp(rZ, P[2], k); rF = lerp(rF, P[3], k); };
    const pre = preAggro(s, st, ph, dt);
    // ── idle life: breathing, ears flicking, the horse looks about, a hoof stamp now and then, the tail swishes ──
    hy += br * 0.008; tsw += Math.sin(s.t * 1.3 + s.ph) * 0.18 + Math.sin(s.t * 3.1) * 0.05;
    s.lkT = (s.lkT ?? frand(1, 3)) - dt;
    if (s.lkT < 0) { s.lkT = frand(1.5, 4); s.lkTo = fpick([0, 0, -0.3, 0.28, 0.16, -0.12]); }
    s.lk = damp(s.lk || 0, ph === 'idle' || ph === 'move' ? s.lkTo || 0 : 0, 3, dt); hyw += s.lk * 0.55; look += s.lk * 0.5;   // (eyes front while it acts)
    s.ekT = (s.ekT ?? frand(1, 4)) - dt;
    if (s.ekT < 0) { const u = -s.ekT / 0.35; if (u >= 1) { s.ekT = frand(2, 5); s.ekS = fpick([-1, 1, 0]); } else ear -= Math.sin(u * PI) * 0.6; }
    s.hbt = (s.hbt ?? frand(1, 3)) - dt;
    if (s.hbt < 0) { const u = -s.hbt / 0.16; if (u >= 1) s.hbt = frand(1.8, 4.5); else eyeK = 1 - Math.sin(u * PI) * 0.92; }
    const calm = ph === 'idle' && !(st.move > 0.05);
    s.stT = (s.stT ?? frand(3, 6)) - dt;
    if (s.stT < 0) { const u = -s.stT / 0.55; if (u >= 1 || !calm) s.stT = frand(4, 8); else { const k = Math.sin(u * PI); LG.FR[0] -= 0.35 * k; LG.FR[1] += 0.9 * k; hx += 0.06 * k; } }
    // the knight's sulky "hıh!": chin up, face turned away for a moment
    if (s.mood !== 'happy' && (ph === 'idle' || ph === 'move')) {
      s.hih = (s.hih ?? frand(1.5, 4)) - dt;
      if (s.hih < 0) { const u = -s.hih / 1.1; if (u >= 1) s.hih = frand(3.5, 7); else { const e = smooth01(u / 0.2) * (1 - smooth01((u - 0.7) / 0.3)); nd -= 0.22 * e; tn += 0.45 * e; tt -= 0.06 * e; } }
    }
    // ── trot: diagonal pairs (FL + BR, FR + BL) take turns on the ground, each hoof PLACED (svLegIK, just before 'apply'): a
    // hoof on the ground is held at its spot in the world — it stays put while he speeds up, slows down or turns — flat (the
    // fetlock bends), the leg straight at the stride's ends; the body bounces down into each step (lowest in mid-stance, the
    // knees giving under the caparison) and up again as the pairs hand over. In the air the knee / hock folds, the hoof
    // flicks up and reaches forward to its next spot (as far ahead as the stride at his speed), leaving and landing at the
    // ground's speed under him. He bounces in the saddle a beat later.
    // Any phase but the charge (the gallop), the rear and the goodbye, while GAME moves him; the whole sweep too (its step-in
    // walks; standing, the placed hooves stay flat on the ground while he crouches into the swing). The stride follows his
    // real speed: when he stops, the hooves left behind step back under him and the bounce fades out.
    const rp = m.root.position, ry = m.root.rotation.y, rs = m.root.scale.x || 1, cy = Math.cos(ry), sy = Math.sin(ry);
    if (s.rx !== undefined && dt > 0) {   // (a jump = a teleport: the held spots are gone)
      const dd = Math.hypot(rp.x - s.rx, rp.z - s.rz);
      if (dd < 1) { s.gv = damp(s.gv || 0, dd / dt, 12, dt); if (dd > 1e-4) s.gvOn = true; } else s.wx = s.pw = null;
    }
    if (s.ry !== undefined && s.wx) {   // GAME turns him: the planted hooves hold on up to a brisk turn, beyond that they skid round with him
      const d = angDiff(s.ry, ry), ex0 = d - clamp(d, -2.5 * dt, 2.5 * dt);
      if (ex0) {
        const c = Math.cos(ex0), sn = Math.sin(ex0), ox = rp.x + sy * (s.vd || 0), oz = rp.z + cy * (s.vd || 0);
        for (const Q of [s.wx, s.pw]) for (const n in Q) { const q = Q[n]; if (!q) continue; const dx = q[0] - ox, dz = q[1] - oz; q[0] = ox + dx * c + dz * sn; q[1] = oz - dx * sn + dz * c; }
      }
    }
    s.rx = rp.x; s.rz = rp.z; s.ry = ry;
    // (after GAME stops him the placed hooves stay on for a moment, so the ones left behind step back under him)
    const walkOn = ph !== 'charge' && ph !== 'rear' && ph !== 'dying' && (ph === 'move' || st.move > 0.05);
    s.tk = walkOn ? 0.5 : ph === 'idle' || ph === 'sweep' || ph === 'toss' || ph === 'seek' || ph === 'munch' ? (s.tk || 0) - dt : 0;
    const trot = ph === 'sweep' || walkOn || s.tk > 0;
    s.gk = damp(s.gk || 0, trot ? 1 : 0, trot ? 30 : 12, dt);   // (placed at once: a straight leg on its spot is the rest pose)
    const TR = SV_TROT, gv = Math.min(TR.vMax, s.gvOn ? s.gv : s.mv * TR.v), om = TR.rate + TR.rateV * gv;
    if (!s.gvOn) s.vd = (s.vd || 0) + gv * dt;   // (never moved by GAME: a test page — as if he walked ahead at st.move)
    const ex = rp.x + sy * (s.vd || 0), ez = rp.z + cy * (s.vd || 0);   // (the model frame's origin in the world)
    const A = gv * TR.duty * PI / om;   // (half the stance stroke at this speed)
    let rate = om;
    {   // speeding up, the planted pair falls behind its stride: its step ends sooner (it would run out of leg and drag)
      const sg0 = ((s.walk / TAU) % 0.5 + 0.5) % 0.5 / TR.duty, left = (s.zs ?? 0) + A;
      if (gv > 0.05 && sg0 < 1) rate = left > 0.01 ? clamp((1 - sg0) * TR.duty * TAU * gv / left, om, om * 2.5) : om * 2.5;
    }
    if (s.gk > 0.01) s.walk += dt * rate;
    const gk = s.gk, wp = s.walk, wb = wp - PI / 2;   // (wb: 0 / π = a pair in mid-stance, the body at its lowest; ±π/2 = the hand-over)
    // per leg: the fetlock's target in the model frame (z, sideways off the leg's line, lift over the ground), the stride share
    // it was at, where it left the ground, the world spot a planted hoof is held at
    const TZ = s.tz || (s.tz = { FL: 0.56, FR: 0.56, BL: -0.7, BR: -0.7 }), TX = s.tx || (s.tx = { FL: 0, FR: 0, BL: 0, BR: 0 });
    const TY = s.ty || (s.ty = { FL: 0, FR: 0, BL: 0, BR: 0 }), GU = s.gu || (s.gu = {}), Z0 = s.zo || (s.zo = {}), X0 = s.xo || (s.xo = {});
    const W = s.wx || (s.wx = {}), PW = s.pw || (s.pw = {});   // (PW: each target's world spot last frame)
    if (gk > 0.002) {
      const lift = Math.min(1, gv / 1.2), L = SV_LEG[0] + SV_LEG[1], ga = gk * lift;   // (ga: how much he trots)
      let zs = 0, ns = 0;
      for (const [n, sd, z0] of SV_LEGS) {
        const u = ((wp / TAU + (n === 'FL' || n === 'BR' ? 0 : 0.5)) % 1 + 1) % 1, fr = z0 > 0, u0 = GU[n], x = 0.32 * sd;
        GU[n] = u;
        if (u < TR.duty) {   // on the ground: held where it was put (a leg reaches only so far — then it drags along)
          let lx = x + TX[n], lz = TZ[n];
          if (!(u0 < TR.duty) || !W[n]) W[n] = PW[n] ? PW[n].slice() : [ex + (lx * cy + lz * sy) * rs, ez + (lz * cy - lx * sy) * rs];   // (just put down)
          const dx = (W[n][0] - ex) / rs, dz = (W[n][1] - ez) / rs;
          lx = dx * cy - dz * sy; lz = dx * sy + dz * cy;
          const cz = clamp(lz, z0 - 0.45, z0 + 0.45), cx = clamp(lx - x, -0.25, 0.25);
          if (cz !== lz || cx !== lx - x) { lz = cz; lx = x + cx; W[n] = [ex + (lx * cy + lz * sy) * rs, ez + (lz * cy - lx * sy) * rs]; }
          TZ[n] = lz; TX[n] = lx - x; TY[n] = 0; zs += lz - z0; ns++;
        } else {   // in the air: from where it left the ground up and forward to z0 + A (a Hermite curve whose end slopes match
          // the stroke, so it never scuffs forward near the ground), back onto its line, as high as the step is long; the
          // front hoof curls back
          if (u0 === undefined || u0 < TR.duty) { Z0[n] = TZ[n]; X0[n] = TX[n]; }
          const w = (u - TR.duty) / (1 - TR.duty), w2 = w * w, w3 = w2 * w, up = Math.sin(PI * w), mt = -2 * A * (1 - TR.duty) / TR.duty, h0 = 2 * w3 - 3 * w2 + 1;
          const z1 = z0 + A, hk = Math.max(lift, clamp((Math.hypot(z1 - Z0[n], X0[n]) + gv * (1 - TR.duty) * TAU / om) / 0.4, 0, 1));   // (hk: as high as its step over the ground is long)
          TZ[n] = Z0[n] * h0 + z1 * (1 - h0) + mt * (2 * w3 - 3 * w2 + w) - (fr ? 0.06 : 0.02) * up * hk;
          TX[n] = X0[n] * h0; TY[n] = (fr ? TR.liftF : TR.liftB) * up * hk;
        }
        const px = x + TX[n], pz = TZ[n];
        PW[n] = [ex + (px * cy + pz * sy) * rs, ez + (pz * cy - px * sy) * rs];
      }
      const sg = ((wp / TAU) % 0.5 + 0.5) % 0.5 / TR.duty;   // the pair on the ground: its share of the stance, its stroke zs
      zs = ns ? zs / ns : 0; s.zs = zs;
      // (the body: as high as a straight leg reaches at the stride's ends — never higher, the planted hooves must reach the
      // ground — minus the bounce; the head nods down and the knight is tossed up a beat after the body)
      hy += (Math.sqrt(L * L - Math.max(A * A, zs * zs)) - L - TR.dip * lift * Math.sin(PI * Math.min(1, sg))) * gk; hr += Math.sin(wp) * 0.012 * ga;
      nk += Math.cos(2 * wb - 0.5) * 0.05 * ga; hx -= Math.cos(2 * wb - 0.5) * 0.03 * ga; tl += 0.25 * ga; tsw += Math.sin(wp) * 0.15 * ga;
      ky += Math.abs(Math.sin(wb - 0.45)) * 0.045 * ga; kp += 0.05 * ga; plX -= Math.abs(Math.sin(wb - 0.9)) * 0.12 * ga;
      rX += Math.sin(2 * wb) * 0.05 * ga; phi -= Math.abs(Math.sin(wb - 0.7)) * 0.05 * ga;
    } else {   // standing: the next trot starts from the rest spots, FL + BR planted, FR + BL just lifting
      for (const [n, , z0] of SV_LEGS) { TZ[n] = z0; TX[n] = TY[n] = 0; GU[n] = undefined; W[n] = PW[n] = null; }
      s.zs = 0; s.walk = 0;
    }
    switch (ph) {
      case 'charge': {   // 0–0.3 paws the ground + lowers the lance · 0.3–0.9 gallop · 0.9–1 skids to a stop
        const wind = 1 - smooth01((t - 0.27) / 0.05), gal = smooth01((t - 0.27) / 0.05) * (1 - smooth01((t - 0.88) / 0.04));
        const skid = smooth01((t - 0.87) / 0.04), low = smooth01((t - 0.04) / 0.2) * (1 - smooth01((t - 0.9) / 0.1));
        if (wind > 0.001) {   // two scrapes with the right front hoof, head low, ears back, tail swishing
          const u = clamp((t - 0.02) / 0.26, 0, 1), c = (u * 2) % 1, on = u > 0 && u < 1 ? 1 : 0;
          const sw = c < 0.45 ? lerp(0, -0.6, smooth01(c / 0.45)) : c < 0.75 ? lerp(-0.6, 0.38, smooth01((c - 0.45) / 0.3)) : lerp(0.38, 0, smooth01((c - 0.75) / 0.25));
          LG.FR[0] += sw * on * wind; LG.FR[1] += (c < 0.5 ? 1.2 * Math.sin(PI * c / 0.5) : 0) * on * wind;
          nk += 0.28 * wind * smooth01(t / 0.08); hx += 0.12 * wind; ear -= 0.5 * wind; tsw += Math.sin(s.t * 9) * 0.3 * wind; hp += 0.03 * wind;
          kp += 0.18 * low * wind; nd += 0.1 * low * wind;
        }
        if (gal > 0.001) {   // a bounding gallop: the front legs reach together, the hind legs push together; mane and tail stream
          s.gal = (s.gal || 0) + dt * 15 * gal;
          const q = s.gal;
          for (const [n, o, sg] of [['FL', 0, 1], ['FR', 0.35, 1], ['BL', PI + 0.2, -1], ['BR', PI + 0.55, -1]]) {
            const qq = q + o, up = Math.max(0, Math.cos(qq));
            LG[n][0] -= 0.72 * Math.sin(qq) * gal; LG[n][1] += sg * 1.35 * up * up * gal;
          }
          hp += (-0.1 * Math.sin(q + 0.5)) * gal; hy += Math.max(0, Math.sin(q + 1.2)) * 0.16 * gal;
          nk += (0.32 + 0.1 * Math.sin(q)) * gal; hx -= 0.2 * gal; ear -= 0.7 * gal; tl += 1.0 * gal; tsw += Math.sin(q * 0.5) * 0.2 * gal;
          kp += (0.3 + 0.05 * Math.sin(q)) * gal; ky += Math.abs(Math.sin(q + 0.6)) * 0.07 * gal; nd += 0.08 * gal; plX -= 0.7 * gal;
        }
        if (skid > 0.001) {   // sits back on its haunches, front legs braced, the knight lurches forward then back
          const k = skid * (1 - smooth01((t - 0.96) / 0.04) * 0.6), j = bump(t - 0.89, 0.1);
          LG.BL[0] -= 0.75 * k; LG.BR[0] -= 0.7 * k; LG.BL[1] -= 0.55 * k; LG.BR[1] -= 0.5 * k;
          LG.FL[0] -= 0.45 * k; LG.FR[0] -= 0.4 * k;
          hp -= 0.16 * k; hy -= 0.12 * k; nk -= 0.3 * k; hx -= 0.1 * k; ear += 0.4 * k; tl += 0.3 * k;
          kp += 0.35 * j - 0.1 * k; plX += 0.6 * j;
        }
        psi = lerp(psi, -0.08, low); phi = lerp(phi, -0.04 + 0.03 * Math.sin(s.t * 20) * gal, low);
        rX += 0.3 * low; rF -= 0.15 * low;   // the lance couched under his arm
        poseL(SV_LREIN, low);   // the left hand forward, as if on the reins
        break;
      }
      case 'rear': {   // 0–0.5 up on the hind legs (pawing the air, neighing), lands at 0.5 (the stomp), 0.5–1 settles
        const up = t < 0.42 ? smooth01((t - 0.06) / 0.22) : 1 - Math.pow(clamp((t - 0.42) / 0.08, 0, 1), 2), A = 0.72 * up;
        const land = bump(t - 0.5, 0.16), crouch = bump(t, 0.14), set = bump(t - 0.55, 0.45);
        hp -= A; hy -= 0.06 * crouch; sq = land; s.rearA = A; s.rearV = 0;
        for (const [n, o] of [['FL', 0], ['FR', 1.7]]) { LG[n][0] -= (0.95 + 0.4 * Math.sin(s.t * 13 + o)) * up; LG[n][1] += (1.35 + 0.3 * Math.sin(s.t * 13 + o + 1)) * up; LG[n][2] += (n === 'FL' ? 0.1 : -0.1) * land; }
        for (const n of ['BL', 'BR']) { LG[n][0] += A * 0.92; LG[n][1] -= 0.2 * up; }
        nk -= 0.3 * up; hx -= 0.25 * up; jaw += 0.42 * bump(t - 0.1, 0.36); ear += 0.4 * up - 0.3 * land; tl -= 0.2 * up; tsw += Math.sin(s.t * 7) * 0.3 * up;
        hz += Math.sin(s.t * 14) * 0.1 * set * (1 - smooth01((t - 0.9) / 0.1));   // a happy little head shake after landing
        kp += A * 0.62; ky -= 0.06 * land; nd -= 0.1 * up + 0.08 * land; plX += 0.5 * up - 0.4 * land;
        rX -= 2.1 * up; rF -= 0.25 * up; psi = lerp(psi, 0.05, up); phi = lerp(phi, 1.45, up);   // the lance held high
        poseL(SV_LREIN, up);
        break;
      }
      case 'sweep': {   // 0–0.4 the lance drawn back to his right · 0.4–0.6 swept wide across the front (straight ahead at 0.5) while
        // the horse ducks its head under it · 0.6–1 back to rest
        const back = smooth01(t / 0.34), e = smooth01((t - 0.4) / 0.2), rec = smooth01((t - 0.64) / 0.34), on = 1 - rec;
        let ps = lerp(SV_REST.psi, -1.9, back);
        if (t >= 0.4) ps = e < 0.5 ? lerp(-1.9, 0, e * 2) : lerp(0, 1.15, e * 2 - 1);
        psi = lerp(ps, SV_REST.psi, rec);
        phi = lerp(lerp(SV_REST.phi, -0.24, smooth01(t / 0.2)) + 0.62 * smooth01(ps / 1.15), SV_REST.phi, rec);
        tw = lerp(ps * 0.42, 0, rec); rZ -= 0.85 * on * smooth01(t / 0.2); rX += (0.35 * back - 0.9 * e) * on; rF += 0.3 * on * smooth01(t / 0.2);
        kp += 0.08 * on; ks -= 0.06 * back * on; nd += 0.08 * on; tn -= tw * 0.6;
        const duck = bump(t - 0.43, 0.3);
        nk += 0.12 * on * smooth01(t / 0.3) + 0.62 * duck; hx += 0.3 * duck; eyeK = Math.min(eyeK, 1 - 0.6 * duck); ear -= 0.8 * duck; hyw -= 0.2 * duck;
        for (const [n, sd] of [['FL', 1], ['FR', -1], ['BL', 1], ['BR', -1]]) LG[n][2] += sd * 0.1 * on * smooth01(t / 0.3);
        hw += (0.1 * back - 0.2 * e) * on; hy -= 0.04 * on;
        break;
      }
      case 'toss': {   // three horseshoes flung sidearm with the left hand (swung out and back at shoulder height, then forward: they
        // leave it at 0.35 / 0.5 / 0.65); a new one pops into the hand as it swings back; the horse watches them fly
        const T = [0, 0.1, 0.27, 0.35, 0.43, 0.5, 0.58, 0.65, 0.74, 0.92];
        const on = smooth01(t / 0.1) * (1 - smooth01((t - 0.76) / 0.16));
        lY = lerp(lY, kf(t, T, [0, 0.3, 0.7, -0.65, 0.7, -0.65, 0.7, -0.65, -0.4, 0]), on); lZ = lerp(lZ, kf(t, T, [0, 1.1, 1.35, 1.2, 1.35, 1.2, 1.35, 1.2, 0.8, 0]), on);
        lF = lerp(lF, kf(t, T, [0, -0.3, -0.45, 0, -0.45, 0, -0.45, 0, -0.1, 0]), on); tw += kf(t, T, [0, 0.15, 0.38, -0.32, 0.38, -0.32, 0.38, -0.32, -0.15, 0]) * on;
        shoe = (t > 0.1 && t < 0.35) || (t > 0.4 && t < 0.5) || (t > 0.55 && t < 0.65) ? 1 : 0;
        let kick = 0; for (const c of [0.35, 0.5, 0.65]) kick += bump(t - c + 0.05, 0.13);
        kp += 0.06 * kick; ks -= 0.04 * on; nd -= 0.08 * on + 0.05 * kick; tn += 0.2 * on - 0.2 * kick; ky += 0.03 * kick;
        hx -= 0.1 * on + 0.05 * kick; ear += 0.4 * on; lookY += 0.2 * on;
        psi = lerp(psi, -0.45, on); phi = lerp(phi, 1.25, on);
        break;
      }
      case 'summon': {   // lance raised high, the little horn from his belt to his lips (0.14–0.36), blown 0.42–0.62 (the call at 0.5),
        // back at his belt by 0.85; the horse prances proudly
        const k = smooth01(t / 0.16) * (1 - smooth01((t - 0.84) / 0.16)), hk = smooth01((t - 0.14) / 0.22) * (1 - smooth01((t - 0.66) / 0.18)), blow = bump(t - 0.4, 0.24);
        rX -= 2.2 * k; rF -= 0.3 * k; psi = lerp(psi, 0.1, k); phi = lerp(phi, 1.5, k);
        poseL(SV_LHORN, hk);
        horn = hk > 0.4 ? 1 : 0; hornP = bump(t - 0.46, 0.1);
        kp -= 0.1 * blow; nd -= 0.06 * blow; puff += 0.05 * blow; tn += 0.12 * hk;
        LG.FL[0] -= 0.6 * Math.max(0, Math.sin(t * PI * 6)) * k; LG.FL[1] += 1.2 * Math.max(0, Math.sin(t * PI * 6)) * k;
        LG.FR[0] -= 0.6 * Math.max(0, -Math.sin(t * PI * 6)) * k; LG.FR[1] += 1.2 * Math.max(0, -Math.sin(t * PI * 6)) * k;
        hy += Math.abs(Math.sin(t * PI * 6)) * 0.05 * k; nk -= 0.25 * k; hx -= 0.12 * k; ear += 0.5 * k; tl += 0.3 * k;
        break;
      }
      case 'roar': {
        if (s.intro) {   // entrance (after the double take): up on a half-rear, the lance raised straight up, then dipped forward in a
          // knightly salute (0.45–0.7 of the rest), a proud nod; the horse paws the air and neighs
          const u = clamp((t - 0.25) / 0.75, 0, 1), k = smooth01(u / 0.2) * (1 - smooth01((u - 0.8) / 0.2)), A = 0.42 * k, sal = bump(u - 0.42, 0.33);
          hp -= A; for (const [n, o] of [['FL', 0], ['FR', 1.7]]) { LG[n][0] -= (0.8 + 0.3 * Math.sin(s.t * 12 + o)) * k; LG[n][1] += (1.2 + 0.2 * Math.sin(s.t * 12 + o + 1)) * k; }
          for (const n of ['BL', 'BR']) LG[n][0] += A * 0.92;
          kp += A * 0.62; nk -= 0.3 * k; hx -= 0.2 * k; jaw += 0.36 * bump(u - 0.05, 0.45); ear += 0.45 * k; tl += 0.3 * k; tsw += Math.sin(s.t * 7) * 0.25 * k;
          psi = lerp(psi, 0, k); phi = lerp(phi, 1.5, k) - 1.05 * sal; rX -= (1.9 - 1.1 * sal) * k; rF -= 0.2 * k;
          nd += 0.16 * sal - 0.08 * k; poseL(SV_LREIN, k); plX += 0.4 * k;
          break;
        }
        // "hımf!": chin up, face turned away, puffed up, the lance shaken; the horse half-rears and neighs
        const k = smooth01(t / 0.18) * (1 - smooth01((t - 0.8) / 0.2)), away = smooth01((t - 0.22) / 0.12) * (1 - smooth01((t - 0.62) / 0.14));
        nd -= 0.24 * k; tn += 0.5 * away; tt -= 0.08 * away; puff += 0.06 * k; kp -= 0.06 * k;
        rX -= 0.5 * k; psi = lerp(psi, -0.1, k) + Math.sin(s.t * 18) * 0.08 * k; phi = lerp(phi, 1.25, k);
        hp -= 0.22 * k; LG.FL[0] -= 0.5 * k; LG.FL[1] += 1.0 * k; LG.FR[0] -= 0.35 * k; LG.FR[1] += 0.8 * k;
        for (const n of ['BL', 'BR']) LG[n][0] += 0.2 * k;
        nk -= 0.35 * k; hx -= 0.3 * k; jaw += (0.38 + 0.06 * Math.sin(s.t * 34)) * bump(t - 0.12, 0.62); ear += 0.5 * k; tl += 0.4 * k; tsw += Math.sin(s.t * 10) * 0.3 * k;
        break;
      }
      case 'seek': {   // (loops; GAME walks him with st.move) the horse wants the carrot: trots hungrily, head low and reaching, ears
        // pricked, big eyes, its tongue out a little, tail swishing — the knight leans back tugging the reins, pouting
        const k = smooth01(s.pT / 0.3);
        nk += 0.34 * k; hx -= 0.3 * k; ear += 0.85 * k; tongue = Math.max(tongue, 0.65 * k); tsw += Math.sin(s.t * 6.5) * 0.3 * k; tl += 0.2 * k;
        eyeK *= 1 + 0.2 * k; hyw += Math.sin(s.t * 2.2) * 0.08 * k;
        kp -= 0.3 * k; ky += 0.02 * k; nd -= 0.12 * k; tt += 0.05 * k; puff += 0.03 * k;
        poseL(SV_LREIN, k); lX += Math.max(0, Math.sin(s.t * 7)) * 0.25 * k; lF -= Math.max(0, Math.sin(s.t * 7)) * 0.3 * k;
        rX += 0.25 * k; psi = lerp(psi, -0.35, k); phi = lerp(phi, 1.25, k);
        break;
      }
      case 'munch': {   // (5 s, loops) the horse munches the carrot happily (a 0.5 s chew), eyes half shut, ears relaxed, tail swishing;
        // the knight sits with his arms crossed, shaking his head, and every 1.5 s a "hımf!" chin-up
        const k = smooth01(s.pT / 0.25), ch = Math.sin(s.t * TAU / 0.5);
        jaw += (0.08 + 0.14 * Math.max(0, ch)) * k; nk += (0.14 + 0.03 * ch) * k; hx += 0.03 * ch * k; eyeK *= 1 - 0.5 * k; ear -= 0.35 * k;
        tsw += Math.sin(s.t * 4.2) * 0.32 * k; hyw += Math.sin(s.t * 1.3) * 0.06 * k; hz += Math.sin(s.t * TAU / 0.5) * 0.03 * k;
        poseL(SV_LCROSS, k); poseR(SV_RCROSS, k); psi = lerp(psi, -1.05, k); phi = lerp(phi, 0.95, k);
        const hb = bump((s.pT % 1.5) / 1.5 - 0.04, 0.3);
        nd -= 0.3 * hb * k; tn += (0.4 * hb + Math.sin(s.t * 7.5) * 0.14 * (1 - hb)) * k; tt -= 0.06 * hb * k; puff += 0.04 * hb * k; kp -= 0.05 * k;
        break;
      }
      case 'dizzy': {   // wobbling round, little stars circling his helmet; the horse sways, cross-eyed, its tongue out
        const k = smooth01(t / 0.06) * (1 - smooth01((t - 0.95) / 0.05)), a = s.t * 3.2;
        ks += 0.12 * Math.sin(a) * k; kp += 0.08 * Math.cos(a) * k; nd += 0.12 * Math.cos(a * 1.3) * k; tt += 0.2 * Math.sin(a * 1.3 + 1) * k;
        psi = lerp(psi, -0.75, k) + 0.15 * Math.sin(a * 0.8) * k; phi = lerp(phi, 0.3, k) + 0.15 * Math.sin(a) * k; rX += 0.25 * k; rZ -= 0.15 * k;
        poseL(SV_LDIZZY, k); stars = k; plZ += 0.5 * Math.sin(a) * k; plX += 0.25 * k;
        hr += 0.07 * Math.sin(a * 0.7) * k; hw += 0.05 * Math.sin(a * 0.45) * k;
        for (const [n, sd] of [['FL', 1], ['FR', -1], ['BL', 1], ['BR', -1]]) LG[n][2] += sd * 0.13 * k;
        nk += 0.22 * k; hz += 0.28 * Math.sin(a * 0.7 + 1) * k; hyw += 0.15 * Math.sin(a * 0.5) * k;
        cross = k; tongue = k; ear -= 0.9 * k; look *= 1 - k; lookY += 0.15 * k;
        break;
      }
      case 'dying': {   // overjoyed: 0–0.35 the helmet off and waved, the horse prances · 0.35–0.7 happy hops together · then the twirl
        const d = st.dying, wv = Math.sin(s.t * 11);
        helm = smooth01((d - 0.05) / 0.12);
        const reach = smooth01(d / 0.06);
        poseL(SV_LWAVE, reach); lZ += 0.22 * wv * helm; lF += 0.2 * wv * helm;
        rX -= 1.4; rZ -= 0.2; psi = 0.1 + 0.12 * wv; phi = 1.4;
        nd -= 0.12; tt += Math.sin(s.t * 7) * 0.08; plX += 0.3;
        const pr = 1 - smooth01((d - 0.3) / 0.08), hop = d > 0.35 && d < 0.72 ? Math.abs(Math.sin((d - 0.35) / 0.37 * PI * 3)) : 0;
        LG.FL[0] -= 0.7 * Math.max(0, Math.sin(s.t * 9)) * pr; LG.FL[1] += 1.3 * Math.max(0, Math.sin(s.t * 9)) * pr;
        LG.FR[0] -= 0.7 * Math.max(0, -Math.sin(s.t * 9)) * pr; LG.FR[1] += 1.3 * Math.max(0, -Math.sin(s.t * 9)) * pr;
        hy += Math.abs(Math.sin(s.t * 9)) * 0.05 * pr + hop * 0.42; nk -= 0.25; hx -= 0.15 + Math.sin(s.t * 9) * 0.05 * pr; ear += 0.6; tl += 0.5;
        for (const n in LG) LG[n][1] += (n[0] === 'F' ? 1 : -1) * 0.9 * hop;
        ky += hop * 0.08;
        break;
      }
    }
    // hit (st.hurt; m.anim leaves his root alone, def.ownHurt): he jolts back in the saddle, the horse tosses its head up with
    // a squeezed blink and its ears back — its hooves stay where they are
    // (Round 6: the horse sidesteps, the plume whips, the knight wobbles, the ears flick)
    let side = 0;
    if (st.hurt > 0 && ph !== 'dying') {
      const h = st.hurt * st.hurt, sd = hurtSide(s, st);
      kp -= 0.32 * h; ky -= 0.04 * h; nd -= 0.14 * h; tt += 0.08 * h; plX += 0.4 * h;
      nk -= 0.3 * h; hx -= 0.18 * h; ear -= 0.7 * h; eyeK = Math.min(eyeK, 1 - 0.7 * h); tl += 0.3 * h;
      side = 0.12 * sd * Math.sin(PI * Math.min(1, st.hurt)); hw += 0.08 * sd * h; plZ += 0.6 * sd * h; plX += 0.4 * h;
      ks += Math.sin(s.t * 22) * 0.1 * h; s.ekS = sd;
    }
    // before he notices Feza: the horse grazes (head down, chewing), the knight polishes his visor with his mitten
    if (pre > 0.01) {
      nk += 1.2 * pre; hx += 0.45 * pre; jaw += (0.05 + 0.12 * Math.max(0, Math.sin(s.t * 9))) * pre; ear -= 0.2 * pre; eyeK *= 1 - 0.25 * pre; hyw += Math.sin(s.t * 0.7) * 0.1 * pre;
      poseL(SV_LPOLISH, pre); lZ += Math.sin(s.t * 8) * 0.14 * pre; lY += Math.sin(s.t * 8 + 1.2) * 0.1 * pre; nd += 0.1 * pre; tn -= 0.1 * pre;
    }
    // cut short up on its hind legs (cheered up, or Feza napped and the knight calmed down): the horse comes down by itself and
    // lands with a little squash instead of snapping to the ground
    if (ph !== 'rear' && s.rearA > 0) {
      s.rearV = (s.rearV || 0) + 7 * dt; s.rearA = Math.max(0, s.rearA - s.rearV * dt);
      const k = s.rearA / 0.72;
      hp -= s.rearA; LG.FL[0] -= 0.95 * k; LG.FR[0] -= 0.95 * k; LG.FL[1] += 1.35 * k; LG.FR[1] += 1.35 * k; LG.BL[0] += s.rearA * 0.92; LG.BR[0] += s.rearA * 0.92;
      kp += s.rearA * 0.62; nk -= 0.3 * k;
      if (s.rearA <= 0) s.landT = 1;
    }
    if (s.landT > 0) { sq = Math.max(sq, Math.sin(PI * (1 - s.landT))); s.landT = Math.max(0, s.landT - dt / 0.3); }
    // any other phase cut short (a phase ends in its rest pose; a nap or the goodbye may come in the middle): blend out of the
    // pose it left over a quarter of a second
    const pose = s.pose || (s.pose = new Float32Array(13));
    // (also when the same phase starts over: its phaseT jumps back)
    if (s.lastPh !== ph || t < (s.lastT ?? 0) - 0.05) { s.lastPh = ph; s.pose0 = s.pose0 || new Float32Array(13); s.pose0.set(pose); s.bl = s.t > 0.1 ? 1 : 0; }
    s.lastT = t;
    if (s.bl > 0) {
      s.bl = Math.max(0, s.bl - dt / 0.25); const k = smooth01(s.bl), P = s.pose0;
      hp = lerp(hp, P[0], k); hy = lerp(hy, P[1], k); nk = lerp(nk, P[2], k); hx = lerp(hx, P[3], k); kp = lerp(kp, P[4], k); psi = lerp(psi, P[5], k); phi = lerp(phi, P[6], k);
      tw = lerp(tw, P[7], k); rX = lerp(rX, P[8], k); lX = lerp(lX, P[9], k); lY = lerp(lY, P[10], k); lZ = lerp(lZ, P[11], k); lF = lerp(lF, P[12], k);
    }
    pose[0] = hp; pose[1] = hy; pose[2] = nk; pose[3] = hx; pose[4] = kp; pose[5] = psi; pose[6] = phi; pose[7] = tw; pose[8] = rX; pose[9] = lX; pose[10] = lY; pose[11] = lZ; pose[12] = lF;
    // the trot's placed hooves (targets from the trot block), with the horse's final lift and pitch: the fetlock over the spot,
    // the hoof kept flat on the ground, in the air flicked up (its sole turned back) as high as it is lifted, so it clears.
    // The horse's yaw (the sweep turns him about the hind hips) and roll are undone at the hooves: the spot (off its line when
    // he turns on a planted hoof) is turned back into the horse's frame (fore-aft for the IK) and the leg leans out / in
    // (splay) to reach it sideways, the hoof kept level (a placed leg takes this splay instead of the pose's: the sweep's
    // braced legs would slide the planted hooves apart).
    const FT = s.ft || (s.ft = { FL: 0, FR: 0, BL: 0, BR: 0 }), FZ = s.fz || (s.fz = { FL: 0, FR: 0, BL: 0, BR: 0 });
    const cw = Math.cos(hw), sw = Math.sin(hw);
    for (const [n, sd, z0] of SV_LEGS) {
      FT[n] = FZ[n] = 0;
      if (gk <= 0.002) continue;
      const x = 0.32 * sd, X = x + TX[n], Z = TZ[n] + 0.7, zl = X * sw + Z * cw - 0.7, dx = X * cw - Z * sw - x, hh = hy + x * Math.sin(hr);   // (hh: the roll lifts one hip, lowers the other)
      const spl = Math.asin(clamp(dx / (0.9 + hh - SV_FET - TY[n]), -0.6, 0.6)) - hr;
      svLegIK(z0, zl, TY[n] + SV_FET, hh, hp, _ik, Math.cos(spl + hr));
      LG[n][0] = lerp(LG[n][0], _ik[0], gk); LG[n][1] = lerp(LG[n][1], _ik[1], gk); LG[n][2] = lerp(LG[n][2], spl, gk);
      FT[n] = (Math.min(0.7, 2.2 * TY[n]) - (hp + LG[n][0] + LG[n][1])) * gk;   // (the hoof's world tilt − the shin's)
      FZ[n] = -(LG[n][2] + hr) * gk;
    }
    // ── apply: the horse ──
    B.horse.position.y += hy; B.horse.position.x += side; B.horse.rotation.set(hp, hw, hr);
    if (sq > 0.001) B.horse.scale.set(1 + 0.04 * sq, 1 - 0.07 * sq, 1 + 0.03 * sq);
    for (const [n] of SV_LEGS) { B['leg' + n].rotation.set(LG[n][0], 0, LG[n][2]); B['shin' + n].rotation.x = LG[n][1]; B['hoof' + n].rotation.set(FT[n], 0, FZ[n]); }
    B.hNeck.rotation.set(nk, hyw * 0.35, hz * 0.3);
    B.hHead.rotation.set(hx - nk * 0.45, hyw * 0.65, hz * 0.7);
    B.hJaw.rotation.x = jaw;
    for (const [b, sd] of [[B.hEarL, 1], [B.hEarR, -1]]) { b.rotation.x = ear * 0.35 + Math.sin(s.t * 2.3 + sd) * 0.04; b.rotation.z = sd * (0.08 + (ear < 0 ? -ear * 0.25 : 0)) + (s.ekS === sd ? Math.min(0, ear) * 0.3 * sd : 0); }
    B.hEyes.scale.y = eyeK;
    B.hPupL.rotation.set(-lookY, look - 0.42 * cross, 0); B.hPupR.rotation.set(-lookY, look + 0.42 * cross, 0);
    B.hTongue.scale.setScalar(tongue > 0.02 ? tongue : 0.0001);
    B.tail0.rotation.set(-tl * 0.8, 0, tsw); B.tail1.rotation.set(-tl * 0.4, 0, tsw * 0.8 + Math.sin(s.t * 2.6 + s.ph) * 0.08);
    // ── apply: the knight ──
    B.kHips.position.y += ky; B.kHips.rotation.x = kp;
    B.body.rotation.set(0, tw, ks); if (puff) B.body.scale.setScalar(1 + puff);
    B.head.rotation.set(nd + Math.sin(s.t * 1.1 + s.ph) * 0.02, tn, tt + Math.sin(s.t * 0.9 + s.ph) * 0.03);
    B.kLegL.rotation.z = 1.2 * ky; B.kLegR.rotation.z = -1.2 * ky;   // (his short legs flap as he bounces)
    B.armR.rotation.set(rX, rY, rZ); B.foreR.rotation.set(rF, 0, 0);
    B.armL.rotation.set(lX, lY, lZ); B.foreL.rotation.set(lF, 0, 0);
    holdDir(B.lance, SV_Y, svDir(psi, phi, _lv), B.kHips);
    B.shoe.scale.setScalar(shoe ? 1 : 0.0001);
    B.hornH.scale.setScalar(horn ? 1 + 0.12 * hornP : 0.0001); B.hornB.scale.setScalar(horn ? 0.0001 : 1);
    if (horn) {   // the mouthpiece at his lips (the tube stretched to reach them: chibi arms), the bell out in front of his hand
      m.marker('kMouth', _hw); B.hornH.getWorldPosition(_ap); _hw.sub(_ap);
      B.body.getWorldQuaternion(_uq); holdBasis(B.hornH, _hw, _av.set(0, 0.3, 1).applyQuaternion(_uq));
      B.hornH.scale.y *= clamp(_hw.length() / 0.34, 0.85, 1.3);
    }
    B.stars.scale.setScalar(stars > 0.01 ? stars : 0.0001); B.stars.rotation.y = s.t * 4.5; B.stars.rotation.z = Math.sin(s.t * 2.2) * 0.12;
    s.plV = damp(s.plV || 0, plX - kp * 0.6 - nd * 0.4, 6, dt);
    B.plume.rotation.set(s.plV + Math.sin(s.t * 2.1 + s.ph) * 0.05, 0, plZ + Math.sin(s.t * 1.7 + s.ph) * 0.04 - tt * 0.5);
    if (helm > 0.001) {   // the goodbye: the helmet lifts off and rides in his waving left hand (held by its rim)
      m.marker('muzzle', _hw); _hw.y += 0.26;
      B.head.worldToLocal(_hw);
      B.helm.position.lerp(_hw, helm); B.helm.rotation.set(0.3 * helm, 0, (0.5 + 0.3 * Math.sin(s.t * 11)) * helm);
    }
  }

  // Names change; combat identifiers and every numeric combat value stay intact.
  const NIGHT_NAMES={"jole":"Çürük Ruh","mantar":"Zehir Kâhini","yarasa":"Gece Dişi","goblin":"Kemik Yağmacısı","kostebek":"Mezar Kemireni","salyangoz":"Kabuklu Çürüme","hayalet":"Yeminli Hortlak","golem":"Mezar Devi","asker":"Kara Lejyon","atescik":"Kül Ruhu","ejderha":"Gece Yutan","kaplumbaga":"Kül Kabuğu","ateskusu":"Köz Akbabası","kraljole":"Çürük Taç","kostebekusta":"Mezar Kazıcısı","lavkaplumbaga":"Kül Muhafızı","yogurt":"Veba Taşıyıcısı","kaymak":"Sürünen Çürüme","kopuk":"Boğulmuş Ruh","peynir":"Kemik Yığını","kefirdev":"Veba Rahibi","nobetci":"Zalim Nöbetçi","simitci":"Halka Celladı","supurgeci":"Mezar Süpüren","tellal":"Ölüm Tellalı","sovalye":"Yeminbozan"};
  for(const type of Object.keys(NIGHT_NAMES)){
    EDEF[type].ad=NIGHT_NAMES[type];
    EDEF[type].eliteAd=EDEF[type].kind==='boss'?NIGHT_NAMES[type]:'Kadim '+NIGHT_NAMES[type];
  }
  // ════════════════ Instances ════════════════
  const TYPES = {
    jole: [buildJole, animJole], mantar: [buildMantar, animMantar], yarasa: [buildYarasa, animYarasa], goblin: [buildGoblin, animGoblin],
    kostebek: [buildKostebek, animKostebek], salyangoz: [buildSalyangoz, animSalyangoz], hayalet: [buildHayalet, animHayalet], golem: [buildGolem, animGolem], asker: [buildAsker, animAsker],
    atescik: [buildAtescik, animAtescik], ejderha: [buildEjderha, animEjderha],
    kaplumbaga: [buildKaplumbaga, animKaplumbaga], ateskusu: [buildAteskusu, animAteskusu],
    kraljole: [buildKraljole, animKraljole], kostebekusta: [buildKostebekusta, animKostebekusta], lavkaplumbaga: [buildLavkaplumbaga, animLavkaplumbaga],
    yogurt: [buildYogurt, animYogurt], kaymak: [buildKaymak, animKaymak], kopuk: [buildKopuk, animKopuk], peynir: [buildPeynir, animPeynir],
    kefirdev: [buildKefirdev, animKefirdev],
    nobetci: [buildNobetci, animNobetci], simitci: [buildSimitci, animSimitci], supurgeci: [buildSupurgeci, animSupurgeci], tellal: [buildTellal, animTellal],
    sovalye: [buildSovalye, animSovalye],
  };
  // Model variants per type (first = default). ZONES[i].variants picks among them (kefir: jole 'muhallebi'; volcano: jole 'lava',
  // golem 'magma').
  const VARIANTS = { jole: ['green', 'pink', 'blue', 'purple', 'lava', 'muhallebi'], golem: ['rock', 'magma'] };
  const isBossType = t => !!(EDEF[t] && EDEF[t].kind === 'boss');

  function boneMask(r,b,p,R,kind=0){
    r.on(b).fx(0,.3).add(G.dodeca(),'#aba18a',p,null,[R*.83,R,R*.67]);
    for(const side of [-1,1]){
      r.fx(0,0).add(G.rbox(1),'#17141a',[p[0]+side*R*.29,p[1]+R*.13,p[2]+R*.64],[0,0,side*.32],[R*.41,R*.25,R*.045]);
      r.fx(1,0).add(G.rbox(1),hdr('#ba342d',1.8),[p[0]+side*R*.29,p[1]+R*.12,p[2]+R*.67],[0,0,side*.32],[R*.20,R*.043,R*.014]);
      r.fx(0,.3).add(G.rbox(1),'#756b5c',[p[0]+side*R*.32,p[1]+R*.30,p[2]+R*.64],[0,0,side*.26],[R*.45,R*.085,R*.04]);
      r.add(G.rbox(1),'#b4a78e',[p[0]+side*R*.46,p[1]-R*.39,p[2]+R*.48],[0,0,-side*.25],[R*.15,R*.25,R*.10]);
    }
    r.fx(0,0).add(G.rbox(1),'#21171e',[p[0],p[1]-R*.65,p[2]+R*.51],null,[R*.66,R*.18,R*.07]);
    r.fx(0,.3);for(let j=-2;j<=2;j++)r.add(G.cone(6),'#c1b59b',[p[0]+j*R*.13,p[1]-R*.73,p[2]+R*.57],[0,0,PI],[R*.043,R*(j%2?.21:.14),R*.045]);
    if(kind)for(const side of [-1,1])cone(r,[p[0]+side*R*.60,p[1]+R*.62,p[2]],[side*.3,1,-.2],R*.9,R*.15,'#8f897a');
  }
  function darkBoss(r,type,d){
    // All existing bones, markers and combat timing remain available to the original animators.
    r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
    const B=n=>r.bones[r.map[n]].pos, iron='#4a494b',bone='#a79980',shade='#24262c',ember='#ac3b38';
    const claw=(name,p,sd,rad=.10)=>{r.on(name).fx(0,.35);for(let j=0;j<3;j++)cone(r,[p[0]+sd*j*rad*.8,p[1],p[2]+j*.04],[sd*.22,-.8,.6],rad*3.1,rad*.28,bone);};
    if(type==='kraljole'){
      r.on('body').fx(0,.22).add(G.sphere(28,20),shade,[0,1.06,-.06],null,[1.00,.91,.74]);
      for(let j=-3;j<=3;j++)cone(r,[j*.22,.54,-.12],[j*.12,-1,.10],.58,.20,j%2?'#343332':'#2c2e34');
      for(let j=0;j<5;j++){const y=.61+j*.20;for(const sd of [-1,1])r.seg([sd*.06,y,.73],[sd*(.77-j*.09),y+.08,.47],.055,bone,.042,10);}
      boneMask(r,'body',[0,1.82,.48],.55,0);
      r.on('body').seg([0,1.34,.73],[0,.60,.75],.053,'#756c61',.038,10);
      for(const sd of [-1,1]){r.on(sd>0?'armL':'armR').seg([sd*.75,1.37,.03],[sd*1.30,.91,.28],.10,iron,.09,12).add(G.sphere(16,12),iron,[sd*1.38,.90,.32],null,[.21,.16,.15]);claw(sd>0?'armL':'armR',[sd*1.39,.86,.39],sd,.09);}
      const cp=B('crown');r.on('crown').fx(0,.65).add(G.torus(TAU,.09,24),'#837357',[0,cp[1]+.09,cp[2]],[PI/2,0,0],[.68,.68,.45]);
      for(let j=0;j<7;j++){const a=j/7*TAU;r.add(G.rbox(2),'#9e8760',[Math.sin(a)*.64,cp[1]+.22+(j%3)*.05,cp[2]+Math.cos(a)*.43],[0,0,Math.sin(a)*-.12],[.08,.29+(j%3)*.08,.065]);}
      r.on('scep').seg([-1.74,.28,.45],[-1.84,1.85,.52],.055,'#51473e',.045,12);boneMask(r,'gem',[-1.86,1.77,.56],.20,1);
      r.on('cape').fx(0,.15);for(let j=-2;j<=2;j++)r.seg([j*.23,1.70,-.75],[j*.30,.16,-.92],.14,'#493036',.065,8);
    }else if(type==='kefirdev'){
      r.on('body').fx(0,.25).add(G.cyl(.48,1,28),'#303830',[0,1.08,-.04],null,[.85,1.93,.74]);
      for(let j=0;j<7;j++){const a=j/7*TAU;cone(r,[Math.sin(a)*.71,.48,Math.cos(a)*.66],[Math.sin(a)*.1,-1,Math.cos(a)*.1],.46,.12,'#282c2d');}
      r.on('foam').add(G.sphere(28,20),shade,[0,2.33,.015],null,[.66,.62,.54]);
      boneMask(r,'foam',[0,2.38,.32],.40,0);cone(r,[0,2.31,.57],[0,-.35,1],.57,.16,'#b5a58a');
      r.on('cap').fx(0,.4);for(const sd of [-1,1]){r.seg([sd*.4,2.62,0],[sd*.65,2.87,-.13],.075,iron,.035,10);cone(r,[sd*.65,2.87,-.13],[-sd*.3,1,-.2],.24,.043,bone);}
      for(const sd of [-1,1]){const n=sd>0?'armL':'armR';r.on(n).seg([sd*.72,1.94,0],[sd*1.10,1.17,.12],.15,'#42423f',.085,12);claw(n,[sd*1.09,1.12,.18],sd,.11);}
      r.on('body').fx(0,.65);for(let j=0;j<7;j++)r.add(G.torus(TAU,.25,12),'#91846a',[.12*Math.sin(j*.8),1.87-j*.18,.77],[0,0,j%2?PI/2:0],[.074,.09,.042]);
      r.add(G.cyl(.7,1,16),'#756853',[0,.54,.82],null,[.18,.24,.18]);r.fx(.7,.2).add(G.octa(),hdr('#889a45',1.8),[0,.61,.82],null,[.10,.11,.10]);
      for(const sd of [-1,1])r.on(sd>0?'footL':'footR').fx(0,.3).add(G.rbox(2),iron,[sd*.43,.12,.28],null,[.34,.24,.58]);
    }else if(type==='kostebekusta'){
      r.on('body').fx(0,.15).add(G.sphere(28,20),'#38312e',[0,.84,-.02],null,[.89,.79,.76]);
      for(let j=0;j<4;j++)r.add(G.rbox(2),j%2?'#5b5144':'#4a4540',[0,.60+j*.22,.71],[.1,0,0],[1.05-j*.12,.13,.09]);
      boneMask(r,'head',[0,1.68,.32],.51,0);
      r.on('hat').fx(0,.65).add(G.rbox(2),iron,[0,2.015,.48],null,[.79,.12,.15]);
      for(const sd of [-1,1]){r.on('head').seg([sd*.41,1.98,-.04],[sd*.53,2.16,-.22],.070,'#6c6557',.030,10);cone(r,[sd*.53,2.16,-.22],[0,.6,-1],.23,.034,bone);}
      r.on('drill').fx(0,.6);for(let j=0;j<3;j++)r.add(G.cone(10),iron,[0,2.28+j*.115,-.18],[0,0,0],[.26-j*.05,.22,.26-j*.05]);
      for(const sd of [-1,1]){const n=sd>0?'armL':'armR';r.on(n).add(G.sphere(20,14),iron,[sd*.83,1.14,.05],null,[.34,.40,.34]);r.seg([sd*.8,1.16,.2],[sd*1.20,.67,.70],.18,'#4f443b',.15,12);claw(n,[sd*1.19,.62,.77],sd,.14);}
      for(const sd of [-1,1])r.on(sd>0?'footL':'footR').add(G.sphere(16,12),iron,[sd*.39,.13,.34],null,[.29,.16,.40]);
      r.on('body').add(G.rbox(2),'#49403a',[0,1.21,-.74],[.15,0,0],[.64,1.0,.15]);for(let j=0;j<5;j++)cone(r,[0,.95+j*.16,-.83],[0,.3,-1],.19,.044,bone);
      r.on('mound').add(rockGeo(16),'#554536',[0,.10,0],null,[1.12,.40,1.09]);r.on('clod').add(rockGeo(17),'#554536',B('clod'),null,.43);
    }else if(type==='lavkaplumbaga'){
      const C=[0,1.02,-.10],A=[1.47,1.04,1.60];r.on('body');turtleShell(r,C,A,[.66,.90,1.13,1.35,1.56],[7,10,12,14,17],{scute:'#393635',scuteD:'#201f25',seam:'#aa3f26',rim:'#302c2c',plastron:'#494039'});
      for(let j=0;j<9;j++){const a=j/9*TAU;cone(r,[Math.sin(a)*1.16,1.42,Math.cos(a)*1.18-.12],[Math.sin(a)*.4,1,Math.cos(a)*.4],.54+(j%3)*.14,.14,'#4b4440');}
      r.on('body');const top=volcano(r,[0,1.54,-.10],.80,1.0,{key:'DARK',rock:'#423938',rockD:'#221e25',ash:'#78685a',drips:5});
      r.on('lava').fx(.65,.1).add(G.sphere(20,12),hdr('#b64a25',2.0),[0,top[1]-.10,-.1],null,[.48,.045,.48]);
      boneMask(r,'head',[0,.98,1.63],.45,0);r.on('head').add(G.rbox(2),'#4b4038',[0,.91,1.52],[.15,0,0],[.77,.30,.42]);
      for(const sd of [-1,1])cone(r,[sd*.34,1.25,1.49],[sd*.3,.65,-.1],.31,.06,bone);
      for(const [n,sx,sz] of [['legFL',1,1],['legFR',-1,1],['legBL',1,-1],['legBR',-1,-1]]){r.on(n).fx(0,.35).seg([sx*.98,.77,sz*.95],[sx*1.24,.24,sz*1.04],.29,'#4c4240',.25,14).add(G.sphere(18,12),'#393336',[sx*1.25,.17,sz*1.07],null,[.36,.18,.36]);for(let j=-1;j<=1;j++)cone(r,[sx*1.25+j*.13,.14,sz*1.07+.24],[0,-.2,1],.20,.044,bone);}
      r.on('tail');cone(r,[0,.72,-1.48],[0,-.12,-1],.65,.17,'#51433b');
    }else if(type==='sovalye'){
      // An armoured skeletal horse carries an antler-crowned executioner.
      r.on('horse').fx(0,.3).add(G.sphere(28,20),shade,[0,1.14,-.25],null,[.57,.55,.95]);
      for(let j=0;j<5;j++){const z=-.93+j*.29;for(const sd of [-1,1])r.seg([sd*.12,1.57,z],[sd*.54,1.08,z+.07],.055,bone,.039,10);}
      for(const [n,sd,z]of SV_LEGS){r.on('leg'+n).seg([sd*.32,1.04,z],[sd*.32,.44,z+.01],.10,iron,.07,10);r.on('shin'+n).seg([sd*.32,.44,z+.01],[sd*.32,.14,z+.03],.07,bone,.058,10);r.on('hoof'+n).add(G.rbox(2),iron,[sd*.32,.10,z+.05],null,[.28,.20,.34]);}
      r.on('hNeck').seg(SV_N0,[0,2.03,1.20],.18,'#333034',.13,14);boneMask(r,'hHead',[0,2.13,1.53],.35,0);
      for(const sd of [-1,1]){r.on('hHead').seg([sd*.20,2.39,1.24],[sd*.24,2.62,1.13],.049,iron,.025,10);cone(r,[sd*.24,2.62,1.13],[sd*.25,.8,-.3],.17,.026,bone);}
      const hp=B('head'),bp=B('body'),ky=hp[1]+.19,kz=hp[2]+.12;
      r.on('body').add(G.rbox(2),iron,[0,bp[1]+.12,bp[2]],[.06,0,0],[.62,.62,.43]);sunCrest(r,[0,bp[1]+.16,bp[2]+.23],null,.28);
      r.on('helm').add(G.sphere(24,18),iron,[0,ky,kz],null,[.36,.35,.32]);r.add(G.rbox(2),shade,[0,ky-.01,kz+.30],null,[.45,.15,.045]);r.fx(.4,.1).add(G.rbox(1),hdr(ember,1.4),[0,ky+.01,kz+.329],null,[.31,.018,.008]);
      for(const sd of [-1,1]){r.on('helm').fx(0,.35).seg([sd*.27,ky+.23,kz-.06],[sd*.48,ky+.48,kz-.10],.056,bone,.021,10);cone(r,[sd*.48,ky+.48,kz-.10],[0,1,-.2],.20,.026,bone);const an=sd>0?'armL':'armR',fn=sd>0?'foreL':'foreR';r.on(an).add(G.sphere(18,12),iron,B(an),null,[.24,.14,.25]);cone(r,[B(an)[0],B(an)[1]+.08,B(an)[2]],[sd*.35,1,0],.19,.045,bone);r.on(fn).seg(B(an),B(fn),.10,iron,.078,10);}
      r.on('lance').seg(SV_HANDR,[SV_HANDR[0],SV_HANDR[1]-.04,SV_HANDR[2]+1.86],.043,'#655744',.031,12);cone(r,[SV_HANDR[0],SV_HANDR[1]-.04,SV_HANDR[2]+1.72],[0,0,1],.44,.09,iron);
      r.on('foreL').add(G.rbox(2),iron,[B('foreL')[0],B('foreL')[1],B('foreL')[2]+.12],[.05,0,.1],[.46,.64,.09]);
      r.on('tail0').seg([0,1.50,-1.04],[0,.96,-1.55],.09,'#29292e',.05,10);r.on('tail1').seg([0,.96,-1.55],[.09,.58,-1.76],.05,bone,.011,8);
    }else if(type==='ejderha'){
      r.on('body').fx(0,.25).add(G.sphere(32,22),shade,[0,1.65,-.10],null,[.94,1.27,.86]);
      for(let j=0;j<6;j++){const y=.65+j*.31,w=.79*Math.sin((j+1)/7*PI);for(const sd of [-1,1])r.seg([0,y, .88],[sd*w,y+.09,.68],.072,bone,.051,12);}
      r.on('chest').seg([0,1.43,.92],[0,2.62,.66],.067,'#796e5f',.052,12);
      r.on('neck').seg([0,2.27,.19],[0,3.41,.77],.27,'#39343a',.23,16);boneMask(r,'head',[0,3.43,1.17],.70,0);
      r.on('head').add(G.rbox(2),'#817663',[0,3.20,1.83],[.08,0,0],[.93,.28,.77]);
      for(const sd of [-1,1])r.add(G.rbox(1),'#1c161d',[sd*.25,3.26,2.219],[.08,0,sd*.20],[.15,.077,.018]);
      r.on('jaw').add(G.rbox(2),'#605343',[0,3.06,1.58],[.04,0,0],[.96,.18,1.14]);
      for(const sd of [-1,1]){r.on('head').seg([sd*.52,3.84,.72],[sd*.79,4.18,.37],.11,bone,.07,12);cone(r,[sd*.79,4.18,.37],[sd*.12,1,-.4],.38,.07,bone);for(let j=0;j<5;j++){const z=2.05-j*.18;cone(r,[sd*(.37+j*.02),3.16,z],[0,-1,.04],.18+(j%2)*.07,.045,bone);r.on('jaw');cone(r,[sd*(.35+j*.02),3.05,z-.08],[0,1,.03],.16,.04,bone);r.on('head');}}
      for(const sd of [-1,1]){const n=sd>0?'wingL':'wingR';r.on(n).fx(0,.25);const O=[sd*.62,2.72,-.55],P=[[sd*1.15,3.40,-.62],[sd*2.36,3.30,-1.06],[sd*3.0,2.15,-1.35],[sd*2.13,1.68,-1.25]];r.seg(O,P[0],.12,bone,.095,14);for(let j=1;j<P.length;j++)r.seg(P[0],P[j],.075,bone,.038,12);
        const verts=[];for(let j=1;j<P.length-1;j++)verts.push(...P[0],...P[j],...P[j+1],...P[j+1],...P[j],...P[0]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();r.fx(0,.05).add(geo,'#3b2931');
        for(let j=1;j<P.length;j++)cone(r,P[j],[sd*.30,-.4,-.2],.25,.045,bone);
        const an=sd>0?'armL':'armR',ln=sd>0?'legL':'legR';r.on(an).fx(0,.2).seg([sd*.82,2.12,.50],[sd*1.11,1.03,1.01],.15,'#4a3c3b',.11,14);claw(an,[sd*1.12,.91,1.04],sd,.13);r.on(ln).seg([sd*.65,1.01,.05],[sd*.84,.20,.32],.23,iron,.17,14).add(G.sphere(18,12),iron,[sd*.84,.15,.46],null,[.27,.16,.37]);claw(ln,[sd*.81,.15,.68],sd,.12);
      }
      const tp=[[0,.85,-.95],[.06,.58,-1.62],[.26,.42,-2.22],[.58,.36,-2.72],[.95,.36,-3.1],[1.25,.4,-3.38]];for(let j=0;j<5;j++){r.on('t'+(j+1)).seg(tp[j],tp[j+1],.24-j*.037,'#49403e',.20-j*.032,12);cone(r,tp[j],[0,.7,-.3],.26-j*.025,.061,bone);}
      r.on('glow').fx(.7,0).add(G.octa(),hdr('#b74636',1.6),[0,3.16,2.01],null,[.19,.08,.11]);
    }
    if(type==='kraljole')d.portrait={cx:0,cy:1.87,cz:.45,rad:.90};
    r.fx(0,0);d.glowC=col(ember);d.mat=Object.assign({},d.mat,{sss:0,rough:.62});return d;
  }
  function darkSilhouette(r,type,o,d){
    if(isBossType(type))return darkBoss(r,type,d);
    if(['kostebek','salyangoz','golem'].includes(type)){
      r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
      const iron='#45434a',bone='#a49174';
      if(type==='kostebek'){
        r.on('body').add(G.dodeca(),'#383333',[0,.30,-.05],null,[.35,.28,.33]);
        r.on('head').add(G.dodeca(),'#655a4b',[0,.58,.06],null,[.26,.24,.22]);cone(r,[0,.52,.22],[0,-.1,1],.26,.10,'#887b67');
        for(const sd of [-1,1]){r.add(G.rbox(1),'#16121a',[sd*.107,.64,.246],[0,0,sd*.27],[.15,.055,.020]);r.fx(.8,0).add(G.rbox(1),hdr('#aa4331',1.4),[sd*.107,.637,.26],[0,0,sd*.27],[.082,.012,.006]);r.fx(0,.2);cone(r,[sd*.12,.47,.32],[0,-1,.1],.13,.020,bone);r.on(sd>0?'armL':'armR').seg([sd*.27,.40,.08],[sd*.39,.19,.23],.085,iron,.065,10);for(let j=0;j<3;j++)cone(r,[sd*.38+j*.038,.18,.25],[0,-.15,1],.19,.021,bone);r.on(sd>0?'footL':'footR').add(G.rbox(1),iron,[sd*.15,.06,.08],null,[.15,.10,.23]);r.on('head');}
        r.on('body');for(let j=0;j<5;j++)cone(r,[0,.42,-.31+j*.05],[0,.55,-1],.17,.041,bone);
        r.on('mound').add(rockGeo(13),'#514236',[0,.03,0],null,[.44,.13,.44]);r.on('shovel').seg([-.33,.25,.2],[-.37,.81,.20],.025,'#65513b',.023,8).add(G.rbox(1),iron,[-.37,.86,.2],[0,0,.13],[.22,.19,.025]);
      }else if(type==='salyangoz'){
        r.on('body').add(G.sphere(20,14),'#3d3739',[0,.115,-.04],null,[.26,.11,.55]);r.on('shell').add(shellGeo(),'#544636',SHELL_C,[0,0,SHELL_ROLL],SHELL_S);
        for(let j=0;j<7;j++){const a=j*TAU/7;cone(r,[.02+Math.sin(a)*.20,.46+Math.cos(a)*.29,-.14],[Math.sin(a)*.25,Math.cos(a)*.4,-.30],.21,.037,bone);}
        r.on('head').add(G.dodeca(),'#746856',[0,.42,.34],null,[.17,.20,.18]);r.add(G.rbox(1),'#15131a',[0,.39,.506],null,[.22,.12,.016]);for(let j=-2;j<=2;j++)cone(r,[j*.038,.44,.515],[0,-1,.10],.085,.012,bone);
        for(const sd of [-1,1]){r.on(sd>0?'stalkL':'stalkR').seg([sd*.09,.52,.31],[sd*.15,.80,.35],.026,iron,.020,8);r.on(sd>0?'eyeL':'eyeR').add(G.dodeca(),'#584a3d',[sd*.15,.81,.35],null,[.10,.084,.060]);r.add(G.rbox(1),'#15121a',[sd*.15,.82,.409],[0,0,sd*.20],[.12,.035,.012]);r.fx(.8,0).add(G.rbox(1),hdr('#ac4332',1.4),[sd*.15,.82,.417],[0,0,sd*.20],[.077,.010,.006]);r.fx(0,0);}
      }else{
        const magma=o.variant==='magma',stone=magma?'#453630':'#383a3d',hot=magma?'#ab442c':'#826b4e';delete d.lava;
        r.on('hips').add(rockGeo(3),stone,[0,.83,-.03],null,[.50,.33,.43]);r.on('torso').add(rockGeo(1),stone,[0,1.49,-.06],null,[.85,.65,.64]);
        for(let j=0;j<4;j++){const y=1.15+j*.22;for(const sd of [-1,1])r.add(G.rbox(1),'#5b5146',[sd*.20,y,.59],[.12,0,-sd*.13],[.36,.095,.075]);}
        r.on('head').add(G.dodeca(),stone,[0,2.03,.28],null,[.43,.37,.35]);for(const sd of [-1,1]){r.add(G.rbox(1),'#17121a',[sd*.17,2.14,.61],[0,0,sd*.23],[.24,.081,.025]);r.fx(.8,0).add(G.rbox(1),hdr(hot,1.5),[sd*.17,2.13,.63],[0,0,sd*.23],[.14,.025,.012]);r.fx(0,0);}
        r.add(G.rbox(1),'#17121a',[0,1.93,.61],null,[.40,.17,.033]);for(let j=-2;j<=2;j++)cone(r,[j*.069,2.00,.638],[0,-1,0],.11,.022,bone);
        for(const sd of [-1,1]){const an=sd>0?'armL':'armR',fn=sd>0?'foreL':'foreR',ln=sd>0?'legL':'legR';r.on(an).add(rockGeo(2),stone,[sd*.84,1.78,0],null,[.39,.36,.37]);for(let j=0;j<3;j++)cone(r,[sd*(.71+j*.13),2.05,-.07],[sd*.15,1,-.12],.25+j*.05,.065,bone);r.on(fn).add(rockGeo(6),stone,[sd*1.04,.94,.12],null,[.43,.44,.39]);for(let j=0;j<3;j++)cone(r,[sd*1.04+(j-1)*.12,.65,.39],[0,-.2,1],.22,.041,bone);r.on(ln).add(rockGeo(8),stone,[sd*.37,.34,.02],null,[.32,.36,.33]);}
        r.on('torso').fx(.7,0);for(let j=0;j<4;j++){r.seg([-.18+j*.12,1.13,.64],[-.12+j*.11,1.45,.61],.012,hdr(hot,1.6),.009,6);r.seg([-.12+j*.11,1.45,.61],[-.20+j*.12,1.75,.57],.010,hdr(hot,1.6),.008,6);}
      }
      d.mat=Object.assign({},d.mat,{sss:0,rough:.75,rim:'#8a7864',rimK:.16});d.glowC=col('#a24932');r.fx(0,0);return d;
    }
    if(type==='asker'||type==='goblin'){
      r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
      const legion=type==='asker',iron='#45474d',shade='#292831',bone='#a4987c',hy=legion?1.13:.95,cy=legion?.65:.49,ay=legion?.78:.62,ly=legion?.43:.35;
      r.on('body').add(G.rbox(2),iron,[0,cy,-.005],[.055,0,0],[.43,legion?.49:.40,.33]);
      for(let j=0;j<3;j++)r.add(G.rbox(1),legion?'#6d6660':'#847763',[0,cy+.13-j*.12,.18],[.10,0,0],[.34-j*.045,.055,.023]);
      r.add(G.rbox(1),shade,[0,cy-.17,-.03],null,[.44,.08,.37]);
      for(const sd of [-1,1]){
        const an=sd>0?'armL':'armR',ln=sd>0?'legL':'legR';r.on(an).seg([sd*.24,ay,0],[sd*.31,ay-.24,.07],.072,iron,.053,10).add(G.rbox(2),shade,[sd*.32,ay-.25,.08],null,[.12,.14,.13]);
        r.add(G.dodeca(),iron,[sd*.25,ay+.03,0],null,[.15,.10,.14]);cone(r,[sd*.26,ay+.09,0],[sd*.2,1,-.10],legion?.18:.12,.040,bone);
        r.on(ln).seg([sd*.11,ly,0],[sd*.13,.13,0],.070,iron,.056,10).add(G.rbox(2),shade,[sd*.13,.07,.05],null,[.17,.13,.25]);
      }
      if(legion){
        r.on('head').add(G.dodeca(),iron,[0,hy,.0],null,[.27,.28,.25]);r.add(G.rbox(1),'#15141c',[0,hy+.01,.242],null,[.42,.10,.027]);
        r.fx(.8,0).add(G.rbox(1),hdr('#b04432',1.4),[0,hy+.027,.26],null,[.30,.016,.008]);r.fx(0,.3);
        for(const sd of [-1,1]){r.add(G.rbox(1),'#756a58',[sd*.19,hy-.12,.20],[0,0,-sd*.25],[.11,.24,.055]);cone(r,[sd*.17,hy+.22,-.10],[sd*.45,1,-.20],.27,.048,bone);}
        r.add(G.rbox(1),shade,[0,hy-.17,.255],null,[.13,.085,.014]);
        r.on('sword').seg([-.31,.49,.10],[-.32,1.08,.22],.027,'#716757',.019,8);r.add(G.rbox(1),'#96938a',[-.32,.96,.20],[.17,0,0],[.065,.39,.020]);cone(r,[-.32,1.09,.22],[0,1,.2],.19,.036,bone);r.add(G.rbox(1),iron,[-.32,.76,.16],[.17,0,0],[.23,.032,.052]);
      }else{
        r.on('head').add(G.dodeca(),'#4b4c3b',[0,hy,0],null,[.26,.25,.22]);r.add(G.rbox(2),'#645e48',[0,hy-.13,.13],[.14,0,0],[.34,.13,.25]);
        for(const sd of [-1,1]){r.add(G.rbox(1),'#13151a',[sd*.10,hy+.035,.211],[0,0,sd*.30],[.16,.055,.020]);r.fx(.7,0).add(G.rbox(1),hdr('#ab4934',1.4),[sd*.10,hy+.033,.226],[0,0,sd*.30],[.09,.012,.006]);r.fx(0,.1);cone(r,[sd*.12,hy-.11,.26],[sd*.05,1,.08],.17,.028,bone);r.on(sd>0?'earL':'earR');cone(r,[sd*.24,hy+.09,-.03],[sd*.75,.5,-.10],.28,.079,'#4b4c3b');r.on('head');}
        r.add(G.rbox(1),'#191619',[0,hy-.08,.252],null,[.25,.035,.018]);
        r.on('club').seg([-.31,.41,.11],[-.40,.93,-.12],.04,'#514335',.033,8);r.add(G.rbox(2),iron,[-.41,.93,-.12],[0,0,-.24],[.30,.14,.15]);for(let j=-1;j<=1;j++)cone(r,[-.40+j*.075,1.005,-.12],[0,1,0],.13+(j%2)*.035,.026,bone);
      }
      d.mat=Object.assign({},d.mat,{sss:0,rough:.68,rim:'#90826e',rimK:.18});d.glowC=col('#9e4233');r.fx(0,0);return d;
    }
    if(type==='atescik'||type==='ateskusu'){
      r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
      const coal='#333038',bone='#9b8b72',H=d.height||EDEF[type].height;
      if(type==='atescik'){
        r.on('body').add(G.dodeca(),coal,[0,.41,-.025],null,[.33,.40,.25]);
        for(const sd of [-1,1]){r.add(G.rbox(1),'#17121a',[sd*.12,.53,.251],[0,0,sd*.30],[.19,.069,.018]);r.fx(.8,0).add(G.rbox(1),hdr('#be4230',1.4),[sd*.12,.525,.264],[0,0,sd*.30],[.115,.016,.008]);r.fx(0,.1);const n=sd>0?'armL':'armR';r.on(n).seg([sd*.29,.42,0],[sd*.46,.21,.12],.049,coal,.027,8);cone(r,[sd*.46,.21,.12],[sd*.05,-.45,1],.19,.035,bone);r.on('body');}
        r.add(G.rbox(1),'#18111a',[0,.315,.250],null,[.28,.085,.018]);for(let j=-2;j<=2;j++)cone(r,[j*.047,.35,.265],[0,-1,0],.055+(j%2)*.015,.011,bone);
        r.on('top');for(let j=-1;j<=1;j++)cone(r,[j*.19,.67,-.06],[j*.45,1,-.1],j===0?.39:.26,.075,coal);
        r.on('body').fx(.65,0);for(let j=-1;j<=1;j++){r.seg([j*.12,.20,.23],[j*.08+.03,.31,.245],.009,hdr('#a8442c',1.5),.008,6);r.seg([j*.08+.03,.31,.245],[j*.10-.02,.43,.24],.008,hdr('#a8442c',1.5),.006,6);}
      }else{
        r.on('body').add(G.dodeca(),coal,[0,.36,-.06],null,[.25,.32,.25]);r.add(G.dodeca(),'#847663',[0,.54,.12],null,[.22,.21,.19]);
        for(const sd of [-1,1]){r.add(G.rbox(1),'#19151d',[sd*.105,.57,.284],[0,0,sd*.35],[.13,.05,.018]);r.fx(.7,0).add(G.rbox(1),hdr('#b64330',1.4),[sd*.105,.566,.297],[0,0,sd*.35],[.071,.012,.008]);r.fx(0,0);const n=sd>0?'wingL':'wingR';r.on(n).seg([sd*.23,.42,-.03],[sd*.49,.52,-.05],.039,bone,.026,8);for(let j=0;j<4;j++)cone(r,[sd*.36,.42,-.05],[sd*(.3+j*.15),-.25,-.4],.32+j*.035,.035,coal);}
        r.on('beak');cone(r,[0,.47,.29],[0,-.3,1],.24,.064,bone);cone(r,[0,.39,.41],[0,-1,.12],.12,.036,bone);
        r.on('crest');for(let j=-1;j<=1;j++)cone(r,[j*.09,.66,.01],[j*.2,1,-.6],.25+j*.025,.033,'#713e32');
        r.on('tail');for(let j=-1;j<=1;j++)cone(r,[j*.05,.22,-.22],[j*.4,.18,-1],.35,.036,coal);
        r.on('feet');for(const sd of [-1,1])for(let j=-1;j<=1;j++)cone(r,[sd*.095+j*.023,.11,.05],[j*.2,-.4,1],.13,.014,bone);
      }
      d.glowC=col('#9b3b2b');d.mat=Object.assign({},d.mat,{sss:0,rim:'#a06b51',rimK:.22,rough:.68});r.fx(0,0);return d;
    }
    if(['jole','mantar','hayalet'].includes(type)){
      // Forest scavenger, thorn-growth and bound soul: rebuild the silhouette rather than tinting a toy.
      r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
      const ash='#a69b84',iron='#4a4347',H=d.height||EDEF[type].height;
      if(type==='jole'){
        const skin={green:'#3b493a',pink:'#57363e',blue:'#344454',purple:'#4b3d57',lava:'#67382b',muhallebi:'#5b5345'}[o.variant]||'#3b493a';
        r.on('body').add(G.sphere(22,16),skin,[0,H*.30,-.04],null,[.46,H*.32,.40]);
        for(let j=0;j<6;j++){const a=j*TAU/6;r.seg([Math.sin(a)*.29,H*.21,Math.cos(a)*.26],[Math.sin(a)*.60,.07,Math.cos(a)*.51],.10,skin,.035,10);}
        boneMask(r,'body',[0,H*.66,.18],H*.30,1);
        for(let j=0;j<4;j++){const y=H*(.25+j*.10);for(const sd of [-1,1])r.seg([sd*.025,y,.35],[sd*(.34-j*.03),y+.025,.26],.027,ash,.019,8);}
        if(o.variant==='lava'){r.on('body').fx(.6,0);for(let j=0;j<5;j++)r.add(G.octa(),hdr('#aa4a24',1.5),[Math.sin(j*1.3)*.25,H*.32+Math.cos(j*1.3)*.10,.32],null,[.023,.071,.016]);}
      }else if(type==='mantar'){
        r.on('body').add(G.cyl(.65,1,18),'#403c36',[0,.36,-.01],null,[.25,.62,.20]);boneMask(r,'body',[0,.51,.16],.18,0);
        r.on('cap').add(G.sphere(22,16),'#503137',[0,.80,-.08],[-.22,0,0],[.48,.17,.39]);
        for(let j=0;j<7;j++){const a=j*TAU/7,p=[Math.sin(a)*.37,.87,Math.cos(a)*.30-.08];cone(r,p,[Math.sin(a)*.4,1,Math.cos(a)*.4],.15+(j%3)*.06,.06,ash);}
        for(const sd of [-1,1]){r.on(sd>0?'armL':'armR').seg([sd*.23,.47,0],[sd*.39,.25,.17],.05,iron,.031,8);for(let j=0;j<3;j++)cone(r,[sd*.39+j*.03,.25,.17],[sd*.10,-1,.30],.14,.012,ash);r.on(sd>0?'footL':'footR').add(G.rbox(2),iron,[sd*.14,.08,.04],null,[.13,.12,.24]);}
        r.on('body');for(let j=0;j<3;j++)r.seg([-.22,.27+j*.10,-.07],[.22,.32+j*.10,-.07],.021,'#8d7757',.021,8);
      }else{
        r.on('body').fx(.10,.05).add(G.cyl(.30,1,22),'#34323d',[0,.45,-.04],null,[.35,.79,.27]);
        for(let j=-3;j<=3;j++)cone(r,[j*.084,.24,-.03],[j*.15,-1,.05],.24+Math.abs(j)*.028,.07,'#2e2c35');
        r.add(G.sphere(22,16),'#25242c',[0,.91,-.03],null,[.32,.31,.28]);boneMask(r,'body',[0,.90,.10],.21,0);
        for(const sd of [-1,1]){const n=sd>0?'armL':'armR';r.on(n).seg([sd*.27,.75,0],[sd*.51,.38,.11],.052,ash,.036,10);for(let j=0;j<3;j++)cone(r,[sd*.51+j*.033,.37,.11],[sd*.12,-1,.1],.22-(j*.025),.014,ash);}
        r.on('body').fx(0,.55);for(let j=0;j<4;j++)r.add(G.torus(TAU,.20,12),'#786d59',[0,.75-j*.13,.29],[0,0,j%2?PI/2:0],[.064,.072,.032]);
      }
      if(o.elite){r.on('body').fx(0,.4);for(const sd of [-1,1])cone(r,[sd*H*.17,H*.70,-.13],[sd*.7,1,-.2],H*.28,H*.047,'#a79879');}
      d.glowC=col('#a34449');d.mat=Object.assign({},d.mat,{sss:0,rough:.64,rimK:.12});r.fx(0,0);return d;
    }
    const remake=['yogurt','kaymak','kopuk','peynir','kefirdev','simitci','supurgeci','tellal','nobetci'];
    if(remake.includes(type)){
      r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);d.extras=[];d.tex=null;
      const H=d.height||EDEF[type].height,body=r.map.body!==undefined?'body':'root';
      r.on(body);
      if(['yogurt','kopuk','kaymak'].includes(type)){
        const cy=H*.48;r.add(G.sphere(24,18),'#39483f',[0,cy,0],null,[.32,H*.43,.23]);
        for(let j=-2;j<=2;j++)cone(r,[j*.105,H*.2,-.01],[j*.15,-1,.1],H*.27,.08,'#34363a');
        boneMask(r,body,[0,H*.67,.18],H*.20,1);
        for(const side of [-1,1])r.seg([side*.20,H*.60,0],[side*.42,H*.23,.16],.035,'#aaa18e',.028,8);
      }else if(type==='peynir'){
        r.add(G.sphere(20,16),'#4c4b42',[0,.68,0],null,[.38,.52,.24]);
        for(let j=0;j<4;j++){const y=.42+j*.15;for(const side of [-1,1])r.seg([0,y,.27],[side*(.3-j*.02),y+.04,.20],.036,'#b4a68c',.03,8);}
        boneMask(r,body,[0,1.16,.13],.21,1);
        for(const side of [-1,1]){r.on(side>0?'armL':'armR').seg([side*.35,.85,0],[side*.60,.48,.12],.045,'#aaa18b',.035,8);r.on(side>0?'legL':'legR').seg([side*.2,.43,0],[side*.2,.07,.1],.065,'#6e6f68',.05,8);}
      }else{
        // Plague priest, executioner, grave keeper and death herald: cloaks replace bottles, bread and toy tools.
        const priest=type==='kefirdev',C=priest?'#343e36':'#35333d',yb=H*.13,yt=H*.73;
        r.on(body).add(G.cyl(.38,.65,24),C,[0,(yb+yt)/2,0],null,[H*.26,yt-yb,H*.24]);
        for(const side of [-1,1]){
          const arm=r.map[side>0?'armL':'armR']!==undefined?(side>0?'armL':'armR'):body;
          r.on(arm).seg([side*H*.20,H*.60,0],[side*H*.34,H*.30,.12],H*.055,'#57565a',H*.04,10);
          r.add(G.sphere(12,8),'#afa38c',[side*H*.34,H*.29,.12],null,[H*.06,H*.07,H*.05]);
          for(let j=0;j<3;j++)cone(r,[side*H*.34+j*H*.014,H*.27,.15],[0,-1,.3],H*.10,H*.008,'#c3b797');
          r.on(body).add(G.sphere(16,12),'#6d727a',[side*H*.20,H*.67,0],null,[H*.12,H*.065,H*.13]);
          cone(r,[side*H*.20,H*.71,0],[side*.25,1,0],H*.13,H*.035,'#9b9485');
        }
        const head=priest?'foam':'head';r.on(head).add(G.sphere(20,16),'#252a2d',[0,H*.80,0],null,[H*.19,H*.19,H*.16]);boneMask(r,head,[0,H*.80,H*.10],H*.14,priest?1:0);
        for(const side of [-1,1]){const leg=r.map[side>0?'legL':'legR']!==undefined?(side>0?'legL':'legR'):body;r.on(leg).add(G.rbox(2),'#393e45',[side*H*.13,H*.08,.03],null,[H*.12,H*.16,H*.20]);}
        const tool=r.map.simit!==undefined?'simit':r.map.foreR!==undefined?'foreR':'armR';r.on(tool);
        if(type==='simitci'){r.add(simitGeo(),'#8d9194',[-.34,.48,.2],[PI/2,0,0],.18);r.on('tray').add(G.torus(TAU,.1,20),'#8d9194',[0,H*.99,0],[PI/2,0,0],[H*.20,H*.20,H*.20]);}
        else {r.seg([-H*.34,H*.12,.14],[-H*.34,H*.93,.14],H*.02,'#645c50',H*.018,8);r.add(G.rbox(2),'#8d9395',[-H*.24,H*.91,.14],[0,0,.18],[H*.28,H*.065,H*.035]);}
        if(type==='tellal'){r.on('drum').add(G.cyl(1,1,20),'#6d5c50',[0,H*.38,H*.20],[PI/2,0,0],[H*.22,H*.13,H*.22]);r.add(G.sphere(16,12),'#b4a890',[0,H*.4,H*.29],null,[H*.10,H*.12,H*.035]);}
      }
      d.glowC=col('#a34449');d.mat=Object.assign({},d.mat,{sss:0,rough:.66});
    }else{
      // Existing beast silhouettes acquire bone ridges and hooked horns in their original merged surface.
      r.oldBeast=true;d.mat=Object.assign({},d.mat,{sss:0,rim:'#81796d',rimK:.15});
      const H=d.height||EDEF[type].height,b=r.map.head!==undefined?'head':r.map.body!==undefined?'body':'root';
      r.on(b).fx(0,.3);for(const side of [-1,1])cone(r,[side*H*.13,H*.80,-H*.03],[side*.35,1,-.15],H*.18,H*.045,'#948d7b');
      const body=r.map.body!==undefined?'body':'root';r.on(body);for(let j=0;j<3;j++)cone(r,[0,H*(.33+j*.14),-H*.12],[0,.4,-1],H*.14,H*.035,'#8d897b');
    }
    r.fx(0,0);
    return d;
  }

  const DEFS = {};
  function getDef(type, variant, elite) {
    if (!TYPES[type]) type = 'jole';
    const T = TYPES[type], vs = VARIANTS[type], v = vs ? (vs.includes(variant) ? variant : vs[0]) : '';
    const key = type + '|' + v + '|' + (elite ? 1 : 0);
    let d = DEFS[key];
    if (!d) { d = DEFS[key] = lodBuild(LOD[type] ?? 0.6, r => darkSilhouette(r,type,{variant:v,elite},T[0](r,{variant:v,elite})||{})); d.key = key; }
    return d;
  }
  function lodBuild(k, make) {
    LODK = k;
    try { const r = new Rig(); return r.finish(make(r)); } finally { LODK = 1; }
  }
  function skinned(def, mat) {
    const bones = [];
    for (const bd of def.bones) {
      const b = new THREE.Bone(); b.name = bd.name;
      if (bd.parent < 0) b.position.fromArray(bd.pos);
      else { const pp = def.bones[bd.parent].pos; b.position.set(bd.pos[0] - pp[0], bd.pos[1] - pp[1], bd.pos[2] - pp[2]); bones[bd.parent].add(b); }
      b.userData.p0 = b.position.clone();
      bones.push(b);
    }
    const mesh = new THREE.SkinnedMesh(def.g[0], mat);
    mesh.add(bones[0]);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.boundingSphere = def.sphere.clone(); mesh.boundingBox = def.box.clone();
    mesh.castShadow = true; mesh.receiveShadow = false;
    const B = {};
    for (const b of bones) B[b.name] = b;
    const marks = {};
    for (const k in def.markers) {
      const mk = def.markers[k], bone = B[mk.bone], bp = def.bones[def.bones.findIndex(x => x.name === mk.bone)].pos;
      const o = new THREE.Object3D(); o.position.set(mk.pos[0] - bp[0], mk.pos[1] - bp[1], mk.pos[2] - bp[2]); bone.add(o); marks[k] = o;
    }
    return { mesh, bones, B, marks };
  }
  function resetPose(bones) {
    for (let i = 0; i < bones.length; i++) { const b = bones[i]; b.position.copy(b.userData.p0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); }
  }
  const ST0 = { move: 0, windup: -1, attack: -1, hurt: 0, frozen: false, dying: -1 };
  const ELITE_RIM = { rim: GOLD, rimK: 0.4, rimP: 2.6 };   // thin gold edge; crown, aura ring and name tag carry the rest
  const _ice = new THREE.Color();

  function build(type, o = {}) {
    if (!TYPES[type]) type = 'jole';
    const boss = isBossType(type), elite = !!o.elite && !boss, def = getDef(type, o.variant, elite), anim = TYPES[type][1];
    const mo = def.mat || {};
    const mat = eMat(Object.assign({ tex: def.tex }, mo, elite ? ELITE_RIM : {}, elite ? def.eliteRim : {}));
    if (def.lava) { const lc = col(def.lava.color); mat.userData.U.uLava.value.set(lc.r, lc.g, lc.b, def.lava.k); }
    const I = skinned(def, mat), sc = elite ? 1.4 : 1;
    I.mesh.scale.setScalar(sc);
    if (I.B.mound) I.B.mound.scale.setScalar(0.0001);   // the mole's dirt mound only shows while it burrows
    if (I.B.clod) I.B.clod.scale.setScalar(0.0001);     // the master mole's dirt clod only shows while throwing
    for (let i = 0; i < 3; i++) if (I.B['puff' + i]) I.B['puff' + i].scale.setScalar(0.0001);
    for (const n of def.hide || []) if (I.B[n]) I.B[n].scale.setScalar(0.0001);   // e.g. the kefir bottle's gift glass until the hand-over
    // extra meshes riding on a bone with their own material (the kefir bottle's see-through glass: drawn after the kefir inside)
    const XM = [];
    for (const e of def.extras || []) {
      const b = I.B[e.bone], bd = def.bones.find(x => x.name === e.bone);
      if (!b || !bd) continue;
      const xm = extraMat(e), mesh = new THREE.Mesh(e.geo, xm);
      mesh.position.set(-bd.pos[0], -bd.pos[1], -bd.pos[2]); mesh.renderOrder = 2; mesh.castShadow = false; mesh.name = e.kind || 'extra';
      b.add(mesh); XM.push(xm);
    }
    const root = new THREE.Group(); root.name = 'enemy_' + type; root.add(I.mesh);
    const base = EDEF[type] || {};
    const s = { t: frand(0, 10), ph: frand(0, TAU), mv: 0, walk: frand(0, TAU), hop: 0, flap: frand(0, 10), key: 0, bt: frand(0.5, 3), gg: frand(1, 6),
      mood: 'grumpy', fa: 0, fc: new THREE.Color(1, 1, 1), tint: null, glow: 0, wobA: mo.wob || 0, mz: new THREE.Vector3() };
    const m = {
      type, variant: def.key.split('|')[1] || undefined, boss, root, def, mat, U: mat.userData.U, B: I.B, bones: I.bones, mesh: I.mesh, s,
      portrait: def.portrait || undefined,   // UI boss badge framing hint {cx, cy, cz, rad} (model metres), where the default misses
      height: (def.height || base.height || 1) * sc, radius: (base.r || 0.5) * sc,
      anim(dt, st) {
        st = st || ST0;
        const dying = st.dying >= 0;
        if (st.frozen && !dying) { applyEm(m); return; }
        if (dying) {
          s.t+=dt;resetPose(I.bones);s.mood='grumpy';
          const d=clamp(st.dying,0,1),R=I.B.root;
          const collapse=smooth01(clamp((d-.10)/.68,0,1)),ash=smooth01(clamp((d-.64)/.36,0,1)),side=type.length%2?1:-1;
          R.position.y=-m.height*.22*collapse;R.rotation.x=-.18*collapse;R.rotation.z=side*.24*collapse;
          R.scale.set((1-.12*collapse)*(1-ash),Math.max(.0001,(1-.55*collapse)*(1-ash)),(1-.10*collapse)*(1-ash));
          if(I.B.head)I.B.head.rotation.x=.32*collapse;
          if(I.B.body)I.B.body.rotation.x=-.12*collapse;
          for(const n of ['armL','armR','wingL','wingR'])if(I.B[n]){I.B[n].rotation.z+=(n.endsWith('L')?1:-1)*(.18*collapse);I.B[n].rotation.x+=.25*collapse;}
          if(type==='sovalye'){I.B.horse.position.y-=.30*collapse;I.B.hNeck.rotation.x=.42*collapse;I.B.body.rotation.x=.65*collapse;}
          if(type==='lavkaplumbaga'){R.rotation.z=side*.60*collapse;I.B.head.rotation.x=-.20*collapse;}
          I.mesh.geometry=def.g[0];mat.color.setScalar(Math.max(.16,1-d*.82));s.glow=0;applyEm(m);return;
        }
        s.t += dt;
        s.mv = damp(s.mv, st.move || 0, 8, dt);
        resetPose(I.bones);
        // Round 6 expression hooks, set by the boss anims every frame (reset here): s.eyeK = eye height ×, s.eyeW = eye width ×,
        // s.browY = brow lift (× height), s.mouthO 0..1 = the "O" mouth, s.mouthW 0..1 = a wide smile, s.eyeWob 0..1 = dizzy eyes
        s.eyeK = 1; s.eyeW = 1; s.browY = 0; s.mouthO = 0; s.mouthW = 0; s.eyeWob = 0;
        // (a boss's time in its current phase: s.pT, the phase s.pPh; its first roar after it notices Feza = s.intro, the
        // double take + its entrance; once per model, i.e. per zone load: s.introDone)
        if (boss) {
          const ph = dying ? 'dying' : (st.phase || 'idle');
          if (ph !== s.pPh) { s.pPh = ph; s.pT = 0; } else s.pT = (s.pT || 0) + dt;
          const roarNow = !dying && (ph === 'roar' || (type === 'ejderha' && st.roar >= 0));
          if (roarNow && !s.introDone && st.aggro !== false) s.intro = true;
          else if (s.intro && !roarNow) { s.intro = false; s.introDone = true; }
        }
        anim(m, dt, st, s);
        const R = I.B.root, Hm = m.height / sc;
        // The preparation is held and readable; the impact recoils sharply, then releases.
        if(st.windup>=0){const w=smooth01(clamp(st.windup,0,1));R.position.y-=Hm*.035*w;R.rotation.x-=.045*w;if(I.B.head)I.B.head.rotation.x-=.07*w;}
        if(st.attack>=0){const a=clamp(st.attack,0,1),hit=Math.exp(-Math.pow((a-.18)/.12,2));R.position.z+=Hm*.035*hit;R.rotation.x+=.055*hit;}
        if (boss && s.intro) {   // the double take: 0–0.25 of the first roar a surprised little hop with big round eyes
          const rt = type === 'ejderha' && st.roar >= 0 ? st.roar : bpt(st), k = bump(rt, 0.25);
          R.position.y += k * Hm * 0.05;
          const e = smooth01(rt / 0.05) * (1 - smooth01((rt - 0.2) / 0.08));
          s.eyeK = Math.max(s.eyeK, 1 + 0.3 * e); s.browY = Math.max(s.browY, 0.04 * e); s.mouthO = Math.max(s.mouthO, e);
        }
        if (st.hurt > 0 && !dying && !def.ownHurt) {   // (bosses: a smaller squash — they are big and get hit a lot; each adds its own reaction)
          const h = st.hurt * st.hurt * (boss ? 0.3 : 1);
          R.scale.set(1 + 0.2 * h, 1 - 0.2 * h, 1 + 0.2 * h); R.rotation.x -= 0.22 * h; R.position.z -= 0.08 * h;
        }
        if (def.lava) m.U.uLava.value.w = def.lava.k * (0.82 + 0.18 * Math.sin(s.t * 2.1 + s.ph));   // molten cracks breathe
        if (I.B.eyes && s.mood !== 'happy') {   // blink, playful giggles, squint-giggle wind-up
          s.bt -= dt; let bl = 1;
          if (s.bt < 0) { const u = -s.bt / 0.14; if (u >= 1) s.bt = frand(1.6, 4.5); else bl = 1 - Math.sin(u * PI) * 0.9; }
          if (st.windup >= 0) {   // telegraph: eyes squeeze into a giggle while the body leans back / puffs up
            // (def.pout, the lidded sulky "hıh!" faces: their eyes open a little wider, no blink — squeezed or half-shut under the
            // lids they read as a glare from the gameplay camera above; their wind-up puffs the cheeks and lifts the chin instead,
            // see townWalk)
            bl = Math.min(bl, 1 - 0.16 * smooth01(st.windup * 1.8));
            if (I.B.brow) I.B.brow.position.y += 0.03 * smooth01(st.windup * 2) * (m.height / sc);
          } else if (st.attack < 0 && !dying && !def.pout) {   // now and then a little mischievous giggle (the townsfolk: their "hıh!" instead)
            s.gg -= dt;
            if (s.gg < 0) {
              const u = -s.gg / 0.5;
              if (u >= 1) s.gg = frand(3, 7);
              else { const g = Math.sin(u * PI); bl = Math.min(bl, 1 - .10*g); R.rotation.x -= .012*g; }
            }
          }
          I.B.eyes.scale.y = bl * s.eyeK; I.B.eyes.scale.x = s.eyeW;
          if (s.eyeWob > 0) {   // dizzy: the eyes roll a little
            I.B.eyes.rotation.z += Math.sin(s.t * 7.3) * 0.12 * s.eyeWob; I.B.eyes.position.x += Math.sin(s.t * 5.1) * 0.006 * Hm * s.eyeWob;
            I.B.eyes.scale.y *= 1 + 0.06 * Math.sin(s.t * 9.7) * s.eyeWob;
          }
          if (I.B.brow && s.browY) I.B.brow.position.y += s.browY * Hm;
          if (I.B.mouth && (s.mouthO > 0 || s.mouthW > 0)) {   // "O" = narrower and taller (× 0.8, × 1.5); wide smile = wider, a little flatter
            const o = clamp(s.mouthO, 0, 1), w = clamp(s.mouthW, 0, 1) * (1 - o);
            I.B.mouth.scale.set((1 - 0.2 * o) * (1 + 0.3 * w), (1 + 0.5 * o) * (1 - 0.08 * w), 1 + 0.2 * o);
          }
        }
        if (s.mood === 'happy' && I.B.joy) {   // hearts pulse and bob
          const p = Math.sin(s.t * 9);
          I.B.joy.scale.setScalar(1 + 0.18 * p);
          I.B.joy.position.y += (0.03 + 0.03 * Math.sin(s.t * 5)) * (m.height / sc);
        }
        if (dying && type === 'ejderha') {
          // the dragon: 0–0.3 surprised, then arms open for a hug with fast happy flaps (its anim) · 0.3–0.7 happy bounces with a
          // little hover · 0.7–1 the twirl while it shrinks into sparkles
          const d = st.dying, u = clamp((d - 0.3) / 0.4, 0, 1), on = d > 0.3 && d < 0.7 ? 1 : 0;
          R.position.y += (Math.abs(Math.sin(u * PI * 3)) * 0.06 + Math.sin(PI * u) * 0.05) * Hm * on;
          R.rotation.y += smooth01((d - 0.7) / 0.3) * TAU;
          R.rotation.z += Math.sin(d * 26) * 0.04 * (1 - d);
          R.scale.multiplyScalar(d < 0.7 ? 1 + 0.04 * Math.sin(PI * d / 0.7) : Math.max(0.0001, 1 - smooth01((d - 0.7) / 0.3)));
        } else if (dying && boss) {
          // zone bosses: overjoyed happy hops while waving goodbye (their own anim waves), then a twirl into sparkles
          // (def.dieFrom: the kefir bottle stands still while it hands Feza its glass of kefir, the goodbye plays after that)
          const from = def.dieFrom || 0, d = s.giving ? 0 : from ? Math.max(0, (st.dying - from) / (1 - from)) : st.dying;
          const H = m.height / sc, landed = 1 - smooth01((s.airY || 0) / 0.4);   // (cheered up mid-hop: land first)
          R.position.y += Math.abs(Math.sin(d * PI * 4.5)) * H * (def.dieHop ?? 0.12) * (1 - smooth01((d - 0.5) / 0.25)) * landed;
          R.rotation.y += smooth01((d - 0.62) / 0.38) * TAU;
          R.rotation.z += Math.sin(d * 30) * 0.05 * (1 - d);
          const k = d < 0.7 ? 1 + 0.05 * Math.sin(d * PI * 9) : Math.max(0.0001, 1 - smooth01((d - 0.7) / 0.3));
          R.scale.multiplyScalar(k);
        } else if (dying) {
          const d = st.dying, H = m.height / sc;
          const hop = Math.abs(Math.sin(d * PI * 2.2)) * H * 0.32 * (1 - smooth01(d));
          R.position.y += hop;
          // the creatures keep their overjoyed face to Feza for the two happy hops, then one twirl while they shrink away
          // (flat-faced ones — cheese wedge, cream swirl, yogurt cup — would otherwise show their edge/back at the happy moment)
          R.rotation.y += smooth01((d - 0.5) / 0.5) * TAU;
          R.rotation.z += Math.sin(d * 26) * 0.12 * (1 - d);
          const k = d < 0.55 ? 1 + 0.12 * Math.sin(PI * d / 0.55) : Math.max(0.0001, 1 - smooth01((d - 0.55) / 0.45));
          R.scale.multiplyScalar(k);
        }
        s.glow = st.windup >= 0 ? st.windup * st.windup * (0.15 + 0.1 * Math.sin(s.t * 28)) * (m.def.glowK ?? 1) : damp(s.glow, 0, 10, dt);
        applyEm(m);
      },
      setMood(md) {
        s.mood = 'grumpy';
        I.mesh.geometry = def.g[s.mood === 'happy' ? 1 : 0];
        if (I.B.eyes) I.B.eyes.scale.y = 1;
      },
      flash(a, c = '#ffffff') { s.fa = clamp(a || 0, 0, 1); s.fc.set(c); applyEm(m); },
      setTint(c) {
        s.tint = c ? new THREE.Color(c) : null;
        if (c) mat.color.copy(_ice.set(0xffffff).lerp(s.tint, 0.6)); else mat.color.set(0xffffff);
        applyEm(m);
      },
      muzzle() {
        const mk = I.marks.muzzle;
        if (!mk) return s.mz.set(0, m.height * 0.6, m.radius).applyMatrix4(root.matrixWorld);
        root.updateMatrixWorld(true);
        return mk.getWorldPosition(s.mz);
      },
      // World position of a named marker (new Vector3), or null: e.g. marker('gift') = the kefir glass in the bottle's hand.
      marker(name, out) {
        const mk = I.marks[name]; if (!mk) return null;
        root.updateMatrixWorld(true);
        return mk.getWorldPosition(out || new THREE.Vector3());
      },
      // Kefir Devi: where the glass of kefir it hands Feza is right now (world), or null while it is not in its hand.
      giftPos(out) { return I.B.gift && I.B.gift.scale.x > 0.05 && s.mood === 'happy' ? m.marker('gift', out) : null; },
      dispose() {
        if (root.parent) root.parent.remove(root);
        mat.dispose();
        for (const xm of XM) xm.dispose();
        if (I.mesh.skeleton) I.mesh.skeleton.dispose();
      },
    };
    return m;
  }
  function applyEm(m) {
    const s = m.s, e = m.mat.emissive;
    e.setRGB(0, 0, 0);
    m.U.uFl.value.set(s.fc.r, s.fc.g, s.fc.b, s.fa);   // hit flash is done in the shader (F_FLASH)
    if (s.glow > 0.001) { const g = m.def.glowC; e.r += g.r * s.glow; e.g += g.g * s.glow; e.b += g.b * s.glow; }
    if (s.tint) { e.r += s.tint.r * 0.1; e.g += s.tint.g * 0.12; e.b += s.tint.b * 0.16; }
  }
  // Material of a def.extras mesh. kind 'glass': thin see-through glass — faint in the middle, clearer toward the edges (fresnel),
  // mirror-smooth (environment reflections), a soft white rim; no depth write, so the kefir behind it stays visible.
  function extraMat(e) {
    const m = stdMat({ color: e.color || '#eef8ff', roughness: 0.05, metalness: 0, transparent: true, opacity: e.opacity ?? 0.15, depthWrite: false, envMapIntensity: 1.3 });
    patchMat(m, { fOut: `diffuseColor.a = mix(diffuseColor.a, ${(e.edge ?? 0.6).toFixed(3)}, pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.2));`, key: 'glass' + (e.edge ?? 0.6) });
    rimify(m, '#ffffff', 0.4, 2.2);
    return m;
  }

  // ── Baby dragon pet (after the boss): tiny, happy, flying (origin = its centre of flight) ──
  function buildBaby(r) {
    const body = '#9a62e6', bodyL = '#b88af2', bodyD = '#7442c8', belly = '#f0e2ff', spike = '#ff7ac8', horn = '#fff0cc', mem = '#d3a8ff';
    r.bone('body', 'root', [0, 0.05, 0]);
    r.bone('head', 'body', [0, 0.3, 0.06]);
    r.bone('jaw', 'head', [0, 0.36, 0.25]);
    r.bone('wingL', 'body', [0.14, 0.2, -0.1]); r.bone('wingR', 'body', [-0.14, 0.2, -0.1]);
    r.bone('tail', 'body', [0, -0.05, -0.18]);
    r.bone('legs', 'body', [0, -0.1, 0.05]);
    r.on('body').add(G.sphere(28, 20), vgrad(-0.2, 0.3, [[0, bodyD], [0.5, body], [1, bodyL]]), [0, 0.06, 0], null, [0.23, 0.25, 0.22]);
    r.add(G.sphere(24, 16), belly, [0, 0.03, 0.1], null, [0.16, 0.19, 0.13]);
    r.fx(0, 0.5); for (let i = 0; i < 3; i++) cone(r, [0, 0.2 - i * 0.1, -0.16 - i * 0.03], [0, 0.5, -1], 0.1, 0.045, spike, 10); r.fx(0, 0);
    r.on('legs'); for (const s of [-1, 1]) { r.add(G.sphere(14, 10), bodyD, [0.1 * s, -0.17, 0.06], null, [0.07, 0.07, 0.09]); r.fx(0, 0.5).add(G.sphere(8, 6), horn, [0.1 * s, -0.2, 0.14], null, 0.025).fx(0, 0); }
    r.on('tail');
    const TP = [[0, -0.05, -0.18], [0.03, -0.1, -0.34], [0.1, -0.1, -0.48], [0.18, -0.06, -0.58]];
    for (let i = 0; i < 3; i++) { const a = TP[i], b = TP[i + 1]; r.seg(a, b, 0.09 - i * 0.022, body, 0.07 - i * 0.022, 12).add(G.sphere(12, 8), body, b, null, 0.07 - i * 0.022); }
    r.fx(0, 0.8).add(extrude('heart', heartShape, 0.06, 0.035, 14), spike, [0.22, -0.05, -0.64], qb([-0.5, 0, 0.9], [0, 1, 0.1]), [0.16, 0.16, 0.14]).fx(0, 0);
    // head
    r.on('head').add(G.sphere(32, 24), vgrad(0.12, 0.62, [[0, body], [1, bodyL]]), [0, 0.38, 0.06], null, [0.25, 0.23, 0.23]);
    r.add(G.sphere(24, 16), mixc(bodyL, belly, 0.3), [0, 0.32, 0.27], null, [0.15, 0.1, 0.12]);
    for (const s of [-1, 1]) r.add(G.sphere(8, 6), '#4a2a70', [0.05 * s, 0.37, 0.38], null, [0.015, 0.01, 0.01]);
    r.fx(0, 0.4); for (const s of [-1, 1]) cone(r, [0.1 * s, 0.57, 0.02], [0.3 * s, 1, -0.5], 0.1, 0.035, horn, 10);
    r.fx(0, 0.5); for (const s of [-1, 1]) r.add(G.cone(10), spike, [0.24 * s, 0.44, 0.0], [0.3, 0.3 * s, -s * 1.2], [0.04, 0.12, 0.02]);
    r.fx(0, 0);
    r.on('jaw').add(G.sphere(16, 10), mixc(bodyL, belly, 0.5), [0, 0.265, 0.26], null, [0.12, 0.045, 0.1]);
    // wings
    for (const s of [-1, 1]) {
      r.on(s > 0 ? 'wingL' : 'wingR').push([0.14 * s, 0.2, -0.1], [-0.4, 0.4 * s, 0], 0.62);
      r.fx(0, 0.4).add(extrude('batWing' + s, () => wingShape(s, BAT_WING), 0.014, 0.008), mem, [0, 0, 0]);
      r.fx(0, 0); for (const f of [[0.64, 0.27], [0.52, -0.05], [0.37, -0.1]]) r.seg([0.02 * s, 0.06, 0.016], [f[0] * s, f[1], 0.016], 0.016, bodyD, 0.008, 6);
      r.pop();
    }
    // open, sparkly happy eyes + smile + blush (always happy)
    const fo = { er: 0.085, iris: '#e8a915', look: 0, lookY: 0.02, noTeeth: false };
    r.on('head').bone('eyes', 'head', [0, 0.42, 0.24]);
    r.push([0, 0.38, 0.06], [-0.15, 0, 0]);
    for (const s of [-1, 1]) { const [p, q] = onSphere(s * 0.1, 0.06, 0.235, 0.02); r.push(p, q); eyeOpen(r, s, fo, false); r.pop(); }
    r.on('head');
    for (const s of [-1, 1]) { const [p, q] = onSphere(s * 0.155, -0.03, 0.235, -0.005); r.push(p, q); blush(r, 0.075, {}); r.pop(); }
    r.pop();
    r.push([0, 0.32, 0.27], [0.1, 0, 0]); { const [p, q] = onSphere(0, -0.03, 0.12, 0.0); r.push(p, q); smile(r, 0.075, { noTeeth: true }); r.pop(); } r.pop();
    r.mark('muzzle', [0, 0.3, 0.4]);
    return { height: 0.9 };
  }
  function babyDragon() {
    const def = DEFS.baby || (DEFS.baby = lodBuild(LOD.baby, r=>{
      const d=buildBaby(r);r.k.parts=[];r.meta=[];r.k.stack=[new THREE.Matrix4()];r.mood=0;r.fx(0,0);r.uv(null);
      r.on('body').add(G.dodeca(),'#333139',[0,.06,-.02],null,[.21,.23,.20]);for(let j=0;j<3;j++){const y=-.06+j*.09;for(const sd of [-1,1])r.seg([0,y,.19],[sd*.14,y+.025,.15],.014,'#94856d',.010,6);}
      r.on('head').add(G.dodeca(),'#8e8068',[0,.39,.06],null,[.22,.20,.21]);r.add(G.rbox(1),'#554943',[0,.29,.26],[.1,0,0],[.25,.10,.17]);
      for(const sd of [-1,1]){r.on('eyes').add(G.rbox(1),'#17111a',[sd*.093,.44,.255],[0,0,sd*.30],[.14,.055,.018]);r.fx(.7,0).add(G.rbox(1),hdr('#ad3f31',1.4),[sd*.093,.438,.269],[0,0,sd*.30],[.083,.012,.007]);r.on('head').fx(0,0);cone(r,[sd*.14,.56,.0],[sd*.25,1,-.4],.20,.037,'#a7997d');for(let j=0;j<3;j++)cone(r,[sd*.095,.29,.33-j*.047],[0,-1,.1],.065,.012,'#ad9b7c');}
      r.on('jaw').add(G.rbox(1),'#736452',[0,.245,.26],null,[.23,.06,.15]);
      for(const sd of [-1,1]){r.on(sd>0?'wingL':'wingR').push([sd*.14,.20,-.10],[-.4,sd*.4,0],.62).add(extrude('batWing'+sd,()=>wingShape(sd,BAT_WING),.014,.008),'#4a383d',[0,0,0]);for(const f of [[.64,.27],[.52,-.05],[.37,-.10]])r.seg([sd*.02,.06,.016],[sd*f[0],f[1],.016],.015,'#8d806c',.007,6);r.pop();}
      r.on('legs');for(const sd of [-1,1]){r.add(G.rbox(1),'#39333a',[sd*.10,-.17,.06],null,[.12,.10,.18]);cone(r,[sd*.10,-.18,.14],[0,0,1],.095,.022,'#b2a080');}
      r.on('tail').seg([0,-.05,-.18],[.13,-.10,-.53],.064,'#40333a',.021,8);cone(r,[.13,-.10,-.53],[.4,.2,-1],.16,.044,'#98886d');r.fx(0,0);return d;
    }));
    const mat = eMat({ rough: 0.65, rimK: 0.22, sss: 0 });
    const I = skinned(def, mat), root = new THREE.Group(); root.name = 'babyDragon'; root.add(I.mesh);
    const s = { t: 0, flap: 0, atk: 0, mv: 0, bt: 1, mz: new THREE.Vector3(), fa: 0, fc: new THREE.Color(1, 1, 1), tint: null, glow: 0 };
    const em = { s, U: mat.userData.U, mat, def: {} };   // (what applyEm reads: hit flash + ice tint like every creature)
    return {
      root,
      // st (optional, GAME's enemy state for the dragon-arena whelps): hurt squash, frozen = no motion, dying = the happy goodbye
      anim(dt, moving, attacking, st) {
        const B = I.B, dying = !!st && st.dying >= 0;
        if (st && st.frozen && !dying) { applyEm(em); return; }
        s.t += dt;
        s.mv = damp(s.mv, moving ? 1 : 0, 5, dt); s.atk = damp(s.atk, attacking ? 1 : 0, attacking ? 20 : 8, dt);
        resetPose(I.bones);
        s.flap += dt * (9 + 5 * s.mv);
        const f = Math.sin(s.flap);
        B.wingL.rotation.z = 0.2 + f * 0.7; B.wingR.rotation.z = -(0.2 + f * 0.7);
        B.body.position.y += Math.sin(s.flap) * 0.02;
        B.body.rotation.x = 0.25 * s.mv - 0.1 * s.atk;
        B.head.rotation.x = -0.15 * s.mv + 0.25 * s.atk + Math.sin(s.t * 2.1) * 0.05; B.head.position.z += 0.05 * s.atk;
        B.head.rotation.z = Math.sin(s.t * 1.4) * 0.1;
        B.jaw.rotation.x = 0.55 * s.atk;
        B.tail.rotation.y = Math.sin(s.t * 3) * 0.35; B.tail.rotation.x = -0.2 * s.mv;
        B.legs.rotation.x = 0.4 * s.mv + Math.sin(s.t * 3) * 0.1;
        s.bt -= dt; let bl = 1;
        if (s.bt < 0) { const u = -s.bt / 0.14; if (u >= 1) s.bt = frand(1.5, 4); else bl = 1 - Math.sin(u * PI) * 0.9; }
        B.eyes.scale.y = bl;
        const R = B.root;
        if (st && st.hurt > 0 && !dying) { const h = st.hurt * st.hurt; R.scale.set(1 + 0.2 * h, 1 - 0.2 * h, 1 + 0.2 * h); R.rotation.x -= 0.22 * h; }
        if (dying) {   // The summoned whelp collapses and loses its form into ash.
          const d = st.dying;
          const fall=smooth01(clamp((d-.10)/.58,0,1));R.position.y-=fall*.14;R.rotation.x+=fall*.85;R.rotation.z+=fall*.32;B.head.rotation.x+=fall*.28;
          R.scale.multiplyScalar(Math.max(.0001,1-smooth01(clamp((d-.62)/.38,0,1))));
        }
        applyEm(em);
      },
      flash(a, c = '#ffffff') { s.fa = clamp(a || 0, 0, 1); s.fc.set(c); applyEm(em); },
      setTint(c) {
        s.tint = c ? new THREE.Color(c) : null;
        if (c) mat.color.copy(_ice.set(0xffffff).lerp(s.tint, 0.6)); else mat.color.set(0xffffff);
        applyEm(em);
      },
      setMood() { /* The summoner's creature never adopts a cheerful face. */ },
      muzzle() { root.updateMatrixWorld(true); return I.marks.muzzle.getWorldPosition(s.mz); },
      dispose() { if (root.parent) root.parent.remove(root); mat.dispose(); I.mesh.skeleton.dispose(); },
    };
  }

  // Mırmır Ayışığı: a smiling moon-cat in a patched travelling cloak. Merged colour geometry, no textures/assets.
  function merchant() {
    const root = new THREE.Group(); root.name = 'Kül Tüccarı';
    const body = new THREE.Group(); root.add(body);
    const cloth = '#353638', dark = '#1c2024', gold = '#9e8b69', fur = '#aca18b', rose = '#614a49';
    const make = (k, parent = root, glow = false) => {
      const m = new THREE.Mesh(k.build(), stdMat({ vertexColors: true, roughness: glow ? 0.3 : 0.7, metalness: glow ? 0.1 : 0,
        ...(glow ? { emissive: '#c25b32', emissiveIntensity: 0.45 } : {}) }));
      m.castShadow = !glow; m.receiveShadow = true; parent.add(m); return m;
    };
    const k = new Kit();
    // Velvet cloak, little boots, scarf, brass moon clasp and a bulging leather satchel.
    k.add(G.cyl(0.52, 1, 32), cloth, [0, 0.8, 0], null, [0.57, 1.12, 0.46]);
    k.add(G.torus(TAU, 0.045, 40), gold, [0, 0.26, 0], [PI / 2, 0, 0], [0.55, 0.44, 0.55]);
    for (const side of [-1, 1]) {
      k.add(G.sphere(20, 12), dark, [side * 0.22, 0.18, 0.16], null, [0.22, 0.14, 0.31]);
      k.add(G.sphere(20, 14), cloth, [side * 0.5, 1.06, 0.02], [0, 0, side * 0.3], [0.2, 0.36, 0.23]);
      k.add(G.sphere(20, 14), fur, [side * 0.51, 0.89, 0.2], null, [0.15, 0.16, 0.16]);
    }
    k.add(G.torus(TAU, 0.23, 24), '#615543', [0, 1.38, 0.03], [PI / 2, 0, 0], [0.37, 0.27, 0.37]);
    for(let j=0;j<3;j++)k.add(G.box(),j%2?'#51483c':'#695b47',[-.25+j*.07,1.19-j*.035,.43],[0,0,-.15+j*.08],[.076,.42+j*.05,.026]);
    k.add(G.torus(PI * 1.45, 0.24, 24), gold, [0.15, 1.19, 0.48], [0, 0, -0.6], 0.1);
    k.add(G.sphere(24, 16), '#a56c53', [-0.54, 0.58, -0.06], [0, 0, -0.15], [0.26, 0.3, 0.25]);
    k.add(G.box(), gold, [-0.55, 0.64, 0.19], null, [0.12, 0.1, 0.035]);
    k.seg([-0.44, 1.32, 0.23], [0.35, 0.5, 0.34], 0.036, '#b67b54', 0.036, 8);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.8; k.add(G.octa(), i % 2 ? '#71654d' : '#8a5a37', [Math.sin(a) * 0.4, 0.43 + (i % 3) * 0.23, 0.39], [0, 0, a], [0.04, 0.065, 0.018]);
    }
    // A hooded survivor trades relics; the expression carries the same bleak resolve as the world.
    k.add(G.sphere(28,20),dark,[0,1.78,-.03],null,[.51,.54,.44]);
    k.add(G.sphere(24,16),fur,[0,1.77,.20],null,[.33,.37,.25]);
    for(const side of [-1,1]){k.add(G.rbox(2),dark,[side*.145,1.85,.442],[0,0,side*.16],[.18,.09,.045]);k.add(G.rbox(2),'#7f7665',[side*.27,1.69,.31],[0,0,-side*.15],[.07,.34,.075]);}
    k.add(G.rbox(2),dark,[0,1.58,.44],null,[.14,.014,.02]);
    k.add(G.rbox(2),'#17191d',[0,1.64,.45],[.08,0,0],[.48,.23,.045]);for(let j=-2;j<=2;j++)k.add(G.rbox(1),'#766453',[j*.07,1.64,.478],[0,0,j*.05],[.014,.10,.009]);
    k.add(G.cone(16),cloth,[0,2.17,-.1],null,[.34,.32,.31]);
    k.seg([-.08,1.8,.449],[-.13,1.66,.449],.008,'#71624f',.007,6);
    make(k, body);
    const eyes = new THREE.Group(); eyes.position.set(0, 1.83, 0.48); body.add(eyes);
    const ek = new Kit();
    for(const side of [-1,1])ek.add(G.sphere(14,10),'#9e9581',[side*.145,0,0],null,[.055,.021,.014]);
    make(ek, eyes);
    const stall = new Kit();
    // Indigo rug, patched travelling chest, a tray of potion bottles and a tiny brass balance.
    for(let j=-3;j<=3;j++){const len=2.0+(j%3)*.19;stall.add(G.rbox(1),j%2?'#493f36':'#554b3d',[j*.45,.025,(j%2)*.05],[0,(j%3)*.018,0],[.45,.035,len]);for(const sd of [-1,1])stall.add(G.cone(6),'#493f36',[j*.45,.028,sd*(len*.5+.055)],[PI/2,0,0],[.20,.17,.018]);}
    stall.add(G.box(), '#49332c', [-1.0, 0.39, 0.1], null, [0.74, 0.65, 0.77]);
    stall.add(G.box(), '#78654b', [-1.0, 0.74, 0.1], null, [0.86, 0.07, 0.89]);
    for (const x of [-1.25, -0.77]) stall.add(G.box(), gold, [x, 0.4, 0.499], null, [0.045, 0.65, 0.02]);
    for (let i = 0; i < 3; i++) {
      const x = -1.25 + i * 0.25, z = 0.16 - (i % 2) * 0.25;
      stall.add(G.cyl(.68,1,5), ['#63342e','#55603e','#34383f'][i], [x, 0.9, z], [0,i*.35,0], [0.095, 0.25, 0.095]);
      stall.add(G.cyl(1, 1, 6), '#8c653f', [x, 1.05, z], null, [0.042, 0.07, 0.042]);stall.add(G.rbox(1),'#ab997a',[x,.90,z+.087],[0,0,.08],[.048,.09,.007]);
    }
    // Curved lantern pole, glowing moon, blue glass and hanging charms (no extra point light).
    stall.seg([1.25, 0.02, 0], [1.25, 2.18, 0], 0.045, '#836864', 0.035, 14);
    stall.seg([1.25, 2.18, 0], [0.97, 2.3, 0], 0.035, gold, 0.035, 12);
    stall.seg([0.97, 2.3, 0], [0.85, 2.15, 0], 0.025, gold, 0.025, 12);
    for (const y of [1.73, 2.05]) stall.add(G.cyl(1, 1, 12), gold, [0.85, y, 0], null, [0.19, 0.065, 0.19]);
    for (const x of [0.69, 1.01]) stall.seg([x, 1.76, 0], [x, 2.02, 0], 0.015, gold, 0.015, 8);
    make(stall);
    const glow = new Kit(); glow.add(G.octa(), '#be6339', [0.85, 1.89, 0], null, [0.105, 0.16, 0.105]);
    glow.add(G.rbox(1), '#b99462', [0.85, 1.9, 0.14], [0, 0, -0.35], [.02,.17,.008]); make(glow, root, true);
    let t = 0;
    return { root, anim(dt) { t += dt; body.position.y = Math.sin(t * 1.6) * 0.025; body.rotation.y = Math.sin(t * 0.6) * 0.09;
      eyes.scale.y = t % 4.5 > 4.3 ? 0.15 + 0.85 * Math.abs(Math.cos((t % 4.5 - 4.3) / 0.2 * PI)) : 1; } };
  }

  // ── Bilge Baykuş (owl NPC) on a tree stump ──
  function buildOwl(r) {
    const brown = '#8c5c37', brownD = '#5e3d22', brownL = '#b07e52', belly = '#f3dfbd', scal = '#c99e6c', disc = '#f0d6b4';
    const bark = '#8a5f3c', ring = '#e6c38e', ringD = '#b98d58', beak = '#ffab2e', feet = '#ffa53a';
    r.bone('stump', 'root', [0, 0, 0]);
    r.bone('body', 'root', [0, 0.52, 0]);
    r.bone('head', 'body', [0, 1.06, 0.02]);
    r.bone('beak', 'head', [0, 1.1, 0.3]);
    r.bone('wingL', 'body', [0.3, 0.98, -0.02]); r.bone('wingR', 'body', [-0.3, 0.98, -0.02]);
    // stump: bark sides (texture) with root flares, light rings on the cut top, a little mushroom
    r.on('stump').fx(0, 0, 1).uv(3, 0.6).add(lathe('stump', [[0, 0], [0.6, 0], [0.5, 0.05], [0.44, 0.14], [0.42, 0.3], [0.41, 0.46], [0.4, 0.49], [0, 0.49]], 30), bark);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; r.add(G.sphere(12, 8), bark, [Math.sin(a) * 0.42, 0.06, Math.cos(a) * 0.42], [0, a, 0], [0.13, 0.1, 0.2]); }
    r.uv(null).fx(0, 0);
    const rc = (() => { const out = new THREE.Color(), a = col(ring), b = col(ringD); return (x, y, z) => out.copy(a).lerp(b, Math.pow(0.5 + 0.5 * Math.cos(Math.hypot(x, z) * 48), 3)); })();
    r.add(G.hemi(40), rc, [0, 0.488, 0], null, [0.405, 0.03, 0.405]);
    r.add(G.cyl(0.6, 0.9, 10), '#fff1dc', [0.3, 0.12, 0.3], null, [0.035, 0.1, 0.035]);
    r.fx(0, 0.4).add(G.hemi(16), '#ff5a5a', [0.3, 0.17, 0.3], null, [0.08, 0.06, 0.08]).fx(0, 0);
    r.add(G.sphere(6, 5), '#ffffff', [0.33, 0.215, 0.33], null, 0.012);
    // body with scalloped belly feathers
    const bcol = (() => { const out = new THREE.Color(), bb = col(brown), bd = col(brownD), bl = col(belly), sc = col(scal); return (x, y, z) => {
      out.copy(bd).lerp(bb, smooth01((y - 0.5) / 0.4));
      const front = smooth01((z - 0.08) / 0.18);
      if (front > 0) {
        const u = x * 26, v = y * 22 + (Math.floor(u) & 1) * 0.5, fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v);
        const sca = Math.abs(Math.hypot(fu, fv * 0.9) - 0.42) < 0.09 ? 1 : 0;
        out.lerp(sca ? sc : bl, front);
      }
      return out;
    }; })();
    r.on('body').add(G.sphere(40, 30), bcol, [0, 0.84, 0], null, [0.33, 0.37, 0.31]);
    for (const s of [-1, 1]) r.fx(0, 0.4).add(G.sphere(8, 6), feet, [0.09 * s, 0.52, 0.2], null, [0.05, 0.03, 0.07]).fx(0, 0);
    // head with facial disc, ear tufts, beak
    r.on('head').add(G.sphere(40, 28), vgrad(0.95, 1.5, [[0, brown], [1, brownL]]), [0, 1.2, 0.02], null, [0.32, 0.29, 0.3]);
    for (const s of [-1, 1]) r.add(G.sphere(24, 16), disc, [0.11 * s, 1.2, 0.2], [0, s * 0.35, 0], [0.16, 0.18, 0.1]);
    for (const s of [-1, 1]) { cone(r, [0.2 * s, 1.43, 0.02], [0.45 * s, 1, -0.1], 0.2, 0.07, brownD, 10); }
    r.on('beak').fx(0, 0.5); cone(r, [0, 1.13, 0.28], [0, -0.6, 1], 0.1, 0.045, beak, 10);
    r.add(G.sphere(10, 8), mixc(beak, '#c86a10', 0.3), [0, 1.07, 0.28], null, [0.03, 0.02, 0.03]).fx(0, 0);
    // big eyes behind round glasses
    const fo = { er: 0.095, iris: '#f2a21e', look: 0.3, lookY: 0.02 };
    r.on('head').bone('eyes', 'head', [0, 1.22, 0.24]);
    r.push([0, 1.2, 0.02], [-0.12, 0, 0]);
    for (const s of [-1, 1]) {
      const [p, q] = onSphere(s * 0.11, 0.03, 0.3, 0.03);
      r.push(p, q); eyeOpen(r, s, fo, false); r.pop();
    }
    r.on('head');
    for (const s of [-1, 1]) {
      const [p, q] = onSphere(s * 0.11, 0.03, 0.3, -0.05);
      r.push(p, q).fx(0, 2).add(G.torus(TAU, 0.12, 32), GOLD, [0, 0, 0], null, [0.12, 0.12, 0.12]).pop();
      const [pb, qb2] = onSphere(s * 0.17, -0.1, 0.3, -0.002); r.push(pb, qb2); r.fx(0,.1).add(G.rbox(1),'#59443a',[0,0,0],[0,0,s*.2],[.010,.075,.009]); r.pop();
    }
    r.fx(0, 2).seg([-0.04, .035, .34], [0.04, .035, .34], 0.012, '#88765b', 0.012, 6).fx(0, 0);
    r.pop();
    // wings
    for (const s of [-1, 1]) {
      const wc = (() => { const out = new THREE.Color(), a = col(brown), b = col(brownD), c = col(brownL); return (x, y) => out.copy(a).lerp(b, smooth01((0.9 - y) / 0.3)).lerp(c, 0.5 * (0.5 + 0.5 * Math.sin(y * 60))); })();
      r.on(s > 0 ? 'wingL' : 'wingR').add(G.sphere(24, 16), wc, [0.3 * s, 0.82, -0.02], [0.1, 0, s * 0.15], [0.09, 0.26, 0.2]);
    }
    r.oldBeast=true;return { height: 1.5 };
  }
  function owl() {
    const def = DEFS.owl || (DEFS.owl = lodBuild(LOD.owl, buildOwl));
    const bt = texOf('bark');
    const mat = eMat({ rough: 0.62, tex: bt, ns: 1, rimK: 0.3 });
    const I = skinned(def, mat), root = new THREE.Group(); root.name = 'owl'; root.add(I.mesh);
    const s = { t: frand(0, 5), bt: 1, look: 0, lookT: 2, lookTo: 0, talk: 0 };
    return {
      root,
      anim(dt, talking) {
        const B = I.B; s.t += dt;
        s.talk = damp(s.talk, talking ? 1 : 0, 6, dt);
        resetPose(I.bones);
        const br = Math.sin(s.t * 1.8);
        B.body.scale.set(1 + 0.012 * br, 1 + 0.018 * br, 1 + 0.012 * br);
        s.lookT -= dt; if (s.lookT < 0) { s.lookT = frand(1.5, 4); s.lookTo = fpick([0, 0, -0.5, 0.45, 0.25]); }
        s.look = damp(s.look, talking ? 0 : s.lookTo, 5, dt);
        B.head.rotation.y = s.look;
        B.head.rotation.z = Math.sin(s.t * 0.7) * 0.08 + s.talk * Math.sin(s.t * 3.3) * 0.12;
        B.head.rotation.x = s.talk * Math.sin(s.t * 6.5) * 0.06;
        B.beak.rotation.x = s.talk * Math.max(0, Math.sin(s.t * 14)) * 0.5;
        const wf = s.talk * Math.max(0, Math.sin(s.t * 2.4)) * Math.sin(s.t * 16);
        B.wingL.rotation.z = 0.05 + wf * 0.3 + s.talk * 0.2; B.wingR.rotation.z = -(0.05 + wf * 0.3 + s.talk * 0.2);
        s.bt -= dt; let bl = 1;
        if (s.bt < 0) { const u = -s.bt / 0.16; if (u >= 1) s.bt = frand(2, 5); else bl = 1 - Math.sin(u * PI) * 0.92; }
        B.eyes.scale.y = bl;
      },
      dispose() { if (root.parent) root.parent.remove(root); mat.dispose(); I.mesh.skeleton.dispose(); },
    };
  }

  // ── Sancak: the knight's tournament banner (arena surprise; GAME treats it like a breakable). anim(dt, st):
  //   st.fall 0..1 — 0–0.1 a little rock, 0.1–0.72 it tips over backwards (faster and faster), lands at 0.72 (the sun smiles
  //   ^ ^, glints burst out of the crest), a small bounce until 0.86, then it lies flat (crest up);
  //   st.glow 0..1 — the soft golden shimmer + orbiting glints while it stands; optional st.hurt 0..1 (a wobble when hit) and
  //   st.pop 0..1 (springs up out of the ground; default 1). flash(a, c) / setTint(c) as the creatures. ──
  const SAN_FALL = PI / 2 + 0.06;   // (lying: the golden ball touches the ground, the foot's back edge is the pivot)
  const SAN_DIM = 0.2;              // lying down its colours are a little dimmer (which of the three are already down)
  function sancak() {
    const def = DEFS.sancak || (DEFS.sancak = lodBuild(LOD.sancak, buildSancak));
    const mat = eMat({ tex: def.tex, rough: 0.5, ns: 0.7, rimK: 0.3, wob: 0.016, wobF: 3.2, wobS: 3.4 });
    const uGR = { value: new THREE.Color(0, 0, 0) };   // the golden shimmer: a pulsing warm edge light
    patchMat(mat, { uniforms: { uGR }, fDecl: 'uniform vec3 uGR;', fOut: 'outgoingLight += uGR * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 1.8);', key: 'sancakGlow' });
    const I = skinned(def, mat), root = new THREE.Group(); root.name = 'sancak'; root.add(I.mesh);
    for (const n of def.hide) I.B[n].scale.setScalar(0.0001);
    const s = { t: frand(0, 10), ph: frand(0, TAU), mood: 1, fa: 0, fc: new THREE.Color(1, 1, 1), tint: null, glow: 0, side: Math.random() < 0.5 ? -1 : 1 };
    const em = { s, U: mat.userData.U, mat, def: { glowC: col('#fff0c8') } };
    return {
      root,
      anim(dt, st = {}) {
        const B = I.B, f = clamp(+st.fall || 0, 0, 1), up = 1 - smooth01((f - 0.1) / 0.3), hurt = clamp(+st.hurt || 0, 0, 1);
        s.t += dt;
        resetPose(I.bones);
        // the fall (pivot: the foot's back edge)
        let a = 0;
        if (f < 0.1) a = -0.07 * Math.sin(PI * f / 0.1);
        else if (f < 0.72) { const u = (f - 0.1) / 0.62; a = SAN_FALL * u * u; }
        else a = SAN_FALL - 0.14 * Math.sin(PI * clamp((f - 0.72) / 0.14, 0, 1));
        B.tip.rotation.x = -a;
        // (st.side −1 / +1: it falls toward −x / +x; the quarter turn is done by the time it is half way down)
        const sd = st.side < 0 ? -1 : st.side > 0 ? 1 : s.side;
        B.root.rotation.y = -sd * PI / 2 * smooth01((f - 0.06) / 0.4);
        if (!s.tint) mat.color.setScalar(1 - SAN_DIM * smooth01((f - 0.45) / 0.4));
        B.tip.rotation.z = Math.sin(s.t * 24) * 0.03 * hurt * up;   // hit: a quick wobble
        B.tip.rotation.x += Math.sin(s.t * 19) * 0.025 * hurt * up;
        const pop = st.pop ?? 1;   // springs up out of the ground
        if (pop < 1) { const p = clamp(pop, 0, 1); B.root.scale.set(1 + 0.12 * Math.sin(p * PI) * (1 - p), Math.max(0.0001, 1 - Math.pow(1 - p, 3) * Math.cos(p * PI * 2.2)), 1 + 0.12 * Math.sin(p * PI) * (1 - p)); }
        // the cloth sways and flutters, the pennant flaps (both still once it lies on the ground)
        B.cloth.rotation.x = (Math.sin(s.t * 1.7 + s.ph) * 0.04 + Math.sin(s.t * 3.1) * 0.015) * up - 0.25 * bump(f - 0.1, 0.62);
        B.cloth.rotation.z = Math.sin(s.t * 1.3 + s.ph) * 0.03 * up;
        B.pennant.rotation.y = (Math.sin(s.t * 5.2 + s.ph) * 0.35 + Math.sin(s.t * 8.7) * 0.12) * up;
        mat.userData.U.uWob.value.x = 0.016 * up;
        const md = f >= 0.72 ? 2 : 1;   // the sun smiles ^ ^ once it has landed
        if (md !== s.mood) { s.mood = md; I.mesh.geometry = def.g[md - 1]; }
        // glow: a pulsing golden edge light, a faint warm lift and three glints circling the crest; on landing the glints
        // burst out of it
        const g = clamp(+st.glow || 0, 0, 1) * up, burst = f >= 0.72 && f < 0.98 ? (f - 0.72) / 0.26 : -1, pulse = 0.5 + 0.5 * Math.sin(s.t * 3.4 + s.ph);
        uGR.value.setRGB(1, 0.72, 0.22).multiplyScalar(g * (0.5 + 0.6 * pulse));
        s.glow = g * (0.03 + 0.04 * pulse);
        for (let i = 0; i < 3; i++) {
          const b = B['tw' + i], an = s.t * 1.6 + i * TAU / 3, tw = 0.6 + 0.4 * Math.sin(s.t * 7 + i * 2.1);
          if (burst >= 0) {
            const d = 0.08 + 0.42 * Math.sqrt(burst), aa = i * TAU / 3 + 0.4;
            b.position.x += Math.sin(aa) * d; b.position.y += Math.cos(aa) * d; b.position.z += 0.1 + 0.25 * burst;
            b.scale.setScalar(Math.max(0.0001, Math.sin(PI * burst) * 1.4)); b.rotation.z = burst * 3;
          } else if (g > 0.01) {
            b.position.x += Math.sin(an) * 0.34; b.position.y += Math.cos(an * 0.7) * 0.18 + 0.1; b.position.z += Math.cos(an) * 0.16;
            b.scale.setScalar(Math.max(0.0001, g * tw)); b.rotation.y = s.t * 2;
          } else b.scale.setScalar(0.0001);
        }
        applyEm(em);
      },
      flash(a, c = '#ffffff') { s.fa = clamp(a || 0, 0, 1); s.fc.set(c); applyEm(em); },
      setTint(c) {
        s.tint = c ? new THREE.Color(c) : null;
        if (c) mat.color.copy(_ice.set(0xffffff).lerp(s.tint, 0.6)); else mat.color.set(0xffffff);
        applyEm(em);
      },
      dispose() { if (root.parent) root.parent.remove(root); mat.dispose(); I.mesh.skeleton.dispose(); },
    };
  }

  // ════════════════ Round 6: the bosses' bonus-game props (GAME pools them) ════════════════
  // Each is ONE merged mesh (cached geometry shared by every instance, its own material for the glow and the hit flash):
  // {root, anim(dt, o), flash(a, c), dispose()}. root: feet / base at y = 0; GAME positions, turns and scales root.
  //   EMODEL.jellyCrown() — the Kral Jöle's crown (same look and size as on his head) · o = {spin: turns per second, glow 0..1
  //     (golden shimmer), bob 0..1 (floats 0.12–0.24 m up, rocking)}
  //   EMODEL.havuc() — a cute golden-orange carrot (≈ 0.5 m with its leafy top) with a tiny smiling face · o = {spin, glow, bob}
  //   EMODEL.serinTas() — a round glossy mint-blue "cool stone" (≈ 1.1 m wide, 1 m tall; collision r ≈ 0.75), frosty top, frost
  //     sparkles, a soft cool glow, no face · o = {pop 0..1 (rises out of the ground; 1 = up, default 1), glow 0..1,
  //     crack 0..1 (shakes, squashes and whitens — at 1 it is about to burst: GAME hides it and plays FX 'crack')}
  //   EMODEL.hole() — a dirt hole with a lumpy rim of clods (≈ 1.3 m radius; the mole peeks out of it) · o = {open 0..1 (opens up
  //     from nothing with a little overshoot; default 1), shake 0..1 (the rim trembles: the mole is coming)}
  const PROP_GLOW = 'outgoingLight += uGR * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 1.8);';   // (as the banner's)
  function propInst(key, lod, make, name, o = {}) {
    const def = DEFS[key] || (DEFS[key] = lodBuild(lod, make));
    const mat = eMat(Object.assign({}, def.mat || {}));
    const uGR = { value: new THREE.Color(0, 0, 0) };
    patchMat(mat, { uniforms: { uGR }, fDecl: 'uniform vec3 uGR;', fOut: PROP_GLOW, key: 'sancakGlow' });
    const mesh = new THREE.Mesh(def.g[0], mat); mesh.castShadow = o.shadow !== false; mesh.receiveShadow = !!o.receive; mesh.name = name;
    mesh.frustumCulled = true;
    const root = new THREE.Group(); root.name = name; root.add(mesh);
    const s = { t: frand(0, 10), ph: frand(0, TAU), spin: 0, fa: 0, fc: new THREE.Color(1, 1, 1), tint: null, glow: 0 };
    const em = { s, U: mat.userData.U, mat, def: { glowC: col(def.glowC || '#fff0c8') } };
    return {
      root, mesh, s, em, uGR,
      flash(a, c = '#ffffff') { s.fa = clamp(a || 0, 0, 1); s.fc.set(c); applyEm(em); },
      dispose() { if (root.parent) root.parent.remove(root); mat.dispose(); },
    };
  }
  function buildCrownProp(r) { r.on('root'); kjCrown(r); return { height: 0.9, glowC: '#ac6a45', mat: { rough: 0.65, rimK: 0.3, rim: '#b29a74' } }; }
  function jellyCrown() {
    const P = propInst('jellyCrown', LOD.kraljole, buildCrownProp, 'jellyCrown'), s = P.s, M = P.mesh;
    return {
      root: P.root, flash: P.flash, dispose: P.dispose,
      anim(dt, o = {}) {
        s.t += dt;
        const g = clamp(+o.glow || 0, 0, 1), b = clamp(+o.bob || 0, 0, 1), pulse = 0.5 + 0.5 * Math.sin(s.t * 3.4 + s.ph);
        s.spin += dt * (+o.spin || 0) * TAU;
        M.position.y = b * (0.18 + 0.06 * Math.sin(s.t * 2.6 + s.ph));
        M.rotation.set(Math.sin(s.t * 2.3 + s.ph) * 0.09 * b, s.spin, Math.cos(s.t * 1.9 + s.ph) * 0.07 * b);
        P.uGR.value.setRGB(1, 0.78, 0.25).multiplyScalar(g * (0.45 + 0.6 * pulse));
        s.glow = g * (0.03 + 0.05 * pulse);
        applyEm(P.em);
      },
    };
  }
  function buildHavuc(r) {
    r.on('root').fx(0,.6);
    r.add(G.rbox(2),'#74726a',[0,.26,0],[0,0,.18],[.055,.44,.045]);
    r.add(G.rbox(2),'#9b8a6d',[0,.35,0],null,[.29,.045,.055]);
    r.add(G.dodeca(),'#b5a588',[0,.51,0],null,[.08,.09,.05]);
    for(const side of [-1,1])r.add(G.rbox(1),'#221c24',[side*.029,.53,.048],[0,0,side*.22],[.035,.018,.009]);r.add(G.rbox(1),'#30212a',[0,.46,.049],null,[.027,.025,.005]);
    r.fx(.35,.4).add(G.octa(),hdr('#ba4545',1.5),[0,.25,.031],null,[.041,.067,.018]);
    r.fx(0,0);return {height:.6,glowC:'#bb4549',mat:{rough:.65,rimK:.3,rim:'#b5a183'}};
  }
  function havuc() {
    const P = propInst('havuc', 0.8, buildHavuc, 'havuc'), s = P.s, M = P.mesh;
    return {
      root: P.root, flash: P.flash, dispose: P.dispose,
      anim(dt, o = {}) {
        s.t += dt;
        const g = clamp(+o.glow || 0, 0, 1), b = clamp(+o.bob || 0, 0, 1), pulse = 0.5 + 0.5 * Math.sin(s.t * 3.6 + s.ph);
        s.spin += dt * (+o.spin || 0) * TAU;
        M.position.y = b * (0.14 + 0.07 * Math.sin(s.t * 2.8 + s.ph));
        M.rotation.set(Math.sin(s.t * 2.1 + s.ph) * 0.12 * b, s.spin, Math.sin(s.t * 3.3) * 0.1 * b);
        P.uGR.value.setRGB(1, 0.62, 0.2).multiplyScalar(g * (0.5 + 0.7 * pulse));
        s.glow = g * (0.03 + 0.05 * pulse);
        applyEm(P.em);
      },
    };
  }
  function buildSerinTas(r) {
    r.on('root').fx(0,.2).add(G.rbox(1),'#37333a',[0,.42,0],[0,0,-.06],[.82,.76,.33]);
    r.add(G.rbox(1),'#514a47',[0,.85,-.008],[0,0,-.08],[.75,.13,.34]);
    r.add(G.rbox(1),'#332f34',[0,.075,.02],null,[1.03,.14,.55]);
    for(let j=0;j<3;j++)r.add(G.rbox(1),'#18171d',[-.21+j*.16,.59-j*.13,.172],[0,0,j%2?.47:-.29],[.016,.22,.011]);
    r.fx(.45,0).seg([-.22,.43,.180],[0,.69,.184],.018,'#ab9472',.014,8).seg([0,.69,.184],[.23,.43,.179],.014,'#ab9472',.012,8).seg([0,.28,.185],[0,.67,.184],.012,'#826852',.010,8);
    r.fx(0,0);return {height:1.0,glowC:'#a67c55',mat:{rough:.83,rimK:.22,rim:'#a08b6c',sss:0}};
    const C = [0, 0.5, 0], A = [0.62, 0.52, 0.6], lo = col('#1f86a0'), mid = col('#46c4c8'), hi = col('#8ee8e4'), frost = col('#e6fbff'), out = new THREE.Color();
    const w = sN(36, 16), h = sN(26, 10);
    const geo = gx('serinTas@' + w, () => {   // a round boulder, softly lumpy (no sharp cuts: it is a friendly cool stone)
      const g = new THREE.SphereGeometry(1, w, h), p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i); v.multiplyScalar(0.94 + 0.12 * fbm3(v.x * 1.6 + 7, v.y * 1.6, v.z * 1.6 - 3));
        if (v.y < -0.55) v.y = -0.55 - (v.y + 0.55) * 0.3;   // (a flatter bottom: it sits on the ground)
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return seamNormals(g);
    });
    r.on('root').fx(0, 1).add(geo, (x, y, z) => {
      const t = clamp((y - 0.05) / 0.9, 0, 1), n = fbm3(x * 4 + 1, y * 4, z * 4 + 2);
      out.copy(lo).lerp(mid, smooth01(t * 1.4)).lerp(hi, smooth01((t - 0.55) / 0.35) * 0.8);
      return out.lerp(frost, clamp(smooth01((t - 0.74 + 0.3 * (n - 0.5)) / 0.1) * 0.7, 0, 1));   // a frosty cap
    }, [0, 0.46, 0], null, A);
    // frost sparkles (tiny bright crystals on the surface) and a few little frost flakes
    r.fx(1, 0);
    const rnd = mulberry32(61);
    for (let i = 0; i < 14; i++) {
      const phi = 0.2 + rnd() * 1.1, th = rnd() * TAU, [p, n] = onEll([0, 0.46, 0], [A[0] * 1.01, A[1] * 1.01, A[2] * 1.01], phi, th);
      r.add(G.octa(), hdr(i % 3 ? '#ffffff' : '#bff4ff', 1.9), p, qz(...n, rnd() * 3), [0.018 + rnd() * 0.014, 0.04 + rnd() * 0.03, 0.018]);
    }
    r.fx(0.4, 0.8);
    for (let i = 0; i < 6; i++) {
      const phi = 0.35 + rnd() * 0.7, th = rnd() * TAU, [p, n] = onEll([0, 0.46, 0], A, phi, th);
      r.add(star5Geo(), '#eafcff', p, qz(...n, rnd() * 3), 0.07 + rnd() * 0.03);
    }
    r.fx(0, 0);
    void C;
    return { height: 1.0, glowC: '#bff4ff', mat: { rough: 0.25, rimK: 0.4, rim: '#d8fbff', sss: col('#9fe8ff').multiplyScalar(0.06) } };
  }
  function serinTas() {
    const P = propInst('serinTas', 0.8, buildSerinTas, 'serinTas'), s = P.s, M = P.mesh;
    return {
      root: P.root, flash: P.flash, dispose: P.dispose,
      anim(dt, o = {}) {
        s.t += dt;
        const pop = clamp(o.pop ?? 1, 0, 1), g = clamp(+o.glow || 0, 0, 1), c = clamp(+o.crack || 0, 0, 1), pulse = 0.5 + 0.5 * Math.sin(s.t * 2.6 + s.ph);
        // rises out of the ground with a springy overshoot (like the banners)
        const sy = pop < 1 ? Math.max(0.0001, 1 - Math.pow(1 - pop, 3) * Math.cos(pop * PI * 2.2)) : 1, sx = pop < 1 ? 1 + 0.14 * Math.sin(pop * PI) * (1 - pop) : 1;
        const cs = c * c, sh = 0.035 * cs;
        M.scale.set(sx * (1 + 0.05 * cs), sy * (1 - 0.06 * cs), sx * (1 + 0.05 * cs));
        M.position.set(Math.sin(s.t * 61) * sh, -0.35 * (1 - smooth01(pop / 0.5)), Math.cos(s.t * 53) * sh);
        M.rotation.set(Math.sin(s.t * 47) * 0.04 * cs, 0, Math.cos(s.t * 43) * 0.04 * cs);
        P.uGR.value.setRGB(0.62, 0.38, 0.20).multiplyScalar(g * (0.16 + 0.16 * pulse) + 0.5 * cs);
        s.glow = g * (0.01 + 0.015 * pulse) + 0.12 * cs;
        applyEm(P.em);
      },
    };
  }
  function buildHole(r) {
    const R = 1.0, dark = col('#1c1008'), dirt = col('#5a3a22'), dirtL = col('#8a6040'), out = new THREE.Color();
    // the pit: a flat disc just over the floor, painted near-black in the middle to the dirt colour at its lip (reads as depth)
    const disc = gx('holeDisc@' + sN(32, 14), () => new THREE.CircleGeometry(1, sN(32, 14), 0, TAU).rotateX(-PI / 2));
    r.on('root').fx(0, 0).add(disc, (x, y, z) => out.copy(dark).lerp(dirt, Math.pow(clamp(Math.hypot(x, z) / (R * 1.02), 0, 1), 3)), [0, 0.012, 0], null, [R * 1.02, 1, R * 1.02]);
    // the lip: a low lumpy dirt ring + clods and pebbles round it
    const mc = (x, y, z) => { const n = fbm3(x * 3.5, y * 3.5, z * 3.5); return out.copy(dirt).lerp(dirtL, clamp(smooth01((y - 0.02) / 0.16) * 0.7 + 0.5 * n - 0.2, 0, 1)); };
    r.fx(0, 0.05).add(G.torus(TAU, 0.14, 36), mc, [0, 0.02, 0], [PI / 2, 0, 0], [R * 1.1, R * 1.1, 0.7]);
    const rnd = mulberry32(29);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + rnd() * 0.3, rr = R * (1.1 + rnd() * 0.18), sz = 0.12 + rnd() * 0.09;
      r.add(rockGeo(31 + (i % 3)), mc, [Math.sin(a) * rr, sz * 0.35, Math.cos(a) * rr], [rnd(), rnd() * 3, rnd()], [sz, sz * 0.7, sz]);
    }
    r.fx(0, 0.3);
    for (let i = 0; i < 5; i++) { const a = rnd() * TAU, rr = R * (1.35 + rnd() * 0.25); r.add(G.dodeca(), i & 1 ? '#9ea6b2' : '#b3aa9c', [Math.sin(a) * rr, 0.03, Math.cos(a) * rr], [rnd(), rnd(), 0], 0.04 + rnd() * 0.03); }
    r.fx(0, 0);
    return { height: 0.3, glowC: '#ffd8a0', mat: { rough: 0.9, rimK: 0.12 } };
  }
  function hole() {
    const P = propInst('hole', 0.8, buildHole, 'hole', { shadow: false, receive: true }), s = P.s, M = P.mesh;
    return {
      root: P.root, flash: P.flash, dispose: P.dispose,
      anim(dt, o = {}) {
        s.t += dt;
        const op = clamp(o.open ?? 1, 0, 1), sh = clamp(+o.shake || 0, 0, 1);
        const k = op < 1 ? Math.max(0.0001, 1 - Math.pow(1 - op, 3) * Math.cos(op * PI * 1.6)) : 1;
        M.scale.set(k * (1 + 0.03 * sh * Math.sin(s.t * 41)), Math.max(0.0001, k * (1 + 0.25 * sh * Math.abs(Math.sin(s.t * 37)))), k * (1 + 0.03 * sh * Math.cos(s.t * 43)));
        M.position.set(Math.sin(s.t * 57) * 0.025 * sh, 0, Math.cos(s.t * 49) * 0.025 * sh);
        M.visible = op > 0.001;
        applyEm(P.em);
      },
    };
  }
  const PROPS = { jellyCrown, havuc, serinTas, hole };

  // ── Neşe kristali: big faceted pink gem with an inner light ──
  let HALO = null;
  function haloTex() {
    if (HALO) return HALO;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    HALO = new THREE.CanvasTexture(c); HALO.colorSpace = THREE.SRGBColorSpace;
    return HALO;
  }
  function gemGeo(key, seg, pts) {
    return gx('gem' + key, () => {
      const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg, PI / seg).toNonIndexed();
      g.computeVertexNormals();
      return g;
    });
  }
  function crystal() {
    const grp = new THREE.Group(); grp.name = 'Kanlı Son Mühür';
    const outerG = gemGeo('A', 8, [[0, -1], [0.42, -0.45], [0.55, 0.05], [0.5, 0.55], [0.3, 0.92], [0, 1.08]]);
    const crackCanvas=document.createElement('canvas');crackCanvas.width=crackCanvas.height=128;const cc=crackCanvas.getContext('2d');cc.fillStyle='#070709';cc.fillRect(0,0,128,128);cc.strokeStyle='#cf5a36';cc.lineWidth=3;
    for(let j=0;j<4;j++){const x=14+j*31;cc.beginPath();cc.moveTo(x,0);cc.lineTo(x+9,31);cc.lineTo(x-5,60);cc.lineTo(x+7,92);cc.lineTo(x-2,128);cc.moveTo(x-5,60);cc.lineTo(x+16,72);cc.stroke();}
    const crackMap=new THREE.CanvasTexture(crackCanvas);crackMap.colorSpace=THREE.SRGBColorSpace;
    const outerM = rimify(stdMat({ color: '#52443f', emissive: '#a03b28', emissiveMap:crackMap, emissiveIntensity: 0.32, roughness: 0.04, metalness: 0.35, flatShading: true, transparent: true, opacity: 0.74 }), '#ba8466', 0.8, 2.2);
    const core = new THREE.Mesh(gemGeo('B', 6, [[0, -0.7], [0.25, -0.2], [0.3, 0.2], [0.16, 0.65], [0, 0.8]]), glowMat('#b2462c', 2.4));
    const gem = new THREE.Mesh(outerG, outerM);
    const body = new THREE.Group(); body.position.y = 1.55; body.scale.set(1.0, 1.05, 1.0);
    core.renderOrder = 0; gem.renderOrder = 1;
    body.add(core, gem);
    gem.castShadow = true;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color('#a13d29').multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.scale.setScalar(2.6); halo.position.y = 1.55;
    const shards = new THREE.Group(); shards.position.y = 1.5;
    const sg = gemGeo('C', 6, [[0, -0.5], [0.22, -0.1], [0.2, 0.25], [0, 0.55]]);
    const sm = rimify(stdMat({ color: '#94836a', emissive: '#6c3026', emissiveIntensity: 0.45, roughness: 0.05, metalness: 0.3, flatShading: true }), '#c1a17c', 0.7, 2);
    for (let i = 0; i < 5; i++) {
      const sh = new THREE.Mesh(sg, sm), a = i / 5 * TAU;
      sh.position.set(Math.sin(a) * 1.05, Math.sin(i * 2.1) * 0.35, Math.cos(a) * 1.05); sh.scale.setScalar(0.28 + (i % 2) * 0.08);
      sh.rotation.set(0.3 * Math.sin(i), a, 0.25);
      shards.add(sh);
    }
    grp.add(body, halo, shards);
    const sealKit=new Kit();for(const sd of [-1,1]){sealKit.seg([sd*.42,.45,-.03],[sd*.53,1.75,-.03],.09,'#615348',.045,10);sealKit.seg([sd*.53,1.75,-.03],[sd*.20,2.32,-.04],.045,'#b2a085',.026,10);sealKit.add(G.cone(8),'#ad9c80',[sd*.19,2.33,-.04],[0,0,-sd*.22],[.035,.22,.035]);}
    for(let j=-2;j<=2;j++)sealKit.add(G.rbox(2),'#7e6c54',[j*.135,.48,.12],[0,0,j*.08],[.085,.11,.08]);
    const seal=new THREE.Mesh(sealKit.build(),stdMat({vertexColors:true,roughness:.72,metalness:.4}));seal.castShadow=true;grp.add(seal);
    core.onBeforeRender = () => {   // gentle heartbeat of the inner light + orbiting shards
      const t = TIME.t || performance.now() / 1000, p = 0.5 + 0.5 * Math.sin(t * 2.4);
      core.material.color.set('#b2462c').multiplyScalar(1.9 + 1.1 * p);
      core.scale.setScalar(0.95 + 0.08 * p);
      halo.material.opacity = 0.35 + 0.25 * p;
      shards.rotation.y = t * 0.6;
      for (let i = 0; i < shards.children.length; i++) shards.children[i].position.y = Math.sin(t * 1.3 + i * 2.1) * 0.35;
    };
    grp.userData.dispose = () => { outerM.dispose(); core.material.dispose(); sm.dispose(); halo.material.dispose();crackMap.dispose();seal.geometry.dispose();seal.material.dispose(); };
    return grp;
  }

  // Build geometry caches (and optionally compile the shader programs against the live scene's lights) ahead of time,
  // e.g. right after a zone loads, so the first spawn of a type never hitches. Warm instances stay alive (programs persist).
  // types: ['jole', 'golem:magma', 'sancak', 'jellyCrown', …] ('type:variant' builds just that variant; 'sancak' = the knight's
  // banner; 'jellyCrown' / 'havuc' / 'serinTas' / 'hole' = the Round 6 bonus props);
  // variants: optional {type: [ids]} (the shape of ZONES[i].variants). Without either, jole builds its four forest colours and
  // every other type its default look.
  const WARM = {};
  function warm(types, compile = true, variants) {
    const fresh = [];
    for (const tv of types || Object.keys(TYPES)) {
      const [t, v1] = String(tv).split(':');
      if (t === 'sancak') { if (compile && !WARM.sancak) fresh.push(WARM.sancak = sancak()); else if (!DEFS.sancak) sancak().dispose(); continue; }   // (the knight's banners)
      if (PROPS[t]) { if (compile && !WARM[t]) fresh.push(WARM[t] = PROPS[t]()); else if (!DEFS[t]) PROPS[t]().dispose(); continue; }   // (Round 6 bonus props)
      if (!TYPES[t]) continue;
      const vs = v1 ? [v1] : (variants && variants[t] && variants[t].length) ? variants[t] : t === 'jole' ? ['green', 'pink', 'blue', 'purple'] : [undefined];
      for (const v of vs) getDef(t, v, false);
      if (compile && !WARM[t]) fresh.push(WARM[t] = build(t, { variant: vs[0] }));
    }
    if (fresh.length && typeof renderer !== 'undefined' && renderer.compile) {
      const tmp = new THREE.Scene();
      for (const m of fresh) tmp.add(m.root);
      try { renderer.compile(tmp, camera, scene); } catch (e) { console.warn('EMODEL.warm', e); }
      for (const m of fresh) tmp.remove(m.root);
    }
  }
  function stats() { const out = {}; for (const k in DEFS) out[k] = DEFS[k].verts; return out; }

  return { build, owl, merchant, babyDragon, sancak, jellyCrown, havuc, serinTas, hole, crystal, warm, stats, TYPES: Object.keys(TYPES), VARIANTS, PROPS: Object.keys(PROPS) };
})(G);
