/* 震玖市集擴充：一般入口不掛鉤、不改畫面、不改任何遊戲規則。 */
(function () {
  'use strict';
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (params.get('m') === 'off') {
    try { localStorage.removeItem('zjMode'); } catch (_) {}
    return;
  }
  // 儲存模式標記供辨識；一般網址仍不啟用，避免活動污染原版入口。
  const zjMode = params.get('m') === 'zj' && params.get('r') === 'Rose';
  if (zjMode) {
    const KEY = 'xunfeng-zj-reward-v1';
    const BRANDING = '震玖極品皇膠 × 巽風堪輿研究中心';
    const LOCATION = '換獎位置：中山路 & 三民路 震玖極品皇膠 A';
    const CANONICAL = '#r=Rose&m=zj';
    const CHALLENGE = ['巷口的家', '高樓夾縫', '電塔下的家', '左右高低', '大樓之間'].map(name => S.findIndex(scene => scene.n === name));
    const REQUIRED = 5;
    const completed = value => CHALLENGE.filter(index => index >= 0 && value.cleared.includes(index)).length;
    // 已發出的舊三關兌獎碼繼續有效，尤其不可重設已兌換紀錄。
    const hasTicket = value => Boolean(value.code && value.earnedAt);
    const eligibleForReward = value => hasTicket(value) || completed(value) >= REQUIRED;
    let writable = true;
    function empty() { return { version: 1, cleared: [], code: '', earnedAt: '', redeemedAt: '' }; }
    function read() {
      try {
        const value = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (!value || value.version !== 1) return empty();
        return { version: 1, cleared: Array.isArray(value.cleared) ? [...new Set(value.cleared.filter(i => Number.isInteger(i) && i >= 0 && i < S.length))] : [],
          code: /^\d{6}$/.test(value.code || '') ? value.code : '',
          earnedAt: Number.isFinite(Date.parse(value.earnedAt)) ? value.earnedAt : '',
          redeemedAt: Number.isFinite(Date.parse(value.redeemedAt)) ? value.redeemedAt : '' };
      } catch (_) { writable = false; return empty(); }
    }
    let state = read();
    function persist(value) {
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
        if (localStorage.getItem(KEY) !== JSON.stringify(value)) throw new Error('not persisted');
        state = value; writable = true; return true;
      } catch (_) { writable = false; return false; }
    }
    try { localStorage.setItem('zjMode', 'zj'); localStorage.setItem('xunfeng-ref', 'Rose'); } catch (_) { writable = false; }
    REF = 'Rose';
    function timestamp(value) { return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(value)); }
    function award(value) {
      if (completed(value) >= REQUIRED && !value.code) {
        const random = new Uint32Array(1); crypto.getRandomValues(random);
        value.code = String(random[0] % 1000000).padStart(6, '0');
        value.earnedAt = new Date().toISOString();
      }
      return value;
    }
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/zj-mode.css'; document.head.append(css);
    function renderReward() {
      state = read();
      if (completed(state) >= REQUIRED && !state.code) persist(award(state));
      updateStatus();
      const eligible = hasTicket(state);
      const redeemed = Boolean(state.redeemedAt);
      const remaining = S.filter((scene, index) => !(prog[index] >= 1)).length;
      const continuation = eligible ? `<section class="zj-moreplay" aria-label="繼續完整遊戲"><p class="zj-moreplay-kicker">市集任務完成，冒險還沒結束</p><h3>完整遊戲共有 ${S.length} 關</h3><p>${remaining ? `還有 ${remaining} 關等你探索，繼續挑戰不同的居家格局！` : '所有關卡都已通過！還能重玩挑戰滿星。'}</p><button class="btn" id="zj-play-more">繼續挑戰其他關卡 →</button><button class="btn ghost" id="zj-all-levels">查看全部 ${S.length} 關</button><small>${redeemed ? '贈品已兌換，仍可繼續玩。' : '可以先繼續玩，兌獎碼會保留。'}隨時點「震玖市集」回來查看。</small></section>` : '';
      const preview = eligible ? `<picture><source media="(min-width: 720px)" srcset="/zj-gift-landscape.jpg"><img class="zj-gift" src="/zj-gift-portrait.jpg" alt="震玖極品皇膠粉贈品海報，換獎位置中山路與三民路震玖極品皇膠A" width="1024" height="1536"></picture>` : '';
      ovl.innerHTML = `<section class="zj-reward" role="dialog" aria-modal="true" aria-label="震玖藏寶圖獎勵"><div class="zj-reward-inner"><header class="zj-reward-header"><span>震玖市集限定 · 藏寶圖獎勵</span><button class="btn ghost" id="zj-close">返回遊戲</button></header><p class="zj-brand">${BRANDING}</p><h2>${redeemed ? '已兌換' : eligible ? (completed(state) >= REQUIRED ? '五關完成，寶藏找到了！' : '寶藏找到了！') : `再破 ${Math.max(0, REQUIRED - completed(state))} 關，解鎖贈品`}</h2>${!eligible ? '<p>在震玖入口成功通過五關挑戰（兩關入門、兩關進階、一關綜合觀察）即可解鎖。重玩同一關不重複計數；失敗不計入。</p>' : ''}${continuation}${preview}<p class="zj-location">${LOCATION}</p>${eligible ? `<div class="zj-ticket ${redeemed ? 'zj-used' : ''}"><span>此裝置兌獎碼</span><strong id="zj-code">${state.code}</strong><p>取得時間：<time id="zj-earned" datetime="${state.earnedAt}">${timestamp(state.earnedAt)}（台北）</time></p>${redeemed ? `<b class="zj-redeemed">已兌換 · 不可再次領取</b><p>兌換時間：${timestamp(state.redeemedAt)}（台北）</p>` : '<p>請出示本頁，由攤位人員核對後操作。</p>'}</div>` : `<p class="zj-progress">已通過 ${completed(state)} / ${REQUIRED} 關</p>`}${eligible && !redeemed ? `<button class="btn red zj-claim" id="zj-confirm" ${writable ? '' : 'disabled'}>攤位人員按此確認已兌換</button>` : ''}${!writable ? '<p role="alert">此瀏覽器無法保存兌換紀錄，請先允許網站儲存資料；目前不能兌換。</p>' : ''}<p class="muted">每個瀏覽器限領一次。退出震玖模式不會清除已兌換紀錄。</p><a class="btn" id="zj-official" href="https://www.xunfeng.tw/?ref=Rose" target="_blank" rel="noopener">前往巽風官網</a></div></section>`;
      document.getElementById('zj-close').onclick = () => { if (eligible) return continueFullGame(); ovl.innerHTML = ''; };
      if (eligible) {
        document.getElementById('zj-play-more').onclick = continueFullGame;
        document.getElementById('zj-all-levels').onclick = () => { ovl.innerHTML = ''; window.levels(); };
      }
      if (!eligible) {
        const continueButton = document.createElement('button');
        continueButton.id = 'zj-continue'; continueButton.className = 'btn red';
        continueButton.textContent = `繼續第 ${completed(state) + 1} 關挑戰`;
        continueButton.onclick = nextChallenge;
        ovl.querySelector('.zj-progress').after(continueButton);
      }
      const confirmButton = document.getElementById('zj-confirm');
      if (confirmButton) confirmButton.onclick = async () => {
        if (confirmButton.dataset.staffConfirmed !== 'yes') {
          const panel = document.createElement('div'); panel.className = 'zj-confirm-panel'; panel.id = 'zj-confirm-panel';
          panel.innerHTML = '<p><b>攤位人員請確認：贈品已交付？</b><br>確認後此裝置永久標示已兌換。</p><button class="btn red" id="zj-final-confirm">確定已交付，完成兌換</button><button class="btn ghost" id="zj-cancel-confirm">取消，尚未交付</button>';
          confirmButton.after(panel); confirmButton.hidden = true;
          panel.querySelector('#zj-final-confirm').onclick = () => { panel.remove(); confirmButton.hidden = false; confirmButton.dataset.staffConfirmed = 'yes'; confirmButton.click(); };
          panel.querySelector('#zj-cancel-confirm').onclick = () => { panel.remove(); confirmButton.hidden = false; confirmButton.focus(); };
          panel.querySelector('button').focus(); return;
        }
        delete confirmButton.dataset.staffConfirmed;
        confirmButton.disabled = true;
        const commit = () => {
          const latest = read();
          if (latest.redeemedAt) { renderReward(); return; }
          if (!writable || !eligibleForReward(latest) || !latest.code || !latest.earnedAt) { renderReward(); return; }
          latest.redeemedAt = new Date().toISOString();
          if (!persist(latest)) { renderReward(); return; }
          renderReward();
        };
        if (navigator.locks) await navigator.locks.request('xunfeng-zj-redeem', commit); else commit();
      };
      ovl.querySelector('button')?.focus();
    }
    const originalFinish = window.finish;
    // 續玩不經關卡介紹，須先移除開場，否則遊戲會在遮罩後方開始。
    const originalResumeMid = window.resumeMid;
    window.resumeMid = function () {
      ovl.querySelector('.splash')?.remove();
      return originalResumeMid.apply(this, arguments);
    };
    function continueFullGame() {
      ovl.innerHTML = '';
      if (midSave && S[midSave.i] && midSave.f.length < badKeys(S[midSave.i]).length) return window.resumeMid();
      const index = ORDER.find(i => !(prog[i] >= 1));
      if (index == null) return window.levels();
      tabD = S[index].d;
      return window.play(index);
    }
    function nextChallenge() {
      const latest = read();
      if (eligibleForReward(latest)) return continueFullGame();
      const index = CHALLENGE.find(i => i >= 0 && !latest.cleared.includes(i));
      if (index == null) return;
      ovl.innerHTML = '';
      // 正常續玩；若上次已找齊但尚未結算，重開該關以免卡在完成畫面。
      if (midSave && midSave.i === index && midSave.f.length < badKeys(S[index]).length) return window.resumeMid();
      tabD = S[index].d;
      return window.play(index);
    }
    window.quickStart = nextChallenge;
    window.finish = function (win) {
      const index = cur && cur.i;
      const result = originalFinish.apply(this, arguments);
      if (win === true && Number.isInteger(index)) {
        const latest = read(), wasUnlocked = eligibleForReward(latest);
        if (!latest.cleared.includes(index)) latest.cleared.push(index);
        if (persist(award(latest))) {
          updateStatus();
          if (!wasUnlocked && eligibleForReward(latest)) renderReward();
        }
      }
      if (!eligibleForReward(read()) && !document.querySelector('.zj-reward')) {
        const next = document.getElementById('nx');
        if (next) { next.textContent = '繼續震玖挑戰'; next.onclick = nextChallenge; }
      }
      return result;
    };
    window.mapScreen = function () { renderReward(); };
    window.gameLink = function () { return GAME_URL + CANONICAL; };
    window.shareURL = function (source) { return GAME_URL + '?utm_source=' + encodeURIComponent(source || 'share') + '&utm_medium=share' + CANONICAL; };
    // 原版 xfLink 已處理官網歸因；此處僅在活動內鎖定同一個大小寫代碼。
    function roseLinks() {
      document.querySelectorAll('a[href]').forEach(a => {
        try { const u = new URL(a.getAttribute('href'), location.href); if (/(^|\.)xunfeng\.tw$/.test(u.hostname)) { u.searchParams.set('ref', 'Rose'); if (a.href !== u.href) a.href = u.href; } } catch (_) {}
      });
    }
    const status = document.createElement('button'); status.className = 'zj-status'; status.type = 'button'; status.onclick = renderReward; document.body.append(status);
    function updateStatus() { state = read(); status.textContent = state.redeemedAt ? '震玖市集 · 已兌換' : eligibleForReward(state) ? '震玖市集 · 查看領獎頁' : `震玖市集 · 闖關 ${completed(state)}/${REQUIRED}`; }
    function decorate() {
      // 手機上的浮動進度不可遮到開場、關卡介紹或結算按鈕。
      status.hidden = Boolean(ovl.querySelector('.ov,.splash,.zj-reward'));
      const resultBox = ovl.querySelector('.ov .box');
      if (resultBox && !resultBox.querySelector('.zj-run-progress')) {
        const progress = document.createElement('p'); progress.className = 'zj-run-progress';
        progress.textContent = eligibleForReward(read()) ? `完整遊戲共 ${S.length} 關 · 繼續探索` : `震玖尋寶挑戰 ${completed(read())} / ${REQUIRED}`;
        resultBox.prepend(progress);
      }
      document.querySelectorAll('.splash,.h2').forEach(el => {
        if (el.querySelector('.zj-brand')) return;
        const label = document.createElement('p'); label.className = 'zj-brand'; label.textContent = BRANDING;
        const anchor = el.querySelector('#enter,#cont'); if (anchor) anchor.before(label); else el.prepend(label);
        const note = document.createElement('p'); note.className = 'zj-challenge-note';
        note.textContent = '五關尋寶挑戰｜入門 → 進階 → 綜合觀察';
        label.after(note);
      });
      ['cont', 'm1'].forEach(id => {
        const button = document.getElementById(id); if (!button) return;
        button.onclick = nextChallenge;
        if (id === 'cont') {
          const latest = read();
          const text = eligibleForReward(latest) ? `繼續探索完整 ${S.length} 關` : `震玖尋寶挑戰 · 已完成 ${completed(latest)} / ${REQUIRED} 關`;
          if (button.textContent !== text) button.textContent = text;
        }
      });
      const diagramNext = document.getElementById('nx2'); if (diagramNext && !eligibleForReward(read())) diagramNext.onclick = nextChallenge;
      roseLinks();
    }
    const observer = new MutationObserver(decorate); observer.observe(app, { childList: true, subtree: true }); observer.observe(ovl, { childList: true, subtree: true });
    window.addEventListener('storage', event => { if (event.key === KEY) { updateStatus(); if (document.querySelector('.zj-reward')) renderReward(); } });
    window.addEventListener('hashchange', () => { if (new URLSearchParams(location.hash.slice(1)).get('m') !== 'zj') location.reload(); });
    updateStatus(); decorate();
  }
})();
