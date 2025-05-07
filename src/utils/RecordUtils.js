/**
 * タイピングゲームの記録管理ユーティリティ
 */
import TypingUtils from './TypingUtils';

/**
 * ゲーム記録をローカルストレージに保存する
 * @param {number} kpm - 1分あたりの入力キー数
 * @param {number} accuracy - 正確性（%）
 * @param {number} time - プレイ時間（秒）
 * @param {number} mistakes - ミス入力回数
 * @param {string} difficulty - 難易度
 * @param {string} rank - ランク (GOD, DIVINE, LEGEND, ...)
 * @returns {boolean} 保存に成功したかどうか
 */
export const saveGameRecord = (
  kpm,
  accuracy,
  time,
  mistakes,
  difficulty,
  rank
) => {
  try {
    // 既存の記録を取得
    let existingRecords = getGameRecords();

    // 新しい記録を作成
    const newRecord = {
      kpm: parseFloat(kpm) || 0,
      rank: rank || TypingUtils.getKPMRank(kpm), // ランクが渡されなかった場合は計算
      accuracy: parseFloat(accuracy) || 0,
      time: time || 0,
      mistakes: mistakes || 0,
      difficulty: difficulty || 'normal',
      date: new Date().toISOString(),
    };

    // 新しい記録を先頭に追加
    existingRecords.unshift(newRecord);

    // 直近10件まで保存（古い記録は削除）
    const limitedRecords = existingRecords.slice(0, 10);

    // ローカルストレージに保存
    localStorage.setItem('typingGameRecords', JSON.stringify(limitedRecords));
    console.log(`ゲーム記録を保存しました。残り記録数: ${limitedRecords.length}/10`);

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
        date: record.date,
      };
      updated = true;
    }

    if (record.accuracy > (highScores[difficulty]?.accuracy || 0)) {
      highScores[difficulty] = {
        ...highScores[difficulty],
        accuracy: record.accuracy,
        date: record.date,
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
