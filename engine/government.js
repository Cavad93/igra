// ══════════════════════════════════════════════════════════════════════
// GOVERNMENT ENGINE — живая система форм правления
// Главный принцип: код считает механику, Claude интерпретирует людей.
// ══════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────────
// ХОД: вызывается из turn.js для всех наций
// ──────────────────────────────────────────────────────────────────────

function processAllGovernmentTicks() {
  for (const nationId of Object.keys(GAME_STATE.nations)) {
    processGovernmentTick(nationId);
  }
}

function processGovernmentTick(nationId) {
  const nation = GAME_STATE.nations[nationId];
  const gov = nation.government;
  if (!gov) return;

  const isPlayer = nationId === GAME_STATE.player_nation;

  // 1. Decay ресурса власти
  if (gov.power_resource) {
    gov.power_resource.current = Math.max(0,
      gov.power_resource.current - (gov.power_resource.decay_per_turn ?? 0.5)
    );
    // Синхронизируем legitimacy с ресурсом власти
    if (['legitimacy', 'divine_mandate'].includes(gov.power_resource.type)) {
      gov.legitimacy = Math.round(gov.power_resource.current);
    }
  }

  // 2. Ограничения по типу правления
  if (gov.type === 'tyranny') {
    gov.legitimacy = Math.min(gov.legitimacy, 40);  // легитимность тирании ≤ 40
    if (gov.power_resource?.type === 'fear') {
      gov.power_resource.current = Math.max(0,
        gov.power_resource.current - (gov.power_resource.decay_per_turn ?? 2)
      );
    }
  }

  // 3. Заговоры (тирания)
  if (gov.conspiracies) {
    // Затраты тайной полиции
    if (gov.conspiracies.secret_police?.enabled) {
      nation.economy.treasury = Math.max(0,
        nation.economy.treasury - gov.conspiracies.secret_police.cost_per_turn
      );
    }
    const chance = calculateConspiracyChance(nation);
    if (Math.random() < chance) {
      triggerConspiracy(nationId);
    }
  }

  // 4. Накопленное недовольство при олигархии (закрытое гражданство)
  if (gov.citizenship?.closed) {
    nation.population.happiness = Math.max(0,
      nation.population.happiness - (gov.citizenship.commoner_resentment_per_turn ?? 1)
    );
  }

  // 5. Обратный отсчёт выборов
  if (gov.elections?.enabled && gov.elections.next_election > 0) {
    gov.elections.next_election--;
    if (gov.elections.next_election === 0) {
      triggerElection(nationId);
      gov.elections.next_election = gov.elections.frequency_turns ?? 12;
    } else if (isPlayer && gov.elections.next_election <= 3) {
      addEventLog(`⚖️ До выборов осталось ${gov.elections.next_election} ход(а).`, 'info');
    }
  }

  // 6. Племя — падение престижа без войны
  if (gov.type === 'tribal' && gov.power_resource?.type === 'prestige') {
    const lastWar = gov._last_war_turn ?? 0;
    if (GAME_STATE.turn - lastWar > 10) {
      gov.power_resource.current = Math.max(0, gov.power_resource.current - 3);
      if (isPlayer && gov.power_resource.current < 30) {
        addEventLog('🏕️ Вождь давно не воевал. Воины начинают сомневаться в его силе.', 'warning');
      }
    }
  }

  // 7. Переход между формами правления
  if (gov.active_transition?.status === 'in_progress') {
    processTransition(nationId);
  }

  // 8. Кастомные механики (trigger: every_turn)
  applyCustomMechanics(nationId, 'every_turn');

  // 9. Распад стабильности при низкой легитимности
  if (gov.legitimacy < 20) {
    gov.stability = Math.max(0, (gov.stability ?? 50) - 2);
    if (isPlayer && GAME_STATE.turn % 3 === 0) {
      addEventLog('⚠️ Легитимность власти опасно мала. Государство шатается.', 'danger');
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// ЗАГОВОРЫ
// ──────────────────────────────────────────────────────────────────────

function calculateConspiracyChance(nation) {
  const gov = nation.government;
  let chance = gov.conspiracies?.base_chance_per_turn ?? 0.15;

  // Высокий страх снижает вероятность заговора
  if (gov.power_resource?.type === 'fear') {
    const fear = gov.power_resource.current ?? 50;
    chance *= Math.max(0.2, 1 - fear / 150);
  }

  // Пустая казна — повышает
  if (nation.economy.treasury < 2000)  chance += 0.08;
  if (nation.economy.treasury < 0)     chance += 0.15;

  // Низкая лояльность армии — повышает
  if (nation.military.loyalty < 40)    chance += 0.10;
  if (nation.military.loyalty < 20)    chance += 0.15;

  // Тайная полиция — снижает
  if (gov.conspiracies?.secret_police?.enabled) {
    chance *= (1 - (gov.conspiracies.secret_police.conspiracy_detection_bonus ?? 0.4));
  }

  return Math.max(0, Math.min(0.85, chance));
}

function triggerConspiracy(nationId) {
  if (nationId !== GAME_STATE.player_nation) return;

  const nation = GAME_STATE.nations[nationId];
  const gov    = nation.government;

  const events = [
    { text: 'Раскрыт заговор аристократов. Несколько семей арестованы.', fear: +12, loyalty: -4 },
    { text: 'Попытка покушения отражена личной гвардией. Убийца схвачен.', fear: +15, loyalty: -8 },
    { text: 'Группа офицеров замышляла переворот. Заговор раскрыт доносчиком.', fear: +10, loyalty: -6 },
    { text: 'Слухи о тайном собрании. Часть советников покинула город.', fear: +6, loyalty: -5 },
    { text: 'Перехвачены письма с призывом к восстанию. Адресаты казнены.', fear: +18, loyalty: -10 },
  ];

  const ev = events[Math.floor(Math.random() * events.length)];
  addEventLog(`🗡️ ${ev.text}`, 'danger');

  // Страх растёт от раскрытого заговора
  if (gov.power_resource?.type === 'fear') {
    gov.power_resource.current = Math.min(100, gov.power_resource.current + ev.fear);
  }

  // Лояльность персонажей падает
  (nation.characters ?? []).forEach(c => {
    if (c.alive && Math.random() < 0.4) {
      c.traits.loyalty = Math.max(0, c.traits.loyalty + ev.loyalty);
      if (!c.history) c.history = [];
      c.history.push({ turn: GAME_STATE.turn, event: 'Заговор при дворе. Настроения ухудшились.' });
    }
  });
}

// ──────────────────────────────────────────────────────────────────────
// ВЫБОРЫ
// ──────────────────────────────────────────────────────────────────────

function triggerElection(nationId) {
  if (nationId !== GAME_STATE.player_nation) return;
  addEventLog('⚖️ Время выборов! Граждане собираются у ростр. Назначьте свою кандидатуру или оставьте всё как есть.', 'info');
}

// ──────────────────────────────────────────────────────────────────────
// ПЕРЕХОД МЕЖДУ ФОРМАМИ
// ──────────────────────────────────────────────────────────────────────

function startGovernmentTransition(nationId, toType, cause) {
  const nation = GAME_STATE.nations[nationId];
  const gov = nation.government;

  gov.active_transition = {
    from: gov.type,
    to: toType,
    status: 'in_progress',
    started_turn: GAME_STATE.turn,
    turns_elapsed: 0,
    cause: cause ?? 'Политическая реформа',
    transition_penalties: { stability: -3, army_loyalty: -2, legitimacy: -2 },
    completion_requires: { legitimacy_of_new_form: 30 },
    opposition: [],
    possible_events: ['military_coup', 'civil_war', 'peaceful_transition', 'compromise_government'],
  };

  if (nationId === GAME_STATE.player_nation) {
    addEventLog(
      `🔄 Начат переход: ${getGovernmentNameFull(gov.type)} → ${getGovernmentNameFull(toType)}. Ожидайте нестабильности.`,
      'warning'
    );
    renderGovernmentOverlay();
  }
}

function processTransition(nationId) {
  const nation = GAME_STATE.nations[nationId];
  const gov    = nation.government;
  const trans  = gov.active_transition;
  if (!trans || trans.status !== 'in_progress') return;

  trans.turns_elapsed = (trans.turns_elapsed ?? 0) + 1;

  // Штрафы переходного периода (каждый ход)
  const pen = trans.transition_penalties ?? {};
  if (pen.stability)    gov.stability    = Math.max(0, (gov.stability ?? 50) + pen.stability);
  if (pen.army_loyalty) nation.military.loyalty = Math.max(0, nation.military.loyalty + pen.army_loyalty);
  if (pen.legitimacy)   gov.legitimacy   = Math.max(0, gov.legitimacy + pen.legitimacy);

  // Случайное событие во время перехода (20% шанс)
  if (Math.random() < 0.20 && nationId === GAME_STATE.player_nation) {
    const evts = [
      'Аристократы требуют замедлить реформы.',
      'Армия сохраняет нейтралитет — пока.',
      'Соседние державы с интересом наблюдают за нестабильностью.',
      'Народ на улицах поддерживает перемены.',
    ];
    addEventLog(`🔄 Переход (ход ${trans.turns_elapsed}): ${evts[Math.floor(Math.random()*evts.length)]}`, 'info');
  }

  // Условие завершения: >= 5 ходов И легитимность достигла порога
  const legOk = gov.legitimacy >= (trans.completion_requires?.legitimacy_of_new_form ?? 30);
  if (trans.turns_elapsed >= 5 && legOk) {
    completeTransition(nationId);
  } else if (trans.turns_elapsed > 18) {
    // Принудительное завершение или кризис
    if (Math.random() < 0.5) {
      completeTransition(nationId);
    } else {
      if (nationId === GAME_STATE.player_nation) {
        addEventLog('⚠️ Затянувшийся переход власти порождает хаос. Государство на грани.', 'danger');
      }
    }
  }
}

function completeTransition(nationId) {
  const nation = GAME_STATE.nations[nationId];
  const gov    = nation.government;
  const trans  = gov.active_transition;
  if (!trans) return;

  const oldType = trans.from;
  const newType = trans.to;

  gov.type = newType;
  trans.status = 'completed';
  gov.active_transition = null;

  if (!gov.transition_history) gov.transition_history = [];
  gov.transition_history.push({
    turn: GAME_STATE.turn,
    from: oldType,
    to: newType,
    cause: trans.cause,
  });

  if (nationId === GAME_STATE.player_nation) {
    addEventLog(
      `✅ Переход завершён. Новая форма: ${getGovernmentNameFull(newType)}. Легитимность стабилизируется.`,
      'positive'
    );
    renderGovernmentOverlay();
  }
}

// ──────────────────────────────────────────────────────────────────────
// ПРИМЕНЕНИЕ DELTA (от Claude)
// ──────────────────────────────────────────────────────────────────────

function applyGovernmentDelta(nationId, delta) {
  const nation = GAME_STATE.nations[nationId];
  const gov    = nation.government;

  const oldType = gov.type;

  // Мета-поля
  if (delta.type        !== undefined) gov.type        = delta.type;
  if (delta.custom_name !== undefined) gov.custom_name = delta.custom_name;
  if (delta.legitimacy  !== undefined) gov.legitimacy  = Math.max(0, Math.min(100, delta.legitimacy));
  if (delta.stability   !== undefined) gov.stability   = Math.max(0, Math.min(100, delta.stability));

  // Правитель
  if (delta.ruler) {
    gov.ruler = Object.assign({}, gov.ruler ?? {}, delta.ruler);
  }

  // Ресурс власти
  if (delta.power_resource) {
    gov.power_resource = Object.assign({}, gov.power_resource ?? {}, delta.power_resource);
    // Синхронизируем current с легитимностью если нет явного значения
    if (delta.power_resource.current === undefined) {
      gov.power_resource.current = gov.legitimacy;
    }
  }

  // Институты — мерж по id
  if (delta.institutions) {
    if (!gov.institutions) gov.institutions = [];
    for (const newInst of delta.institutions) {
      const idx = gov.institutions.findIndex(i => i.id === newInst.id);
      if (idx >= 0) {
        gov.institutions[idx] = Object.assign({}, gov.institutions[idx], newInst);
      } else {
        gov.institutions.push(newInst);
      }
    }
  }

  // Выборы, заговоры, преемственность
  if (delta.elections   !== undefined) gov.elections   = delta.elections;
  if (delta.conspiracies !== undefined) gov.conspiracies = delta.conspiracies;
  if (delta.succession  !== undefined) gov.succession  = delta.succession;

  // Кастомные механики — мерж по id
  if (delta.custom_mechanics) {
    if (!gov.custom_mechanics) gov.custom_mechanics = [];
    for (const mech of delta.custom_mechanics) {
      const idx = gov.custom_mechanics.findIndex(m => m.id === mech.id);
      if (idx >= 0) {
        gov.custom_mechanics[idx] = Object.assign({}, gov.custom_mechanics[idx], mech);
      } else {
        gov.custom_mechanics.push(mech);
      }
    }
  }

  // Если тип изменился — запустить переход (если не указан instant)
  if (delta.type && delta.type !== oldType) {
    if (delta._instant_change) {
      // Моментальная смена (например при захвате власти)
      if (!gov.transition_history) gov.transition_history = [];
      gov.transition_history.push({
        turn: GAME_STATE.turn,
        from: oldType,
        to: delta.type,
        cause: delta._transition_cause ?? 'Политическое изменение',
      });
      if (nationId === GAME_STATE.player_nation) {
        addEventLog(`⚡ Смена формы правления: ${getGovernmentNameFull(delta.type)}`, 'warning');
      }
    } else {
      // Постепенный переход
      gov.type = oldType; // Откатываем — переход ещё не завершён
      startGovernmentTransition(nationId, delta.type, delta._transition_cause ?? 'Реформа правительства');
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// КАСТОМНЫЕ МЕХАНИКИ
// ──────────────────────────────────────────────────────────────────────

function applyCustomMechanics(nationId, trigger) {
  const nation = GAME_STATE.nations[nationId];
  const gov    = nation.government;
  if (!gov.custom_mechanics?.length) return;

  for (const mech of gov.custom_mechanics) {
    if (mech.trigger !== trigger) continue;

    switch (mech.effect) {
      case 'redirect_010_income_to_temple':
        // 10% дохода уходит в храм
        nation.economy.treasury -= nation.economy.income_per_turn * 0.10;
        break;
      case 'require_oracle_roll':
        // Обрабатывается при объявлении войны
        break;
      case 'double_legitimacy_decay':
        gov.legitimacy = Math.max(0, gov.legitimacy - 1);
        break;
      case 'feast_bonus_morale':
        // Пиры повышают мораль армии
        if (nation.economy.treasury > 5000) {
          nation.military.morale = Math.min(100, nation.military.morale + 1);
        }
        break;
      // Неизвестные эффекты игнорируются — система не ломается
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// ГОЛОСОВАНИЕ В ИНСТИТУТЕ
// Код считает математику, Claude пишет речи (в claude.js)
// ──────────────────────────────────────────────────────────────────────

function calculateInstitutionVote(institution, nation) {
  if (!institution) return { for: 0, against: 0, abstain: 0, passed: false };

  const method = institution.decision_method ?? 'majority_vote';
  const characters = (nation.characters ?? []).filter(c => c.alive);

  if (method === 'single_person') {
    return { for: 1, against: 0, abstain: 0, passed: true };
  }

  let votesFor = 0, votesAgainst = 0, votesAbstain = 0;

  if (method === 'majority_vote' || method === 'weighted_by_wealth') {
    // Используем фракции если есть
    if (institution.factions?.length) {
      for (const faction of institution.factions) {
        const avgLoyalty = characters.reduce((s, c) => s + (c.traits.loyalty ?? 50), 0)
                         / Math.max(1, characters.length);
        if (avgLoyalty > 60) {
          votesFor     += faction.seats;
        } else if (avgLoyalty < 35) {
          votesAgainst += faction.seats;
        } else {
          votesAbstain += Math.floor(faction.seats * 0.4);
          votesFor     += Math.floor(faction.seats * 0.6);
        }
      }
    } else {
      // Без фракций — по персонажам
      for (const char of characters) {
        const r = Math.random();
        const support = (char.traits.loyalty ?? 50) / 100;
        if (r < support)        votesFor++;
        else if (r < 0.9)       votesAgainst++;
        else                    votesAbstain++;
      }
    }
  }

  const total = votesFor + votesAgainst + votesAbstain;
  const quorum = (institution.quorum ?? 51) / 100;
  const passed = total > 0 && (votesFor / total) >= quorum;

  return { for: votesFor, against: votesAgainst, abstain: votesAbstain, passed };
}

// Может ли закон пройти без голосования при данной форме правления?
function requiresVote(nation, law) {
  const type = nation.government?.type;
  // При тирании всё решает тиран
  if (type === 'tyranny')  return false;
  // При племенном вождизме — тоже
  if (type === 'tribal')   return false;
  // При монархии — зависит от типа закона
  if (type === 'monarchy' && law?.type !== 'constitutional') return false;
  // При республике и олигархии — всегда голосование
  return true;
}

// ──────────────────────────────────────────────────────────────────────
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ──────────────────────────────────────────────────────────────────────

function getGovernmentNameFull(type, custom_name) {
  if (type === 'custom' && custom_name) return custom_name;
  const names = {
    tyranny:    'Тирания',
    monarchy:   'Монархия',
    republic:   'Республика',
    oligarchy:  'Олигархия',
    democracy:  'Демократия',
    tribal:     'Племенной вождизм',
    theocracy:  'Теократия',
    custom:     'Особая форма',
  };
  return names[type] ?? type;
}

function getPowerResourceName(type) {
  const names = {
    fear:             'Страх',
    legitimacy:       'Легитимность',
    prestige:         'Престиж',
    divine_mandate:   'Божественный мандат',
    wealth:           'Богатство',
    military_loyalty: 'Воинская верность',
  };
  return names[type] ?? type ?? '—';
}

function getPowerResourceColor(type) {
  const colors = {
    fear:             '#9b2226',
    legitimacy:       '#4CAF50',
    prestige:         '#9C27B0',
    divine_mandate:   '#FFD700',
    wealth:           '#FF9800',
    military_loyalty: '#2196F3',
  };
  return colors[type] ?? '#d4a853';
}

function getPowerResourceIcon(type) {
  const icons = {
    fear:             '😨',
    legitimacy:       '⚖️',
    prestige:         '👑',
    divine_mandate:   '✨',
    wealth:           '💰',
    military_loyalty: '⚔️',
  };
  return icons[type] ?? '🔮';
}

// ══════════════════════════════════════════════════════════════════════
// ПЕРЕГОВОРЫ С СЕНАТОРОМ
// ══════════════════════════════════════════════════════════════════════

// Результат: { outcome: 'success'|'partial'|'fail', message, loyalty_delta, disposition_delta, gold_spent, history_note }
function negotiateSenator(charId, nationId, actionId) {
  const nation = GAME_STATE.nations[nationId];
  if (!nation) return null;

  const senator = (nation.characters ?? []).find(c => c.id === charId);
  if (!senator) return null;

  const disp    = senator.disposition ?? 50;
  const greed   = senator.traits?.greed   ?? 50;
  const caution = senator.traits?.caution ?? 50;
  const loyalty = senator.traits?.loyalty ?? 50;
  const ambition= senator.traits?.ambition ?? 50;
  const power   = nation.government?.power_resource?.current ?? 50;
  const treasury= nation.economy?.treasury ?? 0;

  const roll = Math.random() * 100;

  if (actionId === 'deal') {
    // Предложить союз — обещание поддержки желания
    const threshold = Math.max(10, 20 + disp * 0.6 - caution * 0.15);
    if (roll < threshold) {
      const gain = Math.round(8 + disp * 0.1);
      return {
        outcome: 'success',
        message: `${senator.name} принимает ваше предложение. «Мы найдём общий язык, если вы сдержите слово».`,
        loyalty_delta: gain,
        disposition_delta: Math.round(gain * 0.8),
        gold_spent: 0,
        history_note: `Заключил союз с правителем. Расположение растёт.`,
      };
    } else if (roll < threshold + 25) {
      return {
        outcome: 'partial',
        message: `${senator.name} выслушал, но не спешит. «Слова — не достаточно. Нужны дела».`,
        loyalty_delta: 2,
        disposition_delta: 3,
        gold_spent: 0,
        history_note: `Выслушал предложение правителя. Занял выжидательную позицию.`,
      };
    } else {
      return {
        outcome: 'fail',
        message: `${senator.name} отвергает союз. «Мои обязательства — перед Сенатом, а не перед вами».`,
        loyalty_delta: 0,
        disposition_delta: -3,
        gold_spent: 0,
        history_note: `Отверг предложение правителя о союзе.`,
      };
    }
  }

  if (actionId === 'bribe') {
    const bribeCost = Math.round(500 + greed * 80);
    if (treasury < bribeCost) {
      return {
        outcome: 'fail',
        message: `Недостаточно золота для подкупа (нужно ${bribeCost}).`,
        loyalty_delta: 0,
        disposition_delta: 0,
        gold_spent: 0,
        history_note: '',
      };
    }
    const threshold = Math.min(90, 30 + disp * 0.4 + greed * 0.3);
    if (roll < threshold) {
      const loyGain = Math.round(10 + greed * 0.15);
      return {
        outcome: 'success',
        message: `${senator.name} незаметно принимает мешок золота. «Что ж... возможно, я был слишком суров к вам».`,
        loyalty_delta: loyGain,
        disposition_delta: Math.round(loyGain * 0.9),
        gold_spent: bribeCost,
        history_note: `Получил подношение от правителя. Лояльность выросла.`,
      };
    } else if (greed < 30) {
      // Принципиальный — оскорблён
      return {
        outcome: 'fail',
        message: `${senator.name} с презрением отталкивает золото. «Вы смеете думать, что я продаюсь?!» Расположение падает.`,
        loyalty_delta: -5,
        disposition_delta: -12,
        gold_spent: 0,
        history_note: `Оскорблён попыткой подкупа. Стал враждебнее.`,
      };
    } else {
      return {
        outcome: 'fail',
        message: `${senator.name} берёт золото, но ничего не обещает. «Это уплата старого долга, не более».`,
        loyalty_delta: 2,
        disposition_delta: 1,
        gold_spent: bribeCost,
        history_note: `Взял золото, но остался при своих взглядах.`,
      };
    }
  }

  if (actionId === 'appeal') {
    // Апелляция к личным интересам — называем его желание
    const threshold = Math.min(80, 25 + disp * 0.5 + ambition * 0.1);
    if (roll < threshold) {
      const want = (senator.wants?.[0] ?? 'ваши цели').replace(/_/g, ' ');
      return {
        outcome: 'success',
        message: `Вы апеллируете к его стремлению: "${want}". ${senator.name} задумывается. «Возможно, у нас больше общего, чем я думал».`,
        loyalty_delta: 5,
        disposition_delta: 8,
        gold_spent: 0,
        history_note: `Правитель обратился к его интересам. Проникся уважением.`,
      };
    } else if (roll < threshold + 30) {
      return {
        outcome: 'partial',
        message: `${senator.name} слушает, но остаётся скептичен. «Слова красивые, посмотрим на дела».`,
        loyalty_delta: 1,
        disposition_delta: 2,
        gold_spent: 0,
        history_note: `Выслушал апелляцию к интересам. Остался при своём.`,
      };
    } else {
      return {
        outcome: 'fail',
        message: `${senator.name} не впечатлён. «Не надо учить меня, в чём мои интересы».`,
        loyalty_delta: -1,
        disposition_delta: -2,
        gold_spent: 0,
        history_note: `Отверг апелляцию правителя. Почувствовал манипуляцию.`,
      };
    }
  }

  if (actionId === 'pressure') {
    if (power < 20) {
      return {
        outcome: 'fail',
        message: `Ваша власть слишком слаба для давления (нужно ≥ 20).`,
        loyalty_delta: 0,
        disposition_delta: 0,
        gold_spent: 0,
        history_note: '',
      };
    }
    const threshold = Math.min(70, 10 + power * 0.5 - caution * 0.2);
    if (roll < threshold * 0.5) {
      // Полный успех давления
      return {
        outcome: 'success',
        message: `Вы демонстрируете силу. ${senator.name} бледнеет. «…Я понял вас. Буду лоялен».`,
        loyalty_delta: 12,
        disposition_delta: -5,  // уважает силу, но не любит
        gold_spent: 0,
        history_note: `Поддался давлению правителя. Лоялен из страха.`,
      };
    } else if (roll < threshold) {
      return {
        outcome: 'partial',
        message: `${senator.name} внешне соглашается, но в глазах — упрямство. «Как вам угодно… на этот раз».`,
        loyalty_delta: 4,
        disposition_delta: -8,
        gold_spent: 0,
        history_note: `Уступил давлению, затаил обиду.`,
      };
    } else {
      // Провал давления — скандал
      return {
        outcome: 'fail',
        message: `${senator.name} открыто сопротивляется. «Угрозы — оружие тирана! Сенат это запомнит!» Расположение резко падает.`,
        loyalty_delta: -8,
        disposition_delta: -15,
        gold_spent: 0,
        history_note: `Публично противостоял давлению правителя. Стал открытым врагом.`,
      };
    }
  }

  return {
    outcome: 'fail',
    message: 'Неизвестное действие.',
    loyalty_delta: 0,
    disposition_delta: 0,
    gold_spent: 0,
    history_note: '',
  };
}
