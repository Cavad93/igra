// Главный игровой цикл — один ход = один месяц

let IS_PROCESSING_TURN = false;

// Названия месяцев в греческой традиции
const MONTH_NAMES = [
  '', // индекс 0 не используется
  'Гекатомбеон', 'Метагейтнион', 'Боэдромион',
  'Пианепсион',  'Мемактерион',  'Посидеон',
  'Гамелион',    'Антестерион',  'Элафеболион',
  'Мунихион',    'Таргелион',    'Скирофорион',
];

// ──────────────────────────────────────────────────────────────
// ГЛАВНАЯ ФУНКЦИЯ ХОДА
// ──────────────────────────────────────────────────────────────

async function processTurn() {
  if (IS_PROCESSING_TURN) return;
  IS_PROCESSING_TURN = true;

  const btn = document.getElementById('end-turn-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Ход идёт...';
  }

  try {
    const date = GAME_STATE.date;
    addEventLog(`── Ход ${GAME_STATE.turn}: ${MONTH_NAMES[date.month]} ${Math.abs(date.year)} г. до н.э. ──`, 'turn');

    // 1. Экономика (детерминировано)
    runEconomyTick();

    // 2. Население (детерминировано)
    updatePopulationGrowth();
    updateHappiness();

    // 3. Персонажи — старение (детерминировано)
    agingCharacters();
    checkCharacterDeaths();
    maybeSpawnCharacter();

    // 4. AI нации — решения (Claude, параллельно)
    await processAINations();

    // 5. Случайные события (10% шанс)
    if (Math.random() < CONFIG.RANDOM_EVENT_CHANCE) {
      triggerRandomEvent();
    }

    // 6. Обновляем дату
    advanceDate();

    // 7. Автосохранение
    saveGame();

    // 8. Обновляем весь UI
    renderAll();

  } catch (err) {
    console.error('Ошибка в processTurn:', err);
    addEventLog('Ошибка при обработке хода. Проверьте консоль.', 'danger');
  } finally {
    IS_PROCESSING_TURN = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚔ Следующий ход';
    }
  }
}

// ──────────────────────────────────────────────────────────────
// ДАТА
// ──────────────────────────────────────────────────────────────

function advanceDate() {
  GAME_STATE.turn++;
  let { year, month } = GAME_STATE.date;
  month++;
  if (month > 12) {
    month = 1;
    year++;
    // Переход до нашей эры: -301 → -300 → ... → 0 → 1 н.э.
    if (year === 0) year = 1;
  }
  GAME_STATE.date = { year, month };
  updateDateDisplay();
}

function formatDate(date) {
  const era = date.year < 0 ? `${Math.abs(date.year)} г. до н.э.` : `${date.year} г. н.э.`;
  return `${MONTH_NAMES[date.month]}, ${era}`;
}

function updateDateDisplay() {
  const el = document.getElementById('game-date');
  if (el) el.textContent = formatDate(GAME_STATE.date);
}

// ──────────────────────────────────────────────────────────────
// ПЕРСОНАЖИ — СТАРЕНИЕ И СМЕРТЬ
// ──────────────────────────────────────────────────────────────

function agingCharacters() {
  // Раз в год (ход 12, 24, ...) стареем персонажей
  if (GAME_STATE.turn % 12 !== 0) return;

  for (const [nationId, nation] of Object.entries(GAME_STATE.nations)) {
    for (const char of (nation.characters || [])) {
      if (!char.alive) continue;
      char.age++;
      // После 55 лет здоровье падает быстрее
      const healthDecline = char.age > 55 ? 8 : 3;
      char.health = Math.max(0, char.health - healthDecline + Math.floor(Math.random() * 5));
    }
  }
}

function checkCharacterDeaths() {
  for (const [nationId, nation] of Object.entries(GAME_STATE.nations)) {
    for (const char of (nation.characters || [])) {
      if (!char.alive) continue;

      // Здоровье < 10 → персонаж умирает
      if (char.health < 10) {
        char.alive = false;
        addEventLog(`${char.name} скончался в возрасте ${char.age} лет.`, 'character');
      }
    }
  }
}

