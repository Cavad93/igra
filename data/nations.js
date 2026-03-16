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
        ruler: 'Агафокл',
        institutions: ['совет_стратегов'],
        legitimacy: 72,        // бывший гончар — знать его не любит
      },

      regions: ['syracuse_city', 'leontini', 'akrai'],

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
        ruler: 'Сенат и Народ',
        institutions: ['сенат', 'народное_собрание', 'консулы'],
        legitimacy: 88,
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
        ruler: 'Совет Ста',
        institutions: ['совет_ста', 'суффеты', 'сенат'],
        legitimacy: 82,
      },

      regions: ['carthage', 'numidia'],

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
        ruler: 'Птолемей I Сотер',
        institutions: ['диванная_канцелярия'],
        legitimacy: 90,
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
        ruler: 'Кассандр',
        institutions: ['совет_гетайров'],
        legitimacy: 65,   // наследник Александра — легитимность под вопросом
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
        type: 'republic',
        ruler: 'Демократия',
        institutions: ['экклесия', 'буле'],
        legitimacy: 75,
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

      government: { type: 'monarchy', ruler: 'Эакид', institutions: [], legitimacy: 70 },
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

      government: { type: 'monarchy', ruler: 'Филетер', institutions: [], legitimacy: 68 },
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

      government: { type: 'monarchy', ruler: 'Айлимас', institutions: [], legitimacy: 78 },
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
      regions: ['messana'],
      government: { type: 'oligarchy', ruler: 'Городской совет', institutions: [], legitimacy: 50 },
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
    akrai: {
      nation: 'syracuse',
      type: 'rural',
      terrain: 'hills',
      population: 18000,
      fertility: 0.65,
      buildings: ['укрепление', 'храм'],
      production: { wheat: 5200, olives: 4800, wine: 2200 },
      garrison: 800,
    },
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
