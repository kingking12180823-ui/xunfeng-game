// 流月詳批（系統版）推算：沿用 api/_liuyue.js（老師複核用）的算法，改為 Workers 可用的 ES 模組
import B from '../../bazi-engine.js';
import C from '../../bazi-calendar.js';
import R from '../../xf-reading.js';

const GAN = "甲乙丙丁戊己庚辛壬癸", ZHI = "子丑寅卯辰巳午未申酉戌亥";
const GWX = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4], ZWX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const BENQI = "癸己甲乙戊丙丁己庚辛戊壬", WXN = ["木", "火", "土", "金", "水"];
const YEAR = 2027;
const LIUHE = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const CHONG = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const POS = ["年柱（長輩、祖業）", "月柱（事業、兄弟同輩）", "日柱（自己、配偶）", "時柱（子女、部屬、晚運）"];
const GUP = { 比劫: "同輩競爭、合夥與人情開銷增加", 食傷: "表現、口才與創意發揮", 財星: "進財機會、務實收穫", 官殺: "壓力、考核、規範與責任加重", 印星: "貴人、進修、文書資格有利" };
const GDN = { 比劫: "自主力弱、體力透支", 食傷: "表達受阻、心情鬱悶", 財星: "財務吃緊、留意破耗", 官殺: "工作動力不足、約束鬆散", 印星: "判斷失準、文書合約要細看" };

