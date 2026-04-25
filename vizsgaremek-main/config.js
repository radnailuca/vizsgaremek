window.GOOGLE_MAPS_API_KEY = "AIzaSyBP-5Glq8YfblF0d2CDeYo_pS5wM0bTkqA";

window.BPMAP_BOUNDS = {
    north: 47.61,
    south: 47.35,
    east: 19.35,
    west: 18.92
};

window.bpMapClampToBounds = function (lat, lng) {
    var b = window.BPMAP_BOUNDS;
    if (!b) return { lat: lat, lng: lng };
    return {
        lat: Math.min(Math.max(lat, b.south), b.north),
        lng: Math.min(Math.max(lng, b.west), b.east)
    };
};