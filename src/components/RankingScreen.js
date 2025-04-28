'use client';

import React, { useState, useEffect } from 'react';
import styles from '../styles/RankingScreen.module.css';
import { useGameContext, SCREENS } from '../contexts/GameContext';
import { getGameRecords, getHighScores } from '../utils/RecordUtils';
import { initializeFirebase, getTopRankings, getRecentRankings, saveOnlineRanking, debugCheckAllRankings } from '../utils/FirebaseUtils';
import soundSystem from '../utils/SoundUtils';
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
    transition: { duration: 0.3 }
  }
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
    transition: { duration: 0.2 }
  }
};

const RankingScreen = () => {
  const { settings, gameState } = useGameContext();
  const { goToScreen, isTransitioning } = usePageTransition();
  const [rankingData, setRankingData] = useState([]);
  const [highScores, setHighScores] = useState({});
  const [activeTab, setActiveTab] = useState('recent');
  const [activeDifficulty, setActiveDifficulty] = useState('normal');
  const [isExiting, setIsExiting] = useState(false);
  
  // オンラインランキング関連の状態
  const [onlineRankings, setOnlineRankings] = useState([]);
  const [isOnlineMode, setIsOnlineMode] = useState(true); // デフォルトでオンラインモード
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState({ success: false, message: '' });
  const [debugData, setDebugData] = useState([]);
  const [showDebug, setShowDebug] = useState(false);

  // コンポーネントマウント時にデータを取得
  useEffect(() => {
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
    }
  }, [isOnlineMode, activeTab, activeDifficulty]);

  // ランキングデータのロード
  const loadRankingData = () => {
    // 過去の記録を取得
    const records = getGameRecords();

    // 新しい順に並べ替え
    const sortedRecords = [...records].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });

    setRankingData(sortedRecords);

    // ハイスコアも取得
    setHighScores(getHighScores());
  };

  // オンラインランキングのロード
  const loadOnlineRankings = async () => {
    setIsLoading(true);
    try {
      let rankings = [];
      console.log(`Fetching online rankings - Tab: ${activeTab}, Difficulty: ${activeDifficulty}`);
      
      if (activeTab === 'recent') {
        // 最近の記録を取得（難易度フィルタリングを追加）
        rankings = await getRecentRankings(10, activeDifficulty);
      } else {
        // 難易度別のトップスコアを取得
        rankings = await getTopRankings(activeDifficulty, 10);
      }
      
      console.log(`Loaded ${rankings.length} online rankings for difficulty: ${activeDifficulty}`);
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

  // タブ切り替え処理
  const handleTabChange = (tab) => {
    soundSystem.playSound('Button');
    setActiveTab(tab);
  };

  // 難易度切り替え処理
  const handleDifficultyChange = (difficulty) => {
    soundSystem.playSound('Button');
    setActiveDifficulty(difficulty);
  };

  // KPM順にソートされたデータを取得
  const getKpmSortedData = () => {
    return [...rankingData]
      .filter(record => record.difficulty === activeDifficulty)
      .sort((a, b) => b.kpm - a.kpm)
      .slice(0, 10); // トップ10のみ表示
  };

  // 日付をフォーマット
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 戻るボタンのクリック処理
  const handleBack = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 退場中フラグを立てる
    setIsExiting(true);
    
    // 退場アニメーションの後に画面遷移（効果音は画面遷移システムで再生）
    setTimeout(() => {
      // リザルト画面から来た場合はリザルト画面に戻る、それ以外はメインメニューに戻る
      goToScreen(SCREENS.RESULT);
    }, 300); // アニメーション時間と同期
  };

  // メインメニューボタンのクリック処理
  const handleMainMenu = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 退場中フラグを立てる
    setIsExiting(true);
    
    // 退場アニメーションの後に画面遷移（効果音は画面遷移システムで再生）
    setTimeout(() => {
      goToScreen(SCREENS.MAIN_MENU);
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
        message: '登録するスコアがありません。プレイ後に再度お試しください。' 
      });
      return;
    }

    if (!playerName.trim()) {
      setRegistrationStatus({ success: false, message: '名前を入力してください。' });
      return;
    }

    setIsLoading(true);
    try {
      // ローカルストレージに名前を保存
      localStorage.setItem('playerName', playerName);

      // Weather Typing風の計算方法でのKPM
      let kpmValue = 0;
      if (gameState.problemKPMs && gameState.problemKPMs.length > 0) {
        const validKPMs = gameState.problemKPMs.filter(kpm => kpm > 0);
        if (validKPMs.length > 0) {
          const totalKPM = validKPMs.reduce((sum, kpm) => sum + kpm, 0);
          kpmValue = Math.floor(totalKPM / validKPMs.length);
        }
      } else if (gameState.startTime && gameState.endTime && gameState.correctKeyCount) {
        const elapsedMs = gameState.endTime - gameState.startTime;
        const minutes = elapsedMs / 60000;
        kpmValue = Math.floor(gameState.correctKeyCount / minutes);
      }

      // 正解率を計算
      // gameState.accuracyが存在しない場合は、正解キー数と間違いから計算
      let accuracyValue = 0;
      if (typeof gameState.accuracy === 'number' && !isNaN(gameState.accuracy)) {
        // すでにaccuracyが計算されている場合はその値を使用
        accuracyValue = gameState.accuracy;
      } else if (gameState.correctKeyCount >= 0 && (gameState.mistakes >= 0 || gameState.mistakes === 0)) {
        // correctKeyCountとmistakesから計算
        const totalKeystrokes = gameState.correctKeyCount + gameState.mistakes;
        if (totalKeystrokes > 0) {
          accuracyValue = (gameState.correctKeyCount / totalKeystrokes) * 100;
        }
      }
      
      console.log("送信する正確率データ:", accuracyValue, "%");
      console.log("gameState:", {
        correctKeyCount: gameState.correctKeyCount,
        mistakes: gameState.mistakes,
        accuracy: gameState.accuracy
      });

      // オンラインランキングに保存
      const recordId = await saveOnlineRanking(
        playerName,
        kpmValue,
        accuracyValue,
        gameState.playTime || 0,
        gameState.mistakes || 0,
        settings.difficulty || 'normal'
      );

      if (recordId) {
        setRegistrationStatus({ 
          success: true, 
          message: 'ランキングに登録しました！' 
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
        message: 'ランキング登録中にエラーが発生しました。ネットワーク接続を確認してください。' 
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

  return (
    <div className={styles.rankingContainer}>
      <motion.div
        className={styles.rankingHeader}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, duration: 0.8 }}
      >
        <h1 className={styles.rankingTitle}>ランキング</h1>
      </motion.div>

      {/* オンライン/ローカル切り替えボタン */}
      <div className={styles.onlineModeToggle}>
        <button
          className={`${styles.modeButton} ${!isOnlineMode ? styles.modeButton__active : ''}`}
          onClick={toggleOnlineMode}
          disabled={!isOnlineMode}
        >
          ローカル
        </button>
        <button
          className={`${styles.modeButton} ${isOnlineMode ? styles.modeButton__active : ''}`}
          onClick={toggleOnlineMode}
          disabled={isOnlineMode}
        >
          オンライン
        </button>
      </div>

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'recent' ? styles.tabButton__active : ''}`}
          onClick={() => handleTabChange('recent')}
        >
          最近のスコア
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'top' ? styles.tabButton__active : ''}`}
          onClick={() => handleTabChange('top')}
        >
          トップスコア
        </button>
      </div>

      <div className={styles.difficultyNav}>
        <button
          className={`${styles.difficultyButton} ${activeDifficulty === 'easy' ? styles.difficultyButton__active : ''}`}
          onClick={() => handleDifficultyChange('easy')}
        >
          やさしい
        </button>
        <button
          className={`${styles.difficultyButton} ${activeDifficulty === 'normal' ? styles.difficultyButton__active : ''}`}
          onClick={() => handleDifficultyChange('normal')}
        >
          普通
        </button>
        <button
          className={`${styles.difficultyButton} ${activeDifficulty === 'hard' ? styles.difficultyButton__active : ''}`}
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
            animate={isExiting ? "exit" : "show"}
            exit="exit"
          >
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  {activeTab === 'top' && <th>ランク</th>}
                  <th>プレイヤー</th>
                  <th>KPM</th>
                  <th>正解率</th>
                  <th>タイム</th>
                  <th>ミス</th>
                  <th>日付</th>
                </tr>
              </thead>
              <tbody>
                {onlineRankings.map((record, index) => (
                  <motion.tr key={record.id} variants={itemVariants}>
                    {activeTab === 'top' && <td>{index + 1}</td>}
                    <td>{record.playerName || record.username || 'Anonymous'}</td>
                    <td>{(record.kpm || record.score || 0).toFixed(1)}</td>
                    <td>{((record.accuracy !== undefined ? record.accuracy : 
                          record.stats?.accuracy !== undefined ? record.stats.accuracy : 0)).toFixed(1)}%</td>
                    <td>{Math.floor((record.time || 0) / 60)}:{String((record.time || 0) % 60).padStart(2, '0')}</td>
                    <td>{record.mistakes || record.stats?.mistakes || 0}</td>
                    <td>{formatDate(record.date || record.timestamp || new Date().toISOString())}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {onlineRankings.length === 0 && (
              <div className={styles.noRecords}>オンラインの記録がありません</div>
            )}
          </motion.div>
        ) : activeTab === 'recent' ? (
          // ローカルの最近のスコア表示
          <motion.div 
            className={styles.tableContainer}
            variants={containerVariants}
            initial="hidden"
            animate={isExiting ? "exit" : "show"}
            exit="exit"
          >
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>難易度</th>
                  <th>KPM</th>
                  <th>正解率</th>
                  <th>タイム</th>
                  <th>ミス</th>
                </tr>
              </thead>
              <tbody>
                {rankingData
                  .filter(record => activeDifficulty === 'all' || record.difficulty === activeDifficulty)
                  .slice(0, 10)
                  .map((record, index) => (
                    <motion.tr key={index} variants={itemVariants}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.difficulty === 'easy' ? 'やさしい' : record.difficulty === 'normal' ? '普通' : 'むずかしい'}</td>
                      <td>{record.kpm.toFixed(1)}</td>
                      <td>{record.accuracy.toFixed(1)}%</td>
                      <td>{Math.floor(record.time / 60)}:{String(record.time % 60).padStart(2, '0')}</td>
                      <td>{record.mistakes}</td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
            {rankingData
              .filter(record => activeDifficulty === 'all' || record.difficulty === activeDifficulty)
              .length === 0 && (
              <div className={styles.noRecords}>ローカルの記録がありません</div>
            )}
          </motion.div>
        ) : (
          // ローカルのトップスコア表示
          <motion.div 
            className={styles.tableContainer}
            variants={containerVariants}
            initial="hidden"
            animate={isExiting ? "exit" : "show"}
            exit="exit"
          >
            <table className={styles.rankingTable}>
              <thead>
                <tr>
                  <th>ランク</th>
                  <th>KPM</th>
                  <th>正解率</th>
                  <th>タイム</th>
                  <th>ミス</th>
                  <th>日付</th>
                </tr>
              </thead>
              <tbody>
                {getKpmSortedData().map((record, index) => (
                  <motion.tr key={index} variants={itemVariants}>
                    <td>{index + 1}</td>
                    <td>{record.kpm.toFixed(1)}</td>
                    <td>{record.accuracy.toFixed(1)}%</td>
                    <td>{Math.floor(record.time / 60)}:{String(record.time % 60).padStart(2, '0')}</td>
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
              damping: 30
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
                <div className={`${styles.statusMessage} ${registrationStatus.success ? styles.successMessage : styles.errorMessage}`}>
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
                    <span>{settings.difficulty === 'easy' ? 'やさしい' : settings.difficulty === 'normal' ? '普通' : 'むずかしい'}</span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>KPM:</span> 
                    <span>{gameState.problemKPMs && gameState.problemKPMs.length > 0 
                      ? Math.floor(gameState.problemKPMs.filter(kpm => kpm > 0).reduce((sum, kpm) => sum + kpm, 0) / 
                          gameState.problemKPMs.filter(kpm => kpm > 0).length)
                      : 0}</span>
                  </div>
                  <div className={styles.previewItem}>
                    <span>正解率:</span> 
                    <span>{gameState.correctKeyCount && (gameState.mistakes || gameState.mistakes === 0)
                      ? ((gameState.correctKeyCount / (gameState.correctKeyCount + gameState.mistakes)) * 100).toFixed(1)
                      : 0}%</span>
                  </div>
                </div>
              )}
              
              <div className={styles.modalActions}>
                <button
                  className={styles.registerActionButton}
                  onClick={handleRegisterScore}
                  disabled={isLoading || !playerName.trim() || registrationStatus.success}
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
              damping: 30
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
              <button
                className={styles.cancelButton}
                onClick={closeDebug}
              >
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