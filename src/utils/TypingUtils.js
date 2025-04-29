import * as wanakana from 'wanakana';

// TypingManiaのromajiMapを参考にしたローマ字変換マッピング
// etypingの実装を参考に拡張
const romajiMap = {
  あ: ['a'],
  い: ['i', 'yi'],
  う: ['u', 'wu'],
  え: ['e'],
  お: ['o'],
  か: ['ka', 'ca'],
  き: ['ki'],
  く: ['ku', 'cu', 'qu'],
  け: ['ke'],
  こ: ['ko', 'co'],
  さ: ['sa'],
  し: ['shi', 'si', 'ci'],
  す: ['su'],
  せ: ['se', 'ce'],
  そ: ['so'],
  た: ['ta'],
  ち: ['chi', 'ti'],
  つ: ['tsu', 'tu'],
  て: ['te'],
  と: ['to'],
  な: ['na'],
  に: ['ni'],
  ぬ: ['nu'],
  ね: ['ne'],
  の: ['no'],
  は: ['ha'],
  ひ: ['hi'],
  ふ: ['fu', 'hu'],
  へ: ['he'],
  ほ: ['ho'],
  ま: ['ma'],
  み: ['mi'],
  む: ['mu'],
  め: ['me'],
  も: ['mo'],
  や: ['ya'],
  ゆ: ['yu'],
  よ: ['yo'],
  ら: ['ra'],
  り: ['ri'],
  る: ['ru'],
  れ: ['re'],
  ろ: ['ro'],
  わ: ['wa'],
  ゐ: ['wyi'],
  ゑ: ['wye'],
  を: ['wo'],
  ん: ['nn', 'xn', 'n'],
  が: ['ga'],
  ぎ: ['gi'],
  ぐ: ['gu'],
  げ: ['ge'],
  ご: ['go'],
  ざ: ['za'],
  じ: ['ji', 'zi'],
  ず: ['zu'],
  ぜ: ['ze'],
  ぞ: ['zo'],
  だ: ['da'],
  ぢ: ['di', 'ji'],
  づ: ['du', 'zu'],
  で: ['de'],
  ど: ['do'],
  ば: ['ba'],
  び: ['bi'],
  ぶ: ['bu'],
  べ: ['be'],
  ぼ: ['bo'],
  ぱ: ['pa'],
  ぴ: ['pi'],
  ぷ: ['pu'],
  ぺ: ['pe'],
  ぽ: ['po'],
  うぁ: ['wha'],
  うぃ: ['whi'],
  うぇ: ['whe'],
  うぉ: ['who'],
  きゃ: ['kya'],
  きぃ: ['kyi'],
  きゅ: ['kyu'],
  きぇ: ['kye'],
  きょ: ['kyo'],
  くぁ: ['qa', 'qwa'],
  くぃ: ['qi', 'qwi'],
  くぇ: ['qe', 'qwe'],
  くぉ: ['qo', 'qwo'],
  くゃ: ['qya'],
  くゅ: ['qyu'],
  くょ: ['qyo'],
  しゃ: ['sha', 'sya'],
  しぃ: ['syi'],
  しゅ: ['shu', 'syu'],
  しぇ: ['she', 'sye'],
  しょ: ['sho', 'syo'],
  つぁ: ['tsa'],
  つぃ: ['tsi'],
  つぇ: ['tse'],
  つぉ: ['tso'],
  ちゃ: ['cha', 'tya'],
  ちぃ: ['tyi'],
  ちゅ: ['chu', 'tyu'],
  ちぇ: ['che', 'tye'],
  ちょ: ['cho', 'tyo'],
  てゃ: ['tha'],
  てぃ: ['thi'],
  てゅ: ['thu'],
  てぇ: ['the'],
  てょ: ['tho'],
  とぁ: ['twa'],
  とぃ: ['twi'],
  とぅ: ['twu'],
  とぇ: ['twe'],
  とぉ: ['two'],
  ひゃ: ['hya'],
  ひぃ: ['hyi'],
  ひゅ: ['hyu'],
  ひぇ: ['hye'],
  ひょ: ['hyo'],
  ふぁ: ['fa'],
  ふぃ: ['fi'],
  ふぇ: ['fe'],
  ふぉ: ['fo'],
  にゃ: ['nya'],
  にぃ: ['nyi'],
  にゅ: ['nyu'],
  にぇ: ['nye'],
  にょ: ['nyo'],
  みゃ: ['mya'],
  みぃ: ['myi'],
  みゅ: ['myu'],
  みぇ: ['mye'],
  みょ: ['myo'],
  りゃ: ['rya'],
  りぃ: ['ryi'],
  りゅ: ['ryu'],
  りぇ: ['rye'],
  りょ: ['ryo'],
  ヴぁ: ['va'],
  ヴぃ: ['vi'],
  ヴ: ['vu'],
  ヴぇ: ['ve'],
  ヴぉ: ['vo'],
  ぎゃ: ['gya'],
  ぎぃ: ['gyi'],
  ぎゅ: ['gyu'],
  ぎぇ: ['gye'],
  ぎょ: ['gyo'],
  ぐぁ: ['gwa'],
  ぐぃ: ['gwi'],
  ぐぅ: ['gwu'],
  ぐぇ: ['gwe'],
  ぐぉ: ['gwo'],
  じゃ: ['ja', 'zya'],
  じぃ: ['jyi', 'zyi'],
  じゅ: ['ju', 'zyu'],
  じぇ: ['je', 'zye'],
  じょ: ['jo', 'zyo'],
  でゃ: ['dha'],
  でぃ: ['dhi'],
  でゅ: ['dhu'],
  でぇ: ['dhe'],
  でょ: ['dho'],
  ぢゃ: ['dya'],
  ぢぃ: ['dyi'],
  ぢゅ: ['dyu'],
  ぢぇ: ['dye'],
  ぢょ: ['dyo'],
  びゃ: ['bya'],
  びぃ: ['byi'],
  びゅ: ['byu'],
  びぇ: ['bye'],
  びょ: ['byo'],
  ぴゃ: ['pya'],
  ぴぃ: ['pyi'],
  ぴゅ: ['pyu'],
  ぴぇ: ['pye'],
  ぴょ: ['pyo'],
  ぁ: ['xa', 'la'],
  ぃ: ['xi', 'li'],
  ぅ: ['xu', 'lu'],
  ぇ: ['xe', 'le'],
  ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'],
  ゅ: ['xyu', 'lyu'],
  ょ: ['xyo', 'lyo'],
  っ: ['xtu', 'xtsu', 'ltu'],
  ー: ['-'],
  // 促音（小さいっ）のよく使われる例は維持
  っか: ['kka'],
  っき: ['kki'],
  っく: ['kku'],
  っけ: ['kke'],
  っこ: ['kko'],
  っさ: ['ssa'],
  っし: ['sshi', 'ssi'],
  っす: ['ssu'],
  っせ: ['sse'],
  っそ: ['sso'],
  った: ['tta'],
  っち: ['cchi', 'tti'],
  っつ: ['ttsu', 'ttu'],
  って: ['tte'],
  っと: ['tto'],
  っぱ: ['ppa'],
  っぴ: ['ppi'],
  っぷ: ['pu'],
  っぺ: ['ppe'],
  っぽ: ['ppo'],
  // 記号類も追加
  '、': [','],
  '。': ['.'],
  '・': ['/'],
  ',': [','],
  '.': ['.'],
  '/': ['/'],
};

