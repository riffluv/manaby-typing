'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/common/Button.module.css';

/**
 * 再利用可能なボタンコンポーネント
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
  // スタイルクラスを組み立て
  let buttonClass = styles.button;

  // バリアント
  if (variant !== 'default') {
    buttonClass += ` ${styles[`button--${variant}`]}`;
  }

  // サイズ
  if (size !== 'medium') {
    buttonClass += ` ${styles[`button--${size}`]}`;
  }

  // 丸みを帯びたスタイル
  if (round) {
    buttonClass += ` ${styles['button--round']}`;
  }

  // アクティブ状態
  if (active) {
    buttonClass += ` ${styles['button--active']}`;
  }

  // メニュー用ボタン
  if (className === 'button--menu') {
    buttonClass += ` ${styles['button--menu']}`;
  }

  // 難易度選択用ボタン
  if (className === 'button--difficulty') {
    buttonClass += ` ${styles['button--difficulty']}`;
  }

  return (
    <motion.button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={disabled ? {} : { scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      {...rest}
    >
      {icon && <span className={styles.button__icon}>{icon}</span>}
      {children}
    </motion.button>
  );
};

/**
 * トグルボタンコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {boolean} props.isOn - ONの状態かどうか
 * @param {function} props.onToggle - トグル時のコールバック関数
 * @param {boolean} [props.disabled=false] - 無効状態かどうか
 * @returns {React.ReactElement}
 */
export const ToggleButton = ({ isOn, onToggle, disabled = false }) => {
  const toggleClass = `${styles.toggle} ${
    isOn ? styles['toggle--on'] : styles['toggle--off']
  }`;

  return (
    <motion.button
      className={`${styles.button} ${toggleClass}`}
      onClick={onToggle}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      whileHover={disabled ? {} : { scale: 1.05 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      {isOn ? 'ON' : 'OFF'}
    </motion.button>
  );
};

export default Button;
