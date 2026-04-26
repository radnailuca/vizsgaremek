try { require("dotenv").config(); } catch (_) {}

const http = require("http");
const path = require("path");
const fs = require("fs");
const url = require("url");
const crypto = require("crypto");

let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  console.warn("Figyelem: mysql2 nincs telepítve. Futtasd: npm install mysql2");
}

const bcrypt = require("bcryptjs");
const BCRYPT_ROUNDS = 10;
const ADMIN_SESSION_TTL_MS = 5 * 60 * 1000;
const SESSION_COOKIE_NAME = "bpmap_session";
const sessions = new Map();

function isBcryptHash(s) {
  return typeof s === "string" && /^\$2[aby]\$/.test(s);
}

const PORT = process.env.PORT || 3000;
const STATIC_DIR = __dirname;

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bpmap",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool = null;

async function ensureSchema(db) {
  await db.query(
    `ALTER TABLE felhasznalo
     ADD COLUMN IF NOT EXISTS jelszo_kerveny TINYINT(1) NOT NULL DEFAULT 0`
  );
  await db.query(
    `CREATE TABLE IF NOT EXISTS admin_log (
      ID INT(11) NOT NULL AUTO_INCREMENT,
      admin_id INT(11) NULL,
      admin_email VARCHAR(255) NOT NULL,
      muvelet VARCHAR(100) NOT NULL,
      torolt_id INT(11) NULL,
      torolt_email VARCHAR(255) NOT NULL,
      torles_datuma DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (ID),
      KEY idx_admin_log_admin_id (admin_id),
      KEY idx_admin_log_torolt_id (torolt_id),
      CONSTRAINT fk_adminlog_admin_id FOREIGN KEY (admin_id) REFERENCES felhasznalo (ID) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT fk_adminlog_torolt_id FOREIGN KEY (torolt_id) REFERENCES felhasznalo (ID) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci`
  );
}

async function getPool() {
  if (!mysql) return null;
  if (!pool) {
    try {
      pool = mysql.createPool(DB_CONFIG);
      const conn = await pool.getConnection();
      await conn.query("SELECT 1");
      await ensureSchema(pool);
      conn.release();
      console.log("SQL adatbázis kapcsolat rendben (bpmap).");
    } catch (err) {
      console.error("SQL kapcsolat hiba:", err.message);
      pool = null;
    }
  }
  return pool;
}

