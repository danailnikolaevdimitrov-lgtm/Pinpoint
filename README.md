# 📍 Pinpoint: Bulgaria Edition

**Pinpoint** is a minimalist, browser-based geography game where your goal is to find a hidden target within the borders of Bulgaria. No external APIs, no tracking, just you and the map.

## 🎮 How to Play
1. **The Target:** A random point is generated somewhere within the Bulgarian mainland.
2. **The Guess:** Click the map to place your pin. You must stay within the country borders (the grayed-out area is out of bounds!).
3. **The Feedback:** After each guess, you'll see your distance from the target.
4. **The Goal:** You have **10 rounds** to get within **1 km** of the target.
5. **The Pressure:** You have **2 minutes** per round. If the timer hits zero, the game auto-picks a point 50km away from your last guess. Good luck.

## 🚀 Technical Features
- **Offline-First Borders:** Uses a local GeoJSON file for Bulgaria's borders to avoid Nominatim API rate-limiting and ensure instant loading.
- **Turf.js Integration:** Uses spatial analysis to ensure target generation and user guesses land strictly within the mainland (automatically filtering out Black Sea islands).
- **Responsive UI:** A resizable side panel for stats and history, optimized for a clean desktop experience.
- **Zero-Latency Hosting:** Optimized for deployment on Cloudflare Pages or Vercel.

## 🛠️ Local Setup
Since the game fetches a local `bulgaria.geojson` file, modern browsers will block it if you open the HTML file directly due to CORS policy.

To run it locally:
1. Clone the repo.
2. Open the folder in VS Code.
3. Use the **Live Server** extension to launch `index.html`.

## 📂 File Structure
- `assets/` : Contains the game's logo.
- `data/` : Contains the spatial data for country boundaries.
- `index.html`: The core game logic and UI.
- `style.css` : The game's styling.
- `game.js`  Contains the game's logic and renders the map.

## 🛰️ Credits
- **Map Tiles:** [CartoDB Voyager](https://carto.com/basemaps/)
- **Mapping Engine:** [Leaflet.js](https://leafletjs.com/)
- **Spatial Analysis:** [Turf.js](https://turfjs.org/)

---
*Created for friends, fun, and the occasional frustration of being 1.1km away.*
