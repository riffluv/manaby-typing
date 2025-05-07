/**
 * TypingWorkerManager.js
 * タイピング処理用WebワーカーとMCPシステムを統合的に管理するクラス
 * タイピングゲームのパフォーマンス最適化のための中枢システム
 */

import mcpUtils from './MCPUtils';

/**
 * WebワーカーとMCPシステムを統合的に管理するシングルトンクラス
 */
class TypingWorkerManager {
  constructor() {
    // Worker参照
    this.worker = null;
    // ワーカーの初期化状態
    this.initialized = false;
    // コールバック管理
    this.callbacks = new Map();
    // 次のコールバックID
    this.nextCallbackId = 1;
    // 接続試行回数
    this.connectionAttempts = 0;
    // マイクロタスクキュー
    this.queue = [];
    // メッセージバッファ（ワーカー起動前のメッセージを保存）
    this.messageBuffer = [];
    // WebWorkerサポート状態
    this.isSupported = typeof Worker !== 'undefined';
    // パフォーマンスメトリクス
    this.metrics = {
      processCalls: 0,
      cacheMisses: 0,
      cacheHits: 0,
      processingTime: 0,
      lastSync: Date.now(),
    };
    // キャッシュ - パフォーマンス向上のため
    this.cache = {
      inputResults: new Map(), // 入力結果のキャッシュ
      coloringInfo: new Map(), // 色分け情報のキャッシュ
    };

    // フォールバックモード（Workerが使えない場合）
    this.fallbackMode = false;

    // 初期化
    this._initOnNextTick();
  }

  /**
   * 次のマイクロタスクでワーカーを初期化
   * プリエンプティブでない（他の処理をブロックしない）
   */
  _initOnNextTick() {
    queueMicrotask(() => {
      this._initWorker();
    });
  }

  /**
   * 内部メソッド: ワーカーの初期化
   * @private
   */
  _initWorker() {
    // WebWorkerサポートチェック
    if (!this.isSupported) {
      console.warn('[TypingWorkerManager] WebWorkerがサポートされていません。フォールバックモードを使用します。');
      this.fallbackMode = true;
      this.initialized = true; // フォールバックモードでも初期化完了とする
      return;
    }

    try {
      // ワーカーがすでに存在する場合は終了させる
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      // Next.js環境向けに絶対URLを使用
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const possiblePaths = [
        `${baseUrl}/workers/typing-worker.js`,
        '/workers/typing-worker.js',
        './workers/typing-worker.js',
        '../public/workers/typing-worker.js'
      ];

      let workerCreated = false;

      // 順番に試す
      for (const workerPath of possiblePaths) {
        try {
          this.worker = new Worker(workerPath);
          console.log(`[TypingWorkerManager] Workerを初期化しました: ${workerPath}`);
          workerCreated = true;
          break;
        } catch (pathError) {
          console.warn(`[TypingWorkerManager] パス ${workerPath} でWorker作成失敗: ${pathError.message}`);
        }
      }

      if (!workerCreated) {
        throw new Error('すべてのパスでのWorker作成が失敗しました');
      }

      // ワーカーからのメッセージを処理
      this.worker.onmessage = (e) => this._handleWorkerMessage(e);

      // エラーハンドリング
      this.worker.onerror = (error) => {
        console.error('[TypingWorkerManager] WorkerError:', error);
        this._reportError('worker_error', error.message || '不明なエラー');

        // 再初期化（リカバリーロジック）
        if (this.connectionAttempts < 3) {
          this.connectionAttempts++;
          console.log(`[TypingWorkerManager] ワーカー再初期化を試行... (${this.connectionAttempts}回目)`);
          setTimeout(() => {
            this._initWorker();
          }, 1000);
        } else {
          // 接続試行回数が上限を超えた場合はフォールバックモードに
          console.warn('[TypingWorkerManager] ワーカー接続失敗が続くため、フォールバックモードに切り替えます');
          this.fallbackMode = true;
          this.worker = null;
          this.initialized = true; // フォールバックモードでも初期化完了とする
        }
      };

      // 初期化メッセージを送信してみる（接続確認）
      this._postToWorker('ping', { time: Date.now() }, 'high', (result) => {
        if (result && result.received) {
          console.log('[TypingWorkerManager] Worker接続確認に成功しました');
        } else {
          console.warn('[TypingWorkerManager] Worker接続確認に失敗しました');
        }
      });

      // ディスプレイ機能情報をワーカーに送信
      let refreshRate = 60;
      if (typeof window !== 'undefined' && window.screen && window.screen.refresh) {
        refreshRate = window.screen.refresh;
      }
      this._sendDisplayInfo(refreshRate);

      // 初期化フラグを設定
      this.initialized = true;
      this.connectionAttempts = 0;

      // 保留中のメッセージを処理
      this._flushMessageBuffer();

      console.log('[TypingWorkerManager] ワーカーが正常に初期化されました');
    } catch (error) {
      console.error('[TypingWorkerManager] ワーカー初期化エラー:', error);
      this._reportError('init_error', error.message);
      this.initialized = false;
      this.fallbackMode = true; // エラー発生時はフォールバック
    }
  }

