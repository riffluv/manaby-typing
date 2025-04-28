'use client';

import React, { useEffect, useState } from 'react';
import styles from '../styles/ResultScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import soundSystem from '../utils/SoundUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageTransition } from './TransitionManager';
import { saveGameRecord, getHighScores } from '../utils/RecordUtils';
import TypingUtils from '../utils/TypingUtils';

// スコアカードのアニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.3,
      when: 'beforeChildren',
    },
  },
};

const cardVariants = {
  hidden: { y: 50, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const ResultScreen = () => {
  const { gameState, settings } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();

  // スコア値を固定するためのステート（トランジション中に値が変わるのを防止）
  const [fixedStats, setFixedStats] = useState({
    kpm: '-',
    accuracy: '0.0%',
    time: '0:00',
    mistakes: 0,
  });

  // 画面が退場中かどうかを追跡
  const [isExiting, setIsExiting] = useState(false);

  // KPM（Keys Per Minute）の計算 - Weather Typing風
  const calculateKPM = () => {
    // 必要なデータを確認
    if (!gameState.problemKPMs || gameState.problemKPMs.length === 0) {
      console.log('【KPM計算エラー】problemKPMsがありません', {
        problemKPMs: gameState.problemKPMs,
      });

      // 古い計算方法でフォールバック
      if (gameState.startTime && gameState.correctKeyCount) {
        const endTime = gameState.endTime || Date.now();
        const elapsedMs = endTime - gameState.startTime;
        if (elapsedMs > 0) {
          return TypingUtils.calculateWeatherTypingKPM(
            gameState.correctKeyCount,
            elapsedMs
          ).toString();
        }
      }

      return '0';
    }

    // Weather Typing風: 各問題のKPMの平均値を計算
    const validKPMs = gameState.problemKPMs.filter((kpm) => kpm > 0);
    if (validKPMs.length === 0) {
      console.log('【KPM計算エラー】有効なKPM値がありません');
      return '0';
    }

    // 平均値を計算し、小数点以下切り捨て（Weather Typing風）
    const totalKPM = validKPMs.reduce((sum, kpm) => sum + kpm, 0);
    const averageKPM = Math.floor(totalKPM / validKPMs.length);

    console.log(`【KPM計算】Weather Typing風: 各問題KPMの平均`, {
      各問題KPM: validKPMs.join(', '),
      平均値: averageKPM,
    });

    return averageKPM.toString();
  };

  // 正解率の計算
  const calculateAccuracy = () => {
    // 必要なデータを確認
    if (!gameState.correctKeyCount && !gameState.mistakes) {
      console.log('正解率計算: データなし', {
        correctKeyCount: gameState.correctKeyCount,
        mistakes: gameState.mistakes,
      });
      return '0.0%';
    }

    // 総入力数: 正しい入力 + 間違った入力
    const totalAttempts = gameState.correctKeyCount + gameState.mistakes;

    // 0除算防止
    if (totalAttempts === 0) {
      console.log('正解率計算: 総入力数が0', {
        correctKeyCount: gameState.correctKeyCount,
        mistakes: gameState.mistakes,
      });
      return '0.0%';
    }

    const accuracy = (gameState.correctKeyCount / totalAttempts) * 100;

    console.log('正解率計算:', {
      correctKeyCount: gameState.correctKeyCount,
      mistakes: gameState.mistakes,
      totalAttempts,
      accuracy: accuracy.toFixed(1) + '%',
    });

    // 小数点以下1桁まで表示
    return `${Math.min(100, Math.max(0, accuracy)).toFixed(1)}%`;
  };

  // プレイ時間の計算
  const formatTime = () => {
    // playTimeが直接利用可能な場合はそれを使用
    const seconds = gameState.playTime || 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ミス入力回数
  const mistakeCount = gameState.mistakes || 0;

  // コンポーネントがマウントされたときにサウンドシステムを初期化し記録を保存する
  useEffect(() => {
    // サウンドシステムを確実に初期化
    soundSystem.resume();

    // コンポーネントがマウントされた時点でリザルト完了音を鳴らす
    soundSystem.play('complete');

    // スコア値を固定
    setFixedStats({
      kpm: calculateKPM(),
      accuracy: calculateAccuracy(),
      time: formatTime(),
      mistakes: mistakeCount,
    });

    // ゲーム記録を保存する
    const kpmValue = calculateKPM();
    const accuracyValue = parseFloat(calculateAccuracy().replace('%', ''));
    const timeValue = gameState.playTime || 0;

    // ゲームが正常に終了した場合のみ記録を保存
    if (gameState.isGameClear && kpmValue !== '-') {
      saveGameRecord(
        kpmValue,
        accuracyValue,
        timeValue,
        mistakeCount,
        settings.difficulty
      );
      console.log('ゲーム記録を保存しました:', {
        kpm: kpmValue,
        accuracy: accuracyValue,
        time: timeValue,
        mistakes: mistakeCount,
        difficulty: settings.difficulty,
      });
    }
  }, []);

  // 「もう一度」ボタンのクリック処理 - トランジション対応
  const handlePlayAgain = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 退場中フラグを立てる
    setIsExiting(true);

    // 退場アニメーションの後に画面遷移
    setTimeout(() => {
      // 新しい画面遷移システムを使用
      goToScreen(SCREENS.GAME);
    }, 300); // アニメーション時間と同期
  };

  // 「メインメニュー」ボタンのクリック処理 - トランジション対応
  const handleMainMenu = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 退場中フラグを立てる
    setIsExiting(true);

    // 退場アニメーションの後に画面遷移
    setTimeout(() => {
      // 新しい画面遷移システムを使用
      goToScreen(SCREENS.MAIN_MENU);
    }, 300); // アニメーション時間と同期
  };

  // 「ランキング」ボタンのクリック処理 - トランジション対応
  const handleRanking = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 退場中フラグを立てる
    setIsExiting(true);

    // 退場アニメーションの後に画面遷移
    setTimeout(() => {
      // 新しい画面遷移システムを使用
      goToScreen(SCREENS.RANKING);
    }, 300); // アニメーション時間と同期
  };

  return (
    <div className={styles.resultContainer}>
      <motion.div
        className={styles.resultHeader}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, duration: 0.8 }}
      >
        <h1 className={styles.resultTitle}>結果発表</h1>
      </motion.div>

      <div className={styles.resultContent}>
        <motion.div
          className={styles.statsContainer}
          variants={containerVariants}
          initial="hidden"
          animate={isExiting ? 'exit' : 'show'}
          exit="exit"
        >
          <motion.div variants={cardVariants} className={styles.statCard}>
            <div className={styles.statLabel}>KPM</div>
            <div className={styles.statValue}>{fixedStats.kpm}</div>
          </motion.div>

          <motion.div variants={cardVariants} className={styles.statCard}>
            <div className={styles.statLabel}>正解率</div>
            <div className={styles.statValue}>{fixedStats.accuracy}</div>
          </motion.div>

          <motion.div variants={cardVariants} className={styles.statCard}>
            <div className={styles.statLabel}>タイム</div>
            <div className={styles.statValue}>{fixedStats.time}</div>
          </motion.div>

          <motion.div variants={cardVariants} className={styles.statCard}>
            <div className={styles.statLabel}>ミス入力</div>
            <div className={styles.statValue}>{fixedStats.mistakes}</div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className={styles.buttonContainer}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? 50 : 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ delay: isExiting ? 0 : 1, duration: 0.5 }}
      >
        <motion.button
          className={styles.resultButton}
          onClick={handlePlayAgain}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting}
        >
          もう一度
        </motion.button>

        <motion.button
          className={styles.resultButton}
          onClick={handleRanking}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting}
        >
          ランキング
        </motion.button>

        <motion.button
          className={styles.resultButton}
          onClick={handleMainMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting}
        >
          メインメニュー
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ResultScreen;
