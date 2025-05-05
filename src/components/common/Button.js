'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/common/Button.module.css';

// ボタンアニメーション設定
const buttonAnimations = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.05 },
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

/**
 * 再利用可能なボタンコンポーネント
 * BEM記法に準拠した命名規則でスタイリング
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} [props.variant='default'] - ボタンの種類 ('primary', 'secondary', 'danger', 'success')
 * @param {string} [props.size='medium'] - ボタンのサイズ ('small', 'medium', 'large')
 * @param {boolean} [props.round=false] - 丸みを帯びたボタンにするかどうか
 * @param {boolean} [props.active=false] - アクティブ状態かどうか
 * @param {string} [props.icon] - ボタン内のアイコン文字
 * @param {function} [props.onClick] - クリックイベントハンドラ
 * @param {boolean} [props.disabled=false] - 無効状態かどうか
 * @param {string} [props.className] - 追加のカスタムクラス名
 * @param {React.ReactNode} props.children - ボタン内のテキスト
 * @returns {React.ReactElement}
 */
const Button = ({
  variant = 'default',
  size = 'medium',
  round = false,
  active = false,
  icon,
  onClick,
  disabled = false,
  className = '',
  children,
  ...rest
}) => {
  // BEM記法に基づくクラス名を生成
  const buttonClassName = useMemo(() => {
    const classes = ['button'];

    // バリエーション
    if (variant !== 'default') {
      classes.push(`button--${variant}`);
    }

    // サイズ
    if (size !== 'medium') {
      classes.push(`button--${size}`);
    }

    // 丸みを帯びたスタイル
    if (round) {
      classes.push('button--round');
    }

    // アクティブ状態
    if (active) {
      classes.push('button--active');
    }

    // スタイルオブジェクトからCSS Modulesのクラス名に変換
    return classes
      .map((cls) => styles[cls])
      .filter(Boolean)
      .concat(className) // カスタムクラス名を追加
      .join(' ');
  }, [variant, size, round, active, className]);

  return (
    <motion.button
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? buttonAnimations.whileTap : undefined}
      whileHover={!disabled ? buttonAnimations.whileHover : undefined}
      transition={buttonAnimations.transition}
      {...rest}
    >
      {icon && <span className={styles.button__icon}>{icon}</span>}
      {children}
    </motion.button>
  );
};

/**
 * トグルボタンコンポーネント
 * BEM記法に準拠した実装
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {boolean} props.isOn - ONの状態かどうか
 * @param {function} props.onToggle - トグル時のコールバック関数
 * @param {boolean} [props.disabled=false] - 無効状態かどうか
 * @param {string} [props.className=''] - 追加のカスタムクラス名
 * @param {string} [props.onText='ON'] - オン状態のテキスト
 * @param {string} [props.offText='OFF'] - オフ状態のテキスト
 * @returns {React.ReactElement}
 */
export const ToggleButton = ({
  isOn,
  onToggle,
  disabled = false,
  className = '',
  onText = 'ON',
  offText = 'OFF',
}) => {
  // BEM記法に基づくクラス名を生成
  const toggleClassName = useMemo(() => {
    const baseClass = 'toggle';
    const stateClass = isOn ? 'toggle--on' : 'toggle--off';

    return [
      styles.button,
      styles[baseClass],
      styles[stateClass],
      disabled ? styles['button--disabled'] : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');
  }, [isOn, disabled, className]);

  return (
    <motion.button
      className={toggleClassName}
      onClick={onToggle}
      disabled={disabled}
      whileTap={!disabled ? buttonAnimations.whileTap : undefined}
      whileHover={!disabled ? buttonAnimations.whileHover : undefined}
      transition={buttonAnimations.transition}
      aria-pressed={isOn}
      role="switch"
    >
      {isOn ? onText : offText}
    </motion.button>
  );
};

export default Button;
