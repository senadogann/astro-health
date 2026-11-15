# AstroSelf — Teknik Belge

Takım için: uygulamanın nasıl kurulduğu, her parçanın ne yaptığı, hangi verinin nereden geldiği ve nelerin
sınırlı olduğu. Durum: `main` ve `yeni-tasarim` branch'leri aynı commit'te (`9f8ec20`), canlı sürüm
https://senadogann.github.io/astro-health/ adresinde.

---

## 1. Kısa özet

| | |
|---|---|
| Tür | Web uygulaması + PWA (kurulabilir, internetsiz çalışır) |
| Dil | Düz HTML, CSS, JavaScript (ES modülleri). Derleme adımı yok |
| Sunucu | Yok. GitHub Pages statik dosya sunar; arka uç, hesap, bulut veritabanı yok |
| Veri saklama | Tarayıcının içinde: IndexedDB (yedek olarak localStorage) |
| Kütüphaneler | Three.js r160 (3D), Chart.js 4.4.1 (grafik), meshoptimizer çözücü — hepsi `vendor/` içinde, CDN'e bağımlı değil |
| 3D modeller | Z-Anatomy (CC BY-SA 4.0), 5 katman, toplam 15,6 MB |
| Diller | İngilizce ve Türkçe, 313 metin anahtarı |
| Kod hacmi | 19 JS modülü (2.941 satır), 542 satır CSS, 9 JSON veri dosyası |

---

## 2. Mimari

```
index.html ── importmap ("three" → vendor/three.module.min.js)
   │
   └─ js/app.js  (giriş noktası: durum, ekranlar, tıklamalar)
        ├─ store.js + database.js   kullanıcı durumu ve girişleri (IndexedDB)
        ├─ i18n.js                  TR/EN metinler (data/i18n.json)
        ├─ crew.js + demo.js        simüle mürettebat ve senaryolar
        ├─ rules.js                 değerlendirme motoru  ← data/references.json
        ├─ outlook.js               30 günlük risk görünümü
        ├─ body3d.js / body.js      3D vücut (ayrıntılı / basit yedek)
        ├─ panel.js + charts.js     organ paneli ve grafikler ← data/content.json, sources.json
        ├─ i4.js                    Inspiration4 karşılaştırması ← data/i4_blood.json
        ├─ spaceweather.js          canlı NOAA/NASA uzay havası
        ├─ emergency.js             acil durum modu ← data/emergency.json
        ├─ checkin.js, routine.js, report.js, ui.js
sw.js ── service worker: bütün dosyaları önbelleğe alır, internet yokken oradan sunar
```

**Veri akışı (her ekran yenilemesinde):**

1. `currentEntries()` günlük kayıtları seçer: demo modunda seçili astronotun simüle verisi, değilse kullanıcının kendi girişleri.
2. Zaman kaydırıcısı açıksa yalnızca seçili güne kadarki kayıtlar alınır; demo senaryosu seçiliyse bu kayıtların son günlerine uygulanır.
3. `evaluate()` (rules.js) her gösterge ve her organ sistemi için durum üretir.
4. `computeOutlook()` (outlook.js) aynı kayıtlardan 30 günlük tahmin üretir.
5. Kartlar, 3D vücut, organ paneli, rapor ve mürettebat ekranı bu sonuçlardan çizilir.

Durum tek bir nesnede (`state`, store.js) tutulur; değişince `setState()` kaydeder ve ekranı yeniden çizer.
Kaydırıcının günü (`viewDay`) bilinçli olarak kaydedilmez, sayfa açılınca hep son gün gösterilir.

---

## 3. Dosyalar ve görevleri

