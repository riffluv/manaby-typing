import TypingUtils from '../TypingUtils';
import { TypingEvents, TypingCommands, TypingStateSchema, createErrorData } from './TypingProtocol';

/**
 * タイピングゲーム用のMCPモデルクラス
 * 既存のTypingUtilsの機能をラップし、MCPアーキテクチャに対応させる
 */
export class TypingModelMCP {
  constructor() {
    // 内部状態の初期化
    this._state = this._createInitialState();

    // MCPに接続してハンドラを登録
    this._registerMCPHandlers();

    // リスナー管理用のマップ
    this._listeners = new Map();
  }

  /**
   * 初期状態を作成
   * @returns {Object} 初期状態オブジェクト
   * @private
   */
  _createInitialState() {
    // TypingProtocolで定義されたスキーマを元に初期状態を生成
    return {
      display: { ...TypingStateSchema.display },
      internal: { ...TypingStateSchema.internal },
      stats: { ...TypingStateSchema.stats },
      problem: { ...TypingStateSchema.problem }
    };
  }

  /**
   * MCPハンドラを登録
   * @private
   */
  _registerMCPHandlers() {
    if (typeof window !== 'undefined' && window._mcp) {
      // コマンドハンドラの登録
      window._mcp.registerHandler?.(TypingCommands.INITIALIZE, this._handleInitialize.bind(this));
      window._mcp.registerHandler?.(TypingCommands.RESET, this._handleReset.bind(this));
      window._mcp.registerHandler?.(TypingCommands.PROCESS_INPUT, this._handleProcessInput.bind(this));
      window._mcp.registerHandler?.(TypingCommands.GET_STATE, this._handleGetState.bind(this));
      window._mcp.registerHandler?.(TypingCommands.GET_DISPLAY_INFO, this._handleGetDisplayInfo.bind(this));
      window._mcp.registerHandler?.(TypingCommands.LOAD_PROBLEM, this._handleLoadProblem.bind(this));
      window._mcp.registerHandler?.(TypingCommands.COMPLETE_PROBLEM, this._handleCompleteProblem.bind(this));
      window._mcp.registerHandler?.(TypingCommands.GET_STATS, this._handleGetStats.bind(this));
      window._mcp.registerHandler?.(TypingCommands.SUBMIT_SCORE, this._handleSubmitScore.bind(this));

      // 登録情報をログ出力
      console.log('[TypingModelMCP] MCPハンドラ登録完了');
    } else {
      console.warn('[TypingModelMCP] MCP接続がないため、ハンドラを登録できませんでした');
    }
  }

