'use client';

import React from 'react';
import { ToastProvider } from '../../contexts/ToastContext';
import { GameProvider } from '../../contexts/GameContext';
import { SoundProvider } from '../../contexts/SoundContext';

/**
 * アプリケーション全体のプロバイダーをまとめて提供するラッパーコンポーネント
 * Next.jsのサーバーコンポーネントとクライアントコンポーネント間で
 * コンテキストを適切に提供するために使用します
 */
export default function Providers({ children }) {
  return (
    // 最も外側にToastProviderを配置して、どのコンテキストからも通知を表示できるようにします
    <ToastProvider>
      {/* SoundProviderをGameProviderの外側に配置して、ゲーム状態に依存せずに音声設定を管理します */}
      <SoundProvider>
        <GameProvider>
          {children}
        </GameProvider>
      </SoundProvider>
    </ToastProvider>
  );
}