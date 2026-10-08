// Utility functions for geolocation and distance calculations

// Haversine formula to calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Unit conversion helpers
function kmToMiles(km) {
    return km * 0.621371;
}

function milesToKm(miles) {
    return miles / 0.621371;
}

// Format distance for display (miles)
// Note: internal calculations are in kilometers; convert for display
function formatDistance(distanceKm) {
    const miles = kmToMiles(distanceKm); // km -> mi
    if (miles < 10) {
        return miles.toFixed(1) + 'mi';
    } else {
        return Math.round(miles) + 'mi';
    }
}

// Calculate distances from user location to all POIs and sort by distance
function calculateDistancesToPOIs(userLat, userLng, pois) {
    return pois.map(poi => {
        const distance = calculateDistance(userLat, userLng, poi.lat, poi.lng);
        return {
            ...poi,
            distance: distance,
            formattedDistance: formatDistance(distance)
        };
    }).sort((a, b) => a.distance - b.distance);
}

// Get user's current location using Geolocation API
function getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000 // Cache position for 1 minute
        };

        const finalOptions = { ...defaultOptions, ...options };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                    default:
                        errorMessage = 'An unknown error occurred';
                        break;
                }
                reject(new Error(errorMessage));
            },
            finalOptions
        );
    });
}

// Watch user's position for continuous updates
function watchPosition(callback, errorCallback, options = {}) {
    if (!navigator.geolocation) {
        errorCallback(new Error('Geolocation is not supported by this browser'));
        return null;
    }

    const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // Cache position for 30 seconds
    };

    const finalOptions = { ...defaultOptions, ...options };

    return navigator.geolocation.watchPosition(
        (position) => {
            callback({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            });
        },
        errorCallback,
        finalOptions
    );
}

// Stop watching position
function stopWatchingPosition(watchId) {
    if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
    }
}

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show loading state
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
}

// Send a GA4 event; no-op if gtag is blocked or not loaded
function track(eventName, params = {}) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, params);
    }
}

// Hide loading state
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}
