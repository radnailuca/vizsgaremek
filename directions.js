(function () {
    function T(key) {
        return window.I18N && window.I18N.t ? window.I18N.t(key) : key;
    }

    var directionsService;
    var directionsRenderer;
    var routeAcFrom = null;
    var routeAcTo = null;

    var BP_SW = { lat: 47.35, lng: 18.92 };
    var BP_NE = { lat: 47.61, lng: 19.35 };

    function budapestBounds() {
        return new google.maps.LatLngBounds(
            new google.maps.LatLng(BP_SW.lat, BP_SW.lng),
            new google.maps.LatLng(BP_NE.lat, BP_NE.lng)
        );
    }

    function expandQueryForBudapest(q) {
        q = (q || "").trim();
        if (!q) return q;
        var low = q.toLowerCase();
        if (low.indexOf("budapest") !== -1) return q;
        if (q.indexOf(",") !== -1) return q;
        return q + ", Budapest, Hungary";
    }

    function geocodeRaw(address, callback) {
        if (!window.bpMap) {
            callback(null);
            return;
        }
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address, region: "hu" }, function (results, status) {
            if (status === "OK" && results && results[0]) {
                callback(results[0].geometry.location);
            } else {
                callback(null);
            }
        });
    }

    function geocodeSmart(userInput, callback) {
        var trimmed = (userInput || "").trim();
        if (!trimmed) {
            callback(null);
            return;
        }
        var low = trimmed.toLowerCase();
        var hasScope = trimmed.indexOf(",") !== -1 || low.indexOf("budapest") !== -1;
        var expanded = expandQueryForBudapest(trimmed);

        if (!hasScope && expanded !== trimmed) {
            geocodeRaw(expanded, function (loc) {
                if (loc) {
                    callback(loc);
                } else {
                    geocodeRaw(trimmed, callback);
                }
            });
            return;
        }

        geocodeRaw(trimmed, function (loc) {
            if (loc) {
                callback(loc);
                return;
            }
            if (expanded !== trimmed) {
                geocodeRaw(expanded, callback);
            } else {
                callback(null);
            }
        });
    }

    function resolveRouteEndpoint(inputEl, autocomplete, callback) {
        var text = (inputEl && inputEl.value) ? inputEl.value.trim() : "";
        if (autocomplete && typeof autocomplete.getPlace === "function") {
            var place = autocomplete.getPlace();
            if (place && place.place_id) {
                callback({ placeId: place.place_id });
                return;
            }
        }
        if (!text) {
            callback(null);
            return;
        }
        geocodeSmart(text, function (loc) {
            if (loc) {
                callback(loc);
            } else {
                callback(expandQueryForBudapest(text) || text);
            }
        });
    }

    function getTravelMode() {
        var sel = document.getElementById("routeTravelMode");
        var v = (sel && sel.value) || "DRIVING";
        var TM = google.maps.TravelMode;
        if (TM && TM[v]) return TM[v];
        return TM.DRIVING;
    }

    function routeStatusMessage(status) {
        var keys = {
            ZERO_RESULTS: "dir.zeroResults",
            REQUEST_DENIED: "dir.requestDenied",
            OVER_QUERY_LIMIT: "dir.overQueryLimit",
            NOT_FOUND: "dir.notFound",
            INVALID_REQUEST: "dir.invalidRequest"
        };
        var k = keys[status];
        if (k) return T(k);
        return T("dir.unknownStatus") + (status ? " (" + status + ")" : "");
    }

    function formatTotalDistanceMeters(m) {
        if (m == null || !isFinite(m)) return "—";
        if (m < 1000) return Math.round(m) + " m";
        return (m / 1000).toFixed(1) + " km";
    }

    function formatTotalDurationSeconds(sec) {
        if (sec == null || !isFinite(sec)) return "—";
        var h = Math.floor(sec / 3600);
        var m = Math.max(0, Math.round((sec % 3600) / 60));
        if (h > 0) return T("dir.durationHoursMins", { h: String(h), m: String(m) });
        return T("dir.durationMinsOnly", { m: String(m) });
    }

    function showRouteSummary(route) {
        var el = document.getElementById("routeSummary");
        if (!el) return;

        var legs = route.routes[0] && route.routes[0].legs;
        if (!legs || !legs.length) {
            el.innerHTML = '<p class="route-empty">' + T("dir.planFail") + "</p>";
            return;
        }

        var dist;
        var dur;
        if (legs.length === 1) {
            dist = legs[0].distance ? legs[0].distance.text : "—";
            dur = legs[0].duration ? legs[0].duration.text : "—";
        } else {
            var dm = 0;
            var ds = 0;
            for (var i = 0; i < legs.length; i++) {
                if (legs[i].distance && legs[i].distance.value != null) dm += legs[i].distance.value;
                if (legs[i].duration && legs[i].duration.value != null) ds += legs[i].duration.value;
            }
            dist = formatTotalDistanceMeters(dm);
            dur = formatTotalDurationSeconds(ds);
        }

        el.innerHTML =
            '<div class="route-row"><span class="route-label">' + T("dir.distance") + '</span><span class="route-value">' + dist + '</span></div>' +
            '<div class="route-row"><span class="route-label">' + T("dir.duration") + '</span><span class="route-value">' + dur + '</span></div>';
    }

    function runDirections() {
        var fromInput = document.getElementById("routeFrom");
        var toInput = document.getElementById("routeTo");
        var summaryEl = document.getElementById("routeSummary");
        if (!fromInput || !toInput || !summaryEl || !window.bpMap) return;

        var from = (fromInput.value || "").trim();
        var to = (toInput.value || "").trim();
        if (!from || !to) {
            summaryEl.innerHTML = '<p class="route-empty">' + T("dir.fillBoth") + "</p>";
            return;
        }

        summaryEl.innerHTML = '<p class="route-empty">' + T("dir.planning") + "</p>";

        if (!directionsService) directionsService = new google.maps.DirectionsService();
        if (!directionsRenderer) {
            directionsRenderer = new google.maps.DirectionsRenderer({
                map: window.bpMap,
                suppressMarkers: false,
                preserveViewport: false
            });
        }
        directionsRenderer.setMap(window.bpMap);

        resolveRouteEndpoint(fromInput, routeAcFrom, function (origin) {
            if (!origin) {
                summaryEl.innerHTML = '<p class="route-empty">' + T("dir.fromNotFound") + "</p>";
                return;
            }
            resolveRouteEndpoint(toInput, routeAcTo, function (destination) {
                if (!destination) {
                    summaryEl.innerHTML = '<p class="route-empty">' + T("dir.toNotFound") + "</p>";
                    return;
                }

                var mode = getTravelMode();
                var request = {
                    origin: origin,
                    destination: destination,
                    travelMode: mode,
                    provideRouteAlternatives: false,
                    unitSystem: google.maps.UnitSystem.METRIC,
                    region: "HU"
                };
                if (mode === google.maps.TravelMode.TRANSIT) {
                    request.transitOptions = { departureTime: new Date() };
                }

                directionsService.route(request, function (result, status) {
                    if (status === "OK" && result) {
                        directionsRenderer.setDirections(result);
                        showRouteSummary(result);
                    } else {
                        summaryEl.innerHTML = '<p class="route-empty">' + routeStatusMessage(status) + "</p>";
                    }
                });
            });
        });
    }

    function initDirections() {
        if (!window.bpMap) return;

        var fromInput = document.getElementById("routeFrom");
        var toInput = document.getElementById("routeTo");

        var autoOpts = {
            bounds: budapestBounds(),
            strictBounds: false,
            componentRestrictions: { country: "hu" },
            fields: ["formatted_address", "geometry", "name", "place_id", "address_components"]
        };

        routeAcFrom = null;
        routeAcTo = null;

        if (fromInput && google.maps.places) {
            routeAcFrom = new google.maps.places.Autocomplete(fromInput, autoOpts);
            routeAcFrom.bindTo("bounds", window.bpMap);
        }
        if (toInput && google.maps.places) {
            routeAcTo = new google.maps.places.Autocomplete(toInput, autoOpts);
            routeAcTo.bindTo("bounds", window.bpMap);
        }

        var btn = document.getElementById("routeBtn");
        if (btn) btn.addEventListener("click", runDirections);

        function enterRunsRoute(e) {
            if (e.key !== "Enter") return;
            setTimeout(runDirections, 200);
        }
        if (fromInput) fromInput.addEventListener("keydown", enterRunsRoute);
        if (toInput) toInput.addEventListener("keydown", enterRunsRoute);

        var summaryEl = document.getElementById("routeSummary");
        if (summaryEl) summaryEl.innerHTML = '<p class="route-empty">' + T("dir.emptyHint") + "</p>";
    }

    window.initDirections = initDirections;
})();
