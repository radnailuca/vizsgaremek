(function () {
    function showMyLocation() {
        if (!window.bpMap) {
            console.warn("BpMap: A térkép még nincs betöltve. Hívjad showMyLocation()-t initMap után.");
            return;
        }

        if (!navigator.geolocation) {
            console.warn("BpMap: A böngésző nem támogatja a helymeghatározást.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                var pos = typeof window.bpMapClampToBounds === "function"
                    ? window.bpMapClampToBounds(lat, lng)
                    : { lat: lat, lng: lng };

                window.bpMap.setCenter(pos);
                window.bpMap.setZoom(15);

                if (window.myLocationMarker) {
                    window.myLocationMarker.setMap(null);
                }
                window.myLocationMarker = new google.maps.Marker({
                    position: pos,
                    map: window.bpMap,
                    title: "Itt vagyok"
                });
            },
            function (err) {
                console.warn("BpMap: Helymeghatározás sikertelen:", err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    window.showMyLocation = showMyLocation;
})();
