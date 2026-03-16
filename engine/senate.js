// ══════════════════════════════════════════════════════════════════════
// SENATE MANAGER — Ленивая материализация (Lazy Materialization)
// ══════════════════════════════════════════════════════════════════════
//
// Архитектура двух слоёв:
//   Слой данных   — до 90 лёгких JSON-объектов (faction_id, loyalty_score, ambition_level)
//   Слой личности — материализованные сенаторы: имя, биография, теги черт
//
// LLM вызывается ТОЛЬКО при трёх триггерах:
//   1. Прямой клик игрока на сенатора                  → reason: 'player_click'
//   2. ambition_level > 4 + случайное полит. действие  → reason: 'rising_star'
//   3. Ротация — раз в 10 ходов случайный сенатор      → reason: 'rotation'
//
// process_vote() — чистая математика, ноль LLM-вызовов.
// ══════════════════════════════════════════════════════════════════════

class SenateManager {
  constructor(nationId, factions) {
    this.nationId  = nationId;
    this.factions  = factions;  // [{id, name, seats, color}]
    this.senators  = [];
    this.global_senate_state = 'Сенат спокоен. Политическая жизнь идёт своим чередом.';
    this._nextId   = 1;
  }

  // ── Инициализация ────────────────────────────────────────────────────
  init() {
    this.senators = [];
    for (const faction of this.factions) {
      for (let i = 0; i < faction.seats; i++) {
        this.senators.push(this._createGhost(faction.id));
      }
    }
  }

  _createGhost(factionId) {
    return {
      id:            `SEN_${this.nationId.toUpperCase()}_${String(this._nextId++).padStart(3, '0')}`,
      faction_id:    factionId,
      loyalty_score: 30 + Math.floor(Math.random() * 50),  // 30–79
      ambition_level: 1 + Math.floor(Math.random() * 5),   // 1–5
      materialized:  false,
    };
  }

  // ── Геттеры ──────────────────────────────────────────────────────────
  getSenatorById(id) {
    return this.senators.find(s => s.id === id) ?? null;
  }

  getMaterialized() {
    return this.senators.filter(s => s.materialized);
  }

  getGhostsByFaction(factionId) {
    return this.senators.filter(s => s.faction_id === factionId && !s.materialized);
  }

  getFactionStats() {
    const stats = {};
    for (const faction of this.factions) {
      const members = this.senators.filter(s => s.faction_id === faction.id);
      stats[faction.id] = {
        name:         faction.name,
        color:        faction.color,
        seats:        members.length,
        avg_loyalty:  members.length
          ? Math.round(members.reduce((a, s) => a + s.loyalty_score, 0) / members.length)
          : 0,
        materialized: members.filter(s => s.materialized).length,
      };
    }
    return stats;
  }

  // ── process_vote() — ТОЛЬКО математика, никакого LLM ────────────────
  //
  // proposal: {
  //   threshold:         0-100 (% голосов для принятия, по умолчанию 51)
  //   faction_modifiers: { faction_id: delta }  — бонус/штраф к loyalty%
  // }
  //
  // Возвращает: { for, against, abstain, total, passed, margin_pct, top_speakers }
  // top_speakers — 3 наиболее влиятельных материализованных сенатора;
  //   передаются в LLM для генерации речей (НЕ здесь).
  process_vote(proposal = {}) {
    const threshold = (proposal.threshold ?? 51) / 100;
    const mods      = proposal.faction_modifiers ?? {};

    let totalFor = 0, totalAgainst = 0, totalAbstain = 0;

    for (const senator of this.senators) {
      // Базовый шанс поддержки = loyalty_score (нормализованный 0–1)
      let support = senator.loyalty_score / 100;

      // Фракционный модификатор из предложения
      if (mods[senator.faction_id] !== undefined) {
        support = Math.max(0, Math.min(1, support + mods[senator.faction_id] / 100));
      }

      // Амбициозные сенаторы голосуют непредсказуемее (±10 pp)
      if (senator.ambition_level >= 4) {
        support += (Math.random() - 0.5) * 0.2;
        support  = Math.max(0, Math.min(1, support));
      }

      const roll = Math.random();
      if      (roll < support)       totalFor++;
      else if (roll < support + 0.8) totalAgainst++;
      else                           totalAbstain++;
    }

    const total     = totalFor + totalAgainst + totalAbstain;
    const passed    = total > 0 && (totalFor / total) >= threshold;
    const marginPct = total > 0 ? Math.round((totalFor / total) * 100) : 0;

    return {
      for:          totalFor,
      against:      totalAgainst,
      abstain:      totalAbstain,
      total,
      passed,
      margin_pct:   marginPct,
      top_speakers: this._getTopSpeakers(3),
    };
  }

