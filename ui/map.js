// SVG карта — рендер и обработка кликов

let selectedRegion = null;

// ──────────────────────────────────────────────────────────────
// ОТРИСОВКА КАРТЫ
// ──────────────────────────────────────────────────────────────

function renderMap() {
  const svg = document.getElementById('game-map');
  if (!svg) return;

  // Очищаем карту
  svg.innerHTML = '';

  // Фон — море
  const seaBg = createSVGEl('rect', {
    width: '100%', height: '100%',
    fill: 'url(#seaGradient)',
  });
  svg.appendChild(seaBg);

  // Определения (градиенты, фильтры)
  svg.appendChild(buildDefs());

  // Рисуем континентальные фоны
  for (const continent of MAP_CONTINENTS) {
    const poly = createSVGEl('polygon', {
      points: continent.points,
      fill: '#C4A882',
      stroke: '#A08060',
      'stroke-width': '0.5',
      opacity: '0.85',
      class: 'continent-bg',
      id: `continent-${continent.id}`,
    });
    svg.appendChild(poly);
  }

  // Рисуем регионы
  for (const [regionId, regionData] of Object.entries(MAP_REGIONS)) {
    renderRegion(svg, regionId, regionData);
  }

  // Подписи морей
  for (const label of SEA_LABELS) {
    const text = createSVGEl('text', {
      x: label.x,
      y: label.y,
      'font-size': label.fontSize || 9,
      'font-family': 'serif',
      fill: 'rgba(200,230,255,0.45)',
      'text-anchor': 'middle',
      'font-style': 'italic',
      'pointer-events': 'none',
      'letter-spacing': '1.5',
    });
    text.textContent = label.text;
    svg.appendChild(text);
  }

  // Подписи регионов
  for (const [regionId, regionData] of Object.entries(MAP_REGIONS)) {
    renderRegionLabel(svg, regionId, regionData);
  }
}

// ──────────────────────────────────────────────────────────────
// ОДИН РЕГИОН
// ──────────────────────────────────────────────────────────────

function renderRegion(svg, regionId, regionData) {
  const gameRegion = GAME_STATE.regions[regionId];
  const nationId = gameRegion ? gameRegion.nation : regionData.nation;
  const nation = GAME_STATE.nations[nationId];

  const baseColor = nation ? nation.color : '#9E9E9E';
  const isSelected = (selectedRegion === regionId);
  const isPlayerRegion = (nationId === GAME_STATE.player_nation);

  // Цвет заливки — чуть светлее если выделен
  let fillColor = baseColor;
  if (isSelected) fillColor = lightenColor(baseColor, 40);

  const poly = createSVGEl('polygon', {
    points: regionData.polygon,
    fill: fillColor,
    stroke: isSelected ? '#FFD700' : isPlayerRegion ? '#D4A853' : '#000',
    'stroke-width': isSelected ? '2.5' : isPlayerRegion ? '1.5' : '0.8',
    opacity: '0.92',
    class: `region ${isPlayerRegion ? 'player-region' : ''}`,
    id: `region-${regionId}`,
    'data-region': regionId,
    style: 'cursor: pointer;',
    filter: isSelected ? 'url(#regionGlow)' : '',
  });

  poly.addEventListener('click', () => onRegionClick(regionId));
  poly.addEventListener('mouseenter', () => onRegionHover(regionId, true));
  poly.addEventListener('mouseleave', () => onRegionHover(regionId, false));

  svg.appendChild(poly);

  // Иконка типа региона
  if (regionData.label) {
    const iconData = getRegionIcon(regionData.type);
    const iconEl = createSVGEl('text', {
      x: regionData.label.x,
      y: regionData.label.y - 8,
      'font-size': '10',
      'text-anchor': 'middle',
      'pointer-events': 'none',
    });
    iconEl.textContent = iconData;
    svg.appendChild(iconEl);
  }
}

function renderRegionLabel(svg, regionId, regionData) {
  if (!regionData.label) return;

  const gameRegion = GAME_STATE.regions[regionId];
  const isPlayer = gameRegion && gameRegion.nation === GAME_STATE.player_nation;

  const text = createSVGEl('text', {
    x: regionData.label.x,
    y: regionData.label.y + 8,
    'font-size': isPlayer ? '8.5' : '7.5',
    'font-family': 'serif',
    fill: '#FFF8E7',
    'text-anchor': 'middle',
    'pointer-events': 'none',
    'font-weight': isPlayer ? 'bold' : 'normal',
    'text-shadow': '1px 1px 2px rgba(0,0,0,0.8)',
  });
  text.textContent = regionData.name;
  svg.appendChild(text);
}

