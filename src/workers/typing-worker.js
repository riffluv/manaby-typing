/**
 * タイピング処理をメインスレッドから分離するためのWeb Worker
 * UIスレッドのブロッキングを防ぎ、タイピングの反応速度を最大化
 */

// ローマ字変換マッピング（TypingUtilsから抽出）
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
  // 特殊な組み合わせ
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
  っ: ['xtu', 'xtsu', 'ltu'],
  ぁ: ['xa', 'la'],
  ぃ: ['xi', 'li'],
  ぅ: ['xu', 'lu'],
  ぇ: ['xe', 'le'],
  ぉ: ['xo', 'lo'],
  ゃ: ['xya', 'lya'],
  ゅ: ['xyu', 'lyu'],
  ょ: ['xyo', 'lyo'],
  // 促音（小さいっ）パターン
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
  // 記号類
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
};

/**
 * 全角文字を半角文字に変換する関数
 */
function convertFullWidthToHalfWidth(char) {
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
 * タイピング処理の最適化版
 * @param {object} session - タイピングセッションオブジェクト (シリアライズ済み)
 * @param {string} char - 入力された文字
 * @returns {object} - 処理結果
 */
function processInput(session, char) {
  if (!session || session.completed) {
    return { success: false, status: 'already_completed' };
  }

  const currentPatterns = session.patterns[session.currentCharIndex];
  if (!currentPatterns) {
    return { success: false, status: 'invalid_state' };
  }

  // 新しい入力を追加
  const newInput = session.currentInput + char;

  // パターンマッチング（高速処理版）
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
    // 新しいセッションオブジェクトを作成（イミュータブルに）
    const updatedSession = {
      ...session,
      currentInput: newInput,
    };

    if (exactMatch) {
      // 文字入力完了
      updatedSession.typedRomaji += exactMatch;
      updatedSession.currentCharIndex++;
      updatedSession.currentInput = '';

      // すべての文字が入力完了したか
      if (updatedSession.currentCharIndex >= updatedSession.patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();
        return {
          success: true,
          status: 'all_completed',
          session: updatedSession,
        };
      }
      return {
        success: true,
        status: 'char_completed',
        session: updatedSession,
      };
    }

    return {
      success: true,
      status: 'in_progress',
      session: updatedSession,
    };
  }

  // 分割入力処理（例：「し」に対して「shi」の「s」「hi」)
  const splitResult = optimizeSplitInput(
    char,
    currentPatterns,
    session.currentInput
  );

  if (splitResult) {
    // 分割処理が有効
    const updatedSession = {
      ...session,
      currentInput: splitResult.secondPart,
    };

    if (splitResult.secondPart === splitResult.matchedPattern) {
      // 文字入力完了
      updatedSession.typedRomaji += splitResult.matchedPattern;
      updatedSession.currentCharIndex++;
      updatedSession.currentInput = '';

      if (updatedSession.currentCharIndex >= updatedSession.patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();
        return {
          success: true,
          status: 'all_completed',
          session: updatedSession,
        };
      }
      return {
        success: true,
        status: 'char_completed_split',
        session: updatedSession,
      };
    }

    return {
      success: true,
      status: 'in_progress_split',
      session: updatedSession,
    };
  }

  // 入力が一致しない
  return { success: false, status: 'no_match' };
}

/**
 * 色分け情報を取得
 */
function getColoringInfo(session) {
  if (!session)
    return {
      typedLength: 0,
      currentInputLength: 0,
      currentPosition: 0,
      completed: false,
    };

  if (session.completed) {
    return {
      typedLength: session.displayRomaji.length,
      currentInputLength: 0,
      currentPosition: session.displayRomaji.length,
      currentDisplay: '',
      completed: true,
      completedAt: session.completedAt,
    };
  }

  // 事前計算済みのインデックスを使用
  const typedIndex =
    session.currentCharIndex > 0
      ? session.displayIndices[session.currentCharIndex]
      : 0;

  const currentPosition =
    session.currentCharIndex < session.patterns.length
      ? session.displayIndices[session.currentCharIndex]
      : session.displayRomaji.length;

  return {
    typedLength: typedIndex,
    currentInputLength: session.currentInput.length,
    currentPosition: currentPosition,
    currentDisplay: '',
    completed: false,
  };
}

/**
 * 入力の分割最適化 - typingmania-refの技術を応用
 */
