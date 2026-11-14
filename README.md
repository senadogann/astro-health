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

## Third-party libraries

- [Three.js](https://threejs.org/) r160 (MIT) — `vendor/three.module.min.js`, `vendor/OrbitControls.js`
- [Chart.js](https://www.chartjs.org/) 4.4.1 (MIT) — `vendor/chart.umd.js`

*(Full README — data sources, real vs simulated data, 3D model licence, SI use — is completed before submission.)*
