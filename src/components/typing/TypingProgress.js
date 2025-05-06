/**
 * TypingProgress.js
 * タイピング進行度表示コンポーネント
 * リファクタリング済み（2025年5月7日）
 */

import React, { memo, useMemo } from 'react';
import styles from '../../styles/typing/TypingProgress.module.css';

/**
 * タイピング進行度表示コンポーネント
 * @param {Object} props
 * @param {number} props.percentage - 進行度（0～100）
 * @param {boolean} props.showPercentage - パーセント値を表示するかどうか
 * @param {string} props.theme - テーマカラー（'default', 'blue', 'green'）
 */
const TypingProgress = memo(({ 
  percentage = 0, 
  showPercentage = true,
  theme = 'default'
}) => {
  // パーセンテージの値を安全に制限
  const safePercentage = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }, [percentage]);

  // テーマクラスの判定
  const themeClass = useMemo(() => {
    switch (theme) {
      case 'blue':
        return styles.blueTheme;
      case 'green':
        return styles.greenTheme;
      default:
        return '';
    }
  }, [theme]);

  // 進行度に応じたアニメーション速度
  const animationSpeed = useMemo(() => {
    // 進行度が高いほど速くアニメーションさせる
    return safePercentage > 80 ? 'fast' : 
           safePercentage > 50 ? 'medium' : 'slow';
  }, [safePercentage]);

  // 進行度表示カラーの選択
  const progressColor = useMemo(() => {
    if (safePercentage >= 100) return styles.completed;
    if (safePercentage >= 80) return styles.almostComplete;
    if (safePercentage >= 50) return styles.halfComplete;
    if (safePercentage >= 20) return styles.starting;
    return styles.justStarted;
  }, [safePercentage]);

  return (
    <div className={`${styles.progressContainer} ${themeClass}`}>
      {/* 進行度バー */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressFill} ${progressColor} ${styles[animationSpeed]}`}
          style={{ width: `${safePercentage}%` }}
        >
          {/* 流れるエフェクト */}
          <div className={styles.shimmer}></div>
        </div>
      </div>

      {/* パーセント表示（オプション） */}
      {showPercentage && (
        <div className={styles.percentageText}>
          {safePercentage}%
        </div>
      )}

      {/* 完了表示（100%の場合のみ） */}
      {safePercentage === 100 && (
        <div className={styles.completedBadge}>
          完了！
        </div>
      )}
    </div>
  );
});

// 表示名を設定（デバッグ用）
TypingProgress.displayName = 'TypingProgress';

export default TypingProgress;