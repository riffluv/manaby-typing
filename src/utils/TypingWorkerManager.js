/**
 * タイピング統計処理を扱うWorkerマネージャ
 * 
 * 核となる入力処理の速度を優先し、統計処理のみをWorkerに委譲
 * typingmania-refの思想を取り入れたシンプルな設計
 */

export class TypingWorkerManager {
  constructor() {
    this._worker = null;
    this._callbacks = new Map();
    this._callbackId = 0;
    this._inputHistory = [];
    this._initializationPromise = null;

    // ブラウザ環境でのみ初期化
    if (typeof window !== 'undefined') {
      this._initialize();
    }
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
          new URL('../workers/typing-worker.js', import.meta.url)
        );

        // メッセージハンドラの設定
        this._worker.onmessage = (e) => {
          const { callbackId, data } = e.data;

          // コールバックIDがある場合は対応するコールバックを実行
          if (callbackId && this._callbacks.has(callbackId)) {
            const callback = this._callbacks.get(callbackId);
            this._callbacks.delete(callbackId);
            callback(data);
          }
        };

        // エラーハンドラ
        this._worker.onerror = (error) => {
          console.error('Typing Worker error:', error);
          reject(error);
        };

        // 初期化成功
        resolve();
      } catch (error) {
        console.error('Failed to initialize Typing Worker:', error);
        this._worker = null;
        this._initializationPromise = null;
        reject(error);
      }
    });

    return this._initializationPromise;
  }

  /**
   * Workerが有効かどうかを確認
   * @returns {boolean} Workerが利用可能かどうか
   */
  isWorkerAvailable() {
    return !!this._worker;
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
        data: statsData,
      });
    });
  }

  /**
   * ランキング送信（非同期）
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
        data: recordData,
      });
    });
  }

  /**
   * 入力履歴の処理と集計（非同期）
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

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'processInputHistory',
        callbackId,
        data: {
          inputHistory: this._inputHistory,
          format: 'json'
        },
      });
    });
  }

  /**
   * 内部: 次のコールバックIDを取得
   * @returns {number} 一意のコールバックID
   * @private
   */
  _getNextCallbackId() {
    // 整数のオーバーフローを防止
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
  }

  /**
   * 入力履歴を定期的にクリーンアップする
   */
  cleanupInputHistory() {
    const MAX_HISTORY_LENGTH = 500;
    const REDUCE_TO_SIZE = 250;

    if (this._inputHistory.length > MAX_HISTORY_LENGTH) {
      console.info(`[最適化] 入力履歴を削減: ${this._inputHistory.length} → ${REDUCE_TO_SIZE}件`);
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
    this._initializationPromise = null;
    this._inputHistory = [];
  }
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

export { typingWorkerManager };
export default typingWorkerManager;