| Dosya | Görev |
|---|---|
| `index.html` | Sayfa iskeleti: üst çubuk, sekmeler, zaman kaydırıcısı, ekranlar, acil durum katmanı |
| `css/style.css` | Koyu "mission control" teması, telefon düzeni, yazdırma stili |
| `js/app.js` | Giriş noktası. Ekran çizimi, kartlar, mürettebat ekranı, kaydırıcı, Demo menüsü, tıklama yönetimi |
| `js/rules.js` | Değerlendirme motoru: kişisel referans, z-skoru, eşikler, radyasyon, kemik, sistem eşlemesi |
| `js/outlook.js` | 30 günlük risk görünümü: gidişat doğrusu, birikimli yükler, NASA HRP riskleri |
| `js/crew.js` | 4 kişilik kurgusal mürettebatın 180 günlük simüle verisi |
| `js/demo.js` | Üç "ya olursa" senaryosu (güneş fırtınası, uyku kaybı, sıvı kayması) |
| `js/body3d.js` | Ayrıntılı 3D anatomi: GLB yükleme, katmanlar, renkler, seçim, dış çizgi |
| `js/body.js` | Basit 3D figür (kodla çizilmiş yedek model) |
| `js/panel.js` | Organ paneli: işlev, 5 tehlike, güncel değerler, grafikler, rehber, kaynaklar |
| `js/charts.js` | Chart.js trend grafikleri |
| `js/i4.js` | Inspiration4 kan değeri karşılaştırması |
| `js/spaceweather.js` | NOAA proton akısı + NASA DONKI, çevrimdışı yedekler |
| `js/emergency.js` | Acil durum listeleri, Dünya cevap sayacı, uçuş doktoru raporu |
| `js/checkin.js` | Günlük kontrol formu |
| `js/deviceimport.js` | Cihaz dosyasını (CSV/JSON) okur, sütunları tanır, birimleri dönüştürür |
| `js/routine.js` | Hatırlatıcılar, seri, rozetler |
| `js/report.js` | Yazdırılabilir tek sayfalık rapor |
| `js/store.js`, `js/database.js` | Durum ve kalıcı saklama (IndexedDB) |
| `js/i18n.js`, `js/ui.js` | Çeviri yardımcıları; gösterge metinleri (değer, neden, seviye) |
| `sw.js`, `manifest.webmanifest` | Çevrimdışı çalışma ve kurulabilirlik |
| `data/*.json` | Bütün metinler, eşikler, kaynaklar ve gömülü gerçek veri |
| `tools/build_i4.py` | NASA OSDR CSV'lerinden `i4_blood.json` üretir |
| `tools/check.py` | Çeviri anahtarlarını ve çevrimdışı dosya listesini denetler |

---

## 4. Değerlendirme motoru (`js/rules.js`)

### 4.1 Üç katman

1. **Kişisel referans:** İlk 7–14 günün ortalaması ve standart sapması. Bugünkü değerin bu ortalamadan uzaklığı z-skoru olarak hesaplanır. Çok düzgün bir referansın küçük oynamaları alarma çevirmemesi için her göstergenin bir alt standart sapma sınırı vardır (`sdFloor`, ör. nabız 5 bpm).
2. **Dünya referansı:** Genel yetişkin klinik aralıkları (prototip için sadeleştirilmiş, *temsili* işaretli).
3. **NASA kaynaklı kurallar:** Radyasyon dozu (600 mSv kariyer limiti) ve kemik kaybı (ayda %1–1,5).

### 4.2 Eşikler (`data/references.json`)

| Gösterge | Yeşil | Sarı | Yön | Etiket |
|---|---|---|---|---|
| Nabız | 50–100 bpm | 40–120 | iki yön | Dünya referansı |
| Sistolik | 90–129 mmHg | 80–159 | iki yön | Dünya referansı |
| Diastolik | 60–84 mmHg | 50–99 | iki yön | Dünya referansı |
| Vücut sıcaklığı | 36,1–37,5 °C | 35,0–38,4 | iki yön | Dünya referansı |
| Kan şekeri | 70–99 mg/dL | 54–179 | iki yön | Dünya referansı |
| Uyku süresi | ≥ 7 sa | ≥ 5 | düşük kötü | Dünya referansı |
| Uyku kalitesi | ≥ 5/7 | ≥ 3 | düşük kötü | temsili |
| Ruh hâli | ≥ 3/5 | ≥ 2 | düşük kötü | temsili |
| Görme değişikliği | 0 | 1 | yüksek kötü | temsili |

Sarı aralığın dışı kırmızıdır.

### 4.3 Seviye kuralı

