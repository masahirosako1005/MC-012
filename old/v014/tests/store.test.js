"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var values = {};
var localStorage = {
  getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
  setItem: function (key, value) { values[key] = String(value); }
};
var context = { console: console, localStorage: localStorage, Date: Date };
context.globalThis = context;
vm.createContext(context);

["js/catalog.js", "js/store.js"].forEach(function (file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

var catalog = context.TsudukiCatalog;
var store = context.TsudukiStore;
var sanitized = store.sanitize(catalog, {
  preferences: {
    party: "unknown",
    duration: "short",
    mobility: "low",
    interests: ["nature", "script", "nature"],
    crowd: "avoid"
  },
  history: [
    { spotId: "unknown", season: "spring" },
    { spotId: "shio", season: "spring", satisfaction: 99, revisitIntent: true, comment: "<script>x</script>\n\nhello" }
  ],
  actions: [
    { type: "view", spotId: "unknown", season: "spring", reason: "season" },
    { type: "view", spotId: "shio", season: "spring", reason: "season", at: "2026-11-09" }
  ],
  dismissedRevisits: [
    { spotId: "shio", season: "winter", reason: "season" },
    { spotId: "shio", season: "winter", reason: "season" },
    { spotId: "unknown", season: "winter", reason: "season" }
  ],
  savedPlan: {
    season: "spring",
    items: [
      { spotId: "shio", season: "spring", reason: "season" },
      { spotId: "yoichi", season: "spring", reason: "food" },
      { spotId: "mizu", season: "spring", reason: "season" },
      { spotId: "kaza", season: "spring", reason: "food" },
      { spotId: "unknown", season: "spring", reason: "season" },
      { spotId: "shio", season: "spring", reason: "season" }
    ]
  }
});

assert.strictEqual(sanitized.preferences.party, "");
assert.deepStrictEqual(Array.from(sanitized.preferences.interests), ["nature"]);
assert.strictEqual(sanitized.history.length, 1);
assert.strictEqual(sanitized.history[0].satisfaction, 0);
assert.strictEqual(sanitized.history[0].comment, "<script>x</script> hello");
assert.strictEqual(store.sanitizeComment("a".repeat(250)).length, 200);
assert.strictEqual(sanitized.actions.length, 1);
assert.strictEqual(sanitized.dismissedRevisits.length, 1);
assert.strictEqual(sanitized.dismissedRevisits[0].spotId, "shio");
assert.strictEqual(sanitized.savedPlan.season, "spring");
assert.deepStrictEqual(Array.from(sanitized.savedPlan.items, function (row) { return row.spotId; }), ["shio", "yoichi", "mizu", "kaza"]);

var invalidPlan = store.sanitize(catalog, {
  savedPlan: {
    season: "summer",
    items: [{ spotId: "shio", season: "spring", reason: "season" }]
  }
});
assert.strictEqual(invalidPlan.savedPlan, null);

var onePlacePlan = store.sanitize(catalog, {
  savedPlan: {
    season: "winter",
    items: [{ spotId: "shio", season: "winter", reason: "season" }]
  }
});
assert.strictEqual(onePlacePlan.savedPlan.items.length, 1);

var languageState = store.sanitize(catalog, { language: "en" });
assert.strictEqual(languageState.language, "en");
assert.strictEqual(store.sanitize(catalog, { language: "xx" }).language, "ja");

for (var index = 0; index < 240; index += 1) {
  store.addAction(sanitized, {
    type: "view",
    spotId: "shio",
    season: "spring",
    reason: "season"
  });
}
assert.strictEqual(sanitized.actions.length, 200);

values["matatabi-v014"] = "{broken";
assert.strictEqual(store.load(catalog).history.length, 3);

delete values["matatabi-v014"];
values["matatabi-v013"] = JSON.stringify({ language: "en", history: [] });
assert.strictEqual(store.load(catalog).language, "en");
assert.strictEqual(store.load(catalog).history.length, 0);

assert.strictEqual(store.noticeStamp([
  { id: "b", updatedAt: "2026-11-10T01:00:00.000Z" },
  { id: "a", updatedAt: "2026-11-09T01:00:00.000Z" }
]), "a:2026-11-09T01:00:00.000Z|b:2026-11-10T01:00:00.000Z");
assert.strictEqual(store.noticeStamp([{ id: "a" }]), "a:");
assert.notStrictEqual(
  store.noticeStamp([{ id: "a", updatedAt: "2026-11-10T01:00:00.000Z" }]),
  store.noticeStamp([{ id: "a", updatedAt: "2026-11-10T02:00:00.000Z" }])
);
var stamps = store.sanitize(catalog, {
  noticeBaseline: true,
  seenNoticeStamp: "a:2026-11-10T01:00:00.000Z",
  hiddenNoticeStamp: "<script>|b"
});
assert.strictEqual(stamps.noticeBaseline, true);
assert.strictEqual(stamps.seenNoticeStamp, "a:2026-11-10T01:00:00.000Z");
assert.strictEqual(stamps.hiddenNoticeStamp, "script|b");

console.log("store tests passed");
