/**
 * ui.js — UI操作モジュール
 * タブ、フィルター、時計、大画面モード
 */

window.UIModule = (() => {

  function init() {
    bindTabs();
    bindFilter();
    startClock();
    bindRefresh();
    bindBigScreen();
    bindAlertPanelToggle();
  }

  // ===== タブ切替 =====
  function bindTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + target)?.classList.add('active');

        if (target === 'stats')   window.ChartModule?.update(window.DataModule?.getQuakes() || []);
        if (target === 'news')    window.NewsModule?.fetch();
        if (target === 'history') window.HistoryModule?.render();
      });
    });
  }

  // ===== フィルター =====
  function bindFilter() {
    const slider = document.getElementById('magFilter');
    const valEl  = document.getElementById('magVal');
    slider?.addEventListener('input', () => {
      if (valEl) valEl.textContent = parseFloat(slider.value).toFixed(1);
    });

    document.getElementById('applyFilter')?.addEventListener('click', () => {
      window.DataModule?.fetchAll();
    });

    // 自動更新間隔の動的変更
    document.getElementById('refreshInterval')?.addEventListener('change', (e) => {
      window.AppModule?.setRefreshInterval(parseInt(e.target.value));
    });
  }

  // ===== リアルタイム時計 =====
  function startClock() {
    function tick() {
      const el = document.getElementById('liveTime');
      if (el) {
        el.textContent = new Date().toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }) + ' JST';
      }
    }
    tick();
    setInterval(tick, 1000);
  }

  // ===== 更新ボタン =====
  function bindRefresh() {
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      if (btn) { btn.classList.add('spinning'); btn.disabled = true; }
      await window.DataModule?.fetchAll();
      if (btn) { btn.classList.remove('spinning'); btn.disabled = false; }
    });
  }

  // ===== 大画面モード切替 =====
  function bindBigScreen() {
    const panel = document.getElementById('bigscreenPanel');
    const toggle = document.getElementById('bigScreenToggle');
    const close = document.getElementById('bigscreenClose');

    toggle?.addEventListener('click', () => {
      panel.classList.add('show');
      toggle.classList.add('active');
      window.MapModule?.initBigMap();
    });

    close?.addEventListener('click', () => {
      panel.classList.remove('show');
      toggle.classList.remove('active');
    });
  }

  // ===== アラート設定パネル（右サイドのBotタブへスクロール誘導） =====
  function bindAlertPanelToggle() {
    const btn = document.getElementById('alertToggle');
    btn?.addEventListener('click', () => {
      btn.classList.toggle('active');
      // Botタブへ切替してアラート設定を見せる
      document.querySelector('.tab[data-tab="bot"]')?.click();
    });
  }

  return { init };
})();
