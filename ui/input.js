// Поле ввода команд игрока + обработка ответа AI

let inputHistory = [];
let historyIndex = -1;

function initInput() {
  const input  = document.getElementById('command-input');
  const sendBtn = document.getElementById('send-btn');

  if (!input || !sendBtn) return;

  // Отправка по Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommand();
    }

    // История команд (стрелки вверх/вниз)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < inputHistory.length - 1) {
        historyIndex++;
        input.value = inputHistory[historyIndex] || '';
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = inputHistory[historyIndex] || '';
      } else {
        historyIndex = -1;
        input.value = '';
      }
    }
  });

  // Отправка по кнопке
  sendBtn.addEventListener('click', handleCommand);

  // Фокус при загрузке
  input.focus();
}

// ──────────────────────────────────────────────────────────────
// ОБРАБОТКА КОМАНДЫ
// ──────────────────────────────────────────────────────────────

async function handleCommand() {
  const input = document.getElementById('command-input');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Сохраняем в историю
  inputHistory.unshift(text);
  if (inputHistory.length > 50) inputHistory.length = 50;
  historyIndex = -1;

  input.value = '';
  input.disabled = true;

  // Показываем команду в логе
  addEventLog(`› ${text}`, 'info');

  // Показываем индикатор загрузки
  showAIThinking(true);

  try {
    // Проверяем ключ API
    if (!CONFIG.API_KEY) {
      showAPIKeyPrompt();
      return;
    }

    // Отправляем в Claude
    const response = await parsePlayerCommand(text);
    handleAIResponse(response, text);

  } catch (err) {
    console.error('Ошибка команды:', err);
    showAIResponse(`Ошибка: ${err.message}`, 'error');
    addEventLog(`Ошибка AI: ${err.message}`, 'warning');
  } finally {
    showAIThinking(false);
    input.disabled = false;
    input.focus();
  }
}

// ──────────────────────────────────────────────────────────────
// ОБРАБОТКА ОТВЕТА AI
// ──────────────────────────────────────────────────────────────

function handleAIResponse(parsed, originalText) {
  if (!parsed || typeof parsed !== 'object') {
    showAIResponse('Не удалось разобрать команду. Попробуйте переформулировать.', 'error');
    return;
  }

  // Показываем разобранное действие
  const actionType = parsed.action_type || 'unknown';
  const effects = parsed.estimated_effects || {};

  let responseHTML = `
    <div class="ai-response-action">
      <span class="action-type-badge ${actionType}">${getActionTypeName(actionType)}</span>
      <span class="action-desc">${originalText}</span>
    </div>
  `;

  // Описание последствий
  if (Object.keys(effects).length > 0) {
    responseHTML += `<div class="ai-effects"><strong>Ожидаемые последствия:</strong><ul>`;
    for (const [key, val] of Object.entries(effects)) {
      const sign = typeof val === 'number' && val > 0 ? '+' : '';
      const cls  = typeof val === 'number' ? (val >= 0 ? 'positive' : 'negative') : '';
      responseHTML += `<li class="${cls}">${formatEffectPath(key)}: <strong>${sign}${val}</strong></li>`;
    }
    responseHTML += `</ul></div>`;
  }

  // Требует ли голосования?
  if (parsed.requires_vote) {
    responseHTML += `<div class="vote-required">⚠️ Это действие требует голосования в совете</div>`;
  }

  // Радикальность
  if (parsed.radicalism_score !== undefined) {
    const rad = parsed.radicalism_score;
    const radColor = rad > 70 ? '#f44336' : rad > 40 ? '#FF9800' : '#4CAF50';
    responseHTML += `<div class="radicalism">Радикальность: <span style="color:${radColor}">${rad}/100</span></div>`;
  }

  // Применяем действие
  applyParsedAction(parsed);

  showAIResponse(responseHTML, 'success');
  addEventLog(`Действие: ${getActionTypeName(actionType)} — ${originalText.slice(0, 60)}`, 'info');
}