- **Normal (yeşil):** referans içinde ve kişisel normalden 2σ'dan az sapma.
- **İzle (sarı):** kişisel normalden ≥ 2σ sapma ya da Dünya referansının sarı bölgesi.
- **Dikkat (sarı, güçlü):** ≥ 3σ sapma ya da hem sarı bölge hem ≥ 2σ.
- **Doktora bildir (kırmızı):** değer kırmızı bölgede, ya da ≥ 3σ sapma ve değer yeşil aralığın dışında.
  **Kişisel normalden sapma tek başına kırmızı yapmaz.**
- **Ruh hâli istisnası:** tek günlük düşük değer (1–2) en fazla "İzle". Kırmızı için takvimde art arda en az 3 düşük gün gerekir; kartta "3 gündür düşük" yazar.

Kartlarda sigma yazmaz; "Normalinizden belirgin yüksek (61 → 82 bpm)" gibi sade cümle çıkar. Sigma yalnızca organ panelinde küçük bir notta görünür.

### 4.4 Radyasyon ve kemik

- **Günlük doz:** seçilen ortamın doz hızı (simüle veride kayıt başına `dose`). ≥ 5 mSv/gün sarı, ≥ 25 kırmızı (*temsili*).
- **Görev toplamı:** günlük dozların toplamı; 600 mSv kariyer limitinin %50'si sarı, %80'i kırmızı (yüzdeler *temsili*, limit NASA-STD-3001).
- **Kemik kaybı:** görev günü × ayda %1–1,5 (HRP). %5 sarı, %10 kırmızı (*temsili*).

### 4.5 Organ sistemleri

| Sistem | Göstergeler |
|---|---|
| Kalp-damar | nabız, sistolik, diastolik |
| Akciğer | vücut sıcaklığı |
| Beyin (uyku, ruh hâli) | uyku süresi, uyku kalitesi, ruh hâli |
| Kemik-kas | kemik kaybı modeli |
| Göz (SANS) | görme değişikliği |
| Kan, bağışıklık, metabolizma | kan şekeri, vücut sıcaklığı, radyasyon |

Sistemin rengi en kötü göstergesinin rengidir.

---

## 5. 30 günlük risk görünümü (`js/outlook.js`)

- **Gidişat:** Son 14 güne Theil–Sen doğrusu uydurulur (bütün gün çiftleri arasındaki eğimlerin medyanı). Tek bir olağan dışı gün sahte gidişat üretmez.
- **Gürültü filtresi:** Gidişatın 14 gündeki toplam etkisi o göstergenin `sdFloor` değerinden küçükse "sabit" sayılır.
- **Uzatma:** Doğru 30 gün ileri uzatılır, ama bir gidişatın en fazla gözlendiği süre kadar devam edeceği varsayılır; değer kırmızıya girdiği günde durur.
- **Birikimli yükler:** radyasyon (30 gün sonraki toplam), uyku borcu (gecelik 7 saatin altında kalan saatler), egzersiz (son 7 günde 20 dk ve üzeri seans sayısı, hedef 3 — OCHMO), kemik kaybı (ayda %1–1,5), görme bildirimleri.
- **Çıktı:** 7 NASA HRP riski için Düşük / Orta / Yüksek; 3D vücutta "+30 gün" görünümü.
- En az 5 günlük veri gerekir. Not: "Trend-based early warning, not a diagnosis."

---

## 6. Veri kaynakları ve etiketler

| Veri | Tür | Nasıl geliyor |
|---|---|---|
| Inspiration4 kan değerleri (9 analit, 7 zaman noktası, kişi başı uçuş öncesi ortalama) | Gerçek NASA verisi | NASA OSDR OSD-575 / OSD-569 CSV'leri `tools/build_i4.py` ile `data/i4_blood.json`'a gömülü |
| ≥10 MeV proton akısı | Gerçek NOAA verisi, canlı | NOAA SWPC GOES JSON, 5 dakikada bir |
| Güneş parçacık olayları (30 gün) ve patlamalar (7 gün) | Gerçek NASA verisi, canlı | NASA DONKI (CCMC) API |
| Eşikler ve limitler | NASA kaynaklı / Dünya referansı / temsili | `data/references.json`, kaynaklar `data/sources.json` (19 kaynak) |
| Mürettebat verisi ve senaryolar | Simüle | `js/crew.js`, `js/demo.js` |
| Kullanıcı girişleri | Kendi girişi | Günlük kontrol formu |
| Cihaz dosyasından gelen değerler | Cihaz | Astronotun seçtiği dosya (`js/deviceimport.js`) |
| Örnek bileklik dosyası | Simüle | `assets/samples/sample-wearable-export.csv` |
| Öz bakım adımları, bildirim ölçütleri, acil durum listeleri | Temsili | Takım yazdı; resmi NASA prosedürü değil |

