// 講座模式是否開啟：老師在 LINE 傳「開講座」開啟（預設 5 小時），「關講座」關閉
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, s-maxage=20");
  try {
    const r = await fetch(REDIS_URL.replace(/\/$/, "") + "/get/xf:lecture", { headers: { Authorization: "Bearer " + REDIS_TOKEN } });
    const j = await r.json();
    const until = parseInt(j.result || "0", 10);
    res.status(200).json({ on: until > Date.now(), until: until || null });
  } catch (e) { res.status(200).json({ on: false }); }
};
