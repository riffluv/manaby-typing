'use client';

import styles from './page.module.css';
import { GameProvider } from '../contexts/GameContext';
import TransitionManager from '../components/TransitionManager';
import AdminController from '../components/admin/AdminController';
import RetroBackground from '../components/backgrounds/RetroBackground';

export default function Home() {
  return (
    <div className={styles.container}>
      {/* レトロなピクセルドット背景を追加 */}
      <RetroBackground />
      
      <GameProvider>
        <TransitionManager />
        <AdminController />
      </GameProvider>
    </div>
  );
}
