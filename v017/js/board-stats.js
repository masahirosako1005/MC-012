/* 様子ページ用の集計。端末キーは受け取らず、件数だけを返す。 */
"use strict";

function num(value) {
  var n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function pack(spotId, season) {
  return String(spotId || "") + "\t" + String(season || "");
}

function barWidth(n, max) {
  var value = num(n);
  var top = num(max);
  if (!top || !value) return 0;
  var pct = Math.round((value / top) * 100);
  return pct > 100 ? 100 : pct;
}

/* CSP が style 属性を禁止するため、幅は 10% 刻みのクラス番号にする。 */
function barStep(n, max) {
  return Math.round(barWidth(n, max) / 10);
}

function heatStep(n, max) {
  var value = num(n);
  var top = num(max);
  if (!top || !value) return 0;
  var step = Math.ceil((value / top) * 5);
  return step > 5 ? 5 : step;
}

function mapCount(rows, a, b, nKey) {
  var map = {};
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    if (!row) return;
    map[pack(row[a], row[b])] = num(row[nKey]);
  });
  return map;
}

function mapVisit(rows) {
  var map = {};
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    if (!row) return;
    map[pack(row.spotId, row.season)] = {
      n: num(row.n),
      satSum: num(row.satSum),
      satN: num(row.satN),
      wantAgain: num(row.wantAgain)
    };
  });
  return map;
}

function mergeDays(visitDays, kgiDays) {
  var map = {};
  function add(rows, field) {
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row || typeof row.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) return;
      if (!map[row.day]) map[row.day] = { day: row.day, visits: 0, kgi: 0 };
      map[row.day][field] = num(row.n);
    });
  }
  add(visitDays, "visits");
  add(kgiDays, "kgi");
  return Object.keys(map).sort().slice(-14).map(function (day) { return map[day]; });
}

function assemble(input) {
  var data = input && typeof input === "object" ? input : {};
  var spots = Array.isArray(data.spots) ? data.spots : [];
  var seasons = Array.isArray(data.seasons) ? data.seasons : [];
  var visits = mapVisit(data.visits);
  var dismiss = mapCount(data.dismissals, "spotId", "season", "n");
  var plans = mapCount(data.plans, "spotId", "season", "n");
  var openMap = {};
  (Array.isArray(data.noticeOpens) ? data.noticeOpens : []).forEach(function (row) {
    if (row && row.noticeId) openMap[String(row.noticeId)] = num(row.n);
  });

  /* 季節またぎは市への再来訪として季節の組で数える。場所は、またぎの時に訪れた先として場所別にも持つ。 */
  var kgiBySpot = {};
  var pairMap = {};
  (Array.isArray(data.crosses) ? data.crosses : []).forEach(function (row) {
    if (!row || !row.fromSeason || !row.toSeason) return;
    var n = num(row.n);
    if (row.spotId) kgiBySpot[row.spotId] = (kgiBySpot[row.spotId] || 0) + n;
    var key = pack(row.fromSeason, row.toSeason);
    if (!pairMap[key]) {
      pairMap[key] = { fromSeason: String(row.fromSeason), toSeason: String(row.toSeason), n: 0 };
    }
    pairMap[key].n += n;
  });
  var pairs = Object.keys(pairMap).map(function (key) { return pairMap[key]; });
  pairs.sort(function (a, b) { return b.n - a.n; });

  var spotRows = spots.map(function (spot) {
    var id = spot && spot.id ? String(spot.id) : "";
    var cells = seasons.map(function (season) {
      var seasonId = season && season.id ? String(season.id) : "";
      var vis = visits[pack(id, seasonId)] || { n: 0, satSum: 0, satN: 0, wantAgain: 0 };
      return {
        season: seasonId,
        visits: vis.n,
        dismissals: dismiss[pack(id, seasonId)] || 0,
        plans: plans[pack(id, seasonId)] || 0,
        satN: vis.satN,
        satAvg: vis.satN ? Math.round((vis.satSum / vis.satN) * 10) / 10 : 0,
        wantAgain: vis.wantAgain
      };
    });
    var visitTotal = cells.reduce(function (sum, cell) { return sum + cell.visits; }, 0);
    return {
      spotId: id,
      visitTotal: visitTotal,
      kgi: kgiBySpot[id] || 0,
      seasons: cells
    };
  });
  spotRows.sort(function (a, b) {
    if (b.visitTotal !== a.visitTotal) return b.visitTotal - a.visitTotal;
    return b.kgi - a.kgi;
  });

  var sat = [1, 2, 3, 4, 5].map(function (score) {
    return { score: score, n: 0 };
  });
  (Array.isArray(data.satisfaction) ? data.satisfaction : []).forEach(function (row) {
    var score = num(row && row.score);
    if (score >= 1 && score <= 5) sat[score - 1].n = num(row.n);
  });

  var notices = (Array.isArray(data.notices) ? data.notices : []).map(function (row) {
    if (!row || !row.id) return null;
    return {
      id: String(row.id),
      title: typeof row.title === "string" ? row.title.slice(0, 80) : "",
      status: typeof row.status === "string" ? row.status : "",
      opens: openMap[row.id] || 0
    };
  }).filter(Boolean);
  notices.sort(function (a, b) { return b.opens - a.opens; });

  var totals = data.totals && typeof data.totals === "object" ? data.totals : {};
  var campaigns = Array.isArray(data.campaigns) ? data.campaigns.map(function (row) {
    if (!row) return null;
    return {
      id: String(row.id || ""),
      spotId: String(row.spotId || ""),
      fromSeason: String(row.fromSeason || ""),
      toSeason: String(row.toSeason || ""),
      status: String(row.status || ""),
      verdict: String(row.verdict || ""),
      reach: num(row.reach),
      kgi: num(row.kgi),
      kgiBefore: num(row.kgiBefore)
    };
  }).filter(function (row) { return row && row.id; }) : [];

  return {
    totals: {
      devices: num(totals.devices),
      visits: num(totals.visits),
      kgi: num(totals.kgi),
      noticeOpens: num(totals.noticeOpens),
      plans: num(totals.plans),
      dismissals: num(totals.dismissals)
    },
    kgiNote: typeof data.kgiNote === "string" ? data.kgiNote.slice(0, 120) : "",
    spots: spotRows,
    pairs: pairs,
    notices: notices,
    satisfaction: sat,
    days: mergeDays(data.visitDays, data.kgiDays),
    campaigns: campaigns
  };
}

module.exports = {
  barWidth: barWidth,
  barStep: barStep,
  heatStep: heatStep,
  assemble: assemble
};