// 促音（小さいっ）の特別ルール処理用の子音マッピング
const smallTsuMap = {
  k: true,
  s: true,
  t: true,
  p: true,
  c: true,
  h: true,
  f: true,
  m: true,
  y: true,
  r: true,
  w: true,
  g: true,
  z: true,
  d: true,
  b: true,
  j: true,
};

// 母音と「y」で始まるパターン（「ん」の特殊処理用）
const vowelsAndY = {
  a: true,
  i: true,
  u: true,
  e: true,
  o: true,
  y: true,
  // n: true, // ※「ん」の次に「ん」が来る場合は"nn"で入力させる
};

// Weather Typing風の特殊組み合わせ処理のためのマッピング
// 最短入力パターンを優先的に選択するために使用
const specialCombinations = {
  っか: 'kka',
  っき: 'kki',
  っく: 'kku',
  っけ: 'kke',
  っこ: 'kko',
  っさ: 'ssa',
  っし: 'ssi', // shiよりsiを優先
  っす: 'ssu',
  っせ: 'sse',
  っそ: 'sso',
  った: 'tta',
  っち: 'tti', // cchiよりttiを優先
  っつ: 'ttu', // ttsuよりttuを優先
  って: 'tte',
  っと: ['tto'],
  っぱ: 'ppa',
  っぴ: 'ppi',
  っぷ: 'pu',
  っぺ: 'ppe',
  っぽ: 'ppo',
  し: 'si', // shiよりsiを優先
  ち: 'ti', // chiよりtiを優先
  つ: 'tu', // tsuよりtuを優先
  ふ: 'hu', // fuよりhuを優先
  じ: 'zi', // jiよりziを優先
  しゃ: 'sya', // shaよりsyaを優先
  しゅ: 'syu', // shuよりsyuを優先
  しょ: 'syo', // shoよりsyoを優先
  ちゃ: 'tya', // chaよりtyaを優先
  ちゅ: 'tyu', // chuよりtyuを優先
  ちょ: 'tyo', // choよりtyoを優先
  じゃ: 'zya', // jaよりzyaを優先
  じゅ: 'zyu', // juよりzyuを優先
  じょ: 'zyo', // joよりzyoを優先
};

export default class TypingUtils {
  /**
   * 文字列をひらがなに変換
   */
  static toHiragana(text) {
    return wanakana.toHiragana(text);
  }

  /**
   * かな文字をローマ字に変換する
   * @param {string} text - 変換するひらがなテキスト
   * @returns {string} ローマ字に変換されたテキスト
   */
  static romanize(text) {
    if (!text) return '';

    // ひらがなに変換
    const hiragana =
      typeof text === 'string' ? wanakana.toHiragana(text) : text;

    // ローマ字パターンを取得
    const patterns = this.parseTextToRomajiPatterns(hiragana);

    // 最初のパターンを使用してローマ字文字列を構築
    return patterns.map((pattern) => pattern[0]).join('');
  }

