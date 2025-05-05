'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';
import { GameProvider } from '../contexts/GameContext';
import TransitionManager from '../components/TransitionManager';
import Providers from '../components/common/Providers';
import AdminController from '../components/admin/AdminController';
import RetroBackground from '../components/backgrounds/RetroBackground';
import MCPStatusWrapper from '../components/common/MCPStatusWrapper';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  // RetroBackgroundコンポーネントへの参照を作成
  const retroBackgroundRef = useRef(null);

  // クライアント側でのみレンダリングを行うようにする
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Providers>
      <div className={styles.container}>
        {/* レトロな背景コンポーネントに参照を渡す */}
        <RetroBackground ref={retroBackgroundRef} />
        
        <GameProvider>
          {/* 管理者コントローラにbackgroundRefを渡す */}
          <TransitionManager />
          <AdminController backgroundRef={retroBackgroundRef} />
        </GameProvider>
        
        {/* MCP接続ステータス表示（右下隅に配置） */}
        <MCPStatusWrapper position="bottom-right" />
      </div>
    </Providers>
  );
}
