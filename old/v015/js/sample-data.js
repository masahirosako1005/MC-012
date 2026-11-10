/* 同じPCから匿名の合成旅行者JSONを読む。失敗は推薦側のフォールバックへ渡す。 */
(function (root) {
  "use strict";

  function load(url) {
    if (typeof root.fetch !== "function") return Promise.resolve(null);
    return root.fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("sample data: " + response.status);
      return response.json();
    }).then(function (data) {
      if (!data || !data.meta || data.meta.synthetic !== true || !Array.isArray(data.travelers)) {
        throw new Error("sample data: invalid schema");
      }
      return data;
    }).catch(function () {
      return null;
    });
  }

  root.MataTabiSampleData = {
    load: load
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
