// Шаблоны промптов для разных ситуаций

const PROMPTS = {

  // ──────────────────────────────────────────────────────────
  // 1. ПАРСИНГ КОМАНДЫ ИГРОКА
  // ──────────────────────────────────────────────────────────
  parseCommand: (playerInput, gameStateSlice) => ({
    system: `Ты — парсер игровых команд исторической стратегии 301 BC.
Получаешь свободный текст от игрока и возвращаешь ТОЛЬКО JSON.
Никакого текста кроме JSON. Никаких пояснений. Никакого markdown.

ТИПЫ ДЕЙСТВИЙ:
- law: предложить/принять закон
- military: набор войск, рекрутинг, военные операции
- diplomacy: переговоры, дары, союзы, объявление войны
- economy: изменение налогов, торговля, покупка товаров
- character: действия с персонажами (подарки, назначения, ссылка)
- build: строительство в регионе

СХЕМА ОТВЕТА (строго JSON):
{
  "action_type": "law|military|diplomacy|economy|character|build",
  "parsed_action": {
    // для military: {"recruit_infantry": true, "amount": 500}
    // или:          {"recruit_ships": true, "amount": 10}
    // для economy:  {"change_tax_rate": 0.15}
    // или:          {"buy_good": "wheat", "amount": 5000}
    // для diplomacy:{"target_nation": "egypt", "send_gift": true, "gold_amount": 500}
    // или:          {"target_nation": "carthage", "propose_trade": true}
    // для law:      {"name": "...", "text": "...", "law_type": "military|economic|social", "effects": {}}
    // для build:    {"region": "leontini", "building": "granary"}
    // для character:{"target_character": "CHAR_0001", "give_gift": true, "gold_amount": 300}
  },
  "requires_vote": true,
  "estimated_effects": {
    // dotted paths относительно nations.{player_nation}: "economy.treasury": -500
    // числовые изменения
  },
  "radicalism_score": 0
}`,

    user: `КОМАНДА ИГРОКА: "${playerInput}"

ТЕКУЩЕЕ СОСТОЯНИЕ:
${JSON.stringify(gameStateSlice, null, 2)}

Верни JSON разбора этой команды.`,
  }),

  // ──────────────────────────────────────────────────────────
  // 2. РЕАКЦИЯ ПЕРСОНАЖА
  // ──────────────────────────────────────────────────────────
  characterReaction: (action, character, personalImpact, politicalContext) => ({
    system: `Ты — симулятор политических персонажей античного мира, 301 BC.
Отвечай ТОЛЬКО JSON. Без текста вне JSON. Без markdown.
Каждый персонаж говорит своим голосом — исходя из своих traits, wants и fears.
Речи краткие — 1-3 предложения в стиле эпохи.`,

    user: `ДЕЙСТВИЕ ИГРОКА: ${JSON.stringify(action)}

ПЕРСОНАЖ:
${JSON.stringify(character, null, 2)}

ЛИЧНЫЕ ПОСЛЕДСТВИЯ ДЛЯ НЕЁ/НЕГО:
${JSON.stringify(personalImpact, null, 2)}

ПОЛИТИЧЕСКАЯ ОБСТАНОВКА:
${JSON.stringify(politicalContext, null, 2)}

Верни JSON:
{
  "position": "strongly_for|for|neutral|against|strongly_against",
  "speech": "что говорит персонаж (1-3 предложения, от первого лица, стиль античности)",
  "proposed_amendment": null,
  "hidden_motive": "что думает на самом деле (1 предложение)",
  "loyalty_delta": -10
}`,
  }),

  // ──────────────────────────────────────────────────────────
  // 3. РЕШЕНИЕ AI-НАЦИИ
  // ──────────────────────────────────────────────────────────
  nationDecision: (nationId, nationState, neighborsSummary, availableActions) => ({
    system: `Ты — правитель ${nationState.name} в 301 BC.
Принимаешь решение исходя из интересов своего государства.
Отвечай ТОЛЬКО JSON. Никакого текста кроме JSON.
Личность правителя: ${nationState.ai_personality || 'нейтральный'}.
Приоритет: ${nationState.ai_priority || 'выживание'}.`,

    user: `ТВОЁ ГОСУДАРСТВО:
${JSON.stringify(nationState, null, 2)}

СОСЕДИ И ОБСТАНОВКА:
${JSON.stringify(neighborsSummary, null, 2)}

ДОСТУПНЫЕ ДЕЙСТВИЯ:
${JSON.stringify(availableActions, null, 2)}

Выбери одно действие и верни JSON:
{
  "action": "trade|build|recruit|diplomacy|attack|fortify|wait",
  "target": "кому/куда (id нации или региона)",
  "reasoning": "почему (1 предложение)",
  "secondary_action": null
}`,
  }),

  // ──────────────────────────────────────────────────────────
  // 4. ГЕНЕРАЦИЯ ПЕРСОНАЖЕЙ
  // ──────────────────────────────────────────────────────────
  generateCharacters: (count, nationId, nationState, existingCharacters) => ({
    system: `Ты — генератор исторических персонажей для стратегической игры 301 BC.
Создаёшь живых, противоречивых людей с реальными мотивами.
Отвечай ТОЛЬКО JSON массивом. Никакого текста кроме JSON.`,

    user: `Сгенерируй ${count} персонажей для ${nationState.name}.
Тип правления: ${nationState.government.type}.
Правитель: ${nationState.government.ruler}.

ИСТОРИЧЕСКИЙ КОНТЕКСТ (301 BC, Сиракузы):
Агафокл — бывший гончар, захвативший власть. Старая знать его ненавидит.
Только что закончилась война с Карфагеном в Африке (Агафокл первым перенёс войну на вражескую территорию).
Город ещё не оправился от осады. Напряжение между новыми людьми и аристократией высоко.

СОЦИАЛЬНЫЙ СОСТАВ (строго соблюдай):
- 2 аристократа: старые роды, земля, недовольны тираном
- 2 торговца: порт, зерно, металл — хотят мира для торговли
- 2 военных: ветераны или офицеры, разные взгляды на тирана
- 1 жрец или философ: духовный авторитет

УЖЕ СУЩЕСТВУЮЩИЕ ПЕРСОНАЖИ (избегай дублирования имён):
${existingCharacters.map(c => c.name).join(', ')}

Каждый персонаж должен иметь:
- уникальное греческое имя и происхождение (city of origin)
- traits: 6 параметров 0-100
- 2-3 wants (конкретных желания в данный момент, snake_case)
- 1-2 fears (snake_case)
- resources: gold (500-15000), land (0-10), followers (20-500), army_command (0)
- relations: пустой объект {}
- history: [{"turn": 0, "event": "краткая биография в 1 предложении"}]
- portrait: один эмодзи
- description: 1-2 предложения о персонаже

СХЕМА (строго):
[
  {
    "id": "CHAR_XXXX (уникальный 4-значный номер)",
    "name": "Имя Происхождение",
    "age": 25-70,
    "role": "senator|advisor|general|priest|merchant",
    "nation": "${nationId}",
    "alive": true,
    "health": 60-95,
    "traits": { "ambition": 0-100, "caution": 0-100, "loyalty": 0-100, "piety": 0-100, "cruelty": 0-100, "greed": 0-100 },
    "wants": ["snake_case"],
    "fears": ["snake_case"],
    "resources": { "gold": 0, "land": 0, "followers": 0, "army_command": 0 },
    "relations": {},
    "history": [{"turn": 0, "event": "биография"}],
    "portrait": "эмодзи",
    "description": "описание"
  }
]`,
  }),

  // ──────────────────────────────────────────────────────────
  // 5. ПРАВИТЕЛЬСТВО — ПАРСИНГ ОПИСАНИЯ
  // ──────────────────────────────────────────────────────────
  parseGovernment: (playerInput, currentGov, charsSummary) => ({
    system: `Ты — парсер системы правления для исторической стратегии 301 BC.
Получаешь описание изменений в правительстве и возвращаешь ТОЛЬКО JSON дельту изменений.
Никакого текста кроме JSON. Никаких пояснений. Никакого markdown.

ТЕКУЩИЕ ТИПЫ ПРАВЛЕНИЯ: republic, monarchy, tyranny, oligarchy, tribal, theocracy, custom
РЕСУРСЫ ВЛАСТИ: fear, legitimacy, prestige, divine_mandate, wealth, military_loyalty
МЕТОДЫ РЕШЕНИЙ: majority_vote, unanimous, weighted_by_wealth, single_person, lottery

СХЕМА ДЕЛЬТЫ (возвращай только изменяемые поля):
{
  "type": "republic|monarchy|tyranny|...",
  "custom_name": "название если custom",
  "legitimacy": 0-100,
  "stability": 0-100,
  "ruler": {
    "type": "person|council|deity_proxy",
    "name": "имя",
    "character_ids": ["CHAR_XXXX"],
    "personal_power": 0-100
  },
  "power_resource": {
    "type": "fear|legitimacy|prestige|...",
    "current": 0-100
  },
  "institutions": [
    {
      "id": "уникальный_id",
      "name": "название",
      "type": "legislative|executive|military|judicial|religious",
      "decision_method": "majority_vote|...",
      "powers": ["список полномочий"],
      "limitations": ["ограничения"],
      "factions": [
        {"id": "f1", "name": "название", "seats": 100, "wants": ["want1"], "color": "#4CAF50"}
      ]
    }
  ],
  "elections": {
    "enabled": true,
    "frequency_turns": 12,
    "next_election": 8
  },
  "succession": {
    "tracked": true,
    "heir_character_id": null,
    "crisis_if_no_heir": true
  },
  "conspiracies": {
    "base_chance": 0.15,
    "secret_police": {"enabled": false, "cost": 200}
  },
  "custom_mechanics": [
    {"id": "mechanic_id", "name": "название", "description": "описание", "active": true}
  ],
  "_instant_change": false
}`,

    user: `ЗАПРОС ИГРОКА: "${playerInput}"

ТЕКУЩЕЕ ПРАВИТЕЛЬСТВО:
${JSON.stringify(currentGov, null, 2)}

ПЕРСОНАЖИ ДВОРА:
${JSON.stringify(charsSummary, null, 2)}

Верни JSON дельту изменений (только те поля, которые нужно изменить).
Если игрок меняет тип правления — установи _instant_change: false (нужен переходный период).
Если это мелкая реформа — меняй только нужные поля.`,
  }),

  // ──────────────────────────────────────────────────────────
  // 6. ПРАВИТЕЛЬСТВО — РЕАКЦИЯ НА СМЕНУ ФОРМЫ
  // ──────────────────────────────────────────────────────────
  governmentChangeReactions: (fromType, toType, characters) => ({
    system: `Ты — симулятор политических реакций в античном мире 301 BC.
Отвечай ТОЛЬКО JSON массивом. Без текста вне JSON. Без markdown.
Каждый персонаж реагирует исходя из своей роли, traits, wants и fears.
Смена формы правления — политический кризис. Реакции должны быть разнообразными и конфликтными.`,

    user: `Правительство меняется: ${fromType} → ${toType}.

ПЕРСОНАЖИ ДВОРА:
${JSON.stringify(characters.map(c => ({
  id: c.id,
  name: c.name,
  role: c.role,
  traits: c.traits,
  wants: c.wants,
  fears: c.fears,
})), null, 2)}

Верни JSON массив реакций:
[
  {
    "character_id": "CHAR_XXXX",
    "reaction": "support|neutral|oppose|conspire",
    "reason": "причина в 1 предложении (от лица персонажа)",
    "action": "что персонаж делает (1 предложение)",
    "loyalty_delta": -10
  }
]`,
  }),

  // ──────────────────────────────────────────────────────────
  // 7. ПРАВИТЕЛЬСТВО — ГОЛОСОВАНИЕ В ИНСТИТУТЕ
  // ──────────────────────────────────────────────────────────
  institutionVote: (proposalText, institution, members, calculatedEffects, voteResult) => ({
    system: `Ты — нарратор политических дебатов в античном мире 301 BC.
Голоса уже посчитаны кодом — ты пишешь только речи и нарратив.
Отвечай ТОЛЬКО JSON. Никаких пояснений.
Речи краткие и в духе античной риторики.`,

    user: `ПРЕДЛОЖЕНИЕ: "${proposalText}"

ИНСТИТУТ: ${institution.name} (${institution.decision_method})

УЧАСТНИКИ:
${JSON.stringify(members, null, 2)}

ЭФФЕКТЫ (если пройдёт):
${JSON.stringify(calculatedEffects, null, 2)}

РЕЗУЛЬТАТ ГОЛОСОВАНИЯ (уже посчитан):
${JSON.stringify(voteResult, null, 2)}

Напиши нарратив голосования. Верни JSON:
{
  "key_speeches": [
    {
      "character_id": "CHAR_XXXX",
      "character_name": "имя",
      "position": "for|against",
      "speech": "речь персонажа (1-3 предложения, античный стиль)"
    }
  ],
  "amendments_proposed": [
    "текст поправки (если кто-то предлагал)"
  ],
  "unexpected_events": [
    "драматическое событие во время голосования (если уместно)"
  ]
}`,
  }),

  // ──────────────────────────────────────────────────────────
  // 8. ГЕНЕРАЦИЯ СЛУЧАЙНОГО СОБЫТИЯ (расширенная версия)
  // ──────────────────────────────────────────────────────────
  generateEvent: (gameStateSlice, recentHistory) => ({
    system: `Ты — генератор исторических событий для стратегии 301 BC.
Создаёшь правдоподобные события исходя из текущей обстановки.
Отвечай ТОЛЬКО JSON.`,

    user: `ТЕКУЩАЯ ОБСТАНОВКА:
${JSON.stringify(gameStateSlice, null, 2)}

ПОСЛЕДНИЕ СОБЫТИЯ:
${recentHistory.slice(0, 5).map(e => e.message).join('\n')}

Создай одно исторически правдоподобное событие.
{
  "title": "Название события",
  "description": "Описание (2-3 предложения)",
  "type": "diplomacy|economy|military|character|natural|political",
  "effects": {
    "path.to.change": число_изменения
  },
  "requires_player_choice": false,
  "choices": null
}`,
  }),

  // ──────────────────────────────────────────────────────────
  // LAZY MATERIALIZATION — оживление сенатора
  // Вызывается только при 3 триггерах (player_click / rising_star / rotation).
  // Передаём минимальный контекст: faction, два числа, настроение сената,
  // теги трёх самых влиятельных сенаторов.
  // ──────────────────────────────────────────────────────────
  materializeSenator: (senator, context, reason) => ({
    system: `Ты — генератор сенаторов для исторической игры 301 BC, Сиракузы.
Создай личность одним кратким JSON-объектом.
Отвечай ТОЛЬКО JSON. Без текста вне JSON. Без markdown.`,

    user: `ПАРАМЕТРЫ СЕНАТОРА:
Фракция: ${context.faction_name}
Лояльность: ${context.loyalty_score}/100
Честолюбие: ${context.ambition_level}/5
Причина появления: ${
  reason === 'rising_star' ? 'совершил политическое действие — восходящая звезда'
  : reason === 'rotation'  ? 'попал в городские новости — ротация'
  : 'игрок изучил его — прямой клик'}

НАСТРОЕНИЕ СЕНАТА: "${context.global_senate_state}"
${context.top_speakers_tags.length
  ? `ИЗВЕСТНЫЕ СЕНАТОРЫ (для связности): ${context.top_speakers_tags.join('; ')}`
  : ''}

Верни JSON:
{
  "name":      "Греческое имя + происхождение (2–3 слова)",
  "traits":    ["Тег1", "Тег2", "Тег3"],
  "biography": "одно предложение — кто он и что хочет",
  "portrait":  "один эмодзи",
  "influence": 10
}

Правила:
- traits: 3–5 коротких русских тега (Жадный / Оратор / Патриций / Ветеран / Честолюбец / Народник / Лоялист / Оппозиционер / Осторожный / Фанатик)
- influence: loyalty_score + ambition_level×5 ± небольшой разброс (10–100)
- имя должно звучать по-гречески и подходить к эпохе`,
  }),
};
