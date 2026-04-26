(function () {
  var timerId = null;
  var remainingMs = 0;
  var refreshTimerId = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatMs(ms) {
    var safe = Math.max(0, Number(ms) || 0);
    var totalSeconds = Math.floor(safe / 1000);
    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;
    var mm = mins < 10 ? "0" + mins : String(mins);
    var ss = secs < 10 ? "0" + secs : String(secs);
    return mm + ":" + ss;
  }

  function updateCountdown() {
    var el = document.getElementById("sessionRemaining");
    if (!el) return;
    el.textContent = formatMs(remainingMs);
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      window.location.href = "/login.html";
    }
  }

  async function loadSession() {
    var resp = await fetch("/api/admin/session", { method: "GET" });
    if (!resp.ok) {
      window.location.href = "/login.html";
      return null;
    }
    var data = await resp.json().catch(function () {
      return null;
    });
    var role = data && data.user ? data.user.szerep : null;
    if (!data || !data.user || (role !== "admin" && role !== "super_admin")) {
      window.location.href = "/login.html";
      return null;
    }
    return data;
  }

  async function loadUsers(currentAdminId, currentUserRole) {
    var grid = document.getElementById("usersGrid");
    if (!grid) return;
    grid.innerHTML = '<div class="users-empty">Betöltés...</div>';
    try {
      var resp = await fetch("/api/admin/users", { method: "GET" });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          window.location.href = "/login.html";
          return;
        }
        if (resp.status === 404) {
          grid.innerHTML =
            '<div class="users-empty">Az admin users API nem érhető el (404). Indítsd újra a Node szervert.</div>';
          return;
        }
        var errData = await resp.json().catch(function () {
          return null;
        });
        var msg = errData && errData.error ? String(errData.error) : ("HTTP " + resp.status);
        grid.innerHTML =
          '<div class="users-empty">Nem sikerült betölteni a felhasználókat: ' + escapeHtml(msg) + ".</div>";
        return;
      }
      var data = await resp.json().catch(function () {
        return null;
      });
      var users = data && Array.isArray(data.users) ? data.users : [];
      var isActorSuperAdmin = String(currentUserRole || "").toLowerCase() === "super_admin";
      if (!users.length) {
        grid.innerHTML = '<div class="users-empty">Nincs felhasználó az adatbázisban.</div>';
        return;
      }
      grid.innerHTML = users
        .map(function (u) {
          var userIdNum = Number(u.ID);
          var role = String(u.szerep || "user").toLowerCase();
          var isSuperAdmin = role === "super_admin";
          var isCurrentAdmin =
            Number.isFinite(userIdNum) && Number.isFinite(Number(currentAdminId))
              ? userIdNum === Number(currentAdminId)
              : false;
          var roleClass = isCurrentAdmin
            ? "profile-card--current-admin"
            : role === "super_admin"
              ? "profile-card--super-admin"
              : role === "admin"
                ? "profile-card--admin"
                : "profile-card--user";
          var hasResetRequest = Number(u.jelszo_kerveny) === 1;
          var deleteDisabled = isSuperAdmin || isCurrentAdmin ? " disabled" : "";
          var deleteLabel = isSuperAdmin ? "Super admin" : isCurrentAdmin ? "Saját fiók" : "Törlés";
          var switchDisabledClass =
            isSuperAdmin || isCurrentAdmin || !isActorSuperAdmin ? " role-toggle--disabled" : "";
          var userActiveClass = role === "user" ? " is-active" : "";
          var adminActiveClass = role === "admin" || role === "super_admin" ? " is-active" : "";
          var switchDisabledAttr =
            isSuperAdmin || isCurrentAdmin || !isActorSuperAdmin ? " disabled" : "";
          return (
            '<article class="profile-card ' + roleClass + '">' +
            '<div class="profile-card__body">' +
            '<p><strong>Email:</strong> ' + escapeHtml(u.Email || "") + '</p>' +
            "</div>" +
            '<div class="profile-card__actions">' +
            (hasResetRequest
              ? '<button type="button" class="profile-card__request" disabled>Jelszó módosítási kérvény</button>'
              : "") +
            (isSuperAdmin
              ? ""
              : '<div class="role-toggle' + switchDisabledClass + '" data-user-id="' + escapeHtml(u.ID) + '">' +
                '<button type="button" class="role-toggle__btn role-toggle__btn--user' + userActiveClass + '" data-role="user"' + switchDisabledAttr + ">USER</button>" +
                '<span class="role-toggle__sep" aria-hidden="true"></span>' +
                '<button type="button" class="role-toggle__btn role-toggle__btn--admin' + adminActiveClass + '" data-role="admin"' + switchDisabledAttr + ">ADMIN</button>" +
                "</div>") +
            '<button type="button" class="profile-card__delete" data-user-id="' + escapeHtml(u.ID) + '"' + deleteDisabled + ">" + deleteLabel + "</button>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
      bindDeleteButtons();
      bindRoleToggles();
    } catch (e) {
      grid.innerHTML = '<div class="users-empty">Hálózati hiba a betöltés közben.</div>';
    }
  }

  function bindDeleteButtons() {
    var buttons = document.querySelectorAll(".profile-card__delete");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var userId = Number(btn.getAttribute("data-user-id"));
        if (!Number.isFinite(userId) || userId <= 0) return;
        if (!window.confirm("Biztosan törlöd ezt a fiókot az adatbázisból?")) return;
        btn.disabled = true;
        try {
          var resp = await fetch("/api/admin/users/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId }),
          });
          if (!resp.ok) {
            var errData = await resp.json().catch(function () {
              return null;
            });
            var msg = errData && errData.error ? String(errData.error) : ("HTTP " + resp.status);
            window.alert("Törlés sikertelen: " + msg);
            btn.disabled = false;
            return;
          }
          var card = btn.closest(".profile-card");
          if (card && card.parentNode) {
            card.parentNode.removeChild(card);
          }
          var grid = document.getElementById("usersGrid");
          if (grid && !grid.querySelector(".profile-card")) {
            grid.innerHTML = '<div class="users-empty">Nincs felhasználó az adatbázisban.</div>';
          }
        } catch (e) {
          window.alert("Hálózati hiba törlés közben.");
          btn.disabled = false;
        }
      });
    });
  }

  function applyRoleVisualState(card, role, isCurrentAdmin) {
    if (!card) return;
    card.classList.remove("profile-card--super-admin", "profile-card--admin", "profile-card--user");
    if (role === "super_admin") {
      card.classList.add("profile-card--super-admin");
    } else if (role === "admin") {
      card.classList.add("profile-card--admin");
    } else {
      card.classList.add("profile-card--user");
    }
  }

  function bindRoleToggles() {
    var toggles = document.querySelectorAll(".role-toggle");
    toggles.forEach(function (toggle) {
      var buttons = toggle.querySelectorAll(".role-toggle__btn");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", async function () {
          if (btn.disabled) return;
          var userId = Number(toggle.getAttribute("data-user-id"));
        if (!Number.isFinite(userId) || userId <= 0) return;
          var nextRole = btn.getAttribute("data-role") === "admin" ? "admin" : "user";
          if (btn.classList.contains("is-active")) return;
          buttons.forEach(function (b) {
            b.disabled = true;
          });
        try {
          var resp = await fetch("/api/admin/users/role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId, szerep: nextRole }),
          });
          if (!resp.ok) {
            var errData = await resp.json().catch(function () {
              return null;
            });
            var msg = errData && errData.error ? String(errData.error) : ("HTTP " + resp.status);
            window.alert("Szerepváltás sikertelen: " + msg);
              buttons.forEach(function (b) {
                b.disabled = false;
              });
            return;
          }
            buttons.forEach(function (b) {
              b.classList.toggle("is-active", b.getAttribute("data-role") === nextRole);
              b.disabled = false;
            });
            var card = toggle.closest(".profile-card");
          applyRoleVisualState(card, nextRole, false);
        } catch (e) {
          window.alert("Hálózati hiba szerepváltás közben.");
            buttons.forEach(function (b) {
              b.disabled = false;
            });
        }
        });
      });
    });
  }

  async function logout() {
    try {
      await fetch("/api/felhasznalo/logout", { method: "POST" });
    } catch (e) {}
    try {
      localStorage.removeItem("bpmap_logged_in");
      localStorage.removeItem("bpmap_user");
    } catch (e) {}
    window.location.href = "/login.html";
  }

  async function init() {
    var data = await loadSession();
    if (!data) return;
    await loadUsers(
      data && data.user ? data.user.ID : null,
      data && data.user ? data.user.szerep : null
    );

    var firstRemaining = Number(data.expiresInMs);
    remainingMs = Number.isFinite(firstRemaining) && firstRemaining > 1000 ? firstRemaining : (5 * 60 * 1000);
    updateCountdown();
    timerId = window.setInterval(updateCountdown, 1000);
    refreshTimerId = window.setInterval(async function () {
      var fresh = await loadSession();
      if (!fresh) return;
      var nextRemaining = Number(fresh.expiresInMs);
      if (Number.isFinite(nextRemaining) && nextRemaining > 0) {
        remainingMs = nextRemaining;
      }
    }, 30000);

    var logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (timerId) window.clearInterval(timerId);
        if (refreshTimerId) window.clearInterval(refreshTimerId);
        logout();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