function optimizeSplitInput(input, patterns, currentInput = '') {
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
          matchedPattern: pattern,
        };
      }
    }
  }

  return null;
}

/**
 * スコア計算とKPM計算
 * メインスレッドから切り離すことで計算負荷の影響をなくす
 * @param {Object} statsData - 計算に必要な統計データ
 * @returns {Object} 計算結果
 */
function calculateStatistics(statsData) {
  const {
    correctCount,
    missCount,
    startTimeMs,
    currentTimeMs,
    problemStats = [],
  } = statsData;

  // 計算結果を格納するオブジェクト
  const result = {
    totalCount: correctCount + missCount,
    accuracy: 0,
    elapsedTimeMs: 0,
    elapsedTimeSeconds: 0,
    kpm: 0,
    rank: 'F',
    problemKPMs: [],
  };

  // 計算に必要な基本データ
  result.elapsedTimeMs = currentTimeMs - startTimeMs;
  result.elapsedTimeSeconds = result.elapsedTimeMs / 1000;

  // 正確性計算
  if (result.totalCount > 0) {
    result.accuracy = (correctCount / result.totalCount) * 100;
  }

  // 問題ごとのKPM計算
  if (Array.isArray(problemStats) && problemStats.length > 0) {
    let totalKeyCount = 0;
    let totalTimeMs = 0;

    // 各問題のKPMを計算して配列に追加
    problemStats.forEach((problem) => {
      if (problem && typeof problem === 'object') {
        const { problemKeyCount, problemElapsedMs } = problem;

        // 各問題のKPMを計算
        let problemKPM = 0;
        if (problemElapsedMs > 0) {
          const minutes = problemElapsedMs / 60000; // ミリ秒を分に変換
          problemKPM = Math.floor(problemKeyCount / minutes); // 小数点以下切り捨て
        }

        // 総計にも加算
        totalKeyCount += problemKeyCount || 0;
        totalTimeMs += problemElapsedMs || 0;

        // 各問題のKPM配列に追加
        result.problemKPMs.push(problemKPM);
      }
    });

    // 総合KPMを計算
    if (totalTimeMs > 0) {
      const totalMinutes = totalTimeMs / 60000;
      result.kpm = Math.floor(totalKeyCount / totalMinutes);
    }
  } else {
    // 問題ごとのデータがない場合は単純計算
    const minutes = result.elapsedTimeMs / 60000;
    if (minutes > 0) {
      result.kpm = Math.floor(correctCount / minutes);
    }
  }

  // ランク計算
  result.rank = calculateRank(result.kpm);

  return result;
}

/**
 * KPM値からランクを判定する関数
 * @param {number} kpm - KPM値
 * @returns {string} ランク（S, A, B, C, D, E, F）
 */
function calculateRank(kpm) {
  if (kpm >= 400) return 'S';
  if (kpm >= 300) return 'A';
  if (kpm >= 200) return 'B';
  if (kpm >= 150) return 'C';
  if (kpm >= 100) return 'D';
  if (kpm >= 50) return 'E';
  return 'F';
}

/**
 * ランキングサーバーへの記録送信
 * 非同期のネットワークリクエストをワーカーで処理することでメインスレッドを解放
 * @param {Object} recordData - 送信する記録データ
 */
