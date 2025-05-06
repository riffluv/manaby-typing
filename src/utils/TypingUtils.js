import * as wanakana from 'wanakana';

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
  し: ['si', 'shi', 'ci'],  // 「si」を先頭に変更
  す: ['su'],
  せ: ['se', 'ce'],
  そ: ['so'],
  た: ['ta'],
  ち: ['ti', 'chi'],  // 「ti」を先頭に変更
  つ: ['tu', 'tsu'],  // 「tu」を先頭に変更
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
  ん: ['n', 'nn', 'xn'],  // 「n」を先頭に変更
  // 濁音・半濁音
  が: ['ga'],
  ぎ: ['gi'],
  ぐ: ['gu'],
  げ: ['ge'],
  ご: ['go'],
  ざ: ['za'],
  じ: ['zi', 'ji'],  // 「zi」を先頭に変更
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
  しゃ: ['sya', 'sha'],  // 「sya」を先頭に変更
  しゅ: ['syu', 'shu'],  // 「syu」を先頭に変更
  しょ: ['syo', 'sho'],  // 「syo」を先頭に変更
  ちゃ: ['tya', 'cha'],  // 「tya」を先頭に変更
  ちゅ: ['tyu', 'chu'],  // 「tyu」を先頭に変更
  ちょ: ['tyo', 'cho'],  // 「tyo」を先頭に変更
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
  じゃ: ['zya', 'ja'],  // 「zya」を先頭に変更
  じゅ: ['zyu', 'ju'],  // 「zyu」を先頭に変更
  じょ: ['zyo', 'jo'],  // 「zyo」を先頭に変更
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
  っし: ['sshi'],
  っす: ['ssu'],
  っせ: ['sse'],
  っそ: ['sso'],
  った: ['tta'],
  っち: ['cchi'],
  っつ: ['ttsu'],
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
  っ: ['xtu', 'ltu'],
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
  a: true, i: true, u: true, e: true, o: true, y: true
};

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

      // 「ん」の特殊処理（最適化版）
      if (char === 'ん') {
        // 簡略化された「ん」の処理ロジック
        // 文末または次の文字が母音/yの場合の特殊処理
        if (i === hiragana.length - 1) {
          patterns.push(['nn', 'n']);
        } else {
          const nextFirstChar = nextChar ? nextChar[0] : '';
          patterns.push(vowelsAndY[nextFirstChar] ? ['nn'] : ['nn', 'n']);
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
   * タイピングセッションを作成する（パフォーマンス最適化版）
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
      let currentIndex = 0;

      // 表示用ローマ字文字列を構築
      const displayRomaji = patterns.map((pattern, i) => {
        displayIndices[i] = currentIndex;

        // 最も一般的なパターンを表示に使用
        const romajiPattern = pattern[0];
        patternLengths[i] = romajiPattern.length;

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

        // 最適化データ
        displayIndices,  // 各文字の表示位置
        patternLengths,  // 各パターンの長さ
        expectedChars,   // 各位置で期待される文字セット

        // 状態
        currentCharIndex: 0,
        typedRomaji: '',  // タイプ済み文字列
        currentInput: '',
        completed: false,

        // 次に期待される入力キーを取得（高速化）
        getCurrentExpectedKey() {
          if (this.completed) return null;

          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns) return null;

          if (!this.currentInput) {
            // 入力開始時は最初のパターンの最初の文字
            return currentPatterns[0][0];
          }

          // 現在の入力に続く文字を探す
          for (const pattern of currentPatterns) {
            if (pattern.startsWith(this.currentInput) &&
              this.currentInput.length < pattern.length) {
              return pattern[this.currentInput.length];
            }
          }

          return currentPatterns[0][0];
        },

        // 次に入力可能な文字セットを取得（事前計算利用）
        getNextPossibleChars() {
          if (this.completed) return null;

          const idx = this.currentCharIndex;
          if (idx >= this.patterns.length) return null;

          if (!this.currentInput) {
            // 入力開始時は事前計算された期待文字セットを返却
            return this.expectedChars[idx];
          }

          // 入力中は動的に計算
          const currentPatterns = this.patterns[idx];
          if (!currentPatterns) return null;

          const possibleChars = new Set();
          for (const pattern of currentPatterns) {
            if (pattern.startsWith(this.currentInput) &&
              this.currentInput.length < pattern.length) {
              possibleChars.add(pattern[this.currentInput.length]);
            }
          }

          return possibleChars.size > 0 ? possibleChars : null;
        },

        // 入力処理（高速化版）
        processInput(char) {
          if (this.completed) {
            return { success: false, status: 'already_completed' };
          }

          const idx = this.currentCharIndex;
          const currentPatterns = this.patterns[idx];
          if (!currentPatterns) {
            return { success: false, status: 'invalid_state' };
          }

          // 新しい入力
          const newInput = this.currentInput + char;

          // 入力の検証（高速化）
          let exactMatch = false;
          let prefixMatch = false;

          // 配列チェックを最適化
          for (let i = 0; i < currentPatterns.length; i++) {
            const pattern = currentPatterns[i];
            if (pattern === newInput) {
              exactMatch = true;
              break;
            } else if (pattern.startsWith(newInput)) {
              prefixMatch = true;
            }
          }

          // 入力を確定
          this.currentInput = newInput;

          if (exactMatch) {
            // 文字入力完了 - 次の文字へ
            this.typedRomaji += newInput; // タイプ済み文字列を更新
            this.currentCharIndex++;
            this.currentInput = '';

            // 全文字入力完了チェック（高速化）
            if (this.currentCharIndex >= this.patterns.length) {
              this.completed = true;
              return { success: true, status: 'all_completed' };
            }

            return { success: true, status: 'char_completed' };
          }

          if (prefixMatch) {
            // 途中まで正しい入力
            return { success: true, status: 'in_progress' };
          }

          // 分割入力の処理を簡素化（最適化版）
          if (this._checkSplitInput()) {
            return { success: true, status: 'split_continue' };
          }

          // マッチしない場合は入力をキャンセル
          this.currentInput = newInput.slice(0, -1);
          return { success: false, status: 'no_match' };
        },

        // 分割入力処理（内部メソッド・最適化版）
        _checkSplitInput() {
          if (this.currentInput.length <= 1) return false;

          const prevInput = this.currentInput.slice(0, -1);
          const lastChar = this.currentInput.slice(-1);
          const idx = this.currentCharIndex;

          // 現在のパターンに前部分がマッチするか確認
          const currentPatterns = this.patterns[idx];
          for (const pattern of currentPatterns) {
            if (pattern === prevInput) {
              // 前部分を確定して次の文字へ
              this.typedRomaji += prevInput; // タイプ済み文字列を更新
              this.currentCharIndex++;
              this.currentInput = lastChar;

              // 完了チェック
              if (this.currentCharIndex >= this.patterns.length) {
                this.completed = true;
                return true;
              }

              // 次の文字の開始として有効か確認
              const nextPatterns = this.patterns[this.currentCharIndex];
              if (!nextPatterns) return true;

              for (const nextPattern of nextPatterns) {
                if (nextPattern.startsWith(lastChar)) {
                  return true;
                }
              }

              // マッチしない場合は戻す
              this.typedRomaji = this.typedRomaji.slice(0, -prevInput.length); // タイプ済み文字列も戻す
              this.currentCharIndex--;
              this.currentInput = prevInput + lastChar;
              break;
            }
          }

          return false;
        },

        // 色分け情報の取得（高速化）
        getColoringInfo() {
          if (this.completed) {
            return {
              typedLength: this.displayRomaji.length,
              currentInputLength: 0,
              completed: true,
              currentCharIndex: this.currentCharIndex,
              currentInput: '',
              expectedNextChar: null
            };
          }

          const idx = this.currentCharIndex;

          // 事前計算されたインデックスを使用
          const typedLength = idx > 0 ?
            this.displayIndices[idx - 1] + this.patternLengths[idx - 1] : 0;

          // 次に入力すべき文字を取得
          let expectedNextChar = '';
          const currentPatterns = this.patterns[idx];
          if (currentPatterns && this.currentInput.length < currentPatterns[0].length) {
            for (const pattern of currentPatterns) {
              if (pattern.startsWith(this.currentInput) &&
                this.currentInput.length < pattern.length) {
                expectedNextChar = pattern[this.currentInput.length];
                break;
              }
            }
          }

          return {
            typedLength: typedLength,
            currentInputLength: this.currentInput.length,
            completed: this.completed,
            currentCharIndex: idx,
            currentInput: this.currentInput,
            expectedNextChar: expectedNextChar,
            currentCharRomaji: currentPatterns ? currentPatterns[0] : ''
          };
        },

        // 進捗率計算（高速化）
        getCompletionPercentage() {
          if (this.completed) return 100;
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

    console.log('【calculateAverageKPM】有効な問題データ数:', validProblems.length);

    // 問題ごとにKPMを計算
    const kpmValues = validProblems.map(problem => {
      const keyCount = problem.problemKeyCount || 0;
      let elapsedTimeMs = problem.problemElapsedMs || 0;

      // キーを押してから打ち終わるまでの時間のみを使用
      // 最低時間保証は不要（実際の入力時間を尊重）

      if (keyCount <= 0 || elapsedTimeMs <= 0) return 0;

      // KPM = キー数 / 時間(分)
      const kpm = keyCount / (elapsedTimeMs / 60000);

      console.log(`【問題KPM計算】問題キー数: ${keyCount}, 時間: ${elapsedTimeMs}ms, KPM: ${kpm.toFixed(2)}`);

      return kpm;
    });

    // KPMの平均値を計算
    const totalKpm = kpmValues.reduce((sum, kpm) => sum + kpm, 0);
    const averageKpm = kpmValues.length > 0 ? totalKpm / kpmValues.length : 0;

    console.log(`【平均KPM計算】合計KPM: ${totalKpm.toFixed(2)}, 問題数: ${kpmValues.length}, 平均: ${averageKpm.toFixed(2)}`);

    // 合理的な最大値でKPMをキャップ（600が現実的な上限）
    return Math.min(Math.floor(averageKpm), 600);
  }
}
