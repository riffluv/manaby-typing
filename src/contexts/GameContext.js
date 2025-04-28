'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProblemsByDifficulty } from '../utils/ProblemData';
import soundSystem from '../utils/SoundUtils';

// ゲームの状態を管理するコンテキスト
const GameContext = createContext();

// カスタムフック - コンポーネントからコンテキストを簡単に使用できるようにする
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

// 画面の種類を定義
export const SCREENS = {
  MAIN_MENU: 'MAIN_MENU',
  GAME: 'GAME',
  SETTINGS: 'SETTINGS',
  CREDITS: 'CREDITS',
  RESULT: 'RESULT', // リザルト画面を追加
  RANKING: 'RANKING', // ランキング画面を追加
};

// ゲームの状態管理プロバイダーコンポーネント
export const GameProvider = ({ children }) => {
  // 現在表示する画面の状態
  const [currentScreen, setCurrentScreen] = useState(SCREENS.MAIN_MENU);

  // ゲームの設定
  const [settings, setSettings] = useState({
    difficulty: 'normal',
    soundEnabled: true,
    sfxEnabled: true,
    bgmEnabled: true,
    sfxVolume: 1.0,
    bgmVolume: 0.5,
    // 他の設定項目をここに追加
  });

  // localStorage から保存された背景を読み込み適用する
  useEffect(() => {
    // クライアントサイドでのみ実行（Next.js用）
    if (typeof window !== 'undefined') {
      try {
        // 管理者モードかどうかを確認
        const isAdmin = localStorage.getItem('isAdmin') === 'true';

        // 管理者モードの場合のみ背景を適用
        if (isAdmin) {
          // localStorageから背景画像を読み込む
          const savedBackgroundImage = localStorage.getItem(
            'savedBackgroundImage'
          );

          // localStorageからCSSスタイル情報を読み込む
          let savedStyleInfo = null;
          try {
            const savedStyleStr = localStorage.getItem('savedBackgroundStyle');
            if (savedStyleStr) {
              savedStyleInfo = JSON.parse(savedStyleStr);
              console.log(
                '管理者モード: 保存されたスタイル情報を読み込みました',
                savedStyleInfo
              );
            }
          } catch (styleError) {
            console.error('スタイル情報の読み込みエラー:', styleError);
          }

          if (savedBackgroundImage || savedStyleInfo) {
            console.log('管理者モード: 保存された背景情報を読み込みました');

            // メインコンテナ要素を取得して背景を適用
            setTimeout(() => {
              const mainContainer = document.querySelector('#__next > div');
              if (mainContainer) {
                // スタイル情報を適用（存在する場合）
                if (savedStyleInfo) {
                  Object.entries(savedStyleInfo).forEach(([key, value]) => {
                    // backgroundImageは別途設定するので除外
                    if (key !== 'backgroundImage' && value) {
                      mainContainer.style[key] = value;
                    }
                  });
                }

                // 背景画像を設定（存在する場合）
                if (savedBackgroundImage) {
                  mainContainer.style.backgroundImage = `url(${savedBackgroundImage})`;
                  mainContainer.style.backgroundSize = 'cover';
                  mainContainer.style.backgroundPosition = 'center';
                }

                console.log(
                  '管理者モード: 保存された背景とスタイルを適用しました'
                );
              } else {
                console.warn(
                  'メインコンテナ要素が見つからないため背景を適用できませんでした'
                );
              }
            }, 100); // DOM要素が確実に存在するよう少し遅延を設ける
          }
        } else {
          console.log('管理者モードではないため、カスタム背景を適用しません');
        }
      } catch (error) {
        console.error(
          '保存された背景の読み込み中にエラーが発生しました:',
          error
        );
      }
    }
  }, []);

  // 難易度が変更されたら問題リストを更新
  const [problems, setProblems] = useState(getProblemsByDifficulty('normal'));

  // 難易度が変更されたら問題リストを更新
  useEffect(() => {
    setProblems(getProblemsByDifficulty(settings.difficulty));
  }, [settings.difficulty]);

  // サウンド設定が変更されたらサウンドシステムに反映
  useEffect(() => {
    // 後方互換性のために soundEnabled も使用
    const isSoundEnabled = settings.soundEnabled;

    // 効果音の設定を反映
    soundSystem.setSfxEnabled(isSoundEnabled && settings.sfxEnabled);
    soundSystem.setSfxVolume(settings.sfxVolume);

    // BGMの設定を反映
    soundSystem.setBgmEnabled(isSoundEnabled && settings.bgmEnabled);
    soundSystem.setBgmVolume(settings.bgmVolume);
  }, [
    settings.soundEnabled,
    settings.sfxEnabled,
    settings.bgmEnabled,
    settings.sfxVolume,
    settings.bgmVolume,
  ]);

  // ゲームのスコアや進行状態
  const [gameState, setGameState] = useState({
    level: 1,
    solvedCount: 0,
    currentProblemIndex: 0,
    typingProgress: '',
    mistakes: 0,
    isGameOver: false,
    isGameClear: false,
    // タイピング統計情報の追加
    correctKeyCount: 0, // 正確に入力したキー数（KPM計算用）
    startTime: null, // ゲーム開始時間
    endTime: null, // ゲーム終了時間
    hasStartedTyping: false, // 最初のキー入力を検出するフラグ（Weather Typing風）
    problemKPMs: [], // 各問題ごとのKPM値を保存する配列 - Weather Typing風
    currentProblemStartTime: null, // 現在の問題の開始時間 - Weather Typing風
    currentProblemKeyCount: 0, // 現在の問題で入力したキー数 - Weather Typing風
  });

  // ゲームをリセットする関数
  const resetGame = () => {
    // 難易度に基づいて問題リストを取得（ランダム化する）
    const {
      getProblemsByDifficulty,
      getRandomizedProblems,
    } = require('../utils/ProblemData');

    // 管理者設定で変更されたお題数を優先し、設定されていない場合はデフォルト値を使用
    let requiredProblemCount;

    // 管理者設定で変更されたお題数を確認
    if (gameState.requiredProblemCount !== undefined) {
      // 管理者設定値を優先
      requiredProblemCount = gameState.requiredProblemCount;
      console.log(
        '[DEBUG] ゲームリセット - 管理者設定のお題数を使用:',
        requiredProblemCount
      );
    } else {
      // 管理者設定がない場合はデフォルト値（すべての難易度で同じ）
      requiredProblemCount = 8; // すべての難易度で共通の問題数
      console.log('[DEBUG] ゲームリセット - デフォルトお題数(8問)を使用');
    }

    // 問題をランダム化して取得
    const currentProblems = getRandomizedProblems(settings.difficulty);
    setProblems(currentProblems);

    // デバッグ出力
    console.log('[DEBUG] ゲームリセット - 問題リスト:', currentProblems);

    // 最初の問題を選択（問題リストが空でないことを確認）
    const initialProblem =
      currentProblems && currentProblems.length > 0 ? currentProblems[0] : null;

    console.log('[DEBUG] ゲームリセット - 初期問題:', initialProblem);

    if (!initialProblem) {
      console.error(
        '[ERROR] 初期問題を設定できません。問題データが不足しています。'
      );
    }

    // ゲームステートをリセット
    setGameState({
      level: 1,
      solvedCount: 0,
      currentProblemIndex: 0,
      currentProblem: initialProblem, // 明示的に現在の問題を設定
      problems: currentProblems, // 問題リストも直接ステートに保存
      typingProgress: '',
      mistakes: 0,
      isGameOver: false,
      isGameClear: false,
      startTime: null, // 最初のキー入力まで開始時間を設定しない（Weather Typing風）
      typedCount: 0, // 入力文字数を初期化
      // タイピング統計情報の初期化
      correctKeyCount: 0, // 正確に入力したキー数
      endTime: null, // ゲーム終了時間（まだ終了していない）
      requiredProblemCount: requiredProblemCount, // お題数を設定
      hasStartedTyping: false, // 最初のキー入力を検出するフラグをリセット
      problemKPMs: [], // 各問題ごとのKPM値を保存する配列 - Weather Typing風
      currentProblemStartTime: null, // 現在の問題の開始時間 - Weather Typing風
      currentProblemKeyCount: 0, // 現在の問題で入力したキー数 - Weather Typing風
    });
  };

  // 画面を切り替える関数
  const navigateTo = (screen) => {
    console.log(`[DEBUG] navigateTo が呼び出されました: ${screen}`);
    console.log(`[DEBUG] 現在の画面: ${currentScreen}`);

    if (Object.values(SCREENS).includes(screen)) {
      if (screen === SCREENS.GAME) {
        resetGame();
      }
      console.log(`[DEBUG] 画面を切り替えます: ${currentScreen} -> ${screen}`);
      setCurrentScreen(screen);
    } else {
      console.error(`Invalid screen: ${screen}`);
    }
  };

  // 現在の問題を取得するヘルパー関数
  const getCurrentProblem = () => {
    return problems[gameState.currentProblemIndex] || problems[0];
  };

  // コンテキストで提供する値
  const value = {
    currentScreen,
    navigateTo,
    settings,
    setSettings,
    gameState,
    setGameState,
    resetGame,
    problems,
    getCurrentProblem,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
