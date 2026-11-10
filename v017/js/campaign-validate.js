/* 再訪施策と端末キーの検証。SQLへは連結しない。 */
"use strict";

var aims = ["next_season", "new_spot", "add_food", "add_people", "how_to_go"];
var campaignStatuses = ["draft", "running", "stopped"];
var verdicts = ["", "up", "flat", "down"];
var eventTypes = ["visit", "notice", "plan", "dismiss"];
var reasons = ["season", "food", "people"];

function inList(value, list) {
  return list.indexOf(value) >= 0;
}

function sanitizeText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeDeviceKey(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{22,64}$/.test(value) ? value : "";
}

function safeCampaignId(value) {
  return typeof value === "string" && /^c-[a-z0-9-]{4,40}$/.test(value) ? value : "";
}

function makeCampaignId() {
  return "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function dayStamp(value) {
  if (typeof value !== "string") return "";
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

module.exports = {
  aims: aims,
  campaignStatuses: campaignStatuses,
  verdicts: verdicts,
  eventTypes: eventTypes,
  reasons: reasons,
  inList: inList,
  sanitizeText: sanitizeText,
  safeDeviceKey: safeDeviceKey,
  safeCampaignId: safeCampaignId,
  makeCampaignId: makeCampaignId,
  dayStamp: dayStamp
};
