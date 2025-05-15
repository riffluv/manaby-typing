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
  typedColor: '#4FC3F7', // 入力済み文字の色
  highlightColor: '#FF8800', // 入力中の文字の色
  errorColor: '#ff3333', // エラー時の色
  nextCharColor: '#00AAFF', // 次の文字の色
  keyboardHeight: 200,
  animationDuration: 150, // ms
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

    // パフォーマンス測定
    this.performanceMetrics = {
      lastRenderDuration: 0,
      averageRenderTime: 0,
      keyPressToRenderLatency: 0,
      lastKeyPressTime: 0,
      renderStartTime: 0,
      totalFrames: 0,
      droppedFrames: 0,
    };

    // ゲーム状態参照
    this.gameState = null;

    // キーフォーカス管理用の状態
    this.partialKeys = ''; // 現在入力中のローマ字
    this.currentFocus = ''; // 現在フォーカス中のキー(次に期待されるキー)

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
  }

  /**
   * ゲーム状態の更新
   * @param {Object} newState 新しいゲーム状態
   */
  updateGameState(newState) {
    this.gameState = { ...this.gameState, ...newState };

    // 現在の入力から部分的なキー入力とフォーカスを更新
    if (this.gameState && this.gameState.currentInput !== undefined) {
      this.partialKeys = this.gameState.currentInput || '';

      // 次に入力すべきキーを取得
      if (this.gameState.romaji && this.partialKeys !== undefined) {
        const typedLength = this.gameState.typedLength || 0;
        const currentCharPos = typedLength + this.partialKeys.length;

        if (currentCharPos < this.gameState.romaji.length) {
          this.currentFocus = this.gameState.romaji[currentCharPos];
        } else {
          this.currentFocus = '';
        }
      }
    }

    // 状態が変わったらレンダリング
    if (!this.isAnimating) {
      this.render();
    }
  }

  /**
   * キー入力時間の記録（レイテンシ測定用）
   */
  recordKeyPress() {
    this.performanceMetrics.lastKeyPressTime = performance.now();
  }
  /**
   * キー入力処理（即時フィードバック）
   * @param {string} key - 入力されたキー
   * @param {boolean} isCorrect - 正解かどうか
   */
  handleKeyInput(key, isCorrect = true) {
    // 正解の場合、部分入力を更新
    if (isCorrect && key) {
      // 現在の部分入力を更新
      this.partialKeys += key;

      // エラー状態を強制的にリセット（正解キーが入力された場合）
      if (this.gameState) {
        this.gameState.isError = false;
      }

      // フォーカスを更新
      if (this.gameState && this.gameState.romaji) {
        const typedLength = this.gameState.typedLength || 0;
        const currentPos = typedLength + this.partialKeys.length;

        if (currentPos < this.gameState.romaji.length) {
          this.currentFocus = this.gameState.romaji[currentPos];
        } else {
          this.currentFocus = '';
        }
      }
    } else if (!isCorrect) {
      // 不正解の場合のエラー表示（エラー状態を設定）
      if (this.gameState) {
        this.gameState.isError = true;
      }
    }

    // キー入力時間を記録
    this.performanceMetrics.lastKeyPressTime = performance.now();

    // 状態が変わったらレンダリング
    if (!this.isAnimating) {
      this.render();
    }
  }
  /**
   * 部分入力のリセット（ローマ字確定時）
   */
  resetPartialInput() {
    // 部分入力をクリア
    this.partialKeys = '';

    // フォーカスを更新
    if (this.gameState && this.gameState.romaji) {
      const typedLength = this.gameState.typedLength || 0;

      if (typedLength < this.gameState.romaji.length) {
        this.currentFocus = this.gameState.romaji[typedLength];
      } else {
        this.currentFocus = '';
      }
    }

    // エラー状態もリセット
    if (this.gameState) {
      this.gameState.isError = false;
    }

    // 状態が変わったらレンダリング
    this.render();
  }
  /**
   * エラー状態のリセット
   */
  resetErrorState() {
    if (this.gameState) {
      this.gameState.isError = false;
      // 再描画を呼び出し
      this.render();
    }
  }

  /**
   * 描画の実行
   * @returns {CanvasTypingEngine} このインスタンス
   */
  render() {
    const startTime = performance.now();
    this.performanceMetrics.renderStartTime = startTime;

    const ctx = this.settings.useOffscreenCanvas ? this.offscreenCtx : this.ctx;

    // 背景クリア
    ctx.fillStyle = this.settings.backgroundColor;
    ctx.fillRect(0, 0, this.settings.width, this.settings.height);

    // 問題テキストの描画
    this._renderProblem(ctx);

    // タイピングテキストの描画
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

    // インプットラグの計測
    if (this.performanceMetrics.lastKeyPressTime > 0) {
      this.performanceMetrics.keyPressToRenderLatency =
        startTime - this.performanceMetrics.lastKeyPressTime;
      this.performanceMetrics.lastKeyPressTime = 0; // リセット
    }

    return this;
  }

  /**
   * アニメーションフレームの描画
   * @param {number} timestamp タイムスタンプ
   * @private
   */
  _renderFrame(timestamp) {
    // フレームレート計算
    const deltaTime = timestamp - this.lastRenderTime;
    this.frameCount++;

    if (timestamp - this.lastRenderTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastRenderTime = timestamp;
    }

    // 描画
    this.render();

    // 次のフレームのスケジュール
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

    const {
      romaji = '',
      typedLength = 0,
      isError = false,
      currentInput = '',
    } = this.gameState;

    if (!romaji) return;

    // フォント設定
    ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;

    // 文字幅を計算（モノスペースフォント前提）
    const charWidth = this.settings.fontSize * 0.6;

    // タイピングテキスト表示位置
    const textWidth = romaji.length * charWidth;
    const startX = (this.settings.width - textWidth) / 2;
    const startY = 160;

    // 1. 確定済み入力部分（typedLength文字まで）- 青色
    if (typedLength > 0) {
      ctx.fillStyle = this.settings.typedColor; // 青色
      for (let i = 0; i < typedLength; i++) {
        const char = romaji[i];
        ctx.fillText(char, startX + i * charWidth, startY);
      }
    }

    // 2. 部分入力中のローマ字（緑色）
    if (this.partialKeys && this.partialKeys.length > 0) {
      ctx.fillStyle = '#88FF88'; // 緑色（入力中のローマ字）
      for (let i = 0; i < this.partialKeys.length; i++) {
        const char = this.partialKeys[i];
        const pos = typedLength + i;
        ctx.fillText(char, startX + pos * charWidth, startY);
      }
    } // 3. 現在フォーカス中の文字（オレンジまたは赤）- 次に入力すべきキー
    const currentPosition =
      typedLength + (this.partialKeys ? this.partialKeys.length : 0);
    if (currentPosition < romaji.length) {
      // エラー状態の場合のみ赤にする（正解入力後はエラー状態をクリア）
      const errorState =
        this.partialKeys.length > 0
          ? false
          : isError || this.gameState?.isError || false;

      ctx.fillStyle = errorState
        ? this.settings.errorColor // 赤色（エラー時）
        : '#FF8800'; // オレンジ色（フォーカス中のキー）

      const focusChar = romaji[currentPosition];
      ctx.fillText(focusChar, startX + currentPosition * charWidth, startY);

      // 4. 残りの未入力部分（白色）
      if (currentPosition + 1 < romaji.length) {
        ctx.fillStyle = this.settings.textColor; // 白色

        for (let i = currentPosition + 1; i < romaji.length; i++) {
          const char = romaji[i];
          ctx.fillText(char, startX + i * charWidth, startY);
        }
      }
    } else {
      // すべての入力が完了した場合、最後の文字をハイライト
      if (romaji.length > 0 && typedLength >= romaji.length) {
        ctx.fillStyle = '#88FF88'; // 緑色（完了）
        ctx.fillText('✓', startX + romaji.length * charWidth, startY);
      }
    }

    // 入力中のローマ字表示（下部に表示）
    if (currentInput) {
      ctx.fillStyle = '#AAFFAA'; // 薄い緑色
      ctx.fillText(currentInput, startX, startY + this.settings.fontSize * 1.5);
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
        const keyY = startY;

        // キーの背景
        ctx.fillStyle = '#333';
        if (key === nextKey) {
          // 次に入力すべきキー
          ctx.fillStyle = '#FF8800';
        } else if (key === lastPressedKey) {
          // 最後に押されたキー
          ctx.fillStyle = '#00AAFF';
        }

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
