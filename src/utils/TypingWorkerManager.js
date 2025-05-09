/**
 * TypingWorkerManager.js
 * タイピング処理用WebワーカーとMCPシステムを統合的に管理するクラス
 * タイピングゲームのパフォーマンス最適化のための中枢システム
 * 2025年5月9日: タイピング即時応答のためにメインスレッド処理を追加
 */

import mcpUtils from './MCPUtils';
import {
  processTypingInputOnMainThread,
  getColoringInfoOnMainThread,
  getNextExpectedKeyOnMainThread,
  clearMainThreadCache
} from './TypingProcessorMain';

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
      // 拡張メトリクス
      batchOperations: 0,
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      lastErrorTime: null,
      lastErrorMessage: null,
      activeCallbacks: 0,
      averageResponseTime: 0,
      lastPerformanceReport: null,
      highPriorityOperations: 0,
      // メインスレッド処理メトリクス
      mainThreadProcessCalls: 0,
      mainThreadProcessingTime: 0,
    };
    // キャッシュ - パフォーマンス向上のため
    this.cache = {
      inputResults: new Map(), // 入力結果のキャッシュ
      coloringInfo: new Map(), // 色分け情報のキャッシュ
    };

    // フォールバックモード（Workerが使えない場合）
    this.fallbackMode = false;

    // 処理モード設定
    this.processingMode = {
      typing: 'main-thread', // 'worker' または 'main-thread'
      effects: 'worker',     // 'worker' または 'main-thread' 
      statistics: 'worker'   // 'worker' または 'main-thread'
    };

    // 高速アクセス用に共有オブジェクト
    this.sharedState = {
      nextExpectedKey: '',
      inputMode: 'normal',
      lastUpdateTimestamp: 0,
    };

    // グローバルアクセス用
    if (typeof window !== 'undefined') {
      window.typingWorkerManager = this;
    }

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
      console.warn(
        '[TypingWorkerManager] WebWorkerがサポートされていません。フォールバックモードを使用します。'
      );
      this.fallbackMode = true;
      this.initialized = false; // フォールバックモードでは初期化完了としない
      return;
    }

    try {
      // ワーカーがすでに存在する場合は終了させる
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      // Next.js環境向けに絶対URLを使用
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : '';
      const possiblePaths = [
        `${baseUrl}/workers/typing-worker.js`,
        '/workers/typing-worker.js',
        './workers/typing-worker.js',
        '../public/workers/typing-worker.js',
      ];

      let workerCreated = false;

      // 順番に試す
      for (const workerPath of possiblePaths) {
        try {
          this.worker = new Worker(workerPath);
          console.log(
            `[TypingWorkerManager] Workerを初期化しました: ${workerPath}`
          );
          workerCreated = true;
          break;
        } catch (pathError) {
          console.warn(
            `[TypingWorkerManager] パス ${workerPath} でWorker作成失敗: ${pathError.message}`
          );
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

        // エラーメトリクスを記録
        this.metrics.lastErrorTime = Date.now();
        this.metrics.lastErrorMessage = error.message || '不明なエラー';

        // 再初期化（リカバリーロジック）
        if (this.connectionAttempts < 3) {
          this.connectionAttempts++;
          console.log(
            `[TypingWorkerManager] ワーカー再初期化を試行... (${this.connectionAttempts}回目)`
          );
          setTimeout(() => {
            this._initWorker();
          }, 1000);
        } else {
          // 接続試行回数が上限を超えた場合はフォールバックモードに
          console.warn(
            '[TypingWorkerManager] ワーカー接続失敗が続くため、フォールバックモードに切り替えます'
          );
          this.fallbackMode = true;
          this.worker = null;
          this.initialized = true; // フォールバックモードでも初期化完了とする
        }
      };

      // 初期化メッセージを送信してみる（接続確認）
      this._postToWorker('ping', { time: Date.now() }, 'high', (result) => {
        if (result && result.received) {
          this.initialized = true;
          console.log('[TypingWorkerManager] ワーカー初期化完了');

          // 画面のリフレッシュレートを検出してワーカーに通知
          this._detectAndSetDisplayCapabilities();

          // バッファリングされたメッセージを処理
          this._processMessageBuffer();
        }
      });
    } catch (error) {
      console.error('[TypingWorkerManager] 初期化エラー:', error);
      this.fallbackMode = true;
      this.initialized = true;
    }
  }

  /**
   * 画面のリフレッシュレートとシステム能力を検出してワーカーに通知
   */
  _detectAndSetDisplayCapabilities() {
    // リフレッシュレート検出
    let refreshRate = 60; // デフォルト値

    try {
      if (window.screen && window.screen.displayInfo) {
        // 新しいAPI (Chrome 98+)
        refreshRate = window.screen.displayInfo.refreshRate || 60;
      } else if (window.requestAnimationFrame) {
        // おおよその推定（より正確な方法はないため）
        let timestamps = [];
        let measuringFrames = 0;

        const measureRefreshRate = (timestamp) => {
          timestamps.push(timestamp);
          measuringFrames++;

          if (measuringFrames < 50) {
            window.requestAnimationFrame(measureRefreshRate);
          } else {
            // 平均フレーム時間から計算
            const deltas = [];
            for (let i = 1; i < timestamps.length; i++) {
              deltas.push(timestamps[i] - timestamps[i - 1]);
            }

            const avgDelta =
              deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length;
            refreshRate = Math.round(1000 / avgDelta);

            // 検出したリフレッシュレートをワーカーに送信
            this._sendDisplayCapabilities(refreshRate);
          }
        };

        window.requestAnimationFrame(measureRefreshRate);
      }
    } catch (e) {
      console.warn('[TypingWorkerManager] リフレッシュレート検出エラー:', e);
      // エラーが発生した場合はデフォルト値を使用
      this._sendDisplayCapabilities(refreshRate);
    }
  }

  /**
   * 検出した画面機能をワーカーに送信
   */
  _sendDisplayCapabilities(refreshRate) {
    const capabilities = {
      refreshRate,
      supportsSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      devicePixelRatio: window.devicePixelRatio || 1,
      lowPowerMode: navigator.deviceMemory ? navigator.deviceMemory < 4 : false,
    };

    this._postToWorker(
      'setDisplayCapabilities',
      capabilities,
      'normal',
      (result) => {
        console.log(
          '[TypingWorkerManager] ディスプレイ機能を設定しました:',
          result?.appliedSettings || 'unknown'
        );
      }
    );
  }

  /**
   * ワーカーメッセージハンドラ
   * @param {MessageEvent} e ワーカーからのメッセージイベント
   */
  _handleWorkerMessage(e) {
    try {
      // メッセージ受信カウントを増やす
      this.metrics.totalMessagesReceived++;

      const { type, data, callbackId, error } = e.data;

      // 未知のメッセージタイプの場合は無視
      if (!type) {
        console.warn('[TypingWorkerManager] 未知のワーカーメッセージ:', e.data);
        return;
      }

      // タイプに応じた処理
      switch (type) {
        case 'worker_init':
          // Worker初期化メッセージ - 特に何もしない
          break;

        case 'worker_error':
          // Workerエラーメッセージ
          console.error(
            '[TypingWorkerManager] ワーカーエラー:',
            data?.error || error || 'Unknown error'
          );
          // エラーメトリクスを記録
          this.metrics.lastErrorTime = Date.now();
          this.metrics.lastErrorMessage =
            data?.error || error || 'Unknown error';
          break;

        case 'pong':
          // ping応答
          // コールバックがあれば呼び出す
          if (callbackId && this.callbacks.has(callbackId)) {
            const callback = this.callbacks.get(callbackId);
            callback(data);
            this.callbacks.delete(callbackId);
            this.metrics.activeCallbacks--;
          }
          break;

        case 'next_key_result':
          // 次のキー取得結果
          // 高速アクセスのために共有状態を更新
          if (data && data.key !== undefined) {
            this.sharedState.nextExpectedKey = data.key;
            this.sharedState.lastUpdateTimestamp = Date.now();
          }

          // コールバックがあれば呼び出す
          if (callbackId && this.callbacks.has(callbackId)) {
            const callback = this.callbacks.get(callbackId);
            if (error) {
              callback(null, error);
            } else {
              callback(data);
            }
            this.callbacks.delete(callbackId);
            this.metrics.activeCallbacks--;
          }
          break;

        default:
          // その他のメッセージ
          // コールバックがあれば呼び出す
          if (callbackId && this.callbacks.has(callbackId)) {
            const callback = this.callbacks.get(callbackId);
            if (error) {
              callback(null, error);
            } else {
              callback(data);
            }
            this.callbacks.delete(callbackId);
            this.metrics.activeCallbacks--;
          } else {
            console.warn(
              '[TypingWorkerManager] コールバックが見つかりません:',
              callbackId
            );
          }
      }
    } catch (error) {
      console.error('[TypingWorkerManager] メッセージ処理エラー:', error);
    }
  }

  /**
   * ワーカーにメッセージを送信
   * @param {string} type メッセージタイプ
   * @param {*} data 送信データ
   * @param {'normal'|'high'|'low'} priority 優先度
   * @param {Function} callback コールバック関数
   * @returns {Promise<*>} 処理結果
   */
  _postToWorker(type, data, priority = 'normal', callback) {
    return new Promise((resolve, reject) => {
      try {
        // ワーカーが初期化されていない場合はバッファリングする
        if (!this.initialized) {
          this.messageBuffer.push({
            type,
            data,
            priority,
            callback,
            resolve,
            reject,
          });
          return;
        }

        // フォールバックモードならエラー
        if (this.fallbackMode) {
          const error = new Error('WebWorker非対応環境');
          if (callback) callback(null, error);
          reject(error);
          return;
        }

        // コールバックIDを生成
        const callbackId = this.nextCallbackId++;

        // 高優先度の場合はメトリクスを記録
        if (priority === 'high') {
          this.metrics.highPriorityOperations++;
        }

        // コールバック関数を登録
        if (callback) {
          this.callbacks.set(callbackId, (result, error) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
            if (callback) callback(result, error);
          });
          this.metrics.activeCallbacks++;
        }

        // ワーカーにメッセージを送信
        this.worker.postMessage({
          type,
          data,
          callbackId,
          priority,
        });

        // メトリクスを更新
        this.metrics.totalMessagesSent++;
      } catch (error) {
        console.error('[TypingWorkerManager] メッセージ送信エラー:', error);
        if (callback) callback(null, error);
        reject(error);
      }
    });
  }

  /**
   * バッファリングされたメッセージを処理
   */
  _processMessageBuffer() {
    if (this.messageBuffer.length > 0) {
      console.log(
        `[TypingWorkerManager] バッファリングされた${this.messageBuffer.length}件のメッセージを処理します`
      );

      // バッファリングされたメッセージを全て処理
      for (const message of this.messageBuffer) {
        const { type, data, priority, callback, resolve, reject } = message;
        this._postToWorker(type, data, priority, (result, error) => {
          if (error) {
            if (callback) callback(null, error);
            reject(error);
          } else {
            if (callback) callback(result);
            resolve(result);
          }
        });
      }

      // バッファをクリア
      this.messageBuffer = [];
    }
  }

  /**
   * エラー報告
   * @param {string} type エラータイプ
   * @param {string} message エラーメッセージ
   */
  _reportError(type, message) {
    console.error(`[TypingWorkerManager] ${type}: ${message}`);
    // エラーメトリクスを記録
    this.metrics.lastErrorTime = Date.now();
    this.metrics.lastErrorMessage = message;
  }  /**
   * 入力を処理し、結果を返す
   * @param {Object} session タイピングセッション
   * @param {string} char 入力された文字
   * @returns {Promise<Object>} 処理結果
   */
  processInput(session, char) {
    // セッションとキャラクターの簡易チェック
    if (!session || !char) {
      return Promise.reject(new Error('無効な入力'));
    }

    // キャッシュキーを作成
    const cacheKey = `${session.currentCharIndex}_${session.currentInput || ''
      }_${char}`;

    // キャッシュチェック
    if (this.cache.inputResults.has(cacheKey)) {
      this.metrics.cacheHits++;
      return Promise.resolve(this.cache.inputResults.get(cacheKey));
    }

    this.metrics.cacheMisses++;
    this.metrics.processCalls++;

    const startTime = performance.now();

    // タイピング処理は常にメインスレッドで実行
    this.metrics.mainThreadProcessCalls++;

    try {
      const result = processTypingInputOnMainThread(session, char);
      const processingTime = performance.now() - startTime;
      this.metrics.mainThreadProcessingTime += processingTime;
      this.metrics.processingTime += processingTime;

      if (result && result.success !== false) {
        this.cache.inputResults.set(cacheKey, result);
        if (this.cache.inputResults.size > 1000) {
          const keys = Array.from(this.cache.inputResults.keys()).slice(0, 200);
          for (const key of keys) {
            this.cache.inputResults.delete(key);
          }
        }
      }
      return Promise.resolve(result);
    } catch (error) {
      console.error('メインスレッド処理エラー:', error);
      return Promise.reject(error); // Web Workerへのフォールバックを削除
    }
  }

  getColoringInfo(session) {
    if (!session) {
      return Promise.reject(new Error('無効なセッション'));
    }

    const cacheKey = `color_${session.currentCharIndex || 0}_${session.currentInput || ''
      }_${session.completed ? 1 : 0}`;

    if (this.cache.coloringInfo.has(cacheKey)) {
      this.metrics.cacheHits++;
      return Promise.resolve(this.cache.coloringInfo.get(cacheKey));
    }

    this.metrics.cacheMisses++;

    // タイピング関連の表示情報は常にメインスレッドで処理
    this.metrics.mainThreadProcessCalls++;
    try {
      const result = getColoringInfoOnMainThread(session);
      if (result && !result.error) {
        this.cache.coloringInfo.set(cacheKey, result);
        if (this.cache.coloringInfo.size > 500) { // 修正点: 括弧を追加
          const keys = Array.from(this.cache.coloringInfo.keys()).slice(0, 100);
          for (const key of keys) {
            this.cache.coloringInfo.delete(key);
          }
        }
      }
      return Promise.resolve(result);
    } catch (error) {
      console.error('メインスレッド処理エラー (色分け情報):', error);
      return Promise.reject(error); // Web Workerへのフォールバックを削除
    }
  }

  getNextExpectedKey(session) {
    if (!session) {
      return Promise.reject(new Error('無効なセッション'));
    }

    if (session.completed) {
      return Promise.resolve({ key: '' });
    }

    const now = Date.now();
    if (
      this.sharedState.lastUpdateTimestamp > now - 1 &&
      this.sharedState.nextExpectedKey
    ) {
      return Promise.resolve({ key: this.sharedState.nextExpectedKey });
    }

    // タイピング関連のキー取得は常にメインスレッドで処理
    this.metrics.mainThreadProcessCalls++;
    try {
      const result = getNextExpectedKeyOnMainThread(session);
      if (result && result.key !== undefined) {
        this.sharedState.nextExpectedKey = result.key;
        this.sharedState.lastUpdateTimestamp = now;
      }
      return Promise.resolve(result);
    } catch (error) {
      console.error('メインスレッド処理エラー (次のキー):', error);
      return Promise.reject(error); // Web Workerへのフォールバックを削除
    }
  }

  /**
   * 統計を計算
   * @param {Object} data 統計計算用データ
   * @returns {Promise<Object>} 統計結果
   */
  calculateStatistics(data) {
    if (!data) {
      return Promise.reject(new Error('無効なデータ'));
    }

    // ワーカーに統計計算メッセージを送信
    return this._postToWorker('calculateStatistics', data, 'normal');
  }

  /**
   * ランキングを送信
   * @param {Object} data ランキングデータ
   * @returns {Promise<Object>} 送信結果
   */
  submitRanking(data) {
    if (!data) {
      return Promise.reject(new Error('無効なデータ'));
    }

    // ワーカーにランキング送信メッセージを送信
    return this._postToWorker('submitRanking', data, 'low');
  }

  /**
   * パターンを事前ロード
   * @param {Array} patterns パターン配列
   * @returns {Promise<Object>} ロード結果
   */
  preloadPatterns(patterns) {
    if (!patterns || !Array.isArray(patterns)) {
      return Promise.reject(new Error('無効なパターン'));
    }

    // ワーカーにパターン事前ロードメッセージを送信
    return this._postToWorker('PRELOAD_PATTERNS', { patterns }, 'normal');
  }
  /**
   * リセット
   * @returns {Promise<Object>} リセット結果
   */  reset() {
    // キャッシュをクリア
    this.cache.inputResults.clear();
    this.cache.coloringInfo.clear();

    // 共有状態をリセット
    this.sharedState.nextExpectedKey = '';
    this.sharedState.inputMode = 'normal';
    this.sharedState.lastUpdateTimestamp = 0;

    // メインスレッド処理のキャッシュもクリア
    if (typeof clearMainThreadCache === 'function') {
      clearMainThreadCache();
    }

    // ワーカーにリセットメッセージを送信
    return this._postToWorker('RESET', null, 'high');
  }

  /**
   * 処理モードを設定
   * @param {Object} modes 処理モード設定
   * @returns {Promise<Object>} 設定結果
   */
  setProcessingModes(modes) {
    if (!modes || typeof modes !== 'object') {
      return Promise.reject(new Error('無効なモード設定'));
    }

    // 現在のモードをバックアップ
    const previousModes = { ...this.processingMode };

    // モードを更新
    if (modes.typing === 'worker' || modes.typing === 'main-thread') {
      this.processingMode.typing = modes.typing;
    }

    if (modes.effects === 'worker' || modes.effects === 'main-thread') {
      this.processingMode.effects = modes.effects;
    }

    if (modes.statistics === 'worker' || modes.statistics === 'main-thread') {
      this.processingMode.statistics = modes.statistics;
    }

    // モード変更ログ
    console.log('[TypingWorkerManager] 処理モード変更:', this.processingMode);

    // モードが変わった場合はキャッシュをクリア
    if (previousModes.typing !== this.processingMode.typing) {
      this.cache.inputResults.clear();
      this.cache.coloringInfo.clear();

      if (typeof clearMainThreadCache === 'function') {
        clearMainThreadCache();
      }
    }

    return Promise.resolve({
      success: true,
      currentModes: { ...this.processingMode },
      previousModes
    });
  }

  /**
   * 入力履歴をクリア
   * @returns {Promise<Object>} クリア結果
   */
  clearInputHistory() {
    // 入力関連のキャッシュをクリア
    this.cache.inputResults.clear();

    // ワーカーに入力履歴クリアメッセージを送信
    return this._postToWorker('CLEAR_INPUT_HISTORY', null, 'normal');
  }

  /**
   * 最適化オプションを更新
   * @param {Object} options 最適化オプション
   * @returns {Promise<Object>} 更新結果
   */
  updateOptimizationOptions(options) {
    if (!options || typeof options !== 'object') {
      return Promise.reject(new Error('無効なオプション'));
    }

    // ワーカーに最適化オプション更新メッセージを送信
    return this._postToWorker('updateOptimizationOptions', options, 'normal');
  }

  /**
   * パフォーマンスメトリクスを取得
   * @returns {Promise<Object>} メトリクス
   */
  getPerformanceMetrics() {
    // 現在のメトリクスのコピーを作成
    const currentMetrics = { ...this.metrics };

    // メトリクスを蓄積するオブジェクト
    let combinedMetrics = {
      ...currentMetrics,
      timestamp: Date.now(),
      uptime: Date.now() - (this.metrics.lastSync || Date.now()),
      callbacksCount: this.callbacks.size,
      cacheSize: {
        inputResults: this.cache.inputResults.size,
        coloringInfo: this.cache.coloringInfo.size,
      },
    };

    // ワーカーからもメトリクスを取得して統合
    return this._postToWorker('getMetrics', null, 'low')
      .then((workerMetrics) => {
        // ワーカーメトリクスと統合
        combinedMetrics.workerMetrics = workerMetrics;

        // キャッシュヒット率計算
        const totalCalls =
          combinedMetrics.cacheHits + combinedMetrics.cacheMisses;
        combinedMetrics.cacheHitRatio =
          totalCalls > 0 ? combinedMetrics.cacheHits / totalCalls : 0;

        // メトリクスを保存
        this.metrics.lastPerformanceReport = combinedMetrics;

        return combinedMetrics;
      })
      .catch((error) => {
        // ワーカーからのメトリクス取得に失敗した場合は現在のメトリクスだけを返す
        console.warn(
          '[TypingWorkerManager] ワーカーメトリクス取得エラー:',
          error
        );
        return combinedMetrics;
      });
  }

  /**
   * 複数の操作をバッチ処理
   * @param {Array} operations 処理する操作配列
   * @returns {Promise<Object>} バッチ処理結果
   */
  processBatch(operations) {
    if (!operations || !Array.isArray(operations)) {
      return Promise.reject(new Error('無効なバッチ操作'));
    }

    // バッチ操作カウントを増やす
    this.metrics.batchOperations++;

    // ワーカーにバッチ処理メッセージを送信
    return this._postToWorker('batch', operations, 'normal');
  }

  /**
   * メインスレッドでのタイピング入力処理
   * @param {Object} session タイピングセッション
   * @param {string} char 入力された文字
   * @returns {Promise<Object>} 処理結果
   */
  processTypingInput(session, char) {
    return new Promise((resolve, reject) => {
      try {
        // セッションとキャラクターの簡易チェック
        if (!session || !char) {
          return reject(new Error('無効な入力'));
        }

        this.metrics.mainThreadProcessCalls++;

        const startTime = performance.now();

        // メインスレッドで直接処理
        const result = processTypingInputOnMainThread(session, char);

        // 処理時間をメトリクスに追加
        this.metrics.mainThreadProcessingTime +=
          performance.now() - startTime;

        resolve(result);
      } catch (error) {
        console.error('[TypingWorkerManager] メインスレッド処理エラー:', error);
        reject(error);
      }
    });
  }

  /**
   * メインスレッドでの色分け情報取得
   * @param {Object} session タイピングセッション
   * @returns {Promise<Object>} 色分け情報
   */
  getColoringInfoMainThread(session) {
    return new Promise((resolve, reject) => {
      try {
        if (!session) {
          return reject(new Error('無効なセッション'));
        }

        // メインスレッドで直接処理
        const result = getColoringInfoOnMainThread(session);

        resolve(result);
      } catch (error) {
        console.error('[TypingWorkerManager] メインスレッド色分け処理エラー:', error);
        reject(error);
      }
    });
  }
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

export default typingWorkerManager;
