# Project page text (Space Apps) — draft for the team to finalise

Project name: **AstroSelf** (working name)
Team: **İstikbal Göklerdedir** · Bursa
Challenge: Create Health Monitoring Software for Astronauts on Space Missions
Demo: https://senadogann.github.io/astro-health/
Code: https://github.com/senadogann/astro-health

---

## High-level summary (about 100 words)

On a mission to Mars, a question to Earth can take up to 44 minutes to come back, and there is no early return.
AstroSelf is a health self-assessment tool that works without Earth. Astronauts log six daily indicators; the app
compares them with their own personal baseline and NASA limits, colours a 3D body green, yellow or red, and explains
what to do and when to notify the flight surgeon. It uses real NASA data: Inspiration4 blood values and live space
weather that triggers a radiation shelter alert. An emergency mode gives offline checklists, and a 30-day outlook
warns before a value becomes critical.

## Project details

### What it does

- **Daily check-in.** Heart rate, blood pressure, body temperature, blood glucose, sleep hours and quality, mood.
  Each field explains how to take the measurement in space.
- **Personal baseline.** The first 7–14 days define each astronaut's own normal. Alerts are based on the distance
  from that baseline (z-score), supported by Earth reference ranges and NASA-derived limits. Every colour comes with
  a plain-language reason.
- **Clickable 3D body.** Six body systems can be rotated, zoomed and tapped. Each panel shows the function of the
  system, how the five hazards of spaceflight affect it, current values with trends, self-care steps, when to notify
  the flight surgeon, and how long Earth takes to answer.
- **Five environments.** ISS, Orion, lunar base, Mars transit and Mars base change the communication delay, the
  radiation dose rate and the advice.
- **Emergency mode.** A red button on every screen opens checklists for a radiation storm, loss of consciousness,
  chest pain, cabin pressure loss, severe injury and a psychological crisis. A countdown shows when Earth's reply can
  arrive, and one button prepares a report for the flight surgeon. No diagnosis and no medication doses are given.
- **30-day risk outlook.** Trends in the last 14 days and cumulative loads (radiation dose, sleep debt, exercise,
  bone loss) are projected 30 days ahead and mapped to NASA Human Research Program risks as Low, Medium or High.
- **Demo mode.** Thirty days of simulated data with three scenarios show how the app reacts: solar particle event,
  sleep loss, and dehydration / fluid shift.

### How it answers the challenge questions

| Challenge question | Where in the app |
|---|---|
| Which measurements can be done in space? | "How to measure?" in every check-in field |
| Why are check-ups necessary? | Check-in introduction; organ panels |
| How do space hazards affect the indicators? | "How space affects it" in each organ panel, linked to the five hazards |
| When does a result need the attention of the crew or the flight surgeon? | "When to notify the flight surgeon" in each panel; colour codes; alerts |
| How can a critical situation be prevented? | Self-care steps; 30-day outlook; reminders |

### How it works

AstroSelf is a web app written in plain HTML, CSS and JavaScript with Three.js and Chart.js. It is a Progressive Web
App: after the first visit it is installable and runs with no internet, which matters when the user is far from
Earth. There is no backend and no login; data stays on the device. The interface is tablet-first with large touch
targets, a dark high-contrast theme, and English and Turkish text.

### Benefits

- The crew gets an answer immediately instead of waiting for Earth.
- A personal baseline detects a change that still looks "normal" on Earth reference ranges.
- The flight surgeon receives a structured, time-stamped report instead of a free-text message.

### Limits and next steps

AstroSelf is a prototype, not a medical device. Thresholds are prototype values; real medical thresholds are set by
flight surgeons. Next steps would be validation of the rules with flight medicine experts, data from wearable
sensors, and more emergency protocols.

## Use of NASA and partner data

- **NASA OSDR OSD-575 / OSD-569 (Inspiration4):** real pre- and post-flight blood values of four civilian astronauts
  are embedded in the app. An astronaut's glucose is compared with the Inspiration4 pre-flight mean and laboratory range.
- **NOAA SWPC GOES proton flux and NASA DONKI:** live space weather. A ≥10 MeV flux of 10 pfu or more (NOAA S1)
  raises a "go to shelter" alert. Without internet the app shows the last saved data.
- **NASA-STD-3001:** career radiation limit of 600 mSv, solar particle event limit, cabin CO₂ limit.
- **NASA Human Research Program:** the five hazards, risk list and evidence reports (bone loss 1–1.5% per month,
  SANS findings in about 70% of long-duration crew).
- **Published measurements:** dose rates for the ISS, Artemis I, the lunar surface (Chang'E-4) and Mars (Curiosity RAD);
  ISS sleep duration (Barger et al. 2014).
- **Canadian Space Agency:** radiation monitoring and astronaut health resources.

The app labels every card as real, NASA-derived, simulated, self-entered or illustrative. Full source list: README.

## Use of Artificial Intelligence (SI Use)

Most of the code was written with Claude (Anthropic) using Claude Code. In-app texts and translations were drafted
with Claude and reviewed by the team. The idea, scope decisions, choice of content and data, testing and the
presentation are the team's. No NASA logo was generated with SI, and no NASA logo is used. The app contains no SI
chat assistant; all assessments come from fixed, readable rules.
