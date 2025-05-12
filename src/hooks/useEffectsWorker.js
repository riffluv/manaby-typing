// src/hooks/useEffectsWorker.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WorkerManager from '../utils/worker-manager';

/**
 * エフェクトを扱うカスタムフック
 * WebWorker機能を削除し、メインスレッド処理に変更
 * 
 * @param {Object} options - 設定オプション
 * @returns {Object} エフェクト関連のメソッド群
 */
export default function useEffectsWorker(options = {}) {
  // ワーカーマネージャー参照（メインスレッド処理用に変更）
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

  // サウンド関連の参照
  const audioContextRef = useRef(null);
  const soundBuffersRef = useRef({});
  // クリーンアップ用リスナー削除関数を保持
  const cleanupCallbacks = useRef([]);

  // メインスレッド処理の初期化
  useEffect(() => {
    // サーバーサイドでは実行しない
    if (typeof window === 'undefined') return;

    // ワーカーマネージャー（フェイクバージョン）を作成
    const manager = new WorkerManager('../workers/effects-worker.js');
    workerRef.current = manager;

    // 初期化（メインスレッド処理のみ）
    manager.initialize();

    // AudioContextの初期化（必要な場合）
    if (effectsState.config.soundEnabled && typeof AudioContext !== 'undefined') {
      try {
        audioContextRef.current = new AudioContext();
      } catch (error) {
        console.warn('[useEffectsWorker] AudioContext初期化エラー:', error);
      }
    }

    return () => {
      // AudioContextを閉じる
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }

      // リスナーをクリーンアップ
      cleanupCallbacks.current.forEach(cleanup => cleanup());
      cleanupCallbacks.current = [];
    };
  }, [effectsState.config.soundEnabled]);

  /**
   * エフェクト処理を開始
   */
  const startEffects = useCallback(() => {
    if (!workerRef.current || effectsState.isRunning) return;

    workerRef.current.sendMessage('START_EFFECTS', {
      config: effectsState.config
    }, response => {
      if (response.success) {
        setEffectsState(prev => ({ ...prev, isRunning: true }));
      }
    });
  }, [effectsState.config, effectsState.isRunning]);

  /**
   * エフェクト処理を停止
   */
  const stopEffects = useCallback(() => {
    if (!workerRef.current || !effectsState.isRunning) return;

    workerRef.current.sendMessage('STOP_EFFECTS', {}, () => {
      setEffectsState(prev => ({ ...prev, isRunning: false }));
    });
  }, [effectsState.isRunning]);

  /**
   * キー入力イベントを処理
   * @param {Object} keyEventData キーイベントデータ
   */
  const processKeyEvent = useCallback((keyEventData) => {
    if (!workerRef.current || !effectsState.isRunning) return;

    workerRef.current.sendMessage('PROCESS_KEY_EVENT', keyEventData);

    // サウンドを再生（メインスレッドで即時実行）
    if (effectsState.config.soundEnabled && keyEventData.isDown) {
      _playKeySound(keyEventData.key);
    }
  }, [effectsState.config.soundEnabled, effectsState.isRunning]);

  /**
   * エフェクトを追加
   * @param {Object} effectData エフェクトデータ
   */
  const addEffect = useCallback((effectData) => {
    if (!workerRef.current || !effectsState.isRunning) return;

    workerRef.current.sendMessage('ADD_EFFECT', effectData);

    // メインスレッドで即時更新
    setEffectsState(prev => {
      const newEffects = [...prev.effects, {
        ...effectData,
        id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      }];

      return {
        ...prev,
        effects: newEffects,
        lastUpdate: Date.now()
      };
    });

    // サウンドエフェクトがある場合は再生
    if (effectData.sound && effectsState.config.soundEnabled) {
      _playEffectSound(effectData.sound);
    }
  }, [effectsState.config.soundEnabled, effectsState.isRunning]);

  /**
   * 設定を更新
   * @param {Object} newConfig 新しい設定
   */
  const updateConfig = useCallback((newConfig) => {
    setEffectsState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        ...newConfig
      }
    }));

    if (workerRef.current) {
      workerRef.current.sendMessage('UPDATE_CONFIG', {
        config: {
          ...effectsState.config,
          ...newConfig
        }
      });
    }
  }, [effectsState.config]);

  /**
   * キーサウンドを再生（内部実装）
   * @param {string} key キー
   * @private
   */
  const _playKeySound = (key) => {
    // サウンド再生処理（シンプルな実装）
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440 + Math.random() * 100, audioContextRef.current.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.1);
    } catch (error) {
      console.warn('[useEffectsWorker] サウンド再生エラー:', error);
    }
  };

  /**
   * エフェクトサウンドを再生（内部実装）
   * @param {string} soundType サウンドタイプ
   * @private
   */
  const _playEffectSound = (soundType) => {
    // 簡易サウンド再生処理
    if (!audioContextRef.current) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      switch (soundType) {
        case 'success':
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioContextRef.current.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(440, audioContextRef.current.currentTime + 0.2);
          gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.2);
          break;

        case 'error':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(220, audioContextRef.current.currentTime);
          gainNode.gain.setValueAtTime(0.15, audioContextRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.3);
          break;

        default:
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(600, audioContextRef.current.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.1);
      }

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.3);
    } catch (error) {
      console.warn('[useEffectsWorker] エフェクトサウンド再生エラー:', error);
    }
  };

  // メソッドと状態を返す
  return {
    effects: effectsState.effects,
    isRunning: effectsState.isRunning,
    config: effectsState.config,
    startEffects,
    stopEffects,
    processKeyEvent,
    addEffect,
    updateConfig
  };
}
