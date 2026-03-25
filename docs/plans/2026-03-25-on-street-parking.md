# On-Street Parking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add on-street (metered/free) parking locations to the L5P Parking Map as polylines drawn along street segments, using the existing Google Sheet as the data source.

**Architecture:** On-street parking is added as new rows in the existing Google Sheet with `type` = "Street Parking", two new columns (`metered`, `timelimit`), and a pipe-delimited coordinate format in the `gps` column (e.g. `33.765,-84.348|33.766,-84.347`). The frontend detects this format and renders polylines on the map instead of point markers. A filter toggle lets users show/hide street parking. Cards show meter/time-limit info and use the polyline midpoint for distance calculations and directions.

**Tech Stack:** Vanilla JS, Leaflet.js, CSS3, Google Sheets CSV

**Related issue:** [#6 — Investigate adding on-street parking to the map](https://github.com/naoyawada/L5P-Parking/issues/6)

---

## GPS Format Convention

The `gps` column supports two formats:

| Format | Example | Used for |
|---|---|---|
| **Point** (existing) | `33.7650,-84.3485` | Parking lots — rendered as markers |
| **Polyline** (new) | `33.7650,-84.3485\|33.7655,-84.3480\|33.7658,-84.3475` | Street parking — rendered as polylines along the street |

Detection: if `gps` contains `|`, treat as polyline; otherwise treat as point. This is fully backwards-compatible — existing lot rows are unaffected.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/data.js` | Modify | Parse polyline GPS format, new `metered`/`timelimit` columns |
| `src/map.js` | Modify | Render polylines for street parking, handle polyline selection/deselection |
| `src/app.js` | Modify | Render street parking cards, wire up filter toggle |
| `src/utils.js` | Modify | Add polyline midpoint helper for distance calculation |
| `src/styles.css` | Modify | Polyline highlight styles (via CSS class), filter toggle styles |
| `index.html` | Modify | Add filter toggle UI element |
| Google Sheet | Modify | Add `metered`/`timelimit` columns, add street parking rows with polyline GPS |

---

## Task 1: Update Google Sheet Schema

**Context:** The Google Sheet (ID: `1OuKDgbthkc03pr87yIu21M5RCLMaIuEsGDGbkqoq8cc`) currently has columns: `id`, `name`, `description`, `address`, `gps`, `evcharging`, `rates`, `type`, `landmark`, `validation`, `contact`, `spaces`.

- [ ] **Step 1: Add new columns to the Google Sheet**

Open the Google Sheet and add two new columns after the existing ones:
- Column N (or next available): `metered` — values: "Yes" or "No"
- Column O (or next available): `timelimit` — free text, e.g. "2hr, Mon-Sat 8am-10pm"

- [ ] **Step 2: Add test street parking rows with polyline GPS**

Add 2-3 test rows to validate the pipeline. Use `type` = "Street Parking" for all. The `gps` column uses pipe-delimited coordinate pairs tracing the street segment.

To get polyline coordinates: in Google Maps, right-click the start of the street parking segment to copy coordinates, then right-click the end (and any midpoints for curved streets).

Example rows:

| id | name | description | address | gps | evcharging | rates | type | landmark | validation | contact | spaces | metered | timelimit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 101 | Moreland Ave NE - 1100 Block | Metered street parking near Findley Plaza | Moreland Ave NE | 33.7643,-84.3488\|33.7657,-84.3483 | No | $1.50/hr | Street Parking | Near Findley Plaza | No | | 12 | Yes | 2hr, Mon-Sat 8am-6pm |
| 102 | Euclid Ave NE - 400 Block | Free street parking | Euclid Ave NE | 33.7649,-84.3509\|33.7648,-84.3493 | No | Free | Street Parking | Near Criminal Records | No | | 8 | No | 2hr limit |
| 103 | Seminole Ave NE | Free residential street parking | Seminole Ave NE | 33.7665,-84.3480\|33.7658,-84.3476\|33.7652,-84.3474 | No | Free | Street Parking | | No | | | No | No limit |

Use IDs starting at 101+ to keep street parking IDs clearly separate from lot IDs.

---

## Task 2: Add Polyline Midpoint Helper in utils.js

**Files:**
- Modify: `src/utils.js` (add helper after `calculateDistancesToPOIs`)

- [ ] **Step 1: Add `getPolylineMidpoint` function**

In `src/utils.js`, add after the `calculateDistancesToPOIs` function (around line 55):

```js
// Get the midpoint of a polyline (array of [lat, lng] pairs)
// Uses the middle point for odd-length arrays, or averages the two middle points for even-length
function getPolylineMidpoint(coords) {
    if (!coords || coords.length === 0) return null;
    if (coords.length === 1) return { lat: coords[0][0], lng: coords[0][1] };

    const midIndex = Math.floor(coords.length / 2);
    if (coords.length % 2 === 1) {
        return { lat: coords[midIndex][0], lng: coords[midIndex][1] };
    }
    // Average the two middle points
    return {
        lat: (coords[midIndex - 1][0] + coords[midIndex][0]) / 2,
        lng: (coords[midIndex - 1][1] + coords[midIndex][1]) / 2
    };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils.js
git commit -m "feat: add polyline midpoint helper for street parking"
```

---

## Task 3: Parse Polyline GPS and New Fields in data.js

**Files:**
- Modify: `src/data.js:80-117` (the `rowToPOI` function)

- [ ] **Step 1: Update GPS parsing to detect polyline format**

In `src/data.js`, replace the `rowToPOI` function (lines 80-117) entirely:

```js
// Convert a sheet row into a POI object
function rowToPOI(row) {
    const gps = row.gps || '';
    if (!gps.includes(',')) return null;

    const type = row.type || 'Parking';
    const isStreetParking = type === 'Street Parking';

    // Parse GPS: polyline format "lat,lng|lat,lng|..." or point format "lat,lng"
    let lat, lng, coords;

    if (gps.includes('|')) {
        // Polyline: parse all coordinate pairs
        coords = gps.split('|').map(pair => {
            const [latStr, lngStr] = pair.trim().split(',');
            return [parseFloat(latStr), parseFloat(lngStr)];
        }).filter(([la, ln]) => !isNaN(la) && !isNaN(ln));

        if (coords.length < 2) return null;

        // Use midpoint for distance calculations and directions
        const mid = getPolylineMidpoint(coords);
        lat = mid.lat;
        lng = mid.lng;
    } else {
        // Single point
        const [latStr, lngStr] = gps.split(',');
        lat = parseFloat(latStr);
        lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) return null;
        coords = null;
    }

    const id = parseInt(row.id) || 0;
    const name = row.name || row.description || 'Unknown';
    const description = row.description || '';
    const address = row.address || '';
    const evCharging = (row.evcharging || '').toLowerCase() === 'yes';
    const rates = row.rates || '';
    const landmark = row.landmark || '';
    const validation = row.validation || '';
    const contact = row.contact || '';
    const spaces = parseInt(row.spaces) || null;
    const metered = (row.metered || '').toLowerCase() === 'yes';
    const timelimit = row.timelimit || '';

    return {
        id,
        name,
        category: type,
        description,
        rates,
        lat,
        lng,
        coords,
        address,
        evCharging,
        validation,
        landmark,
        contact,
        spaces,
        metered,
        timelimit
    };
}
```

Key changes:
- If `gps` contains `|`, split into an array of `[lat, lng]` pairs stored in `coords`
- `lat`/`lng` are set to the polyline midpoint (for distance calculations, directions link, and `fitBounds`)
- If `gps` is a single point, `coords` is `null` — all existing lot behavior is unchanged

- [ ] **Step 2: Verify by loading the app**

Open the app in a browser, open DevTools console, and run:
```js
getAllPOIs().filter(p => p.category === 'Street Parking').map(p => ({ name: p.name, coords: p.coords, lat: p.lat, lng: p.lng }))
```
Expected: returns the test rows with `coords` as arrays of `[lat, lng]` pairs, and `lat`/`lng` set to midpoints.

- [ ] **Step 3: Commit**

```bash
git add src/data.js
git commit -m "feat: parse polyline GPS format and new street parking fields"
```

---

## Task 4: Render Polylines on the Map in map.js

**Files:**
- Modify: `src/map.js` (constructor, `addPOIMarkers`, `selectPOI`, `deselectAll`, `clearPOIMarkers`)

- [ ] **Step 1: Add polyline layer tracking**

In the `POIMap` constructor (around line 7), add a new array for tracking polylines:

```js
this.streetPolylines = [];
```

- [ ] **Step 2: Add polyline style constants**

In the constructor, after the `selectedPoiIcon` definition (around line 61), add:

```js
// Street parking polyline styles
this.streetLineStyle = {
    color: '#2E7D32',
    weight: 6,
    opacity: 0.8,
    lineCap: 'round'
};

this.selectedStreetLineStyle = {
    color: '#4CAF50',
    weight: 8,
    opacity: 1.0,
    lineCap: 'round'
};
```

- [ ] **Step 3: Update `addPOIMarkers` to handle polylines**

Replace the `addPOIMarkers` method (around lines 190-211):

```js
// Add POI markers and polylines to map
addPOIMarkers(pois) {
    // Clear existing POI markers and polylines
    this.clearPOIMarkers();

    pois.forEach(poi => {
        if (poi.coords) {
            // Street parking: render as polyline
            const polyline = L.polyline(poi.coords, this.streetLineStyle).addTo(this.map);
            polyline.poiData = poi;
            this.streetPolylines.push(polyline);

            // Click polyline to select
            polyline.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                this.selectPOI(poi.id);
                window.dispatchEvent(new CustomEvent('poiMapClick', {
                    detail: { poiId: poi.id }
                }));
            });
        } else {
            // Lot parking: render as point marker
            const marker = L.marker([poi.lat, poi.lng], {
                icon: this.poiIcon
            }).addTo(this.map);

            marker.poiData = poi;
            this.poiMarkers.push(marker);

            marker.on('click', () => {
                this.selectPOI(poi.id);
                window.dispatchEvent(new CustomEvent('poiMapClick', {
                    detail: { poiId: poi.id }
                }));
            });
        }
    });
}
```

- [ ] **Step 4: Update `clearPOIMarkers` to also clear polylines**

Replace the `clearPOIMarkers` method (around lines 215-220):

```js
// Clear all POI markers and polylines
clearPOIMarkers() {
    this.poiMarkers.forEach(marker => {
        this.map.removeLayer(marker);
    });
    this.poiMarkers = [];

    this.streetPolylines.forEach(polyline => {
        this.map.removeLayer(polyline);
    });
    this.streetPolylines = [];
}
```

- [ ] **Step 5: Update `selectPOI` to handle polyline selection**

Replace the `selectPOI` method (around lines 223-241):

```js
// Select a specific POI on the map
selectPOI(poiId) {
    // Reset all markers to normal
    this.poiMarkers.forEach(marker => {
        marker.setIcon(this.poiIcon);
    });

    // Reset all polylines to normal
    this.streetPolylines.forEach(polyline => {
        polyline.setStyle(this.streetLineStyle);
    });

    // Check if selected POI is a polyline
    const selectedPolyline = this.streetPolylines.find(pl =>
        pl.poiData.id === poiId
    );

    if (selectedPolyline) {
        selectedPolyline.setStyle(this.selectedStreetLineStyle);
        selectedPolyline.bringToFront();
        this.selectedPOI = poiId;
        // Fit map to show the full polyline
        this.map.fitBounds(selectedPolyline.getBounds(), { padding: [50, 50], maxZoom: 18, animate: true });
        return;
    }

    // Otherwise check point markers
    const selectedMarker = this.poiMarkers.find(marker =>
        marker.poiData.id === poiId
    );

    if (selectedMarker) {
        selectedMarker.setIcon(this.selectedPoiIcon);
        this.selectedPOI = poiId;
        this.map.setView([selectedMarker.poiData.lat, selectedMarker.poiData.lng], 17, { animate: true });
    }
}
```

- [ ] **Step 6: Update `deselectAll` to handle polylines**

Replace the `deselectAll` method (around lines 269-277):

```js
// Deselect all markers, polylines, and cards
deselectAll() {
    this.poiMarkers.forEach(marker => {
        marker.setIcon(this.poiIcon);
    });
    this.streetPolylines.forEach(polyline => {
        polyline.setStyle(this.streetLineStyle);
    });
    this.selectedPOI = null;
    document.querySelectorAll('.poi-card').forEach(card => {
        card.classList.remove('active');
    });
}
```

- [ ] **Step 7: Verify polylines render correctly**

Reload the app. Street parking entries should appear as green lines along street segments. Lot entries should still show black "P" markers. Clicking a polyline should highlight it (brighter green, thicker). Clicking the map background should deselect.

- [ ] **Step 8: Commit**

```bash
git add src/map.js
git commit -m "feat: render street parking as polylines on the map"
```

---

## Task 5: Update Card Rendering in app.js

**Files:**
- Modify: `src/app.js:143-195` (the `createPOICard` method)

- [ ] **Step 1: Update `createPOICard` to show street parking info**

The card should show `metered` and `timelimit` for street parking instead of EV/validation icons. In `createPOICard()`, insert the amenity logic before the `card.innerHTML` assignment (before line 178), and update the template:

```js
// Build amenity section based on parking type
const isStreet = poi.category === 'Street Parking';
let amenityHtml;

