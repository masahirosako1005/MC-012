/* このPCの SQLite 口コミAPI。失敗時は画面側で端末内コメントへフォールバックする。 */
(function (root) {
  "use strict";

  function list(spotId, season) {
    if (typeof root.fetch !== "function") return Promise.resolve([]);
    var query = "spotId=" + encodeURIComponent(spotId) + "&season=" + encodeURIComponent(season);
    return root.fetch("/api/reviews?" + query, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("reviews: " + response.status);
      return response.json();
    }).then(function (data) {
      return Array.isArray(data && data.reviews) ? data.reviews : [];
    });
  }

  function publish(row) {
    if (typeof root.fetch !== "function") return Promise.reject(new Error("reviews: no fetch"));
    return root.fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotId: row.spotId,
        season: row.season,
        satisfaction: row.satisfaction,
        revisitIntent: row.revisitIntent === true,
        body: row.comment
      })
    }).then(function (response) {
      if (!response.ok) throw new Error("reviews: " + response.status);
      return response.json();
    });
  }

  root.MataTabiReviews = {
    list: list,
    publish: publish
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
