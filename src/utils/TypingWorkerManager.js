/**
 * タイピング処理をWeb Workerに委譲するためのマネージャクラス
 * メインスレッドのブロッキングを防ぎ、タイピングの反応速度を最大化
 * 高リフレッシュレート対応版（応答性最適化）
 */

// リファクタリング用のデバッグフラグ（動作確認後にはfalseに戻す）
const DEBUG_WORKER_MANAGER = false;

export class TypingWorkerManager {
  constructor() {
    this._worker = null;
    this._callbacks = new Map();
    this._callbackId = 0;
    this._lastSession = null;
    this._initializationPromise = null;
    this._inputHistory = []; // 入力履歴を保持

    // リファクタリング用のリトライ関連情報を追加
    this._errorCount = 0;
    this._retryCount = 0;
    this._lastErrorTime = 0;
    this._workerReady = false;
    this._workerInitRetryTimeout = null;

    // 高速化オプション（高リフレッシュレート対応）
    this._optimizationOptions = {
      batchInputHistory: true,        // 入力履歴のバッチ処理
      useTransferableObjects: true,   // 大きなデータの転送効率化
      prioritizeLatency: true,        // 応答性優先モード
      useDedicatedChannel: false,     // 専用メッセージチャネル（実験的）
      minifyPayload: true,            // ペイロードサイズ最小化
      highPriorityTasks: new Set(['processInput']), // 優先度の高いタスク
    };

    // 次のフレームで一括処理するためのバッチ
    this._batchedTasks = [];
    this._batchProcessScheduled = false;

    // パフォーマンス監視用
    this._metrics = {
      totalMessages: 0,
      totalProcessingTime: 0,
      maxProcessingTime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      lastLatency: 0,
      errorCount: 0,
      recoveryCount: 0,
      lastActivity: Date.now()
    };

    // 自動初期化 - ただしブラウザ環境の場合のみ
    if (typeof window !== 'undefined') {
      this._initialize();
    }

    // リファクタリング: Worker状態の監視機能を追加
    if (DEBUG_WORKER_MANAGER) {
      this._startHealthCheck();
    }
  }

  /**
   * Workerの健全性チェック - リファクタリング時のデバッグ用
   * @private
   */
  _startHealthCheck() {
    if (typeof window === 'undefined') return;

    const healthCheckInterval = setInterval(() => {
      if (!this._worker) {
        if (DEBUG_WORKER_MANAGER) console.log('[Worker監視] Workerが初期化されていません。');
        return;
      }

      const now = Date.now();
      // 最後のアクティビティから30秒以上経過している場合は健全性確認
      if (now - this._metrics.lastActivity > 30000) {
        this._pingWorker()
          .then(() => {
            if (DEBUG_WORKER_MANAGER) console.log('[Worker監視] 健全性確認完了: 応答あり');
          })
          .catch(err => {
            console.warn('[Worker監視] 健全性確認失敗、再初期化します:', err);
            this._reinitializeWorker();
          });
      }
    }, 30000); // 30秒ごとにチェック

    // クリーンアップ関数を返す（必要に応じて使用）
    return () => clearInterval(healthCheckInterval);
  }

