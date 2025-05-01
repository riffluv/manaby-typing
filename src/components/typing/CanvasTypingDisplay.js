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

    // Canvas描画用の描画関数
    const drawCanvas = (timestamp) => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!cleanDisplayRomaji) return;
      
      // フォントの設定
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'middle';
      
      const { typedLength = 0, currentInputLength = 0 } = coloringInfo || {};
      const currentPosition = coloringInfo?.currentPosition || 0;

      // テキスト分割（TypingDisplayと同様）
      const typedText = cleanDisplayRomaji.substring(0, typedLength);
      const currentText = currentInput || '';
      const nextChar = cleanDisplayRomaji.charAt(currentPosition + currentInputLength);
      const restText = cleanDisplayRomaji.substring(currentPosition + currentInputLength + 1);

      // テキスト測定
      const centerY = canvas.height / 2;
      
      // エラーアニメーションのオフセットを取得
      const { x: errorOffsetX, y: errorOffsetY } = errorOffsetRef.current;
      
      // テキスト描画開始X位置（中央寄せ）
      let totalTextWidth = 0;
      if (typedText) totalTextWidth += ctx.measureText(typedText).width;
      if (currentText) totalTextWidth += ctx.measureText(currentText).width;
      if (nextChar) totalTextWidth += ctx.measureText(nextChar).width;
      if (restText) totalTextWidth += ctx.measureText(restText).width;
      
      // 描画開始位置（中央寄せ）
      let currentX = Math.max(20, (canvas.width - totalTextWidth) / 2) + errorOffsetX;
      
      // 完了状態
      if (isCompleted) {
        ctx.fillStyle = colors.typed;
        ctx.shadowColor = colors.textShadow;
        ctx.shadowBlur = 4;
        ctx.fillText(cleanDisplayRomaji, currentX, centerY + errorOffsetY);
        ctx.shadowBlur = 0;
        return;
      }
      
      // 1. 入力済み部分の描画
      if (typedText) {
        ctx.fillStyle = colors.typed;
        ctx.shadowColor = colors.textShadow;
        ctx.shadowBlur = 4;
        ctx.fillText(typedText, currentX, centerY + errorOffsetY);
        ctx.shadowBlur = 0;
        currentX += ctx.measureText(typedText).width;
      }
      
      // 2. 現在入力中のテキストの描画
      if (currentText) {
        ctx.fillStyle = colors.current;
        ctx.shadowColor = colors.textShadow;
        ctx.shadowBlur = 4;
        ctx.fillText(currentText, currentX, centerY + errorOffsetY);
        ctx.shadowBlur = 0;
        currentX += ctx.measureText(currentText).width;
      }
      
      // 3. 次に入力すべき一文字を強調表示
      if (nextChar) {
        ctx.fillStyle = colors.nextChar;
        ctx.shadowColor = colors.textShadow;
        ctx.shadowBlur = 7; // 次の文字はより強調
        ctx.font = `bold ${fontSize}px ${fontFamily}`; // 太字にして強調
        ctx.fillText(nextChar, currentX, centerY + errorOffsetY);
        ctx.shadowBlur = 0;
        ctx.font = `${fontSize}px ${fontFamily}`; // フォントを戻す
        
        // 下線を引いて強調表示
        const nextCharWidth = ctx.measureText(nextChar).width;
        ctx.strokeStyle = colors.nextChar;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, centerY + fontSize/2);
        ctx.lineTo(currentX + nextCharWidth, centerY + fontSize/2);
        ctx.stroke();
        
        currentX += nextCharWidth;
      }
      
      // 4. 残りの未入力部分
      if (restText) {
        ctx.fillStyle = colors.notTyped;
        ctx.globalAlpha = 0.8;
        ctx.fillText(restText, currentX, centerY + errorOffsetY);
        ctx.globalAlpha = 1;
      }
      
      // 5. カーソル描画（1秒間隔で点滅）
      const cursorBlinkInterval = 500; // ミリ秒
      if ((timestamp - cursorBlinkTimestampRef.current) > cursorBlinkInterval) {
        cursorBlinkTimestampRef.current = timestamp;
        cursorVisibleRef.current = !cursorVisibleRef.current;
      }
      
      if (cursorVisibleRef.current && !isCompleted) {
        ctx.fillStyle = colors.cursor;
        ctx.globalAlpha = colors.cursorAlpha;
        ctx.fillRect(currentX + 2, centerY - fontSize/2, 2, fontSize);
        ctx.globalAlpha = 1;
      }
      
      // アニメーションフレームを要求
      animationFrameId.current = requestAnimationFrame(drawCanvas);
    };
    
    // キャンバスのサイズ設定
    const setCanvasSize = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const container = canvas.parentElement;
      
      if (container) {
        // DPIを考慮したキャンバスサイズ設定
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        // 固定高さを使用し、コンテナの幅に合わせる
        const fixedHeight = 120; // CSSで定義した固定高さに合わせる
        
        canvas.width = rect.width * dpr;
        canvas.height = fixedHeight * dpr;
        
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${fixedHeight}px`;
        
        // スケーリング調整
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
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
      setCanvasSize(); // 初期サイズを設定
      
      // リサイズイベントの設定
      const handleResize = () => {
        setCanvasSize();
      };
      
      window.addEventListener('resize', handleResize);
      
      // 描画開始
      animationFrameId.current = requestAnimationFrame(drawCanvas);
      
      // クリーンアップ関数
      return () => {
        window.removeEventListener('resize', handleResize);
        
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
        
        if (errorTimerRef.current) {
          cancelAnimationFrame(errorTimerRef.current);
        }
      };
    }, []);
    
    // 表示内容、色分け情報が更新されたら再描画をトリガー
    useEffect(() => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
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