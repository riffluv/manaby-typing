'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/common/Modal.module.css';

/**
 * 再利用可能なモーダルコンポーネント
 * BEM記法に準拠し、アクセシビリティに配慮した実装
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {boolean} props.isOpen - モーダルの表示/非表示状態
 * @param {function} props.onClose - モーダルを閉じる関数
 * @param {string} props.title - モーダルのタイトル
 * @param {React.ReactNode} props.children - モーダル内に表示するコンテンツ
 * @param {string} [props.size='medium'] - モーダルのサイズ ('small', 'medium', 'large')
 * @param {boolean} [props.disableEscKey=false] - ESCキーでの閉じる機能を無効にするかどうか
 * @param {boolean} [props.disableOverlayClick=false] - オーバーレイクリックでの閉じる機能を無効にするかどうか
 * @param {string} [props.className=''] - 追加のカスタムクラス名
 * @returns {React.ReactElement}
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  disableEscKey = false,
  disableOverlayClick = false,
  className = '',
}) => {
  // BEM記法に基づくクラス名を生成
  const modalClasses = {
    base: styles.modal,
    size: size !== 'medium' ? styles[`modal--${size}`] : '',
    custom: className,
  };

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen && !disableEscKey) {
      e.preventDefault();
      onClose();
    }
  }, [isOpen, onClose, disableEscKey]);

  // オーバーレイクリックハンドラー
  const handleOverlayClick = useCallback((e) => {
    if (!disableOverlayClick) {
      onClose();
    }
  }, [onClose, disableOverlayClick]);

  // コンテンツクリックでイベント伝播を阻止
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // キーボードイベントの登録と解除
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // モーダル表示時はスクロールを禁止
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // モーダル非表示時にスクロールを再開
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // アニメーションバリアント
  const overlayAnimations = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  };

  const contentAnimations = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 1
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={[modalClasses.base, modalClasses.size, modalClasses.custom].filter(Boolean).join(' ')}
          role="dialog"
          aria-labelledby="modal-title"
          aria-modal="true"
        >
          <motion.div
            className={styles.modal__overlay}
            onClick={handleOverlayClick}
            {...overlayAnimations}
          >
            <motion.div
              className={styles.modal__content}
              onClick={handleContentClick}
              {...contentAnimations}
            >
              <div className={styles.modal__header}>
                <h2
                  className={styles.modal__title}
                  id="modal-title"
                >
                  {title}
                </h2>
                <button
                  className={styles.modal__close_button}
                  onClick={onClose}
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
              <div className={styles.modal__body}>
                {children}
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
