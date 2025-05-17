/**
 * Enhanced Canvas Rendering Engine for High-Performance Typing Game
 *
 * 拡張バージョン（2025年5月17日）
 * タイピングゲーム専用のCanvas描画エンジン
 * - 問題テキスト表示とタイピング状態表示に特化
 * - 高性能な描画処理
 * - 極限までのパフォーマンス最適化
 *
 * 最新の改良点:
 * - DPI自動調整機能 - 様々な解像度・スケーリング設定でも正しく表示
 * - レスポンシブ対応 - 親要素のサイズ変更に自動で追従
 * - 最適化された描画コンテキスト管理 - 一貫性のある描画とパフォーマンス向上
 * - リソース管理の改善 - メモリリークを防止する適切な解放処理
 * - Window/MacOS/Linux間の互換性強化
 *
 * 利用方法:
 * 1. インスタンス作成: const engine = new CanvasTypingEngine(options);
 * 2. 初期化: engine.initialize(canvasElement, gameState);
 * 3. アニメーション開始: engine.startAnimation();
 * 4. ゲーム状態更新: engine.updateGameState(newState);
 * 5. 終了時リソース解放: engine.destroy();
 *
 * レスポンシブ設定を有効にする場合:
 * const engine = new CanvasTypingEngine({ fitToContainer: true });
 */

// デバッグモード設定
const DEBUG = process.env.NODE_ENV === 'development';

/**
 * デフォルト設定オブジェクト
 * 最適なパフォーマンスとユーザー体験のための推奨設定
 *
 * @constant {Object} DEFAULT_SETTINGS
 */
