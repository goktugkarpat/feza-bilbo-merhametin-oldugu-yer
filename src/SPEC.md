# Feza ve Bilbo: Merhametin Öldüğü Yer — güncel sözleşme

## Bu ayrı oyunun kuralları (aşağıdaki eski tasarım notlarını geçersiz kılar)

Kullanıcı bu oyunu açıkça **yetişkinlere yönelik karanlık masal** olarak istemiştir. Feza kendi lanetini silah yapan bir iblis avcısıdır; Bilbo canavar köpek görünümünde, güçlü ve saldırgan zırhlı yoldaşıdır. Yaratıklar masumlara merhamet göstermemiştir. Yenildiklerinde dost olmazlar; çöker, kararır ve külleşirler. Sevimlilik, çocuk övgüsü, renkli kutlama ve oyuncak motifleri bu sürümün tasarımına ait değildir.

Huysuzlara Karşı v49'un temel motoru, kamera/dokunmatik kontrolü ve hafif çizim yapısı korunur. Gölge kalitesi ve ışık sayısı korunur. Kullanıcının son yönlendirmesi: ortam karanlık olsa da oynarken rahat görünsün; ortam ışığı ve yüzey tonları okunurluk için ölçülü artırılabilir. Yeteneklerde koyu mor ve vampirvari kan/kemik tonları baskındır. Daha korkunç modeller, dokular, silüetler ve efektler bu basit grafik dilinin içinde yapılır. Orijinal çocuk oyununun kaynaklarına dokunulmaz.

- Sekiz mekân: Paslı Hamam, Kül Ayı, Yas Ormanı, Çürüme Vadisi, Fısıltı Madenleri, Kül Ocağı, Veba Şehri, Merhametsiz Kale.
- Üç yol: İblis Avcısı, Ruh Biçen, Lanet Şövalyesi; her birinde üç yetenek.
- Eşyalar: 64 farklı emanet, dört nadirlik görünümü; metal, kemik, yırtık kumaş ve mühür biçimleri. Kaydedilmiş eski taban kimlikleri teknik uyumluluk için korunur, görünen ad ve modeller yenidir.
- Bilbo yakın hedefe saldırır, en çok iki sıradan düşmanı üzerine çeker. Saldırı sonrasında Feza'nın hasarının %35'ini üstlenir; zırhı sonludur, kırılınca çekilip toparlanır. Zırh %35'e ulaşıncaya kadar saldırıya ve koruyucu havlamaya dönmez. Boss saldırı uyarılarının hedefi Feza'dır; köz kırmızısı uyarılar avcının mor büyülerinden ayrılır.
- 114 önceden kaydedilmiş doğal Türkçe Emel anlatımı. Tarayıcı konuşma sesi kullanılmaz. Testler yalnız `?sessiz`; gerçek duyulur ses bağlamı açılmaz.
- Ayrı kayıt `fezaBilboMerhamet.save.v1`, tercih `fezaBilboMerhamet.ayar.v1`; service worker yalnız `feza-bilbo-merhamet-` önekli eski önbellekleri temizler.
- PWA ve file:// desteği korunur. GitHub'a yalnız kullanıcı yükleme istediğinde, ayrı depoya doğrudan main; PR yok.

## Güncel bölüm ve harita sözleşmesi

Sekiz bölümde 6 ana alan ve en fazla 2 yan alan vardır. Normal boss canı güncel kısa macera ölçeğindedir. Final, `fezaBilboMerhamet.gecitHaritasi.v1` kaydını açar; GAME.mapUnlocked() ve GAME.travelTo(index) haritayı yönetir. Eski altı bölümün v5 kayıtları bölüm kimliğiyle yeni sıraya taşınır; çocuk oyununun kayıtları okunmaz.

## Temel motorun geçmiş teknik notları

Aşağıdaki metin kaynak motorun tarihsel açıklamasıdır. Çocuk içeriği, neşe, dostluk, eski isim ve görsel kuralları bu yetişkin sürümde uygulanmaz; sayısal motor/API ve dokunmatik sözleşmeleri kullanılır.

# Feza Huysuzlara Karşı — kaynak motorun eski SPEC notları

