// 站長辨識：用 xunfengtw.com 共用的站長登入（大藏經／頭像同一套），向 audio.xunfengtw.com 確認
async function isOwner(req) {
  const cookie = (req.headers && req.headers.cookie) || "";
  if (!/(^|;\s*)(sid|adm)=/.test(cookie)) return false;
  try {
    const r = await fetch("https://audio.xunfengtw.com/api/owner-check", { headers: { cookie } });
    const j = await r.json();
    return !!(j && j.owner);
  } catch (e) { return false; }
}
module.exports = { isOwner };
