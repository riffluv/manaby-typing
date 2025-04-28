/**
 * タイピングゲームの問題データ
 * 難易度ごとに分類
 */

// 簡単な問題セット
export const easyProblems = [
  { displayText: 'ねこ', kanaText: 'ねこ' },
  { displayText: 'いぬ', kanaText: 'いぬ' },
  { displayText: 'さかな', kanaText: 'さかな' },
  { displayText: 'とり', kanaText: 'とり' },
  { displayText: 'うさぎ', kanaText: 'うさぎ' },
  { displayText: 'あか', kanaText: 'あか' },
  { displayText: 'あお', kanaText: 'あお' },
  { displayText: 'やま', kanaText: 'やま' },
  { displayText: 'うみ', kanaText: 'うみ' },
  { displayText: 'かわ', kanaText: 'かわ' },
];

// 普通の問題セット
export const normalProblems = [
  { displayText: 'たべもの', kanaText: 'たべもの' },
  { displayText: 'のみもの', kanaText: 'のみもの' },
  { displayText: 'くるま', kanaText: 'くるま' },
  { displayText: 'でんしゃ', kanaText: 'でんしゃ' },
  { displayText: 'ひこうき', kanaText: 'ひこうき' },
  { displayText: 'トマト食べたい', kanaText: 'とまとたべたい' },
  { displayText: 'こんにちは世界', kanaText: 'こんにちはせかい' },
  { displayText: 'タイピングゲーム', kanaText: 'たいぴんぐげーむ' },
  { displayText: '頑張ってください', kanaText: 'がんばってください' },
  { displayText: 'にほん', kanaText: 'にほん' },
  // 追加の問題
  { displayText: 'スポーツをする', kanaText: 'すぽーつをする' },
  { displayText: '音楽を聴く', kanaText: 'おんがくをきく' },
  { displayText: '映画を見る', kanaText: 'えいがをみる' },
  { displayText: '料理を作る', kanaText: 'りょうりをつくる' },
  { displayText: '本を読む', kanaText: 'ほんをよむ' },
  { displayText: '自転車に乗る', kanaText: 'じてんしゃにのる' },
  { displayText: '友達と話す', kanaText: 'ともだちとはなす' },
  { displayText: '公園で遊ぶ', kanaText: 'こうえんであそぶ' },
  { displayText: '朝ごはんを食べる', kanaText: 'あさごはんをたべる' },
  { displayText: '学校に行く', kanaText: 'がっこうにいく' },
];

// 難しい問題セット
export const hardProblems = [
  { displayText: 'プログラミング楽しい', kanaText: 'ぷろぐらみんぐたのしい' },
  {
    displayText: '私は毎日勉強します',
    kanaText: 'わたしはまいにちべんきょうします',
  },
  {
    displayText: '富士山は日本一高い山です',
    kanaText: 'ふじさんはにほんいちたかいやまです',
  },
  { displayText: 'いんたーねっとのせかい', kanaText: 'いんたーねっとのせかい' },
  {
    displayText: '明日も晴れるといいですね',
    kanaText: 'あしたもはれるといいですね',
  },
  {
    displayText: '素早くタイピングしましょう',
    kanaText: 'すばやくたいぴんぐしましょう',
  },
  {
    displayText: 'キーボードの練習をします',
    kanaText: 'きーぼーどのれんしゅうをします',
  },
  {
    displayText: '日本語を勉強しています',
    kanaText: 'にほんごをべんきょうしています',
  },
  { displayText: '桜の花が綺麗ですね', kanaText: 'さくらのはながきれいですね' },
  {
    displayText: 'プログラミングは難しいですが面白いです',
    kanaText: 'ぷろぐらみんぐはむずかしいですがおもしろいです',
  },
  // 追加の問題
  {
    displayText: '東京は日本の首都です',
    kanaText: 'とうきょうはにほんのしゅとです',
  },
  {
    displayText: '四季折々の美しさがあります',
    kanaText: 'しきおりおりのうつくしさがあります',
  },
  {
    displayText: '自然災害に気をつけましょう',
    kanaText: 'しぜんさいがいにきをつけましょう',
  },
  {
    displayText: '新幹線は高速で移動できます',
    kanaText: 'しんかんせんはこうそくでいどうできます',
  },
  {
    displayText: '人工知能の発展は著しいです',
    kanaText: 'じんこうちのうのはってんはいちじるしいです',
  },
  {
    displayText: 'オリンピックは世界的なスポーツ大会です',
    kanaText: 'おりんぴっくはせかいてきなすぽーつたいかいです',
  },
  {
    displayText: '持続可能な社会を目指しています',
    kanaText: 'じぞくかのうなしゃかいをめざしています',
  },
  {
    displayText: '環境問題に取り組むべきです',
    kanaText: 'かんきょうもんだいにとりくむべきです',
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
 * @param {string} difficulty - 難易度 ('easy', 'normal', 'hard')
 * @returns {Array} 問題セット
 */
export const getProblemsByDifficulty = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return easyProblems;
    case 'normal':
      return normalProblems;
    case 'hard':
      return hardProblems;
    default:
      return allProblems;
  }
};

/**
 * ランダムに並べ替えられた問題リストを取得する
 * @param {string} difficulty - 難易度 ('easy', 'normal', 'hard')
 * @param {number} count - 取得する問題数（省略時は全問題）
 * @returns {Array} ランダム化された問題セット
 */
export const getRandomizedProblems = (difficulty, count = null) => {
  // 難易度に応じた問題リストを取得
  const problems = getProblemsByDifficulty(difficulty);
  
  // 問題をランダムに並べ替え
  const shuffled = [...problems].sort(() => Math.random() - 0.5);
  
  // 指定数だけ返す、または全問題を返す
  if (count && count > 0 && count < shuffled.length) {
    return shuffled.slice(0, count);
  }
  
  return shuffled;
};

export default {
  easyProblems,
  normalProblems,
  hardProblems,
  allProblems,
  getProblemsByDifficulty,
  getRandomizedProblems,
};
