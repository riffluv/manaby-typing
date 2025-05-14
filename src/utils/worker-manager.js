// src/utils/worker-manager.js
/**
 * WorkerManager - WebWorkerとの通信を管理するクラス
 *
 * Comlink（https://github.com/GoogleChromeLabs/comlink）を使用したWebWorker実装
 * WebWorkerが使用できない環境向けのフォールバック機能も提供
 */
import * as Comlink from 'comlink';

// WebWorkerが利用可能かチェック
const isWebWorkerAvailable = () => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof Worker !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    );
  } catch (e) {
    console.warn('[WorkerManager] WebWorker API利用可能性チェックエラー:', e);
    return false;
  }
};

// URLから動的にワーカースクリプトをロードする処理
const createWorkerBlobUrl = (workerPath) => {
  // Next.jsの開発環境とプロダクションで異なる挙動になる可能性があるため、
  // 簡単なラッパースクリプトを作成
  const workerWrapper = `
    // WorkerManager: ${workerPath}
    try {
      importScripts('${workerPath}');
    } catch (e) {
      console.error('[WorkerManager] Worker importScripts failed:', e);
      self.postMessage({ type: 'WORKER_ERROR', error: e.toString() });
    }
  `;

  const blob = new Blob([workerWrapper], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
};

export default class WorkerManager {
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath;
    this.options = options;
    this.worker = null;
    this.proxy = null;
    this.isReady = false;
    this.eventListeners = {};
    this.messageQueue = [];
    this.fallbackMode = false;
    this.lastHeartbeat = 0;
    this.heartbeatInterval = null;

    // クライアントサイド環境であれば初期ログ
    if (typeof window !== 'undefined') {
      console.log(`[WorkerManager] 初期化中: ${workerPath}`);
    }
  }

  /**
   * WorkerManagerを初期化
   */
  initialize() {
    if (this.isReady || this.initializing) return;
    this.initializing = true;

    try {
      // WebWorker利用可能かチェック
      if (!isWebWorkerAvailable()) {
        console.warn(
          `[WorkerManager] WebWorkerが利用できません。フォールバックモードで実行します: ${this.workerPath}`
        );
        this._setupFallbackMode();
        return;
      }

      // 絶対URLに変換（Next.js対応）
      let workerUrl = this.workerPath;
      if (typeof window !== 'undefined') {
        const baseUrl = window.location.origin;
        if (!workerUrl.startsWith('http') && !workerUrl.startsWith('blob:')) {
          workerUrl = `${baseUrl}${
            workerUrl.startsWith('/') ? '' : '/'
          }${workerUrl}`;
        }
      }

      // Workerを作成
      let workerBlob;
      try {
        if (this.options.useImportScripts) {
          workerBlob = createWorkerBlobUrl(workerUrl);
          this.worker = new Worker(workerBlob);
        } else {
          // 直接Workerとして読み込み
          this.worker = new Worker(workerUrl);
        }
      } catch (error) {
        console.error('[WorkerManager] Worker作成エラー:', error);
        // フォールバックモードに切り替え
        this._setupFallbackMode();
        return;
      }

      // Comlinkでラップ
      this.proxy = Comlink.wrap(this.worker);

      // 通信確認
      this._setupHeartbeat();

      // 準備完了
      this.isReady = true;
      this.initializing = false;
      this._triggerEvent('WORKER_READY', { mode: 'worker' });

      // 保留中のメッセージを処理
      this._processQueue();

      console.log(
        `[WorkerManager] WebWorkerモードで初期化完了: ${this.workerPath}`
      );
    } catch (error) {
      console.error('[WorkerManager] 初期化エラー:', error);
      // フォールバックモードに切り替え
      this._setupFallbackMode();
    }
  }

  /**
   * フォールバックモードのセットアップ
   * @private
   */
  _setupFallbackMode() {
    this.fallbackMode = true;
    this.isReady = true;
    this.initializing = false;
    this._triggerEvent('WORKER_READY', { mode: 'fallback' });

    // 保留中のメッセージを処理
    this._processQueue();

    console.warn(
      `[WorkerManager] フォールバックモードで初期化完了: ${this.workerPath}`
    );
  }

  /**
   * ハートビート確認を設定
   * @private
   */
  _setupHeartbeat() {
    // すでに設定済みなら何もしない
    if (this.heartbeatInterval) return;

    // 30秒ごとにハートビートを送信
    this.heartbeatInterval = setInterval(() => {
      if (!this.worker) return;

      // 5秒以上応答がなかった場合は問題があると判断
      const now = Date.now();
      if (this.lastHeartbeat > 0 && now - this.lastHeartbeat > 5000) {
        console.warn(
          '[WorkerManager] Workerの応答がありません。再初期化します。'
        );
        this._restartWorker();
        return;
      }

      // ハートビート送信
      this.sendMessage('PING', { timestamp: now });
      this.lastHeartbeat = now;
    }, 30000);
  }

  /**
   * Workerを再起動
   * @private
   */
  _restartWorker() {
    this.terminate();
    this.initializing = false;
    this.isReady = false;
    this.initialize();
  }

  /**
   * メッセージキューを処理
   * @private
   */
  _processQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(
      `[WorkerManager] 保留中のメッセージを処理: ${this.messageQueue.length}件`
    );

    // キュー内のすべてのメッセージを処理
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const { type, data, callback } of queue) {
      this.sendMessage(type, data, callback);
    }
  }

  /**
   * メッセージを送信
   * @param {string} type メッセージタイプ
   * @param {Object} data データ
   * @param {Function} callback 完了コールバック
   */
  sendMessage(type, data, callback) {
    // 準備ができていない場合はキューに追加
    if (!this.isReady) {
      // 初期化を開始
      if (!this.initializing) {
        this.initialize();
      }

      this.messageQueue.push({ type, data, callback });
      return;
    }

    // フォールバックモードの場合
    if (this.fallbackMode) {
      this._processFallbackMessage(type, data, callback);
      return;
    }

    // WebWorkerモードの場合
    this._sendWorkerMessage(type, data, callback);
  }

  /**
   * WebWorkerにメッセージを送信
   * @param {string} type メッセージタイプ
   * @param {Object} data データ
   * @param {Function} callback 完了コールバック
   * @private
   */
  async _sendWorkerMessage(type, data, callback) {
    try {
      if (!this.proxy) {
        throw new Error('Worker proxyが初期化されていません');
      }

      // Comlinkを使用してメソッド呼び出し
      const response = await this.proxy.processMessage(type, data);

      // PINGレスポンスの場合はハートビート時間を更新
      if (type === 'PING' && response && response.type === 'PONG') {
        this.lastHeartbeat = Date.now();
      }

      // コールバックがあれば実行
      if (callback) {
        callback(response);
      }

      // イベントタイプに応じて内部イベントを発火
      if (response && response.events) {
        response.events.forEach((event) => {
          this._triggerEvent(event.name, event.data);
        });
      }
    } catch (error) {
      console.error(`[WorkerManager] Worker通信エラー(${type}):`, error);

      // エラーが続く場合はフォールバックモードに切り替え
      if (
        error.message.includes('Failed to execute') ||
        error.message.includes('Worker is not defined') ||
        error.message.includes('terminated')
      ) {
        console.warn(
          '[WorkerManager] Worker通信に問題があります。フォールバックモードに切り替えます。'
        );
        this._setupFallbackMode();
        this._processFallbackMessage(type, data, callback);
        return;
      }

      // コールバックにエラーを返す
      if (callback) {
        callback({ error: error.message });
      }
    }
  }

  /**
   * フォールバックモードでメッセージを処理
   * @param {string} type メッセージタイプ
   * @param {Object} data データ
   * @param {Function} callback コールバック関数
   * @private
   */
  _processFallbackMessage(type, data, callback) {
    // 非同期処理として実行（メインスレッドをブロックしないため）
    setTimeout(() => {
      try {
        // タイプに応じた処理
        let response;

        switch (type) {
          case 'PING':
            response = { type: 'PONG', timestamp: Date.now() };
            break;

          case 'START_ANIMATION':
            // アニメーション開始イベントを発火
            this._triggerEvent('ANIMATION_FRAME', {
              keyStates: {},
              effects: [],
              animationProgress: [],
            });
            response = { success: true };
            break;

          case 'STOP_ANIMATION':
            response = { success: true };
            break;

          case 'START_EFFECTS':
            response = { success: true };
            break;

          case 'STOP_EFFECTS':
            response = { success: true };
            break;

          case 'PROCESS_KEY_EVENT':
            // キーイベント処理とエフェクト更新イベントを発火
            this._triggerEvent('EFFECTS_UPDATE', {
              effects: [],
            });
            response = { success: true };
            break;

          case 'PROCESS_EFFECTS':
            // エフェクト処理イベントを発火
            this._triggerEvent('EFFECTS_UPDATE', {
              effects: [],
            });
            response = { success: true };
            break;

          case 'SET_PROCESSING_MODES':
            response = {
              success: true,
              currentModes: {
                typing: 'main-thread',
                effects: 'main-thread',
                animation: 'main-thread',
                statistics: 'main-thread',
              },
            };
            break;

          // 他のメッセージタイプに応じた処理を追加
          default:
            response = { error: `未知のメッセージタイプ: ${type}` };
        }

        // コールバックがあれば実行
        if (callback) {
          callback(response);
        }
      } catch (error) {
        console.error(
          `[WorkerManager] フォールバック処理エラー(${type}):`,
          error
        );
        if (callback) {
          callback({ error: error.message });
        }
      }
    }, 0);
  }

  /**
   * イベントリスナーを追加
   * @param {string} eventName イベント名
   * @param {Function} callback コールバック関数
   * @returns {Function} リスナー削除用関数
   */
  addEventListener(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }

    this.eventListeners[eventName].push(callback);

    // リスナー削除用の関数を返す
    return () => {
      this.removeEventListener(eventName, callback);
    };
  }

  /**
   * イベントリスナーを削除
   * @param {string} eventName イベント名
   * @param {Function} callback コールバック関数
   */
  removeEventListener(eventName, callback) {
    if (!this.eventListeners[eventName]) return;

    this.eventListeners[eventName] = this.eventListeners[eventName].filter(
      (listener) => listener !== callback
    );
  }

  /**
   * イベントを発火
   * @param {string} eventName イベント名
   * @param {Object} data イベントデータ
   * @private
   */
  _triggerEvent(eventName, data) {
    if (!this.eventListeners[eventName]) return;

    const timestamp = Date.now();
    const eventData = { ...data, timestamp };

    this.eventListeners[eventName].forEach((callback) => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(
          `[WorkerManager] イベントハンドラエラー(${eventName}):`,
          error
        );
      }
    });
  }

  /**
   * 処理モードを設定する
   * @param {Object} modes 各処理のモード設定
   * @returns {Promise<Object>} 現在の設定
   */
  async setProcessingModes(modes) {
    return new Promise((resolve) => {
      this.sendMessage('SET_PROCESSING_MODES', { modes }, (response) => {
        resolve(response);
      });
    });
  }

  /**
   * 終了処理
   */
  terminate() {
    // ハートビートを停止
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Workerを終了
    if (this.worker) {
      try {
        // Comlinkのクリーンアップ
        if (this.proxy) {
          this.proxy[Comlink.releaseProxy]();
          this.proxy = null;
        }

        this.worker.terminate();
        this.worker = null;
      } catch (e) {
        console.warn('[WorkerManager] Worker終了エラー:', e);
      }
    }

    // イベントリスナーとメッセージキューをクリア
    this.eventListeners = {};
    this.messageQueue = [];
    this.isReady = false;

    console.log(`[WorkerManager] 終了: ${this.workerPath}`);
  }
}
