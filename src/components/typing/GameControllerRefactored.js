'use client';

/**
 * GameControllerRefactored.js
 * ゲームコントローラーフックの改良版
 * 責任: ゲームロジックとUI連携
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameContext, SCREENS } from '../../contexts/GameContext';
import { useTypingGameRefactored } from '../../hooks/useTypingGameRefactored';
import soundSystem from '../../utils/SoundUtils';
import { getRandomProblem } from '../../utils/ProblemSelector';

/**
 * ゲームコントローラーフックのリファクタリング版
 * @param {Object} options 設定オプション
 * @returns {Object} ゲームコントローラーのAPIと状態
 */
export function useGameControllerRefactored(options = {}) {
  const {
    onDebugInfoUpdate = null,
    onLastPressedKeyChange = null,
    goToScreen,
  } = options;

  // Game Contextから状態取得
  const { gameState } = useGameContext();

  // 問題状態
  const [currentProblem, setCurrentProblem] = useState(null);

  // 前回のゲーム状態を保存
  const prevGameStateRef = useRef({
    solvedCount: 0,
    requiredProblemCount: 0,
  });

  // パフォーマンス測定
  const performanceRef = useRef({
    lastKeyPressTime: 0,
    inputLatency: 0,
  });  // Game Contextから状態更新関数を取得
  const { setGameState } = useGameContext();

  /**
   * 問題が完了した時の処理
   */
  const handleProblemComplete = useCallback(({ problemKeyCount, problemElapsedMs, problemKPM }) => {
    // 効果音再生
    soundSystem.playSound('clear');

    // 解いた問題数を増やす
    setGameState(prev => ({
      ...prev,
      solvedCount: prev.solvedCount + 1
    }));

    console.log('[GameControllerRefactored] 問題完了 - 解答数更新:', gameState.solvedCount + 1);

    // 次の問題をセット（少し遅延を入れる）
    setTimeout(() => {
      // 新しい問題を取得
      const nextProblem = getRandomProblem({
        difficulty: gameState.difficulty,
        category: gameState.category,
        excludeRecent: [currentProblem?.displayText],
      });      // 問題をセット
      setCurrentProblem(nextProblem);
    }, 500); // 0.5秒遅延
  }, [gameState.difficulty, gameState.category, gameState.solvedCount, currentProblem, setGameState]);

  /**
   * タイピングゲームカスタムフック
   */
  const typing = useTypingGameRefactored({
    initialProblem: currentProblem,
    playSound: true,
    soundSystem,
    onProblemComplete: handleProblemComplete,
    onDebugInfoUpdate,
  });

  /**
   * キーイベントハンドラ
   */
  const handleKeyDown = useCallback((e) => {
    // Escキーでメニューに戻る
    if (e.key === 'Escape') {
      goToScreen(SCREENS.MAIN_MENU, {
        playSound: true,
        soundType: 'button',
      });
      return;
    }

    // タイピングセッションがなければ何もしない
    if (!typing.typingSession) return;

    // パフォーマンス計測開始
    const startTime = performance.now();

    // 入力処理
    const result = typing.handleInput(e.key);

    // パフォーマンス計測終了と記録
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    performanceRef.current.inputLatency = processingTime;
    performanceRef.current.lastKeyPressTime = Date.now();

    // 入力されたキーを通知
    if (onLastPressedKeyChange) {
      onLastPressedKeyChange(e.key);
    }

    // デバッグ情報の更新
    if (typing.performanceMetrics) {
      typing.performanceMetrics.inputLatency = processingTime;
    }

    // キー入力イベントの伝播を止める
    if (result && result.success) {
      e.preventDefault();
    }
  }, [typing, goToScreen, onLastPressedKeyChange]);

  /**
   * 次に入力すべきキーを取得
   */
  const getNextKey = useCallback(() => {
    return typing?.typingSession?.getCurrentExpectedKey() || '';
  }, [typing]);

  /**
   * キーイベントリスナーの設定
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  /**
   * 初期問題のロード
   */
  useEffect(() => {
    // 初回ロード時か問題がない場合は新しい問題をセット
    if (!currentProblem) {
      const initialProblem = getRandomProblem({
        difficulty: gameState.difficulty,
        category: gameState.category,
      });

      console.log('[GameControllerRefactored] 初期問題をロード:', {
        displayText: initialProblem?.displayText,
        kanaText: initialProblem?.kanaText
      });

      setCurrentProblem(initialProblem);

      // タイピングゲームに問題を設定
      if (initialProblem && typing?.setProblem) {
        console.log('[GameControllerRefactored] タイピングセッションに問題を設定');
        typing.setProblem(initialProblem);
      }
    }
  }, [gameState.difficulty, gameState.category, currentProblem, typing]);

  return {
    // 状態
    typing,
    typingRef: typing.typingSessionRef,
    currentProblem,
    gameState,

    // メソッド
    getNextKey,

    // パフォーマンス測定
    performanceMetrics: {
      get inputLatency() {
        return performanceRef.current.inputLatency;
      },
      get lastKeyPressTime() {
        return performanceRef.current.lastKeyPressTime;
      }
    },
  };
}

/**
 * ゲーム完了ハンドラーフック
 */
export function useGameCompleteHandlerRefactored(gameState, goToScreen, typingRef) {
  const solvedCountRef = useRef(gameState.solvedCount);

  // ゲーム完了をチェック
  useEffect(() => {
    // デバッグログ
    console.log(`[GameCompleteHandler] 問題進捗: ${gameState.solvedCount}/${gameState.requiredProblemCount}`);

    // 解いた問題数が必要数に達した場合
    if (gameState.solvedCount >= gameState.requiredProblemCount) {
      console.log('[GameCompleteHandler] ゲーム完了条件を満たしました！');

      // 同じ完了状態を複数回処理しないようにする
      if (gameState.solvedCount !== solvedCountRef.current) {
        solvedCountRef.current = gameState.solvedCount;
        console.log('[GameCompleteHandler] 結果画面に遷移します...');

        // セッションがあれば終了
        if (typingRef?.current) {
          typingRef.current = null;
        }

        // 少し遅延させて結果画面に遷移
        setTimeout(() => {
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            soundType: 'result',
          });
        }, 500); // 0.5秒の遅延
      }
    }
  }, [gameState.solvedCount, gameState.requiredProblemCount, typingRef, goToScreen]);
}
