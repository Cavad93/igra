// Карта на Leaflet.js + тайлы CAWM (Ancient World Mapping Center)
// Тайлы: https://cawm.lib.uiowa.edu — CC BY 4.0
// Координаты в формате Leaflet [lat, lng]

let leafletMap = null;          // экземпляр L.Map
let regionLayers = {};          // { regionId: L.Polygon }
let selectedRegionId = null;

// ──────────────────────────────────────────────────────────────
// ИНИЦИАЛИЗАЦИЯ КАРТЫ
// ──────────────────────────────────────────────────────────────

function initLeafletMap() {
  const container = document.getElementById('map-container');
  if (!container) return;

  // Карта центрируется на Средиземноморье
  leafletMap = L.map('map-container', {
    center: [37.5, 18.0],
    zoom: 5,
    minZoom: 3,
    maxZoom: 8,
    zoomControl: false,          // кастомное размещение
    attributionControl: false,   // добавим свою атрибуцию
  });

  // Кнопки зума — помещаем в правый нижний угол
  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

  // Атрибуция
  L.control.attribution({
    position: 'bottomleft',
    prefix: false,
  }).addAttribution(
    '© <a href="https://cawm.lib.uiowa.edu/" target="_blank">CAWM</a> · CC BY 4.0'
  ).addTo(leafletMap);

  // Базовый слой — тайлы древнего мира CAWM
  addBaseTileLayer();

  // Регионы
  renderRegionPolygons();

  // Подписи морей
  renderSeaLabels();
}

// ──────────────────────────────────────────────────────────────
// ТАЙЛОВЫЙ СЛОЙ
// ──────────────────────────────────────────────────────────────

function addBaseTileLayer() {
  const cawmUrl = CONFIG.MAP_TILE_URL || 'https://cawm.lib.uiowa.edu/tiles/{z}/{x}/{y}.png';

  const tileLayer = L.tileLayer(cawmUrl, {
    attribution: '© CAWM · CC BY 4.0',
    maxZoom: 8,
    minZoom: 3,
    tileSize: 256,
    // Тонкий тёмный оверлей для соответствия игровому стилю
    opacity: 1.0,
    crossOrigin: true,
    errorTileUrl: '',
  });

  tileLayer.on('tileerror', () => {
    // При ошибке загрузки тайлов — тихо fallback
    console.warn('Тайлы CAWM недоступны. Проверьте подключение к интернету.');
  });

  tileLayer.addTo(leafletMap);

  // Тёмный полупрозрачный оверлей для игровой атмосферы
  // (подчёркивает цвета регионов, не мешает читабельности)
  L.tileLayer(cawmUrl, {
    attribution: '',
    maxZoom: 8,
    opacity: 0,        // выключен по умолчанию — можно включить
  });
}

// ──────────────────────────────────────────────────────────────
// РЕГИОНЫ
// ──────────────────────────────────────────────────────────────

function renderRegionPolygons() {
  // Удаляем старые слои
  for (const layer of Object.values(regionLayers)) {
    if (leafletMap.hasLayer(layer)) leafletMap.removeLayer(layer);
  }
  regionLayers = {};

  for (const [regionId, mapData] of Object.entries(MAP_REGIONS)) {
    if (!mapData.coords || mapData.coords.length < 3) continue;

    const gameRegion = GAME_STATE.regions[regionId];
    const nationId = gameRegion ? gameRegion.nation : mapData.nation;
    const nation = GAME_STATE.nations[nationId];
    const color = nation ? nation.color : '#9E9E9E';
    const isPlayerRegion = (nationId === GAME_STATE.player_nation);
    const isSelected = (selectedRegionId === regionId);

    const polygon = L.polygon(mapData.coords, buildPolygonStyle(color, isPlayerRegion, isSelected));

    // События
    polygon.on('click',      () => onRegionClick(regionId));
    polygon.on('mouseover',  (e) => onRegionHover(e, regionId, true,  color, isPlayerRegion));
    polygon.on('mouseout',   (e) => onRegionHover(e, regionId, false, color, isPlayerRegion));

    polygon.bindTooltip(buildTooltipContent(regionId, mapData, nationId), {
      className:  'region-tooltip',
      direction:  'top',
      offset:     [0, -4],
      opacity:    0.95,
    });

    polygon.addTo(leafletMap);
    regionLayers[regionId] = polygon;
  }
}