// ──────────────────────────────────────────────────────────────
// ПРИМЕНЕНИЕ ДЕЙСТВИЯ К GAMESTATE
// ──────────────────────────────────────────────────────────────

function applyParsedAction(parsed) {
  const nationId = GAME_STATE.player_nation;
  const action = parsed.parsed_action || {};

  switch (parsed.action_type) {
    case 'economy':
      applyEconomyAction(nationId, action);
      break;
    case 'military':
      applyMilitaryAction(nationId, action);
      break;
    case 'diplomacy':
      applyDiplomacyAction(nationId, action);
      break;
    case 'law':
      initiateLawProcess(nationId, action, parsed);
      break;
    case 'build':
      applyBuildAction(nationId, action);
      break;
    case 'character':
      applyCharacterAction(nationId, action);
      break;
    default:
      // Неизвестное действие — просто логируем
      console.info('Неизвестный тип действия:', parsed.action_type, action);
  }

  renderAll();
}

function applyEconomyAction(nationId, action) {
  const nation = GAME_STATE.nations[nationId];

  if (action.change_tax_rate !== undefined) {
    const newRate = Math.max(0, Math.min(0.5, action.change_tax_rate));
    applyDelta(`nations.${nationId}.economy.tax_rate`, newRate);
    addEventLog(`Налоговая ставка изменена на ${Math.round(newRate * 100)}%.`, 'economy');
  }

  if (action.buy_good && action.amount) {
    const cost = (GAME_STATE.market[action.buy_good]?.price || 10) * action.amount;
    if (nation.economy.treasury >= cost) {
      nation.economy.stockpile[action.buy_good] =
        (nation.economy.stockpile[action.buy_good] || 0) + action.amount;
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - cost);
      addEventLog(`Куплено ${action.amount} ед. ${action.buy_good} за ${Math.round(cost)} монет.`, 'economy');
    } else {
      addEventLog(`Недостаточно средств! Нужно ${Math.round(cost)}, есть ${Math.round(nation.economy.treasury)}.`, 'warning');
    }
  }
}

function applyMilitaryAction(nationId, action) {
  const nation  = GAME_STATE.nations[nationId];
  const military = nation.military;

  if (action.recruit_infantry && action.amount) {
    const cost = action.amount * 10;  // 10 монет за пехотинца
    if (nation.economy.treasury >= cost) {
      applyDelta(`nations.${nationId}.military.infantry`, military.infantry + action.amount);
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - cost);
      addEventLog(`Набрано ${action.amount} пехотинцев. Стоимость: ${cost} монет.`, 'military');
    } else {
      addEventLog(`Не хватает денег на рекрутинг! Нужно ${cost} монет.`, 'warning');
    }
  }

  if (action.recruit_ships && action.amount) {
    const cost = action.amount * 800;
    if (nation.economy.treasury >= cost) {
      applyDelta(`nations.${nationId}.military.ships`, military.ships + action.amount);
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - cost);
      addEventLog(`Построено ${action.amount} кораблей. Стоимость: ${cost} монет.`, 'military');
    } else {
      addEventLog(`Не хватает денег на строительство флота!`, 'warning');
    }
  }

  if (action.recruit_mercenaries && action.amount) {
    const cost = action.amount * 15;
    if (nation.economy.treasury >= cost) {
      applyDelta(`nations.${nationId}.military.mercenaries`, military.mercenaries + action.amount);
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - cost);
      addEventLog(`Наняты ${action.amount} наёмников. Стоимость: ${cost} монет.`, 'military');
    }
  }
}

