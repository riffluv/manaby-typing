// src/hooks/useEffectsWorker.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WorkerManager from '../utils/worker-manager';

/**
 * エフェクトワーカーを扱うカスタムフック
 * キー入力エフェクトや音声を処理します
 * 
 * @param {Object} options - 設定オプション
 * @returns {Object} エフェクト関連のメソッド群
 */
export default function useEffectsWorker(options = {}) {
  // ワーカーマネージャー参照
  const workerRef = useRef(null);

  // エフェクト状態
  const [effectsState, setEffectsState] = useState({
    isRunning: false,
    effects: [],
    lastUpdate: 0,
    config: {
      soundEnabled: true,
      visualEffectsEnabled: true,
      ...options
    }
  });

  // クリーンアップ用リスナー削除関数を保持
  const cleanupCallbacks = useRef([]);

  // ワーカー初期化
  useEffect(() => {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') return;

    // ワーカーマネージャーを作成
    const manager = new WorkerManager('../workers/effects-worker.js');
    workerRef.current = manager;

    // ワーカー初期化
    manager.initialize();

    // エフェクト更新イベントのリスナー
    const removeUpdateListener = manager.addEventListener('EFFECTS_UPDATE', (data) => {
      setEffectsState(prev => ({
        ...prev,
        effects: data.effects || [],
        lastUpdate: data.timestamp
      }));
    });

    // 音声再生リクエストのリスナー
    const removePlaySoundListener = manager.addEventListener('PLAY_SOUND', (data) => {
      // ここで実際の音声再生イベントをトリガー
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('typingSound', {
          detail: data.sound
        }));
      }
    });

    // ワーカー起動イベントのリスナー
    const removeStartListener = manager.addEventListener('WORKER_STARTED', () => {
      setEffectsState(prev => ({ ...prev, isRunning: true }));
    });

    // ワーカー停止イベントのリスナー
    const removeStopListener = manager.addEventListener('WORKER_STOPPED', () => {
      setEffectsState(prev => ({ ...prev, isRunning: false }));
    });

    // クリーンアップ関数を保存
    cleanupCallbacks.current = [
      removeUpdateListener,
      removePlaySoundListener,
      removeStartListener,
      removeStopListener
    ];

    // 初期設定を送信
    manager.postMessage({
      type: 'INIT',
      data: {
        soundEnabled: effectsState.config.soundEnabled,
        visualEffectsEnabled: effectsState.config.visualEffectsEnabled
      }
    });

    return () => {
      cleanupCallbacks.current.forEach(cleanup => cleanup());
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [effectsState.config.soundEnabled, effectsState.config.visualEffectsEnabled]);

  // エフェクト処理開始
  const startEffects = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'START' });
  }, []);

  // エフェクト処理停止
  const stopEffects = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'STOP' });
  }, []);

  // エフェクト追加
  const addEffect = useCallback((effectData) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'ADD_EFFECT',
      data: {
        ...effectData,
        timestamp: Date.now()
      }
    });
  }, []);

  // キー効果の追加
  const addKeyEffect = useCallback((key, isError = false) => {
    if (!workerRef.current) return;

    addEffect({
      type: 'key',
      key,
      isError,
      duration: 300
    });
  }, [addEffect]);

  // 音声再生
  const playSound = useCallback((soundType, options = {}) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'PLAY_SOUND',
      data: {
        type: soundType,
        options
      }
    });
  }, []);

  // 設定変更
  const setConfig = useCallback((config) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: 'SET_CONFIG',
      data: config
    });

    setEffectsState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        ...config
      }
    }));
  }, []);

  return {
    effectsState,
    startEffects,
    stopEffects,
    addEffect,
    addKeyEffect,
    playSound,
    setConfig,
    isReady: !!workerRef.current
  };
}
