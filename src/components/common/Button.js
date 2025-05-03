'use client';

import React from 'react';
import { motion } from 'framer-motion';
import styles from '../../styles/common/Button.module.css';
import { getButtonClassName, ButtonAnimations } from '../../utils/ButtonStyleUtils';

/**
 * 再利用可能なボタンコンポーネント
 * デザインシステムの ButtonStyleUtils を使用して、一貫性のあるスタイルを適用
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
  // ButtonStyleUtilsのヘルパー関数を使用してクラス名を生成
  const withIcon = !!icon;
  const buttonClass = getButtonClassName({
    variant,
    size,
    round,
    active,
    withIcon,
    disabled,
    className,
  });

  // クラス名を適用
  const combinedClassName = buttonClass
    .split(' ')
    .map((cls) => styles[cls] || cls)
    .join(' ');

  return (
    <motion.button
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
      whileTap={!disabled ? ButtonAnimations.framerMotion.whileTap : undefined}
      whileHover={!disabled ? ButtonAnimations.framerMotion.whileHover : undefined}
      transition={ButtonAnimations.framerMotion.transition}
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
      whileTap={!disabled ? ButtonAnimations.framerMotion.whileTap : undefined}
      whileHover={!disabled ? ButtonAnimations.framerMotion.whileHover : undefined}
      transition={ButtonAnimations.framerMotion.transition}
    >
      {isOn ? 'ON' : 'OFF'}
    </motion.button>
  );
};

export default Button;
