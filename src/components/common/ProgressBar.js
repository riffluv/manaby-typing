'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/common/ProgressBar.module.css';

/**
 * 進捗バーコンポーネント
 * BEM記法に準拠した進捗表示用UI
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {number} props.value - 現在の進捗値（0〜100）
 * @param {number} [props.max=100] - 最大値（デフォルト：100）
 * @param {string} [props.size='medium'] - サイズ ('small', 'medium', 'large')
 * @param {string} [props.variant='default'] - バリアント ('default', 'gradient', 'striped')
 * @param {boolean} [props.animated=false] - アニメーション効果の有無
 * @param {string} [props.label] - 進捗ラベル
 * @param {boolean} [props.showPercentage=false] - パーセンテージの表示有無
 * @param {boolean} [props.indeterminate=false] - 不確定モード（ローディングアニメーション）
 * @param {string} [props.color] - 進捗バーの色（CSSカラー値）
 * @param {string} [props.className] - 追加のカスタムクラス名
 * @param {string} [props.ariaLabel] - アクセシビリティ用ラベル
 * @returns {React.ReactElement}
 */
const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'medium',
  variant = 'default',
  animated = false,
  label,
  showPercentage = false,
  indeterminate = false,
  color,
  className = '',
  ariaLabel,
  ...props
}) => {
  // 進捗率の計算（0〜100%）
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  // BEM記法に基づくクラス名の生成
  const progressBarClasses = [
    styles.progress_bar,
    styles[`progress_bar--${size}`],
    variant !== 'default' ? styles[`progress_bar--${variant}`] : '',
    animated ? styles['progress_bar--animated'] : '',
    indeterminate ? styles['progress_bar--indeterminate'] : '',
    className
  ].filter(Boolean).join(' ');

  // 進捗バーのインラインスタイル
  const progressBarStyle = {
    ...(color ? { '--progress-color': color } : {})
  };

  // パーセンテージまたはラベルの表示テキスト
  const displayText = label || (showPercentage ? `${Math.round(percentage)}%` : '');

  return (
    <div className={styles.progress_bar__container}>
      {displayText && (
        <div className={styles.progress_bar__label_container}>
          <span className={styles.progress_bar__label}>{displayText}</span>
          {showPercentage && label && (
            <span className={styles.progress_bar__percentage}>{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        className={progressBarClasses}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={ariaLabel || label || 'Progress'}
        style={progressBarStyle}
        {...props}
      >
        {!indeterminate ? (
          <motion.div
            className={styles.progress_bar__fill}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ 
              type: 'spring',
              stiffness: 60,
              damping: 15
            }}
          />
        ) : (
          <div className={styles.progress_bar__indeterminate} />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;