**Uzay havası yedekleri:** canlı veri → cihazda son kaydedilen veri → repodaki `data/swpc_snapshot.json`. Kart hangisinin gösterildiğini yazar. Akı ≥ 10 pfu (NOAA S1) olunca kırmızı "sığınağa geçin" uyarısı çıkar; ≥ 1 pfu sarıdır (*temsili*). DONKI tek istekte en fazla 60 gün kabul eder.

**Ortamlar:**

| Ortam | Doz hızı (mSv/gün) | Gidiş-dönüş gecikmesi | Kaynak |
|---|---|---|---|
| ISS | ~0,5 | yok | NASA LSAH Newsletter 2023 |
| Orion (Ay transferi) | 0,96–1,24 | ≈ 2,6 sn | George vd., Nature 634, 48 (2024) |
| Ay üssü | ~1,37 | ≈ 2,6 sn | Zhang vd., Science Advances 6, eaaz1334 (2020) |
| Mars transferi | 1,84 ± 0,30 | 44 dk'ya kadar | Hassler vd., Science 2014 |
| Mars üssü | 0,64 ± 0,12 | 6–44 dk | Hassler vd., Science 2014 |

---

## 7. Simüle mürettebat ve zaman kaydırıcısı

### 7.1 Üretim (`js/crew.js`)

- 4 kurgusal astronot × 180 gün; 180. gün bugündür. Sabit tohumlu rastgele sayı üreteci kullanılır, veri her cihazda aynıdır.
- **NASA kaynaklı parametreler:** uyku ortalaması 6,09 sa, en fazla 8,5 sa (Barger 2014); kan şekeri referansı gerçek bir I4 mürettebatının uçuş öncesi ortalaması (77,3 / 73,0 / 71,3 / 79,7 mg/dL); günlük doz ortamın doz hızı; 4 kişiden 3'ünde görme değişikliği (HRP SANS: ~%70); haftada 6 egzersiz seansı (OCHMO: en az 3×20 dk).
- **Uyku ortalaması tam tutulur:** her astronotun normal gecelerine küçük bir kaydırma uygulanır, mürettebat ortalaması **6,090 sa** çıkar (ölçüldü).
- **Temsili kısımlar:** nabız, tansiyon ve sıcaklık referansları, ruh hâli, uyku kalitesi, günlük dalgalanma, görme değişikliğinin başlama günleri (72, 104, 151), MS1'in 118–126. günlerdeki kısa uyku haftası.

### 7.2 Senaryolar (`js/demo.js`)

Seçili astronotun seçili güne kadarki verisinin son günlerini değiştirir: güneş fırtınası (1 gün, 45 mSv *temsili*), uyku kaybı (6 gün), sıvı kayması (4 gün). Yalnızca paneldeki astronota uygulanır.

### 7.3 Zaman kaydırıcısı

- Gösterge panelinde ve mürettebat ekranında görünür.
- Kaydırınca yalnızca o güne kadarki kayıtlar kullanılır; kartlar, 3D vücut, organ paneli, 30 günlük görünüm ve rapor o güne göre hesaplanır.
- Sürükleme kesilmesin diye kaydırıcı bir kez oluşturulur, sonra yalnızca değeri güncellenir. Sürüklerken ekran `requestAnimationFrame` ile her görüntü karesinde en fazla bir kez yeniden çizilir.
- Kendi verinizde de çalışır; o zaman "gün" kaçıncı kayıt olduğunu gösterir.

### 7.4 Mürettebat ekranı

Dört astronot aynı gün için yan yana: genel durum, 5 değer, 6 sistem noktası, dikkat isteyen göstergeler, "Panelde aç".

---

## 7.5 Cihaz dosyasından veri alma (`js/deviceimport.js`)

Uzayda bu ölçümler CSA'nın Bio-Monitor (Astroskin) giysisi gibi cihazlarla yapılabiliyor; ama onun herkese açık bir
bağlantı arayüzü yok. Bu yüzden uygulama, cihazın ya da sağlık uygulamasının **dışa aktardığı dosyayı** okuyor.

