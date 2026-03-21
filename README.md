# Neighborhood Intelligence

A Next.js app with a real interactive map (Leaflet + CartoDB tiles) and geolocation.

## Steps to Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. **Open in browser**
   Go to http://localhost:3000

4. **Allow location access** when the browser asks — the map will fly to your exact location with a pulsing blue dot.

## Notes
- No API keys needed — uses free CartoDB tiles + OpenStreetMap Nominatim
- Map supports scroll/pinch to zoom, click+drag to pan
- Works on both desktop and mobile browsers
