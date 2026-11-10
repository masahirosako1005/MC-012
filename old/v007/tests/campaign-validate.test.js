"use strict";

var assert = require("assert");
var check = require("../js/campaign-validate.js");

var key = "ABCDEFGHIJKLMNOPQRSTUV";
assert.strictEqual(key.length, 22);
assert.strictEqual(check.safeDeviceKey(key), key);
assert.strictEqual(check.safeDeviceKey("short"), "");
assert.strictEqual(check.safeDeviceKey("../secret-key-value-here"), "");
assert.ok(check.inList("next_season", check.aims));
assert.ok(!check.inList("coupon", check.aims));
assert.strictEqual(check.sanitizeText("  秋の続き  \n", 200), "秋の続き");
assert.ok(/^c-/.test(check.makeCampaignId()));
assert.strictEqual(check.safeCampaignId("c-abc-123"), "c-abc-123");
assert.strictEqual(check.safeCampaignId("n-abc"), "");
assert.ok(check.inList("running", check.campaignStatuses));
assert.ok(check.inList("up", check.verdicts));
assert.ok(check.inList("", check.verdicts));

console.log("campaign-validate tests passed");
