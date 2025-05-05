'use client';

import React, { useCallback } from 'react';
import { useSoundContext } from '../../contexts/SoundContext';
import { ToggleButton } from './Button';
import styles from '../../styles/common/SoundSettings.module.css';

/**
 * サウンド設定コンポーネント
 * BEM記法に準拠した再利用可能なUI
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} [props.className] - 追加のCSSクラス名
 * @param {boolean} [props.showMasterToggle=true] - 全体サウンド切替を表示するか
 * @param {boolean} [props.compact=false] - コンパクト表示モード
 * @param {string} [props.idPrefix=''] - アクセシビリティのためのID接頭辞
 * @returns {React.ReactElement} サウンド設定UI
 */
const SoundSettings = ({
  className = '',
  showMasterToggle = true,
  compact = false,
  idPrefix = '',
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
    playButtonSound
  } = useSoundContext();

  // 効果音スライダーのドラッグ終了時に効果音を再生
  const handleSfxVolumeChangeComplete = useCallback(() => {
    playButtonSound();
  }, [playButtonSound]);

  // BGM音量スライダーのドラッグ終了時に効果音を再生
  const handleBgmVolumeChangeComplete = useCallback(() => {
    playButtonSound();
  }, [playButtonSound]);

  // 音量スライダーの変更ハンドラ
  const handleBgmVolumeChange = useCallback((e) => {
    setBGMVolume(parseFloat(e.target.value));
  }, [setBGMVolume]);

  const handleSfxVolumeChange = useCallback((e) => {
    setSFXVolume(parseFloat(e.target.value));
  }, [setSFXVolume]);

  // BEMクラス名
  const rootClassName = `${styles.sound_settings} ${className} ${compact ? styles['sound_settings--compact'] : ''}`;
  const sectionClassName = styles.sound_settings__section;
  const titleClassName = styles.sound_settings__title;
  const toggleClassName = styles.sound_settings__toggle;
  const volumeControlClassName = styles.sound_settings__volume_control;
  const volumeLabelClassName = styles.sound_settings__volume_label;
  const sliderClassName = styles.sound_settings__slider;
  const volumeValueClassName = styles.sound_settings__volume_value;

  return (
    <div className={rootClassName} data-testid="sound-settings">
      {/* 全体サウンド設定 */}
      {showMasterToggle && (
        <div className={sectionClassName}>
          <h3 className={titleClassName} id={`${idPrefix}sound-title`}>サウンド</h3>
          <div className={toggleClassName}>
            <ToggleButton
              isOn={soundEnabled}
              onToggle={toggleSound}
              aria-labelledby={`${idPrefix}sound-title`}
            />
          </div>
        </div>
      )}

      {/* BGM設定 */}
      <div className={sectionClassName}>
        <h3 className={titleClassName} id={`${idPrefix}bgm-title`}>BGM</h3>
        <div className={toggleClassName}>
          <ToggleButton
            isOn={bgmEnabled}
            onToggle={toggleBGM}
            disabled={!soundEnabled}
            aria-labelledby={`${idPrefix}bgm-title`}
          />
        </div>
        <div className={volumeControlClassName}>
          <span className={volumeLabelClassName} id={`${idPrefix}bgm-volume-label`}>音量:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgmVolume ?? 0.5}
            onChange={handleBgmVolumeChange}
            onMouseUp={handleBgmVolumeChangeComplete}
            onTouchEnd={handleBgmVolumeChangeComplete}
            className={sliderClassName}
            disabled={!soundEnabled || !bgmEnabled}
            aria-labelledby={`${idPrefix}bgm-volume-label`}
            aria-valuenow={Math.round((bgmVolume ?? 0.5) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <span className={volumeValueClassName}>
            {Math.round((bgmVolume ?? 0.5) * 100)}%
          </span>
        </div>
      </div>

      {/* 効果音設定 */}
      <div className={sectionClassName}>
        <h3 className={titleClassName} id={`${idPrefix}sfx-title`}>効果音</h3>
        <div className={toggleClassName}>
          <ToggleButton
            isOn={sfxEnabled}
            onToggle={toggleSFX}
            disabled={!soundEnabled}
            aria-labelledby={`${idPrefix}sfx-title`}
          />
        </div>
        <div className={volumeControlClassName}>
          <span className={volumeLabelClassName} id={`${idPrefix}sfx-volume-label`}>音量:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sfxVolume ?? 1}
            onChange={handleSfxVolumeChange}
            onMouseUp={handleSfxVolumeChangeComplete}
            onTouchEnd={handleSfxVolumeChangeComplete}
            className={sliderClassName}
            disabled={!soundEnabled || !sfxEnabled}
            aria-labelledby={`${idPrefix}sfx-volume-label`}
            aria-valuenow={Math.round((sfxVolume ?? 1) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          <span className={volumeValueClassName}>
            {Math.round((sfxVolume ?? 1) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SoundSettings;