'use client';

import React, { useState, useEffect } from 'react';
import styles from '../styles/GameScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import TypingUtils from '../utils/TypingUtils';
import soundSystem from '../utils/SoundUtils';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';

// デバッグ用コンソールログの追加
console.log(
  'DEBUG: UPDATED GameScreen.js has loaded! - ESC機能付き + 戻るボタンなし'
);

// 完全に新しいコンポーネントとして実装（キャッシュ問題を回避）
const GameScreen = () => {
  // コンテキストから状態と関数を取得
  const { gameState, setGameState, problems } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();

  // ローカル状態
  const [typingSession, setTypingSession] = useState(null);
  const [displayRomaji, setDisplayRomaji] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [errorAnimation, setErrorAnimation] = useState(false);
  const [coloringInfo, setColoringInfo] = useState({
    typedLength: 0,
    currentInputLength: 0,
  });
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

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
  }, [gameState, typingSession, soundsLoaded, errorCount, coloringInfo]);

  // ゲーム終了時に即座にリザルト画面へ遷移する強化版useEffect
  useEffect(() => {
    // 明示的な型チェックと即時遷移
    if (gameState.isGameClear === true) {
      console.log(
        '【GameScreenNew】ゲームクリア状態を検出 - 即座にリザルト画面へ遷移します'
      );

      // スムーズな遷移のために最適な遅延（150msに戻す）
      setTimeout(() => {
        goToScreen(SCREENS.RESULT);
      }, 150);
    }
  }, [gameState.isGameClear, goToScreen]);

  // 問題セッションの初期化
  useEffect(() => {
    // ゲームクリア状態でなく、問題が存在する場合のみセッション初期化
    if (gameState.isGameClear !== true && gameState.currentProblem) {
      const session = TypingUtils.createTypingSession(gameState.currentProblem);
      if (session) {
        setTypingSession(session);
        setDisplayRomaji(session.displayRomaji);
        setColoringInfo(session.getColoringInfo());
        setErrorCount(0);

        // Weather Typing風：各問題の開始時にカウンターをリセット
        setGameState((prevState) => ({
          ...prevState,
          currentProblemStartTime: null, // 最初のキー入力時に設定される
          currentProblemKeyCount: 0, // この問題での正しいキー入力数をリセット
        }));
      }
    }
  }, [gameState.currentProblem, gameState.isGameClear]);

  // 次の問題へ進む処理
  const goToNextProblem = () => {
    const solvedCount = gameState.solvedCount + 1;
    const isGameClear = solvedCount >= requiredProblemCount;

    // 問題ごとのKPMを計算（Weather Typing風）
    const now = Date.now();
    const problemElapsedMs = gameState.currentProblemStartTime ? now - gameState.currentProblemStartTime : 0;
    const problemKeyCount = gameState.currentProblemKeyCount || 0;

    // KPM計算（キー数 ÷ 分）
    let problemKPM = 0;
    if (problemElapsedMs > 0 && problemKeyCount > 0) {
      const minutes = problemElapsedMs / 60000; // ミリ秒を分に変換
      problemKPM = Math.floor(problemKeyCount / minutes); // Weather Typing風に小数点以下切り捨て
      console.log(
        `問題${solvedCount}のKPM: ${problemKPM} (${problemKeyCount}キー / ${minutes.toFixed(
          2
        )}分)`
      );
    }

    // 新しいKPM値を配列に追加
    const updatedProblemKPMs = [...(gameState.problemKPMs || []), problemKPM];

    if (isGameClear) {
      // 終了時間を記録
      const endTime = Date.now();
      const startTime = gameState.startTime || now; // 開始時間がなければ現在時刻
      
      // 統計情報の計算
      const totalTime = (endTime - startTime) / 1000; // 秒単位
      const correctCount = gameState.correctKeyCount || 0;
      const missCount = gameState.mistakes || 0;
      const totalKeyCount = correctCount + missCount;
      
      // 正確性 (0.0 ~ 1.0) - 値が不正な場合は0
      const accuracy = totalKeyCount > 0 ? correctCount / totalKeyCount : 0;
      
      // KPM (分あたりのキー数) - 分が0の場合は0
      const totalMinutes = totalTime / 60;
      const kpm = totalMinutes > 0 ? Math.floor(correctCount / totalMinutes) : 0;
      
      // 統計情報をstatsオブジェクトにまとめる
      const stats = {
        totalTime,
        correctCount,
        missCount,
        accuracy,
        kpm,
        problemKPMs: updatedProblemKPMs
      };
      
      console.log('【ゲームクリア】 統計情報計算結果:', stats);
      console.log(`【KPM計算】 ${correctCount}キー / ${totalMinutes.toFixed(2)}分 = ${kpm}KPM`);

      // 1回のみの状態更新で、すべてのデータを一度に設定
      // これにより、データの一貫性が保証される
      setGameState(prevState => ({
        ...prevState,
        solvedCount,
        typedCount: typingSession?.typedRomaji?.length || 0,
        playTime: Math.floor((endTime - startTime) / 1000),
        startTime: startTime, // 明示的に保存（念のため）
        endTime: endTime,
        problemKPMs: updatedProblemKPMs,
        uiCompletePercent: 100,
        isGameClear: true, // 即座に画面遷移を行う
        stats: stats // 必ず統計情報を含める
      }));
      
      // 念のため、少し遅延させてから画面遷移を確認（状態のプロパゲーションを待つ）
      setTimeout(() => {
        console.log('【遅延確認】現在のゲーム状態:', {
          isGameClear: gameState.isGameClear,
          stats: gameState.stats
        });
        
        // すでに遷移していなければ強制的に遷移
        if (gameState.isGameClear !== true) {
          console.log('【修正】遷移が行われていないため、強制的に状態を更新します');
          setGameState(prevState => ({
            ...prevState,
            isGameClear: true,
            stats: stats // 再度統計情報を含める
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

      // 正解音を再生
      if (soundsLoaded) {
        soundSystem.play('success');
      }
    } catch (error) {
      console.error('次の問題の設定中にエラーが発生しました:', error);
    }
  };

  // キー入力処理
  const handleKeyDown = (e) => {
    // ゲームクリア時は何もしない
    if (gameState.isGameClear === true || !typingSession) {
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
    // 現在の問題の開始時間がまだ設定されていない場合（次の問題へ移った直後の最初の入力）
    else if (gameState.currentProblemStartTime === null) {
      const now = Date.now();
      setGameState((prevState) => ({
        ...prevState,
        currentProblemStartTime: now, // 新しい問題の開始時間を設定
      }));
    }

    // 全角文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(e.key);

    // 入力処理
    const result = typingSession.processInput(halfWidthChar);

    if (result.success) {
      // 色分け情報を更新
      setColoringInfo(typingSession.getColoringInfo());

      // 正確なキー打鍵数をカウント（KPM計算用）- 累積と問題ごと両方を更新
      setGameState((prevState) => ({
        ...prevState,
        correctKeyCount: (prevState.correctKeyCount || 0) + 1, // 累積カウント
        currentProblemKeyCount: (prevState.currentProblemKeyCount || 0) + 1, // 現在の問題用カウント
      }));

      // タイプ成功音を再生
      if (soundsLoaded) {
        soundSystem.play('success');
      }

      // すべて入力完了した場合
      if (result.status === 'all_completed') {
        goToNextProblem();
      }
    } else {
      // 誤入力の処理
      setErrorCount(errorCount + 1);
      setErrorAnimation(true);

      // gameStateのmistakesも増やす（累積カウント）
      setGameState((prevState) => ({
        ...prevState,
        mistakes: (prevState.mistakes || 0) + 1,
      }));

      // エラー音を再生
      if (soundsLoaded) {
        soundSystem.play('error');
      }

      // エラーアニメーションをリセット
      setTimeout(() => {
        setErrorAnimation(false);
      }, 200);
    }
  };

  // ローマ字テキストの表示処理
  const typingTextElement = React.useMemo(() => {
    if (!displayRomaji) return null;

    // 完了状態の場合
    if (typingSession?.completed) {
      return (
        <div className={styles.typingRomaji}>
          <span className={styles.completed}>{displayRomaji}</span>
        </div>
      );
    }

    // 通常表示
    const typedIndex = coloringInfo.typedLength;
    const currentPosition = coloringInfo.currentPosition;
    const currentInput = typingSession?.currentInput || '';
    const currentDisplay = coloringInfo.currentDisplay || '';
    const typed = displayRomaji.substring(0, typedIndex);
    const remaining = displayRomaji.substring(
      currentPosition + currentInput.length
    );

    return (
      <div className={styles.typingRomaji}>
        <span className={styles.completed}>{typed}</span>
        {currentInput && <span className={styles.current}>{currentInput}</span>}
        {currentDisplay && currentInput.length < currentDisplay.length && (
          <span>{currentDisplay.substring(currentInput.length)}</span>
        )}
        <span className={errorAnimation ? styles.error : ''}>{remaining}</span>
      </div>
    );
  }, [
    displayRomaji,
    coloringInfo,
    typingSession?.currentInput,
    typingSession?.completed,
    errorAnimation,
  ]);

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
    let currentProblemProgress = 0;
    
    if (typingSession && displayRomaji) {
      const typedLength = coloringInfo.typedLength || 0;
      const totalLength = displayRomaji.length;
      
      // 現在の問題の進捗率（0～1）
      currentProblemProgress = totalLength > 0 ? typedLength / totalLength : 0;
      
      // タイピングが完了している場合は1（100%）に設定
      if (typingSession.completed) {
        currentProblemProgress = 1;
      }
    }
    
    // 全体の進捗率を計算
    // 既に解いた問題 + 現在の問題の進捗 / 合計問題数
    const overallProgress = (solvedCount + currentProblemProgress) / totalProblems;
    
    // パーセンテージに変換して返す（0～100）
    return Math.floor(overallProgress * 100);
  }, [typingSession, displayRomaji, coloringInfo, gameState.solvedCount, problems, requiredProblemCount, gameState.currentProblem, gameState.uiCompletePercent]);

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
        {/* スコア表示を削除 */}
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
            <motion.p
              className={styles.typingProblem}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring' }}
            >
              {gameState.currentProblem?.displayText || ''}
            </motion.p>
            {typingTextElement}
          </div>
        </div>
      </motion.div>

      {/* 進行状況バー - アニメーションなしでリアルタイム更新 */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressText}>
          進行状況: {progressPercentage}%
        </div>
      </div>
    </div>
  );
};

export default GameScreen;