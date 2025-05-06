import React, { memo } from 'react';
import styles from '../../styles/typing/SimpleTypingDisplay.module.css';

/**
 * シンプルなタイピング表示コンポーネント
 * 入力テキストをシンプルに3つの部分に分けて表示
 * 1. 入力済み部分
 * 2. 次に入力すべき文字
 * 3. 残りの未入力部分
 */
const SimpleTypingDisplay = memo(({
  romaji,            // 表示するローマ字全体
  typedLength = 0,   // 入力済み文字数
  nextChar = '',     // 次に入力すべき文字
  isError = false    // エラー状態
}) => {
  // 入力済み部分（typedLength文字まで）
  const typed = romaji?.substring(0, typedLength) || '';

  // 残りの未入力部分（nextCharの後から）
  const remaining = romaji?.substring(typedLength + (nextChar ? 1 : 0)) || '';

  return (
    <div className={`${styles.typingText} ${isError ? styles.errorShake : ''}`}>
      {/* 入力済み部分 */}
      {typed && <span className={styles.typed}>{typed}</span>}

      {/* 次の文字（ハイライト表示） */}
      {nextChar && <span className={styles.nextChar}>{nextChar}</span>}

      {/* 残りの未入力部分 */}
      {remaining && <span className={styles.remaining}>{remaining}</span>}

      {/* タイピングカーソル */}
      <span className={styles.typingCursor}></span>
    </div>
  );
});

// コンポーネント名を設定（デバッグ用）
SimpleTypingDisplay.displayName = 'SimpleTypingDisplay';

export default SimpleTypingDisplay;