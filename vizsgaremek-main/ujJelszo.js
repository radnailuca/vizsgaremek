var authToastTimer;

function showAuthToast(message, type) {
    var el = document.getElementById("authToast");
    if (!el) return;
    clearTimeout(authToastTimer);
    el.textContent = message;
    el.className = "auth-toast auth-toast--visible auth-toast--" + (type || "info");
    authToastTimer = setTimeout(function () {
        el.classList.remove("auth-toast--visible", "auth-toast--error", "auth-toast--success", "auth-toast--info");
        el.textContent = "";
        el.className = "auth-toast";
    }, 4500);
}

function initResetRequest() {
    var btn = document.getElementById("requestBtn");
    if (!btn) return;

    btn.addEventListener("click", async function () {
        var email = (document.getElementById("email").value || "").trim();
        var gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!email) {
            showAuthToast("Add meg az email címet.", "error");
            return;
        }
        if (!gmailRegex.test(email)) {
            showAuthToast("Csak érvényes @gmail.com email cím adható meg.", "error");
            return;
        }
        btn.disabled = true;
        try {
            var resp = await fetch("/api/felhasznalo/password-reset-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Email: email })
            });
            var data = await resp.json().catch(function () {
                return {};
            });
            if (!resp.ok) {
                showAuthToast(data.error || "A kérés sikertelen.", "error");
                return;
            }
            showAuthToast(data.message || "Jelszó-visszaállítási kérés elküldve.", "success");
        } catch (e) {
            showAuthToast("Hálózati hiba történt.", "error");
        } finally {
            btn.disabled = false;
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResetRequest);
} else {
    initResetRequest();
}
