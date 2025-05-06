'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/MainMenu.module.css';
import Image from 'next/image';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { useSoundContext } from '../contexts/SoundContext';
import soundSystem from '../utils/SoundUtils';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Modal from './common/Modal'; // 共通モーダルコンポーネント
import Button, { ToggleButton } from './common/Button'; // 共通ボタンコンポーネント
import SoundSettings from './common/SoundSettings'; // 共通サウンド設定コンポーネント
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
  const { soundSystem, soundEnabled, sfxEnabled, bgmEnabled } = useSoundContext();
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

    // ロビーBGMを再生（全体のサウンドとBGM両方の設定がオンの場合のみ）
    if (soundEnabled && bgmEnabled) {
      soundSystem.playBgm('lobby', true);
      console.log('[MainMenu] BGM再生開始: soundEnabled=' + soundEnabled + ', bgmEnabled=' + bgmEnabled);
    } else {
      // 全体のサウンドかBGMが無効の場合は、既に再生中のBGMを停止する
      soundSystem.stopBgm();
      console.log('[MainMenu] BGM再生停止: soundEnabled=' + soundEnabled + ', bgmEnabled=' + bgmEnabled);
    }
  }, [soundSystem, soundEnabled, bgmEnabled]);  // bgmEnabledも依存配列に追加

  // ボタン音を再生する関数
  const playButtonSound = () => {
    if (soundEnabled && sfxEnabled) {
      soundSystem.playSound('button');
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
      <div className={styles.settingsContainer}>
        {/* ゲーム設定セクション */}
        <div className={styles.settingsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionDecoration}></div>
            <h3 className={styles.sectionTitle}>ゲーム設定</h3>
          </div>

          {/* 難易度設定パネル */}
          <div className={styles.settingsPanel}>
            <div className={styles.settingRow}>
              <div className={styles.settingLabelGroup}>
                <label className={styles.settingLabel}>難易度</label>
                <span className={styles.settingDescription}>
                  問題の難しさを設定します
                </span>
              </div>

              <div className={styles.difficultySelector}>
                {Object.keys(difficultyLabels).map((key) => (
                  <button
                    key={key}
                    className={`${styles.difficultyButton} ${settings.difficulty === key ? styles.active : ''}`}
                    onClick={() => handleDifficultyChange(key)}
                    aria-pressed={settings.difficulty === key}
                  >
                    <div className={`${styles.difficultyIndicator} ${styles[`difficultyIndicator_${key}`]}`}></div>
                    <span className={styles.difficultyLabel}>{difficultyLabels[key]}</span>
                    {settings.difficulty === key && (
                      <span className={styles.activeMark}></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 区切り線（スタイリッシュなデザイン） */}
        <div className={styles.settingsDivider}>
          <div className={styles.dividerLine}></div>
          <div className={styles.dividerAccent}></div>
          <div className={styles.dividerLine}></div>
        </div>

        {/* サウンド設定セクション */}
        <div className={styles.settingsSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionDecoration}></div>
            <h3 className={styles.sectionTitle}>音声設定</h3>
          </div>

          <div className={styles.settingsPanel}>
            {/* 強化されたサウンド設定コンポーネントを使用 */}
            <SoundSettings
              className={styles.enhancedSoundSettings}
              showVolumeIndicator={true}
              showEffects={true}
            />
          </div>
        </div>

        {/* ショートカット一覧 */}
        <div className={styles.keyboardShortcuts}>
          <div className={styles.shortcutsHeader}>
            <div className={styles.shortcutsDecoration}></div>
            <span>キーボードショートカット</span>
          </div>
          <div className={styles.shortcutsList}>
            <div className={styles.shortcutItem}>
              <kbd>Space</kbd>
              <span>ゲーム開始</span>
            </div>
            <div className={styles.shortcutItem}>
              <kbd>S</kbd>
              <span>設定を開く</span>
            </div>
            <div className={styles.shortcutItem}>
              <kbd>R</kbd>
              <span>ランキング表示</span>
            </div>
            <div className={styles.shortcutItem}>
              <kbd>ESC</kbd>
              <span>メニューに戻る</span>
            </div>
          </div>
        </div>
      </div>
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
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0, duration: 0.7 }}
          >
            <div className={styles.shortcutList}>
              <div className={styles.shortcutItem}>
                <kbd>Space</kbd> <span>ゲーム開始</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>R</kbd> <span>ランキング</span>
              </div>
              <div className={styles.shortcutItem}>
                <kbd>ESC</kbd> <span>メニューに戻る</span>
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
