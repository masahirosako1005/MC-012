/* v010 の端末内保存。個人を識別する値や外部ストレージは使わない。 */
(function (root) {
  "use strict";

  var KEY = "matatabi-v010";
  var PREVIOUS_KEY = "matatabi-v009";
  var parties = ["solo", "couple", "family", "friends"];
  var durations = ["short", "half", "full"];
  var mobilities = ["low", "medium", "high"];
  var interests = ["scenery", "food", "people", "events", "history", "nature"];
  var crowds = ["avoid", "neutral", "okay"];
  var languages = ["ja", "en", "zh", "ko", "fr", "it"];
  var actionTypes = ["view", "save", "visit", "dismiss"];

  function defaultPreferences() {
    return {
      party: "",
      duration: "",
      mobility: "",
      interests: [],
      crowd: ""
    };
  }

  function defaultState() {
    return {
      mode: "after",
      season: "autumn",
      preferences: defaultPreferences(),
      history: [
        { spotId: "shio", season: "autumn", reason: "people", visitedAt: "2026-10-12", satisfaction: 4, revisitIntent: true },
        { spotId: "yoichi", season: "autumn", reason: "food", visitedAt: "2026-10-13", satisfaction: 3, revisitIntent: false },
        { spotId: "todai", season: "summer", reason: "season", visitedAt: "2026-08-20", satisfaction: 5, revisitIntent: true }
      ],
      actions: [],
      dismissedRevisits: [],
      saved: null,
      savedPlan: null,
      noticeSeen: false,
      noticeBaseline: false,
      seenNoticeStamp: "",
      hiddenNoticeStamp: "",
      language: "ja"
    };
  }

  function inList(value, list) {
    return list.indexOf(value) >= 0;
  }

  /* 公開中お知らせの指紋。端末キーや本文は入れない。 */
  function noticeStamp(notices) {
    return (Array.isArray(notices) ? notices : []).map(function (row) {
      if (!row || typeof row.id !== "string" || !row.id) return "";
      var updated = typeof row.updatedAt === "string" ? row.updatedAt.replace(/[^\w:.-]/g, "").slice(0, 24) : "";
      return row.id.slice(0, 40) + ":" + updated;
    }).filter(Boolean).sort().join("|").slice(0, 800);
  }

  function safeStamp(value) {
    if (typeof value !== "string") return "";
    return value.replace(/[^\w:|.-]/g, "").slice(0, 800);
  }

  function knownSpot(catalog, id) {
    return catalog.spots.some(function (spot) { return spot.id === id; });
  }

  function knownSeason(catalog, id) {
    return catalog.seasons.some(function (season) { return season.id === id; });
  }

  function knownReason(catalog, id) {
    return catalog.reasons.some(function (reason) { return reason.id === id; });
  }

  function knownOffering(catalog, spotId, season, reason) {
    return catalog.spots.some(function (spot) {
      return spot.id === spotId && spot.offerings.some(function (offering) {
        return offering.season === season && offering.reason === reason;
      });
    });
  }

  function safeDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  }

  /* 自由記述は200文字まで。制御文字を捨て、表示は textContent 側で行う。 */
  function sanitizeComment(value) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  }

  function sanitizePreferences(raw) {
    var data = raw && typeof raw === "object" ? raw : {};
    return {
      party: inList(data.party, parties) ? data.party : "",
      duration: inList(data.duration, durations) ? data.duration : "",
      mobility: inList(data.mobility, mobilities) ? data.mobility : "",
      interests: Array.isArray(data.interests) ? data.interests.filter(function (id, index, rows) {
        return inList(id, interests) && rows.indexOf(id) === index;
      }).slice(0, 4) : [],
      crowd: inList(data.crowd, crowds) ? data.crowd : ""
    };
  }

  function sanitizeHistory(catalog, rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(function (row) {
      return row && knownSpot(catalog, row.spotId) && knownSeason(catalog, row.season);
    }).slice(0, 40).map(function (row) {
      return {
        spotId: row.spotId,
        season: row.season,
        reason: knownReason(catalog, row.reason) ? row.reason : "",
        visitedAt: safeDate(row.visitedAt),
        satisfaction: Number.isInteger(row.satisfaction) && row.satisfaction >= 1 && row.satisfaction <= 5 ? row.satisfaction : 0,
        revisitIntent: row.revisitIntent === true,
        comment: sanitizeComment(row.comment)
      };
    });
  }

  function sanitizeActions(catalog, rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(function (row) {
      return row && inList(row.type, actionTypes) && knownSpot(catalog, row.spotId) &&
        knownSeason(catalog, row.season) && knownReason(catalog, row.reason);
    }).slice(-200).map(function (row) {
      return {
        type: row.type,
        spotId: row.spotId,
        season: row.season,
        reason: row.reason,
        at: typeof row.at === "string" ? row.at.slice(0, 24) : ""
      };
    });
  }

  function sanitizePlan(catalog, raw) {
    if (!raw || !knownSeason(catalog, raw.season) || !Array.isArray(raw.items)) return null;
    var usedSpots = {};
    var items = raw.items.filter(function (row) {
      if (!row || row.season !== raw.season || usedSpots[row.spotId] ||
        !knownOffering(catalog, row.spotId, row.season, row.reason)) return false;
      usedSpots[row.spotId] = true;
      return true;
    }).map(function (row) {
      return { spotId: row.spotId, season: raw.season, reason: row.reason };
    });
    return items.length >= 1 ? { season: raw.season, items: items } : null;
  }

  function sanitizeDismissedRevisits(catalog, rows) {
    if (!Array.isArray(rows)) return [];
    var used = {};
    return rows.filter(function (row) {
      if (!row || !knownOffering(catalog, row.spotId, row.season, row.reason)) return false;
      var key = row.spotId + "|" + row.season + "|" + row.reason;
      if (used[key]) return false;
      used[key] = true;
      return true;
    }).map(function (row) {
      return { spotId: row.spotId, season: row.season, reason: row.reason };
    });
  }

  /* 保存値をカタログと許可リストへ照合し、未知の値を画面へ渡さない。 */
  function sanitize(catalog, raw) {
    var base = defaultState();
    var data = raw && typeof raw === "object" ? raw : {};
    if (data.mode === "onsite" || data.mode === "after") base.mode = data.mode;
    if (knownSeason(catalog, data.season)) base.season = data.season;
    if (inList(data.language, languages)) base.language = data.language;
    base.noticeSeen = data.noticeSeen === true;
    base.noticeBaseline = data.noticeBaseline === true;
    base.seenNoticeStamp = safeStamp(data.seenNoticeStamp);
    base.hiddenNoticeStamp = safeStamp(data.hiddenNoticeStamp);
    base.preferences = sanitizePreferences(data.preferences);
    if (Array.isArray(data.history)) base.history = sanitizeHistory(catalog, data.history);
    base.actions = sanitizeActions(catalog, data.actions);
    base.dismissedRevisits = sanitizeDismissedRevisits(catalog, data.dismissedRevisits);
    if (data.saved && knownSpot(catalog, data.saved.spotId) && knownSeason(catalog, data.saved.season) && knownReason(catalog, data.saved.reason)) {
      base.saved = {
        spotId: data.saved.spotId,
        season: data.saved.season,
        reason: data.saved.reason
      };
    }
    base.savedPlan = sanitizePlan(catalog, data.savedPlan);
    return base;
  }

  function load(catalog) {
    try {
      var text = root.localStorage.getItem(KEY);
      if (text) return sanitize(catalog, JSON.parse(text));

      /* v009 の履歴と保存したプランを引き継ぎ、新項目は安全な初期値にする。 */
      var previous = root.localStorage.getItem(PREVIOUS_KEY);
      if (previous) {
        var migrated = sanitize(catalog, JSON.parse(previous));
        save(migrated);
        return migrated;
      }
      return defaultState();
    } catch (error) {
      return defaultState();
    }
  }

  function save(state) {
    try {
      root.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      /* 容量超過時は行動ログの古い半分を捨て、主要な設定と履歴を残す。 */
      state.actions = Array.isArray(state.actions) ? state.actions.slice(-100) : [];
      root.localStorage.setItem(KEY, JSON.stringify(state));
    }
  }

  function addAction(state, row) {
    if (!row || !inList(row.type, actionTypes)) return;
    state.actions.push({
      type: row.type,
      spotId: row.spotId,
      season: row.season,
      reason: row.reason,
      at: new Date().toISOString()
    });
    state.actions = state.actions.slice(-200);
  }

  root.TsudukiStore = {
    load: load,
    save: save,
    sanitize: sanitize,
    sanitizeComment: sanitizeComment,
    addAction: addAction,
    noticeStamp: noticeStamp,
    safeStamp: safeStamp,
    defaultState: defaultState,
    defaultPreferences: defaultPreferences
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
