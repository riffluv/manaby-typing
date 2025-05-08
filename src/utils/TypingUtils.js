import * as wanakana from 'wanakana';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_TYPING_UTILS = process.env.NODE_ENV === 'development' && false;

/**
 * ログユーティリティ - コンソールログを条件付きにする
 */
const logUtil = {
  debug: (message, ...args) => {
    if (DEBUG_TYPING_UTILS) console.log(message, ...args);
  },
  warn: (message, ...args) => {
    console.warn(message, ...args);
  },
  error: (message, ...args) => {
    console.error(message, ...args);
  }
};

// ローマ字変換用のマッピング
// 最も一般的に使用されるパターンを一番先頭に配置（表示優先）
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
  ちゃ: ['tya', 'cha', 'tixya', 'chixya'], // 複数パターン対応
  ちゅ: ['tyu', 'chu', 'tixyu', 'chixyu'], // 複数パターン対応
  ちょ: ['tyo', 'cho', 'tixyo', 'chixyo'], // 複数パターン対応
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
  じゃ: ['zya', 'ja', 'zixya', 'jixya'], // 複数パターン対応
  じゅ: ['zyu', 'ju', 'zixyu', 'jixyu'], // 複数パターン対応
  じょ: ['zyo', 'jo', 'zixyo', 'jixyo'], // 複数パターン対応
  びゃ: ['bya'],
  びゅ: ['byu'],
  びょ: ['byo'],
  ぴゃ: ['pya'],
  ぴゅ: ['pyu'],
  ぴょ: ['pyo'],
  // 促音（小さいっ）
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
  っぷ: ['ppu'],
  っぺ: ['ppe'],
  っぽ: ['ppo'],
  // 小さい文字
  ぁ: ['xa', 'la'],
  ぃ: ['xi', 'li'],
  ぅ: ['xu', 'lu'],
  ぇ: ['xe', 'le'],
  ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'],
  ゅ: ['xyu', 'lyu'],
  ょ: ['xyo', 'lyo'],
  っ: ['xtu', 'ltu', 'xtsu', 'ltsu'],
  // 記号類
  '、': [','],
  '。': ['.'],
  '・': ['/'],
  ',': [','],
  '.': ['.'],
  '/': ['/'],
};

// 子音マッピング (促音処理用)
const consonants = {
  k: true, s: true, t: true, p: true, c: true,
  h: true, f: true, m: true, y: true, r: true,
  w: true, g: true, z: true, d: true, b: true, j: true
};

// 母音と「y」で始まるパターン (「ん」の特殊処理用)
const vowelsAndY = {
  a: true, i: true, u: true, e: true, o: true, y: true, n: true
};

// タイピング高速化のためのマッピングキャッシュ
const acceptableInputsCache = new Map();

/**
 * タイピング処理のためのユーティリティクラス
 * typingmania-refを参考にしたシンプルで効率的な実装
 */
export default class TypingUtils {
  /**
   * 全角文字を半角に変換する（パフォーマンス最適化版）
   * @param {string} char - 変換する文字
   * @returns {string} 半角に変換された文字
   */
  static convertFullWidthToHalfWidth(char) {
    if (!char) return '';

    // Unicode変換によるシンプルな実装
    if (char >= '！' && char <= '～') {
      // 全角文字コードから半角文字コードへの変換
      const code = char.charCodeAt(0) - 0xFEE0;
      return String.fromCharCode(code);
    }

    // 特殊な変換ケース
    if (char === '　') return ' '; // 全角スペース

    return char;
  }

  /**
   * 入力許容文字セットを取得（高速化バージョン）
   * @param {string} kana - 現在処理中のかな文字
   * @returns {Array} 許容される入力文字のリスト
   */
  static getAcceptableInputs(kana) {
    // キャッシュを活用して処理を高速化
    if (acceptableInputsCache.has(kana)) {
      return acceptableInputsCache.get(kana);
    }

    // かなに対応するローマ字パターンを取得
    const patterns = romajiMap[kana] || [];
    if (!patterns.length) {
      // マッピングにない場合はwanakanaで変換
      const romaji = wanakana.toRomaji(kana);
      if (romaji) {
        acceptableInputsCache.set(kana, [romaji[0]]);
        return [romaji[0]];
      }
      return [];
    }

    // 受け入れ可能な最初の文字をリスト化
    const acceptableChars = [];
    for (const pattern of patterns) {
      if (pattern.length > 0 && !acceptableChars.includes(pattern[0])) {
        acceptableChars.push(pattern[0]);
      }
    }

    // 結果をキャッシュ
    acceptableInputsCache.set(kana, acceptableChars);
    return acceptableChars;
  }

