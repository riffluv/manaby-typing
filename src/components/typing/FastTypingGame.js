'use client';

/**
 * FastTypingGame.js
 * 高速タイピング対応のタイピングゲームコンポーネント
 * useRefを活用したキー入力の最適化実装
 *
 * 2025年5月15日作成
 */

import React, { useState, useCallback, useEffect, memo, useMemo } from 'react';
import { useHighPerformanceTyping } from '@/hooks/useHighPerformanceTyping';

// 最適化されたテキスト表示コンポーネント
const MemoizedTypingText = memo(({ displayInfo, errorAnimation }) => {
  // テキスト部分を事前に処理して最適化
  const { romaji, typedLength, currentCharRomaji } = displayInfo;

  const typedPart = useMemo(
    () => romaji.substring(0, typedLength),
    [romaji, typedLength]
  );

  const currentPart = useMemo(
    () =>
      romaji.substring(
        typedLength,
        typedLength + (currentCharRomaji?.length || 1)
      ),
    [romaji, typedLength, currentCharRomaji]
  );

  const remainingPart = useMemo(
    () => romaji.substring(typedLength + (currentCharRomaji?.length || 1)),
    [romaji, typedLength, currentCharRomaji]
  );

  return (
    <div className="typing-text">
      <span className="typed">{typedPart}</span>
      <span className={`current ${errorAnimation ? 'error-animation' : ''}`}>
        {currentPart}
      </span>
      <span className="remaining">{remainingPart}</span>
    </div>
  );
});

// 最適化された進捗バー
const MemoizedProgressBar = memo(({ progress }) => {
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${progress}%` }} />
    </div>
  );
});

// 最適化された統計情報表示
const MemoizedStatsDisplay = memo(({ stats }) => {
  return (
    <div className="stats-display">
      <div>速度: {stats.kpm || 0} KPM</div>
      <div>正解: {stats.correctKeyCount || 0}</div>
      <div>ミス: {stats.mistakeCount || 0}</div>
    </div>
  );
});

/**
 * 高速タイピングゲームコンポーネント
 * @param {Object} props コンポーネントのプロップス
 * @returns {React.ReactElement} タイピングゲームUI
 */
const FastTypingGame = ({
  initialProblem,
  playSound = true,
  soundSystem = null,
  onComplete = () => {},
  showDebug = false,
}) => {
  // デバッグ情報表示用
  const [debugInfo, setDebugInfo] = useState({});

  // 高パフォーマンスタイピングフックを使用
  const typing = useHighPerformanceTyping({
    initialProblem,
    playSound,
    soundSystem,
    onProblemComplete: useCallback(
      (data) => {
        onComplete(data);
      },
      [onComplete]
    ),
    onDebugInfoUpdate: showDebug ? setDebugInfo : null,
  });

  // 表示コンテンツのメモ化
  const displayContent = useMemo(() => {
    // 初期化されていない場合は読み込み中表示
    if (!typing.isInitialized) {
      return <div className="loading">問題を読み込み中...</div>;
    }

    return (
      <>
        <MemoizedTypingText
          displayInfo={typing.displayInfo}
          errorAnimation={typing.errorAnimation}
        />

        <MemoizedProgressBar progress={typing.progress} />

        <MemoizedStatsDisplay stats={typing.stats} />

        {/* デバッグ情報表示（開発時のみ） */}
        {showDebug && (
          <div className="debug-info">
            <h4>デバッグ情報</h4>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </>
    );
  }, [
    typing.isInitialized,
    typing.displayInfo,
    typing.errorAnimation,
    typing.progress,
    typing.stats,
    showDebug,
    debugInfo,
  ]);

  return <div className="fast-typing-game">{displayContent}</div>;
};

// パフォーマンス最適化のためmemo化
export default memo(FastTypingGame);
