'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from '../styles/GameScreen.module.css';
import canvasStyles from '../styles/CanvasGameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Button from './common/Button';
import ErrorBoundary from './common/ErrorBoundary';
import { PerformanceDebugDisplay } from './common/PerformanceMonitor';
// CanvasTypingAreaをインポート（通常のTypingAreaから置き換え）
import CanvasTypingArea from './typing/CanvasTypingArea';
import GameStatusBar from './typing/GameStatusBar';
import {
  useGameController,
  useGameCompleteHandler,
} from './typing/GameController';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_GAME_SCREEN = process.env.NODE_ENV === 'development' && false;

/**
 * タイピングゲーム画面コンポーネント
 * Canvas描画版 (2025年5月15日) - DOM要素からCanvasへ移行
 * UI部分とロジック部分を明確に分離
 */
const GameScreen = () => {
  const { gameState } = useGameContext();
  const { goToScreen } = usePageTransition();
  
  // キーハンドリング用のref
  const canvasWrapperRef = useRef(null);

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
    scoreInfo, // スコア情報を取得
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

  // キャンバスにフォーカスを当てる
  useEffect(() => {
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.focus();
    }
  }, []);

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className={styles.typing_game__wrapper}>
        <div className={styles.typing_game}>
          {/* ステータスバー */}
          <GameStatusBar
            solvedCount={gameState.solvedCount}
            requiredCount={gameState.requiredProblemCount || 5}
            typingStats={typing?.stats || {}}
            scoreInfo={scoreInfo} // スコア情報を渡す
          />
            {/* メイン画面 */}
          <main 
            className={styles.typing_game__main}
            ref={canvasWrapperRef}
            tabIndex={0} // キーボードイベントを受け取れるようにする
          >
            {/* Canvas描画タイピングエリア */}
            <div className={canvasStyles.typing_game__canvas_container}>
              <CanvasTypingArea
                typing={typing}
                currentProblem={
                  typing?.typingSession?.problem ||
                  currentGameState?.currentProblem ||
                  gameState.currentProblem
                }
                lastPressedKey={lastPressedKey}
                className={styles.typing_game__typing_area}
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
