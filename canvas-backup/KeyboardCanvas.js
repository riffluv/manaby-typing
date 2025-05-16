'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '../../styles/typing/KeyboardDisplay.module.css';

/**
 * Canvas ベースのキーボード表示コンポーネント
 * パフォーマンスを最適化したリアルなキーボード描画
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.nextKey - 次に入力すべきキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} props.isError - ミスタイプしたかどうか
 * @param {boolean} [props.compact=false] - コンパクトモードかどうか
 * @param {string} [props.layout='jp'] - キーボードレイアウト ('jp'または'en')
 * @returns {React.ReactElement}
 */
const KeyboardCanvas = ({
  nextKey = '',
  lastPressedKey = '',
  isError = false,
  compact = false,
  layout = 'jp'
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const containerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // キャンバスサイズを固定値として保持し、不要な再レンダリングを防止
  // 高さを増やす: 標準モードで200px、コンパクトモードで170pxに設定
  const canvasSizeRef = useRef({
    width: 0,
    height: compact ? 170 : 200,
    cssWidth: 0,
    cssHeight: compact ? 170 : 200
  });

  // キーボードレイアウト設定
  const keyboardLayout = layout === 'jp' ? [
    [['1', '!'], ['2', '"'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '&'], ['7', "'"], ['8', '('], ['9', ')'], ['0', ''], ['-', '='], ['^', '~'], ['\\', '|']],
    [['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'], ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['@', '`'], ['[', '{']],
    [['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', '+'], [':', '*'], [']', '}']],
    [['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'], ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?'], ['\\', '_']],
    [['space', 'space']]
  ] : [
    [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'], ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+']],
    [['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'], ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['[', '{'], [']', '}'], ['\\', '|']],
    [['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', ':'], ["'", '"']],
    [['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'], ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?']],
    [['space', 'space']]
  ];

  // アニメーション状態（キーのハイライトとエフェクト）- useStateではなくrefを使用して再レンダリングを防止
  const keyStatesRef = useRef({});

  // キャンバスのサイズを設定する（リサイズ処理を最適化）
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // DOMのサイズを取得（一度だけでよい）
    const containerWidth = container.clientWidth;
    const height = compact ? 170 : 200; // 高さを増やす
    const scale = window.devicePixelRatio || 1;

    // サイズが変わった場合のみ更新（不要な再設定を防止）
    if (canvasSizeRef.current.cssWidth !== containerWidth ||
      canvasSizeRef.current.cssHeight !== height) {

      // キャンバスサイズを更新
      canvasSizeRef.current = {
        width: containerWidth * scale,
        height: height * scale,
        cssWidth: containerWidth,
        cssHeight: height
      };

      // 物理ピクセルサイズを設定
      canvas.width = canvasSizeRef.current.width;
      canvas.height = canvasSizeRef.current.height;

      // CSSサイズを設定
      canvas.style.width = `${canvasSizeRef.current.cssWidth}px`;
      canvas.style.height = `${canvasSizeRef.current.cssHeight}px`;
    }
  }, [compact]);

  // コンポーネントのマウント時に一度だけキャンバスを初期化
  useEffect(() => {
    if (isInitializedRef.current) return;

    // 初期化済みフラグを設定
    isInitializedRef.current = true;

    // 初期サイズを設定
    resizeCanvas();

    // リサイズイベントのリスナーを設定
    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [resizeCanvas]);

  // キーのステータスを更新する（nextKeyとlastPressedKeyに基づいて）
  useEffect(() => {
    const lowerNextKey = nextKey?.toLowerCase() || '';
    const lowerLastPressed = lastPressedKey?.toLowerCase() || '';

    // 最後に押されたキーの状態を更新（reをstate変更ではなくrefの更新に変更）
    if (lowerLastPressed) {
      keyStatesRef.current = {
        ...keyStatesRef.current,
        [lowerLastPressed]: {
          pressed: true,
          timestamp: Date.now(),
          error: isError
        }
      };
    }
  }, [nextKey, lastPressedKey, isError]);

  // キャンバスにキーボードを描画する
  useEffect(() => {
    if (!canvasRef.current) return;

    // 最初のレンダリング時にリサイズを実行
    if (!isInitializedRef.current) {
      resizeCanvas();
      isInitializedRef.current = true;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 描画関数
    const drawKeyboard = () => {
      // 現在のキャンバスサイズを取得
      const { width, height, cssWidth, cssHeight } = canvasSizeRef.current;

      // キャンバスをクリア
      ctx.clearRect(0, 0, width, height);

      // スケール設定をリセット
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // デバイスピクセル比に合わせてスケーリング
      const scale = window.devicePixelRatio || 1;
      ctx.scale(scale, scale);

      // キーボードの背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // キーボードの寸法を計算
      const keyWidth = compact ? 35 : 45;
      const keyHeight = compact ? 30 : 35;
      const keyGap = compact ? 4 : 6;
      const totalWidth = keyboardLayout.reduce((max, row) =>
        Math.max(max, row.reduce((sum, key) =>
          sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap, 0)
        ), 0);

      // キーボードの開始位置（中央揃え）- 上下の余白を調整
      const startX = (cssWidth - totalWidth) / 2;
      const startY = compact ? 15 : 20; // 上部の余白を増やす

      // 行ごとの描画
      keyboardLayout.forEach((row, rowIndex) => {
        // この行の全キーの幅を計算（中央揃えのため）
        let rowWidth = row.reduce((sum, key) =>
          sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap, 0);

        let x = startX + (totalWidth - rowWidth) / 2;
        const y = startY + rowIndex * (keyHeight + keyGap);

        // キーを描画
        row.forEach(([keyChar, shiftChar]) => {
          const isSpace = keyChar === 'space';
          const keyW = isSpace ? keyWidth * 5 : keyWidth;
          const lowerChar = keyChar.toLowerCase();
          const isNextKey = lowerChar === nextKey?.toLowerCase();
          const keyState = keyStatesRef.current[lowerChar];
          const isPressed = keyState?.pressed;
          const isError = keyState?.error;
          const pressTimestamp = keyState?.timestamp || 0;
          const pressDuration = Date.now() - pressTimestamp;

          // キーの背景色
          let bgColor = 'rgba(20, 20, 30, 0.9)';
          if (isNextKey) {
            bgColor = 'rgba(255, 154, 40, 0.25)';
          } else if (isPressed && pressDuration < 300) {
            // 押された直後の300ms間だけハイライト
            const alpha = Math.max(0, 0.5 - (pressDuration / 600));
            bgColor = isError
              ? `rgba(255, 60, 60, ${alpha + 0.3})`
              : `rgba(255, 154, 40, ${alpha + 0.2})`;
          }

          // キーの影
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(x + 1, y + 3, keyW, keyHeight - 2);

          // キーの本体
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(x, y, keyW, keyHeight, 4);
          ctx.fill();

          // キーの境界線
          ctx.strokeStyle = isNextKey
            ? 'rgba(255, 154, 40, 0.5)'
            : 'rgba(0, 0, 0, 0.6)';
          ctx.lineWidth = isNextKey ? 1.5 : 1;
          ctx.beginPath();
          ctx.roundRect(x, y, keyW, keyHeight, 4);
          ctx.stroke();

          // キーのテキスト
          ctx.fillStyle = isNextKey
            ? '#ffffff'
            : 'rgba(255, 255, 255, 0.8)';
          ctx.font = `${compact ? '10' : '12'}px -apple-system, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // スペースキーの場合は特殊な表示
          if (isSpace) {
            ctx.fillText('Space', x + keyW / 2, y + keyHeight / 2);
          } else {
            ctx.fillText(keyChar, x + keyW / 2, y + keyHeight / 2 - 2);

            // Shift文字（小さく表示）
            if (shiftChar) {
              ctx.font = `${compact ? '8' : '9'}px -apple-system, "Segoe UI", sans-serif`;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.fillText(shiftChar, x + keyW - 8, y + 9);
            }
          }

          // 次のキーのハイライト
          if (isNextKey) {
            // パルスエフェクト
            const pulseSize = Math.sin(Date.now() / 500) * 2;

            ctx.strokeStyle = 'rgba(255, 154, 40, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(
              x - 2 - pulseSize / 2,
              y - 2 - pulseSize / 2,
              keyW + 4 + pulseSize,
              keyHeight + 4 + pulseSize,
              6
            );
            ctx.stroke();

            // 内側の光彩効果
            const gradient = ctx.createRadialGradient(
              x + keyW / 2, y + keyHeight / 2, 0,
              x + keyW / 2, y + keyHeight / 2, keyW / 1.5
            );
            gradient.addColorStop(0, 'rgba(255, 154, 40, 0.15)');
            gradient.addColorStop(1, 'rgba(255, 154, 40, 0)');

            ctx.fillStyle = gradient;
            ctx.fill();
          }

          // 次のキー位置に進む
          x += keyW + keyGap;
        });
      });

      // アニメーションフレームを要求
      animFrameRef.current = requestAnimationFrame(drawKeyboard);
    };

    // 描画を開始
    drawKeyboard();

    // クリーンアップ
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [compact, keyboardLayout, nextKey, resizeCanvas]);

  return (
    <div className={styles.keyboard_canvas_container} ref={containerRef} style={{ height: compact ? '170px' : '200px' }}>
      <canvas
        ref={canvasRef}
        className={styles.keyboard_canvas}
      />
    </div>
  );
};

export default KeyboardCanvas;