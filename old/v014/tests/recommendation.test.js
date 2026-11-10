"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var context = { console: console };
context.globalThis = context;
vm.createContext(context);

["js/catalog.js", "js/recommendation.js"].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

var catalog = context.TsudukiCatalog;
var recommendation = context.MataTabiRecommendation;
var samples = JSON.parse(fs.readFileSync(path.join(root, "data/sample-travelers.json"), "utf8"));
var preferences = {
  party: "solo",
  duration: "short",
  mobility: "low",
  interests: ["scenery", "nature"],
  crowd: "avoid"
};

assert.strictEqual(recommendation.styleSimilarity(preferences, preferences), 1);
assert.strictEqual(recommendation.sanitizeSampleData(catalog, samples).length, 12);

var invalid = {
  meta: { synthetic: true },
  travelers: [{
    travelerId: "bad",
    style: preferences,
    visits: [{ spotId: "unknown", season: "spring", reason: "season", satisfaction: 5 }]
  }]
};
assert.strictEqual(recommendation.sanitizeSampleData(catalog, invalid).length, 0);

function state(revisitIntent) {
  return {
    mode: "after",
    season: "autumn",
    preferences: preferences,
    history: [{
      spotId: "shio",
      season: "autumn",
      reason: "people",
      satisfaction: 5,
      revisitIntent: revisitIntent
    }],
    actions: []
  };
}

var rows = recommendation.recommend(catalog, state(false), samples);
assert.ok(rows.length > 0);
assert.ok(rows.every(function (row) { return row.spotId === "shio"; }));
assert.ok(!rows.some(function (row) { return row.season === "autumn"; }));
assert.ok(rows[0].reasons.length > 0);

var allowed = recommendation.recommend(catalog, state(true), samples);
assert.ok(allowed.some(function (row) { return row.season === "autumn"; }));

var fallback = recommendation.recommend(catalog, state(false), null);
assert.ok(fallback.length > 0);
assert.ok(fallback.every(function (row) { return row.components.similarTravelers === 0; }));

var coldStart = recommendation.recommend(catalog, {
  mode: "after",
  season: "spring",
  preferences: preferences,
  history: [],
  actions: []
}, samples);
assert.ok(new Set(coldStart.map(function (row) { return row.spotId; })).size === catalog.spots.length);

console.log("recommendation tests passed:", rows.length, fallback.length, coldStart.length);
