/**
 * Firebase関連のユーティリティ
 */
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  push,
  get,
  query,
  orderByChild,
  limitToLast,
  equalTo,
  child,
} from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import TypingUtils from './TypingUtils'; // KPMランク計算のために追加

// Firebaseの設定
const firebaseConfig = {
  apiKey: 'AIzaSyBB6UAYtMbTbf2pMlIAmz79MXPzLYx6ohg',
  authDomain: 'manaby-typing.firebaseapp.com',
  databaseURL:
    'https://manaby-typing-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'manaby-typing',
  storageBucket: 'manaby-typing.firebasestorage.app',
  messagingSenderId: '58110409261',
  appId: '1:58110409261:web:1f23739378545fab9196a4',
  measurementId: 'G-FSD7ECC1B0',
};

// Firebase初期化（サーバーサイドレンダリング対応）
let app = null;
let database = null;
let analytics = null;

/**
 * Firebaseを初期化する
 */
export const initializeFirebase = () => {
  if (typeof window !== 'undefined' && !app) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);

      // analyticはクライアントサイドでのみ使用可能
      analytics = getAnalytics(app);

      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return false;
    }
  }
  return !!app;
};

/**
 * オンラインランキングにスコアを保存する
 * @param {string} playerName - プレイヤー名
 * @param {number} kpm - KPM値
 * @param {number} accuracy - 正解率
 * @param {number} time - プレイ時間（秒）
 * @param {number} mistakes - ミス入力回数
 * @param {string} difficulty - 難易度
 * @param {string} rank - KPMに基づくランク (GOD, DIVINE, ...)
 * @returns {Promise<string|null>} 保存に成功した場合は記録のID、失敗した場合はnull
 */
export const saveOnlineRanking = async (
  playerName,
  kpm,
  accuracy,
  time,
  mistakes,
  difficulty,
  rank
) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return null;
  }

  try {
    // 小数点以下を適切に処理
    const kpmValue = Math.floor(kpm);
    const accuracyValue = parseFloat(accuracy.toFixed(1));
    const timestampStr = new Date().toISOString();

    // KPMからランクを計算（渡されていない場合）
    const rankValue =
      rank ||
      (typeof TypingUtils !== 'undefined'
        ? TypingUtils.getKPMRank(kpmValue)
        : '');

    // インデックスエラーを回避するため、全データを一度に取得
    const rankingRef = ref(database, 'scores');
    const snapshot = await get(rankingRef);

    // 既存エントリー検索（クライアント側でフィルタリング）
    let existingEntryId = null;
    let existingData = null;

    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        // 同じプレイヤー名と難易度の組み合わせを検索
        if (data.playerName === playerName && data.difficulty === difficulty) {
          existingEntryId = childSnapshot.key;
          existingData = data;
        }
      });
    }

    let newRankingRef;

    // 既存エントリーがある場合は更新、なければ新規作成
    if (existingEntryId && kpmValue > 0) {
      newRankingRef = child(rankingRef, existingEntryId);

      // スコアが以前より良い場合のみ更新（KPMを優先）
      if (
        existingData &&
        (kpmValue > existingData.kpm ||
          (kpmValue === existingData.kpm &&
            accuracyValue > existingData.accuracy))
      ) {
        console.log('既存のエントリーを更新します:', existingEntryId);
      } else {
        console.log('既存のエントリーの方が良いスコアなので更新しません');
        return existingEntryId; // 既存のIDを返す
      }
    } else {
      // 新しいエントリーを作成
      newRankingRef = push(rankingRef);
    }

    // 保存するデータ
    const rankingData = {
      score: kpmValue, // 下位互換性のため
      stats: {
        kpm: kpmValue,
        accuracy: accuracyValue, // 正解率もstatsに保存
        mistakes: mistakes || 0,
      },
      timestamp: timestampStr,
      username: playerName || 'Anonymous',

      // 新しいデータ形式のフィールド（拡張）
      playerName: playerName || 'Anonymous', // 互換性のため両方保存
      kpm: kpmValue,
      accuracy: accuracyValue, // 正解率をトップレベルにも保存
      time: time || 0,
      mistakes: mistakes || 0,
      difficulty: difficulty || 'normal',
      date: timestampStr,
      timestamp_num: Date.now(), // 数値形式のタイムスタンプも保存
      rank: rankValue, // ランク情報を保存
    };

    await set(newRankingRef, rankingData);
    console.log(
      `オンラインランキングを保存しました - KPM: ${kpmValue}, ランク: ${rankValue}, 正解率: ${accuracyValue}%`
    );
    return newRankingRef.key;
  } catch (error) {
    console.error('Error saving online ranking:', error);
    return null;
  }
};