  // Возвращает n наиболее влиятельных материализованных в компактном формате
  _getTopSpeakers(n) {
    return this.getMaterialized()
      .sort((a, b) => (b.influence ?? b.loyalty_score) - (a.influence ?? a.loyalty_score))
      .slice(0, n)
      .map(s => ({
        name:    s.name,
        faction: this._factionName(s.faction_id),
        traits:  s.traits ?? [],
        loyalty: s.loyalty_score,
      }));
  }

  _factionName(factionId) {
    return this.factions.find(f => f.id === factionId)?.name ?? factionId;
  }

  // ── Тик каждый ход — триггеры 2 и 3 ─────────────────────────────────
  async processTick(turn) {
    const isPlayer = this.nationId === GAME_STATE.player_nation;

    // Триггер 2: "Восходящая звезда" — амбициозный сенатор совершает действие
    for (const senator of this.senators) {
      if (!senator.materialized && senator.ambition_level > 4 && Math.random() < 0.12) {
        await this.materialize_senator(senator.id, 'rising_star');
        if (isPlayer && senator.materialized) {
          addEventLog(
            `🌟 В Сенате появилась восходящая звезда: ${senator.name} (${this._factionName(senator.faction_id)}). Честолюбец — следите за ним.`,
            'character'
          );
        }
        break;  // один за ход
      }
    }

    // Триггер 3: Ротация — раз в 10 ходов
    if (turn % 10 === 0) {
      const ghosts = this.senators.filter(s => !s.materialized);
      if (ghosts.length) {
        const picked = ghosts[Math.floor(Math.random() * ghosts.length)];
        await this.materialize_senator(picked.id, 'rotation');
        if (isPlayer && picked.materialized) {
          addEventLog(
            `📰 Горожане обсуждают сенатора ${picked.name} (${this._factionName(picked.faction_id)}) — он привлёк внимание своей позицией.`,
            'info'
          );
        }
      }
    }

    // Естественный drift лояльности — ~5% сенаторов за ход
    for (const senator of this.senators) {
      if (Math.random() < 0.05) {
        senator.loyalty_score = Math.max(0, Math.min(100,
          senator.loyalty_score + Math.round((Math.random() - 0.5) * 10)
        ));
      }
    }
  }

  // ── materialize_senator() — единственная точка вызова LLM ────────────
  //
  // reason: 'player_click' | 'rising_star' | 'rotation'
  //
  // Если LLM недоступен → детерминированный fallback (имя + теги из параметров).
  async materialize_senator(senatorId, reason = 'player_click') {
    const senator = this.getSenatorById(senatorId);
    if (!senator || senator.materialized) return senator;

    const faction = this.factions.find(f => f.id === senator.faction_id);

    // Контекст для LLM — только самое нужное, без истории
    const context = {
      faction_name:        faction?.name ?? senator.faction_id,
      loyalty_score:       senator.loyalty_score,
      ambition_level:      senator.ambition_level,
      global_senate_state: this.global_senate_state,
      top_speakers_tags:   this._getTopSpeakers(3).map(s => `${s.name} [${s.traits.join(', ')}]`),
    };

    try {
      const result = await materializeSenatorViaLLM(senator, context, reason);
      Object.assign(senator, result, {
        materialized:        true,
        materialized_turn:   GAME_STATE.turn,
        materialized_reason: reason,
      });
    } catch (err) {
      console.warn(`materialize_senator fallback (${senatorId}):`, err.message);
      Object.assign(senator, this._deterministicMaterialize(senator, faction), {
        materialized:        true,
        materialized_turn:   GAME_STATE.turn,
        materialized_reason: 'fallback',
      });
    }

    return senator;
  }

