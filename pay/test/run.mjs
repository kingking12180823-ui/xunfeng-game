// 流月詳批收費服務：下單 → 綠界回呼 → 報告；兌換碼；後台
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { handle, normCode } from '../src/index.js';
import { checkMac } from '../src/ecpay.js';
import { buildReport } from '../src/report.js';

let pass = 0, fail = 0;
const ok = (c, n) => { c ? pass++ : fail++; console.log(`${c ? '✓' : '✗'} ${n}`); };
const dir = new URL('../migrations/', import.meta.url);
const sqlite = new DatabaseSync(':memory:');
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(f, dir), 'utf8'));
const DB = { prepare(sql) { let a = []; const s = { bind(...x) { a = x; return s; }, async first() { return sqlite.prepare(sql).get(...a) ?? null; }, async all() { return { results: sqlite.prepare(sql).all(...a) }; }, async run() { const r = sqlite.prepare(sql).run(...a); return { meta: { changes: r.changes } }; } }; return s; } };
const env = { DB, ADMIN_TOKEN: 'adm' };
const h = (path, init) => handle(new Request('https://pay.xunfengtw.com' + path, init), env);
const form = (o) => ({ method: 'POST', body: new URLSearchParams(o) });

// 報告內容
const r = buildReport({ name: '我', y: 1978, m: 9, d: 5, h: 5, s: 'm' });
ok(r.months.length === 12 && r.months.every((m) => m.first.sym && m.second.sym), '12 個月都有上下半月吉凶');
ok(!JSON.stringify(r).includes('女命') && !buildReport({ y: 1982, m: 3, d: 15, h: null, s: 'f' }).year.main.includes('男命'), '只留本人性別適用的句子');
ok(r.pillars.length === 4 && r.year.axis, '有四柱與全年主軸');
const r0 = buildReport({ y: 1990, m: 2, d: 3, h: null, s: 'f' });
ok(r0.hourName === '時辰不詳' && r0.months.length === 12, '時辰不詳也能推算');
ok(!r.months.some((m) => /[+-]\d|合喜用|犯忌|剋/.test(JSON.stringify([m.first.good, m.first.warn, m.first.theme]))), '客人版不出現推算分數與術語標記');

// 下單頁
let t = await (await h('/liuyue?b=1978-09-05&h=5&s=m')).text();
ok(t.includes('NT$199') && t.includes('NT$499') && t.includes('value="1978-09-05"'), '下單頁帶入流年卡的生日');
ok((await h('/liuyue/order', form({ plan: 'single', email: 'x', method: 'credit', p0_b: '1978-09-05', p0_s: 'm' }))).status === 400, 'Email 錯誤被擋');
ok((await (await h('/liuyue/order', form({ plan: 'single', email: 'a@b.tw', method: 'credit', p0_b: '1978-09-05', p0_s: 'm', p1_b: '1980-01-01', p1_s: 'f' }))).text()).includes('全家方案'), '單人方案填兩位被擋');

