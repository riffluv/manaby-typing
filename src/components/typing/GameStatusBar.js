'use client';

import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/typing/GameStatusBar.module.css';
import { getStaticPath } from '../../utils/StaticPathUtils'; // 静的アセットパス用のユーティリティ

/**
 * ゲームステータスバーコンポーネント
 * タイピングゲームの進行状況と統計を表示します
 * TypingManiaスタイルでコンボとスコア情報を表示する機能を追加
 */
const GameStatusBar = ({
  solvedCount = 0,
  requiredCount = 5,
  typingStats = {},
  className = '',
  scoreInfo = {}, // スコア情報（score, combo, maxCombo, rank）
}) => {
  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // スコア情報が変更された時にデバッグログを表示
  useEffect(() => {
    if (DEBUG_MODE && (scoreInfo.combo > 5 || scoreInfo.score > 5000)) {
      console.log('[GameStatusBar] スコア情報更新:', scoreInfo);
    }
  }, [scoreInfo, DEBUG_MODE]);

  // アニメーション用のバリアント
  const animationVariants = useMemo(
    () => ({
      header: {
        initial: { y: -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.3 },
      },
      combo: {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring', stiffness: 300, damping: 15 },
      },
      score: {
        initial: { x: 20, opacity: 0 },
        animate: { x: 0, opacity: 1 },
        transition: { duration: 0.3, delay: 0.1 },
      },
    }),
    []
  );
  // スコア情報の分解（安全なアクセス）
  const { score = 0, combo = 0, maxCombo = 0, rank = 'F' } = scoreInfo || {}; // scoreInfoがnullまたはundefinedの場合に空オブジェクトをデフォルト値として使用

  // デバッグ用にscoreInfoの状態を確認
  if (!scoreInfo && process.env.NODE_ENV === 'development') {
    console.warn('[GameStatusBar] scoreInfoが未定義です');
  }

  // コンボ表示の有無（コンボが2以上ある場合のみ表示）
  const showCombo = combo >= 2;

  // コンボの大きさに応じたアニメーションスケール
  const comboScale = useMemo(() => {
    // コンボ数に応じてスケールを変更（最大1.5倍）
    const baseScale = 1;
    const comboBonus = Math.min(combo / 20, 0.5); // 最大0.5のボーナス
    return baseScale + comboBonus;
  }, [combo]);

  // ランクに基づく色クラスの設定
  const rankColorClass = useMemo(() => {
    switch (rank.toUpperCase()) {
      case 'SSS':
        return styles.rank_sss;
      case 'SS':
        return styles.rank_ss;
      case 'S+':
      case 'S':
        return styles.rank_s;
      case 'A+':
      case 'A':
        return styles.rank_a;
      case 'B+':
      case 'B':
        return styles.rank_b;
      case 'C+':
      case 'C':
        return styles.rank_c;
      case 'D+':
      case 'D':
        return styles.rank_d;
      default:
        return '';
    }
  }, [rank]);

  // ロゴを含むヘッダーを返す
  return (
    <motion.header
      className={`${styles.status_bar} ${className} ${styles.empty_bar}`}
      initial={animationVariants.header.initial}
      animate={animationVariants.header.animate}
      transition={animationVariants.header.transition}
    >
      {/* manabyロゴを左上に配置 */}
      <div className={styles.logo_container}>
        <motion.img
          src={getStaticPath('/images/manaby01_.png')}
          alt="manaby ロゴ"
          className={styles.manaby_logo}
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 1 }}
          whileHover={{
            scale: 1.05,
            y: -1,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 10,
          }}
          title="manaby - 就労支援"
        />
      </div>
      {/* スコア情報の表示エリア */}
      <div className={styles.stats_container}>
        {/* スコア表示 */}
        <motion.div
          className={styles.score_display}
          initial={animationVariants.score.initial}
          animate={animationVariants.score.animate}
          transition={animationVariants.score.transition}
        >
          {' '}
          <span className={styles.score_label}>Score:</span>
          <span className={styles.score_value}>
            {(typeof score === 'number' ? score : 0).toLocaleString()}
          </span>
        </motion.div>

        {/* ランク表示 */}
        <motion.div
          className={styles.rank_display}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <span className={styles.rank_label}>Rank:</span>{' '}
          <span className={`${styles.rank_value} ${rankColorClass}`}>
            {rank}
          </span>
        </motion.div>
      </div>
      {/* コンボ表示 - コンボが2以上の場合のみ表示 */}{' '}
      {showCombo && (
        <motion.div
          className={styles.combo_container}
          initial={animationVariants.combo.initial}
          animate={{
            scale: comboScale,
            opacity: 1,
            y: combo > 10 ? [-2, 2, -2] : 0,
          }}
          transition={{
            y: { repeat: Infinity, duration: 0.5 },
            scale: { type: 'spring', stiffness: 300, damping: 15 },
          }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <span className={styles.combo_value}>{combo}</span>
          <span className={styles.combo_label}>COMBO</span>
        </motion.div>
      )}
      {/* 残りの統計情報 */}
      <div className={styles.typing_stats}>
        <div className={styles.kpm_display}>
          <span className={styles.kpm_label}>KPM:</span>
          <span className={styles.kpm_value}>{typingStats.kpm || 0}</span>
        </div>
        <div className={styles.completion}>
          <span>{solvedCount}</span>
          <span>/</span>
          <span>{requiredCount}</span>
        </div>
      </div>
    </motion.header>
  );
};

export default GameStatusBar;
