function loadGoogleMaps() {
    var key = window.GOOGLE_MAPS_API_KEY;
    if (!key || key === "IDE_IRD_A_SAJAT_API_KULCSODAT") {
        console.warn("BpMap: Nincs beállítva Google API kulcs. Szerkeszd a config.js fájlt.");
        return;
    }
    var lang = "hu";
    try {
        if (window.I18N && typeof window.I18N.getLang === "function" && window.I18N.getLang() === "en") {
            lang = "en";
        }
    } catch (e) {}
    var script = document.createElement("script");
    script.src =
        "https://maps.googleapis.com/maps/api/js?key=" +
        encodeURIComponent(key) +
        "&v=weekly&libraries=places&language=" +
        lang +
        "&region=HU&loading=async&callback=initMap";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function initMap() {
    var mapEl = document.getElementById("map");
    if (!mapEl) return;

    var mapStyles = [
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
        { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#2d3a2d" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#3a3a3a" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#2d4a2d" }] },
        { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] }
    ];

    var bounds = window.BPMAP_BOUNDS;
    var mapOpts = {
        center: { lat: 47.4979, lng: 19.0402 },
        zoom: 12,
        minZoom: 10,
        styles: mapStyles
    };
    if (bounds) {
        mapOpts.restriction = {
            latLngBounds: bounds,
            strictBounds: true
        };
    }
    window.bpMap = new google.maps.Map(mapEl, mapOpts);

    if (typeof window.showMyLocation === "function") {
        window.showMyLocation();
    }

    if (typeof window.initPlaces === "function") window.initPlaces();
    if (typeof window.initDirections === "function") window.initDirections();
}

loadGoogleMaps();
