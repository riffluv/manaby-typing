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
  POSITIVE: 'positive', // ポジティブワード用の新しいカテゴリを追加
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
    displayText: '笑顔', 
    kanaText: 'えがお', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '希望', 
    kanaText: 'きぼう', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '元気', 
    kanaText: 'げんき', 
    category: CATEGORIES.POSITIVE,
    tags: ['状態', 'ポジティブ'],
  },
  { 
    displayText: '勇気', 
    kanaText: 'ゆうき', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '夢', 
    kanaText: 'ゆめ', 
    category: CATEGORIES.POSITIVE,
    tags: ['概念', 'ポジティブ'],
  },
  { 
    displayText: '愛', 
    kanaText: 'あい', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '光', 
    kanaText: 'ひかり', 
    category: CATEGORIES.POSITIVE,
    tags: ['自然', 'ポジティブ'],
  },
  { 
    displayText: '前進', 
    kanaText: 'ぜんしん', 
    category: CATEGORIES.POSITIVE,
    tags: ['行動', 'ポジティブ'],
  },
  { 
    displayText: '成功', 
    kanaText: 'せいこう', 
    category: CATEGORIES.POSITIVE,
    tags: ['達成', 'ポジティブ'],
  },
  { 
    displayText: '努力', 
    kanaText: 'どりょく', 
    category: CATEGORIES.POSITIVE,
    tags: ['行動', 'ポジティブ'],
  },
  { 
    displayText: '信頼', 
    kanaText: 'しんらい', 
    category: CATEGORIES.POSITIVE,
    tags: ['関係', 'ポジティブ'],
  },
  { 
    displayText: '感謝', 
    kanaText: 'かんしゃ', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '挑戦', 
    kanaText: 'ちょうせん', 
    category: CATEGORIES.POSITIVE,
    tags: ['行動', 'ポジティブ'],
  },
  { 
    displayText: '自信', 
    kanaText: 'じしん', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '幸福', 
    kanaText: 'こうふく', 
    category: CATEGORIES.POSITIVE,
    tags: ['状態', 'ポジティブ'],
  },
  { 
    displayText: '成長', 
    kanaText: 'せいちょう', 
    category: CATEGORIES.POSITIVE,
    tags: ['変化', 'ポジティブ'],
  },
  { 
    displayText: '平和', 
    kanaText: 'へいわ', 
    category: CATEGORIES.POSITIVE,
    tags: ['状態', 'ポジティブ'],
  },
  { 
    displayText: '安心', 
    kanaText: 'あんしん', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '笑い', 
    kanaText: 'わらい', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '喜び', 
    kanaText: 'よろこび', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '友情', 
    kanaText: 'ゆうじょう', 
    category: CATEGORIES.POSITIVE,
    tags: ['関係', 'ポジティブ'],
  },
  { 
    displayText: '愛情', 
    kanaText: 'あいじょう', 
    category: CATEGORIES.POSITIVE,
    tags: ['感情', 'ポジティブ'],
  },
  { 
    displayText: '誠実', 
    kanaText: 'せいじつ', 
    category: CATEGORIES.POSITIVE,
    tags: ['特性', 'ポジティブ'],
  },
  { 
    displayText: '忍耐', 
    kanaText: 'にんたい', 
    category: CATEGORIES.POSITIVE,
    tags: ['特性', 'ポジティブ'],
  },
  { 
    displayText: '力', 
    kanaText: 'ちから', 
    category: CATEGORIES.POSITIVE,
    tags: ['特性', 'ポジティブ'],
  },
  { 
    displayText: '知恵', 
    kanaText: 'ちえ', 
    category: CATEGORIES.POSITIVE,
    tags: ['特性', 'ポジティブ'],
  },
  { 
    displayText: '未来', 
    kanaText: 'みらい', 
    category: CATEGORIES.POSITIVE,
    tags: ['時間', 'ポジティブ'],
  },
  { 
    displayText: '信念', 
    kanaText: 'しんねん', 
    category: CATEGORIES.POSITIVE,
    tags: ['考え', 'ポジティブ'],
  },
];

