'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import useAnimationWorker from '../../hooks/useAnimationWorker';

/**
 * Web Worker対応の最適化版レトロSFキーボード
 * アニメーション処理はWorkerで実行され、メインスレッドはレンダリングのみを担当
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.nextKey - 次に入力すべきキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} props.isError - エラー状態かどうか
 * @param {string} props.className - スタイリングのためのクラス名
 * @returns {React.ReactElement}
 */
const WorkerCanvasKeyboard = ({
  nextKey = '',
  lastPressedKey = '',
  isError = false,
  className = '',
}) => {
  // キャンバス要素への参照
  const canvasRef = useRef(null);

  // アニメーションWorkerフックを使用
  const {
    animationState,
    startAnimation,
    stopAnimation,
    handleKeyPress,
    setNextKey,
    isReady,
  } = useAnimationWorker();

  // 日本語キーボードレイアウト - useMemoで最適化
  const keyboardLayout = useMemo(
    () => [
      [
        ['1', '!'],
        ['2', '"'],
        ['3', '#'],
        ['4', '$'],
        ['5', '%'],
        ['6', '&'],
        ['7', "'"],
        ['8', '('],
        ['9', ')'],
        ['0', ''],
        ['-', '='],
        ['^', '~'],
        ['\\', '|'],
      ],
      [
        ['q', 'Q'],
        ['w', 'W'],
        ['e', 'E'],
        ['r', 'R'],
        ['t', 'T'],
        ['y', 'Y'],
        ['u', 'U'],
        ['i', 'I'],
        ['o', 'O'],
        ['p', 'P'],
        ['@', '`'],
        ['[', '{'],
      ],
      [
        ['a', 'A'],
        ['s', 'S'],
        ['d', 'D'],
        ['f', 'F'],
        ['g', 'G'],
        ['h', 'H'],
        ['j', 'J'],
        ['k', 'K'],
        ['l', 'L'],
        [';', '+'],
        [':', '*'],
        [']', '}'],
      ],
      [
        ['z', 'Z'],
        ['x', 'X'],
        ['c', 'C'],
        ['v', 'V'],
        ['b', 'B'],
        ['n', 'N'],
        ['m', 'M'],
        [',', '<'],
        ['.', '>'],
        ['/', '?'],
        ['\\', '_'],
      ],
      [['space', 'space']],
    ],
    []
  );

  // カラーパレット（レトロ風）- useMemoで最適化
  const colors = useMemo(
    () => ({
      // メインカラーはオレンジ
      primary: '#FF8C00', // オレンジ（rgba形式からHEX形式に変更・高速化）
      primaryLight: '#FFB41E',
      primaryDark: '#C86400',
      primaryGlow: 'rgba(255, 140, 0, 0.5)',

      // 背景色（暗めの青系）
      bgDark: '#0A0D14',
      bgMid: '#0F141E',
      bgLight: '#191E2D',

      // エラー色
      error: '#FF3C3C',
      errorGlow: 'rgba(255, 60, 60, 0.6)',

      // テキスト色
      textLight: '#F0F0F0',
      textMid: '#C8C8C8',
      textDim: '#B4B4B4',
    }),
    []
  );

  // プロパティ変更を監視して、Workerに通知
  useEffect(() => {
    if (!isReady) return;

    // 次のキーを設定
    if (nextKey !== animationState.nextKey) {
      setNextKey(nextKey);
    }

    // キー押下をハンドル
    if (lastPressedKey) {
      handleKeyPress(lastPressedKey, isError);
    }
  }, [
    nextKey,
    lastPressedKey,
    isError,
    isReady,
    animationState.nextKey,
    setNextKey,
    handleKeyPress,
  ]);

  // キャンバスの描画処理
  useEffect(() => {
    if (!canvasRef.current || !isReady) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // キャンバスサイズを設定
    const setCanvasSize = () => {
      const scale = window.devicePixelRatio || 1;

      // 固定サイズを設定
      const width = 800;
      const height = 280;

      // 物理ピクセル解像度を設定
      canvas.width = width * scale;
      canvas.height = height * scale;

      // CSS表示サイズを設定
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      return { width, height, scale };
    };

    const { width, height, scale } = setCanvasSize();

    // リサイズイベントのリスナーを設定
    const handleResize = () => setCanvasSize();
    window.addEventListener('resize', handleResize);

    // キーボードを描画する関数
    const drawKeyboard = () => {
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // キャンバスをリセット
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      // スケール設定
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scale, scale);

      // 背景のグリッド
      drawGrid(ctx, width, height);

      // キーボード背景
      drawKeyboardBackground(ctx, width);

      // キーを描画
      drawKeys(ctx, width, animationState.keyStates);
    };

    // グリッド描画関数
    const drawGrid = (ctx, width, height) => {
      const gridSize = 30;
      ctx.strokeStyle = 'rgba(255, 140, 0, 0.07)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let y = 0; y < height; y += gridSize * 2) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      for (let x = 0; x < width; x += gridSize * 2) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();
    };

    // キーボード背景の描画
    const drawKeyboardBackground = (ctx, width) => {
      ctx.fillStyle = 'rgba(10, 13, 20, 0.8)';
      ctx.fillRect(width / 2 - 380, 40, 760, 220);

      // 枠線
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(width / 2 - 384, 36, 768, 228);
      ctx.stroke();

      // 装飾的なドット模様（四隅）
      const cornerDotSize = 6;
      ctx.fillStyle = colors.primary;

      // 左上
      ctx.fillRect(
        width / 2 - 384 - cornerDotSize / 2,
        36 - cornerDotSize / 2,
        cornerDotSize,
        cornerDotSize
      );
      // 右上
      ctx.fillRect(
        width / 2 + 384 - cornerDotSize / 2,
        36 - cornerDotSize / 2,
        cornerDotSize,
        cornerDotSize
      );
      // 左下
      ctx.fillRect(
        width / 2 - 384 - cornerDotSize / 2,
        36 + 228 - cornerDotSize / 2,
        cornerDotSize,
        cornerDotSize
      );
      // 右下
      ctx.fillRect(
        width / 2 + 384 - cornerDotSize / 2,
        36 + 228 - cornerDotSize / 2,
        cornerDotSize,
        cornerDotSize
      );

      // 動く装飾線
      const now = Date.now();
      const animOffset = (now / 3000) % 1;
      const lineX = width / 2 - 384 + animOffset * 768;

      ctx.strokeStyle = 'rgba(255, 140, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineX, 36);
      ctx.lineTo(lineX, 36 + 228);
      ctx.stroke();
    };

    // キーを描画
    const drawKeys = (ctx, width, keyStates) => {
      const keyWidth = 48;
      const keyHeight = 34;
      const keyGap = 5;

      // キーボードの全体幅を計算
      const totalWidth = keyboardLayout.reduce(
        (max, row) =>
          Math.max(
            max,
            row.reduce(
              (sum, key) =>
                sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap,
              0
            )
          ),
        0
      );

      // キーボードの開始位置（中央揃え）
      const startX = (width - totalWidth) / 2;
      const startY = 50;

      // 行ごとに描画
      keyboardLayout.forEach((row, rowIndex) => {
        // この行の全キーの幅を計算
        let rowWidth = row.reduce(
          (sum, key) =>
            sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap,
          0
        );

        let x = startX + (totalWidth - rowWidth) / 2;
        const y = startY + rowIndex * (keyHeight + keyGap);

        // この行のキーを描画
        row.forEach(([keyChar, shiftChar]) => {
          const isSpace = keyChar === 'space';
          const keyW = isSpace ? keyWidth * 5 : keyWidth;
          const lowerChar = keyChar.toLowerCase();

          // 次のキーかどうかの判定
          const isNextKey =
            lowerChar === nextKey?.toLowerCase() && nextKey !== '';

          // キーの状態を取得（Workerから）
          const keyState = keyStates[lowerChar];
          const isPressed = keyState?.pressed || false;
          const isKeyError = keyState?.error || false;

          // キーの色を決定
          let keyBgColor, keyBorderColor;

          if (isNextKey) {
            // 次のキー
            keyBgColor = colors.primaryDark;
            keyBorderColor = colors.primary;

            // 点滅エフェクト
            const pulse = Math.sin(Date.now() / 400) * 0.5 + 0.5;
            if (pulse > 0.4) {
              ctx.fillStyle = `rgba(255, 140, 0, ${Math.min(
                0.15,
                pulse * 0.2
              )})`;
              ctx.fillRect(x - 2, y - 2, keyW + 4, keyHeight + 4);
            }
          } else if (isPressed) {
            // 押されたキー
            if (isKeyError) {
              keyBgColor = colors.error;
              keyBorderColor = colors.error;
            } else {
              keyBgColor = colors.primaryLight;
              keyBorderColor = colors.primary;
            }
          } else {
            // 通常のキー
            keyBgColor = colors.bgMid;
            keyBorderColor = 'rgba(50, 55, 70, 0.8)';
          }

          // キーの背景
          ctx.fillStyle = keyBgColor;
          ctx.fillRect(x, y, keyW, keyHeight);

          // キーの境界線
          ctx.strokeStyle = keyBorderColor;
          ctx.lineWidth = isNextKey ? 2 : 1;
          ctx.strokeRect(x, y, keyW, keyHeight);

          // 装飾（次のキーのみ）
          if (isNextKey) {
            ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
            ctx.fillRect(x + keyW - 6, y + 4, 2, 2);
          }

          // キーのテキスト
          ctx.fillStyle = isNextKey
            ? colors.textLight
            : isPressed
            ? colors.textLight
            : colors.textMid;

          ctx.font = `bold ${isSpace ? 14 : 13}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // スペースキー
          if (isSpace) {
            ctx.fillText('SPACE', x + keyW / 2, y + keyHeight / 2);

            if (isNextKey) {
              ctx.strokeStyle = 'rgba(255, 140, 0, 0.5)';
              ctx.beginPath();
              ctx.moveTo(x + 15, y + keyHeight / 2);
              ctx.lineTo(x + keyW - 15, y + keyHeight / 2);
              ctx.stroke();
            }
          } else {
            // 通常のキー
            ctx.fillText(
              keyChar.toUpperCase(),
              x + keyW / 2,
              y + keyHeight / 2
            );

            // シフト文字（次のキーのみ）
            if (isNextKey && shiftChar && shiftChar !== keyChar.toUpperCase()) {
              ctx.fillStyle = colors.textDim;
              ctx.font = `bold 8px monospace`;
              ctx.fillText(shiftChar, x + keyW - 8, y + 8);
            }
          }

          // 次のキーの特別効果
          if (isNextKey) {
            const pulseTime = Date.now() / 600;
            const pulseSize = Math.sin(pulseTime) * 1.5;
            const pulseAlpha = 0.4 + Math.sin(pulseTime) * 0.15;

            ctx.strokeStyle = `rgba(255, 154, 40, ${pulseAlpha.toFixed(2)})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.rect(
              x - 2 - pulseSize / 2,
              y - 2 - pulseSize / 2,
              keyW + 4 + pulseSize,
              keyHeight + 4 + pulseSize
            );
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // 次のキー位置
          x += keyW + keyGap;
        });
      });
    };

    // アニメーション開始
    startAnimation();

    // 描画関数を呼び出すタイマー
    const renderInterval = setInterval(drawKeyboard, 1000 / 30);

    // クリーンアップ
    return () => {
      stopAnimation();
      window.removeEventListener('resize', handleResize);
      clearInterval(renderInterval);
    };
  }, [
    colors,
    keyboardLayout,
    nextKey,
    animationState.keyStates,
    isReady,
    startAnimation,
    stopAnimation,
  ]);

  // コンテナのスタイル
  const containerStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '10px auto 30px',
    padding: 0,
    position: 'relative',
    overflow: 'visible', // はみ出し表示を許可
  };

  // キャンバスのスタイル
  const canvasStyle = {
    display: 'block',
    width: '800px',
    height: '280px',
    imageRendering: 'pixelated',
  };

  return (
    <div style={containerStyle} className={className}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        aria-label="レトロスタイルのタイピングキーボード（Worker対応）"
      />
    </div>
  );
};

export default WorkerCanvasKeyboard;