  /**
   * 入力されたキーが期待される文字と一致するかチェック
   * @param {string} key - ユーザーが入力したキー
   * @param {string} expected - 期待される文字
   * @returns {boolean} 入力が正しいかどうか
   */
  static isCorrectKey(key, expected) {
    if (!key || !expected) return false;

    // 半角に変換
    const normalizedKey = this.convertFullWidthToHalfWidth(key.toLowerCase());
    const normalizedExpected = expected.toLowerCase();

    return normalizedKey === normalizedExpected;
  }

  /**
   * 全角文字を半角文字に変換する関数
   * @param {string} char - 変換する文字
   * @returns {string} 半角に変換された文字
   */
  static convertFullWidthToHalfWidth(char) {
    // 全角英数字・記号の変換マップ
    const fullWidthMap = {
      '！': '!',
      '＂': '"',
      '＃': '#',
      '＄': '$',
      '％': '%',
      '＆': '&',
      '＇': "'",
      '（': '(',
      '）': ')',
      '＊': '*',
      '＋': '+',
      '，': ',',
      '－': '-',
      '．': '.',
      '／': '/',
      '０': '0',
      '１': '1',
      '２': '2',
      '３': '3',
      '４': '4',
      '５': '5',
      '６': '6',
      '７': '7',
      '８': '8',
      '９': '9',
      '：': ':',
      '；': ';',
      '＜': '<',
      '＝': '=',
      '＞': '>',
      '？': '?',
      '＠': '@',
      Ａ: 'a',
      Ｂ: 'b',
      Ｃ: 'c',
      Ｄ: 'd',
      Ｅ: 'e',
      Ｆ: 'f',
      Ｇ: 'g',
      Ｈ: 'h',
      Ｉ: 'i',
      Ｊ: 'j',
      Ｋ: 'k',
      Ｌ: 'l',
      Ｍ: 'm',
      Ｎ: 'n',
      Ｏ: 'o',
      Ｐ: 'p',
      Ｑ: 'q',
      Ｒ: 'r',
      Ｓ: 's',
      Ｔ: 't',
      Ｕ: 'u',
      Ｖ: 'v',
      Ｗ: 'w',
      Ｘ: 'x',
      Ｙ: 'y',
      Ｚ: 'z',
      ａ: 'a',
      ｂ: 'b',
      ｃ: 'c',
      ｄ: 'd',
      ｅ: 'e',
      ｆ: 'f',
      ｇ: 'g',
      ｈ: 'h',
      ｉ: 'i',
      ｊ: 'j',
      ｋ: 'k',
      ｌ: 'l',
      ｍ: 'm',
      ｎ: 'n',
      ｏ: 'o',
      ｐ: 'p',
      ｑ: 'q',
      ｒ: 'r',
      ｓ: 's',
      ｔ: 't',
      ｕ: 'u',
      ｖ: 'v',
      ｗ: 'w',
      ｘ: 'x',
      ｙ: 'y',
      ｚ: 'z',
      '［': '[',
      '＼': '\\',
      '］': ']',
      '＾': '^',
      '＿': '_',
      '｀': '`',
      '｛': '{',
      '｜': '|',
      '｝': '}',
      '～': '~',
      '　': ' ',
    };

    return fullWidthMap[char] || char;
  }

