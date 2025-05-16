/**
 * Enhanced Canvas Rendering Engine for High-Performance Typing Game
 *
 * 拡張バージョン（2025年5月15日）
 * タイピングゲーム専用のCanvas描画エンジン
 * - 問題テキスト表示とタイピング状態表示に特化
 * - 高性能な描画処理
 * - 極限までのパフォーマンス最適化
 */

// デバッグモード設定
const DEBUG = process.env.NODE_ENV === 'development';

// 固定サイズ設定（最適化のため）
const DEFAULT_SETTINGS = Object.freeze({
  width: 800,
  height: 600,
  fontFamily: "'SF Mono', Monaco, Consolas, monospace",
  fontSize: 24,
  backgroundColor: '#1a1a1a',
  textColor: '#ffffff',
  typedColor: '#88FF88', // 入力済み文字の色（青から緑に変更）
  highlightColor: '#FFB41E', // 入力中の文字の色（明るいオレンジに変更）
  errorColor: '#ff3333', // エラー時の色
  nextCharColor: '#88FF88', // 次の文字の色（青から緑に変更）
  keyboardHeight: 200,
  animationDuration: 150, // ms
  showErrorHighlight: false, // エラー表示のオン/オフを制御するフラグ
  // パフォーマンス設定
  useOffscreenCanvas: true,
  useImageCaching: true,
  preRenderChars: true,
  useRequestAnimationFrame: true,
});

/**
 * CanvasTypingEngineクラス
 * タイピングゲーム専用のCanvas描画エンジン
 */
export default class CanvasTypingEngine {
  /**
   * コンストラクタ
   * @param {Object} options 設定オプション
   */
  constructor(options = {}) {
    // 設定の統合
    this.settings = { ...DEFAULT_SETTINGS, ...options };

    // キャンバス要素と2D描画コンテキスト
    this.canvas = null;
    this.ctx = null;

    // オフスクリーンキャンバス
    this.offscreenCanvas = null;
    this.offscreenCtx = null;

    // アニメーション管理
    this.animationFrameId = null;
    this.isAnimating = false;
    this.lastRenderTime = 0;
    this.frameCount = 0;
    this.fps = 0;

    // パフォーマンス測定 - 拡張版
    this.performanceMetrics = {
      // レンダリング関連
      lastRenderDuration: 0,
      averageRenderTime: 0,

      // キー入力レイテンシ関連
      keyPressToRenderLatency: 0,
      lastKeyPressTime: 0,
      renderStartTime: 0,

      // キー入力処理時間
      lastInputProcessTime: 0,
      lastRenderAfterInputTime: 0,
      keyPressHistory: [], // 入力履歴（タイムスタンプ、レンダリング時間、レイテンシ）

      // フレーム関連
      totalFrames: 0,
      droppedFrames: 0,

      // デバッグ情報
      inputToRenderDelays: [], // 入力から描画までの遅延履歴（最大10件）
      averageInputLatency: 0, // 平均入力レイテンシ
    };

    // ゲーム状態参照
    this.gameState = null;

    // キーフォーカス管理用の状態
    this.partialKeys = ''; // 現在入力中のローマ字
    this.currentFocus = ''; // 現在フォーカス中のキー(次に期待されるキー)

    // 描画制御フラグ
    this._needsRender = true; // 描画が必要かどうかのフラグ
    this._lastRenderTime = 0; // 最終描画時刻

    // バインディング
    this._renderFrame = this._renderFrame.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * キャンバスエンジンの初期化
   * @param {HTMLCanvasElement} canvas ターゲットキャンバス要素
   * @param {Object} gameState ゲーム状態
   * @returns {CanvasTypingEngine} このインスタンス（メソッドチェーン用）
   */
  initialize(canvas, gameState = {}) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('有効なcanvas要素が必要です');
    }

