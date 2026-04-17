(function () {
    function T(key, vars) {
        return window.I18N && window.I18N.t ? window.I18N.t(key, vars) : key;
    }

    function placePhotoImgHtml(classAttr, url, altText) {
        var esc = (url || "").replace(/"/g, "&quot;");
        var alt = (altText || "").replace(/"/g, "&quot;");
        var cls = classAttr ? ' class="' + classAttr + '"' : "";
        return "<img" + cls + ' src="' + esc + '" alt="' + alt + '" referrerpolicy="no-referrer" loading="lazy">';
    }

    var BUDAPEST_CENTER = { lat: 47.4979, lng: 19.0402 };
    var SAVED_STORAGE_KEY = "bpmap_saved_places";
    var placesService;
    var placeMarkers = [];
    var selectedPlaceId = null;
    var lastPlaceRequestId = 0;
    var guestSaveHintTimer = null;

    function clearGuestSaveHintTimer() {
        if (guestSaveHintTimer) {
            clearTimeout(guestSaveHintTimer);
            guestSaveHintTimer = null;
        }
    }

    function getLoggedInUserId() {
        try {
            var raw = localStorage.getItem("bpmap_user");
            var user = raw ? JSON.parse(raw) : null;
            if (!user || user.ID == null) return null;
            var n = Number(user.ID);
            return Number.isFinite(n) && n > 0 ? n : null;
        } catch (e) {
            return null;
        }
    }

    function isUserLoggedIn() {
        return localStorage.getItem("bpmap_logged_in") === "1" && getLoggedInUserId() != null;
    }

    function isBudapestCoords(lat, lng) {
        var b = window.BPMAP_BOUNDS;
        var la = (typeof lat === "string") ? parseFloat(lat) : lat;
        var ln = (typeof lng === "string") ? parseFloat(lng) : lng;
        if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
        if (!b) return false;
        return la >= b.south && la <= b.north && ln >= b.west && ln <= b.east;
    }

    function distanceFromClickMeters(latLng, place) {
        if (!latLng || !place || !place.geometry || !place.geometry.location) return Infinity;
        var plat = place.geometry.location.lat();
        var plng = place.geometry.location.lng();
        var clat = latLng.lat();
        var clng = latLng.lng();
        var R = 6371000;
        function toRad(d) {
            return (d * Math.PI) / 180;
        }
        var dLat = toRad(plat - clat);
        var dLng = toRad(plng - clng);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(clat)) * Math.cos(toRad(plat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    function getSavedPlaces() {
        try {
            var raw = localStorage.getItem(SAVED_STORAGE_KEY);
            var list = raw ? JSON.parse(raw) : [];
            return list.filter(function (p) { return p && isBudapestCoords(p.lat, p.lng); });
        } catch (e) {
            return [];
        }
    }

    function savePlace(place) {
        if (!isUserLoggedIn()) return;
        if (!place || !isBudapestCoords(place.lat, place.lng)) return;
        var list = getSavedPlaces();
        if (list.some(function (p) { return p.place_id === place.place_id; })) return;
        list.push(place);
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
    }

    function removeSavedPlace(placeId) {
        var list = getSavedPlaces().filter(function (p) { return p.place_id !== placeId; });
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
    }

    function isSaved(placeId) {
        return getSavedPlaces().some(function (p) { return p.place_id === placeId; });
    }

    function clearPlaceMarkers() {
        placeMarkers.forEach(function (m) {
            m.setMap(null);
        });
        placeMarkers = [];
    }

    function placeToStorageItem(detail) {
        var photoUrl = "";
        if (detail.photos && detail.photos[0] && detail.photos[0].getUrl) {
            photoUrl = detail.photos[0].getUrl({ maxWidth: 400 });
        }
        return {
            place_id: detail.place_id,
            name: detail.name || "",
            address: detail.formatted_address || detail.vicinity || "",
            photo_url: photoUrl,
            rating: detail.rating != null ? detail.rating : null,
            lat: detail.geometry && detail.geometry.location ? detail.geometry.location.lat() : null,
            lng: detail.geometry && detail.geometry.location ? detail.geometry.location.lng() : null
        };
    }

    function buildReviewsHtml(reviews) {
        if (!reviews || !reviews.length) return "";
        var list = [];
        var maxReviews = 5;
        for (var i = 0; i < reviews.length && i < maxReviews; i++) {
            var r = reviews[i];
            var author = (r.author_name || T("places.anonymous")).replace(/</g, "&lt;");
            var rating = r.rating != null ? r.rating : "";
            var time = (r.relative_time_description || "").replace(/</g, "&lt;");
            var text = (r.text || "").replace(/</g, "&lt;").replace(/\n/g, "<br>");
            if (text.length > 400) text = text.slice(0, 397) + "...";
            var ratingStars = rating ? '<span class="review-rating">★ ' + rating + '</span>' : "";
            list.push(
                '<div class="detail-review-item">' +
                '<div class="review-meta">' +
                '<span class="review-author">' + author + '</span>' +
                (time ? ' <span class="review-time">' + time + '</span>' : '') +
                ratingStars +
                '</div>' +
                (text ? '<p class="review-text">' + text + '</p>' : '') +
                '</div>'
            );
        }
        return '<div class="detail-reviews"><h3 class="detail-reviews-title">' + T("places.reviewsTitle") + "</h3>" + list.join("") + "</div>";
    }

    function buildPhotoCarousel(photos, maxCount) {
        if (!photos || !photos.length) return "";
        var urls = [];
        var n = Math.min(photos.length, maxCount || 10);
        for (var i = 0; i < n; i++) {
            if (photos[i] && photos[i].getUrl) {
                urls.push(photos[i].getUrl({ maxWidth: 600 }).replace(/"/g, "&quot;"));
            }
        }
        if (!urls.length) return "";
        var slides = urls.map(function (url, idx) {
            return '<div class="carousel-slide">' + placePhotoImgHtml("", url, T("places.imgAlt", { n: idx + 1 })) + "</div>";
        }).join("");
        var dots = urls.length > 1 ? urls.map(function (_, i) {
            return '<button type="button" class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="' + T("places.imgAlt", { n: i + 1 }).replace(/"/g, "&quot;") + '"></button>';
        }).join("") : "";
        var nav = urls.length > 1
            ? '<button type="button" class="carousel-nav carousel-prev" aria-label="' + T("places.prev").replace(/"/g, "&quot;") + '">‹</button><button type="button" class="carousel-nav carousel-next" aria-label="' + T("places.next").replace(/"/g, "&quot;") + '">›</button>'
            : "";
        return (
            '<div class="detail-photo-carousel" data-total="' + urls.length + '">' +
            '<div class="carousel-viewport">' +
            '<div class="carousel-track">' + slides + '</div>' +
            nav +
            "</div>" +
            (dots ? '<div class="carousel-dots">' + dots + "</div>" : "") +
            "</div>"
        );
    }

    function bindCarousel(container) {
        var track = container && container.querySelector(".carousel-track");
        var total = container ? parseInt(container.getAttribute("data-total"), 10) : 0;
        if (!track || total <= 1) return;
        var idx = 0;
        function goTo(i) {
            idx = (i + total) % total;
            track.style.transform = "translateX(-" + idx * 100 + "%)";
            var dots = container.querySelectorAll(".carousel-dot");
            dots.forEach(function (d, j) { d.classList.toggle("active", j === idx); });
        }
        var prev = container.querySelector(".carousel-prev");
        var next = container.querySelector(".carousel-next");
        if (prev) prev.addEventListener("click", function () { goTo(idx - 1); });
        if (next) next.addEventListener("click", function () { goTo(idx + 1); });
        container.querySelectorAll(".carousel-dot").forEach(function (dot) {
            dot.addEventListener("click", function () {
                var i = parseInt(dot.getAttribute("data-index"), 10);
                if (!isNaN(i)) goTo(i);
            });
        });
    }

    function showPlaceInRightPanel(detail) {
        var content = document.getElementById("placeDetailContent");
        var saveBtn = document.getElementById("placeDetailSaveBtn");
        var panelRight = document.getElementById("placeDetailPanel");
        if (!content || !saveBtn) return;

        selectedPlaceId = detail.place_id;

        var photoBlock = buildPhotoCarousel(detail.photos, 10);
        var photoHtml = photoBlock || ('<div class="detail-no-photo">' + T("places.noPhoto") + "</div>");
        var name = (detail.name || "—").replace(/</g, "&lt;");
        var addr = (detail.formatted_address || detail.vicinity || "").replace(/</g, "&lt;");
        var rating = detail.rating != null ? detail.rating : "";
        var ratingHtml = rating ? '<div class="detail-rating">★ ' + rating + ' <span>/ 5</span></div>' : "";
        var reviewsHtml = buildReviewsHtml(detail.reviews);

        var itemPreview = placeToStorageItem(detail);
        var canSaveHere = isBudapestCoords(itemPreview.lat, itemPreview.lng);
        var outsideNote = canSaveHere
            ? ""
            : ('<p class="detail-outside-bp">' + T("places.outsideBp") + "</p>");

        content.innerHTML =
            '<div class="place-detail-card">' +
            photoHtml +
            '<div class="detail-name">' + name + '</div>' +
            '<div class="detail-address" title="' + addr + '">' + T("places.address") + " " + addr + "</div>" +
            ratingHtml +
            reviewsHtml +
            outsideNote +
            "</div>";
        content.classList.remove("detail-placeholder");

        var carouselEl = content.querySelector(".detail-photo-carousel");
        if (carouselEl) bindCarousel(carouselEl);

        if (!canSaveHere) {
            clearGuestSaveHintTimer();
            saveBtn.style.display = "none";
            saveBtn.onclick = null;
            saveBtn.classList.remove("saved", "btn-save--guest-hint");
        } else {
            saveBtn.style.display = "block";

            if (!isUserLoggedIn()) {
                clearGuestSaveHintTimer();
                saveBtn.textContent = T("places.saveLater");
                saveBtn.classList.remove("saved");
                saveBtn.classList.remove("btn-save--guest-hint");
                var guestHintActive = false;
                saveBtn.onclick = function () {
                    if (isUserLoggedIn()) return;
                    if (!guestHintActive) {
                        guestHintActive = true;
                        saveBtn.textContent = T("places.saveLaterLoginRequired");
                        saveBtn.classList.add("btn-save--guest-hint");
                        clearGuestSaveHintTimer();
                        guestSaveHintTimer = setTimeout(function () {
                            guestSaveHintTimer = null;
                            guestHintActive = false;
                            var btn = document.getElementById("placeDetailSaveBtn");
                            if (!btn || isUserLoggedIn()) return;
                            btn.textContent = T("places.saveLater");
                            btn.classList.remove("btn-save--guest-hint");
                        }, 3000);
                    } else {
                        window.location.href = "login.html";
                    }
                };
            } else {
                clearGuestSaveHintTimer();
                saveBtn.classList.remove("btn-save--guest-hint");

                if (isSaved(detail.place_id)) {
                    saveBtn.textContent = T("places.savedToggle");
                    saveBtn.classList.add("saved");
                } else {
                    saveBtn.textContent = T("places.saveLater");
                    saveBtn.classList.remove("saved");
                }

                saveBtn.onclick = function () {
                    if (isSaved(detail.place_id)) {
                        removeSavedPlace(detail.place_id);
                        saveBtn.textContent = T("places.saveLater");
                        saveBtn.classList.remove("saved");
                    } else {
                        var item = placeToStorageItem(detail);
                        if (!isBudapestCoords(item.lat, item.lng)) {
                            alert(T("places.alertNotBp"));
                            return;
                        }
                        savePlace(item);
                        saveBtn.textContent = T("places.savedToggle");
                        saveBtn.classList.add("saved");
                    }
                };
            }
        }

        if (panelRight) {
            panelRight.classList.remove("is-closed");
            if (window.innerWidth <= 768) {
                panelRight.classList.add("is-open");
            }
        }
        var openRightFab = document.getElementById("openRightPanel");
        if (openRightFab) {
            openRightFab.classList.remove("visible");
        }
    }

    function fetchAndShowPlaceDetail(placeId, moveMap, requestId) {
        if (!placesService || !placeId) return;
        var reqId = requestId != null ? requestId : null;
        var fields = ["place_id", "name", "formatted_address", "vicinity", "geometry", "photos", "rating", "reviews"];
        placesService.getDetails({ placeId: placeId, fields: fields }, function (detail, status) {
            if (reqId != null && reqId !== lastPlaceRequestId) return;
            if (status !== google.maps.places.PlacesServiceStatus.OK || !detail) return;
            if (moveMap && detail.geometry && window.bpMap) {
                clearPlaceMarkers();
                var loc = detail.geometry.location;
                var lat = loc.lat();
                var lng = loc.lng();
                var center = typeof window.bpMapClampToBounds === "function"
                    ? window.bpMapClampToBounds(lat, lng)
                    : { lat: lat, lng: lng };
                window.bpMap.setCenter(center);
                window.bpMap.setZoom(16);
                var m = new google.maps.Marker({
                    position: center,
                    map: window.bpMap,
                    title: detail.name || ""
                });
                placeMarkers.push(m);
                google.maps.event.trigger(window.bpMap, "resize");
            }
            showPlaceInRightPanel(detail);
            registerUjHelyFelfedezve(placeId, detail);
        });
    }

    var SKIP_PLACE_TYPES = [
        "locality", "political", "administrative_area_level_1", "administrative_area_level_2",
        "administrative_area_level_3", "country", "postal_code", "neighborhood", "sublocality"
    ];

    function isRealVenue(place) {
        var types = place.types || [];
        for (var i = 0; i < types.length; i++) {
            if (SKIP_PLACE_TYPES.indexOf(types[i]) !== -1) return false;
        }
        return types.length > 0;
    }

    function getPlaceFilterType() {
        var sel = document.getElementById("placeFilter");
        return (sel && sel.value) ? sel.value : "minden";
    }

    var FILTER_TO_NEARBY_TYPE = {
        minden: null,
        ettermek: "restaurant",
        bulizo: "bar",
        turisztikai: "tourist_attraction",
        kavezo: "cafe"
    };

    var FILTER_TO_HELYTIPUS = {
        minden: "Minden",
        ettermek: "Étterem",
        bulizo: "Bulizóhely",
        turisztikai: "Turisztikai",
        kavezo: "Kávézó"
    };

    var FILTER_TO_QUERY_KEYWORD_HU = {
        minden: "",
        ettermek: "étterem",
        bulizo: "bár bulizóhely",
        turisztikai: "turisztikai látnivaló",
        kavezo: "kávézó"
    };

    var FILTER_TO_QUERY_KEYWORD_EN = {
        minden: "",
        ettermek: "restaurant",
        bulizo: "bar nightlife",
        turisztikai: "tourist attraction",
        kavezo: "cafe"
    };

    function filterKeywords() {
        return window.I18N && window.I18N.getLang && window.I18N.getLang() === "en"
            ? FILTER_TO_QUERY_KEYWORD_EN
            : FILTER_TO_QUERY_KEYWORD_HU;
    }

    function onMapClick(latLng) {
        if (!placesService || !window.bpMap) return;
        if (latLng && !isBudapestCoords(latLng.lat(), latLng.lng())) return;
        clearPlaceMarkers();
        var requestId = ++lastPlaceRequestId;
        var filter = getPlaceFilterType();
        var request = {
            location: latLng,
            radius: 100
        };
        var apiType = FILTER_TO_NEARBY_TYPE[filter];
        if (apiType) request.type = apiType;
        placesService.nearbySearch(request, function (results, status) {
            if (requestId !== lastPlaceRequestId) return;
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results.length) {
                selectedPlaceId = null;
                var content = document.getElementById("placeDetailContent");
                var saveBtn = document.getElementById("placeDetailSaveBtn");
                if (content) {
                    content.innerHTML = '<p class="detail-placeholder">' + T("places.mapNoPlace") + "</p>";
                }
                if (saveBtn) saveBtn.style.display = "none";
                return;
            }
            var sorted = results.slice().sort(function (a, b) {
                return distanceFromClickMeters(latLng, a) - distanceFromClickMeters(latLng, b);
            });
            var chosen = null;
            for (var i = 0; i < sorted.length; i++) {
                if (filter === "minden" && !isRealVenue(sorted[i])) continue;
                chosen = sorted[i];
                break;
            }
            if (!chosen) {
                selectedPlaceId = null;
                var content = document.getElementById("placeDetailContent");
                var saveBtn = document.getElementById("placeDetailSaveBtn");
                if (content) {
                    content.innerHTML = '<p class="detail-placeholder">' + T("places.mapNoVenue") + "</p>";
                }
                if (saveBtn) saveBtn.style.display = "none";
                return;
            }
            fetchAndShowPlaceDetail(chosen.place_id, true, requestId);
        });
    }

    function renderPlaceCard(place) {
        var card = document.createElement("div");
        card.className = "place-card";
        card.setAttribute("data-place-id", place.place_id || "");

        var img = "";
        if (place.photos && place.photos[0]) {
            var photo = place.photos[0];
            var url = photo.getUrl ? photo.getUrl({ maxWidth: 400 }) : "";
            if (url) img = placePhotoImgHtml("place-photo", url, "");
        }
        if (!img) img = '<div class="place-photo" style="background:#1e1e1e;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-size:0.85rem;">' + T("places.noPhoto") + "</div>";

        var name = (place.name || "—").replace(/</g, "&lt;");
        var addr = (place.vicinity || place.formatted_address || "").replace(/</g, "&lt;");
        var rating = place.rating != null ? place.rating : "";
        var ratingHtml = rating ? '<div class="place-rating">★ ' + rating + '<span> / 5</span></div>' : "";

        card.innerHTML =
            img +
            '<div class="place-body">' +
            '<div class="place-name">' + name + '</div>' +
            '<div class="place-address">' + addr + '</div>' +
            ratingHtml +
            "</div>";

        card.addEventListener("click", function () {
            var id = card.getAttribute("data-place-id");
            if (!id) return;
            fetchAndShowPlaceDetail(id, true);
        });

        return card;
    }

    function showResults(places) {
        var list = document.getElementById("placeResults");
        if (!list) return;
        list.innerHTML = "";
        if (!places || places.length === 0) {
            list.innerHTML = '<p class="results-empty">' + T("places.resultsEmpty") + "</p>";
            return;
        }
        places.forEach(function (place) {
            list.appendChild(renderPlaceCard(place));
        });
    }

    function registerUjHelyFelfedezve(placeId, detail) {
        var userId = getLoggedInUserId();
        if (userId == null || !placeId) return;
        if (detail && detail.geometry && detail.geometry.location) {
            var la = detail.geometry.location.lat();
            var ln = detail.geometry.location.lng();
            if (!isBudapestCoords(la, ln)) return;
        }
        try {
            fetch("/api/felhasznalo/hely", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ UserID: userId, placeID: placeId }),
            }).catch(function () {});
        } catch (e) {}
    }

    async function logSearchTerm(userQuery, filterKey) {
        var trimmed = (userQuery || "").trim();
        var userId = getLoggedInUserId();
        if (!trimmed || userId == null) return;

        var fk = filterKey || getPlaceFilterType();
        var helytipus = FILTER_TO_HELYTIPUS[fk] || FILTER_TO_HELYTIPUS.minden;

        try {
            await fetch("/api/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    UserID: userId,
                    helyNev: trimmed,
                    helytipus: helytipus
                })
            });
        } catch (e) {}
    }

    function runSearch(options) {
        var opts = options || {};
        var input = document.getElementById("placeSearch");
        var list = document.getElementById("placeResults");
        if (!input || !list || !window.bpMap) return;

        var filter = getPlaceFilterType();
        var keyword = filterKeywords()[filter] || "";
        var userQuery = (input.value || "").trim();
        var queryPart = userQuery ? userQuery + (keyword ? " " + keyword : "") : keyword;
        if (!queryPart) {
            list.innerHTML = '<p class="results-empty">' + T("places.typeKeywordOrFilter") + "</p>";
            return;
        }

        list.innerHTML = '<p class="results-empty">' + T("places.searching") + "</p>";
        clearPlaceMarkers();
        if (!opts.skipLog) logSearchTerm(userQuery, filter);

        if (!placesService) placesService = new google.maps.places.PlacesService(window.bpMap);

        var request = {
            query: queryPart + " Budapest",
            location: BUDAPEST_CENTER,
            radius: 15000
        };

        placesService.textSearch(request, function (results, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
                showResults([]);
                return;
            }
            var inBp = results.filter(function (p) {
                if (!p.geometry || !p.geometry.location) return false;
                var la = p.geometry.location.lat();
                var ln = p.geometry.location.lng();
                return isBudapestCoords(la, ln);
            });
            showResults(inBp.slice(0, 10));
        });
    }

    function initPlaces() {
        if (!window.bpMap) return;

        if (!placesService) placesService = new google.maps.places.PlacesService(window.bpMap);

        google.maps.event.addListener(window.bpMap, "click", function (e) {
            onMapClick(e.latLng);
        });

        var btn = document.getElementById("placeSearchBtn");
        var input = document.getElementById("placeSearch");
        if (btn) btn.addEventListener("click", runSearch);
        if (input) input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") runSearch();
        });

        var list = document.getElementById("placeResults");
        if (list) list.innerHTML = '<p class="results-empty">' + T("places.hintSearch") + "</p>";

        var params = typeof URLSearchParams !== "undefined" && window.location.search
            ? new URLSearchParams(window.location.search)
            : null;
        var placeId = params ? params.get("place") : null;
        var qFromUrl = params ? (params.get("q") || "").trim() : "";

        if (placeId) {
            fetchAndShowPlaceDetail(placeId, true);
        } else if (qFromUrl && input) {
            var tabSearch = document.getElementById("leftTabSearch");
            if (tabSearch) tabSearch.click();
            input.value = qFromUrl;
            runSearch({ skipLog: true });
        }
    }

    window.initPlaces = initPlaces;
})();
