# Google Maps Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from Leaflet + CartoDB tiles to Google Maps JS SDK behind a `?engine=google` URL flag, with deploy-time API key injection via GitHub Actions, while keeping Leaflet as the default until the Google version is verified.

**Architecture:** Side-by-side engine files (`src/map.js` for Leaflet, new `src/map-google.js` for Google) sharing the same `POIMap` public interface. A new `src/engine-loader.js` reads the engine choice from URL/localStorage and dynamically injects the right vendor scripts. `src/app.js` waits for a `mapEngineReady` event before instantiating `POIMap`. API key + Map ID are written to `config.js` at deploy time by a GitHub Actions workflow; locally a gitignored `config.local.js` provides them.

**Tech Stack:** Vanilla JS (ES2017+), Leaflet 1.9.4 (legacy), Google Maps JS SDK (`weekly` channel) with `AdvancedMarkerElement`, GitHub Pages with Actions deployment.

**Spec:** `docs/superpowers/specs/2026-05-08-google-maps-migration-design.md`

**Branch:** `feat/google-maps-migration` (already created)

**A note on testing:** This codebase has no automated test framework. Introducing one is out of scope for this plan. Verification is therefore manual browser-based; each task that changes behavior includes a concrete verification step (what to open, what to look at in DevTools, expected result). The Google Maps tasks (Phase 2) cannot be visually verified until the API key + Map ID secrets are in place — those tasks include "deferred verification" notes and a final QA pass at the end of the plan.

---

## Phase 1 — Foundation (no user-visible change; Leaflet still default)

### Task 1: Add config files and gitignore entries

**Files:**
- Create: `config.example.js`
- Modify: `.gitignore`

- [ ] **Step 1: Create `config.example.js`**

```js
// Copy this file to config.local.js for local development.
// Replace the placeholders with your real values.
// In production, config.js is generated at deploy time by GitHub Actions.
window.APP_CONFIG = {
    GOOGLE_MAPS_API_KEY: 'YOUR_KEY_HERE',
    GOOGLE_MAPS_ID: 'YOUR_MAP_ID_HERE'
};
```

- [ ] **Step 2: Update `.gitignore`**

Append (or create file with) the following lines:

```
# Generated/local config — never commit real keys
config.js
config.local.js
```

- [ ] **Step 3: Commit**

```bash
git add config.example.js .gitignore
git commit -m "Add config example and gitignore entries for Google Maps key

Lays the groundwork for deploy-time API key injection (#2)."
```

---

### Task 2: Move marker CSS from `map.js` into `styles.css`

The current `src/map.js` injects marker CSS via `addMarkerStyles()`. Moving it into the stylesheet means both engines reuse the same classes and the JS shrinks.

**Files:**
- Modify: `src/styles.css` (append marker rules)
- Modify: `src/map.js` (remove `addMarkerStyles` method and its call site)

- [ ] **Step 1: Append marker CSS to `src/styles.css`**

Add at the end of the file:

```css
/* Map marker styles (shared by Leaflet and Google Maps engines) */
.user-location-marker {
    background: #4285F4;
    border: 3px solid white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    position: relative;
}

.user-location-marker::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
}

.poi-marker {
    background: #333;
    border: 2px solid white;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    color: #FFD200;
    font-weight: bold;
    font-size: 14px;
    font-family: Arial, sans-serif;
}

.selected-poi-marker {
    background: #FFD200;
    border: 2px solid #333;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
    color: #333;
    font-weight: bold;
    font-size: 16px;
    font-family: Arial, sans-serif;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
```

- [ ] **Step 2: Remove `addMarkerStyles` from `src/map.js`**

Delete lines 75-140 (the entire `addMarkerStyles()` method) and remove the call to it on line 64 (`this.addMarkerStyles();`). After this edit the file is roughly 250 lines.

- [ ] **Step 3: Verify Leaflet still renders markers correctly**

Open `index.html` in a browser (or run `python3 -m http.server` from the repo root and visit `http://localhost:8000`). Confirm:
- Black/yellow "P" markers appear on the map
- Clicking a marker highlights it (yellow background, dark P, pulse animation)
- Clicking the map background deselects

- [ ] **Step 4: Commit**

