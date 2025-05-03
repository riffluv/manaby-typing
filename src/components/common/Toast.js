'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Colors, Animation } from '../../utils/DesignTokens';
import styles from '../../styles/common/Toast.module.css';

/**
 * トースト通知コンポーネント
 * システム通知やアクション結果のフィードバックをユーザーに表示します
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.type - 通知タイプ ('success', 'error', 'warning', 'info')
 * @param {string} props.message - 表示するメッセージ
 * @param {boolean} props.visible - 通知の表示/非表示状態
 * @param {function} props.onClose - 通知を閉じる関数
 * @param {number} [props.duration=3000] - 自動で閉じるまでの時間（ミリ秒）
 * @param {boolean} [props.showIcon=true] - アイコンを表示するかどうか
 * @returns {React.ReactElement}
 */
const Toast = ({
  type = 'info',
  message,
  visible,
  onClose,
  duration = 3000,
  showIcon = true,
}) => {
  // タイプに応じたアイコンとスタイルを設定
  const getIconAndClassByType = () => {
    switch (type) {
      case 'success':
        return { icon: '✓', className: 'toast--success' };
      case 'error':
        return { icon: '✕', className: 'toast--error' };
      case 'warning':
        return { icon: '!', className: 'toast--warning' };
      case 'info':
      default:
        return { icon: 'i', className: 'toast--info' };
    }
  };

  const { icon, className } = getIconAndClassByType();

  // 指定時間後に自動で閉じる
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`${styles.toast} ${styles[className]}`}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
            mass: 1,
          }}
        >
          <div className={styles.toast__content}>
            {showIcon && (
              <div className={styles.toast__icon}>
                <span>{icon}</span>
              </div>
            )}
            <div className={styles.toast__message}>{message}</div>
            <button className={styles.toast__closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
          {/* 自動で閉じるプログレスバー */}
          <motion.div 
            className={styles.toast__progress}
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;