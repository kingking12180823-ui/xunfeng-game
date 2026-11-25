// 巽風收費服務 pay.xunfengtw.com：2027 流月詳批（系統版）
// 單人 NT$199、全家（最多 4 人）NT$499；綠界用老師自己的商店（後台輸入金鑰）
import { getConf, verify as ecVerify, checkMac, newTradeNo, HOST, twTime } from './ecpay.js';
import { buildReport, HOUR_NAME } from './report.js';

export const PLANS = { single: { label: '單人', price: 199, max: 1 }, family: { label: '全家（最多 4 人）', price: 499, max: 4 } };
const LINE = 'https://lin.ee/QPJ7XDY', BOOK = 'https://www.xunfeng.tw/booking', XIPI = 'https://game.xunfengtw.com/xipi', CARD = 'https://game.xunfengtw.com/2027';
const ID_RE = /^[0-9a-z]{24}$/, EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const H = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };
const html = (b, status = 200, extra = {}) => new Response(b, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', ...H, ...extra } });
const redirect = (to, extra = {}) => new Response(null, { status: 303, headers: { Location: to, ...extra } });
const newId = () => [...crypto.getRandomValues(new Uint8Array(24))].map((x) => (x % 36).toString(36)).join('');
export function newCode() { const b = crypto.getRandomValues(new Uint8Array(8)); let s = ''; for (const x of b) s += ABC[x % ABC.length]; return `LY-${s.slice(0, 4)}-${s.slice(4)}`; }
export function normCode(v) { const s = String(v || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^LY/, ''); return /^[0-9A-Z]{8}$/.test(s) ? `LY-${s.slice(0, 4)}-${s.slice(4)}` : ''; }
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const setKV = (env, k, v) => env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?,?,datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").bind(k, String(v)).run();
const sameOrigin = (req, url) => { const o = req.headers.get('Origin'); return !o || o === 'null' || new URL(o).host === url.host; };

// ---------- 版面 ----------
const CSS = `:root{--bg:#14110F;--card:#1E1915;--line:#3A2F22;--gold:#C9A24A;--red:#B23A2E;--txt:#F4EAD8;--mute:#B9AC93}
*{box-sizing:border-box}body{margin:0;background:var(--bg) radial-gradient(ellipse at 50% -10%,#2A2117 0,transparent 60%);color:var(--txt);font:17px/1.8 "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;word-break:keep-all}
a{color:var(--gold)}.wrap{max-width:760px;margin:0 auto;padding:22px 18px 60px}
header.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:24px}
header.top a{text-decoration:none;color:var(--gold);font:700 17px "Noto Serif TC",serif;letter-spacing:.08em;white-space:nowrap}
h1,h2,h3{font-family:"Noto Serif TC",serif;color:var(--gold);line-height:1.4}h1{font-size:28px;margin:.2em 0 .4em}h2{font-size:21px;margin:1.6em 0 .6em;padding-left:12px;border-left:4px solid var(--red)}h3{font-size:18px;margin:.6em 0 .2em}
.lead{color:var(--mute)}.muted{color:var(--mute);font-size:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin:14px 0}
label{display:block;margin:12px 0 6px;color:var(--gold);font-size:15px}
input,select{width:100%;background:#0F0D0B;border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:11px 12px;font:inherit}
input[type=radio]{width:auto;accent-color:var(--red)}
.seg{display:flex;gap:8px;flex-wrap:wrap}.seg label{margin:0;display:flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:6px 14px;color:var(--txt)}
button,.btn{display:inline-block;background:var(--red);color:#fff;border:0;border-radius:999px;padding:13px 26px;font:inherit;font-weight:700;letter-spacing:.05em;cursor:pointer;text-decoration:none}
.btn.ghost{background:transparent;border:1px solid var(--gold);color:var(--gold)}
.person{border:1px dashed var(--line);border-radius:12px;padding:6px 14px 14px;margin:12px 0}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.price{font:700 30px "Noto Serif TC",serif;color:var(--gold)}
.pillars{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center}.pillars div{background:#0F0D0B;border:1px solid var(--line);border-radius:10px;padding:6px 0}
.pillars small{display:block;color:var(--mute);font-size:12px}.pillars b{font:700 24px "Noto Serif TC",serif}
.mon{border-top:1px solid var(--line);padding:14px 0}.mon.key h3::after{content:"重點月";margin-left:8px;font-size:12px;background:var(--red);color:#fff;border-radius:6px;padding:1px 7px;vertical-align:middle}
.half{display:grid;grid-template-columns:5.5em 1fr;gap:6px;margin:6px 0}.half .t{color:var(--gold);font-size:14px}
.ok{color:#9BC59D}.no{color:#F08A7E}
.cta{text-align:center;border:1px solid var(--gold);border-radius:16px;padding:22px 16px;margin:28px 0;background:linear-gradient(180deg,#1E1915,#2A1A14)}.cta .btn{margin:5px}
footer{margin-top:36px;color:var(--mute);font-size:13px;border-top:1px solid var(--line);padding-top:14px}
@media print{body{background:#fff;color:#111}.noprint{display:none!important}.card{background:#fff;border-color:#999}h1,h2,h3{color:#7a5c12}}
@media(max-width:520px){.half{grid-template-columns:1fr}.pillars b{font-size:20px}}`;
const shell = (title, body) => `<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}｜巽風堪輿研究中心</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@700&display=swap" rel="stylesheet"><style>${CSS}</style></head><body><div class="wrap">
<header class="top noprint"><a href="/liuyue">巽風・2027 流月詳批</a></header>${body}
<footer>本詳批依巽風科學八字推算，屬象數觀點的趨勢參考，不是定論，也不涉及醫療、投資或法律判斷；重要決定請合參現況。<br>© 巽風堪輿研究中心　<a href="${LINE}">官方 LINE</a></footer></div></body></html>`;

const hourOpts = (sel) => `<option value="">不知道（不排時柱）</option>${HOUR_NAME.map((n, i) => `<option value="${i}"${String(sel) === String(i) ? ' selected' : ''}>${n}</option>`).join('')}`;
const personBlock = (i, p = {}) => `<div class="person"${i > 0 ? ' data-extra' : ''}><label>第 ${i + 1} 位${i === 0 ? '' : '（全家方案）'}　稱呼（選填）</label><input name="p${i}_n" maxlength="12" value="${esc(p.n || '')}" placeholder="例如：爸爸、自己">
<div class="row2"><div><label>出生日期（國曆）</label><input type="date" name="p${i}_b" min="1920-01-01" max="2026-12-31" value="${esc(p.b || '')}"${i === 0 ? ' required' : ''}></div>
<div><label>出生時辰</label><select name="p${i}_h">${hourOpts(p.h ?? '')}</select></div></div>
<div class="seg" style="margin-top:10px"><label><input type="radio" name="p${i}_s" value="m"${p.s === 'm' ? ' checked' : ''}> 男</label><label><input type="radio" name="p${i}_s" value="f"${p.s === 'f' ? ' checked' : ''}> 女</label></div></div>`;

function orderPage({ q, conf, msg }) {
  const first = { b: q.get('b') || '', h: q.get('h') ?? '', s: q.get('s') || '', n: q.get('n') || '' };
  return shell('2027 流月詳批', `<h1>2027 丁未流月詳批（系統版）</h1>
<p class="lead">流年卡看的是一整年的天氣；流月詳批把 2027 的十二個月，各拆成上半月、下半月，逐段寫出運勢起伏、主題，以及該把握與該留意的事。</p>
${conf.mode !== 'prod' ? '<p class="card muted">⚠ 目前為金流測試模式，付款不會真的扣款。</p>' : ''}${msg ? `<p class="card no">${esc(msg)}</p>` : ''}
<div class="card"><div class="seg"><span class="price">NT$199</span><span class="muted" style="align-self:center">單人</span><span class="price" style="margin-left:12px">NT$499</span><span class="muted" style="align-self:center">全家最多 4 人</span></div>
<p class="muted">內容：本命四柱與今年喜忌、目前大運、全年主軸，以及 12 個月 × 上下半月共 24 段的吉凶、主題、有利與留意事項。付款後立即產生，可存成 PDF。</p></div>
<form class="card" method="post" action="/liuyue/order" id="f">
<label>方案</label><div class="seg"><label><input type="radio" name="plan" value="single" checked> 單人 NT$199</label><label><input type="radio" name="plan" value="family"> 全家 NT$499</label></div>
${personBlock(0, first)}<div id="extra" hidden>${personBlock(1)}${personBlock(2)}${personBlock(3)}</div>
<label>Email（用來找回報告）</label><input type="email" name="email" required maxlength="120" placeholder="you@example.com">
<label>付款方式</label><select name="method"><option value="credit">信用卡</option><option value="cvs">超商代碼</option><option value="atm">ATM 轉帳</option></select>
<label>講座兌換碼（有的話填這裡，就不用付款）</label><input name="code" maxlength="20" placeholder="LY-XXXX-XXXX">
<p style="margin-top:18px"><button>前往付款</button></p><p class="muted">由綠界科技處理付款，卡號不經過本站。</p></form>
<p class="muted">想要老師親自逐月細批、合參你的現況？請看 <a href="${XIPI}">流月細批（老師親批）</a>。</p>
<script>const f=document.getElementById('f'),x=document.getElementById('extra');f.querySelectorAll('[name=plan]').forEach(r=>r.addEventListener('change',()=>{x.hidden=f.plan.value!=='family'}));</script>`);
}

function parsePersons(f, max) {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const b = String(f.get(`p${i}_b`) || ''), s = String(f.get(`p${i}_s`) || ''), hv = String(f.get(`p${i}_h`) ?? '');
    if (!b && i > 0) continue;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b);
    if (!m || +m[1] < 1920 || +m[1] > 2026) return { err: `第 ${i + 1} 位的出生日期不正確` };
    if (!/^[mf]$/.test(s)) return { err: `請選擇第 ${i + 1} 位的性別` };
    const h = hv === '' ? null : Math.max(0, Math.min(12, parseInt(hv, 10) || 0));
    out.push({ name: String(f.get(`p${i}_n`) || '').trim().slice(0, 12), y: +m[1], m: +m[2], d: +m[3], h, s });
  }
  if (!out.length) return { err: '請輸入出生日期' };
  if (out.length > max) return { err: '單人方案只能填一位；要多人請選全家方案' };
  return { persons: out };
}