if (isStreet) {
    const meteredIcon = poi.metered
        ? `<span class="amenity-icon available">
             <i class="fa-solid fa-fw fa-coins"></i><span class="amenity-label">Metered</span>
           </span>`
        : `<span class="amenity-icon available">
             <i class="fa-solid fa-fw fa-hand-holding-dollar"></i><span class="amenity-label">Free</span>
           </span>`;

    const timeLimitText = poi.timelimit
        ? `<span class="amenity-icon available">
             <i class="fa-solid fa-fw fa-clock"></i><span class="amenity-label">${poi.timelimit}</span>
           </span>`
        : '';

    amenityHtml = `${meteredIcon}${timeLimitText}`;
} else {
    amenityHtml = `${evIcon}${validateIcon}`;
}

// Create card content
card.innerHTML = `
    <div class="poi-card-header">
        <h3 class="poi-name">${poi.name}</h3>
        ${poi.formattedDistance ? `<span class="poi-distance">${poi.formattedDistance}</span>` : ''}
    </div>
    <p class="poi-category">${poi.category}</p>
    ${poi.address ? `<p class="poi-address"><i class="fa-solid fa-fw fa-map-pin"></i>${poi.address}</p>` : ''}
    ${poi.landmark ? `<p class="poi-landmark"><i class="fa-solid fa-fw fa-eye"></i>${poi.landmark}</p>` : ''}
    ${poi.spaces ? `<p class="poi-spaces"><i class="fa-solid fa-fw fa-car"></i>${poi.spaces} spaces</p>` : ''}
    ${poi.rates ? `<p class="poi-rates"><i class="fa-solid fa-fw fa-dollar-sign"></i>${poi.rates}</p>` : ''}
    <div class="poi-amenity-icons">${amenityHtml}</div>
    <a class="directions-btn" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.address || poi.lat + ',' + poi.lng)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        <i class="fa-solid fa-fw fa-diamond-turn-right"></i>Directions
    </a>
`;
```

Note: The `evIcon` and `validateIcon` variables (lines 154-175) remain unchanged — they're just only used for non-street parking now. The directions link uses `poi.lat`/`poi.lng` which is already set to the polyline midpoint in `data.js`.

- [ ] **Step 2: Verify card rendering**

Reload the app. Street parking cards should show "Metered"/"Free" and time limit info instead of EV/validation icons. Lot cards should be unchanged. Clicking a street parking card should highlight the polyline on the map.

- [ ] **Step 3: Commit**

```bash
git add src/app.js
git commit -m "feat: show metered/time-limit info on street parking cards"
```

---

## Task 6: Add Filter Toggle

**Files:**
- Modify: `index.html:38-42` (above the poi cards container)
- Modify: `src/styles.css` (new filter toggle styles)
- Modify: `src/app.js` (filter logic)

- [ ] **Step 1: Add filter toggle HTML**

In `index.html`, replace the `poiList` div (lines 38-42):

```html
<div id="poiList" class="poi-list">
    <div class="poi-cards">
        <p class="no-location">Enable location access to see nearby points of interest</p>
    </div>
