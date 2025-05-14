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
import TypingUtils from '../../utils/TypingUtils'; // KPM計算用にTypingUtilsをインポート
import typingWorkerManager from '../../utils/TypingWorkerManager'; // Worker管理のためのインポートを追加

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
  const { setGameState } = useGameContext();
  /**
   * 問題が完了した時の処理
   */ const handleProblemComplete = useCallback(
    (typingStats) => {
      // 効果音再生は省略（リザルト画面の音声とかぶるため）

      // 次の問題数を計算
      const newSolvedCount = gameState.solvedCount + 1;
      console.log(
        '[GameControllerRefactored] 問題完了 - 解答数更新:',
        newSolvedCount
      );

      // ゲームクリア判定
      const isGameClear = newSolvedCount >= gameState.requiredProblemCount;

      // すべてのスコア計算は削除 - リファクタリングのための準備

      console.log('[GameControllerRefactored] スコア計算は削除されました');
      if (isGameClear) {
        // ゲームクリア時の処理
        console.log(
          '[GameControllerRefactored] 全問題完了 - リザルト画面に遷移します'
        );

        // 終了時間を記録
        const endTime = Date.now();
        const startTime =
          gameState.startTime ||
          typing.typingStats?.statsRef?.current?.startTime ||
          endTime;
        const elapsedTimeMs = endTime - startTime;

        // KPM計算 - 問題ごとのKPMの平均値を優先
        let averageKPM = 0;
        // 各問題のKPMを累積
        const allProblemKPMs = [
          ...(gameState.problemKPMs || []),
          typing?.typingStats?.displayStats?.kpm || 0,
        ].filter((kpm) => kpm > 0);

        if (allProblemKPMs && allProblemKPMs.length > 0) {
          // 問題ごとのKPMの平均を計算
          averageKPM =
            allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0) /
            allProblemKPMs.length;
        } else {
          // 問題データがない場合は単純計算
          const totalCorrectKeyCount =
            typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
          averageKPM = Math.floor(
            totalCorrectKeyCount / (elapsedTimeMs / 60000)
          );
        } // ゲーム全体の累積キー入力統計の計算
        // 最後のお題のキー入力状況
        const lastProblemCorrectKeys =
          typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
        const lastProblemMissKeys =
          typing?.typingStats?.statsRef?.current?.mistakeCount || 0;

        // 累積入力数の計算（全問題の累積）
        const totalCorrectKeyCount =
          (gameState.totalCorrectKeys || 0) + lastProblemCorrectKeys;
        const totalMissCount =
          (gameState.totalMissKeys || 0) + lastProblemMissKeys;
        const totalKeystrokes = totalCorrectKeyCount + totalMissCount;
        const accuracy =
          totalKeystrokes > 0
            ? Math.round((totalCorrectKeyCount / totalKeystrokes) * 100)
            : 100;

        // 問題数は「解いた問題数」を表示
        const correctProblemCount = newSolvedCount;

        // より詳細なデバッグログ
        console.log('[GameControllerRefactored] 統計情報の詳細:', {
          累積キー正解数: totalCorrectKeyCount,
          累積キーミス数: totalMissCount,
          最後の問題キー正解数: lastProblemCorrectKeys,
          最後の問題キーミス数: lastProblemMissKeys,
          問題正解数: correctProblemCount,
          累積打鍵総数: totalKeystrokes,
          正確率: accuracy,
          KPM: averageKPM,
          問題別KPM: allProblemKPMs,
        }); // スコアデータをGameContextに保存
        setGameState((prev) => ({
          ...prev,
          solvedCount: newSolvedCount,
          isGameClear: true,
          problemKPMs: allProblemKPMs,
          startTime: startTime,
          endTime: endTime,
          // 全問題の累積統計を保存
          totalCorrectKeys: totalCorrectKeyCount,
          totalMissKeys: totalMissCount,
          // リザルト画面で使用する統計情報（従来モードと同じ形式で提供）
          stats: {
            kpm: Math.round(averageKPM * 10) / 10, // 小数点1位までの平均KPM
            correctCount: totalCorrectKeyCount, // 累積の正解キー数
            missCount: totalMissCount, // 累積のミス入力数
            accuracy: accuracy, // 正確率（累積値から計算）
            rank: TypingUtils.getRank(averageKPM) || 'F',
            problemKPMs: allProblemKPMs,
            elapsedTimeMs: elapsedTimeMs,
            totalTime: elapsedTimeMs / 1000,
            solvedProblems: correctProblemCount, // 別途、解いた問題数も追加
          },
        }));

        // リザルト画面に遷移
        window.lastResultTransition = Date.now();

        setTimeout(() => {
          console.log(
            '[GameControllerRefactored] handleProblemComplete: リザルト画面に遷移 - スコアなし'
          );
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            soundType: 'result',
            // スコア情報はリザルト画面に渡さない
            gameState: {},
          });
        }, 300);
      } else {
        // ゲームクリアでない場合 - 次の問題に進む処理      // 問題数と統計情報を更新
        const currentProblemKPM = typing?.typingStats?.displayStats?.kpm || 0;
        const currentProblemCorrectKeys =
          typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
        const currentProblemMistakes =
          typing?.typingStats?.statsRef?.current?.mistakeCount || 0;

        console.log('[GameControllerRefactored] 問題完了統計: ', {
          KPM: currentProblemKPM,
          正解キー数: currentProblemCorrectKeys,
          ミス数: currentProblemMistakes,
        });

        // 問題ごとのKPM情報を蓄積
        const updatedProblemKPMs = [
          ...(gameState.problemKPMs || []),
          currentProblemKPM,
        ].filter((kpm) => kpm > 0);

        // 全問題の累積統計を更新
        setGameState((prev) => ({
          ...prev,
          solvedCount: newSolvedCount,
          problemKPMs: updatedProblemKPMs,
          // 累積打鍵数も追跡
          totalCorrectKeys:
            (prev.totalCorrectKeys || 0) + currentProblemCorrectKeys,
          totalMissKeys: (prev.totalMissKeys || 0) + currentProblemMistakes,
        })); // 次の問題をセット（最小限のディレイで素早く表示）
        setTimeout(() => {
          // 難易度設定の確認ログ
          console.log('[GameControllerRefactored] 次の問題選択 - 難易度設定:', {
            difficulty: gameState.difficulty,
            category: gameState.category,
          });

          // 新しい問題を取得
          const nextProblem = getRandomProblem({
            difficulty: gameState.difficulty,
            category: gameState.category,
            excludeRecent: [currentProblem?.displayText],
          });

          // 選択された問題の詳細をログ
          console.log('[GameControllerRefactored] 次の問題を選択:', {
            displayText: nextProblem?.displayText,
            kanaText: nextProblem?.kanaText,
            選択された難易度: gameState.difficulty,
          });

          // 問題をセット
          setCurrentProblem(nextProblem);

          // タイピングオブジェクトが存在し、setProblemメソッドがある場合は問題を設定
          if (typing && typing.setProblem) {
            console.log(
              '[GameControllerRefactored] 次の問題をタイピングセッションに設定します'
            );
            typing.setProblem(nextProblem);
          } else {
            console.warn(
              '[GameControllerRefactored] タイピングオブジェクトまたはsetProblem関数がありません'
            );
          }
        }, 50); // 0.05秒のわずかなディレイ（従来モードと同等）
      }
    },
    [gameState, currentProblem, setGameState, goToScreen]
  );
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
  const handleKeyDown = useCallback(
    (e) => {
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
    },
    [typing, goToScreen, onLastPressedKeyChange]
  );

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

      // Workerの終了処理を追加
      // メッセージチャネルが閉じられたエラーを防ぐため、コンポーネントのアンマウント時に
      // 明示的にリソースを解放する
      if (
        typingWorkerManager &&
        typeof typingWorkerManager.reset === 'function'
      ) {
        console.log(
          '[GameControllerRefactored] コンポーネントのアンマウント時にWorkerをリセットします'
        );
        typingWorkerManager.reset().catch((err) => {
          console.warn(
            '[GameControllerRefactored] Worker終了中にエラーが発生しました:',
            err
          );
        });
      }
    };
  }, [handleKeyDown]);
  /**
   * 初期問題のロード
   */
  useEffect(() => {
    // 初回ロード時か問題がない場合は新しい問題をセット
    if (!currentProblem) {
      // 難易度設定の確認とデバッグログ
      console.log('[GameControllerRefactored] 現在の難易度設定:', {
        difficulty: gameState.difficulty,
        category: gameState.category,
      });

      const initialProblem = getRandomProblem({
        difficulty: gameState.difficulty,
        category: gameState.category,
      });

      console.log('[GameControllerRefactored] 初期問題をロード:', {
        displayText: initialProblem?.displayText,
        kanaText: initialProblem?.kanaText,
        選択された難易度: gameState.difficulty,
        カテゴリー: gameState.category,
        問題オブジェクト全体: initialProblem,
      });

      setCurrentProblem(initialProblem);

      // タイピングゲームに問題を設定
      if (initialProblem && typing?.setProblem) {
        console.log(
          '[GameControllerRefactored] タイピングセッションに問題を設定'
        );
        typing.setProblem(initialProblem);
      }
    }
  }, [gameState.difficulty, gameState.category, currentProblem, typing]); // 返す前に問題状態のログ出力
  console.log('[GameControllerRefactored] 現在の状態:', {
    currentProblem: currentProblem?.displayText,
    'typing.displayInfo': typing?.displayInfo ? 'あり' : 'なし',
    'typingRefあり?': typingRef.current ? 'あり' : 'なし',
    'gameState.currentProblem': gameState.currentProblem?.displayText,
  });

  return {
    // 状態
    typing,
    typingRef: typingRef, // 修正済みのRef
    currentProblem,
    gameState,
    // 現在のゲーム状態を含むオブジェクト
    gameState: { currentProblem }, // 現在の問題をgameStateの一部として明示的に共有

    // メソッド
    getNextKey,

    // パフォーマンス測定
    performanceMetrics: {
      get inputLatency() {
        return performanceRef.current.inputLatency;
      },
      get lastKeyPressTime() {
        return performanceRef.current.lastKeyPressTime;
      },
    },
  };
}