  /**
   * ひらがな文字列を解析し、各文字のローマ字パターンの配列を返す
   * 各文字のローマ字入力は複数パターンあり得るため、2次元配列となる
   * 例: "こんにちは" => [["ko"], ["n", "nn"], ["ni"], ["chi", "ti"], ["ha"]]
   */
  static parseTextToRomajiPatterns(text) {
    // デバッグ情報
    console.log(`【解析開始】入力テキスト: "${text}"`);

    const hiragana =
      typeof text === 'string' ? wanakana.toHiragana(text) : text;
    const patterns = [];
    let i = 0;

    // 特殊パターン検出用のマップ
    const specialChars = new Set([
      'ゃ',
      'ゅ',
      'ょ',
      'ぁ',
      'ぃ',
      'ぅ',
      'ぇ',
      'ぉ',
      'っ',
    ]);
    const processedChars = [];

    while (i < hiragana.length) {
      let currentChar = hiragana[i];
      let nextChar = i + 1 < hiragana.length ? hiragana[i + 1] : null;
      let processedLength = 1; // デフォルトで1文字処理

      // 処理した文字をログに記録
      processedChars.push(
        currentChar + (nextChar && specialChars.has(nextChar) ? nextChar : '')
      );

      // 促音（っ）の処理
      if (currentChar === 'っ' && nextChar) {
        const combined = hiragana.substr(i, 2);
        if (romajiMap[combined]) {
          patterns.push(romajiMap[combined]);
          i += 2;
          continue;
        }

        // 次の文字の最初の子音を処理
        const nextPatterns = romajiMap[nextChar] || [
          wanakana.toRomaji(nextChar),
        ];
        const firstChar = nextPatterns[0][0];

        if (smallTsuMap[firstChar]) {
          // 子音を重ねるパターン
          patterns.push([firstChar]);
          i++;
          continue;
        } else {
          patterns.push(romajiMap['っ'] || ['xtu']);
          i++;
          continue;
        }
      }

      // 拗音（きゃ、しゃなど）の処理
      if (nextChar && specialChars.has(nextChar) && nextChar !== 'っ') {
        const combined = hiragana.substr(i, 2);
        if (romajiMap[combined]) {
          patterns.push(romajiMap[combined]);
          processedLength = 2;
        } else {
          // 拗音ではない、通常文字として処理
          patterns.push(
            romajiMap[currentChar] || [wanakana.toRomaji(currentChar)]
          );
        }
      }
      // 「ん」の特殊処理
      else if (currentChar === 'ん') {
        // 末尾または次の文字が母音かyで始まるか
        if (i === hiragana.length - 1) {
          // 文末の「ん」は「nn」「xn」「n」すべてのパターンを許可
          patterns.push(['nn', 'xn', 'n']);
        } else {
          const nextRomaji = this.getSingleCharRomaji(nextChar);
          if (nextRomaji && vowelsAndY[nextRomaji[0][0]]) {
            // 母音・yが続く場合は「nn」「xn」のみ許可（「n」は許可しない）
            patterns.push(['nn', 'xn']);
          } else {
            // それ以外の場合は「nn」「xn」「n」すべて許可
            patterns.push(['nn', 'xn', 'n']);
          }
        }
      }
      // 通常文字の処理
      else {
        if (romajiMap[currentChar]) {
          patterns.push(romajiMap[currentChar]);
        } else {
          // マップにない文字はwanakanaを使用
          patterns.push([wanakana.toRomaji(currentChar)]);
        }
      }

      i += processedLength;
    }

    // デバッグ情報
    console.log('【解析完了】処理文字:', processedChars.join(', '));
    console.log(
      '【解析完了】結果パターン:',
      patterns.map((p) => p.join('/')).join(', ')
    );

    return patterns;
  }

  /**
   * 単一の文字のローマ字パターンを取得（内部ヘルパー関数）
   */
  static getSingleCharRomaji(char) {
    if (romajiMap[char]) {
      return romajiMap[char];
    }
    // マップにない文字はwanakanaに頼る
    return [wanakana.toRomaji(char)];
  }

  /**
   * かな文字列から表示用のローマ字テキストを生成する
   * カスタム実装によりromajiMapの各パターンの最初のものを優先的に使用
   */
  static generateDisplayRomaji(kanaText) {
    // デバッグ用にkanaTextを出力
    console.log('【ローマ字変換】入力かな:', kanaText);

    try {
      // parseTextToRomajPatternsを使用して、一貫性のある表示を生成
      const patterns = this.parseTextToRomajiPatterns(kanaText);

      // デバッグ出力
      console.log('【ローマ字変換】パターン解析結果:', patterns);

      // 各文字の最初のパターンを使用してローマ字文字列を構築
      const result = patterns.map((pattern) => pattern[0]).join('');

      // 最終結果を出力
      console.log('【ローマ字変換】最終ローマ字:', result);

      return result;
    } catch (error) {
      console.error('ローマ字変換エラー:', error);
      // エラー時はwanakanaのデフォルト変換を使用
      return wanakana.toRomaji(kanaText);
    }
  }

  /**
   * Weather Typing風の最短ローマ字パターンを取得
   * @param {string} kanaText - ひらがなテキスト
   * @returns {string} 最短のローマ字パターン
   */
  static getMinimalRomaji(kanaText) {
    const romaji = [];
    for (let i = 0; i < kanaText.length; ) {
      // 文字の組み合わせを検出し最短のパターンを選択
      if (i < kanaText.length - 1) {
        const combination = kanaText.substr(i, 2);
        // 2文字の組み合わせがあるか確認
        if (specialCombinations[combination]) {
          romaji.push(specialCombinations[combination]);
          i += 2;
          continue;
        }
      }

      // 単文字の場合、最短パターンを選択
      const char = kanaText[i];
      if (specialCombinations[char]) {
        romaji.push(specialCombinations[char]);
      } else {
        const patterns = romajiMap[char] || [wanakana.toRomaji(char)];

        // 最短のパターンを取得
        const shortestPattern = patterns.reduce(
          (shortest, current) =>
            current.length < shortest.length ? current : shortest,
          patterns[0]
        );

        romaji.push(shortestPattern);
      }
      i++;
    }

    return romaji.join('');
  }

