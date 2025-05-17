'use client';

/**
 * RetroSFKeyboard.js
 * レトロなSF風キーボードUIコンポーネント
 * Canvas APIを使用して精密なドット表現のキーボードをレンダリング
 * メインスレッドで動作し、タイピング応答に影響しないよう最適化
 *
 * プライマリカラー: オレンジ
 * コンセプト: ドット, レトロ, SF感
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import styles from '../../styles/typing/RetroKeyboard.module.css';

// キーボードのキー配置（日本語キーボード）
const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '\\'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
  [' '], // スペースキー
];

// パフォーマンスを考慮した定数
const KEY_SIZE = 36; // キーの基本サイズ (40→36に縮小)
const KEY_MARGIN = 5; // キー間のマージン (6→5に縮小)
const KEY_RADIUS = 5; // キーの角丸半径
const SPACE_WIDTH = 225; // スペースキーの幅 (250→225に縮小)
const KEY_HEIGHT = 36; // キーの高さ (40→36に縮小)
const GLOW_SIZE = 14; // 光のサイズ (16→14に縮小)
const PRIMARY_COLOR = '#FF8800'; // プライマリカラー（オレンジ）
const SECONDARY_COLOR = '#00AAFF'; // セカンダリカラー（青）
const KEY_COLOR = '#333'; // 通常キーの色
const KEY_TEXT_COLOR = '#EEE'; // キーテキストの色
const HIGHLIGHT_COLOR = 'rgba(255, 136, 0, 0.8)'; // ハイライト色（オレンジ）
const PRESSED_HIGHLIGHT_COLOR = 'rgba(255, 136, 0, 1)'; // 押されたキーのハイライト色

/**
 * レトロなSF風キーボードコンポーネント
 * @param {Object} props コンポーネントプロパティ
 * @param {string} props.nextKey 次に入力すべきキー
 * @param {string} props.lastPressedKey 最後に押されたキー
 * @param {number} props.width キャンバスの幅
 * @param {number} props.height キャンバスの高さ
 * @returns {React.Component} キーボードコンポーネント
 */
