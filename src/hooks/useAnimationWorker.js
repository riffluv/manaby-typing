// src/hooks/useAnimationWorker.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WorkerManager from '../utils/worker-manager';

/**
 * アニメーションを扱うカスタムフック
 * WebWorkerでアニメーション計算処理を行う実装
 *
 * @returns {Object} アニメーション関連のメソッド群
 */
export default function useAnimationWorker() {
  // ワーカーマネージャー参照
  const workerRef = useRef(null);
  // アニメーション状態
  const [animationState, setAnimationState] = useState({
    isRunning: false,
    nextKey: '',
    effects: [],
    keyStates: {},
    animationProgress: [],
    lastUpdate: 0,
  });

  // クリーンアップ用のリスナー削除関数を保持
  const cleanupCallbacks = useRef([]);

  // WebWorker初期化
  useEffect(() => {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') return;

    // Workerパスの設定 - Next.jsの公開ディレクトリからの相対パス
    const workerPath = '/workers/animation-worker.js';

    // ワーカーマネージャーを作成
    const manager = new WorkerManager(workerPath);
    workerRef.current = manager;

    // Workerのイベントリスナーを設定
    const animationFrameListener = (frameData) => {
      setAnimationState((prev) => ({
        ...prev,
        keyStates: frameData.keyStates || prev.keyStates,
        effects: frameData.effects || prev.effects,
        animationProgress:
          frameData.animationProgress || prev.animationProgress,
        lastUpdate: frameData.timestamp || Date.now(),
      }));
    };

    // アニメーションフレームイベントをリッスン
    const removeAnimationListener = manager.addEventListener(
      'ANIMATION_FRAME',
      animationFrameListener
    );

    // クリーンアップ用に保存
    cleanupCallbacks.current.push(removeAnimationListener);

    // 初期化
    manager.initialize();

    return () => {
      // リスナーをクリーンアップ
      cleanupCallbacks.current.forEach((cleanup) => cleanup());
      cleanupCallbacks.current = [];

      // Workerを終了
      if (manager) {
        manager.terminate();
      }
    };
  }, []);

  /**
   * アニメーションを開始
   */
  const startAnimation = useCallback(() => {
    if (!workerRef.current || animationState.isRunning) return;

    workerRef.current.sendMessage('START_ANIMATION', {}, (response) => {
      if (response.success) {
        setAnimationState((prev) => ({ ...prev, isRunning: true }));
      }
    });
  }, [animationState.isRunning]);

  /**
   * アニメーションを停止
   */
  const stopAnimation = useCallback(() => {
    if (!workerRef.current || !animationState.isRunning) return;

    workerRef.current.sendMessage('STOP_ANIMATION', {}, (response) => {
      if (response.success) {
        setAnimationState((prev) => ({ ...prev, isRunning: false }));
      }
    });
  }, [animationState.isRunning]);

  /**
   * キー入力イベントを処理
   * @param {Object} keyEventData キーイベントデータ
   */
  const processKeyEvent = useCallback((keyEventData) => {
    if (!workerRef.current) return;

    // メインスレッドでの即時フィードバックのために状態を更新
    // これはUIの応答性を確保するための対応
    setAnimationState((prev) => {
      const newKeyStates = { ...prev.keyStates };
      const { key, type } = keyEventData;
      const isDown = type === 'keydown';

      if (isDown) {
        newKeyStates[key] = {
          pressed: true,
          timestamp: Date.now(),
        };
      } else if (newKeyStates[key]) {
        newKeyStates[key].pressed = false;
      }

      return {
        ...prev,
        keyStates: newKeyStates,
      };
    });

    // 詳細な計算処理はWorkerに送信
    workerRef.current.sendMessage('PROCESS_KEY_EVENT', keyEventData);
  }, []);

  /**
   * エフェクトを追加
   * @param {Object} effectData エフェクトデータ
   */
  const addEffect = useCallback((effectData) => {
    if (!workerRef.current) return;

    workerRef.current.sendMessage('ADD_EFFECT', effectData);
  }, []);

  /**
   * アニメーション設定を更新
   * @param {Object} config 設定オブジェクト
   */
  const updateConfig = useCallback((config) => {
    if (!workerRef.current) return;

    workerRef.current.sendMessage('UPDATE_CONFIG', { config });
  }, []);

  // メソッドと状態を返す
  return {
    animationState,
    startAnimation,
    stopAnimation,
    processKeyEvent,
    addEffect,
    updateConfig,
    isRunning: animationState.isRunning,
  };
}
