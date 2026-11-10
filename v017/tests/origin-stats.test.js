"use strict";

var assert = require("assert");
var path = require("path");
var stats = require("../js/origin-stats.js");

var parsed = stats.parseCsv("a,b\r\n\"x,y\",z\n");
assert.deepStrictEqual(parsed, [["a", "b"], ["x,y", "z"]]);

var tiny = stats.aggregate(
  "ユーザーID,ユーザー名,性別,年代,居住地域\n" +
  "1,test_traveler_0001,女性,40代,星凪地方\n" +
  "1,test_traveler_0001,男性,20代,霧灯地方\n" +
  "2,test_traveler_0002,男性,20代,霧灯地方\n" +
  "3,test_traveler_0003,女性,40代,星凪地方\n",
  "ユーザID,ユーザ名,スポット名\n" +
  "2,test_traveler_0002,月花の風車丘（月灯集落）\n" +
  "2,test_traveler_0002,月花の風車丘（月灯集落）\n" +
  "9,test_traveler_0009,潮見台\n"
);
assert.strictEqual(tiny.people.reduce(function (sum, row) { return sum + row.n; }, 0), 3);
assert.strictEqual(tiny.spots.length, 1);
assert.strictEqual(tiny.spots[0].spot, "月花の風車丘（月灯集落）");
assert.strictEqual(tiny.spots[0].n, 1);
assert.strictEqual(tiny.spots[0].region, "霧灯地方");
assert.ok(JSON.stringify(tiny).indexOf("test_traveler") < 0);
assert.ok(JSON.stringify(tiny).indexOf("\"1\"") < 0);

var rally = stats.load(path.join(__dirname, "..", "data", "rally"));
function sum(rows, pred) {
  return rows.reduce(function (total, row) {
    return pred(row) ? total + row.n : total;
  }, 0);
}
assert.strictEqual(sum(rally.people, function () { return true; }), 500);
assert.deepStrictEqual(rally.ages, ["10代", "20代", "30代", "40代", "50代", "60代以上"]);
assert.deepStrictEqual(rally.genders, ["女性", "男性", "その他", "回答しない"]);
assert.strictEqual(sum(rally.people, function (row) { return row.age === "60代以上"; }), 61);
assert.strictEqual(sum(rally.people, function (row) { return row.age === "20代"; }), 127);
assert.strictEqual(sum(rally.people, function (row) { return row.gender === "女性"; }), 284);
assert.strictEqual(sum(rally.people, function (row) { return row.gender === "男性"; }), 211);
assert.strictEqual(sum(rally.people, function (row) { return row.region === "霧灯地方"; }), 107);
assert.strictEqual(sum(rally.people, function (row) { return row.region === "星凪地方"; }), 81);
assert.ok(rally.spots.length > 0);
assert.ok(rally.spots.every(function (row) { return row.n > 0 && row.spot && row.region; }));
var dumped = JSON.stringify(rally);
assert.ok(dumped.indexOf("test_traveler") < 0);
assert.ok(dumped.indexOf("@") < 0);
assert.ok(dumped.indexOf("8800") < 0);

console.log("origin-stats tests passed");