function maybeSpawnCharacter() {
  // Каждые 10 ходов 20% шанс нового персонажа для игрока
  if (GAME_STATE.turn % 10 !== 0) return;
  if (Math.random() > 0.2) return;

  const playerNation = GAME_STATE.nations[GAME_STATE.player_nation];
  const currentChars = (playerNation.characters || []).filter(c => c.alive).length;

  // Не больше 12 активных персонажей
  if (currentChars >= 12) return;

  // Запрашиваем генерацию нового персонажа через Claude (асинхронно)
  generateNewCharacter(GAME_STATE.player_nation).catch(console.error);
}

// ──────────────────────────────────────────────────────────────
// AI НАЦИИ — РЕШЕНИЯ
// ──────────────────────────────────────────────────────────────

async function processAINations() {
  const promises = [];

  for (const [nationId, nation] of Object.entries(GAME_STATE.nations)) {
    // Пропускаем игрока и малые нации без AI
    if (nation.is_player) continue;
    if (nation.is_minor) continue;

    // Каждые 3 хода AI нации принимают решение
    if (GAME_STATE.turn % 3 === 0) {
      promises.push(
        getAINationDecision(nationId).catch(err => {
          // При ошибке — детерминированное fallback решение
          console.warn(`AI fallback для ${nationId}:`, err.message);
          applyFallbackDecision(nationId);
        })
      );
    }
  }

  // Ждём все AI решения параллельно
  await Promise.all(promises);
}

// Детерминированное решение при недоступности AI
function applyFallbackDecision(nationId) {
  const nation = GAME_STATE.nations[nationId];
  const treasury = nation.economy.treasury;
  const military = nation.military;

  if (treasury > 5000 && nation.ai_priority === 'military') {
    // Рекрутируем пехоту
    const newInfantry = military.infantry + Math.floor(treasury * 0.01);
    const cost = Math.floor(treasury * 0.01) * 5;
    applyDelta(`nations.${nationId}.military.infantry`, newInfantry);
    applyDelta(`nations.${nationId}.economy.treasury`, treasury - cost);
  } else if (treasury > 3000) {
    // Накапливаем запасы (пассивное действие)
    // Просто ничего не делаем — экономика уже посчитана
  }
}

// ──────────────────────────────────────────────────────────────
// СЛУЧАЙНЫЕ СОБЫТИЯ
// ──────────────────────────────────────────────────────────────

const RANDOM_EVENTS = [
  {
    id: 'PLAGUE',
    name: 'Чума',
    description: 'Болезнь охватила город. Население сокращается.',
    probability: 0.15,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      const deaths = Math.floor(nation.population.total * 0.02);
      applyDelta(`nations.${nationId}.population.total`, nation.population.total - deaths);
      applyDelta(`nations.${nationId}.population.happiness`, Math.max(0, nation.population.happiness - 10));
      addEventLog(`${nation.name}: Чума унесла ${deaths} жизней!`, 'danger');
    },
  },
  {
    id: 'GOOD_HARVEST',
    name: 'Богатый урожай',
    description: 'Небывалый урожай. Запасы зерна пополнены.',
    probability: 0.25,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      const bonus = Math.floor(nation.population.total * 0.5);
      nation.economy.stockpile.wheat = (nation.economy.stockpile.wheat || 0) + bonus;
      applyDelta(`nations.${nationId}.population.happiness`, Math.min(100, nation.population.happiness + 5));
      addEventLog(`${nation.name}: Богатый урожай! +${bonus} бушелей пшеницы.`, 'good');
    },
  },
  {
    id: 'PIRATE_RAID',
    name: 'Пиратский набег',
    description: 'Пираты атаковали торговые суда.',
    probability: 0.20,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      const loss = Math.floor(nation.economy.treasury * 0.05);
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury - loss);
      addEventLog(`${nation.name}: Пираты разграбили торговые суда! Потеряно ${loss} монет.`, 'warning');
    },
  },
  {
    id: 'MERCHANT_WINDFALL',
    name: 'Удачная сделка',
    description: 'Купцы заключили выгодный торговый договор.',
    probability: 0.25,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      const gain = Math.floor(nation.economy.treasury * 0.08 + 200);
      applyDelta(`nations.${nationId}.economy.treasury`, nation.economy.treasury + gain);
      addEventLog(`${nation.name}: Удачная торговая сделка! +${gain} монет в казну.`, 'good');
    },
  },
  {
    id: 'EARTHQUAKE',
    name: 'Землетрясение',
    description: 'Землетрясение разрушило часть построек.',
    probability: 0.05,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      if (nation.regions.length > 0) {
        const regionId = nation.regions[Math.floor(Math.random() * nation.regions.length)];
        const region = GAME_STATE.regions[regionId];
        if (region && region.buildings && region.buildings.length > 0) {
          const removed = region.buildings.splice(0, 1)[0];
          addEventLog(`${nation.name}: Землетрясение разрушило ${removed} в ${MAP_REGIONS[regionId]?.name || regionId}!`, 'danger');
        }
      }
      applyDelta(`nations.${nationId}.population.happiness`, Math.max(0, nation.population.happiness - 8));
    },
  },
  {
    id: 'ARMY_DESERTION',
    name: 'Дезертирство',
    description: 'Часть наёмников покинула армию.',
    probability: 0.10,
    effect: (nationId) => {
      const nation = GAME_STATE.nations[nationId];
      if (nation.military.mercenaries > 0) {
        const deserters = Math.floor(nation.military.mercenaries * 0.15);
        applyDelta(`nations.${nationId}.military.mercenaries`, nation.military.mercenaries - deserters);
        addEventLog(`${nation.name}: ${deserters} наёмников дезертировали!`, 'warning');
      }
    },
  },
];