    // キャンバス設定
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // レイテンシ低減のため
    });

    // ゲーム状態設定
    this.gameState = gameState;

    // キャンバスサイズ設定 - ピクセル比を考慮
    this._setupCanvasSize();

    // オフスクリーンキャンバス作成（必要な場合）
    if (this.settings.useOffscreenCanvas) {
      this._setupOffscreenCanvas();
    }

    // 初期描画
    this.render();

    return this;
  }

  /**
   * キャンバスサイズの設定 - デバイスピクセル比を考慮した高品質表示
   * @private
   */
  _setupCanvasSize() {
    const { width, height } = this.settings;
    const dpr = window.devicePixelRatio || 1;

    // キャンバス内部バッファサイズ設定
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // CSS表示サイズ設定
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // コンテキストスケール設定
    this.ctx.scale(dpr, dpr);

    // デフォルト描画スタイル設定
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.imageSmoothingEnabled = false; // ピクセルアートのクリアな表示用

    // フォントを設定（読み込み確実性のため）
    document.fonts.ready.then(() => {
      this.render(); // フォント読み込み後に再描画
    });
  }

  /**
   * オフスクリーンキャンバスの設定（パフォーマンス向上）
   * @private
   */
  _setupOffscreenCanvas() {
    // オフスクリーンキャンバス作成
    this.offscreenCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    this.offscreenCanvas.width = this.settings.width * dpr;
    this.offscreenCanvas.height = this.settings.height * dpr;

    // オフスクリーンコンテキスト取得
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });
    this.offscreenCtx.scale(dpr, dpr);

    // スタイル設定
    this.offscreenCtx.textBaseline = 'middle';
    this.offscreenCtx.textAlign = 'left';
    this.offscreenCtx.imageSmoothingEnabled = false;
  }
  /**
   * アニメーションループの開始
   * @returns {CanvasTypingEngine} このインスタンス
   */
  startAnimation() {
    if (this.isAnimating) return this;

    this.isAnimating = true;
    this.lastRenderTime = performance.now();
    this._needsRender = true; // 初回描画を強制
    this.animationFrameId = requestAnimationFrame(this._renderFrame);

    return this;
  }

  /**
   * アニメーションループの停止
   * @returns {CanvasTypingEngine} このインスタンス
   */
  stopAnimation() {
    if (!this.isAnimating) return this;

    this.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return this;
  }  /**
   * ゲーム状態の更新
   * @param {Object} newState 新しいゲーム状態
   */
  updateGameState(newState) {
    // 変更前の状態を保存（差分検出用）
    const prevState = this.gameState ? { ...this.gameState } : {};

    // 新しい状態をマージ
    this.gameState = { ...this.gameState, ...newState };

    // 重要な状態変化があったかチェック（差分検出）
    const hasImportantChange =
      prevState.romaji !== this.gameState.romaji ||
      prevState.typedLength !== this.gameState.typedLength ||
      prevState.isError !== this.gameState.isError ||
      prevState.currentInput !== this.gameState.currentInput;

    // 表示に関わる状態変更があった場合、描画フラグをセット
    if (hasImportantChange) {
      this._needsRender = true;
      // 描画は次のrequestAnimationFrameに任せる
    }
  }
  /**
   * キー入力時間の記録（レイテンシ測定用）
   * @returns {number} 現在の時刻（performance.now()の値）
   */
  recordKeyPress() {
    const now = performance.now();
    this.performanceMetrics.lastKeyPressTime = now;
    this.performanceMetrics.keyPressHistory =
      this.performanceMetrics.keyPressHistory || [];

    // 最大10件の入力履歴を保持
    if (this.performanceMetrics.keyPressHistory.length > 10) {
      this.performanceMetrics.keyPressHistory.shift();
    }

    // 入力履歴に追加
    this.performanceMetrics.keyPressHistory.push({
      timestamp: now,
      renderTime: 0,
      latency: 0,
    });

    return now;
  }

  /**
   * パフォーマンスメトリクスの取得
   * @returns {Object} パフォーマンスメトリクス
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }  /**
   * キー入力処理（状態更新のみ）
   * @param {string} key - 入力されたキー
   * @param {boolean} isCorrect - 正解かどうか
   */
  handleKeyInput(key, isCorrect = true) {
    // キー入力開始時間を記録（レイテンシ測定用）
    const startTime = performance.now();
    this.performanceMetrics.lastKeyPressTime = startTime;

    // 状態更新のみを行う（描画は行わない）
    if (this.gameState) {
      // エラー状態の更新
      this.gameState.isError = !isCorrect;
      
      // 正解の場合は部分入力を更新（新しいロジックでは単純化）
      if (isCorrect && key) {
        // 次の文字が期待されるキーと一致する場合、入力を進める
        const expectedPos = this.gameState.typedLength || 0;
        if (expectedPos < this.gameState.romaji?.length) {
          // ここでは部分入力を直接更新せず、gameStateに必要な情報のみ保持
          this.gameState.currentInput = key;
        }
      }
    }

    // 処理時間を計測（デバッグ用）
    const totalTime = performance.now() - startTime;
    this.performanceMetrics.lastInputProcessTime = totalTime;

    // 描画フラグを立てる（次のrequestAnimationFrameで描画される）
    this._needsRender = true;
  }  /**
   * 入力状態のリセット（ローマ字確定時）
   */
  resetInputState() {
    // 状態をリセット
    if (this.gameState) {
      // エラー状態をリセット
      this.gameState.isError = false;
      
      // 現在の入力をクリア
      this.gameState.currentInput = '';
    }

    // 描画フラグを立てる（次のフレームで描画）
    this._needsRender = true;
  }  /**
   * エラー状態のリセット
   */
  resetErrorState() {
    if (this.gameState) {
      this.gameState.isError = false;
      // エラー後に確実に再描画する
      this._needsRender = true;
      // 強制的に即時レンダリングを実行
      this.render(true);
    }
  }
  /**
   * 描画の実行 - 外部からの呼び出し用
   * 実際の描画は requestAnimationFrame のサイクルで行われる
   * @param {boolean} forceRender - アニメーション状態に関わらず強制描画する場合はtrue
   * @returns {CanvasTypingEngine} このインスタンス
   */
  render(forceRender = false) {
    // 描画フラグを立てるだけ - 実際の描画はrequestAnimationFrameのタイミングで行う
    this._needsRender = true;

    // アニメーションが停止していて強制描画が必要な場合のみ、1フレームだけ描画
    if (!this.isAnimating && forceRender) {
      this.animationFrameId = requestAnimationFrame(this._renderFrame);
    }

    return this;
  }
  /**
   * アニメーションフレームの描画 - 実際の描画処理
   * @param {number} timestamp タイムスタンプ
   * @private
   */
  _renderFrame(timestamp) {
    // 高精度タイムスタンプで描画開始時間を記録
    const startTime = performance.now();
    this.performanceMetrics.renderStartTime = startTime;

    // フレームレート計算
    this.frameCount++;
    const secondElapsed = timestamp - this.lastRenderTime;

    if (secondElapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / secondElapsed);
      this.frameCount = 0;
      this.lastRenderTime = timestamp;
    }

    // 描画コンテキストの取得（オフスクリーンかメインか）
    const ctx = this.settings.useOffscreenCanvas ? this.offscreenCtx : this.ctx;

    // 背景クリア
    ctx.fillStyle = this.settings.backgroundColor;
    ctx.fillRect(0, 0, this.settings.width, this.settings.height);

    // 問題テキストの描画
    this._renderProblem(ctx);

    // タイピングテキストの描画（最も重要な要素）
    // 状態ベースのレンダリングに変更
    this._renderTypingText(ctx);

    // バーチャルキーボードの描画
    this._renderKeyboard(ctx);

    // オフスクリーンバッファを使用している場合、メインキャンバスに転送
    if (this.settings.useOffscreenCanvas && this.offscreenCanvas) {
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    // レンダリング時間の計測
    const renderDuration = performance.now() - startTime;
    this._updatePerformanceMetrics(renderDuration);

    // キー入力からレンダリングまでのレイテンシ計測
    if (this.performanceMetrics.lastKeyPressTime > 0) {
      const latency = startTime - this.performanceMetrics.lastKeyPressTime;
      this.performanceMetrics.keyPressToRenderLatency = latency;

      // 履歴に追加（最大10件）
      this.performanceMetrics.inputToRenderDelays.push(latency);
      if (this.performanceMetrics.inputToRenderDelays.length > 10) {
        this.performanceMetrics.inputToRenderDelays.shift();
      }

      // 平均値の計算
      const sum = this.performanceMetrics.inputToRenderDelays.reduce(
        (a, b) => a + b,
        0
      );
      this.performanceMetrics.averageInputLatency =
        sum / this.performanceMetrics.inputToRenderDelays.length;

      // 計測後にリセット（次のフレームでの再計測のため）
      this.performanceMetrics.lastKeyPressTime = 0;
    }

    // 描画済みフラグをリセット
    this._needsRender = false;

    // 次のフレームのスケジュール（アニメーション中のみ）
    if (this.isAnimating) {
      this.animationFrameId = requestAnimationFrame(this._renderFrame);
    }
  }

  /**
   * パフォーマンス測定値の更新
   * @param {number} renderDuration 描画にかかった時間（ms）
   * @private
   */
  _updatePerformanceMetrics(renderDuration) {
    const metrics = this.performanceMetrics;

    // 単一フレーム測定値
    metrics.lastRenderDuration = renderDuration;

    // 移動平均の更新
    metrics.totalFrames++;
    metrics.averageRenderTime =
      metrics.averageRenderTime * 0.95 + renderDuration * 0.05;

    // フレームドロップの検出
    if (renderDuration > 16.67) {
      // 60FPS = 16.67ms/frame
      metrics.droppedFrames++;
    }
  }

  /**
   * パフォーマンス測定値の取得
   * @returns {Object} パフォーマンス測定値
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics, fps: this.fps };
  }

  /**
   * 問題テキストの描画
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderProblem(ctx) {
    if (!this.gameState || !this.gameState.currentProblem) return;

    const { currentProblem } = this.gameState;
    const displayText = currentProblem.displayText || '';

    if (!displayText) return;

    // 問題テキスト表示
    ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
    ctx.fillStyle = this.settings.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 複数行対応（改行で分割）
    const lines = displayText.split('\n');
    let y = 80;
    const lineHeight = this.settings.fontSize * 1.5;

    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        this.settings.width / 2,
        y + index * lineHeight,
        this.settings.width - 40
      );
    });
  }
  /**
   * タイピングテキスト（ローマ字）の描画
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderTypingText(ctx) {
    if (!this.gameState) return;
    
    // 新しいdrawPromptメソッドを利用して描画
    this.drawPrompt(ctx, this.gameState);
  }  /**
   * タイピングテキスト（ローマ字）の描画関数
   * 状態ベースでテキストの各文字をレンダリング
   * - 入力済み文字は緑色で表示
   * - 部分入力中の文字（「と」の「t」など）も緑色で表示
   * - 部分入力がない場合、次に入力すべき文字はオレンジ色（エラー時は赤色）
   * - 残りの文字は白色で表示
   * 
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} state ゲーム状態
   * @private
   */  drawPrompt(ctx, state) {
    if (!state || !state.romaji) return;
  
    const {
      romaji = '',
      typedLength = 0,
      currentInput = '', // 部分入力（例：「と」の「t」）を取得
      isError = false,
      startY = 160, // 垂直位置（オプション）
    } = state;
  
    // フォント設定
    ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
  
    // 文字幅を計算（モノスペースフォント前提）
    const charWidth = this.settings.fontSize * 0.6;
  
    // タイピングテキスト表示位置
    const textWidth = romaji.length * charWidth;
    const startX = (this.settings.width - textWidth) / 2;    
    // 次に入力すべき文字の位置を計算
    // 部分入力が存在する場合は、入力済み文字数 + 部分入力の次の位置
    // 部分入力がない場合は、入力済み文字数の位置
    const nextCharPosition = currentInput ? typedLength + 1 : typedLength;
    
    // すべての文字を一文字ずつ処理
    for (let i = 0; i < romaji.length; i++) {
      const char = romaji[i];
      
      // 文字の状態に基づいて色を決定
      if (i < typedLength) {
        // すでに入力済みの文字
        ctx.fillStyle = this.settings.typedColor; // 緑色
      } 
      else if (i === typedLength && currentInput) {
        // 部分入力の文字（例：「と」の「t」）
        ctx.fillStyle = this.settings.typedColor; // 緑色
      }      else if (i === nextCharPosition) {
        // 次に入力すべき文字
        ctx.fillStyle = isError === true
          ? this.settings.errorColor // エラー時は赤色
          : this.settings.highlightColor; // 通常はオレンジ色
      }
      else {
        // まだ入力されていない文字
        ctx.fillStyle = this.settings.textColor; // 白色
      }
      
      // 文字を描画
      ctx.fillText(char, startX + i * charWidth, startY);
    }
    
    if (romaji.length > 0 && typedLength >= romaji.length) {
      // 入力完了時のチェックマーク
      ctx.fillStyle = this.settings.typedColor; // 緑色（完了）
      ctx.fillText('✓', startX + romaji.length * charWidth, startY);
    }
  }

  /**
   * 仮想キーボードの描画
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderKeyboard(ctx) {
    if (!this.gameState) return;

    const { nextKey = '', lastPressedKey = '' } = this.gameState;

    // キーボード定数
    const KEY_SIZE = 36;
    const KEY_MARGIN = 4;
    const KEY_RADIUS = 4;
    const KEYBOARD_Y = this.settings.height - 240;

    // キーボードレイアウト（日本語）
    const KEYBOARD_LAYOUT = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '\\'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
      [' '], // スペースキー
    ];

    // キーボード描画位置
    let startY = KEYBOARD_Y;

    // 各行の描画
    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
      // この行の開始X位置を計算（中央揃え）
      const rowWidth = row.length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN;
      const rowStartX = (this.settings.width - rowWidth) / 2;
      row.forEach((key, keyIndex) => {
        let keyWidth = key === ' ' ? KEY_SIZE * 6 : KEY_SIZE;
        const keyX = rowStartX + keyIndex * (KEY_SIZE + KEY_MARGIN);
        const keyY = startY; // キーの背景
        ctx.fillStyle = '#333';
        if (key === nextKey) {
          // 次に入力すべきキー - 明るいオレンジに変更
          ctx.fillStyle = '#FFB41E';
        }
        // 最後に押したキーの緑表示は無効化（仕様変更）

        // 角丸長方形を描画
        this._roundRect(ctx, keyX, keyY, keyWidth, KEY_SIZE, KEY_RADIUS);

        // キーの文字
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          key === ' ' ? 'SPACE' : key,
          keyX + keyWidth / 2,
          keyY + KEY_SIZE / 2
        );
      });

      startY += KEY_SIZE + KEY_MARGIN;
    });
  }

  /**
   * 角丸長方形の描画（ユーティリティ）
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {number} x X座標
   * @param {number} y Y座標
   * @param {number} width 幅
   * @param {number} height 高さ
   * @param {number} radius 角の半径
   * @private
   */
  _roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }
}
