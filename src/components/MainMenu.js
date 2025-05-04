'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/MainMenu.module.css';
import Image from 'next/image';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Modal from './common/Modal'; // 共通モーダルコンポーネント
import Button, { ToggleButton } from './common/Button'; // 共通ボタンコンポーネント
import CreditsContent from './common/CreditsContent'; // 共通クレジットコンポーネント
import { creditsData } from '../utils/CreditsData'; // クレジットデータ

// 設定モーダルの表示状態を外部から制御するためのカスタムフック
export const useSettingsModal = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 設定モーダルを表示する関数
  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  // 設定モーダルを閉じる関数
  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  return {
    showSettingsModal,
    setShowSettingsModal,
    openSettingsModal,
    closeSettingsModal,
  };
};

const MainMenu = () => {
  const { settings, setSettings } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();
  const mainContainerRef = useRef(null);
  const difficultyRef = useRef(null);  // 難易度ドロップダウン参照用

  // モーダル表示状態を管理するstate
  const [showCredits, setShowCredits] = useState(false);
  // 難易度ドロップダウン表示状態を管理
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  // グローバル設定モーダル状態を使用
  const {
    showSettingsModal,
    setShowSettingsModal,
    openSettingsModal,
    closeSettingsModal,
  } = useSettingsModal();

  // 難易度のラベルマッピング
  const difficultyLabels = {
    'easy': 'やさしい',
    'normal': 'ふつう',
    'hard': 'むずかしい'
  };

  // コンポーネントがマウントされたときにサウンドシステムを初期化
  useEffect(() => {
    // ゲーム開始時に全効果音を事前ロード
    soundSystem.initializeAllSounds().catch((err) => {
      console.error('効果音の初期ロードに失敗:', err);
    });

    // サウンド設定を適用
    soundSystem.setEnabled(settings.soundEnabled);

    // ユーザーインタラクション後にBGM再生を試みる
    const handleUserInteraction = () => {
      soundSystem.resumeBgmAfterInteraction();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [settings.soundEnabled]);

  // ドロップダウンを閉じるためのクリックイベントリスナー
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (difficultyRef.current && !difficultyRef.current.contains(event.target)) {
        setShowDifficultyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ボタン音を再生する関数
  const playButtonSound = () => {
    if (settings.soundEnabled && settings.sfxEnabled) {
      soundSystem.playSound('Button');
    }
  };

  // 難易度ドロップダウンの表示/非表示を切り替える関数
  const toggleDifficultyDropdown = () => {
    playButtonSound();
    setShowDifficultyDropdown(!showDifficultyDropdown);
  };

  // 難易度を変更する関数
  const handleDifficultyChange = (difficulty) => {
    playButtonSound();
    setSettings({
      ...settings,
      difficulty,
    });
    // 選択後にドロップダウンを閉じる
    setShowDifficultyDropdown(false);
  };

  // サウンド全体の有効/無効を切り替える関数
  const toggleSound = () => {
    // サウンドOFF→ONの場合のみ、切り替え後に音を鳴らす
    const willBeEnabled = !settings.soundEnabled;

    setSettings({
      ...settings,
      soundEnabled: willBeEnabled,
    });

    // サウンドシステムの設定も更新
    soundSystem.setEnabled(willBeEnabled);

    if (willBeEnabled && settings.sfxEnabled) {
      setTimeout(() => {
        soundSystem.playSound('Button');
      }, 100);
    }
  };

  // BGMの有効/無効を切り替える関数
  const toggleBgm = () => {
    const willBeEnabled = !settings.bgmEnabled;
    
    setSettings({
      ...settings,
      bgmEnabled: willBeEnabled,
    });

    // サウンドシステムの設定も更新
    soundSystem.setBgmEnabled(willBeEnabled);

    // BGMがオンになる場合はすぐに再生
    if (willBeEnabled && !soundSystem.currentBgm) {
      soundSystem.playBgm('mainTheme', true);
    }

    // ボタン効果音を鳴らす
    if (settings.sfxEnabled) {
      setTimeout(() => {
        soundSystem.playSound('Button');
      }, 100);
    }
  };

  // 効果音の有効/無効を切り替える関数
  const toggleSfx = () => {
    const willBeEnabled = !settings.sfxEnabled;

    setSettings({
      ...settings,
      sfxEnabled: willBeEnabled,
    });

    // サウンドシステムの設定も更新
    soundSystem.setSfxEnabled(willBeEnabled);

    if (willBeEnabled) {
      setTimeout(() => {
        soundSystem.playSound('Button');
      }, 100);
    }
  };

  // 効果音の音量を変更する関数
  const handleSfxVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSettings({
      ...settings,
      sfxVolume: newVolume,
    });

    // サウンドシステムの設定も更新
    soundSystem.setSfxVolume(newVolume);

    // 音量変更時にサンプル効果音を鳴らす
    if (settings.sfxEnabled && newVolume > 0) {
      soundSystem.playSound('Button');
    }
  };

  // BGM音量を変更する関数
  const handleBgmVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSettings({
      ...settings,
      bgmVolume: newVolume,
    });

    // サウンドシステムの設定も更新
    soundSystem.setBgmVolume(newVolume);
  };

  // ゲーム画面に遷移する関数 - トランジション対応
  const handleStartGame = () => {
    // トランジション中は操作を無効化
    if (isTransitioning) return;

    // 新しい画面遷移関数を使用
    goToScreen(SCREENS.GAME);
  };

  // 設定モーダルを開く関数
  const handleOpenSettings = () => {
    playButtonSound();
    // モーダルを表示する
    openSettingsModal();
  };

  // クレジットモーダルを開く関数
  const handleOpenCredits = () => {
    playButtonSound();
    setShowCredits(true);
  };

  // モーダルを閉じる関数
  const handleCloseModal = () => {
    playButtonSound();
    setShowCredits(false);
    closeSettingsModal();
  };

  // メニュー項目のアニメーション設定
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300 } },
  };

  // ドロップダウンのアニメーション設定
  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, height: 0 },
    visible: { 
      opacity: 1, 
      y: 0, 
      height: 'auto',
      transition: { 
        type: 'spring', 
        stiffness: 500, 
        damping: 25 
      } 
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      height: 0,
      transition: { 
        duration: 0.2 
      } 
    }
  };

  // 設定コンテンツをレンダリングする関数
  const renderSettingsContent = () => {
    return (
      <>
        {/* BGM設定 */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>BGM</h3>
          <div className={styles.soundSettings}>
            <div className={styles.soundToggle}>
              <ToggleButton 
                isOn={settings.bgmEnabled} 
                onToggle={toggleBgm} 
              />
            </div>
            <div className={styles.volumeControl}>
              <span className={styles.volumeLabel}>音量:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.bgmVolume || 0.5}
                onChange={handleBgmVolumeChange}
                className={styles.volumeSlider}
                disabled={!settings.bgmEnabled}
              />
              <span className={styles.volumeValue}>
                {Math.round((settings.bgmVolume || 0.5) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* 効果音設定 */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>効果音</h3>
          <div className={styles.soundSettings}>
            <div className={styles.soundToggle}>
              <ToggleButton
                isOn={settings.sfxEnabled}
                onToggle={toggleSfx}
              />
            </div>
            <div className={styles.volumeControl}>
              <span className={styles.volumeLabel}>音量:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={settings.sfxVolume || 1}
                onChange={handleSfxVolumeChange}
                className={styles.volumeSlider}
                disabled={!settings.sfxEnabled}
              />
              <span className={styles.volumeValue}>
                {Math.round((settings.sfxVolume || 1) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </>
    );
  };

  // クレジットコンテンツをレンダリングする関数
  const renderCreditsContent = () => {
    return (
      <CreditsContent
        credits={creditsData}
        showAcknowledgements={false}
        creditSectionClass={styles.creditSection}
        sectionTitleClass={styles.sectionTitle}
        creditTextClass={styles.creditText}
        creditsListClass={styles.creditsList}
        creditsItemClass={styles.creditsItem}
      />
    );
  };

  // キーボードイベントリスナーを追加（ショートカット機能拡充）
  useEffect(() => {
    const handleKeyDown = (e) => {
      // モーダルが開いている場合はゲームコントロールを無効化
      if (showSettingsModal || showCredits) {
        return;
      }

      // トランジション中は操作を無効化
      if (isTransitioning) return;

      // スペースキーが押されたらゲームを開始
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // デフォルト動作を抑制
        playButtonSound();
        goToScreen(SCREENS.GAME);
      }
      // Sキーで設定画面を開く
      else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();
        openSettingsModal();
      }
      // Cキーでクレジット画面を開く
      else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();
        setShowCredits(true);
      }
      // Rキーでランキング画面へ移動（実装されている場合）
      else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();
        goToScreen(SCREENS.RANKING);
      }
      // Dキーで難易度ドロップダウンを開く/閉じる
      else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleDifficultyDropdown();
      }
    };

    // キーボードイベントリスナーを登録
    document.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTransitioning, showSettingsModal, showCredits, goToScreen, showDifficultyDropdown]);

  return (
    <div className={styles.mainContainer} ref={mainContainerRef}>
      {/* マスコットキャラクター - アニメーション付き */}
      <motion.div
        className={styles.mascotContainer}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.5, duration: 1 }}
      >
        <img
          src="/images/manabymario.png"
          alt="Manaby Mario Mascot"
          className={styles.mascotImage}
        />
      </motion.div>

      {/* 設定ボタン (右上) */}
      <motion.div 
        className={styles.cornerButtonTop}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <Button
          variant="default"
          size="small"
          onClick={handleOpenSettings}
          className={styles.cornerButton}
          icon="⚙️"
        >
          <span className={styles.buttonText}>設定</span>
        </Button>
      </motion.div>

      {/* クレジットボタン (右下) */}
      <motion.div 
        className={styles.cornerButtonBottom}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <Button
          variant="default"
          size="small"
          onClick={handleOpenCredits}
          className={styles.cornerButton}
          icon="ⓘ"
        >
          <span className={styles.buttonText}>クレジット</span>
        </Button>
      </motion.div>

      <div className={styles.menuContainer}>
        {/* タイトル - アニメーション付き */}
        <motion.div
          className={styles.titleContainer}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
        >
          <h1 className={`screen-title ${styles.title}`}>manaby typing</h1>
        </motion.div>

        {/* メインロゴ（スタートボタン） - アニメーション付き */}
        <motion.div
          className={styles.logoContainer}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button className={styles.startButton} onClick={handleStartGame}>
            <Image
              src="/images/manabylogodot.png"
              alt="Start Game"
              width={200}
              height={200}
              className={styles.logoImage}
              priority
              unoptimized
            />
          </button>
        </motion.div>

        {/* 難易度ボタンとドロップダウン - 新しく追加 */}
        <motion.div 
          className={styles.difficultyContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          ref={difficultyRef}
        >
          <motion.button 
            className={styles.difficultyButton}
            onClick={toggleDifficultyDropdown}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className={styles.difficultyIcon}>🎮</span>
            難易度: {difficultyLabels[settings.difficulty]}
            <span className={styles.dropdownArrow}>
              {showDifficultyDropdown ? '▲' : '▼'}
            </span>
          </motion.button>
          
          <AnimatePresence>
            {showDifficultyDropdown && (
              <motion.div 
                className={styles.difficultyDropdown}
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.button 
                  className={`${styles.difficultyOption} ${settings.difficulty === 'easy' ? styles.selected : ''}`}
                  onClick={() => handleDifficultyChange('easy')}
                  whileHover={{ backgroundColor: 'rgba(0, 255, 0, 0.15)' }}
                >
                  やさしい
                </motion.button>
                <motion.button 
                  className={`${styles.difficultyOption} ${settings.difficulty === 'normal' ? styles.selected : ''}`}
                  onClick={() => handleDifficultyChange('normal')}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 0, 0.15)' }}
                >
                  ふつう
                </motion.button>
                <motion.button 
                  className={`${styles.difficultyOption} ${settings.difficulty === 'hard' ? styles.selected : ''}`}
                  onClick={() => handleDifficultyChange('hard')}
                  whileHover={{ backgroundColor: 'rgba(255, 0, 0, 0.15)' }}
                >
                  むずかしい
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className={styles.instructions}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <p>ロゴをクリックまたはスペースキーでスタート！</p>

          {/* ショートカットヘルプ - アニメーション付き */}
          <motion.div
            className={styles.shortcutHelp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 2.0, duration: 0.7 }}
          >
            <div className={styles.shortcutList}>
              <div className={styles.shortcutItem}>
                <kbd>Space</kbd> <span>ゲーム開始</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>D</kbd> <span>難易度変更</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>S</kbd> <span>設定</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>C</kbd> <span>クレジット</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>R</kbd> <span>ランキング</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>ESC</kbd> <span>戻る/閉じる</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* 設定モーダルと他のモーダル - 既存コード */}
      <Modal isOpen={showSettingsModal} onClose={handleCloseModal} title="設定">
        {renderSettingsContent()}
      </Modal>

      <Modal isOpen={showCredits} onClose={handleCloseModal} title="クレジット">
        {renderCreditsContent()}
      </Modal>
    </div>
  );
};

export default MainMenu;
