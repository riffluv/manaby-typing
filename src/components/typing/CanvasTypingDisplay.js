import React, { useRef, useEffect, useMemo, memo } from 'react';
import styles from '../../styles/GameScreen.module.css';
import typingWorkerManager from '../../utils/TypingWorkerManager';

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
    fontSize = 24, // 800x600画面に最適な中間サイズに変更
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
    // Worker連携用のレンダリング解除関数
    const unregisterRenderRef = useRef(null);
    // 入力イベントからのレンダリングフラグ
    const isInputTriggeredRenderRef = useRef(false);
    // 最後の入力タイムスタンプ
    const lastInputTimestampRef = useRef(0);
    
    // ローマ字文字列から末尾の「|」を削除（存在する場合）
    const cleanDisplayRomaji = useMemo(() => {
      return displayRomaji && displayRomaji.endsWith('|')
        ? displayRomaji.slice(0, -1)
        : displayRomaji;
    }, [displayRomaji]);

    // 色の定義 (CSSのカスタムプロパティに対応)
    const colors = useMemo(() => ({
      typed: '#FFFFFF', // 入力済み文字色（より明るい白に変更）
      current: '#FFFFFF', // 現在入力中の文字色（白に変更）
      nextChar: '#FFFF00', // 次に入力すべき文字色（黄色に変更）
      notTyped: '#FFFFFF', // 未入力の文字色（白に変更）
      cursor: '#FFFF00', // カーソル色（黄色に変更）
      cursorAlpha: 0.9, // カーソルの透明度（上げる）
      error: '#ff3333', // エラー時の文字色（赤）
      textShadow: 'rgba(0, 0, 0, 1.0)', // テキストの影色（黒で完全不透明）
      background: 'rgba(30, 30, 100, 0.95)' // 背景色（ほぼ不透明の濃い青）
    }), []);

    // 固定高さの設定（CSSと同期）
    const containerHeight = 120;
    // 最大表示幅（画面幅からの計算）
    const maxTextWidth = 700;
    // 改行が必要かどうかを判定するためのフラグ
    const needLineWrapRef = useRef(false);
    // テキスト位置のオフセット（改行時に使用）
    const textOffsetYRef = useRef(0);

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
    
    // テキストの改行処理を行う関数
    const wrapText = (ctx, text, maxWidth) => {
      if (!text) return { lines: [], needWrap: false };
      
      const words = text.split(''); // 日本語対応のため文字ごとに分割
      const lines = [];
      let currentLine = '';
      let needWrap = false;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + words[i];
        const metrics = measureTextCached(ctx, testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && i > 0) {
          lines.push(currentLine);
          currentLine = words[i];
          needWrap = true;
        } else {
          currentLine = testLine;
        }
      }
      
      lines.push(currentLine);
      return { lines, needWrap };
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

    // Web Workerと連携した高速描画関数
    const drawCanvasWithWorker = (timestamp, inputTimestamp) => {
      // 入力イベントトリガーかどうかを判定
      const isInputTriggered = inputTimestamp > lastInputTimestampRef.current;
      if (isInputTriggered) {
        lastInputTimestampRef.current = inputTimestamp;
        isInputTriggeredRenderRef.current = true;
      } else {
        isInputTriggeredRenderRef.current = false;
      }
      
      drawCanvas(timestamp);
    };

    // Canvas描画用の描画関数
    const drawCanvas = (timestamp) => {
      if (!canvasRef.current || !offscreenCanvasRef.current) return;
      
      // オフスクリーンコンテキストを取得
      const offscreenCtx = offscreenCanvasRef.current.getContext('2d', { alpha: true });
      
      // キャンバスをクリア
      offscreenCtx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      
      // 背景を描画（ほぼ不透明の背景で）
      offscreenCtx.fillStyle = colors.background;
      offscreenCtx.fillRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
      
      if (!cleanDisplayRomaji) {
        // メインキャンバスにオフスクリーンの内容をコピー
        const mainCtx = canvasRef.current.getContext('2d');
        mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        mainCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        requestNextFrame();
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
      
      // テキストの全長を測定して改行が必要かチェック
      const totalText = cleanDisplayRomaji;
      const maxWidth = maxTextWidth * 0.9; // 余白を考慮
      const { lines, needWrap } = wrapText(offscreenCtx, totalText, maxWidth);
      needLineWrapRef.current = needWrap;
      
      // テキスト測定（キャッシュ使用）
      let centerY = offscreenCanvasRef.current.height / (2 * dprRef.current);
      
      // 改行が必要な場合はY位置を上に調整
      if (needLineWrapRef.current) {
        const lineCount = lines.length;
        const totalHeight = lineCount * fontSize * lineHeight;
        const startY = (offscreenCanvasRef.current.height / dprRef.current - totalHeight) / 2;
        textOffsetYRef.current = startY;
        centerY = startY + (fontSize * lineHeight) / 2;
      } else {
        textOffsetYRef.current = 0;
      }
      
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
        if (needLineWrapRef.current) {
          // 複数行テキストの描画
          let lineY = centerY + errorOffsetY;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWidth = measureTextCached(offscreenCtx, line).width;
            const lineX = offscreenCanvasRef.current.width / (2 * dprRef.current) - lineWidth / 2;
            
            offscreenCtx.fillStyle = colors.typed;
            offscreenCtx.shadowColor = colors.textShadow;
            offscreenCtx.shadowBlur = 4;
            offscreenCtx.fillText(line, lineX, lineY);
            
            lineY += fontSize * lineHeight;
          }
        } else {
          // 単一行テキストの描画
          offscreenCtx.fillStyle = colors.typed;
          offscreenCtx.shadowColor = colors.textShadow;
          offscreenCtx.shadowBlur = 4;
          offscreenCtx.fillText(cleanDisplayRomaji, currentX, centerY + errorOffsetY);
        }
        
        offscreenCtx.shadowBlur = 0;
        
        // メインキャンバスにオフスクリーンの内容をコピー
        const mainCtx = canvasRef.current.getContext('2d');
        mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        mainCtx.drawImage(offscreenCanvasRef.current, 0, 0);
        
        return;
      }
      
      // 改行が必要な場合は複数行描画
      if (needLineWrapRef.current) {
        // 複数行テキストの描画
        let currentLineIndex = 0;
        let currentLineOffset = 0;
        let currentPos = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineWidth = measureTextCached(offscreenCtx, line).width;
          const lineX = offscreenCanvasRef.current.width / (2 * dprRef.current) - lineWidth / 2;
          const lineY = centerY + (i * fontSize * lineHeight);
          
          // このライン内に現在の入力位置があるかチェック
          const lineEndPos = currentPos + line.length;
          if (currentPosition >= currentPos && currentPosition < lineEndPos) {
            currentLineIndex = i;
            currentLineOffset = currentPosition - currentPos;
          }
          
          // 入力済み部分
          const lineTypedText = i < currentLineIndex ? line : 
                                (i === currentLineIndex ? line.substring(0, currentLineOffset) : '');
          
          // 現在の行の未入力部分
          const lineRestText = i < currentLineIndex ? '' : 
                              (i === currentLineIndex ? line.substring(currentLineOffset) : line);
          
          // 各行の描画
          if (lineTypedText) {
            offscreenCtx.fillStyle = colors.typed;
            offscreenCtx.shadowColor = colors.textShadow;
            offscreenCtx.shadowBlur = 4;
            offscreenCtx.fillText(lineTypedText, lineX, lineY + errorOffsetY);
            offscreenCtx.shadowBlur = 0;
          }
          
          if (lineRestText && i === currentLineIndex) {
            // 現在のライン: 入力中部分、次の文字、残り部分を分けて描画
            const currentTextWidth = currentText ? measureTextCached(offscreenCtx, currentText).width : 0;
            const currentTextX = lineX + measureTextCached(offscreenCtx, lineTypedText).width;
            
            if (currentText) {
              offscreenCtx.fillStyle = colors.current;
              offscreenCtx.shadowColor = colors.textShadow;
              offscreenCtx.shadowBlur = 4;
              offscreenCtx.fillText(currentText, currentTextX, lineY + errorOffsetY);
              offscreenCtx.shadowBlur = 0;
            }
            
            // 次の文字
            if (nextChar) {
              const nextCharX = currentTextX + currentTextWidth;
              offscreenCtx.fillStyle = colors.nextChar;
              offscreenCtx.shadowColor = colors.textShadow;
              offscreenCtx.shadowBlur = 7;
              offscreenCtx.font = `bold ${fontSize}px ${fontFamily}`;
              offscreenCtx.fillText(nextChar, nextCharX, lineY + errorOffsetY);
              offscreenCtx.shadowBlur = 0;
              offscreenCtx.font = `${fontSize}px ${fontFamily}`;
              
              // 下線
              const nextCharWidth = measureTextCached(offscreenCtx, nextChar).width;
              offscreenCtx.strokeStyle = colors.nextChar;
              offscreenCtx.lineWidth = 2;
              offscreenCtx.beginPath();
              offscreenCtx.moveTo(nextCharX, lineY + fontSize/2 + errorOffsetY);
              offscreenCtx.lineTo(nextCharX + nextCharWidth, lineY + fontSize/2 + errorOffsetY);
              offscreenCtx.stroke();
              
              // 残りの未入力部分
              const restStartX = nextCharX + nextCharWidth;
              const restText = lineRestText.substring(currentInputLength + 1);
              if (restText) {
                offscreenCtx.fillStyle = colors.notTyped;
                offscreenCtx.globalAlpha = 0.8;
                offscreenCtx.fillText(restText, restStartX, lineY + errorOffsetY);
                offscreenCtx.globalAlpha = 1;
              }
              
              // カーソル描画
              if (cursorVisibleRef.current && !isCompleted) {
                offscreenCtx.fillStyle = colors.cursor;
                offscreenCtx.globalAlpha = colors.cursorAlpha;
                offscreenCtx.fillRect(nextCharX + nextCharWidth + 2, lineY - fontSize/2 + errorOffsetY, 2, fontSize);
                offscreenCtx.globalAlpha = 1;
              }
            } else {
              // 次の文字がない場合は残りすべてをnotTypedで描画
              offscreenCtx.fillStyle = colors.notTyped;
              offscreenCtx.globalAlpha = 0.8;
              offscreenCtx.fillText(lineRestText.substring(currentInputLength), currentTextX + currentTextWidth, lineY + errorOffsetY);
              offscreenCtx.globalAlpha = 1;
            }
          } else if (i > currentLineIndex) {
            // 後続の行はすべて未入力
            offscreenCtx.fillStyle = colors.notTyped;
            offscreenCtx.globalAlpha = 0.8;
            offscreenCtx.fillText(line, lineX, lineY + errorOffsetY);
            offscreenCtx.globalAlpha = 1;
          }
          
          currentPos += line.length;
        }
      } else {
        // 単一行表示モード（標準描画）
        
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
          offscreenCtx.shadowBlur = 10; // シャドウを強調して視認性を向上
          offscreenCtx.font = `bold ${fontSize}px ${fontFamily}`; // 太字にして強調
          offscreenCtx.fillText(nextChar, currentX, centerY + errorOffsetY);
          offscreenCtx.shadowBlur = 0;
          offscreenCtx.font = `${fontSize}px ${fontFamily}`; // フォントを戻す
          
          // 下線をより明確に
          offscreenCtx.strokeStyle = colors.nextChar;
          offscreenCtx.lineWidth = 3; // 線を太くして視認性向上
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(currentX, centerY + fontSize/2);
          offscreenCtx.lineTo(currentX + nextCharWidth, centerY + fontSize/2);
          offscreenCtx.stroke();
          
          currentX += nextCharWidth;
        }
        
        // 4. 残りの未入力部分
        if (restText) {
          offscreenCtx.fillStyle = colors.notTyped;
          offscreenCtx.globalAlpha = 0.9; // 透明度を調整
          // テキストに強いシャドウを追加して視認性を向上
          offscreenCtx.shadowColor = 'black';
          offscreenCtx.shadowBlur = 6;
          offscreenCtx.shadowOffsetX = 0;
          offscreenCtx.shadowOffsetY = 0;
          offscreenCtx.fillText(restText, currentX, centerY + errorOffsetY);
          offscreenCtx.shadowBlur = 0; // シャドウをリセット
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
          offscreenCtx.fillRect(currentX + 2, centerY - fontSize/2 + errorOffsetY, 2, fontSize);
          offscreenCtx.globalAlpha = 1;
        }
      }
      
      // メインキャンバスにオフスクリーンの内容をコピー（高速描画）
      const mainCtx = canvasRef.current.getContext('2d');
      mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      mainCtx.drawImage(offscreenCanvasRef.current, 0, 0);
      
      // 最適化：入力からトリガーされた場合は状態比較せず常に高速描画
      if (isInputTriggeredRenderRef.current) {
        requestNextFrame();
        return;
      }
      
      // 通常の状態管理（入力トリガーでない場合）
      const currentState = {
        typedLength,
        currentInputLength,
        currentPosition,
        currentInput,
        errorOffsetX,
        errorOffsetY,
        cursorVisible: cursorVisibleRef.current,
        needLineWrap: needLineWrapRef.current
      };
      
      const stateChanged = JSON.stringify(currentState) !== JSON.stringify(prevRenderState.current);
      prevRenderState.current = {...currentState};
      
      // カーソル点滅や状態変更時のみ描画更新（CPU負荷軽減）
      if (stateChanged || timestamp - cursorBlinkTimestampRef.current < 50) {
        requestNextFrame();
      } else {
        // 次のカーソル点滅タイミングで更新
        const timeToNextBlink = cursorBlinkInterval - (timestamp - cursorBlinkTimestampRef.current);
        animationFrameId.current = setTimeout(() => {
          requestAnimationFrame(drawCanvas);
        }, timeToNextBlink);
      }
    };

    // 次のフレーム描画をリクエスト (Worker連携モード時は使用しない)
    const requestNextFrame = () => {
      // WorkerManagerが利用可能かチェック
      if (typingWorkerManager && typingWorkerManager.isWorkerAvailable()) {
        // Worker側でスケジュールされるので何もしない
        return;
      }
      
      // フォールバック: 通常のrequestAnimationFrame
      if (animationFrameId.current) {
        if (typeof animationFrameId.current === 'number') {
          if (animationFrameId.current < 1000) {
            cancelAnimationFrame(animationFrameId.current);
          } else {
            clearTimeout(animationFrameId.current);
          }
        }
      }
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
        dprRef.current = dpr; // 参照用に保存
        
        const rect = container.getBoundingClientRect();
        
        // 固定高さを使用（CSSと同期）
        const fixedHeight = containerHeight; 
        
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
          
          // エラー時は最高優先度で描画を要求
          if (typingWorkerManager && typingWorkerManager.isWorkerAvailable()) {
            typingWorkerManager.requestRender(1);
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

    // Web Worker連携のセットアップ
    useEffect(() => {
      // WorkerManagerにレンダリングコールバックを登録
      if (typingWorkerManager && typingWorkerManager.isWorkerAvailable()) {
        // 高優先度コールバック（入力直後に即座に反応するために使用）
        unregisterRenderRef.current = typingWorkerManager.registerRenderCallback(
          drawCanvasWithWorker, 
          true // 高優先度として登録
        );
        
        // 初回描画をリクエスト
        typingWorkerManager.requestRender(0);
      } else {
        // WorkerManagerが利用できない場合のフォールバック
        animationFrameId.current = requestAnimationFrame(drawCanvas);
      }
      
      return () => {
        // 登録解除関数があれば実行
        if (unregisterRenderRef.current) {
          unregisterRenderRef.current();
        }
        
        // 通常のアニメーションフレーム解除
        if (animationFrameId.current) {
          if (typeof animationFrameId.current === 'number') {
            if (animationFrameId.current < 1000) {
              cancelAnimationFrame(animationFrameId.current);
            } else {
              clearTimeout(animationFrameId.current);
            }
          }
        }
      };
    }, []);

    // Canvasの初期化とリサイズ処理
    useEffect(() => {
      // オフスクリーンキャンバス初期化
      initOffscreenCanvas();
      
      setCanvasSize(); // 初期サイズを設定
      
      // リサイズイベントの設定
      const handleResize = () => {
        setCanvasSize();
        
        // サイズ変更時も描画を要求
        if (typingWorkerManager && typingWorkerManager.isWorkerAvailable()) {
          typingWorkerManager.requestRender(0);
        }
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
      if (typingWorkerManager && typingWorkerManager.isWorkerAvailable()) {
        // Workerを使用している場合はWorker経由で描画リクエスト
        typingWorkerManager.requestRender(0);
      } else {
        // 通常のアニメーションフレーム
        if (typeof animationFrameId.current === 'number') {
          if (animationFrameId.current < 1000) { // requestAnimationFrameのID
            cancelAnimationFrame(animationFrameId.current);
          } else { // setTimeout のID
            clearTimeout(animationFrameId.current);
          }
        }
        animationFrameId.current = requestAnimationFrame(drawCanvas);
      }
    }, [
      cleanDisplayRomaji, 
      coloringInfo, 
      currentInput, 
      isCompleted
    ]);
    
    return (
      <div className={styles.canvasTypingContainer} style={{ zIndex: 10, position: 'relative' }}>
        <canvas 
          ref={canvasRef}
          className={styles.typingCanvas} 
          style={{
            willChange: 'transform',
            contain: 'content',
            transform: 'translateZ(0)', // GPU高速化
            imageRendering: 'crisp-edges', // テキスト描画の鮮明さを向上
            boxShadow: '0 0 15px rgba(0, 0, 0, 0.8)', // シャドウを強化
            borderRadius: '8px',
            border: '2px solid rgba(100, 100, 255, 0.5)', // 境界線を追加
            zIndex: 10, // z-indexを明示的に設定
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