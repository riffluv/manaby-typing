'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameContext, SCREENS } from '../../contexts/GameContext';
import { usePageTransition } from '../TransitionManager';
import soundSystem from '../../utils/SoundUtils';
import MCPUtils from '../../utils/MCPUtils';
import TypingUtils from '../../utils/TypingUtils';

// コンポーネントをインポート
import ProblemDisplay from './ProblemDisplay';
import SimpleTypingDisplay from './SimpleTypingDisplay';
import CanvasKeyboard from './CanvasKeyboard';
import StatsDisplay from './StatsDisplay';
import styles from '../../styles/GameScreen.module.css';

// MCPカスタムフックを直接使用
import { useMCPContext } from '../../utils/MCPUtils';

/**
 * MCPと連携したゲームコンテナコンポーネント
 * ゲーム全体を統括し、MCPとの連携を担当
 */
const GameContainer = () => {
  // MCPコンテキストの取得
  const mcpContext = useMCPContext();

  // ゲームコンテキストから状態と関数を取得
  const { gameState, setGameState, problems } = useGameContext();
  const { goToScreen } = usePageTransition();

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

  // 最後に押されたキーの状態
  const [lastPressedKey, setLastPressedKey] = useState('');

  // タイピング表示のための状態
  const [displayInfo, setDisplayInfo] = useState({
    romaji: '',
    typedLength: 0,
    nextChar: '',
    isError: false,
    inputMode: 'normal',
    currentInput: '',
    currentCharRomaji: '',
  });

  // サウンド読み込み状態のフラグ
  const [soundsLoaded, setSoundsLoaded] = useState(false);

  // 統計情報の状態
  const [stats, setStats] = useState({
    correctKeyCount: 0,
    missCount: 0,
    kpm: 0,
    accuracy: 100,
  });

  // 各種参照用のref
  const typingSessionRef = useRef(null);
  const problemStartTimeRef = useRef(null);
  const statsRef = useRef({
    problemStats: [],
    totalCorrectKeyCount: 0,
    totalMissCount: 0,
  });

  /**
   * 問題完了時のコールバック処理
   */
  const handleProblemComplete = useCallback(
    (problemStats) => {
      console.log('[GameContainer] 問題完了:', problemStats);

      // MCP経由で問題完了を記録
      if (mcpContext.isActive) {
        mcpContext.recordGameEvent({
          type: 'problem_complete',
          problemId: gameState.currentProblem?.id,
          stats: {
            correctCount: stats.correctKeyCount,
            missCount: stats.missCount,
            kpm: stats.kpm,
          },
        });
      }

      // 問題統計を現在のref統計情報に追加
      const currentStats = statsRef.current;
      const solvedCount = gameState.solvedCount + 1; // 現在の問題のKPMを計算
      const now = Date.now();
      const problemElapsedMs = problemStartTimeRef.current
        ? now - problemStartTimeRef.current
        : 0; // KPM計算のためのデバッグ情報（Weather Typing方式）
      console.log('[GameContainer] 問題完了 KPM計算（Weather Typing方式）:', {
        問題文: gameState.currentProblem?.displayText,
        キー数: stats.correctKeyCount,
        ミス数: stats.missCount,
        経過時間ms: problemElapsedMs,
        経過時間分: problemElapsedMs / 60000,
        開始時間: new Date(problemStartTimeRef.current).toLocaleTimeString(),
        終了時間: new Date(now).toLocaleTimeString(),
        予測KPM値:
          problemElapsedMs > 0
            ? Math.floor(stats.correctKeyCount / (problemElapsedMs / 60000))
            : 0,
      });

      // Weather Typing方式のKPM計算：キー数÷経過時間(分)
      const problemKPM =
        problemElapsedMs > 0
          ? Math.floor(stats.correctKeyCount / (problemElapsedMs / 60000))
          : 0;

      // 問題統計を追加
      currentStats.problemStats.push({
        problemId: gameState.currentProblem?.id,
        correctCount: stats.correctKeyCount,
        missCount: stats.missCount,
        kpm: problemKPM,
        elapsedMs: problemElapsedMs,
      });

      // 累積統計を更新
      currentStats.totalCorrectKeyCount += stats.correctKeyCount;
      currentStats.totalMissCount += stats.missCount;

      // ゲームクリア条件の確認
      const isGameClear = solvedCount >= requiredProblemCount;

      if (isGameClear) {
        // 終了時間を記録
        const endTime = Date.now();
        const startTime = gameState.startTime || endTime;
        const elapsedTimeMs = endTime - startTime; // 問題ごとのKPMを集計（Weather Typing方式）
        const allProblemKPMs = currentStats.problemStats
          .map((p) => p.kpm)
          .filter((kpm) => kpm > 0);

        console.log('[GameContainer] 全問題のKPM:', {
          問題別KPM: allProblemKPMs,
          問題数: allProblemKPMs.length,
        });

        // KPM計算 - Weather Typing方式：問題ごとのKPMの平均値を計算
        let averageKPM = 0;
        if (allProblemKPMs && allProblemKPMs.length > 0) {
          const totalKPM = allProblemKPMs.reduce((sum, kpm) => sum + kpm, 0);
          averageKPM = totalKPM / allProblemKPMs.length;
          console.log('[GameContainer] 平均KPM計算:', {
            合計KPM: totalKPM,
            問題数: allProblemKPMs.length,
            平均KPM: averageKPM,
          });
        } else {
          // フォールバック計算（通常はここには来ないはず）
          averageKPM = Math.floor(
            currentStats.totalCorrectKeyCount / (elapsedTimeMs / 60000)
          );
          console.log('[GameContainer] フォールバックKPM計算:', {
            累計キー数: currentStats.totalCorrectKeyCount,
            総時間ms: elapsedTimeMs,
            総時間分: elapsedTimeMs / 60000,
            計算KPM: averageKPM,
          });
        }

        // 正確性の計算
        const totalKeystrokes =
          currentStats.totalCorrectKeyCount + currentStats.totalMissCount;
        const accuracy =
          totalKeystrokes > 0
            ? (currentStats.totalCorrectKeyCount / totalKeystrokes) * 100
            : 100; // Weather Typing方式で最終統計情報を作成
        const finalKPM = Math.floor(averageKPM); // 確実に整数値にする
        const finalStats = {
          totalTime: elapsedTimeMs / 1000,
          correctCount: currentStats.totalCorrectKeyCount,
          missCount: currentStats.totalMissCount,
          accuracy: accuracy,
          kpm: finalKPM,
          problemKPMs: allProblemKPMs,
          elapsedTimeMs: elapsedTimeMs,
        };

        console.log('[GameContainer] 最終スコア:', {
          プレイ時間: finalStats.totalTime.toFixed(1) + '秒',
          正解キー数: finalStats.correctCount,
          ミス数: finalStats.missCount,
          正確率: accuracy.toFixed(1) + '%',
          KPM: finalKPM,
          問題別KPM: allProblemKPMs,
        });

        // MCP経由でゲーム完了を記録
        if (mcpContext.isActive) {
          mcpContext.recordGameEvent({
            type: 'game_complete',
            stats: finalStats,
          });
        }

        // ゲームステートの更新
        setGameState((prevState) => ({
          ...prevState,
          solvedCount,
          playTime: Math.floor(finalStats.totalTime),
          startTime: startTime,
          endTime: endTime,
          problemKPMs: allProblemKPMs,
          uiCompletePercent: 100,
          isGameClear: true,
          stats: finalStats,
          totalCorrectKeyCount: currentStats.totalCorrectKeyCount,
          totalMissCount: currentStats.totalMissCount,
        }));

        return;
      }

      // 次の問題へ進む処理
      try {
        const nextProblemIndex =
          (problems.indexOf(gameState.currentProblem) + 1) % problems.length;
        const nextProblem = problems[nextProblemIndex];

        console.log('[GameContainer] 次の問題へ:', {
          現在の問題: gameState.currentProblem?.displayText,
          次の問題: nextProblem?.displayText,
        });

        // 次の問題へ状態を更新
        setGameState({
          ...gameState,
          currentProblem: nextProblem,
          currentProblemIndex: nextProblemIndex,
          solvedCount,
          problemKPMs: currentStats.problemStats.map((p) => p.kpm || 0),
          currentProblemStartTime: null,
          currentProblemKeyCount: 0,
          totalCorrectKeyCount: currentStats.totalCorrectKeyCount,
          totalMissCount: currentStats.totalMissCount,
        });

        // タイピングセッションをリセット
        initializeTypingSession(nextProblem);
        // 音を再生
        if (soundsLoaded) {
          soundSystem.playSound('success');
        }
      } catch (error) {
        console.error('[GameContainer] 次の問題設定エラー:', error);
      }
    },
    [
      gameState,
      requiredProblemCount,
      problems,
      setGameState,
      mcpContext,
      soundsLoaded,
      stats,
    ]
  );

  /**
   * タイピングセッションの初期化
   */
  const initializeTypingSession = useCallback((problem) => {
    if (!problem) return;

    console.log(
      '[GameContainer] タイピングセッション初期化:',
      problem.displayText
    );

    // かなテキストをローマ字に変換
    try {
      // TypingUtilsからパターンを取得し、最初の要素を選択してローマ字を生成
      const patterns = TypingUtils.parseTextToRomajiPatterns(problem.kanaText);
      const romaji = patterns.map((pattern) => pattern[0]).join('');

      // ローマ字を含む拡張された問題オブジェクトを作成
      const problemWithRomaji = {
        ...problem,
        romaji: romaji,
      };

      console.log('[GameContainer] ローマ字変換:', {
        問題: problem.displayText,
        かな: problem.kanaText,
        ローマ字: romaji,
      });

      // タイピングセッションをリセット
      setDisplayInfo({
        romaji: romaji,
        typedLength: 0,
        nextChar: romaji ? romaji[0] : '',
        isError: false,
        inputMode: 'normal',
        currentInput: '',
        currentCharRomaji: '',
      });
    } catch (error) {
      console.error('[GameContainer] ローマ字変換エラー:', error);
      // エラー時はかなテキストをそのまま使用
      setDisplayInfo({
        romaji: problem.kanaText || '',
        typedLength: 0,
        nextChar: problem.kanaText ? problem.kanaText[0] : '',
        isError: false,
        inputMode: 'normal',
        currentInput: '',
        currentCharRomaji: '',
      });
    }

    // 統計情報をリセット
    setStats({
      correctKeyCount: 0,
      missCount: 0,
      kpm: 0,
      accuracy: 100,
    }); // 問題開始時間をリセット（初回キー入力時に設定される）
    problemStartTimeRef.current = null;
    console.log('[GameContainer] 問題開始時間をリセット');

    // MCP経由で問題開始を記録（mcpContextは依存配列から外すため関数内でアクセス）
    const context = mcpContext;
    if (context?.isActive) {
      // 非同期で実行して無限ループを防止
      setTimeout(() => {
        context.recordGameEvent({
          type: 'problem_start',
          problemId: problem.id,
          problemText: problem.displayText,
          romaji: problem.romaji,
        });
      }, 0);
    }
  }, []); // 依存配列を空にして安定させる

  /**
   * キーボード入力ハンドラ
   */
  const handleKeyDown = useCallback(
    (e) => {
      // ゲームクリア時は何もしない
      if (gameState.isGameClear === true) {
        return;
      } // ESCキーが押されたらメインメニューに戻る
      if (e.key === 'Escape') {
        // 音声再生
        if (soundsLoaded) {
          soundSystem.playSound('button');
        }

        setTimeout(() => {
          goToScreen(SCREENS.MAIN_MENU);
        }, 100);
        return;
      }

      // 入力に関係のないキーは無視
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // IME確定中の場合は処理しない
      if (e.isComposing) {
        return;
      }

      // 最後に押されたキーを更新（キーボード表示用）
      setLastPressedKey(e.key);

      // AudioContextの状態を確認
      if (soundsLoaded) {
        soundSystem.resume();
      } // Weather Typing方式: 最初のキー入力時にタイマー計測を開始
      if (!gameState.hasStartedTyping || !problemStartTimeRef.current) {
        const now = Date.now();
        setGameState((prevState) => ({
          ...prevState,
          startTime: now,
          hasStartedTyping: true,
          currentProblemStartTime: now,
        }));

        // 問題開始時間も記録（KPM計算の基準時間）
        problemStartTimeRef.current = now;
        console.log('[GameContainer] タイピング開始時間を記録:', {
          timestamp: now,
          問題: gameState.currentProblem?.displayText,
        });
      }

      // タイピング処理 - displayInfoからromajiを取得するように修正
      const key = e.key.toLowerCase();
      const romaji = displayInfo.romaji || ''; // gameStateではなくdisplayInfoから取得
      const typedLength = displayInfo.typedLength;

      console.log('[GameContainer] キー入力:', {
        入力キー: key,
        ローマ字: romaji,
        入力済文字数: typedLength,
        次の文字: romaji[typedLength],
      });

      // 入力すべき文字を取得
      const expectedChar = romaji[typedLength] || '';

      // 正解・不正解の判定
      const isCorrect = expectedChar === key;

      if (isCorrect) {
        // 正解の場合
        const newTypedLength = typedLength + 1;
        const isCompleted = newTypedLength >= romaji.length;

        // 正解キーをカウント
        setStats((prev) => ({
          ...prev,
          correctKeyCount: prev.correctKeyCount + 1,
        }));

        // KPMを計算
        if (problemStartTimeRef.current) {
          const elapsed = Date.now() - problemStartTimeRef.current;
          if (elapsed > 0) {
            const newKpm = Math.floor((typedLength + 1) / (elapsed / 60000));
            setStats((prev) => ({
              ...prev,
              kpm: newKpm,
            }));
          }
        }

        // 表示情報を更新
        setDisplayInfo((prev) => ({
          ...prev,
          typedLength: newTypedLength,
          nextChar: romaji[newTypedLength] || '',
          isError: false,
        }));

        // 音を再生 - 超高速再生メソッドで対応
        if (soundsLoaded) {
          if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
            soundSystem.ultraFastPlayTypingSound('success');
          } else {
            soundSystem.playSound('success'); // 正しいメソッド名はplaySound
          }
        }

        // MCP経由で入力を記録
        if (mcpContext.isActive) {
          mcpContext.recordTypingInput({
            key: key,
            isCorrect: true,
            expectedChar: expectedChar,
            position: typedLength,
            timestamp: Date.now(),
          });
        }

        // 完了チェック
        if (isCompleted) {
          // 遅延なしですぐに問題完了処理を実行
          handleProblemComplete();
        }
      } else {
        // 不正解の場合
        // ミスをカウント
        setStats((prev) => ({
          ...prev,
          missCount: prev.missCount + 1,
        }));

        // 表示情報を更新
        setDisplayInfo((prev) => ({
          ...prev,
          isError: true,
        }));

        // 正確性を更新
        const totalKeystrokes = stats.correctKeyCount + stats.missCount + 1;
        const newAccuracy =
          totalKeystrokes > 0
            ? (stats.correctKeyCount / totalKeystrokes) * 100
            : 100;

        setStats((prev) => ({
          ...prev,
          accuracy: newAccuracy,
        }));

        // 音を再生 - 超高速再生メソッドで対応
        if (soundsLoaded) {
          if (typeof soundSystem.ultraFastPlayTypingSound === 'function') {
            soundSystem.ultraFastPlayTypingSound('error');
          } else {
            soundSystem.playSound('error'); // 正しいメソッド名はplaySound
          }
        }

        // MCP経由で入力を記録
        if (mcpContext.isActive) {
          mcpContext.recordTypingInput({
            key: key,
            isCorrect: false,
            expectedChar: expectedChar,
            position: typedLength,
            timestamp: Date.now(),
          });
        }

        // エラーアニメーション表示（一定時間後に元に戻す）
        setTimeout(() => {
          setDisplayInfo((prev) => ({
            ...prev,
            isError: false,
          }));
        }, 200);
      }
    },
    [
      gameState,
      displayInfo,
      setGameState,
      goToScreen,
      soundsLoaded,
      handleProblemComplete,
      mcpContext,
      stats,
    ]
  );

  // 初期問題設定
  useEffect(() => {
    if (gameState.currentProblem) {
      console.log(
        '[GameContainer] 初期問題設定:',
        gameState.currentProblem.displayText
      );
      initializeTypingSession(gameState.currentProblem);
    }
  }, [gameState.currentProblem]); // initializeTypingSessionを依存配列から削除
  // サウンドの初期化
  useEffect(() => {
    let isMounted = true;

    const initSound = async () => {
      try {
        console.log('[GameContainer] サウンドシステム初期化開始');

        // AudioContextを確実に再開
        soundSystem.resume();

        // 新しいタイピング音事前ロード機能を使用（利用可能な場合）
        if (typeof soundSystem.preloadTypingSounds === 'function') {
          console.log('[GameContainer] タイピング音を事前ロード開始');
          await soundSystem.preloadTypingSounds();
          console.log('[GameContainer] タイピング音の事前ロード完了');
        } else {
          // 従来の方法でのプリロード（フォールバック）
          await Promise.all([
            soundSystem.loadSound('success', soundSystem.soundPresets.success),
            soundSystem.loadSound('error', soundSystem.soundPresets.error),
            soundSystem.loadSound('button', soundSystem.soundPresets.button),
          ]);
        }

        // コンポーネントがアンマウントされていなければ状態を更新
        if (isMounted) {
          console.log('[GameContainer] サウンド初期化完了');
          setSoundsLoaded(true);
        }
      } catch (err) {
        console.error('[GameContainer] サウンド初期化エラー:', err);
        // エラーがあっても最低限の機能は使えるようにする
        if (isMounted) {
          setSoundsLoaded(true);
        }
      }
    };

    initSound();

    return () => {
      isMounted = false;
      console.log('[GameContainer] コンポーネントがアンマウントされます');
    };
  }, []);

  // キーボードイベントリスナーの登録・解除
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // ゲーム終了時にリザルト画面へ遷移する処理
  useEffect(() => {
    if (gameState.isGameClear === true) {
      console.log(
        '[GameContainer] ゲームクリア状態を検出 - リザルト画面へ遷移します'
      );

      // 少し遅延させてから画面遷移
      const timeoutId = setTimeout(() => {
        goToScreen(SCREENS.RESULT);
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [gameState.isGameClear, goToScreen]);

  // ゲームクリア状態の場合は何も表示しない
  if (gameState.isGameClear === true) {
    return null;
  }

  // 次に入力すべきキーを取得
  const nextKey = displayInfo.nextChar || '';

  // アニメーションバリアント
  const animationVariants = {
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
      animate: { scale: [1, 1.1, 1] },
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
  };

  // ゲーム画面レイアウト
  return (
    <div className={styles.typing_game_wrapper}>
      <div className={styles.typing_game}>
        <motion.header
          className={styles.typing_game__header}
          initial={animationVariants.header.initial}
          animate={animationVariants.header.animate}
          transition={animationVariants.header.transition}
        >
          {/* 統計情報表示コンポーネントを使用 */}
          <StatsDisplay
            kpm={stats.kpm}
            accuracy={stats.accuracy}
            solvedCount={gameState.solvedCount}
            requiredProblemCount={requiredProblemCount}
          />
        </motion.header>

        <motion.main
          className={styles.typing_game__main}
          initial={animationVariants.gameArea.initial}
          animate={animationVariants.gameArea.animate}
          transition={animationVariants.gameArea.transition}
        >
          <div className={styles.typing_game__content_area}>
            {/* お題エリア */}
            <motion.div
              className={styles.typing_game__problem_area}
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
                romaji={displayInfo.romaji}
                typedLength={displayInfo.typedLength}
                nextChar={displayInfo.nextChar}
                isError={displayInfo.isError}
                className={styles.typing_game__input_display}
                inputMode={displayInfo.inputMode}
                currentInput={displayInfo.currentInput}
                currentCharRomaji={displayInfo.currentCharRomaji}
              />
            </motion.div>

            {/* キーボード表示 */}
            <motion.div
              className={styles.canvas_keyboard_container}
              initial={animationVariants.keyboard.initial}
              animate={animationVariants.keyboard.animate}
              transition={animationVariants.keyboard.transition}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            >
              <CanvasKeyboard
                nextKey={nextKey}
                lastPressedKey={lastPressedKey}
                isError={displayInfo.isError}
                layout="jp"
              />
            </motion.div>
          </div>
        </motion.main>

        {/* ESCショートカット */}
        <motion.div
          className={styles.typing_game__shortcuts_inside}
          onClick={() => {
            if (soundsLoaded) {
              soundSystem.playSound('button');
            }
            goToScreen(SCREENS.MAIN_MENU);
          }}
          style={{ cursor: 'pointer' }}
          initial={animationVariants.shortcut.initial}
          animate={animationVariants.shortcut.animate}
          transition={animationVariants.shortcut.transition}
          whileHover={animationVariants.shortcut.whileHover}
        >
          <span className={styles.typing_game__shortcut_item}>
            <kbd>Esc</kbd>{' '}
            <span className={styles.typing_game__shortcut_text}>
              メニューへ
            </span>
          </span>
        </motion.div>
      </div>
    </div>
  );
};

export default GameContainer;
