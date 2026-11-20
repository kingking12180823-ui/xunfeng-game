// 驗證流年卡閱讀碼：/api/unlock?t=...
const { checkToken } = require("./_token.js");
module.exports = function handler(req, res) {
  const t = (req.query && req.query.t) || new URL(req.url, "http://x").searchParams.get("t");
  const r = checkToken((process.env.LINE_CHANNEL_SECRET || "").trim(), t);
  res.setHeader("Cache-Control", "no-store");
  if (!r) { res.status(200).json({ ok: false, reason: "invalid" }); return; }
  if (r.expired) { res.status(200).json({ ok: false, reason: "expired" }); return; }
  res.status(200).json({ ok: true, exp: r.exp });
};
