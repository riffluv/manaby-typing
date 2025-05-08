'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DIFFICULTIES, getRandomizedProblems } from '../utils/ProblemData';
import soundSystem from '../utils/SoundUtils';
import StorageUtils from '../utils/StorageUtils';

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
  RESULT: 'RESULT',
  RANKING: 'RANKING',
};

// デフォルトのゲーム設定
const DEFAULT_SETTINGS = {
  difficulty: DIFFICULTIES.NORMAL,
  soundEnabled: true,
  bgmEnabled: true,
  bgmVolume: 0.5,
  sfxEnabled: true,
  sfxVolume: 1.0,
  requiredProblemCount: 8, // デフォルトお題数
  // 高速パフォーマンスモードは常に有効
  highPerformanceMode: true,
};

// 初期ゲーム状態
const INITIAL_GAME_STATE = {
  level: 1,
  solvedCount: 0,
  currentProblemIndex: 0,
  typingProgress: '',
  mistakes: 0,
  isGameOver: false,
  isGameClear: false,
  playerName: 'プレイヤー', // デフォルト名
  // タイピング統計情報
  correctKeyCount: 0, // 正確に入力したキー数（KPM計算用）
  startTime: null, // ゲーム開始時間
  endTime: null, // ゲーム終了時間
  hasStartedTyping: false, // 最初のキー入力を検出するフラグ
  problemKPMs: [], // 各問題ごとのKPM値を保存する配列
  currentProblemStartTime: null, // 現在の問題の開始時間
  currentProblemKeyCount: 0, // 現在の問題で入力したキー数
};

