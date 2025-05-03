/**
 * タイピングゲームの問題データ
 * 難易度とカテゴリに基づいて構造化
 */

// 問題のカテゴリ定義
export const CATEGORIES = {
  ANIMALS: 'animals',
  NATURE: 'nature',
  COLORS: 'colors',
  FOOD: 'food',
  TRANSPORT: 'transport',
  ACTIVITIES: 'activities',
  SENTENCES: 'sentences',
  PROGRAMMING: 'programming',
  GEOGRAPHY: 'geography',
  SCIENCE: 'science',
  GENERAL: 'general',
};

// 難易度の定義
export const DIFFICULTIES = {
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
  ALL: 'all',
};

// 簡単な問題セット
export const easyProblems = [
  { 
    displayText: 'ねこ', 
    kanaText: 'ねこ', 
    category: CATEGORIES.ANIMALS,
    tags: ['動物', 'ペット'],
  },
  { 
    displayText: 'いぬ', 
    kanaText: 'いぬ', 
    category: CATEGORIES.ANIMALS,
    tags: ['動物', 'ペット'],
  },
  { 
    displayText: 'さかな', 
    kanaText: 'さかな', 
    category: CATEGORIES.ANIMALS,
    tags: ['動物', '海'],
  },
  { 
    displayText: 'とり', 
    kanaText: 'とり', 
    category: CATEGORIES.ANIMALS,
    tags: ['動物', '空'],
  },
  { 
    displayText: 'うさぎ', 
    kanaText: 'うさぎ', 
    category: CATEGORIES.ANIMALS,
    tags: ['動物', 'ペット'],
  },
  { 
    displayText: 'あか', 
    kanaText: 'あか', 
    category: CATEGORIES.COLORS,
    tags: ['色'],
  },
  { 
    displayText: 'あお', 
    kanaText: 'あお', 
    category: CATEGORIES.COLORS,
    tags: ['色'],
  },
  { 
    displayText: 'やま', 
    kanaText: 'やま', 
    category: CATEGORIES.NATURE,
    tags: ['自然'],
  },
  { 
    displayText: 'うみ', 
    kanaText: 'うみ', 
    category: CATEGORIES.NATURE,
    tags: ['自然', '水'],
  },
  { 
    displayText: 'かわ', 
    kanaText: 'かわ', 
    category: CATEGORIES.NATURE,
    tags: ['自然', '水'],
  },
];

// 普通の問題セット
export const normalProblems = [
  { 
    displayText: 'たべもの', 
    kanaText: 'たべもの', 
    category: CATEGORIES.FOOD,
    tags: ['食事'],
  },
  { 
    displayText: 'のみもの', 
    kanaText: 'のみもの', 
    category: CATEGORIES.FOOD,
    tags: ['飲料'],
  },
  { 
    displayText: 'くるま', 
    kanaText: 'くるま', 
    category: CATEGORIES.TRANSPORT,
    tags: ['乗り物'],
  },
  { 
    displayText: 'でんしゃ', 
    kanaText: 'でんしゃ', 
    category: CATEGORIES.TRANSPORT,
    tags: ['乗り物'],
  },
  { 
    displayText: 'ひこうき', 
    kanaText: 'ひこうき', 
    category: CATEGORIES.TRANSPORT,
    tags: ['乗り物', '空'],
  },
  { 
    displayText: 'トマト食べたい', 
    kanaText: 'とまとたべたい', 
    category: CATEGORIES.FOOD,
    tags: ['食事', '野菜'],
  },
  { 
    displayText: 'こんにちは世界', 
    kanaText: 'こんにちはせかい', 
    category: CATEGORIES.PROGRAMMING,
    tags: ['挨拶', 'プログラミング'],
  },
  { 
    displayText: 'タイピングゲーム', 
    kanaText: 'たいぴんぐげーむ', 
    category: CATEGORIES.GENERAL,
    tags: ['ゲーム', 'コンピューター'],
  },
  { 
    displayText: '頑張ってください', 
    kanaText: 'がんばってください', 
    category: CATEGORIES.SENTENCES,
    tags: ['応援', '励まし'],
  },
  { 
    displayText: 'にほん', 
    kanaText: 'にほん', 
    category: CATEGORIES.GEOGRAPHY,
    tags: ['国'],
  },
  // 追加の問題
  { 
    displayText: 'スポーツをする', 
    kanaText: 'すぽーつをする', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['運動'],
  },
  { 
    displayText: '音楽を聴く', 
    kanaText: 'おんがくをきく', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['音楽', 'リラックス'],
  },
  { 
    displayText: '映画を見る', 
    kanaText: 'えいがをみる', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['映画', '娯楽'],
  },
  { 
    displayText: '料理を作る', 
    kanaText: 'りょうりをつくる', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['料理', '食事'],
  },
  { 
    displayText: '本を読む', 
    kanaText: 'ほんをよむ', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['読書', '学習'],
  },
  { 
    displayText: '自転車に乗る', 
    kanaText: 'じてんしゃにのる', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['自転車', '移動'],
  },
  { 
    displayText: '友達と話す', 
    kanaText: 'ともだちとはなす', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['会話', '社交'],
  },
  { 
    displayText: '公園で遊ぶ', 
    kanaText: 'こうえんであそぶ', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['遊び', 'アウトドア'],
  },
  { 
    displayText: '朝ごはんを食べる', 
    kanaText: 'あさごはんをたべる', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['食事', '朝'],
  },
  { 
    displayText: '学校に行く', 
    kanaText: 'がっこうにいく', 
    category: CATEGORIES.ACTIVITIES,
    tags: ['教育', '学習'],
  },
];

