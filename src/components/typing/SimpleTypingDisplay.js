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
  isError = false,   // エラー状態
  className = '',    // 外部から適用するクラス名
  inputMode = 'normal', // 入力モード（normal/consonant）
  currentInput = '',  // 現在入力中の文字
  currentCharRomaji = '' // 現在入力中の文字の完全なローマ字表現
}) => {
  // 入力済み部分（typedLength文字まで）
  const typed = romaji?.substring(0, typedLength) || '';

  // 表示用の変数を準備
  let displayCurrentInput = '';
  let displayNextChar = nextChar || '';
  let displayRemaining = '';

  // 入力モードによって表示方法を変更
  if (inputMode === 'consonant' && currentInput) {
    // 子音入力中の特殊処理
    // 例: t -> ta の変換中なら、「t」を表示し「a」をハイライト

    // 1. 現在の入力を表示（子音部分）
    displayCurrentInput = currentInput;

    // 2. 次に入力すべき文字（母音部分）を特定
    if (currentCharRomaji && currentCharRomaji.length > currentInput.length) {
      // 現在入力している平仮名のローマ字表現から次の文字（母音）を特定
      displayNextChar = currentCharRomaji.charAt(currentInput.length);
    } else {
      // フォールバック: 子音に続く最も一般的な母音 'a'
      displayNextChar = 'a';
    }

    // 3. 残りの部分の計算
    // 現在の平仮名のローマ字表現の後から始まる
    const remainingStartPos = typedLength + currentCharRomaji.length;
    displayRemaining = romaji?.substring(remainingStartPos) || '';
  } else {
    // 通常モードでの表示処理
    displayNextChar = nextChar;
    const remainingStartPos = typedLength + (nextChar ? 1 : 0);
    displayRemaining = romaji?.substring(remainingStartPos) || '';
  }

  // 外部クラスと内部クラスを結合
  const containerClass = `${styles.typingText} ${className || ''} ${isError ? styles.errorShake : ''}`;

  // romaji全体が空の場合は空白表示
  if (!romaji) {
    return (
      <div className={containerClass}>
        <span className={styles.typingCursor}></span>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {/* 入力済み部分 */}
      {typed && <span className={styles.typed}>{typed}</span>}

      {/* 子音入力中の場合は、子音も表示 */}
      {inputMode === 'consonant' && displayCurrentInput && (
        <span className={styles.consonant}>{displayCurrentInput}</span>
      )}

      {/* 次に入力すべき文字（ハイライト表示） */}
      {displayNextChar && (
        <span className={styles.nextChar}>{displayNextChar}</span>
      )}

      {/* 子音入力中の場合は、現在の仮名の残りを表示 */}
      {inputMode === 'consonant' && currentCharRomaji && currentCharRomaji.length > (currentInput?.length || 0) + 1 && (
        <span className={styles.currentCharRemaining}>
          {currentCharRomaji.substring((currentInput?.length || 0) + 1)}
        </span>
      )}

      {/* 残りの未入力部分 */}
      {displayRemaining && <span className={styles.remaining}>{displayRemaining}</span>}

      {/* タイピングカーソル */}
      <span className={styles.typingCursor}></span>
    </div>
  );
});

// コンポーネント名を設定（デバッグ用）
SimpleTypingDisplay.displayName = 'SimpleTypingDisplay';

export default SimpleTypingDisplay;