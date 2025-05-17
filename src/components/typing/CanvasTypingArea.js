'use client';

/**
 * CanvasTypingArea.js
 * Canvas描画によるタイピングエリアコンポーネント
 * 責任: Canvasでのタイピング入力表示
 */

import React, { useRef, useEffect, useState } from 'react';
import styles from '../../styles/typing/CanvasTypingArea.module.css';
import CanvasTypingEngine from '../../canvas-typing-engine';
import RetroSFKeyboard from './RetroSFKeyboard';

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
    if (!canvasRef.current) return; // Canvas Typing Engineのインスタンスを作成
    const engine = new CanvasTypingEngine({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      fontSize: 24,
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      typedColor: '#88FF88', // 入力済み文字の色
      highlightColor: '#FFB41E', // 入力中の文字の色
      errorColor: '#ff3333', // エラー時の色
      nextCharColor: '#88FF88', // 次の文字の色
      showErrorHighlight: false, // エラー表示機能はオフに設定
      renderKeyboard: false, // 内部キーボードレンダリングを無効化
      // パフォーマンス設定 - 常にrequestAnimationFrameを使用
      useOffscreenCanvas: true,
      useImageCaching: true,
      preRenderChars: true,
      useRequestAnimationFrame: true,
    });

    // Canvasを初期化
    engine.initialize(canvasRef.current, gameStateRef.current);

    // アニメーションを開始 - モニターリフレッシュレートと同期
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

  // キー入力時にCanvasEngineに通知 - リフレッシュレート同期版
  useEffect(() => {
    const onKeyDown = (event) => {
      // 処理開始時間を記録
      const startTime = performance.now();

      // 高速処理に集中するため、文字キーのみを処理
      if (
        !(event.key.length === 1) ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }

      // キーボードイベントの処理 - 状態変更のみ行い描画はrequestAnimationFrameに任せる
      if (engineRef.current && typing) {
        const key = event.key;
        // 現在のキーが期待されるキーと一致するかを判定
        const expectedKey = typing?.displayInfo?.expectedNextChar || '';

        if (expectedKey && key.length === 1) {
          // キーの状態更新のみを行う（描画は行わない）
          const isCorrect = key.toLowerCase() === expectedKey.toLowerCase();
          engineRef.current.handleKeyInput(key, isCorrect);

          // 正確な入力の場合、preventDefault()でブラウザ標準の入力動作を抑制
          if (isCorrect) {
            event.preventDefault();
          }
        }
      }
    };

    // パフォーマンスを最大化するためのキーダウンイベント設定
    window.addEventListener('keydown', onKeyDown, {
      passive: false, // preventDefault()を呼び出すため
      capture: true, // イベントキャプチャフェーズで優先処理
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown, {
        capture: true, // イベント削除時も同じオプションを指定
      });
    };
  }, [typing?.displayInfo?.expectedNextChar]); // 入力確定（typedLengthの変更）を検出して部分入力をリセット
  const prevTypedLengthRef = useRef(0);
  useEffect(() => {
    const currentTypedLength = typing?.displayInfo?.typedLength || 0;
    if (
      prevTypedLengthRef.current !== currentTypedLength &&
      engineRef.current
    ) {
      // typedLengthが変わった = 入力が確定した = 入力状態をリセット
      engineRef.current.resetInputState();
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
          // エラー状態をリセットする専用のメソッドを使用
          engineRef.current.resetErrorState();
        }
      }, 300); // エラーアニメーション時間を考慮したタイミング

      return () => clearTimeout(timer);
    }
  }, [typing?.errorAnimation]); // 削除 - 重複したコードブロックのため
  // typingオブジェクトが存在しない場合のフォールバック
  if (!typing) {
    debugLog('typingオブジェクトがありません');
    return (
      <div className={`${styles.typing_canvas} ${className || ''}`}>
        <div className={styles.typing_canvas__loading}>読み込み中...</div>
      </div>
    );
  }

  // currentProblemが存在するか検証
  if (!currentProblem) {
    debugLog('問題データがありません');
    return (
      <div className={`${styles.typing_canvas} ${className || ''}`}>
        <div className={styles.typing_canvas__loading}>問題を読み込み中...</div>
      </div>
    );
  }
  return (
    <div className={`${styles.typing_canvas} ${className || ''}`}>
      {/* Canvas要素 */}
      <canvas
        ref={canvasRef}
        className={styles.typing_canvas__element}
        width="800"
        height="600"
      />

      {/* レトロSF風キーボード */}
      <div className={styles.typing_canvas__keyboard}>
        <RetroSFKeyboard
          nextKey={gameStateRef.current.nextKey || ''}
          lastPressedKey={gameStateRef.current.lastPressedKey || ''}
        />
      </div>
    </div>
  );
};

export default CanvasTypingArea;