// 難しい問題セット
export const hardProblems = [
  { 
    displayText: 'プログラミング楽しい', 
    kanaText: 'ぷろぐらみんぐたのしい', 
    category: CATEGORIES.PROGRAMMING,
    tags: ['コンピューター'],
  },
  {
    displayText: '私は毎日勉強します',
    kanaText: 'わたしはまいにちべんきょうします',
    category: CATEGORIES.SENTENCES,
    tags: ['学習', '日常'],
  },
  {
    displayText: '富士山は日本一高い山です',
    kanaText: 'ふじさんはにほんいちたかいやまです',
    category: CATEGORIES.GEOGRAPHY,
    tags: ['地理', '山'],
  },
  { 
    displayText: 'いんたーねっとのせかい', 
    kanaText: 'いんたーねっとのせかい', 
    category: CATEGORIES.PROGRAMMING,
    tags: ['インターネット', 'プログラミング'],
  },
  {
    displayText: '明日も晴れるといいですね',
    kanaText: 'あしたもはれるといいですね',
    category: CATEGORIES.SENTENCES,
    tags: ['天気', '日常'],
  },
  {
    displayText: '素早くタイピングしましょう',
    kanaText: 'すばやくたいぴんぐしましょう',
    category: CATEGORIES.PROGRAMMING,
    tags: ['タイピング', '練習'],
  },
  {
    displayText: 'キーボードの練習をします',
    kanaText: 'きーぼーどのれんしゅうをします',
    category: CATEGORIES.PROGRAMMING,
    tags: ['キーボード', '練習'],
  },
  {
    displayText: '日本語を勉強しています',
    kanaText: 'にほんごをべんきょうしています',
    category: CATEGORIES.SENTENCES,
    tags: ['言語', '学習'],
  },
  { 
    displayText: '桜の花が綺麗ですね', 
    kanaText: 'さくらのはながきれいですね', 
    category: CATEGORIES.NATURE,
    tags: ['自然', '花'],
  },
  {
    displayText: 'プログラミングは難しいですが面白いです',
    kanaText: 'ぷろぐらみんぐはむずかしいですがおもしろいです',
    category: CATEGORIES.PROGRAMMING,
    tags: ['プログラミング', '面白い'],
  },
  // 追加の問題
  {
    displayText: '東京は日本の首都です',
    kanaText: 'とうきょうはにほんのしゅとです',
    category: CATEGORIES.GEOGRAPHY,
    tags: ['地理', '都市'],
  },
  {
    displayText: '四季折々の美しさがあります',
    kanaText: 'しきおりおりのうつくしさがあります',
    category: CATEGORIES.NATURE,
    tags: ['自然', '四季'],
  },
  {
    displayText: '自然災害に気をつけましょう',
    kanaText: 'しぜんさいがいにきをつけましょう',
    category: CATEGORIES.SCIENCE,
    tags: ['科学', '自然'],
  },
  {
    displayText: '新幹線は高速で移動できます',
    kanaText: 'しんかんせんはこうそくでいどうできます',
    category: CATEGORIES.TRANSPORT,
    tags: ['交通', '新幹線'],
  },
  {
    displayText: '人工知能の発展は著しいです',
    kanaText: 'じんこうちのうのはってんはいちじるしいです',
    category: CATEGORIES.SCIENCE,
    tags: ['科学', '人工知能'],
  },
  {
    displayText: 'オリンピックは世界的なスポーツ大会です',
    kanaText: 'おりんぴっくはせかいてきなすぽーつたいかいです',
    category: CATEGORIES.ACTIVITIES,
    tags: ['スポーツ', 'オリンピック'],
  },
  {
    displayText: '持続可能な社会を目指しています',
    kanaText: 'じぞくかのうなしゃかいをめざしています',
    category: CATEGORIES.SCIENCE,
    tags: ['科学', '社会'],
  },
  {
    displayText: '環境問題に取り組むべきです',
    kanaText: 'かんきょうもんだいにとりくむべきです',
    category: CATEGORIES.SCIENCE,
    tags: ['科学', '環境'],
  },
];