  /**
   * ディスプレイ情報をワーカーに送信
   * @param {number} refreshRate 検出されたリフレッシュレート
   */
  _sendDisplayInfo(refreshRate) {
    const displayCapabilities = {
      refreshRate,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      highPrecisionTime: typeof performance !== 'undefined' && typeof performance.now === 'function',
      supportsSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    };

    this._postToWorker('setDisplayCapabilities', displayCapabilities);
  }

  /**
   * バッファリングされたメッセージの送信
   * @private
   */
  _flushMessageBuffer() {
    if ((!this.worker && !this.fallbackMode) || !this.initialized) return;

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    if (this.fallbackMode) {
      // フォールバックモードでは同期的に処理
      messages.forEach(msg => {
        this._processFallbackMessage(msg);
      });
    } else if (this.worker) {
      // Workerモードでは非同期に送信
      messages.forEach(msg => {
        this.worker.postMessage(msg);
      });
    }
  }

  /**
   * フォールバックモードでのメッセージ処理
   * @private
   */
  _processFallbackMessage(message) {
    const { type, data, callbackId } = message;

    try {
      let result = null;

      // タイプに応じて処理
      switch (type) {
        case 'processInput':
          // MCP処理を使用した同期的な入力処理
          result = this._fallbackProcessInput(data);
          break;

        case 'getColoringInfo':
          // 色分け情報の同期的な生成
          result = this._fallbackGetColoringInfo(data);
          break;

        case 'calculateStatistics':
          // 統計情報の計算
          result = this._fallbackCalculateStats(data);
          break;

        case 'PRELOAD_PATTERNS':
          // プリロード（フォールバックでは何もしない）
          result = { success: true };
          break;

        case 'RESET':
          // リセット処理
          this.cache.inputResults.clear();
          this.cache.coloringInfo.clear();
          result = { success: true };
          break;

        case 'ping':
          // 疎通確認
          result = { received: true, timestamp: Date.now() };
          break;

        default:
          // 不明なメッセージ
          result = { error: `未サポートのメッセージタイプ: ${type}` };
      }

      // コールバックが設定されていれば呼び出す
      if (callbackId && this.callbacks.has(callbackId)) {
        const callback = this.callbacks.get(callbackId);
        callback(result);
        this.callbacks.delete(callbackId);
      }
    } catch (error) {
      console.error(`[TypingWorkerManager] フォールバック処理エラー (${type}):`, error);

      // コールバックが設定されていれば呼び出す
      if (callbackId && this.callbacks.has(callbackId)) {
        const callback = this.callbacks.get(callbackId);
        callback({ success: false, error: error.message });
        this.callbacks.delete(callbackId);
      }
    }
  }

  /**
   * フォールバックでの入力処理
   * @private
   */
  _fallbackProcessInput(data) {
    if (!data || !data.session || !data.char) {
      return { success: false, error: '無効なデータ' };
    }

    // MCPのprocessLocalInput機能を使う（存在する場合）
    if (mcpUtils && mcpUtils.processLocalInput) {
      try {
        return mcpUtils.processLocalInput(data.session, data.char);
      } catch (error) {
        console.error('[TypingWorkerManager] MCP処理エラー:', error);
        return { success: false, error: error.message };
      }
    }

    // MCPがない場合は簡易処理
    const session = data.session;
    const char = data.char;
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
      };

