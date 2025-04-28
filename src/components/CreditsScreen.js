'use client';

import React from 'react';
import styles from '../styles/CreditsScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';

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
        <div className={styles.creditsSection}>
          <h3 className={styles.sectionTitle}>開発</h3>
          <p className={styles.creditText}>開発者名</p>
        </div>

        <div className={styles.creditsSection}>
          <h3 className={styles.sectionTitle}>デザイン</h3>
          <p className={styles.creditText}>デザイナー名</p>
        </div>

        <div className={styles.creditsSection}>
          <h3 className={styles.sectionTitle}>素材</h3>
          <ul className={styles.creditsList}>
            <li className={styles.creditsItem}>アイコン素材：素材提供元</li>
            <li className={styles.creditsItem}>フォント：フォント提供元</li>
            <li className={styles.creditsItem}>効果音：効果音提供元</li>
          </ul>
        </div>

        <div className={styles.creditsSection}>
          <h3 className={styles.sectionTitle}>謝辞</h3>
          <p className={styles.creditText}>
            このゲームの開発にあたり、多くの方々のサポートをいただきました。
            感謝申し上げます。
          </p>
        </div>
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
