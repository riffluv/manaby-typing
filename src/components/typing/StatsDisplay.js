'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/typing/StatsDisplay.module.css';

/**
 * タイピングゲームの統計情報を表示するコンポーネント
 * KPM、正確性、進捗などを表示
 */
const StatsDisplay = ({
  kpm = 0,
  accuracy = 100,
  progress = 0,
  solvedCount = 0,
  requiredProblemCount = 5,
  className = '',
  animate = true,
}) => {
  // 統計情報表示用のクラス
  const containerClass = `${styles.stats_display} ${className}`.trim();

  // アニメーションなしの場合
  if (!animate) {
    return (
      <div className={containerClass}>
        <div className={styles.stats_display__values}>
          <div className={styles.stats_display__item}>
            <span className={styles.stats_display__label}>KPM:</span>
            <span className={styles.stats_display__value}>{kpm}</span>
          </div>
          <div className={styles.stats_display__item}>
            <span className={styles.stats_display__label}>正確性:</span>
            <span className={styles.stats_display__value}>
              {Math.round(accuracy)}%
            </span>
          </div>
        </div>

        <div className={styles.stats_display__progress}>
          <span className={styles.stats_display__progress_label}>
            お題: {solvedCount + 1}/{requiredProblemCount}
          </span>
        </div>
      </div>
    );
  }

  // アニメーション効果付きの表示
  return (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.stats_display__values}>
        <motion.div
          className={styles.stats_display__item}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <span className={styles.stats_display__label}>KPM:</span>
          <span className={styles.stats_display__value}>{kpm}</span>
        </motion.div>

        <motion.div
          className={styles.stats_display__item}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className={styles.stats_display__label}>正確性:</span>
          <span className={styles.stats_display__value}>
            {Math.round(accuracy)}%
          </span>
        </motion.div>
      </div>

      <motion.div
        className={styles.stats_display__progress}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <span className={styles.stats_display__progress_label}>
          お題: {solvedCount + 1}/{requiredProblemCount}
        </span>

        {/* 進捗バー */}
        <div className={styles.stats_display__progress_bar_container}>
          <motion.div
            className={styles.stats_display__progress_bar}
            initial={{ width: '0%' }}
            animate={{
              width: `${(solvedCount / requiredProblemCount) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

// メモ化してパフォーマンスを最適化
export default memo(StatsDisplay);
