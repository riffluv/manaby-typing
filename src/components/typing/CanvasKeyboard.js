'use client';

import React, { useEffect, useRef, useMemo } from 'react';

/**
 * 最適化版ドットスタイルのレトロSFキーボード
 * メインカラーはオレンジで、ドット表現とレトロなSF感を取り入れた
 * タイピングゲーム向けキャンバスベースのキーボード
 * 
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.nextKey - 次に入力すべきキー
 * @param {string} props.lastPressedKey - 最後に押されたキー
 * @param {boolean} props.isError - エラー状態かどうか
 * @param {string} props.className - スタイリングのためのクラス名
 * @returns {React.ReactElement}
 */
const CanvasKeyboard = ({
  nextKey = '',
  lastPressedKey = '',
  isError = false,
  className = ''
}) => {
  // キャンバス要素への参照
  const canvasRef = useRef(null);
  // アニメーションフレームへの参照
  const animFrameRef = useRef(null);
  // キーの状態を保持するオブジェクト
  const keyStatesRef = useRef({});
  // アニメーション用タイムスタンプ
  const animTimeRef = useRef(0);
  // 日本語キーボードレイアウト - useMemoで最適化
  const keyboardLayout = useMemo(() => [
    [['1', '!'], ['2', '"'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '&'], ['7', "'"], ['8', '('], ['9', ')'], ['0', ''], ['-', '='], ['^', '~'], ['\\', '|']],
    [['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'], ['y', 'Y'], ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['@', '`'], ['[', '{']],
    [['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'], ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', '+'], [':', '*'], [']', '}']],
    [['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'], ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?'], ['\\', '_']],
    [['space', 'space']]
  ], []);
  // カラーパレット（レトロ風）- useMemoで最適化
  const colors = useMemo(() => ({
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
    textDim: '#B4B4B4'
  }), []);  // 最後に押されたキーの状態を更新
  useEffect(() => {
    const lowerLastPressed = lastPressedKey?.toLowerCase() || '';

    // キーの状態を完全にリセット - 1つのキーだけを活性化状態にする
    keyStatesRef.current = {};

    // 新しいキー状態を設定（最後に押されたキーのみを保持）
    if (lowerLastPressed) {
      keyStatesRef.current[lowerLastPressed] = {
        pressed: true,
        timestamp: Date.now(),
        error: isError
      };
    }
  }, [lastPressedKey, isError]);

  // キャンバスの描画処理
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // キャンバスサイズを設定 - 親要素に依存しない固定サイズに変更
    const setCanvasSize = () => {
      const scale = window.devicePixelRatio || 1;

      // 固定サイズを設定（親要素に依存せず、キーボードが完全に表示されるサイズ）
      const width = 800; // キーボード全体を表示するのに十分な幅
      const height = 280; // 高さも十分確保

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
    const handleResize = () => {
      // ウィンドウサイズが変わっても、キーボードは固定サイズのままにする
      setCanvasSize();
    };
    window.addEventListener('resize', handleResize);    /**
     * 矩形をドット絵風に描画する関数（最適化版）
     */
    const drawPixelRect = (x, y, w, h, color, pixelSize = 3) => {
      // 座標を整数に丸める（ピクセル位置を整える）
      x = Math.floor(x);
      y = Math.floor(y);
      w = Math.floor(w);
      h = Math.floor(h);

      // まず全体を塗る（基本色）
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);

      // 軽量化のため、完全なドットパターンではなく、枠線のみにドット効果を適用
      if (pixelSize > 1) {
        // 上下の枠線のみドット表現
        for (let px = x; px < x + w; px += pixelSize) {
          // 上部
          ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
          ctx.fillRect(px, y, Math.min(pixelSize - 1, x + w - px), 1);

          // 下部
          ctx.fillStyle = `rgba(0, 0, 0, 0.2)`;
          ctx.fillRect(px, y + h - 1, Math.min(pixelSize - 1, x + w - px), 1);
        }
      }
    };

    /**
     * グローエフェクトを描画する関数
     */
    const drawGlow = (x, y, w, h, color, intensity) => {
      // グラデーションを作成
      const grd = ctx.createRadialGradient(
        x + w / 2, y + h / 2, 0,
        x + w / 2, y + h / 2, Math.max(w, h) / 1.5
      );
      grd.addColorStop(0, color.replace(/[^,]+\)$/, `${intensity})`));
      grd.addColorStop(1, color.replace(/[^,]+\)$/, '0)'));

      // グラデーションを適用
      ctx.fillStyle = grd;
      ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
    };    // 前回の描画からの最小間隔（ms）- フレームレート制限を強化
    const MIN_DRAW_INTERVAL = 50; // 約20FPS（より低いフレームレートで安定化）
    let lastDrawTime = 0;
    let lastRafId = null;

    // キーボードの描画関数
    const drawKeyboard = (timestamp) => {
      // キャンセルされたフレームをスキップ
      if (lastRafId === null) return;

      // アニメーションの時間を計算（タイムスタンプを安定化）
      if (!animTimeRef.current) animTimeRef.current = timestamp;
      const elapsed = timestamp - animTimeRef.current;
      animTimeRef.current = timestamp;

      // フレームレートの厳格な制限（パフォーマンス向上のため）
      if (timestamp - lastDrawTime < MIN_DRAW_INTERVAL) {
        // 次の描画をスケジュール（厳密なフレームレート制限）
        clearTimeout(animFrameRef.current);
        animFrameRef.current = setTimeout(() => {
          lastRafId = requestAnimationFrame(drawKeyboard);
        }, MIN_DRAW_INTERVAL);
        return;
      }
      lastDrawTime = timestamp;
      // キャンバスを完全に初期化（残像を防止）
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // キャンバスをリセットして再描画の品質を向上
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      // スケール設定を完全にリセット
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(scale, scale);// 背景効果：SFっぽいグリッド（さらに軽量化）
      // グリッドは5秒ごとに1回だけ描画（静止画として）
      if (Math.floor(timestamp / 5000) !== Math.floor(lastDrawTime / 5000)) {
        const gridSize = 30; // グリッドサイズを大きくして描画回数削減
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.07)';
        ctx.lineWidth = 1;

        // グリッド線を間引いて描画（垂直・水平をまとめて1回で）
        ctx.beginPath();
        // 水平グリッド線（まとめて描画、さらに間引き）
        for (let y = 0; y < height; y += gridSize * 2) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        // 垂直グリッド線（まとめて描画、さらに間引き）
        for (let x = 0; x < width; x += gridSize * 2) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        ctx.stroke();
      }// キーボード背景（シンプルな矩形で描画）
      ctx.fillStyle = 'rgba(10, 13, 20, 0.8)';
      ctx.fillRect(width / 2 - 380, 40, 760, 220);

      // キーボードの装飾的な枠線
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(width / 2 - 384, 36, 768, 228);
      ctx.stroke();

      // 装飾的なドット模様（四隅）- シンプル化
      const cornerDotSize = 6;
      ctx.fillStyle = colors.primary;

      // 左上
      ctx.fillRect(width / 2 - 384 - cornerDotSize / 2, 36 - cornerDotSize / 2, cornerDotSize, cornerDotSize);
      // 右上
      ctx.fillRect(width / 2 + 384 - cornerDotSize / 2, 36 - cornerDotSize / 2, cornerDotSize, cornerDotSize);
      // 左下
      ctx.fillRect(width / 2 - 384 - cornerDotSize / 2, 36 + 228 - cornerDotSize / 2, cornerDotSize, cornerDotSize);
      // 右下
      ctx.fillRect(width / 2 + 384 - cornerDotSize / 2, 36 + 228 - cornerDotSize / 2, cornerDotSize, cornerDotSize);

      // キーボードの装飾線（下部）- 数を減らして最適化
      const now = Date.now();
      // 動く線を1本に減らす
      const animOffset = (now / 3000) % 1;
      const lineX = width / 2 - 384 + animOffset * 768;

      ctx.strokeStyle = 'rgba(255, 140, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lineX, 36);
      ctx.lineTo(lineX, 36 + 228);
      ctx.stroke();

      // キーボードのサイズと位置を計算
      const keyWidth = 48;
      const keyHeight = 34;
      const keyGap = 5;
      const pixelSize = 2; // ドット表現のサイズ

      // キーボードの全体幅を計算
      const totalWidth = keyboardLayout.reduce((max, row) =>
        Math.max(max, row.reduce((sum, key) =>
          sum + (key[0] === 'space' ? keyWidth * 5 : keyWidth) + keyGap, 0)
        ), 0);

      // キーボードの開始位置（中央揃え）
      const startX = (width - totalWidth) / 2;
      const startY = 50; // 上部に余白を確保

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

          // 厳密に次のキーかどうかを判定（完全一致）
          const isNextKey = lowerChar === nextKey?.toLowerCase() && nextKey !== '';

          // キーの状態を取得（単純化）
          const keyState = keyStatesRef.current[lowerChar];
          const isPressed = keyState?.pressed || false;
          const isKeyError = keyState?.error || false;
          const pressTimestamp = keyState?.timestamp || 0;
          const pressDuration = Date.now() - pressTimestamp;// キーの色とエフェクトを決定（シンプル化）
          let keyBgColor, keyBorderColor; if (isNextKey) {
            // 次のキーは強調表示（厳密に次の入力キーのみ）
            keyBgColor = colors.primaryDark;
            keyBorderColor = colors.primary;

            // シンプルな点滅効果（厳密に次のキーのみ）
            const pulseValue = Math.sin(timestamp / 400) * 0.5 + 0.5;
            if (pulseValue > 0.4) {
              ctx.fillStyle = `rgba(255, 140, 0, ${Math.min(0.15, pulseValue * 0.2)})`;
              ctx.fillRect(x - 2, y - 2, keyW + 4, keyHeight + 4);
            }
          } else if (isPressed && pressDuration < 200) {
            // 押されたキーは一時的に色を変える
            if (isKeyError) {
              // エラーの場合は赤系
              keyBgColor = colors.error;
              keyBorderColor = colors.error;
            } else {
              // 正解の場合はオレンジ系
              keyBgColor = colors.primaryLight;
              keyBorderColor = colors.primary;
            }
          } else {
            // 通常のキー
            keyBgColor = colors.bgMid;
            keyBorderColor = 'rgba(50, 55, 70, 0.8)';
          }          // キーの背景（シンプル化）
          ctx.fillStyle = keyBgColor;
          ctx.fillRect(x, y, keyW, keyHeight);

          // キーの境界線（シンプル化）
          ctx.strokeStyle = keyBorderColor;
          // 次のキーのみ太い境界線を適用
          ctx.lineWidth = isNextKey ? 2 : 1;
          ctx.strokeRect(x, y, keyW, keyHeight);

          // ドット装飾は次に押すキーのみに限定
          if (isNextKey) {
            // 右上にドット1つだけ配置（簡素化）
            ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
            ctx.fillRect(x + keyW - 6, y + 4, 2, 2);
          }

          // キーのテキスト
          ctx.fillStyle = isNextKey
            ? colors.textLight
            : isPressed && pressDuration < 300
              ? colors.textLight
              : colors.textMid;
          // テキスト描画を簡素化（フォント設定を一度だけに）
          ctx.font = `bold ${isSpace ? 14 : 13}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // スペースキーの場合は特殊な表示
          if (isSpace) {
            ctx.fillText('SPACE', x + keyW / 2, y + keyHeight / 2);

            // スペースキーの装飾 - シンプル化
            if (isNextKey) {  // 次に押すべきキーの場合のみ装飾
              ctx.strokeStyle = 'rgba(255, 140, 0, 0.5)';
              ctx.beginPath();
              ctx.moveTo(x + 15, y + keyHeight / 2);
              ctx.lineTo(x + keyW - 15, y + keyHeight / 2);
              ctx.stroke();
            }
          } else {
            // 通常のキー
            ctx.fillText(keyChar.toUpperCase(), x + keyW / 2, y + keyHeight / 2);

            // シフト文字を表示（小さく薄く）- 次に押すべきキーの場合のみ表示
            if (isNextKey && shiftChar && shiftChar !== keyChar.toUpperCase()) {
              ctx.fillStyle = colors.textDim;
              ctx.font = `bold 8px monospace`;
              ctx.fillText(shiftChar, x + keyW - 8, y + 8);
            }
          }          // 次のキーの場合のみ、特別な視覚効果を適用
          if (isNextKey) {
            // 安定したパルスエフェクト（時間に依存するが、より安定した波形を使用）
            const pulseTime = timestamp / 600; // より遅いパルス
            const pulseSize = Math.sin(pulseTime) * 1.5;
            const pulseAlpha = 0.4 + Math.sin(pulseTime) * 0.15;

            // フレームレートに依存しない描画
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

          // 次のキー位置へ移動
          x += keyW + keyGap;
        });
      });      // 次のアニメーションフレームを安全に要求
      if (lastRafId !== null) {
        lastRafId = requestAnimationFrame(drawKeyboard);
        animFrameRef.current = lastRafId;
      }
    };    // 描画を安全に開始
    lastRafId = requestAnimationFrame(drawKeyboard);
    animFrameRef.current = lastRafId;// クリーンアップ処理を強化
    return () => {
      // イベントリスナーを削除
      window.removeEventListener('resize', handleResize);

      // アニメーションと残像をすべてクリア
      lastRafId = null; // アニメーションが停止したことをマーク

      if (typeof animFrameRef.current === 'number') {
        cancelAnimationFrame(animFrameRef.current);
      }

      if (animFrameRef.current) {
        clearTimeout(animFrameRef.current);
      }

      // キーの状態をクリア
      keyStatesRef.current = {};
    };
  }, [nextKey, keyboardLayout, colors]);

  // コンテナのスタイル - 制限を削除し、常にキーボード全体が表示されるように
  const containerStyle = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '10px auto 30px',
    padding: 0,
    position: 'relative',
    overflow: 'visible' // はみ出し表示を許可
  };

  // キャンバスのスタイル
  const canvasStyle = {
    display: 'block',
    width: '800px', // 固定幅を設定
    height: '280px',
    imageRendering: 'pixelated' // ピクセル表示を鮮明に
  };

  return (
    <div style={containerStyle} className={className}>
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        aria-label="レトロスタイルのタイピングキーボード"
      />
    </div>
  );
};

export default CanvasKeyboard;