  /**
   * Weather Typing風のKPM計算（オリジナルの計算方式に復元）
   * @param {number} keyCount - 正しく押したキー数
   * @param {number} elapsedTimeMs - 経過時間（ミリ秒）
   * @returns {number} KPM値（小数点以下切り捨て）
   */
  static calculateWeatherTypingKPM(keyCount, elapsedTimeMs) {
    console.log(`【KPM計算】キー数: ${keyCount}, 経過時間: ${elapsedTimeMs}ms`);

    // ミリ秒を分に変換
    const minutes = elapsedTimeMs / 60000;

    // 0除算防止
    if (minutes <= 0) {
      console.log('【KPM計算】経過時間が0分以下のため、KPM=0を返します');
      return 0;
    }

    // Weather Typingと同じ方法（Math.floorで切り捨て）
    const kpm = Math.floor(keyCount / minutes);

    console.log(
      `【KPM計算】計算結果: ${keyCount} / ${minutes.toFixed(2)} = ${kpm}`
    );
    return kpm;
  }

  /**
   * KPM値に基づいてランクを返す
   * @param {number} kpm - KPM値
   * @returns {string} ランク (GOD, DIVINE, LEGEND, SSS+, ... BEGINNER)
   */
  static getKPMRank(kpm) {
    // 数値として扱うために変換
    const kpmValue = typeof kpm === 'string' ? parseFloat(kpm) : kpm;

    if (kpmValue >= 1000) return 'GOD';
    if (kpmValue >= 950) return 'DIVINE';
    if (kpmValue >= 900) return 'LEGEND';
    if (kpmValue >= 850) return 'SSS+';
    if (kpmValue >= 800) return 'SSS';
    if (kpmValue >= 750) return 'SS+';
    if (kpmValue >= 700) return 'SS';
    if (kpmValue >= 650) return 'S+';
    if (kpmValue >= 600) return 'S';
    if (kpmValue >= 550) return 'A+';
    if (kpmValue >= 500) return 'A';
    if (kpmValue >= 450) return 'B+';
    if (kpmValue >= 400) return 'B';
    if (kpmValue >= 350) return 'C+';
    if (kpmValue >= 300) return 'C';
    if (kpmValue >= 250) return 'D+';
    if (kpmValue >= 200) return 'D';
    if (kpmValue >= 150) return 'E+';
    if (kpmValue >= 100) return 'E';
    if (kpmValue >= 50) return 'ROOKIE';
    return 'BEGINNER';
  }

  /**
   * ランクに応じた色を返す
   * @param {string} rank - ランク
   * @returns {string} 色のHEXコード
   */
  static getRankColor(rank) {
    switch (rank) {
      case 'GOD':
        return '#ff00ff'; // マゼンタ
      case 'DIVINE':
        return '#ff00cc'; // 明るい紫
      case 'LEGEND':
        return '#9900ff'; // 紫
      case 'SSS+':
        return '#6600ff'; // 濃い紫
      case 'SSS':
        return '#0033ff'; // 青
      case 'SS+':
        return '#0099ff'; // 明るい青
      case 'SS':
        return '#00ccff'; // 水色
      case 'S+':
        return '#00ffcc'; // ターコイズ
      case 'S':
        return '#00ff66'; // 明るい緑
      case 'A+':
        return '#33ff00'; // 黄緑
      case 'A':
        return '#99ff00'; // ライムグリーン
      case 'B+':
        return '#ccff00'; // 明るい黄色
      case 'B':
        return '#ffff00'; // 黄色
      case 'C+':
        return '#ffcc00'; // オレンジ黄色
      case 'C':
        return '#ff9900'; // オレンジ
      case 'D+':
        return '#ff6600'; // 明るい橙
      case 'D':
        return '#ff3300'; // 赤橙
      case 'E+':
        return '#ff0000'; // 赤
      case 'E':
        return '#cc0000'; // 暗い赤
      case 'ROOKIE':
        return '#9370DB'; // ミディアムパープル - 穏やかな紫色
      case 'BEGINNER':
        return '#6495ED'; // コーンフラワーブルー - 優しい青色
      default:
        return '#ffffff'; // 白
    }
  }

  /**
   * 入力先読みキャッシュ
   * 高速タイピング時のパフォーマンスを向上させるための先読み機能
   */
  static _nextCharPredictionCache = new Map();
  
  /**
   * 特定の問題で次に入力される可能性の高い文字をプリキャッシュする
   * 頻出パターンを先読みすることで高速タイピング時のレスポンスを向上
   * @param {string} kanaText - かな文字列
   * @returns {void}
   */
  static precomputeNextCharPredictions(kanaText) {
    if (!kanaText || typeof kanaText !== 'string') return;
    
    try {
      // 先読みキャッシュをクリア
      this._nextCharPredictionCache.clear();
      
      // ローマ字パターンを取得
      const patterns = this.parseTextToRomajiPatterns(kanaText);
      
      // 各文字位置での先読み情報を計算
      for (let i = 0; i < patterns.length; i++) {
        const currentPatterns = patterns[i];
        
        // 各パターンの最初の文字をキャッシュ
        const firstChars = new Set();
        currentPatterns.forEach(pattern => {
          if (pattern && pattern.length > 0) {
            firstChars.add(pattern[0]);
          }
        });
        
        // キャッシュに保存
        this._nextCharPredictionCache.set(i, firstChars);
      }
      
      console.log('[最適化] 入力先読みキャッシュを準備完了:', 
        `${patterns.length}文字のかな文字列に対して${this._nextCharPredictionCache.size}エントリーをキャッシュ`);
    } catch (e) {
      console.warn('[最適化] 入力先読みキャッシュの準備に失敗:', e);
    }
  }
  
