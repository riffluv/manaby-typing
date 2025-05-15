/**
 * High Performance Input Handler
 *
 * 超高性能タイピングゲーム用入力処理モジュール
 * - イベントハンドリングの最適化
 * - メモリ割り当て最小化
 * - 処理の無駄を徹底排除
 */

// 設定
const THROTTLE_TIME = 0; // 入力スロットリング（0で無効）
const DEBUG = process.env.NODE_ENV === 'development';

// 効果音プレイヤーの遅延インポート（循環参照を避けるため）
let playInstantTypingSound;
if (typeof window !== 'undefined') {
  import('./AudioInitializer').then((module) => {
    playInstantTypingSound = module.playInstantTypingSound;
  });
}

/**
 * InputHandlerクラス
 * キーボード入力を高速に処理して描画パイプラインに伝播
 */
export default class InputHandler {
  /**
   * コンストラクタ
   * @param {Object} options 設定オプション
   * @param {Function} options.onKeyDown キー押下時のコールバック関数
   * @param {Function} options.onKeyUp キー解放時のコールバック関数
   * @param {Function} options.onError エラー時のコールバック関数
   * @param {CanvasEngine} options.canvasEngine キャンバスエンジンの参照
   */
  constructor(options = {}) {
    // コールバック関数
    this.onKeyDown = options.onKeyDown || null;
    this.onKeyUp = options.onKeyUp || null;
    this.onError = options.onError || null;

    // キャンバスエンジンの参照
    this.canvasEngine = options.canvasEngine || null;

    // キー状態
    this.keyStates = new Map();
    this.lastPressedKey = '';

    // スロットリング用
    this.lastKeyDownTime = 0;
    this.pendingKeyDown = null;
    this.throttleTimeoutId = null;

    // パフォーマンストラッキング
    this.metrics = {
      totalKeyPresses: 0,
      processingTimes: [],
      maxProcessingTime: 0,
      averageProcessingTime: 0,
      keyToRenderLatency: 0,
    };

    // ハンドラー関数をバインド（常に同じ関数参照を使用）
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
  }
  /**
   * イベントリスナー登録
   */
  initialize() {
    // keydownとkeyupイベントリスナーを追加 - 高優先度と明示的なpassive設定
    window.addEventListener('keydown', this._handleKeyDown, {
      passive: false,
      capture: true, // キャプチャフェーズで処理（他のハンドラより先に実行）
    });
    window.addEventListener('keyup', this._handleKeyUp, { passive: true });

    // デバッグログ
    if (DEBUG) {
      console.log('[InputHandler] イベントリスナー登録完了');
    }

    return this;
  }

  /**
   * イベントリスナー解除
   */
  cleanup() {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);

    // スロットリングのクリーンアップ
    if (this.throttleTimeoutId) {
      clearTimeout(this.throttleTimeoutId);
      this.throttleTimeoutId = null;
    }

    // デバッグログ
    if (DEBUG) {
      console.log('[InputHandler] イベントリスナー解除完了');
    }

