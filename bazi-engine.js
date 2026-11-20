/* 巽風科學八字引擎 v1
 * 依「流年卡推算規格書 v1」：科學八字（鄭文堡）計分為主，黃教授合化表，司螢－胡進氣表。
 * 計分：陽 2、陰 1；日主跳過；有合先論合（相鄰）；本命合依合化表（含「留」）；外氣合而不化（減半）；
 * 生則累加、剋則相抵；陰橋只傳自身分數（施剋者監視）；同五行母雞帶小雞。
 */
(function (root) {
  const GAN = "甲乙丙丁戊己庚辛壬癸", ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const WX = ["木", "火", "土", "金", "水"];
  const GAN_WX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
  const ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  const ZHI_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  const gen = e => (e + 1) % 5, ctl = e => (e + 2) % 5; // e 生 gen(e)；e 剋 ctl(e)
  // 天干五合、地支六合
  const GAN_HE = { "甲己": 2, "乙庚": 3, "丙辛": 4, "丁壬": 0, "戊癸": 1 };
  const ZHI_HE = { "子丑": 2, "寅亥": 0, "卯戌": 1, "辰酉": 3, "巳申": 4, "午未": 1 };
  // 黃教授合化表：成化條件（干支柱）與「留」
  const HUA = {
    "甲己": { c: ["甲辰", "甲午", "甲戌"] }, "乙庚": { c: ["乙丑", "乙未", "乙酉"] },
    "丙辛": { c: ["丙子", "丙辰", "丙申", "辛亥"] }, "丁壬": { c: ["丁卯", "丁亥", "壬寅"], keep: "丁" },
    "戊癸": { c: ["戊寅", "戊午", "癸卯", "癸巳"], keep: "戊" }, "子丑": { c: ["丙子", "戊子"] },
    "寅亥": { c: ["乙亥"] }, "卯戌": { c: ["丁卯", "甲戌", "丙戌"], keep: "戌" },
    "辰酉": { c: ["庚辰"] }, "巳申": { c: ["辛巳", "癸巳", "壬申"] }, "午未": { c: ["乙未", "丁未"], keep: "未" }
  };
  const pairKey = (a, b, tbl) => tbl[a + b] !== undefined ? a + b : (tbl[b + a] !== undefined ? b + a : null);

  function item(ch, pos, layer) {
    const g = GAN.indexOf(ch), isGan = g >= 0, z = ZHI.indexOf(ch);
    const e = isGan ? GAN_WX[g] : ZHI_WX[z], yang = isGan ? g % 2 === 0 : !!ZHI_YANG[z];
    return { ch, pos, layer: layer || "static", gan: isGan, e, yang, base: yang ? 2 : 1, s: yang ? 2 : 1, he: null };
  }

  // 對一列（天干或地支）做合：相鄰兩兩、由前往後；static 依合化表，外氣只減半
  function applyHe(list, pillars) {
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i], b = list[i + 1];
      if (a.he || b.he) continue;
      const tbl = a.gan ? GAN_HE : ZHI_HE, k = pairKey(a.ch, b.ch, tbl);
      if (!k) continue;
      const outer = a.layer !== "static" || b.layer !== "static";
      const rule = HUA[k], huaE = tbl[k];
      const hua = !outer && rule.c.some(p => pillars.includes(p));
      if (hua) {
        [a, b].forEach(x => { if (rule.keep !== x.ch) { x.e = huaE; } x.he = "化"; x.heWith = k; });
      } else {
        [a, b].forEach(x => { x.s = x.base / 2; x.he = "合"; x.heWith = k; });
      }
      i++;
    }
  }

  // 五行流通計分（本命：龍頭不論洩）
  function flow(items) {
    const act = items.filter(x => !x.skip);
    const tot = [0, 0, 0, 0, 0], free = [0, 0, 0, 0, 0], has = [0, 0, 0, 0, 0], yangTop = [0, 0, 0, 0, 0];
    act.forEach(x => { tot[x.e] += x.s; has[x.e] = 1; if (x.he !== "合") { free[x.e] += x.s; } if (x.yang) yangTop[x.e] = 1; });
    // 合中五行：若同五行有自由者（母雞），一併帶出；否則自成一格，不參與生剋
    const isolated = e => has[e] && free[e] === 0;
    const own = tot.slice(), out = tot.slice();
    // 找龍頭：存在、可流通、且其生我者不存在（或孤立）
    const live = e => has[e] && !isolated(e);
    const prev = e => (e + 4) % 5;
    const heads = [0, 1, 2, 3, 4].filter(e => live(e) && !live(prev(e)));
    const order = [];
    if (heads.length === 0 && [0, 1, 2, 3, 4].some(live)) { // 五行環生：取分數最高者為龍頭
      let h = 0; [0, 1, 2, 3, 4].forEach(e => { if (live(e) && own[e] > own[h]) h = e; }); heads.push(h);
    }
    heads.forEach(h => { let e = h; const seen = new Set(); while (live(e) && !seen.has(e)) { order.push(e); seen.add(e); e = gen(e); } });
    // 生：沿鏈累加；陰橋（全陰）只傳自身分數
    const got = [0, 0, 0, 0, 0];
    order.forEach(e => {
      const p = prev(e);
      if (!live(p) || !order.includes(p)) return;
      const bridgeAllYin = !yangTop[p];
      const gp = prev(p);
      const monitored = live(gp) && order.includes(gp) && order.indexOf(gp) < order.indexOf(p);
      const give = (bridgeAllYin && monitored) ? own[p] : out[p];
      out[e] = own[e] + give; got[e] = give;
    });
    // 被生而來的「印橋、比劫橋」也能流入孤立的合中五行
    [0, 1, 2, 3, 4].forEach(e => { if (isolated(e) && live(prev(e))) out[e] = own[e] + own[prev(e)]; });
    // 剋：無通關橋者相抵。
    // 若受剋者是施剋者的上游（母源），除非雙方皆陽（陽陽優先），否則不論剋（順生不回剋）。
    // 每個五行只打一場仗，優先處理施剋方優勢大的、陽陽者。
    const res = out.slice();
    const upstream = (b, a) => order.includes(b) && order.includes(a) && order.indexOf(b) < order.indexOf(a) && heads.some(h => { let e = h, seen = new Set(); let fb = false; while (live(e) && !seen.has(e)) { if (e === b) fb = true; if (e === a) return fb; seen.add(e); e = gen(e); } return false; });
    let pairs = [];
    [0, 1, 2, 3, 4].forEach(a => { const b = ctl(a); if (live(a) && live(b) && !live(gen(a))) { if (upstream(b, a) && !(yangTop[a] && yangTop[b])) return; pairs.push([a, b]); } });
    pairs.sort((x, y) => ((yangTop[y[0]] && yangTop[y[1]]) - (yangTop[x[0]] && yangTop[x[1]])) || ((res[y[0]] - res[y[1]]) - (res[x[0]] - res[x[1]])));
    const used = new Set(), applied = [];
    pairs.forEach(([a, b]) => { if (used.has(a) || used.has(b)) return; const r = res[a] - res[b]; res[a] = r; res[b] = -r; used.add(a); used.add(b); applied.push([a, b]); });
    pairs = applied;
    // 三方激戰：A 生 B、B 剋 C、C 剋 A（例：巳戌亥子）→ 水火土兩敗俱傷，皆論 0，並標示結構特殊
    const tri = [];
    [0, 1, 2, 3, 4].forEach(a => { const b = gen(a), c = ctl(b); if (live(a) && live(b) && live(c) && ctl(c) === a && !live(gen(b)) && Math.abs(res[b]) < 1e-9) { res[a] = 0; res[c] = 0; tri.push([a, b, c]); } });
    const monitor = [];
    [0, 1, 2, 3, 4].forEach(a => { const b = ctl(a); if (live(a) && live(b) && live(gen(a))) monitor.push([a, b]); });
    return { score: res, chain: order, heads, clashes: pairs, monitor, tri, isolated: [0, 1, 2, 3, 4].filter(isolated) };
  }

  // 本命：pillars = ["甲子","丙寅","戊辰","庚午"]（年月日時；時可為 null）
  function natal(pillars) {
    const P = pillars.filter(Boolean);
    const [y, m, d, h] = pillars;
    const stems = [item(y[0], "年干"), item(m[0], "月干")]; if (h) stems.push(item(h[0], "時干"));
    const bra = [item(y[1], "年支"), item(m[1], "月支"), item(d[1], "日支")]; if (h) bra.push(item(h[1], "時支"));
    applyHe(stems, P); applyHe(bra, P);
    const all = stems.concat(bra);
    const f = flow(all);
    return { dayGan: GAN.indexOf(d[0]), items: all, stems, bra, ...f, monthE: ZHI_WX[ZHI.indexOf(m[1])] };
  }

  // 外氣（流年／流月）：本命生外氣為洩、外氣生本命為生、剋則相抵；合而不化減半
  function outer(nat, dyn) {
    const base = nat.score.slice(), d = [0, 0, 0, 0, 0], has = [0, 0, 0, 0, 0];
    nat.items.forEach(x => has[x.e] = 1);
    const notes = [];
    dyn.forEach(ch => {
      const x = item(ch, "外", "dyn");
      // 合：與本命同層相合者（天干找天干、地支找地支），合而不化
      const tgt = nat.items.find(n => n.gan === x.gan && !n.he && pairKey(n.ch, x.ch, x.gan ? GAN_HE : ZHI_HE));
      let s = x.base;
      if (tgt) { d[tgt.e] -= tgt.s / 2; s = x.base / 2; notes.push({ t: "合", a: x.ch, b: tgt.ch, pos: tgt.pos }); }
      // 同五行：比劫助
      if (has[x.e]) { d[x.e] += s; notes.push({ t: "助", a: x.ch, e: x.e }); }
      else { d[x.e] += 0; notes.push({ t: "新", a: x.ch, e: x.e, s }); }
      // 本命生外氣：洩
      const p = (x.e + 4) % 5;
      if (has[p] && base[p] > 0) { const take = Math.min(s, base[p] + d[p]); d[p] -= take; notes.push({ t: "洩", a: x.ch, e: p, v: take }); }
      // 外氣生本命
      const c = gen(x.e);
      if (has[c]) { d[c] += s; notes.push({ t: "生", a: x.ch, e: c, v: s }); }
      // 外氣剋本命
      const k = ctl(x.e);
      if (has[k]) { const v = Math.min(s, Math.max(base[k] + d[k], 0) + s); d[k] -= s; notes.push({ t: "剋", a: x.ch, e: k, v: s }); }
      // 本命剋外氣
      const kk = (x.e + 3) % 5;
      if (has[kk]) { d[kk] -= s / 2; notes.push({ t: "受剋", a: x.ch, e: kk }); }
    });
    return { delta: d, notes };
  }

  const SS = ["比肩", "劫財", "食神", "傷官", "偏財", "正財", "七殺", "正官", "偏印", "正印"];
  const GROUP = ["比劫", "食傷", "財星", "官殺", "印星"];
  const groupOf = (dayGan, e) => GROUP[(e - GAN_WX[dayGan] + 5) % 5];

  // 丁未年進氣（翁良杰修正表）：index 0=寅月…11=丑月
  const QI2027 = [["丙"], [], [], [], ["丁"], ["丁", "未", "申"], ["丁", "未", "申"], ["丁", "未", "申"], ["丁", "未", "申"], ["丁", "未", "申"], ["丁", "未", "申"], ["丁", "未", "申"]];
  const MONTHS2027 = ["壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑"];
  const KEY_MONTHS = [1, 2, 3]; // 卯辰巳：無年干支進氣，等同流年

  function judge(nat, delta) {
    // 好壞：本命強項（分數>0）被增強為吉；被削弱為凶；受傷點（分數<0）被補為吉
    let v = 0;
    for (let e = 0; e < 5; e++) {
      const b = nat.score[e];
      if (b > 0) v += delta[e] * (1 + b / 4);
      else if (b < 0) v += delta[e] * 0.8;
    }
    return v;
  }

  function year2027(pillars) {
    const nat = natal(pillars);
    const y = outer(nat, ["丁", "未"]);
    const dg = nat.dayGan;
    const rank = [0, 1, 2, 3, 4].map(e => ({ e, g: groupOf(dg, e), d: y.delta[e], base: nat.score[e] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const months = MONTHS2027.map((gz, i) => {
      const dyn = [gz[0], gz[1]].concat(QI2027[i].filter(c => c !== gz[0] && c !== gz[1]));
      const o = outer(nat, dyn);
      return { i, gz, key: KEY_MONTHS.includes(i), v: judge(nat, o.delta) * (KEY_MONTHS.includes(i) ? 1.3 : 1) };
    });
    const sorted = months.slice().sort((a, b) => a.v - b.v);
    const special = nat.isolated.length > 1 || nat.tri.length > 0 || nat.heads.length === 0;
    return { nat, year: y, axis: rank[0], rank, months, warn: sorted.slice(0, 2).map(m => m.i).sort((a, b) => a - b), best: sorted[11].i, total: judge(nat, y.delta), special };
  }

  const API = { GAN, ZHI, WX, natal, outer, flow, item, applyHe, year2027, groupOf, MONTHS2027, QI2027, KEY_MONTHS };
  if (typeof module !== "undefined") module.exports = API; else root.XFBazi = API;
})(typeof window !== "undefined" ? window : globalThis);
