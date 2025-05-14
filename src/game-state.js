/**
 * Game State Manager
 *
 * 超高性能タイピングゲーム用ゲーム状態管理モジュール
 * - 効率的な状態管理
 * - 不変データ構造の活用
 * - パフォーマンスを最適化した設計
 */

// 設定
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * 定数
 */
export const GAME_STATES = Object.freeze({
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETED: 'completed',
});

/**
 * 効率的な状態更新のためのユーティリティ関数
 * 新しいオブジェクトを作成せず、対象オブジェクトを直接更新
 * ※通常のReactの不変性原則とは異なる実装。パフォーマンス最適化のため
 *
 * @param {Object} target 更新対象オブジェクト
 * @param {Object} updates 更新内容
 * @returns {Object} 更新されたオブジェクト（同一参照）
 */
const fastUpdate = (target, updates) => {
  Object.keys(updates).forEach((key) => {
    target[key] = updates[key];
  });
  return target;
};

/**
 * タイピングゲーム状態管理クラス
 * ゲームの状態を一元管理し、最適化された更新メソッドを提供
 */
export default class GameState {
  /**
   * コンストラクタ
   * @param {Object} initialState 初期状態
   */
  constructor(initialState = {}) {
    // ゲームの基本状態
    this.state = {
      // ゲームの全体進行状態
      currentState: GAME_STATES.READY,
      score: 0,
      solvedCount: 0,
      requiredProblemCount: 0,
      startTime: 0,
      elapsedTime: 0,
      remainingTime: 60,
      progress: 0,
      kpm: 0,

      // 現在の問題情報
      problem: {
        text: '',
        hiragana: '',
        romaji: '',
        difficulty: 1,
      },

      // タイピング状態
      typing: {
        romaji: '',
        typedLength: 0,
        currentCharIndex: 0,
        isError: false,
        nextKey: '',
        lastPressedKey: '',
        inputMode: 'normal',
      },

      // UI状態
      ui: {
        showKeyboard: true,
        showDebugInfo: DEBUG,
        sfxVolume: 0.5,
        bgmVolume: 0.3,
      },

      // パフォーマンス計測
      performance: {
        lastKeyPressTime: 0,
        lastRenderTime: 0,
        keyToRenderLatency: 0,
        renderDuration: 0,
        totalKeyPresses: 0,
        totalFrames: 0,
        droppedFrames: 0,
      },
    };

    // 初期状態でオーバーライド
    if (initialState) {
      this.state = { ...this.state, ...initialState };
    }

    // 状態変更を通知するコールバック
    this.listeners = [];

    // バインディング（常に同じ関数参照を使用）
    this.update = this.update.bind(this);
    this.getState = this.getState.bind(this);
    this.getTypingState = this.getTypingState.bind(this);
    this.getProblem = this.getProblem.bind(this);
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 現在のゲーム状態
   */
  getState() {
    return this.state;
  }

  /**
   * タイピング状態を取得
   * @returns {Object} 現在のタイピング状態
   */
  getTypingState() {
    return this.state.typing;
  }

  /**
   * 現在の問題を取得
   * @returns {Object} 現在の問題情報
   */
  getProblem() {
    return this.state.problem;
  }

  /**
   * 状態を高速に更新
   * @param {Object} updates 更新する状態
   * @returns {GameState} このインスタンス（メソッドチェーン用）
   */
  update(updates) {
    if (!updates) return this;

    const prevState = { ...this.state };

    // 最適化のための直接更新
    fastUpdate(this.state, updates);

    // 更新の影響範囲を分析
    const changedPaths = this._analyzeChanges(prevState, this.state);

    // リスナーに変更を通知
    if (changedPaths.length > 0) {
      this._notifyListeners(changedPaths);
    }

    return this;
  }

  /**
   * タイピング状態のみを高速更新
   * @param {Object} typingUpdates タイピング状態の更新内容
   * @returns {GameState} このインスタンス
   */
  updateTyping(typingUpdates) {
    if (!typingUpdates) return this;

    const prevTyping = { ...this.state.typing };

    // タイピング状態の直接更新
    fastUpdate(this.state.typing, typingUpdates);

    // タイピング状態に関するリスナーのみ通知
    this._notifyListeners(['typing']);

    return this;
  }

  /**
   * 問題情報の更新
   * @param {Object} problemData 新しい問題データ
   * @returns {GameState} このインスタンス
   */
  setProblem(problemData) {
    if (!problemData) return this;

    // 問題情報の更新
    fastUpdate(this.state.problem, problemData);

    // タイピング状態をリセット
    fastUpdate(this.state.typing, {
      romaji: problemData.romaji || '',
      typedLength: 0,
      currentCharIndex: 0,
      isError: false,
      nextKey: problemData.romaji ? problemData.romaji[0] : '',
      lastPressedKey: '',
    });

    // 関連リスナーに通知
    this._notifyListeners(['problem', 'typing']);

    return this;
  }

  /**
   * パフォーマンスメトリクスの更新
   * @param {Object} metrics パフォーマンス測定値
   * @returns {GameState} このインスタンス
   */
  updatePerformanceMetrics(metrics) {
    if (!metrics) return this;

    // パフォーマンスメトリクスの直接更新
    fastUpdate(this.state.performance, metrics);

    // デバッグモードの場合のみリスナーに通知
    if (DEBUG) {
      this._notifyListeners(['performance']);
    }

    return this;
  }

  /**
   * 状態変更リスナーの登録
   * @param {Function} listener 状態変更時に呼び出すコールバック関数
   * @param {Array<string>} paths 監視するパス（例：['typing', 'problem']）
   */
  subscribe(listener, paths = null) {
    this.listeners.push({ callback: listener, paths });
    return () => this.unsubscribe(listener);
  }

  /**
   * 状態変更リスナーの解除
   * @param {Function} listener 解除するリスナー関数
   */
  unsubscribe(listener) {
    const index = this.listeners.findIndex((l) => l.callback === listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 変更のあったパスの分析
   * @param {Object} prevState 前の状態
   * @param {Object} nextState 新しい状態
   * @returns {Array<string>} 変更のあったパス
   * @private
   */
  _analyzeChanges(prevState, nextState) {
    const changedPaths = [];

    // トップレベルの変更チェック
    Object.keys(nextState).forEach((key) => {
      if (prevState[key] !== nextState[key]) {
        changedPaths.push(key);
      }
    });

    return changedPaths;
  }

  /**
   * 状態変更リスナーへの通知
   * @param {Array<string>} changedPaths 変更のあったパス
   * @private
   */
  _notifyListeners(changedPaths) {
    this.listeners.forEach(({ callback, paths }) => {
      // パスが指定されていない場合は常に通知
      if (!paths) {
        callback(this.state, changedPaths);
        return;
      }

      // 監視対象のパスに変更があった場合のみ通知
      const shouldNotify = paths.some((path) => changedPaths.includes(path));
      if (shouldNotify) {
        callback(this.state, changedPaths);
      }
    });
  }

  /**
   * 次に入力するキーの取得
   * @returns {string} 次に入力するキー
   */
  getNextKey() {
    const { romaji, typedLength } = this.state.typing;

    if (!romaji || typedLength >= romaji.length) {
      return '';
    }

    return romaji.charAt(typedLength);
  }

  /**
   * キー入力の処理
   * @param {string} key 入力されたキー
   * @returns {boolean} 入力が正しかったかどうか
   */
  processKeyInput(key) {
    const { typing } = this.state;
    const { romaji, typedLength } = typing;

    // 問題が完了している場合
    if (!romaji || typedLength >= romaji.length) {
      return false;
    }

    // 次に入力すべきキー
    const nextKey = romaji.charAt(typedLength);

    // 正しい入力かどうか
    const isCorrect = key === nextKey;

    if (isCorrect) {
      // 正しい入力の場合
      this.updateTyping({
        typedLength: typedLength + 1,
        isError: false,
        lastPressedKey: key,
        nextKey:
          typedLength + 1 < romaji.length ? romaji.charAt(typedLength + 1) : '',
      });

      // 問題が完了したかどうか
      if (typedLength + 1 >= romaji.length) {
        this._handleProblemCompleted();
      }
    } else {
      // 誤った入力の場合
      this.updateTyping({
        isError: true,
        lastPressedKey: key,
      });
    }

    // パフォーマンス計測用
    this.state.performance.lastKeyPressTime = performance.now();
    this.state.performance.totalKeyPresses++;

    return isCorrect;
  }

  /**
   * 問題完了時の処理
   * @private
   */
  _handleProblemCompleted() {
    // スコア計算
    const typingTime = performance.now() - this.state.startTime;
    const kpm = (this.state.typing.romaji.length / typingTime) * 60000;

    // 状態更新
    this.update({
      solvedCount: this.state.solvedCount + 1,
      kpm,
      progress:
        ((this.state.solvedCount + 1) / this.state.requiredProblemCount) * 100,
    });

    // ゲーム完了判定
    if (this.state.solvedCount + 1 >= this.state.requiredProblemCount) {
      this.update({ currentState: GAME_STATES.COMPLETED });
    }
  }

  /**
   * ゲーム開始処理
   * @param {number} problemCount 必要な問題数
   * @param {number} timeLimit 制限時間（秒）
   */
  startGame(problemCount = 10, timeLimit = 60) {
    this.update({
      currentState: GAME_STATES.PLAYING,
      startTime: performance.now(),
      elapsedTime: 0,
      remainingTime: timeLimit,
      score: 0,
      solvedCount: 0,
      requiredProblemCount: problemCount,
      progress: 0,
    });
  }

  /**
   * ゲーム一時停止
   */
  pauseGame() {
    this.update({
      currentState: GAME_STATES.PAUSED,
    });
  }

  /**
   * ゲーム再開
   */
  resumeGame() {
    this.update({
      currentState: GAME_STATES.PLAYING,
    });
  }

  /**
   * 経過時間の更新
   * @param {number} deltaTime 経過時間（ミリ秒）
   */
  updateTime(deltaTime) {
    const elapsedSeconds = deltaTime / 1000;
    const elapsedTime = this.state.elapsedTime + elapsedSeconds;
    const remainingTime = Math.max(
      0,
      this.state.remainingTime - elapsedSeconds
    );

    this.update({
      elapsedTime,
      remainingTime,
    });

    // 時間切れ判定
    if (remainingTime <= 0 && this.state.currentState === GAME_STATES.PLAYING) {
      this.update({
        currentState: GAME_STATES.COMPLETED,
      });
    }
  }
}