    return this;
  }
  /**
   * キー押下イベントのハンドリング
   * @param {KeyboardEvent} event キーボードイベント
   * @private
   */
  _handleKeyDown(event) {
    const startTime = performance.now();

    // 高速パス: 1文字の文字入力のみに最適化（タイピング処理の高速化）
    if (event.key.length === 1) {
      // 文字入力はデフォルト動作を防止（スクロールなど）
      event.preventDefault();

      // キーコードと文字の取得（小文字化）
      const key = event.key.toLowerCase();

      // タイムスタンプを記録
      this.lastKeyDownTime = startTime;

      // すでに押されているキーの場合は無視（キーリピート対応）
      if (this.keyStates.get(key)) {
        return;
      }

      // 即座に処理（スロットリングなしで直接処理）
      this._processKeyDown(key);

      // 処理時間を計測
      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      return;
    }

    // 通常パス: 特殊キー処理
    // イベントのデフォルト動作を防止（スクロールなど）
    // Tabキーなど特定のキーは例外とする
    if (
      ![
        'Tab',
        'F1',
        'F2',
        'F3',
        'F4',
        'F5',
        'F6',
        'F7',
        'F8',
        'F9',
        'F10',
        'F11',
        'F12',
      ].includes(event.key)
    ) {
      event.preventDefault();
    }

    // キーコードと文字の取得
    const key = event.key.toLowerCase();

    // 計測用のタイムスタンプを記録
    this.lastKeyDownTime = startTime;

    // すでに押されているキーの場合は無視（キーリピート対応）
    if (this.keyStates.get(key)) {
      return;
    }

    // スロットリング処理
    if (THROTTLE_TIME > 0) {
      const timeSinceLastKeyDown = startTime - this.lastKeyDownTime;

      // 前回のキー入力からの経過時間がスロットリング時間未満の場合
      if (timeSinceLastKeyDown < THROTTLE_TIME) {
        // 既存のタイムアウトがあればクリア
        if (this.throttleTimeoutId) {
          clearTimeout(this.throttleTimeoutId);
        }

        // 保留中のキー入力を更新
        this.pendingKeyDown = key;

        // スロットリング時間経過後に処理を実行
        this.throttleTimeoutId = setTimeout(() => {
          this._processKeyDown(this.pendingKeyDown);
          this.pendingKeyDown = null;
          this.throttleTimeoutId = null;
        }, THROTTLE_TIME - timeSinceLastKeyDown);

        return;
      }
    }

    // キー入力を処理
    this._processKeyDown(key);

    // パフォーマンス計測
    const processingTime = performance.now() - startTime;
    this._updateMetrics(processingTime);
  }

  /**
   * キー解放イベントのハンドリング
   * @param {KeyboardEvent} event キーボードイベント
   * @private
   */
  _handleKeyUp(event) {
    // キーコードの取得
    const key = event.key.toLowerCase();

    // キーの状態を更新
    this.keyStates.set(key, false);

    // コールバック関数を呼び出し
    if (this.onKeyUp) {
      try {
        this.onKeyUp(key);
      } catch (error) {
        this._handleError(error);
      }
    }
  }

  /**
   * キー入力の処理
   * @param {string} key 押されたキー
   * @private
   */
  _processKeyDown(key) {
    // 処理開始時間を記録（パフォーマンス計測用）
    const processStartTime = performance.now();

    // キーの状態を更新
    this.keyStates.set(key, true);
    this.lastPressedKey = key;

    try {
      // 【最適化】処理順序を変更：音 → 視覚 → ロジック

      // 1. 最優先：音のフィードバック - 超低レイテンシで効果音を再生
      if (playInstantTypingSound) {
        // 正解・不正解をここではチェックせず、即座にサウンドを再生
        playInstantTypingSound('success');
      }

      // 2. 次に優先：視覚的フィードバック
      // キャンバスエンジンにキー入力タイミングを通知して即時描画
      if (this.canvasEngine) {
        this.canvasEngine.recordKeyPress();
        // 即時視覚フィードバックのための描画更新
        if (typeof this.canvasEngine.render === 'function') {
          this.canvasEngine.render();
        }
      }

      // 3. 最後：ゲームロジックの処理
      // メトリクス更新
      this.metrics.totalKeyPresses++;

      // コールバック関数を呼び出し (ロジック処理)
      if (this.onKeyDown) {
        this.onKeyDown(key);
      }

      // パフォーマンス計測
      this.metrics.keyToRenderLatency = performance.now() - processStartTime;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * エラーハンドリング
   * @param {Error} error エラーオブジェクト
   * @private
   */
  _handleError(error) {
    console.error('[InputHandler] エラーが発生しました:', error);

    // エラーコールバック関数を呼び出し
    if (this.onError) {
      try {
        this.onError(error);
      } catch (e) {
        console.error(
          '[InputHandler] エラーハンドラでエラーが発生しました:',
          e
        );
      }
    }
  }

  /**
   * パフォーマンスメトリクスの更新
   * @param {number} processingTime 処理時間
   * @private
   */
  _updateMetrics(processingTime) {
    // 処理時間を記録（最新100件のみ保持）
    this.metrics.processingTimes.push(processingTime);
    if (this.metrics.processingTimes.length > 100) {
      this.metrics.processingTimes.shift();
    }

    // 最大処理時間を更新
    this.metrics.maxProcessingTime = Math.max(
      this.metrics.maxProcessingTime,
      processingTime
    );

    // 平均処理時間を計算
    const sum = this.metrics.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageProcessingTime =
      sum / this.metrics.processingTimes.length;
  }

  /**
   * パフォーマンスメトリクスの取得
   * @returns {Object} パフォーマンスメトリクス
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 最後に押されたキーの取得
   * @returns {string} 最後に押されたキー
   */
  getLastPressedKey() {
    return this.lastPressedKey;
  }

  /**
   * キーの状態を取得
   * @param {string} key キー
   * @returns {boolean} キーが押されているかどうか
   */
  isKeyDown(key) {
    return Boolean(this.keyStates.get(key));
  }
}
