'use client';

import React, { useEffect, useState, forwardRef } from 'react';
import styles from '../../styles/backgrounds/RetroBackground.module.css';

// forwardRefを使用してコンポーネントに参照を渡せるようにする
const RetroBackgroundOriginal = forwardRef(({ className = '' }, ref) => {
  const [dots, setDots] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsClient(true);

    // ドットデータを生成
    const colors = [
      '#FF8C00', // ダークオレンジ
      '#FFA500', // オレンジ
      '#FFD700', // ゴールデン
      '#FF4500', // 暗い赤オレンジ
      '#FF7F50', // コーラル
      '#551800', // 暗いブラウン (アクセント)
    ];

    const dotCount = 150; // ドットの数
    const newDots = [];

    for (let i = 0; i < dotCount; i++) {
      newDots.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 3 + 2, // 2px〜5px
        color: colors[Math.floor(Math.random() * colors.length)],
        animationDuration: Math.random() * 3 + 2, // 2〜5秒
        animationDelay: Math.random() * 2, // 0〜2秒
        isRound: Math.random() > 0.5, // 50%の確率で丸いドット
      });
    }

    setDots(newDots);
  }, []);

  // サーバーレンダリング時は何も表示しない
  if (!isClient) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={`${styles.retroBackground} ${className}`}
      aria-hidden="true"
    >
      {/* 暗い背景ベース */}
      <div className={styles.backgroundBase} />

      {/* ドットパターン */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          style={{
            position: 'absolute',
            left: `${dot.left}%`,
            top: `${dot.top}%`,
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            backgroundColor: dot.color,
            borderRadius: dot.isRound ? '50%' : '0',
            boxShadow: '0 0 4px currentColor',
            animation: `${styles.blink} ${dot.animationDuration}s infinite ${dot.animationDelay}s`,
          }}
        />
      ))}

      {/* グリッドオーバーレイ */}
      <div className={styles.gridOverlay} />
    </div>
  );
});

// コンポーネント名を設定
RetroBackgroundOriginal.displayName = 'RetroBackgroundOriginal';

export default RetroBackgroundOriginal;
