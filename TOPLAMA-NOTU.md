# Çiftlik-oyunu — Toplama ve Düzen Notu

Tarih: 26.10.2026

Yeşil Vadi Çiftliği projesine ait dosyalar tek klasörde toplandı:

```
/storage/emulated/0/Çiftlik-oyunu/
```

## Klasör düzeni

- `GreenValleyFarm.apk` — kurulabilir APK (v2.1.0, versionCode 3)
- `GreenValleyFarm-2.1.0.apk` — sürüm adlı APK kopyası
- `GreenValleyFarm.html` — tek dosyalık çevrimdışı sürüm
- `OKUBENI.md` — kullanım ve yeniden derleme kılavuzu
- `index.html`, `styles.css`, `app.js`, `manifest.webmanifest` — web/PWA çıktısı
- `src/` — web arayüzünün parçalı kaynakları
- `assets/` — yazı tipi ve PWA ikonları
- `build.py` — web ve tek dosya derleyicisi
- `SUNUCU_BASLAT.sh` — yerel sunucu kısayolu
- `android/` — Android Studio/Gradle APK projesi (kaynak, manifest, bildirim kodu ve derleme çıktıları)
- `arsiv/` — eski arayüz, QA testleri ve önceki cihaz test arşivi

## Taşınan eski konumlar

Aşağıdaki konumlar boşaltıldı; içerikleri bu klasöre taşındı:

- `/data/data/com.termux/files/home/green_valley_farm/` → web kaynağı
- `/data/data/com.termux/files/home/green_valley_farm_android/` → `android/`
- `/storage/emulated/0/green_valley_farm/` → web/PWA çıktısı
- `/storage/emulated/0/GreenValleyFarm.apk`
- `/storage/emulated/0/GreenValleyFarm-2.1.0.apk`
- `/storage/emulated/0/GreenValleyFarm.html`
- `/storage/emulated/0/GreenValleyFarm-OKUBENI.md`
- `~/devmode/apk/`, `~/devmode/game/`, GVF test ekran görüntüleri, LevelDB araçları ve kayıtları → `arsiv/devmode-gvf/`
- Web QA dosyaları ve eski UI kaynakları → `arsiv/qa/`, `arsiv/src_v1_ui/`

Telefon bağlantısı, duvar kağıdı ve uygulama kurulum paketleri gibi oyun dışı `devmode` dosyaları yerinde bırakıldı.

## Doğrulama

- APK paketi: `com.greenvalley.farm`
- Sürüm: `2.1.0` / versionCode `3`
- İzinler: yalnızca `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`; internet izni yok.
- APK, önceki v2.0 sürümüyle aynı debug anahtarıyla imzalandı.
- Tek dosyalık HTML otomatik testi: **SELFTEST PASS 34/34**
- APK SHA-256: `cd01d4347cece145b05819a96987192f72f460077e0029271df5d439bf4a068d`
- HTML SHA-256: `52698027eed028d8165ebd204520343cc31c8fc13ec002d91e188301e5eef7f1`

Kurulum ve derleme ayrıntıları için `OKUBENI.md` dosyasına bakın.
