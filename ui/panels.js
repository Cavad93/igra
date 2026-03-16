// Боковые панели — статистика нации и двор

// ──────────────────────────────────────────────────────────────
// ЛЕВАЯ ПАНЕЛЬ — статистика игрока
// ──────────────────────────────────────────────────────────────

function renderLeftPanel() {
  const panel = document.getElementById('left-panel');
  if (!panel || !GAME_STATE) return;

  const nationId = GAME_STATE.player_nation;
  const nation = GAME_STATE.nations[nationId];
  if (!nation) return;

  const economy  = nation.economy;
  const military = nation.military;
  const pop      = nation.population;
  const gov      = nation.government;

  const delta = economy.income_per_turn - economy.expense_per_turn;
  const deltaStr = delta >= 0 ? `+${Math.round(delta)}` : `${Math.round(delta)}`;
  const deltaClass = delta >= 0 ? 'positive' : 'negative';

  panel.innerHTML = `
    <!-- ПРАВИТЕЛЬ -->
    <div class="panel-section ruler-section">
      <div class="ruler-name">⚔️ ${gov.ruler}</div>
      <div class="ruler-sub">${getGovernmentName(gov.type)} · ${nation.name}</div>
      <div class="legitimacy-bar">
        <span class="stat-label">Легитимность</span>
        <div class="bar-container">
          <div class="bar-fill legitimacy-fill" style="width:${gov.legitimacy}%"></div>
        </div>
        <span class="stat-value">${gov.legitimacy}%</span>
      </div>
    </div>

    <!-- КАЗНА -->
    <div class="panel-section">
      <div class="section-title">💰 Казна</div>
      <div class="stat-row">
        <span class="stat-label">Монет</span>
        <span class="stat-value gold">${Math.round(economy.treasury).toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Доход/ход</span>
        <span class="stat-value positive">+${Math.round(economy.income_per_turn)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Расход/ход</span>
        <span class="stat-value negative">-${Math.round(economy.expense_per_turn)}</span>
      </div>
      <div class="stat-row total-row">
        <span class="stat-label">Баланс</span>
        <span class="stat-value ${deltaClass}">${deltaStr}</span>
      </div>
    </div>

    <!-- НАСЕЛЕНИЕ -->
    <div class="panel-section">
      <div class="section-title">👥 Население</div>
      <div class="stat-row">
        <span class="stat-label">Всего</span>
        <span class="stat-value">${Math.round(pop.total).toLocaleString()}</span>
      </div>
      <div class="happiness-row">
        <span class="stat-label">Счастье</span>
        <div class="bar-container">
          <div class="bar-fill happiness-fill" style="width:${pop.happiness}%; background:${getHappinessColor(pop.happiness)}"></div>
        </div>
        <span class="stat-value">${pop.happiness}%</span>
      </div>
      <div class="professions-grid">
        ${renderProfessions(pop.by_profession)}
      </div>
    </div>

    <!-- АРМИЯ -->
    <div class="panel-section">
      <div class="section-title">⚔️ Армия</div>
      <div class="stat-row">
        <span class="stat-label">🗡 Пехота</span>
        <span class="stat-value">${military.infantry.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">🐴 Кавалерия</span>
        <span class="stat-value">${military.cavalry.toLocaleString()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">⛵ Корабли</span>
        <span class="stat-value">${military.ships}</span>
      </div>
      ${military.mercenaries > 0 ? `
      <div class="stat-row">
        <span class="stat-label">🏴‍☠️ Наёмники</span>
        <span class="stat-value">${military.mercenaries.toLocaleString()}</span>
      </div>` : ''}
      <div class="morale-row">
        <span class="stat-label">Боевой дух</span>
        <div class="bar-container">
          <div class="bar-fill morale-fill" style="width:${military.morale}%"></div>
        </div>
        <span class="stat-value">${military.morale}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Лояльность</span>
        <div class="bar-container">
          <div class="bar-fill loyalty-fill" style="width:${military.loyalty}%"></div>
        </div>
        <span class="stat-value">${military.loyalty}%</span>
      </div>
    </div>

    <!-- ДИПЛОМАТИЯ -->
    <div class="panel-section">
      <div class="section-title">🤝 Дипломатия</div>
      ${renderRelations(nation.relations)}
    </div>

    <!-- ЗАКОНЫ -->
    <div class="panel-section">
      <div class="section-title">📜 Законы <span class="laws-count">${(nation.active_laws || []).length}</span></div>
      ${renderLaws(nation.active_laws)}
    </div>
  `;
}

