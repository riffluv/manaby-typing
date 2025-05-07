/**
 * typing-worker.js
 * タイピング処理用Web Worker
 * メインスレッドをブロックせずにタイピング判定処理を行う
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
  patternMatches: new Map()
};

// パフォーマンス設定
const performanceSettings = {
  maxCacheSize: 1000,
  useOptimizations: true,
  collectMetrics: true
};

// パフォーマンスメトリクス
const metrics = {
  processInputCalls: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProcessingTime: 0,
  lastReset: Date.now()
};

// Worker初期化メッセージ
self.postMessage({
  type: 'worker_init',
  data: {
    status: 'initialized',
    timestamp: Date.now()
  }
});

/**
 * メインスレッドからのメッセージを受信
 */
self.onmessage = function (e) {
  try {
    const { type, data, callbackId } = e.data;

    // タイプに応じた処理分岐
    switch (type) {
      case 'processInput':
        // 入力処理
        handleProcessInput(data, callbackId);
        break;

      case 'getColoringInfo':
        // 色分け情報取得
        handleGetColoringInfo(data, callbackId);
        break;

      case 'calculateStatistics':
        // 統計計算
        handleCalculateStatistics(data, callbackId);
        break;

      case 'PRELOAD_PATTERNS':
        // パターン事前ロード
        handlePreloadPatterns(data, callbackId);
        break;

      case 'RESET':
        // リセット処理
        handleReset(callbackId);
        break;

      case 'CLEAR_INPUT_HISTORY':
        // 入力履歴クリア
        handleClearInputHistory(callbackId);
        break;

      case 'setLogLevel':
        // ログレベル設定
        if (typeof data.level === 'number') {
          logger.setLogLevel(data.level);
          self.postMessage({
            type: 'logLevelChanged',
            data: { level: data.level },
            callbackId
          });
        }
        break;

      case 'ping':
        // 疎通確認
        self.postMessage({
          type: 'pong',
          data: {
            received: true,
            timestamp: Date.now(),
            originalTime: data.time
          },
          callbackId
        });
        break;

      case 'getMetrics':
        // メトリクス取得
        handleGetMetrics(callbackId);
        break;

      case 'setDisplayCapabilities':
        // ディスプレイ機能設定
        // 将来的な最適化のために保存
        break;

      default:
        // 不明なメッセージ
        logger.warn(`未知のメッセージタイプ: ${type}`);
        self.postMessage({
          type: 'error',
          error: `未知のメッセージタイプ: ${type}`,
          callbackId
        });
    }
  } catch (error) {
    // エラー処理
    logger.error('メッセージ処理エラー:', error);
    self.postMessage({
      type: 'worker_error',
      data: {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      },
      error: error.message
    });
  }
};

/**
 * 入力処理ハンドラ
 */
function handleProcessInput(data, callbackId) {
  try {
    const { session, char, cacheKey } = data;

    const result = processInput(session, char);

    // キャッシュキーがあれば追加
    if (cacheKey) {
      result.cacheKey = cacheKey;
    }

    self.postMessage({
      type: 'INPUT_RESULT',
      data: result,
      callbackId
    });
  } catch (error) {
    logger.error('入力処理エラー:', error);
    self.postMessage({
      type: 'INPUT_RESULT',
      error: error.message,
      success: false,
      callbackId
    });
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
        error: 'セッションまたは入力が無効です'
      };
    }

    // セッションが差分のみの場合、前回のセッションと統合（超高速パス）
    if (session.isDiff && self._lastFullSession) {
      // 最小限の差分マージ（高速化）
      session = {
        ...self._lastFullSession,
        currentCharIndex: session.currentCharIndex !== undefined ? session.currentCharIndex : self._lastFullSession.currentCharIndex,
        typedRomaji: session.typedRomaji !== undefined ? session.typedRomaji : self._lastFullSession.typedRomaji,
        currentInput: session.currentInput !== undefined ? session.currentInput : self._lastFullSession.currentInput,
      };
    } else if (session.isFullSync) {
      // 完全なセッションの場合はキャッシュ（差分作成のベース用）
      self._lastFullSession = { ...session };
    }

    // セッション変更なしの場合は前回の結果を再利用
    if (session.unchanged) {
      return { success: false, status: 'unchanged_session' };
    }

    if (session.completed) {
      return { success: false, status: 'already_completed' };
    }

    // 簡易バージョンのタイピング判定（デモ用）
    // 実際のアプリケーションではより複雑な処理が必要
    const currentCharIndex = session.currentCharIndex || 0;
    const patterns = session.patterns || [];
    const currentPatterns = patterns[currentCharIndex] || [];
    const newInput = (session.currentInput || '') + char;

    // パターンマッチング
    let exactMatch = false;
    let matchingPrefix = false;

    for (const pattern of currentPatterns) {
      if (pattern === newInput) {
        exactMatch = true;
        break;
      }

      if (pattern.startsWith(newInput)) {
        matchingPrefix = true;
      }
    }

    // 結果の作成
    if (exactMatch) {
      // 完全一致
      const updatedSession = {
        ...session,
        typedRomaji: (session.typedRomaji || '') + newInput,
        currentCharIndex: currentCharIndex + 1,
        currentInput: '',
        isDiff: true
      };

      // 全文字入力完了判定
      if (updatedSession.currentCharIndex >= patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();

        return {
          success: true,
          status: 'all_completed',
          session: updatedSession
        };
      }

      return {
        success: true,
        status: 'char_completed',
        session: updatedSession
      };
    } else if (matchingPrefix) {
      // 部分一致
      return {
        success: true,
        status: 'in_progress',
        session: {
          ...session,
          currentInput: newInput,
          isDiff: true
        }
      };
    }

    // 不一致
    return {
      success: false,
      status: 'no_match'
    };
  } catch (error) {
    // エラー処理
    logger.error('処理エラー:', error);
    return {
      success: false,
      status: 'error',
      error: error.message
    };
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
      callbackId
    });
  } catch (error) {
    logger.error('色分け情報エラー:', error);
    self.postMessage({
      type: 'COLORING_RESULT',
      error: error.message,
      callbackId
    });
  }
}

