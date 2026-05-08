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