/**
 * 難易度別のトップランキングを取得する
 * @param {string} difficulty - 難易度 ('easy', 'normal', 'hard')
 * @param {number} limit - 取得する件数
 * @returns {Promise<Array>} ランキングデータの配列
 */
export const getTopRankings = async (difficulty = 'normal', limit = 10) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    // インデックスエラーを回避するため、ルートから全データを取得
    const rankingRef = ref(database, 'scores');

    // データ取得
    const snapshot = await get(rankingRef);
    console.log(
      `Firebase data retrieved for difficulty ${difficulty}:`,
      snapshot.exists()
    );

    if (!snapshot.exists()) {
      console.log('No data available in Firebase');
      return [];
    }

    // スナップショットをオブジェクトから配列に変換
    const allRankings = [];
    snapshot.forEach((childSnapshot) => {
      const record = childSnapshot.val();
      allRankings.push({
        id: childSnapshot.key,
        ...record,
      });
    });

    // 難易度でフィルタリングする（既存データと新データの両方に対応）
    const filteredRankings = allRankings.filter((record) => {
      // 難易度が直接定義されているか、または gameMode が難易度として扱われるケース
      return (
        (record.difficulty && record.difficulty === difficulty) ||
        record.gameMode === difficulty ||
        // どの難易度フィールドも存在しない場合はデフォルトでnormalとみなす
        (!record.difficulty && !record.gameMode && difficulty === 'normal')
      );
    });

    console.log(
      `Retrieved ${allRankings.length} total records, filtered to ${filteredRankings.length} records for difficulty: ${difficulty}`
    );

    // プレイヤー名でグループ化して、各プレイヤーの最高スコアのみを残す
    const playerBestScores = {};
    filteredRankings.forEach((record) => {
      const playerName = record.playerName || record.username || 'Anonymous';
      const kpm = record.kpm !== undefined ? record.kpm : record.score || 0;
      const accuracy =
        record.accuracy !== undefined
          ? record.accuracy
          : record.stats?.accuracy !== undefined
          ? record.stats.accuracy
          : 0;

      // 既存のスコアがなければ追加、あれば比較して高いほうを保持
      if (
        !playerBestScores[playerName] ||
        kpm > playerBestScores[playerName].kpm ||
        (kpm === playerBestScores[playerName].kpm &&
          accuracy > playerBestScores[playerName].accuracy)
      ) {
        playerBestScores[playerName] = record;
      }
    });

    // オブジェクトを配列に戻す
    const uniqueRankings = Object.values(playerBestScores);

    // KPMまたはscoreの降順でソート、同点の場合は正解率で比較
    return uniqueRankings
      .sort((a, b) => {
        // KPMかscoreのいずれかで比較（KPMを優先）
        const scoreA = a.kpm !== undefined ? a.kpm : a.score || 0;
        const scoreB = b.kpm !== undefined ? b.kpm : b.score || 0;

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        } else {
          // KPMが同じなら正解率で判定
          const accuracyA =
            a.accuracy !== undefined
              ? a.accuracy
              : a.stats?.accuracy !== undefined
              ? a.stats.accuracy
              : 0;
          const accuracyB =
            b.accuracy !== undefined
              ? b.accuracy
              : b.stats?.accuracy !== undefined
              ? b.stats.accuracy
              : 0;
          return accuracyB - accuracyA;
        }
      })
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return [];
  }
};

/**
 * 最新のランキングを取得する
 * @param {number} limit - 取得する件数
 * @param {string} difficulty - 難易度（フィルタリング用、nullの場合はフィルタリングしない）
 * @returns {Promise<Array>} ランキングデータの配列
 */
