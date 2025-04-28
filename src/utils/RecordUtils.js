/**
 * タイピングゲームの記録管理ユーティリティ
 */

/**
 * 新しいゲーム記録を保存する
 * @param {number} kpm - 1分あたりのタイピング数 (Keys Per Minute)
 * @param {number} accuracy - 正解率（パーセント）
 * @param {number} time - プレイ時間（秒）
 * @param {number} mistakes - ミス入力数
 * @param {string} difficulty - 難易度
 */
export const saveGameRecord = (kpm, accuracy, time, mistakes, difficulty) => {
  try {
    // 既存の記録を取得
    const existingRecords = getGameRecords();
    
    // 新しい記録を追加
    const newRecord = {
      kpm: parseFloat(kpm) || 0,
      accuracy: parseFloat(accuracy) || 0,
      time: time || 0,
      mistakes: mistakes || 0,
      difficulty: difficulty || 'normal',
      date: new Date().toISOString()
    };
    
    existingRecords.push(newRecord);
    
    // 最大20件まで保存
    const limitedRecords = existingRecords.slice(-20);
    
    // ローカルストレージに保存
    localStorage.setItem('typingGameRecords', JSON.stringify(limitedRecords));
    
    // ハイスコア更新確認
    updateHighScores(newRecord);
    
    return true;
  } catch (error) {
    console.error('記録の保存中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * 保存されているゲーム記録を取得する
 * @returns {Array} ゲーム記録の配列
 */
export const getGameRecords = () => {
  try {
    const records = localStorage.getItem('typingGameRecords');
    return records ? JSON.parse(records) : [];
  } catch (error) {
    console.error('記録の取得中にエラーが発生しました:', error);
    return [];
  }
};

/**
 * ハイスコアを更新する
 * @param {Object} record - 新しい記録
 */
const updateHighScores = (record) => {
  try {
    // 現在のハイスコアを取得
    const highScores = getHighScores();
    
    const difficulty = record.difficulty;
    let updated = false;
    
    // 特定の難易度のハイスコアを更新
    if (record.kpm > (highScores[difficulty]?.kpm || 0)) {
      highScores[difficulty] = {
        ...highScores[difficulty],
        kpm: record.kpm,
        date: record.date
      };
      updated = true;
    }
    
    if (record.accuracy > (highScores[difficulty]?.accuracy || 0)) {
      highScores[difficulty] = {
        ...highScores[difficulty],
        accuracy: record.accuracy,
        date: record.date
      };
      updated = true;
    }
    
    if (updated) {
      localStorage.setItem('typingGameHighScores', JSON.stringify(highScores));
    }
  } catch (error) {
    console.error('ハイスコア更新中にエラーが発生しました:', error);
  }
};

/**
 * 保存されているハイスコアを取得する
 * @returns {Object} 難易度ごとのハイスコア
 */
export const getHighScores = () => {
  try {
    const scores = localStorage.getItem('typingGameHighScores');
    return scores ? JSON.parse(scores) : {};
  } catch (error) {
    console.error('ハイスコアの取得中にエラーが発生しました:', error);
    return {};
  }
};

export default {
  saveGameRecord,
  getGameRecords,
  getHighScores,
};