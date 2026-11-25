// 流月詳批（系統版）：把推算結果轉成一般人看得懂的逐半月說明
import { compute } from './engine.js';

const MONTH_NAME = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
// 時辰序號（流年卡的選單值）→ 推算用時刻
export const HOUR_OF = (k) => (k === null ? null : k === 0 ? 0 : k === 12 ? 23 : k * 2);
export const HOUR_NAME = ['早子時', '丑時', '寅時', '卯時', '辰時', '巳時', '午時', '未時', '申時', '酉時', '戌時', '亥時', '晚子時'];

const plain = (t) => String(t || '').split('・').pop();   // 去掉十神術語前綴，只留白話標題

// 依性別保留「男命／女命」的句子，去掉不適用的另一半
function bySex(t, sex) {
  const other = sex === 'm' ? '女命' : '男命', mine = sex === 'm' ? '男命' : '女命';
  const out = [];
  for (const sen of String(t || '').split(/(?<=[。；])/).map((x) => x.trim()).filter(Boolean)) {
    if (!/^[男女]命/.test(sen)) { out.push(sen); continue; }
    const end = /[。；]$/.test(sen) ? sen.slice(-1) : '';
    const keep = sen.replace(/[。；]$/, '').split('，').filter((x) => x.startsWith(mine)).map((x) => x.slice(2));
    if (keep.length) out.push('此外，' + keep.join('，') + (end || '。'));
  }
  return out.join('').replace(/；$/, '。');
}

function halfText(h, sex) {
  const good = [], warn = [];
  for (const ln of h.lines) {
    const m = /^.+?・.+? ([+-]?[\d.]+)：(.+?)（(合喜用|犯忌)）$/.exec(ln);
    if (!m) continue;
    const up = Number(m[1]) > 0;
    if (m[3] === '犯忌') warn.push(m[2]);
    else if (up) good.push(m[2]);
  }
  return { sym: h.sym, s: h.s, theme: plain(h.main), themeD: bySex(h.mainD, sex), good, warn };
}

export function buildReport(person) {
  const r = compute({ y: person.y, m: person.m, d: person.d, hour: HOUR_OF(person.h), minute: 0, sex: person.s });
  return {
    name: person.name || '',
    birth: `${person.y}/${person.m}/${person.d}`,
    hourName: person.h === null ? '時辰不詳' : HOUR_NAME[person.h],
    sex: person.s === 'm' ? '男' : '女',
    pillars: r.pillars.map((p) => p || '—'),
    lunar: r.lunar,
    strong: r.strong,
    xi: r.xi, ji: r.ji,
    dayun: r.dayun.cur,
    special: r.special,
    year: { ...r.year, axis: plain(r.year.axis), main: bySex(r.year.main, person.s) },
    months: r.months.map((m) => ({
      name: MONTH_NAME[m.i], gz: m.gz, from: m.from, to: m.to, key: m.key,
      first: halfText(m.S, person.s), second: halfText(m.Z, person.s), events: m.zr,
    })),
  };
}