function applyDiplomacyAction(nationId, action) {
  if (!action.target_nation) return;

  const relation = GAME_STATE.nations[nationId]?.relations[action.target_nation];
  if (!relation) return;

  if (action.send_gift && action.gold_amount) {
    const nation = GAME_STATE.nations[nationId];
    if (nation.economy.treasury >= action.gold_amount) {
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - action.gold_amount);
      const bonus = Math.min(30, Math.floor(action.gold_amount / 100));
      relation.score = Math.min(100, relation.score + bonus);
      addEventLog(`Отправлен дар ${action.target_nation}: ${action.gold_amount} монет. Отношения +${bonus}.`, 'diplomacy');
    }
  }

  if (action.propose_trade) {
    relation.treaties = [...new Set([...relation.treaties, 'trade'])];
    addEventLog(`Предложен торговый договор с ${GAME_STATE.nations[action.target_nation]?.name}.`, 'diplomacy');
  }
}

function initiateLawProcess(nationId, action, parsed) {
  // Создаём черновик закона
  const lawDraft = {
    id: `LAW_${String(Date.now()).slice(-6)}`,
    name: action.name || 'Новый закон',
    text: action.text || '',
    type: action.law_type || 'general',
    proposed_turn: GAME_STATE.turn,
    effects_per_turn: action.effects || {},
    requires_vote: true,
    vote: null,
  };

  // Показываем диалог голосования
  showVotingModal(nationId, lawDraft);
}

function applyBuildAction(nationId, action) {
  if (!action.region || !action.building) return;

  const region = GAME_STATE.regions[action.region];
  if (!region || region.nation !== nationId) {
    addEventLog('Строить можно только на своей территории!', 'warning');
    return;
  }

  const buildCosts = {
    port:     2000,
    barracks: 1500,
    market:   1200,
    temple:   1800,
    walls:    3000,
    granary:  800,
  };

  const cost = buildCosts[action.building] || 1000;
  const nation = GAME_STATE.nations[nationId];

  if (nation.economy.treasury < cost) {
    addEventLog(`Не хватает денег на строительство! Нужно ${cost} монет.`, 'warning');
    return;
  }

  region.buildings = region.buildings || [];
  region.buildings.push(action.building);
  applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - cost);
  addEventLog(`Построено: ${action.building} в регионе ${MAP_REGIONS[action.region]?.name || action.region}. Стоимость: ${cost} монет.`, 'info');
}

function applyCharacterAction(nationId, action) {
  // Действия с персонажами (назначения, ссылки, подарки)
  const nation = GAME_STATE.nations[nationId];
  const char = (nation.characters || []).find(c => c.id === action.target_character);
  if (!char) return;

  if (action.give_gift && action.gold_amount) {
    if (nation.economy.treasury >= action.gold_amount) {
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - action.gold_amount);
      char.traits.loyalty = Math.min(100, char.traits.loyalty + Math.floor(action.gold_amount / 200));
      char.resources.gold += action.gold_amount;
      addEventLog(`${char.name} получил дар ${action.gold_amount} монет. Лояльность выросла.`, 'character');
    }
  }

  if (action.exile) {
    char.alive = false;
    addEventLog(`${char.name} отправлен в изгнание!`, 'character');
    renderRightPanel();
  }
}

// ──────────────────────────────────────────────────────────────
// ГОЛОСОВАНИЕ (упрощённое)
// ──────────────────────────────────────────────────────────────

