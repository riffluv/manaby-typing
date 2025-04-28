'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const inputRef = useRef(null);

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

  // ゲームクリア時に即座にリザルト画面へ遷移する強化版useEffect
  useEffect(() => {
    // 明示的な型チェックと即時遷移
    if (gameState.isGameClear === true) {
      console.log(
        '【GameScreenNew】ゲームクリア状態を検出 - 即座にリザルト画面へ遷移します'
      );

      // スムーズな遷移のために最適な遅延（150msに短縮）
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

        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  }, [gameState.currentProblem, gameState.isGameClear]);

  // 次の問題へ進む処理
  const goToNextProblem = () => {
    const solvedCount = gameState.solvedCount + 1;
    const isGameClear = solvedCount >= requiredProblemCount;

    // 問題ごとのKPMを計算（Weather Typing風）
    const now = Date.now();
    const problemElapsedMs = now - gameState.currentProblemStartTime;
    const problemKeyCount = gameState.currentProblemKeyCount;

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

      // 最終データを設定（ミス入力は累積値を使用）
      const finalState = {
        ...gameState,
        solvedCount,
        isGameClear: true, // ゲームクリア状態をセット
        typedCount: typingSession?.typedRomaji?.length || 0,
        playTime: Math.floor((endTime - gameState.startTime) / 1000),
        endTime: endTime, // 終了時間を明示的に保存
        problemKPMs: updatedProblemKPMs, // 各問題のKPM値の配列を保存
      };

      // ステート更新
      setGameState(finalState);

      // トランジションの二重実行を避けるため、useEffect側で画面遷移を行う
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

  // ゲームクリア状態の場合は何も表示しない - 早期リターン
  if (gameState.isGameClear === true) {
    console.log(
      '【GameScreenNew】ゲームクリア状態のため、何も表示せずにリターンします'
    );
    return null;
  }

  // 通常のゲーム画面のみ表示（ゲームクリア時の条件分岐を完全に除去）
  return (
    <div
      className={styles.gameContainer}
      onClick={() => {
        inputRef.current && inputRef.current.focus();
        soundSystem.resume();
      }}
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
          <input
            ref={inputRef}
            className={styles.hiddenInput}
            onKeyDown={handleKeyDown}
            onCompositionEnd={(e) => {
              const convertedText = TypingUtils.handleIMEInput(e);
              if (convertedText && typingSession) {
                for (const char of convertedText) {
                  typingSession.processInput(char);
                }
                setColoringInfo(typingSession.getColoringInfo());
              }
            }}
            onInput={(e) => {
              if (!e.isComposing) {
                const convertedText = TypingUtils.handleIMEInput(e);
                if (convertedText && typingSession) {
                  // すでにkeydownで処理されているので何もしない
                }
              }
            }}
            value=""
            onChange={() => {}}
            autoFocus
          />
        </div>
      </motion.div>

      {/* ESCキーガイドを左下に追加 - 修正版 */}
      <div
        className={styles.escGuide}
        style={{ opacity: 1, position: 'absolute', zIndex: 100 }}
      >
        ESCでメニューへ
      </div>
    </div>
  );
};

// エクスポートするのは新しいコンポーネント
export default GameScreen;
