# 7 slaytlık sunum taslağı (TR + EN)

Her slayt için: başlık, ekranda görünecek maddeler ve konuşmacı notu. Yerel sunum Türkçe yapılacak.

---

## 1 · Açılış / Opening

**TR — Dünya 22 dakika uzakta**
- AstroSelf: Dünya'ya bağlı olmadan çalışan astronot sağlık yardımcısı
- Takım: İstikbal Göklerdedir · Bursa Uludağ Üniversitesi YBS
- *"When Earth is minutes away, the crew needs answers now."*

**EN — Earth is 22 minutes away**
- AstroSelf: an astronaut health assistant that works without Earth
- Team: İstikbal Göklerdedir · Bursa Uludağ University, MIS
- *"When Earth is minutes away, the crew needs answers now."*

*Not:* Takım adını açıklayın: Atatürk, "İstikbal göklerdedir."

---

## 2 · Problem

**TR**
- Ocak 2026: ISS'ten ilk kez tıbbi nedenle erken dönüş; istasyondaki donanım tam teşhise yetmedi
- Mars'ta geri dönüş yok; mesajın gidiş-dönüşü 44 dakikaya kadar
- NASA: Dünya'dan bağımsız tıbbi karar desteği henüz yok (ExMC Med07 / Med10)

**EN**
- January 2026: first early return from the ISS for a medical reason; on-board equipment was not enough for a full diagnosis
- No return from Mars; a message takes up to 44 minutes there and back
- NASA: Earth-independent medical decision support is still an open gap (ExMC Med07 / Med10)

*Not:* Tek cümle: "Astronot kendi sağlığını kendisi değerlendirebilmeli."

---

## 3 · Çözüm / Solution

**TR**
- Günlük kontrol: nabız, tansiyon, sıcaklık, kan şekeri, uyku, ruh hâli
- Kişisel referans: uyarı, astronotun kendi normaline göre verilir
- Tıklanabilir 3D vücut: yeşil / sarı / kırmızı, nedeniyle birlikte
- Her organ için: ne yapmalı, uçuş doktoruna ne zaman bildirmeli
- TR / EN, tablet öncelikli, internetsiz çalışır

**EN**
- Daily check-in: heart rate, blood pressure, temperature, glucose, sleep, mood
- Personal baseline: alerts compare the astronaut with their own normal
- Clickable 3D body: green / yellow / red, each with a reason
- For every organ: what to do, when to notify the flight surgeon
- Turkish / English, tablet-first, works offline

*Not:* Ekran görüntüsü: `docs/screenshots/01-dashboard-solar-storm.jpg`

---

## 4 · Canlı demo / Live demo

**TR**
- Ortam: Mars üssü
- "Güneş parçacık fırtınası" → uyarı → 3D vücut kırmızı
- Sığınak listesi → Dünya cevap sayacı → uçuş doktoru raporu

**EN**
- Environment: Mars base
- "Solar particle event" → alert → 3D body turns red
- Shelter checklist → Earth reply countdown → flight surgeon report

*Not:* Demo linki: https://senadogann.github.io/astro-health/ · İnternet kesilirse uygulama yine açılır. Yedek olarak videoyu hazır tutun.

---

## 5 · Gerçek NASA verisi / Real NASA data

**TR**
- Inspiration4 kan değerleri (NASA OSDR OSD-575 / OSD-569): astronotun kan şekeri gerçek mürettebatla karşılaştırılır
- Canlı uzay havası (NOAA SWPC + NASA DONKI): proton akısı 10 pfu'yu geçince sığınak uyarısı
- NASA-STD-3001: 600 mSv kariyer limiti; HRP: kemik kaybı ayda %1–1,5
- Her kartta etiket: gerçek / NASA kaynaklı / simüle

**EN**
- Inspiration4 blood values (NASA OSDR OSD-575 / OSD-569): the astronaut's glucose is compared with a real crew
- Live space weather (NOAA SWPC + NASA DONKI): shelter alert when proton flux passes 10 pfu
- NASA-STD-3001: 600 mSv career limit; HRP: bone loss 1–1.5% per month
- Every card is labelled: real / NASA-derived / simulated

*Not:* Ekran görüntüsü: `docs/screenshots/02-organ-panel.jpg`

---

## 6 · Karar desteği / Decision support

**TR**
- Acil durum modu: 6 internetsiz kontrol listesi, teşhis ve ilaç dozu yok
- 30 günlük risk görünümü: gidişat + birikimli yükler → NASA HRP riskleri (Düşük / Orta / Yüksek)
- 3D vücutta "Bugün / +30 gün"
- Hatırlatıcılar, seri ve rozetler, yazdırılabilir rapor

**EN**
- Emergency mode: 6 offline checklists, no diagnosis and no medication doses
- 30-day risk outlook: trends + cumulative loads → NASA HRP risks (Low / Medium / High)
- "Today / +30 days" on the 3D body
- Reminders, streak and badges, printable report

*Not:* Ekran görüntüleri: `03-emergency-checklist.jpg`, `04-risk-outlook.jpg`. Vurgu: "Erken uyarı, teşhis değil."

---

## 7 · Etki ve sonraki adımlar / Impact and next steps

**TR**
- Mürettebat Dünya'yı beklemeden ilk adımı atar
- Kişisel referans, "normal" görünen değişimi erken yakalar
- Sonraki adımlar: uçuş hekimleriyle doğrulama, giyilebilir sensör verisi, daha fazla protokol
- Prototiptir, tıbbi cihaz değildir · SI kullanımı: kodun büyük kısmı Claude ile yazıldı
- Demo: senadogann.github.io/astro-health

**EN**
- The crew takes the first step without waiting for Earth
- A personal baseline catches a change that still looks "normal"
- Next: validation with flight surgeons, wearable sensor data, more protocols
- Prototype, not a medical device · SI use: most of the code was written with Claude
- Demo: senadogann.github.io/astro-health

*Not:* Kapanış cümlesi: "İstikbal göklerdedir."
