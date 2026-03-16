// Персонажи двора и сената
// При старте пустой массив — заполняется через AI или стартовым набором

// Заглушка стартовых персонажей Сиракуз (до генерации через Claude)
const INITIAL_CHARACTERS_SYRACUSE = [
  {
    id: 'CHAR_0001',
    name: 'Менон из Акрай',
    age: 58,
    role: 'senator',
    nation: 'syracuse',
    alive: true,
    health: 72,

    traits: {
      ambition: 45,
      caution: 82,
      loyalty: 28,     // старая знать, ненавидит выскочку-гончара
      piety: 70,
      cruelty: 15,
      greed: 60,
    },

    wants: ['восстановить_демократию', 'земельные_привилегии'],
    fears: ['казна_опустеет', 'война_с_карфагеном'],

    resources: {
      gold: 6200,
      land: 8,          // обширные поместья в Леонтини
      followers: 180,   // сенаторы старой закалки
      army_command: 0,
    },

    relations: {
      CHAR_0002: { score: -20, description: 'соперник за влияние' },
      CHAR_0003: { score: 35, description: 'старый союзник' },
    },

    history: [
      { turn: 0, event: 'Начало игры. Недоволен властью тирана.' },
    ],

    portrait: '👴',
    description: 'Аристократ старого рода. Презирает Агафокла, но умело скрывает это.',
  },

  {
    id: 'CHAR_0002',
    name: 'Гераклид Молодой',
    age: 34,
    role: 'general',
    nation: 'syracuse',
    alive: true,
    health: 95,

    traits: {
      ambition: 85,
      caution: 35,
      loyalty: 72,     // преданный тирану военачальник
      piety: 30,
      cruelty: 55,
      greed: 48,
    },

    wants: ['победа_в_войне', 'больше_войск', 'слава'],
    fears: ['поражение', 'потеря_командования'],

    resources: {
      gold: 1800,
      land: 1,
      followers: 420,   // солдаты обожают его
      army_command: 1200,
    },

    relations: {
      CHAR_0001: { score: -20, description: 'враждует с аристократами' },
      CHAR_0004: { score: 60, description: 'боевой товарищ' },
    },

    history: [
      { turn: 0, event: 'Начало игры. Готовится к возможному конфликту с Карфагеном.' },
    ],

    portrait: '⚔️',
    description: 'Блестящий молодой стратег. Победил карфагенян в двух битвах. Честолюбив.',
  },

  {
    id: 'CHAR_0003',
    name: 'Никомед Финикийский',
    age: 47,
    role: 'merchant',
    nation: 'syracuse',
    alive: true,
    health: 81,

    traits: {
      ambition: 58,
      caution: 68,
      loyalty: 45,     // лоялен казне, а не правителю
      piety: 22,
      cruelty: 10,
      greed: 90,
    },

    wants: ['торговые_монополии', 'мир_с_карфагеном', 'снижение_пошлин'],
    fears: ['война', 'пиратство', 'новые_налоги'],

    resources: {
      gold: 18500,     // богатейший купец города
      land: 2,
      followers: 85,   // торговая гильдия
      army_command: 0,
    },

    relations: {
      CHAR_0001: { score: 35, description: 'деловой партнёр' },
      CHAR_0002: { score: -15, description: 'война разоряет торговлю' },
    },

    history: [
      { turn: 0, event: 'Начало игры. Ищет новые торговые маршруты в Египет.' },
    ],

    portrait: '💰',
    description: 'Богатейший торговец Сиракуз, связанный торговыми нитями от Египта до Рима.',
  },

  {
    id: 'CHAR_0004',
    name: 'Эвтихий Жрец',
    age: 62,
    role: 'priest',
    nation: 'syracuse',
    alive: true,
    health: 65,

    traits: {
      ambition: 30,
      caution: 88,
      loyalty: 65,
      piety: 98,
      cruelty: 5,
      greed: 20,
    },

    wants: ['новый_храм_зевса', 'жреческие_привилегии', 'мир'],
    fears: ['осквернение_богов', 'голод', 'чума'],

    resources: {
      gold: 3200,
      land: 3,          // храмовые земли
      followers: 240,   // паства, жрецы
      army_command: 0,
    },

    relations: {
      CHAR_0002: { score: 60, description: 'освятил его знамёна' },
      CHAR_0003: { score: -10, description: 'финикиец, не чтит богов' },
    },

    history: [
      { turn: 0, event: 'Начало игры. Советует воздержаться от войны — знамения неблагоприятны.' },
    ],

    portrait: '🏛️',
    description: 'Главный жрец храма Аполлона. Знает много тайн города. Пользуется любовью народа.',
  },

  {
    id: 'CHAR_0005',
    name: 'Феано, дочь Менона',
    age: 28,
    role: 'advisor',
    nation: 'syracuse',
    alive: true,
    health: 98,

    traits: {
      ambition: 70,
      caution: 55,
      loyalty: 50,
      piety: 45,
      cruelty: 25,
      greed: 35,
    },

    wants: ['влияние_при_дворе', 'образование_для_женщин', 'союз_с_египтом'],
    fears: ['брак_по_принуждению', 'война'],

    resources: {
      gold: 2100,
      land: 0,
      followers: 45,
      army_command: 0,
    },

    relations: {
      CHAR_0001: { score: 80, description: 'отец' },
      CHAR_0003: { score: 30, description: 'деловые контакты' },
    },

    history: [
      { turn: 0, event: 'Начало игры. Недавно вернулась из Александрии, где изучала философию.' },
    ],

    portrait: '👩',
    description: 'Образованная дочь сенатора. Понимает политику лучше многих мужчин двора. Дерзка.',
  },
];

