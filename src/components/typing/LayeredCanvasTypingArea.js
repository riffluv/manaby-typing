'use client';

/**
 * LayeredCanvasTypingArea.js
 * 複数レイヤー構造のCanvas描画によるタイピングエリアコンポーネント
 * 責任: 複数のCanvasレイヤーでのタイピング入力表示
 */

import React, { useRef, useEffect, useState } from 'react';
import styles from '../../styles/LayeredCanvas.module.css';
import CanvasTypingEngine from '../../canvas-typing-engine';

/**
 * 複数のCanvasレイヤーを使用したタイピングゲーム画面
 * 背景、お題表示、キーボードを異なるレイヤーに分離
 */
const LayeredCanvasTypingArea = ({
  typing,
  currentProblem,
  lastPressedKey = '',
  className = '',
  logoUrl = '/logo.png', // ロゴ画像のパス（デフォルト値）
}) => {
  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // 各Canvas参照
  const backgroundCanvasRef = useRef(null);
  const odaiCanvasRef = useRef(null);
  const keyboardCanvasRef = useRef(null);

  // 各Canvas用のエンジンインスタンス
  const backgroundEngineRef = useRef(null);
  const odaiEngineRef = useRef(null);
  const keyboardEngineRef = useRef(null);

  // 表示データの状態
  const [displayData, setDisplayData] = useState({
    romaji: '',
    typedLength: 0,
    currentCharIndex: 0,
    hasError: false,
    lastUpdated: Date.now(),
  });

  // パフォーマンスメトリクス
  const [perfMetrics, setPerfMetrics] = useState({
    fps: 0,
    renderTime: 0,
    inputLatency: 0,
  });

  // ゲーム状態参照（Canvas Engineに渡すための状態）
  const gameStateRef = useRef({
    romaji: '',
    typedLength: 0,
    isError: false,
    nextKey: '',
    lastPressedKey: '',
    progress: 0,
    score: 0,
    kpm: 0,
    currentProblem: null,
  });

  // デバッグログ関数
  const debugLog = (message, ...args) => {
    if (DEBUG_MODE)
      console.log(`[LayeredCanvasTypingArea] ${message}`, ...args);
  };

  // 背景キャンバスの初期化
  useEffect(() => {
    if (!backgroundCanvasRef.current) return;

    // 背景用の設定
    const engine = new CanvasTypingEngine({
      width: backgroundCanvasRef.current.clientWidth,
      height: backgroundCanvasRef.current.clientHeight,
      backgroundColor: '#0f1218', // 濃い青系の背景
      useOffscreenCanvas: true, // オフスクリーンキャンバスを使用
      useImageCaching: true, // イメージキャッシュを使用
      useRequestAnimationFrame: true, // アニメーションフレームを使用
      // 描画関数をオーバーライド
      customRenderFunction: (ctx, canvas, timestamp) => {
        // 背景の描画（グラデーションやグリッド線など）
        const width = canvas.width;
        const height = canvas.height;

        // 背景グラデーション
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#0f1218');
        gradient.addColorStop(1, '#161b24');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // グリッド線
        ctx.strokeStyle = 'rgba(65, 105, 225, 0.1)';
        ctx.lineWidth = 1;

        // 横線
        const gridSize = 30;
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // 縦線
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        return true; // 描画完了
      },
    });

    // Canvasを初期化
    engine.initialize(backgroundCanvasRef.current);

    // アニメーションを開始
    engine.startAnimation();

    // refに保存
    backgroundEngineRef.current = engine;

    // クリーンアップ関数
    return () => {
      if (backgroundEngineRef.current) {
        backgroundEngineRef.current.stopAnimation();
        backgroundEngineRef.current = null;
      }
    };
  }, []);

  // お題表示用キャンバスの初期化
  useEffect(() => {
    if (!odaiCanvasRef.current) return;

    // お題表示用のエンジン
    const engine = new CanvasTypingEngine({
      width: odaiCanvasRef.current.clientWidth,
      height: odaiCanvasRef.current.clientHeight,
      backgroundColor: 'transparent', // 透明背景（重ね表示のため）
      textColor: '#ffffff',
      fontSize: 28,
      useOffscreenCanvas: true,
      useImageCaching: true,
      useRequestAnimationFrame: true,
      // 問題文のみを描画する関数をオーバーライド
      customRenderFunction: (ctx, canvas, timestamp) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameStateRef.current || !gameStateRef.current.currentProblem)
          return true;

        const { currentProblem } = gameStateRef.current;
        const displayText = currentProblem.displayText || '';

        if (!displayText) return true;

        // 問題テキスト表示
        ctx.font = `28px 'Noto Sans JP', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 複数行対応（改行で分割）
        const lines = displayText.split('\n');
        const lineHeight = 40;
        const centerY =
          canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          ctx.fillText(
            line,
            canvas.width / 2,
            centerY + index * lineHeight,
            canvas.width - 60
          );        });
        
        // リファクタリングされた描画メソッドを使用してタイピングテキストを描画
        // 状態ベースの描画に変更 - drawPrompt関数を呼び出す
        if (odaiEngineRef.current) {
          const state = gameStateRef.current;
          const startY = centerY + lines.length * lineHeight + 50;
          
          // フォントの設定
          ctx.font = `24px 'Roboto Mono', monospace`;
          
          // 新しいdrawPrompt関数を使用して描画
          // タイピングの進捗状態に基づいて色分けされた文字を描画
          odaiEngineRef.current.drawPrompt(ctx, {
            romaji: state.romaji || '',
            typedLength: state.typedLength || 0, 
            isError: state.isError || false,
            startY: startY // 垂直位置を渡す（任意パラメータ）
          });
        }

        return true;
      },
    });

    // Canvasを初期化
    engine.initialize(odaiCanvasRef.current);

    // アニメーションを開始
    engine.startAnimation();

    // refに保存
    odaiEngineRef.current = engine;

    // クリーンアップ関数
    return () => {
      if (odaiEngineRef.current) {
        odaiEngineRef.current.stopAnimation();
        odaiEngineRef.current = null;
      }
    };
  }, []);

  // キーボード表示用キャンバスの初期化
  useEffect(() => {
    if (!keyboardCanvasRef.current) return;

    // キーボード表示用のエンジン
    const engine = new CanvasTypingEngine({
      width: keyboardCanvasRef.current.clientWidth,
      height: keyboardCanvasRef.current.clientHeight,
      backgroundColor: 'transparent', // 透明背景（重ね表示のため）
      useOffscreenCanvas: true,
      useImageCaching: true,
      useRequestAnimationFrame: true,
      // キーボードのみを描画する関数をオーバーライド
      customRenderFunction: (ctx, canvas, timestamp) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!gameStateRef.current) return true;

        const { nextKey = '', lastPressedKey = '' } = gameStateRef.current;

        // キーボード表示定数
        const KEY_SIZE = 40;
        const KEY_MARGIN = 5;
        const KEY_RADIUS = 5;
        const KEYBOARD_Y = 60;

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

        // キーボードの背景（半透明の暗い背景）
        const kbWidth = KEYBOARD_LAYOUT[0].length * (KEY_SIZE + KEY_MARGIN);
        const kbHeight = KEYBOARD_LAYOUT.length * (KEY_SIZE + KEY_MARGIN) * 1.2;
        const kbStartX = (canvas.width - kbWidth) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        roundRect(
          ctx,
          kbStartX - 20,
          startY - 20,
          kbWidth + 40,
          kbHeight + 20,
          10
        );
        ctx.fill();

        // 各行の描画
        KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
          // この行の開始X位置を計算（中央揃え）
          const rowWidth = row.length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN;
          const rowStartX = (canvas.width - rowWidth) / 2;

          row.forEach((key, keyIndex) => {
            let keyWidth = key === ' ' ? KEY_SIZE * 6 : KEY_SIZE;
            const keyX = rowStartX + keyIndex * (KEY_SIZE + KEY_MARGIN);
            const keyY = startY;

            // キーの背景
            ctx.fillStyle = '#333';            if (key === nextKey) {
              // 次に入力すべきキー - 明るいオレンジ色でハイライト
              ctx.fillStyle = '#FFB41E';
            } else if (key === lastPressedKey) {
              // 最後に押したキー - 薄い緑
              ctx.fillStyle = 'rgba(136, 255, 136, 0.5)';
            }

            // 角丸長方形を描画
            roundRect(ctx, keyX, keyY, keyWidth, KEY_SIZE, KEY_RADIUS);
            ctx.fill();

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

        return true;

        // 角丸長方形描画用ユーティリティ関数
        function roundRect(ctx, x, y, width, height, radius) {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
          );
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
        }
      },
    });

    // Canvasを初期化
    engine.initialize(keyboardCanvasRef.current);

    // アニメーションを開始
    engine.startAnimation();

    // refに保存
    keyboardEngineRef.current = engine;

    // クリーンアップ関数
    return () => {
      if (keyboardEngineRef.current) {
        keyboardEngineRef.current.stopAnimation();
        keyboardEngineRef.current = null;
      }
    };
  }, []);

  // 表示データの更新
  useEffect(() => {
    // typing存在チェック
    if (!typing) {
      debugLog('typingオブジェクトがありません');
      return;
    }

    try {
      const { displayInfo } = typing;
      if (!displayInfo) return;

      const {
        romaji = '',
        typedLength = 0,
        currentCharIndex = 0,
        currentInput = '',
        currentCharRomaji = '',
        expectedNextChar = '',
      } = displayInfo;

      // 検証用デバッグ出力
      debugLog('表示データ更新:', {
        romaji:
          romaji?.length > 20
            ? romaji.substring(0, 20) + (romaji.length > 20 ? '...' : '')
            : '<無効>',
        typedLength,
        currentCharIndex,
        currentInput,
        expectedNextChar,
      });

      // 表示データを更新
      const newDisplayData = {
        romaji: romaji || '',
        typedLength: typedLength || 0,
        currentCharIndex: currentCharIndex || 0,
        currentInput: currentInput || '',
        currentCharRomaji: currentCharRomaji || '',
        expectedNextChar: expectedNextChar || '',
        hasError: false,
        lastUpdated: Date.now(),
      };

      setDisplayData(newDisplayData);

      // ゲーム状態を更新
      gameStateRef.current = {
        romaji: romaji || '',
        typedLength: typedLength || 0,
        isError: typing.errorAnimation || false,
        nextKey: expectedNextChar || '',
        lastPressedKey: lastPressedKey || '',
        progress: typing.stats?.progressPercentage || 0,
        score: typing.stats?.score || 0,
        kpm: typing.stats?.kpm || 0,
        currentProblem: currentProblem || null,
        currentInput: currentInput || '',
        expectedNextChar: expectedNextChar || '',
      };

      // 各エンジンに状態を通知して再描画を促す
      if (odaiEngineRef.current) {
        odaiEngineRef.current.updateGameState(gameStateRef.current);
      }
      if (keyboardEngineRef.current) {
        keyboardEngineRef.current.updateGameState(gameStateRef.current);
      }
    } catch (error) {
      // エラー発生時の処理
      console.error('[LayeredCanvasTypingArea] 表示データ更新エラー:', error);

      // エラー状態を設定
      setDisplayData((prevData) => ({
        ...prevData,
        hasError: true,
        errorMessage: error.message,
        lastUpdated: Date.now(),
      }));
    }
  }, [
    typing,
    typing?.displayInfo,
    typing?.displayInfo?.romaji,
    typing?.displayInfo?.typedLength,
    typing?.displayInfo?.currentCharIndex,
    typing?.displayInfo?.currentInput,
    typing?.displayInfo?.currentCharRomaji,
    typing?.displayInfo?.expectedNextChar,
    typing?.errorAnimation,
    typing?.stats?.progressPercentage,
    typing?.stats?.score,
    typing?.stats?.kpm,
    currentProblem,
    lastPressedKey,
  ]);

  // キー入力時の処理
  useEffect(() => {
    const onKeyDown = (event) => {
      // 処理開始時間を記録
      const startTime = performance.now();

      // 文字キーのみを処理
      if (
        !(event.key.length === 1) ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      // キーボードイベントの処理
      // 各エンジンに入力イベントを通知
      const expectedKey = typing?.displayInfo?.expectedNextChar || '';      if (expectedKey && event.key.length === 1) {
        // 正誤判定
        const isCorrect = event.key.toLowerCase() === expectedKey.toLowerCase();

        // ゲーム状態を更新 - リファクタリングしたロジックに合わせて更新
        if (keyboardEngineRef.current) {
          keyboardEngineRef.current.recordKeyPress();
          keyboardEngineRef.current.handleKeyInput(event.key, isCorrect);
        }

        // 正確な入力の場合、標準の入力動作を抑制
        if (isCorrect) {
          event.preventDefault();
        }
      }
    };

    // パフォーマンスを最大化するためのキーダウンイベント設定
    window.addEventListener('keydown', onKeyDown, {
      passive: false,
      capture: true,
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown, {
        capture: true,
      });
    };
  }, [typing?.displayInfo?.expectedNextChar]);

  // パフォーマンスメトリクス更新
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (keyboardEngineRef.current) {
        const metrics = keyboardEngineRef.current.getPerformanceMetrics();
        setPerfMetrics({
          fps: Math.round(1000 / (metrics.lastRenderDuration || 16.67)),
          renderTime: metrics.lastRenderDuration || 0,
          inputLatency: metrics.keyPressToRenderLatency || 0,
        });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // エラー状態の検知と管理
  useEffect(() => {
    if (odaiEngineRef.current?.gameState) {
      odaiEngineRef.current.gameState.isError = typing?.errorAnimation || false;
    }
    if (keyboardEngineRef.current?.gameState) {
      keyboardEngineRef.current.gameState.isError =
        typing?.errorAnimation || false;
    }
  }, [typing?.errorAnimation]);

  // typingオブジェクトが存在しない場合のフォールバック
  if (!typing) {
    debugLog('typingオブジェクトがありません');
    return (
      <div className={styles.app_container}>
        <div className={styles.app_header}>
          <img
            src={logoUrl}
            alt="タイピングゲーム"
            className={styles.app_logo}
          />
        </div>
        <div className={styles.game_container}>
          <div className="typing_loading">読み込み中...</div>
        </div>
      </div>
    );
  }

  // currentProblemが存在するか検証
  if (!currentProblem) {
    debugLog('問題データがありません');
    return (
      <div className={styles.app_container}>
        <div className={styles.app_header}>
          <img
            src={logoUrl}
            alt="タイピングゲーム"
            className={styles.app_logo}
          />
        </div>
        <div className={styles.game_container}>
          <div className="typing_loading">問題を読み込み中...</div>
        </div>
      </div>
    );
  }

  // デバッグ情報の表示（デバッグモードのみ）
  const renderDebugInfo = () => {
    if (!DEBUG_MODE) return null;

    return (
      <div className={styles.debug_info}>
        <p>FPS: {perfMetrics.fps}</p>
        <p>レンダー時間: {perfMetrics.renderTime.toFixed(2)}ms</p>
        <p>入力レイテンシ: {perfMetrics.inputLatency.toFixed(2)}ms</p>
        <p>文字数: {displayData.romaji.length}</p>
        <p>入力済み: {displayData.typedLength}</p>
      </div>
    );
  };

  return (
    <div className={styles.app_container}>
      {/* ヘッダー（ロゴ表示エリア） */}
      <div className={styles.app_header}>
        <img src={logoUrl} alt="タイピングゲーム" className={styles.app_logo} />
      </div>

      {/* ゲームエリア（複数のキャンバスレイヤーを重ねて表示） */}
      <div className={styles.game_container}>
        {/* 背景用キャンバス（最背面レイヤー） */}
        <canvas
          ref={backgroundCanvasRef}
          className={`${styles.background_canvas} ${styles.gpu_accelerated}`}
          width="800"
          height="600"
        />

        {/* ゲームUI要素コンテナ */}
        <div className={styles.game_ui_container}>
          {/* お題表示用キャンバス（中間レイヤー） */}
          <canvas
            ref={odaiCanvasRef}
            className={`${styles.odai_canvas} ${styles.gpu_accelerated}`}
            width="800"
            height="400"
          />

          {/* キーボード表示用キャンバス（最前面レイヤー） */}
          <canvas
            ref={keyboardCanvasRef}
            className={`${styles.keyboard_canvas} ${styles.gpu_accelerated}`}
            width="800"
            height="400"
          />
        </div>

        {/* デバッグ情報（条件付き表示） */}
        {renderDebugInfo()}
      </div>
    </div>
  );
};

export default LayeredCanvasTypingArea;
