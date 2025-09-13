# Atlanta Upper Westside Parking Map

A mobile-first Progressive Web App for finding parking in Atlanta's Upper Westside with EV charging information.

## 🚀 Live Demo
**[https://naoyawada.github.io/L5P-Parking/](https://naoyawada.github.io/L5P-Parking/)**

*Access the live app directly in your browser - works best on mobile devices!*

## Features

🅿️ **5 Parking Locations**: Comprehensive coverage of Upper Westside Atlanta parking
⚡ **EV Charging Info**: Level 2 and DC Fast Charging availability with station counts
🚲 **Bike Parking**: Locations with secure bike storage
📱 **Mobile-First**: Optimized touch controls and responsive design
📍 **Real-time Location**: Automatic geolocation with distance calculations  
🎯 **Distance Sorting**: Parking sorted by proximity in miles
💜 **Purple Theme**: Clean, modern UI with professional badge design
🗺️ **Interactive Map**: Leaflet.js mapping with touch-optimized controls
💾 **Offline PWA**: Install on mobile devices, works offline
🔄 **Live Updates**: Location tracking as you move around the area

## Getting Started

### Prerequisites
- Modern web browser with geolocation support
- Local web server (for HTTPS geolocation requirements)

### Installation

1. Clone or download the project files
2. Navigate to the project directory:
   ```bash
   cd poi-map-app
   ```

3. Start a local development server:
   ```bash
   npm run dev
   ```
   Or use Python:
   ```bash
   python3 -m http.server 8000
   ```

4. Open your browser and visit:
   - `http://localhost:8000` (Python server)
   - Or the URL shown by your development server

### HTTPS for Geolocation

For geolocation to work properly, the app needs to be served over HTTPS. For local development, you can:

1. Use a local HTTPS server
2. Use browser flags for testing (not recommended for production)
3. Deploy to a hosting service that provides HTTPS

## Usage

1. **Allow Location Access**: Grant location permissions when prompted
2. **View Map**: See your location (blue marker) and nearby POIs (red pins)  
3. **Browse List**: Scroll through nearby locations sorted by distance
4. **Select POI**: Click on map markers or list items to highlight locations
5. **Refresh Location**: Use the 📍 button to update your current position

## Project Structure

```
poi-map-app/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                  # Service worker
├── package.json           # Project configuration
├── src/
│   ├── app.js            # Main application logic
│   ├── map.js            # Map functionality (Leaflet)
│   ├── utils.js          # Utility functions
│   ├── data.js           # Mock POI database
│   └── styles.css        # CSS styles
└── assets/
    └── generate-icons.html # Icon generator utility
```

## Customization

### Adding New POI Data

Edit `src/data.js` to add your own points of interest:

```javascript
{
    id: 16,
    name: "Your POI Name",
    category: "Category",
    description: "Description of the location",
    lat: 40.7589,  // Latitude
    lng: -73.9851, // Longitude
    address: "Optional address"
}
```

### Styling

Modify `src/styles.css` to customize the appearance:
- Colors and themes
- Mobile responsiveness
- Card layouts
- Map styling

### Map Configuration

Edit `src/map.js` to customize:
- Map tile providers
- Marker icons
- Default zoom levels
- Map bounds

## Technical Details

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Map Library**: Leaflet.js
- **Geolocation**: HTML5 Geolocation API
- **PWA**: Service Worker, Web App Manifest
- **Distance Calculation**: Haversine formula
- **Responsive**: CSS Grid, Flexbox, Media Queries

## Browser Support

- Chrome/Safari (iOS): ✅ Full support
- Chrome (Android): ✅ Full support  
- Firefox: ✅ Full support
- Safari (macOS): ✅ Full support
- Edge: ✅ Full support

## Known Limitations

- Geolocation requires HTTPS in production
- Some browsers may require user interaction for location access
- Location accuracy depends on device GPS/WiFi capabilities
- Offline functionality limited to cached content

## Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Custom POI categories
- [ ] Search functionality
- [ ] Route planning
- [ ] POI reviews and ratings
- [ ] Push notifications
- [ ] Multi-language support

## License

MIT License - see LICENSE file for details