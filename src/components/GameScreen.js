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

// コンポーネントをインポート
import ProblemDisplay from './typing/ProblemDisplay';
import CanvasKeyboard from './typing/CanvasKeyboard';
import Button from './common/Button';
// シンプルタイピング表示コンポーネントをインポート
import SimpleTypingDisplay from './typing/SimpleTypingDisplay';
import { useSimpleTypingAdapter } from '../hooks/useSimpleTypingAdapter';

// リファクタリング後のコンポーネント実装
const GameScreen = () => {
  // コンテキストから状態と関数を取得
  const { gameState, setGameState, problems } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();

  // 問題クリアに必要なお題数
  const requiredProblemCount = gameState.requiredProblemCount || 5;

  // typingの参照を保持するためのref
  const typingRef = useRef(null);

  // 最後に押されたキー（キーボード表示用）
  const [lastPressedKey, setLastPressedKey] = useState('');

  // サウンド読み込み状態のフラグ
  const [soundsLoaded, setSoundsLoaded] = useState(false);

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

        console.log(
          '【KPM計算】タイピングフックから取得した問題データ:',
          problemStats
        );

        // 正確なKPM計算のためのデータ確認と収集
        const correctKeyCount = typingStats.correctCount || 0;
        const elapsedTimeMs = endTime - startTime;

        // Weather Typing公式計算方法で再計算: 問題ごとのKPMの平均値を使用
        const averageKPM = TypingUtils.calculateAverageKPM(problemStats);

        console.log('【KPM計算】問題ごとのKPM平均値:', averageKPM);

        // 従来のKPM計算方法（参考用）
        const legacyKPM = TypingUtils.calculateWeatherTypingKPM(
          correctKeyCount,
          elapsedTimeMs,
          problemStats
        );

        console.log('【KPM計算】従来方式のKPM:', legacyKPM);

        // 統計情報の計算
        const stats = {
          totalTime: typingStats.elapsedTimeSeconds || elapsedTimeMs / 1000,
          correctCount: correctKeyCount,
          missCount: typingStats.missCount || 0,
          accuracy: typingStats.accuracy || 100,
          kpm: averageKPM, // Weather Typing公式計算: 問題ごとのKPMの平均値
          legacyKpm: legacyKPM, // 従来計算方法も残しておく（参考値）
          problemKPMs: updatedProblemKPMs || [],
          problemStats: problemStats, // 問題ごとの詳細データ
          elapsedTimeMs: elapsedTimeMs // 追加: リザルト画面でも使用できるように
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

  // シンプル表示用のプロパティを取得（typingの初期化後に実行）
  const simpleProps = useSimpleTypingAdapter(typing);

  // サウンドの初期化 - パフォーマンス最適化版
  useEffect(() => {
    let isMounted = true; // クリーンアップ用のフラグ

    const initSound = async () => {
      try {
        console.log('[GameScreen] サウンドシステムの初期化を開始します...');

        // AudioContextを確実に再開
        soundSystem.resume();

        // 効果音のプリロードを並列で行う（パフォーマンス向上）
        const preloadSounds = ['success', 'error', 'button'];
        await Promise.all(preloadSounds.map(name => 
          soundSystem.loadSound(name, soundSystem.soundPresets[name])
        ));

        // 残りの効果音は後回し
        setTimeout(() => {
          soundSystem.loadSound('complete', soundSystem.soundPresets.complete)
            .catch(e => console.error('効果音のロードに失敗:', e));
        }, 1000);

        // コンポーネントがアンマウントされていなければ状態を更新
        if (isMounted) {
          console.log('[GameScreen] サウンド初期化完了:', {
            contextState: soundSystem.context.state,
            loadedSounds: Object.keys(soundSystem.sfxBuffers),
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

      // 最後に押されたキーを更新（キーボード表示用）
      setLastPressedKey(e.key);

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

      // タイピング処理を行う - 効果音はuseTypingGame内で処理される
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

      if (
        !statsToPass ||
        statsToPass.kpm === undefined ||
        statsToPass.kpm === 0
      ) {
        console.log('【GameScreen】統計情報が不完全なため再計算します');

        // 終了時間を確認
        const endTime = gameState.endTime || Date.now();
        const startTime = gameState.startTime || Date.now();
        const elapsedTimeMs = endTime - startTime;

        // 問題ごとのKPMから総合KPMを計算（Weather Typing公式方法）
        const problemStats = (gameState.problemStats || []).map((problem) => ({
          problemKeyCount: problem.problemKeyCount || 0,
          problemElapsedMs: problem.problemElapsedMs || 0,
        }));

        // useTypingGameフックからのデータを取得
        const typingStats = typingRef.current?.stats || {};

        // 統計情報を構築
        statsToPass = {
          totalTime: typingStats.elapsedTimeSeconds || elapsedTimeMs / 1000,
          correctCount:
            typingStats.correctCount || gameState.correctKeyCount || 0,
          missCount: typingStats.missCount || 0,
          accuracy: typingStats.accuracy || 100,
          kpm: typingStats.kpm || 0,
          problemKPMs: gameState.problemKPMs || [],
          problemStats: problemStats,
        };

        console.log('【GameScreen】再計算した統計情報:', statsToPass);
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
      // 新しいステータス表示用のアニメーション
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
    console.log(
      '【GameScreenNew】ゲームクリア状態のため、何も表示せずにリターンします'
    );
    return null;
  }

  // KPM情報の計算
  const currentKpm = typing.stats?.kpm || 0;
  const accuracy = typing.stats?.accuracy || 100;

  // ゲーム画面レイアウトの最適化
  return (
    <div className={styles.typing_game_wrapper}>
      <div className={styles.typing_game}>
        <motion.header
          className={styles.typing_game__header}
          initial={animationVariants.header.initial}
          animate={animationVariants.header.animate}
          transition={animationVariants.header.transition}
        >
          <motion.div
            className={styles.typing_game__level_display}
            initial={animationVariants.gameLevelScale.initial}
            animate={animationVariants.gameLevelScale.animate}
            transition={animationVariants.gameLevelScale.transition}
          >
            お題: {gameState.solvedCount + 1}/{requiredProblemCount}
          </motion.div>

          {/* タイピングステータス表示 - 新しく追加 */}
          <motion.div
            className={styles.typing_game__status}
            initial={animationVariants.status.initial}
            animate={animationVariants.status.animate}
            transition={animationVariants.status.transition}
          >
            <span className={styles.typing_game__status_item}>
              KPM: <strong>{Math.round(currentKpm)}</strong>
            </span>
            <span className={styles.typing_game__status_item}>
              正確さ: <strong>{Math.round(accuracy)}%</strong>
            </span>
          </motion.div>
        </motion.header>

        <motion.main
          className={styles.typing_game__main}
          initial={animationVariants.gameArea.initial}
          animate={animationVariants.gameArea.animate}
          transition={animationVariants.gameArea.transition}
        >
          <div className={styles.typing_game__content_area}>
            {/* お題エリア - アニメーションを追加 */}
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

              {/* 入力エリア - シンプル表示専用 */}
              <SimpleTypingDisplay
                romaji={simpleProps.romaji}
                typedLength={simpleProps.typedLength}
                nextChar={simpleProps.nextChar}
                isError={simpleProps.isError}
                className={styles.typing_game__input_display}
                inputMode={simpleProps.inputMode}
                currentInput={simpleProps.currentInput}
                currentCharRomaji={simpleProps.currentCharRomaji}
              />
            </motion.div>

            {/* キャンバスキーボードを直接表示 - マージンを調整して空白を減らす */}
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
                isError={typing.errorAnimation}
                layout="jp"
              />
            </motion.div>
          </div>
        </motion.main>

        {/* ESCショートカットをヘッダーの外に移動して絶対配置 */}
        <motion.div
          className={styles.typing_game__shortcuts_inside}
          onClick={() => {
            soundSystem.play('button');
            goToScreen(SCREENS.MAIN_MENU, {
              playSound: true,
              soundType: 'button',
            });
          }}
          style={{ cursor: 'pointer' }}
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
