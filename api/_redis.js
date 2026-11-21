const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK_ = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
async function redis(cmds) {
  const r = await fetch(URL_.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + TOK_, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).map(x => x.result);
}
module.exports = { redis };