</div>
```

With:

```html
<div id="poiList" class="poi-list">
    <div class="poi-filter-bar">
        <button id="filterAll" class="filter-btn active" data-filter="all">All</button>
        <button id="filterLots" class="filter-btn" data-filter="lots">Lots</button>
        <button id="filterStreet" class="filter-btn" data-filter="street">Street</button>
    </div>
    <div id="poiCards" class="poi-cards">
        <p class="no-location">Enable location access to see nearby points of interest</p>
    </div>
</div>
```

- [ ] **Step 2: Add filter bar styles**

In `src/styles.css`, add after the `.poi-list-header h2` block (around line 161):

```css
/* Filter Bar */
.poi-filter-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
    border-bottom: 1px solid #e0e0e0;
    flex-shrink: 0;
    background: white;
}

.filter-btn {
    flex: 1;
    padding: 0.4rem 0.75rem;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: white;
    color: #666;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.filter-btn:hover {
    background: #f5f5f5;
}

.filter-btn.active {
    background: #333;
    color: #FFD200;
    border-color: #333;
}
```

- [ ] **Step 3: Add filter state and logic to `POIApp`**

In `src/app.js`, add a `filter` property in the constructor (around line 7):

```js
this.activeFilter = 'all'; // 'all', 'lots', or 'street'
```

- [ ] **Step 4: Bind filter button events**

In `bindEvents()` in `src/app.js`, add after the existing event listeners (around line 63):

```js
// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        this.setFilter(btn.dataset.filter);
    });
});
```

- [ ] **Step 5: Add `setFilter` and `getFilteredPOIs` methods**

Add these methods to the `POIApp` class (after `updateDistanceInfo`):

```js
setFilter(filter) {
    this.activeFilter = filter;

    // Update button active states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Re-render list and markers with filter applied
    const pois = this.sortedPOIs.length > 0 ? this.sortedPOIs : getAllPOIs();
    const filtered = this.getFilteredPOIs(pois);
    this.displayPOIList(filtered);
    this.map.addPOIMarkers(filtered);
}

