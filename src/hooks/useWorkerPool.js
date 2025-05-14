'use client';

/**
 * useWorkerPool.js
 * Web Workerを効率的に管理するためのプールシステム
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Worker実行タスクのタイプ定義
 * @typedef {Object} WorkerTask
 * @property {string} type - タスクタイプ
 * @property {any} data - 入力データ
 * @property {function} callback - タスク完了時のコールバック
 */

/**
 * Workerプールの状態タイプ
 * @typedef {Object} WorkerPoolState
 * @property {Worker[]} workers - Workerの配列
 * @property {boolean[]} busy - 各Workerのビジー状態
 * @property {WorkerTask[]} taskQueue - 実行待ちタスクキュー
 */

/**
 * Workerプール管理カスタムフック
 * @param {string} workerUrl - Workerスクリプトの場所
 * @param {number} poolSize - プールサイズ (デフォルト: CPUコア数またはフォールバックとして2)
 */
export function useWorkerPool(workerUrl, poolSize = 0) {
  // 推奨プールサイズ (CPUコア数 - 1)、最小値は1
  const recommendedSize = 
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency 
      ? Math.max(1, navigator.hardwareConcurrency - 1) 
      : 2;
  
  // 実際のプールサイズ設定
  const actualPoolSize = poolSize > 0 ? poolSize : recommendedSize;

  // プール状態を参照として保持
  const poolRef = useRef(/** @type {WorkerPoolState} */({
    workers: [],
    busy: [],
    taskQueue: []
  }));

  // プール初期化
  useEffect(() => {
    const pool = poolRef.current;
    
    // プールを初期化
    for (let i = 0; i < actualPoolSize; i++) {
      try {
        const worker = new Worker(workerUrl);
        pool.workers.push(worker);
        pool.busy.push(false);
        
        // Workerからのメッセージを処理
        worker.onmessage = (e) => {
          const { callbackId, result } = e.data;
          
          // 結果にコールバックIDが含まれている場合、対応するタスクを完了処理
          if (callbackId && pool.callbacks && pool.callbacks[callbackId]) {
            pool.callbacks[callbackId](result);
            delete pool.callbacks[callbackId];
          }
          
          // このWorkerを解放して次のタスクを実行
          const workerIndex = pool.workers.indexOf(worker);
          if (workerIndex !== -1) {
            pool.busy[workerIndex] = false;
            processNextTask();
          }
        };
        
        worker.onerror = (error) => {
          console.error(`Worker error:`, error);
          const workerIndex = pool.workers.indexOf(worker);
          if (workerIndex !== -1) {
            pool.busy[workerIndex] = false;
            processNextTask();
          }
        };
      } catch (error) {
        console.error(`Failed to create worker:`, error);
      }
    }
    
    // キューから次のタスクを処理
    const processNextTask = () => {
      if (pool.taskQueue.length === 0) return;
      
      // 空きWorkerを探す
      const availableWorkerIndex = pool.busy.findIndex(busy => !busy);
      if (availableWorkerIndex === -1) return; // 空きがなければ何もしない
      
      // タスクを取得して実行
      const task = pool.taskQueue.shift();
      const worker = pool.workers[availableWorkerIndex];
      pool.busy[availableWorkerIndex] = true;
      
      // コールバックIDの割り当て
      const callbackId = Date.now() + Math.random().toString(36).substr(2, 5);
      if (!pool.callbacks) pool.callbacks = {};
      pool.callbacks[callbackId] = task.callback;
      
      // Workerにタスクを送信
      worker.postMessage({
        type: task.type,
        data: task.data,
        callbackId
      });
    };
    
    // コールバック状態へのアクセスを保存
    poolRef.current.processNextTask = processNextTask;
    
    // クリーンアップ関数
    return () => {
      pool.workers.forEach(worker => {
        worker.terminate();
      });
      pool.workers = [];
      pool.busy = [];
      pool.taskQueue = [];
      delete pool.callbacks;
    };
  }, [workerUrl, actualPoolSize]);
  
  // タスクをプールに送信する関数
  const submitTask = useCallback((type, data, callback) => {
    const pool = poolRef.current;
    
    // タスクをキューに追加
    const task = { type, data, callback };
    pool.taskQueue.push(task);
    
    // 利用可能なWorkerがあれば処理を開始
    if (pool.processNextTask) {
      pool.processNextTask();
    }
  }, []);
  
  // 処理中タスク数を取得
  const getActiveTaskCount = useCallback(() => {
    const pool = poolRef.current;
    const busyCount = pool.busy.filter(b => b).length;
    return busyCount + pool.taskQueue.length;
  }, []);
  
  // 全タスクの完了を待機する関数
  const waitForAllTasks = useCallback(() => {
    return new Promise(resolve => {
      const checkComplete = () => {
        if (getActiveTaskCount() === 0) {
          resolve();
        } else {
          setTimeout(checkComplete, 50);
        }
      };
      checkComplete();
    });
  }, [getActiveTaskCount]);
  
  return {
    submitTask,
    getActiveTaskCount,
    waitForAllTasks
  };
}

export default useWorkerPool;
