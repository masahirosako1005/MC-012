"use strict";

var assert = require("assert");
var check = require("../js/notice-validate.js");

assert.strictEqual(check.sanitizeTitle("  春の夜市  "), "春の夜市");
assert.strictEqual(check.sanitizeTitle("<script>x</script>").indexOf("<script>") >= 0, true);
assert.strictEqual(check.sanitizeTitle("a".repeat(90)).length, 80);
assert.strictEqual(check.sanitizeBody("a".repeat(600)).length, 500);
assert.strictEqual(check.sanitizeTitle("line\nbreak"), "line break");
assert.strictEqual(check.safeId("menu-spring-yoichi"), "menu-spring-yoichi");
assert.strictEqual(check.safeId("../secret"), "");
assert.strictEqual(check.safeId("n-abc"), "n-abc");
assert.ok(/^n-/.test(check.makeId()));
assert.ok(check.inList("published", check.statuses));
assert.ok(!check.inList("live", check.statuses));

console.log("notice-validate tests passed");
