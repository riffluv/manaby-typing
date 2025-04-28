'use client';

import React from 'react';
import styles from '../styles/SettingsScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';

// 簡素化した設定画面コンポーネント - モーダルバージョンを優先して使用
const SettingsScreen = () => {
  const { navigateTo } = useGameContext();

  // メインメニューに戻る
  const handleBackToMainMenu = () => {
    soundSystem.playSound('Button');
    navigateTo(SCREENS.MAIN_MENU);
  };

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h2 className={styles.settingsTitle}>設定</h2>
      </div>

      <div className={styles.settingsContent}>
        <div className={styles.settingsNote}>
          設定はメインメニューから行ってください。
        </div>
      </div>

      <div className={styles.settingsFooter}>
        <button className={styles.backButton} onClick={handleBackToMainMenu}>
          メインメニューに戻る
        </button>
      </div>
    </div>
  );
};

export default SettingsScreen;
