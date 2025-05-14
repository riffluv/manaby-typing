/**
 * ローカルストレージ関連のユーティリティ
 * 設定、背景、ゲームデータなどの永続化管理を担当
 */

// ローカルストレージのキー定義
const STORAGE_KEYS = {
  SETTINGS: 'typingGameSettings',
  IS_ADMIN: 'isAdmin',
  BACKGROUND_IMAGE: 'savedBackgroundImage',
  BACKGROUND_STYLE: 'savedBackgroundStyle',
  HIGH_SCORES: 'highScores',
  SCREEN_BACKGROUNDS: 'screenBackgrounds',
  USER_PREFERENCES: 'userPreferences',
  USERNAME: 'username',
  LAST_PLAYED_DATE: 'lastPlayedDate',
  SCREEN_SIZE: 'screenSize',
};

/**
 * ローカルストレージにデータを保存する
 * @param {string} key - 保存キー
 * @param {any} value - 保存する値
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveToStorage = (key, value) => {
  if (typeof window === 'undefined') {
    return false; // サーバーサイドでの実行時は何もしない
  }

  try {
    // オブジェクトや配列はJSON文字列に変換
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : value;
    localStorage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Storage save error for key [${key}]:`, error);
    return false;
  }
};

/**
 * ローカルストレージからデータを取得する
 * @param {string} key - 取得キー
 * @param {any} defaultValue - 値が存在しない場合のデフォルト値
 * @returns {any} 取得した値またはデフォルト値
 */
export const getFromStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') {
    return defaultValue; // サーバーサイドでの実行時はデフォルト値を返す
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }

    // JSON文字列であれば解析を試みる
    try {
      return JSON.parse(item);
    } catch {
      // JSON解析に失敗した場合はそのままの値を返す
      return item;
    }
  } catch (error) {
    console.error(`Storage get error for key [${key}]:`, error);
    return defaultValue;
  }
};

/**
 * ローカルストレージから特定のキーのデータを削除する
 * @param {string} key - 削除するキー
 * @returns {boolean} 削除が成功したかどうか
 */
