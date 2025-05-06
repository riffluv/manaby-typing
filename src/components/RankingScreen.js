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
import { useRouter } from 'next/navigation';
import Button from './common/Button'; // 共通ボタンコンポーネントをインポート

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
  const navigate = useRouter();
  const { goToScreen } = usePageTransition();
  const { gameState } = useGameContext(); // GameContextからゲーム状態を取得

  // 画面遷移とアニメーション状態を管理 - 初期化をfalseに明示的に設定
  const [isExiting, setIsExiting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // このスコアが既に登録されたかどうかを追跡する状態
  const [isScoreRegistered, setIsScoreRegistered] = useState(false);

  // デフォルトの難易度設定
  const defaultSettings = { difficulty: 'normal' };
  const [settings, setSettings] = useState(defaultSettings);
  const [activeDifficulty, setActiveDifficulty] = useState('normal');

  // デバッグログ - ゲーム状態の確認
  useEffect(() => {
    console.log('RankingScreen: 受け取ったゲーム状態データ:', gameState);
  }, [gameState]);

  // ランキングデータとハイスコアの状態
  const [rankingData, setRankingData] = useState([]);
  const [highScores, setHighScores] = useState({});

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

    // 現在のゲームデータが既に登録されているか確認
    checkIfGameIsRegistered();
  }, []);

  // ゲームデータが既に登録されているかを確認
  const checkIfGameIsRegistered = () => {
    if (!gameState) return;

    try {
      // セッションストレージからこれまでに登録したゲームのIDを取得
      const registeredGames = JSON.parse(sessionStorage.getItem('registeredGames') || '[]');

      // 現在のゲームデータに基づいて一意のIDを生成
      // 一貫性のある計算方法でKPMを取得
      let kpmValue = 0;

      // 統一された計算方法を使う：まずはstats.kpmを優先
      if (gameState.stats && gameState.stats.kpm !== undefined) {
        kpmValue = Math.floor(gameState.stats.kpm);
      }
      // 次に問題ごとのデータから計算する方法
      else if (gameState.stats && gameState.stats.problemStats && gameState.stats.problemStats.length > 0) {
        kpmValue = Math.floor(TypingUtils.calculateAverageKPM(gameState.stats.problemStats));
      }
      // 過去の形式（problemKPMs）をサポート
      else if (gameState.problemKPMs && gameState.problemKPMs.length > 0) {
        const validKPMs = gameState.problemKPMs.filter(kpm => kpm > 0);
        if (validKPMs.length > 0) {
          kpmValue = Math.floor(validKPMs.reduce((sum, kpm) => sum + kpm, 0) / validKPMs.length);
        }
      }

      const accuracyValue = gameState.stats?.accuracy ||
        gameState.accuracy ||
        (gameState.correctKeyCount && (gameState.mistakes || gameState.mistakes === 0)
          ? (gameState.correctKeyCount / (gameState.correctKeyCount + gameState.mistakes)) * 100
          : 0);

      const missCount = gameState.stats?.missCount || gameState.mistakes || 0;
      const playTime = gameState.stats?.elapsedTimeMs || gameState.playTime || 0;

      // 生成したゲームIDのフォーマットは登録処理と同じにする
      const currentGameId = `${kpmValue}-${accuracyValue.toFixed(1)}-${missCount}-${playTime}`;

      // 同じIDのゲームが既に登録されているかチェック
      if (registeredGames.includes(currentGameId)) {
        setIsScoreRegistered(true);
        console.log('このスコアは既に登録済みです');
      }
    } catch (e) {
      console.error('登録済みゲーム確認エラー:', e);
    }
  };

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
    console.log('戻るボタンがクリックされました');

    // すでに遷移中の場合は処理をスキップ
    if (isExiting || isTransitioning) return;

    // ボタン音を即座に再生
    soundSystem.playSound('Button');

    // 遷移中のフラグを設定（重複クリック防止）
    setIsExiting(true);
    setIsTransitioning(true);

    // タイムアウトを設定して画面遷移を実行
    setTimeout(() => {
      // 遷移前にフラグをリセット
      setIsExiting(false);
      setIsTransitioning(false);
      goToScreen(previousScreen || SCREENS.MAIN_MENU, { playSound: false });
    }, 300);
  };

  // メインメニューボタンのクリック処理
  const handleMainMenu = () => {
    console.log('メインメニューボタンがクリックされました');

    // すでに遷移中の場合は処理をスキップ
    if (isExiting || isTransitioning) return;

    // ボタン音を即座に再生
    soundSystem.playSound('Button');

    // 遷移中のフラグを設定（重複クリック防止）
    setIsExiting(true);
    setIsTransitioning(true);

    // タイムアウトを設定して画面遷移を実行
    setTimeout(() => {
      // 遷移前にフラグをリセット
      setIsExiting(false);
      setIsTransitioning(false);
      goToScreen(SCREENS.MAIN_MENU, { playSound: false });
    }, 300);
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
    // gameStateがnullかstatsプロパティを確認
    if (!gameState) {
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

      // KPMを一貫性のある方法で計算（他のコンポーネントと同じ計算ロジック）
      let kpmValue = 0;

      // 統一された計算方法を使う：
      // 1. stats.kpmが存在する場合はそれを使用（最も信頼性が高い）
      if (gameState.stats && gameState.stats.kpm !== undefined) {
        kpmValue = Math.floor(gameState.stats.kpm);
      }
      // 2. 問題ごとのデータから計算（これも信頼性が高い）
      else if (gameState.stats && gameState.stats.problemStats && gameState.stats.problemStats.length > 0) {
        kpmValue = Math.floor(TypingUtils.calculateAverageKPM(gameState.stats.problemStats));
      }
      // 3. 過去の形式（problemKPMs）をサポート
      else if (gameState.problemKPMs && gameState.problemKPMs.length > 0) {
        const validKPMs = gameState.problemKPMs.filter(kpm => kpm > 0);
        if (validKPMs.length > 0) {
          kpmValue = Math.floor(validKPMs.reduce((sum, kpm) => sum + kpm, 0) / validKPMs.length);
        }
      }
      // 4. 直接計算（最も原始的な方法）
      else if (gameState.startTime && gameState.endTime && gameState.correctKeyCount) {
        const elapsedMs = gameState.endTime - gameState.startTime;
        const minutes = elapsedMs / 60000;
        kpmValue = Math.floor(gameState.correctKeyCount / minutes);
      }

      // KPMが0以下の場合で、入力カウントがある場合は最低値1を設定
      const correctCount = gameState.correctKeyCount || (gameState.stats && gameState.stats.correctCount) || 0;
      if (kpmValue <= 0 && correctCount > 0) {
        kpmValue = 1;
      }

      // KPMからランクを計算
      const rankValue = TypingUtils.getRank(kpmValue);

      // 正解率を計算（統一した方法で）
      let accuracyValue = 0;

      // 1. stats.accuracyが存在する場合
      if (gameState.stats && typeof gameState.stats.accuracy === 'number') {
        accuracyValue = gameState.stats.accuracy;
      }
      // 2. 直接accuracyプロパティがある場合
      else if (typeof gameState.accuracy === 'number' && !isNaN(gameState.accuracy)) {
        accuracyValue = gameState.accuracy;
      }
      // 3. 正解数とミス数から計算
      else if ((gameState.correctKeyCount >= 0 || (gameState.stats && gameState.stats.correctCount >= 0)) &&
        (gameState.mistakes >= 0 || gameState.mistakes === 0 ||
          (gameState.stats && (gameState.stats.missCount >= 0 || gameState.stats.missCount === 0)))) {
        const correctCount = gameState.correctKeyCount || (gameState.stats && gameState.stats.correctCount) || 0;
        const missCount = gameState.mistakes || (gameState.stats && gameState.stats.missCount) || 0;
        const totalKeystrokes = correctCount + missCount;

        if (totalKeystrokes > 0) {
          accuracyValue = (correctCount / totalKeystrokes) * 100;
        }
      }

      console.log('送信する統計データ:', {
        kpm: kpmValue,
        accuracy: accuracyValue,
        rank: rankValue
      });

      // オンラインランキングに保存
      // 変数が既に宣言されているので、新しい変数名を使用
      const finalCorrectCount = gameState.correctKeyCount || (gameState.stats && gameState.stats.correctCount) || 0;
      const finalMissCount = gameState.mistakes || (gameState.stats && gameState.stats.missCount) || 0;
      const finalPlayTime = gameState.playTime || (gameState.stats && gameState.stats.elapsedTimeMs) || 0;

      const recordId = await saveOnlineRanking(
        playerName,
        kpmValue,
        accuracyValue,
        finalPlayTime,
        finalMissCount,
        settings.difficulty || 'normal',
        rankValue // ランク情報を追加
      );

      if (recordId) {
        setRegistrationStatus({
          success: true,
          message: 'ランキングに登録しました！',
        });

        // スコア登録済みフラグを設定
        setIsScoreRegistered(true);

        // セッションストレージに登録済みフラグを保存
        // これにより画面再読み込みでも登録できなくなる
        try {
          // ゲームのユニーク識別子を生成（KPM + 正解率 + ミス数 + 時間）
          const gameId = `${kpmValue}-${accuracyValue.toFixed(1)}-${missCount}-${playTime}`;
          const registeredGames = JSON.parse(sessionStorage.getItem('registeredGames') || '[]');
          registeredGames.push(gameId);
          sessionStorage.setItem('registeredGames', JSON.stringify(registeredGames));
        } catch (e) {
          console.error('登録済みゲームの保存に失敗:', e);
        }

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

  // コンポーネントのマウント/アンマウント時に実行
  useEffect(() => {
    // コンポーネントがマウントされた時、状態をリセット
    setIsExiting(false);
    setIsTransitioning(false);

    // クリーンアップ関数
    return () => {
      // コンポーネントがアンマウントされる時にもリセット
      setIsExiting(false);
      setIsTransitioning(false);
    };
  }, []); // 依存配列を空にして、マウント時とアンマウント時のみ実行

  return (
    <div className={styles.rankingContainer}>
      <motion.div
        className={styles.rankingHeader}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, duration: 0.8 }}
      >
        <h1 className={`screen-title ${styles.rankingTitle}`}>RANKING</h1>
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
        <Button
          variant={!isOnlineMode ? 'primary' : 'default'}
          active={!isOnlineMode}
          onClick={() => {
            if (isOnlineMode) toggleOnlineMode();
          }}
          size="small"
        >
          ローカル
        </Button>
        <Button
          variant={isOnlineMode ? 'primary' : 'default'}
          active={isOnlineMode}
          onClick={() => {
            if (!isOnlineMode) toggleOnlineMode();
          }}
          size="small"
        >
          オンライン
        </Button>
      </div>

      <div className={styles.difficultyNav}>
        <Button
          className="button--difficulty"
          active={activeDifficulty === 'easy'}
          variant={activeDifficulty === 'easy' ? 'primary' : 'default'}
          onClick={() => handleDifficultyChange('easy')}
        >
          やさしい
        </Button>
        <Button
          className="button--difficulty"
          active={activeDifficulty === 'normal'}
          variant={activeDifficulty === 'normal' ? 'primary' : 'default'}
          onClick={() => handleDifficultyChange('normal')}
        >
          普通
        </Button>
        <Button
          className="button--difficulty"
          active={activeDifficulty === 'hard'}
          variant={activeDifficulty === 'hard' ? 'primary' : 'default'}
          onClick={() => handleDifficultyChange('hard')}
        >
          むずかしい
        </Button>
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
                          record.rank || TypingUtils.getRank(record.kpm)
                        ),
                      }}
                    >
                      {record.rank || TypingUtils.getRank(record.kpm)}
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
                          record.rank || TypingUtils.getRank(record.kpm)
                        ),
                      }}
                    >
                      {record.rank || TypingUtils.getRank(record.kpm)}
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
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            variant="primary"
            size="medium"
            onClick={handleShowRegisterModal}
            disabled={!gameState || (!gameState.correctKeyCount && !gameState.stats) || isScoreRegistered}
          >
            {isScoreRegistered ? 'すでに登録済み' : 'ランキング登録'}
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            variant="default"
            size="medium"
            onClick={handleBack}
          >
            戻る
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            variant="default"
            size="medium"
            onClick={handleMainMenu}
          >
            メインメニュー
          </Button>
        </motion.div>

        {/* デバッグボタン - 開発用 */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            variant="default"
            size="medium"
            onClick={handleDebugFirebase}
            disabled={isLoading}
          >
            接続確認
          </Button>
        </motion.div>
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
              <Button
                variant="default"
                size="small"
                onClick={handleCloseModal}
                className={styles.closeButton}
              >
                ✕
              </Button>
            </div>
            <div className={styles.modalBody}>
              <p>名前を入力してオンラインランキングに登録しましょう！</p>

              {registrationStatus.message && (
                <div
                  className={`${styles.statusMessage} ${registrationStatus.success
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
                      {gameState.stats && typeof gameState.stats.kpm === 'number'
                        ? Math.floor(gameState.stats.kpm)
                        : gameState.problemKPMs && gameState.problemKPMs.length > 0
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
                          TypingUtils.getRank(
                            gameState.stats && typeof gameState.stats.kpm === 'number'
                              ? Math.floor(gameState.stats.kpm)
                              : gameState.problemKPMs &&
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
                      {TypingUtils.getRank(
                        gameState.stats && typeof gameState.stats.kpm === 'number'
                          ? Math.floor(gameState.stats.kpm)
                          : gameState.problemKPMs &&
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
                      {gameState.stats && typeof gameState.stats.accuracy === 'number'
                        ? gameState.stats.accuracy.toFixed(1)
                        : gameState.accuracy
                          ? gameState.accuracy.toFixed(1)
                          : gameState.correctKeyCount &&
                            (gameState.mistakes || gameState.mistakes === 0)
                            ? (
                              (gameState.correctKeyCount /
                                (gameState.correctKeyCount + gameState.mistakes)) *
                              100
                            ).toFixed(1)
                            : 0}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                variant="primary"
                size="medium"
                onClick={handleRegisterScore}
                loading={isLoading}
                disabled={isLoading}
                className={styles.registerButton}
              >
                登録
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* デバッグモーダル */}
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
              <h2 className={styles.modalTitle}>デバッグ情報</h2>
              <Button
                variant="default"
                size="small"
                onClick={closeDebug}
                className={styles.closeButton}
              >
                ✕
              </Button>
            </div>
            <div className={styles.modalBody}>
              <pre className={styles.debugInfo}>
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>

            <div className={styles.modalFooter}>
              <Button
                variant="primary"
                size="medium"
                onClick={closeDebug}
                className={styles.closeButton}
              >
                閉じる
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RankingScreen;
