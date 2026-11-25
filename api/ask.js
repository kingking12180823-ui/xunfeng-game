// 問事籤：同一個人、同一句問題，永遠是同一支籤
// GET  ?op=check&t=&q=      → 查是否問過
// POST {op:"save",t,q,a,n,y} → 存（已存在則回傳原籤）
// GET  ?op=log&tt=老師碼     → 最近問事紀錄（老師專用）
const crypto = require("crypto");
const { checkUserToken, checkToken } = require("./_token.js");
const { isOwner } = require("./_owner.js");
const { redis } = require("./_redis.js");
const SECRET = () => (process.env.LINE_CHANNEL_SECRET || "").trim();
const norm = q => String(q || "").normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase().slice(0, 80);
const fkey = q => crypto.createHash("sha256").update(norm(q)).digest("hex").slice(0, 24);

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise(ok => { let s = ""; req.on("data", c => s += c); req.on("end", () => { try { ok(JSON.parse(s || "{}")) } catch (e) { ok({}) } }); });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const q0 = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  const body = req.method === "POST" ? await readBody(req) : {};
  const p = Object.assign({}, q0, body);
  try {
    if (p.op === "log") {
      const ok = checkToken(SECRET(), p.tt, "teacher");
      if ((!ok || ok.expired) && !(await isOwner(req))) { res.status(403).json({ ok: false }); return; }
      const [list] = await redis([["LRANGE", "xf:asklog", "0", "199"]]);
      res.status(200).json({ ok: true, list: (list || []).map(x => { try { return JSON.parse(x) } catch (e) { return null } }).filter(Boolean) });
      return;
    }
    const u = checkUserToken(SECRET(), p.t, "ask");
    if (!u || u.expired) { res.status(403).json({ ok: false, reason: u && u.expired ? "expired" : "invalid" }); return; }
    const qn = norm(p.q);
    if (qn.length < 4) { res.status(400).json({ ok: false, reason: "short" }); return; }
    const key = "xf:ask:" + u.uh, f = fkey(p.q);
    if (p.op === "check") {
      const [v] = await redis([["HGET", key, f]]);
      res.status(200).json({ ok: true, rec: v ? JSON.parse(v) : null });
      return;
    }
    if (p.op === "save" && req.method === "POST") {
      const n = +p.n, y = +p.y, a = +p.a;
      if (!(n >= 1 && n <= 64 && y >= 0 && y <= 5 && a >= 0 && a <= 6)) { res.status(400).json({ ok: false, reason: "bad" }); return; }
      const rec = { n, y, a, q: String(p.q).slice(0, 80), t: Date.now(), who: String(p.who || "").slice(0, 8) };
      const [set] = await redis([["HSETNX", key, f, JSON.stringify(rec)]]);
      if (set === 0) { const [v] = await redis([["HGET", key, f]]); res.status(200).json({ ok: true, rec: JSON.parse(v), existed: true }); return; }
      const [name] = await redis([["HGET", "xf:names", u.uh]]);
      await redis([["LPUSH", "xf:asklog", JSON.stringify(Object.assign({ u: u.uh, name: name || "" }, rec))], ["LTRIM", "xf:asklog", "0", "999"]]);
      res.status(200).json({ ok: true, rec });
      return;
    }
    res.status(400).json({ ok: false, reason: "op" });
  } catch (e) { res.status(500).json({ ok: false, reason: String(e.message || e) }); }
};
