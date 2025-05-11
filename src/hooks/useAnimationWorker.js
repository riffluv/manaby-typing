// src/hooks/useAnimationWorker.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WorkerManager from '../utils/worker-manager';

/**
 * アニメーションワーカーを扱うカスタムフック
 * 
 * @returns {Object} アニメーションワーカーとの通信用のメソッド群
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
    lastUpdate: 0
  });

  // クリーンアップ用のリスナー削除関数を保持
  const cleanupCallbacks = useRef([]);

  // ワーカー初期化
  useEffect(() => {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') return;

    // ワーカーマネージャーを作成
    const manager = new WorkerManager('../workers/animation-worker.js');
    workerRef.current = manager;

    // ワーカー初期化
    manager.initialize();

    // アニメーションフレームイベントのリスナー
    const removeFrameListener = manager.addEventListener('ANIMATION_FRAME', (data) => {
      setAnimationState(prev => ({
        ...prev,
        keyStates: data.keyStates || {},
        effects: data.effects || [],
        animationProgress: data.animationProgress || [],
        lastUpdate: data.timestamp
      }));
    });

    // ワーカー起動イベントのリスナー
    const removeStartListener = manager.addEventListener('WORKER_STARTED', () => {
      setAnimationState(prev => ({ ...prev, isRunning: true }));
    });

    // ワーカー停止イベントのリスナー
    const removeStopListener = manager.addEventListener('WORKER_STOPPED', () => {
      setAnimationState(prev => ({ ...prev, isRunning: false }));
    });

    // クリーンアップ関数を保存
    cleanupCallbacks.current = [
      removeFrameListener,
      removeStartListener,
      removeStopListener
    ];

    // 初期設定を送信
    manager.postMessage({
      type: 'INIT',
      data: {
        frameRate: 30,
        isRunning: false
      }
    });

    // クリーンアップ
    return () => {
      cleanupCallbacks.current.forEach(cleanup => cleanup());
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  /**
   * アニメーション開始
   */
  const startAnimation = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'START' });
  }, []);

  /**
   * アニメーション停止
   */
  const stopAnimation = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'STOP' });
  }, []);

  /**
   * キー押下イベント
   */
  const handleKeyPress = useCallback((key, isError = false) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'KEY_PRESS',
      data: { key, isError }
    });
  }, []);

  /**
   * 次に入力するキーを設定
   */
  const setNextKey = useCallback((key) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'SET_NEXT_KEY',
      data: { key }
    });
    setAnimationState(prev => ({ ...prev, nextKey: key }));
  }, []);

  /**
   * エフェクトを追加
   */
  const addEffect = useCallback((effectData) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'ADD_EFFECT',
      data: effectData
    });
  }, []);

  /**
   * アニメーションを追加
   */
  const addAnimation = useCallback((animationData) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'ADD_ANIMATION',
      data: animationData
    });
  }, []);

  /**
   * フレームレートを設定
   */
  const setFrameRate = useCallback((frameRate) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'SET_FRAME_RATE',
      data: { frameRate }
    });
  }, []);

  return {
    animationState,
    startAnimation,
    stopAnimation,
    handleKeyPress,
    setNextKey,
    addEffect,
    addAnimation,
    setFrameRate,
    isReady: !!workerRef.current
  };
}