// 付款
const pay = await (await h('/liuyue/order', form({ plan: 'family', email: 'A@b.tw', method: 'credit', p0_b: '1978-09-05', p0_h: '5', p0_s: 'm', p0_n: '爸爸', p1_b: '1982-03-15', p1_s: 'f', p1_n: '媽媽' }))).text();
const F = Object.fromEntries([...pay.matchAll(/name="(\w+)" value="([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&amp;/g, '&')]));
ok(F.TotalAmount === '499' && F.MerchantID === '3002607' && F.ReturnURL === 'https://pay.xunfengtw.com/ecpay/return', '全家方案綠界表單 NT$499（未設金鑰時走測試環境）');
ok(F.CheckMacValue === (await checkMac(F, 'pwFHCqoQZGmho4w6', 'EkRm7iFT261dpevs')), '檢查碼正確');
const id = F.CustomField1;
ok((await (await h('/liuyue/r/' + id)).text()).includes('等待付款確認'), '未付款看不到詳批');
const cb = async (o) => { const prm = { MerchantID: '3002607', MerchantTradeNo: F.MerchantTradeNo, RtnCode: '1', TradeAmt: '499', ...o }; prm.CheckMacValue = await checkMac(prm, 'pwFHCqoQZGmho4w6', 'EkRm7iFT261dpevs'); return h('/ecpay/return', form(prm)); };
ok((await (await h('/ecpay/return', form({ MerchantTradeNo: F.MerchantTradeNo, RtnCode: '1', TradeAmt: '499', CheckMacValue: 'X' }))).text()).startsWith('0|'), '偽造通知被拒');
await cb({ TradeAmt: '1' });
ok((await DB.prepare('SELECT status FROM ly_orders WHERE id=?').bind(id).first()).status !== 'paid', '金額不符不解鎖');
ok((await (await cb()).text()) === '1|OK', '正確付款通知');
t = await (await h('/liuyue/r/' + id)).text();
ok(t.includes('爸爸') && t.includes('媽媽') && (t.match(/上半月/g) || []).length >= 24 && t.includes('預約一對一'), '付款後顯示兩位的逐半月詳批與導流');
ok((await h('/liuyue/order', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: new URLSearchParams({}) })).status === 403, '跨站表單被擋');

// 兌換碼
ok(normCode('ly 2345 abcd') === 'LY-2345-ABCD', '兌換碼正規化');
sqlite.exec("INSERT INTO ly_codes (code, batch, plan) VALUES ('LY-2345-ABCD','t','single')");
let rr = await h('/liuyue/order', form({ plan: 'single', email: 'c@d.tw', method: 'credit', p0_b: '1990-01-01', p0_s: 'f', code: 'ly2345abcd' }));
ok(rr.status === 303 && rr.headers.get('Location').startsWith('/liuyue/r/'), '兌換碼直接開通，不用付款');
rr = await h('/liuyue/order', form({ plan: 'single', email: 'c@d.tw', method: 'credit', p0_b: '1990-01-01', p0_s: 'f', code: 'LY-2345-ABCD' }));
ok((await rr.text()).includes('已使用'), '同一組兌換碼不能再用');

// 後台
ok((await h('/admin')).status === 303, '未登入不能進後台');
const lg = await h('/admin/login', form({ token: 'adm' }));
const cookie = lg.headers.get('Set-Cookie').split(';')[0];
await h('/admin/settings', { ...form({ merchant: '3888888', key: 'KEYKEYKEYKEYKEY1', iv: 'IVIVIVIVIVIVIV12', mode: 'prod' }), headers: { Cookie: cookie } });
const p2 = await (await h('/liuyue/order', form({ plan: 'single', email: 'e@f.tw', method: 'cvs', p0_b: '1978-09-05', p0_s: 'm' }))).text();
ok(p2.includes('value="3888888"') && p2.includes('payment.ecpay.com.tw') && p2.includes('value="199"'), '後台填入老師的綠界後，改用正式商店收 NT$199');
await h('/admin/codes', { ...form({ batch: '講座', n: '10', plan: 'family' }), headers: { Cookie: cookie } });
ok((await DB.prepare("SELECT COUNT(*) n FROM ly_codes WHERE batch='講座' AND plan='family'").first()).n === 10, '後台產生全家兌換碼');
ok((await (await h('/admin', { headers: { Cookie: cookie } })).text()).includes('流月詳批後台'), '後台頁面正常');

const dr = await h('/admin/direct', { ...form({ p0_b: '1985-06-20', p0_s: 'f', p0_n: '家人' }), headers: { Cookie: cookie } });
ok(dr.status === 303 && (await (await h(dr.headers.get('Location'))).text()).includes('家人'), '站長直接開詳批');
await h('/admin/direct', form({ p0_b: '1985-06-20', p0_s: 'f' }));
ok((await DB.prepare("SELECT COUNT(*) n FROM ly_orders WHERE paid_via='owner'").first()).n === 1, '未登入不能直接開詳批');
ok(lg.headers.get('Set-Cookie').includes('Domain=xunfengtw.com'), '後台登入在 xunfengtw.com 共用');
console.log(`\n${pass} 通過，${fail} 失敗`);
process.exit(fail ? 1 : 0);