function renderProfessions(profs) {
  const profLabels = {
    farmers:   { icon: '🌾', name: 'Земледельцы' },
    craftsmen: { icon: '🔨', name: 'Ремесленники' },
    merchants: { icon: '⚖️', name: 'Торговцы' },
    sailors:   { icon: '⚓', name: 'Моряки' },
    clergy:    { icon: '🏛', name: 'Жрецы' },
    soldiers:  { icon: '🗡', name: 'Воины' },
    slaves:    { icon: '⛓', name: 'Рабы' },
  };

  return Object.entries(profs).map(([prof, count]) => {
    const info = profLabels[prof] || { icon: '👤', name: prof };
    return `
      <div class="prof-item" title="${info.name}">
        <span class="prof-icon">${info.icon}</span>
        <span class="prof-count">${formatNumber(count)}</span>
      </div>
    `;
  }).join('');
}

function renderRelations(relations) {
  if (!relations) return '<div class="no-data">Нет данных</div>';

  return Object.entries(relations).slice(0, 6).map(([nationId, rel]) => {
    const otherNation = GAME_STATE.nations[nationId];
    if (!otherNation) return '';

    const score = rel.score;
    const bar = Math.max(0, Math.min(100, score + 50));  // -50..50 → 0..100
    const color = score > 20 ? '#4CAF50' : score < -20 ? '#f44336' : '#FF9800';
    const statusIcon = rel.at_war ? '⚔️' : rel.treaties.length > 0 ? '🤝' : '';

    return `
      <div class="relation-row">
        <span class="relation-name" style="color:${otherNation.color}">${otherNation.name}</span>
        <div class="bar-container small">
          <div class="bar-fill" style="width:${bar}%; background:${color}"></div>
        </div>
        <span class="relation-score" style="color:${color}">${score > 0 ? '+' : ''}${score}</span>
        ${statusIcon ? `<span class="relation-status">${statusIcon}</span>` : ''}
      </div>
    `;
  }).join('');
}

function renderLaws(laws) {
  if (!laws || laws.length === 0) {
    return '<div class="no-data">Законов нет</div>';
  }
  return laws.map(law => `
    <div class="law-item">
      <span class="law-name">${law.name}</span>
      ${law.vote ? `<span class="law-vote">За: ${law.vote.for}, Против: ${law.vote.against}</span>` : ''}
    </div>
  `).join('');
}

// ──────────────────────────────────────────────────────────────
// ПРАВАЯ ПАНЕЛЬ — двор
// ──────────────────────────────────────────────────────────────

function renderRightPanel() {
  const panel = document.getElementById('right-panel');
  if (!panel || !GAME_STATE) return;

  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const characters = (nation.characters || []).filter(c => c.alive);

  panel.innerHTML = `
    <div class="panel-title">👑 Двор Агафокла</div>
    <div class="characters-list">
      ${characters.length === 0
        ? '<div class="no-data">Двор пуст. Введите команду для генерации персонажей.</div>'
        : characters.map(renderCharacterCard).join('')
      }
    </div>
  `;
}

function renderCharacterCard(char) {
  const loyaltyColor = char.traits.loyalty > 60 ? '#4CAF50' :
                       char.traits.loyalty > 30 ? '#FF9800' : '#f44336';
  const moodIcon = getMoodIcon(char.traits.loyalty, char.traits.ambition);
  const roleLabel = getRoleLabel(char.role);

  return `
    <div class="char-card" onclick="showCharacterDetail('${char.id}')" title="${char.description}">
      <div class="char-portrait">${char.portrait || '👤'}</div>
      <div class="char-info">
        <div class="char-name">${char.name}</div>
        <div class="char-role">${roleLabel} · ${char.age} лет</div>
        <div class="char-loyalty">
          <span style="color:${loyaltyColor}">●</span>
          <span class="char-mood">${moodIcon}</span>
          ${char.traits.loyalty > 70 ? 'Предан' :
            char.traits.loyalty > 40 ? 'Нейтрален' : 'Недоволен'}
        </div>
      </div>
      <div class="char-wants" title="Желания: ${char.wants.join(', ')}">
        ${char.wants.slice(0, 1).map(w => `<span class="want-tag">${formatWant(w)}</span>`).join('')}
      </div>
    </div>
  `;
}

