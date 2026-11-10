"use strict";

var assert = require("assert");
var stats = require("../js/board-stats.js");

assert.strictEqual(stats.barWidth(0, 10), 0);
assert.strictEqual(stats.barWidth(5, 10), 50);
assert.strictEqual(stats.barWidth(10, 10), 100);
assert.strictEqual(stats.barWidth(20, 10), 100);
assert.strictEqual(stats.barWidth(3, 0), 0);
assert.strictEqual(stats.barStep(5, 10), 5);
assert.strictEqual(stats.barStep(1, 10), 1);
assert.strictEqual(stats.heatStep(0, 10), 0);
assert.strictEqual(stats.heatStep(10, 10), 5);
assert.strictEqual(stats.heatStep(1, 10), 1);

var empty = stats.assemble({});
assert.strictEqual(empty.totals.devices, 0);
assert.strictEqual(empty.spots.length, 0);
assert.strictEqual(empty.satisfaction.length, 5);
assert.ok(!Object.prototype.hasOwnProperty.call(empty, "keyHash"));

var built = stats.assemble({
  spots: [{ id: "shio" }, { id: "todai" }],
  seasons: [{ id: "spring" }, { id: "autumn" }],
  totals: { devices: 2, visits: 3, kgi: 1, noticeOpens: 4, plans: 1, dismissals: 1 },
  kgiNote: "同一ブラウザの件数。",
  visits: [
    { spotId: "shio", season: "autumn", n: 2, satSum: 8, satN: 2, wantAgain: 1 },
    { spotId: "todai", season: "spring", n: 1, satSum: 5, satN: 1, wantAgain: 1 }
  ],
  crosses: [{ spotId: "shio", fromSeason: "autumn", toSeason: "winter", n: 1 }],
  dismissals: [{ spotId: "todai", season: "spring", n: 1 }],
  plans: [{ spotId: "shio", season: "winter", n: 1 }],
  noticeOpens: [{ noticeId: "n1", n: 4 }],
  notices: [
    { id: "n1", title: "桜餅", status: "published" },
    { id: "n2", title: "塩レモン", status: "draft" }
  ],
  satisfaction: [{ score: 4, n: 2 }, { score: 5, n: 1 }],
  visitDays: [{ day: "2026-11-09", n: 2 }, { day: "bad", n: 9 }],
  kgiDays: [{ day: "2026-11-10", n: 1 }],
  campaigns: [{
    id: "c1",
    spotId: "shio",
    fromSeason: "autumn",
    toSeason: "winter",
    status: "running",
    verdict: "",
    reach: 4,
    kgi: 1,
    kgiBefore: 0,
    keyHash: "must-not-copy"
  }]
});

assert.strictEqual(built.totals.devices, 2);
assert.strictEqual(built.totals.kgi, 1);
assert.strictEqual(built.spots[0].spotId, "shio");
assert.strictEqual(built.spots[0].visitTotal, 2);
assert.strictEqual(built.spots[0].kgi, 1);
assert.strictEqual(built.spots[0].seasons[1].visits, 2);
assert.strictEqual(built.spots[0].seasons[1].satAvg, 4);
assert.strictEqual(built.spots[1].seasons[0].dismissals, 1);
assert.strictEqual(built.pairs[0].n, 1);
assert.strictEqual(built.notices[0].opens, 4);
assert.strictEqual(built.notices[1].opens, 0);
assert.strictEqual(built.satisfaction[3].n, 2);
assert.strictEqual(built.days.length, 2);
assert.strictEqual(built.days[0].day, "2026-11-09");
assert.strictEqual(built.days[1].kgi, 1);
assert.strictEqual(built.campaigns[0].kgi, 1);
assert.ok(!Object.prototype.hasOwnProperty.call(built.campaigns[0], "keyHash"));

console.log("board-stats tests passed");
