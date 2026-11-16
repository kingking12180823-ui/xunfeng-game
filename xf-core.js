// 巽風共用核心（預留整合用）：推薦碼、使用者基本資料、各產品網址
// 陽宅辨煞、流年卡、巽風籤、日後大藏經有聲館都讀寫同一份資料，使用者只需輸入一次。
(function(){
  var XF = window.XF = window.XF || {};
  XF.KEYS = { ref: "xunfeng-ref", profile: "xunfeng-profile", qian: "xunfeng-qian-2027" };
  // 各產品入口（統一管理，日後換網域只改這裡）
  XF.LINKS = {
    game:   "/",          // 陽宅辨煞
    card:   "/2027",      // 2027 流年卡
    qian:   "/qian",      // 巽風三百八十四籤
    audio:  "https://audio.xunfeng.tw/", // 大藏經有聲館（預留）
    tianji: "https://www.xunfeng.tw/member-ai/decision",
    face:   "https://www.xunfeng.tw/member-ai/face",
    booking:"https://www.xunfeng.tw/booking",
    line:   "https://lin.ee/QPJ7XDY"
  };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  // 推薦碼：?r= 或 #r=，存起來後全站沿用
  XF.ref = function () {
    try {
      var q = new URLSearchParams(location.search).get("r") || (location.hash.match(/r=([^&]+)/) || [])[1];
      if (q) { q = decodeURIComponent(q); ls(XF.KEYS.ref, q); return q; }
    } catch (e) {}
    return ls(XF.KEYS.ref) || "";
  };
  XF.withRef = function (u, extra) {
    var r = XF.ref(), p = [];
    if (r) p.push("ref=" + encodeURIComponent(r));
    if (extra) p.push(extra);
    return p.length ? u + (u.indexOf("?") > -1 ? "&" : "?") + p.join("&") : u;
  };
  // 使用者基本資料：{birth:"1980-01-01", hour:"5"|"" , sex:"m"|"f", name:""}
  XF.getProfile = function () { try { return JSON.parse(ls(XF.KEYS.profile) || "{}"); } catch (e) { return {}; } };
  XF.saveProfile = function (patch) {
    var p = XF.getProfile();
    for (var k in patch) if (patch[k] !== undefined && patch[k] !== null) p[k] = patch[k];
    p.updated = Date.now();
    ls(XF.KEYS.profile, JSON.stringify(p));
    return p;
  };
  XF.getQian = function () { try { return JSON.parse(ls(XF.KEYS.qian) || "null"); } catch (e) { return null; } };
  // 統一的追蹤事件名稱：產品_動作
  XF.track = function (name, data) { try { window.va && window.va("event", { name: name, data: data || {} }); } catch (e) {} };
})();
