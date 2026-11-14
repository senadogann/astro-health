# CLAUDE.md — NASA Space Apps 2026 (Bursa) · Takım: İstikbal Göklerdedir

## Proje özeti

Bursa Uludağ Üniversitesi YBS öğrencilerinden oluşan **İstikbal Göklerdedir** takımı olarak NASA Space Apps Challenge 2026'da astronotlar için bir sağlık takip uygulaması geliştiriyoruz. Uygulamanın kodunu birlikte yazacağız.

**Zaman planı**
- Yeni özellik ekleme sınırı: Pazar 14:00
- Hedef gönderim: Pazar 20:00
- Son gönderim: 15 Kasım 2026, 23:59

**Çalışma şekli**
- Önce çalışan bir demo, sonra geliştirmeler.
- Basit tut, gereksiz karmaşıklık ekleme.
- Küçük ve sık commit at (internet bağlantımız zayıf).
- Bizimle Türkçe konuş. Her adımın sonunda neyin çalıştığını ve neyi test etmemiz gerektiğini kısaca yaz.

---

## 1. Konu ve NASA'nın istediği

**Create Health Monitoring Software for Astronauts on Space Missions** (Intermediate · Human Exploration, Software, Space Exploration)
https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/

- Astronotun uzun görevde **kendi sağlığını kendisi değerlendirmesini** sağlayan **görsel bir araç** yap. Araç tedavi ve iyileştirme yönünde **rehberlik** de vermeli.
- **Göstergeler:** tansiyon, nabız, kan şekeri, vücut sıcaklığı, günlük uyku saati, ruh hâli.
- **Uygulamanın cevaplaması gereken sorular:** Uzayda hangi ölçümler yapılabilir? Muayene neden gerekli? Uzay tehlikeleri göstergeleri nasıl etkiler? Bir sonuç ne zaman mürettebatın ya da yerdeki uçuş doktorunun (flight surgeon) dikkatini gerektirir? Kritik durum nasıl önlenir?
- **Arayüz önerisi:** Tıklanabilir insan figürü. Her vücut bölgesinin işlevi ve durumu gösterilsin. Animasyon ve etkileşim olsun.
- **Opsiyonel:** farklı ortamlar (uzay aracı / istasyon / rover / Ay ya da Mars üssü), ölçüm hatırlatmaları, oyunlaştırma, zamana göre grafikler, renk kodu, basit açıklamalar.
- **Resmi kaynaklar:**
  - NASA HRP 5 Hazards: https://www.nasa.gov/hrp/hazards/
  - Risks: https://www.nasa.gov/hrp/risks/
  - Ongoing Research: https://www.nasa.gov/hrp/ongoing-hrp-research/
  - CSA Radiation: https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
  - CSA Why Science in Space: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp

## 2. Hikâye (her şey buna hizmet etmeli)

Ocak 2026'da ISS'ten ilk kez tıbbi nedenle erken dönüş yapıldı. Gerekçe, istasyondaki donanımın tam teşhis için yetersiz kalmasıydı. Mars'ta geri dönüş yok. Dünya ile mesaj gidiş-dönüşü 44 dakikaya kadar çıkabiliyor. NASA, Dünya'dan bağımsız tıbbi karar desteğinin henüz olmadığını kendisi kabul ediyor (ExMC Gap Med07 / Med10).

**Ürün:** *"When Earth is minutes away, the crew needs answers now."* Dünya'ya bağlı olmadan, gerçek NASA verisi ve standartlarıyla çalışan bir astronot sağlık yardımcısı.
**Ürün adı:** öner, takım seçsin (ör. "AstroSelf", "Orbit Health", "Göktürk Health").

## 3. Platform kararları

