# Merhametin Öldüğü Yer — çalışma notları

Bu klasör yetişkinlere yönelik ayrı oyundur; kullanıcı açıkça karanlık ve merhametsiz masal istemiştir. Temel oyun Feza ve Bilbo Huysuzlara Karşı v49, motor klasik script/Three.js. `src/SPEC.md` teknik sözleşmeleri geçerlidir.

Orijinal çocuk oyununa dokunma. Yeni kaydı `fezaBilboMerhamet.save.v1`, ayarı `fezaBilboMerhamet.ayar.v1`, çevrimdışı kopyası `feza-bilbo-merhamet-` önekiyle ayrıdır. Çizim motoru/gölge kalitesi ve mevcut basit çizgi film dili korunur. Kullanıcının son isteği: mekânlar karanlık, ancak rahat görünür olsun; ortam ışığı ve yüzey tonları okunurluk için ölçülü ayarlanabilir. Yeteneklerde koyu mor ve vampirvari kan/kemik tonları baskın olsun.

Testleri daima `?sessiz` ile aç. Ses anlatımları `src/02_audio.js` JSON bloğundadır; `gen_voice.py` Emel kayıtlarını üretir, ffmpeg kırpar. `.voice-tools` yayımlanmaz.

GitHub'a yalnız kullanıcı yükle/GitHub'a gönder derse gönder; ayrı depo `goktugkarpat/feza-bilbo-merhametin-oldugu-yer`, doğrudan main. PR açma. `yayinla.command` kullanıcı için hazırdır.