const DEFAULT_SETTINGS = Object.freeze({
  // キャンバスサイズ設定
  width: 800, // キャンバス幅（ピクセル）
  height: 600, // キャンバス高さ（ピクセル）

  // フォント・テキスト設定
  fontFamily:
    "'SF Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', Monaco, Consolas, monospace", // 高品質モノスペースフォント
  fontSize: 26, // フォントサイズ（高DPI環境での視認性向上）

  // 色設定
  backgroundColor: '#1a1a1a', // 背景色
  textColor: '#ffffff', // 通常テキストの色
  typedColor: '#88FF88', // 入力済み文字の色
  highlightColor: '#FFB41E', // 入力中の文字の色
  errorColor: '#ff3333', // エラー時の色
  nextCharColor: '#88FF88', // 次の文字の色

  // レイアウト設定
  keyboardHeight: 200, // 仮想キーボードの高さ

  // アニメーション設定
  animationDuration: 150, // アニメーション時間（ms）
  showErrorHighlight: false, // エラー表示の有無

  // レスポンシブ設定
  fitToContainer: false, // 親要素サイズに自動適応するかどうか

  // パフォーマンス最適化設定
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

    // ゲーム状態参照
    this.gameState = null;

    // 描画制御フラグ
    this._needsRender = true; // 描画が必要かどうかのフラグ
    this._lastRenderTime = 0; // 最終描画時刻

    // リサイズ処理用
    this._resizeHandler = null;
    this._resizeObserver = null;
    this.container = null;
    this.resizeListeners = [];

    // バインディング
    this._renderFrame = this._renderFrame.bind(this);
    this.render = this.render.bind(this);
    this._handleResize = this._handleResize.bind(this);
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

    // コンテナ要素の設定（親要素がない場合はbodyを使用）
    this.container = canvas.parentElement || document.body;

    // ゲーム状態設定
    this.gameState = gameState;

    // キャンバスサイズ設定 - ピクセル比を考慮
    this._setupCanvasSize();

    // リサイズイベントリスナー設定
    this._setupResizeHandling();

    // オフスクリーンキャンバス作成（必要な場合）
    if (this.settings.useOffscreenCanvas) {
      this._setupOffscreenCanvas();
    }

    // 初期描画
    this.render();

    return this;
  }
  /**
   * キャンバスサイズの設定 - 高DPI対応でシャープな描画を実現
   * @private
   */
  _setupCanvasSize() {
    const { width, height } = this.settings;

    // デバイスピクセル比を取得（高DPIディスプレイ対応）
    this.dpr = window.devicePixelRatio || 1;

    // CSS表示サイズ設定
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // 物理ピクセルサイズを高DPI対応に設定（高解像度）
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    // コンテキスト倍率をDPRに合わせてスケール
    this.ctx.scale(this.dpr, this.dpr);

    // デフォルト設定を適用
    this._setupContextDefaults(this.ctx);

    // フォントを設定（読み込み確実性のため）
    document.fonts.ready.then(() => {
      this.render(); // フォント読み込み後に再描画
    });
  }
  /**
   * オフスクリーンキャンバスの設定（パフォーマンス向上と高DPI対応）
   * @private
   */
  _setupOffscreenCanvas() {
    // オフスクリーンキャンバス作成
    this.offscreenCanvas = document.createElement('canvas');

    // 高DPI対応のサイズ設定
    const { width, height } = this.settings;
    this.offscreenCanvas.width = Math.floor(width * this.dpr);
    this.offscreenCanvas.height = Math.floor(height * this.dpr);

    // オフスクリーンコンテキスト取得
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
    });

    // 高DPI対応のスケーリング設定
    this.offscreenCtx.scale(this.dpr, this.dpr);

    // デフォルト設定を適用
    this._setupContextDefaults(this.offscreenCtx);
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
  }
  /**
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
   * キー入力処理（状態更新のみ）
   * @param {string} key - 入力されたキー
   * @param {boolean} isCorrect - 正解かどうか
   */
  handleKeyInput(key, isCorrect = true) {
    // 状態更新のみを行う（描画は行わない）
    if (this.gameState) {
      // エラー状態の更新
      // 部分入力がある場合は、そのキー入力が正しいかどうかを判定
      // 部分入力中は基本的にエラーフラグを立てない（途中の正しい入力はエラーではない）
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

    // 描画フラグを立てる（次のrequestAnimationFrameで描画される）
    this._needsRender = true;
  }
  /**
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
  }
  /**
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
    // 現在のフレーム時間を保存
    this.lastRenderTime = timestamp;

    // _needsRenderがfalseなら描画処理をスキップ
    if (!this._needsRender) {
      // 次のフレームのスケジュール（アニメーション中のみ）
      if (this.isAnimating) {
        this.animationFrameId = requestAnimationFrame(this._renderFrame);
      }
      return;
    }

    // 描画コンテキストの取得（オフスクリーンかメインか）
    const ctx = this.settings.useOffscreenCanvas ? this.offscreenCtx : this.ctx;

    // 各フレームごとにコンテキストをリセット
    this._setupContextDefaults(ctx);

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

    // 描画済みフラグをリセット
    this._needsRender = false;

    // 次のフレームのスケジュール（アニメーション中のみ）
    if (this.isAnimating) {
      this.animationFrameId = requestAnimationFrame(this._renderFrame);
    }
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

    // 必要な設定のみ変更（ベース設定は_setupContextDefaultsで設定済み）
    ctx.fillStyle = this.settings.textColor;
    ctx.textAlign = 'center'; // 中央揃えに変更

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
  }
  /**
   * タイピングテキスト（ローマ字）の描画関数 - 高DPI対応版
   * 状態ベースでテキストの各文字をレンダリング
   * - 入力済み文字は緑色で表示
   * - 部分入力中の文字（「と」の「t」など）も緑色で表示
   * - 次に入力すべき文字はオレンジ色（部分入力中はエラー時でも赤くしない）
   * - 残りの文字は白色で表示
   * - 高DPI環境でもシャープに表示
   *
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @param {Object} state ゲーム状態
   * @private
   */
  drawPrompt(ctx, state) {
    if (!state || !state.romaji) return;

    const {
      romaji = '',
      typedLength = 0,
      currentInput = '', // 部分入力（例：「と」の「t」）を取得
      isError = false,
      startY = 160, // 垂直位置（オプション）
      displayParts = null, // InputProcessorから提供されるパーツ情報（オプション）
    } = state;

    // 高品質テキストレンダリングのための設定
    ctx.textAlign = 'left';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // フォントサイズを調整（高DPI環境で視認性を向上）
    const fontSize = this.settings.fontSize;
    ctx.font = `${fontSize}px ${this.settings.fontFamily}`;

    // 文字幅を計算（モノスペースフォント前提）
    const charWidth = fontSize * 0.6;

    // タイピングテキスト表示位置
    const textWidth = romaji.length * charWidth;
    const startX = (this.settings.width - textWidth) / 2;

    // InputProcessorから提供されるパーツ情報がある場合、それを使用
    if (displayParts && Array.isArray(displayParts)) {
      let xPos = startX;

      // 各パーツに対する処理
      displayParts.forEach((part) => {
        const { type, text } = part;

        // パーツの種類に応じた色設定
        switch (type) {
          case 'typed':
            ctx.fillStyle = this.settings.typedColor; // 入力済み
            break;
          case 'current_input':
            ctx.fillStyle = this.settings.typedColor; // 部分入力
            break;
          case 'next_char':
            ctx.fillStyle = this.settings.highlightColor; // 次の文字
            break;
          case 'error':
            ctx.fillStyle = this.settings.errorColor; // エラー
            break;
          case 'current_remaining':
            ctx.fillStyle = this.settings.highlightColor; // 部分入力の残り
            break;
          case 'not_typed':
            ctx.fillStyle = this.settings.textColor; // 未入力
            break;
          default:
            ctx.fillStyle = this.settings.textColor;
        }

        // テキスト描画
        if (text) {
          for (let i = 0; i < text.length; i++) {
            ctx.fillText(text[i], xPos, startY);
            xPos += charWidth;
          }
        }
      });

      // 入力完了チェック
      if (romaji.length > 0 && typedLength >= romaji.length) {
        ctx.fillStyle = this.settings.typedColor;
        ctx.fillText('✓', xPos, startY);
      }

      return;
    }

    // 従来の方式でのレンダリング（互換性のため）
    // 部分入力が存在する場合は、入力済み文字数 + 部分入力の次の位置
    // 部分入力がない場合は、入力済み文字数の位置
    const nextCharPosition = currentInput ? typedLength + 1 : typedLength; // すべての文字を一文字ずつ処理
    for (let i = 0; i < romaji.length; i++) {
      const char = romaji[i];

      // 文字の状態に基づいて色を決定
      if (i < typedLength) {
        // すでに入力済みの文字
        ctx.fillStyle = this.settings.typedColor; // 緑色
      } else if (i === typedLength && currentInput) {
        // 部分入力の文字（例：「と」の「t」）
        ctx.fillStyle = this.settings.typedColor; // 緑色
      } else if (i === nextCharPosition) {
        // 次に入力すべき文字
        // 部分入力がある場合は常にオレンジ色を使用（エラー時でも赤くしない）
        if (currentInput) {
          ctx.fillStyle = this.settings.highlightColor; // 部分入力中は常にオレンジ色
        } else {
          // 部分入力がない場合のみ、エラー時は赤色を使用
          ctx.fillStyle =
            isError === true
              ? this.settings.errorColor // エラー時は赤色
              : this.settings.highlightColor; // 通常はオレンジ色
        }
      } else {
        // まだ入力されていない文字
        ctx.fillStyle = this.settings.textColor; // 白色
      } // 高品質なテキスト描画（文字の鮮明さを向上）
      const x = startX + i * charWidth;
      const y = startY;

      // 高品質レンダリングのため、整数座標に配置
      const intX = Math.round(x);
      const intY = Math.round(y);

      // 影付きテキストで視認性を向上（オプション）
      if (i === nextCharPosition) {
        // 次の入力文字には軽い発光効果
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 4;
        ctx.fillText(char, intX, intY);
        ctx.shadowBlur = 0; // 影をリセット
      } else {
        // 通常の文字
        ctx.fillText(char, intX, intY);
      }
    }

    if (romaji.length > 0 && typedLength >= romaji.length) {
      // 入力完了時のチェックマーク（高品質描画）
      ctx.fillStyle = this.settings.typedColor; // 緑色（完了）
      const checkX = Math.round(startX + romaji.length * charWidth);
      const checkY = Math.round(startY);

      // 完了マークには特別な効果
      ctx.shadowColor = this.settings.typedColor;
      ctx.shadowBlur = 5;
      ctx.fillText('✓', checkX, checkY);
      ctx.shadowBlur = 0; // 影をリセット
    }
  }
  /**
   * 高品質な仮想キーボードの描画（高DPI対応）
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _renderKeyboard(ctx) {
    if (!this.gameState) return;

    const { nextKey = '', lastPressedKey = '' } = this.gameState;

    // キーボード定数（高DPI環境用に調整）
    const KEY_SIZE = 40; // 大きめのキーサイズで視認性向上
    const KEY_MARGIN = 5;
    const KEY_RADIUS = 6; // より丸みを持たせて現代的なデザインに
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
        // 最後に押したキーの緑表示は無効化（仕様変更）        // 高品質な角丸長方形を描画（整数座標にスナップ）
        const roundedKeyX = Math.round(keyX);
        const roundedKeyY = Math.round(keyY);

        // キーの影を追加（立体感を出す）
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        this._roundRect(
          ctx,
          roundedKeyX,
          roundedKeyY,
          keyWidth,
          KEY_SIZE,
          KEY_RADIUS
        );

        // 影をリセット
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // キーの文字を高品質に描画
        ctx.fillStyle = '#fff';
        ctx.font = '18px "SF Pro", "Segoe UI", sans-serif'; // より読みやすいフォント
        ctx.textAlign = 'center';

        // 鮮明なテキスト描画のためのアンチエイリアシング設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // テキスト位置を整数座標にスナップ
        const textX = Math.round(roundedKeyX + keyWidth / 2);
        const textY = Math.round(roundedKeyY + KEY_SIZE / 2);

        ctx.fillText(key === ' ' ? 'SPACE' : key, textX, textY);
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

  /**
   * キャンバスサイズを設定する - CanvasManagerとの互換用
   * @param {number} width - 新しい幅
   * @param {number} height - 新しい高さ
   */
  setCanvasSize(width, height) {
    if (!this.canvas) return this;

    // 設定を更新
    this.settings.width = width;
    this.settings.height = height;

    // キャンバス内部バッファサイズを更新（devicePixelRatioを使わない）
    this.canvas.width = width;
    this.canvas.height = height;

    // コンテキストをリセット
    this._setupContextDefaults(this.ctx);

    // オフスクリーンキャンバスがあれば更新
    if (this.settings.useOffscreenCanvas && this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      this._setupContextDefaults(this.offscreenCtx);
    }

    // 再描画フラグを設定
    this._needsRender = true;

    return this;
  }
  /**
   * リソースの解放とクリーンアップを行うメソッド
   * アニメーションループを停止し、参照を解放します
   * @returns {CanvasTypingEngine} このインスタンス
   */
  destroy() {
    // アニメーションループを停止
    this.stopAnimation();

    // リサイズ監視を停止
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }

    // リソース参照の解放
    this.canvas = null;
    this.ctx = null;
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.gameState = null;
    this.resizeListeners = [];

    return this;
  }

  /**
   * リサイズハンドリング設定
   * @private
   */
  _setupResizeHandling() {
    // 既存のハンドラがあれば削除
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }

    // リサイズハンドラを設定
    this._resizeHandler = this._handleResize;
    window.addEventListener('resize', this._resizeHandler);

    // ResizeObserverが利用可能な場合は、コンテナのリサイズも監視
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      if (this._resizeObserver) {
        this._resizeObserver.disconnect();
      }
      this._resizeObserver = new ResizeObserver(() => {
        this._handleResize();
      });
      this._resizeObserver.observe(this.container);
    }
  }

  /**
   * リサイズイベントのハンドリング
   * @private
   */
  _handleResize() {
    // 親要素サイズに合わせるモードなら親要素のサイズを取得
    if (this.settings.fitToContainer && this.container) {
      const containerRect = this.container.getBoundingClientRect();
      this.setCanvasSize(containerRect.width, containerRect.height);
    }

    // リサイズリスナーにも通知
    this.resizeListeners.forEach((listener) => {
      try {
        listener(this.settings.width, this.settings.height);
      } catch (e) {
        console.error('リサイズリスナーでエラー:', e);
      }
    });
  }

  /**
   * リサイズリスナーの追加
   * @param {Function} listener - (width, height)を引数に取るコールバック関数
   * @returns {CanvasTypingEngine} このインスタンス
   */
  onResize(listener) {
    if (typeof listener === 'function') {
      this.resizeListeners.push(listener);
    }
    return this;
  }
  /**
   * 描画コンテキストのデフォルト設定を適用
   * すべての描画処理前に呼び出すことで、コンテキストの一貫性を保つ
   * 高DPI環境での高品質表示のための設定も含む
   * @param {CanvasRenderingContext2D} ctx 描画コンテキスト
   * @private
   */
  _setupContextDefaults(ctx) {
    if (!ctx) return;

    // 高DPI環境では、変換マトリックスはsetupCanvasSizeで設定済み
    // ここでは追加の変換を適用しない

    // テキスト描画関連の設定
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `${this.settings.fontSize}px ${this.settings.fontFamily}`;

    // 高品質テキスト描画のための追加設定
    ctx.imageSmoothingEnabled = true; // テキストの場合はスムージングを有効化
    ctx.imageSmoothingQuality = 'high'; // 最高品質を指定

    // テキストレンダリング（非標準だが一部ブラウザで効果あり）
    if (ctx.textRendering) ctx.textRendering = 'optimizeLegibility';
    if (ctx.fontKerning) ctx.fontKerning = 'normal';

    // 線関連のデフォルト設定
    ctx.lineWidth = 1;
    ctx.lineCap = 'round'; // より滑らかな線端
    ctx.lineJoin = 'round'; // より滑らかな接合点

    // デフォルトの描画色
    ctx.fillStyle = this.settings.textColor;
    ctx.strokeStyle = '#000000';

    // シャドウをクリア（存在する場合）
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 合成処理のデフォルト
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }
}
