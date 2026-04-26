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
    var registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        registerBtn.addEventListener("click", async function () {
            var email = document.getElementById("email").value.trim();
            var password = document.getElementById("password").value.trim();
            var confirm = document.getElementById("confirm").value.trim();
            var gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
            if (email === "" || password === "" || confirm === "") {
                showAuthToast(T("auth.fillAll"), "error");
                return;
            }
            if (!gmailRegex.test(email)) {
                showAuthToast(T("auth.gmailOnly"), "error");
                return;
            }
            if (password !== confirm) {
                showAuthToast(T("auth.pwMismatch"), "error");
                return;
            }

            registerBtn.disabled = true;
            try {
                var resp = await fetch("/api/felhasznalo/register", {
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
                    showAuthToast(data.error || T("auth.registerFail"), "error");
                    return;
                }
                clearTimeout(authToastTimer);
                showAuthToast(T("auth.signupOk"), "success");
                authToastTimer = setTimeout(function () {
                    window.location.href = "login.html";
                }, 900);
            } catch (e) {
                showAuthToast(T("auth.network"), "error");
            } finally {
                registerBtn.disabled = false;
            }
        });
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
