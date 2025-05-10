'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/typing/OffscreenEffects.module.css';

/**
 * Offscreen Canvas を使用したエフェクト描画コンポーネント
 * 
 * UIスレッドからバックグラウンドスレッドに描画処理を移動することで
 * パフォーマンスを向上させるコンポーネント
 */
const OffscreenEffects = ({
  enabled = true,
  className = '',
  onEffectSpawned = null,
  fps = 60,
}) => {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Offscreen Canvasのサポート確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Offscreen Canvasのサポートチェック
      const supported =
        'OffscreenCanvas' in window &&
        'transferControlToOffscreen' in document.createElement('canvas');

      setIsSupported(supported);

      if (!supported) {
        console.warn('[OffscreenEffects] お使いのブラウザはOffscreen Canvasに対応していません');
      }
    }
  }, []);

  // キャンバスサイズの設定
  useEffect(() => {
    if (!canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      setCanvasSize({
        width: rect.width,
        height: rect.height
      });
    };

    // 初期サイズ設定
    updateCanvasSize();

    // リサイズイベントリスナー
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Workerの初期化とOffscreen Canvasのセットアップ
  useEffect(() => {
    if (!isSupported || !enabled || !canvasRef.current || canvasSize.width === 0) return;

    // Workerの作成
    const worker = new Worker(new URL('../../workers/canvas-worker.js', import.meta.url));
    workerRef.current = worker;

    // Canvasの転送
    const canvas = canvasRef.current;
    const offscreen = canvas.transferControlToOffscreen();

    // Workerにキャンバスを渡す
    worker.postMessage({
      type: 'init',
      data: { canvas: offscreen }
    }, [offscreen]);

    // メッセージハンドラ
    worker.onmessage = (event) => {
      const { type } = event.data;

      switch (type) {
        case 'initialized':
          // 初期化完了後にアニメーション開始
          worker.postMessage({ type: 'start' });
          setIsActive(true);
          break;

        case 'started':
          setIsActive(true);
          break;

        case 'stopped':
          setIsActive(false);
          break;

        case 'spawned':
          if (onEffectSpawned) {
            onEffectSpawned();
          }
          break;
      }
    };

    // FPSの設定
    worker.postMessage({
      type: 'fps',
      data: { fps }
    });    return () => {
      // クリーンアップ - メッセージチャネルが閉じられたエラーを防ぐための改善
      if (workerRef.current) {
        try {
          // 最後のメッセージ送信を試みる前にエラーハンドラーを追加
          const errorHandler = () => {
            console.warn('[OffscreenEffects] Worker通信エラー - 既に終了している可能性があります');
          };
          workerRef.current.onerror = errorHandler;
          
          // 安全にメッセージ送信を試みる
          try {
            workerRef.current.postMessage({ type: 'stop' });
          } catch (err) {
            console.warn('[OffscreenEffects] 終了メッセージの送信に失敗しました:', err);
          }
          
          // 最終的にWorkerを終了
          workerRef.current.terminate();
          workerRef.current = null;
        } catch (err) {
          console.error('[OffscreenEffects] Workerのクリーンアップ中にエラーが発生しました:', err);
        }
      }
    };
  }, [isSupported, enabled, canvasSize, fps, onEffectSpawned]);

  // キャンバスサイズの変更通知
  useEffect(() => {
    if (!workerRef.current || canvasSize.width === 0) return;

    workerRef.current.postMessage({
      type: 'resize',
      data: {
        width: canvasSize.width,
        height: canvasSize.height
      }
    });
  }, [canvasSize]);

  // エフェクト発生API（外部から呼び出し可能）
  const spawnEffect = (x, y) => {
    if (!workerRef.current || !isActive) return;

    workerRef.current.postMessage({
      type: 'spawn',
      data: { x, y }
    });

    return true;
  };

  // Offscreenをサポートしていない場合のフォールバック
  if (!isSupported && enabled) {
    return (
      <div className={`${styles.fallback} ${className}`}>
        <p>お使いのブラウザはOffscreen Canvasに対応していません。</p>
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${className}`}
        width={canvasSize.width || 300}
        height={canvasSize.height || 150}
        data-active={isActive}
      />
      {React.Children.map(React.Children.toArray(React.createElement('div', {
        className: styles.effectsAPI,
        onClick: (e) => {
          // クリック位置でエフェクト発生
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          spawnEffect(x, y);
        }
      })), child =>
        React.cloneElement(child, { spawnEffect })
      )}
    </>
  );
};

export default OffscreenEffects;