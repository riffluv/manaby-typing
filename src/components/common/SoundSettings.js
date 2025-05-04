'use client';

import React from 'react';
import { useSoundContext } from '../../contexts/SoundContext';
import { ToggleButton } from './Button';
import styles from '../../styles/common/SoundSettings.module.css';

/**
 * サウンド設定コンポーネント
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} [props.className] - 追加のCSSクラス名
 * @param {boolean} [props.showMasterToggle=true] - 全体サウンド切替を表示するか
 * @param {boolean} [props.compact=false] - コンパクト表示モード
 * @returns {React.ReactElement} サウンド設定UI
 */
const SoundSettings = ({ 
  className = '',
  showMasterToggle = true,
  compact = false
}) => {
  const { 
    soundEnabled, 
    bgmEnabled, 
    bgmVolume, 
    sfxEnabled, 
    sfxVolume, 
    toggleSound, 
    toggleBGM, 
    toggleSFX, 
    setBGMVolume, 
    setSFXVolume,
    soundSystem
  } = useSoundContext();

  // 効果音スライダーのドラッグ終了時に効果音を再生
  const handleSfxVolumeChangeComplete = () => {
    if (soundEnabled && sfxEnabled) {
      soundSystem.playSound('button');
    }
  };

  // BGM音量スライダーのドラッグ終了時に効果音を再生
  const handleBgmVolumeChangeComplete = () => {
    if (soundEnabled && sfxEnabled) {
      soundSystem.playSound('button');
    }
  };

  return (
    <div className={`${styles.sound_settings} ${className} ${compact ? styles['sound_settings--compact'] : ''}`}>
      {/* 全体サウンド設定 */}
      {showMasterToggle && (
        <div className={styles.sound_settings__section}>
          <h3 className={styles.sound_settings__title}>サウンド</h3>
          <div className={styles.sound_settings__toggle}>
            <ToggleButton isOn={soundEnabled} onToggle={toggleSound} />
          </div>
        </div>
      )}

      {/* BGM設定 */}
      <div className={styles.sound_settings__section}>
        <h3 className={styles.sound_settings__title}>BGM</h3>
        <div className={styles.sound_settings__toggle}>
          <ToggleButton 
            isOn={bgmEnabled} 
            onToggle={toggleBGM}
            disabled={!soundEnabled}
          />
        </div>
        <div className={styles.sound_settings__volume_control}>
          <span className={styles.sound_settings__volume_label}>音量:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgmVolume || 0.5}
            onChange={e => setBGMVolume(parseFloat(e.target.value))}
            onMouseUp={handleBgmVolumeChangeComplete}
            onTouchEnd={handleBgmVolumeChangeComplete}
            className={styles.sound_settings__slider}
            disabled={!soundEnabled || !bgmEnabled}
          />
          <span className={styles.sound_settings__volume_value}>
            {Math.round((bgmVolume || 0.5) * 100)}%
          </span>
        </div>
      </div>

      {/* 効果音設定 */}
      <div className={styles.sound_settings__section}>
        <h3 className={styles.sound_settings__title}>効果音</h3>
        <div className={styles.sound_settings__toggle}>
          <ToggleButton
            isOn={sfxEnabled}
            onToggle={toggleSFX}
            disabled={!soundEnabled}
          />
        </div>
        <div className={styles.sound_settings__volume_control}>
          <span className={styles.sound_settings__volume_label}>音量:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sfxVolume || 1}
            onChange={e => setSFXVolume(parseFloat(e.target.value))}
            onMouseUp={handleSfxVolumeChangeComplete}
            onTouchEnd={handleSfxVolumeChangeComplete}
            className={styles.sound_settings__slider}
            disabled={!soundEnabled || !sfxEnabled}
          />
          <span className={styles.sound_settings__volume_value}>
            {Math.round((sfxVolume || 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SoundSettings;