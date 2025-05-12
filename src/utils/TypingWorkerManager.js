/**
 * TypingWorkerManager.js
 * タイピング処理を管理するクラス
 * WebWorker機能を削除し、メインスレッド処理のみに簡略化
 */

import {
  processTypingInputOnMainThread,
  getColoringInfoOnMainThread,
  getNextExpectedKeyOnMainThread,
  clearMainThreadCache
} from './TypingProcessorMain';
import ScoreCalculationWorker from './ScoreCalculationWorker';

/**
 * タイピング処理を統合的に管理するシングルトンクラス
 * WebWorker機能を削除し、メインスレッド処理のみを行う簡略化バージョン
 */
class TypingWorkerManager {
  constructor() {
    // コールバック管理
    this.callbacks = new Map();
    // 次のコールバックID
    this.nextCallbackId = 1;    // マイクロタスクキュー
    this.queue = [];
    // 処理モード設定
    this.processingMode = {
      typing: 'main-thread', // 'worker' または 'main-thread'
      effects: 'main-thread', // 'worker' または 'main-thread' 
      statistics: 'main-thread' // 'worker' または 'main-thread'
    };
    // パフォーマンスメトリクス
    this.metrics = {
      processCalls: 0,
      cacheMisses: 0,
      cacheHits: 0,
      processingTime: 0,
      lastSync: Date.now(),
      mainThreadProcessCalls: 0,
      mainThreadProcessingTime: 0,
    };
    // キャッシュ - パフォーマンス向上のため
    this.cache = {
      inputResults: new Map(), // 入力結果のキャッシュ
      coloringInfo: new Map(), // 色分け情報のキャッシュ
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

    console.log('[TypingWorkerManager] メインスレッドモードで初期化しました');
  }

  /**
   * 初期化済みかどうかを確認
   * @returns {boolean} 常にtrue（WebWorker機能なし）
   */
  isInitialized() {
    return true;
  }

  /**
   * 次に期待されるキーを取得
   * @param {Object} data 現在のテキストデータ
   * @param {Function} callback コールバック関数
   */
  getNextExpectedKey(data, callback) {
    const startTime = performance.now();
    try {
      const result = getNextExpectedKeyOnMainThread(data);

      // 即時実行
      if (callback) {
        callback(result);
      }

      // キャッシュを更新
      this.sharedState.nextExpectedKey = result.nextKey;
      this.sharedState.lastUpdateTimestamp = Date.now();

      this.metrics.mainThreadProcessCalls++;
      this.metrics.mainThreadProcessingTime += performance.now() - startTime;
    } catch (error) {
      console.error('[TypingWorkerManager] getNextExpectedKey エラー:', error);
      if (callback) {
        callback({ error: error.message, nextKey: '' });
      }
    }
  }

  /**
   * タイピング入力を処理
   * @param {Object} data 入力データ
   * @param {Function} callback コールバック関数
   */
  processTypingInput(data, callback) {
    const startTime = performance.now();
    try {
      const result = processTypingInputOnMainThread(data);

      // 即時実行
      if (callback) {
        callback(result);
      }

      this.metrics.mainThreadProcessCalls++;
      this.metrics.mainThreadProcessingTime += performance.now() - startTime;
    } catch (error) {
      console.error('[TypingWorkerManager] processTypingInput エラー:', error);
      if (callback) {
        callback({ error: error.message });
      }
    }
  }

  /**
   * 色分け情報を取得
   * @param {Object} data テキストデータ
   * @param {Function} callback コールバック関数
   */
  getColoringInfo(data, callback) {
    const startTime = performance.now();
    try {
      const result = getColoringInfoOnMainThread(data);

      // 即時実行
      if (callback) {
        callback(result);
      }

      this.metrics.mainThreadProcessCalls++;
      this.metrics.mainThreadProcessingTime += performance.now() - startTime;
    } catch (error) {
      console.error('[TypingWorkerManager] getColoringInfo エラー:', error);
      if (callback) {
        callback({ error: error.message });
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.inputResults.clear();
    this.cache.coloringInfo.clear();
    clearMainThreadCache();
    console.log('[TypingWorkerManager] キャッシュをクリアしました');
  }

  /**
   * パフォーマンスメトリクスを取得
   * @returns {Object} メトリクス
   */
  getMetrics() {
    return { ...this.metrics };
  }
  /**
   * キュー内のタスク数を取得
   * @returns {number} タスク数
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * 処理モードを設定する
   * @param {Object} modes 各処理のモード設定
   * @returns {Object} 現在の設定
   */
  setProcessingModes(modes) {
    console.log('[TypingWorkerManager] 処理モード設定:', modes);

    // 必要なプロパティのみ更新
    if (modes.typing) {
      this.processingMode.typing = 'main-thread'; // WebWorker削除のため常にmain-thread
    }
    if (modes.effects) {
      this.processingMode.effects = 'main-thread'; // WebWorker削除のため常にmain-thread
    }
    if (modes.statistics) {
      this.processingMode.statistics = 'main-thread'; // WebWorker削除のため常にmain-thread
    }

    return {
      success: true,
      currentModes: { ...this.processingMode }
    };
  }
  /**
   * すべてのリソースをクリーンアップ
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      console.log('[TypingWorkerManager] リソースクリーンアップ開始');

      // キャッシュをクリア
      this.cache.inputResults.clear();
      this.cache.coloringInfo.clear();

      // メインスレッドのキャッシュをクリア
      clearMainThreadCache();

      // ScoreCalculationWorkerをクリーンアップ
      ScoreCalculationWorker.cleanup();

      console.log('[TypingWorkerManager] リソースクリーンアップ完了');
      return { success: true };
    } catch (error) {
      console.error('[TypingWorkerManager] クリーンアップエラー:', error);
      return { success: false, error };
    }
  }

  /**
   * シングルトンインスタンスを取得
   * @returns {TypingWorkerManager} シングルトンインスタンス
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new TypingWorkerManager();
    }
    return this.instance;
  }
}

// シングルトンインスタンスをエクスポート
export default TypingWorkerManager.getInstance();
