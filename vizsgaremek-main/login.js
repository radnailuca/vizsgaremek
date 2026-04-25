var authToastTimer;

function T(key) {
    return window.I18N && window.I18N.t ? window.I18N.t(key) : key;
}

function showAuthToast(message, type) {
    var el = document.getElementById("authToast");
    if (!el) {
        return;
    }
    clearTimeout(authToastTimer);
    el.textContent = message;
    el.className = "auth-toast auth-toast--visible auth-toast--" + (type || "info");
    if (type === "error") {
        el.setAttribute("role", "alert");
        el.setAttribute("aria-live", "assertive");
    } else {
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
    }
    authToastTimer = setTimeout(function () {
        el.classList.remove("auth-toast--visible", "auth-toast--error", "auth-toast--success", "auth-toast--info");
        el.textContent = "";
        el.className = "auth-toast";
    }, 4500);
}

function init() {
    var loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async function () {
            var email = document.getElementById("email").value.trim();
            var password = document.getElementById("password").value.trim();
            if (email === "" || password === "") {
                showAuthToast(T("auth.fillAll"), "error");
                return;
            }

            loginBtn.disabled = true;
            try {
                var resp = await fetch("/api/felhasznalo/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Email: email,
                        Jelszo: password,
                    }),
                });
                var data = await resp.json().catch(function () {
                    return {};
                });
                if (!resp.ok) {
                    showAuthToast(data.error || T("auth.badCreds"), "error");
                    return;
                }
                localStorage.setItem("bpmap_logged_in", "1");
                localStorage.setItem("bpmap_user", JSON.stringify({
                    ID: data.ID,
                    Email: data.Email,
                    szerep: data.szerep || "user",
                }));
                clearTimeout(authToastTimer);
                showAuthToast(T("auth.loginOk"), "success");
                authToastTimer = setTimeout(function () {
                    var isAdmin = data && (data.szerep === "admin" || data.szerep === "super_admin");
                    window.location.href = isAdmin ? "/admin" : "kezdooldal.html";
                }, 900);
            } catch (e) {
                showAuthToast(T("auth.network"), "error");
            } finally {
                loginBtn.disabled = false;
            }
        });
    }

    var signupLink = document.getElementById("signupLink");
    if (signupLink) {
        signupLink.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "sign.html";
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
