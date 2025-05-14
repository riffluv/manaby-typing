'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../styles/typing/SoundToggle.module.css';

/**
 * 効果音ON/OFF切り替えボタンコンポーネント
 */
const SoundToggle = ({ className = '' }) => {
  // 効果音の有効/無効状態管理
  const [isActive, setIsActive] = useState(true);

  // コンポーネント初期化時に設定を読み込み
  useEffect(() => {
    // ローカルストレージから設定を読み込み（初期値：有効）
    const soundSetting = localStorage.getItem('retroKeyboardSounds');
    setIsActive(soundSetting === null ? true : soundSetting === 'true');
  }, []);

  // 効果音切り替え処理
  const toggleSound = () => {
    const newState = !isActive;
    // ローカルストレージに設定を保存
    localStorage.setItem('retroKeyboardSounds', newState.toString());
    setIsActive(newState);
  };

  return (
    <button
      className={`${styles.sound_toggle_btn} ${className}`}
      onClick={toggleSound}
      data-active={isActive}
      title={isActive ? '効果音をOFFにする' : '効果音をONにする'}
    >
      {isActive ? '🔊 音ON' : '🔇 音OFF'}
    </button>
  );
};

export default SoundToggle;
