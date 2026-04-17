try { require("dotenv").config(); } catch (_) {}

const http = require("http");
const path = require("path");
const fs = require("fs");
const url = require("url");

let mysql = null;
try {
  mysql = require("mysql2/promise");
} catch (e) {
  console.warn("Figyelem: mysql2 nincs telepítve. Futtasd: npm install mysql2");
}

const bcrypt = require("bcryptjs");
const BCRYPT_ROUNDS = 10;

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

async function getPool() {
  if (!mysql) return null;
  if (!pool) {
    try {
      pool = mysql.createPool(DB_CONFIG);
      const conn = await pool.getConnection();
      await conn.query("SELECT 1");
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
      const [rows] = await db.query("SELECT ID, Email, Jelszo FROM felhasznalo WHERE Email = ?", [Email]);
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
      send(res, 200, { ID: row.ID, Email: row.Email });
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
      const [result] = await db.query(
        "INSERT INTO felhasznalo (Email, Jelszo) VALUES (?, ?)",
        [Email, jelszoHash]
      );
      send(res, 201, { ok: true, id: result.insertId });
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
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res);
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log("BpMap szerver fut: http://localhost:" + PORT);
  if (!mysql) console.log("API-hoz telepítsd a mysql2-t: npm install mysql2");
});