function triggerRandomEvent() {
  // Событие случается с игроком или с одной из AI наций
  const allNations = Object.keys(GAME_STATE.nations);
  const targetNationId = allNations[Math.floor(Math.random() * allNations.length)];

  // Выбираем событие по вероятности
  const totalWeight = RANDOM_EVENTS.reduce((sum, e) => sum + e.probability, 0);
  let rand = Math.random() * totalWeight;

  for (const event of RANDOM_EVENTS) {
    rand -= event.probability;
    if (rand <= 0) {
      event.effect(targetNationId);
      return;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// СОХРАНЕНИЕ / ЗАГРУЗКА
// ──────────────────────────────────────────────────────────────

function saveGame() {
  try {
    const saveData = JSON.stringify(GAME_STATE);
    localStorage.setItem(CONFIG.SAVE_KEY, saveData);
  } catch (e) {
    console.warn('Не удалось сохранить игру:', e);
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem(CONFIG.SAVE_KEY);
    if (saved) {
      const loadedState = JSON.parse(saved);
      // Переносим данные в GAME_STATE
      Object.assign(GAME_STATE, loadedState);
      addEventLog('Игра загружена из сохранения.', 'info');
      return true;
    }
  } catch (e) {
    console.warn('Не удалось загрузить игру:', e);
  }
  return false;
}

// ──────────────────────────────────────────────────────────────
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ──────────────────────────────────────────────────────────────

function initGame() {
  // Инициализируем GAME_STATE из стартовых данных
  Object.assign(GAME_STATE, JSON.parse(JSON.stringify(INITIAL_GAME_STATE)));

  // Загружаем персонажей для игрока
  GAME_STATE.nations.syracuse.characters = JSON.parse(
    JSON.stringify(INITIAL_CHARACTERS_SYRACUSE)
  );

  // Попытка загрузки сохранения
  const hasSave = loadGame();

  // Первоначальный рендер
  renderAll();

  if (!hasSave) {
    addEventLog('Начало игры. 301 год до н.э. Вы — тиран Сиракуз Агафокл.', 'info');
    addEventLog('Карфаген угрожает с запада. Рим растёт на севере. Действуйте, стратег.', 'info');
  }

  // Привязываем кнопку конца хода
  const endTurnBtn = document.getElementById('end-turn-btn');
  if (endTurnBtn) {
    endTurnBtn.addEventListener('click', processTurn);
  }
}

// Рендерим всё разом
function renderAll() {
  renderMap();
  renderLeftPanel();
  renderRightPanel();
  updateDateDisplay();
}
