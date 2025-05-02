import React, { useRef, useEffect, useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';

/**
 * Canvas描画を使用したタイピング表示コンポーネント
 * パフォーマンス最適化のためにHTML CanvasベースでUI描画を実装
 * DOM操作を軽減し、高速で安定した描画を実現
 */
const CanvasTypingDisplay = memo(
  ({
    displayRomaji,
    coloringInfo,
    isCompleted,
    currentInput,
    errorAnimation,
    fontFamily = "'Roboto Mono', monospace, 'Noto Sans JP'",
    fontSize = 28,
    lineHeight = 1.5
  }) => {
    // Canvasの参照
    const canvasRef = useRef(null);
    // オフスクリーンキャンバス参照（高速描画用）
    const offscreenCanvasRef = useRef(null);
    // アニメーションフレームIDの参照
    const animationFrameId = useRef(null);
    // エラーアニメーションのタイマーID
    const errorTimerRef = useRef(null);
    // エラーアニメーションのオフセット値
    const errorOffsetRef = useRef({ x: 0, y: 0 });
    // カーソル点滅のためのタイムスタンプ
    const cursorBlinkTimestampRef = useRef(0);
    // カーソル表示状態
    const cursorVisibleRef = useRef(true);
    // テキスト測定結果キャッシュ
    const textMetricsCache = useRef(new Map());
    // 前回のレンダリング状態
    const prevRenderState = useRef({});
    // DPIスケール比率の保存
    const dprRef = useRef(1);
    
    // ローマ字文字列から末尾の「|」を削除（存在する場合）
    const cleanDisplayRomaji = useMemo(() => {
      return displayRomaji && displayRomaji.endsWith('|')
        ? displayRomaji.slice(0, -1)
        : displayRomaji;
    }, [displayRomaji]);

    // 色の定義 (CSSのカスタムプロパティに対応)
    const colors = useMemo(() => ({
      typed: '#6aff8b', // 入力済み文字色（緑）
      current: '#6aff8b', // 現在入力中の文字色（緑に変更）
      nextChar: '#ff9a28', // 次に入力すべき文字色（オレンジ）
      notTyped: '#757575', // 未入力の文字色（薄いグレー）
      cursor: '#ff9a28', // カーソル色（オレンジ）
      cursorAlpha: 0.8, // カーソルの透明度
      error: '#ff3333', // エラー時の文字色（赤）
      textShadow: 'rgba(0, 0, 0, 0.4)' // テキストの影色
    }), []);

    // テキスト測定のキャッシュ関数（高速化）
    const measureTextCached = (ctx, text) => {
      if (!text) return { width: 0 };
      
      const cacheKey = `${text}-${ctx.font}`;
      if (!textMetricsCache.current.has(cacheKey)) {
        textMetricsCache.current.set(cacheKey, ctx.measureText(text));
        
        // キャッシュサイズ制限（大きくなりすぎないように）
        if (textMetricsCache.current.size > 1000) {
          const keys = Array.from(textMetricsCache.current.keys());
          for (let i = 0; i < 500; i++) {
            textMetricsCache.current.delete(keys[i]);
          }
        }
      }
      return textMetricsCache.current.get(cacheKey);
    };

    // オフスクリーンキャンバスの初期化
    const initOffscreenCanvas = () => {
      // オフスクリーンキャンバスを作成（初回のみ）
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      
      if (!canvasRef.current) return;
      
      // メインキャンバスと同じサイズに設定
      offscreenCanvasRef.current.width = canvasRef.current.width;
      offscreenCanvasRef.current.height = canvasRef.current.height;
    };

    // Canvas描画用の描画関数
    const drawCanvas = (timestamp) => {
      if (!canvasRef.current || !offscreenCanvasRef.current) return;
      
      // オフスクリーンコンテキストを取得
      const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { alpha: true });
      
      // キャンバスをクリア
      offscreenCtx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      
      if (!cleanDisplayRomaji) {
        // メインキャンバスにオフスクリーンの内容をコピー
        const mainCtx = canvasRef.current.getContext('2d');
        mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        animationFrameId.current = requestAnimationFrame(drawCanvas);
        return;
      }
      
      // フォントの設定
      offscreenCtx.font = `${fontSize}px ${fontFamily}`;
      offscreenCtx.textBaseline = 'middle';
      
      const { typedLength = 0, currentInputLength = 0 } = coloringInfo || {};
      const currentPosition = coloringInfo?.currentPosition || 0;

      // テキスト分割
      const typedText = cleanDisplayRomaji.substring(0, typedLength);
      const currentText = currentInput || '';
      const nextChar = cleanDisplayRomaji.charAt(currentPosition + currentInputLength);
      const restText = cleanDisplayRomaji.substring(currentPosition + currentInputLength + 1);

      // テキスト測定（キャッシュ使用）
      const centerY = offscreenCanvasRef.current.height / (2 * dprRef.current);
      
      // エラーアニメーションのオフセットを取得
      const { x: errorOffsetX, y: errorOffsetY } = errorOffsetRef.current;
      
      // テキスト幅計算を最適化（キャッシュで高速化）
      let typedWidth = typedText ? measureTextCached(offscreenCtx, typedText).width : 0;
      let currentInputWidth = currentText ? measureTextCached(offscreenCtx, currentText).width : 0;
      let nextCharWidth = nextChar ? measureTextCached(offscreenCtx, nextChar).width : 0;
      let restTextWidth = restText ? measureTextCached(offscreenCtx, restText).width : 0;
      
      const totalTextWidth = typedWidth + currentInputWidth + nextCharWidth + restTextWidth;
      
      // ローマ字テキストの表示位置調整
      const startX = Math.max(offscreenCanvasRef.current.width / (2 * dprRef.current) - totalTextWidth / 2, 20);
      let currentX = startX + errorOffsetX;
      
      // 完了状態
      if (isCompleted) {
        offscreenCtx.fillStyle = colors.typed;
        offscreenCtx.shadowColor = colors.textShadow;
        offscreenCtx.shadowBlur = 4;
        offscreenCtx.fillText(cleanDisplayRomaji, currentX, centerY + errorOffsetY);
        offscreenCtx.shadowBlur = 0;
        
        // メインキャンバスにオフスクリーンの内容をコピー
        const mainCtx = canvasRef.current.getContext('2d');
        mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        mainCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        
        return;
      }
      
      // 1. 入力済み部分の描画
      if (typedText) {
        offscreenCtx.fillStyle = colors.typed;
        offscreenCtx.shadowColor = colors.textShadow;
        offscreenCtx.shadowBlur = 4;
        offscreenCtx.fillText(typedText, currentX, centerY + errorOffsetY);
        offscreenCtx.shadowBlur = 0;
        currentX += typedWidth;
      }
      
      // 2. 現在入力中のテキストの描画
      if (currentText) {
        offscreenCtx.fillStyle = colors.current;
        offscreenCtx.shadowColor = colors.textShadow;
        offscreenCtx.shadowBlur = 4;
        offscreenCtx.fillText(currentText, currentX, centerY + errorOffsetY);
        offscreenCtx.shadowBlur = 0;
        currentX += currentInputWidth;
      }
      
      // 3. 次に入力すべき一文字を強調表示
      if (nextChar) {
        offscreenCtx.fillStyle = colors.nextChar;
        offscreenCtx.shadowColor = colors.textShadow;
        offscreenCtx.shadowBlur = 7; // 次の文字はより強調
        offscreenCtx.font = `bold ${fontSize}px ${fontFamily}`; // 太字にして強調
        offscreenCtx.fillText(nextChar, currentX, centerY + errorOffsetY);
        offscreenCtx.shadowBlur = 0;
        offscreenCtx.font = `${fontSize}px ${fontFamily}`; // フォントを戻す
        
        // 下線を引いて強調表示
        offscreenCtx.strokeStyle = colors.nextChar;
        offscreenCtx.lineWidth = 2;
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(currentX, centerY + fontSize/2);
        offscreenCtx.lineTo(currentX + nextCharWidth, centerY + fontSize/2);
        offscreenCtx.stroke();
        
        currentX += nextCharWidth;
      }
      
      // 4. 残りの未入力部分
      if (restText) {
        offscreenCtx.fillStyle = colors.notTyped;
        offscreenCtx.globalAlpha = 0.8;
        offscreenCtx.fillText(restText, currentX, centerY + errorOffsetY);
        offscreenCtx.globalAlpha = 1;
      }
      
      // 5. カーソル描画（1秒間隔で点滅）
      const cursorBlinkInterval = 500; // ミリ秒
      if ((timestamp - cursorBlinkTimestampRef.current) > cursorBlinkInterval) {
        cursorBlinkTimestampRef.current = timestamp;
        cursorVisibleRef.current = !cursorVisibleRef.current;
      }
      
      if (cursorVisibleRef.current && !isCompleted) {
        offscreenCtx.fillStyle = colors.cursor;
        offscreenCtx.globalAlpha = colors.cursorAlpha;
        offscreenCtx.fillRect(currentX + 2, centerY - fontSize/2, 2, fontSize);
        offscreenCtx.globalAlpha = 1;
      }
      
      // メインキャンバスにオフスクリーンの内容をコピー（高速描画）
      const mainCtx = canvasRef.current.getContext('2d');
      mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      mainCtx.drawImage(offscreenCanvasRef.current, 0, 0);
      
      // 最適化：状態が変わらない場合はフレームレート制限
      const currentState = {
        typedLength,
        currentInputLength,
        currentPosition,
        currentInput,
        errorOffsetX,
        errorOffsetY,
        cursorVisible: cursorVisibleRef.current
      };
      
      const stateChanged = JSON.stringify(currentState) !== JSON.stringify(prevRenderState.current);
      prevRenderState.current = {...currentState};
      
      // カーソル点滅や状態変更時のみ描画更新（CPU負荷軽減）
      if (stateChanged || timestamp - cursorBlinkTimestampRef.current < 50) {
        animationFrameId.current = requestAnimationFrame(drawCanvas);
      } else {
        // 次のカーソル点滅タイミングで更新
        const timeToNextBlink = cursorBlinkInterval - (timestamp - cursorBlinkTimestampRef.current);
        animationFrameId.current = setTimeout(() => {
          requestAnimationFrame(drawCanvas);
        }, timeToNextBlink);
      }
    };
    
    // キャンバスのサイズ設定
    const setCanvasSize = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const container = canvas.parentElement;
      
      if (container) {
        // DPIを考慮したキャンバスサイズ設定
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr; // 参照用に保存
        
        const rect = container.getBoundingClientRect();
        
        // 固定高さを使用し、コンテナの幅に合わせる
        const fixedHeight = 120; // CSSで定義した固定高さに合わせる
        
        canvas.width = rect.width * dpr;
        canvas.height = fixedHeight * dpr;
        
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${fixedHeight}px`;
        
        // スケーリング調整
        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: true // レイテンシ低減のための最適化
        });
        
        ctx.scale(dpr, dpr);
        
        // オフスクリーンキャンバスも更新
        if (offscreenCanvasRef.current) {
          offscreenCanvasRef.current.width = canvas.width;
          offscreenCanvasRef.current.height = canvas.height;
          
          const offCtx = offscreenCanvasRef.current.getContext('2d', {
            alpha: true,
            desynchronized: true
          });
          
          offCtx.scale(dpr, dpr);
        }
        
        // フォントをプリロード（最初の描画を高速化）
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillText("", 0, 0);
        
        // テキスト測定キャッシュをクリア（サイズ変更時）
        textMetricsCache.current.clear();
      }
    };
    
    // エラーアニメーション処理
    useEffect(() => {
      if (errorAnimation) {
        const startTime = Date.now();
        const duration = 200; // ミリ秒
        const amplitude = 4; // 揺れの大きさ
        
        // 揺れアニメーションの実行
        const animateError = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          
          // 減衰する正弦波で揺れを表現
          const damping = 1 - progress;
          errorOffsetRef.current = {
            x: Math.sin(progress * Math.PI * 4) * amplitude * damping,
            y: 0
          };
          
          if (progress < 1) {
            errorTimerRef.current = requestAnimationFrame(animateError);
          } else {
            // アニメーション終了時
            errorOffsetRef.current = { x: 0, y: 0 };
          }
        };
        
        animateError();
        
        return () => {
          if (errorTimerRef.current) {
            cancelAnimationFrame(errorTimerRef.current);
          }
          errorOffsetRef.current = { x: 0, y: 0 };
        };
      }
    }, [errorAnimation]);

    // Canvasの初期化とリサイズ処理
    useEffect(() => {
      // オフスクリーンキャンバス初期化
      initOffscreenCanvas();
      
      setCanvasSize(); // 初期サイズを設定
      
      // リサイズイベントの設定
      const handleResize = () => {
        setCanvasSize();
      };
      
      window.addEventListener('resize', handleResize);
      
      // プリロード処理（初回レンダリングを高速化）
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.font = `${fontSize}px ${fontFamily}`;
        // よく使われる文字を事前に描画してフォント読み込みを高速化
        const preloadChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789あいうえおかきくけこさしすせそたちつてと';
        ctx.fillText(preloadChars, -1000, -1000); // 画面外に描画
      }
      
      // 描画開始
      animationFrameId.current = requestAnimationFrame(drawCanvas);
      
      // クリーンアップ関数
      return () => {
        window.removeEventListener('resize', handleResize);
        
        if (typeof animationFrameId.current === 'number') {
          if (animationFrameId.current < 1000) { // requestAnimationFrameのID
            cancelAnimationFrame(animationFrameId.current);
          } else { // setTimeout のID
            clearTimeout(animationFrameId.current);
          }
        }
        
        if (errorTimerRef.current) {
          cancelAnimationFrame(errorTimerRef.current);
        }
      };
    }, []);
    
    // 表示内容、色分け情報が更新されたら再描画をトリガー
    useEffect(() => {
      if (typeof animationFrameId.current === 'number') {
        if (animationFrameId.current < 1000) { // requestAnimationFrameのID
          cancelAnimationFrame(animationFrameId.current);
        } else { // setTimeout のID
          clearTimeout(animationFrameId.current);
        }
      }
      animationFrameId.current = requestAnimationFrame(drawCanvas);
    }, [
      cleanDisplayRomaji, 
      coloringInfo, 
      currentInput, 
      isCompleted
    ]);
    
    return (
      <div className={styles.canvasTypingContainer}>
        <canvas 
          ref={canvasRef}
          className={styles.typingCanvas} 
          style={{
            willChange: 'transform',
            contain: 'content',
            transform: 'translateZ(0)', // GPU高速化
            imageRendering: 'crisp-edges', // テキスト描画の鮮明さを向上
          }}
        />
      </div>
    );
  },
  // 最適化されたmemo比較関数
  (prevProps, nextProps) => {
    // 変更点があるときのみ再レンダリング
    if (prevProps.isCompleted !== nextProps.isCompleted) return false;
    if (prevProps.errorAnimation !== nextProps.errorAnimation) return false;
    if (prevProps.displayRomaji !== nextProps.displayRomaji) return false;
    if (prevProps.currentInput !== nextProps.currentInput) return false;

    const prevColoring = prevProps.coloringInfo || {};
    const nextColoring = nextProps.coloringInfo || {};

    if (prevColoring.typedLength !== nextColoring.typedLength) return false;
    if (prevColoring.currentInputLength !== nextColoring.currentInputLength) return false;
    if (prevColoring.currentPosition !== nextColoring.currentPosition) return false;

    return true;
  }
);

// 表示名を設定（デバッグ用）
CanvasTypingDisplay.displayName = 'CanvasTypingDisplay';

export default CanvasTypingDisplay;