'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameContext, SCREENS } from '../../contexts/GameContext';
import { useTypingGame } from '../../hooks/useTypingGame';
import soundSystem from '../../utils/SoundUtils';
import { usePerformanceMonitor } from '../common/PerformanceMonitor';

/**
 * ゲームコントローラーコンポーネント
 * タイピングゲームのロジック制御を一元管理する
 * UI要素とロジックを分離することでコード保守性を向上
 */
export function useGameController({
  onDebugInfoUpdate = null,
  onLastPressedKeyChange = null,
}) {
  const { gameState, setGameState, problems } = useGameContext();

  // typingの参照を保持するためのref
  const typingRef = useRef(null);

  // ローカルタイピングモデル参照（パフォーマンス最適化用）
  const localTypingModelRef = useRef(null);

  // 最後に押されたキー（キーボード表示用）
  const [lastPressedKey, setLastPressedKey] = useState('');

  // サウンド読み込み状態のフラグ
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

  // パフォーマンスモニタリングを設定
  const { metrics, recordInputEvent } = usePerformanceMonitor({
    onMetricsUpdate: onDebugInfoUpdate,
  });

  // 問題完了時のコールバック
  const handleProblemComplete = useCallback(
    (problemStats) => {
      console.debug(
        '【handleProblemComplete】問題完了コールバック発火:',
        problemStats
      );

      const solvedCount = gameState.solvedCount + 1;
      const isGameClear = solvedCount >= requiredProblemCount;

      // problemStatsから問題ごとの情報を取得
      const { problemKPM = 0, updatedProblemKPMs = [] } = problemStats;

      if (isGameClear) {
        // 終了時間を記録
        const endTime = Date.now();
        const startTime =
          gameState.startTime || typingRef.current?.stats?.startTime || endTime;
        const elapsedTimeMs = endTime - startTime;

        // タイピングフックから詳細なデータを取得
        const typingStats = typingRef.current?.stats || {};

        // 全問題の累積正解キー数を計算
        const currentProblemCorrectKeys = typingStats.correctCount || 0;
        const previousCorrectKeyCount = gameState.totalCorrectKeyCount || 0;
        const totalCorrectKeyCount =
          previousCorrectKeyCount + currentProblemCorrectKeys;

        // 全問題の累積ミス数を計算
        const currentProblemMissCount = typingStats.missCount || 0;
        const previousMissCount = gameState.totalMissCount || 0;
        const totalMissCount = previousMissCount + currentProblemMissCount;

        // 問題ごとのKPMを累積
        const allProblemKPMs = [
          ...(gameState.problemKPMs || []),
          problemKPM,
        ].filter((kpm) => kpm > 0);

        // KPM計算 - 問題ごとのKPMの平均値を優先
        let averageKPM = 0;
        if (allProblemKPMs && allProblemKPMs.length > 0) {
          // 問題ごとのKPMの平均を計算
          averageKPM =
            allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0) /
            allProblemKPMs.length;
        } else {
          // 問題データがない場合は単純計算
          averageKPM = Math.floor(
            totalCorrectKeyCount / (elapsedTimeMs / 60000)
          );
        }

        // KPMが不正な値の場合は補正
        if (averageKPM <= 0 && totalCorrectKeyCount > 0) {
          averageKPM = 1;
        }

        // 正確性の計算を修正（正確性 = 正解数 / (正解数 + ミス数) * 100）
        const totalKeystrokes = totalCorrectKeyCount + totalMissCount;
        const accuracy =
          totalKeystrokes > 0
            ? (totalCorrectKeyCount / totalKeystrokes) * 100
            : 100;

        // 統計情報の計算
        const stats = {
          totalTime: typingStats.elapsedTimeSeconds || elapsedTimeMs / 1000,
          correctCount: totalCorrectKeyCount, // 全問題の累積正解キー数を使用
          missCount: totalMissCount, // 全問題の累積ミス数を使用
          accuracy: accuracy, // 計算済みの正確性を使用
          kpm: Math.floor(averageKPM), // 平均KPM値を床関数で整数化
          problemKPMs: allProblemKPMs, // 全問題のKPM値を保持
          elapsedTimeMs: elapsedTimeMs, // リザルト画面でも使用できるように
        };

        // queueMicrotaskを使用してスムーズにステートを更新
        queueMicrotask(() => {
          // 1回のみの状態更新で、すべてのデータを一度に設定
          setGameState((prevState) => ({
            ...prevState,
            solvedCount,
            typedCount:
              typingRef.current?.typingSession?.typedRomaji?.length || 0,
            playTime: Math.floor(stats.totalTime),
            startTime: startTime,
            endTime: endTime,
            problemKPMs: updatedProblemKPMs,
            uiCompletePercent: 100,
            isGameClear: true, // 即座に画面遷移を行う
            stats: stats, // 必ず統計情報を含める
            totalCorrectKeyCount: totalCorrectKeyCount, // 累積正解キー数を更新
            totalMissCount: totalMissCount, // 累積ミス数を更新
          }));
        });

        return;
      }

      // 次の問題へ進む
      try {
        const nextProblemIndex =
          (problems.indexOf(gameState.currentProblem) + 1) % problems.length;
        const nextProblem = problems[nextProblemIndex];

        // 現在の問題の正解キー数とミス数を取得
        const currentCorrectKeys = typingRef.current?.stats?.correctCount || 0;
        const currentMissCount = typingRef.current?.stats?.missCount || 0;

        // これまでの累積カウンターを取得
        const previousCorrectKeyCount = gameState.totalCorrectKeyCount || 0;
        const previousMissCount = gameState.totalMissCount || 0;

        // 累積カウンターを更新
        const totalCorrectKeyCount =
          previousCorrectKeyCount + currentCorrectKeys;
        const totalMissCount = previousMissCount + currentMissCount;

        // queueMicrotaskを使用してスムーズにステートを更新
        queueMicrotask(() => {
          setGameState({
            ...gameState,
            currentProblem: nextProblem,
            currentProblemIndex: nextProblemIndex,
            solvedCount,
            problemKPMs: updatedProblemKPMs, // 各問題のKPM値の配列を更新
            currentProblemStartTime: null, // 次の問題の開始時間はまだ設定しない
            currentProblemKeyCount: 0, // 次の問題用のカウンターをリセット
            totalCorrectKeyCount: totalCorrectKeyCount, // 累積正解キー数を更新
            totalMissCount: totalMissCount, // 累積ミス数を更新
          });
        });

        // 正解音は処理済み
      } catch (error) {
        console.error('次の問題の設定中にエラーが発生しました:', error);
      }
    },
    [gameState, requiredProblemCount, problems, setGameState]
  );

  // カスタムフックの使用 - 現在の問題に対するタイピングセッションを管理
  const typing = useTypingGame({
    initialProblem: gameState.currentProblem,
    playSound: soundsLoaded,
    onProblemComplete: handleProblemComplete,
  });

  // typingオブジェクトの参照を更新
  useEffect(() => {
    typingRef.current = typing;

    // ローカルタイピングモデルを初期化（パフォーマンス向上のため）
    if (typing && typing.typingSession) {
      try {
        // 高速処理用のローカルインスタンスを作成
        localTypingModelRef.current = {
          // ローカル処理用のメソッド
          processLocalInput: (key) => {
            const result = {
              success: false,
              processed: false,
            };

            // 現在のタイピングセッションがなければ処理しない
            if (!typing.typingSession) return result;

            // 現在期待されるキーとの比較（高速化のため直接アクセス）
            const expectedKey = typing.typingSession.getCurrentExpectedKey?.();

            // 直接キーマッチング（高速パス）
            if (expectedKey === key) {
              result.success = true;
              result.processed = true;
              return result;
            }

            return result;
          },
        };
      } catch (err) {
        console.error('ローカルタイピングモデルの初期化エラー:', err);
      }
    }
  }, [typing]);

  // サウンドの初期化 - パフォーマンス最適化版
  useEffect(() => {
    let isMounted = true; // クリーンアップ用のフラグ

    const initSound = async () => {
      try {
        // AudioContextを確実に再開
        soundSystem.resume();

        // 効果音のプリロードを並列で行う（パフォーマンス向上）
        const preloadSounds = ['success', 'error', 'button'];
        await Promise.all(
          preloadSounds.map((name) =>
            soundSystem.loadSound(name, soundSystem.soundPresets[name])
          )
        );

        // 残りの効果音は後回し
        if (isMounted) {
          queueMicrotask(() => {
            soundSystem
              .loadSound('complete', soundSystem.soundPresets.complete)
              .catch((e) => console.error('効果音のロードに失敗:', e));
          });
        }

        // コンポーネントがアンマウントされていなければ状態を更新
        if (isMounted) {
          setSoundsLoaded(true);
        }
      } catch (err) {
        console.error('[GameController] サウンドシステムの初期化エラー:', err);
        // エラーがあっても最低限の機能は使えるようにする
        if (isMounted) {
          setSoundsLoaded(true);
        }
      }
    };

    initSound();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * キー入力ハンドラー - 高速レスポンス処理版
   */
  const handleKeyDown = useCallback(
    (e) => {
      // ゲームクリア時は何もしない
      if (gameState.isGameClear === true) {
        return;
      }

      // 入力に関係のないキーは無視（高速処理）
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // 特殊キーは適切に処理
      if (e.key === 'Enter') {
        return;
      }

      // IME確定中の場合は処理しない
      if (e.isComposing) {
        return;
      }

      // 最後に押されたキーを更新（キーボード表示用）
      setLastPressedKey(e.key);
      if (onLastPressedKeyChange) {
        onLastPressedKeyChange(e.key);
      }

      // AudioContextの状態がsuspendedの場合は再開
      soundSystem.resume();

      // 最初のキー入力時にタイマー計測を開始
      if (!gameState.hasStartedTyping) {
        const now = Date.now();
        setGameState((prevState) => ({
          ...prevState,
          startTime: now, // 最初のキー入力時点からタイマー計測を開始
          hasStartedTyping: true,
          currentProblemStartTime: now, // 最初の問題の開始時間も設定
        }));
      }

      // パフォーマンス測定開始
      const inputPerf = recordInputEvent();

      // typingのhandleInputを直接呼び出し、パフォーマンスを最大化
      try {
        typing.handleInput(e.key);
        // パフォーマンス測定終了
        inputPerf.end();
      } catch (err) {
        console.error('タイピング処理エラー:', err);
      }
    },
    [
      gameState.isGameClear,
      gameState.hasStartedTyping,
      typing,
      setGameState,
      onLastPressedKeyChange,
      recordInputEvent,
    ]
  );

  // document全体で物理キー入力を受け付ける
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // 次に入力すべきキーを取得
  const getNextKey = useCallback(() => {
    return typing.typingSession?.getCurrentExpectedKey?.() || '';
  }, [typing]);

  return {
    typing,
    typingRef,
    lastPressedKey,
    soundsLoaded,
    handleKeyDown,
    getNextKey,
    performanceMetrics: metrics,
    gameState,
  };
}

/**
 * ゲーム状態をリザルト画面へ遷移させる
 * @param {Object} gameState ゲーム状態
 * @param {Function} goToScreen 画面遷移関数
 * @param {Object} typingRef タイピングの参照
 */
export function useGameCompleteHandler(gameState, goToScreen, typingRef) {
  useEffect(() => {
    // 明示的な型チェックと即時遷移
    if (gameState.isGameClear === true) {
      // 統計情報がnullまたは不完全な場合は再計算して確保
      let statsToPass = gameState.stats;

      if (
        !statsToPass ||
        statsToPass.kpm === undefined ||
        statsToPass.kpm === 0
      ) {
        // 終了時間を確認
        const endTime = gameState.endTime || Date.now();
        const startTime = gameState.startTime || Date.now();
        const elapsedTimeMs = endTime - startTime;

        // useTypingGameフックからのデータを取得（最も正確な情報源）
        const typingStats = typingRef.current?.stats || {};

        // ミス数の検証と確認（複数の場所から取得を試みる）
        const missCount =
          typingStats.missCount ||
          gameState.stats?.missCount ||
          typingRef.current?.statisticsRef?.current?.mistakeCount ||
          0;

        // 正解数と正確性の確認
        const correctCount =
          typingStats.correctCount ||
          gameState.stats?.correctCount ||
          typingRef.current?.statisticsRef?.current?.correctKeyCount ||
          0;

        // 正確性の再計算
        const totalKeystrokes = correctCount + missCount;
        const accuracy =
          totalKeystrokes > 0
            ? Math.round((correctCount / totalKeystrokes) * 100)
            : 100;

        // 統計情報を構築
        statsToPass = {
          totalTime: typingStats.elapsedTimeSeconds || elapsedTimeMs / 1000,
          correctCount: correctCount,
          missCount: missCount,
          accuracy: accuracy,
          kpm: typingStats.kpm || 0,
          problemKPMs: gameState.problemKPMs || [],
        };
      }

      // スムーズな遷移のために最適な遅延
      const timeoutId = setTimeout(() => {
        // 確実に統計情報を渡すためにgameStateパラメータとして渡す
        goToScreen(SCREENS.RESULT, {
          gameState: { stats: statsToPass },
        });
      }, 150);

      // クリーンアップ関数でタイマーをクリア
      return () => clearTimeout(timeoutId);
    }
  }, [gameState, goToScreen, typingRef]);

  return null;
}

export default { useGameController, useGameCompleteHandler };