// ──────────────────────────────────────────────────────────────
// ВЗАИМОДЕЙСТВИЕ
// ──────────────────────────────────────────────────────────────

function onRegionClick(regionId) {
  selectedRegion = regionId;
  renderMap();  // перерисовываем с выделением
  showRegionInfo(regionId);
}

function onRegionHover(regionId, entering) {
  const poly = document.getElementById(`region-${regionId}`);
  if (!poly) return;

  if (entering && regionId !== selectedRegion) {
    poly.setAttribute('fill', lightenColor(poly.getAttribute('fill'), 20));
  } else if (!entering && regionId !== selectedRegion) {
    // Восстанавливаем цвет — проще перерисовать
    const gameRegion = GAME_STATE.regions[regionId];
    const nationId = gameRegion ? gameRegion.nation : MAP_REGIONS[regionId]?.nation;
    const nation = GAME_STATE.nations[nationId];
    if (nation) poly.setAttribute('fill', nation.color);
  }
}

function showRegionInfo(regionId) {
  const panel = document.getElementById('region-info');
  if (!panel) return;

  const mapData = MAP_REGIONS[regionId];
  const gameData = GAME_STATE.regions[regionId];
  if (!mapData || !gameData) return;

  const nationId = gameData.nation;
  const nation = GAME_STATE.nations[nationId];
  const nationName = nation ? nation.name : 'Независимые';
  const nationColor = nation ? nation.color : '#9E9E9E';

  // Строим список производства
  const productionLines = Object.entries(gameData.production || {})
    .map(([good, amount]) => {
      const goodData = GOODS[good];
      return `<span class="prod-item">${goodData ? goodData.icon : '📦'} ${goodData ? goodData.name : good}: ${Math.round(amount).toLocaleString()}</span>`;
    }).join('');

  // Строим список зданий
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
  if (panel) {
    panel.classList.add('hidden');
    selectedRegion = null;
    renderMap();
  }
}

// ──────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ──────────────────────────────────────────────────────────────

function createSVGEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== '' && v !== undefined && v !== null) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

function buildDefs() {
  const defs = createSVGEl('defs', {});

  // Градиент моря
  const seaGrad = createSVGEl('linearGradient', {
    id: 'seaGradient', x1: '0', y1: '0', x2: '0', y2: '1',
  });
  const stop1 = createSVGEl('stop', { offset: '0%',   'stop-color': '#1a4a7a' });
  const stop2 = createSVGEl('stop', { offset: '100%', 'stop-color': '#0d2e52' });
  seaGrad.appendChild(stop1);
  seaGrad.appendChild(stop2);
  defs.appendChild(seaGrad);

  // Свечение выбранного региона
  const glow = createSVGEl('filter', { id: 'regionGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
  const blur = createSVGEl('feGaussianBlur', { stdDeviation: '3', result: 'coloredBlur' });
  const merge = createSVGEl('feMerge', {});
  const m1 = createSVGEl('feMergeNode', { in: 'coloredBlur' });
  const m2 = createSVGEl('feMergeNode', { in: 'SourceGraphic' });
  merge.appendChild(m1);
  merge.appendChild(m2);
  glow.appendChild(blur);
  glow.appendChild(merge);
  defs.appendChild(glow);

  return defs;
}

function getRegionIcon(type) {
  const icons = {
    capital_city: '🏛',
    coastal_city: '⚓',
    city_state:   '🏺',
    rural:        '🌾',
    kingdom:      '👑',
    fortress:     '🏰',
  };
  return icons[type] || '🗺';
}

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

// Осветляет HEX цвет на amount (0-255)
function lightenColor(hex, amount) {
  if (!hex || !hex.startsWith('#')) return hex;
  try {
    let num = parseInt(hex.slice(1), 16);
    let r = Math.min(255, (num >> 16) + amount);
    let g = Math.min(255, ((num >> 8) & 0xff) + amount);
    let b = Math.min(255, (num & 0xff) + amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch {
    return hex;
  }
}
