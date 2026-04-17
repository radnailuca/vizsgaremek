(function () {
    var STORAGE_KEY = "bpmap_lang";

    var STR = {
        hu: {
            "lang.switchToEn": "English",
            "lang.switchToHu": "Magyar",
            "lang.currentHint": "Nyelv",
            "lang.ariaToEn": "Váltás angolra",
            "lang.ariaToHu": "Váltás magyarra",

            "meta.map": "BpMap – Térkép",
            "meta.home": "Kezdőoldal",
            "meta.login": "Bejelentkezés",
            "meta.signup": "Regisztráció",

            "map.panelSearchRoute": "Keresés & útvonal",
            "map.tabSearch": "Keresés",
            "map.leftTabsAria": "Útvonal vagy helyek keresése",
            "map.panelClose": "Panel bezárása",
            "map.searchPlaces": "Helyek keresése",
            "map.filterLabel": "Szűrő:",
            "map.filterAria": "Kategória szűrő",
            "map.opt.all": "Minden",
            "map.opt.restaurants": "Éttermek",
            "map.opt.bars": "Bulizóhelyek",
            "map.opt.tourist": "Turisztikai helyek",
            "map.opt.cafes": "Kávézók",
            "map.searchPlaceholder": "Pl. étterem, múzeum, Budapest...",
            "map.searchBtn": "Keresés",
            "map.routeTitle": "Útvonal",
            "map.routeModeLabel": "Közlekedés:",
            "map.routeModeAria": "Útvonal közlekedési mód",
            "map.routeModeDriving": "Autó",
            "map.routeModeWalking": "Gyalog",
            "map.routeModeBicycling": "Kerékpár",
            "map.routeModeTransit": "Tömegközlekedés",
            "map.routeFromPh": "Honnan?",
            "map.routeToPh": "Hova?",
            "map.routeBtn": "Útvonal",
            "map.results": "Találatok",
            "map.routeInfo": "Útvonal adatai",
            "map.placeDetail": "Hely adatai",
            "map.close": "Bezárás",
            "map.detailHint": "Kattints a térképre egy helyre, vagy válassz a találatok közül.",
            "map.saveLater": "Mentés későbbre",
            "map.toggleLeft": "Bal panel megnyitása",
            "map.openSearch": "☰ Keresés",
            "map.openSearchAria": "Keresés panel megnyitása",
            "map.openPlace": "Hely adatai ▶",
            "map.openPlaceAria": "Hely adatai panel megnyitása",
            "map.homeTitle": "BpMap",

            "places.anonymous": "Névtelen",
            "places.reviewsTitle": "Vélemények",
            "places.imgAlt": "Kép {{n}}",
            "places.prev": "Előző",
            "places.next": "Következő",
            "places.noPhoto": "Nincs kép",
            "places.address": "Cím:",
            "places.savedToggle": "Mentve ✓ (törlés)",
            "places.saveLater": "Mentés későbbre",
            "places.saveLaterLoginRequired": "Bejelentkezés szükséges. (Bejelentkezéshez kattints ide)",
            "places.alertNotBp": "Csak budapesti helyeket mentünk.",
            "places.alertNotBpCoords": "Nem Budapest koordináták (nem mentve).",
            "places.outsideBp": "Ez a hely a Budapest területén kívül esik; mentés nem elérhető.",
            "places.mapNoPlace": "Ezen a ponton nem található ilyen hely. Próbálj máshova kattintani, vagy válassz másik szűrőt.",
            "places.mapNoVenue": "Ezen a ponton nem található konkrét hely (pl. étterem). Próbálj egy üzletre vagy étteremre kattintani.",
            "places.resultsEmpty": "Nincs találat. Próbálj más kifejezést.",
            "places.typeKeywordOrFilter": "Írj be egy keresőszót, vagy válassz egy szűrőt (pl. Éttermek).",
            "places.searching": "Keresés...",
            "places.hintSearch": "Kereséshez írj be egy kifejezést, majd kattints a Keresés gombra.",

            "dir.emptyHint": "Add meg a kiindulási és célpontot, majd kattints az Útvonal gombra.",
            "dir.planFail": "Nem sikerült megtervezni az útvonalat.",
            "dir.distance": "Távolság",
            "dir.duration": "Becsült idő",
            "dir.fillBoth": "Add meg a Honnan és Hova mezőket.",
            "dir.planning": "Útvonal tervezése...",
            "dir.fromNotFound": "A „Honnan” cím nem található.",
            "dir.toNotFound": "A „Hova” cím nem található.",
            "dir.routeError": "Nem sikerült az útvonal (próbáld pontosabb címmel).",
            "dir.zeroResults": "Nincs útvonal a megadott pontok között.",
            "dir.requestDenied": "Az útvonal szolgáltatás nem elérhető (Directions API / kulcs korlátozás).",
            "dir.overQueryLimit": "Túl sok kérés – próbáld újra később.",
            "dir.notFound": "A megadott hely nem található.",
            "dir.invalidRequest": "Érvénytelen útvonalkérés.",
            "dir.unknownStatus": "Ismeretlen hiba az útvonalnál.",
            "dir.durationHoursMins": "{{h}} ó {{m}} perc",
            "dir.durationMinsOnly": "{{m}} perc",

            "home.login": "Bejelentkezés",
            "home.profile": "Profil",
            "home.logout": "Kijelentkezés",
            "home.galleryH2": "Felfedezni való helyek",
            "home.cat.culture": "Kultúra / Múzeumok",
            "home.cat.fun": "Szórakozás / Bulihelyek",
            "home.cat.parks": "Szabadidő / Parkok",
            "home.featuresH2": "Funkciók:",
            "home.features.map": "<strong>Térképes megjelenítés:</strong> A helyek egy interaktív térképen jelennek meg, így könnyen áttekinthetők.",
            "home.features.search": "<strong>Keresés:</strong> A felhasználók gyorsan rá tudnak keresni különböző helyekre.",
            "home.features.filter": "<strong>Szűrők használata:</strong> Kategóriák alapján lehet szűrni a helyeket (pl. éttermek, kávézók stb.).",
            "home.features.fav": "<strong>Kedvencek mentése:</strong> A tetsző helyeket el lehet menteni, hogy később könnyen megtalálhatók legyenek.",
            "home.aboutH2": "Rólunk",
            "home.aboutText": "A BpMap segítségével egyszerűen felfedezheted Budapestet! Szűrők és interaktív térkép segít megtalálni a legjobb helyeket, kedvenceidet elmenteni, és saját várostérképedet kialakítani. Tökéletes mind turistáknak, mind helyieknek, akik szeretnek új helyeket felfedezni.",
            "home.profilH2": "Profil – Mentett helyek",
            "home.profilIntro": "Az alábbi helyeket a térképen mentetted. Csak bejelentkezés után láthatók.",
            "home.savedEmpty": "Még nincs mentett helyed. A térképen kattints egy helyre, majd a „Mentés későbbre” gombra.",
            "home.openMap": "Térkép megnyitása",
            "home.profilLogout": "Kijelentkezés",
            "home.carouselPrev": "Előző",
            "home.carouselNext": "Következő",
            "home.dotPage": "Lapozás: {{n}}",

            "home.m1.alt": "Szépművészeti Múzeum",
            "home.m1.t": "Szépművészeti Múzeum",
            "home.m1.d": "Klasszikus és ókori műalkotások gyűjteménye a Hősök terén.",
            "home.m2.alt": "Magyar Nemzeti Múzeum",
            "home.m2.t": "Magyar Nemzeti Múzeum",
            "home.m2.d": "A magyar történelem legfontosabb kiállításainak otthona.",
            "home.m3.alt": "Ludwig Múzeum",
            "home.m3.t": "Ludwig Múzeum",
            "home.m3.d": "Kortárs művészeti múzeum friss, modern kiállításokkal.",
            "home.f1.alt": "Akvárium Klub",
            "home.f1.t": "Akvárium Klub",
            "home.f1.d": "Belvárosi klub koncertekkel és pezsgő éjszakai élettel.",
            "home.f2.alt": "A38 Hajó",
            "home.f2.t": "A38 Hajó",
            "home.f2.d": "Duna-parti hajóklub változatos zenei programokkal.",
            "home.f3.alt": "Szimpla Kert",
            "home.f3.t": "Szimpla Kert",
            "home.f3.d": "Ikonikus romkocsma egyedi hangulattal és színes terekkel.",
            "home.p1.alt": "Margitsziget",
            "home.p1.t": "Margitsziget",
            "home.p1.d": "Nagy zöld sziget futópályával és nyugodt sétányokkal.",
            "home.p2.alt": "Városliget",
            "home.p2.t": "Városliget",
            "home.p2.d": "Tágas park játszóterekkel, tóval és kulturális helyszínekkel.",
            "home.p3.alt": "Normafa",
            "home.p3.t": "Normafa",
            "home.p3.d": "Kedvelt kirándulóhely gyönyörű panorámával.",

            "profil.noPhoto": "Nincs kép",
            "profil.openOnMap": "Megnyitás a térképen",

            "auth.loginTitle": "Bejelentkezés",
            "auth.email": "Email",
            "auth.password": "Jelszó",
            "auth.loginBtn": "Belépés",
            "auth.noAccount": "Nincs fiókod?",
            "auth.signupLink": "Regisztrálj itt!",
            "auth.signupTitle": "Regisztráció",
            "auth.confirm": "Jelszó megerősítése",
            "auth.registerBtn": "Regisztráció",
            "auth.fillAll": "Kérlek tölts ki minden mezőt!",
            "auth.gmailOnly": "Csak @gmail.com formátumú email címet adhatsz meg!",
            "auth.pwMismatch": "A két jelszó nem egyezik!",
            "auth.signupOk": "Sikeres regisztráció!",
            "auth.loginOk": "Sikeres bejelentkezés!",
            "auth.badCreds": "Hibás email vagy jelszó!",
            "auth.registerFail": "Regisztráció sikertelen (ellenőrizd a szervert és az adatbázist).",
            "auth.network": "Hálózati hiba: indítsd el a Node szervert (pl. node server.js), és próbáld újra.",
            "home.clearAllBtn": "Összes mentett hely törlése",
            "home.clearAllSearchLogBtn": "Összes keresés törlése",
            "home.confirmClearAll": "Biztosan törlöd az összes mentett helyet a listáról (böngésző tároló)?",
            "home.confirmClearAllSearchLog": "Biztosan törlöd az összes keresési előzményt az adatbázisból?",
            "home.confirmDeleteLog": "Biztosan törlöd ezt a keresést az előzményekből?",
            "profil.removeAria": "Hely törlése a listáról",
            "profil.removeLogAria": "Keresés törlése az előzményekből",
            "profil.removeBtn": "Törlés"
        },
        en: {
            "lang.switchToEn": "English",
            "lang.switchToHu": "Magyar",
            "lang.currentHint": "Language",
            "lang.ariaToEn": "Switch to English",
            "lang.ariaToHu": "Switch to Hungarian",

            "meta.map": "BpMap – Map",
            "meta.home": "Home",
            "meta.login": "Log in",
            "meta.signup": "Sign up",

            "map.panelSearchRoute": "Search & route",
            "map.tabSearch": "Search",
            "map.leftTabsAria": "Route or place search",
            "map.panelClose": "Close panel",
            "map.searchPlaces": "Search places",
            "map.filterLabel": "Filter:",
            "map.filterAria": "Category filter",
            "map.opt.all": "All",
            "map.opt.restaurants": "Restaurants",
            "map.opt.bars": "Nightlife",
            "map.opt.tourist": "Tourist sights",
            "map.opt.cafes": "Cafés",
            "map.searchPlaceholder": "e.g. restaurant, museum, Budapest...",
            "map.searchBtn": "Search",
            "map.routeTitle": "Route",
            "map.routeModeLabel": "Mode:",
            "map.routeModeAria": "Route travel mode",
            "map.routeModeDriving": "Driving",
            "map.routeModeWalking": "Walking",
            "map.routeModeBicycling": "Cycling",
            "map.routeModeTransit": "Transit",
            "map.routeFromPh": "From?",
            "map.routeToPh": "To?",
            "map.routeBtn": "Route",
            "map.results": "Results",
            "map.routeInfo": "Route details",
            "map.placeDetail": "Place details",
            "map.close": "Close",
            "map.detailHint": "Click the map on a place, or pick from the results.",
            "map.saveLater": "Save for later",
            "map.toggleLeft": "Open left panel",
            "map.openSearch": "☰ Search",
            "map.openSearchAria": "Open search panel",
            "map.openPlace": "Place details ▶",
            "map.openPlaceAria": "Open place details panel",
            "map.homeTitle": "BpMap",

            "places.anonymous": "Anonymous",
            "places.reviewsTitle": "Reviews",
            "places.imgAlt": "Image {{n}}",
            "places.prev": "Previous",
            "places.next": "Next",
            "places.noPhoto": "No photo",
            "places.address": "Address:",
            "places.savedToggle": "Saved ✓ (remove)",
            "places.saveLater": "Save for later",
            "places.saveLaterLoginRequired": "Sign-in required. (Click here to log in)",
            "places.alertNotBp": "Only Budapest places can be saved.",
            "places.alertNotBpCoords": "Not Budapest coordinates (not saved).",
            "places.outsideBp": "This place is outside Budapest; saving is not available.",
            "places.mapNoPlace": "No matching place here. Try clicking elsewhere or change the filter.",
            "places.mapNoVenue": "No specific venue here (e.g. restaurant). Try clicking on a business or venue.",
            "places.resultsEmpty": "No results. Try a different search.",
            "places.typeKeywordOrFilter": "Enter a keyword or choose a filter (e.g. Restaurants).",
            "places.searching": "Searching...",
            "places.hintSearch": "Enter a search term, then click Search.",

            "dir.emptyHint": "Enter start and destination, then click Route.",
            "dir.planFail": "Could not plan the route.",
            "dir.distance": "Distance",
            "dir.duration": "Est. time",
            "dir.fillBoth": "Fill in both From and To.",
            "dir.planning": "Planning route...",
            "dir.fromNotFound": "The “From” address was not found.",
            "dir.toNotFound": "The “To” address was not found.",
            "dir.routeError": "Could not get a route (try a more precise address).",
            "dir.zeroResults": "No route found between these points.",
            "dir.requestDenied": "Routing is unavailable (Directions API or key restriction).",
            "dir.overQueryLimit": "Too many requests — try again later.",
            "dir.notFound": "The place could not be found.",
            "dir.invalidRequest": "Invalid route request.",
            "dir.unknownStatus": "Unknown routing error.",
            "dir.durationHoursMins": "{{h}} h {{m}} min",
            "dir.durationMinsOnly": "{{m}} min",

            "home.login": "Log in",
            "home.profile": "Profile",
            "home.logout": "Log out",
            "home.galleryH2": "Places to explore",
            "home.cat.culture": "Culture / Museums",
            "home.cat.fun": "Nightlife",
            "home.cat.parks": "Leisure / Parks",
            "home.featuresH2": "Features:",
            "home.features.map": "<strong>Map view:</strong> Places appear on an interactive map for easy browsing.",
            "home.features.search": "<strong>Search:</strong> Quickly find different venues and spots.",
            "home.features.filter": "<strong>Filters:</strong> Narrow places by category (restaurants, cafés, etc.).",
            "home.features.fav": "<strong>Saved favourites:</strong> Save places you like and find them again later.",
            "home.aboutH2": "About us",
            "home.aboutText": "BpMap helps you explore Budapest with filters and an interactive map—save favourites and build your own city map. Great for tourists and locals who love discovering new spots.",
            "home.profilH2": "Profile – Saved places",
            "home.profilIntro": "These places were saved from the map. Visible only when logged in.",
            "home.savedEmpty": "No saved places yet. On the map, open a place and tap “Save for later”.",
            "home.openMap": "Open map",
            "home.profilLogout": "Log out",
            "home.carouselPrev": "Previous",
            "home.carouselNext": "Next",
            "home.dotPage": "Go to slide {{n}}",

            "home.m1.alt": "Museum of Fine Arts",
            "home.m1.t": "Museum of Fine Arts",
            "home.m1.d": "Classical and ancient art on Heroes’ Square.",
            "home.m2.alt": "Hungarian National Museum",
            "home.m2.t": "Hungarian National Museum",
            "home.m2.d": "Home to Hungary’s most important historical exhibitions.",
            "home.m3.alt": "Ludwig Museum",
            "home.m3.t": "Ludwig Museum",
            "home.m3.d": "Contemporary art museum with fresh, modern shows.",
            "home.f1.alt": "Akvárium Klub",
            "home.f1.t": "Akvárium Klub",
            "home.f1.d": "Downtown club with concerts and lively nights.",
            "home.f2.alt": "A38 Ship",
            "home.f2.t": "A38 Ship",
            "home.f2.d": "Danube ship venue with varied music nights.",
            "home.f3.alt": "Szimpla Kert",
            "home.f3.t": "Szimpla Kert",
            "home.f3.d": "Iconic ruin bar with a unique vibe and many rooms.",
            "home.p1.alt": "Margaret Island",
            "home.p1.t": "Margaret Island",
            "home.p1.d": "Large green island with a running track and quiet paths.",
            "home.p2.alt": "City Park",
            "home.p2.t": "City Park",
            "home.p2.d": "Spacious park with playgrounds, a lake, and cultural venues.",
            "home.p3.alt": "Normafa",
            "home.p3.t": "Normafa",
            "home.p3.d": "Popular hike with beautiful views.",

            "profil.noPhoto": "No photo",
            "profil.openOnMap": "Open on map",

            "auth.loginTitle": "Log in",
            "auth.email": "Email",
            "auth.password": "Password",
            "auth.loginBtn": "Sign in",
            "auth.noAccount": "No account yet?",
            "auth.signupLink": "Sign up here!",
            "auth.signupTitle": "Sign up",
            "auth.confirm": "Confirm password",
            "auth.registerBtn": "Sign up",
            "auth.fillAll": "Please fill in all fields!",
            "auth.gmailOnly": "Only @gmail.com email addresses are allowed!",
            "auth.pwMismatch": "The two passwords do not match!",
            "auth.signupOk": "Registration successful!",
            "auth.loginOk": "Logged in successfully!",
            "auth.badCreds": "Wrong email or password!",
            "auth.registerFail": "Registration failed (check the server and database).",
            "auth.network": "Network error: start the Node server (e.g. node server.js) and try again.",
            "home.clearAllBtn": "Delete all saved places",
            "home.clearAllSearchLogBtn": "Delete all search history",
            "home.confirmClearAll": "Delete all saved places from the list (browser storage)?",
            "home.confirmClearAllSearchLog": "Delete all search history from the database?",
            "home.confirmDeleteLog": "Remove this search from your history?",
            "profil.removeAria": "Remove place from list",
            "profil.removeLogAria": "Remove search from history",
            "profil.removeBtn": "Remove"
        }
    };

    function getLang() {
        try {
            return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "hu";
        } catch (e) {
            return "hu";
        }
    }

    function setLang(lang) {
        try {
            localStorage.setItem(STORAGE_KEY, lang === "en" ? "en" : "hu");
        } catch (e) {}
        window.location.reload();
    }

    function t(key, vars) {
        var table = STR[getLang()] || STR.hu;
        var s = (table && table[key]) || STR.hu[key] || key;
        if (vars && typeof s === "string") {
            s = s.replace(/\{\{(\w+)\}\}/g, function (_, name) {
                return vars[name] != null ? String(vars[name]) : "";
            });
        }
        return s;
    }

    function apply() {
        var lang = getLang();
        document.documentElement.lang = lang === "en" ? "en" : "hu";

        var titleEl = document.querySelector("title[data-i18n]");
        if (titleEl) {
            var tk = titleEl.getAttribute("data-i18n");
            if (tk) titleEl.textContent = t(tk);
        }

        document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
            var hk = el.getAttribute("data-i18n-html");
            if (hk) el.innerHTML = t(hk);
        });

        document.querySelectorAll("[data-i18n]").forEach(function (el) {
            if (el.tagName === "TITLE") return;
            if (el.hasAttribute("data-i18n-html")) return;
            var key = el.getAttribute("data-i18n");
            if (!key) return;
            el.textContent = t(key);
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-placeholder");
            if (key) el.setAttribute("placeholder", t(key));
        });

        document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-title");
            if (key) el.setAttribute("title", t(key));
        });

        document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-aria-label");
            if (key) el.setAttribute("aria-label", t(key));
        });

        document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
            var key = el.getAttribute("data-i18n-alt");
            if (key) el.setAttribute("alt", t(key));
        });

        var sel = document.getElementById("placeFilter");
        if (sel) {
            var optMap = {
                minden: "map.opt.all",
                ettermek: "map.opt.restaurants",
                bulizo: "map.opt.bars",
                turisztikai: "map.opt.tourist",
                kavezo: "map.opt.cafes"
            };
            for (var i = 0; i < sel.options.length; i++) {
                var opt = sel.options[i];
                var ok = optMap[opt.value];
                if (ok) opt.textContent = t(ok);
            }
        }

        var btn = document.getElementById("bpmapLangBtn");
        if (btn) {
            btn.textContent = lang === "en" ? t("lang.switchToHu") : t("lang.switchToEn");
            btn.setAttribute("aria-label", lang === "en" ? t("lang.ariaToHu") : t("lang.ariaToEn"));
            btn.setAttribute("title", t("lang.currentHint"));
        }
    }

    function injectStyles() {
        if (document.getElementById("bpmap-i18n-styles")) return;
        var s = document.createElement("style");
        s.id = "bpmap-i18n-styles";
        s.textContent =
            "#bpmapLangBtn{position:fixed;top:12px;left:12px;right:auto;z-index:10050;padding:8px 14px;font:inherit;font-size:0.9rem;" +
            "cursor:pointer;border-radius:8px;border:1px solid rgba(255,255,255,0.35);background:rgba(0,0,0,0.45);color:#fff;" +
            "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}" +
            "#bpmapLangBtn:hover{background:rgba(0,0,0,0.65);}" +
            "@media(max-width:768px){#bpmapLangBtn{top:12px;left:12px;bottom:auto;right:auto;}}";
        document.head.appendChild(s);
    }

    function wireToggle() {
        var btn = document.getElementById("bpmapLangBtn");
        if (!btn) return;
        btn.addEventListener("click", function () {
            setLang(getLang() === "en" ? "hu" : "en");
        });
    }

    function boot() {
        injectStyles();
        apply();
        wireToggle();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    window.I18N = {
        getLang: getLang,
        setLang: setLang,
        t: t,
        apply: apply
    };
})();
