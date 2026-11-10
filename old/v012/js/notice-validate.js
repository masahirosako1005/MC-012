/* お知らせ本文の検証。serve.js と試験から使う。SQLへは連結しない。 */
"use strict";

var categories = ["menu", "local", "event"];
var statuses = ["draft", "published", "hidden"];

function sanitizeText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeTitle(value) {
  return sanitizeText(value, 80);
}

function sanitizeBody(value) {
  return sanitizeText(value, 500);
}

function safeId(value) {
  return typeof value === "string" && /^[a-z0-9-]{1,40}$/.test(value) ? value : "";
}

function makeId() {
  return "n-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function inList(value, list) {
  return list.indexOf(value) >= 0;
}

module.exports = {
  categories: categories,
  statuses: statuses,
  sanitizeTitle: sanitizeTitle,
  sanitizeBody: sanitizeBody,
  safeId: safeId,
  makeId: makeId,
  inList: inList
};
