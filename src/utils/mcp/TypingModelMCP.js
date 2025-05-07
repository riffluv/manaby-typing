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

    // パフォーマンス計測開始
    const startTime = performance.now && performance.now();

    // 入力文字を半角に変換
    const halfWidthChar = TypingUtils.convertFullWidthToHalfWidth(key.toLowerCase());

    // 既存のセッション処理を使用（最も処理時間のかかる部分）
    const result = session.processInput(halfWidthChar);

    // 処理結果に基づいて状態を更新
    if (result.success) {
      // 正解時の処理
      const now = Date.now();

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

      // 表示情報を更新（最も頻度の高い処理なので最適化）
      this._fastUpdateDisplayInfo();

      // 統計情報を更新（さらにスロットリングを強化）
      this._updateStatsThrottled();
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

        // 表示情報の更新イベントを発行（頻度を抑える）
        this._emitEvent(TypingEvents.DISPLAY_UPDATED, {
          displayInfo: this.getDisplayInfo()
        });
      }, 200);
    }

    // パフォーマンス計測終了
    if (performance.now) {
      const processingTime = performance.now() - startTime;

      // 処理時間が長い場合のみログ出力（デバッグ用）
      if (processingTime > 16.67) { // 60fps = 16.67ms/frame
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[TypingModelMCP] 処理時間が長すぎます: ${processingTime.toFixed(2)}ms`);
        }
      }
    }

    return result;
  }

  /**
   * MCPを介さず直接タイピング入力を処理する高速メソッド
   * タイピングのレスポンス処理を最優先するための直接パス
   * @param {string} key 入力キー
   * @returns {Object} 処理結果
   */
  processLocalInput(key) {
    const session = this._state.internal.session;

    if (!session) {
      return { success: false, status: 'no_session' };
    }

    // 入力が完了している場合は処理しない
    if (this._state.internal.completed) {
      return { success: false, status: 'already_completed' };
    }

    // パフォーマンス計測開始
    const perfStartTime = performance.now && performance.now();

    // 入力文字を半角に変換（処理を簡略化して高速化）
    const halfWidthChar = key.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g,
      s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // キャッシュキーの生成（セッション状態と入力文字で一意に）
    const cacheKey = `${this._state.internal.currentCharIndex}:${this._state.internal.currentInput}:${halfWidthChar}`;

    // キャッシュを確認（ある場合は即時返却）
    if (this._inputResultCache && this._inputResultCache.has(cacheKey)) {
      const cachedResult = this._inputResultCache.get(cacheKey);

      // キャッシュから状態を復元
      if (cachedResult.stateUpdates) {
        const updates = cachedResult.stateUpdates;

        // 重要な状態のみを更新（必要最小限）
        if (updates.completed !== undefined) {
          this._state.internal.completed = updates.completed;
          this._state.display.isCompleted = updates.completed;
        }
        if (updates.currentCharIndex !== undefined) {
          this._state.internal.currentCharIndex = updates.currentCharIndex;
        }
        if (updates.typedRomaji !== undefined) {
          this._state.internal.typedRomaji = updates.typedRomaji;
        }
        if (updates.currentInput !== undefined) {
          this._state.internal.currentInput = updates.currentInput;
        }
        if (updates.typedLength !== undefined) {
          this._state.display.typedLength = updates.typedLength;
        }

        // 統計情報の更新（正解時のみ）
        if (cachedResult.success && updates.statsIncrement) {
          const now = Date.now();

          // 開始時間の初期化
          if (!this._state.stats.startTime) {
            this._state.stats.startTime = now;
          }
          if (!this._state.stats.currentProblemStartTime) {
            this._state.stats.currentProblemStartTime = now;
          }

          // カウンターの更新
          this._state.stats.correctKeyCount += updates.statsIncrement;
        }
      }

      // 表示情報を最小限更新（UI負荷最小化）
      if (cachedResult.success) {
        // キャッシュから復元可能な表示情報を優先使用
        if (cachedResult.displayUpdates) {
          Object.assign(this._state.display, cachedResult.displayUpdates);
        } else {
          // 後方互換性のためのフォールバック
          this._fastUpdateDisplayInfoMinimal();
        }
      } else if (!cachedResult.success) {
        // エラー表示の設定
        this._state.display.isError = true;

        // エラー表示のクリアをスケジュール（非同期・ブロッキングしない）
        if (this._errorAnimationTimerId) {
          clearTimeout(this._errorAnimationTimerId);
        }

        this._errorAnimationTimerId = setTimeout(() => {
          this._state.display.isError = false;
          this._errorAnimationTimerId = null;
        }, 200);
      }

      // キャッシュ済み結果を返却
      return cachedResult.result;
    }

    // 既存のセッション処理を使用
    const result = session.processInput(halfWidthChar);

    // 処理結果に基づいて状態を更新
    if (result.success) {
      // 正解時の処理
      const now = Date.now();

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

      // 表示情報を最小限更新（最も負荷の少ないメソッド）
      this._fastUpdateDisplayInfoMinimal();

      // 統計情報のスロットリング更新（さらに頻度を下げる）
      this._updateStatsThrottled(2000); // 2000msに1回程度に制限

      // 結果をキャッシュに保存（次回の高速化のため）
      if (!this._inputResultCache) {
        this._inputResultCache = new Map();
      }

      // キャッシュサイズを管理（メモリ使用を制限）
      if (this._inputResultCache.size > 1000) {
        // 最も古い20%のエントリを削除
        const entries = Array.from(this._inputResultCache.keys());
        const removeCount = Math.floor(entries.length * 0.2);
        entries.slice(0, removeCount).forEach(key => {
          this._inputResultCache.delete(key);
        });
      }

      // 状態更新情報を含めてキャッシュ
      this._inputResultCache.set(cacheKey, {
        result,
        success: true,
        stateUpdates: {
          currentCharIndex: this._state.internal.currentCharIndex,
          typedRomaji: this._state.internal.typedRomaji,
          currentInput: this._state.internal.currentInput,
          completed: this._state.internal.completed,
          typedLength: this._state.display.typedLength,
          statsIncrement: 1
        },
        displayUpdates: {
          typedLength: this._state.display.typedLength,
          nextChar: this._state.display.nextChar,
          currentInput: this._state.display.currentInput,
          currentCharRomaji: this._state.display.currentCharRomaji,
          inputMode: this._state.display.inputMode
        }
      });
    } else {
      // 不正解時の処理
      // 統計情報を更新
      this._state.stats.mistakeCount += 1;

      // エラーアニメーション状態を設定
      this._state.display.isError = true;

      // エラー状態のクリア処理は遅延させてメインスレッドをブロックしない
      if (this._errorAnimationTimerId) {
        clearTimeout(this._errorAnimationTimerId);
      }

      this._errorAnimationTimerId = setTimeout(() => {
        this._state.display.isError = false;
        this._errorAnimationTimerId = null;
      }, 200);

      // エラー結果もキャッシュに保存
      if (!this._inputResultCache) {
        this._inputResultCache = new Map();
      }

      this._inputResultCache.set(cacheKey, {
        result,
        success: false,
        stateUpdates: null
      });
    }

    // パフォーマンス計測・ログ出力（開発時のみ）
    if (performance.now && (process.env.NODE_ENV === 'development')) {
      const processingTime = performance.now() - perfStartTime;
      if (processingTime > 16.67) { // 60fps相当のフレーム時間
        console.warn(`[TypingModelMCP] 処理時間が最適以下: ${processingTime.toFixed(2)}ms`);
      }
    }

    return result;
  }

  /**
   * 最小限の表示情報更新（レスポンス重視）
   * 必須項目のみを直接更新し、イベント発行なしで最速で処理
   * @private
   */
  _fastUpdateDisplayInfoMinimal() {
    const session = this._state.internal.session;
    if (!session) return;

    try {
      // 必要最低限の情報だけを直接更新（最大パフォーマンス向上）
      const coloringInfo = session.getColoringInfo();

      // 表示で必要な属性のみ更新
      this._state.display.typedLength = coloringInfo.typedLength || 0;
      this._state.display.nextChar = coloringInfo.expectedNextChar || '';
      this._state.display.currentInput = coloringInfo.currentInput || '';

      // 子音入力状態の判定は軽量実装に置き換え
      if (coloringInfo.currentInput) {
        const currentInput = coloringInfo.currentInput;
        const currentCharRomaji = coloringInfo.currentCharRomaji || '';
        this._state.display.inputMode =
          currentCharRomaji && currentInput && currentCharRomaji.length > currentInput.length
            ? 'consonant' : 'normal';
        this._state.display.currentCharRomaji = currentCharRomaji;
      }
    } catch (error) {
      // エラーが発生しても処理を続行
      console.error('[TypingModelMCP] 表示情報更新エラー:', error);
    }
  }

  /**
   * 内部メソッド: スロットリングされた統計情報の更新
   * 指定時間内の連続呼び出しを制限
   * @param {number} throttleTime スロットリング時間(ms)
   * @private
   */
  _updateStatsThrottled(throttleTime = 1000) {
    // パフォーマンス重視のため、厳しいスロットリングを適用
    const now = Date.now();
    const lastUpdateTime = this._lastStatsUpdateTime || 0;
    const statsUpdateThrottleTime = throttleTime;

    if (!this._statsUpdateTimerId && now - lastUpdateTime > statsUpdateThrottleTime) {
      this._statsUpdateTimerId = setTimeout(() => {
        this._calculateStats();
        this._lastStatsUpdateTime = Date.now();
        this._statsUpdateTimerId = null;
      }, 200); // 非同期で実行して入力遅延を防止
    }
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