- **Web uygulaması + PWA.** Astronotlar ISS'te Windows dizüstü bilgisayar ve iPad kullanıyor. Uygulama manifest ve service worker ile kurulabilir olsun ve **internetsiz tam çalışsın**.
- Düz **HTML + CSS + JavaScript**, build adımı yok. Kütüphaneler: Three.js (+ GLTFLoader, OrbitControls), Chart.js. CDN kullanılabilir ama service worker bunları da cache'lesin.
- **Tablet öncelikli tasarım:** büyük dokunma alanları (eldivenle basılabilecek kadar), koyu "mission control" teması, yüksek kontrast.
- **Dil: TR / EN düğmesi.** Bütün metinler `data/i18n.json` dosyasında olsun. Varsayılan dil EN. Yerel sunum Türkçe yapılacak.
- **Yayın: GitHub Pages.** Giriş gerektirmeyen public link. İlk saatte yayına al.
- Backend, login ve veritabanı yok. Veri localStorage'da tutulsun (try/catch ile).

## 4. Öncelik sırası (sırayla bitir, sonrakine geçmeden önce çalışır hâle getir)

### P1 — Çekirdek (Cumartesi akşamına kadar BİTMELİ)
1. **Daily Check-in:** nabız, tansiyon (sistolik/diastolik), vücut sıcaklığı, kan şekeri (mg/dL), uyku saati + uyku kalitesi (1–7 ölçeği, NASA'nın kullandığı), ruh hâli (5'li ölçek). Her alanın yanında "How to measure?" bilgisi olsun.
2. **Değerlendirme motoru (`js/rules.js`):**
   - *Personal baseline:* ilk 7–14 günün ortalaması ve standart sapması → z-skoru. **Asıl uyarı buna göre verilir.**
   - *Earth reference:* genel klinik aralıklar, "Earth reference" etiketiyle.
   - *NASA-derived* eşikler (bölüm 6).
   - Çıktı: her gösterge ve her organ sistemi için yeşil / sarı / kırmızı.
3. **3D anatomi (`js/body.js`):** Three.js ile döndürülebilen ve yakınlaştırılabilen model. Sistemler ayrı parçalar olsun: kalp-damar, akciğer, beyin (uyku/ruh hâli), kemik-kas, göz (SANS), kan/bağışıklık/metabolizma. Her parça durumuna göre renklensin, kırmızıda hafif nabız animasyonu olsun.
   - **Lisansı açıkça serbest (CC0 / CC-BY)** hazır bir glTF/GLB model kullan, < 5 MB. Lisansı ve atfı README'ye yaz. Bulamazsan primitiflerle stilize bir "low-poly astronot" yap.
   - **Cumartesi 22:00'de 3D çalışmıyorsa 2D SVG figüre geç.** body.js değiştirilebilir bir modül olsun, uygulamanın geri kalanı figür türüne bağlı olmasın.
4. **Organ paneli:** organa tıklayınca şunlar görünsün:
   - İşlevi
   - Uzayın ona etkisi (5 tehlikeye bağlı)
   - Güncel değer ve mini trend grafiği
   - Ne yapmalı (öz bakım adımları)
   - **"Flight surgeon'a ne zaman bildirmeli"** ve **iletişim gecikmesi**
   - Kaynak linki
5. **Ortam seçici:** ISS / Orion (Ay transferi) / Ay üssü / Mars transferi / Mars üssü. Bu seçim iletişim gecikmesini, radyasyon doz hızını ve metinleri değiştirsin.
6. **Demo modu:** 30 günlük kurgusal astronot verisi (ör. "Cmdr. A. Yıldız"). Senaryo butonları: *Solar particle event*, *Sleep loss*, *Dehydration / fluid shift*. Butona basınca grafikler ve 3D vücut anında değişsin.

