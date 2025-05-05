'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/common/Toast.module.css';

/**
 * トースト通知コンポーネント
 * システム通知やアクション結果のフィードバックをユーザーに表示します
 * BEM記法に準拠し、アクセシビリティに配慮した実装
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.type - 通知タイプ ('success', 'error', 'warning', 'info')
 * @param {string} props.message - 表示するメッセージ
 * @param {boolean} props.visible - 通知の表示/非表示状態
 * @param {function} props.onClose - 通知を閉じる関数
 * @param {number} [props.duration=3000] - 自動で閉じるまでの時間（ミリ秒）
 * @param {boolean} [props.showIcon=true] - アイコンを表示するかどうか
 * @param {string} [props.position='top-right'] - 表示位置 ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @returns {React.ReactElement}
 */
const Toast = ({
  type = 'info',
  message,
  visible,
  onClose,
  duration = 3000,
  showIcon = true,
  position = 'top-right'
}) => {
  // タイプに応じたアイコンとARIA属性を設定
  const toastConfig = useMemo(() => {
    switch (type) {
      case 'success':
        return { 
          icon: '✓', 
          className: 'toast--success',
          ariaRole: 'status',
          ariaLive: 'polite'
        };
      case 'error':
        return { 
          icon: '✕', 
          className: 'toast--error',
          ariaRole: 'alert',
          ariaLive: 'assertive'
        };
      case 'warning':
        return { 
          icon: '!', 
          className: 'toast--warning',
          ariaRole: 'status',
          ariaLive: 'polite'
        };
      case 'info':
      default:
        return { 
          icon: 'i', 
          className: 'toast--info',
          ariaRole: 'status',
          ariaLive: 'polite'
        };
    }
  }, [type]);

  // ポジションに応じたクラス名
  const positionClass = useMemo(() => {
    return `toast--${position}`;
  }, [position]);

  // 指定時間後に自動で閉じる
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  // アニメーション設定
  const animations = {
    topVariants: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 }
    },
    bottomVariants: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 }
    },
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 1
    }
  };

  // 表示位置に応じたアニメーションを選択
  const animationVariant = position.includes('top') 
    ? animations.topVariants 
    : animations.bottomVariants;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`${styles.toast} ${styles[toastConfig.className]} ${styles[positionClass]}`}
          role={toastConfig.ariaRole}
          aria-live={toastConfig.ariaLive}
          initial={animationVariant.initial}
          animate={animationVariant.animate}
          exit={animationVariant.exit}
          transition={animations.transition}
        >
          <div className={styles.toast__content}>
            {showIcon && (
              <div className={styles.toast__icon} aria-hidden="true">
                <span>{toastConfig.icon}</span>
              </div>
            )}
            <div className={styles.toast__message}>{message}</div>
            <button 
              className={styles.toast__close_button} 
              onClick={onClose}
              aria-label="通知を閉じる"
            >
              ✕
            </button>
          </div>
          {/* 自動で閉じるプログレスバー */}
          {duration > 0 && (
            <motion.div 
              className={styles.toast__progress}
              initial={{ width: '100%' }}
              animate={{ width: 0 }}
              transition={{ duration: duration / 1000, ease: 'linear' }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;