```bash
git add src/styles.css src/map.js
git commit -m "Move marker CSS from map.js into styles.css

Allows the upcoming Google Maps engine to reuse the same classes (#2)."
```

---

### Task 3: Create the engine loader

**Files:**
- Create: `src/engine-loader.js`

- [ ] **Step 1: Create `src/engine-loader.js`**

```js
// Map engine loader — picks Leaflet (default) or Google Maps based on
// ?engine= URL param or localStorage.mapEngine, then injects the right
// vendor assets and engine module. Fires `mapEngineReady` when done so
// app.js can instantiate POIMap.
(function () {
    'use strict';

    const URL_PARAM = 'engine';
    const STORAGE_KEY = 'mapEngine';
    const DEFAULT_ENGINE = 'leaflet';

    function readEngine() {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get(URL_PARAM);
        if (fromUrl === 'google' || fromUrl === 'leaflet') {
            try { localStorage.setItem(STORAGE_KEY, fromUrl); } catch (_) {}
            return fromUrl;
        }
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'google' || stored === 'leaflet') return stored;
        } catch (_) {}
        return DEFAULT_ENGINE;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load script ' + src));
            document.head.appendChild(s);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => reject(new Error('Failed to load stylesheet ' + href));
            document.head.appendChild(link);
        });
    }

    async function loadLeaflet() {
        await loadStylesheet('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        await loadScript('src/map.js');
    }

    async function loadGoogle() {
        const cfg = window.APP_CONFIG || {};
        if (!cfg.GOOGLE_MAPS_API_KEY) {
            console.error('[engine-loader] GOOGLE_MAPS_API_KEY missing — falling back to Leaflet');
            return loadLeaflet();
        }
        if (!cfg.GOOGLE_MAPS_ID) {
            console.error('[engine-loader] GOOGLE_MAPS_ID missing — AdvancedMarkerElement will not render correctly');
        }
        // Google Maps dynamic library import bootstrap
        // Source: https://developers.google.com/maps/documentation/javascript/load-maps-js-api
        ((g) => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set(), e = new URLSearchParams(), u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a); })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)); })({
            key: cfg.GOOGLE_MAPS_API_KEY,
            v: 'weekly'
        });
        await loadScript('src/map-google.js');
    }

    async function init() {
        const engine = readEngine();
        try {
            if (engine === 'google') {
                await loadGoogle();
            } else {
                await loadLeaflet();
            }
            window.dispatchEvent(new CustomEvent('mapEngineReady', { detail: { engine } }));
        } catch (err) {
            console.error('[engine-loader] Failed to load engine "' + engine + '":', err);
        }
    }

    init();
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/engine-loader.js
git commit -m "Add map engine loader (Leaflet/Google switch)

Dynamically loads vendor assets and dispatches mapEngineReady (#2)."
```

---

### Task 4: Wire the loader into `index.html` and `app.js`

**Files:**
- Modify: `index.html` (remove direct Leaflet vendor refs and `src/map.js` script tag; add `config` and `engine-loader` script tags)
- Modify: `src/app.js` (defer `POIApp` instantiation until `mapEngineReady`)

- [ ] **Step 1: Update `index.html` `<head>`**

Replace the line:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```
…by simply deleting it (the loader injects this now).

- [ ] **Step 2: Update `index.html` `<body>` script section**

Replace the entire script block at the bottom:

```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="src/data.js"></script>
<script src="src/utils.js"></script>
<script src="src/map.js"></script>
<script src="src/app.js"></script>
```

with:

```html
<!-- Config: real values injected at deploy time by GitHub Actions; locally use config.local.js -->
<script src="config.js" onerror="this.onerror=null;this.src='config.local.js';"></script>
<script src="src/data.js"></script>
<script src="src/utils.js"></script>
<script src="src/engine-loader.js"></script>
<script src="src/app.js"></script>
```

The `onerror` fallback lets local development work without copying the example: if `config.js` is 404, the browser tries `config.local.js`. If neither exists, only the Google engine path breaks; Leaflet still works.

- [ ] **Step 3: Update `src/app.js` `initializeApp` to wait for engine**

Replace the existing `initializeApp` method (lines 12-19):

```js
    initializeApp() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
