/* このPC向けのお知らせ編集と、公開文の削除。検証済みの文字列だけを textContent で出す。 */
(function (root) {
  "use strict";

  var catalog = root.TsudukiCatalog;
  var editingId = "";
  var note = "";

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
    return {
      menu: "名店のメニュー",
      local: "地元の話題",
      event: "季節の催し"
    }[id] || id;
  }

  function statusLabel(id) {
    return {
      draft: "下書き",
      published: "発信中",
      hidden: "停止中"
    }[id] || id;
  }

  function send(url, payload) {
    return root.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      if (!response.ok) throw new Error("admin: " + response.status);
      return response.json();
    });
  }

  function loadJson(url) {
    return root.fetch(url, { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("admin: " + response.status);
      return response.json();
    });
  }

  function draw() {
    Promise.all([
      loadJson("/api/admin/notices"),
      loadJson("/api/admin/reviews")
    ]).then(function (rows) {
      render(rows[0].notices || [], rows[1].reviews || []);
    }).catch(function () {
      note = "node serve.js がこのPCで動いているときに開けます。";
      render([], []);
    });
  }

  function render(notices, reviews) {
    var app = document.getElementById("app");
    var view = el("div", "page admin-page");
    view.appendChild(el("h2", "page-title", "お知らせの編集と発信"));
    view.appendChild(el("p", "subtle", "観光客向けアプリとは別の画面です。ログインは使いません。このPCのブラウザだけが開けます。"));
    if (note) view.appendChild(el("p", "data-note", note));

    view.appendChild(renderForm(notices));
    view.appendChild(renderNoticeList(notices));
    view.appendChild(renderReviewList(reviews));
    app.replaceChildren(view);
  }

  function currentNotice(notices) {
    return notices.filter(function (item) { return item.id === editingId; })[0] || null;
  }

  function renderForm(notices) {
    var current = currentNotice(notices);
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
        seasonLabel(item.season) + "・" + spotName(item.spotId)
      ));
      row.appendChild(el("p", "detail", item.body));
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
      panel.appendChild(row);
    });
    return panel;
  }

  function renderReviewList(reviews) {
    var panel = el("section", "glass panel");
    panel.appendChild(el("h3", "", "公開文の削除"));
    panel.appendChild(el("p", "subtle", "参考口コミとして公開された本文だけを消せます。端末内の個人メモは各端末に残ります。"));
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

  root.addEventListener("DOMContentLoaded", draw);
})(typeof globalThis !== "undefined" ? globalThis : this);