// 普通の問題セット
export const normalProblems = [
  { 
    displayText: '今日も一日頑張ろう', 
    kanaText: 'きょうもいちにちがんばろう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '日常'],
  },
  { 
    displayText: '笑顔で過ごそう', 
    kanaText: 'えがおですごそう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分を信じて', 
    kanaText: 'じぶんをしんじて', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '夢に向かって進もう', 
    kanaText: 'ゆめにむかってすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '目標'],
  },
  { 
    displayText: '小さな幸せを大切に', 
    kanaText: 'ちいさなしあわせをたいせつに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '幸福'],
  },
  { 
    displayText: '前向きな気持ちで', 
    kanaText: 'まえむきなきもちで', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '新しい挑戦を楽しもう', 
    kanaText: 'あたらしいちょうせんをたのしもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '挑戦'],
  },
  { 
    displayText: '失敗は成功のもと', 
    kanaText: 'しっぱいはせいこうのもと', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '励まし'],
  },
  { 
    displayText: '努力は必ず報われる', 
    kanaText: 'どりょくはかならずむくわれる', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '努力'],
  },
  { 
    displayText: '一歩ずつ前進しよう', 
    kanaText: 'いっぽずつぜんしんしよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '心に太陽を持とう', 
    kanaText: 'こころにたいようをもとう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分らしく生きよう', 
    kanaText: 'じぶんらしくいきよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '感謝の気持ちを忘れずに', 
    kanaText: 'かんしゃのきもちをわすれずに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '感謝'],
  },
  { 
    displayText: '仲間と共に歩もう', 
    kanaText: 'なかまとともにあゆもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '協力'],
  },
  { 
    displayText: '笑う門には福来る', 
    kanaText: 'わらうかどにはふくきたる', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', 'ポジティブ'],
  },
  { 
    displayText: '明日は明日の風が吹く', 
    kanaText: 'あしたはあしたのかぜがふく', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '未来'],
  },
  { 
    displayText: '七転び八起き', 
    kanaText: 'ななころびやおき', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '挑戦'],
  },
  { 
    displayText: '継続は力なり', 
    kanaText: 'けいぞくはちからなり', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '努力'],
  },
  { 
    displayText: '雨降って地固まる', 
    kanaText: 'あめふってじかたまる', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '希望'],
  },
  { 
    displayText: '思い立ったが吉日', 
    kanaText: 'おもいたったがきちじつ', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '行動'],
  },
  { 
    displayText: '夢を持ち続けよう', 
    kanaText: 'ゆめをもちつづけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '夢'],
  },
  { 
    displayText: '自分のペースで進もう', 
    kanaText: 'じぶんのぺーすですすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '小さな一歩が大きな成果に', 
    kanaText: 'ちいさないっぽがおおきなせいかに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '前向きな言葉を口にしよう', 
    kanaText: 'まえむきなことばをくちにしよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '心の声に耳を傾けよう', 
    kanaText: 'こころのこえにみみをかたむけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己理解'],
  },
  { 
    displayText: '自分を大切にしよう', 
    kanaText: 'じぶんをたいせつにしよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい自分に出会おう', 
    kanaText: 'あたらしいじぶんにであおう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '可能性は無限大', 
    kanaText: 'かのうせいはむげんだい', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '可能性'],
  },
  { 
    displayText: '変化を楽しもう', 
    kanaText: 'へんかをたのしもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '変化'],
  },
  { 
    displayText: '自分の道を信じて', 
    kanaText: 'じぶんのみちをしんじて', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
];

