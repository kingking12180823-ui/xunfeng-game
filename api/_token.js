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

// 帶使用者身分的閱讀碼（問事籤用）：到期.使用者雜湊.簽章
const signU = (secret, exp, scope, uh) => crypto.createHmac("sha256", secret).update("xf-" + scope + ":" + exp + ":" + uh).digest("base64url").slice(0, 16);
function makeUserToken(secret, hours, scope, uh) {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  return { token: exp.toString(36) + "." + uh + "." + signU(secret, exp, scope, uh), exp };
}
function checkUserToken(secret, token, scope) {
  const m = /^([0-9a-z]+)\.([0-9a-f]{16})\.([A-Za-z0-9_-]{16})$/.exec(token || "");
  if (!m || !secret) return null;
  const exp = parseInt(m[1], 36), a = Buffer.from(m[3]), b = Buffer.from(signU(secret, exp, scope, m[2]));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (exp * 1000 < Date.now()) return { expired: true, exp, uh: m[2] };
  return { exp, uh: m[2] };
}
module.exports.makeUserToken = makeUserToken;
module.exports.checkUserToken = checkUserToken;