const hs = (h, label) => `<div class="half"><div class="t">${label}<br>${esc(h.sym)}</div><div>${h.theme ? `<b>${esc(h.theme)}</b><br><span class="muted">${esc(h.themeD)}</span>` : '<span class="muted">氣勢平穩，照常推進即可。</span>'}
${h.good.map((g) => `<div class="ok">＋ ${esc(g)}</div>`).join('')}${h.warn.map((w) => `<div class="no">△ ${esc(w)}</div>`).join('')}</div></div>`;

function reportHtml(r) {
  const P = ['年柱', '月柱', '日柱', '時柱'];
  return `<div class="card"><h2 style="margin-top:.2em">${esc(r.name || '本人')}</h2>
<p class="muted">${esc(r.birth)}（農曆 ${esc(r.lunar)}）・${esc(r.hourName)}・${esc(r.sex)}</p>
<div class="pillars">${r.pillars.map((p, i) => `<div><small>${P[i]}</small><b>${esc(p)}</b></div>`).join('')}</div>
${r.special ? '<p class="no">此盤結構特殊，系統推算僅供參考，建議請風羿老師親自細批。</p>' : ''}
<h3>今年主軸：${esc(r.year.axis)}</h3><p>${esc(r.year.main)}</p>
<p class="muted">${esc(r.year.lead)}<br>${esc(r.year.xi)}<br>${esc(r.year.ji)}<br>目前大運：${esc(r.dayun)}　流年十神：${esc(r.year.ss)}</p>
<p class="muted">喜用：${esc(r.xi.join('、') || '—')}　忌：${esc(r.ji.join('、') || '—')}</p>
<h3>逐月詳批</h3><p class="muted">◎ 好　○ 平偏吉　― 平　☆ 平偏糟　★ 糟。上半月看天干之氣，下半月看地支之氣。</p>
${r.months.map((m) => `<div class="mon${m.key ? ' key' : ''}"><h3>${m.name}（${esc(m.gz)}）<span class="muted" style="font-family:inherit;font-weight:400">　${esc(m.from)}–${esc(m.to)}</span></h3>
${hs(m.first, '上半月')}${hs(m.second, '下半月')}${m.events.map((e) => `<div class="muted">・${esc(e)}</div>`).join('')}</div>`).join('')}</div>`;
}

