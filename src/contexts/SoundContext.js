'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import soundSystem from '../utils/SoundUtils';

// サウンド設定のデフォルト値
const DEFAULT_SOUND_SETTINGS = {
  soundEnabled: true, // 全体のサウンド設定
  bgmEnabled: true,   // BGMの有効/無効
  bgmVolume: 0.5,     // BGMの音量 (0.0-1.0)
  sfxEnabled: true,   // 効果音の有効/無効
  sfxVolume: 1.0,     // 効果音の音量 (0.0-1.0)
};

// サウンドコンテキストの作成
const SoundContext = createContext();

/**
 * サウンド設定のコンテキストを使用するためのカスタムフック
 * @returns {Object} サウンド設定と関連する関数
 */
export const useSoundContext = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
};

/**
 * サウンド設定を管理するプロバイダーコンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {React.ReactNode} props.children - 子コンポーネント
 */
export const SoundProvider = ({ children }) => {
  // ローカルストレージからサウンド設定を読み込む
  const loadSoundSettings = () => {
    if (typeof window === 'undefined') {
      return DEFAULT_SOUND_SETTINGS;
    }

    try {
      // sound_で始まるキーをすべて取得
      const soundKeys = Object.keys(localStorage).filter(key => key.startsWith('sound_'));
      if (soundKeys.length === 0) {
        return DEFAULT_SOUND_SETTINGS;
      }

      // 保存されている設定を取得
      const savedSettings = {
        soundEnabled: localStorage.getItem('sound_soundEnabled') === 'true',
        bgmEnabled: localStorage.getItem('sound_bgmEnabled') === 'true',
        bgmVolume: parseFloat(localStorage.getItem('sound_bgmVolume') || '0.5'),
        sfxEnabled: localStorage.getItem('sound_sfxEnabled') === 'true',
        sfxVolume: parseFloat(localStorage.getItem('sound_sfxVolume') || '1.0'),
      };

      // 有効な値かどうかをチェック
      const validatedSettings = {
        soundEnabled: savedSettings.soundEnabled !== null ? savedSettings.soundEnabled : DEFAULT_SOUND_SETTINGS.soundEnabled,
        bgmEnabled: savedSettings.bgmEnabled !== null ? savedSettings.bgmEnabled : DEFAULT_SOUND_SETTINGS.bgmEnabled,
        bgmVolume: isNaN(savedSettings.bgmVolume) ? DEFAULT_SOUND_SETTINGS.bgmVolume : savedSettings.bgmVolume,
        sfxEnabled: savedSettings.sfxEnabled !== null ? savedSettings.sfxEnabled : DEFAULT_SOUND_SETTINGS.sfxEnabled,
        sfxVolume: isNaN(savedSettings.sfxVolume) ? DEFAULT_SOUND_SETTINGS.sfxVolume : savedSettings.sfxVolume,
      };

      return validatedSettings;
    } catch (error) {
      console.error('サウンド設定の読み込みに失敗しました:', error);
      return DEFAULT_SOUND_SETTINGS;
    }
  };

  // サウンド設定を状態として管理
  const [soundSettings, setSoundSettings] = useState(DEFAULT_SOUND_SETTINGS);
  
  // 初期化処理
  useEffect(() => {
    // ローカルストレージから設定を読み込む
    const savedSettings = loadSoundSettings();
    setSoundSettings(savedSettings);
    
    // SoundUtilsに設定を適用
    soundSystem.setSfxEnabled(savedSettings.soundEnabled && savedSettings.sfxEnabled);
    soundSystem.setSfxVolume(savedSettings.sfxVolume);
    soundSystem.setBgmEnabled(savedSettings.soundEnabled && savedSettings.bgmEnabled);
    soundSystem.setBgmVolume(savedSettings.bgmVolume);
    
    console.log('[SoundContext] 初期化完了', savedSettings);
  }, []);

  // サウンド設定をローカルストレージに保存する
  const saveSoundSettings = (settings) => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      localStorage.setItem('sound_soundEnabled', settings.soundEnabled);
      localStorage.setItem('sound_bgmEnabled', settings.bgmEnabled);
      localStorage.setItem('sound_bgmVolume', settings.bgmVolume);
      localStorage.setItem('sound_sfxEnabled', settings.sfxEnabled);
      localStorage.setItem('sound_sfxVolume', settings.sfxVolume);
      return true;
    } catch (error) {
      console.error('サウンド設定の保存に失敗しました:', error);
      return false;
    }
  };

  // サウンド設定を更新する関数
  const updateSoundSettings = (newSettings) => {
    const updatedSettings = { ...soundSettings, ...newSettings };
    
    // 状態を更新
    setSoundSettings(updatedSettings);
    
    // SoundUtilsに設定を適用
    if ('soundEnabled' in newSettings || 'sfxEnabled' in newSettings) {
      soundSystem.setSfxEnabled(updatedSettings.soundEnabled && updatedSettings.sfxEnabled);
    }
    
    if ('sfxVolume' in newSettings) {
      soundSystem.setSfxVolume(updatedSettings.sfxVolume);
    }
    
    if ('soundEnabled' in newSettings || 'bgmEnabled' in newSettings) {
      soundSystem.setBgmEnabled(updatedSettings.soundEnabled && updatedSettings.bgmEnabled);
    }
    
    if ('bgmVolume' in newSettings) {
      soundSystem.setBgmVolume(updatedSettings.bgmVolume);
    }
    
    // ローカルストレージに保存
    saveSoundSettings(updatedSettings);
    
    return updatedSettings;
  };

  // 全体サウンドの有効/無効を切り替える
  const toggleSound = () => {
    const enabled = !soundSettings.soundEnabled;
    updateSoundSettings({ soundEnabled: enabled });
    
    // 効果音をオンにした場合にボタン効果音を鳴らす
    if (enabled && soundSettings.sfxEnabled) {
      setTimeout(() => soundSystem.playSound('button'), 100);
    }
    
    return enabled;
  };

  // BGMの有効/無効を切り替える
  const toggleBGM = () => {
    const enabled = !soundSettings.bgmEnabled;
    updateSoundSettings({ bgmEnabled: enabled });
    
    // 効果音を鳴らす
    if (soundSettings.soundEnabled && soundSettings.sfxEnabled) {
      setTimeout(() => soundSystem.playSound('button'), 100);
    }
    
    return enabled;
  };

  // 効果音の有効/無効を切り替える
  const toggleSFX = () => {
    const enabled = !soundSettings.sfxEnabled;
    updateSoundSettings({ sfxEnabled: enabled });
    
    // 効果音をオンにした場合にボタン効果音を鳴らす
    if (soundSettings.soundEnabled && enabled) {
      setTimeout(() => soundSystem.playSound('button'), 100);
    }
    
    return enabled;
  };

  // BGM音量を設定する
  const setBGMVolume = (volume) => {
    updateSoundSettings({ bgmVolume: Math.max(0, Math.min(1, volume)) });
  };

  // 効果音音量を設定する
  const setSFXVolume = (volume) => {
    updateSoundSettings({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  };

  // コンテキストで提供する値
  const contextValue = {
    // 設定値
    soundEnabled: soundSettings.soundEnabled,
    bgmEnabled: soundSettings.bgmEnabled,
    bgmVolume: soundSettings.bgmVolume,
    sfxEnabled: soundSettings.sfxEnabled,
    sfxVolume: soundSettings.sfxVolume,
    
    // 関数
    toggleSound,
    toggleBGM,
    toggleSFX,
    setBGMVolume,
    setSFXVolume,
    updateSoundSettings,
    
    // サウンドシステムの参照
    soundSystem,
  };

  return (
    <SoundContext.Provider value={contextValue}>
      {children}
    </SoundContext.Provider>
  );
};

export default SoundContext;