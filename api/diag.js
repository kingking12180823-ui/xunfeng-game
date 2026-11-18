// 手機除錯回報：/api/diag  POST 寫入、GET ?k=VOTE_KEY 讀取（最近 300 筆，保留 2 天）
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function redis(cmds){const r=await fetch(REDIS_URL.replace(/\/$/,"")+"/pipeline",{method:"POST",headers:{Authorization:"Bearer "+REDIS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(cmds)});return (await r.json()).map(x=>x.result);}
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "POST") {
      let body = req.body; if (typeof body !== "string") body = JSON.stringify(body || {});
      await redis([["LPUSH","xdiag",new Date().toISOString()+" "+String(body).slice(0,4000)],["LTRIM","xdiag","0","299"],["EXPIRE","xdiag","172800"]]);
      return res.status(204).end();
    }
    if ((req.query.k || "") !== process.env.VOTE_KEY) return res.status(403).end();
    const [list] = await redis([["LRANGE","xdiag","0",String(req.query.n||80)]]);
    res.setHeader("Content-Type","text/plain; charset=utf-8");
    return res.status(200).send((list||[]).join("\n"));
  } catch (e) { return res.status(500).send(String(e)); }
};
