/* この端末だけの保存。ログインも外部ストレージも使わない。 */
(function (root) {
  "use strict";

  var KEY = "nishi-tsuduki-v001";

  function defaultState() {
    return {
      mode: "after",
      season: "autumn",
      showBurdenFirst: false,
      history: [
        { spotId: "shio", season: "autumn" },
        { spotId: "yoichi", season: "autumn" },
        { spotId: "todai", season: "summer" }
      ],
      saved: null,
      noticeSeen: false
    };
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

  /* 保存データが壊れていても、カタログにない値は捨てる。 */
  function sanitize(catalog, raw) {
    var base = defaultState();
    var data = raw && typeof raw === "object" ? raw : {};
    if (data.mode === "onsite" || data.mode === "after") base.mode = data.mode;
    if (knownSeason(catalog, data.season)) base.season = data.season;
    base.showBurdenFirst = data.showBurdenFirst === true;
    base.noticeSeen = data.noticeSeen === true;
    if (Array.isArray(data.history)) {
      base.history = data.history.filter(function (row) {
        return row && knownSpot(catalog, row.spotId) && knownSeason(catalog, row.season);
      }).slice(0, 40);
    }
    if (data.saved && knownSpot(catalog, data.saved.spotId) && knownSeason(catalog, data.saved.season) && knownReason(catalog, data.saved.reason)) {
      base.saved = {
        spotId: data.saved.spotId,
        season: data.saved.season,
        reason: data.saved.reason
      };
    }
    return base;
  }

  function load(catalog) {
    try {
      var text = root.localStorage.getItem(KEY);
      if (!text) return defaultState();
      return sanitize(catalog, JSON.parse(text));
    } catch (error) {
      return defaultState();
    }
  }

  function save(state) {
    root.localStorage.setItem(KEY, JSON.stringify(state));
  }

  root.TsudukiStore = {
    load: load,
    save: save,
    defaultState: defaultState
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
