'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { useSoundContext } from '../contexts/SoundContext';
import soundSystem from '../utils/SoundUtils'; // soundSystemをインポート
import MainMenu from './MainMenu';
import GameScreen from './GameScreen';
import ResultScreen from './ResultScreen';
import RankingScreen from './RankingScreen';
import { useSettingsModal } from './MainMenu';

// トランジションタイプのプリセット
const transitionPresets = {
  // ページがスライドするトランジション
  slide: {
    initial: { x: 500, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -500, opacity: 0 },
    transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.5 },
  },
  // フェードとスケールのトランジション（高級感のあるゲーム風）
  fade: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 25,
      duration: 0.4,
    },
  },
  // ゲームクリア時の派手なトランジション（最適化版）
  gameComplete: {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 450, // より迅速な動きに
        damping: 25,
        duration: 0.4, // 0.7秒から0.4秒に短縮
      },
    },
    exit: {
      opacity: 0,
      scale: 1.05,
      transition: { duration: 0.2 }, // 0.3秒から0.2秒に短縮
    },
  },
  // メニューエントリ用の上からスライドイン
  menuReveal: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 100, opacity: 0 },
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 30,
      duration: 0.6,
    },
  },
};

// 各画面ごとの最適なトランジションタイプを設定
const getTransitionForScreen = (from, to) => {
  // リザルト画面への遷移は特別なエフェクト
  if (to === SCREENS.RESULT) {
    return transitionPresets.gameComplete;
  }

  // メインメニューへの遷移
  if (to === SCREENS.MAIN_MENU) {
    return transitionPresets.menuReveal;
  }

  // それ以外はスライド遷移
  return transitionPresets.fade;
};

// 画面遷移の透明度のバックグラウンドオーバーレイ
const PageTransitionOverlay = ({ isActive }) => {
  return (
    <motion.div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.12)', // 透明度を大幅に下げる
        zIndex: 10,
        pointerEvents: 'none',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 0.3 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }} // トランジション時間を最小限に
    />
  );
};

// グローバルな設定モーダル状態を保持
let globalSettingsModalControl = null;

