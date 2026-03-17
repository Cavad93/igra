// Карта на Leaflet.js + тайлы CAWM (Ancient World Mapping Center)
// Тайлы: https://cawm.lib.uiowa.edu — CC BY 4.0
// Координаты в формате Leaflet [lat, lng]

let leafletMap = null;          // экземпляр L.Map
let regionLayers = {};          // { regionId: L.Polygon }
let selectedRegionId = null;
let regionLabelLayers = [];     // маркеры подписей регионов
let nationLabelLayers = [];     // маркеры подписей наций

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

  // Подписи наций и регионов (тиснение)
  renderNationLabels();
  renderRegionLabelsOnMap();

  // Подписи морей
  renderSeaLabels();

  // При зуме — пересчитываем размеры шрифтов
  leafletMap.on('zoomend', () => {
    updateLabelSizes();
  });
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
// POLYLABEL — визуальный центр полигона (mapbox алгоритм)
// Находит точку внутри полигона, максимально удалённую от краёв
// ──────────────────────────────────────────────────────────────

function polylabel(polygon, precision) {
  precision = precision || 1.0;

  // Работаем с внешним кольцом
  var ring = polygon[0] || polygon;
  if (ring.length === 0) return [0, 0];

  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < ring.length; i++) {
    var p = ring[i];
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }

  var width = maxX - minX;
  var height = maxY - minY;
  var cellSize = Math.min(width, height);
  if (cellSize === 0) return [(minX + maxX) / 2, (minY + maxY) / 2];

  var h = cellSize / 2;

  // Приоритетная очередь (простая реализация)
  var cellQueue = [];

  for (var x = minX; x < maxX; x += cellSize) {
    for (var y = minY; y < maxY; y += cellSize) {
      cellQueue.push(createCell(x + h, y + h, h, ring));
    }
  }

  var bestCell = getCentroidCell(ring);

  var bboxCell = createCell(minX + width / 2, minY + height / 2, 0, ring);
  if (bboxCell.d > bestCell.d) bestCell = bboxCell;

  while (cellQueue.length) {
    // Сортируем и берём лучшую (жадно)
    cellQueue.sort(function(a, b) { return b.max - a.max; });
    var cell = cellQueue.shift();

    if (cell.d > bestCell.d) {
      bestCell = cell;
    }

    if (cell.max - bestCell.d <= precision) continue;

    h = cell.h / 2;
    cellQueue.push(createCell(cell.x - h, cell.y - h, h, ring));
    cellQueue.push(createCell(cell.x + h, cell.y - h, h, ring));
    cellQueue.push(createCell(cell.x - h, cell.y + h, h, ring));
    cellQueue.push(createCell(cell.x + h, cell.y + h, h, ring));
  }

  return [bestCell.x, bestCell.y];
}

function createCell(x, y, h, ring) {
  var d = pointToPolygonDist(x, y, ring);
  return { x: x, y: y, h: h, d: d, max: d + h * Math.SQRT2 };
}

function getCentroidCell(ring) {
  var area = 0, x = 0, y = 0;
  for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    var a = ring[i], b = ring[j];
    var f = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * f;
    y += (a[1] + b[1]) * f;
    area += f * 3;
  }
  if (area === 0) return createCell(ring[0][0], ring[0][1], 0, ring);
  return createCell(x / area, y / area, 0, ring);
}

function pointToPolygonDist(x, y, ring) {
  var inside = false;
  var minDistSq = Infinity;
  for (var i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    var a = ring[i], b = ring[j];
    if ((a[1] > y !== b[1] > y) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]))
      inside = !inside;
    minDistSq = Math.min(minDistSq, segDistSq(x, y, a, b));
  }
  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function segDistSq(px, py, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx !== 0 || dy !== 0) {
    var t = ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy);
    if (t > 1) { a = b; }
    else if (t > 0) { a = [a[0] + dx * t, a[1] + dy * t]; }
  }
  dx = px - a[0]; dy = py - a[1];
  return dx * dx + dy * dy;
}

// ──────────────────────────────────────────────────────────────
// ПОДПИСИ РЕГИОНОВ (каждый полигон — своё название)
// ──────────────────────────────────────────────────────────────

