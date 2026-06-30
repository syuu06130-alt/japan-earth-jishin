/**
 * map.js — 地図初期化・描画モジュール
 * Leaflet.js + 無料地図タイル（APIキー不要、401エラー対策済み）
 */

window.MapModule = (() => {
  let map, bigMap, currentTileLayer, currentBigTileLayer;
  let epicenterLayer, waveLayer, faultLayer, plateLayer;
  let bigEpicenterLayer, bigWaveLayer;
  let isHeatmap = false;
  let markers = [];
  let currentTileType = 'standard';

  // ===== 地図初期化 =====
  function init() {
    map = L.map('map', {
      center: CONFIG.MAP.CENTER,
      zoom: CONFIG.MAP.ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    currentTileLayer = L.tileLayer(CONFIG.MAP.TILES.standard, {
      attribution: CONFIG.MAP.TILE_ATTR.standard,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    epicenterLayer = L.layerGroup().addTo(map);
    waveLayer      = L.layerGroup().addTo(map);
    faultLayer     = L.layerGroup();
    plateLayer     = L.layerGroup();

    drawFaultLines(faultLayer);
    drawPlateBoundaries(plateLayer);

    bindToolbar();
    bindLayerToggles();

    return map;
  }

  // ===== 大画面モード用の地図初期化（初回オープン時に1度だけ） =====
  function initBigMap() {
    if (bigMap) {
      setTimeout(() => bigMap.invalidateSize(), 50);
      return;
    }
    bigMap = L.map('bigMap', {
      center: map ? map.getCenter() : CONFIG.MAP.CENTER,
      zoom: map ? map.getZoom() : CONFIG.MAP.ZOOM,
      zoomControl: true,
    });

    currentBigTileLayer = L.tileLayer(CONFIG.MAP.TILES[currentTileType], {
      attribution: CONFIG.MAP.TILE_ATTR[currentTileType],
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(bigMap);

    bigEpicenterLayer = L.layerGroup().addTo(bigMap);
    bigWaveLayer      = L.layerGroup().addTo(bigMap);

    setTimeout(() => bigMap.invalidateSize(), 50);

    // 現在のデータがあれば即描画
    if (window.DataModule) drawQuakes(window.DataModule.getQuakes());
  }

  // ===== タイル切替 =====
  function switchTile(type) {
    currentTileType = type;
    const url  = CONFIG.MAP.TILES[type] || CONFIG.MAP.TILES.standard;
    const attr = CONFIG.MAP.TILE_ATTR[type] || CONFIG.MAP.TILE_ATTR.standard;

    if (currentTileLayer) map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(url, { attribution: attr, maxZoom: 18, subdomains: 'abcd' }).addTo(map);

    if (bigMap) {
      if (currentBigTileLayer) bigMap.removeLayer(currentBigTileLayer);
      currentBigTileLayer = L.tileLayer(url, { attribution: attr, maxZoom: 18, subdomains: 'abcd' }).addTo(bigMap);
    }
  }

  // ===== 地震マーカー描画（通常地図＋大画面地図 両方に反映） =====
  function drawQuakes(quakes) {
    epicenterLayer.clearLayers();
    waveLayer.clearLayers();
    if (bigEpicenterLayer) bigEpicenterLayer.clearLayers();
    if (bigWaveLayer) bigWaveLayer.clearLayers();
    markers = [];

    const showEpicenter = document.getElementById('showEpicenter')?.checked !== false;
    const showWave      = document.getElementById('showWave')?.checked !== false;

    quakes.forEach((q, i) => {
      const lat = q.lat, lng = q.lng, mag = q.mag;
      if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;

      if (showWave && i < 5) {
        drawWave(lat, lng, mag, i, waveLayer);
        if (bigWaveLayer) drawWave(lat, lng, mag, i, bigWaveLayer);
      }

      if (showEpicenter) {
        const r = CONFIG.MAG_RADIUS(mag);
        const color = CONFIG.MAG_COLOR(mag);
        const opts = {
          radius: r, fillColor: color, color: '#fff',
          weight: mag >= 5 ? 2 : 1, fillOpacity: 0.85, opacity: 0.9,
        };

        const circle = L.circleMarker([lat, lng], opts);
        circle.bindPopup(buildPopupHtml(q), { maxWidth: 240 });
        circle.on('click', () => showModal(q));
        epicenterLayer.addLayer(circle);
        markers.push({ circle, q });

        if (bigEpicenterLayer) {
          const bigCircle = L.circleMarker([lat, lng], opts);
          bigCircle.bindPopup(buildPopupHtml(q), { maxWidth: 240 });
          bigCircle.on('click', () => showModal(q));
          bigEpicenterLayer.addLayer(bigCircle);
        }
      }
    });
  }

  // ===== 波紋アニメーション =====
  function drawWave(lat, lng, mag, index, targetLayer) {
    const delay = index * 300;
    const waves = mag >= 5 ? 3 : 2;
    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        const maxR = CONFIG.MAG_RADIUS(mag) * (4 + w * 2);
        const color = CONFIG.MAG_COLOR(mag);
        let opacity = 0.6;
        let curR = 0;
        const duration = 2000 + w * 500;
        const steps = 50;
        const stepR = maxR / steps;
        const stepO = opacity / steps;

        const interval = setInterval(() => {
          if (curR >= maxR) { clearInterval(interval); return; }
          curR += stepR;
          opacity -= stepO;
          if (opacity < 0) opacity = 0;

          const waveCircle = L.circleMarker([lat, lng], {
            radius: curR, fillColor: 'transparent', color: color,
            weight: 2, opacity: opacity, interactive: false,
          });
          targetLayer.addLayer(waveCircle);
          setTimeout(() => targetLayer.removeLayer(waveCircle), 200);
        }, duration / steps);
      }, delay + w * 400);
    }
  }

  // ===== ポップアップHTML =====
  function buildPopupHtml(q) {
    const color = CONFIG.MAG_COLOR(q.mag);
    const scaleHtml = q.maxIntensity
      ? `<div class="popup-row">最大震度 <span>${q.maxIntensity}</span></div>` : '';
    const tsunamiHtml = q.tsunami
      ? `<div style="color:#e85d3a;font-weight:700;margin-top:4px;">🌊 ${q.tsunami}</div>` : '';
    return `
      <div>
        <div class="popup-mag" style="color:${color}">M${q.mag.toFixed(1)}</div>
        <div class="popup-place">${escapeHtml(q.place || '不明')}</div>
        <div class="popup-row">深さ <span>${q.depth != null ? q.depth + 'km' : '不明'}</span></div>
        ${scaleHtml}
        <div class="popup-row">発生時刻 <span>${formatTime(q.time)}</span></div>
        ${tsunamiHtml}
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ===== 断層帯（主要活断層・簡略座標） =====
  function drawFaultLines(layer) {
    const faults = [
      { name: '中央構造線', coords: [[33.5,130.3],[33.8,131.0],[34.2,132.0],[34.6,133.5],[34.9,135.0],[35.0,136.2]] },
      { name: '糸魚川-静岡構造線', coords: [[36.8,137.9],[35.8,138.1],[35.2,138.4],[34.9,138.6]] },
      { name: '野島断層', coords: [[34.6,134.9],[34.8,135.1]] },
      { name: '有馬-高槻断層帯', coords: [[34.8,135.2],[34.9,135.6]] },
      { name: '上町断層帯', coords: [[34.6,135.5],[34.8,135.5]] },
    ];
    faults.forEach(f => {
      L.polyline(f.coords, { color: '#ff4444', weight: 2, opacity: 0.7, dashArray: '6,4' })
        .bindTooltip(`断層: ${f.name}`, { sticky: true })
        .addTo(layer);
    });
  }

  // ===== プレート境界（簡略座標） =====
  function drawPlateBoundaries(layer) {
    const plates = [
      { name: '太平洋プレート境界', coords: [[45,150],[42,145],[38,142],[35,142],[33,142],[30,140],[28,138]], color: '#3b82f6' },
      { name: 'フィリピン海プレート境界', coords: [[35,140],[34,138],[33,136],[32,133],[31,131],[30,128]], color: '#a855f7' },
    ];
    plates.forEach(p => {
      L.polyline(p.coords, { color: p.color, weight: 3, opacity: 0.5, dashArray: '10,6' })
        .bindTooltip(p.name, { sticky: true })
        .addTo(layer);
    });
  }

  // ===== ヒートマップ切替 =====
  function toggleHeatmap(quakes) {
    if (!isHeatmap) {
      epicenterLayer.clearLayers();
      quakes.forEach(q => {
        if (q.lat == null || q.lng == null) return;
        const r = CONFIG.MAG_RADIUS(q.mag) * 2.5;
        L.circleMarker([q.lat, q.lng], {
          radius: r, fillColor: CONFIG.MAG_COLOR(q.mag),
          color: 'transparent', fillOpacity: 0.15, interactive: false,
        }).addTo(epicenterLayer);
      });
      isHeatmap = true;
      document.getElementById('btnHeatmap')?.classList.add('active');
    } else {
      isHeatmap = false;
      document.getElementById('btnHeatmap')?.classList.remove('active');
      if (window.DataModule) window.DataModule.redraw();
    }
  }

  // ===== 日本全体に戻す =====
  function resetView() {
    map.setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
    if (bigMap) bigMap.setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
  }

  // ===== 特定座標へ移動 =====
  function flyTo(lat, lng, zoom) {
    map.flyTo([lat, lng], zoom || 8, { duration: 1.2 });
  }

  // ===== 特定の地震にフォーカス =====
  function focusQuake(lat, lng, mag) {
    const zoom = mag >= 6 ? 8 : mag >= 5 ? 7 : 6;
    map.setView([lat, lng], zoom);
    if (bigMap) bigMap.setView([lat, lng], zoom);
  }

  // ===== ツールバーイベント =====
  function bindToolbar() {
    document.getElementById('btn2d')?.addEventListener('click', () => { switchTile('standard'); setActive('btn2d'); });
    document.getElementById('btnSatellite')?.addEventListener('click', () => { switchTile('satellite'); setActive('btnSatellite'); });
    document.getElementById('btnTerrain')?.addEventListener('click', () => { switchTile('terrain'); setActive('btnTerrain'); });
    document.getElementById('btnReset')?.addEventListener('click', resetView);
    document.getElementById('btnHeatmap')?.addEventListener('click', () => {
      if (window.DataModule) toggleHeatmap(window.DataModule.getQuakes());
    });

    function setActive(id) {
      ['btn2d','btnSatellite','btnTerrain'].forEach(b => document.getElementById(b)?.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
    }
  }

  // ===== レイヤートグル =====
  function bindLayerToggles() {
    document.getElementById('showFault')?.addEventListener('change', (e) => {
      if (e.target.checked) faultLayer.addTo(map);
      else map.removeLayer(faultLayer);
    });
    document.getElementById('showPlate')?.addEventListener('change', (e) => {
      if (e.target.checked) plateLayer.addTo(map);
      else map.removeLayer(plateLayer);
    });
    document.getElementById('showEpicenter')?.addEventListener('change', () => window.DataModule?.redraw());
    document.getElementById('showWave')?.addEventListener('change', () => window.DataModule?.redraw());
  }

  // ===== 日時フォーマット =====
  function formatTime(t) {
    if (!t) return '不明';
    const d = new Date(t);
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  return { init, initBigMap, drawQuakes, focusQuake, flyTo, resetView, toggleHeatmap, formatTime };
})();