export const getRecentRankings = async (limit = 10, difficulty = null) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    // インデックスエラーを回避するため、ルートから全データを取得
    const rankingRef = ref(database, 'scores');

    // インデックスのないクエリではなく全データ取得に変更
    const snapshot = await get(rankingRef);
    console.log('Recent Firebase data retrieved:', snapshot.exists());

    if (!snapshot.exists()) {
      console.log('No recent data available in Firebase');
      return [];
    }

    // スナップショットをオブジェクトから配列に変換
    const allRankings = [];
    snapshot.forEach((childSnapshot) => {
      allRankings.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });

    console.log(`Retrieved ${allRankings.length} recent records`);

    // 難易度でフィルタリング（指定がある場合のみ）
    const filteredRankings = difficulty
      ? allRankings.filter((record) => {
          return (
            (record.difficulty && record.difficulty === difficulty) ||
            record.gameMode === difficulty ||
            (!record.difficulty && !record.gameMode && difficulty === 'normal')
          );
        })
      : allRankings;

    console.log(
      `Filtered to ${filteredRankings.length} records for difficulty: ${
        difficulty || 'all'
      }`
    );

    // 各プレイヤーの最新のスコアだけを保持（重複登録防止のため）
    const playerLatestScores = {};
    filteredRankings.forEach((record) => {
      const playerName = record.playerName || record.username || 'Anonymous';
      // timestamp_numまたはtimestampから日付を取得
      const timestamp =
        record.timestamp_num ||
        (record.timestamp
          ? new Date(record.timestamp).getTime()
          : record.date
          ? new Date(record.date).getTime()
          : 0);

      // そのプレイヤーの記録がまだないか、もしくはより新しい記録なら更新
      if (
        !playerLatestScores[playerName] ||
        timestamp > playerLatestScores[playerName].timestamp
      ) {
        // タイムスタンプを数値として保存して比較を容易にする
        playerLatestScores[playerName] = {
          ...record,
          timestamp: timestamp,
        };
      }
    });

    // オブジェクトを配列に戻す
    const uniqueRecentRankings = Object.values(playerLatestScores);

    // 日付の降順でソート（最新順）
    return uniqueRecentRankings
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent rankings:', error);
    return [];
  }
};

/**
 * データベースに保存されているすべてのランキングデータを確認する（デバッグ用）
 * @returns {Promise<Array>} すべてのランキングデータ
 */
export const debugCheckAllRankings = async () => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    // ルートからすべてのデータを取得
    const rankingRef = ref(database, 'scores');
    const snapshot = await get(rankingRef);

    console.log('DEBUG: Firebase connection test result:', snapshot.exists());

    if (!snapshot.exists()) {
      console.log('DEBUG: No data available in scores node');
      return [];
    }

    // すべてのデータを取得して表示
    const allData = [];
    snapshot.forEach((childSnapshot) => {
      allData.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      });
    });

    console.log(`DEBUG: Found ${allData.length} total records in database`);
    console.log(
      'DEBUG: Sample record:',
      allData.length > 0 ? allData[0] : 'No records'
    );

    return allData;
  } catch (error) {
    console.error('DEBUG: Error checking database:', error);
    return [];
  }
};

/**
 * バックグラウンド（背景）画像とスタイル情報をFirebaseに保存する
 * @param {string} playerName - 保存するユーザー名
 * @param {string} imageData - Base64形式の画像データ
 * @param {string} title - 背景のタイトル（任意）
 * @param {Object} metadata - 追加情報（テーマなど）
 * @param {Object} styleInfo - 背景に関するCSSスタイル情報
 * @returns {Promise<string|null>} 保存に成功した場合はデータのID、失敗した場合はnull
 */