export const removeFromStorage = (key) => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Storage remove error for key [${key}]:`, error);
    return false;
  }
};

/**
 * ゲーム設定をローカルストレージに保存する
 * @param {Object} settings - 保存する設定オブジェクト
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveGameSettings = (settings) => {
  return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
};

/**
 * ゲーム設定をローカルストレージから取得する
 * @param {Object} defaultSettings - デフォルト設定
 * @returns {Object} 保存されていた設定またはデフォルト設定
 */
export const getGameSettings = (defaultSettings = {}) => {
  return getFromStorage(STORAGE_KEYS.SETTINGS, defaultSettings);
};

/**
 * 管理者モードかどうかを確認する
 * @returns {boolean} 管理者モードかどうか
 */
export const isAdminMode = () => {
  return getFromStorage(STORAGE_KEYS.IS_ADMIN, false) === true;
};

/**
 * 管理者モードを設定または解除する
 * @param {boolean} isAdmin - 管理者モードかどうか
 * @returns {boolean} 設定が成功したかどうか
 */
export const setAdminMode = (isAdmin) => {
  return saveToStorage(STORAGE_KEYS.IS_ADMIN, isAdmin);
};

/**
 * 背景画像情報を保存する
 * @param {string} imageUrl - 背景画像URL (Dataスキーマまたは通常のURL)
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveBackgroundImage = (imageUrl) => {
  return saveToStorage(STORAGE_KEYS.BACKGROUND_IMAGE, imageUrl);
};

/**
 * 背景スタイル情報を保存する
 * @param {Object} styleObject - 背景に関するスタイル情報
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveBackgroundStyle = (styleObject) => {
  return saveToStorage(STORAGE_KEYS.BACKGROUND_STYLE, styleObject);
};

/**
 * 保存された背景画像を取得する
 * @returns {string|null} 背景画像URL
 */
export const getBackgroundImage = () => {
  return getFromStorage(STORAGE_KEYS.BACKGROUND_IMAGE, null);
};

/**
 * 保存された背景スタイルを取得する
 * @returns {Object|null} 背景スタイル情報
 */
export const getBackgroundStyle = () => {
  return getFromStorage(STORAGE_KEYS.BACKGROUND_STYLE, null);
};

/**
 * 特定の画面に対する背景設定を保存する
 * @param {string} screenId - 画面ID (例: 'MAIN_MENU', 'GAME')
 * @param {Object} backgroundConfig - 背景設定 (imageUrl, styleObject等)
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveScreenBackground = (screenId, backgroundConfig) => {
  // 現在の全画面背景設定を取得
  const screenBackgrounds = getFromStorage(STORAGE_KEYS.SCREEN_BACKGROUNDS, {});
  
  // 対象の画面の設定を更新
  screenBackgrounds[screenId] = backgroundConfig;
  
  // 更新した設定を保存
  return saveToStorage(STORAGE_KEYS.SCREEN_BACKGROUNDS, screenBackgrounds);
};

/**
 * 特定の画面の背景設定を取得する
 * @param {string} screenId - 画面ID
 * @returns {Object|null} 背景設定またはnull
 */
export const getScreenBackground = (screenId) => {
  const screenBackgrounds = getFromStorage(STORAGE_KEYS.SCREEN_BACKGROUNDS, {});
  return screenBackgrounds[screenId] || null;
};

/**
 * ユーザー名をローカルストレージに保存する
 * @param {string} username - ユーザー名
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveUsername = (username) => {
  return saveToStorage(STORAGE_KEYS.USERNAME, username);
};

/**
 * 保存されたユーザー名を取得する
 * @param {string} defaultUsername - デフォルトのユーザー名
 * @returns {string} 保存されていたユーザー名またはデフォルト値
 */
export const getUsername = (defaultUsername = 'プレイヤー') => {
  return getFromStorage(STORAGE_KEYS.USERNAME, defaultUsername);
};

/**
 * ハイスコアをローカルストレージに保存する
 * @param {string} difficulty - 難易度
 * @param {Object} scoreData - スコアデータ
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveHighScore = (difficulty, scoreData) => {
  // 現在のハイスコアを取得
  const highScores = getFromStorage(STORAGE_KEYS.HIGH_SCORES, {});
  
  // 難易度別のハイスコアを更新
  if (!highScores[difficulty] || scoreData.kpm > highScores[difficulty].kpm) {
    highScores[difficulty] = {
      ...scoreData,
      date: new Date().toISOString()
    };
  }
  
  // 更新したハイスコアを保存
  return saveToStorage(STORAGE_KEYS.HIGH_SCORES, highScores);
};

/**
 * 保存されたハイスコアを取得する
 * @param {string} difficulty - 難易度 (指定しない場合は全難易度)
 * @returns {Object|null} ハイスコアデータまたはnull
 */
export const getHighScore = (difficulty = null) => {
  const highScores = getFromStorage(STORAGE_KEYS.HIGH_SCORES, {});
  
  if (difficulty) {
    return highScores[difficulty] || null;
  }
  
  return highScores;
};

/**
 * 最後にプレイした日付を保存する
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveLastPlayedDate = () => {
  return saveToStorage(STORAGE_KEYS.LAST_PLAYED_DATE, new Date().toISOString());
};

/**
 * 最後にプレイした日付を取得する
 * @returns {string|null} 日付文字列またはnull
 */
export const getLastPlayedDate = () => {
  return getFromStorage(STORAGE_KEYS.LAST_PLAYED_DATE, null);
};

/**
 * プレイヤーの設定する画面サイズを保存する
 * @param {Object} sizeConfig - サイズ設定 (width, height)
 * @returns {boolean} 保存が成功したかどうか
 */
export const saveScreenSize = (sizeConfig) => {
  return saveToStorage(STORAGE_KEYS.SCREEN_SIZE, sizeConfig);
};

/**
 * 保存された画面サイズを取得する
 * @param {Object} defaultSize - デフォルトのサイズ設定
 * @returns {Object} サイズ設定
 */
export const getScreenSize = (defaultSize = { width: 800, height: 600 }) => {
  return getFromStorage(STORAGE_KEYS.SCREEN_SIZE, defaultSize);
};

/**
 * 背景を適用する関数
 * @param {Object} options - オプション
 * @param {string} [options.targetSelector='#__next > div'] - 背景を適用する要素のセレクタ
 * @param {number} [options.delay=100] - 適用する遅延時間(ms)
 * @returns {Promise<boolean>} 適用が成功したかどうか
 */
export const applyBackgroundFromStorage = async ({ 
  targetSelector = '#__next > div',
  delay = 100
} = {}) => {
  if (typeof window === 'undefined') {
    return false;
  }

  // 管理者モードでない場合は背景を適用しない
  if (!isAdminMode()) {
    console.log('管理者モードではないため、カスタム背景を適用しません');
    return false;
  }

  try {
    const imageUrl = getBackgroundImage();
    const styleInfo = getBackgroundStyle();

    if (!imageUrl && !styleInfo) {
      return false;
    }

    // DOMの準備を待つための小さな遅延
    await new Promise(resolve => setTimeout(resolve, delay));

    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      console.warn(`背景を適用する要素が見つかりませんでした: ${targetSelector}`);
      return false;
    }

    // スタイルを適用
    if (styleInfo) {
      Object.entries(styleInfo).forEach(([key, value]) => {
        if (key !== 'backgroundImage' && value) {
          targetElement.style[key] = value;
        }
      });
    }

    // 背景画像を設定
    if (imageUrl) {
      targetElement.style.backgroundImage = `url(${imageUrl})`;
      targetElement.style.backgroundSize = 'cover';
      targetElement.style.backgroundPosition = 'center';
    }

    console.log('保存された背景とスタイルを適用しました');
    return true;
  } catch (error) {
    console.error('背景適用中にエラーが発生しました:', error);
    return false;
  }
};

/**
 * 現在の画面に対応する背景を適用する
 * @param {string} screenId - 現在の画面ID
 * @returns {Promise<boolean>} 適用が成功したかどうか
 */
export const applyScreenBackground = async (screenId) => {
  if (typeof window === 'undefined' || !isAdminMode()) {
    return false;
  }

  // 画面固有の背景設定を取得
  const screenBackground = getScreenBackground(screenId);
  
  // 画面固有の設定がなければ共通設定を使用
  if (!screenBackground) {
    return applyBackgroundFromStorage();
  }
  
  try {
    const targetElement = document.querySelector('#__next > div');
    if (!targetElement) {
      return false;
    }
    
    // 画面固有の背景画像とスタイルを適用
    if (screenBackground.imageUrl) {
      targetElement.style.backgroundImage = `url(${screenBackground.imageUrl})`;
      targetElement.style.backgroundSize = 'cover';
      targetElement.style.backgroundPosition = 'center';
    }
    
    if (screenBackground.styleObject) {
      Object.entries(screenBackground.styleObject).forEach(([key, value]) => {
        if (key !== 'backgroundImage' && value) {
          targetElement.style[key] = value;
        }
      });
    }
    
    console.log(`${screenId}画面用の背景を適用しました`);
    return true;
  } catch (error) {
    console.error(`画面背景適用中にエラーが発生しました:`, error);
    return false;
  }
};

export default {
  STORAGE_KEYS,
  saveToStorage,
  getFromStorage,
  removeFromStorage,
  saveGameSettings,
  getGameSettings,
  isAdminMode,
  setAdminMode,
  saveBackgroundImage,
  saveBackgroundStyle,
  getBackgroundImage,
  getBackgroundStyle,
  saveScreenBackground,
  getScreenBackground,
  saveUsername,
  getUsername,
  saveHighScore,
  getHighScore,
  saveLastPlayedDate,
  getLastPlayedDate,
  saveScreenSize,
  getScreenSize,
  applyBackgroundFromStorage,
  applyScreenBackground,
};