- **Biçimler:** CSV (virgül ya da noktalı virgül; ondalık virgül desteklenir) ve JSON (kayıt dizisi ya da dizi içeren nesne). `#` ile başlayan satırlar açıklama sayılır.
- **Sütun tanıma:** Başlıklar küçük harfe çevrilip Türkçe karakterler ve simgeler sadeleştirilir; ad eşleşirse ya da adla başlıyorsa (`blood_glucose_mmol_l` → kan şekeri) tanınır. Tanınanlar: tarih, nabız, sistolik, diastolik, `120/80` biçiminde tansiyon, vücut sıcaklığı, kan şekeri, uyku, egzersiz dakikası. HRV, en yüksek nabız, uyku kalitesi ve uyku evreleri bilerek dışarıda bırakılır.
- **Tarih:** `2026-11-15`, `15.11.2026`, `15/11/2026` (gün önce) ya da Unix zamanı.
- **Birim dönüşümü** (sütun adından ya da sayının büyüklüğünden): mmol/L → mg/dL (× 18,016; değer 30'dan küçükse), °F → °C (değer 45'ten büyükse), uyku dakika → saat (24'ten büyükse), saniye → saat (1440'tan büyükse).
- **Günde birden çok ölçüm:** nabızda ortanca (ve astronota "dinlenme nabzınız mı kontrol edin" notu), uyku ve egzersizde toplam, diğerlerinde ortalama.
- **Kullanılmayanlar:** deri sıcaklığı (vücut sıcaklığı değildir), formun olası aralığı dışındaki değerler, tarihi okunamayan satırlar. Hepsi astronota tek tek söylenir.
- **Akış:** Dosyada seçili tarih varsa o gün, yoksa en son gün alınır ve tarih değiştirilir. Değerler forma doldurulur, kaydedilmez. Doldurulan alanlarda "Cihaz" etiketi çıkar; elle değiştirilen alanın etiketi kalkar. Kaydedilen kayıtta `source: "device"`, `deviceFields` ve `deviceFile` saklanır. Ana ekranda bu alanların kartları "Cihaz" etiketi taşır.
- **Test edilen dosyalar:** örnek CSV; Türkçe başlıklı ve noktalı virgüllü CSV; °F, mmol/L, saniye ve `121/79` içeren JSON; dakikalık nabız verisi; aralık dışı değer; tarihsiz dosya; bozuk JSON.
- **Bluetooth yok:** Tarayıcıdan doğrudan cihaza bağlanma (Web Bluetooth) iPad'deki Safari'de çalışmadığı ve elimizde test cihazı olmadığı için eklenmedi.

---

## 8. 3D anatomi (`js/body3d.js`)

### 8.1 Modeller

| Katman | Dosya | Boyut | Üçgen | Ne zaman yüklenir |
|---|---|---|---|---|
| Organlar | VisceralSystem100.glb | 1,3 MB | 181.018 | açılışta |
| Kalp ve damarlar | CardioVascular41.glb | 3,0 MB | 420.131 | açılışta |
| İskelet | SkeletalSystem100.glb | 4,2 MB | 537.931 | "Katmanlar" menüsünden açılınca |
| Kaslar | MuscularSystem100.glb | 3,8 MB | 478.159 | açılınca |
| Beyin, sinirler, göz | NervousSystem100.glb | 3,5 MB | 538.944 | açılınca ya da beyin/göz seçilince |

