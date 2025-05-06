/**
 * TypingDisplay.js
 * 高性能タイピング表示コンポーネント
 * リファクタリング済み（2025年5月7日）
 */

import React, { useMemo, useState, useEffect, memo } from 'react';
import styles from '../../styles/typing/TypingDisplay.module.css';

/**
 * タイピング表示コンポーネント
 * 文字の入力状態を視覚的に表現するコンポーネント
 * React.memoを使用してパフォーマンスを最適化
 */
const TypingDisplay = memo(({ displayInfo, errorAnimation }) => {
  // カーソル点滅用のステート
  const [cursorVisible, setCursorVisible] = useState(true);

  // カーソル点滅用のエフェクト
  useEffect(() => {
    // 問題が完了していない場合のみカーソルを点滅させる
    if (displayInfo.isCompleted) return;

    // カーソルを点滅させるタイマーを設定
    const cursorTimer = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530); // 高速タイピングでも視認しやすい速度に調整

    // クリーンアップ関数
    return () => clearInterval(cursorTimer);
  }, [displayInfo.isCompleted]);

  // 表示するテキスト要素を作成（メモ化してレンダリングコストを最適化）
  const displayTextElements = useMemo(() => {
    // 問題が完了している場合
    if (displayInfo.isCompleted) {
      return <span className={styles.completedText}>{displayInfo.problem}</span>;
    }

    const {
      romaji = '',
      typedLength = 0,
      currentInputLength = 0,
      currentInput = '',
      expectedNextChar = '',
      currentCharRomaji = '',
    } = displayInfo;

    // 文字列を分解して表示用エレメントを構築
    const elements = [];

    // 1. 既に入力済みのテキスト
    if (typedLength > 0) {
      elements.push(
        <span key="typed" className={styles.typedText}>
          {romaji.substring(0, typedLength)}
        </span>
      );
    }

    // 2. 現在入力中の文字
    const currentCharContainer = [];

    // 2-1. 入力済み部分
    if (currentInput) {
      currentCharContainer.push(
        <span key="current-input" className={styles.currentInputText}>
          {currentInput}
        </span>
      );
    }

    // 2-2. 次に入力すべき文字（ハイライト）
    if (expectedNextChar) {
      currentCharContainer.push(
        <span key="next-char" className={styles.nextCharHighlight}>
          {expectedNextChar}
        </span>
      );
    }

    // 2-3. 現在の文字の残り部分
    const remainingPartOfCurrentChar =
      currentCharRomaji.substring(currentInput.length + (expectedNextChar ? 1 : 0));

    if (remainingPartOfCurrentChar) {
      currentCharContainer.push(
        <span key="current-remaining" className={styles.currentCharRemaining}>
          {remainingPartOfCurrentChar}
        </span>
      );
    }

    // 現在入力中の文字コンテナをマージ
    if (currentCharContainer.length > 0) {
      elements.push(
        <span key="current-char-container" className={styles.currentCharContainer}>
          {currentCharContainer}
        </span>
      );
    }

    // 3. 残りの未入力部分
    const remainingStartPos = typedLength + currentCharRomaji.length;
    if (remainingStartPos < romaji.length) {
      elements.push(
        <span key="remaining" className={styles.remainingText}>
          {romaji.substring(remainingStartPos)}
        </span>
      );
    }

    return elements;
  }, [displayInfo]);

  return (
    <div className={`${styles.typingTextContainer} ${errorAnimation ? styles.errorShake : ''}`}>
      {/* タイピングテキスト */}
      <div className={styles.typingText}>
        {displayTextElements}

        {/* カーソル（問題が完了していない場合のみ表示） */}
        {!displayInfo.isCompleted && (
          <span className={`${styles.cursor} ${cursorVisible ? styles.cursorVisible : ''}`}>|</span>
        )}
      </div>

      {/* 読み仮名表示（オプション） */}
      {displayInfo.reading && (
        <div className={styles.readingText}>
          {displayInfo.reading}
        </div>
      )}
    </div>
  );
});

// 表示名を設定（デバッグ用）
TypingDisplay.displayName = 'TypingDisplay';

export default TypingDisplay;
