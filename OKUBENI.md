# Yeşil Vadi Çiftliği — Türkçe Çiftlik Tycoon

Green Valley Farm çizim dilinden esinlenen, **tamamen Türkçe ve gerçekten oynanabilir** bir çiftlik tycoon oyunu. Tüm arayüz, ürünler, görevler, bildirimler ve hata mesajları Türkçedir.

Oyun; tarla ekme/sulama/hasat, hayvan besleme, pazar, siparişler, yükseltmeler, hava durumu, mevsimler, görevler, başarımlar, gerçek takvim gününe bağlı günlük ödüller, **fabrikalar**, kayıt ve çevrimdışı ilerleme içerir. HTML + CSS + JavaScript ve tamamen özgün inline SVG çizimlerle yapıldı; internet gerektirmez.

## Yenilikler — v2.1

- **Akıcılık:** Gereksiz DOM yazımları önbelleğe alındı, ekran dışı animasyonlar duraklatıldı, harita katmanı yalnızca gerçekten değişince yeniden çiziliyor. İstenen tüm animasyonlar ve görsel kalite korundu.
- **Yeni üst çubuk:** Profil adı ve bildirim zili en üstte. Eski gün/hava metni, çentik ve üst para göstergesi kaldırıldı.
- **Gün kutusu:** Güncel oyun günü, sıcaklığın hemen altında gösteriliyor.
- **İlk giriş profili:** Oyuncu ve çiftlik adı ilk açılışta seçilir; Profil ekranından düzenlenebilir.
- **Gerçek günlük ödül:** Ödül oyun gününe göre değil, **gerçek takvim gününe** göre günde bir kez alınır.
- **Doğru Çiftlik sekmesi:** Alt çubuktan Çiftlik'e basıldığında ekran her zaman genel bakışa döner.
- **Gerçek zaman:** **1 gerçek dakika = 5 oyun dakikası.** Uygulama arka plandayken oyun durmaz; geri dönünce zaman farkı hesaplanır.
- **Hektar yükseltmeleri:** Domates, sebze ve mısır tarlaları her seviyede gerçekten büyür. Başlangıç toplamı **12,5 ha**, 5. seviyede **31,5 ha** olur ve hasat verimine yansır.
- **Hareketli hayvanlar:** Ahır kartlarında, kategori görsellerinde ve haritadaki hayvanlarda görünür nefes/oynama animasyonu.
- **Yeni görseller:** Her bölge yükseltmesinde haritaya yeni yapılar, çitler, seralar, traktörler, tanklar ve süslemeler eklenir.
- **Sakin harita:** Tarladan çiftlik haritasına geçerken sağa sola giden yuvarlak uyarılar kaldırıldı; uyarı işaretleri sabit.
- **Fabrikalar:** Alt çubukta **Fabrikalar** alanı; 4 fabrika, 26 işlenmiş ürün ve çok sayıda tarif.
- **Telefon bildirimleri:** Hasat, besleme, fabrika, sipariş ve düşük stok için Android bildirimleri. APK kapalıyken de AlarmManager ile hatırlatır; yeniden başlatmada plan geri yüklenir.

## Hızlı kurulum — APK

Telefonda dosya yöneticisinden şu dosyaya dokun:

```
/storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.apk
```

Android "Bilinmeyen uygulamaları yükle" izni isterse, dosyayı açtığın uygulama için izni ver. Play Protect "bilinmeyen geliştirici" uyarısı gösterirse **Yine de yükle** seç. Kurulumdan sonra uygulama menüsünde **Yeşil Vadi Çiftliği** olarak açılır.

- Paket: `com.greenvalley.farm`
- Sürüm: `2.1.0` (versionCode 3)
- APK tamamen çevrimdışıdır; **internet izni yoktur**.
- Android 13 ve sonrasında ilk kurulumda **bildirim izni** istenir. İzin vermezsen oyun içi bildirim merkezi çalışmaya devam eder.
- Aynı paket ve debug imzasıyla derlendiği için eski sürümün üzerine güncellenebilir; kayıt genelde korunur.
- Uygulama verileri cihazda saklanır. Uygulamayı kaldırırsan kayıt da silinir.
- APK kişisel kullanım için debug anahtarıyla imzalanmıştır; Play Store'a yüklemek için ayrı bir release anahtarı gerekir.

## Tek dosya — HTML

Telefonda dosya yöneticisinden şu dosyayı Chrome ile aç:

```
/storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.html
```

veya Chrome adres çubuğuna:

```
file:///storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.html
```

