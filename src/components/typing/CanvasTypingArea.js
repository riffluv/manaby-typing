'use client';

/**
 * CanvasTypingArea.js
 * Canvas描画によるタイピングエリアコンポーネント
 * 責任: Canvasでのタイピング入力表示
 */

import React, { useRef, useEffect, useState } from 'react';
import styles from '../../styles/typing/CanvasTypingArea.module.css';
import CanvasTypingEngine from '../../canvas-typing-engine';

/**
 * Canvas描画によるタイピングエリアコンポーネント
 * DOMの代わりにCanvas描画を使用してタイピング表示を行う
 */
const CanvasTypingArea = ({
  typing,
  currentProblem,
  lastPressedKey = '',
  className = '',
}) => {
  // デバッグモード設定
  const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

  // Canvas参照
  const canvasRef = useRef(null);
  // CanvasEngineインスタンス
  const engineRef = useRef(null);
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
    if (DEBUG_MODE) console.log(`[CanvasTypingArea] ${message}`, ...args);
  };
  // Canvas Typing Engineの初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    // Canvas Typing Engineのインスタンスを作成
    const engine = new CanvasTypingEngine({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      fontSize: 24,
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      typedColor: '#4FC3F7', // 入力済み文字の色
      highlightColor: '#FF8800', // 入力中の文字の色
      errorColor: '#ff3333', // エラー時の色
      nextCharColor: '#00AAFF', // 次の文字の色
      // パフォーマンス設定
      useOffscreenCanvas: true,
      useImageCaching: true,
      preRenderChars: true,
      useRequestAnimationFrame: true,
    });

    // Canvasを初期化
    engine.initialize(canvasRef.current, gameStateRef.current);

    // アニメーションを開始
    engine.startAnimation();

    // refに保存
    engineRef.current = engine;

    // クリーンアップ関数
    return () => {
      if (engineRef.current) {
        engineRef.current.stopAnimation();
        engineRef.current = null;
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

    // displayInfo存在チェック
    if (!typing.displayInfo) {
      debugLog('表示情報が見つかりません');
      return;
    }

    try {
      // displayInfoのプロパティを安全に展開（デフォルト値付き）
      const {
        romaji = '',
        typedLength = 0,
        currentCharIndex = 0,
        currentInput = '',
        currentCharRomaji = '',
        expectedNextChar = '',
      } = typing.displayInfo;

      // ローマ字データの有効性確認
      const hasValidRomaji = typeof romaji === 'string';

      // デバッグ出力（条件付き）
      debugLog('表示データ更新:', {
        romaji: hasValidRomaji
          ? romaji.substring(0, 20) + (romaji.length > 20 ? '...' : '')
          : '<無効>',
        typedLength,
        currentCharIndex,
        currentInput,
        expectedNextChar,
        valid: hasValidRomaji,
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

      // ゲーム状態をCanvasEngineに渡すための状態を更新
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
      }; // 状態を更新して再描画を促す
      if (engineRef.current) {
        engineRef.current.updateGameState(gameStateRef.current);
      }
    } catch (error) {
      // エラー発生時の処理
      console.error('[CanvasTypingArea] 表示データ更新エラー:', error);

      // エラー状態を設定
      setDisplayData((prevData) => ({
        ...prevData,
        hasError: true,
        errorMessage: error.message,
        lastUpdated: Date.now(),
      }));
    }
  }, [
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

  // パフォーマンスメトリクス更新
  useEffect(() => {
    // 定期的にパフォーマンス情報を取得
    const intervalId = setInterval(() => {
      if (engineRef.current) {
        const metrics = engineRef.current.getPerformanceMetrics();
        setPerfMetrics({
          fps: Math.round(1000 / (metrics.lastRenderDuration || 16.67)),
          renderTime: metrics.lastRenderDuration || 0,
          inputLatency: metrics.keyPressToRenderLatency || 0,
        });
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []); // キー入力時にCanvasEngineに通知 - オブザーバーモードで動作
  useEffect(() => {
    const onKeyDown = (event) => {
      // キーボードイベントを監視するだけ（実際の入力処理は行わない）
      if (engineRef.current && typing) {
        // キー入力時間を記録（レイテンシ測定用）
        engineRef.current.recordKeyPress();

        const key = event.key;
        // 現在のキーが期待されるキーと一致するかを本来のロジックで判定
        const expectedKey = typing?.displayInfo?.expectedNextChar || '';

        // 即時フィードバックのための描画処理（入力処理はせず、表示のみを担当）
        if (expectedKey && key.length === 1) {
          // 実際のタイピング判定を行わず、エラー状態だけ同期
          engineRef.current.handleKeyInput(
            key,
            key.toLowerCase() === expectedKey.toLowerCase()
          );
        }
      }
    };

    // パッシブモードで監視（キャプチャしない、preventDefault()も呼ばない）
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [typing?.displayInfo?.expectedNextChar]); // 入力確定（typedLengthの変更）を検出して部分入力をリセット
  const prevTypedLengthRef = useRef(0);
  useEffect(() => {
    const currentTypedLength = typing?.displayInfo?.typedLength || 0;
    if (
      prevTypedLengthRef.current !== currentTypedLength &&
      engineRef.current
    ) {
      // typedLengthが変わった = 入力が確定した = 部分入力をリセット
      engineRef.current.resetPartialInput();
      prevTypedLengthRef.current = currentTypedLength;
    }
  }, [typing?.displayInfo?.typedLength]); // エラー状態の検知と管理用のref
  const prevErrorStateRef = useRef(false);

  // エラーアニメーションのリセットを追加
  useEffect(() => {
    if (typing?.errorAnimation !== prevErrorStateRef.current) {
      // エラー状態が変わった
      prevErrorStateRef.current = typing?.errorAnimation || false;

      if (engineRef.current?.gameState) {
        // エラー状態を同期
        engineRef.current.gameState.isError = typing?.errorAnimation || false;
        engineRef.current.render(); // 再描画を強制
      }
    }

    // エラーアニメーションが終了した時に自動的にエラー状態をリセット
    if (typing?.errorAnimation === true && engineRef.current?.gameState) {
      // エラー状態リセットのためのタイマーを設定
      const timer = setTimeout(() => {
        if (engineRef.current?.gameState) {
          engineRef.current.gameState.isError = false;
          engineRef.current.render(); // 再描画を強制
        }
      }, 300); // エラーアニメーション時間を考慮したタイミング

      return () => clearTimeout(timer);
    }
  }, [typing?.errorAnimation]); // 削除 - 重複したコードブロックのため

  // typingオブジェクトが存在しない場合のフォールバック
  if (!typing) {
    debugLog('typingオブジェクトがありません');
    return (
      <div className={`${styles.canvas_typing_area} ${className || ''}`}>
        <div className={styles.typing_loading}>読み込み中...</div>
      </div>
    );
  }

  // currentProblemが存在するか検証
  if (!currentProblem) {
    debugLog('問題データがありません');
    return (
      <div className={`${styles.canvas_typing_area} ${className || ''}`}>
        <div className={styles.typing_loading}>問題を読み込み中...</div>
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
    <div className={`${styles.canvas_typing_area} ${className || ''}`}>
      {/* Canvas要素 */}
      <canvas
        ref={canvasRef}
        className={styles.typing_canvas}
        width="800"
        height="600"
      />

      {/* デバッグ情報（条件付き表示） */}
      {renderDebugInfo()}
    </div>
  );
};

export default CanvasTypingArea;
