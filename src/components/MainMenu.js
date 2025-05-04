'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/MainMenu.module.css';
import Image from 'next/image';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import { motion } from 'framer-motion';
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

  // モーダル表示状態を管理するstate
  const [showCredits, setShowCredits] = useState(false);

  // グローバル設定モーダル状態を使用
  const {
    showSettingsModal,
    setShowSettingsModal,
    openSettingsModal,
    closeSettingsModal,
  } = useSettingsModal();

  // コンポーネントがマウントされたときにサウンドシステムを初期化
  useEffect(() => {
    // ゲーム開始時に全効果音を事前ロード
    soundSystem.initializeAllSounds().catch((err) => {
      console.error('効果音の初期ロードに失敗:', err);
    });

    // サウンド設定を適用
    soundSystem.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // ボタン音を再生する関数
  const playButtonSound = () => {
    if (settings.soundEnabled && settings.sfxEnabled) {
      soundSystem.playSound('Button');
    }
  };

  // 難易度を変更する関数
  const handleDifficultyChange = (difficulty) => {
    playButtonSound();
    setSettings({
      ...settings,
      difficulty,
    });
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
    soundSystem.setBgmEnabled(willBeEnabled && settings.soundEnabled);

    if (willBeEnabled && settings.soundEnabled && settings.sfxEnabled) {
      setTimeout(() => {
        soundSystem.playSound('Button');
      }, 100);
    }
  };

  // BGMの音量を変更する関数
  const handleBgmVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSettings({
      ...settings,
      bgmVolume: newVolume,
    });

    // サウンドシステムの設定も更新
    soundSystem.setBgmVolume(newVolume);

    // 音量変更時にサンプル効果音を鳴らす
    if (settings.sfxEnabled && settings.soundEnabled && settings.bgmEnabled) {
      soundSystem.playSound('Button');
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
    soundSystem.setSfxEnabled(willBeEnabled && settings.soundEnabled);

    if (willBeEnabled && settings.soundEnabled) {
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
    if (settings.sfxEnabled && settings.soundEnabled && newVolume > 0) {
      soundSystem.playSound('Button');
    }
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

  // 難易度を表示するテキスト（日本語表記）
  const difficultyLabels = {
    easy: 'やさしい',
    normal: 'ふつう',
    hard: 'むずかしい',
  };

  // 難易度選択メニューの表示状態
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);

  // 難易度選択ボタンをクリックしたときの処理
  const handleDifficultyButtonClick = () => {
    playButtonSound();
    setShowDifficultyMenu(!showDifficultyMenu);
  };

  // 難易度を選択したときの処理
  const selectDifficulty = (difficulty) => {
    playButtonSound();
    handleDifficultyChange(difficulty);
    setShowDifficultyMenu(false);
  };

  // 画面のどこかをクリックしたときにメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDifficultyMenu && !event.target.closest(`.${styles.difficultySelector}`)) {
        setShowDifficultyMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDifficultyMenu]);

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

  // 設定コンテンツをレンダリングする関数
  const renderSettingsContent = () => {
    return (
      <>
        {/* 難易度設定 */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>難易度</h3>
          <div className={styles.difficultyOptions}>
            <Button
              variant={settings.difficulty === 'easy' ? 'primary' : 'default'}
              active={settings.difficulty === 'easy'}
              onClick={() => handleDifficultyChange('easy')}
              className="button--difficulty"
            >
              やさしい
            </Button>
            <Button
              variant={settings.difficulty === 'normal' ? 'primary' : 'default'}
              active={settings.difficulty === 'normal'}
              onClick={() => handleDifficultyChange('normal')}
              className="button--difficulty"
            >
              普通
            </Button>
            <Button
              variant={settings.difficulty === 'hard' ? 'primary' : 'default'}
              active={settings.difficulty === 'hard'}
              onClick={() => handleDifficultyChange('hard')}
              className="button--difficulty"
            >
              むずかしい
            </Button>
          </div>
        </div>

        {/* BGM設定 */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>BGM</h3>
          <div className={styles.soundToggle}>
            <ToggleButton isOn={settings.bgmEnabled} onToggle={toggleBgm} />
          </div>
          <div className={styles.volumeControl}>
            <span className={styles.volumeLabel}>音量:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.bgmVolume || 1}
              onChange={handleBgmVolumeChange}
              className={styles.volumeSlider}
              disabled={!settings.soundEnabled || !settings.bgmEnabled}
            />
            <span className={styles.volumeValue}>
              {Math.round((settings.bgmVolume || 1) * 100)}%
            </span>
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
                disabled={!settings.soundEnabled}
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
                disabled={!settings.soundEnabled || !settings.sfxEnabled}
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
    };

    // キーボードイベントリスナーを登録
    document.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTransitioning, showSettingsModal, showCredits, goToScreen]);

  return (
    <div className={styles.mainContainer} ref={mainContainerRef}>
      {/* 右上に設定ボタン（アイコンのみ） */}
      <div className={styles.cornerButtons}>
        <button
          className={styles.iconButton}
          onClick={handleOpenSettings}
          aria-label="設定"
        >
          ⚙️
        </button>
      </div>

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

        {/* 難易度選択ボタン（横並びトグル式） - アニメーション付き */}
        <motion.div
          className={styles.difficultyToggleGroup}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {Object.keys(difficultyLabels).map((key) => (
            <button
              key={key}
              className={`${styles.difficultyToggleButton} ${settings.difficulty === key ? styles.active : ''}`}
              onClick={() => handleDifficultyChange(key)}
            >
              {difficultyLabels[key]}
            </button>
          ))}
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

      {/* 右下に情報アイコンボタン */}
      <button
        className={styles.creditButton}
        onClick={handleOpenCredits}
        aria-label="クレジット"
      >
        ⓘ
      </button>

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