/**
 * 色分け情報取得処理
 */
function getColoringInfo(session) {
  if (!session) {
    return {
      error: '無効なセッション'
    };
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

  return {
    typedLength: typedRomaji.length,
    currentInput: currentInput,
    expectedNextChar: expectedNextChar,
    currentCharRomaji: currentCharRomaji,
    completed: session.completed || false
  };
}

/**
 * 統計計算ハンドラ
 */
function handleCalculateStatistics(data, callbackId) {
  try {
    // 統計計算（実装例）
    const result = {
      kpm: data.keyCount / (data.elapsedMs / 60000) || 0,
      accuracy: data.mistakeCount > 0 ?
        (data.keyCount / (data.keyCount + data.mistakeCount) * 100) : 100
    };

    self.postMessage({
      type: 'STATS_RESULT',
      data: result,
      callbackId
    });
  } catch (error) {
    logger.error('統計計算エラー:', error);
    self.postMessage({
      type: 'STATS_RESULT',
      error: error.message,
      callbackId
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
      // パターンをキャッシュに保存（実際の実装はより複雑）
      logger.info(`${patterns.length} 個のパターンをプリロードしました`);
    }

    self.postMessage({
      type: 'PRELOAD_RESULT',
      data: { success: true },
      callbackId
    });
  } catch (error) {
    logger.error('パターンロードエラー:', error);
    self.postMessage({
      type: 'PRELOAD_RESULT',
      error: error.message,
      callbackId
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

    // メトリクスのリセット
    metrics.processInputCalls = 0;
    metrics.cacheHits = 0;
    metrics.cacheMisses = 0;
    metrics.totalProcessingTime = 0;
    metrics.lastReset = Date.now();

    // 一時データのクリア
    self._lastFullSession = null;

    self.postMessage({
      type: 'RESET_RESULT',
      data: { success: true },
      callbackId
    });

    // ログクリア
    logger.clearLogHistory();
    logger.info('ワーカーとキャッシュをリセットしました');
  } catch (error) {
    logger.error('リセットエラー:', error);
    self.postMessage({
      type: 'RESET_RESULT',
      error: error.message,
      callbackId
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

    self.postMessage({
      type: 'CLEAR_RESULT',
      data: { success: true },
      callbackId
    });

    logger.debug('入力履歴をクリアしました');
  } catch (error) {
    logger.error('履歴クリアエラー:', error);
    self.postMessage({
      type: 'CLEAR_RESULT',
      error: error.message,
      callbackId
    });
  }
}

/**
 * メトリクス取得処理
 */
function handleGetMetrics(callbackId) {
  try {
    const currentMetrics = {
      ...metrics,
      cacheSize: {
        processInput: cache.processInput.size,
        coloringInfo: cache.coloringInfo.size,
        patternMatches: cache.patternMatches.size
      },
      runtime: Date.now() - metrics.lastReset,
      timestamp: Date.now()
    };

    // ログ履歴のサイズも含める
    currentMetrics.logHistorySize = logger.getLogHistory().length;

    self.postMessage({
      type: 'METRICS_RESULT',
      data: currentMetrics,
      callbackId
    });
  } catch (error) {
    logger.error('メトリクス取得エラー:', error);
    self.postMessage({
      type: 'METRICS_RESULT',
      error: error.message,
      callbackId
    });
  }
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
      timestamp: Date.now()
    }
  });
});

// 初期化完了メッセージ
logger.info('タイピングワーカーが初期化されました');