Bu tek dosyada CSS, JavaScript ve Plus Jakarta Sans yazı tipi gömülüdür. İnternet, ek klasör veya sunucu gerekmez. Tarayıcı sürümünde bildirimler oyun içi bildirim merkezinde görünür; telefon tepsisine Android bildirimi göndermek için APK kullanılmalıdır.

## Web / PWA sürümü

Proje klasöründe yerel sunucu aç:

```sh
cd /storage/emulated/0/Çiftlik-oyunu
python3 -m http.server 8080
```

Chrome'da:

```
http://127.0.0.1:8080/
```

Kısa yol:

```sh
sh /storage/emulated/0/Çiftlik-oyunu/SUNUCU_BASLAT.sh
```

Manifest ve ikonlar hazırdır; Chrome menüsünden **Ana ekrana ekle** ile kısayol oluşturabilirsin. Oyunun kendisi sunucusuz da çalışır.

## Oyun nasıl oynanır?

### Zaman ve dünya

- Oyun gerçek zamanlı ilerler: **1 gerçek dakika = 5 oyun dakikası**. Bir oyun günü yaklaşık **4,8 gerçek saat** sürer.
- Üst çubukta oyuncu profili, çiftlik adı, oyun saati ve bildirim zili bulunur.
- Ana sayfadaki sıcaklık kutusunun altında **güncel gün** yazar.
- Her 7 günde mevsim değişir: İlkbahar, Yaz, Sonbahar, Kış.
- Hava durumu büyümeyi, güneş enerjisini, hayvan verimini, su tüketimini ve pazar fiyatlarını etkiler. Yarınki hava, hava durumu ekranında görünür.
- Uygulama arka plana alınsa bile çiftlik yaşamaya devam eder. Geri dönünce geçen süre en fazla **72 saat** olacak şekilde hesaplanır.

### Tarlalar ve hektarlar

- **Domates, sebze ve mısır** tarlalarına tohum ek, sula ve hasat et.
- Su ve enerji olmadan büyüme durur. Yağmur sulamaya yardım eder; sıcak hava suyu daha hızlı tüketir.
- Hasat ettiğin ürünler depoya girer; pazarda satılır veya siparişlerde teslim edilir.
- Her tarla **5 seviyeye** kadar yükseltilir. Seviye arttıkça büyüme, hasat verimi, hektar ve haritadaki görünüm değişir.
- Başlangıç alanı toplam **12,5 hektar**; tüm tarlalar 5. seviyede toplam **31,5 hektar** olur. Her yükseltme hasat miktarını da artırır.

### Hayvanlar

- 4 kategori ve başlangıçta **48 hayvan**: inekler, tavuklar, koyunlar, keçiler.
- Besleme saatleri **06:00, 12:00 ve 18:00**. Öğünü kaçırırsan sağlık ve üretim düşer.
- Yem stoğunu pazardaki **Tedarik** sekmesinden al. Ahırı yükselterek sürüyü büyüt ve üretimi artır.
- Çiftlik Evi **4. seviyede** otomatik yem açılır; her sabah üç öğünü otomatik verir (yem varsa).
- İnek, tavuk, koyun ve keçi görselleri hafifçe nefes alıp oynar; ahır canlı görünür.
- Ürünleri topla; süt, yumurta, yün ve keçi sütü pazarda satılır.

### Pazar ve siparişler

- Ürünleri güncel fiyattan sat; fiyatlar hava, mevsim ve depo seviyesine göre değişir.
- **Tedarik** sekmesinden yem, enerji ve su al.
- Her gün yenilenen **siparişleri** teslim ederek daha yüksek kazanç elde et.
- Depo dolduğunda yeni ürünler boşa gidebilir; depoyu yükseltmeyi unutma.

### Fabrikalar

Alt çubuktaki **Fabrikalar** ekranında 4 üretim tesisi vardır:

| Fabrika | Açılış | Tarif |
|---|---:|---|
| Süt Fabrikası | 4.000 ₺ | Paket süt, yoğurt, kaşar, tereyağı, ayran, dondurma |
| Dokuma Atölyesi | 6.500 ₺ | Kazak, pantolon, ayakkabı, atkı, çorap, şapka, elbise, battaniye |
| Çiftlik Fırını | 8.000 ₺ | Ekmek, pasta, börek, kurabiye, turta, mısır ekmeği |
| Konserve Atölyesi | 9.500 ₺ | Domates/mısır/sebze konservesi, turşu, ketçap, domates sosu |

