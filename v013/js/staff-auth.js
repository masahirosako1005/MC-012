/* 管理担当のIDと合言葉の検証。パスワードはハッシュだけを保存する。 */
"use strict";

var crypto = require("crypto");

var roles = ["all", "editor"];
var scryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function safeStaffId(value) {
  return typeof value === "string" && /^[a-z0-9-]{2,20}$/.test(value) ? value : "";
}

function safePassword(value) {
  if (typeof value !== "string") return "";
  if (value.length < 8 || value.length > 64) return "";
  if (/[\u0000-\u001F\u007F]/.test(value)) return "";
  return value;
}

function inList(value, list) {
  return list.indexOf(value) >= 0;
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32, scryptOptions);
}

function makeSalt() {
  return crypto.randomBytes(16);
}

function makeSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashesEqual(left, right) {
  if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function cookieValue(header, name) {
  if (typeof header !== "string" || !name) return "";
  var prefix = name + "=";
  var parts = header.split(";");
  for (var index = 0; index < parts.length; index += 1) {
    var part = parts[index].trim();
    if (part.indexOf(prefix) === 0) return part.slice(prefix.length);
  }
  return "";
}

module.exports = {
  roles: roles,
  safeStaffId: safeStaffId,
  safePassword: safePassword,
  inList: inList,
  hashPassword: hashPassword,
  makeSalt: makeSalt,
  makeSessionToken: makeSessionToken,
  tokenHash: tokenHash,
  hashesEqual: hashesEqual,
  cookieValue: cookieValue
};
