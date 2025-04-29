'use client';

import { useRef } from 'react';
import styles from './page.module.css';
import { GameProvider } from '../contexts/GameContext';
import TransitionManager from '../components/TransitionManager';
import AdminController from '../components/admin/AdminController';
import RetroBackground from '../components/backgrounds/RetroBackground';

export default function Home() {
  // RetroBackgroundコンポーネントへの参照を作成
  const retroBackgroundRef = useRef(null);

  return (
    <div className={styles.container}>
      {/* レトロな背景コンポーネントに参照を渡す */}
      <RetroBackground ref={retroBackgroundRef} />
      
      <GameProvider>
        {/* 管理者コントローラにbackgroundRefを渡す */}
        <TransitionManager />
        <AdminController backgroundRef={retroBackgroundRef} />
      </GameProvider>
    </div>
  );
}