- Fabrika açmak ve ek kuyruk yuvası almak para harcatır.
- Tarifler farklı hammaddeler kullanır: süt → süt ürünleri, yün → giysi, yumurta/süt → fırın ürünleri, tarla ürünleri → konserve.
- İşlenmiş ürünler pazarda daha yüksek fiyata satılır.
- Fabrika işleri oyun zamanıyla ilerler; uygulama kapalıyken de tamamlanır ve bildirim gönderilir.
- Üretim sonuçları depo kapasitesine sayılır; depo doluysa önce satış yap.

### Yükseltmeler

- 7 bölgenin tamamı yükseltilebilir: çiftlik evi, domates, sebze, mısır, hayvan alanı, su tankı ve depo.
- Her bölge 5 seviyeye kadar çıkar. Maliyet her seviyede artar; görünüm, kapasite ve verim değişir.
- Su tankı kapasiteyi, depo ürün limitini, çiftlik evi enerji kapasitesini ve otomatik yemi, ahır ise sürüyü ve üretimi geliştirir.
- Her seviyede haritaya yeni görsel öğeler eklenir: çitler, korkuluk, sera, traktör, silo, güneş paneli, bayrak ve daha büyük yapılar.

### Görevler, ödüller ve başarımlar

- Her gün 3 **günlük görev** gelir; tamamlayınca para ve XP kazanırsın.
- 7 günlük **günlük ödül serisi** vardır. Ödül, gerçek takvim gününde yalnızca bir kez alınır; oyun günü atlansa bile aynı gün ikinci kez alınamaz.
- 10 başarım açılabilir; her biri ekstra para verir. Fabrika açmak ve 10 üretim tamamlamak da başarımdır.
- Seviye atladıkça yeni rütbeler açılır: Acemi Çiftçi'den Çiftlik İmparatoru'na.

### Bildirimler

- Uygulama içi bildirim merkezi: sağ üstteki zil.
- Android bildirimleri:
  - Tarla hasada hazır olduğunda
  - Hayvan besleme saati geldiğinde
  - Fabrika üretimi tamamlandığında
  - Bekleyen siparişler için
  - Su, yem veya enerji azaldığında
  - Günlük ödül hazır olduğunda
- Bildirimler `AlarmManager` ile planlanır; uygulama kapalıyken ve cihaz yeniden başladığında plan korunur.
- Profil → **Çiftlik bildirimleri** anahtarından kapatılabilir.
- İnternet gerekmez; bildirimler tamamen cihazda oluşturulur.

### Kayıt ve çevrimdışı

- Oyun otomatik kaydedilir (yaklaşık her 9 saniyede ve önemli işlemlerde).
- Uygulamayı kapatıp geri açtığında çiftlik en fazla **72 saatlik** çevrimdışı ilerlemeyle seni karşılar.
- **Profil → Ana menü** ile oyunu duraklatabilir, **Yeni Oyun** ile sıfırlayabilirsin.
- Android yaşam döngüsü `onPause`/`onResume` ile bağlıdır; arka plandan dönüşte zaman farkı otomatik işlenir.

## İpuçları

- İlk hasadı beklemeden pazardaki mevcut ürünleri satıp su/yem alabilirsin.
- Yağmurlu havada sulama daha az su harcar; güneşli havada güneş enerjisi artar.
- Siparişler normal pazar fiyatından daha kârlıdır; stokta tut.
- Yem ve su stoğunu bitirmeden tedarik al; üretim durursa toparlamak zaman alır.
- Depo seviyesini erkenden yükselt; hasatlar boşa gitmesin.
- Fabrika açmadan önce hammadde stokunu ve depo alanını hazırla.
- Her gün oyuna dön: görevler, gerçek günlük ödül ve hava değişimi taze ilerleme sağlar.

## Geliştirici / test modları

Bunlar isteğe bağlıdır; normal oyunda URL'ye ekleme.

| Parametre | İşlev |
|---|---|
| `?static=1` | Saati ve animasyonları dondurur (ekran görüntüsü/test). |
| `?play=1` | Ana menüyü atlayıp doğrudan oyuna girer. |
| `?newgame=1` | Kaydı sıfırlayıp yeni oyun başlatır. |
| `?start=1` | Ana menüyü zorla gösterir. |
| `?sim=60` | Açılışta 60 oyun dakikası ilerletir. |
| `?t=1320` | Saati 23:00'e ayarlar (gece görünümü). |
| `?tab=supply` | Pazarı Tedarik sekmesinde açar. |
| `?cat=chickens` | Hayvanlar ekranında tavukları seçer. |
| `?sheet=weather` | Hava durumu penceresini açar. |
| `?selftest=1` | 34 maddelik otomatik oyun testini çalıştırır. |