function reportPage(o, conf) {
  const persons = JSON.parse(o.persons);
  if (o.status !== 'paid') {
    const info = o.pay_info ? JSON.parse(o.pay_info) : null;
    return shell('等待付款', `<h1>等待付款確認</h1><div class="card">${info ? `<p>${info.code ? `超商繳費代碼：<b>${esc(info.code)}</b>` : `ATM 轉帳：銀行代碼 <b>${esc(info.bank)}</b>，帳號 <b>${esc(info.account)}</b>`}<br><span class="muted">繳費期限：${esc(info.expire)}。</span></p>` : ''}
<p>付款完成後，重新整理此頁就會出現詳批（共 ${persons.length} 位）。</p><p class="muted">請收藏這個網址。</p></div>`);
  }
  return shell('2027 流月詳批', `<h1>2027 丁未流月詳批</h1><p class="muted noprint">報告編號 ${esc(o.id.slice(0, 8).toUpperCase())}・${esc(PLANS[o.plan].label)}・請收藏此網址</p>
${persons.map((p) => reportHtml(buildReport(p))).join('')}
<p class="noprint" style="text-align:center"><button class="btn ghost" onclick="print()">存成 PDF／列印</button></p>
<div class="cta noprint"><h3 style="margin-top:0">系統看的是趨勢，老師看的是你</h3><p class="muted">想把命盤、居家與近況放在一起看，或要逐月由老師親批，請預約風羿老師。</p>
<a class="btn" href="${BOOK}">預約一對一</a><a class="btn ghost" href="${XIPI}">流月細批（老師親批）</a><a class="btn ghost" href="${LINE}">官方 LINE</a></div>`);
}

