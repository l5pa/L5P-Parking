// Main application logic
class POIApp {
    constructor() {
        this.map = null;
        this.userLocation = null;
        this.sortedPOIs = [];
        this.watchId = null;
        
        this.initializeApp();
    }
    
    initializeApp() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        // Initialize map
        this.map = new POIMap();
        
        // Bind event listeners
        this.bindEvents();
        
        // Load initial POI markers (without distances)
        const pois = getAllPOIs();
        this.map.addPOIMarkers(pois);
        
        // Display POIs in list (without distances initially)
        this.displayPOIList(pois);
        
        // Try to get user location automatically
        this.getUserLocation();
    }
    
    bindEvents() {
        // Location button click
        const locationBtn = document.getElementById('locationBtn');
        locationBtn?.addEventListener('click', () => {
            this.getUserLocation(true); // Force refresh
        });
        
        // Listen for map POI clicks
        window.addEventListener('poiMapClick', (event) => {
            this.selectPOIInList(event.detail.poiId);
        });
        
        // Handle visibility change to manage location watching
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopLocationWatch();
            } else if (this.userLocation) {
                this.startLocationWatch();
            }
        });
    }
    
    async getUserLocation(forceRefresh = false) {
        showLoading();
        
        try {
            // Get current location
            const location = await getCurrentLocation({
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: forceRefresh ? 0 : 60000
            });
            
            this.userLocation = location;
            
            // Update map with user location
            this.map.updateUserLocation(location.lat, location.lng);
            
            // Calculate distances and update POI list
            this.updatePOIsWithDistances();
            
            // Start watching location for updates
            this.startLocationWatch();
            
            // Update distance info in header
            this.updateDistanceInfo();
            
        } catch (error) {
            console.error('Location error:', error);
            this.handleLocationError(error);
        } finally {
            hideLoading();
        }
    }
    
    updatePOIsWithDistances() {
        if (!this.userLocation) return;
        
        // Calculate distances to all POIs
        const pois = getAllPOIs();
        this.sortedPOIs = calculateDistancesToPOIs(
            this.userLocation.lat, 
            this.userLocation.lng, 
            pois
        );
        
        // Update map markers with distance info
        this.map.addPOIMarkers(this.sortedPOIs);
        
        // Fit map to show nearby POIs
        this.map.fitBounds(this.userLocation.lat, this.userLocation.lng, this.sortedPOIs);
        
        // Update POI list
        this.displayPOIList(this.sortedPOIs);
    }
    
    displayPOIList(pois) {
        const poiCards = document.getElementById('poiCards');
        if (!poiCards) return;
        
        // Clear existing content
        poiCards.innerHTML = '';
        
        if (!pois || pois.length === 0) {
            poiCards.innerHTML = '<p class="no-location">No points of interest found.</p>';
            return;
        }
        
        if (!this.userLocation) {
            poiCards.innerHTML = '<p class="no-location">Enable location access to see distances and get personalized recommendations.</p>';
        }
        
        // Create POI cards
        pois.forEach((poi, index) => {
            const card = this.createPOICard(poi, index);
            poiCards.appendChild(card);
        });
    }
    
    createPOICard(poi, index) {
        const card = document.createElement('div');
        card.className = 'poi-card';
        card.dataset.poiId = poi.id;
        
        // Add click handler
        card.addEventListener('click', () => {
            this.selectPOI(poi.id);
        });
        
        // Create amenities badges
        let amenitiesBadges = '';
        if (poi.evCharging) {
            const stationText = poi.chargingStations ? `${poi.chargingStations} stations` : '';
            const badgeText = poi.chargingType === 'DC Fast Charging' ? 'Fast Charging' : 'EV Charging';
            amenitiesBadges += `<span class="amenity-badge ev-charging" title="EV Charging: ${poi.chargingType || 'Available'}${stationText ? ' - ' + stationText : ''}">${badgeText}</span>`;
        }
        if (poi.bikeParking) {
            amenitiesBadges += `<span class="amenity-badge bike-parking" title="Bike Parking Available">Bike Parking</span>`;
        }
        
        // Create card content
        card.innerHTML = `
            <div class="poi-card-header">
                <h3 class="poi-name">${poi.name}</h3>
                ${poi.formattedDistance ? `<span class="poi-distance">${poi.formattedDistance}</span>` : ''}
            </div>
            <p class="poi-category">${poi.category}</p>
            <p class="poi-description">${poi.description}</p>
            ${amenitiesBadges ? `<div class="poi-amenities">${amenitiesBadges}</div>` : ''}
        `;
        
        return card;
    }
    
    selectPOI(poiId) {
        // Update visual selection in list
        this.selectPOIInList(poiId);
        
        // Update map selection
        this.map.selectPOI(poiId);
    }
    
    selectPOIInList(poiId) {
        // Remove active class from all cards
        document.querySelectorAll('.poi-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Add active class to selected card
        const selectedCard = document.querySelector(`[data-poi-id="${poiId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('active');
            
            // Scroll card into view
            selectedCard.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
    
    startLocationWatch() {
        if (this.watchId) return; // Already watching
        
        this.watchId = watchPosition(
            // Success callback
            debounce((location) => {
                const distanceKm = calculateDistance(
                    this.userLocation.lat, 
                    this.userLocation.lng,
                    location.lat, 
                    location.lng
                );
                const distanceMi = kmToMiles(distanceKm);
                
                // Only update if user moved significantly (> ~0.03 miles ≈ 50 meters)
                const MOVEMENT_THRESHOLD_MI = 0.03;
                if (distanceMi > MOVEMENT_THRESHOLD_MI) {
                    this.userLocation = location;
                    this.map.updateUserLocation(location.lat, location.lng);
                    this.updatePOIsWithDistances();
                    this.updateDistanceInfo();
                }
            }, 2000),
            
            // Error callback
            (error) => {
                console.warn('Location watch error:', error);
                this.stopLocationWatch();
            },
            
            // Options
            {
                enableHighAccuracy: false, // Less battery intensive
                timeout: 20000,
                maximumAge: 30000
            }
        );
    }
    
    stopLocationWatch() {
        if (this.watchId) {
            stopWatchingPosition(this.watchId);
            this.watchId = null;
        }
    }
    
    updateDistanceInfo() {
        const distanceInfo = document.getElementById('distanceInfo');
        if (!distanceInfo || !this.sortedPOIs || this.sortedPOIs.length === 0) return;
        
        const closestDistance = this.sortedPOIs[0]?.formattedDistance;
        if (closestDistance) {
            distanceInfo.textContent = `Closest: ${closestDistance}`;
        }
    }
    
    handleLocationError(error) {
        const poiCards = document.getElementById('poiCards');
        if (!poiCards) return;
        
        let errorMessage;
        if (error.message.includes('denied')) {
            errorMessage = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="margin-bottom: 1rem;">📍 Location access is required to show nearby points of interest.</p>
                    <p style="font-size: 0.9rem; color: #666;">Please enable location permissions in your browser settings and refresh the page.</p>
                </div>
            `;
        } else {
            errorMessage = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="margin-bottom: 1rem;">❌ Unable to get your location.</p>
                    <p style="font-size: 0.9rem; color: #666;">${error.message}</p>
                    <button onclick="window.app.getUserLocation(true)" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
                </div>
            `;
        }
        
        poiCards.innerHTML = errorMessage;
    }
}

// Initialize app when page loads
window.app = new POIApp();

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