Örnek:

```
file:///storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.html?static=1&sim=60#farm
```

## Dosyalar

### Teslim dosyaları

- `/storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.apk` — kurulabilir APK
- `/storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm-2.1.0.apk` — sürüm adlı APK kopyası
- `/storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.html` — tek dosyalık çevrimdışı sürüm
- `/storage/emulated/0/Çiftlik-oyunu/OKUBENI.md` — bu belge
- `/storage/emulated/0/Çiftlik-oyunu/` — web/PWA sürümü ve proje kopyası

### Proje kaynağı

- `/storage/emulated/0/Çiftlik-oyunu/`
  - `index.html`, `styles.css`, `app.js` — web sürümü
  - `GreenValleyFarm.html` — tek dosyalık sürüm
  - `build.py` — web ve tek dosya derleyicisi
  - `src/` — parçalara ayrılmış HTML/CSS/JS kaynakları
  - `assets/` — yazı tipi ve PWA ikonları
  - `manifest.webmanifest` — PWA manifesti
  - `SUNUCU_BASLAT.sh` — yerel sunucu kısayolu
  - `arsiv/` — eski arayüz, QA testleri ve cihaz/devmode arşivi
  - `TOPLAMA-NOTU.md` — taşıma ve dosya düzeni notu
- `/storage/emulated/0/Çiftlik-oyunu/android/` — APK projesi
  - `app/src/main/assets/GreenValleyFarm.html` — APK'nın yüklediği oyun
  - `app/src/main/java/com/greenvalley/farm/MainActivity.kt` — WebView, köprü ve yaşam döngüsü
  - `app/src/main/java/com/greenvalley/farm/FarmNotifications.kt` — Android bildirim planı
  - `app/src/main/AndroidManifest.xml` — bildirim ve önyükleme izinleri
  - `app/build.gradle.kts` — sürüm ve imza ayarları

## Yeniden derleme

Web ve tek dosya:

```sh
cd /storage/emulated/0/Çiftlik-oyunu
python3 build.py
```

Bu komut `index.html`, `styles.css`, `app.js` ve `GreenValleyFarm.html` dosyalarını `src/` parçalarından yeniden üretir. `GreenValleyFarm.html` dosyasını doğrudan düzenlemeyin; kaynak `src/` altındadır.

APK:

```sh
cp /storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.html \
   /storage/emulated/0/Çiftlik-oyunu/android/app/src/main/assets/GreenValleyFarm.html

cd /storage/emulated/0/Çiftlik-oyunu/android
sh gradlew assembleRelease --no-daemon

cp app/build/outputs/apk/release/app-release.apk /storage/emulated/0/Çiftlik-oyunu/GreenValleyFarm.apk
```

Sürüm artırmak için `app/build.gradle.kts` içindeki `versionCode` ve `versionName` alanlarını, uygulama adı için `app/src/main/res/values/strings.xml` dosyasını güncelle.

## Teknik notlar

- Android: minSdk 24, targetSdk 35, portre, tam ekran WebView; internet izni yok.
- Bildirimler: `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`; kanal `green_valley_farm_events`.
- APK release derlemesi debug anahtarıyla imzalanır; kişisel kurulum içindir.
- Oyun durumu `localStorage` üzerinde tutulur; sunucu/hesap gerekmez.
- Tüm görseller özgün inline SVG'dir; reel videosundan kare kullanılmadı.
- Yazı tipi: Plus Jakarta Sans (değişken ağırlık), dosyaya gömülü.
- Oyun motoru: saf JavaScript; harici kütüphane veya CDN yok.

## Sürüm geçmişi

- **2.1.0** — Akıcılık iyileştirmeleri; yeni üst çubuk ve gün kutusu; ilk giriş profil/çiftlik adı; gerçek takvim günlük ödülü; 5× zaman ve arka plan devamı; hektar yükseltmeleri; hareketli hayvanlar; seviye başına yeni harita görselleri; sabit harita uyarıları; 4 fabrika ve 26 işlenmiş ürün; Android bildirimleri; 34 otomatik test.
- **2.0.0** — Tam Türkçe tycoon oyunu: gerçek zaman, hava/mevsim, tarla, hayvan besleme, pazar/sipariş, 7 bölge yükseltmesi, görsel seviye katmanları, görevler, günlük ödül, başarımlar, bildirimler, kayıt/çevrimdışı ilerleme, animasyonlu ana menü, yeni APK.
- **1.0.0** — Reel'den esinlenen statik arayüz ve ilk APK.
