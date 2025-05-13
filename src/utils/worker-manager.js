// src/utils/worker-manager.js
/**
 * WorkerManagerのフェイクバージョン
 * 
 * WebWorker機能を削除し、すべての処理をメインスレッドで実行するように変更
 * インターフェースは保持して、既存コードの互換性を確保
 */
export default class WorkerManager {
  constructor(workerPath, options = {}) {
    this.workerPath = workerPath;
    this.options = options;
    this.callbacks = {};
    this.isReady = true;
    this.eventListeners = {};

    // コンソールに通知
    console.log(`[WorkerManager] メインスレッドモードで初期化: ${workerPath}`);
  }

  /**
   * 初期化（無操作、互換性のために残す）
   */
  initialize() {
    // 何もしない（すでに準備完了状態）
    this.isReady = true;

    // 準備完了イベントを発行
    this._triggerEvent('WORKER_READY', {});
  }

  /**
   * メッセージを送信（メインスレッドで直接処理）
   * @param {string} type メッセージタイプ
   * @param {Object} data データ
   * @param {Function} callback 完了コールバック
   */
  sendMessage(type, data, callback) {
    // 即時実行するためのマイクロタスクをキュー
    queueMicrotask(() => {
      try {
        // タイプに応じた処理
        const response = this._processMessage(type, data);

        // コールバックがあれば実行
        if (callback) {
          callback(response);
        }
      } catch (error) {
        console.error(`[WorkerManager] メッセージ処理エラー(${type}):`, error);
        if (callback) {
          callback({ error: error.message });
        }
      }
    });
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
      listener => listener !== callback
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

    this.eventListeners[eventName].forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error(`[WorkerManager] イベントハンドラエラー(${eventName}):`, error);
      }
    });
  }
  /**
   * メッセージを処理（ワーカー内処理の代替）
   * @param {string} type メッセージタイプ
   * @param {Object} data データ
   * @returns {Object} 処理結果
   * @private
   */
  _processMessage(type, data) {
    switch (type) {
      case 'PING':
        return { type: 'PONG', timestamp: Date.now() };

      case 'START_ANIMATION':
        // アニメーション開始イベントを発火
        this._triggerEvent('ANIMATION_FRAME', {
          keyStates: {},
          effects: [],
          animationProgress: []
        });
        return { success: true };

      case 'PROCESS_EFFECTS':
        // エフェクト処理イベントを発火
        this._triggerEvent('EFFECTS_UPDATE', {
          effects: []
        });
        return { success: true };

      // 他のメッセージタイプに応じた処理を追加
      default:
        return { error: `未知のメッセージタイプ: ${type}` };
    }
  }
  /**
   * 処理モードを設定する
   * @param {Object} modes 各処理のモード設定
   * @returns {Object} 現在の設定
   */
  setProcessingModes(modes) {
    console.log('[WorkerManager] 処理モード設定:', modes);

    // WorkerManagerでは常にメインスレッドモード
    const currentModes = {
      typing: 'main-thread',
      effects: 'main-thread',
      statistics: 'main-thread'
    };

    return {
      success: true,
      currentModes
    };
  }

  /**
   * 終了処理（無操作、互換性のために残す）
   */
  terminate() {
    // イベントリスナーをクリア
    this.eventListeners = {};
    console.log(`[WorkerManager] 終了: ${this.workerPath}`);
  }
}
