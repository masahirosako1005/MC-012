/* このPC向けの管理画面。合言葉はサーバへ送り、画面には出さない。表示は textContent。 */
(function (root) {
  "use strict";

  var catalog = root.TsudukiCatalog;
  var editingId = "";
  var note = "";
  var session = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, onClick) {
    var node = el("button", className || "white-button", text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  function field(label, control) {
    var wrap = el("label", "field");
    wrap.appendChild(el("span", "", label));
    wrap.appendChild(control);
    return wrap;
  }

  function selectBox(options, value) {
    var select = document.createElement("select");
    options.forEach(function (item) {
      var option = el("option", "", item.label);
      option.value = item.value;
      option.selected = item.value === value;
      select.appendChild(option);
    });
    return select;
  }

  function seasonLabel(id) {
    var found = catalog.seasons.filter(function (item) { return item.id === id; })[0];
    return found ? found.label : id;
  }

  function spotName(id) {
    var found = catalog.spots.filter(function (item) { return item.id === id; })[0];
    return found ? found.name : id;
  }

  function categoryLabel(id) {
    return { menu: "名店のメニュー", local: "地元の話題", event: "季節の催し" }[id] || id;
  }

  function statusLabel(id) {
    return { draft: "下書き", published: "発信中", hidden: "停止中" }[id] || id;
  }

  function roleLabel(id) {
    return { all: "ALL", editor: "editor" }[id] || id;
  }

  function aimLabel(id) {
    return {
      next_season: "次の季節の続き",
      add_food: "食を足す",
      add_people: "人の催しを足す",
      how_to_go: "回り方"
    }[id] || id;
  }

  function campaignStatusLabel(id) {
    return { draft: "下書き", running: "実施中", stopped: "停止" }[id] || id;
  }

  function verdictLabel(id) {
    return { up: "増えた", flat: "変わらない", down: "見送りが増えた" }[id] || "未判定";
  }

  function send(url, payload) {
    return root.fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (response.status === 401) {
        session = null;
        throw new Error("auth");
      }
      if (!response.ok) throw new Error("admin: " + response.status);
      return response.json();
    });
  }

  function loadJson(url) {
    return root.fetch(url, { cache: "no-store", credentials: "same-origin" }).then(function (response) {
      if (response.status === 401) {
        session = null;
        throw new Error("auth");
      }
      if (response.status === 403) throw new Error("forbidden");
      if (!response.ok) throw new Error("admin: " + response.status);
      return response.json();
    });
  }

  function isAll() {
    return session && session.role === "all";
  }

  function canManage(item) {
    return !!(item && item.mine);
  }

  function draw() {
    loadJson("/api/admin/session").then(function (data) {
      session = { staffId: data.staffId, role: data.role };
      return loadJson("/api/admin/notices");
    }).then(function (noticeData) {
      var notices = noticeData.notices || [];
      if (!isAll()) {
        renderBoard(notices, []);
        return;
      }
      return Promise.all([
        loadJson("/api/admin/reviews"),
        loadJson("/api/admin/staff"),
        loadJson("/api/admin/campaigns")
      ]).then(function (extra) {
        renderBoard(notices, extra[0].reviews || [], extra[1].staff || [], extra[2].campaigns || [], extra[2].kgiNote || "");
      });
    }).catch(function (error) {
      if (error && error.message === "auth") renderLogin();
      else {
        note = "node serve.js がこのPCで動いているときに開けます。";
        renderLogin();
      }
    });
  }

  function renderLogin() {
    var view = el("div", "page admin-page");
    view.appendChild(el("h2", "page-title", "管理画面に入る"));
    view.appendChild(el("p", "subtle", "観光客アプリにはログインはありません。担当IDと合言葉はこのPCの管理専用です。氏名は使いません。"));
    if (note) view.appendChild(el("p", "data-note", note));
    var panel = el("section", "glass panel admin-editor");
    var staffId = document.createElement("input");
    staffId.type = "text";
    staffId.autocomplete = "username";
    staffId.maxLength = 20;
    staffId.setAttribute("aria-label", "担当ID");
    var password = document.createElement("input");
    password.type = "password";
    password.autocomplete = "current-password";
    password.maxLength = 64;
    password.setAttribute("aria-label", "合言葉");
    panel.appendChild(field("担当ID", staffId));
    panel.appendChild(field("合言葉", password));
    panel.appendChild(button("入る", "white-button", function () {
      send("/api/admin/session", { staffId: staffId.value, password: password.value }).then(function (data) {
        session = { staffId: data.staffId, role: data.role };
        note = "";
        password.value = "";
        draw();
      }).catch(function () {
        note = "担当IDまたは合言葉が違います。";
        password.value = "";
        renderLogin();
      });
    }));
    view.appendChild(panel);
    document.getElementById("app").replaceChildren(view);
    staffId.focus();
  }

  function renderBoard(notices, reviews, staffRows, campaigns, kgiNote) {
    var view = el("div", "page admin-page");
    view.appendChild(el("h2", "page-title", "お知らせの編集と発信"));
    view.appendChild(el("p", "subtle",
      "担当 " + session.staffId + "（" + roleLabel(session.role) + "）。editor は自分の書いたお知らせだけ編集・削除できます。"
    ));
    if (note) view.appendChild(el("p", "data-note", note));
    view.appendChild(button("出る", "text-button", function () {
      send("/api/admin/session", { logout: true }).finally(function () {
        session = null;
        note = "出ました。";
        renderLogin();
      });
    }));
    if (isAll()) view.appendChild(renderCampaigns(campaigns || [], notices, kgiNote || ""));
    view.appendChild(renderForm(notices));
    view.appendChild(renderNoticeList(notices));
    if (isAll()) {
      view.appendChild(renderReviewList(reviews || []));
      view.appendChild(renderStaffList(staffRows || []));
    }
    document.getElementById("app").replaceChildren(view);
  }

  function currentNotice(notices) {
    return notices.filter(function (item) { return item.id === editingId; })[0] || null;
  }

  function renderForm(notices) {
    var current = currentNotice(notices);
    if (current && !canManage(current)) {
      editingId = "";
      current = null;
    }
    var panel = el("section", "glass panel admin-editor");
    panel.appendChild(el("h3", "", current ? "お知らせを編集" : "新しいお知らせ"));
    var title = document.createElement("input");
    title.type = "text";
    title.maxLength = 80;
    title.value = current ? current.title : "";
    title.setAttribute("aria-label", "題名");
    panel.appendChild(field("題名", title));

    var body = document.createElement("textarea");
    body.className = "comment-box";
    body.rows = 5;
    body.maxLength = 500;
    body.value = current ? current.body : "";
    body.setAttribute("aria-label", "本文");
    panel.appendChild(field("本文", body));

    var category = selectBox([
      { value: "menu", label: "名店のメニュー" },
      { value: "local", label: "地元の話題" },
      { value: "event", label: "季節の催し" }
    ], current ? current.category : "local");
    var season = selectBox(catalog.seasons.map(function (item) {
      return { value: item.id, label: item.label };
    }), current ? current.season : "spring");
    var spot = selectBox(catalog.spots.map(function (item) {
      return { value: item.id, label: item.name };
    }), current ? current.spotId : catalog.spots[0].id);
    var selects = el("div", "select-grid admin-selects");
    selects.appendChild(field("分類", category));
    selects.appendChild(field("季節", season));
    selects.appendChild(field("場所", spot));
    panel.appendChild(selects);

    function payload(status) {
      return {
        id: current ? current.id : "",
        category: category.value,
        season: season.value,
        spotId: spot.value,
        title: title.value,
        body: body.value,
        status: status
      };
    }

    panel.appendChild(button(current ? "下書きとして残す" : "下書きを残す", "white-button", function () {
      send("/api/admin/notices", payload("draft")).then(function () {
        editingId = "";
        note = "下書きを残しました。";
        draw();
      }).catch(function () {
        note = "保存できませんでした。題名と本文を確認してください。";
        draw();
      });
    }));
    panel.appendChild(button("発信する", "white-button", function () {
      send("/api/admin/notices", payload("published")).then(function () {
        editingId = "";
        note = "お知らせを発信しました。観光客の画面に出ます。";
        draw();
      }).catch(function () {
        note = "発信できませんでした。題名と本文を確認してください。";
        draw();
      });
    }));
    if (current) {
      panel.appendChild(button("新規作成に戻る", "text-button", function () {
        editingId = "";
        note = "";
        draw();
      }));
    }
    return panel;
  }

  function renderNoticeList(notices) {
    var panel = el("section", "glass panel");
    panel.appendChild(el("h3", "", "登録済みのお知らせ"));
    if (!notices.length) {
      panel.appendChild(el("p", "subtle", "まだお知らせはありません。"));
      return panel;
    }
    notices.forEach(function (item) {
      var row = el("article", "admin-row");
      row.appendChild(el("strong", "", item.title));
      row.appendChild(el("p", "subtle",
        statusLabel(item.status) + "・" + categoryLabel(item.category) + "・" +
        seasonLabel(item.season) + "・" + spotName(item.spotId) +
        (item.createdBy ? "・担当 " + item.createdBy : "・初期データ")
      ));
      row.appendChild(el("p", "detail", item.body));
      if (canManage(item)) {
        var actions = el("div", "admin-actions");
        actions.appendChild(button("編集", "text-button", function () {
          editingId = item.id;
          note = "";
          draw();
          root.scrollTo(0, 0);
        }));
        if (item.status !== "published") {
          actions.appendChild(button("発信する", "text-button", function () {
            send("/api/admin/notices", { statusOnly: true, id: item.id, status: "published" }).then(function () {
              note = "発信しました。";
              draw();
            }).catch(function () { note = "発信できませんでした。"; draw(); });
          }));
        } else {
          actions.appendChild(button("発信を止める", "text-button", function () {
            send("/api/admin/notices", { statusOnly: true, id: item.id, status: "hidden" }).then(function () {
              note = "発信を止めました。";
              draw();
            }).catch(function () { note = "停止できませんでした。"; draw(); });
          }));
        }
        actions.appendChild(button("削除", "text-button", function () {
          send("/api/admin/notices", { remove: true, id: item.id }).then(function () {
            if (editingId === item.id) editingId = "";
            note = "お知らせを削除しました。";
            draw();
          }).catch(function () { note = "削除できませんでした。"; draw(); });
        }));
        row.appendChild(actions);
      }
      panel.appendChild(row);
    });
    return panel;
  }

  function renderReviewList(reviews) {
    var panel = el("section", "glass panel");
    panel.appendChild(el("h3", "", "公開文の削除"));
    panel.appendChild(el("p", "subtle", "ALL だけが、参考口コミとして公開された本文を消せます。"));
    if (!reviews.length) {
      panel.appendChild(el("p", "subtle", "公開文はありません。"));
      return panel;
    }
    reviews.forEach(function (item) {
      var row = el("article", "admin-row");
      row.appendChild(el("p", "subtle",
        spotName(item.spotId) + "・" + seasonLabel(item.season) + "・満足度" + item.satisfaction
      ));
      row.appendChild(el("p", "detail", item.body));
      row.appendChild(button("この文を削除", "text-button", function () {
        send("/api/admin/reviews", { id: item.id }).then(function () {
          note = "公開文を削除しました。";
          draw();
        }).catch(function () { note = "削除できませんでした。"; draw(); });
      }));
      panel.appendChild(row);
    });
    return panel;
  }

  function renderCampaigns(rows, notices, kgiNote) {
    var panel = el("section", "glass panel admin-editor");
    panel.appendChild(el("h3", "", "再訪の施策"));
    panel.appendChild(el("p", "subtle", kgiNote || "同一ブラウザで同じ場所の別季節が残った件数をKGIにします。端末の一覧は出しません。"));

    var spot = selectBox(catalog.spots.map(function (item) {
      return { value: item.id, label: item.name };
    }), catalog.spots[0].id);
    var fromSeason = selectBox(catalog.seasons.map(function (item) {
      return { value: item.id, label: item.label };
    }), "autumn");
    var toSeason = selectBox(catalog.seasons.map(function (item) {
      return { value: item.id, label: item.label };
    }), "winter");
    var aim = selectBox([
      { value: "next_season", label: "次の季節の続き" },
      { value: "add_food", label: "食を足す" },
      { value: "add_people", label: "人の催しを足す" },
      { value: "how_to_go", label: "回り方" }
    ], "next_season");
    var noticeOptions = [{ value: "", label: "お知らせなし" }].concat(
      (notices || []).filter(function (item) { return item.status === "published"; }).map(function (item) {
        return { value: item.id, label: item.title };
      })
    );
    var notice = selectBox(noticeOptions, "");
    var hypothesis = document.createElement("textarea");
    hypothesis.className = "comment-box";
    hypothesis.rows = 3;
    hypothesis.maxLength = 200;
    hypothesis.setAttribute("aria-label", "仮説");
    var selects = el("div", "select-grid admin-selects");
    selects.appendChild(field("対象の場所", spot));
    selects.appendChild(field("今の季節", fromSeason));
    selects.appendChild(field("次の季節", toSeason));
    selects.appendChild(field("狙い", aim));
    panel.appendChild(selects);
    panel.appendChild(field("つなぐお知らせ", notice));
    panel.appendChild(field("仮説（200字）", hypothesis));
    panel.appendChild(button("施策の下書きを残す", "white-button", function () {
      send("/api/admin/campaigns", {
        spotId: spot.value,
        fromSeason: fromSeason.value,
        toSeason: toSeason.value,
        aim: aim.value,
        noticeId: notice.value,
        hypothesis: hypothesis.value
      }).then(function () {
        hypothesis.value = "";
        note = "施策の下書きを残しました。";
        draw();
      }).catch(function () {
        note = "保存できませんでした。今の季節と次の季節を分け、仮説を書いてください。";
        draw();
      });
    }));

    if (!rows.length) {
      panel.appendChild(el("p", "subtle", "まだ施策はありません。"));
      return panel;
    }
    rows.forEach(function (item) {
      var row = el("article", "admin-row");
      row.appendChild(el("strong", "", spotName(item.spotId) + "・" + seasonLabel(item.fromSeason) + " → " + seasonLabel(item.toSeason)));
      row.appendChild(el("p", "subtle",
        campaignStatusLabel(item.status) + "・" + aimLabel(item.aim) +
        "・到達 " + item.reach + "・KGI " + item.kgi +
        (item.startedAt ? "（開始前 " + item.kgiBefore + "）" : "") +
        "・" + verdictLabel(item.verdict)
      ));
      row.appendChild(el("p", "detail", item.hypothesis));
      var actions = el("div", "admin-actions");
      if (item.status === "draft") {
        actions.appendChild(button("実施する", "text-button", function () {
          send("/api/admin/campaigns", { id: item.id, status: "running", noticeId: item.noticeId }).then(function () {
            note = "施策を実施中にしました。";
            draw();
          }).catch(function () { note = "開始できませんでした。"; draw(); });
        }));
      }
      if (item.status === "running") {
        ["up", "flat", "down"].forEach(function (verdict) {
          actions.appendChild(button(verdictLabel(verdict) + "として止める", "text-button", function () {
            send("/api/admin/campaigns", { id: item.id, status: "stopped", verdict: verdict, noticeId: item.noticeId }).then(function () {
              note = "施策を止めました。";
              draw();
            }).catch(function () { note = "停止できませんでした。"; draw(); });
          }));
        });
      }
      if (actions.childElementCount) row.appendChild(actions);
      panel.appendChild(row);
    });
    return panel;
  }

  function renderStaffList(rows) {
    var panel = el("section", "glass panel admin-editor");
    panel.appendChild(el("h3", "", "担当アカウント"));
    panel.appendChild(el("p", "subtle", "ALL だけが追加できます。氏名は使いません。"));
    var staffId = document.createElement("input");
    staffId.type = "text";
    staffId.maxLength = 20;
    staffId.setAttribute("aria-label", "新しい担当ID");
    var password = document.createElement("input");
    password.type = "password";
    password.maxLength = 64;
    password.setAttribute("aria-label", "新しい合言葉");
    var role = selectBox([
      { value: "editor", label: "editor" },
      { value: "all", label: "ALL" }
    ], "editor");
    panel.appendChild(field("担当ID", staffId));
    panel.appendChild(field("合言葉（8文字以上）", password));
    panel.appendChild(field("権限", role));
    panel.appendChild(button("担当を追加", "white-button", function () {
      send("/api/admin/staff", {
        staffId: staffId.value,
        password: password.value,
        role: role.value
      }).then(function () {
        password.value = "";
        note = "担当を追加しました。";
        draw();
      }).catch(function () {
        password.value = "";
        note = "追加できませんでした。IDと8文字以上の合言葉を確認してください。";
        draw();
      });
    }));
    rows.forEach(function (item) {
      var row = el("article", "admin-row");
      row.appendChild(el("strong", "", item.staffId + "（" + roleLabel(item.role) + "）"));
      if (item.staffId !== session.staffId) {
        row.appendChild(button("この担当を外す", "text-button", function () {
          send("/api/admin/staff", { remove: true, staffId: item.staffId }).then(function () {
            note = "担当を外しました。";
            draw();
          }).catch(function () { note = "外せませんでした。"; draw(); });
        }));
      }
      panel.appendChild(row);
    });
    return panel;
  }

  root.addEventListener("DOMContentLoaded", draw);
})(typeof globalThis !== "undefined" ? globalThis : this);
