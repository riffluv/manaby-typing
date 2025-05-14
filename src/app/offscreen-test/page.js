'use client';

import { useState, useEffect, useRef } from 'react';
import OffscreenEffects from '../../components/typing/OffscreenEffects';
import styles from './page.module.css';

export default function OffscreenTestPage() {
  const [isOffscreenSupported, setIsOffscreenSupported] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [fps, setFps] = useState(60);
  const [effectCount, setEffectCount] = useState(0);
  const containerRef = useRef(null);
  const effectsRef = useRef(null);

  // Offscreen Canvasサポートチェック
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'OffscreenCanvas' in window &&
      'transferControlToOffscreen' in document.createElement('canvas');

    setIsOffscreenSupported(supported);
  }, []);

  // エフェクト発生のハンドラー
  const handleSpawnEffect = () => {
    setEffectCount(prev => prev + 1);
  };

  // ランダムな位置でエフェクト発生させる
  const spawnRandomEffect = () => {
    if (!containerRef.current || !effectsRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;

    // spawnEffectメソッドを呼び出す（コンポーネント内に実装済み）
    effectsRef.current.spawnEffect(x, y);
  };

  return (
    <main className={styles.main}>
      <h1>Offscreen Canvas テスト</h1>

      <div className={styles.status}>
        <p>Offscreen Canvas対応状況: <strong>{
          isOffscreenSupported === null ? '確認中...' :
            isOffscreenSupported ? '対応' : '非対応'
        }</strong></p>

        {isOffscreenSupported === false && (
          <div className={styles.warning}>
            <p>お使いのブラウザはOffscreen Canvasに対応していません。</p>
            <p>Chrome 69以降、Edge 79以降、またはFirefox 71以降の使用をお勧めします。</p>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => setIsActive(!isActive)}
            />
            エフェクト表示
          </label>
        </div>

        <div className={styles.controlGroup}>
          <label>
            FPS:
            <select value={fps} onChange={(e) => setFps(Number(e.target.value))}>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
              <option value={90}>90 FPS</option>
              <option value={120}>120 FPS</option>
            </select>
          </label>
        </div>

        <button
          className={styles.spawnButton}
          onClick={spawnRandomEffect}
          disabled={!isOffscreenSupported || !isActive}
        >
          ランダムな位置でエフェクト発生
        </button>
      </div>

      <div className={styles.stats}>
        <p>発生したエフェクト数: <span className={styles.count}>{effectCount}</span></p>
      </div>

      <div className={styles.demoContainer} ref={containerRef}>
        <div className={styles.demoContent}>
          <h2>Offscreen Canvas デモ</h2>
          <p>このエリア内をクリックするか、上部の「ランダムな位置でエフェクト発生」ボタンを押すと、パーティクルエフェクトが発生します。</p>
          <p>
            <strong>通常のCanvas vs Offscreen Canvas:</strong>
            Offscreen Canvasを使用すると、メインスレッド（UIスレッド）を占有せずに、
            バックグラウンドのワーカースレッドで描画処理を行うことができます。
            これにより、UIの応答性が向上し、高フレームレートのアニメーションでもスムーズに動作します。
          </p>
          <div className={styles.clickHere}>
            ここをクリックしてエフェクト発生！
          </div>
        </div>

        {/* OffscreenEffectsコンポーネント */}
        <OffscreenEffects
          ref={effectsRef}
          enabled={isActive && isOffscreenSupported}
          className={styles.effects}
          onEffectSpawned={handleSpawnEffect}
          fps={fps}
        />
      </div>

      <div className={styles.performance}>
        <h2>パフォーマンスについて</h2>
        <p>
          Offscreen Canvasは以下のような利点があります：
        </p>
        <ul>
          <li>メインスレッド（UIスレッド）の負荷軽減</li>
          <li>複雑なアニメーションでもUIの応答性が維持される</li>
          <li>マルチコアCPUのリソースをより効率的に活用</li>
          <li>リアルタイム描画処理の高速化</li>
        </ul>
        <p>
          タイピングゲームでは、タイピング入力のアニメーション効果やパーティクル表示などを
          Offscreen Canvasで処理することで、ゲームの応答性と体験を向上させることができます。
        </p>
      </div>
    </main>
  );
}