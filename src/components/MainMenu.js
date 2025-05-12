'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from '../styles/MainMenu.module.css';
import Image from 'next/image';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { useSoundContext } from '../contexts/SoundContext';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import Modal from './common/Modal'; // 共通モーダルコンポーネント
import Button, { ToggleButton } from './common/Button'; // 共通ボタンコンポーネント
import SoundSettings from './common/SoundSettings'; // 共通サウンド設定コンポーネント
import CreditsContent from './common/CreditsContent'; // 共通クレジットコンポーネント
import { creditsData } from '../utils/CreditsData'; // クレジットデータ
import mcpUtils, { useMCPContext } from '../utils/MCPUtils'; // MCP連携の追加
import typingWorkerManager from '../utils/TypingWorkerManager'; // Worker管理のためのインポートを追加

// 設定モーダルの表示状態を外部から制御するためのカスタムフック
export const useSettingsModal = () => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 設定モーダルを表示する関数
  const openSettingsModal = useCallback(() => {
    setShowSettingsModal(true);
  }, []);

  // 設定モーダルを閉じる関数
  const closeSettingsModal = useCallback(() => {
    setShowSettingsModal(false);
  }, []);

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
  // MCP連携の追加
  const { isActive: mcpActive, recordUXElement, recordGameEvent } = useMCPContext();
  // モーダル表示状態を管理するstate
  const [showCredits, setShowCredits] = useState(false);

  // グローバル設定モーダル状態を使用
  const {
    showSettingsModal,
    setShowSettingsModal,
    openSettingsModal,
    closeSettingsModal,
  } = useSettingsModal();

  // コンポーネントがマウントされたときにサウンドシステムとMCPを初期化
  useEffect(() => {
    // MCPにUIコンポーネントのマウントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'component-mount',
        componentName: 'MainMenu',
        timestamp: Date.now()
      });
    }

    // ゲーム開始時に全効果音を事前ロード
    soundSystem.initializeAllSounds().then(() => {
      // MCPに記録 - サウンド初期化成功
      if (mcpActive) {
        recordGameEvent({
          type: 'sound-system-initialized',
          status: 'success'
        });
      }
    }).catch((err) => {
      console.error('効果音の初期ロードに失敗:', err);
      // MCPに記録 - サウンド初期化エラー
      if (mcpActive) {
        recordGameEvent({
          type: 'sound-system-error',
          errorMessage: err.message
        });
      }
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

    // 周期的に背景効果を更新するアニメーション
    const interval = setInterval(() => {
      const targetElement = document.querySelector(`.${styles.mainContainer}`);
      if (targetElement) {
        const randomDelay = Math.random() * 3000;
        setTimeout(() => {
          targetElement.classList.add(styles.scanlineEffect);
          setTimeout(() => {
            targetElement.classList.remove(styles.scanlineEffect);
          }, 1500);
        }, randomDelay);
      }
    }, 8000);

    // コンポーネントのアンマウント時にMCPに記録とインターバルのクリア
    return () => {
      if (mcpActive) {
        recordUXElement({
          type: 'component-unmount',
          componentName: 'MainMenu',
          timestamp: Date.now(),
          duration: Date.now() - performance.now() // コンポーネントの表示時間を記録
        });
      } clearInterval(interval);

      // Workerをリセット
      if (typingWorkerManager && typeof typingWorkerManager.reset === 'function') {
        console.log('[MainMenu] コンポーネントのアンマウント時にWorkerをリセットします');
        typingWorkerManager.reset().catch(err => {
          console.warn('[MainMenu] Worker終了中にエラーが発生しました:', err);
        });
      }
    };
  }, [soundSystem, soundEnabled, bgmEnabled, mcpActive, recordUXElement, recordGameEvent]);

  // ボタン音を再生する関数
  const playButtonSound = useCallback(() => {
    if (soundEnabled && sfxEnabled) {
      soundSystem.playSound('button');
    }
  }, [soundEnabled, sfxEnabled, soundSystem]);

  // 難易度を変更する関数
  const handleDifficultyChange = useCallback((difficulty) => {
    playButtonSound();

    // MCPに難易度変更イベントを記録
    if (mcpActive) {
      recordGameEvent({
        type: 'difficulty-changed',
        previousDifficulty: settings.difficulty,
        newDifficulty: difficulty
      });
    }

    setSettings({
      ...settings,
      difficulty,
    });
  }, [playButtonSound, mcpActive, recordGameEvent, settings, setSettings]);

  // ゲーム画面に遷移する関数 - トランジション対応
  const handleStartGame = useCallback(() => {
    // トランジション中は操作を無効化
    if (isTransitioning) return;

    // MCPにゲーム開始イベントを記録
    if (mcpActive) {
      recordGameEvent({
        type: 'game-started',
        difficulty: settings.difficulty,
        timestamp: Date.now()
      });
    }

    // 新しい画面遷移関数を使用
    goToScreen(SCREENS.GAME);
  }, [isTransitioning, mcpActive, recordGameEvent, settings.difficulty, goToScreen]);

  // 設定モーダルを開く関数
  const handleOpenSettings = useCallback(() => {
    playButtonSound();

    // MCPにモーダル表示イベントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'modal-open',
        modalName: 'settings',
        timestamp: Date.now()
      });
    }

    // モーダルを表示する
    openSettingsModal();
  }, [playButtonSound, mcpActive, recordUXElement, openSettingsModal]);

  // クレジットモーダルを開く関数
  const handleOpenCredits = useCallback(() => {
    playButtonSound();

    // MCPにモーダル表示イベントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'modal-open',
        modalName: 'credits',
        timestamp: Date.now()
      });
    }

    setShowCredits(true);
  }, [playButtonSound, mcpActive, recordUXElement]);
  // モーダルを閉じる関数
  const handleCloseModal = useCallback(() => {
    playButtonSound();

    // MCPにモーダル閉じるイベントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'modal-close',
        modalName: showCredits ? 'credits' : 'settings',
        timestamp: Date.now()
      });
    }

    // モーダル表示フラグをリセット
    setShowCredits(false);

    if (showSettingsModal) {
      closeSettingsModal();
    }
  }, [playButtonSound, mcpActive, recordUXElement, showCredits, closeSettingsModal, showSettingsModal]);
  // 難易度を表示するテキスト（日本語表記）
  const difficultyLabels = {
    easy: 'やさしい',
    normal: 'ふつう',
    hard: 'むずかしい',
  };

  // 難易度選択メニューの表示状態
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);

  // 難易度選択ボタンをクリックしたときの処理
  const handleDifficultyButtonClick = useCallback(() => {
    playButtonSound();
    setShowDifficultyMenu(!showDifficultyMenu);

    // MCPにメニュー表示変更イベントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'menu-toggle',
        menuName: 'difficulty-selector',
        state: !showDifficultyMenu ? 'open' : 'closed',
        timestamp: Date.now()
      });
    }
  }, [playButtonSound, showDifficultyMenu, mcpActive, recordUXElement]);

  // 難易度を選択したときの処理
  const selectDifficulty = useCallback((difficulty) => {
    playButtonSound();
    handleDifficultyChange(difficulty);
    setShowDifficultyMenu(false);

    // MCPに選択イベントを記録
    if (mcpActive) {
      recordUXElement({
        type: 'menu-select',
        menuName: 'difficulty-selector',
        selectedValue: difficulty,
        timestamp: Date.now()
      });
    }
  }, [playButtonSound, handleDifficultyChange, mcpActive, recordUXElement]);

  // 画面のどこかをクリックしたときにメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDifficultyMenu && !event.target.closest(`.${styles.difficultySelector}`)) {
        setShowDifficultyMenu(false);

        // MCPにメニュークローズイベントを記録
        if (mcpActive) {
          recordUXElement({
            type: 'menu-close',
            menuName: 'difficulty-selector',
            reason: 'outside-click',
            timestamp: Date.now()
          });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDifficultyMenu, mcpActive, recordUXElement]);

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
  // カスタム宇宙船風の装飾コンポーネント（全ての装飾を削除）
  const SpaceshipDecoration = () => (
    <>
      {/* コーナー装飾、スキャンライン、ドットパターンなどを全て削除 */}
    </>
  );

  // 設定コンテンツをレンダリングする関数
  const renderSettingsContent = useCallback(() => {
    return (
      <div className={styles.settingsContainer}>
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

        {/* 新しいセクション：パフォーマンス設定 */}
        <div className={styles.settingsSection}>
          <h3 className={styles.settingsSectionTitle}>パフォーマンス設定</h3>
          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>
              高パフォーマンスモード
              <small className={styles.settingsSubLabel}>
                （入力レスポンスを最適化します）
              </small>
            </label>
            <div className={styles.settingsControl}>
              <input
                type="checkbox"
                checked={true}
                disabled={true}
                className={styles.settingsCheckbox}
              />
              <span className={styles.checkboxLabel}>
                常に有効
              </span>
            </div>
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
  }, [settings.difficulty, setSettings, handleDifficultyChange]);

  // クレジットコンテンツをレンダリングする関数
  const renderCreditsContent = useCallback(() => {
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
  }, []);
  // 開発者設定オプションのレンダリング関数は不要なため削除
  // キーボードイベントリスナーを追加（ショートカット機能拡充）
  useEffect(() => {
    const handleKeyDown = (e) => {
      // モーダルが開いている場合
      if (showSettingsModal || showCredits) {
        // ESCキーが押されたらモーダルを閉じる
        if (e.key === 'Escape') {
          handleCloseModal();
          return;
        }
        return;
      }

      // トランジション中は操作を無効化
      if (isTransitioning) return;

      // スペースキーが押されたらゲームを開始
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault(); // デフォルト動作を抑制
        playButtonSound();

        // MCPにキーボードショートカット使用イベントを記録
        if (mcpActive) {
          recordUXElement({
            type: 'keyboard-shortcut',
            key: 'Space',
            action: 'start-game',
            timestamp: Date.now()
          });
        }

        goToScreen(SCREENS.GAME);
      }
      // Sキーで設定画面を開く
      else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();

        // MCPにキーボードショートカット使用イベントを記録
        if (mcpActive) {
          recordUXElement({
            type: 'keyboard-shortcut',
            key: 'S',
            action: 'open-settings',
            timestamp: Date.now()
          });
        }

        openSettingsModal();
      }
      // Cキーでクレジット画面を開く
      else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();

        // MCPにキーボードショートカット使用イベントを記録
        if (mcpActive) {
          recordUXElement({
            type: 'keyboard-shortcut',
            key: 'C',
            action: 'open-credits',
            timestamp: Date.now()
          });
        }

        setShowCredits(true);
      }
      // Rキーでランキング画面へ移動（実装されている場合）
      else if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playButtonSound();

        // MCPにキーボードショートカット使用イベントを記録
        if (mcpActive) {
          recordUXElement({
            type: 'keyboard-shortcut',
            key: 'R',
            action: 'open-ranking',
            timestamp: Date.now()
          });
        }

        goToScreen(SCREENS.RANKING);
      }
    };

    // キーボードイベントリスナーを登録
    document.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTransitioning, showSettingsModal, showCredits, playButtonSound, mcpActive, recordUXElement, goToScreen, openSettingsModal, handleCloseModal]);

  return (
    <div className={styles.mainContainer} ref={mainContainerRef}>
      {/* 宇宙船UI装飾コンポーネント */}
      <SpaceshipDecoration />

      {/* Early Access バッジ */}
      <div className={styles.earlyAccessBadge} aria-label="アーリーアクセスバージョン">
        Early Access v0.9
      </div>

      {/* 宇宙船ID表示 - 新しい要素 */}
      <div className={styles.shipIdBadge}>
        <div className={styles.shipIdLabel}>MANABY SPACE CREW</div>
        <div className={styles.shipIdValue}>SRX-2025</div>
      </div>

      {/* 右上に設定ボタン（アイコンのみ） */}
      <div className={styles.cornerButtons}>
        <button
          className={styles.iconButton}
          onClick={handleOpenSettings}
          aria-label="設定"
        >
          <div className={styles.gearIcon}>
            <div className={styles.gearInner}></div>
          </div>
        </button>
      </div>

      {/* マスコットキャラクター - アニメーション付き */}
      <motion.div
        className={styles.mascotContainer}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.5, duration: 1 }}
        onAnimationComplete={() => {
          // MCPにアニメーション完了イベントを記録
          if (mcpActive) {
            recordUXElement({
              type: 'animation-complete',
              elementName: 'mascot',
              timestamp: Date.now()
            });
          }
        }}
      >
        <img
          src="/images/manabymario.png"
          alt="Manaby Mario Mascot"
          className={styles.mascotImage}
        />
      </motion.div>

      <motion.div
        className={styles.menuContainer}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* タイトル - アニメーション付き */}
        <motion.div
          className={styles.titleContainer}
          variants={itemVariants}
        >
          <h1 className={`screen-title ${styles.title}`}>manaby typing</h1>
          {/* レトロSF風のサブタイトル追加 */}
          <div className={styles.subTitleContainer}>
            <span className={styles.subTitle}>SPACE CREW TYPING MISSION</span>
            <div className={styles.titleDecoration}></div>
          </div>
        </motion.div>

        {/* メインロゴ（スタートボタン） - アニメーション付き */}
        <motion.div
          className={styles.logoContainer}
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            className={styles.startButton}
            onClick={handleStartGame}
            aria-label="ゲームを開始する"
          >
            <Image
              src="/images/manabylogodot.png"
              alt="Start Game"
              width={200}
              height={200}
              className={styles.logoImage}
              priority
              unoptimized
            />
            {/* スタートフレーム装飾を削除 */}
          </button>
        </motion.div>

        {/* 難易度選択ボタン（横並びトグル式） - アニメーション付き */}
        <motion.div
          className={styles.difficultyToggleGroup}
          variants={itemVariants}
        >
          {Object.keys(difficultyLabels).map((key) => (
            <button
              key={key}
              className={`${styles.difficultyToggleButton} ${settings.difficulty === key ? styles.active : ''}`}
              onClick={() => handleDifficultyChange(key)}
              aria-pressed={settings.difficulty === key}
            >
              <span className={styles.btnText}>{difficultyLabels[key]}</span>
              {/* インジケーターを削除 */}
            </button>
          ))}
        </motion.div>

        <motion.div
          className={styles.instructions}
          variants={itemVariants}
        >
          <div className={styles.instructionText}>ロゴをクリックまたはSPACEキーでスタート！</div>
        </motion.div>

        {/* SF風装飾 - 下部ステータス表示を削除 */}
      </motion.div>

      {/* 右下に情報アイコンボタン */}
      <button
        className={styles.creditButton}
        onClick={handleOpenCredits}
        aria-label="クレジット"
      >
        <div className={styles.infoIcon}>ⓘ</div>
      </button>

      {/* 設定モーダルと他のモーダル - 既存コード */}
      <Modal isOpen={showSettingsModal} onClose={handleCloseModal} title="設定">
        {renderSettingsContent()}
      </Modal>      <Modal
        isOpen={showCredits}
        onClose={handleCloseModal}
        title="クレジット"
        disableEscKey={false}
        disableOverlayClick={false}
      >
        {renderCreditsContent()}
      </Modal>{/* 開発者設定モーダル - 不要なため削除 */}

      {/* MCP状態表示（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && mcpActive && (
        <div className={styles.mcpStatusIndicator}>
          <div className={styles.mcpStatusDot} title="MCP接続中"></div>
        </div>
      )}      {/* 開発者設定ボタン - 不要なため削除 */}
    </div>
  );
};

export default MainMenu;
