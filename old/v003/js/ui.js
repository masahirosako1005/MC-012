/* MataTabi v003 の画面。文字列は textContent で出し、詳細だけをモーダルにする。 */
(function (root) {
  "use strict";

  var catalog = root.TsudukiCatalog;
  var engine = root.TsudukiEngine;
  var store = root.TsudukiStore;
  var state = store.load(catalog);
  var draft = [];
  var chosen = 0;
  var memoryNote = "";
  var lastFocus = null;

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

  function go(name) {
    if ((location.hash || "#/home") === "#/" + name) draw();
    else location.hash = "#/" + name;
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

  /* 記録は季節までしか持たない。各スポットのその季節の体験を詳細に使う。 */
  function findVisit(row) {
    var spot = engine.spotById(catalog, row && row.spotId);
    if (!spot) return null;
    var offering = spot.offerings.filter(function (item) { return item.season === row.season; })[0] || null;
    if (!offering) return null;
    return { spot: spot, offering: offering };
  }

  /* サムネイルは人物や既存作品を参照しない、オリジナルの風景画像。 */
  function photo(spotId, label, className) {
    var img = document.createElement("img");
    img.className = className || "";
    img.alt = label;
    img.src = "img/spots/" + spotId + ".jpg";
    img.addEventListener("error", function () {
      img.replaceWith(el("span", "thumb-fallback", label.slice(0, 1)));
    });
    return img;
  }

  function burdenRows(offering) {
    var rows = [
      ["所要", offering.minutes + "分"],
      ["移動", offering.access],
      ["歩行", offering.steps],
      ["休憩", offering.rest],
      ["混雑", offering.crowd]
    ];
    if (!state.showBurdenFirst) rows.unshift(["理由", reasonLabel(offering.reason)]);
    else rows.push(["理由", reasonLabel(offering.reason)]);
    if (offering.food) rows.push(["食", offering.food]);
    if (offering.event) rows.push(["現地", offering.event]);
    return rows;
  }

  function appendMeta(parent, offering) {
    var meta = el("div", "meta-grid");
    burdenRows(offering).forEach(function (row) {
      var item = el("span");
      item.appendChild(el("strong", "", row[0] + " "));
      item.appendChild(document.createTextNode(row[1]));
      meta.appendChild(item);
    });
    parent.appendChild(meta);
  }

  function thumbButton(spotId, caption, onClick) {
    var node = button("", "thumb-button", onClick);
    node.appendChild(photo(spotId, caption));
    node.appendChild(el("span", "thumb-caption", caption));
    return node;
  }

  function renderHome() {
    var view = el("div", "page home-page");
    var memories = el("article", "glass home-card");
    var memoryRow = el("div", "thumb-row");
    state.history.slice(0, 4).forEach(function (row) {
      var found = findVisit(row);
      if (!found) return;
      var caption = seasonLabel(row.season) + "・" + found.spot.name;
      memoryRow.appendChild(thumbButton(found.spot.id, caption, function () {
        openDetail("record", row);
      }));
    });
    if (!memoryRow.childElementCount) {
      memoryRow.appendChild(el("p", "subtle", "この端末に残した旅は、まだありません。"));
    }
    memories.appendChild(memoryRow);
    memories.appendChild(button("思い出を振り返る", "white-button", function () { go("memories"); }));
    view.appendChild(memories);

    var discover = el("article", "glass home-card");
    var discoverRow = el("div", "thumb-row");
    suggestions().slice(0, 4).forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      var caption = found.offering.event || found.offering.title;
      discoverRow.appendChild(thumbButton(found.spot.id, caption, function () {
        openDetail("candidate", row);
      }));
    });
    if (!discoverRow.childElementCount) {
      discoverRow.appendChild(el("p", "subtle", "今の条件で出せる場所はありません。"));
    }
    discover.appendChild(discoverRow);
    discover.appendChild(button("未訪問地を探す", "white-button", function () { go("discover"); }));
    view.appendChild(discover);
    return view;
  }

  function summaryButton(found, caption, detail, onClick) {
    var node = button("", "summary", onClick);
    node.appendChild(photo(found.spot.id, found.spot.name));
    var copy = el("span", "summary-copy");
    copy.appendChild(el("strong", "", caption));
    if (detail) copy.appendChild(el("span", "", detail));
    node.appendChild(copy);
    return node;
  }

  function selectFor(label, options, value, onChange) {
    var wrapper = el("label", "field");
    wrapper.appendChild(el("span", "", label));
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

  function modeAndSeason(parent) {
    var modes = el("div", "segmented");
    modes.appendChild(button("いま現地", "", function () { setMode("onsite"); }, state.mode === "onsite"));
    modes.appendChild(button("帰ったあと", "", function () { setMode("after"); }, state.mode === "after"));
    parent.appendChild(modes);
    var seasons = el("div", "season-row");
    catalog.seasons.forEach(function (season) {
      seasons.appendChild(button(season.label, "", function () {
        setSeason(season.id);
      }, state.season === season.id));
    });
    parent.appendChild(seasons);
  }

  function renderMemories() {
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", "思い出"));
    view.appendChild(el("p", "subtle", "この端末に残した場所と季節です。同じ季節は、次の候補から外れます。"));
    if (memoryNote) view.appendChild(el("p", "subtle", memoryNote));
    var form = el("section", "glass panel");
    var fields = el("div", "select-grid");
    var spotOptions = catalog.spots.map(function (spot) { return { value: spot.id, label: spot.name }; });
    var seasonOptions = catalog.seasons.map(function (season) { return { value: season.id, label: season.label }; });
    var newSpot = spotOptions[0].value;
    var newSeason = seasonOptions[0].value;
    fields.appendChild(selectFor("場所", spotOptions, newSpot, function (value) { newSpot = value; }));
    fields.appendChild(selectFor("季節", seasonOptions, newSeason, function (value) { newSeason = value; }));
    form.appendChild(fields);
    form.appendChild(button("この季節を残す", "white-button", function () {
      var exists = state.history.some(function (row) {
        return row.spotId === newSpot && row.season === newSeason;
      });
      if (exists) {
        memoryNote = "同じ場所の同じ季節は、すでに残しています。";
      } else {
        memoryNote = "";
        state.history.push({ spotId: newSpot, season: newSeason });
        resetDraft();
        persist();
      }
      draw();
    }));
    view.appendChild(form);
    state.history.forEach(function (row, index) {
      var found = findVisit(row);
      if (!found) return;
      var line = el("div", "history-row");
      line.appendChild(summaryButton(
        found,
        seasonLabel(row.season) + "の" + found.spot.name,
        found.offering.title,
        function () { openDetail("record", row); }
      ));
      line.appendChild(button("外す", "text-button", function () {
        state.history.splice(index, 1);
        resetDraft();
        persist();
        draw();
      }));
      view.appendChild(line);
    });
    return view;
  }

  function renderDiscover() {
    var rows = suggestions();
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", state.mode === "onsite" ? "いまから行ける場所" : "次の旅の候補"));
    view.appendChild(el("p", "subtle", "季節、食、現地の人、移動の負担から提案します。"));
    var controls = el("section", "glass panel");
    modeAndSeason(controls);
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
    if (!rows.length) {
      view.appendChild(el("section", "glass panel empty", "今の条件で出せる場所はありません。"));
    }
    rows.forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      view.appendChild(summaryButton(
        found,
        found.offering.title,
        found.spot.area + (found.offering.event ? "・" + found.offering.event : ""),
        function () { openDetail("candidate", row); }
      ));
    });
    view.appendChild(button("3枚から1枚を残す", "white-button", function () { go("cards"); }));
    return view;
  }

  function renderFavorites() {
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", "お気に入り"));
    if (!state.saved) {
      view.appendChild(el("section", "glass panel empty", "まだ1枚も残していません。"));
    } else {
      var found = offeringData(state.saved);
      var note = el("section", "glass panel");
      note.appendChild(el("h3", "", state.saved.season === state.season ? "この季節の条件が整っています" : seasonLabel(state.saved.season) + "に、また開いてください"));
      note.appendChild(el("p", "subtle", "プッシュ通知は使わず、このアプリを開いたときにお知らせします。"));
      view.appendChild(note);
      if (found) {
        view.appendChild(summaryButton(found, found.offering.title, found.spot.area, function () {
          openDetail("candidate", state.saved);
        }));
      }
      view.appendChild(button("この1枚を外す", "white-button", function () {
        state.saved = null;
        state.noticeSeen = false;
        persist();
        draw();
      }));
    }
    view.appendChild(button("3枚を編集する", "white-button", function () { go("cards"); }));
    return view;
  }

  function renderCards() {
    refreshDraft();
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", "3枚を、自分の旅に"));
    view.appendChild(el("p", "subtle", "初期案の場所と理由を入れ替え、次の1枚だけ残します。"));
    if (!draft.length) {
      view.appendChild(el("section", "glass panel empty", "今の条件で出せるカードはありません。"));
      return view;
    }
    draft.forEach(function (row, index) {
      var found = offeringData(row);
      var card = el("article", "glass edit-card" + (index === chosen ? " is-chosen" : ""));
      card.appendChild(button(index === chosen ? "この1枚を残す" : "この1枚にする", "white-button", function () {
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
      if (found) {
        card.appendChild(el("h3", "", found.offering.title));
        card.appendChild(el("p", "subtle", found.spot.area + "・" + found.offering.minutes + "分"));
        card.appendChild(el("p", "detail", found.offering.detail));
      }
      view.appendChild(card);
    });
    view.appendChild(button("編集した1枚を保存する", "white-button", function () {
      state.saved = {
        spotId: draft[chosen].spotId,
        season: draft[chosen].season,
        reason: draft[chosen].reason
      };
      state.noticeSeen = false;
      persist();
      go("favorites");
    }));
    return view;
  }

  /* 詳細とお知らせは、同じ中央モーダルで開く。カードの外を押すと閉じる。 */
  function openModal(card, kind) {
    lastFocus = document.activeElement;
    var back = el("div", "modal-back" + (kind === "notice" ? " is-notice" : ""));
    back.dataset.kind = kind;
    card.classList.add("glass", "modal-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    back.appendChild(card);
    back.addEventListener("click", function (event) {
      if (event.target === back) closeModal();
    });
    document.getElementById("modal-root").replaceChildren(back);
    document.getElementById("app").inert = true;
    if (kind !== "notice") document.querySelector(".topbar").inert = true;
    document.getElementById("notice-button").setAttribute("aria-expanded", kind === "notice" ? "true" : "false");
    var focusNode = card.querySelector("button");
    if (focusNode) focusNode.focus();
    else {
      card.tabIndex = -1;
      card.focus();
    }
  }

  function openDetail(kind, row) {
    var found = kind === "record" ? findVisit(row) : offeringData(row);
    if (!found) return;
    var card = el("section", "");
    card.setAttribute("aria-labelledby", "modal-title");
    card.appendChild(photo(found.spot.id, found.spot.name, "modal-photo"));
    var title = el("h2", "", found.offering.title);
    title.id = "modal-title";
    card.appendChild(title);
    card.appendChild(el("p", "subtle", found.spot.area + "・" + seasonLabel(found.offering.season)));
    card.appendChild(el("p", "detail", found.offering.detail));
    if (kind === "record") card.appendChild(el("p", "subtle", "この端末に残した季節の記録です。"));
    appendMeta(card, found.offering);
    card.appendChild(button("閉じる", "white-button", closeModal));
    openModal(card, "detail");
  }

  function closeModal() {
    var rootNode = document.getElementById("modal-root");
    if (!rootNode || !rootNode.childElementCount) return;
    rootNode.replaceChildren();
    document.getElementById("phone").inert = false;
    document.querySelector(".topbar").inert = false;
    document.getElementById("app").inert = false;
    document.getElementById("notice-button").setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function closeNotice() {
    var panel = document.getElementById("notice-panel");
    var open = document.querySelector(".modal-back");
    if (panel) {
      panel.hidden = true;
      panel.replaceChildren();
    }
    if (open && open.dataset.kind === "notice") closeModal();
    else document.getElementById("notice-button").setAttribute("aria-expanded", "false");
  }

  function toggleNotice() {
    var open = document.querySelector(".modal-back");
    if (open && open.dataset.kind === "notice") {
      closeModal();
      return;
    }
    var card = el("section", "notice-card");
    card.setAttribute("aria-labelledby", "notice-title");
    if (state.saved && state.saved.season === state.season && !state.noticeSeen) {
      var heading = el("h3", "", "約束の季節になりました");
      heading.id = "notice-title";
      card.appendChild(heading);
      var found = offeringData(state.saved);
      card.appendChild(el("p", "subtle", found ? found.offering.title + "が、いまの候補です。" : "残した1枚を確認してください。"));
      card.appendChild(button("確認する", "white-button", function () {
        state.noticeSeen = true;
        persist();
        go("favorites");
      }));
    } else if (state.saved) {
      var saved = offeringData(state.saved);
      var savedHeading = el("h3", "", seasonLabel(state.saved.season) + "に開くと表示します");
      savedHeading.id = "notice-title";
      card.appendChild(savedHeading);
      card.appendChild(el("p", "subtle", saved ? saved.offering.title : "残した1枚"));
      card.appendChild(button("お気に入りを見る", "white-button", function () { go("favorites"); }));
    } else {
      var emptyHeading = el("h3", "", "お知らせ");
      emptyHeading.id = "notice-title";
      card.appendChild(emptyHeading);
      card.appendChild(el("p", "subtle", "いま届いているお知らせはありません。"));
      card.appendChild(button("閉じる", "white-button", closeModal));
    }
    openModal(card, "notice");
  }

  function syncNotice() {
    var trigger = document.getElementById("notice-button");
    trigger.classList.toggle("has-notice", !!(state.saved && state.saved.season === state.season && !state.noticeSeen));
  }

  var screens = {
    home: renderHome,
    memories: renderMemories,
    discover: renderDiscover,
    favorites: renderFavorites,
    cards: renderCards
  };

  var navFor = { home: "home", memories: "memories", discover: "discover", favorites: "favorites", cards: "discover" };

  function route() {
    var name = (location.hash || "#/home").replace("#/", "");
    return screens[name] ? name : "home";
  }

  function draw() {
    closeModal();
    closeNotice();
    var current = route();
    document.getElementById("app").replaceChildren(screens[current]());
    document.querySelectorAll(".bottom-nav button").forEach(function (node) {
      if (node.dataset.route === navFor[current]) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    syncNotice();
  }

  function start() {
    resetDraft();
    document.getElementById("nav").addEventListener("click", function (event) {
      var target = event.target.closest("button[data-route]");
      if (target) go(target.dataset.route);
    });
    document.getElementById("notice-button").addEventListener("click", toggleNotice);
    document.querySelector(".topbar").addEventListener("click", function (event) {
      if (event.target.closest("#notice-button")) return;
      var open = document.querySelector(".modal-back");
      if (open && open.dataset.kind === "notice") closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    root.addEventListener("hashchange", draw);
    if (!location.hash) location.hash = "#/home";
    draw();
  }

  root.addEventListener("DOMContentLoaded", start);
})(typeof globalThis !== "undefined" ? globalThis : this);
