"use strict";

/* 再訪は同じ場所への再訪ではなく、市への再来訪。場所を問わない季節またぎとして数える。 */
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var check = require("../js/campaign-validate.js");
var stats = require("../js/board-stats.js");

assert.ok(check.inList("new_spot", check.aims));

/* 端末側は、場所が違っても別の季節に残した記録を fromSeasons として送る。 */
var sent = [];
var context = {
  console: console,
  MataTabiDeviceKey: { ensure: function () { return "ABCDEFGHIJKLMNOPQRSTUV"; } },
  fetch: function (url, options) {
    sent.push(JSON.parse(options.body));
    return Promise.resolve({});
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "js/device-events.js"), "utf8"), context);

context.MataTabiDeviceEvents.visit(
  { spotId: "mizu", season: "winter", reason: "season", satisfaction: 0, revisitIntent: false },
  [
    { spotId: "shio", season: "autumn" },
    { spotId: "todai", season: "summer" },
    { spotId: "yoichi", season: "autumn" },
    { spotId: "kaza", season: "winter" }
  ]
);
assert.strictEqual(sent.length, 1);
assert.deepStrictEqual(sent[0].fromSeasons.slice().sort(), ["autumn", "summer"]);
assert.strictEqual(sent[0].hadOtherSeason, true);

sent.length = 0;
context.MataTabiDeviceEvents.visit(
  { spotId: "mizu", season: "winter", reason: "season" },
  [{ spotId: "shio", season: "winter" }]
);
assert.deepStrictEqual(sent[0].fromSeasons, []);
assert.strictEqual(sent[0].hadOtherSeason, false);

/* 集計は、場所が違っても同じ季節の組を1本にまとめる。 */
var built = stats.assemble({
  crosses: [
    { spotId: "shio", fromSeason: "autumn", toSeason: "winter", n: 2 },
    { spotId: "mizu", fromSeason: "autumn", toSeason: "winter", n: 1 },
    { spotId: "mizu", fromSeason: "summer", toSeason: "winter", n: 1 }
  ]
});
assert.strictEqual(built.pairs.length, 2);
assert.strictEqual(built.pairs[0].fromSeason, "autumn");
assert.strictEqual(built.pairs[0].n, 3);
assert.ok(!Object.prototype.hasOwnProperty.call(built.pairs[0], "spotId"));

console.log("city revisit tests passed");
