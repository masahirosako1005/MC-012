/* 本人の端末内データと匿名の合成サンプルから、説明可能な再訪候補を作る純粋関数。 */
(function (root) {
  "use strict";

  var styleValues = {
    party: ["solo", "couple", "family", "friends"],
    duration: ["short", "half", "full"],
    mobility: ["low", "medium", "high"],
    interests: ["scenery", "food", "people", "events", "history", "nature"],
    crowd: ["avoid", "neutral", "okay"]
  };
  var reasonTags = {
    season: ["scenery", "nature"],
    food: ["food"],
    people: ["people", "events"]
  };
  var interestIds = ["scenery", "food", "people", "events", "history", "nature"];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function uniqueKnown(rows, allowed) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(function (value, index, all) {
      return allowed.indexOf(value) >= 0 && all.indexOf(value) === index;
    });
  }

  function jaccard(a, b) {
    var left = uniqueKnown(a, styleValues.interests);
    var right = uniqueKnown(b, styleValues.interests);
    if (!left.length || !right.length) return 0;
    var union = left.filter(function (value) { return right.indexOf(value) < 0; }).concat(right);
    var intersection = left.filter(function (value) { return right.indexOf(value) >= 0; });
    return intersection.length / union.length;
  }

  /* 未回答項目は分母に入れず、登録済みの旅行スタイルだけで類似度を出す。 */
  function styleSimilarity(preferences, sampleStyle) {
    var user = preferences || {};
    var sample = sampleStyle || {};
    var score = 0;
    var weight = 0;

    [["party", 0.15], ["duration", 0.15], ["mobility", 0.20], ["crowd", 0.15]].forEach(function (row) {
      var key = row[0];
      if (styleValues[key].indexOf(user[key]) < 0) return;
      weight += row[1];
      if (user[key] === sample[key]) score += row[1];
    });

    var userInterests = uniqueKnown(user.interests, styleValues.interests);
    if (userInterests.length) {
      weight += 0.35;
      score += 0.35 * jaccard(userInterests, sample.interests);
    }
    return weight ? score / weight : 0;
  }

  function knownCatalogValue(catalog, group, id) {
    return catalog[group].some(function (item) { return item.id === id; });
  }

  /* JSONを推薦に使う直前に検証し、不明なIDや範囲外の評価を捨てる。 */
  function sanitizeSampleData(catalog, sampleData) {
    if (!sampleData || !sampleData.meta || sampleData.meta.synthetic !== true || !Array.isArray(sampleData.travelers)) return [];
    return sampleData.travelers.filter(function (traveler) {
      return traveler && typeof traveler.travelerId === "string" && traveler.style && Array.isArray(traveler.visits);
    }).map(function (traveler) {
      return {
        travelerId: traveler.travelerId.slice(0, 40),
        style: {
          party: styleValues.party.indexOf(traveler.style.party) >= 0 ? traveler.style.party : "",
          duration: styleValues.duration.indexOf(traveler.style.duration) >= 0 ? traveler.style.duration : "",
          mobility: styleValues.mobility.indexOf(traveler.style.mobility) >= 0 ? traveler.style.mobility : "",
          interests: uniqueKnown(traveler.style.interests, styleValues.interests),
          crowd: styleValues.crowd.indexOf(traveler.style.crowd) >= 0 ? traveler.style.crowd : ""
        },
        visits: traveler.visits.filter(function (visit) {
          return visit && knownCatalogValue(catalog, "spots", visit.spotId) &&
            knownCatalogValue(catalog, "seasons", visit.season) &&
            knownCatalogValue(catalog, "reasons", visit.reason) &&
            Number.isInteger(visit.satisfaction) && visit.satisfaction >= 1 && visit.satisfaction <= 5;
        }).map(function (visit) {
          return {
            spotId: visit.spotId,
            season: visit.season,
            reason: visit.reason,
            satisfaction: visit.satisfaction,
            revisitIntent: visit.revisitIntent === true
          };
        })
      };
    }).filter(function (traveler) {
      return traveler.visits.length > 0;
    });
  }

  function similarTravelers(catalog, preferences, sampleData, limit) {
    return sanitizeSampleData(catalog, sampleData).map(function (traveler) {
      return {
        traveler: traveler,
        similarity: styleSimilarity(preferences, traveler.style)
      };
    }).filter(function (row) {
      return row.similarity > 0;
    }).sort(function (a, b) {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return a.traveler.travelerId.localeCompare(b.traveler.travelerId);
    }).slice(0, limit || 5);
  }

  function offeringTags(spot, offering) {
    return uniqueKnown((spot.tags || []).concat(reasonTags[offering.reason] || []), styleValues.interests);
  }

  function interestAffinity(preferences, spot, offering) {
    var selected = uniqueKnown(preferences && preferences.interests, styleValues.interests);
    if (!selected.length) return 0.5;
    var tags = offeringTags(spot, offering);
    var matches = selected.filter(function (tag) { return tags.indexOf(tag) >= 0; });
    return matches.length / selected.length;
  }

  function durationFit(duration, minutes) {
    if (!duration) return 0.5;
    if (duration === "short") return minutes <= 45 ? 1 : minutes <= 60 ? 0.5 : 0.1;
    if (duration === "half") return minutes <= 75 ? 1 : 0.5;
    return 1;
  }

  function mobilityFit(mobility, offering) {
    if (!mobility) return 0.5;
    var hard = /階段が多い|坂と段差が多い|上り/.test(offering.steps + " " + offering.access);
    var medium = /段差|石畳|桟橋/.test(offering.steps + " " + offering.access);
    if (mobility === "low") return hard ? 0 : medium ? 0.4 : 1;
    if (mobility === "medium") return hard ? 0.55 : 1;
    return 1;
  }

  function crowdFit(crowd, offering) {
    if (!crowd) return 0.5;
    var busy = /混む|人が増える/.test(offering.crowd);
    var quiet = /空いている/.test(offering.crowd);
    if (crowd === "avoid") return quiet ? 1 : busy ? 0.1 : 0.65;
    if (crowd === "okay") return 1;
    return busy ? 0.65 : 0.9;
  }

  function actionAffinity(actions, row) {
    var weights = { view: 0.2, save: 0.7, visit: 1, dismiss: -1 };
    var total = (Array.isArray(actions) ? actions : []).filter(function (action) {
      return action.spotId === row.spotId;
    }).reduce(function (sum, action) {
      var exact = action.season === row.season && action.reason === row.reason ? 1 : 0.55;
      return sum + (weights[action.type] || 0) * exact;
    }, 0);
    return clamp((total + 1) / 3, 0, 1);
  }

  function sampleAffinity(similar, row) {
    var numerator = 0;
    var denominator = 0;
    similar.forEach(function (match) {
      match.traveler.visits.forEach(function (visit) {
        if (visit.spotId !== row.spotId) return;
        var exact = visit.season === row.season && visit.reason === row.reason;
        var closeness = exact ? 1 : visit.season === row.season ? 0.82 : 0.62;
        var intent = visit.revisitIntent ? 1 : 0.72;
        numerator += match.similarity * (visit.satisfaction / 5) * closeness * intent;
        denominator += match.similarity;
      });
    });
    return denominator ? clamp(numerator / denominator, 0, 1) : 0;
  }

  function historyForSpot(history, spotId) {
    return (Array.isArray(history) ? history : []).filter(function (visit) {
      return visit.spotId === spotId;
    });
  }

  function personalHistoryAffinity(visits) {
    if (!visits.length) return 0.35;
    var rated = visits.filter(function (visit) { return visit.satisfaction > 0; });
    if (!rated.length) return 0.55;
    return rated.reduce(function (sum, visit) {
      return sum + visit.satisfaction / 5;
    }, 0) / rated.length;
  }

  function exactVisitAllowed(visits, offering) {
    var exact = visits.filter(function (visit) {
      return visit.season === offering.season;
    });
    if (!exact.length) return true;
    return exact.some(function (visit) { return visit.revisitIntent === true; });
  }

  function reasonTexts(preferences, spot, offering, visits, sampleScore, burdenScore, coldStart) {
    var reasons = [];
    var sameSeason = visits.some(function (visit) { return visit.season === offering.season; });
    /* 履歴があるのにこの場所に行っていなければ、市内の新しい出会いとして先に示す。 */
    if (!coldStart && !visits.length) reasons.push({ key: "newSpot" });
    if (visits.length && !sameSeason) reasons.push({ key: "diffSeason", season: offering.season });
    if (visits.some(function (visit) { return visit.satisfaction >= 4; })) reasons.push({ key: "highSatisfaction" });
    if (sampleScore >= 0.62) reasons.push({ key: "sampleLiked" });

    var selected = uniqueKnown(preferences && preferences.interests, styleValues.interests);
    var tags = offeringTags(spot, offering);
    var interest = selected.filter(function (tag) { return tags.indexOf(tag) >= 0; })[0];
    if (interest && interestIds.indexOf(interest) >= 0) reasons.push({ key: "interest", interest: interest });
    if (burdenScore >= 0.85 && preferences && preferences.mobility === "low") reasons.push({ key: "lowBurden" });
    if (coldStart && !reasons.length) reasons.push({ key: "seasonFit" });
    if (!reasons.length) reasons.push({ key: "similarChoice" });
    return reasons.slice(0, 2);
  }

  /* 履歴があっても全スポットを候補にする。目的は同じ場所への再訪ではなく、市への再来訪。 */
  function cityNovelty(visits, history, offering) {
    var sameSpotSeason = visits.some(function (visit) { return visit.season === offering.season; });
    if (sameSpotSeason) return 0.62;
    var newSpot = visits.length === 0;
    var newSeason = !history.some(function (visit) { return visit.season === offering.season; });
    return 0.7 + (newSpot ? 0.15 : 0.1) + (newSeason ? 0.15 : 0);
  }

  /* 40/30/20/10 の構成を保ち、同点は季節と所要時間で安定して並べる。 */
  function recommend(catalog, state, sampleData) {
    var preferences = state.preferences || {};
    var history = Array.isArray(state.history) ? state.history : [];
    var hasHistory = history.length > 0;
    var similar = similarTravelers(catalog, preferences, sampleData, 5);
    var rows = [];

    catalog.spots.forEach(function (spot) {
      var visits = historyForSpot(history, spot.id);
      spot.offerings.forEach(function (offering) {
        if (state.mode === "onsite" && offering.season !== state.season) return;
        if (visits.length && !exactVisitAllowed(visits, offering)) return;

        var row = { spotId: spot.id, season: offering.season, reason: offering.reason };
        var interest = interestAffinity(preferences, spot, offering);
        var action = actionAffinity(state.actions, row);
        var historyAffinity = personalHistoryAffinity(visits);
        var personal = clamp(interest * 0.55 + historyAffinity * 0.30 + action * 0.15, 0, 1);
        var collaborative = sampleAffinity(similar, row);
        var novelty = hasHistory ? cityNovelty(visits, history, offering) : 0.42;
        var burden = (
          durationFit(preferences.duration, offering.minutes) +
          mobilityFit(preferences.mobility, offering) +
          crowdFit(preferences.crowd, offering)
        ) / 3;
        var score = Math.round((personal * 40 + collaborative * 30 + novelty * 20 + burden * 10) * 10) / 10;

        rows.push({
          spotId: row.spotId,
          season: row.season,
          reason: row.reason,
          score: score,
          isRevisit: visits.length > 0,
          isNewSpot: hasHistory && visits.length === 0,
          reasons: reasonTexts(preferences, spot, offering, visits, collaborative, burden, !hasHistory),
          components: {
            personal: Math.round(personal * 400) / 10,
            similarTravelers: Math.round(collaborative * 300) / 10,
            newExperience: Math.round(novelty * 200) / 10,
            burden: Math.round(burden * 100) / 10
          }
        });
      });
    });

    rows.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.season === state.season) !== (a.season === state.season)) return b.season === state.season ? 1 : -1;
      var aFound = catalog.spots.filter(function (spot) { return spot.id === a.spotId; })[0];
      var bFound = catalog.spots.filter(function (spot) { return spot.id === b.spotId; })[0];
      var aMinutes = aFound.offerings.filter(function (item) { return item.season === a.season && item.reason === a.reason; })[0].minutes;
      var bMinutes = bFound.offerings.filter(function (item) { return item.season === b.season && item.reason === b.reason; })[0].minutes;
      return aMinutes - bMinutes;
    });
    return rows;
  }

  root.MataTabiRecommendation = {
    styleSimilarity: styleSimilarity,
    sanitizeSampleData: sanitizeSampleData,
    similarTravelers: similarTravelers,
    recommend: recommend
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
