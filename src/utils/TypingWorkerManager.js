/**
 * タイピング処理をWeb Workerに委譲するためのマネージャクラス
 * メインスレッドのブロッキングを防ぎ、タイピングの反応速度を最大化
 */
export class TypingWorkerManager {
  constructor() {
    this._worker = null;
    this._callbacks = new Map();
    this._callbackId = 0;
    this._lastSession = null;
    this._initializationPromise = null;
    this._inputHistory = []; // 入力履歴を保持

    // 自動初期化
    this._initialize();
  }

  /**
   * Workerの初期化
   * @returns {Promise} 初期化完了を示すPromise
   */
  _initialize() {
    if (this._initializationPromise) {
      return this._initializationPromise;
    }

    this._initializationPromise = new Promise((resolve, reject) => {
      try {
        // WorkerをWeb Worker APIを使って初期化
        this._worker = new Worker(
          new URL('../workers/typing-worker.js', import.meta.url)
        );

        // メッセージハンドラの設定
        this._worker.onmessage = (e) => {
          const { type, data, callbackId } = e.data;

          // コールバックIDがある場合は、対応するコールバックを実行
          if (callbackId && this._callbacks.has(callbackId)) {
            const callback = this._callbacks.get(callbackId);
            this._callbacks.delete(callbackId);
            callback(data);
            return;
          }

          // 各メッセージタイプに応じた処理
          switch (type) {
            case 'processInputResult':
              if (data.success && data.session) {
                // セッション状態を更新
                this._lastSession = this._reconstructSession(data.session);
              }
              break;

            case 'pong':
              // 生存確認の応答
              console.log(
                'Worker is alive, response time:',
                Date.now() - data.received,
                'ms'
              );
              break;
          }
        };

        // エラーハンドラの設定
        this._worker.onerror = (error) => {
          console.error('Typing Worker error:', error);
          reject(error);
        };

        // 生存確認のメッセージを送信
        this._worker.postMessage({
          type: 'ping',
          data: { sent: Date.now() },
        });

        resolve();
      } catch (error) {
        console.error('Failed to initialize Typing Worker:', error);
        // Workerの初期化に失敗した場合は、フラグをリセット
        this._worker = null;
        this._initializationPromise = null;
        reject(error);
      }
    });

    return this._initializationPromise;
  }

  /**
   * セッションオブジェクトを Worker に送信可能な形式に変換（関数を除外）
   */
  _serializeSession(session) {
    if (!session) return null;

    // 関数を含まないプロパティのみを抽出
    return {
      originalText: session.originalText,
      kanaText: session.kanaText,
      displayRomaji: session.displayRomaji,
      patterns: session.patterns,
      patternLengths: session.patternLengths,
      displayIndices: session.displayIndices,
      currentCharIndex: session.currentCharIndex,
      typedRomaji: session.typedRomaji,
      currentInput: session.currentInput,
      completed: session.completed,
      completedAt: session.completedAt,
    };
  }

  /**
   * Worker からのデータを元のセッションオブジェクトに再構築
   */
  _reconstructSession(sessionData) {
    // 単純にデータを返すだけでOK（関数は別途参照する）
    return sessionData;
  }

  /**
   * Workerが有効かどうかを確認
   * @returns {boolean} Workerが利用可能かどうか
   */
  isWorkerAvailable() {
    return !!this._worker;
  }

  /**
   * キー入力を処理する - この処理はメインスレッドでも行う
   * @param {Object} session - タイピングセッション
   * @param {string} char - 入力された文字
   * @param {boolean} isCorrect - 正しい入力かどうか（統計用）
   * @returns {Promise} 処理結果を含むPromise
   */
  async processInput(session, char, isCorrect = null) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // 入力履歴に追加（統計用）
    if (char) {
      this._inputHistory.push({
        key: char,
        isCorrect: isCorrect,
        timestamp: Date.now(),
      });
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, (result) => {
        resolve(result);
      });

      // セッションをシリアライズして関数を除去
      const serializedSession = this._serializeSession(session);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'processInput',
        callbackId,
        data: {
          session: serializedSession,
          char,
        },
      });
    });
  }

  /**
   * 色分け情報を取得 - この処理はメインスレッドでも行う
   * @param {Object} session - タイピングセッション
   * @returns {Promise} 色分け情報を含むPromise
   */
  async getColoringInfo(session) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // セッションをシリアライズして関数を除去
      const serializedSession = this._serializeSession(
        session || this._lastSession
      );

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'getColoringInfo',
        callbackId,
        data: {
          session: serializedSession,
        },
      });
    });
  }

  /**
   * 統計情報を計算（非同期） - この処理はWorkerで行う
   * @param {Object} statsData - 統計計算に必要なデータ
   * @returns {Promise} 計算結果を含むPromise
   */
  async calculateStatistics(statsData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'calculateStatistics',
        callbackId,
        data: statsData,
      });
    });
  }

  /**
   * ランキング送信（非同期） - この処理はWorkerで行う
   * @param {Object} recordData - 送信するランキングデータ
   * @returns {Promise} 送信結果を含むPromise
   */
  async submitRanking(recordData) {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'submitRanking',
        callbackId,
        data: recordData,
      });
    });
  }

  /**
   * 入力履歴の処理と集計（非同期） - この処理はWorkerで行う
   * @returns {Promise} 集計結果を含むPromise
   */
  async processInputHistory() {
    if (!this._worker) {
      try {
        await this._initialize();
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // 入力履歴がなければ処理不要
    if (this._inputHistory.length === 0) {
      return Promise.resolve({ success: false, error: '入力履歴がありません' });
    }

    return new Promise((resolve) => {
      const callbackId = this._getNextCallbackId();

      // コールバックを登録
      this._callbacks.set(callbackId, resolve);

      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'processInputHistory',
        callbackId,
        data: {
          inputHistory: this._inputHistory,
        },
      });
    });
  }

  /**
   * 入力履歴をクリア
   */
  clearInputHistory() {
    this._inputHistory = [];
  }

  /**
   * コールバックIDの生成
   * @returns {number} 一意のコールバックID
   */
  _getNextCallbackId() {
    return this._callbackId++;
  }

  /**
   * リソースの解放
   */
  terminate() {
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
    this._callbacks.clear();
    this._lastSession = null;
    this._initializationPromise = null;
    this._inputHistory = [];
  }
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

export default typingWorkerManager;
