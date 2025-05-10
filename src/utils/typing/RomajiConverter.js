'use client';

/**
 * RomajiConverter.js
 * かな文字をローマ字に変換する機能を提供するユーティリティ
 * 責任: 日本語のかな文字からローマ字への変換ロジック
 */

import * as wanakana from 'wanakana';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_ROMAJI_CONVERTER = process.env.NODE_ENV === 'development' && false;

/**
 * ログユーティリティ - コンソールログを条件付きにする
 */
const logUtil = {
  debug: (message, ...args) => {
    if (DEBUG_ROMAJI_CONVERTER) console.log(`[RomajiConverter] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[RomajiConverter] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[RomajiConverter] ${message}`, ...args);
  }
};

// ローマ字変換用のマッピング
// 最も一般的に使用されるパターンを一番先頭に配置（表示優先）
export const romajiMap = {
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
  し: ['si', 'shi', 'ci'], // 複数パターン対応
  す: ['su'],
  せ: ['se', 'ce'],
  そ: ['so'],
  た: ['ta'],
  ち: ['ti', 'chi'],
  つ: ['tu', 'tsu'],
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
  を: ['wo'],
  ん: ['nn', 'n', 'xn'],  // 特殊処理のため順序を「nn」→「n」→「xn」に変更
  // 濁音・半濁音
  が: ['ga'],
  ぎ: ['gi'],
  ぐ: ['gu'],
  げ: ['ge'],
  ご: ['go'],
  ざ: ['za'],
  じ: ['zi', 'ji'],
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
  // 拗音（きゃ、しゃなど）
  きゃ: ['kya'],
  きゅ: ['kyu'],
  きょ: ['kyo'],
  しゃ: ['sya', 'sha', 'sixya', 'shixya'], // 複数パターン対応
  しゅ: ['syu', 'shu', 'sixyu', 'shixyu'], // 複数パターン対応
  しょ: ['syo', 'sho', 'sixyo', 'shixyo'], // 複数パターン対応
  ちゃ: ['tya', 'cha', 'tixya', 'chixya'],
  ちゅ: ['tyu', 'chu', 'tixyu', 'chixyu'],
  ちょ: ['tyo', 'cho', 'tixyo', 'chixyo'],
  にゃ: ['nya'],
  にゅ: ['nyu'],
  にょ: ['nyo'],
  ひゃ: ['hya'],
  ひゅ: ['hyu'],
  ひょ: ['hyo'],
  みゃ: ['mya'],
  みゅ: ['myu'],
  みょ: ['myo'],
  りゃ: ['rya'],
  りゅ: ['ryu'],
  りょ: ['ryo'],
  ぎゃ: ['gya'],
  ぎゅ: ['gyu'],
  ぎょ: ['gyo'],
  じゃ: ['zya', 'ja', 'jya', 'zixya', 'jixya'],
  じゅ: ['zyu', 'ju', 'jyu', 'zixyu', 'jixyu'],
  じょ: ['zyo', 'jo', 'jyo', 'zixyo', 'jixyo'],
  びゃ: ['bya'],
  びゅ: ['byu'],
  びょ: ['byo'],
  ぴゃ: ['pya'],
  ぴゅ: ['pyu'],
  ぴょ: ['pyo'],
  // 小さい文字
  ぁ: ['xa', 'la'],
  ぃ: ['xi', 'li'],
  ぅ: ['xu', 'lu'],
  ぇ: ['xe', 'le'],
  ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'],
  ゅ: ['xyu', 'lyu'],
  ょ: ['xyo', 'lyo'],
  っ: ['xtu', 'xtsu', 'ltu', 'ltsu'],
  // 記号
  '、': [','],
  '。': ['.'],
  '・': ['/'],
  '！': ['!'],
  '？': ['?'],
  '「': ['['],
  '」': [']'],
  '（': ['('],
  '）': [')'],
  '～': ['~'],
  '：': [':'],
};

// 母音とyの識別用マップ
const vowelsAndY = {
  'a': true,
  'i': true,
  'u': true,
  'e': true,
  'o': true,
  'y': true,
  'n': true,
};

// 子音識別用マップ（母音以外の英字）
const consonants = {};
'bcdfghjklmnpqrstvwxyz'.split('').forEach(c => {
  consonants[c] = true;
});

/**
 * ローマ字変換クラス
 * かな文字をローマ字入力パターンに変換する機能を提供
 */
