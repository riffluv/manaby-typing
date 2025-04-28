'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../styles/admin/AdminPopup.module.css';
import { useGameContext } from '../../contexts/GameContext';

const AdminPopup = ({ isOpen, onClose }) => {
  const { gameState, setGameState } = useGameContext();
  const [problemCount, setProblemCount] = useState(5); // デフォルト値は5問

  // コンポーネントがマウントされたときに現在のお題数を取得
  useEffect(() => {
    // gameStateからクリア条件のお題数を取得
    const currentRequiredCount = gameState.requiredProblemCount || 5;
    console.log('[管理者モード] 現在のお題数設定:', currentRequiredCount);
    setProblemCount(currentRequiredCount);
  }, [gameState, isOpen]); // isOpenが変わった時も再取得

  // エスケープキーでポップアップを閉じる
  const handleEscKey = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // キーボードイベントのリスナーを追加
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, handleEscKey]);

  // オーバーレイクリックでポップアップを閉じる
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains(styles.adminPopup__overlay)) {
      onClose();
    }
  };

  // 保存ボタンがクリックされたときの処理
  const handleSave = () => {
    // 現在の値をログに出力
    console.log('[管理者設定] 保存前のお題数:', gameState.requiredProblemCount);
    console.log('[管理者設定] 新しいお題数:', problemCount);

    // お題数をgameStateに保存
    const updatedGameState = {
      ...gameState,
      requiredProblemCount: problemCount,
    };

    // 更新
    setGameState(updatedGameState);

    // 保存後の状態を確認
    setTimeout(() => {
      console.log(
        '[管理者設定] 保存後のお題数:',
        updatedGameState.requiredProblemCount
      );
    }, 100);

    console.log(`[管理者設定] お題数を${problemCount}に変更しました`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.adminPopup__overlay} onClick={handleOverlayClick}>
      <div className={styles.adminPopup}>
        <div className={styles.adminPopup__header}>
          <h2 className={styles.adminPopup__title}>管理者設定</h2>
          <button
            className={styles.adminPopup__closeButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className={styles.adminPopup__content}>
          <div className={styles.adminPopup__formGroup}>
            <label className={styles.adminPopup__label} htmlFor="problemCount">
              クリアに必要なお題数
            </label>
            <input
              className={styles.adminPopup__input}
              id="problemCount"
              type="number"
              min="1"
              max="20"
              value={problemCount}
              onChange={(e) =>
                setProblemCount(parseInt(e.target.value, 10) || 1)
              }
            />
            <p className={styles.adminPopup__info}>
              ゲームをクリアするために必要なお題の数を設定します（1〜20の範囲）
            </p>
          </div>
        </div>
        <div className={styles.adminPopup__footer}>
          <button
            className={`${styles.adminPopup__button} ${styles['adminPopup__button--secondary']}`}
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className={`${styles.adminPopup__button} ${styles['adminPopup__button--primary']}`}
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPopup;
