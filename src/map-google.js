// Map functionality using Google Maps JavaScript SDK.
// Public API mirrors src/map.js so app.js works with either engine.
class POIMap {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = []; // each: { marker: AdvancedMarkerElement, poi: {...} }
        this.userLocation = null;
        this.selectedPOI = null;
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

        // Resolve any operations queued before init finished
        this._readyResolvers.forEach(fn => fn());
        this._readyResolvers = [];
    }

    // Helper: ensure libraries are loaded before any operation
    _whenReady() {
        if (this.map) return Promise.resolve();
        return new Promise(resolve => this._readyResolvers.push(resolve));
    }

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
            // Match Leaflet behavior: setView always snaps zoom to 17
            this.map.setZoom(17);
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
