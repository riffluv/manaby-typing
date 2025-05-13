'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import soundSystem from '../utils/SoundUtils';

// サウンド設定のストレージキー
const STORAGE_KEYS = {
  SOUND_ENABLED: 'sound_soundEnabled',
  BGM_ENABLED: 'sound_bgmEnabled',
  BGM_VOLUME: 'sound_bgmVolume',
  SFX_ENABLED: 'sound_sfxEnabled',
  SFX_VOLUME: 'sound_sfxVolume',
};

// サウンド設定のデフォルト値
const DEFAULT_SOUND_SETTINGS = {
  soundEnabled: true, // 全体のサウンド設定
  bgmEnabled: true,   // BGMの有効/無効
  bgmVolume: 0.5,     // BGMの音量 (0.0-1.0)
  sfxEnabled: true,   // 効果音の有効/無効
  sfxVolume: 1.0,     // 効果音の音量 (0.0-1.0)
};

// サウンドコンテキストの作成
const SoundContext = createContext(null);

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
 */
export const SoundProvider = ({ children }) => {
  // サウンド設定をステートとして管理
  const [soundSettings, setSoundSettings] = useState(DEFAULT_SOUND_SETTINGS);

  // ローカルストレージからサウンド設定を読み込む関数
  const loadSoundSettings = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_SOUND_SETTINGS;
    }

    try {
      // ローカルストレージから設定を読み込む
      const settings = {
        soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) === 'true',
        bgmEnabled: localStorage.getItem(STORAGE_KEYS.BGM_ENABLED) === 'true',
        bgmVolume: parseFloat(localStorage.getItem(STORAGE_KEYS.BGM_VOLUME) || '0.5'),
        sfxEnabled: localStorage.getItem(STORAGE_KEYS.SFX_ENABLED) === 'true',
        sfxVolume: parseFloat(localStorage.getItem(STORAGE_KEYS.SFX_VOLUME) || '1.0'),
      };

      // 値のバリデーション
      const validatedSettings = {
        // ローカルストレージに値がなければデフォルト値を使用
        soundEnabled: localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== null
          ? settings.soundEnabled
          : DEFAULT_SOUND_SETTINGS.soundEnabled,

        bgmEnabled: localStorage.getItem(STORAGE_KEYS.BGM_ENABLED) !== null
          ? settings.bgmEnabled
          : DEFAULT_SOUND_SETTINGS.bgmEnabled,

        // 数値のバリデーション
        bgmVolume: isNaN(settings.bgmVolume)
          ? DEFAULT_SOUND_SETTINGS.bgmVolume
          : Math.max(0, Math.min(1, settings.bgmVolume)),

        sfxEnabled: localStorage.getItem(STORAGE_KEYS.SFX_ENABLED) !== null
          ? settings.sfxEnabled
          : DEFAULT_SOUND_SETTINGS.sfxEnabled,

        sfxVolume: isNaN(settings.sfxVolume)
          ? DEFAULT_SOUND_SETTINGS.sfxVolume
          : Math.max(0, Math.min(1, settings.sfxVolume)),
      };

      console.log('[SoundContext] 設定を読み込みました:', validatedSettings);
      return validatedSettings;
    } catch (error) {
      console.error('[SoundContext] 設定の読み込みに失敗しました:', error);
      return DEFAULT_SOUND_SETTINGS;
    }
  }, []);

  // サウンド設定をローカルストレージに保存する関数
  const saveSoundSettings = useCallback((settings) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, settings.soundEnabled);
      localStorage.setItem(STORAGE_KEYS.BGM_ENABLED, settings.bgmEnabled);
      localStorage.setItem(STORAGE_KEYS.BGM_VOLUME, settings.bgmVolume);
      localStorage.setItem(STORAGE_KEYS.SFX_ENABLED, settings.sfxEnabled);
      localStorage.setItem(STORAGE_KEYS.SFX_VOLUME, settings.sfxVolume);

      console.log('[SoundContext] 設定を保存しました:', settings);
      return true;
    } catch (error) {
      console.error('[SoundContext] 設定の保存に失敗しました:', error);
      return false;
    }
  }, []);
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

    console.log('[SoundContext] SoundUtilsに設定を適用しました');

    // GitHub Pages対応 - 基本音声ファイルを事前ロード
    soundSystem.initializeAllSounds()
      .then(success => {
        if (success) {
          console.log('[SoundContext] 基本効果音のプリロードに成功しました');
        } else {
          console.warn('[SoundContext] 一部の効果音のロードに失敗しました');
          
          // GitHub Pages向け - 個別再試行（特に重要な音声）
          setTimeout(() => {
            // 特にタイピング音声は重要なので個別に再試行
            Promise.all([
              soundSystem.loadSound('success', soundSystem.soundPresets.success),
              soundSystem.loadSound('error', soundSystem.soundPresets.error)
            ]).catch(e => console.warn('[SoundContext] タイピング音声の再ロードも失敗:', e));
          }, 2000); // 2秒後に再試行
        }
      })
      .catch(err => {
        console.error('[SoundContext] 効果音の初期化中にエラーが発生しました:', err);
      });
  }, [loadSoundSettings]);

  // サウンド設定を更新する関数
  const updateSoundSettings = useCallback((newSettings) => {
    setSoundSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };

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
    });
  }, [saveSoundSettings]);

  // 各種サウンド設定を切り替えるヘルパー関数
  const toggleSound = useCallback(() => {
    updateSoundSettings({ soundEnabled: !soundSettings.soundEnabled });
  }, [soundSettings.soundEnabled, updateSoundSettings]);

  const toggleBGM = useCallback(() => {
    updateSoundSettings({ bgmEnabled: !soundSettings.bgmEnabled });
  }, [soundSettings.bgmEnabled, updateSoundSettings]);

  const toggleSFX = useCallback(() => {
    updateSoundSettings({ sfxEnabled: !soundSettings.sfxEnabled });
  }, [soundSettings.sfxEnabled, updateSoundSettings]);

  const setBGMVolume = useCallback((volume) => {
    updateSoundSettings({ bgmVolume: Math.max(0, Math.min(1, volume)) });
  }, [updateSoundSettings]);

  const setSFXVolume = useCallback((volume) => {
    updateSoundSettings({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  }, [updateSoundSettings]);

  // サウンド効果の再生ヘルパー
  const playButtonSound = useCallback(() => {
    if (soundSettings.soundEnabled && soundSettings.sfxEnabled) {
      soundSystem.playSound('button');
    }
  }, [soundSettings.soundEnabled, soundSettings.sfxEnabled]);

  // 提供するコンテキスト値
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
    playButtonSound,

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