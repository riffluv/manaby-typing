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
  
  // ソート関連の状態
  const [sortConfig, setSortConfig] = useState({
    key: 'date', // デフォルトでは日付でソート
    direction: 'desc' // 降順（新しい順）
  });

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
  }, [isOnlineMode, activeDifficulty]);

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
      console.log(`Fetching online rankings - Difficulty: ${activeDifficulty}`);
      
      // 全てのランキングデータを取得（最近のデータ優先）
      rankings = await getRecentRankings(30, activeDifficulty);
      console.log(`Loaded ${rankings.length} online rankings for difficulty: ${activeDifficulty}`);
      
      // 取得後にソート
      const sortedRankings = sortData(rankings);
      
      // 順位情報を追加
      const rankingsWithPosition = sortedRankings.map((record, index) => ({
        ...record,
        position: index + 1
      }));
      
      setOnlineRankings(rankingsWithPosition);
    } catch (error) {
      console.error('オンラインランキングの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ソート処理関数
  const sortData = (data) => {
    return [...data].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'playerName':
          aValue = a.playerName || a.username || '';
          bValue = b.playerName || b.username || '';
          break;
        case 'kpm':
          aValue = a.kpm || a.score || 0;
          bValue = b.kpm || b.score || 0;
          break;
        case 'accuracy':
          aValue = a.accuracy !== undefined ? a.accuracy : (a.stats?.accuracy !== undefined ? a.stats.accuracy : 0);
          bValue = b.accuracy !== undefined ? b.accuracy : (b.stats?.accuracy !== undefined ? b.stats.accuracy : 0);
          break;
        case 'time':
          aValue = a.time || 0;
          bValue = b.time || 0;
          break;
        case 'mistakes':
          aValue = a.mistakes || a.stats?.mistakes || 0;
          bValue = b.mistakes || b.stats?.mistakes || 0;
          break;
        case 'date':
          aValue = new Date(a.date || a.timestamp || 0);
          bValue = new Date(b.date || b.timestamp || 0);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // オンラインモード切替処理
  const toggleOnlineMode = () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // UIの更新とデータ処理を遅延実行
    setTimeout(() => {
      // オンラインモード ⇔ ローカルモードの切り替え
      const newMode = !isOnlineMode;
      setIsOnlineMode(newMode);
      
      // モード変更時のログ出力
      if (newMode) {
        console.log('オンラインモードに切り替えました');
      } else {
        console.log('ローカルモードに切り替えました');
      }
    }, 10);
  };

  // 難易度切り替え処理
  const handleDifficultyChange = (difficulty) => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // 難易度変更を遅延実行
    setTimeout(() => {
      setActiveDifficulty(difficulty);
    }, 10);
  };

  // ソート切り替え処理
  const handleSort = (key) => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // ソート処理を遅延実行
    setTimeout(() => {
      setSortConfig((prevConfig) => {
        const newDirection = 
          prevConfig.key === key 
            ? prevConfig.direction === 'asc' ? 'desc' : 'asc'
            : 'desc';
        
        return { key, direction: newDirection };
      });
      
      // オンラインモードではソート状態を適用
      if (isOnlineMode) {
        setOnlineRankings(prevRankings => {
          const sortedData = sortData([...prevRankings]);
          // 順位情報を更新
          return sortedData.map((record, index) => ({
            ...record,
            position: index + 1
          }));
        });
      }
    }, 10);
  };

  // ソートされたローカルデータを取得（順位付き）
  const getSortedLocalData = () => {
    const filteredData = rankingData.filter(record => 
      activeDifficulty === 'all' || record.difficulty === activeDifficulty
    );
    
    const sortedData = [...filteredData].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'kpm':
          aValue = a.kpm || 0;
          bValue = b.kpm || 0;
          break;
        case 'accuracy':
          aValue = a.accuracy || 0;
          bValue = b.accuracy || 0;
          break;
        case 'time':
          aValue = a.time || 0;
          bValue = b.time || 0;
          break;
        case 'mistakes':
          aValue = a.mistakes || 0;
          bValue = b.mistakes || 0;
          break;
        case 'date':
          aValue = new Date(a.date || 0);
          bValue = new Date(b.date || 0);
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    }).slice(0, 15); // 上位15件を表示
    
    // 順位情報を追加
    return sortedData.map((record, index) => ({
      ...record,
      position: index + 1
    }));
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

    // 即時に音を再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // 退場中フラグを立てる
    setIsExiting(true);
    
    // 退場アニメーションの後に画面遷移（画面遷移システムでの音再生はオフに）
    setTimeout(() => {
      // リザルト画面から来た場合はリザルト画面に戻る、それ以外はメインメニューに戻る
      goToScreen(SCREENS.RESULT, { playSound: false });
    }, 300); // アニメーション時間と同期
  };

  // メインメニューボタンのクリック処理
  const handleMainMenu = () => {
    // トランジション中は操作を無効化
    if (isTransitioning || isExiting) return;

    // 即時に音を再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // 退場中フラグを立てる
    setIsExiting(true);
    
    // 退場アニメーションの後に画面遷移（画面遷移システムでの音再生はオフに）
    setTimeout(() => {
      goToScreen(SCREENS.MAIN_MENU, { playSound: false });
    }, 300); // アニメーション時間と同期
  };

  // ソートインジケーターを表示するヘルパー関数
  const renderSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    
    return (
      <span className={styles.sortIndicator}>
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // 登録モーダルを表示
  const handleShowRegisterModal = () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // UI更新は遅延実行
    setTimeout(() => {
      setShowRegisterModal(true);
      setRegistrationStatus({ success: false, message: '' });
    }, 10);
  };

  // 登録モーダルを閉じる
  const handleCloseModal = () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // UI更新は遅延実行
    setTimeout(() => {
      setShowRegisterModal(false);
    }, 10);
  };
  
  // デバッグモードを閉じる
  const closeDebug = () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
    // UI更新は遅延実行
    setTimeout(() => {
      setShowDebug(false);
    }, 10);
  };
  
  // デバッグ機能 - Firebase接続テスト
  const handleDebugFirebase = async () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);
    
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

  // プレイヤー名の変更処理
  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  // オンラインランキングに登録
  const handleRegisterScore = async () => {
    // 音声を即時再生（最優先）
    setTimeout(() => soundSystem.play('button'), 0);

    // 検証処理
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
      let accuracyValue = 0;
      if (typeof gameState.accuracy === 'number' && !isNaN(gameState.accuracy)) {
        accuracyValue = gameState.accuracy;
      } else if (gameState.correctKeyCount >= 0 && (gameState.mistakes >= 0 || gameState.mistakes === 0)) {
        const totalKeystrokes = gameState.correctKeyCount + gameState.mistakes;
        if (totalKeystrokes > 0) {
          accuracyValue = (gameState.correctKeyCount / totalKeystrokes) * 100;
        }
      }
      
      console.log("送信する正確率データ:", accuracyValue, "%");

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
        // 登録成功音を再生
        setTimeout(() => soundSystem.play('success'), 0);
        
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
      
      // エラー音を再生
      setTimeout(() => soundSystem.play('error'), 0);
      
      setRegistrationStatus({ 
        success: false, 
        message: 'ランキング登録中にエラーが発生しました。ネットワーク接続を確認してください。' 
      });
    } finally {
      setIsLoading(false);
    }
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

      {/* 難易度切り替えボタン */}
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
                  <th className={styles.rankColumn}>順位</th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('playerName')}>
                    プレイヤー {renderSortIndicator('playerName')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('kpm')}>
                    KPM {renderSortIndicator('kpm')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('accuracy')}>
                    正解率 {renderSortIndicator('accuracy')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('time')}>
                    タイム {renderSortIndicator('time')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('mistakes')}>
                    ミス {renderSortIndicator('mistakes')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('date')}>
                    日付 {renderSortIndicator('date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {onlineRankings.map((record, index) => (
                  <motion.tr key={record.id || index} variants={itemVariants}>
                    <td className={styles.rankCell}>{record.position}</td>
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
        ) : (
          // ローカルのスコア表示（タブ機能削除後）
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
                  <th className={styles.rankColumn}>順位</th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('date')}>
                    日付 {renderSortIndicator('date')}
                  </th>
                  <th>難易度</th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('kpm')}>
                    KPM {renderSortIndicator('kpm')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('accuracy')}>
                    正解率 {renderSortIndicator('accuracy')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('time')}>
                    タイム {renderSortIndicator('time')}
                  </th>
                  <th className={styles.sortableHeader} onClick={() => handleSort('mistakes')}>
                    ミス {renderSortIndicator('mistakes')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedLocalData().map((record, index) => (
                  <motion.tr key={index} variants={itemVariants}>
                    <td className={styles.rankCell}>{record.position}</td>
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
            {getSortedLocalData().length === 0 && (
              <div className={styles.noRecords}>ローカルの記録がありません</div>
            )}
          </motion.div>
        )}
      </div>

      {/* ボタン類 */}
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