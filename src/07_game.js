/* ── Oyun: oyuncu kontrolü, dövüş, düşman yapay zekâsı, mermiler, ganimet, seviye, boss, bölgeler, kayıt ──
   Bütün simülasyon burada; DOM'a dokunmaz (UI'nin işi). Sözleşme: src/SPEC.md → "GAME".
   Extras beyond the SPEC: events 'happy' {type,x,z,elite,boss} and 'equip' {item,slot}; GAME.boss, GAME.time,
   GAME.unequip(slot), addItem(item), cast(i), hurtPlayer(n,x,z,kb), heal(frac). newGame() called in state 'end' (victory
   screen) starts NEW GAME+; newGame({plus:false}) forces a fresh start. GAME.update(dt) should run in every state except
   'title' (it drives the respawn timer, portal shrink and victory cheer); a timeout fallback respawns if it is not called.
   How hard the game is: the DIFF table below (measured with the kid bots in test/fix_src_07_game_js_balance.html; the
   dragon fight alone in test/fix_src_07_game_js_boss.html: its hp follows Feza's damage, and every nap tires it).
   loadZone() pre-compiles and draws everything the zone will show (warmZone) while the loading fade covers the screen.
   Feza's request: every sword is a LIGHTSABER (slash + hit sparks + Feza's light take ITEMS.bladeColor; the blade ignites
   with 'saberOn' at every zone start and respawn), the Köstebek burrows (kind 'burrow', st.burrow 0..1; untargetable while
   underground), the Salyangoz blows soap bubbles and leaves a slime trail, the dragon breathes bubbles and glitter.
   Round 3 (Feza: a volcano zone + a boss at the end of EVERY zone): one boss framework for all four (arena aggro, 'boss'
   event {on, name, type, final, hp, maxHp}, boss music, intro line, hp sized to Feza's damage per boss (DIFF.boss), naps
   tire the boss, checkpoint at the arena entrance). Çürük Taç hops + slams + spits jelly, Mezar Kazıcısı burrows + pops up
   under Feza + throws dirt clods + drills, Kül Muhafızı erupts lava balls onto circles + rolls along a lane +
   stomps; each summons little ones. A mid-zone boss cheering up drops treasure and opens the zone's portal (it is shut
   until then; an inactive portal does nothing); the dragon keeps the crystal finale. New creatures: kaplumbaga (tucks
   in and rolls at Feza along a lane), ateskusu (flying fire chick flicking slow embers). DIFF arrays are in ZONES order
   orman, magara, yanardag, kale (looked up by zone id). Saves before sv 3 with zone ≥ 2 move one zone on (castle = 3).
   Extra event 'portalOpen' {x, z}; 'happy' also carries final (true for the dragon). The final boss lives in the last zone.
   Round 3 QA fixes: a boss never sits inside Feza (separate() moves the boss when he cannot give way; hops / pop-ups land
   next to him); a portal that just opened does not swallow Feza standing on it (L.portalObj.openT / .armed: walk-in after
   PORTAL.wait s and once he was PORTAL.arm m away; a tap always works) and the boss's treasure flies to him (and into his
   pockets on entering); Kaydet after a mid-zone boss saves the NEXT zone, after the dragon flags.bossDone (crystal waits);
   a nap keeps the pack's progress (NAP); the arena checkpoint is just outside the arena; 'kapi' is skipped when the boss's
   happy line already says the door opened; a new skill's line waits for the boss story (skillQ).
   Tap-to-walk never runs in place: a net-progress watchdog (tapWalkProgress, PROG) swings at a vase in the way, else
   walks round once, else stands still (test/r3y_src_07_game_js_stuck.html).
   Round 4 (Feza: KEFİR VADİSİ, zone 1 right after the forest): DIFF arrays are in the 5-zone order orman, kefir, magara,
   yanardag, kale (ZORDER; looked up by zone id, so a 4-zone ZONES list still maps right). New creatures: yogurt hops at
   Feza and bumps (hopStep: crouch = st.windup, the hop = st.attack/st.air while GAME lifts the root along an arc, a
   circle shows where it lands), kaymak glides and dashes along a short lane leaving a creamy trail (rollStep with
   GLIDE numbers, FX 'slime' tinted cream), kopuk is a flying fizz-bubble shooter (shot kind 'fizz' floats and pops like a
   soap bubble), peynir is the slow heavy one (kind 'slam': a ground circle, cheese crumbs). Boss kefirdev (kefirdevStep):
   shake (wind-up, the foam cone shows) → geyser (a foam cone that pushes Feza out), bubbles (5 slow fizz bubbles in a
   fan), slam (hops and lands with a milk-splash ring), summons kopuk at 66 % / 33 %, a happy "fizz!" roar. When it cheers
   up it hands Feza a glass of kefir (GIFT: the glass flies to him, he puts the saber away, raises it, drinks — cheer pose,
   sparkles, full heal, 'kefirdev_bitti' → 'kefir_ikram' → 'kefirdev_yol'), then the treasure pops out, it waves goodbye
   and the portal opens (the 'happy' event carries beat = s until then and gift: true; extra event 'gift' {stage: 'drink' |
   'drunk', x, z, dur}). In the kefir zone the hearts are little kefir bottles and a cow moos far away now and then.
   'yolculuk' is said once after giris2; first-sight lines ilk_yogurt / ilk_kaymak / ilk_kopuk (≥ 5 s apart, a missed
   one comes at the next sighting). Saves are sv 4 and carry the zone id (zid): sv 3 with zone ≥ 1 moves one zone on
   (older ones first get the sv < 3 step). A checkpoint wake-up spot is always one Feza fits in, and a Feza pushed half
   into a wall steps out to the nearest free spot (a kid bot stood stuck in a castle corner for 100 s).
   Round 4 QA fixes: the voice waits its turn — first-sight lines (and the forest's name 'orman', now said at the first
   jelly / mushroom) start only when the narrator is free, FIRST_GAP s after the last one ENDED; 'yolculuk' comes at the
   first calm moment after giris2 (the owl first when Feza stands at it; the owl never queues behind other lines); the
   first skill's line waits for the intro; a skill won at a mid-zone boss is said in the next zone. The portal holds Feza
   while the cheered boss's story line plays (a tap waits in the swirl: C.portalHold); the Kefir Devi's portal wakes as
   'kefirdev_yol' reaches "Yol mağaradan geçiyor!", the giant waves until then and twirls away just before; the hand-over
   waits while Feza naps; no swings/skills while it hands him the glass (a İnfaz Çemberi kept him whirling through the drink);
   the geyser's foam zone stays on the ground for the whole spray and its foam is a creamy fountain. The crystal waits for
   'ejderha_bitti'. Walking: routeTo walks to the best reachable spot near a finger on a bush / the milk; a drag that
   bounces in a wall corner re-routes (DRAGWIN); a ranged creature behind a wall comes round instead of backing off.
   Round 5 (Feza: SURLU ŞEHİR, the walled town before the dragon's castle = zone 4, the castle is now 5): DIFF arrays have
   six entries in ZORDER (orman, kefir, magara, yanardag, sehir, kale). Saves are sv 5; a save with a zid follows its id, one
   without keeps mapping its number through the Round 4 order (ZORDER4: an old castle save stays the castle). The town's
   grumpy people: nobetci (a spear poke, melee), simitci (throws simits: shot 'simit', ends in crumbs + a soft pop),
   supurgeci (glides along a lane like the kaymak, the broom whooshes and stirs up dust: DUSTY), tellal (HEAVY: the drum BOOM
   is a ground ring with music notes, 'drum'; the bell on his hat dings as he winds up). Boss sovalye (sovalyeStep, SOV;
   beats = 05's model timing contract): charge (a lane toward Feza's spot, 0–0.3 paws while the lane fills, 0.3–0.9 gallops
   to the arena rim bumping him at most once, 0.9–1 skids), rear (a ring fills 0–0.5, the stomp lands at 0.5), sweep (a wide
   lance cone fills 0–0.5, hit at 0.5), toss (3 silver horseshoe mortars at 0.35 / 0.5 / 0.65 onto circles, the first on
   Feza's spot), summons 2 nobetci at 66 % / 33 % with a little horn, neighs instead of roaring. Its TBC move is
   'berserkercharge' (Attumen: two telegraphed gallops across the arena forming a cross, BERSERK), and its arena surprise
   'sancak': at 60 % hp three tournament banners (EMODEL.sancak; they live in L.breakObjs with .banner while they stand, no
   loot) — all three knocked over → it is dizzy for SOV.dizzy s. He gallops all over his arena, so "Feza ran off" is
   counted from the arena's middle (kit.roam), and 'kapi' waits for his happy line (it never mentions the door). The town
   dings a far bell now and then (the kefir valley's moo). Balance: DIFF (test/r5_game_kid.html; mechanics, saves and
   every boss's surprises in test/r5_game_boss.html, r5_game_save.html, r5_game_tbc.html).
   Round 6 (boss polish): every boss has one optional "bonus" idea (BONUS, BOSS_KIT[type].bonus, bonusStep): do it and the
   boss is silly and helpless for a few s (a stun phase via bonusStun, which the banners' dizzy uses too); ignore it and
   nothing is lost. Çürük Taç's crown falls off (tac), the Kefir Devi blows a giant bubble to pop (balon), Mezar Kazıcısı
   plays hide-and-seek in 4 holes (avla), cool rocks tip the rolling turtle over (serintas), a carrot feeds the knight's horse
   (havuc), friendship hearts charm the dragon (kalp). Its pickable things are L.breakObjs with .bonus; the TBC timer waits
   while one runs (q.timer ≥ BONUS.timerAfter after it). Extra: event 'bonus' {on, kind, type, have, need, state},
   GAME.bonusSpot() (where the camera should look too), b.st.aggro, b.st.crownOff; the turtle's roll now ends
   in its own 'rollend' phase. EMODEL.jellyCrown / havuc / serinTas / hole, FX.marker / dizzy and the 'heart' / 'bigbubble'
   projectiles are optional (plain stand-ins). test/r6_game_bonus.html. */
const GAME = (() => {
  'use strict';

  // ── Tuning (forgiving on purpose: a 5-year-old must always make progress) ──
  const T = {
    heroR: 0.42, speed: 5.2, baseHp: 100,
    swing: 0.34, swingBig: 0.46, hitAt: 0.4, reach: 2.1, arc: 70 * Math.PI / 180, autoR: 2.0, crit: 0.1,
    autoDragR: 1.1, autoDragArc: 45 * Math.PI / 180,   // (was 80°: a sideways dodge past a big boss kept swinging)
    fleeArc: 60 * Math.PI / 180,   // a finger / keys more than this off a sword swing's facing end it (dodging sideways too)
    activeR: 36, hideR: 46, leash: 26, maxMelee: 4, maxRanged: 3, enemyMaxSpeed: 4.5,
    windMin: 0.5, iframes: 0.3, respawn: 3.2, regenDelay: 5, magnet: 2.5,
  };
  // ── Difficulty: the one place to tune how hard the game is (parent, 2nd round: "the creatures go happy at once,
  //    only the dragon was strong — make the whole game a bit harder") ──
  // Arrays "per zone" are in ZONES order: orman, kefir (Round 4), magara, yanardag (Round 3), sehir (Round 5), kale — looked
  // up by zone id (see zslot).
  const DIFF = {
    // Normal only: better gear keeps more of its advantage; the wizard casts a little faster and a won boss game
    // rewards the following attacks. Zor keeps the original scaling, wand timing and bonus damage.
    normal: { bossLength: .57, powerK: 0.55, bossPower: 0.75, wandSwing: 0.5, bonusHit: 1.25 },
    // Repeat adventures use a saved start-of-round reference, never the currently equipped item.
    repeat: { health: [105, 120, 140, 185, 250, 310, 370, 440], damageGrowth: 0.5, healthGrowth: 0.35, pressure: 0.06, maxPressureRounds: 5 },
    hp: 3.4,            // normal enemy hp (was 2.6; zone 0 jelly: ~6 sword hits at the start)
    // × per zone (Round 3: Feza now reaches the castle a zone stronger, so it went from 0.9 back to 1; Round 4: the kefir
    // valley is gentle, and Feza now reaches the cave ~2 levels stronger, so the later zones went up to feel as before)
    // (Round 4, test/r4_game_kid.html, seeds 11/23/37 × masher/hold/tap bots vs the 4-zone build: the kefir valley with
    //  0–1 potions and no naps, the cave/volcano/castle back to about the potions and low-hp moments they had before)
    // Round 5: the town sits between the volcano and the castle (ZONES hpMult 2.55; the castle's went 2.8 → 3.0 and Feza
    // arrives there ~2 levels and an item level stronger: see power.dmg). test/r5_game_kid.html (the 6-zone game, 35 kid-bot
    // runs of all 3 classes): a town guard takes ~9 hits, as a castle toy soldier does.
    zoneHp: [.85, .92, 1.15, 1.1, 1.3, 1.08, 1.08, 1.05],
    hpType: { golem: 0.7, salyangoz: 0.8, kaplumbaga: 0.85, peynir: 0.8, tellal: 0.75 },   // the big slow golem, the slow bubble snail, the shell turtle, the cheese wedge and the drummer are tanky enough already
    eliteHp: 3.4,       // elites: hp × this (on top of hp; was 3)
    eliteDmg: 1.5,      // elites: damage × this (their hp went up: their punch stays)
    // A strong sword must not turn the creatures happy in one or two hits (lots of treasure, or the next adventure round):
    // above the usual sword damage for the zone (× the round's hp factor), creature hp grows with Feza's damage^k.
    // (Round 5: the town 50; the castle 54 → 58, Feza now comes through the town first)
    power: { dmg: [12, 16, 20, 28, 36, 44, 50, 58], k: 0.8 },
    bossHp: 11.5,       // dragon hp at most (a button-masher with a good sword needs about a minute; Round 4: 8 → 8.8, Feza comes stronger;
                        //    Round 5: → 10, after the town he meets it at lvl 15 with dmg 73–77: capped at 14 080 hp the kid bots
                        //    needed 53–70 s, at 16 000 58–86 s; Round 5 QA: the warrior masher, always at the cap, took 57–63 s
                        //    in 6 runs (2 under 60) → 10.5 (16 800 hp); the hybrid is sized on its wand below the cap, see bossHpNow:
                        //    21 masher runs: warrior 57–67 s (avg 63), wizard 76–79 (77), hybrid 75–86 (81; below the cap it
                        //    is unaffected: 72–90 s in 12 runs, was 88–100))
                        //    Round 6: → 11.5 (18 400 hp; the warrior now meets it with dmg 73–77, below the cap, see below)
    bossHpPerDmg: 232, bossHpMin: 0.58, bossHybridK: 0.88,  // …sized to Feza's sword when the fight starts: 232 × P.dmg, at least 58 % of the max (2nd round: 175;
                                         //    Round 3: Feza reaches the castle a zone stronger, the fight stays ~1 minute, 60–90 s)
                                         //    Round 6 (target 60–85 s; the friendship hearts: 3 waves, each −5 % hp + a 4 s
                                         //    'charmed'): at 220 the warrior masher took 57–64 s, the hybrid who ignores the
                                         //    hearts 85–91 s → 232, and the hybrid sized on 0.88 × its wand (bossHybridK). 42
                                         //    runs (test/r6_game_kid.html, seeds 11–77): ignore 59–83 s avg 74 (warrior 64,
                                         //    wizard 81, hybrid 76), go 55–75 avg 66 (64 / 72 / 62); 0 naps (Round 5: 74 s, 2 in 12)
    bossDmg: 0.9,       // dragon damage (the fight is long now: a careless kid should nap only once or twice)
    // Round 3: the bosses at the end of zones 0–2. hp = per × Feza's damage (clamped to lo..hi) × (1 + 0.5 × round), sized
    // when the fight starts; dmg = the base hit (× 1 + 0.3 × round). Targets for a button-masher: kral jöle ~30–45 s,
    // usta köstebek ~40–55 s (it spends time underground), lav kaplumbağası ~50–70 s (the dragon above: ~60–90 s).
    boss: {   // (Round 3 QA: masher fights measured 34 s / 45 s → per 100 / 125 raised a little to centre them in their targets)
      // (Round 4 QA, kid bots without potions: Çürük Taç put every run to sleep (~187 hp per fight vs 124–148 max hp) → dmg
      //  14 → 12; the Kefir Devi / Mezar Kazıcısı ran 52–62 s for kids who tap or hold → per 140 → 130 and 130 → 124)
      // Round 6 (each boss's bonus idea, BONUS; targets 35–50 / 40–55 / 45–60 / 50–70 / 55–75 / 60–85 s): test/r6_game_kid.html,
      // masher + potion tap, 3 classes, seeds 11 23 37 51 64 77 (21 runs per policy): &bonus=ignore (the Round 5 kid) and
      // &bonus=go (taps GAME.bonusSpot(): fetches the crown / carrot / hearts, pops the bubble, bonks the mole, hides behind a
      // rock 8 s at a time). A stun gives a few free hits but going for it costs time too, so the two land close together.
      // Before (Round 5 numbers, 12 runs): 34–55 s avg 44 · 37–56 avg 46 · 42–63 avg 51 · 55–84 avg 71 · 52–79 avg 62.
      // The class spread stays (wizard ≈ 1.3 × warrior on the first four; no per-class hp factor, as in Round 5 QA).
      //  kraljole 110 → 106, dmg 12 → 11 (the wizard fetching the crown napped in 4 of 4 fights at 12; at 11: 0 in 18):
      //    ignore 34–52 avg 43 (warrior 35, wizard 50, hybrid 43), go 37–51 avg 43 (39 / 50 / 39), the crown won in 16 of 21 (go)
      //  kefirdev 130 → 135: ignore 36–59 avg 48 (41 / 54 / 48), go 39–63 avg 49 (41 / 53 / 53); a bubble popped in every fight (the new due timer)
      //  kostebekusta 124 → 114: ignore 42–66 avg 53 (46 / 63 / 50), go 41–68 avg 54 (49 / 64 / 50); the mole caught in every fight
      //  lavkaplumbaga 205 → 165 (Round 5 already ran long, 71 s; hiding behind the rocks costs time): ignore 44–69 avg 58
      //    (47 / 63 / 62), go 49–78 avg 64 (58 / 67 / 66), a flip in 20 of 21 (go)
      //  sovalye 133 → 138 (below): ignore 48–86 avg 67 (69 / 75 / 59), go 48–82 avg 64 (61 / 72 / 59), carrot fed in 21 of 21
      kopukusta:     { per: 72, lo: 10, hi: 24, dmg: 7 },
      aytavsan:      { per: 85, lo: 12, hi: 30, dmg: 9 },
      kraljole:      { per: 106, lo: 15, hi: 34, dmg: 11 },
      kefirdev:      { per: 135, lo: 18, hi: 40, dmg: 16 },   // Round 4: Veba Rahibi, ~35–50 s for a button-masher (Round 6: 40–55)
      kostebekusta:  { per: 114, lo: 21, hi: 48, dmg: 26 },   // (Round 4: met ~2 levels stronger: 23 → 26)
      lavkaplumbaga: { per: 165, lo: 26, hi: 60, dmg: 26 },   // (25 → 26)
      // Round 5: Yeminbozan, ~55–75 s for a button-masher. Feza meets him at lvl 12–14 with the volcano's treasure (dmg
      // 67–73 in every kid-bot run). SPEC's first guess per 230 (15 640 hp) took the bots 86–121 s (he gallops off across the
      // arena, rides his Berserker Charge and calls four sturdy guards); per 125 (8 625 hp): masher 52–76 s (avg 58), hold /
      // tap 71–82 s, 0.35 naps per fight and never two (test/r5_game_kid.html, 22 runs, 3 classes, no potions) → 130
      // (8 970 hp; 9 more runs: masher 51–76 s, avg 64, tap / hold 73–75 s, 0.1 naps). Round 5 QA (89 runs in the real town):
      // masher warrior 52 s / wizard 80 s — his 4 guards (full town stats) did ~40 % of the damage and slowed the wand most →
      // lighter guards (BOSS_KIT addHp 0.6 / addDmg 0.7) instead of a per-class hp factor, per 130 → 133 (9 177 hp). 39 masher
      // runs (test/r5_game_kid.html, seeds 11–81, 24 with the potion tap, 15 without): 53–87 s, avg 66 (warrior 62, wizard 73,
      // hybrid 64), 0 naps in all 39 fights, the guards' share 0–48 %, avg ~25 %; hold 58–115 s (the wizard's 102 / 115 s as in
      // his other zones), tap 64 / 84 s. The town's own naps: 0.6 per visit without potions (warrior 0.2, wizard 1.2, hybrid
      // 0.4), 0.25 with; the castle's 1.4 without (0.4 / 2 / 1.8), 0.3 with.
      sovalye:       { per: 138, lo: 30, hi: 76, dmg: 28 },
    },
    bossNap: { dmg: 0.75, dmgMin: 0.55, hp: 0.08 },   // each nap in a boss fight tires the boss: damage ×0.75 (down to ×0.55), −8 % hp
    dmg: 1.8,           // enemy damage (was 1.5)
    // Final incoming damage: applied once to melee, shots and boss/area attacks, before armour and rounding.
    damageTaken: { normal: 2.6, hard: 4.5 },
    // × per zone: the forest must bite a little too (a potion now and then); the volcano's rolling turtles and ember chicks
    // come in crowds. Round 3 QA (10 naive kid runs: forest/cave hit as hard as each other while Feza is much weaker in the
    // forest, level-1 naps in the first 20 s; the castle was the easiest): was [1.7, 1.2, 1, 1]. Round 4: the kefir valley
    // bites softly; the cave / volcano / castle are met ~2 / 1.5 / 1 levels stronger, so they hit a little harder.
    // Round 4 QA (21 kid-bot runs): the forest napped 1.67× without potions (target 0–1) → 1.35 (0.56–0.67 naps); the castle
    // only 0.67× (target 1–2) → 1.33 (1.33 naps).
    // Round 5 (ZONES dmgMult: the town 1.8, the castle's 1.9 → 2.0): Feza reaches the castle at lvl 15 wearing the knight's
    // treasure (the warrior's helmet +200 hp, the wizard's cape 41 % armour): at 1.33 it napped the kid bots 0.3× (target
    // 1–2) → 1.7 (1.2× over the 3 classes: warrior 0.6–1, wizard 2, hybrid 1–2; the finger-holding bot naps a wizard /
    // hybrid 2–5× there, as often as in the cave). The town at 1.22 napped them more than the castle → 1.12 (0.8×).
    zoneDmg: [.7, .8, 1.35, 1.15, 1.4, 1.2, 1.12, 1.7],
    atkCd: 0.75,        // enemy attack cooldown (was 0.85; wind-ups unchanged, always ≥ T.windMin)
    xp: 1.1,            // xp per enemy (level pace stays about the same although fights are longer)
    heart: 0.1,         // a heart heals this fraction of max hp (was 0.12)
    heartDrop: 0.65,    // heart drop chances × this (was 0.75)
    potions: 2,         // potions at the start of a new game (max stays 5)
    regenFight: 0.012, regenCalm: 0.05,   // hp fraction per second, T.regenDelay s after the last hit (was 0.02 / 0.05)
  };
  // ── Treasure (parent: "too many items, the bag fills up with the same or similar things") ──
  // The bag keeps ONE piece per look (slot + base): a stronger copy takes the old one's place. Drops are rarer and look
  // for something Feza doesn't have yet; a roll that would only repeat what he has becomes a few coins instead.
  const DROP = {
    normal: 0.02,       // item chance from a normal enemy (was 0.05)
    elite: 0.5,         // from an elite (was: always)
    chest: 0.6,         // from a small chest (was: always); a big chest gives one (was two), the dragon one (was two)
    tries: 6,           // rolls looking for a new look (or a clearly stronger copy of one he has)
    upgrade: 1.3,       // a copy of a look he has, same rarity, must be this much stronger (and beat what he wears) to drop at all
  };
  // v3: only manual saves (Kaydet) from now on — the automatic v2 saves are ignored, so every device starts fresh once.
  // Older keys (.v1, .v2) stay untouched on the device as leftovers. Keep in sync with 09_ui.js.
  const SAVE_KEY = 'fezaBilboMerhamet.save.v1';
  const MAP_KEY = 'fezaBilboMerhamet.gecitHaritasi.v1';
  let mapOpen = false;
  try { mapOpen = localStorage.getItem(MAP_KEY) === 'acik'; } catch(e) {}
  function mapUnlocked() { return mapOpen || P.ng > 0; }
  function travelTo(index) {
    const Z=zones(); if(!mapUnlocked() || !Z || !Number.isInteger(index) || index<0 || index>=Z.length || GAME.state==='transition' || P.dead)return false;
    if(GAME.state==='title') { const saved=readSave(); if(saved)applySave(saved); else resetPlayer(); }
    GAME.paused=false; aud('stopVoice'); C.keyX=C.keyZ=0; loadZone(index); return true;
  }
  const LEGACY_HARDCORE_KEY = 'fezaBilboMerhamet.hardcore.v1';
  const LEGACY_IGNORED_KEY = 'fezaBilboMerhamet.legacyHardcoreIgnored';
  const HC = { hp: 1.35, bossHp: 1.25, dmg: 1.5, bossDmg: 1.45, special: 1.55, speed: 1.12, cd: 0.78, wind: 0.85 };
  let hard = false, legacyIgnored = false;   // one adventure/save flow; difficulty changes only combat

  // save layout version (sv): 3 = Round 3's zone order (orman, magara, yanardag, kale); 4 = Round 4's (orman, kefir, magara,
  // yanardag, kale) — from sv 4 on the save also names its zone (zid), so a later reorder cannot move a save; 5 = Round 5's
  // (… yanardag, sehir, kale = ZORDER).
  const SAVE_V = 6;
  const WORDS = ['Son.', 'Hüküm.', 'Kül.', 'Merhamet yok.'];
  // Lightsaber blade colours (fallback when ITEMS.bladeColor is missing; gokkusagi cycles through the rainbow).
  const BLADE_COL = { tahta: '#c8f4ff', demir: '#3f9dff', kristal: '#3dff66', ates: '#ff3344', yildiz: '#b455ff' };
  const SHOT_KIND = { mantar: 'spore', salyangoz: 'bubble', hayalet: 'ghost', atescik: 'fire', ejderha: 'dragonfire', ateskusu: 'ember',
    kraljole: 'jelly', kostebekusta: 'rock', lavkaplumbaga: 'lavaball', kopuk: 'fizz', kefirdev: 'fizz', simitci: 'simit', sovalye: 'horseshoe' };
  const SHOT_COL = { spore: '#a0a16b', bubble: '#879269', ghost: '#b0a3b3', fire: '#c87b43', dragonfire: '#bd4e39',
    ember: '#d69659', jelly: '#84705b', rock: '#9e8a71', lavaball: '#da7338',
    fizz: '#a0a46d', simit: '#b2b6ac', horseshoe: '#bcb7a9' };
  // How an enemy shot ends when it hits or fades (burst kind, sfx): soap bubbles pop on their own (bubblePop).
  // (jelly: FX's glossy jelly splat in the blob's colour — 'slime' is the snail's trail lying on the floor)
  // (Round 5: a simit breaks into sesame crumbs with a soft pop; a horseshoe mortar lands with a dust puff and a clink)
  const SHOT_END = { jelly: ['jelly', 'splat'], rock: ['dirt', 'hitSoft'], ember: ['embers', null], lavaball: ['lava', 'splat'],
    simit: ['rend', 'clank'], horseshoe: ['hoof', 'clank'] };
  const ELITE_AD = { kostebek: 'Kocaman Köstebek', salyangoz: 'Kocaman Salyangoz', kaplumbaga: 'Kocaman Kaplumbağa', ateskusu: 'Kocaman Ateş Kuşu',
    yogurt: 'Kocaman Yoğurt', kaymak: 'Kocaman Kaymak', nobetci: 'Kocaman Nöbetçi', simitci: 'Kocaman Simitçi', supurgeci: 'Kocaman Süpürgeci' };
  // said once per game, the first time that type notices Feza (the flags go into the save)
  const FIRST_LINE = { kakacik:'ilk_kakacik', cisdamlasi:'ilk_cisdamlasi', sabunkopugu:'ilk_sabunkopugu', ayponpon:'ilk_ayponpon', yildizcik:'ilk_yildizcik', kratercik:'ilk_kratercik', kostebek: 'ilk_kostebek', salyangoz: 'ilk_salyangoz', kaplumbaga: 'ilk_kaplumbaga', ateskusu: 'ilk_ateskusu',
    yogurt: 'ilk_yogurt', kaymak: 'ilk_kaymak', kopuk: 'ilk_kopuk',
    nobetci: 'ilk_nobetci', simitci: 'ilk_simitci', supurgeci: 'ilk_supurgeci', tellal: 'ilk_tellal' };
  // s of quiet after a first-sight line ENDS before the next one (three new kinds in one kefir room: the next one waits a
  // moment; Round 4 QA: counted from the request, they still played back-to-back behind the zone's name in AUD's queue)
  const FIRST_GAP = 5;
  const RAR_COL = ['#f4f4f4', '#5aa8ff', '#ffd23f', '#ff8a1c'];
  const VARIANTS = { jole: ['green', 'pink', 'blue', 'purple'] };
  // the order of DIFF's per-zone arrays (Round 4: the kefir valley is 1; Round 5: the walled town is 4, the castle 5)
  const ZORDER = ['tuvalet', 'ay', 'orman', 'kefir', 'magara', 'yanardag', 'sehir', 'kale'];
  const ZORDER5 = ['orman', 'kefir', 'magara', 'yanardag', 'sehir', 'kale'];
  const ZORDER4 = ['orman', 'kefir', 'magara', 'yanardag', 'kale'];   // Round 4's order: what a zone number means in an sv < 5 save
  const ROLLERS = { kaplumbaga: 1, kaymak: 1, supurgeci: 1 }; // melee by rolling / gliding along a lane (EDEF kind 'roll' / 'glide' / 'slide' too)
  const HOPPERS = { yogurt: 1 };                             // melee by hopping at Feza and bumping him (EDEF kind 'hop' too)
  const HEAVY = { peynir: 1, tellal: 1 };                    // slow heavy melee: a ground-circle slam like the golem's (EDEF kind 'slam' too)
  const CREAMY = { kaymak: '#ffdf9e' };                      // leave a short creamy trail while they move (honey cream: reads on the white yogurt)
  const DUSTY = { supurgeci: '#ecdcb4' };                    // (Round 5) the street sweeper's broom stirs up little straw-dust puffs instead
  // Per-type lane-attack numbers (EDEF roll:{…} overrides): the turtle rolls, the clotted-cream swirl glides.
  const GLIDE = { start: 2.5, speed: 8.5, len: 3.6, w: 1.1, rec: 0.75 };
  // Boss behaviour data (tuning numbers are in DIFF.boss). lines: voice keys (EDEF[type].lines overrides); add: the little
  // ones it calls at the hp fractions `at` (n of them each time); roar: pitch of its (cute) roar; summonAt: when in its summon
  // phase (0..1) the little ones pop up (the model's "come out, friends!" beat; default 0.47); addHp / addDmg: the called
  // ones' hp / damage × this (default 1).
  // Round 6: bonus = its arena bonus idea (BONUS, bonusStep).
  const BOSS_KIT = {
    kopukusta: { lines: { giris: 'kopukusta_giris', bitti: 'kopukusta_bitti' }, add: 'sabunkopugu', at: [.5], n: [2], roar: 1.6, col: '#7ee8df', dream: true },
    aytavsan: { lines: { giris: 'aytavsan_giris', bitti: 'aytavsan_bitti' }, add: 'ayponpon', at: [.5], n: [2], roar: 1.7, col: '#c9bbff', dream: true },
    kraljole:      { lines: { giris: 'kraljole_giris', bitti: 'kraljole_bitti' }, add: 'jole', at: [0.66, 0.33], n: [3, 3], roar: 1.1, roarSfx:'rotRoar', col: '#b6977c', bonus: 'tac' },
    kostebekusta:  { lines: { giris: 'usta_giris', bitti: 'usta_bitti' }, add: 'kostebek', at: [0.66, 0.33], n: [3, 3], roar: 1, roarSfx:'graveRoar', col: '#aa9578', summonAt: 0.8, bonus: 'avla' },
    lavkaplumbaga: { lines: { giris: 'kaplumbaga_giris', bitti: 'kaplumbaga_bitti' }, add: 'kaplumbaga', at: [0.5], n: [2], roar: 0.95, roarSfx:'ashRoar', col: '#c98658', bonus: 'serintas' },
    // Round 4: gift = it hands Feza a glass of kefir when it cheers up (see GIFT); roarSfx: its happy "fizz!" instead of a roar
    kefirdev:      { lines: { giris: 'kefirdev_giris', bitti: 'kefirdev_bitti' }, add: 'kopuk', at: [0.66, 0.33], n: [2, 3], roar: 1, col: '#a8a47c', gift: false, roarSfx: 'plagueRoar', bonus: 'balon' },
    // Round 5: the knight's horse neighs (+ an armour clink and a grumpy "Teslim ol!"); horn: he blows a little horn as the guards
    // come; roam: he gallops all over his arena (see bossStep). Round 5 QA (89 kid-bot runs): his 4 guards with full town
    // stats (~700 hp each) did ~40 % of the damage Feza took in his fight, more than his own warned moves, and made the
    // wand's fights long → lighter guards (addHp / addDmg): his own dodgeable moves are the danger
    sovalye:       { lines: { giris: 'sovalye_giris', bitti: 'sovalye_bitti' }, add: 'nobetci', at: [0.66, 0.33], n: [2, 2], roar: 1.05, col: '#ffd23f', roarSfx: 'neigh',
      summonAt: 0.5, horn: true, word: 'Teslim ol!', roam: true, addHp: 0.6, addDmg: 0.7, bonus: 'havuc' },
    ejderha:       { lines: { giris: 'ejderha_giris', bitti: 'ejderha_bitti', yarim: 'ejderha_yarim', add: 'ejderha_yumurta' }, add: 'yarasa', at: [0.66, 0.33], n: [3, 4], roar: 1, roarSfx:'nightRoar', col: '#ad5947', bonus: 'kalp' },
  };
  // Fallback enemy stats (EDEF overrides every field it defines).
  const DEF0 = {
    jole:    { ad: 'Jöle', hp: 22, dmg: 5, speed: 2.6, r: 0.5, height: 0.8, xp: 10, gold: 3, kind: 'melee', atkRange: 0.9, atkCd: 1.6, windup: 0.6, aggro: 8.5 },
    mantar:  { ad: 'Mezar Mantarı', hp: 26, dmg: 6, speed: 1.8, r: 0.5, height: 1.0, xp: 12, gold: 3, kind: 'ranged', atkRange: 7, atkCd: 2.4, windup: 0.7, aggro: 9 },
    yarasa:  { ad: 'Yarasa', hp: 12, dmg: 4, speed: 4.4, r: 0.45, height: 0.6, xp: 8, gold: 2, kind: 'melee', atkRange: 0.9, atkCd: 1.5, windup: 0.5, fly: true, hover: 0.9, aggro: 10 },
    goblin:  { ad: 'Kemik Yağmacısı', hp: 38, dmg: 8, speed: 2.9, r: 0.55, height: 1.2, xp: 16, gold: 5, kind: 'melee', atkRange: 1.1, atkCd: 1.8, windup: 0.65, aggro: 9 },
    kostebek: { ad: 'Köstebek', hp: 30, dmg: 7, speed: 3.2, r: 0.5, height: 0.9, xp: 14, gold: 1, kind: 'burrow', atkRange: 1.4, atkCd: 1.6, windup: 0.6, aggro: 9 },
    salyangoz: { ad: 'Salyangoz', hp: 40, dmg: 6, speed: 1.2, r: 0.6, height: 0.9, xp: 16, gold: 1, kind: 'ranged', atkRange: 6.5, atkCd: 2.6, windup: 0.7, aggro: 9,
      shot: { kind: 'bubble', speed: 4.5, r: 0.35 } },
    hayalet: { ad: 'Hayalet', hp: 30, dmg: 7, speed: 2.2, r: 0.5, height: 1.1, xp: 14, gold: 4, kind: 'ranged', atkRange: 6.5, atkCd: 2.6, windup: 0.75, fly: true, hover: 0.35, aggro: 9 },
    golem:   { ad: 'Kaya Devi', hp: 140, dmg: 14, speed: 1.5, r: 1.1, height: 2.4, xp: 45, gold: 12, kind: 'slam', atkRange: 2.6, atkCd: 2.8, windup: 1.0, aggro: 9 },
    asker:   { ad: 'Teneke Asker', hp: 55, dmg: 10, speed: 2.6, r: 0.55, height: 1.3, xp: 22, gold: 6, kind: 'melee', atkRange: 1.2, atkCd: 1.9, windup: 0.7, aggro: 9 },
    atescik: { ad: 'Ateşçik', hp: 32, dmg: 8, speed: 2.4, r: 0.5, height: 0.9, xp: 16, gold: 4, kind: 'ranged', atkRange: 7, atkCd: 2.5, windup: 0.7, fly: true, hover: 0.3, aggro: 9 },
    ejderha: { ad: 'Gece Yutan', hp: 1600, dmg: 16, speed: 1.6, r: 2.2, height: 4.5, xp: 600, gold: 150, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, aggro: 14 },
    // Round 3 (volcano creatures + the zone bosses; used until 05_enemies has them)
    kaplumbaga: { ad: 'Minik Lav Kaplumbağası', hp: 36, dmg: 7, speed: 2.1, r: 0.55, height: 0.75, xp: 16, gold: 4, kind: 'roll', atkRange: 2.2, atkCd: 2.0, windup: 0.75, aggro: 9 },
    ateskusu: { ad: 'Ateş Kuşu', hp: 26, dmg: 7, speed: 2.6, r: 0.45, height: 0.8, xp: 14, gold: 4, kind: 'ranged', atkRange: 6.5, atkCd: 2.5, windup: 0.7, fly: true, hover: 0.95, aggro: 9.5,
      shot: { kind: 'ember', speed: 4.6, r: 0.3 } },
    kraljole: { ad: 'Çürük Taç', hp: 900, dmg: 12, speed: 1.9, r: 1.5, height: 2.8, xp: 150, gold: 40, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, aggro: 12 },
    kostebekusta: { ad: 'Mezar Kazıcısı', hp: 1100, dmg: 14, speed: 2.0, r: 1.35, height: 2.6, xp: 260, gold: 60, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, aggro: 12 },
    lavkaplumbaga: { ad: 'Kül Muhafızı', hp: 1400, dmg: 16, speed: 1.5, r: 1.8, height: 2.8, xp: 400, gold: 90, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, aggro: 12 },
    // Round 4 (Kefir Vadisi creatures + its boss; used until / where 05_enemies has no number)
    yogurt: { ad: 'Ekşi Yoğurt', hp: 24, dmg: 6, speed: 2.5, r: 0.5, height: 0.85, xp: 12, gold: 3, kind: 'hop', atkRange: 2.4, atkCd: 1.9, windup: 0.6, aggro: 9 },
    kaymak: { ad: 'Kesik Kaymak', hp: 26, dmg: 6, speed: 3.5, r: 0.5, height: 0.75, xp: 13, gold: 3, kind: 'glide', atkRange: 2.4, atkCd: 2.0, windup: 0.65, aggro: 9.5 },
    kopuk: { ad: 'Kefir Köpüğü', hp: 20, dmg: 6, speed: 2.3, r: 0.45, height: 0.8, xp: 12, gold: 3, kind: 'ranged', atkRange: 6.5, atkCd: 2.6, windup: 0.75, fly: true, hover: 1.0, aggro: 9.5,
      shot: { kind: 'fizz', speed: 3.8, r: 0.36 } },
    peynir: { ad: 'Peynir Dilimi', hp: 80, dmg: 11, speed: 1.5, r: 0.8, height: 1.15, xp: 30, gold: 8, kind: 'slam', atkRange: 1.7, atkCd: 2.6, windup: 0.95, slamR: 1.9, aggro: 9 },
    kefirdev: { ad: 'Veba Rahibi', hp: 1000, dmg: 13, speed: 1.7, r: 1.5, height: 3.0, xp: 200, gold: 50, kind: 'boss', atkRange: 3, atkCd: 1.5, windup: 0.8, aggro: 12 },
    // Round 5 (Surlu Şehir's grumpy townsfolk + the knight; used until / where 05_enemies has no number)
    nobetci: { ad: 'Zincir Nöbetçisi', hp: 58, dmg: 10, speed: 2.6, r: 0.55, height: 1.35, xp: 22, gold: 6, kind: 'melee', atkRange: 1.5, atkCd: 1.9, windup: 0.7, aggro: 9 },
    simitci: { ad: 'Demir Çemberci', hp: 40, dmg: 8, speed: 2.0, r: 0.55, height: 1.3, xp: 18, gold: 5, kind: 'ranged', atkRange: 7, atkCd: 2.5, windup: 0.7, aggro: 9,
      shot: { kind: 'simit', speed: 5, r: 0.34 } },
    supurgeci: { ad: 'Kül Süpüren', hp: 34, dmg: 8, speed: 3.6, r: 0.5, height: 1.2, xp: 17, gold: 4, kind: 'glide', atkRange: 2.4, atkCd: 2.0, windup: 0.65, aggro: 9.5, trail: 'dust' },
    tellal: { ad: 'Ölüm Tellalı', hp: 130, dmg: 14, speed: 1.5, r: 0.85, height: 1.95, xp: 45, gold: 12, kind: 'slam', atkRange: 2.4, atkCd: 2.8, windup: 1.0, slamR: 2.2, aggro: 9 },
    sovalye: { ad: 'Yeminbozan', hp: 1400, dmg: 15, speed: 2.0, r: 1.7, height: 3.4, xp: 500, gold: 130, kind: 'boss', atkRange: 3.2, atkCd: 1.6, windup: 0.8, aggro: 14,
      slamR: 3.6, chargeSpeed: 9 },
  };

  // ── Other modules are optional (tests, half-wired builds): every call is guarded ──
  const warned = {};
  function warnOnce(k, e) { if (!warned[k]) { warned[k] = 1; console.warn('[GAME] ' + k, e); } }
  function fx(fn, a, b, c, d, e, f, g, h, i) {
    if (typeof FX === 'undefined' || !FX || typeof FX[fn] !== 'function') return null;
    try { return FX[fn](a, b, c, d, e, f, g, h, i); } catch (err) { warnOnce('FX.' + fn, err); return null; }
  }
  function aud(fn, a, b) {
    if (typeof AUD === 'undefined' || !AUD || typeof AUD[fn] !== 'function') return null;
    try { return AUD[fn](a, b); } catch (err) { warnOnce('AUD.' + fn, err); return null; }
  }
  const sfx = (name, o) => aud('sfx', name, o);
  const say = (key, prio = 1, o) => aud('say', key, o ? Object.assign({ prio }, o) : { prio }) || 0;
  const hasLine = key => typeof AUD !== 'undefined' && !!AUD && !!AUD.LINES && !!AUD.LINES[key];
  const speaking = () => !!aud('speaking');   // a line is playing or queued
  const quietFor = () => gt - talkAt;         // s since the narrator was last heard (talkAt: updated every frame in update())
  const burst = (kind, x, y, z, o) => fx('burst', kind, x, y, z, o);
  const ftext = (x, y, z, text, style) => fx('floatText', x, y, z, text, style);
  const shake = a => fx('shake', a);
  const remove = h => { if (h && typeof h.remove === 'function') { try { h.remove(); } catch (err) { warnOnce('remove', err); } } };
  const hasLevel = () => typeof LEVEL !== 'undefined' && !!LEVEL;
  const zones = () => (typeof ZONES !== 'undefined' && ZONES && ZONES.length ? ZONES : null);
  function zdef(i = P.zone) {
    const Z = zones();
    return (Z && Z[i]) || { id: 'z' + i, ad: 'Bölge', line: null, music: null, hpMult: 1, dmgMult: 1, xpMult: 1, gold: 1, ilvl: 1 + i * 3 };
  }
  // Index into DIFF's per-zone arrays (ZORDER), by the zone's id (a level list without the volcano still maps right).
  function zslot(i = P.zone) {
    const k = ZORDER.indexOf(zdef(i).id);
    return k >= 0 ? k : clamp(i | 0, 0, ZORDER.length - 1);
  }
  const zpick = (arr, i) => arr[Math.min(arr.length - 1, zslot(i))];
  // The last zone (the dragon + crystal finale). Older ZONES without the flag: the zone whose boss is the dragon.
  function finalZone(i = P.zone) {
    const Z = zdef(i);
    return Z.final !== undefined ? !!Z.final : Z.boss === 'ejderha';
  }
  function bossKit(type) {
    const k = BOSS_KIT[type] || BOSS_KIT.ejderha, d = edef(type);
    return d.lines && typeof d.lines === 'object' ? Object.assign({}, k, { lines: Object.assign({}, k.lines, d.lines) }) : k;
  }
  const isBossType = t => !!BOSS_KIT[t] || edef(t).kind === 'boss';
  const defCache = {};
  function edef(type) {
    let d = defCache[type];
    if (!d) {
      const src = (typeof EDEF !== 'undefined' && EDEF && EDEF[type]) || {};
      d = defCache[type] = Object.assign({}, DEF0[type] || DEF0.jole, src);
    }
    return d;
  }
  const rarCol = r => (typeof ITEMS !== 'undefined' && ITEMS.RARITY && ITEMS.RARITY[r] && ITEMS.RARITY[r].color) || RAR_COL[r] || '#fff';

  // ── Events ──
  const handlers = {};
  function on(evt, fn) { (handlers[evt] || (handlers[evt] = [])).push(fn); }
  function emit(evt, data = {}) {
    const hs = handlers[evt];
    if (hs) for (let i = 0; i < hs.length; i++) { try { hs[i](data); } catch (err) { console.error('[GAME] event ' + evt, err); } }
  }

  // ── State ──
  const xpFor = lvl => 40 + 25 * lvl + 5 * lvl * lvl;
  const P = {
    pos: new THREE.Vector3(), face: Math.PI, hp: T.baseHp, maxHp: T.baseHp, lvl: 1, xp: 0, xpNext: xpFor(1), gold: 0,
    roundPower: null, shopStock: {}, shopWard: null, heroClass: 'warrior', potions: DIFF.potions, maxPotions: 5, dmg: 8, armor: 0, speed: T.speed, equip: { weapon: null, offhand: null, hat: null, cape: null }, bag: [],
    skills: [], spin: 0, shield: 0, dead: false, checkpoint: { x: 0, z: 0 }, zone: 0, ng: 0,
  };
  // Controller (input intent, swing, timers). Private.
  const C = {
    drag: false, mode: null, sx: 0, sy: 0, downSx: 0, downSy: 0, keyX: 0, keyZ: 0,
    hasT: false, tx: 0, tz: 0, targetE: null, targetObj: null,
    vel: 0, mdx: 0, mdz: 1, swing: null, swingDir: 1, swingFace: null, combo: 0, lastSwingEnd: -9, queued: false,
    lunge: { vx: 0, vz: 0, t: 0 }, kbx: 0, kbz: 0, castT: -1, hurtT: 0, invuln: 0, idleT: 0, cheerT: 0,
    lastHurt: -99, playT: 0, deadT: 0, deathX: 0, deathZ: 0, transT: 0, stepT: 0, stepSide: 1,
    wandRoute: null, wandPlanAt: -99, tgtRef: null, tgtBest: 1e9, tgtStall: 0, blockT: 0, waitT: 0,   // walk-to-target watchdogs
    progT: 0, progD: 0, progGx: NaN, progGz: NaN, autoBrk: 0,        // tap-walk net-progress watchdog (see PROG)
    lockT: 0, lockFace: null,                                         // a story beat holds Feza still (drinking the kefir: GIFT)
    dragRoute: null, dragRouteTx: 0, dragRouteTz: 0, dragPlanAt: -9,   // a way round while dragging into a dead end (see updatePlayer)
    dragWinT: -1, dragWinX: 0, dragWinZ: 0, dragWalk: 0, progW: 0,     // drag / tap-walk net-progress windows (∫ speed)
    portalHold: false,                                                 // tapped the portal while the boss's story line plays
  };
  let F = {};                       // story flags (lines said once, intro done…)
  let ZF = {};                      // per-zone flags (reset on every zone load)
  let finale = false;               // dragon defeated: only story lines from now on
  let pathS = 0, pathCum = null;    // Feza's progress along L.path (auto-lights checkpoints he walks past)
  let L = null, H = null, Bilbo = null, gt = 0, hitstop = 0, inited = false;
  const bilboPos = { x: 0, z: 0 };
  const BILBO_SCALE = 0.78;
  let bilboFace = 0, bilboBark = 0, bilboNext = 0, bilboVoiceNext = 0, boneAt = -99;
  const BONE_CD = 8;
  let bilboFollow = null, bilboTarget = null;
  let bilboGuardArmed = true, bilboGuardAt = -99;
  // Bilbo's armour is a combat resource. He retreats to Feza when it breaks.
  const PET = { hp: 180, maxHp: 180, retreat: false, lastHit: -99, lastBite: -99, guardUntil: -99, bites: 0, tanked: 0, aggro: 0, chargeAt: -99, impactAt: -99 };
  let petAttackTarget = null;
  function petHurt(amount) {
    if (PET.hp <= 0) return;
    const n = Math.max(1, Math.round(amount * 0.55));
    PET.hp = Math.max(0, PET.hp - n); PET.lastHit = gt; PET.tanked += n;
    burst('rend', bilboPos.x, 0.65, bilboPos.z, { color: '#ac5142', count: 5 });
    if (gt - PET.impactAt > 0.25) { PET.impactAt = gt; sfx('bilboImpact', { x: bilboPos.x, z: bilboPos.z, vol: 0.4 }); }
    if (PET.hp === 0) { PET.retreat=true;PET.guardUntil=-99;petAttackTarget = null; sfx('guardBreak', { x: bilboPos.x, z: bilboPos.z, vol: 0.65 }); ftext(bilboPos.x, 1.8, bilboPos.z, 'Zırh kırıldı!', 'word'); }
  }
  function petTaunted(e) { return !e.boss && PET.hp > 0 && !PET.retreat && e.petTauntUntil > gt && dist2(P.pos.x,P.pos.z,e.x,e.z) < 144; }
  function petEnemyStep(e, dt) {
    const dx = bilboPos.x-e.x, dz = bilboPos.z-e.z, d = Math.hypot(dx,dz)||0.001;
    e.face = dampAngle(e.face,Math.atan2(dx,dz),8,dt);
    if (d > e.r + 1.05) stepToward(e,dx/d,dz/d,e.speed,dt);
    else if (e.cd <= 0) {
      petHurt(e.dmg); e.cd=e.atkCd; e.st.attack=0.35;
      sfx('clink',{x:bilboPos.x,z:bilboPos.z,vol:.35,pitch:.65});
    } else if (e.cd < .5) e.st.windup=1-e.cd/.5;
    else e.st.attack=e.cd > e.atkCd-.35 ? .75 : -1;
    e.st.move=d>e.r+1.05?.65:0;
  }
  const BILBO_GUARD = { radius: 5.5, stun: 3, bossStun: 1.5, cooldown: 20 };
  let baseScale = 1;
  const enemies = [], dying = [], projectiles = [], coins = [], loot = [], timers = [];
  let sleepers = [], boss = null, crystal = null, storyUntil = -99;   // storyUntil: a mid-zone boss's happy lines play (no chatter)
  const skillQ = [];                // new-skill lines held back while a boss's story lines play (said at skillAt, or in the next zone)
  let skillAt = -99;
  const mortars = [];               // lobbed shots (the lava turtle's lava balls): fly in an arc onto a telegraph circle
  let actT = 0, tokT = 0, flowT = 0, flowCx = -1e9, flowCz = -1e9, flowAt = -9;
  const firstQ = [];                // {type, at, fl}: first-sight lines that had to wait (FIRST_GAP, or the narrator was talking)
  let mooT = 25;                    // Round 4: a soft cow far across the kefir valley now and then (quiet moments only)
  let talkAt = -99;                 // game time the narrator was last heard (AUD.speaking); see quietFor()
  let storyEnd = -99;               // game time the cheered boss's last story line should end (storySay / storyTalking)
  let yolWant = false;              // Round 4: 'yolculuk' still to come (new game, forest): at the first calm moment after giris2
  let lastFirst = -99, lastKocaman = -99, lastCanAz = -99, lastPraise = -99, lastPotionMsg = -99, lastSoft = -9, npcTalkUntil = -1, npcTalkAt = -99, npcWantAt = -99;
  const cheers = [];
  // Comic words (Pof!, Bam!, Hop!…) share one slot: at most one every WORD_GAP s of game time, so a crowd fight doesn't
  // bury the screen in text. 08_skills.js asks through GAME.wordOK() too. Never limited: the '!' spotted marker,
  // elite names and 'Seviye N!'.
  const WORD_GAP = 1.5;
  let wordAt = -99;
  function wordOK() {
    if (gt >= wordAt && gt - wordAt < WORD_GAP) return false;
    wordAt = gt; return true;   // allowed: the slot is taken now
  }
  const STATS = { windup: 0, strike: 0, strikeHit: 0, cancel: 0, shots: 0, freezes: 0, casts: 0 };
  let goldAcc = 0, goldAccT = 0, coinCombo = 0, coinComboT = 0;
  const HST = { move: 0, attack: -1, swingDir: 1, cast: -1, spin: false, hurt: 0, dead: false, cheer: false, idleT: 0 };
  const _v = new THREE.Vector3(), _scr = { x: 0, y: 0, vis: false }, _tp = { x: 0, z: 0 }, _m4 = new THREE.Matrix4();
  const _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();

  // ── Level helpers ──
  function moveXZ(o, dx, dz, r) {   // o = {x,z} or Vector3; sub-steps so fast knockbacks never tunnel through walls
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.3));
    for (let i = 0; i < n; i++) {
      if (L && hasLevel() && LEVEL.move) LEVEL.move(L, o, dx / n, dz / n, r);
      else { o.x += dx / n; o.z += dz / n; }
    }
  }
  function moveE(e, dx, dz) { if (L && L.merchant && dist2(e.x + dx, e.z + dz, L.merchant.x, L.merchant.z) < sq(3.5 + e.r)) return; _tp.x = e.x; _tp.z = e.z; moveXZ(_tp, dx, dz, e.r * 0.9); e.x = _tp.x; e.z = _tp.z; }
  const isFloor = (x, z) => !(L && hasLevel() && LEVEL.isFloor) || !!LEVEL.isFloor(L, x, z);
  const los = (x0, z0, x1, z1) => !(L && hasLevel() && LEVEL.los) || !!LEVEL.los(L, x0, z0, x1, z1);
  const circleFree = (x, z, r) => !(L && hasLevel() && LEVEL.circleFree) || !!LEVEL.circleFree(L, x, z, r);

  // ── Shared visual resources (created in init) ──
  const R = {};
  function canvasTex(size, draw) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    return t;
  }
  function decalMat(tex, color, k, blend = THREE.AdditiveBlending) {
    return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(k), transparent: true, blending: blend, depthWrite: false, fog: false });
  }
  function decal(mat, s) {
    const m = new THREE.Mesh(R.plane, mat); m.rotation.x = -Math.PI / 2; m.scale.setScalar(s); m.renderOrder = 2; return m;
  }
  function makeResources() {
    R.plane = new THREE.PlaneGeometry(1, 1);
    R.ring = canvasTex(128, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.16)'); gr.addColorStop(0.76, 'rgba(255,255,255,1)');
      gr.addColorStop(0.86, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
    R.disc = canvasTex(64, (g, s) => {
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    });
    // Target reticle: four soft arcs with little arrow tips.
    R.reticle = canvasTex(128, (g, s) => {
      g.translate(s / 2, s / 2); g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.28)'; g.lineWidth = pass ? 7 : 16;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.28; g.beginPath(); g.arc(0, 0, 50, a, a + Math.PI / 2 - 0.56); g.stroke(); }
      }
      g.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 2 + Math.PI / 4); g.beginPath(); g.moveTo(0, -36); g.lineTo(-7, -46); g.lineTo(7, -46); g.closePath(); g.fill(); g.restore(); }
    });
    R.markMat = decalMat(R.ring, '#8fe8ff', 2.2);
    R.markDot = decalMat(R.disc, '#bff4ff', 1.6);
    R.selMat = decalMat(R.reticle, '#ff8a4a', 2.4);
    R.auraMat = decalMat(R.ring, '#ffc93c', 2.2);
    R.auraGlow = decalMat(R.disc, '#ffb42a', 0.7);
    R.blobMat = new THREE.MeshBasicMaterial({ map: R.disc, color: 0x1a1020, transparent: true, opacity: 0.42, depthWrite: false });
    R.lootRing = {};   // by colour
    R.warmEq = {};     // item bases Feza has already worn in a warm-up
    R.marker = new THREE.Group();
    R.marker.add(decal(R.markMat, 1), decal(R.markDot, 0.35));
    R.marker.children.forEach(c => { c.position.y = 0.045; });
    R.marker.visible = false; R.markerT = 0;
    R.sel = decal(R.selMat, 1); R.sel.position.y = 0.05; R.sel.visible = false;
    scene.add(R.marker, R.sel);
    makeCoins();
    makeBars();
  }
  function lootRingMat(color) { return R.lootRing[color] || (R.lootRing[color] = decalMat(R.ring, color, 1.5)); }

  // Coins: one instanced mesh, lathe profile with a raised rim (reads well from 16 m away).
  const COIN_MAX = 320;
  function makeCoins() {
    const half = [[0, 0.034], [0.05, 0.031], [0.075, 0.022], [0.108, 0.02], [0.122, 0.042], [0.152, 0.043], [0.17, 0.028], [0.176, 0]];
    const pr = half.concat(half.slice(0, -1).reverse().map(p => [p[0], -p[1]]));
    const geo = new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])).reverse(), 32);
    geo.rotateX(Math.PI / 2); geo.scale(1.08, 1.08, 1.08);
    const mat = rimify(stdMat({ color: '#ffd84a', metalness: 0.72, roughness: 0.27, emissive: '#c98a00', emissiveIntensity: 0.42 }), '#fff3b0', 0.55, 2.2);
    R.coins = new THREE.InstancedMesh(geo, mat, COIN_MAX);
    R.coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    R.coins.count = 0; R.coins.frustumCulled = false; R.coins.castShadow = true;
    scene.add(R.coins);
  }
  // Heart pickup: puffy extruded heart, glossy candy red.
  function heartGeo() {
    if (R.heartGeo) return R.heartGeo;
    const g = new THREE.OctahedronGeometry(0.34, 0);
    g.scale(0.72, 1.25, 0.72);
    R.heartMat = rimify(stdMat({ color: '#a43935', roughness: 0.4, metalness: 0.15, emissive: '#7c2522', emissiveIntensity: 0.3 }), '#c38d74', 0.32, 2.8);
    return (R.heartGeo = g);
  }
  // Red potion: glowing liquid inside a glass flask with a cork and a gold band.
  function potionTpl() {
    if (R.potion) return R.potion;
    const g = new THREE.Group();
    const liq = new Kit();
    liq.add(G.cyl(0.8, 1, 6), '#8e302e', [0, 0.17, 0], 0, [0.14, 0.19, 0.14]);
    liq.add(G.cyl(1, 1, 6), '#6b2726', [0, 0.3, 0], 0, [0.045, 0.1, 0.045]);
    const liquid = new THREE.Mesh(liq.build(), vcMat({ roughness: 0.35, emissive: '#6b2422', emissiveIntensity: 0.75 }));
    const gl = new Kit();
    gl.add(G.cyl(0.8, 1, 6), '#c6baa1', [0, 0.18, 0], 0, [0.17, 0.23, 0.17]);
    gl.add(G.cyl(1, 1, 6, true), '#c6baa1', [0, 0.34, 0], 0, [0.06, 0.14, 0.06]);
    const glass = new THREE.Mesh(gl.build(), stdMat({ color: '#c6baa1', transparent: true, opacity: 0.2, roughness: 0.18, metalness: 0.1, depthWrite: false }));
    const ck = new Kit();
    ck.add(G.cyl(0.9, 1, 6), '#534940', [0, 0.43, 0], 0, [0.058, 0.08, 0.058]);
    ck.add(G.torus(TAU, 0.3, 12), '#8b7358', [0, 0.37, 0], [Math.PI / 2, 0, 0], 0.065);
    ck.add(G.cone(4), '#bbaa8e', [0, 0.19, 0.146], [Math.PI, 0, 0], [0.034, 0.063, 0.018]);
    const cork = new THREE.Mesh(ck.build(), vcMat({ roughness: 0.5, metalness: 0.3 }));
    g.add(liquid, glass, cork);
    g.scale.setScalar(1.55);
    return (R.potion = g);
  }
  // Round 4: in the kefir valley a heart pickup is a little glass bottle of kefir (same effect): strawberry-pink kefir in
  // clear glass, a red cap and a white label with red hearts — and a little red heart floats over it (spawnLoot), so it
  // still says "this makes you feel better" (QA: a white bottle on the cream floor, easy to take for the potion).
  function kefirBottleTpl() {
    if (R.bottle) return R.bottle;
    const g = new THREE.Group();
    const lq = new Kit();
    lq.add(G.cyl(0.8, 1, 6), '#7c825e', [0, 0.115, 0], 0, [0.088, 0.2, 0.088]);
    const liquid = new THREE.Mesh(lq.build(), stdMat({ color: '#668866', roughness: 0.35, emissive: '#445d3c', emissiveIntensity: 0.4 }));
    const gl = new Kit();
    gl.add(G.cyl(0.8, 1, 6, true), '#9b9c81', [0, 0.12, 0], 0, [0.1, 0.23, 0.1]);
    gl.add(G.cyl(1, 1, 6, true), '#9b9c81', [0, 0.31, 0], 0, [0.045, 0.08, 0.045]);
    const glass = new THREE.Mesh(gl.build(), stdMat({ color: '#ffffff', transparent: true, opacity: 0.24, roughness: 0.04, metalness: 0.1, depthWrite: false }));
    const ck = new Kit();
    ck.add(G.cyl(1, 1, 6), '#4d4a3e', [0, 0.36, 0], 0, [0.056, 0.035, 0.056]);
    ck.add(G.torus(TAU, 0.22, 12), '#887658', [0, 0.378, 0], [Math.PI / 2, 0, 0], 0.05);
    ck.add(G.cyl(1, 1, 6), '#777462', [0, 0.12, 0], 0, [0.103, 0.085, 0.103]);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      ck.add(G.cone(4), '#b9ae8c', [Math.sin(a) * 0.104, 0.112, Math.cos(a) * 0.104], [Math.PI, a, 0], [0.03, 0.045, 0.012]);
    }
    const cap = new THREE.Mesh(ck.build(), rimify(vcMat({ roughness: 0.45, emissive: '#57482d', emissiveIntensity: 0.18 }), '#bda583', 0.3, 2.6));
    cap.castShadow = true; liquid.castShadow = true;
    g.add(liquid, cap, glass);
    g.scale.setScalar(1.75);
    return (R.bottle = g);
  }
  const dairyZone = () => { const Z = zdef(); return Z.theme === 'dairy' || Z.id === 'kefir'; };
  const townZone = () => { const Z = zdef(); return Z.theme === 'town' || Z.id === 'sehir'; };

  // Enemy health bars: ONE instanced billboard mesh, SDF pill drawn in the shader (gold frame for elites).
  const BAR_MAX = 48;
  function makeBars() {
    const geo = new THREE.PlaneGeometry(1, 1);
    const aBar = new THREE.InstancedBufferAttribute(new Float32Array(BAR_MAX * 4), 4);
    aBar.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aBar', aBar);
    const aFade = new THREE.InstancedBufferAttribute(new Float32Array(BAR_MAX).fill(1), 1);   // dims a bar that covers Feza
    aFade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', aFade);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false,
      uniforms: {
        uSize: { value: new THREE.Vector2(0.95, 0.15) },
        cFill: { value: new THREE.Color('#ff6b86') }, cFill2: { value: new THREE.Color('#e02a55') }, cTrail: { value: new THREE.Color('#fff1b8') },
        cBack: { value: new THREE.Color('#2a1638') }, cEdge: { value: new THREE.Color('#150b1d') }, cGold: { value: new THREE.Color('#ffd44a').multiplyScalar(1.3) },
        cEFill: { value: new THREE.Color('#ffae3c') }, cEFill2: { value: new THREE.Color('#ff6a1a') },
      },
      vertexShader: `attribute vec4 aBar; attribute float aFade; uniform vec2 uSize; varying vec2 vUv; varying vec4 vBar; varying vec2 vSize; varying float vFade;
        void main() {
          vUv = uv; vBar = aBar; vFade = aFade;
          vec2 size = uSize * vec2(aBar.w, aBar.z > 0.5 ? 1.25 : 1.0); vSize = size;
          vec4 c = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          c.xy += position.xy * (size + 0.07);
          gl_Position = projectionMatrix * c;
        }`,
      fragmentShader: `uniform vec3 cFill, cFill2, cTrail, cBack, cEdge, cGold, cEFill, cEFill2; varying vec2 vUv; varying vec4 vBar; varying vec2 vSize; varying float vFade;
        float sdPill(vec2 p, vec2 b) { float r = b.y; vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main() {
          vec2 p = (vUv - 0.5) * (vSize + 0.07);
          float d = sdPill(p, vSize * 0.5);
          float aa = max(fwidth(d), 1e-4);
          float halo = (1.0 - smoothstep(0.012, 0.03, d)) * 0.55;
          float alpha = 1.0 - smoothstep(-aa, aa, d);
          if (alpha + halo < 0.01) discard;
          if (alpha < 0.5) { gl_FragColor = vec4(vec3(1.0, 0.96, 0.9), halo * (1.0 - alpha) * vFade);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            return; }
          float bw = vSize.y * (vBar.z > 0.5 ? 0.24 : 0.2);
          float inner = 1.0 - smoothstep(-aa, aa, d + bw);
          float x = (p.x + vSize.x * 0.5 - bw) / (vSize.x - 2.0 * bw);
          float y = (p.y + vSize.y * 0.5 - bw) / (vSize.y - 2.0 * bw);
          float ax = max(fwidth(x), 1e-4);
          bool el = vBar.z > 0.5;
          vec3 fill = mix(el ? cEFill2 : cFill2, el ? cEFill : cFill, smoothstep(0.0, 0.9, y));
          fill += vec3(0.45) * smoothstep(0.55, 0.9, y);
          vec3 col = mix(cBack, cTrail, 1.0 - smoothstep(vBar.y - ax, vBar.y + ax, x));
          col = mix(col, fill, 1.0 - smoothstep(vBar.x - ax, vBar.x + ax, x));
          vec3 edge = el ? mix(cGold * 0.55, cGold, smoothstep(-0.5, 0.5, p.y / vSize.y)) : cEdge;
          col = mix(edge, col, inner);
          gl_FragColor = vec4(col, alpha * mix(1.0, 0.93, inner) * vFade);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    R.bars = new THREE.InstancedMesh(geo, mat, BAR_MAX);
    R.bars.count = 0; R.bars.frustumCulled = false; R.bars.renderOrder = 40;
    R.barAttr = aBar; R.barFade = aFade;
    scene.add(R.bars);
  }
  // Elite name tag (few elites → a small canvas sprite each).
  // A long name ('Kocaman Lav Kaplumbağası') never clips: the canvas grows with the text (up to 768 px, the sprite with it),
  // and a still longer one gets a smaller font.
  const TAG_FONT = '"Avenir Next Rounded", "Avenir Next", system-ui, sans-serif';
  function nameTag(text) {
    const c = document.createElement('canvas');
    let g = c.getContext('2d'), fs = 54;
    g.font = '900 ' + fs + 'px ' + TAG_FONT;
    const need = g.measureText(text).width + 14 + 24;   // text + stroke + a little air
    if (need > 768) fs = Math.max(30, Math.floor(fs * 744 / (need - 24)));
    c.width = clamp(Math.ceil(Math.min(need, 768) / 16) * 16, 512, 768); c.height = 96;
    g = c.getContext('2d');   // (resizing the canvas reset its state)
    const cx = c.width / 2;
    g.font = '900 ' + fs + 'px ' + TAG_FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 14 * fs / 54; g.strokeStyle = 'rgba(40,16,50,0.92)'; g.strokeText(text, cx, 50);
    const gr = g.createLinearGradient(0, 22, 0, 78); gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#ff9f1c');
    g.fillStyle = gr; g.fillText(text, cx, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, fog: false }));
    sp.scale.set(2.6 * c.width / 512, 0.49, 1); sp.renderOrder = 41;
    return sp;
  }

  // Fallback visuals when a module is missing (keeps the game alive in half-wired builds).
  function fallbackEnemy(type, elite) {
    const root = new THREE.Group(), mat = stdMat({ color: '#7bd46a', roughness: 0.3 });
    const body = new THREE.Mesh(G.sphere(20), mat); body.scale.set(0.5, 0.42, 0.5); body.position.y = 0.42; root.add(body);
    if (elite) root.scale.setScalar(1.4);
    return { root, height: 0.85 * (elite ? 1.4 : 1), radius: 0.5 * (elite ? 1.4 : 1), anim() {}, setMood() {},
      flash(a) { mat.emissive.setScalar(a * 0.6); }, setTint() {}, muzzle() { return new THREE.Vector3(root.position.x, 0.6, root.position.z); },
      dispose() { mat.dispose(); } };
  }
  function fallbackHero() {
    const root = new THREE.Group(), m = new THREE.Mesh(G.capsule(1, 12), stdMat({ color: '#f4cdb2' }));
    m.scale.set(0.3, 0.45, 0.3); m.position.y = 0.75; root.add(m);
    return { root, update() {}, setEquip() {}, tip: new THREE.Vector3(), hand: new THREE.Vector3(), setXray() {} };
  }

  // ── Stats ──
  const heroClassOf = value => value === 'wizard' || value === 'hybrid' ? value : 'warrior';
  const isWand = item => !!(item && typeof ITEMS !== 'undefined' && ITEMS.isWand && ITEMS.isWand(item));
  function equipSlot(item, heroClass = P.heroClass) { return heroClass === 'hybrid' && item.slot === 'weapon' && isWand(item) ? 'offhand' : item.slot; }
  function recalcStats() {
    const w = P.equip.weapon, h = P.equip.hat, c = P.equip.cape;
    const old = P.maxHp;
    P.maxHp = Math.round(T.baseHp + 12 * (P.lvl - 1) + 5 * (h ? h.power : 0));
    const base = 8 + 2 * (P.lvl - 1), wand = P.heroClass === 'hybrid' ? P.equip.offhand : w;
    P.meleeDmg = base + (w ? w.power : 0); P.magicDmg = base + (wand ? wand.power : 0);
    P.dmg = P.heroClass === 'hybrid' ? Math.max(P.meleeDmg, P.magicDmg) : P.meleeDmg;
    P.armor = Math.min(45, c ? c.power : 0);
    P.speed = T.speed * (1 + 0.04 * (c ? c.rarity : 0));
    if (P.maxHp > old) P.hp += P.maxHp - old;
    P.hp = Math.min(P.hp, P.maxHp);
    P.xpNext = xpFor(P.lvl);
  }
  const heroDamageNow = magic => Math.max(1, Math.round((magic ? P.magicDmg : P.meleeDmg) * frand(0.9, 1.12)));
  const ilvlNow = () => zdef().ilvl + P.ng * 3 + (Math.random() < 0.35 ? 1 : 0);

  function buildSkills() {
    const list = typeof SKILLS !== 'undefined' && Array.isArray(SKILLS) ? (SKILLS.forClass ? SKILLS.forClass(P.heroClass) : SKILLS) : [];
    const old = (GAME.skills || []).slice();
    GAME.skills.length = 0;
    list.forEach((def, i) => GAME.skills.push({ def, unlocked: !!(old[i] && old[i].unlocked), cd: 0, cdMax: def.cd || 1 }));
    P.skills = GAME.skills;
  }
  function resetPlayer() {
    P.shopStock = {}; P.shopWard = null; P.roundPower = null;
    P.lvl = 1; P.xp = 0; P.gold = 0; P.potions = DIFF.potions; P.ng = 0; P.dead = false; P.spin = 0; P.shield = 0;
    const st = typeof ITEMS !== 'undefined' && ITEMS.starter ? ITEMS.starter(P.heroClass) : { weapon: null, hat: null, cape: null };
    P.equip = { weapon: st.weapon || null, offhand: st.offhand || null, hat: st.hat || null, cape: st.cape || null };
    P.bag = [P.equip.weapon, P.equip.offhand, P.equip.hat, P.equip.cape].filter(Boolean);
    for (const s of GAME.skills) { s.unlocked = false; s.cd = 0; }
    F = { zl: {}, kapi: {} }; skillQ.length = 0; removeMoustache();
    recalcStats(); P.hp = P.maxHp;
    if (H) H.setEquip(P.equip);
  }

  // A new pair also covers the special baby/jelly HP and the knight's lighter summoned guards.
  function setEnemyHp(e, normal, tough) {
    const fraction = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    e.difficultyHp = [Math.max(1, Math.round(normal)), Math.max(1, Math.round(tough))];
    e.maxHp = e.difficultyHp[hard ? 1 : 0]; e.hp = Math.max(1, Math.round(Math.min(e.maxHp, fraction * e.maxHp)));
  }
  function setDifficulty(id) {
    if ((id !== 'normal' && id !== 'hard') || (GAME.state !== 'play' && GAME.state !== 'dead')) return false;
    const tough = id === 'hard';
    if (tough === hard) return true;
    const ratio = k => (tough ? k : 1) / (hard ? k : 1), moveK = ratio(HC.speed), cdK = ratio(HC.cd);
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.difficultyHp) {
        const maxHp = e.difficultyHp[tough ? 1 : 0], hpK = maxHp / e.maxHp;
        e.hp = Math.min(maxHp, e.hp * hpK); e.maxHp = maxHp;
        if (e.napHp !== undefined) e.napHp *= hpK;
      }
      const dmgK = ratio(e.boss ? HC.bossDmg : HC.dmg);
      e.dmg *= dmgK;
      if (e.dmg0 !== undefined) e.dmg0 *= dmgK;
      if (e.dmgBase !== undefined) e.dmgBase *= dmgK;
      e.speed *= moveK; e.atkCd *= cdK; e.cd *= cdK;
      if (e.difficultyWind) e.windup = e.difficultyWind[tough ? 1 : 0];
      // A warning already drawn keeps its wind/phase time; the next attack uses the new windup.
    }
    for (const p of projectiles) if (p.owner === 'enemy') p.dmg *= ratio(p.bossShot ? HC.bossDmg : HC.dmg);
    for (const m of mortars) m.dmg *= ratio(HC.bossDmg);
    if (C.swing && C.swing.magic && wizard()) {
      const dur = tough ? 0.55 : DIFF.normal.wandSwing;
      C.swing.t *= dur / C.swing.dur; C.swing.dur = dur;
    }
    hard = tough;
    if (boss && !boss.dead) emit('bossHp', { frac: boss.hp / boss.maxHp });
    emit('difficulty', { id });
    return true;
  }

  // ── Zone loading ──
  function removeObj(o) { if (o && o.parent) o.parent.remove(o); }
  function clearWorld() {
    if (boss) clearEncounter(boss);
    for (const e of enemies) dropEnemy(e);
    for (const e of dying) dropEnemy(e);
    enemies.length = 0; dying.length = 0; sleepers = []; boss = null; GAME.boss = null;
    for (const p of projectiles) killProjectileObj(p);
    projectiles.length = 0; coins.length = 0; if (R.coins) R.coins.count = 0;
    for (const m of mortars) { killProjectileObj(m); remove(m.tele); }
    mortars.length = 0; storyUntil = -99; storyEnd = -99;
    for (const o of loot) { removeObj(o.obj); remove(o.beam); }
    loot.length = 0; timers.length = 0;
    if (crystal) {   // EMODEL.crystal() keeps its disposer on userData
      removeObj(crystal.obj); remove(crystal.beam);
      crystal.obj.traverse(o => { if (o.userData && typeof o.userData.dispose === 'function') { try { o.userData.dispose(); } catch (err) { warnOnce('crystal.dispose', err); } } });
      crystal = null;
    }
    finale = false; ZF = {}; pathS = 0; pathCum = null; firstQ.length = 0; mooT = frand(18, 30);
    C.cheerT = 0; C.castT = -1; removeMoustache(); fbClear();
    C.targetE = null; C.targetObj = null; C.hasT = false; C.drag = false; C.swing = null; C.queued = false; C.vel = 0;
    C.wandRoute = null; C.wandPlanAt = -99;
    C.lunge.t = 0; C.kbx = C.kbz = 0; C.route = null; C.lockT = 0; C.dragRoute = null; C.portalHold = false; C.dragWinT = -1;
    if (R.marker) { R.marker.visible = false; R.sel.visible = false; R.bars.count = 0; }
    fx('clear');
    if (typeof SKILLS_clear === 'function') { try { SKILLS_clear(); } catch (err) { warnOnce('SKILLS_clear', err); } }
  }
  function placeHero(x, z, face) {
    P.pos.set(x, 0, z); P.face = face;
    if (H) { H.root.position.copy(P.pos); H.root.rotation.y = face; H.root.scale.setScalar(baseScale); }
    placeBilbo();
    if (typeof cameraFollow === 'function') cameraFollow(x, CAM.target.y, z, 0, true);
    if (typeof lightsFollow === 'function') lightsFollow(x, z);
  }
  function bilboSpot() {
    const c = Math.cos(P.face), s = Math.sin(P.face);
    for (const side of [-1, 1, 0]) {
      const x = P.pos.x + side * c * 1.45 - s * 0.65;
      const z = P.pos.z - side * s * 1.45 - c * 0.65;
      if (circleFree(x, z, 0.32)) return { x, z };
    }
    return { x: P.pos.x, z: P.pos.z };
  }
  function placeBilbo() {
    if (!Bilbo) return;
    const p = bilboSpot(); bilboPos.x = p.x; bilboPos.z = p.z;
    if(Bilbo.clearActions)Bilbo.clearActions(); boneAt=-99;
    bilboFace = P.face; bilboBark = 0; bilboNext = gt + 1; bilboVoiceNext = gt + 1; bilboTarget = null;
    petAttackTarget = null; PET.maxHp = 180 + P.lvl * 24; PET.hp = PET.maxHp;PET.retreat=false;
    PET.lastHit = gt-10; PET.lastBite = gt-10; PET.guardUntil=-99; P.pet=PET;
    if (bilboFollow) bilboFollow.reset(P.pos, p.x, p.z, P.face);
    Bilbo.root.position.set(p.x, 0, p.z); Bilbo.root.rotation.y = bilboFace;
    Bilbo.root.scale.setScalar(BILBO_SCALE);
    Bilbo.update(0, { speed: 0, bark: 0 });
  }
  function updateBilbo(dt) {
    if (!Bilbo) return;
    let speed=0,face=bilboFace;
    const combat=GAME.state==='play'&&!P.dead&&!finale&&!merchantNear()&&gt>=storyUntil;
    if(PET.hp<=0)PET.retreat=true;
    const potential=combat&&PET.hp>0&&!PET.retreat?nearestEnemy(P.pos.x,P.pos.z,6.8,true):null;
    const priorTarget=petAttackTarget;
    petAttackTarget=potential&&!potential.dead?potential:null;
    if (petAttackTarget && priorTarget !== petAttackTarget && gt - PET.chargeAt > 2.5) {
      PET.chargeAt = gt; sfx('bilboCharge', { x: bilboPos.x, z: bilboPos.z, vol: 0.5 });
    }
    // Bite into the front line, keeping a short leash and the original obstacle-aware follower.
    const goal=petAttackTarget?{x:petAttackTarget.x,z:petAttackTarget.z}:P.pos;
    if (bilboFollow&&GAME.state!=='transition') {
      const f=bilboFollow.step(dt,goal); bilboPos.x=f.pos.x;bilboPos.z=f.pos.z;speed=f.speed;face=f.face;
    }
    bilboBark=Math.max(0,bilboBark-dt);
    if (!potential&&gt-PET.lastHit>4) {
      PET.hp=Math.min(PET.maxHp,PET.hp+PET.maxHp*.09*dt);
      if(PET.retreat&&PET.hp>=PET.maxHp*.35)PET.retreat=false;
    }
    bilboProtect();
    if (combat&&petAttackTarget&&gt>=bilboNext) {
      const e=petAttackTarget,reach=e.r+1.65;
      if (dist2(e.x,e.z,bilboPos.x,bilboPos.z)<reach*reach&&los(bilboPos.x,bilboPos.z,e.x,e.z)) {
        bilboTarget=e;bilboNext=gt+1.6;PET.bites++;PET.lastBite=gt;
        // Isırma ve tanklama aynı hızda; havlama her ısırmada tekrarlanmaz.
        if(gt>=bilboVoiceNext){
          bilboBark=.7;bilboVoiceNext=gt+4;
          sfx('bilboBark',{x:bilboPos.x,z:bilboPos.z,vol:.7});emit('bilboBark');
        }
        fx('slash',bilboPos.x,.8,bilboPos.z,Math.atan2(e.x-bilboPos.x,e.z-bilboPos.z),1,'#b45542',1.15,2.4);
        burst('rend',e.x,e.y+.6,e.z,{color:'#ba6450',count:8,dir:{x:Math.sin(face),z:Math.cos(face)}});
        damage(e,Math.max(4,Math.round(P.meleeDmg*.45)),{kind:'bilbo',silent:true});
        PET.guardUntil=gt+2.2;PET.aggro=0;
        for(const foe of enemies) if(!foe.boss&&!foe.dead&&PET.aggro<2&&dist2(foe.x,foe.z,bilboPos.x,bilboPos.z)<25&&los(bilboPos.x,bilboPos.z,foe.x,foe.z)) {
          foe.petTauntUntil=gt+3.2;foe.aggro=true;cancelWindup(foe);PET.aggro++;
        }
      }
    }
    if(petAttackTarget)face=Math.atan2(petAttackTarget.x-bilboPos.x,petAttackTarget.z-bilboPos.z);
    bilboFace=dampAngle(bilboFace,face,9,dt);
    Bilbo.root.position.set(bilboPos.x,0,bilboPos.z);Bilbo.root.rotation.y=bilboFace;
    Bilbo.root.scale.setScalar(BILBO_SCALE*(GAME.state==='transition'?Math.max(.05,1-C.transT/.7):1));
    Bilbo.update(dt,{speed,bark:bilboBark,sit:GAME.state==='dead',
      attack:Math.max(0,1-(gt-PET.lastBite)/.45),
      guard:PET.hp>0&&!PET.retreat?Math.max(0,1-(gt-PET.lastHit)/.55):0,
      armorBreak:PET.retreat});
  }
  function bone() {
    if(!Bilbo || GAME.state!=='play' || GAME.paused || P.dead || finale || merchantNear() || gt<storyUntil || gt<boneAt || Bilbo.isFetching())return false;
    const targets=enemies.filter(e=>!e.dead && !hidden(e) && inView(e.x,e.z) && dist2(e.x,e.z,bilboPos.x,bilboPos.z)<sq(8+e.r) && los(bilboPos.x,bilboPos.z,e.x,e.z)).sort((a,b)=>dist2(a.x,a.z,bilboPos.x,bilboPos.z)-dist2(b.x,b.z,bilboPos.x,bilboPos.z)).slice(0,5);
    const heldLevel=L;
    const ok=Bilbo.fetchBone(P.pos,targets,e=>{
      if(L!==heldLevel || GAME.state!=='play' || P.dead || e.dead || hidden(e) || !enemies.includes(e) || merchantNear() || gt<storyUntil || !los(bilboPos.x,bilboPos.z,e.x,e.z))return;
      damage(e,Math.max(8,Math.round(heroDamageNow()*1.5)),{kind:'bilbo',silent:true});
      if(!e.boss){e.stun=Math.max(e.stun||0,1.2);cancelWindup(e);}burst('dread',e.x,1,e.z,{count:10});sfx('pop',{vol:.4});
    }, {canLaunch:()=>L===heldLevel && GAME.state==='play' && !P.dead, routeClear:los});
    if(!ok)return false;boneAt=gt+BONE_CD;C.cheerT=Math.max(C.cheerT,.5);sfx('whoosh',{vol:.5});emit('bone');return true;
  }
  // One rescue per low-health episode; healing to the threshold rearms it.
  // After enemy updates: an interrupted boss cannot resume its old attack in this frame.
  function bilboProtect() {
    if (P.hp >= P.maxHp * 0.5) bilboGuardArmed = true;
    if (!Bilbo || PET.hp <= 0 || PET.retreat || GAME.state !== 'play' || P.dead || P.hp <= 0 || finale || merchantNear() ||
        P.hp >= P.maxHp * 0.5 || !bilboGuardArmed || gt < bilboGuardAt) return false;
    bilboGuardArmed = false; bilboGuardAt = gt + BILBO_GUARD.cooldown;
    bilboBark = 1.30; bilboNext = gt + 7; bilboVoiceNext = gt + 7; bilboTarget = null;
    sfx('bilboGuard', { x: bilboPos.x, z: bilboPos.z, vol: 1.15 });
    emit('bilboBark');
    fx('ring', bilboPos.x, bilboPos.z, { r0: 0.3, r1: BILBO_GUARD.radius, dur: 0.6, color: '#9470a6', width: 0.35 });
    burst('oath', bilboPos.x, 0.3, bilboPos.z, { count: 12, color: '#ae8dbb', radius: 1.8 });
    burst('dread',bilboPos.x,.8,bilboPos.z,{count:12,dir:{x:Math.sin(bilboFace),z:Math.cos(bilboFace)}});
    shake(.12);
    ftext(bilboPos.x, 2.1, bilboPos.z, 'Demir Diş!', 'word');
    PET.guardUntil = gt + 4;
    const phases = { kopukusta: 'giggle', aytavsan: 'giggle', kraljole: 'blush', kefirdev: 'hiccup', kostebekusta: 'dizzy',
      lavkaplumbaga: 'flip', sovalye: 'dizzy', ejderha: 'charmed' };
    for (const e of enemies) {
      if (e.dead || hidden(e) || dist2(e.x, e.z, bilboPos.x, bilboPos.z) > (BILBO_GUARD.radius + e.r) ** 2 ||
          !los(bilboPos.x, bilboPos.z, e.x, e.z)) continue;
      if (!bilboTarget) bilboTarget = e;
      if (e.boss) {
        // Preserve the puzzle's own longer stun and its progress.
        if (!e.aggro || bonusHold(e.encounter) || !phases[e.type] || Object.values(phases).includes(e.ph)) continue;
        e.bur = 0; e.kvx = e.kvz = 0;
        bonusStun(e, phases[e.type], BILBO_GUARD.bossStun, false);
        if (e.encounter) e.encounter.timer = Math.max(e.encounter.timer, BILBO_GUARD.bossStun + 1);
      } else {
        e.stun = Math.max(e.stun, BILBO_GUARD.stun);
        e.kvx = e.kvz = 0; cancelWindup(e); setAggro(e, false);
      }
      fx('dizzy', e.x, e.y + e.height + 0.15, e.z, Math.max(0.4, e.r * 0.65), e.boss ? BILBO_GUARD.bossStun : BILBO_GUARD.stun);
    }
    return true;
  }
  function loadZone(i, o = {}) {
    if (!inited) init();
    const Z = zones();
    i = clamp(i | 0, 0, Z ? Z.length - 1 : 0);
    const title = !!o.title;
    clearWorld();
    if (L && hasLevel() && LEVEL.dispose) { try { LEVEL.dispose(L); } catch (err) { warnOnce('LEVEL.dispose', err); } }
    L = GAME.L = null;
    const seed = Q.has('tohum') ? ((parseInt(Q.get('tohum'), 10) || 1) + i * 7919) >>> 0 : (Math.random() * 4294967295) >>> 0;
    if (hasLevel()) {
      L = LEVEL.generate(i, seed);
      L._title = title;
      LEVEL.build(L);
      GAME.L = L;
      fezaLightBase();   // the theme's own hero light (LEVEL.build set it); the lightsaber tint is added on top every frame
      if (!R.warmed) { R.warmed = true; fx('warm'); }   // compile lit FX materials once, with real scene lights
    }
    P.zone = i;
    if (!merchantWard()) P.shopWard = null;
    const st = (L && L.start) || { x: 0, z: 0 };
    P.checkpoint = { x: st.x, z: st.z };
    placeHero(st.x, st.z, 0);   // facing the camera: the kid sees Feza's face
    if(title && L && L.readingSpot) {
      const r=L.readingSpot; P.pos.set(r.x,r.seatY-.40*baseScale,r.z);P.face=r.face||0;
      if(H) {H.root.position.copy(P.pos);H.root.rotation.y=P.face;H.update(0,{sitRead:true,attack:-1,cast:-1});}
    }
    P.dead = false; C.deadT = 0; C.invuln = 1;
    if (L) L._title = title;
    if (!title) populate();
    warmZone(i, title);   // the UI's loading fade still covers the screen
    GAME.state = title ? 'title' : 'play';
    emit('zone', { index: i, name: zdef(i).ad, title });
    if (!title) enterZoneStory(i);
    return L;
  }
  // Pre-compile AND draw once everything this zone will show later (enemy types + elites + boss, pickups, name tag,
  // bars, item models, projectiles, telegraphs, skill meshes), so no shader compile / first-draw stall hits mid-fight.
  // compile() alone is not enough on ANGLE/Metal: the pipeline is only created at the first real draw.
  const WARM_E = {};   // one live enemy instance per type(+elite): keeps their programs alive (EMODEL does the same)
  function warmZone(i, title) {
    if (typeof renderer === 'undefined' || !renderer || !L) return;
    const t0 = performance.now();
    const Z = zdef(i), types = new Set(Object.keys(Z.enemies || {})), elites = new Set(Z.elites || []);
    const vars = {};   // type → the variants this zone shows (spawn.variant from LEVEL, ZONES[i].variants)
    const addVar = (t, v) => { if (v) (vars[t] || (vars[t] = new Set())).add(v); };
    for (const s of L.spawns || []) { types.add(s.type); if (s.elite) elites.add(s.type); addVar(s.type, s.variant); }
    if (Z.variants) for (const t in Z.variants) for (const v of Z.variants[t] || []) addVar(t, v);
    const bt = Z.boss || L.bossType || null;
    if (bt || L.boss) { const b = bt || 'ejderha'; types.add(b); types.add(bossKit(b).add); }
    const tmp = new THREE.Group(); tmp.name = 'gameWarm';
    const hasE = typeof EMODEL !== 'undefined' && EMODEL && EMODEL.build;
    const propName = { tac: 'jellyCrown', havuc: 'havuc', serintas: 'serinTas', avla: 'hole' }[bt ? bossKit(bt).bonus : ''];   // (Round 6 bonus props)
    if (hasE && EMODEL.warm) { try { EMODEL.warm([...types].concat(propName && EMODEL.PROPS && EMODEL.PROPS.includes(propName) ? [propName] : []), false); } catch (err) { warnOnce('EMODEL.warm', err); } }   // geometry caches
    if (hasE) for (const t of types) for (const el of [false, true]) {
      if (el && !elites.has(t)) continue;
      const vl = vars[t] ? [...vars[t]] : [VARIANTS[t] ? VARIANTS[t][0] : undefined];
      for (const variant of vl) {
        const k = t + (variant ? ':' + variant : '') + (el ? '*' : '');
        if (!WARM_E[k]) { try { WARM_E[k] = EMODEL.build(t, { variant, elite: el }); } catch (err) { warnOnce('warm ' + k, err); } }
        if (WARM_E[k] && WARM_E[k].root) tmp.add(WARM_E[k].root);
      }
    }
    if (hasE && finalZone(i) && (bt || L.boss)) {   // the finale: Son İrade
      try {
        if (!WARM_E._crystal && EMODEL.crystal) WARM_E._crystal = { root: EMODEL.crystal() };
        if (!WARM_E._baby && EMODEL.babyDragon) WARM_E._baby = EMODEL.babyDragon();
        if (WARM_E._baby) tmp.add(WARM_E._baby.root);
        for (const egg of eggPool()) if (!egg.used) tmp.add(egg.root);
      } catch (err) { warnOnce('warm finale', err); }
      if (WARM_E._crystal && WARM_E._crystal.root) tmp.add(WARM_E._crystal.root);
    }
    if (bt === 'sovalye') { try { for (const s of sancakPool()) if (!s.used) tmp.add(s.m.root); } catch (err) { warnOnce('warm sancak', err); } }   // (Round 5) the tournament banners
    // (Round 6) the boss's bonus things: its pooled models (the giant bubble / the hearts only when FX has no such shot)
    const bk = bt && bossKit(bt).bonus, bonusFx = { balon: 'bigbubble', kalp: 'heart' }[bk], warmPools = [];
    if (bk && BONUS_POOLS[bk]) {
      try {
        const fxShot = bonusFx ? fxProj(bonusFx, bk === 'kalp' ? '#bc4743' : undefined) : null;
        if (fxShot) { tmp.add(fxShot); warmPools.push({ proj: fxShot }); }
        for (const k of BONUS_POOLS[bk]) if (!(fxShot && (k === 'bubble' || k === 'heart'))) for (const p of bonusPool(k)) if (!p.used) { tmp.add(p.m.root); warmPools.push({ root: p.m.root }); }
      } catch (err) { warnOnce('warm bonus', err); }
    }
    const temp = [];   // FX handles to release after the draw
    try {
      const hm = new THREE.Mesh(heartGeo(), R.heartMat); hm.castShadow = true; tmp.add(hm);
      const pot = potionTpl(); tmp.add(pot);
      if (Z.theme === 'dairy' || Z.id === 'kefir') tmp.add(kefirBottleTpl());   // (Round 4) the valley's kefir-bottle hearts
      if (bt && bossKit(bt).gift) tmp.add(kefirGlassTpl(), moustacheTpl());     // …and the giant's glass of kefir (+ Feza's kefir moustache)
      tmp.add(decal(lootRingMat('#ff4d7a'), 1), decal(R.blobMat, 1), decal(R.auraGlow, 1), decal(R.auraMat, 1), decal(R.markMat, 1), decal(R.selMat, 1));
      if (!R.warmTag) R.warmTag = nameTag('Kocaman');
      tmp.add(R.warmTag);
      if (typeof ITEMS !== 'undefined' && ITEMS.make && ITEMS.BASES) {
        for (const slot of ['weapon', 'hat', 'cape']) for (const b of ITEMS.BASES[slot] || []) {
          if (!b.legendary && b.minLvl > Z.ilvl + 4) continue;
          try { tmp.add(itemModel(ITEMS.make(slot, b.id, b.legendary ? 3 : 2, Z.ilvl || 1))); } catch (err) { warnOnce('warm item', err); }
        }
      }
      const kinds = new Set(['star']);
      for (const t of types) { const d = edef(t); if (d.kind === 'ranged' || d.kind === 'boss') kinds.add((d.shot && d.shot.kind) || SHOT_KIND[t] || 'spore'); }
      if (typeof FX !== 'undefined' && FX) {
        for (const k of kinds) { const o = fx('projectile', k, SHOT_COL[k]); if (o) { tmp.add(o); temp.push({ proj: o }); } }
        const tx = CAM.target.x, tz = CAM.target.z;
        temp.push(fx('telegraph', tx, tz, 2, 1, '#ff4a3a'), fx('telegraphCone', tx, tz, 0, 1.5, 2.5, 1, '#ff5a44'), fx('beam', tx, tz, '#ffd23f', 3));
        if (FX.telegraphLine) temp.push(fx('telegraphLine', tx - 2, tz, tx + 2, tz, 1.2, 1, '#ff6a3a'));
        if (bk) { temp.push(bonusMark(tx + 1, tz, 0.9, bk === 'kalp' ? PINK_MARK : GOLD_MARK)); if (FX.dizzy) temp.push(fx('dizzy', tx, 1.5, tz, 0.55, 0)); }   // (Round 6)
      }
    } catch (err) { warnOnce('warmZone', err); }
    tmp.position.copy(CAM.target); tmp.position.y = 0;
    const cull = [];
    tmp.traverse(o => { if (o.isMesh || o.isSprite || o.isPoints) { cull.push(o, o.frustumCulled); o.frustumCulled = false; } });
    if (typeof SKILLS_update === 'function') { try { SKILLS_update(0); } catch (err) { warnOnce('SKILLS_update', err); } }   // builds its meshes
    const sk = scene.getObjectByName('skills'), skVis = [];   // 08_skills' root: draw its hidden meshes once too
    if (sk) sk.traverse(o => { if (o !== sk) { skVis.push(o, o.visible); o.visible = true; } });
    const coinsN = R.coins.count, barsN = R.bars.count;
    _m4.makeTranslation(CAM.target.x, 0.5, CAM.target.z);
    R.coins.setMatrixAt(0, _m4); R.coins.count = Math.max(1, coinsN); R.coins.instanceMatrix.needsUpdate = true;
    R.bars.setMatrixAt(0, _m4); R.bars.count = Math.max(1, barsN); R.bars.instanceMatrix.needsUpdate = true;
    scene.add(tmp);
    // Feza wearing each item this zone can drop (FEZA builds + caches the worn models): one real draw per outfit, since
    // the worn cape's shadow-depth shader differs per cape and compile() never builds shadow programs.
    const combos = [null];
    if (H && H.setEquip && typeof ITEMS !== 'undefined' && ITEMS.make && ITEMS.BASES) {
      const lists = {};
      for (const slot of ['weapon', 'hat', 'cape']) {
        lists[slot] = (ITEMS.BASES[slot] || []).filter(b => (b.legendary || b.minLvl <= (Z.ilvl || 1) + 4) && !R.warmEq[slot + b.id])
          .map(b => { R.warmEq[slot + b.id] = true; return ITEMS.make(slot, b.id, b.legendary ? 3 : 2, Z.ilvl || 1); });
      }
      const n = Math.max(lists.weapon.length, lists.hat.length, lists.cape.length);
      for (let k = 0; k < n; k++) combos[k] = { weapon: lists.weapon[k] || P.equip.weapon, hat: lists.hat[k] || P.equip.hat, cape: lists.cape[k] || P.equip.cape };
    }
    let dressed = false;
    const prevT = renderer.getRenderTarget();
    // The first draw also draws the WHOLE level unculled, so every shadow-depth variant it uses is built now (compile()
    // never builds shadow programs; an instanced coloured caster — basalt columns, stalactites, vases — first entering
    // the sun's shadow box used to compile mid-game, usually as a boss arena came into view).
    const lvlCull = [];
    if (L.group) L.group.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite) && o.frustumCulled) { lvlCull.push(o); o.frustumCulled = false; } });
    try {
      renderer.compile(scene, camera);   // everything in the level too (ignores frustum culling)
      renderer.setRenderTarget(typeof POST !== 'undefined' && POST.on && typeof rtMain !== 'undefined' && rtMain ? rtMain : null);
      combos.forEach((eq, n) => {
        if (eq) { try { H.setEquip(eq); dressed = true; } catch (err) { warnOnce('warm equip', err); } }
        renderer.render(scene, camera);  // a real draw (shadow pass included)
        if (n === 0) for (const o of lvlCull) o.frustumCulled = true;   // the outfit draws: the usual culled view
      });
    } catch (err) { warnOnce('warm render', err); }
    for (const o of lvlCull) o.frustumCulled = true;
    renderer.setRenderTarget(prevT);
    if (dressed) { try { H.setEquip(title && R.titleWear ? R.titleWear : P.equip); } catch (err) { warnOnce('H.setEquip', err); } }
    scene.remove(tmp);
    for (let k = 0; k < cull.length; k += 2) cull[k].frustumCulled = cull[k + 1];
    for (let k = 0; k < skVis.length; k += 2) skVis[k].visible = skVis[k + 1];
    R.coins.count = coinsN; R.bars.count = barsN;
    for (const h of temp) { if (h && h.proj) killProjectileObj(h.proj); else remove(h); }
    for (const h of warmPools) { if (h.proj) killProjectileObj(h.proj); else removeObj(h.root); }
    for (const k in WARM_E) if (WARM_E[k] && WARM_E[k].root) removeObj(WARM_E[k].root);
    removeObj(potionTpl()); if (R.bottle) removeObj(R.bottle); if (R.glass) removeObj(R.glass); if (R.must && !must) removeObj(R.must);
    GAME.warmMs = Math.round(performance.now() - t0);
  }
  function populate() {
    if (!L) return;
    L._title = false;
    L._bossRoom = undefined;
    sleepers = (L.spawns || []).filter(s => !isBossType(s.type)).map(s => Object.assign({}, s));   // (boss types never wander in the level)
    const bs = (L.spawns || []).find(s => isBossType(s.type));
    const bz = zdef().boss || L.bossType || (bs && bs.type) || null;
    const rm = bossRoom();
    const at = L.boss || bs || (bz && rm ? { x: rm.x, z: rm.z } : null);
    // a save made after the dragon cheered up (see snapshot): no dragon, the crystal is waiting, Feza wakes at the arena
    const won = F.bossDone === P.zone && finalZone() && !!at;
    F.bossDone = -1;
    if (bz && at && !won) {
      const b = makeEnemy({ type: bz, x: at.x, z: at.z, elite: false, pack: 'boss', face: 0 });
      b.face = 0; boss = GAME.boss = b;
    } else GAME.boss = null;
    if (won) {
      finale = true;
      let sx = at.x, sz = at.z + 4;
      for (let s = 4; s >= 0 && !circleFree(sx, sz, T.heroR); s -= 0.5) sz = at.z + s;
      if (!circleFree(sx, sz, T.heroR)) { const door = arenaDoor(); if (door) { sx = door.x; sz = door.z; } }
      if (circleFree(sx, sz, T.heroR)) { P.checkpoint = { x: sx, z: sz }; placeHero(sx, sz, 0); }
      spawnCrystal();
    }
    // Round 3: the portal of a zone with a boss opens when the boss cheers up; without a boss (older levels) it is open.
    if (L.portalObj && L.portalObj.setActive) {
      const open = !(boss && !finalZone());
      try { L.portalObj.setActive(open); } catch (err) { warnOnce('portal.setActive', err); }
      L.portalObj.active = open;
    }
    activate(true, 16);
    pathInit();
  }
  // Arc length along the main route of every checkpoint, so walking past one lights it even on the far side of the path.
  function pathProject(x, z, maxD) {
    const path = L && L.path;
    if (!path || path.length < 2 || !pathCum) return -1;
    let best = -1, bd = maxD * maxD;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), d2 = dist2(a.x + dx * t, a.z + dz * t, x, z);
      if (d2 < bd) { bd = d2; best = pathCum[i] + t * Math.sqrt(l2); }
    }
    return best;
  }
  function pathInit() {
    pathS = 0; pathCum = null;
    const path = L && L.path;
    if (!path || path.length < 2) return;
    pathCum = [0];
    for (let i = 1; i < path.length; i++) pathCum.push(pathCum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z));
    for (const cp of L.cpObjs || []) cp._s = pathProject(cp.x, cp.z, 12);
  }
  function enterZoneStory(i) {
    const Z = zdef(i);
    igniteSaber(0.45);   // vvzzum: the lightsaber lights up as the zone fades in
    if (Z.music) aud('music', Z.music);
    if (i > 0 && Z.line) later(0.8, () => say(Z.line, 2));
    skillAt = gt + 1.2;   // a new skill's line held back from the last boss: right after this zone's name
  }

  // Freeze offence and effective health once per repeat adventure. A later level, drop or polish remains a reward.
  // Old repeat saves have no reference: infer one from their current chapter, then keep it in manual saves.
  function captureRoundPower(zone = 0) {
    const i = Math.max(0, ZORDER.indexOf(zdef(zone).id)), R = DIFF.repeat;
    const growth = (DIFF.power.dmg[i] - DIFF.power.dmg[0]) * R.damageGrowth;
    return { ng: P.ng, damage: Math.max(20, P.dmg - growth), magic: Math.max(20, P.magicDmg - growth),
      health: Math.max(R.health[0], P.maxHp / (1 - P.armor / 100) - (R.health[i] - R.health[0]) * R.healthGrowth) };
  }
  function cleanRoundPower(raw) {
    if (!P.ng || !raw || raw.ng !== P.ng) return null;
    const valid = k => typeof raw[k] === 'number' && Number.isFinite(raw[k]) && raw[k] > 0 && raw[k] <= 1e6;
    if (!['damage', 'magic', 'health'].every(valid)) return null;
    return { ng: P.ng, damage: Math.max(20, raw.damage), magic: Math.max(20, raw.magic), health: Math.max(DIFF.repeat.health[0], raw.health) };
  }
  function roundDamage(magic = false) {
    const r = P.roundPower;
    return (magic ? r.magic : r.damage) + (zpick(DIFF.power.dmg) - DIFF.power.dmg[0]) * DIFF.repeat.damageGrowth;
  }
  const roundPressure = () => 1 + DIFF.repeat.pressure * Math.min(P.ng, DIFF.repeat.maxPressureRounds);
  const roundCooldown = () => P.ng ? 1 - Math.min(0.12, 0.06 + 0.015 * (P.ng - 1)) : 1;
  function roundThreat() {
    const R = DIFF.repeat, usual = zpick(R.health);
    const health = P.roundPower.health + (usual - R.health[0]) * R.healthGrowth;
    return Math.max(1, health / usual) * roundPressure();
  }

  // ── Enemies ──
  // Creature hp factor for a sword stronger than usual in this zone and round (see DIFF.power); 1 at or below it.
  function powerHp(ngH, tough = hard) {
    if (P.ng) return 1;   // repeat HP already uses the frozen round reference
    const D = DIFF.power, usual = zpick(D.dmg) * ngH;
    return P.dmg > usual ? Math.pow(P.dmg / usual, tough ? D.k : DIFF.normal.powerK) : 1;
  }
  // Boss tuning: DIFF.boss[type], or the dragon's numbers (its hp cap = EDEF hp × DIFF.bossHp, floor = bossHpMin of that).
  function bossCfg(type) {
    const c = DIFF.boss[type];
    if (c) return c;
    const d = edef(type), per = DIFF.bossHpPerDmg, hi = (d.hp || 1600) * DIFF.bossHp / per;
    return { per, lo: hi * DIFF.bossHpMin, hi, dmg: (d.dmg || 16) * 1.4 * DIFF.bossDmg };
  }
  // (Round 5 QA: the hybrid fights the dragon with its wand — the volcano's and the knight's treasures are swords, so sized
  // on P.dmg = its sword the dragon took it 88–100 s. The final boss — the one without DIFF.boss numbers — is sized on the
  // hybrid's wand; the other bosses stay on P.dmg)
  const bossHpNow = (type, tough = hard) => { const c = bossCfg(type), ref = P.heroClass === 'hybrid' && !DIFF.boss[type] ? P.magicDmg * DIFF.bossHybridK : P.dmg;
    if (P.ng) {
      const magic = P.heroClass === 'hybrid' && !DIFF.boss[type];
      const power = Math.max(c.lo, roundDamage(magic) * (magic ? DIFF.bossHybridK : 1));
      return Math.max(1, Math.round(c.per * power * roundPressure() * (tough ? HC.bossHp : DIFF.normal.bossLength)));
    }
    let power = clamp(ref, c.lo, c.hi);
    if (!tough) {   // weak gear keeps its help; above the usual zone damage, an upgrade buys a shorter fight
      const usual = clamp(zpick(DIFF.power.dmg), c.lo, c.hi);
      if (power > usual) power = usual + (power - usual) * DIFF.normal.bossPower;
    }
    return Math.max(1, Math.round(c.per * power * (1 + 0.5 * P.ng) * (tough ? HC.bossHp : DIFF.normal.bossLength))); };
  // Variant of a creature: LEVEL's spawn.variant, else one of the zone's (ZONES[i].variants, e.g. lava jellies), else a random colour.
  function variantFor(type, sp) {
    if (sp && sp.variant) return sp.variant;
    const zv = zdef().variants && zdef().variants[type];
    if (Array.isArray(zv) && zv.length) return fpick(zv);
    return VARIANTS[type] ? fpick(VARIANTS[type]) : undefined;
  }
  function makeEnemy(sp) {
    const type = sp.type, def = sp.whelp ? { ...edef('yarasa'), ad: 'Lanet Yavrusu', kind: 'melee', fly: true, hover: 0.32, r: 0.42, height: 0.95 } : edef(type), Z = zdef();
    const isBoss = def.kind === 'boss' || sp.pack === 'boss';
    const elite = !!sp.elite && !isBoss;
    const ngH = P.ng ? Math.max(1, roundDamage() / zpick(DIFF.power.dmg)) * roundPressure() : 1;
    const ngD = P.ng ? roundThreat() : 1;
    const variant = variantFor(type, sp);
    let m = null;
    if (sp.whelp && typeof EMODEL !== 'undefined' && EMODEL.babyDragon) {
      const baby = EMODEL.babyDragon();
      m = { ...baby, radius: 0.42, height: 0.95, anim(dt, st) { baby.anim(dt, st.move > 0.05, st.attack >= 0, st); } };   // (st: hurt, frozen, happy goodbye)
    } else if (typeof EMODEL !== 'undefined' && EMODEL.build) { try { m = EMODEL.build(type, { variant, elite }); } catch (err) { warnOnce('EMODEL.build ' + type, err); } }
    if (!m || !m.root) m = fallbackEnemy(type, elite);
    scene.add(m.root);
    const sc = elite ? 1.4 : 1;
    // Keep both HP values from this spawn's gear/level. Changing difficulty later must not rescale old enemies to
    // a newly equipped weapon. Bosses refresh this pair once, when their fight first begins.
    const hpFor = tough => Math.round(isBoss ? bossHpNow(type, tough)
      : def.hp * (Z.hpMult || 1) * ngH * DIFF.hp * zpick(DIFF.zoneHp) * (DIFF.hpType[type] || 1) * (elite ? DIFF.eliteHp : 1) * powerHp(ngH, tough) * (tough ? HC.hp : 1));
    const difficultyHp = [hpFor(false), hpFor(true)], hp = difficultyHp[hard ? 1 : 0];
    const difficultyWind = [Math.max(T.windMin, def.windup || 0.6), Math.max(0.4, (def.windup || 0.6) * HC.wind)];
    const e = {
      type, def, m, variant, difficultyHp, difficultyWind, x: sp.x, z: sp.z, y: 0, face: sp.face !== undefined ? sp.face : frand(0, TAU), hp, maxHp: hp, elite, boss: isBoss,
      name: isBoss ? (def.ad || 'Gece Yutan') : elite ? (def.eliteAd || ELITE_AD[type] || 'Kocaman ' + String(def.ad || type).replace(/^(Huysuz|Haylaz) /, '')) : (def.ad || type),
      r: m.radius || (def.r || 0.5) * sc, height: m.height || (def.height || 1) * sc,
      dmg: (isBoss ? bossCfg(type).dmg : def.dmg * (Z.dmgMult || 1) * zpick(DIFF.zoneDmg) * DIFF.dmg) * ngD * (elite ? DIFF.eliteDmg : 1) * (hard ? (isBoss ? HC.bossDmg : HC.dmg) : 1),
      speed: Math.min(def.speed || 2.5, T.enemyMaxSpeed) * (elite ? 0.92 : 1) * (1 + Math.min(0.12, 0.03 * P.ng)) * (hard ? HC.speed : 1),
      xp: (def.xp || 10) * (isBoss ? 1 : (Z.xpMult || 1) * DIFF.xp) * (1 + 0.5 * P.ng) * (elite ? 3 : 1),
      gold: (def.gold || 3) * (Z.gold || 1) * (elite ? 3 : 1),
      kind: isBoss ? 'boss' : HEAVY[type] ? 'slam' : (def.kind || 'melee'), fly: !!def.fly, hover: def.hover !== undefined ? def.hover : 0.8,
      atkRange: def.atkRange || 1, atkCd: (def.atkCd || 1.7) * DIFF.atkCd * roundCooldown() * (hard ? HC.cd : 1), windup: difficultyWind[hard ? 1 : 0], aggroR: def.aggro || 9,
      homeX: sp.x, homeZ: sp.z, pack: sp.pack, room: sp.room, sp,
      state: 'idle', stT: 0, wind: 0.6, cd: frand(0.4, 1.2), stun: 0, frozen: 0, flash: 0, hurt: 0, kvx: 0, kvz: 0,
      aggro: false, token: false, dist: 99, losOk: false, losT: frand(0, 0.3), lookT: frand(0, 0.25), wT: frand(0.5, 3), walking: false, wx: sp.x, wz: sp.z,
      t: frand(0, 10), phase: frand(0, TAU), strafe: Math.random() < 0.5 ? 1 : -1, strafeT: frand(1.5, 3),
      tele: null, ice: null, aura: null, tag: null, sparkT: 0, bar: { trail: 1, delay: 0 }, fade: 1, aggroAt: -99, dead: false,
      bur: 0, upT: 99, digT: 0, digS: 0, trailT: frand(0, 0.2),   // burrow amount (köstebek), time on the surface, fx timers
      // No EDEF entry for a burrower = the stand-in model cannot sink by itself: GAME lowers it into the ground instead.
      selfBurrow: (def.kind === 'burrow' || type === 'kostebekusta') && !(typeof EDEF !== 'undefined' && EDEF && EDEF[type]),
      st: { move: 0, windup: -1, attack: -1, hurt: 0, frozen: false, dying: -1, t: 0, burrow: 0, breath: -1, stomp: -1, roar: -1, fireball: -1,
        phase: 'idle', phaseT: 0, air: 0 },   // (phase/phaseT/air: the Round 3 bosses' animation state)
    };
    if (elite) {
      e.aura = new THREE.Group();
      e.auraR = Math.min(e.r * 3.1, 3.4);
      const glow = decal(R.auraGlow, e.auraR * 1.35), ring = decal(R.auraMat, e.auraR);
      glow.position.y = 0.035; ring.position.y = 0.04;
      e.aura.add(glow, ring); scene.add(e.aura);
      e.tag = nameTag(e.name); scene.add(e.tag);
    }
    if (isBoss) {
      e.ph = 'idle'; e.phD = 1; e.wait = 1.5; e.last = ''; e.last2 = ''; e.th = []; e.yarim = false; e.summon = 0; e.dmg0 = e.dmg; e.naps = 0; e.sized = false;
      e.kit = bossKit(type); e.final = finalZone(); e.did = 0;
      e.st.aggro = false; e.st.crownOff = 0;   // (Round 6: 05's pre-aggro idle loop needs a real false)
    }
    if (sp.whelp) {
      const power = P.ng ? roundDamage() : P.dmg;
      e.whelp = true; setEnemyHp(e, Math.max(12, Math.round(power * 2.1)), Math.max(12, Math.round(power * 2.1 * HC.hp))); e.dmg = 3 * ngD * (hard ? HC.dmg : 1);
      e.speed = 2.1 * (hard ? HC.speed : 1); e.atkRange = 0.9; e.atkCd = 2.4 * roundCooldown() * (hard ? HC.cd : 1); e.difficultyWind = [0.8, 0.8 * HC.wind]; e.windup = e.difficultyWind[hard ? 1 : 0]; e.xp = 0; e.gold = 0;
    }
    place(e);
    enemies.push(e);
    return e;
  }
  function dropEnemy(e) {
    remove(e.tele); e.tele = null; remove(e.ice); e.ice = null;
    if (e.gift) killGlass(e.gift);
    if (e.aura) { removeObj(e.aura); e.aura = null; }
    if (e.tag) { removeObj(e.tag); e.tag.material.map.dispose(); e.tag.material.dispose(); e.tag = null; }
    removeObj(e.m.root);
    try { e.m.dispose && e.m.dispose(); } catch (err) { warnOnce('EMODEL.dispose', err); }
  }
  // Wake sleeping spawns near Feza (a few per tick so building models never causes a hitch).
  function activate(force, cap = 4) {
    const r2 = T.activeR * T.activeR;
    let n = 0;
    for (let i = sleepers.length - 1; i >= 0 && n < cap; i--) {
      const s = sleepers[i];
      if (dist2(s.x, s.z, P.pos.x, P.pos.z) < r2) { sleepers.splice(i, 1); makeEnemy(s); n++; }
    }
    if (force && n >= cap) activate(true, cap);
  }
  function place(e) {
    if (e.fly && !e.dead) e.y = e.hover + 0.14 * Math.sin(e.t * 2.6 + e.phase);
    const r = e.m.root;
    e.st.burrow = e.bur;
    r.position.set(e.x, e.y, e.z); r.rotation.y = e.face;
    if (e.selfBurrow) r.position.y = e.y - e.bur * e.height * 1.15;   // stand-in model only (the real köstebek sinks itself + shows its mound)
    if (e.aura) {
      e.aura.position.set(e.x, 0, e.z);
      const k = 1 + 0.08 * Math.sin(e.t * 4);
      e.aura.children[1].scale.setScalar(e.auraR * k); e.aura.children[1].rotation.z = e.t * 0.8;
    }
    if (e.tag) e.tag.position.set(e.x, e.y + e.height + 0.78, e.z);
  }
  function anim(e, dt) { if (e.m.anim) { try { e.m.anim(dt, e.st); } catch (err) { warnOnce('EMODEL.anim ' + e.type, err); } } }

  function setAggro(e, spread = true) {
    if (e.aggro || e.dead) return;
    if (e.boss) { bossAggro(e); return; }
    e.aggro = true; e.aggroAt = gt; e.state = 'chase'; e.walking = false; e.cd = Math.max(e.cd, frand(0.35, 0.9));
    if (spread && !e.elite) ftext(e.x, e.y + e.height + 0.5, e.z, '!', 'word');   // the one who spotted Feza
    if (e.elite && !finale) {
      ftext(e.x, e.y + e.height + 1.1, e.z, e.name + '!', 'word');
      if (gt - lastKocaman > 40) { lastKocaman = gt; emit('toast', { text: e.name + ' geliyor!' }); }
      // the voice line once per zone, now or never ("… geliyor!" said after the fight started would be wrong)
      // (not over another line: queued behind it, "… geliyor!" came after the fight had started)
      if (!ZF.kocaman && !speaking() && chat('kocaman', dist2(e.x, e.z, P.pos.x, P.pos.z) < 12 * 12 ? 3 : 2, 6, { wait: 4 })) ZF.kocaman = true;
    }
    if (!F.intro0) introFirstSkill();
    // "Bak bak! Köstebekler…" — once per game, the first time (EDEF line: a newer creature). Round 4 QA: the forest's name
    // line ('orman': "…Jöleler ve mantarlar çok huysuzlanmış") is said at the first jelly / mushroom Feza meets (said 14 m
    // from the start it was always dropped behind the intro).
    const fl = firstLineFor(e.type);
    // Claimed only when it can start now (Round 4 QA: claimed while the zone's name and a new skill's line were still
    // playing, it went stale in AUD's queue and was lost for the whole game); otherwise flushFirst says it a moment later,
    // or at the next sighting of that kind.
    if (fl && !firstSaid(fl) && !finale && hasLine(fl)) {
      if (!sayFirst(fl) && !firstQ.some(q => q.fl === fl)) firstQ.push({ type: e.type, at: gt, fl });
    }
    if (spread && e.pack !== undefined && e.pack !== null) {
      for (let i = sleepers.length - 1; i >= 0; i--) if (sleepers[i].pack === e.pack) { const s = sleepers.splice(i, 1)[0]; makeEnemy(s); }
      for (const o of enemies) if (o !== e && o.pack === e.pack && !o.aggro && !o.boss) setAggro(o, false);
    }
  }
  const ZONE_FIRST = { tuvalet: { kakacik: 1, cisdamlasi: 1, sabunkopugu: 1 }, orman: { jole: 1, mantar: 1 } };   // zone id → first-sighting introduction
  function firstLineFor(type) {
    const Z = zdef();
    if (ZONE_FIRST[Z.id] && ZONE_FIRST[Z.id][type] && F.zl && !F.zl[P.zone] && Z.line) return Z.line;
    return FIRST_LINE[type] || (typeof edef(type).line === 'string' ? edef(type).line : null);
  }
  const zoneLineKey = fl => fl === zdef().line;
  const firstSaid = fl => (zoneLineKey(fl) ? !!(F.zl && F.zl[P.zone]) : !!F[fl]);
  // Says a first-sight line if the narrator is free and the last one ended FIRST_GAP s ago; marks it said. false = not now.
  function sayFirst(fl) {
    if (gt - lastFirst < FIRST_GAP || speaking() || quietFor() < 0.6) return false;
    if (zoneLineKey(fl)) F.zl[P.zone] = true; else F[fl] = true;
    lastFirst = gt + 0.5 + (lineLen(fl) || 3);   // (the gap counts from the end of this line)
    later(0.5, () => { const w = say(fl, 2, { wait: 8 }); if (w) lastFirst = gt + w; });
    return true;
  }
  function flushFirst() {   // a first-sight line that had to wait: now, if one of that kind is still fighting nearby
    if (!firstQ.length || finale || gt - lastFirst < FIRST_GAP || speaking()) return;
    for (let i = 0; i < firstQ.length; i++) {
      const t = firstQ[i].type, fl = firstQ[i].fl;
      if (!fl || firstSaid(fl)) { firstQ.splice(i--, 1); continue; }
      // still true: one of them is fighting nearby, or they were spotted only a few seconds ago (a quick fight is over)
      if (gt - firstQ[i].at > 10 && !enemies.some(q => q.type === t && q.aggro && !q.dead && q.dist < 14 && !hidden(q))) continue;
      if (sayFirst(fl)) firstQ.splice(i, 1);
      return;
    }
  }
  function calm(e) {
    e.aggro = false; e.token = false; cancelWindup(e);
    e.state = 'idle'; e.walking = true; e.returning = true; e.wx = e.homeX; e.wz = e.homeZ;
  }
  function cancelWindup(e) {
    remove(e.tele); e.tele = null;
    if (e.state === 'windup' || e.state === 'strike' || e.state === 'recover' || e.state === 'hop' || BUR_ST[e.state]) {   // (a yogurt knocked out of its hop drops down: see enemyStep)
      if (e.state === 'windup' || e.state === 'rise') STATS.cancel++;
      if (BUR_ST[e.state]) e.upT = 0;   // a köstebek pops up where it is (see enemyStep) and stays up a while
      e.state = e.aggro ? 'chase' : 'idle'; e.cd = Math.max(e.cd, frand(0.5, 0.9));
    }
  }
  function freeze(e, s) {
    if (e.boss) return;   // (no skill freezes any more; a boss frozen mid-hop or underground would look broken)
    const was = e.frozen > 0;
    e.frozen = Math.max(e.frozen, s); STATS.freezes++;
    cancelWindup(e);
    if (!was) {
      if (e.m.setTint) e.m.setTint('#8e78a2');
      if (!e.boss) e.ice = fx('iceBlock', e.m.root, e.r * 1.25 + 0.15);
    }
  }
  function unfreeze(e) {
    e.frozen = 0;
    if (e.m.setTint) e.m.setTint(null);
    remove(e.ice); e.ice = null;
    burst('ice', e.x, e.y + e.height * 0.5, e.z, { count: 12 });
  }

  // Only a few enemies fight at once; the rest wait their turn in a loose ring (kid-sized chaos).
  function assignTokens() {
    const mel = [], rng = [], big = [];
    for (const e of enemies) {
      e.token = false;
      if (!e.aggro || e.boss || e.frozen > 0) continue;
      (e.kind === 'ranged' ? rng : e.kind === 'slam' ? big : mel).push(e);
    }
    const byD = (a, b) => a.dist - b.dist;
    mel.sort(byD); rng.sort(byD); big.sort(byD);
    for (let i = 0; i < mel.length && i < T.maxMelee; i++) mel[i].token = true;
    for (let i = 0; i < rng.length && i < T.maxRanged; i++) rng[i].token = true;
    if (big.length) big[0].token = true;   // the big slow Kaya Devi gets its own turn (four moles up close must not lock it out)
    for (const e of mel) if (!e.token && e.state === 'windup') cancelWindup(e);
    for (let i = 1; i < big.length; i++) if (big[i].state === 'windup') cancelWindup(big[i]);
  }

  function stepToward(e, dx, dz, speed, dt, face = true) {
    moveE(e, dx * speed * dt, dz * speed * dt);
    if (face) e.face = dampAngle(e.face, Math.atan2(dx, dz), 9, dt);
    e.st.move = Math.min(1, speed / Math.max(1, e.speed));
  }
  function chaseDir(e, d, ux, uz) {
    if (e.losOk && d < 8) return _tp2.set(ux, uz);
    if (L && hasLevel() && LEVEL.flowDir) {
      const f = LEVEL.flowDir(L, e.x, e.z);
      if (f && (f.x || f.z)) return _tp2.set(f.x, f.z);
    }
    return _tp2.set(ux, uz);
  }
  const _tp2 = { x: 0, z: 0, set(x, z) { this.x = x; this.z = z; return this; } };

  function wander(e, dt) {
    e.wT -= dt;
    if (!e.walking && e.wT <= 0) {
      e.wT = frand(2.5, 5.5);
      if (Math.random() < 0.65) {
        const a = frand(0, TAU), r = frand(0.8, 2.6), x = e.homeX + Math.sin(a) * r, z = e.homeZ + Math.cos(a) * r;
        if (isFloor(x, z)) { e.wx = x; e.wz = z; e.walking = true; }
      }
    }
    if (e.returning) {
      if (e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25 * dt);
      e.retT = (e.retT || 0) + dt;
      if (e.retT > 6 && e.dist > 16) { e.x = e.homeX; e.z = e.homeZ; e.walking = e.returning = false; e.retT = 0; return; }   // stuck on a wall, out of sight
    } else e.retT = 0;
    if (e.walking) {
      const dx = e.wx - e.x, dz = e.wz - e.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { e.walking = false; e.returning = false; return; }
      stepToward(e, dx / d, dz / d, e.speed * (e.returning ? 0.8 : 0.32), dt);
    }
  }

  function enemyStep(e, dt, canTarget) {
    const st = e.st;
    e.t += dt; st.t = e.t;
    const dx = P.pos.x - e.x, dz = P.pos.z - e.z, d = Math.hypot(dx, dz) || 1e-4;
    const ux = dx / d, uz = dz / d;
    e.dist = d;
    if (d > T.hideR && !e.aggro) { if (e.m.root.visible) { e.m.root.visible = false; if (e.aura) e.aura.visible = e.tag.visible = false; } return; }
    if (!e.m.root.visible) { e.m.root.visible = true; if (e.aura) e.aura.visible = true; }
    e.cd -= dt;
    e.hurt = Math.max(0, e.hurt - dt * 3.5); st.hurt = e.hurt;
    if (e.flash > 0) { e.flash = Math.max(0, e.flash - dt * (e.boss ? 8 : 6)); if (e.m.flash) e.m.flash(e.flash, e.flashCol || '#ffffff'); }
    if (e.kvx || e.kvz) {
      moveE(e, e.kvx * dt, e.kvz * dt);
      const k = Math.exp(-9 * dt); e.kvx *= k; e.kvz *= k;
      if (Math.abs(e.kvx) + Math.abs(e.kvz) < 0.06) e.kvx = e.kvz = 0;
    }
    st.move = 0; st.windup = -1; st.attack = -1; st.frozen = false;
    if (e.boss) { st.breath = st.stomp = st.roar = st.fireball = -1; }
    else if (!e.fly && e.y > 0 && e.state !== 'hop') { e.y = Math.max(0, e.y - dt * 6); st.air = 0; }   // a hop that was cut short lands
    if (e.frozen > 0) {
      e.frozen -= dt; st.frozen = true;
      if (e.frozen <= 0) unfreeze(e);
      place(e); anim(e, dt); return;
    }
    if (e.stun > 0 && !e.boss) { e.stun -= dt; st.hurt = Math.max(st.hurt, 0.5); place(e); anim(e, dt); return; }
    if (e.bur > 0 && !e.boss && !BUR_ST[e.state]) {   // köstebek calmed / reset / interrupted underground: pops up where it is first
      e.bur = Math.max(0, e.bur - dt / riseT(e));
      if (e.bur <= 0) { burst('dirt', e.x, 0.05, e.z, { count: 6, color: DIRT }); sfx('emerge', { x: e.x, z: e.z, vol: 0.6 }); }
      place(e); anim(e, dt); return;
    }
    e.losT -= dt;
    if (e.losT <= 0) { e.losT = 0.3; e.losOk = d < 18 && los(e.x, e.z, P.pos.x, P.pos.z); }
    if (petTaunted(e) && canTarget) petEnemyStep(e, dt);
    else if (e.boss) bossStep(e, dt, d, ux, uz, canTarget);
    else if (!e.aggro) {
      e.lookT -= dt;
      // (just after Feza's nap they let him wake up in peace: see respawn)
      if (canTarget && e.lookT <= 0) { e.lookT = 0.25; if (d < e.aggroR && e.losOk && (!(gt < e.calmT) || d < NAP.near)) setAggro(e); }
      if (!e.aggro) wander(e, dt);
    } else if (!canTarget || d > T.leash) calm(e);
    else if (e.kind === 'ranged') rangedStep(e, dt, d, ux, uz);
    else if (e.kind === 'burrow') burrowStep(e, dt, d, ux, uz);
    else if (HOPPERS[e.type] || e.kind === 'hop') hopStep(e, dt, d, ux, uz);
    else if (ROLLERS[e.type] || e.kind === 'roll' || e.kind === 'glide' || e.kind === 'slide') rollStep(e, dt, d, ux, uz);
    else meleeStep(e, dt, d, ux, uz);
    if (SLIMY[e.type] && st.move > 0.05 && d < 30) slimeTrail(e, dt);
    else if ((CREAMY[e.type] || DUSTY[e.type]) && st.move > 0.05 && d < 30 && e.state !== 'roll') creamTrail(e, dt, 0.16);
    place(e); anim(e, dt);
    if (e.elite && d < 24 && e.bur < 0.5) {   // golden motes drifting up around elites
      e.sparkT -= dt;
      if (e.sparkT <= 0) {
        e.sparkT = 0.12;
        const a = frand(0, TAU), r = e.r * frand(0.7, 1.3);
        emitP(e.x + Math.sin(a) * r, e.y + frand(0.1, e.height * 0.8), e.z + Math.cos(a) * r, 0, frand(0.6, 1.3), 0, frand(0.8, 1.2), frand(0.14, 0.26), 0, '#ffd23f', '#fff6c8', 2, -0.3, 0.5);
      }
    }
  }

  function meleeStep(e, dt, d, ux, uz) {
    const st = e.st, reach = e.atkRange + e.r + T.heroR * 0.6;
    if (e.state === 'windup') {
      e.stT += dt; st.windup = clamp(e.stT / e.wind, 0, 1);
      if (e.stT >= e.wind) { e.state = 'strike'; e.stT = 0; e.tele = null; strike(e); }
      return;
    }
    if (e.state === 'strike') {
      e.stT += dt; st.attack = clamp(e.stT / 0.42, 0, 1);
      if (e.stT < 0.12 && e.kind !== 'slam') moveE(e, Math.sin(e.face) * 3 * dt, Math.cos(e.face) * 3 * dt);
      if (e.stT >= 0.42) { e.state = 'chase'; e.cd = e.atkCd * frand(0.85, 1.25); }
      return;
    }
    const want = e.token ? reach * 0.75 : 4.3 + e.r;
    if (d > want) {
      const c = chaseDir(e, d, ux, uz);
      stepToward(e, c.x, c.z, e.speed * (e.token ? 1 : 0.7), dt);
    } else if (!e.token && d < want - 1.4) {
      stepToward(e, -ux, -uz, e.speed * 0.35, dt, false);
      e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt);
    } else e.face = dampAngle(e.face, Math.atan2(ux, uz), 7, dt);
    if (e.token && d <= reach && e.cd <= 0) startWindup(e, ux, uz, reach);
  }
  function startWindup(e, ux, uz, reach) {
    e.state = 'windup'; e.stT = 0; e.face = Math.atan2(ux, uz); STATS.windup++;
    e.wind = e.windup;
    if (e.kind === 'slam') {
      e.slamR = (e.def.slamR || 2.2) * (e.elite ? 1.25 : 1);
      e.sx = e.x + Math.sin(e.face) * e.r * 0.9; e.sz = e.z + Math.cos(e.face) * e.r * 0.9;
      e.tele = fx('telegraph', e.sx, e.sz, e.slamR, e.wind, '#ff4a3a');
      if (e.type === 'tellal') sfx('bell', { x: e.x, z: e.z, vol: 0.55, pitch: frand(1.0, 1.15) });   // (the bell on his hat dings as he raises the mallets)
    } else if (e.kind === 'ranged') {
      e.wind = Math.max(0.6, e.windup);
    } else {
      e.tele = fx('telegraphCone', e.x, e.z, e.face, 1.5, reach + 0.25, e.wind, '#ff5a44');
    }
  }
  function strike(e) {
    STATS.strike++;
    if (e.kind === 'slam' && e.type === 'tellal') {   // (Round 5) BOOM on the big davul: a golden ring and music notes, no rocks
      fx('ring', e.sx, e.sz, { r0: 0.4, r1: e.slamR + 0.6, dur: 0.45, color: '#ffd23f', width: 0.5, k: 1.1, edge: 0.3 });
      burst('notes', e.x, e.height * 0.6, e.z, { count: 12 }); burst('dust', e.sx, 0.1, e.sz, { count: 14, scale: 1.2, color: '#efdcb2' });
      shake(0.26 * clamp(1.4 - e.dist / 14, 0.2, 1));
      sfx('drum', { x: e.x, z: e.z });
      if (Math.hypot(P.pos.x - e.sx, P.pos.z - e.sz) < e.slamR + T.heroR * 0.5) hurtPlayer(e.dmg, e.sx, e.sz, 1.2);
      return;
    }
    if (e.kind === 'slam') {
      const cheese = e.type === 'peynir';   // the cheese wedge thumps down: a creamy ring, biscuit/cheese crumbs, no rocks
      fx('ring', e.sx, e.sz, { r0: 0.4, r1: e.slamR + 0.6, dur: 0.45, color: cheese ? '#fff0b8' : '#ffd9a0', width: 0.5 });
      burst('dust', e.sx, 0.1, e.sz, cheese ? { count: 14, scale: 1.2, color: '#f3e4c2' } : { count: 26, scale: 1.4 });
      if (cheese) { burst('crumbs', e.sx, 0.2, e.sz, { count: 14 }); burst('debris', e.sx, 0.2, e.sz, { color: '#ffd24a', count: 6 }); }
      else burst('debris', e.sx, 0.2, e.sz, { color: '#b9a58a', count: 10 });
      shake((cheese ? 0.22 : 0.3) * clamp(1.4 - e.dist / 14, 0.2, 1));
      sfx('slam', cheese ? { x: e.x, z: e.z, pitch: 1.25, vol: 0.8 } : { x: e.x, z: e.z });
      if (cheese) sfx('squish', { x: e.x, z: e.z, vol: 0.6, pitch: 0.8 });
      if (Math.hypot(P.pos.x - e.sx, P.pos.z - e.sz) < e.slamR + T.heroR * 0.5) hurtPlayer(e.dmg, e.sx, e.sz, 1.2);
      return;
    }
    sfx(e.type === 'yarasa' || e.type === 'jole' ? 'bite' : 'whoosh', { x: e.x, z: e.z, vol: 0.7, pitch: frand(0.9, 1.15) });
    const dx = P.pos.x - e.x, dz = P.pos.z - e.z, d = Math.hypot(dx, dz);
    const reach = e.atkRange + e.r + T.heroR * 0.6;
    if (d <= reach + 0.35 && Math.abs(angDiff(e.face, Math.atan2(dx, dz))) < 0.9) { STATS.strikeHit++; hurtPlayer(e.dmg, e.x, e.z, 0.4); }
  }

  function rangedStep(e, dt, d, ux, uz) {
    const st = e.st;
    if (e.state === 'windup') {
      e.stT += dt; st.windup = clamp(e.stT / e.wind, 0, 1);
      e.face = dampAngle(e.face, Math.atan2(ux, uz), 5, dt);
      chargeFx(e, st.windup, dt);
      if (e.stT >= e.wind) { shoot(e); e.state = 'recover'; e.stT = 0; }
      return;
    }
    if (e.state === 'recover') {
      e.stT += dt; st.attack = clamp(e.stT / 0.4, 0, 1);
      if (e.stT >= 0.4) { e.state = 'chase'; e.cd = e.atkCd * frand(0.9, 1.3); }
      return;
    }
    e.strafeT -= dt;
    if (e.strafeT <= 0) { e.strafeT = frand(1.5, 3); e.strafe = -e.strafe; }
    // backs off only while it can see Feza: behind a wall it comes round (chaseDir) — Feza waits for it there (a kid bot
    // and a ghost stood 3.4 m apart on the two sides of a castle wall for 600 s)
    if (d < 3.4 && e.losOk) { stepToward(e, -ux, -uz, e.speed * 0.65, dt, false); e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt); }
    else if (d > e.atkRange * 0.9 || !e.losOk) { const c = chaseDir(e, d, ux, uz); stepToward(e, c.x, c.z, e.speed, dt); }
    else if (e.token) { stepToward(e, -uz * e.strafe, ux * e.strafe, e.speed * 0.3, dt, false); e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt); }
    else e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt);
    if (e.token && d < e.atkRange && e.losOk && e.cd <= 0) startWindup(e, ux, uz, e.atkRange);
  }

  // ── Köstebek ("whack-a-mole"): far from Feza it digs in (st.burrow 0→1), travels underground (a moving dirt mound; no
  // sword, skill, star or tap can reach it), stops ~1.4 m from him, the mound trembles over a dirt-circle telegraph, it pops
  // up (st.burrow 1→0 = the end of the wind-up) and bonks everything in the circle. Then it stays up ≥ 3 s to be whacked. ──
  const BUR = { sink: 0.4, rise: 0.35, near: 1.4, far: 3.2, upMin: 3, maxUnder: 7, teleR: 1.55 };
  const BUR_ST = { sink: 1, under: 1, rise: 1 };
  const DIRT = '#9a7550';
  const BREATH_COL = ['#a32e37', '#5b426e', '#735164', '#af5550', '#826467'];
  const SLIMY = { salyangoz: 1 };
  const hidden = e => e.bur > 0.85;   // (almost) fully underground
  const riseT = e => e.def.burrowOut || BUR.rise;   // EDEF burrowIn / burrowOut: dig-in and pop-up times
  function burrowStep(e, dt, d, ux, uz) {
    const st = e.st;
    if (e.state === 'sink') {
      e.stT += dt; e.bur = Math.min(1, e.stT / (e.def.burrowIn || BUR.sink));
      digFx(e, dt, 0.07);
      if (e.bur >= 1) { e.state = 'under'; e.stT = 0; }
      return;
    }
    if (e.state === 'under') {
      e.stT += dt; e.bur = 1;
      const c = chaseDir(e, d, ux, uz);
      stepToward(e, c.x, c.z, e.speed, dt);
      digFx(e, dt, 0.1);
      if ((d <= BUR.near + 0.15 && circleFree(e.x, e.z, e.r * 0.7)) || e.stT > BUR.maxUnder) startRise(e);
      return;
    }
    if (e.state === 'rise') {
      e.stT += dt;
      st.windup = clamp(e.stT / e.wind, 0, 1);
      const rt = riseT(e), r0 = e.wind - rt;   // the mound trembles in place first, then it pops up during the last 0.35 s
      e.bur = e.stT < r0 ? 1 : Math.max(0, 1 - (e.stT - r0) / rt);
      e.face = dampAngle(e.face, Math.atan2(ux, uz), 8, dt);
      if (e.stT < r0) digFx(e, dt, 0.06);
      if (e.stT >= e.wind) { e.bur = 0; e.tele = null; bonk(e); e.state = 'strike'; e.stT = 0; e.upT = 0; }
      return;
    }
    if (e.state === 'windup' || e.state === 'strike') { meleeStep(e, dt, d, ux, uz); return; }
    e.upT += dt;
    if (e.token && e.upT >= BUR.upMin && d > BUR.far) { startSink(e); return; }
    const sp = e.speed; e.speed = sp * 0.6;   // a waddling mole on the surface: easy to catch and whack
    meleeStep(e, dt, d, ux, uz);
    e.speed = sp;
  }
  function startSink(e) {
    remove(e.tele); e.tele = null;
    e.state = 'sink'; e.stT = 0; e.walking = false;
    burst('dirt', e.x, 0.05, e.z, { count: 8, color: DIRT });
    sfx('dig', { x: e.x, z: e.z, vol: 0.8 });
  }
  function startRise(e) {
    e.state = 'rise'; e.stT = 0; STATS.windup++;
    e.wind = Math.max(T.windMin, e.windup, riseT(e) + 0.25);
    e.bonkR = BUR.teleR * (e.elite ? 1.25 : 1); e.bx = e.x; e.bz = e.z;   // the bonk lands exactly where the circle was drawn
    e.tele = fx('telegraph', e.x, e.z, e.bonkR, e.wind, '#ff7a3a');
    sfx('dig', { x: e.x, z: e.z, pitch: 1.2 });
  }
  function bonk(e) {
    STATS.strike++;
    const R = e.bonkR || BUR.teleR, bx = e.bx !== undefined ? e.bx : e.x, bz = e.bz !== undefined ? e.bz : e.z;
    burst('dirt', e.x, 0.08, e.z, { count: 12, scale: 1.1, color: DIRT });
    burst('dust', e.x, 0.08, e.z, { count: 6, color: '#c9a77e' });
    fx('ring', bx, bz, { r0: 0.3, r1: R + 0.2, dur: 0.35, color: '#ffd9a0', width: 0.3 });
    sfx('emerge', { x: e.x, z: e.z }); sfx('slam', { x: e.x, z: e.z, vol: 0.35, pitch: 1.7 });
    shake(0.07 * clamp(1.4 - e.dist / 12, 0.2, 1));
    if (Math.hypot(P.pos.x - bx, P.pos.z - bz) < R + T.heroR * 0.5) { STATS.strikeHit++; hurtPlayer(e.dmg, bx, bz, 0.6); }
  }
  function digFx(e, dt, every) {   // dust puffs over the moving mound + a soft 'dig' now and then
    e.digT -= dt;
    if (e.digT <= 0 && e.dist < 30) {
      e.digT = every;
      const bk = { x: -Math.sin(e.face) * 0.5, z: -Math.cos(e.face) * 0.5 };
      burst('dust', e.x + frand(-0.25, 0.25), 0.02, e.z + frand(-0.25, 0.25), { count: 2, color: '#b58f68', dir: bk });
      if (Math.random() < 0.35) burst('dirt', e.x, 0.05, e.z, { count: 2, color: DIRT, dir: bk });
    }
    e.digS -= dt;
    if (e.digS <= 0) { e.digS = 0.45; sfx('dig', { x: e.x, z: e.z, vol: 0.45, pitch: frand(0.9, 1.15) }); }
  }
  // ── Minik Lav Kaplumbağası: from a few metres away it tucks into its shell (the wind-up; a lane telegraph shows where it
  // will go), then rolls forward along the lane and bumps whoever is in the way. Afterwards it sits dizzy for a moment:
  // the time to whack it. ──
  const ROLL = { start: 2.6, speed: 7, len: 4.2, w: 1.25, rec: 0.9 };
  function laneLen(x, z, dx, dz, maxL, r, rm) {   // free length of a straight lane (walls, solids, the boss arena's edge)
    let l = 0;
    for (let s = 0.25; s <= maxL; s += 0.25) {
      const qx = x + dx * s, qz = z + dz * s;
      if (!circleFree(qx, qz, r) || (rm && !inRoom(rm, qx, qz, r * 0.6))) break;
      l = s;
    }
    return l;
  }
  function telegraphLine(x0, z0, x1, z1, w, dur, col) {
    if (typeof FX !== 'undefined' && FX && FX.telegraphLine) return fx('telegraphLine', x0, z0, x1, z1, w, dur, col);
    const len = Math.hypot(x1 - x0, z1 - z0);   // older FX: a narrow cone along the lane
    return fx('telegraphCone', x0, z0, Math.atan2(x1 - x0, z1 - z0), clamp(2 * Math.atan2(w * 0.5, Math.max(1, len)) * 1.6, 0.25, 1.2), len, dur, col);
  }
  const glider = e => e.type === 'kaymak' || e.kind === 'glide' || e.kind === 'slide';
  function rollStep(e, dt, d, ux, uz) {
    const st = e.st, gl = glider(e), R = e.def.roll || (gl ? GLIDE : {});
    if (e.state === 'windup') {
      e.stT += dt; st.windup = clamp(e.stT / e.wind, 0, 1);
      if (e.stT < e.wind * 0.3) { e.face = dampAngle(e.face, Math.atan2(e.rdx, e.rdz), 10, dt); }
      if (e.stT >= e.wind) {
        e.state = 'roll'; e.stT = 0; e.tele = null; e.rollHit = false; e.rollD = 0; STATS.strike++;
        if (gl && DUSTY[e.type]) {   // (Round 5) the street sweeper swishes off along the lane behind his broom
          sfx('broom', { x: e.x, z: e.z, vol: 0.8, pitch: e.elite ? 0.9 : frand(1.0, 1.15) });
          sfx('whoosh', { x: e.x, z: e.z, vol: 0.45, pitch: frand(1.2, 1.4) });
          burst('dust', e.x, 0.08, e.z, { count: 8, color: DUSTY[e.type], dir: { x: -e.rdx, z: -e.rdz } });
        } else if (gl) {   // the cream swirl leans in and whooshes off along the lane
          sfx('whoosh', { x: e.x, z: e.z, vol: 0.7, pitch: e.elite ? 1.0 : frand(1.25, 1.45) });
          sfx('squish', { x: e.x, z: e.z, vol: 0.5, pitch: frand(1.1, 1.3) });
          burst('milk', e.x, 0.1, e.z, { count: 6, scale: 0.7, dir: { x: -e.rdx, z: -e.rdz } });
        } else {
          sfx('roll', { x: e.x, z: e.z, vol: 0.8, pitch: e.elite ? 0.85 : frand(1, 1.15) });
          burst('dust', e.x, 0.05, e.z, { count: 6, dir: { x: -e.rdx, z: -e.rdz } });
        }
      }
      return;
    }
    if (e.state === 'roll') {
      e.stT += dt;
      const sp = (R.speed || ROLL.speed) * (e.elite ? 1.1 : 1), step = sp * dt, ox = e.x, oz = e.z;
      moveE(e, e.rdx * step, e.rdz * step);
      const moved = Math.hypot(e.x - ox, e.z - oz);
      e.rollD += moved; e.face = Math.atan2(e.rdx, e.rdz);
      st.attack = clamp(e.rollD / Math.max(0.5, e.rollLen), 0, 1); st.move = 1;
      if (gl) creamTrail(e, dt, 0.05);   // a glossy streak of cream behind the glide
      else {
        e.trailT -= dt;
        if (e.trailT <= 0 && e.dist < 26) {
          e.trailT = 0.07;
          burst('dust', e.x - e.rdx * e.r, 0.04, e.z - e.rdz * e.r, { count: 2, color: '#c9a07a', dir: { x: -e.rdx, z: -e.rdz } });
          if (Math.random() < 0.5) burst('embers', e.x, 0.3, e.z, { count: 2 });
        }
      }
      if (!e.rollHit && !P.dead && Math.hypot(P.pos.x - e.x, P.pos.z - e.z) < e.r + T.heroR + 0.15) {
        e.rollHit = true; STATS.strikeHit++;
        hurtPlayer(e.dmg, e.x - e.rdx, e.z - e.rdz, 0.9);
        sfx('bounce', { x: e.x, z: e.z, vol: 0.7 });
      }
      const bumped = moved < step * 0.3;
      if (e.rollD >= e.rollLen || bumped || e.stT > 1.4) {
        e.state = 'recover'; e.stT = 0;
        if (bumped) { sfx('bounce', { x: e.x, z: e.z, vol: 0.6, pitch: 0.8 }); burst('dust', e.x, 0.1, e.z, { count: 8 }); }
      }
      return;
    }
    if (e.state === 'recover') {   // dizzy for a moment (pops out of its shell)
      e.stT += dt; st.attack = 1;
      if (e.stT >= (R.rec || ROLL.rec)) { e.state = 'chase'; e.cd = e.atkCd * frand(0.85, 1.2); }
      return;
    }
    const start = (R.start || ROLL.start) + e.r;
    const want = e.token ? start * 0.8 : 4.3 + e.r;
    if (d > want) { const c = chaseDir(e, d, ux, uz); stepToward(e, c.x, c.z, e.speed * (e.token ? 1 : 0.7), dt); }
    else if (!e.token && d < want - 1.4) { stepToward(e, -ux, -uz, e.speed * 0.35, dt, false); e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt); }
    else e.face = dampAngle(e.face, Math.atan2(ux, uz), 7, dt);
    if (e.token && d <= start && e.cd <= 0 && e.losOk) startRoll(e, ux, uz, d);
  }
  function startRoll(e, ux, uz, d) {
    const gl = glider(e), R = e.def.roll || (gl ? GLIDE : {});
    e.state = 'windup'; e.stT = 0; STATS.windup++;
    e.wind = Math.max(T.windMin, e.windup);
    e.rdx = ux; e.rdz = uz;
    const want = Math.max((R.len || ROLL.len) * (e.elite ? 1.25 : 1), d + 1.2);
    e.rollLen = Math.max(1, laneLen(e.x, e.z, ux, uz, want, e.r * 0.9, null));
    const w = (R.w || ROLL.w) * (e.elite ? 1.35 : 1);
    e.tele = telegraphLine(e.x, e.z, e.x + ux * (e.rollLen + e.r), e.z + uz * (e.rollLen + e.r), w, e.wind, '#ff6a3a');
    sfx('whoosh', { x: e.x, z: e.z, vol: 0.4, pitch: gl ? 1.0 : 0.7 });
  }
  // Kesik Kaymak: a short glossy streak of cream lies behind it (FX's slime drops tinted cream, ~2 s) + a creamy drip now and then.
  // (Round 5: the street sweeper leaves little straw-dust puffs instead: DUSTY / EDEF trail 'dust')
  function creamTrail(e, dt, every) {
    e.trailT -= dt;
    if (e.trailT > 0 || e.dist > 30) return;
    e.trailT = every;
    const fx0 = Math.sin(e.face), fz0 = Math.cos(e.face), bx = e.x - fx0 * e.r * 0.7, bz = e.z - fz0 * e.r * 0.7;
    if (DUSTY[e.type] || e.def.trail === 'dust') {
      burst('dust', bx, 0.04, bz, { count: every < 0.1 ? 3 : 2, color: DUSTY[e.type] || '#ecdcb4', dir: { x: -fx0, z: -fz0 }, scale: e.elite ? 1.3 : 0.9 });
      return;
    }
    burst('slime', bx, 0.03, bz, { color: CREAMY[e.type] || '#ffdf9e', dir: { x: fx0, z: fz0 }, scale: e.elite ? 1.4 : 1 });
    if (Math.random() < (every < 0.1 ? 0.25 : 0.12)) burst(typeof e.def.trail === 'string' ? e.def.trail : 'milk', bx, 0.12, bz, { count: 3, scale: 0.5 });   // (EDEF trail: a creamy drip)
  }
  // ── Ekşi Yoğurt: from a couple of metres away it crouches (the wind-up; a circle shows where it will land), hops at Feza
  // in an arc (GAME lifts it: e.y; st.attack / st.air = the flight 0..1) and bumps whoever is in the circle, then sits
  // squashed for a moment — the time to whack it. ──
  const HOPE = { start: 2.6, air: 0.5, h: 0.55, R: 1.05, rec: 0.6 };   // (h: GAME's arc; 05's bump adds its own ~0.26 m forward hop on st.attack)
  function hopStep(e, dt, d, ux, uz) {
    const st = e.st, H0 = e.def.hop || {};
    if (e.state === 'windup') {
      e.stT += dt; st.windup = clamp(e.stT / e.wind, 0, 1);
      e.face = dampAngle(e.face, Math.atan2(e.hx1 - e.x, e.hz1 - e.z), 10, dt);
      if (e.stT >= e.wind) {
        e.state = 'hop'; e.stT = 0; e.hx0 = e.x; e.hz0 = e.z; STATS.strike++;
        sfx('bounce', { x: e.x, z: e.z, vol: 0.55, pitch: e.elite ? 1.0 : frand(1.3, 1.5) });
      }
      return;
    }
    if (e.state === 'hop') {
      e.stT += dt;
      const air = H0.air || HOPE.air, k = clamp(e.stT / air, 0, 1), s = smooth01(k);
      _tp.x = e.x; _tp.z = e.z;   // carried across (walls stop it: LEVEL.move slides along them)
      moveXZ(_tp, lerp(e.hx0, e.hx1, s) - e.x, lerp(e.hz0, e.hz1, s) - e.z, e.r * 0.9); e.x = _tp.x; e.z = _tp.z;
      e.y = 4 * (H0.h || HOPE.h) * (e.elite ? 1.2 : 1) * k * (1 - k);
      st.attack = k; st.air = k; st.move = 0;   // (no walk-hop on top of the big hop)
      if (k >= 1) { e.y = 0; st.air = 0; hopLand(e); e.state = 'recover'; e.stT = 0; }
      return;
    }
    if (e.state === 'recover') {   // squashed after the bump
      e.stT += dt; st.attack = 1;
      if (e.stT >= (H0.rec || HOPE.rec)) { e.state = 'chase'; e.cd = e.atkCd * frand(0.85, 1.2); }
      return;
    }
    const start = (H0.start || HOPE.start) + e.r;
    const want = e.token ? start * 0.8 : 4.3 + e.r;
    if (d > want) { const c = chaseDir(e, d, ux, uz); stepToward(e, c.x, c.z, e.speed * (e.token ? 1 : 0.7), dt); }
    else if (!e.token && d < want - 1.4) { stepToward(e, -ux, -uz, e.speed * 0.35, dt, false); e.face = dampAngle(e.face, Math.atan2(ux, uz), 6, dt); }
    else e.face = dampAngle(e.face, Math.atan2(ux, uz), 7, dt);
    if (e.token && d <= start && e.cd <= 0 && e.losOk) startHop(e, ux, uz, d);
  }
  function startHop(e, ux, uz, d) {
    const H0 = e.def.hop || {};
    e.state = 'windup'; e.stT = 0; STATS.windup++;
    e.wind = Math.max(T.windMin, e.windup);
    e.face = Math.atan2(ux, uz);
    // the circle is centred on Feza; it lands just short of his centre (its body next to his), never further than it can hop
    e.hopR = (H0.R || HOPE.R) * (e.elite ? 1.3 : 1);
    e.hcx = P.pos.x; e.hcz = P.pos.z;
    const go = Math.max(0, Math.min(d - (e.r + T.heroR) * 0.55, (H0.start || HOPE.start) + e.r + 0.6));
    e.hx1 = e.x + ux * go; e.hz1 = e.z + uz * go;
    e.tele = fx('telegraph', e.hcx, e.hcz, e.hopR, e.wind + (H0.air || HOPE.air), '#ff5a3a');
    sfx('squish', { x: e.x, z: e.z, vol: 0.45, pitch: frand(1.2, 1.4) });
  }
  function hopLand(e) {
    remove(e.tele); e.tele = null;
    const R = e.hopR || HOPE.R;
    burst('milk', e.x, 0.1, e.z, { count: e.elite ? 12 : 8, scale: e.elite ? 1.2 : 0.9 });
    fx('ring', e.hcx, e.hcz, { r0: 0.2, r1: R + 0.25, dur: 0.32, color: '#fff3dc', width: 0.28 });
    sfx('splat', { x: e.x, z: e.z, vol: 0.55, pitch: frand(1.3, 1.5) });
    shake(0.06 * clamp(1.4 - e.dist / 12, 0.2, 1));
    if (!P.dead && Math.hypot(P.pos.x - e.hcx, P.pos.z - e.hcz) < R + T.heroR * 0.5) { STATS.strikeHit++; hurtPlayer(e.dmg, e.x, e.z, 0.55); }
  }
  // Salyangoz: a short sparkly slime trail behind it while it moves.
  function slimeTrail(e, dt) {
    e.trailT -= dt;
    if (e.trailT > 0) return;
    e.trailT = 0.2;
    const bx = e.x - Math.sin(e.face) * e.r * 0.8, bz = e.z - Math.cos(e.face) * e.r * 0.8;
    burst('slime', bx, 0.03, bz, { dir: { x: Math.sin(e.face), z: Math.cos(e.face) }, scale: e.elite ? 1.4 : 1 });
  }
  const shape = (name, dflt) => (typeof FX !== 'undefined' && FX && FX.SHAPES && FX.SHAPES[name] !== undefined ? FX.SHAPES[name] : dflt);
  const PT = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0.4, size: 0.3, size1: 0, color: '#fff', color1: '#fff', alpha: 1, shape: 0, add: true, grav: 0, drag: 0, spin: 0, fade: 1, pop: 0, soft: 0 };
  function emitP(x, y, z, vx, vy, vz, life, size, size1, color, color1, shape, grav = 0, drag = 0) {
    if (typeof FX === 'undefined' || !FX.emit) return;
    PT.x = x; PT.y = y; PT.z = z; PT.vx = vx; PT.vy = vy; PT.vz = vz; PT.life = life; PT.size = size; PT.size1 = size1;
    PT.color = color; PT.color1 = color1; PT.shape = shape; PT.grav = grav; PT.drag = drag; PT.spin = frand(-3, 3);
    fx('emit', PT);
  }
  function muzzle(e) {
    let v = null;
    if (e.m.muzzle) { try { v = e.m.muzzle(); } catch (err) { warnOnce('muzzle', err); } }
    if (v) return _v.set(v.x, v.y, v.z);
    return _v.set(e.x + Math.sin(e.face) * e.r, e.y + e.height * 0.6, e.z + Math.cos(e.face) * e.r);
  }
  // Charging glow that gathers at the mouth: tells the kid "a shot is coming".
  function chargeFx(e, k, dt) {
    e.sparkT -= dt;
    if (e.sparkT > 0) return;
    e.sparkT = 0.03;
    const m = muzzle(e), kind = (e.def.shot && e.def.shot.kind) || SHOT_KIND[e.type] || 'spore', col = SHOT_COL[kind] || '#fff';
    const a = frand(0, TAU), r = 0.8 * (1 - k * 0.45);
    emitP(m.x + Math.sin(a) * r, m.y + frand(-0.35, 0.35), m.z + Math.cos(a) * r, -Math.sin(a) * r * 3, 0, -Math.cos(a) * r * 3, 0.26, 0.2, 0.06, col, '#ffffff', 2);
    emitP(m.x, m.y, m.z, 0, 0, 0, 0.07, 0.35 + k * 0.75, 0.3 + k * 0.7, col, '#ffffff', 0);   // growing orb at the mouth
  }
  function shoot(e) {
    STATS.shots++;
    const m = muzzle(e), sh = e.def.shot || {};
    const kind = sh.kind || SHOT_KIND[e.type] || 'spore', speed = Math.min(sh.speed || 5.5, 7);
    const dx = P.pos.x - m.x, dz = P.pos.z - m.z, a0 = Math.atan2(dx, dz);
    // an elite fire chick flicks three embers in a little fan
    const fan = e.elite && e.type === 'ateskusu' ? [-0.26, 0, 0.26] : [0];
    for (const da of fan) {
      spawnProjectile({ x: m.x, y: m.y, z: m.z, vx: Math.sin(a0 + da) * speed, vz: Math.cos(a0 + da) * speed, r: sh.r || 0.32, dmg: e.dmg, owner: 'enemy', kind,
        life: (e.atkRange + 4) / speed, color: SHOT_COL[kind] });
    }
    if (kind === 'bubble') { sfx('bubble', { x: e.x, z: e.z, vol: 0.8 }); burst('sparkle', m.x, m.y, m.z, { color: '#d8f4ff', count: 5 }); }
    else if (kind === 'fizz') { sfx('fizz', { x: e.x, z: e.z, vol: 0.7, pitch: frand(1.0, 1.25) }); sfx('bubble', { x: e.x, z: e.z, vol: 0.45, pitch: 1.3 }); burst('fizz', m.x, m.y, m.z, { count: 6, scale: 0.7 }); }
    else if (kind === 'ember') { sfx('chirp', { x: e.x, z: e.z, vol: 0.7, pitch: frand(0.95, 1.2) }); burst('embers', m.x, m.y, m.z, { count: 5 }); }
    else if (kind === 'simit') { sfx('whoosh', { x: e.x, z: e.z, vol: 0.6, pitch: frand(1.3, 1.5) }); burst('crumbs', m.x, m.y, m.z, { count: 4 }); }   // (a few sesame crumbs off the tray)
    else sfx(kind === 'fire' ? 'fireball' : 'spit', { x: e.x, z: e.z, vol: 0.7 });
  }

  function separate() {
    const n = enemies.length;
    for (let i = 0; i < n; i++) {
      const a = enemies[i];
      if (!a.m.root.visible || hidden(a)) continue;
      for (let j = i + 1; j < n; j++) {
        const b = enemies[j];
        const rr = (a.r + b.r) * 0.92, dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || !b.m.root.visible || hidden(b)) continue;
        const d = Math.sqrt(d2) || 0.01, push = (rr - d), ux = d2 > 1e-6 ? dx / d : 1, uz = d2 > 1e-6 ? dz / d : 0;
        const wa = a.boss ? 0 : b.boss ? 1 : 0.5, wb = 1 - wa;
        if (wa) moveE(a, -ux * push * wa, -uz * push * wa);
        if (wb) moveE(b, ux * push * wb, uz * push * wb);
      }
      if (P.dead || (a.boss && a.st.air > 0.15 && a.st.air < 0.85)) continue;   // (a hopping jelly king flies over Feza)
      const rr = a.r + T.heroR, dx = a.x - P.pos.x, dz = a.z - P.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        // Right on top of each other (a mole popping up on him): no direction to push along → Feza goes toward the camera
        // (+z, he stays in view), the creature the other way.
        let d = Math.sqrt(d2), ux = 0, uz = -1;
        if (d > 1e-3) { ux = dx / d; uz = dz / d; } else d = 0;
        const push = rr - d;
        if (a.boss || a.r >= 0.95) {
          // The big ones push Feza aside. If he cannot go (arena rim, lava edge, trees, a corner), the big one steps back
          // instead — never a boss sitting inside Feza for the whole fight.
          const ox = P.pos.x, oz = P.pos.z;
          moveXZ(P.pos, -ux * push, -uz * push, T.heroR);
          const got = -(P.pos.x - ox) * ux - (P.pos.z - oz) * uz;   // how far he really got away from it
          const left = push - Math.max(0, got);
          if (left > 0.01) pushBig(a, ux * left, uz * left);
        } else moveE(a, ux * push, uz * push);
      }
    }
  }
  function pushBig(e, dx, dz) {   // a boss stays in its room while it is pushed
    const ox = e.x, oz = e.z;
    moveE(e, dx, dz);
    if (e.boss) {
      const rm = bossRoom();
      if (rm && !inRoom(rm, e.x, e.z, e.r * 0.5) && dist2(e.x, e.z, rm.x, rm.z) > dist2(ox, oz, rm.x, rm.z)) { e.x = ox; e.z = oz; }
    }
  }

  // ── Bosses (Round 3: one at the end of every zone; the dragon is the last) ──
  // The boss room (the zone's last room, kind 'boss'): the fight starts when Feza walks in, and the boss never leaves it.
  function bossRoom() {
    if (!L) return null;
    if (L._bossRoom === undefined) L._bossRoom = (L.rooms && L.rooms.find(r => r.kind === 'boss')) || null;
    return L._bossRoom;
  }
  function inRoom(rm, x, z, pad) {
    if (!rm) return true;
    if (rm.hw && rm.hh) return Math.abs(x - rm.x) < rm.hw - pad && Math.abs(z - rm.z) < rm.hh - pad;
    if (rm.r) { const q = Math.max(0.5, rm.r - pad); return dist2(x, z, rm.x, rm.z) < q * q; }
    return true;
  }
  function inBossArena(b) {
    const rm = bossRoom();
    if (rm && ((rm.hw && rm.hh) || rm.r)) return inRoom(rm, P.pos.x, P.pos.z, 0.5);
    return b.dist < 14;
  }
  // A free spot for the boss near (x, z): at most maxD from where it stands, inside its room, room for its body.
  function bossSpot(b, x, z, maxD) {
    let dx = x - b.x, dz = z - b.z; const d = Math.hypot(dx, dz);
    if (d > maxD) { dx *= maxD / d; dz *= maxD / d; }
    const rm = bossRoom(), rr = b.r * 0.75;
    for (let k = 0; k <= 8; k++) {
      const f = 1 - k / 8, qx = b.x + dx * f, qz = b.z + dz * f;
      if (circleFree(qx, qz, rr) && inRoom(rm, qx, qz, rr)) return { x: qx, z: qz };
    }
    return { x: b.x, z: b.z };
  }
  // Where a hop lands / a mole pops up: next to Feza on the side it comes from, its body just short of his (b.r + heroR +
  // 0.3 from his centre) — he still stands inside the danger circle, but never inside the boss.
  function approachSpot(b, maxD) {
    let dx = b.x - P.pos.x, dz = b.z - P.pos.z;
    const d = Math.hypot(dx, dz), gap = b.r + T.heroR + 0.3;
    if (d > 1e-3) { dx /= d; dz /= d; } else { dx = 0; dz = -1; }   // (right under him: behind him, Feza stays in view)
    return bossSpot(b, P.pos.x + dx * gap, P.pos.z + dz * gap, maxD);
  }
  function bossWalk(b, dx, dz, speed, dt) {   // like stepToward, but the boss stays in its room
    const ox = b.x, oz = b.z, rm = bossRoom();
    stepToward(b, dx, dz, speed, dt);
    if (rm && !inRoom(rm, b.x, b.z, b.r * 0.5) && dist2(b.x, b.z, rm.x, rm.z) > dist2(ox, oz, rm.x, rm.z)) { b.x = ox; b.z = oz; b.st.move = 0; }
    return Math.hypot(b.x - ox, b.z - oz);
  }
  function bossAggro(b) {
    if (b.aggro || b.dead) return;
    b.aggro = true; startEncounter(b); remove(b.tele); b.tele = null;
    bossPhase(b, 'roar', 1.6);
    if (!b.sized) {   // a weak sword must not mean a 2-minute fight: the boss's hp follows Feza's damage (once, when it starts)
      b.sized = true;
      setEnemyHp(b, bossHpNow(b.type, false), bossHpNow(b.type, true));
    }
    if (!b.intro) { b.intro = true; const k = b.kit.lines.giris; if (k && hasLine(k)) say(k, 3); }
    // Falling asleep in the fight must not mean the long walk back: wake up at the arena entrance — just OUTSIDE it, so
    // he wakes up, sees the boss and walks in when he is ready (inside, it would roar at him while the wake-up flash is up).
    if (GAME.state === 'play' && !P.dead) {
      const door = arenaDoor();
      if (door) P.checkpoint = door;
      else if (circleFree(P.pos.x, P.pos.z, T.heroR)) P.checkpoint = { x: P.pos.x, z: P.pos.z };
    }
    emit('boss', { on: true, name: b.name, type: b.type, final: !!b.final, hp: b.hp, maxHp: b.maxHp });
    aud('music', 'boss');
  }
  // A free spot on the main route ~1.5 m outside the boss arena (walking the route back from its end), else one straight
  // out from the arena centre past Feza. null: no arena.
  function arenaDoor() {
    const rm = bossRoom();
    if (!rm || !((rm.hw && rm.hh) || rm.r)) return null;
    const out = (x, z) => !inRoom(rm, x, z, -1.5) && isFloor(x, z) && circleFree(x, z, T.heroR);
    const path = L && L.path;
    if (path && path.length > 1) {
      let seenIn = false;   // (the route's end might poke past the arena: only a spot on the way in counts)
      for (let i = path.length - 1; i > 0; i--) {
        const a = path[i], b = path[i - 1], l = Math.hypot(b.x - a.x, b.z - a.z);
        for (let s = 0; s <= l; s += 0.5) {
          const k = l > 0 ? s / l : 0, x = lerp(a.x, b.x, k), z = lerp(a.z, b.z, k);
          if (inRoom(rm, x, z, 0)) seenIn = true;
          else if (seenIn && out(x, z)) return { x, z };
        }
      }
    }
    let dx = P.pos.x - rm.x, dz = P.pos.z - rm.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    for (let s = 0.5; s <= 8; s += 0.5) { const x = P.pos.x + dx * s, z = P.pos.z + dz * s; if (out(x, z)) return { x, z }; }
    return null;
  }
  function bossCalm(b) {
    clearEncounter(b);
    b.aggro = false; remove(b.tele); b.tele = null; bossPhase(b, 'idle', 1); b.wait = 1;
    b.st.crownOff = 0; b.st.aggro = false;   // (Round 6: the king's crown is back on; a mole peeking pops out in bossHome)
    emit('boss', { on: false, type: b.type });
    const Z = zdef(); if (Z.music) aud('music', Z.music);
  }
  // Calm (Feza napped or ran off): land / pop out of the ground, then waddle back to its spot facing the entrance.
  function bossHome(b, dt) {
    if (b.y > 0) b.y = Math.max(0, b.y - dt * 6);
    b.st.air = 0;
    if (b.bur > 0) {
      b.bur = Math.max(0, b.bur - dt / 0.5);
      if (b.bur <= 0) { burst('dirt', b.x, 0.05, b.z, { count: 10, color: DIRT }); sfx('emerge', { x: b.x, z: b.z, vol: 0.6 }); }
      return;
    }
    const dx = b.homeX - b.x, dz = b.homeZ - b.z, d = Math.hypot(dx, dz);
    if (d > 0.6) bossWalk(b, dx / d, dz / d, b.speed * 0.6, dt);
    else b.face = dampAngle(b.face, 0, 2, dt);
  }
  // Feza napped in a boss fight: the boss gets tired too, so a careless kid naps once or twice, not four times.
  // It never cheers up from this (hp stays above 10 %).
  function bossTired(b) {
    const N = DIFF.bossNap;
    b.naps = (b.naps || 0) + 1;
    b.dmg = Math.max((b.dmg0 || b.dmg) * N.dmgMin, b.dmg * N.dmg);
    b.hp = Math.round(Math.max(Math.min(b.hp, b.maxHp * 0.1), b.hp - b.maxHp * N.hp));
    emit('bossHp', { frac: Math.max(0, b.hp / b.maxHp) });
    later(1.2, () => {   // a big yawn (in front of its face: the head itself is above the frame when Feza is close)
      if (!b.dead) burst('zzz', b.x + Math.sin(b.face) * b.r * 0.9, b.height * 0.45, b.z + Math.cos(b.face) * b.r * 0.9, {});
    });
  }
  // (chT: the knight's charge clock, see chargeK; phM / phTM: the phase + phaseT the model shows when GAME's own phase has
  // another name — Round 6: the mole's hide-and-seek dive shows as 'burrow')
  function bossPhase(b, ph, D) { b.ph = ph; b.stT = 0; b.did = 0; b.phD = D || 1; b.chT = null; b.phM = null; b.phTM = -1; }
  function bossStep(b, dt, d, ux, uz, canTarget) {
    const st = b.st;
    if (!b.aggro) {
      if (canTarget && inBossArena(b)) bossAggro(b);
      else { st.aggro = false; bossHome(b, dt); st.phase = st.move > 0.05 ? 'move' : 'idle'; st.phaseT = 0; return; }
    }
    st.aggro = true;   // (Round 6: 05's pre-aggro idle loop and the first roar's double take read it)
    // Feza gone (napping, or ran far off out of the room): the boss calms down and waits (its hp stays as it is)
    // (kit.roam: the knight gallops to the far rim — "far off" is counted from the arena's middle, not from him)
    const rm = b.kit.roam && bossRoom(), away = rm ? Math.hypot(P.pos.x - rm.x, P.pos.z - rm.z) : d;
    if (!canTarget || away > 34 || (!b.final && away > 22 && !inBossArena(b))) { bossCalm(b); return; }
    const busy = encounterStep(b, dt);
    if (b.dead) return;   // (Round 6: the dragon's big friendship heart can cheer it up)
    if (busy) {   // (a raid move that rides around poses the model itself: the knight's Berserker Charge)
      const mv = b.encounter && b.encounter.move;
      if (!(mv && mv.anim)) { st.phase = 'idle'; st.phaseT = 0; st.move = 0; }
      return;
    }
    b.stT += dt;
    (BOSS_AI[b.type] || dragonStep)(b, dt, d, ux, uz);
    st.phase = b.phM || (b.ph === 'idle' && st.move > 0.05 ? 'move' : b.ph);
    st.phaseT = b.phTM >= 0 ? b.phTM : b.chT && b.ph === 'charge' ? chargeK(b) : clamp(b.stT / (b.phD || 1), 0, 1);
  }

  // Little raid-inspired surprises. One cancellable state owns every marker, egg and playmate; no delayed callbacks
  // survive a nap, a retreat, a happy boss or a zone change. Pausing freezes this state with the rest of the simulation.
  const sq = x => x * x;
  const ENCOUNTER = { eggs: 7, whelps: 4, eggEvery: 12, touch: 0.9 };
  function eggPool() {
    if (R.eggPool) return R.eggPool;
    const shell = new THREE.IcosahedronGeometry(1, 1), dot = new THREE.BoxGeometry(1, 1, 1);
    const nest = new THREE.TorusGeometry(0.48, 0.075, 6, 24);
    const cream = new THREE.MeshStandardMaterial({ color: '#3b3336', roughness: 0.78 });
    const spots = new THREE.MeshStandardMaterial({ color: '#b86343', emissive: '#652b23', emissiveIntensity: 0.35, roughness: 0.6 });
    const straw = new THREE.MeshStandardMaterial({ color: '#655548', roughness: 0.9 });
    R.eggPool = [];
    for (let i = 0; i < ENCOUNTER.eggs; i++) {
      const root = new THREE.Group(); root.name = 'dragonEgg';
      const body = new THREE.Mesh(shell, cream); body.position.y = 0.58; body.scale.set(0.43, 0.59, 0.43); body.castShadow = true; root.add(body);
      const rim = new THREE.Mesh(nest, straw); rim.rotation.x = Math.PI / 2; rim.position.y = 0.08; root.add(rim);
      const dots = new THREE.InstancedMesh(dot, spots, 7), pose = new THREE.Object3D();
      for (let j = 0; j < 7; j++) { const a = j * 2.4, y = 0.28 + (j % 3) * 0.23, r = 0.43 * Math.sqrt(1 - sq((y - 0.58) / 0.59));
        pose.position.set(Math.sin(a) * r, y, Math.cos(a) * r); pose.scale.set(0.035, 0.22, 0.03); pose.rotation.set(0, a, j%2 ? 0.35 : -0.35); pose.updateMatrix(); dots.setMatrixAt(j, pose.matrix); }
      dots.instanceMatrix.needsUpdate = true; root.add(dots);
      R.eggPool.push({ root, used: false });
    }
    return R.eggPool;
  }
  function startEncounter(b) {
    if (b.encounter) return;
    b.encounter = { eggs: [], eggT: ENCOUNTER.eggEvery, serial: 0, timer: 6, move: null, splits: 0, nextNew: true, sancak: null, bonus: null };
    if (b.type === 'ejderha') { layEggs(b, 3); ftext(b.x, 1.7, b.z, 'Yumurtalara dikkat!', 'word'); }
  }
  // cheer: the boss itself just cheered up — its playmates stay so bossDown can cheer them up with everyone else
  // (and the ones already cheering finish their happy goodbye); otherwise (nap, calm, zone change) they just go.
  function clearEncounter(b, cheer) {
    const q = b && b.encounter;
    if (q) {
      for (const egg of q.eggs) { removeObj(egg.pool.root); egg.pool.used = false; }
      clearBanners(q, cheer);
      clearDreamBonus(q);
      clearBonus(b, q, cheer);
      clearRaidMove(q); b.encounter = null;
    }
    if (cheer) return;
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].arenaChild === b) {
      const e = enemies[i]; if (C.targetE === e) C.targetE = null; e.dead = true; dropEnemy(e); enemies.splice(i, 1);
    }
    for (let i = dying.length - 1; i >= 0; i--) if (dying[i].arenaChild === b) { dropEnemy(dying[i]); dying.splice(i, 1); }
  }
  function clearRaidMove(q) {
    if (!q.move) return;
    for (const h of q.move.marks) remove(h);
    for (const o of q.move.meshes) { removeObj(o); if (o.userData.raidPool) o.userData.raidUsed = false; }
    q.move = null;
  }
  function layEggs(b, n) {   // → how many eggs appeared
    const q = b.encounter, rm = bossRoom();
    if (!q || !rm) return 0;
    const rx = (rm.hw || rm.r || 10) * 0.72, rz = (rm.hh || rm.r || 10) * 0.72;
    let laid = 0;
    for (let k = 0; k < n && q.eggs.length < ENCOUNTER.eggs; k++) {
      let spot = null;
      for (let j = 0; j < 30; j++) {
        const a = (++q.serial * 2.39996), x = rm.x + Math.sin(a) * rx, z = rm.z + Math.cos(a) * rz;
        if (inRoom(rm, x, z, 1.1) && circleFree(x, z, 0.65) && dist2(x, z, P.pos.x, P.pos.z) > 4 &&
          dist2(x, z, b.x, b.z) > sq(b.r + 0.9) && !q.eggs.some(e => dist2(e.x, e.z, x, z) < 2.8)) { spot = { x, z }; break; }
      }
      if (!spot) break;
      const pool = eggPool().find(e => !e.used); if (!pool) break;
      pool.used = true; pool.root.position.set(spot.x, 0, spot.z); pool.root.rotation.set(0, q.serial, 0); scene.add(pool.root);
      q.eggs.push({ ...spot, pool, t: 0 }); burst('sparkle', spot.x, 0.7, spot.z, { color: '#e1b1ff', count: 7 }); laid++;
    }
    return laid;
  }
  function hatchEgg(b, q, i) {
    if (enemies.filter(e => e.arenaChild === b && e.whelp && !e.dead).length >= ENCOUNTER.whelps) return;
    const egg = q.eggs[i]; q.eggs.splice(i, 1); egg.pool.used = false; removeObj(egg.pool.root);
    burst('sparkle', egg.x, 0.5, egg.z, { color: '#f0d9ff', count: 16 }); sfx('pop', { x: egg.x, z: egg.z, pitch: 1.4 });
    const e = makeEnemy({ type: 'ejderyavru', whelp: true, x: egg.x, z: egg.z, pack: 'bossadds' });
    e.arenaChild = b; setAggro(e, false); e.cd = 1.3;
  }
  function raidDot(m, x, z, r, delay, color, start = 0) {
    if (!circleFree(x, z, 0.35) || !inRoom(bossRoom(), x, z, 0.6)) return;
    m.dots.push({ x, z, r, at: delay, hit: false, start, color, shown: start === 0 });
    if (!start) m.marks.push(fx('telegraph', x, z, r, delay, color));
  }
  // These short encounters borrow readable shapes from raid fights, with generous warnings and no unavoidable damage.
  const RAID_NEW = { kraljole: 'jellyspin', kefirdev: 'spout', kostebekusta: 'shatter', lavkaplumbaga: 'flamestrike', sovalye: 'berserkercharge', ejderha: 'eyeblast' };
  function raidMesh(m, shape, color) {
    if (!R.raidShapes) R.raidShapes = { ball: new THREE.SphereGeometry(1, 12, 8), crystal: new THREE.ConeGeometry(1, 1, 6),
      rod: new THREE.CylinderGeometry(1, 1, 1, 10), ring: new THREE.TorusGeometry(1, 0.055, 6, 40), strip: new THREE.BoxGeometry(1, 1, 1) };
    if (!R.raidMeshPool) R.raidMeshPool = {};
    const key = shape + color, pool = R.raidMeshPool[key] || (R.raidMeshPool[key] = []);
    let o = pool.find(q => !q.userData.raidUsed);
    if (!o) {
      const material = pool.length ? pool[0].material : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.45, transparent: shape === 'strip', opacity: shape === 'strip' ? 0.42 : 1, depthWrite: shape !== 'strip' });
      o = new THREE.Mesh(R.raidShapes[shape], material); o.name = 'raidTbc'; o.userData.raidPool = true; pool.push(o);
    }
    o.userData.raidUsed = true; o.visible = false; o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    scene.add(o); m.meshes.push(o); return o;
  }
  const RAID_UP = new THREE.Vector3(0, 1, 0), RAID_DIR = new THREE.Vector3(), RAID_EYE = new THREE.Vector3();
  function raidBeam(o, x0, y0, z0, x1, y1, z1, radius) {
    RAID_DIR.set(x1 - x0, y1 - y0, z1 - z0); const length = RAID_DIR.length();
    o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.scale.set(radius, length, radius);
    if (length > 0.001) o.quaternion.setFromUnitVectors(RAID_UP, RAID_DIR.multiplyScalar(1 / length)); o.visible = true;
  }
  function raidLineDistance(x, z, x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, k = clamp(((x - x0) * dx + (z - z0) * dz) / Math.max(0.001, dx * dx + dz * dz), 0, 1);
    return Math.hypot(x - x0 - dx * k, z - z0 - dz * k);
  }
  function startNewRaid(b, m) {
    const rm = bossRoom(); m.warn = 2; m.hits = 0; m.lastHit = -99; m.dur = 5.6;
    if (m.kind === 'jellyspin') {
      const end = bossSpot(b, P.pos.x, P.pos.z, 5);
      m.x0 = b.x; m.z0 = b.z; m.x1 = end.x; m.z1 = end.z; m.radius = b.r + 0.75; m.dur = 5;
      m.marks.push(fx('telegraphLine', m.x0, m.z0, m.x1, m.z1, m.radius * 2, m.warn, '#ae7564'));
      m.ring = raidMesh(m, 'ring', '#99766c'); m.ring.rotation.x = Math.PI / 2;
      m.balls = []; for (let i = 0; i < 3; i++) m.balls.push(raidMesh(m, 'ball', '#858563'));
      ftext(b.x, b.height + 0.4, b.z, 'Ölüm Çemberi!', 'word');
    } else if (m.kind === 'spout') {
      m.angle = Math.atan2(P.pos.x - b.x, P.pos.z - b.z) - Math.PI / 3; m.sweep = Math.PI * 2 / 3; m.range = 9; m.dur = 6;
      m.marks.push(fx('telegraphCone', b.x, b.z, m.angle + m.sweep / 2, m.sweep + 0.24, m.range, m.warn, '#a5a06b'));
      m.beam = raidMesh(m, 'rod', '#a6ad78'); m.balls = []; for (let i = 0; i < 7; i++) m.balls.push(raidMesh(m, 'ball', i % 2 ? '#c0b793' : '#929a61'));
      ftext(b.x, b.height + 0.4, b.z, 'Veba akıntısı!', 'word');
    } else if (m.kind === 'shatter') {
      m.dur = 3; m.crystals = [];
      const a0 = Math.atan2(P.pos.x - rm.x, P.pos.z - rm.z);
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * TAU / 3, x = rm.x + Math.sin(a) * 4.2, z = rm.z + Math.cos(a) * 4.2;
        raidDot(m, x, z, 2.4, m.warn, '#9f9490');
        if (m.dots.length <= i) continue;
        const o = raidMesh(m, 'crystal', '#a8988a'); o.position.set(x, 0.7, z); o.scale.set(0.42, 1.3, 0.42); o.visible = true; m.crystals.push(o);
      }
      ftext(b.x, b.height + 0.4, b.z, 'Mezarlar yarılıyor!', 'word');
    } else if (m.kind === 'flamestrike') {
      m.x = P.pos.x; m.z = P.pos.z; m.radius = 2.4; m.dur = 4.4;
      m.marks.push(fx('telegraph', m.x, m.z, m.radius, m.warn, '#ffb15f'));
      m.ring = raidMesh(m, 'ring', '#ffc465'); m.ring.rotation.x = Math.PI / 2; m.ring.position.set(m.x, 0.12, m.z); m.ring.scale.setScalar(m.radius);
      m.balls = []; for (let i = 0; i < 6; i++) m.balls.push(raidMesh(m, 'ball', '#ffbd69'));
      ftext(b.x, b.height + 0.4, b.z, 'Kül Çemberi!', 'word');
    } else if (m.kind === 'eyeblast') {
      const a = Math.atan2(P.pos.x - b.x, P.pos.z - b.z), dx = Math.cos(a), dz = -Math.sin(a);
      const from = bossSpot(b, P.pos.x - dx * 3.4, P.pos.z - dz * 3.4, 18), to = bossSpot(b, P.pos.x + dx * 3.4, P.pos.z + dz * 3.4, 18);
      m.x0 = from.x; m.z0 = from.z; m.x1 = to.x; m.z1 = to.z; m.radius = 0.95; m.dur = 6.4;
      m.marks.push(fx('telegraphLine', m.x0, m.z0, m.x1, m.z1, m.radius * 2, m.warn, '#b1978f'));
      m.beams = [raidMesh(m, 'rod', '#bcaba0'), raidMesh(m, 'rod', '#a8827c')]; m.trail = raidMesh(m, 'strip', '#967977');
      m.trailDots = []; for (let i = 0; i < 7; i++) m.trailDots.push(raidMesh(m, 'crystal', i % 2 ? '#c0aea1' : '#967977'));
      ftext(b.x, b.height + 0.4, b.z, 'Lanetli izden uzaklaş!', 'word');
    } else if (m.kind === 'berserkercharge') {
      // (Round 5) Attumen's Berserker Charge for one small hero: two gallops across the arena that cross in its middle — the
      // first lane runs through Feza's spot, the second (turned BERSERK.angle) starts near where the first ends and shows
      // while the first runs. Both are fixed when they appear and fill for ≥ m.warn s; each pass bumps him at most once.
      const rr = b.r * 0.85, c0 = rm ? { x: rm.x, z: rm.z } : { x: b.homeX, z: b.homeZ };
      const c = circleFree(c0.x, c0.z, rr) ? c0 : { x: b.homeX, z: b.homeZ };
      const a1 = Math.hypot(P.pos.x - c.x, P.pos.z - c.z) > 1 ? Math.atan2(P.pos.x - c.x, P.pos.z - c.z) : b.face;
      const chord = a => { const dx = Math.sin(a), dz = Math.cos(a), l1 = laneLen(c.x, c.z, dx, dz, 30, rr, rm), l2 = laneLen(c.x, c.z, -dx, -dz, 30, rr, rm);
        return [{ x: c.x + dx * l1, z: c.z + dz * l1 }, { x: c.x - dx * l2, z: c.z - dz * l2 }]; };
      const e1 = chord(a1), n1 = dist2(b.x, b.z, e1[0].x, e1[0].z) <= dist2(b.x, b.z, e1[1].x, e1[1].z) ? 0 : 1;
      const p1 = { x0: e1[n1].x, z0: e1[n1].z, x1: e1[1 - n1].x, z1: e1[1 - n1].z };
      let p2 = null, bd = 1e9;
      for (const sg of [1, -1]) {
        const e2 = chord(a1 + sg * BERSERK.angle);
        for (let k = 0; k < 2; k++) { const d2 = dist2(p1.x1, p1.z1, e2[k].x, e2[k].z); if (d2 < bd) { bd = d2; p2 = { x0: e2[k].x, z0: e2[k].z, x1: e2[1 - k].x, z1: e2[1 - k].z }; } }
      }
      const len = p => Math.hypot(p.x1 - p.x0, p.z1 - p.z0), run = b.def.chargeSpeed || BERSERK.run;
      const g1 = Math.max(m.warn, berserkRide(Math.hypot(p1.x0 - b.x, p1.z0 - b.z)) + BERSERK.turn), r1 = len(p1) / run, ride = g1 + r1 + BERSERK.skid;
      const g2 = Math.max(g1 + m.warn, ride + berserkRide(Math.hypot(p2.x0 - p1.x1, p2.z0 - p1.z1)) + BERSERK.turn), r2 = len(p2) / run;
      m.passes = [p1, p2]; m.plan = { g1, r1, ride, g2, r2 }; m.hitPass = [false, false]; m.lane2 = false; m.anim = true;
      m.dur = g2 + r2 + BERSERK.skid + 0.3;
      m.x0 = p1.x0; m.z0 = p1.z0; m.x1 = p1.x1; m.z1 = p1.z1; m.radius = b.r;
      m.marks.push(berserkLane(b, p1, g1));
      ftext(b.x, b.height + 0.4, b.z, 'Kenara kaç!', 'word');
      sfx('neigh', { x: b.x, z: b.z, vol: 0.9 });
    }
  }
  const BERSERK = { ride: 9, run: 9, turn: 0.75, skid: 0.4, angle: 1.05, k: 0.45,   // m/s, m/s, s pawing before a pass, s, rad between the lanes, dmg share
    walk: 2.2, walkD: 2, stop: 0.3 };   // (a way to a lane start shorter than walkD m: at a walk; longer: a gallop at `ride`, then a stop s skid)
  // Round 5 QA: riding to a lane start at 8 m/s in the trot pose slid the horse across the arena (the model's trot fits
  // ~2.4 m/s, no hoof ever planted): a longer way is a real gallop (the charge pose held mid-gallop; its cadence fits 9 m/s:
  // by a hoof-height trace its hooves plant on the way about as often as in the passes, the trot pose at 8 m/s never) that
  // ends in a short skid; a short step (< walkD) is a walk
  const berserkRide = d => d < BERSERK.walkD ? d / BERSERK.walk : d / BERSERK.ride + BERSERK.stop;
  // The knight's lanes (his charge + both Berserker passes) are as wide as his bump: it reaches Feza's middle within
  // b.r + T.heroR + 0.2 of his, so a Feza standing wholly outside the painted lane is safe (Round 5 QA: b.r × 2 was 0.4 m narrower)
  const laneW = b => b.r * 2 + 0.4;
  function berserkLane(b, p, dur) {   // the lane shows where the horse's front will stop, as the charge's does
    const l = Math.hypot(p.x1 - p.x0, p.z1 - p.z0) || 1, e = b.r * 0.5;
    return telegraphLine(p.x0, p.z0, p.x1 + (p.x1 - p.x0) / l * e, p.z1 + (p.z1 - p.z0) / l * e, laneW(b), Math.max(0.05, dur), '#ff9a4a');
  }
  function berserkStep(b, m, dt) {   // it poses the model itself (m.anim: 'move' for a short walk, 'charge' pawing / galloping / skidding)
    const t = m.t, pl = m.plan, st = b.st, ps = m.passes;
    if (!m.lane2 && t >= pl.g1) { m.lane2 = true; m.marks.push(berserkLane(b, ps[1], pl.g2 - t)); }
    const end0 = pl.g1 + pl.r1, end1 = pl.g2 + pl.r2;
    const pass = t >= pl.g1 && t < end0 ? 0 : t >= pl.g2 && t < end1 ? 1 : -1;
    if (pass >= 0) {   // a gallop along the fixed lane
      const p = ps[pass], k = (t - (pass ? pl.g2 : pl.g1)) / (pass ? pl.r2 : pl.r1);
      b.x = lerp(p.x0, p.x1, k); b.z = lerp(p.z0, p.z1, k); b.face = Math.atan2(p.x1 - p.x0, p.z1 - p.z0);
      st.phase = 'charge'; st.phaseT = SOV.paw + (SOV.run - SOV.paw) * k; st.move = 1;
      if (!m.galloping) { m.galloping = true; sfx('neigh', { x: b.x, z: b.z, pitch: 1.1 }); shake(0.1); }
      gallopFx(b, dt);
      const gx = P.pos.x - b.x, gz = P.pos.z - b.z;
      if (!m.hitPass[pass] && m.hits < 2 && !P.dead && Math.hypot(gx, gz) < b.r + T.heroR + 0.2) {   // one modest bump per pass, out of the lane
        m.hitPass[pass] = true; m.hits++; m.lastHit = m.t;
        const sx = Math.sin(b.face), sz = Math.cos(b.face), side = gx * -sz + gz * sx >= 0 ? 1 : -1;
        hurtPlayer(b.dmg * BERSERK.k * (hard ? HC.special : 1), P.pos.x + sz * side, P.pos.z - sx * side, 1.4);
        sfx('bounce', { x: b.x, z: b.z, pitch: 0.8 });
      }
      return;
    }
    const go = t < pl.g1 ? ps[0] : t >= pl.ride && t < pl.g2 ? ps[1] : null;
    if (go) {   // galloping (or, a short way, walking) to where the next lane starts, then pawing there facing along it
      const gStart = go === ps[0] ? pl.g1 : pl.g2, dx = go.x0 - b.x, dz = go.z0 - b.z, dd = Math.hypot(dx, dz);
      m.galloping = false;
      if (m.goTo !== go) { m.goTo = go; m.goFast = dd >= BERSERK.walkD; m.stopT = -1; }
      if (dd > 0.05) {
        const s = Math.min(dd, (m.goFast ? BERSERK.ride : BERSERK.walk) * dt); b.x += dx / dd * s; b.z += dz / dd * s;
        b.face = dampAngle(b.face, Math.atan2(dx, dz), 8, dt);
        if (m.goFast) { st.phase = 'charge'; st.phaseT = 0.6; st.move = 1; gallopFx(b, dt); }
        else { st.phase = 'move'; st.phaseT = 0; st.move = 1; }
      } else if (m.goFast && (m.stopT < 0 || t - m.stopT < BERSERK.stop)) {   // there: a short skid, turning along the lane
        if (m.stopT < 0) { m.stopT = t; hoofFx(b, -0.8, 10, 1.2); sfx('gallop', { x: b.x, z: b.z, pitch: 0.7, vol: 0.8 }); }
        b.face = dampAngle(b.face, Math.atan2(go.x1 - go.x0, go.z1 - go.z0), 8, dt);
        st.phase = 'charge'; st.phaseT = SOV.run + (1 - SOV.run) * clamp((t - m.stopT) / BERSERK.stop, 0, 1); st.move = 0;
      } else {
        b.face = dampAngle(b.face, Math.atan2(go.x1 - go.x0, go.z1 - go.z0), 8, dt);
        const w = clamp(1 - (gStart - t) / BERSERK.turn, 0, 1);
        st.phase = w > 0 ? 'charge' : 'idle'; st.phaseT = SOV.paw * w; st.move = 0;
        if (w > 0 && (b.pawT = (b.pawT || 0) - dt) <= 0) { b.pawT = 0.32; hoofFx(b, -0.6, 5); }
      }
      return;
    }
    const e = t < pl.ride ? end0 : end1;   // skidding to a stop after a pass
    if (m.galloping) { m.galloping = false; hoofFx(b, -0.8, 12, 1.3); sfx('gallop', { x: b.x, z: b.z, pitch: 0.7 }); }
    st.phase = 'charge'; st.phaseT = SOV.run + (1 - SOV.run) * clamp((t - e) / BERSERK.skid, 0, 1); st.move = 0;
  }
  function newRaidStep(b, m, dt) {
    if (m.kind === 'berserkercharge') { berserkStep(b, m, dt); return; }
    if (m.kind === 'shatter') {
      for (const o of m.crystals) { o.rotation.y += dt * 1.4; o.visible = m.t < m.warn; }
      return;
    }
    if (m.t < m.warn) return;
    const t = m.t - m.warn; let touch = false, k = 0.45;
    if (m.kind === 'jellyspin') {
      const dx = m.x1 - b.x, dz = m.z1 - b.z, d = Math.hypot(dx, dz);
      if (d > 0.1) bossWalk(b, dx / d, dz / d, Math.min(2, d / Math.max(dt, 0.001)), dt);
      b.face += dt * 5.5; m.ring.visible = true; m.ring.position.set(b.x, 0.15, b.z); m.ring.scale.setScalar(m.radius);
      m.balls.forEach((o, i) => { const a = t * 5 + i * TAU / 3; o.visible = true; o.position.set(b.x + Math.sin(a) * m.radius, 0.6, b.z + Math.cos(a) * m.radius); o.scale.setScalar(0.22); });
      touch = dist2(P.pos.x, P.pos.z, b.x, b.z) < sq(m.radius + T.heroR * 0.5);
    } else if (m.kind === 'spout') {
      const a = m.angle + m.sweep * clamp(t / 4, 0, 1), dx = Math.sin(a), dz = Math.cos(a); b.face = a;
      raidBeam(m.beam, b.x, 1.2, b.z, b.x + dx * m.range, 0.55, b.z + dz * m.range, 0.2);
      m.balls.forEach((o, i) => { const f = ((i / 7 + t * 0.35) % 1); o.visible = true; o.position.set(b.x + dx * m.range * f, 1.2 - f * 0.65, b.z + dz * m.range * f); o.scale.setScalar(0.22 + 0.13 * f); });
      touch = raidLineDistance(P.pos.x, P.pos.z, b.x, b.z, b.x + dx * m.range, b.z + dz * m.range) < 0.55 + T.heroR;
    } else if (m.kind === 'flamestrike') {
      if (!m.burst) { m.burst = true; burst('lava', m.x, 0.15, m.z, { count: 18, scale: 1.4 }); }
      m.ring.visible = true;
      m.balls.forEach((o, i) => { const a = i * TAU / 6; o.visible = true; o.position.set(m.x + Math.sin(a) * 1.8, 0.22 + Math.abs(Math.sin(t * 3 + i)) * 0.3, m.z + Math.cos(a) * 1.8); o.scale.set(0.2, 0.34, 0.2); });
      touch = dist2(P.pos.x, P.pos.z, m.x, m.z) < sq(m.radius + T.heroR * 0.5); k = t < 0.3 ? 0.6 : 0.25;
    } else if (m.kind === 'eyeblast') {
      const f = clamp(t / 2.4, 0, 1), x = lerp(m.x0, m.x1, f), z = lerp(m.z0, m.z1, f), a = Math.atan2(x - b.x, z - b.z);
      b.face = a;
      b.m.root.rotation.y = a; b.m.root.updateMatrixWorld(true);
      m.beams.forEach((o, i) => { const side = i ? 0.33 : -0.33, eyes = b.m.B && b.m.B.eyes;
        if (eyes) { RAID_EYE.set(side, 0, 0.12); eyes.localToWorld(RAID_EYE); }
        else RAID_EYE.set(b.x + Math.sin(a) * b.r * 0.6 + Math.cos(a) * side, b.height * 0.86, b.z + Math.cos(a) * b.r * 0.6 - Math.sin(a) * side);
        raidBeam(o, RAID_EYE.x, RAID_EYE.y, RAID_EYE.z, x + Math.cos(a) * side * 0.3, 0.18, z - Math.sin(a) * side * 0.3, 0.065); o.visible = t < 2.4;
      });
      const length = Math.hypot(x - m.x0, z - m.z0); m.trail.visible = true; m.trail.position.set((m.x0 + x) / 2, 0.065, (m.z0 + z) / 2); m.trail.rotation.y = Math.atan2(x - m.x0, z - m.z0); m.trail.scale.set(m.radius * 2, 0.09, Math.max(0.1, length));
      m.trailDots.forEach((o, i) => { const at = (i + 0.3) / 7; o.visible = f >= at; o.position.set(lerp(m.x0, m.x1, at), 0.23, lerp(m.z0, m.z1, at)); o.scale.set(0.15, 0.35 + 0.12 * Math.sin(t * 5 + i), 0.15); o.rotation.y = t + i; });
      touch = raidLineDistance(P.pos.x, P.pos.z, m.x0, m.z0, x, z) < m.radius + T.heroR * 0.5; k = 0.4;
    }
    if (touch && m.hits < 2 && m.t - m.lastHit >= 1.1 && los(b.x, b.z, P.pos.x, P.pos.z)) {
      m.hits++; m.lastHit = m.t; hurtPlayer(b.dmg * k * (hard ? HC.special : 1), b.x, b.z, 0.3);
    }
  }
  function startRaidMove(b, kind) {
    const q = b.encounter, rm = bossRoom(), m = { kind, t: 0, marks: [], meshes: [], dots: [], dur: 3.8 };
    q.move = m; q.timer = 13;
    if (Object.values(RAID_NEW).includes(kind)) { startNewRaid(b, m); return; }
    if (kind === 'split') {
      m.dur = 2.4; q.splits++;
      for (const side of [-1, 1]) { const at = bossSpot(b, b.x + side * 2.3, b.z + 0.8, 3); raidDot(m, at.x, at.z, 1, 1.4, '#a0ef68'); }
      ftext(b.x, b.height + 0.4, b.z, 'Çürükler yükseliyor!', 'word');
    } else if (kind === 'dance') {
      const safe = (q.serial++ % 4), r = 4.2; m.dur = 4.2; m.safes = [];
      for (let wave = 0; wave < 2; wave++) for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, x = rm.x + Math.sin(a) * r, z = rm.z + Math.cos(a) * r;
        if (i === (safe + wave) % 4) m.safes.push({ x, z, at: wave * 1.9, shown: false });
        else raidDot(m, x, z, 2.4, 1.8 + wave * 1.9, '#ffa8cc', wave * 1.9);
      }
      ftext(rm.x, 1.5, rm.z, 'Zehir çemberi!', 'word');
    } else if (kind === 'burrow') {
      const a = Math.atan2(P.pos.x - b.x, P.pos.z - b.z);
      for (let i = 0; i < 4; i++) raidDot(m, b.x + Math.sin(a) * (b.r + 1.5 + i * 1.9), b.z + Math.cos(a) * (b.r + 1.5 + i * 1.9), 1.45, 1.6 + i * 0.45, '#e7b978');
      ftext(b.x, b.height + 0.4, b.z, 'Toprak dalgası!', 'word');
    } else if (kind === 'wave') {
      const rx = Math.min(10, (rm.hw || rm.r || 10) * 0.8), rz = Math.min(9, (rm.hh || rm.r || 10) * 0.75);
      m.x0 = rm.x - rx; m.x1 = rm.x + rx; m.z0 = rm.z - rz; m.z1 = rm.z + rz;
      m.gap = clamp(P.pos.x + (P.pos.x < rm.x ? 2.2 : -2.2), m.x0 + 3, m.x1 - 3); m.halfGap = 2.6; m.dur = 1.8 + (m.z1 - m.z0) / 3.2;
      if (!R.raidWaveGeo) { R.raidWaveGeo = new THREE.BoxGeometry(1, 0.18, 0.65); R.raidWaveMat = new THREE.MeshStandardMaterial({ color: '#ff9c48', emissive: '#ff5c20', emissiveIntensity: 0.7, roughness: 0.6 }); }
      for (const [left, right] of [[m.x0, m.gap - m.halfGap], [m.gap + m.halfGap, m.x1]]) if (right > left) {
        m.marks.push(fx('telegraphLine', (left + right) / 2, m.z0, (left + right) / 2, m.z1, right - left, 1.8, '#ffad78'));
        const o = new THREE.Mesh(R.raidWaveGeo, R.raidWaveMat); o.scale.x = right - left; o.position.set((left + right) / 2, 0.15, m.z0); o.visible = false; scene.add(o); m.meshes.push(o);
      }
      m.marks.push(fx('telegraphLine', m.gap, m.z0, m.gap, m.z1, m.halfGap * 2, m.dur, '#73e7a4'));
      ftext(b.x, b.height + 0.4, b.z, 'Yeşil aralıktan geç!', 'word');
    }
  }
  function raidMoveStep(b, dt) {
    const q = b.encounter, m = q.move; m.t += dt;
    for (const safe of m.safes || []) if (!safe.shown && m.t >= safe.at) { safe.shown = true; m.marks.push(fx('ring', safe.x, safe.z, { r0: 2.1, r1: 2.1, dur: 1.88, color: '#6fec9d', width: 0.18 })); }
    for (const d of m.dots) if (!d.shown && m.t >= d.start) { d.shown = true; m.marks.push(fx('telegraph', d.x, d.z, d.r, Math.max(0.05, d.at - m.t), d.color)); }
    for (const d of m.dots) if (!d.hit && m.t >= d.at) {
      d.hit = true;
      if (m.kind === 'split') {
        if (enemies.filter(e => !e.dead && e.pack === 'bossadds').length < 6) {
          const e = makeEnemy({ type: 'jole', x: d.x, z: d.z, pack: 'bossadds' }); e.arenaChild = b;
          setEnemyHp(e, Math.max(10, Math.round(P.dmg * 1.7)), Math.max(10, Math.round(P.dmg * 1.7 * HC.hp))); e.dmg *= 0.45; e.xp = 0; e.gold = 0; e.m.root.scale.multiplyScalar(0.7); e.r *= 0.7; e.height *= 0.7; setAggro(e, false);
        }
      } else {
        burst(m.kind === 'shatter' ? 'sparkle' : m.kind === 'dance' ? 'milk' : 'dirt', d.x, 0.1, d.z, { count: 14, scale: 1.4 });
        fx('ring', d.x, d.z, { r0: 0.2, r1: d.r, dur: 0.45, color: m.kind === 'dance' ? '#fff0dc' : '#d8ab72', width: 0.25 });
        if (dist2(P.pos.x, P.pos.z, d.x, d.z) < sq(d.r + T.heroR * 0.5) && (m.kind !== 'shatter' || !m.hits)) { if (m.kind === 'shatter') m.hits++; hurtPlayer(b.dmg * 0.5 * (hard ? HC.special : 1), d.x, d.z, 0.5); }
      }
    }
    if (m.kind === 'wave' && m.t >= 1.8) {
      const z = m.z0 + (m.t - 1.8) * 3.2;
      for (const o of m.meshes) { o.visible = true; o.position.z = z; }
      if (!m.hit && Math.abs(P.pos.z - z) < 0.65 && P.pos.x >= m.x0 && P.pos.x <= m.x1 && Math.abs(P.pos.x - m.gap) > m.halfGap - T.heroR * 0.5) {
        m.hit = true; hurtPlayer(b.dmg * 0.65 * (hard ? HC.special : 1), b.x, z - 1, 0.65);
      }
    }
    if (Object.values(RAID_NEW).includes(m.kind)) newRaidStep(b, m, dt);
    if (m.t >= m.dur) { clearRaidMove(q); bossEnd(b, 0.8, 1.2); }
  }
  function encounterStep(b, dt) {
    if (!b.encounter) startEncounter(b);
    const q = b.encounter;
    if (b.type === 'ejderha') {
      q.eggT -= dt;
      if (q.eggT <= 0) { q.eggT += ENCOUNTER.eggEvery; layEggs(b, 1); }
      for (let i = q.eggs.length - 1; i >= 0; i--) {
        const e = q.eggs[i]; e.t += dt; e.pool.root.rotation.z = Math.sin(e.t * 2.3) * 0.035;
        if (dist2(P.pos.x, P.pos.z, e.x, e.z) < sq(ENCOUNTER.touch)) hatchEgg(b, q, i);
      }
    }
    if (b.type === 'sovalye') sancakStep(b, q, dt);   // (Round 5: the tournament banners; all down = it is dizzy, even mid-move)
    if (b.kit.dream) { dreamBonusStep(b, q, dt); return false; }
    bonusStep(b, q, dt);                              // (Round 6: the boss's bonus idea; it may cheer the boss up)
    if (!b.encounter) return false;
    if (q.move) { raidMoveStep(b, dt); return true; }
    if (bonusHold(q)) return false;                   // (the TBC clock waits while a bonus runs; no raid move starts)
    q.timer -= dt;
    if (b.ph !== 'idle') return false;
    if (q.timer <= 0 && q.nextNew) { q.nextNew = false; startRaidMove(b, RAID_NEW[b.type]); return true; }
    const old = { kefirdev: 'dance', kostebekusta: 'burrow', lavkaplumbaga: 'wave' }[b.type];
    if (b.type === 'kraljole' || (!old && b.type !== 'ejderha')) {   // (the knight too: no older timed move, its banners come by hp)
      if (b.type === 'kraljole' && q.splits < 2 && b.hp / b.maxHp < [0.72, 0.38][q.splits]) { q.nextNew = true; startRaidMove(b, 'split'); return true; }
      if (q.timer <= 0) { q.nextNew = true; q.timer = 3; }
    } else if (q.timer <= 0) {
      q.nextNew = true;
      if (b.type === 'ejderha') { layEggs(b, 1); q.timer = 8; return false; }
      startRaidMove(b, old); return true;
    }
    return false;
  }
  // ── Round 5: the knight's arena surprise 'sancak'. At SOV.banners hp three tournament banners (EMODEL.sancak, pooled) pop
  // up around the arena rim with 'sovalye_sancak'. While they stand they are in L.breakObjs (.banner): a tap walks Feza there
  // to hit one; swings, skills and his shots knock them over through hitBreakables / breakObj (no loot). All three down → the
  // knight is dizzy for SOV.dizzy s, whatever he was doing; when he shakes it off they vanish in sparkles. Once per encounter
  // (a nap or a retreat clears them with everything else; back in the fight below 60 % they come again). ──
  function sancakFallback() {   // a plain pole with a royal-blue pennant and a golden sun (05's cute banner replaces it)
    const k = new Kit();
    k.add(G.cyl(1, 1, 12), '#d9c7a6', [0, 0.06, 0], 0, [0.3, 0.12, 0.3]);
    k.add(G.cyl(1, 1, 10), '#c98f52', [0, 1.2, 0], 0, [0.055, 2.4, 0.055]);
    k.add(G.cyl(1, 1, 8), '#c98f52', [0, 2.2, 0], [0, 0, Math.PI / 2], [0.035, 0.95, 0.035]);
    k.add(G.sphere(12), '#ffd23f', [0, 2.46, 0], 0, 0.11);
    k.add(G.box(), '#3f6fe0', [0, 1.7, 0], 0, [0.9, 0.95, 0.04]);
    for (const zz of [-0.03, 0.03]) k.add(G.cyl(1, 1, 16), '#ffd23f', [0, 1.74, zz], [Math.PI / 2, 0, 0], [0.24, 0.015, 0.24]);
    const mat = vcMat({ roughness: 0.55, emissive: '#3a2a00', emissiveIntensity: 0.2 }), mesh = new THREE.Mesh(k.build(), mat);
    mesh.castShadow = true;
    const root = new THREE.Group(), tip = new THREE.Group(); tip.add(mesh); root.add(tip); root.name = 'sancak';
    return { root, fallback: true, anim(dt, st) { tip.rotation.z = -1.5 * smooth01((st && st.fall) || 0); mat.emissiveIntensity = 0.2 + 0.5 * ((st && st.glow) || 0); }, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
  }
  function sancakPool() {
    if (R.sancak) return R.sancak;
    R.sancak = [];
    for (let i = 0; i < 3; i++) {
      let m = null;
      if (typeof EMODEL !== 'undefined' && EMODEL && EMODEL.sancak) { try { m = EMODEL.sancak(); } catch (err) { warnOnce('EMODEL.sancak', err); } }
      if (!m || !m.root) m = sancakFallback();
      R.sancak.push({ m, used: false });
    }
    return R.sancak;
  }
  function plantBanners(b, q) {
    const rm = bossRoom(), S = q.sancak = { state: 'up', list: [] };
    if (!rm) { S.state = 'done'; return; }
    const rx = rm.r ? rm.r - 2.2 : (rm.hw || 10) * 0.78, rz = rm.r ? rm.r - 2.2 : (rm.hh || 10) * 0.78, pool = sancakPool();
    // on the far half of the rim from the camera (a 2.4 m pole on the south side would stand in front of Feza: camera rule),
    // west, north and east — not right in front of the (still shut) gate
    const po = L && L.portalObj, pa = po ? Math.atan2(po.x - rm.x, po.z - rm.z) : Math.PI;
    const base = [Math.PI - 1.25, Math.PI, Math.PI + 1.25].map(a => { const d = angDiff(pa, a); return Math.abs(d) < 0.45 ? pa + (d < 0 ? -0.5 : 0.5) : a; });
    for (let i = 0; i < 3; i++) {
      let spot = null;
      for (let j = 0; j < 14 && !spot; j++) {   // (a tent or a pole in the way: a little to the side, then a little further in)
        const a = base[i] + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.16, f = 1 - Math.floor(j / 6) * 0.12;
        const x = rm.x + Math.sin(a) * rx * f, z = rm.z + Math.cos(a) * rz * f;
        if (isFloor(x, z) && circleFree(x, z, 0.6) && inRoom(rm, x, z, 0.9) && dist2(x, z, b.x, b.z) > sq(b.r + 1.4) && dist2(x, z, P.pos.x, P.pos.z) > 4) spot = { x, z };
      }
      if (!spot) continue;
      const p = pool[i]; p.used = true;
      // side: it falls across the screen toward the arena's middle (east / west spots), the north one either way
      const side = spot.x > rm.x + 1 ? -1 : spot.x < rm.x - 1 ? 1 : (Math.random() < 0.5 ? -1 : 1);
      const s = { x: spot.x, z: spot.z, r: 0.5, kind: 'sancak', banner: true, broken: false, fall: 0, t: -i * 0.18, ph: frand(0, TAU), side, pool: p, break() {} };
      p.m.root.position.set(spot.x, 0, spot.z); p.m.root.rotation.set(0, frand(-0.25, 0.25), 0); p.m.root.visible = false; scene.add(p.m.root);
      S.list.push(s);
      if (L) (L.breakObjs || (L.breakObjs = [])).push(s);
    }
    if (!S.list.length) { S.state = 'done'; return; }
    const k = b.kit.lines.sancak || 'sovalye_sancak';
    if (!b.sancakSaid && hasLine(k)) { b.sancakSaid = true; say(k, 2); }   // (once: after a nap they come back without the line)
    ftext(rm.x, 2.2, rm.z, 'Sancaklara vur!', 'word');
  }
  function knockBanner(s) {   // (breakObj) a swing, a skill or a shot knocks it over: it tips down with a happy sparkle
    if (s.broken) return;
    s.broken = true;
    sfx('pop', { x: s.x, z: s.z, pitch: 1.25 }); sfx('clank', { x: s.x, z: s.z, vol: 0.4, pitch: 1.4 });
    burst('sparkle', s.x, 1.6, s.z, { color: '#ffe27a', count: 14 }); burst('confetti', s.x, 2.0, s.z, { count: 12 });
    if (wordOK()) ftext(s.x, 2.4, s.z, 'Sancak Kırıldı!', 'word');
  }
  function sancakStep(b, q, dt) {
    if (!q.sancak) { if (b.hp / b.maxHp > SOV.banners) return; plantBanners(b, q); }
    const S = q.sancak;
    if (S.state === 'done') return;
    let down = 0;
    S.list.forEach((s, i) => {
      const t0 = s.t; s.t += dt;
      if (t0 <= 0 && s.t > 0) { sfx('bell', { x: s.x, z: s.z, pitch: 1 + 0.12 * i }); burst('sparkle', s.x, 1.6, s.z, { color: '#ffe27a', count: 12 }); }
      // pops up: 05's banner springs out of the ground by itself (st.pop); the plain stand-in grows with a little overshoot
      const r = s.pool.m.root, pop = clamp(s.t / 0.35, 0, 1), x = Math.min(1, Math.max(0, s.t) / 0.3) - 1;
      r.visible = s.t >= 0;
      if (s.pool.m.fallback) r.scale.setScalar(Math.max(0.01, 1 + 2.2 * x * x * x + 1.2 * x * x));
      if (s.broken) {
        down++;
        const f0 = s.fall;
        if (f0 < 1) s.fall = Math.min(1, f0 + dt / SOV.fallT);
        if (f0 < SOV.land && s.fall >= SOV.land) {   // it lands flat (05's banner: at fall 0.72): a puff of dust + a happy sparkle
          // (where its pole lies: it falls toward its side — 05's local ±x, turned by the root's little yaw)
          const a = s.pool.m.root.rotation.y, sd = s.side < 0 ? -1 : 1, lx = s.x + sd * Math.cos(a) * 1.2, lz = s.z - sd * Math.sin(a) * 1.2;
          burst('dust', lx, 0.1, lz, { count: 10, color: '#efdcb2' }); burst('sparkle', lx, 0.4, lz, { color: '#ffe27a', count: 10 });
        }
      }
      try { s.pool.m.anim(dt, { fall: s.fall, glow: s.broken ? 0 : 0.55 + 0.45 * Math.sin(s.t * 3 + s.ph), pop, side: s.side }); } catch (err) { warnOnce('sancak.anim', err); }
    });
    if (S.state === 'up' && down === S.list.length) {   // all three down: the knight's head spins (a raid move or an attack stops)
      S.state = 'dizzy';
      // (his horseshoes still in the air turn into sparkles: dizzy, he does nothing — one thrown just before must not land)
      // (the banners' dizzy keeps its 4 s in Zor too, as in Round 5)
      bonusStun(b, 'dizzy', SOV.dizzy, false);
      ftext(b.x, b.height + 0.5, b.z, 'Savunması Kırıldı!', 'word');
      sfx('neigh', { x: b.x, z: b.z, pitch: 1.35, vol: 0.8 }); sfx('bounce', { x: b.x, z: b.z, pitch: 0.7 });
      burst('star', b.x, b.height + 0.3, b.z, { count: 8, color: '#fff3a0' });
    } else if (S.state === 'dizzy' && b.ph !== 'dizzy') { S.state = 'done'; clearBanners(q, true); }   // he shook it off
  }
  function clearBanners(q, poof) {   // pooled models back, out of L.breakObjs (broken: a tap walking to one gives up)
    const S = q && q.sancak;
    if (!S || !S.list.length) return;
    for (const s of S.list) {
      s.broken = true;
      if (poof) burst('sparkle', s.x, 1, s.z, { color: '#ffe27a', count: 14 });
      const r = s.pool.m.root; removeObj(r); r.scale.setScalar(1); r.visible = true;
      try { s.pool.m.anim(0, { fall: 0, glow: 0, pop: 1 }); } catch (err) { warnOnce('sancak.anim', err); }
      s.pool.used = false;
      const i = L && L.breakObjs ? L.breakObjs.indexOf(s) : -1;
      if (i >= 0) L.breakObjs.splice(i, 1);
    }
    S.list.length = 0;
  }

  // ── Shared boss moves ──
  // Idle between attacks: face Feza, walk closer when far, count down. true = choose the next attack now.
  function bossIdle(b, dt, d, ux, uz, keep) {
    b.face = dampAngle(b.face, Math.atan2(ux, uz), 3.5, dt);
    if (d > keep) bossWalk(b, ux, uz, b.speed, dt);
    b.wait -= dt / (roundCooldown() * (hard ? HC.cd : 1));
    return b.wait <= 0;
  }
  function pickPhase(b, opts) {   // opts [[phase, weight], …]; never the same attack three times in a row
    let sum = 0; for (const o of opts) sum += o[1];
    let r = Math.random() * sum, ph = opts[0][0];
    for (const o of opts) { r -= o[1]; if (r <= 0) { ph = o[0]; break; } }
    if (ph === b.last && ph === b.last2) { const alt = opts.filter(o => o[0] !== ph && o[1] > 0); if (alt.length) ph = fpick(alt)[0]; }
    b.last2 = b.last; b.last = ph;
    return ph;
  }
  function bossEnd(b, w0, w1) {
    remove(b.tele); b.tele = null; b.y = 0; bossPhase(b, 'idle', 1); b.wait = frand(w0, w1);
    if (b.summon) b.wait = Math.min(b.wait, 0.35);   // an hp mark was crossed: the little ones come right after this move
  }
  function nextWave(b) { if (b.sq) b.sq.shift(); b.summon = b.sq && b.sq.length ? b.sq[0] : 0; }
  function bossCall(b, pitch, vol) {   // its roar: a cute growl, or (kit.roarSfx) the kefir giant's happy "fizz!" with a bubbly puff
    const s = b.kit.roarSfx || 'roar';
    sfx(s, { x: b.x, z: b.z, pitch, vol });
    if (s === 'fizz') { sfx('cork', { x: b.x, z: b.z, vol: 0.7 * vol, pitch: 1.1 }); const m = muzzle(b); burst('fizz', m.x, m.y + 0.2, m.z, { count: 18, scale: 1.5 }); }
    else if (s === 'neigh') { sfx('clank', { x: b.x, z: b.z, vol: 0.5 * vol, pitch: 1.1 }); hoofFx(b, -0.5, 10, 1.2); }   // (Round 5) the knight's horse whinnies and paws
  }
  function bossRoar(b, D) {   // the intro roar (a cute growl + a soft ring)
    if (b.did === 0 && b.stT > 0.35) {
      b.did = 1; bossCall(b, b.kit.roar || 1, 1); shake(0.25);
      fx('ring', b.x, b.z, { r0: 1, r1: 7, dur: 0.6, color: b.kit.col || '#ad5947', width: 0.5 });
      if (b.kit.word) ftext(b.x, b.height + 0.5, b.z, b.kit.word, 'word');   // (the knight's grumpy "Teslim ol!")
    }
    if (b.stT >= D) bossEnd(b, 0.5, 0.9);
  }
  const _hornV = new THREE.Vector3();
  function bossSummon(b, D) {   // "come, little ones!": a happy roar, then they pop up around it
    if (b.did === 0 && b.stT > 0.25) { b.did = 1; bossCall(b, (b.kit.roar || 1) * 1.12, 0.8); fx('ring', b.x, b.z, { r0: 1, r1: 5, dur: 0.5, color: b.kit.col, width: 0.4 }); }
    if (b.did === 1 && b.stT > (b.kit.summonAt || 0.47) * D) {
      b.did = 2;
      if (b.kit.horn) {   // (the knight's little toy trumpet: the notes stream out of its bell — 05's marker('horn') — the way he faces)
        let h = null;
        if (b.m.marker) { try { h = b.m.marker('horn', _hornV); } catch (err) { warnOnce('marker horn', err); } }
        const m = h && isFinite(h.x) ? h : muzzle(b), up = m === h ? 0 : 0.3;
        sfx('horn', { x: b.x, z: b.z }); burst('notes', m.x, m.y + up, m.z, { count: 12, dir: { x: Math.sin(b.face), z: Math.cos(b.face) } });
      }
      summonAdds(b, b.kit.add, b.summon || 3); nextWave(b);
    }
    if (b.stT >= D) bossEnd(b, 0.7, 1.1);
  }
  function bossShot(b, kind, spread, speed, dmgK, r, life = 5) {   // one slow straight shot at Feza (the saber can swat it)
    const m = muzzle(b), a = Math.atan2(P.pos.x - m.x, P.pos.z - m.z) + spread;
    spawnProjectile({ x: m.x, y: Math.max(0.9, m.y), z: m.z, vx: Math.sin(a) * speed, vz: Math.cos(a) * speed, r, dmg: b.dmg * dmgK,
      owner: 'enemy', bossShot: true, kind, life, color: SHOT_COL[kind] });
    return m;
  }
  // ro: extra FX ring options (a cream ring on the pale dairy floor needs a low k / edge: FX's default bloomed into a white halo)
  function bossRing(b, x, z, R, dmgK, kb, col, ro) {   // a landing / stomp / pop-up shockwave: hurts Feza inside R
    fx('ring', x, z, Object.assign({ r0: 0.6, r1: R + 0.6, dur: 0.5, color: col || '#ffd9a0', width: 0.6 }, ro));
    const pd = Math.hypot(P.pos.x - x, P.pos.z - z);
    shake(0.35 * clamp(1.4 - pd / 16, 0.3, 1));
    if (pd < R + T.heroR * 0.5) hurtPlayer(b.dmg * dmgK, x, z, kb);
  }
  function summonAdds(b, type, n) {
    n = Math.min(n, Math.max(0, 6 - enemies.filter(e => !e.dead && !e.boss && e.pack === 'bossadds').length));
    let made = 0;
    const rm = bossRoom(), at = [];
    // in front of it first (toward Feza), fanning out; farther rings if a wall or a pillar is in the way
    for (const rr of [b.r + 2.0, b.r + 3.2, b.r + 1.4, b.r + 4.4]) for (let k = 0; k < 12 && made < n; k++) {
      const a = b.face + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.52 + (made ? 0 : 0.26), x = b.x + Math.sin(a) * rr, z = b.z + Math.cos(a) * rr;
      if (!isFloor(x, z) || !circleFree(x, z, 0.55) || (rm && !inRoom(rm, x, z, 0.6))) continue;
      if (at.some(q => dist2(q[0], q[1], x, z) < 1.4 * 1.4) || dist2(x, z, P.pos.x, P.pos.z) < 1.6 * 1.6) continue;
      at.push([x, z]);
      const e = makeEnemy({ type, x, z, elite: false, pack: 'bossadds', face: a });
      e.xp *= 0.5; e.gold *= 0.5; setAggro(e, false); made++;
      if (b.kit.addHp) setEnemyHp(e, e.difficultyHp[0] * b.kit.addHp, e.difficultyHp[1] * b.kit.addHp);
      if (b.kit.addDmg) e.dmg *= b.kit.addDmg;
      if (e.kind === 'burrow') { e.bur = 1; e.upT = 0; }   // a little mole pops out of the ground
      burst('magic', x, 1, z, { color: b.kit.col || '#c77dff', count: 14 });
      if (type === 'jole') burst('jelly', x, 0.35, z, { color: b.kit.col || SHOT_COL.jelly, scale: 1.2 });
      else if (e.kind === 'burrow') burst('dirt', x, 0.05, z, { count: 10, color: DIRT });
      else if (type === 'kaplumbaga') burst('lava', x, 0.1, z, {});
      else if (type === 'kopuk') burst('fizz', x, 1, z, { count: 14, scale: 1.3 });
      else if (type === 'nobetci') { burst('hoof', x, 0.05, z, { count: 8 }); burst('sparkle', x, 1, z, { color: '#ffe27a', count: 10 }); }   // (the guards march in at the horn)
      else burst('shadowPuff', x, 0.8, z, {});
    }
    sfx(type === 'yarasa' ? 'bat' : type === 'kostebek' ? 'dig' : type === 'jole' ? 'bounce' : type === 'kopuk' ? 'fizz' : 'pop', { x: b.x, z: b.z });
    return made;
  }
  function bossThresholds(b) {
    const f = b.hp / b.maxHp, kit = b.kit;
    // one wave per mark, queued (one big hit crossing both marks still brings both waves, one after the other)
    (kit.at || []).forEach((a, i) => { if (!b.th[i] && f <= a) { b.th[i] = true; (b.sq || (b.sq = [])).push((kit.n && kit.n[i]) || 3); } });
    if (b.sq && b.sq.length && !b.summon) { b.summon = b.sq[0]; if (b.ph === 'idle') b.wait = Math.min(b.wait, 0.35); }
    if (!b.yarim && f <= 0.25) { b.yarim = true; const k = kit.lines.yarim; if (k && hasLine(k)) say(k, 2); }   // 'çok az kaldı' must be true
  }
  function chargeFxAt(m, col, k) {
    if (Math.random() > 0.6) return;
    const a = frand(0, TAU), r = 1.1 * (1 - k * 0.6);
    emitP(m.x + Math.sin(a) * r, m.y + frand(-0.4, 0.4), m.z + Math.cos(a) * r, -Math.sin(a) * r * 2.5, 0, -Math.cos(a) * r * 2.5, 0.3, 0.2, 0.5, col, '#ffffff', 0);
  }

  // ── Çürük Taç: hops toward Feza and lands with a slam ring (the landing circle shows first), spits 3 slow jelly blobs ──
  // Timings follow the model's phases (05): hop = crouch 0–0.2, airborne 0.2–0.8 (the model jumps up by itself; GAME only
  // carries it across), lands at 0.8; spit = puff up, blobs at 0.42 / 0.6 / 0.78.
  const HOP = { D: 1.8, up: 0.2, down: 0.8, R: 3.0, maxD: 8.5 }, SPIT = { D: 1.7, at: [0.42, 0.6, 0.78] };
  function jellyHop(b, D, R, crown) {   // lands right next to Feza (he is inside the circle), never on him; crown: BONUS.tac's big hop
    bossPhase(b, 'hop', D);
    const t = approachSpot(b, HOP.maxD);
    b.hx0 = b.x; b.hz0 = b.z; b.hx1 = t.x; b.hz1 = t.z; b.hopR = R; b.crownHop = !!crown;
    b.tele = fx('telegraph', t.x, t.z, R, D * HOP.down, '#ff4a3a');
  }
  function kraljoleStep(b, dt, d, ux, uz) {
    const faceP = Math.atan2(ux, uz), st = b.st;
    st.air = 0;
    switch (b.ph) {
      case 'roar': bossRoar(b, 1.6); break;
      case 'summon': bossSummon(b, 1.5); break;
      case 'idle':
        if (bossIdle(b, dt, d, ux, uz, 5.5)) {
          if (b.summon) { bossPhase(b, 'summon', 1.5); break; }
          const ph = pickPhase(b, d < b.r + 3 ? [['hop', 0.65], ['spit', 0.35]] : d < 9 ? [['hop', 0.5], ['spit', 0.5]] : [['hop', 0.6], ['spit', 0.4]]);
          if (ph === 'hop') jellyHop(b, HOP.D, b.def.slamR || HOP.R, false);
          else bossPhase(b, 'spit', SPIT.D);
        }
        break;
      case 'hop': {   // GAME carries it across while the model is in the air (st.air 0..1 = the flight)
        // (Round 6: the big crown hop (BONUS.tac) is a longer one — its beats scale with phD — and knocks the crown off)
        const t = b.stT, c = b.phD * HOP.up, a = b.phD * (HOP.down - HOP.up);
        if (t < c) b.face = dampAngle(b.face, Math.atan2(b.hx1 - b.x, b.hz1 - b.z), 6, dt);
        else if (t < c + a) {
          if (b.did === 0) { b.did = 1; sfx('bounce', { x: b.x, z: b.z, pitch: 0.7 }); burst('jelly', b.x, 0.3, b.z, { color: SHOT_COL.jelly, scale: 1.4 }); burst('dust', b.x, 0.05, b.z, { count: 10 }); }
          const k = smooth01((t - c) / a);
          b.x = lerp(b.hx0, b.hx1, k); b.z = lerp(b.hz0, b.hz1, k); st.air = (t - c) / a;
        } else if (b.did === 1) {
          b.did = 2; b.x = b.hx1; b.z = b.hz1; remove(b.tele); b.tele = null;
          burst('jelly', b.x, 0.3, b.z, { color: SHOT_COL.jelly, scale: 2 }); burst('dust', b.x, 0.1, b.z, { count: 30, scale: 1.8 });
          sfx('slam', { x: b.x, z: b.z }); sfx('splat', { x: b.x, z: b.z, pitch: 0.7 });
          bossRing(b, b.x, b.z, b.hopR || b.def.slamR || HOP.R, 1, 1.8, '#b8ecff');
          if (b.crownHop) tacLand(b);
        }
        if (t >= b.phD) { if (b.crownHop && tacOn(b)) { b.crownHop = false; bossPhase(b, 'shy', 60); } else { b.crownHop = false; bossEnd(b, 0.8, 1.3); } }
        break;
      }
      // (Round 6, BONUS.tac) the crown fell off: 'shy' — a short "oops!", then it tip-toes to its crown (no attacks; 05 hops
      // it along by st.move); 'crownon' — it puts the crown back on (no stun); 'blush' — Feza gave it back: helpless, giggling
      case 'shy': {
        const Q = bonusOf(b), c = Q && Q.crown, B = BONUS.tac;
        st.move = 0;
        if (!c || Q.state !== 'on') { bossEnd(b, 0.5, 0.9); break; }
        // (the "oops" counts from the landing: the hop's own recovery took the first part of it)
        if (c.stage === 'lie' && b.stT >= Math.max(0, B.oops - B.hopD * (1 - HOP.down))) {
          const dx = c.x - b.x, dz = c.z - b.z, dd = Math.hypot(dx, dz) || 1e-3;
          if (dd <= b.r * 0.5 + B.king) { tacKingGets(b, Q); break; }   // (the crown right in front of its belly)
          const w = B.walk * (hard ? HC.speed : 1);
          bossWalk(b, dx / dd, dz / dd, w, dt);
          st.move = Math.min(1, w / Math.max(1, b.speed));
        } else b.face = dampAngle(b.face, Math.atan2(c.x - b.x, c.z - b.z), 3, dt);
        break;
      }
      case 'crownon':
        st.move = 0;
        if (b.did === 0 && b.stT >= (b.def.crownOnAt || 0.35) * b.phD) { b.did = 1; st.crownOff = 0; burst('sparkle', b.x, b.height, b.z, { color: '#ffe27a', count: 14 }); sfx('pop', { x: b.x, z: b.z, pitch: 1.3 }); }
        if (b.stT >= b.phD) { st.crownOff = 0; bossEnd(b, 0.6, 1.0); }
        break;
      case 'blush':
        st.move = 0;
        if (Math.random() < dt * 3) burst('sparkle', b.x + frand(-0.6, 0.6), b.height * 0.8, b.z + frand(-0.6, 0.6), { color: '#ab6a5e', count: 2 });
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      case 'spit': {
        if (b.stT < 1.2) b.face = dampAngle(b.face, faceP, 4, dt);
        const t0 = SPIT.D * SPIT.at[0];
        if (b.stT < t0) chargeFxAt(muzzle(b), SHOT_COL.jelly, b.stT / t0);
        if (b.did < 3 && b.stT >= SPIT.D * SPIT.at[b.did]) {
          const m = bossShot(b, 'jelly', [-0.3, 0, 0.3][b.did], 4.6, 0.6, 0.45);
          sfx('splat', { x: b.x, z: b.z, pitch: 1.3, vol: 0.8 }); burst('jelly', m.x, m.y, m.z, { color: SHOT_COL.jelly, count: 4 });
          b.did++;
        }
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.4);
        break;
      }
    }
  }

  // ── Mezar Kazıcısı: burrows (untargetable) and runs at Feza as a dirt mound, a circle shows under him, it pops up there
  // with a shockwave (then sits dizzy: whack it!); throws slow dirt clods; drills at close range. Model timings (05): the
  // throw leaves the paw at 0.5, the drill spins 0.2–0.85; dig-in / pop-up times are EDEF's burrowIn / burrowOut. ──
  // (drillAt 0.5 → 0.65: the drill was its most frequent hit with the shortest warning, 0.75 s; now ~1 s like the others)
  const DIG = { sink: 0.6, travel: 2.2, tele: 1.1, speed: 4.4, R: 2.7, rise: 0.35, rec: 1.3, throwD: 1.5, throwAt: 0.5, drillD: 1.5, drillAt: 0.65 };
  function kostebekustaStep(b, dt, d, ux, uz) {
    const st = b.st, faceP = Math.atan2(ux, uz), sink = b.def.burrowIn || DIG.sink, rise = b.def.burrowOut || DIG.rise, R = b.def.slamR || DIG.R;
    switch (b.ph) {
      case 'roar': bossRoar(b, 1.6); break;
      case 'summon': bossSummon(b, 1.5); break;
      case 'idle':
        if (bossIdle(b, dt, d, ux, uz, 5)) {
          if (b.summon) { bossPhase(b, 'summon', 1.5); break; }
          const ph = pickPhase(b, d < b.r + 2.6 ? [['drill', 0.44], ['burrow', 0.34], ['throw', 0.22]] : d < 9 ? [['throw', 0.45], ['burrow', 0.55]] : [['burrow', 0.6], ['throw', 0.4]]);
          if (ph === 'burrow') {
            bossPhase(b, 'burrow', sink + DIG.travel + DIG.tele); b.dig = 0;
            burst('dirt', b.x, 0.05, b.z, { count: 14, scale: 1.4, color: DIRT }); sfx('dig', { x: b.x, z: b.z, pitch: 0.8 });
          } else if (ph === 'drill') {
            bossPhase(b, 'drill', DIG.drillD); b.face = faceP;
            b.tele = fx('telegraphCone', b.x, b.z, b.face, 1.3, b.r + 2.8, DIG.drillD * DIG.drillAt, '#ff5a44');
          } else bossPhase(b, 'throw', DIG.throwD);
        }
        break;
      case 'burrow': {
        const t = b.stT;
        if (b.dig === 0) {            // digging in
          b.bur = Math.min(1, t / sink); digFx(b, dt, 0.06);
          if (t >= sink) { b.dig = 1; b.digAt = t; }
        } else if (b.dig === 1) {     // the mound runs toward Feza
          b.bur = 1; bossWalk(b, ux, uz, DIG.speed, dt); digFx(b, dt, 0.08);
          if (d < b.r + T.heroR + 0.6 || t - b.digAt > DIG.travel) {
            b.dig = 2; b.digAt = t;
            // the circle is still around Feza, but the mole comes up right beside him (not inside him)
            const s = approachSpot(b, 30);
            b.tx = s.x; b.tz = s.z;
            b.tele = fx('telegraph', s.x, s.z, R, DIG.tele, '#ff7a3a');
            sfx('dig', { x: s.x, z: s.z, pitch: 1.2 });
          }
        } else {                      // trembling under the circle (05: st.windup ≥ 0 makes the mound shake and swell)
          b.bur = 1; b.st.windup = clamp((t - b.digAt) / DIG.tele, 0, 1);
          const dx = b.tx - b.x, dz = b.tz - b.z, dd = Math.hypot(dx, dz);
          if (dd > 0.05) { const s = Math.min(dd, 9 * dt); b.x += dx / dd * s; b.z += dz / dd * s; }
          digFx(b, dt, 0.05);
          if (t - b.digAt >= DIG.tele) { b.x = b.tx; b.z = b.tz; bossPhase(b, 'emerge', rise + DIG.rec); }
        }
        break;
      }
      case 'emerge': {
        const t = b.stT;
        b.bur = Math.max(0, 1 - t / rise);
        if (b.did === 0) {
          b.did = 1; remove(b.tele); b.tele = null;
          burst('dirt', b.x, 0.1, b.z, { count: 24, scale: 1.6, color: DIRT }); burst('dust', b.x, 0.1, b.z, { count: 20, scale: 1.8, color: '#c9a77e' });
          sfx('emerge', { x: b.x, z: b.z, pitch: 0.8 }); sfx('slam', { x: b.x, z: b.z, vol: 0.7 });
          bossRing(b, b.x, b.z, R, 1, 1.6, '#ffd9a0');
        }
        if (t > rise + 0.2 && Math.random() < dt * 4) burst('star', b.x, b.height + 0.2, b.z, { count: 2, color: '#fff3a0' });   // dizzy stars
        if (t >= b.phD) bossEnd(b, 0.7, 1.1);
        break;
      }
      case 'throw': {   // one big throw that breaks into three slow clods (a little fan)
        if (b.stT < DIG.throwD * DIG.throwAt) b.face = dampAngle(b.face, faceP, 5, dt);
        if (b.did === 0 && b.stT >= DIG.throwD * DIG.throwAt) {
          b.did = 1;
          let m = null;
          for (const sp of [-0.3, 0, 0.3]) m = bossShot(b, 'rock', sp, 5.2, 0.6, 0.42);
          sfx('whoosh', { x: b.x, z: b.z, pitch: 0.9 }); burst('dirt', m.x, m.y, m.z, { count: 6, color: DIRT });
        }
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.4);
        break;
      }
      case 'drill': {
        const HIT = DIG.drillD * DIG.drillAt, fx0 = Math.sin(b.face), fz0 = Math.cos(b.face);
        if (b.did === 0 && b.stT >= HIT) {
          b.did = 1; b.tele = null; sfx('drill', { x: b.x, z: b.z }); shake(0.2);
          moveE(b, fx0 * 0.6, fz0 * 0.6);
          burst('dirt', b.x + fx0 * (b.r + 0.8), 0.3, b.z + fz0 * (b.r + 0.8), { count: 10, color: DIRT, dir: { x: fx0, z: fz0 } });
          if (d < b.r + 2.8 && Math.abs(angDiff(b.face, faceP)) < 0.7) hurtPlayer(b.dmg, b.x, b.z, 1.4);
        }
        if (b.did === 1 && b.stT < DIG.drillD * 0.85 && Math.random() < dt * 18)   // drill sparks
          burst('debris', b.x + fx0 * (b.r + 0.6), 0.9, b.z + fz0 * (b.r + 0.6), { color: '#ffe27a', count: 2 });
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.3);
        break;
      }
      // (Round 6, BONUS.avla: hide-and-seek) 'avla' = GAME's dive / underground run / trembling mound (the model shows
      // 'burrow'), 'peek' = its head pops out of a hole (st.burrow 0.6: it can be hit), 'bonk' = a tap on its head, 'dizzy'
      case 'avla': avlaDive(b, dt, sink, R); break;
      case 'peek':
        b.bur = BONUS.avla.peekBur; st.move = 0;
        b.face = dampAngle(b.face, faceP, 4, dt);
        if (b.stT >= b.phD) avlaNext(b, true);
        break;
      case 'bonk':   // squashed into its hole, it sinks from 0.3 on (no more bonks: hidden again)
        st.move = 0;
        { const k0 = b.def.bonkSink || 0.3; b.bur = b.stT < k0 * b.phD ? BONUS.avla.peekBur : lerp(BONUS.avla.peekBur, 1, clamp((b.stT / b.phD - k0) / 0.5, 0, 1)); }
        if (b.stT >= b.phD) avlaNext(b, false);
        break;
      case 'dizzy':   // caught: out of the hole, its head spins (it does nothing: whack it!)
        st.move = 0;
        if (b.bur > 0) { b.bur = Math.max(0, b.bur - dt / rise); if (b.bur <= 0) burst('dirt', b.x, 0.1, b.z, { count: 14, color: DIRT }); }
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      default: bossPhase(b, 'idle', 1); b.wait = 0.5;
    }
  }

  // ── Kül Muhafızı: its shell-volcano erupts 3–5 lava balls that arc onto circles, it tucks in and rolls across
  // the room along a lane (the lane shows first; afterwards it sits dizzy), stomps a ring; calls 2 little turtles at 50 %.
  // Model timings (05): erupt = crouch + tremble 0–0.3, the volcano puffs at 0.36 … 0.78; stomp = rears up, slams at 0.62. ──
  const LAVA = { eruptD: 2.4, puff: [0.36, 0.78], fly: [1.25, 1.6], r: 1.5, h: 4.2, roll: 8, stomp: 4.5, stompD: 1.8, stompAt: 0.62 };
  function lavkaplumbagaStep(b, dt, d, ux, uz) {
    const st = b.st, SR = b.def.slamR || LAVA.stomp;
    switch (b.ph) {
      case 'roar': bossRoar(b, 1.6); break;
      case 'summon': bossSummon(b, 1.5); break;
      case 'idle':
        if (bossIdle(b, dt, d, ux, uz, 6)) {
          if (b.summon) { bossPhase(b, 'summon', 1.5); break; }
          const hw = serinRocks(b) ? BONUS.serintas.hideW : 1;   // (Round 6: rolls more often while the cool rocks stand)
          let ph = pickPhase(b, d < b.r + 3 ? [['stomp', 0.5], ['hide', 0.2 * hw], ['erupt', 0.3]] : d < 10 ? [['erupt', 0.45], ['hide', 0.4 * hw], ['stomp', 0.15]] : [['erupt', 0.55], ['hide', 0.45 * hw]]);
          // no room for a real roll (Feza between it and the rim, a pillar in the way): stomp up close, else erupt
          if (ph === 'hide' && !startLavaRoll(b, ux, uz)) b.last = ph = d < b.r + 3.5 ? 'stomp' : 'erupt';
          if (ph === 'stomp') { bossPhase(b, 'stomp', LAVA.stompD); b.tele = fx('telegraph', b.x, b.z, SR, LAVA.stompD * LAVA.stompAt, '#ff4a3a'); }
          else if (ph === 'erupt') {
            const f = b.hp / b.maxHp;
            bossPhase(b, 'erupt', LAVA.eruptD); b.balls = f > 0.66 ? 3 : f > 0.33 ? 4 : 5;   // 3–5 lava balls (more when it is tired)
            sfx('rumble', { x: b.x, z: b.z });
          }
        }
        break;
      case 'erupt': {   // one lava ball per volcano puff: the first lands where Feza stands, the others around him
        const t = b.stT, n = b.balls || 3, t0 = LAVA.puff[0] * b.phD, t1 = LAVA.puff[1] * b.phD;
        if (t < t0) { chargeFxAt(muzzle(b), '#ff8a2a', t / t0); if (Math.random() < dt * 8) shake(0.04); }
        if (b.did < n && t >= t0 + (t1 - t0) * b.did / Math.max(1, n - 1)) {
          const m = muzzle(b), mx = m.x, my = m.y, mz = m.z;
          burst('erupt', mx, my, mz, { scale: b.did ? 1 : 1.4 }); sfx('erupt', { x: b.x, z: b.z, pitch: frand(0.9, 1.1), vol: b.did ? 0.7 : 1 });
          if (!b.did) shake(0.2);
          for (let i = 0; i < 6; i++) {
            let tx = P.pos.x, tz = P.pos.z;
            if (b.did > 0 || i > 0) { const a = frand(0, TAU), r = frand(1.8, 4.2); tx += Math.sin(a) * r; tz += Math.cos(a) * r; }
            if (!isFloor(tx, tz)) continue;
            spawnMortar({ x0: mx, y0: my, z0: mz, x1: tx, z1: tz, dur: frand(LAVA.fly[0], LAVA.fly[1]), h: LAVA.h, r: LAVA.r, dmg: b.dmg * 0.7, kind: 'lavaball' });
            break;
          }
          b.did++;
        }
        if (t >= b.phD) bossEnd(b, 1.0, 1.5);
        break;
      }
      case 'hide':   // tucked into its shell while the lane fills up
        if (b.stT >= b.phD) {
          bossPhase(b, 'roll', b.rollLen / (b.def.rollSpeed || LAVA.roll) + 0.4); b.rollD = 0; b.rollHit = false;
          sfx('roll', { x: b.x, z: b.z, pitch: 0.7 });
        }
        break;
      case 'roll': {
        const step = (b.def.rollSpeed || LAVA.roll) * dt, ox = b.x, oz = b.z, rm = bossRoom();
        moveE(b, b.rdx * step, b.rdz * step);
        if (rm && !inRoom(rm, b.x, b.z, b.r * 0.5)) { b.x = ox; b.z = oz; }
        const moved = Math.hypot(b.x - ox, b.z - oz);
        b.rollD += moved; st.move = 1;
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.05;
          burst('dust', b.x - b.rdx * b.r, 0.05, b.z - b.rdz * b.r, { count: 3, color: '#c9a07a', dir: { x: -b.rdx, z: -b.rdz } });
          burst('embers', b.x, 0.5, b.z, { count: 2 });
        }
        const gx = P.pos.x - b.x, gz = P.pos.z - b.z, gd = Math.hypot(gx, gz);
        if (!b.rollHit && !P.dead && gd < b.r + T.heroR + 0.2) {
          b.rollHit = true; hurtPlayer(b.dmg, b.x - b.rdx, b.z - b.rdz, 2.2); sfx('bounce', { x: b.x, z: b.z, pitch: 0.8 });
        }
        // it bonked Feza and he is still right in front of it (the rim behind him, or he could not be knocked away): it
        // bounces off him and stops, instead of rolling on through him
        const onFeza = b.rollHit && !P.dead && gd < b.r + T.heroR + 0.05 && gx * b.rdx + gz * b.rdz > 0.2 * gd;
        const bumped = moved < step * 0.3 || onFeza;
        if (b.rollD >= b.rollLen || bumped || b.stT >= b.phD) {
          if (bumped) { sfx('bounce', { x: b.x, z: b.z, pitch: 0.6 }); shake(0.25); burst('dust', b.x, 0.2, b.z, { count: 16, scale: 1.4 }); }
          // Round 6: a cool rock right in front (BONUS.serintas) tips it over; else it pops out of its shell a bit dizzy
          // ('rollend': the time to whack it; was an idle wait of the same length)
          if (!serinFlip(b)) { remove(b.tele); b.tele = null; bossPhase(b, 'rollend', frand(1.3, 1.8)); }
        }
        break;
      }
      case 'rollend':
        st.move = 0;
        if (b.stT >= b.phD) bossEnd(b, 0.2, 0.2);
        break;
      case 'flip':   // (Round 6) tipped onto its side against a cool rock, legs paddling: helpless (whack it!)
        st.move = 0;
        if (Math.random() < dt * 4) burst('steam', b.x + frand(-0.8, 0.8), 0.6, b.z + frand(-0.8, 0.8), { count: 2 });
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      case 'stomp':
        if (b.did === 0 && b.stT >= LAVA.stompD * LAVA.stompAt) {
          b.did = 1; b.tele = null;
          burst('dust', b.x, 0.1, b.z, { count: 36, scale: 2 }); burst('embers', b.x, 0.4, b.z, { count: 16 }); burst('lava', b.x, 0.2, b.z, { scale: 1.2 });
          sfx('slam', { x: b.x, z: b.z }); sfx('rumble', { x: b.x, z: b.z, vol: 0.6 });
          bossRing(b, b.x, b.z, SR, 1.1, 2.2, '#ffb36a');
        }
        if (b.stT >= b.phD) bossEnd(b, 1.0, 1.5);
        break;
    }
  }
  function startLavaRoll(b, ux, uz) {   // false: the lane is too short for a roll
    const len = laneLen(b.x, b.z, ux, uz, 16, b.r * 0.85, bossRoom());
    // (Round 6: a lane cut short by a cool rock still makes a roll — Feza hiding right behind one is the whole idea, and
    // the turtle walks up to ~6 m of him, too close for the usual 3 m lane)
    if (len < 3 && !(len >= 1.5 && serinLaneRock(b, ux, uz, len))) return false;
    bossPhase(b, 'hide', 1.0);
    b.face = Math.atan2(ux, uz); b.rdx = ux; b.rdz = uz;
    b.rollLen = len;
    // the lane ends where the shell's front stops (the roll keeps its centre r/2 inside the arena): never out over the lava
    const e = b.rollLen + b.r * 0.5;
    b.tele = telegraphLine(b.x, b.z, b.x + ux * e, b.z + uz * e, b.r * 2 + 0.3, 1.0, '#ff6a3a');
    sfx('whoosh', { x: b.x, z: b.z, pitch: 0.6 });
    return true;
  }
  // ── Veba Rahibi (Round 4): a big friendly glass kefir bottle. It shakes itself (the wind-up: wobbles and fizzes
  // while the foam cone shows on the ground) → pops its cap and sprays a foam geyser along the cone (a few soft hits that
  // push Feza out of the foam); spits 5 slow fizz bubbles in a fan (the saber pops them: "Pof!"); hops and lands with a
  // milk-splash ring (the circle shows first); calls 2–3 kefir foams at 66 % / 33 %. Model phases (05, st.phase/phaseT):
  // shake (the whole 0..1 wobbles), geyser (cap pops at 0.1, foam sprayAt 0.14–0.84, the cap drops back on ~0.9), bubbles
  // (puffs up, then one bubble at each fizzAt 0.4 … 0.8 while its body turns across: the fan), slam (crouch 0–0.2, airborne
  // 0.2–0.8 — the model jumps, GAME carries it across — lands at 0.8), summon (the foams pop out at 0.47), roar (a happy
  // "fizz!"). EDEF.kefirdev's cone / sprayAt / fizzAt / slamR override these. m.muzzle() = the bottle's mouth. ──
  const KEF = { shakeD: 1.1, geyD: 1.9, spray: [0.14, 0.84], cone: 0.95, len: 6, tick: 0.28, tickK: 0.3, kb: 0.9,
    bubD: 1.9, fizzAt: [0.4, 0.5, 0.6, 0.7, 0.8], turn: 0.34, fanK: 1.8, bubSpeed: 3.6, bubR: 0.42, bubK: 0.55,
    slamD: 1.8, up: 0.2, down: 0.8, R: 2.9, maxD: 8 };
  const kefCone = b => (b.def.cone && b.def.cone.angle) || KEF.cone, kefLen = b => (b.def.cone && b.def.cone.len) || KEF.len;
  const kefSpray = b => (Array.isArray(b.def.sprayAt) && b.def.sprayAt.length === 2 ? b.def.sprayAt : KEF.spray);
  const kefFizz = b => (Array.isArray(b.def.fizzAt) && b.def.fizzAt.length ? b.def.fizzAt : KEF.fizzAt);
  function kefirdevStep(b, dt, d, ux, uz) {
    const faceP = Math.atan2(ux, uz), st = b.st;
    st.air = 0;
    switch (b.ph) {
      case 'roar': bossRoar(b, 1.6); break;
      case 'summon': bossSummon(b, 1.5); break;
      case 'idle':
        if (bossIdle(b, dt, d, ux, uz, 5.5)) {
          if (b.summon) { bossPhase(b, 'summon', 1.5); break; }
          // (Round 6: 'blow' = BONUS.balon's giant bubble, one at a time. It is DUE soon after its hp mark (first) and then
          // every gap s: when due it blows whatever the distance (a kid right next to it: it scoots back while it inhales);
          // before that only now and then from a little way off, ≥ cd s apart)
          const br = balonReady(b), due = br && balonDue(b);
          const bw = br && d >= b.r + 3 ? BONUS.balon.w : 0;
          const ph = due ? 'blow' : pickPhase(b, d < b.r + 3 ? [['geyser', 0.45], ['slam', 0.35], ['bubbles', 0.2]]
            : d < 9 ? [['geyser', 0.4], ['bubbles', 0.35], ['slam', 0.25], ['blow', bw]] : [['bubbles', 0.5], ['slam', 0.5], ['blow', bw]]);
          if (ph === 'blow') balonBlow(b);
          else if (ph === 'geyser') {   // it shakes first; the foam cone shows for the whole wind-up
            bossPhase(b, 'shake', KEF.shakeD); b.face = faceP;
            b.tele = fx('telegraphCone', b.x, b.z, b.face, kefCone(b), b.r + kefLen(b), KEF.shakeD + KEF.geyD * kefSpray(b)[0], '#ff5a44');
            sfx('fizz', { x: b.x, z: b.z, vol: 0.8, pitch: 0.85 }); sfx('squish', { x: b.x, z: b.z, vol: 0.5, pitch: 0.7 });
          } else if (ph === 'slam') {
            bossPhase(b, 'slam', KEF.slamD);
            const t = approachSpot(b, KEF.maxD);   // lands right next to Feza (he is inside the circle), never on him
            b.hx0 = b.x; b.hz0 = b.z; b.hx1 = t.x; b.hz1 = t.z;
            b.tele = fx('telegraph', t.x, t.z, b.def.slamR || KEF.R, KEF.slamD * KEF.down, '#ff4a3a');
          } else bossPhase(b, 'bubbles', KEF.bubD);
        }
        break;
      case 'shake': {   // wobbling and fizzing: little bubbles rise from its neck
        b.shT = (b.shT || 0) - dt;
        if (b.shT <= 0) { b.shT = 0.09; const m = muzzle(b); burst('fizz', m.x, m.y, m.z, { count: 3, scale: 0.8 }); }
        if (b.did === 0 && b.stT > b.phD * 0.45) { b.did = 1; sfx('fizz', { x: b.x, z: b.z, vol: 0.9, pitch: 1.1 }); }
        if (b.stT >= b.phD) { bossPhase(b, 'geyser', KEF.geyD); b.tick = 0; }
        break;
      }
      case 'geyser': {
        const k = b.stT / b.phD, sp = kefSpray(b), on = k >= sp[0] && k < sp[1];
        if (b.did === 0 && k >= Math.max(0, sp[0] - 0.04)) {   // pop! the cap flies up and the foam gushes out
          b.did = 1; remove(b.tele); b.tick = 0.12; b.crown = 0; b.foamT = 0;   // (the first hit as the jet turns toward Feza)
          // the foam zone stays on the ground for the whole spray (Round 4 QA: the cone vanished at the pop while the hits went
          // on 1.3 s over the whole cone, far outside the thin foam stream): a lighter pink, removed as the spray ends
          b.tele = fx('telegraphCone', b.x, b.z, b.face, kefCone(b), b.r + kefLen(b), (sp[1] - k) * b.phD + 0.35, '#ff9ccb');
          const m = muzzle(b);
          sfx('cork', { x: b.x, z: b.z }); sfx('fizz', { x: b.x, z: b.z, vol: 1, pitch: 0.75 }); shake(0.18);
          burst('fizz', m.x, m.y + 0.2, m.z, { count: 16, scale: 1.4 }); burst('milk', m.x, m.y, m.z, { count: 10, scale: 1.2, color: '#fff4e4' });
        }
        if (b.did === 1 && k >= sp[1]) { b.did = 2; remove(b.tele); b.tele = null; }   // the spray is over: the zone goes
        if (on) {
          foamSpray(b, dt, (k - sp[0]) / Math.max(0.05, sp[1] - sp[0]));
          b.fzS = (b.fzS || 0) - dt;
          if (b.fzS <= 0) { b.fzS = 0.3; sfx('fizz', { x: b.x, z: b.z, vol: 0.55, pitch: frand(0.8, 1.0) }); }
          b.tick -= dt;
          if (b.tick <= 0) {   // soft foam hits that push him out of the cone
            b.tick = KEF.tick;
            if (!P.dead && d < b.r + kefLen(b) + T.heroR && Math.abs(angDiff(b.face, faceP)) < kefCone(b) * 0.5 + 0.06) hurtPlayer(b.dmg * KEF.tickK, b.x, b.z, KEF.kb);
          }
        }
        if (b.stT >= b.phD) bossEnd(b, 1.0, 1.5);
        break;
      }
      case 'bubbles': {   // puffs up, then five slow fizz bubbles, one per burp while its body turns across: a fan
        const fa = kefFizz(b), k = b.stT / b.phD;
        if (k < fa[0]) { if (k < 0.3) { b.face = dampAngle(b.face, faceP, 5, dt); b.aim = b.face; } chargeFxAt(muzzle(b), SHOT_COL.fizz, k / fa[0]); }
        if (b.did < fa.length && k >= fa[b.did]) {
          // the same turn as the model's body (05: −0.34 → +0.34 over phaseT 0.36–0.84), widened so the fan has gaps to dodge
          const turn = lerp(-KEF.turn, KEF.turn, smooth01((fa[b.did] - 0.36) / 0.48)) * KEF.fanK;
          const m = muzzle(b), a = (b.aim !== undefined ? b.aim : b.face) + turn, sp = KEF.bubSpeed * frand(0.95, 1.05);
          spawnProjectile({ x: m.x, y: Math.max(0.9, m.y), z: m.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, r: KEF.bubR, dmg: b.dmg * KEF.bubK,
            owner: 'enemy', bossShot: true, kind: 'fizz', life: 6.5, color: SHOT_COL.fizz });
          sfx('bubble', { x: b.x, z: b.z, pitch: frand(0.75, 0.95), vol: 0.8 }); if (b.did === 0) sfx('fizz', { x: b.x, z: b.z, vol: 0.8, pitch: 1.2 });
          burst('fizz', m.x, m.y, m.z, { count: 6, scale: 1 });
          b.did++;
        }
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.4);
        break;
      }
      case 'slam': {   // like Çürük Taç's hop: GAME carries it across while the model is in the air (st.air 0..1)
        const t = b.stT, c = KEF.slamD * KEF.up, a = KEF.slamD * (KEF.down - KEF.up);
        if (t < c) b.face = dampAngle(b.face, Math.atan2(b.hx1 - b.x, b.hz1 - b.z), 6, dt);
        else if (t < c + a) {
          if (b.did === 0) { b.did = 1; sfx('bounce', { x: b.x, z: b.z, pitch: 0.75 }); burst('milk', b.x, 0.2, b.z, { count: 10, scale: 1.2 }); burst('dust', b.x, 0.05, b.z, { count: 8, color: '#f3e4c2' }); }
          const k = smooth01((t - c) / a);
          b.x = lerp(b.hx0, b.hx1, k); b.z = lerp(b.hz0, b.hz1, k); st.air = (t - c) / a;
        } else if (b.did === 1) {
          b.did = 2; b.x = b.hx1; b.z = b.hz1; remove(b.tele); b.tele = null;
          burst('milk', b.x, 0.2, b.z, { count: 26, scale: 2.2 }); burst('fizz', b.x, 0.5, b.z, { count: 16, scale: 1.4 });
          sfx('slam', { x: b.x, z: b.z }); sfx('splat', { x: b.x, z: b.z, pitch: 0.8 });
          // (Round 4 QA: the white additive ring bloomed into a halo over the boss and Feza: a soft cream ring now)
          bossRing(b, b.x, b.z, b.def.slamR || KEF.R, 1, 1.8, '#ffe9c4', { k: 0.8, edge: 0.35 });
        }
        if (t >= b.phD) bossEnd(b, 0.8, 1.3);
        break;
      }
      // (Round 6, BONUS.balon) 'blow': inhales, the cap hovers, it blows a giant bubble at its mouth (0.5–0.75), lets it go at
      // 0.75 (the bubble itself: balonStep); 'hiccup': Feza popped it — three big hiccups, helpless (whack it!)
      case 'blow': {
        const k = b.stT / b.phD, ba = balonAt(b);
        if (k < ba[0] && b.blowBack > 0) {   // (Feza right next to it: a little scoot back while it breathes in)
          const rm = bossRoom(), ox = b.x, oz = b.z, v = Math.min(b.blowBack, BONUS.balon.back / Math.max(0.2, ba[0] * b.phD) * dt);
          moveE(b, -ux * v, -uz * v); b.blowBack -= v;
          if (rm && !inRoom(rm, b.x, b.z, b.r * 0.7)) { b.x = ox; b.z = oz; b.blowBack = 0; }
        }
        if (k < ba[0]) b.face = dampAngle(b.face, faceP, 4, dt);
        if (k < ba[0] && Math.random() < dt * 6) { const m = muzzle(b); burst('fizz', m.x, m.y, m.z, { count: 2, scale: 0.7 }); }
        if (b.did === 0 && k >= ba[1]) { b.did = 1; balonSpawn(b); }
        if (b.did === 1 && k >= ba[2]) { b.did = 2; balonRelease(b); }
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.4);
        break;
      }
      case 'hiccup': {
        st.move = 0;
        const k = b.stT / b.phD, at = Array.isArray(b.def.hiccupAt) && b.def.hiccupAt.length ? b.def.hiccupAt : [0.15, 0.45, 0.75];
        if (b.did < at.length && k >= at[b.did]) {
          b.did++;
          const m = muzzle(b);
          sfx('hiccup', { x: b.x, z: b.z, pitch: frand(0.95, 1.15) }); sfx('fizz', { x: b.x, z: b.z, vol: 0.7, pitch: 1.3 });
          burst('fizz', m.x, m.y + 0.2, m.z, { count: 14, scale: 1.3 });
          ftext(b.x, b.height + 0.5, b.z, 'Lanet bozuldu!', 'word');
        }
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      }
      default: bossPhase(b, 'idle', 1); b.wait = 0.5;
    }
  }
  // The geyser's foam, staged so it reads as a kefir fountain: the cap pops with a white crown splash on the bottle's mouth,
  // then glossy cream clumps shoot out low in front of the bottle and rain over the cone, where foam piles up and melts.
  // (Round 4 QA 2: ivory clumps that faded early blended into grey-beige balls over the blue label and the yellow cheese, and
  // the jet straight up + the arc from the mouth were drawn right across the giant's face, which looks at Feza = toward the
  // camera: now opaque white until they melt on the floor, starting 0.9 m out and 0.4 m below the mouth, flat and fast, so
  // they leave its silhouette at once.) Soft shading kept: the ball's full shading gives a half-grey belly. Normal blend
  // (never a white bloom), kept airy: a thick cloud hid Feza right where he has to step out of it.
  const FOAM_COL = ['#ffffff', '#fff8f2', '#ffeef5', '#f2f8ff'];
  function foamSpray(b, dt, u) {   // u: 0..1 through the spray
    const m = muzzle(b), L = b.r + kefLen(b), CA = kefCone(b);
    const mx = m.x, my = Math.max(1.4, m.y), mz = m.z, fx0 = Math.sin(b.face), fz0 = Math.cos(b.face);
    const DOT = shape('DOT', 9), SMOKE = shape('SMOKE', 3), RING = shape('RING', 6), SPARK = shape('SPARK', 2);
    if (!b.crown) {   // the crown splash on the bottle's mouth as the cap pops (the pop itself: kefirdevStep)
      b.crown = 1;
      burst('milk', mx, my + 0.1, mz, { scale: 1.1, color: '#ffffff' });
    }
    PT.add = false; PT.soft = 1; PT.alpha = 1; PT.fade = 5; PT.pop = 0.1;
    b.foamT = (b.foamT || 0) - dt;
    const sx = mx + fx0 * 0.9, sy = Math.max(1, my - 0.4), sz = mz + fz0 * 0.9;
    while (b.foamT <= 0) {   // cream clumps arcing out over the cone, each onto its own spot (g = 9)
      // (they swell as they fly: from the high camera every arc toward Feza crosses the giant's face on screen, so there
      // they are still small beads; ~0.3–0.42 as they land, a little more as they melt)
      b.foamT += 0.026;
      const a = b.face + frand(-0.42, 0.42) * CA, r = frand(b.r + 0.6, L - 0.3), vy = frand(0.2, 0.8), T = (vy + Math.sqrt(vy * vy + 18 * sy)) / 9;
      const tx = b.x + Math.sin(a) * r, tz = b.z + Math.cos(a) * r;
      emitP(sx, sy, sz, (tx - sx) / T, vy, (tz - sz) / T, T + 0.35, frand(0.1, 0.14), frand(0.42, 0.56), fpick(FOAM_COL), '#ffffff', DOT, 9, 0);
    }
    b.clT = (b.clT || 0) - dt;
    if (b.clT <= 0 && u > 0.1) {   // foam piling up on the cone: soft cream puffs that swell and melt (no grey edges: soft)
      b.clT = 0.055;
      const a = b.face + frand(-0.42, 0.42) * CA, r = frand(b.r + 0.9, L - 0.2), x = b.x + Math.sin(a) * r, z = b.z + Math.cos(a) * r;
      PT.fade = 2.6;
      emitP(x, frand(0.15, 0.35), z, Math.sin(a) * 0.6, frand(0.2, 0.5), Math.cos(a) * 0.6, frand(0.8, 1.1), frand(0.4, 0.55), frand(0.8, 1.0), fpick(FOAM_COL), '#fffaf4', SMOKE, -0.2, 1.5);
    }
    if (Math.random() < 0.35) {   // a few glossy kefir bubbles arcing out
      const a = b.face + frand(-0.45, 0.45) * CA, sp = frand(0.35, 0.9) * L / 1.35;
      PT.pop = 0.12; PT.fade = 4;
      emitP(mx, my, mz, Math.sin(a) * sp, frand(1.2, 2.4), Math.cos(a) * sp, frand(1.1, 1.4), frand(0.14, 0.2), frand(0.2, 0.28), '#bfe9ff', '#e8f7ff', RING, 3.5, 0.3);
    }
    PT.add = true; PT.soft = 0; PT.fade = 1; PT.pop = 0;
    if (Math.random() < 0.35) { const a = b.face + frand(-0.4, 0.4) * CA, sp = frand(0.3, 0.9) * L / 1.35;
      emitP(mx, my, mz, Math.sin(a) * sp, frand(1.4, 2.6), Math.cos(a) * sp, frand(0.6, 0.9), frand(0.14, 0.22), 0.04, fpick(['#ffffff', '#ffe8f2', '#fff3c4']), '#ffffff', SPARK, 3, 0.3); }
    b.splT = (b.splT || 0) - dt;
    if (b.splT <= 0 && u > 0.3) {   // milky splashes where the clumps land
      b.splT = 0.12;
      const a = b.face + frand(-0.42, 0.42) * CA, r = frand(b.r + 1.5, L);
      burst('milk', b.x + Math.sin(a) * r, 0.1, b.z + Math.cos(a) * r, { count: 4, scale: 0.8, color: '#fff4e4' });
    }
  }
  // ── Yeminbozan (Round 5): a very grumpy chibi knight on a big friendly horse. By distance (pickPhase): far → charge /
  // toss, mid → charge / sweep / toss, close → rear / sweep. Beats = 05's model timing contract (st.phaseT): charge = paws the
  // ground 0–SOV.paw while the lane toward Feza's spot fills, gallops along it to the arena rim until SOV.run (bumps Feza at
  // most once, out of the lane to his side), skids to a stop; rear = rears up while the ring fills, the stomp lands at
  // rearAt; sweep = the lance is drawn back while a wide cone fills (he steps in a little first), the sweep hits at sweepAt;
  // toss = three silver horseshoes at tossAt, lobbed like the lava balls (the first onto Feza's spot); summon = a little horn
  // at 0.5 and 2 guards; roar = the horse neighs; dizzy = the arena surprise (the banners, see sancakStep). EDEF.sovalye's
  // slamR / chargeSpeed override these. m.muzzle() = the knight's throwing hand. ──
  // (warnings no shorter than the other bosses' like moves: the lane fills 1.08 s (the turtle's roll 1.0), the ring 1.15 s
  // (its stomp 1.12), the cone 1.1 s (the mole's drill 0.98), the horseshoes fly as long as the lava balls)
  // Round 5 QA: the charge's clock runs in three pieces (chargeK): paws for chargeD × paw s (the lane fills), gallops the lane
  // at chargeSpeed (the model's gallop cadence fits ~9 m/s: on a short lane at a slower pace the hooves slid), skids for
  // chargeD × (1 − run) s. The sweep's cone + hit = EDEF.sovalye.cone (the lance's reach: angle, len beyond r; cone / reach
  // here only when 05 has none), he steps in to have Feza 0.8 m inside it. A knocked banner lands at fall `land` (05's
  // EMODEL.sancak: it lies flat at 0.72, bounces to 0.86): the dust + sparkle then.
  const SOV = { chargeD: 3.6, paw: 0.3, run: 0.9, minLane: 6, maxLane: 22, rearD: 2.3, rearAt: 0.5, R: 3.6, sweepD: 2.2, sweepAt: 0.5,
    cone: 1.9, reach: 3.0, step: 1.6, tossD: 2.2, tossAt: [0.35, 0.5, 0.65], fly: [1.25, 1.6], shoeR: 1.35, shoeH: 3.6,
    banners: 0.6, fallT: 1.1, land: 0.72, dizzy: 4, stride: 2 * Math.PI / 15 };
  // the sweep's cone {a: full angle (rad), R: reach from his middle}
  function sovCone(b) {
    const c = b.def && b.def.cone;
    return { a: c && c.angle > 0 ? c.angle : SOV.cone, R: b.r + (c && c.len > 0 ? c.len : SOV.reach) };
  }
  // the model's phaseT from the charge's clock (b.chT = [paw s, gallop s, skid s]; a charge set up elsewhere: stT / phD)
  function chargeK(b) {
    const c = b.chT, t = b.stT;
    if (!c) return clamp(t / (b.phD || 1), 0, 1);
    if (t < c[0]) return SOV.paw * t / c[0];
    if (t < c[0] + c[1]) return SOV.paw + (SOV.run - SOV.paw) * (t - c[0]) / c[1];
    return SOV.run + (1 - SOV.run) * clamp((t - c[0] - c[1]) / c[2], 0, 1);
  }
  function hoofFx(b, back, n, sc) {   // a dust puff with little golden sparkles at the hooves (back > 0: behind the horse, < 0: in front)
    const fx0 = Math.sin(b.face), fz0 = Math.cos(b.face), k = b.r * 0.6 * back, s = back < 0 ? 0.6 : -0.6;
    burst('hoof', b.x - fx0 * k + frand(-0.3, 0.3), 0.05, b.z - fz0 * k + frand(-0.3, 0.3), { count: n, scale: sc || 1, dir: { x: fx0 * s, z: fz0 * s } });
  }
  function gallopFx(b, dt) {   // hoof dust behind it + a clip-clop (AUD's 'gallop' = one whole stride: once per model stride)
    b.trailT -= dt;
    if (b.trailT <= 0) { b.trailT = 0.08; hoofFx(b, 1, 3); }
    b.galS = (b.galS || 0) - dt;
    if (b.galS <= 0) { b.galS = Math.max(0, b.galS + SOV.stride); sfx('gallop', { x: b.x, z: b.z, vol: 0.75 }); }   // (+=: no frame drift)
  }
  function startCharge(b, ux, uz, d) {   // false: no room for a real charge (the rim right behind Feza, a tent in the way)
    const len = laneLen(b.x, b.z, ux, uz, SOV.maxLane, b.r * 0.85, bossRoom());
    if (len < Math.max(SOV.minLane, Math.min(d, 9))) return false;
    // the lane always fills for 1.08 s (pawing), then a gallop at chargeSpeed whatever the lane's length, then the skid
    const tP = SOV.chargeD * SOV.paw, tR = len / (b.def.chargeSpeed || 9), tS = SOV.chargeD * (1 - SOV.run);
    bossPhase(b, 'charge', tP + tR + tS); b.chT = [tP, tR, tS];
    b.face = Math.atan2(ux, uz); b.rdx = ux; b.rdz = uz; b.rollLen = len; b.rollD = 0; b.rollHit = false; b.pawT = 0;
    const e = len + b.r * 0.5;   // (the lane shows where the horse's front will stop)
    b.tele = telegraphLine(b.x, b.z, b.x + ux * e, b.z + uz * e, laneW(b), tP, '#ff6a3a');
    sfx('neigh', { x: b.x, z: b.z, vol: 0.8 });
    return true;
  }
  function sovalyeStep(b, dt, d, ux, uz) {
    const faceP = Math.atan2(ux, uz), st = b.st, SR = b.def.slamR || SOV.R;
    st.air = 0;
    switch (b.ph) {
      case 'roar': bossRoar(b, 1.6); break;
      case 'summon': bossSummon(b, 1.5); break;
      case 'idle':
        if (bossIdle(b, dt, d, ux, uz, 6)) {
          if (b.summon) { bossPhase(b, 'summon', 1.5); break; }
          // (the sweep only when its step-in brings Feza inside the lance's reach)
          const close = d < b.r + 3.2, CN = sovCone(b), sw = d < CN.R + SOV.step - 0.3;
          let ph = pickPhase(b, close ? [['rear', 0.5], ['sweep', sw ? 0.5 : 0]]
            : d < 9 ? [['charge', 0.4], ['toss', 0.3], ['sweep', sw ? 0.3 : 0]] : [['charge', 0.55], ['toss', 0.45]]);
          if (ph === 'charge' && !startCharge(b, ux, uz, d)) b.last = ph = close ? 'rear' : 'toss';
          if (ph === 'rear') {
            bossPhase(b, 'rear', SOV.rearD);
            b.tele = fx('telegraph', b.x, b.z, SR, SOV.rearD * SOV.rearAt, '#ff4a3a');
            sfx('neigh', { x: b.x, z: b.z, pitch: 1.2, vol: 0.9 });
          } else if (ph === 'sweep') {   // he steps in a little, so the cone reaches Feza; the cone shows where he will stand
            bossPhase(b, 'sweep', SOV.sweepD); b.face = faceP;
            const go = clamp(d - (CN.R - 0.8), 0, SOV.step), t = bossSpot(b, b.x + ux * go, b.z + uz * go, SOV.step);
            b.sx0 = b.x; b.sz0 = b.z; b.sx = t.x; b.sz = t.z;
            b.tele = fx('telegraphCone', t.x, t.z, b.face, CN.a, CN.R, SOV.sweepD * SOV.sweepAt, '#ff5a44');
            sfx('clank', { x: b.x, z: b.z, vol: 0.6 });
          } else if (ph === 'toss') bossPhase(b, 'toss', SOV.tossD);
        }
        break;
      case 'charge': {
        if (!isFinite(b.rdx) || !isFinite(b.rdz)) { bossEnd(b, 0.5, 0.9); break; }   // (a charge not set up by startCharge: no lane)
        const k = chargeK(b);
        if (k < SOV.paw) {   // pawing the ground, the lance comes down: the lane fills
          b.face = dampAngle(b.face, Math.atan2(b.rdx, b.rdz), 8, dt);
          b.pawT -= dt;
          if (b.pawT <= 0) { b.pawT = 0.32; hoofFx(b, -0.6, 5); sfx('gallop', { x: b.x, z: b.z, vol: 0.4, pitch: 0.8 }); }
        } else if (k < SOV.run) {   // the gallop: along the lane at a steady pace (moveE: a wall or a tent in the way stops it)
          if (b.did === 0) { b.did = 1; sfx('neigh', { x: b.x, z: b.z, pitch: 1.1 }); shake(0.12); }
          const want = b.rollLen * (k - SOV.paw) / (SOV.run - SOV.paw), step = want - b.rollD, ox = b.x, oz = b.z;
          if (step > 0) moveE(b, b.rdx * step, b.rdz * step);
          const moved = Math.hypot(b.x - ox, b.z - oz);
          b.rollD += moved; b.face = Math.atan2(b.rdx, b.rdz); st.move = 1;
          gallopFx(b, dt);
          const gx = P.pos.x - b.x, gz = P.pos.z - b.z;
          if (!b.rollHit && !P.dead && Math.hypot(gx, gz) < b.r + T.heroR + 0.2) {   // one bump, out of the lane to his side
            b.rollHit = true; STATS.strikeHit++;
            const side = gx * -b.rdz + gz * b.rdx >= 0 ? 1 : -1;
            hurtPlayer(b.dmg, P.pos.x + b.rdz * side, P.pos.z - b.rdx * side, 1.6);
            sfx('bounce', { x: b.x, z: b.z, pitch: 0.8 }); sfx('clank', { x: b.x, z: b.z, vol: 0.6 });
          }
          if (step > 0.04 && moved < step * 0.3) b.stT = Math.max(b.stT, b.chT ? b.chT[0] + b.chT[1] : b.phD * SOV.run);   // blocked: skid now
        } else if (b.did < 2) {   // skids to a stop in a cloud of hoof dust
          b.did = 2; hoofFx(b, -0.8, 14, 1.4); sfx('gallop', { x: b.x, z: b.z, pitch: 0.7 }); shake(0.15);
        }
        if (b.stT >= b.phD) bossEnd(b, 1.0, 1.5);
        break;
      }
      case 'rear':
        if (b.did === 0 && b.stT >= b.phD * SOV.rearAt) {   // the front hooves come down: a stomp ring
          b.did = 1; b.tele = null;
          hoofFx(b, -0.6, 18, 1.8); burst('dust', b.x, 0.1, b.z, { count: 26, scale: 1.8, color: '#efdcb2' });
          sfx('slam', { x: b.x, z: b.z, vol: 0.8 }); sfx('gallop', { x: b.x, z: b.z, pitch: 0.7 }); sfx('clank', { x: b.x, z: b.z, vol: 0.5 });
          bossRing(b, b.x, b.z, SR, 1, 2.0, '#ffe08a', { k: 1.1, edge: 0.3 });
        }
        if (b.stT >= b.phD) bossEnd(b, 1.0, 1.4);
        break;
      case 'sweep': {
        const k = b.stT / b.phD;
        if (k < 0.35 && b.sx !== undefined) { const e = smooth01(k / 0.35); b.x = lerp(b.sx0, b.sx, e); b.z = lerp(b.sz0, b.sz, e); st.move = e < 0.98 ? 0.5 : 0; }
        if (b.did === 0 && k >= SOV.sweepAt) {   // the wide lance sweep (a soft padded ball: one bonk)
          b.did = 1; b.tele = null;
          const CN = sovCone(b);   // (the same cone as its telegraph)
          fx('slash', b.x, 1.3, b.z, b.face, 1, '#fff1c2', CN.R, CN.a + 0.2);
          sfx('whoosh', { x: b.x, z: b.z, pitch: 0.75 });
          const gx = P.pos.x - b.x, gz = P.pos.z - b.z;
          if (!P.dead && Math.hypot(gx, gz) < CN.R + T.heroR * 0.5 && Math.abs(angDiff(b.face, Math.atan2(gx, gz))) < CN.a * 0.5 + 0.08) hurtPlayer(b.dmg, b.x, b.z, 1.5);
        }
        if (b.stT >= b.phD) bossEnd(b, 0.9, 1.3);
        break;
      }
      case 'toss': {   // three silver horseshoes lobbed onto circles: the first where Feza stands, the others around him
        const t0 = SOV.tossAt[0] * b.phD;
        if (b.stT < t0) { b.face = dampAngle(b.face, faceP, 5, dt); chargeFxAt(muzzle(b), '#fff3c4', b.stT / t0); }
        if (b.did < 3 && b.stT >= SOV.tossAt[b.did] * b.phD) {
          const m = muzzle(b), rm = bossRoom(), mx = m.x, my = m.y, mz = m.z;
          for (let i = 0; i < 8; i++) {
            let tx = P.pos.x, tz = P.pos.z;
            if (b.did > 0 || i > 0) { const a = frand(0, TAU), r = frand(1.8, 4.2); tx += Math.sin(a) * r; tz += Math.cos(a) * r; }
            if (!isFloor(tx, tz) || (rm && !inRoom(rm, tx, tz, 0.6))) continue;
            spawnMortar({ x0: mx, y0: my, z0: mz, x1: tx, z1: tz, dur: frand(SOV.fly[0], SOV.fly[1]), h: SOV.shoeH, r: SOV.shoeR, dmg: b.dmg * 0.6, kind: 'horseshoe' });
            break;
          }
          sfx('whoosh', { x: b.x, z: b.z, pitch: 1.25, vol: 0.7 }); sfx('clank', { x: b.x, z: b.z, vol: 0.4, pitch: 1.3 });
          b.did++;
        }
        if (b.stT >= b.phD) bossEnd(b, 1.0, 1.5);
        break;
      }
      case 'dizzy':   // all three banners are down: stars around his helmet, the horse sways — he does nothing (whack him!)
        st.move = 0;
        if (Math.random() < dt * 3) burst('star', b.x + frand(-0.4, 0.4), b.height + 0.25, b.z + frand(-0.4, 0.4), { count: 2, color: '#fff3a0' });
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      // (Round 6, BONUS.havuc) 'seek': Feza holds the carrot — the hungry horse trots to him (no attacks) until its front is
      // close enough to take it; 'munch': the horse chews happily, the knight sulks with crossed arms (whack him!)
      case 'seek': {
        const Q = bonusOf(b), H0 = BONUS.havuc;
        if (!Q || Q.stage !== 'held') { bossEnd(b, 0.5, 0.9); break; }
        if (d <= b.r + H0.feed) { havucFeed(b, Q); break; }
        bossWalk(b, ux, uz, H0.seek * (hard ? HC.speed : 1), dt);
        st.move = Math.min(1, H0.seek / Math.max(1, b.speed));
        if ((b.trailT -= dt) <= 0) { b.trailT = 0.2; hoofFx(b, 1, 2); }
        break;
      }
      case 'munch': {
        st.move = 0;
        b.face = dampAngle(b.face, faceP, 2, dt);
        b.chew = (b.chew || 0) - dt;
        if (b.chew <= 0) {
          b.chew += 0.5;
          let m = null;
          if (b.m.marker) { try { m = b.m.marker('mouth', _hornV); } catch (err) { warnOnce('marker mouth', err); } }
          if (!m || !isFinite(m.x)) m = muzzle(b);
          sfx('munch', { x: b.x, z: b.z, pitch: frand(0.95, 1.1) });
          burst('crumbs', m.x, m.y, m.z, { count: 5, color: '#ff9a2a' });
        }
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      }
      default: bossPhase(b, 'idle', 1); b.wait = 0.5;
    }
  }
  // ── Round 6: the bosses' bonus ideas (BOSS_KIT[type].bonus; the approved plan test/r6_PLAN.md §0 / §1). One optional,
  // kid-readable thing per boss: do it and the boss is silly and helpless for a few s (its stun phase, bonusStun: no attack,
  // never hurts Feza, whack it!); ignore it and nothing is lost. q.bonus lives on b.encounter ({kind, state 'wait' | 'on' |
  // 'stun' | 'done', t, have, need, hold, stage, …}; a nap / retreat / zone change clears it with everything else and it
  // comes back, unless the kid already won it (b.bonusWon)). It starts only from idle, never during a raid move or with a
  // summon waiting, and while it runs (hold) or the boss is stunned the TBC clock waits; afterwards q.timer ≥ timerAfter.
  // Its pickable things are L.breakObjs entries with .bonus (a tap walks Feza there, a swing / skill / wand shot hits them,
  // no loot; touching the crown / carrot / hearts takes them too). Pooled models: EMODEL.jellyCrown / havuc / serinTas / hole
  // (plain Kit stand-ins while 05 has none), FX.projectile('heart' | 'bigbubble'), FX.marker (the gold / pink "come here"
  // hoop), FX.dizzy (stars round a stunned head) — all optional. Zor: stuns × hcStun, the mole peeks shorter, the
  // bubble takes one more hit, the hearts last less, the king waddles faster. Numbers (BONUS, s / m / m/s / hp fractions):
  //   tac      at hp · hopD / hopR the big crown hop (its circle fills hopD × 0.8 = 2 s) · fly s the crown's arc to a spot
  //            spot m from the king · walk m/s its waddle after oops s · touch Feza's reach · back s the crown flying home ·
  //            stun s 'blush' · king m it grabs the crown from in front of its belly · max s then it gets it anyway
  //   balon    w pick weight of 'blow' (from b.r + 3 m on) · cd s between blows · first s after the hp mark the first blow is
  //            due (then every gap s after the last: blows at any distance; closer than b.r + back + 1 m it scoots back up to
  //            back m while it inhales) · D s 'blow' · at hp · r0 → r the bubble grows
  //            · speed / turn it floats after Feza · life s · hits (HC hitsHC) to pop · dmgK × b.dmg when it touches him (not in
  //            its first grace s of flight) · stun
  //   avla     at · holes on a ring m round the arena's middle · travel m/s underground · mark s the mound trembles on the
  //            gold hoop · peek (HC peekHC) s its head is out · bonk s · need bonks → 'dizzy' stun s · max peeks, then an
  //            ordinary pop-up under a lastTele s red circle
  //   serintas at · n rocks on a ring m, r m each · hideW × the roll's weight while they stand · front m in front of its
  //            shell at a roll's end → 'flip' stun s (≤ flips) · pop s they rise
  //   havuc    at (the banners down and done, or still all standing: then ≥ banGap m from each) · spot m ≥ from the knight · touch · seek m/s the horse trots to Feza · feed m in
  //            front of its nose · fly s into its mouth · stun s 'munch' · y the carrot over Feza's head
  //   kalp     at (one wave each) · D s 'sigh', the hearts at blowAt · n hearts on a ring m, eggGap / heroGap m clear ·
  //            life (HC lifeHC) s hovering · touch · send s the big heart to the dragon · dmgK × maxHp · stun s 'charmed'
  const BONUS = {
    tac:      { at: 0.55, hopD: 2.5, hopR: 3.4, fly: 1.0, spot: [5, 7], walk: 1.3, oops: 1.2, touch: 1.1, back: 0.6, stun: 3.5, king: 1.2, max: 12 },
    balon:    { w: 0.25, cd: 10, first: 0.8, gap: [10, 14], back: 2.2, grace: 1.0, D: 2.4, at: 0.75, r0: 0.35, r: 1.0, speed: 1.5, turn: 0.6, life: 9, hits: 2, hitsHC: 3, dmgK: 0.45, stun: 3.0, kb: 0.9, y: 1.15 },
    avla:     { at: 0.5, holes: 4, ring: 4.5, travel: 8, mark: 1.2, peek: 1.6, peekHC: 1.3, bonk: 0.45, need: 3, max: 6, stun: 4, lastTele: 2.0, peekBur: 0.6 },
    serintas: { at: 0.7, n: 3, ring: 5, r: 0.75, hideW: 1.6, front: 0.9, stun: 4.5, pop: 0.4, flips: 3, crack: 0.35 },
    havuc:    { at: 0.4, banGap: 6, spot: 5, touch: 1.0, seek: 2.4, feed: 1.2, fly: 0.4, stun: 5, y: 2.0, scale: 1.4 },
    kalp:     { at: [0.8, 0.55, 0.3], D: 1.6, blowAt: 0.55, n: 3, ring: [5, 7], eggGap: 2.2, heroGap: 2.5, life: 14, lifeHC: 10, touch: 1.1, send: 0.8, dmgK: 0.05, stun: 4, fly: 1.2, y: 1.0 },
    hcStun: 0.8, timerAfter: 4,
  };
  const GOLD_MARK = '#ffd23f', PINK_MARK = '#bc4743';
  const bonusOf = b => (b && b.encounter && b.encounter.bonus) || null;
  const bonusHold = q => { const Q = q && q.bonus; return !!Q && (Q.state === 'stun' || (Q.state === 'on' && Q.hold)); };
  const canStartBonus = (b, q) => b.ph === 'idle' && !q.move && !b.summon && !P.dead && GAME.state === 'play' && !(q.bonus && gt < (q.bonus.after || 0));
  const hpFrac = b => b.hp / Math.max(1, b.maxHp);
  function bonusEvent(b, Q, on) {
    emit('bonus', { on: on !== undefined ? !!on : Q.state === 'on' || Q.state === 'stun', kind: Q.kind, type: b.type, have: Q.have, need: Q.need, state: Q.state });
  }
  function bonusLine(b, flag, k) { if (!b[flag] && hasLine(k)) { b[flag] = true; say(k, 2); } }   // (once per fight; unknown keys: silent)
  function bonusRelease(b, q, Q, state) {   // the bonus stops without a stun (the boss got its crown, the bubble faded…)
    Q.state = state; Q.hold = false; Q.stage = null;
    if (state === 'wait') Q.after = gt + 3;   // (a breather before it can come again)
    if (q) q.timer = Math.max(q.timer, BONUS.timerAfter + 0.02);   // (+ a frame: the clock ticks on in this one)
    remove(Q.mark); Q.mark = null;
    bonusEvent(b, Q, false);
  }
  function unBreak(o) {   // out of L.breakObjs (broken: a tap walking to it gives up)
    if (!o) return;
    o.broken = true;
    const i = L && L.breakObjs ? L.breakObjs.indexOf(o) : -1;
    if (i >= 0) L.breakObjs.splice(i, 1);
  }
  function addBreak(o) { if (L) (L.breakObjs || (L.breakObjs = [])).push(o); return o; }
  // The boss's stun: whatever it was doing stops (a raid move, a telegraph, its lobbed shots still in the air turn into
  // sparkles), then its stun phase for D s. own: a bonus stun (Zor × hcStun, q.bonus → 'stun'); the knight's banners'
  // dizzy (Round 5) keeps its full length.
  function bonusStun(b, phase, D, own = true) {
    const q = b.encounter;
    if (q && q.move) clearRaidMove(q);
    remove(b.tele); b.tele = null; b.y = 0; b.st.air = 0; b.crownHop = false;
    for (let i = mortars.length - 1; i >= 0; i--) {
      const m = mortars[i];
      burst('sparkle', m.obj.position.x, m.obj.position.y, m.obj.position.z, { color: m.kind === 'horseshoe' ? '#f4f8ff' : '#ffd08a', count: 10 });
      remove(m.tele); killProjectileObj(m); mortars.splice(i, 1);
    }
    bossPhase(b, phase, D * (own && hard ? BONUS.hcStun : 1));
    if (own) { sfx('guardBreak', { x: b.x, z: b.z, vol: 0.8 }); burst('oath', b.x, 0.2, b.z, { radius: Math.max(1, b.r), color: '#bd947c' }); }
    const Q = own && q && q.bonus;
    if (Q) { Q.state = 'stun'; Q.stunPh = phase; Q.hold = true; Q.stunAt = gt; remove(Q.mark); Q.mark = null; bonusEvent(b, Q, true); }
  }
  function bonusStunEnd(b, q, Q) {
    remove(Q.dz); Q.dz = null; Q.stunPh = null; Q.hold = false; Q.stage = null;
    q.timer = Math.max(q.timer, BONUS.timerAfter + 0.02);   // (+ a frame: the clock ticks on in this one)
    const k = Q.kind;
    Q.state = k === 'balon' ? 'wait' : k === 'kalp' ? ((b.kalpWave || 0) < BONUS.kalp.at.length ? 'wait' : 'done')
      : k === 'serintas' ? (serinRocks(b) && Q.have < BONUS.serintas.flips ? 'on' : 'done') : 'done';
    if (k === 'serintas' && Q.state === 'done') serinClear(Q, true);
    bonusEvent(b, Q, Q.state === 'on');
  }
  function bonusStep(b, q, dt) {
    const kind = b.kit && b.kit.bonus;
    if (!kind || !BONUS[kind] || b.dead) return;
    let Q = q.bonus;
    if (!Q) {
      if (b.bonusWon) return;
      Q = q.bonus = { kind, state: 'wait', t: 0, have: 0, need: kind === 'avla' ? BONUS.avla.need : kind === 'kalp' ? BONUS.kalp.n : 1, hold: false, stage: null,
        stunPh: null, dz: null, mark: null };
    }
    Q.t += dt;
    if (Q.state === 'stun') {
      if (Q.dz) Q.dz.move(b.x, b.y + b.height * (1 - 0.7 * (b.bur || 0)) + 0.3, b.z);
      if (b.ph !== Q.stunPh) bonusStunEnd(b, q, Q);
    }
    BONUS_STEP[kind](b, q, Q, dt);
  }
  function bonusHit(o) {   // (breakObj) a swing, a skill, a wand shot or a tap hit one of the bonus things
    const b = boss, Q = bonusOf(b);
    if (!Q || o.broken || !b || b.dead) return;
    if (o.bonus === 'tac') tacGive(b, Q);
    else if (o.bonus === 'balon') balonHit(b, Q);
    else if (o.bonus === 'havuc') havucTake(b, Q);
    else if (o.bonus === 'kalp' && o.heart) kalpTake(b, Q, o.heart);
  }
  function clearBonus(b, q, cheer) {   // (clearEncounter: nap, calm, zone change; cheer: the boss cheered up — a sparkly poof)
    if (b && b.st) b.st.crownOff = 0;
    const Q = q && q.bonus;
    if (!Q) return;
    const poof = (x, y, z, col) => { if (cheer) burst('sparkle', x, y, z, { color: col || '#ffe27a', count: 12 }); };
    remove(Q.mark); remove(Q.dz); Q.mark = Q.dz = null;
    if (Q.crown) {
      const c = Q.crown; poof(c.x, c.y, c.z); if (cheer) burst('sparkle', b.x, b.height, b.z, { color: '#ffe27a', count: 14 });
      givePool(c.p); unBreak(c.brk); Q.crown = null;
    }
    if (Q.bub) { const u = Q.bub; burst('bigPop', u.x, u.y, u.z, { scale: u.s, ring: false }); bubbleGone(u); Q.bub = null; }
    for (const h of Q.holes || []) { poof(h.x, 0.3, h.z, '#e8c89a'); givePool(h.p); }
    Q.holes = [];
    serinClear(Q, cheer);
    if (Q.carrot) { const c = Q.carrot; poof(c.x, c.y, c.z, '#ffb24a'); givePool(c.p); unBreak(c.brk); Q.carrot = null; }
    for (const h of Q.hearts || []) if (!h.done) { poof(h.x, h.y, h.z, '#ab6a5e'); kalpGone(h); }
    Q.hearts = [];
    if (Q.big) { kalpGone(Q.big); Q.big = null; }
    if (Q.state === 'on' || Q.state === 'stun') { Q.state = 'wait'; bonusEvent(b, Q, false); }
    q.bonus = null;
  }

  // ── pooled models (EMODEL's, else plain stand-ins) and the "come here" hoops / dizzy stars (FX's, else stand-ins) ──
  const BONUS_MODEL = { crown: ['jellyCrown', 1], carrot: ['havuc', 1], rock: ['serinTas', 3], hole: ['hole', 4], heart: [null, 4], bubble: [null, 1] };
  const BONUS_POOLS = { tac: ['crown'], balon: ['bubble'], avla: ['hole'], serintas: ['rock'], havuc: ['carrot'], kalp: ['heart'] };
  function bonusPool(kind) {
    const all = R.bonusP || (R.bonusP = {});
    if (all[kind]) return all[kind];
    const spec = BONUS_MODEL[kind], list = all[kind] = [];
    for (let i = 0; i < spec[1]; i++) {
      let m = null;
      if (spec[0] && typeof EMODEL !== 'undefined' && EMODEL && typeof EMODEL[spec[0]] === 'function') { try { m = EMODEL[spec[0]](); } catch (err) { warnOnce('EMODEL.' + spec[0], err); } }
      if (!m || !m.root) m = BONUS_FALLBACK[kind]();
      m.root.userData.bonus = kind;
      list.push({ m, used: false });
    }
    return list;
  }
  function takePool(kind) {
    const p = bonusPool(kind).find(q => !q.used);
    if (!p) return null;
    p.used = true; const r = p.m.root; r.visible = true; r.scale.setScalar(1); r.rotation.set(0, 0, 0); r.position.set(0, 0, 0); scene.add(r);
    return p;
  }
  function givePool(p) { if (!p) return; removeObj(p.m.root); p.m.root.scale.setScalar(1); p.used = false; }
  function poolAnim(p, dt, s) { if (p && p.m.anim) { try { p.m.anim(dt, s); } catch (err) { warnOnce('bonus.anim', err); } } }
  // FX's projectile of that kind, or null when this FX build does not know it (it would make its star instead)
  const FXK = {};
  function fxProj(kind, color) {
    if (FXK[kind] === false) return null;
    const o = fx('projectile', kind, color);
    if (!o) { FXK[kind] = false; return null; }
    const u = o.userData && o.userData.fxp;
    if (u && u.star && kind !== 'star') { FXK[kind] = false; killProjectileObj(o); return null; }
    FXK[kind] = true;
    return o;
  }
  function kitModel(k, name, o) {
    const mat = vcMat(Object.assign({ roughness: 0.5 }, o || {})), mesh = new THREE.Mesh(k.build(), mat);
    mesh.castShadow = true;
    const root = new THREE.Group(), body = new THREE.Group(); body.add(mesh); root.add(body); root.name = name;
    return { root, body, mesh, mat, fallback: true, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
  }
  // anim(dt, {spin, glow, bob}) etc.: 0..1 amounts (GAME places the root, with its own little bob)
  const BONUS_FALLBACK = {
    crown() {   // a chunky golden crown with five points and three jelly gems
      const k = new Kit();
      k.add(G.cyl(1, 1.08, 18), '#ffd23f', [0, 0.1, 0], 0, [0.3, 0.2, 0.3]);
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5;
        k.add(G.cone(8), '#ffd23f', [Math.sin(a) * 0.27, 0.3, Math.cos(a) * 0.27], 0, [0.075, 0.2, 0.075]);
        k.add(G.sphere(8), '#fff3a0', [Math.sin(a) * 0.27, 0.42, Math.cos(a) * 0.27], 0, 0.04);
      }
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; k.add(G.sphere(10), i ? '#5cc8ff' : '#ff5aa0', [Math.sin(a) * 0.31, 0.1, Math.cos(a) * 0.31], 0, 0.06); }
      const m = kitModel(k, 'bonusCrown', { metalness: 0.35, roughness: 0.3, emissive: '#6a4a00', emissiveIntensity: 0.3 });
      m.anim = (dt, s) => { s = s || {}; m.t = (m.t || 0) + dt; m.body.rotation.y += dt * TAU * (s.spin || 0); m.body.position.y = (s.bob || 0) * (0.18 + 0.06 * Math.sin(m.t * 2.6)); m.mat.emissiveIntensity = 0.3 + 0.6 * (s.glow || 0); };
      return m;
    },
    carrot() {   // a cute golden-orange carrot, leafy top, two dot eyes
      const k = new Kit();
      k.add(G.cone(12), '#ff8a1c', [0, 0.2, 0], [Math.PI, 0, 0], [0.12, 0.42, 0.12]);
      for (let i = 0; i < 3; i++) { const a = (i - 1) * 0.45; k.add(G.cone(6), '#5ccf4a', [Math.sin(a) * 0.05, 0.5, 0], [0, 0, -a], [0.05, 0.22, 0.05]); }
      for (const sx of [-1, 1]) k.add(G.sphere(6), '#3a2410', [0.045 * sx, 0.33, 0.1], 0, 0.018);
      const m = kitModel(k, 'bonusCarrot', { roughness: 0.45, emissive: '#6a2a00', emissiveIntensity: 0.25 });
      m.anim = (dt, s) => { s = s || {}; m.t = (m.t || 0) + dt; m.body.rotation.y += dt * TAU * (s.spin || 0); m.body.position.y = (s.bob || 0) * (0.14 + 0.07 * Math.sin(m.t * 2.8)); m.mat.emissiveIntensity = 0.25 + 0.55 * (s.glow || 0); };
      return m;
    },
    rock() {   // a round glossy mint-blue boulder (no face) with a frosty highlight
      const k = new Kit();
      k.add(G.ico(1), '#9fe8e6', [0, 0.6, 0], 0, [0.8, 0.66, 0.8]);
      k.add(G.sphere(8), '#eaffff', [0.28, 0.98, 0.3], 0, 0.1);
      k.add(G.sphere(8), '#eaffff', [-0.3, 0.8, 0.4], 0, 0.06);
      const m = kitModel(k, 'bonusRock', { roughness: 0.28, emissive: '#2aa8b8', emissiveIntensity: 0.3 });
      m.anim = (dt, s) => {
        s = s || {}; const p = s.pop === undefined ? 1 : s.pop, c = s.crack || 0, u = p - 1;
        const sc = Math.max(0.01, (1 + 2.2 * u * u * u + 1.2 * u * u) * (1 - 0.6 * c));
        m.body.scale.set(sc, sc * (1 - 0.3 * c), sc); m.body.position.y = -0.4 * c;
        m.mat.emissiveIntensity = 0.3 + 0.4 * (s.glow || 0);
      };
      return m;
    },
    hole() {   // a dark dirt hole with a lumpy rim
      const k = new Kit();
      k.add(G.sphere(18), '#3b2716', [0, 0.01, 0], 0, [0.85, 0.035, 0.85]);
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9; k.add(G.sphere(8), i % 2 ? '#9a7550' : '#8a6644', [Math.sin(a) * 0.9, 0.05, Math.cos(a) * 0.9], 0, [0.24, 0.12, 0.2]); }
      const m = kitModel(k, 'bonusHole', { roughness: 1 });
      m.mesh.castShadow = false; m.mesh.receiveShadow = true;
      m.anim = (dt, s) => { s = s || {}; const o = Math.max(0.01, s.open === undefined ? 1 : s.open); m.body.scale.set(o, 1, o); m.body.position.x = (s.shake || 0) * 0.04 * Math.sin(gt * 40); };
      return m;
    },
    heart() {   // a glossy pink friendship heart (FX's 'heart' shot when there is one)
      if (!R.pinkHeart) { heartGeo(); R.pinkHeart = rimify(stdMat({ color: '#a83945', roughness: 0.2, metalness: 0.05, emissive: '#721b2c', emissiveIntensity: 0.35 }), '#c2a7a1', 0.35, 2.6); }
      const mesh = new THREE.Mesh(heartGeo(), R.pinkHeart), root = new THREE.Group(), body = new THREE.Group();
      mesh.castShadow = true; mesh.scale.setScalar(1.2); body.add(mesh); root.add(body); root.name = 'bonusHeart';
      return { root, body, fallback: true, anim(dt) { body.rotation.y += dt * 2; }, dispose() {} };
    },
    bubble() {   // a giant soap bubble, radius 1 (FX's 'bigbubble' when there is one)
      const mat = new THREE.MeshStandardMaterial({ color: '#e4f4ff', transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0.1, emissive: '#8fd0ff', emissiveIntensity: 0.3, depthWrite: false });
      const mesh = new THREE.Mesh(G.sphere(28), mat), root = new THREE.Group(); mesh.renderOrder = 24; root.add(mesh); root.name = 'bonusBubble';
      return { root, fallback: true, anim() {}, dispose() { mat.dispose(); } };
    },
  };
  // FX.marker / FX.dizzy, else a plain stand-in: a pulsing gold (or pink) hoop with rising sparkles / stars round a head
  const fbFx = [];
  function fbHandle(it) {
    it.kill = () => { if (it.obj) { removeObj(it.obj); it.obj = null; } const i = fbFx.indexOf(it); if (i >= 0) fbFx.splice(i, 1); };
    fbFx.push(it);
    return { obj: it.obj, move(x, a, b2) { if (it.dizzy) { it.x = x; it.y = a; it.z = b2; } else { it.x = x; it.z = a; } }, remove: it.kill };
  }
  function bonusMark(x, z, r, color) {
    if (typeof FX !== 'undefined' && FX && typeof FX.marker === 'function') { const h = fx('marker', x, z, r, 0, color); if (h) return h; }
    const obj = decal(lootRingMat(color), r * 2.1); obj.position.set(x, 0.05, z); scene.add(obj);
    return fbHandle({ x, z, r, t: 0, acc: 0, color, obj });
  }
  function bonusDizzy(b) {
    const y = b.height + 0.3, r = Math.max(0.55, b.r * 0.45);
    if (typeof FX !== 'undefined' && FX && typeof FX.dizzy === 'function') { const h = fx('dizzy', b.x, y, b.z, r, 0); if (h) return h; }
    return fbHandle({ dizzy: true, x: b.x, y, z: b.z, r, t: 0, acc: 0 });
  }
  function fbStep(dt) {
    for (const it of fbFx) {
      it.t += dt; it.acc += dt;
      if (it.dizzy) {
        if (it.acc > 0.12) { it.acc = 0; const a = it.t * 3.4; burst('star', it.x + Math.cos(a) * it.r, it.y, it.z + Math.sin(a) * it.r, { count: 1, color: '#fff3a0' }); }
      } else if (it.obj) {
        it.obj.position.set(it.x, 0.05, it.z); it.obj.scale.setScalar(it.r * 2.1 * (1 + 0.04 * (1 - Math.cos(it.t * TAU * 3))));
        while (it.acc >= 0.08) {
          it.acc -= 0.08;
          const a = frand(0, TAU);
          emitP(it.x + Math.sin(a) * it.r, 0.12, it.z + Math.cos(a) * it.r, 0, frand(0.8, 1.4), 0, frand(0.7, 1.0), frand(0.18, 0.28), 0.04, it.color, '#fff6c8', 2, -0.2, 0.6);
        }
      }
    }
  }
  function fbClear() { for (const it of fbFx.slice()) it.kill(); }
  // A free spot on the floor: a ring round (cx, cz) at radius r0..r1, in the boss room, room for rad, `ok` for the rest
  function bonusSpotOn(cx, cz, r0, r1, rad, ok, tries = 32) {
    const rm = bossRoom(), a0 = frand(0, TAU);
    for (let k = 0; k < tries; k++) {
      const a = a0 + k * 2.39996, rr = lerp(r0, r1, ((k * 0.618) % 1)), x = cx + Math.sin(a) * rr, z = cz + Math.cos(a) * rr;
      if (isFloor(x, z) && circleFree(x, z, rad) && inRoom(rm, x, z, rad + 0.6) && (!ok || ok(x, z))) return { x, z };
    }
    return null;
  }
  const nearPortal = (x, z, d) => !!(L && L.portalObj && dist2(x, z, L.portalObj.x, L.portalObj.z) < d * d);
  // (Round 6 QA) a spot the kid can see from the boss camera: not far down toward the camera (+z = the bottom of the screen)
  // and not across the whole arena — the crown / carrot / hearts try such spots first (a carrot on the south rim lay 16 m
  // below Feza, off the screen)
  const BONUS_VIEW = { south: 3.5, far: 11 };
  const inView = (x, z) => z - P.pos.z <= BONUS_VIEW.south && dist2(x, z, P.pos.x, P.pos.z) <= sq(BONUS_VIEW.far);
  const viewFirst = ok => (x, z) => inView(x, z) && (!ok || ok(x, z));

  // ── Çürük Taç: "Taç Kovalamaca". Below at hp, from idle: a big crown hop at Feza (a bigger, longer circle); on landing its
  // crown flies off to a free spot (gold hoop) — "Taç düştü!". Oops, then it waddles over to get it (no attacks). Feza first
  // (touch or hit): the crown flies back onto its head and it blushes (stun); the king first: it just puts it back on. ──
  function tacStep(b, q, Q, dt) {
    const B = BONUS.tac;
    if (Q.state === 'wait') {
      if (hpFrac(b) <= B.at && canStartBonus(b, q)) {
        Q.state = 'on'; Q.hold = true; Q.stage = 'hop'; Q.t = 0; Q.have = 0; Q.need = 1;
        jellyHop(b, B.hopD, B.hopR, true);
        bonusEvent(b, Q, true);
      }
      return;
    }
    if (Q.state !== 'on') return;
    const c = Q.crown;
    if (!c) { if (b.ph !== 'hop') bonusRelease(b, q, Q, 'wait'); return; }   // (the hop never landed: try again later)
    c.t += dt;
    if (c.stage === 'fly') {   // an arc off its head to the spot
      const k = clamp(c.t / B.fly, 0, 1);
      c.x = lerp(c.x0, c.x1, k); c.z = lerp(c.z0, c.z1, k); c.y = lerp(c.y0, 0.05, k) + 4 * 1.8 * k * (1 - k);
      c.rot += dt * 9;
      if (k >= 1) {
        c.stage = 'lie'; c.t = 0; c.brk.x = c.x; c.brk.z = c.z; addBreak(c.brk);
        burst('sparkle', c.x, 0.4, c.z, { color: '#ffe27a', count: 14 }); burst('dust', c.x, 0.05, c.z, { count: 6 });
        sfx('clank', { x: c.x, z: c.z, pitch: 1.5, vol: 0.6 }); sfx('bounce', { x: c.x, z: c.z, pitch: 1.4, vol: 0.5 });
      }
    } else if (c.stage === 'lie') {
      c.y = 0.02; c.rot += dt * 0.5;   // (it bobs and glows by itself: anim bob / glow)
      if (!P.dead && dist2(P.pos.x, P.pos.z, c.x, c.z) <= B.touch * B.touch) tacGive(b, Q);
      else if (Q.t > B.max) tacKingGets(b, Q);
      else if (b.ph === 'idle') bossPhase(b, 'shy', 60);   // (a stray idle: back to waddling after it)
    } else if (c.stage === 'back') {   // flying home onto its head
      const k = clamp(c.t / B.back, 0, 1), hx = b.x, hy = b.height + 0.1, hz = b.z;
      c.x = lerp(c.x0, hx, k); c.z = lerp(c.z0, hz, k); c.y = lerp(c.y0, hy, k) + 4 * 1.2 * k * (1 - k); c.rot += dt * 12;
      if (Math.random() < dt * 20) emitP(c.x, c.y, c.z, frand(-0.3, 0.3), frand(0.2, 0.6), frand(-0.3, 0.3), 0.5, 0.22, 0.03, '#ffe27a', '#ffffff', 2, 0, 0.5);
      if (k >= 1) {
        givePool(c.p); Q.crown = null; b.st.crownOff = 0; b.bonusWon = true;
        bonusStun(b, 'blush', B.stun);
        burst('hearts', b.x, b.height * 0.8, b.z, { count: 10 }); burst('sparkle', b.x, b.height, b.z, { color: '#ffe27a', count: 16 });
        ftext(b.x, b.height + 0.6, b.z, 'Mühür kırıldı!', 'word'); sfx('pop', { x: b.x, z: b.z, pitch: 1.4 });
        bonusLine(b, 'saskinSaid', 'kraljole_saskin');
        return;
      }
    }
    if (Q.crown) {
      const r = c.p.m.root; r.position.set(c.x, c.y, c.z); r.rotation.set(c.stage === 'fly' ? Math.sin(c.rot) * 0.5 : 0, c.rot, 0);
      poolAnim(c.p, dt, { spin: 0, glow: c.stage === 'lie' ? 1 : 0.6, bob: c.stage === 'lie' ? 1 : 0 });
    }
  }
  function tacLand(b) {   // (kraljoleStep: the big crown hop landed) the crown pops off its head and flies to a free spot
    const Q = bonusOf(b), B = BONUS.tac;
    if (!Q || Q.kind !== 'tac' || Q.state !== 'on' || Q.crown) return;
    const far = (x, z) => dist2(x, z, P.pos.x, P.pos.z) >= 9 && dist2(x, z, b.x, b.z) >= 9 && !nearPortal(x, z, 2.5);
    const spot = bonusSpotOn(b.x, b.z, B.spot[0], B.spot[1], 0.55, viewFirst(far), 40) || bonusSpotOn(b.x, b.z, B.spot[0], B.spot[1], 0.55, far)
      || bonusSpotOn(b.x, b.z, 3.5, 8.5, 0.5, far, 40);
    if (!spot) return;   // (nowhere to land: the crown stays on — the hop ends as a normal one)
    const p = takePool('crown');
    if (!p) return;
    let h = null;
    if (b.m.marker) { try { h = b.m.marker('crown', new THREE.Vector3()); } catch (err) { warnOnce('marker crown', err); } }
    const x0 = h && isFinite(h.x) ? h.x : b.x, y0 = h && isFinite(h.y) ? h.y : b.height, z0 = h && isFinite(h.z) ? h.z : b.z;
    b.st.crownOff = 1;
    Q.crown = { p, stage: 'fly', t: 0, x0, y0, z0, x1: spot.x, z1: spot.z, x: x0, y: y0, z: z0, rot: 0,
      brk: { x: spot.x, z: spot.z, r: 0.55, kind: 'bonus', bonus: 'tac', broken: false, tapY: 0.35, tapLim: 80, break() {} } };
    Q.stage = 'off';
    Q.mark = bonusMark(spot.x, spot.z, 0.9, GOLD_MARK);
    ftext(b.x, b.height + 0.6, b.z, 'Taç düştü!', 'word');
    sfx('pop', { x: b.x, z: b.z, pitch: 1.2 }); sfx('whoosh', { x: b.x, z: b.z, pitch: 1.4, vol: 0.6 });
    burst('sparkle', x0, y0, z0, { color: '#ffe27a', count: 12 });
    bonusLine(b, 'tacSaid', 'kraljole_tac');
  }
  const tacOn = b => { const Q = bonusOf(b); return !!(Q && Q.kind === 'tac' && Q.state === 'on' && Q.crown); };
  function tacGive(b, Q) {   // Feza got there first: the crown flies back onto its head
    const c = Q.crown;
    if (!c || c.stage !== 'lie') return;
    unBreak(c.brk); remove(Q.mark); Q.mark = null;
    c.stage = 'back'; c.t = 0; c.x0 = c.x; c.y0 = c.y; c.z0 = c.z;
    Q.have = 1; bonusEvent(b, Q, true);
    burst('sparkle', c.x, 0.5, c.z, { color: '#ffe27a', count: 16 }); sfx('pop', { x: c.x, z: c.z, pitch: 1.5 });
    C.cheerT = Math.max(C.cheerT, 0.5);
  }
  function tacKingGets(b, Q) {   // the king got there first (or it took too long): it puts its crown back on — no stun
    const c = Q.crown;
    if (c) { unBreak(c.brk); givePool(c.p); Q.crown = null; }
    bossPhase(b, 'crownon', 0.8);
    bonusRelease(b, b.encounter, Q, 'done');
  }

  // ── Kefir Devi: "Dev Köpük Balonu". Below at hp its new move 'blow' (see kefirdevStep) blows one giant bubble that floats
  // slowly after Feza. Hit it `hits` times (Pof! Pof!) → it pops into a heart for Feza and the giant gets the hiccups (stun,
  // after landing if it was mid-slam); touching it pops it on Feza (a soft bonk); after `life` s it pops by itself. ──
  // the blow's beats (05: EDEF.kefirdev.blowAt = [inhale ends, the bubble starts growing at its mouth, it lets go])
  const balonAt = b => (Array.isArray(b.def.blowAt) && b.def.blowAt.length === 3 ? b.def.blowAt : [0.45, 0.5, 0.75]);
  function balonReady(b) {
    const Q = bonusOf(b), B = BONUS.balon;
    return !!Q && Q.kind === 'balon' && Q.state === 'wait' && hpFrac(b) <= B.at && gt - (Q.lastBlow === undefined ? -99 : Q.lastBlow) >= B.cd && !Q.bub && !P.dead;
  }
  // (Round 6 QA: at pick weight 0.25 from 3 m off only, one masher fight went 80 s before a bubble, others had none) —
  // the first is due `first` s after the hp mark, then every gap s; balonReady still keeps cd between two
  function balonDue(b) {
    const Q = bonusOf(b);
    return !!Q && Q.dueAt !== undefined && gt >= Q.dueAt;   // (dueAt: set by balonStep at the hp mark)
  }
  function balonBlow(b) {
    const Q = bonusOf(b), B = BONUS.balon;
    bossPhase(b, 'blow', B.D);
    b.face = Math.atan2(P.pos.x - b.x, P.pos.z - b.z);
    const d = Math.hypot(P.pos.x - b.x, P.pos.z - b.z);
    b.blowBack = clamp(b.r + B.back + 1 - d, 0, B.back);
    Q.dueAt = gt + frand(B.gap[0], B.gap[1]);
    Q.state = 'on'; Q.hold = true; Q.stage = 'blow'; Q.lastBlow = gt; Q.have = 0; Q.need = hard ? BONUS.balon.hitsHC : BONUS.balon.hits;
    sfx('fizz', { x: b.x, z: b.z, vol: 0.8, pitch: 0.7 });
    bonusLine(b, 'balonSaid', 'kefirdev_balon');
    bonusEvent(b, Q, true);
  }
  function balonSpawn(b) {   // (blow 0.5) the bubble starts growing at its mouth
    const Q = bonusOf(b), B = BONUS.balon;
    if (!Q || Q.kind !== 'balon' || Q.bub) return;
    let obj = fxProj('bigbubble'), pool = null;
    if (obj) { if (!obj.parent) scene.add(obj); }
    else { pool = takePool('bubble'); if (!pool) return; obj = pool.m.root; }
    const m = muzzle(b), fx0 = Math.sin(b.face), fz0 = Math.cos(b.face);
    const u = Q.bub = { obj, pool, stage: 'grow', t: 0, x: m.x + fx0 * B.r0, y: m.y, z: m.z + fz0 * B.r0, ang: b.face, s: B.r0, hitT: -9, wob: 0,
      brk: { x: m.x, z: m.z, r: B.r0, kind: 'bonus', bonus: 'balon', broken: false, tapY: 1.2, tapLim: 95, break() {} } };
    addBreak(u.brk);
    Q.stage = 'bubble';
    obj.position.set(u.x, u.y, u.z); obj.scale.setScalar(u.s);
    sfx('bubble', { x: b.x, z: b.z, pitch: 0.55, vol: 0.9 });
  }
  function balonRelease(b) { const Q = bonusOf(b), u = Q && Q.bub; if (u && u.stage === 'grow') { u.stage = 'fly'; u.t = 0; u.ang = b.face; sfx('whoosh', { x: b.x, z: b.z, pitch: 0.8, vol: 0.6 }); } }
  function bubbleGone(u) {
    unBreak(u.brk);
    if (u.pool) givePool(u.pool); else killProjectileObj({ obj: u.obj });
  }
  function balonStep(b, q, Q, dt) {
    const B = BONUS.balon;
    if (Q.dueAt === undefined && hpFrac(b) <= B.at) Q.dueAt = gt + B.first;
    if (Q.pend && b.ph !== 'slam') { Q.pend = false; balonStun(b); return; }   // (popped mid-slam: the hiccups after landing)
    if (Q.state !== 'on' || Q.pend) return;
    const u = Q.bub;
    if (!u) { if (b.ph !== 'blow') bonusRelease(b, q, Q, 'wait'); return; }   // (the blow ended without a bubble)
    u.t += dt; u.wob = Math.max(0, u.wob - dt * 3);
    if (u.stage === 'grow') {
      if (b.ph !== 'blow') { balonPop(b, Q, 'fade'); return; }
      const ba = balonAt(b), k = clamp((b.stT / b.phD - ba[1]) / Math.max(0.05, ba[2] - ba[1]), 0, 1), m = muzzle(b);
      u.s = lerp(B.r0, B.r, smooth01(k)); u.ang = b.face;
      u.x = m.x + Math.sin(b.face) * u.s * 0.95; u.z = m.z + Math.cos(b.face) * u.s * 0.95; u.y = Math.max(u.s, m.y);
    } else {
      const want = Math.atan2(P.pos.x - u.x, P.pos.z - u.z), turn = B.turn * dt;
      if (!P.dead) u.ang += clamp(angDiff(u.ang, want), -turn, turn);
      const nx = u.x + Math.sin(u.ang) * B.speed * dt, nz = u.z + Math.cos(u.ang) * B.speed * dt;
      if (!isFloor(nx, nz) || !inRoom(bossRoom(), nx, nz, 0.2) || u.t >= B.life) { balonPop(b, Q, 'fade'); return; }
      u.x = nx; u.z = nz; u.y = damp(u.y, B.y, 1.6, dt);
      // it floated right into him: a soft bonk (not in its first `grace` s: blown at a kid right next to it, it used to pop on
      // him the moment it left its mouth — now his swings get a moment to pop it)
      if (!P.dead && u.t >= B.grace && dist2(P.pos.x, P.pos.z, u.x, u.z) < sq(u.s + T.heroR * 0.6)) {
        const x = u.x, z = u.z;
        balonPop(b, Q, 'touch');
        hurtPlayer(b.dmg * B.dmgK, x, z, B.kb);
        return;
      }
      fx('trail', 'bigbubble', u.x, u.y, u.z);
    }
    u.brk.x = u.x; u.brk.z = u.z; u.brk.r = u.s;
    const w = 1 + 0.14 * u.wob * Math.sin(u.t * 26);
    u.obj.position.set(u.x, u.y + 0.08 * Math.sin(u.t * 2.6), u.z); u.obj.scale.set(u.s * w, u.s / w, u.s * w);
  }
  function balonHit(b, Q) {   // (breakObj) Pof! — each hit wobbles it; `need` hits pop it
    const u = Q.bub;
    if (!u || gt - u.hitT < 0.2) return;   // (a whirling skill hits every frame: one hit per 0.2 s)
    u.hitT = gt; u.wob = 1; Q.have++;
    ftext(u.x, u.y + u.s + 0.3, u.z, 'Yırtıldı!', 'word');
    sfx('bubble', { x: u.x, z: u.z, pitch: 1.3 }); burst('sparkle', u.x, u.y, u.z, { color: '#e8f6ff', count: 8 });
    bonusEvent(b, Q, true);
    if (Q.have >= Q.need) balonPop(b, Q, 'feza');
  }
  function balonPop(b, Q, how) {   // feza: Feza popped it · touch: it bonked him · fade: it floated away / timed out
    const u = Q.bub; if (!u) return;
    Q.bub = null;
    const x = u.x, y = u.y, z = u.z;
    bubbleGone(u);
    burst('bigPop', x, y, z, { scale: u.s, ring: how === 'feza' }); sfx('bubblePop', { x, z, pitch: how === 'feza' ? 0.6 : 0.8, vol: 1 });
    if (how === 'feza') {
      burst('cheer', x, y, z, { scale: 1.4 }); C.cheerT = Math.max(C.cheerT, 0.6);
      spawnLoot('heart', x, z);
      if (b.ph === 'slam') { Q.pend = true; return; }
      balonStun(b);
    } else bonusRelease(b, b.encounter, Q, 'wait');
  }
  function balonStun(b) {
    const Q = bonusOf(b); if (!Q) return;
    bonusStun(b, 'hiccup', BONUS.balon.stun);
    bonusLine(b, 'hikSaid', 'kefirdev_hik');
  }

  // ── Mezar Kazıcısı: "Saklambaç". Below at hp, from idle: it digs in, 4 holes open on a ring round the arena's middle and
  // it plays hide-and-seek: the mound runs to one hole (a gold hoop on it), trembles, its head pops out for `peek` s — a hit
  // on it is a bonk ("Tak!"). `need` bonks → it comes out dizzy (stun); `max` peeks without them → it pops up the usual way
  // under a lastTele s red circle. The holes then sink away; little moles called meanwhile wait. ──
  function avlaStep(b, q, Q, dt) {
    const B = BONUS.avla;
    if (Q.holes) for (let i = Q.holes.length - 1; i >= 0; i--) {
      const h = Q.holes[i];
      h.open = h.closing ? Math.max(0, h.open - dt / 0.5) : Math.min(1, h.open + dt / 0.35);
      poolAnim(h.p, dt, { open: h.open, shake: h === Q.target && (Q.stage === 'mark' || Q.stage === 'last') ? 1 : 0 });
      if (h.closing && h.open <= 0) { givePool(h.p); Q.holes.splice(i, 1); }
    }
    if (Q.state === 'wait') { if (hpFrac(b) <= B.at && canStartBonus(b, q)) avlaStart(b, q, Q); return; }
    if (Q.state === 'on' && b.ph !== 'avla' && b.ph !== 'peek' && b.ph !== 'bonk') avlaEnd(b, q, Q);   // (cut short somehow)
  }
  function avlaHoles(b) {
    const rm = bossRoom(), B = BONUS.avla, out = [];
    if (!rm) return out;
    const a0 = frand(0, TAU);
    for (let i = 0; i < B.holes; i++) for (let j = 0; j < 14; j++) {
      const a = a0 + i * TAU / B.holes + (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 0.13, rr = B.ring * (1 - Math.floor(j / 7) * 0.2);
      const x = rm.x + Math.sin(a) * rr, z = rm.z + Math.cos(a) * rr;
      if (isFloor(x, z) && circleFree(x, z, 0.9) && inRoom(rm, x, z, 1.2) && dist2(x, z, P.pos.x, P.pos.z) >= 4 && !out.some(h => dist2(h.x, h.z, x, z) < 6.25)) { out.push({ x, z }); break; }
    }
    return out;
  }
  function avlaStart(b, q, Q) {
    const spots = avlaHoles(b);
    if (spots.length < 2) { Q.state = 'done'; return; }
    Q.holes = [];
    for (const s of spots) {
      const p = takePool('hole'); if (!p) break;
      p.m.root.position.set(s.x, 0.02, s.z); p.m.root.rotation.y = frand(0, TAU);
      Q.holes.push({ x: s.x, z: s.z, p, open: 0, closing: false });
      burst('dirt', s.x, 0.1, s.z, { count: 12, color: DIRT }); burst('dust', s.x, 0.05, s.z, { count: 6, color: '#c9a77e' });
    }
    Q.state = 'on'; Q.hold = true; Q.stage = 'sink'; Q.st = 0; Q.peeks = 0; Q.have = 0; Q.need = BONUS.avla.need; Q.cur = null; Q.target = null;
    bossPhase(b, 'avla', 999); b.phM = 'burrow'; b.phTM = 0;
    burst('dirt', b.x, 0.05, b.z, { count: 14, scale: 1.4, color: DIRT }); sfx('dig', { x: b.x, z: b.z, pitch: 0.8 });
    ftext(b.x, b.height + 0.4, b.z, 'Mezar açılıyor!', 'word');
    bonusLine(b, 'saklambacSaid', 'usta_saklambac');
    bonusEvent(b, Q, true);
  }
  function avlaGo(b, Q) {   // the mound runs to another hole: the gold hoop shows where its head will come out
    const others = Q.holes.filter(h => h !== Q.cur && !h.closing);
    const h = others.length ? fpick(others) : Q.cur;
    Q.target = h; Q.stage = 'travel'; Q.st = 0;
    remove(Q.mark); Q.mark = h ? bonusMark(h.x, h.z, 1.45, GOLD_MARK) : null;   // (round its lumpy rim)
    if (!h) Q.stage = 'last';
  }
  function avlaDive(b, dt, sink, R) {   // (kostebekustaStep 'avla') the dive, the underground run, the trembling mound
    const Q = bonusOf(b), B = BONUS.avla, st = b.st;
    b.phM = 'burrow';
    if (!Q || Q.kind !== 'avla' || Q.state !== 'on') {   // (cleared: it pops out where it is)
      b.bur = Math.max(0, b.bur - dt / 0.45); b.phTM = 1;
      if (b.bur <= 0) bossEnd(b, 0.5, 0.9);
      return;
    }
    Q.st += dt;
    const h = Q.target;
    switch (Q.stage) {
      case 'sink':
        b.bur = Math.min(1, Q.st / sink); b.phTM = 0.3 * b.bur; digFx(b, dt, 0.06);
        if (Q.st >= sink) avlaGo(b, Q);
        break;
      case 'travel': {
        b.bur = 1; b.phTM = 0.5; digFx(b, dt, 0.05);
        const dx = h.x - b.x, dz = h.z - b.z, dd = Math.hypot(dx, dz);
        if (dd > 0.02) { const s = Math.min(dd, B.travel * dt); b.x += dx / dd * s; b.z += dz / dd * s; b.face = Math.atan2(dx, dz); st.move = 1; }
        if (dd <= 0.05) { b.x = h.x; b.z = h.z; Q.stage = 'mark'; Q.st = 0; sfx('dig', { x: h.x, z: h.z, pitch: 1.25 }); }
        break;
      }
      case 'mark':   // trembling under the hoop (05: st.windup ≥ 0 shakes the mound)
        b.bur = 1; b.phTM = 0.5; st.windup = clamp(Q.st / B.mark, 0, 1); digFx(b, dt, 0.05);
        b.face = dampAngle(b.face, Math.atan2(P.pos.x - b.x, P.pos.z - b.z), 4, dt);
        if (Q.st >= B.mark) {
          Q.cur = h; Q.stage = 'peek';
          bossPhase(b, 'peek', hard ? B.peekHC : B.peek); b.bur = B.peekBur;
          burst('dirt', b.x, 0.15, b.z, { count: 10, color: DIRT }); sfx('emerge', { x: b.x, z: b.z, pitch: 1.35, vol: 0.6 });
        }
        break;
      case 'last':   // no luck: it pops up the ordinary way, under a red circle
        b.bur = 1; b.phTM = 0.5; st.windup = clamp(Q.st / B.lastTele, 0, 1); digFx(b, dt, 0.05);
        if (Q.st >= B.lastTele) {
          bossPhase(b, 'emerge', (b.def.burrowOut || DIG.rise) + DIG.rec);   // (its ring + b.tele's removal: 'emerge')
          avlaEnd(b, b.encounter, Q);
        }
        break;
      default: Q.stage = 'sink';
    }
  }
  function avlaNext(b, peeked) {   // (peek / bonk over) duck and run on — or, after max peeks, the last pop-up
    const Q = bonusOf(b), B = BONUS.avla;
    if (!Q || Q.kind !== 'avla' || Q.state !== 'on') { bossEnd(b, 0.5, 0.9); return; }
    if (peeked) Q.peeks++;
    bossPhase(b, 'avla', 999); b.phM = 'burrow'; b.phTM = 0.5; b.bur = 1;
    if (Q.peeks >= B.max) {
      Q.stage = 'last'; Q.st = 0; remove(Q.mark); Q.mark = null;
      b.tele = fx('telegraph', b.x, b.z, b.def.slamR || DIG.R, B.lastTele, '#ff7a3a');
      sfx('dig', { x: b.x, z: b.z, pitch: 1.2 });
    } else avlaGo(b, Q);
  }
  function avlaBonk(b) {   // (damage) a hit on its head while it peeks out
    const Q = bonusOf(b), B = BONUS.avla;
    if (!Q || Q.kind !== 'avla' || Q.state !== 'on' || Q.stage !== 'peek') return;
    Q.have++; Q.peeks++; Q.stage = 'bonk';
    const hy = b.height * (1 - B.peekBur) + 0.3;
    ftext(b.x, hy + 0.6, b.z, 'Kemik Darbesi!', 'word'); sfx('bonk', { x: b.x, z: b.z }); burst('bonk', b.x, hy, b.z, {});
    bonusEvent(b, Q, true);
    if (Q.have >= Q.need) {   // caught: out of that hole (no ring), dizzy
      remove(Q.mark); Q.mark = null;
      for (const h of Q.holes) h.closing = true;
      b.bonusWon = true;
      bonusStun(b, 'dizzy', B.stun); Q.dz = bonusDizzy(b);
      ftext(b.x, b.height + 0.5, b.z, 'Kazıcı Açığa Çıktı!', 'word');
      bonusLine(b, 'yakaladinSaid', 'usta_yakaladin');
    } else bossPhase(b, 'bonk', B.bonk);
  }
  function avlaEnd(b, q, Q) { for (const h of Q.holes || []) h.closing = true; bonusRelease(b, q, Q, 'done'); }

  // ── Kül Muhafızı: "Serin Taşlar". Below at hp three cool mint rocks rise (solid: its lane stops at them). A roll
  // that ends with a rock right in front of its shell cracks it and tips the turtle onto its side (stun; ≤ flips). Its
  // rolls come a bit more often while they stand. ──
  function serinStep(b, q, Q, dt) {
    const B = BONUS.serintas;
    if (Q.rocks) for (let i = Q.rocks.length - 1; i >= 0; i--) {
      const r = Q.rocks[i];
      r.t += dt;
      if (r.dead) {   // (05: crack 0 → 1 shakes and whitens it; at 1 GAME hides it and FX's 'crack' bursts)
        r.ct += dt;
        if (r.ct >= B.crack) {
          burst('crack', r.x, 0.7, r.z, { dir: r.dir }); burst('steam', r.x, 0.8, r.z, { count: 10 }); burst('sparkle', r.x, 0.9, r.z, { color: '#bff7f2', count: 12 });
          sfx('pop', { x: r.x, z: r.z, pitch: 0.7 });
          givePool(r.p); serinUnsolid(r); Q.rocks.splice(i, 1); continue;
        }
      }
      const pop = clamp(r.t / B.pop, 0, 1);
      if (r.t >= 0) r.p.m.root.visible = true;
      if (!r.shown && r.t >= 0) { r.shown = true; burst('sparkle', r.x, 0.8, r.z, { color: '#bff7f2', count: 10 }); burst('dust', r.x, 0.05, r.z, { count: 6 }); sfx('pop', { x: r.x, z: r.z, pitch: 0.8 + 0.1 * i }); }
      poolAnim(r.p, dt, { pop, glow: 1, crack: r.dead ? clamp(r.ct / B.crack, 0, 1) : 0 });
      if (!r.dead && Math.random() < dt * 1.5) emitP(r.x + frand(-0.6, 0.6), frand(0.5, 1.2), r.z + frand(-0.6, 0.6), 0, 0.4, 0, 0.8, 0.18, 0.02, '#dffcff', '#ffffff', 2, -0.1, 0.5);
    }
    if (Q.state === 'wait' && hpFrac(b) <= B.at && canStartBonus(b, q)) serinRise(b, q, Q);
  }
  function serinRise(b, q, Q) {
    const rm = bossRoom(), B = BONUS.serintas;
    if (!rm) { Q.state = 'done'; return; }
    const path = (L && L.path) || [];
    const offRoute = (x, z) => !path.some((p, i) => i > 0 && inRoom(rm, p.x, p.z, -2) && raidLineDistance(x, z, path[i - 1].x, path[i - 1].z, p.x, p.z) < 1.8);
    Q.rocks = [];
    for (let i = 0; i < B.n; i++) {
      const ok = (x, z) => dist2(x, z, b.x, b.z) >= sq(Math.max(3, b.r + B.r + 1)) && dist2(x, z, P.pos.x, P.pos.z) >= 4 && !Q.rocks.some(r => dist2(r.x, r.z, x, z) < 6.25)
        && !nearPortal(x, z, 3) && offRoute(x, z);
      const s = bonusSpotOn(rm.x, rm.z, B.ring - 0.4, B.ring + 0.6, B.r + 0.45, ok, 40);
      if (!s) continue;
      const p = takePool('rock'); if (!p) break;
      p.m.root.position.set(s.x, 0, s.z); p.m.root.rotation.y = frand(0, TAU); p.m.root.visible = false;
      const solid = { x: s.x, z: s.z, r: B.r, alive: true, tag: 'serinTas' };
      if (L) { (L.solids || (L.solids = [])).push(solid); L._sh = null; }
      Q.rocks.push({ x: s.x, z: s.z, p, solid, t: -i * 0.18, dead: false, ct: 0, shown: false });
    }
    if (!Q.rocks.length) { Q.state = 'done'; return; }
    Q.state = 'on'; Q.hold = false; Q.have = 0; Q.need = Q.rocks.length;
    ftext(rm.x, 1.8, rm.z, 'Kırık mezar taşları!', 'word');
    bonusLine(b, 'tasSaid', 'kaplumbaga_tas');
    bonusEvent(b, Q, true);
  }
  function serinUnsolid(r) {
    r.solid.alive = false;
    const i = L && L.solids ? L.solids.indexOf(r.solid) : -1;
    if (i >= 0) { L.solids.splice(i, 1); L._sh = null; }
  }
  function serinLaneRock(b, ux, uz, len) {   // does a standing rock end this lane?
    const Q = bonusOf(b);
    if (!Q || Q.kind !== 'serintas' || Q.state !== 'on' || !Q.rocks) return false;
    const ex = b.x + ux * len, ez = b.z + uz * len, reach = b.r * 0.85 + BONUS.serintas.r + 0.6;
    return Q.rocks.some(r => !r.dead && dist2(r.x, r.z, ex, ez) < reach * reach);
  }
  function serinRocks(b) { const Q = bonusOf(b); return Q && Q.kind === 'serintas' && Q.rocks ? Q.rocks.filter(r => !r.dead).length : 0; }
  function serinFlip(b) {   // (lavkaplumbagaStep, a roll's end) a rock right in front of the shell? crack — and over it goes
    const Q = bonusOf(b), B = BONUS.serintas;
    if (!Q || Q.kind !== 'serintas' || Q.state !== 'on' || !Q.rocks || Q.have >= B.flips) return false;
    let hit = null;
    for (const r of Q.rocks) {
      if (r.dead) continue;
      const dx = r.x - b.x, dz = r.z - b.z, d = Math.hypot(dx, dz) || 1e-3;
      if (d <= b.r + B.r + B.front && (dx * b.rdx + dz * b.rdz) / d > 0.7) { hit = r; break; }
    }
    if (!hit) return false;
    hit.dead = true; hit.ct = 0; hit.solid.alive = false; hit.dir = { x: b.rdx, z: b.rdz }; if (L) L._sh = null;
    burst('dust', hit.x, 0.2, hit.z, { count: 10 }); burst('steam', hit.x, 0.8, hit.z, { count: 6 });
    sfx('bounce', { x: b.x, z: b.z, pitch: 0.6 }); sfx('splat', { x: hit.x, z: hit.z, pitch: 1.4, vol: 0.6 }); shake(0.3);
    ftext(b.x, b.height + 0.5, b.z, 'Devrildi!', 'word');
    Q.have++;
    if (Q.have >= B.flips || !serinRocks(b)) b.bonusWon = true;
    bonusStun(b, 'flip', B.stun); Q.dz = bonusDizzy(b);
    bonusLine(b, 'devrildiSaid', 'kaplumbaga_devrildi');
    return true;
  }
  function serinClear(Q, poof) {
    for (const r of Q.rocks || []) { if (poof && !r.dead) burst('sparkle', r.x, 0.8, r.z, { color: '#bff7f2', count: 12 }); givePool(r.p); serinUnsolid(r); }
    Q.rocks = [];
  }

  // ── Yeminbozan: "Havuç". Below at hp (once the banners are done, or while they all still stand
  // — then well away from them; not during their dizzy), a golden carrot lies on the far rim (gold hoop). Feza
  // takes it (touch or hit) and holds it up; the knight's next idle the hungry horse trots to him (no attacks) and, its
  // nose close enough, gets the carrot: it munches happily while the knight sulks (stun). Once per fight. ──
  function havucStep(b, q, Q, dt) {
    const B = BONUS.havuc;
    if (Q.state === 'wait') {
      // (after the banners: once they are all down and he shook off his dizzy — one surprise at a time. Round 6 QA: a kid
      // who never knocks the banners never saw the carrot either → also while they still stand (not during their dizzy),
      // then on the rim well away from them, so a tap meant for a banner does not pick the carrot)
      const S = q.sancak;
      if (hpFrac(b) <= B.at && S && (S.state === 'done' || S.state === 'up') && canStartBonus(b, q)) havucPlant(b, q, Q);
      return;
    }
    const c = Q.carrot;
    if (!c) return;
    c.t += dt;
    if (Q.stage === 'lie') {
      c.x = c.brk.x; c.z = c.brk.z; c.y = 0.05; c.rot += dt * 0.6;
      if (!P.dead && dist2(P.pos.x, P.pos.z, c.x, c.z) <= B.touch * B.touch) havucTake(b, Q);
    } else if (Q.stage === 'held') {   // up over Feza's head
      c.x = P.pos.x; c.z = P.pos.z; c.y = B.y; c.rot += dt * 1.5;
      if (Math.random() < dt * 8) emitP(c.x + frand(-0.3, 0.3), c.y + frand(-0.1, 0.3), c.z + frand(-0.3, 0.3), 0, frand(0.4, 0.9), 0, 0.7, 0.2, 0.03, '#ffd27a', '#ffffff', 2, -0.2, 0.5);
      if (b.ph === 'idle' && !q.move && !b.summon && !P.dead) bossPhase(b, 'seek', 60);
    } else if (Q.stage === 'feed') {   // into the horse's mouth
      const k = clamp(c.t / B.fly, 0, 1), m = havucMouth(b);
      c.x = lerp(c.x0, m.x, k); c.y = lerp(c.y0, m.y, k) + 1.2 * k * (1 - k); c.z = lerp(c.z0, m.z, k); c.rot += dt * 10;
      if (k >= 1) {
        burst('crumbs', m.x, m.y, m.z, { count: 12, color: '#ff9a2a' }); burst('hearts', m.x, m.y + 0.3, m.z, { count: 6 });
        givePool(c.p); Q.carrot = null; return;
      }
    }
    const r = c.p.m.root; r.position.set(c.x, c.y, c.z); r.rotation.set(0, c.rot, Q.stage === 'held' ? 0.25 : 0); r.scale.setScalar(B.scale);
    poolAnim(c.p, dt, { glow: Q.stage === 'feed' ? 0.5 : 1, spin: 0, bob: Q.stage === 'feed' ? 0 : 1 });
  }
  function havucMouth(b) {
    let m = null;
    if (b.m.marker) { try { m = b.m.marker('mouth', _havV); } catch (err) { warnOnce('marker mouth', err); } }
    if (m && isFinite(m.x)) return m;
    return _havV.set(b.x + Math.sin(b.face) * b.r * 1.05, Math.max(1.2, b.height * 0.45), b.z + Math.cos(b.face) * b.r * 1.05);
  }
  const _havV = new THREE.Vector3();
  function havucPlant(b, q, Q) {
    const rm = bossRoom(), B = BONUS.havuc;
    if (!rm) { Q.state = 'done'; return; }
    const rx = rm.r ? rm.r - 2.2 : (rm.hw || 10) * 0.78, rz = rm.r ? rm.r - 2.2 : (rm.hh || 10) * 0.78;
    const ban = ((q.sancak && q.sancak.list) || []).filter(s => !s.broken);
    let best = null, bd = -1;
    // the far rim from the knight (as far as a free spot allows); with banners still standing: at least banGap m from each
    // (else 4 m), the score adds the distance to the nearest one (a tap on a banner must not pick the carrot)
    // (and a spot in view first: see inView)
    for (const [gap, view] of (ban.length ? [[B.banGap, 1], [4, 1], [B.banGap, 0], [4, 0]] : [[4, 1], [4, 0]])) {
      for (let k = 0; k < 32; k++) {
        const a = k * TAU / 32, f = 1 - (k % 3) * 0.1, x = rm.x + Math.sin(a) * rx * f, z = rm.z + Math.cos(a) * rz * f, d2 = dist2(x, z, b.x, b.z);
        if (d2 < B.spot * B.spot || !isFloor(x, z) || !circleFree(x, z, 0.6) || !inRoom(rm, x, z, 1.0) || dist2(x, z, P.pos.x, P.pos.z) < 4
          || nearPortal(x, z, 2.5) || ban.some(s => dist2(s.x, s.z, x, z) < gap * gap) || (view && !inView(x, z))) continue;
        const sc = Math.sqrt(d2) + (ban.length ? Math.min(...ban.map(s => Math.hypot(s.x - x, s.z - z))) : 0);
        if (sc > bd) { best = { x, z }; bd = sc; }
      }
      if (best) break;
    }
    const p = best && takePool('carrot');
    if (!p) { Q.state = 'done'; return; }
    Q.carrot = { p, t: 0, x: best.x, y: 0.3, z: best.z, rot: 0,
      brk: { x: best.x, z: best.z, r: 0.5, kind: 'bonus', bonus: 'havuc', broken: false, tapY: 0.4, tapLim: 80, break() {} } };
    addBreak(Q.carrot.brk);
    Q.state = 'on'; Q.hold = false; Q.stage = 'lie'; Q.have = 0; Q.need = 1;
    Q.mark = bonusMark(best.x, best.z, 0.9, GOLD_MARK);
    burst('sparkle', best.x, 0.6, best.z, { color: '#ffd27a', count: 16 }); sfx('pop', { x: best.x, z: best.z, pitch: 1.3 });
    ftext(best.x, 1.4, best.z, 'Atın mührü!', 'word');
    bonusLine(b, 'havucSaid', 'sovalye_havuc');
    bonusEvent(b, Q, true);
  }
  function havucTake(b, Q) {   // Feza has it (the next idle the horse comes for it)
    const c = Q.carrot;
    if (!c || Q.stage !== 'lie') return;
    unBreak(c.brk); remove(Q.mark); Q.mark = null;
    Q.stage = 'held'; Q.have = 1; Q.hold = true;
    burst('sparkle', c.x, 0.6, c.z, { color: '#ffd27a', count: 14 }); sfx('pop', { x: c.x, z: c.z, pitch: 1.5 });
    C.cheerT = Math.max(C.cheerT, 0.4);
    bonusEvent(b, Q, true);
  }
  function havucFeed(b, Q) {   // (sovalyeStep 'seek') its nose is close: the carrot flies into its mouth — munch!
    const c = Q.carrot;
    if (!c) { bossEnd(b, 0.5, 0.9); return; }
    Q.stage = 'feed'; c.t = 0; c.x0 = c.x; c.y0 = c.y; c.z0 = c.z;
    b.bonusWon = true; b.chew = BONUS.havuc.fly;
    bonusStun(b, 'munch', BONUS.havuc.stun);
    burst('hearts', b.x, b.height * 0.6, b.z, { count: 8 });
    ftext(b.x, b.height + 0.5, b.z, 'Teslim ol!', 'word');
    bonusLine(b, 'atdoyduSaid', 'sovalye_atdoydu');
  }

  // ── Gece Yutan: "Dostluk Kalpleri". At each hp mark (once each) its next idle is a sad little 'sigh' that blows three
  // pink hearts out onto a ring round it (pink hoops); they hover for `life` s. Feza collects them (touch or hit); all three
  // → one big heart flies from him to the dragon (a small hit) and it is charmed (stun). Missed ones just pop, no penalty.
  // Its eggs keep their own clock. ──
  function kalpStep(b, q, Q, dt) {
    const B = BONUS.kalp;
    if (Q.state === 'wait') {
      const w = b.kalpWave || 0;
      if (w < B.at.length && hpFrac(b) <= B.at[w] && canStartBonus(b, q)) {
        Q.state = 'on'; Q.hold = true; Q.stage = 'sigh'; Q.have = 0; Q.need = B.n; Q.hearts = [];
        bossPhase(b, 'sigh', B.D);
        sfx('sigh', { x: b.x, z: b.z });
        bonusEvent(b, Q, true);
      } else if (w >= B.at.length) Q.state = 'done';
      return;
    }
    if (Q.state !== 'on') return;
    for (const h of Q.hearts) {
      if (h.done) continue;
      h.t += dt;
      if (h.stage === 'fly') {
        const k = clamp(h.t / B.fly, 0, 1);
        h.x = lerp(h.x0, h.x1, k); h.z = lerp(h.z0, h.z1, k); h.y = lerp(h.y0, B.y, k) + 4 * 1.4 * k * (1 - k);
        if (k >= 1) { h.stage = 'hover'; h.t = 0; h.brk.x = h.x; h.brk.z = h.z; addBreak(h.brk); burst('sparkle', h.x, h.y, h.z, { color: '#ab6a5e', count: 8 }); }
      } else {
        h.y = B.y + 0.12 * Math.sin(h.t * 3 + h.ph);
        if (h.t >= h.life) { kalpFade(h); continue; }
        if (!P.dead && dist2(P.pos.x, P.pos.z, h.x, h.z) <= B.touch * B.touch) { kalpTake(b, Q, h); continue; }
      }
      h.obj.position.set(h.x, h.y, h.z); h.obj.rotation.y += dt * 1.6;
      if (h.pool) poolAnim(h.pool, dt, {});
      if (h.stage === 'fly') fx('trail', 'heart', h.x, h.y, h.z);
    }
    if (Q.stage === 'sigh' && b.ph !== 'sigh') { bonusRelease(b, q, Q, 'wait'); return; }   // (cut short before the blow)
    if (Q.stage === 'hearts' && Q.hearts.every(h => h.done)) {
      if (Q.have >= Q.need) kalpSend(b, Q);
      else { b.kalpWave = (b.kalpWave || 0) + 1; Q.hearts = []; bonusRelease(b, q, Q, 'wait'); }
      return;
    }
    if (Q.stage === 'send' && Q.big) {   // the big heart flies from Feza to the dragon's chest
      const s = Q.big; s.t += dt;
      const k = clamp(s.t / B.send, 0, 1), tx = b.x, ty = b.y + b.height * 0.55, tz = b.z;
      s.x = lerp(s.x0, tx, k); s.y = lerp(s.y0, ty, k) + 1.5 * k * (1 - k); s.z = lerp(s.z0, tz, k);
      s.obj.position.set(s.x, s.y, s.z); s.obj.rotation.y += dt * 4;
      fx('trail', 'heart', s.x, s.y, s.z);
      if (k >= 1) {
        kalpGone(s); Q.big = null; Q.hearts = [];
        b.kalpWave = (b.kalpWave || 0) + 1;
        burst('hearts', tx, ty, tz, { count: 16, scale: 1.8 }); burst('sparkle', tx, ty, tz, { color: '#ab6a5e', count: 20 }); sfx('heart', { x: tx, z: tz, pitch: 0.8 });
        damage(b, Math.max(1, Math.round(b.maxHp * B.dmgK)), { force: true, kind: 'heart' });
        if (b.dead || !b.encounter) return;
        bonusStun(b, 'charmed', B.stun);
        bonusLine(b, 'sevgiSaid', 'ejderha_sevgi');
      }
    }
  }
  function kalpObj(scale) {   // FX's glossy heart shot, else a pooled pink heart
    let obj = fxProj('heart', '#bc4743'), pool = null;
    if (obj) { if (!obj.parent) scene.add(obj); }
    else { pool = takePool('heart'); if (!pool) return null; obj = pool.m.root; }
    obj.scale.setScalar(scale || 1);
    return { obj, pool };
  }
  function kalpBlow(b) {   // (dragonStep 'sigh' at blowAt) three hearts float out onto the ring
    const Q = bonusOf(b), B = BONUS.kalp, q = b.encounter;
    if (!Q || Q.kind !== 'kalp' || Q.stage !== 'sigh') return;
    const m = muzzle(b), mx = m.x, my = m.y, mz = m.z;
    Q.hearts = [];
    for (let i = 0; i < B.n; i++) {
      const ok = (x, z) => dist2(x, z, P.pos.x, P.pos.z) >= sq(B.heroGap) && !(q.eggs || []).some(e => dist2(e.x, e.z, x, z) < sq(B.eggGap))
        && !Q.hearts.some(h => dist2(h.x1, h.z1, x, z) < 4) && !nearPortal(x, z, 2);
      const s = bonusSpotOn(b.x, b.z, B.ring[0], B.ring[1], 0.45, viewFirst(ok), 40) || bonusSpotOn(b.x, b.z, B.ring[0], B.ring[1], 0.45, ok, 40);
      if (!s) continue;
      const o = kalpObj(1); if (!o) break;
      const h = { obj: o.obj, pool: o.pool, life: hard ? B.lifeHC : B.life, stage: 'fly', t: -i * 0.12, x0: mx, y0: my, z0: mz, x1: s.x, z1: s.z, x: mx, y: my, z: mz, ph: frand(0, TAU), done: false,
        mark: bonusMark(s.x, s.z, 0.8, PINK_MARK) };
      h.brk = { x: s.x, z: s.z, r: 0.5, kind: 'bonus', bonus: 'kalp', broken: false, tapY: 1.0, tapLim: 80, heart: h, break() {} };
      h.obj.position.set(mx, my, mz);
      Q.hearts.push(h);
    }
    if (!Q.hearts.length) { b.kalpWave = (b.kalpWave || 0) + 1; bonusRelease(b, q, Q, 'wait'); return; }
    Q.stage = 'hearts'; Q.need = Q.hearts.length;
    burst('hearts', mx, my, mz, { count: 10 }); sfx('bubble', { x: b.x, z: b.z, pitch: 1.2, vol: 0.7 });
    bonusLine(b, 'kalpSaid', 'ejderha_kalp');
    bonusEvent(b, Q, true);
  }
  function kalpGone(h) {
    h.done = true; remove(h.mark); h.mark = null; unBreak(h.brk);
    if (h.pool) givePool(h.pool); else killProjectileObj({ obj: h.obj });
  }
  function kalpTake(b, Q, h) {
    if (h.done || h.stage !== 'hover') return;
    const x = h.x, y = h.y, z = h.z;
    kalpGone(h); h.got = true; Q.have++;
    sfx('heart', { x, z, pitch: 1 + 0.1 * Q.have }); burst('hearts', x, y, z, { count: 6 }); burst('sparkle', x, y, z, { color: '#ab6a5e', count: 10 });
    bonusEvent(b, Q, true);
  }
  function kalpFade(h) {   // it waited long enough: a sad little pop (nothing lost)
    burst('sparkle', h.x, h.y, h.z, { color: '#f0c8dc', count: 6 }); sfx('pop', { x: h.x, z: h.z, pitch: 0.6, vol: 0.5 });
    kalpGone(h);
  }
  function kalpSend(b, Q) {
    Q.stage = 'send';
    const o = kalpObj(2);
    if (!o) { Q.big = { obj: new THREE.Object3D(), pool: null, t: 0, x0: P.pos.x, y0: 1.3, z0: P.pos.z, x: P.pos.x, y: 1.3, z: P.pos.z, done: false }; return; }
    Q.big = { obj: o.obj, pool: o.pool, t: 0, x0: P.pos.x, y0: 1.3, z0: P.pos.z, x: P.pos.x, y: 1.3, z: P.pos.z, done: false };
    o.obj.position.set(P.pos.x, 1.3, P.pos.z);
    burst('hearts', P.pos.x, 1.3, P.pos.z, { count: 10 }); sfx('heart', { pitch: 0.7 });
    C.cheerT = Math.max(C.cheerT, 0.6);
  }
  const BONUS_STEP = { tac: tacStep, balon: balonStep, avla: avlaStep, serintas: serinStep, havuc: havucStep, kalp: kalpStep };
  // Where the boss camera should look too (09): the crown / bubble / hole / nearest rock / carrot on the floor / nearest
  // heart while a bonus is on; else null.
  function bonusSpot() {
    const dream = boss && boss.encounter && boss.encounter.dream;
    if (dream && dream.state === 'on') { const p = dream.points.find(p => !p.done); if(p) return {x:p.x,z:p.z}; }
    const b = boss, Q = bonusOf(b);
    if (!b || b.dead || !b.aggro || !Q || Q.state !== 'on') return null;
    const near = list => { let best = null, bd = 1e9; for (const o of list) { const d = dist2(o.x, o.z, P.pos.x, P.pos.z); if (d < bd) { bd = d; best = o; } } return best ? { x: best.x, z: best.z } : null; };
    switch (Q.kind) {
      case 'tac': return Q.crown ? (Q.crown.stage === 'fly' ? { x: Q.crown.x1, z: Q.crown.z1 } : { x: Q.crown.x, z: Q.crown.z }) : null;
      case 'balon': return Q.bub ? { x: Q.bub.x, z: Q.bub.z } : null;
      case 'avla': return Q.target && Q.stage !== 'last' ? { x: Q.target.x, z: Q.target.z } : null;
      case 'serintas': return near((Q.rocks || []).filter(r => !r.dead));
      case 'havuc': return Q.carrot && Q.stage === 'lie' ? { x: Q.carrot.x, z: Q.carrot.z } : null;
      case 'kalp': return near((Q.hearts || []).filter(h => !h.done).map(h => ({ x: h.x1, z: h.z1 })));
    }
    return null;
  }
  // Lobbed shots (lava balls): an arc from the muzzle onto a telegraph circle; they hurt only where they land.
  function spawnMortar(o) {
    let obj = fx('projectile', o.kind, SHOT_COL[o.kind]);
    if (!obj) { obj = new THREE.Mesh(G.sphere(12), glowMat(SHOT_COL[o.kind] || '#ff7a1c', 3)); obj.scale.setScalar(o.r * 0.3); }
    if (!obj.parent) scene.add(obj);
    obj.position.set(o.x0, o.y0, o.z0);
    const m = Object.assign({ t: 0, obj, tele: fx('telegraph', o.x1, o.z1, o.r, o.dur, '#ff7a2a') }, o);
    mortars.push(m);
    return m;
  }
  function updateMortars(dt) {
    for (let i = mortars.length - 1; i >= 0; i--) {
      const m = mortars[i];
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const x = lerp(m.x0, m.x1, k), z = lerp(m.z0, m.z1, k), y = lerp(m.y0, 0.25, k) + 4 * m.h * k * (1 - k);
      m.obj.position.set(x, y, z);
      fx('trail', m.kind, x, y, z);
      if (k < 1) continue;
      remove(m.tele);
      burst((SHOT_END[m.kind] && SHOT_END[m.kind][0]) || 'lava', m.x1, 0.15, m.z1, { scale: 1.2 });
      if (m.kind === 'horseshoe') {   // (Round 5) a silver horseshoe lands with a clink, a dust puff and a twinkle: a warm gold ring
        burst('sparkle', m.x1, 0.35, m.z1, { color: '#f4f8ff', count: 8 });
        fx('ring', m.x1, m.z1, { r0: 0.3, r1: m.r + 0.4, dur: 0.4, color: '#ffc94a', width: 0.4, k: 1.1, edge: 0.2 });
        sfx('clank', { x: m.x1, z: m.z1, pitch: frand(0.95, 1.15) }); sfx('bounce', { x: m.x1, z: m.z1, vol: 0.4, pitch: 1.3 });
      } else {
        fx('ring', m.x1, m.z1, { r0: 0.3, r1: m.r + 0.4, dur: 0.4, color: '#ff7a1a', width: 0.4, k: 1.25, edge: 0.18 });   // lava orange (a white rim washed it to peach)
        sfx('splat', { x: m.x1, z: m.z1, pitch: frand(0.7, 0.9) }); sfx('lava', { x: m.x1, z: m.z1, vol: 0.5 });
      }
      shake(0.06);
      if (!P.dead && Math.hypot(P.pos.x - m.x1, P.pos.z - m.z1) < m.r + T.heroR * 0.5) hurtPlayer(m.dmg, m.x1, m.z1, 0.8);
      killProjectileObj(m); mortars.splice(i, 1);
    }
  }

  // ── Gece Yutan (the last boss; unchanged except: up close it also breathes sometimes — bite 45 / stomp 30 / breath 25) ──
  function dragonStep(b, dt, d, ux, uz) {
    const st = b.st;
    st.breath = st.stomp = st.roar = st.fireball = -1;
    const faceP = Math.atan2(ux, uz);
    switch (b.ph) {
      case 'roar': {
        st.roar = clamp(b.stT / 1.6, 0, 1);
        if (b.did === 0 && b.stT > 0.35) {
          b.did = 1; sfx('roar', { x: b.x, z: b.z }); shake(0.35);
          fx('ring', b.x, b.z, { r0: 1, r1: 9, dur: 0.7, color: '#ad5947', width: 0.6 });
        }
        if (b.did === 1 && b.summon && b.stT > 0.75) {
          b.did = 2;
          // its line only when new eggs really appeared (none once the egg pool or the free spots are used up)
          const k = b.kit.lines.add;
          if (layEggs(b, 2) && k && hasLine(k)) say(k, 2);
          nextWave(b);
        }
        if (b.stT >= 1.6) { bossPhase(b, 'idle', 1); b.wait = frand(0.6, 1.0); }
        break;
      }
      case 'idle': {
        b.face = dampAngle(b.face, faceP, 3, dt);
        if (d > 8.5) bossWalk(b, ux, uz, b.speed, dt);
        b.wait -= dt / (roundCooldown() * (hard ? HC.cd : 1));
        if (b.wait <= 0) {
          if (b.summon) { bossPhase(b, 'roar', 1.6); break; }   // (its line comes with the eggs, see 'roar')
          // by distance; never the same move three times in a row — the swap stays in the same distance band (up close
          // that meant a point-blank 3-bubble volley before)
          const ph = pickPhase(b, d < b.r + 2.6 ? [['bite', 0.45], ['stomp', 0.3], ['breath', 0.25]]
            : d < 7 ? [['stomp', 0.45], ['breath', 0.35], ['fireball', 0.2]]
            : d < 11 ? [['breath', 0.5], ['fireball', 0.5]] : [['fireball', 1]]);
          bossPhase(b, ph, { fireball: 2.0, stomp: 1.8, breath: 2.6, bite: 1.25 }[ph]);
          if (ph === 'stomp') { b.tele = fx('telegraph', b.x, b.z, 5.2, 1.1, '#ff4a3a'); }
          if (ph === 'breath') { b.face = faceP; b.tele = fx('telegraphCone', b.x, b.z, b.face, 1.0, 8.5, 0.9, '#b46bff'); }
          if (ph === 'bite') { b.face = faceP; b.tele = fx('telegraphCone', b.x, b.z, b.face, 1.4, b.r + 2.7, 0.65, '#ff5a44'); }
        }
        break;
      }
      case 'fireball': {
        const D = 2.0;
        st.fireball = clamp(b.stT / D, 0, 1);
        if (b.stT < 1.6) b.face = dampAngle(b.face, faceP, 4, dt);
        if (b.stT < 0.8) chargeFxAt(muzzle(b), '#963a42', b.stT / 0.8);   // a pink glow gathers: bubbles are coming
        const shots = [0.8, 1.15, 1.5];
        if (b.did < 3 && b.stT >= shots[b.did]) {
          const m = muzzle(b), spread = [-0.22, 0, 0.22][b.did];
          const a = Math.atan2(P.pos.x - m.x, P.pos.z - m.z) + spread;
          spawnProjectile({ x: m.x, y: Math.max(1, m.y), z: m.z, vx: Math.sin(a) * 5.5, vz: Math.cos(a) * 5.5, r: 0.55, dmg: b.dmg * 0.7,
            owner: 'enemy', bossShot: true, kind: 'dragonfire', life: 5, color: SHOT_COL.dragonfire });
          sfx('bubble', { x: b.x, z: b.z, pitch: 0.65 }); b.did++;   // big glittery pink bubbles (not fire)
        }
        if (b.stT >= D) { bossPhase(b, 'idle', 1); b.wait = frand(1.1, 1.7); }
        break;
      }
      case 'stomp': {
        const D = 1.8, HIT = 1.1;
        st.stomp = clamp(b.stT / D, 0, 1);
        if (b.did === 0 && b.stT >= HIT) {
          b.did = 1; b.tele = null;
          fx('ring', b.x, b.z, { r0: 1, r1: 6, dur: 0.5, color: '#ffcf8a', width: 0.7 });
          burst('dust', b.x, 0.1, b.z, { count: 40, scale: 2 });
          shake(0.45); sfx('slam', { x: b.x, z: b.z });
          if (d < 5.2 + T.heroR * 0.5) hurtPlayer(b.dmg * 1.1, b.x, b.z, 2.5);
        }
        if (b.stT >= D) { bossPhase(b, 'idle', 1); b.wait = frand(1.1, 1.6); }
        break;
      }
      case 'breath': {
        const D = 2.6, W = 0.9, E = 2.3;
        st.breath = clamp(b.stT / D, 0, 1);
        if (b.stT >= W && b.stT < E) {
          if (b.did === 0) { b.did = 1; b.tele = null; b.tick = 0; b.bubS = b.stT; sfx('bubble', { x: b.x, z: b.z, pitch: 0.6 }); sfx('whoosh', { x: b.x, z: b.z, pitch: 1.2 }); }
          if (b.stT - (b.bubS || 0) > 0.28) { b.bubS = b.stT; sfx('bubble', { x: b.x, z: b.z, vol: 0.6, pitch: frand(0.7, 1.0) }); }
          // A cone of pink/purple soap bubbles (saturated normal-blend rings + a faint pink haze: readable, never an additive
          // white cloud) arcing down from the mouth over the telegraphed cone, with a little glitter (additive sparkles/stars).
          const m = muzzle(b), RING = shape('SHARD', 7), SPARK = shape('SPARK', 2), STAR = shape('STAR', 1), GLOW = shape('GLOW', 0);
          const hy = m.y - 0.25, vy = -Math.max(0, hy - 1.0) * 1.3;   // they settle at ~1 m height at the far end
          PT.add = false; PT.fade = 4; PT.pop = 0.12;   // bubbles stay clear to the end of the cone, then pop away
          for (let i = 0; i < 2; i++) {
            const a = b.face + frand(-0.42, 0.42), s = frand(9.5, 12.5), c = fpick(BREATH_COL);
            emitP(m.x, hy, m.z, Math.sin(a) * s, vy + frand(-0.6, 0.6), Math.cos(a) * s, frand(0.9, 1.15), frand(0.3, 0.42), frand(0.75, 1.05), c, c, RING, -0.3, 0.6);
          }
          PT.fade = 1; PT.pop = 0;
          if (Math.random() < 0.5) {
            const a = b.face + frand(-0.3, 0.3), s = frand(8, 10);
            PT.alpha = 0.28;
            emitP(m.x, hy, m.z, Math.sin(a) * s, vy, Math.cos(a) * s, frand(0.8, 1.0), 0.6, 1.5, '#963a42', '#c77dff', GLOW, 0, 0.6);
            PT.alpha = 1;
          }
          PT.add = true;
          { const a = b.face + frand(-0.35, 0.35), s = frand(8, 11.5);
            emitP(m.x, hy, m.z, Math.sin(a) * s, vy + frand(-0.5, 0.8), Math.cos(a) * s, frand(0.5, 0.8), frand(0.16, 0.26), 0.04,
              fpick(['#b38373', '#ad94a4', '#b5a087']), '#ffffff', Math.random() < 0.3 ? STAR : SPARK, 0, 0.6); }
          b.tick -= dt;
          if (b.tick <= 0) {
            b.tick = 0.3;
            if (d < 8.5 + T.heroR && Math.abs(angDiff(b.face, faceP)) < 0.5) hurtPlayer(b.dmg * 0.4, b.x, b.z, 0.5);
          }
        }
        if (b.stT >= D) { bossPhase(b, 'idle', 1); b.wait = frand(1.2, 1.8); }
        break;
      }
      case 'bite': {
        const D = 1.25, HIT = 0.65;
        if (b.stT < HIT) st.windup = b.stT / HIT; else st.attack = clamp((b.stT - HIT) / (D - HIT), 0, 1);
        if (b.did === 0 && b.stT >= HIT) {
          b.did = 1; b.tele = null; sfx('bite', { x: b.x, z: b.z }); shake(0.18);
          moveE(b, Math.sin(b.face) * 0.5, Math.cos(b.face) * 0.5);
          if (d < b.r + 2.7 && Math.abs(angDiff(b.face, faceP)) < 0.75) hurtPlayer(b.dmg, b.x, b.z, 1.4);
        }
        if (b.stT >= D) { bossPhase(b, 'idle', 1); b.wait = frand(1.0, 1.5); }
        break;
      }
      // (Round 6, BONUS.kalp) 'sigh': a sad little sigh that blows three friendship hearts out (at blowAt; kalpStep flies
      // them); 'charmed': Feza sent it all three as one big heart — it sits back all soft and happy (whack it!)
      case 'sigh':
        st.move = 0;
        if (b.did === 0 && b.stT >= (b.def.sighAt || BONUS.kalp.blowAt) * b.phD) { b.did = 1; kalpBlow(b); }
        if (b.stT >= b.phD) { bossPhase(b, 'idle', 1); b.wait = frand(0.8, 1.2); }
        break;
      case 'charmed':
        st.move = 0;
        if (Math.random() < dt * 3) burst('hearts', b.x + frand(-1, 1), b.height * 0.7, b.z + frand(-1, 1), { count: 2 });
        if (b.stT >= b.phD) bossEnd(b, 0.5, 0.9);
        break;
      default: bossPhase(b, 'idle', 1); b.wait = 0.5;   // (a phase of another boss type: start over)
    }
  }

  // Two opening dream encounters, with forgiving optional collect-and-giggle games.
  function clearDreamBonus(q) {
    if (!q || !q.dream) return;
    for (const p of q.dream.points || []) { remove(p.mark); if(p.mesh) { p.mesh.removeFromParent(); p.mesh.geometry.dispose(); p.mesh.material.dispose(); } }
    q.dream = null;
  }
  function dreamBonusStep(b,q,dt) {
    if (!q.dream && !b.bonusWon && b.hp/b.maxHp < .78) {
      const moon=b.type==='aytavsan', points=[];
      for(let i=0;i<3;i++) {
        const a=i*Math.PI*2/3, apart=(x,z)=>points.every(p=>dist2(x,z,p.x,p.z)>sq(2));
        const spot=bonusSpotOn(b.x,b.z,3.5,5,.4,viewFirst(apart)) || bonusSpotOn(b.x,b.z,3.5,6,.4,apart);
        const x=spot ? spot.x : b.homeX+Math.sin(a)*4, z=spot ? spot.z : b.homeZ+Math.cos(a)*4;
        const mesh=new THREE.Mesh(G.sphere(16).clone(),new THREE.MeshStandardMaterial({color:moon?'#ffe29b':'#83e9e2',emissive:moon?'#bc8c28':'#258b94',emissiveIntensity:.55,roughness:.3}));
        mesh.scale.set(.34,moon?.48:.34,.34); mesh.position.set(x,.65,z); scene.add(mesh);
        points.push({x,z,mesh,done:false,mark:fx('marker',x,z,.7,0,moon?'#ffe29b':'#83e9e2')});
      }
      q.dream={state:'on',t:0,points,have:0}; say(moon?'ay_oyun':'sabun_oyun',2); emit('bonus',{on:true,kind:moon?'yildiz':'sabun',type:b.type,have:0,need:3,state:'on'});
    }
    const Q=q.dream; if(!Q || Q.state!=='on') return;
    Q.t+=dt;
    for(const p of Q.points) if(!p.done) {
      p.mesh.position.y=.7+Math.sin(Q.t*3+p.x)*.13; p.mesh.rotation.y+=dt;
      if(dist2(P.pos.x,P.pos.z,p.x,p.z)<sq(1.25)) {
        p.done=true; remove(p.mark); p.mesh.visible=false; Q.have++; burst('sparkle',p.x,.7,p.z,{count:15});sfx('heart');
        emit('bonus',{on:true,kind:b.type==='aytavsan'?'yildiz':'sabun',type:b.type,have:Q.have,need:3,state:'on'});
      }
    }
    if(Q.have===3) {Q.state='done';b.bonusWon=true;bonusStun(b,'giggle',4,false);heal(.08);say('hayal_oyun_bitti',2);emit('bonus',{on:false,type:b.type});}
    else if(Q.t>22) {Q.state='done';emit('bonus',{on:false,type:b.type}); for(const p of Q.points){remove(p.mark);p.mesh.visible=false;}}
  }
  function dreamBossStep(b,dt,d,ux,uz) {
    const moon=b.type==='aytavsan',col=b.kit.col; b.st.air=0;
    switch(b.ph) {
      case 'roar':bossRoar(b,1.6);break;
      case 'summon':bossSummon(b,1.5);break;
      case 'giggle':case 'charmed':b.st.move=0;if(b.stT>=b.phD)bossEnd(b,.8,1.2);break;
      case 'idle':
        if(bossIdle(b,dt,d,ux,uz,5)) {
          if(b.summon){bossPhase(b,'summon',1.5);break;}
          if(Math.random()<.55) {bossPhase(b,'hop',3.4);const p=approachSpot(b,6);b.hx0=b.x;b.hz0=b.z;b.hx1=p.x;b.hz1=p.z;b.tele=fx('telegraph',p.x,p.z,2.6,2.6,col);}
          else {bossPhase(b,'spit',3);b.face=Math.atan2(ux,uz);b.tele=fx('telegraphCone',b.x,b.z,b.face,1.1,7,2,col);}
        }break;
      case 'hop': {
        const t=b.stT;
        if(t>=2 && t<2.6){const k=(t-2)/.6;b.x=lerp(b.hx0,b.hx1,k);b.z=lerp(b.hz0,b.hz1,k);b.st.air=k;}
        if(t>=2.6 && !b.did){b.did=1;b.x=b.hx1;b.z=b.hz1;remove(b.tele);b.tele=null;bossRing(b,b.x,b.z,2.6,.6,1.8,col);burst('sparkle',b.x,.6,b.z,{count:18,color:col});sfx('bounce');}
        if(t>=b.phD)bossEnd(b,1,1.5);break;
      }
      case 'spit':
        if(b.stT>=2 && !b.did){b.did=1;remove(b.tele);b.tele=null;for(const a of [-.32,0,.32])bossShot(b,'bubble',a,moon?3.2:3.7,.55,.35);sfx('pop');}
        if(b.stT>=b.phD)bossEnd(b,.9,1.3);break;
    }
  }

  const BOSS_AI = { kopukusta: dreamBossStep, aytavsan: dreamBossStep, kraljole: kraljoleStep, kefirdev: kefirdevStep, kostebekusta: kostebekustaStep, lavkaplumbaga: lavkaplumbagaStep, sovalye: sovalyeStep, ejderha: dragonStep };

  // ── Damage ──
  function damage(e, amount, o = {}) {
    if (!e || e.dead) return false;
    if (hidden(e) && !o.force) return false;   // a köstebek underground: nothing reaches it
    const x = e.x, z = e.z;
    const Q = e.boss && bonusOf(e);
    // Only the actual stun earned by a boss's little game; not its ordinary recovery, the banners, or the heart's
    // scripted 5 % hit. Check the phase too: the bonus state is cleared one update after a stun finishes.
    if (!hard && !o.force && o.kind !== 'heart' && Q && Q.state === 'stun' && Q.stunPh && e.ph === Q.stunPh) amount *= DIFF.normal.bonusHit;
    amount = Math.round(amount || 0);
    if (amount > 0) {
      // A lightsaber hit glows in its colour. A boss is hit all the time up close: its flash is softer, shorter and warm
      // (a full white flash on every swing turned the brown mole / the turtle's shell grey-white for a third of the fight).
      e.hp -= amount; e.flash = e.boss ? 0.5 : 1; e.hurt = 1; e.bar.delay = 0.45;
      e.flashCol = e.boss ? bossFlashCol(o.kind === 'sword') : o.kind === 'sword' ? saberFlashCol() : o.freeze ? '#cfefff' : '#ffffff';
      if (e.m.flash) e.m.flash(e.flash, e.flashCol);
      if (!o.silent) {
        ftext(x, e.y + e.height + 0.25, z, String(amount), o.crit ? 'crit' : 'dmg');
        if (o.kind && o.kind !== 'sword' && gt - lastSoft > 0.06) { lastSoft = gt; sfx('hitSoft', { x, z, vol: 0.6, pitch: frand(0.9, 1.2) }); }
      }
      if (!e.aggro) setAggro(e);
      if (e.boss) { emit('bossHp', { frac: Math.max(0, e.hp / e.maxHp) }); bossThresholds(e); }
    }
    if (o.kb && o.fromX !== undefined && !e.boss && !(e.bur > 0)) {   // (a köstebek half in the ground is not knocked away)
      const mass = e.type === 'golem' ? 0.3 : e.elite || HEAVY[e.type] ? 0.5 : 1;   // (the cheese wedge is heavy too)
      let dx = x - o.fromX, dz = z - o.fromZ; const d = Math.hypot(dx, dz);
      if (d > 1e-3) { dx /= d; dz /= d; } else { dx = Math.sin(P.face); dz = Math.cos(P.face); }
      e.kvx += dx * o.kb * 9 * mass; e.kvz += dz * o.kb * 9 * mass;
    }
    if (o.stun && !e.boss) { e.stun = Math.max(e.stun, o.stun); cancelWindup(e); burst('star', x, e.y + e.height + 0.1, z, { count: 4, color: '#fff3a0' }); }
    if (o.freeze) freeze(e, o.freeze);
    if (o.crit && !e.boss && e.kind !== 'slam') cancelWindup(e);
    if (e.hp <= 0) { makeHappy(e, o); return true; }
    if (amount > 0 && e.boss && e.ph === 'peek') avlaBonk(e);   // (Round 6: a hit on the mole's head peeking out of a hole)
    return false;
  }
  function makeHappy(e, o = {}) {
    e.dead = true; e.hp = 0;
    if (e.boss) clearEncounter(e, true);
    // before its xp: no level-up line may queue in front of the ending (dragon) or the boss's happy line (mid-zone boss)
    // (a new skill's line waits for the boss's happy line, its goodbye and the UI's look at the portal (≈7.5 s), see skillLine)
    const gift = !!(e.boss && !e.final && e.kit && e.kit.gift);   // Round 4: the kefir giant hands Feza a glass of kefir first (GIFT)
    if (e.boss) { if (e.final) finale = true; else { storyUntil = gt + (gift ? giftBeat() + 2 : 10); skillAt = gt + (gift ? 9 : 7.5); } }
    const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
    remove(e.tele); e.tele = null;
    if (e.ice) { remove(e.ice); e.ice = null; }
    if (e.frozen > 0 && e.m.setTint) e.m.setTint(null);
    e.frozen = 0;
    if (e.aura) { removeObj(e.aura); e.aura = null; }
    if (e.tag) { removeObj(e.tag); e.tag.material.map.dispose(); e.tag.material.dispose(); e.tag = null; }
    if (e.m.setMood) e.m.setMood('grumpy');
    if (e.m.flash) e.m.flash(0);
    e.dieT = 0; e.dieDur = e.boss ? 3.2 : 1.15;
    if (e.boss) { e.st.phase = gift ? 'give' : 'idle'; e.st.phaseT = 0; e.st.air = 0; }
    if (gift) {   // its reward is rolled now (a Kaydet during the hand-over keeps it) and pops out after Feza drank
      // (yol: when 'kefirdev_yol' starts; beat: the portal wakes; byeAt: it starts waving goodbye — it vanishes just before)
      const beat = giftBeat();
      e.gift = { t: 0, stage: 0, yol: giftYol(), beat, byeAt: Math.max(GT.bye, beat - GIFT.byeDur - 0.3), glass: null, looted: false, held: false };
      e.giftGold = Math.round(e.gold * frand(0.8, 1.25));
      e.giftItem = bossItem(e);
      // An exhausted wardrobe gives coins instead of an item. Roll that reward now too, so a save during the drink
      // contains exactly the same gold as waiting for the reward to appear.
      e.giftExtraGold = e.giftItem ? 0 : Math.round(5 * (zdef().gold || 1) * frand(0.8, 1.25));
    }
    dying.push(e);
    const cy = e.y + e.height * 0.7;
    burst('shadowPuff', e.x, cy, e.z, { scale: e.boss ? 3 : e.elite ? 1.6 : 1 });
    burst('dust', e.x, cy, e.z, { count: e.elite ? 18 : 10 });
    sfx('pop', { x: e.x, z: e.z, pitch: e.boss ? 0.7 : e.elite ? 0.85 : frand(0.95, 1.2) });
    if (Math.random() < (e.elite ? 0.8 : 0.3) && wordOK()) ftext(e.x, e.y + e.height + 0.7, e.z, fpick(WORDS), 'word');
    hitstop = Math.max(hitstop, 0.06);
    const xp = Math.round(e.xp);
    // the XP bar's star (no letters to read) — only for the big ones: every cheered enemy showing it was just clutter
    if (e.elite || e.boss) later(0.25, () => ftext(e.x, e.y + e.height + 0.4, e.z, '+' + xp + ' ◆', 'xp'));
    if (e.boss) bossDown(e);   // its happy line first: level-up / new skill lines queue behind it
    gainXp(xp);
    if (!e.gift) dropLoot(e);
    if (C.targetE === e) C.targetE = null;
    // beat (mid-zone bosses): s until the portal wakes up — the UI's story camera stays on the boss until then
    emit('happy', { type: e.type, x: e.x, z: e.z, elite: e.elite, boss: e.boss, final: !!(e.boss && e.final),
      beat: e.boss && !e.final ? (e.gift ? e.gift.beat : 1.5) : undefined, gift: !!e.gift });
    cheers.push(gt);
    while (cheers.length && gt - cheers[0] > 2) cheers.shift();
    if ((cheers.length >= 3 || e.elite) && gt - lastPraise > 25) praise();
  }
  let lastPraiseKey = '';
  function praise() {
    if (finale || (boss && boss.aggro && !boss.dead) || gt < storyUntil) return;
    lastPraise = gt;
    let k; do { k = 'ovgu' + (1 + Math.floor(Math.random() * 6)); } while (k === lastPraiseKey);
    lastPraiseKey = k; chat(k, 0);
  }
  // Non-story narration (praise, items, chest, level, 'kocaman'): at most one line per `gap` s, none during a boss
  // fight, none right after a mid-zone boss cheers up, none after the dragon (the story lines must not be buried).
  let lastChat = -99;
  function chat(key, prio = 1, gap = 15, o) {
    if (finale || (boss && boss.aggro && !boss.dead) || gt < storyUntil) return 0;
    if (gt - lastChat < gap) return 0;
    const r = say(key, prio, o);
    if (r) lastChat = gt;
    return r;
  }

  // ── Player ──
  function hurtPlayer(amount, fromX, fromZ, kb = 0.4) {
    if (P.dead || GAME.state !== 'play' || C.invuln > 0) return false;
    if (merchantNear()) return false;
    if (P.shield > 0) { burst('oath', P.pos.x, 1, P.pos.z, { color: '#865796', count: 6 }); sfx('shield', { vol: 0.5 }); return false; }
    if (Bilbo && PET.hp > 0 && !PET.retreat && gt < PET.guardUntil && dist2(P.pos.x,P.pos.z,bilboPos.x,bilboPos.z)<36) {
      const absorbed=amount*.35; petHurt(absorbed); amount-=absorbed;
      burst('debris',bilboPos.x,.65,bilboPos.z,{color:'#9c8b74',count:4});
    }
    const a = Math.max(1, Math.round(amount * DIFF.damageTaken[hard ? 'hard' : 'normal'] * (1 - P.armor / 100) * (merchantWard() ? 0.92 : 1)));
    P.hp -= a; C.lastHurt = gt; C.hurtT = 1; C.invuln = T.iframes;
    fx('flash', '#ff2a4a', 0.45, 0.4); shake(0.16);
    sfx('hurt', { pitch: frand(0.95, 1.1) });
    burst('rend', P.pos.x, 0.9, P.pos.z, { color: '#a64c56', count: 8 });
    if (fromX !== undefined) {
      let dx = P.pos.x - fromX, dz = P.pos.z - fromZ; let d = Math.hypot(dx, dz);
      if (d < 1e-3) { dx = 0; dz = 1; d = 1; }   // hit from right where he stands (a mole popping up): pushed toward the camera
      C.kbx = dx / d * kb * 8; C.kbz = dz / d * kb * 8;
    }
    emit('hurt', { amount: a });
    if (P.hp <= 0) defeat();
    else if (P.hp < P.maxHp * 0.3 && P.potions > 0 && gt - lastCanAz > 60) { lastCanAz = gt; say('can_az', 2); }
    return true;
  }
  function heal(frac, quiet) {
    const n = Math.round(P.maxHp * frac), before = P.hp;
    P.hp = Math.min(P.maxHp, P.hp + n);
    if (!quiet) { burst('heal', P.pos.x, 0.8, P.pos.z, {}); ftext(P.pos.x, 2.0, P.pos.z, '+' + Math.max(1, Math.round(P.hp - before)), 'heal'); }
  }
  function drinkPotion() {
    if (P.dead || GAME.state !== 'play') return false;
    if (P.potions <= 0) { if (gt - lastPotionMsg > 6) { lastPotionMsg = gt; say('iksir_yok', 2); } sfx('click'); return false; }
    if (P.hp >= P.maxHp) { sfx('click'); return false; }
    P.potions--; heal(0.6); sfx('potion');
    fx('ring', P.pos.x, P.pos.z, { r0: 0.3, r1: 1.8, dur: 0.4, color: '#ff6f91', width: 0.3 });
    emit('potion', { count: P.potions });
    return true;
  }
  function defeat() {
    P.hp = 0; P.dead = true; GAME.state = 'dead'; C.deadT = 0;
    C.swing = null; C.targetE = null; C.targetObj = null; C.hasT = false; C.drag = false; C.queued = false; C.vel = 0;
    C.deathX = P.pos.x; C.deathZ = P.pos.z;
    say('yoruldu', 3); emit('dead', {});
    if (!wizard()) sfx('saberOff', { vol: 0.7 });   // FEZA retracts the blade while he naps
    burst('zzz', P.pos.x, 1.2, P.pos.z, {});
    if (boss && boss.aggro && !boss.dead) { if (!hard) bossTired(boss); clearEncounter(boss); }
    for (const e of enemies) {   // (remember how far the pack's fight got: see respawn)
      if (!e.boss && dist2(e.x, e.z, C.deathX, C.deathZ) < NAP.r * NAP.r) { e.napHp = e.hp; e.napped = e.aggro; }
      if (e.aggro) { if (e.boss) bossCalm(e); else calm(e); }
    }
    const at = gt;
    setTimeout(() => { if (P.dead && gt === at && !GAME.paused) respawn(); }, 4500);   // UI stopped ticking us while dead
  }
  const NAP = { r: 18, heal: 0.25, calm: 4.5, near: 3 };
  function respawn() {
    if (!P.dead) return;
    P.dead = false; P.hp = P.maxHp; GAME.state = 'play'; C.invuln = 2; C.hurtT = 0; C.kbx = C.kbz = 0;
    C.lockT = 0; C.cheerT = 0;   // (a story lock from before the nap never freezes him after waking up)
    // No nap loop (Round 3 QA: a careless kid napped 10× in a row on one pack that came back fully healed each time): the
    // pack nearby goes home, but keeps what Feza already did (at most +25 % hp back); in Normal it also tires after a nap
    // (DIFF.bossNap: hits ×0.75, down to ×0.55; an elite that won twice also loses 30 % hp) and lets him wake up in peace
    // (no noticing him for NAP.calm s unless he comes within NAP.near m or hits one).
    for (const e of enemies) {
      if (e.boss || (e.napHp === undefined && dist2(e.x, e.z, C.deathX, C.deathZ) > NAP.r * NAP.r)) continue;   // (napHp: it was there)
      const was = e.napHp !== undefined ? e.napHp : e.hp;
      e.hp = Math.max(1, Math.min(e.maxHp, Math.round(was + e.maxHp * NAP.heal)));
      if (e.napped && !hard) {
        const N = DIFF.bossNap;
        e.naps = (e.naps || 0) + 1; e.dmgBase = e.dmgBase || e.dmg;
        e.dmg = Math.max(e.dmgBase * N.dmgMin, e.dmg * N.dmg);
        if (e.elite && e.naps >= 2) e.hp = Math.min(e.hp, Math.round(e.maxHp * 0.7));
      }
      e.napHp = undefined; e.napped = false; e.calmT = gt + NAP.calm;
      e.x = e.homeX; e.z = e.homeZ; e.aggro = false; e.token = false; e.walking = false; e.returning = false;
      cancelWindup(e); e.state = 'idle'; e.kvx = e.kvz = 0; e.bar.trail = e.hp / e.maxHp; e.bur = 0; e.upT = 99; place(e);
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].owner === 'enemy') killProjectile(i, false);
    for (const m of mortars) { killProjectileObj(m); remove(m.tele); }
    mortars.length = 0;
    const cp = P.checkpoint;
    placeHero(cp.x, cp.z, 0);
    burst('magic', cp.x, 0.8, cp.z, { count: 24 }); burst('sparkle', cp.x, 1.2, cp.z, { count: 16 });
    sfx('checkpoint');
    igniteSaber(0);
    emit('respawn', {});
  }

  const wizard = () => P.heroClass === 'wizard';
  const ranged = () => wizard() || P.heroClass === 'hybrid';
  const WAND_RANGE = 9;
  function startSwing(targetFace, target, breakable = false) {
    if (C.swing || P.spin > 0 || P.dead || (!breakable && merchantNear())) return;
    C.combo = gt - C.lastSwingEnd < 0.55 ? C.combo + 1 : 0;
    const magic = wizard() || (P.heroClass === 'hybrid' && !breakable && (!target || Math.hypot(target.x - P.pos.x, target.z - P.pos.z) > T.reach + (target.r || 0) - 0.15));
    const big = !magic && C.combo % 3 === 2;
    C.swing = { t: 0, dur: magic ? (!hard && wizard() ? DIFF.normal.wandSwing : 0.55) : big ? T.swingBig : T.swing, magic, target: target || null, dir: C.swingDir, big, hit: false, slash: false };
    C.swingDir = -C.swingDir;
    C.swingFace = targetFace === undefined || targetFace === null ? null : targetFace;
    C.idleT = 0;
    sfx(magic ? 'star' : big ? 'swingBig' : 'swing', { pitch: frand(0.92, 1.1), vol: magic ? 0.4 : 0.8 });
  }
  // The lightsaber's colour (ITEMS.bladeColor; the rainbow one cycles). Used by the slash, hit sparks and Feza's light.
  const _hsl = new THREE.Color();
  const _fc = new THREE.Color(), _fw = new THREE.Color(1, 1, 1);
  function saberFlashCol() { return '#' + _fc.set(bladeColor()).lerp(_fw, 0.4).getHexString(); }
  const _fwarm = new THREE.Color('#fff0d6');
  function bossFlashCol(sword) { return sword ? '#' + _fc.set(bladeColor()).lerp(_fwarm, 0.65).getHexString() : '#fff0d6'; }
  function bladeColor(w = P.equip.weapon) {
    if (typeof ITEMS !== 'undefined' && ITEMS && typeof ITEMS.bladeColor === 'function') {
      try { const c = ITEMS.bladeColor(w); if (typeof c === 'string' && c) return c; } catch (err) { warnOnce('ITEMS.bladeColor', err); }
    }
    const id = w && (w.base && w.base.id ? w.base.id : w.base);
    if (id === 'gokkusagi') return '#' + _hsl.setHSL(((typeof TIME !== 'undefined' ? TIME.t : gt) * 0.18) % 1, 1, 0.6).getHexString();
    return BLADE_COL[id] || '#c8f4ff';
  }
  // A wand flick launches a real shot: it travels through the world and cannot hit through walls.
  function wandHit() {
    let face = C.swingFace === null ? P.face : C.swingFace;
    let x = P.pos.x + Math.sin(face) * 0.35, z = P.pos.z + Math.cos(face) * 0.35, y = 1.05;
    const tip = H && H.wandTip;
    if (tip && dist2(tip.x, tip.z, P.pos.x, P.pos.z) < 4 && isFloor(tip.x, tip.z) && los(P.pos.x, P.pos.z, tip.x, tip.z)) { x = tip.x; y = clamp(tip.y, 0.6, 2.5); z = tip.z; }
    const target = C.swing && C.swing.target;
    if (target && !target.dead) face = Math.atan2(target.x - x, target.z - z);
    const dx = Math.sin(face), dz = Math.cos(face), color = bladeColor(P.heroClass === 'hybrid' ? P.equip.offhand : P.equip.weapon);
    const p = spawnProjectile({ x, y, z, vx: dx * 19, vz: dz * 19,
      r: 0.3, dmg: heroDamageNow(true) * (wizard() ? 1.15 : 1.05), kind: 'magic', color, life: WAND_RANGE / 19, kb: 0.3 });
    if (target && target.banner && !target.broken) p.aim = target;   // (a tapped banner: past the creatures, see bannerShot)
    burst('magic', x, y, z, { color, count: 4, scale: 0.65 });
    R.pulse = Math.max(R.pulse || 0, 0.65);
  }
  function swingHit(sw) {
    if (sw.magic) { wandHit(); return; }
    const px = P.pos.x, pz = P.pos.z;
    const reach = T.reach * (sw.big ? 1.12 : 1), arc = T.arc * (sw.big ? 1.15 : 1);
    let hits = 0, crits = 0;
    const list = enemies.slice();
    for (const e of list) {
      if (e.dead || hidden(e)) continue;
      const dx = e.x - px, dz = e.z - pz, d = Math.hypot(dx, dz);
      if (d > reach + e.r) continue;
      if (d > e.r + 0.3 && Math.abs(angDiff(P.face, Math.atan2(dx, dz))) > arc) continue;
      const crit = Math.random() < T.crit;
      const amt = heroDamageNow() * (P.heroClass === 'hybrid' ? 0.95 : 1) * (sw.big ? 1.3 : 1) * (crit ? 2 : 1);
      damage(e, amt, { kb: e.boss ? 0 : sw.big ? 0.8 : 0.45, fromX: px, fromZ: pz, crit, kind: 'sword' });
      const hy = e.y + e.height * 0.5, dl = d || 1, bc = bladeColor();
      const hx = e.x - dx / dl * e.r * 0.6, hz = e.z - dz / dl * e.r * 0.6;
      burst(crit ? 'crit' : 'hit', hx, hy, hz, { dir: { x: dx / dl, z: dz / dl }, color: bc });   // FX: a crackly zap in the blade colour
      hits++; if (crit) crits++;
    }
    // Swatting enemy shots out of the air is fun and forgiving.
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (p.owner !== 'enemy') continue;
      const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz);
      if (d < reach + 0.3 && (d < 0.8 || Math.abs(angDiff(P.face, Math.atan2(dx, dz))) < arc)) {
        burst('sparkle', p.x, p.y, p.z, { color: p.color || '#fff', count: 10 });
        if (Math.random() < 0.5 && wordOK()) ftext(p.x, p.y + 0.5, p.z, 'Söndü!', 'word');
        killProjectile(i, false); hits++;
      }
    }
    hitBreakables(px + Math.sin(P.face) * 0.9, pz + Math.cos(P.face) * 0.9, reach * 0.75);
    if (hits) {
      hitstop = Math.max(hitstop, crits ? 0.06 : 0.045);
      sfx(crits ? 'crit' : 'hit', { pitch: frand(0.92, 1.12) });
      shake(crits ? 0.14 : 0.05);
    }
  }
  function lungeToward(x, z, maxD) {
    const dx = x - P.pos.x, dz = z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return;
    const go = Math.min(maxD, d);
    C.lunge.t = 0.14; C.lunge.vx = dx / d * go / 0.14; C.lunge.vz = dz / d * go / 0.14;
    burst('dust', P.pos.x, 0.05, P.pos.z, { count: 5 });
  }
  // The kefir giant cheered up and hands Feza its glass: no swings or skills until he has drunk it (Round 4 QA: a İnfaz Çemberi
  // cast between the cheer and the catch kept him whirling through the whole drink).
  const giftBusy = () => !!(boss && boss.dead && boss.gift && boss.gift.stage < 4);
  function attackButton() {
    if (GAME.state !== 'play' || P.dead || P.spin > 0 || C.lockT > 0 || giftBusy()) return;
    if (C.swing) { C.queued = true; return; }
    C.hasT = false; C.targetObj = null;
    let e = null;
    if (ranged()) {
      let bd = WAND_RANGE * WAND_RANGE;
      for (const q of enemies) {
        if (q.dead || hidden(q)) continue;
        const d = dist2(q.x, q.z, P.pos.x, P.pos.z);
        if (d < bd && los(P.pos.x, P.pos.z, q.x, q.z)) { bd = d; e = q; }
      }
    } else e = nearestEnemy(P.pos.x, P.pos.z, 4.8);
    let face = null, breakable = false;
    // running away from it (moving fast, the other way): no lunge back into it, and no sword swing that would stop him
    const flee = e && C.vel > 1.5 && (C.drag || C.keyX !== 0 || C.keyZ !== 0) &&
      C.mdx * (e.x - P.pos.x) + C.mdz * (e.z - P.pos.z) < Math.cos(T.fleeArc) * Math.hypot(e.x - P.pos.x, e.z - P.pos.z);   // back or sideways
    if (flee && !ranged()) return;
    if (e) {
      face = Math.atan2(e.x - P.pos.x, e.z - P.pos.z);
      const gap = Math.hypot(e.x - P.pos.x, e.z - P.pos.z) - e.r - 1.2;
      if (!ranged() && !flee && gap > 0.15) lungeToward(e.x, e.z, Math.min(gap, 2.4));
    } else {
      const b = nearestBreakable(P.pos.x, P.pos.z, 2.6);
      if (b) { face = Math.atan2(b.x - P.pos.x, b.z - P.pos.z); e = b; breakable = true; }
    }
    startSwing(face, e, breakable);
  }
  function nearestBreakable(x, z, r) {
    if (!L || !L.breakObjs) return null;
    let best = null, bd = r * r;
    for (const b of L.breakObjs) { if (b.broken) continue; const d = dist2(b.x, b.z, x, z); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  function cast(i) {
    const s = GAME.skills[i];
    if (!s || !s.unlocked || s.cd > 0 || P.dead || GAME.state !== 'play' || C.lockT > 0 || giftBusy() || merchantNear()) return false;
    // the nearest one Feza can SEE: one behind a wall (next room) stole the aim, and the stars/crescents/meteors hit the wall
    // while the huysuz in the open kept playing; nobody in sight → along his facing
    const target = nearestEnemy(P.pos.x, P.pos.z, 12, true);
    let ax = Math.sin(P.face), az = Math.cos(P.face);
    if (target) { const dx = target.x - P.pos.x, dz = target.z - P.pos.z, d = Math.hypot(dx, dz) || 1; ax = dx / d; az = dz / d; }
    let ok = false;
    try { ok = s.def.cast({ P, H, target, aim: { x: ax, z: az }, game: GAME }); } catch (err) { console.error('[GAME] skill ' + (s.def.id || i), err); ok = false; }
    if (ok === false) return false;
    s.cd = s.cdMax = s.def.cd || 1; STATS.casts++;
    C.castT = P.castT > 0 ? -1 : 0; C.idleT = 0; C.swing = null; C.queued = false;
    return true;
  }
  function movePlayer(dx, dz) {
    if (!circleFree(P.pos.x, P.pos.z, T.heroR * 0.8)) {   // overlapping a solid or a wall (knocked into a chest…)
      // Round 4 kid bots: a drag into a wall corner from such a spot never got out (100 s) → first step to the nearest spot
      // where he fits (a few cm usually), then walk on as usual; only if there is none, the old "walk out over any floor"
      const x0 = P.pos.x, z0 = P.pos.z, f = freeSpotNear(x0, z0, 0.5);
      if (f) {
        P.pos.x = f.x; P.pos.z = f.z; moveXZ(P.pos, dx, dz, T.heroR);
        if (Math.abs(P.pos.x - f.x) + Math.abs(P.pos.z - f.z) > 1e-4) return;
        P.pos.x = x0; P.pos.z = z0;   // (that way is blocked from there too: try the old way out)
      }
      if (isFloor(P.pos.x + dx, P.pos.z + dz)) { P.pos.x += dx; P.pos.z += dz; }
      return;
    }
    moveXZ(P.pos, dx, dz, T.heroR);
  }
  function freeSpotNear(x, z, maxR, r = T.heroR) {   // nearest spot (rings of 0.1 m, 16 directions) where Feza fits, or null
    if (circleFree(x, z, r)) return { x, z };
    for (let d = 0.1; d <= maxR + 1e-6; d += 0.1) for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, qx = x + Math.sin(a) * d, qz = z + Math.cos(a) * d;
      if (isFloor(qx, qz) && circleFree(qx, qz, r)) return { x: qx, z: qz };
    }
    return null;
  }
  // Tap-to-walk round a bush or a wall corner: when the straight walk to a tapped point gets stuck, a small grid search
  // (4-neighbour BFS over cells Feza fits in) finds a way round, string-pulled to a few corners. A point he cannot stand on
  // or reach (a bush, the milk, across a river): the best reachable spot within ROUTE.near cells of it. Too far round
  // (another room behind a wall) or nothing near: he simply stops instead of walking into the wall forever. Dragging uses
  // it too when he is blocked (see updatePlayer).
  const ROUTE = { cells: 3000, len: 45, near: 5 };
  const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function walkable(x0, z0, x1, z1) {   // a straight stretch he fits through
    const l = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(l / 0.3));
    for (let i = 1; i <= n; i++) { const k = i / n; if (!circleFree(x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, T.heroR * 0.95)) return false; }
    return true;
  }
  function routeTo(tx, tz, origin = P.pos) {
    if (!L || !L.grid || !L.W || !L.H) return null;
    const W = L.W, H = L.H;
    const cell = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return i >= 0 && j >= 0 && i < W && j < H ? j * W + i : -1; };
    const fits = c => c >= 0 && L.grid[c] === 1 && circleFree((c % W) + 0.5, Math.floor(c / W) + 0.5, T.heroR);
    const s = cell(origin.x, origin.z);
    let g = cell(tx, tz);
    if (s < 0 || g < 0) return null;
    // Cells Feza fits in near the point, best first: closest to the finger, a little toward Feza's side (ring by ring out
    // to ROUTE.near cells). Round 4 QA: a finger 2+ cells deep in a bush clump, the milk or a yogurt hill found no free
    // cell in its 3×3 and Feza stood still for 25–150 s; now he walks round to the bush's edge / the milk shore under it.
    const gi = g % W, gj = (g - gi) / W;
    const near = (from, to) => {
      const out = [];
      for (let r = from; r <= to; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = gi + di, j = gj + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const c = j * W + i;
        if (fits(c)) out.push({ c, k: dist2(i + 0.5, j + 0.5, tx, tz) + 0.25 * dist2(i + 0.5, j + 0.5, origin.x, origin.z) });
      }
      return out.sort((a, b) => a.k - b.k);
    };
    if (!fits(g)) {   // the spot itself is taken: the first ring round it with room
      let cand = [];
      for (let r = 1; r <= ROUTE.near && !cand.length; r++) cand = near(r, r);
      if (!cand.length) return null;
      g = cand[0].c;
    }
    const prev = new Map([[s, -1]]), q = [s];
    let head = 0, found = s === g;
    while (!found && head < q.length && q.length < ROUTE.cells) {
      const c = q[head++], i = c % W, j = (c - i) / W;
      for (const nb of NB4) {
        const ni = i + nb[0], nj = j + nb[1];
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        const n = nj * W + ni;
        if (prev.has(n) || !fits(n)) continue;
        prev.set(n, c); q.push(n);
        if (n === g) { found = true; break; }
      }
    }
    if (!found) {   // cannot get there (across the milk, behind a wall): the best spot near it he CAN reach, if any
      const alt = near(0, ROUTE.near).find(o => prev.has(o.c));
      if (!alt || alt.c === s) return null;
      g = alt.c;
    }
    const pts = [];
    for (let c = g; c !== s && c !== -1 && c !== undefined; c = prev.get(c)) pts.push({ x: (c % W) + 0.5, z: Math.floor(c / W) + 0.5 });
    if (pts.length > ROUTE.len) return null;
    pts.reverse();
    const out = [];
    let cx = origin.x, cz = origin.z, k = 0;
    while (k < pts.length) {   // string-pull: straight to the farthest cell he can walk to directly
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (walkable(cx, cz, pts[m].x, pts[m].z)) { far = m; break; }
      out.push(pts[far]); cx = pts[far].x; cz = pts[far].z; k = far + 1;
    }
    return out;
  }
  // Tap-walk net-progress watchdog. LEVEL's sliding can ping-pong Feza between two solids (a pillar corner and a round
  // vase) or in and out of a flat wall: every frame "moves", so the per-frame blockT never grows, yet he gets nowhere and
  // the kid sees him running in place. Every PROG.win s the distance to the current goal (the next route corner or the
  // tapped point) must shrink by PROG.min m. If it doesn't: a vase touching him on the way → he swings at it (kid-friendly,
  // at most PROG.brk per tap); otherwise blockT is set, so updatePlayer tries a way round once, or stops if it already did.
  const PROG = { win: 0.4, min: 0.3, brk: 2, brkGap: 0.8, brkArc: 100 * Math.PI / 180 };
  function tapWalkProgress(gx, gz, d, mx, mz, dt) {
    // slowed or pushed on purpose (a swing at a creature / vase, a lunge, a knock-back): not stuck. Swings at thin air (a
    // masher) only slow him down: the check asks for part of the way he ran instead (Round 4 QA: a masher in a bush pocket
    // never tripped the watchdog and stood still)
    if ((C.swing && C.swingFace !== null) || C.lunge.t > 0 || C.kbx || C.kbz) { C.progT = 0; C.progD = d; C.progW = 0; return; }
    if (gx !== C.progGx || gz !== C.progGz) { C.progGx = gx; C.progGz = gz; C.progT = 0; C.progD = d; C.progW = 0; return; }   // new tap / next corner
    C.progW += C.vel * dt;
    if ((C.progT += dt) < PROG.win) return;
    const d0 = C.progD, ran = C.progW;
    C.progT = 0; C.progD = d; C.progW = 0;
    if (d0 - d >= Math.min(PROG.min, (d0 - 0.2) * 0.5, ran * 0.4)) return;   // getting there (near the goal he slows down: ask less)
    if (C.autoBrk < PROG.brk && P.spin <= 0 && L && L.breakObjs) {
      const mf = Math.atan2(mx, mz);
      let best = null, bd = PROG.brkGap;
      for (const b of L.breakObjs) {
        if (b.broken) continue;
        const bx = b.x - P.pos.x, bz = b.z - P.pos.z, bl = Math.hypot(bx, bz), gap = bl - (b.r || 0.4) - T.heroR;
        if (gap >= bd || (bl > 1e-3 && Math.abs(angDiff(mf, Math.atan2(bx, bz))) > PROG.brkArc)) continue;
        bd = gap; best = b;
      }
      if (best) { C.autoBrk++; startSwing(Math.atan2(best.x - P.pos.x, best.z - P.pos.z), best, true); return; }
    }
    C.blockT = Math.max(C.blockT, 0.31);
  }
  const DRAGWIN = { t: 1, min: 0.5, left: 1.0, ran: 0.8 };   // drag net-progress window (s; m net at least; m still to go; m run)
  const skillsOwnTimers = () => typeof SKILLS_update === 'function';

  function updatePlayer(dt) {
    C.hurtT = Math.max(0, C.hurtT - dt * 3);
    C.invuln = Math.max(0, C.invuln - dt);
    C.cheerT = Math.max(0, C.cheerT - dt);
    if (C.castT >= 0) { C.castT += dt / 0.45; if (C.castT >= 1) C.castT = -1; }
    if (!skillsOwnTimers()) { P.spin = Math.max(0, P.spin - dt); P.shield = Math.max(0, P.shield - dt); }
    for (const s of GAME.skills) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);

    if (C.swing) {
      const sw = C.swing; sw.t += dt;
      const k = sw.t / sw.dur;
      if (!sw.magic && !sw.slash && k >= 0.2) {
        sw.slash = true;
        // a thin bright energy arc in the blade colour (FX reads the options; older FX just gets the colour)
        fx('slash', P.pos.x, 0.8, P.pos.z, P.face, sw.dir, bladeColor(), sw.big ? 2.2 : 1.9, sw.big ? 2.9 : 2.4, { saber: true, energy: true, thin: true });
        R.pulse = Math.max(R.pulse || 0, sw.big ? 1 : 0.7);
      }
      if (!sw.hit && k >= T.hitAt) { sw.hit = true; swingHit(sw); }
      if (k >= 1) {
        C.swing = null; C.lastSwingEnd = gt;
        if (C.targetObj && C.targetObj.type === 'break' && C.targetObj.ref.broken) C.targetObj = null;
        if (C.queued) { C.queued = false; attackButton(); }
      }
    }

    if (C.lockT > 0) {   // a story beat (Round 4: drinking the kefir giant's gift): he stands still facing the camera
      C.lockT -= dt; C.swing = null; C.queued = false; C.hasT = false; C.targetE = null; C.targetObj = null; C.route = null;
      C.vel = damp(C.vel, 0, 18, dt); C.lunge.t = 0; C.idleT = 0;
      if (C.kbx || C.kbz) { movePlayer(C.kbx * dt, C.kbz * dt); const k = Math.exp(-10 * dt); C.kbx *= k; C.kbz *= k; if (Math.abs(C.kbx) + Math.abs(C.kbz) < 0.05) C.kbx = C.kbz = 0; }
      if (C.lockFace !== null) P.face = dampAngle(P.face, C.lockFace, 8, dt);
      C.playT += dt;
      return;
    }
    let mx = 0, mz = 0, want = 0, face = null, waitE = false;
    const keyMove = C.keyX !== 0 || C.keyZ !== 0;
    if (keyMove) {
      const l = Math.hypot(C.keyX, C.keyZ); mx = C.keyX / l; mz = C.keyZ / l; want = P.speed * Math.min(1, l);
      C.hasT = false; C.targetE = null; C.targetObj = null;
    } else {
      if (C.drag) {
        const g = typeof groundFromScreen === 'function' ? groundFromScreen(C.sx, C.sy, 0) : null;
        if (g) {
          let dx = g.x - P.pos.x, dz = g.z - P.pos.z; const d = Math.hypot(dx, dz);
          if (d > 30) { dx *= 30 / d; dz *= 30 / d; }
          C.tx = P.pos.x + dx; C.tz = P.pos.z + dz; C.hasT = true;
        }
      }
      if (C.targetE && C.targetE.dead) C.targetE = null;
      const tgt = C.targetE || C.targetObj;
      if (tgt !== C.tgtRef) { C.tgtRef = tgt; C.wandRoute = null; C.wandPlanAt = -99; C.tgtBest = 1e9; C.tgtStall = 0; C.waitT = 0; }
      if (C.targetE) {
        const e = C.targetE, dx = e.x - P.pos.x, dz = e.z - P.pos.z, d = Math.hypot(dx, dz) || 1e-3;
        if (hidden(e)) {   // a köstebek dug in: follow its mound (it is coming anyway) and whack it when it pops up
          face = Math.atan2(dx, dz);
          if (d > 2.8) { mx = dx / d; mz = dz / d; want = P.speed * 0.8; } else waitE = true;
        } else if (ranged() && !los(P.pos.x, P.pos.z, e.x, e.z)) {
          // A ranged hero must find an opening rather than wait forever for a tapped creature behind a pillar.
          if (gt - C.wandPlanAt > 0.8) { C.wandPlanAt = gt; C.wandRoute = routeTo(e.x, e.z); }
          const r = C.wandRoute;
          while (r && r.length && Math.hypot(r[0].x - P.pos.x, r[0].z - P.pos.z) < 0.45) r.shift();
          if (r && r.length) {
            const rx = r[0].x - P.pos.x, rz = r[0].z - P.pos.z, rd = Math.hypot(rx, rz) || 1;
            mx = rx / rd; mz = rz / rd; want = P.speed; face = Math.atan2(mx, mz);
          } else { face = Math.atan2(dx, dz); C.tgtStall += dt; waitE = true; }
        } else if (d <= (ranged() ? WAND_RANGE - 0.5 : T.reach + e.r - 0.3)) { face = Math.atan2(dx, dz); if (!C.swing) startSwing(face, e); C.waitT = 0; C.tgtStall = 0; }
        else if (C.waitT > 0 || (e.dist < 18 && !e.losOk)) {
          // Behind a wall (it comes round through the flow field) or stuck on something: face it and wait, never push into the wall.
          // Round 4 kid runs: while he waited he ignored whatever was hitting him (the volcano boss 3 m away kept hitting him
          // for 15 s while he faced a tapped little turtle it had wedged in) — so the auto-attack below still runs while he
          // waits (waitE), and C.tgtStall counts the waiting to let him give the tapped one up (see there).
          face = Math.atan2(dx, dz); C.waitT = Math.max(0, C.waitT - dt); C.tgtStall += dt; waitE = true;
        } else {
          mx = dx / d; mz = dz / d; want = P.speed;
          if (C.blockT > 0.45) { C.waitT = 1.0; C.blockT = 0; }   // not getting anywhere: wait a moment, then try again
        }
      } else if (C.targetObj) {
        const o = C.targetObj;
        if (o.type === 'break' && o.ref.bonus) { o.x = o.ref.x; o.z = o.ref.z; }   // (Round 6: the giant bubble floats, the crown flies)
        const dx = o.x - P.pos.x, dz = o.z - P.pos.z, d = Math.hypot(dx, dz) || 1e-3;
        if (d <= o.reach || bannerShot(o, d)) { face = Math.atan2(dx, dz); interact(o); }
        else {
          watchTarget(d, dt);
          const useR = o.type === 'break' ? 2.35 + (o.ref.r || 0.4) : o.reach + 0.8;   // a swing reaches ≈ 2.5 m + r
          if (C.tgtStall > 2.0) C.targetObj = null;   // cannot get there: give up rather than walk into a wall forever
          else if (C.tgtStall > 0.3 && d < useR) { face = Math.atan2(dx, dz); interact(o); }   // blocked by a neighbour: use it from here
          else { mx = dx / d; mz = dz / d; want = P.speed; }
        }
      } else if (C.hasT) {
        let gx = C.tx, gz = C.tz;
        if (C.drag) {
          C.route = null; C.routeTried = false; C.progGx = NaN; C.autoBrk = 0;
          // Round 4 kid bots: a finger held on the far side of a lava/milk river from a wall pocket (both ways blocked) kept
          // Feza running into the corner for minutes. Fully blocked while dragging → the way round to the point under the
          // finger (the tap-walk's grid route), re-planned when the finger moves on; nothing changes while he can move.
          if (C.dragRoute && Math.hypot(C.tx - C.dragRouteTx, C.tz - C.dragRouteTz) > 2.5) C.dragRoute = null;
          // Net progress too (Round 4 QA): in a concave wall corner LEVEL's sliding bounced him back and forth every frame at
          // full speed — every frame "moved", so blockT never grew and he shook in place for 25 s with the finger held.
          // Every DRAGWIN.t s he must have got a good part of the way he ran (∫ speed; a masher's air swings slow him down,
          // so they count too) further — not while swinging at something, lunging, pushed, or with a creature right there.
          if (!C.dragRoute) {
            if (C.dragWinT < 0 || (C.swing && C.swingFace !== null) || C.lunge.t > 0 || C.kbx || C.kbz) { C.dragWinT = 0; C.dragWalk = 0; C.dragWinX = P.pos.x; C.dragWinZ = P.pos.z; }
            else {
              C.dragWalk += C.vel * dt;
              if ((C.dragWinT += dt) >= DRAGWIN.t) {
                const net = Math.hypot(P.pos.x - C.dragWinX, P.pos.z - C.dragWinZ), left = Math.hypot(C.tx - P.pos.x, C.tz - P.pos.z), ran = C.dragWalk;
                C.dragWinT = 0; C.dragWalk = 0; C.dragWinX = P.pos.x; C.dragWinZ = P.pos.z;
                if (ran > DRAGWIN.ran && net < Math.min(DRAGWIN.min, ran * 0.4) && left > DRAGWIN.left && !enemies.some(e => e.dist < e.r + T.heroR + 0.8)) C.blockT = Math.max(C.blockT, 0.51);
              }
            }
          } else C.dragWinT = -1;
          if (C.dragRoute) {
            while (C.dragRoute.length && Math.hypot(C.dragRoute[0].x - P.pos.x, C.dragRoute[0].z - P.pos.z) < 0.45) C.dragRoute.shift();
            if (C.dragRoute.length) { gx = C.dragRoute[0].x; gz = C.dragRoute[0].z; } else C.dragRoute = null;
          } else if (C.blockT > 0.5 && gt - C.dragPlanAt > 1) {
            C.dragPlanAt = gt;
            const r = routeTo(C.tx, C.tz);
            if (r && r.length) { C.dragRoute = r; C.dragRouteTx = C.tx; C.dragRouteTz = C.tz; C.blockT = 0; gx = r[0].x; gz = r[0].z; }
          }
        }
        else if (C.route) {   // walking round an obstacle to a tapped point, corner by corner
          while (C.route.length && Math.hypot(C.route[0].x - P.pos.x, C.route[0].z - P.pos.z) < 0.45) C.route.shift();
          if (C.route.length) { gx = C.route[0].x; gz = C.route[0].z; } else C.route = null;
        }
        const dx = gx - P.pos.x, dz = gz - P.pos.z, d = Math.hypot(dx, dz);
        if (d > (C.drag && !C.dragRoute ? 0.4 : 0.2)) { mx = dx / d; mz = dz / d; want = P.speed * (C.route || C.dragRoute ? 1 : clamp(d / 0.8, 0.35, 1)); }
        else if (!C.drag) C.hasT = false;
        if (!C.drag && C.hasT) tapWalkProgress(gx, gz, d, mx, mz, dt);
        if (!C.drag && C.hasT && C.blockT > 0.3) {   // stuck on the way: find a way round once, else stop trying
          C.blockT = 0;
          const r = C.routeTried ? null : routeTo(C.tx, C.tz);
          C.routeTried = true;
          if (r && r.length) C.route = r; else { C.hasT = false; C.route = null; }
        }
      }
    }
    // Auto-attack: face a grumpy one and swing. Finger up: anything within T.autoR. Finger held (or keys): only one he
    // touches, ahead of him while he moves (so he fights his way through, but running away still works). Also while he waits
    // for a tapped one he cannot reach yet (waitE: behind a wall / lava, stuck, or dug in) — then anything within T.autoR.
    // (Round 5 QA: not with the wand while he goes for a tapped banner — it kept shooting the knight instead, see bannerShot)
    if (!C.swing && P.spin <= 0 && (!C.targetE || waitE) && !(ranged() && tappedBanner())) {
      const held = C.drag || keyMove, moving = want > 0.01, mf = moving ? Math.atan2(mx, mz) : 0;
      let best = null, bd = 1e9;
      for (const e of enemies) {
        if (!e.m.root.visible || hidden(e)) continue;
        const dx = e.x - P.pos.x, dz = e.z - P.pos.z, cd = Math.hypot(dx, dz);
        if (ranged() && (cd >= WAND_RANGE || !los(P.pos.x, P.pos.z, e.x, e.z))) continue;
        if (!held) { const g = cd - e.r; if (g < (ranged() ? WAND_RANGE - e.r : T.autoR) && g < bd) { bd = g; best = e; } continue; }
        const g = cd - e.r - T.heroR;
        if (g >= (ranged() ? WAND_RANGE - e.r - T.heroR : T.autoDragR) || g >= bd) continue;
        if (moving && cd > 1e-3 && Math.abs(angDiff(mf, Math.atan2(dx, dz))) > T.autoDragArc) continue;
        bd = g; best = e;
      }
      if (best) startSwing(Math.atan2(best.x - P.pos.x, best.z - P.pos.z), best);
      // Waited ~1.5 s for the tapped one while another one right here hurts him: forget the tapped one (like a tapped object
      // after 2 s, tgtStall) and fight here — otherwise its walk/wait retries keep pulling him away between swings.
      if (waitE && best && best !== C.targetE && C.tgtStall > 1.5 && gt - C.lastHurt < 1) C.targetE = null;
    }
    // Running away (finger or keys against the swing's direction, > ~110°): a sword swing stops at once — no brake, no turning
    // back to the creature. (A wand shot keeps going: shooting while backing off is fine.)
    if (C.swing && !C.swing.magic && (C.drag || keyMove) && want > 0.01) {
      const sf = C.swingFace !== null ? C.swingFace : P.face;
      if (Math.abs(angDiff(sf, Math.atan2(mx, mz))) > T.fleeArc) { C.swing = null; C.queued = false; C.lastSwingEnd = gt; C.fleeT = gt; }
    }
    // a wand shot while he backs off / dodges sideways (> fleeArc off its facing): full speed, the shot still flies
    const wandFlee = C.swing && C.swing.magic && (C.drag || keyMove) && want > 0.01 &&
      Math.abs(angDiff(C.swingFace !== null ? C.swingFace : P.face, Math.atan2(mx, mz))) > T.fleeArc;
    if (C.swing && !wandFlee) want *= C.swing.magic ? 0.7 : 0.22;
    if (P.spin > 0) want *= 0.85;
    if (want > 0.01) { C.mdx = mx; C.mdz = mz; if (face === null && !C.swing) face = Math.atan2(mx, mz); }
    C.vel = damp(C.vel, want, want > C.vel ? 12 : 18, dt);
    if (C.vel > 0.01) {
      const ox = P.pos.x, oz = P.pos.z, step = C.vel * dt;
      movePlayer(C.mdx * step, C.mdz * step);
      const moved = Math.hypot(P.pos.x - ox, P.pos.z - oz);
      if (want > 0.01 && C.vel > 1 && moved < step * 0.25) C.blockT += dt; else C.blockT = Math.max(0, C.blockT - dt);
    } else C.blockT = 0;
    if (C.lunge.t > 0) { const k = Math.min(dt, C.lunge.t); movePlayer(C.lunge.vx * k, C.lunge.vz * k); C.lunge.t -= dt; }
    if (C.kbx || C.kbz) {
      movePlayer(C.kbx * dt, C.kbz * dt);
      const k = Math.exp(-10 * dt); C.kbx *= k; C.kbz *= k;
      if (Math.abs(C.kbx) + Math.abs(C.kbz) < 0.05) C.kbx = C.kbz = 0;
    }
    if (C.swing && C.swingFace !== null) face = C.swingFace;
    if (face !== null) P.face = dampAngle(P.face, face, C.swing ? 24 : 14, dt);
    C.idleT = (C.vel > 0.3 || C.swing || C.castT >= 0 || P.spin > 0) ? 0 : C.idleT + dt;
    if (face === null && C.idleT > 1.5 && !C.targetE && !C.targetObj && !C.hasT) {   // nothing to do: turn and look at the kid
      let calmNear = true;
      for (const e of enemies) if (e.dist < 8) { calmNear = false; break; }
      if (calmNear) P.face = dampAngle(P.face, CAM.yaw || 0, 2, dt);
    }
    if (C.vel > 2.5) {   // footsteps: little dust puffs + soft taps
      C.stepT -= dt * C.vel / P.speed;
      if (C.stepT <= 0) { C.stepT = 0.3; C.stepSide = -C.stepSide; burst('step', P.pos.x + Math.cos(P.face) * 0.12 * C.stepSide, 0.04, P.pos.z - Math.sin(P.face) * 0.12 * C.stepSide, {}); sfx('step', { vol: 0.22, pitch: frand(0.9, 1.1) }); }
    } else C.stepT = 0.08;
    if (gt - C.lastHurt > T.regenDelay && P.hp < P.maxHp) {
      let fighting = false;
      for (const e of enemies) if (e.aggro) { fighting = true; break; }
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * (hard ? (fighting ? 0 : DIFF.regenCalm * 0.5) : (fighting ? DIFF.regenFight : DIFF.regenCalm)) * dt);
    }
    C.playT += dt;
    if (!F.intro0 && C.playT > 40) introFirstSkill();
    proximity(dt);
  }

  function watchTarget(d, dt) { if (d < C.tgtBest - 0.1) { C.tgtBest = d; C.tgtStall = 0; } else C.tgtStall += dt; }
  // Round 5 QA (the wizard could not knock a tapped banner while the knight fought: he shot the knight on the way, then
  // stood pressed against the big horse parked next to the banner, and every shot hit the horse): a tapped tournament banner
  // is shot with the wand (wizard, the hybrid's wand) from where he is once it is in range and in sight, and that shot flies
  // past the creatures to it (wandHit: p.aim) until the banner is down.
  const tappedBanner = () => { const o = C.targetObj; return !!(o && o.type === 'break' && o.ref.banner && !o.ref.broken); };
  const bannerShot = (o, d) => o.type === 'break' && o.ref.banner && !o.ref.broken && ranged() && d < WAND_RANGE - 1 && los(P.pos.x, P.pos.z, o.x, o.z);

  // ── Interactive objects ──
  function objFromRef(type, ref, reach) { return { type, ref, x: ref.x, z: ref.z, reach }; }
  function interact(o) {
    const r = o.ref;
    if (o.type !== 'break') C.targetObj = null;
    switch (o.type) {
      case 'chest': if (!r.opened) openChest(r); break;
      case 'npc': talkNpc(true); break;
      case 'merchant': visitMerchant(); break;
      case 'cp': activateCp(r, true); break;
      case 'portal': if (storyTalking()) { C.portalHold = true; break; } enterPortal(); break;   // (the story line first: see proximity)
      case 'crystal': victory(); break;
      case 'break':
        if (r.broken) { C.targetObj = null; break; }
        if (!C.swing) startSwing(Math.atan2(r.x - P.pos.x, r.z - P.pos.z), r, !r.banner);   // (a banner: the hybrid's wand from afar)
        break;
    }
  }
  let pathT = 0;
  function proximity(dt) {
    if (!L || GAME.state !== 'play') return;
    const x = P.pos.x, z = P.pos.z;
    if (L.chestObjs) for (const c of L.chestObjs) {   // generous: a kid walking the path should find the treasure
      const rr = c.big ? 2.8 : 2.4;
      if (!c.opened && dist2(c.x, c.z, x, z) < rr * rr && los(x, z, c.x, c.z)) openChest(c);
    }
    pathT -= dt;
    if (pathT <= 0 && pathCum) { pathT = 0.25; const sp = pathProject(x, z, 4); if (sp > pathS) pathS = sp; }
    if (L.cpObjs) for (const cp of L.cpObjs) {   // the whole path width, or simply walking past it on the route
      const d2 = dist2(cp.x, cp.z, x, z);
      if (d2 < 3.2 * 3.2 || (!cp.active && cp._s >= 0 && pathS > cp._s + 0.5 && d2 < 12 * 12)) activateCp(cp, false);
    }
    const po = L.portalObj;
    if (po && po.active !== false) {
      // A portal that just woke up does not swallow Feza standing on/next to it (the boss fight often ends there): he
      // walks in once it has been open PORTAL.wait s (the boss has waved goodbye, its treasure flew to him) and he has
      // been more than PORTAL.arm m away since it opened. A tap on the portal always works.
      // (a kid who just keeps standing in it goes through once the boss's story is over, PORTAL.stay s after it opened)
      // Round 4 QA: a tap (or walking in) while the cheered boss's story line plays cut it in every eager run ("Kefir Devi
      // diyor ki: Ejderha dağ…" and never "Yol mağaradan geçiyor!"; the other bosses lost their "…kapı … açıldı" half):
      // he waits in the swirl (C.portalHold after a tap) and goes the moment the line ends (at most PORTAL.hold s after it opened).
      const d2 = dist2(po.x, po.z, x, z);
      if (po.armed === false && d2 > PORTAL.arm * PORTAL.arm) po.armed = true;
      if (d2 < 1.35 * 1.35) {
        const go = C.portalHold || ((po.armed !== false || gt - po.openT > PORTAL.stay) && !(gt - po.openT < PORTAL.wait));
        if (go && (!storyTalking() || gt - po.openT > PORTAL.hold)) enterPortal();
      } else {
        C.portalHold = false;   // (walked off again: a later walk-in follows the usual rules)
        if (d2 < 9 * 9 && !F.kapi[P.zone]) { F.kapi[P.zone] = true; say('kapi', 1); }
      }
    }
    if (L.npcObj && !F.baykus) {   // walking past the owl (it talks once the narrator is free, while Feza is still close / on screen)
      const d2 = dist2(L.npcObj.x, L.npcObj.z, x, z);
      if (d2 < 3.6 * 3.6) npcWantAt = gt;
      if (d2 < 3.6 * 3.6 || (gt - npcWantAt < 20 && d2 < 9 * 9)) talkNpc(false);
    }
    if (crystal && crystal.ready && dist2(crystal.x, crystal.z, x, z) < 2.0 * 2.0) victory();
    // (Round 4 QA: the forest's name 'orman' is now its first-sight line, see setAggro — said 14 m from the start it was
    // dropped behind the intro in every run)
    if (yolWant) yolculukStep();
  }
  // Round 4: 'yolculuk' (the whole journey), once per new game after giris2 — at the first calm moment: the narrator has
  // been quiet a moment, no fight, and the owl goes first when Feza stands at it (QA: queued right after giris2 it made
  // the opening 36–42 s of talk without a break and the owl's line came 14–19 s after Feza walked past it).
  function yolculukStep() {
    if (F.yolculuk || P.zone !== 0 || finale || !hasLine('yolculuk')) { yolWant = false; return; }
    if (GAME.state !== 'play' || P.dead || speaking() || quietFor() < 2.5) return;   // (a breath after the last line)
    if (gt < skillAt + 0.5 || skillQ.length) return;   // a new button's line first
    if (L && L.npcObj && !F.baykus && dist2(L.npcObj.x, L.npcObj.z, P.pos.x, P.pos.z) < (gt - npcWantAt < 20 ? 81 : 3.6 * 3.6)) return;   // the owl first
    for (const e of enemies) if (e.aggro && !e.dead) return;
    yolWant = false; F.yolculuk = true; say('yolculuk', 3);
  }
  // A cheered boss's story line is playing ('…bitti', or the Kefir Devi's 'kefir_ikram' / 'kefirdev_yol'). AUD.current
  // says what plays; storyEnd (game time the last story line should end, from AUD.say) caps it, so a narrator that never
  // reports the end (no audio clock: a frozen tab, a test stepping frames) cannot hold the portal or the crystal back.
  function storyTalking(final) {
    const b = boss;
    if (!b || !b.dead || !!b.final !== !!final || gt > storyEnd + 0.25 || typeof AUD === 'undefined' || !AUD) return false;
    const c = AUD.current, k = b.kit && b.kit.lines;
    return !!c && (c === (k && k.bitti) || c === 'kefir_ikram' || c === 'kefirdev_yol');
  }
  function storySay(k) { const w = say(k, 3); storyEnd = Math.max(storyEnd, gt + (w || 0)); return w; }
  function openChest(c) {
    if (c.opened) return;
    try { c.open(); } catch (err) { warnOnce('chest.open', err); }
    c.opened = true;
    sfx('chest', { x: c.x, z: c.z });
    if (!F.sandik) { if (say('sandik', 1)) F.sandik = true; }
    else if (Math.random() < 0.25) chat('sandik', 1);
    C.cheerT = Math.max(C.cheerT, 0.6);
    later(0.45, () => {
      const Z = zdef(), big = !!c.big;
      spawnCoins(c.x, c.z, Math.round((big ? 34 : 16) * (Z.gold || 1) * frand(0.85, 1.2)), big ? 14 : 8);
      if (big || Math.random() < DROP.chest) dropItem(big ? 1.4 : 0.6, c.x, c.z);
      if (big || Math.random() < 0.5) spawnLoot('potion', c.x, c.z);
      if (Math.random() < 0.4 * DIFF.heartDrop) spawnLoot('heart', c.x, c.z);
      burst('sparkle', c.x, 0.9, c.z, { count: 20, color: '#ffe27a' });
    });
  }
  function breakObj(b) {
    if (b.broken) return;
    if (b.banner) { knockBanner(b); return; }   // (Round 5: the knight's tournament banners: no loot)
    if (b.bonus) { bonusHit(b); return; }       // (Round 6: the crown, the giant bubble, the carrot, the hearts: no loot)
    try { b.break(); } catch (err) { warnOnce('break', err); }
    b.broken = true;
    sfx('break', { x: b.x, z: b.z, pitch: frand(0.9, 1.15) });
    const Z = zdef();
    if (Math.random() < 0.5) spawnCoins(b.x, b.z, Math.round(frand(2, 6) * (Z.gold || 1)), 3);
    if (Math.random() < 0.1 * DIFF.heartDrop) spawnLoot('heart', b.x, b.z);
    else if (Math.random() < 0.03 && P.potions < P.maxPotions) spawnLoot('potion', b.x, b.z);
  }
  function hitBreakables(x, z, r) {
    if (!L || !L.breakObjs) return 0;
    let n = 0;
    for (const b of L.breakObjs) {
      if (b.broken) continue;
      if (dist2(b.x, b.z, x, z) < (r + (b.r || 0.4)) * (r + (b.r || 0.4))) { breakObj(b); n++; }
    }
    return n;
  }
  function activateCp(cp, tapped) {
    const cur = P.checkpoint && Math.abs(P.checkpoint.cx - cp.x) < 0.01 && Math.abs(P.checkpoint.cz - cp.z) < 0.01;
    if (cp.active && cur && !tapped) return;
    const first = !cp.active;
    if (first) { try { cp.activate(); } catch (err) { warnOnce('cp.activate', err); } cp.active = true; }
    let sx = cp.x, sz = cp.z + 1.6;
    if (!circleFree(sx, sz, T.heroR)) {   // (a spot he fits in: a floor cell right at a wall made him wake up stuck in it)
      let alt = null;
      for (let k = 0; k < 8 && !alt; k++) { const q = hasLevel() && LEVEL.randomFloorNear ? LEVEL.randomFloorNear(L, cp.x, cp.z, 1.3, 2.6) : null; if (q && circleFree(q.x, q.z, T.heroR)) alt = q; }
      if (!alt) alt = freeSpotNear(cp.x, cp.z + 1.6, 1.5) || freeSpotNear(P.pos.x, P.pos.z, 1.5);
      if (alt) { sx = alt.x; sz = alt.z; } else { sx = P.pos.x; sz = P.pos.z; }
    }
    P.checkpoint = { x: sx, z: sz, cx: cp.x, cz: cp.z };
    if (first || tapped) {
      sfx('checkpoint', { x: cp.x, z: cp.z });
      burst('magic', cp.x, 1.2, cp.z, { count: 20, color: '#ff9ae0' });
      // Zor: a yemin taşı heals only when it first lights up — tapping it again (e.g. stepping out of a boss arena
      // to its stone) must not refill Feza over and over (there is no combat regen there either)
      if (first || !hard) heal(1, !first);
      if (!F.nese) { F.nese = true; say('nese_tasi', 2); }
      emit('checkpoint', {});
    }
  }
  function talkNpc(tapped) {
    if (gt - npcTalkAt < (tapped ? 4 : 8)) return;
    // (walking past it: only when the narrator is free — queued behind the intro the owl "talked" 14–17 s later, far off
    // screen; proximity keeps trying while he is near it (≤ 9 m for 20 s after passing it), else it talks when he comes
    // back or taps it)
    if (aud('speaking')) return;
    npcTalkAt = gt; F.baykus = true;
    if (L && L.npcObj && C.vel < 0.5 && !C.swing) faceTo(L.npcObj.x, L.npcObj.z);
    const s = say('baykus', 2);
    npcTalkUntil = gt + (s || 5);
  }
  function owlTalking() {   // AUD.current is the key string of the line playing now (null when silent)
    const cur = typeof AUD !== 'undefined' && AUD ? AUD.current : undefined;
    if (typeof cur === 'string') return cur === 'baykus';
    if (cur && typeof cur === 'object') return cur.key === 'baykus';
    return cur === undefined && gt < npcTalkUntil;
  }
  const PORTAL = { wait: 2.5, arm: 2.5, stay: 6.5, pocket: 24, hold: 8 };
  function enterPortal() {
    if (GAME.state !== 'play') return;
    if (L && L.portalObj && !L.portalObj.active) return;   // shut until the zone's boss cheers up: it does nothing
    pocketLoot(PORTAL.pocket);   // the boss's coins, hearts and treasure still lying around go with him (never lost)
    aud('stopVoice');            // nothing from this zone ('kapi'…) may play in the next one
    GAME.state = 'transition'; C.transT = 0;
    C.targetE = null; C.targetObj = null; C.hasT = false; C.drag = false; C.swing = null; C.vel = 0;
    sfx('portal');
    burst('portal', P.pos.x, 1, P.pos.z, { count: 30 });
    emit('portal', {});
    if (!handlers.portal || !handlers.portal.length) later(1.2, () => loadZone(P.zone + 1));   // no UI listening: go on ourselves
  }

  // ── Projectiles (both owners) ──
  function spawnProjectile(o) {
    const p = {
      x: o.x, y: o.y !== undefined ? o.y : 0.9, z: o.z, vx: o.vx || 0, vz: o.vz || 0, r: o.r !== undefined ? o.r : 0.35,
      dmg: o.dmg !== undefined ? o.dmg : 5, owner: o.owner || 'feza', bossShot: !!o.bossShot, kind: o.kind || 'star', life: o.life !== undefined ? o.life : 3,
      pierce: o.pierce || 0, obj: o.obj || null, color: o.color, onHit: o.onHit || null, kb: o.kb !== undefined ? o.kb : 0.25,
      freeze: o.freeze || 0, stun: o.stun || 0, hit: [], t: 0, ph: o.ph !== undefined ? o.ph : frand(0, TAU),
    };
    if (!p.obj) p.obj = fx('projectile', p.kind, p.color);
    if (!p.obj) { p.obj = new THREE.Mesh(G.sphere(12), glowMat(p.color || '#ffd23f', 3)); p.obj.scale.setScalar(p.r * 0.8); }
    if (!p.obj.parent) scene.add(p.obj);
    p.obj.position.set(p.x, p.y, p.z);
    projectiles.push(p);
    return p;
  }
  // Soap bubbles (the snail's, and the dragon's big pink ones) always pop with sparkles: FX pops its own bubble visuals
  // when they leave the scene; a stand-in visual gets the burst from here.
  const isBubble = p => p.kind === 'bubble' || p.kind === 'dragonfire' || p.kind === 'fizz';   // (Round 4: the kefir fizz bubbles too)
  function bubblePop(p) {
    const u = p.obj && p.obj.userData && p.obj.userData.fxp;
    if (!(u && u.pop)) burst('bubblePop', p.x, p.y, p.z, { color: p.color, scale: p.kind === 'dragonfire' ? 1.5 : 1 });
    sfx('bubblePop', { x: p.x, z: p.z, vol: 0.6, pitch: p.kind === 'fizz' ? 1.25 : 1 });
  }
  function killProjectileObj(p) {
    removeObj(p.obj);
    if (p.obj && p.obj.userData && typeof p.obj.userData.dispose === 'function') { try { p.obj.userData.dispose(); } catch (err) { warnOnce('proj.dispose', err); } }
  }
  function killProjectile(i, poof) {
    const p = projectiles[i];
    if (!p) return;
    const end = p.owner === 'enemy' && SHOT_END[p.kind];
    if (isBubble(p)) bubblePop(p);
    else if (end) { burst(end[0], p.x, Math.max(0.1, p.y), p.z, { color: p.kind === 'rock' ? DIRT : p.color, count: 8 }); if (end[1]) sfx(end[1], { x: p.x, z: p.z, vol: 0.6 }); }
    else if (poof) burst(p.owner === 'feza' ? (p.kind === 'star' ? 'star' : 'sparkle') : 'smoke', p.x, p.y, p.z, { color: p.color, count: 6 });
    killProjectileObj(p);
    projectiles.splice(i, 1);
  }
  function updateProjectiles(dt) {
    // A hit can end the fight or start a nap and remove other shots. Visit each original shot once by identity.
    const frameShots = projectiles.slice();
    for (let i = frameShots.length - 1; i >= 0; i--) {
      const p = frameShots[i];
      if (projectiles.indexOf(p) < 0) continue;
      p.t += dt; p.life -= dt;
      const ox = p.x, oz = p.z;
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (p.kind === 'bubble') { p.by = damp(p.by === undefined ? p.y : p.by, 0.95, 2.5, dt); p.y = p.by + 0.13 * Math.sin(p.t * 5.5); }   // floats and bobs
      else if (p.kind === 'fizz') { p.by = damp(p.by === undefined ? p.y : p.by, 1.0, 2.2, dt); p.y = p.by + 0.16 * Math.sin(p.t * 6.5 + (p.ph || 0)); }   // fizzy: bobs a little livelier
      else if (p.kind === 'jelly') { p.by = damp(p.by === undefined ? p.y : p.by, 0.35, 3, dt); p.y = p.by + 0.75 * Math.abs(Math.sin(p.t * 4.6)); }   // a jelly blob bounces along
      else if (p.owner === 'enemy') p.y = damp(p.y, 0.85, 2.5, dt);
      p.obj.position.set(p.x, p.y, p.z);
      if (p.vx || p.vz) p.obj.rotation.y = Math.atan2(p.vx, p.vz);
      fx('trail', p.kind, p.x, p.y, p.z);
      if (p.life <= 0) { killProjectile(projectiles.indexOf(p), true); continue; }
      if (!isFloor(p.x, p.z) || (p.owner === 'feza' && !los(ox, oz, p.x, p.z))) { killProjectile(projectiles.indexOf(p), true); continue; }
      if (p.owner === 'enemy') {
        if (!P.dead && dist2(p.x, p.z, P.pos.x, P.pos.z) < (p.r + T.heroR) * (p.r + T.heroR)) {
          if (p.onHit) { try { p.onHit(p, null); } catch (err) { warnOnce('onHit', err); } }
          if (projectiles.indexOf(p) < 0) continue;
          hurtPlayer(p.dmg, p.x - p.vx, p.z - p.vz, 0.3);
          if (!isBubble(p)) burst('hit', p.x, p.y, p.z, { color: p.color, count: 8 });
          killProjectile(projectiles.indexOf(p), false);
        }
        continue;
      }
      let dead = false;
      for (let j = p.aim && !p.aim.broken ? -1 : enemies.length - 1; j >= 0; j--) {   // (p.aim: a shot at a tapped banner flies past them)
        const e = enemies[j];
        if (!e || e.dead || hidden(e) || p.hit.indexOf(e) >= 0) continue;
        const rr = p.r + e.r;
        if (dist2(p.x, p.z, e.x, e.z) > rr * rr) continue;
        p.hit.push(e);
        const sp = Math.hypot(p.vx, p.vz) || 1;
        const happy = p.dmg > 0 ? damage(e, p.dmg, { kb: p.kb, fromX: p.x - p.vx / sp, fromZ: p.z - p.vz / sp, kind: p.kind, freeze: p.freeze, stun: p.stun }) : false;
        if (projectiles.indexOf(p) < 0) { dead = true; break; }
        burst('hit', p.x, p.y, p.z, { color: p.color, count: 6 });
        if (p.onHit) { try { p.onHit(p, e, happy); } catch (err) { warnOnce('onHit', err); } }
        if (projectiles.indexOf(p) < 0) { dead = true; break; }
        if (p.pierce > 0) p.pierce--; else { dead = true; break; }
      }
      if (dead) { killProjectile(projectiles.indexOf(p), true); continue; }
      if (L && L.breakObjs) for (const b of L.breakObjs) {
        if (!b.broken && dist2(p.x, p.z, b.x, b.z) < (p.r + (b.r || 0.4)) * (p.r + (b.r || 0.4))) { breakObj(b); dead = true; break; }
      }
      if (dead) killProjectile(projectiles.indexOf(p), true);
    }
  }

  // ── Loot & pickups ──
  // One piece per look in the bag (see DROP): the key of a look, the bag's piece of that look, one lying on the ground.
  const lookKey = it => it.slot + ':' + (it.base && typeof it.base === 'object' ? it.base.id : it.base);
  function ownedLook(item) { const k = lookKey(item); for (const it of P.bag) if (it && lookKey(it) === k) return it; return null; }
  function groundLook(item) { const k = lookKey(item); for (const o of loot) if (o.kind === 'item' && o.item && lookKey(o.item) === k) return o.item; return null; }
  // May `item` replace `have` (same look)? Stronger, never less shiny (the kid's ✦ piece must not turn into a plain one).
  const replaces = (item, have) => item.power > have.power && (item.rarity | 0) >= (have.rarity | 0);
  // Is it worth dropping although Feza has that look? Only if it replaces it (shinier, or clearly stronger) AND he would
  // wear it (stronger than what he wears in that slot) — otherwise it just looks like the same thing dropping again.
  const upgradeOf = (item, have) => replaces(item, have) && ((item.rarity | 0) > (have.rarity | 0) || item.power >= have.power * DROP.upgrade) &&
    item.power > ((P.equip[equipSlot(item)] && P.equip[equipSlot(item)].power) || 0);
  function rollItem(bias, tries = DROP.tries) {
    if (typeof ITEMS === 'undefined' || !ITEMS.roll) return null;
    let up = null;
    for (let i = 0; i < tries; i++) {
      let it = null;
      try { it = ITEMS.roll(ilvlNow(), clamp(bias, 0, 2), Math.random, P.heroClass); } catch (err) { warnOnce('ITEMS.roll', err); return null; }
      if (!it || groundLook(it)) continue;        // never two of the same look at once
      const have = ownedLook(it);
      if (!have) return it;                       // a look Feza doesn't have yet
      if (!up && upgradeOf(it, have)) up = it;    // …otherwise maybe a better copy of one he has, which he will wear
    }
    return up;
  }
  // An item drop; when nothing new or better came up, a little gold instead.
  function dropItem(bias, x, z, tries) {
    const it = rollItem(bias, tries);
    if (it) return spawnItem(it, x, z);
    spawnCoins(x, z, Math.round(5 * (zdef().gold || 1) * frand(0.8, 1.25)), 3);
    return null;
  }
  // Boss treasures have a fixed identity; ordinary monsters and chests still roll random loot.
  function bossItem(e) {   // (an ITEMS without this boss's treasure yet: a shiny random one, as before the class treasures)
    let it = null;
    if (typeof ITEMS !== 'undefined' && ITEMS.bossReward) { try { it = ITEMS.bossReward(e.type, P.heroClass, zdef().ilvl + P.ng * 3); } catch (err) { warnOnce('ITEMS.bossReward', err); } }
    return it || rollItem(2, DROP.tries * 3);
  }
  function dropLoot(e) {
    if (e.arenaChild) return;   // optional arena playmates never become an endless treasure farm
    const gold = Math.round(e.gold * frand(0.8, 1.25));
    if (e.boss) {   // every boss: its own treasure, lots of coins, hearts
      spawnCoins(e.x, e.z, gold, 40, 3.5);
      const item = bossItem(e); if (item) spawnItem(item, e.x, e.z);
      for (let i = 0; i < 3; i++) spawnLoot('heart', e.x, e.z);
      return;
    }
    spawnCoins(e.x, e.z, gold);
    const lowHp = P.hp < P.maxHp * 0.5;
    if (Math.random() < (0.16 + (lowHp ? 0.16 : 0)) * DIFF.heartDrop + (e.elite ? 0.5 : 0)) spawnLoot('heart', e.x, e.z);
    let potOnGround = 0; for (const o of loot) if (o.kind === 'potion') potOnGround++;
    if (P.potions + potOnGround < P.maxPotions && Math.random() < (e.elite ? 0.35 : 0.045)) spawnLoot('potion', e.x, e.z);
    if (Math.random() < (e.elite ? DROP.elite : DROP.normal)) dropItem(e.elite ? 1 : 0, e.x, e.z);
  }
  function spawnCoins(x, z, gold, n, spread = 1) {
    gold = Math.max(1, Math.round(gold));
    n = clamp(n || Math.round(gold / 3), 1, Math.min(gold, 40));
    let left = gold;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? left : Math.max(1, Math.round(gold / n));
      left -= v;
      if (coins.length >= COIN_MAX) { collectCoin(0); }
      const a = frand(0, TAU), s = frand(1.2, 3.0) * spread;
      coins.push({ x, y: 0.6, z, vx: Math.sin(a) * s, vy: frand(4.5, 7), vz: Math.cos(a) * s, value: v, t: 0, rot: frand(0, TAU), mag: false, mt: 0, ph: frand(0, TAU) });
      if (left <= 0) break;
    }
    sfx('drop', { x, z, vol: 0.5, pitch: 1.3 });
  }
  function collectCoin(i) {
    const c = coins[i];
    coins.splice(i, 1);
    P.gold += c.value; goldAcc += c.value; goldAccT = 0.35;
    coinCombo = coinComboT > 0 ? coinCombo + 1 : 0; coinComboT = 0.4;
    sfx('coin', { pitch: 1 + (coinCombo % 8) * 0.06, vol: 0.7 });
    emitP(P.pos.x, 1.1, P.pos.z, frand(-1, 1), frand(1.5, 3), frand(-1, 1), 0.45, 0.28, 0, '#ffe066', '#fff7c2', 2, -2);
    emit('gold', { amount: c.value });
  }
  function updateCoins(dt) {
    const px = P.pos.x, pz = P.pos.z;
    goldAccT -= dt; coinComboT -= dt;
    if (goldAcc && goldAccT <= 0) { ftext(px, 2.1, pz, '+' + goldAcc, 'gold'); goldAcc = 0; }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt;
      const dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz);
      if (!c.mag && c.t > 0.45 && !P.dead && d < T.magnet) c.mag = true;
      if (c.mag) {
        c.mt += dt;
        const sp = Math.min(d, (4 + c.mt * 16) * dt);
        c.x += dx / (d || 1) * sp; c.z += dz / (d || 1) * sp; c.y = damp(c.y, 0.9, 10, dt);
        if (d < 0.45) { collectCoin(i); continue; }
      } else {
        c.vy -= 20 * dt;
        const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
        if (isFloor(nx, c.z)) c.x = nx; else c.vx = -c.vx * 0.5;
        if (isFloor(c.x, nz)) c.z = nz; else c.vz = -c.vz * 0.5;
        c.y += c.vy * dt;
        if (c.y < 0.21) { c.y = 0.21; c.vy = Math.abs(c.vy) > 1 ? -c.vy * 0.38 : 0; c.vx *= 0.55; c.vz *= 0.55; }
      }
      c.rot += dt * (c.mag ? 14 : c.vy ? 8 : 2.6);
    }
    const n = coins.length;
    for (let i = 0; i < n; i++) {
      const c = coins[i], bob = c.vy === 0 && !c.mag ? 0.05 * Math.sin(c.t * 3 + c.ph) + 0.03 : 0;
      _q.setFromEuler(_e.set(0, c.rot, 0));
      _m4.compose(_v.set(c.x, c.y + bob, c.z), _q, _s);
      R.coins.setMatrixAt(i, _m4);
    }
    R.coins.count = n;
    if (n) R.coins.instanceMatrix.needsUpdate = true;
  }
  function itemModel(item) {
    let m = null;
    if (item && typeof ITEMS !== 'undefined' && ITEMS.model) { try { m = ITEMS.model(item); } catch (err) { warnOnce('ITEMS.model', err); } }
    if (!m) m = new THREE.Mesh(G.octa(), glowMat(rarCol(item ? item.rarity : 0), 2));
    const inner = new THREE.Group(); inner.add(m);
    const box = new THREE.Box3().setFromObject(inner), sz = new THREE.Vector3(); box.getSize(sz);
    const k = 0.95 / Math.max(0.2, sz.x, sz.y, sz.z);
    box.getCenter(sz);
    inner.scale.setScalar(k); inner.position.copy(sz).multiplyScalar(-k);
    const wrap = new THREE.Group(); wrap.add(inner);
    shadows(wrap, true, false);
    return wrap;
  }
  function spawnLoot(kind, x, z, item) {
    let main;
    const kef = kind === 'heart' && dairyZone();   // (Round 4) the kefir valley's hearts are little kefir bottles
    if (kef) main = kefirBottleTpl().clone();
    else if (kind === 'heart') main = new THREE.Mesh(heartGeo(), R.heartMat);
    else if (kind === 'potion') main = potionTpl().clone();
    else main = itemModel(item);
    if (kind === 'heart' && !kef) main.castShadow = true;
    const obj = new THREE.Group();
    const col = kind === 'item' ? rarCol(item ? item.rarity : 0) : kind === 'heart' ? '#b85d4e' : '#a9483c';
    const ring = decal(lootRingMat(col), kind === 'item' ? 1.15 : 1.05); ring.position.y = 0.04;
    const blob = decal(R.blobMat, kind === 'item' ? 1.0 : 0.7); blob.position.y = 0.03; blob.renderOrder = 1;
    obj.add(blob, ring, main); scene.add(obj);
    let heart = null;
    if (kef) { heart = new THREE.Mesh(heartGeo(), R.heartMat); heart.scale.setScalar(0.42); obj.add(heart); }   // the red heart over the kefir bottle
    const a = frand(0, TAU), s = frand(0.9, 2.2);
    const o = { kind, obj, main, ring, item, x, z, y: 0.7, vx: Math.sin(a) * s, vz: Math.cos(a) * s, vy: frand(4.5, 6), t: 0, landed: false, beam: null, ph: frand(0, TAU), mag: false, kefir: kef, heart };
    loot.push(o);
    return o;
  }
  function spawnItem(item, x, z) {
    if (!item) return null;
    const o = spawnLoot('item', x, z, item);
    const r = item.rarity || 0;
    sfx(r >= 3 ? 'dropLegend' : r >= 2 ? 'dropRare' : 'drop', { x, z });
    // (from a boss: behind its happy line, and dropped if it cannot follow soon — never in the next zone)
    if (r >= 3) later(0.4, () => { if (!finale) say('efsane', 2, gt < storyUntil ? { wait: 5 } : undefined); burst('confetti', x, 1.5, z, {}); });
    return o;
  }
  function updateLoot(dt) {
    const px = P.pos.x, pz = P.pos.z;
    for (let i = loot.length - 1; i >= 0; i--) {
      const o = loot[i];
      o.t += dt;
      const hoverY = o.kind === 'item' ? 0.62 : o.kind === 'heart' ? (o.kefir ? 0.14 : 0.55) : 0.12;
      const dx = px - o.x, dz = pz - o.z, d = Math.hypot(dx, dz);
      const canTake = o.kind !== 'potion' || P.potions < P.maxPotions;
      if (!o.landed) {
        o.vy -= 18 * dt;
        const nx = o.x + o.vx * dt, nz = o.z + o.vz * dt;
        if (isFloor(nx, o.z)) o.x = nx; else o.vx = 0;
        if (isFloor(o.x, nz)) o.z = nz; else o.vz = 0;
        o.y += o.vy * dt;
        if (o.y <= hoverY && o.vy < 0) {
          o.y = hoverY; o.landed = true;
          if (o.kind === 'item') {
            const r = o.item ? o.item.rarity || 0 : 0;
            o.beam = fx('beam', o.x, o.z, rarCol(r), 2.4 + r * 0.9);
            burst('sparkle', o.x, 0.5, o.z, { color: rarCol(r), count: 8 + r * 6 });
          }
        }
      } else if (!P.dead && canTake && d < T.magnet && o.t > 0.6) o.mag = true;   // hearts, items (and potions if there is room) fly to Feza
      if (o.mag) {
        const sp = Math.min(d, (4 + o.t * 6) * dt);
        o.x += dx / (d || 1) * sp; o.z += dz / (d || 1) * sp;
      }
      const bob = o.landed ? 0.07 * Math.sin(o.t * 2.6 + o.ph) : 0;
      o.obj.position.set(o.x, 0, o.z);
      o.main.position.y = o.y + bob;
      if (o.kefir) {   // a kefir bottle wiggles and turns; its little heart bobs over it, facing the kid, and twinkles now and then
        o.main.rotation.y += dt * 1.5; o.main.rotation.z = 0.16 * Math.sin(o.t * 2.6 + o.ph);
        if (o.heart) {
          o.heart.position.y = o.y + bob + 0.92 + 0.05 * Math.sin(o.t * 3.1 + o.ph);
          o.heart.rotation.set(-0.5, (CAM.yaw || 0) + 0.45 * Math.sin(o.t * 2.2 + o.ph), 0);
          o.heart.scale.setScalar(0.42 * (1 + 0.08 * Math.sin(o.t * 5 + o.ph)));
        }
        if (o.landed && !o.mag && Math.random() < dt * 1.1) burst('sparkle', o.x, o.y + 0.95, o.z, { count: 3, color: '#ae5860' });
      }
      else if (o.kind === 'heart') o.main.rotation.set(-0.5, (CAM.yaw || 0) + 0.55 * Math.sin(o.t * 2.2 + o.ph), 0);
      else { o.main.rotation.y += dt * (o.kind === 'item' ? 1.3 : 1.8); if (o.kind === 'item') o.main.rotation.z = 0.35 * Math.sin(o.t * 1.3); }
      o.ring.scale.setScalar((o.kind === 'item' ? 1.15 : 1.05) * (1 + 0.08 * Math.sin(o.t * 4 + o.ph)));
      if (o.beam && o.beam.obj) o.beam.obj.position.set(o.x, o.beam.obj.position.y, o.z);
      if (o.kind === 'item' && o.item && o.item.rarity >= 2 && Math.random() < dt * 6)
        emitP(o.x + frand(-0.4, 0.4), 0.3, o.z + frand(-0.4, 0.4), 0, frand(0.8, 1.6), 0, 0.9, 0.22, 0, rarCol(o.item.rarity), '#ffffff', 2);
      const pickR = o.kind === 'item' ? 1.05 : 0.85;
      if (o.t > 0.55 && !P.dead && canTake && d < pickR) { pickLoot(o); loot.splice(i, 1); }
    }
  }
  function pickLoot(o) {
    removeObj(o.obj); remove(o.beam);
    if (o.kind === 'heart') {
      heal(DIFF.heart); sfx('heart');
      if (o.kefir) { sfx('slurp', { vol: 0.45, pitch: 1.35 }); burst('fizz', P.pos.x, 1.1, P.pos.z, { count: 8, scale: 0.8 }); }
    } else if (o.kind === 'potion') {
      P.potions = Math.min(P.maxPotions, P.potions + 1); sfx('potion', { pitch: 1.2 });
      ftext(P.pos.x, 2.0, P.pos.z, '+1 İksir', 'heal');
      emit('potion', { count: P.potions });
    } else if (o.item) {
      burst('sparkle', P.pos.x, 1, P.pos.z, { color: rarCol(o.item.rarity), count: 16 });
      sfx('star', { pitch: 1.1 });
      addItem(o.item);
    }
  }
  // A boss's reward flies to Feza after it waved goodbye (its coins spread wide, the magnet only reaches 2.5 m).
  function lootToFeza(x, z, r) {
    for (const c of coins) if (dist2(c.x, c.z, x, z) < r * r) c.mag = true;
    for (const o of loot) if (dist2(o.x, o.z, x, z) < r * r && (o.kind !== 'potion' || P.potions < P.maxPotions)) o.mag = true;
  }
  // Straight into his pockets (walking into the portal): coins as one '+N', hearts, potions (if there is room), treasure.
  function pocketLoot(r) {
    const x = P.pos.x, z = P.pos.z;
    let g = 0;
    for (let i = coins.length - 1; i >= 0; i--) { const c = coins[i]; if (dist2(c.x, c.z, x, z) < r * r) { g += c.value; coins.splice(i, 1); } }
    if (g) { P.gold += g; ftext(x, 2.1, z, '+' + g, 'gold'); sfx('coin', { vol: 0.7 }); emit('gold', { amount: g }); }
    for (let i = loot.length - 1; i >= 0; i--) {
      const o = loot[i];
      if (dist2(o.x, o.z, x, z) >= r * r || (o.kind === 'potion' && P.potions >= P.maxPotions)) continue;
      loot.splice(i, 1); pickLoot(o);
    }
  }
  function addItem(item, force) {
    if (!item || (ITEMS.allowed && !ITEMS.allowed(item, P.heroClass))) return;
    const old = ownedLook(item);
    if (old && old !== item) {   // one piece per look: the stronger copy takes the old one's place (worn → stays worn)
      if (!force && !replaces(item, old)) {   // not stronger, or less shiny (the rolls avoid this): a few coins instead
        const g = Math.max(3, Math.round(item.power / 2));
        P.gold += g; ftext(P.pos.x, 2.1, P.pos.z, '+' + g, 'gold'); sfx('coin', { vol: 0.7 }); emit('gold', { amount: g });
        return;
      }
      P.bag[P.bag.indexOf(old)] = item;
    } else if (P.bag.indexOf(item) < 0) P.bag.push(item);
    const cur = P.equip[equipSlot(item)];
    const better = force || !cur || item.power > cur.power;
    if (better) equip(item, true);
    emit('item', { item, equipped: better });
    if (better && (item.rarity || 0) < 3) {   // once per slot per zone (shiny ones always), never over the dragon fight
      const line = item.slot === 'weapon' ? (isWand(item) ? 'degnek' : 'kilic') : item.slot === 'hat' ? 'sapka' : 'pelerin';
      if (!ZF['l_' + line] || (item.rarity || 0) >= 2) { if (chat(line, 1, (item.rarity || 0) >= 2 ? 6 : 15)) ZF['l_' + line] = true; }
    }
    // (not during a boss's story: queued behind it, the portal cut the once-per-game bag hint — a later piece says it)
    if (!better && !F.canta && item.slot !== 'weapon' && !finale && gt >= storyUntil) { F.canta = true; later(1.5, () => say('canta', 1)); }
  }
  function equip(item, quiet) {
    if (!item || !item.slot || (ITEMS.allowed && !ITEMS.allowed(item, P.heroClass))) return;
    if (P.bag.indexOf(item) < 0) P.bag.push(item);
    const slot = equipSlot(item), newBlade = item.slot === 'weapon' && P.equip[slot] !== item;
    // drinking the kefir giant's gift (saber put away): a new blade stays off too until giftDrunk lights it (Round 4 QA:
    // a saber put on in the wardrobe during the sip lit up and he drank holding a lit saber)
    const sheathed = C.lockT > 0 || !!(boss && boss.gift && (boss.gift.stage === 2 || boss.gift.stage === 3));
    P.equip[equipSlot(item)] = item;
    recalcStats();
    if (newBlade && GAME.state !== 'title' && !sheathed) { sfx(isWand(item) ? 'star' : 'saberOn', { vol: 0.8 }); R.pulse = 1; }   // FEZA.setEquip ignites the new blade
    if (H) { try { H.setEquip(P.equip); } catch (err) { warnOnce('H.setEquip', err); } }
    if (H && sheathed && newBlade && typeof H.retract === 'function') { try { H.retract(); } catch (err) { warnOnce('H.retract', err); } }
    burst('sparkle', P.pos.x, 1.0, P.pos.z, { color: rarCol(item.rarity || 0), count: 14 });
    if (!quiet) sfx('click');
    C.cheerT = Math.max(C.cheerT, 0.7);
    emit('equip', { item, slot });
  }
  function unequip(slot) {
    if (slot === 'weapon' || slot === 'offhand' || !P.equip[slot]) return;
    P.equip[slot] = null; recalcStats();
    if (H) H.setEquip(P.equip);
    emit('equip', { item: null, slot });
  }

  // ── XP, levels, skills ──
  function gainXp(n) {
    n = Math.max(0, Math.round(n));
    P.xp += n;
    let ups = 0;
    while (P.xp >= P.xpNext) { P.xp -= P.xpNext; P.lvl++; P.xpNext = xpFor(P.lvl); ups++; }
    if (ups) levelUp();
  }
  function levelUp() {
    recalcStats(); P.hp = P.maxHp;
    const x = P.pos.x, z = P.pos.z;
    burst('levelup', x, 0.1, z, {});
    fx('ring', x, z, { r0: 0.4, r1: 4.5, dur: 0.6, color: '#ffe066', width: 0.5 });
    fx('lightFlash', x, z, '#ffe8a0', 5, 0.5);
    const beam = fx('beam', x, z, '#ffd23f', 5);
    if (beam) later(1.3, () => remove(beam));
    ftext(x, 2.6, z, 'Seviye ' + P.lvl + '!', 'word');
    sfx('levelup');
    if (!GAME.skills.some((s, i) => canUnlock(s, i))) chat(ranged() && P.lvl % 3 === 2 ? (wizard() ? 'seviye_buyu' : 'seviye_hibrit') : 'seviye' + (1 + (P.lvl % 3)), 2, 6);   // a new skill's line matters more
    C.cheerT = 1.4;
    emit('levelup', { lvl: P.lvl });
    checkUnlocks(true);
  }
  // Skills unlock by level (SKILLS[i].lvl); the first one waits for the first fight (see introFirstSkill) unless lvl ≥ 2.
  const canUnlock = (s, i) => !s.unlocked && P.lvl >= (s.def.lvl || 1) && (i > 0 || !!F.intro0 || P.lvl >= 2);
  function checkUnlocks(announce) {
    GAME.skills.forEach((s, i) => {
      if (!canUnlock(s, i)) return;
      s.unlocked = true; s.cd = 0;
      if (announce) { later(0.3 + i * 0.05, () => sfx('unlock')); if (!finale && s.def.line) skillLine(s.def.line); emit('skill', { index: i }); }   // teaches the new button: never dropped
    });
  }
  // The meteor comes with Çürük Taç's cheer (its xp is a level-up): its line must not push the boss's goodbye and the door
  // behind it — nor play inside the next zone before that zone's name. Held until skillAt (boss +7.5 s, or right after the
  // next zone's line), then queued as usual.
  // Round 4 QA: a skill won at a mid-zone boss always waits for the next zone (right after its name): in the old zone the
  // portal cut it (stopVoice) and it was never repeated. At prio 3 a full queue drops a chattier line instead of it.
  const holdSkill = () => gt < storyUntil || gt < skillAt || !!(boss && boss.dead && !boss.final);
  function skillLine(k) {
    if (holdSkill()) { if (skillQ.indexOf(k) < 0) skillQ.push(k); }
    else say(k, 3, { wait: 40 });
  }
  function flushSkillLines() {
    if (!skillQ.length) return;
    if (finale) { skillQ.length = 0; return; }
    if (GAME.state !== 'play' || holdSkill()) return;
    for (const k of skillQ.splice(0)) say(k, 3, { wait: 40 });
  }
  function introFirstSkill() {
    if (F.intro0) return;
    F.intro0 = true;
    later(1.2, () => checkUnlocks(true));
  }

  // ── A boss cheers up: the dragon's crystal finale, or (mid-zone boss) treasure + the portal opens ──
  function bossDown(b) {
    emit('boss', { on: false, type: b.type });
    remove(b.tele); b.tele = null;
    aud('stopVoice');   // drop stale fight lines ('çok az kaldı', level-ups…): the story lines come next
    const k = b.kit.lines.bitti; if (k && hasLine(k)) storySay(k);
    shake(0.4); C.cheerT = 2.5;
    burst('confetti', b.x, 3, b.z, {}); burst('confetti', P.pos.x, 2.5, P.pos.z, {});
    if (!b.final) sfx('cheer', { vol: 0.7 });
    // everyone nearby cheers up too (directly: damage() would wake them and announce elites 'geliyor!')
    // (its arena playmates — whelps, split jellies — always: clearEncounter(b, true) left them for this)
    for (const e of enemies.slice()) if (!e.dead && (e.arenaChild === b || dist2(e.x, e.z, b.x, b.z) < 30 * 30)) makeHappy(e, { silent: true });   // (makeHappy directly: hidden() never blocks it)
    for (const m of mortars) { killProjectileObj(m); remove(m.tele); }
    mortars.length = 0;
    // shots already flying pop with their little end burst (they must not hurt Feza during the cheer)
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].owner === 'enemy') killProjectile(i, true);
    aud('music', zdef().music || 'kale');
    // the kefir giant: giftStep wakes its portal on the gift's own clock (a nap pauses the hand-over), as its 'kefirdev_yol'
    // line reaches "Yol mağaradan geçiyor!" (a late backstop, never needed in the tests)
    if (b.gift) later(b.gift.beat + 14, () => { const po = L && L.portalObj; if (!po || !po.active) openPortal(); });
    else if (!b.final) later(1.5, openPortal);    // its line says the magic door opened: it opens while the boss waves goodbye
  }
  // ── Round 4: the kefir giant's gift. Stages on the cheered-up boss (it stays, overjoyed, before it waves): it holds out a
  // glass of kefir (05: st.give 0..1 drives the hand-over — the glass pops into its hand, the arm reaches out to Feza, the
  // model hands it over at ~0.85, m.giftPos() = where that glass is; st.dying stays below the model's dieFrom so it stands
  // still meanwhile) → GAME's own glass takes over at the hand-over and floats to Feza → he puts the saber away and raises
  // it (cheer) → sips through the straw (slurp, standing still) → sparkles + full heal + 'kefir_ikram' → the treasure pops
  // out + 'kefirdev_yol' → it waves goodbye (st.dying from dieFrom to 1: the model's happy hops, wave and twirl). Times
  // in s after it cheered up. ──
  const GIFT = { give: 2.0, hand: 0.85, fly: 0.8, raise: 0.45, drink: 1.1, loot: 0.35, bye: 0.5, lock: 0.3, byeDur: 3.2 };
  function giftTimes() {
    const t = {}; t.offer = GIFT.give * GIFT.hand; t.catch = t.offer + GIFT.fly; t.drink = t.catch + GIFT.raise; t.drunk = t.drink + GIFT.drink;
    t.loot = t.drunk + GIFT.loot; t.bye = t.loot + GIFT.bye; return t;
  }
  // the model's goodbye starts at st.dying = dieFrom (05: EDEF.kefirdev.give.to + 0.05; before that it just stands there happy)
  const giftFrom = b => clamp(((b.def.give && b.def.give.to) || 0.45) + 0.05, 0, 0.9);
  const GT = giftTimes();
  const lineLen = k => (hasLine(k) && typeof AUD.estimate === 'function' ? AUD.estimate(k) || 0 : 0);
  // When the 'kefirdev_yol' line should start (bitti now, ikram once he drank, yol right after).
  function giftYol() {
    const ik = Math.max(GT.drunk, lineLen('kefirdev_bitti') + 0.3);
    return clamp(ik + lineLen('kefir_ikram') + 0.3, GT.bye + 1.5, 9.5);
  }
  // When the portal wakes: as 'kefirdev_yol' reaches "Yol mağaradan geçiyor!" (≈ 1.2 s before its end). Round 4 QA: it
  // woke as the line started, the giant had already vanished ("Kefir Devi diyor ki…" over an empty plaza) and a kid who
  // tapped the portal cut the line. Now the giant waves happily while it is quoted and twirls away just before.
  function giftBeat() {
    const y = giftYol();
    return clamp(y + lineLen('kefirdev_yol') - 1.2, y + 1.5, y + 6);
  }
  function kefirGlassTpl() {   // faceted reliquary of blood-red life essence; children retain the sip-level API
    if (R.glass) return R.glass;
    const g = new THREE.Group();
    // (every part is drawn in the transparent pass after Feza's x-ray twin, without writing depth: held in front of him, an
    // opaque glass made the x-ray paint his blue silhouette all over it)
    const XO = { transparent: true, depthWrite: false };
    const gl = new Kit();
    gl.add(G.cyl(1, 0.84, 6, true), '#a79bab', [0, 0.13, 0], 0, [0.085, 0.26, 0.085]);
    gl.add(G.cyl(0.84, 0.84, 6), '#a79bab', [0, 0.008, 0], 0, [0.075, 0.016, 0.075]);
    const glass = new THREE.Mesh(gl.build(), stdMat({ color: '#66506f', transparent: true, opacity: 0.35, roughness: 0.38, metalness: 0.15, depthWrite: false }));
    const dc = new Kit();   // worn bone collar, carved slashes and a crooked bone siphon
    dc.add(G.torus(TAU, 0.16, 6), '#a59380', [0, 0.262, 0], [Math.PI / 2, 0, 0], 0.086);
    dc.add(G.cyl(0.92, 0.9, 6, true), '#49303c', [0, 0.1, 0], 0, [0.087, 0.05, 0.087]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; dc.add(G.box(), '#b3a58f', [Math.sin(a) * 0.078, 0.1, Math.cos(a) * 0.078], [0,a,.25], [0.007,0.026,0.007]); }
    for (let i = 0; i < 6; i++) dc.add(G.cyl(1, 1, 6), i % 2 ? '#978878' : '#392c35', [0.03 - 0.004 * i, 0.12 + i * 0.045, 0.012], [0, 0, 0.09], [0.012, 0.045, 0.012]);
    const deco = new THREE.Mesh(dc.build(), vcMat(Object.assign({ roughness: 0.35, emissive: '#80203c', emissiveIntensity: 0.12 }, XO)));
    const lq = new Kit();
    lq.add(G.cyl(0.97, 0.86, 6), '#b77480', [0, 0.5, 0], 0, [0.078, 1, 0.078]);   // spans y 0..1: scale.y = the level
    const liquid = new THREE.Mesh(lq.build(), stdMat(Object.assign({ color: '#61233d', roughness: 0.48, emissive: '#641937', emissiveIntensity: 0.3 }, XO)));
    liquid.position.y = 0.016; liquid.scale.y = 0.2;
    const fm = new Kit();
    fm.add(G.octa(), '#73394d', [0, 0, 0], 0, [0.078, 0.012, 0.078]);
    fm.add(G.octa(), '#a58188', [0.03, 0.01, 0.02], 0, 0.015); fm.add(G.octa(), '#734f68', [-0.028, 0.008, -0.015], 0, 0.012);
    const foam = new THREE.Mesh(fm.build(), vcMat(Object.assign({ roughness: 0.68, emissive: '#552439', emissiveIntensity: 0.18 }, XO)));
    foam.position.y = 0.216;
    g.add(liquid, foam, glass, deco);   // (children 0 / 1 = liquid / foam: glassLevel; no meshes in userData — clone() JSON-copies it)
    liquid.renderOrder = 25; foam.renderOrder = 26; deco.renderOrder = 26; glass.renderOrder = 27;   // (the x-ray twin is 20)
    g.scale.setScalar(1.35);
    g.rotation.order = 'YXZ';
    return (R.glass = g);
  }
  function glassLevel(g, k) {   // 1 = full, 0 = empty
    const lq = g.children[0], fm = g.children[1];
    if (lq) { lq.scale.y = Math.max(0.005, 0.2 * k); lq.visible = k > 0.02; }
    if (fm) { fm.position.y = 0.016 + 0.2 * k + 0.004; fm.scale.setScalar(0.4 + 0.6 * k); fm.visible = k > 0.02; }
  }
  function giftHand(b) {   // where the kefir giant holds out the glass: the model's (05: m.giftPos), else in front of its belly
    if (b.m.giftPos) { try { const v = b.m.giftPos(_v); if (v) return _v; } catch (err) { warnOnce('giftPos', err); } }
    return _v.set(b.x + Math.sin(b.face) * (b.r + 0.25), Math.max(0.9, b.height * 0.42), b.z + Math.cos(b.face) * (b.r + 0.25));
  }
  const _gm = new THREE.Vector3(), GLASS_S = 1.8;
  function sipSpot(out) {   // where the glass stands while he sips: in front of his chest, the straw's end at his mouth
    const f = P.face, rx = Math.cos(f), rz = -Math.sin(f);
    return out.set(P.pos.x + Math.sin(f) * 0.26 - rx * 0.05, 0.42, P.pos.z + Math.cos(f) * 0.26 - rz * 0.05);
  }
  function giftStep(b, dt) {
    const g = b.gift, s = b.st;
    // Feza napping (a meteor still falling cheered it up): the hand-over waits — the giant keeps holding the glass out, a glass
    // already in the air hovers — and goes on once he is awake at the checkpoint (Round 4 QA: the glass was 'caught' by the
    // sleeping Feza, he then drank it 13 m away with a lit saber, and the drink lock survived the wake-up)
    const asleep = g.stage < 4 && (P.dead || GAME.state !== 'play');
    if (asleep) g.held = true;
    else if (g.held) {   // awake: the glass flies over to him from where it is
      g.held = false; C.lockT = 0;
      if (g.stage >= 1 && g.glass) {   // (a far checkpoint: a longer, gentler flight that still lands at GT.catch)
        const p = g.glass.position, far = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
        g.stage = 1; g.x0 = p.x; g.y0 = p.y; g.z0 = p.z; g.fly0 = GT.offer - clamp(far / 8 - GIFT.fly, 0, 1.2); g.t = g.fly0;
      }
    }
    const t = asleep ? g.t : (g.t += dt);
    // overjoyed (05: st.dying ≥ 0 = the happy pose) but below dieFrom: it stands still while it gives
    s.dying = Math.min(0.02, giftFrom(b) * 0.5); s.give = t < GIFT.give && !(g.stage >= 1 && t < GT.offer) ? Math.min(0.999, t / GIFT.give) : 1;   // (a replayed flight after a nap: the hand-over is done)
    s.move = 0; s.windup = -1; s.attack = -1; s.hurt = 0; s.frozen = false; s.air = 0;
    s.phase = 'idle'; s.phaseT = 0;
    s.breath = s.stomp = s.roar = s.fireball = -1;
    if (b.y > 0) b.y = Math.max(0, b.y - dt * 6);
    b.face = dampAngle(b.face, t < GT.drink ? Math.atan2(P.pos.x - b.x, P.pos.z - b.z) : CAM.yaw || 0, 4, dt);
    if (g.stage === 0 && !g.popped && t >= GIFT.give * 0.06) {   // the glass pops into its hand with a fizz
      g.popped = true;
      const h = giftHand(b);
      sfx('cork', { x: b.x, z: b.z, vol: 0.8, pitch: 1.2 }); sfx('fizz', { x: b.x, z: b.z, vol: 0.6, pitch: 1.2 });
      burst('fizz', h.x, h.y, h.z, { count: 12, scale: 1.1 }); burst('sparkle', h.x, h.y, h.z, { count: 10, color: '#fff3c4' });
    }
    const gl = g.glass;
    // handed over: GAME's glass takes over from the one in its hand (Feza far away: a bit earlier, so the longer, gentler
    // flight still lands at GT.catch — 13 m in 0.8 s was a zip)
    let far = 0;
    if (g.stage === 0) { const hv = giftHand(b); far = Math.hypot(hv.x - P.pos.x, hv.z - P.pos.z); }
    if (g.stage === 0 && !asleep && t >= GT.offer - clamp(far / 8 - GIFT.fly, 0, 1.2)) {
      g.stage = 1; g.fly0 = t;
      const h = giftHand(b), o = kefirGlassTpl().clone();
      glassLevel(o, 1); o.position.copy(h); o.scale.setScalar(GLASS_S * 0.8); scene.add(o);
      g.glass = o; g.x0 = h.x; g.y0 = h.y; g.z0 = h.z;
      sfx('whoosh', { x: b.x, z: b.z, vol: 0.4, pitch: 1.5 }); burst('sparkle', h.x, h.y, h.z, { count: 8, color: '#ffffff' });
    }
    if (g.stage === 1 && gl) {   // it floats over to Feza in a soft arc, twinkling
      const f0 = g.fly0 !== undefined ? g.fly0 : GT.offer, k = clamp((t - f0) / (GT.catch - f0), 0, 1), e = smooth01(k);
      sipSpot(_gm); _gm.y = 1.1;
      gl.position.set(lerp(g.x0, _gm.x, e), lerp(g.y0, _gm.y, e) + 1.1 * Math.sin(Math.PI * k), lerp(g.z0, _gm.z, e));
      gl.scale.setScalar(GLASS_S * (0.8 + 0.2 * k)); gl.rotation.set(0, P.face + k * TAU, 0.2 * Math.sin(k * Math.PI));
      if (Math.random() < dt * 30) emitP(gl.position.x, gl.position.y, gl.position.z, frand(-0.3, 0.3), frand(0.2, 0.8), frand(-0.3, 0.3), 0.7, 0.24, 0, '#a47991', '#c6abb2', 2);
      if (k >= 1 && !asleep) {   // caught: saber away, glass up (a little cheer)
        g.stage = 2;
        // (a İnfaz Çemberi cast just before the catch kept him whirling through the whole drink: 08_skills ends it when P.spin is 0)
        P.spin = 0; P.castT = 0; C.castT = -1; C.swing = null;
        if (H && typeof H.retract === 'function' && H.bladeOn !== false) { try { H.retract(); } catch (err) { warnOnce('H.retract', err); } if (!wizard()) sfx('saberOff', { vol: 0.6 }); }
        C.lockT = GT.drunk - t + GIFT.lock; C.lockFace = CAM.yaw || 0; C.cheerT = GIFT.raise;
        emit('gift', { stage: 'drink', x: P.pos.x, z: P.pos.z, dur: GT.drunk - t });   // (UI may frame Feza while he drinks)
        sfx('pop', { pitch: 1.4, vol: 0.6 }); burst('sparkle', gl.position.x, gl.position.y, gl.position.z, { count: 12, color: '#ffffff' });
      }
    }
    if ((g.stage === 2 || g.stage === 3) && gl) {
      C.lockFace = CAM.yaw || 0;
      if (g.stage === 2) {   // raised in his hand
        const hh = H && H.hand && H.hand.lengthSq() > 0 ? H.hand : sipSpot(_gm);
        gl.position.set(hh.x, Math.max(hh.y + 0.06, 0.9), hh.z); gl.rotation.set(0, P.face, 0); gl.scale.setScalar(GLASS_S);
        if (t >= GT.drink && !asleep) { g.stage = 3; C.cheerT = 0; sfx('slurp', { vol: 0.9 }); }
      } else {   // sipping through the straw while the kefir goes down (glug, glug)
        const k = clamp((t - GT.drink) / GIFT.drink, 0, 1), e0 = Math.min(1, k * 4);
        sipSpot(_gm);
        gl.position.lerp(_gm, e0 < 1 ? 0.35 : 1); gl.position.y += 0.012 * Math.sin(t * 22) * (1 - k);
        gl.rotation.set(-0.14 * e0, P.face, 0.05 * Math.sin(t * 9));
        glassLevel(gl, 1 - smooth01(k));
        if (Math.random() < dt * 16) emitP(_gm.x, _gm.y + 0.35, _gm.z, frand(-0.2, 0.2), frand(0.5, 1.1), frand(-0.2, 0.2), 0.6, 0.16, 0, '#a67e92', '#baa0b5', 2);
        if (k >= 1 && !asleep) giftDrunk(b);
      }
    }
    if (g.stage === 4 && t >= GT.loot) giftLoot(b);
    // the usual goodbye: waves, hops, twirls and vanishes in sparkles (the model's part after dieFrom) — timed to vanish just
    // before its portal wakes, so it is still there, waving, when the narrator says "Kefir Devi diyor ki…"
    if (g.stage === 5 && t >= (g.byeAt || GT.bye)) {
      const from = giftFrom(b);
      g.stage = 6; g.bye = true; b.dieT = from; b.dieDur = GIFT.byeDur / (1 - from); s.give = 1;
      later(Math.max(0, (g.beat || t) - t), () => { const po = L && L.portalObj; if (!po || !po.active) openPortal(); });
    }
  }
  function giftDrunk(b) {   // "Ahh!": the glass pops into sparkles, Feza cheers, full of energy again
    const g = b.gift;
    g.stage = 4;
    if (g.glass) { const p = g.glass.position; burst('sparkle', p.x, p.y, p.z, { count: 18, color: '#fff6d8' }); burst('fizz', p.x, p.y, p.z, { count: 14, scale: 1.2 }); killGlass(g); }
    const hp0 = P.hp; heal(1, true);   // (its xp may have levelled him up = already full: no '+1'; the '+' only over his head)
    if (P.hp - hp0 >= 1) ftext(P.pos.x, 2.3, P.pos.z, '+' + Math.round(P.hp - hp0), 'heal');
    // (not a wall of green '+': a few, with happy hearts and kefir fizz a moment later — Round 4 QA: everything at once at
    // body height hid Feza completely for half a second. Round 4 QA 2: the hearts 'above his head' sat right on the happy
    // giant's smile behind him from the high camera: a little smaller, lower and on the camera side of Feza)
    const cyw = CAM.yaw || 0;
    burst('heal', P.pos.x, 0.8, P.pos.z, { count: 5 }); burst('cheer', P.pos.x + Math.sin(cyw) * 0.6, 1.6, P.pos.z + Math.cos(cyw) * 0.6, { scale: 0.6 });
    kefirMoustache();   // …and a white kefir moustache on his lip for a few seconds
    later(0.25, () => { burst('sparkle', P.pos.x, 1.6, P.pos.z, { count: 8, color: '#fff3c4' }); burst('fizz', P.pos.x, 1.2, P.pos.z, { count: 8, scale: 1.1 }); });
    fx('ring', P.pos.x, P.pos.z, { r0: 0.3, r1: 2.4, dur: 0.5, color: '#9c668e', width: 0.24, k: 0.8, edge: 0.18 });
    fx('lightFlash', P.pos.x, P.pos.z, '#ab789f', 2, 0.5);
    sfx('heart', { pitch: 1.1 }); sfx('levelup', { vol: 0.35, pitch: 1.3 });
    C.cheerT = 1.9; C.lockT = Math.max(C.lockT, 0.35);
    emit('gift', { stage: 'drunk', x: P.pos.x, z: P.pos.z });
    if (hasLine('kefir_ikram')) storySay('kefir_ikram');
    igniteSaber(1.2);   // vvzzum: the lightsaber comes back on after the cheer
  }
  function giftLoot(b) {   // the promised treasure + coins burst out of the happy giant
    const g = b.gift;
    g.stage = 5; g.looted = true;
    spawnCoins(b.x, b.z, b.giftGold || Math.round(b.gold), 40, 3.5);
    if (b.giftItem) spawnItem(b.giftItem, b.x, b.z);
    else if (b.giftExtraGold) spawnCoins(b.x, b.z, b.giftExtraGold, 3);
    b.giftItem = null;
    // (Round 4 QA 2: confetti and fizz at face height of the 3 m bottle covered its big smile: confetti above the cap, the
    // fizz low on both sides of it)
    const rx = Math.cos(b.face) * 0.9, rz = -Math.sin(b.face) * 0.9;
    burst('confetti', b.x, 3.4, b.z, {});
    burst('fizz', b.x + rx, 1.2, b.z + rz, { count: 10, scale: 1.4 }); burst('fizz', b.x - rx, 1.2, b.z - rz, { count: 10, scale: 1.4 });
    sfx('chest', { x: b.x, z: b.z, vol: 0.6, pitch: 1.2 });
    if (hasLine('kefirdev_yol')) storySay('kefirdev_yol');
  }
  function killGlass(g) { if (g && g.glass) { removeObj(g.glass); g.glass = null; } }
  // Life essence leaves two crimson ritual cuts on Feza's upper lip; after MUST.life seconds they fade.
  // One small merged mesh (1 draw call) on the head bone, opaque and writing the hero's stencil like 04's
  // materials (drawn before the x-ray pass, which would otherwise paint his blue silhouette over it). Gone on a zone change
  // or a new game (clearWorld / resetPlayer).
  const MUST = { life: 5, out: 0.3, pop: 0.15 };
  let must = null;   // { obj, t } while he wears it
  function moustacheTpl() {
    if (R.must) return R.must;
    const k = new Kit();
    for (const sd of [-1, 1]) {   // two angular crimson ritual cuts on the upper lip
      k.add(G.box(), '#873949', [sd * 0.038, 0, 0], [0, 0, -sd * 0.55], [0.043, 0.008, 0.012]);
      k.add(G.box(), '#572636', [sd * 0.065, -0.008, -0.004], [0,0,sd*.45], [0.021, 0.007, 0.010]);
    }
    const mat = vcMat({ roughness: 0.65, emissive: '#61263f', emissiveIntensity: 0.16 });
    mat.stencilWrite = true; mat.stencilRef = 1; mat.stencilFunc = THREE.AlwaysStencilFunc;
    mat.stencilZPass = THREE.ReplaceStencilOp; mat.stencilFail = THREE.KeepStencilOp; mat.stencilZFail = THREE.KeepStencilOp;
    const o = new THREE.Mesh(k.build(), mat);
    // on the upper lip, the back half in the skin (head bone space: the face surface is at z ≈ 0.27 there; the mouth is just
    // below, so the open cheering smile shows under it and from the high camera it sits over his mouth)
    o.name = 'kefirMoustache'; o.position.set(0, 0.18, 0.262); o.renderOrder = 5; o.frustumCulled = false; o.castShadow = false;
    // 04 draws (and caches) the hat portraits by moving Feza into its own little scene, also in the background while he
    // wears it (the giant's treasure lands 0.35 s later: a hat's portrait is baked right then): there it folds to nothing
    o.onBeforeRender = function (rd, sc) { if (sc !== scene) this.matrixWorld.makeScale(0, 0, 0); };
    return (R.must = o);
  }
  function kefirMoustache() {
    removeMoustache();
    const head = H && H.bones && H.bones.head;
    if (!head) return;
    const o = moustacheTpl();
    o.scale.setScalar(0.01); head.add(o);
    must = { obj: o, t: 0 };
  }
  function moustacheStep(dt) {
    if (!must) return;
    const t = (must.t += dt), k = t - MUST.life;
    if (k >= MUST.out || !must.obj.parent) { removeMoustache(); return; }
    must.obj.scale.setScalar(k > 0 ? Math.max(0.01, 1 - smooth01(k / MUST.out)) : Math.min(1, 0.01 + t / MUST.pop));
  }
  function removeMoustache() { if (must) { removeObj(must.obj); must = null; } }
  function bossGone(b) {   // it waved and vanished in sparkles
    burst('magic', b.x, 1.5, b.z, { count: 40, color: b.kit.col || '#ad5947' }); burst('sparkle', b.x, 1.5, b.z, { count: 30 });
    fx('lightFlash', b.x, b.z, '#ffc0f0', 6, 0.6);
    lootToFeza(b.x, b.z, 26);   // its coins, hearts and treasure fly to Feza
    // Parent's wish: the dragon cheers up and goes on its way — no little dragon following Feza around afterwards.
    if (b.final) later(0.6, spawnCrystal);
  }
  function openPortal() {
    const po = L && L.portalObj;
    if (!po) { later(3.5, () => { if (GAME.state === 'play') enterPortal(); }); return; }   // (a level without a portal object: go on anyway)
    if (!po.active) { try { if (po.setActive) po.setActive(true); } catch (err) { warnOnce('portal.setActive', err); } po.active = true; }
    burst('portal', po.x, 1.2, po.z, { count: 40 }); burst('sparkle', po.x, 1.5, po.z, { count: 24, color: '#d9c2ff' });
    fx('ring', po.x, po.z, { r0: 0.5, r1: 4, dur: 0.7, color: '#c7a0ff', width: 0.5 });
    fx('lightFlash', po.x, po.z, '#c7a0ff', 5, 0.7);
    sfx('portal', { x: po.x, z: po.z }); later(0.3, () => sfx('unlock'));
    po.openT = gt;   // (Feza standing on it is not swallowed right away: see proximity)
    po.armed = dist2(po.x, po.z, P.pos.x, P.pos.z) > PORTAL.arm * PORTAL.arm;
    F.kapi[P.zone] = true;   // (the walk-up line must not repeat it)
    // 'Sihirli kapı! İçine gir…' — not when the boss's happy line already said the door opened (kraljole, usta), and
    // dropped if it cannot start soon (it used to play 10–13 s later, often inside the next zone)
    const bk = boss && boss.kit && boss.kit.lines && boss.kit.lines.bitti, bt = bk && hasLine(bk) ? String(AUD.LINES[bk]) : '';
    // (the kefir giant: its 'kefirdev_yol' line is just starting and already says where the road goes)
    // (Round 5: the knight's happy line does not mention the door, and it is still playing: 'kapi' waits for its end —
    // a kid bot never heard it with 6 s; entering the portal still stops it)
    if (hasLine('kapi') && !/kap[ıi]/i.test(bt) && !(boss && boss.gift)) say('kapi', 2, { wait: Math.max(6, storyEnd - gt + 3) });
    emit('portalOpen', { x: po.x, z: po.z });
  }
  function spawnCrystal() {
    if (crystal || !L) return;
    const spot = L.crystalSpot || (L.boss ? { x: L.boss.x, z: L.boss.z - 5 } : { x: P.pos.x, z: P.pos.z - 4 });
    let obj = null;
    if (typeof EMODEL !== 'undefined' && EMODEL.crystal) { try { obj = EMODEL.crystal(); } catch (err) { warnOnce('EMODEL.crystal', err); } }
    if (!obj) { obj = new THREE.Mesh(G.octa(), glowMat('#885b99', 2.0)); obj.scale.set(0.8, 1.4, 0.8); obj.position.y = 1.4; }
    const g = new THREE.Group(); g.add(obj); g.position.set(spot.x, -3, spot.z); scene.add(g);
    crystal = { obj: g, x: spot.x, z: spot.z, t: 0, ready: false, beam: fx('beam', spot.x, spot.z, '#885b99', 7) };
    burst('magic', spot.x, 1, spot.z, { count: 30, color: '#885b99' });
    sfx('unlock');
  }
  function updateCrystal(dt) {
    if (!crystal) return;
    crystal.t += dt;
    const k = smooth01(crystal.t / 1.8);
    crystal.obj.position.y = -3 + 3 * k + (k >= 1 ? 0.12 * Math.sin(crystal.t * 2) : 0);
    crystal.obj.rotation.y += dt * 0.7;
    // 'touch it' only once it can be touched — and only after the dragon's story line (Round 4 QA: touchable at +5.7 s while
    // 'ejderha_bitti' was still on "…arkadaş istiyormuş", Feza already stood there: victory cut the story's last words and
    // 'kristal' was never heard). Not said when he is touching it already (its subtitle would flash for one frame).
    if (k >= 1 && !crystal.ready && !storyTalking(true)) {
      crystal.ready = true;
      if (dist2(crystal.x, crystal.z, P.pos.x, P.pos.z) > 2.4 * 2.4) say('kristal', 3);
    }
    if (Math.random() < dt * 10) emitP(crystal.x + frand(-1, 1), frand(0.3, 2.5), crystal.z + frand(-1, 1), 0, frand(0.5, 1.2), 0, 1, 0.3, 0, '#926ca5', '#bc9dcc', 2);
  }
  function victory() {
    if (GAME.state === 'end') return;
    mapOpen = true; try {localStorage.setItem(MAP_KEY,'acik');}catch(e){}
    GAME.state = 'end'; C.cheerT = 1e9;
    C.targetE = null; C.targetObj = null; C.hasT = false; C.drag = false; C.swing = null; C.vel = 0;
    if (crystal) faceTo(crystal.x, crystal.z);
    emit('victory', {});
    aud('stopVoice');   // nothing stale may follow the ending line
    say('son', 3);
    aud('music', 'zafer');
    for (let i = 0; i < 5; i++) later(i * 0.6, () => { burst('confetti', P.pos.x + frand(-3, 3), 3, P.pos.z + frand(-3, 3), {}); sfx('cheer', { vol: 0.5 }); });
  }
  function faceTo(x, z) { P.face = Math.atan2(x - P.pos.x, z - P.pos.z); }

  // ── Queries for SKILLS / UI ──
  function enemiesNear(x, z, r) {
    const out = [];
    for (const e of enemies) { const rr = r + e.r * 0.5; if (dist2(e.x, e.z, x, z) <= rr * rr && e.m.root.visible && !hidden(e)) out.push(e); }
    return out;
  }
  function nearestEnemy(x, z, maxR, sight) {   // sight: only one with a clear line (no wall between) from x, z
    let best = null, bd = maxR * maxR;
    for (const e of enemies) {
      if (!e.m.root.visible || hidden(e)) continue;
      const d = dist2(e.x, e.z, x, z);
      if (d < bd && (!sight || los(x, z, e.x, e.z))) { bd = d; best = e; }
    }
    return best;
  }

  // ── Input (UI forwards pointer/keyboard here) ──
  let pickD = 1e9;   // screen distance of the last pick (enemy vs object arbitration)
  function pickEnemy(sx, sy) {
    let best = null, bd = 1e9;
    for (const e of enemies) {
      if (!e.m.root.visible || hidden(e)) continue;
      toScreen(_v.set(e.x, e.y + e.height * 0.5, e.z), _scr);
      if (!_scr.vis) continue;
      const lim = 70 * (e.boss ? 2.4 : e.elite ? 1.3 : 1), d = Math.hypot(_scr.x - sx, _scr.y - sy);
      if (d < lim && d < bd) { bd = d; best = e; }
    }
    pickD = bd;
    return best;
  }
  function pickObject(sx, sy) {
    if (!L) return null;
    let best = null, bd = 1e9;
    const test = (type, ref, y, lim, reach) => {
      toScreen(_v.set(ref.x, y, ref.z), _scr);
      if (!_scr.vis) return;
      const d = Math.hypot(_scr.x - sx, _scr.y - sy);
      if (d < lim && d < bd) { bd = d; best = objFromRef(type, ref, reach); }
    };
    if (L.chestObjs) for (const c of L.chestObjs) if (!c.opened) test('chest', c, 0.5, 80, c.big ? 1.75 : 1.4);
    // a swing reaches ≈ 2.5 m + r (a tall tournament banner: tapped on its flag)
    if (L.breakObjs) for (const b of L.breakObjs) if (!b.broken) test('break', b, b.tapY !== undefined ? b.tapY : b.banner ? 1.5 : 0.5, b.tapLim || (b.banner ? 85 : 60), 2.2 + (b.r || 0.4));
    if (L.cpObjs) for (const c of L.cpObjs) test('cp', c, 1.0, 75, 1.8);
    if (L.npcObj) test('npc', L.npcObj, 1.0, 85, 2.6);
    if (L.merchant) test('merchant', L.merchant, 1.5, 85, 3.1);
    if (L.portalObj && L.portalObj.active !== false) test('portal', L.portalObj, 1.2, 90, 1.2);
    if (crystal && crystal.ready) test('crystal', crystal, 1.5, 100, 1.9);
    pickD = bd;
    return best;
  }
  const input = {
    down(sx, sy) {
      if (GAME.state !== 'play' || P.dead || GAME.paused) return 'move';
      C.sx = C.downSx = sx; C.sy = C.downSy = sy; C.keyX = C.keyZ = 0;
      let e = pickEnemy(sx, sy);
      const ed = pickD;
      const o = pickObject(sx, sy);
      if (e && o && pickD + 25 < ed) e = null;   // clearly aimed at the chest/portal, not the enemy beside it
      if (e) {
        C.targetE = e; C.targetObj = null; C.drag = false; C.hasT = false; C.mode = 'enemy';
        const g0 = typeof groundFromScreen === 'function' ? groundFromScreen(sx, sy, 0) : null;
        C.downGx = g0 ? g0.x : NaN; C.downGz = g0 ? g0.z : NaN;   // (input.move: is the finger leaving it?)
        if (!e.aggro && !e.boss && !los(P.pos.x, P.pos.z, e.x, e.z)) { setAggro(e); e.losOk = false; e.losT = 0.3; }   // behind a wall: it notices Feza and comes round
        fx('ring', e.x, e.z, { r0: e.r, r1: e.r + 0.9, dur: 0.3, color: '#b56b59', width: 0.2 });
        return 'enemy';
      }
      if (o) {
        C.targetObj = o; C.targetE = null; C.drag = false; C.hasT = false; C.mode = 'object';
        fx('ring', o.x, o.z, { r0: 0.4, r1: 1.4, dur: 0.35, color: '#b69a77', width: 0.2 });
        return 'object';
      }
      C.drag = true; C.mode = 'move'; C.targetE = null; C.targetObj = null; C.route = null; C.routeTried = false; C.dragRoute = null; C.dragWinT = -1;
      C.progGx = NaN; C.autoBrk = 0;   // a fresh net-progress window (tapWalkProgress)
      const g =typeof groundFromScreen === 'function' ? groundFromScreen(sx, sy, 0) : null;
      if (g) { C.tx = g.x; C.tz = g.z; C.hasT = true; fx('ring', g.x, g.z, { r0: 0.1, r1: 0.75, dur: 0.3, color: '#a185b7', width: 0.14 }); }
      return 'move';
    },
    move(sx, sy) {
      C.sx = sx; C.sy = sy;
      // a finger that follows a hopping enemy keeps attacking it; a real drag turns into walking — at once (≥ 26 px) when the
      // finger heads away from the tapped one (parent: "kaçmaya çalışınca Feza boss'un yanından ayrılmıyor"), else after 90 px
      if (C.mode && C.mode !== 'move') {
        const md = Math.hypot(sx - C.downSx, sy - C.downSy);
        let away = false;
        if (md >= 26 && md <= 90 && C.targetE && typeof groundFromScreen === 'function') {
          const g = groundFromScreen(sx, sy, 0), e = C.targetE;
          // the finger's way on the ground since it touched the creature, against Feza → creature: heading back / off to the side
          if (g && C.downGx === C.downGx) {
            const dx = g.x - C.downGx, dz = g.z - C.downGz, l = Math.hypot(dx, dz), ex = e.x - P.pos.x, ez = e.z - P.pos.z, el = Math.hypot(ex, ez) || 1;
            away = l > 0.3 && (dx * ex + dz * ez) / (l * el) < Math.cos(T.fleeArc);   // back or sideways
          }
        }
        if (md > 90 || away) { C.mode = 'move'; C.drag = true; C.targetE = null; C.targetObj = null; C.dragWinT = -1; C.swing = C.swing && C.swing.magic ? C.swing : null; C.queued = false; }
      }
    },
    up() {   // (a way round found while dragging: the walk to the last point goes on along it)
      if (C.drag && C.dragRoute && C.dragRoute.length) { C.route = C.dragRoute; C.routeTried = true; }
      C.drag = false; C.mode = null; C.dragRoute = null;
    },
    key(x, z) {
      x = x || 0; z = z || 0;
      const yaw = CAM.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw);
      C.keyX = x * c + z * s; C.keyZ = -x * s + z * c;
      if (x || z) { C.drag = false; }
    },
    attack() { attackButton(); },
    cast(i) { return cast(i); },
    potion() { return drinkPotion(); },
  };

  // Mırmır visits every other chapter. Stock belongs to this adventure/chapter, never to an opened menu.
  const SHOP_ZONES = ['kefir', 'yanardag', 'kale'];
  const shopKey = () => P.ng + ':' + zdef().id;
  function merchantNear(r = 3.4) {
    const m = L && L.merchant;
    return !!(m && !L._title && dist2(P.pos.x, P.pos.z, m.x, m.z) <= r * r);
  }
  function merchantWard() { return !!(P.shopWard && P.shopWard.zone === zdef().id && P.shopWard.ng === P.ng); }
  function merchantInfo() {
    if (!L || !L.merchant || L._title) return null;
    const tier = SHOP_ZONES.indexOf(zdef().id), key = shopKey(), st = P.shopStock[key] || { potion: 0, ward: 0, polish: 0 };
    if (tier < 0) return null;
    const cost = n => Math.round(n[tier] * (1 + P.ng * 0.35));
    const list = [
      { id: 'potion', name: 'Kan İksiri', icon: '🧪', text: 'Çantana 1 can iksiri ekler.', price: cost([45, 75, 110]), left: 3 - st.potion, reason: P.potions >= P.maxPotions ? 'İksir çantan dolu' : '' },
      { id: 'ward', name: 'Mezar Örtüsü', icon: '⛓', text: 'Bu bölümde aldığın hasar %8 azalır. Yenilince kaybolmaz.', price: cost([100, 170, 240]), left: 1 - st.ward, reason: merchantWard() ? 'Mezar Örtüsü etkin' : '' },
    ];
    for (const slot of P.heroClass === 'hybrid' ? ['weapon', 'offhand'] : ['weapon']) {
      const it = P.equip[slot], wand = isWand(it), rank = it ? it.polish || 0 : 0;
      const gain = it ? Math.max(1, Math.round((it.polishBase || it.power) * 0.12)) : 0;
      list.push({ id: slot, name: wand ? 'Ruh Mührü' : 'Celladın Bileği', icon: wand ? '⛓' : '⚔',
        text: it ? `${it.ad}: +${gain} silah gücü. Bu eşyada ${rank}/2 güçlendirme.` : 'Önce bir silah kuşan.',
        price: cost([130, 220, 320]), left: 2 - st.polish, reason: !it ? 'Kuşanılmış silah yok' : rank >= 2 ? 'Bu silah tamamlandı' : '', rank, gain });
    }
    for (const o of list) {
      o.left = Math.max(0, o.left);
      if (!o.reason && !o.left) o.reason = 'Bu bölümde tükendi';
      if (!o.reason && P.gold < o.price) o.reason = `${o.price - P.gold} altın daha gerekli`;
      o.enabled = !o.reason;
    }
    return { name: 'Kül Tüccarı', gold: P.gold, ward: merchantWard(), offers: list };
  }
  function visitMerchant() {
    if (GAME.state !== 'play' || P.dead || !merchantNear()) return false;
    C.targetObj = C.targetE = null; C.hasT = C.drag = false; C.swing = null; C.vel = 0; C.keyX = C.keyZ = 0;
    faceTo(L.merchant.x, L.merchant.z);
    emit('merchant', {}); say('tuccar_merhaba', 2);
    return true;
  }
  function buyMerchant(id) {
    if (GAME.state !== 'play' || P.dead || !merchantNear()) return false;
    const info = merchantInfo(), o = info && info.offers.find(a => a.id === id);
    if (!o || !o.enabled) return false;
    const key = shopKey(), st = P.shopStock[key] || (P.shopStock[key] = { potion: 0, ward: 0, polish: 0 });
    P.gold -= o.price;
    if (id === 'potion') { st.potion++; P.potions++; emit('potion', { count: P.potions }); }
    else if (id === 'ward') { st.ward++; P.shopWard = { zone: zdef().id, ng: P.ng }; }
    else {
      const it = P.equip[id]; st.polish++;
      it.polishBase = it.polishBase || it.power; it.polish = (it.polish || 0) + 1; it.power += o.gain;
      recalcStats(); emit('equip', { item: it, slot: id });
    }
    sfx('star', { vol: 0.7 }); burst('oath', P.pos.x, 0.3, P.pos.z, { count: 12, color: '#b99374', radius: 1.1 });
    say(id === 'potion' ? 'tuccar_iksir' : id === 'ward' ? 'tuccar_bulut' : 'tuccar_parilti', 2);
    emit('gold', { amount: -o.price }); emit('purchase', { name: o.name, price: o.price });
    return true;
  }
  function cleanShop(s) {
    const out = {}, raw = s && s.shopStock;
    if (raw && typeof raw === 'object') for (const key of Object.keys(raw).slice(0, 300)) {
      if (!/^\d{1,2}:(kefir|yanardag|kale)$/.test(key)) continue;
      const v = raw[key]; if (!v || typeof v !== 'object') continue;
      const n = (k, max) => clamp(Number.isFinite(v[k]) ? Math.floor(v[k]) : 0, 0, max);
      out[key] = { potion: n('potion', 3), ward: n('ward', 1), polish: n('polish', 2) };
    }
    return out;
  }

  // ── Save / load ──
  function plainItem(it) {
    const o = {};
    for (const k in it) { const v = it[k]; if (v === null || typeof v !== 'object' && typeof v !== 'function') o[k] = v; else if (k === 'base' && v && v.id) o[k] = v.id; }
    return o;
  }
  function snapshot() {
    const first = {};   // the once-per-game first-sight lines (ilk_kostebek, ilk_kaplumbaga…)
    for (const t in FIRST_LINE) first[FIRST_LINE[t]] = !!F[FIRST_LINE[t]];
    // Kaydet right after a boss cheered up (the parent's natural moment to stop) must keep that win: a mid-zone boss →
    // Devam Et starts in the next zone (as if through its portal); the dragon → the castle again with its crystal waiting.
    const won = !!(boss && boss.dead) || !!crystal, ZL = zones();
    let zone = P.zone, bossDone = -1, gold = P.gold;
    const bag = P.bag.map(plainItem);
    if (won && ZL) {
      if (!finalZone() && P.zone < ZL.length - 1) zone = P.zone + 1;
      else if (finalZone()) bossDone = P.zone;
      // (saved a moment after the cheer: its coins and treasure still flying to him go into the save, as through the portal)
      const bx = boss ? boss.x : P.pos.x, bz = boss ? boss.z : P.pos.z, R2 = 26 * 26;
      for (const c of coins) if (dist2(c.x, c.z, bx, bz) < R2) gold += c.value;
      for (const o of loot) if (o.kind === 'item' && o.item && dist2(o.x, o.z, bx, bz) < R2) bag.push(plainItem(o.item));
      // (the kefir giant's reward before it popped out: Kaydet during the glass of kefir keeps it too)
      if (boss && boss.gift && !boss.gift.looted) { gold += (boss.giftGold || 0) + (boss.giftExtraGold || 0); if (boss.giftItem) bag.push(plainItem(boss.giftItem)); }
    }
    return {
      v: 1, sv: SAVE_V, t: Date.now(), difficulty: hard ? 'hard' : 'normal', heroClass: P.heroClass, zone, zid: zdef(zone).id, lvl: P.lvl, xp: P.xp, gold, potions: P.potions, ng: P.ng,
      bag, roundPower: cleanRoundPower(P.roundPower), shopStock: cleanShop(P), shopWard: P.shopWard && P.shopWard.zone === zdef(zone).id ? Object.assign({}, P.shopWard) : null,
      equip: { weapon: P.bag.indexOf(P.equip.weapon), offhand: P.bag.indexOf(P.equip.offhand), hat: P.bag.indexOf(P.equip.hat), cape: P.bag.indexOf(P.equip.cape) },
      skills: GAME.skills.map(s => !!s.unlocked),
      flags: Object.assign({ intro0: !!F.intro0, baykus: !!F.baykus, sandik: !!F.sandik, nese: !!F.nese, canta: !!F.canta, zl0: !!(F.zl && F.zl[0]), bossDone,
        yolculuk: !!F.yolculuk }, first),
    };
  }
  // Parent's wish: nothing is saved by itself — every launch starts a new game, and progress is kept only when the
  // parent presses Kaydet in the pause menu (UI → GAME.save()). "Devam Et" on the title loads that save.
  function writeSave(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (err) { warnOnce('save', err); return false; }
  }
  function save() {
    if (GAME.state === 'title' || GAME.state === 'end' || GAME.state === 'transition' || (L && L._title)) return false;
    return writeSave(snapshot());
  }
  function readSave() {
    const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (err) { return null; } };
    const validClass = s => s && ['warrior', 'wizard', 'hybrid'].includes(s.heroClass);
    const clean = s => { try { return validClass(s) ? cleanSave(s) : null; } catch (err) { return null; } };
    const current = read(SAVE_KEY), saved = clean(current);
    if (saved) return saved;
    // A former Hardcore checkpoint can be continued as Zor, only if there is no usable ordinary save. Reading never
    // overwrites either slot; the next explicit Kaydet writes the common slot. Keep the old record intact as a backup.
    try { if (legacyIgnored || localStorage.getItem(LEGACY_IGNORED_KEY)) return null; } catch (err) { if (legacyIgnored) return null; }
    const old = read(LEGACY_HARDCORE_KEY);
    return old && old.hardcore === true ? clean(Object.assign({}, old, { difficulty: 'hard' })) : null;
  }
  function clearSave() {
    legacyIgnored = true;
    try { localStorage.setItem(LEGACY_IGNORED_KEY, '1'); } catch (err) { /* this session still ignores the legacy slot */ }
    try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* private mode */ }
  }
  // A save from an older build or a corrupted one must never softlock 'Devam Et': numbers must be finite, the bag an
  // array of known items; unknown items are dropped and equip slots that point at the wrong kind of item are emptied.
  function cleanSave(s) {
    if (!s || typeof s !== 'object' || s.v !== 1) return null;
    const num = (v, d) => (v === undefined || v === null ? d : typeof v === 'number' && isFinite(v) ? v : NaN);
    const lvl = num(s.lvl, 1), xp = num(s.xp, 0), gold = num(s.gold, 0), potions = num(s.potions, DIFF.potions), ng = num(s.ng, 0), zone = num(s.zone, 0);
    if ([lvl, xp, gold, potions, ng, zone].some(v => Number.isNaN(v))) return null;
    if (s.bag !== undefined && s.bag !== null && !Array.isArray(s.bag)) return null;
    const B = typeof ITEMS !== 'undefined' && ITEMS && ITEMS.BASES;
    const baseOf = it => (it.base && typeof it.base === 'object' ? it.base.id : it.base);
    const okItem = it => !!it && typeof it === 'object' && ['weapon', 'hat', 'cape'].indexOf(it.slot) >= 0 && typeof it.power === 'number' && isFinite(it.power) &&
      typeof baseOf(it) === 'string' && (!B || !B[it.slot] || B[it.slot].some(b => b.id === baseOf(it)));
    const heroClass = heroClassOf(s.heroClass);
    const raw = s.bag || [], bag = [], at = new Map();
    raw.forEach((it, i) => {
      if (ITEMS.adaptLegacy) it = ITEMS.adaptLegacy(it, heroClass);
      if (!okItem(it) || (ITEMS.allowed && !ITEMS.allowed(it, heroClass))) return;
      const c = Object.assign({}, it, { base: baseOf(it), rarity: clamp(it.rarity | 0, 0, 3), ilvl: Math.max(1, it.ilvl | 0 || 1), power: Math.max(0, Math.round(it.power)) });
      c.polish = clamp(Number.isFinite(it.polish) ? Math.floor(it.polish) : 0, 0, 2);
      c.polishBase = c.polish && Number.isFinite(it.polishBase) ? clamp(it.polishBase, 0, c.power) : 0;
      // today's name (a save from the test build still says 'Demir Kılıç ✦': every sword is a lightsaber now)
      let nm = null;
      if (typeof ITEMS !== 'undefined' && ITEMS && typeof ITEMS.nameOf === 'function') { try { nm = ITEMS.nameOf(c); } catch (err) { warnOnce('ITEMS.nameOf', err); } }
      c.ad = typeof nm === 'string' && nm ? nm : typeof c.ad === 'string' ? c.ad : c.base;
      at.set(i, bag.length); bag.push(c);
    });
    const eqIn = s.equip && typeof s.equip === 'object' ? s.equip : {}, equip = {};
    for (const slot of ['weapon', 'offhand', 'hat', 'cape']) {
      const j = eqIn[slot], k = Number.isInteger(j) && at.has(j) ? at.get(j) : -1;
      equip[slot] = k >= 0 && equipSlot(bag[k], heroClass) === slot ? k : -1;
    }
    // One piece per look (older builds kept every copy): the shiniest copy stays, then the strongest (same look, so a
    // copy that loses is plainer or weaker); a worn copy that goes hands its slot to the one that stays.
    const keepFirst = (a, b) => ((bag[a].rarity - bag[b].rarity) || (bag[a].power - bag[b].power)) > 0;
    const best = new Map();
    bag.forEach((c, k) => { const key = lookKey(c), j = best.get(key); if (j === undefined || keepFirst(k, j)) best.set(key, k); });
    const slim = [], re = bag.map(() => -1);
    bag.forEach((c, k) => { if (best.get(lookKey(c)) === k) { re[k] = slim.length; slim.push(c); } });
    bag.forEach((c, k) => { if (re[k] < 0) re[k] = re[best.get(lookKey(c))]; });
    for (const slot of ['weapon', 'offhand', 'hat', 'cape']) if (equip[slot] >= 0) equip[slot] = re[equip[slot]];
    const L1 = clamp(Math.floor(lvl), 1, 99);
    const ZL = zones();
    const zn = saveZone(s, Math.max(0, Math.floor(zone)), ZL);
    const flags = s.flags && typeof s.flags === 'object' ? Object.assign({}, s.flags) : {};
    // the crystal-waiting flag names a zone index too (the castle): it moves with the zones
    if (typeof flags.bossDone === 'number' && flags.bossDone >= 0) flags.bossDone = saveZone(s, Math.floor(flags.bossDone), ZL, true);
    return Object.assign({}, s, {
      sv: SAVE_V, difficulty: s.difficulty === 'hard' || (s.difficulty === undefined && s.hardcore === true) ? 'hard' : 'normal', heroClass, lvl: L1, xp: clamp(Math.floor(xp), 0, xpFor(L1) - 1), gold: Math.max(0, Math.floor(gold)), potions: clamp(Math.floor(potions), 0, P.maxPotions),
      ng: clamp(Math.floor(ng), 0, 99), zone: zn, zid: ZL && ZL[zn] ? ZL[zn].id : s.zid, bag: slim, equip,
      skills: Array.isArray(s.skills) ? s.skills : [], flags,
    });
  }
  // A save's zone index in today's ZONES. From sv 4 on the save names its zone (zid). Older ones by index: Round 3 put the
  // volcano before the castle (no sv / sv < 3: zone ≥ 2 → +1), Round 4 the kefir valley after the forest (sv < 4: zone ≥ 1 →
  // +1; an older save gets both steps, in that order). That gives an index in the Round 4 order (ZORDER4) — Round 5's town
  // came after them: an sv < 5 number keeps meaning that order (its castle 4 stays the castle, now 5); an sv 5 number is in
  // ZORDER —, mapped by id onto the ZONES this build really has. noId: ignore zid (a flag that names an index of its own).
  function saveZone(s, zn, ZL, noId) {
    if (!noId && typeof s.zid === 'string' && ZL) { const k = ZL.findIndex(z => z && z.id === s.zid); if (k >= 0) return k; }
    const sv = typeof s.sv === 'number' ? s.sv : 0, order = sv >= 6 ? ZORDER : sv >= 5 ? ZORDER5 : ZORDER4;
    if (sv < 3 && zn >= 2) zn += 1;
    if (sv < 4 && zn >= 1) zn += 1;
    if (ZL) {
      const k = ZL.findIndex(z => z && z.id === order[zn]);
      if (k >= 0) zn = k;
      zn = Math.min(zn, ZL.length - 1);
    }
    return zn;
  }
  function applySave(s) {
    hard = s.difficulty === 'hard';
    P.heroClass = heroClassOf(s.heroClass); buildSkills();
    P.lvl = s.lvl || 1; P.xp = s.xp || 0; P.gold = s.gold || 0; P.potions = clamp(s.potions ?? DIFF.potions, 0, P.maxPotions); P.ng = s.ng || 0;
    P.shopStock = cleanShop(s);
    const ward = s.shopWard;
    P.shopWard = ward && SHOP_ZONES.includes(ward.zone) && ward.ng === P.ng ? { zone: ward.zone, ng: P.ng } : null;
    P.bag = (s.bag || []).filter(Boolean);
    const eq = s.equip || {};
    P.equip = { weapon: P.bag[eq.weapon] || null, offhand: P.heroClass === 'hybrid' ? P.bag[eq.offhand] || null : null, hat: P.bag[eq.hat] || null, cape: P.bag[eq.cape] || null };
    if (typeof ITEMS !== 'undefined' && ITEMS.starter) {
      const starter = ITEMS.starter(P.heroClass);
      for (const slot of P.heroClass === 'hybrid' ? ['weapon', 'offhand'] : ['weapon']) if (!P.equip[slot] && starter[slot]) {
        // A missing or invalid hand index must not create a second copy of a weapon already in the bag.
        let best = null;
        for (const item of P.bag) if (equipSlot(item) === slot && (!best || item.power > best.power)) best = item;
        P.equip[slot] = best || starter[slot];
        if (!best) P.bag.push(starter[slot]);
      }
    }
    const fl = s.flags || {};
    // Skills come from the level (saves by index are unreliable: the skill list changed from 6 to 3).
    GAME.skills.forEach((sk, i) => { sk.cd = 0; sk.unlocked = i === 0 ? !!(fl.intro0 || P.lvl >= 2 || (s.skills && s.skills[0])) : P.lvl >= (sk.def.lvl || 1); });
    F = { zl: { 0: !!fl.zl0 }, kapi: {}, intro0: !!fl.intro0, baykus: !!fl.baykus, sandik: !!fl.sandik, nese: !!fl.nese, canta: !!fl.canta,
      bossDone: typeof fl.bossDone === 'number' ? fl.bossDone : -1, yolculuk: fl.yolculuk !== undefined ? !!fl.yolculuk : true };   // (an older save: its journey was told long ago)
    skillQ.length = 0;
    for (const t in FIRST_LINE) F[FIRST_LINE[t]] = !!fl[FIRST_LINE[t]];
    P.dead = false; P.spin = 0; P.shield = 0;
    recalcStats(); P.hp = P.maxHp;
    P.roundPower = P.ng ? cleanRoundPower(s.roundPower) || captureRoundPower(s.zone) : null;
    if (H) H.setEquip(P.equip);
    checkUnlocks(false);
  }

  // ── Game flow ──
  function useTitleLevel() { return L && L._title && P.zone === 0 && L.theme !== 'bathroom'; }
  function startHere() {   // turn the idle title level into the playable zone 0
    P.zone = 0;
    const st = L.start || { x: 0, z: 0 };
    P.checkpoint = { x: st.x, z: st.z };
    placeHero(st.x, st.z, 0);
    populate();
    GAME.state = 'play';
    emit('zone', { index: 0, name: zdef(0).ad, title: false });
    enterZoneStory(0);
  }
  function newGame(o = {}) {
    if (!inited) init();
    bilboGuardArmed = true; bilboGuardAt = -99;
    const plus = o.plus !== undefined ? !!o.plus : GAME.state === 'end';
    hard = o.difficulty !== undefined ? o.difficulty === 'hard' : plus && hard;
    if (plus) {
      P.ng++; P.dead = false; P.potions = Math.max(P.potions, DIFF.potions);
      for (const s of GAME.skills) s.cd = 0;
      F.zl = {}; F.kapi = {}; F.bossDone = -1; skillQ.length = 0;
      recalcStats(); P.hp = P.maxHp; P.roundPower = captureRoundPower();
    } else { P.heroClass = heroClassOf(o.heroClass); buildSkills(); resetPlayer(); }
    C.playT = 0; C.lastHurt = gt - 99;
    if (!plus && useTitleLevel()) startHere(); else loadZone(0);
    yolWant = false;
    if (plus) say('tekrar', 3);
    else {
      say('giris1', 3);
      const intro = wizard() ? 'giris_buyu' : P.heroClass === 'hybrid' ? 'giris_hibrit' : 'giris2';
      const w = say(intro, 3) || lineLen('giris1') + 0.3 + lineLen(intro);   // (AUD.say: s until giris2 has ended)
      // (Round 4 QA: the first skill's line could be dropped from AUD's full queue at the start — it waits for the intro)
      skillAt = Math.max(skillAt, gt + w + 0.6);
      // (Round 4) the whole journey, once per game: forest, kefir valley, cave, volcano, (Round 5) the walled town, the dragon's castle — at the first
      // calm moment after giris2 (the owl first if Feza stands at it): see yolculukStep
      yolWant = !F.yolculuk && hasLine('yolculuk');
    }
  }
  function continueGame() {
    if (!inited) init();
    const s = readSave();
    if (!s) { GAME.clearSave(); newGame({ plus: false }); return; }
    try { applySave(s); } catch (err) {   // never leave the kid on a dead HUD: start fresh instead
      console.warn('[GAME] unusable save, starting a new game', err);
      GAME.clearSave(); newGame({ plus: false }); return;
    }
    C.playT = 0; C.lastHurt = gt - 99; yolWant = false;
    if (s.zone === 0 && useTitleLevel()) startHere(); else loadZone(s.zone || 0);
    say(s.plus ? 'tekrar' : 'hos_geldin', 3);
  }

  function later(t, fn) { timers.push({ t: gt + t, fn }); }
  function runTimers() {
    for (let i = timers.length - 1; i >= 0; i--) {
      const tm = timers[i];
      if (!tm || tm.t > gt) continue;   // a timer may have cleared the list (zone change)
      timers.splice(i, 1);
      try { tm.fn(); } catch (err) { console.error('[GAME] timer', err); }
    }
  }
  function updateMarkers(dt) {
    const mk = R.marker;
    const show = C.hasT && !C.targetE && !C.targetObj && GAME.state === 'play';
    if (show) {
      if (!mk.visible) { mk.visible = true; R.markerT = 0; }
      R.markerT += dt;
      mk.position.set(C.tx, 0, C.tz);
      const k = 1 - Math.exp(-R.markerT * 12);
      mk.children[0].scale.setScalar(0.5 + 0.45 * k + 0.06 * Math.sin(R.markerT * 8));
      mk.children[0].rotation.z += dt * 1.5;
    } else mk.visible = false;
    const e = C.targetE;
    if (e && !e.dead && GAME.state === 'play') {
      R.sel.visible = true; R.sel.position.set(e.x, 0.05, e.z);
      R.sel.scale.setScalar(e.r * 2.6 + 0.5 + 0.08 * Math.sin(gt * 7)); R.sel.rotation.z -= dt * 1.2;
    } else R.sel.visible = false;
  }
  // Feza's rectangle on screen (px), to dim bars and name tags that would cover him.
  const FR = { x0: 0, x1: 0, y0: 0, y1: 0, ppm: 0, ok: false };
  const _cr = new THREE.Vector3();
  function fezaRect() {
    FR.ok = false;
    if (typeof toScreen !== 'function') return;
    toScreen(_v.set(P.pos.x, 0.05, P.pos.z), _scr); const fx0 = _scr.x, fy = _scr.y;
    if (!_scr.vis) return;
    toScreen(_v.set(P.pos.x, 1.6, P.pos.z), _scr); const hy = _scr.y;
    _cr.setFromMatrixColumn(camera.matrixWorld, 0);   // camera right
    toScreen(_v.set(P.pos.x + _cr.x, 0.8, P.pos.z + _cr.z), _scr); const rx = _scr.x;
    toScreen(_v.set(P.pos.x, 0.8, P.pos.z), _scr);
    FR.ppm = Math.abs(rx - _scr.x);
    const hw = FR.ppm * 0.42;
    FR.x0 = fx0 - hw; FR.x1 = fx0 + hw; FR.y0 = Math.min(hy, fy); FR.y1 = Math.max(hy, fy) + FR.ppm * 0.12; FR.ok = true;
  }
  function coversFeza(x, y, z, hwM, hhM) {
    if (!FR.ok) return false;
    toScreen(_v.set(x, y, z), _scr);
    if (!_scr.vis) return false;
    const hw = hwM * FR.ppm, hh = hhM * FR.ppm;
    return _scr.x + hw > FR.x0 && _scr.x - hw < FR.x1 && _scr.y + hh > FR.y0 && _scr.y - hh < FR.y1;
  }
  function updateBars(dt) {
    const a = R.barAttr, af = R.barFade;
    let n = 0;
    fezaRect();
    for (const e of enemies) {
      if (e.boss || !e.m.root.visible) continue;
      if (e.bur > 0.5) { if (e.tag) e.tag.visible = false; continue; }   // underground: only the dirt mound shows
      const frac = Math.max(0, e.hp / e.maxHp);
      if (e.bar.delay > 0) e.bar.delay -= dt; else e.bar.trail = damp(e.bar.trail, frac, 5, dt);
      if (e.bar.trail < frac) e.bar.trail = frac;
      const near = e.aggro || e.dist < 14;   // an idle elite in the next room must not float its name over the wall
      const showBar = !(frac >= 0.999 && !(e.elite && near));
      const by = e.y + e.height + 0.32;
      let cover = false;
      if (e.dist < 9) {
        if (showBar) cover = coversFeza(e.x, by, e.z, e.elite ? 0.75 : 0.52, 0.12);
        if (!cover && e.tag && e.tag.visible) cover = coversFeza(e.x, e.y + e.height + 0.78, e.z, e.tag.scale.x * 0.42, 0.24);
      }
      e.fade = damp(e.fade, cover ? 0.25 : 1, 10, dt);
      if (e.tag) {   // name while it is idle nearby and for 3 s after it notices Feza; then only the bar
        e.tag.visible = near && (!e.aggro || gt - e.aggroAt < 3);
        e.tag.material.opacity = e.fade;
      }
      if (!showBar) continue;
      _m4.makeTranslation(e.x, by, e.z);
      R.bars.setMatrixAt(n, _m4);
      a.setXYZW(n, frac, e.bar.trail, e.elite ? 1 : 0, e.elite ? 1.45 : 1);
      af.setX(n, e.fade);
      if (++n >= BAR_MAX) break;
    }
    R.bars.count = n;
    if (n) { R.bars.instanceMatrix.needsUpdate = true; a.needsUpdate = true; af.needsUpdate = true; }
  }
  function updateHero(dt) {
    if (!H) return;
    const castP = P.castT > 0 && P.castDur ? 1 - P.castT / P.castDur : C.castT;
    HST.hybrid = P.heroClass === 'hybrid'; HST.magicAttack = !!(C.swing && C.swing.magic);
    HST.move = clamp(C.vel / P.speed, 0, 1);
    HST.attack = C.swing && !C.swing.magic ? clamp(C.swing.t / C.swing.dur, 0, 1) : -1;
    HST.swingDir = C.swing ? C.swing.dir : C.swingDir;
    HST.cast = C.swing && C.swing.magic ? clamp(C.swing.t / C.swing.dur, 0, 0.999) : castP >= 0 && castP < 1 ? castP : -1;
    HST.spin = P.spin > 0; HST.hurt = C.hurtT; HST.dead = P.dead; HST.cheer = C.cheerT > 0; HST.idleT = C.idleT;
    HST.sitRead = !!(GAME.state === 'title' && L && L.readingSpot);
    H.root.position.copy(P.pos); H.root.rotation.y = P.face;
    bladeLight(dt);
    try { H.update(dt, HST); } catch (err) { warnOnce('H.update', err); }
  }
  // Feza's light takes the lightsaber's colour: clearly in the dark cave/castle (the theme light is tinted and a bit
  // brighter), subtly in the sunny forest (a small coloured glow around him). Slashes pulse it; it fades while he naps.
  const _lbc = new THREE.Color();
  function fezaLightBase() {
    if (typeof LIGHTS === 'undefined' || !LIGHTS.feza) return;
    const l = LIGHTS.feza;
    R.fezaBase = { c: l.color.clone(), i: l.intensity, d: l.distance, k: l.decay };
  }
  function bladeLight(dt) {
    if (typeof LIGHTS === 'undefined' || !LIGHTS.feza) return;
    const l = LIGHTS.feza;
    // Hero light (dark levels) at head height. A boss (or another big one) right against Feza: that spot is inside its face
    // and blew it out white → the light slides to Feza's far side from it, lower, and dims a little the closer it is.
    let nk = 0, nx = 0, nz = 0;
    for (const e of enemies) {
      if (!(e.boss || e.r >= 1) || !e.m.root.visible) continue;
      const dx = e.x - P.pos.x, dz = e.z - P.pos.z, d = Math.hypot(dx, dz), k = clamp((e.r + 2.2 - d) / 1.0, 0, 1);
      if (k > nk) { nk = k; nx = d > 1e-3 ? dx / d : 0; nz = d > 1e-3 ? dz / d : -1; }
    }
    R.lightNear = damp(R.lightNear || 0, nk, 8, dt);
    if (nk > 0) { R.lightNx = nx; R.lightNz = nz; }
    const q = R.lightNear, ax = R.lightNx || 0, az = R.lightNz || 0;
    l.position.set(P.pos.x - ax * 1.3 * q, lerp(2.4, 1.4, q), P.pos.z + lerp(0.6, 0.5, q) - az * 1.3 * q);
    const base = R.fezaBase;
    if (!base) return;
    const on = !P.dead && GAME.state !== 'transition' && H && H.bladeOn !== false && !!P.equip.weapon;
    R.bladeK = damp(R.bladeK || 0, on ? 1 : 0, on ? 5 : 8, dt);
    R.pulse = Math.max(0, (R.pulse || 0) - dt * 4);
    const k = R.bladeK, dark = base.i > 0.05;
    _lbc.set(bladeColor());
    l.color.copy(base.c).lerp(_lbc, (dark ? 0.6 : 1) * k);
    if (dark) { l.intensity = base.i * (1 + 0.12 * k + 0.3 * R.pulse) + (1.0 + 1.2 * R.pulse) * k; l.distance = base.d; l.decay = base.k; }
    else { l.intensity = (0.7 + 1.4 * R.pulse) * k; l.distance = 5; l.decay = 1.6; }
    l.intensity *= 1 - 0.4 * R.lightNear;
  }
  function igniteSaber(delay = 0) {
    const go = () => {
      if (!H || P.dead || GAME.state === 'title') return;
      if (typeof H.ignite === 'function') { try { H.ignite(); } catch (err) { warnOnce('H.ignite', err); } }
      sfx(wizard() ? 'star' : 'saberOn', { vol: 0.85 }); R.pulse = 1;
    };
    if (delay > 0) later(delay, go); else go();
  }

  // One simulation step. UI calls it every frame while a game is running (states play/dead/transition/end).
  function update(dt) {
    if (!inited || GAME.paused || GAME.state === 'title') return;
    if (hitstop > 0) { hitstop -= dt; dt *= 0.1; }
    gt += dt;
    GAME.time = gt;
    if (speaking()) talkAt = gt;
    runTimers();
    const st = GAME.state;
    flushSkillLines();
    if (st === 'play') updatePlayer(dt);
    else {
      C.hurtT = Math.max(0, C.hurtT - dt * 3); C.vel = damp(C.vel, 0, 10, dt); C.swing = null;
      if (st === 'dead') { C.deadT += dt; if (C.deadT >= T.respawn) respawn(); }
      if (st === 'transition' && H) { C.transT += dt; H.root.scale.setScalar(baseScale * Math.max(0.05, 1 - C.transT / 0.7)); P.face += dt * 12; }
    }
    if (L) {
      actT -= dt; if (actT <= 0) { actT = 0.3; activate(false); flushFirst(); }
      if (st === 'play' && (mooT -= dt) <= 0) {   // (the kefir valley's ambience: 'moo', rare, never in a fight)
        // Round 4 QA: one busy moment used to throw away a whole 45–90 s cycle (0 moos in 240 s of play): a moment that is
        // not calm (a fight nearby, the boss, a story, the narrator talking) retries in a few s; after a moo 25–45 s
        // (Round 5: the walled town's far bell tower dings instead, a deeper 'bell')
        const town = townZone();
        if (!dairyZone() && !town) mooT = frand(25, 45);
        else if (P.dead || finale || gt < storyUntil || (boss && (boss.dead ? boss.gift && !boss.gift.bye : boss.aggro)) || speaking()
          || enemies.some(e => e.aggro && (e.boss || e.dist < 12))) mooT = frand(3, 6);
        else {
          mooT = frand(25, 45); const a = frand(0, TAU), x = P.pos.x + Math.sin(a) * 11, z = P.pos.z + Math.cos(a) * 11;
          if (town) { sfx('bell', { x, z, vol: 0.5, pitch: 0.62 }); later(0.9, () => sfx('bell', { x, z, vol: 0.4, pitch: 0.62 })); }
          else sfx('roar', { x, z, vol: 0.22, pitch: 0.45 });
        }
      }
      tokT -= dt; if (tokT <= 0) { tokT = 0.2; assignTokens(); }
      flowT -= dt;
      if (flowT <= 0 && hasLevel() && LEVEL.flowTo && !P.dead) {
        flowT = 0.22;
        const cx = Math.floor(P.pos.x), cz = Math.floor(P.pos.z);
        let chasing = false;
        for (const e of enemies) if (e.aggro && !e.boss) { chasing = true; break; }
        if (chasing && (cx !== flowCx || cz !== flowCz || gt - flowAt > 1)) { flowCx = cx; flowCz = cz; flowAt = gt; LEVEL.flowTo(L, P.pos.x, P.pos.z); }
      }
    }
    const canTarget = st === 'play' && !P.dead && !merchantNear();
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i]) enemyStep(enemies[i], dt, canTarget);
    separate();
    for (let i = dying.length - 1; i >= 0; i--) {
      const e = dying[i], s = e.st;
      if (e.gift && !e.gift.bye) { e.t += dt; s.t = e.t; giftStep(e, dt); place(e); anim(e, dt); continue; }   // the kefir hand-over first
      e.dieT += dt / e.dieDur; e.t += dt;
      s.dying = Math.min(1, e.dieT); s.t = e.t; s.move = 0; s.windup = -1; s.attack = -1; s.frozen = false; s.hurt = 0;
      if (e.boss) {   // the overjoyed boss turns its happy face to the camera for its goodbye (it kept any facing before)
        s.breath = s.stomp = s.roar = s.fireball = -1;
        e.face = dampAngle(e.face, CAM.yaw || 0, 5, dt);
      }
      if (e.fly) e.y = Math.max(0.1, e.y - dt * 0.4);
      else if (e.y > 0) e.y = Math.max(0, e.y - dt * 6);   // (a jelly king cheered up in mid-hop lands first)
      if (e.bur > 0) e.bur = Math.max(0, e.bur - dt / riseT(e));   // a happy köstebek pops out of the ground to celebrate
      place(e); anim(e, dt);
      if (e.dieT >= 1) {
        burst('shadowPuff', e.x, e.y + e.height * 0.4, e.z, { count: e.boss ? 40 : 12 });
        dying.splice(i, 1); dropEnemy(e);
        if (e.boss) bossGone(e);
      }
    }
    updateProjectiles(dt);
    updateMortars(dt);
    updateCoins(dt);
    updateLoot(dt);
    updateCrystal(dt);
    if (L && L.npcObj && L.npcObj.model && L.npcObj.model.anim) { try { L.npcObj.model.anim(dt, owlTalking()); } catch (err) { warnOnce('owl.anim', err); } }
    if (typeof SKILLS_update === 'function') { try { SKILLS_update(dt); } catch (err) { warnOnce('SKILLS_update', err); } }
    updateMarkers(dt);
    fbStep(dt);
    updateBars(dt);
    updateHero(dt);
    updateBilbo(dt);
    moustacheStep(dt);
  }
  function titleUpdate(dt) {
    if (!inited) return;
    C.vel = 0; C.swing = null; C.hurtT = 0; C.cheerT = 0; C.idleT += dt;
    if(L && L.readingSpot) {const r=L.readingSpot;P.pos.set(r.x,r.seatY-.40*baseScale,r.z);P.face=r.face||0;}
    else P.face = dampAngle(P.face, 0, 3, dt);
    if (L && L.npcObj && L.npcObj.model && L.npcObj.model.anim) { try { L.npcObj.model.anim(dt, owlTalking()); } catch (err) { warnOnce('owl.anim', err); } }
    updateHero(dt);
    updateBilbo(dt);
  }

  function init() {
    if (inited) return;
    inited = true;
    makeResources();
    if (typeof FEZA !== 'undefined' && FEZA.create) { try { H = FEZA.create(); } catch (err) { console.error('[GAME] FEZA.create', err); } }
    if (!H || !H.root) H = fallbackHero();
    GAME.H = H;
    baseScale = H.root.scale.x || 1;
    scene.add(H.root);
    if (typeof BILBO !== 'undefined' && BILBO.create) {
      try {
        Bilbo = BILBO.create(); scene.add(Bilbo.root); GAME.Bilbo = Bilbo;
        if (typeof BILBO_FOLLOW !== 'undefined') bilboFollow = BILBO_FOLLOW.create({ free: circleFree, move: moveXZ,
          route: (x, z, tx, tz) => routeTo(tx, tz, { x, z }) });
      }
      catch (err) { warnOnce('BILBO.create', err); }
    }
    if (H.setXray) { try { H.setXray(true); } catch (err) { warnOnce('setXray', err); } }
    buildSkills();
    resetPlayer();
    const s = readSave();   // title screen: wear the saved outfit
    if(s && s.ng > 0) { mapOpen=true; try{localStorage.setItem(MAP_KEY,'acik');}catch(e){} }
    if (s && s.bag) {
      const eq = s.equip || {}, bag = s.bag;
      const wear = { weapon: bag[eq.weapon] || P.equip.weapon, offhand: s.heroClass === 'hybrid' ? bag[eq.offhand] || null : null, hat: bag[eq.hat] || null, cape: bag[eq.cape] || null };
      R.titleWear = wear;
      try { H.setEquip(wear); } catch (err) { warnOnce('setEquip', err); }
    }
  }

  const GAME = {
    P, H: null, enemies, L: null, state: 'title', paused: false, skills: [], boss: null, time: 0,
    get difficulty() { return hard ? 'hard' : 'normal'; }, setDifficulty,
    merchantInfo, merchantNear, merchantWard, visitMerchant, buyMerchant,
    mapUnlocked, travelTo, bone,
    get boneCooldown(){return Math.max(0,boneAt-gt);}, get boneCooldownMax(){return BONE_CD;},
    init, newGame, continueGame, hasSave: () => !!readSave(), save, clearSave,
    loadZone, update, titleUpdate, input, equipSlot, equip: item => equip(item), unequip, drinkPotion, addItem, cast,
    on, emit, enemiesNear, nearestEnemy, damage, spawnProjectile, hitBreakables, heroDamageNow, hurtPlayer, heal,
    xpFor, projectiles, loot, coins, wordOK,
    bonusSpot,   // (Round 6) {x, z} the boss camera should keep on screen too (the crown, bubble, hole, rock, carrot, heart), else null
  };
  return GAME;
})();
