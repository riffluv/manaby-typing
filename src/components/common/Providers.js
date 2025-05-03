'use client';

import React from 'react';
import { ToastProvider } from '../../contexts/ToastContext';
import { GameProvider } from '../../contexts/GameContext';

/**
 * アプリケーション全体のプロバイダーをまとめて提供するラッパーコンポーネント
 * Next.jsのサーバーコンポーネントとクライアントコンポーネント間で
 * コンテキストを適切に提供するために使用します
 */
export default function Providers({ children }) {
  return (
    // GameContextの外側にToastProviderを配置して、ゲーム状態に関係なく通知を表示できるようにします
    <ToastProvider>
      <GameProvider>
        {children}
      </GameProvider>
    </ToastProvider>
  );
}