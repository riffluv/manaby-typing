'use client';

import React, { useEffect, useRef } from 'react';

/**
 * キャンバスベースのQWERTYキーボード表示コンポーネント
 * オレンジをテーマカラーとしたタイピングゲーム向けキーボード
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.nextKey - 次に入力すべきキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} props.isError - エラー状態かどうか
 * @param {string} props.layout - キーボードレイアウト ('jp'または'en')
 * @returns {React.ReactElement}
 */
const CanvasKeyboard = ({
  nextKey = '',
  lastPressedKey = '',
  isError = false,
  layout = 'jp'
}) => {
  // キャンバス要素への参照
  const canvasRef = useRef(null);
  // アニメーションフレームへの参照
  const animFrameRef = useRef(null);
  // キーの状態を保持するオブジェクト
  const keyStatesRef = useRef({});

  // キーボードレイアウト設定 (日本語/英語)
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

  // 最後に押されたキーの状態を更新
  useEffect(() => {
    const lowerLastPressed = lastPressedKey?.toLowerCase() || '';
    
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
  }, [lastPressedKey, isError]);

  // キャンバスの描画処理
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // キャンバスサイズを設定
    const setCanvasSize = () => {
      // コンテナのサイズに合わせる
      const parentWidth = canvas.parentElement?.clientWidth || 800;
      const scale = window.devicePixelRatio || 1;
      
      // お題エリアより大きめのサイズに設定
      const width = Math.min(parentWidth, 800);
      const height = 250; // お題エリアより大きめのサイズ
      
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
    
    // キーボードの描画関数
    const drawKeyboard = () => {
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // スケール設定をリセット
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scale, scale);
      
      // 背景は透明に設定（背景色を削除）
      // ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      // ctx.fillRect(0, 0, width, height);
      
      // オレンジグラデーション効果も削除
      // const gradient = ctx.createLinearGradient(0, 0, 0, height);
      // gradient.addColorStop(0, 'rgba(255, 140, 0, 0.05)');
      // gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      // ctx.fillStyle = gradient;
      // ctx.fillRect(0, 0, width, height);
      
      // キーボードのサイズと位置を計算
      const keyWidth = 50;
      const keyHeight = 38;
      const keyGap = 6;
      
      // キーボードの全体幅を計算
      const totalWidth = keyboardLayout.reduce((max, row) => 
        Math.max(max, row.reduce((sum, key) => 
          sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap, 0)
        ), 0);
      
      // キーボードの開始位置（中央揃え）
      const startX = (width - totalWidth) / 2;
      const startY = 30; // 上部に余白を確保
      
      // 行ごとに描画
      keyboardLayout.forEach((row, rowIndex) => {
        // この行の全キーの幅を計算（中央揃えのため）
        let rowWidth = row.reduce((sum, key) => 
          sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap, 0);
          
        let x = startX + (totalWidth - rowWidth) / 2;
        const y = startY + rowIndex * (keyHeight + keyGap);
        
        // この行のキーを描画
        row.forEach(([keyChar, shiftChar]) => {
          const isSpace = keyChar === 'space';
          const keyW = isSpace ? keyWidth * 5 : keyWidth;
          const lowerChar = keyChar.toLowerCase();
          const isNextKey = lowerChar === nextKey?.toLowerCase();
          const keyState = keyStatesRef.current[lowerChar];
          const isPressed = keyState?.pressed;
          const isKeyError = keyState?.error;
          const pressTimestamp = keyState?.timestamp || 0;
          const pressDuration = Date.now() - pressTimestamp;
          
          // キーの背景色
          let bgColor = 'rgba(20, 20, 30, 0.85)';
          if (isNextKey) {
            bgColor = 'rgba(255, 154, 40, 0.25)';
          } else if (isPressed && pressDuration < 300) {
            // 押された直後だけハイライト
            const alpha = Math.max(0, 0.5 - (pressDuration / 600));
            bgColor = isKeyError 
              ? `rgba(255, 60, 60, ${alpha + 0.3})` 
              : `rgba(255, 154, 40, ${alpha + 0.2})`;
          }
          
          // キーの影
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(x + 1, y + 3, keyW, keyHeight - 2);
          
          // キーの本体
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(x, y, keyW, keyHeight, 6);
          ctx.fill();
          
          // キーの境界線
          ctx.strokeStyle = isNextKey 
            ? 'rgba(255, 154, 40, 0.7)' 
            : 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = isNextKey ? 1.5 : 1;
          ctx.beginPath();
          ctx.roundRect(x, y, keyW, keyHeight, 6);
          ctx.stroke();
          
          // キーのテキスト
          ctx.fillStyle = isNextKey 
            ? '#ffffff' 
            : 'rgba(255, 255, 255, 0.8)';
          ctx.font = `13px -apple-system, "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // スペースキーの場合は特殊な表示
          if (isSpace) {
            ctx.fillText('Space', x + keyW / 2, y + keyHeight / 2);
          } else {
            ctx.fillText(keyChar.toUpperCase(), x + keyW / 2, y + keyHeight / 2);
            
            // シフト文字を表示（小さく薄く）
            if (shiftChar && shiftChar !== keyChar.toUpperCase()) {
              ctx.font = `9px -apple-system, "Segoe UI", sans-serif`;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.fillText(shiftChar, x + keyW - 9, y + 10);
            }
          }
          
          // 次のキーの場合、特別な視覚効果
          if (isNextKey) {
            // パルスエフェクト
            const pulseSize = Math.sin(Date.now() / 500) * 2;
            
            ctx.strokeStyle = 'rgba(255, 154, 40, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(
              x - 2 - pulseSize/2, 
              y - 2 - pulseSize/2, 
              keyW + 4 + pulseSize, 
              keyHeight + 4 + pulseSize, 
              8
            );
            ctx.stroke();
            
            // 内側の光彩効果
            const glow = ctx.createRadialGradient(
              x + keyW/2, y + keyHeight/2, 0,
              x + keyW/2, y + keyHeight/2, keyW/1.5
            );
            glow.addColorStop(0, 'rgba(255, 154, 40, 0.2)');
            glow.addColorStop(1, 'rgba(255, 154, 40, 0)');
            
            ctx.fillStyle = glow;
            ctx.fill();
          }
          
          // 次のキー位置へ移動
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
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [nextKey, keyboardLayout]);
  
  // スタイリング
  const containerStyle = {
    width: '100%',
    maxWidth: '850px',
    margin: '10px auto 30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    position: 'relative'
  };
  
  const canvasStyle = {
    display: 'block',
    width: '100%',
    height: '250px',
    borderRadius: '12px',
    // ボーダーとシャドウを削除
    // boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
  };

  return (
    <div style={containerStyle}>
      <canvas 
        ref={canvasRef} 
        style={canvasStyle}
        aria-label="タイピングキーボード"
      />
    </div>
  );
};

export default CanvasKeyboard;