  /**
   * 指定位置で次に入力される可能性のある文字を取得（先読み最適化）
   * @param {number} position - 現在の入力位置
   * @returns {Set|null} 次の入力として可能性のある文字のセット
   */
  static getNextPossibleChars(position) {
    return this._nextCharPredictionCache.get(position) || null;
  }

  /**
   * 入力の分割最適化 - typingmania-refの技術を応用
   * 例: 「し」に対して「shi」を打とうとしたとき、「s」と「hi」に分割して処理
   * @param {string} input - ユーザー入力文字
   * @param {array} patterns - 有効なパターンの配列
   * @param {string} currentInput - 現在までに入力された文字
   * @returns {object|null} - 分割情報または null
   */
  static optimizeSplitInput(input, patterns, currentInput = '') {
    if (!input || !patterns || !patterns.length) return null;
    
    // 完全一致するか確認
    const fullInput = currentInput + input;
    
    // すべてのパターンについて、分割可能性をチェック
    for (let splitPoint = 1; splitPoint < fullInput.length; splitPoint++) {
      const firstPart = fullInput.substring(0, splitPoint);
      const secondPart = fullInput.substring(splitPoint);
      
      // 現在のパターンのいずれかが第2部分で始まるか確認
      for (const pattern of patterns) {
        if (pattern.startsWith(secondPart)) {
          return {
            firstPart,
            secondPart,
            matchedPattern: pattern
          };
        }
      }
    }
    
    return null;
  }

  /**
   * タイピングセッションの管理クラス - 分割入力最適化バージョン
   * タイピングマニアの実装を参考にした高速処理
   */
  static createTypingSession(problem) {
    if (!problem || !problem.kanaText) {
      console.error('有効な問題データが必要です');
      return null;
    }

    console.log('【セッション作成】問題:', problem);

    // かな文字列を正規化（全て小文字のひらがなに変換）
    const kana = wanakana.toHiragana(problem.kanaText.trim().toLowerCase());
    
    // 先読みキャッシュを準備（パフォーマンス向上）
    this.precomputeNextCharPredictions(kana);

    try {
      // かな文字列をローマ字パターンに分解
      const patterns = this.parseTextToRomajiPatterns(kana);

      // Weather Typing風の最短ローマ字パターンを優先
      const displayRomaji = patterns
        .map((pattern) => {
          // 複数のパターンがある場合は最短のものを選ぶ
          if (pattern.length > 1) {
            return pattern.reduce(
              (shortest, current) =>
                current.length < shortest.length ? current : shortest,
              pattern[0]
            );
          }
          return pattern[0];
        })
        .join('');

      console.log(
        `【タイピングセッション】最終表示ローマ字(最短パターン優先): "${displayRomaji}"`
      );

      // かな文字列の実際の文字数とパターン数の不一致を検出
      const specialChars = new Set([
        'ゃ',
        'ゅ',
        'ょ',
        'ぁ',
        'ぃ',
        'ぅ',
        'ぇ',
        'ぉ',
        'っ',
      ]);
      let adjustedKanaLength = 0;

      // 特殊文字を考慮したかな文字数の計算
      for (let i = 0; i < kana.length; i++) {
        if (
          i > 0 &&
          specialChars.has(kana[i]) &&
          !specialChars.has(kana[i - 1])
        ) {
          // 拗音・促音として前の文字と一緒に数える
          continue;
        }
        adjustedKanaLength++;
      }

      console.log(
        `【タイピングセッション】調整後かな文字数: ${adjustedKanaLength}, パターン数: ${patterns.length}`
      );

      // 調整後のかな文字数とパターン数の差が大きい場合のみ警告
      if (Math.abs(adjustedKanaLength - patterns.length) > 1) {
        console.warn(
          `【警告】調整後かな文字数(${adjustedKanaLength})とパターン数(${patterns.length})の差が大きすぎます。` +
            `正確なローマ字変換ができない可能性があります。`
        );
      }

      // 各パターンのローマ字表現とその長さを計算して保存
      const patternLengths = patterns.map((patternArray) => {
        // Weather Typing風の最短パターン優先
        if (patternArray.length > 1) {
          const lengths = patternArray.map((p) => p.length);
          // 最短の長さを先頭に
          lengths.sort((a, b) => a - b);
          return lengths;
        }
        return patternArray.map((pattern) => pattern.length);
      });

      // 各かな文字が表示上どこから始まるかのインデックスを計算
      const displayIndices = [];
      let currentIndex = 0;

      for (let i = 0; i < patterns.length; i++) {
        displayIndices.push(currentIndex);

        // Weather Typing風の最短パターン選択
        const shortestPattern = patterns[i].reduce(
          (shortest, current) =>
            current.length < shortest.length ? current : shortest,
          patterns[i][0]
        );
        currentIndex += shortestPattern.length;
      }

      // Weatherタイピング風の最適化を施したオブジェクトを返す
      return {
        originalText: problem.displayText,
        kanaText: kana,
        displayRomaji: displayRomaji,
        patterns: patterns,
        patternLengths: patternLengths,
        displayIndices: displayIndices,
        currentCharIndex: 0,
        typedRomaji: '',
        currentInput: '',
        completed: false,
        completedAt: null,
        // 各パターンごとの先頭文字をキャッシュ（高速化のため）
        firstCharsCache: patterns.map(
          (patternArray) => new Set(patternArray.map((pattern) => pattern[0]))
        ),

        // タイピングマニアの実装を参考にした拡張機能
        processInput(char) {
          if (this.completed)
            return { success: false, status: 'already_completed' };

          // 現在の文字に対する有効なパターン
          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns)
            return { success: false, status: 'invalid_state' };

          // 試行中の入力に文字を追加
          const newInput = this.currentInput + char;

          // パターンの一致チェック
          let matchingPatterns = currentPatterns.filter((pattern) =>
            pattern.startsWith(newInput)
          );

          if (matchingPatterns.length > 0) {
            // 入力が有効なパターンの一部として認識された
            this.currentInput = newInput;

            // パターンの中で最短のものと完全一致するか確認
            const exactMatch = matchingPatterns.find(
              (pattern) => pattern === newInput
            );

            if (exactMatch) {
              // この文字の入力が完了
              this.typedRomaji += exactMatch;
              this.currentCharIndex++;
              this.currentInput = '';

              // すべての文字を入力し終えたかチェック
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                this.completedAt = Date.now(); // 入力完了時刻を記録
                return { success: true, status: 'all_completed' };
              }
              return { success: true, status: 'char_completed' };
            }

            return { success: true, status: 'in_progress' };
          }
          
          // 通常の一致がない場合、分割入力の最適化を試みる (typingmania-refの技術)
          const splitResult = TypingUtils.optimizeSplitInput(
            char, 
            currentPatterns, 
            this.currentInput
          );
          
          if (splitResult) {
            // 分割入力が有効
            this.currentInput = splitResult.secondPart;
            
            // 文字が完全に一致したかチェック
            if (splitResult.secondPart === splitResult.matchedPattern) {
              // この文字の入力が完了
              this.typedRomaji += splitResult.secondPart;
              this.currentCharIndex++;
              this.currentInput = '';
              
              // すべての文字を入力し終えたかチェック
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                this.completedAt = Date.now();
                return { success: true, status: 'all_completed' };
              }
              return { success: true, status: 'char_completed_split' };
            }
            
            return { success: true, status: 'in_progress_split' };
          }

          // どのパターンにも一致しなかった場合
          return { success: false, status: 'no_match' };
        },

