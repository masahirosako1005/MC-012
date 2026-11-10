/* MataTabi v007 の画面。検証済みの文字列だけを textContent で出す。 */
(function (root) {
  "use strict";

  var catalog = root.TsudukiCatalog;
  var engine = root.TsudukiEngine;
  var store = root.TsudukiStore;
  var i18n = root.MataTabiI18n;
  var recommender = root.MataTabiRecommendation;
  var sampleLoader = root.MataTabiSampleData;
  var reviewApi = root.MataTabiReviews;
  var noticeApi = root.MataTabiNotices;
  var deviceEvents = root.MataTabiDeviceEvents;
  var state = store.load(catalog);
  if (root.MataTabiDeviceKey) root.MataTabiDeviceKey.ensure();
  var publishedNotices = (catalog.notices || []).slice();
  var sampleData = null;
  var sampleStatus = "loading";
  var draft = [];
  var chosen = 0;
  var memoryNote = "";
  var lastFocus = null;
  var planDraft = null;
  var planOriginal = null;
  var planEditNote = "";

  function suggestions() {
    return engine.listSuggestions(catalog, state.history, state.mode, state.season);
  }

  function isDismissedRevisit(row) {
    var dismissed = Array.isArray(state.dismissedRevisits) ? state.dismissedRevisits : [];
    return dismissed.some(function (item) {
      return item.spotId === row.spotId && item.season === row.season && item.reason === row.reason;
    });
  }

  function recommendations() {
    return recommender.recommend(catalog, state, sampleData).filter(function (row) {
      return !isDismissedRevisit(row);
    });
  }

  function dismissRevisit(row) {
    if (!Array.isArray(state.dismissedRevisits)) state.dismissedRevisits = [];
    var exists = state.dismissedRevisits.some(function (item) {
      return item.spotId === row.spotId && item.season === row.season && item.reason === row.reason;
    });
    if (!exists) {
      state.dismissedRevisits.push({
        spotId: row.spotId,
        season: row.season,
        reason: row.reason
      });
    }
    if (state.savedPlan) {
      state.savedPlan.items = state.savedPlan.items.filter(function (item) {
        return !(item.spotId === row.spotId && item.season === row.season && item.reason === row.reason);
      });
      if (!state.savedPlan.items.length) state.savedPlan = null;
    }
    if (planDraft) {
      planDraft.items = planDraft.items.filter(function (item) {
        return !(item.spotId === row.spotId && item.season === row.season && item.reason === row.reason);
      });
      if (!planDraft.items.length) {
        planDraft = null;
        planOriginal = null;
      }
    }
    if (planOriginal) {
      planOriginal.items = planOriginal.items.filter(function (item) {
        return !(item.spotId === row.spotId && item.season === row.season && item.reason === row.reason);
      });
    }
    persist();
  }

  /* 季節ごとに、異なる場所を2～3か所ずつ1つの再訪プランへまとめる。 */
  function recommendationPlans(maxPlans) {
    var rows = recommendations();
    var bySeason = {};
    var seasonOrder = [];
    var plans = [];
    rows.forEach(function (row) {
      if (!bySeason[row.season]) {
        bySeason[row.season] = [];
        seasonOrder.push(row.season);
      }
      var plan = bySeason[row.season];
      var exists = plan.some(function (item) { return item.spotId === row.spotId; });
      if (!exists && plan.length < 3) plan.push(row);
    });
    seasonOrder.forEach(function (season) {
      if (plans.length < maxPlans && bySeason[season].length >= 2) {
        plans.push(bySeason[season]);
      }
    });
    return plans;
  }

  function clonePlanRows(rows) {
    return rows.map(function (row) {
      return {
        spotId: row.spotId,
        season: row.season,
        reason: row.reason,
        reasons: Array.isArray(row.reasons) ? row.reasons.slice(0, 2) : []
      };
    });
  }

  function startPlanEdit(rows) {
    planDraft = {
      season: rows[0].season,
      items: clonePlanRows(rows)
    };
    planOriginal = {
      season: planDraft.season,
      items: clonePlanRows(planDraft.items)
    };
    planEditNote = "";
    go("discover");
  }

  function persist() { store.save(state); }

  function t(key, vars) {
    return i18n.text(state.language, key, vars);
  }

  function applyChrome() {
    var lang = i18n.languageById(state.language);
    document.documentElement.lang = lang.htmlLang;
    document.body.style.fontFamily = lang.font;
    document.getElementById("language-button").textContent = t("language.select");
    document.getElementById("nav").setAttribute("aria-label", t("nav.main"));
    document.querySelectorAll(".bottom-nav button[data-route]").forEach(function (node) {
      var label = node.querySelector("span");
      if (label) label.textContent = t("nav." + node.dataset.route);
    });
  }

  function setLanguage(id) {
    if (i18n.ids.indexOf(id) < 0) return;
    state.language = id;
    persist();
    closeModal();
    draw(true);
  }

  function openLanguageModal() {
    var card = el("section", "");
    card.setAttribute("aria-labelledby", "modal-title");
    var title = el("h2", "", t("language.title"));
    title.id = "modal-title";
    card.appendChild(title);
    var grid = el("div", "choice-grid");
    i18n.languages.forEach(function (lang) {
      var choice = button(lang.choice, "", function () {
        setLanguage(lang.id);
      }, state.language === lang.id);
      choice.lang = lang.htmlLang;
      grid.appendChild(choice);
    });
    card.appendChild(grid);
    card.appendChild(button(t("close"), "white-button", closeModal));
    openModal(card, "detail");
    document.getElementById("language-button").setAttribute("aria-expanded", "true");
  }

  function track(type, row) {
    if (!row) return;
    store.addAction(state, {
      type: type,
      spotId: row.spotId,
      season: row.season,
      reason: row.reason
    });
    persist();
  }

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
    return t("season." + id);
  }

  function reasonLabel(id, short) {
    return t((short ? "reason." + id + "Short" : "reason." + id));
  }

  function spotName(spot) {
    return t("spot." + spot.id + ".name") || spot.name;
  }

  function spotArea(spot) {
    return t("spot." + spot.id + ".area") || spot.area;
  }

  function offeringText(spot, offering, field) {
    if (!spot || !offering) return "";
    return t("offering." + spot.id + "." + offering.season + "." + field) || offering[field] || "";
  }

  function noticeText(item, field) {
    if (!item) return "";
    return t("notice." + item.id + "." + field) || item[field] || "";
  }

  function formatReason(reason) {
    if (!reason) return "";
    if (typeof reason === "string") return reason;
    if (reason.key === "diffSeason") return t("rec.diffSeason", { season: seasonLabel(reason.season) });
    if (reason.key === "interest") return t("rec.interest", { interest: t("pref.interest." + reason.interest) });
    return t("rec." + reason.key);
  }

  function go(name) {
    if ((location.hash || "#/home") === "#/" + name) draw(true);
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

  function burdenRows(spot, offering) {
    var rows = [
      [t("meta.reason"), reasonLabel(offering.reason)],
      [t("meta.minutes"), t("meta.minutesValue", { n: offering.minutes })],
      [t("meta.access"), offeringText(spot, offering, "access")],
      [t("meta.steps"), offeringText(spot, offering, "steps")],
      [t("meta.rest"), offeringText(spot, offering, "rest")],
      [t("meta.crowd"), offeringText(spot, offering, "crowd")]
    ];
    var food = offeringText(spot, offering, "food");
    var event = offeringText(spot, offering, "event");
    if (food) rows.push([t("meta.food"), food]);
    if (event) rows.push([t("meta.event"), event]);
    return rows;
  }

  function appendMeta(parent, spot, offering) {
    var meta = el("div", "meta-grid");
    burdenRows(spot, offering).forEach(function (row) {
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

  function preferenceSummary() {
    var keys = {
      solo: "pref.summary.solo", couple: "pref.summary.couple", family: "pref.summary.family", friends: "pref.summary.friends",
      short: "pref.summary.short", half: "pref.summary.half", full: "pref.summary.full",
      low: "pref.summary.low", medium: "pref.summary.medium", high: "pref.summary.high",
      avoid: "pref.summary.avoid", neutral: "pref.summary.neutral", okay: "pref.summary.okay"
    };
    var prefs = state.preferences || {};
    var parts = [prefs.party, prefs.duration, prefs.mobility, prefs.crowd].filter(function (value) {
      return !!keys[value];
    }).map(function (value) { return t(keys[value]); });
    if (Array.isArray(prefs.interests) && prefs.interests.length) {
      parts.push(t("pref.interestCount", { count: prefs.interests.length }));
    }
    return parts.length ? parts.join("・") : t("pref.empty");
  }

  function renderHome() {
    var view = el("div", "page home-page");

    var continueCard = el("article", "glass home-card");
    continueCard.appendChild(el("h2", "", t("home.continue")));
    continueCard.appendChild(el("p", "subtle", t("home.continueLead")));
    publishedNotices.slice(0, 2).forEach(function (item) {
      continueCard.appendChild(button(noticeText(item, "title"), "white-button", function () {
        openTownNotice(item);
      }));
    });
    if (!publishedNotices.length) {
      continueCard.appendChild(el("p", "subtle", t("notices.empty")));
    }
    continueCard.appendChild(el("p", "data-note", t("home.deviceNote")));
    view.appendChild(continueCard);

    var preferences = el("article", "glass home-card preference-card");
    preferences.appendChild(el("h2", "", t("pref.title")));
    preferences.appendChild(el("p", "subtle", preferenceSummary()));
    preferences.appendChild(button(
      preferenceSummary() === t("pref.empty") ? t("pref.register") : t("pref.change"),
      "white-button",
      function () { go("preferences"); }
    ));
    view.appendChild(preferences);

    var revisit = el("article", "glass home-card revisit-card");
    revisit.appendChild(el("h2", "", t("revisit.title")));
    if (state.savedPlan) {
      revisit.appendChild(revisitPlan(state.savedPlan.items, 0, true));
    } else {
      revisit.appendChild(el("p", "subtle", t("revisit.empty")));
    }
    revisit.appendChild(el("p", "data-note", t("revisit.savedOnly")));
    view.appendChild(revisit);

    var memories = el("article", "glass home-card");
    var memoryRow = el("div", "thumb-row");
    state.history.slice(0, 4).forEach(function (row) {
      var found = findVisit(row);
      if (!found) return;
      var caption = t("memory.caption", { season: seasonLabel(row.season), place: spotName(found.spot) });
      memoryRow.appendChild(thumbButton(found.spot.id, caption, function () {
        openDetail("record", row);
      }));
    });
    if (!memoryRow.childElementCount) {
      memoryRow.appendChild(el("p", "subtle", t("memory.none")));
    }
    memories.appendChild(memoryRow);
    memories.appendChild(button(t("memory.review"), "white-button", function () { go("memories"); }));
    view.appendChild(memories);

    var discover = el("article", "glass home-card");
    var discoverRow = el("div", "thumb-row");
    suggestions().slice(0, 4).forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      var caption = offeringText(found.spot, found.offering, "event") || offeringText(found.spot, found.offering, "title");
      discoverRow.appendChild(thumbButton(found.spot.id, caption, function () {
        openDetail("candidate", row);
      }));
    });
    if (!discoverRow.childElementCount) {
      discoverRow.appendChild(el("p", "subtle", t("discover.none")));
    }
    discover.appendChild(discoverRow);
    discover.appendChild(button(t("discover.find"), "white-button", function () { go("discover"); }));
    view.appendChild(discover);
    return view;
  }

  function summaryButton(found, caption, detail, onClick) {
    var node = button("", "summary", onClick);
    node.appendChild(photo(found.spot.id, spotName(found.spot)));
    var copy = el("span", "summary-copy");
    copy.appendChild(el("strong", "", caption));
    if (detail) copy.appendChild(el("span", "", detail));
    node.appendChild(copy);
    return node;
  }

  function revisitPlan(rows, index, saved) {
    var plan = el("section", "revisit-plan");
    plan.appendChild(el("h3", "", saved ?
      t("revisit.savedPlan", { season: seasonLabel(rows[0].season) }) :
      t("revisit.planN", { season: seasonLabel(rows[0].season), n: index + 1 })));
    var places = el("div", "revisit-place-grid");
    rows.forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      places.appendChild(thumbButton(
        found.spot.id,
        t("memory.caption", { season: seasonLabel(row.season), place: spotName(found.spot) }),
        function () { openDetail("recommendation", row); }
      ));
    });
    plan.appendChild(places);
    plan.appendChild(button(saved ? t("revisit.editSaved") : t("revisit.editChoose"), "white-button plan-edit-button", function () {
      startPlanEdit(rows);
    }));
    return plan;
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
    modes.appendChild(button(t("mode.onsite"), "", function () { setMode("onsite"); }, state.mode === "onsite"));
    modes.appendChild(button(t("mode.after"), "", function () { setMode("after"); }, state.mode === "after"));
    parent.appendChild(modes);
    var seasonField = el("div", "field");
    seasonField.appendChild(el("span", "", state.mode === "onsite" ? t("mode.nowSeason") : t("mode.nextSeason")));
    var seasons = el("div", "season-row");
    catalog.seasons.forEach(function (season) {
      seasons.appendChild(button(seasonLabel(season.id), "", function () {
        setSeason(season.id);
      }, state.season === season.id));
    });
    seasonField.appendChild(seasons);
    parent.appendChild(seasonField);
  }

  function preferenceChoices(parent, title, key, options, multiple) {
    var section = el("section", "glass panel preference-section");
    section.appendChild(el("h3", "", title));
    var grid = el("div", "choice-grid");
    options.forEach(function (option) {
      var selected = multiple ?
        state.preferences[key].indexOf(option.value) >= 0 :
        state.preferences[key] === option.value;
      grid.appendChild(button(option.label, "", function () {
        if (multiple) {
          var current = state.preferences[key].slice();
          var index = current.indexOf(option.value);
          if (index >= 0) current.splice(index, 1);
          else if (current.length < 4) current.push(option.value);
          state.preferences[key] = current;
        } else {
          state.preferences[key] = option.value;
        }
        persist();
        draw();
      }, selected));
    });
    section.appendChild(grid);
    parent.appendChild(section);
  }

  function renderPreferences() {
    var view = el("div", "page preferences-page");
    view.appendChild(el("h2", "page-title", t("pref.pageTitle")));
    view.appendChild(el("p", "subtle", t("pref.lead")));
    preferenceChoices(view, t("pref.party"), "party", [
      { value: "solo", label: t("pref.solo") },
      { value: "couple", label: t("pref.couple") },
      { value: "family", label: t("pref.family") },
      { value: "friends", label: t("pref.friends") }
    ], false);
    preferenceChoices(view, t("pref.duration"), "duration", [
      { value: "short", label: t("pref.short") },
      { value: "half", label: t("pref.half") },
      { value: "full", label: t("pref.full") }
    ], false);
    preferenceChoices(view, t("pref.mobility"), "mobility", [
      { value: "low", label: t("pref.low") },
      { value: "medium", label: t("pref.medium") },
      { value: "high", label: t("pref.high") }
    ], false);
    preferenceChoices(view, t("pref.interests"), "interests", [
      { value: "scenery", label: t("pref.interest.scenery") },
      { value: "food", label: t("pref.interest.food") },
      { value: "people", label: t("pref.interest.people") },
      { value: "events", label: t("pref.interest.events") },
      { value: "history", label: t("pref.interest.history") },
      { value: "nature", label: t("pref.interest.nature") }
    ], true);
    preferenceChoices(view, t("pref.crowd"), "crowd", [
      { value: "avoid", label: t("pref.avoid") },
      { value: "neutral", label: t("pref.neutralCrowd") },
      { value: "okay", label: t("pref.okay") }
    ], false);
    view.appendChild(button(t("pref.save"), "white-button", function () { go("discover"); }));
    view.appendChild(button(t("pref.clear"), "text-button preference-clear", function () {
      state.preferences = store.defaultPreferences();
      persist();
      draw();
    }));
    return view;
  }

  function renderMemories() {
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", t("memory.title")));
    view.appendChild(el("p", "subtle", t("memory.lead")));
    if (memoryNote) view.appendChild(el("p", "subtle", t(memoryNote)));
    var form = el("section", "glass panel");
    var fields = el("div", "select-grid");
    var spotOptions = catalog.spots.map(function (spot) { return { value: spot.id, label: spotName(spot) }; });
    var seasonOptions = catalog.seasons.map(function (season) { return { value: season.id, label: seasonLabel(season.id) }; });
    var newSpot = spotOptions[0].value;
    var newSeason = seasonOptions[0].value;
    fields.appendChild(selectFor(t("memory.season"), seasonOptions, newSeason, function (value) { newSeason = value; }));
    fields.appendChild(selectFor(t("memory.place"), spotOptions, newSpot, function (value) { newSpot = value; }));
    form.appendChild(fields);
    form.appendChild(button(t("memory.save"), "white-button", function () {
      var exists = state.history.some(function (row) {
        return row.spotId === newSpot && row.season === newSeason;
      });
      var added = null;
      if (exists) {
        memoryNote = "memory.duplicate";
      } else {
        memoryNote = "";
        var newVisit = findVisit({ spotId: newSpot, season: newSeason });
        var reason = newVisit ? newVisit.offering.reason : "season";
        added = {
          spotId: newSpot,
          season: newSeason,
          reason: reason,
          visitedAt: new Date().toISOString().slice(0, 10),
          satisfaction: 0,
          revisitIntent: false,
          comment: ""
        };
        state.history.push(added);
        track("visit", { spotId: newSpot, season: newSeason, reason: reason });
        if (deviceEvents) deviceEvents.visit(added, state.history);
        resetDraft();
        persist();
      }
      draw();
      if (added) openDetail("record", added);
    }));
    view.appendChild(form);
    state.history.forEach(function (row, index) {
      var found = findVisit(row);
      if (!found) return;
      var line = el("div", "history-row");
      line.appendChild(summaryButton(
        found,
        t("memory.visitLabel", { season: seasonLabel(row.season), place: spotName(found.spot) }),
        offeringText(found.spot, found.offering, "title"),
        function () { openDetail("record", row); }
      ));
      var removeButton = button("★", "memory-star", function () {
        state.history.splice(index, 1);
        resetDraft();
        persist();
        draw();
      });
      removeButton.setAttribute("aria-label", t("memory.removeAria", {
        season: seasonLabel(row.season),
        place: spotName(found.spot)
      }));
      line.appendChild(removeButton);
      view.appendChild(line);
    });
    return view;
  }

  function renderDiscover() {
    var rows = suggestions().filter(function (row) {
      return row.season === state.season;
    });
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", state.mode === "onsite" ? t("discover.planTitle") : t("discover.candidateTitle")));
    view.appendChild(el("p", "subtle", t("discover.lead")));
    var controls = el("section", "glass panel");
    modeAndSeason(controls);
    view.appendChild(controls);

    if (planEditNote) view.appendChild(el("section", "glass panel", t(planEditNote)));
    if (planDraft) view.appendChild(renderPlanEdit());

    var revisitPlans = state.mode === "onsite" ? [] : recommendationPlans(3);
    if (revisitPlans.length) {
      var revisitSection = el("section", "glass panel recommendation-section");
      revisitSection.appendChild(el("h3", "", t("revisit.title")));
      revisitPlans.forEach(function (plan, index) {
        revisitSection.appendChild(revisitPlan(plan, index, false));
      });
      revisitSection.appendChild(el("p", "data-note", sampleStatus === "ready" ?
        t("discover.sample") :
        t("discover.localOnly")));
      view.appendChild(revisitSection);
    }

    view.appendChild(el("h3", "list-title", t("discover.other")));
    if (!rows.length) {
      view.appendChild(el("section", "glass panel empty", t("discover.none")));
    }
    rows.forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      var eventName = offeringText(found.spot, found.offering, "event");
      view.appendChild(summaryButton(
        found,
        offeringText(found.spot, found.offering, "title"),
        spotArea(found.spot) + (eventName ? "・" + eventName : ""),
        function () { openDetail("candidate", row); }
      ));
    });
    view.appendChild(button(t("discover.pickOne"), "white-button", function () { go("cards"); }));
    return view;
  }

  function planCandidates(season, items) {
    var selected = {};
    var used = {};
    var rows = [];
    items.forEach(function (row) { selected[row.spotId] = true; });
    function add(row) {
      if (!row || row.season !== season || selected[row.spotId] || used[row.spotId] || isDismissedRevisit(row)) return;
      used[row.spotId] = true;
      rows.push(row);
    }
    recommendations().forEach(add);
    catalog.spots.forEach(function (spot) {
      var offering = spot.offerings.filter(function (item) { return item.season === season; })[0];
      if (offering) add({
        spotId: spot.id,
        season: season,
        reason: offering.reason,
        reasons: []
      });
    });
    return rows;
  }

  function renderPlanEdit() {
    if (!planDraft && state.savedPlan) {
      planDraft = {
        season: state.savedPlan.season,
        items: clonePlanRows(state.savedPlan.items)
      };
      planOriginal = {
        season: planDraft.season,
        items: clonePlanRows(planDraft.items)
      };
    }
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", t("plan.editTitle")));
    if (!planDraft || planDraft.items.length < 1) {
      view.appendChild(el("section", "glass panel empty", t("plan.empty")));
      view.appendChild(button(t("plan.home"), "white-button", function () { go("home"); }));
      return view;
    }

    view.appendChild(el("p", "subtle", t("plan.freePick", { season: seasonLabel(planDraft.season) })));
    var selectedPanel = el("section", "glass panel plan-editor");
    selectedPanel.appendChild(el("h3", "", t("plan.selected")));
    planDraft.items.forEach(function (row, index) {
      var found = offeringData(row);
      if (!found) return;
      var line = el("div", "plan-edit-row");
      line.appendChild(summaryButton(
        found,
        spotName(found.spot),
        offeringText(found.spot, found.offering, "title"),
        function () { openDetail("recommendation", row); }
      ));
      var remove = button(t("plan.remove"), "text-button", function () {
        planDraft.items.splice(index, 1);
        draw();
      });
      remove.disabled = planDraft.items.length <= 1;
      if (remove.disabled) remove.setAttribute("aria-label", t("plan.removeDisabled"));
      line.appendChild(remove);
      selectedPanel.appendChild(line);
    });
    selectedPanel.appendChild(el("p", "data-note", t("plan.note")));
    view.appendChild(selectedPanel);

    var addPanel = el("section", "glass panel plan-editor");
    addPanel.appendChild(el("h3", "", t("plan.add")));
    var candidates = el("div", "plan-candidate-grid");
    planCandidates(planDraft.season, planDraft.items).forEach(function (row) {
      var found = offeringData(row);
      if (!found) return;
      candidates.appendChild(thumbButton(found.spot.id, t("plan.addPrefix", { place: spotName(found.spot) }), function () {
        planDraft.items.push(clonePlanRows([row])[0]);
        draw();
      }));
    });
    if (candidates.childElementCount) {
      addPanel.appendChild(candidates);
    } else {
      addPanel.appendChild(el("p", "subtle", t("plan.allSelected")));
    }
    view.appendChild(addPanel);

    view.appendChild(button(t("plan.save"), "white-button", function () {
      state.savedPlan = {
        season: planDraft.season,
        items: clonePlanRows(planDraft.items).map(function (row) {
          return { spotId: row.spotId, season: row.season, reason: row.reason };
        })
      };
      state.savedPlan.items.forEach(function (row) { store.addAction(state, {
        type: "save",
        spotId: row.spotId,
        season: row.season,
        reason: row.reason
      }); });
      if (deviceEvents) deviceEvents.plan(state.savedPlan.season, state.savedPlan.items);
      persist();
      planDraft = null;
      planOriginal = null;
      planEditNote = "plan.saved";
      go("discover");
    }));
    view.appendChild(button(t("plan.reset"), "text-button plan-secondary-button", function () {
      if (!planOriginal) return;
      planDraft = {
        season: planOriginal.season,
        items: clonePlanRows(planOriginal.items)
      };
      draw();
    }));
    view.appendChild(button(t("plan.cancel"), "text-button plan-secondary-button", function () {
      planDraft = null;
      planOriginal = null;
      planEditNote = "";
      go("discover");
    }));
    return view;
  }

  function openTownNotice(item) {
    if (!item) return;
    var card = el("section", "");
    card.setAttribute("aria-labelledby", "modal-title");
    var found = findVisit({ spotId: item.spotId, season: item.season });
    if (found) card.appendChild(photo(found.spot.id, spotName(found.spot), "modal-photo"));
    var title = el("h2", "", noticeText(item, "title"));
    title.id = "modal-title";
    card.appendChild(title);
    card.appendChild(el("p", "subtle", seasonLabel(item.season) + (found ? "・" + spotArea(found.spot) : "")));
    card.appendChild(el("p", "detail", noticeText(item, "body")));
    card.appendChild(button(t("close"), "white-button", closeModal));
    if (deviceEvents && item.id) deviceEvents.notice(item.id);
    openModal(card, "detail");
  }

  function renderNotices() {
    if (state.saved && state.saved.season === state.season && !state.noticeSeen) {
      state.noticeSeen = true;
      persist();
    }
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", t("notices.title")));
    view.appendChild(el("p", "subtle", t("notices.lead")));
    var groups = [
      { id: "menu", label: t("notices.menu") },
      { id: "local", label: t("notices.local") },
      { id: "event", label: t("notices.event") }
    ];
    groups.forEach(function (group) {
      var section = el("section", "glass panel notice-section");
      section.appendChild(el("h3", "", group.label));
      var items = (publishedNotices || []).filter(function (item) {
        return item.category === group.id && engine.seasonById(catalog, item.season);
      }).sort(function (a, b) {
        if ((b.season === state.season) !== (a.season === state.season)) return b.season === state.season ? 1 : -1;
        return 0;
      });
      if (!items.length) {
        section.appendChild(el("p", "subtle", t("notices.empty")));
      }
      items.forEach(function (item) {
        var found = findVisit({ spotId: item.spotId, season: item.season });
        if (found) {
          section.appendChild(summaryButton(
            found,
            noticeText(item, "title"),
            t("memory.caption", { season: seasonLabel(item.season), place: spotName(found.spot) }),
            function () { openTownNotice(item); }
          ));
        } else {
          var line = button("", "summary notice-text-card", function () { openTownNotice(item); });
          var copy = el("span", "summary-copy");
          copy.appendChild(el("strong", "", noticeText(item, "title")));
          copy.appendChild(el("span", "", seasonLabel(item.season)));
          line.appendChild(copy);
          section.appendChild(line);
        }
      });
      view.appendChild(section);
    });
    return view;
  }

  function renderCards() {
    refreshDraft();
    var view = el("div", "page");
    view.appendChild(el("h2", "page-title", t("cards.title")));
    view.appendChild(el("p", "subtle", t("cards.lead")));
    if (!draft.length) {
      view.appendChild(el("section", "glass panel empty", t("cards.none")));
      return view;
    }
    draft.forEach(function (row, index) {
      var found = offeringData(row);
      var card = el("article", "glass edit-card" + (index === chosen ? " is-chosen" : ""));
      card.appendChild(button(index === chosen ? t("cards.keep") : t("cards.choose"), "white-button", function () {
        chosen = index;
        draw();
      }, index === chosen));
      var selects = el("div", "select-grid");
      var reasonOptions = catalog.reasons.map(function (reason) {
        return {
          value: reason.id,
          label: reasonLabel(reason.id, true),
          disabled: !suggestions().some(function (item) { return item.reason === reason.id; })
        };
      });
      selects.appendChild(selectFor(t("cards.reason"), reasonOptions, row.reason, function (value) {
        var next = engine.retarget(catalog, suggestions(), row.spotId, value);
        if (next) {
          draft[index] = next;
          draw();
        }
      }));
      var spotOptions = engine.spotsForReason(catalog, suggestions(), row.reason).map(function (spot) {
        return { value: spot.id, label: spotName(spot) };
      });
      selects.appendChild(selectFor(t("cards.place"), spotOptions, row.spotId, function (value) {
        var next = engine.retarget(catalog, suggestions(), value, row.reason);
        if (next) {
          draft[index] = next;
          draw();
        }
      }));
      card.appendChild(selects);
      if (found) {
        card.appendChild(el("h3", "", offeringText(found.spot, found.offering, "title")));
        card.appendChild(el("p", "subtle", t("cards.minutes", { area: spotArea(found.spot), n: found.offering.minutes })));
        card.appendChild(el("p", "detail", offeringText(found.spot, found.offering, "detail")));
      }
      view.appendChild(card);
    });
    view.appendChild(button(t("cards.save"), "white-button", function () {
      state.saved = {
        spotId: draft[chosen].spotId,
        season: draft[chosen].season,
        reason: draft[chosen].reason
      };
      state.noticeSeen = false;
      track("save", state.saved);
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
    document.querySelector(".topbar").inert = true;
    card.tabIndex = -1;
    card.focus({ preventScroll: true });
    back.scrollTop = 0;
    card.scrollTop = 0;
  }

  function appendVisitFeedback(card, row) {
    var feedback = el("section", "feedback");
    feedback.appendChild(el("h3", "", t("feedback.title")));
    feedback.appendChild(el("p", "subtle", t("feedback.satisfaction")));
    var rating = el("div", "feedback-grid rating-grid");
    [1, 2, 3, 4, 5].forEach(function (value) {
      var choice = button(String(value), "", function () {
        row.satisfaction = value;
        persist();
        if (deviceEvents) deviceEvents.visit(row, state.history);
        rating.querySelectorAll("button").forEach(function (node, index) {
          node.classList.toggle("is-selected", index + 1 === value);
        });
      }, row.satisfaction === value);
      choice.setAttribute("aria-label", t("feedback.satisfactionAria", { n: value }));
      rating.appendChild(choice);
    });
    feedback.appendChild(rating);
    feedback.appendChild(el("p", "subtle", t("feedback.revisitQ")));
    var intent = el("div", "feedback-grid");
    var yes = button(t("feedback.yes"), "", function () {
      row.revisitIntent = true;
      persist();
      if (deviceEvents) deviceEvents.visit(row, state.history);
      yes.classList.add("is-selected");
      no.classList.remove("is-selected");
    }, row.revisitIntent === true);
    var no = button(t("feedback.no"), "", function () {
      row.revisitIntent = false;
      persist();
      if (deviceEvents) deviceEvents.visit(row, state.history);
      no.classList.add("is-selected");
      yes.classList.remove("is-selected");
    }, row.revisitIntent !== true);
    intent.appendChild(yes);
    intent.appendChild(no);
    feedback.appendChild(intent);
    feedback.appendChild(el("p", "subtle", t("feedback.comment")));
    var area = document.createElement("textarea");
    area.className = "comment-box";
    area.rows = 3;
    area.maxLength = 200;
    area.value = row.comment || "";
    area.setAttribute("aria-label", t("feedback.commentAria"));
    feedback.appendChild(area);
    var status = el("p", "data-note", t("feedback.note"));
    feedback.appendChild(button(t("feedback.saveLocal"), "white-button", function () {
      row.comment = store.sanitizeComment(area.value);
      area.value = row.comment;
      persist();
      status.textContent = t("feedback.savedLocal");
    }));
    feedback.appendChild(button(t("feedback.publish"), "white-button", function () {
      row.comment = store.sanitizeComment(area.value);
      area.value = row.comment;
      persist();
      if (!row.comment || !(row.satisfaction >= 1 && row.satisfaction <= 5)) {
        status.textContent = t("feedback.needBoth");
        return;
      }
      reviewApi.publish({
        spotId: row.spotId,
        season: row.season,
        satisfaction: row.satisfaction,
        revisitIntent: row.revisitIntent === true,
        comment: row.comment
      }).then(function () {
        status.textContent = t("feedback.published");
        refreshPublicReviews(card, row.spotId, row.season);
      }).catch(function () {
        status.textContent = t("feedback.needServer");
      });
    }));
    feedback.appendChild(status);
    card.appendChild(feedback);
  }

  function refreshPublicReviews(card, spotId, season) {
    var list = card.querySelector(".review-list");
    if (!list) return;
    reviewApi.list(spotId, season).then(function (rows) {
      list.replaceChildren();
      if (!rows.length) {
        list.appendChild(el("p", "subtle", t("reviews.empty")));
        return;
      }
      rows.forEach(function (item) {
        var article = el("article", "review-item");
        article.appendChild(el("p", "subtle", t(item.revisitIntent ? "reviews.metaYes" : "reviews.metaNo", { n: item.satisfaction })));
        article.appendChild(el("p", "detail", item.body));
        list.appendChild(article);
      });
    }).catch(function () {
      list.replaceChildren();
      list.appendChild(el("p", "subtle", t("reviews.offline")));
    });
  }

  function appendPublicReviews(card, spotId, season) {
    var box = el("section", "feedback public-reviews");
    box.appendChild(el("h3", "", t("reviews.title")));
    box.appendChild(el("p", "data-note", t("reviews.note")));
    var list = el("div", "review-list");
    list.appendChild(el("p", "subtle", t("reviews.loading")));
    box.appendChild(list);
    card.appendChild(box);
    refreshPublicReviews(card, spotId, season);
  }

  function openDetail(kind, row) {
    var found = kind === "record" ? findVisit(row) : offeringData(row);
    if (!found) return;
    if (kind !== "record") track("view", row);
    var card = el("section", "");
    card.setAttribute("aria-labelledby", "modal-title");
    card.appendChild(photo(found.spot.id, spotName(found.spot), "modal-photo"));
    var title = el("h2", "", offeringText(found.spot, found.offering, "title"));
    title.id = "modal-title";
    card.appendChild(title);
    card.appendChild(el("p", "subtle", t("detail.areaSeason", {
      area: spotArea(found.spot),
      season: seasonLabel(found.offering.season)
    })));
    card.appendChild(el("p", "detail", offeringText(found.spot, found.offering, "detail")));
    if (kind === "record") {
      card.appendChild(el("p", "subtle", row.visitedAt ? t("detail.recordDate", { date: row.visitedAt }) : t("detail.recordNoDate")));
    }
    if (Array.isArray(row.reasons) && row.reasons.length) {
      var reasonBox = el("section", "recommendation-reasons");
      reasonBox.appendChild(el("strong", "", t("detail.reasons")));
      row.reasons.forEach(function (reason) {
        reasonBox.appendChild(el("p", "", formatReason(reason)));
      });
      card.appendChild(reasonBox);
    }
    appendMeta(card, found.spot, found.offering);
    appendPublicReviews(card, found.spot.id, found.offering.season);
    if (kind === "record") appendVisitFeedback(card, row);
    else {
      card.appendChild(button(t("detail.dismiss"), "text-button dismiss-button", function () {
        track("dismiss", row);
        if (deviceEvents) deviceEvents.dismiss(row);
        if (kind === "recommendation") dismissRevisit(row);
        closeModal();
        if (kind === "recommendation") draw();
      }));
    }
    card.appendChild(button(t("close"), "white-button", closeModal));
    openModal(card, "detail");
  }

  function closeModal() {
    var rootNode = document.getElementById("modal-root");
    if (!rootNode || !rootNode.childElementCount) return;
    rootNode.replaceChildren();
    document.getElementById("phone").inert = false;
    document.querySelector(".topbar").inert = false;
    document.getElementById("app").inert = false;
    document.getElementById("language-button").setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function closeNotice() {
    var open = document.querySelector(".modal-back");
    if (open && open.dataset.kind === "notice") closeModal();
  }

  function syncNotice() {
    var trigger = document.querySelector(".bottom-nav button[data-route=\"notices\"]");
    if (trigger) {
      trigger.classList.toggle("has-notice", !!(state.saved && state.saved.season === state.season && !state.noticeSeen));
    }
  }

  var screens = {
    home: renderHome,
    memories: renderMemories,
    discover: renderDiscover,
    notices: renderNotices,
    favorites: renderNotices,
    cards: renderCards,
    preferences: renderPreferences
  };

  var navFor = {
    home: "home",
    memories: "memories",
    discover: "discover",
    notices: "notices",
    favorites: "notices",
    cards: "discover",
    preferences: "home"
  };

  function route() {
    var name = (location.hash || "#/home").replace("#/", "");
    return screens[name] ? name : "home";
  }

  function draw(scrollTop) {
    closeModal();
    closeNotice();
    applyChrome();
    var current = route();
    document.getElementById("app").replaceChildren(screens[current]());
    document.querySelectorAll(".bottom-nav button").forEach(function (node) {
      if (node.dataset.route === navFor[current]) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    });
    syncNotice();
    if (scrollTop) root.scrollTo(0, 0);
    if (current === "notices") refreshNotices();
  }

  function start() {
    resetDraft();
    document.getElementById("nav").addEventListener("click", function (event) {
      var target = event.target.closest("button[data-route]");
      if (target) go(target.dataset.route);
    });
    document.getElementById("language-button").addEventListener("click", openLanguageModal);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });
    root.addEventListener("hashchange", function () { draw(true); });
    if (!location.hash) location.hash = "#/home";
    draw(true);
    sampleLoader.load("data/sample-travelers.json").then(function (data) {
      sampleData = data;
      sampleStatus = data ? "ready" : "fallback";
      if (!document.querySelector(".modal-back")) draw();
    });
    refreshNotices();
  }

  function refreshNotices() {
    if (!noticeApi || typeof noticeApi.list !== "function") return;
    noticeApi.list().then(function (rows) {
      publishedNotices = rows;
      if ((route() === "notices" || route() === "home") && !document.querySelector(".modal-back")) {
        document.getElementById("app").replaceChildren(screens[route()]());
      }
    }).catch(function () {
      if (!publishedNotices.length) publishedNotices = catalog.notices || [];
    });
  }

  root.addEventListener("DOMContentLoaded", start);
})(typeof globalThis !== "undefined" ? globalThis : this);
