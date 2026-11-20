/* 巽風流年卡斷語 v1：依 bazi-engine 的計分結果，套用十神作用句型（黃教授外氣論命、鄭文堡十神類象）
 * 只寫傾向與建議，不做恐嚇式斷語、不寫疾病名稱與療效。 */
(function (root) {
  const B = root.XFBazi || (typeof require !== "undefined" ? require("./bazi-engine.js") : null);
  const G = ["比劫", "食傷", "財星", "官殺", "印星"];
  const GS = ["比劫", "食傷", "財", "官殺", "印"];
  // 十神作用（外氣 → 本命）
  const REL = {
    "生": {
      "印星>比劫": { t: "印生比劫・貴人扶身", d: "長輩、上司或老客戶願意拉你一把，自信心回來，適合把擱著的計畫重新啟動。", y: ["主動向前輩請益", "接下有人背書的機會", "進修考證"], j: ["只靠人情不做功課", "把貴人的好意當應該", "拖延決定"] },
      "比劫>食傷": { t: "比劫生食傷・群策群力", d: "朋友同事帶動你的表現欲，點子多、口才好，團隊合作比單打獨鬥有成果。", y: ["揪團合作做專案", "公開分享作品", "經營社群口碑"], j: ["只講不做", "好面子硬撐場面", "替人作保"] },
      "食傷>財星": { t: "食傷生財・才華變現", d: "手藝、點子與專業最容易換成收入，越肯把能力拿出來賣，財越順。", y: ["把專長做成產品或服務", "開新收入管道", "接案、兼職"], j: ["免費幫忙過頭", "只顧創作不談價錢", "衝動投資"] },
      "財星>官殺": { t: "財生官殺・以財換位", d: "花錢換到位置與舞台，事業有升級機會，但責任和壓力也跟著加重。", y: ["投資自己的專業形象", "爭取主管職或主導權", "把帳目與制度理清楚"], j: ["為面子超支", "應酬過度", "簽約不看細節"] },
      "官殺>印星": { t: "官印相生・職場給資源", d: "公司或主管願意給訓練、頭銜與資源，升遷、考證、取得資格都有利。", y: ["爭取內部訓練與升遷", "考取證照", "建立正式身分與名片"], j: ["抗拒體制", "越級出頭", "忽略文書合約"] }
    },
    "剋": {
      "官殺>比劫": { t: "官殺剋比劫・壓力與競爭", d: "規範、考核與同輩競爭增加，常覺得被盯著；撐得住就是磨練，撐不住容易心累。女命有交往機緣，男命有子嗣緣。", y: ["規律運動或捐血以過運", "把壓力寫成具體待辦", "守住規矩與流程"], j: ["正面硬碰上級", "熬夜逞強", "鋌而走險"] },
      "印星>食傷": { t: "印剋食傷・想多說少", d: "表達受壓抑、判斷容易反覆，想太多做太少；財源因此不夠暢。", y: ["找朋友聊聊、出外踏青", "重要決策多問兩個人", "用寫作整理思緒"], j: ["悶著不說", "憑一時直覺拍板", "長時間獨處鑽牛角尖"] },
      "食傷>官殺": { t: "食傷剋官・對規矩不耐", d: "對工作與上司容易厭倦、不滿，想離職或另起爐灶；女命對伴侶容易挑剔。", y: ["把不滿轉成提案與創新", "研究、創作、著書立言", "溝通時先講好處再講問題"], j: ["當眾頂撞", "衝動離職", "口無遮攔"] },
      "比劫>財星": { t: "比劫剋財・財來財去", d: "朋友借錢、合夥分帳、人情開銷多，錢容易被分走；男命對另一半容易挑剔。", y: ["量入為出、記帳", "樂捐布施以過運", "合夥先白紙黑字"], j: ["借錢給人", "積極性投資", "替人作保"] },
      "財星>印星": { t: "財破印・驛馬奔波", d: "出差、搬遷、遠行機會多，生活奔波、心不容易定；也可能有意外收穫。", y: ["把奔波變成拓展", "安排固定休息與學習時間", "整理文件與房產資料"], j: ["為錢放棄進修", "輕忽長輩意見", "文件簽了不看"] }
    }
  };
  // 本命被流年洩（本命 X 生 流年 Y）
  const XIE = {
    "比劫": "自己的時間與精力被大量支出",
    "食傷": "才華與表現被拿去成就別人",
    "財星": "錢財拿去換位置、換人脈",
    "官殺": "權責轉成學習與資源",
    "印星": "長輩、房產或證照的資源被分出去"
  };
  const ZHI_REL = { "丑": "沖", "午": "合", "戌": "刑", "子": "害" };
  const POS_PEOPLE = { "年支": "長輩、祖上與原生家庭", "月支": "工作、同事與兄弟姊妹", "日支": "自己與另一半、家庭", "時支": "子女、部屬與晚輩" };
  const CARE = ["筋骨伸展與用眼休息", "睡眠品質與情緒放鬆", "腸胃與飲食定時", "呼吸與皮膚保養", "保暖與作息規律"];

  function groupE(dayGan, e) { return B.groupOf(dayGan, e); }

  function read(pillars, sex) {
    const r = B.year2027(pillars), n = r.nat, dg = n.dayGan, dE = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4][dg];
    const gp = e => groupE(dg, e);
    const hit = [];
    r.year.notes.forEach(x => {
      const og = gp(B.item(x.a, "").e);
      if (x.t === "生") hit.push({ k: "生", key: og + ">" + gp(x.e), w: x.v || 1 });
      if (x.t === "剋") hit.push({ k: "剋", key: og + ">" + gp(x.e), w: (x.v || 1) * 1.2 });
    });
    // 本命有剋流年的，也算作用（反剋）
    const rels = hit.filter(h => REL[h.k][h.key]).map(h => Object.assign({ w: h.w, k: h.k }, REL[h.k][h.key]));
    rels.sort((a, b) => b.w - a.w);
    const main = rels[0];
    const xie = r.year.notes.filter(x => x.t === "洩").map(x => ({ g: gp(x.e), to: gp(B.item(x.a, "").e), v: x.v }));
    // 增強／削弱
    const d = r.year.delta.map((v, e) => ({ e, g: gp(e), v, base: n.score[e] }));
    const up = d.filter(x => x.v > 0.01).sort((a, b) => b.v - a.v);
    const down = d.filter(x => x.v < -0.01).sort((a, b) => a.v - b.v);
    const good = d.filter(x => x.base > 0 && x.v > 0.01).map(x => x.g);
    const bad = d.filter(x => x.base > 0 && x.v < -0.01).map(x => x.g);
    // 地支：未與本命的沖合刑害
    const zhiHits = n.bra.map(b => ({ pos: b.pos, ch: b.ch, rel: ZHI_REL[b.ch] })).filter(x => x.rel);
    // 段落
    const has = g => d.find(x => x.g === g);
    const sec = {};
    const pick = (...keys) => rels.filter(x => keys.some(k => x.t.startsWith(k)));
    sec.事業 = pick("官印", "財生官", "食傷剋官", "官殺剋")[0] || pick("比劫生食傷", "印生比劫")[0] || main;
    sec.財運 = pick("食傷生財", "比劫剋財", "財破印", "財生官")[0] || main;
    const loveKey = sex === "f" ? "官殺" : "財星";
    sec.感情 = pick(sex === "f" ? "官殺剋" : "比劫剋財", sex === "f" ? "食傷剋官" : "食傷生財", "財生官")[0] || main;
    const dayHit = zhiHits.find(x => x.pos === "日支");
    const weakest = down[0] ? down[0].e : (n.score.indexOf(Math.min(...n.score)));
    const homeHit = zhiHits.find(x => x.pos === "年支") || dayHit;
    // 主軸一句（公開）
    const axisLine = main ? main.t : (up[0] ? up[0].g + "得力之年" : "平穩累積之年");
    return {
      r, main, rels, xie, up, down, good, bad, zhiHits, axisLine,
      strength: {
        lead: (up.length ? "今年增強：" + up.slice(0, 2).map(x => x.g).join("、") : "") + (down.length ? (up.length ? "；" : "") + "今年受制：" + down.slice(0, 2).map(x => x.g).join("、") : ""),
        xi: good.length ? "本命強項「" + good.join("、") + "」再得流年之助，順勢而為。" : "",
        ji: bad.length ? "本命強項「" + bad.join("、") + "」被流年削弱，宜守不宜攻。" : "",
        xie: xie.map(x => x.g + "洩於" + x.to + "：" + XIE[x.g]).join("；")
      },
      sec: {
        事業: sec.事業, 財運: sec.財運, 感情: Object.assign({}, sec.感情, dayHit ? { extra: "流年未" + dayHit.rel + "日支" + dayHit.ch + "：" + POS_PEOPLE.日支 + "有變動，相處多一分耐心。" } : {}),
        健康: { t: "保養重點：" + CARE[weakest], d: "今年" + B.WX[weakest] + "氣受制，宜在" + CARE[weakest] + "多用心，作息有度。", y: ["固定運動", "規律作息", CARE[weakest]], j: ["熬夜", "暴飲暴食", "過度勞累"] },
        家宅: homeHit ? { t: "流年未" + homeHit.rel + homeHit.pos.replace("支", "柱"), d: POS_PEOPLE[homeHit.pos] + "方面有變動或牽絆，家中事宜早規劃。", y: ["整理居家動線", "多陪伴" + (homeHit.pos === "年支" ? "長輩" : "家人"), "重要修繕擇日進行"], j: ["拖延修繕", "家中爭吵冷戰", "動土不擇日"] }
          : { t: "家宅平穩", d: "今年流年與命盤地支無明顯沖合，家中宜守成、按部就班。", y: ["定期整理收納", "維持居家明亮", "安排家族聚會"], j: ["大興土木", "堆積雜物", "長期空房不住"] }
      },
      special: r.special
    };
  }
  const API = { read, REL };
  if (typeof module !== "undefined") module.exports = API; else root.XFReading = API;
})(typeof window !== "undefined" ? window : globalThis);
