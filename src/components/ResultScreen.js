import React, { useEffect, useMemo, useCallback } from 'react';
import styles from '../styles/ResultScreen.module.css';
import { motion } from 'framer-motion';
import TypingUtils from '@/utils/TypingUtils';
import { useGameContext, SCREENS } from '@/contexts/GameContext';
import { usePageTransition } from './TransitionManager';
import soundSystem from '../utils/SoundUtils'; // サウンドシステムを直接インポート
import { saveGameRecord } from '../utils/RecordUtils'; // ローカルランキング保存用に追加
import { getStaticPath } from '../utils/StaticPathUtils'; // 静的アセットパス用のユーティリティを追加

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
  const { gameState } = useGameContext();

  // データ検証と詳細なデバッグログを追加
  useEffect(() => {
    console.log('ResultScreen: 受け取ったstats', stats);
    console.log('ResultScreen: gameStateからのstats', gameState?.stats);

    // 外部propsとgameStateの両方からデータを確認
    const finalStats = stats || gameState?.stats;
    console.log('ResultScreen: 使用する統計情報', finalStats);

    // データが不足している場合は警告を表示
    if (!finalStats || finalStats.kpm === undefined || finalStats.kpm === 0) {
      console.warn(
        'ResultScreen: statsデータが不足しているか、KPMが0です',
        finalStats
      );
    }    // スコアデータがあればローカルランキングに保存
    if (finalStats && finalStats.kpm > 0) {
      try {
        // 匿名のユーザー名でスコアを保存
        saveGameRecord({
          username: 'Player',
          kpm: finalStats.kpm,
          correctCount: finalStats.correctCount || 0,
          missCount: finalStats.missCount || 0,
          accuracy: finalStats.accuracy || 0,
          timestamp: Date.now()
        });
        console.log('ResultScreen: ローカルランキングにスコアを保存しました');
      } catch (error) {
        console.error('ResultScreen: ランキング保存でエラーが発生しました:', error);
      }
    } else {
      console.log('ResultScreen: スコアデータが無いためランキング保存をスキップします');
    }

  }, [stats, gameState]);

  // メニューに戻るハンドラー - 再利用可能なコールバックとして定義
  const handleBackToMenu = useCallback(() => {
    console.log('メニューに戻ります');
    // 音声再生はgoToScreenに委譲
    if (typeof onClickMenu === 'function') {
      onClickMenu();
    } else {
      // フォールバックとして直接遷移関数を呼び出し
      goToScreen(SCREENS.MAIN_MENU, { playSound: true });
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
            .loadSound('complete', getStaticPath('/sounds/resultsound.mp3'))
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
  };  // 統計データを安全に取得
  const safeStats = useMemo(() => {
    // 送られてきたstatsかgameStateのstatsを取得
    const inputStats = stats || gameState?.stats;
    console.log('ResultScreen: 統計データ処理:', inputStats); if (inputStats && typeof inputStats === 'object') {
      // デバッグ: より詳細なデータ
      console.log('ResultScreen: 詳細なステータスデータ', {
        入力されたcorrectCount: inputStats.correctCount,
        入力されたmissCount: inputStats.missCount,
        入力されたaccuracy: inputStats.accuracy,
        解答した問題数: inputStats.solvedProblems,
        残りのデータ: inputStats
      });

      // 統計情報をそのまま使用（正解キー数とミス数は必ず数値にする）
      return {
        kpm: inputStats.kpm || 0,
        correctCount: typeof inputStats.correctCount === 'number' ? inputStats.correctCount : 0,
        missCount: typeof inputStats.missCount === 'number' ? inputStats.missCount : 0,
        accuracy: inputStats.accuracy || 0,
        totalTime: inputStats.totalTime || 0,
        elapsedTimeMs: inputStats.elapsedTimeMs || 0,
        rank: inputStats.rank || 'F',
        problemKPMs: inputStats.problemKPMs || [],
        solvedProblems: inputStats.solvedProblems
      };
    }

    // データが無い場合はデフォルト値を返す
    return {
      kpm: 0,
      correctCount: 0,
      missCount: 0,
      accuracy: 0,
      totalTime: 0,
      elapsedTimeMs: 0,
      rank: 'F',
      problemKPMs: []
    };
  }, [stats, gameState?.stats]);

  // スコア計算のデバッグログも削除
  console.log('ResultScreen: 詳細なKPM分析', {
    safeStatsのKPM値: safeStats.kpm,
    元のstatsのKPM値: stats?.kpm,
    gameStateのKPM値: gameState?.stats?.kpm,
    safeStats全体: safeStats
  });

  // KPMが異常に高い場合の警告
  if (safeStats.kpm > 500) {
    console.warn('ResultScreen: KPM値が異常に高い値です:', safeStats.kpm);
    console.warn('元の計算データ:', {
      correctCount: safeStats.correctCount,
      elapsedTimeMs: safeStats.elapsedTimeMs,
      elapsedMinutes: safeStats.elapsedTimeMs / 60000
    });
  }  // 表示用に整形した統計情報を生成
  const fixedStats = useMemo(() => {
    console.log('ResultScreen: 統計情報を表示用に整形');

    // KPMが異常に高い場合の警告
    if (safeStats.kpm > 500) {
      console.warn('ResultScreen: KPM値が異常に高い値です:', safeStats.kpm);
    }

    // ランクカラーの取得
    const rankColor = TypingUtils.getRankColor(safeStats.rank || 'F');

    // 小数点以下を整形
    const formattedKpm = safeStats.kpm ? formatDecimal(safeStats.kpm) : '0.0';
    const formattedAccuracy = safeStats.accuracy ? formatDecimal(safeStats.accuracy) : '0.0';
    const formattedTime = safeStats.totalTime ? formatDecimal(safeStats.totalTime) : '0.0';

    return {
      totalTime: formattedTime,
      accuracy: formattedAccuracy,
      kpm: formattedKpm,
      correctCount: safeStats.correctCount || 0,
      missCount: safeStats.missCount || 0,
      rank: safeStats.rank || '-',
      rankColor: rankColor,
      problemKPMs: safeStats.problemKPMs || []
    };
  }, [safeStats]);

  // クリックハンドラー
  const handleRetryClick = (e) => {
    e.preventDefault();
    console.log('リトライボタンがクリックされました');
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
    if (typeof onClickRanking === 'function') {
      onClickRanking();
    } else {
      // gameStateパラメータとしてstatsデータを渡す
      goToScreen(SCREENS.RANKING, {
        playSound: true,
        gameState: stats, // ここでstatsデータを渡す
      });
    }
  };

  return (
    <motion.div
      className={styles.resultContainer}
      initial="hidden"
      animate="visible"
      variants={containerVariants}    >
      {/* コーナー装飾、スキャンライン、ドットパターンを削除 */}

      <motion.div className={styles.resultHeader} variants={itemVariants}>
        <h1 className={`screen-title ${styles.resultTitle}`}>RESULT</h1>
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
          </motion.div>          {/* 正解数：打鍵数（キーストローク）を表示 */}
          <motion.div className={styles.statCard} whileHover={{ scale: 1.03 }}>
            <div className={styles.statLabel}>Correct</div>
            <div className={styles.statValue}>{fixedStats.correctCount}</div>
          </motion.div>

          {/* ミス数 */}
          <motion.div className={styles.statCard} whileHover={{ scale: 1.03 }}>
            <div className={styles.statLabel}>Miss</div>
            <div className={styles.statValue}>{fixedStats.missCount}</div>
          </motion.div>

          {/* 問題数（必要な場合のみ表示） */}
          {fixedStats.solvedProblems !== undefined && (
            <motion.div className={styles.statCard} whileHover={{ scale: 1.03 }}>
              <div className={styles.statLabel}>Problems</div>
              <div className={styles.statValue}>{fixedStats.solvedProblems}</div>
            </motion.div>
          )}
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