export class RomajiConverter {
  constructor() {
    // パターン変換キャッシュ
    this._patternCache = {
      text: '',
      patterns: []
    };
  }

  /**
   * かな文字列をローマ字入力パターンに変換（キャッシュ対応版）
   * @param {string} hiragana - かな文字列
   * @returns {Array} ローマ字入力パターンの配列
   */
  parseTextToRomajiPatterns(hiragana) {
    // キャッシュがある場合は再利用
    if (this._patternCache.text === hiragana) {
      return this._patternCache.patterns.map(p => [...p]); // ディープコピーを返す
    }

    // 各文字を対応するローマ字パターンに変換
    const patterns = [];
    let i = 0;

    // 特殊処理のためのループ
    while (i < hiragana.length) {
      const char = hiragana[i];
      const nextChar = i + 1 < hiragana.length ? hiragana[i + 1] : null;

      // 小さい「っ」の特殊処理（タ行、カ行など）
      if (char === 'っ' && nextChar) {
        // 次の文字が拗音を含む場合
        const afterNextChar = i + 2 < hiragana.length ? hiragana[i + 2] : null;
        const isNextSmall = afterNextChar && ['ゃ', 'ゅ', 'ょ'].includes(afterNextChar);

        if (isNextSmall) {
          // 「っきゃ」のようなパターン
          const nextTwoChars = nextChar + afterNextChar;
          const nextRomaji = romajiMap[nextTwoChars] || [wanakana.toRomaji(nextTwoChars)];
          const firstChar = nextRomaji[0][0];

          if (consonants[firstChar]) {
            patterns.push([firstChar]);
            i++;
            continue;
          }
        } else {
          // 通常の促音（「った」など）
          const nextRomaji = romajiMap[nextChar] || [wanakana.toRomaji(nextChar)];
          const firstChar = nextRomaji[0][0];

          if (consonants[firstChar]) {
            patterns.push([firstChar]);
            i++;
            continue;
          }
        }

        // 子音ではない場合の促音
        patterns.push(['xtu', 'ltu']);
        i++;
        continue;
      }

      // 「ん」の特殊処理（改善版）
      if (char === 'ん') {
        const isLastChar = i === hiragana.length - 1;
        const nextFirstChar = nextChar ? nextChar[0] : '';

        // 文末または母音/y/nの前での特殊処理
        if (isLastChar) {
          // 単語の最後では n だけでも受け付ける
          patterns.push(['nn', 'n', 'xn']);
        } else if (vowelsAndY[nextFirstChar]) {
          // 母音やyの前では nn または xn のみ
          patterns.push(['nn', 'xn']);
        } else {
          // それ以外の場所では nn, n, xn すべて受け付ける
          patterns.push(['nn', 'n', 'xn']);
        }
        i++;
        continue;
      }

      // 拗音の特殊処理（きゃ、しゃなど）
      if (['き', 'し', 'ち', 'に', 'ひ', 'み', 'り', 'ぎ', 'じ', 'び', 'ぴ'].includes(char) && nextChar && ['ゃ', 'ゅ', 'ょ'].includes(nextChar)) {
        const combinedChar = char + nextChar;
        if (romajiMap[combinedChar]) {
          patterns.push(romajiMap[combinedChar]);
          i += 2;
          continue;
        }
      }

      // 通常文字の処理
      if (romajiMap[char]) {
        patterns.push(romajiMap[char]);
      } else if (char.trim() === '') {
        // スペースの処理
        patterns.push([' ']);
      } else {
        // マッピングにない文字は直接wanakanaに変換を依頼
        const romaji = wanakana.toRomaji(char);
        patterns.push([romaji]);
      }

      i++;
    }

    // パターンをキャッシュ
    this._patternCache = {
      text: hiragana,
      patterns: patterns.map(p => [...p]) // ディープコピー
    };

    return patterns;
  }

  /**
   * ローマ字パターンから最も一般的なローマ字表記を生成
   * @param {Array} patterns - ローマ字パターンの配列
   * @returns {string} ローマ字表記
   */
  generateRomajiFromPatterns(patterns) {
    if (!patterns || !Array.isArray(patterns)) {
      return '';
    }

    return patterns.map(pattern => {
      if (Array.isArray(pattern) && pattern.length > 0) {
        return pattern[0]; // 各パターンの最初の選択肢を使用
      }
      return '';
    }).join('');
  }
}

// シングルトンインスタンス
export const romajiConverter = new RomajiConverter();
