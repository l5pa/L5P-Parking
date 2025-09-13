// Upper Westside Atlanta Parking & Points of Interest
// Based on the Upper Westside CID parking map area
const POINTS_OF_INTEREST = [
    {
        id: 1,
        name: "Candler Park Market",
        category: "Parking Garage",
        description: "Multi-level parking garage serving the cultural district. $2/hour, EV charging available.",
        lat: 33.76502,
        lng: −84.33357,
        address: "1642 McLendon Ave NE, Atlanta, GA 30307",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 4
    },
    {
        id: 2,
        name: "Moxie Burger",
        category: "Surface Parking",
        description: "Free parking for customers, metered street parking available. Bike parking included.",
        lat: 33.76256,
        lng: -84.33334,
        address: "1660 DeKalb Ave NE Unit 150, Atlanta, GA 30307",
        evCharging: false,
        bikeParking: true
    },
    {
        id: 3,
        name: "Sean's Candler Park",
        category: "Surface Parking",
        description: "Shared retail parking, free for first 2 hours with validation. EV charging stations.",
        lat: 33.76502,
        lng: -84.34186,
        address: "1394 McLendon Ave NE, Atlanta, GA 30307",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 2
    },
    {
        id: 4,
        name: "The Brewhouse Cafe",
        category: "Trail Parking",
        description: "Free parking for Beltline access. Popular with cyclists and joggers. Limited spaces.",
        lat: 33.7652168,
        lng: -84.3488377,
        address: "401 Moreland Ave NE, Atlanta, GA 30307",
        evCharging: false,
        bikeParking: true
    },
    {
        id: 5,
        name: "The Porter Beer Bar",
        category: "Parking Garage",
        description: "Covered parking for shopping and dining. $1/hour, free after 6PM weekdays.",
        lat: 33.76517,
        lng: -84.34968,
        address: "1156 Euclid Ave NE, Atlanta, GA 30307",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 6,
        bikeParking: true
    }
];

// Function to get all POI data
function getAllPOIs() {
    return POINTS_OF_INTEREST;
}

// Function to get POI by ID
function getPOIById(id) {
    return POINTS_OF_INTEREST.find(poi => poi.id === id);
}