      // 完了チェック
      if (updatedSession.currentCharIndex >= patterns.length) {
        updatedSession.completed = true;
        updatedSession.completedAt = Date.now();
      }

      return {
        success: true,
        status: updatedSession.completed ? 'all_completed' : 'char_completed',
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
        }
      };
    }

    // 不一致
    return {
      success: false,
      status: 'no_match',
    };
  }

  /**
   * フォールバックでの色分け情報取得
   * @private
   */
  _fallbackGetColoringInfo(session) {
    if (!session) {
      return { error: '無効なセッション' };
    }

    // MCPのgetColoringInfo機能を使う（存在する場合）
    if (mcpUtils && mcpUtils.getColoringInfo) {
      try {
        return mcpUtils.getColoringInfo(session);
      } catch (error) {
        console.error('[TypingWorkerManager] MCP色分け情報エラー:', error);
      }
    }

    // 簡易実装
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
   * フォールバックでの統計計算
   * @private
   */
  _fallbackCalculateStats(data) {
    // 簡易計算
    return {
      kpm: data.keyCount / (data.elapsedMs / 60000) || 0,
      accuracy: data.mistakeCount > 0 ?
        (data.keyCount / (data.keyCount + data.mistakeCount) * 100) : 100
    };
  }

  /**
   * ワーカーへのメッセージ送信
   * ワーカー初期化前の場合はバッファリング
   * @private
   */
  _postToWorker(type, data, priority = 'normal', callback = null) {
    // コールバックIDを生成
    const callbackId = callback ? this._registerCallback(callback) : null;

    const message = {
      type,
      data,
      callbackId,
      priority,
      timestamp: Date.now()
    };

    // ワーカーが初期化されていなければバッファリング
    if (!this.initialized) {
      this.messageBuffer.push(message);

      // 初期化されていない場合は初期化
      if (!this.worker && !this.fallbackMode) {
        this._initOnNextTick();
      }
      return;
    }

    // フォールバックモードならメインスレッドで処理
    if (this.fallbackMode) {
      this._processFallbackMessage(message);
      return;
    }

    // ワーカーにメッセージを送信
    try {
      this.worker.postMessage(message);
    } catch (error) {
      console.error(`[TypingWorkerManager] メッセージ送信エラー (${type}):`, error);
      this._reportError('message_error', error.message);

      // コールバックが設定されていれば呼び出す
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  }

  /**
   * ワーカーからのメッセージハンドラー
   * @private
   */
  _handleWorkerMessage(e) {
    const { type, data, callbackId, error } = e.data;

    // エラーメッセージの処理
    if (error) {
      console.error(`[TypingWorkerManager] Worker Error (${type}):`, error);
      this._reportError('worker_message_error', error);
    }

    // メッセージタイプに応じた処理
    switch (type) {
      case 'INPUT_RESULT':
        // 入力処理結果をキャッシュ
        if (data && data.cacheKey) {
          this.cache.inputResults.set(data.cacheKey, data);
        }
        break;

      case 'STATS_RESULT':
        // 統計情報をMCPに送信
        this._sendStatsToMCP(data);
        break;

      case 'metrics':
        // パフォーマンスメトリクスの処理
        this._processPerfMetrics(data);
        break;

      case 'worker_error':
        // ワーカーからのエラー報告
        console.error('[TypingWorkerManager] Worker Internal Error:', data);
        this._reportError('worker_internal_error', data.error || '不明なエラー');
        break;
    }

    // コールバックが設定されていれば呼び出す
    if (callbackId && this.callbacks.has(callbackId)) {
      const callback = this.callbacks.get(callbackId);
      callback(data);
      this.callbacks.delete(callbackId);
    }
  }

  /**
   * コールバック関数の登録
   * @private
   */
  _registerCallback(callback) {
    const callbackId = this.nextCallbackId++;
    this.callbacks.set(callbackId, callback);
    return callbackId;
  }

  /**
   * 統計情報をMCPに送信
   * @private
   */
  _sendStatsToMCP(stats) {
    try {
      if (typeof mcpUtils !== 'undefined' && mcpUtils.recordTypingInput) {
        mcpUtils.recordTypingInput({
          type: 'stats_update',
          stats,
          isAnalyticsOnly: true
        });
      }
    } catch (error) {
      console.error('[TypingWorkerManager] MCP送信エラー:', error);
    }
  }

  /**
   * パフォーマンスメトリクスの処理
   * @private
   */
  _processPerfMetrics(metricsData) {
    if (!metricsData) return;

    // メトリクスをログ出力（デバッグモードのみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('[TypingWorkerManager] パフォーマンスメトリクス:', metricsData);
    }

    // MCPに送信（分析用）
    try {
      if (typeof mcpUtils !== 'undefined' && mcpUtils.recordPerformanceMetric) {
        mcpUtils.recordPerformanceMetric({
          source: 'typing_worker',
          metrics: metricsData,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // エラーは無視（分析機能は非クリティカル）
    }
  }

  /**
   * エラーの報告
   * @private
   */
  _reportError(type, message) {
    try {
      if (typeof mcpUtils !== 'undefined' && mcpUtils.recordGameEvent) {
        mcpUtils.recordGameEvent({
          type: 'error',
          errorType: type,
          message,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // エラー報告自体のエラーは無視（無限ループ防止）
    }
  }

  /**
   * タイピング入力の処理
   * パフォーマンス最適化済み
   * @param {Object} data 入力データ
   * @param {Object} data.session タイピングセッション
   * @param {string} data.input 入力文字
   * @returns {Promise<Object>} 処理結果のPromise
   */
  processInput(data) {
    // メトリクス更新
    this.metrics.processCalls++;

    return new Promise((resolve, reject) => {
      // 入力とセッションの検証
      if (!data || !data.session || !data.input) {
        reject(new Error('無効な入力データ'));
        return;
      }

      // キャッシュキーを生成
      const cacheKey = `${data.session.currentCharIndex}:${data.session.currentInput || ''}:${data.input}`;

      // キャッシュチェック（高速レスポンス）
      if (this.cache.inputResults.has(cacheKey)) {
        this.metrics.cacheHits++;
        resolve(this.cache.inputResults.get(cacheKey));
        return;
      }

      this.metrics.cacheMisses++;

      // レスポンス時間測定開始
      const startTime = performance.now && performance.now();

      // ワーカーに処理を依頼
      this._postToWorker('processInput', {
        session: data.session,
        char: data.input,
        cacheKey
      }, 'high', (result) => {
        if (startTime && performance.now) {
          this.metrics.processingTime += performance.now() - startTime;
        }

        if (result && result.success !== false) {
          // 結果をキャッシュに保存
          if (!result.cached && cacheKey) {
            this.cache.inputResults.set(cacheKey, result);

            // キャッシュサイズ管理
            if (this.cache.inputResults.size > 500) {
              // 古いキャッシュをクリア（先頭100個）
              const keys = Array.from(this.cache.inputResults.keys()).slice(0, 100);
              keys.forEach(key => this.cache.inputResults.delete(key));
            }
          }

          resolve(result);
        } else {
          reject(new Error(result?.error || 'タイピング処理でエラーが発生しました'));
        }
      });
    });
  }

  /**
   * 色分け情報の取得
   * @param {Object} session タイピングセッションオブジェクト
   * @returns {Promise<Object>} 色分け情報
   */
  getColoringInfo(session) {
    return new Promise((resolve, reject) => {
      // セッションの検証
      if (!session) {
        reject(new Error('無効なセッション'));
        return;
      }

      // キャッシュキーを生成
      const cacheKey = `${session.currentCharIndex}_${session.currentInput || ''}_${session.completed}`;

      // キャッシュチェック
      if (this.cache.coloringInfo.has(cacheKey)) {
        resolve(this.cache.coloringInfo.get(cacheKey));
        return;
      }

      // ワーカーに処理を依頼
      this._postToWorker('getColoringInfo', session, 'normal', (result) => {
        if (result && !result.error) {
          // 結果をキャッシュに保存
          this.cache.coloringInfo.set(cacheKey, result);

          // キャッシュサイズ管理
          if (this.cache.coloringInfo.size > 300) {
            const keys = Array.from(this.cache.coloringInfo.keys()).slice(0, 100);
            keys.forEach(key => this.cache.coloringInfo.delete(key));
          }

          resolve(result);
        } else {
          reject(new Error(result?.error || '色分け情報の取得でエラーが発生しました'));
        }
      });
    });
  }

  /**
   * 統計情報の計算
   * @param {Object} statsData 統計データ
   * @returns {Promise<Object>} 統計計算結果
   */
  calculateStatistics(statsData) {
    return new Promise((resolve, reject) => {
      this._postToWorker('calculateStatistics', statsData, 'low', (result) => {
        if (result && !result.error) {
          resolve(result);
        } else {
          reject(new Error(result?.error || '統計情報の計算でエラーが発生しました'));
        }
      });
    });
  }

  /**
   * ランキング送信
   * @param {Object} recordData 記録データ
   * @returns {Promise<Object>} 送信結果
   */
  submitRanking(recordData) {
    return new Promise((resolve, reject) => {
      // フォールバックモードではMCPに直接送信
      if (this.fallbackMode && mcpUtils && mcpUtils.submitRanking) {
        try {
          mcpUtils.submitRanking(recordData)
            .then(result => resolve(result))
            .catch(err => reject(err));
          return;
        } catch (error) {
          // MCPでエラーの場合はワーカーにフォールバック
        }
      }

      this._postToWorker('submitRanking', recordData, 'low', (result) => {
        if (result && result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result?.error || 'ランキング送信でエラーが発生しました'));
        }
      });
    });
  }

  /**
   * 入力履歴のクリア
   */
  clearInputHistory() {
    // キャッシュをクリア
    this.cache.inputResults.clear();
    this.cache.coloringInfo.clear();

    // ワーカーにクリア指示を送信
    this._postToWorker('CLEAR_INPUT_HISTORY', {}, 'normal');
  }

  /**
   * ワーカー状態のリセット
   */
  resetWorker() {
    // キャッシュをクリア
    this.cache.inputResults.clear();
    this.cache.coloringInfo.clear();

    // ワーカーにリセット指示を送信
    this._postToWorker('RESET', {}, 'high');

    // メトリクスをリセット
    this.metrics = {
      processCalls: 0,
      cacheMisses: 0,
      cacheHits: 0,
      processingTime: 0,
      lastSync: Date.now(),
    };
  }

  /**
   * よく使われるパターンを事前にキャッシュにロード
   * @param {Array} patterns パターン配列
   */
  preloadPatterns(patterns) {
    if (!patterns || !Array.isArray(patterns)) return;

    // ワーカーに送信
    this._postToWorker('PRELOAD_PATTERNS', { patterns }, 'low');
  }

  /**
   * パフォーマンスの最適化オプションを更新
   * @param {Object} options 最適化オプション
   */
  updatePerformanceOptions(options = {}) {
    // ワーカーに送信
    this._postToWorker('updateOptimizationOptions', options, 'normal');
  }

  /**
   * パフォーマンスメトリクスの取得
   * @returns {Promise<Object>} メトリクス情報
   */
  getPerformanceMetrics() {
    return new Promise((resolve) => {
      // ローカルメトリクスと合わせる
      const localMetrics = {
        ...this.metrics,
        cacheRatio: this.metrics.processCalls > 0
          ? this.metrics.cacheHits / this.metrics.processCalls
          : 0,
        avgProcessingTime: this.metrics.processCalls > 0
          ? this.metrics.processingTime / this.metrics.processCalls
          : 0,
        fallbackMode: this.fallbackMode
      };

      // フォールバックモードの場合は直接返す
      if (this.fallbackMode) {
        resolve({
          local: localMetrics,
          worker: { status: 'fallback_mode' },
          timestamp: Date.now()
        });
        return;
      }

      // ワーカーからメトリクスを取得
      this._postToWorker('getMetrics', {}, 'low', (workerMetrics) => {
        resolve({
          local: localMetrics,
          worker: workerMetrics || {},
          timestamp: Date.now()
        });
      });
    });
  }

  /**
   * ワーカーの接続テスト
   * @returns {Promise<boolean>} 接続が有効かどうか
   */
  testConnection() {
    return new Promise((resolve) => {
      // フォールバックモードの場合は常にtrue
      if (this.fallbackMode) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

      this._postToWorker('ping', { time: Date.now() }, 'high', (result) => {
        clearTimeout(timeout);
        resolve(!!result && !!result.received);
      });
    });
  }
}

// シングルトンインスタンスの作成
const typingWorkerManager = new TypingWorkerManager();

// 外部向けAPI
export default typingWorkerManager;
