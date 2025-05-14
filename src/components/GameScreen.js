'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
 * リファクタリング済み（2025年5月8日, 5月9日, 5月11日）- コンポーネント分離最適化版
 * UI部分とロジック部分を明確に分離
 * 5月11日: リファクタリング版のコントローラーを使用するように更新
 */
const GameScreen = () => {
  const { gameState } = useGameContext();
  const { goToScreen } = usePageTransition();
  // リファクタリング完了のログは開発が終わったため削除

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

  // ESCキーのショートカット機能を追加
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleMenuButtonClick();
      }
    };

    // キーボードイベントリスナーを登録
    window.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMenuButtonClick]);

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    return null;
  }

  return (<ErrorBoundary>
    <div className={styles.typing_game__wrapper}>
      <div className={styles.typing_game}>
        {/* コーナー装飾、スキャンライン、ドットパターンを削除 */}

        {/* ステータスバー */}
        <GameStatusBar
          solvedCount={gameState.solvedCount}
          requiredCount={gameState.requiredProblemCount || 5}
          typingStats={typing?.stats || {}}
        />          {/* メイン画面 */}          <main className={styles.typing_game__main}>            {/* タイピングエリア */}            <TypingArea
          typing={typing}
          currentProblem={typing?.typingSession?.problem || currentGameState?.currentProblem || gameState.currentProblem}
          lastPressedKey={lastPressedKey}
          className={styles.typing_game__typing_area}
        />

          {/* デバッグ情報 */}
          {DEBUG_GAME_SCREEN && (
            <PerformanceDebugDisplay
              inputLatency={performanceMetrics?.inputLatency || 0}
              fps={debugInfo?.fps}
              stats={typing?.displayStats}
              nextKey={getNextKey()}
              className={styles.typing_game__debug}
            />
          )}        </main>

        {/* SF風のショートカットメニューボタン */}
        <button
          onClick={handleMenuButtonClick}
          className={styles.typing_game__menu_button}
        >
          <span>Esc:</span> メニュー
        </button>
      </div>
    </div>
  </ErrorBoundary>
  );
};

export default GameScreen;