/**
 * ゲーム完了ハンドラーフック
 * バックアップとしての役割を担う（主な遷移ロジックはhandleProblemCompleteで処理）
 */
export function useGameCompleteHandlerRefactored(
  gameState,
  goToScreen,
  typingRef
) {
  useEffect(() => {
    // 明示的なゲームクリアの場合のみ処理
    if (gameState.isGameClear === true) {
      console.log(
        '[GameCompleteHandlerRefactored] ゲーム完了を検出しました - スコア計算は行いません'
      );

      // スコア計算をすべて削除

      // スムーズな遷移のための遅延（500ms以上前に遷移していない場合のみ）
      const lastTransitionTime = window.lastResultTransition || 0;
      const now = Date.now();

      if (now - lastTransitionTime > 500) {
        window.lastResultTransition = now;

        // handleProblemCompleteとの衝突を回避するため少し余裕を持たせる
        setTimeout(() => {
          console.log(
            '[GameCompleteHandlerRefactored] リザルト画面に遷移します - スコアなし'
          );
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            // スコア情報は渡さない
            gameState: {},
          });
        }, 250);
      } else {
        console.log(
          `[GameCompleteHandlerRefactored] ${
            now - lastTransitionTime
          }ms以内に遷移したため、重複遷移をスキップします`
        );
      }
    }
  }, [gameState, goToScreen, typingRef]);
}

/**
 * Workerクリーンアップ
 * コンポーネントのアンマウント時にWorkerを適切に終了
 */
export function cleanupTypingWorker() {
  // タイピングWorkerのクリーンアップ
  typingWorkerManager.cleanup();
}
