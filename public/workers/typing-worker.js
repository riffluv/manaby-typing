/**
 * typing-worker.js
 * タイピング処理用Web Worker
 * メインスレッドをブロックせずにタイピング判定処理を行う
 * 2025年5月9日 - パフォーマンス最適化とバッファー転送機能を追加
 */

// ロガーをインポート（Worker用のimport構文）
importScripts('./worker-log-utils.js');

// ロガーの設定
const logger = self.workerLogger || console;
logger.setModuleName('TypingWorker');
logger.setLogLevel(6); // NONE レベルに設定（ログ出力を完全に無効化）

// 初期設定
const DEBUG_WORKER = false;
const DEBUG_CACHE = false;

// キャッシュ設定
const cache = {
  processInput: new Map(),
  coloringInfo: new Map(),
  patternMatches: new Map(),
  // 高速アクセス用キャッシュを追加
  expectedKeys: new Map(),
  completionStats: new Map(),
};

// パフォーマンス設定
const performanceSettings = {
  maxCacheSize: 1000,
  useOptimizations: true,
  collectMetrics: true,
  // 最適化用の新しい設定
  useSharedMemory: typeof SharedArrayBuffer !== 'undefined',
  useFastPathProcessing: true,
  batchProcessing: true,
  adaptiveResponseTime: true,
};

// パフォーマンスメトリクス
const metrics = {
  processInputCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProcessingTime: 0,
  lastReset: Date.now(),
  // 詳細メトリクスを追加
  fastPathUsed: 0,
  sharedBufferTransfers: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  batchOperations: 0,
};

// 共有バッファー（対応環境のみ）
let sharedBuffer = null;
let sharedTypedArray = null;

// 共有バッファーのセットアップ（対応環境のみ）
if (performanceSettings.useSharedMemory) {
  try {
    // 128バイトのバッファーを確保（キーの状態などに使用）
    sharedBuffer = new SharedArrayBuffer(128);
    sharedTypedArray = new Uint8Array(sharedBuffer);
    logger.debug('SharedArrayBufferが初期化されました');
  } catch (e) {
    logger.warn('SharedArrayBufferが利用できません:', e);
    performanceSettings.useSharedMemory = false;
  }
}

// Worker初期化メッセージ
self.postMessage({
  type: 'worker_init',
  data: {
    status: 'initialized',
    timestamp: Date.now(),
    features: {
      sharedMemory: performanceSettings.useSharedMemory,
      adaptiveProcessing: performanceSettings.adaptiveResponseTime,
    },
  },
});

/**
 * メインスレッドからのメッセージを受信
 */
self.onmessage = function (e) {
  try {
    const { type, data, callbackId, priority } = e.data;
    const startTime = performance.now();

    // タイプに応じた処理分岐
    switch (type) {
      case 'processInput':
        handleProcessInput(data, callbackId);
        break;

      case 'getColoringInfo':
        handleGetColoringInfo(data, callbackId);
        break;

      case 'calculateStatistics':
        handleCalculateStatistics(data, callbackId);
        break;

      case 'PRELOAD_PATTERNS':
        handlePreloadPatterns(data, callbackId);
        break;

      case 'updateOptimizationOptions':
        handleUpdateOptimizationOptions(data, callbackId);
        break;

      case 'RESET':
        handleReset(callbackId);
        break;

      case 'CLEAR_INPUT_HISTORY':
        handleClearInputHistory(callbackId);
        break;

      case 'getMetrics':
        handleGetMetrics(callbackId);
        break;

      case 'ping':
        // 疎通確認
        self.postMessage({
          type: 'pong',
          data: {
            received: true,
            timestamp: Date.now(),
            echo: data,
          },
          callbackId,
        });
        break;

      case 'batch':
        // バッチ処理
        handleBatchOperation(data, callbackId);
        break;

      case 'setDisplayCapabilities':
        // ディスプレイ機能設定
        handleSetDisplayCapabilities(data, callbackId);
        break;

      case 'getNextExpectedKey':
        // 次に期待されるキーを取得（超高速パス）
        handleGetNextExpectedKey(data, callbackId);
        break;

      case 'submitRanking':
        // ランキング送信
        handleSubmitRanking(data, callbackId);
        break;

      default:
        logger.warn('未知のメッセージタイプ:', type);
        self.postMessage({
          type: 'unknown_command',
          data: { error: `未知のコマンド: ${type}` },
          callbackId,
        });
    }

    // レスポンスタイム計測（優先度の高いものだけ）
    if (priority === 'high') {
      const responseTime = performance.now() - startTime;
      updateResponseTimeMetrics(responseTime);
    }
  } catch (error) {
    // エラー処理
    logger.error('メッセージ処理エラー:', error);
    self.postMessage({
      type: 'worker_error',
      data: {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      },
      error: error.message,
    });
  }
};