function payForm(conf, params) {
  return `<!doctype html><html lang="zh-Hant-TW"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>前往綠界付款</title>
<body style="background:#14110F;color:#F4EAD8;font-family:sans-serif;text-align:center;padding:60px 16px"><p>正在前往綠界科技安全付款頁…</p>
<form id="f" method="post" action="${HOST[conf.mode]}/Cashier/AioCheckOut/V5">${Object.entries(params).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')}<button style="margin-top:12px">若未自動跳轉，請按此繼續</button></form>
<script>document.getElementById('f').submit()</script></body></html>`;
}

// ---------- 後台 ----------
async function isAdmin(req, env) {
  const ck = req.headers.get('Cookie') || '';
  const c = /(?:^|;\s*)xfp_admin=([0-9a-f]{64})/.exec(ck);
  if (env.ADMIN_TOKEN && c && c[1] === (await hmac(env.ADMIN_TOKEN, 'admin-v1'))) return true;
  // 在 xunfengtw.com 用站長帳號登入過，就直接是站長（不用另一組密碼）
  if (env.AUDIO && /(?:^|;\s*)(sid|adm)=/.test(ck)) {
    try { const r = await env.AUDIO.fetch('https://audio.xunfengtw.com/api/owner-check', { headers: { Cookie: ck } }); return !!(await r.json()).owner; } catch { return false; }
  }
  return false;
}
function adminPage({ conf, orders, batches, codes, batch, stats, msg }) {
  return shell('後台', `<h1>流月詳批後台</h1>${msg ? `<p class="card ok">${esc(msg)}</p>` : ''}
<div class="card"><b>${stats.n}</b> 筆訂單・已付款 <b>${stats.paid}</b>・累計收款 <b>NT$${stats.rev}</b></div>
<h2>綠界金流（你自己的商店）</h2><form class="card" method="post" action="/admin/settings">
<p class="muted">目前：<b>${conf.mode === 'prod' ? '正式收款' : '測試環境'}</b>${conf.merchantShown ? `・特店 ${esc(conf.merchantShown)}` : ''}</p>
<label>特店編號 MerchantID</label><input name="merchant" value="${esc(conf.merchantShown)}">
<label>HashKey</label><input name="key" type="password" placeholder="${conf.hasKeys ? '已設定（留空不變）' : ''}">
<label>HashIV</label><input name="iv" type="password" placeholder="${conf.hasKeys ? '已設定（留空不變）' : ''}">
<div class="seg" style="margin-top:12px"><label><input type="radio" name="mode" value="stage"${conf.mode !== 'prod' ? ' checked' : ''}> 測試</label><label><input type="radio" name="mode" value="prod"${conf.mode === 'prod' ? ' checked' : ''}> 正式收款</label></div>
<p style="margin-top:14px"><button>儲存</button></p></form>
<h2>站長直接開詳批</h2><form class="card" method="post" action="/admin/direct">${personBlock(0)}<p style="margin-top:12px"><button>開出詳批</button></p><p class="muted">不收費、不用兌換碼，開出後會列在下方訂單（金額 0、站長）。</p></form>
<h2>講座兌換碼</h2><form class="card" method="post" action="/admin/codes"><div class="row2"><div><label>批次名稱</label><input name="batch" required></div><div><label>數量</label><input name="n" value="30"></div></div>
<div class="seg" style="margin-top:10px"><label><input type="radio" name="plan" value="single" checked> 單人</label><label><input type="radio" name="plan" value="family"> 全家</label></div><p><button>產生</button></p>
${batches.map((b) => `<p><a href="/admin?batch=${encodeURIComponent(b.batch)}">${esc(b.batch)}</a>　${b.n} 組・已用 ${b.used}</p>`).join('')}
${batch ? `<textarea readonly style="width:100%;height:150px;background:#0F0D0B;color:#F4EAD8">${codes.map((c) => c.code + (c.used_order ? '（已用）' : '')).join('\n')}</textarea>` : ''}</form>
<h2>最近訂單</h2><div class="card">${orders.map((o) => `<p><a href="/liuyue/r/${esc(o.id)}">${esc(o.id.slice(0, 8))}</a>　${esc(o.plan)}　NT$${o.amount_twd}　${esc(o.status)}${o.paid_via ? `（${esc(o.paid_via)}）` : ''}　${esc(o.email)}　<span class="muted">${esc(String(o.created_at).slice(5, 16))}</span></p>`).join('') || '<p class="muted">尚無訂單</p>'}</div>`);
}

