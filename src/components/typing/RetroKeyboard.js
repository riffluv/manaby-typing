'use client';

/**
 * RetroKeyboard.js
 * レトロなSF風キーボードUIコンポーネント
 * Canvas APIを使用してキーボードをレンダリング
 * メインスレッドで動作し、タイピング応答に影響しないよう最適化
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import styles from '../../styles/typing/RetroKeyboard.module.css';

// キーボードのキー配置（日本語キーボード）
const KEYBOARD_LAYOUT = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '\\'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '['],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', ':', ']'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', '\\'],
  [' '] // スペースキー
];

// パフォーマンスを考慮した定数
const KEY_SIZE = 40; // キーの基本サイズ
const KEY_MARGIN = 5; // キー間のマージン
const KEY_RADIUS = 6; // キーの角丸半径
const SPACE_WIDTH = 250; // スペースキーの幅
const KEY_HEIGHT = 40; // キーの高さ
const GLOW_SIZE = 15; // 光のサイズ
const PRIMARY_COLOR = '#FF8800'; // プライマリカラー（オレンジ）
const SECONDARY_COLOR = '#00AAFF'; // セカンダリカラー（青）
const KEY_COLOR = '#333'; // 通常キーの色
const KEY_TEXT_COLOR = '#DDD'; // キーテキストの色
const HIGHLIGHT_COLOR = 'rgba(255, 136, 0, 0.8)'; // ハイライト色（オレンジ）
const PRESSED_HIGHLIGHT_COLOR = 'rgba(255, 136, 0, 1)'; // 押されたキーのハイライト色
const EXPECTED_KEY_COLOR = '#FF8800'; // 次に入力すべきキーの色

/**
 * レトロなSF風キーボードコンポーネント
 * @param {Object} props コンポーネントプロパティ
 * @param {string} props.nextKey 次に入力すべきキー
 * @param {string} props.lastPressedKey 最後に押されたキー
 * @param {number} props.width キャンバスの幅
 * @param {number} props.height キャンバスの高さ
 * @returns {React.Component} キーボードコンポーネント
 */
