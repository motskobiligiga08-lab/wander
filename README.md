# Wander – Travel Companion PWA

A modern, offline-first **Progressive Web App** that works on phones, tablets, and desktops.

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview of trips, spending, packing lists & journal entries + quick actions |
| **Trips & Itinerary** | Create trips, build day-by-day itineraries with activities, times & notes |
| **Packing Lists** | Smart templates (general, beach, cold, business) with progress tracking |
| **Budget Tracker** | Log expenses by category, set a budget goal, see remaining balance |
| **Travel Journal** | Capture memories with mood, location, date and free-form notes |
| **Destinations** | Browse 10 curated destinations with practical travel tips |
| **Settings** | Light/dark theme, currency, budget goal, export/clear data |

## How to use

1. Open `index.html` in any modern browser (Chrome, Edge, Safari, Firefox).
2. Or serve the folder with any static server for full PWA install support:
   ```bash
   # Example with Python
   cd traveler-app
   python3 -m http.server 8080
   # Then open http://localhost:8080
   ```
3. On mobile/desktop Chrome or Edge you will see an **Install App** button – tap it to add Wander to your home screen / app launcher.
4. The app works **offline** after the first visit (service worker caches all assets).

## Data

- Everything is stored **locally** in your browser (`localStorage`).
- No accounts, no servers, no tracking.
- Export your data anytime as JSON from Settings.

## Tech

- Vanilla HTML / CSS / JS (no frameworks)
- Progressive Web App (manifest + service worker)
- Responsive design (mobile bottom nav + desktop sidebar)
- Dark mode support

Enjoy your travels! ✈
