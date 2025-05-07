'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import styles from '../styles/GameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import TypingUtils from '../utils/TypingUtils';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import { useTypingGame } from '../hooks/useTypingGame';

// デバッグログフラグ - デフォルトで無効化
const DEBUG_GAME_SCREEN = process.env.NODE_ENV === 'development' && false;

/**
 * ログユーティリティ - コンソールログを条件付きにする
 */
const logUtil = {
  debug: (message, ...args) => {
    if (DEBUG_GAME_SCREEN) console.log(message, ...args);
  },
  warn: (message, ...args) => {
    console.warn(message, ...args);
  },
  error: (message, ...args) => {
    console.error(message, ...args);
  }
};

// コンポーネントをインポート
import ProblemDisplay from './typing/ProblemDisplay';
import CanvasKeyboard from './typing/CanvasKeyboard';
import Button from './common/Button';
import SimpleTypingDisplay from './typing/SimpleTypingDisplay';
import { useSimpleTypingAdapter } from '../hooks/useSimpleTypingAdapter';

/**
 * タイピングゲーム画面コンポーネント
 * パフォーマンス最適化済み（2025年5月8日リファクタリング）
 */
const GameScreen = () => {
  // コンテキストから状態と関数を取得
  const { gameState, setGameState, problems } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

  // typingの参照を保持するためのref
  const typingRef = useRef(null);
  
  // パフォーマンス監視用
  const performanceRef = useRef({
    startTime: Date.now(),
    frameCount: 0,
    lastFpsUpdate: Date.now(),
    fps: 60,
    inputCount: 0,
    lastFrameTime: performance.now(),
    elapsedTime: 0
  });

  // 最後に押されたキー（キーボード表示用）
  const [lastPressedKey, setLastPressedKey] = useState('');

  // サウンド読み込み状態のフラグ
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  /**
   * パフォーマンス監視を開始する関数
   */
  const startPerformanceMonitoring = useCallback(() => {
    let frameId = null;
    
    const measurePerformance = () => {
      const perf = performanceRef.current;
      const now = performance.now();
      const elapsed = now - perf.lastFrameTime;
      
      // 現在の経過時間を更新
      perf.elapsedTime += elapsed / 1000;
      perf.lastFrameTime = now;
      perf.frameCount++;
      
      // 1秒ごとにFPSを更新
      if (now - perf.lastFpsUpdate > 1000) {
        // FPSを計算
        const fps = Math.round(
          (perf.frameCount * 1000) / (now - perf.lastFpsUpdate)
        );
        perf.fps = fps;
        perf.lastFpsUpdate = now;
        perf.frameCount = 0;
      }
      
      // 次のフレームを計測
      frameId = requestAnimationFrame(measurePerformance);
    };
    
    // 計測開始
    frameId = requestAnimationFrame(measurePerformance);
    
    // クリーンアップ関数を返す
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // 問題完了時のコールバック
  const handleProblemComplete = useCallback(
    (problemStats) => {
      logUtil.debug(
        '【handleProblemComplete】問題完了コールバック発火:',
        problemStats
      );

      const solvedCount = gameState.solvedCount + 1;
      const isGameClear = solvedCount >= requiredProblemCount;

      // デバッグ情報追加
      logUtil.debug('【goToNextProblem】問題切り替え処理実行:', {
        solvedCount,
        isGameClear,
        problemStats,
      });

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
        const totalCorrectKeyCount = previousCorrectKeyCount + currentProblemCorrectKeys;

        // 全問題の累積ミス数を計算
        const currentProblemMissCount = typingStats.missCount || 0;
        const previousMissCount = gameState.totalMissCount || 0;
        const totalMissCount = previousMissCount + currentProblemMissCount;

        logUtil.debug('【累積統計情報】', {
          これまでの正解数: previousCorrectKeyCount,
          現在の問題の正解数: currentProblemCorrectKeys,
          合計正解数: totalCorrectKeyCount,
          これまでのミス数: previousMissCount,
          現在の問題のミス数: currentProblemMissCount,
          合計ミス数: totalMissCount
        });

        // 問題ごとのKPMを累積
        const allProblemKPMs = [...gameState.problemKPMs || [], problemKPM].filter(kpm => kpm > 0);

        // KPM計算 - 問題ごとのKPMの平均値を優先
        let averageKPM = 0;
        if (allProblemKPMs && allProblemKPMs.length > 0) {
          // 問題ごとのKPMの平均を計算
          averageKPM = allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0) / allProblemKPMs.length;
        } else {
          // 問題データがない場合は単純計算
          averageKPM = Math.floor(totalCorrectKeyCount / (elapsedTimeMs / 60000));
        }

        // KPMが不正な値の場合は補正
        if (averageKPM <= 0 && totalCorrectKeyCount > 0) {
          averageKPM = 1;
        }

        // 正確性の計算を修正（正確性 = 正解数 / (正解数 + ミス数) * 100）
        const totalKeystrokes = totalCorrectKeyCount + totalMissCount;
        const accuracy = totalKeystrokes > 0 ? (totalCorrectKeyCount / totalKeystrokes) * 100 : 100;

        // 統計情報の計算
        const stats = {
          totalTime: typingStats.elapsedTimeSeconds || elapsedTimeMs / 1000,
          correctCount: totalCorrectKeyCount, // 全問題の累積正解キー数を使用
          missCount: totalMissCount, // 全問題の累積ミス数を使用
          accuracy: accuracy, // 計算済みの正確性を使用
          kpm: Math.floor(averageKPM), // 平均KPM値を床関数で整数化
          problemKPMs: allProblemKPMs, // 全問題のKPM値を保持
          elapsedTimeMs: elapsedTimeMs // リザルト画面でも使用できるように
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
        const totalCorrectKeyCount = previousCorrectKeyCount + currentCorrectKeys;
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
  }, [typing]);

  // パフォーマンスモニタリングを開始
  useEffect(() => {
    const stopMonitoring = startPerformanceMonitoring();
    return stopMonitoring;
  }, [startPerformanceMonitoring]);

  // シンプル表示用のプロパティを取得（typingの初期化後に実行）
  const simpleProps = useSimpleTypingAdapter(typing);

  // サウンドの初期化 - パフォーマンス最適化版
  useEffect(() => {
    let isMounted = true; // クリーンアップ用のフラグ

    const initSound = async () => {
      try {
        // AudioContextを確実に再開
        soundSystem.resume();

        // 効果音のプリロードを並列で行う（パフォーマンス向上）
        const preloadSounds = ['success', 'error', 'button'];
        await Promise.all(preloadSounds.map(name =>
          soundSystem.loadSound(name, soundSystem.soundPresets[name])
        ));

        // 残りの効果音は後回し
        if (isMounted) {
          queueMicrotask(() => {
            soundSystem.loadSound('complete', soundSystem.soundPresets.complete)
              .catch(e => console.error('効果音のロードに失敗:', e));
          });
        }

        // コンポーネントがアンマウントされていなければ状態を更新
        if (isMounted) {
          setSoundsLoaded(true);
        }
      } catch (err) {
        console.error('[GameScreen] サウンドシステムの初期化エラー:', err);
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

  // キー入力ハンドラー - useCallback で最適化
  const handleKeyDown = useCallback(
    (e) => {
      // ゲームクリア時は何もしない
      if (gameState.isGameClear === true) {
        return;
      }

      // ESCキーが押されたらメインメニューに戻る
      if (e.key === 'Escape') {
        setTimeout(() => {
          goToScreen(SCREENS.MAIN_MENU, {
            playSound: true,
            soundType: 'button',
          });
        }, 100);
        return;
      }

      // 入力に関係のないキーは無視
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

      // AudioContextの状態がsuspendedの場合は再開
      soundSystem.resume();

      // パフォーマンス測定のためのタイムスタンプ
      const startTime = performance.now();

      // 入力処理をqueueMicrotaskで最適化
      queueMicrotask(() => {
        // Weather Typingのように、最初のキー入力時にタイマー計測を開始
        if (!gameState.hasStartedTyping) {
          const now = Date.now();
          setGameState((prevState) => ({
            ...prevState,
            startTime: now, // 最初のキー入力時点からタイマー計測を開始
            hasStartedTyping: true,
            currentProblemStartTime: now, // 最初の問題の開始時間も設定
          }));
        }

        // タイピング処理を行う - 効果音はuseTypingGame内で処理される
        typing.handleInput(e.key);
        
        // パフォーマンス測定終了
        performanceRef.current.inputCount++;
      });
    },
    [
      gameState.isGameClear,
      gameState.hasStartedTyping,
      typing,
      goToScreen,
      setGameState,
    ]
  );

  // document全体で物理キー入力を受け付ける
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ゲーム終了時に即座にリザルト画面へ遷移する強化版useEffect
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
        const missCount = typingStats.missCount ||
          gameState.stats?.missCount ||
          typingRef.current?.statisticsRef?.current?.mistakeCount ||
          0;

        // 正解数と正確性の確認
        const correctCount = typingStats.correctCount ||
          gameState.stats?.correctCount ||
          typingRef.current?.statisticsRef?.current?.correctKeyCount ||
          0;

        // 正確性の再計算
        const totalKeystrokes = correctCount + missCount;
        const accuracy = totalKeystrokes > 0 ?
          Math.round((correctCount / totalKeystrokes) * 100) :
          100;

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
  }, [
    gameState.isGameClear,
    gameState.stats,
    gameState.problemKPMs,
    goToScreen,
  ]);

  // アニメーション用のバリアント - 再レンダリング間で一定に保つために useMemo を使用
  const animationVariants = useMemo(
    () => ({
      header: {
        initial: { y: -20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        transition: { duration: 0.3 },
      },
      gameArea: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.1, duration: 0.4 },
      },
      gameLevelScale: {
        initial: { scale: 1 },
        animate: {
          scale: [1, 1.1, 1],
        },
        transition: {
          duration: 0.5,
          times: [0, 0.5, 1],
          repeat: 0,
          repeatDelay: 1,
        },
      },
      problemArea: {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.2, duration: 0.3 },
      },
      keyboard: {
        initial: { opacity: 0, y: 25 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: 0.3, duration: 0.4 },
      },
      shortcut: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { delay: 0.5, duration: 0.3 },
        whileHover: { scale: 1.05 },
      },
      status: {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { delay: 0.4, duration: 0.3 },
      },
    }),
    []
  );

  // 次に入力すべきキーを取得
  const nextKey = useMemo(() => {
    return typing.typingSession?.getCurrentExpectedKey?.() || '';
  }, [typing]);

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    return null;
  }

  return (
    <div className={styles.typing_game__wrapper}>
      <div className={styles.typing_game}>
        {/* SF風のコーナー装飾 */}
        <div className={styles.typing_game__corner} style={{ top: 10, left: 10 }}>
          <div className={styles.typing_game__corner_tech} />
        </div>
        <div className={styles.typing_game__corner} style={{ top: 10, right: 10, transform: 'scaleX(-1)' }}>
          <div className={styles.typing_game__corner_tech} />
        </div>
        <div className={styles.typing_game__corner} style={{ bottom: 10, left: 10, transform: 'scaleY(-1)' }}>
          <div className={styles.typing_game__corner_tech} />
        </div>
        <div className={styles.typing_game__corner} style={{ bottom: 10, right: 10, transform: 'scale(-1)' }}>
          <div className={styles.typing_game__corner_tech} />
        </div>

        {/* スキャンラインとドットパターン */}
        <div className={styles.typing_game__scanlines}></div>
        <div className={styles.typing_game__dot_pattern}></div>

        <motion.header
          className={styles.typing_game__header}
          initial={animationVariants.header.initial}
          animate={animationVariants.header.animate}
          transition={animationVariants.header.transition}
        >
          <div></div>

          <motion.div
            className={styles.typing_game__level_display}
            initial={animationVariants.gameLevelScale.initial}
            animate={animationVariants.gameLevelScale.animate}
            transition={animationVariants.gameLevelScale.transition}
          >
            お題: {gameState.solvedCount + 1}/{requiredProblemCount}
          </motion.div>
        </motion.header>

        <motion.main
          className={styles.typing_game__main}
          initial={animationVariants.gameArea.initial}
          animate={animationVariants.gameArea.animate}
          transition={animationVariants.gameArea.transition}
        >
          <div className={styles.typing_game__content}>
            {/* お題エリア */}
            <motion.div
              className={styles.typing_game__problem}
              initial={animationVariants.problemArea.initial}
              animate={animationVariants.problemArea.animate}
              transition={animationVariants.problemArea.transition}
            >
              {/* 問題表示コンポーネント */}
              <ProblemDisplay
                text={gameState.currentProblem?.displayText || ''}
                className={styles.typing_game__problem_text}
              />

              {/* 入力エリア */}
              <SimpleTypingDisplay
                romaji={simpleProps.romaji}
                typedLength={simpleProps.typedLength}
                nextChar={simpleProps.nextChar}
                isError={simpleProps.isError}
                className={styles.typing_game__input}
                inputMode={simpleProps.inputMode}
                currentInput={simpleProps.currentInput}
                currentCharRomaji={simpleProps.currentCharRomaji}
              />
            </motion.div>

            {/* キーボード表示 */}
            <motion.div
              className={styles.typing_game__keyboard}
              initial={animationVariants.keyboard.initial}
              animate={animationVariants.keyboard.animate}
              transition={animationVariants.keyboard.transition}
            >
              <CanvasKeyboard
                nextKey={nextKey}
                lastPressedKey={lastPressedKey}
                isError={typing.errorAnimation}
                layout="jp"
              />
            </motion.div>
          </div>
        </motion.main>

        {/* ショートカットとステータス情報 */}
        <motion.div
          className={styles.typing_game__shortcuts}
          onClick={() => {
            soundSystem.play('button');
            goToScreen(SCREENS.MAIN_MENU, {
              playSound: true,
              soundType: 'button',
            });
          }}
          initial={animationVariants.shortcut.initial}
          animate={animationVariants.shortcut.animate}
          transition={animationVariants.shortcut.transition}
          whileHover={animationVariants.shortcut.whileHover}
        >
          <span className={styles.typing_game__shortcut_item}>
            <kbd>Esc</kbd> <span className={styles.typing_game__shortcut_text}>メニューへ</span>
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default GameScreen;
