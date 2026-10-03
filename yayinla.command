#!/bin/bash
# Çift tıkla: bu klasördeki tüm değişiklikleri GitHub'a gönderir (ilk seferde depoyu da oluşturur).
cd "$(dirname "$0")" || exit 1
if [ ! -d .git ]; then
  git init -q -b main
  git config user.name "goktugkarpat"
  git config user.email "goktugkarpat@users.noreply.github.com"
fi
git add -A
if git diff --cached --quiet; then
  echo "Yeni değişiklik yok."
else
  git commit -q -m "Güncelleme: $(date '+%Y-%m-%d %H:%M')" && echo "Değişiklikler kaydedildi."
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo create goktugkarpat/feza-bilbo-merhametin-oldugu-yer --public --source . --remote origin --push; then
    gh api -X POST repos/goktugkarpat/feza-bilbo-merhametin-oldugu-yer/pages -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1
    echo "Tamam! Oyun GitHub'a yüklendi: https://goktugkarpat.github.io/feza-bilbo-merhametin-oldugu-yer/"
    echo "(İlk yayın birkaç dakika sürebilir.)"
  else
    echo "Gönderilemedi. İnternet bağlantısını ve 'gh auth login' girişini kontrol edin."
  fi
elif git push -q -u origin main; then
  echo "Tamam! GitHub güncellendi. ⚔️"
else
  echo "Gönderilemedi. İnternet bağlantısını ve 'gh auth login' girişini kontrol edin."
fi
sleep 4