const TransitionManager = () => {
  const { currentScreen, navigateTo, gameState } = useGameContext();
  const [previousScreen, setPreviousScreen] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { goToScreen } = usePageTransition();
  // このフラグは音声が二重再生されないようにするためのもの
  const [resultSoundPlayed, setResultSoundPlayed] = useState(false);

  // 各種コンテキストが利用可能
  const soundCtx = useSoundContext();
  const { soundEnabled, bgmEnabled, sfxEnabled } = soundCtx || {}; // デフォルトfalseを設定
  const soundSystem = soundCtx?.soundSystem || null;

  // 設定モーダル制御をグローバル変数に保存
  const settingsModalControl = useSettingsModal();
  globalSettingsModalControl = settingsModalControl;

  // 画面が変更されたときの処理（簡潔化）
  useEffect(() => {
    // 設定画面への遷移時はメインメニューを表示して設定モーダルを開く
    if (
      currentScreen === SCREENS.SETTINGS &&
      previousScreen !== SCREENS.SETTINGS
    ) {
      // メインメニューを表示
      navigateTo(SCREENS.MAIN_MENU);
      // 少し遅延させて設定モーダルを開く
      setTimeout(() => {
        if (globalSettingsModalControl) {
          globalSettingsModalControl.openSettingsModal();
        }
      }, 100);
    }

    if (previousScreen !== currentScreen) {
      // 遷移中フラグを立てる
      setIsTransitioning(true);

      // リザルト画面への遷移時のフラグ処理は削除
      // 音声の再生はResultScreenコンポーネント内で処理する

      // ごく短い時間だけトランジション効果を表示
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // 非常に短いトランジション時間

      // 前の画面を更新
      setPreviousScreen(currentScreen);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, previousScreen, navigateTo]);

  // 初回レンダリング時は暗くならないようにする
  useEffect(() => {
    if (previousScreen === null) {
      setIsTransitioning(false);
    }
  }, [previousScreen]);

  // トランジション設定を決定
  const transitionVariants = getTransitionForScreen(
    previousScreen,
    currentScreen
  );

  // 現在の画面に対応するコンポーネントを返す
  const renderCurrentScreen = () => {
    // コンテキストから設定を取得
    const { settings } = useGameContext();
    
    switch (currentScreen) {
      case SCREENS.GAME:
        // MCP使用設定に基づいてコンポーネントを選択
        return settings.useMCP ? <MCPGameScreen /> : <GameScreen />;
      case SCREENS.SETTINGS:
        // 設定画面はメインメニューでモーダル表示するため、メインメニューを表示
        return <MainMenu />;
      case SCREENS.RESULT:
        // ResultScreenに確実に統計データを渡すよう修正
        // gameStateからstatsを取得、なければ空オブジェクト
        const statsToPass = gameState.stats || {};
        console.log(
          'TransitionManager: ResultScreenに渡す統計データ',
          statsToPass
        );

        return (
          <ResultScreen
            stats={statsToPass}
            onClickRetry={() => goToScreen(SCREENS.GAME, { playSound: true })}
            onClickMenu={() =>
              goToScreen(SCREENS.MAIN_MENU, { playSound: true })
            }
            onClickRanking={() =>
              goToScreen(SCREENS.RANKING, {
                playSound: true,
                gameState: { stats: statsToPass },
              })
            }
            playSound={true} // 常に音声を再生するように設定
          />
        );
      case SCREENS.RANKING:
        return <RankingScreen />;
      case SCREENS.MAIN_MENU:
      default:
        return <MainMenu />;
    }
  };

  return (
    <>
      <PageTransitionOverlay isActive={isTransitioning} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={transitionVariants}
          style={{ width: '100%', height: '100%' }}
        >
          {renderCurrentScreen()}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// 高級な画面遷移を行う関数をエクスポート
export const usePageTransition = () => {
  const { navigateTo } = useGameContext();
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * 画面遷移を実行する関数
   * @param {string} screen - 遷移先の画面
   * @param {object} options - 遷移オプション
   * @param {boolean} options.playSound - 効果音を再生するかどうか（デフォルト：true）
   * @param {string} options.soundType - 再生する効果音のタイプ（デフォルト：'button'）
   * @param {string} options.from - 遷移元の画面（履歴管理に使用）
   * @param {boolean} options.immediate - 即時遷移を実行するかどうか（デフォルト：false）
   * @param {object} options.gameState - ゲームの状態データ（ランキング画面などに渡すデータ）
   */
  const goToScreen = (
    screen,
    options = {
      playSound: true,
      soundType: 'button',
      immediate: false,
      gameState: null,
    }
  ) => {
    // デバッグログ - 遷移リクエストを記録
    console.log(
      `goToScreen: 画面遷移リクエスト - 宛先: ${screen}, オプション:`,
      JSON.stringify({
        ...options,
        gameState: options.gameState ? 'データあり' : 'なし',
      })
    );

    // 遷移中は新たな遷移をブロック（ただしimmediate=trueの場合は例外）
    if (isTransitioning && !options.immediate) {
      console.log('goToScreen: 現在遷移中のため、リクエストをスキップします');
      return;
    }

    // 現在の画面情報を取得
    const currentScreen = window.history.state?.screen || SCREENS.MAIN_MENU;

    // 設定画面への遷移をモーダル表示に変更
    if (screen === SCREENS.SETTINGS) {
      // 効果音を先に確実に鳴らす（オプションでオフにしない限り）
      try {
        // 音声コンテキストの状態を確認
        if (soundSystem.context && soundSystem.context.state === 'suspended') {
          soundSystem.context.resume();
        }

        // 効果音を再生（オプションでオフにできる）
        if (options.playSound !== false) {
          soundSystem.play(options.soundType || 'button');
        }
      } catch (err) {
        console.error('音声再生でエラーが発生しました:', err);
      }

      // メインメニューにいない場合は一旦メインメニューに遷移
      navigateTo(SCREENS.MAIN_MENU);

      // 少し遅延させて設定モーダルを開く
      setTimeout(() => {
        if (globalSettingsModalControl) {
          globalSettingsModalControl.openSettingsModal();
        }
      }, 100);

      return;
    }

    // 効果音を先に確実に鳴らす（オプションでオフにしない限り）
    try {
      // 音声コンテキストの状態を確認
      if (soundSystem.context && soundSystem.context.state === 'suspended') {
        soundSystem.context.resume();
      }

      // 効果音を再生（オプションでオフにできる）
      if (options.playSound !== false) {
        // リザルト画面への遷移時はここでは効果音を再生せず、ResultScreenで再生する
        if (screen !== SCREENS.RESULT) {
          // ESCキーによるメインメニュー画面遷移の場合、GameScreenですでに効果音が鳴っている可能性があるため、
          // from=GAMEかつto=MAIN_MENUの場合は再生しない
          const isEscToMainMenu = options.from === SCREENS.GAME && screen === SCREENS.MAIN_MENU;

          if (!isEscToMainMenu) {
            // 指定されたサウンドをすぐに再生する（デフォルトはbutton）
            soundSystem.play(options.soundType || 'button');
          }
        }
      }

      console.log(
        '画面遷移を実行します:',
        screen,
        'サウンド:',
        options.playSound !== false
          ? `有効 (${options.soundType || 'button'})`
          : '無効',
        '遷移元:',
        options.from || currentScreen
      );
    } catch (err) {
      console.error('音声再生でエラーが発生しました:', err);
    }

    // トランジションフラグをセット
    setIsTransitioning(true);

    // 画面遷移履歴の更新 - 現在の画面を遷移元として記録
    const historyState = {
      screen: screen,
      options: {
        ...options,
        from: options.from || currentScreen, // 遷移元を記録
      },
    };
    window.history.replaceState(historyState, '', window.location.pathname);

    // 画面遷移実行（リザルト画面への遷移は遅延なし、ESCキーによる遷移は最小遅延、それ以外は若干の遅延）
    let delay = 20;

    // 遷移先がリザルト画面または即時遷移オプションが指定されている場合は遅延なし
    if (screen === SCREENS.RESULT || options.immediate) {
      delay = 0;
    }

    // メインメニューへの遷移（特にESCキーからの遷移）は優先的に処理
    if (screen === SCREENS.MAIN_MENU && options.from === SCREENS.RESULT) {
      console.log('ResultScreenからメインメニューへの遷移を優先処理します');
      delay = 0; // 遅延なし

      // トランジション中フラグをすぐにリセット（ESCキーの反応性向上のため）
      setIsTransitioning(false);
    }

    setTimeout(() => {
      // ゲーム状態データが提供されている場合は、遷移先に応じて処理
      if (options.gameState && screen === SCREENS.RANKING) {
        console.log(
          'ランキング画面に遷移するためのゲーム状態データ:',
          options.gameState
        );
        // navigateToの呼び出し時にゲーム状態データを渡す
        navigateTo(screen, options.gameState);
      } else {
        navigateTo(screen);
      }

      // 遷移後にフラグをリセット（タイミングを最適化）
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // 200msに短縮
    }, delay);
  };

  return { goToScreen, isTransitioning };
};

export default TransitionManager;