export const saveBackgroundToFirebase = async (
  playerName, 
  imageData, 
  title = '', 
  metadata = {},
  styleInfo = null
) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return null;
  }

  try {
    // 保存先参照の作成
    const backgroundsRef = ref(database, 'backgrounds');
    const newBackgroundRef = push(backgroundsRef);
    
    // 現在の日時
    const timestamp = new Date().toISOString();
    const timestampNum = Date.now();

    // スタイル情報がない場合は自動的に現在のスタイルを抽出
    let cssStyleInfo = styleInfo;
    if (!cssStyleInfo && typeof window !== 'undefined') {
      try {
        const mainContainer = document.querySelector('#__next > div');
        if (mainContainer) {
          // コンピュテッドスタイルからCSSプロパティを抽出
          const computedStyle = window.getComputedStyle(mainContainer);
          cssStyleInfo = {
            backgroundColor: computedStyle.backgroundColor,
            borderColor: computedStyle.borderColor,
            borderWidth: computedStyle.borderWidth,
            borderStyle: computedStyle.borderStyle,
            boxShadow: computedStyle.boxShadow,
            backgroundImage: '', // 画像は別途保存されるので空にする
          };
        }
      } catch (styleError) {
        console.error('背景スタイル情報の取得に失敗しました:', styleError);
      }
    }
    
    // 保存データの構造
    const backgroundData = {
      playerName: playerName || 'Anonymous',
      title: title || `${playerName || 'Anonymous'}が保存した背景`,
      imageData: imageData,
      cssStyleInfo: cssStyleInfo, // CSSスタイル情報を追加
      metadata: {
        ...metadata,
        createdAt: timestamp,
      },
      timestamp: timestamp,
      timestamp_num: timestampNum,
    };
    
    // Firebase Realtime Databaseに保存
    await set(newBackgroundRef, backgroundData);
    console.log(`背景画像とスタイル情報を保存しました - 保存者: ${playerName}, タイトル: ${title}`);
    
    return newBackgroundRef.key; // 保存されたデータのIDを返す
  } catch (error) {
    console.error('Error saving background to Firebase:', error);
    return null;
  }
};

/**
 * 保存された背景画像を取得する
 * @param {number} limit - 取得する件数
 * @returns {Promise<Array>} 背景画像データの配列
 */
export const getBackgroundsFromFirebase = async (limit = 20) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    // データ参照の作成
    const backgroundsRef = ref(database, 'backgrounds');
    
    // データの取得
    const snapshot = await get(backgroundsRef);
    
    if (!snapshot.exists()) {
      console.log('保存された背景画像データがありません');
      return [];
    }
    
    // データを配列に変換
    const backgroundData = [];
    snapshot.forEach((childSnapshot) => {
      backgroundData.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    // 新しい順にソートして返す
    return backgroundData
      .sort((a, b) => b.timestamp_num - a.timestamp_num)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching backgrounds from Firebase:', error);
    return [];
  }
};

/**
 * 指定したIDの背景画像をFirebaseから削除する
 * @param {string} backgroundId - 削除する背景のID
 * @returns {Promise<boolean>} 削除が成功したらtrue、失敗したらfalse
 */
export const deleteBackgroundFromFirebase = async (backgroundId) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return false;
  }

  try {
    // 背景データの参照を取得
    const backgroundRef = ref(database, `backgrounds/${backgroundId}`);
    
    // データを削除
    await set(backgroundRef, null);
    
    console.log(`背景画像を削除しました - ID: ${backgroundId}`);
    return true;
  } catch (error) {
    console.error('Error deleting background from Firebase:', error);
    return false;
  }
};

/**
 * 指定した画面用のバックグラウンド（背景）をFirebaseに保存する
 * @param {string} screenId - 背景を適用する画面のID (例: 'MAIN_MENU', 'GAME')
 * @param {string} playerName - 保存するユーザー名
 * @param {string} imageData - Base64形式の画像データ
 * @param {string} title - 背景のタイトル（任意）
 * @param {Object} cssStyleInfo - 背景に関するCSSスタイル情報
 * @returns {Promise<string|null>} 保存に成功した場合はデータのID、失敗した場合はnull
 */
