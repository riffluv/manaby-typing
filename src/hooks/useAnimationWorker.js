// src/hooks/useAnimationWorker.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WorkerManager from '../utils/worker-manager';

/**
 * アニメーションを扱うカスタムフック
 * WebWorker機能を削除し、メインスレッド処理に変更
 * 
 * @returns {Object} アニメーション関連のメソッド群
 */
export default function useAnimationWorker() {
  // ワーカーマネージャー参照（メインスレッド処理用に変更）
  const workerRef = useRef(null);
  // アニメーション状態
  const [animationState, setAnimationState] = useState({
    isRunning: false,
    nextKey: '',
    effects: [],
    keyStates: {},
    animationProgress: [],
    lastUpdate: 0
  });

  // アニメーション用のRAF ID
  const animFrameRef = useRef(null);
  // クリーンアップ用のリスナー削除関数を保持
  const cleanupCallbacks = useRef([]);

  // メインスレッド処理の初期化
  useEffect(() => {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') return;

    // ワーカーマネージャー（フェイクバージョン）を作成
    const manager = new WorkerManager('../workers/animation-worker.js');
    workerRef.current = manager;

    // 初期化（メインスレッド処理のみ）
    manager.initialize();

    return () => {
      // アニメーションフレームをキャンセル
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      // リスナーをクリーンアップ
      cleanupCallbacks.current.forEach(cleanup => cleanup());
      cleanupCallbacks.current = [];
    };
  }, []);

  /**
   * アニメーションを開始
   */
  const startAnimation = useCallback(() => {
    if (!workerRef.current || animationState.isRunning) return;

    workerRef.current.sendMessage('START_ANIMATION', {}, response => {
      if (response.success) {
        setAnimationState(prev => ({ ...prev, isRunning: true }));

        // メインスレッドでアニメーションフレームを実行
        const runAnimationFrame = () => {
          // 現在の状態を元に新しいフレームデータを作成
          const frameData = {
            keyStates: { ...animationState.keyStates },
            effects: [...animationState.effects],
            animationProgress: [...animationState.animationProgress],
            timestamp: Date.now()
          };

          // 状態を更新
          setAnimationState(prev => ({
            ...prev,
            ...frameData
          }));

          // 次のフレームを予約
          animFrameRef.current = requestAnimationFrame(runAnimationFrame);
        };

        // 初回フレーム実行
        animFrameRef.current = requestAnimationFrame(runAnimationFrame);
      }
    });
  }, [animationState.isRunning]);

  /**
   * アニメーションを停止
   */
  const stopAnimation = useCallback(() => {
    if (!workerRef.current || !animationState.isRunning) return;

    // アニメーションフレームをキャンセル
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    workerRef.current.sendMessage('STOP_ANIMATION', {}, () => {
      setAnimationState(prev => ({ ...prev, isRunning: false }));
    });
  }, [animationState.isRunning]);

  /**
   * キー入力イベントを処理
   * @param {Object} keyEventData キーイベントデータ
   */
  const processKeyEvent = useCallback((keyEventData) => {
    if (!workerRef.current) return;

    workerRef.current.sendMessage('PROCESS_KEY_EVENT', keyEventData);

    // メインスレッドで即時更新
    setAnimationState(prev => {
      const newKeyStates = { ...prev.keyStates };
      const { key, isDown } = keyEventData;

      if (isDown) {
        newKeyStates[key] = {
          pressed: true,
          timestamp: Date.now()
        };
      } else if (newKeyStates[key]) {
        newKeyStates[key].pressed = false;
      }

      return {
        ...prev,
        keyStates: newKeyStates
      };
    });
  }, []);

  /**
   * エフェクトを追加
   * @param {Object} effectData エフェクトデータ
   */
  const addEffect = useCallback((effectData) => {
    if (!workerRef.current) return;

    workerRef.current.sendMessage('ADD_EFFECT', effectData);

    // メインスレッドで即時更新
    setAnimationState(prev => {
      const newEffects = [...prev.effects, {
        ...effectData,
        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      }];

      return {
        ...prev,
        effects: newEffects
      };
    });
  }, []);

  // メソッドと状態を返す
  return {
    animationState,
    startAnimation,
    stopAnimation,
    processKeyEvent,
    addEffect,
    isRunning: animationState.isRunning
  };
}
