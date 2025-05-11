// src/utils/worker-manager.js
/**
 * Next.js環境でWeb Workerを扱うためのユーティリティクラス
 * 
 * This class handles Web Worker creation and communication in Next.js environment.
 * It provides a consistent interface for worker interaction regardless of whether
 * the code is running on the client or during SSR.
 */
export default class WorkerManager {
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath;
    this.options = {
      shared: false,
      ...options
    };
    this.worker = null;
    this.callbacks = {};
    this.isReady = false;
    this.messageQueue = [];
    this.uniqueId = 0;
  }

  /**
   * ワーカーを初期化する
   * ブラウザ環境でのみ実行される
   */
  initialize() {
    // サーバーサイドレンダリング時は何もしない
    if (typeof window === 'undefined') return;

    try {
      // Worker作成
      this.worker = this.options.shared
        ? new SharedWorker(this.workerPath)
        : new Worker(new URL(this.workerPath, import.meta.url));

      // メッセージハンドラの設定
      if (this.options.shared) {
        this.worker.port.onmessage = this.handleMessage.bind(this);
        this.worker.port.start();
      } else {
        this.worker.onmessage = this.handleMessage.bind(this);
      }

      // エラーハンドラ
      if (!this.options.shared) {
        this.worker.onerror = this.handleError.bind(this);
      }

      console.log(`Worker initialized: ${this.workerPath}`);

      // WORKER_READYメッセージを受け取ったらキューに溜まったメッセージを送信
      this.addEventListener('WORKER_READY', () => {
        this.isReady = true;
        this.processQueue();
      });
    } catch (error) {
      console.error(`Failed to initialize worker (${this.workerPath}):`, error);
    }
  }

  /**
   * ワーカー終了時の処理
   */
  terminate() {
    if (!this.worker) return;

    if (this.options.shared) {
      this.worker.port.close();
    } else {
      this.worker.terminate();
    }

    this.worker = null;
    this.isReady = false;
    this.callbacks = {};
    this.messageQueue = [];

    console.log(`Worker terminated: ${this.workerPath}`);
  }

  /**
   * ワーカーにメッセージを送信する
   */
  postMessage(message) {
    // ブラウザ環境でない場合は何もしない
    if (typeof window === 'undefined') return;

    if (!this.worker) {
      this.initialize();
    }

    // ワーカーの準備ができていなければキューに追加
    if (!this.isReady) {
      this.messageQueue.push(message);
      return;
    }

    try {
      if (this.options.shared) {
        this.worker.port.postMessage(message);
      } else {
        this.worker.postMessage(message);
      }
    } catch (error) {
      console.error('Error posting message to worker:', error);
    }
  }

  /**
   * キューに溜まったメッセージを処理する
   */
  processQueue() {
    if (!this.messageQueue.length) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.postMessage(message);
    }
  }

  /**
   * 特定のメッセージタイプに対するイベントリスナーを追加
   */
  addEventListener(type, callback) {
    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }
    this.callbacks[type].push(callback);

    return () => this.removeEventListener(type, callback);
  }

  /**
   * イベントリスナーを削除
   */
  removeEventListener(type, callback) {
    if (!this.callbacks[type]) return;

    const index = this.callbacks[type].indexOf(callback);
    if (index !== -1) {
      this.callbacks[type].splice(index, 1);
    }
  }

  /**
   * コマンドを送信して応答を待つ（Promise形式）
   */
  async sendCommand(type, data = {}) {
    return new Promise((resolve, reject) => {
      const commandId = `cmd_${Date.now()}_${this.uniqueId++}`;

      // 応答ハンドラを一時的に登録
      const responseHandler = (response) => {
        if (response.commandId === commandId) {
          this.removeEventListener('COMMAND_RESPONSE', responseHandler);
          if (response.error) {
            reject(response.error);
          } else {
            resolve(response.data);
          }
        }
      };

      this.addEventListener('COMMAND_RESPONSE', responseHandler);

      // コマンドを送信
      this.postMessage({
        type: 'COMMAND',
        commandType: type,
        commandId: commandId,
        data: data
      });

      // タイムアウト設定（5秒）
      setTimeout(() => {
        this.removeEventListener('COMMAND_RESPONSE', responseHandler);
        reject(new Error(`Command timeout: ${type}`));
      }, 5000);
    });
  }

  /**
   * ワーカーからのメッセージを処理
   */
  handleMessage(e) {
    const data = e.data;

    // コールバック実行
    if (data && data.type && this.callbacks[data.type]) {
      this.callbacks[data.type].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in worker callback for type ${data.type}:`, error);
        }
      });
    }

    // 汎用コールバック
    if (this.callbacks['*']) {
      this.callbacks['*'].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in wildcard worker callback:', error);
        }
      });
    }
  }

  /**
   * エラー処理
   */
  handleError(error) {
    console.error('Worker error:', error);

    if (this.callbacks['error']) {
      this.callbacks['error'].forEach(callback => {
        try {
          callback(error);
        } catch (callbackError) {
          console.error('Error in error handler callback:', callbackError);
        }
      });
    }
  }
}