function getPolygonBBox(coords) {
  var minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (var i = 0; i < coords.length; i++) {
    if (coords[i][0] < minLat) minLat = coords[i][0];
    if (coords[i][0] > maxLat) maxLat = coords[i][0];
    if (coords[i][1] < minLng) minLng = coords[i][1];
    if (coords[i][1] > maxLng) maxLng = coords[i][1];
  }
  return { minLat, maxLat, minLng, maxLng,
    width: maxLng - minLng, height: maxLat - minLat,
    centerLat: (minLat + maxLat) / 2, centerLng: (minLng + maxLng) / 2 };
}

function getRegionAngle(bbox) {
  // Для очень вытянутых по высоте — вертикально
  if (bbox.height > bbox.width * 1.3) return -90;
  return 0;
}

function calcFontSizePx(text, regionWidthPx, targetFill) {
  // Приблизительно: каждый символ ~0.6em ширины при uppercase + letter-spacing
  var charWidth = 0.65;
  var targetWidth = regionWidthPx * (targetFill || 0.65);
  var fontSize = targetWidth / (text.length * charWidth);
  return Math.max(8, Math.min(48, Math.round(fontSize)));
}

function regionWidthInPixels(bbox, map) {
  var sw = map.latLngToContainerPoint([bbox.minLat, bbox.minLng]);
  var ne = map.latLngToContainerPoint([bbox.maxLat, bbox.maxLng]);
  return Math.abs(ne.x - sw.x);
}

function regionHeightInPixels(bbox, map) {
  var sw = map.latLngToContainerPoint([bbox.minLat, bbox.minLng]);
  var ne = map.latLngToContainerPoint([bbox.maxLat, bbox.maxLng]);
  return Math.abs(ne.y - sw.y);
}

function renderRegionLabelsOnMap() {
  // Удаляем старые
  regionLabelLayers.forEach(function(m) { leafletMap.removeLayer(m); });
  regionLabelLayers = [];

  for (var regionId in MAP_REGIONS) {
    var mapData = MAP_REGIONS[regionId];
    if (!mapData.coords || mapData.coords.length < 3) continue;

    var bbox = getPolygonBBox(mapData.coords);
    var angle = getRegionAngle(bbox);

    // Используем polylabel для визуального центра
    var center = polylabel([mapData.coords], 0.5);
    var lat = center[0], lng = center[1];

    // Вычисляем размер шрифта
    var wPx = regionWidthInPixels(bbox, leafletMap);
    var hPx = regionHeightInPixels(bbox, leafletMap);
    var effectiveWidth = angle === -90 ? hPx : wPx;
    var fontSize = calcFontSizePx(mapData.name, effectiveWidth, 0.65);

    // Размер контейнера
    var iconW = angle === -90 ? Math.max(hPx, 60) : Math.max(wPx, 60);
    var iconH = angle === -90 ? fontSize * 2 : fontSize * 2;

    var transform = angle === -90
      ? 'transform: rotate(-90deg); transform-origin: center center;'
      : '';

    var html = '<div class="region-label-text" data-region="' + regionId + '" style="font-size:' + fontSize + 'px;' + transform + '">' + mapData.name + '</div>';

    var icon = L.divIcon({
      className: 'region-label',
      html: html,
      iconSize: [iconW, iconH],
      iconAnchor: [iconW / 2, iconH / 2],
    });

    var marker = L.marker([lat, lng], { icon: icon, interactive: false, zIndexOffset: -100 });
    marker.addTo(leafletMap);
    marker._labelData = { regionId: regionId, bbox: bbox, angle: angle, name: mapData.name };
    regionLabelLayers.push(marker);
  }
}

// ──────────────────────────────────────────────────────────────
// ПОДПИСИ НАЦИЙ (крупный текст, охватывает все регионы нации)
// ──────────────────────────────────────────────────────────────

