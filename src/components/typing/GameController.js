'use client';

/**
 * GameController.js
 * ゲームコントローラーフック
 * 責任: ゲームロジックとUI連携
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameContext, SCREENS } from '../../contexts/GameContext';
import { useTypingGame } from '../../hooks/useTypingGame';
import soundSystem from '../../utils/SoundUtils';
import { getRandomProblem } from '../../utils/ProblemSelector';
import TypingUtils from '../../utils/TypingUtils'; // KPM計算用にTypingUtilsをインポート
import typingWorkerManager from '../../utils/TypingWorkerManager'; // Worker管理のためのインポート

/**
 * ゲームコントローラーフック（リファクタリング・安定化版 2025年5月12日）
 * @param {Object} options 設定オプション
 * @returns {Object} ゲームコントローラーのAPIと状態
 */
export function useGameController(options = {}) {
  // オプションのセーフティチェック追加
  const {
    onDebugInfoUpdate = null,
    onLastPressedKeyChange = null,
    goToScreen,
  } = options || {};

  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false; // 必要に応じて有効化

  // デバッグログ関数
  const debugLog = useCallback(
    (message, ...args) => {
      if (DEBUG_MODE) console.log(`[GameController] ${message}`, ...args);
    },
    [DEBUG_MODE]
  );

  // Game Contextから状態取得
  const { gameState } = useGameContext();

  // スコア情報の状態管理を追加
  const [scoreInfo, setScoreInfo] = useState({
    score: 0,
    combo: 0,
    maxCombo: 0,
    rank: 'F',
  });

  // 問題状態 - 型チェック付き
  const [currentProblem, setCurrentProblem] = useState(null);

  // 前回のゲーム状態を保存
  const prevGameStateRef = useRef({
    solvedCount: 0,
    requiredProblemCount: 0,
    lastUpdated: Date.now(), // 状態追跡を追加
  });

  // パフォーマンス測定 - 追加情報
  const performanceRef = useRef({
    lastKeyPressTime: 0,
    inputLatency: 0,
    frameDrops: 0,
    totalKeyPresses: 0, // 総タイピング数を記録
  });

  // タイピング参照（循環参照問題を回避）
  const typingRef = useRef(null);

  // 初期化チェック用フラグ
  const isInitializedRef = useRef(false);

  // Game Contextから状態更新関数を取得
  const { setGameState } = useGameContext();

  /**
   * 問題が完了した時の処理
   */ const handleProblemComplete = useCallback(
    (typingStats) => {
      // 効果音再生は省略（リザルト画面の音声とかぶるため）

      // 次の問題数を計算
      const newSolvedCount = gameState.solvedCount + 1;
      // 問題完了のログは削除

      // ゲームクリア判定
      const isGameClear = newSolvedCount >= gameState.requiredProblemCount;

      // すべてのスコア計算は削除 - リファクタリングのための準備

      // スコア計算削除のログを削除

      if (isGameClear) {
        // ゲームクリア時の処理
        // 全問題完了のログを削除

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
        }

        // ゲーム全体の累積キー入力統計の計算
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
        const correctProblemCount = newSolvedCount; // 詳細なデバッグログを削除

        // スコアデータをGameContextに保存
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
          if (DEBUG_MODE)
            console.log('[GameController] リザルト画面に遷移 - スコアなし');
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            soundType: 'result',
            // スコア情報はリザルト画面に渡さない
            gameState: {},
          });
        }, 300);
      } else {
        // ゲームクリアでない場合 - 次の問題に進む処理
        // 問題数と統計情報を更新
        const currentProblemKPM = typing?.typingStats?.displayStats?.kpm || 0;
        const currentProblemCorrectKeys =
          typing?.typingStats?.statsRef?.current?.correctKeyCount || 0;
        const currentProblemMistakes =
          typing?.typingStats?.statsRef?.current?.mistakeCount || 0;
        if (DEBUG_MODE)
          console.log('[GameController] 問題完了統計: ', {
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
        })); // 次の問題をセット（超高速応答バージョン - マイクロタスクを使用）
        queueMicrotask(() => {
          try {
            // 新しい問題を即座に生成（ログは開発環境でのみ出力）
            const nextProblem = getRandomProblem({
              difficulty: gameState.difficulty,
              category: gameState.category,
              excludeRecent: [currentProblem?.displayText],
            });

            // デバッグ情報（開発環境のみ）
            if (DEBUG_MODE) {
              debugLog('次の問題を選択:', {
                displayText: nextProblem?.displayText?.substring(0, 10) + '...',
                難易度: gameState.difficulty,
              });
            }

            // 問題をすぐにセット
            setCurrentProblem(nextProblem);

            // タイピングセッション更新（即時）
            if (typing?.setProblem) {
              // 同期的に問題を設定してレスポンスを最大限に速く
              typing.setProblem(nextProblem);

              // パフォーマンスマーク（開発環境のみ）
              if (
                DEBUG_MODE &&
                typeof performance !== 'undefined' &&
                performance.mark
              ) {
                performance.mark('problem-set-complete');
              }
            }
          } catch (err) {
            // エラーが発生しても処理を継続
            console.error('[GameController] 問題設定エラー:', err);
          }
        });
      }
    },
    [gameState, currentProblem, setGameState, goToScreen]
  );

  /**
   * タイピングゲームカスタムフック
   */
  const typing = useTypingGame({
    initialProblem: currentProblem,
    playSound: true,
    soundSystem,
    onProblemComplete: handleProblemComplete,
    onDebugInfoUpdate,
  });

  // 初期化後にRefに保存
  typingRef.current = typing;

  /**
   * スコア情報の更新処理
   * TypingManiaスタイルのスコアリングシステムをGameControllerレベルで反映
   */
  useEffect(() => {
    if (!typing || !typing.typingSession) return;

    // スコア情報更新のインターバル設定（60fps以下のレートで更新）
    const scoreUpdateInterval = setInterval(() => {
      try {
        // スコア情報の取得（堅牢性の改善）
        const session = typing?.typingSession;
        const combo = session?.getCombo?.() || 0;
        const maxCombo = session?.getMaxCombo?.() || 0;

        // スコアデータの取得（安全なアクセス）
        // typing.scoreDataが未定義の場合の対応
        const scoreData = typing?.scoreData || {};
        const score = scoreData?.score || 0;

        // ランク情報の取得（堅牢に）
        const rank =
          typing?.displayStats?.rank ||
          typing?.typingStats?.displayStats?.rank ||
          'F';

        // デバッグ用にスコア情報をログ出力（開発環境のみ）
        if (DEBUG_MODE && (combo > 5 || score > 5000)) {
          debugLog('現在のスコア情報:', {
            score,
            combo,
            maxCombo,
            rank,
          });
        }

        // スコア情報の状態を更新
        setScoreInfo({
          score,
          combo,
          maxCombo,
          rank,
        });
      } catch (error) {
        console.error('[GameController] スコア情報更新エラー:', error);
      }
    }, 50); // 50ms間隔でスコア情報を更新（約20fps）

    return () => {
      clearInterval(scoreUpdateInterval);
    };
  }, [typing, DEBUG_MODE, debugLog]);

  /**
   * キーイベントハンドラ（超高速パフォーマンス版 2025年5月12日）
   */
  const handleKeyDown = useCallback(
    (e) => {
      // 最小限のセーフティチェック（処理速度優先）
      if (!e?.key) return;

      // Escキーは特別処理（ショートカット）
      if (e.key === 'Escape') {
        goToScreen(SCREENS.MAIN_MENU, { playSound: true, soundType: 'button' });
        return;
      }

      // 入力キー記録を非同期処理に移動してメインスレッドを高速化
      if (onLastPressedKeyChange) {
        queueMicrotask(() => {
          onLastPressedKeyChange(e.key);
        });
      }

      // タイピングセッションのセーフティチェック
      if (!typing || !typing.typingSession) {
        debugLog('タイピングセッションがありません - 入力を無視します');
        return;
      } // パフォーマンス最適化 - 最小限の処理のみをメインスレッドで行う
      try {
        // 入力処理を直接実行して高速化（typingmania-refの実装に着想）
        const result = typing.handleInput(e.key);

        // キー入力カウント更新を非同期処理に移動
        queueMicrotask(() => {
          performanceRef.current.totalKeyPresses++;
          performanceRef.current.lastKeyPressTime = Date.now();

          // パフォーマンスモニタリング（開発環境のみ）
          if (DEBUG_MODE) {
            // メトリクスの更新
            if (typing.performanceMetrics) {
              typing.performanceMetrics.lastKeyTime = Date.now();
            }
          }
        });

        // キー入力イベントの伝播を即座に止める（最高優先度）
        if (result?.success) {
          e.preventDefault();
        }
      } catch (err) {
        // エラー発生時もユーザー体験を維持
        if (process.env.NODE_ENV !== 'production') {
          console.error('[GameController] キー入力処理エラー:', err);
        }
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
          '[GameController] コンポーネントのアンマウント時にWorkerをリセットします'
        );
        typingWorkerManager.reset().catch((err) => {
          console.warn(
            '[GameController] Worker終了中にエラーが発生しました:',
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
      if (DEBUG_MODE)
        console.log('[GameController] 現在の難易度設定:', {
          difficulty: gameState.difficulty,
          category: gameState.category,
        });

      const initialProblem = getRandomProblem({
        difficulty: gameState.difficulty,
        category: gameState.category,
      });
      if (DEBUG_MODE)
        console.log('[GameController] 初期問題をロード:', {
          displayText: initialProblem?.displayText,
          kanaText: initialProblem?.kanaText,
          選択された難易度: gameState.difficulty,
          カテゴリー: gameState.category,
          問題オブジェクト全体: initialProblem,
        });

      setCurrentProblem(initialProblem); // タイピングゲームに問題を設定
      if (initialProblem && typing?.setProblem) {
        if (DEBUG_MODE)
          console.log(
            '[GameController] 初期タイピングセッションに問題を設定:',
            {
              displayText: initialProblem?.displayText,
              time: new Date().toTimeString(),
            }
          );

        // 初期問題設定を確実に行う（わずかな遅延を入れて状態が確実に更新されるようにする）
        setTimeout(() => {
          // 問題設定前のコンポーネント状態をチェック
          if (DEBUG_MODE)
            console.log('[GameController] 問題設定直前の状態:', {
              typing_ready: !!typing,
              currentProblem: currentProblem?.displayText,
              time: new Date().toTimeString(),
            });

          typing.setProblem(initialProblem);

          // 問題設定後の状態を確認
          // 初期問題設定後の状態ログを削除
        }, 20); // 遅延を若干増やして確実に設定されるようにする
      }
    }
  }, [gameState.difficulty, gameState.category, currentProblem, typing]);

  // 返す前の問題状態のログ出力を削除
  return {
    // 状態
    typing,
    typingRef: typingRef, // 修正済みのRef
    currentProblem,
    gameState,
    // 現在のゲーム状態を含むオブジェクト
    gameState: { currentProblem }, // 現在の問題をgameStateの一部として明示的に共有

    // スコア情報
    scoreInfo,

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
export function useGameCompleteHandler(gameState, goToScreen, typingRef) {
  useEffect(() => {
    // 明示的なゲームクリアの場合のみ処理
    if (gameState.isGameClear === true) {
      // ゲーム完了検出のログを削除

      // スコア計算をすべて削除

      // スムーズな遷移のための遅延（500ms以上前に遷移していない場合のみ）
      const lastTransitionTime = window.lastResultTransition || 0;
      const now = Date.now();

      if (now - lastTransitionTime > 500) {
        window.lastResultTransition = now;

        // handleProblemCompleteとの衝突を回避するため少し余裕を持たせる
        setTimeout(() => {
          // リザルト画面遷移のログを削除
          goToScreen(SCREENS.RESULT, {
            playSound: true,
            // スコア情報は渡さない
            gameState: {},
          });
        }, 250);
      }
      // 重複遷移スキップのログを削除
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
