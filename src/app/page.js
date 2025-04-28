'use client';

import styles from './page.module.css';
import { GameProvider } from '../contexts/GameContext';
import TransitionManager from '../components/TransitionManager';
import AdminController from '../components/admin/AdminController';

export default function Home() {
  return (
    <div className={styles.container}>
      <GameProvider>
        <TransitionManager />
        <AdminController />
      </GameProvider>
    </div>
  );
}
