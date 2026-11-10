/* 静的ファイル配信と、このPC内 SQLite の口コミAPI。外部ホストへは接続しない。 */
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var DatabaseSync = require("node:sqlite").DatabaseSync;

var root = __dirname;
var port = 4184;
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

seedSampleReviews();

var selectReviews = db.prepare(
  "SELECT satisfaction, revisit_intent AS revisitIntent, body, created_at AS createdAt " +
  "FROM reviews WHERE spot_id = ? AND season = ? ORDER BY id DESC LIMIT 20"
);
var insertReview = db.prepare(
  "INSERT INTO reviews (spot_id, season, satisfaction, revisit_intent, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
);
var countReviews = db.prepare("SELECT COUNT(*) AS n FROM reviews");

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
    readBody(request, 2048, function (error, text) {
      if (error) {
        send(response, 413, { error: "too large" });
        return;
      }
      var data;
      try { data = JSON.parse(text); } catch (parseError) {
        send(response, 400, { error: "invalid" });
        return;
      }
      var body = sanitizeComment(data && data.body);
      var satisfaction = data && data.satisfaction;
      if (!data || !known(spotIds, data.spotId) || !known(seasonIds, data.season) ||
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
  console.log("MataTabi v004: http://127.0.0.1:" + port);
});