export const saveScreenBackgroundToFirebase = async (
  screenId, 
  playerName, 
  imageData, 
  title = '', 
  cssStyleInfo = null
) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return null;
  }

  try {
    // 保存先参照の作成
    const backgroundsRef = ref(database, 'backgrounds');
    const newBackgroundRef = push(backgroundsRef);
    
    // 現在の日時
    const timestamp = new Date().toISOString();
    const timestampNum = Date.now();
    
    // スクリーンIDが渡されない場合はデフォルト値を設定
    const targetScreen = screenId || 'ALL';

    // スタイル情報がない場合は自動的に現在のスタイルを抽出
    let cssStyle = cssStyleInfo;
    if (!cssStyle && typeof window !== 'undefined') {
      try {
        const mainContainer = document.querySelector('#__next > div');
        if (mainContainer) {
          // コンピュテッドスタイルからCSSプロパティを抽出
          const computedStyle = window.getComputedStyle(mainContainer);
          cssStyle = {
            backgroundColor: computedStyle.backgroundColor,
            borderColor: computedStyle.borderColor,
            borderWidth: computedStyle.borderWidth,
            borderStyle: computedStyle.borderStyle,
            boxShadow: computedStyle.boxShadow,
            backgroundImage: '', // 画像は別途保存されるので空にする
          };
        }
      } catch (styleError) {
        console.error('背景スタイル情報の取得に失敗しました:', styleError);
      }
    }
    
    // 保存するタイトルを設定
    const displayTitle = title || `${playerName || 'Anonymous'}の${getScreenDisplayName(targetScreen)}用背景`;
    
    // 保存データの構造
    const backgroundData = {
      playerName: playerName || 'Anonymous',
      title: displayTitle,
      imageData: imageData,
      cssStyleInfo: cssStyle,
      screenId: targetScreen, // 適用する画面のID
      metadata: {
        createdAt: timestamp,
        type: 'screen-specific-background',
        targetScreen: targetScreen
      },
      timestamp: timestamp,
      timestamp_num: timestampNum,
    };
    
    // Firebase Realtime Databaseに保存
    await set(newBackgroundRef, backgroundData);
    console.log(`画面「${getScreenDisplayName(targetScreen)}」用の背景を保存しました - 保存者: ${playerName}, タイトル: ${displayTitle}`);
    
    return newBackgroundRef.key; // 保存されたデータのIDを返す
  } catch (error) {
    console.error('Error saving screen background to Firebase:', error);
    return null;
  }
};

/**
 * 画面IDから表示用の名前を取得する
 * @param {string} screenId - 画面ID
 * @returns {string} 表示用の画面名
 */
const getScreenDisplayName = (screenId) => {
  const screenNames = {
    'MAIN_MENU': 'メインメニュー',
    'GAME': 'ゲーム画面',
    'RESULT': 'リザルト画面',
    'RANKING': 'ランキング画面',
    'SETTINGS': '設定画面',
    'CREDITS': 'クレジット画面',
    'ALL': '全画面'
  };
  
  return screenNames[screenId] || screenId;
};

/**
 * 特定の画面用に保存された背景を取得する
 * @param {string} screenId - 画面ID（nullの場合はすべての背景を取得）
 * @param {number} limit - 取得する最大数
 * @returns {Promise<Array>} 背景データの配列
 */
export const getScreenBackgroundsFromFirebase = async (screenId = null, limit = 20) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return [];
  }

  try {
    // データ参照の作成
    const backgroundsRef = ref(database, 'backgrounds');
    
    // データの取得
    const snapshot = await get(backgroundsRef);
    
    if (!snapshot.exists()) {
      console.log('保存された背景画像データがありません');
      return [];
    }
    
    // データを配列に変換
    const backgroundData = [];
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      
      // screenIdが指定されている場合は、その画面用の背景または全画面用('ALL')の背景のみをフィルタリング
      if (!screenId || data.screenId === screenId || data.screenId === 'ALL' || data.metadata?.targetScreen === screenId || !data.screenId) {
        backgroundData.push({
          id: childSnapshot.key,
          ...data
        });
      }
    });
    
    // 新しい順にソートして返す
    return backgroundData
      .sort((a, b) => b.timestamp_num - a.timestamp_num)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching screen backgrounds from Firebase:', error);
    return [];
  }
};

export default {
  initializeFirebase,
  saveOnlineRanking,
  getTopRankings,
  getRecentRankings,
  debugCheckAllRankings,
  saveBackgroundToFirebase,
  getBackgroundsFromFirebase,
  deleteBackgroundFromFirebase, // 削除関数を追加
  saveScreenBackgroundToFirebase,
  getScreenBackgroundsFromFirebase,
};
