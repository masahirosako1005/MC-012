"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var context = { console: console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, "js", "catalog.js"), "utf8"),
  context,
  { filename: "catalog.js" }
);

var catalog = context.TsudukiCatalog;
var found = [];
catalog.spots.forEach(function (spot) {
  catalog.seasons.forEach(function (season) {
    var file = path.join(
      root,
      "img",
      "spots",
      "seasonal",
      spot.id + "-" + season.id + ".jpg"
    );
    assert.ok(fs.existsSync(file), "missing seasonal image: " + file);
    assert.ok(fs.statSync(file).size > 10000, "seasonal image is too small: " + file);
    found.push(file);
  });
});

assert.strictEqual(found.length, 28);
console.log("seasonal image tests passed: " + found.length);
