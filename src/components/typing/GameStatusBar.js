'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/typing/GameStatusBar.module.css';

/**
 * ゲームステータスバーコンポーネント
 * タイピングゲームの進行状況と統計を表示します
 */
const GameStatusBar = ({
  solvedCount = 0,
  requiredCount = 5,
  typingStats = {},
  className = '',
}) => {
  // アニメーション用のバリアント
  const animationVariants = useMemo(
    () => ({
      header: {
        initial: { y: -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.3 },
      },
      gameLevelScale: {
        initial: { scale: 1 },
        animate: {
          scale: [1, 1.1, 1],
        },
        transition: {
          duration: 0.5,
          times: [0, 0.5, 1],
          repeat: 0,
          repeatDelay: 1,
        },
      },
      status: {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { delay: 0.4, duration: 0.3 },
      },
    }),
    []
  );

  // KPMからランクを計算
  const getRank = (kpm) => {
    if (kpm >= 400) return { rank: 'S', color: '#00ff66' };
    if (kpm >= 300) return { rank: 'A', color: '#33ff00' };
    if (kpm >= 200) return { rank: 'B', color: '#ffff00' };
    if (kpm >= 150) return { rank: 'C', color: '#ff9900' };
    if (kpm >= 100) return { rank: 'D', color: '#ff3300' };
    if (kpm >= 50) return { rank: 'E', color: '#ff0000' };
    return { rank: 'F', color: '#cc0000' };
  };

  // 現在のランクを取得
  const currentRank = useMemo(() => {
    return getRank(typingStats.kpm || 0);
  }, [typingStats.kpm]);

  // 進捗率を計算
  const progressPercentage = useMemo(() => {
    return Math.min(100, Math.floor((solvedCount / requiredCount) * 100));
  }, [solvedCount, requiredCount]);

  return (
    <motion.header
      className={`${styles.status_bar} ${className}`}
      initial={animationVariants.header.initial}
      animate={animationVariants.header.animate}
      transition={animationVariants.header.transition}
    >
      <div className={styles.status_info}>
        {/* 精度情報 */}
        <div className={styles.status_item}>
          <span className={styles.status_label}>精度</span>
          <span className={styles.status_value}>
            {typingStats.accuracy ? typingStats.accuracy.toFixed(1) : '0.0'}%
          </span>
        </div>

        {/* KPM情報 */}
        <div className={styles.status_item}>
          <span className={styles.status_label}>KPM</span>
          <span className={styles.status_value}>{typingStats.kpm || 0}</span>
        </div>

        {/* ランク情報 */}
        <div className={styles.status_item}>
          <span className={styles.status_label}>ランク</span>
          <span
            className={styles.status_rank}
            style={{ color: currentRank.color }}
          >
            {currentRank.rank}
          </span>
        </div>
      </div>

      <motion.div
        className={styles.level_display}
        initial={animationVariants.gameLevelScale.initial}
        animate={animationVariants.gameLevelScale.animate}
        transition={animationVariants.gameLevelScale.transition}
      >
        <span className={styles.level_text}>
          お題: {solvedCount + 1}/{requiredCount}
        </span>

        {/* プログレスバー */}
        <div className={styles.progress_bar}>
          <div
            className={styles.progress_fill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </motion.div>

      <div className={styles.status_info}>
        {/* 正解数 */}
        <div className={styles.status_item}>
          <span className={styles.status_label}>正解</span>
          <span className={styles.status_value}>
            {typingStats.correctCount || 0}
          </span>
        </div>

        {/* ミス数 */}
        <div className={styles.status_item}>
          <span className={styles.status_label}>ミス</span>
          <span className={styles.status_value}>
            {typingStats.missCount || 0}
          </span>
        </div>
      </div>
    </motion.header>
  );
};

export default GameStatusBar;
