'use client';

import React from 'react';
import styles from '../styles/CreditsScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import CreditsContent from './common/CreditsContent'; // 共通クレジットコンポーネント
import { creditsData } from '../utils/CreditsData'; // クレジットデータ

const CreditsScreen = () => {
  const { navigateTo } = useGameContext();

  // メニューに戻るボタンクリック時の処理
  const handleBackClick = () => {
    soundSystem.playSound('Button');
    navigateTo(SCREENS.MAIN_MENU);
  };

  return (
    <div className={styles.creditsContainer}>
      <div className={styles.creditsHeader}>
        <h2 className={styles.creditsTitle}>クレジット</h2>
      </div>

      <div className={styles.creditsContent}>
        <CreditsContent
          credits={creditsData}
          showAcknowledgements={true}
          creditSectionClass={styles.creditsSection}
          sectionTitleClass={styles.sectionTitle}
          creditTextClass={styles.creditText}
          creditsListClass={styles.creditsList}
          creditsItemClass={styles.creditsItem}
        />
      </div>

      <div className={styles.creditsFooter}>
        <button className={styles.backButton} onClick={handleBackClick}>
          メインメニューに戻る
        </button>
      </div>
    </div>
  );
};

export default CreditsScreen;
