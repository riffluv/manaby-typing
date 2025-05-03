/**
 * 管理者機能に関するユーティリティ
 * 背景カスタマイズやゲーム設定のカスタマイズなど、管理者向け機能を提供
 */
import StorageUtils from './StorageUtils';
import FirebaseUtils from './FirebaseUtils';

/**
 * 管理者モードを有効にする
 * @returns {boolean} 設定が成功したかどうか
 */
export const enableAdminMode = () => {
  return StorageUtils.setAdminMode(true);
};

/**
 * 管理者モードを無効にする
 * @returns {boolean} 設定が成功したかどうか
 */
export const disableAdminMode = () => {
  return StorageUtils.setAdminMode(false);
};

/**
 * 現在の管理者モード状態を取得
 * @returns {boolean} 管理者モードかどうか
 */
export const isAdminMode = () => {
  return StorageUtils.isAdminMode();
};

/**
 * 背景画像を設定する（管理者機能）
 * @param {string} imageUrl - 背景画像のURL
 * @param {Object} styleInfo - 追加のスタイル情報
 * @returns {boolean} 設定が成功したかどうか
 */
export const setBackgroundImage = (imageUrl, styleInfo = null) => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみ背景画像を設定できます');
    return false;
  }

  try {
    // 背景画像URLを保存
    StorageUtils.saveBackgroundImage(imageUrl);

    // スタイル情報があれば保存
    if (styleInfo) {
      StorageUtils.saveBackgroundStyle(styleInfo);
    }

    // DOMに適用
    StorageUtils.applyBackgroundFromStorage();

    return true;
  } catch (error) {
    console.error('背景画像の設定中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * 特定の画面の背景を設定する
 * @param {string} screenId - 画面のID ('MAIN_MENU', 'GAME'など)
 * @param {Object} backgroundConfig - 背景設定
 * @returns {boolean} 設定が成功したかどうか
 */
export const setScreenBackground = (screenId, backgroundConfig) => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみ画面背景を設定できます');
    return false;
  }

  try {
    // 画面ごとの背景設定を保存
    const result = StorageUtils.saveScreenBackground(screenId, backgroundConfig);

    // 現在表示中の画面であれば即座に適用
    if (result) {
      StorageUtils.applyScreenBackground(screenId);
    }

    return result;
  } catch (error) {
    console.error(`画面背景の設定中にエラーが発生しました (${screenId}):`, error);
    return false;
  }
};

/**
 * 背景をFirebaseに保存する
 * @param {string} playerName - ユーザー名 
 * @param {string} imageData - 画像データ(Base64)
 * @param {string} title - タイトル
 * @param {Object} styleInfo - スタイル情報
 * @returns {Promise<string|null>} 保存されたID、またはnull
 */
export const saveBackgroundToCloud = async (
  playerName,
  imageData,
  title,
  styleInfo
) => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみクラウドに背景を保存できます');
    return null;
  }

  try {
    const backgroundId = await FirebaseUtils.saveBackgroundToFirebase(
      playerName,
      imageData,
      title,
      { createdBy: playerName, isAdmin: true },
      styleInfo
    );

    return backgroundId;
  } catch (error) {
    console.error('背景のクラウド保存中にエラーが発生しました:', error);
    return null;
  }
};

/**
 * お題数を変更する
 * @param {number} count - お題数
 * @param {function} updateSettings - 設定を更新する関数
 * @returns {boolean} 設定が成功したかどうか
 */
export const setRequiredProblemCount = (count, updateSettings) => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみお題数を変更できます');
    return false;
  }

  if (typeof count !== 'number' || count < 1) {
    console.error('有効なお題数を指定してください');
    return false;
  }

  try {
    updateSettings({ requiredProblemCount: count });
    return true;
  } catch (error) {
    console.error('お題数の変更中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * ランキングデータを削除する
 * @param {string} difficulty - 難易度
 * @returns {Promise<boolean>} 削除が成功したかどうか
 */
export const deleteRankingData = async (difficulty) => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみランキングデータを削除できます');
    return false;
  }

  try {
    const result = await FirebaseUtils.deleteRankingsByDifficulty(difficulty);
    return result;
  } catch (error) {
    console.error('ランキングデータの削除中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * すべてのランキングデータを削除する
 * @returns {Promise<boolean>} 削除が成功したかどうか
 */
export const deleteAllRankingData = async () => {
  if (!isAdminMode()) {
    console.warn('管理者モードでのみすべてのランキングデータを削除できます');
    return false;
  }

  try {
    const result = await FirebaseUtils.deleteAllRankings();
    return result;
  } catch (error) {
    console.error('すべてのランキングデータの削除中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * 保存されている背景をクラウドから取得する
 * @param {number} limit - 取得する件数
 * @returns {Promise<Array>} 背景データの配列
 */
export const getCloudBackgrounds = async (limit = 20) => {
  try {
    return await FirebaseUtils.getBackgroundsFromFirebase(limit);
  } catch (error) {
    console.error('クラウド背景の取得中にエラーが発生しました:', error);
    return [];
  }
};

/**
 * 特定の画面用の背景をクラウドから取得する
 * @param {string} screenId - 画面ID
 * @param {number} limit - 取得する件数
 * @returns {Promise<Array>} 背景データの配列
 */
export const getScreenBackgroundsFromCloud = async (screenId, limit = 20) => {
  try {
    return await FirebaseUtils.getScreenBackgroundsFromFirebase(screenId, limit);
  } catch (error) {
    console.error(`画面用背景の取得中にエラーが発生しました (${screenId}):`, error);
    return [];
  }
};

export default {
  enableAdminMode,
  disableAdminMode,
  isAdminMode,
  setBackgroundImage,
  setScreenBackground,
  saveBackgroundToCloud,
  setRequiredProblemCount,
  deleteRankingData,
  deleteAllRankingData,
  getCloudBackgrounds,
  getScreenBackgroundsFromCloud,
};