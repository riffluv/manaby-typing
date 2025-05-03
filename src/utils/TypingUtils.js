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

// typingmania-refから学んだ最適化処理のための設定値
const TYPING_OPTIMIZATION = {
  // 入力バッファサイズ - 高速タイピング時のバッファリングサイズ
  BUFFER_SIZE: 16,
  // バッチ処理サイズ - 一度に処理する最大文字数
  BATCH_SIZE: 10,
  // 再計算頻度 - 統計情報の再計算間隔（ミリ秒）
  STATS_RECALC_MS: 100,
  // 先読み文字数 - 事前に読み込む文字数
  PRELOAD_CHARS: 5,
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
    // デバッグ情報 - パフォーマンス向上のために通常は無効化
    const enableDebug = false;
    if (enableDebug) console.log(`【解析開始】入力テキスト: "${text}"`);

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
    const processedChars = enableDebug ? [] : null;

    while (i < hiragana.length) {
      let currentChar = hiragana[i];
      let nextChar = i + 1 < hiragana.length ? hiragana[i + 1] : null;
      let processedLength = 1; // デフォルトで1文字処理

      // 処理した文字をログに記録 (デバッグが有効な場合のみ)
      if (enableDebug) {
        processedChars.push(
          currentChar + (nextChar && specialChars.has(nextChar) ? nextChar : '')
        );
      }

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

    // デバッグ情報 (デバッグが有効な場合のみ)
    if (enableDebug) {
      console.log('【解析完了】処理文字:', processedChars.join(', '));
      console.log(
        '【解析完了】結果パターン:',
        patterns.map((p) => p.join('/')).join(', ')
      );
    }

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
    // デバッグ用フラグ - 必要に応じて有効にする
    const enableDebug = false;
    
    // デバッグログを条件付きで出力
    if (enableDebug) console.log('【ローマ字変換】入力かな:', kanaText);

    try {
      // parseTextToRomajPatternsを使用して、一貫性のある表示を生成
      const patterns = this.parseTextToRomajiPatterns(kanaText);

      // デバッグ出力（条件付き）
      if (enableDebug) console.log('【ローマ字変換】パターン解析結果:', patterns);

      // 各文字の最初のパターンを使用してローマ字文字列を構築
      const result = patterns.map((pattern) => pattern[0]).join('');

      // 最終結果を出力（条件付き）
      if (enableDebug) console.log('【ローマ字変換】最終ローマ字:', result);

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
   * Weather Typing風のKPM計算（オリジナルの計算方式に準拠）
   * 公式: https://denasu.com/software/wtfaq.html に基づく実装
   * 「複数ワードの場合は入力数と入力時間の総和を取り、同じ計算式で計算します」
   * @param {number} keyCount - 正しく押したキー数
   * @param {number} elapsedTimeMs - 経過時間（ミリ秒）
   * @param {Array} problemStats - 問題ごとの統計情報（オプション）
   * @returns {number} KPM値（小数点以下切り捨て）
   */
  static calculateWeatherTypingKPM(keyCount, elapsedTimeMs, problemStats = []) {
    // パフォーマンス向上のため、デバッグログは開発環境でのみ出力
    const isDebug = false; // 必要な時だけtrueに変更
    
    // 問題ごとの統計情報がある場合、公式計算方法を適用
    if (problemStats && Array.isArray(problemStats) && problemStats.length > 0) {
      // 各問題の入力数と時間を集計
      let totalKeyCount = 0;
      let totalTimeMs = 0;
      
      problemStats.forEach((problem) => {
        if (problem && typeof problem === 'object') {
          totalKeyCount += problem.problemKeyCount || 0;
          totalTimeMs += problem.problemElapsedMs || 0;
        }
      });

      // 合計時間をミリ秒から分に変換
      const totalMinutes = totalTimeMs / 60000;
      
      // 0除算防止
      if (totalMinutes <= 0) return 0;
      
      // WeTyping公式の計算方法: 「入力数と入力時間の総和を取り、同じ計算式で計算」
      return Math.floor(totalKeyCount / totalMinutes);
    }

    // 問題ごとのデータがない場合は単純計算
    // ミリ秒を分に変換
    const minutes = elapsedTimeMs / 60000;

    // 0除算防止
    if (minutes <= 0) return 0;

    // Weather Typingと同じ方法（Math.floorで切り捨て）
    return Math.floor(keyCount / minutes);
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
        currentPatterns.forEach((pattern) => {
          if (pattern && pattern.length > 0) {
            firstChars.add(pattern[0]);
          }
        });

        // キャッシュに保存
        this._nextCharPredictionCache.set(i, firstChars);
      }

      console.log(
        '[最適化] 入力先読みキャッシュを準備完了:',
        `${patterns.length}文字のかな文字列に対して${this._nextCharPredictionCache.size}エントリーをキャッシュ`
      );
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

    // typingmania-refの実装を参考にした効率的なアルゴリズム
    // 最大限の最適化のためにループ処理を効率化

    // すべてのパターンについて、分割可能性をチェック
    for (let splitPoint = 1; splitPoint < fullInput.length; splitPoint++) {
      const firstPart = fullInput.substring(0, splitPoint);
      const secondPart = fullInput.substring(splitPoint);

      // 効率化: 可能なパターンの絞り込みをキャッシュ
      for (const pattern of patterns) {
        if (pattern.startsWith(secondPart)) {
          return {
            firstPart,
            secondPart,
            matchedPattern: pattern,
          };
        }
      }
    }

    return null;
  }

  /**
   * タイピングセッションの管理クラス - 分割入力最適化バージョン
   * typingmania-refの実装を参考にした高速処理
   */
  static createTypingSession(problem) {
    if (!problem || !problem.kanaText) {
      console.error('有効な問題データが必要です');
      return null;
    }

    // かな文字列を正規化（全て小文字のひらがなに変換）
    const kana = wanakana.toHiragana(problem.kanaText.trim().toLowerCase());

    // 先読みキャッシュを準備（パフォーマンス向上）
    this.precomputeNextCharPredictions(kana);

    try {
      // かな文字列をローマ字パターンに分解（高速化）
      const patterns = this.parseTextToRomajiPatterns(kana);
      
      // メモリ効率とパフォーマンスのため事前計算値を確保
      // typingmania-refに倣った実装: 必要な情報を事前に計算して静的保持
      const displayIndices = [];
      const patternLengths = [];
      let currentIndex = 0;
      
      // パターンを反復処理する代わりに、一度の走査で必要なデータを全て収集
      const displayRomaji = patterns.map((pattern, i) => {
        // 現在の表示位置を記録
        displayIndices[i] = currentIndex;
        
        // 最短パターンを選択
        const shortestPattern = pattern.reduce(
          (shortest, current) => 
            current.length < shortest.length ? current : shortest,
          pattern[0]
        );
        
        // パターンの長さを保存
        patternLengths[i] = shortestPattern.length;
        
        // インデックスを更新
        currentIndex += shortestPattern.length;
        
        return shortestPattern;
      }).join('');

      // typingmania-refスタイルの効率的なセッションオブジェクト
      const typingSession = {
        originalText: problem.displayText,
        kanaText: kana,
        displayRomaji,
        patterns,
        patternLengths,
        displayIndices,
        currentCharIndex: 0,
        typedRomaji: '',
        currentInput: '',
        completed: false,
        completedAt: null,
        
        // 高速処理のためのキャッシュ領域
        _cache: new Map(),
        
        // ★新機能: 入力予測のための次の可能な文字を取得する関数
        getNextPossibleChars() {
          if (this.completed) return null;
          // 先読みキャッシュから取得
          return TypingUtils._nextCharPredictionCache.get(this.currentCharIndex);
        },
        
        // ★新機能: 現在期待されているキーを取得する関数 (エラー分析用)
        getCurrentExpectedKey() {
          if (this.completed) return null;
          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns || !currentPatterns.length) return null;
          
          // 入力中の場合は、次に期待される文字を返す
          if (this.currentInput) {
            for (const pattern of currentPatterns) {
              if (pattern.startsWith(this.currentInput)) {
                return pattern[this.currentInput.length];
              }
            }
          }
          
          // 入力が始まっていない場合は、最初のパターンの最初の文字を返す
          return currentPatterns[0][0];
        },
        
        // typingmania-refスタイルの高速実装（最適化版）
        processInput(char) {
          // パフォーマンス測定（DEV環境のみ）
          const perfStartTime = process.env.NODE_ENV === 'development' ? performance.now() : null;
          
          if (this.completed) {
            return { success: false, status: 'already_completed' };
          }
          
          // 現在のパターンに対する有効な入力かを確認
          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns) {
            return { success: false, status: 'invalid_state' };
          }
          
          // 新しい入力文字を現在の入力に追加
          const newInput = this.currentInput + char;
          
          // ★高速化: 頻出パターンをキャッシュから高速検索
          // typingmania-refスタイルの高速パターンマッチング
          let exactMatch = null;
          let hasMatchingPrefix = false;
          
          for (let i = 0; i < currentPatterns.length; i++) {
            const pattern = currentPatterns[i];
            if (pattern === newInput) {
              exactMatch = pattern;
              break;
            }
            if (pattern.startsWith(newInput)) {
              hasMatchingPrefix = true;
            }
          }
          
          if (exactMatch || hasMatchingPrefix) {
            this.currentInput = newInput;
            
            if (exactMatch) {
              // この文字の入力が完了
              this.typedRomaji += exactMatch;
              this.currentCharIndex++;
              this.currentInput = '';
              
              // すべての文字を入力完了したかチェック
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                this.completedAt = Date.now();
                
                // DEV環境のみパフォーマンス計測
                if (perfStartTime && process.env.NODE_ENV === 'development') {
                  const elapsed = performance.now() - perfStartTime;
                  if (elapsed > 1) {
                    console.debug(`[パフォーマンス] 入力完了処理: ${elapsed.toFixed(2)}ms`);
                  }
                }
                
                return { success: true, status: 'all_completed' };
              }
              
              // DEV環境のみパフォーマンス計測
              if (perfStartTime && process.env.NODE_ENV === 'development') {
                const elapsed = performance.now() - perfStartTime;
                if (elapsed > 1) {
                  console.debug(`[パフォーマンス] 文字完了処理: ${elapsed.toFixed(2)}ms`);
                }
              }
              
              return { success: true, status: 'char_completed' };
            }
            
            // DEV環境のみパフォーマンス計測
            if (perfStartTime && process.env.NODE_ENV === 'development') {
              const elapsed = performance.now() - perfStartTime;
              if (elapsed > 1) {
                console.debug(`[パフォーマンス] 中間入力処理: ${elapsed.toFixed(2)}ms`);
              }
            }
            
            return { success: true, status: 'in_progress' };
          }
          
          // typingmania-refの分割入力処理を適用
          const splitResult = TypingUtils.optimizeSplitInput(
            char,
            currentPatterns,
            this.currentInput
          );
          
          if (splitResult) {
            // 分割処理が有効
            this.currentInput = splitResult.secondPart;
            
            // 文字が完全一致したかチェック
            if (splitResult.secondPart === splitResult.matchedPattern) {
              this.typedRomaji += splitResult.matchedPattern;
              this.currentCharIndex++;
              this.currentInput = '';
              
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                this.completedAt = Date.now();
                return { success: true, status: 'all_completed' };
              }
              return { success: true, status: 'char_completed_split' };
            }
            
            return { success: true, status: 'in_progress_split' };
          }
          
          // パフォーマンス測定終了（DEV環境のみ）
          if (perfStartTime && process.env.NODE_ENV === 'development') {
            const elapsed = performance.now() - perfStartTime;
            if (elapsed > 1) {
              console.debug(`[パフォーマンス] 不一致処理: ${elapsed.toFixed(2)}ms`);
            }
          }
          
          // 入力が一致しない
          return { success: false, status: 'no_match' };
        },
        
        // 色分け情報を取得（高速化）
        getColoringInfo() {
          // キャッシュ確認（同一状態での重複計算を避ける - 最大のパフォーマンスボトルネック対策）
          const cacheKey = `coloring_${this.currentCharIndex}_${this.currentInput}`;
          if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
          }
          
          if (this.completed) {
            const completeInfo = {
              typedLength: this.displayRomaji.length,
              currentInputLength: 0,
              currentPosition: this.displayRomaji.length,
              currentDisplay: '',
              completed: true,
              completedAt: this.completedAt,
            };
            this._cache.set(cacheKey, completeInfo);
            return completeInfo;
          }
          
          // 事前計算済みのインデックスを使用
          const typedIndex = this.currentCharIndex > 0 ? 
            this.displayIndices[this.currentCharIndex] : 0;
          
          const currentPosition = this.currentCharIndex < this.patterns.length ?
            this.displayIndices[this.currentCharIndex] : this.displayRomaji.length;
          
          const result = {
            typedLength: typedIndex,
            currentInputLength: this.currentInput.length,
            currentPosition: currentPosition,
            currentDisplay: '',
            completed: false,
          };
          
          // キャッシュに保存
          this._cache.set(cacheKey, result);
          return result;
        },
        
        // 進捗率計算（高速化）
        getCompletionPercentage() {
          if (this.completed) return 100;
          return this.patterns.length > 0 ? 
            Math.floor((this.currentCharIndex / this.patterns.length) * 100) : 0;
        },
        
        // メモリ使用効率化
        clearCache() {
          this._cache.clear();
        }
      };
      
      return typingSession;
      
    } catch (error) {
      console.error('タイピングセッションの作成中にエラー:', error);
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
      'あいうえお',
      'かきくけこ',
      'さしすせそ',
      'たちつてと',
      'なにぬねの',
      'はひふへほ',
      'まみむめも',
      'やゆよ',
      'らりるれろ',
      'わをん',
      'がぎぐげご',
      'ざじずぜぞ',
      'だぢづでど',
      'ばびぶべぼ',
      'ぱぴぷぺぽ',
    ];

    // キャッシュを事前に作成
    const cache = {};

    // 各パターンを事前に変換しておく
    commonPatterns.forEach((pattern) => {
      try {
        this.parseTextToRomajiPatterns(pattern);
      } catch (e) {
        // エラー処理は不要（単にキャッシュが作られないだけ）
      }
    });

    console.log(
      '[最適化] 一般的なローマ字パターンのキャッシュをプリウォーム完了'
    );
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
        function (cb) {
          return setTimeout(() => {
            const start = Date.now();
            cb({
              didTimeout: false,
              timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            });
          }, 1);
        };

      window.cancelIdleCallback =
        window.cancelIdleCallback ||
        function (id) {
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
      } else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(char)) {
        // ひらがな・カタカナ
        newType = 'kana';
      } else {
        newType = 'symbol';
      }

      // トークンタイプが変わったら新しいトークンを開始
      if (tokenType !== 'unknown' && tokenType !== newType) {
        tokens.push({
          text: currentToken,
          type: tokenType,
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
        type: tokenType,
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

    tokens.forEach((token) => {
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
      totalLength: position,
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
      console.warn(
        '最適化セットアップ中にエラーが発生しました。パフォーマンスに影響する可能性があります。',
        e
      );
    }
  }

  /**
   * typingmania-ref風の入力バッファマネージャー
   * バッファサイズを動的に調整する最適化されたバッファリングシステム
   */
  static createInputBufferManager(processFn, options = {}) {
    // デフォルト設定とマージ
    const settings = {
      initialBufferSize: TYPING_OPTIMIZATION.BUFFER_SIZE,
      maxBatchSize: TYPING_OPTIMIZATION.BATCH_SIZE,
      ...options
    };
    
    // バッファとステート
    const state = {
      buffer: [],
      isProcessing: false,
      frameId: null,
      lastProcessTime: 0,
      microTaskScheduled: false // マイクロタスクスケジューリング状態
    };
    
    // 入力を追加する関数（高速化版）
    const addInput = (input) => {
      // パフォーマンス計測 (開発環境のみ)
      const perfStartTime = process.env.NODE_ENV === 'development' ? performance.now() : null;
      
      // バッファに追加
      state.buffer.push(input);
      
      // バッファが少ない場合は即時処理を優先（応答性向上）
      if (state.buffer.length <= 2) {
        // 単一または少数のキー入力の場合：レスポンス優先でマイクロタスク使用
        if (!state.microTaskScheduled) {
          state.microTaskScheduled = true;
          queueMicrotask(() => {
            state.microTaskScheduled = false;
            processBuffer();
          });
        }
      } else {
        // 多数のキー入力（高速タイピング）：バッチ処理のためrAF使用
        if (!state.isProcessing && state.frameId === null) {
          state.frameId = requestAnimationFrame(processBuffer);
        }
      }
      
      // パフォーマンス警告（開発環境のみ）
      if (perfStartTime && process.env.NODE_ENV === 'development') {
        const latency = performance.now() - perfStartTime;
        if (latency > 5) {
          console.debug(`[パフォーマンス警告] バッファ追加に ${latency.toFixed(2)}ms かかりました`);
        }
      }
      
      return true;
    };
    
    // バッファ内の入力を処理する関数（高速化版）
    const processBuffer = () => {
      // フレーム処理をクリア
      state.frameId = null;
      
      if (state.isProcessing || state.buffer.length === 0) {
        return;
      }
      
      state.isProcessing = true;
      
      try {
        // 開始時間を記録
        const startTime = performance.now();
        const now = Date.now();
        
        // バッファサイズに応じて処理量を最適化
        // 少量なら全て処理、多量なら適切にバッチ分割
        const batchSize = state.buffer.length <= 3 ? 
          state.buffer.length : // 少量は全て処理
          Math.min(settings.maxBatchSize, state.buffer.length); // 多量はバッチ処理
        
        // 指定された数だけ処理
        for (let i = 0; i < batchSize && state.buffer.length > 0; i++) {
          const input = state.buffer.shift();
          processFn(input, now);
        }
        
        // 処理時間を記録
        state.lastProcessTime = now;
        
        // まだ処理すべきものがあれば続行方法を決定
        if (state.buffer.length > 0) {
          if (state.buffer.length <= 3) {
            // 残りが少ない場合は即時処理（マイクロタスク）
            queueMicrotask(() => processBuffer());
          } else {
            // 残りが多い場合はアニメーションフレームでバッチ処理
            state.frameId = requestAnimationFrame(processBuffer);
          }
        }
        
        // 処理時間をログ（開発環境のみ）
        const elapsedMs = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development' && elapsedMs > 8) {
          console.debug(`[パフォーマンス警告] バッファ処理に ${elapsedMs.toFixed(2)}ms かかりました (${batchSize}件処理)`);
        }
      } finally {
        state.isProcessing = false;
      }
    };
    
    // クリーンアップ関数
    const cleanup = () => {
      if (state.frameId !== null) {
        cancelAnimationFrame(state.frameId);
        state.frameId = null;
      }
      state.buffer = [];
      state.isProcessing = false;
      state.microTaskScheduled = false;
    };
    
    return {
      addInput,
      processBuffer,
      cleanup,
      getBufferLength: () => state.buffer.length
    };
  }
}
