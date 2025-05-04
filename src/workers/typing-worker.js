/**
 * タイピング処理をメインスレッドから分離するためのWeb Worker
 * UIスレッドのブロッキングを防ぎ、タイピングの反応速度を最大化
 * 高リフレッシュレート対応版（低レイテンシ最適化）
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

// パフォーマンス最適化設定
const performanceSettings = {
  // 計算キャッシュのサイズ制限
  maxCacheSize: 1000,
  // バッチ処理サイズ - 一度に処理する最大アイテム数
  maxBatchSize: 20,
  // レスポンス最適化モード（高リフレッシュレート向け）
  responseOptimization: 'high', // 'normal', 'high', 'extreme'
  // 自動最適化モード
  autoOptimize: true,
  // 統計収集の有効化
  collectMetrics: true,
  // 高リフレッシュレート用最適化
  highRefreshRateOptimizations: true,
  // 検出されたディスプレイのリフレッシュレート
  detectedRefreshRate: 60,
};

// パフォーマンスメトリクス
const metrics = {
  startTime: Date.now(),
  processInputCalls: 0,
  coloringInfoCalls: 0,
  statsCalls: 0,
  totalProcessingTime: 0,
  maxProcessingTime: 0,
  lastBatchSize: 0,
  processingHistory: []
};

// 処理結果のキャッシュ
const cache = {
  coloringInfo: new Map(),
  processInput: new Map(),
  statistics: new Map(),
};

// ディスプレイ機能情報（メインスレッドから設定される）
let displayCapabilities = {
  refreshRate: 60,
  offscreenCanvas: false,
  highPrecisionTime: true,
  supportsSharedArrayBuffer: false
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
 * 高リフレッシュレート対応の高速化タイピング処理
 * @param {object} session - タイピングセッションオブジェクト (シリアライズ済み)
 * @param {string} char - 入力された文字
 * @returns {object} - 処理結果
 */