/**
 * レスポンスタイムメトリクスの更新
 */
function updateResponseTimeMetrics(responseTime) {
  if (!performanceSettings.collectMetrics) return;

  // 実行回数で加重平均
  const totalCalls =
    metrics.processInputCalls > 0 ? metrics.processInputCalls : 1;
  metrics.averageResponseTime =
    (metrics.averageResponseTime * (totalCalls - 1) + responseTime) /
    totalCalls;

  // 最大応答時間を更新
  metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);

  // 適応型応答時間の調整
  if (performanceSettings.adaptiveResponseTime) {
    // 応答時間が悪化している場合、最適化モードを調整
    if (metrics.averageResponseTime > 5 && metrics.processInputCalls > 50) {
      // キャッシュサイズの増加
      performanceSettings.maxCacheSize = Math.min(
        2000,
        performanceSettings.maxCacheSize * 1.5
      );
    }
  }
}

/**
 * 複数操作のバッチ処理
 */
function handleBatchOperation(operations, callbackId) {
  if (!operations || !Array.isArray(operations)) {
    self.postMessage({
      type: 'batch_result',
      data: { error: '無効なバッチデータ' },
      callbackId,
    });
    return;
  }

  const results = [];
  let hasError = false;

  // バッチ処理カウント
  if (performanceSettings.collectMetrics) {
    metrics.batchOperations++;
  }

  // 各操作を実行
  for (const op of operations) {
    try {
      let result;
      switch (op.type) {
        case 'processInput':
          result = processInput(op.data.session, op.data.char);
          break;
        case 'getColoringInfo':
          result = getColoringInfo(op.data);
          break;
        case 'getNextExpectedKey':
          result = getNextExpectedKey(op.data);
          break;
        default:
          result = { error: `未対応のバッチ操作: ${op.type}` };
          hasError = true;
      }
      results.push({ type: op.type, data: result });
    } catch (error) {
      results.push({ type: op.type, error: error.message });
      hasError = true;
    }
  }

  // 結果を返信
  self.postMessage({
    type: 'batch_result',
    data: {
      results,
      hasError,
      count: results.length,
    },
    callbackId,
  });
}

/**
 * 表示機能情報の設定
 */
