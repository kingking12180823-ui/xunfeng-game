/* 巽風曆法：四柱、農曆、節氣、大運（3 天＝1 年）。時間一律以台灣時間（UTC+8）鐘錶時。 */
(function (root) {
  const GAN = "甲乙丙丁戊己庚辛壬癸", ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const JIE = ["立春", "驚蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]; // 寅月起
  const D2R = Math.PI / 180;
  // 台灣時間 → JD（UT）
  const jdOf = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, 0, 0, 0) / 864e5 + 2440587.5 + (h - 8) / 24;
  const fromJd = jd => new Date((jd - 2440587.5) * 864e5 + 8 * 3600e3); // 取 getUTC* 即台灣時間
  function sunLon(jd) {
    const T = (jd - 2451545) / 36525, L0 = 280.46646 + 36000.76983 * T, M = (357.52911 + 35999.05029 * T) * D2R;
    const C = (1.914602 - 0.004817 * T) * Math.sin(M) + 0.019993 * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    const om = (125.04 - 1934.136 * T) * D2R;
    return (((L0 + C - 0.00569 - 0.00478 * Math.sin(om)) % 360) + 360) % 360;
  }
  // 太陽到達黃經 lon 的時刻（在 jd0 附近 ±20 天內）
  function termAt(lon, jd0) {
    const f = j => ((sunLon(j) - lon + 540) % 360) - 180;
    let a = jd0 - 20, b = jd0 + 20;
    for (let i = 0; i < 60; i++) { const c = (a + b) / 2; if (f(c) < 0) a = c; else b = c; }
    return (a + b) / 2;
  }
  // 某年第 k 個節（0=立春…11=小寒，小寒屬次年 1 月）
  function jieJd(year, k) {
    const lon = (315 + 30 * k) % 360;
    const approx = jdOf(year, 2, 4) + k * 30.44;
    return termAt(lon, approx);
  }
  const dayIdx = (y, m, d) => { const jdn = Math.floor(jdOf(y, m, d, 12) + 0.5 - 0.0001 + 8 / 24); return ((jdn + 49) % 60 + 60) % 60; };
  const gz = i => GAN[i % 10] + ZHI[i % 12];
  const idxOf = s => { for (let i = 0; i < 60; i++) if (gz(i) === s) return i; return -1; };

  // 四柱：hour 為 0–23 的鐘錶時（null＝不知時辰）
  function pillars(y, m, d, hour, minute = 0) {
    const h = hour == null ? 12 : hour + minute / 60, jd = jdOf(y, m, d, h), L = sunLon(jd);
    let yy = y; if (jd < jieJd(y, 0)) yy = y - 1;
    const ygi = ((yy - 4) % 10 + 10) % 10, yzi = ((yy - 4) % 12 + 12) % 12;
    const mi = Math.floor(((L - 315 + 360) % 360) / 30); // 0=寅
    const mg = ((ygi % 5) * 2 + 2 + mi) % 10, mz = (mi + 2) % 12;
    let dd = new Date(Date.UTC(y, m - 1, d)); if (hour === 23) dd = new Date(dd.getTime() + 864e5);
    const di = dayIdx(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate());
    const out = [GAN[ygi] + ZHI[yzi], GAN[mg] + ZHI[mz], gz(di), null];
    if (hour != null) { const hb = Math.floor((hour + 1) / 2) % 12, hg = ((di % 10) % 5 * 2 + hb) % 10; out[3] = GAN[hg] + ZHI[hb]; }
    return { pillars: out, jd, monthIdx: mi, solarYear: yy };
  }

  // 大運：陽男陰女順、陰男陽女逆；3 天＝1 年
  function dayun(y, m, d, hour, sex, minute = 0) {
    const p = pillars(y, m, d, hour == null ? 12 : hour, minute), jd = p.jd;
    const yang = GAN.indexOf(p.pillars[0][0]) % 2 === 0, fwd = (yang && sex === "m") || (!yang && sex === "f");
    // 找出生前後最近的節
    const list = [];
    for (let yy = y - 1; yy <= y + 1; yy++) for (let k = 0; k < 12; k++) list.push(jieJd(yy, k));
    list.sort((a, b) => a - b);
    const tgt = fwd ? list.find(j => j > jd) : list.filter(j => j <= jd).pop();
    const days = Math.abs(tgt - jd), yrs = days / 3;
    const startJd = jd + days * 120; // 1 天＝120 天
    const sd = fromJd(startJd);
    const mIdx = idxOf(p.pillars[1]);
    const seq = [];
    for (let k = 1; k <= 10; k++) {
      const i = ((mIdx + (fwd ? k : -k)) % 60 + 60) % 60, sy = sd.getUTCFullYear() + (k - 1) * 10;
      seq.push({ gz: gz(i), from: sy, to: sy + 9, age: Math.round(yrs) + (k - 1) * 10 });
    }
    // 交脫：交運日之前最近的節＋天數
    const sy = sd.getUTCFullYear();
    let best = null;
    for (let yy = sy - 1; yy <= sy; yy++) for (let k = 0; k < 12; k++) { const j = jieJd(yy, k); if (j <= startJd && (!best || j > best.j)) best = { j, k }; }
    const after = Math.round(startJd - best.j);
    const g1 = GAN[((sy - 4) % 10 + 10) % 10], g2 = GAN[((sy + 1) % 10 + 10) % 10];
    const dg = v => (((v - 1911) % 10) + 10) % 10;
    const roc = [dg(sy), dg(sy + 5)];
    const order = roc[0] <= roc[1] ? [[g1, roc[0]], [g2, roc[1]]] : [[g2, roc[1]], [g1, roc[0]]];
    const text = `每逢${order[0][0]}(?${order[0][1]})、${order[1][0]}(?${order[1][1]})年${JIE[best.k]}後${after}天交脫大運`;
    return { forward: fwd, days, years: yrs, start: sd, seq, text, pillars: p.pillars };
  }
  const current = (dy, year) => dy.seq.find(s => year >= s.from && year <= s.to) || null;

  // ===== 農曆（以朔與中氣定月，冬至所在為十一月）=====
  function newMoon(k) { // Meeus 49
    const T = k / 1236.85, r = D2R;
    let JDE = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3;
    const E = 1 - 0.002516 * T, M = (2.5534 + 29.1053567 * k) * r, Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * r;
    const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * r, Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * r;
    JDE += -0.4072 * Math.sin(Mp) + 0.17241 * E * Math.sin(M) + 0.01608 * Math.sin(2 * Mp) + 0.01039 * Math.sin(2 * F)
      + 0.00739 * E * Math.sin(Mp - M) - 0.00514 * E * Math.sin(Mp + M) + 0.00208 * E * E * Math.sin(2 * M)
      - 0.00111 * Math.sin(Mp - 2 * F) - 0.00057 * Math.sin(Mp + 2 * F) + 0.00056 * E * Math.sin(2 * Mp + M)
      - 0.00042 * Math.sin(3 * Mp) + 0.00042 * E * Math.sin(M + 2 * F) + 0.00038 * E * Math.sin(M - 2 * F)
      - 0.00024 * E * Math.sin(2 * Mp - M) - 0.00017 * Math.sin(Om);
    return JDE - (69 / 86400); // 約略 ΔT
  }
  const localDay = jd => Math.floor(jd + 0.5 + 8 / 24); // 台灣日序
  function nmBefore(jd) { let k = Math.floor((jd - 2451550.1) / 29.530588861) + 1; while (newMoon(k) > jd) k--; return k; }
  function lunar(y, m, d) {
    const day = localDay(jdOf(y, m, d, 12));
    const ws = yy => termAt(270, jdOf(yy, 12, 21)); // 冬至
    let w0 = ws(y - 1), w1 = ws(y);
    if (localDay(w1) <= day) { w0 = w1; w1 = ws(y + 1); }
    // 冬至所在月的朔
    let k0 = nmBefore(w0); if (localDay(newMoon(k0 + 1)) <= localDay(w0)) k0++;
    let k1 = nmBefore(w1); if (localDay(newMoon(k1 + 1)) <= localDay(w1)) k1++;
    const leapYear = k1 - k0 === 13;
    let kc = nmBefore(jdOf(y, m, d, 23.99)); while (localDay(newMoon(kc)) > day) kc--; while (localDay(newMoon(kc + 1)) <= day) kc++;
    let num = 11, leap = false, found = false;
    for (let k = k0 + 1; k <= kc; k++) {
      const a = localDay(newMoon(k)), b = localDay(newMoon(k + 1));
      let hasZQ = false;
      if (leapYear && !found) {
        for (let z = 0; z < 12; z++) { const t = localDay(termAt((270 + 30 * (z + 1)) % 360, newMoon(k) + 15)); if (t >= a && t < b) { hasZQ = true; break; } }
        if (!hasZQ) { found = true; if (k === kc) leap = true; continue; }
      }
      num = num % 12 + 1;
    }
    return { month: num, day: day - localDay(newMoon(kc)) + 1, leap };
  }

  const API = { GAN, ZHI, JIE, jdOf, fromJd, sunLon, termAt, jieJd, pillars, dayun, current, lunar, gz, idxOf };
  if (typeof module !== "undefined") module.exports = API; else root.XFCal = API;
})(typeof window !== "undefined" ? window : globalThis);