function send(res, statusCode, body, contentType = "application/json") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function parseCookies(req) {
  const cookieHeader = req.headers && req.headers.cookie;
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`,
  ]);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  ]);
}

function createSession(user) {
  const role = user.szerep || "user";
  const isAdminLike = role === "admin" || role === "super_admin";
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    userId: Number(user.ID),
    email: user.Email,
    szerep: role,
    adminExpiresAt: isAdminLike ? Date.now() + ADMIN_SESSION_TTL_MS : null,
  });
  return token;
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  return { token, session };
}

function requireAdminSession(req) {
  const active = getSessionFromRequest(req);
  if (!active) return { ok: false, reason: "no-session" };
  const role = active.session.szerep;
  if (role !== "admin" && role !== "super_admin") return { ok: false, reason: "forbidden" };
  const now = Date.now();
  // Visszafelé kompatibilitás: régebbi session objektumban még nem volt adminExpiresAt.
  if (!active.session.adminExpiresAt) {
    active.session.adminExpiresAt = now + ADMIN_SESSION_TTL_MS;
  }
  if (active.session.adminExpiresAt <= now) {
    sessions.delete(active.token);
    return { ok: false, reason: "no-session" };
  }
  active.session.adminExpiresAt = now + ADMIN_SESSION_TTL_MS;
  return { ok: true, token: active.token, session: active.session };
}

function cleanupExpiredSessions() {
  // Nincs globális session TTL, ezért itt csak hibás bejegyzéseket törlünk.
  for (const [token, session] of sessions.entries()) {
    if (!session) sessions.delete(token);
  }
}

function sendError(res, code, message) {
  send(res, code, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}


async function handleApiFelhasznalo(req, res, db) {
  const method = (req.method || "GET").toUpperCase();
  const pathname = url.parse(req.url, true).pathname || "";

  if (!db) return sendError(res, 503, "Adatbázis nem elérhető.");

  if (method === "POST" && pathname === "/api/felhasznalo/hely") {
    try {
      const body = await parseBody(req);
      const uid = body.userId != null ? body.userId : body.UserID != null ? body.UserID : body.felhasznaloID;
      const placeID = body.placeID != null ? body.placeID : body.place_id;
      if (uid == null || placeID == null || String(placeID).trim() === "") {
        return sendError(res, 400, "userId és placeID kötelező.");
      }
      const pid = String(placeID).trim().slice(0, 255);
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [ins] = await conn.query(
          "INSERT IGNORE INTO felhasznalo_hely (felhasznaloID, placeID) VALUES (?, ?)",
          [Number(uid), pid]
        );
        const uj = ins && typeof ins.affectedRows === "number" && ins.affectedRows === 1;
        if (uj) {
          await conn.query(
            `INSERT INTO statisztika_napi (felhasznaloID, datum, kereses_db, uj_hely_db)
             VALUES (?, CURDATE(), 0, 1)
             ON DUPLICATE KEY UPDATE uj_hely_db = uj_hely_db + 1`,
            [Number(uid)]
          );
        }
        await conn.commit();
        send(res, 200, { ok: true, ujHely: uj });
      } catch (inner) {
        await conn.rollback();
        throw inner;
      } finally {
        conn.release();
      }
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/felhasznalo/login") {
    try {
      const body = await parseBody(req);
      const { Email, Jelszo } = body;
      if (!Email || !Jelszo) return sendError(res, 400, "Email és Jelszo kötelező.");
      const [rows] = await db.query("SELECT ID, Email, Jelszo, szerep FROM felhasznalo WHERE Email = ?", [Email]);
      if (rows.length === 0) return sendError(res, 401, "Hibás email vagy jelszó.");
      const row = rows[0];
      let passwordOk = false;
      if (isBcryptHash(row.Jelszo)) {
        passwordOk = bcrypt.compareSync(Jelszo, row.Jelszo);
      } else {
        passwordOk = row.Jelszo === Jelszo;
        if (passwordOk) {
          const newHash = bcrypt.hashSync(Jelszo, BCRYPT_ROUNDS);
          await db.query("UPDATE felhasznalo SET Jelszo = ? WHERE ID = ?", [newHash, row.ID]);
        }
      }
      if (!passwordOk) return sendError(res, 401, "Hibás email vagy jelszó.");
      const token = createSession(row);
      setSessionCookie(res, token);
      send(res, 200, { ID: row.ID, Email: row.Email, szerep: row.szerep || "user" });
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/felhasznalo/register") {
    try {
      const body = await parseBody(req);
      const { Email, Jelszo } = body;
      if (!Email || !Jelszo) return sendError(res, 400, "Email és Jelszo kötelező.");
      const jelszoHash = bcrypt.hashSync(Jelszo, BCRYPT_ROUNDS);
      const [[countRow]] = await db.query("SELECT COUNT(*) AS db FROM felhasznalo");
      const userCount =
        countRow && (countRow.db != null ? Number(countRow.db) : Number(Object.values(countRow)[0]));
      const szerep = userCount === 0 ? "super_admin" : "user";
      const [result] = await db.query(
        "INSERT INTO felhasznalo (Email, Jelszo, szerep) VALUES (?, ?, ?)",
        [Email, jelszoHash, szerep]
      );
      send(res, 201, { ok: true, id: result.insertId, szerep });
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/felhasznalo/password-reset-request") {
    try {
      const body = await parseBody(req);
      const email = String(body && body.Email ? body.Email : "").trim();
      if (!email) return sendError(res, 400, "Email kötelező.");
      const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
      if (!gmailRegex.test(email)) {
        return sendError(res, 400, "Csak érvényes @gmail.com email cím adható meg.");
      }
      const [rows] = await db.query("SELECT ID FROM felhasznalo WHERE Email = ? LIMIT 1", [email]);
      if (!rows || rows.length === 0) {
        return sendError(res, 404, "Nincs ilyen regisztrált email.");
      }
      await db.query("UPDATE felhasznalo SET jelszo_kerveny = 1 WHERE Email = ?", [email]);
      send(res, 200, { ok: true, message: "Jelszó-visszaállítási kérés elfogadva." });
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/felhasznalo/logout") {
    const active = getSessionFromRequest(req);
    if (active && active.token) {
      sessions.delete(active.token);
    }
    clearSessionCookie(res);
    send(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/felhasznalo/session") {
    const active = getSessionFromRequest(req);
    if (!active) return sendError(res, 401, "Nincs aktív session.");
    const isAdminLike =
      active.session.szerep === "admin" || active.session.szerep === "super_admin";
    const remainingMs =
      isAdminLike && active.session.adminExpiresAt
        ? Math.max(0, active.session.adminExpiresAt - Date.now())
        : null;
    send(res, 200, {
      user: {
        ID: active.session.userId,
        Email: active.session.email,
        szerep: active.session.szerep,
      },
      expiresInMs: remainingMs,
    });
    return;
  }

  sendError(res, 404, "Nem található.");
}

async function handleApiAdmin(req, res, db) {
  const method = (req.method || "GET").toUpperCase();
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "";
  if (!db) return sendError(res, 503, "Adatbázis nem elérhető.");
  const auth = requireAdminSession(req);
  if (!auth.ok) {
    if (auth.reason === "forbidden") return sendError(res, 403, "Nincs admin jogosultság.");
    return sendError(res, 401, "Bejelentkezés szükséges.");
  }

  if (method === "GET" && pathname === "/api/admin/session") {
    const remainingMs = Math.max(0, (auth.session.adminExpiresAt || 0) - Date.now());
    send(res, 200, {
      ok: true,
      user: {
        ID: auth.session.userId,
        Email: auth.session.email,
        szerep: auth.session.szerep,
      },
      expiresInMs: remainingMs,
    });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/users") {
    try {
      const [rows] = await db.query(
        "SELECT ID, Email, szerep, jelszo_kerveny FROM felhasznalo ORDER BY ID ASC"
      );
      send(res, 200, { ok: true, users: rows || [] });
    } catch (e) {
      sendError(res, 500, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/admin/users/delete") {
    try {
      const body = await parseBody(req);
      const userId = Number(body && body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        return sendError(res, 400, "Érvénytelen userId.");
      }
      if (userId === Number(auth.session.userId)) {
        return sendError(res, 400, "A saját admin fiók nem törölhető.");
      }
      const [targetRows] = await db.query(
        "SELECT ID, Email, szerep FROM felhasznalo WHERE ID = ? LIMIT 1",
        [userId]
      );
      if (!targetRows || targetRows.length === 0) {
        return sendError(res, 404, "Felhasználó nem található.");
      }
      const targetUser = targetRows[0];
      const targetRole = String(targetUser.szerep || "user").toLowerCase();
      if (targetRole === "super_admin") {
        return sendError(res, 403, "A super admin fiók nem törölhető.");
      }
      const actorRole = String(auth.session.szerep || "user").toLowerCase();
      if (actorRole === "admin" && targetRole !== "user") {
        return sendError(res, 403, "Admin csak user fiókot törölhet.");
      }
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query("DELETE FROM felhasznalo WHERE ID = ?", [userId]);
        const deleted =
          result && typeof result.affectedRows === "number" ? result.affectedRows : 0;
        if (deleted === 0) {
          await conn.rollback();
          return sendError(res, 404, "Felhasználó nem található.");
        }
        await conn.query(
          `INSERT INTO admin_log
             (admin_id, admin_email, muvelet, torolt_id, torolt_email, torles_datuma)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            Number(auth.session.userId),
            String(auth.session.email || ""),
            "felhasznalo_torles",
            Number(targetUser.ID),
            String(targetUser.Email || ""),
          ]
        );
        await conn.commit();
        send(res, 200, { ok: true, deleted });
      } catch (inner) {
        await conn.rollback();
        throw inner;
      } finally {
        conn.release();
      }
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/admin/users/role") {
    try {
      const body = await parseBody(req);
      const userId = Number(body && body.userId);
      const nextRoleRaw = body && body.szerep;
      const nextRole = nextRoleRaw === "admin" ? "admin" : nextRoleRaw === "user" ? "user" : null;
      if (!Number.isFinite(userId) || userId <= 0 || !nextRole) {
        return sendError(res, 400, "Érvénytelen userId vagy szerep.");
      }
      const actorRole = String(auth.session.szerep || "user").toLowerCase();
      if (actorRole !== "super_admin") {
        return sendError(res, 403, "Csak a super admin módosíthat szerepkört.");
      }
      if (userId === Number(auth.session.userId)) {
        return sendError(res, 400, "A saját admin fiók szerepe itt nem módosítható.");
      }
      const [targetRows] = await db.query(
        "SELECT ID, Email, szerep FROM felhasznalo WHERE ID = ? LIMIT 1",
        [userId]
      );
      if (!targetRows || targetRows.length === 0) {
        return sendError(res, 404, "Felhasználó nem található.");
      }
      const targetUser = targetRows[0];
      const targetRole = String(targetUser.szerep || "user").toLowerCase();
      if (targetRole === "super_admin") {
        return sendError(res, 403, "A super admin szerepe nem módosítható.");
      }
      if (nextRole === "admin") {
        const [[countRow]] = await db.query(
          "SELECT COUNT(*) AS admin_db FROM felhasznalo WHERE szerep = 'admin'"
        );
        const adminCount = Number(
          countRow && (countRow.admin_db != null ? countRow.admin_db : Object.values(countRow)[0])
        );
        const isAlreadyAdmin = targetRole === "admin";
        if (!isAlreadyAdmin && adminCount >= 5) {
          return sendError(res, 400, "Maximum 5 admin lehet.");
        }
      }
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query("UPDATE felhasznalo SET szerep = ? WHERE ID = ?", [
          nextRole,
          userId,
        ]);
        const changed =
          result && typeof result.affectedRows === "number" ? result.affectedRows : 0;
        if (changed === 0) {
          await conn.rollback();
          return sendError(res, 404, "Felhasználó nem található.");
        }
        await conn.query(
          `INSERT INTO admin_log
             (admin_id, admin_email, muvelet, torolt_id, torolt_email, torles_datuma)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            Number(auth.session.userId),
            String(auth.session.email || ""),
            `szerep_modositas:${targetRole}->${nextRole}`,
            Number(targetUser.ID),
            String(targetUser.Email || ""),
          ]
        );
        await conn.commit();
        send(res, 200, { ok: true, userId, szerep: nextRole });
      } catch (inner) {
        await conn.rollback();
        throw inner;
      } finally {
        conn.release();
      }
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  sendError(res, 404, "Nem található.");
}

async function handleApiStatisztika(req, res, db) {
  const parsed = url.parse(req.url, true);
  const rawPath = parsed.pathname || "";
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;

  if (!db) return sendError(res, 503, "Adatbázis nem elérhető.");

  if ((req.method || "GET").toUpperCase() === "GET" && pathname === "/api/statisztika") {
    const userId = parsed.query.userId;
    if (userId == null || String(userId).trim() === "") {
      return sendError(res, 400, "userId kötelező.");
    }
    const uid = Number(userId);
    if (!Number.isFinite(uid) || uid <= 0) {
      return sendError(res, 400, "Érvénytelen userId.");
    }

    try {
      const [[sumRow]] = await db.query(
        "SELECT COALESCE(SUM(kereses_db), 0) AS osszesKereses FROM statisztika_napi WHERE felhasznaloID = ?",
        [uid]
      );
      const [tipusRows] = await db.query(
        "SELECT helytipus, kereses_db FROM statisztika_tipus WHERE felhasznaloID = ? ORDER BY kereses_db DESC, helytipus ASC LIMIT 10",
        [uid]
      );
      const [[countRow]] = await db.query(
        "SELECT COUNT(*) AS n_uj_hely FROM felhasznalo_hely WHERE felhasznaloID = ?",
        [uid]
      );
      const ujHely =
        countRow &&
        (countRow.n_uj_hely != null
          ? countRow.n_uj_hely
          : countRow.N_UJ_HELY != null
            ? countRow.N_UJ_HELY
            : Object.values(countRow)[0]);
      send(res, 200, {
        osszesKereses: Number(sumRow.osszesKereses) || 0,
        topTipusok: tipusRows || [],
        ujHelyekSzama: Number(ujHely) || 0,
      });
    } catch (e) {
      sendError(res, 500, e.message);
    }
    return;
  }

  sendError(res, 404, "Nem található.");
}

function resolveBodyUserId(body) {
  const v =
    body.userId != null ? body.userId : body.UserID != null ? body.UserID : body.felhasznaloID;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleApiLog(req, res, db) {
  const method = (req.method || "GET").toUpperCase();
  const parsed = url.parse(req.url, true);
  const rawPath = parsed.pathname || "";
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;

  if (!db) return sendError(res, 503, "Adatbázis nem elérhető.");

  if (method === "GET" && pathname === "/api/log") {
    const userId = parsed.query.userId;
    if (!userId) return sendError(res, 400, "userId kötelező.");

    try {
      const [rows] = await db.query(
        `SELECT ID, felhasznaloID, helyNev
         FROM \`log\`
         WHERE felhasznaloID = ?
         ORDER BY ID DESC`,
        [userId]
      );
      send(res, 200, rows);
    } catch (e) {
      sendError(res, 500, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/log/delete") {
    try {
      const body = await parseBody(req);
      const logId = body.id != null ? body.id : body.logId;
      const uid = resolveBodyUserId(body);
      if (logId == null || uid == null) {
        return sendError(res, 400, "id és userId kötelező.");
      }
      const [result] = await db.query("DELETE FROM `log` WHERE ID = ? AND felhasznaloID = ?", [
        Number(logId),
        uid,
      ]);
      const affected =
        result && typeof result.affectedRows === "number" ? result.affectedRows : 0;
      if (affected === 0) {
        return sendError(res, 404, "Bejegyzés nem található.");
      }
      send(res, 200, { ok: true, deleted: affected });
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/log/clear") {
    try {
      const body = await parseBody(req);
      const uid = resolveBodyUserId(body);
      if (uid == null) {
        return sendError(res, 400, "userId kötelező (userId, UserID vagy felhasznaloID).");
      }
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [logDel] = await conn.query("DELETE FROM `log` WHERE felhasznaloID = ?", [uid]);
        const [tipDel] = await conn.query(
          "DELETE FROM statisztika_tipus WHERE felhasznaloID = ?",
          [uid]
        );
        await conn.commit();
        const n = logDel && typeof logDel.affectedRows === "number" ? logDel.affectedRows : 0;
        const tipN = tipDel && typeof tipDel.affectedRows === "number" ? tipDel.affectedRows : 0;
        send(res, 200, { ok: true, deleted: n, tipusTorolve: tipN });
      } catch (inner) {
        await conn.rollback();
        throw inner;
      } finally {
        conn.release();
      }
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  if (method === "POST" && pathname === "/api/log") {
    try {
      const body = await parseBody(req);
      const { helyNev } = body;
      const felhasznaloID = body.felhasznaloID != null ? body.felhasznaloID : body.UserID;
      const trimmedHelyNev = typeof helyNev === "string" ? helyNev.trim() : "";
      const helytipusRaw = body.helytipus;
      const trimmedTipus =
        typeof helytipusRaw === "string" ? helytipusRaw.trim().slice(0, 100) : "";

      if (felhasznaloID == null || !trimmedHelyNev) {
        return sendError(res, 400, "felhasznaloID (vagy UserID) és helyNev kötelező.");
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query(
          "INSERT INTO `log` (felhasznaloID, helyNev) VALUES (?, ?)",
          [felhasznaloID, trimmedHelyNev]
        );
        await conn.query(
          `INSERT INTO statisztika_napi (felhasznaloID, datum, kereses_db, uj_hely_db)
           VALUES (?, CURDATE(), 1, 0)
           ON DUPLICATE KEY UPDATE kereses_db = kereses_db + 1`,
          [felhasznaloID]
        );
        if (trimmedTipus) {
          await conn.query(
            `INSERT INTO statisztika_tipus (felhasznaloID, helytipus, kereses_db)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE kereses_db = kereses_db + 1`,
            [felhasznaloID, trimmedTipus]
          );
        }
        await conn.commit();
        send(res, 201, { ok: true, id: result.insertId });
      } catch (inner) {
        await conn.rollback();
        throw inner;
      } finally {
        conn.release();
      }
    } catch (e) {
      sendError(res, 400, e.message);
    }
    return;
  }

  sendError(res, 404, "Nem található.");
}

async function handleApi(req, res) {
  const method = (req.method || "GET").toUpperCase();
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "";

  if (method === "OPTIONS" && pathname.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  const db = await getPool();

  if (pathname.startsWith("/api/felhasznalo")) return handleApiFelhasznalo(req, res, db);
  if (pathname.startsWith("/api/statisztika")) return handleApiStatisztika(req, res, db);
  if (pathname.startsWith("/api/log")) return handleApiLog(req, res, db);
  if (pathname.startsWith("/api/admin")) return handleApiAdmin(req, res, db);

  sendError(res, 404, "API végpont nem található.");
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "/kezdooldal.html" : pathname;
  filePath = path.join(STATIC_DIR, path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ""));
  if (!path.isAbsolute(filePath)) filePath = path.join(STATIC_DIR, filePath);

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        send(res, 404, "Fájl nem található.", "text/plain");
      } else {
        send(res, 500, "Szerver hiba.", "text/plain");
      }
      return;
    }
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  cleanupExpiredSessions();
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res);
  }

  if (pathname === "/admin" || pathname === "/admin.html") {
    const auth = requireAdminSession(req);
    if (!auth.ok) {
      res.writeHead(302, { Location: "/login.html" });
      res.end();
      return;
    }
    return serveStatic(req, res, "/admin.html");
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log("BpMap szerver fut: http://localhost:" + PORT);
  if (!mysql) console.log("API-hoz telepítsd a mysql2-t: npm install mysql2");
});

