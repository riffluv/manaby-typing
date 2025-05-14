/**
 * Canvas Rendering Engine for High-Performance Typing Game
 *
 * 超高性能タイピングゲーム用Canvasレンダリングエンジン
 * - 単一Canvasによる一括描画設計
 * - プリレンダリングとキャッシュ機構
 * - オフスクリーンキャンバスの活用
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
  highlightColor: '#FF8800',
  errorColor: '#ff3333',
  nextCharColor: '#00AAFF',
  keyboardHeight: 200,
  animationDuration: 150, // ms
  // パフォーマンス設定
  useOffscreenCanvas: true,
  useImageCaching: true,
  preRenderChars: true,
  useRequestAnimationFrame: true,
  // レイヤー構成
  layers: ['background', 'problem', 'typing', 'keyboard', 'ui', 'debug'],
});

/**
 * キャッシュコンテナ - メモリ効率のためのオブジェクトプール
 * メモリ割り当てを最小化するための静的オブジェクト
 */
class CacheContainer {
  constructor() {
    // 文字キャッシュ: 描画済み文字のImageBitmapを保持
    this.charCache = new Map();

    // レイアウトキャッシュ: 計算済みレイアウト情報を保持
    this.layoutCache = new Map();

    // オブジェクトプール: メモリアロケーションを避けるための再利用オブジェクト
    this.rectPool = [];
    this.pointPool = [];

    // 事前生成バッファ
    this.typedArray = new Float32Array(1000); // 大きめに確保
  }

  // オブジェクトプールからの矩形取得（または新規作成）
  getRectangle(x = 0, y = 0, width = 0, height = 0) {
    if (this.rectPool.length > 0) {
      const rect = this.rectPool.pop();
      rect.x = x;
      rect.y = y;
      rect.width = width;
      rect.height = height;
      return rect;
    }
    return { x, y, width, height };
  }

  // 矩形をプールに戻す
  releaseRectangle(rect) {
    this.rectPool.push(rect);
  }

  // オブジェクトプールからの座標取得（または新規作成）
  getPoint(x = 0, y = 0) {
    if (this.pointPool.length > 0) {
      const point = this.pointPool.pop();
      point.x = x;
      point.y = y;
      return point;
    }
    return { x, y };
  }

  // 座標をプールに戻す
  releasePoint(point) {
    this.pointPool.push(point);
  }

  // 文字キャッシュをクリア
  clearCharCache() {
    this.charCache.clear();
  }
}

/**
 * CanvasEngineクラス
 * 高速描画を実現するためのCanvasエンジン
 */
export default class CanvasEngine {
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

    // オフスクリーンレイヤー (複数レイヤー構成)
    this.layers = new Map();

    // キャッシュコンテナ
    this.cache = new CacheContainer();

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
    this.gameStateRef = null;

    // レンダー関数参照
    this.renderFunctions = {
      background: this._renderBackground.bind(this),
      problem: this._renderProblem.bind(this),
      typing: this._renderTypingDisplay.bind(this),
      keyboard: this._renderKeyboard.bind(this),
      ui: this._renderUI.bind(this),
      debug: this._renderDebugInfo.bind(this),
    };