function buildPolygonStyle(color, isPlayerRegion, isSelected) {
  return {
    color:        isSelected      ? '#FFD700' : isPlayerRegion ? '#D4A853' : 'rgba(0,0,0,0.55)',
    weight:       isSelected      ? 3.0 : isPlayerRegion ? 2.0 : 0.8,
    fillColor:    color,
    fillOpacity:  isSelected      ? 0.55 : 0.38,
    opacity:      1.0,
    dashArray:    null,
  };
}

function buildTooltipContent(regionId, mapData, nationId) {
  const nation = GAME_STATE.nations[nationId];
  const gameRegion = GAME_STATE.regions[regionId];
  const nationName = nation ? nation.name : 'Независимые';
  const nationColor = nation ? nation.color : '#9E9E9E';
  const pop = gameRegion ? (gameRegion.population || 0).toLocaleString() : '?';

  return `
    <div class="rt-name">${mapData.name}</div>
    <div class="rt-nation" style="color:${nationColor}">${nationName}</div>
    <div class="rt-pop">👥 ${pop}</div>
  `;
}

// ──────────────────────────────────────────────────────────────
// ВЗАИМОДЕЙСТВИЕ
// ──────────────────────────────────────────────────────────────

function onRegionClick(regionId) {
  // Снимаем выделение с предыдущего
  if (selectedRegionId && regionLayers[selectedRegionId]) {
    const prev = GAME_STATE.regions[selectedRegionId];
    const prevNationId = prev ? prev.nation : MAP_REGIONS[selectedRegionId]?.nation;
    const prevNation = GAME_STATE.nations[prevNationId];
    const prevColor = prevNation ? prevNation.color : '#9E9E9E';
    const prevIsPlayer = (prevNationId === GAME_STATE.player_nation);
    regionLayers[selectedRegionId].setStyle(buildPolygonStyle(prevColor, prevIsPlayer, false));
  }

  if (selectedRegionId === regionId) {
    // Клик по уже выбранному — снимаем выбор
    selectedRegionId = null;
    closeRegionInfo();
    return;
  }

  selectedRegionId = regionId;

  // Выделяем новый регион
  const layer = regionLayers[regionId];
  if (layer) {
    const gameRegion = GAME_STATE.regions[regionId];
    const nationId = gameRegion ? gameRegion.nation : MAP_REGIONS[regionId]?.nation;
    const nation = GAME_STATE.nations[nationId];
    const color = nation ? nation.color : '#9E9E9E';
    layer.setStyle(buildPolygonStyle(color, nationId === GAME_STATE.player_nation, true));
    layer.bringToFront();
  }

  showRegionInfo(regionId);
}

function onRegionHover(e, regionId, entering, color, isPlayerRegion) {
  if (regionId === selectedRegionId) return;

  const layer = regionLayers[regionId];
  if (!layer) return;

  if (entering) {
    layer.setStyle({
      fillOpacity: 0.60,
      weight: isPlayerRegion ? 2.5 : 1.5,
      color: '#FFD700',
    });
    layer.bringToFront();
  } else {
    layer.setStyle(buildPolygonStyle(color, isPlayerRegion, false));
  }
}

// ──────────────────────────────────────────────────────────────
// ИНФО-ПАНЕЛЬ РЕГИОНА
// ──────────────────────────────────────────────────────────────

function showRegionInfo(regionId) {
  const panel = document.getElementById('region-info');
  if (!panel) return;

  const mapData = MAP_REGIONS[regionId];
  const gameData = GAME_STATE.regions[regionId];
  if (!mapData || !gameData) return;

  const nationId = gameData.nation;
  const nation = GAME_STATE.nations[nationId];
  const nationName  = nation ? nation.name  : 'Независимые';
  const nationColor = nation ? nation.color : '#9E9E9E';

  const productionLines = Object.entries(gameData.production || {}).map(([good, amount]) => {
    const g = GOODS[good];
    return `<span class="prod-item">${g ? g.icon : '📦'} ${g ? g.name : good}: ${Math.round(amount).toLocaleString()}</span>`;
  }).join('');

  const buildings = (gameData.buildings || []).map(b =>
    `<span class="building-tag">🏛 ${b.replace(/_/g, ' ')}</span>`
  ).join('');

  panel.innerHTML = `
    <div class="region-info-header" style="border-left: 4px solid ${nationColor}">
      <span class="region-info-name">${mapData.name}</span>
      <span class="region-info-nation" style="color:${nationColor}">${nationName}</span>
      <button class="region-info-close" onclick="closeRegionInfo()">✕</button>
    </div>
    <div class="region-info-body">
      <div class="region-info-desc">${mapData.description}</div>
      <div class="region-stats">
        <div class="region-stat">👥 Нас.: <strong>${(gameData.population || 0).toLocaleString()}</strong></div>
        <div class="region-stat">🌿 Плодородие: <strong>${Math.round((gameData.fertility || 0) * 100)}%</strong></div>
        <div class="region-stat">⚔️ Гарнизон: <strong>${(gameData.garrison || 0).toLocaleString()}</strong></div>
        <div class="region-stat">🏔 Тип: <strong>${getTerrainName(gameData.terrain)}</strong></div>
      </div>
      ${productionLines ? `<div class="region-production"><div class="section-label">Производство:</div>${productionLines}</div>` : ''}
      ${buildings ? `<div class="region-buildings"><div class="section-label">Постройки:</div>${buildings}</div>` : ''}
    </div>
  `;

  panel.classList.remove('hidden');
}

