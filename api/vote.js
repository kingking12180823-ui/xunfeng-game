// 講座投票 API：/api/vote
// 需要 Vercel 環境變數：
//   KV_REST_API_URL / KV_REST_API_TOKEN（或 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN）— Upstash Redis
//   VOTE_KEY — 主持人密鑰（主持頁網址 /vote/host#k=VOTE_KEY）
// 資料只為當場顯示，所有鍵 12 小時後自動過期。

const QUESTION_COUNT = 5;
const CORRECT = [1, 2, 0, 1, 1];
const TTL = 60 * 60 * 12;
const STATE = "xv:state";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(commands) {
  const res = await fetch(REDIS_URL.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + REDIS_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error("redis " + res.status);
  const out = await res.json();
  return out.map(r => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const LOBBY = { sid: "", index: 0, phase: "lobby", counts: [] };

async function loadState() {
  const [raw] = await redis([["GET", STATE]]);
  return raw ? JSON.parse(raw) : { ...LOBBY };
}

function saveCmd(state) {
  return ["SET", STATE, JSON.stringify(state), "EX", String(TTL)];
}

const voteKey = (sid, i) => `xv:${sid}:${i}`;

function tally(values) {
  const c = [0, 0, 0];
  for (const v of values || []) if (c[v] !== undefined) c[v] += 1;
  return c;
}

function publicView(state) {
  const view = { sid: state.sid, index: state.index, phase: state.phase, total: QUESTION_COUNT };
  if (state.phase === "revealed") {
    view.counts = state.counts[state.index] || [0, 0, 0];
    view.correct = CORRECT[state.index];
  }
  if (state.phase === "summary") view.all = state.counts;
  return view;
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => {
      data += c;
      if (data.length > 2048) reject(new Error("too large"));
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error("bad json")); }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache || "no-store");
  res.end(JSON.stringify(body));
}

const { isOwner } = require("./_owner.js");
async function isHost(req) {
  const key = process.env.VOTE_KEY;
  if (key && req.headers["x-vote-key"] === key) return true;
  return isOwner(req);   // 站長登入後不需密鑰
}

module.exports = async function handler(req, res) {
  if (!REDIS_URL || !REDIS_TOKEN) return send(res, 503, { error: "投票資料庫尚未設定" });
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "GET") {
      const state = await loadState();
      if (url.searchParams.get("host") === "1") {
        if (!(await isHost(req))) return send(res, 403, { error: "主持密鑰不正確" });
        const view = publicView(state);
        if (state.phase === "open") {
          const [n] = await redis([["HLEN", voteKey(state.sid, state.index)]]);
          view.received = n;
        }
        return send(res, 200, view);
      }
      // 觀眾輪詢：讓 CDN 共用 1 秒快取，30 支手機只打到資料庫一次
      return send(res, 200, publicView(state), "public, s-maxage=1, stale-while-revalidate=1");
    }

    if (req.method !== "POST") return send(res, 405, { error: "method" });
    const body = await readBody(req);

    if (body.action === "vote") {
      const { sid, index, choice, token } = body;
      if (typeof token !== "string" || !/^[a-f0-9]{32}$/.test(token)
          || !Number.isInteger(choice) || choice < 0 || choice > 2) {
        return send(res, 400, { error: "選項無效" });
      }
      const state = await loadState();
      if (state.phase !== "open" || state.sid !== sid || state.index !== index) {
        return send(res, 409, { error: "本題已截止，請等下一題" });
      }
      const k = voteKey(sid, index);
      await redis([["HSET", k, token, String(choice)], ["EXPIRE", k, String(TTL)]]);
      return send(res, 200, { ok: true });
    }

    if (!(await isHost(req))) return send(res, 403, { error: "這是主持人操作" });
    let state = await loadState();
    const act = body.action;

    if (act === "reset") {
      state = { ...LOBBY };
    } else if (act === "start") {
      state = { sid: Math.random().toString(36).slice(2, 10), index: 0, phase: "open", counts: [] };
    } else if (act === "reveal" && state.phase === "open") {
      const [values] = await redis([["HVALS", voteKey(state.sid, state.index)]]);
      state.counts[state.index] = tally((values || []).map(Number));
      state.phase = "revealed";
    } else if (act === "next" && state.phase === "revealed") {
      if (state.index + 1 >= QUESTION_COUNT) {
        state.phase = "summary";
      } else {
        state.index += 1;
        state.phase = "open";
      }
    } else {
      return send(res, 409, { error: "目前不能執行這個操作" });
    }
    await redis([saveCmd(state)]);
    const view = publicView(state);
    if (state.phase === "open") view.received = 0;
    return send(res, 200, view);
  } catch (err) {
    return send(res, 500, { error: "伺服器忙線，請再試一次" });
  }
};
