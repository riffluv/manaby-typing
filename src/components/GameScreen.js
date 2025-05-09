'use client';

import React, { useState, useCallback } from 'react';
import styles from '../styles/GameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Button from './common/Button';
import ErrorBoundary from './common/ErrorBoundary';
import { PerformanceDebugDisplay } from './common/PerformanceMonitor';
import TypingArea from './typing/TypingArea';
import GameStatusBar from './typing/GameStatusBar';
import {
  useGameController,
  useGameCompleteHandler,
} from './typing/GameController';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_GAME_SCREEN = process.env.NODE_ENV === 'development' && false;

/**
 * タイピングゲーム画面コンポーネント
 * リファクタリング済み（2025年5月8日, 5月9日）- コンポーネント分離最適化版
 * UI部分とロジック部分を明確に分離
 */
const GameScreen = () => {
  const { gameState } = useGameContext();
  const { goToScreen } = usePageTransition();

  // パフォーマンスメトリクス表示用の状態
  const [debugInfo, setDebugInfo] = useState({});
  const [lastPressedKey, setLastPressedKey] = useState('');

  // ゲームコントローラーフック
  const {
    typing,
    typingRef,
    performanceMetrics,
    getNextKey,
    gameState: currentGameState,
  } = useGameController({
    onDebugInfoUpdate: DEBUG_GAME_SCREEN ? setDebugInfo : null,
    onLastPressedKeyChange: setLastPressedKey,
    goToScreen, // goToScreen関数をGameControllerに渡す
  });

  // ゲーム完了ハンドラー
  useGameCompleteHandler(gameState, goToScreen, typingRef);

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
            typingStats={typing?.stats || {}}
          />

          <motion.main
            className={styles.typing_game__main}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className={styles.typing_game__content}>
              {/* タイピングエリア */}
              <TypingArea
                typing={typing}
                currentProblem={gameState.currentProblem}
                lastPressedKey={lastPressedKey}
              />
            </div>
          </motion.main>

          {/* ショートカットとステータス情報 */}
          <motion.div
            className={styles.typing_game__shortcuts}
            onClick={handleMenuButtonClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
          >
            <span className={styles.typing_game__shortcut_item}>
              <kbd>Esc</kbd>{' '}
              <span className={styles.typing_game__shortcut_text}>
                メニューへ
              </span>
            </span>
          </motion.div>

          {/* パフォーマンス情報（開発モードでのデバッグ用） */}
          {DEBUG_GAME_SCREEN && (
            <PerformanceDebugDisplay metrics={performanceMetrics} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default GameScreen;
