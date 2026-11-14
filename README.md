# AstroSelf — Astronaut Health Monitor

> *"When Earth is minutes away, the crew needs answers now."*

NASA Space Apps Challenge 2026 (Bursa) · Team **İstikbal Göklerdedir**
Challenge: [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)

A self-assessment health tool for astronauts on long missions. It runs fully offline (PWA), compares daily
measurements with the astronaut's own baseline, and tells the crew what to do and when to notify the flight surgeon.

**Prototype — not a medical device.** Prototype values. Real medical thresholds are set by flight surgeons.

## Run locally

No build step. Serve the folder with any static server, for example:

```bash
python -m http.server 8765
```

Then open http://localhost:8765.

## Live demo

https://senadogann.github.io/astro-health/

## 3D model

The 3D figure is a stylised low-poly astronaut generated in code from Three.js primitives (`js/body.js`).
No external model file is used, so there is no third-party model licence.

## Data: real vs simulated

Every card in the app is labelled.

| Data | Type | Source |
|---|---|---|
| Inspiration4 blood values (glucose, electrolytes, kidney, blood count) | **Real NASA data**, embedded in `data/i4_blood.json` | NASA OSDR [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575) / [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569) (Inspiration4) |
| Live ≥10 MeV proton flux (radiation storm alert at 10 pfu, NOAA S1) | **Real, live** (falls back to last saved data, then to `data/swpc_snapshot.json`) | [NOAA SWPC GOES](https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json) |
| Solar energetic particle events and flares | **Real, live** | [NASA DONKI (CCMC)](https://ccmc.gsfc.nasa.gov/tools/DONKI/) |
| Limits and reference values (career dose 600 mSv, dose rates, bone loss, sleep, ...) | NASA-derived, sourced | `data/references.json`, `data/sources.json` |
| Demo astronaut "Cmdr. A. Yıldız" and the three scenarios | **Simulated** | `js/demo.js` |
| Mission radiation dose | Model: mission days × environment dose rate | `js/rules.js` |

Inspiration4 notes: 4 civilian astronauts, 3-day mission, pre- and post-flight samples only. The low glucose at R+45
is probably a sample-handling artefact and is not interpreted as a spaceflight effect.
Rebuild the embedded file with `python tools/build_i4.py <cmp.csv> <cbc.csv> data/i4_blood.json`.

## Third-party libraries

- [Three.js](https://threejs.org/) r160 (MIT) — `vendor/three.module.min.js`, `vendor/OrbitControls.js`
- [Chart.js](https://www.chartjs.org/) 4.4.1 (MIT) — `vendor/chart.umd.js`

*(Full README — data sources, real vs simulated data, 3D model licence, SI use — is completed before submission.)*
