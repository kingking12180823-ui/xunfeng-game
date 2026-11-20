// 流年卡閱讀碼：到期時間＋HMAC 簽章（以 LINE Channel secret 為金鑰，不另設金鑰）
const crypto = require("crypto");
const sign = (secret, exp, scope) => crypto.createHmac("sha256", secret).update("xf-" + (scope || "card") + ":" + exp).digest("base64url").slice(0, 16);
function makeToken(secret, hours, scope) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  return { token: exp.toString(36) + "." + sign(secret, exp, scope), exp };
}
function checkToken(secret, token, scope) {
  const m = /^([0-9a-z]+)\.([A-Za-z0-9_-]{16})$/.exec(token || "");
  if (!m || !secret) return null;
  const exp = parseInt(m[1], 36);
  const a = Buffer.from(m[2]), b = Buffer.from(sign(secret, exp, scope));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (exp * 1000 < Date.now()) return { expired: true, exp };
  return { exp };
}
module.exports = { makeToken, checkToken };