        // 現在の色分け情報を取得
        getColoringInfo() {
          // 完了状態の場合は特別な情報を返す
          if (this.completed) {
            return {
              typedLength: this.displayRomaji.length,
              currentInputLength: 0,
              currentPosition: this.displayRomaji.length,
              currentDisplay: '',
              completed: true,
              completedAt: this.completedAt,
            };
          }

          // 入力済み文字のインデックス（表示上）
          const typedIndex =
            this.currentCharIndex > 0 &&
            this.currentCharIndex < this.displayIndices.length
              ? this.displayIndices[this.currentCharIndex]
              : 0;

          // 現在入力中の文字の表示位置
          const currentPosition =
            this.currentCharIndex < this.displayIndices.length
              ? this.displayIndices[this.currentCharIndex]
              : this.displayRomaji.length;

          return {
            typedLength: typedIndex,
            currentInputLength: this.currentInput.length,
            currentPosition: currentPosition,
            currentDisplay: '',
            completed: false,
          };
        },

        // 入力済み%を計算
        getCompletionPercentage() {
          if (this.completed) return 100;

          const totalPatterns = this.patterns.length;
          if (totalPatterns === 0) return 0;

          return Math.floor((this.currentCharIndex / totalPatterns) * 100);
        },
      };
    } catch (error) {
      console.error(
        'タイピングセッションの作成中にエラーが発生しました:',
        error
      );
      return null;
    }
  }

  /**
   * IME入力を処理する（日本語入力確定時）
   * @param {Event} event - イベントオブジェクト
   * @returns {string|null} 変換された半角文字列
   */
  static handleIMEInput(event) {
    if (!event || !event.target) return null;

    // IME入力の値を取得
    const value = event.target.value || '';
    if (!value) return null;

    // 値をクリア（次の入力のため）
    event.target.value = '';

    // 全角→半角変換
    let result = '';
    for (let i = 0; i < value.length; i++) {
      result += this.convertFullWidthToHalfWidth(value[i]);
    }

    return result;
  }

  /**
   * よく使われるローマ字パターンのキャッシュを事前に準備する
   * パフォーマンス向上のためのプリウォーミング機能
   */
  static prepareCommonPatterns() {
    // 一般的な文章でよく出現する文字列のリスト
    const commonPatterns = [
      'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと',
      'なにぬねの', 'はひふへほ', 'まみむめも', 'やゆよ',
      'らりるれろ', 'わをん', 'がぎぐげご', 'ざじずぜぞ',
      'だぢづでど', 'ばびぶべぼ', 'ぱぴぷぺぽ'
    ];
    
    // キャッシュを事前に作成
    const cache = {};
    
    // 各パターンを事前に変換しておく
    commonPatterns.forEach(pattern => {
      try {
        this.parseTextToRomajiPatterns(pattern);
      } catch (e) {
        // エラー処理は不要（単にキャッシュが作られないだけ）
      }
    });
    
    console.log('[最適化] 一般的なローマ字パターンのキャッシュをプリウォーム完了');
  }

  /**
   * パフォーマンス最適化のためのブラウザ互換性ポリフィル
   * タイピングマニアから学んだ最適化手法
   */
  static _setupOptimizations() {
    if (typeof window !== 'undefined') {
      // requestIdleCallback のポリフィル
      window.requestIdleCallback = 
        window.requestIdleCallback || 
        function(cb) {
          return setTimeout(() => {
            const start = Date.now();
            cb({
              didTimeout: false,
              timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
            });
          }, 1);
        };

      window.cancelIdleCallback = 
        window.cancelIdleCallback || 
        function(id) {
          clearTimeout(id);
        };
      
      console.log('[最適化] パフォーマンスポリフィル初期化完了');
    }
  }

  /**
   * トークン処理の最適化 - typingmania-refから着想
   * テキストのトークン化処理を効率的に行い、タイピング処理を高速化
   * @param {string} text - 処理するテキスト
   * @returns {Array} - 最適化されたトークン配列
   */
  static optimizeTokenProcessing(text) {
    if (!text) return [];
    
    // トークン配列
    const tokens = [];
    
    // 1文字ずつ処理するよりもまとめて処理する
    let currentToken = '';
    let tokenType = 'unknown';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      let newType = 'unknown';
      
      // 文字のタイプを判定（アルファベット、数字、記号、かな）
      if (/[a-zA-Z]/.test(char)) {
        newType = 'alpha';
      } else if (/[0-9]/.test(char)) {
        newType = 'numeric';
      } else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(char)) { // ひらがな・カタカナ
        newType = 'kana';
      } else {
        newType = 'symbol';
      }
      
      // トークンタイプが変わったら新しいトークンを開始
      if (tokenType !== 'unknown' && tokenType !== newType) {
        tokens.push({
          text: currentToken,
          type: tokenType
        });
        currentToken = '';
      }
      
      // 現在の文字を追加
      currentToken += char;
      tokenType = newType;
    }
    
    // 最後のトークンを追加
    if (currentToken) {
      tokens.push({
        text: currentToken,
        type: tokenType
      });
    }
    
    return tokens;
  }

  /**
   * タイプ先行計算による入力予測最適化
   * @param {string} text - 最適化する対象のテキスト
   * @returns {Object} - 先読みデータ
   */
  static createTypeAheadOptimization(text) {
    // トークン処理の最適化を利用
    const tokens = this.optimizeTokenProcessing(text);
    
    // 予測マップを作成
    const predictMap = {};
    let position = 0;
    
    tokens.forEach(token => {
      const romanji = wanakana.toRomaji(token.text);
      
      for (let i = 0; i < romanji.length; i++) {
        const char = romanji[i].toLowerCase();
        
        // 位置ごとに次の文字を予測
        if (!predictMap[position + i]) {
          predictMap[position + i] = new Set();
        }
        
        // 次の文字があれば予測に追加
        if (i < romanji.length - 1) {
          predictMap[position + i].add(romanji[i + 1].toLowerCase());
        }
      }
      
      position += romanji.length;
    });
    
    return {
      predictMap,
      totalLength: position
    };
  }

  /**
   * レンダリング最適化のためのデバウンス関数
   * @param {Function} func - 実行する関数
   * @param {number} wait - 待機時間（ミリ秒）
   * @returns {Function} - デバウンスされた関数
   */
  static debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * パフォーマンスチューニング用の要素にブラウザ最適化を適用
   * @param {HTMLElement} element - 最適化する要素
   */
  static applyElementOptimizations(element) {
    if (!element || typeof window === 'undefined') return;
    
    // will-changeでGPUアクセラレーション
    element.style.willChange = 'transform';
    
    // コンテンツ包含ヒント（レイアウト最適化）
    element.style.contain = 'content';
    
    // トランジション最適化（スムーズな動き）
    element.style.transition = 'all 0.2s ease-out';
    
    // 古いブラウザ用にベンダープレフィックスも追加
    element.style.webkitTransition = 'all 0.2s ease-out';
    element.style.mozTransition = 'all 0.2s ease-out';
    
    console.log('[最適化] 要素に最適化を適用:', element);
  }

  // 静的初期化時に最適化セットアップを実行
  static {
    try {
      this._setupOptimizations();
    } catch (e) {
      console.warn('最適化セットアップ中にエラーが発生しました。パフォーマンスに影響する可能性があります。', e);
    }
  }
}
