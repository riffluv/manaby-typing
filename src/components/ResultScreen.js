import React, { useEffect, useMemo, useCallback } from 'react';
import styles from '../styles/ResultScreen.module.css';
import { motion } from 'framer-motion';
import TypingUtils from '@/utils/TypingUtils';
import { useGameContext, SCREENS } from '@/contexts/GameContext';
import { usePageTransition } from './TransitionManager';
import soundSystem from '../utils/SoundUtils'; // サウンドシステムを直接インポート
import { saveGameRecord } from '../utils/RecordUtils'; // ローカルランキング保存用に追加

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
    }

    // ローカルランキングにデータを保存
    const saveToLocalRanking = () => {
      if (!finalStats) return;

      try {
        // 必要なデータを取得
        const kpm = finalStats.kpm || 0;
        const accuracy = finalStats.accuracy || 0;
        const timeInSeconds = finalStats.totalTime || 0;
        const mistakes = finalStats.missCount || 0;
        const difficulty = gameState?.difficulty || gameState?.settings?.difficulty || 'normal';
        const rank = TypingUtils.getRank(kpm);

        console.log('ResultScreen: ローカルランキングにデータを保存します', {
          kpm, accuracy, timeInSeconds, mistakes, difficulty, rank
        });

        // RecordUtilsの関数を呼び出してデータを保存
        const saved = saveGameRecord(
          kpm,
          accuracy,
          timeInSeconds,
          mistakes,
          difficulty,
          rank
        );

        console.log('ResultScreen: ローカルランキングの保存結果:', saved);
      } catch (error) {
        console.error('ResultScreen: ローカルランキング保存中にエラーが発生しました:', error);
      }
    };

    // ランキングに保存
    saveToLocalRanking();

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
  const safeStats = useMemo(() => {
    // まずprops経由のstatsを確認
    if (stats && stats.kpm !== undefined && stats.kpm > 0) {
      console.log('ResultScreen: propsからの有効なstatsを使用します', stats);
      return stats;
    }

    // 次にgameContextからのstatsを確認
    if (gameState && gameState.stats && gameState.stats.kpm !== undefined && gameState.stats.kpm > 0) {
      console.log('ResultScreen: gameContextからの有効なstatsを使用します', gameState.stats);
      return gameState.stats;
    }

    // どちらも有効でない場合は最終手段としてデータを再構築
    console.warn('ResultScreen: 有効なKPMデータがありません。データの再構築を試みます');

    // 利用可能なデータを集める
    const baseStats = stats || gameState?.stats || {};
    const problemStats = baseStats.problemStats || [];

    // correctCount（正解キー数）がある場合は直接使用
    const correctCount = baseStats.correctCount || 0;
    const missCount = baseStats.missCount || 0;
    const totalKeystrokes = correctCount + missCount;

    console.log('ResultScreen: 再構築用データ', {
      correctCount,
      missCount,
      totalKeystrokes,
      problemStats,
      baseStats
    });

    // 既存のKPM値を確認（0でなければ使用）
    let kpm = baseStats.kpm || 0;

    // KPMが0の場合、問題ごとのデータから計算を試みる
    if (kpm <= 0 && problemStats.length > 0) {
      console.log('ResultScreen: 問題データからKPMを再計算します');
      kpm = TypingUtils.calculateAverageKPM(problemStats);
      console.log('ResultScreen: 再計算したKPM:', kpm);
    }

    // それでもKPMが0の場合、経過時間から計算
    if (kpm <= 0 && correctCount > 0) {
      const elapsedTimeMs = baseStats.elapsedTimeMs || baseStats.totalTime * 1000 || 0;
      if (elapsedTimeMs > 0) {
        kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
        console.log('ResultScreen: 時間からKPMを再計算:', kpm);
      }
    }

    // 最後の手段として、正解キー数が0より大きければ最低でも1を設定
    if (kpm <= 0 && correctCount > 0) {
      kpm = 1;
      console.log('ResultScreen: 最低値としてKPM=1を設定');
    }

    // 正確性を計算（正解数÷(正解数+ミス数)×100）
    const accuracy = totalKeystrokes > 0
      ? (correctCount / totalKeystrokes) * 100
      : 100;

    console.log('ResultScreen: 正確性を再計算:', {
      correctCount,
      missCount,
      totalKeystrokes,
      accuracy
    });

    // 再構築したデータを返す
    return {
      ...baseStats,
      kpm: kpm,
      correctCount: correctCount,
      missCount: missCount,
      accuracy: accuracy,
      totalTime: baseStats.totalTime || 0,
      elapsedTimeMs: baseStats.elapsedTimeMs || baseStats.totalTime * 1000 || 0
    };
  }, [stats, gameState]);

  // デバッグ用にKPMを確認
  console.log('ResultScreen: KPM値', safeStats.kpm);

  // ランク計算のデバッグ
  const rank = TypingUtils.getRank(safeStats.kpm || 0);
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
      rank: TypingUtils.getRank(safeStats.kpm || 0),
      rankColor: TypingUtils.getRankColor(
        TypingUtils.getRank(safeStats.kpm || 0)
      ),
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
      variants={containerVariants}
    >
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
