/* MataTabi v007 の静的カタログ。クラウドAPIは使わない。サムネイルは img/spots/{id}.jpg。 */
(function (root) {
  "use strict";

  var seasons = [
    { id: "spring", label: "春" },
    { id: "summer", label: "夏" },
    { id: "autumn", label: "秋" },
    { id: "winter", label: "冬" }
  ];

  var reasons = [
    { id: "season", label: "季節が変わる続き" },
    { id: "food", label: "食が乗る続き" },
    { id: "people", label: "人がいる続き" }
  ];

  /* 各スポットは季節ごとの体験を持つ。訪問済み判定は履歴側で行う。 */
  var spots = [
    {
      id: "shio",
      name: "星綾の潮見台",
      area: "薄青岬",
      tags: ["scenery", "nature"],
      offerings: [
        { season: "spring", reason: "season", title: "潮見台", detail: "桜と水平線が重なる午前。", food: "", event: "", minutes: 40, access: "バス1本", steps: "段差は少ない", rest: "展望台にベンチ", crowd: "午前は空いている" },
        { season: "summer", reason: "food", title: "潮見台", detail: "風の強い昼に塩レモンを食べる。", food: "塩レモン", event: "", minutes: 50, access: "バス1本", steps: "段差は少ない", rest: "展望台にベンチ", crowd: "昼は人が増える" },
        { season: "autumn", reason: "people", title: "潮見台", detail: "夕景の語り部が港の話をする。", food: "", event: "夕景の語り部", minutes: 70, access: "バス1本", steps: "段差は少ない", rest: "展望台にベンチ", crowd: "夕方は混む" },
        { season: "winter", reason: "season", title: "潮見台", detail: "空気が澄み、島の線が近い。", food: "", event: "", minutes: 40, access: "バスの本数が少ない", steps: "段差は少ない", rest: "室内待合は小さい", crowd: "空いている" }
      ]
    },
    {
      id: "todai",
      name: "風詠みの灯台",
      area: "白波離島",
      tags: ["scenery", "history", "nature"],
      offerings: [
        { season: "spring", reason: "people", title: "灯台", detail: "灯台守が朝の風向きを教える。", food: "", event: "朝の灯台案内", minutes: 60, access: "船のあと徒歩", steps: "階段が多い", rest: "麓に茶屋", crowd: "午前は空いている" },
        { season: "summer", reason: "season", title: "灯台", detail: "入道雲の下で海が白い。", food: "", event: "", minutes: 60, access: "船のあと徒歩", steps: "階段が多い", rest: "麓に茶屋", crowd: "午後は混む" },
        { season: "autumn", reason: "food", title: "灯台", detail: "磯の焼き魚を麓で食べる。", food: "磯の焼き魚", event: "", minutes: 80, access: "船のあと徒歩", steps: "階段が多い", rest: "麓に茶屋", crowd: "昼は普通" },
        { season: "winter", reason: "season", title: "灯台", detail: "風が強く、灯台の光が早い。", food: "", event: "", minutes: 50, access: "船の便が少ない", steps: "階段が多い", rest: "麓の茶屋は短時間", crowd: "空いている" }
      ]
    },
    {
      id: "yoichi",
      name: "虹灯りの夜市",
      area: "虹帆町",
      tags: ["food", "events", "people"],
      offerings: [
        { season: "spring", reason: "food", title: "夜市", detail: "桜餅の屋台が並ぶ夕方。", food: "桜餅", event: "", minutes: 30, access: "徒歩圏", steps: "平坦", rest: "屋台の席", crowd: "夕方から混む" },
        { season: "summer", reason: "season", title: "夜市", detail: "暗くなるのが遅く、灯りがにじむ。", food: "", event: "", minutes: 40, access: "徒歩圏", steps: "平坦", rest: "屋台の席", crowd: "夜は混む" },
        { season: "autumn", reason: "food", title: "夜市", detail: "栗の屋台が通りの中央に出る。", food: "栗の屋台", event: "", minutes: 30, access: "徒歩圏", steps: "平坦", rest: "屋台の席", crowd: "夕方は混む" },
        { season: "winter", reason: "people", title: "夜市", detail: "冬至の夜に店主が一杯を出す。", food: "", event: "冬至の夜市", minutes: 40, access: "徒歩圏", steps: "平坦", rest: "屋内の席がある", crowd: "空いている" }
      ]
    },
    {
      id: "mizu",
      name: "瑠璃凪の水鏡湖",
      area: "雫森谷",
      tags: ["nature", "scenery"],
      offerings: [
        { season: "spring", reason: "season", title: "水鏡湖", detail: "湖面に桜が落ちる。", food: "", event: "", minutes: 45, access: "バス1本", steps: "湖畔は平坦", rest: "東屋", crowd: "午前は空いている" },
        { season: "summer", reason: "people", title: "水鏡湖", detail: "船頭が対岸まで渡す。", food: "", event: "湖の船頭", minutes: 70, access: "バス1本", steps: "桟橋に段差", rest: "東屋", crowd: "昼は普通" },
        { season: "autumn", reason: "season", title: "水鏡湖", detail: "逆さの山が湖に入る。", food: "", event: "", minutes: 45, access: "バス1本", steps: "湖畔は平坦", rest: "東屋", crowd: "午後は普通" },
        { season: "winter", reason: "food", title: "水鏡湖", detail: "湖畔で甘酒を飲む。", food: "湖畔の甘酒", event: "", minutes: 40, access: "バスの本数が少ない", steps: "湖畔は平坦", rest: "東屋は風を避けにくい", crowd: "空いている" }
      ]
    },
    {
      id: "kaza",
      name: "月花の風車丘",
      area: "月灯集落",
      tags: ["nature", "scenery", "food"],
      offerings: [
        { season: "spring", reason: "food", title: "風車丘", detail: "菜の花弁当を丘の上で食べる。", food: "菜の花弁当", event: "", minutes: 55, access: "バスのあと上り", steps: "坂と段差が多い", rest: "丘の中腹にベンチ", crowd: "昼は普通" },
        { season: "summer", reason: "season", title: "風車丘", detail: "風車の影が長い昼下がり。", food: "", event: "", minutes: 50, access: "バスのあと上り", steps: "坂と段差が多い", rest: "丘の中腹にベンチ", crowd: "午後は混む" },
        { season: "autumn", reason: "people", title: "風車丘", detail: "職人が羽根の直し方を見せる。", food: "", event: "風車の職人", minutes: 75, access: "バスのあと上り", steps: "坂と段差が多い", rest: "作業小屋で休める", crowd: "午前は空いている" },
        { season: "winter", reason: "season", title: "風車丘", detail: "丘の上から町の灯が見える。", food: "", event: "", minutes: 50, access: "バスの本数が少ない", steps: "坂と段差が多い", rest: "作業小屋で休める", crowd: "空いている" }
      ]
    },
    {
      id: "ishi",
      name: "灯雲の石畳通り",
      area: "星綴港",
      tags: ["history", "people", "food"],
      offerings: [
        { season: "spring", reason: "people", title: "石畳", detail: "案内人が路地の抜け道を歩く。", food: "", event: "石畳の案内", minutes: 35, access: "港から徒歩", steps: "石畳の段差が多い", rest: "茶店が点在", crowd: "昼は普通" },
        { season: "summer", reason: "food", title: "石畳", detail: "冷たい葛を路地で食べる。", food: "冷たい葛", event: "", minutes: 30, access: "港から徒歩", steps: "石畳の段差が多い", rest: "茶店が点在", crowd: "夕方は混む" },
        { season: "autumn", reason: "season", title: "石畳", detail: "夕灯が石に反射する。", food: "", event: "", minutes: 35, access: "港から徒歩", steps: "石畳の段差が多い", rest: "茶店が点在", crowd: "夕方は混む" },
        { season: "winter", reason: "food", title: "石畳", detail: "小鍋の店が暖簾を出す。", food: "石畳の小鍋", event: "", minutes: 50, access: "港から徒歩", steps: "石畳の段差が多い", rest: "店内で休める", crowd: "空いている" }
      ]
    },
    {
      id: "oto",
      name: "雪雫の音楽堂",
      area: "鈴風高原",
      tags: ["events", "people", "history"],
      offerings: [
        { season: "spring", reason: "season", title: "音楽堂", detail: "窓を開けた練習日。", food: "", event: "", minutes: 40, access: "バス1本", steps: "館内は平坦", rest: "ロビー", crowd: "午前は空いている" },
        { season: "summer", reason: "people", title: "音楽堂", detail: "奏者が短い曲をロビーで弾く。", food: "", event: "ロビーの短い演奏", minutes: 50, access: "バス1本", steps: "館内は平坦", rest: "ロビー", crowd: "夕方は普通" },
        { season: "autumn", reason: "food", title: "音楽堂", detail: "栗の菓子を休憩に出す。", food: "栗の菓子", event: "", minutes: 40, access: "バス1本", steps: "館内は平坦", rest: "ロビー", crowd: "午後は普通" },
        { season: "winter", reason: "season", title: "音楽堂", detail: "雪の日は音が館の中に残る。", food: "", event: "", minutes: 40, access: "バスの本数が少ない", steps: "入口に段差", rest: "ロビー", crowd: "空いている" }
      ]
    }
  ];

  /* お知らせの初期文。SQLite が空のときの種と、API失敗時の控え。実在の店・人物・祭は使わない。 */
  var notices = [
    {
      id: "menu-spring-yoichi",
      category: "menu",
      season: "spring",
      spotId: "yoichi",
      title: "夜市に桜餅が並び始めました",
      body: "虹帆町の屋台が、春限定の桜餅を夕方から出しています。並ばずに食べられる短い時間帯があります。"
    },
    {
      id: "menu-summer-shio",
      category: "menu",
      season: "summer",
      spotId: "shio",
      title: "潮見台の塩レモンが今年も始まりました",
      body: "薄青岬の茶店が、風の強い昼だけ塩レモンを出します。展望台のベンチで食べられます。"
    },
    {
      id: "menu-autumn-yoichi",
      category: "menu",
      season: "autumn",
      spotId: "yoichi",
      title: "栗の屋台が通りの中央へ出ました",
      body: "秋の夜市では、焼き栗と栗あんの菓子が並びます。短い距離で何軒か試せます。"
    },
    {
      id: "menu-winter-ishi",
      category: "menu",
      season: "winter",
      spotId: "ishi",
      title: "石畳の小鍋が暖簾を出しました",
      body: "星綴港の路地で、ひとり分の小鍋が始まりました。店内に腰を下ろせる席があります。"
    },
    {
      id: "local-spring-ho",
      category: "local",
      season: "spring",
      spotId: "yoichi",
      title: "看板犬の帆に、子犬が生まれました",
      body: "虹帆町の茶店前にいる帆が、春に子犬を産みました。店先で顔を出せる時間は午前中です。触れ合うときは店員の案内に従ってください。"
    },
    {
      id: "local-summer-todai",
      category: "local",
      season: "summer",
      spotId: "todai",
      title: "灯台守が短い案内を増やしています",
      body: "白波離島の灯台守が、入道雲の見える日に風向きを教えています。階段の途中で休憩できます。"
    },
    {
      id: "local-autumn-kaza",
      category: "local",
      season: "autumn",
      spotId: "kaza",
      title: "風車の職人が羽根の手入れを見せています",
      body: "月灯集落の職人が、作業小屋で羽根の直し方を公開しています。見学は午前が空いています。"
    },
    {
      id: "local-winter-oto",
      category: "local",
      season: "winter",
      spotId: "oto",
      title: "音楽堂のロビーで短い練習が聞こえます",
      body: "雪の日は音が館の中に残ります。ロビーで休むあいだ、短い練習を聴けることがあります。"
    },
    {
      id: "event-spring-ishi",
      category: "event",
      season: "spring",
      spotId: "ishi",
      title: "石畳の案内歩きに参加できます",
      body: "星綴港の案内人が、路地の抜け道を歩く短い回りを案内します。予約はなく、港の入口で声をかけてください。"
    },
    {
      id: "event-summer-mizu",
      category: "event",
      season: "summer",
      spotId: "mizu",
      title: "水鏡湖の船頭が対岸まで渡します",
      body: "夏の湖では、船頭が対岸までの短い渡しをしています。桟橋に段差があるので、足場に注意してください。"
    },
    {
      id: "event-autumn-shio",
      category: "event",
      season: "autumn",
      spotId: "shio",
      title: "夕景の語り部が港の話をします",
      body: "薄青岬の潮見台で、夕方だけ港の昔話を聞くことができます。立ち見でも参加できます。"
    },
    {
      id: "event-winter-yoichi",
      category: "event",
      season: "winter",
      spotId: "yoichi",
      title: "冬至の夜市が開きます",
      body: "虹帆町の冬至の夜に、店主が一杯を出す夜市があります。屋内の席があり、空いていれば座れます。"
    }
  ];

  root.TsudukiCatalog = {
    seasons: seasons,
    reasons: reasons,
    spots: spots,
    notices: notices
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
