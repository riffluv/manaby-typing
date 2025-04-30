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
        this._worker = new Worker(new URL('../workers/typing-worker.js', import.meta.url));
        
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
              console.log('Worker is alive, response time:', Date.now() - data.received, 'ms');
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
          data: { sent: Date.now() }
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
      completedAt: session.completedAt
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
   * キー入力を処理する
   * @param {Object} session - タイピングセッション
   * @param {string} char - 入力された文字
   * @returns {Promise} 処理結果を含むPromise
   */
  async processInput(session, char) {
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
      const serializedSession = this._serializeSession(session);
      
      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'processInput',
        callbackId,
        data: {
          session: serializedSession,
          char
        }
      });
    });
  }

  /**
   * 色分け情報を取得
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
      const serializedSession = this._serializeSession(session || this._lastSession);
      
      // Workerにメッセージを送信
      this._worker.postMessage({
        type: 'getColoringInfo',
        callbackId,
        data: {
          session: serializedSession
        }
      });
    });
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
  }
}

// シングルトンインスタンスを作成
const typingWorkerManager = new TypingWorkerManager();

export default typingWorkerManager;