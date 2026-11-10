/* MataTabi v009 の表示言語。画面文言は選択言語、言語名の選択肢は指定の6語で固定する。 */
(function (root) {
  "use strict";

  var languages = [
    { id: "ja", choice: "日本語", htmlLang: "ja", font: '"Yu Gothic UI", "Hiragino Sans", "Meiryo", sans-serif' },
    { id: "en", choice: "English", htmlLang: "en", font: '"Segoe UI", "Helvetica Neue", sans-serif' },
    { id: "zh", choice: "中文", htmlLang: "zh-Hans", font: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif' },
    { id: "ko", choice: "한국어", htmlLang: "ko", font: '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif' },
    { id: "fr", choice: "Français", htmlLang: "fr", font: '"Segoe UI", "Helvetica Neue", sans-serif' },
    { id: "it", choice: "Italiano", htmlLang: "it", font: '"Segoe UI", "Helvetica Neue", sans-serif' }
  ];
  var ids = languages.map(function (item) { return item.id; });

  function six(ja, en, zh, ko, fr, it) {
    return { ja: ja, en: en, zh: zh, ko: ko, fr: fr, it: it };
  }

  var messages = {
    ja: {},
    en: {},
    zh: {},
    ko: {},
    fr: {},
    it: {}
  };

  function setPath(langId, path, value) {
    var parts = path.split(".");
    var node = messages[langId];
    for (var index = 0; index < parts.length - 1; index += 1) {
      if (!node[parts[index]] || typeof node[parts[index]] !== "object") node[parts[index]] = {};
      node = node[parts[index]];
    }
    node[parts[parts.length - 1]] = value;
  }

  function put(path, packed) {
    languages.forEach(function (lang) {
      setPath(lang.id, path, packed[lang.id] != null ? packed[lang.id] : packed.ja);
    });
  }

  function lookup(node, key) {
    var current = node;
    var parts = key.split(".");
    for (var index = 0; index < parts.length; index += 1) {
      if (!current || typeof current !== "object") return undefined;
      current = current[parts[index]];
    }
    return typeof current === "string" ? current : undefined;
  }

  function text(lang, key, vars) {
    var value = lookup(messages[lang], key);
    if (value == null) value = lookup(messages.ja, key);
    if (value == null) return "";
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, function (_, name) {
      return vars[name] != null ? String(vars[name]) : "";
    });
  }

  function languageById(id) {
    return languages.filter(function (item) { return item.id === id; })[0] || languages[0];
  }

  /* 画面の固定文 */
  put("language.select", six("言語を選択", "Select language", "选择语言", "언어 선택", "Choisir la langue", "Scegli la lingua"));
  put("language.title", six("言語を選択", "Select language", "选择语言", "언어 선택", "Choisir la langue", "Scegli la lingua"));
  put("close", six("閉じる", "Close", "关闭", "닫기", "Fermer", "Chiudi"));
  put("nav.home", six("ホーム", "Home", "首页", "홈", "Accueil", "Home"));
  put("nav.memories", six("思い出", "Memories", "回忆", "추억", "Souvenirs", "Ricordi"));
  put("nav.discover", six("発見", "Discover", "发现", "발견", "Découvrir", "Scopri"));
  put("nav.notices", six("お知らせ", "Notices", "通知", "알림", "Infos", "Avvisi"));
  put("nav.main", six("メインメニュー", "Main menu", "主菜单", "메인 메뉴", "Menu principal", "Menu principale"));

  put("season.spring", six("春", "Spring", "春", "봄", "Printemps", "Primavera"));
  put("season.summer", six("夏", "Summer", "夏", "여름", "Été", "Estate"));
  put("season.autumn", six("秋", "Autumn", "秋", "가을", "Automne", "Autunno"));
  put("season.winter", six("冬", "Winter", "冬", "겨울", "Hiver", "Inverno"));

  put("reason.season", six("季節が変わる続き", "A new season", "换季续访", "계절이 바뀌는 이어가기", "Une nouvelle saison", "Una nuova stagione"));
  put("reason.food", six("食が乗る続き", "Food to try", "美食续访", "음식이 있는 이어가기", "Saveurs à retrouver", "Sapori da ritrovare"));
  put("reason.people", six("人がいる続き", "People to meet", "人情续访", "사람이 있는 이어가기", "Des gens à revoir", "Persone da rivedere"));
  put("reason.seasonShort", six("季節", "Season", "季节", "계절", "Saison", "Stagione"));
  put("reason.foodShort", six("食", "Food", "美食", "음식", "Saveurs", "Cibo"));
  put("reason.peopleShort", six("現地の人", "People", "当地人", "현지 사람", "Habitants", "Persone"));

  put("pref.title", six("あなたの旅の好み", "Your travel style", "你的旅行偏好", "당신의 여행 취향", "Vos goûts de voyage", "I tuoi gusti di viaggio"));
  put("pref.register", six("かんたん登録", "Quick setup", "简易登记", "간단히 등록", "Enregistrement simple", "Registrazione rapida"));
  put("pref.change", six("好みを変更", "Change preferences", "更改偏好", "취향 변경", "Modifier les goûts", "Modifica i gusti"));
  put("pref.empty", six("まだ登録していません", "Not set yet", "尚未登记", "아직 등록하지 않았습니다", "Pas encore enregistré", "Non ancora registrato"));
  put("pref.interestCount", six("興味{count}件", "{count} interests", "兴趣{count}项", "관심사 {count}개", "{count} centres d’intérêt", "{count} interessi"));
  put("pref.pageTitle", six("旅の好み", "Travel style", "旅行偏好", "여행 취향", "Goûts de voyage", "Gusti di viaggio"));
  put("pref.lead", six(
    "選ぶだけでこの端末に保存します。氏名、年代、性別、位置情報は使いません。",
    "Choices are saved on this device. We do not use names, age, gender, or location.",
    "只需选择即可保存在本机。不使用姓名、年龄、性别或位置。",
    "고르기만 하면 이 기기에 저장됩니다. 이름, 연령, 성별, 위치는 쓰지 않습니다.",
    "Les choix sont enregistrés sur cet appareil. Nom, âge, genre et localisation ne sont pas utilisés.",
    "Le scelte restano su questo dispositivo. Nome, età, genere e posizione non vengono usati."
  ));
  put("pref.party", six("だれと旅する？", "Who do you travel with?", "和谁一起旅行？", "누구와 여행하나요?", "Avec qui voyagez-vous ?", "Con chi viaggi?"));
  put("pref.solo", six("ひとり", "Solo", "独自", "혼자", "Seul", "Da solo"));
  put("pref.couple", six("ふたり", "Couple", "两人", "둘이", "À deux", "In coppia"));
  put("pref.family", six("家族", "Family", "家人", "가족", "Famille", "Famiglia"));
  put("pref.friends", six("友人", "Friends", "朋友", "친구", "Amis", "Amici"));
  put("pref.duration", six("旅に使える時間", "Time for the trip", "可用于旅行的时间", "여행에 쓸 시간", "Temps disponible", "Tempo a disposizione"));
  put("pref.short", six("短時間", "Short", "短时", "짧은 시간", "Court", "Breve"));
  put("pref.half", six("半日", "Half day", "半天", "반나절", "Demi-journée", "Mezza giornata"));
  put("pref.full", six("一日", "Full day", "一整天", "하루", "Journée", "Giornata"));
  put("pref.mobility", six("移動の負担", "Walking effort", "移动负担", "이동 부담", "Effort de déplacement", "Sforzo di spostamento"));
  put("pref.low", six("少なめ", "Light", "较少", "적게", "Léger", "Leggero"));
  put("pref.medium", six("ほどほど", "Moderate", "适中", "적당", "Modéré", "Moderato"));
  put("pref.high", six("坂道も平気", "Hills are fine", "不怕坡道", "언덕도 괜찮음", "Les pentes vont", "Le salite vanno bene"));
  put("pref.interests", six("興味があること（4つまで）", "Interests (up to 4)", "感兴趣的内容（最多4项）", "관심사（최대 4개）", "Centres d’intérêt (4 max.)", "Interessi (massimo 4)"));
  put("pref.interest.scenery", six("景色", "Scenery", "风景", "경치", "Paysages", "Paesaggi"));
  put("pref.interest.food", six("食", "Food", "美食", "음식", "Cuisine", "Cibo"));
  put("pref.interest.people", six("現地の人", "Local people", "当地人", "현지 사람", "Habitants", "Gente del posto"));
  put("pref.interest.events", six("催し", "Events", "活动", "행사", "Événements", "Eventi"));
  put("pref.interest.history", six("町の歴史", "Town history", "城镇历史", "마을 역사", "Histoire de la ville", "Storia del paese"));
  put("pref.interest.nature", six("自然", "Nature", "自然", "자연", "Nature", "Natura"));
  put("pref.crowd", six("混雑の好み", "Crowds", "对拥挤的偏好", "혼잡 취향", "Affluence", "Folla"));
  put("pref.avoid", six("避けたい", "Avoid", "想避开", "피하고 싶음", "À éviter", "Da evitare"));
  put("pref.neutralCrowd", six("ほどほど", "Moderate", "适中", "적당", "Modérée", "Moderata"));
  put("pref.okay", six("にぎわいも好き", "Busy is fine", "也喜欢热闹", "북적임도 좋음", "L’animation plaît", "Il via vai piace"));
  put("pref.save", six("登録する", "Save", "登记", "등록하기", "Enregistrer", "Registra"));
  put("pref.clear", six("登録を消す", "Clear", "清除登记", "등록 지우기", "Effacer", "Cancella"));
  put("pref.summary.solo", six("ひとり旅", "Solo trip", "独自旅行", "혼자 여행", "Voyage solo", "Viaggio da solo"));
  put("pref.summary.couple", six("ふたり旅", "Couple trip", "两人旅行", "둘이 여행", "Voyage à deux", "Viaggio in coppia"));
  put("pref.summary.family", six("家族旅", "Family trip", "家人旅行", "가족 여행", "Voyage en famille", "Viaggio in famiglia"));
  put("pref.summary.friends", six("友人旅", "Friends trip", "朋友旅行", "친구 여행", "Voyage entre amis", "Viaggio con amici"));
  put("pref.summary.short", six("短時間", "Short visit", "短时", "짧은 시간", "Visite courte", "Visita breve"));
  put("pref.summary.half", six("半日", "Half day", "半天", "반나절", "Demi-journée", "Mezza giornata"));
  put("pref.summary.full", six("一日", "Full day", "一整天", "하루", "Journée", "Giornata"));
  put("pref.summary.low", six("負担少なめ", "Light effort", "负担较少", "부담 적음", "Effort léger", "Sforzo leggero"));
  put("pref.summary.medium", six("ほどほど", "Moderate effort", "适中", "적당", "Effort modéré", "Sforzo moderato"));
  put("pref.summary.high", six("坂道も平気", "Hills are fine", "不怕坡道", "언덕도 괜찮음", "Les pentes vont", "Le salite vanno bene"));
  put("pref.summary.avoid", six("混雑を避ける", "Avoid crowds", "避开拥挤", "혼잡을 피함", "Éviter la foule", "Evitare la folla"));
  put("pref.summary.neutral", six("混雑はほどほど", "Moderate crowds", "拥挤适中", "혼잡은 적당", "Affluence modérée", "Folla moderata"));
  put("pref.summary.okay", six("にぎわいも楽しむ", "Enjoy the bustle", "也享受热闹", "북적임도 즐김", "Aimer l’animation", "Gustare il via vai"));

  put("revisit.title", six("あなた向けの再訪", "Revisits for you", "为你推荐的再访", "당신을 위한 재방문", "Revisites pour vous", "Ritorni per te"));
  put("revisit.empty", six("保存した再訪プランはまだありません。発見からプランを選択できます。", "No saved revisit plan yet. You can pick one in Discover.", "还没有保存的再访计划。可在发现中选择。", "저장한 재방문 플랜이 아직 없습니다. 발견에서 고를 수 있습니다.", "Aucun plan de revisite enregistré. Vous pouvez en choisir un dans Découvrir.", "Nessun piano di ritorno salvato. Puoi sceglierne uno in Scopri."));
  put("revisit.savedOnly", six("端末内に保存したプランだけを表示しています。", "Only plans saved on this device are shown.", "仅显示保存在本机的计划。", "이 기기에 저장한 플랜만 표시합니다.", "Seuls les plans enregistrés sur cet appareil sont affichés.", "Sono mostrati solo i piani salvati su questo dispositivo."));
  put("revisit.savedPlan", six("保存した{season}の再訪プラン", "Saved {season} revisit plan", "已保存的{season}再访计划", "저장한 {season} 재방문 플랜", "Plan de revisite {season} enregistré", "Piano di ritorno {season} salvato"));
  put("revisit.planN", six("{season}の再訪プラン {n}", "{season} revisit plan {n}", "{season}再访计划 {n}", "{season} 재방문 플랜 {n}", "Plan de revisite {season} {n}", "Piano di ritorno {season} {n}"));
  put("revisit.editSaved", six("保存したプランを編集", "Edit saved plan", "编辑已保存计划", "저장한 플랜 편집", "Modifier le plan enregistré", "Modifica il piano salvato"));
  put("revisit.editChoose", six("このプランを選択・編集", "Select and edit this plan", "选择并编辑此计划", "이 플랜을 선택·편집", "Choisir et modifier ce plan", "Seleziona e modifica questo piano"));

  put("memory.none", six("この端末に残した旅は、まだありません。", "No trips saved on this device yet.", "本机还没有留下的旅行。", "이 기기에 남긴 여행이 아직 없습니다.", "Aucun voyage enregistré sur cet appareil.", "Nessun viaggio salvato su questo dispositivo."));
  put("memory.review", six("思い出を振り返る", "Look back on memories", "回顾回忆", "추억 돌아보기", "Revoir les souvenirs", "Rivedi i ricordi"));
  put("memory.title", six("思い出", "Memories", "回忆", "추억", "Souvenirs", "Ricordi"));
  put("memory.lead", six("この端末に残した場所と季節です。同じ季節は、次の候補から外れます。", "Places and seasons saved on this device. The same season leaves the next suggestions.", "这是保存在本机的地点与季节。同一季节会从下次候选中去掉。", "이 기기에 남긴 장소와 계절입니다. 같은 계절은 다음 후보에서 빠집니다.", "Lieux et saisons enregistrés ici. La même saison sort des prochaines suggestions.", "Luoghi e stagioni salvati qui. La stessa stagione esce dai prossimi suggerimenti."));
  put("memory.season", six("季節", "Season", "季节", "계절", "Saison", "Stagione"));
  put("memory.place", six("場所", "Place", "地点", "장소", "Lieu", "Luogo"));
  put("memory.save", six("この季節を残す", "Save this season", "留下这个季节", "이 계절을 남기기", "Enregistrer cette saison", "Salva questa stagione"));
  put("memory.duplicate", six("同じ場所の同じ季節は、すでに残しています。", "That place and season is already saved.", "同一地点的同一季节已经留下。", "같은 장소의 같은 계절은 이미 남겨 두었습니다.", "Ce lieu et cette saison sont déjà enregistrés.", "Quel luogo e stagione sono già salvati."));
  put("memory.removeAria", six("{season}の{place}を思い出から外す", "Remove {season} {place} from memories", "从回忆中移除{season}的{place}", "추억에서 {season} {place} 빼기", "Retirer {place} en {season} des souvenirs", "Togli {place} in {season} dai ricordi"));
  put("memory.visitLabel", six("{season}의{place}", "{season} · {place}", "{season}·{place}", "{season} · {place}", "{place} en {season}", "{place} in {season}"));
  put("memory.caption", six("{season}・{place}", "{season} · {place}", "{season}·{place}", "{season} · {place}", "{season} · {place}", "{season} · {place}"));

  put("discover.find", six("未訪問地を探す", "Find unvisited places", "寻找未到访地", "미방문지 찾기", "Trouver des lieux non visités", "Trova luoghi non visitati"));
  put("discover.none", six("今の条件で出せる場所はありません。", "No places match the current filters.", "按当前条件没有可显示的地点。", "지금 조건으로 낼 장소가 없습니다.", "Aucun lieu ne correspond aux filtres actuels.", "Nessun luogo corrisponde ai filtri attuali."));
  put("discover.planTitle", six("旅の計画", "Trip plan", "旅行计划", "여행 계획", "Plan de voyage", "Piano di viaggio"));
  put("discover.candidateTitle", six("次の旅の候補", "Ideas for the next trip", "下次旅行候选", "다음 여행 후보", "Idées pour le prochain voyage", "Idee per il prossimo viaggio"));
  put("discover.lead", six("季節、食、現地の人、移動の負担から提案します。", "Suggestions use season, food, local people, and walking effort.", "根据季节、美食、当地人和移动负担来建议。", "계절, 음식, 현지 사람, 이동 부담으로 제안합니다.", "Les suggestions tiennent compte de la saison, de la cuisine, des habitants et de l’effort.", "I suggerimenti usano stagione, cibo, persone del posto e sforzo."));
  put("discover.other", six("ほかの候補", "Other ideas", "其他候选", "다른 후보", "Autres idées", "Altre idee"));
  put("discover.pickOne", six("3枚から1枚を残す", "Keep 1 of 3 cards", "从3张中留下1张", "3장 중 1장 남기기", "Garder 1 carte sur 3", "Tieni 1 carta su 3"));
  put("discover.sample", six("匿名の合成サンプルを含む参考提案です。", "Reference ideas that include anonymous synthetic samples.", "包含匿名合成样本的参考建议。", "익명 합성 샘플을 포함한 참고 제안입니다.", "Suggestions de référence avec des échantillons synthétiques anonymes.", "Suggerimenti di riferimento con campioni sintetici anonimi."));
  put("discover.localOnly", six("端末内の記録だけで提案しています。", "Suggestions use only records on this device.", "仅根据本机记录提出建议。", "이 기기의 기록만으로 제안합니다.", "Suggestions basées uniquement sur les enregistrements de cet appareil.", "Suggerimenti basati solo sui dati di questo dispositivo."));

  put("mode.onsite", six("いま現地", "On site now", "正在当地", "지금 현지", "Sur place", "Sul posto"));
  put("mode.after", six("帰ったあと", "After returning", "回去之后", "돌아온 뒤", "Après le retour", "Dopo il ritorno"));
  put("mode.nowSeason", six("今の季節", "Current season", "现在的季节", "지금 계절", "Saison actuelle", "Stagione attuale"));
  put("mode.nextSeason", six("次行きたい季節", "Season for the next trip", "下次想去的季节", "다음에 가고 싶은 계절", "Saison du prochain voyage", "Stagione del prossimo viaggio"));

  put("plan.editTitle", six("再訪プランを編集", "Edit revisit plan", "编辑再访计划", "재방문 플랜 편집", "Modifier le plan de revisite", "Modifica il piano di ritorno"));
  put("plan.empty", six("ホームで再訪プランを選択してください。", "Choose a revisit plan on Home.", "请在首页选择再访计划。", "홈에서 재방문 플랜을 선택하세요.", "Choisissez un plan de revisite sur l’accueil.", "Scegli un piano di ritorno in Home."));
  put("plan.home", six("ホームに戻る", "Back to Home", "返回首页", "홈으로", "Retour à l’accueil", "Torna alla Home"));
  put("plan.freePick", six("{season}の場所を自由に選べます。", "You can freely pick {season} places.", "可自由选择{season}的地点。", "{season} 장소를 자유롭게 고를 수 있습니다.", "Vous pouvez choisir librement des lieux en {season}.", "Puoi scegliere liberamente i luoghi in {season}."));
  put("plan.selected", six("選択中の場所", "Selected places", "已选地点", "선택 중인 장소", "Lieux sélectionnés", "Luoghi selezionati"));
  put("plan.remove", six("削除", "Remove", "删除", "삭제", "Retirer", "Rimuovi"));
  put("plan.removeDisabled", six("1か所必要なため削除できません", "At least one place is required", "至少需要一处，无法删除", "1곳은 필요해서 삭제할 수 없습니다", "Au moins un lieu est requis", "Serve almeno un luogo"));
  put("plan.note", six("同じ季節のまま、1か所以上を自由に保存できます。", "Stay in the same season and save one or more places.", "保持同一季节，可自由保存一处以上。", "같은 계절 그대로 1곳 이상을 자유롭게 저장할 수 있습니다.", "Gardez la même saison et enregistrez un ou plusieurs lieux.", "Resta nella stessa stagione e salva uno o più luoghi."));
  put("plan.add", six("場所を追加", "Add a place", "添加地点", "장소 추가", "Ajouter un lieu", "Aggiungi un luogo"));
  put("plan.addPrefix", six("＋ {place}", "+ {place}", "＋ {place}", "＋ {place}", "+ {place}", "+ {place}"));
  put("plan.allSelected", six("同じ季節で追加できる場所は、すべて選択済みです。", "Every place in this season is already selected.", "这个季节可添加的地点都已选中。", "같은 계절에서 추가할 장소는 모두 선택했습니다.", "Tous les lieux de cette saison sont déjà sélectionnés.", "Tutti i luoghi di questa stagione sono già selezionati."));
  put("plan.save", six("このプランを保存", "Save this plan", "保存此计划", "이 플랜 저장", "Enregistrer ce plan", "Salva questo piano"));
  put("plan.saved", six("再訪プランを保存しました。ホームで確認できます。", "Revisit plan saved. You can check it on Home.", "已保存再访计划。可在首页查看。", "재방문 플랜을 저장했습니다. 홈에서 확인할 수 있습니다.", "Plan de revisite enregistré. Vous pouvez le voir sur l’accueil.", "Piano di ritorno salvato. Puoi vederlo in Home."));
  put("plan.reset", six("元の提案に戻す", "Restore original ideas", "恢复原来的建议", "원래 제안으로", "Revenir aux idées d’origine", "Ripristina le idee originali"));
  put("plan.cancel", six("編集をやめる", "Cancel editing", "取消编辑", "편집 그만두기", "Annuler la modification", "Annulla modifica"));

  put("notices.title", six("お知らせ", "Notices", "通知", "알림", "Infos", "Avvisi"));
  put("notices.lead", six("名店の季節メニュー、地元の話題、参加できる催しを、このPCから発信した文として出しています。", "Seasonal menus, local notes, and events are published from this PC.", "名店季节菜单、本地话题和可参加的活动由这台电脑发布。", "명점의 계절 메뉴, 지역 소식, 참여할 수 있는 행사를 이 PC에서 낸 글로 보여 줍니다.", "Menus de saison, notes locales et événements sont publiés depuis cet ordinateur.", "Menu di stagione, note locali ed eventi sono pubblicati da questo PC."));
  put("notices.menu", six("名店の新メニュー／季節のメニュー", "New and seasonal menus", "名店新菜单／季节菜单", "명점의 새 메뉴／계절 메뉴", "Nouveaux menus et menus de saison", "Nuovi menu e menu di stagione"));
  put("notices.local", six("地元の最新情報", "Local updates", "本地最新信息", "지역 최신 정보", "Infos locales", "Aggiornamenti locali"));
  put("notices.event", six("季節のイベント", "Seasonal events", "季节活动", "계절 이벤트", "Événements de saison", "Eventi di stagione"));
  put("notices.empty", six("いま出せる話題はありません。", "No topics to show right now.", "现在没有可显示的话题。", "지금 낼 이야기가 없습니다.", "Aucun sujet à afficher pour le moment.", "Nessun argomento da mostrare ora."));
  put("home.continue", six("主催者からの続き", "A next visit from the organizers", "主办方提供的下次行程", "주최 측이 전하는 다음 방문", "La suite proposée par les organisateurs", "Il seguito proposto dagli organizzatori"));
  put("home.continueLead", six("次の季節の景色・食・催しを、このPCから出しています。", "Next-season scenery, food, and events are published from this PC.", "下一季的风景、饮食和活动由这台电脑发布。", "다음 계절의 풍경·음식·행사를 이 PC에서 냅니다.", "Paysages, plats et événements de la saison suivante sont publiés depuis cet ordinateur.", "Paesaggi, cibi ed eventi della stagione successiva sono pubblicati da questo PC."));
  put("home.deviceNote", six("このPC内の再訪の参考として、氏名のない端末の記録を使います。", "An unnamed device record on this PC is used only as a local revisit reference.", "仅在这台电脑内用无名的设备记录作为再访参考。", "이 PC 안에서만, 이름 없는 기기 기록을 재방문 참고로 씁니다.", "Un enregistrement d’appareil sans nom sur cet ordinateur sert uniquement de référence de revisite locale.", "Un record del dispositivo senza nome su questo PC serve solo come riferimento locale di ritorno."));

  put("cards.title", six("3枚を、自分の旅に", "Make 3 cards your own trip", "把3张变成自己的旅行", "3장을 나의 여행으로", "Faire des 3 cartes votre voyage", "Rendi le 3 carte il tuo viaggio"));
  put("cards.lead", six("初期案の場所と理由を入れ替え、次の1枚だけ残します。", "Swap places and reasons, then keep only one card.", "可更换初始方案的地点和理由，只留下下一张。", "초기안의 장소와 이유를 바꾸고, 다음 1장만 남깁니다.", "Échangez lieux et raisons, puis gardez une seule carte.", "Scambia luoghi e motivi, poi tieni una sola carta."));
  put("cards.none", six("今の条件で出せるカードはありません。", "No cards match the current filters.", "按当前条件没有可显示的卡片。", "지금 조건으로 낼 카드가 없습니다.", "Aucune carte ne correspond aux filtres actuels.", "Nessuna carta corrisponde ai filtri attuali."));
  put("cards.keep", six("この1枚を残す", "Keep this card", "留下这一张", "이 1장 남기기", "Garder cette carte", "Tieni questa carta"));
  put("cards.choose", six("この1枚にする", "Choose this card", "选这一张", "이 1장으로", "Choisir cette carte", "Scegli questa carta"));
  put("cards.reason", six("理由", "Reason", "理由", "이유", "Raison", "Motivo"));
  put("cards.place", six("場所", "Place", "地点", "장소", "Lieu", "Luogo"));
  put("cards.save", six("編集した1枚を保存する", "Save the edited card", "保存编辑后的一张", "편집한 1장 저장", "Enregistrer la carte modifiée", "Salva la carta modificata"));
  put("cards.minutes", six("{area}・{n}分", "{area} · {n} min", "{area}·{n}分钟", "{area} · {n}분", "{area} · {n} min", "{area} · {n} min"));

  put("meta.reason", six("理由", "Reason", "理由", "이유", "Raison", "Motivo"));
  put("meta.minutes", six("所要", "Time", "所需", "소요", "Durée", "Durata"));
  put("meta.minutesValue", six("{n}分", "{n} min", "{n}分钟", "{n}분", "{n} min", "{n} min"));
  put("meta.access", six("移動", "Access", "交通", "이동", "Accès", "Accesso"));
  put("meta.steps", six("歩行", "Walking", "步行", "보행", "Marche", "Cammino"));
  put("meta.rest", six("休憩", "Rest", "休息", "휴식", "Pause", "Pausa"));
  put("meta.crowd", six("混雑", "Crowds", "拥挤", "혼잡", "Affluence", "Folla"));
  put("meta.food", six("食", "Food", "美食", "음식", "Cuisine", "Cibo"));
  put("meta.event", six("現地", "On site", "现场", "현장", "Sur place", "Sul posto"));

  put("feedback.title", six("この旅はどうでしたか？", "How was this trip?", "这次旅行怎么样？", "이번 여행은 어땠나요?", "Comment était ce voyage ?", "Com’è stato questo viaggio?"));
  put("feedback.satisfaction", six("満足度", "Satisfaction", "满意度", "만족도", "Satisfaction", "Soddisfazione"));
  put("feedback.satisfactionAria", six("満足度{n}", "Satisfaction {n}", "满意度{n}", "만족도 {n}", "Satisfaction {n}", "Soddisfazione {n}"));
  put("feedback.revisitQ", six("また行きたい？", "Want to go again?", "还想再去吗？", "또 가고 싶나요?", "Envie d’y retourner ?", "Vuoi tornarci?"));
  put("feedback.yes", six("また行きたい", "Want to go again", "还想再去", "또 가고 싶다", "J’aimerais y retourner", "Vorrei tornarci"));
  put("feedback.no", six("そうでもない", "Not really", "不太想", "그렇지는 않다", "Pas vraiment", "Non proprio"));
  put("feedback.comment", six("コメント（200文字まで）", "Comment (up to 200 characters)", "评论（最多200字）", "댓글(200자까지)", "Commentaire (200 caractères max.)", "Commento (massimo 200 caratteri)"));
  put("feedback.commentAria", six("この旅のコメント", "Comment on this trip", "这次旅行的评论", "이번 여행 댓글", "Commentaire sur ce voyage", "Commento su questo viaggio"));
  put("feedback.note", six("この端末に残すか、同じPCの参考口コミにもできます。氏名は使いません。", "Save it on this device, or share it as a local review on this PC. Names are not used.", "可留在本机，也可作为同一电脑上的参考评价。不使用姓名。", "이 기기에 남기거나, 같은 PC의 참고 후기로도 할 수 있습니다. 이름은 쓰지 않습니다.", "Gardez-le sur cet appareil ou partagez-le comme avis local sur ce PC. Aucun nom n’est utilisé.", "Salvalo su questo dispositivo o condividilo come recensione locale su questo PC. I nomi non si usano."));
  put("feedback.saveLocal", six("コメントを残す", "Save comment", "留下评论", "댓글 남기기", "Enregistrer le commentaire", "Salva il commento"));
  put("feedback.savedLocal", six("この端末に残しました。", "Saved on this device.", "已留在本机。", "이 기기에 남겼습니다.", "Enregistré sur cet appareil.", "Salvato su questo dispositivo."));
  put("feedback.publish", six("参考口コミにする", "Share as a review", "作为参考评价", "참고 후기로 하기", "En faire un avis", "Condividi come recensione"));
  put("feedback.needBoth", six("満足度とコメントを入れてから公開できます。", "Add a rating and a comment before sharing.", "填写满意度和评论后才能公开。", "만족도와 댓글을 넣은 뒤에 공개할 수 있습니다.", "Ajoutez une note et un commentaire avant de partager.", "Aggiungi voto e commento prima di condividere."));
  put("feedback.published", six("参考口コミとして残しました。氏名は保存していません。", "Saved as a local review. No name was stored.", "已作为参考评价留下。未保存姓名。", "참고 후기로 남겼습니다. 이름은 저장하지 않았습니다.", "Enregistré comme avis local. Aucun nom n’a été stocké.", "Salvato come recensione locale. Nessun nome è stato salvato."));
  put("feedback.needServer", six("公開には node serve.js が必要です。コメントはこの端末に残しています。", "Sharing needs node serve.js. The comment stays on this device.", "公开需要 node serve.js。评论已留在本机。", "공개에는 node serve.js가 필요합니다. 댓글은 이 기기에 남겨 두었습니다.", "Le partage nécessite node serve.js. Le commentaire reste sur cet appareil.", "Per condividere serve node serve.js. Il commento resta su questo dispositivo."));
  put("reviews.title", six("参考口コミ", "Local reviews", "参考评价", "참고 후기", "Avis locaux", "Recensioni locali"));
  put("reviews.note", six("同じPCの匿名口コミです。氏名は含まれません。", "Anonymous reviews on this PC. Names are not included.", "同一电脑上的匿名评价。不含姓名。", "같은 PC의 익명 후기입니다. 이름은 포함되지 않습니다.", "Avis anonymes sur ce PC. Aucun nom n’est inclus.", "Recensioni anonime su questo PC. I nomi non sono inclusi."));
  put("reviews.empty", six("まだ参考口コミはありません。", "No local reviews yet.", "还没有参考评价。", "아직 참고 후기가 없습니다.", "Pas encore d’avis locaux.", "Ancora nessuna recensione locale."));
  put("reviews.loading", six("読み込み中です。", "Loading.", "正在读取。", "불러오는 중입니다.", "Chargement.", "Caricamento."));
  put("reviews.offline", six("口コミは、このPCで node serve.js を起動しているときに読めます。", "Reviews can be read when node serve.js is running on this PC.", "评价可在本电脑运行 node serve.js 时读取。", "후기는 이 PC에서 node serve.js를 실행 중일 때 읽을 수 있습니다.", "Les avis se lisent lorsque node serve.js tourne sur ce PC.", "Le recensioni si leggono quando node serve.js è in esecuzione su questo PC."));
  put("reviews.metaYes", six("満足度{n}・また行きたい", "Satisfaction {n} · want to go again", "满意度{n}·还想再去", "만족도 {n} · 또 가고 싶다", "Satisfaction {n} · envie d’y retourner", "Soddisfazione {n} · vorrei tornarci"));
  put("reviews.metaNo", six("満足度{n}・そうでもない", "Satisfaction {n} · not really", "满意度{n}·不太想", "만족도 {n} · 그렇지는 않다", "Satisfaction {n} · pas vraiment", "Soddisfazione {n} · non proprio"));

  put("detail.recordDate", six("{date}の記録", "Record from {date}", "{date}的记录", "{date}의 기록", "Souvenir du {date}", "Ricordo del {date}"));
  put("detail.recordNoDate", six("この端末に残した季節の記録です。", "A seasonal record saved on this device.", "这是保存在本机的季节记录。", "이 기기에 남긴 계절 기록입니다.", "Un souvenir de saison enregistré sur cet appareil.", "Un ricordo di stagione salvato su questo dispositivo."));
  put("detail.reasons", six("おすすめの理由", "Why we suggest this", "推荐理由", "추천 이유", "Pourquoi nous le proposons", "Perché lo consigliamo"));
  put("detail.dismiss", six("今回は見送る", "Skip this time", "这次先跳过", "이번은 보류", "Passer cette fois", "Salta questa volta"));
  put("detail.areaSeason", six("{area}・{season}", "{area} · {season}", "{area}·{season}", "{area} · {season}", "{area} · {season}", "{area} · {season}"));

  put("notice.promiseTitle", six("約束の季節になりました", "The promised season is here", "约定的季节到了", "약속한 계절이 되었습니다", "La saison promise est arrivée", "È arrivata la stagione promessa"));
  put("notice.promiseBody", six("{title}が、いまの候補です。", "{title} is a current idea.", "{title}是现在的候选。", "{title}이(가) 지금 후보입니다.", "{title} est une idée actuelle.", "{title} è un’idea attuale."));
  put("notice.promiseEmpty", six("残した1枚を確認してください。", "Check the card you saved.", "请确认留下的那一张。", "남긴 1장을 확인하세요.", "Vérifiez la carte enregistrée.", "Controlla la carta salvata."));
  put("notice.confirm", six("確認する", "Check", "确认", "확인하기", "Vérifier", "Controlla"));
  put("notice.laterTitle", six("{season}に開くと表示します", "Shown when you open {season}", "在打开{season}时显示", "{season}을(를) 열면 표시합니다", "Affiché à l’ouverture de {season}", "Mostrato all’apertura di {season}"));
  put("notice.savedCard", six("残した1枚", "Saved card", "留下的一张", "남긴 1장", "Carte enregistrée", "Carta salvata"));
  put("notice.see", six("お知らせを見る", "See notices", "查看通知", "알림 보기", "Voir les infos", "Vedi gli avvisi"));
  put("notice.emptyTitle", six("お知らせ", "Notices", "通知", "알림", "Infos", "Avvisi"));
  put("notice.emptyBody", six("名店のメニューや地元の催しは、お知らせから見られます。", "Menus and local events are in Notices.", "名店菜单和本地活动可在通知中查看。", "명점 메뉴와 지역 행사는 알림에서 볼 수 있습니다.", "Menus et événements locaux sont dans Infos.", "Menu ed eventi locali sono in Avvisi."));

  put("rec.diffSeason", six("前回とは違う{season}の体験", "A {season} experience different from last time", "与上次不同的{season}体验", "이전과 다른 {season} 체험", "Une expérience {season} différente de la dernière fois", "Un’esperienza {season} diversa dall’ultima volta"));
  put("rec.highSatisfaction", six("以前の満足度が高い場所", "A place with high past satisfaction", "过去满意度高的地点", "이전 만족도가 높은 장소", "Un lieu déjà très apprécié", "Un luogo già molto apprezzato"));
  put("rec.sampleLiked", six("似た旅行スタイルの合成サンプルで好評", "Well liked in similar synthetic travel styles", "在相似旅行风格的合成样本中评价好", "비슷한 여행 스타일의 합성 샘플에서 호평", "Apprécié dans des styles de voyage synthétiques similaires", "Apprezzato in stili di viaggio sintetici simili"));
  put("rec.interest", six("好みの「{interest}」に合う", "Matches your interest in {interest}", "符合你喜欢的「{interest}」", "취향의 「{interest}」에 맞음", "Correspond à votre intérêt pour {interest}", "Corrisponde al tuo interesse per {interest}"));
  put("rec.lowBurden", six("移動負担を抑えやすい", "Easier on walking effort", "较容易控制移动负担", "이동 부담을 줄이기 쉬움", "Plus facile pour l’effort de déplacement", "Più leggero per lo spostamento"));
  put("rec.seasonFit", six("今の季節と所要時間に合う", "Fits the current season and time", "符合当前季节和所需时间", "지금 계절과 소요 시간에 맞음", "Convient à la saison et à la durée actuelles", "Si adatta a stagione e durata attuali"));
  put("rec.similarChoice", six("これまでの選択に近い", "Close to your past choices", "接近以往的选择", "지금까지의 선택에 가까움", "Proche de vos choix passés", "Vicino alle tue scelte passate"));

  /* 場所名と地区 */
  put("spot.shio.name", six("星綾の潮見台", "Hoshia Tide Lookout", "星绫观潮台", "호시아 조망대", "Belvédère de marée Hoshia", "Belvedere di marea Hoshia"));
  put("spot.shio.area", six("薄青岬", "Usuao Cape", "薄青岬", "우스아오 곶", "Cap Usuao", "Capo Usuao"));
  put("spot.todai.name", six("風詠みの灯台", "Kazeyomi Lighthouse", "风咏灯塔", "가제요미 등대", "Phare Kazeyomi", "Faro Kazeyomi"));
  put("spot.todai.area", six("白波離島", "Shiranami Isle", "白波离岛", "시라나미 섬", "Île Shiranami", "Isola Shiranami"));
  put("spot.yoichi.name", six("虹灯りの夜市", "Nijibori Night Market", "虹灯夜市", "니지보리 야시장", "Marché nocturne Nijibori", "Mercato notturno Nijibori"));
  put("spot.yoichi.area", six("虹帆町", "Nijibo Town", "虹帆町", "니지보 마을", "Ville de Nijibo", "Città di Nijibo"));
  put("spot.mizu.name", six("瑠璃凪の水鏡湖", "Rurinagi Mirror Lake", "琉璃凪水镜湖", "루리나기 수경호", "Lac miroir Rurinagi", "Lago specchio Rurinagi"));
  put("spot.mizu.area", six("雫森谷", "Shizumori Valley", "雫森谷", "시즈모리 계곡", "Vallée Shizumori", "Valle Shizumori"));
  put("spot.kaza.name", six("月花の風車丘", "Tsukihana Windmill Hill", "月花风车丘", "츠키하나 풍차언덕", "Colline aux moulins Tsukihana", "Collina dei mulini Tsukihana"));
  put("spot.kaza.area", six("月灯集落", "Tsukito Hamlet", "月灯村落", "츠키토 마을", "Hameau Tsukito", "Borgo Tsukito"));
  put("spot.ishi.name", six("灯雲の石畳通り", "Touun Stone Street", "灯云石板路", "토운 돌길", "Rue pavée Touun", "Vicolo lastricato Touun"));
  put("spot.ishi.area", six("星綴港", "Hoshitsuzuri Port", "星缀港", "호시츠즈리 항구", "Port Hoshitsuzuri", "Porto Hoshitsuzuri"));
  put("spot.oto.name", six("雪雫の音楽堂", "Yukishizuku Concert Hall", "雪雫音乐堂", "유키시즈쿠 음악당", "Salle de musique Yukishizuku", "Sala da musica Yukishizuku"));
  put("spot.oto.area", six("鈴風高原", "Suzukaze Heights", "铃风高原", "스즈카제 고원", "Plateau Suzukaze", "Altopiano Suzukaze"));

  function offering(spotId, season, title, detail, food, event, access, steps, rest, crowd) {
    put("offering." + spotId + "." + season + ".title", title);
    put("offering." + spotId + "." + season + ".detail", detail);
    put("offering." + spotId + "." + season + ".food", food);
    put("offering." + spotId + "." + season + ".event", event);
    put("offering." + spotId + "." + season + ".access", access);
    put("offering." + spotId + "." + season + ".steps", steps);
    put("offering." + spotId + "." + season + ".rest", rest);
    put("offering." + spotId + "." + season + ".crowd", crowd);
  }

  var empty = six("", "", "", "", "", "");
  offering("shio", "spring",
    six("潮見台", "Tide lookout", "观潮台", "조망대", "Belvédère", "Belvedere"),
    six("桜と水平線が重なる午前。", "Morning when cherry blossoms meet the horizon.", "樱花与海平线重叠的上午。", "벚꽃과 수평선이 겹치는 오전.", "Un matin où les cerisiers rejoignent l’horizon.", "Una mattina in cui i ciliegi incontrano l’orizzonte."),
    empty, empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("段差は少ない", "Few steps", "台阶很少", "단차가 적음", "Peu de marches", "Pochi dislivelli"),
    six("展望台にベンチ", "Benches at the lookout", "观景台有长椅", "전망대에 벤치", "Bancs au belvédère", "Panchine al belvedere"),
    six("午前は空いている", "Quiet in the morning", "上午较空", "오전은 한산함", "Calme le matin", "Tranquillo al mattino")
  );
  offering("shio", "summer",
    six("潮見台", "Tide lookout", "观潮台", "조망대", "Belvédère", "Belvedere"),
    six("風の強い昼に塩レモンを食べる。", "Eat salt lemon on a windy midday.", "在风大的中午吃盐柠檬。", "바람이 센 낮에 소금레몬을 먹는다.", "Manger un citron salé par un midi venteux.", "Mangiare limone salato in un mezzogiorno ventoso."),
    six("塩レモン", "Salt lemon", "盐柠檬", "소금레몬", "Citron salé", "Limone salato"),
    empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("段差は少ない", "Few steps", "台阶很少", "단차가 적음", "Peu de marches", "Pochi dislivelli"),
    six("展望台にベンチ", "Benches at the lookout", "观景台有长椅", "전망대에 벤치", "Bancs au belvédère", "Panchine al belvedere"),
    six("昼は人が増える", "Busier at midday", "中午人会增多", "낮에는 사람이 늘어남", "Plus de monde à midi", "Più gente a mezzogiorno")
  );
  offering("shio", "autumn",
    six("潮見台", "Tide lookout", "观潮台", "조망대", "Belvédère", "Belvedere"),
    six("夕景の語り部が港の話をする。", "An evening storyteller talks about the harbor.", "晚景说书人讲述港口的故事。", "저녁 풍경 이야기꾼이 항구 이야기를 한다.", "Un conteur du soir parle du port.", "Un narratore serale racconta il porto."),
    empty,
    six("夕景の語り部", "Evening storyteller", "晚景说书", "저녁 풍경 이야기꾼", "Conteur du soir", "Narratore serale"),
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("段差は少ない", "Few steps", "台阶很少", "단차가 적음", "Peu de marches", "Pochi dislivelli"),
    six("展望台にベンチ", "Benches at the lookout", "观景台有长椅", "전망대에 벤치", "Bancs au belvédère", "Panchine al belvedere"),
    six("夕方は混む", "Crowded in the evening", "傍晚会拥挤", "저녁에는 붐빔", "Animé le soir", "Affollato la sera")
  );
  offering("shio", "winter",
    six("潮見台", "Tide lookout", "观潮台", "조망대", "Belvédère", "Belvedere"),
    six("空気が澄み、島の線が近い。", "Clear air brings the island outline close.", "空气清澈，岛屿轮廓很近。", "공기가 맑아 섬의 선이 가깝다.", "L’air clair rapproche le trait de l’île.", "L’aria limpida avvicina il profilo dell’isola."),
    empty, empty,
    six("バスの本数が少ない", "Fewer buses", "班次较少", "버스 횟수가 적음", "Moins de bus", "Meno autobus"),
    six("段差は少ない", "Few steps", "台阶很少", "단차가 적음", "Peu de marches", "Pochi dislivelli"),
    six("室内待合は小さい", "Small indoor waiting area", "室内候车处较小", "실내 대합실은 작음", "Petite salle d’attente", "Piccola sala d’attesa"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("todai", "spring",
    six("灯台", "Lighthouse", "灯塔", "등대", "Phare", "Faro"),
    six("灯台守が朝の風向きを教える。", "The keeper explains the morning wind.", "灯塔看守讲解早晨风向。", "등대 지기가 아침 바람 방향을 알려 준다.", "Le gardien explique le vent du matin.", "Il guardiano spiega il vento del mattino."),
    empty,
    six("朝の灯台案内", "Morning lighthouse tour", "早晨灯塔导览", "아침 등대 안내", "Visite du phare le matin", "Visita del faro al mattino"),
    six("船のあと徒歩", "Boat then walk", "乘船后步行", "배 탄 뒤 걷기", "Bateau puis marche", "Barca e poi a piedi"),
    six("階段が多い", "Many stairs", "楼梯较多", "계단이 많음", "Beaucoup d’escaliers", "Molte scale"),
    six("麓に茶屋", "Teahouse at the foot", "山脚有茶馆", "기슭에 찻집", "Maison de thé au pied", "Casa da tè ai piedi"),
    six("午前は空いている", "Quiet in the morning", "上午较空", "오전은 한산함", "Calme le matin", "Tranquillo al mattino")
  );
  offering("todai", "summer",
    six("灯台", "Lighthouse", "灯塔", "등대", "Phare", "Faro"),
    six("入道雲の下で海が白い。", "The sea turns white under summer clouds.", "积雨云下海面发白。", "입도운 아래 바다가 하얗다.", "La mer blanchit sous les nuages d’été.", "Il mare diventa bianco sotto le nubi estive."),
    empty, empty,
    six("船のあと徒歩", "Boat then walk", "乘船后步行", "배 탄 뒤 걷기", "Bateau puis marche", "Barca e poi a piedi"),
    six("階段が多い", "Many stairs", "楼梯较多", "계단이 많음", "Beaucoup d’escaliers", "Molte scale"),
    six("麓に茶屋", "Teahouse at the foot", "山脚有茶馆", "기슭에 찻집", "Maison de thé au pied", "Casa da tè ai piedi"),
    six("午後は混む", "Crowded in the afternoon", "下午会拥挤", "오후는 붐빔", "Animé l’après-midi", "Affollato nel pomeriggio")
  );
  offering("todai", "autumn",
    six("灯台", "Lighthouse", "灯塔", "등대", "Phare", "Faro"),
    six("磯の焼き魚を麓で食べる。", "Eat grilled shore fish at the foot of the hill.", "在山脚吃矶边烤鱼。", "기슭에서 갯바위 생선구이를 먹는다.", "Manger du poisson grillé au pied de la colline.", "Mangiare pesce alla griglia ai piedi della collina."),
    six("磯の焼き魚", "Grilled shore fish", "矶边烤鱼", "갯바위 생선구이", "Poisson grillé du rivage", "Pesce alla griglia di scoglio"),
    empty,
    six("船のあと徒歩", "Boat then walk", "乘船后步行", "배 탄 뒤 걷기", "Bateau puis marche", "Barca e poi a piedi"),
    six("階段が多い", "Many stairs", "楼梯较多", "계단이 많음", "Beaucoup d’escaliers", "Molte scale"),
    six("麓に茶屋", "Teahouse at the foot", "山脚有茶馆", "기슭에 찻집", "Maison de thé au pied", "Casa da tè ai piedi"),
    six("昼は普通", "Normal at midday", "中午一般", "낮은 보통", "Normal à midi", "Normale a mezzogiorno")
  );
  offering("todai", "winter",
    six("灯台", "Lighthouse", "灯塔", "등대", "Phare", "Faro"),
    six("風が強く、灯台の光が早い。", "Strong wind, and the lighthouse light comes early.", "风大，灯塔的光来得早。", "바람이 세고 등대 빛이 이르다.", "Vent fort, et la lumière du phare arrive tôt.", "Vento forte, e la luce del faro arriva presto."),
    empty, empty,
    six("船の便が少ない", "Fewer boats", "船班较少", "배편이 적음", "Moins de bateaux", "Meno traghetti"),
    six("階段が多い", "Many stairs", "楼梯较多", "계단이 많음", "Beaucoup d’escaliers", "Molte scale"),
    six("麓の茶屋は短時間", "Teahouse open briefly", "山脚茶馆开放时间短", "기슭 찻집은 짧은 시간", "Maison de thé ouverte peu de temps", "Casa da tè aperta poco"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("yoichi", "spring",
    six("夜市", "Night market", "夜市", "야시장", "Marché nocturne", "Mercato notturno"),
    six("桜餅の屋台が並ぶ夕方。", "Evening stalls of cherry-blossom sweets.", "摆出樱饼摊位的傍晚。", "벚꽃떡 포장마차가 늘어선 저녁.", "Un soir de stands de gâteaux aux cerisiers.", "Una sera di bancarelle di dolci ai ciliegi."),
    six("桜餅", "Cherry-blossom sweets", "樱饼", "벚꽃떡", "Gâteau aux cerisiers", "Dolce ai ciliegi"),
    empty,
    six("徒歩圏", "Walkable", "步行可达", "도보권", "À pied", "A piedi"),
    six("平坦", "Flat", "平坦", "평탄", "Plat", "Piatto"),
    six("屋台の席", "Stall seating", "摊位座位", "포장마차 자리", "Places aux stands", "Posti alle bancarelle"),
    six("夕方から混む", "Crowded from evening", "傍晚开始拥挤", "저녁부터 붐빔", "Animé dès le soir", "Affollato dalla sera")
  );
  offering("yoichi", "summer",
    six("夜市", "Night market", "夜市", "야시장", "Marché nocturne", "Mercato notturno"),
    six("暗くなるのが遅く、灯りがにじむ。", "Late dusk makes the lights blur.", "天黑得晚，灯光晕开。", "어두워지는 게 늦어 불빛이 번진다.", "La nuit tombe tard et les lumières se fondent.", "Il buio arriva tardi e le luci si sfumano."),
    empty, empty,
    six("徒歩圏", "Walkable", "步行可达", "도보권", "À pied", "A piedi"),
    six("平坦", "Flat", "平坦", "평탄", "Plat", "Piatto"),
    six("屋台の席", "Stall seating", "摊位座位", "포장마차 자리", "Places aux stands", "Posti alle bancarelle"),
    six("夜は混む", "Crowded at night", "夜里拥挤", "밤은 붐빔", "Animé la nuit", "Affollato di notte")
  );
  offering("yoichi", "autumn",
    six("夜市", "Night market", "夜市", "야시장", "Marché nocturne", "Mercato notturno"),
    six("栗の屋台が通りの中央に出る。", "Chestnut stalls come out in the middle of the street.", "栗子摊摆到街道中央。", "밤 포장마차가 거리 한가운데에 나온다.", "Des stands de châtaignes sortent au milieu de la rue.", "Bancarelle di castagne in mezzo alla via."),
    six("栗の屋台", "Chestnut stall", "栗子摊", "밤 포장마차", "Stand de châtaignes", "Bancarella di castagne"),
    empty,
    six("徒歩圏", "Walkable", "步行可达", "도보권", "À pied", "A piedi"),
    six("平坦", "Flat", "平坦", "평탄", "Plat", "Piatto"),
    six("屋台の席", "Stall seating", "摊位座位", "포장마차 자리", "Places aux stands", "Posti alle bancarelle"),
    six("夕方は混む", "Crowded in the evening", "傍晚会拥挤", "저녁은 붐빔", "Animé le soir", "Affollato la sera")
  );
  offering("yoichi", "winter",
    six("夜市", "Night market", "夜市", "야시장", "Marché nocturne", "Mercato notturno"),
    six("冬至の夜に店主が一杯を出す。", "On the winter-solstice night, a stall owner offers a cup.", "冬至夜里店主会端上一杯。", "동지 밤에 주인이 한 잔을 낸다.", "Le soir du solstice, un commerçant offre une tasse.", "Nella notte del solstizio il titolare offre una tazza."),
    empty,
    six("冬至の夜市", "Winter-solstice night market", "冬至夜市", "동지 야시장", "Marché du solstice d’hiver", "Mercato del solstizio d’inverno"),
    six("徒歩圏", "Walkable", "步行可达", "도보권", "À pied", "A piedi"),
    six("平坦", "Flat", "平坦", "평탄", "Plat", "Piatto"),
    six("屋内の席がある", "Indoor seating", "有室内座位", "실내 자리가 있음", "Places à l’intérieur", "Posti al coperto"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("mizu", "spring",
    six("水鏡湖", "Mirror lake", "水镜湖", "수경호", "Lac miroir", "Lago specchio"),
    six("湖面に桜が落ちる。", "Cherry blossoms fall on the lake.", "樱花落在湖面上。", "호수 면에 벚꽃이 떨어진다.", "Les cerisiers tombent sur le lac.", "I ciliegi cadono sul lago."),
    empty, empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("湖畔は平坦", "Flat lakeside path", "湖畔平坦", "호숫가는 평탄", "Berge plate", "Sponda piatta"),
    six("東屋", "Pavilion", "凉亭", "정자", "Kiosque", "Chiosco"),
    six("午前は空いている", "Quiet in the morning", "上午较空", "오전은 한산함", "Calme le matin", "Tranquillo al mattino")
  );
  offering("mizu", "summer",
    six("水鏡湖", "Mirror lake", "水镜湖", "수경호", "Lac miroir", "Lago specchio"),
    six("船頭が対岸まで渡す。", "A boatman ferries you to the opposite shore.", "船夫送到对岸。", "뱃사공이 맞은편까지 건넨다.", "Un passeur vous mène à l’autre rive.", "Un barcaiolo ti porta all’altra sponda."),
    empty,
    six("湖の船頭", "Lake boatman", "湖上的船夫", "호수 뱃사공", "Passeur du lac", "Barcaiolo del lago"),
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("桟橋に段差", "A step at the pier", "码头有台阶", "선창에 단차", "Une marche au ponton", "Un dislivello al pontile"),
    six("東屋", "Pavilion", "凉亭", "정자", "Kiosque", "Chiosco"),
    six("昼は普通", "Normal at midday", "中午一般", "낮은 보통", "Normal à midi", "Normale a mezzogiorno")
  );
  offering("mizu", "autumn",
    six("水鏡湖", "Mirror lake", "水镜湖", "수경호", "Lac miroir", "Lago specchio"),
    six("逆さの山が湖に入る。", "Inverted mountains enter the lake.", "倒影的山进入湖中。", "거꾸로 된 산이 호수에 들어간다.", "Les montagnes inversées entrent dans le lac.", "Le montagne capovolte entrano nel lago."),
    empty, empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("湖畔は平坦", "Flat lakeside path", "湖畔平坦", "호숫가는 평탄", "Berge plate", "Sponda piatta"),
    six("東屋", "Pavilion", "凉亭", "정자", "Kiosque", "Chiosco"),
    six("午後は普通", "Normal in the afternoon", "下午一般", "오후는 보통", "Normal l’après-midi", "Normale nel pomeriggio")
  );
  offering("mizu", "winter",
    six("水鏡湖", "Mirror lake", "水镜湖", "수경호", "Lac miroir", "Lago specchio"),
    six("湖畔で甘酒を飲む。", "Drink sweet rice drink by the lake.", "在湖畔喝甜酒酿。", "호숫가에서 단술을 마신다.", "Boire un amazake au bord du lac.", "Bere amazake sulla sponda."),
    six("湖畔の甘酒", "Lakeside sweet rice drink", "湖畔甜酒酿", "호숫가 단술", "Amazake au bord du lac", "Amazake sulla sponda"),
    empty,
    six("バスの本数が少ない", "Fewer buses", "班次较少", "버스 횟수가 적음", "Moins de bus", "Meno autobus"),
    six("湖畔は平坦", "Flat lakeside path", "湖畔平坦", "호숫가는 평탄", "Berge plate", "Sponda piatta"),
    six("東屋は風を避けにくい", "The pavilion gives little wind shelter", "凉亭不太挡风", "정자는 바람을 피하기 어려움", "Le kiosque abrite peu du vent", "Il chiosco ripara poco dal vento"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("kaza", "spring",
    six("風車丘", "Windmill hill", "风车丘", "풍차언덕", "Colline aux moulins", "Collina dei mulini"),
    six("菜の花弁当を丘の上で食べる。", "Eat a rapeseed-flower lunch on the hill.", "在小丘上吃油菜花便当。", "유채꽃 도시락을 언덕 위에서 먹는다.", "Manger un bento aux fleurs de colza sur la colline.", "Mangiare un bento ai fiori di colza sulla collina."),
    six("菜の花弁当", "Rapeseed-flower lunch", "油菜花便当", "유채꽃 도시락", "Bento aux fleurs de colza", "Bento ai fiori di colza"),
    empty,
    six("バスのあと上り", "Bus then uphill", "公交后上坡", "버스 탄 뒤 오르막", "Bus puis montée", "Autobus e poi salita"),
    six("坂と段差が多い", "Many slopes and steps", "坡道和台阶多", "언덕과 단차가 많음", "Beaucoup de pentes et de marches", "Molte salite e dislivelli"),
    six("丘の中腹にベンチ", "Benches halfway up", "半山腰有长椅", "언덕 중턱에 벤치", "Bancs à mi-pente", "Panchine a mezza costa"),
    six("昼は普通", "Normal at midday", "中午一般", "낮은 보통", "Normal à midi", "Normale a mezzogiorno")
  );
  offering("kaza", "summer",
    six("風車丘", "Windmill hill", "风车丘", "풍차언덕", "Colline aux moulins", "Collina dei mulini"),
    six("風車の影が長い昼下がり。", "Long windmill shadows in the afternoon.", "风车影子变长的午后。", "풍차 그림자가 긴 한낮 이후.", "L’après-midi aux longues ombres de moulins.", "Un pomeriggio dalle ombre lunghe dei mulini."),
    empty, empty,
    six("バスのあと上り", "Bus then uphill", "公交后上坡", "버스 탄 뒤 오르막", "Bus puis montée", "Autobus e poi salita"),
    six("坂と段差が多い", "Many slopes and steps", "坡道和台阶多", "언덕과 단차가 많음", "Beaucoup de pentes et de marches", "Molte salite e dislivelli"),
    six("丘の中腹にベンチ", "Benches halfway up", "半山腰有长椅", "언덕 중턱에 벤치", "Bancs à mi-pente", "Panchine a mezza costa"),
    six("午後は混む", "Crowded in the afternoon", "下午会拥挤", "오후는 붐빔", "Animé l’après-midi", "Affollato nel pomeriggio")
  );
  offering("kaza", "autumn",
    six("風車丘", "Windmill hill", "风车丘", "풍차언덕", "Colline aux moulins", "Collina dei mulini"),
    six("職人が羽根の直し方を見せる。", "A craftsperson shows how to mend the blades.", "工匠展示修理叶片的方法。", "장인이 날개 고치는 법을 보여 준다.", "Un artisan montre comment réparer les pales.", "Un artigiano mostra come riparare le pale."),
    empty,
    six("風車の職人", "Windmill craftsperson", "风车工匠", "풍차 장인", "Artisan des moulins", "Artigiano dei mulini"),
    six("バスのあと上り", "Bus then uphill", "公交后上坡", "버스 탄 뒤 오르막", "Bus puis montée", "Autobus e poi salita"),
    six("坂と段差が多い", "Many slopes and steps", "坡道和台阶多", "언덕과 단차가 많음", "Beaucoup de pentes et de marches", "Molte salite e dislivelli"),
    six("作業小屋で休める", "Rest in the work shed", "可在工棚休息", "작업 小屋에서 쉴 수 있음", "On peut se reposer dans l’atelier", "Si può riposare nel capanno"),
    six("午前は空いている", "Quiet in the morning", "上午较空", "오전은 한산함", "Calme le matin", "Tranquillo al mattino")
  );
  offering("kaza", "winter",
    six("風車丘", "Windmill hill", "风车丘", "풍차언덕", "Colline aux moulins", "Collina dei mulini"),
    six("丘の上から町の灯が見える。", "Town lights can be seen from the hilltop.", "从小丘上能看见镇上的灯。", "언덕 위에서 마을 불이 보인다.", "Les lumières du village se voient du sommet.", "Le luci del paese si vedono dalla cima."),
    empty, empty,
    six("バスの本数が少ない", "Fewer buses", "班次较少", "버스 횟수가 적음", "Moins de bus", "Meno autobus"),
    six("坂と段差が多い", "Many slopes and steps", "坡道和台阶多", "언덕과 단차가 많음", "Beaucoup de pentes et de marches", "Molte salite e dislivelli"),
    six("作業小屋で休める", "Rest in the work shed", "可在工棚休息", "작업 小屋에서 쉴 수 있음", "On peut se reposer dans l’atelier", "Si può riposare nel capanno"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("ishi", "spring",
    six("石畳", "Stone street", "石板路", "돌길", "Rue pavée", "Vicolo lastricato"),
    six("案内人が路地の抜け道を歩く。", "A guide walks the alley shortcuts.", "向导走小巷抄近道。", "안내인이 골목 지름길을 걷는다.", "Un guide parcourt les raccourcis des ruelles.", "Una guida percorre i vicoli di scorciatoia."),
    empty,
    six("石畳の案内", "Stone-street walk", "石板路导览", "돌길 안내", "Balade dans la rue pavée", "Passeggiata nel vicolo"),
    six("港から徒歩", "Walk from the port", "从港口步行", "항구에서 걷기", "À pied depuis le port", "A piedi dal porto"),
    six("石畳の段差が多い", "Many cobblestone steps", "石板台阶多", "돌길 단차가 많음", "Beaucoup de marches pavées", "Molti dislivelli lastricati"),
    six("茶店が点在", "Teahouses along the way", "沿路有茶馆", "찻집이 점재", "Maisons de thé çà et là", "Case da tè sparse"),
    six("昼は普通", "Normal at midday", "中午一般", "낮은 보통", "Normal à midi", "Normale a mezzogiorno")
  );
  offering("ishi", "summer",
    six("石畳", "Stone street", "石板路", "돌길", "Rue pavée", "Vicolo lastricato"),
    six("冷たい葛を路地で食べる。", "Eat chilled kudzu sweets in the alley.", "在小巷吃冰凉的葛粉甜品。", "골목에서 차가운 갈분을 먹는다.", "Manger un dessert de kudzu froid dans la ruelle.", "Mangiare un dolce di kudzu freddo nel vicolo."),
    six("冷たい葛", "Chilled kudzu", "冰凉葛粉", "차가운 갈분", "Kudzu froid", "Kudzu freddo"),
    empty,
    six("港から徒歩", "Walk from the port", "从港口步行", "항구에서 걷기", "À pied depuis le port", "A piedi dal porto"),
    six("石畳の段差が多い", "Many cobblestone steps", "石板台阶多", "돌길 단차가 많음", "Beaucoup de marches pavées", "Molti dislivelli lastricati"),
    six("茶店が点在", "Teahouses along the way", "沿路有茶馆", "찻집이 점재", "Maisons de thé çà et là", "Case da tè sparse"),
    six("夕方は混む", "Crowded in the evening", "傍晚会拥挤", "저녁은 붐빔", "Animé le soir", "Affollato la sera")
  );
  offering("ishi", "autumn",
    six("石畳", "Stone street", "石板路", "돌길", "Rue pavée", "Vicolo lastricato"),
    six("夕灯が石に反射する。", "Evening lamps reflect on the stones.", "晚灯反射在石头上。", "저녁 불이 돌에 반사된다.", "Les lampes du soir se reflètent sur les pierres.", "Le lampade serali si riflettono sulle pietre."),
    empty, empty,
    six("港から徒歩", "Walk from the port", "从港口步行", "항구에서 걷기", "À pied depuis le port", "A piedi dal porto"),
    six("石畳の段差が多い", "Many cobblestone steps", "石板台阶多", "돌길 단차가 많음", "Beaucoup de marches pavées", "Molti dislivelli lastricati"),
    six("茶店が点在", "Teahouses along the way", "沿路有茶馆", "찻집이 점재", "Maisons de thé çà et là", "Case da tè sparse"),
    six("夕方は混む", "Crowded in the evening", "傍晚会拥挤", "저녁은 붐빔", "Animé le soir", "Affollato la sera")
  );
  offering("ishi", "winter",
    six("石畳", "Stone street", "石板路", "돌길", "Rue pavée", "Vicolo lastricato"),
    six("小鍋の店が暖簾を出す。", "A small-pot shop puts out its curtain.", "小锅店挂出暖帘。", "작은 냄비 가게가 노렌을 낸다.", "Une boutique de petites marmites sort son noren.", "Un negozio di pentolini mette fuori il noren."),
    six("石畳の小鍋", "Stone-street small pot", "石板路小锅", "돌길 작은 냄비", "Petite marmite de la rue pavée", "Pentolino del vicolo"),
    empty,
    six("港から徒歩", "Walk from the port", "从港口步行", "항구에서 걷기", "À pied depuis le port", "A piedi dal porto"),
    six("石畳の段差が多い", "Many cobblestone steps", "石板台阶多", "돌길 단차가 많음", "Beaucoup de marches pavées", "Molti dislivelli lastricati"),
    six("店内で休める", "Rest inside the shop", "可在店内休息", "가게 안에서 쉴 수 있음", "On peut se reposer dans la boutique", "Si può riposare nel negozio"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  offering("oto", "spring",
    six("音楽堂", "Concert hall", "音乐堂", "음악당", "Salle de musique", "Sala da musica"),
    six("窓を開けた練習日。", "A practice day with the windows open.", "开着窗的练习日。", "창을 연 연습일.", "Un jour de répétition fenêtres ouvertes.", "Un giorno di prove a finestre aperte."),
    empty, empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("館内は平坦", "Flat indoors", "馆内平坦", "실내는 평탄", "Plat à l’intérieur", "Piatto all’interno"),
    six("ロビー", "Lobby", "大厅", "로비", "Hall", "Atrio"),
    six("午前は空いている", "Quiet in the morning", "上午较空", "오전은 한산함", "Calme le matin", "Tranquillo al mattino")
  );
  offering("oto", "summer",
    six("音楽堂", "Concert hall", "音乐堂", "음악당", "Salle de musique", "Sala da musica"),
    six("奏者が短い曲をロビーで弾く。", "A player performs a short piece in the lobby.", "演奏者在大厅弹一首短曲。", "연주자가 로비에서 짧은 곡을 탄다.", "Un musicien joue une courte pièce dans le hall.", "Un musicista suona un brano breve nell’atrio."),
    empty,
    six("ロビーの短い演奏", "Short lobby performance", "大厅短演奏", "로비의 짧은 연주", "Courte performance dans le hall", "Breve esecuzione nell’atrio"),
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("館内は平坦", "Flat indoors", "馆内平坦", "실내는 평탄", "Plat à l’intérieur", "Piatto all’interno"),
    six("ロビー", "Lobby", "大厅", "로비", "Hall", "Atrio"),
    six("夕方は普通", "Normal in the evening", "傍晚一般", "저녁은 보통", "Normal le soir", "Normale la sera")
  );
  offering("oto", "autumn",
    six("音楽堂", "Concert hall", "音乐堂", "음악당", "Salle de musique", "Sala da musica"),
    six("栗の菓子を休憩に出す。", "Chestnut sweets are served at the break.", "休息时端出栗子点心。", "휴식에 밤 과자를 낸다.", "Des gâteaux aux châtaignes sont servis à la pause.", "Dolci di castagne serviti alla pausa."),
    six("栗の菓子", "Chestnut sweets", "栗子点心", "밤 과자", "Gâteau aux châtaignes", "Dolce di castagne"),
    empty,
    six("バス1本", "One bus", "一班公交", "버스 한 대", "Un bus", "Un autobus"),
    six("館内は平坦", "Flat indoors", "馆内平坦", "실내는 평탄", "Plat à l’intérieur", "Piatto all’interno"),
    six("ロビー", "Lobby", "大厅", "로비", "Hall", "Atrio"),
    six("午後は普通", "Normal in the afternoon", "下午一般", "오후는 보통", "Normal l’après-midi", "Normale nel pomeriggio")
  );
  offering("oto", "winter",
    six("音楽堂", "Concert hall", "音乐堂", "음악당", "Salle de musique", "Sala da musica"),
    six("雪の日は音が館の中に残る。", "On snowy days the sound stays inside the hall.", "下雪天声音留在馆内。", "눈 오는 날에는 소리가 관 안에 남는다.", "Les jours de neige, le son reste dans la salle.", "Nei giorni di neve il suono resta nella sala."),
    empty, empty,
    six("バスの本数が少ない", "Fewer buses", "班次较少", "버스 횟수가 적음", "Moins de bus", "Meno autobus"),
    six("入口に段差", "A step at the entrance", "入口有台阶", "입구에 단차", "Une marche à l’entrée", "Un dislivello all’ingresso"),
    six("ロビー", "Lobby", "大厅", "로비", "Hall", "Atrio"),
    six("空いている", "Quiet", "较空", "한산함", "Calme", "Tranquillo")
  );

  function notice(id, title, body) {
    put("notice." + id + ".title", title);
    put("notice." + id + ".body", body);
  }

  notice("menu-spring-yoichi",
    six("夜市に桜餅が並び始めました", "Cherry-blossom sweets have appeared at the night market", "夜市开始摆出樱饼", "야시장에 벚꽃떡이 나오기 시작했습니다", "Les gâteaux aux cerisiers sont arrivés au marché nocturne", "I dolci ai ciliegi sono arrivati al mercato notturno"),
    six("虹帆町の屋台が、春限定の桜餅を夕方から出しています。並ばずに食べられる短い時間帯があります。", "Nijibo stalls serve spring-only cherry-blossom sweets from evening. There is a short window when you can eat without lining up.", "虹帆町的摊位从傍晚起供应春季限定樱饼。有一小段时间可以不用排队。", "니지보 마을의 포장마차가 봄 한정 벚꽃떡을 저녁부터 냅니다. 줄 서지 않고 먹을 수 있는 짧은 시간이 있습니다.", "Les stands de Nijibo servent des gâteaux de printemps dès le soir. Il y a un court moment sans file.", "Le bancarelle di Nijibo servono dolci di primavera dalla sera. C’è un breve momento senza coda.")
  );
  notice("menu-summer-shio",
    six("潮見台の塩レモンが今年も始まりました", "Salt lemon at the tide lookout is back this year", "观潮台的盐柠檬今年又开始了", "조망대의 소금레몬이 올해도 시작됐습니다", "Le citron salé du belvédère est de retour", "Il limone salato del belvedere è tornato"),
    six("薄青岬の茶店が、風の強い昼だけ塩レモンを出します。展望台のベンチで食べられます。", "The Usuao teahouse serves salt lemon only on windy middays. You can eat it on the lookout benches.", "薄青岬的茶馆只在风大的中午供应盐柠檬。可在观景台长椅上食用。", "우스아오 곶의 찻집이 바람이 센 낮에만 소금레몬을 냅니다. 전망대 벤치에서 먹을 수 있습니다.", "La maison de thé d’Usuao sert le citron salé seulement les midis venteux. On peut le manger sur les bancs.", "La casa da tè di Usuao serve il limone salato solo nei mezzogiorni ventosi. Si può mangiare sulle panchine.")
  );
  notice("menu-autumn-yoichi",
    six("栗の屋台が通りの中央へ出ました", "Chestnut stalls have moved to the middle of the street", "栗子摊摆到了街道中央", "밤 포장마차가 거리 한가운데로 나왔습니다", "Les stands de châtaignes sont au milieu de la rue", "Le bancarelle di castagne sono in mezzo alla via"),
    six("秋の夜市では、焼き栗と栗あんの菓子が並びます。短い距離で何軒か試せます。", "The autumn night market lines up roasted chestnuts and chestnut sweets. You can try several stalls in a short walk.", "秋夜市摆出烤栗和栗子馅点心。很短的距离就能试几家。", "가을 야시장에는 군밤과 밤앙금 과자가 늘어섭니다. 짧은 거리에서 몇 곳을 맛볼 수 있습니다.", "Le marché d’automne aligne châtaignes grillées et gâteaux. On peut en goûter plusieurs en peu de pas.", "Il mercato autunnale allinea castagne arrostite e dolci. Puoi provarne diversi in pochi passi.")
  );
  notice("menu-winter-ishi",
    six("石畳の小鍋が暖簾を出しました", "The stone-street small-pot shop has opened", "石板路小锅店挂出了暖帘", "돌길 작은 냄비가 노렌을 냈습니다", "La boutique de petites marmites a ouvert", "Il negozio di pentolini ha aperto"),
    six("星綴港の路地で、ひとり分の小鍋が始まりました。店内に腰を下ろせる席があります。", "Single-serving pots have started in a Hoshitsuzuri alley. There are seats inside.", "星缀港的小巷开始供应一人份小锅。店内有可坐下的座位。", "호시츠즈리 항구 골목에서 1인분 작은 냄비가 시작됐습니다. 가게 안에 앉을 자리가 있습니다.", "Des marmites pour une personne ont commencé dans une ruelle de Hoshitsuzuri. Il y a des places à l’intérieur.", "Pentolini per una persona sono iniziati in un vicolo di Hoshitsuzuri. Ci sono posti dentro.")
  );
  notice("local-spring-ho",
    six("看板犬の帆に、子犬が生まれました", "Ho, the shop dog, has puppies", "招牌犬帆生了小狗", "간판견 호에게 강아지가 태어났습니다", "Ho, le chien de la boutique, a des chiots", "Ho, il cane del negozio, ha dei cuccioli"),
    six("虹帆町の茶店前にいる帆が、春に子犬を産みました。店先で顔を出せる時間は午前中です。触れ合うときは店員の案内に従ってください。", "Ho, who stays in front of a Nijibo teahouse, had puppies this spring. Morning is the time to see them at the shopfront. Follow staff guidance if you greet them.", "虹帆町茶馆前的帆在春天生了小狗。店门口露面的时间是上午。接触时请听从店员指引。", "니지보 찻집 앞의 호가 봄에 강아지를 낳았습니다. 가게 앞에서 얼굴을 볼 수 있는 시간은 오전입니다. 만질 때는 점원 안내에 따르세요.", "Ho, devant une maison de thé de Nijibo, a eu des chiots au printemps. On peut les voir le matin. Suivez les consignes du personnel.", "Ho, davanti a una casa da tè di Nijibo, ha avuto cuccioli in primavera. Si vedono al mattino. Segui le indicazioni del personale.")
  );
  notice("local-summer-todai",
    six("灯台守が短い案内を増やしています", "The lighthouse keeper is offering more short tours", "灯塔看守增加了短导览", "등대 지기가 짧은 안내를 늘리고 있습니다", "Le gardien du phare propose plus de courtes visites", "Il guardiano del faro offre più visite brevi"),
    six("白波離島の灯台守が、入道雲の見える日に風向きを教えています。階段の途中で休憩できます。", "On days with tall summer clouds, the Shiranami keeper explains the wind. You can rest on the stairs.", "白波离岛的灯塔看守在能看见积雨云的日子讲解风向。可在楼梯中途休息。", "시라나미 섬의 등대 지기가 입도운이 보이는 날에 바람 방향을 알려 줍니다. 계단 중간에 쉴 수 있습니다.", "Les jours de nuages d’été, le gardien de Shiranami explique le vent. On peut se reposer dans l’escalier.", "Nei giorni di nubi estive il guardiano di Shiranami spiega il vento. Si può riposare sulle scale.")
  );
  notice("local-autumn-kaza",
    six("風車の職人が羽根の手入れを見せています", "The windmill craftsperson is showing blade care", "风车工匠正在展示叶片保养", "풍차 장인이 날개 손질을 보여 주고 있습니다", "L’artisan des moulins montre l’entretien des pales", "L’artigiano dei mulini mostra la cura delle pale"),
    six("月灯集落の職人が、作業小屋で羽根の直し方を公開しています。見学は午前が空いています。", "A Tsukito craftsperson shows blade mending in the work shed. Mornings are quieter for watching.", "月灯村落的工匠在工棚公开修理叶片的方法。参观上午较空。", "츠키토 마을의 장인이 작업 小屋에서 날개 고치는 법을 공개합니다. 견학은 오전이 한산합니다.", "Un artisan de Tsukito montre la réparation des pales dans l’atelier. Les matins sont plus calmes.", "Un artigiano di Tsukito mostra la riparazione delle pale nel capanno. Le mattine sono più tranquille.")
  );
  notice("local-winter-oto",
    six("音楽堂のロビーで短い練習が聞こえます", "Short practice can be heard in the concert-hall lobby", "音乐堂大厅能听到短练习", "음악당 로비에서 짧은 연습이 들립니다", "De courtes répétitions s’entendent dans le hall", "Brevi prove si sentono nell’atrio"),
    six("雪の日は音が館の中に残ります。ロビーで休むあいだ、短い練習を聴けることがあります。", "On snowy days the sound stays inside. While you rest in the lobby, you may hear a short practice.", "下雪天声音留在馆内。在大厅休息时，有时能听到短练习。", "눈 오는 날에는 소리가 관 안에 남습니다. 로비에서 쉬는 동안 짧은 연습을 들을 수 있습니다.", "Les jours de neige, le son reste à l’intérieur. En vous reposant dans le hall, vous pouvez entendre une courte répétition.", "Nei giorni di neve il suono resta dentro. Riposando nell’atrio puoi sentire una breve prova.")
  );
  notice("event-spring-ishi",
    six("石畳の案内歩きに参加できます", "You can join the stone-street walking tour", "可以参加石板路导览步行", "돌길 안내 걷기에 참여할 수 있습니다", "Vous pouvez rejoindre la balade guidée", "Puoi unirti alla passeggiata guidata"),
    six("星綴港の案内人が、路地の抜け道を歩く短い回りを案内します。予約はなく、港の入口で声をかけてください。", "A Hoshitsuzuri guide leads a short loop through alley shortcuts. No booking; speak up at the port entrance.", "星缀港的向导带领走小巷抄近道的短环线。无需预约，请在港口入口打招呼。", "호시츠즈리 항구의 안내인이 골목 지름길을 걷는 짧은 코스를 안내합니다. 예약은 없고 항구 입구에서 말을 걸어 주세요.", "Un guide de Hoshitsuzuri fait une courte boucle dans les ruelles. Sans réservation ; parlez à l’entrée du port.", "Una guida di Hoshitsuzuri fa un breve giro nei vicoli. Senza prenotazione; parla all’ingresso del porto.")
  );
  notice("event-summer-mizu",
    six("水鏡湖の船頭が対岸まで渡します", "The lake boatman ferries you to the opposite shore", "水镜湖的船夫送到对岸", "수경호 뱃사공이 맞은편까지 건넵니다", "Le passeur du lac vous mène à l’autre rive", "Il barcaiolo del lago ti porta all’altra sponda"),
    six("夏の湖では、船頭が対岸までの短い渡しをしています。桟橋に段差があるので、足場に注意してください。", "In summer a boatman offers a short crossing. Watch your footing: the pier has a step.", "夏日湖上，船夫提供到对岸的短摆渡。码头有台阶，请注意脚下。", "여름 호수에서는 뱃사공이 맞은편까지 짧은 나룻배를 합니다. 선창에 단차가 있으니 발밑을 주의하세요.", "En été, un passeur propose une courte traversée. Attention à la marche du ponton.", "In estate un barcaiolo offre un breve attraversamento. Attenzione al dislivello del pontile.")
  );
  notice("event-autumn-shio",
    six("夕景の語り部が港の話をします", "The evening storyteller talks about the harbor", "晚景说书人讲述港口的故事", "저녁 풍경 이야기꾼이 항구 이야기를 합니다", "Le conteur du soir parle du port", "Il narratore serale racconta il porto"),
    six("薄青岬の潮見台で、夕方だけ港の昔話を聞くことができます。立ち見でも参加できます。", "At the Usuao lookout you can hear harbor stories only in the evening. Standing is fine.", "在薄青岬观潮台，仅傍晚能听到港口旧事。站着也可以参加。", "우스아오 곶 조망대에서 저녁에만 항구 옛이야기를 들을 수 있습니다. 서서 들어도 됩니다.", "Au belvédère d’Usuao, on n’entend les récits du port que le soir. On peut rester debout.", "Al belvedere di Usuao si ascoltano le storie del porto solo la sera. Si può restare in piedi.")
  );
  notice("event-winter-yoichi",
    six("冬至の夜市が開きます", "The winter-solstice night market opens", "冬至夜市开张", "동지 야시장이 열립니다", "Le marché du solstice d’hiver ouvre", "Apre il mercato del solstizio d’inverno"),
    six("虹帆町の冬至の夜に、店主が一杯を出す夜市があります。屋内の席があり、空いていれば座れます。", "On Nijibo’s solstice night, stall owners offer a cup. Indoor seats are available if free.", "虹帆町冬至夜里有店主端上一杯的夜市。有室内座位，空着就可以坐。", "니지보 마을의 동지 밤에 주인이 한 잔을 내는 야시장이 있습니다. 실내 자리가 있고 비어 있으면 앉을 수 있습니다.", "Le soir du solstice à Nijibo, des commerçants offrent une tasse. Des places intérieures existent si elles sont libres.", "Nella notte del solstizio a Nijibo i titolari offrono una tazza. Ci sono posti al coperto se liberi.")
  );

  /* 作業小屋の韓国語誤記を直す */
  put("offering.kaza.autumn.rest", six("作業小屋で休める", "Rest in the work shed", "可在工棚休息", "작업 오두막에서 쉴 수 있음", "On peut se reposer dans l’atelier", "Si può riposare nel capanno"));
  put("offering.kaza.winter.rest", six("作業小屋で休める", "Rest in the work shed", "可在工棚休息", "작업 오두막에서 쉴 수 있음", "On peut se reposer dans l’atelier", "Si può riposare nel capanno"));
  put("notice.local-autumn-kaza.body", six("月灯集落の職人が、作業小屋で羽根の直し方を公開しています。見学は午前が空いています。", "A Tsukito craftsperson shows blade mending in the work shed. Mornings are quieter for watching.", "月灯村落的工匠在工棚公开修理叶片的方法。参观上午较空。", "츠키토 마을의 장인이 작업 오두막에서 날개 고치는 법을 공개합니다. 견학은 오전이 한산합니다.", "Un artisan de Tsukito montre la réparation des pales dans l’atelier. Les matins sont plus calmes.", "Un artigiano di Tsukito mostra la riparazione delle pale nel capanno. Le mattine sono più tranquille."));
  put("memory.visitLabel", six("{season}の{place}", "{season} · {place}", "{season}·{place}", "{season} · {place}", "{place} en {season}", "{place} in {season}"));

  root.MataTabiI18n = {
    languages: languages,
    ids: ids,
    text: text,
    languageById: languageById
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
