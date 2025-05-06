'use client';

import React from 'react';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { usePageTransition } from './TransitionManager';
import GameContainer from './typing/GameContainer';

/**
 * タイピングゲーム画面コンポーネント
 * MCPと連携した最適化バージョン
 */
const GameScreen = () => {
  // コンテキストから状態を取得
  const { gameState } = useGameContext();
  const { goToScreen } = usePageTransition();

  // ゲームクリア状態の場合は何も表示せず、リザルト画面へ遷移
  if (gameState.isGameClear === true) {
    console.log('[GameScreen] ゲームクリア状態のため、リザルト画面へ遷移します');

    // 少し遅延させてから画面遷移（レンダリングループを防止）
    setTimeout(() => {
      goToScreen(SCREENS.RESULT);
    }, 0);

    return null;
  }

  // 新しいGameContainerコンポーネントを使用
  return <GameContainer />;
};

export default GameScreen;