function showVotingModal(nationId, law) {
  const overlay = document.getElementById('voting-overlay');
  if (!overlay) return;

  const nation = GAME_STATE.nations[nationId];
  const mgr    = getSenateManager(nationId);

  let votesFor, votesAgainst, votesAbstain, passed, vetoed = false, tribuneName = null;
  let speeches = [];
  let senateMode = false;

  // ── Если у нации есть Сенат — используем SenateManager.process_vote() ──
  if (mgr && nation.senate_config) {
    senateMode = true;
    const result = mgr.process_vote({
      threshold:  law.threshold ?? 51,
      law_type:   law.type ?? 'reform',
      law_tags:   law.tags ?? [],
    });

    votesFor      = Math.round(result.for);
    votesAgainst  = Math.round(result.against);
    votesAbstain  = Math.round(result.abstain);
    passed        = result.passed;
    vetoed        = result.vetoed ?? false;
    tribuneName   = result.tribune_name ?? null;

    // Спикеры — материализованные сенаторы
    speeches = (result.top_speakers ?? []).map(s => ({
      name:     s.name,
      portrait: s.portrait ?? '👤',
      vote:     s.loyalty_score > 55 ? 'for' : 'against',
    }));

    // Обновляем настроение Сената после голосования
    mgr._recalculateSenateState();

  } else {
    // ── Старая логика через nation.characters ──────────────────────
    const characters = (nation.characters || []).filter(c => c.alive);
    let charFor = 0, charAgainst = 0, charAbstain = 0;
    for (const char of characters) {
      const vote = calculateCharacterVote(char, law);
      if (vote === 'for' || vote === 'strongly_for') charFor++;
      else if (vote === 'against' || vote === 'strongly_against') charAgainst++;
      else charAbstain++;
      if (char.traits.ambition > 60 || char.traits.loyalty > 70) {
        speeches.push({ name: char.name, portrait: char.portrait, vote });
      }
    }
    const total = characters.length || 1;
    votesFor     = charFor;
    votesAgainst = charAgainst;
    votesAbstain = charAbstain;
    passed       = charFor / total > 0.5;
  }

  const vetoNote = vetoed
    ? `<div class="vote-veto">⚖️ Вето Трибуна (${tribuneName}): закон заблокирован!</div>`
    : '';
  const senateNote = senateMode
    ? `<div class="vote-senate-note">🏛️ Голосует Сенат (${votesFor + votesAgainst + votesAbstain} голосов)</div>`
    : '';

  overlay.innerHTML = `
    <div class="voting-modal">
      <div class="voting-title">⚖️ Голосование: ${law.name}</div>
      <div class="voting-text">${law.text || ''}</div>
      ${senateNote}

      <div class="vote-counts">
        <span class="vote-for">✅ За: ${Math.round(votesFor)}</span>
        <span class="vote-against">❌ Против: ${Math.round(votesAgainst)}</span>
        <span class="vote-abstain">🔲 Воздержались: ${Math.round(votesAbstain)}</span>
      </div>

      ${speeches.slice(0, 3).map(s => `
        <div class="vote-speech">
          <span>${s.portrait}</span>
          <span>${s.name}: <em>${getVoteText(s.vote)}</em></span>
        </div>
      `).join('')}

      ${vetoNote}

      <div class="vote-result ${passed ? 'passed' : 'failed'}">
        ${passed ? '✅ ЗАКОН ПРИНЯТ' : '❌ ЗАКОН ОТКЛОНЁН'}
      </div>

      <div class="voting-btns">
        <button onclick="finalizeVote('${nationId}', ${JSON.stringify(law).replace(/"/g, '&quot;')}, ${Math.round(votesFor)}, ${Math.round(votesAgainst)}, ${Math.round(votesAbstain)}, ${passed})">
          Принять результат
        </button>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';
}

function calculateCharacterVote(char, law) {
  // Детерминированная логика голосования
  const loyalty = char.traits.loyalty;
  const ambition = char.traits.ambition;
  const caution = char.traits.caution;

  // Базовый шанс поддержки — лояльность + случайность
  const baseSupport = loyalty + (Math.random() * 40 - 20);

  if (law.type === 'military' && ambition > 60) return 'strongly_for';
  if (law.type === 'military' && caution > 70) return 'against';
  if (baseSupport > 70) return 'for';
  if (baseSupport > 50) return 'neutral';
  return 'against';
}

function getVoteText(vote) {
  const texts = {
    strongly_for:     'Горячо поддерживаю!',
    for:              'Поддерживаю.',
    neutral:          'Воздерживаюсь.',
    against:          'Против.',
    strongly_against: 'Категорически против!',
  };
  return texts[vote] || 'Воздерживаюсь.';
}

function finalizeVote(nationId, law, votesFor, votesAgainst, votesAbstain, passed) {
  const overlay = document.getElementById('voting-overlay');
  if (overlay) overlay.style.display = 'none';

  if (passed) {
    law.vote = { for: votesFor, against: votesAgainst, abstain: votesAbstain };
    law.enacted_turn = GAME_STATE.turn;
    GAME_STATE.nations[nationId].active_laws.push(law);
    addEventLog(`Закон "${law.name}" принят! За: ${votesFor}, Против: ${votesAgainst}.`, 'law');
  } else {
    addEventLog(`Закон "${law.name}" отклонён. За: ${votesFor}, Против: ${votesAgainst}.`, 'law');
  }

  renderAll();
}

// ──────────────────────────────────────────────────────────────
// UI УТИЛИТЫ
// ──────────────────────────────────────────────────────────────

function showAIThinking(active) {
  const responseDiv = document.getElementById('ai-response');
  const sendBtn = document.getElementById('send-btn');

  if (active) {
    if (responseDiv) {
      responseDiv.innerHTML = '<div class="ai-thinking">🤔 Советники думают...</div>';
      responseDiv.classList.remove('hidden');
    }
    if (sendBtn) sendBtn.disabled = true;
  } else {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function showAIResponse(html, type = 'info') {
  const responseDiv = document.getElementById('ai-response');
  if (!responseDiv) return;

  responseDiv.innerHTML = `<div class="ai-response-content ${type}">${html}</div>`;
  responseDiv.classList.remove('hidden');

  // Автоскрытие через 15 секунд
  clearTimeout(responseDiv._hideTimeout);
  responseDiv._hideTimeout = setTimeout(() => {
    responseDiv.classList.add('hidden');
  }, 15000);
}

function showAPIKeyPrompt() {
  showAIThinking(false);

  const responseDiv = document.getElementById('ai-response');
  if (responseDiv) {
    responseDiv.innerHTML = `
      <div class="api-key-prompt">
        <div class="api-key-title">🔑 Требуется API ключ Anthropic</div>
        <div class="api-key-desc">Введите ваш ключ для активации AI-советников:</div>
        <div class="api-key-input-row">
          <input type="password" id="api-key-input" placeholder="sk-ant-..." class="api-key-field">
          <button onclick="saveAPIKey()" class="api-key-btn">Сохранить</button>
        </div>
        <div class="api-key-hint">
          Получить ключ: <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>
        </div>
      </div>
    `;
    responseDiv.classList.remove('hidden');
  }
}

function saveAPIKey() {
  const keyInput = document.getElementById('api-key-input');
  if (!keyInput) return;

  const key = keyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    alert('Неверный формат ключа. Должен начинаться с sk-ant-');
    return;
  }

  CONFIG.API_KEY = key;
  localStorage.setItem('ancient_strategy_api_key', key);
  showAIResponse('✅ API ключ сохранён! Теперь вы можете использовать AI-советников.', 'success');
}

function loadSavedAPIKey() {
  const saved = localStorage.getItem('ancient_strategy_api_key');
  if (saved) CONFIG.API_KEY = saved;
}

function getActionTypeName(type) {
  const names = {
    law:        '📜 Закон',
    military:   '⚔️ Армия',
    diplomacy:  '🤝 Дипломатия',
    economy:    '💰 Экономика',
    character:  '👤 Персонаж',
    build:      '🏛 Строительство',
  };
  return names[type] || type;
}

function formatEffectPath(path) {
  const parts = path.split('.');
  const last = parts[parts.length - 1];
  const labels = {
    treasury:    'Казна',
    happiness:   'Счастье',
    legitimacy:  'Легитимность',
    infantry:    'Пехота',
    cavalry:     'Кавалерия',
    ships:       'Корабли',
    morale:      'Боевой дух',
    loyalty:     'Лояльность армии',
    total:       'Население',
    tax_rate:    'Налоговая ставка',
  };
  return labels[last] || last.replace(/_/g, ' ');
}
