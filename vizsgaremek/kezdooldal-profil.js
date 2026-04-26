
(function () {
    function T(key) {
        return window.I18N && window.I18N.t ? window.I18N.t(key) : key;
    }

    var SAVED_STORAGE_KEY = "bpmap_saved_places";
    var LOGIN_FLAG_KEY = "bpmap_logged_in";

    function isLoggedIn() {
        return localStorage.getItem(LOGIN_FLAG_KEY) === "1";
    }

    function getSavedPlaces() {
        try {
            var raw = localStorage.getItem(SAVED_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function setSavedPlaces(list) {
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(list));
    }

    function getCurrentUser() {
        try {
            var raw = localStorage.getItem("bpmap_user");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function removeSavedPlaceLocal(placeId) {
        var list = getSavedPlaces().filter(function (p) {
            return p && p.place_id !== placeId;
        });
        setSavedPlaces(list);
    }

    function setLoggedInUI(loggedIn) {
        var loginLink = document.getElementById("loginLink");
        var profilLink = document.getElementById("profilLink");
        var logoutBtn = document.getElementById("logoutBtn");
        var profilSection = document.getElementById("profil-section");

        if (loginLink) loginLink.classList.toggle("hidden", loggedIn);
        if (profilLink) profilLink.classList.toggle("hidden", !loggedIn);
        if (logoutBtn) logoutBtn.classList.toggle("hidden", !loggedIn);
        if (profilSection) profilSection.classList.toggle("hidden", !loggedIn);
        document.body.classList.toggle("has-profil", loggedIn);

        if (loggedIn) {
            renderSavedPlaces();
            loadSearchLogs();
            loadProfilStatisztika();
        } else {
            clearSearchLogs();
        }
    }

    function deleteOnePlace(placeId) {
        if (!placeId) return;
        removeSavedPlaceLocal(placeId);
        renderSavedPlaces();
    }

    function clearAllPlaces() {
        if (!confirm(T("home.confirmClearAll"))) {
            return;
        }
        localStorage.removeItem(SAVED_STORAGE_KEY);
        renderSavedPlaces();
    }

    function renderSavedPlaces() {
        var listEl = document.getElementById("savedPlacesList");
        var emptyEl = document.getElementById("savedPlacesEmpty");
        var toolbar = document.getElementById("savedPlacesToolbar");
        if (!listEl) return;

        var places = getSavedPlaces();
        listEl.innerHTML = "";

        if (toolbar) {
            toolbar.classList.toggle("hidden", places.length === 0);
        }

        if (!places.length) {
            if (emptyEl) emptyEl.classList.remove("hidden");
            return;
        }

        if (emptyEl) emptyEl.classList.add("hidden");

        places.forEach(function (p) {
            var card = document.createElement("div");
            card.className = "saved-place-card";
            var imgHtml = (p.photo_url && p.photo_url.length > 0)
                ? '<img src="' + p.photo_url.replace(/"/g, "&quot;") + '" alt="" class="saved-place-img" referrerpolicy="no-referrer" loading="lazy">'
                : ('<div class="saved-place-no-img">' + T("profil.noPhoto") + "</div>");
            var name = (p.name || "—").replace(/</g, "&lt;");
            var addr = (p.address || "").replace(/</g, "&lt;");
            var ratingHtml = (p.rating != null) ? '<span class="saved-place-rating">★ ' + p.rating + '</span>' : "";
            var mapUrl = "fooldal.html" + (p.place_id ? "?place=" + encodeURIComponent(p.place_id) : "");
            var pid = p.place_id || "";

            card.innerHTML =
                imgHtml +
                '<div class="saved-place-body">' +
                '<h3 class="saved-place-name">' + name + '</h3>' +
                '<p class="saved-place-address">' + addr + '</p>' +
                ratingHtml +
                '<div class="saved-place-actions">' +
                '<a href="' + mapUrl + '" class="saved-place-link">' + T("profil.openOnMap") + "</a>" +
                "</div>" +
                "</div>";

            var actions = card.querySelector(".saved-place-actions");
            if (actions && pid) {
                var removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.className = "saved-place-remove";
                removeBtn.setAttribute("aria-label", T("profil.removeAria"));
                removeBtn.textContent = T("profil.removeBtn");
                (function (id) {
                    removeBtn.addEventListener("click", function () {
                        deleteOnePlace(id);
                    });
                })(pid);
                actions.appendChild(removeBtn);
            }

            listEl.appendChild(card);
        });
    }

    function clearSearchLogs() {
        var sectionEl = document.getElementById("searchLogSection");
        var listEl = document.getElementById("searchLogList");
        var emptyEl = document.getElementById("searchLogEmpty");
        var searchToolbar = document.getElementById("searchLogToolbar");
        if (listEl) listEl.innerHTML = "";
        if (emptyEl) emptyEl.classList.add("hidden");
        if (sectionEl) sectionEl.classList.add("hidden");
        if (searchToolbar) searchToolbar.classList.add("hidden");
        clearProfilStatisztika();
    }

    function clearProfilStatisztika() {
        var wrap = document.getElementById("profilStatsWrap");
        var o = document.getElementById("statOsszesKereses");
        var t = document.getElementById("statTopTipusok");
        var u = document.getElementById("statUjHelyek");
        if (o) o.textContent = "—";
        if (t) t.textContent = "—";
        if (u) u.textContent = "—";
        if (wrap) wrap.classList.add("hidden");
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function logEntryId(item) {
        if (!item || typeof item !== "object") return null;
        if (item.ID != null) return item.ID;
        if (item.id != null) return item.id;
        var keys = Object.keys(item);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() === "id") return item[keys[i]];
        }
        return null;
    }

    async function loadProfilStatisztika() {
        var user = getCurrentUser();
        var wrap = document.getElementById("profilStatsWrap");
        var o = document.getElementById("statOsszesKereses");
        var t = document.getElementById("statTopTipusok");
        var u = document.getElementById("statUjHelyek");
        if (!user || user.ID == null || !wrap) {
            clearProfilStatisztika();
            return;
        }

        try {
            var resp = await fetch("/api/statisztika?userId=" + encodeURIComponent(user.ID));
            var data = await resp.json().catch(function () {
                return null;
            });
            if (!resp.ok || !data || data.error) {
                clearProfilStatisztika();
                return;
            }

            wrap.classList.remove("hidden");
            if (o) o.textContent = String(data.osszesKereses != null ? data.osszesKereses : 0);
            if (u) {
                var ujSzam =
                    data.ujHelyekSzama != null
                        ? data.ujHelyekSzama
                        : (function () {
                              var keys = data && typeof data === "object" ? Object.keys(data) : [];
                              for (var i = 0; i < keys.length; i++) {
                                  if (keys[i].toLowerCase() === "ujhelyekszama") return data[keys[i]];
                              }
                              return 0;
                          })();
                u.textContent = String(Number(ujSzam) || 0);
            }

            if (t) {
                var tips = data.topTipusok;
                if (!tips || !tips.length) {
                    t.textContent = "—";
                } else {
                    t.innerHTML = tips
                        .map(function (row, idx) {
                            var name = escapeHtml(row.helytipus || "—");
                            var n = row.kereses_db != null ? row.kereses_db : 0;
                            var cls =
                                "profil-stat-tipus-row" +
                                (idx === 0 ? " profil-stat-tipus-row--top" : "");
                            return (
                                "<span class=\"" +
                                cls +
                                '">' +
                                name +
                                " <strong>(" +
                                n +
                                ")</strong></span>"
                            );
                        })
                        .join("<br>");
                }
            }
        } catch (e) {
            clearProfilStatisztika();
        }
    }

    function renderSearchLogs(logs) {
        var sectionEl = document.getElementById("searchLogSection");
        var listEl = document.getElementById("searchLogList");
        var emptyEl = document.getElementById("searchLogEmpty");
        var searchToolbar = document.getElementById("searchLogToolbar");
        if (!sectionEl || !listEl) return;

        listEl.innerHTML = "";
        sectionEl.classList.remove("hidden");

        if (!logs || !logs.length) {
            if (searchToolbar) searchToolbar.classList.add("hidden");
            if (emptyEl) emptyEl.classList.remove("hidden");
            return;
        }

        if (searchToolbar) searchToolbar.classList.remove("hidden");
        if (emptyEl) emptyEl.classList.add("hidden");

        logs.forEach(function (item) {
            var card = document.createElement("div");
            card.className = "saved-place-card search-log-card";
            var placeName = (item.helyNev || "—").replace(/</g, "&lt;");
            var rawQuery = (item.helyNev || "").trim();
            var mapUrl = rawQuery
                ? "fooldal.html?q=" + encodeURIComponent(rawQuery)
                : "fooldal.html";

            card.innerHTML =
                '<div class="saved-place-no-img search-log-icon">🔎</div>' +
                '<div class="saved-place-body">' +
                '<h3 class="saved-place-name">' + placeName + '</h3>' +
                '<div class="saved-place-actions">' +
                '<a href="' + mapUrl + '" class="saved-place-link">Megnyitás a térképen</a>' +
                "</div>" +
                "</div>";

            var actions = card.querySelector(".saved-place-actions");
            var logDbId = logEntryId(item);
            if (actions && logDbId != null) {
                var removeBtn = document.createElement("button");
                removeBtn.type = "button";
                removeBtn.className = "saved-place-remove";
                removeBtn.setAttribute("aria-label", T("profil.removeLogAria"));
                removeBtn.textContent = T("profil.removeBtn");
                (function (id) {
                    removeBtn.addEventListener("click", function () {
                        deleteSearchLogEntry(id);
                    });
                })(logDbId);
                actions.appendChild(removeBtn);
            }

            listEl.appendChild(card);
        });
    }

    async function clearAllSearchLogs() {
        if (!confirm(T("home.confirmClearAllSearchLog"))) {
            return;
        }
        var user = getCurrentUser();
        if (!user || user.ID == null) return;
        try {
            var uid = user.ID;
            var resp = await fetch("/api/log/clear", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: uid,
                    UserID: uid,
                    felhasznaloID: uid,
                }),
            });
            if (!resp.ok) {
                var errData = await resp.json().catch(function () {
                    return {};
                });
                console.error("Összes előzmény törlése:", resp.status, errData.error || "");
                return;
            }
            await loadSearchLogs();
            await loadProfilStatisztika();
        } catch (e) {
            console.error("Összes előzmény törlése:", e);
        }
    }

    async function deleteSearchLogEntry(logId) {
        if (!logId) return;
        if (!confirm(T("home.confirmDeleteLog"))) return;
        var user = getCurrentUser();
        if (!user || user.ID == null) return;
        try {
            var resp = await fetch("/api/log/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: logId, userId: user.ID }),
            });
            if (!resp.ok) return;
            await loadSearchLogs();
            await loadProfilStatisztika();
        } catch (e) {}
    }

    async function loadSearchLogs() {
        var user = getCurrentUser();
        if (!user || user.ID == null) {
            clearSearchLogs();
            return;
        }

        try {
            var resp = await fetch("/api/log?userId=" + encodeURIComponent(user.ID));
            var data = await resp.json().catch(function () {
                return [];
            });

            if (!resp.ok || !Array.isArray(data)) {
                clearSearchLogs();
                return;
            }

            renderSearchLogs(data);
        } catch (e) {
            clearSearchLogs();
        }
    }

    async function logout() {
        try {
            await fetch("/api/felhasznalo/logout", { method: "POST" });
        } catch (e) {}
        localStorage.removeItem(LOGIN_FLAG_KEY);
        localStorage.removeItem("bpmap_user");
        setLoggedInUI(false);
    }

    function init() {
        var loggedIn = isLoggedIn();
        setLoggedInUI(loggedIn);

        var logoutBtn = document.getElementById("logoutBtn");
        var profilLogoutBtn = document.getElementById("profilLogoutBtn");
        var clearAllBtn = document.getElementById("clearAllSavedBtn");
        var clearAllSearchLogBtn = document.getElementById("clearAllSearchLogBtn");
        if (logoutBtn) logoutBtn.addEventListener("click", function () { logout(); });
        if (profilLogoutBtn) profilLogoutBtn.addEventListener("click", function () { logout(); });
        if (clearAllBtn) clearAllBtn.addEventListener("click", function () { clearAllPlaces(); });
        if (clearAllSearchLogBtn) clearAllSearchLogBtn.addEventListener("click", function () { clearAllSearchLogs(); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
