/* v002 の画面描画。利用者入力は選択肢のIDだけを受け、文字列は textContent で出す。 */
(function (root) {
  "use strict";

  var catalog = root.TsudukiCatalog;
  var engine = root.TsudukiEngine;
  var store = root.TsudukiStore;
  var state = store.load(catalog);
  var draft = [];
  var chosen = 0;

  function suggestions() {
    return engine.listSuggestions(catalog, state.history, state.mode, state.season);
  }

  function persist() { store.save(state); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, onClick, selected) {
    var node = el("button", className || "", text);
    node.type = "button";
    if (selected) node.classList.add("is-selected");
    node.addEventListener("click", onClick);
    return node;
  }

  function seasonLabel(id) {
    var season = engine.seasonById(catalog, id);
    return season ? season.label : "";
  }

  function reasonLabel(id) {
    var reason = engine.reasonById(catalog, id);
    return reason ? reason.label : "";
  }

  function setMode(mode) {
    state.mode = mode;
    resetDraft();
    persist();
    draw();
  }

  function setSeason(season) {
    state.season = season;
    state.noticeSeen = false;
    resetDraft();
    persist();
    draw();
  }

  function resetDraft() {
    draft = engine.initialCards(catalog, suggestions());
    chosen = 0;
  }

  function refreshDraft() {
    var current = suggestions();
    draft = draft.map(function (row) {
      return engine.retarget(catalog, current, row.spotId, row.reason) || current[0] || null;
    }).filter(function (row, index, rows) {
      if (!row) return false;
      return rows.findIndex(function (item) {
        return engine.cardKey(item) === engine.cardKey(row);
      }) === index;
    });
    if (!draft.length) draft = engine.initialCards(catalog, current);
    if (chosen >= draft.length) chosen = 0;
  }

  function offeringData(row) {
    return engine.findOffering(catalog, row);
  }

  function burdenRows(offering) {
    return [
      ["所要", offering.minutes + "分"],
      ["移動", offering.access],
      ["歩行", offering.steps],
      ["休憩", offering.rest],
      ["混雑", offering.crowd]
    ];
  }

  function appendMeta(parent, offering) {
    var rows = burdenRows(offering);
    if (!state.showBurdenFirst) rows.unshift(["理由", reasonLabel(offering.reason)]);
    else rows.push(["理由", reasonLabel(offering.reason)]);
    if (offering.food) rows.push(["食", offering.food]);
    if (offering.event) rows.push(["現地", offering.event]);
    var meta = el("div", "meta-grid");
    rows.forEach(function (row) {
      var item = el("span");
      item.appendChild(el("strong", "", row[0] + " "));
      item.appendChild(document.createTextNode(row[1]));
      meta.appendChild(item);
    });
    parent.appendChild(meta);
  }

  function spotCard(row, compact) {
    var found = offeringData(row);
    if (!found) return el("article", "spot-card empty", "表示できない候補です。");
    var card = el("article", "spot-card" + (compact ? " compact-card" : ""));
    var cover = el("div", "spot-cover");
    cover.appendChild(el("span", "", found.spot.area));
    card.appendChild(cover);
    var body = el("div", "spot-body");
    body.appendChild(el("h3", "", found.offering.title));
    body.appendChild(el("p", "subtle", reasonLabel(found.offering.reason)));
    if (!compact) {
      if (state.showBurdenFirst) appendMeta(body, found.offering);
      body.appendChild(el("p", "detail", found.offering.detail));
      if (!state.showBurdenFirst) appendMeta(body, found.offering);
    } else {
      body.appendChild(el("p", "detail", found.offering.detail));
      body.appendChild(el("p", "subtle", found.offering.minutes + "分・" + found.offering.access));
    }
    card.appendChild(body);
    return card;
  }

  function page(title) {
    var view = el("div", "page");
    if (title) view.appendChild(el("h1", "page-title", title));
    return view;
  }

  function sectionTitle(title, caption) {
    var row = el("div", "section-title");
    row.appendChild(el("h2", "", title));
    if (caption) row.appendChild(el("span", "", caption));
    return row;
  }

  function renderHome() {
    var view = el("div", "page home-page");
    var hero = el("section", "key-visual");
    var copy = el("div", "hero-copy");
    copy.appendChild(el("p", "eyebrow", "NISHI CITY / SEASONAL JOURNEY"));
    copy.appendChild(el("h1", "", "旅の続き便"));
    copy.appendChild(el("p", "tagline", "めぐるほど、次の季節が待ち遠しくなる。"));
    hero.appendChild(copy);
    view.appendChild(hero);

    var controls = el("section", "panel");
    controls.appendChild(sectionTitle("旅のモード", state.mode === "onsite" ? "現地" : "帰宅後"));
    var modes = el("div", "segmented");
    modes.appendChild(button("いま現地", "", function () { setMode("onsite"); }, state.mode === "onsite"));
    modes.appendChild(button("帰ったあと", "", function () { setMode("after"); }, state.mode === "after"));
    controls.appendChild(modes);
    var seasons = el("div", "season-row");
    catalog.seasons.forEach(function (season) {
      seasons.appendChild(button(season.label, "", function () {
        setSeason(season.id);
      }, state.season === season.id));
    });
    controls.appendChild(seasons);
    var check = el("label", "check");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.showBurdenFirst;
    input.addEventListener("change", function () {
      state.showBurdenFirst = input.checked;
      persist();
      draw();
    });
    check.appendChild(input);
    check.appendChild(el("span", "", "段差・交通・休憩を先に見る"));
    controls.appendChild(check);
    view.appendChild(controls);

    if (state.saved && state.saved.season === state.season && !state.noticeSeen) {
      var notice = el("section", "promise-banner glass");
      notice.appendChild(el("h2", "", "約束の季節になりました"));
      var found = offeringData(state.saved);
      notice.appendChild(el("p", "", found ? found.offering.title + "が、いまの候補です。" : "保存した約束を確認してください。"));
      notice.appendChild(button("確認する", "white-button", function () {
        state.noticeSeen = true;
        persist();
        location.hash = "#/promise";
      }));
      view.appendChild(notice);
    }

    var quick = el("section", "quick-grid");
    var spotButton = button("", "quick-card", function () { location.hash = "#/suggest"; });
    spotButton.appendChild(el("span", "", state.mode === "onsite" ? "NOW" : "NEXT SEASON"));
    spotButton.appendChild(el("strong", "", state.mode === "onsite" ? "いまから行ける場所" : "次の旅の候補"));
    quick.appendChild(spotButton);
    var editButton = button("", "quick-card", function () { location.hash = "#/cards"; });
    editButton.appendChild(el("span", "", "PERSONALIZE"));
    editButton.appendChild(el("strong", "", "3枚を編集する"));
    quick.appendChild(editButton);
    view.appendChild(quick);

    var preview = suggestions().slice(0, 2);
    view.appendChild(sectionTitle("あなたへの続き", preview.length + "件を抜粋"));
    preview.forEach(function (row) { view.appendChild(spotCard(row, true)); });
    return view;
  }

  function renderSuggestions() {
    var rows = suggestions();
    var view = page(state.mode === "onsite" ? "いまから行ける場所" : "次の旅の候補");
    view.appendChild(el("p", "subtle", "季節、食、現地の人、移動の負担から提案します。"));
    if (!rows.length) {
      view.appendChild(el("section", "panel empty", "今の条件で出せる場所はありません。"));
      return view;
    }
    rows.forEach(function (row) { view.appendChild(spotCard(row, false)); });
    return view;
  }

  function selectFor(label, options, value, onChange) {
    var wrapper = el("label", "", label);
    var select = document.createElement("select");
    options.forEach(function (item) {
      var option = el("option", "", item.label);
      option.value = item.value;
      option.disabled = item.disabled === true;
      option.selected = item.value === value;
      select.appendChild(option);
    });
    select.addEventListener("change", function () { onChange(select.value); });
    wrapper.appendChild(select);
    return wrapper;
  }

  function renderCards() {
    refreshDraft();
    var view = page("3枚を、自分の旅に");
    view.classList.add("cards-page");
    view.appendChild(el("p", "subtle", "初期案の場所と理由を入れ替え、次の約束を1枚だけ残します。"));
    if (!draft.length) {
      view.appendChild(el("section", "panel empty", "今の条件で出せるカードはありません。"));
      return view;
    }
    draft.forEach(function (row, index) {
      var found = offeringData(row);
      var card = el("article", "edit-card" + (index === chosen ? " is-chosen" : ""));
      card.appendChild(button(index === chosen ? "この1枚を残す" : "この1枚にする", "select-button", function () {
        chosen = index;
        draw();
      }, index === chosen));
      var selects = el("div", "select-grid");
      var reasonOptions = catalog.reasons.map(function (reason) {
        return {
          value: reason.id,
          label: reason.label.replace("続き", ""),
          disabled: !suggestions().some(function (item) { return item.reason === reason.id; })
        };
      });
      selects.appendChild(selectFor("理由", reasonOptions, row.reason, function (value) {
        var next = engine.retarget(catalog, suggestions(), row.spotId, value);
        if (next) {
          draft[index] = next;
          draw();
        }
      }));
      var spotOptions = engine.spotsForReason(catalog, suggestions(), row.reason).map(function (spot) {
        return { value: spot.id, label: spot.name };
      });
      selects.appendChild(selectFor("場所", spotOptions, row.spotId, function (value) {
        var next = engine.retarget(catalog, suggestions(), value, row.reason);
        if (next) {
          draft[index] = next;
          draw();
        }
      }));
      card.appendChild(selects);
      card.appendChild(el("h3", "", found.offering.title));
      card.appendChild(el("p", "subtle", found.spot.area + "・" + found.offering.minutes + "分"));
      card.appendChild(el("p", "detail", found.offering.detail));
      view.appendChild(card);
    });
    view.appendChild(button("編集した1枚を保存する", "save-button", function () {
      state.saved = {
        spotId: draft[chosen].spotId,
        season: draft[chosen].season,
        reason: draft[chosen].reason
      };
      state.noticeSeen = false;
      persist();
      location.hash = "#/promise";
    }));
    return view;
  }

  function renderPromise() {
    var view = page("残した1枚");
    if (!state.saved) {
      view.appendChild(el("section", "panel empty", "まだ約束を保存していません。"));
      return view;
    }
    var banner = el("section", "promise-banner glass");
    banner.appendChild(el("h2", "", state.saved.season === state.season ? "この季節の条件が整っています" : seasonLabel(state.saved.season) + "に、また会いましょう"));
    banner.appendChild(el("p", "", "プッシュ通知は使わず、このアプリを開いた時にお知らせします。"));
    view.appendChild(banner);
    view.appendChild(spotCard(state.saved, false));
    view.appendChild(button("この約束を消す", "danger-button", function () {
      state.saved = null;
      state.noticeSeen = false;
      persist();
      draw();
    }));
    return view;
  }

  function renderLog() {
    var view = page("季節の履歴");
    view.appendChild(el("p", "subtle", "この端末に残した場所と季節。同じ季節は次の候補から外れます。"));
    var form = el("section", "panel");
    var fields = el("div", "select-grid");
    var spotOptions = catalog.spots.map(function (spot) { return { value: spot.id, label: spot.name }; });
    var seasonOptions = catalog.seasons.map(function (season) { return { value: season.id, label: season.label }; });
    var newSpot = spotOptions[0].value;
    var newSeason = seasonOptions[0].value;
    fields.appendChild(selectFor("場所", spotOptions, newSpot, function (value) { newSpot = value; }));
    fields.appendChild(selectFor("季節", seasonOptions, newSeason, function (value) { newSeason = value; }));
    form.appendChild(fields);
    form.appendChild(button("この季節を履歴に残す", "save-button", function () {
      var exists = state.history.some(function (row) {
        return row.spotId === newSpot && row.season === newSeason;
      });
      if (!exists) state.history.push({ spotId: newSpot, season: newSeason });
      resetDraft();
      persist();
      draw();
    }));
    view.appendChild(form);
    state.history.forEach(function (row, index) {
      var spot = engine.spotById(catalog, row.spotId);
      var item = el("section", "panel history-row");
      item.appendChild(el("p", "", seasonLabel(row.season) + "の" + spot.name));
      item.appendChild(button("外す", "danger-button", function () {
        state.history.splice(index, 1);
        resetDraft();
        persist();
        draw();
      }));
      view.appendChild(item);
    });
    return view;
  }

  var screens = {
    home: { title: "ホーム", render: renderHome },
    suggest: { title: "スポット", render: renderSuggestions },
    cards: { title: "旅を編集", render: renderCards },
    promise: { title: "次の約束", render: renderPromise },
    log: { title: "履歴", render: renderLog }
  };

  function route() {
    var name = (location.hash || "#/home").replace("#/", "");
    return screens[name] ? name : "home";
  }

  function draw() {
    var current = route();
    var app = document.getElementById("app");
    app.replaceChildren(screens[current].render());
    document.getElementById("screen-title").textContent = screens[current].title;
    document.querySelectorAll(".bottom-nav button").forEach(function (node) {
      if (node.dataset.route === current) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
  }

  function start() {
    resetDraft();
    document.getElementById("nav").addEventListener("click", function (event) {
      var target = event.target.closest("button[data-route]");
      if (target) location.hash = "#/" + target.dataset.route;
    });
    document.getElementById("menu-button").addEventListener("click", function () {
      location.hash = "#/log";
    });
    document.getElementById("notice-button").addEventListener("click", function () {
      location.hash = "#/promise";
    });
    root.addEventListener("hashchange", draw);
    draw();
  }

  root.addEventListener("DOMContentLoaded", start);
})(typeof globalThis !== "undefined" ? globalThis : this);
