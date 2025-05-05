import * as wanakana from 'wanakana';

// ローマ字変換用のマッピング
// 最も一般的に使用されるパターンを優先的に登録
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
  し: ['shi', 'si'],
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
  // 拗音（きゃ、しゃなど）
  きゃ: ['kya'],
  きゅ: ['kyu'],
  きょ: ['kyo'],
  しゃ: ['sha', 'sya'],
  しゅ: ['shu', 'syu'],
  しょ: ['sho', 'syo'],
  ちゃ: ['cha', 'tya'],
  ちゅ: ['chu', 'tyu'],
  ちょ: ['cho', 'tyo'],
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
  じゃ: ['ja', 'zya'],
  じゅ: ['ju', 'zyu'],
  じょ: ['jo', 'zyo'],
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
   * 全角文字を半角に変換する
   * @param {string} char - 変換する文字
   * @returns {string} 半角に変換された文字
   */
  static convertFullWidthToHalfWidth(char) {
    if (!char) return '';
    
    // 全角英数字・記号の変換マップ（よく使う文字だけ抜粋）
    const fullWidthMap = {
      '！': '!', '＂': '"', '＃': '#', '＄': '$', '％': '%',
      '＆': '&', '＇': "'", '（': '(', '）': ')', '＊': '*',
      '＋': '+', '，': ',', '－': '-', '．': '.', '／': '/',
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
      '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
      '：': ':', '；': ';', '＜': '<', '＝': '=', '＞': '>',
      '？': '?', '＠': '@', 'Ａ': 'a', 'Ｂ': 'b', 'Ｃ': 'c',
      'Ｄ': 'd', 'Ｅ': 'e', 'Ｆ': 'f', 'Ｇ': 'g', 'Ｈ': 'h',
      'Ｉ': 'i', 'Ｊ': 'j', 'Ｋ': 'k', 'Ｌ': 'l', 'Ｍ': 'm',
      'Ｎ': 'n', 'Ｏ': 'o', 'Ｐ': 'p', 'Ｑ': 'q', 'Ｒ': 'r',
      'Ｓ': 's', 'Ｔ': 't', 'Ｕ': 'u', 'Ｖ': 'v', 'Ｗ': 'w',
      'Ｘ': 'x', 'Ｙ': 'y', 'Ｚ': 'z',
      'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
      'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
      'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
      'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
      'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y',
      'ｚ': 'z', '［': '[', '＼': '\\', '］': ']', '＾': '^',
      '＿': '_', '｀': '`', '｛': '{', '｜': '|', '｝': '}',
      '～': '~', '　': ' '
    };

    return fullWidthMap[char] || char;
  }

  /**
   * ひらがな文字列をローマ字パターンに変換する
   * @param {string} text - 変換するひらがなテキスト
   * @returns {Array} ローマ字パターンの配列
   */
  static parseTextToRomajiPatterns(text) {
    if (!text) return [];
    
    // ひらがなに変換
    const hiragana = typeof text === 'string' ? wanakana.toHiragana(text) : text;
    const patterns = [];
    let i = 0;

    while (i < hiragana.length) {
      let char = hiragana[i];
      let nextChar = i + 1 < hiragana.length ? hiragana[i + 1] : null;
      
      // 特殊文字のセット
      const isSmall = nextChar && ['ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'].includes(nextChar);
      
      // 2文字の組み合わせを確認
      if (isSmall) {
        const combined = hiragana.substr(i, 2);
        if (romajiMap[combined]) {
          patterns.push(romajiMap[combined]);
          i += 2;
          continue;
        }
      }
      
      // 促音(っ)の処理
      if (char === 'っ' && nextChar) {
        const afterNextChar = i + 2 < hiragana.length ? hiragana[i + 2] : null;
        const twoChars = nextChar + (afterNextChar && isSmall ? afterNextChar : '');
        const combinedPattern = hiragana.substr(i, twoChars.length + 1);
        
        if (romajiMap[combinedPattern]) {
          patterns.push(romajiMap[combinedPattern]);
          i += twoChars.length + 1;
          continue;
        }
        
        // 次の文字のローマ字パターンを取得
        const nextRomaji = romajiMap[nextChar] || [wanakana.toRomaji(nextChar)];
        const firstChar = nextRomaji[0][0];
        
        // 子音を重ねるパターン
        if (consonants[firstChar]) {
          patterns.push([firstChar]); // 子音だけをパターンとして追加
          i++;
          continue;
        } else {
          // 子音ではない場合の促音
          patterns.push(['xtu']);
          i++;
          continue;
        }
      }
      
      // 「ん」の特殊処理
      if (char === 'ん') {
        // 末尾または次の文字が母音/y
        if (i === hiragana.length - 1) {
          // 文末の「ん」
          patterns.push(['nn', 'n']);
        } else {
          const nextRomaji = romajiMap[nextChar] || [wanakana.toRomaji(nextChar)];
          const nextFirstChar = nextRomaji[0][0];
          
          if (vowelsAndY[nextFirstChar]) {
            // 母音・yが続く場合は「nn」のみ
            patterns.push(['nn']);
          } else {
            // それ以外は「nn」「n」両方可
            patterns.push(['nn', 'n']);
          }
        }
        i++;
        continue;
      }
      
      // 通常文字の処理
      if (romajiMap[char]) {
        patterns.push(romajiMap[char]);
      } else {
        patterns.push([wanakana.toRomaji(char)]);
      }
      
      i++;
    }
    
    return patterns;
  }

  /**
   * タイピングセッションを作成する
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
      
      // 表示用情報を事前計算
      const displayIndices = [];
      let currentIndex = 0;
      
      // 表示用ローマ字とインデックス情報を構築
      const displayRomaji = patterns.map((pattern, i) => {
        // 現在の表示位置を記録
        displayIndices[i] = currentIndex;
        
        // 最初のパターンを使用
        const romajiPattern = pattern[0];
        
        // インデックスを更新
        currentIndex += romajiPattern.length;
        return romajiPattern;
      }).join('');
      
      // シンプルなタイピングセッション
      const typingSession = {
        originalText: problem.displayText,
        kanaText: kana,
        displayRomaji,
        patterns,
        displayIndices, // 表示位置情報を追加
        currentCharIndex: 0,
        typedRomaji: '',
        currentInput: '',
        completed: false,

        // 次に期待される入力キーを取得
        getCurrentExpectedKey() {
          if (this.completed) return null;
          
          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns) return null;
          
          for (const pattern of currentPatterns) {
            if (pattern.startsWith(this.currentInput) && 
                this.currentInput.length < pattern.length) {
              return pattern[this.currentInput.length];
            }
          }
          
          return currentPatterns[0][0];
        },

        // 次に入力可能な文字を取得
        getNextPossibleChars() {
          if (this.completed) return null;
          
          const currentPatterns = this.patterns[this.currentCharIndex];
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

        // 入力処理
        processInput(char) {
          if (this.completed) {
            return { success: false, status: 'already_completed' };
          }

          const currentPatterns = this.patterns[this.currentCharIndex];
          if (!currentPatterns) {
            return { success: false, status: 'invalid_state' };
          }

          // 新しい入力
          const newInput = this.currentInput + char;
          
          // 完全一致または前方一致をチェック
          let exactMatch = false;
          let prefixMatch = false;
          
          for (const pattern of currentPatterns) {
            if (pattern === newInput) {
              exactMatch = true;
              break;
            } else if (pattern.startsWith(newInput)) {
              prefixMatch = true;
            }
          }

          this.currentInput = newInput;

          if (exactMatch) {
            // 文字入力完了
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
          
          if (prefixMatch) {
            // 途中まで正しい入力
            return { success: true, status: 'in_progress' };
          }

          // 分割入力の処理（「し」に対して「shi」を打つとき、「s」と「hi」に分割するなど）
          const splitResult = this._processSplitInput(currentPatterns);
          if (splitResult.success) {
            return splitResult;
          }

          // マッチしない場合は入力をキャンセル
          this.currentInput = newInput.slice(0, -1);
          return { success: false, status: 'no_match' };
        },

        // 分割入力処理（内部メソッド）
        _processSplitInput(currentPatterns) {
          // 1文字以下の入力では分割処理は不要
          if (this.currentInput.length <= 1) {
            return { success: false };
          }

          // 最後の入力を除いた部分
          const prevInput = this.currentInput.slice(0, -1);
          const lastChar = this.currentInput.slice(-1);

          // 前の部分が完全一致するか確認
          let prevMatched = false;
          for (const pattern of currentPatterns) {
            if (pattern === prevInput) {
              prevMatched = true;
              break;
            }
          }

          if (prevMatched) {
            // 前部分を確定
            this.typedRomaji += prevInput;
            this.currentCharIndex++;
            
            // 全文字完了チェック
            if (this.currentCharIndex >= this.patterns.length) {
              this.completed = true;
              return { success: true, status: 'all_completed' };
            }
            
            // 残りを次の文字の入力として処理
            this.currentInput = lastChar;
            
            // 次の文字とマッチするか確認
            const nextPatterns = this.patterns[this.currentCharIndex];
            if (!nextPatterns) {
              return { success: true, status: 'split_continue' };
            }
            
            for (const pattern of nextPatterns) {
              if (pattern.startsWith(lastChar)) {
                return { success: true, status: 'split_continue' };
              }
            }
          }
          
          return { success: false };
        },

        // 色分け情報の取得
        getColoringInfo() {
          if (this.completed) {
            return {
              typedLength: this.displayRomaji.length,
              currentInputLength: 0,
              currentPosition: this.displayRomaji.length,
              completed: true
            };
          }
          
          // 事前計算したインデックス情報を使用
          const currentIndex = this.currentCharIndex;
          
          // タイプ済みの文字列の表示位置を取得
          const typedLength = currentIndex > 0 ? this.displayIndices[currentIndex - 1] + 
              this.patterns[currentIndex - 1][0].length : 0;
          
          // 現在の文字の表示位置
          const currentPosition = currentIndex < this.displayIndices.length ? 
              this.displayIndices[currentIndex] : this.displayRomaji.length;
          
          return {
            typedLength: typedLength,
            currentInputLength: this.currentInput.length,
            currentPosition: currentPosition,
            completed: this.completed
          };
        },

        // 進捗率計算
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
      default:  return '#ffffff';  // 白
    }
  }

  /**
   * Weather Typing風のKPM計算
   */
  static calculateWeatherTypingKPM(keyCount, elapsedTimeMs, problemStats = []) {
    if (problemStats && Array.isArray(problemStats) && problemStats.length > 0) {
      // 各問題の入力数と時間を集計
      let totalKeyCount = 0;
      let totalTimeMs = 0;

      problemStats.forEach(problem => {
        if (problem && typeof problem === 'object') {
          totalKeyCount += problem.problemKeyCount || 0;
          totalTimeMs += problem.problemElapsedMs || 0;
        }
      });

      const totalMinutes = totalTimeMs / 60000;
      if (totalMinutes <= 0) return 0;
      return Math.floor(totalKeyCount / totalMinutes);
    }

    // 通常KPM計算
    const minutes = elapsedTimeMs / 60000;
    if (minutes <= 0) return 0;
    return Math.floor(keyCount / minutes);
  }
}