### P2 — Gerçek NASA verisi (fark yaratır)
7. **"Real NASA data" / "Simulated" rozetleri:** Her kartta verinin gerçek mi simüle mi olduğu yazsın.
8. **Inspiration4 gerçek kan değerleri (OSDR):** Aşağıdaki CSV'leri indir, `data/i4_blood.json` dosyasına dönüştür ve repoya **statik olarak göm** (CORS'a güvenme). Kan şekeri ve kan kartlarında astronotun girdiği değeri I4 uçuş öncesi ortalaması ve laboratuvar aralığıyla karşılaştır.
   - Dosya listesi: https://osdr.nasa.gov/osdr/data/osd/files/575 ve https://osdr.nasa.gov/osdr/data/osd/files/569
   - İndirme kalıbı: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-{ID}/download?source=datamanager&file={DOSYA}`
   - OSD-575: `LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv` (glukoz, elektrolitler, böbrek ve karaciğer)
   - OSD-569: `LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`
   - Not: 4 sivil astronot, 3 günlük görev, sadece uçuş öncesi ve sonrası değerler. R+45'teki düşük glukoz muhtemelen numune işleme kaynaklı, bunu "uzay etkisi" diye yorumlama. Atıf: "Source: NASA OSDR OSD-575 / OSD-569 (Inspiration4)".
9. **Canlı uzay havası → radyasyon uyarısı:**
   - NOAA SWPC (anahtarsız JSON): `https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json`. ≥10 MeV akı 10 pfu'yu aşarsa (NOAA S1) "Solar particle event — go to shelter" uyarısı ver.
   - DONKI'nin yeni adresi (30.09.2026'dan beri; eski api.nasa.gov DEMO_KEY çalışmıyor): `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (ayrıca /FLR, /CME).
   - CORS'u test et. Çalışmazsa repodaki snapshot JSON'a düş. İnternet yoksa son kaydedilen veriyi göster.
   - Ekranda "Live space weather · NOAA/NASA" kartı olsun.
10. **Kümülatif radyasyon dozu:** ortam seçicideki doz hızıyla görev boyunca birikir ve kariyer limitine göre yüzde olarak gösterilir.

### P3 — Karar desteği
11. **Emergency Mode** (her ekranda kırmızı buton, internetsiz). Önce **radyasyon fırtınası** protokolü yapılsın. Sonra şunlar: bilinç kaybı, göğüs ağrısı, kabin basınç kaybı, ciddi yaralanma, panik/psikolojik kriz. Her biri checkbox'lı adım adım bir liste olsun. "Earth reply in X min" sayacı ve "Prepare report for flight surgeon" butonu da eklensin. Teşhis ya da ilaç dozu verme.
12. **30-Day Risk Outlook:** son 14 günün verisine doğrusal regresyon uygula, değerin ne zaman sarı ya da kırmızıya gireceğini tahmin et. Birikimli metrikler: radyasyon, uyku borcu, egzersiz eksikliği. Kemik kaybını NASA oranıyla hesapla (%1–1,5/ay). HRP risklerine eşle ve Düşük / Orta / Yüksek ver. 3D'de **"Today / +30 days"** düğmesi olsun. Not: *"Trend-based early warning, not a diagnosis."*

### P4 — Zaman kalırsa
13. Ölçüm hatırlatıcıları, gerçek NASA takvimine göre: her gün uyku/ruh hâli/egzersiz, her hafta doktor görüşmesi raporu, her ay kilo ve bilişsel test.
14. Oyunlaştırma: check-in serisi (streak), rozetler.
15. Flight surgeon için yazdırılabilir tek sayfalık rapor.
16. ❌ SI sohbet asistanı **yapılmayacak** (rakiplerde zaten var, API anahtarı riski var, internet gerektiriyor). En fazla, kural motorunun ürettiği açıklamalar sade dilde gösterilir.

## 5. Klasör yapısı

```
index.html
manifest.webmanifest
sw.js
css/style.css
js/app.js  js/rules.js  js/body.js  js/charts.js  js/demo.js  js/spaceweather.js  js/outlook.js  js/emergency.js  js/i18n.js
data/i18n.json  data/content.json  data/sources.json  data/references.json  data/i4_blood.json  data/swpc_snapshot.json
assets/model/ (glb + LICENSE)
README.md
```

