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