// ゲームの状態管理プロバイダーコンポーネント
export const GameProvider = ({ children }) => {
  // 現在表示する画面の状態
  const [currentScreen, setCurrentScreen] = useState(SCREENS.MAIN_MENU);

  // ゲームの設定 - ローカルストレージから初期値を取得
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // 問題データ
  const [problems, setProblems] = useState([]);

  // ゲームのスコアや進行状態
  const [gameState, setGameState] = useState({ ...INITIAL_GAME_STATE });

  // ゲームの初期化（マウント時に1回だけ実行）
  useEffect(() => {
    try {
      // ローカルストレージから設定を読み込む
      const savedSettings = StorageUtils.getGameSettings(DEFAULT_SETTINGS);
      setSettings(savedSettings);

      // 保存されたユーザー名を取得
      const savedUsername = StorageUtils.getUsername();
      if (savedUsername) {
        setGameState((prev) => ({ ...prev, playerName: savedUsername }));
      }

      // 難易度に応じた問題をロード
      const initialProblems = getRandomizedProblems(savedSettings.difficulty);
      setProblems(initialProblems);

      // 背景の適用 (管理者モードの場合)
      StorageUtils.applyBackgroundFromStorage();

      // 最終プレイ日を記録
      StorageUtils.saveLastPlayedDate();

      // サウンドシステムの初期化
      console.log('[GameContext] サウンドシステムの初期化を実行...');

      // 基本的な効果音を先行ロード（応答性確保のため）
      soundSystem.initializeAllSounds().then(success => {
        if (success) {
          console.log('[GameContext] 効果音の先行ロード完了');
        }
      });

      console.log('[GameContext] 初期化完了');
    } catch (error) {
      console.error('[GameContext] 初期化エラー:', error);
    }
  }, []);

  // 難易度が変更されたら問題リストを更新
  useEffect(() => {
    try {
      // 設定が変更されたらローカルストレージに保存
      StorageUtils.saveGameSettings(settings);

      // 難易度変更時に問題リストを更新
      const updatedProblems = getRandomizedProblems(settings.difficulty);
      setProblems(updatedProblems);

      console.log(`[GameContext] 難易度「${settings.difficulty}」に更新`);
    } catch (error) {
      console.error('[GameContext] 難易度更新エラー:', error);
    }
  }, [settings.difficulty]);

  // サウンド設定が変更されたらサウンドシステムに反映
  useEffect(() => {
    try {
      // 全体サウンド設定
      const isSoundEnabled = settings.soundEnabled;

      // 効果音の設定を反映
      soundSystem.setSfxEnabled(isSoundEnabled && settings.sfxEnabled);
      soundSystem.setSfxVolume(settings.sfxVolume);

      // BGM設定を反映
      soundSystem.setBgmEnabled(isSoundEnabled && settings.bgmEnabled);
      soundSystem.setBgmVolume(settings.bgmVolume);

      console.log(`[GameContext] サウンド設定更新: SFX=${isSoundEnabled && settings.sfxEnabled}, BGM=${isSoundEnabled && settings.bgmEnabled}`);
    } catch (error) {
      console.error('[GameContext] サウンド設定更新エラー:', error);
    }
  }, [settings.soundEnabled, settings.sfxEnabled, settings.sfxVolume, settings.bgmEnabled, settings.bgmVolume]);

  // 画面遷移時の処理
  useEffect(() => {
    try {
      // 管理者モードの場合、画面に応じた背景を適用
      if (StorageUtils.isAdminMode()) {
        StorageUtils.applyScreenBackground(currentScreen);
        console.log(`[GameContext] 画面背景更新: ${currentScreen}`);
      }

      // 注意: BGMの再生はSoundContextが管理するため、
      // ここではBGMの自動再生を行わないように変更しました
    } catch (error) {
      console.error('[GameContext] 背景更新エラー:', error);
    }
  }, [currentScreen]);

  // ゲームをリセットする関数
  const resetGame = useCallback(() => {
    try {
      // 問題をランダム化して取得
      const requiredProblemCount =
        settings.requiredProblemCount || DEFAULT_SETTINGS.requiredProblemCount;
      const currentProblems = getRandomizedProblems(
        settings.difficulty,
        requiredProblemCount
      );
      setProblems(currentProblems);

      // 最初の問題を選択
      const initialProblem =
        currentProblems && currentProblems.length > 0 ? currentProblems[0] : null;

      if (!initialProblem) {
        console.error('[ERROR] 初期問題を設定できません。問題データが不足しています。');
        return;
      }

      // ゲームステートをリセット
      const resetState = {
        ...INITIAL_GAME_STATE,
        currentProblem: initialProblem,
        problems: currentProblems,
        requiredProblemCount,
        playerName: StorageUtils.getUsername() || INITIAL_GAME_STATE.playerName,
      };

      setGameState(resetState);
      console.log('[GameContext] ゲームリセット完了');
    } catch (error) {
      console.error('[GameContext] ゲームリセットエラー:', error);
    }
  }, [settings.difficulty, settings.requiredProblemCount]);

  // 画面を切り替える関数
  const navigateTo = useCallback((screen) => {
    if (Object.values(SCREENS).includes(screen)) {
      if (screen === SCREENS.GAME) {
        resetGame();
      }
      setCurrentScreen(screen);
      console.log(`[GameContext] 画面遷移: ${screen}`);
    } else {
      console.error(`[ERROR] 無効な画面: ${screen}`);
    }
  }, [resetGame]);

  // 現在の問題を取得するヘルパー関数
  const getCurrentProblem = useCallback(() => {
    return problems[gameState.currentProblemIndex] || null;
  }, [problems, gameState.currentProblemIndex]);

  // ユーザー名を設定
  const setUsername = useCallback((name) => {
    if (name && typeof name === 'string') {
      // ゲーム状態とローカルストレージの両方を更新
      setGameState((prev) => ({ ...prev, playerName: name }));
      StorageUtils.saveUsername(name);
      console.log(`[GameContext] ユーザー名を設定: ${name}`);
    }
  }, []);

  // 設定を更新する関数
  const updateSettings = useCallback((newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      StorageUtils.saveGameSettings(updatedSettings);
      console.log('[GameContext] 設定を更新しました');
    } catch (error) {
      console.error('[GameContext] 設定更新エラー:', error);
    }
  }, [settings]);

  // ゲーム結果をローカルストレージに保存
  const saveGameResult = useCallback((resultData) => {
    try {
      if (resultData && resultData.kpm) {
        StorageUtils.saveHighScore(settings.difficulty, resultData);
        console.log(`[GameContext] ゲーム結果保存: KPM=${resultData.kpm}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GameContext] ゲーム結果保存エラー:', error);
      return false;
    }
  }, [settings.difficulty]);

  // ゲームの難易度を変更
  const changeDifficulty = useCallback((difficulty) => {
    if (Object.values(DIFFICULTIES).includes(difficulty)) {
      updateSettings({ difficulty });
      console.log(`[GameContext] 難易度変更: ${difficulty}`);
    } else {
      console.error(`[ERROR] 無効な難易度: ${difficulty}`);
    }
  }, [updateSettings]);

  // コンテキストで提供する値
  const value = {
    currentScreen,
    navigateTo,
    settings,
    setSettings: updateSettings,
    gameState,
    setGameState,
    resetGame,
    problems,
    getCurrentProblem,
    setUsername,
    saveGameResult,
    changeDifficulty,
    isAdminMode: StorageUtils.isAdminMode,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