// Детальное окно персонажа
function showCharacterDetail(charId) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const char = (nation.characters || []).find(c => c.id === charId);
  if (!char) return;

  const overlay = document.getElementById('char-overlay');
  if (!overlay) return;

  overlay.innerHTML = `
    <div class="char-detail-box">
      <div class="char-detail-header">
        <span class="char-detail-portrait">${char.portrait || '👤'}</span>
        <div>
          <div class="char-detail-name">${char.name}</div>
          <div class="char-detail-role">${getRoleLabel(char.role)} · ${char.age} лет · ❤️ ${char.health}/100</div>
        </div>
        <button onclick="closeCharacterDetail()" class="close-btn">✕</button>
      </div>
      <div class="char-detail-desc">${char.description}</div>

      <div class="char-traits-grid">
        ${renderTraitBar('Честолюбие', char.traits.ambition, '#9C27B0')}
        ${renderTraitBar('Осторожность', char.traits.caution, '#2196F3')}
        ${renderTraitBar('Лояльность', char.traits.loyalty, '#4CAF50')}
        ${renderTraitBar('Набожность', char.traits.piety, '#FF9800')}
        ${renderTraitBar('Жестокость', char.traits.cruelty, '#f44336')}
        ${renderTraitBar('Жадность', char.traits.greed, '#795548')}
      </div>

      <div class="char-detail-section">
        <div class="section-label">💎 Ресурсы</div>
        <div class="char-resources">
          <span>💰 ${char.resources.gold.toLocaleString()}</span>
          <span>🌾 Земли: ${char.resources.land}</span>
          <span>👥 Последователи: ${char.resources.followers}</span>
          ${char.resources.army_command > 0 ? `<span>⚔️ Войска: ${char.resources.army_command}</span>` : ''}
        </div>
      </div>

      <div class="char-detail-section">
        <div class="section-label">✨ Желает</div>
        <div class="char-wants-list">${char.wants.map(w => `<span class="tag want">${formatWant(w)}</span>`).join('')}</div>
      </div>

      <div class="char-detail-section">
        <div class="section-label">😰 Боится</div>
        <div class="char-fears-list">${char.fears.map(f => `<span class="tag fear">${formatWant(f)}</span>`).join('')}</div>
      </div>

      ${char.history && char.history.length > 0 ? `
      <div class="char-detail-section">
        <div class="section-label">📜 История</div>
        <div class="char-history">
          ${char.history.slice(-3).reverse().map(h => `<div class="history-entry">Ход ${h.turn}: ${h.event}</div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  overlay.style.display = 'flex';
}

function closeCharacterDetail() {
  const overlay = document.getElementById('char-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderTraitBar(name, value, color) {
  return `
    <div class="trait-row">
      <span class="trait-name">${name}</span>
      <div class="bar-container">
        <div class="bar-fill" style="width:${value}%; background:${color}"></div>
      </div>
      <span class="trait-value">${value}</span>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// УТИЛИТЫ
// ──────────────────────────────────────────────────────────────

function getGovernmentName(type) {
  const names = {
    tyranny:    'Тирания',
    monarchy:   'Монархия',
    republic:   'Республика',
    oligarchy:  'Олигархия',
    democracy:  'Демократия',
  };
  return names[type] || type;
}

function getHappinessColor(happiness) {
  if (happiness > 70) return '#4CAF50';
  if (happiness > 40) return '#FF9800';
  return '#f44336';
}

function getMoodIcon(loyalty, ambition) {
  if (loyalty > 70) return '😊';
  if (loyalty > 40) return '😐';
  if (ambition > 70) return '😤';
  return '😠';
}

function getRoleLabel(role) {
  const labels = {
    senator:  'Сенатор',
    advisor:  'Советник',
    general:  'Стратег',
    priest:   'Жрец',
    merchant: 'Купец',
  };
  return labels[role] || role;
}

function formatWant(want) {
  return want.replace(/_/g, ' ');
}

function formatNumber(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}М`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}К`;
  return String(n);
}
