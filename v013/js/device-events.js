/* 再訪KGI用の匿名イベント。端末キー以外の識別子は送らない。 */
(function (root) {
  "use strict";

  function send(payload) {
    var key = root.MataTabiDeviceKey && root.MataTabiDeviceKey.ensure();
    if (!key || typeof root.fetch !== "function") return;
    var body = {};
    Object.keys(payload || {}).forEach(function (name) { body[name] = payload[name]; });
    body.deviceKey = key;
    root.fetch("/api/device/events", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).catch(function () { /* 配信できないときは端末内の記録だけを残す。 */ });
  }

  function otherSeasons(history, spotId, season) {
    var seen = {};
    (Array.isArray(history) ? history : []).forEach(function (row) {
      if (!row || row.spotId !== spotId || row.season === season || seen[row.season]) return;
      seen[row.season] = true;
    });
    return Object.keys(seen);
  }

  function visit(row, history) {
    if (!row) return;
    var fromSeasons = otherSeasons(history, row.spotId, row.season);
    send({
      type: "visit",
      spotId: row.spotId,
      season: row.season,
      reason: row.reason,
      satisfaction: row.satisfaction,
      revisitIntent: row.revisitIntent === true,
      hadOtherSeason: fromSeasons.length > 0,
      fromSeasons: fromSeasons
    });
  }

  function notice(noticeId) {
    if (!noticeId) return;
    send({ type: "notice", noticeId: noticeId });
  }

  function plan(season, items) {
    send({
      type: "plan",
      season: season,
      items: (Array.isArray(items) ? items : []).map(function (row) {
        return { spotId: row.spotId, season: row.season, reason: row.reason };
      })
    });
  }

  function dismiss(row) {
    if (!row) return;
    send({
      type: "dismiss",
      spotId: row.spotId,
      season: row.season,
      reason: row.reason
    });
  }

  root.MataTabiDeviceEvents = {
    visit: visit,
    notice: notice,
    plan: plan,
    dismiss: dismiss
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
