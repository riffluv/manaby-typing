'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createSimple2DRenderer, isWebGPUSupported } from '../../utils/webgpu/WebGPUUtils';
import styles from '../../styles/typing/WebGPUKeyboard.module.css';

// 日本語キーボードレイアウト
const JP_KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '¥'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
];

// 英語キーボードレイアウト
const EN_KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", '\\'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
];

// キーの色設定
const KEY_COLORS = {
  default: [0.3, 0.3, 0.3, 1.0], // 通常時のキーの色
  highlight: [0.2, 0.7, 1.0, 1.0], // 次に押すべきキーの色
  pressed: [0.0, 1.0, 0.4, 1.0], // 押されたキーの色
  error: [1.0, 0.3, 0.3, 1.0], // エラー時のキーの色
};

/**
 * Web GPU 対応のキーボード表示コンポーネント
 * ハードウェアアクセラレーションを使用して高速な描画を実現
 */
const WebGPUKeyboard = ({
  nextKey = '', // 次に押すべきキー
  lastPressedKey = '', // 最後に押されたキー
  isError = false, // エラー状態かどうか
  layout = 'jp', // キーボードレイアウト
  className = '', // 追加のCSSクラス
}) => {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [gpuSupported, setGpuSupported] = useState(true); // 初期状態は対応と仮定
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const [errorKey, setErrorKey] = useState('');

  // レイアウトの選択
  const keyboardLayout = layout === 'jp' ? JP_KEYBOARD_LAYOUT : EN_KEYBOARD_LAYOUT;

  // Web GPUサポートチェックとレンダラー初期化
  useEffect(() => {
    const supported = isWebGPUSupported();
    setGpuSupported(supported);

    if (!supported || !canvasRef.current) {
      console.warn('[WebGPUKeyboard] Web GPU がサポートされていないか、canvasが利用できません');
      return;
    }

    // キャンバスサイズを設定
    const updateCanvasSize = () => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      setCanvasSize({
        width: rect.width,
        height: rect.height
      });
    };

    // 初期サイズ設定とリサイズリスナー
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // レンダラーの作成は別のuseEffectで行う（canvasSizeが確定後）

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // canvasSize変更時にレンダラー初期化
  useEffect(() => {
    if (!gpuSupported || !canvasRef.current || canvasSize.width === 0) return;

    const initRenderer = async () => {
      try {
        const renderer = await createSimple2DRenderer(canvasRef.current);
        if (renderer) {
          rendererRef.current = renderer;
          // 初期描画
          drawKeyboard();
        } else {
          console.error('[WebGPUKeyboard] レンダラーの作成に失敗しました');
        }
      } catch (err) {
        console.error('[WebGPUKeyboard] Web GPUレンダラーの初期化エラー:', err);
        setGpuSupported(false);
      }
    };

    initRenderer();

    return () => {
      // レンダラーのクリーンアップは不要
      // ブラウザがGPUリソースを自動的に解放する
    };
  }, [canvasSize, gpuSupported]);

  // エラー状態の変化を検出して処理
  useEffect(() => {
    if (isError && lastPressedKey) {
      setErrorKey(lastPressedKey);

      // エラーアニメーション用のタイマー
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      errorTimeoutRef.current = setTimeout(() => {
        setErrorKey('');
      }, 300); // 300ms後にエラー表示をクリア
    }

  }, [isError, lastPressedKey]);

  // キー状態の変化があった場合に再描画
  useEffect(() => {
    if (rendererRef.current) {
      drawKeyboard();
    }
  }, [nextKey, lastPressedKey, errorKey]);

  // キーボードを描画する関数
  const drawKeyboard = () => {
    const renderer = rendererRef.current;
    if (!renderer || !canvasRef.current) return;

    // キャンバスクリア
    renderer.clear(0.15, 0.15, 0.15, 1.0);

    // キーボードのサイズと位置を計算
    const canvas = canvasRef.current;
    const rowCount = keyboardLayout.length;
    const maxKeysInRow = Math.max(...keyboardLayout.map(row => row.length));

    // キーのサイズと間隔
    const keyMargin = 5;
    const keySize = Math.min(
      (canvas.width - keyMargin * (maxKeysInRow + 1)) / maxKeysInRow,
      (canvas.height - keyMargin * (rowCount + 1)) / rowCount
    );

    // スペースキーの位置と幅
    const spaceKeyWidth = keySize * 5;
    const spaceKeyX = (canvas.width - spaceKeyWidth) / 2;
    const spaceKeyY = keyMargin * (rowCount + 1) + keySize * rowCount;

    // スペースキーの描画
    const isSpaceHighlighted = nextKey === ' ';
    const isSpacePressed = lastPressedKey === ' ';
    const isSpaceError = errorKey === ' ';

    let spaceColor = KEY_COLORS.default;
    if (isSpaceError) {
      spaceColor = KEY_COLORS.error;
    } else if (isSpaceHighlighted) {
      spaceColor = KEY_COLORS.highlight;
    } else if (isSpacePressed) {
      spaceColor = KEY_COLORS.pressed;
    }

    renderer.drawRect(spaceKeyX, spaceKeyY, spaceKeyWidth, keySize, spaceColor);

    // 各キーを描画
    keyboardLayout.forEach((row, rowIndex) => {
      const y = keyMargin + rowIndex * (keySize + keyMargin);

      // この行のキーの合計幅を計算
      const rowWidth = row.length * keySize + (row.length - 1) * keyMargin;

      // 中央寄せのための左端位置を計算
      const startX = (canvas.width - rowWidth) / 2;

      row.forEach((key, keyIndex) => {
        const x = startX + keyIndex * (keySize + keyMargin);

        // キーの状態によって色を決定
        const isHighlighted = key.toLowerCase() === nextKey.toLowerCase();
        const isPressed = key.toLowerCase() === lastPressedKey.toLowerCase();
        const isErrorKey = key.toLowerCase() === errorKey.toLowerCase();

        let keyColor = KEY_COLORS.default;
        if (isErrorKey) {
          keyColor = KEY_COLORS.error;
        } else if (isHighlighted) {
          keyColor = KEY_COLORS.highlight;
        } else if (isPressed) {
          keyColor = KEY_COLORS.pressed;
        }

        // キーを描画
        renderer.drawRect(x, y, keySize, keySize, keyColor);
      });
    });
  };

  // Web GPUが非対応の場合はフォールバック表示
  if (!gpuSupported) {
    return (
      <div className={`${styles.fallback} ${className}`}>
        <p>Web GPUキーボードを表示できません。ブラウザが対応していない可能性があります。</p>
        <p>現在のブラウザでは、従来のCanvas 2Dでキーボードを表示します。</p>
        {/* フォールバックのキーボード表示コンポーネント */}
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${className}`}
      width={canvasSize.width || 600}
      height={canvasSize.height || 200}
    />
  );
};

export default WebGPUKeyboard;