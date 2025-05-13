/**
 * LogUtils.js
 * アプリケーション全体で使用する統一ログユーティリティ
 * 環境に応じたログレベル制御とパフォーマンス最適化
 */

// ログレベル定数
const LOG_LEVELS = {
  TRACE: 1,   // 詳細なトレース情報（非常に詳細）
  DEBUG: 2,   // デバッグ情報
  INFO: 3,    // 一般的な情報
  WARN: 4,    // 警告
  ERROR: 5,   // エラー
  NONE: 6     // ログ出力なし
};

// 開発環境と本番環境でのデフォルトログレベルを設定
const DEFAULT_LEVEL = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

/**
 * アプリケーションロガークラス
 */
class Logger {
  constructor() {
    this.moduleName = 'App';
    this.logLevel = DEFAULT_LEVEL;
    this.maxHistorySize = 500; // 最大ログ保持数（メモリ使用量に影響）
    this.logHistory = [];      // ログ履歴
    this.listeners = [];       // ログイベントリスナー

    // 開発環境専用の設定
    this.devTools = {
      enabled: process.env.NODE_ENV !== 'production',
      consoleOverride: false,
      performanceMonitoring: true
    };
  }

  /**
   * ロガーのモジュール名を設定
   * @param {string} name モジュール名
   * @returns {Logger} チェーン呼び出し用のthis
   */
  setModuleName(name) {
    this.moduleName = name || 'App';
    return this;
  }

  /**
   * ログレベルを設定
   * @param {number} level ログレベル
   * @returns {Logger} チェーン呼び出し用のthis
   */
  setLogLevel(level) {
    if (typeof level === 'number' && level >= LOG_LEVELS.TRACE && level <= LOG_LEVELS.NONE) {
      this.logLevel = level;
    }
    return this;
  }

  /**
   * ログ履歴の最大サイズを設定
   * @param {number} size 最大履歴サイズ
   * @returns {Logger} チェーン呼び出し用のthis
   */
  setMaxHistorySize(size) {
    if (typeof size === 'number' && size >= 0) {
      this.maxHistorySize = size;
      this._trimHistory();
    }
    return this;
  }

  /**
   * ログイベントリスナーを追加
   * @param {Function} listener ログイベントリスナー
   * @returns {Logger} チェーン呼び出し用のthis
   */
  addListener(listener) {
    if (typeof listener === 'function' && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
    return this;
  }

  /**
   * ログイベントリスナーを削除
   * @param {Function} listener 削除するリスナー
   * @returns {Logger} チェーン呼び出し用のthis
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
    return this;
  }

  /**
   * 開発ツール設定を更新
   * @param {Object} options 設定オプション
   * @returns {Logger} チェーン呼び出し用のthis
   */
  configureDevTools(options = {}) {
    if (typeof options.enabled === 'boolean') {
      this.devTools.enabled = options.enabled;
    }
    if (typeof options.consoleOverride === 'boolean') {
      this.devTools.consoleOverride = options.consoleOverride;
    }
    if (typeof options.performanceMonitoring === 'boolean') {
      this.devTools.performanceMonitoring = options.performanceMonitoring;
    }
    return this;
  }

  /**
   * ログ履歴を取得
   * @param {number} limit 取得する最大数（省略可）
   * @param {string} level 特定のレベルのログのみ取得（省略可）
   * @returns {Array} ログ履歴
   */
  getLogHistory(limit = null, level = null) {
    let logs = [...this.logHistory];

    // レベルでフィルタリング
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // 件数制限
    if (typeof limit === 'number' && limit > 0) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * ログ履歴をクリア
   * @returns {Logger} チェーン呼び出し用のthis
   */
  clearLogHistory() {
    this.logHistory = [];
    return this;
  }

  /**
   * 履歴を最大サイズに収める
   * @private
   */
  _trimHistory() {
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * ログエントリを作成
   * @private
   */
  _createLogEntry(level, message, data) {
    return {
      timestamp: new Date().toISOString(),
      level,
      moduleName: this.moduleName,
      message,
      data: data !== undefined ? data : null
    };
  }

  /**
   * リスナーにログエントリを通知
   * @private
   */
  _notifyListeners(entry) {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        // リスナーエラーは無視（無限ループ防止）
        console.error('Logger listener error:', e);
      }
    });
  }

