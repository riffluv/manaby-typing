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
      }
    }),
    []
  );
  // 空のヘッダーを返すが、将来の拡張のために十分なスペースを確保
  return (
    <motion.header
      className={`${styles.status_bar} ${className} ${styles.empty_bar}`}
      initial={animationVariants.header.initial}
      animate={animationVariants.header.animate}
      transition={animationVariants.header.transition}
    >
      {/* 将来的にここに何か表示する可能性があるため、スペースだけ確保しておく */}
      <div style={{ height: '100%', width: '100%' }}></div>
    </motion.header>
  );
};

export default GameStatusBar;
