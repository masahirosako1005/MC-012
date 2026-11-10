/* 静的ファイル配信と、このPC内 SQLite の口コミ・お知らせ・管理ログイン・再訪KGI。外部ホストへは接続しない。 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var DatabaseSync = require("node:sqlite").DatabaseSync;
var noticeCheck = require("./js/notice-validate.js");
var staffAuth = require("./js/staff-auth.js");
var campaignCheck = require("./js/campaign-validate.js");
var boardStats = require("./js/board-stats.js");

var root = __dirname;
var port = 4192;
var sessionHours = 8;
var cookieName = "mt_admin";
var types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg"
};
var blocked = { ".sqlite": true, ".db": true };
var loginFails = {};
var eventFails = {};

var catalogContext = { console: console };
catalogContext.globalThis = catalogContext;
vm.createContext(catalogContext);
vm.runInContext(fs.readFileSync(path.join(root, "js/catalog.js"), "utf8"), catalogContext, { filename: "catalog.js" });
var catalog = catalogContext.TsudukiCatalog;
var spotIds = catalog.spots.map(function (spot) { return spot.id; });
var seasonIds = catalog.seasons.map(function (season) { return season.id; });

function known(list, value) {
  return list.indexOf(value) >= 0;
}

function sanitizeComment(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

var db = new DatabaseSync(path.join(root, "data", "reviews.sqlite"));
db.exec(
  "CREATE TABLE IF NOT EXISTS reviews (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "spot_id TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5)," +
  "revisit_intent INTEGER NOT NULL CHECK (revisit_intent IN (0, 1))," +
  "body TEXT NOT NULL," +
  "created_at TEXT NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS notices (" +
  "id TEXT PRIMARY KEY," +
  "category TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "spot_id TEXT NOT NULL," +
  "title TEXT NOT NULL," +
  "body TEXT NOT NULL," +
  "status TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "updated_at TEXT NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS staff (" +
  "staff_id TEXT PRIMARY KEY," +
  "role TEXT NOT NULL," +
  "password_hash TEXT NOT NULL," +
  "password_salt TEXT NOT NULL," +
  "created_at TEXT NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS admin_sessions (" +
  "token_hash TEXT PRIMARY KEY," +
  "staff_id TEXT NOT NULL," +
  "expires_at INTEGER NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS devices (" +
  "key_hash TEXT PRIMARY KEY," +
  "first_at TEXT NOT NULL," +
  "last_at TEXT NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS visits (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "key_hash TEXT NOT NULL," +
  "spot_id TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "reason TEXT NOT NULL," +
  "satisfaction INTEGER NOT NULL DEFAULT 0," +
  "revisit_intent INTEGER NOT NULL DEFAULT 0," +
  "had_other_season INTEGER NOT NULL DEFAULT 0," +
  "created_at TEXT NOT NULL," +
  "UNIQUE (key_hash, spot_id, season)" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS season_cross (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "key_hash TEXT NOT NULL," +
  "spot_id TEXT NOT NULL," +
  "from_season TEXT NOT NULL," +
  "to_season TEXT NOT NULL," +
  "to_reason TEXT NOT NULL," +
  "revisit_intent INTEGER NOT NULL DEFAULT 0," +
  "created_at TEXT NOT NULL," +
  "UNIQUE (key_hash, spot_id, from_season, to_season)" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS notice_open (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "key_hash TEXT NOT NULL," +
  "notice_id TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "UNIQUE (key_hash, notice_id)" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS plan_saves (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "key_hash TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "created_at TEXT NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS plan_items (" +
  "plan_id INTEGER NOT NULL," +
  "spot_id TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "reason TEXT NOT NULL," +
  "sort_n INTEGER NOT NULL" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS dismissals (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT," +
  "key_hash TEXT NOT NULL," +
  "spot_id TEXT NOT NULL," +
  "season TEXT NOT NULL," +
  "reason TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "UNIQUE (key_hash, spot_id, season, reason)" +
  ")"
);
db.exec(
  "CREATE TABLE IF NOT EXISTS campaigns (" +
  "id TEXT PRIMARY KEY," +
  "spot_id TEXT NOT NULL," +
  "from_season TEXT NOT NULL," +
  "to_season TEXT NOT NULL," +
  "aim TEXT NOT NULL," +
  "hypothesis TEXT NOT NULL," +
  "notice_id TEXT NOT NULL DEFAULT ''," +
  "status TEXT NOT NULL," +
  "verdict TEXT NOT NULL DEFAULT ''," +
  "started_at TEXT NOT NULL DEFAULT ''," +
  "ended_at TEXT NOT NULL DEFAULT ''," +
  "created_by TEXT NOT NULL," +
  "created_at TEXT NOT NULL," +
  "updated_at TEXT NOT NULL" +
  ")"
);

(function ensureNoticeAuthor() {
  var cols = db.prepare("PRAGMA table_info(notices)").all();
  var hasAuthor = cols.some(function (col) { return col.name === "created_by"; });
  if (!hasAuthor) db.exec("ALTER TABLE notices ADD COLUMN created_by TEXT NOT NULL DEFAULT ''");
})();

function seedSampleReviews() {
  var samplePath = path.join(root, "data", "sample-reviews.json");
  var sample;
  try {
    sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
  } catch (error) {
    return;
  }
  if (!sample || !sample.meta || sample.meta.synthetic !== true || !Array.isArray(sample.reviews)) return;
  var exists = db.prepare("SELECT id FROM reviews WHERE spot_id = ? AND season = ? AND body = ?");
  var seed = db.prepare(
    "INSERT INTO reviews (spot_id, season, satisfaction, revisit_intent, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  sample.reviews.forEach(function (row) {
    var body = sanitizeComment(row && row.body);
    if (!row || !known(spotIds, row.spotId) || !known(seasonIds, row.season) || !body) return;
    if (!Number.isInteger(row.satisfaction) || row.satisfaction < 1 || row.satisfaction > 5) return;
    if (exists.get(row.spotId, row.season, body)) return;
    seed.run(
      row.spotId,
      row.season,
      row.satisfaction,
      row.revisitIntent === true ? 1 : 0,
      body,
      typeof row.createdAt === "string" ? row.createdAt.slice(0, 24) : new Date().toISOString()
    );
  });
}

function seedCatalogNotices() {
  if (db.prepare("SELECT COUNT(*) AS n FROM notices").get().n > 0) return;
  var now = new Date().toISOString();
  var insert = db.prepare(
    "INSERT INTO notices (id, category, season, spot_id, title, body, status, created_at, updated_at, created_by) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  (catalog.notices || []).forEach(function (item) {
    var title = noticeCheck.sanitizeTitle(item && item.title);
    var body = noticeCheck.sanitizeBody(item && item.body);
    var id = noticeCheck.safeId(item && item.id);
    if (!id || !title || !body) return;
    if (!noticeCheck.inList(item.category, noticeCheck.categories)) return;
    if (!known(seasonIds, item.season) || !known(spotIds, item.spotId)) return;
    insert.run(id, item.category, item.season, item.spotId, title, body, "published", now, now, "");
  });
}

function insertStaff(staffId, role, password) {
  var salt = staffAuth.makeSalt();
  var hash = staffAuth.hashPassword(password, salt);
  db.prepare(
    "INSERT INTO staff (staff_id, role, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(staffId, role, hash.toString("hex"), salt.toString("hex"), new Date().toISOString());
}

function seedStaff() {
  if (db.prepare("SELECT COUNT(*) AS n FROM staff").get().n > 0) return;
  insertStaff("all", "all", "local-all-4192");
  insertStaff("editor", "editor", "local-editor-4192");
  console.log("初期担当 all / local-all-4192");
  console.log("初期担当 editor / local-editor-4192");
  console.log("このPC内の管理画面専用です。氏名は使いません。");
}

seedSampleReviews();
seedCatalogNotices();
seedStaff();

var dummySalt = staffAuth.makeSalt();
staffAuth.hashPassword("timing-check-placeholder", dummySalt);

var selectReviews = db.prepare(
  "SELECT satisfaction, revisit_intent AS revisitIntent, body, created_at AS createdAt " +
  "FROM reviews WHERE spot_id = ? AND season = ? ORDER BY id DESC LIMIT 20"
);
var insertReview = db.prepare(
  "INSERT INTO reviews (spot_id, season, satisfaction, revisit_intent, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);
var countReviews = db.prepare("SELECT COUNT(*) AS n FROM reviews");
var selectAdminReviews = db.prepare(
  "SELECT id, spot_id AS spotId, season, satisfaction, revisit_intent AS revisitIntent, body, created_at AS createdAt " +
  "FROM reviews ORDER BY id DESC LIMIT 200"
);
var deleteReview = db.prepare("DELETE FROM reviews WHERE id = ?");
var selectPublishedNotices = db.prepare(
  "SELECT id, category, season, spot_id AS spotId, title, body, updated_at AS updatedAt " +
  "FROM notices WHERE status = ? ORDER BY updated_at DESC"
);
var selectAdminNotices = db.prepare(
  "SELECT id, category, season, spot_id AS spotId, title, body, status, created_by AS createdBy, " +
  "created_at AS createdAt, updated_at AS updatedAt FROM notices ORDER BY updated_at DESC"
);
var selectNotice = db.prepare(
  "SELECT id, created_by AS createdBy FROM notices WHERE id = ?"
);
var insertNotice = db.prepare(
  "INSERT INTO notices (id, category, season, spot_id, title, body, status, created_at, updated_at, created_by) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
var updateNotice = db.prepare(
  "UPDATE notices SET category = ?, season = ?, spot_id = ?, title = ?, body = ?, status = ?, updated_at = ? WHERE id = ?"
);
var updateNoticeStatus = db.prepare("UPDATE notices SET status = ?, updated_at = ? WHERE id = ?");
var deleteNotice = db.prepare("DELETE FROM notices WHERE id = ?");
var countNotices = db.prepare("SELECT COUNT(*) AS n FROM notices");
var selectStaff = db.prepare("SELECT staff_id AS staffId, role, password_hash AS passwordHash, password_salt AS passwordSalt FROM staff WHERE staff_id = ?");
var selectStaffList = db.prepare("SELECT staff_id AS staffId, role, created_at AS createdAt FROM staff ORDER BY staff_id");
var deleteStaff = db.prepare("DELETE FROM staff WHERE staff_id = ?");
var insertSession = db.prepare("INSERT INTO admin_sessions (token_hash, staff_id, expires_at) VALUES (?, ?, ?)");
var selectSession = db.prepare(
  "SELECT s.staff_id AS staffId, t.role, s.expires_at AS expiresAt " +
  "FROM admin_sessions s JOIN staff t ON t.staff_id = s.staff_id WHERE s.token_hash = ?"
);
var deleteSession = db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?");
var deleteExpiredSessions = db.prepare("DELETE FROM admin_sessions WHERE expires_at < ?");
var deleteStaffSessions = db.prepare("DELETE FROM admin_sessions WHERE staff_id = ?");
var upsertDevice = db.prepare(
  "INSERT INTO devices (key_hash, first_at, last_at) VALUES (?, ?, ?) " +
  "ON CONFLICT(key_hash) DO UPDATE SET last_at = excluded.last_at"
);
var countDevices = db.prepare("SELECT COUNT(*) AS n FROM devices");
var hasDevice = db.prepare("SELECT key_hash FROM devices WHERE key_hash = ?");
var upsertVisit = db.prepare(
  "INSERT INTO visits (key_hash, spot_id, season, reason, satisfaction, revisit_intent, had_other_season, created_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
  "ON CONFLICT(key_hash, spot_id, season) DO UPDATE SET " +
  "reason = excluded.reason, satisfaction = excluded.satisfaction, " +
  "revisit_intent = excluded.revisit_intent, had_other_season = excluded.had_other_season, created_at = excluded.created_at"
);
var countVisits = db.prepare("SELECT COUNT(*) AS n FROM visits");
var insertCross = db.prepare(
  "INSERT OR IGNORE INTO season_cross (key_hash, spot_id, from_season, to_season, to_reason, revisit_intent, created_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?)"
);
var countCross = db.prepare("SELECT COUNT(*) AS n FROM season_cross");
var insertNoticeOpen = db.prepare(
  "INSERT OR IGNORE INTO notice_open (key_hash, notice_id, created_at) VALUES (?, ?, ?)"
);
var countNoticeOpen = db.prepare("SELECT COUNT(*) AS n FROM notice_open");
var insertPlan = db.prepare("INSERT INTO plan_saves (key_hash, season, created_at) VALUES (?, ?, ?)");
var insertPlanItem = db.prepare(
  "INSERT INTO plan_items (plan_id, spot_id, season, reason, sort_n) VALUES (?, ?, ?, ?, ?)"
);
var countPlans = db.prepare("SELECT COUNT(*) AS n FROM plan_saves");
var insertDismiss = db.prepare(
  "INSERT OR IGNORE INTO dismissals (key_hash, spot_id, season, reason, created_at) VALUES (?, ?, ?, ?, ?)"
);
var countDismiss = db.prepare("SELECT COUNT(*) AS n FROM dismissals");
var selectCampaigns = db.prepare(
  "SELECT id, spot_id AS spotId, from_season AS fromSeason, to_season AS toSeason, aim, hypothesis, " +
  "notice_id AS noticeId, status, verdict, started_at AS startedAt, ended_at AS endedAt, " +
  "created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM campaigns ORDER BY updated_at DESC"
);
var selectVisitKey = db.prepare("SELECT id FROM visits WHERE key_hash = ? AND spot_id = ? AND season = ?");
var selectCampaign = db.prepare(
  "SELECT id, notice_id AS noticeId, status, verdict, started_at AS startedAt, ended_at AS endedAt FROM campaigns WHERE id = ?"
);
var insertCampaign = db.prepare(
  "INSERT INTO campaigns (id, spot_id, from_season, to_season, aim, hypothesis, notice_id, status, verdict, " +
  "started_at, ended_at, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
var updateCampaign = db.prepare(
  "UPDATE campaigns SET notice_id = ?, status = ?, verdict = ?, started_at = ?, ended_at = ?, updated_at = ? WHERE id = ?"
);
var countCampaigns = db.prepare("SELECT COUNT(*) AS n FROM campaigns");
var countReach = db.prepare("SELECT COUNT(*) AS n FROM notice_open WHERE notice_id = ? AND created_at >= ?");
var countKgi = db.prepare(
  "SELECT COUNT(*) AS n FROM season_cross WHERE spot_id = ? AND from_season = ? AND to_season = ? AND created_at >= ?"
);
var countKgiBefore = db.prepare(
  "SELECT COUNT(*) AS n FROM season_cross WHERE spot_id = ? AND from_season = ? AND to_season = ? AND created_at < ?"
);
var dashVisits = db.prepare(
  "SELECT spot_id AS spotId, season, COUNT(*) AS n, " +
  "SUM(CASE WHEN satisfaction BETWEEN 1 AND 5 THEN satisfaction ELSE 0 END) AS satSum, " +
  "SUM(CASE WHEN satisfaction BETWEEN 1 AND 5 THEN 1 ELSE 0 END) AS satN, " +
  "SUM(CASE WHEN satisfaction BETWEEN 1 AND 5 AND revisit_intent = 1 THEN 1 ELSE 0 END) AS wantAgain " +
  "FROM visits GROUP BY spot_id, season"
);
var dashDismiss = db.prepare(
  "SELECT spot_id AS spotId, season, COUNT(*) AS n FROM dismissals GROUP BY spot_id, season"
);
var dashPlans = db.prepare(
  "SELECT spot_id AS spotId, season, COUNT(*) AS n FROM plan_items GROUP BY spot_id, season"
);
var dashCross = db.prepare(
  "SELECT spot_id AS spotId, from_season AS fromSeason, to_season AS toSeason, COUNT(*) AS n " +
  "FROM season_cross GROUP BY spot_id, from_season, to_season"
);
var dashNoticeOpen = db.prepare(
  "SELECT notice_id AS noticeId, COUNT(*) AS n FROM notice_open GROUP BY notice_id"
);
var dashSat = db.prepare(
  "SELECT satisfaction AS score, COUNT(*) AS n FROM visits WHERE satisfaction BETWEEN 1 AND 5 GROUP BY satisfaction"
);
var dashVisitDays = db.prepare(
  "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM visits " +
  "GROUP BY substr(created_at, 1, 10) ORDER BY day DESC LIMIT 14"
);
var dashKgiDays = db.prepare(
  "SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM season_cross " +
  "GROUP BY substr(created_at, 1, 10) ORDER BY day DESC LIMIT 14"
);
var dashNoticeList = db.prepare("SELECT id, title, status FROM notices");

function jsonHeaders(extra) {
  var headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (extra) {
    Object.keys(extra).forEach(function (key) { headers[key] = extra[key]; });
  }
  return headers;
}

function send(response, status, payload, extra) {
  var body = JSON.stringify(payload);
  var headers = jsonHeaders(extra);
  headers["Content-Length"] = Buffer.byteLength(body);
  response.writeHead(status, headers);
  response.end(body);
}

function cookieHeader(token, maxAge) {
  return cookieName + "=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + maxAge;
}

function readBody(request, limit, done) {
  var chunks = [];
  var size = 0;
  var stopped = false;
  request.on("data", function (chunk) {
    if (stopped) return;
    size += chunk.length;
    if (size > limit) {
      stopped = true;
      done(new Error("too large"));
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", function () {
    if (!stopped) done(null, Buffer.concat(chunks).toString("utf8"));
  });
  request.on("error", function (error) {
    if (!stopped) done(error);
  });
}

function readJson(request, response, limit, then) {
  readBody(request, limit, function (error, text) {
    if (error) {
      send(response, 413, { error: "too large" });
      return;
    }
    var data;
    try { data = JSON.parse(text); } catch (parseError) {
      send(response, 400, { error: "invalid" });
      return;
    }
    then(data && typeof data === "object" ? data : {});
  });
}

function sameOrigin(request) {
  var expected = "http://127.0.0.1:" + port;
  var origin = request.headers.origin;
  if (origin) return origin === expected;
  var referer = request.headers.referer || "";
  return referer.indexOf(expected + "/") === 0;
}

function currentStaff(request) {
  deleteExpiredSessions.run(Date.now());
  var token = staffAuth.cookieValue(request.headers.cookie, cookieName);
  if (!token) return null;
  var row = selectSession.get(staffAuth.tokenHash(token));
  if (!row || row.expiresAt < Date.now()) return null;
  if (!staffAuth.inList(row.role, staffAuth.roles)) return null;
  return { staffId: row.staffId, role: row.role };
}

function requireStaff(request, response, needOrigin) {
  if (needOrigin && request.method !== "GET" && !sameOrigin(request)) {
    send(response, 403, { error: "origin" });
    return null;
  }
  var staff = currentStaff(request);
  if (!staff) {
    send(response, 401, { error: "auth" });
    return null;
  }
  return staff;
}

function canEditNotice(staff, notice) {
  if (!staff || !notice) return false;
  if (staff.role === "all") return true;
  return staff.role === "editor" && notice.createdBy === staff.staffId && notice.createdBy !== "";
}

function loginLocked(staffId) {
  var row = loginFails[staffId];
  if (!row) return false;
  if (Date.now() - row.at > 10 * 60 * 1000) {
    delete loginFails[staffId];
    return false;
  }
  return row.n >= 5;
}

function markLoginFail(staffId) {
  var row = loginFails[staffId] || { n: 0, at: Date.now() };
  row.n += 1;
  row.at = Date.now();
  loginFails[staffId] = row;
}

function noticeFields(data) {
  var id = noticeCheck.safeId(data && data.id);
  var title = noticeCheck.sanitizeTitle(data && data.title);
  var body = noticeCheck.sanitizeBody(data && data.body);
  var category = data && data.category;
  var season = data && data.season;
  var spotId = data && data.spotId;
  var status = data && data.status;
  if (!noticeCheck.inList(category, noticeCheck.categories)) return null;
  if (!known(seasonIds, season) || !known(spotIds, spotId)) return null;
  if (!noticeCheck.inList(status, noticeCheck.statuses)) return null;
  if (!title || !body) return null;
  return {
    id: id,
    category: category,
    season: season,
    spotId: spotId,
    title: title,
    body: body,
    status: status
  };
}

function handleReviews(request, response, urlObject) {
  if (request.method === "GET") {
    var spotId = urlObject.searchParams.get("spotId") || "";
    var season = urlObject.searchParams.get("season") || "";
    if (!known(spotIds, spotId) || !known(seasonIds, season)) {
      send(response, 400, { error: "invalid" });
      return;
    }
    var rows = selectReviews.all(spotId, season).map(function (row) {
      return {
        satisfaction: row.satisfaction,
        revisitIntent: row.revisitIntent === 1,
        body: sanitizeComment(row.body),
        createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 24) : ""
      };
    });
    send(response, 200, { reviews: rows });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 2048, function (data) {
      var body = sanitizeComment(data.body);
      var satisfaction = data.satisfaction;
      if (!known(spotIds, data.spotId) || !known(seasonIds, data.season) ||
        !Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5 || !body) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (countReviews.get().n >= 500) {
        send(response, 507, { error: "full" });
        return;
      }
      insertReview.run(
        data.spotId,
        data.season,
        satisfaction,
        data.revisitIntent === true ? 1 : 0,
        body,
        new Date().toISOString()
      );
      send(response, 201, { ok: true });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function handlePublicNotices(request, response) {
  if (request.method !== "GET") {
    send(response, 405, { error: "method" });
    return;
  }
  var rows = selectPublishedNotices.all("published").map(function (row) {
    return {
      id: row.id,
      category: row.category,
      season: row.season,
      spotId: row.spotId,
      title: noticeCheck.sanitizeTitle(row.title),
      body: noticeCheck.sanitizeBody(row.body),
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt.slice(0, 24) : ""
    };
  });
  send(response, 200, { notices: rows });
}

function handleSession(request, response) {
  if (request.method === "GET") {
    var staff = currentStaff(request);
    if (!staff) {
      send(response, 401, { error: "auth" });
      return;
    }
    send(response, 200, { staffId: staff.staffId, role: staff.role });
    return;
  }

  if (request.method === "POST") {
    if (!sameOrigin(request)) {
      send(response, 403, { error: "origin" });
      return;
    }
    readJson(request, response, 1024, function (data) {
      if (data.logout === true) {
        var token = staffAuth.cookieValue(request.headers.cookie, cookieName);
        if (token) deleteSession.run(staffAuth.tokenHash(token));
        send(response, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
        return;
      }
      var staffId = staffAuth.safeStaffId(data.staffId);
      var password = staffAuth.safePassword(data.password);
      if (!staffId || !password || loginLocked(staffId)) {
        send(response, 401, { error: "auth" });
        return;
      }
      var row = selectStaff.get(staffId);
      var salt = row ? Buffer.from(row.passwordSalt, "hex") : dummySalt;
      var expected = row ? Buffer.from(row.passwordHash, "hex") : Buffer.alloc(32);
      var actual = staffAuth.hashPassword(password, salt);
      if (!row || !staffAuth.hashesEqual(expected, actual) || !staffAuth.inList(row.role, staffAuth.roles)) {
        markLoginFail(staffId);
        send(response, 401, { error: "auth" });
        return;
      }
      delete loginFails[staffId];
      deleteStaffSessions.run(staffId);
      var sessionToken = staffAuth.makeSessionToken();
      insertSession.run(
        staffAuth.tokenHash(sessionToken),
        staffId,
        Date.now() + sessionHours * 60 * 60 * 1000
      );
      send(response, 200, { staffId: staffId, role: row.role }, {
        "Set-Cookie": cookieHeader(sessionToken, sessionHours * 60 * 60)
      });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function handleAdminNotices(request, response) {
  var staff = requireStaff(request, response, true);
  if (!staff) return;

  if (request.method === "GET") {
    var rows = selectAdminNotices.all().map(function (row) {
      return {
        id: row.id,
        category: row.category,
        season: row.season,
        spotId: row.spotId,
        title: noticeCheck.sanitizeTitle(row.title),
        body: noticeCheck.sanitizeBody(row.body),
        status: noticeCheck.inList(row.status, noticeCheck.statuses) ? row.status : "hidden",
        createdBy: staffAuth.safeStaffId(row.createdBy) || "",
        mine: canEditNotice(staff, { createdBy: row.createdBy }),
        createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 24) : "",
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt.slice(0, 24) : ""
      };
    });
    send(response, 200, { notices: rows, role: staff.role, staffId: staff.staffId });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 4096, function (data) {
      var now = new Date().toISOString();
      if (data.statusOnly === true || data.remove === true) {
        var targetId = noticeCheck.safeId(data.id);
        var target = targetId ? selectNotice.get(targetId) : null;
        if (!target || !canEditNotice(staff, target)) {
          send(response, 403, { error: "forbidden" });
          return;
        }
        if (data.remove === true) {
          deleteNotice.run(targetId);
          send(response, 200, { ok: true });
          return;
        }
        if (!noticeCheck.inList(data.status, noticeCheck.statuses)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        updateNoticeStatus.run(data.status, now, targetId);
        send(response, 200, { ok: true });
        return;
      }
      var fields = noticeFields(data);
      if (!fields) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (fields.id && selectNotice.get(fields.id)) {
        var existing = selectNotice.get(fields.id);
        if (!canEditNotice(staff, existing)) {
          send(response, 403, { error: "forbidden" });
          return;
        }
        updateNotice.run(
          fields.category, fields.season, fields.spotId, fields.title, fields.body, fields.status, now, fields.id
        );
        send(response, 200, { ok: true, id: fields.id });
        return;
      }
      if (countNotices.get().n >= 200) {
        send(response, 507, { error: "full" });
        return;
      }
      var id = noticeCheck.makeId();
      insertNotice.run(
        id, fields.category, fields.season, fields.spotId, fields.title, fields.body, fields.status, now, now, staff.staffId
      );
      send(response, 201, { ok: true, id: id });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function handleAdminReviews(request, response) {
  var staff = requireStaff(request, response, true);
  if (!staff) return;
  if (staff.role !== "all") {
    send(response, 403, { error: "forbidden" });
    return;
  }

  if (request.method === "GET") {
    var rows = selectAdminReviews.all().map(function (row) {
      return {
        id: row.id,
        spotId: row.spotId,
        season: row.season,
        satisfaction: row.satisfaction,
        revisitIntent: row.revisitIntent === 1,
        body: sanitizeComment(row.body),
        createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 24) : ""
      };
    });
    send(response, 200, { reviews: rows });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 1024, function (data) {
      var id = data.id;
      if (!Number.isInteger(id) || id < 1) {
        send(response, 400, { error: "invalid" });
        return;
      }
      deleteReview.run(id);
      send(response, 200, { ok: true });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function handleAdminStaff(request, response) {
  var staff = requireStaff(request, response, true);
  if (!staff) return;
  if (staff.role !== "all") {
    send(response, 403, { error: "forbidden" });
    return;
  }

  if (request.method === "GET") {
    send(response, 200, {
      staff: selectStaffList.all().map(function (row) {
        return { staffId: row.staffId, role: row.role, createdAt: row.createdAt };
      })
    });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 1024, function (data) {
      if (data.remove === true) {
        var removeId = staffAuth.safeStaffId(data.staffId);
        if (!removeId || removeId === staff.staffId || !selectStaff.get(removeId)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        deleteStaffSessions.run(removeId);
        deleteStaff.run(removeId);
        send(response, 200, { ok: true });
        return;
      }
      var staffId = staffAuth.safeStaffId(data.staffId);
      var password = staffAuth.safePassword(data.password);
      var role = data.role;
      if (!staffId || !password || !staffAuth.inList(role, staffAuth.roles) || selectStaff.get(staffId)) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (selectStaffList.all().length >= 20) {
        send(response, 507, { error: "full" });
        return;
      }
      insertStaff(staffId, role, password);
      send(response, 201, { ok: true });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function eventLocked(keyHash) {
  var row = eventFails[keyHash];
  if (!row) return false;
  if (Date.now() - row.at > 10 * 60 * 1000) {
    delete eventFails[keyHash];
    return false;
  }
  return row.n >= 40;
}

function markEvent(keyHash) {
  var row = eventFails[keyHash] || { n: 0, at: Date.now() };
  row.n += 1;
  row.at = Date.now();
  eventFails[keyHash] = row;
}

function touchDevice(keyHash, now) {
  var exists = hasDevice.get(keyHash);
  if (!exists && countDevices.get().n >= 2000) return false;
  upsertDevice.run(keyHash, now, now);
  return true;
}

function handleDeviceEvents(request, response) {
  if (request.method !== "POST") {
    send(response, 405, { error: "method" });
    return;
  }
  if (!sameOrigin(request)) {
    send(response, 403, { error: "origin" });
    return;
  }
  readJson(request, response, 2048, function (data) {
    var deviceKey = campaignCheck.safeDeviceKey(data.deviceKey);
    var type = data.type;
    if (!deviceKey || !campaignCheck.inList(type, campaignCheck.eventTypes)) {
      send(response, 400, { error: "invalid" });
      return;
    }
    var keyHash = staffAuth.tokenHash(deviceKey);
    if (eventLocked(keyHash)) {
      send(response, 429, { error: "limit" });
      return;
    }
    markEvent(keyHash);
    var now = new Date().toISOString();
    if (!touchDevice(keyHash, now)) {
      send(response, 507, { error: "full" });
      return;
    }

    if (type === "visit") {
      if (!known(spotIds, data.spotId) || !known(seasonIds, data.season) ||
        !campaignCheck.inList(data.reason, campaignCheck.reasons)) {
        send(response, 400, { error: "invalid" });
        return;
      }
      var satisfaction = data.satisfaction;
      if (satisfaction === undefined || satisfaction === null) satisfaction = 0;
      if (!Number.isInteger(satisfaction) || satisfaction < 0 || satisfaction > 5) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (countVisits.get().n >= 8000 && !selectVisitKey.get(keyHash, data.spotId, data.season)) {
        send(response, 507, { error: "full" });
        return;
      }
      upsertVisit.run(
        keyHash, data.spotId, data.season, data.reason, satisfaction,
        data.revisitIntent === true ? 1 : 0, data.hadOtherSeason === true ? 1 : 0, now
      );
      var fromSeasons = Array.isArray(data.fromSeasons) ? data.fromSeasons.slice(0, 4) : [];
      fromSeasons.forEach(function (fromSeason) {
        if (!known(seasonIds, fromSeason) || fromSeason === data.season) return;
        if (countCross.get().n >= 4000) return;
        insertCross.run(
          keyHash, data.spotId, fromSeason, data.season, data.reason,
          data.revisitIntent === true ? 1 : 0, now
        );
      });
      send(response, 200, { ok: true });
      return;
    }

    if (type === "notice") {
      var noticeId = noticeCheck.safeId(data.noticeId);
      if (!noticeId || !selectNotice.get(noticeId)) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (countNoticeOpen.get().n >= 4000) {
        send(response, 507, { error: "full" });
        return;
      }
      insertNoticeOpen.run(keyHash, noticeId, now);
      send(response, 200, { ok: true });
      return;
    }

    if (type === "plan") {
      if (!known(seasonIds, data.season) || !Array.isArray(data.items) || !data.items.length) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (countPlans.get().n >= 2000) {
        send(response, 507, { error: "full" });
        return;
      }
      var rows = data.items.slice(0, 8).filter(function (item) {
        return item && known(spotIds, item.spotId) && known(seasonIds, item.season) &&
          campaignCheck.inList(item.reason, campaignCheck.reasons);
      });
      if (!rows.length) {
        send(response, 400, { error: "invalid" });
        return;
      }
      var planResult = insertPlan.run(keyHash, data.season, now);
      rows.forEach(function (item, index) {
        insertPlanItem.run(planResult.lastInsertRowid, item.spotId, item.season, item.reason, index);
      });
      send(response, 201, { ok: true });
      return;
    }

    if (type === "dismiss") {
      if (!known(spotIds, data.spotId) || !known(seasonIds, data.season) ||
        !campaignCheck.inList(data.reason, campaignCheck.reasons)) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (countDismiss.get().n >= 4000) {
        send(response, 507, { error: "full" });
        return;
      }
      insertDismiss.run(keyHash, data.spotId, data.season, data.reason, now);
      send(response, 200, { ok: true });
      return;
    }

    send(response, 400, { error: "invalid" });
  });
}

function campaignMetrics(row) {
  var start = row.startedAt || "0000-00-00";
  var noticeId = noticeCheck.safeId(row.noticeId);
  return {
    id: row.id,
    spotId: row.spotId,
    fromSeason: row.fromSeason,
    toSeason: row.toSeason,
    aim: row.aim,
    hypothesis: campaignCheck.sanitizeText(row.hypothesis, 200),
    noticeId: noticeId,
    status: row.status,
    verdict: row.verdict || "",
    startedAt: row.startedAt || "",
    endedAt: row.endedAt || "",
    createdBy: staffAuth.safeStaffId(row.createdBy) || "",
    reach: noticeId ? countReach.get(noticeId, start).n : 0,
    kgi: countKgi.get(row.spotId, row.fromSeason, row.toSeason, start).n,
    kgiBefore: row.startedAt ? countKgiBefore.get(row.spotId, row.fromSeason, row.toSeason, start).n : 0
  };
}

function handleDashboard(request, response) {
  var staff = requireStaff(request, response, true);
  if (!staff) return;
  if (staff.role !== "all") {
    send(response, 403, { error: "forbidden" });
    return;
  }
  if (request.method !== "GET") {
    send(response, 405, { error: "method" });
    return;
  }
  send(response, 200, boardStats.assemble({
    spots: catalog.spots.map(function (spot) { return { id: spot.id }; }),
    seasons: catalog.seasons.map(function (season) { return { id: season.id }; }),
    totals: {
      devices: countDevices.get().n,
      visits: countVisits.get().n,
      kgi: countCross.get().n,
      noticeOpens: countNoticeOpen.get().n,
      plans: countPlans.get().n,
      dismissals: countDismiss.get().n
    },
    kgiNote: "同一ブラウザで同じ場所の別季節が残った件数。人数ではない。",
    visits: dashVisits.all(),
    crosses: dashCross.all(),
    dismissals: dashDismiss.all(),
    plans: dashPlans.all(),
    noticeOpens: dashNoticeOpen.all(),
    notices: dashNoticeList.all(),
    satisfaction: dashSat.all(),
    visitDays: dashVisitDays.all(),
    kgiDays: dashKgiDays.all(),
    campaigns: selectCampaigns.all().map(campaignMetrics)
  }));
}

function handleCampaigns(request, response) {
  var staff = requireStaff(request, response, true);
  if (!staff) return;
  if (staff.role !== "all") {
    send(response, 403, { error: "forbidden" });
    return;
  }

  if (request.method === "GET") {
    send(response, 200, {
      campaigns: selectCampaigns.all().map(campaignMetrics),
      kgiNote: "同一ブラウザで同じ場所の別季節が残った件数。人数ではない。"
    });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 2048, function (data) {
      var now = new Date().toISOString();
      if (data.id) {
        var id = campaignCheck.safeCampaignId(data.id);
        var existing = id ? selectCampaign.get(id) : null;
        if (!existing) {
          send(response, 400, { error: "invalid" });
          return;
        }
        var nextStatus = data.status || existing.status;
        if (!campaignCheck.inList(nextStatus, campaignCheck.campaignStatuses)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        var verdict = data.verdict === undefined ? "" : data.verdict;
        if (!campaignCheck.inList(verdict, campaignCheck.verdicts)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        var noticeId = noticeCheck.safeId(data.noticeId);
        if (data.noticeId && !selectNotice.get(noticeId)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        var startedAt = existing.startedAt || "";
        var endedAt = existing.endedAt || "";
        if (nextStatus === "running" && !startedAt) startedAt = now;
        if (nextStatus === "stopped") endedAt = now;
        updateCampaign.run(
          noticeId || existing.noticeId || "",
          nextStatus,
          nextStatus === "stopped" ? verdict : existing.verdict || "",
          startedAt,
          endedAt,
          now,
          id
        );
        send(response, 200, { ok: true, id: id });
        return;
      }

      if (countCampaigns.get().n >= 50) {
        send(response, 507, { error: "full" });
        return;
      }
      var hypothesis = campaignCheck.sanitizeText(data.hypothesis, 200);
      var noticeId = noticeCheck.safeId(data.noticeId);
      if (!known(spotIds, data.spotId) || !known(seasonIds, data.fromSeason) ||
        !known(seasonIds, data.toSeason) || data.fromSeason === data.toSeason ||
        !campaignCheck.inList(data.aim, campaignCheck.aims) || !hypothesis) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (noticeId && !selectNotice.get(noticeId)) {
        send(response, 400, { error: "invalid" });
        return;
      }
      var newId = campaignCheck.makeCampaignId();
      insertCampaign.run(
        newId, data.spotId, data.fromSeason, data.toSeason, data.aim, hypothesis, noticeId || "",
        "draft", "", "", "", staff.staffId, now, now
      );
      send(response, 201, { ok: true, id: newId });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

http.createServer(function (request, response) {
  var rawUrl = request.url || "/";
  var pathname;
  try {
    pathname = decodeURIComponent(rawUrl.split("?")[0]);
  } catch (error) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }
  if (pathname === "/") pathname = "/index.html";

  if (pathname === "/api/reviews") {
    handleReviews(request, response, new URL("http://127.0.0.1" + rawUrl));
    return;
  }
  if (pathname === "/api/notices") {
    handlePublicNotices(request, response);
    return;
  }
  if (pathname === "/api/admin/session") {
    handleSession(request, response);
    return;
  }
  if (pathname === "/api/admin/notices") {
    handleAdminNotices(request, response);
    return;
  }
  if (pathname === "/api/admin/reviews") {
    handleAdminReviews(request, response);
    return;
  }
  if (pathname === "/api/admin/staff") {
    handleAdminStaff(request, response);
    return;
  }
  if (pathname === "/api/device/events") {
    handleDeviceEvents(request, response);
    return;
  }
  if (pathname === "/api/admin/campaigns") {
    handleCampaigns(request, response);
    return;
  }
  if (pathname === "/api/admin/dashboard") {
    handleDashboard(request, response);
    return;
  }

  var file = path.resolve(root, "." + pathname);
  var relative = path.relative(root, file);
  var ext = path.extname(file).toLowerCase();
  if (relative.indexOf("..") === 0 || path.isAbsolute(relative) || blocked[ext]) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(file, function (error, data) {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(data);
  });
}).listen(port, "127.0.0.1", function () {
  console.log("MataTabi v012: http://127.0.0.1:" + port);
  console.log("管理画面: http://127.0.0.1:" + port + "/admin.html");
});
