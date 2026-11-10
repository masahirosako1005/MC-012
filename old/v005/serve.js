/* 静的ファイル配信と、このPC内 SQLite の口コミ・お知らせAPI。外部ホストへは接続しない。 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var DatabaseSync = require("node:sqlite").DatabaseSync;
var noticeCheck = require("./js/notice-validate.js");

var root = __dirname;
var port = 4185;
var types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg"
};
var blocked = { ".sqlite": true, ".db": true };

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
    "INSERT INTO notices (id, category, season, spot_id, title, body, status, created_at, updated_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  (catalog.notices || []).forEach(function (item) {
    var title = noticeCheck.sanitizeTitle(item && item.title);
    var body = noticeCheck.sanitizeBody(item && item.body);
    var id = noticeCheck.safeId(item && item.id);
    if (!id || !title || !body) return;
    if (!noticeCheck.inList(item.category, noticeCheck.categories)) return;
    if (!known(seasonIds, item.season) || !known(spotIds, item.spotId)) return;
    insert.run(id, item.category, item.season, item.spotId, title, body, "published", now, now);
  });
}

seedSampleReviews();
seedCatalogNotices();

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
  "SELECT id, category, season, spot_id AS spotId, title, body " +
  "FROM notices WHERE status = ? ORDER BY updated_at DESC"
);
var selectAdminNotices = db.prepare(
  "SELECT id, category, season, spot_id AS spotId, title, body, status, created_at AS createdAt, updated_at AS updatedAt " +
  "FROM notices ORDER BY updated_at DESC"
);
var selectNotice = db.prepare("SELECT id FROM notices WHERE id = ?");
var insertNotice = db.prepare(
  "INSERT INTO notices (id, category, season, spot_id, title, body, status, created_at, updated_at) " +
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
var updateNotice = db.prepare(
  "UPDATE notices SET category = ?, season = ?, spot_id = ?, title = ?, body = ?, status = ?, updated_at = ? WHERE id = ?"
);
var updateNoticeStatus = db.prepare("UPDATE notices SET status = ?, updated_at = ? WHERE id = ?");
var deleteNotice = db.prepare("DELETE FROM notices WHERE id = ?");
var countNotices = db.prepare("SELECT COUNT(*) AS n FROM notices");

function send(response, status, payload) {
  var body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  response.end(body);
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

function noticeFields(data, requireId) {
  var id = noticeCheck.safeId(data && data.id);
  var title = noticeCheck.sanitizeTitle(data && data.title);
  var body = noticeCheck.sanitizeBody(data && data.body);
  var category = data && data.category;
  var season = data && data.season;
  var spotId = data && data.spotId;
  var status = data && data.status;
  if (requireId && !id) return null;
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
      body: noticeCheck.sanitizeBody(row.body)
    };
  });
  send(response, 200, { notices: rows });
}

function handleAdminNotices(request, response) {
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
        createdAt: typeof row.createdAt === "string" ? row.createdAt.slice(0, 24) : "",
        updatedAt: typeof row.updatedAt === "string" ? row.updatedAt.slice(0, 24) : ""
      };
    });
    send(response, 200, { notices: rows });
    return;
  }

  if (request.method === "POST") {
    readJson(request, response, 4096, function (data) {
      var now = new Date().toISOString();
      if (data.statusOnly === true) {
        var statusId = noticeCheck.safeId(data.id);
        if (!statusId || !noticeCheck.inList(data.status, noticeCheck.statuses) || !selectNotice.get(statusId)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        updateNoticeStatus.run(data.status, now, statusId);
        send(response, 200, { ok: true });
        return;
      }
      if (data.remove === true) {
        var removeId = noticeCheck.safeId(data.id);
        if (!removeId || !selectNotice.get(removeId)) {
          send(response, 400, { error: "invalid" });
          return;
        }
        deleteNotice.run(removeId);
        send(response, 200, { ok: true });
        return;
      }
      var fields = noticeFields(data, false);
      if (!fields) {
        send(response, 400, { error: "invalid" });
        return;
      }
      if (fields.id && selectNotice.get(fields.id)) {
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
      var id = fields.id || noticeCheck.makeId();
      if (selectNotice.get(id)) id = noticeCheck.makeId();
      insertNotice.run(
        id, fields.category, fields.season, fields.spotId, fields.title, fields.body, fields.status, now, now
      );
      send(response, 201, { ok: true, id: id });
    });
    return;
  }

  send(response, 405, { error: "method" });
}

function handleAdminReviews(request, response) {
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
  if (pathname === "/api/admin/notices") {
    handleAdminNotices(request, response);
    return;
  }
  if (pathname === "/api/admin/reviews") {
    handleAdminReviews(request, response);
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
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
}).listen(port, "127.0.0.1", function () {
  console.log("MataTabi v005: http://127.0.0.1:" + port);
  console.log("管理画面: http://127.0.0.1:" + port + "/admin.html");
});