// ──────────────────────────────────────────────────────────────────────
// Стартовые сенаторы Рима (9 чел., 3 фракции)
// faction_name совпадает с institution.factions[].name
// disposition — отношение к игроку/правителю (0–100, 50 = нейтрал)
// ambition_goal — личная цель-амбиция (короткая строка)
// ──────────────────────────────────────────────────────────────────────
const INITIAL_SENATORS_ROME = [

  // ── ОПТИМАТЫ (старая аристократия) ────────────────────────────────
  {
    id: 'ROME_SEN_001',
    name: 'Луций Корнелий Сулла',
    age: 52,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 78,
    faction_name: 'Оптиматы',
    disposition: 45,   // слегка подозрителен
    ambition_goal: 'стать_диктатором',
    traits: { ambition: 92, caution: 30, loyalty: 40, piety: 35, cruelty: 80, greed: 55 },
    wants: ['noble_privilege', 'tradition', 'military_supremacy'],
    fears: ['populism', 'land_reform'],
    resources: { gold: 14000, land: 12, followers: 380, army_command: 2000 },
    relations: { ROME_SEN_002: { score: 60, description: 'союзник по фракции' }, ROME_SEN_006: { score: -40, description: 'ненавидит демагогов' } },
    history: [{ turn: 0, event: 'Возглавляет фракцию оптиматов. Метит на диктатуру.' }],
    portrait: '🦅',
    description: 'Холодный и расчётливый патриций. Убеждён, что Рим принадлежит старой знати.',
  },
  {
    id: 'ROME_SEN_002',
    name: 'Квинт Цецилий Метелл',
    age: 61,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 68,
    faction_name: 'Оптиматы',
    disposition: 50,
    ambition_goal: 'сохранить_власть_сената',
    traits: { ambition: 60, caution: 78, loyalty: 65, piety: 72, cruelty: 25, greed: 45 },
    wants: ['noble_privilege', 'tradition'],
    fears: ['land_reform', 'populism'],
    resources: { gold: 9500, land: 15, followers: 210, army_command: 0 },
    relations: { ROME_SEN_001: { score: 60, description: 'вместе противостоят популярам' } },
    history: [{ turn: 0, event: 'Начало игры. Держится за привилегии нобилей.' }],
    portrait: '👴',
    description: 'Старый патриций, чтящий традиции предков. Не любит перемен. Очень осторожен.',
  },
  {
    id: 'ROME_SEN_003',
    name: 'Марк Лициний Красс',
    age: 44,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 90,
    faction_name: 'Оптиматы',
    disposition: 55,
    ambition_goal: 'стать_богатейшим_в_риме',
    traits: { ambition: 78, caution: 55, loyalty: 42, piety: 20, cruelty: 40, greed: 97 },
    wants: ['noble_privilege', 'trade_monopoly'],
    fears: ['treasury_reform', 'conscription_of_clients'],
    resources: { gold: 42000, land: 20, followers: 500, army_command: 0 },
    relations: { ROME_SEN_007: { score: 30, description: 'деловые контакты' } },
    history: [{ turn: 0, event: 'Богатейший человек Рима. Скупает дома и земли.' }],
    portrait: '💎',
    description: 'Невероятно богатый сенатор. Убеждён, что деньги решают всё. Продажен, но умело скрывает это.',
  },

  // ── ПОПУЛЯРЫ (народная фракция) ───────────────────────────────────
  {
    id: 'ROME_SEN_004',
    name: 'Гай Семпроний Гракх',
    age: 37,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 96,
    faction_name: 'Популяры',
    disposition: 48,
    ambition_goal: 'провести_земельную_реформу',
    traits: { ambition: 85, caution: 25, loyalty: 70, piety: 45, cruelty: 15, greed: 12 },
    wants: ['land_reform', 'cheap_grain', 'rights_for_plebs'],
    fears: ['oligarchy', 'debt_slavery'],
    resources: { gold: 2400, land: 1, followers: 620, army_command: 0 },
    relations: { ROME_SEN_001: { score: -55, description: 'идейный враг' }, ROME_SEN_005: { score: 70, description: 'союзник по реформам' } },
    history: [{ turn: 0, event: 'Пламенный трибун. Воюет за землю для бедных.' }],
    portrait: '✊',
    description: 'Молодой и дерзкий народный трибун. Верит в справедливость и презирает знать.',
  },
  {
    id: 'ROME_SEN_005',
    name: 'Марк Туллий Цицерон',
    age: 42,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 88,
    faction_name: 'Популяры',
    disposition: 52,
    ambition_goal: 'стать_первым_оратором_рима',
    traits: { ambition: 75, caution: 65, loyalty: 58, piety: 50, cruelty: 10, greed: 30 },
    wants: ['cheap_grain', 'rule_of_law', 'rights_for_plebs'],
    fears: ['tyranny', 'civil_war'],
    resources: { gold: 4100, land: 3, followers: 290, army_command: 0 },
    relations: { ROME_SEN_004: { score: 70, description: 'единомышленник' }, ROME_SEN_003: { score: 15, description: 'уважает богатство' } },
    history: [{ turn: 0, event: 'Оратор и юрист. Стоит между фракциями, склоняясь к народу.' }],
    portrait: '📜',
    description: 'Блестящий оратор новой волны. Не знатен по рождению, но завоевал уважение словом.',
  },
  {
    id: 'ROME_SEN_006',
    name: 'Луций Аппулей Сатурнин',
    age: 39,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 83,
    faction_name: 'Популяры',
    disposition: 38,  // агрессивен, не доверяет власти
    ambition_goal: 'уничтожить_власть_оптиматов',
    traits: { ambition: 88, caution: 18, loyalty: 60, piety: 22, cruelty: 50, greed: 20 },
    wants: ['land_reform', 'cheap_grain'],
    fears: ['oligarchy', 'conscription'],
    resources: { gold: 1200, land: 0, followers: 840, army_command: 0 },
    relations: { ROME_SEN_001: { score: -40, description: 'открытый враг' }, ROME_SEN_004: { score: 65, description: 'радикальный союзник' } },
    history: [{ turn: 0, event: 'Радикальный популяр. Готов к уличным столкновениям.' }],
    portrait: '🔥',
    description: 'Агрессивный демагог. Трибун улиц. Ненавидит оптиматов лично и искренне.',
  },

  // ── НОВЫЕ ЛЮДИ (новая аристократия, выдвиженцы) ───────────────────
  {
    id: 'ROME_SEN_007',
    name: 'Гай Юлий Цезарь',
    age: 35,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 99,
    faction_name: 'Новые люди',
    disposition: 60,
    ambition_goal: 'завоевать_галлию',
    traits: { ambition: 99, caution: 45, loyalty: 50, piety: 38, cruelty: 48, greed: 55 },
    wants: ['merit_promotion', 'military_command', 'trade'],
    fears: ['closed_citizenship', 'senate_veto'],
    resources: { gold: 5800, land: 4, followers: 450, army_command: 500 },
    relations: { ROME_SEN_003: { score: 30, description: 'союз против оптиматов' }, ROME_SEN_001: { score: -20, description: 'конкурент за первенство' } },
    history: [{ turn: 0, event: 'Амбициозный аристократ, тянущийся к народу. Прокладывает путь к власти.' }],
    portrait: '⚡',
    description: 'Молодой, харизматичный и опасно умный. Играет и с оптиматами, и с популярами.',
  },
  {
    id: 'ROME_SEN_008',
    name: 'Гней Помпей Великий',
    age: 40,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 94,
    faction_name: 'Новые люди',
    disposition: 58,
    ambition_goal: 'стать_единственным_полководцем_рима',
    traits: { ambition: 82, caution: 50, loyalty: 62, piety: 48, cruelty: 35, greed: 42 },
    wants: ['merit_promotion', 'military_command'],
    fears: ['closed_citizenship', 'senate_curbs_on_military'],
    resources: { gold: 8200, land: 6, followers: 310, army_command: 3500 },
    relations: { ROME_SEN_007: { score: 25, description: 'союзник, но конкурент' }, ROME_SEN_002: { score: 20, description: 'признаёт заслуги' } },
    history: [{ turn: 0, event: 'Прославленный полководец. Уже имеет прозвище Великий.' }],
    portrait: '🏆',
    description: 'Полководец-триумфатор с огромной армией. Уважаем, но завидует Цезарю.',
  },
  {
    id: 'ROME_SEN_009',
    name: 'Марк Порций Катон',
    age: 58,
    role: 'senator',
    nation: 'rome',
    alive: true,
    health: 75,
    faction_name: 'Новые люди',
    disposition: 42,
    ambition_goal: 'уничтожить_карфаген',
    traits: { ambition: 65, caution: 70, loyalty: 80, piety: 75, cruelty: 28, greed: 10 },
    wants: ['merit_promotion', 'trade', 'military_expansion'],
    fears: ['closed_citizenship', 'luxury_and_decadence'],
    resources: { gold: 3600, land: 5, followers: 175, army_command: 0 },
    relations: { ROME_SEN_007: { score: -15, description: 'не доверяет харизматикам' }, ROME_SEN_002: { score: 40, description: 'уважает традиции' } },
    history: [{ turn: 0, event: 'Строгий моралист. Считает, что Карфаген должен быть разрушен.' }],
    portrait: '⚖️',
    description: 'Принципиальный и суровый. Всякий раз заканчивает речь словами о Карфагене.',
  },
];

// Схема для генерации персонажей через AI
const CHARACTER_SCHEMA = {
  id: 'string (CHAR_XXXX)',
  name: 'string (греческое имя и происхождение)',
  age: 'number (25-75)',
  role: 'senator|advisor|general|priest|merchant',
  nation: 'string',
  alive: true,
  health: 'number (50-100)',
  traits: {
    ambition: 'number (0-100)',
    caution: 'number (0-100)',
    loyalty: 'number (0-100)',
    piety: 'number (0-100)',
    cruelty: 'number (0-100)',
    greed: 'number (0-100)',
  },
  wants: 'array of strings (2-3 желания)',
  fears: 'array of strings (1-2 страха)',
  resources: {
    gold: 'number',
    land: 'number',
    followers: 'number',
    army_command: 'number',
  },
  relations: 'object {CHAR_ID: {score, description}}',
  history: 'array [{turn, event}]',
  portrait: 'emoji',
  description: 'string (1-2 предложения)',
};