A kid-friendly (5-year-old) **Diablo-like** action RPG in three.js r170, for an **M1 iPad** (Safari, touch), also runs by
double-clicking `index.html` (file://). Hero: **Feza**, a 5-year-old boy (see "Feza's look"). Enemies are *grumpy* ("huysuz")
creatures cursed by the Huysuz Ejderha (grumpy dragon) — but (Feza's request) every creature looks CUTE and SMILING, mischievous rather than angry:
no angry brows, no frowns, no fangs, nothing scary. Defeating one does NOT kill it: it becomes **overjoyed** (^‿^, big smile, hearts),
hops, and vanishes in sparkles/hearts, dropping gold/loot. No blood, no death, nothing scary. Everything cute, colourful, polished.
Graphics must be clearly **better than a typical low-poly kids' game**: textured PBR surfaces with normal maps, rim light,
bloom on glowing things, detailed characters with smooth geometry and expressive faces — with a 120 FPS render cap on PC/Mac and 60 FPS on tablets/phones (actual rate follows browser/display capability).

## Adaptive rendering (latest; overrides earlier quality watchdog thresholds)
- Desktop PC and Mac both start at DPR 1.5 regardless of OS/browser pixel density (`?hd` requests 2).
  Mobile/tablet retains its existing min(devicePixelRatio, 1.25) default and 60 FPS cap. No graphics menu is added.
- On desktop, `perfMeasure(done)` samples low-load rAF at boot while the loading screen is shown, before heavy game initialization.
  A bounded timer fallback prevents hidden tabs from blocking startup; an unmeasured startup conservatively targets 60.
  The target follows observed browser cadence,
  capped at 120 on desktop; it is an estimate, not a query of monitor hardware. Mobile keeps its existing fixed 60 target.
- On desktop, `perfRaf(ts, idle)` samples before UI's frame limiter. Only low-load paused/menu frames can lower the cadence estimate;
  gameplay can raise it on sustained faster callbacks, but a GPU-heavy battle cannot redefine 120 Hz as a 60 Hz screen.
- Desktop quality starts by lowering DPR in .25 steps to 1, then MSAA. Decisions use sustained gameplay frame rates
  relative to the measured target, not the old fixed below42/above57 thresholds. Stable play permits cautious step-ups;
  a raise is tried after 17.5 seconds above 95 % of target. Failed raises wait longer (up to 60 seconds). A full
  downward trial without useful FPS gain restores the sharpest useful level; repeated no-gain retries wait 60/120/240 seconds. Mobile retains
  its earlier MSAA-first ladder, fixed 42/57 thresholds and cap protection.
- `perfTick(rawDt, active)` receives false during title, pause, transitions and UI loading. Zone events allow 3 seconds
  of grace; these periods do not count toward overload or recovery. The `.` meter includes the measured target.

## Normal-mode balance (latest; overrides earlier balance figures)
- `DIFF.normal` in 07 owns this tuning; all four changes are gated by `!hard`.
- Above the usual zone damage, creature HP scales with damage to the power `0.55` (Zor keeps `DIFF.power.k = 0.8`).
  At/below the threshold, base HP and the existing per-type/elite multipliers stay the same.
- Boss HP keeps the existing low/high clamps and hybrid dragon reference. Above the clamped usual zone damage,
  only 75 % of extra power raises boss HP; weaker gear keeps the same assistance. The NG multiplier is applied once, as before.
- Wizard basic wand swing: 0.50 s instead of 0.55 s; hit strength, skills and hybrid wand timing stay the same.
- A successful boss bonus grants ×1.25 player damage only while its bonus state is `stun` AND its actual phase matches
  `stunPh`. Forced/scripted hits (including the dragon's 5 % heart), ordinary recoveries and the knight's banner stun
  are excluded. The bonus is derived from encounter state, so it ends with the stun or encounter cleanup.
- Normal healing and damage taken are unchanged. Zor retains the former Hardcore combat tuning; save rules are shared (see below).
- Validation: `r6_game_kid` with all 3 classes, bonus go/ignore, seed 11 (also seeded combat RNG), potion below 30 %,
  no god mode: all 6 before + 6 after adventures reached the ending without runtime errors. Mean boss times in this
  sample: warrior 51.3 → 48.2 s, wizard 63.6 → 54.5 s, hybrid 54.7 → 54.8 s; loot/routes diverge after combat changes.
  446 focused bonus/save/flee/mode checks passed; 180 Hardcore stat cases + 36 spawned-enemy cases matched the old build.

## Running away wins (parent: "kaçmaya çalışınca Feza boss'un yanından ayrılmıyor")
- A finger put down on a creature turns into walking after 26 px when it heads away from / sideways to it (Feza → creature
  direction, measured from the touch point on the ground), else after 90 px as before. It also drops a sword swing.
- Drag or keys more than ~110° against a sword swing's facing end the swing at once (no 0.22 brake, no turning back); wand shots go on.
- attackButton while running away from the nearest creature (vel > 1.5, moving the other way): no lunge; a sword swing is skipped.
- Follow-up (a sideways dodge past a big boss kept swinging): T.fleeArc 60° — back OR sideways (> 60° off the swing /
  creature) counts as leaving for all three rules; the held-finger auto-attack arc T.autoDragArc 80° → 45°.
- A wand shot while backing off / dodging (> fleeArc off its facing) no longer brakes to 0.7: full speed, the shot still flies.
- test/r6_flee.html checks all of it (incl. a sideways dodge and the wizard backing off).

## Round 6 — boss polish: one optional "bonus" idea per boss + 14 new item looks (latest; read first, overrides older text)
Plan: test/r6_PLAN.md (approved). Rules kept: nothing scary, cute; danger telegraphs ≥ 2 s; 3 skills per class; 60 FPS tablet
budget (props pooled, pre-built in warmZone); every 07 call into 05/03 guarded with a plain Kit stand-in.
**Framework (07).** `BONUS` table (next to SOV) + `BOSS_KIT[type].bonus`: kraljole 'tac', kefirdev 'balon', kostebekusta 'avla',
lavkaplumbaga 'serintas', sovalye 'havuc', ejderha 'kalp'. State `b.encounter.bonus = {kind, state:'wait'|'on'|'stun'|'done', t,
have, need, stage, …}` (null after startEncounter / clearEncounter). `bonusStep` runs in encounterStep after sancakStep; a bonus
starts only below its hp mark, from idle, with no raid move and no summon waiting. While it holds (on + hold) or the boss is
stunned the TBC clock waits; afterwards `q.timer ≥ BONUS.timerAfter` (4 s). Ignoring it costs nothing. `bonusStun(b, phase, D)`
(the banners' dizzy uses it too: stops a raid move, drops the telegraph, in-flight mortars → sparkles) then the stun phase,
× `BONUS.hcStun` 0.8 in Hardcore; a stunned boss never hurts Feza. Bonus things are `L.breakObjs` entries `{bonus: kind}`
(tap walks there, swing / skill / shot hit them, no loot); touching the crown / carrot / hearts takes them. `clearBonus` on
nap / calm / zone change / cheer (cheer = sparkly poof); a nap or calm re-arms it unless `b.bonusWon`. Pause freezes it.
Spots for the crown, carrot and hearts are tried IN VIEW first (`inView`: ≤ 3.5 m toward the camera (+z) of Feza, ≤ 11 m away).
APIs: event `'bonus'` {on, kind, type, have, need, state}; `GAME.bonusSpot()` → {x, z} | null (where Feza should go: crown,
`b.st.crownOff`; the turtle's roll ends in its own phase 'rollend' (1.3–1.8 s).
| boss | idea | at hp | what the kid does → stun |
|---|---|---|---|
| Kral Jöle | Taç Kovalamaca | 55 % | a big crown hop (2 s circle); the crown flies 5–7 m away (gold hoop) and the king waddles to it ('shy'). Feza first (touch ≤ 1.1 m or hit) → crown flies home, 'blush' 3.5 s; king first → 'crownon', no stun |
| Kefir Devi | Dev Köpük Balonu | 75 % | new move 'blow' (2.4 s): one giant bubble (grows .35 → 1 m at the mouth, floats after Feza 1.5 m/s, 9 s). **Due** `first` 0.8 s after the hp mark, then every `gap` 10–14 s (any distance; closer than b.r + 3.2 m it scoots back ≤ 2.2 m while inhaling); otherwise pick weight .25 from b.r + 3 m, cd 10 s. 2 hits (HC 3) pop it → a heart pickup + 'hiccup' 3 s; touching Feza (not in its first 1 s of flight) pops it on him (b.dmg × .45) |
| Usta Köstebek | Saklambaç | 50 % | digs in, 4 holes on a 4.5 m ring; the mound runs to one (gold hoop 1.2 s), 'peek' 1.6 s (HC 1.3) — a hit = bonk ("Tak!"). 3 bonks → 'dizzy' 4 s; 6 peeks without → it pops up under a 2 s red circle |
| Lav Kaplumbağası | Serin Taşlar | 70 % | 3 cool rocks (L.solids r .75) on a 5 m ring; roll lanes stop at a rock, 'hide' × 1.6 while they stand. A roll ending at a rock → crack, 'flip' 4.5 s (≤ 3 flips) |
| Huysuz Şövalye | Havuç | 40 % | a golden carrot on the rim (gold hoop), when the banners are done — or while all still stand (then ≥ 6 m, else 4 m, from each; never during their dizzy). Feza takes it (touch / hit) → holds it over his head; the horse trots to him ('seek', no attacks) → 'munch' 5 s. Once per fight |
| Huysuz Ejderha | Dostluk Kalpleri | 80 / 55 / 30 % | a 'sigh' blows 3 hearts onto a 5–7 m ring (pink hoops, 14 s, HC 10). All 3 → a big heart to the dragon (5 % maxHp) + 'charmed' 4 s |
**05:** new phases shy / crownon / blush (king), blow / hiccup (kefir), peek / bonk / dizzy (mole, own sink), rollend / flip
(turtle), seek / munch (knight + horse), sigh / charmed (dragon); expressions via `s.eyeK` / `s.eyeW` / `s.browY` + mouth bone;
pre-aggro idle loops (`!st.aggro`), a double take on the first roar, per-boss hurt reactions. `m.marker('crown')` (king),
`m.marker('mouth')` (horse). Props (one mesh each, `{root, anim(dt, o), dispose()}`, warmed): `EMODEL.jellyCrown` {spin, glow, bob},
`EMODEL.havuc` {glow, spin, bob}, `EMODEL.serinTas` {pop, glow, crack}, `EMODEL.hole` {open, shake}.
**03:** `FX.marker(x, z, r = .9, dur = 0, color = '#ffd23f', o)` → {move, remove}: a pulsing OUTLINE "come here" hoop + rising
sparkles + a bobbing star (never like the filling danger disc); `FX.dizzy(x, y, z, r = .55, dur = 0)` → {move, remove}: 5 stars
round a head (particles only); projectiles 'heart' and 'bigbubble' (GAME scales it); bursts 'bonk', 'hearts' (= 'heart',
'love', 'charm'), 'bigPop', 'crack'.
**02:** sfx bonk, hiccup, munch, sigh; 12 lines (Turkish, no abbreviation-like words): kraljole_tac, kraljole_saskin,
kefirdev_balon, kefirdev_hik, usta_saklambac "Usta Köstebek saklambaç oynuyor! Parlayan deliğe koş, başı görününce dokun!",
usta_yakaladin, kaplumbaga_tas, kaplumbaga_devrildi, sovalye_havuc, sovalye_atdoydu, ejderha_kalp, ejderha_sevgi (sesler.js).
**09:** bonus pips right of the boss name (gold stars; pink hearts for the dragon) following the 'bonus' events; a gold minimap
dot on bonusSpot; the boss camera also keeps bonusSpot on screen when that costs ≤ `BONUS_CAM.zoom` 1.12 × the plain framing's
zoom-out (dwell 1 s, retry .25 s: never jumpy); badges on the 12 new subtitle lines.
**04 items:** 14 new ordinary looks (64 in total: 36 weapons, 15 hats, 13 capes) — sabers pamukseker (lvl 1), kalp (2), uzay (5),
kuyruklu (8); wands lolipop (1), kedipati (3), gezegen (7); hats kedikulak (1), dondurma (2), yunikorn (4), astronot (6); capes
sekerpelerin (2), panda (3), galaksi (7). Saber shader variants SB_GRAD / SB_STRIPE / SB_STARS (≤ 3 extra programs). Boss rewards
made distinct at 64 px: sovalyeikiz red / white-gold stripes, lavikiz yellow → orange ramp + own grip, guniskilic bigger sun.
**Balance (DIFF, test/r6_game_kid.html &bonus=ignore|go; masher + potion, 3 classes, seeds 11–77, 21 runs per policy):**
DIFF.boss per kraljole 106 (dmg 12 → 11) · kefirdev 135 · kostebekusta 114 · lavkaplumbaga 165 · sovalye 138; the dragon
bossHp 11.5, bossHpPerDmg 232, the hybrid sized on 0.88 × its wand (bossHybridK). Fight averages ignore / go: 43 / 43 s,
48 / 49, 53 / 54, 58 / 64, 67 / 64, 74 / 66 (targets 35–50, 40–55, 45–60, 50–70, 55–75, 60–85; the wizard runs ~1.3 × the
warrior on the first four). Boss naps 8 in 252 fights (Round 5: 8 in 72). Hardcore (&hc&hcboss): 6 of 6 won.
**Tests:** r6_game_bonus (&type, &play=go|ignore, &hc), r6_enemies_bonus (?mode=check), r6_fx_bonus (?view=unit),
r6_items_look (?view=check), r6_audio_check (via test/r3_aud_cdp.py), r6_ui_bonus (+ ?view=real&type=), r6_game_kid
(&bonus=ignore|go, &hc&hcboss); Round 5 regressions r5_game_boss (its banner taps now move the knight off the line first — a
seeded fight could leave him standing in the way) / tbc / save, r5_ui_check, r5rev_mem, r5_level_budget still pass. In
r6_game_bonus a wizard / hybrid who ignores the mole may still catch it: the wand's auto-shots hit the peeking head (allowed).

## Round 5 — Feza's request: SURLU ŞEHİR, a walled town in front of the dragon's castle (read after Round 6; overrides older text)
Feza asked for a 6th chapter: after the volcano Feza does NOT go straight to the castle. He enters the **town inside the dragon's
city walls** (a feudal "castle town": inside the walls, below the main castle). A river flows through it, parts of the city walls
are visible. The huysuz here are **PEOPLE**: the dragon tricked them and made them grumpy, so they do not want anyone to reach the
castle and block the way. They are NOT evil and nothing about them is scary: chibi, cute, mischievous-sulky ("hıh!") faces
(puffed cheeks, pout, arched — never slanted — brows, no frowns, no teeth-baring), toy-like soft "weapons" (cork/pompom tips,
bread, brooms, drums). Cheered up they are overjoyed friendly townsfolk again (^‿^, blush, hearts) and vanish in sparkles as usual.
The zone boss is a **very grumpy big knight riding a big horse**, with his own moves and his own treasures (one per hero class).
Keep everything from earlier rounds (3 classes, their skills, DIFF/DROP philosophy, manual save only, Hardcore, TBC moves, 120/60 FPS policy).

**Zone order (index = save zone; saves since sv 4 also carry zid):** 0 orman (kraljole) · 1 kefir (kefirdev) · 2 magara (kostebekusta) ·
3 yanardag (lavkaplumbaga) · **4 sehir 'Surlu Şehir' (boss sovalye)** · 5 kale (ejderha, `final: true`).
```
ZONES[4] = { id:'sehir', ad:'Surlu Şehir', theme:'town', line:'sehir', music:'sehir', size:100, rooms:8, side:3,
  enemies:{ nobetci:4, simitci:3, supurgeci:3, tellal:1 }, elites:['nobetci','simitci'],
  hpMult:2.55, dmgMult:1.8, xpMult:2.3, gold:2.8, ilvl:7, boss:'sovalye' }
ZONES[5] (kale) = as before but ilvl 8, hpMult 3.0, dmgMult 2.0, xpMult 2.7, gold 3.2   (GAME re-balances DIFF for 6 zones; see GAME)
```
`tellal` joins LEVEL's BIG list (at most one per pack). The castle is unchanged otherwise (asker, atescik, hayalet, golem).

**Look (06, theme 'town')** — bright, warm, cheerful golden afternoon (soft peach/lavender sky and fog, warm sun, nothing dark or grim):
- Walkable floor: cobblestone streets (TEX 'townStone'); plazas / market square / the boss arena use patterned plaza pavers
  (TEX 'plaza'); the main route (path) reads as a slightly wider, lighter main street.
- Non-walkable ground next to the floor: a **river / canals of clear blue water** (reuse the animated liquid floor idea of milk/lava:
  soft ripples, sun glints, a few floating lily pads or ducks as decor), small grass/flower gardens, house blocks.
- **Bridges** (arched stone, some wooden) wherever the route crosses water (as dairy's biscuit bridges / volcano's stone bridges).
- Boundary / decor: rows of colourful half-timbered houses (TEX plaster + roof; coloured shutters, flower boxes, chimneys, shop
  signs: a simit bakery, a drum shop…), market stalls with striped awnings (fruit, bread/simit, flowers), a fountain, wells, carts,
  hay bales, benches, potted trees, lantern posts (LIGHTS.torches), bunting flags strung between houses, banners with the town crest
  (a smiling golden sun). **City walls (surlar)**: sandstone rampart segments with crenellations and round towers with conical roofs
  and flags (TEX 'rampart'), visible along the north and the sides (tall there; LOW/none on the camera (south) side — camera rule),
  and far to the north, beyond the walls, the **dragon's castle silhouette** on a rocky hill (decor only, fog-tinted, cheap).
- Boss arena **"Turnuva Meydanı"** (round plaza, radius ≥ ARENA_R): pennant poles, striped tournament tents, low wooden stands on the
  south side; the exit portal L.exit at its north edge is the **castle gate** ("Kale Kapısı": the magic portal inside a stone gate
  arch), built inactive as for zones 0–3. A checkpoint right before the arena. No NPC.
- Breakables: barrel, crate, vase (+ VASE_COL.town). Minimap palette for 'town' (streets, water, walls). Portal tint for 'town'.
- Draw calls: instanced / chunked like the other themes (houses, stalls, walls, flags are instanced).

**Creatures (05: EDEF + EMODEL; base stats at zone-1 scale like the others; GAME multiplies by zone):**
| type | ad / eliteAd | kind | look + attack (st fields) |
|---|---|---|---|
| nobetci | Huysuz Nöbetçi / Kocaman Nöbetçi | melee | chibi town guard (~1.35 m): padded tunic in town colours (sky blue + sunny yellow halves), round kettle helmet with a feather, round wooden shield with the smiling-sun crest, a long wooden spear with a big soft red pompom tip. windup = pulls the spear back; attack = a poke-lunge. hp 58, dmg 10, speed 2.6, r 0.55, height 1.35, atkRange 1.5, atkCd 1.9, windup 0.7, xp 22, gold 6, line 'ilk_nobetci' |
| simitci | Huysuz Simitçi / Kocaman Simitçi | ranged | round street vendor with a big wooden tray of simits on his head, white apron, curly moustache, rosy cheeks. windup = lifts a simit off the tray; attack = throws it (shot {kind:'simit', speed 5, r 0.34}); muzzle = throwing hand. hp 40, dmg 8, speed 2.0, r 0.55, height 1.3, atkRange 7, range 7, atkCd 2.5, windup 0.7, xp 18, gold 5, line 'ilk_simitci' |
| supurgeci | Huysuz Süpürgeci / Kocaman Süpürgeci | glide | quick street sweeper (~1.2 m) with a big straw broom and a patched cap; like kaymak's glide: windup = crouches with the broom ready, attack = whooshes along a lane sweeping (share of the lane, then 1 = recover), trail 'dust'. hp 34, dmg 8, speed 3.6, r 0.5, height 1.2, atkRange 2.4, atkCd 2.0, windup 0.65, xp 17, gold 4, line 'ilk_supurgeci' |
| tellal | Huysuz Tellal | slam | the town crier (~1.95 m, r 0.85): big round belly, pointy hat with a bell, a big decorated davul drum on his belly, two mallets. windup = raises both mallets high (leans back); attack = BOOM on the drum at st.attack 0 → GAME's ground ring (slamR 2.2) + music-note burst. hp 130, dmg 14, speed 1.5, atkRange 2.4, atkCd 2.8, windup 1.0, xp 45, gold 12, line 'ilk_tellal' |
Faces: grumpy = the sulky "hıh!" pout above (eyes half-lidded or side-glancing, cheeks puffed); happy = ^ ^ eyes, big smile, blush, hearts.
Skin tones varied and friendly; clothes bright. ≤ 3 draw calls per creature, one skinned mesh, LOD entries.

**Boss `sovalye` 'Huysuz Şövalye'** (EDEF kind 'boss', lines {giris:'sovalye_giris', bitti:'sovalye_bitti'}, ~3.4 m total, r 1.7):
a chibi knight in shiny silver armour with gold trim, a tall rainbow plume, visor UP showing a very grumpy-cute face (big pout,
puffed cheeks, bushy arched brows, a curly moustache), a tabard with the smiling-sun crest, a round shield, a long jousting lance
with a big soft padded ball tip; riding a big chunky friendly **horse** (big eyes with lashes, braided mane with ribbons, a checkered
caparison in blue/yellow, a chanfron with a star, fluffy hooves). EDEF: hp 1400, dmg 15, speed 2.0, r 1.7, height 3.4, xp 500, gold 130,
atkRange 3.2, atkCd 1.6, windup 0.8, aggro 14, summon {type:'nobetci', n:2, at:[0.66, 0.33]}, slamR 3.6, chargeSpeed 9,
phases ['idle','move','charge','rear','sweep','toss','summon','roar','dizzy'] (+ dying). st.phase + st.phaseT (0..1) + st.move (0..1 trot)
+ st.hurt + st.dying, exactly like the other bosses. **Model timing contract (05 animates by phaseT, 07 uses the same beats):**
- `charge`: 0–0.3 wind-up (horse paws the ground, knight lowers the lance: GAME shows the lane telegraph from the start of the phase),
  0.3–0.9 gallop (GAME moves the boss along the lane; hit on contact, at most once), 0.9–1 skid to a stop.
- `rear`: 0–0.5 the horse rears up on its hind legs (wind-up; GAME shows the ring telegraph), lands at 0.5 (GAME: stomp ring slamR), 0.5–1 settle.
- `sweep`: 0–0.4 lance drawn back (GAME shows a cone telegraph), 0.4–0.6 wide lance sweep (hit at 0.5), 0.6–1 recover.
- `toss`: the knight throws 3 silver horseshoes at phaseT 0.35 / 0.5 / 0.65 (GAME: lobbed 'horseshoe' mortars onto telegraph circles).
- `summon`: raises the lance and blows a little horn at 0.5 (GAME summons nobetci). `roar`: a grumpy "hımf!" + the horse's neigh.
- `dizzy` (arena surprise, loops by st.t): the knight wobbles with little stars circling his helmet, the horse sways cross-eyed-cute.
- `dying` (st.dying 0..1, dieDur ≈ 3.2 s): 0–0.35 overjoyed, he takes off his helmet and waves, the horse prances; 0.35–0.7 happy hops;
  0.7–1 twirl + shrink into sparkles. m.muzzle() = the knight's throwing hand; optional m.marker('lance') = lance tip.
- `EMODEL.sancak()` → {root, anim(dt, st:{fall: 0..1, glow: 0..1}), dispose()}: a cute tournament banner on a pole (~2.4 m) with the
  smiling-sun crest; fall 0→1 = it tips over and lies flat (happy sparkle), glow = a soft golden shimmer while it stands;
  side −1/+1 (optional; GAME: toward the arena's middle) = it falls to that side, across the screen (tipped north it looked still standing from the gameplay camera), a little dimmer once down.

**GAME (07) — the knight's fight** (target for a button-masher ≈ 55–75 s; DIFF.boss.sovalye ≈ {per: 230, lo: 30, hi: 68, dmg: 28}, tune):
- Moves by distance, via pickPhase: far → charge / toss; mid → charge / sweep / toss; close → rear / sweep. `charge`: a straight lane
  toward where Feza stands at the start (telegraphLine, width ≈ 2 × r), speed chargeSpeed, stops at the arena rim, dust/hoof trail,
  one bump (kb) at most. `toss`: 3 horseshoe mortars, the first on Feza's spot, the others around (telegraph circles, like lava balls).
  `summon` at 66 % / 33 %: 2 nobetci ('sovalye_asker' line NOT needed: the generic summon beat). Naps tire the boss as for the others.
- **TBC move** (RAID_NEW.sovalye = 'berserkercharge', inspired by **Attumen the Huntsman — Berserker Charge**, Karazhan): he rides to the
  arena rim, then gallops two telegraphed passes (a cross: the second lane is shown while the first runs), each lane warned 2 s,
  fixed paths that do not chase Feza after the warning, at most 2 modest hits in total. Same scheduling rules as the other TBC moves.
- **Arena surprise `sancak`**: at 60 % hp three tournament banners (EMODEL.sancak) pop up at spots around the arena rim, with the line
  'sovalye_sancak'. They behave like breakables (tap to walk there and hit; swings, skills and hitBreakables knock them over; no loot).
  When all three are down the knight is **dizzy** for 4 s (phase 'dizzy': he does nothing, takes normal damage). Optional for the kid:
  ignoring them costs nothing. Cleared on calm, nap, defeat or zone change like every encounter; pause freezes it.
- Defeat: the usual mid-boss flow (overjoyed + big cheer, its fixed class treasure + coins, 'sovalye_bitti', the portal wakes + 'kapi').
- Other GAME needs: ZORDER gets 'sehir' at index 4 and every per-zone DIFF array gets 6 entries (zoneHp, zoneDmg, power.dmg…),
  keeping the old zones' values; SAVE_V 5; a save WITHOUT zid (older layouts) keeps mapping its numeric zone through the Round-4 order
  ['orman','kefir','magara','yanardag','kale'] (so an old castle save stays the castle, now index 5); saves with zid follow by id.
  Hardcore auto-checkpoints at the entry of the 2nd, 4th and 6th chapters (zones 1, 3 and 5 — the parent added the 6th, so a castle nap no longer sends Feza back two chapters). ELITE_AD / FIRST_LINE for the 4 new
  types, SHOT_KIND/SHOT_COL/SHOT_END for 'simit' (end: 'crumbs' + a soft 'pop') and 'horseshoe' (mortar kind), glide trail 'dust'
  for supurgeci, tellal = HEAVY slam with a 'notes' burst and the 'drum' sfx; BOSS_KIT.sovalye {lines, add:'nobetci', at [0.66, 0.33],
  n [2, 2], roar pitch, col '#ffd23f', roarSfx 'neigh'}; BOSS_AI.sovalye; warmZone pre-builds the new models/shots/banners.
  After the knight the castle's own flow is unchanged (the dragon is still the finale).

**Boss treasures (04 ITEMS)** — class-locked rarity-3 identities (now 6 bosses × 3 classes = 18), bossReward('sovalye', heroClass, ilvl):
warrior → hat `sovalyemigfer` 'Şövalyenin Tüylü Miğferi' (shiny silver knight helmet, visor up, tall rainbow plume);
wizard → cape `sovalyesihir` 'Şövalyenin Arma Pelerini' (royal blue with a golden smiling-sun crest, checkered gold trim, tiny stars);
hybrid → weapon (sword) `sovalyeikiz` 'Şövalyenin Turnuva Kılıcı' (a lightsaber with a red/white spiral jousting hilt, a golden
crossguard, warm golden blade). Models + thumbnails like the other boss items; excluded from random pools; 50 item appearances total.

**Voice (02 AUD.LINES; simple Turkish; no "Aa"/"Oo", nothing that looks like an abbreviation; recorded with gen_voice.py):**
new — sehir "Surlu Şehir! Ejderha buradaki insanları kandırmış, hepsi huysuzlanmış. Kaleye kimse gitmesin istiyorlar. Hadi onları neşelendirelim!"
· ilk_nobetci "Nöbetçiler yolu kapatıyor! Kimse geçmesin istiyorlar." · ilk_simitci "Bak bak! Simitçi simit fırlatıyor!"
· ilk_supurgeci "Süpürgeciler tozu savurarak geliyor, dikkat et!" · ilk_tellal "Tellal kocaman davulunu çalıyor. Davul sesi gelince geri çekil!"
· sovalye_giris "İşte Huysuz Şövalye ve kocaman atı! Koşmadan önce yolunu gösteriyor, kenara kaç!"
· sovalye_sancak "Sancaklara vur! Hepsi düşünce şövalyenin başı dönecek!"
· sovalye_bitti "Huysuz Şövalye kocaman gülümsüyor! Artık kimse kaleye giden yolu kapatmıyor."
changed — kaplumbaga_bitti "Koca kaplumbağa çok sevindi! Sihirli kapı surlu şehre açıldı!" · yolculuk "Kristali geri almaya gidiyoruz:
önce Huysuz Orman, sonra Kefir Vadisi, mağara, yanardağ, surlu şehir ve en sonunda ejderhanın kalesi!"
Music 'sehir': a festive medieval market town (plucked lute/ukulele-like, recorder/flute melody, tambourine and a soft hand drum,
bright major, bouncy; a light Anatolian folk colour is welcome; never martial or dark). New sfx (soft, cartoony): neigh (a cute
whinny), gallop (clip-clop), drum (a round soft davul boom), broom (swish), horn (a tiny toy-trumpet fanfare), bell (a town-bell ding), clank (soft armour clink).

**FX (03):** projectile kinds 'simit' (a golden-brown sesame ring, spinning; it ends in 'crumbs') and 'horseshoe' (a shiny silver
horseshoe with a sparkle trail, used as a lobbed mortar like 'lavaball'); bursts 'hoof' (a dust puff with small golden sparkles,
for gallop steps, rear landing and charge stops) and 'notes' (little musical notes rising: the drum's boom and the knight's horn;
add a note glyph to the particle atlas if there is none).
**TEX (01):** THEME 'town' = townStone (warm honey/sand cobblestones, smaller than 'cobble', a few moss lines), plaza (fan/circle
patterned pavers in cream and terracotta), rampart (big sandstone wall blocks, warm beige, bevelled, NEUTRAL-ish so LEVEL can tint);
lazily made under the fade like the other themes; plaster/roof/wood/cobble are reused for houses.
**UI (09 + ui.css):** 6 zones everywhere (zone cards 1–6, anything that assumed 5), BOSS_UI.sovalye {ad 'Huysuz Şövalye', lines
['sovalye_'], disc/halo royal blue + gold} + a friendly flat SVG fallback (knight on a horse), BOSS_ORDER with 'sovalye' before
'ejderha', BOSS_FIT for the tall horse + knight, `.u-dimg.b-sovalye` / `.u-boss[data-b="sovalye"]`, MAP_BG.town, `.u-banner.t-town`,
subtitle icons: sehir 🏰, ilk_nobetci 🛡️, ilk_simitci 🥯, ilk_supurgeci 🧹, ilk_tellal 🥁 (boss lines use its portrait).
**Docs:** README (6 chapters, the knight row in the TBC table, the warrior's treasure list), this section; sw.js CACHE bump.

## Difficulty and pause menu (latest; replaces all earlier Hardcore save/UI rules)
- `GAME.difficulty` is `'normal' | 'hard'`. `setDifficulty(id)` returns false for invalid IDs or outside play/dead; otherwise
  it applies immediately and returns true. A changed choice emits `'difficulty', {id}`. It works while paused.
- The Mola main view has four actions: Devam Et, Zorluk: Normal/Zor, Kaydet, Baştan Başla. Audio toggles are removed from
  this menu; the title music toggle remains. Zorluk opens a subview with two `aria-pressed` choices and Geri. It stays paused
  after choosing; Escape first returns to Mola. A small HUD badge always names the current difficulty.
- Switching never reloads a zone or resets the player, bag, loot, boss phases or progression. Each spawned enemy stores
  `difficultyHp: [normal, hard]` from the same gear/level at spawn (bosses refresh once at first aggro). Preserve remaining
  HP fraction, and scale damage/speed/cooldowns without re-evaluating current gear. Special adds retain their own factors.
  In-flight hostile shots and mortars change damage too. Existing warnings and timed bonus targets keep their duration;
  the next warning uses the new timing. Wizard swings preserve their animation fraction when duration changes.
- `newGame({difficulty, heroClass, plus:false})` defaults to Normal. A fresh title/restart adventure always starts Normal;
  New Game+ from the ending keeps the current choice unless explicitly overridden.
- Manual `save()` works in both modes and stores `difficulty` in `fezaKotulereKarsi.v3`; Continue restores it. Older ordinary
  saves default to Normal. Both modes wake up at the ordinary in-zone checkpoint after a defeat, keeping progression.
  No automatic chapter saves, separate Hardcore menu or Hardcore recovery APIs remain.
- If no usable ordinary save exists, `readSave` reads `fezaKotulereKarsi.hardcore.v1` as Zor. The raw legacy record is never
  deleted/rewritten; reading does not write the common slot. Explicit Kaydet writes the common slot. `clearSave()` marks
  `fezaKotulereKarsi.legacyHardcoreIgnored` so intentionally clearing a save cannot resurrect the old fallback.
- Hard combat multipliers (HC table): mobHP1.35, bossHP1.25, mobdamage1.5, bossdamage1.45, speed1.12, attack cooldown0.78;
  ordinary mob windups0.85 with0.4s minimum. Boss idle gaps shrink; readable boss windups remain.
  Raid special damage has another1.55 multiplier (2.2475 total). TBC warnings remain2s. No combat regen, calm regen halved;
  a stone heals only on its first activation; no new death-based enemy weakening or retained boss damage in Zor.

## Character classes and boss treasures (latest; overrides older notes below)
- New adventures choose `heroClass: 'warrior' | 'wizard' | 'hybrid'` (Büyülü Şövalye) via the title picker.
  `GAME.newGame({heroClass, plus:false})` starts fresh; Continue and New Game+ keep the class. Pre-class saves are intentionally
  cleared once (parent's request); all class-aware saves persist. `ITEMS.adaptLegacy` preserves earlier wizard boss loot.
- Warrior keeps the lightsaber and original three skills. Wizard uses visible wooden wands, 9 m normal projectiles and Işık Okları
  (lvl1,4s), Buz Çiçeği (lvl3,15s, freeze + brief shield), Yıldız Bahçesi (lvl5,24s, six pulses with flower/constellation effects).
- Hybrid carries a right-hand sword and left-hand wand simultaneously: close normal attacks use the sword, distant attacks the wand.
  Skills: Hilal Dalgası, Işık Bağı, Gökkuşağı Mührü (lvl1/3/5, cooldown4/15/24s). `SKILLS.forClass(heroClass)` selects definitions.
- All swords/wands retain `item.slot === 'weapon'`. `GAME.equipSlot(item)` routes hybrid wands to `P.equip.offhand`, swords to
  `P.equip.weapon`; both are saved separately, marked worn in the bag and upgraded independently. `P.meleeDmg` and `P.magicDmg`
  use the corresponding weapon; hybrid `P.dmg` is the maximum for stable enemy scaling, never a sum of both weapons.
- `ITEMS.starter(heroClass)`, `roll(ilvl,bias,rnd,heroClass)`, `allowed(item,heroClass)`, `isWand(item)` govern drops/equipment.
  `bossReward(type,heroClass,ilvl)` returns one exclusive rarity3 identity for each of six bosses × three classes (18 rewards; Round 5 added the knight);
  power scales with zone/NG+, never randomly. Boss items are class-locked and excluded from random pools.
- 50 item appearances: 29 weapons, 11 hats, 10 capes (Round 5 added the knight's three). Ten added ordinary looks: Buz Kristali/Güneş/Dalga swords, Mercan/Bulut/Çiçek
  wands, Bulut Beresi/Orman Gezgini Başlığı, Deniz Dalgası/Güneş capes. `FEZA.setEquip` accepts offhand; `H.wandTip` tracks it.
- Manual saves during boss endings include pending treasures, including the kefir gift and final dragon reward. Invalid hand indices
  recover an existing matching weapon before creating a starter, preserving the one-piece-per-look inventory rule.
- Automatic render target: 120 FPS on PC and Mac; 60 FPS on tablets and phones (QUALITY.tablet: iPad incl. its Mac-UA mode, Android,
  phones; ?tablet / ?pc force it), evenly every 2nd refresh on a 120 Hz iPad. No FPS setting in menus. Tablets: QUALITY.dpr ≤ 1.25, MSAA 4×
  and a point-light `if (directLight.visible)` ShaderChunk patch (same picture). Parent's choice after a steady 120 failed on an M1 iPad
  Pro even at 1.0× (and 90 can't be even on 120 Hz).

## Breakables and class balance (latest)
- Hybrid uses its sword for targeted breakables, attack-button breakables and obstacle-clearing swings; wizard keeps wand attacks.
  Breakable targets are passed into the swing so wand origin/aim tracks the actual object as well.
- Equal equipment still gives equal HP/armor. Wizard normal wand damage is1.15× (hybrid1.05×); wizard frost shield lasts2.2s.
  Hybrid normal sword hits have a0.95 multiplier, preserving warrior's melee advantage while hybrid retains both ranges.
  These modifiers do not change enemy scaling, item power, first-skill buffs or cooldowns.

## First-skill balance update (latest)
- Hilal Dalgası fires three separately visible, aimed crescents; the volley shares `round(1.62 × melee + 0.78 × magic)`
  damage (+20% over the previous single crescent), with rounding distributed across the three shots. Each retains pierce3;
  knockback is0.15 per crescent (combined0.45). Empty casts fan out; a lone visible forward target receives all three.
- Işık Okları remains three arrows, each now `round(0.82 × wandDamage + 2)` instead of `round(0.7 × wandDamage + 2)`.
  Both first skills keep their4s cooldowns and existing range/lifetime.

## Boss arena surprises (latest)
- `boss.encounter` owns cancellable arena mechanics; clear on calm, nap, defeat or zone change. Pause freezes timers.
- Dragon begins with 3 pooled spotted eggs, adds one every 12s and two at its summon thresholds (cap7). Player contact
  hatches a single non-boss `ejderyavru` using `EMODEL.babyDragon` (cap4 living); eggs wait when the cap is full.
  Whelps have modest damage and no XP/gold. These are temporary enemies, never a following pet.
- Jöle splits at72%/38% HP; Kefir has two telegraphed foam dance rounds; Mole has sequential ground eruptions;
  Lava Turtle sends a slow wave with a wide green gap. New moves replace normal boss actions while active.
- Each boss has an additional TBC-inspired move: `jellyspin` (Leotheras Whirlwind), `spout` (Lurker Spout),
  `shatter` (Gruul Shatter, three proximity crystals for solo play), `flamestrike` (Kael'thas), `eyeblast` (Illidan).
  All warn for2s; new moves have at most2 modest hits, Shatter at most1 even if circles overlap.
  Fixed captured paths/areas do not chase the player after warning. Shared geometry/materials and reusable meshes bound allocation.
  The first new move is scheduled after6s; subsequent specials wait13s between moves and start only from idle, alternating where an older timed move exists.
  Jöle retains its HP-threshold splits, dragon eggs keep their independent timer. Existing cleanup/pause rules apply.

## Screen-lock recovery and star attack (latest)
- Audio keeps gesture-release/key and page lifecycle recovery listeners after the initial unlock. Returning from an interrupted
  context restarts the selected music at the current audio clock, clears stale narration/ducking and preserves volume preferences.
  A closed context is rebuilt; turning sound/music back on and leaving pause also retry recovery. `?sessiz` stays entirely silent.
- Warrior Yıldız Atışı keeps its 4s cooldown: three larger stars aim at visible forward targets (converge on a lone target),
  each dealing `round(0.7 × swordDamage + 3)` and piercing up to three enemies. Walls still block shots.

## Güncel durum — changes after QA and Feza's requests (read this first; it overrides older text below)
- **Feza's requests:** all weapons are **lightsabers** (ITEMS.bladeColor(item), H.ignite(), H.bladeOn; saber sfx swing/swingBig/hit/crit, saberOn,
  saberOff); only **3 skills** (yildiz lvl 1, kasirga lvl 3, meteor lvl 5); every creature **cute and smiling**, nothing scary; **no spiders**;
  zone 1 = **Köstebek ve Salyangoz Mağarası** with kostebek (kind 'burrow', st.burrow, untargetable while underground) and salyangoz (ranged
  soap bubbles FX.projectile('bubble'), slime trail FX.burst('slime')); the dragon breathes sparkly bubbles instead of fire.
- **Parent's 2nd round (read first):** skill cooldowns 4 / 15 / 24 s (were 1 / 7 / 16); creatures tougher and hit harder (DIFF.hp 3.4, dmg 1.8,
  atkCd 0.75, elites hp ×3.4, dmg ×1.5 as before; dragon hp 175 × P.dmg, min 58 % so its fight stays ~1 min with the slower skills) and **DIFF.power**: above the usual sword damage for the zone (× the round's hp factor) creature hp grows
  with (P.dmg / usual)^0.8, so a strong sword or a new adventure round never makes them go happy in one hit. **Treasure (GAME's `DROP`):** the bag keeps
  ONE piece per look (slot + base) — a stronger, not less shiny copy replaces it in place; old saves are collapsed in cleanSave (shiniest copy stays, then strongest; the worn slot follows it); drops are rarer
  (normal 2 %, elite 50 %, small chest 60 %, big chest / dragon one item) and rollItem() looks for a look Feza doesn't have (or a better copy he
  would wear: never lower rarity, higher rarity or ≥ 1.3× power, stronger than what he wears); nothing new → a few coins. **No pet:** the dragon cheers up and is gone; no little dragon follows Feza
  (EMODEL.babyDragon and FX.projectile('pet') still exist but are unused; the 'ejder_dost' line was removed).
- **Difficulty (parent: "a bit harder"):** GAME's `DIFF` table scales enemy hp/damage/cooldowns/xp (the dragon's hp is set when the fight starts
  from Feza's damage). Hearts heal 10 %, regen after 5 s (1.2 %/s fighting, 5 %/s calm), 0.3 s invulnerability after a hit, new game starts with 2 potions.
  Auto-attack also works while dragging (gap < 1.1 m, within ±80° of the walking direction). Comic words limited by GAME.wordOK().
- **Core:** LIGHTS.torches has 2 lights; LIGHTS.flash is a borrowed flash light (FX.lightFlash drives it); QUALITY.msaa (4; 2 on non-tablet touch devices);
  QUALITY.dpr starts at 1.5 on desktop (tablets ≤ 1.25) and sun shadow map 2048². UI frame() caps at 120 FPS (tablets 60).
  perfTick(rawDt, active) counts only gameplay frames and follows the measured cadence target (see Adaptive rendering above);
  perfReset; precompile(obj, async) and
  renderer.compile compile against rtMain; CTX_HOOKS run after a WebGL context restore (env map restored); SHADOW + viewRadius size the sun shadow
  box from the camera; PLAIN / ENV_OK for the no-float-render-target fallback. While POST.on the canvas has no depth/stencil, so all 3D goes through renderFrame.
- **TEX:** TEX.init() builds common + forest surfaces; cave/volcano/castle ones (caveFloor, caveSand, basalt, ash, lava, castleFloor, carpet, brick)
  are generated by TEX.ensure(theme | zone index → ZONES[i].theme) (called under the zone fade) or lazily on first use. Extras: TEX.rep(name, rx, ry), TEX.mat(name, o), TEX.noise, TEX.HINT.
- **AUD:** AUD.dim(on) (music dips while paused), AUD.setSound/soundOn = sound effects only; the narrator has its own AUD.voiceOn/setVoice (never shown
  to the kid); AUD.stopVoice(), AUD.current (key string). sesler.js also has window.VOICE_DUR.
- **FX:** FX.beam(x, z, color, height, dur, {k, cut}) (column starts ~1.1 m up); floatText merges damage numbers per target and de-overlaps;
  atlas has 16 shapes (FX.SHAPES).
- **UI:** title: without a save only "Oyna"; with a save a big green "Devam Et" plus an orange "Baştan Başla" (a new game from the forest; the save stays until the next Kaydet); nothing saves by itself — Pause › **Kaydet** (GAME.save())
  is the only save; skill buttons show their keys 1 2 3 (#ui.kbd: no touch screen, or after any key press); "Baştan Başla" needs a 2 s hold; ⏸/🎒 are hold buttons in a top row; music toggle only in
  the pause menu; boss camera fits the whole dragon; cinematic after the boss.

## Round 4 — Feza's request: KEFİR VADİSİ, a dairy zone right after the forest (read first; overrides older text)
Feza LOVES kefir and yogurt and asked for this zone specially — it must be the most charming, creative, polished zone in the game.
Keep everything from earlier rounds (lightsabers, 3 skills, cute smiling creatures, no spiders/insects — and NO FLIES near the dairy —, no pet,
manual save only, current DIFF/DROP philosophy, battery settings, bosses at every zone end with gated portals).
**Zone order (index = save zone):** 0 orman (boss kraljole) · **1 kefir 'Kefir Vadisi'** (boss **kefirdev**) · 2 magara (kostebekusta) ·
3 yanardag (lavkaplumbaga) · 4 kale (ejderha, final). ZONES[1] = { id:'kefir', ad:'Kefir Vadisi', theme:'dairy', line:'kefir', music:'kefir',
size 100, rooms 8, side 3, enemies {yogurt:4, kaymak:3, kopuk:3, peynir:1, jole:2}, variants {jole:['muhallebi']}, elites ['yogurt','kaymak'],
hpMult 1.4, dmgMult 1.2, xpMult 1.35, gold 1.5, ilvl 2, boss 'kefirdev' }. Later zones keep their numbers (GAME re-balances DIFF for 5 zones).
Saves: sv 4. Saves with sv 3 and zone ≥ 1 move to zone + 1 (older saves first get the sv<3 migration, then this one).
**Look (theme 'dairy'):** a bright, creamy, pastel morning valley (peach-pink fog, warm soft sun, nothing dark). Walkable floor = creamy strained-yogurt
ground with soft swirls and spoon marks (TEX 'yogurt'); the path = biscuit/granola crumb trail with a few berries (TEX 'biscuit'); plazas/arena =
yellow cheese slabs with little holes (TEX 'cheese'). Non-walkable ground next to the floor = gently flowing MILK and KEFIR rivers/ponds (animated
creamy shader with soft ripples and tiny fizzy kefir bubbles popping on the surface) plus glossy white yogurt hills (low on the camera side).
Boundary/decor: giant Swiss-cheese wheels and wedges with holes, butter blocks, stacked yogurt pots, milk cans (güğüm), wooden butter churns
(yayık), glass milk and kefir bottles, honey pots with dripping honey, giant strawberries and blueberries, bowls of yogurt with fruit, a milk
waterfall, wooden fences with little bells, cute cow-patterned mailbox/sign "Kefir Vadisi". Biscuit bridges over the milk rivers. Boss arena =
"Kefir Pınarı": a round cheese-slab plaza around a bubbling kefir spring. All instanced/chunked within the existing draw-call budget.
**Creatures (05 models + EDEF, all cute and smiling — "ekşi" means a funny sour face: one eye squinting, tongue out; never gross, never rotten-looking):**
- yogurt 'Ekşi Yoğurt': a small yogurt cup with a peeled foil lid tilted like a cap, creamy body bulging over the rim, lime-tinted cream while sour;
  melee hopper (hops then bumps). Happy: fresh white cream with a strawberry on top.
- kaymak 'Kesik Kaymak': a rolled clotted-cream swirl with a honey drizzle "hat"; fast melee slider (glides, leaves a short creamy trail).
- kopuk 'Kefir Köpüğü': a floating cluster of fizzy foam bubbles with a face; flyer, ranged, puffs slow fizz bubbles (shot kind 'fizz').
- peynir 'Peynir Dilimi': a Swiss-cheese wedge with holes on little legs; slow, tanky melee (the zone's big one; also the elite-ish heavy).
- jole variant 'muhallebi': a wobbly milk-pudding jelly with a cinnamon dusting.
**Boss kefirdev 'Köpüklü Kefir Devi'** (~3 m): a big friendly glass kefir bottle creature — translucent glass with creamy kefir inside and bubbles
rising, a big bottle cap worn like a crown, a label with a smiling face, little arms. Phases (st.phase/st.phaseT): idle, move, shake (wobbles and
fizzes = wind-up), geyser (pops its cap and sprays a foam cone — telegraphCone), bubbles (spits 5 slow fizz bubbles in a fan), slam (hops and
lands with a milk-splash ring), summon (2–3 kopuk at 66 % / 33 %), roar (a happy burp-free "fizz!"), dying. Lines {giris:'kefirdev_giris', bitti:'kefirdev_bitti'}.
Fight length target for a button-masher ~35–50 s. Defeat: overjoyed, then it hands Feza a glass of kefir: Feza drinks it (cheer pose + sparkle),
full heal, 'kefir_ikram' line, guaranteed treasure + coins, then 'kefirdev_yol' line and the portal opens.
Pickups: in the kefir zone the heart pickups look like little kefir bottles (same effect).
**Story/voice (02):** new lines — yolculuk "Önce Huysuz Orman, sonra Kefir Vadisi, mağara, yanardağ ve en sonunda ejderhanın kalesi!" (said once
after giris2), kefir "Kefir Vadisi! Ejderhanın büyüsü buraya da ulaşmış: yoğurtlar ekşimiş, kaymaklar kesilmiş. Hadi onları neşelendirelim!",
ilk_yogurt "Bak bak! Ekşi yoğurtlar zıplıyor!", ilk_kaymak "Kaymaklar kayarak geliyor, dikkat!", ilk_kopuk "Kefir köpükleri uçuşuyor!",
kefirdev_giris "İşte Köpüklü Kefir Devi! Çalkalanınca köpük fışkırtıyor, dikkat et!", kefirdev_bitti "Kefir Devi çok mutlu! Artık hiç ekşi değil!",
kefir_ikram "Kefir Devi sana en güzel kefirinden verdi. Afiyet olsun Feza!", kefirdev_yol "Kefir Devi diyor ki: Ejderha dağların ardındaki
kalesine uçtu. Yol mağaradan geçiyor!". Changed lines — kraljole_bitti "Kral Jöle çok mutlu! Sihirli kapı Kefir Vadisi'ne açıldı!",
magara "Köstebek ve Salyangoz Mağarası! Kalenin yolu buradan geçiyor. Burası biraz karanlık ama sen çok cesursun.", usta_bitti "Usta Köstebek
kocaman gülümsüyor! Kapı yanardağa açıldı!", yanardag "Lav Yanardağı! Lavlar çok sıcak, yoldan ayrılma! Ejderhanın kalesi çok yakında!".
Music 'kefir' (sunny pastoral: accordion/ukulele/xylophone, a light Anatolian folk touch, very happy). New sfx: fizz, cork (bottle pop), slurp
(drinking), squish, moo (a soft cute distant cow, rare ambient), splat reused.
**FX (03):** bursts 'milk' (creamy splash), 'fizz' (rising sparkly kefir bubbles), 'crumbs' (biscuit crumbs); projectile kind 'fizz' (glossy soap-like
kefir bubble, pops with sparkles).
**UI (09):** 5 zones everywhere (cards 1–5), kefirdev boss portrait + SVG fallback, subtitle icons for the new lines (🥛 🥣 🫧 🧀 as fits).

## Round 3 — Feza's request: a 4th zone (volcano) + a boss at the end of EVERY zone (read first; overrides older text)
Keep everything from earlier rounds (lightsabers, 3 skills with cooldowns 4/15/24 s, cute smiling creatures, no spiders/bugs, no pet, manual
save via Pause › Kaydet only, current DIFF/DROP balance philosophy, battery settings). NOTHING scary, NO insects/spiders of any kind.
**Zones (06_level.js owns ZONES; order matters, index = save zone):**
0 orman 'Huysuz Orman' (boss **kraljole**) · 1 magara 'Köstebek ve Salyangoz Mağarası' (boss **kostebekusta**) ·
2 **yanardag 'Lav Yanardağı'** theme 'volcano', line 'yanardag', music 'yanardag', size 100, rooms 8, side 3,
  enemies {jole:3, kaplumbaga:4, ateskusu:3, atescik:2, golem:1}, variants {jole:['lava'], golem:['magma']}, elites ['kaplumbaga','ateskusu'],
  hpMult 2.3, dmgMult 1.65, xpMult 2.1, gold 2.5, ilvl 6, boss **lavkaplumbaga** ·
3 kale 'Ejderhanın Kalesi' (boss **ejderha**, `final: true`; unchanged otherwise).
ZONES[i].boss = boss type; ZONES[i].final = true only for the castle; optional ZONES[i].variants = {type: [variant ids]} → LEVEL writes
spawn.variant (random pick) and GAME passes it to EMODEL.build(type, {variant}).
**Level (06):** in every zone the last room is a big boss arena (kind 'boss', ≥ 22×20 m or radius ≥ 11 m, themed decor), L.boss {x,z} at its
centre, L.bossType = Z.boss. Zones 0–2 also get the exit portal L.exit at the arena's north edge, and L.portalObj is built **inactive**
(setActive(false)); the castle keeps L.crystalSpot and no portal. A checkpoint right before each arena. Boss types never appear in L.spawns.
Volcano visuals: bright, warm and cheerful (not dark, not hellish): glowing animated lava lakes/rivers fill the non-walkable ground next to the
floor (emissive shader, flowing cells, crust islands, soft glow bands on the floor edge), stone bridges where the route crosses lava, basalt
boulders and obsidian crystals (not spiky-scary), smoking vents with cute steam puffs, rising embers, fire flowers, warm light pools from lava
(LIGHTS.torches), orange-peach fog. Lava is simply not floor (no lava damage). Textures from TEX: basalt, ash, lava (TEX.ensure('volcano')).
**New creatures (05 models + EDEF; all cute & smiling):** kaplumbaga 'Minik Lav Kaplumbağası' (small turtle with a tiny smoking volcano on its
shell; melee: tucks into its shell and rolls forward as its attack), ateskusu 'Ateş Kuşu' (round fire chick with a flame crest, tiny wings, flyer,
ranged: flicks slow embers, shot kind 'ember'), jole variant 'lava' (glowing orange magma jelly), golem variant 'magma' (dark basalt with glowing
orange cracks, warm friendly eyes).
**Bosses (EDEF kind 'boss'; EDEF[type].lines = {giris, bitti, yarim?} voice keys):**
- kraljole 'Kral Jöle' (~2.8 m crowned royal jelly): hop toward Feza → landing slam ring (telegraph), spit 3 slow jelly blobs (FX.projectile('jelly')),
  summon 3 small jellies at 66 % and 33 % hp.
- kostebekusta 'Usta Köstebek' (~2.6 m mole with a drill hard-hat, goggles, headlamp): burrows (untargetable, st.burrow) → telegraph circle under
  Feza → emerges there with a ring shockwave; throws slow dirt clods (FX.projectile('rock')); summons 3 kostebek at 66 % / 33 %.
- lavkaplumbaga 'Koca Lav Kaplumbağası' (~2.8 m turtle whose shell is a little volcano): erupts 3–5 lava balls that arc up and land on telegraph
  circles (FX.projectile('lavaball')); tucks into its shell and rolls across the arena along a telegraphed lane (FX.telegraphLine); stomp ring;
  summons 2 kaplumbaga at 50 %.
- ejderha: unchanged final boss (bite/stomp/bubble breath/fireballs/bats; at close range also picks the breath sometimes: bite 45 / stomp 30 / breath 25).
Boss model animation: m.anim(dt, st) with st.phase (string) + st.phaseT (0..1) + st.move/st.dying/st.hurt (+ st.burrow for the mole).
Phases — kraljole: idle, move, hop, spit, summon, roar · kostebekusta: idle, move, burrow, emerge, throw, drill, summon, roar ·
lavkaplumbaga: idle, move, erupt, hide, roll, stomp, summon, roar. Dragon keeps its existing st fields. m.muzzle() = mouth / volcano top / hand.
**GAME (07):** one generic boss framework: arena aggro, boss bar ('boss' event with name + type), boss music, intro line, hp sized to Feza's damage
per boss (targets for a button-masher: kral jöle ~30–45 s, usta köstebek ~40–55 s, lav kaplumbağası ~50–70 s, dragon ~60–90 s), naps tire the boss,
checkpoint moves to the arena entrance on aggro. Mid-boss defeat (non-final): overjoyed face + big cheer, guaranteed treasure (DROP rules) + coins,
its 'bitti' line, portal activates (setActive(true)) + 'kapi' line, the boss waves and vanishes in sparkles. Final boss: existing finale.
Saves written before this round (no sv or sv < 3) with zone ≥ 2 move to zone + 1 (the castle is now index 3).
**Voice (02):** new lines yanardag, ilk_kaplumbaga, ilk_ateskusu, kraljole_giris, kraljole_bitti, usta_giris, usta_bitti, kaplumbaga_giris,
kaplumbaga_bitti; **tekrar** must NOT say the creatures got stronger (Feza disliked it): "Yeni macera başlıyor! Hadi Feza, huysuzları yine
neşelendirelim!". New music 'yanardag'. New sfx: lava, erupt, drill, roll, bounce, chirp, splat, rumble.
**FX (03):** bursts 'lava' (orange splash + embers), 'erupt' (upward lava spray), 'steam'; projectile kinds 'jelly', 'rock', 'lavaball', 'ember';
FX.telegraphLine(x0, z0, x1, z1, width, dur, color) → {remove()}.
**UI (09):** boss portrait per boss type (generalise the dragon portrait; cached; cute inline-SVG fallback per boss), boss bar/minimap/subtitle icons
use it; zone cards count 1–4; inactive vs active portal on the minimap. Small fixes: title subtitle must not cover the main buttons; portrait
victory panel keeps a margin from the screen edges; wardrobe damage stat uses the saber icon instead of ⚔️.

## Files and load order (all classic `<script>`, NO ES modules, no network)
```
vendor/three.js      window.THREE (r170)
sesler.js            window.VOICE_MP3 = { key: base64mp3 }   (generated by gen_voice.py; may be missing → silent voices)
src/00_core.js       (written) helpers, renderer, camera, lights, post-processing, Kit, materials   ← READ IT FIRST
src/01_textures.js   TEX        procedural textures (albedo + normal maps)
src/02_audio.js      AUD        sfx synth, music, narrator voice + subtitles hook, LINES
src/03_fx.js         FX         particles, slashes, rings, telegraphs, beams, lightning, shield, ice, floating text, shake
src/04_feza.js       FEZA, ITEMS hero model + animation, equipment (lightsabers/hats/capes) models, item defs, thumbnails
src/05_enemies.js    EDEF, EMODEL enemy stats + models + animations, boss dragon, baby dragon pet, owl NPC
src/06_level.js      ZONES, LEVEL level generation, level visuals, collision, flow-field pathing
src/07_game.js       GAME       player, combat, enemy AI, projectiles, pickups, loot, XP, boss, zones, save
src/08_skills.js     SKILLS     the 3 skills (cast + ongoing effects)
src/09_ui.js         UI         DOM HUD + menus + input + minimap + camera + main loop + boot()
src/ui.css           styles for everything in 09_ui.js (and FX floating text)
```
The files stay separate (index.html loads them in order; sw.js caches them), and they share one global scope, so: **every file must only expose the globals listed for it**.
Put private helpers inside an IIFE or give them a file-unique prefix. Top-level `const`/`function` names are shared across
files (classic scripts share one global lexical scope) — a duplicate name is a SyntaxError that kills the game.
Files must not do heavy work at load time; heavy setup goes into `init()` functions that `boot()` (09_ui.js) calls in order:
`TEX.init() → FX.init() → GAME.init() → UI shows title`. AUD is lazy (`AUD.unlock()` on first user gesture).
Do not touch other modules' files. If you need something from another module that is not in this spec, code defensively
(`typeof FX !== 'undefined' && FX.burst && FX.burst(...)`) and report it in your final summary.

## World conventions
- 1 unit = 1 metre, Y up, ground at y = 0. Level grid: cell (i, j) covers x∈[i,i+1), z∈[j,j+1); `L.grid[j*L.W+i]` 1=floor, 0=wall.
- Camera (core `cameraFollow`) looks from **+z (south) toward −z (north)**, pitched ~49°, distance ~12.5 m. Screen up = −z.
  Things with larger z than the hero are between camera and hero → keep them LOW (walls/trees on the south side of walkable
  areas must be short: low wall caps, bushes) so they never hide Feza.
- Facing angle `face`: model forward is **+z**; `obj.rotation.y = face`; direction vector = `(sin face, cos face)`.
- Sizes: Feza ≈ 1.45 m tall. Jöle 0.8 m, goblin 1.2 m, golem 2.4 m, boss dragon ≈ 4.5 m tall.
- Colours in code are sRGB hex. Vertex colours via `Kit` are converted correctly (THREE.Color does it).
- Lighting is PBR (MeshStandardMaterial) with an env map (`setEnvironment`), hemisphere + shadowed sun following the hero,
  optional hero point light and 4 pooled torch point lights (`LIGHTS.torches`). The scene is rendered in **linear HDR** and
  tone-mapped in the final pass: colours > ~1.25 bloom. Use `glowMat(color, intensity)` (unlit, intensity 2–5) or
  `emissive` + `emissiveIntensity` for glowing things. Don't make ordinary surfaces bloom.
- Shadows: only characters, trees/walls/big props cast (`castShadow`). The floor receives.

## Core API (src/00_core.js — already written, read it)
Globals: `Q, SILENT (?sessiz: no audio at all), ICON (?ikon), DEBUG, BASIC (?basit: no post), TAU, clamp, lerp, damp(a,b,k,dt),
smooth01, angDiff, dampAngle, dist2, $, mulberry32, RNG {seed,r,range,int,pick,chance} (seeded, for level gen),
frand, fpick (Math.random, for fx), TIME {t, dt, u: shared time uniform}, UP, ZERO3, renderer, scene, camera, CAM,
LIGHTS {hemi, sun, sunOffset, feza, torches[4]}, lightsFollow(x,z), setLighting({...}), setEnvironment(sky,horizon,ground,int),
POST {on, strength, threshold, exposure, saturation, vignette, tint, tintAmt}, renderFrame(), resizeRenderer(), RESIZE_HOOKS,
QUALITY {dpr, minDpr, msaa, tablet}, QUALITY_TOP, PERF, perfMeasure(done), perfRaf(ts,idle), perfTick(rawDt,active), cameraFollow(x,y,z,dt,snap), groundFromScreen(sx,sy,y=0) → Vector3|null,
toScreen(v3, out) → {x,y,vis}, G {sphere,hemi,cyl,cone,box,rbox,torus,capsule,ico,dodeca,octa} (cached unit geometries —
never dispose them), Kit (add/push/pop/seg/build), mergeParts, tmat, onSphere(x,y,R,inset) → [pos, quat], col3, mixCol,
stdMat(o), vcMat(o), glowMat(color,int,o), patchMat(mat,o), rimify(mat,color,strength,power), disposeTree(obj), shadows(obj,cast,recv),
ANISO, HDR_OK.`
Patched materials (patchMat/rimify) must **not** be `.clone()`d (onBeforeCompile is not copied) — make a new one instead.

## Feza's look (from his photo) — the hero MUST resemble him
5-year-old boy, fair skin (#f4cdb2), **shaggy medium-length dark-brown hair** (#4a2a17 with lighter #6b4424 strands) with
**messy bangs swept to one side over the forehead**, hair covering the ears and nape; **big warm brown eyes**; a cheeky
closed-mouth **smirk** (one corner higher); round cheeks, small nose. Wears an **off-white ribbed T-shirt with a print of
little clouds (thin dark outline), small pastel planes (pink, blue, yellow) and tiny stars**, matching shorts, sneakers.
Chibi proportions: big head (~40% of height). Equipment (sword in right hand, hat, cape) is added on top.

---------------------------------------------------------------------------------------------------------------------------
## TEX — src/01_textures.js
`TEX.init()` generates everything synchronously (budget: < 1 s on an M1 iPad; 512×512 per surface, 256 for small ones).
Every surface `TEX.<name> = { map, normalMap }` — tileable, RepeatWrapping, mipmaps, `anisotropy = ANISO`,
map in SRGBColorSpace, normalMap in NoColorSpace (OpenGL convention, +Y up). `TEX.M.<name>` = metres covered by one tile.
Surfaces (all must exist):
| name | look | TEX.M |
|---|---|---|
| grass | lush saturated lawn, mottled greens, blade detail, rare tiny white/yellow flowers | 4 |
| dirt | warm brown path with pebbles | 3 |
| cobble | rounded grey-warm cobblestones (village plaza) | 3 |
| caveFloor | blue-grey flagstones, cracks, slight teal moss | 4 |
| caveSand | lighter sandy/pebbly cave dirt | 3 |
| castleFloor | polished lavender-grey stone tiles (1 m) with thin gold inlay at corners | 4 |
| carpet | royal red woven carpet with subtle damask pattern | 2 |
| brick | castle wall blocks: lavender-grey stone bricks, bevelled | 2 |
| rock | NEUTRAL light-grey rock (tinted by vertex/material colour) for boulders, golem, arches | 3 |
| wood | warm planks with grain and nails (chests, crates, houses) | 1 |
| bark | tree bark, vertical ridges, brown | 1 |
| roof | red-orange scalloped roof tiles | 2 |
| plaster | cream plaster with Tudor timber beams along all 4 edges and a middle cross beam (maps 0..1 per wall face) | 1 |
| leaves | NEUTRAL (light grey/white) dense leaf clusters — tinted by vertex/instance colour for foliage/bushes | 2 |
| fabric | NEUTRAL fine weave (capes, carpets, banners) | 0.5 |
| metal | NEUTRAL brushed metal with scratches (helmets, swords, armour) | 0.5 |
| moss | vivid green moss (optional overlay) | 2 |
`TEX.shirt = { map, normalMap }` — Feza's T-shirt print (see Feza's look), with a ribbed-knit normal map (vertical ribs).
Map is designed to wrap around a torso (u around, v up); repeat is set by the consumer.
Nice-to-have: `TEX.face?` no. Keep it to surfaces.

## AUD — src/02_audio.js
```
AUD.unlock()                    call inside the first pointerdown/click; creates+resumes AudioContext; no-op if SILENT
AUD.sfx(name, {vol=1, pitch=1, x, z})   synthesized (WebAudio) — distance-attenuated if x,z given (see setListener)
AUD.setListener(x, z)
AUD.music(name|null)            'title','orman','magara','kale','boss','zafer' — generative, gentle, loops, crossfades
AUD.setMusic(on) / AUD.setSound(on) / AUD.musicOn / AUD.soundOn   (UI persists them in localStorage)
AUD.say(key, {prio=1, interrupt=false, sub=true}) → seconds (estimated)   narrator line; ducks music; queue by priority;
                                  low-prio lines (prio 0) are dropped if something is already speaking
AUD.speaking() → bool
AUD.onSubtitle = (text|null) => {}   UI sets this; AUD calls it with the line text when it starts and null when done
AUD.LINES = { key: 'Türkçe metin' }  the narrator script (also used for subtitles)
```
SFX names that MUST exist: swing, swingBig, hit, hitSoft, crit, pop (enemy turned happy), coin, heart, potion, levelup, unlock,
star, spin, ice, shield, zap, meteorFall, boom, hurt, chest, portal, break, drop, dropRare, dropLegend, click, checkpoint,
roar, bite, spit, fireball, slam, whoosh, bat, splash, cheer, step. Sounds are soft and cartoony, never harsh or scary.
Voice: base64 mp3 from `window.VOICE_MP3[key]`, decoded with decodeAudioData (works on file://). If missing → subtitle only.
iOS: call `navigator.audioSession && (navigator.audioSession.type = 'playback')` in unlock so the mute switch doesn't silence it.
The `LINES` object literal must be delimited exactly like this so `gen_voice.py` can parse it as JSON:
`AUD.LINES = /*SESLER*/{ "key": "text", ... }/*SESLER-SON*/;`
gen_voice.py (project root): parses LINES from index.html if the markers are there, else from src/02_audio.js; records each line
with edge-tts `tr-TR-EmelNeural` (rate -5%, pitch +2Hz), caches mp3s in `.ses_onbellek/` by text hash, trims leading/trailing
silence with ffmpeg, and writes `sesler.js` (`window.VOICE_MP3 = {...}` base64, keys in LINES order). Pronunciation fixes list.
Voice line keys and texts. **The source of truth is `AUD.LINES` in src/02_audio.js** (texts there may be newer than this list;
keep them short, simple Turkish; no "Aa"/"Oo"):
```
giris1  "Merhaba Feza! Huysuz Ejderha köyün neşe kristalini aldı ve herkesi huysuz yaptı."
giris2  "Işın kılıcınla huysuzlara dokun, yeniden neşelensinler! Gitmek istediğin yere parmağını bas."
baykus  "Hu hu! Ben Bilge Baykuş. Orman yolu şu tarafta. Canın azalırsa kırmızı iksiri iç!"
orman   "Huysuz Orman! Jöleler ve mantarlar çok huysuzlanmış."
magara  "Köstebek ve Salyangoz Mağarası! Burası biraz karanlık ama sen çok cesursun."
ilk_kostebek "Bak bak! Köstebekler toprağın altından çıkıyor!"   ilk_salyangoz "Salyangozlar baloncuk üflüyor, dikkat et!"
kale    "Ejderhanın Kalesi! Neşe kristali burada bir yerde."
yetenek_yildiz  "Yeni yetenek: Yıldız Atışı! Yıldızlı düğmeye bas, uzaktaki huysuzlara yıldız fırlat!"
yetenek_kasirga "Yeni yetenek: Kasırga! Fırıl fırıl dön, etrafındaki herkese dokun!"
yetenek_meteor  "Yeni yetenek: Meteor Yağmuru! Gökyüzünden yıldız taşları yağdır!"
seviye1 "Seviye atladın! Daha da güçlendin!"   seviye2 "Bir seviye daha! Harikasın Feza!"   seviye3 "Seviye atladın! Kılıcın artık daha güçlü!"
kilic   "Yeni bir ışın kılıcı buldun!"   sapka "Yeni bir şapka! Sana çok yakıştı!"   pelerin "Yeni bir pelerin! Rüzgârda uçuşuyor!"
efsane  "Vay canına! Efsane bir hazine!"   sandik "Hazine sandığı! Bakalım içinden ne çıkacak?"
can_az  "Canın azaldı! Kırmızı iksire bas!"   iksir_yok "İksirin bitti. Kalpleri topla, canın dolsun!"
yoruldu "Feza biraz yoruldu. Dinlenip hemen geri dönüyoruz!"
nese_tasi "Neşe taşı parladı! Yorulursan buradan devam edeceksin."
kapi    "Sihirli kapı! İçine gir, yeni bir yere gidelim!"
kocaman "Dikkat! Kocaman bir huysuz geliyor!"
ejderha_giris "İşte Huysuz Ejderha! Hadi Feza, onu da neşelendir!"
ejderha_yarim "Ejderha yoruluyor! Devam et, çok az kaldı!"
ejderha_yumurta "Ejderha yeni yumurtalar bıraktı! Dokununca içinden minik ejderhalar çıkıyor."   (said only when new eggs appeared)
ejderha_bitti "Başardın! Ejderha artık hiç huysuz değil. Meğer sadece bir arkadaş istiyormuş."
kristal "Neşe kristali! Ona dokun, köye neşe geri dönsün!"
son     "Tebrikler Feza! Herkesi neşelendirdin. Sen gerçek bir kahramansın!"
tekrar  "Yeni macera! Huysuzlar bu sefer biraz daha güçlü."
hos_geldin "Tekrar hoş geldin Feza! Macera kaldığın yerden devam ediyor."
canta   "Çantana bak! Hangi şapkayı takmak istersin?"
ovgu1 "Harika!"  ovgu2 "Süpersin!"  ovgu3 "Çok güçlüsün Feza!"  ovgu4 "İşte bu!"  ovgu5 "Bravo!"  ovgu6 "Muhteşem!"
basla   "Oyna düğmesine bas, maceraya başlayalım!"   devam "Devam Et düğmesine bas, macera kaldığın yerden sürsün!"
```

## FX — src/03_fx.js
```
FX.init()                         create pools (one additive + one normal-blend THREE.Points system, ≤3000 particles total,
                                  custom ShaderMaterial with a 2×2 atlas: soft glow / 5-point star / 4-point sparkle / smoke puff)
FX.update(dt)                     advance everything (call every frame, also when paused? no — only while playing/title)
FX.burst(kind, x, y, z, opts={})  presets: 'hit','crit','sparkle','cheer' (hearts+stars rising when an enemy turns happy),
    'coin','dust','step','levelup','ice','fire','smoke','heal','magic','portal','spore','ghost','debris'(opts.color),
    'zzz','embers','confetti','star'(yellow star trail puff),'shadowPuff'. opts: {color, count, scale, dir:{x,z}}
FX.emit(p)                        raw particle {x,y,z,vx,vy,vz,life,size,size1,color,color1,alpha,shape(0-3),add:bool,grav,drag,spin}
FX.slash(x, y, z, face, dir, color='#fff', radius=1.9, arc=2.4)  sword swoosh arc (flat ribbon, additive, 0.22 s)
FX.ring(x, z, {r0=0.3, r1=4, dur=0.45, color, width=0.35, y=0.06})   expanding ground shockwave
FX.telegraph(x, z, r, dur, color='#ff4a3a') → {remove()}   danger circle on the ground that fills up over dur (kids must see it)
FX.telegraphCone(x, z, face, angle, len, dur, color) → {remove()}
FX.beam(x, z, color, height=3.5) → {obj, remove()}          vertical light column (loot beams, level-up)
FX.lightning(points /*Vector3[]*/, color='#bfa8ff')          jagged glowing bolts through the points, fades in 0.3 s
FX.shield(obj) → {remove()}       rainbow fresnel bubble following obj (radius ~1.2)
FX.iceBlock(obj, radius) → {remove()}   translucent ice crystal around a frozen enemy
FX.projectile(kind, color) → Object3D   glowing projectile visual: 'star','spore','ghost','fire','ice','dragonfire','pet'
FX.trail(kind, x, y, z)           one trail puff for a projectile (GAME calls it each frame)
FX.floatText(x, y, z, text, style) DOM floating text: 'dmg' (white), 'crit' (big yellow "POW!" style), 'heal' (green +),
                                  'gold' (yellow), 'xp', 'word' (colourful comic word: "Pof!", "Bam!", "Vuuş!")
FX.shake(amount)                  camera shake (FX.shakeOffset Vector3 is read by cameraFollow)
FX.flash(color, amount, dur)      edge tint via POST.tint/tintAmt (hurt = red)
FX.lightFlash(x, z, color, intensity, dur)   brief light burst (reuse LIGHTS.feza or an own pooled PointLight)
FX.clear()                        remove all transient effects (zone change)
```

## FEZA + ITEMS — src/04_feza.js
```
FEZA.create() → H
  H.root          THREE.Group (feet at y=0, faces +z). Scale so Feza ≈ 1.45 m.
  H.update(dt, st) st = { move: 0..1 (speed fraction), attack: -1 | 0..1 (swing progress), swingDir: 1|-1 (alternating combo),
                          cast: -1 | 0..1, spin: bool (whirlwind), hurt: 0..1, dead: bool (asleep on the ground, zzz), cheer: bool,
                          idleT: seconds idle (fidgets) }
  H.setEquip({weapon, hat, cape})   ITEMS item objects or null; attaches models (sword in right hand, hat on head, cape on back)
  H.tip           THREE.Vector3 world position of the sword tip (updated in update)
  H.hand          THREE.Vector3 world position of the right hand
  H.setXray(on)   draw a soft light-blue silhouette of Feza where walls/trees hide him (stencil technique; renderer has stencil)
FEZA.portrait(H) → dataURL (square 256px, face close-up with current hat, transparent or nice round background)
ITEMS.RARITY = [{ad:'Sıradan',color:'#f4f4f4'},{ad:'Sihirli',color:'#5aa8ff'},{ad:'Nadir',color:'#ffd23f'},{ad:'Efsane',color:'#ff8a1c'}]
ITEMS.BASES = { weapon:[...], hat:[...], cape:[...] }  each {id, ad, minLvl, legendary?:true}
  weapons (Feza's request: all LIGHTSABERS; ids kept for saves): tahta 'Eğitim Işın Kılıcı'(0), demir 'Mavi Işın Kılıcı'(1),
           kristal 'Yeşil Işın Kılıcı'(3), ates 'Kırmızı Işın Kılıcı'(5), yildiz 'Mor Işın Kılıcı'(7), gokkusagi 'Gökkuşağı Işın Kılıcı'(legendary only)
           ITEMS.bladeColor(item) → '#rrggbb'; H.ignite(), H.bladeOn
  hats:    migfer 'Şövalye Miğferi'(0), sihirbaz 'Sihirbaz Şapkası'(2), kovboy 'Kovboy Şapkası'(3), korsan 'Korsan Şapkası'(4),
           tac 'Altın Taç'(legendary only)
  capes:   kirmizi 'Kırmızı Pelerin'(0), mavi 'Yıldızlı Pelerin'(2), yesil 'Yaprak Pelerin'(3), mor 'Sihirli Pelerin'(5),
           gokkusagi 'Gökkuşağı Pelerini'(legendary only)
ITEMS.make(slot, baseId, rarity, ilvl) → item {uid, slot, base, rarity, ilvl, power, ad}
     power = round((ilvl*2 + 4) * [1, 1.35, 1.75, 2.3][rarity]); ad = base name (+ ' ✦' for rarity ≥ 2 is fine)
ITEMS.roll(ilvl, bias=0, rnd=Math.random) → item   slot 40/30/30; rarity weights [60,28,10,2] shifted up by bias (0..2);
     base chosen among minLvl ≤ ilvl (legendary-only bases only when rarity = 3, and rarity 3 prefers them)
ITEMS.starter() → {weapon: tahta rarity 0 ilvl 1, hat: null, cape: null}
ITEMS.model(item) → Object3D standalone model (for ground display + thumbnails). Rarity ≥ 2 glows a bit more.
ITEMS.thumb(item) → dataURL 128px (rendered once per base+rarity with a small offscreen render target; cached)
ITEMS.stars(item) → 1..5 by POWER only (parent): <10 ★, 10–15 ★★, 16–23 ★★★, 24–33 ★★★★, ≥34 ★★★★★; rarity is shown by colour/glow 
```
Stats meaning (GAME applies): weapon.power → +damage; hat.power → +5×power max HP; cape.power → armour % = min(45, power),
cape rarity → +4% move speed per rarity.

## EDEF + EMODEL — src/05_enemies.js
```
EDEF[type] = { ad, hp, dmg, speed, r (collision radius), height (for hp bar), xp, gold, kind:'melee'|'ranged'|'slam'|'boss',
               atkRange, atkCd, windup (s), fly:bool, aggro (m), shot?:{kind, speed, r, dmg} , scale? }
types: jole (Jöle, bouncing jelly; variants green/pink/blue/purple), mantar (Huysuz Mantar, ranged spores),
       yarasa (Yarasa, fast flyer), goblin (Haylaz Goblin, club), kostebek (Köstebek, miner mole that burrows and pops up — kind 'burrow',
       st.burrow 0..1), salyangoz (Salyangoz, spiral-shell snail blowing bubbles, ranged), hayalet (Hayalet, floating ranged),
       golem (Kaya Devi, big slow slam), asker (Teneke Asker, toy soldier with wind-up key), atescik (Ateşçik, living flame, ranged),
       ejderha (Huysuz Ejderha, boss)
Suggested base stats (zone 1 scale; GAME multiplies by zone):
  jole hp22 dmg5 spd2.6 r.5 xp10 | mantar hp26 dmg6 spd1.8 ranged range7 cd2.4 | yarasa hp12 dmg4 spd4.4 fly
  goblin hp38 dmg8 spd2.9 | kostebek hp30 dmg7 spd3.2 burrow | salyangoz hp40 dmg6 spd1.2 ranged range6.5 (bubbles) | hayalet hp30 dmg7 spd2.2 fly ranged range6.5
  golem hp140 dmg14 spd1.5 r1.1 slam atkRange2.6 | asker hp55 dmg10 spd2.6 | atescik hp32 dmg8 spd2.4 fly ranged range7
  ejderha hp1600 dmg16 spd1.6 r2.2 boss
EMODEL.build(type, {variant, elite}) → m
  m.root (Group, feet at y=0, faces +z), m.height, m.radius
  m.anim(dt, st)  st = { move: 0..1, windup: -1|0..1, attack: -1|0..1, hurt: 0..1, frozen: bool, dying: -1|0..1, t (own clock),
                         boss-only: breath: -1|0..1, stomp: -1|0..1, roar: -1|0..1, fireball: -1|0..1 }
                  → idle bob/hop, walk, readable wind-up telegraph (lean back / puff up / glow), strike, hurt squash,
                    frozen = no motion, dying = happy face + joyful hop/spin + shrink to 0 at 1.
  m.setMood('grumpy'|'happy')    face swap (grumpy: angry slanted brows + frown; happy: ^ ^ closed eyes + big smile + blush)
  m.flash(amount 0..1, color='#ffffff')   hit flash via emissive on the body material(s) (each enemy has its own material)
  m.setTint(color|null)          e.g. icy blue while frozen
  m.muzzle() → Vector3 world pos where projectiles spawn (mouth/cap/hands)
  m.dispose()
  Elite: 1.4× scale + golden rim light + slightly different colours (GAME adds aura/name).
EMODEL.owl() → {root, anim(dt, talking:bool)}          Bilge Baykuş NPC (cute owl, big eyes, glasses? optional) sits on a stump
EMODEL.babyDragon() → {root, anim(dt, moving:bool, attacking:bool, st?), muzzle(), flash(a, c), setTint(c), setMood()}   friendly baby dragon (≈0.9 m) — no pet; it is the
     dragon-arena whelp (ejderyavru). st = GAME's enemy state: hurt squash, frozen = no motion, dying = happy hops + twirl + shrink.
EMODEL.crystal() → Object3D                           the big pink "neşe kristali" (glowing, for the ending)
Share geometries across instances (cache per type+variant+mood). Target ≤ 3 draw calls per normal enemy.
Enemy material: vcMat + rimify; jelly glossy (roughness .15), golem uses TEX.rock map, flame/ghost use glow.
```

## ZONES + LEVEL — src/06_level.js
```
ZONES = [
 {id:'orman',  ad:'Huysuz Orman',      theme:'forest', line:'orman',  music:'orman',  size:100, rooms:8, side:3,
  enemies:{jole:4, mantar:2, yarasa:2, goblin:3}, elites:['jole','goblin'], hpMult:1, dmgMult:1, xpMult:1, gold:1, ilvl:1},
 {id:'magara', ad:'Köstebek ve Salyangoz Mağarası', theme:'cave', line:'magara', music:'magara', size:100, rooms:9, side:3,
  enemies:{kostebek:4, salyangoz:3, yarasa:2, golem:1}, elites:['kostebek','salyangoz'], hpMult:1.8, dmgMult:1.4, xpMult:1.7, gold:2, ilvl:4},
 {id:'kale',   ad:'Ejderhanın Kalesi', theme:'castle', line:'kale',   music:'kale',   size:104, rooms:8, side:2,
  enemies:{asker:4, atescik:3, hayalet:2, golem:1}, elites:['asker','atescik'], hpMult:2.8, dmgMult:1.9, xpMult:2.5, gold:3, ilvl:7, boss:'ejderha'}
]
LEVEL.generate(zoneIndex, seed) → L  (pure data, RNG.seed(seed))
  L = { zone, Z, W, H, grid:Uint8Array(W*H) 1=floor, rooms:[{x,z,r,hw,hh,kind:'start'|'main'|'side'|'exit'|'boss'}],
        start:{x,z}, exit:{x,z} (portal; castle: null), boss:{x,z}|null, npc:{x,z}|null (zone 0 only, near start),
        spawns:[{type,x,z,elite,pack,room}], chests:[{x,z,big}], breakables:[{x,z,kind:'vase'|'barrel'|'crate'}],
        checkpoints:[{x,z}], torches:[{x,y,z}], path:[{x,z}...] (main route polyline start→exit/boss) }
  Layout: chain of rooms from start (south, large z) to exit/boss (north, small z), winding left/right, organic blobs for
  forest/cave (with noisy edges) and rectangles + pillars for the castle; side rooms hold chests; corridors 3–4 m wide.
  Zone 0 start room is the village edge (houses on its north side, owl NPC, well, fences, flowers) and has no enemies.
  Castle last room = big boss hall (≈26×22 m) with the neşe kristali pedestal at its north end.
LEVEL.build(L)        creates L.group (in scene) + sets theme lighting (setLighting incl. fog/env/bloom) + all visuals:
  floor = one plane with a custom splat material (base/path/plaza textures blended by a baked mask texture that also holds
  soft ambient occlusion near walls), forest boundary = instanced trees (several species incl. pink blossom trees, wind sway)
  and bushes on the camera side, cave = instanced rock boulders + glowing crystals + stalagmites + cobwebs, castle = instanced
  brick wall blocks (tall on north/east/west sides, low caps on the south side), pillars, banners, torches (flame sprites +
  LIGHTS.torches assigned to the nearest), red carpet along the main path. Decorations: flowers, grass tufts, mushrooms,
  rocks, crystals… (instanced, chunked ~16 m for frustum culling). Interactive objects:
  L.chestObjs[] {x,z,big,opened, open()}           (lid animation + sparkle; GAME spawns the loot)
  L.breakObjs[] {x,z,r,kind,broken, break()}       (debris burst via FX; hides mesh; its solid stops blocking)
  L.cpObjs[]    {x,z,active, activate()}           ("Neşe Taşı" checkpoint crystal on a pedestal; glows when active)
  L.portalObj   {x,z,active, setActive(bool)}      swirling magic portal (zones 0–1)
  L.npcObj      {x,z,model}                        owl (EMODEL.owl()) on a stump (zone 0)
  L.crystalSpot {x,z}                              castle only: where the crystal appears after the boss
  L.solids[]    {x,z,r,alive}                      collision circles (breakables, chests, pillars, stumps, well…)
  L.mapCanvas   canvas, 1 px per cell, floor pixels coloured for the minimap (walls transparent)
LEVEL.update(dt, L, fx, fz)   animate portal/torches/crystals, assign torch lights near the hero, TIME-based wind
LEVEL.dispose(L)
LEVEL.isFloor(L,x,z) · LEVEL.circleFree(L,x,z,r) (grid walls + alive solids) · LEVEL.move(L, pos /*{x,z} or Vector3*/, dx, dz, r)
  (axis-separated slide) · LEVEL.los(L,x0,z0,x1,z1) · LEVEL.flowTo(L, x, z) (rebuild BFS flow field toward the hero; throttle
  ≤ 5×/s, cap ~45 steps) · LEVEL.flowDir(L, x, z) → {x,z} unit vector along the flow or null · LEVEL.randomFloorNear(L,x,z,rmin,rmax)
```

## GAME — src/07_game.js
Owns all simulation. Never touches the DOM (UI does), except through FX.floatText.
```
GAME.init()                      create Feza (FEZA.create), add to scene, set up pools
GAME.P                           player: { pos:Vector3, face, hp, maxHp, lvl, xp, xpNext, gold, potions, maxPotions:5,
                                   dmg, armor, speed, equip:{weapon,hat,cape}, bag:[items], skills: [{cd, unlocked}],
                                   spin (s left), shield (s left), dead, checkpoint:{x,z}, zone, ng (new-game+ count) }
GAME.H                           Feza model (FEZA.create())
GAME.enemies                     alive enemy runtime objects {type, def, m, x, z, hp, maxHp, elite, name, boss, ...}
GAME.L                           current level
GAME.state                       'title' | 'play' | 'dead' | 'transition' | 'end'      GAME.paused (UI sets)
GAME.newGame() · GAME.continueGame() · GAME.hasSave() · GAME.save() · GAME.clearSave()
GAME.loadZone(i, {title:false})  dispose old level, generate (seed = random unless ?tohum=N) + build, spawn enemies/props,
                                 place Feza at L.start, emit 'zone'. Title mode: zone 0, no enemies near start, Feza idles.
GAME.update(dt)                  one simulation step (only when state==='play' and not paused; UI calls it)
GAME.titleUpdate(dt)             Feza idle animation for the title screen
GAME.input = { down(sx,sy) → 'enemy'|'object'|'move', move(sx,sy), up(), key(x,z) (keyboard vector, camera-relative),
               attack(), cast(i), potion() }
   Controls (5-year-old!): finger down on the ground → Feza runs toward the point under the finger, continuously while held
   (recompute groundFromScreen every frame since the camera moves); release → he finishes walking to the last point.
   Tap on an enemy (screen distance ≤ ~70 px from its projected centre) → walk to it and keep attacking it until it's happy.
   Tap chest/NPC/breakable → walk there and interact. **Auto-attack**: when not being dragged and an enemy is within ~2 m,
   Feza faces it and swings automatically. Attack button swings at the nearest enemy (lunge a little toward it).
GAME.skills → [{def: SKILLS[i], unlocked, cd, cdMax}]   (UI draws buttons)
GAME.equip(item) · GAME.drinkPotion()
GAME.on(evt, fn) / GAME.emit(evt, data)   events for the UI:
   'zone' {index, name}, 'portal' {} (UI fades, then calls GAME.loadZone(P.zone+1)), 'levelup' {lvl}, 'skill' {index},
   'item' {item, equipped}, 'gold' {amount}, 'hurt' {amount}, 'dead' {}, 'respawn' {}, 'boss' {on, name, hp, maxHp},
   'bossHp' {frac}, 'victory' {}, 'potion' {count}, 'toast' {text}, 'checkpoint' {}
Shared helpers used by SKILLS (must exist):
GAME.enemiesNear(x, z, r) → [e]      GAME.nearestEnemy(x, z, maxR) → e|null
GAME.damage(e, amount, {kb, fromX, fromZ, crit, freeze, stun, kind, silent}) → true if it turned happy
GAME.spawnProjectile({x,y,z,vx,vz,r,dmg,owner:'feza'|'enemy',kind,life,pierce,obj,color,onHit}) → p
GAME.hitBreakables(x, z, r)          GAME.heroDamageNow() → current sword damage (with small random spread)
Rules: Feza never really dies — at 0 HP he falls asleep ("yoruldu" line), respawns at last checkpoint with full HP after ~3 s;
enemies near the death spot reset. Difficulty is LOW (a 5-year-old must progress): generous hearts (health globes) that heal
15%, potions heal 60%, regen after 4 s without damage, enemy attacks clearly telegraphed and slow projectiles.
XP needed for next level = 40 + 25*lvl + 5*lvl². On level-up: +12 max HP, +2 damage, full heal, FX + 'seviye1..3' line,
unlock skill i when lvl ≥ SKILLS[i].lvl (say its line). Base damage 8 + 2*(lvl-1) + weapon.power.
Loot: coins (instanced, magnet within 2.5 m), hearts, potions, items (beam coloured by rarity, auto-pick when walked over;
auto-equip when power > equipped power, else keep in bag; one piece per look, see GAME's DROP). Elites: item 50 %; chests: coins + item (small 60 %) (+potion);
breakables: coins sometimes. Praise lines ('ovguN') only occasionally (e.g. 3+ enemies cheered within 2 s, ≥ 25 s since last).
Boss: arena aggro → 'ejderha_giris', boss bar; attacks: fireball volley (3 slow orbs), stomp (ring telegraph), fire breath (cone
telegraph then purple flames), bite; lays 2 more eggs at 66% and 33% ('ejderha_yumurta', only if eggs appeared); at 50% 'ejderha_yarim'. Defeat → happy,
vanishes in sparkles (no pet), crystal appears ('kristal'), touching it
→ 'victory' ('son' line). Continue → new game+ (ng+1, zone 0, enemies stronger, keep level/items, 'tekrar').
Save to localStorage 'fezaKotulereKarsi.v3' ONLY when the parent presses Pause › Kaydet (parent's wish: every launch is a new game;
.v1/.v2 were the automatic saves of older builds and are ignored).
```

## SKILLS — src/08_skills.js
```
SKILLS = [   (parent decision: only these 3)
 {id:'yildiz',  ad:'Yıldız Atışı',   icon:'⭐', lvl:1, cd:4,   color:'#ffd23f', line:'yetenek_yildiz',  cast(ctx)},
 {id:'kasirga', ad:'Kasırga',        icon:'🌪️', lvl:3, cd:15,  color:'#7ee0ff', line:'yetenek_kasirga', cast(ctx)},
 {id:'meteor',  ad:'Meteor Yağmuru', icon:'☄️', lvl:5, cd:24,  color:'#ff9a3c', line:'yetenek_meteor',  cast(ctx)},
]
ctx = { P, H, target (nearest enemy within 12 m or null), aim:{x,z} (unit dir to target, else facing) }
cast returns false if it could not be used (then no cooldown). SKILLS_update(dt) advances ongoing effects (meteors, spin ticks, …).
SKILLS_clear() on zone change.
yildiz: 3 spinning glowing stars in a ±0.22 rad fan (spawned 0.3 m apart), speed 15, dmg 0.5×sword+2, pierce 1. cast anim.
kasirga: P.spin = 2.2 s; every 0.22 s hit all within 2.6 m (0.6×sword), small knockback, whirling wind ring FX.
meteor: 8 rainbow "star-stone" meteors over 1.8 s around the target cluster; each shows a telegraph ring 0.6 s, then falls
        diagonally with a trail and explodes (r 2.2, 2×sword, knockback, shake).
```

## UI — src/09_ui.js + src/ui.css
Owns DOM (creates all its markup via JS), input → GAME.input, camera (cameraFollow on Feza; title: slow orbit with CAM.yaw),
minimap, menus, main loop and `boot()` (runs on load: `TEX.init(); FX.init(); GAME.init(); GAME.loadZone(0,{title:true})`,
hide #loading, show title). Main loop: dt clamp 0.05, TIME.t/u, GAME.update or titleUpdate, LEVEL.update, FX.update,
cameraFollow, lightsFollow, AUD.setListener, HUD refresh, perfTick, renderFrame().
HUD (landscape iPad 1180×820 and portrait 820×1180, safe areas): top-left portrait (FEZA.portrait) with level badge, XP bar,
gold; top-right round minimap (fog of war reveal, player arrow, portal, chests, checkpoint, NPC, enemies as red dots) + small
buttons 🎒 (bag/wardrobe), 🎵 music, ⏸ pause; bottom-left big red health orb (liquid with wave + gloss, ornate gold rim) and a
potion button with count; bottom-right: big sword attack button + skill buttons on an arc (locked ones hidden, new one pulses,
cooldown shown as a dark conic sweep); subtitles bottom-centre; centre banners (level up, new skill, zone name);
item card popup (thumbnail, name in rarity colour, ★ power); boss bar top-centre. Title screen: big "FEZA / Huysuzlara Karşı"
logo over the live 3D scene, "▶ Oyna" (+ "Devam Et" if a save exists). Pause menu (Devam / Ses / Müzik / Kaydet / Baştan Başla with
confirm). Bag/wardrobe: rows per slot with thumbnails, tap to wear (kids love dressing up), current one highlighted.
Victory screen with confetti + "Tekrar Oyna". All buttons big (≥ 72 px), rounded, glossy, colourful, readable fonts
("Avenir Next Rounded", "Avenir Next", system-ui; weight 800–900). Every touch target uses pointer events, touch-action none.
`?sessiz` → AUD never unlocks. `?ikon` → hide all UI, show Feza hero pose close-up for icon screenshots.
```


## Travelling merchant (chapters 2, 4, 6)

`LEVEL.generate` reserves `L.merchant={x,z}` in the start room of kefir/yanardag/kale before decorations and reachability repair.
`EMODEL.merchant()` returns a merged moon-cat/stall model with `root` and `anim(dt)`; LEVEL owns its disposal.
A 3.4-unit sanctuary blocks incoming damage and player attacks/casts; enemies cannot target its occupant or move into the stall perimeter.
`GAME.merchantNear()`, `merchantInfo()`, `merchantWard()`, `visitMerchant()`, `buyMerchant(id)` expose the shop.
Offer IDs: potion, ward, weapon, offhand (hybrid only). UI pauses in `merchant` menu; proximity is rechecked on purchase.
`P.shopStock` is keyed by `ng:zoneId`, with potion/ward/polish counters capped at 3/1/2. `P.shopWard={zone,ng}` reduces final incoming damage by 8%, before rounding; expires on changing zones.
Item primitives `polish` (0–2), `polishBase` preserve per-item improvements: +max(1,round(originalPower*.12)). Both hybrid hands share the zone's 2 purchases.
Prices for the three zones: potion 45/75/110, ward 100/170/240, polish 130/220/320; multiply by 1+ng*.35 and round.
Snapshots retain sanitized stock/ward/item fields; old saves default to no purchases. Fresh games reset purchases; NG+ gets new stock keys. Manual save only.
Events: merchant opens UI, purchase carries `{name,price}`, gold carries negative amount. Audio: tuccar_merhaba, tuccar_iksir, tuccar_bulut, tuccar_parilti.


## Repeat-adventure difficulty reference

First adventure (`P.ng===0`) retains its existing Normal/Zor formulas. `newGame({plus:true})` captures `P.roundPower={ng,damage,magic,health}` after recalculating player stats and before spawning zone 0. Health is effective HP: maxHp/(1-armor/100), excluding transient shields/merchant ward.
The reference is saved, validated and restored; old NG saves infer it once from current gear/level minus the current chapter's expected progression. Fresh starts clear it. Gear, level-ups, zone transitions, death and difficulty toggles never recapture it.
`DIFF.repeat` supplies zone health references 140/185/250/310/370/440. Expected damage grows by half the difference between each zone's usual damage and zone 0; health grows by .35 of its corresponding difference.
NG mob HP uses max(1,expectedDamage/usualZoneDamage) times pressure; outgoing damage uses max(1,expectedHealth/usualZoneHealth) times pressure. Pressure is 1+.06*min(ng,5). These replace the old NG multipliers, not stack on top.
NG boss HP is per*max(lo,expectedDamage)*pressure, without the first-run cap or live equipment scaling. The dragon retains its hybrid-wand correction. Summoned enemies/whelps use the same frozen reference.
Cooldowns shorten 6% on NG1, then 1.5% per round up to 12%; telegraph duration is unchanged. Movement bonus caps at 12%. Normal/Zor multipliers remain separate and live-switchable.
- Incoming damage (5 October 2026): DIFF.damageTaken is normal2.6 / hard4.5 relative to each mode's previous damage.
  hurtPlayer applies it exactly once, before armour, merchant ward and the final rounding (same as feza-huysuzlara-karsi).
