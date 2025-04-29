'use client';

import React, { useState, useEffect } from 'react';
import styles from '../styles/GameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import { useTypingGame } from '../hooks/useTypingGame';

// 新しく作成したコンポーネントをインポート
import TypingDisplay from './typing/TypingDisplay';
import ProgressBar from './typing/ProgressBar';
import ProblemDisplay from './typing/ProblemDisplay';

// デバッグ用コンソールログの追加
console.log(
  'DEBUG: UPDATED GameScreen.js has loaded! - ESC機能付き + 戻るボタンなし + useTypingGame対応 + コンポーネント分離'
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

  // カスタムフックの使用 - 現在の問題に対するタイピングセッションを管理
  const typing = useTypingGame({
    initialProblem: gameState.currentProblem,
    playSound: soundsLoaded,
    onProblemComplete: (problemStats) => {
      goToNextProblem(problemStats);
    }
  });

  // サウンドの初期化 - 改良版
  useEffect(() => {
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

        // 音声システムのステータスをコンソールに出力
        console.log('[GameScreen] サウンド初期化完了:', {
          contextState: soundSystem.context.state,
          loadedSounds: Object.keys(soundSystem.sfxBuffers),
          volume: soundSystem.getSfxVolume(),
        });

        setSoundsLoaded(true);
      } catch (err) {
        console.error('[GameScreen] サウンドシステムの初期化エラー:', err);
        // エラーがあっても最低限の機能は使えるようにする
        setSoundsLoaded(true);
      }
    };

    initSound();

    // クリーンアップ関数
    return () => {
      console.log(
        '[GameScreen] コンポーネントがアンマウントされます。サウンドシステムの状態を保持します。'
      );
    };
  }, []);

  // document全体で物理キー入力を受け付ける
  useEffect(() => {
    const handleDocumentKeyDown = (e) => {
      handleKeyDown(e);
    };
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [gameState, typing]);

  // ゲーム終了時に即座にリザルト画面へ遷移する強化版useEffect
  useEffect(() => {
    // 明示的な型チェックと即時遷移
    if (gameState.isGameClear === true) {
      console.log(
        '【GameScreenNew】ゲームクリア状態を検出 - 即座にリザルト画面へ遷移します'
      );

      // スムーズな遷移のために最適な遅延
      setTimeout(() => {
        goToScreen(SCREENS.RESULT);
      }, 150);
    }
  }, [gameState.isGameClear, goToScreen]);

  // 次の問題へ進む処理
  const goToNextProblem = (problemStats = {}) => {
    const solvedCount = gameState.solvedCount + 1;
    const isGameClear = solvedCount >= requiredProblemCount;

    // problemStatsから問題ごとの情報を取得
    const { problemKPM = 0, updatedProblemKPMs = [] } = problemStats;

    if (isGameClear) {
      // 終了時間を記録
      const endTime = Date.now();
      const startTime = gameState.startTime || typing.stats.startTime || endTime;

      // 統計情報の計算（typingフックから取得）
      const stats = {
        totalTime: typing.stats.elapsedTimeSeconds,
        correctCount: typing.stats.correctCount,
        missCount: typing.stats.missCount,
        accuracy: typing.stats.accuracy,
        kpm: typing.stats.kpm,
        problemKPMs: updatedProblemKPMs,
      };

      console.log('【ゲームクリア】 統計情報計算結果:', stats);
      console.log(
        `【KPM計算】 ${typing.stats.correctCount}キー / ${typing.stats.elapsedTimeSeconds / 60}分 = ${typing.stats.kpm}KPM`
      );

      // 1回のみの状態更新で、すべてのデータを一度に設定
      // これにより、データの一貫性が保証される
      setGameState((prevState) => ({
        ...prevState,
        solvedCount,
        typedCount: typing.typingSession?.typedRomaji?.length || 0,
        playTime: Math.floor(typing.stats.elapsedTimeSeconds),
        startTime: startTime,
        endTime: endTime,
        problemKPMs: updatedProblemKPMs,
        uiCompletePercent: 100,
        isGameClear: true, // 即座に画面遷移を行う
        stats: stats, // 必ず統計情報を含める
      }));

      // 念のため、少し遅延させてから画面遷移を確認（状態のプロパゲーションを待つ）
      setTimeout(() => {
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
  };

  // キー入力処理
  const handleKeyDown = (e) => {
    // ゲームクリア時は何もしない
    if (gameState.isGameClear === true) {
      return;
    }

    // ESCキーが押されたらメインメニューに戻る
    if (e.key === 'Escape') {
      // 音声再生もgoToScreen関数に委譲する
      setTimeout(() => {
        goToScreen(SCREENS.MAIN_MENU, { playSound: true, soundType: 'button' });
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
  };

  // 進行状況の計算（ゲーム全体の進捗を表示するように修正）
  const progressPercentage = React.useMemo(() => {
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
    problems,
    requiredProblemCount,
    gameState.currentProblem,
    gameState.uiCompletePercent,
  ]);

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    console.log(
      '【GameScreenNew】ゲームクリア状態のため、何も表示せずにリターンします'
    );
    return null;
  }

  // 通常のゲーム画面のみ表示
  return (
    <div
      className={styles.gameContainer}
      // onClickでfocus制御も不要
    >
      <motion.div
        className={styles.gameHeader}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={styles.gameLevel}
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.5,
            times: [0, 0.5, 1],
            repeat: 0,
            repeatDelay: 1,
          }}
        >
          お題: {gameState.solvedCount + 1}/{requiredProblemCount}
        </motion.div>
      </motion.div>

      <motion.div
        className={styles.gameArea}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className={styles.typingArea}>
          <div className={styles.problemContainer}>
            {/* 問題表示コンポーネントを使用 */}
            <ProblemDisplay text={gameState.currentProblem?.displayText || ''} />
            
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
