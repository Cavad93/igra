// Стартовые данные всех наций — 301 год до н.э.
// Единственный источник правды — GAME_STATE

const INITIAL_GAME_STATE = {
  date: { year: -301, month: 1 },
  player_nation: 'syracuse',
  turn: 1,

  nations: {

    // ─────────────────────────────────────────────
    // СИРАКУЗЫ — правит игрок
    // ─────────────────────────────────────────────
    syracuse: {
      name: 'Сиракузы',
      adjective: 'сиракузское',
      color: '#8B4513',
      flag_emoji: '⚔️',
      is_player: true,

      government: {
        type: 'tyranny',
        custom_name: null,
        legitimacy: 72,        // бывший гончар — знать его не любит
        stability: 58,
        ruler: {
          type: 'person',
          name: 'Агафокл',
          character_ids: [],
          personal_power: 88,
        },
        institutions: [
          {
            id: 'INST_strategos',
            name: 'Совет стратегов',
            type: 'advisory',
            size: 7,
            character_ids: ['CHAR_0001','CHAR_0002','CHAR_0003','CHAR_0004','CHAR_0005'],
            decision_method: 'single_person',
            quorum: 100,
            powers: ['advise_on_war', 'advise_on_economy', 'command_armies'],
            limitations: ['cannot_override_tyrant'],
            factions: [],
          },
          {
            id: 'INST_guard',
            name: 'Личная гвардия',
            type: 'military',
            size: 500,
            character_ids: [],
            decision_method: 'single_person',
            quorum: 100,
            powers: ['protect_tyrant', 'enforce_orders'],
            limitations: ['palace_duty_only'],
            factions: [],
          },
        ],
        power_resource: {
          type: 'fear',
          current: 70,
          decay_per_turn: 2,
          restored_by: ['executions', 'military_victories', 'show_of_force'],
        },
        elections: null,
        succession: null,
        conspiracies: {
          base_chance_per_turn: 0.15,
          modified_by: ['fear_level', 'treasury_health', 'recent_defeats'],
          secret_police: { enabled: false, cost_per_turn: 200, conspiracy_detection_bonus: 0.4 },
        },
        transition_history: [
          { turn: 0, from: 'oligarchy', to: 'tyranny', cause: 'Агафокл захватил власть в 317 г. до н.э.' },
        ],
        custom_mechanics: [],
        active_transition: null,
      },

      regions: ['syracuse_city', 'leontini', 'gela', 'sicels'],

      population: {
        total: 82000,
        by_profession: {
          farmers:    44000,
          craftsmen:  12000,
          merchants:   9000,
          sailors:     6500,
          clergy:      3000,
          soldiers:    2500,
          slaves:      5000,
        },
        happiness: 62,
        growth_rate: 0.002,
      },

      economy: {
        treasury: 8500,
        income_per_turn: 0,    // считается движком каждый ход
        expense_per_turn: 0,
        tax_rate: 0.12,

        // рыночные запасы нации (в амфорах/бушелях)
        stockpile: {
          wheat:  18000,
          fish:    4500,
          olives:  3200,
          wine:    2800,
          iron:    1200,
          timber:  2500,
          cloth:   1800,
          salt:     900,
          tools:    600,
        },

        trade_routes: [],
      },

      military: {
        infantry:     2200,
        cavalry:       320,
        ships:          48,
        mercenaries:     0,
        morale:         72,
        loyalty:        78,   // армия ещё верна тирану
        at_war_with:  [],
      },

      relations: {
        rome:         { score:  12, treaties: [],          at_war: false },
        carthage:     { score: -38, treaties: [],          at_war: false },
        egypt:        { score:  28, treaties: ['trade'],   at_war: false },
        macedon:      { score:   5, treaties: [],          at_war: false },
        epirus:       { score:  15, treaties: [],          at_war: false },
        greek_states: { score:  40, treaties: ['alliance'],at_war: false },
        pergamon:     { score:  10, treaties: [],          at_war: false },
        numidia:      { score: -10, treaties: [],          at_war: false },
      },

      active_laws: [],
      characters: [],   // заполняется при генерации

      // ── Конфигурация Сената (Lazy Materialization) ──
      // 90 мест; сенаторы хранятся в SenateManager, не здесь.
      // senate_config только описывает структуру фракций.
      // Активируется при переходе к демократии/республике,
      // но данные инициализируются сразу — нулевая цена.
      senate_config: {
        total_seats: 90,
        factions: [
          { id: 'aristocrats', name: 'Аристократы',    seats: 30, color: '#9C27B0' },
          { id: 'demos',       name: 'Народная партия', seats: 25, color: '#4CAF50' },
          { id: 'military',    name: 'Военная фракция', seats: 22, color: '#f44336' },
          { id: 'merchants',   name: 'Торговцы',        seats: 13, color: '#FF9800' },
        ],
      },
    },

    // ─────────────────────────────────────────────
    // РИМ
    // ─────────────────────────────────────────────
    rome: {
      name: 'Рим',
      adjective: 'римское',
      color: '#8B0000',
      flag_emoji: '🦅',
      is_player: false,

      government: {
        type: 'republic',
        custom_name: null,
        legitimacy: 88,
        stability: 80,
        ruler: {
          type: 'council',
          name: 'Сенат и Народ Рима',
          character_ids: [],
          personal_power: 20,
        },
        institutions: [
          {
            id: 'INST_senate',
            name: 'Сенат',
            type: 'legislative',
            size: 300,
            character_ids: ['ROME_SEN_001','ROME_SEN_002','ROME_SEN_003','ROME_SEN_004','ROME_SEN_005','ROME_SEN_006','ROME_SEN_007','ROME_SEN_008','ROME_SEN_009'],
            decision_method: 'majority_vote',
            quorum: 51,
            powers: ['pass_laws', 'approve_budget', 'declare_war', 'appoint_magistrates'],
            limitations: ['cannot_change_constitution_alone', 'cannot_conscript_without_census'],
            factions: [
              { name: 'Оптиматы',   seats: 180, wants: ['noble_privilege', 'tradition'],    fears: ['land_reform', 'populism'],   leader_id: 'ROME_SEN_001' },
              { name: 'Популяры',   seats:  80, wants: ['land_reform', 'cheap_grain'],      fears: ['oligarchy', 'conscription'], leader_id: 'ROME_SEN_004' },
              { name: 'Новые люди', seats:  40, wants: ['merit_promotion', 'trade'],        fears: ['closed_citizenship'],        leader_id: 'ROME_SEN_007' },
            ],
          },
          {
            id: 'INST_consuls',
            name: 'Консулы',
            type: 'executive',
            size: 2,
            character_ids: [],
            decision_method: 'majority_vote',
            quorum: 100,
            powers: ['command_army', 'enforce_laws', 'veto_each_other'],
            limitations: ['annual_term', 'cannot_act_without_senate_budget'],
            factions: [],
          },
        ],
        power_resource: {
          type: 'legitimacy',
          current: 88,
          decay_per_turn: 0.5,
          restored_by: ['victories', 'good_harvests', 'popular_laws'],
        },
        elections: {
          enabled: true,
          frequency_turns: 12,
          next_election: 8,
          eligible_voters: 'male_citizens',
          offices: ['consul', 'praetor', 'quaestor'],
        },
        succession: null,
        conspiracies: null,
        transition_history: [
          { turn: 0, from: 'monarchy', to: 'republic', cause: 'Изгнание царей Тарквиниев, 509 г. до н.э.' },
        ],
        custom_mechanics: [],
        active_transition: null,
      },

      regions: ['rome', 'capua'],

      population: {
        total: 210000,
        by_profession: {
          farmers:    115000,
          craftsmen:   28000,
          merchants:   18000,
          sailors:      8000,
          clergy:       8000,
          soldiers:    18000,
          slaves:      15000,
        },
        happiness: 70,
        growth_rate: 0.003,
      },

      economy: {
        treasury: 24000,
        income_per_turn: 0,
        expense_per_turn: 0,
        tax_rate: 0.10,

        stockpile: {
          wheat:  85000,
          fish:    8000,
          iron:    8000,
          timber: 12000,
          cloth:   6000,
          salt:    4000,
        },

        trade_routes: ['carthage', 'greek_states'],
      },

      military: {
        infantry:    18000,
        cavalry:      1800,
        ships:          60,
        mercenaries:     0,
        morale:         82,
        loyalty:        90,
        at_war_with:  [],
      },

      relations: {
        syracuse:     { score:  12, treaties: [],           at_war: false },
        carthage:     { score: -15, treaties: [],           at_war: false },
        egypt:        { score:  20, treaties: ['trade'],    at_war: false },
        macedon:      { score:  -5, treaties: [],           at_war: false },
        epirus:       { score: -20, treaties: [],           at_war: false },
        greek_states: { score:  15, treaties: [],           at_war: false },
        pergamon:     { score:  25, treaties: ['trade'],    at_war: false },
        numidia:      { score:   5, treaties: [],           at_war: false },
      },

      active_laws: [
        {
          id: 'LAW_ROME_001',
          name: 'Lex Militaris',
          type: 'military',
          effects_per_turn: { 'military.infantry': 50 },
        },
      ],
      characters: [],

      // AI стратегия
      ai_personality: 'expansionist',
      ai_priority: 'military',
    },

    // ─────────────────────────────────────────────
    // КАРФАГЕН
    // ─────────────────────────────────────────────
    carthage: {
      name: 'Карфаген',
      adjective: 'карфагенское',
      color: '#4B0082',
      flag_emoji: '🐘',
      is_player: false,

      government: {
        type: 'oligarchy',
        custom_name: 'Совет Ста',
        legitimacy: 82,
        stability: 75,
        ruler: {
          type: 'council',
          name: 'Совет Ста',
          character_ids: [],
          personal_power: 15,
        },
        institutions: [
          {
            id: 'INST_council_hundred',
            name: 'Совет Ста',
            type: 'legislative',
            size: 104,
            character_ids: ['CARTH_OLI_001','CARTH_OLI_002','CARTH_OLI_003','CARTH_OLI_004','CARTH_OLI_005','CARTH_OLI_006'],
            decision_method: 'weighted_by_wealth',
            quorum: 51,
            powers: ['pass_laws', 'declare_war', 'approve_contracts', 'appoint_suffetes'],
            limitations: ['cannot_act_against_merchant_clans'],
            factions: [
              { name: 'Клан Баркидов',        seats: 28, wants: ['military_expansion', 'sicily'],  fears: ['rome', 'greek_alliance'],   leader_id: null },
              { name: 'Торговый совет',        seats: 42, wants: ['free_trade', 'peace', 'profits'],fears: ['war', 'port_taxes'],        leader_id: null },
              { name: 'Жреческая коллегия',    seats: 24, wants: ['temple_funds', 'divine_favor'],  fears: ['reform', 'democracy'],      leader_id: null },
              { name: 'Земельная аристократия',seats: 10, wants: ['land_rights', 'slave_labor'],    fears: ['land_reform'],              leader_id: null },
            ],
          },
          {
            id: 'INST_suffetes',
            name: 'Суффеты',
            type: 'executive',
            size: 2,
            character_ids: [],
            decision_method: 'unanimous',
            quorum: 100,
            powers: ['execute_laws', 'command_navy', 'negotiate_treaties'],
            limitations: ['cannot_declare_war_alone', 'annual_term'],
            factions: [],
          },
        ],
        power_resource: {
          type: 'wealth',
          current: 82,
          decay_per_turn: 0.3,
          restored_by: ['trade_profits', 'tribute', 'conquest'],
        },
        elections: null,
        succession: null,
        conspiracies: null,
        clans: [
          { name: 'Клан Баркидов',   wealth: 18000, seats_in_council: 28, controls: ['military_contracts', 'sardinia_trade'], leader_id: null },
          { name: 'Клан Ганнонидов', wealth: 24000, seats_in_council: 35, controls: ['african_grain', 'port_carthage'],       leader_id: null },
        ],
        citizenship: { closed: true, new_entry_requires: 'unanimous_council_vote', commoner_resentment_per_turn: 1 },
        transition_history: [
          { turn: 0, from: null, to: 'oligarchy', cause: 'Основание Карфагена финикийскими купцами' },
        ],
        custom_mechanics: [],
        active_transition: null,
      },

      regions: ['carthage', 'elymia', 'panormus', 'selinous'],

      population: {
        total: 350000,
        by_profession: {
          farmers:    180000,
          craftsmen:   45000,
          merchants:   42000,
          sailors:     28000,
          clergy:      12000,
          soldiers:    22000,
          slaves:      21000,
        },
        happiness: 68,
        growth_rate: 0.002,
      },

      economy: {
        treasury: 62000,
        income_per_turn: 0,
        expense_per_turn: 0,
        tax_rate: 0.14,

        stockpile: {
          wheat:  120000,
          fish:    15000,
          iron:    12000,
          timber:  18000,
          cloth:   14000,
          salt:     8000,
          wine:    10000,
        },

        trade_routes: ['egypt', 'greek_states', 'rome'],
      },

      military: {
        infantry:    22000,
        cavalry:      4500,
        ships:         220,
        mercenaries:  8000,
        morale:        75,
        loyalty:       65,   // наёмная армия — лояльность средняя
        at_war_with: [],
      },

      relations: {
        syracuse:     { score: -38, treaties: [],          at_war: false },
        rome:         { score: -15, treaties: [],          at_war: false },
        egypt:        { score:  22, treaties: ['trade'],   at_war: false },
        macedon:      { score:  10, treaties: [],          at_war: false },
        epirus:       { score:  -5, treaties: [],          at_war: false },
        greek_states: { score: -20, treaties: [],          at_war: false },
        pergamon:     { score:   5, treaties: [],          at_war: false },
        numidia:      { score:  40, treaties: ['vassal'],  at_war: false },
      },

      active_laws: [],
      characters: [],
      ai_personality: 'merchant',
      ai_priority: 'trade',
    },

    // ─────────────────────────────────────────────
    // ЕГИПЕТ — Птолемей I
    // ─────────────────────────────────────────────
    egypt: {
      name: 'Египет',
      adjective: 'египетское',
      color: '#B8860B',
      flag_emoji: '𓂀',
      is_player: false,

      government: {
        type: 'monarchy',
        custom_name: 'Царство Птолемеев',
        legitimacy: 90,
        stability: 75,
        ruler: { type: 'person', name: 'Птолемей I Сотер', character_ids: [], personal_power: 85 },
        institutions: [
          {
            id: 'INST_royal_court_eg',
            name: 'Царский двор',
            type: 'advisory',
            size: 20,
            character_ids: ['EGY_CRT_001','EGY_CRT_002','EGY_CRT_003','EGY_CRT_004','EGY_CRT_005'],
            decision_method: 'single_person',
            quorum: 100,
            powers: ['advise_king', 'manage_provinces', 'command_armies'],
            limitations: ['cannot_override_pharaoh'],
            factions: [],
          },
        ],
        power_resource: { type: 'legitimacy', current: 90, decay_per_turn: 0.5, restored_by: ['victories', 'temple_building', 'good_harvests'] },
        elections: null,
        succession: { tracked: true, heir: null, crisis_if_no_heir: true, claim_types: ['blood', 'marriage'] },
        conspiracies: null,
        transition_history: [{ turn: 0, from: null, to: 'monarchy', cause: 'Птолемей I провозгласил себя царём в 305 г. до н.э.' }],
        custom_mechanics: [],
        active_transition: null,
      },

      regions: ['alexandria', 'cyrenaica'],

      population: {
        total: 4800000,   // Египет — самая населённая страна
        by_profession: {
          farmers:    3200000,
          craftsmen:   480000,
          merchants:   280000,
          sailors:      80000,
          clergy:      180000,
          soldiers:     60000,
          slaves:      520000,
        },
        happiness: 58,   // тяжёлые налоги фараона
        growth_rate: 0.001,
      },

      economy: {
        treasury: 180000,
        income_per_turn: 0,
        expense_per_turn: 0,
        tax_rate: 0.18,   // тяжёлое налогообложение

        stockpile: {
          wheat:  800000,
          fish:    25000,
          iron:    15000,
          timber:  20000,
          cloth:   30000,
          salt:    12000,
          wine:    18000,
        },

        trade_routes: ['carthage', 'pergamon', 'syracuse'],
      },

      military: {
        infantry:    60000,
        cavalry:      8000,
        ships:         300,
        mercenaries: 15000,
        morale:        70,
        loyalty:       75,
        at_war_with: [],
      },

      relations: {
        syracuse:     { score:  28, treaties: ['trade'],   at_war: false },
        rome:         { score:  20, treaties: ['trade'],   at_war: false },
        carthage:     { score:  22, treaties: ['trade'],   at_war: false },
        macedon:      { score: -25, treaties: [],          at_war: false },
        epirus:       { score:   5, treaties: [],          at_war: false },
        greek_states: { score:  35, treaties: ['trade'],   at_war: false },
        pergamon:     { score:  30, treaties: ['trade'],   at_war: false },
        numidia:      { score:   8, treaties: [],          at_war: false },
      },

      active_laws: [],
      characters: [],
      ai_personality: 'defensive',
      ai_priority: 'economy',
    },

    // ─────────────────────────────────────────────
    // МАКЕДОНИЯ — Кассандр
    // ─────────────────────────────────────────────
    macedon: {
      name: 'Македония',
      adjective: 'македонское',
      color: '#1565C0',
      flag_emoji: '☀️',
      is_player: false,

      government: {
        type: 'monarchy',
        custom_name: 'Македонское царство',
        legitimacy: 65,
        stability: 60,
        ruler: { type: 'person', name: 'Кассандр', character_ids: [], personal_power: 75 },
        institutions: [
          {
            id: 'INST_hetairoi',
            name: 'Совет гетайров',
            type: 'military',
            size: 30,
            character_ids: ['MAC_HTR_001','MAC_HTR_002','MAC_HTR_003','MAC_HTR_004','MAC_HTR_005'],
            decision_method: 'single_person',
            quorum: 100,
            powers: ['command_phalanx', 'advise_king', 'guard_borders'],
            limitations: ['cannot_decide_succession'],
            factions: [],
          },
        ],
        power_resource: { type: 'military_loyalty', current: 65, decay_per_turn: 0.5, restored_by: ['victories', 'spoils_of_war', 'personal_loyalty'] },
        elections: null,
        succession: { tracked: true, heir: null, crisis_if_no_heir: true, claim_types: ['blood', 'conquest', 'election'] },
        conspiracies: null,
        transition_history: [{ turn: 0, from: null, to: 'monarchy', cause: 'Кассандр захватил Македонию после войн диадохов' }],
        custom_mechanics: [],
        active_transition: null,
      },

      regions: ['macedon', 'epirus'],

      population: {
        total: 380000,
        by_profession: {
          farmers:    210000,
          craftsmen:   48000,
          merchants:   32000,
          sailors:     12000,
          clergy:      15000,
          soldiers:    42000,
          slaves:      21000,
        },
        happiness: 55,   // войны диадохов истощили народ
        growth_rate: 0.001,
      },

      economy: {
        treasury: 28000,
        income_per_turn: 0,
        expense_per_turn: 0,
        tax_rate: 0.13,

        stockpile: {
          wheat:   95000,
          iron:    18000,
          timber:  22000,
          cloth:    8000,
        },

        trade_routes: ['egypt', 'greek_states'],
      },

      military: {
        infantry:    42000,
        cavalry:      5200,
        ships:          80,
        mercenaries:  3000,
        morale:        78,
        loyalty:       80,
        at_war_with: [],
      },

      relations: {
        syracuse:     { score:   5, treaties: [],           at_war: false },
        rome:         { score:  -5, treaties: [],           at_war: false },
        carthage:     { score:  10, treaties: [],           at_war: false },
        egypt:        { score: -25, treaties: [],           at_war: false },
        epirus:       { score: -30, treaties: [],           at_war: false },
        greek_states: { score: -10, treaties: [],           at_war: false },
        pergamon:     { score: -15, treaties: [],           at_war: false },
        numidia:      { score:   0, treaties: [],           at_war: false },
      },

      active_laws: [],
      characters: [],
      ai_personality: 'aggressive',
      ai_priority: 'military',
    },

    // ─────────────────────────────────────────────
    // МАЛЫЕ ГОСУДАРСТВА (не-AI, просто существуют)
    // ─────────────────────────────────────────────
    greek_states: {
      name: 'Греческие полисы',
      adjective: 'греческое',
      color: '#2E7D32',
      flag_emoji: '🏛️',
      is_player: false,
      is_minor: true,

      government: {
        type: 'oligarchy',
        custom_name: 'Греческий союз',
        legitimacy: 75,
        stability: 55,
        ruler: { type: 'council', name: 'Объединённый совет', character_ids: [], personal_power: 25 },
        institutions: [
          {
            id: 'INST_ekklesia',
            name: 'Экклесия',
            type: 'legislative',
            size: 500,
            character_ids: [],
            decision_method: 'majority_vote',
            quorum: 51,
            powers: ['pass_laws', 'declare_war'],
            limitations: [],
            factions: [
              { name: 'Афинская партия',   seats: 200, wants: ['sea_power', 'trade'],    fears: ['macedon'], leader_id: null },
              { name: 'Коринфская партия', seats: 180, wants: ['land_trade', 'peace'],   fears: ['war'],     leader_id: null },
              { name: 'Независимые',       seats: 120, wants: ['autonomy'],              fears: ['hegemony'],leader_id: null },
            ],
          },
        ],
        power_resource: { type: 'legitimacy', current: 75, decay_per_turn: 1, restored_by: ['victories', 'trade_prosperity'] },
        elections: null, succession: null, conspiracies: null,
        transition_history: [],
        custom_mechanics: [], active_transition: null,
      },

      regions: ['corinth', 'athens'],
      population: { total: 120000, by_profession: { farmers: 50000, craftsmen: 25000, merchants: 20000, sailors: 10000, clergy: 5000, soldiers: 5000, slaves: 5000 }, happiness: 65, growth_rate: 0.001 },
      economy: { treasury: 15000, income_per_turn: 0, expense_per_turn: 0, tax_rate: 0.10, stockpile: { wheat: 30000, fish: 8000, cloth: 5000 }, trade_routes: [] },
      military: { infantry: 5000, cavalry: 500, ships: 40, mercenaries: 0, morale: 70, loyalty: 75, at_war_with: [] },
      relations: { syracuse: { score: 40, treaties: ['alliance'], at_war: false }, rome: { score: 15, treaties: [], at_war: false }, carthage: { score: -20, treaties: [], at_war: false }, egypt: { score: 35, treaties: ['trade'], at_war: false }, macedon: { score: -10, treaties: [], at_war: false } },
      active_laws: [], characters: [],
      ai_personality: 'diplomatic', ai_priority: 'trade',
    },

    epirus: {
      name: 'Эпир',
      adjective: 'эпирское',
      color: '#00695C',
      flag_emoji: '🗡️',
      is_player: false,
      is_minor: true,

      government: { type: 'monarchy', custom_name: 'Царство Эпира', legitimacy: 70, stability: 60, ruler: { type: 'person', name: 'Пирр', character_ids: [], personal_power: 80 }, institutions: [], power_resource: { type: 'prestige', current: 70, decay_per_turn: 1, restored_by: ['victories', 'personal_combat', 'diplomatic_marriages'] }, elections: null, succession: { tracked: true, heir: null, crisis_if_no_heir: true, claim_types: ['blood', 'conquest'] }, conspiracies: null, transition_history: [], custom_mechanics: [], active_transition: null },
      regions: ['epirus'],
      population: { total: 95000, by_profession: { farmers: 55000, craftsmen: 10000, merchants: 8000, sailors: 4000, clergy: 3000, soldiers: 12000, slaves: 3000 }, happiness: 60, growth_rate: 0.002 },
      economy: { treasury: 5500, income_per_turn: 0, expense_per_turn: 0, tax_rate: 0.11, stockpile: { wheat: 22000, timber: 8000, iron: 3000 }, trade_routes: [] },
      military: { infantry: 12000, cavalry: 1200, ships: 20, mercenaries: 0, morale: 80, loyalty: 85, at_war_with: [] },
      relations: { syracuse: { score: 15, treaties: [], at_war: false }, rome: { score: -20, treaties: [], at_war: false }, macedon: { score: -30, treaties: [], at_war: false } },
      active_laws: [], characters: [],
      ai_personality: 'aggressive', ai_priority: 'military',
    },

    pergamon: {
      name: 'Пергам',
      adjective: 'пергамское',
      color: '#795548',
      flag_emoji: '📜',
      is_player: false,
      is_minor: true,

      government: { type: 'monarchy', custom_name: 'Пергамское царство', legitimacy: 68, stability: 65, ruler: { type: 'person', name: 'Филетер', character_ids: [], personal_power: 72 }, institutions: [], power_resource: { type: 'wealth', current: 68, decay_per_turn: 0.5, restored_by: ['trade_profits', 'victories'] }, elections: null, succession: { tracked: true, heir: null, crisis_if_no_heir: true, claim_types: ['blood', 'appointment'] }, conspiracies: null, transition_history: [], custom_mechanics: [], active_transition: null },
      regions: ['pergamon'],
      population: { total: 85000, by_profession: { farmers: 45000, craftsmen: 18000, merchants: 12000, sailors: 3000, clergy: 4000, soldiers: 2000, slaves: 1000 }, happiness: 70, growth_rate: 0.002 },
      economy: { treasury: 12000, income_per_turn: 0, expense_per_turn: 0, tax_rate: 0.11, stockpile: { wheat: 20000, cloth: 6000, wine: 4000 }, trade_routes: [] },
      military: { infantry: 3000, cavalry: 400, ships: 15, mercenaries: 500, morale: 65, loyalty: 70, at_war_with: [] },
      relations: { syracuse: { score: 10, treaties: [], at_war: false }, egypt: { score: 30, treaties: ['trade'], at_war: false }, macedon: { score: -15, treaties: [], at_war: false } },
      active_laws: [], characters: [],
      ai_personality: 'diplomatic', ai_priority: 'economy',
    },

    numidia: {
      name: 'Нумидия',
      adjective: 'нумидийское',
      color: '#FF8F00',
      flag_emoji: '🏇',
      is_player: false,
      is_minor: true,

      government: { type: 'tribal', custom_name: 'Нумидийское вождество', legitimacy: 78, stability: 55, ruler: { type: 'person', name: 'Айлимас', character_ids: ['NUM_ELD_001','NUM_ELD_002','NUM_ELD_003','NUM_ELD_004'], personal_power: 75 }, institutions: [{ id: 'INST_elder_council', name: 'Совет старейшин', type: 'advisory', size: 4, character_ids: ['NUM_ELD_001','NUM_ELD_002','NUM_ELD_003','NUM_ELD_004'], decision_method: 'unanimous', quorum: 100, powers: ['approve_war', 'tribal_laws', 'choose_successor'], limitations: ['cannot_override_chieftain_in_battle'], factions: [] }], power_resource: { type: 'prestige', current: 78, decay_per_turn: 1.5, restored_by: ['raids', 'personal_combat', 'generous_feasts'] }, elections: null, succession: null, conspiracies: null, transition_history: [], custom_mechanics: [], active_transition: null },
      regions: ['numidia'],
      population: { total: 320000, by_profession: { farmers: 200000, craftsmen: 20000, merchants: 15000, sailors: 5000, clergy: 10000, soldiers: 35000, slaves: 35000 }, happiness: 55, growth_rate: 0.003 },
      economy: { treasury: 4200, income_per_turn: 0, expense_per_turn: 0, tax_rate: 0.08, stockpile: { wheat: 80000, horses: 5000 }, trade_routes: [] },
      military: { infantry: 20000, cavalry: 8000, ships: 5, mercenaries: 0, morale: 75, loyalty: 88, at_war_with: [] },
      relations: { syracuse: { score: -10, treaties: [], at_war: false }, carthage: { score: 40, treaties: ['vassal'], at_war: false } },
      active_laws: [], characters: [],
      ai_personality: 'neutral', ai_priority: 'survival',
    },

    neutral: {
      name: 'Независимые',
      adjective: 'независимое',
      color: '#9E9E9E',
      flag_emoji: '🏳️',
      is_player: false,
      is_minor: true,
      regions: ['messana', 'tyndaris', 'calactea', 'sicani', 'sicels', 'acragas'],
      government: { type: 'oligarchy', custom_name: null, legitimacy: 50, stability: 45, ruler: { type: 'council', name: 'Городской совет', character_ids: [], personal_power: 30 }, institutions: [], power_resource: { type: 'legitimacy', current: 50, decay_per_turn: 0.5, restored_by: ['trade_prosperity', 'peace'] }, elections: null, succession: null, conspiracies: null, transition_history: [], custom_mechanics: [], active_transition: null },
      population: { total: 22000, by_profession: { farmers: 8000, craftsmen: 5000, merchants: 5000, sailors: 2000, clergy: 1000, soldiers: 500, slaves: 500 }, happiness: 58, growth_rate: 0.001 },
      economy: { treasury: 2800, income_per_turn: 0, expense_per_turn: 0, tax_rate: 0.10, stockpile: { wheat: 8000, fish: 2000 }, trade_routes: [] },
      military: { infantry: 800, cavalry: 100, ships: 12, mercenaries: 200, morale: 55, loyalty: 60, at_war_with: [] },
      relations: { syracuse: { score: -5, treaties: [], at_war: false }, carthage: { score: -5, treaties: [], at_war: false } },
      active_laws: [], characters: [],
    },
  },

  // ─────────────────────────────────────────────
  // РЕГИОНЫ — детали каждой территории
  // ─────────────────────────────────────────────
  regions: {
    // ── Сиракузы ──────────────────────────────────────────
    syracuse_city: {
      nation: 'syracuse',
      type: 'capital_city',
      terrain: 'coastal_city',
      population: 38000,
      fertility: 0.4,
      buildings: ['порт', 'агора', 'храм_аполлона', 'верфи', 'акрополь'],
      production: { fish: 2800, crafts: 3200, trade_goods: 2100 },
      garrison: 1200,
    },
    leontini: {
      nation: 'syracuse',
      type: 'rural',
      terrain: 'plains',
      population: 26000,
      fertility: 0.88,
      buildings: ['амбары', 'рынок'],
      production: { wheat: 12800, olives: 3200 },
      garrison: 500,
    },
    gela: {
      nation: 'syracuse',
      type: 'coastal_city',
      terrain: 'coastal_city',
      population: 18000,
      fertility: 0.60,
      buildings: ['порт', 'рынок'],
      production: { fish: 2200, wheat: 4500, trade_goods: 1200 },
      garrison: 600,
    },
    sicels: {
      nation: 'neutral',
      type: 'rural',
      terrain: 'hills',
      population: 35000,
      fertility: 0.65,
      buildings: ['деревни'],
      production: { wheat: 7500, timber: 3200, iron: 1500 },
      garrison: 800,
    },
    // ── Карфагенские регионы Сицилии ──────────────────────
    elymia: {
      nation: 'carthage',
      type: 'rural',
      terrain: 'hills',
      population: 28000,
      fertility: 0.55,
      buildings: ['крепость_эрикс', 'храм_афродиты'],
      production: { wheat: 5500, olives: 3800, wine: 2200 },
      garrison: 1500,
    },
    panormus: {
      nation: 'carthage',
      type: 'coastal_city',
      terrain: 'coastal_city',
      population: 45000,
      fertility: 0.45,
      buildings: ['карфагенский_порт', 'верфи', 'казармы'],
      production: { fish: 3800, trade_goods: 4500, cloth: 2000 },
      garrison: 4000,
    },
    selinous: {
      nation: 'carthage',
      type: 'rural',
      terrain: 'plains',
      population: 15000,
      fertility: 0.70,
      buildings: ['разрушенный_храм', 'поля'],
      production: { wheat: 8500, olives: 2800 },
      garrison: 800,
    },
    // ── Нейтральные регионы Сицилии ───────────────────────
    messana: {
      nation: 'neutral',
      type: 'coastal_city',
      terrain: 'coastal_city',
      population: 22000,
      fertility: 0.5,
      buildings: ['порт', 'укрепления'],
      production: { fish: 1800, trade_goods: 1500 },
      garrison: 800,
    },
    tyndaris: {
      nation: 'neutral',
      type: 'coastal_city',
      terrain: 'coastal_city',
      population: 12000,
      fertility: 0.50,
      buildings: ['порт', 'акрополь'],
      production: { fish: 1500, trade_goods: 1200 },
      garrison: 400,
    },
    calactea: {
      nation: 'neutral',
      type: 'rural',
      terrain: 'coastal_city',
      population: 18000,
      fertility: 0.55,
      buildings: ['рынок'],
      production: { fish: 1200, wheat: 3500, trade_goods: 800 },
      garrison: 300,
    },
    sicani: {
      nation: 'neutral',
      type: 'rural',
      terrain: 'hills',
      population: 42000,
      fertility: 0.60,
      buildings: ['деревни', 'пастбища'],
      production: { wheat: 9000, timber: 4500, olives: 3000 },
      garrison: 500,
    },
    acragas: {
      nation: 'neutral',
      type: 'coastal_city',
      terrain: 'coastal_city',
      population: 32000,
      fertility: 0.50,
      buildings: ['храм_зевса', 'порт', 'агора'],
      production: { fish: 2500, olives: 4800, trade_goods: 2200 },
      garrison: 2000,
    },
    rome: {
      nation: 'rome',
      type: 'capital_city',
      terrain: 'hills',
      population: 120000,
      fertility: 0.55,
      buildings: ['форум', 'капитолий', 'казармы', 'акведук'],
      production: { iron: 4200, tools: 3500, cloth: 2800 },
      garrison: 8000,
    },
    capua: {
      nation: 'rome',
      type: 'rural',
      terrain: 'plains',
      population: 90000,
      fertility: 0.90,
      buildings: ['поместья', 'рынок', 'арена'],
      production: { wheat: 52000, wine: 8000, cloth: 4000 },
      garrison: 5000,
    },
    carthage: {
      nation: 'carthage',
      type: 'capital_city',
      terrain: 'coastal_city',
      population: 180000,
      fertility: 0.3,
      buildings: ['карфагенский_порт', 'бирса', 'торф_склады', 'верфи'],
      production: { fish: 8000, trade_goods: 12000, cloth: 6000 },
      garrison: 12000,
    },
    numidia: {
      nation: 'numidia',
      type: 'rural',
      terrain: 'plains',
      population: 170000,
      fertility: 0.70,
      buildings: ['пастбища'],
      production: { wheat: 65000, horses: 2800 },
      garrison: 15000,
    },
    epirus: {
      nation: 'epirus',
      type: 'kingdom',
      terrain: 'mountains',
      population: 95000,
      fertility: 0.55,
      buildings: ['крепость', 'конюшни'],
      production: { timber: 8500, iron: 3200, wheat: 18000 },
      garrison: 10000,
    },
    macedon: {
      nation: 'macedon',
      type: 'kingdom',
      terrain: 'hills',
      population: 285000,
      fertility: 0.70,
      buildings: ['фаланга_казармы', 'конюшни', 'рудники'],
      production: { wheat: 82000, iron: 12000, timber: 15000 },
      garrison: 25000,
    },
    corinth: {
      nation: 'greek_states',
      type: 'city_state',
      terrain: 'coastal_city',
      population: 65000,
      fertility: 0.35,
      buildings: ['порт', 'агора', 'храм_афродиты'],
      production: { fish: 4500, trade_goods: 8200, bronze: 3500 },
      garrison: 2500,
    },
    athens: {
      nation: 'greek_states',
      type: 'city_state',
      terrain: 'coastal_city',
      population: 55000,
      fertility: 0.30,
      buildings: ['пирей', 'акрополь', 'агора', 'мусейон'],
      production: { fish: 3800, trade_goods: 6500, cloth: 3200 },
      garrison: 2000,
    },
    pergamon: {
      nation: 'pergamon',
      type: 'kingdom',
      terrain: 'hills',
      population: 85000,
      fertility: 0.60,
      buildings: ['библиотека', 'акрополь', 'порт'],
      production: { wheat: 22000, cloth: 5500, olives: 4200 },
      garrison: 2000,
    },
    alexandria: {
      nation: 'egypt',
      type: 'capital_city',
      terrain: 'river_valley',
      population: 320000,
      fertility: 0.95,
      buildings: ['александрийский_маяк', 'мусейон', 'порт', 'зернохранилища'],
      production: { wheat: 185000, fish: 12000, cloth: 18000, papyrus: 8000 },
      garrison: 25000,
    },
    cyrenaica: {
      nation: 'egypt',
      type: 'rural',
      terrain: 'coastal_city',
      population: 95000,
      fertility: 0.65,
      buildings: ['порт', 'рынок'],
      production: { wheat: 35000, fish: 5500, trade_goods: 4200 },
      garrison: 3000,
    },
  },

  // ─────────────────────────────────────────────
  // РЫНОК — глобальные цены
  // ─────────────────────────────────────────────
  market: {
    wheat:  { base: 10,  supply: 0, demand: 0, price: 10  },
    fish:   { base: 15,  supply: 0, demand: 0, price: 15  },
    olives: { base: 20,  supply: 0, demand: 0, price: 20  },
    wine:   { base: 30,  supply: 0, demand: 0, price: 30  },
    iron:   { base: 45,  supply: 0, demand: 0, price: 45  },
    timber: { base: 22,  supply: 0, demand: 0, price: 22  },
    cloth:  { base: 25,  supply: 0, demand: 0, price: 25  },
    salt:   { base: 18,  supply: 0, demand: 0, price: 18  },
    tools:  { base: 35,  supply: 0, demand: 0, price: 35  },
    slaves: { base: 200, supply: 0, demand: 0, price: 200 },
  },

  events_log: [],
  active_events: [],
};