  /**
   * ハンドラ: 初期化
   * @param {Object} data 初期化パラメータ
   * @returns {Object} 初期化結果
   * @private
   */
  _handleInitialize(data) {
    try {
      // 初期化パラメータの取得
      const { problem } = data || {};

      // 初期化処理
      this._reset();

      // 問題が指定されていれば読み込み
      if (problem) {
        this._loadProblem(problem);
      }

      // 初期化成功イベントを発行
      this._emitEvent(TypingEvents.STATE_UPDATED, {
        state: this.getState(),
        action: 'initialize'
      });

      return {
        success: true,
        state: this.getState()
      };
    } catch (error) {
      console.error('[TypingModelMCP] 初期化エラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`初期化エラー: ${error.message}`, 'INIT_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ハンドラ: リセット
   * @returns {Object} リセット結果
   * @private
   */
  _handleReset() {
    try {
      this._reset();

      // リセット成功イベントを発行
      this._emitEvent(TypingEvents.STATE_UPDATED, {
        state: this.getState(),
        action: 'reset'
      });

      return {
        success: true,
        state: this.getState()
      };
    } catch (error) {
      console.error('[TypingModelMCP] リセットエラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`リセットエラー: ${error.message}`, 'RESET_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ハンドラ: 入力処理
   * @param {Object} data 入力データ
   * @returns {Object} 処理結果
   * @private
   */
  _handleProcessInput(data) {
    try {
      const { key } = data || {};

      if (!key) {
        throw new Error('入力キーが指定されていません');
      }

      // セッションがなければエラー
      if (!this._state.internal.session) {
        throw new Error('タイピングセッションが初期化されていません');
      }

      // 入力処理
      const result = this._processInput(key);

      // 入力処理イベントを発行
      this._emitEvent(TypingEvents.INPUT_PROCESSED, {
        key,
        result,
        state: this.getDisplayInfo()
      });

      return {
        success: true,
        result,
        state: this.getDisplayInfo()
      };
    } catch (error) {
      console.error('[TypingModelMCP] 入力処理エラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`入力処理エラー: ${error.message}`, 'INPUT_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ハンドラ: 状態取得
   * @returns {Object} 現在の状態
   * @private
   */
  _handleGetState() {
    return {
      state: this.getState()
    };
  }

  /**
   * ハンドラ: 表示情報取得
   * @returns {Object} 表示情報
   * @private
   */
  _handleGetDisplayInfo() {
    return {
      displayInfo: this.getDisplayInfo()
    };
  }

  /**
   * ハンドラ: 問題読み込み
   * @param {Object} data 問題データ
   * @returns {Object} 処理結果
   * @private
   */
  _handleLoadProblem(data) {
    try {
      const { problem } = data || {};

      if (!problem) {
        throw new Error('問題データが指定されていません');
      }

      // 問題の読み込み
      this._loadProblem(problem);

      // 問題読み込みイベントを発行
      this._emitEvent(TypingEvents.PROBLEM_LOADED, {
        problem,
        state: this.getState()
      });

      return {
        success: true,
        state: this.getState()
      };
    } catch (error) {
      console.error('[TypingModelMCP] 問題読み込みエラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`問題読み込みエラー: ${error.message}`, 'PROBLEM_LOAD_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ハンドラ: 問題完了
   * @returns {Object} 処理結果
   * @private
   */
  _handleCompleteProblem() {
    try {
      // 問題完了処理
      const result = this._completeProblem();

      // 問題完了イベントを発行
      this._emitEvent(TypingEvents.PROBLEM_COMPLETED, {
        stats: this._state.stats,
        result
      });

      return {
        success: true,
        stats: this._state.stats,
        result
      };
    } catch (error) {
      console.error('[TypingModelMCP] 問題完了処理エラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`問題完了処理エラー: ${error.message}`, 'COMPLETE_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ハンドラ: 統計情報取得
   * @returns {Object} 統計情報
   * @private
   */
  _handleGetStats() {
    return {
      stats: this._state.stats
    };
  }

  /**
   * ハンドラ: スコア送信
   * @param {Object} data スコアデータ
   * @returns {Object} 処理結果
   * @private
   */
  _handleSubmitScore(data) {
    try {
      const { username, endpoint } = data || {};

      // スコア送信処理
      const result = TypingUtils.submitRanking({
        username: username || 'Anonymous',
        score: this._state.stats.correctKeyCount || 0,
        kpm: this._state.stats.kpm || 0,
        accuracy: this._state.stats.accuracy || 0,
        problemCount: (this._state.stats.problemStats || []).length,
        endpoint
      });

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('[TypingModelMCP] スコア送信エラー:', error);
      this._emitEvent(TypingEvents.ERROR, createErrorData(`スコア送信エラー: ${error.message}`, 'SUBMIT_SCORE_ERROR'));

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 内部メソッド: リセット処理
   * @private
   */
  _reset() {
    // 状態を初期化
    this._state = this._createInitialState();

    // タイマーをクリア
    if (this._errorAnimationTimerId) {
      clearTimeout(this._errorAnimationTimerId);
      this._errorAnimationTimerId = null;
    }

    if (this._statsUpdateTimerId) {
      clearTimeout(this._statsUpdateTimerId);
      this._statsUpdateTimerId = null;
    }

    console.log('[TypingModelMCP] 状態をリセットしました');
  }

  /**
   * 内部メソッド: 問題読み込み処理
   * @param {Object} problem 問題データ
   * @private
   */
  _loadProblem(problem) {
    if (!problem) {
      throw new Error('有効な問題データが指定されていません');
    }

    try {
      // 既存のTypingUtilsを使ってセッション作成
      const session = TypingUtils.createTypingSession(problem);

      if (!session) {
        throw new Error('タイピングセッションの作成に失敗しました');
      }

      // 問題情報を設定
      this._state.problem = {
        displayText: problem.displayText || '',
        kanaText: problem.kanaText || '',
        originalText: problem.displayText || ''
      };

      // セッション情報を内部状態に保存
      this._state.internal.session = session;
      this._state.internal.currentCharIndex = 0;
      this._state.internal.typedRomaji = '';
      this._state.internal.patterns = session.patterns || [];
      this._state.internal.displayIndices = session.displayIndices || [];
      this._state.internal.patternLengths = session.patternLengths || [];
      this._state.internal.expectedChars = session.expectedChars || [];
      this._state.internal.completed = false;

      // 表示情報を更新
      this._updateDisplayInfo();

      console.log('[TypingModelMCP] 問題を読み込みました:', problem.displayText);
    } catch (error) {
      console.error('[TypingModelMCP] 問題読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * 内部メソッド: 入力処理
   * @param {string} key 入力キー
   * @returns {Object} 処理結果
   * @private
   */
  _processInput(key) {
    const session = this._state.internal.session;

    if (!session) {
      throw new Error('タイピングセッションが初期化されていません');
    }

    // 入力が完了している場合は処理しない
    if (this._state.internal.completed) {
      return { success: false, status: 'already_completed' };
    }

    // 現在時刻を記録
    const now = Date.now();

    // 入力文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());

    // 既存のセッション処理を使用
    const result = session.processInput(halfWidthChar);

    // 処理結果に基づいて状態を更新
    if (result.success) {
      // 正解時の処理

      // 初回入力時のみ開始時間を記録
      if (!this._state.stats.startTime) {
        this._state.stats.startTime = now;
      }

      if (!this._state.stats.currentProblemStartTime) {
        this._state.stats.currentProblemStartTime = now;
      }

      // 統計情報を更新
      this._state.stats.correctKeyCount += 1;

      // 完了状態の更新
      if (result.status === 'all_completed') {
        this._state.internal.completed = true;
        this._state.display.isCompleted = true;
      }

      // 表示情報を更新
      this._updateDisplayInfo();

      // 統計情報を更新（必要に応じてスロットリング）
      this._updateStats();
    } else {
      // 不正解時の処理

      // 統計情報を更新
      this._state.stats.mistakeCount += 1;

      // エラーアニメーション状態を設定
      this._state.display.isError = true;

      // 200ms後にエラー状態をリセット
      if (this._errorAnimationTimerId) {
        clearTimeout(this._errorAnimationTimerId);
      }

      this._errorAnimationTimerId = setTimeout(() => {
        this._state.display.isError = false;
        this._errorAnimationTimerId = null;

        // 表示情報の更新イベントを発行
        this._emitEvent(TypingEvents.DISPLAY_UPDATED, {
          displayInfo: this.getDisplayInfo()
        });
      }, 200);
    }

    return result;
  }

  /**
   * 内部メソッド: 問題完了処理
   * @returns {Object} 問題ごとの統計情報
   * @private
   */
  _completeProblem() {
    // 問題がすでに完了している場合は何もしない
    if (this._state.internal.completed) {
      return { alreadyCompleted: true };
    }

    // 完了状態に設定
    this._state.internal.completed = true;
    this._state.display.isCompleted = true;

    // 現在時刻を取得
    const now = Date.now();

    // 問題ごとの統計情報を計算
    const stats = this._state.stats;
    const problemElapsedMs = stats.currentProblemStartTime
      ? now - stats.currentProblemStartTime
      : 0;
    const problemKeyCount = stats.correctKeyCount || 0;

    // 問題のKPMを計算
    const problemKPM = problemElapsedMs > 0
      ? Math.floor((problemKeyCount / (problemElapsedMs / 60000)))
      : 0;

    // 問題の詳細データを作成
    const problemData = {
      problemKeyCount,
      problemElapsedMs,
      problemKPM
    };

    // 統計情報を更新
    stats.problemStats = [...(stats.problemStats || []), problemData];

    // 進捗100%に設定
    this._state.display.progressPercentage = 100;

    // 統計情報を更新
    this._updateStats(true);

    // 表示情報を更新
    this._updateDisplayInfo();

    return {
      problemKeyCount,
      problemElapsedMs,
      problemKPM,
      problemStats: stats.problemStats
    };
  }

  /**
   * 内部メソッド: 表示情報の更新
   * @private
   */
  _updateDisplayInfo() {
    const session = this._state.internal.session;

    if (!session) {
      return;
    }

    // sessionからcoloringInfoを取得
    const coloringInfo = session.getColoringInfo();

    // 表示情報を更新
    this._state.display.romaji = session.displayRomaji || '';
    this._state.display.typedLength = coloringInfo.typedLength || 0;
    this._state.display.nextChar = coloringInfo.expectedNextChar || '';
    this._state.display.currentInput = coloringInfo.currentInput || '';
    this._state.display.currentCharRomaji = coloringInfo.currentCharRomaji || '';

    // 子音入力状態の判定
    this._state.display.inputMode = this._determineInputMode(
      coloringInfo.currentInput,
      coloringInfo.currentCharRomaji
    );

    // 表示情報の更新イベントを発行
    this._emitEvent(TypingEvents.DISPLAY_UPDATED, {
      displayInfo: this.getDisplayInfo()
    });
  }

  /**
   * 内部メソッド: 入力モードの判定
   * @param {string} currentInput 現在の入力
   * @param {string} currentCharRomaji 現在入力中の文字の完全なローマ字表現
   * @returns {string} 入力モード ('normal'/'consonant')
   * @private
   */
  _determineInputMode(currentInput, currentCharRomaji) {
    // 入力がなければnormal
    if (!currentInput) return 'normal';

    // 子音のみかどうか判定
    const isConsonant = (char) => {
      if (!char || char.length === 0) return false;
      const consonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'];
      return consonants.includes(char.toLowerCase().charAt(0));
    };

    // 子音入力中の条件
    if (
      // 1. セッションが明示的に子音入力中であると示している場合
      (this._state.internal.session && this._state.internal.session.consonantInput) ||
      // 2. 現在の入力が子音のみであり、かつその後に続く文字がある場合
      (currentInput && isConsonant(currentInput) && currentCharRomaji && currentCharRomaji.length > currentInput.length) ||
      // 3. 現在の文字の完全なローマ字表現が存在し、それが入力よりも長い場合（子音入力の途中である）
      (currentCharRomaji && currentInput && currentCharRomaji.length > currentInput.length)
    ) {
      return 'consonant';
    }

    return 'normal';
  }

  /**
   * 内部メソッド: 統計情報の更新
   * @param {boolean} force 強制更新フラグ
   * @private
   */
  _updateStats(force = false) {
    // 既存のタイマーをクリア
    if (force && this._statsUpdateTimerId) {
      clearTimeout(this._statsUpdateTimerId);
      this._statsUpdateTimerId = null;
    }

    // スロットリング（前回の更新から500ms以上経過している場合または強制更新の場合のみ更新）
    const now = Date.now();
    const lastUpdateTime = this._lastStatsUpdateTime || 0;
    const statsUpdateDebounceTime = 500; // 500ms

    if (force || !this._statsUpdateTimerId && (!lastUpdateTime || now - lastUpdateTime > statsUpdateDebounceTime)) {
      this._statsUpdateTimerId = setTimeout(() => {
        this._calculateStats();
        this._lastStatsUpdateTime = Date.now();
        this._statsUpdateTimerId = null;
      }, 100);
    }
  }

  /**
   * 内部メソッド: 統計情報の計算
   * @private
   */
  _calculateStats() {
    const stats = this._state.stats;
    const correctCount = stats.correctKeyCount;
    const missCount = stats.mistakeCount;
    const totalCount = correctCount + missCount;

    // 正確性の計算
    const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    stats.accuracy = parseFloat(accuracy.toFixed(2));

    // KPMの計算
    let kpm = 0;

    // 問題データがある場合は平均KPMを計算 (最も信頼性の高い方法)
    if (stats.problemStats && stats.problemStats.length > 0) {
      // Weather Typing方式：各問題のKPMの平均値を使う
      kpm = TypingUtils.calculateAverageKPM(stats.problemStats);
    } else {
      // 問題データがない場合は通常の計算方法を使用
      const startTime = stats.startTime || Date.now();
      const elapsedTimeMs = Date.now() - startTime;

      // ゼロ除算を防ぐ
      if (elapsedTimeMs > 0) {
        kpm = Math.floor(correctCount / (elapsedTimeMs / 60000));
      }
    }

    // KPMが依然として0の場合は、最低値として1を設定
    if (kpm <= 0 && correctCount > 0) {
      kpm = 1;
    }

    stats.kpm = kpm;

    // 経過時間の更新
    const startTime = stats.startTime || Date.now();
    stats.elapsedTimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    // ランクの更新
    stats.rank = TypingUtils.getRank(kpm);

    // 統計情報の更新イベントを発行
    this._emitEvent(TypingEvents.STATS_UPDATED, {
      stats: this._state.stats
    });
  }

  /**
   * イベントの発行
   * @param {string} eventName イベント名
   * @param {Object} data イベントデータ
   * @private
   */
  _emitEvent(eventName, data) {
    // MCPを通じてイベントを発行
    if (typeof window !== 'undefined' && window._mcp) {
      window._mcp.send?.(eventName, data);
    }

    // 内部リスナーに通知
    const listeners = this._listeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`[TypingModelMCP] リスナー実行エラー (${eventName}):`, error);
      }
    });
  }

  /**
   * 公開メソッド: イベントリスナーを登録
   * @param {string} eventName イベント名
   * @param {Function} listener リスナー関数
   * @returns {Function} 登録解除関数
   */
  addEventListener(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new Error('リスナーは関数である必要があります');
    }

    // リスナーリストを取得または作成
    const listeners = this._listeners.get(eventName) || [];

    // リスナーを追加
    listeners.push(listener);
    this._listeners.set(eventName, listeners);

    // 登録解除関数を返す
    return () => {
      const currentListeners = this._listeners.get(eventName) || [];
      const index = currentListeners.indexOf(listener);

      if (index !== -1) {
        currentListeners.splice(index, 1);
        this._listeners.set(eventName, currentListeners);
      }
    };
  }

  /**
   * 公開メソッド: イベントリスナーを削除
   * @param {string} eventName イベント名
   * @param {Function} listener リスナー関数
   */
  removeEventListener(eventName, listener) {
    const listeners = this._listeners.get(eventName) || [];
    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
      this._listeners.set(eventName, listeners);
    }
  }

  /**
   * 公開メソッド: 現在の状態を取得
   * @returns {Object} 状態オブジェクト
   */
  getState() {
    return {
      display: { ...this._state.display },
      stats: { ...this._state.stats },
      problem: { ...this._state.problem }
    };
  }

  /**
   * 公開メソッド: 表示情報を取得
   * @returns {Object} 表示情報
   */
  getDisplayInfo() {
    return { ...this._state.display };
  }

  /**
   * 公開メソッド: 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return { ...this._state.stats };
  }
}

/**
 * シングルトンインスタンス
 */
let instance = null;

/**
 * TypingModelMCPのシングルトンインスタンスを取得
 * @returns {TypingModelMCP} シングルトンインスタンス
 */
export function getTypingModelInstance() {
  if (!instance) {
    instance = new TypingModelMCP();
  }
  return instance;
}

export default {
  TypingModelMCP,
  getTypingModelInstance
};