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
      if (value.cleared.length >= 3 && !value.code) {
        const random = new Uint32Array(1); crypto.getRandomValues(random);
        value.code = String(random[0] % 1000000).padStart(6, '0');
        value.earnedAt = new Date().toISOString();
      }
      return value;
    }
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/zj-mode.css'; document.head.append(css);
    function renderReward() {
      state = read();
      if (state.cleared.length >= 3 && !state.code) persist(award(state));
      const eligible = state.cleared.length >= 3 && state.code && state.earnedAt;
      const redeemed = Boolean(state.redeemedAt);
      const preview = eligible ? `<picture><source media="(min-width: 720px)" srcset="/zj-gift-landscape.jpg"><img class="zj-gift" src="/zj-gift-portrait.jpg" alt="震玖極品皇膠粉贈品海報，換獎位置中山路與三民路震玖極品皇膠A" width="1024" height="1536"></picture>` : '';
      ovl.innerHTML = `<section class="zj-reward" role="dialog" aria-modal="true" aria-label="震玖藏寶圖獎勵"><div class="zj-reward-inner"><header class="zj-reward-header"><span>震玖市集限定 · 藏寶圖獎勵</span><button class="btn ghost" id="zj-close">返回遊戲</button></header><p class="zj-brand">${BRANDING}</p><h2>${redeemed ? '已兌換' : eligible ? '三關完成，寶藏找到了！' : `再破 ${Math.max(0, 3 - state.cleared.length)} 關，解鎖贈品`}</h2>${!eligible ? '<p>在震玖入口成功通過任意三個不同關卡即可解鎖。重玩同一關不重複計數；失敗不計入。</p>' : ''}${preview}<p class="zj-location">${LOCATION}</p>${eligible ? `<div class="zj-ticket ${redeemed ? 'zj-used' : ''}"><span>此裝置兌獎碼</span><strong id="zj-code">${state.code}</strong><p>取得時間：<time id="zj-earned" datetime="${state.earnedAt}">${timestamp(state.earnedAt)}（台北）</time></p>${redeemed ? `<b class="zj-redeemed">已兌換 · 不可再次領取</b><p>兌換時間：${timestamp(state.redeemedAt)}（台北）</p>` : '<p>請出示本頁，由攤位人員核對後操作。</p>'}</div>` : `<p class="zj-progress">已通過 ${Math.min(3,state.cleared.length)} / 3 關</p>`}${eligible && !redeemed ? `<button class="btn red zj-claim" id="zj-confirm" ${writable ? '' : 'disabled'}>攤位人員按此確認已兌換</button>` : ''}${!writable ? '<p role="alert">此瀏覽器無法保存兌換紀錄，請先允許網站儲存資料；目前不能兌換。</p>' : ''}<p class="muted">每個瀏覽器限領一次。退出震玖模式不會清除已兌換紀錄。</p><a class="btn" id="zj-official" href="https://www.xunfeng.tw/?ref=Rose" target="_blank" rel="noopener">前往巽風官網</a></div></section>`;
      document.getElementById('zj-close').onclick = () => { ovl.innerHTML = ''; };
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
          if (!writable || latest.cleared.length < 3 || !latest.code || !latest.earnedAt) { renderReward(); return; }
          latest.redeemedAt = new Date().toISOString();
          if (!persist(latest)) { renderReward(); return; }
          renderReward();
        };
        if (navigator.locks) await navigator.locks.request('xunfeng-zj-redeem', commit); else commit();
      };
      ovl.querySelector('button')?.focus();
    }
    const originalFinish = window.finish;
    window.finish = function (win) {
      const index = cur && cur.i;
      const result = originalFinish.apply(this, arguments);
      if (win === true && Number.isInteger(index)) {
        const latest = read(), wasUnlocked = latest.cleared.length >= 3;
        if (!latest.cleared.includes(index)) latest.cleared.push(index);
        if (persist(award(latest))) {
          updateStatus();
          if (!wasUnlocked && latest.cleared.length >= 3) renderReward();
        }
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
    function updateStatus() { state = read(); status.textContent = state.redeemedAt ? '震玖市集 · 已兌換' : state.cleared.length >= 3 ? '震玖市集 · 查看領獎頁' : `震玖市集 · 闖關 ${state.cleared.length}/3`; }
    function decorate() {
      document.querySelectorAll('.splash,.h2').forEach(el => {
        if (el.querySelector('.zj-brand')) return;
        const label = document.createElement('p'); label.className = 'zj-brand'; label.textContent = BRANDING;
        const anchor = el.querySelector('#enter,#cont'); if (anchor) anchor.before(label); else el.prepend(label);
      });
      roseLinks();
    }
    const observer = new MutationObserver(decorate); observer.observe(app, { childList: true, subtree: true }); observer.observe(ovl, { childList: true, subtree: true });
    window.addEventListener('storage', event => { if (event.key === KEY) { updateStatus(); if (document.querySelector('.zj-reward')) renderReward(); } });
    window.addEventListener('hashchange', () => { if (new URLSearchParams(location.hash.slice(1)).get('m') !== 'zj') location.reload(); });
    updateStatus(); decorate();
  }
})();