function closeRegionInfo() {
  const panel = document.getElementById('region-info');
  if (panel) panel.classList.add('hidden');

  if (selectedRegionId && regionLayers[selectedRegionId]) {
    const gameRegion = GAME_STATE.regions[selectedRegionId];
    const nationId = gameRegion ? gameRegion.nation : MAP_REGIONS[selectedRegionId]?.nation;
    const nation = GAME_STATE.nations[nationId];
    const color = nation ? nation.color : '#9E9E9E';
    regionLayers[selectedRegionId].setStyle(
      buildPolygonStyle(color, nationId === GAME_STATE.player_nation, false)
    );
  }
  selectedRegionId = null;
}

// ──────────────────────────────────────────────────────────────
// ПОДПИСИ МОРЕЙ
// ──────────────────────────────────────────────────────────────

function renderSeaLabels() {
  for (const label of SEA_LABELS) {
    const icon = L.divIcon({
      className: 'sea-label',
      html: `<div class="sea-label-text" style="font-size:${label.size || 11}px">${label.text}</div>`,
      iconAnchor: [50, 10],
      iconSize: [100, 24],
    });
    L.marker([label.lat, label.lng], { icon, interactive: false }).addTo(leafletMap);
  }
}

// ──────────────────────────────────────────────────────────────
// ЛЁГКОЕ ОБНОВЛЕНИЕ СТИЛЕЙ (без пересоздания слоёв)
// ──────────────────────────────────────────────────────────────

function refreshRegionStyles() {
  for (const [regionId, layer] of Object.entries(regionLayers)) {
    const gameRegion = GAME_STATE.regions[regionId];
    const nationId = gameRegion ? gameRegion.nation : MAP_REGIONS[regionId]?.nation;
    const nation = GAME_STATE.nations[nationId];
    const color = nation ? nation.color : '#9E9E9E';
    const isPlayer = (nationId === GAME_STATE.player_nation);
    const isSelected = (regionId === selectedRegionId);
    layer.setStyle(buildPolygonStyle(color, isPlayer, isSelected));

    // Обновляем тултип
    layer.setTooltipContent(buildTooltipContent(regionId, MAP_REGIONS[regionId], nationId));
  }
}

// ──────────────────────────────────────────────────────────────
// ПУБЛИЧНАЯ ФУНКЦИЯ renderMap() — вызывается из turn.js
// ──────────────────────────────────────────────────────────────

function renderMap() {
  if (!leafletMap) {
    // Первый вызов — инициализируем Leaflet
    if (typeof L === 'undefined') {
      console.error('Leaflet не загружен. Проверьте интернет-соединение.');
      const container = document.getElementById('map-container');
      if (container) {
        container.style.background = '#0d2e52';
        container.innerHTML = '<div style="color:#d4a853;padding:20px;text-align:center;padding-top:40px">⚠ Карта недоступна — нет подключения к интернету.<br>Загрузка Leaflet не удалась.</div>';
      }
      return;
    }
    // requestAnimationFrame гарантирует, что контейнер уже имеет размеры в DOM
    requestAnimationFrame(() => {
      try {
        initLeafletMap();
        // invalidateSize на случай если контейнер ещё не получил финальный размер
        setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 100);
      } catch (e) {
        console.error('Leaflet init error:', e);
      }
    });
  } else {
    // Последующие вызовы — только обновляем стили
    refreshRegionStyles();
  }

  // Легенда наций (DOM вне Leaflet)
  renderNationLegend && renderNationLegend();
}

// ──────────────────────────────────────────────────────────────
// УТИЛИТЫ
// ──────────────────────────────────────────────────────────────

function getTerrainName(terrain) {
  const names = {
    coastal_city: 'Прибрежный город',
    plains:       'Равнина',
    hills:        'Холмы',
    mountains:    'Горы',
    river_valley: 'Речная долина',
  };
  return names[terrain] || terrain;
}

function lightenColor(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  try {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}
