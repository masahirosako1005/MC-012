/* 様子ページ用。スタンプラリーCSVを居住地域×年代×性別の件数だけにする。氏名やIDは返さない。 */
"use strict";

var fs = require("fs");
var path = require("path");

var AGE_ORDER = ["10代", "20代", "30代", "40代", "50代", "60代以上"];
var GENDER_ORDER = ["女性", "男性", "その他", "回答しない"];
var NOTE = "2026年10月1日〜20日のスタンプラリー登録者です。人数の多い順です。氏名は出していません。";

function clean(value, max) {
  if (typeof value !== "string") return "";
  var text = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (!text) return "";
  return text.slice(0, max);
}

function parseCsv(text) {
  var src = String(text || "").replace(/^\uFEFF/, "");
  var rows = [];
  var row = [];
  var cell = "";
  var quote = false;
  for (var i = 0; i < src.length; i++) {
    var ch = src.charAt(i);
    if (quote) {
      if (ch === "\"") {
        if (src.charAt(i + 1) === "\"") {
          cell += "\"";
          i += 1;
        } else {
          quote = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === "\"") {
      quote = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src.charAt(i + 1) === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(function (item) {
    return item.some(function (value) { return String(value).trim() !== ""; });
  });
}

function headerIndex(header) {
  var index = {};
  header.forEach(function (name, i) {
    index[String(name).trim()] = i;
  });
  return index;
}

function cell(row, index, names) {
  for (var i = 0; i < names.length; i++) {
    if (Object.prototype.hasOwnProperty.call(index, names[i])) {
      return row[index[names[i]]] || "";
    }
  }
  return "";
}

function orderOf(found, preferred) {
  var list = preferred.filter(function (name) { return found[name]; });
  Object.keys(found).sort().forEach(function (name) {
    if (list.indexOf(name) < 0) list.push(name);
  });
  return list;
}

function addCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function rowsFrom(map, fields) {
  return Object.keys(map).map(function (key) {
    var parts = key.split("\t");
    var row = { n: map[key] };
    fields.forEach(function (name, i) { row[name] = parts[i] || ""; });
    return row;
  }).sort(function (a, b) { return b.n - a.n; });
}

function empty(note) {
  return {
    note: note || "",
    ages: [],
    genders: [],
    people: [],
    spots: []
  };
}

function aggregate(userCsv, stampCsv) {
  var userRows = parseCsv(userCsv);
  var stampRows = parseCsv(stampCsv);
  if (!userRows.length) return empty(NOTE);

  var userHeader = headerIndex(userRows[0]);
  var users = {};
  var ages = {};
  var genders = {};
  userRows.slice(1).forEach(function (row) {
    var id = clean(cell(row, userHeader, ["ユーザーID", "ユーザID", "user_id"]), 40);
    var region = clean(cell(row, userHeader, ["居住地域", "居住地", "2528_居住地"]), 40);
    var age = clean(cell(row, userHeader, ["年代", "年齢", "2489_年齢"]), 20);
    var gender = clean(cell(row, userHeader, ["性別", "2488_性別"]), 20);
    if (!id || !region || !age || !gender || users[id]) return;
    users[id] = { region: region, age: age, gender: gender };
    ages[age] = true;
    genders[gender] = true;
  });

  var people = {};
  Object.keys(users).forEach(function (id) {
    var user = users[id];
    addCount(people, user.region + "\t" + user.age + "\t" + user.gender);
  });

  var spots = {};
  var seen = {};
  if (stampRows.length) {
    var stampHeader = headerIndex(stampRows[0]);
    stampRows.slice(1).forEach(function (row) {
      var id = clean(cell(row, stampHeader, ["ユーザID", "ユーザーID", "user_id"]), 40);
      var spot = clean(cell(row, stampHeader, ["スポット名"]), 80);
      var user = users[id];
      if (!user || !spot) return;
      var once = id + "\t" + spot;
      if (seen[once]) return;
      seen[once] = true;
      addCount(spots, spot + "\t" + user.region + "\t" + user.age + "\t" + user.gender);
    });
  }

  return {
    note: NOTE,
    ages: orderOf(ages, AGE_ORDER),
    genders: orderOf(genders, GENDER_ORDER),
    people: rowsFrom(people, ["region", "age", "gender"]),
    spots: rowsFrom(spots, ["spot", "region", "age", "gender"])
  };
}

function load(dir) {
  try {
    var users = fs.readFileSync(path.join(dir, "13_ユーザー一覧.csv"), "utf8");
    var stamps = fs.readFileSync(path.join(dir, "12_スタンプ獲得履歴.csv"), "utf8");
    return aggregate(users, stamps);
  } catch (error) {
    return empty("居住地域の集計ファイルを読めません。");
  }
}

module.exports = {
  parseCsv: parseCsv,
  aggregate: aggregate,
  load: load
};