## 6. Referans değerler (`data/references.json`, her biri kaynaklı)

| Parametre | Değer | Kaynak |
|---|---|---|
| Kariyer radyasyon limiti | < 600 mSv efektif doz | NASA-STD-3001 Vol.1 Rev C [V1 4030] |
| SPE tasarım limiti | < 250 mSv | NASA-STD-3001 [V1 4031] |
| ISS tipik doz | ~0,5 mSv/gün (mertebe) | NASA LSAH Newsletter 2023 |
| Artemis I GCR doz hızı | 0,96–1,24 mSv/gün | Nature 2024; NTRS 20230010550 |
| Mars transferi / yüzeyi | 1,84 ± 0,30 / 0,64 ± 0,12 mSv/gün | Hassler vd., Science 2014 (Curiosity RAD) |
| Artemis radyasyon sığınağı tavsiyesi | doz hızı > 75 μGy/dk | Hu vd., Space Weather & Space Climate 2025 |
| CO₂ | 1 saatlik ortalama ≤ 3 mmHg | NASA-STD-3001 Vol.2 [V2 6004]; OCHMO-TB-004 |
| Kemik kaybı | kalça/omurga ayda %1–1,5 | HRP Bone Fracture Evidence Report 2024 |
| Uyku | ISS'te ortalama 6,09 sa (planlanan 8,5 sa) | Barger vd., Lancet Neurol 2014 |
| SANS | uzun görevlerde mürettebatın ~%70'inde en az bir bulgu | HRP SANS Evidence Report 2022 |
| Aerobik egzersiz | tepe nabzın ≥ %70'i, haftada ≥ 3 seans, ≥ 20 dk | NASA OCHMO egzersiz teknik özeti |
| Ölçülen vitaller | nabız, tansiyon, vücut ısısı, solunum, boy, kilo | NLSP LSAH protokolü MR089S |

Kaynakta doğrulayamadığın bir sayıyı kullanma ya da "illustrative" diye işaretle. Bütün eşiklerde not: *"Prototype values. Real medical thresholds are set by flight surgeons."*
Ek kaynaklar: Evidence Reports https://humanresearchroadmap.nasa.gov/evidence/ · NLSP https://nlsp.nasa.gov/explore · RadLab https://visualization.osdr.nasa.gov/radlab/gui/overview/

## 7. Teslim (Pazar 14:00'ten sonra)

- **README.md (İngilizce):**
  - Problem, çözüm, ekran görüntüleri, nasıl kullanılır.
  - Kullanılan NASA verileri ve kaynaklar (linkli). Hangi verinin gerçek, hangisinin simüle olduğu.
  - 3D model lisansı.
  - "Prototype, not a medical device" notu.
  - Takım adının anlamı: *Atatürk: "İstikbal göklerdedir" — "The future is in the skies."*
- **"SI Use" bölümü (zorunlu, dürüst):** Kodun büyük kısmı Claude (Anthropic) ile Claude Code kullanılarak yazıldı. Fikir, kapsam kararları, içerik seçimi, test ve sunum takımındır. NASA logosu SI ile üretilmedi ve kullanılmadı.
- **Proje sayfası metni (İngilizce):** kısa özet + detay + NASA verileri. Takımla birlikte son hâline getirilecek.
- **30 saniyelik video senaryosu:** Türkçe anlatım + **İngilizce altyazı**.
  - 0–5 sn: problem ("Earth is 22 minutes away")
  - 5–22 sn: canlı demo (güneş fırtınası → alarm → 3D vücut kırmızı → sığınak listesi)
  - 22–30 sn: etki ve NASA verisi
- **7 slaytlık sunum taslağı** (TR + EN).
- Bütün linkleri giriş yapılmamış bir tarayıcıda test et.