const RetroSFKeyboard = ({
  nextKey = '',
  lastPressedKey = '',
  width = 800,
  height = 300,
}) => {
  // キャンバスの参照
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // キャンバスのコンテキスト
  const [ctx, setCtx] = useState(null);
  // 現在アニメーションしているキー
  const [animatingKey, setAnimatingKey] = useState(null);

  // キーのアニメーション状態
  const [keyStates, setKeyStates] = useState({});

  // ドットパーティクルのエフェクト管理
  const [particles, setParticles] = useState([]);

  // グリッドアニメーション用のタイムスタンプ
  const gridTimeRef = useRef(0);

  // 親コンテナからのサイズ測定
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // レスポンシブ対応のキーボードサイズ
  const keyboardDimensions = useMemo(() => {
    const totalWidth = Math.max(
      KEYBOARD_LAYOUT[0].length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN,
      KEYBOARD_LAYOUT[1].length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN,
      KEYBOARD_LAYOUT[2].length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN,
      KEYBOARD_LAYOUT[3].length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN,
      SPACE_WIDTH
    );
    const totalHeight =
      KEYBOARD_LAYOUT.length * (KEY_HEIGHT + KEY_MARGIN) - KEY_MARGIN;

    return { width: totalWidth, height: totalHeight };
  }, []);
  // キーの実際の位置を計算する
  const calculateKeyPositions = useCallback(() => {
    const positions = {};
    let yOffset = 5; // 少し上部に余白を追加

    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
      let xOffset = 0;

      // 行のセンタリング調整
      const rowWidth =
        row.length === 1
          ? SPACE_WIDTH
          : row.length * (KEY_SIZE + KEY_MARGIN) - KEY_MARGIN;
      const rowStartX = (containerSize.width - rowWidth) / 2;

      row.forEach((key, keyIndex) => {
        // スペースキーの特別扱い
        const keyWidth = key === ' ' ? SPACE_WIDTH : KEY_SIZE;

        positions[key] = {
          x: rowStartX + xOffset,
          y: yOffset,
          width: keyWidth,
          height: KEY_HEIGHT,
          row: rowIndex,
          column: keyIndex,
        };

        xOffset += keyWidth + KEY_MARGIN;
      });

      yOffset += KEY_HEIGHT + KEY_MARGIN;
    });

    return positions;
  }, [containerSize.width]);

  // キー位置の計算
  const keyPositions = useMemo(() => {
    return calculateKeyPositions();
  }, [calculateKeyPositions]);

  // ドットパターンを描画する関数
  const drawDotPattern = useCallback((ctx) => {
    // タイムスタンプを更新
    gridTimeRef.current += 0.01;
    const time = gridTimeRef.current;

    // ドットサイズとスペーシング
    const dotSize = 1;
    const spacing = 8;

    ctx.fillStyle = 'rgba(255, 136, 0, 0.15)';

    // キャンバス全体にドットパターンを描画
    for (let x = 0; x < ctx.canvas.width; x += spacing) {
      for (let y = 0; y < ctx.canvas.height; y += spacing) {
        // フェーズシフト（時間とともに変化させる）
        const phase = Math.sin(x * 0.05 + y * 0.03 + time * 2) * 0.5 + 0.5;

        // 強度を計算（0-1の範囲）
        const intensity = phase * 0.7 + 0.3;

        // 一部のドットをランダムに点滅させる
        if (Math.random() > 0.95) {
          ctx.fillStyle = 'rgba(255, 136, 0, 0.25)';
        } else {
          ctx.fillStyle = `rgba(255, 136, 0, ${intensity * 0.15})`;
        }

        ctx.fillRect(x, y, dotSize, dotSize);
      }
    }

    // サイバーグリッドラインを描画
    ctx.strokeStyle = 'rgba(0, 180, 255, 0.08)';
    ctx.lineWidth = 0.5;

    // 横線（走査線エフェクト）
    const scanLineY = ctx.canvas.height * (time % 1);
    ctx.beginPath();
    ctx.moveTo(0, scanLineY);
    ctx.lineTo(ctx.canvas.width, scanLineY);
    ctx.stroke();

    // 動く縦線
    const vertLineX = ctx.canvas.width * ((time * 0.5) % 1);
    ctx.strokeStyle = 'rgba(255, 136, 0, 0.1)';
    ctx.beginPath();
    ctx.moveTo(vertLineX, 0);
    ctx.lineTo(vertLineX, ctx.canvas.height);
    ctx.stroke();
  }, []);

  // キーボードの描画関数
  const drawKeyboard = useCallback(() => {
    if (!ctx || !containerRef.current) return;

    // キャンバスをクリア（透明背景）
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // ドットパターンを描画
    drawDotPattern(ctx);

    // キーボードの外枠 - 二重線でサイバー感を強化
    ctx.strokeStyle = PRIMARY_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 10, ctx.canvas.width - 20, ctx.canvas.height - 20, 10);
    ctx.stroke();

    // 内側の枠線
    ctx.strokeStyle = SECONDARY_COLOR;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(15, 15, ctx.canvas.width - 30, ctx.canvas.height - 30, 8);
    ctx.stroke();

    // サイドインジケーター
    const indicatorWidth = 4;
    const indicatorHeight = 15; // 短くして密度アップ
    const indicatorGap = 15; // 間隔を狭くして密度アップ
    const indicatorCount = Math.floor((ctx.canvas.height - 40) / indicatorGap);

    for (let i = 0; i < indicatorCount; i++) {
      const y = 20 + i * indicatorGap;
      const intensity = Math.sin(Date.now() / 1000 + i * 0.3) * 0.5 + 0.5; // 時間とともに強度変化

      // 左側
      ctx.fillStyle =
        i % 2 === 0
          ? `rgba(255, 136, 0, ${intensity * 0.8 + 0.2})`
          : `rgba(0, 170, 255, ${intensity * 0.8 + 0.2})`;
      ctx.fillRect(5, y, indicatorWidth, indicatorHeight);

      // 右側
      ctx.fillRect(
        ctx.canvas.width - 5 - indicatorWidth,
        y,
        indicatorWidth,
        indicatorHeight
      );
    }

    // 各キーを描画
    Object.entries(keyPositions).forEach(([key, position]) => {
      const isNextKey = key.toLowerCase() === nextKey.toLowerCase();
      const isPressed = key.toLowerCase() === lastPressedKey.toLowerCase();
      const keyState = keyStates[key] || { glow: 0, press: 0 };

      // グロー効果のオフセット計算
      const glowOffset = keyState.glow * GLOW_SIZE;

      // キー押下エフェクトの計算 (最大4px、最小0pxに制限)
      const pressOffset = Math.min(4, Math.max(0, keyState.press * 4));

      // キーの影 - ピクセルアートスタイルに
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        position.x + 2,
        position.y + 4 + pressOffset,
        position.width - 2,
        position.height - pressOffset - 2
      );
      ctx.restore();

      // キーの本体 - レトロなドット感のあるグラデーション
      const keyGradient = ctx.createLinearGradient(
        position.x,
        position.y + pressOffset,
        position.x,
        position.y + position.height
      );
      keyGradient.addColorStop(0, '#333333');
      keyGradient.addColorStop(0.9, '#272727');
      keyGradient.addColorStop(1, '#222222');

      // キーのベース描画
      ctx.fillStyle = keyGradient;
      ctx.beginPath();
      ctx.roundRect(
        position.x,
        position.y + pressOffset,
        position.width,
        position.height - pressOffset,
        KEY_RADIUS
      );
      ctx.fill();

      // ドット模様のオーバーレイ - キー上部に薄いドットパターン
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let dx = 3; dx < position.width - 3; dx += 3) {
        for (let dy = 3; dy < (position.height - pressOffset) / 3; dy += 3) {
          if ((dx + dy) % 6 === 0) {
            ctx.fillRect(position.x + dx, position.y + pressOffset + dy, 1, 1);
          }
        }
      }
      ctx.restore();

      // キートップのハイライト - かすかな光沢
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      ctx.roundRect(
        position.x + 2,
        position.y + pressOffset + 2,
        position.width - 4,
        (position.height - pressOffset) * 0.25,
        KEY_RADIUS - 2
      );
      ctx.fill();

      // 次に入力すべきキーのエフェクト
      if (isNextKey) {
        // グロー効果
        ctx.save();
        ctx.shadowColor = PRIMARY_COLOR;
        ctx.shadowBlur = 15;
        ctx.fillStyle = HIGHLIGHT_COLOR;

        // キーの縁を光らせる
        const adjustedGlowOffset = glowOffset * 0.6;
        ctx.beginPath();
        ctx.roundRect(
          position.x - adjustedGlowOffset,
          position.y - adjustedGlowOffset + pressOffset,
          position.width + adjustedGlowOffset * 2,
          position.height + adjustedGlowOffset * 2 - pressOffset,
          KEY_RADIUS + adjustedGlowOffset
        );
        ctx.fill();
        ctx.restore();

        // パルスエフェクト
        const pulseSize = Math.sin(Date.now() / 500) * 1.5 + 2;
        ctx.strokeStyle = 'rgba(255, 136, 0, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(
          position.x - pulseSize,
          position.y - pulseSize + pressOffset,
          position.width + pulseSize * 2,
          position.height + pulseSize * 2 - pressOffset,
          KEY_RADIUS + pulseSize
        );
        ctx.stroke();

        // キートップにオレンジグラデーション
        const gradient = ctx.createLinearGradient(
          position.x,
          position.y,
          position.x,
          position.y + position.height
        );
        gradient.addColorStop(0, 'rgba(255, 136, 0, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 80, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
          position.x,
          position.y + pressOffset,
          position.width,
          position.height - pressOffset,
          KEY_RADIUS
        );
        ctx.fill();
      }
      // 押されたキーのエフェクト
      else if (isPressed && pressOffset > 0) {
        // 押下時のグラデーション
        const pressGradient = ctx.createLinearGradient(
          position.x,
          position.y + pressOffset,
          position.x,
          position.y + position.height
        );
        pressGradient.addColorStop(0, 'rgba(70, 75, 90, 0.6)');
        pressGradient.addColorStop(1, 'rgba(50, 55, 65, 0.4)');

        ctx.fillStyle = pressGradient;
        ctx.beginPath();
        ctx.roundRect(
          position.x,
          position.y + pressOffset,
          position.width,
          position.height - pressOffset,
          KEY_RADIUS
        );
        ctx.fill();

        // 押されたキーのエッジハイライト
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(
          position.x + 1,
          position.y + pressOffset + 1,
          position.width - 2,
          position.height - pressOffset - 2,
          KEY_RADIUS - 1
        );
        ctx.stroke();
      }

      // キーの文字 - レトロなドット風に
      ctx.save();
      if (isNextKey) {
        ctx.shadowColor = PRIMARY_COLOR;
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFCC00';
      } else {
        ctx.fillStyle = KEY_TEXT_COLOR;
      }

      // ドット風フォント
      ctx.font = 'bold 16px "SF Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 押下時のテキスト位置調整
      const textY = position.y + position.height / 2 + pressOffset;

      // テキスト表示
      const displayKey = key === ' ' ? 'SPACE' : key.toUpperCase();

      // スペースキーの特別扱い
      if (key === ' ') {
        // スペースキーの下に光るライン
        if (isNextKey) {
          const lineY = position.y + position.height * 0.75 + pressOffset;
          const lineGradient = ctx.createLinearGradient(
            position.x + 20,
            lineY,
            position.x + position.width - 40,
            lineY
          );
          lineGradient.addColorStop(0, 'rgba(255, 136, 0, 0.3)');
          lineGradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.7)');
          lineGradient.addColorStop(1, 'rgba(255, 136, 0, 0.3)');

          ctx.fillStyle = lineGradient;
          ctx.fillRect(position.x + 30, lineY, position.width - 60, 1.5);
        }

        // SPACEテキスト
        ctx.fillText('SPACE', position.x + position.width / 2, textY);

        // スペースキーのドットのライン
        if (isNextKey) {
          for (let i = 0; i < 7; i++) {
            const dotX = position.x + position.width / 2 - 18 + i * 6;
            ctx.fillRect(
              dotX,
              position.y + position.height - 6 + pressOffset,
              2,
              2
            );
          }
        }
      } else {
        // 通常キーのテキスト
        ctx.fillText(displayKey, position.x + position.width / 2, textY);

        // 次のキーのみ追加の効果を表示
        if (isNextKey) {
          const dotY = position.y + position.height - 8 + pressOffset;
          ctx.fillRect(position.x + position.width / 2 - 6, dotY, 2, 2);
          ctx.fillRect(position.x + position.width / 2, dotY, 2, 2);
          ctx.fillRect(position.x + position.width / 2 + 6, dotY, 2, 2);
        }
      }
      ctx.restore();

      // 下部の光るライン（次のキーの場合のみ）
      if (isNextKey) {
        ctx.save();
        const lineGradient = ctx.createLinearGradient(
          position.x,
          position.y + position.height - 1 + pressOffset,
          position.x + position.width,
          position.y + position.height - 1 + pressOffset
        );
        lineGradient.addColorStop(0, 'rgba(255, 136, 0, 0.3)');
        lineGradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.8)');
        lineGradient.addColorStop(1, 'rgba(255, 136, 0, 0.3)');
        ctx.fillStyle = lineGradient;
        ctx.fillRect(
          position.x + 2,
          position.y + position.height - 1.5 + pressOffset,
          position.width - 4,
          1.5
        );
        ctx.restore();
      }

      // キー押下時の3D効果
      if (pressOffset > 0) {
        const limitedPressOffset = Math.min(4, pressOffset);

        // 側面の影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(position.x, position.y + position.height);
        ctx.lineTo(position.x + position.width, position.y + position.height);
        ctx.lineTo(
          position.x + position.width,
          position.y + position.height - limitedPressOffset
        );
        ctx.lineTo(
          position.x,
          position.y + position.height - limitedPressOffset
        );
        ctx.fill();

        // 右側面の影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(
          position.x + position.width,
          position.y + limitedPressOffset
        );
        ctx.lineTo(position.x + position.width, position.y + position.height);
        ctx.lineTo(
          position.x + position.width - 3,
          position.y + position.height - 3
        );
        ctx.lineTo(
          position.x + position.width - 3,
          position.y + limitedPressOffset + 3
        );
        ctx.fill();

        // 押下時の衝撃波エフェクト
        if (keyState.press > 0.7) {
          const shockwaveProgress = Math.max(
            0.1,
            (1 - (keyState.press - 0.7) / 0.3) * 12
          );

          // 二重の衝撃波
          ctx.save();

          // 外側の波
          ctx.strokeStyle = `rgba(255, 255, 255, ${
            (1 - keyState.press) * 0.4
          })`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(
            position.x + position.width / 2,
            position.y + position.height / 2 + pressOffset,
            shockwaveProgress,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          // 内側の波
          ctx.strokeStyle = `rgba(255, 160, 70, ${(1 - keyState.press) * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(
            position.x + position.width / 2,
            position.y + position.height / 2 + pressOffset,
            shockwaveProgress * 0.7,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          ctx.restore();
        }
      }
    });

    // 相互接続線 - より繊細に
    ctx.strokeStyle = 'rgba(0, 180, 255, 0.08)';
    ctx.lineWidth = 0.8;

    // 接続パターンを増やし、SF感を強化
    const connectionPairs = [
      ['q', 'w'],
      ['w', 'e'],
      ['e', 'r'],
      ['r', 't'],
      ['a', 's'],
      ['s', 'd'],
      ['d', 'f'],
      ['f', 'g'],
      ['z', 'x'],
      ['x', 'c'],
      ['c', 'v'],
      ['v', 'b'],
      ['t', 'y'],
      ['y', 'u'],
      ['u', 'i'],
      ['i', 'o'],
      ['g', 'h'],
      ['h', 'j'],
      ['j', 'k'],
      ['k', 'l'],
      ['b', 'n'],
      ['n', 'm'],
      ['o', 'p'],
      ['p', '@'],
    ];

    // 接続線を描画
    connectionPairs.forEach(([key1, key2]) => {
      const pos1 = keyPositions[key1];
      const pos2 = keyPositions[key2];

      if (pos1 && pos2) {
        ctx.beginPath();
        ctx.moveTo(pos1.x + pos1.width / 2, pos1.y + pos1.height / 2);
        ctx.lineTo(pos2.x + pos2.width / 2, pos2.y + pos2.height / 2);
        ctx.stroke();
      }
    });

    // キー押下時のドットパーティクルエフェクト
    if (particles.length > 0) {
      // 各パーティクルを描画
      particles.forEach((particle) => {
        ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.alpha})`;
        ctx.strokeStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.alpha})`;

        // パーティクルタイプによって描画方法を変える
        if (particle.type === 'dot') {
          // ドットパーティクル - 精密なドット表現
          ctx.fillRect(
            Math.round(particle.x),
            Math.round(particle.y),
            particle.size <= 2 ? 1 : 2,
            particle.size <= 2 ? 1 : 2
          );
        } else if (particle.type === 'square') {
          // ピクセル正方形 - ドット感を強調
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.life * Math.PI);
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size
          );
          ctx.restore();
        } else if (particle.type === 'line') {
          // 線パーティクル - 移動方向に沿った線
          ctx.save();
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(
            particle.x - Math.cos(particle.angle) * particle.size,
            particle.y - Math.sin(particle.angle) * particle.size
          );
          ctx.stroke();
          ctx.restore();
        } else {
          // 円形パーティクル - サイズを小さくしピクセル感を強調
          const size = Math.max(1, particle.size);
          if (size <= 2) {
            // 小さいサイズはピクセル表現
            ctx.fillRect(
              Math.round(particle.x),
              Math.round(particle.y),
              size,
              size
            );
          } else {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }
  }, [
    ctx,
    keyPositions,
    nextKey,
    lastPressedKey,
    keyStates,
    animatingKey,
    particles,
    drawDotPattern,
  ]);

  // キー押下時の効果音再生（既存サウンドシステム連携用）
  const playKeySound = useCallback((key) => {
    // タイピングに影響を与えないよう遅延を最小化
    queueMicrotask(() => {
      try {
        // 効果音はここでは再生せず、既存のサウンドシステムに任せる
        // 空の関数として維持して互換性を保つ
      } catch (e) {
        // エラーを無視して処理を継続
      }
    });
  }, []);

  // キーアニメーションの更新
  const updateKeyAnimation = useCallback(() => {
    if (!ctx) return;

    setKeyStates((prevStates) => {
      const newStates = { ...prevStates };
      let hasActiveAnimations = false;
      const activeKeys = new Set(); // 現在アクティブなキーを追跡

      // 現在のアクティブキーを追加
      if (nextKey) activeKeys.add(nextKey.toLowerCase());
      if (lastPressedKey) activeKeys.add(lastPressedKey.toLowerCase());

      // 各キーのアニメーション状態を更新
      Object.keys(newStates).forEach((key) => {
        const state = newStates[key];
        const keyLower = key.toLowerCase();

        // グロー効果のアニメーション
        if (state.glow !== undefined) {
          if (keyLower === nextKey.toLowerCase()) {
            // 次のキーの場合、グロー効果を増加
            newStates[key] = {
              ...state,
              glow: Math.min(1, state.glow + 0.05),
            };
            hasActiveAnimations = true;
          } else if (state.glow > 0) {
            // そうでない場合、徐々に減少
            newStates[key] = {
              ...state,
              glow: Math.max(0, state.glow - 0.1),
            };
            hasActiveAnimations = true;
          }
        }

        // 押下効果のアニメーション
        if (state.press !== undefined) {
          if (keyLower === lastPressedKey.toLowerCase() && state.press < 1) {
            // 押下中はすぐに最大値まで
            newStates[key] = {
              ...state,
              press: Math.min(1, state.press + 0.3),
            };
            hasActiveAnimations = true;
          } else if (state.press > 0) {
            // 押下が終わったら徐々に戻る
            // より早く戻るように値を調整
            newStates[key] = {
              ...state,
              press: Math.max(0, state.press - 0.15),
            };
            hasActiveAnimations = true;
          } else if (state.press === 0 && !activeKeys.has(keyLower)) {
            // 押下状態が完全に戻り、もうアクティブでなければ状態を消去
            delete newStates[key];
          }
        }

        // キーの状態が不要になったら削除（メモリリーク防止）
        const currentState = newStates[key];
        if (
          currentState &&
          !activeKeys.has(keyLower) &&
          (currentState.glow === 0 || currentState.glow === undefined) &&
          (currentState.press === 0 || currentState.press === undefined)
        ) {
          delete newStates[key];
        }
      });

      // 次のキーの状態を初期化（まだ存在しない場合）
      if (nextKey && !newStates[nextKey]) {
        newStates[nextKey] = { glow: 0, press: 0 };
        hasActiveAnimations = true;
      }

      // 最後に押されたキーの状態を初期化（まだ存在しない場合）
      if (lastPressedKey && !newStates[lastPressedKey]) {
        newStates[lastPressedKey] = { glow: 0, press: 1 };
        hasActiveAnimations = true;
      }

      return newStates;
    });

    // キー押下時のドットパーティクルエフェクト
    if (lastPressedKey && lastPressedKey !== animatingKey) {
      setAnimatingKey(lastPressedKey);

      // キー位置を取得
      const keyPos = keyPositions[lastPressedKey];
      if (keyPos) {
        // キーの中心を計算
        const centerX = keyPos.x + keyPos.width / 2;
        const centerY = keyPos.y + keyPos.height / 2;

        // パーティクル生成（より多くのドット）
        const newParticles = [];
        const particleCount = 40 + Math.floor(Math.random() * 20);

        for (let i = 0; i < particleCount; i++) {
          // ランダム角度と速度
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 6;

          // オレンジ系の色（メインカラー）
          const colorVariant = Math.random();
          const colorSet =
            colorVariant > 0.7
              ? {
                  // メインオレンジ (70%)
                  r: 240 + Math.floor(Math.random() * 15), // 240-255
                  g: 120 + Math.floor(Math.random() * 40), // 120-160
                  b: Math.floor(Math.random() * 40), // 0-40
                }
              : colorVariant > 0.2
              ? {
                  // 明るいオレンジ (50%)
                  r: 255,
                  g: 150 + Math.floor(Math.random() * 50), // 150-200
                  b: 30 + Math.floor(Math.random() * 50), // 30-80
                }
              : {
                  // アクセント色：サイバーブルー (20%)
                  r: 0,
                  g: 150 + Math.floor(Math.random() * 70), // 150-220
                  b: 220 + Math.floor(Math.random() * 35), // 220-255
                };

          // パーティクルタイプ - ドット表現を重視
          const typeRandom = Math.random();
          const type =
            typeRandom > 0.6
              ? 'dot'
              : typeRandom > 0.3
              ? 'square'
              : typeRandom > 0.1
              ? 'circle'
              : 'line';

          // サイズ - 小さめに設定してドット感を出す
          const size =
            type === 'line'
              ? 2 + Math.random() * 4 // 線は中程度
              : type === 'dot'
              ? 1 // ドットは最小サイズ
              : 1 + Math.random() * 2; // その他は小さめ

          // パーティクルの初期位置にばらつきを持たせる
          const offsetX = (Math.random() - 0.5) * 10;
          const offsetY = (Math.random() - 0.5) * 10;

          // パーティクル追加
          newParticles.push({
            x: centerX + offsetX,
            y: centerY + offsetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1, // 少し上向き（重力でバランス）
            size: size,
            alpha: 0.8 + Math.random() * 0.2,
            color: colorSet,
            life: 1.0,
            decay: 0.01 + Math.random() * 0.02,
            type: type,
            angle: angle,
          });
        }

        setParticles((prev) => [...prev, ...newParticles]);
      }
    }

    // キーボードを描画
    drawKeyboard();

    // パーティクルの更新
    setParticles((prevParticles) => {
      if (prevParticles.length === 0) return prevParticles;

      return prevParticles
        .map((particle) => {
          // 各パーティクルタイプ別の動き
          switch (particle.type) {
            case 'dot':
              // ドットはほぼ直線、わずかな重力
              return {
                ...particle,
                x: particle.x + particle.vx,
                y: particle.y + particle.vy,
                vy: particle.vy + 0.03, // わずかな重力
                alpha: particle.alpha * 0.96,
                life: particle.life - particle.decay,
              };

            case 'line':
              // 線は速く移動、短命
              return {
                ...particle,
                x: particle.x + particle.vx * 1.3,
                y: particle.y + particle.vy * 1.3,
                vy: particle.vy + 0.02,
                size: particle.size * 0.95,
                alpha: particle.alpha * 0.93,
                life: particle.life - particle.decay * 1.2,
              };

            case 'square':
              // 正方形は回転しながら縮小
              return {
                ...particle,
                x: particle.x + particle.vx * 0.9,
                y: particle.y + particle.vy * 0.9,
                vx: particle.vx * 0.98,
                vy: particle.vy * 0.98 + 0.05,
                size: particle.size * (1 - particle.decay * 1.5),
                alpha: particle.alpha * 0.95,
                life: particle.life - particle.decay,
              };

            default: // circle
              // 円はわずかに膨張してから縮小
              return {
                ...particle,
                x: particle.x + particle.vx,
                y: particle.y + particle.vy,
                vx: particle.vx * 0.98,
                vy: particle.vy * 0.98 + 0.05,
                size: particle.size * (particle.life > 0.7 ? 1.01 : 0.98),
                alpha: particle.alpha * 0.96,
                life: particle.life - particle.decay,
              };
          }
        })
        .filter(
          (particle) =>
            particle.life > 0 &&
            particle.x > -20 &&
            particle.x < ctx.canvas.width + 20 &&
            particle.y > -20 &&
            particle.y < ctx.canvas.height + 20
        );
    });

    // メモリリークを防止するため、古いキー状態を定期的にクリーンアップ
    const now = Date.now();
    if (now % 5000 < 16) {
      // 約5秒ごとに実行
      setKeyStates((prevStates) => {
        const cleanedStates = { ...prevStates };

        Object.keys(cleanedStates).forEach((key) => {
          const keyLower = key.toLowerCase();
          if (
            keyLower !== nextKey.toLowerCase() &&
            keyLower !== lastPressedKey.toLowerCase()
          ) {
            const state = cleanedStates[key];
            if (
              (state.press === 0 || state.press === undefined) &&
              (state.glow === 0 || state.glow === undefined)
            ) {
              delete cleanedStates[key];
            }
          }
        });

        return cleanedStates;
      });
    }

    // アニメーションループ継続
    animationFrameRef.current = requestAnimationFrame(updateKeyAnimation);
  }, [ctx, drawKeyboard, nextKey, lastPressedKey, animatingKey, keyPositions]);

  // キャンバスの初期化
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      setCtx(context);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // コンテナサイズの測定
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: rect.width,
        height: rect.height,
      });
    };

    // 初期サイズを設定
    updateSize();

    // リサイズイベントリスナー
    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // キャンバスサイズの設定
  useEffect(() => {
    if (!ctx || !canvasRef.current) return;

    // DPIを考慮したキャンバスサイズ設定
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = containerSize.width * dpr;
    canvasRef.current.height = containerSize.height * dpr;

    // スケーリング
    ctx.scale(dpr, dpr);

    // スタイルでの表示サイズ設定
    canvasRef.current.style.width = `${containerSize.width}px`;
    canvasRef.current.style.height = `${containerSize.height}px`;
  }, [ctx, containerSize]);

  // アニメーションの開始
  useEffect(() => {
    if (!ctx) return;

    // アニメーションフレーム開始
    animationFrameRef.current = requestAnimationFrame(updateKeyAnimation);

    // クリーンアップ
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [ctx, updateKeyAnimation]);

  return (
    <div
      ref={containerRef}
      className={styles.keyboard_container}
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: 'transparent',
      }}
    >
      <canvas
        ref={canvasRef}
        className={styles.keyboard_canvas}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default RetroSFKeyboard;
