/* 公開中のお知らせをこのPCの API から読む。失敗時は呼び出し側がカタログへ戻す。 */
(function (root) {
  "use strict";

  function list() {
    if (typeof root.fetch !== "function") return Promise.reject(new Error("notices: no fetch"));
    return root.fetch("/api/notices", { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("notices: " + response.status);
      return response.json();
    }).then(function (data) {
      return Array.isArray(data && data.notices) ? data.notices : [];
    });
  }

  root.MataTabiNotices = {
    list: list
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
