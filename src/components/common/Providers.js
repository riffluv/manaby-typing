'use client';

import React, { useEffect } from 'react';
import { ToastProvider } from '../../contexts/ToastContext';
import { GameProvider } from '../../contexts/GameContext';
import { SoundProvider } from '../../contexts/SoundContext';
import { initAudioSystem } from '../../utils/AudioInitializer';

/**
 * アプリケーション全体のプロバイダーをまとめて提供するラッパーコンポーネント
 * Next.jsのサーバーコンポーネントとクライアントコンポーネント間で
 * コンテキストを適切に提供するために使用します
 */
export default function Providers({ children }) {
  // アプリケーション初期化時にAudioSystemを事前初期化
  useEffect(() => {
    // AudioContextを事前初期化して体感レスポンス速度を向上
    initAudioSystem();
  }, []);

  return (
    // 最も外側にToastProviderを配置して、どのコンテキストからも通知を表示できるようにします
    <ToastProvider>
      {/* SoundProviderをGameProviderの外側に配置して、ゲーム状態に依存せずに音声設定を管理します */}
      <SoundProvider>
        <GameProvider>{children}</GameProvider>
      </SoundProvider>
    </ToastProvider>
  );
}
