// ══════════════════════════════════════════════════════════════════════
// DIALOGUE ENGINE — свободное текстовое общение с персонажами
//
// Модели:
//   Sonnet 4.6  — когда игрок активно разговаривает (сессия горячая)
//   Haiku 4.5   — классификация намерений + сжатие памяти
//   Математика  — однозначно распознаваемые паттерны (без LLM вообще)
//
// Три слоя памяти:
//   Hot Memory      — последние 15 реплик текущего диалога (полный текст)
//   Summary Memory  — 1-2 предложения на ход (сжимается Haiku в конце сессии)
//   LTS Tags        — постоянные теги из старых резюме (>20 ходов назад)
// ══════════════════════════════════════════════════════════════════════

const DIALOGUE_ENGINE = (() => {

  // ─────────────────────────────────────────────────────────────
  // КОНСТАНТЫ
  // ─────────────────────────────────────────────────────────────
  const HOT_MEMORY_LIMIT   = 15;   // максимум реплик в горячей памяти (пар player+char)
  const PATIENCE_MAX       = 100;
  const PATIENCE_COST_SPAM = 25;   // штраф за бессмыслицу
  const PATIENCE_REGEN     = 10;   // восстановление за ход без взаимодействия
  const SESSION_TIMEOUT_TURNS = 3; // ходов тишины → сессия считается завершённой

  // charId → { lastTurn: number } — отслеживание активных сессий
  const _sessions = {};

  // ─────────────────────────────────────────────────────────────
  // ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ─────────────────────────────────────────────────────────────

  // Главная функция: игрок отправил text персонажу charId
  async function processPlayerInput(charId, text, nationId) {
    const nId    = nationId ?? GAME_STATE.player_nation;
    const nation = GAME_STATE.nations[nId];
    const char   = (nation?.characters ?? []).find(c => c.id === charId);
    if (!char || !char.alive) return { error: 'Персонаж недоступен.' };

    _ensureDialogue(char);

    // Восстановление терпения если прошли ходы
    _regenPatience(char);

    // Anti-cheese: проверка терпения
    const patienceBlock = _checkPatience(char, text);
    if (patienceBlock) {
      char.traits.loyalty = Math.max(0, char.traits.loyalty - 8);
      return {
        blocked:       true,
        reply:         patienceBlock,
        loyalty_delta: -8,
        patience:      char.dialogue.patience_score,
      };
    }

    // Пометить сессию активной
    _sessions[charId] = { lastTurn: GAME_STATE.turn };

    // 1. Определить намерение (математика → Haiku если неясно)
    const intent = await _detectIntent(text, char, nation);

    // 2. Получить ответ персонажа (Sonnet — сессия горячая)
    const response = await _getCharacterResponse(char, text, intent, nation);

    // 3. Применить игровые эффекты
    const effects = _applyEffects(char, intent, response, nation);

    // 4. Сохранить в горячую память
    _addToHotMemory(char, text, response.reply, intent);

    // Небольшое восстановление терпения за нормальный диалог
    char.dialogue.patience_score = Math.min(PATIENCE_MAX, char.dialogue.patience_score + 5);
    char.dialogue.last_interaction_turn = GAME_STATE.turn;

    return {
      reply:         response.reply,
      intent:        intent.type,
      mood:          response.mood,
      effects,
      patience:      char.dialogue.patience_score,
      loyalty_after: char.traits.loyalty,
    };
  }

  // Сжать горячую память по окончании диалога/хода (вызывается из tick)
  async function compressMemory(charId, nationId) {
    const nId    = nationId ?? GAME_STATE.player_nation;
    const nation = GAME_STATE.nations[nId];
    const char   = (nation?.characters ?? []).find(c => c.id === charId);
    if (!char?.dialogue?.hot_memory?.length) return;

    const hotText = char.dialogue.hot_memory
      .map(m => `${m.role === 'player' ? 'Игрок' : char.name}: ${m.text}`)
      .join('\n');

    let summaryText = `Ход ${GAME_STATE.turn}: диалог из ${Math.ceil(char.dialogue.hot_memory.length / 2)} реплик.`;
    try {
      summaryText = await callClaude(
        'Сожми диалог в 1-2 предложения. Только факты: что предлагал игрок, реакция персонажа, итог. Стиль: летопись. Пиши по-русски.',
        hotText,
        120,
        CONFIG.MODEL_HAIKU
      );
    } catch (_) { /* используем fallback */ }

    char.dialogue.summary_memory.push({ turn: GAME_STATE.turn, text: summaryText });

    // Если резюме > 5 — старые уходят в LTS
    if (char.dialogue.summary_memory.length > 5) {
      const old = char.dialogue.summary_memory.splice(0, char.dialogue.summary_memory.length - 5);
      _promoteToLTS(char, old);
    }

    char.dialogue.hot_memory = [];
  }

  // Ежеходный тик: сжать память тех персонажей, у кого закончилась активная сессия
  async function tick(nationId) {
    const nId    = nationId ?? GAME_STATE.player_nation;
    const nation = GAME_STATE.nations[nId];
    for (const char of (nation?.characters ?? [])) {
      if (!char.alive || !char.dialogue?.hot_memory?.length) continue;
      const lastTurn = char.dialogue.last_interaction_turn ?? 0;
      // Сессия завершена если с последнего взаимодействия прошёл хотя бы 1 ход
      if (GAME_STATE.turn > lastTurn) {
        await compressMemory(char.id, nId);
      }
    }
  }

  // Проверяет, является ли сессия "горячей" (игрок недавно разговаривал)
  function isSessionActive(charId) {
    const s = _sessions[charId];
    if (!s) return false;
    return (GAME_STATE.turn - s.lastTurn) < SESSION_TIMEOUT_TURNS;
  }

  // ─────────────────────────────────────────────────────────────
  // ОПРЕДЕЛЕНИЕ НАМЕРЕНИЙ
  // ─────────────────────────────────────────────────────────────

  async function _detectIntent(text, char, nation) {
    const lower = text.toLowerCase();

    // ПОДКУП — число + денежное слово
    const moneyM = lower.match(/(\d[\d\s]*)\s*(золот|монет|талант|денар|статер)/);
    if (moneyM) {
      const amount = parseInt(moneyM[1].replace(/\s/g, ''));
      return { type: 'bribe', amount, confidence: 0.92 };
    }

    // СОЮЗ
    if (/\b(союз|альянс|объединим(ся)?|вместе|коалиц|блок)\b/.test(lower))
      return { type: 'alliance', confidence: 0.88 };

    // УГРОЗА / ШАНТАЖ
    if (/\b(угрожа|шантаж|иначе|пожалеешь|накажу|арестую|казню|изгоню|пожалей)\b/.test(lower))
      return { type: 'threat', confidence: 0.88 };

    // ЛЕСТЬ
    if (/\b(велик|мудр|достоин|восхища|прослав|уважа|горжусь)\b/.test(lower))
      return { type: 'flatter', confidence: 0.82 };

    // ПРОСЬБА
    if (/\b(прошу|помог|поддерж|голосуй|проголосуй|нужна твоя)\b/.test(lower))
      return { type: 'request', confidence: 0.82 };

    // ИНФОРМАЦИЯ
    if (/\b(расскажи|что знаеш|слышал|говорят|узнать|сообщи)\b/.test(lower))
      return { type: 'info_request', confidence: 0.78 };

    // Неясно — классифицируем через Haiku (дёшево и быстро)
    return _classifyWithHaiku(text, char);
  }

  async function _classifyWithHaiku(text, char) {
    try {
      const raw = await callClaude(
        'Classify player intent in this ancient strategy game conversation. Return ONLY valid JSON, nothing else: {"type":"bribe|alliance|threat|flatter|request|info_request|conversation|insult","confidence":0.5}',
        `Character: ${char.name}\nPlayer says: "${text}"`,
        80,
        CONFIG.MODEL_HAIKU
      );
      const parsed = JSON.parse(raw.trim());
      return { type: parsed.type ?? 'conversation', confidence: parsed.confidence ?? 0.5 };
    } catch (_) {
      return { type: 'conversation', confidence: 0.5 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ОТВЕТ ПЕРСОНАЖА (Sonnet 4.6)
  // ─────────────────────────────────────────────────────────────

  async function _getCharacterResponse(char, playerText, intent, nation) {
    const hotLines = (char.dialogue.hot_memory ?? []).slice(-HOT_MEMORY_LIMIT * 2)
      .map(m => `${m.role === 'player' ? 'Игрок' : char.name}: ${m.text}`)
      .join('\n');

    const summaries = (char.dialogue.summary_memory ?? []).slice(-3).map(s => s.text).join(' | ');
    const lts       = (char.dialogue.lts_tags ?? []).join(', ');
    const tags      = _buildTags(char);
    const roleStr   = _roleLabel(char.role);
    const intentHint = _intentHint(intent, char, nation);

    const systemPrompt = `Ты — ${char.name}, ${roleStr} в Сиракузах, 301 до н.э.
Черты характера: ${tags}.
Лояльность к правителю: ${char.traits.loyalty}/100. Жадность: ${char.traits.greed}/100. Честолюбие: ${char.traits.ambition}/100.
Долгосрочная история с игроком: ${lts || 'нет значимых событий'}.
Резюме предыдущих встреч: ${summaries || 'первая встреча'}.

ПРАВИЛА ОТВЕТА:
- Говори от первого лица, кратко: 2-4 предложения. Античный стиль.
- Не упоминай цифры (loyalty, greed) — только действия и слова.
- Если предложение выгодно — прими с достоинством. Если нет — откажи с характером.
- Верни ТОЛЬКО JSON без markdown: {"reply":"...","mood":"accepting|neutral|suspicious|offended|pleased","loyalty_delta":-20..20,"accept":true}`;

    const userPrompt = `${hotLines ? `ПРЕДЫДУЩИЙ РАЗГОВОР:\n${hotLines}\n\n` : ''}Игрок говорит: "${playerText}"
Оценка намерения: ${intentHint}
Ответь как ${char.name}.`;

    try {
      const raw = await callClaude(systemPrompt, userPrompt, 350, CONFIG.MODEL_SONNET);
      // Извлечь JSON из ответа (Sonnet иногда добавляет текст вокруг)
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (!parsed) throw new Error('no JSON');
      return {
        reply:         String(parsed.reply ?? 'Я обдумаю твои слова.'),
        mood:          parsed.mood  ?? 'neutral',
        loyalty_delta: Math.max(-25, Math.min(25, Number(parsed.loyalty_delta ?? 0))),
        accept:        Boolean(parsed.accept),
      };
    } catch (e) {
      console.warn('[DIALOGUE] Sonnet parse error:', e);
      return { reply: 'Я слышу тебя, консул. Дай мне подумать.', mood: 'neutral', loyalty_delta: 0, accept: false };
    }
  }

  function _intentHint(intent, char, nation) {
    const treasury = nation.economy?.treasury ?? 0;
    switch (intent.type) {
      case 'bribe': {
        const amount = intent.amount ?? 0;
        const greed  = char.traits.greed ?? 50;
        const chance = Math.min(95, Math.round(20 + (amount / 100) * 0.4 + greed * 0.3));
        return `Предлагает взятку ${amount} золота. Жадность персонажа: ${greed}/100. Расчётная вероятность принятия: ${chance}%.`;
      }
      case 'alliance':
        return `Предлагает политический союз. Лояльность: ${char.traits.loyalty}/100. Честолюбие: ${char.traits.ambition}/100.`;
      case 'threat':
        return `Угрожает. Это задевает гордость персонажа (жестокость ${char.traits.cruelty ?? 30}/100).`;
      case 'flatter':
        return `Льстит. Честолюбие ${char.traits.ambition}/100 — ему приятно, но он не наивен.`;
      case 'request':
        return `Просит о поддержке. Лояльность ${char.traits.loyalty}/100 определяет готовность помочь.`;
      case 'info_request':
        return `Хочет информацию. Осторожность ${char.traits.caution ?? 50}/100 влияет на откровенность.`;
      case 'insult':
        return `Оскорбляет или неуважителен. Персонаж должен выразить гнев или холодное презрение.`;
      default:
        return `Ведёт беседу. Отвечай по обстановке.`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ПРИМЕНЕНИЕ ИГРОВЫХ ЭФФЕКТОВ
  // ─────────────────────────────────────────────────────────────

  function _applyEffects(char, intent, response, nation) {
    const effects = [];

    // Изменение лояльности
    if (response.loyalty_delta !== 0) {
      char.traits.loyalty = Math.max(0, Math.min(100, char.traits.loyalty + response.loyalty_delta));
      effects.push({ type: 'loyalty', delta: response.loyalty_delta });
    }

    // Подкуп — снять деньги если принято
    if (intent.type === 'bribe' && response.accept && intent.amount > 0) {
      const cost = Math.min(intent.amount, nation.economy.treasury);
      nation.economy.treasury -= cost;
      if (!char.hidden_interests) char.hidden_interests = [];
      if (!char.hidden_interests.includes('Known_Bribed_By_Player')) {
        char.hidden_interests.push('Known_Bribed_By_Player');
      }
      // Добавляем в историю персонажа
      (char.history ?? (char.history = [])).push({
        turn:  GAME_STATE.turn,
        event: `Принял взятку от правителя (${cost} золота).`,
      });
      effects.push({ type: 'bribe_paid', amount: cost });
    }

    // Угроза → tyranny_points
    if (intent.type === 'threat') {
      const cs = GAME_STATE.nations[GAME_STATE.player_nation]?.constitutional_state;
      if (cs) {
        cs.tyranny_points = Math.min(200, (cs.tyranny_points ?? 0) + 3);
        effects.push({ type: 'tyranny', delta: 3 });
      }
    }

    // Оскорбление → потеря patience + history
    if (intent.type === 'insult') {
      char.dialogue.patience_score = Math.max(0, char.dialogue.patience_score - 20);
      effects.push({ type: 'insult' });
    }

    return effects;
  }

  // ─────────────────────────────────────────────────────────────
  // ГОРЯЧАЯ ПАМЯТЬ
  // ─────────────────────────────────────────────────────────────

  function _addToHotMemory(char, playerText, charReply, intent) {
    const mem = char.dialogue.hot_memory;
    mem.push({ role: 'player',    text: playerText, turn: GAME_STATE.turn, intent: intent.type });
    mem.push({ role: 'character', text: charReply,  turn: GAME_STATE.turn });
    // Ограничиваем объём
    const limit = HOT_MEMORY_LIMIT * 2;
    if (mem.length > limit) mem.splice(0, mem.length - limit);
  }

  // ─────────────────────────────────────────────────────────────
  // LTS — долгосрочное хранилище
  // ─────────────────────────────────────────────────────────────

  function _promoteToLTS(char, oldSummaries) {
    const lts = char.dialogue.lts_tags;

    // Теги по состоянию персонажа
    if (char.hidden_interests?.includes('Known_Bribed_By_Player') && !lts.includes('[Bribed]'))
      lts.push('[Bribed]');
    if (char.traits.loyalty > 70 && !lts.includes('[Old_Friend]'))
      lts.push('[Old_Friend]');
    if (char.traits.loyalty < 20 && !lts.includes('[Known_Enemy]'))
      lts.push('[Known_Enemy]');

    // Тезис из старых резюме (ограничиваем длину LTS до 10 записей)
    const tezis = oldSummaries.map(s => s.text).join('; ');
    lts.push(`[Ход_${GAME_STATE.turn}: ${tezis.slice(0, 120)}]`);
    if (lts.length > 10) lts.splice(0, lts.length - 10);
  }

  // ─────────────────────────────────────────────────────────────
  // ANTI-CHEESE: PATIENCE
  // ─────────────────────────────────────────────────────────────

  function _regenPatience(char) {
    const turnsSince = GAME_STATE.turn - (char.dialogue.last_interaction_turn ?? 0);
    if (turnsSince > 0) {
      char.dialogue.patience_score = Math.min(
        PATIENCE_MAX,
        char.dialogue.patience_score + turnsSince * PATIENCE_REGEN
      );
    }
  }

  function _checkPatience(char, text) {
    const d   = char.dialogue;
    const mem = d.hot_memory;

    // Текст слишком короткий, только цифры/знаки или повтор последней реплики
    const lastPlayerLine = mem.filter(m => m.role === 'player').slice(-1)[0]?.text ?? '';
    const isNonsense = text.trim().length < 3
      || /^[\d\s!?.,;]+$/.test(text.trim())
      || text.trim().toLowerCase() === lastPlayerLine.toLowerCase();

    if (isNonsense) {
      d.patience_score = Math.max(0, d.patience_score - PATIENCE_COST_SPAM);
    }

    if (d.patience_score <= 0) {
      return `${char.name} холодно поворачивается спиной: «Ты злоупотребляешь моим временем, консул. Разговор окончен.»`;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // ВСПОМОГАТЕЛЬНЫЕ
  // ─────────────────────────────────────────────────────────────

  function _ensureDialogue(char) {
    if (!char.dialogue) {
      char.dialogue = {
        hot_memory:            [],
        summary_memory:        [],
        lts_tags:              [],
        patience_score:        PATIENCE_MAX,
        last_interaction_turn: 0,
      };
    }
  }

  function _buildTags(char) {
    return [
      ...(char.hidden_interests ?? []),
      char.traits.greed    > 70 ? '[Greedy]'    : '',
      char.traits.loyalty  > 70 ? '[Honorable]' : '',
      char.traits.ambition > 70 ? '[Ambitious]' : '',
      char.traits.cruelty  > 60 ? '[Ruthless]'  : '',
      char.traits.caution  > 70 ? '[Cautious]'  : '',
      char.traits.piety    > 70 ? '[Pious]'     : '',
      ...(char.dialogue?.lts_tags ?? []),
    ].filter(Boolean).join(', ') || 'нет особых черт';
  }

  function _roleLabel(role) {
    return { senator:'сенатор', advisor:'советник', general:'стратег',
             priest:'жрец', merchant:'купец' }[role] ?? 'советник';
  }

  // ─────────────────────────────────────────────────────────────
  // ЭКСПОРТ
  // ─────────────────────────────────────────────────────────────
  return { processPlayerInput, compressMemory, tick, isSessionActive };

})();
