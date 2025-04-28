'use client';

import React from 'react';
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
 * @returns {React.ReactElement}
 */
const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  // サイズに応じたクラス名を設定
  const sizeClass = size !== 'medium' ? `modal--${size}` : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`${styles.modal} ${styles[sizeClass]}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={styles.modal__overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose} // オーバーレイクリックでモーダルを閉じる
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
              onClick={(e) => e.stopPropagation()} // 内部クリックはバブリングさせない
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