function shishen(dg, ch) {
  let g = GAN.indexOf(ch); if (g < 0) g = GAN.indexOf(BENQI[ZHI.indexOf(ch)]);
  const r = (GWX[g] - GWX[dg] + 5) % 5, same = (dg % 2) === (g % 2);
  return [["比肩", "劫財"], ["食神", "傷官"], ["偏財", "正財"], ["七殺", "正官"], ["偏印", "正印"]][r][same ? 0 : 1];
}
const r5 = v => Math.round(v * 2) / 2;
const sgn = v => (v > 0 ? "+" : "") + r5(v);
const md = d => `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
const score = v => Math.max(-2, Math.min(2, Math.round(v / 2.5) / 2));
const sym = s => s >= 1 ? "◎ 好" : s > 0 ? "○ 平偏吉" : s === 0 ? "― 平" : s > -1.5 ? "☆ 平偏糟" : "★ 糟";

function half(nat, dg, W, chars, labels) {
  const o = B.outer(nat, chars);
  const es = [0, 1, 2, 3, 4], d = o.delta;
  const gp = e => B.groupOf(dg, e);
  const hurt = es.filter(e => d[e] < -0.25).sort((a, b) => d[a] - d[b]);
  const gain = es.filter(e => d[e] > 0.25).sort((a, b) => d[b] - d[a]);
  const top = d.indexOf(Math.max(...d));
  const v = B.judge(nat, d), s = score(v);
  // 主要作用（依外氣作用紀錄）
  const rels = [];
  o.notes.forEach(x => {
    const og = gp(B.item(x.a, "").e), key = og + ">" + gp(x.e);
    const T = R.REL[x.t] && R.REL[x.t][key];
    if (T) rels.push({ w: (x.v || 1) * (x.t === "剋" ? 1.2 : 1), t: T.t, d: T.d });
  });
  rels.sort((a, b) => b.w - a.w);
  const lines = [];
  es.filter(e => Math.abs(d[e]) > 0.25).sort((a, b) => Math.abs(d[b]) - Math.abs(d[a])).forEach(e => {
    const good = d[e] * W[e] > 0;
    lines.push(`${WXN[e]}・${gp(e)} ${sgn(d[e])}：${d[e] > 0 ? GUP[gp(e)] : GDN[gp(e)]}（${good ? "合喜用" : "犯忌"}）`);
  });
  return {
    chars: chars.map((c, i) => `${c}(${shishen(dg, c)})${labels[i] ? "・" + labels[i] : ""}`).join("　"),
    hurt: hurt.map(e => WXN[e] + sgn(d[e])).join("、") || "—",
    gain: gain.map(e => WXN[e] + sgn(d[e])).join("、") || "—",
    jq: d[top] > 0.25 ? `${WXN[top]}・${gp(top)}` : "—（氣散）",
    v: Math.round(v * 10) / 10, s, sym: sym(s),
    main: rels[0] ? rels[0].t : "", mainD: rels[0] ? rels[0].d : "",
    lines,
    notes: o.notes.map(x => x.t === "合" ? `${x.a}合${x.b}（${x.pos}，合而不化，各減半）` : x.t === "新" ? `${x.a}為本命所缺之${WXN[x.e]}` : `${x.a}${x.t}${WXN[x.e]}${x.v ? "（" + r5(x.v) + "）" : ""}`).join("、")
  };
}

function compute(inp) {
  const P = C.pillars(inp.y, inp.m, inp.d, inp.hour, inp.minute || 0).pillars;
  const DY = C.dayun(inp.y, inp.m, inp.d, inp.hour == null ? 12 : inp.hour, inp.sex, inp.minute || 0);
  const nat = B.natal(P), dg = nat.dayGan, XJ = B.xiji(nat), W = B.weights(nat).w;
  const lun = C.lunar(inp.y, inp.m, inp.d);
  const jie = []; for (let k = 0; k < 12; k++) jie.push(C.fromJd(C.jieJd(YEAR, k)));
  jie.push(C.fromJd(C.jieJd(YEAR + 1, 0)));
  const yunAt = dt => { let cur = null; DY.seq.forEach((s, i) => { const st = i === 0 ? DY.start.getTime() : Date.UTC(s.from, DY.start.getUTCMonth(), DY.start.getUTCDate()); if (dt.getTime() >= st) cur = s; }); return cur || DY.seq[0]; };
  const natZ = P.map(p => p ? p[1] : null);
  const months = B.MONTHS2027.map((gz, i) => {
    const q = B.qiOf("丁未", i), y = yunAt(jie[i]);
    const S = half(nat, dg, W, [gz[0], ...q.gan, y.gz[0]], ["月干", ...q.gan.map(() => "年干氣"), "大運干"]);
    const Z = half(nat, dg, W, [gz[1], ...q.zhi, y.gz[1]], ["月支", ...q.zhi.map(() => "年支氣"), "大運支"]);
    const zr = [];
    natZ.forEach((z, k) => { if (!z) return; if (LIUHE[gz[1]] === z) zr.push(`${gz[1]}合${z}：${POS[k]}有牽絆、合作或喜事`); if (CHONG[gz[1]] === z) zr.push(`${gz[1]}沖${z}：${POS[k]}有變動、奔波`); });
    return { i, gz, from: md(jie[i]), to: md(jie[i + 1]), yun: y.gz, S, Z, zr, key: B.KEY_MONTHS.includes(i) };
  });
  const rd = R.read(P, inp.sex);
  const cur = yunAt(new Date(Date.UTC(YEAR, 6, 1)));
  return {
    input: inp, pillars: P,
    lunar: `${lun.leap ? "閏" : ""}${lun.month}月${lun.day}日`,
    tenGods: P.map(p => p ? [shishen(dg, p[0]), shishen(dg, p[1])] : null),
    score: WXN.map((w, e) => ({ w, g: B.groupOf(dg, e), s: nat.score[e] })),
    strong: XJ.strong, xi: XJ.xi.map(e => WXN[e] + "（" + B.groupOf(dg, e) + "）"), ji: XJ.ji.map(e => WXN[e] + "（" + B.groupOf(dg, e) + "）"),
    special: !!nat.special,
    dayun: { text: DY.text, start: DY.start.toISOString().slice(0, 10), forward: DY.forward, seq: DY.seq.slice(0, 9).map(s => ({ gz: s.gz, from: s.from, to: s.to, age: s.age, ss: shishen(dg, s.gz[0]) + "／" + shishen(dg, s.gz[1]) })), cur: cur.gz },
    year: { axis: rd.axisLine, lead: rd.strength.lead, xi: rd.strength.xi, ji: rd.strength.ji, xie: rd.strength.xie, main: rd.main ? rd.main.d : "", ss: shishen(dg, "丁") + "／" + shishen(dg, "未") },
    months
  };
}
export { compute };
