// İnternetsiz çalışma: ilk açılıştan sonra oyun (kod, 3D kütüphanesi, gömülü sesler) cihazda saklanır.
// Dosya eklenirse CORE listesine ekle; önemli değişiklikte CACHE sürümünü artır.
const CACHE = 'feza-bilbo-merhamet-v10-zorluk';
const SRC = ['00_core', '01_textures', '02_audio', '03_fx', '04_feza', '04_bilbo', '04_bilbo_follow', '05_enemies', '06_level', '07_game', '08_skills', '09_ui'];
const CORE = ['./', './index.html', './vendor/three.js', './sesler.js', './bilbo-ses.js', './assets/audio/bilbo-hav-hav.mp3', './manifest.webmanifest', './src/ui.css', './icons/icon.svg', './assets/audio/CREDITS.md', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  ...SRC.map(n => './src/' + n + '.js')];
const ICONS = ['./icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];   // optional: a missing icon must not stop the install
const FRESH = /(\/|index\.html)$/;   // giriş önce ağ, diğer dosyalar önce önbellek

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  await c.addAll(CORE);
  for (const u of ICONS) { try { await c.add(u); } catch (e) {} }
  self.skipWaiting();
})()));
self.addEventListener('activate', e => e.waitUntil((async () => {
  // Bu oyun sadece kendi kopyalarını temizler; diger oyunlar korunur.
  // (goktugkarpat.github.io) and have their own caches.
  const OWN = k => k.startsWith('feza-bilbo-merhamet-');
  for (const k of await caches.keys()) if (OWN(k) && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || FRESH.test(url.pathname);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './index.html' : req;
    if (fresh) {
      try { const r = await fetch(req, { cache: 'no-cache' }); if (r.ok) c.put(key, r.clone()); return r; }
      catch (err) { return (await c.match(key, { ignoreSearch: true })) || (await c.match('./index.html')) || Response.error(); }
    }
    const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit;
    const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r;
  })());
});
