/**
 * search.js — 地名検索モジュール
 * 都道府県・主要都市・トラフ名で検索し地図移動
 */

window.SearchModule = (() => {

  function init() {
    const input   = document.getElementById('placeSearch');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (!q) { hide(); return; }
      const matches = CONFIG.PLACES.filter(p =>
        p.name.includes(q) || p.kana.includes(q)
      ).slice(0, 8);
      render(matches, q);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) input.dispatchEvent(new Event('input'));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-search')) hide();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.search-item');
        if (first) first.click();
      }
      if (e.key === 'Escape') { hide(); input.blur(); }
    });

    function render(matches, q) {
      if (!matches.length) {
        results.innerHTML = `<div class="search-empty">「${escapeHtml(q)}」に一致する地名が見つかりません</div>`;
        results.classList.add('show');
        return;
      }
      results.innerHTML = matches.map(p => `
        <div class="search-item" data-lat="${p.lat}" data-lng="${p.lng}" data-zoom="${p.zoom}">
          <div class="search-item-name">📍 ${escapeHtml(p.name)}</div>
          <div class="search-item-meta">${p.lat.toFixed(2)}°N, ${p.lng.toFixed(2)}°E</div>
        </div>
      `).join('');
      results.classList.add('show');

      results.querySelectorAll('.search-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat  = parseFloat(item.dataset.lat);
          const lng  = parseFloat(item.dataset.lng);
          const zoom = parseInt(item.dataset.zoom);
          window.MapModule?.flyTo(lat, lng, zoom);
          hide();
          input.value = '';
        });
      });
    }

    function hide() { results.classList.remove('show'); }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { init };
})();