  // Детерминированный fallback — имя + теги из числовых параметров
  _deterministicMaterialize(senator, faction) {
    const NAMES   = ['Никий', 'Диодот', 'Агесилай', 'Лисий', 'Дамокрит',
                     'Фрасибул', 'Архелай', 'Мелесий', 'Полидор', 'Кратин',
                     'Тимолеон', 'Евфрон', 'Каллипп', 'Диодор', 'Феодот'];
    const ORIGINS = ['из Акрай', 'Катанский', 'Леонтинский', 'Мессанский',
                     'из Гелы', 'Сиракузянин', 'из Камарины'];

    const name = `${NAMES[Math.floor(Math.random() * NAMES.length)]} ${
                   ORIGINS[Math.floor(Math.random() * ORIGINS.length)]}`;

    const tags = [];
    if (senator.loyalty_score > 65)      tags.push('Лоялист');
    else if (senator.loyalty_score < 35) tags.push('Оппозиционер');
    if (senator.ambition_level >= 4)     tags.push('Честолюбец');

    const factionTag = {
      aristocrats: 'Патриций',
      demos:       'Народник',
      military:    'Ветеран',
      merchants:   'Торговец',
    }[faction?.id] ?? 'Гражданин';
    tags.push(factionTag);

    if (tags.length < 2) tags.push('Осторожный');

    const portrait = {
      aristocrats: '🏛️',
      demos:       '✊',
      military:    '⚔️',
      merchants:   '💰',
    }[faction?.id] ?? '👤';

    return {
      name,
      traits:    tags,
      biography: `Сенатор фракции ${faction?.name ?? 'неизвестной'}. Прошёл путь от простого гражданина до народного представителя.`,
      portrait,
      influence: senator.loyalty_score + senator.ambition_level * 5,
    };
  }

  // ── Обновить строку настроения Сената ────────────────────────────────
  updateGlobalState(description) {
    this.global_senate_state = description;
  }

  // ── Сериализация ─────────────────────────────────────────────────────
  toJSON() {
    return {
      nation_id:           this.nationId,
      factions:            this.factions,
      senators:            this.senators,
      global_senate_state: this.global_senate_state,
      _nextId:             this._nextId,
    };
  }

  static fromJSON(data) {
    const mgr           = new SenateManager(data.nation_id, data.factions);
    mgr.senators        = data.senators;
    mgr.global_senate_state = data.global_senate_state;
    mgr._nextId         = data._nextId ?? data.senators.length + 1;
    return mgr;
  }
}

// ── Глобальный реестр менеджеров сенатов ─────────────────────────────────
const SENATE_MANAGERS = {};

function getSenateManager(nationId) {
  return SENATE_MANAGERS[nationId] ?? null;
}

// Создаёт и инициализирует менеджер если у нации есть senate_config.
// Вызывается при старте игры.
function initSenateForNation(nationId) {
  const nation = GAME_STATE.nations[nationId];
  if (!nation?.senate_config) return null;
  if (SENATE_MANAGERS[nationId]) return SENATE_MANAGERS[nationId];

  const mgr = new SenateManager(nationId, nation.senate_config.factions);
  mgr.init();
  SENATE_MANAGERS[nationId] = mgr;
  return mgr;
}

// Инициализация сенатов для всех наций при старте
function initAllSenates() {
  for (const nationId of Object.keys(GAME_STATE.nations)) {
    initSenateForNation(nationId);
  }
}
