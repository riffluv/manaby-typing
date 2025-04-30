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
import TypingUtils from '../utils/TypingUtils'; // KPM計算用にTypingUtilsをインポート
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import { useTypingGame } from '../hooks/useTypingGame';

// 新しく作成したコンポーネントをインポート
import TypingDisplay from './typing/TypingDisplay';
import ProgressBar from './typing/ProgressBar';
import ProblemDisplay from './typing/ProblemDisplay';

// デバッグ用コンソールログの追加
console.log(
  'DEBUG: UPDATED GameScreen.js has loaded! - ESC機能付き + 戻るボタンなし + useTypingGame対応 + コンポーネント分離 + パフォーマンス最適化'
);

// リファクタリング後のコンポーネント実装
const GameScreen = () => {
  // コンテキストから状態と関数を取得
  const { gameState, setGameState, problems } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

  // 一時ローカル状態（互換性のために残す）
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // typingの参照を保持するためのref
  const typingRef = useRef(null);

  // 問題完了時のコールバック
  const handleProblemComplete = useCallback(
    (problemStats) => {
      console.log(
        '【handleProblemComplete】問題完了コールバック発火:',
        problemStats
      );
      // ここではtypingRefを使用せず、直接goToNextProblemを呼び出す
      const solvedCount = gameState.solvedCount + 1;
      const isGameClear = solvedCount >= requiredProblemCount;

      // デバッグ情報追加
      console.log('【goToNextProblem】問題切り替え処理実行:', {
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

        // タイピングフックから詳細なデータを取得
        const typingStats = typingRef.current?.stats || {};
        const { problemStats = [] } = typingStats;
        
        console.log('【KPM計算】タイピングフックから取得した問題データ:', problemStats);
        
        // 正確なKPM計算のためのデータ確認と収集
        const correctKeyCount = typingStats.correctCount || 0;
        const elapsedTimeMs = endTime - startTime;
        
        // Weather Typing公式計算方法で再計算
        const calculatedKPM = TypingUtils.calculateWeatherTypingKPM(
          correctKeyCount,
          elapsedTimeMs,
          problemStats
        );
        
        console.log('【KPM計算】再計算されたKPM:', calculatedKPM);

        // 統計情報の計算
        const stats = {
          totalTime: typingStats.elapsedTimeSeconds || (elapsedTimeMs / 1000),
          correctCount: correctKeyCount,
          missCount: typingStats.missCount || 0,
          accuracy: typingStats.accuracy || 100,
          kpm: calculatedKPM, // Weather Typing公式計算で算出したKPM
          problemKPMs: updatedProblemKPMs || [],
          problemStats: problemStats // 問題ごとの詳細データ
        };

        console.log('【ゲームクリア】 統計情報計算結果:', stats);

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
        }));

        // 念のため、少し遅延させてから画面遷移を確認（状態のプロパゲーションを待つ）
        const timeoutId = setTimeout(() => {
          console.log('【遅延確認】現在のゲーム状態:', {
            isGameClear: gameState.isGameClear,
            stats: gameState.stats,
          });

          // すでに遷移していなければ強制的に遷移
          if (gameState.isGameClear !== true) {
            console.log(
              '【修正】遷移が行われていないため、強制的に状態を更新します'
            );
            setGameState((prevState) => ({
              ...prevState,
              isGameClear: true,
              stats: stats, // 再度統計情報を含める
            }));
          }
        }, 200);

        return;
      }

      // 次の問題へ進む
      try {
        const nextProblemIndex =
          (problems.indexOf(gameState.currentProblem) + 1) % problems.length;
        const nextProblem = problems[nextProblemIndex];

        console.log('【次の問題】', {
          現在の問題: gameState.currentProblem?.displayText,
          次の問題: nextProblem?.displayText,
          インデックス: nextProblemIndex,
        });

        setGameState({
          ...gameState,
          currentProblem: nextProblem,
          currentProblemIndex: nextProblemIndex,
          solvedCount,
          problemKPMs: updatedProblemKPMs, // 各問題のKPM値の配列を更新
          currentProblemStartTime: null, // 次の問題の開始時間はまだ設定しない
          currentProblemKeyCount: 0, // 次の問題用のカウンターをリセット
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

  // サウンドの初期化 - 改良版
  useEffect(() => {
    let isMounted = true; // クリーンアップ用のフラグ

    const initSound = async () => {
      try {
        console.log('[GameScreen] サウンドシステムの初期化を開始します...');

        // AudioContextを確実に再開
        soundSystem.resume();

        // buttonサウンドが特に重要なのでプリロードを確認
        if (!soundSystem.sfxBuffers['button']) {
          console.log(
            '[GameScreen] ボタン音が読み込まれていません。個別にロードします...'
          );
          await soundSystem.loadSound(
            'button',
            soundSystem.soundPresets.button
          );
        }

        // すべての効果音を読み込み
        await soundSystem.initializeAllSounds();

        // BGM再生コードを削除（レスポンス問題を解消）
        // soundSystem.playBgm('game', true);

        // コンポーネントがアンマウントされていなければ状態を更新
        if (isMounted) {
          // 音声システムのステータスをコンソールに出力
          console.log('[GameScreen] サウンド初期化完了:', {
            contextState: soundSystem.context.state,
            loadedSounds: Object.keys(soundSystem.sfxBuffers),
            volume: soundSystem.getSfxVolume(),
          });

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
      isMounted = false; // コンポーネントがアンマウントされたことを記録
      console.log('[GameScreen] コンポーネントがアンマウントされます。');
      // BGM停止処理を削除（レスポンス問題を解消）
      // soundSystem.stopBgm();
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
        // 音声再生もgoToScreen関数に委譲する
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

      // AudioContextの状態がsuspendedの場合は再開
      soundSystem.resume();

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

      // カスタムフックを使用して入力処理
      typing.handleInput(e.key);
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
  }, [handleKeyDown]); // handleKeyDown関数が変更された場合のみイベントリスナーを再設定

  // ゲーム終了時に即座にリザルト画面へ遷移する強化版useEffect
  useEffect(() => {
    // 明示的な型チェックと即時遷移
    if (gameState.isGameClear === true) {
      console.log(
        '【GameScreen】ゲームクリア状態を検出 - 即座にリザルト画面へ遷移します'
      );
      console.log('【GameScreen】統計情報詳細:', gameState.stats);

      // 統計情報がnullまたは不完全な場合は再計算して確保
      let statsToPass = gameState.stats;
      
      if (!statsToPass || statsToPass.kpm === undefined || statsToPass.kpm === 0) {
        console.log('【GameScreen】統計情報が不完全なため再計算します');
        
        // 終了時間を確認
        const endTime = gameState.endTime || Date.now();
        const startTime = gameState.startTime || Date.now();
        const elapsedTimeMs = endTime - startTime;
        
        // 問題ごとのKPMから総合KPMを計算（Weather Typing公式方法）
        const problemStats = (gameState.problemStats || []).map(problem => ({
          problemKeyCount: problem.problemKeyCount || 0,
          problemElapsedMs: problem.problemElapsedMs || 0
        }));
        
        // useTypingGameフックからのデータを取得
        const typingStats = typingRef.current?.stats || {};
        
        // 統計情報を構築
        statsToPass = {
          totalTime: typingStats.elapsedTimeSeconds || (elapsedTimeMs / 1000),
          correctCount: typingStats.correctCount || gameState.correctKeyCount || 0,
          missCount: typingStats.missCount || 0,
          accuracy: typingStats.accuracy || 100,
          kpm: typingStats.kpm || 0,
          problemKPMs: gameState.problemKPMs || [],
          problemStats: problemStats
        };
        
        console.log('【GameScreen】再計算した統計情報:', statsToPass);
      }

      // スムーズな遷移のために最適な遅延
      const timeoutId = setTimeout(() => {
        // 確実に統計情報を渡すためにgameStateパラメータとして渡す
        goToScreen(SCREENS.RESULT, {
          gameState: { stats: statsToPass }
        });
      }, 150);

      // クリーンアップ関数でタイマーをクリア
      return () => clearTimeout(timeoutId);
    }
  }, [gameState.isGameClear, gameState.stats, gameState.problemKPMs, goToScreen]);

  // 進行状況の計算（ゲーム全体の進捗を表示するように修正）- useMemoで最適化
  const progressPercentage = useMemo(() => {
    // ゲームの全体進捗を計算
    if (!problems || !gameState.currentProblem) return 0;

    // UI表示用の強制100%指定があればそれを優先
    if (gameState.uiCompletePercent === 100) {
      return 100;
    }

    // 解答済みの問題数
    const solvedCount = gameState.solvedCount || 0;
    // 必要な問題総数
    const totalProblems = requiredProblemCount;

    // 現在の問題の進捗（0～1の範囲）
    // カスタムフックから進捗を取得
    const currentProblemProgress = typing.progressPercentage / 100;

    // 全体の進捗率を計算
    // 既に解いた問題 + 現在の問題の進捗 / 合計問題数
    const overallProgress =
      (solvedCount + currentProblemProgress) / totalProblems;

    // パーセンテージに変換して返す（0～100）
    return Math.floor(overallProgress * 100);
  }, [
    typing.progressPercentage,
    gameState.solvedCount,
    gameState.currentProblem,
    gameState.uiCompletePercent,
    problems,
    requiredProblemCount,
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
    }),
    []
  );

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    console.log(
      '【GameScreenNew】ゲームクリア状態のため、何も表示せずにリターンします'
    );
    return null;
  }

  // 通常のゲーム画面のみ表示
  return (
    <div className={styles.gameContainer}>
      <motion.div
        className={styles.gameHeader}
        initial={animationVariants.header.initial}
        animate={animationVariants.header.animate}
        transition={animationVariants.header.transition}
      >
        <motion.div
          className={styles.gameLevel}
          initial={animationVariants.gameLevelScale.initial}
          animate={animationVariants.gameLevelScale.animate}
          transition={animationVariants.gameLevelScale.transition}
        >
          お題: {gameState.solvedCount + 1}/{requiredProblemCount}
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.gameArea}
        initial={animationVariants.gameArea.initial}
        animate={animationVariants.gameArea.animate}
        transition={animationVariants.gameArea.transition}
      >
        <div className={styles.typingArea}>
          <div className={styles.problemContainer}>
            {/* 問題表示コンポーネントを使用 */}
            <ProblemDisplay
              text={gameState.currentProblem?.displayText || ''}
            />

            {/* タイピング表示コンポーネントを使用 */}
            <TypingDisplay
              displayRomaji={typing.displayRomaji}
              coloringInfo={typing.coloringInfo}
              isCompleted={typing.isCompleted}
              currentInput={typing.typingSession?.currentInput || ''}
              errorAnimation={typing.errorAnimation}
            />
          </div>
        </div>
      </motion.div>

      {/* 進行状況バー - 新しいコンポーネントを使用 */}
      <ProgressBar
        percentage={progressPercentage}
        showText={true}
        label="進行状況"
      />
    </div>
  );
};

export default GameScreen;