  /**
   * Workerの生存確認
   * @returns {Promise} 応答を受け取ったら解決するPromise
   * @private
   */
  _pingWorker() {
    return new Promise((resolve, reject) => {
      if (!this._worker) {
        return reject(new Error('Worker is not initialized'));
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker ping timeout'));
      }, 2000);

      const callbackId = this._getNextCallbackId();

      this._callbacks.set(callbackId, (data) => {
        clearTimeout(timeout);
        this._metrics.lastActivity = Date.now();
        resolve(data);
      });

      this._worker.postMessage({
        type: 'ping',
        callbackId,
        data: { sent: Date.now() }
      });
    });
  }

  /**
   * Workerを再初期化する
   * @private
   */
  _reinitializeWorker() {
    this._retryCount++;

    if (this._worker) {
      try {
        this._worker.terminate();
      } catch (e) {
        console.error('Worker終了時にエラー:', e);
      }
      this._worker = null;
    }

    // コールバックをクリア（タイムアウトしたリクエストを解決するため）
    const pendingCallbacks = [...this._callbacks.entries()];
    this._callbacks.clear();

    // 少し待ってから初期化
    setTimeout(() => {
      this._initialize()
        .then(() => {
          console.log(`[リファクタリング] Workerを再初期化しました (${this._retryCount}回目の再試行)`);
          this._metrics.recoveryCount++;

          // 失敗したコールバックに再試行エラーを通知
          pendingCallbacks.forEach(([id, callback]) => {
            callback({ error: 'Worker was reinitialized', recovered: true });
          });
        })
        .catch(err => {
          console.error('Worker再初期化に失敗:', err);

          // 失敗したコールバックにエラーを通知
          pendingCallbacks.forEach(([id, callback]) => {
            callback({ error: 'Worker reinitialization failed', recovered: false });
          });

          // 最大5回まで再試行
          if (this._retryCount < 5) {
            this._workerInitRetryTimeout = setTimeout(() => {
              this._reinitializeWorker();
            }, 3000);
          }
        });
    }, 500);
  }

  /**
   * Workerの初期化
   * @returns {Promise} 初期化完了を示すPromise
   */
  _initialize() {
    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = new Promise((resolve, reject) => {
      try {
        // ブラウザ環境でのみWorkerを初期化
        if (typeof Worker === 'undefined') {
          console.warn('Web Worker is not supported in this environment.');
          resolve();
          return;
        }

        // WorkerをWeb Worker APIを使って初期化
        this._worker = new Worker(
          new URL('../workers/typing-worker.js', import.meta.url),
          // 高リフレッシュレート対応の設定
          { name: 'typing-worker' }
        );

        // メッセージハンドラの設定
        this._worker.onmessage = (e) => {
          const startTime = performance.now();

          const { type, data, callbackId, priority } = e.data;

          // リファクタリング: アクティビティ時間を更新
          this._metrics.lastActivity = Date.now();

          // メトリクスの更新
          this._metrics.messagesReceived++;

          // 高優先度メッセージは即時処理
          if (priority === 'high') {
            this._processWorkerMessage(type, data, callbackId);

            // レイテンシ計測（高優先度タスクのみ）
            const latency = performance.now() - startTime;
            this._metrics.lastLatency = latency;
            this._metrics.totalProcessingTime += latency;
            if (latency > this._metrics.maxProcessingTime) {
              this._metrics.maxProcessingTime = latency;
            }

            return;
          }

          // コールバックIDがある場合は、対応するコールバックを実行
          if (callbackId && this._callbacks.has(callbackId)) {
            const callback = this._callbacks.get(callbackId);
            this._callbacks.delete(callbackId);
            callback(data);

            // レイテンシ計測
            const latency = performance.now() - startTime;
            this._metrics.lastLatency = latency;
            this._metrics.totalProcessingTime += latency;
            if (latency > this._metrics.maxProcessingTime) {
              this._metrics.maxProcessingTime = latency;
            }

            return;
          }

          // 各メッセージタイプに応じた処理
          this._processWorkerMessage(type, data, callbackId);
        };

        // エラーハンドラの設定 - リファクタリングで改善
        this._worker.onerror = (error) => {
          console.error('Typing Worker error:', error);

          // エラー統計の更新
          this._errorCount++;
          this._metrics.errorCount++;
          this._lastErrorTime = Date.now();

          // 初期化中のエラーの場合は拒否
          if (!this._workerReady) {
            this._initializationPromise = null;
            reject(error);
            return;
          }

          // 稼働中のエラーの場合は深刻度に応じて処理
          if (this._errorCount > 5 && this._errorCount - this._retryCount > 3) {
            // エラーが多発する場合は再初期化
            console.warn('Worker エラーが多発しています。再初期化します...');
            this._reinitializeWorker();
          }
        };

        // 生存確認のメッセージを送信
        this._worker.postMessage({
          type: 'ping',
          data: { sent: Date.now() },
        });

        // WorkerにリフレッシュレートOFFSCREEN_CANVAS_SUPPORT情報を送信
        this._detectDisplayCapabilities().then(capabilities => {
          this._worker.postMessage({
            type: 'setDisplayCapabilities',
            data: capabilities,
          });

          // 初期化成功
          this._workerReady = true;
          resolve();
        });
      } catch (error) {
        console.error('Failed to initialize Typing Worker:', error);
        // Workerの初期化に失敗した場合は、フラグをリセット
        this._worker = null;
        this._initializationPromise = null;
        reject(error);
      }
    });

    return this._initializationPromise;
  }

  /**
   * ディスプレイとブラウザの機能を検出する
   * @returns {Promise} ディスプレイ機能と環境情報を含むPromise
   */
  async _detectDisplayCapabilities() {
    if (typeof window === 'undefined') {
      return { refreshRate: 60, offscreenCanvas: false };
    }

    // リフレッシュレート検出
    let refreshRate = 60; // デフォルト値

    try {
      // 最新のScreen.refresh APIが利用可能かチェック
      if (window.screen && window.screen.refresh !== undefined) {
        refreshRate = window.screen.refresh;
      } else {
        // レガシー方式でリフレッシュレートを推定
        let count = 0;
        const startTime = performance.now();

        await new Promise(resolve => {
          const detectFrames = (timestamp) => {
            count++;
            if (timestamp - startTime >= 1000) {
              // 1秒経過したら測定終了
              resolve();
              return;
            }
            requestAnimationFrame(detectFrames);
          };
          requestAnimationFrame(detectFrames);
        });

        // 推定されたリフレッシュレートを設定（最低60Hz、最大300Hzまで）
        refreshRate = Math.min(Math.max(count, 60), 300);
      }
    } catch (e) {
      console.warn('リフレッシュレート検出に失敗しました:', e);
    }

    // OffscreenCanvas対応チェック
    const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

    return {
      refreshRate,
      offscreenCanvas: hasOffscreenCanvas,
      highPrecisionTime: typeof performance !== 'undefined' && typeof performance.now === 'function',
      supportsSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      supportedInputTypes: this._getSupportedInputTypes(),
    };
  }

  /**
   * サポートされている入力タイプを検出
   */
  _getSupportedInputTypes() {
    if (typeof window === 'undefined' || !window.navigator) {
      return {};
    }

    return {
      touch: 'ontouchstart' in window,
      pointer: window.navigator.maxTouchPoints > 0 || 'onpointerdown' in window,
      gamepad: navigator.getGamepads !== undefined,
    };
  }

  /**
   * Worker メッセージ処理を行う内部メソッド
   */
  _processWorkerMessage(type, data, callbackId) {
    switch (type) {
      case 'processInputResult':
        if (data.success && data.session) {
          // セッション状態を更新
          this._lastSession = this._reconstructSession(data.session);
        }
        break;

      case 'pong':
        // 生存確認の応答
        console.log(
          'Worker is alive, response time:',
          Date.now() - data.received,
          'ms'
        );
        break;

      case 'metrics':
        // Workerから送られてくるメトリクス情報
        console.debug('Worker metrics:', data);
        break;
    }
  }

  /**
   * セッションオブジェクトを Worker に送信可能な形式に変換（関数を除外・差分更新機能付き）
   */
  _serializeSession(session) {
    if (!session) return null;

    // 全く同じオブジェクトの場合は差分はなし
    if (this._lastSession === session) {
      return { unchanged: true };
    }

    // 前回のセッションがある場合は、変更部分のみを送信
    if (this._lastSession) {
      const diff = {
        currentCharIndex: session.currentCharIndex,
        typedRomaji: session.typedRomaji,
        currentInput: session.currentInput,
        completed: session.completed,
        completedAt: session.completedAt,
        isDiff: true
      };

      // ベース情報が変わっていない場合はセッションIDのみ送信
      return diff;
    }

    // 初回または大きな変更があった場合は完全なオブジェクトを送信
    return {
      originalText: session.originalText,
      kanaText: session.kanaText,
      displayRomaji: session.displayRomaji,
      patterns: session.patterns,
      patternLengths: session.patternLengths,
      displayIndices: session.displayIndices,
      currentCharIndex: session.currentCharIndex,
      typedRomaji: session.typedRomaji,
      currentInput: session.currentInput,
      completed: session.completed,
      completedAt: session.completedAt,
      isFullSync: true
    };
  }

  /**
   * Worker からのデータを元のセッションオブジェクトに再構築
   */
  _reconstructSession(sessionData) {
    // 単純にデータを返すだけでOK（関数は別途参照する）
    return sessionData;
  }

  /**
   * Workerが有効かどうかを確認
   * @returns {boolean} Workerが利用可能かどうか
   */
  isWorkerAvailable() {
    return !!this._worker;
  }

  /**
   * パフォーマンスメトリクスを取得（リファクタリングで拡張）
   * @returns {Object} 現在のパフォーマンスメトリクスと診断情報
   */
  getPerformanceMetrics() {
    // 平均処理時間を計算
    const avgProcessingTime = this._metrics.messagesReceived > 0
      ? this._metrics.totalProcessingTime / this._metrics.messagesReceived
      : 0;

    // Workerのメトリクスも取得
    let workerMetrics = null;
    const getWorkerMetricsPromise = this.getWorkerMetrics();

    // リファクタリングで拡張したメトリクス情報
    return {
      ...this._metrics,
      avgProcessingTime,
      messagesPerSecond: this._metrics.messagesSent / (performance.now() / 1000),
      diagnostics: {
        workerReady: this._workerReady,
        retryCount: this._retryCount,
        errorCount: this._errorCount,
        lastErrorTime: this._lastErrorTime,
        callbacksCount: this._callbacks.size,
        inputHistorySize: this._inputHistory.length
      },
      workerMetrics: getWorkerMetricsPromise, // Promiseを返す
    };
  }

  /**
   * Workerの内部メトリクスを取得
   * @returns {Promise} Worker内部のメトリクス情報を含むPromise
   */
  async getWorkerMetrics() {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // タイムアウト処理
      const timeout = setTimeout(() => {
        if (this._callbacks.has(callbackId)) {
          this._callbacks.delete(callbackId);
          resolve({ error: 'Worker metrics request timeout' });
        }
      }, 3000);

      // コールバックを登録
      this._callbacks.set(callbackId, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'getMetrics',
        callbackId,
      });
    });
  }

  /**
   * キー入力を処理する - この処理はメインスレッドでも行う
   * @param {Object} session - タイピングセッション
   * @param {string} char - 入力された文字
   * @param {boolean} isCorrect - 正しい入力かどうか（統計用）
   * @returns {Promise} 処理結果を含むPromise
   */
  async processInput(session, char, isCorrect = null) {
    const startTime = performance.now();

    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // 入力履歴に追加（統計用）
    if (char) {
      this._inputHistory.push({
        key: char,
        isCorrect: isCorrect,
        timestamp: Date.now(),
      });
    }

    // 高リフレッシュレート環境では優先度を高く設定
    const priority = this._optimizationOptions.prioritizeLatency ? 'high' : 'normal';

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, (result) => {
        // パフォーマンス測定（高速化のため重要）
        const latency = performance.now() - startTime;
        if (process.env.NODE_ENV === 'development' && latency > 8) {
          console.debug(`Worker processInput 応答時間: ${latency.toFixed(2)}ms`);
        }

        resolve(result);
      });

      // セッションをシリアライズして関数を除去
      const serializedSession = this._serializeSession(session);

      // Workerにメッセージを送信（高速処理フラグ付き）
      this._worker.postMessage({
        type: 'processInput',
        callbackId,
        priority, // 優先度情報を追加
        data: {
          session: serializedSession,
          char,
        },
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * 色分け情報を取得 - この処理はメインスレッドでも行う
   * @param {Object} session - タイピングセッション
   * @returns {Promise} 色分け情報を含むPromise
   */
  async getColoringInfo(session) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // セッションをシリアライズして関数を除去
      const serializedSession = this._serializeSession(
        session || this._lastSession
      );

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'getColoringInfo',
        callbackId,
        priority: 'normal',
        data: {
          session: serializedSession,
        },
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * 統計情報を計算（非同期） - この処理はWorkerで行う
   * @param {Object} statsData - 統計計算に必要なデータ
   * @returns {Promise} 計算結果を含むPromise
   */
  async calculateStatistics(statsData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'calculateStatistics',
        callbackId,
        priority: 'low', // 優先度を下げることで高速タイピング時も入力処理を優先
        data: statsData,
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * ランキング送信（非同期） - この処理はWorkerで行う
   * @param {Object} recordData - 送信するランキングデータ
   * @returns {Promise} 送信結果を含むPromise
   */
  async submitRanking(recordData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'submitRanking',
        callbackId,
        priority: 'low', // 非重要タスク
        data: recordData,
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * 入力履歴の処理と集計（非同期） - この処理はWorkerで行う
   * @returns {Promise} 集計結果を含むPromise
   */
  async processInputHistory() {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // 入力履歴がなければ処理不要
    if (this._inputHistory.length === 0) {
      return Promise.resolve({ success: false, error: '入力履歴がありません' });
    }

    // 大量のデータの場合、転送可能オブジェクトを使用（高速化）
    let inputHistoryData;
    let transferable;

    // 転送可能オブジェクトの最適化（大量データの高速転送）
    if (this._optimizationOptions.useTransferableObjects && this._inputHistory.length > 100) {
      // 転送可能な形式に変換
      const buffer = new ArrayBuffer(this._inputHistory.length * 16); // 推定サイズ
      const view = new DataView(buffer);

      this._inputHistory.forEach((entry, index) => {
        const offset = index * 16;
        view.setUint32(offset, entry.timestamp || 0);
        view.setUint8(offset + 4, entry.isCorrect ? 1 : 0);
        // キーコードを1バイトに格納（英数字のみ）
        if (entry.key && entry.key.length === 1) {
          view.setUint8(offset + 5, entry.key.charCodeAt(0));
        }
      });

      inputHistoryData = {
        buffer: buffer,
        length: this._inputHistory.length,
        format: 'binary'
      };

      transferable = [buffer];
    } else {
      // 通常のJSONシリアライズ
      inputHistoryData = {
        inputHistory: this._inputHistory,
        format: 'json'
      };
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      if (transferable) {
        this._worker.postMessage({
          type: 'processInputHistory',
          callbackId,
          priority: 'low', // 非重要タスク
          data: inputHistoryData,
        }, transferable);
      } else {
        this._worker.postMessage({
          type: 'processInputHistory',
          callbackId,
          priority: 'low', // 非重要タスク
          data: inputHistoryData,
        });
      }

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * 内部: 次のコールバックIDを取得
   * @returns {number} 一意のコールバックID
   * @private
   */
  _getNextCallbackId() {
    // 整数のオーバーフローを防止するために1,000,000でリセット
    if (this._callbackId > 1000000) {
      this._callbackId = 0;
    }
    return this._callbackId++;
  }

  /**
   * 入力履歴をクリア
   */
  clearInputHistory() {
    this._inputHistory = [];
    this._metrics.historyClears++;
  }

  /**
   * 入力履歴を定期的にクリーンアップする (メモリリーク防止)
   * @returns {boolean} クリーンアップが実行されたかどうか
   */
  cleanupInputHistory() {
    const MAX_HISTORY_LENGTH = 500;
    const REDUCE_TO_SIZE = 250;

    if (this._inputHistory.length > MAX_HISTORY_LENGTH) {
      console.info(`[最適化] TypingWorkerManager入力履歴を削減: ${this._inputHistory.length} → ${REDUCE_TO_SIZE}件`);
      this._inputHistory = this._inputHistory.slice(-REDUCE_TO_SIZE);
      this._metrics.historyCleanups++;
      return true;
    }
    return false;
  }

  /**
   * Web Workerの統計を取得
   */
  async getWorkerStatistics() {
    if (!this._worker) {
      await this._initialize();
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'getStatistics',
        callbackId,
      });
    });
  }

  /**
   * リソースの解放（リファクタリングで改善）
   */
  terminate() {
    // 健全性チェックを停止
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }

    // 再試行タイマーをクリア
    if (this._workerInitRetryTimeout) {
      clearTimeout(this._workerInitRetryTimeout);
      this._workerInitRetryTimeout = null;
    }

    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._callbacks.clear();
    this._lastSession = null;
    this._initializationPromise = null;
    this._inputHistory = [];
    this._batchedTasks = [];
    this._batchProcessScheduled = false;
    this._workerReady = false;
  }

  /**
   * パフォーマンス最適化設定の更新
   * @param {Object} options - 更新するオプション
   */
  updateOptimizationOptions(options) {
    this._optimizationOptions = {
      ...this._optimizationOptions,
      ...options
    };

    // 設定をWorkerにも反映
    if (this._worker) {
      this._worker.postMessage({
        type: 'updateOptimizationOptions',
        data: this._optimizationOptions,
      });
    }

    return this._optimizationOptions;
  }

  /**
   * リザルト計算（WPM、精度、ランク分析など詳細な結果）
   * @param {Object} resultData - リザルト計算に必要なデータ
   * @returns {Promise} 詳細なリザルト情報を含むPromise
   */
  async calculateDetailedResults(resultData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'calculateDetailedResults',
        callbackId,
        priority: 'low', // 優先度を下げる（メイン処理への影響を減らすため）
        data: resultData,
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * コンボエフェクトの計算
   * @param {Object} comboData - コンボデータ
   * @returns {Promise} コンボエフェクト計算結果を含むPromise
   */
  async calculateComboEffect(comboData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'calculateComboEffect',
        callbackId,
        priority: 'normal', // 通常の優先度（視覚効果に関わるため）
        data: comboData,
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * Firebase用のデータ整形・準備
   * @param {Object} recordData - 送信予定のデータ
   * @returns {Promise} Firebase用の整形されたデータを含むPromise
   */
  async prepareFirebaseData(recordData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'prepareFirebaseData',
        callbackId,
        priority: 'low', // 非重要タスク
        data: recordData,
      });

      // メトリクスの更新
      this._metrics.messagesSent++;
      this._metrics.totalMessages++;
    });
  }

  /**
   * バッチ処理の実行
   * @param {Array} tasks - 実行するタスクのリスト
   * @returns {Promise} すべてのタスク結果を含むPromise
   */
  async executeBatch(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return Promise.resolve([]);
    }

    return Promise.all(tasks.map(task => {
      switch (task.type) {
        case 'processInput':
          return this.processInput(task.session, task.char, task.isCorrect);
        case 'calculateStatistics':
          return this.calculateStatistics(task.data);
        case 'calculateComboEffect':
          return this.calculateComboEffect(task.data);
        case 'prepareFirebaseData':
          return this.prepareFirebaseData(task.data);
        case 'calculateDetailedResults':
          return this.calculateDetailedResults(task.data);
        default:
          return Promise.reject(new Error(`不明なタスクタイプ: ${task.type}`));
      }
    }));
  }
}

