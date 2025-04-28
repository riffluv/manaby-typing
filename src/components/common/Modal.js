'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/common/Modal.module.css';

/**
 * 再利用可能なモーダルコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {boolean} props.isOpen - モーダルの表示/非表示状態
 * @param {function} props.onClose - モーダルを閉じる関数
 * @param {string} props.title - モーダルのタイトル
 * @param {React.ReactNode} props.children - モーダル内に表示するコンテンツ
 * @param {string} [props.size='medium'] - モーダルのサイズ ('small', 'medium', 'large')
 * @param {boolean} [props.disableEscKey=false] - ESCキーでの閉じる機能を無効にするかどうか
 * @returns {React.ReactElement}
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  disableEscKey = false,
}) => {
  // サイズに応じたクラス名を設定
  const sizeClass = size !== 'medium' ? `modal--${size}` : '';

  // ESCキーでモーダルを閉じる機能
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !disableEscKey) {
        e.preventDefault();
        onClose();
      }
    };

    // モーダルが開いている場合のみキーボードイベントをリスン
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, disableEscKey]);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`${styles.modal} ${styles[sizeClass]}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.modal__overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose} // オーバーレイクリックでも閉じる
          >
            <motion.div
              className={styles.modal__content}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                mass: 1,
                velocity: 0,
              }}
              onClick={(e) => e.stopPropagation()} // コンテンツクリックではイベント伝播を止める
            >
              <div className={styles.modal__header}>
                <h2 className={styles.modal__title}>{title}</h2>
                <button className={styles.modal__closeButton} onClick={onClose}>
                  ✕
                </button>
              </div>

              <div className={styles.modal__body}>{children}</div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
