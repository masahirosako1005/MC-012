"use strict";

var assert = require("assert");
var auth = require("../js/staff-auth.js");

assert.strictEqual(auth.safeStaffId("all"), "all");
assert.strictEqual(auth.safeStaffId("editor-2"), "editor-2");
assert.strictEqual(auth.safeStaffId("ALL"), "");
assert.strictEqual(auth.safeStaffId("../etc"), "");
assert.strictEqual(auth.safeStaffId("a"), "");
assert.strictEqual(auth.safeStaffId("this-id-is-way-too-long"), "");

assert.strictEqual(auth.safePassword("local-all-4186"), "local-all-4186");
assert.strictEqual(auth.safePassword("short"), "");
assert.strictEqual(auth.safePassword("line\nbreak-password"), "");
assert.strictEqual(auth.safePassword("x".repeat(65)), "");

var salt = auth.makeSalt();
var hash = auth.hashPassword("local-all-4186", salt);
assert.ok(auth.hashesEqual(hash, auth.hashPassword("local-all-4186", salt)));
assert.ok(!auth.hashesEqual(hash, auth.hashPassword("wrong-pass-4186", salt)));
assert.ok(!auth.hashesEqual(hash, Buffer.alloc(32)));

var token = auth.makeSessionToken();
assert.ok(/^[A-Za-z0-9_-]+$/.test(token));
assert.strictEqual(auth.tokenHash(token).length, 64);
assert.notStrictEqual(auth.tokenHash(token), token);

assert.strictEqual(auth.cookieValue("mt_admin=abc; other=1", "mt_admin"), "abc");
assert.strictEqual(auth.cookieValue("other=1; mt_admin=xyz", "mt_admin"), "xyz");
assert.strictEqual(auth.cookieValue("mt_admin_extra=no", "mt_admin"), "");
assert.strictEqual(auth.cookieValue("", "mt_admin"), "");

assert.ok(auth.inList("all", auth.roles));
assert.ok(auth.inList("editor", auth.roles));
assert.ok(!auth.inList("guest", auth.roles));

console.log("staff-auth tests passed");
