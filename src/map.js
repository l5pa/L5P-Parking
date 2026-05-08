// Map functionality using Leaflet
class POIMap {
    constructor() {
        this.map = null;
        this.userMarker = null;
        this.poiMarkers = [];
        this.userLocation = null;
        this.selectedPOI = null;
        
        this.initMap();
    }
    
    initMap() {
        // Initialize map centered on NYC (default location)
        const isMobile = window.innerWidth < 768;
        
        this.map = L.map('map', {
            center: [33.7648, -84.3490], // Little Five Points Atlanta
            zoom: 14,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: !isMobile, // Disable scroll wheel on mobile to prevent conflicts
            doubleClickZoom: true,
            touchZoom: true, // Enable pinch-to-zoom
            dragging: true, // Enable map dragging
            tap: true,
            tapTolerance: 15,
            keyboard: false,
            boxZoom: !isMobile // Only on desktop
        });
        
        // CartoDB Voyager tile layer (free, no API key, shows business names)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
        }).addTo(this.map);
        
        // Custom user location marker
        this.userLocationIcon = L.divIcon({
            html: '<div class="user-location-marker"></div>',
            className: 'custom-user-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Custom POI marker
        this.poiIcon = L.divIcon({
            html: '<div class="poi-marker">P</div>',
            className: 'custom-poi-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        // Selected POI marker
        this.selectedPoiIcon = L.divIcon({
            html: '<div class="selected-poi-marker">P</div>',
            className: 'custom-selected-marker',
            iconSize: [35, 35],
            iconAnchor: [17, 17]
        });
        
        // Click on map background to deselect
        this.map.on('click', () => {
            this.deselectAll();
        });

        // Fix mobile touch scrolling issues
        this.fixMobileTouchHandling();
    }
    
    fixMobileTouchHandling() {
        const mapContainer = document.getElementById('mapContainer');
        if (!mapContainer) return;
        
        const isMobile = () => window.innerWidth < 768;
        
        // Handle window resize to adjust controls and features
        window.addEventListener('resize', () => {
            const mobile = isMobile();
            
            if (mobile) {
                // On mobile: disable scroll wheel but keep touch interactions
                this.map.scrollWheelZoom.disable();
                this.map.boxZoom.disable();
            } else {
                // On desktop: enable all features
                this.map.scrollWheelZoom.enable();
                this.map.boxZoom.enable();
            }
        });
        
        // Initial setup based on current screen size
        if (isMobile()) {
            this.map.scrollWheelZoom.disable();
            this.map.boxZoom.disable();
        }
    }
    
    // Update user location on map
    updateUserLocation(lat, lng) {
        this.userLocation = { lat, lng };
        
        // Remove existing user marker
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }
        
        // Add new user marker
        this.userMarker = L.marker([lat, lng], { 
            icon: this.userLocationIcon,
            zIndexOffset: 1000
        }).addTo(this.map);
        
        // Center map on user location
        this.map.setView([lat, lng], 14);
    }
    
    // Add POI markers to map
    addPOIMarkers(pois) {
        // Clear existing POI markers
        this.clearPOIMarkers();

        pois.forEach(poi => {
            const marker = L.marker([poi.lat, poi.lng], {
                icon: this.poiIcon
            }).addTo(this.map);

            // Store reference to marker with POI data
            marker.poiData = poi;
            this.poiMarkers.push(marker);

            // Add click event to highlight corresponding list item
            marker.on('click', () => {
                this.selectPOI(poi.id);
                // Trigger custom event for list synchronization
                window.dispatchEvent(new CustomEvent('poiMapClick', {
                    detail: { poiId: poi.id }
                }));
            });
        });

        // Fit map to show all markers
        this.fitToAllMarkers();
    }

    // Fit map view to show all POI markers
    fitToAllMarkers() {
        if (this.poiMarkers.length === 0) return;

        const bounds = L.latLngBounds(
            this.poiMarkers.map(marker => marker.getLatLng())
        );

        this.map.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 17
        });
    }
    
    // Clear all POI markers
    clearPOIMarkers() {
        this.poiMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.poiMarkers = [];
    }
    
    // Select a specific POI on the map
    selectPOI(poiId) {
        // Reset all markers to normal
        this.poiMarkers.forEach(marker => {
            marker.setIcon(this.poiIcon);
        });
        
        // Find and highlight selected POI
        const selectedMarker = this.poiMarkers.find(marker => 
            marker.poiData.id === poiId
        );
        
        if (selectedMarker) {
            selectedMarker.setIcon(this.selectedPoiIcon);
            this.selectedPOI = poiId;

            // Center map on selected marker
            this.map.setView([selectedMarker.poiData.lat, selectedMarker.poiData.lng], 17, { animate: true });
        }
    }
    
    // Fit map view to show user location and nearby POIs
    // maxDistance is in miles for external API consistency
    fitBounds(userLat, userLng, pois, maxDistanceMiles = 3) {
        if (!pois || pois.length === 0) return;
        
        // Filter POIs within maxDistance (convert miles -> km since poi.distance is in km)
        const nearbyPois = pois.filter(poi => poi.distance <= milesToKm(maxDistanceMiles));
        
        if (nearbyPois.length === 0) return;
        
        // Create bounds including user location and nearby POIs
        const bounds = L.latLngBounds();
        bounds.extend([userLat, userLng]);
        
        nearbyPois.forEach(poi => {
            bounds.extend([poi.lat, poi.lng]);
        });
        
        // Fit map to bounds with padding
        this.map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 16
        });
    }
    
    // Deselect all markers and cards
    deselectAll() {
        this.poiMarkers.forEach(marker => {
            marker.setIcon(this.poiIcon);
        });
        this.selectedPOI = null;
        document.querySelectorAll('.poi-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    // Get current map center
    getCenter() {
        const center = this.map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng
        };
    }
    
    // Get current map bounds
    getBounds() {
        const bounds = this.map.getBounds();
        return {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };
    }
}

window.POIMap = POIMap;
