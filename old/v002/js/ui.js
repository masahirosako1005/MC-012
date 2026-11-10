/* 画面描画。利用者入力は選択肢のIDだけを受け、文字列は textContent で出す。 */
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

  function persist() {
    store.save(state);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, onClick, selected) {
    var node = el("button", selected ? "is-selected" : "", text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function seasonLabel(id) {
    return engine.seasonById(catalog, id).label;
  }

  function reasonLabel(id) {
    return engine.reasonById(catalog, id).label;
  }

  /* 低満足向けは、景色の文より先に移動負担を置く。 */
  function burdenLines(offering) {
    return [
      ["所要", offering.minutes + "分"],
      ["移動", offering.access],
      ["歩行", offering.steps],
      ["休憩", offering.rest],
      ["混雑", offering.crowd]
    ];
  }

  function fillCard(parent, row) {
    var found = engine.findOffering(catalog, row);
    if (!found) return;
    parent.appendChild(el("h3", "", found.offering.title));
    parent.appendChild(el("p", "lede", found.spot.area));
    var lines = [["理由", reasonLabel(found.offering.reason)]];
    var burden = burdenLines(found.offering);
    lines = state.showBurdenFirst ? burden.concat(lines) : lines.concat(burden);
    if (found.offering.food) lines.push(["食", found.offering.food]);
    if (found.offering.event) lines.push(["現地", found.offering.event]);
    var meta = el("div", "meta");
    lines.forEach(function (line) {
      var p = el("p");
      p.appendChild(el("strong", "", line[0] + " "));
      p.appendChild(document.createTextNode(line[1]));
      meta.appendChild(p);
    });
    if (state.showBurdenFirst) {
      parent.appendChild(meta);
      parent.appendChild(el("p", "lede", found.offering.detail));
    } else {
      parent.appendChild(el("p", "lede", found.offering.detail));
      parent.appendChild(meta);
    }
  }

  function setMode(mode) {
    state.mode = mode;
    draft = engine.initialCards(catalog, suggestions());
    chosen = 0;
    persist();
    draw();
  }

  function setSeason(season) {
    state.season = season;
    state.noticeSeen = false;
    draft = engine.initialCards(catalog, suggestions());
    chosen = 0;
    persist();
    draw();
  }

  function refreshDraft() {
    var current = suggestions();
    draft = draft.map(function (row) {
      return engine.retarget(catalog, current, row.spotId, row.reason) || current[0] || null;
    }).filter(function (row, index, list) {
      if (!row) return false;
      return list.findIndex(function (item) { return engine.cardKey(item) === engine.cardKey(row); }) === index;
    });
    if (!draft.length) draft = engine.initialCards(catalog, current);
    if (chosen >= draft.length) chosen = 0;
  }

  function renderHome(view) {
    var hero = el("header", "hero");
    hero.appendChild(el("p", "lede", "N西市"));
    hero.appendChild(el("h1", "", "旅の続き便"));
    hero.appendChild(el("p", "", "いま行く場所と、次の季節の約束を、同じ候補から組み立てる。"));
    view.appendChild(hero);

    var panel = el("section", "glass stack");
    var modeRow = el("div", "row switch");
    modeRow.appendChild(button("いま現地", function () { setMode("onsite"); }, state.mode === "onsite"));
    modeRow.appendChild(button("帰ったあと", function () { setMode("after"); }, state.mode === "after"));
    panel.appendChild(modeRow);

    var seasonRow = el("div", "row");
    catalog.seasons.forEach(function (season) {
      seasonRow.appendChild(button(season.label, function () { setSeason(season.id); }, state.season === season.id));
    });
    panel.appendChild(el("p", "lede", "この端末で見ている季節"));
    panel.appendChild(seasonRow);

    var burden = el("label", "check");
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.showBurdenFirst;
    input.addEventListener("change", function () {
      state.showBurdenFirst = input.checked;
      persist();
      draw();
    });
    burden.appendChild(input);
    burden.appendChild(el("span", "", "段差、バス、休憩を先に表示する"));
    panel.appendChild(burden);
    view.appendChild(panel);

    if (state.saved && state.saved.season === state.season && !state.noticeSeen) {
      var notice = el("section", "glass notice stack");
      notice.appendChild(el("h2", "", "約束の季節になりました"));
      fillCard(notice, state.saved);
      notice.appendChild(button("アプリの中で確認した", function () {
        state.noticeSeen = true;
        persist();
        draw();
      }));
      view.appendChild(notice);
    }
  }

  function renderSuggestions(view) {
    view.appendChild(el("h2", "", state.mode === "onsite" ? "いまから行ける場所" : "次の旅の候補"));
    view.appendChild(el("p", "lede", "理由は季節、食、現地の人、移動の負担だけです。"));
    var rows = suggestions();
    if (!rows.length) {
      view.appendChild(el("section", "glass", "今の条件で出せる場所はありません。"));
      return;
    }
    rows.forEach(function (row) {
      var card = el("article", "glass card");
      fillCard(card, row);
      view.appendChild(card);
    });
  }

  function renderCards(view) {
    refreshDraft();
    view.appendChild(el("h2", "", "3枚を編集して、1枚残す"));
    view.appendChild(el("p", "lede", "最初の3枚は初期案です。スポットと理由を入れ替えてから保存します。"));
    if (!draft.length) {
      view.appendChild(el("section", "glass", "今の条件で出せるカードはありません。"));
      return;
    }
    draft.forEach(function (row, index) {
      var card = el("article", "glass card stack");
      var pick = button(index === chosen ? "この1枚を残す" : "この1枚にする", function () {
        chosen = index;
        draw();
      }, index === chosen);
      card.appendChild(pick);

      var reasonLabelNode = el("label", "", "理由");
      var reasonSelect = document.createElement("select");
      catalog.reasons.forEach(function (reason) {
        var option = el("option", "", reason.label);
        option.value = reason.id;
        var allowed = suggestions().some(function (item) { return item.reason === reason.id; });
        option.disabled = !allowed;
        if (reason.id === row.reason) option.selected = true;
        reasonSelect.appendChild(option);
      });
      reasonSelect.addEventListener("change", function () {
        var next = engine.retarget(catalog, suggestions(), row.spotId, reasonSelect.value);
        if (!next) return;
        draft[index] = next;
        persist();
        draw();
      });
      reasonLabelNode.appendChild(reasonSelect);
      card.appendChild(reasonLabelNode);

      var spotLabel = el("label", "", "場所");
      var spotSelect = document.createElement("select");
      engine.spotsForReason(catalog, suggestions(), row.reason).forEach(function (spot) {
        var option = el("option", "", spot.name);
        option.value = spot.id;
        if (spot.id === row.spotId) option.selected = true;
        spotSelect.appendChild(option);
      });
      spotSelect.addEventListener("change", function () {
        var next = engine.retarget(catalog, suggestions(), spotSelect.value, row.reason);
        if (!next) return;
        draft[index] = next;
        draw();
      });
      spotLabel.appendChild(spotSelect);
      card.appendChild(spotLabel);
      fillCard(card, draft[index]);
      view.appendChild(card);
    });
    view.appendChild(button("編集した1枚を保存する", function () {
      state.saved = {
        spotId: draft[chosen].spotId,
        season: draft[chosen].season,
        reason: draft[chosen].reason
      };
      state.noticeSeen = false;
      persist();
      location.hash = "#/promise";
    }));
  }

  function renderPromise(view) {
    view.appendChild(el("h2", "", "残した1枚"));
    if (!state.saved) {
      view.appendChild(el("section", "glass", "まだ保存していません。"));
      return;
    }
    var card = el("article", "glass card");
    if (state.saved.season === state.season) {
      card.appendChild(el("p", "lede", "この季節の条件が整っています。通知は送らず、アプリを開いたときに表示します。"));
    } else {
      card.appendChild(el("p", "lede", seasonLabel(state.saved.season) + "になったら、アプリを開いたときに表示します。"));
    }
    fillCard(card, state.saved);
    view.appendChild(card);
    view.appendChild(button("保存を消す", function () {
      state.saved = null;
      state.noticeSeen = false;
      persist();
      draw();
    }));
  }

  function renderLog(view) {
    view.appendChild(el("h2", "", "この端末に残した季節"));
    view.appendChild(el("p", "lede", "訪れた場所と季節だけを残します。同じ季節の同じ場所は、候補から外れます。"));
    var form = el("section", "glass stack");
    var spotSelect = document.createElement("select");
    catalog.spots.forEach(function (spot) {
      var option = el("option", "", spot.name);
      option.value = spot.id;
      spotSelect.appendChild(option);
    });
    var seasonSelect = document.createElement("select");
    catalog.seasons.forEach(function (season) {
      var option = el("option", "", season.label);
      option.value = season.id;
      seasonSelect.appendChild(option);
    });
    form.appendChild(spotSelect);
    form.appendChild(seasonSelect);
    form.appendChild(button("この季節を残す", function () {
      var row = { spotId: spotSelect.value, season: seasonSelect.value };
      var exists = state.history.some(function (item) {
        return item.spotId === row.spotId && item.season === row.season;
      });
      if (!exists) state.history.push(row);
      draft = engine.initialCards(catalog, suggestions());
      chosen = 0;
      persist();
      draw();
    }));
    view.appendChild(form);
    state.history.forEach(function (row, index) {
      var card = el("article", "glass row");
      var spot = engine.spotById(catalog, row.spotId);
      card.appendChild(el("p", "", seasonLabel(row.season) + "の" + spot.name));
      card.appendChild(button("外す", function () {
        state.history.splice(index, 1);
        draft = engine.initialCards(catalog, suggestions());
        chosen = 0;
        persist();
        draw();
      }));
      view.appendChild(card);
    });
  }

  var screens = {
    home: renderHome,
    suggest: renderSuggestions,
    cards: renderCards,
    promise: renderPromise,
    log: renderLog
  };

  function route() {
    var name = (location.hash || "#/home").replace("#/", "");
    return screens[name] ? name : "home";
  }

  function draw() {
    var app = document.getElementById("app");
    app.replaceChildren();
    var view = el("div", "stack");
    if (route() === "home") renderHome(view);
    else {
      view.appendChild(el("p", "lede", "N西市・旅の続き便"));
      screens[route()](view);
    }
    app.appendChild(view);
    document.querySelectorAll(".nav button").forEach(function (node) {
      var on = node.dataset.route === route();
      if (on) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
  }

  function start() {
    draft = engine.initialCards(catalog, suggestions());
    document.getElementById("nav").addEventListener("click", function (event) {
      var target = event.target.closest("button");
      if (!target) return;
      location.hash = "#/" + target.dataset.route;
    });
    root.addEventListener("hashchange", draw);
    draw();
  }

  root.addEventListener("DOMContentLoaded", start);
})(typeof globalThis !== "undefined" ? globalThis : this);