  /**
   * 直接文字マッチングを行う高速アクセス関数
   * @param {string} kana - かな文字
   * @param {string} input - 入力文字
   * @returns {boolean} マッチするかどうか
   */
  static isDirectMatch(kana, input) {
    const patterns = romajiMap[kana];
    if (!patterns) return false;
    
    for (const pattern of patterns) {
      if (pattern[0] === input) return true;
    }
    
    return false;
  }

  /**
   * ひらがな文字列をローマ字パターンに変換する（パフォーマンス最適化版）
   * @param {string} text - 変換するひらがなテキスト
   * @returns {Array} ローマ字パターンの配列
   */
  static parseTextToRomajiPatterns(text) {
    if (!text) return [];

    // ひらがなに変換
    const hiragana = typeof text === 'string' ? wanakana.toHiragana(text) : text;

    // パターンをキャッシュして使い回す
    if (this._patternCache && this._patternCache.text === hiragana) {
      return [...this._patternCache.patterns]; // 配列のディープコピーを返す
    }

    const patterns = [];
    let i = 0;

    while (i < hiragana.length) {
      let char = hiragana[i];
      let nextChar = i + 1 < hiragana.length ? hiragana[i + 1] : null;

      // 特殊文字のセット
      const isSmall = nextChar && ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'].includes(nextChar);

      // 2文字の組み合わせを確認（拗音など）
      if (isSmall) {
        const combined = char + nextChar;
        if (romajiMap[combined]) {
          patterns.push(romajiMap[combined]);
          i += 2;
          continue;
        }
      }

      // 促音(っ)の処理
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
   * タイピングセッションを作成する（高速化バージョン）
   * @param {Object} problem - 問題オブジェクト
   * @returns {Object} タイピングセッションオブジェクト
   */
  static createTypingSession(problem) {
    if (!problem || !problem.kanaText) {
      console.error('有効な問題データが必要です');
      return null;
    }

    try {
      // かな文字列を正規化
      const kana = wanakana.toHiragana(problem.kanaText.trim());

      // ローマ字パターンに変換
      const patterns = this.parseTextToRomajiPatterns(kana);

      // 表示用情報と最適化データを事前計算
      const displayIndices = new Array(patterns.length);
      const patternLengths = new Array(patterns.length);
      const expectedChars = new Array(patterns.length);
      const firstChars = new Array(patterns.length); // 最初の文字を事前計算
      let currentIndex = 0;

      // 表示用ローマ字文字列を構築
      const displayRomaji = patterns.map((pattern, i) => {
        displayIndices[i] = currentIndex;

        // 最も一般的なパターンを表示に使用
        const romajiPattern = pattern[0];
        patternLengths[i] = romajiPattern.length;
        
        // 最初の文字を事前計算
        firstChars[i] = romajiPattern[0];

        // 次の期待入力文字セットを事前計算
        expectedChars[i] = new Set(pattern.map(p => p[0]));

        currentIndex += romajiPattern.length;
        return romajiPattern;
      }).join('');

      // シンプル化されたタイピングセッション
      const typingSession = {
        // 問題情報
        originalText: problem.displayText,
        kanaText: kana,

        // 表示情報
        displayRomaji,

        // パターン情報
        patterns,

        // 高速化データ - 参照コピーを避けるために直接コピー
        displayIndices,
        patternLengths,  
        expectedChars,   
        firstChars,      // 追加：最初の文字の高速アクセス配列

        // 状態
        currentCharIndex: 0,
        typedRomaji: '',
        currentInput: '',
        completed: false,

        // 次に期待される入力キーを取得（最大限に最適化）
        getCurrentExpectedKey() {
          if (this.completed) return null;
          if (this.currentCharIndex >= this.patterns.length) return null;
          
          // 現在入力なしの場合は、事前計算した最初の文字をすぐに返す
          if (!this.currentInput) {
            return this.firstChars[this.currentCharIndex];
          }

          // 現在の入力に続く文字を探す
          const currentPatterns = this.patterns[this.currentCharIndex];
          for (const pattern of currentPatterns) {
            if (pattern.startsWith(this.currentInput) &&
              this.currentInput.length < pattern.length) {
              return pattern[this.currentInput.length];
            }
          }

          return this.firstChars[this.currentCharIndex];
        },

        // 現在のローマ字を取得（高速アクセス）
        getCurrentCharRomaji() {
          if (this.currentCharIndex >= this.patterns.length) return '';
          const patterns = this.patterns[this.currentCharIndex];
          return patterns ? patterns[0] : '';
        },

        // 入力処理（超高速化・無駄な処理を削除）
        processInput(char) {
          // 完了状態と境界チェック - 高速早期リターン
          if (this.completed || this.currentCharIndex >= this.patterns.length) {
            return { success: false, status: 'inactive_session' };
          }

          // 現在のパターン配列
          const currentPatterns = this.patterns[this.currentCharIndex];
          
          // 新しい入力
          const newInput = this.currentInput + char;

          // 入力の検証 - 最大限の最適化
          let exactMatch = false;
          let prefixMatch = false;

          // 高速マッチング
          for (let i = 0; i < currentPatterns.length; i++) {
            const pattern = currentPatterns[i];
            
            // 完全に一致する
            if (pattern === newInput) {
              exactMatch = true;
              break;
            } 
            // 前方一致する
            else if (pattern.startsWith(newInput)) {
              prefixMatch = true;
              // 完全一致が見つからない場合の早期バイパス
              if (i === currentPatterns.length - 1) break;
            }
          }

          // 入力を確定
          this.currentInput = newInput;

          // 完全一致の場合
          if (exactMatch) {
            // 文字入力完了 - 次の文字へ
            this.typedRomaji += newInput;
            this.currentCharIndex++;
            this.currentInput = '';

            // 全文字入力完了チェック
            if (this.currentCharIndex >= this.patterns.length) {
              this.completed = true;
              return { success: true, status: 'all_completed' };
            }

            return { success: true, status: 'char_completed' };
          }

          // 前方一致の場合
          if (prefixMatch) {
            // 途中まで正しい入力
            return { success: true, status: 'in_progress' };
          }

          // 分割入力チェック（簡素化・最適化）
          if (this._fastSplitInputCheck()) {
            return { success: true, status: 'split_continue' };
          }

          // マッチしない場合は入力をキャンセル
          this.currentInput = newInput.slice(0, -1);
          return { success: false, status: 'no_match' };
        },

        // 分割入力処理（内部メソッド・超高速化版）
        _fastSplitInputCheck() {
          // 1文字以下の場合は早期リターン
          if (this.currentInput.length <= 1) return false;

          // 前部分と最後の文字を分離
          const prevInput = this.currentInput.slice(0, -1);
          const lastChar = this.currentInput.slice(-1);
          const idx = this.currentCharIndex;

          // 現在のパターン配列
          const currentPatterns = this.patterns[idx];

          // 前部分が完全一致するか高速チェック
          for (const pattern of currentPatterns) {
            if (pattern === prevInput) {
              // 前部分を確定して次の文字へ
              this.typedRomaji += prevInput;
              this.currentCharIndex++;
              this.currentInput = lastChar;

              // 完了チェック（境界条件）
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                return true;
              }

              // 次の文字の開始として有効か確認
              const nextPatterns = this.patterns[this.currentCharIndex];
              if (!nextPatterns) return false;

              // 高速チェック
              for (const nextPattern of nextPatterns) {
                if (nextPattern[0] === lastChar) return true;
              }

              // マッチしない場合は状態を戻す
              this.currentCharIndex--;
              this.typedRomaji = this.typedRomaji.slice(0, -prevInput.length);
              this.currentInput = prevInput + lastChar;
              return false;
            }
          }

          return false;
        },

        // 色分け情報の取得（最大限に最適化）
        getColoringInfo() {
          if (this.completed) {
            return {
              romaji: this.displayRomaji,
              typedLength: this.displayRomaji.length,
              currentInputLength: 0,
              completed: true,
              currentCharIndex: this.currentCharIndex,
              currentInput: '',
              expectedNextChar: null,
              currentCharRomaji: ''
            };
          }

          const idx = this.currentCharIndex;
          
          // 高速アクセス - 事前計算値を使用
          const typedLength = idx > 0 ?
            this.displayIndices[idx - 1] + this.patternLengths[idx - 1] : 0;

          // 最小限の処理
          return {
            romaji: this.displayRomaji,
            typedLength,
            currentInputLength: this.currentInput.length,
            completed: this.completed,
            currentCharIndex: idx,
            currentInput: this.currentInput,
            expectedNextChar: this.getCurrentExpectedKey(),
            currentCharRomaji: this.getCurrentCharRomaji()
          };
        },

        // 進捗率計算（高速化）
        getCompletionPercentage() {
          if (this.completed) return 100;
          // 境界チェック追加
          if (this.patterns.length === 0) return 0;
          return Math.floor((this.currentCharIndex / this.patterns.length) * 100);
        }
      };

      return typingSession;
    } catch (error) {
      console.error('タイピングセッションの作成中にエラー:', error);
      return null;
    }
  }

  /**
   * KPM値に基づいてランクを計算する
   */
  static getRank(kpm) {
    if (kpm >= 400) return 'S';
    if (kpm >= 300) return 'A';
    if (kpm >= 200) return 'B';
    if (kpm >= 150) return 'C';
    if (kpm >= 100) return 'D';
    if (kpm >= 50) return 'E';
    return 'F';
  }

  /**
   * ランクに応じた色を返す
   */
  static getRankColor(rank) {
    switch (rank) {
      case 'S': return '#00ff66';  // 緑
      case 'A': return '#33ff00';  // 黄緑
      case 'B': return '#ffff00';  // 黄色
      case 'C': return '#ff9900';  // オレンジ
      case 'D': return '#ff3300';  // 赤橙
      case 'E': return '#ff0000';  // 赤
      case 'F': return '#cc0000';  // 暗い赤
      default: return '#ffffff';  // 白
    }
  }

  /**
   * 問題ごとのKPMを計算し、その平均値を返す
   * Weather Typing方式では各問題のKPMを算出し、その平均を取る
   * @param {Array} problemStats 問題ごとの統計情報
   * @returns {number} 問題ごとのKPMの平均値
   */
  static calculateAverageKPM(problemStats = []) {
    if (!problemStats || !Array.isArray(problemStats) || problemStats.length === 0) {
      return 0;
    }

    // 有効な問題データのみ抽出
    const validProblems = problemStats.filter(problem =>
      problem &&
      problem.problemKeyCount !== undefined &&
      problem.problemKeyCount > 0 &&
      problem.problemElapsedMs !== undefined &&
      problem.problemElapsedMs > 0
    );

    if (validProblems.length === 0) {
      return 0;
    }

    logUtil.debug('【calculateAverageKPM】有効な問題データ数:', validProblems.length);

    // 問題ごとにKPMを計算
    const kpmValues = validProblems.map(problem => {
      const keyCount = problem.problemKeyCount || 0;
      let elapsedTimeMs = problem.problemElapsedMs || 0;

      if (keyCount <= 0 || elapsedTimeMs <= 0) return 0;

      // KPM = キー数 / 時間(分)
      const kpm = keyCount / (elapsedTimeMs / 60000);

      logUtil.debug(`【問題KPM計算】問題キー数: ${keyCount}, 時間: ${elapsedTimeMs}ms, KPM: ${kpm.toFixed(2)}`);

      return kpm;
    });

    // KPMの平均値を計算
    const totalKpm = kpmValues.reduce((sum, kpm) => sum + kpm, 0);
    const averageKpm = kpmValues.length > 0 ? totalKpm / kpmValues.length : 0;

    logUtil.debug(`【平均KPM計算】合計KPM: ${totalKpm.toFixed(2)}, 問題数: ${kpmValues.length}, 平均: ${averageKpm.toFixed(2)}`);

    // 合理的な最大値でKPMをキャップ（600が現実的な上限）
    return Math.min(Math.floor(averageKpm), 600);
  }

  /**
   * 入力可能な文字を分割する（高速化・キャッシュ利用）
   * @param {string} kana - 処理するかな文字
   * @returns {Array} [読み方配列, ローマ字パターン配列]
   */
  static splitReading(kana) {
    if (!kana) return [[], []];

    // 単一のかな文字の場合は直接パターンを使用
    if (kana.length === 1 && romajiMap[kana]) {
      return [[kana], romajiMap[kana]];
    }

    // 複数文字の場合は解析
    const patterns = this.parseTextToRomajiPatterns(kana);
    return [
      [...Array(patterns.length).keys()].map(i => kana[i] || ''),
      patterns
    ];
  }
}
