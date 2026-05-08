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
    
    async init() {
        // Initialize map
        this.map = new POIMap();

        // Bind event listeners
        this.bindEvents();

        // Show loading state while fetching data
        this.showDataLoading();

        // Fetch data from Google Sheet
        const pois = await fetchSheetData();

        // Load POI markers (without distances)
        this.map.addPOIMarkers(pois);

        // Display POIs in list (without distances initially)
        this.displayPOIList(pois);

        // Track page load with lot count
        gtag('event', 'page_load', { lot_count: pois.length });

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
            const poi = getPOIById(event.detail.poiId);
            gtag('event', 'select_lot', { lot_id: event.detail.poiId, lot_name: poi?.name, source: 'marker' });
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
            gtag('event', 'location_granted');

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
            const eventName = error.code === 1 ? 'location_denied' : 'location_error';
            gtag('event', eventName, { error_code: error.code, error_message: error.message });
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
            this.selectPOI(poi.id, index);
        });
        
        // Create amenity icons with labels
        const evIcon = poi.evCharging
            ? `<span class="amenity-icon available">
                 <i class="fa-solid fa-fw fa-bolt"></i><span class="amenity-label">EV Charging</span>
               </span>`
            : `<span class="amenity-icon unavailable">
                 <span class="fa-stack">
                   <i class="fa-solid fa-bolt fa-stack-1x"></i>
                   <i class="fa-solid fa-ban fa-stack-2x"></i>
                 </span><span class="amenity-label">No EV Charging</span>
               </span>`;

        const hasValidation = poi.validation && poi.validation.toLowerCase() !== 'no';
        const validateIcon = hasValidation
            ? `<span class="amenity-icon available">
                 <i class="fa-solid fa-fw fa-ticket"></i><span class="amenity-label">Validation</span>
               </span>`
            : `<span class="amenity-icon unavailable">
                 <span class="fa-stack">
                   <i class="fa-solid fa-ticket fa-stack-1x"></i>
                   <i class="fa-solid fa-ban fa-stack-2x"></i>
                 </span><span class="amenity-label">No Validation</span>
               </span>`;

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
            <div class="poi-amenity-icons">${evIcon}${validateIcon}</div>
            <a class="directions-btn" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.address || poi.lat + ',' + poi.lng)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
                <i class="fa-solid fa-fw fa-diamond-turn-right"></i>Directions
            </a>
        `;

        card.querySelector('.directions-btn')?.addEventListener('click', () => {
            gtag('event', 'get_directions', { lot_id: poi.id, lot_name: poi.name });
        });

        return card;
    }
    
    selectPOI(poiId, cardIndex) {
        const poi = getPOIById(poiId);
        gtag('event', 'select_lot', { lot_id: poiId, lot_name: poi?.name, source: 'card', card_position: cardIndex });

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
    
    showDataLoading() {
        const poiCards = document.getElementById('poiCards');
        if (poiCards) {
            poiCards.innerHTML = '<p class="no-location">Loading parking data...</p>';
        }
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
