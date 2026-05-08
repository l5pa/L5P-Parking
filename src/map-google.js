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
    async fitToAllMarkers() {}
    async fitBounds(_userLat, _userLng, _pois, _maxDistanceMiles = 3) {}

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