// すべての問題リスト（デフォルト）
export const allProblems = [
  ...easyProblems,
  ...normalProblems,
  ...hardProblems,
];

/**
 * 難易度に基づいて問題セットを取得する
 * @param {string} difficulty - 難易度 (DIFFICULTIES定数を使用)
 * @returns {Array} 問題セット
 */
export const getProblemsByDifficulty = (difficulty) => {
  switch (difficulty) {
    case DIFFICULTIES.EASY:
      return easyProblems;
    case DIFFICULTIES.NORMAL:
      return normalProblems;
    case DIFFICULTIES.HARD:
      return hardProblems;
    default:
      return allProblems;
  }
};

/**
 * カテゴリに基づいて問題を取得する
 * @param {string} category - カテゴリ (CATEGORIES定数を使用)
 * @param {string} difficulty - 難易度で絞り込む場合に指定 (オプション)
 * @returns {Array} 問題セット
 */
export const getProblemsByCategory = (category, difficulty = null) => {
  // まず難易度で問題を絞り込む
  let problemSet = difficulty ? getProblemsByDifficulty(difficulty) : allProblems;
  
  // 次にカテゴリで絞り込む
  return problemSet.filter(problem => problem.category === category);
};

/**
 * タグに基づいて問題を取得する
 * @param {string} tag - タグ
 * @param {string} difficulty - 難易度で絞り込む場合に指定 (オプション)
 * @returns {Array} 問題セット
 */
export const getProblemsByTag = (tag, difficulty = null) => {
  // まず難易度で問題を絞り込む
  let problemSet = difficulty ? getProblemsByDifficulty(difficulty) : allProblems;
  
  // 次にタグで絞り込む
  return problemSet.filter(problem => problem.tags && problem.tags.includes(tag));
};

/**
 * ランダムに並べ替えられた問題リストを取得する
 * @param {string} difficulty - 難易度 (DIFFICULTIES定数を使用)
 * @param {number} count - 取得する問題数（省略時は全問題）
 * @param {string} category - 特定のカテゴリから取得する場合に指定 (オプション)
 * @returns {Array} ランダム化された問題セット
 */
export const getRandomizedProblems = (difficulty, count = null, category = null) => {
  // 難易度に応じた問題リストを取得
  let problems = getProblemsByDifficulty(difficulty);
  
  // カテゴリが指定されている場合は絞り込む
  if (category) {
    problems = problems.filter(problem => problem.category === category);
  }
  
  // 問題をランダムに並べ替え
  const shuffled = [...problems].sort(() => Math.random() - 0.5);
  
  // 指定数だけ返す、または全問題を返す
  if (count && count > 0 && count < shuffled.length) {
    return shuffled.slice(0, count);
  }
  
  return shuffled;
};

/**
 * 難易度ごとの問題数を取得する
 * @returns {Object} 難易度別の問題数
 */
export const getProblemCounts = () => {
  return {
    [DIFFICULTIES.EASY]: easyProblems.length,
    [DIFFICULTIES.NORMAL]: normalProblems.length,
    [DIFFICULTIES.HARD]: hardProblems.length,
    [DIFFICULTIES.ALL]: allProblems.length,
  };
};

/**
 * 利用可能なすべてのカテゴリを取得する
 * @returns {Array} カテゴリの配列
 */
export const getAllCategories = () => {
  return Object.values(CATEGORIES);
};

/**
 * 利用可能なすべてのタグを取得する
 * @returns {Array} 一意のタグの配列
 */
export const getAllTags = () => {
  const tags = new Set();
  
  allProblems.forEach(problem => {
    if (problem.tags) {
      problem.tags.forEach(tag => tags.add(tag));
    }
  });
  
  return Array.from(tags);
};

export default {
  CATEGORIES,
  DIFFICULTIES,
  easyProblems,
  normalProblems,
  hardProblems,
  allProblems,
  getProblemsByDifficulty,
  getProblemsByCategory,
  getProblemsByTag,
  getRandomizedProblems,
  getProblemCounts,
  getAllCategories,
  getAllTags,
};
