'use client';

/**
 * GameScreenRefactored.js
 * タイピングゲーム画面のリファクタリング版コンポーネント
 * @version 2.0.0
 * @date 2025-05-10
 */

import React, { useState, useCallback } from 'react';
import styles from '../styles/GameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Button from './common/Button';
import ErrorBoundary from './common/ErrorBoundary';
import { PerformanceDebugDisplay } from './common/PerformanceMonitor';
import ProcessingModeSelector from './common/ProcessingModeSelector';
import TypingAreaRefactored from './typing/TypingAreaRefactored';
import GameStatusBar from './typing/GameStatusBar';
import {
  useGameControllerRefactored,
  useGameCompleteHandlerRefactored,
} from './typing/GameControllerRefactored';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_GAME_SCREEN = process.env.NODE_ENV === 'development' && false;

/**
 * リファクタリング版ゲーム画面コンポーネント
 * コンポーネントの責任分離とパフォーマンス最適化
 */
const GameScreenRefactored = () => {
  const { gameState, settings } = useGameContext();
  const { goToScreen } = usePageTransition();

  // 初期化時に設定とゲーム状態をログ出力
  console.log('[GameScreenRefactored] 初期化 - 設定とゲーム状態:', {
    現在の難易度: settings.difficulty,
    ゲーム状態の難易度: gameState.difficulty,
    カテゴリー: gameState.category,
    問題数設定: gameState.requiredProblemCount,
  });

  // パフォーマンスメトリクス表示用の状態
  const [debugInfo, setDebugInfo] = useState({});
  const [lastPressedKey, setLastPressedKey] = useState('');

  // ゲームコントローラーフック
  const {
    typing,
    typingRef,
    currentProblem,
    performanceMetrics,
    getNextKey,
  } = useGameControllerRefactored({
    onDebugInfoUpdate: DEBUG_GAME_SCREEN ? setDebugInfo : null,
    onLastPressedKeyChange: setLastPressedKey,
    goToScreen, // goToScreen関数をGameControllerに渡す
  });

  // ゲーム完了ハンドラー
  useGameCompleteHandlerRefactored(gameState, goToScreen, typingRef);

  // ショートカットボタンのクリックハンドラー
  const handleMenuButtonClick = useCallback(() => {
    goToScreen(SCREENS.MAIN_MENU, {
      playSound: true,
      soundType: 'button',
    });
  }, [goToScreen]);

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={styles.typing_game__wrapper}>
        <div className={styles.typing_game}>
          {/* SF風のコーナー装飾 */}
          <div
            className={styles.typing_game__corner}
            style={{ top: 10, left: 10 }}
          >
            <div className={styles.typing_game__corner_tech} />
          </div>
          <div
            className={styles.typing_game__corner}
            style={{ top: 10, right: 10, transform: 'scaleX(-1)' }}
          >
            <div className={styles.typing_game__corner_tech} />
          </div>
          <div
            className={styles.typing_game__corner}
            style={{ bottom: 10, left: 10, transform: 'scaleY(-1)' }}
          >
            <div className={styles.typing_game__corner_tech} />
          </div>
          <div
            className={styles.typing_game__corner}
            style={{ bottom: 10, right: 10, transform: 'scale(-1)' }}
          >
            <div className={styles.typing_game__corner_tech} />
          </div>

          {/* スキャンラインとドットパターン */}
          <div className={styles.typing_game__scanlines}></div>
          <div className={styles.typing_game__dot_pattern}></div>

          {/* ステータスバー */}
          <GameStatusBar
            solvedCount={gameState.solvedCount}
            requiredCount={gameState.requiredProblemCount || 5}
            streak={gameState.streak || 0}
          />

          {/* メイン画面 */}
          <main className={styles.typing_game__main}>
            {/* タイピングエリア */}
            <TypingAreaRefactored
              typing={typing}
              currentProblem={currentProblem}
              lastPressedKey={lastPressedKey}
              className={styles.typing_game__typing_area}
            />

            {/* 進捗インジケーター */}
            <div className={styles.typing_game__progress}>
              <div
                className={styles.typing_game__progress_bar}
                style={{ width: `${typing?.progressPercentage || 0}%` }}
              />
            </div>

            {/* デバッグ情報 */}
            {DEBUG_GAME_SCREEN && (
              <PerformanceDebugDisplay
                inputLatency={performanceMetrics?.inputLatency || 0}
                fps={debugInfo?.fps}
                stats={typing?.displayStats}
                nextKey={getNextKey()}
                className={styles.typing_game__debug}
              />
            )}
          </main>

          {/* 設定バー */}
          <div className={styles.typing_game__settings}>
            <ProcessingModeSelector />            <Button
              onClick={handleMenuButtonClick}
              variant="secondary"
              size="small"
              className={styles.typing_game__menu_button}
            >
              メニュー
            </Button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default GameScreenRefactored;
