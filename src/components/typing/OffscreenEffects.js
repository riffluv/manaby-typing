'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/typing/OffscreenEffects.module.css';

/**
 * キャンバスエフェクト描画コンポーネント
 * WebWorker機能を削除し、メインスレッド描画に修正
 */
const OffscreenEffects = ({
  enabled = true,
  className = '',
  onEffectSpawned = null,
  fps = 60,
}) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const frameRequestRef = useRef(null);
  const effectsRef = useRef([]);
  const lastFrameTimeRef = useRef(0);
  const frameIntervalRef = useRef(1000 / fps);

  // キャンバスサイズの設定
  useEffect(() => {
    if (!canvasRef.current) return;

    const updateCanvasSize = () => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // キャンバスサイズを設定
      canvasRef.current.width = width;
      canvasRef.current.height = height;

      setCanvasSize({ width, height });
    };

    // 初期サイズ設定
    updateCanvasSize();

    // リサイズイベントリスナー
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // メインスレッドでのキャンバス描画処理
  useEffect(() => {
    if (!enabled || !canvasRef.current || canvasSize.width === 0) return;

    // コンテキストを取得
    const context = canvasRef.current.getContext('2d');
    contextRef.current = context;

    // アニメーションフレームレンダリング
    const renderFrame = (timestamp) => {
      if (!contextRef.current || !canvasRef.current) return;

      const elapsed = timestamp - lastFrameTimeRef.current;

      // フレームレート制御
      if (elapsed >= frameIntervalRef.current) {
        lastFrameTimeRef.current = timestamp;

        // キャンバスクリア
        contextRef.current.clearRect(0, 0, canvasSize.width, canvasSize.height);

        // エフェクト描画
        effectsRef.current = effectsRef.current.filter(effect => {
          // 期限切れのエフェクトを除去
          const lifetime = effect.lifetime || 1000;
          const age = timestamp - effect.createdAt;
          if (age > lifetime) return false;

          // エフェクト描画
          drawEffect(contextRef.current, effect, age / lifetime, canvasSize);
          return true;
        });
      }

      // 次のフレームをリクエスト
      frameRequestRef.current = requestAnimationFrame(renderFrame);
    };

    // アニメーション開始
    lastFrameTimeRef.current = performance.now();
    frameRequestRef.current = requestAnimationFrame(renderFrame);
    setIsActive(true);

    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
        frameRequestRef.current = null;
      }
      setIsActive(false);
    };
  }, [enabled, canvasSize]);

  /**
   * エフェクト追加メソッド
   * @param {Object} effectData エフェクトデータ
   */
  const addEffect = (effectData) => {
    const newEffect = {
      ...effectData,
      createdAt: performance.now(),
      id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    effectsRef.current = [...effectsRef.current, newEffect];

    if (onEffectSpawned) {
      onEffectSpawned(newEffect);
    }
  };

  /**
   * エフェクト描画関数（内部実装）
   * @param {CanvasRenderingContext2D} ctx キャンバスコンテキスト
   * @param {Object} effect エフェクト
   * @param {number} progress 進行度（0～1）
   * @param {Object} size キャンバスサイズ
   */
  const drawEffect = (ctx, effect, progress, size) => {
    const { type, x, y, color = '#4a90e2', size: effectSize = 20 } = effect;

    // x, yが相対座標の場合は絶対座標に変換
    const absoluteX = typeof x === 'string' && x.endsWith('%')
      ? (parseFloat(x) / 100) * size.width
      : parseFloat(x);

    const absoluteY = typeof y === 'string' && y.endsWith('%')
      ? (parseFloat(y) / 100) * size.height
      : parseFloat(y);

    // エフェクトタイプに応じた描画
    ctx.save();

    // アルファ設定（フェードアウト）
    ctx.globalAlpha = 1 - progress;

    switch (type) {
      case 'ripple':
        // 波紋エフェクト
        const radius = effectSize * (0.2 + progress * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(absoluteX, absoluteY, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'particle':
        // パーティクルエフェクト
        const pSize = effectSize * (1 - progress * 0.5);
        ctx.fillStyle = color;

        // 複数のパーティクル
        for (let i = 0; i < 5; i++) {
          const angle = Math.PI * 2 * (i / 5);
          const distance = effectSize * progress * 2;
          const px = absoluteX + Math.cos(angle) * distance;
          const py = absoluteY + Math.sin(angle) * distance;

          ctx.beginPath();
          ctx.arc(px, py, pSize / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'text':
        // テキストエフェクト
        const { text = '✓' } = effect;
        const fontSize = effectSize * (1 + progress * 0.5);

        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Y位置を上に移動させる（上昇アニメーション）
        const offsetY = -progress * effectSize;
        ctx.fillText(text, absoluteX, absoluteY + offsetY);
        break;

      default:
        // デフォルトのエフェクト（単純な円）
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(absoluteX, absoluteY, effectSize * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  };

  // Public APIを公開
  React.useImperativeHandle(
    ref,
    () => ({
      addEffect,
      isActive: () => isActive
    }),
    [isActive]
  );

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.effectsCanvas} ${className}`}
      data-active={isActive}
    />
  );
};

export default React.forwardRef(OffscreenEffects);