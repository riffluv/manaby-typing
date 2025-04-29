import React from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * タイピングテキスト表示コンポーネント
 * タイピングゲームの問題文、入力済みテキスト、現在の入力を表示する
 * 
 * @param {Object} props
 * @param {string} props.displayRomaji - 表示するローマ字テキスト
 * @param {Object} props.coloringInfo - 色分け情報
 * @param {boolean} props.isCompleted - タイピング完了フラグ
 * @param {string} props.currentInput - ユーザーの現在の入力
 * @param {boolean} props.errorAnimation - エラーアニメーションフラグ
 */
const TypingDisplay = ({ 
  displayRomaji, 
  coloringInfo, 
  isCompleted, 
  currentInput = '',
  errorAnimation = false
}) => {
  if (!displayRomaji) return null;

  // 完了状態の場合
  if (isCompleted) {
    return (
      <div className={styles.typingRomaji}>
        <span className={styles.completed}>{displayRomaji}</span>
      </div>
    );
  }

  // 通常表示
  const typedIndex = coloringInfo?.typedLength || 0;
  const currentPosition = coloringInfo?.currentPosition || 0;
  const currentDisplay = coloringInfo?.currentDisplay || '';
  const typed = displayRomaji.substring(0, typedIndex);
  const remaining = displayRomaji.substring(
    currentPosition + currentInput.length
  );

  return (
    <div className={styles.typingRomaji} data-testid="typing-display">
      <span className={styles.completed}>{typed}</span>
      {currentInput && <span className={styles.current}>{currentInput}</span>}
      {currentDisplay && currentInput.length < currentDisplay.length && (
        <span>{currentDisplay.substring(currentInput.length)}</span>
      )}
      <span className={errorAnimation ? styles.error : ''}>{remaining}</span>
    </div>
  );
};

export default TypingDisplay;