    // バインディング
    this._renderFrame = this._renderFrame.bind(this);
  }

  /**
   * キャンバスエンジンの初期化
   * @param {HTMLCanvasElement} canvas ターゲットキャンバス要素
   * @param {Object} gameStateRef ゲーム状態への参照
   * @returns {CanvasEngine} このインスタンス（メソッドチェーン用）
   */
  initialize(canvas, gameStateRef = null) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('有効なcanvas要素が必要です');
    }

    // キャンバス設定
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true, // 可能であればレイテンシ低減のため非同期化を無効
    });

    // キャンバスサイズ設定 - ピクセル比を考慮
    this._setupCanvasSize();

    // ゲーム状態への参照
    this.gameStateRef = gameStateRef;

    // レイヤー初期化
    this._initializeLayers();

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
  }

  /**
   * レイヤーの初期化 - 複数レイヤーによる描画最適化
   * @private
   */
  _initializeLayers() {
    if (!this.settings.useOffscreenCanvas) {
      return; // オフスクリーンキャンバスを使用しない場合はスキップ
    }

    // 各レイヤー用のオフスクリーンキャンバスを作成
    this.settings.layers.forEach((layerName) => {
      const offscreen = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      offscreen.width = this.settings.width * dpr;
      offscreen.height = this.settings.height * dpr;

      const offCtx = offscreen.getContext('2d', {
        alpha: true,
        desynchronized: true,
      });
      offCtx.scale(dpr, dpr);

      this.layers.set(layerName, {
        canvas: offscreen,
        ctx: offCtx,
        isDirty: true, // 初回は描画が必要
      });
    });
  }

  /**
   * アニメーションループの開始
   * @returns {CanvasEngine} このインスタンス
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
   * @returns {CanvasEngine} このインスタンス
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
   * 描画の実行 - 必要なレイヤーのみを再描画
   * @param {boolean} forceFullRedraw 全レイヤーを強制的に再描画するかどうか
   * @returns {CanvasEngine} このインスタンス
   */
  render(forceFullRedraw = false) {
    const startTime = performance.now();
    this.performanceMetrics.renderStartTime = startTime;

    // 背景クリア（主要キャンバス）
    this.ctx.fillStyle = this.settings.backgroundColor;
    this.ctx.fillRect(0, 0, this.settings.width, this.settings.height);

    // オフスクリーンキャンバスを使用する場合
    if (this.settings.useOffscreenCanvas) {
      // 各レイヤーを必要に応じて更新し描画
      this.settings.layers.forEach((layerName) => {
        const layer = this.layers.get(layerName);
        if (layer && (layer.isDirty || forceFullRedraw)) {
          // レイヤーをクリア
          layer.ctx.clearRect(0, 0, this.settings.width, this.settings.height);

          // レイヤー固有の描画を実行
          const renderFn = this.renderFunctions[layerName];
          if (renderFn) {
            renderFn(layer.ctx, this.gameStateRef);
          }

          layer.isDirty = false;
        }

        // レイヤーを主要キャンバスに合成
        if (layer) {
          this.ctx.drawImage(layer.canvas, 0, 0);
        }
      });
    } else {
      // シンプルモード: 単一キャンバスに直接描画
      this.settings.layers.forEach((layerName) => {
        const renderFn = this.renderFunctions[layerName];
        if (renderFn) {
          renderFn(this.ctx, this.gameStateRef);
        }
      });
    }

    // パフォーマンス測定更新
    const renderDuration = performance.now() - startTime;
    this._updatePerformanceMetrics(renderDuration);

    // インプットラグの計測更新
    if (this.performanceMetrics.lastKeyPressTime > 0) {
      this.performanceMetrics.keyPressToRenderLatency =
        startTime - this.performanceMetrics.lastKeyPressTime;
    }

    return this;
  }

  /**
   * アニメーションフレーム描画関数
   * @param {number} timestamp 現在のタイムスタンプ
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

    // 次のフレーム
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
   * パフォーマンスメトリクス情報の取得
   * @returns {Object} パフォーマンス測定データ
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * キー入力タイミングの記録（入力レイテンシ測定用）
   */
  recordKeyPress() {
    this.performanceMetrics.lastKeyPressTime = performance.now();
  }

  /**
   * レイヤーの更新状態をマーク
   * @param {string|Array<string>} layerNames 更新するレイヤー名
   */
  markLayersDirty(layerNames) {
    if (!this.settings.useOffscreenCanvas) return;

    const names = Array.isArray(layerNames) ? layerNames : [layerNames];

    names.forEach((name) => {
      const layer = this.layers.get(name);
      if (layer) {
        layer.isDirty = true;
      }
    });
  }

  /**
   * すべてのレイヤーを再描画マークに設定
   */
  markAllLayersDirty() {
    if (!this.settings.useOffscreenCanvas) return;

    this.layers.forEach((layer) => {
      layer.isDirty = true;
    });
  }

  /**
   * 背景描画関数
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderBackground(ctx) {
    ctx.fillStyle = this.settings.backgroundColor;
    ctx.fillRect(0, 0, this.settings.width, this.settings.height);

    // SF風の格子パターンまたはグリッドを描画
    ctx.strokeStyle = 'rgba(100, 100, 255, 0.1)';
    ctx.lineWidth = 1;

    // 水平線
    for (let y = 50; y < this.settings.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.settings.width, y);
      ctx.stroke();
    }

    // 垂直線
    for (let x = 50; x < this.settings.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.settings.height);
      ctx.stroke();
    }
  }

  /**
   * 問題テキスト描画関数
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} gameState ゲーム状態
   * @private
   */
  _renderProblem(ctx, gameState) {
    if (!gameState || !gameState.problem) return;

    const { problem } = gameState;
    const { text } = problem;

    if (!text) return;

    // 問題テキスト描画
    ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;
    ctx.fillStyle = this.settings.textColor;
    ctx.textAlign = 'center';

    // テキスト行を改行で分割
    const lines = text.split('\n');
    const lineHeight = this.settings.fontSize * 1.5;
    const startY = 100;

    lines.forEach((line, index) => {
      ctx.fillText(line, this.settings.width / 2, startY + index * lineHeight);
    });
  }

  /**
   * タイピング表示描画関数
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} gameState ゲーム状態
   * @private
   */
  _renderTypingDisplay(ctx, gameState) {
    if (!gameState || !gameState.typing) return;

    const { typing } = gameState;
    const { romaji, typedLength, isError } = typing;

    if (!romaji) return;

    const fontSize = this.settings.fontSize;
    const fontFamily = this.settings.fontFamily;
    ctx.font = `${fontSize}px ${fontFamily}`;

    // タイピング領域位置
    const startX = this.settings.width / 2 - romaji.length * fontSize * 0.3;
    const startY = 160;
    const charWidth = fontSize * 0.6; // 仮の文字幅

    // 入力済み文字
    if (typedLength > 0) {
      ctx.fillStyle = this.settings.highlightColor;
      const typedText = romaji.substring(0, typedLength);
      ctx.fillText(typedText, startX, startY);
    }

    // 次の文字（強調表示）
    if (typedLength < romaji.length) {
      const nextChar = romaji.charAt(typedLength);
      ctx.fillStyle = isError
        ? this.settings.errorColor
        : this.settings.nextCharColor;
      ctx.fillText(nextChar, startX + typedLength * charWidth, startY);

      // 残りの文字
      if (typedLength + 1 < romaji.length) {
        ctx.fillStyle = this.settings.textColor;
        const remainingText = romaji.substring(typedLength + 1);
        ctx.fillText(
          remainingText,
          startX + (typedLength + 1) * charWidth,
          startY
        );
      }
    }
  }

  /**
   * キーボード描画関数（レトロSF風デザイン）
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} gameState ゲーム状態
   * @private
   */
  _renderKeyboard(ctx, gameState) {
    if (!gameState) return;

    const { nextKey, lastPressedKey } = gameState;

    // キーボード定数
    const KEY_SIZE = 40;
    const KEY_MARGIN = 5;
    const KEY_RADIUS = 6;
    const KEYBOARD_Y = this.settings.height - this.settings.keyboardHeight;

    // キーボードレイアウト（日本語）
    const KEYBOARD_LAYOUT = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '\\'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
      [' '], // スペースキー
    ];

    // キーボード描画
    const startX = 50;
    let startY = KEYBOARD_Y + 20;

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
   * UI要素描画関数
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} gameState ゲーム状態
   * @private
   */
  _renderUI(ctx, gameState) {
    if (!gameState) return;

    const { progress = 0, score = 0, remainingTime = 0, kpm = 0 } = gameState;

    // ステータスバー背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.settings.width, 40);

    // 進捗バー
    ctx.fillStyle = 'rgba(0, 180, 0, 0.5)';
    ctx.fillRect(10, 10, (this.settings.width - 20) * (progress / 100), 20);
    ctx.strokeStyle = '#00FF00';
    ctx.strokeRect(10, 10, this.settings.width - 20, 20);

    // スコア表示
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 60);

    // KPM表示
    ctx.textAlign = 'center';
    ctx.fillText(`KPM: ${kpm.toFixed(1)}`, this.settings.width / 2, 60);

    // 残り時間
    ctx.textAlign = 'right';
    ctx.fillText(
      `Time: ${remainingTime.toFixed(1)}s`,
      this.settings.width - 20,
      60
    );
  }

  /**
   * デバッグ情報描画関数
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderDebugInfo(ctx) {
    if (!DEBUG) return;

    const metrics = this.performanceMetrics;
    const y = this.settings.height - 80;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, y - 20, 300, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${this.fps}`, 20, y);
    ctx.fillText(
      `Render: ${metrics.lastRenderDuration.toFixed(2)}ms`,
      20,
      y + 15
    );
    ctx.fillText(`Avg: ${metrics.averageRenderTime.toFixed(2)}ms`, 20, y + 30);
    ctx.fillText(
      `Input Lag: ${metrics.keyPressToRenderLatency.toFixed(2)}ms`,
      150,
      y
    );
    ctx.fillText(`Dropped: ${metrics.droppedFrames}`, 150, y + 15);
    ctx.fillText(`Frames: ${metrics.totalFrames}`, 150, y + 30);
  }

  /**
   * 角丸長方形の描画ユーティリティ
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