getFilteredPOIs(pois) {
    if (this.activeFilter === 'lots') {
        return pois.filter(poi => poi.category !== 'Street Parking');
    }
    if (this.activeFilter === 'street') {
        return pois.filter(poi => poi.category === 'Street Parking');
    }
    return pois;
}
```

- [ ] **Step 6: Apply filter in existing render paths**

Update `displayPOIList` calls throughout the class to apply filtering. In `updatePOIsWithDistances()`, change:

```js
// Update POI list
this.displayPOIList(this.sortedPOIs);
```

To:

```js
// Update POI list (apply active filter)
this.displayPOIList(this.getFilteredPOIs(this.sortedPOIs));
```

And in `init()`, change:

```js
// Display POIs in list (without distances initially)
this.displayPOIList(pois);
```

To:

```js
// Display POIs in list (without distances initially)
this.displayPOIList(this.getFilteredPOIs(pois));
```

Also update the marker call in `init()`:

```js
// Load POI markers (without distances)
this.map.addPOIMarkers(pois);
```

To:

```js
// Load POI markers (without distances)
this.map.addPOIMarkers(this.getFilteredPOIs(pois));
```

- [ ] **Step 7: Verify the filter**

Reload the app. The filter bar should appear above the card list. Clicking "Lots" should hide street polylines from the map and street cards from the list. Clicking "Street" should show only street polylines and cards. "All" shows everything.

- [ ] **Step 8: Commit**

```bash
git add index.html src/styles.css src/app.js
git commit -m "feat: add filter toggle to switch between lot and street parking"
```

---

## Task 7: Add Street Parking Data

This is the manual data-gathering step that happens outside the codebase.

- [ ] **Step 1: Survey L5P street parking**

Walk or use Google Street View to identify on-street parking along these streets in the L5P area:
- Moreland Ave NE (main corridor)
- Euclid Ave NE (main corridor)
- Seminole Ave NE
- Austin Ave NE
- Colquitt Ave NE

For each block segment, note:
- Block name (e.g., "Euclid Ave NE - 400 Block")
- GPS coordinates for the polyline: right-click in Google Maps at the start of the parking segment, copy coordinates, then do the same at the end. For curved streets, add a midpoint or two.
- Metered or free
- Rate (if metered)
- Time limit
- Approximate number of spaces
- Nearest landmark

- [ ] **Step 2: Enter data into Google Sheet**

Add each surveyed block as a row in the Google Sheet with:
- `type` = "Street Parking"
- `gps` = pipe-delimited coordinates, e.g. `33.7643,-84.3488|33.7657,-84.3483`
- Fill in `metered`, `timelimit`, `rates`, `spaces`, etc.

- [ ] **Step 3: Verify in the app**

Reload the app and confirm all new street parking entries appear as green polylines along the correct streets, with correct card details.

---

## Task 8: Final Polish

- [ ] **Step 1: Test polyline tap target on mobile**

Polylines can be hard to tap on mobile. If tapping is unreliable, increase `weight` in `streetLineStyle` from `6` to `8`, or add a transparent wider polyline behind the visible one as a hit target:

```js
// Invisible wide line for easier tapping
const hitTarget = L.polyline(poi.coords, {
    color: 'transparent',
    weight: 20,
    opacity: 0
}).addTo(this.map);
hitTarget.on('click', (e) => { /* same handler as visible polyline */ });
```

Only add this if testing reveals tap issues.

- [ ] **Step 2: Test mobile responsiveness**

Verify the filter bar doesn't break the layout on:
- iPhone SE (375px wide)
- Standard mobile (390px)
- Tablet (768px)
- Desktop (1200px+)

The filter buttons should remain equally sized and not wrap.

- [ ] **Step 3: Test selection sync with filter active**

With "Street" filter active:
1. Click a polyline on the map — corresponding card should highlight, map zooms to show full polyline
2. Click a street card — corresponding polyline should highlight
3. Click map background — both should deselect

With "Lots" filter active:
1. Polylines should not be visible on the map
2. Only lot markers and cards should show

- [ ] **Step 4: Verify distance sorting includes street parking**

Enable geolocation. Street parking entries should sort by distance (to their midpoint) alongside lot entries. The distance badge on the card should be accurate.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: polish street parking polylines and mobile layout"
```

- [ ] **Step 6: Close issue #6 with a summary comment**

```bash
gh issue comment 6 --body "Implemented on-street parking support:
- Street parking stored as polyline coordinates in Google Sheet gps column (pipe-delimited)
- Green polylines rendered on map along street segments
- Filter toggle (All / Lots / Street) in the card list
- Cards show metered/free status and time limits for street parking
- Distance calculated to polyline midpoint for sorting"
```
