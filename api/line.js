// LINE 官方帳號 Webhook：/api/line
// 客人傳「流年卡解鎖」→ 回一條 24 小時有效的個人閱讀連結（之後自動失效，不用人工換口令）。
// 需要 Vercel 環境變數（由老師自己貼上）：LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN
const crypto = require("crypto");
const { makeToken, makeUserToken } = require("./_token.js");

const SECRET = (process.env.LINE_CHANNEL_SECRET || "").trim();
const TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
const SITE = "https://xunfeng-game.vercel.app";
const TEACHERS = ["09858aa8b13b94c15584a77b31208e4fabc1e4329676e8c583ab57eff1970b35"];
const BIND = "6e9e322ae00d9aced5956c9226d07b9bf5bfe17b2df1655be13875e7392d6a5e";
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function redis(cmds) {
  const r = await fetch(REDIS_URL.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + REDIS_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).map(x => x.result);
}

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
    const uid = (ev.source && ev.source.userId) || "";
    if (/老師後台|流月詳批|開講座|關講座/.test(t)) {
      // 只認風羿老師本人的 LINE：第一次用「老師後台 綁定密語」綁定，之後直接傳指令即可
      const uh = crypto.createHash("sha256").update(uid).digest("hex");
      const word = t.replace(/老師後台|流月詳批|開講座|關講座/g, "").replace(/\s/g, "");
      let ok = TEACHERS.includes(uh);
      try {
        if (!ok && word && crypto.createHash("sha256").update("xf-bind:" + word).digest("hex") === BIND) { await redis([["SADD", "xf:teachers", uh]]); ok = true; }
        if (!ok) { const [m] = await redis([["SISMEMBER", "xf:teachers", uh]]); ok = m === 1; }
      } catch (e) { console.error("teacher check", e.message); }
      if (!ok) continue;
      if (/開講座/.test(t)) {
        const hrs = Math.min(12, Math.max(1, parseInt((t.match(/(\d+)\s*小?時/) || [])[1] || "5", 10)));
        const until = Date.now() + hrs * 3600e3;
        await redis([["SET", "xf:lecture", String(until), "PX", String(hrs * 3600e3)]]);
        const u = new Date(until + 8 * 3600e3);
        await reply(ev.replyToken, `講座模式已開啟，到 ${u.getUTCHours()}:${String(u.getUTCMinutes()).padStart(2, "0")} 自動關閉。\n這段時間內，流年卡與求籤頁都會出現「講座口令」欄，學員輸入此刻時柱即可解鎖。\n提早結束請傳「關講座」。`);
      } else if (/關講座/.test(t)) {
        await redis([["DEL", "xf:lecture"]]);
        await reply(ev.replyToken, "講座模式已關閉。");
      } else {
        const { token } = makeToken(SECRET, 24 * 30, "teacher");
        await reply(ev.replyToken, `老師專用・流月詳批（30 天內有效，請勿轉傳）：\n${SITE}/teacher#t=${token}`);
      }
      continue;
    }
    if (/我要問事|問事籤/.test(t)) {
      // 問事籤：連結綁定這位 LINE 使用者，同一句問題永遠是同一支籤
      const uh = crypto.createHash("sha256").update("xf-user:" + uid).digest("hex").slice(0, 16);
      try {
        const pr = await fetch("https://api.line.me/v2/bot/profile/" + encodeURIComponent(uid), { headers: { Authorization: "Bearer " + TOKEN } });
        if (pr.ok) { const j = await pr.json(); if (j.displayName) await redis([["HSET", "xf:names", uh, String(j.displayName).slice(0, 30)]]); }
      } catch (e) {}
      const { token } = makeUserToken(SECRET, 24, "ask", uh);
      await reply(ev.replyToken, `您的問事籤連結（24 小時內有效）：\n${SITE}/qian?m=ask#a=${token}\n\n一件事問一次；同一件事再問，會是同一支籤。`);
      continue;
    }
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
