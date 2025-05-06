/**
 * タイピング統計処理を扱うWorkerマネージャ（最適化版）
 * 
 * typingmania-refを参考にした軽量・高速な実装
 * メインスレッドの処理を優先し、バックグラウンド処理を効率化
 */

export class TypingWorkerManager {
  constructor() {
    this._worker = null;
    this._callbacks = new Map();
    this._callbackId = 0;
    this._inputHistory = [];
    this._initializationPromise = null;
    this._initializationAttempted = false;
    this._initializationFailed = false;
    this._lastCleanupTime = Date.now();
    this._pendingOperations = new Set();

    // 非同期初期化（即時実行せず、遅延ロード）
    if (typeof window !== 'undefined') {
      this._deferredInitialize();
    }
  }

  /**
   * 遅延初期化 - 最初の利用まで初期化を待機
   * @private
   */
  _deferredInitialize() {
    // 一定時間後に初期化を試みる（ページ読み込み完了を待機）
    setTimeout(() => {
      // キー入力がない状態での初期化を避ける（優先度低）
      document.addEventListener('keydown', this._initialize.bind(this), { once: true });
      
      // バックアッププラン（キー入力がない場合でも3秒後にロード）
      setTimeout(() => {
        if (!this._initializationAttempted) {
          this._initialize();
        }
      }, 3000);
    }, 500);
  }

  /**
   * Workerの初期化（最適化版）
   * @returns {Promise} 初期化完了を示すPromise
   * @private
   */
  _initialize() {
    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationAttempted = true;

    this._initializationPromise = new Promise((resolve, reject) => {
      try {
        // 環境チェック
        if (typeof Worker === 'undefined') {
          this._initializationFailed = true;
          console.warn('[Typing] Web Worker is not supported in this environment.');
          resolve(null); // エラーとして扱わず、フェイルソフトに
          return;
        }

        // WorkerをWeb Worker APIを使って初期化（遅延ロード）
        this._worker = new Worker(
          new URL('../workers/typing-worker.js', import.meta.url)
        );

        // メッセージハンドラの設定
        this._worker.onmessage = (e) => {
          const { callbackId, data } = e.data;

          // コールバックIDがある場合は対応するコールバックを実行
          if (callbackId && this._callbacks.has(callbackId)) {
            const callback = this._callbacks.get(callbackId);
            this._callbacks.delete(callbackId);
            this._pendingOperations.delete(callbackId);
            callback(data);
          }
        };

        // エラーハンドラ
        this._worker.onerror = (error) => {
          console.error('[Typing] Worker error:', error);
          this._initializationFailed = true;
          reject(error);
        };

        // 初期化成功とし、Workerへの初期化メッセージは送信しない
        // （修正: 初期化プローブ送信のエラーを修正）
        console.info('[Typing] Worker initialized successfully');
        resolve();
      } catch (error) {
        console.error('[Typing] Worker initialization error:', error);
        this._worker = null;
        this._initializationPromise = null;
        this._initializationFailed = true;
        reject(error);
      }
    });

    return this._initializationPromise;
  }