async function submitRanking(recordData) {
  try {
    // ランキングサーバーのエンドポイント
    const endpoint = recordData.endpoint || 'https://api.example.com/ranking';

    // リクエストオプション
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: recordData.username || 'Anonymous',
        score: recordData.score,
        kpm: recordData.kpm,
        accuracy: recordData.accuracy,
        problemCount: recordData.problemCount,
        timestamp: new Date().toISOString(),
      }),
    };

    // APIリクエスト実行
    const response = await fetch(endpoint, options);

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('ランキング送信エラー:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 入力履歴データの処理と集計
 * @param {Array} inputHistory - キー入力の履歴データ
 */
function processInputHistory(inputHistory) {
  if (!Array.isArray(inputHistory) || inputHistory.length === 0) {
    return { success: false, error: '有効な入力履歴がありません' };
  }

  // 集計結果
  const result = {
    totalKeyCount: 0,
    correctKeyCount: 0,
    missCount: 0,
    keyFrequency: {}, // どのキーが何回押されたか
    errorPatterns: {}, // よくミスするパターン
    speedPatterns: [], // 速度パターン（時間経過とともにどう変わるか）
  };

  // 入力キーごとの頻度を集計
  inputHistory.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const { key, isCorrect, timestamp } = entry;

    // 全体カウント
    result.totalKeyCount++;

    // 正誤カウント
    if (isCorrect) {
      result.correctKeyCount++;
    } else {
      result.missCount++;
    }

    // キー頻度の集計
    if (key) {
      result.keyFrequency[key] = (result.keyFrequency[key] || 0) + 1;
    }

    // エラーパターンの集計
    if (!isCorrect && entry.expectedKey) {
      const errorPattern = `${entry.expectedKey}->${key}`;
      result.errorPatterns[errorPattern] =
        (result.errorPatterns[errorPattern] || 0) + 1;
    }

    // 速度パターン（10秒ごとのセグメントに分割）
    if (timestamp) {
      const timeSegment = Math.floor(timestamp / 10000); // 10秒単位で区切る

      if (!result.speedPatterns[timeSegment]) {
        result.speedPatterns[timeSegment] = {
          keyCount: 0,
          correctCount: 0,
          startTime: timeSegment * 10000,
          endTime: (timeSegment + 1) * 10000,
        };
      }

      result.speedPatterns[timeSegment].keyCount++;
      if (isCorrect) {
        result.speedPatterns[timeSegment].correctCount++;
      }
    }
  });

  // スパースな配列を詰める
  result.speedPatterns = result.speedPatterns.filter(Boolean);

  return {
    success: true,
    data: result,
  };
}

/**
 * Web Workerのメッセージハンドラ
 * すべてのタイピング処理をメインスレッドから分離して実行
 */
self.onmessage = function (e) {
  const { type, data, callbackId } = e.data;

  switch (type) {
    case 'processInput':
      // 入力処理を実行
      try {
        const { session, char } = data;
        const normalizedChar = convertFullWidthToHalfWidth(char.toLowerCase());
        const result = processInput(session, normalizedChar);

        // 結果をメインスレッドに返す
        self.postMessage({
          type: 'processInputResult',
          callbackId,
          data: result,
        });
      } catch (err) {
        console.error('Worker処理エラー (processInput):', err);
        self.postMessage({
          type: 'processInputResult',
          callbackId,
          data: { success: false, status: 'worker_error', error: err.message },
        });
      }
      break;

    case 'getColoringInfo':
      // 色分け情報を計算
      try {
        const coloringInfo = getColoringInfo(data.session);

        // 結果をメインスレッドに返す
        self.postMessage({
          type: 'coloringInfoResult',
          callbackId,
          data: coloringInfo,
        });
      } catch (err) {
        console.error('Worker処理エラー (getColoringInfo):', err);
        self.postMessage({
          type: 'coloringInfoResult',
          callbackId,
          data: { error: err.message },
        });
      }
      break;

    case 'calculateStatistics':
      // 統計情報を計算
      try {
        const result = calculateStatistics(data);
        self.postMessage({
          type: 'calculateStatisticsResult',
          callbackId,
          data: result,
        });
      } catch (err) {
        console.error('Worker処理エラー (calculateStatistics):', err);
        self.postMessage({
          type: 'calculateStatisticsResult',
          callbackId,
          data: { error: err.message },
        });
      }
      break;

    case 'submitRanking':
      // ランキング送信処理（非同期）
      submitRanking(data)
        .then((result) => {
          self.postMessage({
            type: 'submitRankingResult',
            callbackId,
            data: result,
          });
        })
        .catch((err) => {
          console.error('Worker処理エラー (submitRanking):', err);
          self.postMessage({
            type: 'submitRankingResult',
            callbackId,
            data: { success: false, error: err.message },
          });
        });
      break;

    case 'processInputHistory':
      // 入力履歴の処理と集計
      try {
        const result = processInputHistory(data.inputHistory);
        self.postMessage({
          type: 'processInputHistoryResult',
          callbackId,
          data: result,
        });
      } catch (err) {
        console.error('Worker処理エラー (processInputHistory):', err);
        self.postMessage({
          type: 'processInputHistoryResult',
          callbackId,
          data: { success: false, error: err.message },
        });
      }
      break;

    case 'ping':
      // 生存確認用
      self.postMessage({
        type: 'pong',
        data: { received: Date.now() },
      });
      break;

    default:
      console.warn('不明なメッセージタイプ:', type);
      break;
  }
};
