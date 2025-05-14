'use client';

import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styles from '../../styles/backgrounds/StarfieldBackground.module.css';

/**
 * 3Dスターフィールド背景コンポーネント
 * Canvas APIを使用した3D星空のアニメーション
 *
 * @param {Object} props コンポーネントのプロップス
 * @param {string} props.className 追加のCSSクラス
 * @param {React.Ref} ref 親から渡される参照
 */
const StarfieldBackground = forwardRef(({ className = '' }, ref) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const starsRef = useRef([]);
  const [isClient, setIsClient] = useState(false);
  // 初期状態に画面サイズの初期値を設定（サーバーサイドでは0x0、クライアントサイドで更新）
  const [dimensions, setDimensions] = useState(() => {
    // クライアントサイドなら現在の画面サイズ、そうでなければ0x0を返す
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth || 1024,
        height: window.innerHeight || 768,
      };
    }
    return { width: 0, height: 0 };
  });
  // 内部状態・メソッドを親コンポーネントに公開
  useImperativeHandle(ref, () => ({
    // AdminControllerのbackgroundRefと互換性を持たせるメソッド
    captureBackground: async () => {
      if (!canvasRef.current) return null;

      console.log('[StarfieldBackground] キャンバスのキャプチャを開始');

      // Canvasの内容を画像として返す
      return new Promise((resolve) => {
        const canvas = canvasRef.current;
        const image = canvas.toDataURL('image/png');
        console.log('[StarfieldBackground] キャンバスのキャプチャが完了');
        resolve(image);
      });
    },

    // 背景の色調を変更するメソッド
    changeColorScheme: (scheme) => {
      console.log(`[StarfieldBackground] 色調を変更: ${scheme}`);

      if (scheme === 'blue') {
        starsRef.current.forEach((star) => {
          const brightness = star.z * 0.8 + 0.2;
          star.color = `rgba(100, 180, 255, ${brightness})`;
        });
      } else if (scheme === 'red') {
        starsRef.current.forEach((star) => {
          const brightness = star.z * 0.8 + 0.2;
          star.color = `rgba(255, 130, 100, ${brightness})`;
        });
      } else if (scheme === 'purple') {
        starsRef.current.forEach((star) => {
          const brightness = star.z * 0.8 + 0.2;
          star.color = `rgba(180, 120, 255, ${brightness})`;
        });
      } else if (scheme === 'green') {
        starsRef.current.forEach((star) => {
          const brightness = star.z * 0.8 + 0.2;
          star.color = `rgba(100, 220, 150, ${brightness})`;
        });
      } else {
        // デフォルト色（白～水色のグラデーション）
        starsRef.current.forEach((star) => {
          const brightness = star.z * 0.8 + 0.2;
          // Z値に応じて色を微妙に変化（奥は青みが強い、手前は白っぽい）
          const blueValue = Math.min(
            255,
            200 + Math.floor((1.0 - star.z) * 55)
          );
          star.color = `rgba(255, 255, ${blueValue}, ${brightness})`;
        });
      }
    },

    // アニメーション速度を変更するメソッド
    setSpeed: (speed) => {
      console.log(`[StarfieldBackground] アニメーション速度を変更: ${speed}`);
      setAnimationSpeed(speed);
    },

    // スタイルを直接適用するメソッド（AdminControllerとの互換性用）
    style: {
      get backgroundImage() {
        return ''; // CanvasベースなのでbackgroundImageプロパティは使用しない
      },
      set backgroundImage(value) {
        console.log(
          '[StarfieldBackground] 背景画像の設定は無視されます（Canvas使用中）'
        );
        // 何もしない（互換性のためのスタブ）
      },
    },
  }));
  // アニメーション速度（デフォルト設定）
  const [animationSpeed, setAnimationSpeed] = useState(0.5);
  // 星を初期化する関数
  const initializeStars = (count, width, height) => {
    if (width <= 0 || height <= 0) {
      console.warn(
        '[StarfieldBackground] 無効な寸法でのスター初期化をスキップします:',
        width,
        height
      );
      return [];
    }

    console.log(
      `[StarfieldBackground] ${count}個の星を初期化中: ${width}x${height}`
    );

    const stars = [];
    const gameWidth = 800; // ゲーム領域の横幅
    const gameHeight = 600; // ゲーム領域の縦幅

    for (let i = 0; i < count; i++) {
      // 星の色のバリエーション - 大半は白だが一部は青や水色
      let starColor;
      const colorRand = Math.random();
      if (colorRand > 0.85) {
        starColor = 'rgba(120, 180, 255, %b)'; // 青っぽい星（15%）
      } else if (colorRand > 0.7) {
        starColor = 'rgba(180, 220, 255, %b)'; // 水色っぽい星（15%）
      } else {
        starColor = 'rgba(255, 255, 255, %b)'; // 白い星（70%）
      }

      // Z座標は0.1〜1.0の範囲（1.0が一番手前）
      const z = Math.random() * 0.9 + 0.1;

      // 明るさはZ位置に比例（手前ほど明るい）
      const brightness = z * 0.8 + 0.2;

      // 色に明るさを適用
      const color = starColor.replace('%b', brightness.toString());

      // 位置を決定（画面全体にランダム配置）
      const x = (Math.random() - 0.5) * width * 1.5; // 余裕を持たせる
      const y = (Math.random() - 0.5) * height * 1.5;

      stars.push({
        x,
        y,
        z,
        // ピクセルアート風の星にするためサイズに制限をかける
        size: Math.floor(z * 2.5) + 1,
        color,
        // 一部の星は軌跡を持つ（z値が大きい＝手前の星ほど軌跡を持ちやすい）
        hasTrail: Math.random() > 0.8 - z * 0.3,
        trailLength: Math.floor(Math.random() * 6) + 3,
        trailPositions: [],
        // 動きに微妙な個性を持たせる
        speedFactor: 0.8 + Math.random() * 0.4,
      });
    }
    return stars;
  };
  // 星を移動させる関数
  const moveStars = (stars, width, height) => {
    if (width <= 0 || height <= 0 || !stars.length) {
      return stars;
    }

    const gameWidth = 800;
    const gameHeight = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    return stars.map((star) => {
      // 星ごとの速度係数を使用
      const speedFactor = star.speedFactor || 1.0;

      // Z座標を減らして星を移動（奥から手前へ）
      star.z -= animationSpeed * 0.01 * star.z * speedFactor;

      // Z座標が小さくなりすぎたら新しい星を生成
      if (star.z <= 0.1) {
        // 色のバリエーション（再生成時）
        let newColor;
        const colorRand = Math.random();
        if (colorRand > 0.85) {
          newColor = 'rgba(120, 180, 255, %b)'; // 青っぽい星
        } else if (colorRand > 0.7) {
          newColor = 'rgba(180, 220, 255, %b)'; // 水色っぽい星
        } else {
          newColor = 'rgba(255, 255, 255, %b)'; // 白い星
        }

        // 新しいZ値（奥側から始める）
        const newZ = 0.9 + Math.random() * 0.1;

        // 明るさを計算（Z値に基づく）
        const brightness = newZ * 0.8 + 0.2;

        // 配置方法の選択：端から生成、または中心から外側に向けて配置
        let newX, newY;

        // 40%の確率で中央から外向きに配置、60%の確率で端から配置
        if (Math.random() < 0.4) {
          // 中央のゲームエリアから外向きに配置
          const angle = Math.random() * Math.PI * 2;
          // ゲームエリアの端からわずかに内側に配置
          const distance = Math.min(gameWidth, gameHeight) * 0.4;
          newX = Math.cos(angle) * distance * 0.5;
          newY = Math.sin(angle) * distance * 0.5;
        } else {
          // 画面端から中央に向かって配置
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.max(width, height) * 0.6;
          newX = Math.cos(angle) * distance;
          newY = Math.sin(angle) * distance;
        }

        return {
          ...star,
          x: newX,
          y: newY,
          z: newZ,
          size: Math.floor(newZ * 2.5) + 1,
          color: newColor.replace('%b', brightness.toString()),
          hasTrail: Math.random() > 0.8 - newZ * 0.3,
          trailLength: Math.floor(Math.random() * 6) + 3,
          trailPositions: [],
          speedFactor: 0.8 + Math.random() * 0.4,
        };
      }

      // 軌跡を持つ星は過去の位置を記録
      if (star.hasTrail) {
        // 星の現在の画面上の座標を計算
        const screenX = star.x / star.z + centerX;
        const screenY = star.y / star.z + centerY;

        // 軌跡位置を記録（前回との位置が大きく変わった場合はスキップ）
        const lastPos = star.trailPositions[0];
        if (
          !lastPos ||
          (Math.abs(screenX - lastPos.x) < 50 &&
            Math.abs(screenY - lastPos.y) < 50)
        ) {
          star.trailPositions.unshift({ x: screenX, y: screenY });

          // 軌跡の長さを制限
          if (star.trailPositions.length > star.trailLength) {
            star.trailPositions.pop();
          }
        } else {
          // 位置が大きく変わった場合は軌跡をリセット
          star.trailPositions = [{ x: screenX, y: screenY }];
        }
      }

      return star;
    });
  }; // 特定の領域内に星を描画する関数（クリッピングフォールバック用）
  const drawStarsInRegion = (ctx, stars, width, height, centerX, centerY) => {
    // 各星を描画（クリッピング領域内にあるもののみ）
    stars.forEach((star) => {
      // 星の画面上の座標を計算
      const screenX = star.x / star.z + centerX;
      const screenY = star.y / star.z + centerY;

      // 画面内にある場合のみ描画（クリッピングで制限されている）
      if (
        screenX >= 0 &&
        screenX <= width &&
        screenY >= 0 &&
        screenY <= height
      ) {
        // 軌跡を描画
        if (star.hasTrail && star.trailPositions.length > 1) {
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);

          // 軌跡の各点を描画
          for (let i = 0; i < star.trailPositions.length; i++) {
            const pos = star.trailPositions[i];
            const opacity = 1 - i / star.trailPositions.length;

            ctx.strokeStyle = star.color.replace(')', `, ${opacity})`);
            ctx.lineTo(pos.x, pos.y);
          }

          ctx.stroke();
        }

        // 星を描画
        ctx.fillStyle = star.color;
        const size = star.size;

        // 小さい星は単純な四角形、大きい星は光る十字形に
        if (size <= 1) {
          ctx.fillRect(Math.floor(screenX), Math.floor(screenY), size, size);
        } else {
          // 十字形の星
          ctx.fillRect(
            Math.floor(screenX) - Math.floor(size / 2),
            Math.floor(screenY),
            size,
            1
          );
          ctx.fillRect(
            Math.floor(screenX),
            Math.floor(screenY) - Math.floor(size / 2),
            1,
            size
          );

          // 中心点を強調
          ctx.fillRect(Math.floor(screenX), Math.floor(screenY), 1, 1);
        }
      }
    });
  };

  // 星を描画する関数
  const drawStars = (ctx, stars, width, height) => {
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const gameHalfWidth = 400; // ゲーム領域の幅の半分
    const gameHalfHeight = 300; // ゲーム領域の高さの半分
    // シンプルな方法でゲーム領域外だけに星を描画
    ctx.save();

    // 最初に全画面をクリップ領域に
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    // ゲーム領域の矩形パスを追加
    ctx.rect(
      centerX - gameHalfWidth,
      centerY - gameHalfHeight,
      gameHalfWidth * 2,
      gameHalfHeight * 2
    );

    // 互換性のためtry-catchで囲む
    try {
      // evenoddルールを使ってクリッピング（内側と外側を交互に考慮）
      ctx.clip('evenodd');
    } catch (e) {
      console.log(
        '[StarfieldBackground] 高度なクリッピングがサポートされていないためフォールバックを使用します'
      );

      // フォールバック：別の方法でマスクを作成
      ctx.restore(); // 前の保存状態に戻る
      ctx.save(); // 新しく保存

      // 画面全体を4つの矩形に分割してゲーム領域の外側だけ描画
      // 上部の矩形
      ctx.beginPath();
      ctx.rect(0, 0, width, centerY - gameHalfHeight);
      ctx.clip();
      drawStarsInRegion(ctx, stars, width, height, centerX, centerY);
      ctx.restore();
      ctx.save();

      // 下部の矩形
      ctx.beginPath();
      ctx.rect(
        0,
        centerY + gameHalfHeight,
        width,
        height - (centerY + gameHalfHeight)
      );
      ctx.clip();
      drawStarsInRegion(ctx, stars, width, height, centerX, centerY);
      ctx.restore();
      ctx.save();

      // 左側の矩形
      ctx.beginPath();
      ctx.rect(
        0,
        centerY - gameHalfHeight,
        centerX - gameHalfWidth,
        gameHalfHeight * 2
      );
      ctx.clip();
      drawStarsInRegion(ctx, stars, width, height, centerX, centerY);
      ctx.restore();
      ctx.save();

      // 右側の矩形
      ctx.beginPath();
      ctx.rect(
        centerX + gameHalfWidth,
        centerY - gameHalfHeight,
        width - (centerX + gameHalfWidth),
        gameHalfHeight * 2
      );
      ctx.clip();

      // この後に星を描画
      return;
    }

    // evenoddクリッピングが成功した場合、この下の星の描画処理が実行される
    // 各星を描画
    stars.forEach((star) => {
      // 星の画面上の座標を計算
      const screenX = star.x / star.z + centerX;
      const screenY = star.y / star.z + centerY;

      // 画面内にある場合のみ描画
      if (
        screenX >= 0 &&
        screenX <= width &&
        screenY >= 0 &&
        screenY <= height
      ) {
        // 軌跡を描画
        if (star.hasTrail && star.trailPositions.length > 1) {
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);

          // 軌跡の各点を描画
          for (let i = 0; i < star.trailPositions.length; i++) {
            const pos = star.trailPositions[i];
            const opacity = 1 - i / star.trailPositions.length;

            ctx.strokeStyle = star.color.replace(')', `, ${opacity})`);
            ctx.lineTo(pos.x, pos.y);
          }

          ctx.stroke();
        }

        // ピクセルアート風の星を描画（シャープな形状）
        ctx.fillStyle = star.color;
        const size = star.size;

        // 小さい星は単純な四角形、大きい星は光る十字形に
        if (size <= 1) {
          ctx.fillRect(Math.floor(screenX), Math.floor(screenY), size, size);
        } else {
          // 十字形の星
          ctx.fillRect(
            Math.floor(screenX) - Math.floor(size / 2),
            Math.floor(screenY),
            size,
            1
          );
          ctx.fillRect(
            Math.floor(screenX),
            Math.floor(screenY) - Math.floor(size / 2),
            1,
            size
          );

          // 中心点を強調
          ctx.fillRect(Math.floor(screenX), Math.floor(screenY), 1, 1);
        }
      }
    });

    ctx.restore();
  };
  // パフォーマンスデバッグ用 - フレームレートを計測
  const fpsRef = useRef({ lastTimestamp: 0, frames: 0, fps: 0 });

  // フレームレートを計算する関数
  const calculateFPS = () => {
    const now = performance.now();
    const elapsed = now - fpsRef.current.lastTimestamp;

    fpsRef.current.frames++;

    // 1秒ごとにFPSを更新
    if (elapsed > 1000) {
      fpsRef.current.fps = Math.round((fpsRef.current.frames * 1000) / elapsed);
      fpsRef.current.frames = 0;
      fpsRef.current.lastTimestamp = now;

      // コンソールにFPSを出力（10秒に1回）
      if (Math.random() < 0.1) {
        console.log(`[StarfieldBackground] 現在のFPS: ${fpsRef.current.fps}`);
      }
    }
  };

  // リサイズイベントのハンドラ
  const handleResize = () => {
    if (!canvasRef.current || typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    console.log(
      `[StarfieldBackground] キャンバスをリサイズします: ${width}x${height}`
    );

    try {
      // Canvasサイズを設定（ピクセル比を考慮）
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // コンテキストの取得とスケール設定
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error(
          '[StarfieldBackground] キャンバスコンテキストが取得できません'
        );
        return;
      }

      // スケール設定
      ctx.scale(pixelRatio, pixelRatio);

      // 星を再初期化（画面サイズに合わせて）
      // 星の数をディスプレイサイズに合わせて調整（パフォーマンス対策）
      const starCount = Math.min(Math.floor((width * height) / 3000), 300);
      console.log(`[StarfieldBackground] 星を初期化します。数: ${starCount}`);
      starsRef.current = initializeStars(starCount, width, height);

      // 寸法状態を更新
      setDimensions({ width, height });

      console.log('[StarfieldBackground] リサイズ処理が完了しました');
    } catch (err) {
      console.error(
        '[StarfieldBackground] リサイズ中にエラーが発生しました:',
        err
      );
    }
  };
  // コンポーネントのマウント時の処理
  useEffect(() => {
    setIsClient(true);

    if (typeof window !== 'undefined') {
      console.log(
        '[StarfieldBackground] マウントされました。初期化を開始します。'
      );
      handleResize();
      window.addEventListener('resize', handleResize);
    }
  }, []);
  // 寸法変更時とクライアントサイドレンダリング時のアニメーション処理
  useEffect(() => {
    // クライアントサイドでなければ何もしない
    if (!isClient) return;

    // スロットリング変数 - 処理負荷を抑制する
    let skipFrame = false;

    console.log(
      '[StarfieldBackground] アニメーションを開始します。',
      `寸法: ${dimensions.width}x${dimensions.height}`,
      `星の数: ${starsRef.current.length}`
    );

    // FPS初期化
    fpsRef.current = {
      lastTimestamp: performance.now(),
      frames: 0,
      fps: 0,
      lastLog: performance.now(), // 前回のログ出力時間
    };

    // アニメーションループの開始
    const animate = (timestamp) => {
      try {
        if (
          canvasRef.current &&
          dimensions.width > 0 &&
          dimensions.height > 0
        ) {
          // FPS計算
          calculateFPS();

          // 描画コンテキストの取得
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return; // コンテキストが取得できなければスキップ

          // スロットリング - モバイル端末などFPSが低い環境では処理を間引く
          if (fpsRef.current.fps > 0 && fpsRef.current.fps < 30) {
            skipFrame = !skipFrame;
            if (skipFrame) {
              // フレームをスキップ
              animationRef.current = requestAnimationFrame(animate);
              return;
            }
          }

          // 星の移動と描画
          starsRef.current = moveStars(
            starsRef.current,
            dimensions.width,
            dimensions.height
          );
          drawStars(ctx, starsRef.current, dimensions.width, dimensions.height);
        }

        // 星が一つも存在しない場合は再初期化を試みる
        if (
          starsRef.current.length === 0 &&
          dimensions.width > 0 &&
          dimensions.height > 0
        ) {
          console.log('[StarfieldBackground] 星がないため再初期化します');
          starsRef.current = initializeStars(
            Math.min(
              Math.floor((dimensions.width * dimensions.height) / 3000),
              300
            ),
            dimensions.width,
            dimensions.height
          );
        }
      } catch (err) {
        // エラーをキャッチしてもアニメーションは継続
        console.error(
          '[StarfieldBackground] アニメーション中にエラーが発生しました:',
          err
        );
      }

      // 次のフレームをリクエスト
      animationRef.current = requestAnimationFrame(animate);
    };

    // アニメーションを開始
    animationRef.current = requestAnimationFrame(animate);

    // クリーンアップ関数
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        console.log('[StarfieldBackground] アニメーションを停止しました。');
      }

      // リサイズイベントはコンポーネントのアンマウント時のみ削除
      if (!isClient) {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [dimensions, isClient]);
  // サーバーサイドレンダリングでは何も表示しない
  if (!isClient) {
    return null;
  }

  return (
    <div
      className={`${styles.starfieldBackground} ${className}`}
      aria-hidden="true"
      data-testid="starfield-background"
    >
      {/* キャンバス要素 - 星のアニメーション描画用 */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-stars-count={starsRef.current.length}
        // パフォーマンス最適化
        style={{
          willChange: 'transform', // GPU加速を促進
          backfaceVisibility: 'hidden', // レンダリング最適化
        }}
      />

      {/* ゲームエリアの視覚的なマスク - 実際のマスクはクリッピングパスで行う */}
      <div className={styles.gameMask} />
      {/* デバッグ情報（本番環境では表示されない） */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugInfo}>
          <div>
            <small>
              Stars: {starsRef.current.length} | Speed:{' '}
              {animationSpeed.toFixed(2)} | FPS: {fpsRef.current?.fps || 0} |
              Size: {dimensions.width}x{dimensions.height}
            </small>
          </div>
        </div>
      )}
    </div>
  );
});

// コンポーネント名を設定
StarfieldBackground.displayName = 'StarfieldBackground';

export default StarfieldBackground;
