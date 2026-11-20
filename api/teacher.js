// 老師專用：/api/teacher?t=閱讀碼&b=1978-09-05&h=10&mi=0&s=m
const { checkToken } = require("./_token.js");
const { compute } = require("./_liuyue.js");
module.exports = function handler(req, res) {
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  res.setHeader("Cache-Control", "no-store");
  const ok = checkToken((process.env.LINE_CHANNEL_SECRET || "").trim(), q.t, "teacher");
  if (!ok || ok.expired) { res.status(403).json({ ok: false, reason: ok && ok.expired ? "expired" : "invalid" }); return; }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.b || "");
  if (!m || !/^[mf]$/.test(q.s || "")) { res.status(400).json({ ok: false, reason: "input" }); return; }
  const hour = q.h === "" || q.h == null ? null : Math.max(0, Math.min(23, +q.h));
  try {
    res.status(200).json({ ok: true, r: compute({ y: +m[1], m: +m[2], d: +m[3], hour, minute: Math.max(0, Math.min(59, +(q.mi || 0))), sex: q.s }) });
  } catch (e) { res.status(500).json({ ok: false, reason: String(e.message || e) }); }
};
