import React, { memo } from 'react';
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
  // パフォーマンス向上のためコンソール出力を開発環境のみに制限
  if (process.env.NODE_ENV === 'development') {
    console.debug('[ProgressBar] レンダリング:', { percentage });
  }
  
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

// プロップの比較関数: 実質的な変更があった場合のみ再レンダリング
const arePropsEqual = (prevProps, nextProps) => {
  // 小数点以下を切り捨てた値で比較して、微小な変化での再レンダリングを防止
  const prevPercentage = Math.floor(prevProps.percentage);
  const nextPercentage = Math.floor(nextProps.percentage);
  
  return prevPercentage === nextPercentage && 
         prevProps.showText === nextProps.showText && 
         prevProps.label === nextProps.label;
};

export default memo(ProgressBar, arePropsEqual);