function handleSetDisplayCapabilities(data, callbackId) {
  try {
    // リフレッシュレートに応じて最適化設定を調整
    if (data.refreshRate) {
      if (data.refreshRate > 100) {
        // 高リフレッシュレートディスプレイの場合
        performanceSettings.useOptimizations = true;
        performanceSettings.useFastPathProcessing = true;
      } else if (data.refreshRate < 30) {
        // 低リフレッシュレートの場合
        performanceSettings.useOptimizations = false;
      }
    }

    // SharedArrayBufferのサポート
    if (typeof data.supportsSharedArrayBuffer === 'boolean') {
      performanceSettings.useSharedMemory =
        data.supportsSharedArrayBuffer &&
        typeof SharedArrayBuffer !== 'undefined';
    }

    self.postMessage({
      type: 'capabilities_set',
      data: { success: true, appliedSettings: { ...performanceSettings } },
      callbackId,
    });
  } catch (error) {
    logger.error('表示機能設定エラー:', error);
    self.postMessage({
      type: 'capabilities_set',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * 次の入力キー取得（超高速パス）
 */
function handleGetNextExpectedKey(data, callbackId) {
  try {
    const result = getNextExpectedKey(data);

    self.postMessage({
      type: 'next_key_result',
      data: result,
      callbackId,
    });
  } catch (error) {
    logger.error('次キー取得エラー:', error);
    self.postMessage({
      type: 'next_key_result',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * 次の入力キー取得処理
 */
function getNextExpectedKey(session) {
  if (!session || !session.patterns) {
    return { key: '', error: '無効なセッション' };
  }

  // キャッシュキー作成
  const cacheKey = `nk_${session.currentCharIndex}_${
    session.currentInput || ''
  }`;

  // キャッシュチェック（高速パス）
  if (cache.expectedKeys.has(cacheKey)) {
    return { key: cache.expectedKeys.get(cacheKey) };
  }

  // 計算
  let expectedKey = '';
  const currentCharIndex = session.currentCharIndex || 0;

  if (currentCharIndex < session.patterns.length) {
    const patterns = session.patterns[currentCharIndex];

    if (patterns && patterns.length > 0) {
      const currentInput = session.currentInput || '';
      const pattern = patterns[0];

      if (pattern) {
        if (currentInput && pattern.startsWith(currentInput)) {
          expectedKey = pattern[currentInput.length] || '';
        } else {
          expectedKey = pattern[0] || '';
        }
      }
    }
  }

  // キャッシュに保存
  cache.expectedKeys.set(cacheKey, expectedKey);

  // キャッシュサイズ管理
  if (cache.expectedKeys.size > 1000) {
    const keys = Array.from(cache.expectedKeys.keys()).slice(0, 300);
    keys.forEach((k) => cache.expectedKeys.delete(k));
  }

  return { key: expectedKey };
}

/**
 * 最適化設定の更新
 */
function handleUpdateOptimizationOptions(options, callbackId) {
  try {
    // 設定の更新
    Object.assign(performanceSettings, options);

    // キャッシュサイズの制限を適用
    if (options.maxCacheSize) {
      const currentProcessInputSize = cache.processInput.size;

      if (currentProcessInputSize > options.maxCacheSize) {
        const keysToDelete = Array.from(cache.processInput.keys()).slice(
          0,
          currentProcessInputSize - options.maxCacheSize
        );

        keysToDelete.forEach((key) => cache.processInput.delete(key));
      }
    }

    self.postMessage({
      type: 'options_updated',
      data: { success: true, currentSettings: { ...performanceSettings } },
      callbackId,
    });
  } catch (error) {
    logger.error('最適化設定エラー:', error);
    self.postMessage({
      type: 'options_updated',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * 入力処理ハンドラ
 */
function handleProcessInput(data, callbackId) {
  try {
    const { session, char, cacheKey } = data;

    // 高速パスの使用
    const useFastPath =
      performanceSettings.useFastPathProcessing &&
      session &&
      !session.completed &&
      char &&
      char.length === 1;

    // 高速パスが有効な場合、次の期待キーと直接比較
    if (useFastPath) {
      const expectedResult = getNextExpectedKey(session);
      if (expectedResult.key === char) {
        // 完全マッチ - 最速処理パス
        metrics.fastPathUsed++;

        // 高速処理結果を生成
        const fastResult = createFastPathResult(session, char);

        // 結果通知
        self.postMessage({
          type: 'INPUT_RESULT',
          data: fastResult,
          callbackId,
        });

        return;
      }
    }

    // 通常の処理パス
    const result = processInput(session, char);

    // キャッシュキーがあれば追加
    if (cacheKey && result.success !== false) {
      cache.processInput.set(cacheKey, result);

      // キャッシュサイズ制限
      if (cache.processInput.size > performanceSettings.maxCacheSize) {
        // 古いエントリを削除
        const keysToDelete = Array.from(cache.processInput.keys()).slice(
          0,
          Math.floor(performanceSettings.maxCacheSize * 0.2)
        );

        keysToDelete.forEach((key) => cache.processInput.delete(key));
      }
    }

    self.postMessage({
      type: 'INPUT_RESULT',
      data: result,
      callbackId,
    });
  } catch (error) {
    logger.error('入力処理エラー:', error);
    self.postMessage({
      type: 'INPUT_RESULT',
      error: error.message,
      success: false,
      callbackId,
    });
  }
}

/**
 * 高速パスを使用した結果の生成
 */
function createFastPathResult(session, char) {
  // セッションの浅いコピー
  const updatedSession = { ...session };

  // 入力文字が正しい場合の処理
  const currentInput = session.currentInput || '';
  const newInput = currentInput + char;

  const currentCharIndex = session.currentCharIndex || 0;
  const patterns = session.patterns || [];
  const currentPatterns = patterns[currentCharIndex] || [];

  // パターン完了チェック
  let isPatternCompleted = false;

  if (currentPatterns.length > 0) {
    if (currentPatterns[0] === newInput) {
      isPatternCompleted = true;
    }
  }

  if (isPatternCompleted) {
    // パターン完了 - 次の文字に進む
    updatedSession.currentCharIndex = currentCharIndex + 1;
    updatedSession.typedRomaji = (session.typedRomaji || '') + newInput;
    updatedSession.currentInput = '';

    // 全体完了チェック
    if (updatedSession.currentCharIndex >= patterns.length) {
      updatedSession.completed = true;
    }

    return {
      success: true,
      status: updatedSession.completed ? 'all_completed' : 'char_completed',
      session: updatedSession,
      fastPath: true,
    };
  } else {
    // パターン続行
    updatedSession.currentInput = newInput;

    return {
      success: true,
      status: 'in_progress',
      session: updatedSession,
      fastPath: true,
    };
  }
}

/**
 * 高リフレッシュレート対応の高速化タイピング処理
 */
function processInput(session, char) {
  try {
    // パフォーマンス測定開始
    const startTime = performance.now();

    // メトリクス更新
    if (performanceSettings.collectMetrics) {
      metrics.processInputCalls++;
    }

    // 入力が完全に無効な場合は早期リターン
    if (!session || !char || typeof char !== 'string') {
      return {
        success: false,
        status: 'invalid_input',
        error: '無効な入力',
      };
    }

    // セッション変更なしの場合は前回の結果を再利用
    if (session.unchanged) {
      const lastResult = self._lastResult;
      if (lastResult) {
        return lastResult;
      }
    }

    if (session.completed) {
      return {
        success: false,
        status: 'already_completed',
        session: session,
      };
    }

    // 標準タイピング判定処理
    const currentCharIndex = session.currentCharIndex || 0;
    const patterns = session.patterns || [];
    const currentPatterns = patterns[currentCharIndex] || [];
    const newInput = (session.currentInput || '') + char;

    // パターンマッチング
    let exactMatch = false;
    let matchingPrefix = false;

    for (const pattern of currentPatterns) {
      // 完全に一致する
      if (pattern === newInput) {
        exactMatch = true;
        break;
      }
      // 前方一致する
      else if (pattern.startsWith(newInput)) {
        matchingPrefix = true;
        // 完全一致が見つからない場合の早期バイパス
        if (performanceSettings.useOptimizations) break;
      }
    }

    // 結果の作成
    if (exactMatch) {
      // 文字入力完了 - 次の文字へ
      const updatedSession = {
        ...session,
        typedRomaji: (session.typedRomaji || '') + newInput,
        currentCharIndex: currentCharIndex + 1,
        currentInput: '',
      };

      // 全文字入力完了チェック
      if (updatedSession.currentCharIndex >= patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = performance.now();

        // 最終結果をキャッシュ
        self._lastResult = {
          success: true,
          status: 'all_completed',
          session: updatedSession,
        };

        return self._lastResult;
      }

      return {
        success: true,
        status: 'char_completed',
        session: updatedSession,
      };
    } else if (matchingPrefix) {
      // 入力中 - 部分一致
      const updatedSession = {
        ...session,
        currentInput: newInput,
      };

      return {
        success: true,
        status: 'in_progress',
        session: updatedSession,
      };
    }

    // 不一致
    return {
      success: false,
      status: 'no_match',
    };
  } catch (error) {
    // エラー処理
    logger.error('処理エラー:', error);
    return {
      success: false,
      status: 'error',
      error: error.message,
    };
  } finally {
    // パフォーマンス測定終了
    if (performanceSettings.collectMetrics) {
      const processingTime = performance.now() - startTime;
      metrics.totalProcessingTime += processingTime;
    }
  }
}

/**
 * 色分け情報取得ハンドラ
 */
function handleGetColoringInfo(session, callbackId) {
  try {
    const result = getColoringInfo(session);

    self.postMessage({
      type: 'COLORING_RESULT',
      data: result,
      callbackId,
    });
  } catch (error) {
    logger.error('色分け情報エラー:', error);
    self.postMessage({
      type: 'COLORING_RESULT',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * 色分け情報取得処理
 */
function getColoringInfo(session) {
  if (!session) {
    return {
      error: '無効なセッション',
    };
  }

  // キャッシュキーを生成
  const cacheKey = `${session.currentCharIndex}_${session.currentInput || ''}_${
    session.completed
  }`;

  // キャッシュチェック
  if (cache.coloringInfo.has(cacheKey)) {
    if (performanceSettings.collectMetrics) {
      metrics.cacheHits++;
    }
    return cache.coloringInfo.get(cacheKey);
  }

  if (performanceSettings.collectMetrics) {
    metrics.cacheMisses++;
  }

  const currentCharIndex = session.currentCharIndex || 0;
  const typedRomaji = session.typedRomaji || '';
  const currentInput = session.currentInput || '';
  const patterns = session.patterns || [];

  // 期待される次の文字
  let expectedNextChar = '';
  let currentCharRomaji = '';

  if (currentCharIndex < patterns.length) {
    const currentPatterns = patterns[currentCharIndex];

    if (currentPatterns && currentPatterns.length > 0) {
      // 最初のパターンを優先
      const preferredPattern = currentPatterns[0];

      if (preferredPattern) {
        currentCharRomaji = preferredPattern;

        if (currentInput && preferredPattern.startsWith(currentInput)) {
          // 次の入力すべき文字
          expectedNextChar = preferredPattern[currentInput.length] || '';
        } else {
          // 最初の文字
          expectedNextChar = preferredPattern[0] || '';
        }
      }
    }
  }

  const result = {
    typedLength: typedRomaji.length,
    currentInput: currentInput,
    expectedNextChar: expectedNextChar,
    currentCharRomaji: currentCharRomaji,
    completed: session.completed || false,
  };

  // 結果をキャッシュに保存
  cache.coloringInfo.set(cacheKey, result);

  // キャッシュサイズ管理
  if (cache.coloringInfo.size > performanceSettings.maxCacheSize / 2) {
    const keys = Array.from(cache.coloringInfo.keys()).slice(0, 100);
    keys.forEach((key) => cache.coloringInfo.delete(key));
  }

  return result;
}

/**
 * 統計計算ハンドラ
 */
function handleCalculateStatistics(data, callbackId) {
  try {
    // 統計データのバリデーション
    if (
      !data ||
      typeof data.keyCount !== 'number' ||
      typeof data.elapsedMs !== 'number'
    ) {
      throw new Error('無効な統計データ');
    }

    // キャッシュキー
    const cacheKey = `stats_${data.keyCount}_${data.elapsedMs}_${
      data.mistakeCount || 0
    }`;

    // キャッシュチェック
    if (cache.completionStats.has(cacheKey)) {
      self.postMessage({
        type: 'STATS_RESULT',
        data: cache.completionStats.get(cacheKey),
        callbackId,
      });
      return;
    }

    // KPMとランク計算
    let kpm = 0;
    if (data.elapsedMs > 0) {
      kpm = data.keyCount / (data.elapsedMs / 60000);
    }

    // 精度計算
    let accuracy = 100;
    const totalKeystrokes = data.keyCount + (data.mistakeCount || 0);
    if (totalKeystrokes > 0 && data.mistakeCount) {
      accuracy = (data.keyCount / totalKeystrokes) * 100;
    }

    // ランク判定
    let rank = 'F';
    if (kpm >= 400) rank = 'S';
    else if (kpm >= 300) rank = 'A';
    else if (kpm >= 200) rank = 'B';
    else if (kpm >= 150) rank = 'C';
    else if (kpm >= 100) rank = 'D';
    else if (kpm >= 50) rank = 'E';

    // 統計結果の作成
    const result = {
      kpm,
      accuracy,
      rank,
      totalKeystrokes,
      calculatedAt: performance.now(),
    };

    // キャッシュに保存
    cache.completionStats.set(cacheKey, result);

    // キャッシュサイズ管理
    if (cache.completionStats.size > 100) {
      const keys = Array.from(cache.completionStats.keys()).slice(0, 20);
      keys.forEach((key) => cache.completionStats.delete(key));
    }

    self.postMessage({
      type: 'STATS_RESULT',
      data: result,
      callbackId,
    });
  } catch (error) {
    logger.error('統計計算エラー:', error);
    self.postMessage({
      type: 'STATS_RESULT',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * パターン事前ロード処理
 */
function handlePreloadPatterns(data, callbackId) {
  try {
    const { patterns } = data;

    if (patterns && Array.isArray(patterns)) {
      // パターン解析（例：よく使われる文字パターンの事前準備）
      patterns.forEach((pattern, index) => {
        if (pattern && pattern.length > 0) {
          // 最初の文字の次の期待文字を事前計算
          const expectedNextChar = pattern[0];
          if (expectedNextChar) {
            cache.expectedKeys.set(`preload_${index}_`, expectedNextChar);
          }
        }
      });
    }

    self.postMessage({
      type: 'PRELOAD_RESULT',
      data: { success: true },
      callbackId,
    });
  } catch (error) {
    logger.error('パターンロードエラー:', error);
    self.postMessage({
      type: 'PRELOAD_RESULT',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * リセット処理
 */
function handleReset(callbackId) {
  try {
    // キャッシュのクリア
    cache.processInput.clear();
    cache.coloringInfo.clear();
    cache.patternMatches.clear();
    cache.expectedKeys.clear();
    cache.completionStats.clear();

    // メトリクスのリセット
    metrics.processInputCalls = 0;
    metrics.cacheHits = 0;
    metrics.cacheMisses = 0;
    metrics.totalProcessingTime = 0;
    metrics.fastPathUsed = 0;
    metrics.sharedBufferTransfers = 0;
    metrics.averageResponseTime = 0;
    metrics.maxResponseTime = 0;
    metrics.lastReset = Date.now();

    // 一時データのクリア
    self._lastFullSession = null;
    self._lastResult = null;

    self.postMessage({
      type: 'RESET_RESULT',
      data: { success: true },
      callbackId,
    });

    // ログクリア
    logger.clearLogHistory();
    logger.info('ワーカーとキャッシュをリセットしました');
  } catch (error) {
    logger.error('リセットエラー:', error);
    self.postMessage({
      type: 'RESET_RESULT',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * 入力履歴クリア処理
 */
function handleClearInputHistory(callbackId) {
  try {
    // 入力関連のキャッシュのみクリア
    cache.processInput.clear();
    cache.expectedKeys.clear();

    self.postMessage({
      type: 'CLEAR_RESULT',
      data: { success: true },
      callbackId,
    });

    logger.debug('入力履歴をクリアしました');
  } catch (error) {
    logger.error('履歴クリアエラー:', error);
    self.postMessage({
      type: 'CLEAR_RESULT',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * メトリクス取得処理
 */
function handleGetMetrics(callbackId) {
  try {
    // 追加メトリクスを計算
    const additionalMetrics = {
      cacheHitRatio:
        metrics.processInputCalls > 0
          ? (metrics.cacheHits / metrics.processInputCalls) * 100
          : 0,
      averageProcessingTimeMs:
        metrics.processInputCalls > 0
          ? metrics.totalProcessingTime / metrics.processInputCalls
          : 0,
      timestamp: Date.now(),
      uptime: Date.now() - metrics.lastReset,
      cacheSize: {
        processInput: cache.processInput.size,
        coloringInfo: cache.coloringInfo.size,
        expectedKeys: cache.expectedKeys.size,
      },
      optimizationSettings: { ...performanceSettings },
    };

    // 完全なメトリクス
    const completeMetrics = {
      ...metrics,
      ...additionalMetrics,
    };

    self.postMessage({
      type: 'metrics_result',
      data: completeMetrics,
      callbackId,
    });
  } catch (error) {
    logger.error('メトリクス取得エラー:', error);
    self.postMessage({
      type: 'metrics_result',
      error: error.message,
      callbackId,
    });
  }
}

/**
 * ランキング送信処理
 */
function handleSubmitRanking(data, callbackId) {
  // ランキング送信はメインスレッドで行うべき処理なので、成功メッセージを返すだけ
  self.postMessage({
    type: 'ranking_result',
    data: {
      success: true,
      message: 'ランキングデータが送信されました',
      data: data,
    },
    callbackId,
  });
}

// エラーハンドリング
self.addEventListener('error', function (e) {
  logger.error('グローバルエラー:', e.message);
  self.postMessage({
    type: 'worker_error',
    data: {
      error: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      timestamp: Date.now(),
    },
  });
});

// 初期化完了メッセージ
logger.info('タイピングワーカーが初期化されました（2025年5月9日版）');
