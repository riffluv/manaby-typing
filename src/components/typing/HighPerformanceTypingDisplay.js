'use client';

/**
 * HighPerformanceTypingDisplay.js
 * 超高速タイピング表示のための最適化コンポーネント
 *
 * 特徴:
 * 1. React.memoで最適化されたサブコンポーネント
 * 2. useMemoによるテキスト分割の最適化
 * 3. CSSトランジションを使用した効率的なアニメーション
 *
 * 2025年5月15日作成
 */

import React, { memo, useMemo } from 'react';
import styles from './HighPerformanceTypingDisplay.module.css';

/**
 * 最適化されたタイピングテキスト表示
 * 文字ごとに分割して効率的にレンダリング
 */
const TypingCharacter = memo(({ char, state }) => {
  return <span className={styles[state]}>{char}</span>;
});

TypingCharacter.displayName = 'TypingCharacter';

/**
 * キー期待表示コンポーネント
 * 次に入力すべきキーを表示
 */
const ExpectedKeyDisplay = memo(({ expectedKey, errorAnimation }) => {
  if (!expectedKey) return null;

  return (
    <div
      className={`${styles.expectedKey} ${errorAnimation ? styles.error : ''}`}
    >
      次のキー: <strong>{expectedKey}</strong>
    </div>
  );
});

ExpectedKeyDisplay.displayName = 'ExpectedKeyDisplay';

/**
 * 進捗バー表示コンポーネント
 * CSSトランジションでスムーズなアニメーション
 */
const ProgressBar = memo(({ progress }) => {
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar} style={{ width: `${progress}%` }} />
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

/**
 * 高パフォーマンスタイピング表示
 * 不要な再レンダリングを防ぎつつ、正確な表示を実現
 */
const HighPerformanceTypingDisplay = ({
  displayInfo,
  progress = 0,
  errorAnimation = false,
}) => {
  // 表示テキストの分割（typed, current, remaining）
  const { typedText, currentChar, remainingText } = useMemo(() => {
    const { romaji, typedLength, currentCharRomaji } = displayInfo;

    // 空のデータの場合の対応
    if (!romaji) {
      return { typedText: '', currentChar: '', remainingText: '' };
    }

    const typed = romaji.substring(0, typedLength);
    const current = romaji.substring(
      typedLength,
      typedLength + (currentCharRomaji?.length || 1)
    );
    const remaining = romaji.substring(
      typedLength + (currentCharRomaji?.length || 1)
    );

    return {
      typedText: typed,
      currentChar: current,
      remainingText: remaining,
    };
  }, [displayInfo]);

  // 次に入力すべきキー
  const expectedKey = useMemo(() => {
    return displayInfo.expectedNextChar || '';
  }, [displayInfo.expectedNextChar]);

  return (
    <div className={styles.typingDisplayContainer}>
      <div className={styles.typingText}>
        {/* タイプ済みテキスト */}
        <span className={styles.typed}>{typedText}</span>

        {/* 現在の文字 */}
        <span
          className={`${styles.current} ${
            errorAnimation ? styles.errorAnimation : ''
          }`}
        >
          {currentChar}
        </span>

        {/* 残りのテキスト */}
        <span className={styles.remaining}>{remainingText}</span>
      </div>

      {/* 期待キー表示 */}
      <ExpectedKeyDisplay
        expectedKey={expectedKey}
        errorAnimation={errorAnimation}
      />

      {/* 進捗バー */}
      <ProgressBar progress={progress} />
    </div>
  );
};

// パフォーマンス最適化のためコンポーネント全体をメモ化
export default memo(HighPerformanceTypingDisplay);
