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
  });

  // タイピング参照（循環参照問題を回避）
  const typingRef = useRef(null);

  // Game Contextから状態更新関数を取得
  const { setGameState } = useGameContext();  /**
   * 問題が完了した時の処理
   */  const handleProblemComplete = useCallback((typingStats) => {
    // 効果音再生
    soundSystem.playSound('clear');

    // 次の問題数を計算
    const newSolvedCount = gameState.solvedCount + 1;
    console.log('[GameControllerRefactored] 問題完了 - 解答数更新:', newSolvedCount);

    // ゲームクリア判定
    const isGameClear = newSolvedCount >= gameState.requiredProblemCount;

    // すべてのスコア計算は削除 - リファクタリングのための準備

    console.log('[GameControllerRefactored] スコア計算は削除されました'); if (isGameClear) {
      // ゲームクリア時の処理
      console.log('[GameControllerRefactored] 全問題完了 - リザルト画面に遷移します');

      // 終了時間を記録
      const endTime = Date.now();
      const startTime = gameState.startTime || typing.typingStats?.statsRef?.current?.startTime || endTime;
      const elapsedTimeMs = endTime - startTime;

      // KPM計算 - 問題ごとのKPMの平均値を優先
      let averageKPM = 0;
      // 各問題のKPMを累積
      const allProblemKPMs = [
        ...(gameState.problemKPMs || []),
        typing?.typingStats?.displayStats?.kpm || 0
      ].filter(kpm => kpm > 0);

      if (allProblemKPMs && allProblemKPMs.length > 0) {
        // 問題ごとのKPMの平均を計算
        averageKPM = allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0) / allProblemKPMs.length;
      } else {
        // 問題データがない場合は単純計算
        const totalCorrectKeyCount = typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
        averageKPM = Math.floor(totalCorrectKeyCount / (elapsedTimeMs / 60000));
      }
      // キー入力の統計
      const correctKeyCount = typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
      const missCount = typing?.typingStats?.statsRef?.current?.mistakeCount || 0;
      const totalKeystrokes = correctKeyCount + missCount;
      const accuracy = totalKeystrokes > 0 ? Math.round((correctKeyCount / totalKeystrokes) * 100) : 100;
      // 問題数の統計（実際に解いた問題数）
      const correctProblemCount = newSolvedCount;

      console.log('[GameControllerRefactored] 統計情報を整理:', {
        キー正解数: correctKeyCount,
        キーミス数: missCount,
        問題正解数: correctProblemCount, // 問題数として正しく表示
        正確率: accuracy,
        KPM: averageKPM
      });

      // スコアデータをGameContextに保存
      setGameState(prev => ({
        ...prev,
        solvedCount: newSolvedCount,
        isGameClear: true,
        problemKPMs: allProblemKPMs,
        startTime: startTime,
        endTime: endTime,
        // リザルト画面で使用する統計情報
        stats: {
          kpm: Math.round(averageKPM * 10) / 10, // 小数点1位までの平均KPM
          correctCount: correctProblemCount, // 問題の正解数に修正
          missCount: missCount,
          accuracy: accuracy,
          rank: typing?.typingStats?.displayStats?.rank || 'F',
          problemKPMs: allProblemKPMs,
          elapsedTimeMs: elapsedTimeMs,
          totalTime: elapsedTimeMs / 1000
        }
      }));

      // リザルト画面に遷移
      window.lastResultTransition = Date.now();

      setTimeout(() => {
        console.log('[GameControllerRefactored] handleProblemComplete: リザルト画面に遷移 - スコアなし');
        goToScreen(SCREENS.RESULT, {
          playSound: true,
          soundType: 'result',
          // スコア情報はリザルト画面に渡さない
          gameState: {}
        });
      }, 300);
    } else {
      // ゲームクリアでない場合 - 次の問題に進む処理

      // 問題数だけ更新する
      setGameState(prev => ({
        ...prev,
        solvedCount: newSolvedCount,
      }));

      // 次の問題をセット（少し遅延を入れる）
      setTimeout(() => {
        // 新しい問題を取得
        const nextProblem = getRandomProblem({
          difficulty: gameState.difficulty,
          category: gameState.category,
          excludeRecent: [currentProblem?.displayText],
        });

        // 問題をセット
        setCurrentProblem(nextProblem);
      }, 500); // 0.5秒遅延
    }
  }, [gameState, currentProblem, setGameState, goToScreen]);
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

  // 初期化後にRefに保存
  typingRef.current = typing;

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
    typingRef: typingRef,  // 修正済みのRef
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
 * バックアップとしての役割を担う（主な遷移ロジックはhandleProblemCompleteで処理）
 */
export function useGameCompleteHandlerRefactored(gameState, goToScreen, typingRef) {
  useEffect(() => {
    // 明示的なゲームクリアの場合のみ処理
    if (gameState.isGameClear === true) {
      console.log('[GameCompleteHandlerRefactored] ゲーム完了を検出しました - スコア計算は行いません');

      // スコア計算をすべて削除

      // スムーズな遷移のための遅延（500ms以上前に遷移していない場合のみ）
      const lastTransitionTime = window.lastResultTransition || 0;
      const now = Date.now();

      if (now - lastTransitionTime > 500) {
        window.lastResultTransition = now;

        // handleProblemCompleteとの衝突を回避するため少し余裕を持たせる
        setTimeout(() => {
          console.log('[GameCompleteHandlerRefactored] リザルト画面に遷移します - スコアなし');
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            // スコア情報は渡さない
            gameState: {}
          });
        }, 250);
      } else {
        console.log(`[GameCompleteHandlerRefactored] ${now - lastTransitionTime}ms以内に遷移したため、重複遷移をスキップします`);
      }
    }
  }, [gameState, goToScreen, typingRef]);
}