  /**
   * Workerにメッセージを送信（非同期）
   * @param {Object} message - 送信するメッセージ
   * @returns {Promise} 送信結果を含むPromise
   * @private
   */
  _sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this._worker) {
        if (this._initializationFailed) {
          // 初期化に失敗している場合はエラー
          reject(new Error('Worker initialization failed'));
          return;
        }

        // 初期化が必要な場合
        this._initialize()
          .then(() => {
            if (!this._worker) {
              reject(new Error('Worker initialization failed'));
              return;
            }
            this._sendMessage(message).then(resolve).catch(reject);
          })
          .catch(reject);
        return;
      }

      // callbackIdが無いケースのエラーを修正
      const callbackId = message.callbackId || this._getNextCallbackId();
      
      // オリジナルのメッセージにcallbackIdが無かった場合は追加
      const messageToSend = message.callbackId ? 
        message : { ...message, callbackId };

      const timeout = setTimeout(() => {
        if (this._callbacks.has(callbackId)) {
          this._callbacks.delete(callbackId);
          this._pendingOperations.delete(callbackId);
          reject(new Error('Worker response timeout'));
        }
      }, 5000);  // 5秒でタイムアウト

      // 操作を追跡
      this._pendingOperations.add(callbackId);

      // コールバックを登録
      this._callbacks.set(callbackId, (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      try {
        // Workerにメッセージを送信
        this._worker.postMessage(messageToSend);
      } catch (err) {
        clearTimeout(timeout);
        this._callbacks.delete(callbackId);
        this._pendingOperations.delete(callbackId);
        reject(err);
      }
    });
  }

  /**
   * Workerが有効かどうかを確認
   * @returns {boolean} Workerが利用可能かどうか
   */
  isWorkerAvailable() {
    return !!this._worker && !this._initializationFailed;
  }

  /**
   * 統計情報を計算（非同期・最適化版）
   * @param {Object} statsData - 統計計算に必要なデータ
   * @returns {Promise} 計算結果を含むPromise
   */
  async calculateStatistics(statsData) {
    try {
      const callbackId = this._getNextCallbackId();
      
      // 定期的なクリーンアップ
      this._periodicCleanup();
      
      return await this._sendMessage({
        type: 'calculateStatistics',
        callbackId,
        data: statsData
      });
    } catch (error) {
      console.error('[Typing] Statistics calculation error:', error);
      // フォールバック計算
      return {
        kpm: statsData.keyCount ? 
          Math.floor((statsData.keyCount * 60000) / statsData.elapsedTime) : 0,
        accuracy: statsData.totalCount ? 
          (statsData.correctCount / statsData.totalCount) * 100 : 0
      };
    }
  }

  /**
   * ランキング送信（非同期・最適化版）
   * @param {Object} recordData - 送信するランキングデータ
   * @returns {Promise} 送信結果を含むPromise
   */
  async submitRanking(recordData) {
    try {
      const callbackId = this._getNextCallbackId();
      
      return await this._sendMessage({
        type: 'submitRanking',
        callbackId,
        data: recordData
      });
    } catch (error) {
      console.error('[Typing] Ranking submission error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 定期的なリソース管理とクリーンアップ
   * @private
   */
  _periodicCleanup() {
    const now = Date.now();
    
    // 10秒に一度だけクリーンアップを実行
    if (now - this._lastCleanupTime > 10000) {
      this._lastCleanupTime = now;
      
      // 古いコールバックを削除
      if (this._callbacks.size > 10) {
        const oldCallbacks = [];
        this._callbacks.forEach((_, id) => {
          if (!this._pendingOperations.has(id)) {
            oldCallbacks.push(id);
          }
        });
        
        // 不要なコールバックを削除（最大5件まで）
        oldCallbacks.slice(0, 5).forEach(id => {
          this._callbacks.delete(id);
        });
      }
      
      // 入力履歴の削減
      this.cleanupInputHistory();
    }
  }

  /**
   * 内部: 次のコールバックIDを取得
   * @returns {number} 一意のコールバックID
   * @private
   */
  _getNextCallbackId() {
    // 整数のオーバーフローを防止
    if (this._callbackId > 10000) {
      this._callbackId = 0;
    }
    return this._callbackId++;
  }

  /**
   * 入力履歴をクリア
   */
  clearInputHistory() {
    this._inputHistory = [];
  }

  /**
   * 入力履歴を定期的にクリーンアップする（最適化版）
   */
  cleanupInputHistory() {
    const MAX_HISTORY_LENGTH = 400;  // 最大履歴長を削減
    const REDUCE_TO_SIZE = 200;      // 削減後のサイズ

    if (this._inputHistory.length > MAX_HISTORY_LENGTH) {
      this._inputHistory = this._inputHistory.slice(-REDUCE_TO_SIZE);
      return true;
    }
    return false;
  }

  /**
   * リソースの解放
   */
  terminate() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._callbacks.clear();
    this._pendingOperations.clear();
    this._initializationPromise = null;
    this._initializationAttempted = false;
    this._initializationFailed = false;
    this._inputHistory = [];
  }
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

export { typingWorkerManager };
export default typingWorkerManager;
