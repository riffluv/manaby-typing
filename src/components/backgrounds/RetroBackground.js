'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import StarfieldBackground from './StarfieldBackground';
import RetroBackgroundOriginal from './RetroBackgroundOriginal';

/**
 * RetroBackgroundコンポーネント
 * 設定に応じて、StarfieldBackgroundかRetroBackgroundOriginalを表示
 *
 * @param {Object} props コンポーネントのプロップス
 * @param {string} props.className 追加のCSSクラス
 * @param {React.Ref} ref 親から渡される参照
 */
const RetroBackground = forwardRef(({ className = '' }, ref) => {
  // どちらの背景を使うかを設定するフラグ
  // true: 新しい3Dスターフィールド背景を使用
  // false: 元のドット背景を使用
  const USE_STARFIELD = false;

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    console.log(
      `[RetroBackground] 背景タイプ: ${
        USE_STARFIELD ? 'スターフィールド背景' : 'オリジナルのドット背景'
      }`
    );
  }, []);

  if (!isClient) return null;
  // フラグに基づいて背景を切り替え
  return USE_STARFIELD ? (
    <StarfieldBackground ref={ref} className={className} />
  ) : (
    <RetroBackgroundOriginal ref={ref} className={className} />
  );
});

// コンポーネント名を設定
RetroBackground.displayName = 'RetroBackground';

export default RetroBackground;