// 難しい問題セット
export const hardProblems = [
  { 
    displayText: '失敗は成功のもと', 
    kanaText: 'しっぱいはせいこうのもと', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '励まし'],
  },
  { 
    displayText: '継続は力なり', 
    kanaText: 'けいぞくはちからなり', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '努力'],
  },
  { 
    displayText: '七転び八起き', 
    kanaText: 'ななころびやおき', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '挑戦'],
  },
  { 
    displayText: '雨降って地固まる', 
    kanaText: 'あめふってじかたまる', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '希望'],
  },
  { 
    displayText: '思い立ったが吉日', 
    kanaText: 'おもいたったがきちじつ', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '行動'],
  },
  { 
    displayText: '笑う門には福来る', 
    kanaText: 'わらうかどにはふくきたる', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', 'ポジティブ'],
  },
  { 
    displayText: '明日は明日の風が吹く', 
    kanaText: 'あしたはあしたのかぜがふく', 
    category: CATEGORIES.POSITIVE,
    tags: ['格言', '未来'],
  },
  { 
    displayText: '自分を信じて前に進もう', 
    kanaText: 'じぶんをしんじてまえにすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '努力は必ず報われる', 
    kanaText: 'どりょくはかならずむくわれる', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '努力'],
  },
  { 
    displayText: '夢を持ち続けよう', 
    kanaText: 'ゆめをもちつづけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '夢'],
  },
  { 
    displayText: '心の声に耳を傾けよう', 
    kanaText: 'こころのこえにみみをかたむけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己理解'],
  },
  { 
    displayText: '自分の可能性を信じて', 
    kanaText: 'じぶんのかのうせいをしんじて', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '可能性'],
  },
  { 
    displayText: '新しい挑戦を恐れずに', 
    kanaText: 'あたらしいちょうせんをおそれずに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '挑戦'],
  },
  { 
    displayText: '自分の道を信じて進もう', 
    kanaText: 'じぶんのみちをしんじてすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '毎日を笑顔で過ごそう', 
    kanaText: 'まいにちをえがおですごそう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分を褒めてあげよう', 
    kanaText: 'じぶんをほめてあげよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい自分を見つけよう', 
    kanaText: 'あたらしいじぶんをみつけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の可能性を広げよう', 
    kanaText: 'じぶんのかのうせいをひろげよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '可能性'],
  },
  { 
    displayText: '一歩ずつ夢に近づこう', 
    kanaText: 'いっぽずつゆめにちかづこう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '目標'],
  },
  { 
    displayText: '自分の心に正直に', 
    kanaText: 'じぶんのこころにしょうじきに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己理解'],
  },
  { 
    displayText: '毎日を楽しもう', 
    kanaText: 'まいにちをたのしもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分の人生を大切に', 
    kanaText: 'じぶんのじんせいをたいせつに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい発見を楽しもう', 
    kanaText: 'あたらしいはっけんをたのしもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の成長を感じよう', 
    kanaText: 'じぶんのせいちょうをかんじよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '未来は自分の手で切り開こう', 
    kanaText: 'みらいはじぶんのてできりひらこう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '未来'],
  },
  { 
    displayText: '困難は成長のチャンス', 
    kanaText: 'こんなんはせいちょうのちゃんす', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の夢を信じて進もう', 
    kanaText: 'じぶんのゆめをしんじてすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '夢'],
  },
  { 
    displayText: '小さな一歩が大きな成果に', 
    kanaText: 'ちいさないっぽがおおきなせいかに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の力を信じて挑戦しよう', 
    kanaText: 'じぶんのちからをしんじてちょうせんしよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '挑戦'],
  },
  { 
    displayText: '前向きな気持ちで毎日を過ごそう', 
    kanaText: 'まえむきなきもちでまいにちをすごそう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分の価値を信じて生きよう', 
    kanaText: 'じぶんのかちをしんじていきよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい自分に出会う旅に出よう', 
    kanaText: 'あたらしいじぶんにであうたびにでよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の可能性を信じて進もう', 
    kanaText: 'じぶんのかのうせいをしんじてすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '可能性'],
  },
  { 
    displayText: '毎日を大切に生きよう', 
    kanaText: 'まいにちをたいせつにいきよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '日常'],
  },
  { 
    displayText: '自分の夢を追いかけ続けよう', 
    kanaText: 'じぶんのゆめをおいかけつづけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '夢'],
  },
  { 
    displayText: '心の中の光を信じて進もう', 
    kanaText: 'こころのなかのひかりをしんじてすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '希望'],
  },
  { 
    displayText: '自分の歩幅で前に進もう', 
    kanaText: 'じぶんのほはばでまえにすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '毎日を笑顔で過ごすことを忘れずに', 
    kanaText: 'まいにちをえがおですごすことをわすれずに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分を大切にすることを忘れずに', 
    kanaText: 'じぶんをたいせつにすることをわすれずに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい挑戦を楽しもう', 
    kanaText: 'あたらしいちょうせんをたのしもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '挑戦'],
  },
  { 
    displayText: '自分の成長を喜ぼう', 
    kanaText: 'じぶんのせいちょうをよろこぼう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '未来への一歩を踏み出そう', 
    kanaText: 'みらいへのいっぽをふみだそう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '行動'],
  },
  { 
    displayText: '自分の可能性を信じて挑戦しよう', 
    kanaText: 'じぶんのかのうせいをしんじてちょうせんしよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '挑戦'],
  },
  { 
    displayText: '毎日を楽しむことを忘れずに', 
    kanaText: 'まいにちをたのしむことをわすれずに', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分の夢を追い続けよう', 
    kanaText: 'じぶんのゆめをおいつづけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '夢'],
  },
  { 
    displayText: '心の声に従って生きよう', 
    kanaText: 'こころのこえにしたがっていきよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己理解'],
  },
  { 
    displayText: '自分の人生を自分らしく生きよう', 
    kanaText: 'じぶんのじんせいをじぶんらしくいきよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '自己肯定'],
  },
  { 
    displayText: '新しい自分を見つける旅に出よう', 
    kanaText: 'あたらしいじぶんをみつけるたびにでよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '成長'],
  },
  { 
    displayText: '自分の可能性を信じて未来へ進もう', 
    kanaText: 'じぶんのかのうせいをしんじてみらいへすすもう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '可能性'],
  },
  { 
    displayText: '毎日を笑顔で過ごすことを心がけよう', 
    kanaText: 'まいにちをえがおですごすことをこころがけよう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', 'ポジティブ'],
  },
  { 
    displayText: '自分を信じて前に進む勇気を持とう', 
    kanaText: 'じぶんをしんじてまえにすすむゆうきをもとう', 
    category: CATEGORIES.POSITIVE,
    tags: ['励まし', '勇気'],
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
