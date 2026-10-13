# 巽風堪輿研究中心｜專案交接（給 Codex / 任何 AI 助手）

> 公開 repo，只放技術資訊。完整業務背景在老師電腦的 Documents\Codex\巽風_專案交接.md。

## 我是誰
- 風羿老師（吳建忠），巽風堪輿研究中心，台中。陰陽宅現場堪驗 2,200+ 案例（行銷一律寫 2,200+）。
- 一律用繁體中文溝通，精簡，少問問題。
- 不做「免費諮詢」當誘餌（會讓服務顯得廉價），引流入口是遊戲。

## 賺錢的地方（所有設計都要導向這裡）
- 四象天機書：https://www.xunfeng.tw/member-ai/decision （每份 200 元）
- 面相系統：https://www.xunfeng.tw/member-ai/face （每份 200 元）
- 到府堪輿預約：https://www.xunfeng.tw/booking
- 新會員註冊送 30 點。

## 遊戲「陽宅辨煞」
- 網址：https://xunfeng-game.vercel.app/
- GitHub：kingking12180823-ui/xunfeng-game（main 分支，push 後 Vercel 自動部署）
- Vercel 專案：xunfeng-game（team: xunfeng-yixue-system）
- 架構：單一檔案 `index.html`（全部 CSS/JS 內嵌）＋ 圖片影片平放在 repo 根目錄；`vercel.json` 把 `/assets/*` 改寫到根目錄。
- 配色：玄黑＋金＋朱紅（不要用綠底）。LINE 按鈕保留 LINE 綠。
- 排版：手機不能有單字掉到下一行（body 已設 `word-break:keep-all`，短句用 `<span class="nw">`）。
- 關卡：132 關。室外用「立面圖」（`EV[...]` 渲染器），室內維持平面配置、家具畫成立體小圖示（`box3d/plant3d/lamp3d`）；「你家」要醒目（`homePin`）。關卡開場就要顯示建物標籤。
- 轉換卡 `convCard(sc)`：每關結束依煞影響的面向，導到面相系統或四象天機書。
- 分享 `shareCard()` / `lineShare()`：結束時一鍵傳 LINE，連結帶 `utm_source` 和推薦碼。
- 推薦碼：網址 `#r=代碼` → 存 localStorage `xunfeng-ref` → 連到 xunfeng.tw 時加 `?ref=代碼`。
- 合作店家：`const STORES={}` 填「代碼:店名」後，從該店 QR 進來會顯示「○○ 招待」。
- 流量統計：已加 Vercel Web Analytics 腳本（需在 Vercel 後台 Analytics 分頁按 Enable）。

## 待辦
- game.xunfeng.tw 網域：在擁有 xunfeng.tw 的 Vercel 帳號加 DNS
  - TXT `_vercel` = `vc-domain-verify=game.xunfeng.tw,1fc738a172bc080711ce`
  - CNAME `game` → `ef0d71c60236af16.vercel-dns-017.com.`
- 合作店家代碼建立後，填 `STORES` 並產出各店 QR 立牌。
- 導流：FB 社團題目式貼文、Reels/抖音短影片（Kling 有「風羿老師」聲音）、LINE 群發。

## 最近進度
- 2026-10-13：加上 LINE 分享＋Vercel Analytics；Google 商家檔案優化完成。FB 遊戲貼文 79 次瀏覽、95% 是既有粉絲 → 問題在觸及不在文案。
