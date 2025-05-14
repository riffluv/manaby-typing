'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './FancyKeyboard.module.css';

/**
 * ファンシーキーボードコンポーネント
 * アニメーションとエフェクトがついた視覚的に魅力的なキーボード
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.nextKey - 次に入力すべきキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} props.isError - エラー状態かどうか
 * @param {string} props.className - スタイリングのためのクラス名
 * @returns {React.ReactElement}
 */
const FancyKeyboard = ({
  nextKey = '',
  lastPressedKey = '',
  isError = false,
  className = '',
}) => {
  const canvasRef = useRef(null);
  const [keys, setKeys] = useState([]);
  const animationRef = useRef(null);

  // キーボードのキー配列を初期化
  useEffect(() => {
    const keyRows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ];

    const initialKeys = keyRows.flatMap((row, rowIndex) => {
      return row.map((key, colIndex) => ({
        key,
        x: colIndex * 60 + rowIndex * 30,
        y: rowIndex * 70,
        width: 50,
        height: 50,
        highlight: key === nextKey,
        pressed: key === lastPressedKey,
        error: isError && key === lastPressedKey,
        animation: 0,
      }));
    });

    setKeys(initialKeys);
  }, []);

  // キー表示の更新
  useEffect(() => {
    setKeys((prevKeys) =>
      prevKeys.map((keyObj) => ({
        ...keyObj,
        highlight: keyObj.key === nextKey,
        pressed: keyObj.key === lastPressedKey,
        error: isError && keyObj.key === lastPressedKey,
        animation: keyObj.key === lastPressedKey ? 1 : keyObj.animation,
      }))
    );
  }, [nextKey, lastPressedKey, isError]);

  // アニメーションと描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 背景エフェクト - 格子パターン
      ctx.strokeStyle = '#3a4a6a22';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      for (let i = 0; i < height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // キーの描画
      setKeys((prevKeys) =>
        prevKeys.map((keyObj) => {
          // アニメーション値の減衰
          let animation = keyObj.animation > 0.01 ? keyObj.animation * 0.95 : 0;

          // キーの描画
          const x = keyObj.x;
          const y = keyObj.y;
          const width = keyObj.width;
          const height = keyObj.height;

          // キーの背景
          ctx.fillStyle = keyObj.highlight
            ? '#5e8bff'
            : keyObj.error
            ? '#ff5e5e'
            : '#2a3a5a';

          if (animation > 0) {
            ctx.shadowColor = keyObj.error ? '#ff0000' : '#5e8bff';
            ctx.shadowBlur = animation * 20;
          } else {
            ctx.shadowBlur = 0;
          }

          const offsetY = keyObj.pressed ? 3 : 0;

          // キーキャップ
          ctx.beginPath();
          ctx.roundRect(x, y + offsetY, width, height, 10);
          ctx.fill();

          // キーキャップのハイライト
          const gradient = ctx.createLinearGradient(x, y, x, y + height);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y + offsetY, width, height / 2, 10);
          ctx.fill();

          // キーラベル
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            keyObj.key.toUpperCase(),
            x + width / 2,
            y + height / 2 + offsetY
          );

          // アニメーションエフェクト
          if (animation > 0) {
            ctx.strokeStyle = keyObj.error ? '#ff0000' : '#5e8bff';
            ctx.lineWidth = animation * 3;
            ctx.beginPath();
            ctx.roundRect(
              x - animation * 10,
              y - animation * 10 + offsetY,
              width + animation * 20,
              height + animation * 20,
              10
            );
            ctx.stroke();
          }

          return { ...keyObj, animation };
        })
      );

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className={`${styles.fancyKeyboard} ${className}`}>
      <canvas
        ref={canvasRef}
        width={700}
        height={220}
        className={styles.keyboardCanvas}
      />
    </div>
  );
};

export default FancyKeyboard;
