/* サジェスチョン規則。画面用の文言は作らず、候補の採否だけを決める。 */
(function (root) {
  "use strict";

  function seasonById(catalog, id) {
    return catalog.seasons.filter(function (season) { return season.id === id; })[0] || null;
  }

  function spotById(catalog, id) {
    return catalog.spots.filter(function (spot) { return spot.id === id; })[0] || null;
  }

  function reasonById(catalog, id) {
    return catalog.reasons.filter(function (reason) { return reason.id === id; })[0] || null;
  }

  /* 同じスポットを、訪れた季節では出さない。 */
  function visitedSeason(history, spotId, season) {
    return history.some(function (row) {
      return row.spotId === spotId && row.season === season;
    });
  }

  function nextSeasonId(catalog, seasonId) {
    var index = catalog.seasons.findIndex(function (season) { return season.id === seasonId; });
    if (index < 0) return catalog.seasons[0].id;
    return catalog.seasons[(index + 1) % catalog.seasons.length].id;
  }

  /* 現地は今の季節だけ。帰宅後は別季節の訪問済みと、季節を問わない未経験の季節を同じ配列に混ぜる。 */
  function listSuggestions(catalog, history, mode, currentSeason) {
    var rows = [];
    catalog.spots.forEach(function (spot) {
      spot.offerings.forEach(function (offering) {
        if (visitedSeason(history, spot.id, offering.season)) return;
        if (mode === "onsite" && offering.season !== currentSeason) return;
        rows.push({ spotId: spot.id, season: offering.season, reason: offering.reason });
      });
    });
    var preferred = mode === "onsite" ? currentSeason : nextSeasonId(catalog, currentSeason);
    rows.sort(function (a, b) {
      var aRank = a.season === preferred ? 0 : 1;
      var bRank = b.season === preferred ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      var aSpot = spotById(catalog, a.spotId);
      var bSpot = spotById(catalog, b.spotId);
      var aMinutes = offeringOf(aSpot, a.season, a.reason).minutes;
      var bMinutes = offeringOf(bSpot, b.season, b.reason).minutes;
      return aMinutes - bMinutes;
    });
    return rows;
  }

  function offeringOf(spot, season, reason) {
    if (!spot) return null;
    var found = spot.offerings.filter(function (offering) {
      return offering.season === season && offering.reason === reason;
    })[0];
    return found || null;
  }

  function findOffering(catalog, row) {
    if (!row) return null;
    var spot = spotById(catalog, row.spotId);
    var offering = offeringOf(spot, row.season, row.reason);
    if (!spot || !offering) return null;
    return { spot: spot, offering: offering };
  }

  /* 理由ごとに1枚。空のカードは作らない。 */
  function initialCards(catalog, suggestions) {
    return catalog.reasons.map(function (reason) {
      return suggestions.filter(function (row) { return row.reason === reason.id; })[0] || null;
    }).filter(function (row) { return !!row; });
  }

  function spotsForReason(catalog, suggestions, reasonId) {
    var seen = {};
    var list = [];
    suggestions.forEach(function (row) {
      if (row.reason !== reasonId || seen[row.spotId]) return;
      seen[row.spotId] = true;
      list.push(spotById(catalog, row.spotId));
    });
    return list.filter(function (spot) { return !!spot; });
  }

  /* 入れ替え後も、訪れた季節の再提案は拒否する。 */
  function retarget(catalog, suggestions, spotId, reasonId) {
    var exact = suggestions.filter(function (row) {
      return row.spotId === spotId && row.reason === reasonId;
    })[0];
    if (exact) return exact;
    return suggestions.filter(function (row) { return row.reason === reasonId; })[0] || null;
  }

  function cardKey(row) {
    return row ? row.spotId + "|" + row.season + "|" + row.reason : "";
  }

  root.TsudukiEngine = {
    seasonById: seasonById,
    spotById: spotById,
    reasonById: reasonById,
    visitedSeason: visitedSeason,
    nextSeasonId: nextSeasonId,
    listSuggestions: listSuggestions,
    findOffering: findOffering,
    initialCards: initialCards,
    spotsForReason: spotsForReason,
    retarget: retarget,
    cardKey: cardKey
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