```

with:

```js
    initializeApp() {
        const start = () => {
            // Engine loader fires mapEngineReady after vendor + map module load
            if (window.POIMap) {
                this.init();
            } else {
                window.addEventListener('mapEngineReady', () => this.init(), { once: true });
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }
```

- [ ] **Step 4: Expose `POIMap` on `window`**

At the very end of `src/map.js`, after the closing brace of the class, add:

```js
window.POIMap = POIMap;
```

This makes the engine-readiness check in `app.js` work for both engines (Google's file will do the same).

- [ ] **Step 5: Verify Leaflet still works through the loader**

Serve locally (`python3 -m http.server` from repo root) and visit `http://localhost:8000`. Confirm:
- Map loads with CartoDB Voyager tiles
- All P markers appear, auto-fit on load
- Marker click selects card; card click selects marker; map click deselects
- DevTools Network tab shows Leaflet CSS/JS being loaded by `engine-loader.js` (not from `index.html` directly)
- DevTools Console: no errors

Then test the override: `http://localhost:8000?engine=google` should log `[engine-loader] GOOGLE_MAPS_API_KEY missing — falling back to Leaflet` and still render the Leaflet map.

Then clear `localStorage.mapEngine` from DevTools, reload — default Leaflet behavior.

- [ ] **Step 6: Commit**

```bash
git add index.html src/app.js src/map.js
git commit -m "Wire engine loader into index.html and app.js

Leaflet now loads via the loader; app.js waits for mapEngineReady (#2)."
```

---

## Phase 2 — Google Maps engine implementation

These tasks build `src/map-google.js`. They cannot be visually verified until the API key + Map ID are configured (Phase 3 / Cloud Console setup). Each task includes a static check (`node --check` syntax validation) as a minimum guard, with a "deferred manual verification" note for what to test once the key is live.

### Task 5: Scaffold `src/map-google.js` with map initialization

**Files:**
- Create: `src/map-google.js`

- [ ] **Step 1: Create `src/map-google.js` with constructor and `initMap`**

```js
// Map functionality using Google Maps JavaScript SDK.
// Public API mirrors src/map.js so app.js works with either engine.
class POIMap {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = []; // each: { marker: AdvancedMarkerElement, poi: {...} }
        this.userLocation = null;
        this.selectedPOI = null;
        this._libsReady = null; // Promise resolved with imported libraries
        this._readyResolvers = [];

        this.initMap();
    }

    async initMap() {
        // Load required libraries via the dynamic importLibrary loader
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
            google.maps.importLibrary('maps'),
            google.maps.importLibrary('marker')
        ]);
        this._Map = Map;
        this._AdvancedMarkerElement = AdvancedMarkerElement;

        const cfg = window.APP_CONFIG || {};
        const isMobile = window.innerWidth < 768;

        this.map = new Map(document.getElementById('map'), {
            center: { lat: 33.7648, lng: -84.3490 }, // Little Five Points, Atlanta
            zoom: 14,
            mapId: cfg.GOOGLE_MAPS_ID,
            disableDefaultUI: false,
            clickableIcons: false, // we don't want Google's POI clicks competing with ours
            gestureHandling: isMobile ? 'cooperative' : 'auto',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            keyboardShortcuts: false
        });

        // Click on empty map → deselect
        this.map.addListener('click', () => this.deselectAll());

        this._libsReady = Promise.resolve();
        // Resolve any operations queued before init finished
        this._readyResolvers.forEach(fn => fn());
        this._readyResolvers = [];
    }

    // Helper: ensure libraries are loaded before any operation
    _whenReady() {
        if (this.map) return Promise.resolve();
        return new Promise(resolve => this._readyResolvers.push(resolve));
    }

    // ---- Stub methods (filled in by subsequent tasks) ----
    async updateUserLocation(_lat, _lng) {}
    async addPOIMarkers(_pois) {}
    async fitToAllMarkers() {}
    async clearPOIMarkers() {}
    async selectPOI(_poiId) {}
    async fitBounds(_userLat, _userLng, _pois, _maxDistanceMiles = 3) {}
    async deselectAll() {}
    getCenter() {
        if (!this.map) return { lat: 0, lng: 0 };
        const c = this.map.getCenter();
        return { lat: c.lat(), lng: c.lng() };
    }
    getBounds() {
        if (!this.map) return null;
        const b = this.map.getBounds();
        if (!b) return null;
        return {
            north: b.getNorthEast().lat(),
            south: b.getSouthWest().lat(),
            east: b.getNorthEast().lng(),
            west: b.getSouthWest().lng()
        };
    }
}

window.POIMap = POIMap;
```

- [ ] **Step 2: Static syntax check**

```bash
node --check src/map-google.js
```

Expected: no output (success).

- [ ] **Step 3: Commit**

```bash
git add src/map-google.js
git commit -m "Scaffold map-google.js (POIMap stub for Google engine)

Constructor + initMap with importLibrary; method stubs to fill in (#2)."
```

---

### Task 6: Implement POI markers and selection in `map-google.js`

**Files:**
- Modify: `src/map-google.js` (replace stubs `addPOIMarkers`, `clearPOIMarkers`, `selectPOI`, `deselectAll`)

- [ ] **Step 1: Replace the marker-related stubs**

In `src/map-google.js`, replace these four stub methods:

```js
    async addPOIMarkers(_pois) {}
    async clearPOIMarkers() {}
    async selectPOI(_poiId) {}
    async deselectAll() {}
```

with:

```js
    _makeMarkerContent(selected) {
        const div = document.createElement('div');
        div.className = selected ? 'selected-poi-marker' : 'poi-marker';
        div.textContent = 'P';
        return div;
    }

    async addPOIMarkers(pois) {
        await this._whenReady();
        await this.clearPOIMarkers();

        pois.forEach(poi => {
            const marker = new this._AdvancedMarkerElement({
                map: this.map,
                position: { lat: poi.lat, lng: poi.lng },
                content: this._makeMarkerContent(false),
                gmpClickable: true
            });

            marker.addListener('gmp-click', () => {
                this.selectPOI(poi.id);
                window.dispatchEvent(new CustomEvent('poiMapClick', {
                    detail: { poiId: poi.id }
                }));
            });

            this.poiMarkers.push({ marker, poi });
        });

        await this.fitToAllMarkers();
    }

    async clearPOIMarkers() {
        this.poiMarkers.forEach(({ marker }) => { marker.map = null; });
        this.poiMarkers = [];
    }

    async selectPOI(poiId) {
        await this._whenReady();
        // Reset all markers to default content
        this.poiMarkers.forEach(({ marker }) => {
            marker.content = this._makeMarkerContent(false);
        });
        const found = this.poiMarkers.find(({ poi }) => poi.id === poiId);
        if (found) {
            found.marker.content = this._makeMarkerContent(true);
            this.selectedPOI = poiId;
            this.map.panTo({ lat: found.poi.lat, lng: found.poi.lng });
            // Match Leaflet behavior: zoom in on selection
            if (this.map.getZoom() < 17) this.map.setZoom(17);
        }
    }

    async deselectAll() {
        this.poiMarkers.forEach(({ marker }) => {
            marker.content = this._makeMarkerContent(false);
        });
        this.selectedPOI = null;
        document.querySelectorAll('.poi-card').forEach(card => {
            card.classList.remove('active');
        });
    }
```

- [ ] **Step 2: Static syntax check**

```bash
node --check src/map-google.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/map-google.js
git commit -m "Implement POI markers and selection in Google engine

AdvancedMarkerElement with HTML content reusing .poi-marker /
.selected-poi-marker classes (#2)."
```

**Deferred verification (after Phase 3):** With `?engine=google` and a valid key/Map ID:
- All P markers render at correct positions
- Click marker → marker swaps to yellow/dark/pulse style; corresponding card highlights
- Click another marker → previous marker resets, new one highlights
- Click empty map → all markers reset; cards deactivate

---

### Task 7: Implement geolocation, fitToAllMarkers, fitBounds in `map-google.js`

**Files:**
- Modify: `src/map-google.js` (replace stubs `updateUserLocation`, `fitToAllMarkers`, `fitBounds`)

- [ ] **Step 1: Replace the remaining stubs**

In `src/map-google.js`, replace these three stub methods:

```js
    async updateUserLocation(_lat, _lng) {}
    async fitToAllMarkers() {}
    async fitBounds(_userLat, _userLng, _pois, _maxDistanceMiles = 3) {}
```

with:

```js
    _makeUserLocationContent() {
        const div = document.createElement('div');
        div.className = 'user-location-marker';
        return div;
    }

    async updateUserLocation(lat, lng) {
        await this._whenReady();
        this.userLocation = { lat, lng };

        if (this.userMarker) {
            this.userMarker.position = { lat, lng };
        } else {
            this.userMarker = new this._AdvancedMarkerElement({
                map: this.map,
                position: { lat, lng },
                content: this._makeUserLocationContent(),
                zIndex: 1000
            });
        }
        this.map.setCenter({ lat, lng });
        this.map.setZoom(14);
    }

    async fitToAllMarkers() {
        await this._whenReady();
        if (this.poiMarkers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.poiMarkers.forEach(({ poi }) => {
            bounds.extend({ lat: poi.lat, lng: poi.lng });
        });
        this.map.fitBounds(bounds, 30); // 30px padding ≈ Leaflet's [30, 30]

        // Cap zoom at 17 to match Leaflet's maxZoom option
        google.maps.event.addListenerOnce(this.map, 'idle', () => {
            if (this.map.getZoom() > 17) this.map.setZoom(17);
        });
    }

    async fitBounds(userLat, userLng, pois, maxDistanceMiles = 3) {
        await this._whenReady();
        if (!pois || pois.length === 0) return;

        // poi.distance is in km; milesToKm is provided by utils.js (loaded earlier)
        const nearby = pois.filter(poi => poi.distance <= milesToKm(maxDistanceMiles));
        if (nearby.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: userLat, lng: userLng });
        nearby.forEach(poi => bounds.extend({ lat: poi.lat, lng: poi.lng }));
        this.map.fitBounds(bounds, 20);

        google.maps.event.addListenerOnce(this.map, 'idle', () => {
            if (this.map.getZoom() > 16) this.map.setZoom(16);
        });
    }
```

- [ ] **Step 2: Static syntax check**

```bash
node --check src/map-google.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/map-google.js
git commit -m "Implement geolocation and bounds-fitting in Google engine

Mirrors Leaflet behavior: 14-zoom user-center, fitToAllMarkers cap 17,
fitBounds cap 16 (#2)."
```

**Deferred verification (after Phase 3):**
- "Find My Location" button shows blue dot, recenters
- Initial load fits all markers with similar padding to Leaflet
- After geolocation succeeds, map zooms to user + nearby parking

---

### Task 8: Update service worker to skip Google domains

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Bump cache version and update fetch handler**

In `sw.js`:

Change line 2:
```js
const CACHE_NAME = 'poi-map-v2.1.0';
```
to:
```js
const CACHE_NAME = 'poi-map-v2.2.0';
```

Replace the cross-origin filter (lines 50-53):

```js
    // Skip other cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) &&
        !event.request.url.startsWith('https://unpkg.com/leaflet') &&
        !event.request.url.startsWith('https://cdnjs.cloudflare.com/ajax/libs/font-awesome')) {
        return;
    }
```

with:

```js
    // Never cache or proxy Google Maps requests (Google ToS prohibits caching tiles)
    if (event.request.url.includes('maps.googleapis.com') ||
        event.request.url.includes('maps.gstatic.com')) {
        return;
    }

    // Skip other cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) &&
        !event.request.url.startsWith('https://unpkg.com/leaflet') &&
        !event.request.url.startsWith('https://cdnjs.cloudflare.com/ajax/libs/font-awesome')) {
        return;
    }
```

- [ ] **Step 2: Static syntax check**

```bash
node --check sw.js
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "Exclude Google Maps domains from service worker cache

Google ToS prohibits caching tiles. Cache version bumped to v2.2.0 (#2)."
```

---

## Phase 3 — Deploy infrastructure & docs

### Task 9: Add GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow file**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate config.js from secrets
        env:
          GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
          GOOGLE_MAPS_ID: ${{ secrets.GOOGLE_MAPS_ID }}
        run: |
          cat > config.js <<EOF
          window.APP_CONFIG = {
              GOOGLE_MAPS_API_KEY: '${GOOGLE_MAPS_API_KEY}',
              GOOGLE_MAPS_ID: '${GOOGLE_MAPS_ID}'
          };
          EOF

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: .

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions deploy workflow for GitHub Pages

Generates config.js from secrets at deploy time so the API key
never lives in the repo (#2)."
```

---

### Task 10: Update README with local dev setup

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read current `README.md`**

Run `cat README.md` to see what's already there. Identify the "Getting Started" / "Development" / "Setup" section (or equivalent).

- [ ] **Step 2: Add a "Local development" section**

Append (or insert into the appropriate section) the following:

```markdown
## Local development

This is a static site — no build step. To run locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### Map engines

The app supports two map engines:

- **Leaflet** (default) — uses CartoDB Voyager tiles, no API key needed.
- **Google Maps** — appended `?engine=google` to the URL. Requires an API key and Map ID.

To use Google Maps locally:

1. Copy the example config: `cp config.example.js config.local.js`
2. Edit `config.local.js` and paste your `GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_ID`
3. Open `http://localhost:8000?engine=google`

`config.local.js` and the deploy-generated `config.js` are gitignored.

### Production config

In production, `config.js` is generated by `.github/workflows/deploy.yml` from the
`GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_ID` repository secrets.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document Google Maps engine and local dev setup

How to run locally with either engine, where keys come from (#2)."
```

---

### Task 11: Final integration verification (deferred until secrets configured)

This is **not a code task** — it's a manual QA checklist to run after:
- API key + Map ID exist in Google Cloud
- GitHub repo secrets `GOOGLE_MAPS_API_KEY` and `GOOGLE_MAPS_ID` are set
- GitHub Pages source is changed to "GitHub Actions"
- This branch is opened as a PR and merged to `main` (or deploy is run from this branch via `workflow_dispatch`)

- [ ] **Step 1: Verify deploy succeeded**

Visit the deployed URL. Default load (no query string): Leaflet renders as before.

- [ ] **Step 2: Verify Google engine on production URL**

Visit `https://naoyawada.github.io/L5P-Parking/?engine=google`. DevTools Console: no errors. Verify each item below by clicking around:

- [ ] Map renders with Google's styled tiles (Map ID applied)
- [ ] All P markers visible at correct positions
- [ ] Auto-fit bounds shows all lots on initial load
- [ ] Clicking a marker → marker becomes yellow/dark/pulsing AND its list card highlights
- [ ] Clicking a list card → corresponding marker highlights
- [ ] Clicking empty map → both deselect
- [ ] "Find My Location" button (📍) → shows blue dot at user position, recenters
- [ ] Pinch-zoom on mobile works
- [ ] Two-finger pan on mobile works (cooperative gesture mode — single-finger should pass scroll through to page)
- [ ] No requests to `maps.googleapis.com` show up as cached by the service worker (Network tab → check "from ServiceWorker" column is empty for those)

- [ ] **Step 3: Verify localStorage stickiness**

After loading `?engine=google`, navigate to the bare URL — should stay on Google (because `localStorage.mapEngine` was set). Clearing localStorage and reloading bare URL → back to Leaflet default.

- [ ] **Step 4: Verify referrer restriction**

Open the Google Cloud Console → Credentials → your key. Confirm allowed referrers include `naoyawada.github.io/*` and `localhost:*`. As a smoke test, try loading `https://naoyawada.github.io/L5P-Parking/?engine=google` from a non-allowed origin (e.g., a CodePen `iframe` or different domain) and confirm Google rejects with `RefererNotAllowedMapError` in the console — keys are correctly locked down.

- [ ] **Step 5: Cutover decision**

Once all items above pass, open a follow-up PR that flips the default in `src/engine-loader.js`:

```js
const DEFAULT_ENGINE = 'google';
```

That PR also queues removal of `src/map.js` and the Leaflet branches in `engine-loader.js` and `sw.js` (separate PR after a stability period).

---

## Self-review notes

Reviewed against the spec: all components covered (config files, engine loader, map-google.js full API, service worker exclusion, deploy workflow, README). One spec item — `mapEngineReady` event — is implemented in `engine-loader.js` Task 3 and consumed in `app.js` Task 4 Step 3. The `window.POIMap` exposure (Task 4 Step 4 + Task 5 final line) ensures the readiness check works for both engines. No placeholders, type names match across tasks (`AdvancedMarkerElement`, `LatLngBounds`, `gmp-click`).
