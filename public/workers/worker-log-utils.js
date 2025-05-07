/**
 * worker-log-utils.js
 * Web Worker環境で使用するためのログユーティリティ
 */

// ログレベル定数
const LOG_LEVELS = {
  TRACE: 1,  // 詳細なトレース情報
  DEBUG: 2,  // デバッグ情報
  INFO: 3,   // 一般的な情報
  WARN: 4,   // 警告
  ERROR: 5,  // エラー
  NONE: 6    // ログ出力なし
};

// Worker環境のデフォルトログレベル
let currentLogLevel = LOG_LEVELS.INFO;

// 開発モードかどうかのフラグ
let isDevMode = false;

// モジュール名の設定
let moduleName = 'Worker';

// 最大ログ履歴サイズ
const MAX_HISTORY_SIZE = 100;

// ログ履歴
const logHistory = [];

/**
 * ログレベルを設定
 * @param {number} level - ログレベル
 */
function setLogLevel(level) {
  if (typeof level === 'number' && level >= LOG_LEVELS.TRACE && level <= LOG_LEVELS.NONE) {
    currentLogLevel = level;
    return true;
  }
  return false;
}

/**
 * モジュール名を設定
 * @param {string} name - モジュール名
 */
function setModuleName(name) {
  if (typeof name === 'string') {
    moduleName = name;
    return true;
  }
  return false;
}

/**
 * 開発モードフラグを設定
 * @param {boolean} isDev - 開発モードかどうか
 */
function setDevMode(isDev) {
  isDevMode = Boolean(isDev);
  // 開発モードの場合はデフォルトでDEBUGレベルに
  if (isDevMode && currentLogLevel > LOG_LEVELS.DEBUG) {
    currentLogLevel = LOG_LEVELS.DEBUG;
  }
}

/**
 * タイムスタンプを取得
 * @returns {string} ISO形式のタイムスタンプ
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * ログエントリを履歴に追加
 * @param {string} level - ログレベル
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function addToHistory(level, message, data) {
  logHistory.push({
    timestamp: getTimestamp(),
    level,
    message,
    data
  });

  // 最大サイズを超えた場合、古いログを削除
  if (logHistory.length > MAX_HISTORY_SIZE) {
    logHistory.shift();
  }
}

/**
 * Worker環境でメインスレッドにログを送信
 * @param {string} level - ログレベル
 * @param {string} message - メッセージ
 * @param {any} data - 追加データ
 */
function postLogToMain(level, message, data) {
  try {
    self.postMessage({
      type: 'log',
      level,
      message,
      data,
      timestamp: getTimestamp()
    });
  } catch (e) {
    // postMessageエラーは無視（通信切断など）
  }
}

/**
 * トレースログ
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function trace(message, data) {
  if (currentLogLevel <= LOG_LEVELS.TRACE) {
    console.debug(`[TRACE][${moduleName}] ${message}`, data);
    addToHistory('TRACE', message, data);
    postLogToMain('TRACE', message, data);
  }
}

/**
 * デバッグログ
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function debug(message, data) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.debug(`[DEBUG][${moduleName}] ${message}`, data);
    addToHistory('DEBUG', message, data);
    postLogToMain('DEBUG', message, data);
  }
}

/**
 * 情報ログ
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function info(message, data) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.log(`[INFO][${moduleName}] ${message}`, data);
    addToHistory('INFO', message, data);
    postLogToMain('INFO', message, data);
  }
}

/**
 * 警告ログ
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function warn(message, data) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(`[WARN][${moduleName}] ${message}`, data);
    addToHistory('WARN', message, data);
    postLogToMain('WARN', message, data);
  }
}

/**
 * エラーログ
 * @param {string} message - ログメッセージ
 * @param {any} data - 追加データ
 */
function error(message, data) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(`[ERROR][${moduleName}] ${message}`, data);
    addToHistory('ERROR', message, data);
    postLogToMain('ERROR', message, data);
  }
}

/**
 * パフォーマンス測定開始
 * @param {string} label - 測定ラベル
 */
const perfMarks = new Map();

function startPerf(label) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const startTime = performance ? performance.now() : Date.now();
    perfMarks.set(label, startTime);
    debug(`⏱️ パフォーマンス計測開始: ${label}`);
  }
}

/**
 * パフォーマンス測定終了
 * @param {string} label - 測定ラベル
 * @returns {number} 経過時間（ミリ秒）
 */
function endPerf(label) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG && perfMarks.has(label)) {
    const startTime = perfMarks.get(label);
    const endTime = performance ? performance.now() : Date.now();
    const duration = endTime - startTime;
    perfMarks.delete(label);

    debug(`⏱️ パフォーマンス計測終了: ${label} (${duration.toFixed(2)}ms)`);
    return duration;
  }
  return 0;
}

/**
 * ログ履歴を取得
 * @returns {Array} ログ履歴配列
 */
function getLogHistory() {
  return [...logHistory];
}

/**
 * ログ履歴をクリア
 */
function clearLogHistory() {
  logHistory.length = 0;
}

// エクスポート
self.workerLogger = {
  LOG_LEVELS,
  setLogLevel,
  setModuleName,
  setDevMode,
  trace,
  debug,
  info,
  warn,
  error,
  startPerf,
  endPerf,
  getLogHistory,
  clearLogHistory
};