/**
 * 入力予測キャッシュを初期化する
 * 良く使われるキーシーケンスを事前に計算してレスポンスを向上させる
 */
async function initializePredictionCache() {
  // 最も頻出する日本語入力パターンを事前計算
  const commonSequences = [
    'a', 'i', 'u', 'e', 'o',
    'ka', 'ki', 'ku', 'ke', 'ko',
    'sa', 'shi', 'su', 'se', 'so',
    'ta', 'chi', 'tsu', 'te', 'to',
    'na', 'ni', 'nu', 'ne', 'no'
  ];

  // Web Workerに通知
  if (!typingWorkerManager._worker) {
    await typingWorkerManager._initialize();
  }

  if (typingWorkerManager._worker) {
    return new Promise((resolve) => {
      const callbackId = typingWorkerManager._getNextCallbackId();

      // コールバックを登録
      typingWorkerManager._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      typingWorkerManager._worker.postMessage({
        type: 'initializePredictionCache',
        callbackId,
        priority: 'high',
        data: { sequences: commonSequences }
      });

      console.log('[最適化] 入力予測キャッシュを初期化しました');
    });
  }

  return Promise.resolve(false);
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

// 初期化後に予測キャッシュを設定
if (typeof window !== 'undefined') {
  // ブラウザ環境でのみ実行
  window.addEventListener('load', () => {
    // DOMが完全に読み込まれてから予測キャッシュを初期化
    setTimeout(() => {
      initializePredictionCache()
        .then(result => {
          if (result && result.success) {
            console.log('[最適化] 入力予測キャッシュを初期化しました', result);
          }
        })
        .catch(err => {
          console.warn('[最適化] 入力予測キャッシュの初期化に失敗しました', err);
        });
    }, 500);
  });
}

// Worker初期化状態をエクスポート
export { typingWorkerManager, initializePredictionCache };

export default typingWorkerManager;
