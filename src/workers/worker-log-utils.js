/**
 * Worker用ログユーティリティ
 * Web Worker内で使用するためのロギング機能を提供
 */

// ログレベルの定義
export const LogLevel = {
  NONE: 0,   // ログなし
  ERROR: 1,  // エラーのみ
  WARN: 2,   // 警告とエラー
  INFO: 3,   // 情報、警告、エラー
  DEBUG: 4,  // デバッグ、情報、警告、エラー
  VERBOSE: 5 // すべて
};

// 現在の環境に基づいてデフォルトログレベルを設定
// Worker環境ではprocess.env.NODE_ENVにアクセスできない可能性があるため、
// メインスレッドから設定を受け取る
const DEFAULT_LOG_LEVEL = 3; // デフォルトはINFOレベル

// Workerロガークラス
export class WorkerLogger {
  constructor() {
    this.logLevel = DEFAULT_LOG_LEVEL;
    this.logHistory = [];
    this.maxLogHistory = 100; // Worker用は履歴を少なめに
    this.moduleName = 'Worker'; // デフォルトのモジュール名
  }

  // ログレベルを設定
  setLogLevel(level) {
    this.logLevel = level;
    if (this.logLevel >= LogLevel.INFO) {
      console.info(`[${this.moduleName}] ログレベルを設定しました: ${level}`);
    }
  }

  // モジュール名を設定
  setModuleName(name) {
    this.moduleName = name;
  }

  // ログ履歴をクリア
  clearLogHistory() {
    this.logHistory = [];
    console.log(`[${this.moduleName}] ログ履歴をクリアしました`);
  }

  // ログを履歴に追加
  addToHistory(level, message) {
    this.logHistory.push({
      timestamp: Date.now(),
      level,
      message
    });

    // 最大数を超えた場合、古いログを削除
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory.shift();
    }
  }

  // ログ履歴を取得
  getLogHistory() {
    return this.logHistory;
  }

  // エラーログ
  error(message, ...args) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`[${this.moduleName} ERROR] ${message}`, ...args);
      this.addToHistory('ERROR', message);
    }
  }

  // 警告ログ
  warn(message, ...args) {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`[${this.moduleName} WARN] ${message}`, ...args);
      this.addToHistory('WARN', message);
    }
  }

  // 情報ログ
  info(message, ...args) {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(`[${this.moduleName} INFO] ${message}`, ...args);
      this.addToHistory('INFO', message);
    }
  }

  // デバッグログ
  debug(message, ...args) {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(`[${this.moduleName} DEBUG] ${message}`, ...args);
      this.addToHistory('DEBUG', message);
    }
  }

  // 詳細ログ
  verbose(message, ...args) {
    if (this.logLevel >= LogLevel.VERBOSE) {
      console.log(`[${this.moduleName} VERBOSE] ${message}`, ...args);
      this.addToHistory('VERBOSE', message);
    }
  }

  // ログ履歴を親スレッドに送信
  sendLogsToMain() {
    if (self && self.postMessage) {
      self.postMessage({
        type: 'worker_logs',
        data: {
          logs: this.getLogHistory(),
          timestamp: Date.now()
        }
      });
      return true;
    }
    return false;
  }
}

// デフォルトのロガーインスタンス
const logger = new WorkerLogger();

export default logger;