const RetroKeyboard = ({
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
    const totalHeight = KEYBOARD_LAYOUT.length * (KEY_HEIGHT + KEY_MARGIN) - KEY_MARGIN;

    return { width: totalWidth, height: totalHeight };
  }, []);

  // キーの実際の位置を計算する
  const calculateKeyPositions = useCallback(() => {
    const positions = {};
    let yOffset = 0;

    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
      let xOffset = 0;

      // 行のセンタリング調整
      const rowWidth = row.length === 1
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
          column: keyIndex
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
  // キーボードの描画関数
  const drawKeyboard = useCallback(() => {
    if (!ctx || !containerRef.current) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 背景の描画（薄暗いブルー）
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0, 'rgba(0, 20, 40, 0.8)');
    gradient.addColorStop(0.5, 'rgba(0, 30, 60, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 20, 40, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // グリッド線の描画 - さらにレトロ感を出す
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
    ctx.lineWidth = 0.5;

    // 横線 - 間隔を小さくしてCRT感を強化
    for (let y = 0; y < ctx.canvas.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }

    // 縦線 - ドット調に
    for (let x = 0; x < ctx.canvas.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }

    // キーボードの外枠 - 二重線でサイバー感を強化
    ctx.strokeStyle = PRIMARY_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(10, 10, ctx.canvas.width - 20, ctx.canvas.height - 20, 10);
    ctx.stroke();

    // 内側の枠線
    ctx.strokeStyle = SECONDARY_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(15, 15, ctx.canvas.width - 30, ctx.canvas.height - 30, 8);
    ctx.stroke();

    // サイドインジケーター
    const indicatorWidth = 5;
    const indicatorHeight = 30;
    const indicatorGap = 20;
    const indicatorCount = Math.floor((ctx.canvas.height - 40) / indicatorGap);

    for (let i = 0; i < indicatorCount; i++) {
      const y = 20 + i * indicatorGap;

      // 左側
      ctx.fillStyle = i % 2 === 0 ? PRIMARY_COLOR : SECONDARY_COLOR;
      ctx.fillRect(5, y, indicatorWidth, indicatorHeight);

      // 右側
      ctx.fillRect(ctx.canvas.width - 5 - indicatorWidth, y, indicatorWidth, indicatorHeight);
    }

    // 各キーを描画
    Object.entries(keyPositions).forEach(([key, position]) => {
      const isNextKey = key.toLowerCase() === nextKey.toLowerCase();
      const isPressed = key.toLowerCase() === lastPressedKey.toLowerCase();
      const keyState = keyStates[key] || { glow: 0, press: 0 };      // グロー効果のオフセット計算
      const glowOffset = keyState.glow * GLOW_SIZE;
      
      // キー押下エフェクトの計算 (最大4px、最小0pxに制限)
      const pressOffset = Math.min(4, Math.max(0, keyState.press * 4));      // キーの背景 - 複数の層を重ねて立体感を強調
      // キーの影 - より自然なシャドウ効果
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(
        position.x + 1.5,
        position.y + 3 + pressOffset,
        position.width - 1,
        position.height - pressOffset - 1,
        KEY_RADIUS
      );
      ctx.fill();
      ctx.restore();

      // キーの本体 - 微妙なグラデーションで立体感アップ
      const keyGradient = ctx.createLinearGradient(
        position.x, position.y + pressOffset,
        position.x, position.y + position.height
      );
      keyGradient.addColorStop(0, '#3a3a3a');
      keyGradient.addColorStop(0.9, '#2d2d2d');
      keyGradient.addColorStop(1, '#252525');
      
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
      
      // キートップのハイライト - かすかな光沢
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      ctx.roundRect(
        position.x + 2,
        position.y + pressOffset + 2,
        position.width - 4,
        (position.height - pressOffset) * 0.3,
        KEY_RADIUS - 2
      );
      ctx.fill();// キーのハイライト（次に入力すべきキーの場合のみ）
      if (isNextKey) {        // グロー効果 - より自然なサイズに調整
        ctx.save();
        ctx.shadowColor = PRIMARY_COLOR;
        ctx.shadowBlur = 15; // 少しぼかしを減らす
        ctx.fillStyle = HIGHLIGHT_COLOR;

        // キーの縁を光らせる（より自然なサイズに調整）
        const adjustedGlowOffset = glowOffset * 0.6; // グローのサイズを60%に縮小
        ctx.beginPath();
        ctx.roundRect(
          position.x - adjustedGlowOffset,
          position.y - adjustedGlowOffset + pressOffset,
          position.width + adjustedGlowOffset * 2,
          position.height + adjustedGlowOffset * 2 - pressOffset,
          KEY_RADIUS + adjustedGlowOffset
        );
        ctx.fill();
        ctx.restore();        // キーの周囲にパルス効果を追加（より自然なサイズに調整）
        const pulseSize = Math.sin(Date.now() / 500) * 1.5 + 2.5; // パルスサイズを縮小
        ctx.strokeStyle = 'rgba(255, 136, 0, 0.5)';
        ctx.lineWidth = 1.5; // 少し細く
        ctx.beginPath();
        ctx.roundRect(
          position.x - pulseSize,
          position.y - pulseSize + pressOffset,
          position.width + pulseSize * 2,
          position.height + pulseSize * 2 - pressOffset,
          KEY_RADIUS + pulseSize
        );
        ctx.stroke();        // キートップのハイライト - グラデーションで強化（より自然なサイズに調整）
        const gradient = ctx.createLinearGradient(
          position.x, position.y,
          position.x, position.y + position.height
        );
        gradient.addColorStop(0, 'rgba(255, 136, 0, 0.4)'); // 透明度を下げる
        gradient.addColorStop(1, 'rgba(255, 80, 0, 0.25)'); // 透明度を下げる
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
      }      // 押されたキーには押下エフェクトのみ表示（グロー効果なし）- 見た目を改善
      else if (isPressed && pressOffset > 0) {
        // キーが押された時の視覚フィードバック - よりスタイリッシュに
        const pressGradient = ctx.createLinearGradient(
          position.x, position.y + pressOffset,
          position.x, position.y + position.height
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
        
        // 押されたキーにかすかな青いハイライトを追加
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
      }// キーの文字 - レトロなドット風に

      // テキストシャドウを追加
      ctx.save();
      if (isNextKey) {
        // 次のキーのみ特別なスタイルを適用
        ctx.shadowColor = PRIMARY_COLOR;
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFCC00';
      } else {
        // 通常のキーや押されたキーには標準スタイル
        ctx.fillStyle = KEY_TEXT_COLOR;
      }

      ctx.font = 'bold 18px "SF Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 押下時のテキスト位置調整
      const textY = position.y + position.height / 2 + pressOffset;

      // テキスト表示
      const displayKey = key === ' ' ? 'SPACE' : key.toUpperCase();

      // スペースキーの特別扱い
      if (key === ' ') {        // スペースキーの下に光るラインを追加 - よりエレガントに
        if (isNextKey) {
          const lineY = position.y + position.height * 0.7 + pressOffset;
          const lineGradient = ctx.createLinearGradient(
            position.x + 20, lineY,
            position.x + position.width - 40, lineY
          );
          lineGradient.addColorStop(0, 'rgba(255, 136, 0, 0.3)');
          lineGradient.addColorStop(0.5, 'rgba(255, 136, 0, 0.7)');
          lineGradient.addColorStop(1, 'rgba(255, 136, 0, 0.3)');
          
          ctx.fillStyle = lineGradient;
          ctx.fillRect(position.x + 30, lineY, position.width - 60, 1.5);
        }
        ctx.fillText('SPACE', position.x + position.width / 2, textY);
      } else {
        ctx.fillText(displayKey, position.x + position.width / 2, textY);
        // 次のキーのみ追加の効果を表示
        if (isNextKey) {
          ctx.font = 'bold 7px "SF Mono", "Courier New", monospace';
          ctx.fillText('●●●', position.x + position.width / 2, position.y + position.height - 8 + pressOffset);
        }
      }
      ctx.restore();      // 下部の光るライン（次のキーの場合のみ）- より自然でエレガントな表示に
      if (isNextKey) {
        ctx.save();
        const lineGradient = ctx.createLinearGradient(
          position.x, position.y + position.height - 1 + pressOffset, 
          position.x + position.width, position.y + position.height - 1 + pressOffset
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
      }// キー押下時の3D効果 - より洗練された効果
      if (pressOffset > 0) {
        // 最大押下量を制限（4pxを超えないようにする）
        const limitedPressOffset = Math.min(4, pressOffset);
        
        // 側面の影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(position.x, position.y + position.height);
        ctx.lineTo(position.x + position.width, position.y + position.height);
        ctx.lineTo(position.x + position.width, position.y + position.height - limitedPressOffset);
        ctx.lineTo(position.x, position.y + position.height - limitedPressOffset);
        ctx.fill();
        
        // 右側面の影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(position.x + position.width, position.y + limitedPressOffset);
        ctx.lineTo(position.x + position.width, position.y + position.height);
        ctx.lineTo(position.x + position.width - 3, position.y + position.height - 3);
        ctx.lineTo(position.x + position.width - 3, position.y + limitedPressOffset + 3);
        ctx.fill();        // 押下時の特殊効果 - より繊細で魅力的な衝撃波
        if (keyState.press > 0.7) {
          // 負の半径を防止するため、0.1を最小値とする
          const shockwaveProgress = Math.max(0.1, (1 - (keyState.press - 0.7) / 0.3) * 12);
          
          // 二重の衝撃波エフェクト
          ctx.save();
          
          // 外側の波 - 白色
          ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - keyState.press) * 0.4})`;
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
          
          // 内側の波 - オレンジ色
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

    // 相互接続線
    ctx.strokeStyle = 'rgba(0, 180, 255, 0.15)';
    ctx.lineWidth = 1;

    // ランダムな接続線（見た目を良くするため一部のキー同士だけをつなぐ）
    const connectionPairs = [
      ['q', 'w'], ['w', 'e'], ['e', 'r'], ['a', 's'], ['s', 'd'], ['f', 'g'],
      ['z', 'x'], ['x', 'c'], ['c', 'v'], ['v', 'b'], ['g', 'h'], ['h', 'j'],
      ['j', 'k'], ['k', 'l'], ['y', 'u'], ['u', 'i'], ['i', 'o'], ['o', 'p']
    ];

    connectionPairs.forEach(([key1, key2]) => {
      const pos1 = keyPositions[key1];
      const pos2 = keyPositions[key2];

      if (pos1 && pos2) {
        ctx.beginPath();
        ctx.moveTo(pos1.x + pos1.width / 2, pos1.y + pos1.height / 2);
        ctx.lineTo(pos2.x + pos2.width / 2, pos2.y + pos2.height / 2);
        ctx.stroke();
      }
    });    // キー押下時のドットパーティクルエフェクト - より派手なバージョン
    if (particles.length > 0) {
      // 各パーティクルを描画
      particles.forEach(particle => {
        ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.alpha})`;
        ctx.strokeStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.alpha})`;
        
        // パーティクルタイプによって描画方法を変える
        if (particle.type === 'square') {
          // 正方形パーティクル - 少し回転させる
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
          ctx.lineWidth = 1 + Math.random();
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(
            particle.x - Math.cos(particle.angle) * particle.size,
            particle.y - Math.sin(particle.angle) * particle.size
          );
          ctx.stroke();
          ctx.restore();
        } else {
          // 円形パーティクル
          ctx.beginPath();
          ctx.arc(
            particle.x,
            particle.y,
            particle.size / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          
          // 輝き効果 (20%の確率)
          if (Math.random() > 0.8) {
            ctx.save();
            ctx.globalAlpha = particle.alpha * 0.5;
            ctx.beginPath();
            ctx.arc(
              particle.x,
              particle.y,
              particle.size,
              0,
              Math.PI * 2
            );
            ctx.stroke();
            ctx.restore();
          }
        }
      });
    }

  }, [ctx, keyPositions, nextKey, lastPressedKey, keyStates, animatingKey]);  // キー押下時の効果音再生（既存サウンドシステム連携用）
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
    
    setKeyStates(prevStates => {
      const newStates = { ...prevStates };
      let hasActiveAnimations = false;
      const activeKeys = new Set(); // 現在アクティブなキーを追跡
      
      // 現在のアクティブキーを追加
      if (nextKey) activeKeys.add(nextKey.toLowerCase());
      if (lastPressedKey) activeKeys.add(lastPressedKey.toLowerCase());
      
      // 各キーのアニメーション状態を更新
      Object.keys(newStates).forEach(key => {
        const state = newStates[key];
        const keyLower = key.toLowerCase();
        
        // グロー効果のアニメーション
        if (state.glow !== undefined) {
          if (keyLower === nextKey.toLowerCase()) {
            // 次のキーの場合、グロー効果を増加
            newStates[key] = {
              ...state,
              glow: Math.min(1, state.glow + 0.05)
            };
            hasActiveAnimations = true;
          } else if (state.glow > 0) {
            // そうでない場合、徐々に減少
            newStates[key] = {
              ...state,
              glow: Math.max(0, state.glow - 0.1)
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
              press: Math.min(1, state.press + 0.3)
            };
            hasActiveAnimations = true;
          } else if (state.press > 0) {
            // 押下が終わったら徐々に戻る
            // より早く戻るように値を調整
            newStates[key] = {
              ...state,
              press: Math.max(0, state.press - 0.15)
            };
            hasActiveAnimations = true;
          } else if (state.press === 0 && !activeKeys.has(keyLower)) {
            // 押下状態が完全に戻り、もうアクティブでなければ状態を消去
            delete newStates[key];
          }
        }
          // パーティクルエフェクトは別の状態で管理するため、
        // ここではリップルに関する処理を削除
          // キーの状態が不要になったら削除（メモリリーク防止）
        const currentState = newStates[key];
        if (currentState && 
            (!activeKeys.has(keyLower)) && 
            (currentState.glow === 0 || currentState.glow === undefined) && 
            (currentState.press === 0 || currentState.press === undefined)) {
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
    });    // キー押下時のドットパーティクルエフェクト
    if (lastPressedKey && lastPressedKey !== animatingKey) {
      setAnimatingKey(lastPressedKey);
      
      // キー位置を取得
      const keyPos = keyPositions[lastPressedKey];
      if (keyPos) {
        // キーの中心を計算
        const centerX = keyPos.x + keyPos.width / 2;
        const centerY = keyPos.y + keyPos.height / 2;
          // パーティクル生成（25〜35個のドット - より多く）
        const newParticles = [];
        const particleCount = 25 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < particleCount; i++) {
          // ランダム角度と速度 - 速度を上げて派手に
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 5; // 速度範囲を広げる
          
          // オレンジ系のより鮮やかな色
          const colorSet = Math.random() > 0.3 ? 
            {
              // メインカラー: オレンジ (70%)
              r: 220 + Math.floor(Math.random() * 35), // 220-255
              g: 100 + Math.floor(Math.random() * 60), // 100-160
              b: Math.floor(Math.random() * 50)        // 0-50
            } : 
            {
              // アクセントカラー: 明るい黄色 (30%)
              r: 240 + Math.floor(Math.random() * 15), // 240-255
              g: 200 + Math.floor(Math.random() * 55), // 200-255
              b: Math.floor(Math.random() * 80)        // 0-80
            };
          
          // ドットの形状（円形、正方形、線）
          const typeRandom = Math.random();
          const type = typeRandom > 0.7 ? 'square' : (typeRandom > 0.3 ? 'circle' : 'line');
          
          // 線の場合は角度に沿った長さを持たせる
          const size = type === 'line' ? 
            2 + Math.random() * 6 : // 線は長め
            1 + Math.random() * 3;  // 通常のサイズ
          
          // より多様なパーティクル効果
          newParticles.push({
            x: centerX + (Math.random() - 0.5) * 10, // 少し開始位置を散らす
            y: centerY + (Math.random() - 0.5) * 10,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: size,
            alpha: 0.8 + Math.random() * 0.2,
            color: colorSet,
            life: 1.0, // ライフタイム (0.0-1.0)
            decay: 0.008 + Math.random() * 0.02, // 少し減衰速度を下げる
            type: type,
            angle: angle // 線の場合の角度
          });
        }
        
        setParticles(prev => [...prev, ...newParticles]);
      }
    }
    
    // キーボードを描画
    drawKeyboard();    // パーティクルの更新 - よりダイナミックな動き
    setParticles(prevParticles => {
      if (prevParticles.length === 0) return prevParticles;
      
      return prevParticles
        .map(particle => {
          // 線タイプの場合は少し違う動きをする
          if (particle.type === 'line') {
            return {
              ...particle,
              // 位置を更新
              x: particle.x + particle.vx * 1.2, // 線は少し速く移動
              y: particle.y + particle.vy * 1.2,
              // 重力効果は弱め
              vy: particle.vy + 0.03,
              // サイズ変化 (徐々に小さく)
              size: particle.size * 0.97,
              // 透明度を減少
              alpha: particle.alpha * 0.94,
              // ライフタイムを減少
              life: particle.life - particle.decay
            };
          }
          
          // 円と正方形のパーティクル
          return {
            ...particle,
            // 位置を更新
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            // 速度に減衰を加える (少し減速)
            vx: particle.vx * 0.98,
            vy: particle.vy * 0.98 + 0.07, // 重力効果
            // サイズ変化 (ランダム要素を加える)
            size: particle.type === 'square' ? 
              particle.size * (1 - particle.decay * 2) : // 正方形は縮小
              particle.size * (particle.life > 0.5 ? 1.01 : 0.98), // 円は最初膨張して後で縮小
            // 透明度を減少
            alpha: particle.alpha * 0.95,
            // ライフタイムを減少
            life: particle.life - particle.decay
          };
        })
        // ライフタイムが尽きたか、画面外に出たパーティクルを削除
        .filter(particle => 
          particle.life > 0 &&
          particle.x > -50 && particle.x < ctx.canvas.width + 50 &&
          particle.y > -50 && particle.y < ctx.canvas.height + 50
        );
    });
    
    // 定期的に古いキー状態をクリーンアップ（メモリリーク防止）
    const now = Date.now();
    if (now % 5000 < 16) { // 約5秒ごとに実行（フレームレートを考慮）
      setKeyStates(prevStates => {
        const cleanedStates = { ...prevStates };
        
        // アクティブなキー以外の状態をクリア
        Object.keys(cleanedStates).forEach(key => {
          const keyLower = key.toLowerCase();
          if (keyLower !== nextKey.toLowerCase() && keyLower !== lastPressedKey.toLowerCase()) {
            const state = cleanedStates[key];
            if ((state.press === 0 || state.press === undefined) && 
                (state.glow === 0 || state.glow === undefined)) {
              delete cleanedStates[key];
            }
          }
        });
        
        return cleanedStates;
      });
    }
    
    // アニメーションループを継続
    animationFrameRef.current = requestAnimationFrame(updateKeyAnimation);
  }, [ctx, drawKeyboard, nextKey, lastPressedKey, animatingKey]);

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
  }, []);  // コンテナサイズの測定
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      // containerRef.currentが存在することを確認
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: rect.width,
        height: rect.height
      });
    };
    
    // 初期サイズ更新（少し遅延させて、DOM要素が確実に利用可能になるのを待つ）
    const initTimer = setTimeout(updateSize, 10);
    
    // リサイズイベント監視
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      clearTimeout(initTimer);
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  // キャンバスサイズの更新
  useEffect(() => {
    if (!canvasRef.current || !ctx) return;

    // キャンバスのリサイズ
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = containerSize.width * dpr;
    canvasRef.current.height = containerSize.height * dpr;

    // HiDPIディスプレイ対応
    ctx.scale(dpr, dpr);

    // スタイルでの表示サイズ設定
    canvasRef.current.style.width = `${containerSize.width}px`;
    canvasRef.current.style.height = `${containerSize.height}px`;

  }, [ctx, containerSize]);  // キーが押されたときの効果音
  useEffect(() => {
    // 効果音関連の処理は既存システムに任せるため、ここでは何もしない
  }, [lastPressedKey]);

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
      style={{ width: '100%', height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        className={styles.keyboard_canvas}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default RetroKeyboard;
