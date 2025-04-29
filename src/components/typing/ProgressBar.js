import React from 'react';
import styles from './ProgressBar.module.css';

/**
 * 進捗バーコンポーネント
 * パーセンテージ値に基づいて進捗状況を表示する
 * 
 * @param {Object} props
 * @param {number} props.percentage - 進捗パーセンテージ (0-100)
 * @param {boolean} props.showText - パーセンテージテキストを表示するかどうか
 * @param {string} props.label - 進捗バーのラベル
 */
const ProgressBar = ({ 
  percentage = 0, 
  showText = true, 
  label = '進行状況' 
}) => {
  // パーセンテージ値のバリデーション
  const validPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <div className={styles.progressContainer} data-testid="progress-bar">
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${validPercentage}%` }}
          aria-valuenow={validPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        />
      </div>
      {showText && (
        <div className={styles.progressText}>
          {label}: {validPercentage}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;