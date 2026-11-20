// LINE 官方帳號 Webhook：/api/line
// 客人傳「流年卡解鎖」→ 回一條 24 小時有效的個人閱讀連結（之後自動失效，不用人工換口令）。
// 需要 Vercel 環境變數（由老師自己貼上）：LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN
const crypto = require("crypto");
const { makeToken } = require("./_token.js");

const SECRET = (process.env.LINE_CHANNEL_SECRET || "").trim();
const TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
const SITE = "https://xunfeng-game.vercel.app";

function rawBody(req) {
  return new Promise((ok, no) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", no);
  });
}

async function reply(replyToken, text) {
  const r = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!r.ok) console.error("line reply", r.status, await r.text());
}

// 客人訊息裡帶的生日資料（由流年卡按鈕自動填入），原樣帶回連結，讓頁面自動算出來
function parseBirth(t) {
  const d = (t.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
  const h = (t.match(/時辰[:：]\s*(\d{1,2})/) || [])[1];
  const s = /性別[:：]\s*女/.test(t) ? "f" : /性別[:：]\s*男/.test(t) ? "m" : "";
  let q = "";
  if (d) q += "&b=" + d;
  if (h != null) q += "&h=" + h;
  if (s) q += "&s=" + s;
  return q;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(200).send("ok"); return; }
  const body = await rawBody(req);
  if (!SECRET || !TOKEN) { res.status(200).send("not configured"); return; }
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64");
  const got = req.headers["x-line-signature"] || "";
  if (got.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(sig))) { res.status(401).send("bad signature"); return; }
  let data = {};
  try { data = JSON.parse(body.toString("utf8")); } catch (e) {}
  for (const ev of data.events || []) {
    if (ev.type !== "message" || !ev.message || ev.message.type !== "text") continue;
    const t = ev.message.text || "";
    if (/流年卡/.test(t) && /解鎖|閱讀|看完整/.test(t)) {
      const { token, exp } = makeToken(SECRET, 24);
      const until = new Date(exp * 1000 + 8 * 3600e3);
      const hhmm = `${until.getUTCMonth() + 1}/${until.getUTCDate()} ${String(until.getUTCHours()).padStart(2, "0")}:${String(until.getUTCMinutes()).padStart(2, "0")}`;
      await reply(ev.replyToken,
        `您的 2027 丁未流年卡完整版閱讀連結（24 小時內有效，至 ${hhmm} 止）：\n${SITE}/2027#u=${token}\n（打開後輸入您的生日即可看完整解讀）\n\n想看各月吉凶與宜忌細節，可預約風羿老師「流月細批」。`);
    }
  }
  res.status(200).send("ok");
};
