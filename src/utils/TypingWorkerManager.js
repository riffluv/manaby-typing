/**
 * タイピング統計処理を扱うWorkerマネージャ
 * 
 * typingmania-refを参考にした実装
 * メインスレッドの負荷を軽減するためにタイピング処理をWebワーカーに委譲
 */

class TypingWorkerManager {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.pendingPromises = new Map(); // ID → { resolve, reject } のマップ
    this.currentId = 0;
    this.callbacks = {
      onStats: null,
      onInitialized: null,
      onPreloadComplete: null,
    };
    this.inputHistory = [];
  }

  // Webワーカーを初期化する
  initialize(config = {}) {
    if (this.isInitialized) {
      console.warn('TypingWorkerManager already initialized');
      return Promise.resolve();
    }

    // Worker APIが利用可能かチェック
    if (typeof Worker === 'undefined') {
      console.error('Web Workers are not supported in this browser');
      return Promise.reject(new Error('Web Workers not supported'));
    }

    return new Promise((resolve, reject) => {
      try {
        // Webワーカーの作成
        this.worker = new Worker(new URL('../workers/typing.worker.js', import.meta.url));

        // メッセージハンドラを設定
        this.worker.onmessage = this._handleWorkerMessage.bind(this);

        // エラーハンドラを設定
        this.worker.onerror = (error) => {
          console.error('Typing worker error:', error);
          reject(error);
        };

        // 初期化完了時のコールバックを設定
        this.callbacks.onInitialized = () => {
          this.isInitialized = true;
          resolve();
        };

        // ワーカーに初期化メッセージを送信
        this.worker.postMessage({
          type: 'INITIALIZE',
          payload: config
        });
      } catch (error) {
        console.error('Failed to initialize TypingWorkerManager:', error);
        reject(error);
      }
    });
  }

  // 入力を処理する
  processInput(input, target, options = {}) {
    if (!this.isInitialized) {
      return Promise.reject(new Error('TypingWorkerManager not initialized'));
    }

    const id = this._generateRequestId();

    return new Promise((resolve, reject) => {
      // プロミスをマップに保存
      this.pendingPromises.set(id, { resolve, reject });

      // ワーカーに処理リクエストを送信
      this.worker.postMessage({
        type: 'PROCESS_INPUT',
        payload: { input, target, options },
        id
      });
    });
  }

  // 頻出パターンを事前にキャッシュに読み込む
  preloadPatterns(patterns, onProgress) {
    if (!this.isInitialized) {
      return Promise.reject(new Error('TypingWorkerManager not initialized'));
    }

    return new Promise((resolve) => {
      // プリロード完了時のコールバックを設定
      this.callbacks.onPreloadComplete = (data) => {
        resolve(data);
      };

      // ワーカーにプリロードリクエストを送信
      this.worker.postMessage({
        type: 'PRELOAD_PATTERNS',
        payload: { patterns }
      });
    });
  }

  // 統計情報を取得する
  getStats() {
    if (!this.isInitialized) {
      return Promise.reject(new Error('TypingWorkerManager not initialized'));
    }

    return new Promise((resolve) => {
      // 統計情報受信時のコールバックを設定
      this.callbacks.onStats = (stats) => {
        resolve(stats);
      };

      // 統計情報リクエストを送信
      this.worker.postMessage({
        type: 'GET_STATS'
      });
    });
  }

  // 入力履歴をクリアする
  clearInputHistory() {
    this.inputHistory = [];

    if (this.isInitialized && this.worker) {
      // ワーカーにも入力履歴クリアを通知
      this.worker.postMessage({
        type: 'CLEAR_INPUT_HISTORY'
      });
    }
  }

  // ワーカーの状態をリセットする
  reset() {
    if (!this.isInitialized) {
      return;
    }

    // 全ての保留中のプロミスをキャンセル
    this.pendingPromises.forEach(({ reject }) => {
      reject(new Error('Worker reset'));
    });
    this.pendingPromises.clear();

    // リセットメッセージを送信
    this.worker.postMessage({
      type: 'RESET'
    });
  }

  // ワーカーを終了して解放する
  terminate() {
    if (!this.worker) {
      return;
    }

    // 全ての保留中のプロミスをキャンセル
    this.pendingPromises.forEach(({ reject }) => {
      reject(new Error('Worker terminated'));
    });
    this.pendingPromises.clear();

    // ワーカーを終了
    this.worker.terminate();
    this.worker = null;
    this.isInitialized = false;
  }

  // ワーカーからのメッセージを処理する
  _handleWorkerMessage(event) {
    const { type, payload, id } = event.data;

    switch (type) {
      case 'INITIALIZED':
        if (this.callbacks.onInitialized) {
          this.callbacks.onInitialized();
        }
        break;

      case 'INPUT_RESULT':
        // ペンディング中のプロミスを解決
        if (id && this.pendingPromises.has(id)) {
          const { resolve } = this.pendingPromises.get(id);
          resolve(payload);
          this.pendingPromises.delete(id);
        }
        break;

      case 'STATS_RESULT':
        if (this.callbacks.onStats) {
          this.callbacks.onStats(payload);
        }
        break;

      case 'PRELOAD_COMPLETE':
        if (this.callbacks.onPreloadComplete) {
          this.callbacks.onPreloadComplete(payload);
        }
        break;

      default:
        console.warn('Unknown message type from typing worker:', type);
    }
  }

  // リクエストIDを生成する
  _generateRequestId() {
    return this.currentId++;
  }

  // シングルトンインスタンスを取得
  static getInstance() {
    if (!TypingWorkerManager.instance) {
      TypingWorkerManager.instance = new TypingWorkerManager();
    }
    return TypingWorkerManager.instance;
  }
}

// シングルトンインスタンス
TypingWorkerManager.instance = null;

export default TypingWorkerManager.getInstance();