function processInput(session, char) {
  // パフォーマンス測定開始
  const startTime = performance.now();
  
  // メトリクス更新
  if (performanceSettings.collectMetrics) {
    metrics.processInputCalls++;
  }
  
  // セッションが差分のみの場合、前回のセッションと統合
  if (session.isDiff && self._lastFullSession) {
    session = {
      ...self._lastFullSession,
      ...session
    };
  } else if (session.isFullSync) {
    // 完全なセッションの場合はキャッシュ
    self._lastFullSession = { ...session };
  }
  
  // セッション変更なしの場合は前回の結果を再利用
  if (session.unchanged) {
    return { success: false, status: 'unchanged_session' };
  }

  if (!session || session.completed) {
    return { success: false, status: 'already_completed' };
  }

  const currentPatterns = session.patterns[session.currentCharIndex];
  if (!currentPatterns) {
    return { success: false, status: 'invalid_state' };
  }

  // 新しい入力を追加
  const newInput = session.currentInput + char;

  // キャッシュキーを生成（高速化）
  const cacheKey = `${session.currentCharIndex}:${newInput}`;
  
  // キャッシュにヒットした場合は即時返却（高速処理パス）
  if (cache.processInput.has(cacheKey)) {
    const cachedResult = cache.processInput.get(cacheKey);
    
    // 返却前に統計情報を更新
    if (performanceSettings.collectMetrics) {
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      metrics.totalProcessingTime += processingTime;
      if (processingTime > metrics.maxProcessingTime) {
        metrics.maxProcessingTime = processingTime;
      }
      
      // 高リフレッシュレート環境での処理時間トラッキング
      if (performanceSettings.highRefreshRateOptimizations) {
        const targetFrameTime = 1000 / performanceSettings.detectedRefreshRate;
        if (processingTime > targetFrameTime / 4) {
          // フレームタイム1/4以上かかるなら記録（パフォーマンス問題の可能性）
          metrics.processingHistory.push({
            type: 'processInput',
            time: processingTime,
            cached: true,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return cachedResult;
  }

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
    // 差分更新のため、必要な属性だけ更新
    const updatedSession = {
      currentCharIndex: session.currentCharIndex,
      typedRomaji: session.typedRomaji,
      currentInput: newInput,
      completed: session.completed,
      completedAt: session.completedAt,
      isDiff: true
    };

    if (exactMatch) {
      // 文字入力完了
      updatedSession.typedRomaji += exactMatch;
      updatedSession.currentCharIndex++;
      updatedSession.currentInput = '';

      // すべての文字が入力完了したか
      if (updatedSession.currentCharIndex >= session.patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();
        
        const result = {
          success: true,
          status: 'all_completed',
          session: updatedSession,
        };
        
        // キャッシュに保存（次回高速化のため）
        if (cache.processInput.size > performanceSettings.maxCacheSize) {
          // キャッシュサイズ管理
          cache.processInput.clear();
        }
        cache.processInput.set(cacheKey, result);
        
        // 統計情報を更新
        if (performanceSettings.collectMetrics) {
          const endTime = performance.now();
          const processingTime = endTime - startTime;
          metrics.totalProcessingTime += processingTime;
          if (processingTime > metrics.maxProcessingTime) {
            metrics.maxProcessingTime = processingTime;
          }
        }
        
        return result;
      }
      
      const result = {
        success: true,
        status: 'char_completed',
        session: updatedSession,
      };
      
      // キャッシュに保存
      if (cache.processInput.size > performanceSettings.maxCacheSize) {
        cache.processInput.clear();
      }
      cache.processInput.set(cacheKey, result);
      
      // 統計情報を更新
      if (performanceSettings.collectMetrics) {
        const endTime = performance.now();
        metrics.totalProcessingTime += (endTime - startTime);
      }
      
      return result;
    }

    const result = {
      success: true,
      status: 'in_progress',
      session: updatedSession,
    };
    
    // キャッシュに保存
    if (cache.processInput.size > performanceSettings.maxCacheSize) {
      cache.processInput.clear();
    }
    cache.processInput.set(cacheKey, result);
    
    // 統計情報を更新
    if (performanceSettings.collectMetrics) {
      const endTime = performance.now();
      metrics.totalProcessingTime += (endTime - startTime);
    }
    
    return result;
  }

  // 分割入力処理（例：「し」に対して「shi」の「s」「hi」)
  const splitResult = optimizeSplitInput(
    char,
    currentPatterns,
    session.currentInput
  );

  if (splitResult) {
    // 分割処理が有効 - 差分更新として必要な属性のみ
    const updatedSession = {
      currentCharIndex: session.currentCharIndex,
      typedRomaji: session.typedRomaji,
      currentInput: splitResult.secondPart,
      completed: session.completed,
      completedAt: session.completedAt,
      isDiff: true
    };

    if (splitResult.secondPart === splitResult.matchedPattern) {
      // 文字入力完了
      updatedSession.typedRomaji += splitResult.matchedPattern;
      updatedSession.currentCharIndex++;
      updatedSession.currentInput = '';

      if (updatedSession.currentCharIndex >= session.patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();
        
        const result = {
          success: true,
          status: 'all_completed',
          session: updatedSession,
        };
        
        // キャッシュに保存
        if (cache.processInput.size > performanceSettings.maxCacheSize) {
          cache.processInput.clear();
        }
        cache.processInput.set(cacheKey, result);
        
        // 統計情報を更新
        if (performanceSettings.collectMetrics) {
          const endTime = performance.now();
          metrics.totalProcessingTime += (endTime - startTime);
        }
        
        return result;
      }
      
      const result = {
        success: true,
        status: 'char_completed_split',
        session: updatedSession,
      };
      
      // キャッシュに保存
      if (cache.processInput.size > performanceSettings.maxCacheSize) {
        cache.processInput.clear();
      }
      cache.processInput.set(cacheKey, result);
      
      // 統計情報を更新
      if (performanceSettings.collectMetrics) {
        const endTime = performance.now();
        metrics.totalProcessingTime += (endTime - startTime);
      }
      
      return result;
    }

    const result = {
      success: true,
      status: 'in_progress_split',
      session: updatedSession,
    };
    
    // キャッシュに保存
    if (cache.processInput.size > performanceSettings.maxCacheSize) {
      cache.processInput.clear();
    }
    cache.processInput.set(cacheKey, result);
    
    // 統計情報を更新
    if (performanceSettings.collectMetrics) {
      const endTime = performance.now();
      metrics.totalProcessingTime += (endTime - startTime);
    }
    
    return result;
  }

  // 入力が一致しない
  const result = { success: false, status: 'no_match' };
  
  // キャッシュに保存
  if (cache.processInput.size > performanceSettings.maxCacheSize) {
    cache.processInput.clear();
  }
  cache.processInput.set(cacheKey, result);
  
  // 統計情報を更新
  if (performanceSettings.collectMetrics) {
    const endTime = performance.now();
    metrics.totalProcessingTime += (endTime - startTime);
  }
  
  return result;
}

/**
 * 色分け情報を取得（高リフレッシュレート最適化版）
 */
function getColoringInfo(session) {
  // パフォーマンス測定開始
  const startTime = performance.now();
  
  // メトリクス更新
  if (performanceSettings.collectMetrics) {
    metrics.coloringInfoCalls++;
  }
  
  // セッションが差分のみの場合、前回のセッションと統合
  if (session.isDiff && self._lastFullSession) {
    session = {
      ...self._lastFullSession,
      ...session
    };
  } else if (session.isFullSync) {
    // 完全なセッションの場合はキャッシュ
    self._lastFullSession = { ...session };
  }
  
  // セッション変更なしの場合は前回の結果を再利用
  if (session.unchanged && self._lastColoringInfo) {
    return self._lastColoringInfo;
  }

  if (!session) {
    return {
      typedLength: 0,
      currentInputLength: 0,
      currentPosition: 0,
      completed: false,
    };
  }

  // キャッシュキーを作成
  const cacheKey = `${session.currentCharIndex}_${session.currentInput}_${session.completed}`;
  if (self._coloringCache.has(cacheKey)) {
    return self._coloringCache.get(cacheKey);
  }

  if (session.completed) {
    const result = {
      typedLength: session.displayRomaji.length,
      currentInputLength: 0,
      currentPosition: session.displayRomaji.length,
      currentDisplay: '',
      completed: true,
      completedAt: session.completedAt,
    };
    
    // キャッシュに保存
    self._coloringCache.set(cacheKey, result);
    self._lastColoringInfo = result;
    
    // 統計情報を更新
    if (performanceSettings.collectMetrics) {
      const endTime = performance.now();
      metrics.totalProcessingTime += (endTime - startTime);
    }
    
    return result;
  }

  // 事前計算済みのインデックスを使用（高速化）
  const typedIndex =
    session.currentCharIndex > 0
      ? session.displayIndices[session.currentCharIndex]
      : 0;

  const currentPosition =
    session.currentCharIndex < session.patterns.length
      ? session.displayIndices[session.currentCharIndex]
      : session.displayRomaji.length;

  const result = {
    typedLength: typedIndex,
    currentInputLength: session.currentInput.length,
    currentPosition: currentPosition,
    currentDisplay: '',
    completed: false,
  };
  
  // キャッシュに保存
  self._coloringCache.set(cacheKey, result);
  self._lastColoringInfo = result;
  
  // 統計情報を更新
  if (performanceSettings.collectMetrics) {
    const endTime = performance.now();
    metrics.totalProcessingTime += (endTime - startTime);
  }
  
  return result;
}

/**
 * 入力の分割最適化 - 高リフレッシュレート対応版
 */
function optimizeSplitInput(input, patterns, currentInput = '') {
  if (!input || !patterns || !patterns.length) return null;

  // キャッシュキー
  const cacheKey = `split_${currentInput}_${input}`;
  if (cache.processInput.has(cacheKey)) {
    return cache.processInput.get(cacheKey);
  }

  // 完全一致するか確認
  const fullInput = currentInput + input;

  // すべてのパターンについて、分割可能性をチェック
  for (let splitPoint = 1; splitPoint < fullInput.length; splitPoint++) {
    const firstPart = fullInput.substring(0, splitPoint);
    const secondPart = fullInput.substring(splitPoint);

    // 現在のパターンのいずれかが第2部分で始まるか確認
    for (const pattern of patterns) {
      if (pattern.startsWith(secondPart)) {
        const result = {
          firstPart,
          secondPart,
          matchedPattern: pattern,
        };
        
        // キャッシュに保存
        if (cache.processInput.size > performanceSettings.maxCacheSize) {
          cache.processInput.clear();
        }
        cache.processInput.set(cacheKey, result);
        
        return result;
      }
    }
  }

  // キャッシュに保存（negative caching）
  if (cache.processInput.size > performanceSettings.maxCacheSize) {
    cache.processInput.clear();
  }
  cache.processInput.set(cacheKey, null);
  
  return null;
}

/**
 * スコア計算とKPM計算（高速化版）
 * メインスレッドから切り離すことで計算負荷の影響をなくす
 * @param {Object} statsData - 計算に必要な統計データ
 * @returns {Object} 計算結果
 */
function calculateStatistics(statsData) {
  // パフォーマンス測定開始
  const startTime = performance.now();
  
  // メトリクス更新
  if (performanceSettings.collectMetrics) {
    metrics.statsCalls++;
  }
  
  const {
    correctCount,
    missCount,
    startTimeMs,
    currentTimeMs,
    problemStats = [],
  } = statsData;
  
  // キャッシュキー
  const cacheKey = `${correctCount}_${missCount}_${startTimeMs}_${currentTimeMs}_${problemStats.length}`;
  if (cache.statistics.has(cacheKey)) {
    return cache.statistics.get(cacheKey);
  }

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
  
  // キャッシュに保存
  if (cache.statistics.size > performanceSettings.maxCacheSize) {
    cache.statistics.clear();
  }
  cache.statistics.set(cacheKey, result);
  
  // 統計情報を更新
  if (performanceSettings.collectMetrics) {
    const endTime = performance.now();
    metrics.totalProcessingTime += (endTime - startTime);
  }

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
 * 入力履歴データの処理と集計（高リフレッシュレート対応版）
 * @param {Object} inputHistoryData - キー入力の履歴データ（フォーマットによって構造が異なる）
 */
function processInputHistory(inputHistoryData) {
  let inputHistory;
  
  // バイナリデータの場合は展開
  if (inputHistoryData.format === 'binary' && inputHistoryData.buffer instanceof ArrayBuffer) {
    inputHistory = [];
    const view = new DataView(inputHistoryData.buffer);
    
    for (let i = 0; i < inputHistoryData.length; i++) {
      const offset = i * 16;
      const timestamp = view.getUint32(offset);
      const isCorrect = view.getUint8(offset + 4) === 1;
      
      // キーコードからキャラクタに変換（シンプル版）
      let key = '';
      const keyCode = view.getUint8(offset + 5);
      if (keyCode > 0) {
        key = String.fromCharCode(keyCode);
      }
      
      inputHistory.push({
        key,
        isCorrect,
        timestamp
      });
    }
  } else if (inputHistoryData.format === 'json') {
    // JSONデータの場合はそのまま使用
    inputHistory = inputHistoryData.inputHistory;
  } else {
    inputHistory = inputHistoryData;
  }

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
 * メトリクス情報を取得
 */
function getMetrics() {
  return {
    ...metrics,
    uptime: Date.now() - metrics.startTime,
    cacheStats: {
      processInputSize: cache.processInput.size,
      coloringInfoSize: cache.coloringInfo.size,
      statisticsSize: cache.statistics.size,
    },
    performanceSettings,
    // フレーム時間情報を追加（リフレッシュレート対応）
    frameTimeTarget: performanceSettings.detectedRefreshRate ? 
      1000 / performanceSettings.detectedRefreshRate : 16.67,
    recentProcessingHistory: metrics.processingHistory.slice(-10)
  };
}

/**
 * ディスプレイ機能情報を設定
 */
function setDisplayCapabilities(capabilities) {
  displayCapabilities = { ...capabilities };
  
  // 設定を更新
  if (displayCapabilities.refreshRate) {
    performanceSettings.detectedRefreshRate = displayCapabilities.refreshRate;
    
    // リフレッシュレートが高い場合の特別な最適化
    if (displayCapabilities.refreshRate >= 120) {
      performanceSettings.responseOptimization = 'high';
      console.log(`[Worker] 高リフレッシュレート(${displayCapabilities.refreshRate}Hz)を検出、最適化モード有効化`);
    }
    if (displayCapabilities.refreshRate >= 240) {
      performanceSettings.responseOptimization = 'extreme';
      console.log('[Worker] 超高リフレッシュレート検出、極限最適化モード有効化');
    }
  }
  
  return { success: true };
}

/**
 * 最適化設定を更新
 */
function updateOptimizationOptions(options) {
  Object.assign(performanceSettings, options);
  return { success: true };
}

// Web Worker グローバルコンテキスト初期化
self._lastFullSession = null; // 完全なセッションを保持するためのキャッシュ
self._coloringCache = new Map(); // 色分け情報のキャッシュ
self._lastColoringInfo = null;  // 最後の色分け情報

/**
 * パフォーマンス監視間隔（秒）
 * 定期的にメトリクスをメインスレッドに送信
 */
let metricsReportingInterval = null;
if (performanceSettings.collectMetrics) {
  metricsReportingInterval = setInterval(() => {
    self.postMessage({
      type: 'metrics',
      data: getMetrics(),
    });
    
    // 古いデータをクリア（メモリ管理）
    if (metrics.processingHistory.length > 100) {
      // 古い履歴を半分だけ残す
      metrics.processingHistory = metrics.processingHistory.slice(-50);
    }
  }, 5000);
}

/**
 * Web Workerのメッセージハンドラ
 * すべてのタイピング処理をメインスレッドから分離して実行
 * 高リフレッシュレート対応版（レイテンシ最小化）
 */
self.onmessage = function (e) {
  // パフォーマンス測定開始
  const receiveTime = performance.now();
  
  const { type, data, callbackId, priority } = e.data;
  
  switch (type) {
    case 'processInput':
      // 高優先度の入力処理として実行
      try {
        const { session, char } = data;
        const normalizedChar = convertFullWidthToHalfWidth(char.toLowerCase());
        const result = processInput(session, normalizedChar);

        // 結果をメインスレッドに返す（優先度情報付き）
        self.postMessage({
          type: 'processInputResult',
          callbackId,
          priority: 'high', // 入力処理は常に高優先度
          data: result,
        });
        
        // 処理時間を計測
        const processingTime = performance.now() - receiveTime;
        
        // 高リフレッシュレート環境でのパフォーマンス警告
        const targetFrameTime = performanceSettings.detectedRefreshRate ? 
          1000 / performanceSettings.detectedRefreshRate : 16.67;
          
        if (performanceSettings.highRefreshRateOptimizations && 
            processingTime > targetFrameTime / 2) {
          // フレームタイムの半分以上かかる場合は記録
          metrics.processingHistory.push({
            type: 'processInput',
            time: processingTime,
            cached: !!result.cached,
            timestamp: Date.now()
          });
          
          console.warn(
            `[Worker] 高レイテンシ入力処理: ${processingTime.toFixed(2)}ms` +
            `（目標: ${(targetFrameTime / 2).toFixed(2)}ms）`
          );
        }
      } catch (err) {
        console.error('Worker処理エラー (processInput):', err);
        self.postMessage({
          type: 'processInputResult',
          callbackId,
          priority: 'high',
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
          priority: 'normal', // 色分けは標準優先度
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
          priority: 'low', // 統計計算は低優先度
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
            priority: 'low', // ランキング送信は低優先度
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
        const result = processInputHistory(data);
        self.postMessage({
          type: 'processInputHistoryResult',
          callbackId,
          priority: 'low', // 履歴処理は低優先度
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
      
    case 'getMetrics':
      // メトリクス情報取得
      self.postMessage({
        type: 'metricsResult',
        callbackId,
        data: getMetrics(),
      });
      break;
      
    case 'setDisplayCapabilities':
      // ディスプレイ機能情報を設定
      try {
        const result = setDisplayCapabilities(data);
        if (callbackId) {
          self.postMessage({
            type: 'setDisplayCapabilitiesResult',
            callbackId,
            data: result,
          });
        }
      } catch (err) {
        console.error('Worker処理エラー (setDisplayCapabilities):', err);
        if (callbackId) {
          self.postMessage({
            type: 'setDisplayCapabilitiesResult',
            callbackId,
            data: { success: false, error: err.message },
          });
        }
      }
      break;
      
    case 'updateOptimizationOptions':
      // 最適化設定の更新
      try {
        const result = updateOptimizationOptions(data);
        if (callbackId) {
          self.postMessage({
            type: 'updateOptimizationOptionsResult',
            callbackId,
            data: result,
          });
        }
      } catch (err) {
        console.error('Worker処理エラー (updateOptimizationOptions):', err);
        if (callbackId) {
          self.postMessage({
            type: 'updateOptimizationOptionsResult',
            callbackId,
            data: { success: false, error: err.message },
          });
        }
      }
      break;

    default:
      console.warn('不明なメッセージタイプ:', type);
      break;
  }
};

/**
 * WorkerのonClose
 * リソース解放
 */
self.addEventListener('close', () => {
  if (metricsReportingInterval) {
    clearInterval(metricsReportingInterval);
  }
  
  // キャッシュをクリア
  cache.processInput.clear();
  cache.coloringInfo.clear();
  cache.statistics.clear();
  
  self._coloringCache.clear();
  self._lastFullSession = null;
  self._lastColoringInfo = null;
  
  console.log('[Worker] リソース解放完了');
});
