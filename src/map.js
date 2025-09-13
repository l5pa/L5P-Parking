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
            center: [33.7861, -84.4096], // Upper Westside Atlanta
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
        
        // Add Google Maps-style tile layer
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
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
        
        // Add custom CSS for markers
        this.addMarkerStyles();
        
        // Fix mobile touch scrolling issues
        this.fixMobileTouchHandling();
    }
    
    addMarkerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .user-location-marker {
                background: #4285F4;
                border: 3px solid white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
                background: #4285F4;
                border: 2px solid white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                color: white;
                font-weight: bold;
                font-size: 14px;
                font-family: Arial, sans-serif;
            }

            .selected-poi-marker {
                background: #34A853;
                border: 2px solid white;
                border-radius: 50%;
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                color: white;
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
        `;
        document.head.appendChild(style);
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
            
            // Create amenities for popup
            let amenitiesHtml = '';
            if (poi.evCharging || poi.bikeParking) {
                amenitiesHtml = '<div class="popup-amenities">';
                if (poi.evCharging) {
                    const stationInfo = poi.chargingStations ? ` (${poi.chargingStations} stations)` : '';
                    amenitiesHtml += `<span class="popup-amenity">⚡ ${poi.chargingType || 'EV Charging'}${stationInfo}</span>`;
                }
                if (poi.bikeParking) {
                    amenitiesHtml += `<span class="popup-amenity">🚲 Bike Parking</span>`;
                }
                amenitiesHtml += '</div>';
            }
            
            // Create popup content
            const popupContent = `
                <div class="poi-popup">
                    <h3>${poi.name}</h3>
                    <p class="poi-category">${poi.category}</p>
                    ${amenitiesHtml}
                    <p class="poi-description">${poi.description}</p>
                    ${poi.formattedDistance ? `<p class="poi-distance">📍 ${poi.formattedDistance} away</p>` : ''}
                </div>
            `;
            
            marker.bindPopup(popupContent);
            
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
            
            // Center map on selected POI
            this.map.setView([selectedMarker.poiData.lat, selectedMarker.poiData.lng], 15);
            
            // Open popup
            selectedMarker.openPopup();
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
