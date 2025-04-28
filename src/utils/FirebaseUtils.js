/**
 * Firebase関連のユーティリティ
 */
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get, query, orderByChild, limitToLast } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebaseの設定
const firebaseConfig = {
  apiKey: "AIzaSyBB6UAYtMbTbf2pMlIAmz79MXPzLYx6ohg",
  authDomain: "manaby-typing.firebaseapp.com",
  databaseURL: "https://manaby-typing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "manaby-typing",
  storageBucket: "manaby-typing.firebasestorage.app",
  messagingSenderId: "58110409261",
  appId: "1:58110409261:web:1f23739378545fab9196a4",
  measurementId: "G-FSD7ECC1B0"
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
 * オンラインランキングにスコアを登録する
 * @param {string} playerName - プレイヤー名
 * @param {number} kpm - 1分あたりのキー入力数
 * @param {number} accuracy - 正解率（パーセント）
 * @param {number} time - プレイ時間（秒）
 * @param {number} mistakes - ミス入力数
 * @param {string} difficulty - 難易度
 * @returns {Promise<string|null>} - 成功時はレコードIDを返す
 */
export const saveOnlineRanking = async (playerName, kpm, accuracy, time, mistakes, difficulty) => {
  if (!initializeFirebase() || !database) {
    console.error('Firebase not initialized');
    return null;
  }
  
  try {
    // パスをscoresに変更
    const rankingRef = ref(database, 'scores');
    const newRankingRef = push(rankingRef);
    
    // KPM値または0
    const kpmValue = parseFloat(kpm) || 0;
    // 正解率の値（パーセント）
    const accuracyValue = parseFloat(accuracy) || 0;
    
    console.log(`保存する正解率: ${accuracyValue}%`);
    
    // 既存の形式に合わせたタイムスタンプ（ISO文字列形式）
    const timestampStr = new Date().toISOString();
    
    // 既存データと互換性を持たせるためのデータ構造
    const rankingData = {
      // 既存データと互換性を持たせるフィールド
      gameMode: difficulty, // 難易度をgameModeに設定（互換性のため）
      score: kpmValue, // スコアとしてKPM値を使用
      stats: {
        keystrokes: time ? Math.floor(kpmValue * time / 60) : 0,
        wpm: Math.floor(kpmValue / 5), // 一般的に1単語=5キー入力として計算
        accuracy: accuracyValue, // 正解率もstatsに保存
        mistakes: mistakes || 0
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
      timestamp_num: Date.now() // 数値形式のタイムスタンプも保存
    };
    
    await set(newRankingRef, rankingData);
    console.log(`Online ranking saved with accuracy: ${accuracyValue}%`);
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
    // 特定の難易度のランキングを取得し、KPMで降順ソート
    const rankingRef = ref(database, 'scores');
    const rankingQuery = query(
      rankingRef,
      orderByChild('score'),
      limitToLast(100) // より多くのデータを取得して後でフィルタリング
    );
    
    const snapshot = await get(rankingQuery);
    console.log(`Firebase data retrieved for difficulty ${difficulty}:`, snapshot.exists());
    
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
        ...record
      });
    });
    
    // 難易度でフィルタリングする（既存データと新データの両方に対応）
    const filteredRankings = allRankings.filter(record => {
      // 難易度が直接定義されているか、または gameMode が難易度として扱われるケース
      return (
        (record.difficulty && record.difficulty === difficulty) || 
        (record.gameMode === difficulty) ||
        // どの難易度フィールドも存在しない場合はデフォルトでnormalとみなす
        (!record.difficulty && !record.gameMode && difficulty === 'normal')
      );
    });
    
    console.log(`Retrieved ${allRankings.length} total records, filtered to ${filteredRankings.length} records for difficulty: ${difficulty}`);
    
    // KPMまたはscoreの降順でソート
    return filteredRankings
      .sort((a, b) => {
        // KPMかscoreのいずれかで比較（KPMを優先）
        const scoreA = a.kpm !== undefined ? a.kpm : a.score;
        const scoreB = b.kpm !== undefined ? b.kpm : b.score;
        return scoreB - scoreA;
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
    // タイムスタンプで降順ソートされた最新のランキングを取得
    const rankingRef = ref(database, 'scores');
    const rankingQuery = query(
      rankingRef,
      orderByChild('timestamp'),
      limitToLast(50) // より多くのデータを取得して後でフィルタリング
    );
    
    const snapshot = await get(rankingQuery);
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
        ...childSnapshot.val()
      });
    });
    
    console.log(`Retrieved ${allRankings.length} recent records`);
    
    // 難易度でフィルタリング（指定がある場合のみ）
    const filteredRankings = difficulty 
      ? allRankings.filter(record => {
          return (
            (record.difficulty && record.difficulty === difficulty) || 
            (record.gameMode === difficulty) ||
            (!record.difficulty && !record.gameMode && difficulty === 'normal')
          );
        })
      : allRankings;
    
    console.log(`Filtered to ${filteredRankings.length} records for difficulty: ${difficulty || 'all'}`);
    
    // 日付の降順でソート（最新順）
    // タイムスタンプが数値か文字列かによって適切に比較
    return filteredRankings.sort((a, b) => {
      const timeA = a.timestamp_num || new Date(a.timestamp).getTime();
      const timeB = b.timestamp_num || new Date(b.timestamp).getTime();
      return timeB - timeA;
    }).slice(0, limit);
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
    snapshot.forEach(childSnapshot => {
      allData.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    console.log(`DEBUG: Found ${allData.length} total records in database`);
    console.log('DEBUG: Sample record:', allData.length > 0 ? allData[0] : 'No records');
    
    return allData;
  } catch (error) {
    console.error('DEBUG: Error checking database:', error);
    return [];
  }
};

export default {
  initializeFirebase,
  saveOnlineRanking,
  getTopRankings,
  getRecentRankings,
  debugCheckAllRankings
};