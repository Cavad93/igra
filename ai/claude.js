// Все вызовы Anthropic API
// Каждый вызов получает полный снимок нужной части GameState

// ──────────────────────────────────────────────────────────────
// БАЗОВАЯ ФУНКЦИЯ ВЫЗОВА API
// ──────────────────────────────────────────────────────────────

async function callClaude(system, user, maxTokens = 1024, model = CONFIG.MODEL_HAIKU) {
  if (!CONFIG.API_KEY) {
    throw new Error('API ключ не установлен');
  }

  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`API ошибка ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();

  if (!data.content || !data.content[0]) {
    throw new Error('Пустой ответ от API');
  }

  return data.content[0].text;
}

// ──────────────────────────────────────────────────────────────
// 1. ПАРСИНГ КОМАНДЫ ИГРОКА
// ──────────────────────────────────────────────────────────────

async function parsePlayerCommand(playerInput) {
  // Формируем минимальный снимок состояния (не весь GameState — слишком большой)
  const nationId = GAME_STATE.player_nation;
  const nation = GAME_STATE.nations[nationId];

  const stateSlice = {
    date: GAME_STATE.date,
    turn: GAME_STATE.turn,
    nation_name: nation.name,
    government: nation.government,
    economy: {
      treasury: nation.economy.treasury,
      income_per_turn: nation.economy.income_per_turn,
      expense_per_turn: nation.economy.expense_per_turn,
      tax_rate: nation.economy.tax_rate,
    },
    population: {
      total: nation.population.total,
      happiness: nation.population.happiness,
    },
    military: {
      infantry: nation.military.infantry,
      cavalry: nation.military.cavalry,
      ships: nation.military.ships,
      mercenaries: nation.military.mercenaries,
      morale: nation.military.morale,
    },
    regions: nation.regions,
    active_laws: (nation.active_laws || []).map(l => l.name),
    relations: nation.relations,
    market_prices: Object.fromEntries(
      Object.entries(GAME_STATE.market).map(([g, m]) => [g, m.price])
    ),
  };

  const prompt = PROMPTS.parseCommand(playerInput, stateSlice);

  const rawResponse = await callClaude(prompt.system, prompt.user, 800, CONFIG.MODEL_HAIKU);
  const parsed = parseAIResponse(rawResponse);

  if (!validateCommandParse(parsed)) {
    throw new Error('AI вернул неверную структуру команды');
  }

  return parsed;
}

// ──────────────────────────────────────────────────────────────
// 2. РЕАКЦИЯ ПЕРСОНАЖЕЙ НА ДЕЙСТВИЕ
// ──────────────────────────────────────────────────────────────

async function getCharacterReactions(action, characters, politicalContext) {
  const results = [];

  // Реакции персонажей параллельно (но не больше 3 одновременно)
  const activeChars = characters.filter(c => c.alive && c.role !== 'merchant').slice(0, 5);

  for (const char of activeChars) {
    // Оцениваем личные последствия для персонажа
    const personalImpact = calculatePersonalImpact(char, action);

    const prompt = PROMPTS.characterReaction(action, char, personalImpact, politicalContext);

    try {
      const rawResponse = await callClaude(prompt.system, prompt.user, 400, CONFIG.MODEL_HAIKU);
      const parsed = parseAIResponse(rawResponse);

      if (validateCharacterReaction(parsed)) {
        results.push({ character: char, reaction: parsed });

        // Обновляем лояльность персонажа
        if (parsed.loyalty_delta !== 0) {
          char.traits.loyalty = Math.max(0, Math.min(100,
            char.traits.loyalty + parsed.loyalty_delta
          ));
          char.history.push({
            turn: GAME_STATE.turn,
            event: `Реакция на действие: лояльность ${parsed.loyalty_delta > 0 ? '+' : ''}${parsed.loyalty_delta}`,
          });
        }
      }
    } catch (err) {
      // При ошибке — детерминированная реакция
      console.warn(`Реакция ${char.name} — fallback:`, err.message);
      results.push({
        character: char,
        reaction: {
          position: char.traits.loyalty > 60 ? 'for' : 'against',
          speech: char.traits.loyalty > 60 ? 'Поддерживаю волю господина.' : 'Сомнительное решение.',
          loyalty_delta: 0,
        },
      });
    }
  }

  return results;
}

// Оценка личных последствий для персонажа (детерминированно)
function calculatePersonalImpact(char, action) {
  const impact = {};

  if (action.action_type === 'military' && action.parsed_action?.recruit_infantry) {
    if (char.role === 'general') impact.positive = 'Усиление армии соответствует интересам';
    if (char.role === 'merchant') impact.negative = 'Расходы на армию опустошат казну';
  }

  if (action.action_type === 'economy' && action.parsed_action?.change_tax_rate) {
    const newRate = action.parsed_action.change_tax_rate;
    if (newRate > 0.15) {
      if (char.role === 'merchant') impact.negative = 'Высокие налоги убьют торговлю';
      if (char.resources.gold > 5000) impact.negative = 'Потери богатых больше';
    }
  }

  if (action.action_type === 'law') {
    // Проверяем wants и fears
    const text = (action.parsed_action?.text || '').toLowerCase();
    for (const want of char.wants) {
      if (text.includes(want.replace(/_/g, ' '))) {
        impact.positive = `Закон затрагивает желание: ${want}`;
      }
    }
    for (const fear of char.fears) {
      if (text.includes(fear.replace(/_/g, ' '))) {
        impact.negative = `Закон затрагивает страх: ${fear}`;
      }
    }
  }

  return Object.keys(impact).length > 0 ? impact : { neutral: 'Прямых последствий нет' };
}

// ──────────────────────────────────────────────────────────────
// 3. РЕШЕНИЕ AI-НАЦИИ
// ──────────────────────────────────────────────────────────────

async function getAINationDecision(nationId) {
  const nation = GAME_STATE.nations[nationId];

  // Собираем информацию о соседях
  const neighborsSummary = {};
  for (const [otherId, rel] of Object.entries(nation.relations)) {
    const otherNation = GAME_STATE.nations[otherId];
    if (!otherNation) continue;
    neighborsSummary[otherId] = {
      name: otherNation.name,
      relation_score: rel.score,
      at_war: rel.at_war,
      treaties: rel.treaties,
      military_strength: otherNation.military.infantry + otherNation.military.cavalry * 3,
      treasury: otherNation.economy.treasury,
    };
  }

  // Список доступных действий
  const availableActions = buildAvailableActions(nationId, nation);

  const prompt = PROMPTS.nationDecision(nationId, nation, neighborsSummary, availableActions);

  const rawResponse = await callClaude(prompt.system, prompt.user, 300, CONFIG.MODEL_SONNET);
  const decision = parseAIResponse(rawResponse);

  if (validateNationDecision(decision)) {
    applyNationDecision(nationId, decision);
  }
}

function buildAvailableActions(nationId, nation) {
  const actions = [];

  // Всегда доступно
  actions.push({ action: 'wait', description: 'Ничего не делать, накапливать ресурсы' });
  actions.push({ action: 'fortify', description: 'Укрепить позиции, поднять мораль армии' });

  if (nation.economy.treasury > 1000) {
    actions.push({ action: 'recruit', description: 'Набрать солдат (стоит 5 монет/солдат)' });
  }

  // Дипломатия с доступными нациями
  for (const [otherId, rel] of Object.entries(nation.relations)) {
    if (rel.score > -20 && !rel.at_war) {
      actions.push({
        action: 'trade',
        target: otherId,
        description: `Предложить торговый договор ${GAME_STATE.nations[otherId]?.name}`,
      });
    }
    if (rel.score > 30) {
      actions.push({
        action: 'diplomacy',
        target: otherId,
        description: `Укрепить отношения с ${GAME_STATE.nations[otherId]?.name}`,
      });
    }
  }

  return actions;
}

// ──────────────────────────────────────────────────────────────
// 4. ГЕНЕРАЦИЯ ПЕРСОНАЖЕЙ
// ──────────────────────────────────────────────────────────────

async function generateCharactersForNation(nationId, count = 7) {
  const nation = GAME_STATE.nations[nationId];
  const existing = nation.characters || [];

  const prompt = PROMPTS.generateCharacters(count, nationId, nation, existing);

  addEventLog('Генерирую персонажей двора через Claude...', 'ai');

  const rawResponse = await callClaude(prompt.system, prompt.user, 2500, CONFIG.MODEL_HAIKU);
  const characters = parseAIResponse(rawResponse);
  const validated = validateCharacters(characters);

  if (validated.length === 0) {
    throw new Error('AI не вернул персонажей');
  }

  // Добавляем к существующим
  nation.characters = [...existing, ...validated];
  addEventLog(`Сгенерировано ${validated.length} персонажей для ${nation.name}.`, 'character');

  renderRightPanel();
  return validated;
}

// Генерация одного нового персонажа (случайное появление)
async function generateNewCharacter(nationId) {
  const nation = GAME_STATE.nations[nationId];
  const existing = nation.characters || [];

  const prompt = PROMPTS.generateCharacters(1, nationId, nation, existing);

  const rawResponse = await callClaude(prompt.system, prompt.user, 600, CONFIG.MODEL_HAIKU);
  const characters = parseAIResponse(rawResponse);
  const validated = validateCharacters(characters);

  if (validated.length > 0) {
    const newChar = validated[0];
    nation.characters.push(newChar);
    addEventLog(`При дворе появился новый человек: ${newChar.name} (${getRoleLabel(newChar.role)}).`, 'character');
    renderRightPanel();
  }
}

// ──────────────────────────────────────────────────────────────
// УТИЛИТА: getRoleLabel (дублируем здесь, т.к. claude.js загружается раньше panels.js)
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// LAZY MATERIALIZATION — оживление сенатора
// ──────────────────────────────────────────────────────────────

// Вызывается ТОЛЬКО из SenateManager.materialize_senator().
// Возвращает { name, traits, biography, portrait, influence }.
async function materializeSenatorViaLLM(senator, context, reason) {
  const { system, user } = PROMPTS.materializeSenator(senator, context, reason);
  const raw = await callClaude(system, user, 250, CONFIG.MODEL_HAIKU);

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('materializeSenator: no JSON in response');

  const data = JSON.parse(match[0]);
  if (!data.name || !Array.isArray(data.traits)) throw new Error('materializeSenator: missing fields');

  data.influence = Math.max(10, Math.min(100, Number(data.influence) || 50));
  return data;
}

// ──────────────────────────────────────────────────────────────
// ПРАВИТЕЛЬСТВО — 3 специализированных вызова
// ──────────────────────────────────────────────────────────────

// 1. ПАРСИНГ ПРОИЗВОЛЬНОГО ОПИСАНИЯ ПРАВИТЕЛЬСТВА
async function parseGovernmentDescription(playerInput) {
  const nation     = GAME_STATE.nations[GAME_STATE.player_nation];
  const gov        = nation.government;
  const charsSummary = (nation.characters ?? [])
    .filter(c => c.alive)
    .map(c => ({ id: c.id, name: c.name, role: c.role, portrait: c.portrait }));

  const { system, user } = PROMPTS.parseGovernment(playerInput, gov, charsSummary);

  let raw;
  try {
    raw = await callClaude(system, user, 1200, CONFIG.MODEL_SONNET);
  } catch (err) {
    console.warn('parseGovernmentDescription API error:', err);
    throw new Error('Не удалось связаться с AI. Проверьте API ключ.');
  }

  // Извлекаем JSON из ответа
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI не вернул корректный JSON');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Ошибка разбора ответа AI');
  }
}

// 2. РЕАКЦИЯ ПЕРСОНАЖЕЙ НА СМЕНУ ФОРМЫ ПРАВЛЕНИЯ
async function getGovernmentChangeReactions(fromType, toType) {
  const nation     = GAME_STATE.nations[GAME_STATE.player_nation];
  const characters = (nation.characters ?? []).filter(c => c.alive);
  if (!characters.length) return [];

  const { system, user } = PROMPTS.governmentChangeReactions(fromType, toType, characters);

  let raw;
  try {
    raw = await callClaude(system, user, 1500, CONFIG.MODEL_HAIKU);
  } catch (err) {
    console.warn('getGovernmentChangeReactions API error:', err);
    // Fallback: детерминированные реакции
    return characters.map(c => ({
      character_id: c.id,
      reaction: c.traits.loyalty > 60 ? 'support' : c.traits.ambition > 70 ? 'oppose' : 'neutral',
      reason: 'Персонаж оценивает изменения исходя из личных интересов.',
      action: 'Наблюдает за ситуацией.',
      loyalty_delta: c.traits.loyalty > 60 ? 2 : -3,
    }));
  }

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const reactions = JSON.parse(jsonMatch[0]);
    // Применяем loyalty_delta
    for (const r of reactions) {
      const char = characters.find(c => c.id === r.character_id);
      if (char && typeof r.loyalty_delta === 'number') {
        char.traits.loyalty = Math.max(0, Math.min(100, char.traits.loyalty + r.loyalty_delta));
        if (!char.history) char.history = [];
        char.history.push({ turn: GAME_STATE.turn, event: `Реакция на смену правления: ${r.reaction}. "${r.reason}"` });
      }
    }
    return reactions;
  } catch {
    return [];
  }
}

// 3. ГОЛОСОВАНИЕ В КОЛЛЕГИАЛЬНОМ ОРГАНЕ (Claude пишет речи)
async function simulateInstitutionVote(proposalText, institutionId, calculatedEffects) {
  const nation = GAME_STATE.nations[GAME_STATE.player_nation];
  const gov    = nation.government;
  const inst   = (gov.institutions ?? []).find(i => i.id === institutionId);
  if (!inst) return null;

  // Код считает голоса детерминированно
  const voteResult = calculateInstitutionVote(inst, nation);

  const members = (nation.characters ?? [])
    .filter(c => c.alive)
    .map(c => ({ id: c.id, name: c.name, traits: c.traits, wants: c.wants, fears: c.fears }));

  const { system, user } = PROMPTS.institutionVote(proposalText, inst, members, calculatedEffects, voteResult);

  let raw;
  try {
    raw = await callClaude(system, user, 1000, CONFIG.MODEL_SONNET);
  } catch (err) {
    console.warn('simulateInstitutionVote API error:', err);
    return { ...voteResult, key_speeches: [], amendments_proposed: [], unexpected_events: [] };
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { ...voteResult, key_speeches: [], amendments_proposed: [], unexpected_events: [] };

  try {
    const claudeResult = JSON.parse(jsonMatch[0]);
    // Код'овые голоса — приоритет над Claude для чисел
    return {
      ...voteResult,
      key_speeches:      claudeResult.key_speeches      ?? [],
      amendments_proposed: claudeResult.amendments_proposed ?? [],
      unexpected_events: claudeResult.unexpected_events ?? [],
    };
  } catch {
    return { ...voteResult, key_speeches: [], amendments_proposed: [], unexpected_events: [] };
  }
}
