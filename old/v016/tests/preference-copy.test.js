"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var i18n = fs.readFileSync(path.join(__dirname, "..", "js", "i18n.js"), "utf8");

assert.notStrictEqual(i18n.indexOf("\"登録すると再訪プランが表示されます\""), -1);
assert.strictEqual(i18n.indexOf("\"未登録\""), -1);

console.log("preference copy tests passed");
