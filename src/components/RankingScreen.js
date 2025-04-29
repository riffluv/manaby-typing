'use client';

import React, { useState, useEffect } from 'react';
import styles from '../styles/RankingScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { getGameRecords, getHighScores } from '../utils/RecordUtils';
import {
  initializeFirebase,
  getTopRankings,
  getRecentRankings,
  saveOnlineRanking,
  debugCheckAllRankings,
} from '../utils/FirebaseUtils';
import soundSystem from '../utils/SoundUtils';
import TypingUtils from '../utils/TypingUtils';
import { motion } from 'framer-motion';
import { usePageTransition } from './TransitionManager';

// アニメーション設定
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
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
    y: 20,
    transition: { duration: 0.2 },
  },
};

const RankingScreen = () => {
  const { settings, gameState } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();
  const [rankingData, setRankingData] = useState([]);
  const [highScores, setHighScores] = useState({});
  const [activeDifficulty, setActiveDifficulty] = useState('normal');
  const [isExiting, setIsExiting] = useState(false);

  // オンラインランキング関連の状態
  const [onlineRankings, setOnlineRankings] = useState([]);
  const [isOnlineMode, setIsOnlineMode] = useState(true); // デフォルトでオンラインモード
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState({
    success: false,
    message: '',
  });
  const [debugData, setDebugData] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [previousScreen, setPreviousScreen] = useState(SCREENS.MAIN_MENU);

  // コンポーネントマウント時に前の画面情報を取得
  useEffect(() => {
    // ページ遷移時に渡された情報から遷移元を取得
    if (
      window.history.state &&
      window.history.state.options &&
      window.history.state.options.from
    ) {
      setPreviousScreen(window.history.state.options.from);
    } else {
      // 情報がない場合はデフォルトでメインメニューからと見なす
      setPreviousScreen(SCREENS.MAIN_MENU);
    }

    // サウンドを初期化
    soundSystem.resume();

    // Firebaseを初期化
    initializeFirebase();

    // 記録データの取得
    loadRankingData();

    // デフォルトで現在の難易度をアクティブに
    setActiveDifficulty(settings.difficulty);

    // ローカルストレージから前回使用したプレイヤー名を取得
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // オンラインモードが変更された時にデータをロード
  useEffect(() => {
    if (isOnlineMode) {
      loadOnlineRankings();
    } else {
      // ローカルモードに切り替えたときもランキングを再ロード
      loadRankingData();
    }
  }, [isOnlineMode, activeDifficulty]);

  // ランキングデータのロード
  const loadRankingData = () => {
    // 過去の記録を取得
    const records = getGameRecords();

    // KPM順にデータをソート
    const sortedRecords = [...records].sort((a, b) => {
      // KPMで降順ソート、同じ場合は正確性、その次はミス数で判断
      if (b.kpm !== a.kpm) {
        return b.kpm - a.kpm;
      } else if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      } else {
        return a.mistakes - b.mistakes; // ミスが少ない方が上位
      }
    });

    setRankingData(sortedRecords);

    // ハイスコアも取得
    setHighScores(getHighScores());
  };

  // オンラインランキングのロード
  const loadOnlineRankings = async () => {
    setIsLoading(true);
    try {
      // 常にトップランキングを取得
      const rankings = await getTopRankings(activeDifficulty, 20);
      console.log(
        `Loaded ${rankings.length} online rankings for difficulty: ${activeDifficulty}`
      );
      setOnlineRankings(rankings);
    } catch (error) {
      console.error('オンラインランキングの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // オンラインモード切替処理
  const toggleOnlineMode = () => {
    soundSystem.playSound('Button');
    // オンラインモード ⇔ ローカルモードの切り替え
    const newMode = !isOnlineMode;
    setIsOnlineMode(newMode);

    // モード変更時にサウンドを再生
    if (newMode) {
      console.log('オンラインモードに切り替えました');
    } else {
      console.log('ローカルモードに切り替えました');
    }
  };

  // 難易度切り替え処理
  const handleDifficultyChange = (difficulty) => {
    soundSystem.playSound('Button');
    setActiveDifficulty(difficulty);
  };

  // KPM順にソートされたデータを取得
  const getKpmSortedData = () => {
    return [...rankingData]
      .filter((record) => record.difficulty === activeDifficulty)
      .sort((a, b) => b.kpm - a.kpm)
      .slice(0, 20); // 上位20件のみ表示
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(
      date.getHours()
    ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 戻るボタンのクリック処理
  const handleBack = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // ボタン音を即座に再生
    soundSystem.playSound('Button');

    // 退場中フラグを立てる
    setIsExiting(true);

    // 退場アニメーションの後に画面遷移
    setTimeout(() => {
      // previousScreenが設定されていればその画面に、なければメインメニューに戻る
      const destination = previousScreen || SCREENS.MAIN_MENU;
      goToScreen(destination, { playSound: false }); // 音はすでに再生したので不要
    }, 300); // アニメーション時間と同期
  };

  // メインメニューボタンのクリック処理
  const handleMainMenu = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // ボタン音を即座に再生
    soundSystem.playSound('Button');

    // 退場中フラグを立てる
    setIsExiting(true);

    // 退場アニメーションの後に画面遷移
    setTimeout(() => {
      goToScreen(SCREENS.MAIN_MENU, { playSound: false }); // 音はすでに再生したので不要
    }, 300); // アニメーション時間と同期
  };

  // 登録モーダルを表示
  const handleShowRegisterModal = () => {
    soundSystem.playSound('Button');
    setShowRegisterModal(true);
    setRegistrationStatus({ success: false, message: '' });
  };

  // 登録モーダルを閉じる
  const handleCloseModal = () => {
    soundSystem.playSound('Button');
    setShowRegisterModal(false);
  };

  // プレイヤー名の変更処理
  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  // オンラインランキングに登録
  const handleRegisterScore = async () => {
    if (!gameState || !gameState.correctKeyCount) {
      setRegistrationStatus({
        success: false,
        message: '登録するスコアがありません。プレイ後に再度お試しください。',
      });
      return;
    }

    if (!playerName.trim()) {
      setRegistrationStatus({
        success: false,
        message: '名前を入力してください。',
      });
      return;
    }

    setIsLoading(true);
    try {
      // ローカルストレージに名前を保存
      localStorage.setItem('playerName', playerName);

      // Weather Typing風の計算方法でのKPM
      let kpmValue = 0;
      if (gameState.problemKPMs && gameState.problemKPMs.length > 0) {
        const validKPMs = gameState.problemKPMs.filter((kpm) => kpm > 0);
        if (validKPMs.length > 0) {
          const totalKPM = validKPMs.reduce((sum, kpm) => sum + kpm, 0);
          kpmValue = Math.floor(totalKPM / validKPMs.length);
        }
      } else if (
        gameState.startTime &&
        gameState.endTime &&
        gameState.correctKeyCount
      ) {
        const elapsedMs = gameState.endTime - gameState.startTime;
        const minutes = elapsedMs / 60000;
        kpmValue = Math.floor(gameState.correctKeyCount / minutes);
      }

      // KPMからランクを計算
      const rankValue = TypingUtils.getKPMRank(kpmValue);

      // 正解率を計算
      // gameState.accuracyが存在しない場合は、正解キー数と間違いから計算
      let accuracyValue = 0;
      if (
        typeof gameState.accuracy === 'number' &&
        !isNaN(gameState.accuracy)
      ) {
        // すでにaccuracyが計算されている場合はその値を使用
        accuracyValue = gameState.accuracy;
      } else if (
        gameState.correctKeyCount >= 0 &&
        (gameState.mistakes >= 0 || gameState.mistakes === 0)
      ) {
        // correctKeyCountとmistakesから計算
        const totalKeystrokes = gameState.correctKeyCount + gameState.mistakes;
        if (totalKeystrokes > 0) {
          accuracyValue = (gameState.correctKeyCount / totalKeystrokes) * 100;
        }
      }

      console.log('送信する正確率データ:', accuracyValue, '%');
      console.log('gameState:', {
        correctKeyCount: gameState.correctKeyCount,
        mistakes: gameState.mistakes,
        accuracy: gameState.accuracy,
      });

      // オンラインランキングに保存
      const recordId = await saveOnlineRanking(
        playerName,
        kpmValue,
        accuracyValue,
        gameState.playTime || 0,
        gameState.mistakes || 0,
        settings.difficulty || 'normal',
        rankValue // ランク情報を追加
      );

      if (recordId) {
        setRegistrationStatus({
          success: true,
          message: 'ランキングに登録しました！',
        });

        // オンラインモードに切り替えて最新データを表示
        setIsOnlineMode(true);
        await loadOnlineRankings();
      } else {
        throw new Error('登録に失敗しました');
      }
    } catch (error) {
      console.error('スコア登録エラー:', error);
      setRegistrationStatus({
        success: false,
        message:
          'ランキング登録中にエラーが発生しました。ネットワーク接続を確認してください。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // デバッグ機能 - Firebase接続テスト
  const handleDebugFirebase = async () => {
    console.log('Testing Firebase connection...');
    setIsLoading(true);
    try {
      // Firebaseに直接アクセスして全データを確認
      const allData = await debugCheckAllRankings();
      setDebugData(allData);
      setShowDebug(true);
      console.log('Debug data loaded:', allData);
    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // デバッグモードを閉じる
  const closeDebug = () => {
    setShowDebug(false);
  };

  // 登録モーダルのESCキー対応
  useEffect(() => {
    const handleKeyDown = (e) => {
      // モーダルが開いている場合、ESCキーで閉じる
      if (e.key === 'Escape') {
        e.preventDefault();

        if (showDebug) {
          // デバッグモーダルを閉じる
          soundSystem.playSound('Button');
          closeDebug();
        } else if (showRegisterModal) {
          // 登録モーダルを閉じる
          soundSystem.playSound('Button');
          handleCloseModal();
        } else if (!isTransitioning && !isExiting) {
          // モーダルが開いていない場合は一つ前の画面に戻る
          soundSystem.playSound('Button');
          setIsExiting(true);

          setTimeout(() => {
            goToScreen(previousScreen, { playSound: false });
          }, 300);
        }
      }
    };

    // キーボードイベントをリスン
    document.addEventListener('keydown', handleKeyDown);

    // クリーンアップ関数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showRegisterModal, showDebug, isTransitioning, isExiting]);

  // リザルト画面からのアクセスかどうかを判定してESC押下時の戻り先を決定
  const handleEscKeyNavigation = () => {
    // 前の画面がリザルト画面ならリザルト画面に戻る
    // そうでなければメインメニューに戻る
    const destination = SCREENS.RESULT;
    goToScreen(destination, { playSound: false });
  };

  return (
    <div className={styles.rankingContainer}>
      <motion.div
        className={styles.rankingHeader}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, duration: 0.8 }}
      >
        <h1 className={styles.rankingTitle}>RANKING</h1>
      </motion.div>

      {/* オンライン/ローカル切り替えボタン */}
      <div
        className={styles.onlineModeToggle}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '15px',
          zIndex: 10,
          position: 'relative',
        }}
      >
        <button
          style={{
            backgroundColor: !isOnlineMode
              ? 'rgba(255, 140, 0, 0.4)'
              : 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            fontFamily: "'Press Start 2P', cursive, system-ui",
            fontSize: '12px',
            padding: '8px 15px',
            border: '2px solid #ff8c00',
            borderRadius: '20px',
            cursor: isOnlineMode ? 'pointer' : 'default',
            boxShadow: !isOnlineMode
              ? '0 0 10px rgba(255, 140, 0, 0.8)'
              : 'none',
            transition: 'all 0.3s',
          }}
          onClick={() => {
            if (isOnlineMode) toggleOnlineMode();
          }}
        >
          ローカル
        </button>
        <button
          style={{
            backgroundColor: isOnlineMode
              ? 'rgba(255, 140, 0, 0.4)'
              : 'rgba(0, 0, 0, 0.7)',
            color: '#ffffff',
            fontFamily: "'Press Start 2P', cursive, system-ui",
            fontSize: '12px',
            padding: '8px 15px',
            border: '2px solid #ff8c00',
            borderRadius: '20px',
            cursor: !isOnlineMode ? 'pointer' : 'default',
            boxShadow: isOnlineMode
              ? '0 0 10px rgba(255, 140, 0, 0.8)'
              : 'none',
            transition: 'all 0.3s',
          }}
          onClick={() => {
            if (!isOnlineMode) toggleOnlineMode();
          }}
        >
          オンライン
        </button>
      </div>

      <div className={styles.difficultyNav}>
        <button
          className={`${styles.difficultyButton} ${
            activeDifficulty === 'easy' ? styles.difficultyButton__active : ''
          }`}
          onClick={() => handleDifficultyChange('easy')}
        >
          やさしい
        </button>
        <button
          className={`${styles.difficultyButton} ${
            activeDifficulty === 'normal' ? styles.difficultyButton__active : ''
          }`}
          onClick={() => handleDifficultyChange('normal')}
        >
          普通
        </button>
        <button
          className={`${styles.difficultyButton} ${
            activeDifficulty === 'hard' ? styles.difficultyButton__active : ''
          }`}
          onClick={() => handleDifficultyChange('hard')}
        >
          むずかしい
        </button>
      </div>

      <div className={styles.rankingContent}>
        {isLoading ? (
          <div className={styles.loadingSpinner}>読み込み中...</div>
        ) : isOnlineMode ? (
          // オンラインランキング表示
          <motion.div
            className={styles.tableContainer}
            variants={containerVariants}
            initial="hidden"
            animate={isExiting ? 'exit' : 'show'}
            exit="exit"
          >
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>プレイヤー</th>
                  <th>KPM</th>
                  <th>ランク</th>
                  <th>正解率</th>
                  <th>ミス</th>
                  <th>日付</th>
                </tr>
              </thead>
              <tbody>
                {onlineRankings.map((record, index) => (
                  <motion.tr key={record.id || index} variants={itemVariants}>
                    <td>{index + 1}</td>
                    <td>
                      {record.playerName || record.username || 'Anonymous'}
                    </td>
                    <td>
                      {Math.floor(record.kpm) === record.kpm
                        ? Math.floor(record.kpm)
                        : record.kpm.toFixed(1)}
                    </td>
                    <td
                      style={{
                        color: TypingUtils.getRankColor(
                          record.rank || TypingUtils.getKPMRank(record.kpm)
                        ),
                      }}
                    >
                      {record.rank || TypingUtils.getKPMRank(record.kpm)}
                    </td>
                    <td>
                      {(record.accuracy !== undefined
                        ? record.accuracy
                        : record.stats?.accuracy !== undefined
                        ? record.stats.accuracy
                        : 0
                      ).toFixed(1)}
                      %
                    </td>
                    <td>{record.mistakes || record.stats?.mistakes || 0}</td>
                    <td>
                      {formatDate(
                        record.date ||
                          record.timestamp ||
                          new Date().toISOString()
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {onlineRankings.length === 0 && (
              <div className={styles.noRecords}>
                オンラインの記録がありません
              </div>
            )}
          </motion.div>
        ) : (
          // ローカルランキング表示
          <motion.div
            className={styles.tableContainer}
            variants={containerVariants}
            initial="hidden"
            animate={isExiting ? 'exit' : 'show'}
            exit="exit"
          >
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>KPM</th>
                  <th>ランク</th>
                  <th>正解率</th>
                  <th>ミス</th>
                  <th>日付</th>
                </tr>
              </thead>
              <tbody>
                {getKpmSortedData().map((record, index) => (
                  <motion.tr key={index} variants={itemVariants}>
                    <td>{index + 1}</td>
                    <td>
                      {Math.floor(record.kpm) === record.kpm
                        ? Math.floor(record.kpm)
                        : record.kpm.toFixed(1)}
                    </td>
                    <td
                      style={{
                        color: TypingUtils.getRankColor(
                          record.rank || TypingUtils.getKPMRank(record.kpm)
                        ),
                      }}
                    >
                      {record.rank || TypingUtils.getKPMRank(record.kpm)}
                    </td>
                    <td>{record.accuracy.toFixed(1)}%</td>
                    <td>{record.mistakes}</td>
                    <td>{formatDate(record.date)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {getKpmSortedData().length === 0 && (
              <div className={styles.noRecords}>記録がありません</div>
            )}
          </motion.div>
        )}
      </div>

      <motion.div
        className={styles.buttonContainer}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? 50 : 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ delay: isExiting ? 0 : 0.6, duration: 0.5 }}
      >
        <motion.button
          className={styles.registerButton}
          onClick={handleShowRegisterModal}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting || !gameState || !gameState.correctKeyCount}
        >
          ランキング登録
        </motion.button>

        <motion.button
          className={styles.backButton}
          onClick={handleBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting}
        >
          戻る
        </motion.button>

        <motion.button
          className={styles.mainMenuButton}
          onClick={handleMainMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isExiting}
        >
          メインメニュー
        </motion.button>

        {/* デバッグボタン - 開発用 */}
        <motion.button
          className={styles.debugButton}
          onClick={handleDebugFirebase}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          disabled={isLoading}
        >
          接続確認
        </motion.button>
      </motion.div>

      {/* ランキング登録モーダル */}
      {showRegisterModal && (
        <div className={styles.modalOverlay}>
          <motion.div
            className={styles.modalContent}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>オンラインランキング登録</h2>
              <button className={styles.closeButton} onClick={handleCloseModal}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>名前を入力してオンラインランキングに登録しましょう！</p>

              {registrationStatus.message && (
                <div
                  className={`${styles.statusMessage} ${
                    registrationStatus.success
                      ? styles.successMessage
                      : styles.errorMessage
                  }`}
                >
                  {registrationStatus.message}
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="playerName">プレイヤー名：</label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={handleNameChange}
                  maxLength={20}
                  placeholder="名前を入力（最大20文字）"
                  disabled={isLoading}
                  className={styles.nameInput}
                />
              </div>

              {gameState && (
                <div className={styles.scorePreview}>
                  <div className={styles.previewItem}>
                    <span>難易度:</span>
                    <span>
                      {settings.difficulty === 'easy'
                        ? 'やさしい'
                        : settings.difficulty === 'normal'
                        ? '普通'
                        : 'むずかしい'}
                    </span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>KPM:</span>
                    <span>
                      {gameState.problemKPMs && gameState.problemKPMs.length > 0
                        ? Math.floor(
                            gameState.problemKPMs
                              .filter((kpm) => kpm > 0)
                              .reduce((sum, kpm) => sum + kpm, 0) /
                              gameState.problemKPMs.filter((kpm) => kpm > 0)
                                .length
                          )
                        : 0}
                    </span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>ランク:</span>
                    <span
                      style={{
                        color: TypingUtils.getRankColor(
                          TypingUtils.getKPMRank(
                            gameState.problemKPMs &&
                              gameState.problemKPMs.length > 0
                              ? Math.floor(
                                  gameState.problemKPMs
                                    .filter((kpm) => kpm > 0)
                                    .reduce((sum, kpm) => sum + kpm, 0) /
                                    gameState.problemKPMs.filter(
                                      (kpm) => kpm > 0
                                    ).length
                                )
                              : 0
                          )
                        ),
                      }}
                    >
                      {TypingUtils.getKPMRank(
                        gameState.problemKPMs &&
                          gameState.problemKPMs.length > 0
                          ? Math.floor(
                              gameState.problemKPMs
                                .filter((kpm) => kpm > 0)
                                .reduce((sum, kpm) => sum + kpm, 0) /
                                gameState.problemKPMs.filter((kpm) => kpm > 0)
                                  .length
                            )
                          : 0
                      )}
                    </span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>正解率:</span>
                    <span>
                      {gameState.correctKeyCount &&
                      (gameState.mistakes || gameState.mistakes === 0)
                        ? (
                            (gameState.correctKeyCount /
                              (gameState.correctKeyCount +
                                gameState.mistakes)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  className={styles.registerActionButton}
                  onClick={handleRegisterScore}
                  disabled={
                    isLoading ||
                    !playerName.trim() ||
                    registrationStatus.success
                  }
                >
                  {isLoading ? '登録中...' : '登録する'}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={handleCloseModal}
                  disabled={isLoading}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* デバッグモード */}
      {showDebug && (
        <div className={styles.modalOverlay}>
          <motion.div
            className={styles.modalContent}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>デバッグモード</h2>
              <button className={styles.closeButton} onClick={closeDebug}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <pre>{JSON.stringify(debugData, null, 2)}</pre>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeDebug}>
                閉じる
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RankingScreen;
