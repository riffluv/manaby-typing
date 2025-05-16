/**
 * CanvasManager.js
 * キャンバス管理と高DPI対応を行うユーティリティクラス
 *
 * Windows DPIスケーリング（125%など）の問題に対応し、
 * キャンバスを適切なサイズで表示するためのマネージャークラス
 */

/**
 * Canvas初期化と管理用のクラス
 */
export default class CanvasManager {
  /**
   * コンストラクタ
   * @param {string} canvasId - 対象キャンバスのID
   * @param {Object} options - 設定オプション
   */
  constructor(canvasId = 'gameCanvas', options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas with id ${canvasId} not found`);

    this.ctx = this.canvas.getContext('2d', {
      alpha: options.alpha !== undefined ? options.alpha : false,
      desynchronized:
        options.desynchronized !== undefined ? options.desynchronized : true,
    });

    // デフォルト設定とマージ
    this.options = Object.assign(
      {
        width: 800,
        height: 600,
        container: null,
        centered: true,
        debug: false,
      },
      options
    );

    // キャンバスコンテナの設定
    this.container = this.options.container
      ? typeof this.options.container === 'string'
        ? document.querySelector(this.options.container)
        : this.options.container
      : this.canvas.parentElement;

    // 内部サイズを保存
    this.internalWidth = this.options.width;
    this.internalHeight = this.options.height;

    // 初期化
    this.initialize();
  }

  /**
   * 初期化処理
   */
  initialize() {
    // コンテナのスタイル設定
    if (this.container && this.options.centered) {
      if (getComputedStyle(this.container).position === 'static') {
        this.container.style.position = 'relative';
      }
    }

    // キャンバスのスタイル設定
    this.canvas.style.display = 'block';
    if (this.options.centered) {
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '50%';
      this.canvas.style.left = '50%';
      this.canvas.style.transform = 'translate(-50%, -50%)';
    }

    // サイズ設定
    this.updateCanvasSize();

    // リサイズイベントの設定（再登録防止のため古いものを削除）
    window.removeEventListener('resize', this._resizeHandler);
    this._resizeHandler = this.updateCanvasSize.bind(this);
    window.addEventListener('resize', this._resizeHandler);

    // デバッグ出力
    if (this.options.debug) {
      console.log('Canvas initialized', {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height,
        dpr: window.devicePixelRatio || 1,
      });
    }
  }
  /**
   * Canvas サイズ更新処理
   */
  updateCanvasSize() {
    // デバイスピクセル比を無視して内部バッファサイズを設定
    // これがWindows DPI 125%の問題解決の鍵
    // devicePixelRatio（DPR）を考慮せず、論理サイズと物理サイズを1:1にする
    this.canvas.width = this.internalWidth;
    this.canvas.height = this.internalHeight;

    // 表示サイズを設定（CSSピクセル単位、明示的に単位を指定）
    this.canvas.style.width = `${this.internalWidth}px`;
    this.canvas.style.height = `${this.internalHeight}px`;

    // 描画コンテキストのリセット
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // デバッグログ
    if (this.options.debug) {
      console.log('Canvas resized', {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height,
        internalWidth: this.internalWidth,
        internalHeight: this.internalHeight,
        dpr: window.devicePixelRatio || 1,
      });
    }
  }

  /**
   * リサイズ処理 - サイズを変更する場合に使用
   * @param {number} width - 新しい幅
   * @param {number} height - 新しい高さ
   */
  resize(width, height) {
    this.internalWidth = width;
    this.internalHeight = height;
    this.updateCanvasSize();
    return this;
  }

  /**
   * 描画前のコンテキストクリア
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this;
  }

  /**
   * リソース解放
   */
  destroy() {
    window.removeEventListener('resize', this._resizeHandler);
  }
}
