'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import MainMenu from './MainMenu';
import GameScreen from './GameScreen';
import SettingsScreen from './SettingsScreen';
import CreditsScreen from './CreditsScreen';
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
  const { currentScreen, navigateTo } = useGameContext();
  const [previousScreen, setPreviousScreen] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    switch (currentScreen) {
      case SCREENS.GAME:
        return <GameScreen />;
      case SCREENS.SETTINGS:
        // 設定画面はメインメニューでモーダル表示するため、メインメニューを表示
        return <MainMenu />;
      case SCREENS.CREDITS:
        return <CreditsScreen />;
      case SCREENS.RESULT:
        return <ResultScreen />;
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
   */
  const goToScreen = (screen, options = { playSound: true, soundType: 'button' }) => {
    // トランジション中は操作を無効化
    if (isTransitioning) return;

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
        // リザルト画面への遷移時は効果音を再生しない（ResultScreenで再生される）
        if (screen !== SCREENS.RESULT) {
          // 指定されたサウンドをすぐに再生する（デフォルトはbutton）
          soundSystem.play(options.soundType || 'button');
        }
      }

      console.log(
        '画面遷移を実行します:',
        screen,
        'サウンド:',
        options.playSound !== false ? `有効 (${options.soundType || 'button'})` : '無効'
      );
    } catch (err) {
      console.error('音声再生でエラーが発生しました:', err);
    }

    // トランジションフラグをセット
    setIsTransitioning(true);

    // 画面遷移実行（リザルト画面への遷移は遅延なし、それ以外は最小限の遅延）
    const delay = screen === SCREENS.RESULT ? 0 : 20;
    setTimeout(() => {
      navigateTo(screen);

      // 遷移後にフラグをリセット（タイミングを最適化）
      setTimeout(() => {
        setIsTransitioning(false);
      }, 200); // 300msから200msに短縮
    }, delay);
  };

  return { goToScreen, isTransitioning };
};

export default TransitionManager;
