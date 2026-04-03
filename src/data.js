// Google Sheets data source for parking locations
const SHEET_ID = '1mgFIVxn9EchB3yvChwuVWXYJXHJiI9N7OWXScpRSsVc';
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

let POINTS_OF_INTEREST = [];
let dataLoaded = false;

// Split CSV text into logical rows, handling quoted fields with newlines
function splitCSVRows(csvText) {
    const rows = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        if (char === '\n' && !inQuotes) {
            rows.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) rows.push(current);
    return rows;
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const rows = splitCSVRows(csvText);
    if (rows.length < 2) return [];

    // Parse header row
    const headers = parseCSVRow(rows[0]).map(h => h.trim().toLowerCase());

    const results = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const values = parseCSVRow(row);
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = (values[index] || '').trim();
        });
        results.push(obj);
    }
    return results;
}

// Parse a single CSV row, handling quoted fields with commas
function parseCSVRow(row) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

// Convert a sheet row into a POI object
function rowToPOI(row) {
    // Skip rows without GPS coordinates
    const gps = row.gps || '';
    if (!gps.includes(',')) return null;

    const [latStr, lngStr] = gps.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return null;

    const id = parseInt(row.id) || 0;
    const name = row.name || row.description || 'Unknown';
    const description = row.description || '';
    const address = row.address || '';
    const evCharging = (row.evcharging || '').toLowerCase() === 'yes';
    const rates = row.rates || '';
    const type = row.type || 'Parking';
    const landmark = row.landmark || '';
    const validation = row.validation || '';
    const contact = row.contact || '';
    const spaces = parseInt(row.spaces) || null;

    return {
        id,
        name,
        category: type,
        description,
        rates,
        lat,
        lng,
        address,
        evCharging,
        validation,
        landmark,
        contact,
        spaces
    };
}

// Build a user-friendly description from multiple fields
function buildDescription(description, rates, validation) {
    const parts = [];
    if (rates) parts.push(rates);
    if (validation && validation.toLowerCase() !== 'no') parts.push(`Validation: ${validation}`);
    if (description && description !== parts[0]) {
        // Only add description if it adds new info
        const descLower = description.toLowerCase();
        const alreadyCovered = parts.some(p => p.toLowerCase().includes(descLower));
        if (!alreadyCovered) parts.unshift(description);
    }
    return parts.join('. ') || 'Parking available.';
}

// Fetch data from Google Sheets
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const csvText = await response.text();
        const rows = parseCSV(csvText);

        POINTS_OF_INTEREST = rows
            .map(rowToPOI)
            .filter(poi => poi !== null);

        dataLoaded = true;
        console.log(`Loaded ${POINTS_OF_INTEREST.length} locations from Google Sheet`);
        return POINTS_OF_INTEREST;
    } catch (error) {
        console.error('Failed to fetch sheet data:', error);
        // Return whatever we have (could be empty on first load)
        return POINTS_OF_INTEREST;
    }
}

// Get all POI data
function getAllPOIs() {
    return POINTS_OF_INTEREST;
}

// Get POI by ID
function getPOIById(id) {
    return POINTS_OF_INTEREST.find(poi => poi.id === id);
}

// Check if data has been loaded
function isDataLoaded() {
    return dataLoaded;
}
