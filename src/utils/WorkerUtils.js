/**
 * WorkerUtils.js
 * WebWorkerを簡単に使用するためのユーティリティ
 * Next.jsでWebWorkerを問題なく使うための仕組みを提供
 * 
 * Comlink（https://github.com/GoogleChromeLabs/comlink）をベースにした実装
 * 2025年5月12日作成
 */

import * as Comlink from 'comlink';

/**
 * Worker利用可能性チェック
 * @returns {boolean} Workerが利用可能かどうか
 */
export const isWorkerAvailable = () => {
  try {
    return typeof Worker !== 'undefined' &&
      typeof window !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function';
  } catch (e) {
    console.warn('Worker API利用可能性チェックエラー:', e);
    return false;
  }
};

/**
 * ユニークIDを生成
 * @returns {string} ランダムなID
 */
const generateId = () => Math.random().toString(36).substring(2, 15);

/**
 * 単一のワーカーインスタンス管理クラス
 */
class WorkerInstance {
  constructor(workerCode, options = {}) {
    this.id = generateId();
    this.active = false;
    this.options = options;
    this.workerCode = workerCode;
    this.worker = null;
    this.proxy = null;
    this.fallback = options.fallback || null;
    this.terminated = false;
  }

  /**
   * Workerを初期化
   */
  initialize() {
    // すでに初期化済みなら何もしない
    if (this.worker || this.terminated) return this;

    try {
      if (!isWorkerAvailable()) {
        console.warn(`Worker API利用不可: フォールバック関数を使用します (${this.id})`);
        return this;
      }

      // ワーカーコードをBlobとしてラップ
      const blob = new Blob([this.workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      // Workerインスタンスを作成
      this.worker = new Worker(workerUrl, this.options);

      // Comlinkを使ってプロキシを作成
      this.proxy = Comlink.wrap(this.worker);
      this.active = true;

      // 使い終わったURLオブジェクトをリリース
      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.error('Worker初期化エラー:', error);
      this.close();
    }

    return this;
  }

  /**
   * Workerを終了
   */
  close() {
    try {
      if (this.worker) {
        this.worker.terminate();
      }
      if (this.proxy) {
        // Comlinkプロキシのリリース
        this.proxy[Comlink.releaseProxy]();
      }
    } catch (e) {
      console.warn('Worker終了エラー:', e);
    }

    this.worker = null;
    this.proxy = null;
    this.active = false;
    this.terminated = true;
  }

  /**
   * Workerメソッドを呼び出す
   * @param {string} methodName メソッド名
   * @param {Array} args 引数
   * @returns {Promise<any>} 実行結果
   */
  async call(methodName, ...args) {
    // 初期化されていない場合は初期化
    if (!this.worker && !this.terminated) {
      this.initialize();
    }

    // Workerが使えないまたは初期化に失敗した場合はフォールバック
    if (!this.active) {
      if (this.fallback && typeof this.fallback[methodName] === 'function') {
        return this.fallback[methodName](...args);
      }
      throw new Error(`Worker使用不可: ${methodName}のフォールバック実装がありません`);
    }

    try {
      // Comlinkを使用して関数を呼び出す
      return await this.proxy[methodName](...args);
    } catch (error) {
      console.error(`Worker実行エラー (${methodName}):`, error);

      // エラー発生時にフォールバックを試みる
      if (this.fallback && typeof this.fallback[methodName] === 'function') {
        console.warn(`Worker実行失敗: フォールバック関数を使用します (${methodName})`);
        return this.fallback[methodName](...args);
      }

      throw error;
    }
  }
}

/**
 * Worker管理クラス
 */
export class WorkerManager {
  constructor() {
    this.workers = new Map();

    // 自動クリーンアップ
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.closeAll());
    }
  }

  /**
   * ワーカーを作成または取得
   * @param {string} workerCode Workerのコード
   * @param {Object} options オプション
   * @returns {WorkerInstance} Workerインスタンス
   */
  createWorker(workerCode, options = {}) {
    const instance = new WorkerInstance(workerCode, options);
    this.workers.set(instance.id, instance);
    return instance;
  }

  /**
   * 指定されたWorkerを終了
   * @param {string} id WorkerのID
   */
  closeWorker(id) {
    const worker = this.workers.get(id);
    if (worker) {
      worker.close();
      this.workers.delete(id);
    }
  }

  /**
   * すべてのWorkerを終了
   */
  closeAll() {
    for (const [id, worker] of this.workers.entries()) {
      worker.close();
      this.workers.delete(id);
    }
  }
}

// シングルトンインスタンス
const workerManager = new WorkerManager();
export default workerManager;

/**
 * インラインWorkerを作成する関数
 * @param {Function} workerFunction Worker内で実行する関数
 * @param {Object} fallbackImpl フォールバック実装
 * @param {Object} options Workerオプション
 * @returns {Object} WorkerインスタンスとcallMethodnameヘルパー
 */
export function createInlineWorker(workerFunction, fallbackImpl = null, options = {}) {
  // WorkerコードをテンプレートリテラルでラップしてExport
  const workerCode = `
    importScripts('https://unpkg.com/comlink/dist/umd/comlink.js');
    
    // Worker内で実行する関数
    const workerFunction = ${workerFunction.toString()};
    
    // Comlinkを使用して関数をエクスポート
    self.onmessage = function(e) {
      Comlink.expose(workerFunction(), self);
    };
    
    // 即時実行
    self.postMessage(null);
  `;

  // WorkerManager経由でWorkerインスタンスを作成
  const workerInstance = workerManager.createWorker(workerCode, {
    ...options,
    fallback: fallbackImpl
  });

  // 初期化
  workerInstance.initialize();

  // メソッド呼び出しヘルパー関数を作成
  const callHelper = {};

  if (fallbackImpl) {
    // フォールバック実装を参照してメソッドを自動生成
    Object.keys(fallbackImpl).forEach(methodName => {
      if (typeof fallbackImpl[methodName] === 'function') {
        callHelper[methodName] = async (...args) => {
          return workerInstance.call(methodName, ...args);
        };
      }
    });
  }

  return {
    instance: workerInstance,
    callMethod: async (methodName, ...args) => workerInstance.call(methodName, ...args),
    ...callHelper
  };
}
