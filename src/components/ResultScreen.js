import React, { useEffect, useMemo, useCallback } from 'react';
import styles from '../styles/ResultScreen.module.css';
import { motion } from 'framer-motion';
import TypingUtils from '@/utils/TypingUtils';
import { useGameContext, SCREENS } from '@/contexts/GameContext';
import { usePageTransition } from './TransitionManager';
import soundSystem from '../utils/SoundUtils'; // サウンドシステムを直接インポート

/**
 * リザルト画面コンポーネント
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {Object} props.stats - 表示する統計情報
 * @param {Function} props.onClickRetry - リトライボタンクリック時のコールバック
 * @param {Function} props.onClickMenu - メニューボタンクリック時のコールバック
 * @param {Function} props.onClickRanking - ランキングボタンクリック時のコールバック
 * @param {boolean} props.playSound - 効果音を再生するかどうか
 */
const ResultScreen = ({
  stats,
  onClickRetry,
  onClickMenu,
  onClickRanking,
  playSound = true,
}) => {
  const { goToScreen } = usePageTransition();

  // データ検証と詳細なデバッグログを追加
  useEffect(() => {
    console.log('ResultScreen: 受け取ったstats', stats);

    // データが不足している場合は警告を表示
    if (!stats || stats.kpm === undefined || stats.kpm === 0) {
      console.warn(
        'ResultScreen: statsデータが不足しているか、KPMが0です',
        stats
      );
    }
  }, [stats]);

  // メニューに戻るハンドラー - 再利用可能なコールバックとして定義
  const handleBackToMenu = useCallback(() => {
    console.log('メニューに戻ります');
    // オプションで音声を再生
    soundSystem.play('button');
    if (typeof onClickMenu === 'function') {
      onClickMenu();
    } else {
      // フォールバックとして直接遷移関数を呼び出し
      goToScreen(SCREENS.MAIN_MENU, { playSound: false }); // すでに音を鳴らしているので、ここではfalse
    }
  }, [onClickMenu, goToScreen]);

  // Escキーを押したときのハンドラーを追加
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        console.log('ResultScreen: Escキーが押されました: メニューに戻ります');
        // イベント伝播を確実に停止する
        event.preventDefault();
        event.stopPropagation();
        handleBackToMenu();
      }
    };

    // キャプチャフェーズでイベントをリッスンして、他のハンドラより先に実行されるようにする
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    // クリーンアップ関数
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleBackToMenu]); // 依存配列にhandleBackToMenuを追加

  // 効果音を再生（統一されたサウンドシステムを使用）
  useEffect(() => {
    if (playSound) {
      try {
        console.log('ResultScreen: 結果画面の効果音を再生します');
        // サウンドシステム経由で再生
        // playCustomSoundではなく、プリセット定義された効果音を使用するか、
        // またはロードしてから再生する
        if (soundSystem.sfxBuffers['complete']) {
          soundSystem.play('complete');
        } else {
          // 効果音がロードされていない場合はロードしてから再生
          soundSystem
            .loadSound('complete', '/sounds/resultsound.mp3')
            .then(() => soundSystem.play('complete'))
            .catch((error) =>
              console.error('効果音のロードに失敗しました:', error)
            );
        }
      } catch (error) {
        console.error('効果音の再生に失敗しました:', error);
      }
    } else {
      console.log('ResultScreen: playSoundがfalseのため効果音をスキップします');
    }
  }, [playSound]);

  // 小数点以下を整形するヘルパー関数
  const formatDecimal = (value) => {
    if (value === undefined || value === null) {
      console.warn('formatDecimal: 値が未定義です');
      return '0.0';
    }
    return Number(value).toFixed(1);
  };

  // アニメーション用のバリアント
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  const rankDisplayVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 10,
        delay: 0.5,
      },
    },
  };

  // セーフティチェック - statsがundefinedの場合のデフォルト値
  const safeStats = stats || {
    totalTime: 0,
    accuracy: 0,
    kpm: 0,
    correctCount: 0,
    missCount: 0,
  };

  // デバッグ用にKPMを確認
  console.log('ResultScreen: KPM値', safeStats.kpm);

  // ランク計算のデバッグ
  const rank = TypingUtils.getKPMRank(safeStats.kpm || 0);
  console.log(`ResultScreen: KPM ${safeStats.kpm} に基づくランク: ${rank}`);

  // 数値を固定して計算が再実行されないようにする
  const fixedStats = useMemo(() => {
    return {
      totalTime: formatDecimal(safeStats.totalTime || 0),
      // 修正: accuracy はすでにパーセント表示（0-100）になっているため、
      // 100を掛ける必要はありません
      accuracy: formatDecimal(safeStats.accuracy || 0),
      kpm: Math.floor(safeStats.kpm || 0),
      correctCount: safeStats.correctCount || 0,
      missCount: safeStats.missCount || 0,
      rank: TypingUtils.getKPMRank(safeStats.kpm || 0),
      rankColor: TypingUtils.getRankColor(
        TypingUtils.getKPMRank(safeStats.kpm || 0)
      ),
    };
  }, [safeStats]);

  // クリックハンドラー
  const handleRetryClick = (e) => {
    e.preventDefault();
    console.log('リトライボタンがクリックされました');
    soundSystem.play('button'); // 統一されたサウンドシステムで効果音を再生
    if (typeof onClickRetry === 'function') {
      onClickRetry();
    } else {
      console.error('onClickRetry関数が提供されていません');
    }
  };

  const handleMenuClick = (e) => {
    e.preventDefault();
    console.log('メニューボタンがクリックされました');
    handleBackToMenu(); // 共通のハンドラを使用
  };

  // ランキングボタン用のハンドラー
  const handleRankingClick = (e) => {
    e.preventDefault();
    console.log('ランキングボタンがクリックされました');
    soundSystem.play('button'); // 統一されたサウンドシステムで効果音を再生
    if (typeof onClickRanking === 'function') {
      onClickRanking();
    } else {
      goToScreen(SCREENS.RANKING, { playSound: false }); // すでに音を鳴らしているので、ここではfalse
    }
  };

  return (
    <motion.div
      className={styles.resultContainer}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className={styles.resultHeader} variants={itemVariants}>
        <h1 className={styles.resultTitle}>RESULT</h1>
        <div className={styles.escHint}>ESCキーでメニューに戻る</div>
      </motion.div>

      <motion.div className={styles.resultContent} variants={itemVariants}>
        {/* ランクを上部に独立して表示 */}
        <motion.div
          className={styles.rankDisplay}
          variants={rankDisplayVariants}
        >
          <h2
            className={styles.rankValue}
            style={{ color: fixedStats.rankColor }}
          >
            {fixedStats.rank}
          </h2>
          <p className={styles.rankLabel}>YOUR RANK</p>
          <div className={styles.rankBackdrop}></div>
        </motion.div>

        {/* 主要スタッツを2×2グリッドで表示 */}
        <motion.div className={styles.statsContainer} variants={itemVariants}>
          {/* KPMを特別に強調表示 */}
          <motion.div
            className={`${styles.statCard} ${styles.keyStatCard}`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className={styles.statLabel}>KPM</div>
            <div className={styles.statValue}>{fixedStats.kpm}</div>
          </motion.div>

          {/* 正解率を特別に強調表示 */}
          <motion.div
            className={`${styles.statCard} ${styles.keyStatCard}`}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <div className={styles.statLabel}>Accuracy</div>
            <div className={styles.statValue}>{fixedStats.accuracy}%</div>
          </motion.div>

          {/* 正解数 */}
          <motion.div className={styles.statCard} whileHover={{ scale: 1.03 }}>
            <div className={styles.statLabel}>Correct</div>
            <div className={styles.statValue}>{fixedStats.correctCount}</div>
          </motion.div>

          {/* ミス数 */}
          <motion.div className={styles.statCard} whileHover={{ scale: 1.03 }}>
            <div className={styles.statLabel}>Miss</div>
            <div className={styles.statValue}>{fixedStats.missCount}</div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div className={styles.buttonContainer} variants={itemVariants}>
        {/* ランキングボタン */}
        <motion.button
          className={styles.resultButton}
          onClick={handleRankingClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ランキング
        </motion.button>

        <motion.button
          className={styles.resultButton}
          onClick={handleRetryClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          リトライ
        </motion.button>

        <motion.button
          className={styles.resultButton}
          onClick={handleMenuClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          メニューへ
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default ResultScreen;