// ---------- 路由 ----------
export default {
  async fetch(req, env) {
    try { return await handle(req, env); } catch (e) { console.error(e); return new Response('系統暫時無法處理，請稍後再試。', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  },
};

export async function handle(req, env) {
  const url = new URL(req.url), p = url.pathname, isPost = req.method === 'POST';
  if (isPost && !p.startsWith('/ecpay/') && !sameOrigin(req, url)) return new Response('Forbidden', { status: 403 });
  if (p === '/' || p === '/liuyue/') return redirect('/liuyue' + url.search);

  if (p === '/liuyue' && req.method === 'GET') return html(orderPage({ q: url.searchParams, conf: await getConf(env), msg: '' }));

  if (p === '/liuyue/order' && isPost) {
    const f = await req.formData(), conf = await getConf(env);
    const plan = f.get('plan') === 'family' ? 'family' : 'single';
    const email = String(f.get('email') || '').trim().toLowerCase(), method = String(f.get('method') || 'credit');
    const back = (msg) => html(orderPage({ q: new URLSearchParams(), conf, msg }), 400);
    if (!EMAIL_RE.test(email)) return back('Email 格式不正確');
    if (!['credit', 'cvs', 'atm'].includes(method)) return back('付款方式不正確');
    const pr = parsePersons(f, PLANS[plan].max);
    if (pr.err) return back(pr.err);
    const id = newId();
    const code = normCode(f.get('code'));
    if (String(f.get('code') || '').trim()) {
      const c = code ? await env.DB.prepare('SELECT * FROM ly_codes WHERE code=? AND used_order IS NULL').bind(code).first() : null;
      if (!c) return back('兌換碼無效或已使用');
      if (pr.persons.length > PLANS[c.plan].max) return back('這組兌換碼是單人方案，只能填一位');
      const used = await env.DB.prepare("UPDATE ly_codes SET used_order=?, used_at=datetime('now') WHERE code=? AND used_order IS NULL").bind(id, code).run();
      if (!used.meta.changes) return back('兌換碼無效或已使用');
      await env.DB.prepare("INSERT INTO ly_orders (id, plan, persons, amount_twd, email, status, paid_via, paid_at) VALUES (?,?,?,0,?,'paid','redeem',datetime('now'))").bind(id, c.plan, JSON.stringify(pr.persons), email).run();
      return redirect(`/liuyue/r/${id}`);
    }
    const price = PLANS[plan].price, tradeNo = newTradeNo();
    await env.DB.prepare('INSERT INTO ly_orders (id, trade_no, plan, persons, amount_twd, email, method, mode) VALUES (?,?,?,?,?,?,?,?)').bind(id, tradeNo, plan, JSON.stringify(pr.persons), price, email, method, conf.mode).run();
    const params = {
      MerchantID: conf.merchant, MerchantTradeNo: tradeNo, MerchantTradeDate: twTime(), PaymentType: 'aio',
      TotalAmount: String(price), TradeDesc: '巽風2027流月詳批', ItemName: `巽風 2027 流月詳批（${PLANS[plan].label}） NT$${price}`,
      ReturnURL: `${url.origin}/ecpay/return`, ChoosePayment: { credit: 'Credit', cvs: 'CVS', atm: 'ATM' }[method], EncryptType: '1',
      ClientBackURL: `${url.origin}/liuyue/r/${id}`, CustomField1: id,
      ...(method === 'credit' ? {} : { PaymentInfoURL: `${url.origin}/ecpay/info`, ...(method === 'cvs' ? { StoreExpireDate: '10080' } : { ExpireDate: '3' }) }),
    };
    params.CheckMacValue = await checkMac(params, conf.key, conf.iv);
    return html(payForm(conf, params));
  }

  let m;
  if ((m = /^\/liuyue\/r\/([0-9a-z]{24})$/.exec(p)) && req.method === 'GET') {
    const o = await env.DB.prepare('SELECT * FROM ly_orders WHERE id=?').bind(m[1]).first();
    if (!o) return html(shell('找不到', '<h1>找不到這份詳批</h1>'), 404);
    if (o.status !== 'paid' && (await isAdmin(req, env))) return html(reportPage({ ...o, status: 'paid' }));
    return html(reportPage(o));
  }

  if (p === '/ecpay/info' && isPost) {
    const params = Object.fromEntries(await req.formData()), conf = await getConf(env);
    if (!(await ecVerify(params, conf))) return new Response('0|CheckMacValue Error');
    const o = await env.DB.prepare('SELECT * FROM ly_orders WHERE trade_no=?').bind(params.MerchantTradeNo || '').first();
    if (!o) return new Response('0|Order Not Found');
    const info = o.method === 'cvs' ? { code: params.PaymentNo || '', expire: params.ExpireDate || '' } : { bank: params.BankCode || '', account: params.vAccount || '', expire: params.ExpireDate || '' };
    await env.DB.prepare('UPDATE ly_orders SET pay_info=? WHERE id=?').bind(JSON.stringify(info), o.id).run();
    return new Response('1|OK');
  }
  if (p === '/ecpay/return' && isPost) {
    const params = Object.fromEntries(await req.formData()), conf = await getConf(env);
    if (!(await ecVerify(params, conf))) return new Response('0|CheckMacValue Error');
    const o = await env.DB.prepare('SELECT * FROM ly_orders WHERE trade_no=?').bind(params.MerchantTradeNo || '').first();
    if (!o) return new Response('0|Order Not Found');
    if (o.status === 'paid') return new Response('1|OK');
    if (String(params.RtnCode) === '1' && Number(params.TradeAmt) === o.amount_twd) {
      await env.DB.prepare("UPDATE ly_orders SET status='paid', paid_via='ecpay', paid_at=datetime('now') WHERE id=?").bind(o.id).run();
    } else if (!['2', '10100073'].includes(String(params.RtnCode))) {
      await env.DB.prepare("UPDATE ly_orders SET status='failed' WHERE id=? AND status='pending'").bind(o.id).run();
    }
    return new Response('1|OK');
  }

  // 後台
  if (p === '/admin/login') {
    if (isPost) {
      const f = await req.formData();
      if (env.ADMIN_TOKEN && String(f.get('token') || '') === env.ADMIN_TOKEN) return redirect('/admin', { 'Set-Cookie': `xfp_admin=${await hmac(env.ADMIN_TOKEN, 'admin-v1')}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000${url.hostname.endsWith('xunfengtw.com') ? '; Domain=xunfengtw.com' : ''}` });
    }
    return html(shell('後台登入', '<h1>後台登入</h1><form class="card" method="post"><label>管理密鑰</label><input name="token" type="password"><p><button>登入</button></p></form>'));
  }
  if (p.startsWith('/admin')) {
    if (!(await isAdmin(req, env))) return redirect('/admin/login');
    if (p === '/admin/settings' && isPost) {
      const f = await req.formData();
      const mer = String(f.get('merchant') || '').trim(); if (/^\d{6,10}$/.test(mer)) await setKV(env, 'ecpay_merchant', mer);
      const k = String(f.get('key') || '').trim(); if (/^\w{8,40}$/.test(k)) await setKV(env, 'ecpay_key', k);
      const iv = String(f.get('iv') || '').trim(); if (/^\w{8,40}$/.test(iv)) await setKV(env, 'ecpay_iv', iv);
      await setKV(env, 'ecpay_mode', f.get('mode') === 'prod' ? 'prod' : 'stage');
      return redirect('/admin?m=saved');
    }
    if (p === '/admin/direct' && isPost) {
      const pr = parsePersons(await req.formData(), 1);
      if (pr.err) return html(shell('錯誤', `<h1>${esc(pr.err)}</h1><p><a href="/admin">返回</a></p>`), 400);
      const id = newId();
      await env.DB.prepare("INSERT INTO ly_orders (id, plan, persons, amount_twd, email, status, paid_via, paid_at) VALUES (?,'single',?,0,'owner','paid','owner',datetime('now'))").bind(id, JSON.stringify(pr.persons)).run();
      return redirect(`/liuyue/r/${id}`);
    }
    if (p === '/admin/codes' && isPost) {
      const f = await req.formData();
      const batch = String(f.get('batch') || '').trim().slice(0, 40), n = Math.min(500, Math.max(1, parseInt(f.get('n'), 10) || 0)), plan = f.get('plan') === 'family' ? 'family' : 'single';
      if (batch) for (let i = 0; i < n; i++) await env.DB.prepare('INSERT OR IGNORE INTO ly_codes (code, batch, plan) VALUES (?,?,?)').bind(newCode(), batch, plan).run();
      return redirect('/admin?batch=' + encodeURIComponent(batch));
    }
    const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
    const batch = url.searchParams.get('batch') || '';
    return html(adminPage({
      conf: await getConf(env),
      stats: await env.DB.prepare("SELECT COUNT(*) n, SUM(status='paid') paid, COALESCE(SUM(CASE WHEN status='paid' THEN amount_twd END),0) rev FROM ly_orders").first(),
      orders: await all('SELECT id, plan, amount_twd, status, paid_via, email, created_at FROM ly_orders ORDER BY created_at DESC LIMIT 100'),
      batches: await all('SELECT batch, COUNT(*) n, SUM(used_order IS NOT NULL) used, MIN(created_at) c FROM ly_codes GROUP BY batch ORDER BY c DESC LIMIT 30'),
      codes: batch ? await all('SELECT code, used_order FROM ly_codes WHERE batch=? ORDER BY code', batch) : [], batch,
      msg: url.searchParams.get('m') === 'saved' ? '已儲存' : '',
    }));
  }
  return new Response('Not found', { status: 404 });
}
