// 綠界科技 全方位金流：信用卡定期定額（月繳／年繳）；年繳另可超商代碼／ATM 一次付清（不續訂）
// 金鑰由站長在後台「金流設定」輸入（存 D1 settings），未設定時一律走綠界公開測試環境。

export const STAGE = { merchant: '3002607', key: 'pwFHCqoQZGmho4w6', iv: 'EkRm7iFT261dpevs' }; // 綠界文件公開的測試帳號
export const HOST = { stage: 'https://payment-stage.ecpay.com.tw', prod: 'https://payment.ecpay.com.tw' };
// 定期定額：月繳每月 1 次、共 99 期；年繳每年 1 次、共 9 期（綠界上限）
export const PERIOD = { monthly: { type: 'M', freq: 1, times: 99, add: '+1 month' }, yearly: { type: 'Y', freq: 1, times: 9, add: '+1 year' } };

export async function getConf(env) {
  const rows = (await env.DB.prepare("SELECT key, value FROM settings WHERE key LIKE 'ecpay_%' OR key='payments_on'").all()).results;
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const prod = s.ecpay_mode === 'prod' && s.ecpay_merchant && s.ecpay_key && s.ecpay_iv;
  return {
    mode: prod ? 'prod' : 'stage',
    merchant: prod ? s.ecpay_merchant : STAGE.merchant,
    key: prod ? s.ecpay_key : STAGE.key,
    iv: prod ? s.ecpay_iv : STAGE.iv,
    on: s.payments_on === '1',
    hasKeys: !!(s.ecpay_merchant && s.ecpay_key && s.ecpay_iv),
    merchantShown: s.ecpay_merchant || '',
  };
}

// 綠界 CheckMacValue：參數依名稱排序 → 前後加 HashKey/HashIV → .NET 式 URL 編碼 → 小寫 → SHA256 → 大寫
export function dotnetEncode(s) {
  return encodeURIComponent(s).replace(/%20/g, '+').replace(/~/g, '%7e').replace(/'/g, '%27').toLowerCase();
}
export async function checkMac(params, key, iv) {
  const keys = Object.keys(params).filter((k) => k !== 'CheckMacValue').sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));
  const raw = dotnetEncode(`HashKey=${key}&${keys.map((k) => `${k}=${params[k]}`).join('&')}&HashIV=${iv}`);
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export async function verify(params, conf) {
  if (!params.CheckMacValue) return false;
  return (await checkMac(params, conf.key, conf.iv)) === String(params.CheckMacValue).toUpperCase();
}

const pad = (n) => String(n).padStart(2, '0');
export function twTime(d = new Date()) {
  const t = new Date(d.getTime() + 8 * 3600e3);
  return `${t.getUTCFullYear()}/${pad(t.getUTCMonth() + 1)}/${pad(t.getUTCDate())} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
}
export function newTradeNo() {
  return 'XF' + Date.now().toString(36).toUpperCase() + [...crypto.getRandomValues(new Uint8Array(5))].map((b) => (b % 36).toString(36)).join('').toUpperCase();
}

// 建立定期定額訂單：回傳自動送出的表單 HTML（使用者瀏覽器直接 POST 到綠界，卡號只在綠界頁面輸入）
