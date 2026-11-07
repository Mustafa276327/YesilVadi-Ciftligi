#!/data/data/com.termux/files/usr/bin/sh
# Yeşil Vadi Çiftliği — yerel önizleme sunucusu
cd "$(dirname "$0")" || exit 1
echo ""
echo "  Yeşil Vadi Çiftliği"
echo "  Chrome'da aç: http://127.0.0.1:8080"
echo "  Durdurmak için: Ctrl+C"
echo ""
python3 -m http.server 8080
