"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var ui = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");
var i18n = fs.readFileSync(path.join(root, "js", "i18n.js"), "utf8");
var source = ui + "\n" + i18n;

[
  "この端末に残した場所と季節です。同じ季節は、次の候補から外れます。",
  "季節、食、現地の人、移動の負担から提案します。",
  "名店の季節メニュー、地元の話題、参加できる催しを、このPCから発信した文として出しています。",
  "3枚から1枚を残す"
].forEach(function (text) {
  assert.strictEqual(source.indexOf(text), -1, "obsolete copy remains: " + text);
});

assert.strictEqual(ui.indexOf("renderCards"), -1);
assert.strictEqual(ui.indexOf("go(\"cards\")"), -1);
assert.strictEqual(ui.indexOf("cards: "), -1);

console.log("removed copy tests passed");