function renderNationLabels() {
  // Удаляем старые
  nationLabelLayers.forEach(function(m) { leafletMap.removeLayer(m); });
  nationLabelLayers = [];

  // Группируем регионы по нациям
  var nationRegions = {};
  for (var regionId in MAP_REGIONS) {
    var mapData = MAP_REGIONS[regionId];
    var gameRegion = GAME_STATE.regions[regionId];
    var nationId = gameRegion ? gameRegion.nation : mapData.nation;
    if (!nationId || nationId === 'neutral') continue; // нейтральные не подписываем как нацию
    if (!nationRegions[nationId]) nationRegions[nationId] = [];
    nationRegions[nationId].push(mapData);
  }

  for (var nationId in nationRegions) {
    var regions = nationRegions[nationId];
    if (regions.length < 1) continue;

    var nation = GAME_STATE.nations[nationId];
    if (!nation) continue;

    // Объединённый bbox всех регионов нации
    var allCoords = [];
    regions.forEach(function(r) {
      if (r.coords) allCoords = allCoords.concat(r.coords);
    });
    var bbox = getPolygonBBox(allCoords);

    // Визуальный центр — polylabel на самом крупном регионе
    // или среднее по всем центрам регионов
    var sumLat = 0, sumLng = 0;
    regions.forEach(function(r) {
      var c = r.center || [bbox.centerLat, bbox.centerLng];
      sumLat += c[0];
      sumLng += c[1];
    });
    var lat = sumLat / regions.length;
    var lng = sumLng / regions.length;

    var angle = getRegionAngle(bbox);
    var wPx = regionWidthInPixels(bbox, leafletMap);
    var hPx = regionHeightInPixels(bbox, leafletMap);
    var effectiveWidth = angle === -90 ? hPx : wPx;
    var fontSize = calcFontSizePx(nation.name, effectiveWidth, 0.70);
    fontSize = Math.max(12, Math.min(64, Math.round(fontSize * 1.3))); // крупнее чем регионы

    var iconW = angle === -90 ? Math.max(hPx, 80) : Math.max(wPx, 80);
    var iconH = angle === -90 ? fontSize * 2.5 : fontSize * 2.5;

    var transform = angle === -90
      ? 'transform: rotate(-90deg); transform-origin: center center;'
      : '';

    var html = '<div class="nation-label-text" data-nation="' + nationId + '" style="font-size:' + fontSize + 'px;' + transform + '">' + nation.name + '</div>';

    var icon = L.divIcon({
      className: 'nation-label',
      html: html,
      iconSize: [iconW, iconH],
      iconAnchor: [iconW / 2, iconH / 2],
    });

    var marker = L.marker([lat, lng], { icon: icon, interactive: false, zIndexOffset: -200 });
    marker.addTo(leafletMap);
    marker._labelData = { nationId: nationId, bbox: bbox, angle: angle, name: nation.name, isNation: true };
    nationLabelLayers.push(marker);
  }
}

// ──────────────────────────────────────────────────────────────
// ОБНОВЛЕНИЕ РАЗМЕРОВ ШРИФТОВ ПРИ ЗУМЕ
// ──────────────────────────────────────────────────────────────

function updateLabelSizes() {
  // Регионы
  regionLabelLayers.forEach(function(marker) {
    var d = marker._labelData;
    if (!d) return;
    var wPx = regionWidthInPixels(d.bbox, leafletMap);
    var hPx = regionHeightInPixels(d.bbox, leafletMap);
    var effectiveWidth = d.angle === -90 ? hPx : wPx;
    var fontSize = calcFontSizePx(d.name, effectiveWidth, 0.65);

    var el = marker.getElement();
    if (el) {
      var txt = el.querySelector('.region-label-text');
      if (txt) txt.style.fontSize = fontSize + 'px';
    }
  });

  // Нации
  nationLabelLayers.forEach(function(marker) {
    var d = marker._labelData;
    if (!d) return;
    var wPx = regionWidthInPixels(d.bbox, leafletMap);
    var hPx = regionHeightInPixels(d.bbox, leafletMap);
    var effectiveWidth = d.angle === -90 ? hPx : wPx;
    var fontSize = calcFontSizePx(d.name, effectiveWidth, 0.70);
    fontSize = Math.max(12, Math.min(64, Math.round(fontSize * 1.3)));

    var el = marker.getElement();
    if (el) {
      var txt = el.querySelector('.nation-label-text');
      if (txt) txt.style.fontSize = fontSize + 'px';
    }
  });
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

  // Пересоздаём подписи наций (владение могло измениться)
  renderNationLabels();
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
