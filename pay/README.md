# 巽風收費服務（pay.xunfengtw.com）

- 2027 流月詳批（系統版）：單人 NT$199、全家（最多 4 人）NT$499
- 推算沿用 `api/_liuyue.js`（老師複核用）的算法，客人版在 `src/report.js` 轉成白話
- 綠界：老師自己的商店，金鑰在 `/admin` 後台輸入（存 D1 settings）；未設定時走綠界測試環境
- 後台：`/admin`，用 Cloudflare 機密 `ADMIN_TOKEN` 登入；可產生講座兌換碼（單人／全家）
- 部署：Cloudflare Workers Builds 連 GitHub，根目錄 `pay`，部署指令 `npm run deploy`
- 測試：`node test/run.mjs`
- 流年卡 `2027.html` 的「流月詳批」按鈕會帶入生日、時辰、性別