  /**
   * トレースログ
   */
  trace(message, ...args) {
    if (this.logLevel <= LOG_LEVELS.TRACE) {
      const entry = this._createLogEntry('TRACE', message, args);
      this.logHistory.push(entry);
      this._trimHistory();
      console.debug(`[TRACE][${this.moduleName}]`, message, ...args);
      this._notifyListeners(entry);
    }
    return this;
  }

  /**
   * デバッグログ
   */
  debug(message, ...args) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      const entry = this._createLogEntry('DEBUG', message, args);
      this.logHistory.push(entry);
      this._trimHistory();
      console.debug(`[DEBUG][${this.moduleName}]`, message, ...args);
      this._notifyListeners(entry);
    }
    return this;
  }

  /**
   * 情報ログ
   */
  info(message, ...args) {
    if (this.logLevel <= LOG_LEVELS.INFO) {
      const entry = this._createLogEntry('INFO', message, args);
      this.logHistory.push(entry);
      this._trimHistory();
      console.log(`[INFO][${this.moduleName}]`, message, ...args);
      this._notifyListeners(entry);
    }
    return this;
  }

  /**
   * 警告ログ
   */
  warn(message, ...args) {
    if (this.logLevel <= LOG_LEVELS.WARN) {
      const entry = this._createLogEntry('WARN', message, args);
      this.logHistory.push(entry);
      this._trimHistory();
      console.warn(`[WARN][${this.moduleName}]`, message, ...args);
      this._notifyListeners(entry);
    }
    return this;
  }

  /**
   * エラーログ
   */
  error(message, ...args) {
    if (this.logLevel <= LOG_LEVELS.ERROR) {
      const entry = this._createLogEntry('ERROR', message, args);
      this.logHistory.push(entry);
      this._trimHistory();
      console.error(`[ERROR][${this.moduleName}]`, message, ...args);
      this._notifyListeners(entry);
    }
    return this;
  }

  /**
   * グループ開始
   */
  group(label) {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      console.group(`[GROUP][${this.moduleName}] ${label}`);
    }
    return this;
  }

  /**
   * グループ終了
   */
  groupEnd() {
    if (this.logLevel <= LOG_LEVELS.DEBUG) {
      console.groupEnd();
    }
    return this;
  }

  /**
   * パフォーマンスログ（開始）
   */
  startPerf(label) {
    if (this.logLevel <= LOG_LEVELS.DEBUG && this.devTools.performanceMonitoring) {
      if (!this._perfMarks) {
        this._perfMarks = new Map();
      }

      if (typeof performance !== 'undefined') {
        performance.mark(`${label}-start`);
      }

      this._perfMarks.set(label, performance ? performance.now() : Date.now());
      this.debug(`⏱️ パフォーマンス計測開始: ${label}`);
    }
    return this;
  }

  /**
   * パフォーマンスログ（終了）
   */
  endPerf(label) {
    if (this.logLevel <= LOG_LEVELS.DEBUG &&
      this.devTools.performanceMonitoring &&
      this._perfMarks &&
      this._perfMarks.has(label)) {

      const startTime = this._perfMarks.get(label);
      const endTime = performance ? performance.now() : Date.now();
      const duration = endTime - startTime;
      this._perfMarks.delete(label);

      if (typeof performance !== 'undefined') {
        performance.mark(`${label}-end`);
        try {
          performance.measure(
            `${this.moduleName}-${label}`,
            `${label}-start`,
            `${label}-end`
          );
        } catch (e) {
          // 計測エラーは無視
        }
      }

      this.debug(`⏱️ パフォーマンス計測終了: ${label} (${duration.toFixed(2)}ms)`);
      return duration;
    }
    return 0;
  }

  /**
   * 指定したモジュール用の新しいロガーインスタンスを作成
   * @param {string} moduleName モジュール名
   * @returns {Logger} 新しいロガーインスタンス
   */
  static getLogger(moduleName) {
    return new Logger().setModuleName(moduleName);
  }
}

// シングルトンインスタンス
const defaultLogger = new Logger();

// グローバルロガー（バックワードコンパチビリティ用）
const backwardCompatLogger = {
  log: (...args) => defaultLogger.info(...args),
  info: (...args) => defaultLogger.info(...args),
  debug: (...args) => defaultLogger.debug(...args),
  warn: (...args) => defaultLogger.warn(...args),
  error: (...args) => defaultLogger.error(...args),
  trace: (...args) => defaultLogger.trace(...args)
};

export { Logger, defaultLogger as logger, backwardCompatLogger, LOG_LEVELS };
export default defaultLogger;