Kaynak: Z-Anatomy (BodyParts3D'den türetilmiş), CC BY-SA 4.0. Lisans ve atıf `assets/model/NOTICE.md`, `ATTRIBUTION.md`, README ve uygulamadaki "Emeği geçenler" bölümünde.

### 8.2 Yükleme ve hazırlama

1. `GLTFLoader` + `MeshoptDecoder` ile yüklenir; ilerleme yüzdesi gösterilir.
2. Her yapının adı (ör. "Kidney.l", "Retina.r") bir sağlık sistemine eşlenir: kalp-damar dosyası → kalp; iskelet ve kas → kemik-kas; sinir dosyası → göz yapıları göz, geri kalanı beyin; organ dosyası → akciğer ve hava yolları akciğer, geri kalanı kan/bağışıklık/metabolizma.
3. Organı örten ya da sağlık sistemlerine ait olmayan yapılar gizlenir: üreme organları, plevra, omentum, fasyalar, beyin zarları, iskelet dosyasındaki 705 kas bağlantı işareti.
4. **Birleştirme:** Yüzlerce küçük yapı sistem başına tek ağda birleştirilir. Dosyadaki sıkıştırılmış tam sayı konumları dünya koordinatına açılır. Sonuç: kare başına çizim çağrısı 1.945'ten 4'e (5 katman açıkken 8) düştü. Yapı adları üçgen aralıkları olarak saklanır, dokunulan yapının adı bulunabilir.
5. Her yapının doğal rengi köşe rengi olarak yazılır (kemik fildişi, kas koyu kırmızı ve yarı saydam, atardamar kırmızı, toplardamar mavi, sinir açık sarı, karaciğer kahverengi-kırmızı, akciğer pembe vb.).

### 8.3 Dokunulan yapının adı (`js/anatomy.js`)

- Dokunulan yapının glTF dosyasındaki asıl adı okunur (ör. "Middle phalanx of second finger of hand.l"). Three.js nesne adlarını değiştirdiği için ad, yükleyicinin eşleme tablosundan (`parser.associations`) alınır.
- Ad Türkçe/İngilizce bir bölge adına çevrilir: **"Sol el · İşaret parmağı"**, doku türüyle birlikte ("Kemik", "Kas", "Atardamar", "Sinir", "Organ"…). Organlarda organ adı da yazar ("Karın · Karaciğer"); el ve ayakta parmak adı (başparmak, işaret, orta, yüzük, serçe; ayakta başparmak ve 2.–5. parmak); parmak kaslarında "parmakları hareket ettirir".
- **Taraf** dokunulan noktanın vücudun orta çizgisinin hangi yanında olduğundan hesaplanır, çünkü model sol taraftaki bazı parçaları sağdakinin aynalanmış kopyası olarak ve sağdaki adla saklıyor. Ağız, beyin, göğüs gibi tek bölgelerde taraf sona yazılır ("Ağız · Diş (sağ)").
- **Kapsama:** Dokunulabilen yapıların %98'i anahtar kelimelerle doğrudan tanınıyor (iskelet, kas ve organlar %100, damarlar %95, sinir sistemi %98). Kalanlarda bölge, dokunulan noktanın yüksekliğinden standart vücut oranlarıyla tahmin edilir ve panelde "bölge dokunulan yerden tahmin edildi" yazar.
- Ad 3D görünümün sol altında ve organ panelinin başlığında görünür; panelde altında doku türü, sistem adı ve modeldeki anatomik ad yazar.

### 8.3b Durum gösterimi

- Normal sistemlere hiçbir durum rengi uygulanmaz.
- "İzle/Dikkat": hafif amber parlama (emissive).
- "Doktora bildir": kırmızı parlama, renk kayması ve nabız animasyonu.
- Durum değişince yalnızca sistemin tek malzemesi değişir, yüzlerce ağ değil.
- Seçilen organ ince beyaz dış çizgi alır; çizgi kalınlığı kameranın uzaklığına göre ayarlanır. Sistem düğmeyle seçilince yalnızca organlar çizilir, ince damar ve sinir dalları çizilmez.

### 8.4 Kamera

- **Vücut üzerindeki noktaya yakınlaşma:** Fare tekerleğinde imlecin, iki parmakla yakınlaştırmada parmakların ortasının altındaki nokta ışın atışıyla vücudun yüzeyinde bulunur. Kamera ve döndürme merkezi bu noktaya doğru aynı oranda yaklaşır. Nokta ekranda yerinde kalır ve döndürme merkezi vücudun üzerine oturur; ayağa yakınlaşıp döndürünce ayağın etrafında döner, boşluğa kaymaz. Işın atışı her tekerlek hareketinde değil, hareket başında bir kez yapılır (yaklaşık 20 ms). İmlecin altında vücut yoksa mevcut merkezin derinliğindeki nokta kullanılır. En yakın mesafe 0,12 m.
- **Ortaya dönüş:** Uzaklaşırken (görünüm bütün vücudun %60'ından uzaktayken) ya da tamamen uzaklaşınca bakılan nokta yumuşakça vücudun merkezine geri kayar.
- **Sıfırlama:** 3D görünümün üstündeki ⟲ düğmesi, 0,45 sn'lik bir geçişle önden bütün vücut görünümüne döner. Basit modelde de aynı düğme ve yakınlaşma davranışı var.

### 8.5 Performans

- Yalnızca bir şey değişince çizer (döndürme, katman, durum, nabız); duran sahnede GPU boşta kalır.
- Piksel oranı küçük ekranda (kısa kenar 700 px altı) en fazla 1,5, diğerlerinde 2.
- Döndürme sırasında 90 karede 45'ten fazlası 66 ms'yi aşarsa "Basit modele geç" notu çıkar.
- Basit model (`js/body.js`): kodla çizilmiş, dosya indirmez. Demo menüsü → 3D model → Basit.
- Ayrıntılı model başlatılamazsa uygulama kendiliğinden basit modele geçer. Bir model dosyası inmezse yalnızca o katman kapanır ve uyarı çıkar. WebGL hiç yoksa 3D yerine yazılı bir uyarı görünür; kartlar ve sistem düğmeleri çalışmaya devam eder.

---

## 9. Arayüz

| Ekran | İçerik |
|---|---|
| Gösterge paneli | 3D vücut (Bugün/+30 gün, Katmanlar, sistem düğmeleri), 6 gösterge kartı, organ paneli |
| Günlük kontrol | Cihaz dosyasından alma (isteğe bağlı). Zorunlu: nabız, tansiyon, sıcaklık, kan şekeri, uyku süresi, uyku kalitesi, ruh hâli. Görme varsayılan "değişiklik yok", egzersiz isteğe bağlı. Her alanda "Nasıl ölçülür?" |
| Mürettebat | 4 astronot yan yana |
| Diğer → 30 günlük görünüm | HRP riskleri, birikimli yükler, gidişat tablosu |
| Diğer → Rapor | A4'e sığan uçuş doktoru raporu, yazdır/PDF |
| Diğer → Görev | uzay havası, görev dozu, hatırlatıcılar, seri ve rozetler, emeği geçenler |
| ACİL DURUM (her ekranda) | 6 liste (radyasyon fırtınası, bilinç kaybı, göğüs ağrısı, basınç kaybı, ciddi yaralanma, panik), Dünya cevap sayacı, rapor |
| Demo menüsü | veri kaynağı, astronot, senaryo, 3D model |

- **Organ paneli:** işlev; NASA HRP'nin 5 tehlikesine göre ikonlu "uzay onu nasıl etkiler"; güncel değerler ve 30 günlük grafik; 30 günlük risk; ne yapmalı ve ne zaman bildirmeli (*temsili*); iletişim gecikmesi; HRP ve CSA kaynak linkleri. Kan panelinde ayrıca Inspiration4 karşılaştırması.
- **Dokunma alanları:** en az 56 px (eldivenle basılabilir), koyu ve yüksek kontrastlı tema.
- **Telefon:** üst çubuk iki satır, sekmeler yatay kaydırılır, kartlar iki sütun; 375 px'de yatay kayma yok.

---

## 10. Saklama ve gizlilik

- **IndexedDB:** veritabanı `astroself-local`; tablolar `profiles` (durumun tamamı), `checkins` (tarih anahtarlı girişler), `routines` (görev tarihleri). Tarayıcı izin vermezse localStorage `astroself.v1` anahtarı kullanılır.
- **Diğer anahtarlar:** `astroself.em.v1` (yarım kalan acil durum listesi), `astroself.sw.v1` (son uzay havası verisi).
- Veri cihazdan çıkmaz; hesap, analiz ya da izleme yok. Cihazlar arasında eşitlenmez.
- Not: IndexedDB katmanı (`database.js`) ve "Diğer" menüsü 15 Kasım 01:13'teki `3cb5edd` commit'iyle eklendi; bu oturumda yazılmadı.

---

## 11. Çevrimdışı çalışma (`sw.js`)

- **Strateji:** önce ağ, ağ yoksa önbellek. Her istek sunucuyla doğrulanır; böylece yeni yayın hemen görünür ve aynı yayının dosyaları birbirine uyar.
- **Zaman aşımı:** 3 sn (GLB modellerde 60 sn); süre dolarsa önbellekten sunar.
- **Kurulumda önbelleğe alınanlar:** bütün sayfa, JS, CSS, JSON, kütüphaneler ve açılışta görünen iki model katmanı. Diğer üç katman ilk açıldıklarında önbelleğe girer.
- **Sürüm:** önbellek adı `astroself-v20`. Her yayında artırılır, eski önbellek silinir.
- **Kullanıcı tarafı:** siteyi daha önce açan biri yeni sürümü ikinci yenilemede görür.

---

## 12. Araçlar ve test

- `python tools/check.py`: TR/EN anahtarlarının eşitliğini, kodda kullanılıp tanımlanmamış anahtarları ve çevrimdışı dosya listesini denetler.
- `python tools/build_i4.py <cmp.csv> <cbc.csv> data/i4_blood.json`: OSDR CSV'lerinden gömülü veriyi yeniden üretir.
- **Yerel çalıştırma:** `python -m http.server 8765` (ya da repoda takip edilmeyen `start-app.ps1`, 127.0.0.1:18765).
- **Test edilenler (tarayıcıda, masaüstü ve 375 px telefon görünümü):** dört senaryo, kaydırıcı ve mürettebat ekranı, acil durum ve rapor, sunucu kapalıyken açılış, uzay havası yedekleri, rapor sayfa boyu, etiketler, canlı sitede yayın.
- **Test edilmeyenler:** gerçek telefon ve iPad, ana ekrana ekleme, gerçek yazıcı önizlemesi, gerçek bir güneş fırtınası sırasında canlı uyarı. Telefonda 3D kare hızı ölçülemedi; uygulamanın tarayıcı paneli 3D çizimi kısıtlıyor.

---

## 13. Bilinen sınırlamalar

- Prototiptir, tıbbi cihaz değildir. Teşhis koymaz, ilaç dozu vermez.
- Dünya referans aralıkları, z-skoru seviyeleri, günlük doz uyarı seviyeleri, kariyer yüzde eşikleri, kemik kaybı eşikleri, uyku borcu eşikleri ve ruh hâli 3 gün kuralı *temsili*dir; `data/references.json` içinde öyle işaretli.
- Simüle mürettebatın uykusu (6,09 sa) Dünya referansının (7 sa) altında; uyku çoğu gün "İzle" görünür. Bu NASA bulgusunun sonucudur.
- Bir sistemin bütün yapıları aynı durum rengini alır; organa özel ölçüm yoktur.
- GOES proton akısı Dünya yakınında ölçülür; Mars ortamı seçiliyken de aynı veri gösterilir.
- 3D modeller eğitim amaçlı referans anatomidir, gerçek bir astronotun taraması değildir. `NOTICE.md`'ye göre üst kaynaktaki bazı yapılar ticari olmayan lisanslı referanslara dayanır.
- Hatırlatıcılar yalnızca uygulama içinde görünür; bildirim gönderilmez.

---

## 14. Geliştirme geçmişi (25 commit)

| Dönem | İçerik |
|---|---|
| 14.11 14:54–15:03 | İskelet, P1: günlük kontrol, motor, basit 3D, organ paneli, ortamlar, demo |
| 14.11 15:11 | P2: Inspiration4 verisi, canlı uzay havası, doz kartı, etiketler |
| 14.11 15:18–15:24 | P3–P4: acil durum, 30 günlük görünüm, hatırlatıcılar, rapor |
| 14.11 15:30–15:57 | Test düzeltmeleri, teslim belgeleri, sade metinler, dengeli seviyeler, ruh hâli kuralı |
| 14.11 21:22 | Gerçek anatomi modeli, 5 tehlikeli paneller, sade arayüz |
| 15.11 01:13 | `3cb5edd`: yerel veritabanı, "Diğer" menüsü (bu oturum dışında) |
| 15.11 01:32–01:44 | Doğal renkler, sadeleştirme, veri etiketi düzeltmeleri |
| 15.11 02:04 | Artemis I kaynağı (Nature 2024), simüle mürettebat, mürettebat ekranı, kaydırıcı |

Kodun büyük kısmı Claude (Anthropic) ile Claude Code kullanılarak yazıldı. Ayrıntı README'deki "SI Use" bölümünde.
