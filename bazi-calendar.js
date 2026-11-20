/* 巽風曆法：四柱、農曆、節氣、大運（3 天＝1 年）。時間一律以台灣時間（UTC+8）鐘錶時。 */
(function (root) {
  const GAN = "甲乙丙丁戊己庚辛壬癸", ZHI = "子丑寅卯辰巳午未申酉戌亥";
  const JIE = ["立春", "驚蟄", "清明", "立夏", "芒種", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"]; // 寅月起
  const D2R = Math.PI / 180;
  // 台灣時間 → JD（UT）
  const jdOf = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, 0, 0, 0) / 864e5 + 2440587.5 + (h - 8) / 24;
  const fromJd = jd => new Date((jd - 2440587.5) * 864e5 + 8 * 3600e3); // 取 getUTC* 即台灣時間
  // 太陽視黃經：VSOP87 截斷項（Meeus 附錄三）＋章動＋光行差，ΔT 依 Espenak 多項式；精度約 1 分鐘
  const VS = [
    "175347046 0 0|3341656 4.6692568 6283.07585|34894 4.6261 12566.1517|3497 2.7441 5753.3849|3418 2.8289 3.5231|3136 3.6277 77713.7715|2676 4.4181 7860.4194|2343 6.1352 3930.2097|1324 0.7425 11506.7698|1273 2.0371 529.691|1199 1.1096 1577.3435|990 5.233 5884.927|902 2.045 26.298|857 3.508 398.149|780 1.179 5223.694|753 2.533 5507.553|505 4.583 18849.228|492 4.205 775.523|357 2.92 0.067|317 5.849 11790.629|284 1.899 796.298|271 0.315 10977.079|243 0.345 5486.778|206 4.806 2544.314|205 1.869 5573.143|202 2.458 6069.777|156 0.833 213.299|132 3.411 2942.463|126 1.083 20.775|115 0.645 0.98|103 0.636 4694.003|102 0.976 15720.839|102 4.267 7.114|99 6.21 2146.17|98 0.68 155.42|86 5.98 161000.69|85 1.3 6275.96|85 3.67 71430.7|80 1.81 17260.15|79 3.04 12036.46|75 1.76 5088.63|74 3.5 3154.69|74 4.68 801.82|70 0.83 9437.76|62 3.98 8827.39|61 1.82 7084.9|57 2.78 6286.6|56 4.39 14143.5|56 3.47 6279.55|52 0.19 12139.55|52 1.33 1748.02|51 0.28 5856.48|49 0.49 1194.45|41 5.37 8429.24|41 2.4 19651.05|39 6.17 10447.39|37 6.04 10213.29|37 2.57 1059.38|36 1.71 2352.87|36 1.78 6812.77|33 0.59 17789.85|30 0.44 83996.85|30 2.74 1349.87|25 3.16 4690.48",
    "628331966747 0 0|206059 2.678235 6283.07585|4303 2.6351 12566.1517|425 1.59 3.523|119 5.796 26.298|109 2.966 1577.344|93 2.59 18849.23|72 1.14 529.69|68 1.87 398.15|67 4.41 5507.55|59 2.89 5223.69|56 2.17 155.42|45 0.4 796.3|36 0.47 775.52|29 2.65 7.11|21 5.34 0.98|19 1.85 5486.78|19 4.97 213.3|17 2.99 6275.96|16 0.03 2544.31|16 1.43 2146.17|15 1.21 10977.08|12 2.83 1748.02|12 3.26 5088.63|12 5.27 1194.45|12 2.08 4694|11 0.77 553.57|10 1.3 6286.6|10 4.24 1349.87|9 2.7 242.73|9 5.64 951.72|8 5.3 2352.87|6 2.65 9437.76|6 4.67 4690.48",
    "52919 0 0|8720 1.0721 6283.0758|309 0.867 12566.152|27 0.05 3.52|16 5.19 26.3|16 3.68 155.42|10 0.76 18849.23|9 2.06 77713.77|7 0.83 775.52|5 4.66 1577.34|4 1.03 7.11|4 3.44 5573.14|3 5.14 796.3|3 6.05 5507.55|3 1.19 242.73|3 6.12 529.69|3 0.31 398.15|3 2.28 553.57|2 4.38 5223.69|2 3.75 0.98",
    "289 5.844 6283.076|35 0 0|17 5.49 12566.15|3 5.2 155.42|1 4.72 3.52|1 5.3 18849.23|1 5.97 242.73",
    "114 3.142 0|8 4.13 6283.08|1 3.84 12566.15", "1 3.14 0"
  ].map(r => r.split("|").map(t => t.split(" ").map(Number)));
  function deltaT(y) {
    if (y < 1941) { const t = y - 1920; return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
    if (y < 1961) { const t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (y < 1986) { const t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (y < 2005) { const t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    const t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  function sunLon(jdUT) {
    const jde = jdUT + deltaT(2000 + (jdUT - 2451545) / 365.25) / 86400, tau = (jde - 2451545) / 365250, T = tau * 10;
    let L = 0; VS.forEach((ser, n) => { let s = 0; ser.forEach(([A, Bp, Cc]) => s += A * Math.cos(Bp + Cc * tau)); L += s * tau ** n; });
    L = L / 1e8 / D2R + 180; // 地心
    const Om = (125.04452 - 1934.136261 * T) * D2R, Ls = (280.4665 + 36000.7698 * T) * D2R, Lm = (218.3165 + 481267.8813 * T) * D2R;
    const dpsi = (-17.2 * Math.sin(Om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * Om)) / 3600;
    L += -0.09033 / 3600 + dpsi - 20.4898 / 3600;
    return ((L % 360) + 360) % 360;
  }
  // 太陽到達黃經 lon 的時刻（在 jd0 附近 ±20 天內）
  function termAt(lon, jd0) {
    const f = j => ((sunLon(j) - lon + 540) % 360) - 180;
    let a = jd0 - 20, b = jd0 + 20;
    for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (f(c) < 0) a = c; else b = c; }
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
    // 依黃教授排盤：年數拆成「年、月（12）、日（30）、時」，再以曆日相加
    const Y = Math.floor(yrs), mf = (yrs - Y) * 12, M = Math.floor(mf), df = (mf - M) * 30, Dd = Math.floor(df), Hh = (df - Dd) * 24;
    const bd = fromJd(jd);
    const sd = new Date(Date.UTC(bd.getUTCFullYear() + Y, bd.getUTCMonth() + M, bd.getUTCDate() + Dd, bd.getUTCHours(), bd.getUTCMinutes()) + Hh * 3600e3);
    const startJd = sd.getTime() / 864e5 + 2440587.5 - 8 / 24;
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
    const dOnly = d => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), after = Math.round((dOnly(sd) - dOnly(fromJd(best.j))) / 864e5);
    const g1 = GAN[((sy - 4) % 10 + 10) % 10], g2 = GAN[((sy + 1) % 10 + 10) % 10];
    const dg = v => (((v - 1911) % 10) + 10) % 10;
    const roc = [dg(sy), dg(sy + 5)];
    const order = roc[0] <= roc[1] ? [[g1, roc[0]], [g2, roc[1]]] : [[g2, roc[1]], [g1, roc[0]]];
    const text = `每逢${order[0][0]}(?${order[0][1]})、${order[1][0]}(?${order[1][1]})年${JIE[best.k]}後${after}天交脫大運`;
    return { forward: fwd, days, years: yrs, ymd: [Y, M, Dd], start: sd, seq, text, pillars: p.pillars };
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
