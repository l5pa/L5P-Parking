// Upper Westside Atlanta Parking & Points of Interest
// Based on the Upper Westside CID parking map area
const POINTS_OF_INTEREST = [
    {
        id: 1,
        name: "The Westside Cultural Arts Center",
        category: "Parking Garage",
        description: "Multi-level parking garage serving the cultural district. $2/hour, EV charging available.",
        lat: 33.7839,
        lng: -84.4092,
        address: "760 10th St NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 4
    },
    {
        id: 2,
        name: "King of Pops Factory Parking",
        category: "Surface Parking",
        description: "Free parking for customers, metered street parking available. Bike parking included.",
        lat: 33.7851,
        lng: -84.4089,
        address: "1025 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: false,
        bikeParking: true
    },
    {
        id: 3,
        name: "West Elm Parking Lot",
        category: "Surface Parking",
        description: "Shared retail parking, free for first 2 hours with validation. EV charging stations.",
        lat: 33.7865,
        lng: -84.4101,
        address: "1000 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 2
    },
    {
        id: 4,
        name: "Beltline Westside Trail Parking",
        category: "Trail Parking",
        description: "Free parking for Beltline access. Popular with cyclists and joggers. Limited spaces.",
        lat: 33.7823,
        lng: -84.4067,
        address: "Howell Mill Rd & 10th St, Atlanta, GA 30318",
        evCharging: false,
        bikeParking: true
    },
    {
        id: 5,
        name: "Westside Provisions District Garage",
        category: "Parking Garage",
        description: "Covered parking for shopping and dining. $1/hour, free after 6PM weekdays.",
        lat: 33.7887,
        lng: -84.4123,
        address: "1198 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 6,
        bikeParking: true
    },
    {
        id: 6,
        name: "Miller Union Restaurant Valet",
        category: "Valet Parking",
        description: "Complimentary valet parking for dinner guests. Self-parking also available nearby.",
        lat: 33.7881,
        lng: -84.4119,
        address: "999 Brady Ave NW, Atlanta, GA 30318",
        evCharging: false
    },
    {
        id: 7,
        name: "Topgolf Atlanta Midtown Parking",
        category: "Entertainment Parking",
        description: "Large parking garage for entertainment venue. $5 flat rate, valet available.",
        lat: 33.7902,
        lng: -84.4134,
        address: "1600 Ellsworth Industrial Blvd NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "DC Fast Charging",
        chargingStations: 8
    },
    {
        id: 8,
        name: "Star Provisions Parking",
        category: "Surface Parking",
        description: "Free customer parking for gourmet market and café. Street parking also available.",
        lat: 33.7889,
        lng: -84.4121,
        address: "1198 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: false
    },
    {
        id: 9,
        name: "JCT Kitchen Parking Area",
        category: "Restaurant Parking",
        description: "Shared parking with nearby businesses. Free evenings, metered during business hours.",
        lat: 33.7876,
        lng: -84.4115,
        address: "1198 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: false
    },
    {
        id: 10,
        name: "White Provision Building Parking",
        category: "Mixed Use Parking",
        description: "Historic building with modern parking. Hourly rates, monthly passes available.",
        lat: 33.7893,
        lng: -84.4127,
        address: "1170 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 3
    },
    {
        id: 11,
        name: "Chattahoochee Food Works Parking",
        category: "Food Hall Parking",
        description: "Free parking for food hall visitors. Bike parking and ride-share pickup zone.",
        lat: 33.7847,
        lng: -84.4085,
        address: "1235 Chattahoochee Ave NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 3,
        bikeParking: true
    },
    {
        id: 12,
        name: "Brady Ave Street Parking",
        category: "Street Parking",
        description: "Metered street parking along Brady Avenue. $1.50/hour, 2-hour limit during business hours.",
        lat: 33.7878,
        lng: -84.4117,
        address: "Brady Ave NW, Atlanta, GA 30318",
        evCharging: false
    },
    {
        id: 13,
        name: "Westside Motor Lounge Parking",
        category: "Entertainment Parking",
        description: "Free parking for venue patrons. Valet available for special events.",
        lat: 33.7871,
        lng: -84.4108,
        address: "1000 Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: false
    },
    {
        id: 14,
        name: "IKEA Atlanta Parking Garage",
        category: "Retail Parking",
        description: "Massive free parking garage for shoppers. Multiple levels, clearly marked sections.",
        lat: 33.7825,
        lng: -84.4045,
        address: "441 16th St NW, Atlanta, GA 30363",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 12,
        bikeParking: true
    },
    {
        id: 15,
        name: "Howell Mill Road Park & Ride",
        category: "Transit Parking",
        description: "Public parking with MARTA connections. Daily rates available, secure bike storage.",
        lat: 33.7861,
        lng: -84.4096,
        address: "Howell Mill Rd NW, Atlanta, GA 30318",
        evCharging: true,
        chargingType: "Level 2",
        chargingStations: 10,
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